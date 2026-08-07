export const BALANCE = {
  // Rango universal de cualquier stat de 0 a 100.
  stats: {
    min: 0,
    max: 100
  },

  // Topes de seguridad del motor. No son reglas de juego: evitan loops infinitos
  // si un sistema queda mal configurado.
  partida: {
    maxSplitsDeSeguridad: 90,
    maxDecisionesPorSplit: 8
  },

  // Valores de arranque del jugador. Son las bases sobre las que el mundo
  // generado (paso siguiente del roadmap) aplica su dispersion.
  inicial: {
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
    soloqElo: 1200
  },

  amateur: {
    eloGainMin: 20,
    eloGainMax: 55,
    sleepLossMin: 3,
    sleepLossMax: 7,
    studiesGain: 3,
    studiesSpread: 2,
    trustDriftMin: 1,
    trustDriftMax: 4,
    soloqEloUmbralExito: 1600,
    hypeUmbralExito: 55,
    familyTrustUmbralFracaso: 15,
    sleepUmbralFracaso: 10
  },

  split: {
    baseGain: 4,
    maxGain: 8,
    gananciaMinima: 1,
    mentalidadGain: 1,
    mentalidadSpread: 1.2,
    mentalidadMinima: 0,
    metaInfluenceBase: 0.8,
    metaInfluenceRange: 0.2
  },

  meta: {
    pesoInicial: 1,
    pesoMinimo: 0.5,
    // Peso al que un arquetipo se considera plenamente dominante: normaliza
    // el multiplicador de meta a [0, 1].
    pesoDominante: 2,
    derivaMedia: 0,
    maxDelta: 0.15
  },

  edad: {
    splitsPorEdad: 3,
    probSegundaDecision: 0.4
  },

  // Generacion del mundo: todo lo que se sortea una sola vez, al empezar, y que
  // hace que dos seeds no arranquen la misma partida (CONCEPTO §8).
  mundo: {
    dispersionStats: 7,
    exigenciaColegioMin: 20,
    exigenciaColegioMax: 95,
    toleranciaViejosMin: 15,
    toleranciaViejosMax: 90,
    apoyoEconomicoMin: 10,
    apoyoEconomicoMax: 90,
    potencialMedia: 62,
    potencialSpread: 14,
    potencialMin: 30,
    potencialMax: 100,
    pesoMetaInicialMin: 0.6,
    pesoMetaInicialMax: 1.6,
    fuerzaOrgSpread: 11,
    fuerzaOrgMin: 20,
    fuerzaOrgMax: 99,
    campeonesIniciales: 3,
    maestriaInicialMin: 25,
    maestriaInicialMax: 55,
    cantidadRivales: 5,
    rivalPotencialMedia: 66,
    rivalPotencialSpread: 15,
    formaInicialSpread: 0.35,
    probHandleConNumero: 0.25,
    numeroHandleMin: 1,
    numeroHandleMax: 99
  },

  // Las cinco formas de carrera de CONCEPTO §6. `picoEdad` es la MEDIA de la
  // edad de pico, no la edad de pico: cada jugador sortea la suya alrededor.
  // `caida` es cuanto pesa el declive despues del pico (el macro no la usa).
  formasCarrera: {
    precoz: { peso: 2, picoEdad: 20, picoSpread: 1.2, amplitud: 1.15, caida: 1.5 },
    estandar: { peso: 4, picoEdad: 23, picoSpread: 1.5, amplitud: 1.0, caida: 1.0 },
    meseta_larga: { peso: 2, picoEdad: 24, picoSpread: 1.5, amplitud: 0.92, caida: 0.45 },
    tardia: { peso: 2, picoEdad: 26, picoSpread: 1.8, amplitud: 1.05, caida: 0.9 },
    erratica: { peso: 1, picoEdad: 23, picoSpread: 3.0, amplitud: 1.1, caida: 1.2 }
  }
};
