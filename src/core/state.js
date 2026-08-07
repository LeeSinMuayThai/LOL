import { BALANCE } from '../data/balance.js';
import { generarMundo } from './mundo.js';

// El mundo entero sale de la seed (CONCEPTO §8): rol, region, colegio, viejos,
// potencial oculto, forma de carrera, pool inicial, meta y rivales. Por eso el
// rng se inyecta aca y no se crea adentro: la generacion del mundo consume del
// mismo stream que despues consume el pipeline, asi una seed reproduce la
// partida entera y no solo la mitad.
const EDAD_INICIAL = 15;

export function createInitialState(seed, rng) {
  const { inicial } = BALANCE;
  const { jugador, origen, mundo } = generarMundo(rng, EDAD_INICIAL);

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
    origen,
    mundo,
    player: {
      name: jugador.handle,
      role: jugador.role,
      stats: jugador.stats,
      oculto: jugador.oculto,
      studies: jugador.barras.studies,
      familyTrust: jugador.barras.familyTrust,
      sleep: jugador.barras.sleep,
      soloqElo: inicial.soloqElo,
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
      // Roster, jerarquía y sinergia: se llenan al firmar.
      liga: null,
      rosterDeOrg: null,
      companeros: [],
      jerarquia: 0,
      sinergia: 0,
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
      secundario: null
    },
    logs: []
  };
}
