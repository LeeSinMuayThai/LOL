import { BALANCE } from '../data/balance.js';
import { elegirEventoCierre, resolverOpcion, elegirOpcionAutomatica, decisionDesdeEvento, opcionDelPerfilPara } from './events.js';
import { lineaDePlan } from './practica.js';
import { esPlanValido } from '../core/rutinas.js';
import { frenaEnLaCola, hitoDelCierre, conFirmaDeLaCola, narradaEnLaCola } from '../core/cola.js';

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

  const evento = elegirEventoCierre(nextState, rng);
  if (!evento) {
    return { state: nextState, logs: [] };
  }

  const decision = decisionDeCierre(nextState, evento);
  // K6b-C2 (la cola de verdad): en la cola, el cierre frena solo si es un hito, si algo cambió o si su tipo tiene
  // palanca (`core/cola.js`). Si no, lo resuelve tu perfil por el mismo `resolver` (fija el plan de su opción, con las
  // mismas tiradas que después de la pausa) y queda una línea de crónica.
  if (!frenaEnLaCola(nextState, 'cierre', hitoDelCierre(state, nextState.age)).frena) {
    const opcionId = opcionDelPerfilPara(nextState, evento);
    const resuelto = resolverConCronica(nextState, decision, opcionId, rng);
    return { ...resuelto, logs: narradaEnLaCola(resuelto.logs, 'cierre', opcionId) };
  }
  return { state: conFirmaDeLaCola(nextState, 'cierre'), logs: [], decision };
}

// La pausa del cierre, con la línea del plan en cada opción (si el cierre fija plan). La usa también `core/guardado.js`
// (`migrarDe10`) para rearmar con el texto de hoy un cierre que un guardado viejo dejó parado (regla 15).
export function decisionDeCierre(state, evento) {
  return conPlanEnCadaOpcion(state, evento, decisionDesdeEvento(state, evento, { franja: 'cierre', slot: 1 }));
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
