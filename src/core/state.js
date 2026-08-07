import { BALANCE } from '../data/balance.js';

function pesosInicialesDelMeta() {
  const arquetipos = ['tanque', 'bruiser', 'asesino', 'mago_control', 'escalado', 'early_game', 'engage', 'splitpush'];
  return Object.fromEntries(arquetipos.map((tag) => [tag, BALANCE.meta.pesoInicial]));
}

export function createInitialState(seed = 1) {
  const { inicial } = BALANCE;

  return {
    seed,
    age: 15,
    phase: 'amateur',
    terminado: false,
    finAnticipado: null,
    splitFichaje: null,
    // Decision a medio resolver. Vive adentro de state para que una partida en
    // curso sea serializable y reanudable (regla invariable 9).
    pendiente: null,
    player: {
      name: 'Jugador',
      role: 'mid',
      stats: { ...inicial.stats },
      studies: inicial.studies,
      familyTrust: inicial.familyTrust,
      sleep: inicial.sleep,
      soloqElo: inicial.soloqElo,
      splitCount: 0,
      titles: 0,
      worlds: 0,
      signatureChampion: null,
      championPool: []
    },
    career: {
      orgs: [],
      contracts: [],
      hitos: [],
      currentOrg: null,
      currentSplit: 1
    },
    meta: {
      patch: 1,
      weights: pesosInicialesDelMeta()
    },
    flags: {},
    logs: []
  };
}
