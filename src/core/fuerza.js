import { multiplicadorDeMeta, factorDeCampeon } from './ajusteMeta.js';
import { nivelDelJugador } from './ficha.js';
import { clampStat } from './numeros.js';
import { BALANCE } from '../data/balance.js';
import { IDS_ROL } from '../data/roles.js';

// Fase 9Rc: la parte determinista del rendimiento, extraída a `core/` para que
// `core/serie.js` y `core/temporada.js` puedan estimar cuánta fuerza da cada
// campeón, y así decidir si vale la pena preguntarle al jugador (9Rd), sin
// importar de `systems/` ni tocar el `rng`.
//
// K2b (PLAN.md "K2 — lo que midió la investigación"): desde acá la fuerza de un
// partido ES determinista. Hasta K2a `calcularRendimiento` le sumaba un `gauss`
// por split (la "una sola tirada" que decidía las 7-9 fechas juntas) y otro por
// mapa; ahora el azar del partido vive solo en la p de `core/partido.js`.
//
// Puro y sin RNG.

// El factor de un multiplicador centrado en su referencia: 1 en `referencia`,
// `1 ± peso/2` en los extremos 100/0 si la referencia es 50. Escrito como
// `valor/max − referencia/max` para que con referencia 50 sea, bit a bit, el
// `valor/max − 0,5` de antes de K2b.
function factorCentrado(valor, referencia, peso) {
  return 1 + (valor / BALANCE.stats.max - referencia / BALANCE.stats.max) * peso;
}

// Tu nivel corrido por el meta, el campeón que vas a terminar jugando y la
// jerarquía — sin clamp (lo aplica `rendimientoDePartido`). K2b: la sinergia
// salió de acá: es química del equipo y se cuenta una sola vez, en
// `fuerzaDelEquipo`.
export function rendimientoBase(state) {
  const r = BALANCE.rendimiento;
  const base = nivelDelJugador(state);

  const campeon = state.player.championPool.find((c) => c.name === state.player.campeonDelSplit);
  const factorCampeon = factorDeCampeon(campeon, state.meta.weights);
  const factorJerarquia = factorCentrado(state.career.jerarquia, r.jerarquiaReferencia, r.jerarquiaPesoEnRendimiento * 2);

  return base
    * multiplicadorDeMeta(state.meta.ajuste)
    * factorCampeon
    * factorJerarquia;
}

// K2b: el rendimiento con el que jugás un partido (fecha o mapa): el base,
// acotado a la escala 0-100. Sin dado.
export function rendimientoDePartido(state) {
  return clampStat(rendimientoBase(state));
}

// K2b: los compañeros que tu org tiene HOY en el plantel del mundo
// (`mundo.planteles`, fase 9M), con la misma forma que guarda
// `career.companeros`. `null` si la org no tiene plantel modelado (tier 3, o una
// tier 2 fuera de tu región): ahí los compañeros son los que inventó
// `systems/roster.js` al armar el roster. Pura.
export function companerosDelPlantel(state, orgNombre) {
  const plantel = orgNombre ? state.mundo?.planteles?.[orgNombre] : null;
  if (!plantel) {
    return null;
  }
  return IDS_ROL.filter((rol) => rol !== state.player.role).map((rol) => ({
    handle: plantel[rol].handle,
    role: rol,
    nivel: plantel[rol].nivel,
    edad: plantel[rol].edad,
    aniosContrato: plantel[rol].contrato.anios
  }));
}

// El nivel medio de los compañeros con el que se calcula la fuerza del equipo.
// K2a: extraído para que `systems/temporada.js` lo deje expuesto en el estado
// de la temporada y el instrumento de `src/dev/simulate.js` lea lo que el motor
// usó. K2b: EN VIVO — en las ligas modeladas, el nivel actual del plantel de tu
// org (si el mundo los envejeció o los cambió, juegan como son hoy, y en el
// split de un traspaso juegan los de la org nueva); en las no modeladas, el
// snapshot de `systems/roster.js`. Puro y sin RNG.
export function nivelDeCompaneros(state) {
  const companeros = companerosDelPlantel(state, state.career.currentOrg) ?? state.career.companeros;
  return companeros.reduce((suma, c) => suma + c.nivel, 0) / Math.max(1, companeros.length);
}

// El equipo es sus compañeros más vos, por la química del roster. Cuanto más
// peso tenés en el resultado, más te sube y te baja la jerarquía lo que pase.
// Se movió tal cual desde `systems/rendimiento.js` (la fase 4 la reusaba mapa a
// mapa; ahora también la mira el draft de 9Rd). K2b: la sinergia se cuenta acá
// y solo acá, sobre el equipo entero (`sinergiaPesoEnEquipo`).
export function fuerzaDelEquipo(state, rendimiento) {
  const r = BALANCE.rendimiento;
  const nivelCompaneros = nivelDeCompaneros(state);

  const bruto = nivelCompaneros * (1 - r.pesoJugadorEnEquipo) + rendimiento * r.pesoJugadorEnEquipo;
  return bruto * factorCentrado(state.career.sinergia, r.sinergiaReferencia, r.sinergiaPesoEnEquipo);
}

// K2b: la fuerza con la que tu equipo juega un partido, con el campeón de
// `player.campeonDelSplit` (el de la fecha, o el elegido para el mapa).
// Determinista: es la fuerza propia que entra a `probabilidadDePartido`.
export function fuerzaDePartido(state) {
  return fuerzaDelEquipo(state, rendimientoDePartido(state));
}
