export function createInitialState(seed = 1) {
  return {
    seed,
    age: 15,
    phase: 'amateur',
    terminado: false,
    finAnticipado: null,
    splitFichaje: null,
    player: {
      name: 'Jugador',
      role: 'mid',
      stats: {
        mecanica: 55,
        macro: 50,
        teamfight: 50,
        laneo: 50,
        shotcalling: 45,
        adaptabilidad: 50,
        mentalidad: 70,
        hype: 40
      },
      studies: 70,
      familyTrust: 60,
      sleep: 75,
      soloqElo: 1200,
      splitCount: 0,
      titles: 0,
      worlds: 0,
      signatureChampion: null,
      championPool: [{ name: 'Ahri', mastery: 35, tags: ['mago_burst'] }]
    },
    career: {
      orgs: [],
      contracts: [],
      currentOrg: null,
      currentSplit: 1
    },
    meta: {
      patch: 1,
      weights: {
        tanque: 1,
        bruiser: 1,
        asesino: 1,
        mago_control: 1,
        escalado: 1,
        early_game: 1,
        engage: 1,
        splitpush: 1
      }
    },
    flags: {},
    logs: []
  };
}
