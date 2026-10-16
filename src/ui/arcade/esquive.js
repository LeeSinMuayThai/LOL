// El dodge (H3k): la lógica de `dodge`, separada del dibujo. Pura y sin DOM: la corre la parada paso a paso (`avanzar`) y
// `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en `BALANCE.g1.arcade.dodge`.
//
// Una arena 2-D. Te tiran skillshots telegrafiados (línea, círculo, cono) en `g1.conteo.dodge` oleadas y tres fases que
// escalan: primero de a uno, después dos con desfase, al final tres con puntería adelantada (te apuntan a donde vas). Te
// movés con WASD, flechas o clic (como en la Grieta) y tenés Flash una vez. La regla es de CONTEO (contrato de G1): una
// oleada cuenta si ningún tiro te tocó, y el resultado es esquivadas / oleadas. Quieto, te pegan todos.

import { BALANCE } from '../../data/balance.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const D = BALANCE.g1.arcade.dodge;
export const OLEADAS = BALANCE.g1.conteo.dodge;
export const [ANCHO, ALTO] = D.mundo;
export const RADIO = D.radioJugador;
// el largo de una línea: cruza la arena entera
const LARGO_LINEA = Math.hypot(ANCHO, ALTO) * 1.5;
// a qué distancia del blanco se para el que tira el cono (adentro de su alcance)
const DISTANCIA_CONO = 0.6;
// lo que espera la primera oleada (para que el 3-2-1 no te tire encima)
const ESPERA_INICIAL_S = 0.5;
const MARGEN_BORDE = 4;
// cuándo se considera que llegaste al punto del clic
const LLEGASTE = 0.3;

const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

export function parametros({ stat = 50, dificultad = 1 } = {}) {
  return { stat, dificultad, aviso: ventanaPorStat(stat, D.avisoS[0], D.avisoS[1], dificultad) };
}

// La ventana en segundos (para medir el stat): el aviso de la primera fase.
export function ventanaEnSegundos(p) {
  return p.aviso;
}

export function faseDe(oleada) {
  let i = 0;
  D.fases.forEach((f, k) => { if (oleada >= f.desde) i = k; });
  return i;
}

export function crear(params, rng) {
  return {
    p: params,
    rng,
    t: 0,
    yo: { x: ANCHO / 2, y: ALTO / 2, vx: 0, vy: 0 },
    destino: null,
    flash: true,
    oleada: -1,
    tiros: [],
    espera: ESPERA_INICIAL_S,
    golpeado: false,
    esquivadas: 0,
    historial: [],
    terminado: false,
    eventos: []
  };
}

function iniciarOleada(e) {
  e.oleada += 1;
  if (e.oleada >= OLEADAS) {
    e.terminado = true;
    e.eventos.push({ tipo: 'final' });
    return;
  }
  const fi = faseDe(e.oleada);
  const f = D.fases[fi];
  if (e.oleada === f.desde) e.eventos.push({ tipo: 'fase', i: fi });
  const aviso = e.p.aviso * f.factorAviso;
  e.golpeado = false;
  e.tiros = f.tiros.map((tipo, k) => {
    const nace = e.t + k * f.desfaseS;
    return { tipo, nace, pega: nace + aviso, fin: nace + aviso + D.activoS, aviso, lead: f.lead, armado: false, disparo: false, pego: false };
  });
}

// Apunta un tiro cuando nace: al lugar donde estás más `lead` de tu velocidad por el aviso (te leen el movimiento).
function armar(e, tiro) {
  const { yo } = e;
  const ax = limitar(yo.x + yo.vx * tiro.aviso * tiro.lead, 0, ANCHO);
  const ay = limitar(yo.y + yo.vy * tiro.aviso * tiro.lead, 0, ALTO);
  const angulo = e.rng() * Math.PI * 2;
  if (tiro.tipo === 'linea') {
    // desde afuera de la arena, cruzándola por el blanco
    const ox = ax + Math.cos(angulo) * LARGO_LINEA / 2;
    const oy = ay + Math.sin(angulo) * LARGO_LINEA / 2;
    Object.assign(tiro, { ox, oy, dx: (ax - ox) / Math.hypot(ax - ox, ay - oy), dy: (ay - oy) / Math.hypot(ax - ox, ay - oy), largo: LARGO_LINEA, ancho: D.linea.ancho });
  } else if (tiro.tipo === 'circulo') {
    Object.assign(tiro, { cx: ax, cy: ay, radio: D.circulo.radio });
  } else {
    const dist = D.cono.alcance * DISTANCIA_CONO;
    const ox = limitar(ax + Math.cos(angulo) * dist, MARGEN_BORDE, ANCHO - MARGEN_BORDE);
    const oy = limitar(ay + Math.sin(angulo) * dist, MARGEN_BORDE, ALTO - MARGEN_BORDE);
    Object.assign(tiro, { ox, oy, angulo: Math.atan2(ay - oy, ax - ox), alcance: D.cono.alcance, apertura: D.cono.apertura });
  }
  tiro.armado = true;
}

