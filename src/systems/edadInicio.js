import { getPath } from '../core/selectors.js';
import { BALANCE } from '../data/balance.js';

export const CAMPOS_EDAD = [
  { path: 'player.soloqElo', label: 'SoloQ LP' },
  { path: 'player.sleep', label: 'Sueño' },
  { path: 'player.studies', label: 'Estudios' },
  { path: 'player.familyTrust', label: 'Confianza familiar' },
  { path: 'player.stats.mecanica', label: 'Mecánica' },
  { path: 'player.stats.mentalidad', label: 'Mentalidad' },
  { path: 'player.stats.hype', label: 'Hype' }
];

export function tomarSnapshotEdad(state) {
  return Object.fromEntries(CAMPOS_EDAD.map(({ path }) => [path, getPath(state, path)]));
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
