import { BALANCE } from '../data/balance.js';
import { gauss, chance } from '../core/rng.js';
import { clamp } from '../core/numeros.js';
import { metaDominante } from '../core/selectors.js';
import { etiquetaArquetipo } from '../data/meta-tags.js';
import { crearLog } from '../core/log.js';

export const id = 'meta';

// Cada split es un parche. Casi siempre el meta se mueve poco: reacomoda pesos
// entre arquetipos sin volantazos. Cada tanto se sacude entero, y ahi es donde
// un pool angosto se queda sin nada que jugar.
function moverPesos(state, delta, rng) {
  const { pesoMinimo, pesoMaximo, derivaMedia } = BALANCE.meta;

  return Object.fromEntries(
    Object.entries(state.meta.weights).map(([tag, peso]) => [
      tag,
      clamp(peso + gauss(derivaMedia, delta, rng), pesoMinimo, pesoMaximo)
    ])
  );
}

export function aplicar(state, rng) {
  const { probSacudon, sacudonDelta, maxDelta } = BALANCE.meta;
  const sacudon = chance(probSacudon, rng);

  const weights = moverPesos(state, sacudon ? sacudonDelta : maxDelta, rng);
  const nextState = { ...state, meta: { ...state.meta, patch: state.meta.patch + 1, weights } };

  return {
    state: nextState,
    logs: [crearLog(
      'meta',
      sacudon
        ? `Parche ${nextState.meta.patch}: volantazo de balance. El meta se dio vuelta y ahora manda ${etiquetaArquetipo(metaDominante(nextState))}.`
        : `Parche ${nextState.meta.patch}: el meta se mueve despacio hacia ${etiquetaArquetipo(metaDominante(nextState))}.`
    )]
  };
}