// ¿El tiro cubre el punto (x, y) con `margen` de más? Lo usan el golpe, el dibujo y el humano de prueba.
export function cubre(tiro, x, y, margen = RADIO) {
  if (!tiro.armado) return false;
  if (tiro.tipo === 'linea') {
    const px = x - tiro.ox;
    const py = y - tiro.oy;
    const a = limitar(px * tiro.dx + py * tiro.dy, 0, tiro.largo);
    return Math.hypot(px - a * tiro.dx, py - a * tiro.dy) <= tiro.ancho / 2 + margen;
  }
  if (tiro.tipo === 'circulo') return Math.hypot(x - tiro.cx, y - tiro.cy) <= tiro.radio + margen;
  const d = Math.hypot(x - tiro.ox, y - tiro.oy);
  if (d > tiro.alcance + margen) return false;
  if (d <= margen) return true;
  let dif = Math.atan2(y - tiro.oy, x - tiro.ox) - tiro.angulo;
  dif = Math.atan2(Math.sin(dif), Math.cos(dif));
  return Math.abs(dif) <= tiro.apertura / 2 + Math.asin(Math.min(1, margen / d));
}

function moverHacia(e, x, y) {
  e.destino = { x: limitar(x, RADIO, ANCHO - RADIO), y: limitar(y, RADIO, ALTO - RADIO) };
}

// Un paso fijo. `entrada`: `{ dir: {x, y} }` (teclado, sin normalizar), `{ ir: {x, y} }` (clic o toque) y/o
// `{ flash: {x, y} }` (hacia dónde: el puntero, o tu dirección).
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  const { yo } = e;
  if (entrada?.ir) moverHacia(e, entrada.ir.x, entrada.ir.y);
  let vx = 0;
  let vy = 0;
  const dir = entrada?.dir;
  if (dir && (dir.x || dir.y)) {
    const n = Math.hypot(dir.x, dir.y);
    vx = (dir.x / n) * D.velocidad;
    vy = (dir.y / n) * D.velocidad;
    e.destino = null;
  } else if (e.destino) {
    const dx = e.destino.x - yo.x;
    const dy = e.destino.y - yo.y;
    const n = Math.hypot(dx, dy);
    if (n < LLEGASTE) e.destino = null;
    else {
      const v = Math.min(D.velocidad, n / PASO_FIJO);
      vx = (dx / n) * v;
      vy = (dy / n) * v;
    }
  }
  yo.vx = vx;
  yo.vy = vy;
  yo.x = limitar(yo.x + vx * PASO_FIJO, RADIO, ANCHO - RADIO);
  yo.y = limitar(yo.y + vy * PASO_FIJO, RADIO, ALTO - RADIO);
  if (entrada?.flash && e.flash) {
    const dx = entrada.flash.x - yo.x;
    const dy = entrada.flash.y - yo.y;
    const n = Math.hypot(dx, dy);
    if (n > 0) {
      const salto = Math.min(D.flash.distancia, n);
      const desde = { x: yo.x, y: yo.y };
      yo.x = limitar(yo.x + (dx / n) * salto, RADIO, ANCHO - RADIO);
      yo.y = limitar(yo.y + (dy / n) * salto, RADIO, ALTO - RADIO);
      e.flash = false;
      if (e.destino && Math.hypot(e.destino.x - yo.x, e.destino.y - yo.y) < LLEGASTE) e.destino = null;
      e.eventos.push({ tipo: 'flash', desde, hasta: { x: yo.x, y: yo.y } });
    }
  }

  if (e.tiros.length === 0) {
    e.espera -= PASO_FIJO;
    if (e.espera <= 0) iniciarOleada(e);
    return;
  }
  for (const tiro of e.tiros) {
    if (!tiro.armado && e.t >= tiro.nace) {
      armar(e, tiro);
      e.eventos.push({ tipo: 'aviso', tiro });
    }
    if (tiro.armado && e.t >= tiro.pega && !tiro.disparo) {
      tiro.disparo = true;
      e.eventos.push({ tipo: 'dispara', tiro });
    }
    if (tiro.disparo && e.t < tiro.fin && !tiro.pego && cubre(tiro, yo.x, yo.y)) {
      tiro.pego = true;
      e.golpeado = true;
      e.eventos.push({ tipo: 'golpe', tiro, x: yo.x, y: yo.y });
    }
  }
  if (e.tiros.every((t) => e.t >= t.fin)) {
    const ok = !e.golpeado;
    if (ok) e.esquivadas += 1;
    e.historial.push(ok);
    e.eventos.push({ tipo: 'oleada', ok, i: e.oleada });
    e.tiros = [];
    e.espera = D.entreOleadasS;
  }
}

export function resultadoDe(e) {
  return e.esquivadas / OLEADAS;
}

export function detalleDe(e) {
  return { tipo: 'oleadas', esquivadas: e.esquivadas, total: OLEADAS, historial: [...e.historial], flash: !e.flash };
}

export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
