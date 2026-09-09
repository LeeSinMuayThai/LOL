import { chance } from '../core/rng.js';
import { clamp } from '../core/numeros.js';
import { crearLog } from '../core/log.js';
import { elegirOrgTier3, asignarOrgTier3 } from '../core/tier3.js';
import { cerrarFila } from '../core/registro.js';
import { calcularContexto } from '../core/contexto.js';
import { usadosDePlanteles, generarPlantel, fuerzaDePlantel } from '../core/plantel.js';
import { BALANCE } from '../data/balance.js';

// El tránsito entre tiers.
//
// Fase 3: tier 3 (equipos inventados, efímeros) se resuelve solo — subís o el
// equipo se disuelve. Fase 9 (§9.4): el mercado decide A QUÉ ORG vas.
//
// Fase 9Md (§9M.5): **la escalera de tier 2 y tier 1 deja de sortearse**. Ya no
// hay "ascenso ganado" — hay asientos (`systems/mercado.js`, que corre justo
// después). Este sistema queda con:
//  - tier 3, que no cambia ("a ese nivel no se negocia"): disolución, re-fichaje,
//    y el salto a tier 2 (que ahora te deja como AGENTE LIBRE de tier 2 — el
//    mercado te ofrece club en la pretemporada).
//  - el DESCENSO de tier 1 (D16): si tu org termina última de una liga con
//    `desciendeA`, baja de categoría y tu contrato viaja con ella; su org tier-2
//    más fuerte de la región promociona a taparla.

function conFilaCerrada(state, motivo) {
  return cerrarFila(state.career.registro, {
    anio: state.calendario.anio, split: state.player.splitCount,
    arraigoActual: state.career.arraigo, motivo
  });
}

export const id = 'competitivo';

function ligaTier2DeLaRegion(state) {
  return state.mundo.ligas.find((liga) => liga.tier === 2 && liga.regionId === state.mundo.regionIdOrigen) ?? null;
}

// --- Tier 3: brevedad forzada ---

// Fase 9E (bug D25): `tier` se CONSERVA en 3. Se te disolvió el equipo, no
// dejaste de ser un jugador de tier 3.
function disolverEquipo(state, logsPrevios) {
  return {
    state: {
      ...state,
      career: {
        ...state.career, tier: 3, liga: null, currentOrg: null, rosterDeOrg: null,
        companeros: [], jerarquia: 0, arraigo: 0, sinergia: 0,
        registro: conFilaCerrada(state, 'disolucion')
      }
    },
    logs: [...logsPrevios, crearLog('competitivo', `${state.career.currentOrg} se disuelve. Se acabó ese armado — a buscar otro equipo chico.`)]
  };
}

// Fase 9Md: el salto de tier 3 te deja como AGENTE LIBRE de tier 2 — "deja el
// asiento abierto". La próxima pretemporada el mercado te ofrece club.
function saltarATier2(state, logsPrevios) {
  const liga = ligaTier2DeLaRegion(state);
  if (!liga) {
    // No debería pasar (las 6 regiones tienen tier 2 en leagues.json).
    return { state, logs: logsPrevios };
  }
  return {
    state: {
      ...state,
      career: {
        ...state.career,
        tier: 2, liga: liga.id, currentOrg: null, rosterDeOrg: null,
        companeros: [], jerarquia: 0, arraigo: 0, sinergia: 0,
        contrato: { ...state.career.contrato, org: null, liga: liga.id, tier: 2, anios: 0, aniosRestantes: 0 },
        registro: conFilaCerrada(state, 'ascenso')
      }
    },
    logs: [...logsPrevios, crearLog('competitivo', `Te ganás el salto a ${liga.id}. Sos agente libre de tier 2: en la pretemporada elegís club.`)]
  };
}

