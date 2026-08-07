import { gauss, roll, chance } from './rng.js';
import { crearLog } from './log.js';
import { BALANCE } from '../data/balance.js';
import { aplicar as aplicarEtapaAmateur } from '../systems/amateur.js';
import { aplicar as aplicarMeta } from '../systems/meta.js';
import { aplicar as aplicarEventos, elegirEvento, resolverOpcion as resolverOpcionEvento, elegirEventoCierre } from '../systems/events.js';
import { aplicar as aplicarInicioEdad } from '../systems/edadInicio.js';
import { aplicar as aplicarCierreEdad, esCierreDeEdad, prepararCierre } from '../systems/edadCierre.js';

export const ETAPAS_SPLIT = [
  'aplicarInicioEdad',
  'aplicarEtapaAmateur',
  'aplicarMeta',
  'aplicarEventos',
  'aplicarSplitBase',
  'aplicarCierreEdad'
];

export function avanzarSplit(state, rng) {
  if (state.terminado) {
    return { state, logs: [] };
  }

  let nextState = state;
  const logs = [];

  for (const etapa of ETAPAS_SPLIT) {
    let stageResult;

    if (etapa === 'aplicarInicioEdad') {
      stageResult = aplicarInicioEdad(nextState, rng);
    } else if (etapa === 'aplicarEtapaAmateur') {
      stageResult = aplicarEtapaAmateur(nextState, rng);
    } else if (etapa === 'aplicarMeta') {
      stageResult = aplicarMeta(nextState, rng);
    } else if (etapa === 'aplicarEventos') {
      stageResult = aplicarEventos(nextState, rng);
    } else if (etapa === 'aplicarSplitBase') {
      stageResult = aplicarSplitBase(nextState, rng);
    } else if (etapa === 'aplicarCierreEdad') {
      stageResult = aplicarCierreEdad(nextState, rng);
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

function finalizarSplit(estadoConLogsViejos, nextState, logsNuevos) {
  const mergedLogs = [...estadoConLogsViejos.logs, ...logsNuevos];
  return { state: { ...nextState, logs: mergedLogs }, logs: logsNuevos, pendingDecision: null };
}

export function avanzarSplitHastaDecision(state, rng) {
  if (state.terminado) {
    return { state, logs: [], pendingDecision: null };
  }

  let nextState = state;
  const logs = [];

  const rInicioEdad = aplicarInicioEdad(nextState, rng);
  nextState = rInicioEdad.state;
  logs.push(...rInicioEdad.logs);

  const rAmateur = aplicarEtapaAmateur(nextState, rng);
  nextState = rAmateur.state;
  logs.push(...rAmateur.logs);

  if (nextState.terminado) {
    return finalizarSplit(state, nextState, logs);
  }

  const rMeta = aplicarMeta(nextState, rng);
  nextState = rMeta.state;
  logs.push(...rMeta.logs);

  const primerEvento = elegirEvento(nextState, rng);

  if (primerEvento) {
    return { state: nextState, logs, pendingDecision: { tipo: 'normal', slot: 1, evento: primerEvento } };
  }

  const logsSinDecision = [...logs, crearLog('event', 'Un split tranquilo, sin eventos destacados.')];
  return cerrarSplit(state, nextState, logsSinDecision, rng);
}

function intentarSegundaDecision(estadoOriginal, nextState, logs, excluirId, rng) {
  if (chance(BALANCE.edad.probSegundaDecision, rng)) {
    const segundoEvento = elegirEvento(nextState, rng, { excluirId });
    if (segundoEvento) {
      return { state: nextState, logs, pendingDecision: { tipo: 'normal', slot: 2, evento: segundoEvento } };
    }
  }

  return cerrarSplit(estadoOriginal, nextState, logs, rng);
}

function cerrarSplit(estadoOriginal, nextState, logs, rng) {
  const rSplit = aplicarSplitBase(nextState, rng);
  nextState = rSplit.state;
  logs.push(...rSplit.logs);

  if (esCierreDeEdad(nextState)) {
    const rCierre = prepararCierre(nextState);
    nextState = rCierre.state;
    logs.push(...rCierre.logs);

    const eventoCierre = elegirEventoCierre(nextState, rng);
    if (eventoCierre) {
      return { state: nextState, logs, pendingDecision: { tipo: 'cierre', evento: eventoCierre } };
    }
  }

  return finalizarSplit(estadoOriginal, nextState, logs);
}

export function resolverDecisionYContinuar(state, logsPendientes, pendingDecision, opcionId, rng) {
  const { evento, tipo, slot } = pendingDecision;
  const rEventos = resolverOpcionEvento(state, evento, opcionId, rng);
  let nextState = rEventos.state;
  const logs = [...logsPendientes, ...rEventos.logs];

  if (nextState.terminado) {
    return finalizarSplit(state, nextState, logs);
  }

  if (tipo === 'normal' && slot === 1) {
    return intentarSegundaDecision(state, nextState, logs, evento.id, rng);
  }

  if (tipo === 'normal' && slot === 2) {
    return cerrarSplit(state, nextState, logs, rng);
  }

  return finalizarSplit(state, nextState, logs);
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
