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

// K6a-U: la seed que escribe el jugador (el input de la pantalla de inicio o `?seed=` de la URL). Un número es la seed
// de siempre (valor absoluto, entero); un texto ("pepe") ya no se ignora sin avisar: es la misma carrera cada vez que
// se escribe lo mismo, con el hash del motor. Vacío no es seed (`null`: la sortea el reloj). Pura, sin DOM ni RNG.
export function interpretarSeed(crudo) {
  const texto = String(crudo ?? '').trim();
  if (texto === '') {
    return { seed: null, desdeTexto: false };
  }
  const numero = Number(texto);
  if (Number.isFinite(numero)) {
    return { seed: Math.abs(Math.trunc(numero)), desdeTexto: false };
  }
  return { seed: hashCadena(texto), desdeTexto: true };
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
