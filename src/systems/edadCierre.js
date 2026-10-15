import { BALANCE } from '../data/balance.js';
import { elegirEventoCierre, resolverOpcion, elegirOpcionAutomatica, decisionDesdeEvento, disponibleEn, opcionesVivas } from './events.js';
import { lineaDePlan } from './practica.js';
import { esPlanValido } from '../core/rutinas.js';
import { getPath, etiquetaCampo, cumpleCondiciones } from '../core/selectors.js';
import { calcularContexto, coincideContexto } from '../core/contexto.js';
import { weightedPick } from '../core/rng.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';

export const id = 'edadCierre';

export function esCierreDeEdad(state) {
  return state.player.splitCount % BALANCE.edad.splitsPorEdad === 0;
}

// El resumen del año (nota, titular, viñetas) lo emite `systems/resumenAnio.js`,
// más abajo en `ETAPAS_SPLIT` — necesita `mundo.escenaAnual`/`archirrival` de
// ESTE año, que `escena`/`rivales` todavía no escribieron en este punto del
// split. Acá solo se incrementa la edad y se dispara, si hay, la decisión que
// cierra el año.
export function aplicar(state, rng) {
  if (!esCierreDeEdad(state)) {
    return { state, logs: [] };
  }

  const nextState = { ...state, age: state.age + 1 };

  const evento = elegirEventoCierre(nextState, rng) ?? cierreSinCooldown(nextState, rng);
  if (!evento) {
    return { state: nextState, logs: [] };
  }

  // G2b (una carta por año): la carta es LA decisión del año y frena siempre, también en la cola (K6b-C2): no gasta la
  // parada del año de `core/cola.js`, que queda para lo demás.
  return { state: nextState, logs: [], decision: decisionDeCierre(nextState, evento) };
}

// G2b: todos los años tienen su carta. Si los cooldowns dejaron sin cierre al año, se sortea entre los de tu contexto sin
// mirar el cooldown; si tu contexto no tiene ninguno (un pro joven sin club: ningún cierre pide `libre` y `joven` a la
// vez), entre los de tu etapa y tu nivel, sin la banda de edad ni las marcas. Solo tira `rng` en esos casos (el stream de
// siempre no cambia).
function cierreSinCooldown(state, rng) {
  const contexto = calcularContexto(state);
  const cierres = TODOS_LOS_EVENTOS.filter((evento) => evento.cierreDeEdad && opcionesVivas(state, evento, contexto).length >= 2);
  const deTuContexto = cierres.filter((evento) => disponibleEn(state, evento, contexto));
  const deTuNivel = cierres.filter((evento) => cumpleCondiciones(state, evento.conditions)
    && coincideContexto(contexto, Object.fromEntries(['etapa', 'nivel'].filter((clave) => evento.contexto?.[clave]).map((clave) => [clave, evento.contexto[clave]])), state.age));
  const disponibles = deTuContexto.length > 0 ? deTuContexto : deTuNivel;
  return disponibles.length > 0 ? weightedPick(disponibles, (evento) => evento.weight, rng) : null;
}

// La pausa del cierre, con la línea del plan en cada opción (si el cierre fija plan). La usa también `core/guardado.js`
// (`migrarDe10`) para rearmar con el texto de hoy un cierre que un guardado viejo dejó parado (regla 15).
export function decisionDeCierre(state, evento) {
  return comoCartaDelAnio(state, evento, conPlanEnCadaOpcion(state, evento, decisionDesdeEvento(state, evento, { franja: 'cierre', slot: 1 })));
}

// --- G2b (PLANUI §0.9, "una carta por año") ---
//
// Cada opción del cierre declara en `carta` su stat principal (uno de `carta.stats`, los cinco de la ficha) y todos sus
// outcomes lo suben. La carta muestra:
// - el número seguro: el piso de ese stat entre todos los outcomes (la regla de F4), con el tope que deja el clamp y el
//   techo de una lesión en la mecánica (`core/curvas.js:conTechoDeLesion`): lo que muestra es lo que el motor aplica como
//   mínimo. Reemplaza al `seguro` genérico de G2a, que podía caer en el LP o en el hype;
// - a veces un costo a la vista: otro de los cinco que todos los outcomes bajan, con lo que seguro te saca;
// - su rareza (rara desde `carta.rarezaDesde`);
// - el color de tu situación (`situacion` de la decisión): la soloQ sin equipo, el bootcamp o la gaming house de tu org.
export function seguroDeCarta(state, opcion) {
  if (!BALANCE.carta.stats.includes(opcion?.carta)) {
    return null;
  }
  const campo = `player.stats.${opcion.carta}`;
  const actual = getPath(state, campo);
  const piso = Math.min(...opcion.outcomes.map((outcome) => sumaDe(outcome, campo, 'min')));
  let valor = typeof actual === 'number' ? Math.min(piso, topeDe(opcion, campo)[1] - actual) : piso;
  const techo = state.player?.techoLesionMecanica;
  if (opcion.carta === 'mecanica' && techo != null && typeof actual === 'number') {
    valor = Math.min(valor, Math.max(0, techo - actual));
  }
  return { campo, etiqueta: etiquetaCampo(campo), valor: Math.max(0, valor), unidad: '' };
}

