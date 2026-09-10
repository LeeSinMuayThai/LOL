// Fase 9W (PLAN.md §9W): el ranking vivo de los mejores del mundo.
//
// Se para JUSTO DESPUÉS de `escena` en el registro (regla invariable 6):
// necesita la `mundo.escenaAnual` que ese sistema acaba de escribir para el
// bono por resultado. Va antes de `plantel`, que envejece el mundo.
//
// Cero `rng`, siempre — la regla de oro de la fase. Recomputa el ranking cada
// split (barato: ~290 casillas de tier 1 + el jugador, aritmética y un sort).
// Mid-season sólo se mueve el jugador según sube su nivel: el "sentís que
// trepás". Al CIERRE DE EDAD difea contra la foto del cierre anterior y narra
// los hitos (entrás / te caés / #1 / un rival de generación entra o sale) más
// el reveal del Top 20, y persiste `picos.rankMundial` / `splitsEnTopMundial`.

import { crearLog } from '../core/log.js';
import { registrarMomento, registrarPicoRank } from '../core/registro.js';
import { rankearPoblacion, diffDeRanking } from '../core/topMundial.js';
import { esCierreDeEdad } from './edadCierre.js';
import { BALANCE } from '../data/balance.js';

export const id = 'topMundial';

function esRankeable(state) {
  return state.career.tier === 1 && Boolean(state.career.currentOrg);
}

// La fila del Top 20 tal como la consume la pantalla (9Wc) y el reveal.
function filaPublica(entrada, pos) {
  return {
    pos,
    handle: entrada.handle,
    org: entrada.org,
    liga: entrada.liga,
    rol: entrada.rol,
    edad: entrada.edad,
    nivel: entrada.nivel,
    esJugador: entrada.esJugador === true,
    rivalDeGeneracion: entrada.rivalDeGeneracion === true
  };
}

function lineaMovimiento(rankActual, rankAnterior, anio) {
  if (rankActual !== null && rankAnterior === null) {
    return `Entrás al Top 20 del mundo: #${rankActual} al cierre de ${anio}.`;
  }
  if (rankActual === null && rankAnterior !== null) {
    return `Te caés del Top 20 del mundo — venías #${rankAnterior}.`;
  }
  if (rankActual !== null && rankAnterior !== null) {
    if (rankActual === 1 && rankAnterior !== 1) {
      return `Sos el mejor del mundo. #1 al cierre de ${anio}.`;
    }
    if (rankActual < rankAnterior) {
      return `Subís en el ranking mundial: #${rankAnterior} → #${rankActual}.`;
    }
    if (rankActual > rankAnterior) {
      return `Bajás en el ranking mundial: #${rankAnterior} → #${rankActual}.`;
    }
  }
  return null;
}

function lineaReveal(top20, rankActual, rankGlobal) {
  if (rankActual !== null) {
    return `Top 20 del mundo: estás #${rankActual}.`;
  }
  const primeros = top20.slice(0, 3).map((fila) => fila.handle).join(', ');
  if (rankGlobal !== null) {
    return `Top 20 del mundo: lo encabezan ${primeros}. Quedaste #${rankGlobal} — cerca.`;
  }
  return `Top 20 del mundo: lo encabezan ${primeros}. No entraste este año.`;
}

