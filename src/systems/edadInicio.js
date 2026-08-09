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

// El año calendario (fase 8, PLAN.md §8.2): no existía. `anio` sale de
// `splitCount`, así que se recalcula cada split (no solo al cerrar la edad) —
// es barato y determinista, no consume rng. Desbloquea trofeos fechados y la
// tarjeta final ("2026-2035").
function calcularCalendario(state) {
  const c = BALANCE.calendario;
  const edadesTranscurridas = Math.floor(state.player.splitCount / BALANCE.edad.splitsPorEdad);
  const anio = c.anioBase + edadesTranscurridas;
  return { anioBase: c.anioBase, anio, temporada: edadesTranscurridas + 1, etiqueta: String(anio) };
}

export function aplicar(state, rng) {
  const conCalendario = { ...state, calendario: calcularCalendario(state) };

  if (state.player.splitCount % BALANCE.edad.splitsPorEdad !== 0) {
    return { state: conCalendario, logs: [] };
  }

  return {
    state: {
      ...conCalendario,
      flags: { ...conCalendario.flags, edadSnapshot: tomarSnapshotEdad(conCalendario) }
    },
    logs: []
  };
}
