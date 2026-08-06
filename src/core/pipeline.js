import { gauss, roll } from './rng.js';
import { crearLog } from './log.js';
import { BALANCE } from '../data/balance.js';
import { aplicar as aplicarEtapaAmateur } from '../systems/amateur.js';
import { aplicar as aplicarMeta } from '../systems/meta.js';
import { aplicar as aplicarEventos } from '../systems/events.js';

export const ETAPAS_SPLIT = ['aplicarEtapaAmateur', 'aplicarMeta', 'aplicarEventos', 'aplicarSplitBase'];

export function avanzarSplit(state, rng) {
  if (state.terminado) {
    return { state, logs: [] };
  }

  let nextState = state;
  const logs = [];

  for (const etapa of ETAPAS_SPLIT) {
    let stageResult;

    if (etapa === 'aplicarEtapaAmateur') {
      stageResult = aplicarEtapaAmateur(nextState, rng);
    } else if (etapa === 'aplicarMeta') {
      stageResult = aplicarMeta(nextState, rng);
    } else if (etapa === 'aplicarEventos') {
      stageResult = aplicarEventos(nextState, rng);
    } else if (etapa === 'aplicarSplitBase') {
      stageResult = aplicarSplitBase(nextState, rng);
    }

    nextState = stageResult.state;
    logs.push(...stageResult.logs);

    if (nextState.terminado) {
      break;
    }
  }

  const mergedLogs = [...state.logs, ...logs];
  return { state: { ...nextState, logs: mergedLogs }, logs };
}

function aplicarSplitBase(state, rng) {
  const { metaInfluenceBase, metaInfluenceRange } = BALANCE.split;
  const metaMultiplier = metaInfluenceBase + ((state.meta?.weights?.early_game ?? 1) / 2) * metaInfluenceRange;
  const gain = Math.max(1, Math.round(roll(BALANCE.split.baseGain, BALANCE.split.maxGain, rng) * metaMultiplier));
  const mentalidadGain = Math.max(0, Math.round(gauss(BALANCE.split.mentalidadGain, BALANCE.split.mentalidadSpread, rng)));

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        stats: {
          ...state.player.stats,
          mecanica: Math.min(100, state.player.stats.mecanica + gain),
          mentalidad: Math.min(100, state.player.stats.mentalidad + mentalidadGain)
        },
        splitCount: state.player.splitCount + 1
      },
      career: {
        ...state.career,
        currentSplit: state.career.currentSplit + 1
      },
      logs: [...state.logs]
    },
    logs: [crearLog('split', `Split ${state.career.currentSplit}: progresaste ${gain} de mecánica y ${mentalidadGain} de mentalidad.`)]
  };
}