// `rng` está en la firma por el contrato del registro (`aplicar(state, rng)`),
// pero 9W NUNCA lo toca — es la regla de oro de la fase. El check
// `Fase 9W: el ranking es determinista y no consume RNG` le pasa un rng que
// revienta si se lo llama.
export function aplicar(state, rng) { // eslint-disable-line no-unused-vars
  const { tamano } = BALANCE.topMundial;
  const anioActual = state.calendario.anio;

  // Una sola pasada: la población entera puntuada y ordenada. El Top 20 es el
  // corte; los ranks globales alimentan `mundo.rivales[].puntaje`.
  const poblacion = rankearPoblacion(state);
  const previo = state.mundo.topMundial ?? [];
  const entroPorHandle = new Map(previo.map((entrada) => [entrada.handle, entrada.entroAnio]));
  const topMundial = poblacion.slice(0, tamano).map((entrada) => ({
    ...entrada, entroAnio: entroPorHandle.get(entrada.handle) ?? anioActual
  }));
  const mejorDelMundo = topMundial[0] ?? null;

  const filaJugador = topMundial.find((entrada) => entrada.esJugador) ?? null;
  const rankMundialActual = esRankeable(state) && filaJugador
    ? topMundial.indexOf(filaJugador) + 1
    : null;

  // La posición del jugador en la población entera, no sólo en el corte. Sólo
  // interesa para el reveal de cierre y sólo cuando quedaste RANKEABLE pero
  // afuera y CERCA (`margenReveal`): es el "quedaste #23" de §9W. Se lee de
  // `poblacion`, ya ordenada — cero `rng`.
  let rankGlobalJugador = null;
  if (esRankeable(state) && rankMundialActual === null) {
    const pos = poblacion.findIndex((entrada) => entrada.esJugador) + 1;
    if (pos > 0 && pos <= tamano + BALANCE.topMundial.margenReveal) {
      rankGlobalJugador = pos;
    }
  }

  // Fase 9Wb (D8/D40): `mundo.rivales[].puntaje` deja de ser 0 muerto y pasa a
  // ser el MEJOR (menor) rank que el rival tocó dentro del Top 20. `0` = nunca
  // entró. Lo consume `dueloDeGeneracion` (core/ficha.js).
  const rankTop20 = new Map(topMundial.map((entrada, i) => [entrada.handle, i + 1]));
  let rivalesTocados = false;
  const rivales = (state.mundo.rivales ?? []).map((rival) => {
    const rank = rankTop20.get(rival.handle);
    if (!rank) {
      return rival;
    }
    const mejor = (rival.puntaje ?? 0) > 0 ? Math.min(rival.puntaje, rank) : rank;
    if (mejor === rival.puntaje) {
      return rival;
    }
    rivalesTocados = true;
    return { ...rival, puntaje: mejor };
  });

  let next = {
    ...state,
    mundo: {
      ...state.mundo,
      topMundial,
      mejorDelMundo,
      ...(rivalesTocados ? { rivales } : {})
    },
    flags: { ...state.flags, rankMundialActual }
  };

  if (!esCierreDeEdad(state)) {
    return { state: next, logs: [] };
  }

  // --- Cierre de edad: los hitos ---
  const anio = anioActual;
  const rankAnterior = state.flags.rankMundialAnterior ?? null;
  const previoAnual = state.mundo.topMundialPrevioAnual ?? [];
  const logs = [];

  // El feed del Top 20 sólo le habla a quien está en la conversación: rankeable
  // ahora, lo era el año pasado, o alguna vez tocó la lista. Un jugador de
  // tier 2/3 no recibe un "no sos el mejor del mundo" cada año — el panel del
  // riel (9Wc) sí se ve siempre, como el norte al que se apunta.
  const enLaConversacion = esRankeable(state)
    || rankAnterior !== null
    || (state.career.registro.picos.rankMundial ?? 0) > 0;

  if (enLaConversacion) {
    const movimiento = lineaMovimiento(rankMundialActual, rankAnterior, anio);
    if (movimiento) {
      logs.push(crearLog('top_mundial', movimiento, { tecnico: false }));
    }
    logs.push(crearLog('top_mundial', lineaReveal(topMundial, rankMundialActual, rankGlobalJugador), {
      tecnico: false,
      top20: topMundial.map((entrada, i) => filaPublica(entrada, i + 1)),
      rankJugador: rankMundialActual,
      rankJugadorGlobal: rankGlobalJugador
    }));

    const { entraron, salieron } = diffDeRanking(previoAnual, topMundial);
    for (const entrada of entraron) {
      if (entrada.rivalDeGeneracion) {
        logs.push(crearLog('top_mundial', `${entrada.handle}, de tu generación, entra al Top 20 (#${entrada.rank}).`, { tecnico: false }));
      }
    }
    for (const entrada of salieron) {
      if (entrada.rivalDeGeneracion) {
        logs.push(crearLog('top_mundial', `${entrada.handle}, de tu generación, se cae del Top 20.`, { tecnico: false }));
      }
    }
  }

  // --- Persistencia (regla de proceso 14: el registro sólo crece) ---
  let registro = state.career.registro;
  let splitsEnTopMundial = registro.splitsEnTopMundial ?? 0;
  if (rankMundialActual !== null) {
    registro = registrarPicoRank(registro, rankMundialActual);
    splitsEnTopMundial += 1;
    if (rankMundialActual === 1 && rankAnterior !== 1) {
      registro = registrarMomento(registro, {
        tipo: 'el_mejor_del_mundo', anio, edad: state.age, org: state.career.currentOrg,
        texto: `El mejor del mundo (${anio})`
      });
    } else if (rankAnterior === null) {
      registro = registrarMomento(registro, {
        tipo: 'top_mundial', anio, edad: state.age, org: state.career.currentOrg,
        texto: `Top ${rankMundialActual} del mundo a los ${state.age}`
      });
    }
  }
  registro = { ...registro, splitsEnTopMundial };

  next = {
    ...next,
    career: { ...next.career, registro },
    flags: { ...next.flags, rankMundialAnterior: rankMundialActual },
    mundo: { ...next.mundo, topMundialPrevioAnual: topMundial }
  };

  return { state: next, logs };
}