export function costoDeCarta(state, opcion) {
  const costos = BALANCE.carta.stats.filter((stat) => stat !== opcion?.carta).map((stat) => {
    const campo = `player.stats.${stat}`;
    const actual = getPath(state, campo);
    const seguro = Math.max(...opcion.outcomes.map((outcome) => sumaDe(outcome, campo, 'max')));
    const valor = typeof actual === 'number' ? Math.max(seguro, topeDe(opcion, campo)[0] - actual) : seguro;
    return { campo, etiqueta: etiquetaCampo(campo), valor };
  }).filter((costo) => costo.valor < 0);
  return costos.length > 0 ? costos.reduce((peor, costo) => (costo.valor < peor.valor ? costo : peor)) : null;
}

function sumaDe(outcome, campo, extremo) {
  return outcome.effects.filter((effect) => effect.type === 'stat' && effect.path === campo)
    .reduce((total, effect) => total + (extremo === 'min' ? Math.min(effect.min, effect.max) : Math.max(effect.min, effect.max)), 0);
}

function topeDe(opcion, campo) {
  for (const outcome of opcion.outcomes) {
    const conClamp = outcome.effects.find((effect) => effect.path === campo && effect.clamp);
    if (conClamp) return conClamp.clamp;
  }
  return [-Infinity, Infinity];
}

export function situacionDeLaCarta(state) {
  const org = state.career?.currentOrg ?? null;
  if (!org) {
    return { id: 'soloq', texto: 'Solo en la cola, sin equipo' };
  }
  return state.career.tier === BALANCE.carta.tierGamingHouse
    ? { id: 'gaming_house', texto: `En la gaming house de ${org}` }
    : { id: 'bootcamp', texto: `En el bootcamp de ${org}` };
}

function comoCartaDelAnio(state, evento, decision) {
  const deDato = (opcionId) => evento.options.find((opcion) => opcion.id === opcionId);
  return {
    ...decision,
    situacion: situacionDeLaCarta(state),
    opciones: decision.opciones.map((opcion) => {
      const dato = deDato(opcion.id);
      const seguro = seguroDeCarta(state, dato);
      if (!seguro) {
        return opcion;
      }
      return {
        ...opcion,
        seguro,
        costo: costoDeCarta(state, dato),
        rareza: seguro.valor >= BALANCE.carta.rarezaDesde ? 'rara' : 'comun'
      };
    })
  };
}

// K4c (revisión): en la etapa amateur el cierre no fija ni muestra plan: `systems/practica.js` solo entrena en
// `profesional`, y al debutar vale el plan del arranque (el del perfil), igual que el primer año. Los cierres amateur del
// dato no traen `plan`; esto lo sostiene también si alguno lo trajera.
function fijaPlan(state) {
  return state.phase !== 'amateur';
}

// K4c (plan anual): cada opción del cierre dice el plan de práctica que fija para el año que viene (regla 15: la línea
// sale de `lineaDePlan`, la misma cuenta que aplica `systems/practica.js`). La opción del dato trae `plan`.
function conPlanEnCadaOpcion(state, evento, decision) {
  if (!fijaPlan(state)) {
    return decision;
  }
  const planDe = (opcionId) => evento.options.find((opcion) => opcion.id === opcionId)?.plan;
  return {
    ...decision,
    opciones: decision.opciones.map((opcion) => {
      const plan = lineaDePlan(state, planDe(opcion.id));
      return plan ? { ...opcion, plan } : opcion;
    })
  };
}

// La decision de cierre es LA decision de la edad: nunca encadena una segunda.
// K4c (plan anual): la opción elegida fija el plan de práctica del año que viene (`player.planAnual`). Es el único
// lugar donde el plan cambia (y solo en un cierre pro: `fijaPlan`).
export function resolver(state, decision, respuesta, rng) {
  return resolverConCronica(state, decision, respuesta.opcionId, rng, null);
}

// `cronica` (el id del perfil que decidió, K4-C) cuenta el cierre en una línea; `null` es el cierre que decidiste vos.
function resolverConCronica(state, decision, opcionId, rng, cronica = state.player.perfil.actual) {
  const resultado = resolverOpcion(state, decision.datos.evento, opcionId, rng, { cronica });
  const plan = decision.datos.evento.options.find((opcion) => opcion.id === opcionId)?.plan;
  if (!fijaPlan(state) || !esPlanValido(plan)) {
    return resultado;
  }
  return { ...resultado, state: { ...resultado.state, player: { ...resultado.state.player, planAnual: plan } } };
}

export function resolverAuto(state, decision, rng) {
  return elegirOpcionAutomatica(state, decision, rng);
}
