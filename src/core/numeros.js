import { BALANCE } from '../data/balance.js';

export function clamp(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

export function clampStat(valor) {
  return clamp(valor, BALANCE.stats.min, BALANCE.stats.max);
}

// Hash determinista de un string a un entero no negativo. Sirve para elegir una
// variante de una lista "al azar pero sin azar": el mismo texto y el mismo split
// eligen siempre lo mismo, y no se toca el stream del RNG inyectado (regla
// invariable 1). Nació duplicado en systems/rendimiento.js y systems/temporada.js
// (fase 9R0a/9R0d); la fase 9R.3 lo unifica acá porque la variación léxica de
// `outcome.texto` lo necesita también.
export function hashCadena(texto) {
  let h = 0;
  for (const caracter of String(texto ?? '')) {
    h = (h * 31 + caracter.charCodeAt(0)) | 0;
  }
  return Math.abs(h);
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
