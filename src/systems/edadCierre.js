import { getPath, etiquetaCampo } from '../core/selectors.js';
import { crearLog } from '../core/log.js';
import { BALANCE } from '../data/balance.js';
import { CAMPOS_EDAD } from './edadInicio.js';
import { elegirEventoCierre, resolverOpcion, elegirOpcionAutomatica, decisionDesdeEvento } from './events.js';

export const id = 'edadCierre';

function generarTextoResumen(state) {
  const snapshot = state.flags.edadSnapshot ?? {};
  const cambios = CAMPOS_EDAD.map((path) => {
    const antes = snapshot[path] ?? getPath(state, path);
    const despues = getPath(state, path);
    return { path, delta: despues - antes };
  }).filter(({ delta }) => delta !== 0);

  if (cambios.length === 0) {
    return `Fin de temporada a los ${state.age} años: un año tranquilo, sin cambios grandes.`;
  }

  const texto = cambios
    .map(({ path, delta }) => `${etiquetaCampo(path)} ${delta >= 0 ? '+' : ''}${delta}`)
    .join(', ');

  return `Fin de temporada a los ${state.age} años: ${texto}.`;
}

export function esCierreDeEdad(state) {
  return state.player.splitCount % BALANCE.edad.splitsPorEdad === 0;
}

export function aplicar(state, rng) {
  if (!esCierreDeEdad(state)) {
    return { state, logs: [] };
  }

  const logs = [crearLog('edad', generarTextoResumen(state))];
  const nextState = { ...state, age: state.age + 1 };

  const evento = elegirEventoCierre(nextState, rng);
  if (!evento) {
    return { state: nextState, logs };
  }

  return {
    state: nextState,
    logs,
    decision: decisionDesdeEvento(evento, { contexto: 'cierre', slot: 1 })
  };
}

// La decision de cierre es LA decision de la edad: nunca encadena una segunda.
export function resolver(state, decision, respuesta, rng) {
  return resolverOpcion(state, decision.datos.evento, respuesta.opcionId, rng);
}

export function resolverAuto(state, decision, rng) {
  return elegirOpcionAutomatica(decision, rng);
}
