// La versión del juego (FASE K, K1 — PLAN.md "K1 — decisiones de spec").
//
// Un desafío diario se comparte con su versión: "misma fecha y misma versión"
// tiene que garantizar "mismo juego", o comparar dos puntajes no significa
// nada. Por eso la versión viaja con la huella del motor: `HUELLA_JUEGO` es el
// `hash` de `calcularHuella()` de `src/dev/huella.js` (40 seeds × 30 splits,
// la tupla `finAnticipado:splitCount:soloqElo` de cada una). `validate.js`
// falla si la huella actual no coincide: un corrimiento del `rng` (trampa T1)
// o un cambio de balance que mueva las carreras obliga a subir `VERSION_JUEGO`
// y registrar el hash nuevo acá, a propósito y en el mismo commit. Cada bloque
// de corrimiento de la FASE K (A, B, C) sube la versión al mergearse.
//
// K2b (bloque A, corrimiento declarado — trampa T1): el partido pasa a ser una
// tirada contra la p declarada, la fuerza deja de tirar un dado por split y
// los compañeros se leen en vivo, y un traspaso fija la sinergia del plantel nuevo al
// firmar (una tirada más por traspaso). Ninguna seed de K1 reproduce su carrera.
export const VERSION_JUEGO = 'K2b';
export const HUELLA_JUEGO = 901891910;
