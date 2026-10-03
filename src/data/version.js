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
//
// Historia: K1 (797088273, la primera) · K2b (1414810287; bloque A, corrimiento declarado
// — trampa T1, mergeado sobre K1): el partido pasa a ser una tirada contra la
// p declarada, la fuerza deja de tirar un dado por split y los compañeros se
// leen en vivo, y un traspaso fija la sinergia del plantel nuevo al firmar
// (una tirada más por traspaso). Ninguna seed de K1 reproduce su carrera. (Los
// números que K2b registró en su rama, 1112981938 y 901891910, eran de la
// definición vieja de 40 × 30 splits sin puntaje: no valen acá. 901891910
// sigue siendo la huella de `calcularHuella`, la de la trampa T1, del motor
// mergeado: la revisión de K1 no toca el `rng`.) · K2c (345156314; bloque A, paso 2 de 2): las
// constantes del candidato (meta acotado a 0,9-1,1, maestría 0,1, σ de mapa ~18, referencias
// medidas en el motor integrado) y `BALANCE.temporada.vueltas` en 2, elegido por barrido
// (PLAN.md, K2c). El fixture de la temporada tiene el doble de fechas: ninguna seed de K2b
// reproduce su carrera. · K3c (577913468; bloque A, el último paso): los valores medidos
// del bloque A (PLAN.md, K3c) — la consistencia (k = 0,5), la mentalidad y el hype que vuelven
// a su base (r = 0,2 con subida 0,05, tope de descanso 70, rH = 0,6), los efectos que duran
// (fracción 0,3 para eventos y práctica) y el umbral de pausa del draft (0,0818 / 0,0409). Las
// carreras cambian de cabo a rabo: ninguna seed de K2c reproduce la suya. · K4 (297911861; bloque B,
// corrimiento aceptado — T1): el ritmo. K4-A, la fecha marcada es la que decide algo (una por split, sin draft); K4-B,
// la serie como plan de Fearless (el rival también quema, frena solo en el mapa decisivo, la charla del coach, la
// prensa solo tras una final); K4-C, solo frenan las bifurcaciones y el perfil resuelve el resto (y la prueba de cada
// salto); K4-D, la pretemporada en una sola parada. Ninguna seed de K3c reproduce su carrera.
//
// K4-C2 (1063725684; bloque B, sigue en el corrimiento de K4): el pase de contenido sobre las bifurcaciones. Nueve
// bifurcaciones nuevas (cambio de región hacia afuera de Corea, hacia la LPL y hacia la LCK; el canal de tiempo
// completo; el cambio de línea; los playoffs infiltrado; el sponsor contra la org; el coach que te baja del cinco; la
// oferta de staff) y los eventos de seguimiento que leen los caminos que dejan en `flags.caminos`. Ninguna seed de K4
// reproduce su carrera.
export const VERSION_JUEGO = 'K4-C2';
export const HUELLA_JUEGO = 1063725684;
