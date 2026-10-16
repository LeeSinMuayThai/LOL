// El combo (M3, ola H entrega 2): la lógica de `el_combo`, separada del dibujo. Pura y sin DOM: la corre la parada (cuadro a
// cuadro, con `avanzar`) y `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en `BALANCE.g1.arcade.el_combo`.
//
// Un combo de tu campeón (Q, W, E, R, F) baja en notas por el carril hasta la línea de golpe y apretás la tecla justa en la
// ventana. Regla de CONTEO (contrato de G1): cada combo completo cuenta 1 y el resultado es completos / `g1.conteo.el_combo`.
// Si fallás una nota (otra tecla, fuera de ventana o sin apretar) el combo se corta, las notas que quedaban se pierden y la
// animación del campeón de fondo sale mal. Fases: más rápido, combos más largos y cancelaciones de animación (ventana más chica).

import { BALANCE } from '../../data/balance.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const A = BALANCE.g1.arcade.el_combo;
export const TECLAS = A.teclas;
export const FASES = A.fases.length;
export const COMBOS = A.fases.reduce((s, f) => s + f.combos, 0);

const entre = (rng, [a, b]) => a + (b - a) * rng();

export function parametros({ stat = 50, dificultad = 1 } = {}) {
  return { stat, dificultad, ventana: ventanaPorStat(stat, A.ventanaS[0], A.ventanaS[1], dificultad) };
}

// La ventana en segundos: el ancho de tiempo en que una nota se puede apretar (para medir el stat).
export function ventanaEnSegundos(p) { return 2 * p.ventana; }

export function faseDe(i) {
  let resto = i;
  for (let k = 0; k < FASES; k += 1) {
    if (resto < A.fases[k].combos) return k;
    resto -= A.fases[k].combos;
  }
  return FASES - 1;
}

export function ventanaDe(e, nota) { return nota.cancel ? e.p.ventana * A.cancelK : e.p.ventana; }

export function crear(params, rng) {
  return { p: params, rng, t: 0, estado: 'pausa', espera: A.arrancaS, i: 0, combo: null, hechos: 0, intentos: [], terminado: false, eventos: [] };
}

function armar(e) {
  const f = A.fases[faseDe(e.i)];
  const tNace = (A.nacenX - A.lineaX) / A.vel;
  const notas = Array.from({ length: f.largo }, (_, k) => ({
    k: TECLAS[Math.floor(e.rng() * TECLAS.length)],
    en: e.t + tNace + A.primeraS + k * f.gapS,
    cancel: f.cancelCada > 0 && (k + 1) % f.cancelCada === 0,
    estado: null,
    dt: null
  }));
  e.combo = { i: e.i, fase: faseDe(e.i), gapS: f.gapS, notas, idx: 0, t0: e.t, cortado: false };
  e.estado = 'combo';
  e.eventos.push({ tipo: 'combo', i: e.i, fase: e.combo.fase, largo: f.largo });
}

function cerrar(e, ok, motivo) {
  const c = e.combo;
  c.cortado = !ok;
  if (ok) e.hechos += 1;
  e.intentos.push({ largo: c.notas.length, hechas: c.idx, ok });
  e.eventos.push({ tipo: ok ? 'completo' : 'corte', motivo, i: c.i, idx: c.idx });
  e.i += 1;
  e.estado = 'pausa';
  e.espera = A.entreS;
}

// Un paso fijo. `entrada`: `{ tecla: 'q' }` o nada.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  if (e.estado === 'pausa') {
    e.espera -= PASO_FIJO;
    if (e.espera > 0) return;
    if (e.i >= COMBOS) { e.terminado = true; e.eventos.push({ tipo: 'final' }); return; }
    armar(e);
    return;
  }
  const c = e.combo;
  const n = c.notas[c.idx];
  const w = ventanaDe(e, n);
  const tecla = entrada?.tecla ?? null;
  if (tecla && e.t >= n.en - A.capturaK * w) {
    const dt = e.t - n.en;
    n.dt = dt;
    if (tecla === n.k && Math.abs(dt) <= w) {
      n.estado = 'bien';
      c.idx += 1;
      e.eventos.push({ tipo: 'nota', ok: true, dt, k: n.k, cancel: n.cancel });
      if (c.idx >= c.notas.length) cerrar(e, true, 'completo');
    } else {
      n.estado = 'mal';
      e.eventos.push({ tipo: 'nota', ok: false, dt, k: tecla, cancel: n.cancel });
      cerrar(e, false, tecla === n.k ? (dt < 0 ? 'temprano' : 'tarde') : 'tecla');
    }
    return;
  }
  if (e.t > n.en + w) {
    n.estado = 'perdida';
    e.eventos.push({ tipo: 'nota', ok: false, dt: null, k: n.k, cancel: n.cancel });
    cerrar(e, false, 'perdida');
  }
}

export const resultadoDe = (e) => e.hechos / COMBOS;

export function detalleDe(e) {
  return { tipo: 'combos', total: COMBOS, hechos: e.hechos, intentos: e.intentos.map((x) => ({ ...x })) };
}

export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
