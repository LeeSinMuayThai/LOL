import { BALANCE } from '../data/balance.js';
import { generarMundo } from './mundo.js';
import { puntosAbsolutos } from './ranked.js';

// El mundo entero sale de la seed (CONCEPTO §8): rol, region, colegio, viejos,
// potencial oculto, forma de carrera, pool inicial, meta y rivales. Por eso el
// rng se inyecta aca y no se crea adentro: la generacion del mundo consume del
// mismo stream que despues consume el pipeline, asi una seed reproduce la
// partida entera y no solo la mitad.
const EDAD_INICIAL = 15;

// `eleccion` es lo que el jugador decidio en la pantalla de inicio:
// `{ handle?, rol?, campeones? }`. Si no viene, todo se sortea de la seed — ese
// es el camino que corren simulate.js y validate.js.
export function createInitialState(seed, rng, eleccion = null) {
  const { inicial } = BALANCE;
  const { jugador, origen, mundo } = generarMundo(rng, EDAD_INICIAL, eleccion);

  return {
    seed,
    age: EDAD_INICIAL,
    phase: 'amateur',
    terminado: false,
    finAnticipado: null,
    splitFichaje: null,
    // Decision a medio resolver. Vive adentro de state para que una partida en
    // curso sea serializable y reanudable (regla invariable 9).
    pendiente: null,
    // Cache de "dónde estás parado". La fuente de verdad es calcularContexto();
    // esto existe para la UI, los logs y para no recalcularlo en cada filtro.
    contexto: null,
    origen,
    // Los campeones que salieron con un parche a mitad de esta carrera. Arranca
    // vacío: los marcados `debut` en champions.json todavía no existen en este
    // mundo (trampa T4 — tiene que existir en el estado inicial, nunca null).
    mundo: { ...mundo, campeonesDebutados: [] },
    player: {
      name: jugador.handle,
      role: jugador.role,
      stats: jugador.stats,
      oculto: jugador.oculto,
      studies: jugador.barras.studies,
      familyTrust: jugador.barras.familyTrust,
      sleep: jugador.barras.sleep,
      // La escalera real: tier, división y LP. Es la fuente de verdad.
      ranked: jugador.ranked,
      // Espejo derivado de solo lectura (puntos absolutos de la escalera).
      // Existe para que todo lo que ya leía este campo siga funcionando; nadie
      // lo escribe salvo `conRanked`.
      soloqElo: puntosAbsolutos(jugador.ranked),
      // Periodos consecutivos robandole al sueño, ya convertidos en deuda.
      deudaSueno: 0,
      splitCount: 0,
      titles: 0,
      worlds: 0,
      signatureChampion: null,
      campeonDelSplit: null,
      championPool: jugador.championPool
    },
    career: {
      orgs: [],
      contracts: [],
      hitos: [],
      currentOrg: null,
      currentSplit: 1,
      // 1, 2 o 3 (fase 3). Es la fuente de verdad de en qué nivel competís:
      // `liga` puede ser null (tier 3 no es una liga real) y `tier` no.
      tier: null,
      // En qué split entraste a una liga real por primera vez. Distinto de
      // `splitFichaje` (cuándo dejaste el amateurismo, que puede haber sido en
      // tier 3): el debut de CONCEPTO §2 es pisar tier 1, no cualquier
      // contrato. `splitFichaje` sigue siendo el KPI de "cuánto tardaste en
      // hacerte notar" que reporta simulate.js — no se pisa.
      splitAscensoTier1: null,
      // Roster, jerarquía y sinergia: se llenan al firmar.
      liga: null,
      rosterDeOrg: null,
      companeros: [],
      jerarquia: 0,
      sinergia: 0,
      // Ventana móvil de "cómo te fue" (0-100 por split). Alimenta el momentum
      // del contexto: es lo que distingue una racha de un slump.
      historial: [],
      // Resultado del último split competitivo.
      posicion: null,
      titulos: 0,
      podios: 0,
      internacionales: 0
    },
    meta: {
      patch: 1,
      weights: mundo.metaInicial,
      // Se recalcula cada split cruzando el pool contra los pesos del meta.
      ajuste: BALANCE.campeones.ajusteNeutro
    },
    flags: {
      cooldowns: {},
      robosConsecutivos: 0,
      pcConfiscada: 0,
      avisos: 0,
      nocturno: false,
      negociacionGanada: false,
      // Se congela a los 18 (o al dejar la etapa amateur) y acompaña el resto
      // de la carrera: 'terminado' o 'lo_dejo'.
      secundario: null,
      // El año muerto (fase 3): ganaste el ascenso a tier 1 pero la liga exige
      // más edad de la que tenés. Se resuelve solo apenas cumplís, sin volver
      // a sortear nada.
      tier1Esperando: null
    },
    logs: []
  };
}
