// Last hit (M1, ola H entrega 2): la lógica de `last_hit`, separada del dibujo. Pura y sin DOM: la corre la parada cuadro a
// cuadro (`avanzar`) y `simular`, en Node (`dev/arcade-humano.js`). Las constantes, en `BALANCE.g1.arcade.last_hit`.
//
// La línea vista de costado: la oleada pelea sola y la vida de cada minion rival baja a golpes de los aliados (con ruido) y,
// en la última fase, de los tiros de tu torre. Tu auto pega `danio` (sale del stat): mata si el minion tiene `danio` o menos;
// con más vida es TEMPRANO (no muere y el cooldown se estira: perdés el ritmo); con la vida en 0 te lo robó la oleada o la
// torre. La regla es de CONTEO (contrato de G1): el resultado es minions rematados / `g1.conteo.last_hit`.

import { BALANCE } from '../../data/balance.js';
import { ventanaPorStat } from '../components/minijuegos/comun.js';
import { PASO_FIJO, correrComoMonitor } from './reloj.js';

const A = BALANCE.g1.arcade.last_hit;
export const OBJETIVOS = BALANCE.g1.conteo.last_hit;
export const FASES = A.fases.length;
const media = ([a, b]) => (a + b) / 2;
const entre = (rng, [a, b]) => a + (b - a) * rng();

export function parametros({ stat = 50, dificultad = 1 } = {}) {
  return { stat, dificultad, danio: ventanaPorStat(stat, A.danioStat[0], A.danioStat[1], dificultad) };
}

// La ventana en segundos (para medir el stat): cuánto tarda la oleada en gastar la vida que tu auto alcanza a rematar.
export function ventanaEnSegundos(p) {
  const f = A.fases[0];
  return p.danio / ((media(f.golpe) / media(f.golpeCadaS)) * media(A.intensidad));
}

// En qué fase está el minion número `n` (desde 0)
export function faseDeObjetivo(n) {
  let acumulado = 0;
  for (let i = 0; i < FASES; i += 1) {
    acumulado += A.fases[i].objetivos;
    if (n < acumulado) return i;
  }
  return FASES - 1;
}

function armarObjetivo(e) {
  const i = faseDeObjetivo(e.resultados.length);
  const f = A.fases[i];
  const ritmo = e.ritmos[i] * entre(e.rng, A.jitterMinion);
  return {
    i,
    tipo: f.tipo,
    oro: f.oro,
    hpMax: f.hp,
    hp: f.hp,
    t: 0,
    ritmo,
    proximo: entre(e.rng, f.golpeCadaS) / ritmo,
    vivo: true,
    temprano: false,
    torre: f.torre ? { cuenta: f.torre.cadaS * (0.5 + e.rng() * 0.5), vuelo: null } : null
  };
}

export function crear(params, rng) {
  const ritmos = A.fases.map(() => entre(rng, A.intensidad));
  return { p: params, rng, ritmos, t: 0, cd: 0, espera: A.entreS, objetivo: null, resultados: [], terminado: false, eventos: [] };
}

function cerrar(e, resultado) {
  e.resultados.push(resultado);
  e.objetivo = null;
  e.espera = A.entreS;
  if (e.resultados.length >= OBJETIVOS) e.terminado = true;
}

