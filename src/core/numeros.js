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

// La probabilidad de ganar con una diferencia de fuerza y un σ COMBINADO:
// Φ((fp−fr)/σ), con la aproximación logística de la normal
// (`factorLogisticoNormal`). Con σ = 0 colapsa a un escalón (0, 0,5 o 1). Pura,
// sin RNG. K2b: es la matemática de `probabilidadDePartido`
// (`core/partido.js`), la p contra la que el motor tira cada partido y mapa.
export function probabilidadPorSigma(fuerzaPropia, fuerzaRival, sigma) {
  if (sigma <= 0) {
    if (fuerzaPropia === fuerzaRival) {
      return 0.5;
    }
    return fuerzaPropia > fuerzaRival ? 1 : 0;
  }
  const z = (fuerzaPropia - fuerzaRival) / sigma;
  return 1 / (1 + Math.exp(-BALANCE.numeros.factorLogisticoNormal * z));
}

// Fase 9Rd: la probabilidad de que gane un lado cuando cada uno tira alrededor
// de su fuerza con su propio ruido gaussiano:
// P(gauss(fp, σ₁) > gauss(fr, σ₂)) = Φ((fp−fr)/√(σ₁²+σ₂²)). Desde K2b el motor
// ya no tira dos gauss por partido (tira una vez contra la p de
// `core/partido.js`); esto queda como la versión de dos σ de
// `probabilidadPorSigma`, para quien razone con los dos lados por separado.
export function probabilidadDeGanar(fuerzaPropia, fuerzaRival, sigmaPropio, sigmaRival) {
  return probabilidadPorSigma(fuerzaPropia, fuerzaRival, Math.sqrt(sigmaPropio * sigmaPropio + sigmaRival * sigmaRival));
}
