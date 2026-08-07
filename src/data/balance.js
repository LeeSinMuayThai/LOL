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
  }
};
