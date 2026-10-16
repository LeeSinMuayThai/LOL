// El gancho (M1, ola H entrega 2): la lógica de `el_gancho`, la mecánica nueva del support, separada del dibujo. Pura y sin
// DOM: la corre la parada cuadro a cuadro (`avanzar`) y `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en
// `BALANCE.g1.arcade.el_gancho`.
//
// Vista de arriba. Vos estás a la izquierda; el ADC y el support rival se mueven entre minions. Apuntás (mouse o teclado) y
// tirás el gancho: viaja, así que hay que adelantarle el tiro, y se frena en el primer minion que cruza. Un gancho cuenta si
// pega en un rival. Las fases: los rivales van de lado a lado; después amagan (invierten tras un aviso); después se esconden
// detrás de una pared de minions que se mueve. La regla es de CONTEO (contrato de G1): ganchos que pegan / `g1.conteo.el_gancho`.

import { BALANCE } from '../../data/balance.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const G = BALANCE.g1.arcade.el_gancho;
export const TIROS = BALANCE.g1.conteo.el_gancho;
export const [ANCHO, ALTO] = G.mundo;
export const [YO_X, YO_Y] = G.yo;
export const FASES = G.fases.length;
export const DESFASE_X = [6, -8];
const entre = (rng, [a, b]) => a + (b - a) * rng();
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

export function parametros({ stat = 50, dificultad = 1 } = {}) {
  const ventana = ventanaPorStat(stat, G.ventanaStat[0], G.ventanaStat[1], dificultad);
  return { stat, dificultad, ventana, radioBlanco: G.radioBlanco * ventana + G.radioGancho };
}

// La ventana en segundos (para medir el stat): lo que un rival de la primera fase tarda en cruzar el ancho que agarra el gancho.
export function ventanaEnSegundos(p) {
  return (2 * p.radioBlanco) / G.fases[0].vT;
}

export function faseDe(tiro) {
  let i = 0;
  G.fases.forEach((f, k) => { if (tiro >= f.desde) i = k; });
  return i;
}

// La pared de la fase 3: dónde está cada minion en el instante `t`
export function paredEn(e, t = e.t) {
  if (!e.pared) return [];
  const { n, amplitud, omega, x } = e.pared;
  const salto = (G.yMax - G.yMin) / (n - 1);
  return Array.from({ length: n }, (_, k) => ({ x, y: G.yMin + salto * k + amplitud * Math.sin(omega * t + k * 1.7) }));
}

function armarFase(e) {
  const i = faseDe(e.tiros.length);
  const f = G.fases[i];
  e.i = i;
  const intensidad = entre(e.rng, G.intensidad);
  e.pared = f.pared ? { ...f.pared } : null;
  e.enemigos.forEach((en, k) => {
    en.xMeta = f.x + DESFASE_X[k];
    en.vT = f.vT * intensidad;
    en.amague = 0;
    en.proxJuke = f.juke ? entre(e.rng, f.juke) : Infinity;
  });
}

export function crear(params, rng) {
  const e = {
    p: params, rng, t: 0, i: 0, ang: 0, cd: 0.3,
    enemigos: [0, 1].map((k) => ({ tipo: k === 0 ? 'adc' : 'support', x: G.fases[0].x + DESFASE_X[k], xMeta: 0, y: G.yMin + (G.yMax - G.yMin) * (0.2 + 0.6 * rng()), vy: rng() < 0.5 ? 1 : -1, fase: rng() * Math.PI * 2, vel: 0, vT: 0, amague: 0, proxJuke: Infinity, ultimoCambio: 0 })),
    minions: Array.from({ length: G.minionsSueltos.n }, () => ({
      x: entre(rng, G.minionsSueltos.x),
      y: G.yMin + (G.yMax - G.yMin) * rng(),
      vy: (rng() < 0.5 ? 1 : -1) * entre(rng, G.minionsSueltos.v)
    })),
    pared: null, gancho: null, tiros: [], terminado: false, eventos: []
  };
  armarFase(e);
  return e;
}

// Todo lo que frena un gancho en el instante actual: los minions sueltos y los de la pared
export function obstaculos(e) {
  return [...e.minions, ...paredEn(e)];
}

