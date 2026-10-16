// La corrida (M3, ola H entrega 2): la lógica de `la_corrida`, separada del dibujo. Pura y sin DOM (la corre la parada con
// `avanzar` y `simular`, en Node). Las constantes, en `BALANCE.g1.arcade.la_corrida`.
//
// Una teamfight vista de arriba: cinco rivales andan sueltos y a ratos se juntan. Tu R es un círculo con tiempo de casteo:
// apuntás y la tirás cuando se juntan. Regla de CONTEO (contrato de G1): un engage que agarra a `necesarios` rivales o más
// cuenta 1; resultado = engages que cuentan / `g1.conteo.la_corrida`. Una sola R por engage. Fases: los rivales se abren más;
// después reaccionan con un Flash al ver el círculo; después hay paredes (frenan a los rivales y tapan la R).

import { BALANCE } from '../../data/balance.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const A = BALANCE.g1.arcade.la_corrida;
export const FASES = A.fases.length;
export const ENGAGES = A.fases.reduce((s, f) => s + f.engages, 0);

const entre = (rng, [a, b]) => a + (b - a) * rng();
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function parametros({ stat = 50, dificultad = 1 } = {}) {
  const k = ventanaPorStat(stat, 0, 1, 1);
  return {
    stat,
    dificultad,
    juntosS: ventanaPorStat(stat, A.juntosS[0], A.juntosS[1], dificultad),
    radio: A.radio[0] + (A.radio[1] - A.radio[0]) * k
  };
}

// La ventana en segundos: cuánto se queda la junta (para medir el stat).
export function ventanaEnSegundos(p) { return p.juntosS; }

export function faseDe(i) {
  let resto = i;
  for (let k = 0; k < FASES; k += 1) {
    if (resto < A.fases[k].engages) return k;
    resto -= A.fases[k].engages;
  }
  return FASES - 1;
}

// --- paredes y línea de visión ------------------------------------------------------------------------------------------
const dentroDe = (p, x, y, m = 0) => x > p.x - m && x < p.x + p.w + m && y > p.y - m && y < p.y + p.h + m;
// ¿el segmento (ax,ay)-(bx,by) cruza el rectángulo? (método de las losas)
export function tapa(p, ax, ay, bx, by) {
  let t0 = 0;
  let t1 = 1;
  const d = [bx - ax, by - ay];
  const o = [ax, ay];
  const lo = [p.x, p.y];
  const hi = [p.x + p.w, p.y + p.h];
  for (let k = 0; k < 2; k += 1) {
    if (Math.abs(d[k]) < 1e-9) {
      if (o[k] < lo[k] || o[k] > hi[k]) return false;
    } else {
      let a = (lo[k] - o[k]) / d[k];
      let b = (hi[k] - o[k]) / d[k];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
      if (t0 > t1) return false;
    }
  }
  return true;
}
export const hayPared = (paredes, ax, ay, bx, by) => paredes.some((p) => tapa(p, ax, ay, bx, by));

function sacarDePared(r, paredes) {
  for (const p of paredes) {
    const cx = limitar(r.x, p.x, p.x + p.w);
    const cy = limitar(r.y, p.y, p.y + p.h);
    const d = dist(r.x, r.y, cx, cy);
    if (d >= A.radioRival) continue;
    if (d < 1e-6) { // adentro del todo: salir por el lado más cercano
      const l = r.x - p.x; const rr = p.x + p.w - r.x; const u = r.y - p.y; const b = p.y + p.h - r.y;
      const m = Math.min(l, rr, u, b);
      if (m === l) r.x = p.x - A.radioRival; else if (m === rr) r.x = p.x + p.w + A.radioRival;
      else if (m === u) r.y = p.y - A.radioRival; else r.y = p.y + p.h + A.radioRival;
      continue;
    }
    const falta = A.radioRival - d;
    r.x += ((r.x - cx) / d) * falta;
    r.y += ((r.y - cy) / d) * falta;
  }
}