// Un paso fijo. `entrada`: `{ golpe: true }` o nada.
export function avanzar(e, entrada = null) {
  if (e.terminado) return;
  e.t += PASO_FIJO;
  if (e.t > A.maxS) {
    while (e.resultados.length < OBJETIVOS) e.resultados.push({ cs: false, motivo: 'tiempo' });
    e.terminado = true;
    return;
  }
  e.cd = Math.max(0, e.cd - PASO_FIJO);
  if (!e.objetivo) {
    e.espera -= PASO_FIJO;
    if (e.espera <= 0) {
      e.objetivo = armarObjetivo(e);
      e.eventos.push({ tipo: 'objetivo', i: e.objetivo.i, fase: e.objetivo.i, nuevaFase: e.resultados.length === 0 || faseDeObjetivo(e.resultados.length - 1) !== e.objetivo.i });
    }
  }
  const o = e.objetivo;
  if (o) {
    o.t += PASO_FIJO;
    const f = A.fases[o.i];
    if (o.t >= A.llegaS && o.vivo) {
      o.proximo -= PASO_FIJO;
      if (o.proximo <= 0) {
        const monto = entre(e.rng, f.golpe);
        o.hp -= monto;
        if (o.hp <= 0 && !o.mato) o.mato = 'oleada';
        o.proximo += entre(e.rng, f.golpeCadaS) / o.ritmo;
        e.eventos.push({ tipo: 'golpe', monto });
      }
      if (o.torre) {
        if (o.torre.vuelo === null) {
          o.torre.cuenta -= PASO_FIJO;
          if (o.torre.cuenta <= 0) { o.torre.vuelo = f.torre.vueloS; e.eventos.push({ tipo: 'tiro' }); }
        } else {
          o.torre.vuelo -= PASO_FIJO;
          if (o.torre.vuelo <= 0) {
            o.hp -= f.torre.danio;
            if (o.hp <= 0 && !o.mato) o.mato = 'torre';
            o.torre.vuelo = null;
            o.torre.cuenta = f.torre.cadaS;
            e.eventos.push({ tipo: 'torre', monto: f.torre.danio });
          }
        }
      }
    }
  }
  // tu golpe
  if (entrada?.golpe && e.cd <= 0) {
    if (o && o.vivo && o.t >= A.llegaS) {
      if (o.hp <= e.p.danio) {
        o.hp = 0;
        o.vivo = false;
        e.cd = A.cdS;
        e.eventos.push({ tipo: 'cs', oro: o.oro, objetivo: o.tipo });
        cerrar(e, { cs: true, motivo: o.temprano ? 'rematado' : 'limpio', tipo: o.tipo });
        return;
      }
      o.hp -= e.p.danio;
      if (A.fases[o.i].parcial) {
        // bajo la torre un golpe que no mata es un pre-golpe: el tiro de la torre lo deja a tiro y no cuesta el ritmo
        e.cd = A.fases[o.i].parcialCdS;
        e.eventos.push({ tipo: 'prehit', monto: e.p.danio });
      } else {
        o.temprano = true;
        e.cd = A.falloCdS;
        e.eventos.push({ tipo: 'temprano', monto: e.p.danio });
      }
    } else {
      e.cd = A.falloCdS;
      e.eventos.push({ tipo: 'aire' });
    }
  }
  // la oleada o la torre se lo llevan
  if (o && o.vivo && o.hp <= 0) {
    o.vivo = false;
    const porTorre = o.mato === 'torre';
    e.eventos.push({ tipo: 'robado', por: porTorre ? 'torre' : 'oleada' });
    cerrar(e, { cs: false, motivo: porTorre ? 'torre' : 'oleada', tipo: o.tipo });
  }
}

export function resultadoDe(e) {
  return e.resultados.filter((r) => r.cs).length / OBJETIVOS;
}

// Lo que la parada lee para el "tan cerca": cuántos remató de cuántos.
export function detalleDe(e) {
  return { tipo: 'conteo', logrados: e.resultados.filter((r) => r.cs).length, total: OBJETIVOS, minions: e.resultados.map((r) => ({ cs: r.cs, motivo: r.motivo })) };
}

export function simular(params, humano, rng, { hz = 60 } = {}) {
  const e = crear(params, rng);
  correrComoMonitor(hz, () => e.terminado, () => {
    e.eventos.length = 0;
    avanzar(e, humano ? humano(e) : null);
  });
  return { resultado: resultadoDe(e), detalle: detalleDe(e) };
}
