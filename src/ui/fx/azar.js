// El PRNG decorativo del kit (PLANUI §9.2; portado de vitrina/comun/azar.js): mulberry32 sobre un hash de texto (xmur3).
// NO es el RNG del juego ni `rngUi` (ese es solo de los minijuegos): es para que lo decorativo (las particulas, el
// ruido del sonido, el confeti, el chat de relleno) se vea igual en cada visita y en cada captura.
//
//   crearAzar('a-luz-ambiente')  la semilla textual de la vitrina (asi el ambiente dibuja los mismos haces que ella)
//   azarFx(seed)                 lo decorativo de UNA carrera: mulberry32(hash(seed + ':fx'))
// Puro: corre en Node.

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

// El azar decorativo de una carrera (PLANUI §9.2): la seed del juego con el sufijo ':fx', para no correr nunca el
// stream del motor ni el de los minijuegos.
export const SUFIJO_FX = ':fx';
export const azarFx = (seed) => crearAzar(`${seed ?? ''}${SUFIJO_FX}`);