function puntoLibre(e, paredes, margen = 0) {
  let x = 0; let y = 0;
  for (let k = 0; k < 14; k += 1) {
    x = entre(e.rng, [A.arena.x[0] + margen, A.arena.x[1] - margen]);
    y = entre(e.rng, [A.arena.y[0] + margen * 0.6, A.arena.y[1] - margen * 0.6]);
    if (!paredes.some((p) => dentroDe(p, x, y, A.radioRival + 1))) break;
  }
  return { x, y };
}

// --- el engage ----------------------------------------------------------------------------------------------------------
export function crear(params, rng) {
  const e = { p: params, rng, t: 0, i: 0, estado: 'engage', espera: 0, engage: null, hechos: 0, intentos: [], terminado: false, eventos: [] };
  armar(e);
  return e;
}

function armar(e) {
  const f = A.fases[faseDe(e.i)];
  const paredes = Array.from({ length: f.paredes }, () => {
    const horizontal = e.rng() < 0.5;
    const largo = entre(e.rng, A.pared.largo);
    const ancho = entre(e.rng, A.pared.ancho);
    const c = puntoLibre(e, [], A.margenJunta);
    return horizontal ? { x: c.x - largo / 2, y: c.y - ancho / 2, w: largo, h: ancho } : { x: c.x - ancho / 2, y: c.y - largo / 2, w: ancho, h: largo };
  });
  const rivales = Array.from({ length: A.rivales }, (_, k) => {
    const p = puntoLibre(e, paredes, 0);
    const q = puntoLibre(e, paredes, 0);
    return { k, x: p.x, y: p.y, tx: q.x, ty: q.y, slot: null, llego: false, flashEn: null, flasheo: false, hacia: 0 };
  });
  e.engage = {
    i: e.i, fase: faseDe(e.i), f, paredes, rivales, t: 0, modo: 'suelto', modoT: entre(e.rng, A.primeraS), junta: 0, centro: null,
    cast: null, fin: false, juntaDesde: null, juntosHasta: null
  };
  e.estado = 'engage';
  e.eventos.push({ tipo: 'engage', i: e.i, fase: e.engage.fase });
}

function empezarJunta(e) {
  const g = e.engage;
  g.centro = puntoLibre(e, g.paredes, A.margenJunta);
  g.modo = 'junta';
  g.modoT = A.juntaMaxS;
  g.junta += 1;
  g.juntaDesde = e.t;
  g.juntosHasta = null;
  for (const r of g.rivales) {
    let s = null;
    for (let k = 0; k < 10; k += 1) {
      const a = e.rng() * Math.PI * 2;
      const rad = g.f.spread * Math.sqrt(e.rng());
      s = { x: limitar(g.centro.x + Math.cos(a) * rad, A.arena.x[0], A.arena.x[1]), y: limitar(g.centro.y + Math.sin(a) * rad, A.arena.y[0], A.arena.y[1]) };
      if (!g.paredes.some((p) => dentroDe(p, s.x, s.y, A.radioRival + 0.5))) break;
    }
    r.slot = s;
    r.llego = false;
    r.tx = s.x; r.ty = s.y;
  }
  e.eventos.push({ tipo: 'junta', n: g.junta });
}

function mover(e, r, v) {
  const d = dist(r.x, r.y, r.tx, r.ty);
  if (d > 0.4) {
    const paso = Math.min(d, v * PASO_FIJO);
    r.x += ((r.tx - r.x) / d) * paso;
    r.y += ((r.ty - r.y) / d) * paso;
  }
  sacarDePared(r, e.engage.paredes);
  r.x = limitar(r.x, A.arena.x[0], A.arena.x[1]);
  r.y = limitar(r.y, A.arena.y[0], A.arena.y[1]);
}

function terminarEngage(e, atrapados, centro) {
  const g = e.engage;
  const ok = atrapados >= A.necesarios;
  if (ok) e.hechos += 1;
  g.fin = true;
  e.intentos.push({ atrapados, ok, tiro: !!centro });
  e.eventos.push({ tipo: 'explota', ok, atrapados, x: centro?.x ?? null, y: centro?.y ?? null, tiro: !!centro });
  e.i += 1;
  e.estado = 'pausa';
  e.espera = A.pausaS;
}

