// El Barón (H3k): la lógica de `robar_baron`, separada del dibujo. Pura y sin DOM: la corre la parada (cuadro a cuadro, con
// `avanzar`) y `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en `BALANCE.g1.arcade.robar_baron`.
//
// Tres objetivos en el pozo, uno por fase: la vida baja a golpes (los dos equipos le pegan), acelera cerca de la zona, y en
// las fases altas hay golpes grandes que se ven venir, pausas sin aviso (el Barón tira a todos para atrás) y amagues del
// smite rival. Un smite por objetivo. La regla es de DISTANCIA (contrato de G1): cada smite vale
// `resultadoDeDistancia(|vida − centro|, ESCALA_DISTANCIA)` y la zona dibujada mide `radioQuePasa(vara)` de cada lado; el
// resultado del minijuego es el PEOR de los tres: pasa si los tres caen en su zona. Lo que ves es lo que pasa.
// Si no smiteaste cuando la vida baja de la línea del rival, te lo roba: ese objetivo vale 0.

import { BALANCE } from '../../data/balance.js';
import { resultadoDeDistancia, radioQuePasa } from '../../core/minijuegos.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const A = BALANCE.g1.arcade.robar_baron;
// A qué distancia del centro (más el piso humano, `g1.pisoHumano.distancia`) un smite vale 0, en la escala 0-100 de la barra.
// La usa `components/varaG1.js` para decir la vara en unidades de la barra (G-fix-vara: era 45; con 12 la zona del techo mide ~6).
export const ESCALA_DISTANCIA = 12;
export const FASES = A.fases.length;
const VIDA_LLENA = 100;
// lo que dura a la vista un amague del rival (solo dibujo: la lógica lo marca)
const AMAGUE_S = 0.55;

const entre = (rng, [a, b]) => a + (b - a) * rng();
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

// Lo que la mecánica necesita saber de la jugada: el stat, la vara efectiva (o la de sin final) y la dificultad.
export function parametros({ stat = 50, vara = null, dificultad = 1 } = {}) {
  const v = vara ?? A.varaSinG1;
  return {
    stat,
    vara: v,
    dificultad,
    radio: radioQuePasa(v, ESCALA_DISTANCIA),
    ventana: ventanaPorStat(stat, A.ventanaStat[0], A.ventanaStat[1], dificultad)
  };
}

// La ventana en segundos: lo que la vida tarda en cruzar la zona a toda velocidad en la última fase (para medir el stat).
export function ventanaEnSegundos(p) {
  return (2 * p.radio) / (A.fases[FASES - 1].vMax / p.ventana);
}

function armarFase(i, p, rng) {
  const f = A.fases[i];
  const centro = entre(rng, A.centro);
  const desc = (a, b) => b - a;
  return {
    i,
    centro,
    intensidad: entre(rng, A.intensidad),
    radio: p.radio,
    rival: centro - Math.max(p.radio, f.margenRival),
    vida: VIDA_LLENA,
    t: 0,
    proximo: entre(rng, A.golpeCadaS),
    intervalo: 0,
    grandes: Array.from({ length: f.grandes }, () => centro + entre(rng, A.grandeEn)).sort(desc),
    pausas: Array.from({ length: f.pausas }, () => ({ en: centro + entre(rng, A.pausaEn), dura: entre(rng, A.pausaS) }))
      .sort((a, b) => b.en - a.en),
    amagues: Array.from({ length: f.amaguesRival }, () => centro + entre(rng, A.amagueEn)).sort(desc),
    aviso: null,
    pausa: 0,
    amague: 0,
    smite: null,
    robado: false,
    fin: false
  };
}

export function crear(params, rng) {
  const e = { p: params, rng, t: 0, iFase: 0, fase: null, espera: 0, smites: [], terminado: false, eventos: [] };
  e.fase = armarFase(0, params, rng);
  return e;
}

// La velocidad a la que baja la vida: `vInicial` arriba, `vMax` desde el centro; el stat (la ventana) la divide.
export function velocidad(e) {
  const f = e.fase;
  const vMax = A.fases[f.i].vMax;
  const k = limitar(1 - (f.vida - f.centro) / A.rampa, 0, 1);
  return ((A.vInicial + (vMax - A.vInicial) * k) * f.intensidad) / e.p.ventana;
}

