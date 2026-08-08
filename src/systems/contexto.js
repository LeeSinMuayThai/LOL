import { calcularContexto, describirContexto } from '../core/contexto.js';
import { crearLog } from '../core/log.js';

export const id = 'contexto';

// Va primero del registro: recalcula donde estas parado antes de que ningun
// otro sistema decida nada. No consume RNG, asi que agregarlo no movio el
// balance de nada de lo que ya estaba construido.
export function aplicar(state, rng) {
  const contexto = calcularContexto(state);

  // Solo se loguea cuando cambia el momento: es una transicion de la carrera
  // ("pasaste de ser uno mas del roster a referente del vestuario"), no ruido
  // de cada split.
  const cambio = contexto.momento !== state.contexto?.momento;

  return {
    state: { ...state, contexto },
    logs: cambio && state.contexto ? [crearLog('contexto', `${describirContexto(contexto)}.`)] : []
  };
}
