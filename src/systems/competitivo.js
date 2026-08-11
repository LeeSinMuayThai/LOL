import { chance } from '../core/rng.js';
import { clamp } from '../core/numeros.js';
import { crearLog } from '../core/log.js';
import { elegirOrgTier3, asignarOrgTier3 } from '../core/tier3.js';
import { cerrarFila } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';

// Fase 8: cierra la fila abierta del registro justo antes de cambiar de org
// (disolución de tier 3, el único cambio de org que sigue siendo automático
// acá — fase 9: ascenso a tier 2 o tier 1 cierra su fila en `mercado.js`,
// recién cuando el jugador elige con quién firma). Sin fila abierta (primer
// fichaje de la carrera) no hace nada — `cerrarFila` ya es un no-op ahí.
function conFilaCerrada(state, motivo) {
  return cerrarFila(state.career.registro, {
    anio: state.calendario.anio, split: state.player.splitCount,
    arraigoActual: state.career.arraigo, motivo
  });
}

export const id = 'competitivo';

// El tránsito entre tiers (fase 3). Va después de `roster` en el registro: en
// el split del fichaje, `amateur` todavía no corrió (viene más adelante), así
// que este sistema ve `phase: 'amateur'` y no hace nada — recién actúa desde
// el split siguiente, con el fichaje ya hecho.
//
// Fase 9 (PLAN.md §9.4, "el cambio de más riesgo del documento"): este
// sistema sigue decidiendo SI ascendés (mérito: jerarquía y suerte), pero ya
// no decide A QUÉ ORG vas — eso pasa a ser una decisión real del jugador en
// `mercado.js`, que corre justo después en el registro. Acá solo se marca
// `flags.ascensoPendiente = { ligaId, tier }`; tier 3 disolviéndose y
// volviendo a levantarte siguen exactamente igual (a ese nivel no se
// negocia, es la característica del nivel).

// --- Tier 3: brevedad forzada ---
//
// Pedido explícito: nadie se queda mucho en un equipo inventado. Cada split
// hay chance de que se resuelva — subís a tier 2, o el equipo se disuelve y
// volvés a buscar otro (nunca te quedás "sin nada": tier 3 siempre te levanta
// de nuevo, es la característica del nivel).

function ligaTier2DeLaRegion(state) {
  return state.mundo.ligas.find((liga) => liga.tier === 2 && liga.regionId === state.mundo.regionIdOrigen) ?? null;
}

function marcarAscenso(state, ligaId, tier, logsPrevios) {
  return {
    state: { ...state, flags: { ...state.flags, ascensoPendiente: { ligaId, tier } } },
    logs: [...logsPrevios, crearLog('competitivo', `¡Te ganaste el ascenso a ${ligaId}! En la próxima pretemporada elegís con quién firmás.`)]
  };
}

function disolverEquipo(state, logsPrevios) {
  return {
    state: {
      ...state,
      career: {
        ...state.career, tier: null, liga: null, currentOrg: null, rosterDeOrg: null,
        companeros: [], jerarquia: 0, arraigo: 0, sinergia: 0,
        registro: conFilaCerrada(state, 'disolucion')
      }
    },
    logs: [...logsPrevios, crearLog('competitivo', `${state.career.currentOrg} se disuelve. Se acabó ese armado — a buscar otro equipo chico.`)]
  };
}

function resolverTier3(state, rng) {
  // Ya ganaste el ascenso y estás esperando la pretemporada para elegir
  // equipo (mercado.js): no se vuelve a tirar nada mientras tanto.
  if (state.flags.ascensoPendiente) {
    return { state, logs: [] };
  }

  const c = BALANCE.competitivo;
  if (!chance(c.probSalidaTier3, rng)) {
    return { state, logs: [] };
  }

  const probAscenso = clamp(
    c.probAscensoBaseDesdeTier3 + (state.career.jerarquia / BALANCE.stats.max) * c.probAscensoPorJerarquiaDesdeTier3,
    0, 1
  );
  if (!chance(probAscenso, rng)) {
    return disolverEquipo(state, []);
  }

  const liga = ligaTier2DeLaRegion(state);
  if (!liga) {
    // No debería pasar (las 6 regiones tienen tier 2 en leagues.json), pero
    // sin liga de destino no hay ascenso posible: seguís en tier 3.
    return { state, logs: [] };
  }
  return marcarAscenso(state, liga.id, 2, []);
}

// Un tier 3 disuelto nunca queda mucho tiempo sin equipo: es la característica
// del nivel, siempre hay otro armado chico buscando gente.
function reFicharTier3(state, rng) {
  if (!chance(1 / BALANCE.competitivo.splitsLibrePromedioTier3, rng)) {
    return { state, logs: [] };
  }
  const org = elegirOrgTier3(state, rng);
  return {
    state: asignarOrgTier3(state, org),
    logs: [crearLog('competitivo', `${org.nombre} te levanta. Otro equipo chico, otra chance de mostrarte.`)]
  };
}

// --- Tier 2: el ascenso se gana, no se sortea parejo ---

function resolverTier2(state, rng) {
  if (state.flags.ascensoPendiente) {
    return { state, logs: [] };
  }

  const c = BALANCE.competitivo;
  const probAscenso = clamp(
    c.probAscensoBaseDesdeTier2 + (state.career.jerarquia / BALANCE.stats.max) * c.probAscensoPorJerarquiaDesdeTier2,
    0, 1
  );
  if (!chance(probAscenso, rng)) {
    return { state, logs: [] };
  }

  const ligaTier1 = state.mundo.ligas.find((liga) => liga.tier === 1 && liga.desciendeA === state.career.liga);
  if (!ligaTier1) {
    return { state, logs: [] };
  }
  return marcarAscenso(state, ligaTier1.id, 1, []);
}

export function aplicar(state, rng) {
  if (state.phase !== 'profesional') {
    return { state, logs: [] };
  }

  if (!state.career.currentOrg) {
    // Sólo tier 3 se re-ofrece solo: es la característica del nivel. Un
    // jugador libre de tier 1/2 (fase 9: el mercado no le consiguió equipo,
    // o está esperando resolver un ascenso) no se re-ficha automático acá —
    // eso es exactamente lo que `mercado.js` va a intentar resolver.
    return state.career.tier === 3 ? reFicharTier3(state, rng) : { state, logs: [] };
  }

  if (state.career.tier === 3) {
    return resolverTier3(state, rng);
  }
  if (state.career.tier === 2) {
    return resolverTier2(state, rng);
  }
  return { state, logs: [] };
}
