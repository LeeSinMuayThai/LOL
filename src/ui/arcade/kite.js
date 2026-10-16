// El kite (M1, ola H entrega 2): la lógica de `el_kite`, separada del dibujo. Pura y sin DOM: la corre la parada cuadro a
// cuadro (`avanzar`) y `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en `BALANCE.g1.arcade.el_kite`.
//
// Vista de arriba. Un bruiser te viene encima y el anillo de tu ataque se llena: pegás con el anillo lleno y a `rango` o menos,
// y te movés antes de que te alcance. Un TIEMPO se cierra de dos maneras: pegás (limpio) o el bruiser te agarra (sucio, y se
// cae para atrás un rato). Pegar antes de que el anillo se llene lo vacía. La regla es de CONTEO (contrato de G1): el
// resultado es tiempos limpios / `g1.conteo.el_kite`. Las fases: el bruiser acelera, después tiene un dash telegrafiado,
// después un slow alrededor.

import { BALANCE } from '../../data/balance.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const K = BALANCE.g1.arcade.el_kite;
export const TIEMPOS = BALANCE.g1.conteo.el_kite;
export const [ANCHO, ALTO] = K.mundo;
export const RADIO = K.radioJugador;
export const RADIO_BRUISER = K.radioBruiser;
export const CONTACTO = K.radioJugador + K.radioBruiser;
export const RANGO = K.rango;
export const FASES = K.fases.length;
// cuándo se considera que llegaste al punto del clic
const LLEGASTE = 0.5;
const media = ([a, b]) => (a + b) / 2;
const entre = (rng, [a, b]) => a + (b - a) * rng();
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

export function parametros({ stat = 50, dificultad = 1 } = {}) {
  return { stat, dificultad, ventana: ventanaPorStat(stat, K.ventanaStat[0], K.ventanaStat[1], dificultad) };
}

// La ventana en segundos (para medir el stat): lo que el bruiser tarda en cruzar tu rango hasta agarrarte, en la primera fase.
export function ventanaEnSegundos(p) {
  const f = K.fases[0];
  const v = ((f.v0 + (f.v1 - f.v0) * 0.5) * media(K.intensidad)) / p.ventana;
  return (K.rango - CONTACTO) / v;
}

export function faseDe(tiempo) {
  let i = 0;
  K.fases.forEach((f, k) => { if (tiempo >= f.desde) i = k; });
  return i;
}

function armarFase(e) {
  const i = faseDe(e.tiempos.length);
  const f = K.fases[i];
  e.i = i;
  e.intensidad = entre(e.rng, K.intensidad);
  e.dash = f.dash ? { prox: entre(e.rng, f.dash.cadaS), aviso: 0, dir: null, queda: 0 } : null;
}

export function crear(params, rng) {
  const e = {
    p: params, rng, t: 0, i: 0, intensidad: 1,
    yo: { x: ANCHO * 0.3, y: ALTO / 2 },
    destino: null,
    bruiser: { x: ANCHO * 0.82, y: ALTO / 2, aturdido: 0, dx: -1, dy: 0 },
    anillo: 1, tCiclo: 0, lento: false,
    dash: null, tiempos: [], terminado: false, eventos: []
  };
  armarFase(e);
  return e;
}

export function velocidadBruiser(e) {
  const f = K.fases[e.i];
  const k = limitar(e.tCiclo / f.rampaS, 0, 1);
  return ((f.v0 + (f.v1 - f.v0) * k) * e.intensidad) / e.p.ventana;
}

const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function cerrarTiempo(e, limpio) {
  e.tiempos.push({ limpio });
  e.tCiclo = 0;
  if (e.tiempos.length >= TIEMPOS) { e.terminado = true; return; }
  if (faseDe(e.tiempos.length) !== e.i) { armarFase(e); e.eventos.push({ tipo: 'fase', i: e.i }); }
}

