export const BALANCE = {
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
    mentalidadGain: 1,
    mentalidadSpread: 1.2,
    metaInfluenceBase: 0.8,
    metaInfluenceRange: 0.2
  },
  meta: {
    baseWeight: 1,
    maxDelta: 0.25
  }
};
