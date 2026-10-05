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
// K4-C2 (398714982; bloque B, sigue en el corrimiento de K4): el pase de contenido sobre las bifurcaciones. Nueve
// bifurcaciones nuevas (cambio de región hacia afuera de Corea, hacia la LPL y hacia la LCK; el canal de tiempo
// completo; el cambio de línea; los playoffs infiltrado; el sponsor contra la org; el coach que te baja del cinco; la
// oferta de staff) y los eventos de seguimiento que leen los caminos que dejan en `flags.caminos`. Ninguna seed de K4
// reproduce su carrera.
//
// K5 (1153610693; bloque C, corrimiento aceptado — T1): el mundo, la integración de K5-A, K5-B y K5-C. K5-A, el
// Mundial de verdad: Swiss de 16 y bracket de 8 en core/internacional.js, sin rng para los ajenos; escena ya no sortea
// al campeón del mundo y serie ya no sortea al rival internacional. K5-B, la región: LRN y LRS entran al mundo (más orgs
// y tier 3 sorteados), el calibre de una liga en el mercado es el nivel real de sus clubes y no su prestigio (D78: LCK
// y LPL se juegan) y dos rivales del mismo rol ya no se pisan en la misma org; elegir la región sorteada no corre el
// stream. K5-C, el final lo decide el mercado: sin oferta en tu tier, la bifurcación `fin_mercado` (bajar, esperar o
// colgar el mouse) y el motivo del retiro en la tarjeta. Ninguna seed de K4-C2 reproduce su carrera.
// K5 (revisión): el hash de los cruces ajenos vuelve a ser un uniforme en [0, 1) (el Mundial deja de tener dueño), el
// calibre de liga es un cuantil bajo por org y los asientos ofrecibles post-mercado se congelan, el hype del Mundial
// escala con el resultado, el mundo amateur renueva contratos NPC, a los 34 no hay mercado, cambiar de línea rearma la
// tier list, y el banquillo de un club extranjero puebla la academia a la que te cede (`conPlantelesDe`: una tirada
// nueva solo en ese camino). Misma versión (la rama no se mergeó): la huella de la integración (1153610693) queda
// reemplazada.
// K4c-S (misma versión: el bloque B no se mergeó; 276794090): la prueba (tryout) decide el contrato — una tirada nueva en el
// tryout del mercado y en el del amateur, y la firma que no se da (la oferta se cae, la firma se posterga) cambia las carreras
// enteras desde el primer tryout. El renglón de parche adjunto no mueve la huella. Reemplaza a 1197795265 (K5).
// K4c-M (1053992261; bloque B, sigue en el corrimiento de K4): el pase de contenido sobre la fecha marcada. Las dos opciones de
// cada evento de data/events/partido/ dejan de dar el mismo `partido`: una pesa en el resultado (media +0,08) y la otra cede
// partido (media -0,05) a cambio de mentalidad, hype, sinergia o un stat de habilidad; las compensaciones suman una
// tirada de rng por opcion. Misma versión (la rama no se mergeó): la huella de K4c-F/K5 (1197795265) queda reemplazada.
// K4c-S + K4c-M juntos (integración del supervisor): reemplaza a 276794090 (S) y 1053992261 (M).
// K4c (integración, 2122951563): volver de un retiro hecho en el split del pase arma el roster de la org del contrato
// antes de la temporada de la vuelta (`armarRosterAlVolver`: la fila abre con el split del pase adentro, y las tiradas del
// roster nuevo corren en ese split). Misma versión: reemplaza a 1224074643.
// K4c (paso 3a, 922534647): las constantes del ritmo (umbral de sin-nada-en-juego 6, prensa solo tras un escándalo, ventana de la
// fecha que define 4, tres mecánicas con `mapa_decisivo`, el plan de serie ×3) y D76 al cerrar la carrera (el split del pase
// sin fila se asienta: el puntaje lo cuenta). Misma versión (el paso 3b la pasa a 'K4c' y sube VERSION): reemplaza a 2122951563.
// K4c (paso 3a, arreglos; 805410138): la prueba fallida del mercado firma el respaldo que anuncia en vez de re-abrir la
// parada (K4-D), la prueba en 0,65 / 0,8 / 0,95 y la ventana de la fecha que define en 6. Misma versión (el paso 3b la pasa
// a 'K4c'): reemplaza a 922534647.
// K4c (bloque B cerrado, paso 3b): `VERSION_JUEGO` pasa a 'K4c', la versión del ritmo calibrado (la serie como plan, la prueba que decide
// el contrato, el cierre de año como decisión, el plan anual y la pretemporada solo para el mercado). El paso 3b (la limpieza del plan
// anual, los checks duros del ritmo, el guardado VERSION 11 y los cuantiles) no toca el rng: la huella es la del plan anual, 1616394605,
// que reemplaza a todas las anteriores del bloque B (922534647, 805410138, 2044679379, 1157384592...) y a la de K5 (1401713881).
export const VERSION_JUEGO = 'K4c';
// K4c (cierre de año, 2044679379): los 10 eventos de cierre_edad.json pasan a ser decisiones con intercambio (tres opciones, efectos
// del orden de las bifurcaciones, un pool que aprende, riesgos en los outcomes): cambian las tiradas del cierre y con ellas las carreras
// enteras. Misma versión (el paso 3b la pasa a 'K4c'): reemplaza a 922534647.
// Integración de los arreglos del paso 3a y el cierre de año, con la ventana en 7 (supervisor): reemplaza a 805410138 y 2044679379.
// K4c (plan anual, 1616394605): la práctica deja de frenar; el cierre de año fija el plan y cada split pro entrena solo su tramo
// (otra cuenta de tiradas por año, y la preparación ya no la elige el bot en la pretemporada). Misma versión: reemplaza a 1157384592.
// K4c (revisión, 348923166): el cierre amateur no fija plan (al debutar vale el del perfil: cambian las carreras que antes debutaban
// con el plan de un cierre amateur) y la prueba del mercado fallida sin respaldo no suma a la racha sin ofertas ni te deja libre por
// silencio. Misma versión: reemplaza a 1616394605.
// K4c (revisión, textos, 1625568496): el cierre de año no repite el evento del año anterior (cooldown de 4 splits, 99 el del primer balance),
// así que cambia qué carta cae y con ella las tiradas del resto de la carrera. Misma versión: reemplaza a 1616394605.
// Integración de las dos revisiones (supervisor): reemplaza a 348923166 y 1625568496.
// K5c (motor, 992471283): la vuelta del retiro adelanta el reloj (calendario y edad) lo que pasó afuera, y con la edad de la vuelta
// en la línea Faker la ventana se cierra sola. Misma versión: reemplaza a 2001539523.
// K5c-R (años pro, 579585404): los años pro se cuentan desde el primer contrato de tier 2 o tier 1 (`career.splitPrimerContratoTier2`), no
// desde `splitFichaje` (tier 3). Las carreras son las mismas (el marcador no toca el rng; con la definición vieja la huella da 992471283):
// cambia el eje de años de la leyenda comparada (`aniosProDe`, `core/puntaje.js`) y con él la leyenda de la tupla. Misma versión:
// reemplaza a 992471283.
// K6a-M (motor y ritmo, 319240573): toda serie de eliminación frena (el umbral de "sin nada en juego" ya no se les aplica), tier 2
// define el título en una final entre los dos primeros, "define la clasificación" solo en el split de cierre, un tier 3 no se
// resuelve antes de que juegues un split con él, y el torneo de mitad de año pide el equipo primero. Cambia el stream (más
// paradas en playoffs). Misma versión (12, no salió): reemplaza a 579585404. La integración la vuelve a registrar.
// K6a-A (el amateur y las decisiones, 871362456): la semana amateur la resuelve el perfil y frena solo con un riesgo evitable
// (cambia cuándo se consume el rng del reparto), el proyecto juvenil y el scout frenan como bifurcación (oferta), el proyecto
// juvenil se ofrece hasta los 17 (roster sub-18) y la opción que retira de "El canal ya paga más" pasa al final. Misma versión:
// reemplaza a 579585404; la integración de K6a la vuelve a registrar.
// K6a (integración, 505125930): K6a-M (las series de eliminación y la final de tier 2 frenan, la fecha que define solo en el split
// de cierre, el tier 3 que se juega antes de resolverse) más K6a-A (la semana amateur que resuelve el perfil, las ofertas que
// frenan, el retiro al final de las opciones), juntas sobre lo que k5c-instrumento sumó después de 75e7ed5 (e5fdd65, b2c08f5, fddb82b).
// K6a-U no mueve el rng (textos y pantallas) y la ventana de retiro ya preguntaba una vez por año (el check de D-B no toca el
// motor). Misma versión (12, no salió): reemplaza a 319240573 (K6a-M) y 871362456 (K6a-A).
// K6a-R (el ritmo de la eliminación, 860000955): una serie de eliminación que no es final y está cantada (la p del plan del coach
// fuera de [0,3, 0,7], `serie.plan.pAbiertaEliminacion`) no frena en el plan: la juega el plan del coach y frena solo en el mapa
// decisivo. Cambia el stream (los planes que elegía `criterio` en esas series). Misma versión (12, no salió): reemplaza a 505125930.
// K5c (no-pro, 2039436444): la semana amateur la elige el perfil solo entre las rutinas que rinden al menos su `pisoSoloQ` del LP
// de la mejor (data/perfiles.json: leal y profesional 0,6), la previa evalúa la casa con la confianza proyectada (la que lee el
// motor después del reparto: cambia cuándo frena la semana) y `scoutingSesgoEtario` se ablanda a los 18-20. Cambia qué rutina
// sale y cuándo se consume el rng del reparto. Misma versión (12, no salió): reemplaza a 860000955.
// K5c (el bloque C calibrado, 1462997803): Final2 (las claves de balance fijadas) y la LPL en 91, el no-pro con piso de soloQ por perfil,
// las cartas de cierre del declive y El GOAT = nuevo Faker. Cambia el stream (otras carreras en todas las ligas). Misma versión
// (12, no salió; `VERSION_JUEGO` sigue en 'K4c'): reemplaza a 2039436444.
export const HUELLA_JUEGO = 1462997803;