// Cuánto le falta al smite del rival: 0 lejos, 1 cuando lo tira (para el dibujo: "se ve venir").
export function cargaRival(e) {
  const f = e.fase;
  const tope = f.centro + f.radio + A.rampa / 2;
  return limitar((tope - f.vida) / (tope - f.rival), 0, 1);
}

function cerrarFase(e, smite) {
  const f = e.fase;
  f.fin = true;
  f.smite = smite;
  e.smites.push(smite);
  e.espera = A.entreFasesS;
}

// Un paso fijo. `entrada`: `{ smite: true }` o nada.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  const f = e.fase;
  if (f.fin) {
    e.espera -= PASO_FIJO;
    if (e.espera > 0) return;
    if (e.iFase + 1 >= FASES) {
      e.terminado = true;
      e.eventos.push({ tipo: 'final' });
      return;
    }
    e.iFase += 1;
    e.fase = armarFase(e.iFase, e.p, e.rng);
    e.eventos.push({ tipo: 'fase', i: e.iFase });
    return;
  }
  f.t += PASO_FIJO;
  if (entrada?.smite) {
    const d = Math.abs(f.vida - f.centro);
    const r = resultadoDeDistancia(d, ESCALA_DISTANCIA);
    cerrarFase(e, { vida: f.vida, centro: f.centro, d, r, robado: false, adentro: d <= f.radio });
    e.eventos.push({ tipo: 'smite', ...f.smite });
    return;
  }
  if (f.amague > 0) f.amague -= PASO_FIJO;
  if (f.amagues.length && f.vida <= f.amagues[0]) {
    f.amagues.shift();
    f.amague = AMAGUE_S;
    e.eventos.push({ tipo: 'amague' });
  }
  if (f.pausas.length && f.vida <= f.pausas[0].en) {
    f.pausa = f.pausas.shift().dura;
    e.eventos.push({ tipo: 'pausa' });
  }
  if (!f.aviso && f.grandes.length && f.vida <= f.grandes[0]) {
    f.grandes.shift();
    f.aviso = { resta: A.avisoGrandeS, monto: entre(e.rng, A.golpeGrande) };
    e.eventos.push({ tipo: 'aviso', monto: f.aviso.monto });
  }
  if (f.aviso) {
    f.aviso.resta -= PASO_FIJO;
    if (f.aviso.resta <= 0) {
      f.vida -= f.aviso.monto;
      e.eventos.push({ tipo: 'grande', monto: f.aviso.monto });
      f.aviso = null;
    }
  }
  if (f.pausa > 0) {
    f.pausa -= PASO_FIJO;
  } else {
    f.proximo -= PASO_FIJO;
    if (f.proximo <= 0) {
      const intervalo = entre(e.rng, A.golpeCadaS);
      const golpe = velocidad(e) * intervalo;
      f.vida -= golpe;
      f.proximo += intervalo;
      e.eventos.push({ tipo: 'golpe', monto: golpe });
    }
  }
  if (f.vida <= f.rival) {
    const d = Math.abs(f.vida - f.centro);
    cerrarFase(e, { vida: f.vida, centro: f.centro, d, r: 0, robado: true, adentro: false });
    e.eventos.push({ tipo: 'robado' });
  }
}

export function resultadoDe(e) {
  if (e.smites.length < FASES) return 0;
  return Math.min(...e.smites.map((x) => x.r));
}

// Lo que la parada lee para el "tan cerca" (`components/varaG1.js`): los tres smites y el radio de la zona.
export function detalleDe(e) {
  return {
    tipo: 'smites',
    escala: ESCALA_DISTANCIA,
    radio: e.p.radio,
    smites: e.smites.map((s) => ({ d: s.d, r: s.r, robado: s.robado, adentro: s.adentro }))
  };
}

// La partida entera sin pantalla. `humano(e)` mira el estado en cada paso y devuelve la entrada (o nada); `hz` es el
// monitor que se emula (no cambia nada: el paso es fijo).
export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
