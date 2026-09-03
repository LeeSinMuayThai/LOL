import { chance } from '../core/rng.js';
import { clamp } from '../core/numeros.js';
import { crearLog } from '../core/log.js';
import { calcularContexto } from '../core/contexto.js';
import { nivelDelJugador } from '../core/ficha.js';
import { BALANCE } from '../data/balance.js';

export const id = 'retiro';

// Fase 9R5a: la carrera termina cuando el mercado deja de llamarte.
//
// Antes de esto NADA seteaba `terminado` en fase profesional: el 69% de las
// carreras seguía "en carrera" a los 35 años, sin final ni tarjeta. Este es el
// cuarto camino a `terminado: true` —los otros tres son fracasos de la etapa
// amateur (`amateur.js`) y el burnout de `atributos.js`—, y el único con un
// final digno de una carrera larga.
//
// Va después de `mercado` en `ETAPAS_SPLIT`: el estado de contrato / la
// jerarquía de los que depende el disparador ya están frescos este split.
//
// SIMPLIFICACIÓN respecto de `PLAN.md` §10.1: el retiro es TERMINAL, no
// reversible. La ventana de vuelta (`vueltasMaximas`) queda para la FASE 10
// real. `phase: 'retirado'` y `terminado: true` van juntos, como en los otros
// tres finales.
//
// Consume `rng` (una tirada de `chance` por pretemporada pasada el declive):
// corre el stream, familia D37 — ya declarado para toda la fase 9R.

function terminar(state, finAnticipado, mensaje) {
  return {
    state: { ...state, phase: 'retirado', terminado: true, finAnticipado },
    logs: [crearLog('retiro', mensaje)]
  };
}

// El nivel actual del jugador interpolado entre las dos anclas: un
// clase-mundial casi no se retira, un prospecto cuelga los botines pronto. Es
// lo que hace que la duración de la carrera correlacione con lo buena que fue.
function factorNivel(state) {
  const r = BALANCE.retiro;
  const nivel = nivelDelJugador(state);
  const t = (nivel - r.nivelAncla.bajo) / (r.nivelAncla.alto - r.nivelAncla.bajo);
  const bruto = r.factorNivelEnBajo + t * (r.factorNivelEnAlto - r.factorNivelEnBajo);
  return clamp(bruto, r.factorNivelMin, r.factorNivelMax);
}

export function aplicar(state, rng) {
  if (state.phase !== 'profesional') {
    return { state, logs: [] };
  }
  // El retiro es un momento de fin de año, no una deriva a mitad de temporada
  // (T2: el contexto se calcula en vivo, nunca se confía en el cache).
  if (calcularContexto(state).ventana !== 'pretemporada') {
    return { state, logs: [] };
  }

  const r = BALANCE.retiro;
  if (state.age < r.edadDeclive) {
    return { state, logs: [] };
  }

  const conEquipo = Boolean(state.career.currentOrg);
  const finAnticipado = conEquipo ? 'retiro_elegido' : 'sin_equipo';
  const mensaje = conEquipo
    ? `Te retirás a los ${state.age}. ${state.career.titulos} título(s), `
      + `${state.career.internacionales} internacional(es). Se cierra una carrera.`
    : `A los ${state.age} el teléfono dejó de sonar. Sin equipo y sin llamados: se termina acá.`;

  // La línea Faker: pasada cierta edad te retirás sí o sí.
  if (state.age >= r.edadRetiroForzoso) {
    return terminar(state, finAnticipado, mensaje);
  }

  const aniosPasadoDeclive = state.age - r.edadDeclive + 1;
  const factorEquipo = conEquipo ? 1 : r.factorSinEquipo;
  const p = Math.min(0.95, r.chanceBasePorAnio * aniosPasadoDeclive * factorNivel(state) * factorEquipo);
  if (chance(p, rng)) {
    return terminar(state, finAnticipado, mensaje);
  }

  return { state, logs: [] };
}
