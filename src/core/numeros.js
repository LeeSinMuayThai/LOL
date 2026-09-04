import { BALANCE } from '../data/balance.js';

export function clamp(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

export function clampStat(valor) {
  return clamp(valor, BALANCE.stats.min, BALANCE.stats.max);
}

// Fase 9Rd: la probabilidad de que ganes un mapa/fecha, dado que cada lado tira
// alrededor de su fuerza con su propio ruido gaussiano — exactamente el modelo
// que ya usan `finalizarMapa` (systems/serie.js) y `resolverFecha`
// (core/temporada.js). P(gauss(fp, σ₁) > gauss(fr, σ₂)) = Φ((fp−fr)/√(σ₁²+σ₂²)),
// con la aproximación logística de la normal (`factorLogisticoNormal`). Cero
// RNG: el draft la usa para medir cuánta probabilidad mueve cada campeón y
// decidir si vale la pena frenar al jugador (9Rd), no para tirar el resultado.
export function probabilidadDeGanar(fuerzaPropia, fuerzaRival, sigmaPropio, sigmaRival) {
  const sigma = Math.sqrt(sigmaPropio * sigmaPropio + sigmaRival * sigmaRival);
  if (sigma <= 0) {
    if (fuerzaPropia === fuerzaRival) {
      return 0.5;
    }
    return fuerzaPropia > fuerzaRival ? 1 : 0;
  }
  const z = (fuerzaPropia - fuerzaRival) / sigma;
  return 1 / (1 + Math.exp(-BALANCE.numeros.factorLogisticoNormal * z));
}
