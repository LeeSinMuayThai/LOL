import { BALANCE } from '../data/balance.js';
import { elegirEventoCierre, resolverOpcion, elegirOpcionAutomatica, decisionDesdeEvento } from './events.js';

export const id = 'edadCierre';

export function esCierreDeEdad(state) {
  return state.player.splitCount % BALANCE.edad.splitsPorEdad === 0;
}

// El resumen del año (nota, titular, viñetas) lo emite `systems/resumenAnio.js`,
// más abajo en `ETAPAS_SPLIT` — necesita `mundo.escenaAnual`/`archirrival` de
// ESTE año, que `escena`/`rivales` todavía no escribieron en este punto del
// split. Acá solo se incrementa la edad y se dispara, si hay, la decisión que
// cierra el año.
export function aplicar(state, rng) {
  if (!esCierreDeEdad(state)) {
    return { state, logs: [] };
  }

  const nextState = { ...state, age: state.age + 1 };

  const evento = elegirEventoCierre(nextState, rng);
  if (!evento) {
    return { state: nextState, logs: [] };
  }

  return {
    state: nextState,
    logs: [],
    decision: decisionDesdeEvento(nextState, evento, { franja: 'cierre', slot: 1 })
  };
}

// La decision de cierre es LA decision de la edad: nunca encadena una segunda.
export function resolver(state, decision, respuesta, rng) {
  return resolverOpcion(state, decision.datos.evento, respuesta.opcionId, rng);
}

export function resolverAuto(state, decision, rng) {
  return elegirOpcionAutomatica(state, decision, rng);
}
