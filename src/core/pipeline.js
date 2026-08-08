import { BALANCE } from '../data/balance.js';
import { ETAPAS_SPLIT, sistemaPorId } from '../systems/registro.js';

export { ETAPAS_SPLIT };

function acumularLogs(state, logsNuevos) {
  if (logsNuevos.length === 0) {
    return state;
  }
  return { ...state, logs: [...state.logs, ...logsNuevos] };
}

function pausar(state, sistema, decision) {
  return { ...state, pendiente: { sistemaId: sistema.id, decision } };
}

// El cursor de reanudacion se resuelve por id, no por indice: agregar un sistema
// al registro corre todos los indices y corromperia cualquier partida guardada
// a mitad de split.
function etapaDe(sistemaId) {
  const etapa = ETAPAS_SPLIT.findIndex((sistema) => sistema.id === sistemaId);
  if (etapa < 0) {
    throw new Error(`Sistema desconocido en el registro: ${sistemaId}`);
  }
  return etapa;
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
      return { state: pausar(nextState, sistema, resultado.decision), logs };
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

  const { sistemaId, decision } = state.pendiente;
  const sistema = sistemaPorId(sistemaId);
  const resultado = sistema.resolver(state, decision, respuesta, rng);

  let nextState = acumularLogs(resultado.state, resultado.logs);
  const logs = [...resultado.logs];

  // El sistema encadena otra decision sin salir de su etapa.
  if (resultado.decision) {
    return { state: pausar(nextState, sistema, resultado.decision), logs };
  }

  nextState = { ...nextState, pendiente: null };

  if (nextState.terminado) {
    return { state: nextState, logs };
  }

  const continuacion = correrEtapas(nextState, etapaDe(sistemaId) + 1, rng);
  return { state: continuacion.state, logs: [...logs, ...continuacion.logs] };
}

// El criterio por defecto: cada sistema contesta sus propias decisiones.
function respuestaPorDefecto(sistema, state, decision, rng) {
  return sistema.resolverAuto(state, decision, rng);
}

// Camino headless: exactamente el mismo pipeline que corre el navegador, con un
// `responder` que contesta en lugar de una persona. simulate.js le inyecta
// estrategias distintas para medir el espacio de decisiones, no un solo punto.
export function avanzarSplitAuto(state, rng, responder = respuestaPorDefecto) {
  let resultado = avanzarSplit(state, rng);
  const logs = [...resultado.logs];

  let decisiones = 0;
  while (resultado.state.pendiente) {
    if (decisiones >= BALANCE.partida.maxDecisionesPorSplit) {
      throw new Error(`El split encadenó más de ${BALANCE.partida.maxDecisionesPorSplit} decisiones sin cerrar.`);
    }

    const { sistemaId, decision } = resultado.state.pendiente;
    const sistema = sistemaPorId(sistemaId);
    const respuesta = responder(sistema, resultado.state, decision, rng);

    resultado = resolverDecision(resultado.state, respuesta, rng);
    logs.push(...resultado.logs);
    decisiones += 1;
  }

  return { state: resultado.state, logs };
}