function resolverTier3(state, rng) {
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
  return saltarATier2(state, []);
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

// --- Descenso de tier 1 (fase 9Md, cierra D16) ---

// ¿La liga de destino tiene planteles? La tier 2 de tu región siempre; una liga
// extranjera (te relegaron siendo import) puede no tenerlos — se generan al
// vuelo para que el mercado tenga con qué trabajar.
function conPlantelesDe(state, liga, rng) {
  if (liga.orgs.every((org) => state.mundo.planteles?.[org.nombre])) {
    return state.mundo.planteles;
  }
  const usados = usadosDePlanteles(state);
  const planteles = { ...state.mundo.planteles };
  for (const org of liga.orgs) {
    if (planteles[org.nombre]) {
      continue;
    }
    planteles[org.nombre] = generarPlantel(rng, {
      orgNombre: org.nombre,
      regionId: liga.regionId,
      fuerzaOrg: org.fuerza,
      medianaSalarioUSD: liga.salario.medianaUSD,
      usados,
      edadMinima: liga.edadMinima ?? 0
    });
  }
  return planteles;
}

function resolverDescenso(state, rng) {
  if (state.career.tier !== 1 || !state.career.currentOrg) {
    return null;
  }
  if (calcularContexto(state).ventana !== 'pretemporada') {
    return null;
  }
  const ligaActual = state.mundo.ligas.find((liga) => liga.id === state.career.liga);
  if (!ligaActual?.desciendeA) {
    return null;
  }
  const equipos = ligaActual.orgs.length;
  // `career.posicion` trae el resultado del split de cierre que acaba de pasar.
  if (state.career.posicion == null || state.career.posicion < equipos) {
    return null;
  }

  const ligaDestino = state.mundo.ligas.find((liga) => liga.id === ligaActual.desciendeA);
  if (!ligaDestino) {
    return null;
  }

  const planteles = conPlantelesDe(state, ligaDestino, rng);
  const orgQueBaja = ligaActual.orgs.find((org) => org.nombre === state.career.currentOrg);
  // La org tier-2 más fuerte de esa región promociona a tapar el hueco.
  const orgQueSube = [...ligaDestino.orgs].sort((a, b) => b.fuerza - a.fuerza)[0];

  const ligas = state.mundo.ligas.map((liga) => {
    if (liga.id === ligaActual.id) {
      return { ...liga, orgs: liga.orgs.map((org) => (org.nombre === orgQueBaja.nombre ? orgQueSube : org)) };
    }
    if (liga.id === ligaDestino.id) {
      return { ...liga, orgs: liga.orgs.map((org) => (org.nombre === orgQueSube.nombre ? orgQueBaja : org)) };
    }
    return liga;
  });

  return {
    state: {
      ...state,
      flags: { ...state.flags, splitDescenso: state.player.splitCount },
      mundo: { ...state.mundo, ligas, planteles },
      career: {
        ...state.career,
        tier: 2, liga: ligaDestino.id,
        contrato: { ...state.career.contrato, tier: 2, liga: ligaDestino.id }
      }
    },
    logs: [crearLog('competitivo', `${orgQueBaja.nombre} termina último en ${ligaActual.id}: desciende a ${ligaDestino.id}. Bajás con ellos — el contrato viaja.`)]
  };
}

export function aplicar(state, rng) {
  if (state.phase !== 'profesional') {
    return { state, logs: [] };
  }

  const descenso = resolverDescenso(state, rng);
  if (descenso) {
    return descenso;
  }

  if (!state.career.currentOrg) {
    // Sólo tier 3 se re-ofrece solo. Un tier-2 libre (recién saltó de tier 3, o
    // el mercado no le consiguió equipo) lo resuelve `mercado.js`.
    return state.career.tier === 3 ? reFicharTier3(state, rng) : { state, logs: [] };
  }

  if (state.career.tier === 3) {
    return resolverTier3(state, rng);
  }
  // Tier 1 y tier 2 con equipo: no se sortea nada. El mercado (más abajo en el
  // split) decide si te vas, te quedás o subís.
  return { state, logs: [] };
}
