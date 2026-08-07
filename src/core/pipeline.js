import { BALANCE } from '../data/balance.js';
import { ETAPAS_SPLIT, sistemaPorId } from '../systems/registro.js';

export { ETAPAS_SPLIT };

function acumularLogs(state, logsNuevos) {
  if (logsNuevos.length === 0) {
    return state;
  }
  return { ...state, logs: [...state.logs, ...logsNuevos] };
}

function pausar(state, sistema, etapa, decision) {
  return { ...state, pendiente: { sistemaId: sistema.id, etapa, decision } };
}

// Corre las etapas del split desde `desdeEtapa`. Si un sistema devuelve una
// decision, el split se congela ahi: el cursor queda guardado en state.pendiente
// y no hace falta ningun estado auxiliar afuera (regla invariable 9).
function correrEtapas(state, desdeEtapa, rng) {
  let nextState = state;
  const logs = [];

  for (let etapa = desdeEtapa; etapa < ETAPAS_SPLIT.length; etapa += 1) {
    const sistema = ETAPAS_SPLIT[etapa];
    const resultado = sistema.aplicar(nextState, rng);

    nextState = acumularLogs(resultado.state, resultado.logs);
    logs.push(...resultado.logs);

    if (resultado.decision) {
      return { state: pausar(nextState, sistema, etapa, resultado.decision), logs };
    }

    if (nextState.terminado) {
      break;
    }
  }

  return { state: { ...nextState, pendiente: null }, logs };
}

export function avanzarSplit(state, rng) {
  if (state.terminado || state.pendiente) {
    return { state, logs: [] };
  }
  return correrEtapas(state, 0, rng);
}

export function resolverDecision(state, respuesta, rng) {
  if (!state.pendiente) {
    return { state, logs: [] };
  }

  const { sistemaId, etapa, decision } = state.pendiente;
  const sistema = sistemaPorId(sistemaId);
  const resultado = sistema.resolver(state, decision, respuesta, rng);

  let nextState = acumularLogs(resultado.state, resultado.logs);
  const logs = [...resultado.logs];

  // El sistema encadena otra decision sin salir de su etapa.
  if (resultado.decision) {
    return { state: pausar(nextState, sistema, etapa, resultado.decision), logs };
  }

  nextState = { ...nextState, pendiente: null };

  if (nextState.terminado) {
    return { state: nextState, logs };
  }

  const continuacion = correrEtapas(nextState, etapa + 1, rng);
  return { state: continuacion.state, logs: [...logs, ...continuacion.logs] };
}

// Camino headless: identico al interactivo, pero cada decision la contesta el
// propio sistema. simulate.js y validate.js miden exactamente lo que se juega.
export function avanzarSplitAuto(state, rng) {
  let resultado = avanzarSplit(state, rng);
  const logs = [...resultado.logs];

  let decisiones = 0;
  while (resultado.state.pendiente) {
    if (decisiones >= BALANCE.partida.maxDecisionesPorSplit) {
      throw new Error(`El split encadenó más de ${BALANCE.partida.maxDecisionesPorSplit} decisiones sin cerrar.`);
    }

    const { sistemaId, decision } = resultado.state.pendiente;
    const respuesta = sistemaPorId(sistemaId).resolverAuto(resultado.state, decision, rng);

    resultado = resolverDecision(resultado.state, respuesta, rng);
    logs.push(...resultado.logs);
    decisiones += 1;
  }

  return { state: resultado.state, logs };
}