// Un paso fijo. `entrada`: `{ r: { x, y } }` (tirar la R ahí) o nada.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  if (e.estado === 'pausa') {
    e.espera -= PASO_FIJO;
    for (const r of e.engage.rivales) mover(e, r, 0);
    if (e.espera > 0) return;
    if (e.i >= ENGAGES) { e.terminado = true; e.eventos.push({ tipo: 'final' }); return; }
    armar(e);
    return;
  }
  const g = e.engage;
  g.t += PASO_FIJO;
  const v = g.f.v;
  if (g.modo === 'suelto') {
    g.modoT -= PASO_FIJO;
    for (const r of g.rivales) {
      if (dist(r.x, r.y, r.tx, r.ty) < 1) { const q = puntoLibre(e, g.paredes, 0); r.tx = q.x; r.ty = q.y; }
      mover(e, r, v);
    }
    if (g.modoT <= 0) empezarJunta(e);
  } else if (g.modo === 'junta') {
    g.modoT -= PASO_FIJO;
    for (const r of g.rivales) {
      mover(e, r, v * A.juntaK);
      if (!r.llego && dist(r.x, r.y, r.slot.x, r.slot.y) < 1) r.llego = true;
    }
    if (g.rivales.every((r) => r.llego)) { g.modo = 'junto'; g.modoT = e.p.juntosS; g.juntosHasta = e.t + e.p.juntosS; e.eventos.push({ tipo: 'juntos' }); }
    else if (g.modoT <= 0) { g.modo = 'suelto'; g.modoT = entre(e.rng, A.sueltoS); for (const r of g.rivales) { const q = puntoLibre(e, g.paredes, 0); r.tx = q.x; r.ty = q.y; } }
  } else {
    g.modoT -= PASO_FIJO;
    for (const r of g.rivales) mover(e, r, v);
    if (g.modoT <= 0) { g.modo = 'suelto'; g.modoT = entre(e.rng, A.sueltoS); for (const r of g.rivales) { const q = puntoLibre(e, g.paredes, 0); r.tx = q.x; r.ty = q.y; } }
  }
  // la R: el círculo queda donde la tiraste y explota a los `castS`
  if (entrada?.r && !g.cast) {
    g.cast = { x: limitar(entrada.r.x, 0, A.mundo[0]), y: limitar(entrada.r.y, 0, A.mundo[1]), resta: A.castS };
    e.eventos.push({ tipo: 'cast', x: g.cast.x, y: g.cast.y });
    for (const r of g.rivales) {
      if (g.f.flash > 0 && dist(r.x, r.y, g.cast.x, g.cast.y) <= e.p.radio + A.radioRival && e.rng() < g.f.flash) r.flashEn = A.flashDelayS;
    }
  }
  for (const r of g.rivales) {
    if (r.flashEn === null) continue;
    r.flashEn -= PASO_FIJO;
    if (r.flashEn > 0) continue;
    r.flashEn = null;
    r.flasheo = true;
    const c = g.cast ?? { x: r.x, y: r.y };
    const d = dist(r.x, r.y, c.x, c.y) || 1;
    r.x = limitar(r.x + ((r.x - c.x) / d) * A.flashDist, A.arena.x[0], A.arena.x[1]);
    r.y = limitar(r.y + ((r.y - c.y) / d) * A.flashDist, A.arena.y[0], A.arena.y[1]);
    sacarDePared(r, g.paredes);
    r.tx = r.x; r.ty = r.y;
    e.eventos.push({ tipo: 'flash', x: r.x, y: r.y });
  }
  if (g.cast) {
    g.cast.resta -= PASO_FIJO;
    if (g.cast.resta <= 0) {
      const c = g.cast;
      const dentro = g.rivales.filter((r) => dist(r.x, r.y, c.x, c.y) <= e.p.radio + A.radioRival && !hayPared(g.paredes, c.x, c.y, r.x, r.y));
      g.atrapados = dentro.map((r) => r.k);
      terminarEngage(e, dentro.length, c);
    }
  } else if (g.t > A.engageMaxS) {
    terminarEngage(e, 0, null);
  }
}

export const resultadoDe = (e) => e.hechos / ENGAGES;

export function detalleDe(e) {
  return { tipo: 'engages', total: ENGAGES, hechos: e.hechos, necesarios: A.necesarios, intentos: e.intentos.map((x) => ({ ...x })) };
}

export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