// Un paso fijo. `entrada`: `{ mover: {x,y}, ir: {x,y}, ataque: true }`, todo opcional.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  const dt = PASO_FIJO;
  e.t += dt;
  if (e.t > K.maxS) {
    while (e.tiempos.length < TIEMPOS) e.tiempos.push({ limpio: false });
    e.terminado = true;
    return;
  }
  const b = e.bruiser;
  const f = K.fases[e.i];
  e.tCiclo += dt;
  // vos
  e.lento = !!f.slow && distancia(b, e.yo) < f.slow.radio;
  const vel = K.velocidad * (e.lento ? f.slow.factor : 1);
  let vx = 0;
  let vy = 0;
  const m = entrada?.mover;
  if (m && (m.x || m.y)) {
    const n = Math.hypot(m.x, m.y);
    vx = m.x / n; vy = m.y / n;
    e.destino = null;
  } else {
    if (entrada?.ir) e.destino = { x: entrada.ir.x, y: entrada.ir.y };
    if (e.destino) {
      const d = distancia(e.destino, e.yo);
      if (d < LLEGASTE) e.destino = null;
      else { vx = (e.destino.x - e.yo.x) / d; vy = (e.destino.y - e.yo.y) / d; }
    }
  }
  const paso = Math.min(vel * dt, e.destino ? distancia(e.destino, e.yo) : Infinity);
  e.yo.x = limitar(e.yo.x + vx * paso, RADIO, ANCHO - RADIO);
  e.yo.y = limitar(e.yo.y + vy * paso, RADIO, ALTO - RADIO);
  // el anillo y tu ataque
  e.anillo = Math.min(1, e.anillo + dt / K.cargaS);
  if (entrada?.ataque) {
    if (e.anillo < 1) {
      e.anillo = Math.max(0, e.anillo - K.penaAnillo);
      e.eventos.push({ tipo: 'temprano' });
    } else if (distancia(b, e.yo) <= K.rango) {
      e.anillo = 0;
      const d = distancia(b, e.yo) || 1;
      b.x = limitar(b.x + ((b.x - e.yo.x) / d) * K.retroceso, RADIO_BRUISER, ANCHO - RADIO_BRUISER);
      b.y = limitar(b.y + ((b.y - e.yo.y) / d) * K.retroceso, RADIO_BRUISER, ALTO - RADIO_BRUISER);
      b.aturdido = Math.max(b.aturdido, K.golpeAturdeS);
      if (e.dash) { e.dash.aviso = 0; e.dash.dir = null; e.dash.queda = 0; }
      e.eventos.push({ tipo: 'golpe', x: b.x, y: b.y });
      cerrarTiempo(e, true);
      return;
    }
  }
  // el bruiser
  if (b.aturdido > 0) {
    b.aturdido -= dt;
    return;
  }
  const d0 = distancia(b, e.yo) || 1;
  const dash = e.dash;
  if (dash && dash.queda > 0) {
    const pasoDash = f.dash.velocidad * dt;
    b.x = limitar(b.x + dash.dir.x * pasoDash, RADIO_BRUISER, ANCHO - RADIO_BRUISER);
    b.y = limitar(b.y + dash.dir.y * pasoDash, RADIO_BRUISER, ALTO - RADIO_BRUISER);
    dash.queda -= pasoDash;
    if (dash.queda <= 0) dash.prox = entre(e.rng, f.dash.cadaS);
  } else if (dash && dash.aviso > 0) {
    dash.aviso -= dt;
    if (dash.aviso <= 0) { dash.queda = f.dash.distancia; e.eventos.push({ tipo: 'dash' }); }
  } else {
    if (dash) {
      dash.prox -= dt;
      if (dash.prox <= 0) {
        dash.aviso = f.dash.avisoS * e.p.ventana;
        dash.dir = { x: (e.yo.x - b.x) / d0, y: (e.yo.y - b.y) / d0 };
        e.eventos.push({ tipo: 'aviso' });
      }
    }
    const v = velocidadBruiser(e);
    b.x += ((e.yo.x - b.x) / d0) * v * dt;
    b.y += ((e.yo.y - b.y) / d0) * v * dt;
  }
  b.dx = (e.yo.x - b.x) / d0;
  b.dy = (e.yo.y - b.y) / d0;
  // te agarró
  if (distancia(b, e.yo) <= CONTACTO) {
    const d = distancia(b, e.yo) || 1;
    e.yo.x = limitar(e.yo.x + ((e.yo.x - b.x) / d) * K.empuje, RADIO, ANCHO - RADIO);
    e.yo.y = limitar(e.yo.y + ((e.yo.y - b.y) / d) * K.empuje, RADIO, ALTO - RADIO);
    e.destino = null;
    b.aturdido = K.recuperaS;
    if (e.dash) { e.dash.aviso = 0; e.dash.queda = 0; e.dash.dir = null; e.dash.prox = entre(e.rng, K.fases[e.i].dash?.cadaS ?? [1, 1]); }
    e.eventos.push({ tipo: 'agarrado', x: e.yo.x, y: e.yo.y });
    cerrarTiempo(e, false);
  }
}

export function resultadoDe(e) {
  return e.tiempos.filter((t) => t.limpio).length / TIEMPOS;
}

export function detalleDe(e) {
  return { tipo: 'conteo', logrados: e.tiempos.filter((t) => t.limpio).length, total: TIEMPOS, tiempos: e.tiempos.map((t) => t.limpio) };
}

export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
