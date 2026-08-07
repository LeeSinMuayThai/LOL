import { getPath } from '../core/selectors.js';
import { crearLog } from '../core/log.js';
import { BALANCE } from '../data/balance.js';
import { CAMPOS_EDAD } from './edadInicio.js';
import { elegirEventoCierre, resolverEventoAutomatico } from './events.js';

function generarTextoResumen(state) {
  const snapshot = state.flags.edadSnapshot ?? {};
  const cambios = CAMPOS_EDAD.map(({ path, label }) => {
    const antes = snapshot[path] ?? getPath(state, path);
    const despues = getPath(state, path);
    const delta = despues - antes;
    const signo = delta >= 0 ? '+' : '';
    return `${label} ${signo}${delta}`;
  }).join(', ');

  return `Fin de temporada a los ${state.age} años: ${cambios}.`;
}

export function esCierreDeEdad(state) {
  return state.player.splitCount % BALANCE.edad.splitsPorEdad === 0;
}

export function prepararCierre(state) {
  const texto = generarTextoResumen(state);
  const nextState = { ...state, age: state.age + 1 };
  return { state: nextState, logs: [crearLog('edad', texto)] };
}

export function aplicar(state, rng) {
  if (!esCierreDeEdad(state)) {
    return { state, logs: [] };
  }

  const { state: nextStateBase, logs } = prepararCierre(state);
  let nextState = nextStateBase;

  const eventoCierre = elegirEventoCierre(nextState, rng);
  if (eventoCierre) {
    const rCierre = resolverEventoAutomatico(nextState, eventoCierre, rng);
    nextState = rCierre.state;
    logs.push(...rCierre.logs);
  }

  return { state: nextState, logs };
}
