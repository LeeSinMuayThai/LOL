import { roll } from '../core/rng.js';

export function aplicar(state, rng) {
  const gain = roll(2, 5, rng);
  return {
    state: {
      ...state,
      player: {
        ...state.player,
        stats: {
          ...state.player.stats,
          macro: Math.min(100, state.player.stats.macro + 1),
          mecanica: Math.min(100, state.player.stats.mecanica + gain)
        }
      }
    },
    logs: [{ type: 'attributes', message: `Progresión de atributos: +${gain} mecánica, +1 macro.` }]
  };
}
