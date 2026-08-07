import { roll, weightedPick, chance } from '../core/rng.js';
import { getPath, setPath, cumpleCondiciones } from '../core/selectors.js';
import { crearLog } from '../core/log.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';

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
    return setPath(state, effect.path, [...lista, effect.value]);
  }

  let value = (getPath(state, effect.path) ?? 0) + roll(effect.min, effect.max, rng);
  if (effect.clamp) {
    const [min, max] = effect.clamp;
    value = Math.min(max, Math.max(min, value));
  }
  return setPath(state, effect.path, value);
}

function actualizarCooldowns(state, eventoElegido) {
  const cooldownsPrevios = state.flags.cooldowns ?? {};
  const cooldowns = Object.fromEntries(
    Object.entries(cooldownsPrevios).map(([id, restante]) => [id, Math.max(0, restante - 1)])
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

  const nextState = outcome.effects.reduce((acc, effect) => aplicarEfecto(acc, effect, rng), state);

  return {
    state: actualizarCooldowns(nextState, evento),
    logs: [crearLog('event', `${evento.title}: ${evento.description} (elegiste "${opcion.label}")`)]
  };
}

export function resolverEventoAutomatico(state, evento, rng) {
  const opcion = weightedPick(evento.options, (option) => option.weight, rng);
  return resolverOpcion(state, evento, opcion.id, rng);
}

export function aplicar(state, rng) {
  const primerEvento = elegirEvento(state, rng);

  if (!primerEvento) {
    return {
      state: actualizarCooldowns(state, null),
      logs: [crearLog('event', 'Un split tranquilo, sin eventos destacados.')]
    };
  }

  const r1 = resolverEventoAutomatico(state, primerEvento, rng);
  let nextState = r1.state;
  const logs = [...r1.logs];

  if (chance(BALANCE.edad.probSegundaDecision, rng)) {
    const segundoEvento = elegirEvento(nextState, rng, { excluirId: primerEvento.id });
    if (segundoEvento) {
      const r2 = resolverEventoAutomatico(nextState, segundoEvento, rng);
      nextState = r2.state;
      logs.push(...r2.logs);
    }
  }

  return { state: nextState, logs };
}
