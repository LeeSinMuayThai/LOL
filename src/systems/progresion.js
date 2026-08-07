import { gauss, roll } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { metaDominante } from '../core/selectors.js';
import { BALANCE } from '../data/balance.js';

export const id = 'progresion';

// Cuanto favorece el meta actual al progreso del split. Es un proxy provisorio:
// lo reemplaza el Ajuste al Meta real cuando exista champions.js.
function multiplicadorDeMeta(state) {
  const { metaInfluenceBase, metaInfluenceRange } = BALANCE.split;
  const pesoDominante = state.meta.weights[metaDominante(state)];
  const intensidad = clamp(pesoDominante / BALANCE.meta.pesoDominante, 0, 1);
  return metaInfluenceBase + intensidad * metaInfluenceRange;
}

export function aplicar(state, rng) {
  const { split } = BALANCE;

  const bruto = roll(split.baseGain, split.maxGain, rng) * multiplicadorDeMeta(state);
  const gain = Math.max(split.gananciaMinima, Math.round(bruto));
  const mentalidadGain = Math.max(
    split.mentalidadMinima,
    Math.round(gauss(split.mentalidadGain, split.mentalidadSpread, rng))
  );

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        stats: {
          ...state.player.stats,
          mecanica: clampStat(state.player.stats.mecanica + gain),
          mentalidad: clampStat(state.player.stats.mentalidad + mentalidadGain)
        },
        splitCount: state.player.splitCount + 1
      },
      career: {
        ...state.career,
        currentSplit: state.career.currentSplit + 1
      }
    },
    logs: [crearLog('split', `Split ${state.career.currentSplit}: progresaste ${gain} de mecánica y ${mentalidadGain} de mentalidad.`)]
  };
}
