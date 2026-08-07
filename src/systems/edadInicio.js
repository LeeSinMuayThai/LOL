import { getPath } from '../core/selectors.js';
import { BALANCE } from '../data/balance.js';

export const id = 'edadInicio';

export const CAMPOS_EDAD = [
  'player.soloqElo',
  'player.sleep',
  'player.studies',
  'player.familyTrust',
  'player.stats.mecanica',
  'player.stats.mentalidad',
  'player.stats.hype'
];

export function tomarSnapshotEdad(state) {
  return Object.fromEntries(CAMPOS_EDAD.map((path) => [path, getPath(state, path)]));
}

export function aplicar(state, rng) {
  if (state.player.splitCount % BALANCE.edad.splitsPorEdad !== 0) {
    return { state, logs: [] };
  }

  return {
    state: {
      ...state,
      flags: { ...state.flags, edadSnapshot: tomarSnapshotEdad(state) }
    },
    logs: []
  };
}
