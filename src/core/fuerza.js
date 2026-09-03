import { multiplicadorDeMeta, factorDeCampeon } from './ajusteMeta.js';
import { nivelDelJugador } from './ficha.js';
import { BALANCE } from '../data/balance.js';

// Fase 9Rc: la parte determinista del rendimiento del split —todo
// `calcularRendimiento` (systems/rendimiento.js) MENOS el `gauss` de ruido—,
// extraída a `core/` para que `core/serie.js` y `core/temporada.js` puedan
// estimar cuánta fuerza da cada campeón, y así decidir si vale la pena
// preguntarle al jugador (9Rd), sin importar de `systems/` ni tocar el `rng`.
//
// Mismo movimiento que la fase 8 hizo con `nivelDelJugador`: una sola fórmula
// viva, no dos copias que divergen. `systems/rendimiento.js` importa de acá y
// re-exporta `fuerzaDelEquipo`, así ningún llamador cambia.
//
// Puro y sin RNG.

// El nivel del jugador corrido por meta, el campeón que va a terminar jugando,
// la sinergia del roster y la jerarquía — sin el ruido gaussiano y sin clamp
// (lo aplica `calcularRendimiento` una sola vez, después de sumar el ruido).
export function rendimientoBase(state) {
  const r = BALANCE.rendimiento;
  const base = nivelDelJugador(state);

  const campeon = state.player.championPool.find((c) => c.name === state.player.campeonDelSplit);
  const factorCampeon = factorDeCampeon(campeon, state.meta.weights);
  const factorSinergia = 1 + (state.career.sinergia / BALANCE.stats.max - 0.5) * r.sinergiaPesoEnRendimiento * 2;
  const factorJerarquia = 1 + (state.career.jerarquia / BALANCE.stats.max - 0.5) * r.jerarquiaPesoEnRendimiento * 2;

  return base
    * multiplicadorDeMeta(state.meta.ajuste)
    * factorCampeon
    * factorSinergia
    * factorJerarquia;
}

// El equipo es sus compañeros más vos. Cuanto más peso tenés en el resultado,
// más te sube y te baja la jerarquía lo que pase. Se movió tal cual desde
// `systems/rendimiento.js` (la fase 4 la reusaba mapa a mapa; ahora también la
// mira el draft de 9Rd).
export function fuerzaDelEquipo(state, rendimiento) {
  const r = BALANCE.rendimiento;
  const nivelCompaneros = state.career.companeros.reduce((suma, c) => suma + c.nivel, 0)
    / Math.max(1, state.career.companeros.length);

  const bruto = nivelCompaneros * (1 - r.pesoJugadorEnEquipo) + rendimiento * r.pesoJugadorEnEquipo;
  return bruto * (1 + (state.career.sinergia / BALANCE.stats.max - 0.5) * r.sinergiaPesoEnRendimiento);
}
