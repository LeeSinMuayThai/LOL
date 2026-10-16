// La pizarra (M4): la lógica de `la_pizarra`, separada del dibujo. Pura y sin DOM: la corre la parada (cuadro a cuadro, con
// `avanzar`) y `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en `BALANCE.g1.arcade.la_pizarra`.
//
// Un memotest de draft en tres fases. El coach muestra el plan del rival (picks, bans y líneas) un rato que abre `macro`;
// después se tapa y armás los pares: cada pick con su línea o con su counter. Las fases suman pares, acortan la vista, y en
// la última la pizarra se mezcla a la vista. La regla es de ERRORES (contrato de G1): `1 − errores / TOPE_ERRORES`. Un par
// que no era es un error; los pares que quedan sin armar cuando se acaba el tiempo de la fase, también.

import { BALANCE } from '../../data/balance.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const A = BALANCE.g1.arcade.la_pizarra;
export const TOPE_ERRORES = BALANCE.g1.erroresTope.la_pizarra;
export const FASES = A.fases.length;
export const PARES = A.fases.reduce((s, f) => s + f.pares, 0);

function mezclar(lista, rng) {
  for (let i = lista.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

export function parametros({ stat = 50, dificultad = 1 } = {}) {
  return { stat, dificultad, vistaPorPar: ventanaPorStat(stat, A.vistaPorParS[0], A.vistaPorParS[1], dificultad) };
}

// La ventana en segundos (para medir el stat): la vista de la última fase, la más corta.
export function ventanaEnSegundos(p) {
  const f = A.fases[FASES - 1];
  return p.vistaPorPar * f.pares * f.vista;
}

function armarFase(i, p, rng) {
  const f = A.fases[i];
  const cartas = [];
  for (let k = 0; k < f.pares; k += 1) cartas.push({ par: k, lado: 0, estado: 'tapada' }, { par: k, lado: 1, estado: 'tapada' });
  mezclar(cartas, rng);
  const vistaS = p.vistaPorPar * f.pares * f.vista;
  const mezclas = Array.from({ length: f.mezclas }, (_, k) => {
    const a = Math.floor(rng() * cartas.length);
    let b = Math.floor(rng() * (cartas.length - 1));
    if (b >= a) b += 1;
    const u = f.mezclas > 1 ? k / (f.mezclas - 1) : 0;
    return { en: vistaS * (A.mezclaDesde + (A.mezclaHasta - A.mezclaDesde) * u), a, b };
  });
  return {
    i, pares: f.pares, cartas, vistaS, respondeS: f.pares * f.respondePorParS, mezclas,
    estado: 'ver', t: 0, espera: 0, abiertas: [], hechos: 0
  };
}

export function crear(params, rng) {
  const e = { p: params, rng, t: 0, iFase: 0, fase: null, errores: 0, pares: 0, terminado: false, eventos: [] };
  e.fase = armarFase(0, params, rng);
  return e;
}

function cerrarFase(e) {
  e.fase.estado = 'entre';
  e.fase.espera = A.entreFasesS;
}

// Un paso fijo. `entrada`: `{ voltear: indice }` (la carta que tocás) o nada.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  const f = e.fase;
  if (f.estado === 'ver') {
    f.t += PASO_FIJO;
    while (f.mezclas.length && f.t >= f.mezclas[0].en) {
      const m = f.mezclas.shift();
      [f.cartas[m.a], f.cartas[m.b]] = [f.cartas[m.b], f.cartas[m.a]];
      e.eventos.push({ tipo: 'mezcla', a: m.a, b: m.b });
    }
    if (f.t >= f.vistaS) {
      f.estado = 'juega';
      f.t = 0;
      e.eventos.push({ tipo: 'tapar' });
    }
    return;
  }
  if (f.estado === 'entre') {
    f.espera -= PASO_FIJO;
    if (f.espera > 0) return;
    if (e.iFase + 1 >= FASES || e.errores >= TOPE_ERRORES) {
      e.terminado = true;
      e.eventos.push({ tipo: 'final' });
      return;
    }
    e.iFase += 1;
    e.fase = armarFase(e.iFase, e.p, e.rng);
    e.eventos.push({ tipo: 'fase', i: e.iFase });
    return;
  }
  // 'juega' y 'error': el reloj de la fase corre
  f.t += PASO_FIJO;
  if (f.t >= f.respondeS) {
    const faltan = f.pares - f.hechos;
    for (const i of f.abiertas) f.cartas[i].estado = 'tapada';
    f.abiertas = [];
    e.errores += faltan;
    e.eventos.push({ tipo: 'tiempo', faltan });
    cerrarFase(e);
    return;
  }
  if (f.estado === 'error') {
    f.espera -= PASO_FIJO;
    if (f.espera > 0) return;
    for (const i of f.abiertas) f.cartas[i].estado = 'tapada';
    f.abiertas = [];
    if (e.errores >= TOPE_ERRORES) cerrarFase(e);
    else f.estado = 'juega';
    return;
  }
  const i = entrada?.voltear;
  if (i === undefined || !f.cartas[i] || f.cartas[i].estado !== 'tapada') return;
  f.cartas[i].estado = 'abierta';
  f.abiertas.push(i);
  e.eventos.push({ tipo: 'voltea', i });
  if (f.abiertas.length < 2) return;
  const [a, b] = f.abiertas;
  if (f.cartas[a].par === f.cartas[b].par) {
    f.cartas[a].estado = 'par';
    f.cartas[b].estado = 'par';
    f.abiertas = [];
    f.hechos += 1;
    e.pares += 1;
    e.eventos.push({ tipo: 'par', a, b });
    if (f.hechos >= f.pares) cerrarFase(e);
    return;
  }
  e.errores += 1;
  f.estado = 'error';
  f.espera = A.errorS;
  e.eventos.push({ tipo: 'error', a, b });
}

export function resultadoDe(e) {
  return Math.max(0, 1 - e.errores / TOPE_ERRORES);
}

export function detalleDe(e) {
  return { tipo: 'errores', errores: e.errores };
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
