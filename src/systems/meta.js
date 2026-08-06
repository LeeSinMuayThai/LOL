import { BALANCE } from '../data/balance.js';
import { gauss } from '../core/rng.js';

export function aplicar(state, rng) {
  const weights = Object.fromEntries(
    Object.entries(state.meta.weights).map(([key, value]) => [key, Math.max(0.5, value + gauss(0, BALANCE.meta.maxDelta, rng))])
  );

  return {
    state: {
      ...state,
      meta: {
        patch: state.meta.patch + 1,
        weights
      }
    },
    logs: [{ type: 'meta', message: `Parche ${state.meta.patch + 1}: el meta se movió hacia ${Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0]}.` }]
  };
}
