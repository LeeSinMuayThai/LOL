import { BALANCE } from '../data/balance.js';
import { gauss } from '../core/rng.js';
import { metaDominante } from '../core/selectors.js';
import { crearLog } from '../core/log.js';

export function aplicar(state, rng) {
  const weights = Object.fromEntries(
    Object.entries(state.meta.weights).map(([key, value]) => [key, Math.max(0.5, value + gauss(0, BALANCE.meta.maxDelta, rng))])
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
