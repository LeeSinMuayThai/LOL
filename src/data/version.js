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
export const VERSION_JUEGO = 'K1';
export const HUELLA_JUEGO = 2128736563;