function resolver(e, acerto, motivo, x, y, quien = null) {
  e.tiros.push({ acerto, motivo, quien });
  e.eventos.push({ tipo: acerto ? 'acierto' : motivo, x, y, quien });
  e.gancho = null;
  e.cd = G.cdS;
  if (e.tiros.length >= TIROS) { e.terminado = true; return; }
  if (faseDe(e.tiros.length) !== e.i) { armarFase(e); e.eventos.push({ tipo: 'fase', i: e.i }); }
}

// Un paso fijo. `entrada`: `{ angulo?, giro?, tirar? }`.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  const dt = PASO_FIJO;
  e.t += dt;
  if (e.t > G.maxS) {
    while (e.tiros.length < TIROS) e.tiros.push({ acerto: false, motivo: 'tiempo', quien: null });
    e.terminado = true;
    return;
  }
  if (entrada?.angulo !== undefined) e.ang = limitar(entrada.angulo, -G.anguloMaximo, G.anguloMaximo);
  else if (entrada?.giro) e.ang = limitar(e.ang + entrada.giro * G.giroRadS * dt, -G.anguloMaximo, G.anguloMaximo);
  e.cd = Math.max(0, e.cd - dt);
  if (entrada?.tirar && !e.gancho && e.cd <= 0) {
    e.gancho = { x: YO_X, y: YO_Y, dx: Math.cos(e.ang), dy: Math.sin(e.ang), recorrido: 0 };
    e.eventos.push({ tipo: 'tiro', angulo: e.ang });
  }
  // los rivales
  for (const en of e.enemigos) {
    en.x += limitar(en.xMeta - en.x, -G.xSeAcercaPorS * dt, G.xSeAcercaPorS * dt);
    en.vel = en.vy * en.vT * (1 + G.modulacion.amp * Math.sin(G.modulacion.omega * e.t + en.fase));
    en.y += en.vel * dt;
    if (en.y < G.yMin) { en.y = G.yMin; en.vy = 1; en.ultimoCambio = e.t; }
    if (en.y > G.yMax) { en.y = G.yMax; en.vy = -1; en.ultimoCambio = e.t; }
    if (en.amague > 0) {
      en.amague -= dt;
      if (en.amague <= 0) {
        en.vy = -en.vy;
        en.ultimoCambio = e.t;
        en.proxJuke = entre(e.rng, G.fases[e.i].juke);
        e.eventos.push({ tipo: 'juke', quien: en.tipo });
      }
    } else if (G.fases[e.i].juke) {
      en.proxJuke -= dt;
      if (en.proxJuke <= 0) { en.amague = G.amagueS; e.eventos.push({ tipo: 'amague', quien: en.tipo }); }
    }
  }
  for (const m of e.minions) {
    m.y += m.vy * dt;
    if (m.y < G.yMin) { m.y = G.yMin; m.vy = Math.abs(m.vy); }
    if (m.y > G.yMax) { m.y = G.yMax; m.vy = -Math.abs(m.vy); }
  }
  // el gancho viaja
  const h = e.gancho;
  if (h) {
    h.recorrido += G.velocidad * dt;
    h.x = YO_X + h.dx * h.recorrido;
    h.y = YO_Y + h.dy * h.recorrido;
    const radioMinion = G.radioMinion + G.radioGancho;
    for (const m of obstaculos(e)) {
      if (Math.hypot(m.x - h.x, m.y - h.y) <= radioMinion) { resolver(e, false, 'minion', h.x, h.y); return; }
    }
    for (const en of e.enemigos) {
      if (Math.hypot(en.x - h.x, en.y - h.y) <= e.p.radioBlanco) { resolver(e, true, 'blanco', en.x, en.y, en.tipo); return; }
    }
    if (h.recorrido >= G.alcance || h.x > ANCHO || h.y < 0 || h.y > ALTO) resolver(e, false, 'lejos', h.x, h.y);
  }
}

export function resultadoDe(e) {
  return e.tiros.filter((t) => t.acerto).length / TIROS;
}

export function detalleDe(e) {
  return { tipo: 'conteo', logrados: e.tiros.filter((t) => t.acerto).length, total: TIROS, tiros: e.tiros.map((t) => ({ acerto: t.acerto, motivo: t.motivo })) };
}

export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
