import { roll, weightedPick, chance } from '../core/rng.js';
import { getPath, setPath, cumpleCondiciones, etiquetaCampo } from '../core/selectors.js';
import { crearLog } from '../core/log.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';

export const id = 'eventos';

function cooldownActivo(state, eventId) {
  return (state.flags.cooldowns?.[eventId] ?? 0) > 0;
}

function candidatos(state) {
  return TODOS_LOS_EVENTOS.filter(
    (event) => !event.cierreDeEdad && !cooldownActivo(state, event.id) && cumpleCondiciones(state, event.conditions)
  );
}

function aplicarEfecto(state, effect, rng) {
  if (effect.type === 'push') {
    const lista = getPath(state, effect.path) ?? [];
    const valor = weightedPick(effect.values, () => 1, rng);
    return {
      state: setPath(state, effect.path, [...lista, valor]),
      descripcion: `${etiquetaCampo(effect.path)}: se suma "${valor}"`
    };
  }

  const antes = getPath(state, effect.path) ?? 0;
  let despues = antes + roll(effect.min, effect.max, rng);
  if (effect.clamp) {
    const [min, max] = effect.clamp;
    despues = Math.min(max, Math.max(min, despues));
  }
  const deltaEfectivo = despues - antes;
  const signo = deltaEfectivo >= 0 ? '+' : '';

  return {
    state: setPath(state, effect.path, despues),
    descripcion: `${etiquetaCampo(effect.path)} ${signo}${deltaEfectivo}`
  };
}

function actualizarCooldowns(state, eventoElegido) {
  const cooldownsPrevios = state.flags.cooldowns ?? {};
  const cooldowns = Object.fromEntries(
    Object.entries(cooldownsPrevios).map(([eventId, restante]) => [eventId, Math.max(0, restante - 1)])
  );

  if (eventoElegido?.cooldown) {
    cooldowns[eventoElegido.id] = eventoElegido.cooldown;
  }

  return { ...state, flags: { ...state.flags, cooldowns } };
}

export function elegirEvento(state, rng, { excluirId } = {}) {
  const disponibles = candidatos(state).filter((event) => event.id !== excluirId);
  if (disponibles.length === 0) {
    return null;
  }
  return weightedPick(disponibles, (event) => event.weight, rng);
}

export function elegirEventoCierre(state, rng) {
  const disponibles = TODOS_LOS_EVENTOS.filter(
    (event) => event.cierreDeEdad && !cooldownActivo(state, event.id) && cumpleCondiciones(state, event.conditions)
  );
  if (disponibles.length === 0) {
    return null;
  }
  return weightedPick(disponibles, (event) => event.weight, rng);
}

export function resolverOpcion(state, evento, opcionId, rng) {
  const opcion = evento.options.find((option) => option.id === opcionId) ?? evento.options[0];
  const outcome = weightedPick(opcion.outcomes, (out) => out.weight, rng);

  const descripciones = [];
  const nextState = outcome.effects.reduce((acc, effect) => {
    const { state: siguiente, descripcion } = aplicarEfecto(acc, effect, rng);
    descripciones.push(descripcion);
    return siguiente;
  }, state);

  const resumenEfectos = descripciones.length > 0 ? descripciones.join(', ') : 'sin cambios';

  return {
    state: actualizarCooldowns(nextState, evento),
    logs: [crearLog('event', `${evento.title} — ${opcion.label}: ${resumenEfectos}.`)]
  };
}

// Toda decision, venga de un evento o de un sistema, se presenta igual: titulo,
// descripcion y una lista de opciones. La UI tiene un solo camino de render.
export function decisionDesdeEvento(evento, { contexto, slot }) {
  return {
    tipo: 'opciones',
    titulo: contexto === 'cierre' ? `${evento.title} (fin de temporada)` : evento.title,
    descripcion: evento.description,
    opciones: evento.options.map((option) => ({ id: option.id, label: option.label })),
    contexto,
    slot,
    datos: { evento }
  };
}

// Elige una opcion sola cuando no hay nadie mirando (simulacion masiva).
// Respeta los pesos declarados, asi el camino headless mide lo mismo que juega
// una persona con criterio promedio.
export function elegirOpcionAutomatica(decision, rng) {
  const opcion = weightedPick(decision.datos.evento.options, (option) => option.weight, rng);
  return { opcionId: opcion.id };
}

export function aplicar(state, rng) {
  const evento = elegirEvento(state, rng);

  if (!evento) {
    return {
      state: actualizarCooldowns(state, null),
      logs: [crearLog('event', 'Un split tranquilo, sin eventos destacados.')]
    };
  }

  return {
    state,
    logs: [],
    decision: decisionDesdeEvento(evento, { contexto: 'normal', slot: 1 })
  };
}

export function resolver(state, decision, respuesta, rng) {
  const { evento } = decision.datos;
  const { state: nextState, logs } = resolverOpcion(state, evento, respuesta.opcionId, rng);

  if (nextState.terminado) {
    return { state: nextState, logs };
  }

  // A veces la vida se amontona: un segundo evento antes de que cierre el split.
  if (decision.slot === 1 && chance(BALANCE.edad.probSegundaDecision, rng)) {
    const segundoEvento = elegirEvento(nextState, rng, { excluirId: evento.id });
    if (segundoEvento) {
      return {
        state: nextState,
        logs,
        decision: decisionDesdeEvento(segundoEvento, { contexto: 'normal', slot: 2 })
      };
    }
  }

  return { state: nextState, logs };
}

export function resolverAuto(state, decision, rng) {
  return elegirOpcionAutomatica(decision, rng);
}
