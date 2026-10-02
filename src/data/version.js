// La versión del juego (FASE K, K1 — PLAN.md "K1 — decisiones de spec").
//
// Un desafío diario se comparte con su versión: "misma fecha y misma versión"
// tiene que garantizar "mismo juego", o comparar dos puntajes no significa
// nada. Por eso la versión viaja con la huella del juego entero: `HUELLA_JUEGO`
// es el `hash` de `calcularHuellaJuego()` de `src/dev/huella.js` (40 seeds × 60
// splits, la tupla `seed:fin:splitCount:elo:total:nivel:leyenda` de cada una:
// la carrera completa Y su puntaje). `validate.js` falla si la huella actual no
// coincide: un corrimiento del `rng` (trampa T1), un cambio de balance que
// mueva las carreras o uno de `BALANCE.puntaje` que mueva el número obliga a
// subir `VERSION_JUEGO` y registrar el hash nuevo acá, a propósito y en el
// mismo commit. Cada bloque de corrimiento de la FASE K (A, B, C) sube la
// versión al mergearse. (La huella de 30 splits de `calcularHuella`, la de la
// trampa T1, es otra y no se registra acá.)
export const VERSION_JUEGO = 'K1';
export const HUELLA_JUEGO = 1330031145;
