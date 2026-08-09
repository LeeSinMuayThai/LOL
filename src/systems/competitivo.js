import { chance, weightedPick } from '../core/rng.js';
import { clamp } from '../core/numeros.js';
import { crearLog } from '../core/log.js';
import { elegirOrgTier3, asignarOrgTier3 } from '../core/tier3.js';
import { cerrarFila } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';

// Fase 8: cierra la fila abierta del registro justo antes de cambiar de org
// (ascenso o disolución). Sin fila abierta (primer fichaje de la carrera) no
// hace nada — `cerrarFila` ya es un no-op en ese caso.
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

// --- Tier 3: brevedad forzada ---
//
// Pedido explícito: nadie se queda mucho en un equipo inventado. Cada split
// hay chance de que se resuelva — subís a tier 2, o el equipo se disuelve y
// volvés a buscar otro (nunca te quedás "sin nada": tier 3 siempre te levanta
// de nuevo, es la característica del nivel).

function ligaTier2DeLaRegion(state) {
  return state.mundo.ligas.find((liga) => liga.tier === 2 && liga.regionId === state.mundo.regionIdOrigen) ?? null;
}

function ascenderATier2(state, rng, logsPrevios) {
  const liga = ligaTier2DeLaRegion(state);
  if (!liga) {
    // No debería pasar (las 6 regiones tienen tier 2 en leagues.json), pero
    // sin liga de destino no hay ascenso posible: seguís en tier 3.
    return { state, logs: logsPrevios };
  }

  const org = weightedPick(liga.orgs, (candidata) => BALANCE.stats.max - candidata.fuerza, rng);
  return {
    state: {
      ...state,
      career: {
        ...state.career, tier: 2, liga: liga.id, currentOrg: org.nombre, orgs: [...state.career.orgs, org.nombre],
        registro: conFilaCerrada(state, 'ascenso')
      }
    },
    logs: [...logsPrevios, crearLog('competitivo', `Ascendiste a ${liga.id}. Firmaste con ${org.nombre}: se terminó tier 3.`)]
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
  const c = BALANCE.competitivo;
  if (!chance(c.probSalidaTier3, rng)) {
    return { state, logs: [] };
  }

  const probAscenso = clamp(
    c.probAscensoBaseDesdeTier3 + (state.career.jerarquia / BALANCE.stats.max) * c.probAscensoPorJerarquiaDesdeTier3,
    0, 1
  );

  return chance(probAscenso, rng) ? ascenderATier2(state, rng, []) : disolverEquipo(state, []);
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

// El año muerto (dato real, TRASPASO): la LEC exige 18 años y un europeo
// puede firmar a los 17. Cuando el ascenso se gana pero la edad no alcanza,
// la org queda esperando: no se vuelve a sortear nada, apenas cumplís se hace
// efectivo el ascenso que ya habías ganado.
function promoverATier1(state, ligaTier1, orgNombre) {
  return {
    state: {
      ...state,
      flags: { ...state.flags, tier1Esperando: null },
      career: {
        ...state.career,
        tier: 1,
        liga: ligaTier1.id,
        currentOrg: orgNombre,
        orgs: [...state.career.orgs, orgNombre],
        // Reinicia el reloj del debut (CONCEPTO §2): pisar una liga real por
        // primera vez es el debut que importa, no cualquier contrato chico.
        splitAscensoTier1: state.player.splitCount,
        registro: conFilaCerrada(state, 'ascenso')
      }
    },
    logs: [crearLog('competitivo', `¡Ascendiste a ${ligaTier1.id}! Firmaste con ${orgNombre}.`)]
  };
}

function resolverTier2(state, rng) {
  const c = BALANCE.competitivo;

  // Ya te habían elegido pero te faltaba edad: en cuanto llegues, debutás.
  // No se vuelve a tirar el ascenso — ya estaba ganado.
  if (state.flags.tier1Esperando) {
    const { ligaId, orgNombre, edadMinima } = state.flags.tier1Esperando;
    if (state.age < edadMinima) {
      return { state, logs: [] };
    }
    const ligaTier1 = state.mundo.ligas.find((liga) => liga.id === ligaId);
    return promoverATier1(state, ligaTier1, orgNombre);
  }

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

  const org = weightedPick(ligaTier1.orgs, (candidata) => BALANCE.stats.max - candidata.fuerza, rng);

  if (state.age < ligaTier1.edadMinima) {
    return {
      state: {
        ...state,
        flags: { ...state.flags, tier1Esperando: { ligaId: ligaTier1.id, orgNombre: org.nombre, edadMinima: ligaTier1.edadMinima } }
      },
      logs: [crearLog(
        'competitivo',
        `${ligaTier1.id} te quiere, pero exige ${ligaTier1.edadMinima} años para debutar y todavía no llegás. `
        + `Un año más en ${state.career.liga} con el lugar ya reservado.`
      )]
    };
  }

  return promoverATier1(state, ligaTier1, org.nombre);
}

export function aplicar(state, rng) {
  if (state.phase !== 'profesional') {
    return { state, logs: [] };
  }

  if (!state.career.currentOrg) {
    // Sólo el tier 3 se re-ofrece solo (fase 3): el resto del mercado
    // —contratos, ofertas, "sin equipo" como final— es la fase 5.
    return reFicharTier3(state, rng);
  }

  if (state.career.tier === 3) {
    return resolverTier3(state, rng);
  }
  if (state.career.tier === 2) {
    return resolverTier2(state, rng);
  }
  return { state, logs: [] };
}
