import { BALANCE } from '../data/balance.js';
import { ETAPAS_SPLIT, sistemaPorId } from '../systems/registro.js';
import { componerLegado } from './legado.js';

export { ETAPAS_SPLIT };

function acumularLogs(state, logsNuevos) {
  if (logsNuevos.length === 0) {
    return state;
  }
  return { ...state, logs: [...state.logs, ...logsNuevos] };
}

// Fase 10a: `phase: 'retirado'` corta el resto de `ETAPAS_SPLIT` tanto si es
// terminal (`terminado: true`, los finales de siempre) como si es la ventana
// de vuelta reversible (`terminado: false`, `systems/retiro.js`) — ninguno de
// los dos casos tiene nada que hacer en el resto del registro (campeones,
// temporada, eventos...) ese split. Sin esto, un retiro reversible seguía
// jugando splits de verdad durante la ventana.
function splitTerminaAca(state) {
  return state.terminado || state.phase === 'retirado';
}

// Fase 9R5b: en cuanto una carrera termina —por retiro, burnout, o cualquiera
// de los finales de la etapa amateur— se compone la tarjeta de legado una sola
// vez. `componerLegado` es puro; esto es el único lugar por el que pasa toda
// carrera al cerrar (`correrEtapas` corta el bucle en `terminado`, así que un
// "sistema final" nunca correría).
function conTarjeta(resultado) {
  if (resultado.state.terminado && !resultado.state.tarjeta) {
    return { ...resultado, state: { ...resultado.state, tarjeta: componerLegado(resultado.state) } };
  }
  return resultado;
}

// Fase 9Rf: toda pausa —venga del sistema que venga— descuenta una
// interrupción del cupo del split (`systems/presupuesto.js` lo fijó al
// arrancar). Es el único choke point: `correrEtapas` y `resolverDecision`
// pausan por acá. `events.js` es el único que consulta el saldo antes de
// frenar; el resto (mercado, cierre de edad, serie) igual descuenta.
function pausar(state, sistema, decision) {
  const p = state.presupuesto ?? { total: BALANCE.partida.maxDecisionesPorSplit, gastadas: 0 };
  return {
    ...state,
    pendiente: { sistemaId: sistema.id, decision },
    presupuesto: { ...p, gastadas: p.gastadas + 1 }
  };
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

    if (splitTerminaAca(nextState)) {
      break;
    }
  }

  return { state: { ...nextState, pendiente: null }, logs };
}

export function avanzarSplit(state, rng) {
  if (state.terminado || state.pendiente) {
    return { state, logs: [] };
  }
  // Fase 10a: si el split ARRANCA con `phase: 'retirado'` (la ventana de
  // vuelta, ya veníamos así del split anterior), `splitTerminaAca` cortaría
  // el registro en la primerísima etapa (`presupuesto`, que no toca `phase`)
  // sin llegar nunca a `retiro.js` — el único sistema que tiene algo que
  // hacer acá. Se arranca directo en su índice.
  if (state.phase === 'retirado') {
    return conTarjeta(correrEtapas(state, etapaDe('retiro'), rng));
  }
  return conTarjeta(correrEtapas(state, 0, rng));
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

  if (splitTerminaAca(nextState)) {
    return conTarjeta({ state: nextState, logs });
  }

  const continuacion = conTarjeta(correrEtapas(nextState, etapaDe(sistemaId) + 1, rng));
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
