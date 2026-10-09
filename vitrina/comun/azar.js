// PRNG decorativo y determinista para la vitrina (particulas, ruido, jitter visual).
// mulberry32 + un hash de cadena. No es el RNG del juego: es solo para que lo decorativo
// se vea igual en cada visita y en cada captura.

function hashTexto(texto) {
  // xmur3
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function crearAzar(semillaTexto = 'vitrina') {
  let a = hashTexto(String(semillaTexto));
  function siguiente() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    siguiente,
    entre: (min, max) => min + siguiente() * (max - min),
    entero: (min, max) => Math.floor(min + siguiente() * (max - min + 1)),
    elegir: (arr) => arr[Math.floor(siguiente() * arr.length)],
  };
}
