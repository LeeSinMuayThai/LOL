import { BALANCE } from '../data/balance.js';
import { gauss } from '../core/rng.js';
import { metaDominante } from '../core/selectors.js';
import { crearLog } from '../core/log.js';

export const id = 'meta';

export function aplicar(state, rng) {
  const { pesoMinimo, derivaMedia, maxDelta } = BALANCE.meta;
  const weights = Object.fromEntries(
    Object.entries(state.meta.weights).map(([tag, peso]) => [
      tag,
      Math.max(pesoMinimo, peso + gauss(derivaMedia, maxDelta, rng))
    ])
  );

  const nextState = {
    ...state,
    meta: {
      patch: state.meta.patch + 1,
      weights
    }
  };

  return {
    state: nextState,
    logs: [crearLog('meta', `Parche ${nextState.meta.patch}: el meta se movió hacia ${metaDominante(nextState)}.`)]
  };
}
