// La llamada (M4): la lógica de `la_llamada`, separada del dibujo. Pura y sin DOM: la corre la parada (cuadro a cuadro, con
// `avanzar`) y `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en `BALANCE.g1.arcade.la_llamada`.
//
// Sos el que canta la jugada. Tres situaciones (fases). Cada una arma un mapa con cuatro objetivos y sus relojes (dragón,
// Barón, Atakhan, torre), el jungla rival visto en alguno y el Flash del rival gastado o no. Se abre el que sale libre: el
// reloj en cero y sin el jungla rival encima (salvo que su Flash esté gastado). Cantás el objetivo (1-4 o un clic) antes de
// que se cierre la ventana. La fase 1 trae más información (marcas de más que no cuentan), la 2 señuelos (otro objetivo se
// abre, pero con el jungla y el Flash arriba) y la 3 es más rápida. La regla es de LATENCIA (contrato de G1): el resultado es
// `resultadoDeLatencia(latencia media, ventana)`. Cantar antes de la señal, el objetivo equivocado o tarde vale la ventana
// entera: cantar mal cuesta.

import { BALANCE } from '../../data/balance.js';
import { resultadoDeLatencia } from '../../core/minijuegos.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const A = BALANCE.g1.arcade.la_llamada;
export const FASES = A.fases.length;
export const OBJETIVOS = 4;
const PISO_MS = BALANCE.g1.pisoHumano.llamadaMs;

const entre = (rng, [a, b]) => a + (b - a) * rng();

export function parametros({ stat = 50, dificultad = 1 } = {}) {
  return { stat, dificultad, ventanaMs: PISO_MS + ventanaPorStat(stat, A.ventanaMs[0], A.ventanaMs[1], dificultad) };
}

// La ventana en segundos (para medir el stat): lo que el stat abre por encima del piso humano.
export function ventanaEnSegundos(p) {
  return (p.ventanaMs - PISO_MS) / 1000;
}

function armarFase(i, rng) {
  const f = A.fases[i];
  const orden = [0, 1, 2, 3];
  for (let k = orden.length - 1; k > 0; k -= 1) {
    const j = Math.floor(rng() * (k + 1));
    [orden[k], orden[j]] = [orden[j], orden[k]];
  }
  const correcto = orden[0];
  const senuelos = orden.slice(1, 1 + f.senuelos);
  const objetivos = Array.from({ length: OBJETIVOS }, (_, id) => ({ id, reloj: f.setupS + entre(rng, A.entreOtrosS), jungla: false, flash: false }));
  objetivos[correcto].reloj = f.setupS;
  for (const id of senuelos) Object.assign(objetivos[id], { reloj: f.setupS, jungla: true, flash: false });
  if (f.trampa) Object.assign(objetivos[correcto], { jungla: true, flash: true });
  // el ruido: marcas que no cambian la respuesta (jungla visto o Flash gastado en objetivos que no se abren)
  const mudos = orden.filter((id) => id !== correcto && !senuelos.includes(id));
  for (let k = 0; k < f.ruido && mudos.length; k += 1) {
    const o = objetivos[mudos[Math.floor(rng() * mudos.length)]];
    if (rng() < A.ruidoJungla) o.jungla = true; else o.flash = true;
  }
  return { i, setupS: f.setupS, objetivos, correcto, senuelos, t: 0, estado: 'setup', espera: 0, llamada: null };
}

export function crear(params, rng) {
  const e = { p: params, rng, t: 0, iFase: 0, fase: null, llamadas: [], terminado: false, eventos: [] };
  e.fase = armarFase(0, rng);
  e.espera = A.inicioS;
  return e;
}

function cerrar(e, llamada) {
  const f = e.fase;
  f.llamada = llamada;
  f.estado = 'entre';
  f.espera = A.feedbackS;
  e.llamadas.push(llamada);
  e.eventos.push({ tipo: 'llamada', ...llamada });
}

// Un paso fijo. `entrada`: `{ llamar: objetivo }` (0..3) o nada.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  if (e.espera > 0) {
    e.espera -= PASO_FIJO;
    return;
  }
  const f = e.fase;
  if (f.estado === 'entre') {
    f.espera -= PASO_FIJO;
    if (f.espera > 0) return;
    if (e.iFase + 1 >= FASES) {
      e.terminado = true;
      e.eventos.push({ tipo: 'final' });
      return;
    }
    e.iFase += 1;
    e.fase = armarFase(e.iFase, e.rng);
    e.espera = A.inicioS;
    e.eventos.push({ tipo: 'fase', i: e.iFase });
    return;
  }
  f.t += PASO_FIJO;
  const llamar = entrada?.llamar;
  if (f.estado === 'setup') {
    if (llamar !== undefined) {
      cerrar(e, { objetivo: llamar, ms: e.p.ventanaMs, ok: false, motivo: 'temprano' });
      return;
    }
    if (f.t >= f.setupS) {
      f.estado = 'abierta';
      e.eventos.push({ tipo: 'senal' });
    }
    return;
  }
  const ms = (f.t - f.setupS) * 1000;
  if (llamar !== undefined) {
    const ok = llamar === f.correcto;
    cerrar(e, ok ? { objetivo: llamar, ms, ok, motivo: 'bien' } : { objetivo: llamar, ms: e.p.ventanaMs, ok, motivo: 'mal' });
    return;
  }
  if (ms >= e.p.ventanaMs) cerrar(e, { objetivo: null, ms: e.p.ventanaMs, ok: false, motivo: 'tarde' });
}

export function latenciaMedia(e) {
  if (e.llamadas.length < FASES) return e.p.ventanaMs;
  return e.llamadas.reduce((s, l) => s + l.ms, 0) / FASES;
}

export function resultadoDe(e) {
  return resultadoDeLatencia(latenciaMedia(e), e.p.ventanaMs);
}

// Lo que la parada lee para el "tan cerca" (`components/varaG1.js`): la latencia media y la ventana.
export function detalleDe(e) {
  return { tipo: 'latencia', ms: latenciaMedia(e), ventanaMs: e.p.ventanaMs, llamadas: e.llamadas.map((l) => ({ ...l })) };
}

// La partida entera sin pantalla (ver `baron.js`).
export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
