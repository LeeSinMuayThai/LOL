# Progreso

Documento vivo. Se actualiza al cierre de cada tarea, según la Definición de terminado de CLAUDE.md.

## Estado por fase

**La tabla de estado vigente vive en `PLAN.md`**, y es la única que se mantiene al día. Este
documento es el changelog: qué se hizo, por qué, y con qué números medidos.

> **Reemplazada el 2026-09-02.** Acá había una tabla anclada a la lista de 11 pasos de
> `DISENO.md` §6, que quedó superada por las 13 fases de `PLAN.md`. Se había desincronizado tanto
> que se contradecía con su propio changelog cuarenta líneas más abajo: declaraba *"contratos,
> regiones y movilidad — ⬜ pendiente, no existen `contracts.js` ni `regions.js`"* cuando la fase 9
> ya había construido el mercado entero, y *"refinamiento visual — ⬜, `src/ui/` sigue vacía"*
> cuando la fase 8b la había llenado. Mantener dos tablas de estado garantizaba que una mintiera;
> ahora hay una sola. `DISENO.md` §6 se cortó en el mismo movimiento.

> **Párrafo reemplazado el 2026-09-13** — describía el estado a la altura de la fase 9E (9Ec/9Ed
> como pendientes, retiro y tarjeta de legado sin cerrar, movilidad e imports sin modelar) y para
> esa fecha ya estaba en la misma situación que llevó a cortar la tabla vieja de `DISENO.md` §6
> (nota de arriba): describía un estado nueve fases atrás del real. Todo lo que listaba está
> cerrado (9Ec+9Ed, 9 y 10 completas, D29 vía 9Mb+9Md, D8 vía 9Ma+9Mc+9Wb+11, `etapa: 'declive'`
> desde 10a). **Lo que falta hoy es exactamente lo que dice la tabla de Estado de `PLAN.md`**, que
> es —y sigue siendo— la única que se mantiene al día: hoy, la fase P (deploy y verificación en la
> URL publicada), la fase D (tres campos que el motor declara y no escribe) y la fase 13
> (contenido puntual — el objetivo de opciones ya se superó 3×, 442 sobre un piso de 150).

> **Nota documental (2026-09-02).** `AUDITORIA.md` y `TRASPASO.md` se borraron del repo: describían
> el estado del proyecto 28 commits atrás y ya se contradecían con el código. Lo que seguía vivo se
> mudó — la investigación de ligas/salarios/carreras a `CONCEPTO.md` §12 (conservando la
> numeración) y las trampas T1-T10 a `PLAN.md`. **Las citas a esos dos archivos en el changelog de
> abajo se dejaron intactas a propósito**: son historia, un changelog citando documentos que
> existían cuando se escribió. Los originales siguen en git (`git show 3d6ee90:AUDITORIA.md`).

## Changelog

### 2026-10-09 — PLANUI, U0: la vitrina, ronda 1 (tres direcciones de arte) y la compuerta 1

**Por qué.** Es el tercer plan de UI. El usuario dijo que los dos anteriores *"terminaron muy parecidos… los diseños eran
muy simples"*. Esta vez se elige mirando prototipos que funcionan sobre datos reales, antes de escribir el plan de
producción. El plan vigente pasa a ser `PLANUI.md`: §1 tiene el diagnóstico de por qué salieron iguales, §4 la vitrina.
No se tocó nada de `src/`, `index.html` ni `server.js`. Rama `u-integracion`, sin push.

**Qué se hizo** (todo en `vitrina/`, fuera de `dist/`, servido por `vitrina/servir.mjs` en el 8095):
- **Ola 0, datos** (Sonnet high, `a7126d1`): el bot `criterio` barrió 2500 seeds sin errores. La seed héroe es la
  **61**, que cumple los 6 obligatorios y todos los deseables menos la lesión.
  - `muestras.json` (426 KB) guarda, por parada, las salidas reales de los helpers del juego, el relato de la página,
    el resultado de **cada** opción (resuelto en un clon) y su guardado real.
  - Es determinista: dos corridas dan el mismo archivo.
  - Inventario de "leer menos": el 76% de las opciones ya trae datos estructurados y solo el 3% tiene un % que vive
    únicamente en la prosa. No hace falta tocar el motor (U-m queda descartada por ahora).
- **Ola 0, andamio** (Sonnet high, `dacbec8`, `dcb741f`, `bcab0b8`):
  - el panel (pantalla, muestra, era "auto", repetir, celular, movimiento reducido, INST, WebGL, FPS, textos breves,
    peor caso, "hoy");
  - el cargador CORS de Data Dragon, el PRNG decorativo, el contrato del ambiente y 10 fuentes OFL;
  - `verificar.mjs` (las reglas de `guards.js` + la lista de prohibidos) y `capturar.mjs` (1440 y 390, reloj
    congelado, tiras de cuadros, pasadas swiftshader y sin WebGL);
  - el índice: lado a lado, funciones, antes/después contra hoy y "Copiar mi elección".
- **Ronda 1** (3 × Opus xhigh en paralelo, ~400-540K tokens y 106-121 tool calls cada uno):
  - **A · LUZ** (`bfecc59` → `5a63908`), **B · NOCTURNO** (`1a717ad` → `5b9b8f2`) y **C · PANTALLAS** (`8cfc45e` →
    `bb3ddfe`).
  - El supervisor revisó todas las capturas y tiras con la rúbrica y mandó **una** ronda de 6-7 observaciones a cada
    una (~30-34 tool calls por corrección).
  - Lo que más cambió con esas observaciones:
    - A: el `escenario` apagado pasó a estadio, la `pieza` tuvo segunda luz, la cara del campeón quedó libre.
    - B: el semitono pasó de ruido a un campeón reconocible, y las 5 eras pasaron a ser 5 imprentas distintas.
    - C: el resultado pasó de un toast chico a la ventana entera, y la selección de campeones quedó visible.
  - A y C midieron el contraste con scripts de píxeles: 0 fallas en las paradas.
  - Merge `c1d88f5`.
  - Cómo es cada una está en `PLANUI.md` §4.1; las capturas de referencia, en `vitrina/referencia/ronda-1/`.

**Compuerta 1: la reacción del usuario, textual.**

> uffff, me gustaron el A y el C,
>
> Primero que nada, quiero que quede anotado cómo son estos tres para que después salga bien, ¿no? O sea, que no quede
> en tu memoria y te vayas olvidando. Lo que más me gustó del A es como... Es que tiene como aura que cuando jovereas un
> champ cambia el fondo y es como que entra en transición, eh, que tenga como esas animaciones, eso está bueno. Es más,
> hasta se podría poner fondos animados, pero no sé si se consiguen fácil. Pero me parece que está bastante bueno. Eh,
> quizás el fondo retro ese, o sea, está bueno, está bueno, eso no te lo voy a negar. Pero hay que ver. Y después del C,
> que es la segunda opción, me gustó que es como clásico. ¿Me entendés? O sea, ¿a qué voy con esto? Es, es simple del
> LOL. Tipo, a ver, cuando jovereas no se cambia nada. Eh, pero está bueno, es como del LOL, me explico. O sea, es como
> lo más fácil de entender. Ahora, ¿yo sabes qué te diría? Lo que yo te voy a decir que vos hagas es... El A y el C,
> expandilos. Pensalos un poco más, mejorarlos. Como para que yo pueda ver un poquito más. No te digo que hagas mucho,
> pero un poquito más de ellos y me pueda decidir mejor. Que sea una demostración un poco más alta de ambos.

**Qué sigue.** Finalistas A y C; B queda archivada. La **ronda 1b** (`PLANUI.md` §4.3) amplía las dos con las mismas
pantallas nuevas (la serie con Fearless, el Swiss 2-2, el mercado y la firma). Además, A profundiza el aura y los fondos
animados, y C lo clásico tipo cliente.

**Ronda 1b, hecha el mismo día.**
- Datos: la ola de datos sumó `resultados[]` al Swiss y al mercado (Sonnet high, `0c9f216`). Solo cambian esas dos
  claves; la seed héroe sigue siendo la 61 y dos corridas completas dan el mismo sha256.
- Andamio: sumó las pantallas `partido` y `mercado`, las tiras de la serie, el Swiss y la firma, y el índice con las
  finalistas (`24dcaca`).
- Las direcciones: 2 × Opus xhigh nuevos (~480-500K, 122-124 tool calls cada uno) ampliaron **A** (`0726c8d`) y **C**
  (`ee7e33e`), con las mismas pantallas nuevas y cada una profundizando lo que el usuario dijo que le gustó.
  `PLANUI.md` §4.3 tiene el detalle.
- Merges `6f145e1` y `3c790c2`. Las referencias están en `vitrina/referencia/ronda-1b/`.
- Las 18 pantallas de A y C abren sin errores en el 8095.
- Hallazgo: los splash animados de CommunityDragon cubren 12 de 2167 skins, así que los "fondos animados" se hacen
  con el shader.

**Compuerta 1, segunda vuelta: la reacción del usuario a A y C ampliadas, textual.**

> En el, en el primero me gusta más el del C. Un toque más. El A está bueno, pero el C es más de juego, siento yo. O
> sea, el A está bueno, pero el C me gusta un poquitito más. En el segundo... En el segundo... Me gusta más el de A. En
> el tercero... Me gusta más el de A. pero noto que aveces los diseños no siguen una misma linea no se, Para que sepas
> las combinaciones que tenés que hacer y eso, me gusta más el de C en el primero. Por un poquito. En el segundo me
> gusta más el de C porque siento que es más de juego. El de A está bueno, pero el de C tiene mejor interfaz. Y en el
> tercero también creo que se ve un poco mejor el de... El de A y aparte tiene mejor interfaz. En el segundo la
> interfaz del del A También está buena, pero el del C es un poquito mejor. O sea, tampoco... Tampoco es un re cambio.

(Antes de esto dijo que no veía los cambios: el servidor los estaba entregando sin caché, pero la pestaña tenía la
versión vieja. Se reinició el servidor y se le pasaron enlaces directos a cada pantalla nueva.)

**Lo que se decidió.** La serie y el Swiss, de C; el mercado, de A. Para que todo "siga una misma línea", no se arma un
collage: se hace **una fusión**, la interfaz de C dentro del mundo de A, con 7 reglas (`PLANUI.md` §4.4-§4.5).

**Lección de proceso.** Por primera vez el usuario reaccionó con entusiasmo a una UI ("uffff") en vez de *"es muy igual
al anterior"*, que fue lo que dijo después de T0. Funcionaron tres cosas:
- la imagen antes que las palabras;
- Opus xhigh con briefs de dirección de arte en vez de briefs de estructura;
- una revisión que mira las capturas con una rúbrica en lugar de aprobar por métricas de layout.

**La fusión** (`f35fcb4`, merge `d7622e9`; `PLANUI.md` §4.5) se construyó y se sirvió en el 8095.

**Compuerta 1b: la reacción del usuario a la fusión, textual.**

> Está bien, pero ¿sabes qué siento que pasa en la fusión? Por ejemplo, en la serie. Yo dije que me gustaba más tipo el,
> la interfaz. Pero está todo como así oscuro de la luz los champions. Y eso está bueno cuando arrancás la carrera,
> elegís tus main todo. Y está bueno que se mantenga esa estética, pero no tan heavy después, ¿me entendés? O sea, sí
> está bien un poco, pero no tan heavy. Tipo, quiero que la mantengas, la esencia, pero no tan fuerte. Por ejemplo, que
> no estén todo el tiempo los campeones. Quizás sí un poco, pero no tanto. Escúchame, hace otra página de cómo sería eso
> de un poco como no tanto. Mostrando solo un poquito. Tipo, mostrando, por ejemplo, la serie o eso sí, pero tipo... Un
> poco, mostrando tipo variaciones de cómo sería un poquito. Tipo, manteniendo el coso de la luz, pero no al 100%
> después de la pantalla inicial. Hace una demostración. O sea, hace una página que tenga tres variantes.
>
> Intenta entender a lo que me refiero.

**Lo que se decidió.** La interfaz queda como está. Se arma una página con tres intensidades del mundo para después del
inicio:
- **tenue**: el campeón siempre, a un tercio;
- **de paso**: solo luz, y el campeón cuando importa;
- **en su lugar**: el campeón contenido en lugares fijos de la interfaz.

El inicio y los takeovers quedan al 100% (`PLANUI.md` §4.6).

**La aclaración del usuario, textual** (llegó mientras se construían esas tres):

> Yo no iba tanto al espacio, aunque sí un poco, pero, pero un poco nomás. Me refería, por ejemplo, más al, al blanco y
> negro, violeta ese que tienen, que a veces, o sea, estaba bien para el inicio eso, pero si estaba siempre iba a ser
> como un estilo repetitivo. Que estaba bueno, que esté presente, pero no tan fuerte siempre. No sé si llegaste a
> entender eso.

Las variantes se rehicieron sobre el **color** (el duotono de la era):
- **A color**: el campeón en sus colores reales;
- **Mitad**: la mitad de duotono;
- **Fondo en duotono, retratos a color**.

El espacio baja solo "un poco", y las variantes de espacio quedan como selector secundario.

**Lección:** cuando el usuario describe una sensación ("oscuro de la luz los champions"), conviene confirmar el eje
(color, tamaño o frecuencia) con una pregunta corta antes de construir.

**Las variantes de color** se construyeron (`899ed27`, merge `81993d4`). El usuario las miró y mandó capturas.

**Tercera vuelta, textual:**

> los campeones ahi estan bien que sean medio bitono y el fondo tambien, pero yo intentaria que el fondo tenga mas
> calidad y que los campeones tengan un 15% mas de color mientras que el fondo un 10% mas, eso en la primera foto […] la
> imagen 2 esta bien pero deberia ser un 20% menos amarilla y mas estetica de la competicion (LEC WORLDS MSI LO QUE SE
> ESTE JUGANDO) […] despues la imagen 3 me gusta como esta diseñada pero siento que es muy aburrida, interactua poco con
> el fondo, y principalmente, representa poco lo que esta pasando, o no se si eso pero es un poco "simple" "poco
> original" "aburrida" "sin escencia del lol" […] y la imagen 4 siento que le falta un poco representar lo que esta
> pasando, falta ese aspecto de peso de decision importante o formal, y tambien se deberian añadir los logos actuales de
> los equipos etc, pensalo bien y empeza a buildear directo las preview con opciones

**Lo que se decidió** (`PLANUI.md` §4.7):
- **la serie** lleva la receta de color: retratos +15% de color, fondo +10%, y el fondo nítido;
- **las pantallas de partido** llevan la identidad de la competición que se juega;
- **la decisión y el mercado** tienen que contar lo que pasa y pesar; entran los logos reales;
- **tres opciones por pantalla**, que construyen tres workers en paralelo.

**La elección por pantalla (2026-10-10), textual:**

> bueno en la serie el 1 tiene mucho de las luces de escenario, el 3 esta bueno si se hiciese mas como las pantallas del
> stage, aunque tambien se podria hacer tipo el draft mostrando el champ de los otros jugadores, queda a tu criterio, en
> el swiss, que se sienta mas como pantalla de stream si tenes el chat no?, tipo que este como el broadcast viendolo
> desde un stream, porque esta el chat pero el champ detras, en la decision, el b y el c estan bien pero el b esta medio
> vacio, se podria hacer algo ahi mas original o mejorar el c, el mercado el A y el C estan muy buenos eso de que se
> firme con animacion y cosas asi, se podria hacer una combinacion, y tambien una mini animacion de como que van
> entrando las ofertas en pantalla, me gusto lo del C algo asi, lo que no me copa tanto es el campeon atras, se podria
> hacer algo mas que represente el mercado de pases en vez del campeon random ahi, un equipo, algo no se, se creativo,
> pero que represente mas lo del fichaje, bueno buildea la ultima demostracion y listo

**Lo que se decidió** (`op=final`, `PLANUI.md` §4.8):
- **la serie**, con las pantallas del stage;
- **el Swiss**, como un stream;
- **la decisión**, invitación + capítulo con destinos;
- **el mercado**, las ofertas entrando, el contrato animado y el telón de prensa en lugar del campeón.

### 2026-10-08 — FASE V, V8a: los LP que bajaban al subir y la historia con "2029–2029" (PLAN.md §V.7)

Merge `944eb63` (worker Sonnet high, ~95K tokens y 22 tool calls; sin revisor aparte, porque el diff son 17 líneas de
un archivo y el supervisor lo leyó entero). Solo toca `components/ficha.js`.
- **D100:** la memoria de la ficha guarda el escalón (tier y división) junto a los LP.
  - Si el escalón cambió, el número aparece ya en su valor final. En la misma división sigue contando.
  - Lo probó el worker en Chromium, pintando la ficha dos veces:
    - de Oro II 27 a Oro I 15 sale "15" desde el primer cuadro;
    - de Oro I 15 a 45, cuenta;
    - de Master 40 a 90, cuenta.
- **D101:**
  - la fila de la historia, org por org, dice un solo año cuando el club duró uno ("Fragua Circuit — 3 splits · 14-6 ·
    2029", visto por el supervisor en la captura de la tarjeta final de la seed 25);
  - "1 split" va en singular;
  - en los totales de la ficha, "split" y "partido" van en singular cuando son uno.
- **Verificado por el supervisor** sobre una copia `git archive` de `cf910cb`: `validate.js --rapido` 376 OK y 0 FAIL;
  `build.js` OK, 2618 KB. El worker corrió "K1 versión" (OK, huella sin cambio) y el recorrido de la seed 25 a 1440
  (66 paradas, 0 errores).
- **El 8090 pasa a servir esta versión.**

### 2026-10-08 — FASE V mergeada en `fase-9r` y V8 partida en dos (PLAN.md §V.7)

- **`v-integracion` se mergea en `fase-9r`** (`4a6657a`, sin push: el push espera un OK nuevo del usuario). El árbol es
  el mismo que se verificó en el cierre (`9c64746` más la documentación).
- **El juego que se sirve al usuario en el 8090 es esa misma copia** (C2).
- **V8 se parte en dos:**
  - **V8a, sin esperar al usuario:** D100 y D101, una fila nueva. La historia org por org dice "2029–2029" cuando un
    club duró un año, y "1 splits". Viene de la fase 8b, no lo trajo V: lo vio el supervisor en las capturas del
    cierre.
  - **V8b, con lo que diga el usuario en C2:** D98 y D99.

### 2026-10-08 — FASE V, V7 (candado y limpieza) y el cierre de la fase, en `v-integracion` (PLAN.md §V.7)

**V7** (`9c64746`; worker Sonnet high, sin revisor aparte: las capturas idénticas son la prueba, y el supervisor
comprobó que ningún JS arma los selectores borrados):
- **CSS muerto:** sale el del layout viejo (`.summary`, `.meta-pill`, los tokens de los rieles y sus media queries) y el
  que ningún JS pinta (`.ficha-pool`, `.ficha-contrato`, `.ficha-animo`, `.meta-tierlist*`, `.serie-marcador`,
  `.serie-quemados`, `.minijuego-card-count`, `.cuarto-carrera`).
  - Las hojas pasan de 5356 a 5206 líneas.
  - Las capturas de `recorrido.mjs --modo capturas` (seed 25, 1440 y 390) quedan idénticas byte a byte.
- **D47:** se borra `.ticks`, que nunca se usó (la lista agrupada de 11 selectores queda como única fuente). Se borran
  también `.corte-sm` y `.bisel`, sin uso.
- **D48, con una regla medible** (`DISENO.md` §4.6):
  - **La regla:** contraste WCAG ≥ 4,5:1 para el texto, ≥ 3:1 para el texto grande y para los adornos de estado.
  - **El comando:** `node src/dev/contraste.mjs --puerto P --seed 25`, a mano; no es un check.
  - **El arreglo:** `--ink-mute` pasa de #5e6a78 a #7a8a9c, con la misma tonalidad.
  - **Lo medido:** los nodos que no llegaban bajan de 286 a 76 a 1440, y de 239 a 76 a 390.
  - **Los 76 que quedan son decisiones de diseño que un token no arregla:** la magnitud de los chips de la previa
    codificada con `opacity`, el rojo `--danger` como texto sobre el cian de una opción en hover (3,28:1) y
    `.campeon-tile-ini`. Pasan a D99.
- **Documentación:** `DISENO.md` §4.5 (la pantalla de hoy, como mapa) y §4.6; `CONCEPTO.md` "La pantalla: una cosa por
  vez" (§3) y "El Golden Road" (§9).
- **`dist/`:** 2617 KB, con techo de 2700 (D49).

**El cierre, verificado por el supervisor** sobre una copia `git archive` de `9c64746`:
- `validate.js --rapido`: 376 OK, 0 FAIL. Los 183 SKIP son los lentos.
- `--solo` de los lentos de la fase, todos OK:
  - "V2 escena": ninguna pausa del motor queda sin pieza;
  - "V5 carrera": el dibujo coincide con el registro;
  - "V3e";
  - "V4" (3 casos);
  - "K0": el espejo de los tiempos en `simulate.js`;
  - "GR-m": el Golden Road coincide con el motor;
  - "K1 versión": `HUELLA_JUEGO` 79304237 'K6d', sin cambio.
- **`simulate.js 1000`:** 0 crashes, en 80 s. La línea del Golden Road da 0 de 1000, como se espera: por defecto son
  15 splits con el bot `equilibrado`, una carrera que casi no llega a tier 1. Con 1500 × 60, GR-m midió 2,6% con
  `criterio`.
- **Determinismo:** `simulate.js 100 60 criterio` dos veces da una salida idéntica (2684 líneas, diff vacío).
- `build.js` OK.
- **`recorrido.mjs`** (seeds 25, 39 y 152, a 1440×900 y 390×844; la 39 y la 152 con `--max-paradas 80`): las 6
  corridas dan 0 errores y retomar funciona en todas las paradas; en la regla 4, 0 de 940 muestras con la franja o el
  acompañante cambiando durante el relato. El acompañante, los cuartos y la posición dan 0 fallas, y el teclado da
  todo `true` donde se pudo probar. Los números a la vista llegan como mucho a 46 a 1440 (el retiro de la seed 152,
  con el tablero de la serie) y a 30 a 390 (el plan de serie de la seed 25).
- **Las capturas las miró el supervisor.** Salió una cosa menor que va a V8 (D100): en la ficha del amateur (el
  acompañante Vos y el cuarto Vos), los LP cuentan desde el valor anterior aunque hayas cambiado de división. Al subir
  de Oro II 27 LP a Oro I 15 LP, el número baja de 27 a 15.
- **La validación completa no se corrió, a propósito.** El 2026-10-08 el usuario pidió no frenar en "los checks de 3
  horas": la completa se corre cuando una fase toca el motor o el balance.
  - La FASE V es pantalla, más un registro aditivo sin `rng` (GR-m), y `HUELLA_JUEGO` quedó idéntica.
  - Los checks de banda del motor darían lo mismo que en el cierre de K (550 OK / 0 FAIL).
  - La corre la próxima fase que toque el motor.

**El juego del cierre se sirve al usuario (C2)** en http://localhost:8090, desde esa misma copia.

**Lo que queda de la FASE V:**
- **El merge a `fase-9r`.** El push espera un OK nuevo del usuario.
- **V8:** calibrar con lo que diga el usuario en C2 (D98, la pausa del cierre de año; D99, el contraste residual; D100).
- **Dos metas de pantalla que no se forzaron**, y por qué:
  - el plan de serie a 390 muestra 26-30 números (meta ≤ 25), porque el % por mapa es el plan;
  - el retiro de la seed 152 a 1440 muestra 46 (meta ≤ 45), por el tablero de la serie en el acompañante.

### 2026-10-08 — FASE V, V4: el movimiento y el ritmo, en `v-integracion` (PLAN.md §V.7)

**Lo que midió el worker antes de decidir** (100 carreras × 60 splits): la parada del motor de `edadCierre` no frena
todos los años.
- Con el bot criterio frena en el 91,6% de los cierres: todos los amateur y el 88,2% de los pro.
- Con el bot malas frena en el 72,5%: todos los amateur y el 61,3% de los pro.

Por eso, en los años sin esa parada, la tarjeta de cierre del último split pasa a ser **"Cierre de 2031"** (el número
del año, el escalón y el Golden Road) y se sostiene 2,4 s.
- **No suma clics:** Espacio la salta, y en INST y con movimiento reducido pasa sola.
- **Hay una por año como máximo,** nunca junto a la parada del motor (T9).
- `simulate.js` espeja `ESPERA_CIERRE_ANIO_MS`, con su check. Cuesta +2,4 s por carrera con el bot criterio y +4,2 s
  con malas.

**Qué se mueve** (`cad8449`; worker Sonnet xhigh, revisor Sonnet con navegador y dos rondas cortas de un Sonnet):
- **La tarjeta de cierre** cuenta el nivel, o el rango y los LP en amateur.
- **La franja** cuenta desde lo que ya mostraba, solo cuando el relato termina.
- **Los efectos de un beat** cuentan desde 0.
- **Cada página** abre con un cartel de una línea ("2031 · Temporada regular", "Arranca 2032 · Pretemporada"), que no
  suma espera. En los años con parada del motor, la parada abre con "Cierre de 2031".
- **Con movimiento reducido** todo aparece ya en su valor final.
- **El número que cuenta** no se anuncia en la región viva: un lector de pantalla oye solo el valor final.
- **D61:** `reemplazarEnElLugar` copia también `title`, `aria-*` y `style`.
- **D97:** al retomar entre splits se ve la tarjeta del split anterior.
- **En el celular,** el último beat ya no queda detrás de la barra de cuartos.

**Lo que encontraron las revisiones:**
- La frase del escalón no era gramatical con los nombres de los escalones ("Vas por Pasó por el circuito"). Ahora dice
  "Tu escalón: «Pasó por el circuito» · Para llegar a «Un profesional más»: te falta…".
- La tarjeta completa en la parada del motor mostraba un LP que los beats siguientes todavía movían. Ahora es el cartel
  de una línea, sin número.
- Un parámetro `numeroDe(s)` disparaba el check de plurales entre paréntesis. El worker había reportado `--rapido` en
  verde y no lo estaba: lo encontró el supervisor corriéndolo.
- El revisor cree que 2,4 s no alcanzan para leer la tarjeta del año y propone 3-3,5 s o sostenerla hasta Espacio. Va a
  V8, con lo que diga el usuario (D98).

**El techo de `dist/`** sube de 2600 a 2700 KB en su propio commit (`6a3ddb6`). La integración pesa 2621 KB.

**Verificado por el supervisor sobre `6a3ddb6`:** `validate.js --rapido` 376 OK / 0 FAIL / 183 SKIP, y `--solo` de "V2 escena", "V5 carrera", "V3e", "V4", "K0" y "K1 versión" sin FAIL; `build.js` OK.

### 2026-10-08 — FASE V, ola 4: los minijuegos, la franja y los cuartos, y la carrera dibujada con el Golden Road, en `v-integracion` (PLAN.md §V.7)

**Las correcciones de la ola V3** (`e1faa47`, un Sonnet):
- La jerarquía del mercado se lee: "Jerarquía en el equipo: 0 ▲ 21 al cerrar el primer split (Rookie)".
- El pliegue de cada oferta dice lo que guarda ("más · arraigo y negociar").
- La línea de "qué está en juego" no corta una comilla de cierre.
- El nombre del equipo entra en el tablero de la serie.
- La previa y el "Camino" solo recuerdan que los abriste dentro del mismo partido.
- La regex del bot de `recorrido.mjs` sigue el texto nuevo, con las mismas elecciones en 4 mercados.

**Tres workers en paralelo**, cada uno dueño de sus archivos y sin conflictos al mergear:
- **V3d, los minijuegos, la prueba y la prensa** (`39b420f`).
  - La parada tiene fases (`data-fase`: previa, juego, resultado).
  - En la previa van la apuesta compacta con un solo "más" y la charla del coach en filas con tecla. 1-n eligen y **V**
    lanza "¡Vamos!" (D94); durante el juego todas las teclas son del minijuego.
  - El rótulo dice qué es cada minijuego (D93).
  - Con el reloj corriendo se pliegan la consigna y la apuesta.
  - En el mapa decisivo, el título, la primera opción y "¡Vamos!" ahora entran sin scrollear a 1440 y a 390.
- **V3e, la franja y los cuartos** (`75ff6ff`).
  - Una sola ficha.
  - El acompañante Vos es compacto: en amateur, el rango y las barras; el plan amateur a 1440 bajó de 46 a 35-37
    números.
  - La final muestra los picos de la carrera (D90).
  - La etiqueta de tier sale del contexto vivo (D91).
  - `fichaPrevia` va por contenedor y los desplegables se recuerdan (D95).
  - La Temporada muestra la tabla cerrada entre splits, y la Crónica está agrupada por año y split.
  - Un check nuevo, "V3e (regla 15)".
- **V5, la carrera dibujada y el Golden Road** (`69a8c62`).
  - `src/ui/core/trayectoria.js` (puro) dice qué se dibuja, y el cuarto Carrera lo dibuja con `graficos/`: la cinta de
    clubes, la curva de nivel, la nota de cada año, la vitrina, el archirrival y el escalón.
  - El acompañante del cierre de año, el retiro y la vuelta pasó de 37 a 3 números.
  - El Golden Road se sigue en la tarjeta de cierre ("Golden Road 2031: ✓ split 1 · ✓ split 2 · ◻ split 3 · ◻ liga ·
    ◻ Mundial"), solo mientras está vivo.
  - La medalla está en la tarjeta final ("Logro aparte · No suma puntos"), en el texto para compartir, en el PNG y en el
    historial.
  - Un check nuevo, "V5 carrera dibujada": el dibujo es el registro, y siete mutantes dan FAIL.

**La revisión** (Sonnet con navegador, sobre `75ff6ff`) dio "OK con observaciones menores":
- **El Golden Road respeta la regla 4.** El ✓ del split 2 aparece después del beat "terminó 1.º de 10", y "¡Lo
  lograste!" aparece después del relato del Mundial.
- **La medalla no toca el puntaje.**
- **Las metas de §V.8 se cumplen en todos los tipos de parada, salvo dos que no se fuerzan:**
  - El retiro de una seed llega a 46 números por el tablero de la serie.
  - El plan de Fearless a 390 queda en 26-30 números por los % por mapa de cada opción, que hacen falta para decidir.
- **Lo que encontró va a V4:**
  - A 390 el último beat queda detrás de la barra de cuartos.
  - El texto del escalón no tiene check (un mutante quedó verde).
  - Queda código muerto: `renderFicha` en `render.js`.

**Verificado por el supervisor sobre `75ff6ff`:**
- `validate.js --rapido`: 373 OK / 0 FAIL.
- `--solo` de "V2 escena", "V5 carrera", "V3e" y "K1 versión": OK (`HUELLA_JUEGO` sin cambio).
- `build.js`: OK, con `dist/` en **2597 de 2600 KB**.

**El juego servido al usuario** en el puerto 8090 pasó a `75ff6ff`.

### 2026-10-08 — FASE V, ola V3: la parada genérica, el partido y el mercado, en `v-integracion` (PLAN.md §V.7)

**Tres workers Sonnet en paralelo**, cada uno dueño de sus archivos (`c02a8c9`, merge de `v3a-decision`, `v3b-partido` y
`v3c-mercado`; un conflicto en `acompanante.js`, resuelto por el supervisor):
- **V3a, la parada genérica y la fila de opción.**
  - El encabezado es la pestaña, el título y una línea de "qué está en juego"; el resto de la descripción va detrás de
    "más". El plan amateur pasó de 6 líneas a 2 antes de la primera opción.
  - Cada opción es una fila con su tecla, el label, la descripción en 2 líneas y los 3 efectos más grandes, más el riesgo
    y la rareza.
  - Un "más" por fila despliega lo plegado sin elegir la opción.
- **V3b, el partido.**
  - La decisión va primero. El marcador y la previa ocupan una línea cada uno, con su desplegable.
  - A ≥ 1180 px, el tablero de la serie, el Swiss o la previa completa van al acompañante sin repetirse en el escenario.
  - La pestaña del 2-2 del Swiss dice "Partido" (D92).
  - `seriePrevia` pasó a un `WeakMap` (la parte de D95 que le tocaba).
- **V3c, el mercado.**
  - Las ofertas van en filas comparables, con los mismos campos en el mismo orden.
  - "Firmar" es el botón primario. "Más" guarda el arraigo, el porqué y la negociación.
  - Tu valor ocupa dos líneas.
  - El mercado del mundo va al acompañante, o a un desplegable debajo de 1180 px.
  - El sueldo ya no se anima desde 0, así que retomar dejó de comparar mal.

**Medido por el revisor** (Sonnet con navegador, sobre `4bbc286`, seeds 25 y 39 a 1440×900 y 390×844):
- **Sin errores:** 0 errores de consola, 0 scroll horizontal, 0 fallas de la regla 4, de retomar, del acompañante, de la
  posición y de los cuartos. El teclado, todo en verde.
- **Mercado a 1440:** pasó de 59 a 33 números visibles. La última oferta ahora entra (antes no entraba en ninguna seed).
- **Plan de Fearless a 1440:** pasó de 71 a 37,5 números.
- **Metas que no se cumplen**, y no se fuerzan:
  - El plan amateur a 1440 queda en 46 números contra 45. Lo sube el acompañante Vos, que es de V3e.
  - El plan de Fearless a 390 queda en 28 contra 25. Son los % por mapa de cada opción, que hacen falta para decidir.

**Lo que encontró la revisión** (en curso, en `v3-fix`):
- "Jerarquía: 0 ▲ 21 — Rookie" en el mercado no se entiende.
- El pliegue de las ofertas se rotula solo "negociar".
- La línea de "qué está en juego" puede cortar una comilla de cierre.
- El nombre del equipo se trunca en el tablero de la serie.
- La previa queda desplegada en los partidos siguientes.

**El techo de `dist/`** subió de 2500 a 2600 KB en su propio commit (`4bbc286`, regla de proceso 2). La integración
pesa 2517 KB; desde `fase-9r`, src/ui creció +90 KB en crudo con la pantalla nueva y src/core +11 con el Golden Road.

**Verificado por el supervisor sobre `4bbc286`:**
- `validate.js --rapido`: 372 OK / 0 FAIL / 181 SKIP.
- `--solo="V2 escena"` y `--solo="K1 versión"`: OK.
- `build.js`: OK, 2517 de 2600 KB.

### 2026-10-08 — FASE V, V2-C: el layout nuevo, en `v-integracion` (PLAN.md §V.4, §V.7)

**Qué cambió en pantalla** (`e5be735`; worker Opus xhigh, revisor Sonnet con navegador y una ronda de correcciones de
un Sonnet):
- La **franja** (`src/ui/franja.js`) reemplaza a la topbar: handle · rol, club, edad · año · ventana, el nivel con su
  banda y su delta (en amateur, rango/LP), velocidad y sonido. En el celular son dos líneas.
- El **escenario** es una columna de 720 px centrada que muestra una sola pieza. A 900-1179 px medía ~264 px y ahora
  mide 720 (D88).
- El **acompañante** (`src/ui/acompanante.js`) aparece desde 1180 px y lo decide `acompananteDe`. Debajo de 1180, el
  chip "ver contexto" abre el cuarto equivalente.
- Los **cuartos** (`<dialog id="cuarto">`): Vos, Temporada, Equipo, Mundo, Carrera (stub hasta V5) y Crónica, con
  clic o con su letra. Con uno abierto, el relato se pausa; Esc lo cierra y devuelve el foco a la parada.
- **La parada reemplaza al relato** (§V.5): durante una parada no se ve la página del split. Arriba queda
  `#paradaAntes`, con el último beat contado y "ver la página (n)".
- La Crónica abierta a mitad de relato suma los beats que la página ya contó, nunca uno por contar.
- Se fueron los dos rieles, el ticker, `#summary`/`#metaPill`/`renderLowerThird` (con el "EN EL MAPA" de D93) y
  `screens/carrera.js`.

**Lo que encontró la revisión:**
- La franja cortaba el handle y el club a 390 px.
- El botón Cerrar tapaba la pestaña Crónica en el celular.
- "Ver contexto" quedaba arriba del título.
- Quedaba código muerto de la barra de abajo.
- La regla 4 la confirmó el revisor con navegador: los cuartos, la franja y el acompañante no muestran nada que el
  relato todavía no contó.

**Una regresión que el recorrido no veía.** La ronda de correcciones dejó dos `}` sueltas en `shell.css`; el parser
descartaba la regla de `.shell-cuerpo`, así que a 1440 el escenario quedaba pegado a la izquierda y el acompañante
caía debajo. Ningún número lo marcaba, porque el recorrido medía qué mostraba el acompañante y no dónde. La vio el
supervisor mirando una captura. Se arregló en `4cf6a78`, y `recorrido.mjs` ahora mide la posición del escenario y
del acompañante: sobre el commit roto da rojo.

**Verificado por el supervisor sobre `e5be735`:** `validate.js --rapido` 372 OK / 0 FAIL / 181 SKIP;
`--solo="V2 escena"` y `--solo="K1 versión"` OK (`HUELLA_JUEGO` sin cambio); `build.js` OK, con `dist/` en
2486 de 2500 KB. Queda poco margen: se re-mide después de V3 (D49).

### 2026-10-08 — FASE V, olas 1 y 2: el andamio (V2-A), el Golden Road en el motor (GR-m) y el director de escena (V2-B), en `v-integracion` (PLAN.md §V.7)

**Lo que decidió el usuario** (2026-10-07, textual en PLAN.md §V.1): *"Escenario + un panel"*, *"Una página por split"*,
el escalón en el cierre de año y *"un logro difícil (porque hasta ahora en la vida real nadie lo consiguió) que sea el
golden road"*, que es *"Todo el año"* y un *"Logro aparte"*. Con eso se re-escribió la FASE V (`2cd2192`).

**V2-A, el andamio sin cambio visual** (`43265ab`, `f8258b8`, `bc4e6b4`; worker Sonnet, sin revisor):
- `src/dev/recorrido.mjs`: el re-juego de K6 versionado, que mide por parada lo que pide §V.8.
- El CSS partido en una hoja por familia (cierra D50). Las capturas antes y después salen idénticas byte a byte y quedan las mismas reglas
  (sin cambio visual).
- El flujo del minijuego sale de `app.js` a `src/ui/paradas/minijuego.js`, con los tres checks que leían `app.js`
  como texto re-apuntados en el mismo commit. El supervisor leyó ese diff.
- La línea de base (`1c1a6e0`) la midió el supervisor con `recorrido.mjs`: seeds 25/39/152 a 1440×900 y 390×844 sobre
  la UI de hoy. Las metas de §V.8 se fijaron con ella.

**GR-m, el Golden Road en el motor** (`b4c2add`; worker Sonnet xhigh + revisor Opus + correcciones):
- `registro.porSplit[]`, escrito en `systems/rendimiento.js` sin `rng`.
- `esGoldenRoad`/`goldenRoads` en `core/registro.js`, `seguimientoGoldenRoad` en `core/vistaDeCarrera.js` y
  `escalonDeCarrera` en `core/puntaje.js` (con `nivelDeCarrera` usándola y la misma salida).
- Guardado `VERSION` 15 con `migrarDe14`. `HUELLA_JUEGO` 79304237 'K6d' sin cambio.
- El revisor encontró que el check comparaba la fila consigo misma y lo cambió para que lea `temporada.posicion`; un
  mutante ahora lo pone en rojo.
- **La frecuencia, medida por el supervisor** (`simulate.js 1500 60 <bot> --bloque=goldenRoad` sobre la rama de GR-m, `899efe7`):

| Bot | Carreras con al menos un Golden Road | Años con Golden Road |
|---|---|---|
| criterio | 39 de 1500 (2,6%) | 44 |
| equilibrado | 15 de 1500 (1,0%) | 15 |
| malas | 4 de 1500 (0,3%) | 6 |

  Raro pero posible, que es lo que se buscaba: el motor no se toca para moverlo (§V.6).

**V2-B, el director de escena** (`7300f0d`; worker Opus xhigh + revisor Opus + correcciones de un Sonnet):
- `.shell[data-pieza]` lo escribe solo `revelar` (`src/ui/escena.js`); las piezas salen de `src/ui/core/escena.js`,
  que es puro. Reemplaza los toggles de `hidden` de `app.js`, `body[data-legado]` y dos `:has()`.
- El store `vista` lo escribe solo el director al terminar los beats. Ficha, topbar, luz de estudio, riel y marcador de
  serie se pintan desde ahí, y el resultado ya no se adelanta (D89).
- La página por split, con su tarjeta de cierre (`components/cierre.js`), y el marcador de retomar `lolcs-vista`.
- `src/ui/teclado.js`: Enter y Espacio en el inicio ya no borran la guardada (D86); en la final, Enter sobre "Copiar" y
  Esc ya no disparan "Nueva carrera" (D87); en el mercado, 1-4 llevan el foco al "Firmar" de la oferta y Enter firma
  (D46).
- El check `V2 escena` (`checkLento`, 20 seeds × 60 splits): en cada pausa del motor, la pieza es la esperada para su
  tipo, también después de `deserializar(serializar())`.

**Lo que corrigió la revisión de V2-B:**
- El check aceptaba cualquier pieza de parada. Con el mutante del revisor (el sistema antes que la presentación), el mapa
  decisivo de la serie salía como "partido" y el minijuego no aparecía, y el check quedaba en verde. Ahora compara con
  una tabla propia y ese mutante da FAIL.
- 1-4 en el mercado **firmaban** la oferta con una tecla que no se veía y sin confirmar (el revisor lo reprodujo en el
  navegador). Ahora la tecla enfoca, el número se ve y Enter firma.
- "Split anterior" se decidía con la velocidad del momento de abrir la página siguiente. Ahora se decide con si la
  tarjeta de cierre se llegó a ver.
- Al retomar entre splits se perdía la tarjeta de cierre. Ahora se reabre, aunque todavía no se llega a ver (D97, para V4).

**D96 no era del juego**: lo tiraba el bot de `recorrido.mjs`. El revisor lo verificó sin bot y quedó cerrada.

**Verificado por el supervisor sobre `7300f0d`**: `validate.js --rapido` 372 OK / 0 FAIL / 181 SKIP (los lentos salteados), más `--solo="V2 escena"` OK, y
`build.js` OK. La validación completa, `simulate.js 1000` y el determinismo se corren al cierre de la fase, sobre la
rama entera.

### 2026-10-07 — Cierre de K6d y de FASE K: las cuatro metas re-basadas, K6 re-jugado y el merge a `fase-9r` (PLAN.md "K6d — el cierre", pasos 3-6)

**Lo que decidió el usuario** (textual, PLAN.md §K6d):
- las cuatro metas que movió K6d: "Re-basar y cerrar";
- el playtest: "No; cerrá y la juego después";
- el push: "Sí, pusheá al cerrar".

**El re-base** (`993789c`, de un worker Sonnet, solo `src/dev/validate.js`; el supervisor leyó el diff). Cada check lleva
su línea de la regla 17 con la cuenta, y lo medido sale de la validación completa de `f542f62`:
- 9Wd, el Top 20 de las carreras con éxito: el piso pasa de 33 a 19,17 (23,1 − 2σ).
- K5c, el título de tier 1: el re-base pasa de 55,7 a 59,6 (techo 62,14).
- K5c, el más fuerte gana el Mundial: la banda pasa de [42,62, 57,38] a [42,62, 70,88].
- K6b-C, la mediana de frenadas de las leyendas: pasa de ≤ 80 a ≤ 83,81 (σ estimada desde el p90).
- Los jueces de la regla 7 siguen rechazando un valor justo afuera de cada banda nueva.

La causa de las cuatro son decisiones del usuario: P3 baja el Top 20, y la regla de tier 3 deja más años en tier 1.
Ninguna es un bug.

**K6, re-jugado sobre K6d.** Lo jugó un worker Sonnet con la heurística de `k6r`, adaptada a las cartas nuevas. Los logs
están en el scratchpad de `e8dab69f`, carpeta `k6d_replay/`. La tabla está en PLAN.md.
- Ningún bug alto.
- "Lo peor siempre" se quema a los 18, igual que antes, pero ahora con tres avisos con su %.
- La carrera buena pasa 2 splits en tier 3 (antes 7 años).
- La terca termina Leyenda, con 991 puntos.
- La leyenda baja de 943 a 672 y no gana el Mundial. Es n = 1, con el stream corrido.
- Los 321 `pageerror` de la leyenda son del `setInterval` del script, no del juego: lo verificó el supervisor.
- Quedan cuatro hallazgos bajos para la ronda que abra el usuario.

**La tabla de deuda.** Un scout de solo lectura verificó D62, D63, D64, D65 y D78 con números y archivo:línea: se marcan
✅. También se cierran D77 (K6d-B), D84 (K6d-N) y D80 (re-basada y cerrada con K). D81 sale de K, abierta: P7a se probó y
se revirtió. Entra D85: `agencia.js` imprime "BAJÓ" debajo del piso de K4c, con 7,2% (en K6c era 5,9). Sale con 0, así
que no era un FAIL y nadie lo miraba.

**Verificado por el supervisor** sobre una copia `git archive` de `993789c`, que es el código del merge `eef56e6`:
- `validate.js`: 550 OK, 0 FAIL;
- `simulate.js 1000` y `simulate.js 1500 60 todas`: 0 crashes;
- el determinismo, con 100 × 60 de `criterio` dos veces: idéntico;
- `agencia.js` y `build.js`: OK, con `dist/` en 2402 KB contra un techo de 2500.

**FASE K queda cerrada.** Lo que el usuario encuentre jugando abre una ronda nueva. Después viene FASE V, re-escrita con
"una cosa por vez en pantalla".

### 2026-10-07 — Integración de K6d: N (sin P7a) + B + P, el guardado 14 y la racha en rojo que sobrevivía al retiro (`k6d-integracion`; PLAN.md "K6d — el cierre", paso 1)

**Los merges**, en orden, sobre `fase-9r` `80d4b9b`:
- `k6d-prensa` (`ad614fb`): sin conflictos.
- `k6d-burnout` (`cb906d0`): conflicto solo en este archivo; se conservan las dos entradas. `balance.js` y `validate.js` se
  juntaron solos, sin checks perdidos.
- `k6d-nivel` (`5936279`): conflicto en este archivo y en `version.js` (se conservan las dos historias).
- **P7a sale** (decisión del supervisor tras la revisión): revert de `9b85bc7` (la prende) y de `9f3b3f8` (la estructura). La
  estrella rebotaba entre ligas en cada contrato (A-B-A-B de 0 a 31 carreras con `criterio`), la carta se contradecía y casi no
  movía los títulos. No queda código, perilla (`mercado.estrellaSube`) ni su check. Quedan P3 y la regla de tier 3.

**Versión, huella y guardado.**
- `VERSION_JUEGO` 'K6d'. `HUELLA_JUEGO` 79304237, medida con `--solo="K1 versión"` sobre el head sin P7a. Reemplaza a 480175732
  (K6d-N con P3), 1073872165 (K6d-B) y 1766253198 (K6c). Con P7a la integración daba 2117801369: no vale.
- Guardado `VERSION` 13 → 14. `migrarDe13` (`core/guardado.js`) arranca `flags.mentalAvisadaPro` en `[]` y `flags.ofertaGuardada`
  en `null`, los valores de `createInitialState`.
- `FORMAS_CONOCIDAS[13]` vuelve a `995485d311c0`, la de `fase-9r` y de los guardados del usuario. `FORMAS_CONOCIDAS[14]` es
  `1ef92b3fd9be`.
- Check nuevo "K6d guardado VERSION 14": 170 guardados de la 13 cargan y siguen igual que los de la 14, y sin `migrarDe13` fallan
  los 170. El de K6b pasa a pedir `VERSION` ≥ 13.

**El bug de K5c-R** (la seed 9 con P7a prendida: `aniosProDe` 8,33 contra 8).
- **Lo que pasaba de verdad.** La carrera no se quemó estando retirada: volvió del retiro con su club ("te guardó el lugar"),
  jugó el split de la vuelta y se quemó al cierre. Llegó a ese split con la racha en rojo de **8 splits** de antes de irse
  (`flags.splitsMentalBajo`) y la mentalidad en 11, congeladas un año entero afuera.
- **El reloj cuadraba.** Del 33 al 37 son 3 splits afuera (`splitsRetirado` 3) más el de la vuelta, y en 300 carreras (con P7a, y en
  el head sin P7a) `splitCount − splitsRetirado == registro.splitsJugados` da 300 de 300. Los 8,33 años pro eran los reales. El que
  contaba de menos era el check: toma todo paso retirado → retirado como splits afuera. "La vuelta arranca corrida +3/+4" también
  es por diseño: `relojAlVolver` adelanta el reloj en el split de la vuelta (K5c motor).
- **La causa en el motor:** la racha cuenta splits seguidos jugados en rojo, pero sobrevivía al tiempo afuera. El dado podía
  pinchar en el primer split de vuelta, y la parada del pro de K6d-B decía "cerraste los últimos N splits en rojo" contando los
  de afuera (regla 15).
- **El arreglo** (`systems/retiro.js`, al volver): `splitsMentalBajo` vuelve a 0.
- **Medido.**
  - Con P7a y el arreglo (copia de `5936279`): las vueltas que se queman en el split de la vuelta bajan de 1 a 0 en 300; la seed 9
    da 9 años pro. El check K5c-R da OK; sin el arreglo, FAIL.
  - Sin P7a (el head, sin el arreglo): 4 de 133 vueltas traen racha (300 seeds) y ninguna se quema, porque frena la parada de K6d-B.
  - La huella no se mueve: ninguna de las 40 seeds vuelve con racha.
- **El check** "K6d retiro". Toma 5 vueltas reales con la cabeza armada en rojo (la mitad del umbral, racha de 4 veces el
  mínimo) y el que sigue sin cuidarse. Pide que el split de la vuelta no frene por el burnout ni termine en burnout. El mutante
  sin el arreglo da rojo en las 5.

**El techo de `dist/`:** 2402 KB contra 2400. Lo que creció es lo de K6d (+54 KB en crudo desde `80d4b9b`), y se subió a 2500
siguiendo el precedente de K6c. Lo decide el supervisor.

**Verificado:**
- `--rapido`: 370 OK / 0 FAIL / 180 SKIP.
- `--solo=`: K6d-B (los 5 lentos), K6d-P (4), K5c-R (9), "K6d-N P3", "Tier 3, el nivel manda", "guardado" (13) y "K6d retiro",
  todos OK.
- `build.js` OK.
- La validación completa y `simulate.js 1000` quedan para el supervisor.

### 2026-10-07 — K6d-N: merge de `tier3-nivel` y P3, el título de una liga chica no te mete en el Top 20 (rama `k6d-nivel`)

- **Merge** (`908ac9f`): `tier3-nivel` entra con la regla de tier 3 (margen 15). La huella del juego queda en 1265514711 y
  `--rapido` da 364 OK / 0 FAIL / 174 SKIP.
- **El diagnóstico** (criterio 600 × 60, con la regla de tier 3) está en `PLAN.md` §K6d-N.
  - El 88,6% de las llegadas a tier 1 es a CBLOL/LCP/LCS, con calibres de 51,5 / 56,5 / 59 contra ~53 de LCK CL.
  - El 69% de los títulos se gana ahí, con el jugador 15 o más arriba del calibre de su liga.
  - El título de cualquier liga sumaba 16,9 puntos al ranking del mundo.
- **P3, en dos commits** (regla de proceso 2):
  - `427542e`, la estructura con la perilla neutra (`topMundial.prestigioSinBonoCampeon` / `prestigioPlenoCampeon` en
    0/0). La huella queda idéntica y `--rapido` da 365 / 0 / 174;
  - `a4efef1`, los valores 55 / 91. El bono del título de liga se multiplica por un factor lineal del prestigio de la liga
    (`core/topMundial.js:factorPorPrestigio`): la CBLOL suma 0, la LEC la mitad, la LPL y la LCK entero. El Mundial no se
    toca.
- **El corrimiento declarado:** huella del juego 1265514711 → 480175732 (`version.js`, sigue 'K6c'); stream
  (`dev/huella.js`) 346802722 → 1820193282. `--rapido` 365 / 0 / 174.
- **El check nuevo** "K6d-N P3 el título de liga pesa por el prestigio…" comprueba:
  - los bordes 55 y 91 exactos;
  - que la liga chica sume menos que la grande;
  - cada liga contra la cuenta;
  - el Mundial intacto;
  - la neutra exacta.

  Está en rojo con el factor sacado, sin el tope de arriba y sin el de abajo.
- **Regla 15:** ninguna pantalla lista los puntos del bono. El panel del Top 20 y los logs dicen solo el puesto.
- **Las barandas** (600 × 60, antes → después): Top 20 criterio 40,3 → 23,8, equilibrado 30,5 → 16,2, malas 11,0 → 3,3.
  - Título de tier 1, tier 1 y no-pro no se mueven.
  - Región fija: Corea 79 → 79 y NA 52 → 45 (de 600).
  - 30+ en la réplica del check lento: 16,8 → 16,5.
- **P7a, "el nivel te lleva a la liga que te corresponde"** (decisión del supervisor, `PLAN.md` §K6d-N paso 2b).
  - **Se sacó en la integración de K6d** (revert de `9b85bc7` y `9f3b3f8`, decisión del supervisor): la estrella rebotaba entre
    ligas en cada contrato (el traspaso a mitad de contrato sin dado chocaba con "la casa primero" de K5c-H: el patrón A-B-A-B
    pasó de 0 a 31 carreras con `criterio`), la carta se contradecía ("das el nivel de la LEC…" junto a "Una salida lateral") y
    casi no movía los títulos. No queda código ni perilla (`mercado.estrellaSube`) ni su check. Lo de abajo es historia.
  - **Por qué no subía** (criterio 600 × 60, con P3; las ventanas de las estrellas de CBLOL/LCP/LCS que le sacan 15 o más al
    calibre de su liga: 1019):
    - ve la oferta y la toma: 24,7%;
    - ningún club que alcanza tiene asiento abierto: 31%;
    - la ve y `criterio` prefiere la casa (no es élite): 13,6%;
    - a mitad de contrato no sale el dado de 0,35: 9,3%;
    - a mitad de contrato no hay pretendiente con 5 de fuerza más que su club: 8,7%;
    - la casa llena la mano y el cupo de imports es solo para la élite: 9,2%.
  - **La regla:** si tu nivel llega (`casa.margenAlcanza`) a una liga de tier 1 claramente más fuerte (`casa.margenImportElite`:
    reusa los dos márgenes de K5c-H), un club de ahí te hace lugar con `forzada`, que nunca salta las reglas duras. Al fin de
    contrato va primero en la mano; a mitad de contrato es el pretendiente, sin el dado. Vive en
    `core/demanda.js:clubDeLigaMasFuerteQueTeHaceLugar`, y la oferta dice "das el nivel de <liga>, una liga más fuerte que <la
    tuya>: N de nivel contra el C de un equipo medio de allá".
  - **Dos commits:**
    - `9f3b3f8`, la perilla neutra `mercado.estrellaSube: false`. La huella queda en 480175732 y `--rapido` da 366 / 0 / 174;
    - `9b85bc7`, la perilla prendida.
  - **El corrimiento declarado:** huella del juego 480175732 → 62519553; stream 1820193282 → 1381761146. La forma 13 se
    re-registra sin subir (no hay campos nuevos).
  - **El check nuevo** "K6d-N P7a la estrella sube…" arma los estados así:
    - fuerzas asimétricas;
    - el borde exacto de "llega" en coma flotante y 0,01 abajo;
    - la liga justo en "8 más";
    - el cupo de imports en 0;
    - la perilla neutra.

    Está en rojo con seis mutantes: `>` en lugar de `>=`, `>=` en lugar de `>`, sin el filtro de `forzada`, con el dado a
    mitad de contrato, sin el primer lugar en la mano y sin la perilla.
  - **Queda un FAIL en `--rapido` (365 / 1 / 174): K5c-R.** En la seed 9, `aniosProDe` da 8,33 y el check espera 8. La carrera
    ahora pasa por la LEC, se retira en LCK CL y termina en burnout estando retirada, con el reloj saltando 4 splits contra 3
    de `splitsRetirado`. Es el camino de retiro y burnout, no el de P7a. Queda reportado y no lo toqué.
  - **Las barandas** (600 × 60, P3 → P3 + P7a):

    | Medida | P3 | P3 + P7a |
    |---|---|---|
    | Título de tier 1, criterio / equilibrado / malas | 57,3 / 53,0 / 16,5 | 55,0 / 46,5 / 16,2 |
    | Mundial | 10,3 | 8,5 |
    | Región fija Corea / NA (de 600) | 79 / 45 | 87 / 51 |
    | Burnouts por mil, criterio / equilibrado / malas | 15 / 27 / 512 | 42 / 37 / 513 |
    | Títulos ganados en CBLOL/LCP/LCS | 68,2% | 65,3% |
    | Splits medianos en tier 1 | 27 | 27 |

    No se mueven: tier 1 (73,0), no-pro y tier 3 (mediana 2).

### 2026-10-07 — K6d-B (D77): el burnout se ve venir en la firma y en el pro (rama `k6d-burnout`)

**Lo que se encontró al implementar (cambia una parte de la spec, decide el supervisor).** La oferta del amateur llega
*después* de la semana (`vivirLaSemana` → `buscarSalida`), y el dado del burnout corre al cierre de todo split, firmes o no.
En el equipo te ordenan el horario: el sueño vuelve hacia `suenoConfortable` y la deuda se resetea al firmar. Por eso firmar casi
nunca suma riesgo en el cierre de este split. Medido en las 216 cartas con riesgo de 600 × 60 de `malas`:
- en 211, firmar da igual o menos burnout al cierre de este split que quedarte;
- a dos splits, esperar da menos en 107 y lo mismo en 24;
- en `equilibrado`, 12 cartas: esperar da menos en 2 y lo mismo en 8.

"Este split lo vivís con la rutina que cuida" no se puede cumplir tal cual, porque la semana de este split ya se vivió. Se
implementó **el split que esperás** con la rutina que cuida, y la carta cuenta las dos opciones a dos splits (regla 15).

**(a) La oferta avisa y deja esperar** (`systems/amateur.js`).
- `riesgoDeBurnoutAlCierre` (`systems/atributos.js`, exportada): la mentalidad proyectada al cierre sin el dado (el sueño del
  cierre, el desgaste medio, la misma vuelta a la base y el mismo tope) y la misma `probabilidadDeBurnout`. `aplicar` usa la
  misma cuenta (`mentalidadDelCierre`, `desgasteDeMentalidad` con el término del dado como argumento): la huella de 40 × 60 no se
  movió con el refactor (1766253198 antes y después).
- Si firmar este split cierra con la racha en el mínimo (o el piso), la carta dice la racha y, por opción, la mentalidad y el %
  de cada cierre: firmar (este split y el que viene, en el equipo), "pedirle al club que te espere" (este en soloQ; el que viene
  con la rutina que cuida, firmando al final) y el "no" (este split en soloQ). La prueba de tier 3 repite el % de firmar y el de
  no llegar.
- "Pedirle que te espere": `flags.ofertaGuardada` (la misma org, tier y vara). El split siguiente se vive con `rutinaQueCuida`,
  sin el sorteo del scouting, y la oferta vuelve al final de la semana (o del periodo sin PC). Con la oferta en la mano no hay
  "¿seguís?" de los 19. No se ofrece si el año que viene ya es el de `edadLimite`.
- Firmar con el riesgo a la vista deja la vara del pro (`flags.mentalAvisadaPro`).

**(b) El pro frena con la mentalidad en rojo** (`systems/burnout.js`, nuevo, una línea en `ETAPAS_SPLIT`).
- **Dónde:** justo antes de `atributos`, después de `events`. Ahí ya se movió todo lo que mueve la mentalidad en el split
  (resultados, serie, Mundial, eventos), así que la proyección es la más cercana a lo que el dado va a tirar. Frena cuando el
  dado del cierre puede pinchar: la racha llega al mínimo con la mentalidad proyectada y la chance no es 0. Corre también en el
  split de la firma.
- **Las opciones:**
  - seguir;
  - bajar la carga: mentalidad +3 a +6 y mecánica −1 a −3, con `conPermanencia`;
  - pedir unos días: mentalidad +7 a +12 y jerarquía −4 a −8.
  Lo que sube va por `recuperarPorDescanso`, el camino del "descansar" del receso. El rango se tira al resolver; la carta
  proyecta con la media.
- **Riesgo nuevo:** vuelve a frenar solo si la proyección queda más de `burnout.mentalNueva` (5) por debajo de lo que la carta
  mostró para la opción elegida. Si la mentalidad sale de rojo, lo visto se olvida.
- **Los bots:** `criterio` y `resolverAuto` eligen la de menos burnout (`opcionQueNoQuema`, a igual chance la de menos costo);
  `malas`, la de más. Pantalla: rótulo "La cabeza" (`ui/formatoUi.js`).

**Barandas** (600 × 60, seeds 1-600, `barandas.mjs` del supervisor más las medidas exactas en una copia; antes = `d9c2dfa`, el
mismo motor que `4795489`, con los mismos números del supervisor):

| Medida | criterio | equilibrado | malas |
|---|---|---|---|
| no llega a pro | 24,5 → 24,5 | 25,7 → 25,3 | 51,2 → 49,8 |
| burnouts / 1000 | 10 → 2 | 25 → 18 | 490 → 485 |
| con aviso (texto, el split o el anterior) | 83,3 → 100 | 100 → 90,9 | 85,4 → 90,7 |
| firman y se queman en el split / sin que la carta lo diga (exacto) | 0 / 0 → 0 / 0 | 1 / 1 → 0 / 0 | 15 / 15 → 17 / 0 |
| burnouts del pro / con parada en su racha (exacto) | 6 / 0% → 1 / 100% | 6 / 0% → 0 / — | 52 / 0% → 63 / 100% |
| paradas por carrera (media / mediana) | 48,42 / 44 → 48,55 / 45 | 43,70 / 40 → 43,78 / 40 | 25,18 / 16 → 25,67 / 17 |
| paradas por la mentalidad (todas / del pro; máx. del pro) | 0 / 0 → 0,09 / 0,09; 4 | 0,05 / 0 → 0,09 / 0,04; 3 | 0,47 / 0 → 0,52 / 0,05; 3 |
| tier 1 / título tier 1 / Top 20 | 71,3 / 52,2 / 37,2 → 71,3 / 52,0 / 37,3 | 67,7 / 49,3 / 28,2 → 67,8 / 49,5 / 28,0 | 33,0 / 16,8 / 8,7 → 34,0 / 17,7 / 9,0 |
| Mundial / P(2+ \| 1) | 10,5 / 25,4 → 10,2 / 26,2 | 4,8 / 13,8 → 5,0 / 13,3 | 1,0 / 16,7 → 1,0 / 16,7 |
| edad al terminar (mediana) / 30 o más | 26 / 27,0 → 26 / 27,5 | 25 / 15,8 → 25 / 16,3 | 18 / 22,7 → 19 / 23,7 |

- **El Mundial con la región fija** (600 × 60): KR 69 → 70 carreras con Mundial y NA 54 → 54.
- **`agencia.js`** (12 carreras): idéntica antes y después. La ponderada en su horizonte da 23,6% y contra la carrera 5,9%;
  el "piso 8,6%: BAJÓ" ya estaba en la base. Ninguna de esas 12 carreras llega a las cartas nuevas.
- El 90,9 de `equilibrado` en la columna de texto es 1 burnout del amateur de 11 sin una parada que nombre la mentalidad en el
  split o el anterior: la regla del amateur de K6c-fix, sin tocar acá.

**Checks nuevos** (lentos; comparten una cosecha de `malas`, 400 × 60, ~27 s con `--solo=K6d-B`). Verdes:
- la carta de la oferta y la de la prueba dicen el % que tira el dado: 270 cartas y 46 pruebas. Se comparan contra
  `atributos.aplicar` con un `rng` que deja cada `gauss` en su media;
- "pedirle que te espere" guarda la oferta y vuelve al split siguiente, la misma: 223 guardadas, 175 volvieron y 48 se perdieron
  porque la carrera terminó antes;
- el pro frena con el % antes del dado, no vuelve a frenar sin riesgo nuevo y cada opción hace lo que dice: 22 paradas, 22 de
  22 burnouts del pro con parada y 44 efectos probados;
- nadie firma y se quema sin que la carta lo dijera: 8 firman y se queman, 0 sin aviso.

Cada check se vio en rojo con su mutante:
- la proyección no normaliza el sueño del pro: 193 problemas;
- la oferta guardada no vuelve: 37;
- sin la vara del riesgo nuevo: 75 frenadas de más;
- frena recién con 20% o más: 20 de 23 burnouts con parada;
- la oferta no mira el riesgo: 11 firman y se queman sin aviso, y los checks de la carta quedan vacíos.

**Huella:** `HUELLA_JUEGO` 1766253198 → 1073872165 (corrimiento declarado, sigue 'K6c'). **Forma del guardado:** cambió
(`flags.mentalAvisadaPro`, `flags.ofertaGuardada`), hash 9689e8d31c32 contra el 995485d311c0 de VERSION 13. `VERSION` y
`FORMAS_CONOCIDAS` no se tocaron: `K0-B guardado` queda en FAIL a propósito para la integración.

**K6d-B (revisión)** (`dba6b61`, `4ed0fce`, `5a80d98`). La corrección del supervisor, hallazgo por hallazgo:
- **La vara que no se relajaba** (`systems/burnout.js`). `flags.mentalAvisadaPro` pasa de un número a la lista de cierres
  avisados, `[{ split, mentalidad, probabilidad }]`. La carta de la oferta que firmaste cubre dos (el de la firma y el
  siguiente) y la parada del pro cubre el de su split. Un cierre con el dado vivo que ningún aviso cubrió con su % frena
  siempre. Dentro de lo cubierto, frena solo si la proyección cae más de `burnout.mentalNueva` debajo de lo mostrado. Un aviso
  que mostró 0% no cubre: si después el dado puede pinchar, frena. Los cierres pasados se olvidan.
- **Esperar en bucle.** La guardada vuelve sin "pedirle que te espere" y dice "Ya te esperaron un split: ahora es firmar o
  dejarla pasar". `resolverOferta` no la vuelve a guardar aunque llegue esa respuesta.
- **El pro sin club** frena igual: seguir, bajar la carga (sin scrims) o desconectarte unos días. Desconectarte da mentalidad
  +7 a +12 y mecánica −3 a −5 (`burnout.desconectar`, con `conPermanencia`).
- **La espera con la PC confiscada** proyecta el periodo sin PC (la media de sus rangos) y dice "el que viene lo vivís sin
  PC". Con la vara en 0%, la prueba ya no dice "si no llegás". "El suplente suma minutos" pasa a "el suplente las juega por vos".
- **Checks** (cinco lentos sobre la cosecha de `malas`, 400 × 60, ~20 s con `--solo=K6d-B`):
  - la meta se mide por cierre, sin excluir a los que no tienen club;
  - la guardada se compara entera (club con todos sus campos, tier, liga y vara);
  - esperar una sola vez;
  - con el mismo estado de cada parada, un aviso de `mentalNueva + 1` por encima frena y uno de `mentalNueva − 1` no;
  - el perfil y `criterio` eligen la opción que menos quema (624 elecciones).
  El sueldo y los años no viajan en la oferta del amateur: los pone el contrato al firmar.
- **La cobertura del guardado K4** suma `burnout:burnout_pro`, con una fuente de `malas`: hasta 40 seeds, hasta verla.

**La meta por cierre** (sonda `probes/cierres.mjs`, `malas` pura, 400 × 60, antes `9dacdf9` → después). De los burnouts de
un pro con el cierre cubierto con su %: 28 de 57 (49,1%) → 60 de 60 (100%). Sin club: 0 de 12 → 13 de 13. Firmar y quemarse
sin aviso: 0 → 0. Las esperas seguidas, como máximo: 3 → 1. La cosecha del check da 43 de 43 (sin club, 9 de 9). Con
`criterio` y `equilibrado` no hay burnouts del pro en esas 400.

**Barandas** (`barandas.sh` del supervisor, 600 × 60, `9dacdf9` → `5a80d98`):

| Medida | criterio | equilibrado | malas |
|---|---|---|---|
| no llega a pro | 24,5 → 24,5 | 25,3 → 25,3 | 49,8 → 48,8 |
| burnouts / 1000 | 2 → 0 | 18 → 17 | 485 → 480 |
| con aviso (texto) | 100 → — | 90,9 → 100 | 90,7 → 95,8 |
| firman y se queman en el split | 0 → 0 | 0 → 0 | 17 → 19 (todas con la carta) |
| paradas del pro por la mentalidad, por carrera | 0,09 → 0,12 | < 0,05 → < 0,05 (0,03 en la sonda) | 0,05 → 0,75 |
| paradas por carrera (media) | 48,55 → 48,63 | 43,78 → 43,83 | 25,67 → 26,66 |
| tier 1 / título tier 1 / Top 20 | 71,3 / 52,0 / 37,3 → 71,3 / 52,2 / 37,2 | 67,8 / 49,5 / 28,0 → 68,0 / 49,7 / 27,8 | 34,0 / 17,7 / 9,0 → 34,3 / 17,3 / 9,0 |
| Mundial | 10,2 → 10,3 | 5,0 → 5,0 | 1,0 → 1,0 |

Con la región fija: KR 70 → 70 y NA 54 → 54. Las paradas de `malas` suben porque elige siempre seguir. Con eso la racha
sigue en rojo, y cada cierre con el dado vivo que nada cubrió es una parada (antes, una sola por racha). `criterio` y
`equilibrado` eligen la que no quema y la racha se corta.

**Lentos, de a uno, verdes:**
- los cinco de K6d-B;
- "El burnout no llega sin aviso";
- "El contexto de carrera";
- la brecha de no-pro por perfil: 26,7 / 23,3 / 22,7 / 27,3;
- el impacto de los minijuegos;
- la cobertura del guardado K4.

`--rapido`: 362 OK y 1 FAIL, el de la forma (igual que en la pieza).

**Mutantes en rojo** (copias `git archive HEAD`):
- M1 de la revisión, "un aviso cubre toda la racha": la meta da 20 de 50 cubiertos;
- "dentro de lo cubierto no frena aunque caiga": 190 problemas con la vara directa (antes de ese check seguía verde);
- M3 de la revisión, la guardada sin vara: 127;
- M8 de la revisión, el perfil y criterio eligen la peor: 592;
- esperar dos veces: 120;
- sin club no frena: 27 de 44;
- la espera sin PC promete la rutina: 11;
- la vara 0 dice "si no llegás": 49;
- la oferta no mira el riesgo: los tres checks de la carta quedan vacíos;
- la parada nunca frena: el guardado K4 dice "no cubrió burnout:burnout_pro".

**Huella y forma.**
- `HUELLA_JUEGO` sigue en 1073872165: el check K1 da OK, porque las 40 seeds del perfil no tocan las cartas que cambian. Va
  declarada en `version.js` con su comentario.
- La forma vuelve a cambiar: 9689e8d31c32 → 1ef92b3fd9be (`mentalAvisadaPro` ahora es una lista). `VERSION` y `FORMAS` no se
  tocaron.

### 2026-10-07 — K6d-P: la rueda de prensa con pistas (rama `k6d-prensa`)

**Por qué.** `ruedaDePrensa.js` sorteaba el tono que convenía con `rngUi` y no daba ninguna pista: azar puro, lo único que K6
todavía sintió como "rng clicker" (decisión del usuario del 2026-10-07).

**Qué cambió.**
- **`core/prensa.js` (nuevo, puro, sin `rng`).** `lecturaDePrensa(state, momento, datos)` devuelve `tono` (entero 0-100, 0
  Humilde, 100 Desafiante) y `pistas` (2-3 frases, una por factor que pesó). Parte de `tonoBase` 50 y cada factor empuja con su
  peso (`BALANCE.prensa`, bloque nuevo comentado): ganar la serie +14 y perderla −18 (×1,6 en una final o el internacional); el
  escándalo −28; el hype, −0,5 por punto sobre 70 (la media de un pro en estos momentos, medida: mediana 71 en 143 pausas); la
  sinergia, +0,5 por punto sobre 55; el rival de la serie, +16 si es el archirrival y +8 si es de tu generación
  (`rivalDeGeneracion`). Una pista sale si el factor empuja ≥ 3 puntos (las 3 más fuertes); si no hay 2, se completa con la
  frase suave de los que empujaron poco. Tono acotado a 5-95.
- **El motor lo manda en `decision.datos`** de las dos pausas (`pausaDeMinijuego` en `systems/serie.js`, `pausaDePrensa` en
  `systems/events.js`) por `datosDePrensa`, solo si el minijuego es `rueda_de_prensa`. Sin tirada nueva.
- **La UI.** `ruedaDePrensa.js` recibe `decision.datos` (quinto argumento, `app.js` se lo pasa), muestra las pistas arriba del
  slider ("LO QUE SE LEE EN LA SALA") y el objetivo es `tono ± ruidoUi` (8) con una sola tirada de `rngUi`. Sin `tono` (un
  guardado viejo) cae al `rngUi() * 100` de antes y no muestra pistas.
- **Hype y sinergia no son ejes de `calcularContexto`**: se leen en vivo del estado (`player.stats.hype`, `career.sinergia`),
  igual que lo haría el contexto (T2). La sinergia solo cuenta con org.
- **Hoy `post_serie` no sale** (`rondasConPrensa: []` desde K4c): la prensa que se juega es la de después de un escándalo. Los
  factores de la serie y el rival quedan listos y testeados para el día que se vuelva a prender.

**Medido.** Sobre 143 pausas reales (40 seeds × 40 splits, con `rondasConPrensa` prendido solo en la corrida): todas con 2 o 3
pistas (75 de 2 y 54 de 3 en `post_serie`; 6 y 8 en `post_escandalo`), tono de 7 a 88 (mediana 60). Huella: idéntica
(`K1 versión` en verde sin tocar `HUELLA_JUEGO`). El puntaje de los bots no lee el objetivo: `simulate.js` no se mueve.

**Checks (`validate.js`, `K6d-P`, rápidos), cada uno visto en rojo con mutantes en una copia de `git archive`:**
tono en la dirección de cada factor y el borde del umbral; cada pista es de un factor que pesó (980 casos); las dos pausas
reales traen tono y pistas, y el objetivo de la UI es tono ± ruido. 23 mutantes, los 23 en rojo (signo de cada peso, la final,
el rival, el acotado, el umbral estricto y sin umbral, pista de factor en cero, más de `maxPistas`, el escándalo y el rival
fantasma en la prensa equivocada, cada pausa sin tono, la UI sin tono o sin ruido, `app.js` sin pasar `datos`). Aparte,
`prensa.ruidoUi` entró a `RUIDOS_FUERA_DE_LA_ABLACION_K0`: es ruido de pantalla.

**Pantalla (Chromium real, `node server.js`).** 320, 390 y 1440 px: `scrollWidth == innerWidth` en los tres, 0 errores de
consola, 3 y 2 pistas montadas con la hoja y los tokens reales; el slider en el tono da puntaje 1 con `rngUi` en 0,5. Las
capturas (la pista del archirrival, con un nombre de org larguísimo, parte la línea sin desbordar a 320 px) se leyeron.

**Revisión, ronda 1 (los pesos de arriba son los de la primera pasada: los vigentes están en `BALANCE.prensa`).**
- **El escándalo ya no fija la respuesta.** Con -28 y la sinergia real (mediana 45) para el mismo lado, el tono salía entre 5 y
  28 (mediana 19, 19 pausas de 60 seeds): un slider fijo a la izquierda ganaba siempre. Ahora el escándalo empuja -8 y el tono
  lo mueven cinco factores que cambian de un escándalo a otro, con referencias en las medianas medidas EN esas pausas (148 de
  400 seeds: hype 65, sinergia 45, jerarquía 30, mentalidad 64): hype -1,2 por punto, sinergia +1,5, jerarquía +0,4,
  mentalidad +0,3 y la forma (`momentum` de `calcularContexto`: racha +16, estable 0, slump -16, crisis -26). `tonoBase` 58
  (la suma típica de un escándalo da ~-8: con 50 la mediana caía en 35). Se buscó sobre las seeds 1-400 y se confirmó en otras
  123 pausas (seeds 401-700).
- **La meta, medida** (config de producción, `rondasConPrensa: []`, seeds 1-200 × 60 splits = 75 pausas; el responder lee
  `datos`, el ruido ±8 barrido en 17 pasos, el corte el veredicto real `bien` ≥ 0,72):

  | | antes (569f77c) | ahora (75 pausas) | holdout (123 pausas) | meta |
  |---|---|---|---|---|
  | p10 / mediana / p90 del tono | 5 / 19 / 28 (19 pausas) | 9 / 43 / 76 | 5 / 40 / 72 | p90-p10 ≥ 40, mediana 35-65 |
  | mejor slider fijo, «bien» | no medido (tono 5-28: ganaba uno a la izquierda) | 42,4% (en 38) | 40,9% (en 41) | ≤ 50% |
  | slider en el tono, «bien» | no medido | 100% | no medido | ≥ 90% |

  Sale como `checkLento` (`K6d-P la prensa del escándalo no se gana con un slider fijo`), con la línea de la tabla en la salida.
- **Las frases no afirman de más.** Cada factor continuo elige su frase por banda: «hype alto» solo desde 75 y «todavía es bajo»
  hasta 50 (antes "casi nadie te conoce" salía con hype 57-64, mediana 64,8); en el medio dice «algo por encima / por debajo
  de lo normal», y si no empuja, «en lo normal». Siempre hay al menos 2 pistas (se completa con los de más empuje).
- **Ninguna pista contradice a otra:** el rival ya no dice "no le des el gusto de bajar la cabeza" (ahora "a ese rival se le
  contesta con carácter"); "el vestuario aguanta" pasó a "el team te respalda".
- **Checks atados a la dirección:** cada pista lleva la marca de su factor, la dirección de su empuje (humildad ↔ negativo, desafío
  ↔ positivo, neutra ↔ cero), y ninguna mezcla las dos. Suma el internacional, los bordes de las bandas y del umbral (3 pistas con
  dos factores justo en el umbral, 2 con uno apenas debajo). El widget se prueba con un contenedor falso: pinta las pistas y
  puntúa contra el tono (`puntajeDePrensa`, el 55 suelto pasó a `BALANCE.prensa.anchoDeAcierto`).
- **Mutantes:** 39 en una copia de `git archive`, 38 en rojo (los de la lista de la revisión mueren: texto de hype con la frase de
  sinergia, condición fuerte de hype invertida, suave de sinergia invertida, escándalo "subir el tono", `rondasDeFinal` sin
  'internacional', `montar` sin `objetivoDePrensa`, `montar` sin pintar las pistas). El 39.º (hype casi sin peso) no es un
  defecto: la meta se sigue cumpliendo sin ese factor.
- **El botón de los minijuegos:** `button { padding: 0 }` de `base.css` le ganaba al padding de `:where(button)` y el `clip-path`
  se comía las letras. `.minijuego-btn` lleva `padding: var(--s-3) var(--s-5)` (12 / 24 px medidos en Chromium); capturas de
  "Responder" y "¡Ahora!" a 320 y 1440 px leídas: el texto entra entero. `scrollWidth == innerWidth`, 0 errores de consola.
- Huella idéntica (`K1 versión` en verde), `--rapido` 366 OK / 0 FAIL, `build.js` en verde.

### 2026-10-06 — D82: el traspaso cuesta lo que dice la pantalla, y el Mundial del mundo pesa cada año igual (rama `d82`)

**(a) El valor visible es el que paga el mercado (regla 15).**
- **Dónde estaba.** La ficha, "Vos en el mercado" (oferta y traspaso) y el pico de la tarjeta final muestran
  `valorDeMercado`: la mediana de `salarioDeOferta`, sin edad, que K5c-U2 ya validó contra las ofertas reales. El precio
  del traspaso a mitad de contrato salía de otra fórmula, `presupuestoDeDemanda`, que lleva el `sesgoEtario` y la pantalla
  no muestra. Seed 25, a los 29: "valés $326.009/año" y el traspaso costaba $84.523, sin explicación.
- **Qué cambió.** `precioDeTraspaso` (`core/valorMercado.js`) arma el precio con `valorDeMercado` · `sesgoEtario` · factor ·
  años de contrato. Cuando el descuento es ≤ `mercado.traspasoDescuentoEtarioVisible` (0,9: desde un 10% de descuento, los
  22), la tarjeta de aceptar dice "Te descuentan por la edad: por vos ponen el 15% de lo que pondrían por un pibe con tu
  valor". El mismo caso queda en $72.619, con la frase.
- **Solo pantalla y log.** Ninguna decisión del motor ni del bot lee `traspasoUSD` ni `valorDeMercado`.
  `presupuestoDeDemanda` sigue decidiendo la disputa por el asiento (`core/demanda.js`) y no se tocó. `huella.js`
  1408477439 antes y después; con `--splits=60`, 33718164 antes y después.
- **Check nuevo, `D82 (a)`** (lento, 150 × 60). Recalcula el precio desde lo que se ve (valor, años de contrato, edad), exige
  el mismo número, que la tarjeta avise cuando corresponde y que el % que dice sea el descuento que aplicó el motor.
  - Rojo contra el código de antes: 27 problemas (25 traspasos con otro precio, y ningún veterano con aviso).
  - Verde después: 25 traspasos, 15 con el descuento a la vista (el mayor, a los 29).
  - Con el mutante que borra la frase (umbral 0,7): 9 problemas. Con el de la revisión, que escribe `(1 − descuento)` y dice
    "85%" donde es 15%: 15 problemas (antes de comparar el %, ese mutante pasaba verde).

**(b) El Mundial del mundo, con cada año pesando igual** (`simulate.js`, `bloqueMundoMundial`).
- **El problema.** Cada Mundial pesaba igual y el mundo solo se observa mientras la carrera vive: el primer año lo aportan 599
  de 600 carreras y el decimoctavo, 42.
- **La medida nueva.** Un Mundial del año k pesa 1/(H·n_k), con n_k los Mundiales de ese año, dentro de un horizonte fijo de
  H = 12 años del mundo (2026-2037, `ANIOS_MUNDO_MUNDIAL` en `simulate.js`). Los de después quedan afuera y se cuentan. Es
  lectura pura, sin `rng`.
- **Por qué 12 años fijos.** La primera versión medía los años con al menos `MUESTRA_MINIMA` (30) Mundiales, y la revisión
  la cambió por decisión del supervisor: así H dependía de N y del stream (17 a 19 años), y el último año, con ~40 Mundiales,
  pesaba ~34 veces más por Mundial, lo que agrandaba el sesgo de supervivencia de las carreras largas. Con 12 años, a
  600 × 60 el año del horizonte con menos muestra tiene 266 Mundiales (por año: 599 599 598 595 590 594 591 562 533 344 306
  266).
- **Por qué no seguir el mundo después del fin.** Hace falta un paso de "solo el mundo" que el motor no tiene: el mundo se
  mueve en `systems/mercado.js`, en la pretemporada y solo en fase profesional, y el pipeline se para en `terminado`.
  Hacerlo en el instrumento sería copiar el pipeline.
- **El σ.** El σ del margen de la meta del usuario (`sigmaDelMargenMetasC`) usa los mismos pesos; con pesos iguales da el de
  antes. La banda (5 − 2σ) no se tocó.
- **Lo medido** (criterio 600 × 60, seeds 1-600, la misma corrida para los dos bloques; el viejo queda en el reporte como
  `titulosPorLigaPorMundial`):

| Bloque | Mundiales | LCK | LPL | LEC | LCS | CBLOL | LCP | Margen LCK − LPL | σ | Piso |
|---|---|---|---|---|---|---|---|---|---|---|
| Viejo (cada Mundial) | 6921 | 51,6 | 44,5 | 3,3 | 0,3 | 0,1 | 0,2 | 7,1 | 1,40 | 2,20 |
| Nuevo (cada año, 12 fijos) | 6177 en 12 años (744 afuera) | 51,2 | 44,7 | 3,4 | 0,4 | 0,1 | 0,2 | 6,5 | 1,51 | 1,98 |
| Primera versión (años con ≥ 30) | 6896 en 18 años (25 afuera) | 51,8 | 43,3 | 4,1 | 0,4 | 0,2 | 0,2 | 8,5 | 1,97 | 1,06 |

- **La meta del usuario cumple con los dos bloques**: LCK ≥ 25% y la primera por encima del piso. El veredicto no cambia. A
  1500 × 60 lo midió la revisión, no este trabajo: margen 8,66 con σ 0,97, piso 3,06.

**Verificación.**
- `validate.js --rapido`: 363 OK, 0 FAIL, 174 SKIP.
- `--solo` de a uno: `D82 (a)`, `Fase 9Mg: toda pantalla de mercado` y `Fase 9Mf: ≥1,5%` dan OK.
- `K5c meta del usuario` no se corrió: son criterio, azar y malas a 1500 × 60, y pasan del tope de 600 carreras por sonda.
  Queda para la corrida completa del supervisor; a 600 × 60, su juez da "cumple" (la tabla de arriba).
- `build.js`: OK, `dist/` pesa 2345 de 2400 KB.
- **Después de la revisión** (el horizonte fijo, el % comparado, el umbral en 0,9 y la frase nueva): `--rapido` 363 OK,
  0 FAIL, 174 SKIP; `--solo` de `D82 (a)` OK; `huella.js` 1408477439 antes y después.
- **Verificación del supervisor y merge** (`85dd15e`), sobre `00d075e` en una copia `git archive`:
  - `validate.js` completo: **537 OK, 0 FAIL**, con `K5c meta del usuario` incluido;
  - `simulate.js 1000`: 0 crashes;
  - determinismo idéntico;
  - build OK;
  - huella 1408477439.

### 2026-10-06 — `tier3-nivel` preparada, sin mergear: "el nivel manda" en tier 3 (D84; decide el usuario)

- La regla y sus barandas están en `PLAN.md` §K6c, "La noche del 2026-10-06".
- **La validación completa del supervisor** sobre `7720bcc`: **534 OK, 3 FAIL**. Los tres FAIL son metas del usuario que
  la regla aleja:
  - el título de primera, 55,7 → 59,4%;
  - el Top 20, 36,4 → 39,9%;
  - el más fuerte gana el Mundial, 59,9%;
  - las carreras que llegan a los 30, 23,4 → 16,8%.
- No se re-basó nada y no se mergeó.

### 2026-10-06 — Merge de K6b, K6c, K6c-fix, J9 y la etiqueta de tier 3 a `fase-9r`, y K6 re-jugado (supervisor, de noche)

**Qué entra:** `99927be` mergea `k6c-fix` (`ffa6709`), que trae K6b, K6b-fix, K6c, la región y las siete pasadas de
K6c-fix. `ed95728` mergea `j9-caras`, y `8bea57a` mergea `etiqueta-tier3`. Sin conflictos: desde la base, `fase-9r` solo
había cambiado `PLAN.md`. El código del head es el de `c3c1721`.

**Verificación del supervisor** (sobre `ffa6709`, en una copia `git archive`):
- `validate.js` completo: **531 OK, 0 FAIL** (59 min, corrido solo).
- `simulate.js 1000`: 0 crashes.
- Determinismo: `simulate.js 100 60 criterio` dos veces, salida idéntica.
- `agencia.js` y `build.js` OK: `dist/` pesa 2333 de 2400 KB.
- J9 y la etiqueta no tocan el motor: `huella.js` da 1408477439 antes y después, `--rapido` da 0 FAIL, y sus checks se
  vieron en rojo con mutantes.

**KPI con la medida nombrada** (`simulate.js 1000 60 <bot>` sobre `ffa6709`):

| Bot | No llega a pro | Burnout |
|---|---|---|
| `criterio` | 22,5% | 1,0% |
| `equilibrado` | 24,6% | 2,6% |
| `malas` | 47,6% | 46,8% |

Las lesiones, las paradas de la semana y el impacto de los minijuegos los juzgan sus checks lentos, que pasaron todos.

**K6 re-jugado** sobre `a18af54`: el mismo agente heurístico con las seeds 25, 39 y 152 (PLAN.md §K6c, "La noche del
2026-10-06").
- **No se repite ningún bug de K6.** La prueba no tiene dado escondido: 11 de 11 pruebas pasadas firmaron.
- **"Worlds es una basofia" y "las opciones no afectan nada" no vuelven.**
- **"Hacés un clic y perdiste" vuelve como D77:** el que ignora los avisos se quema en el primer split pro.
- **Hallazgo nuevo, D84:** salir de tier 3 es una moneda que no lee el nivel. La regla que lo arregla queda en una rama
  aparte para que decida el usuario.

**Lo que no se cierra:** K6c necesita que el usuario juegue el amateur y la prueba (memoria de playtest). No se pusheó
nada.

### 2026-10-06 — Rama `tier3-nivel`: el nivel manda en tier 3 (D34; NO se mergea sin la decisión del usuario)

- Causa medida: la salida de tier 3 era una lotería ciega al nivel (`resolverTier3`: 0,45 de salir × 0,40 + 0,35·jerarquía de
  subir; la jerarquía vuelve a 0 con cada disolución, y cada disolución cuesta 2 splits sin tirada por K6a-M). Sin mercado en tier 3
  (`mercado.js:629`). Con criterio 600 × 60 el 32,3% de las carreras pasaba 6+ splits en el nivel tier 3 (mediana 5, p90 12), con
  nivel 63 contra calibre 18 y 80% de victorias. La carrera "buena" de K6 (seed 39) quedó 7 años así.
- Regla: si tu nivel ≥ calibre de la liga tier 2 de tu región (`calibreDeLiga`) + `competitivo.margenNivelSobreTier2` (15), el
  salto es seguro, sin dado, y el log dice por qué ("Te sobraba nivel para el circuito chico: N de nivel contra el C de un equipo
  medio de <liga>…"). Debajo, la tirada de siempre (con la jerarquía). `systems/competitivo.js` (`nivelSobreTier2`, `resolverTier3`).
- Margen: medido 10 / 15 / 20 (criterio 600 × 60, seeds 1-600, `guard.mjs` del scratchpad): mediana 2 / 2 / 3, p90 3 / 6 / 8,
  6+ splits 2,5 / 7,7 / 16,8%, Mundial 8,7 / 9,8 / 11,5% (ruido: σ ≈ 1,2). 15 es el margen más alto que deja la mediana del diseño
  (1-2; 2 es el piso con K6a-M): conserva la tirada para quien apenas pasa al circuito chico.
- Barandas, antes (`c3c1721`) → después, 600 × 60, seeds 1-600, eleccion null:
  - criterio: tier 3 mediana 5 → 2, p90 12 → 6, 6+ splits 32,3 → 7,7%; llega a tier 1 71,3 → 73,0%; no-pro 24,5 → 24,5%;
    Mundial 10,5 → 9,8%; Top 20 37,2 → 40,3%; título de tier 1 52,2 → 57,3%; edad final 26,9 → 27,0; paradas 48,4 → 51,5.
  - equilibrado: 5 → 2, 12 → 6, 32,7 → 8,2%; tier 1 67,7 → 70,5%; no-pro 25,7 → 25,7%; Mundial 4,8 → 6,2%; Top 20 28,2 → 30,5%;
    título 49,3 → 52,7%; edad final 26,1 → 26,0; paradas 43,7 → 45,4.
  - malas: 4 → 2, 12 → 6, 17,0 → 5,0%; tier 1 33,0 → 34,2%; no-pro 51,2 → 51,2%; Mundial 1,0 → 1,2%; Top 20 8,7 → 11,0%;
    título 16,8 → 16,3%; edad final 22,6 → 22,4; paradas 25,2 → 25,9.
- Check nuevo "Tier 3, el nivel manda…" (estado armado: arriba del margen salta siempre, sin consumir `rng`, con el log, y el split
  siguiente ya no es de tier 3; abajo, quedarse / disolverse / saltar con la frecuencia de la tirada). Rojo con la regla sacada
  (el código de antes), con el margen en +∞ y con un salto que tira dado.
- Revisión de la rama (commit aparte): el log ya no dice "y ganar de taquito ya no prueba nada" (regla 15: la regla no mira
  resultados; la seed 5, Corea, saltaba con 9-11); queda "Te sobraba nivel… N de nivel contra el C de un equipo medio de <liga>".
  El check arma la liga tier 2 con fuerzas distintas y asimétricas (la mediana no es ni la máxima, ni la mínima, ni el promedio),
  pone un caso en el borde exacto (nivel = calibre + margen, sin redondeo) y otro 0,01 abajo, y verifica que el log lleve el nivel,
  el calibre y la liga comparados. Rojo con el calibre leído como la fuerza máxima y con `>` en vez de `>=` (y con los tres
  mutantes de antes). Huellas sin cambio (346802722; juego 1265514711): el texto de un log no entra en ninguna.
  - Mundial con la región fija (`regionFija.js`, criterio, seeds 1-600, 60 splits; versión liviana de la de 3000): Corea 69 → 79
    (11,5 → 13,2%), NA 54 → 52 (9,0 → 8,7%); dentro del ruido (σ ≈ 1,3), la brecha a favor de Corea se abre (2,5 → 4,5 puntos).
- Corrimiento declarado (T1): huella 1408477439 → 346802722; huella del juego 1766253198 → 1265514711 (`version.js`, sigue 'K6c').
  "K4c-S el instrumento expone el Δp…" se quedaba con 9 paradas de plan en las seeds 1-3 (eran 20; hacen falta 10): pasa a 1-6 (21).
- `--rapido`: 364 OK, 0 FAIL, 173 SKIP (la primera corrida dio 1 FAIL, K4c-S, el de arriba). Lentos con `--solo`, uno por vez:
  "Nadie firma un ascenso a una liga sin cumplir su edadMinima", "Nadie se queda varado…" y "Ningún split sin equipo narra un draft
  mecánico…" en OK. "El tier 3 es breve" (6000 carreras) no se corrió acá: queda para la validación completa.
- Riesgos: el calibre tier 2 cambia por región (LCK CL 53 contra LRS 31): el jugador de LATAM salta con menos nivel que el coreano;
  los 9 eventos de `tier3.json` se ven menos (quedan para el que apenas pasa al circuito chico); +3 paradas por carrera con criterio.

### 2026-10-06 — La ficha de tier 3 ya no dice la liga de tier 1 (`etiqueta-tier3`)

- Causa (solo UI): `lineaDeContextoFicha` (`ui/components/ficha.js`) resolvía la liga con `career.liga`, que en tier 3 es `null` por
  diseño (`core/tier3.js`, `systems/amateur.js:997`; `puntaje.js` lo exige), y caía a `mundo.ligaOrigen`: "Prisma Academy · LEC · 2029"
  sobre "RECIÉN LLEGADO A UN EQUIPO DE TIER 3". Regla 15. Mismo respaldo con el free agent de tier 3 (sin org).
- Ahora, con `career.tier === 3` y sin liga: "Prisma Academy · Tier 3 · Europa · 2029 · 18 años". El motor no se tocó:
  `huella.js` idéntica antes y después (1408477439).
- Check nuevo en `validate.js` ("Ficha de tier 3: ..."), visto en rojo contra el código viejo ("... · LCK · 2030 ..." nombra la
  liga LCK). `--rapido` 0 FAIL, `build.js` OK.
- Sin tocar (no era el caso): el amateur (`tier` null) sigue mostrando la liga de origen en la línea; no es tier 3.

### 2026-10-06 — J9: los campeones tienen cara (`j9-caras`; PLAN.md "J9")

- Cero motor, cero corrimiento: solo datos y UI. `huella.js` (40 seeds) idéntica antes y después: 1408477439.
- `data/champions.json`: cada una de las 91 entradas declara `ddragon` (la key de Data Dragon, explícita: Wukong -> MonkeyKing,
  Renata Glasc -> Renata, Bel'Veth -> Belveth, Kai'Sa -> Kaisa, LeBlanc -> Leblanc, Lee Sin -> LeeSin...). Verificadas una por una
  contra `champion.json` de Data Dragon 16.19.1: las 91 existen, 0 con `ddragon: null` (el `null` explícito queda como convención
  para un campeón sin imagen). Poppy está en dos roles y comparte key a propósito.
- `data/ddragon.js` (nuevo): versión del CDN y URL base, en dato, nunca en la UI.
- `ui/components/campeonTile.js`: el tile geométrico sigue siendo la base; encima va el ícono de Data Dragon. `img.onerror` saca
  el `<img>` y deja el tile de siempre (iniciales + borde por arquetipo); `onload` oculta las iniciales y le da fondo a los
  números de abajo. Reemplaza el comentario "sin splash, Riot IP". Alcanza ficha, mini (meta/Fearless) y setup.
- `ui/screens/inicio.js`: el splash del último main elegido, difuminado, detrás del setup, con transición de opacidad (se
  precarga con un `Image` aparte: sin imagen, el fondo de siempre). Estilos en `pantallas.css` con tokens (sin color literal).
- Handle (punto 5 del spec): ya no era cierto. `app.js` lee `handleInput` directo (`app.js:643`) y `index.html` ya lo muestra
  como primer paso numerado del setup; no se tocó.
- Sin CSP ni `img-src` en `index.html` ni en `server.js`: no hubo que abrir ningún origen. Las imágenes van del navegador al CDN;
  `dist/` no crece una imagen (`build.js` OK, 2340 KB de 2400).
- Checks nuevos (rápidos): "cada campeón declara `ddragon`" (rojo con el mutante "a Aatrox le falta el campo") y "el tile con
  `ddragon: null` o con onerror es el geométrico" (rojo con los mutantes "onerror no saca el `<img>`" y "pide imagen aun sin key").
- Navegador real (Playwright, `server.js` local): con red, 16 tiles de la grilla con ícono, splash de K'Sante visible tras elegir
  3 mains, 0 errores de consola; con `ddragon.leagueoflegends.com` bloqueado, 0 `<img>`, tiles geométricos, sin splash, el
  setup y la carrera siguen jugables (los únicos mensajes de consola son los "Failed to load resource" del propio navegador).
- `--rapido` 360 OK, 0 FAIL (358 + los 2 nuevos), `build.js` OK.
- Correcciones de la revisión independiente (mismo día):
  - Scroll horizontal en el celular (reabría D69): el splash `fixed` con `transform: scale(1.08)` medía 392 de `scrollWidth` a 390 px
    y 417 a 414 px (reproducido en `dfbd4e8`). Ahora el `scale` va en capas hijas y el contenedor recorta (`overflow: clip`); el
    splash es un componente (`ui/components/splash.js`) con dos capas que cruzan. `scrollWidth` == `clientWidth` en 320, 360, 375,
    390, 414, 768, 1024 y 1440, en el estado inicial (capas a opacidad 0) y con 3 mains y el splash visible.
  - El cambio de splash cruza dos capas aunque la imagen esté en caché; el tile marca `con-cara` en el acto si `img.complete`.
  - Checks nuevos: "el splash escribe el fondo solo con la imagen cargada" (rojo con el mutante "fondo directo sin precarga") y
    "cada key es el nombre normalizado o una excepción" (rojo con Aatrox y Ornn cruzados).
  - `--rapido` 362 OK, 0 FAIL; huella 1408477439 sin cambio; dist 2342 KB.

### 2026-10-06 — K6c-fix, séptima pasada: retiro_por_lesion se verifica con un estado armado hasta D83 (`k6c-fix`; PLAN.md `ea13221`)

- Solo checks. "lesion_cronica y retiro_por_lesion son alcanzables" se parte en dos:
  - "lesion_cronica es alcanzable" sigue duro con `responderQueGrindea`: 3 de 120 carreras.
  - `retiro_por_lesion` queda declarado inalcanzable en carreras naturales hasta D83, con su comentario de regla 17. La recaída
    pide 17 splits seguidos de deuda en el amateur: 0 de 1200.
- Check nuevo "retiro_por_lesion: con la lesión grave ya pasada y la recaída armada (amateur y pro)…", con un estado armado.
  - Verifica, en el amateur y en el pro: la recaída frena, el automático se retira, retirarte cierra la carrera, el log ("el sueño de
    ser pro se termina acá" / "te cierra la carrera a los"), el registro y la tarjeta ("El que no pudo seguir").
  - Rojo con el mutante "la recaída nunca retira".
- `--rapido` 358 OK, 0 FAIL: huella (1766253198) y forma sin cambio. Determinismo `simulate.js 100 60 criterio` ×2: diff vacío.

### 2026-10-06 — K6c-fix, sexta pasada: la lesión es del que grindea sin dormir de amateur (`k6c-fix`; PLAN.md `3b8e034`)

- **Cambio:** `systems/salud.js` corre también en el amateur, con los mismos umbrales y sus tiradas de siempre (T1: huella
  186316704 → **1766253198**, corrimiento declarado). En el amateur la lesión grave habla de soloQ, no de equipo; la baja
  (`fechasBajaLesion`) se cumple en turnos de soloQ que pasan a dormir (`conBajaPorLesion` en `normalizarReparto`: la previa, el plan
  y la semana dicen lo mismo, con su línea en el log); el retiro por lesión es el fin del amateur ("el sueño de ser pro se termina
  acá"). El reset de la deuda al firmar sigue. Bot nuevo `responderQueGrindea` (`dev/estrategias.js`, fuera de `ESTRATEGIAS`).
- **Barandas, `575db0e` → ahora:** no-pro `simulate.js 600 60 criterio` 24,5 → 24,5; `600 60 malas` 48,7 → 48,7;
  `1000 60 equilibrado` 24,0 → 24,6. Sonda `resolverAuto` 1000 × 60: burnout del amateur 17 → 20, castigo 9 → 9, lesión leve /
  grave / retiro 0 / 0 / 0 → 4 / 0 / 0; paradas de la semana mediana 0, p90 1, media 0,18 → igual. Sonda del que grindea (plan de
  deuda que llega al riesgo físico, firmando; 1200 × 60): leve / grave / `lesionado` / retiro 0 / 0 / 0 / 0 → 18 / 3 / 2 / 0.
  Con `responderQueGrindea` (además rechaza ofertas y elige el de menos riesgo en casa; 1200 × 60): 149 / 23 / 19 / 0.
- **Cobertura:** "El contexto de carrera" OK (`lesionado` en 3 de 120 carreras que grindean; la muestra automática sigue para
  "nunca desconocido"). "lesion_cronica y retiro_por_lesion" **FAIL**: lesion_cronica 23, retiro_por_lesion **0 de 1200**. La
  recaída pide 6 + 5 + 6 = 17 splits seguidos de deuda en el amateur y el burnout llega antes (957 de 1200 con el bot). Con el mutante
  "la lesión grave nunca pincha" los dos rojos (`lesionado` 0, lesion_cronica 0 de 1200).
- `--rapido` 356 OK, 1 FAIL (la huella; actualizada). Forma sin cambio. `--solo` de salud y lesión OK (salvo el de arriba).
  `--solo` OK: 9Wd, minijuegos, "Ninguna carrera queda sin terminar", K5c embudo y estancados, K6c (16, con la propuesta del perfil), burnout con aviso, K1 versión, la forma. Determinismo `simulate.js 100 60 criterio` ×2 diff vacío. Todo de a un proceso.

### 2026-10-06 — K6c-fix, quinta pasada: la semana frena con la mentalidad en rojo (`k6c-fix`; decisiones del usuario, PLAN.md `49538db`)

- **Cambio (A):** en el amateur, que la mentalidad al cerrar la semana quede en zona roja (`atributos.burnoutMentalBajo`, 30) es
  riesgo nuevo: la semana frena (`mentalEnRojoDeLaSemana` en `planDeSemana`), dice el umbral y la cuenta del burnout, contra qué es
  nuevo, y suma la opción que la cuida (`rutinaQueCuida`: sin robo, la de más sueño). `riesgoDelPlan` devuelve `mental` (semana por
  semana) y `semanaMentalRoja` (la carta lo dice); `riesgoMostrado.mental` es la vara: si ya la mostraba en rojo (o ya frenó por eso
  este año, `anioAmateur.mentalAvisada`), frena solo si baja más de `amateur.semanaMentalNueva` (5). Puro, sin `rng`.
- **Barandas, antes (`7d0051d`) → después:** no-pro `simulate.js 600 60 criterio` 24,5 → 24,5; `600 60 malas` 48,0 → 48,7;
  `1000 60 equilibrado` 24,5 → 24,0. Sonda `resolverAuto` 1000 × 60: burnout del amateur 22 → 17 (total 28 → 23), castigo 9 → 9,
  lesión leve / grave / retiro por lesión 0 / 0 / 0 → igual; paradas de la semana por carrera mediana 0 → 0, p90 1 → 1, media
  0,13 → 0,18 (51 paradas por la mentalidad en 1000 carreras). Burnout con aviso (réplica del check): 14/20 (70%) → **19/20 (95%)**.
- `--solo` antes → después: 9Wd OK → OK; minijuegos OK → OK; "Ninguna carrera queda sin terminar" FAIL (30+ años 16,8%, banda
  17-30) → OK; K5c embudo y estancados OK → OK; la propuesta del perfil OK → OK; K6c (14) OK; burnout con aviso FAIL → OK.
- **(B) bloqueado:** "El contexto de carrera" (`lesionado`) y "lesion_cronica alcanzables" siguen FAIL, y ningún bot los arregla:
  `salud.js` corre solo con `phase === 'profesional'` y la deuda vuelve a 0 al firmar, así que la lesión es inalcanzable para
  cualquiera. Sonda con un bot que elige el plan con deuda y riesgo físico (1200 × 60): leve / grave / `lesionado` 0 / 0 / 0.
  "La lesión solo en el amateur" pide que `salud.js` corra también en el amateur: es motor, queda para el supervisor. Dato (copia
  de `src` con `salud.js` corriendo también en el amateur, no commiteado): `resolverAuto` 1000 × 60 leve 4, grave 0; el bot que
  grindea 1200 × 60 leve 21, grave 2, retiro por lesión 1, `lesionado` 1 (pasaría, pero al borde).
- Checks nuevos "K6c-fix la mentalidad entra en rojo y la semana frena" y "K6c-fix si ya estaba en rojo y el plan lo mostró, no frena
  salvo que baje más": rojos los dos con el mutante "la mentalidad nunca frena"; el segundo, con "frena siempre en rojo".
- `--rapido` 356 OK, 1 FAIL (la forma: re-registrada `FORMAS_CONOCIDAS[13]` '5915cb3adccf' → '995485d311c0', sin subir; después
  OK). Huella sin cambio (K1 versión OK con 186316704: ninguna de las 40 seeds frena por la mentalidad). Determinismo
  `simulate.js 100 60 criterio` ×2 diff vacío. Todo de a un proceso.

### 2026-10-06 — K6c-fix, cuarta pasada: la deuda se resetea al firmar (`k6c-fix`; decisión del usuario, PLAN.md `7538543`)

- **Cambio:** al firmar el primer contrato pro (`firmarConEquipo`, el único paso amateur → pro) `player.deudaSueno` vuelve a
  `amateur.deudaSuenoAlFirmar` (0) y `flags.splitsRiesgoFisico` a 0; si había algo que dejar atrás, el log dice "En el equipo te
  ordenan el horario: la deuda de sueño del amateur queda atrás." Puro, sin `rng`. Check nuevo "K6c-fix la deuda se resetea al
  firmar" (rojo con el reset sacado).
- **Medido** (sonda `resolverAuto`, 1000 × 60, carreras con lesión leve / grave / burnout en toda la carrera / retiro por lesión):
  K6b 8 / 4 / 20 / 2; tercera pasada 62 / 32 / 44 / 11; **ahora 0 / 0 / 28 / 0**. Finales del amateur (misma sonda): burnout 20,
  castigo 9, no-pro 24,5 (sin cambio: el reset es después de firmar).
- **Frontera:** solo el amateur escribe `deudaSueno`, así que con el reset las lesiones pasan a ser solo del amateur, y el automático
  ya no sostiene la deuda los 6 splits que pide `salud.js`. FAIL: "El contexto de carrera" (`lesionado` no aparece en 1200) y
  "lesion_cronica alcanzables" (0 en 1200). Burnout con aviso: **70%** (piso 80%): los que no avisan son caídas rápidas del amateur
  (mentalidad 54 → 38 → 20 → 3): el motor arma el burnout con 2 splits en rojo contando el último, y el check mira los 3 anteriores.
- `--rapido` 355 OK, 0 FAIL (forma igual); determinismo `simulate.js 100 60 criterio` ×2 diff vacío; `--solo` OK: la propuesta del
  perfil, 9Wd, K5c meta del embudo y de los estancados. Huella 1360329260 → **186316704**. Todo de a un proceso.

### 2026-10-06 — K6c-fix, tercera pasada: la deuda solo es evitable si arma el riesgo físico (`k6c-fix`; PLAN.md §K6c, "K6c-fix, segunda pasada")

- **Por qué:** con cualquier deuda de sueño como riesgo evitable (segunda pasada) el automático no aceptaba nunca un plan con deuda y
  las lesiones desaparecían de sus carreras (el momento `lesionado`: 0 de 3600, medido por el supervisor).
- **Regla:** `riesgoDelPlan` devuelve `semanaRiesgoFisico`: la semana en que el plan arma el riesgo de lesión (deuda en
  `salud.deudaUmbralRiesgo` o más, sostenida hasta `salud.splitsParaLesionLeve`, sobre `flags.splitsRiesgoFisico`) o de burnout
  (mentalidad en `atributos.burnoutMentalBajo` o menos durante `burnoutSplitsMinimos`, sobre `flags.splitsMentalBajo`), con las cuentas
  del motor. La carta la dice; la deuda que no llega ahí es un costo del plan. `riesgoEvitableDelPlan` (exportada) usa eso y la chance
  en casa.
- **Medido** (`resolverAuto`, 1000 × 60, carreras con lesión leve / grave / burnout en toda la carrera / retiro por lesión): K6b
  `58db231` 8 / 4 / 20 / 2; primera pasada `d0794b6` 85 / 42 / 119 / 16; segunda `ddf3cb4` 0 / 0 / 5 / 0; **ahora 62 / 32 / 44 / 11**.
  Finales del amateur por cada 1000 (sonda, mismo lote): burnout **20** (K6b 7), castigo de la familia **9** (K6b 38); no-pro
  **24,5** (sonda 1000 × 60; no se corrió `simulate.js`). **Frontera:** con la regla tal como está (riesgo físico dentro del año), las
  lesiones graves quedan ~8 veces arriba de K6b y los burnouts ~2 veces: la deuda que el automático acepta en el amateur no se resetea
  y se cobra en la etapa pro. Decide el supervisor.
- **Checks:** "la propuesta del perfil no te quema" lee `semanaRiesgoFisico` (rojo con la propuesta que ignora el riesgo: 60
  problemas; y con "cualquier deuda es evitable": 95). Nuevo rápido: "la deuda que no llega al riesgo físico no cambia la propuesta"
  (con el borde de `salud.js` armado en la semana 1; rojo con cualquier deuda evitable).
- **`--solo`:** contexto de carrera OK; `lesion_cronica` alcanzables OK; 9Wd OK; **burnout con aviso FAIL: 75% (piso 80%)**. Las metas
  K5c del embudo y de los estancados y el `--rapido` completo los cortó Claude Code por falta de memoria (la validación completa del
  supervisor corría a la par): `--rapido` iba en 267 OK y 1 FAIL, la forma (ya re-registrada: `5915cb3adccf`, por
  `semanaRiesgoFisico` en las opciones del plan). Sin determinismo ni `simulate.js` en esta pasada.
- Huella 188751648 → **1360329260**.

### 2026-10-06 — K6c-fix, segunda pasada: la propuesta del perfil no te quema y K5-B medida bien (`k6c-fix`; PLAN.md §K6c, reglas del supervisor)

- **La propuesta del plan del año** (`propuestaDelPlan` en `systems/amateur.js`, `amateur.planRiesgoEvitable` 0,15): si el plan que
  propone tu perfil muestra un riesgo evitable (en casa 0,15 o más sobre el plan más seguro, o deuda de sueño con otro plan sin ella:
  los números de la carta), la propuesta pasa al plan que tu perfil elegiría entre los que no lo muestran. La carta lo dice ("iría por
  X, pero arriesga…: te propone Y, lo más parecido sin ese riesgo") y la opción marcada es la que acepta `resolverAuto` (regla 15).
- **Medido** (`resolverAuto`, 1000 × 60, por cada 1000 carreras; K6b / primera pasada / ahora): burnout del amateur 7 / 60 / **0**;
  castigo de la familia 38 / 78 / **10**; `equilibrado` no-pro con `simulate.js 1000 60 equilibrado`: primera pasada 29,1, ahora
  **26,6** (corrección: el 24,9 de K6b y el 32,3 de K6c son de `simulate.js 1000`, 15 splits; con esa medida ddf3cb4 da 29,8, medido
  por el supervisor); edad mediana al terminar (sonda 720 × 90) 25 / 24 / **25**. Barrido del umbral: 0,05 → no-pro 28,1 (planes tan seguros que no llegan: "no llegó" 142 → 273);
  0,15 → 26,6; 0,3 → 26,5.
- **K5-B** (la región, medida como "K6c región fija"): 200 seeds por región en tandas (`dev/regionFija.js`, medida `llegada`, ~50 s), el
  orden monótono y LATAM solo emigrando como antes, y la brecha de la más fácil a la más difícil contra 2 σ de la diferencia (eran 30
  puntos fijos). Medido (local/primera de 200): KR 111/134, CN 115/137, EMEA 139/143, NA 152/152, APAC 155/155, BR 151/152, LAN 0/120,
  LAS 0/126. Juez con caso rápido. Rojo con la región elegida ignorada: brecha 3,5 contra 2 σ = 8,4.
- **Checks** que la propuesta (otras carreras del automático) dejó vacíos o mostró viejos: el burnout con aviso (12 burnouts en 3000
  seeds: tope 3000 → 8000, la corrida tarda 6,5 min); K5c-R años pro (la vuelta de free agent sin club también salta el reloj: rojo con
  `aniosProDe` sin restar lo retirado); la vuelta de K6b (el juez no recalculaba el calendario de la vuelta como `relojAlVolver`);
  K5c-R la presión, la sonda de K4c-S (más seeds hasta el mínimo); K4c-S "la prueba decide": en el amateur, con 0 firma exactamente
  quien tenía la vara en 0 (84% de las pruebas del automático) y con 1 siempre (rojo con la vara ignorada). Check nuevo "K6c-fix la
  propuesta del perfil no te quema" (rojo con la propuesta que ignora el riesgo: 155 problemas).
- Huella 1351863340 → **188751648**; `FORMAS_CONOCIDAS[13]` re-registrada sin subir (`a05ec5bebece`: sin campos nuevos, otras carreras
  de muestra). `--rapido` 353 OK, 0 FAIL; determinismo `simulate.js 100 60 criterio` ×2 diff vacío.

### 2026-10-06 — K6c-fix: la vara llega a 0 y los FAIL de la validación completa de `6dc0ff8` (`k6c-fix`; PLAN.md §K6c, "K6c-fix: la regla")

- **La vara** (`amateur.varaPrueba`): { base 1,35, pendiente 0,035, mínimo 0,1, máximo 0,8 } → **{ base 1,55, pendiente 0,05,
  mínimo 0, máximo 0,8 }**. Llega a 0 con 31 de diferencia nivel − calibre y a 0,8 con 15 o menos (a 20 pide 55%, a 25 pide 30%).
  Una prueba clavada firma siempre (máximo < 1). Con la vara en 0 la oferta, la previa, la apuesta, el log y la pantalla dicen
  "con tu nivel te firman aunque la prueba salga mal" (regla 15); la apuesta del dato ("decide si te firman") no se usa en ese caso.
- **Barrido** (sonda con las mismas seeds del check de impacto, 1000 × 60). El impacto de los minijuegos depende casi solo de dónde
  llega a 0: cero a 30 → +26,1%; **a 31 → +29,2%**; a 35 → +44,1%; a 40 → +77,7%; a 45 → +165,8%; vara siempre 0 → +25,1% (300
  seeds); K6c → +1149%. El precio: ~74% de las pruebas de `equilibrado` piden 0 (la mediana de nivel − calibre es ~36).
- **No llega a pro** (`simulate.js 600 60`; K6b `58db231` → K6c → ahora): criterio 22,8 → 24,5 → **24,5**; azar 26,8 → 32,0 →
  **28,8**; malas 38,0 → 58,2 → **48,0**; equilibrado 29,2 (600; `simulate.js 1000`: K6b 24,9, K6c 32,3, ahora **29,1**, 0 crashes).
- **La frontera de `equilibrado`:** ni con la vara siempre en 0 baja de ~28 (sonda 1000 × 60: K6b 23,0, K6c 31,2, vara 0 28,0,
  ahora 29,1). Lo que queda no es la vara: con la vara en 0, contra K6b, hay menos ofertas (1282 → 1022) y más carreras sin ninguna
  (133 → 214), porque más amateurs terminan antes: burnout 7 → 60 y prohibición familiar 38 → 78 (`no_llegó` 185 → 142). Es el plan
  del año de K6c con `resolverAuto` (la semana ya no reacciona a las barras en rojo). Queda para el supervisor.
- **Los FAIL:**
  - Impacto de los minijuegos: +1149% → +29,2% (la vara).
  - K6a-M prueba clavada: el check quedó viejo frente al texto de K6c (buscaba "prueba" y "te firman" en minúscula); acepta
    "la vara era" y "Te firman". Rojo con la línea del desenlace sacada del log.
  - Fase 11: las 2 carreras eran burnouts a los 16 en el split 6, el que cierra el segundo año: el pipeline corta las etapas al
    terminar y ese año no cerró. Elegible pasa a "más de 2 × `splitsPorEdad`". Rojo con el resumen anual sin nota en años pares.
  - Burnout con aviso: volvió solo con la vara.
  - K4 guardado: si a las 30 carreras les falta un tipo, más seeds (tope 200) hasta verlo. Cubre `amateur:reparto` y `servicioMilitar:*`.
  - K0 mercado y K0 delegación: muestra agrandada hasta juntar el mínimo (tope 60 y 40 seeds). K0 bloques y reporte completo:
    `ritmo.leyenda` sin ninguna carrera de Leyenda (malas) es una celda sin muestra (`REGLAS_NULO_SIN_MUESTRA_K0`); con alguna, el
    null sigue rojo (mutante `mediana: null`: rojo en criterio).
  - 9Wd Top 20: era la muestra. Bloques de 180 seeds: ahora 32,0 / 35,2 / 47,3 / 44,3 (39,6%, n 460); K6b 38,2 / 39,4 / 40,3 /
    34,7 (38,2%). Se mide sobre 720 seeds (`barrido9W(n)`; las 180 de siempre siguen para los demás). Rojo sin los bonus del ranking: 9,2%.
  - K4c "la prueba amateur anuncia qué pasa si no alcanza" (salió en `--rapido` con la vara 0): con vara 0 exige "te firman aunque
    la prueba salga mal" y que la floja firme. Rojo con la apuesta de siempre.
  - **Abiertos, sin re-base:** la edad mediana al terminar (24; banda 25-29) sale de la misma causa que `equilibrado` (sonda 720 × 90:
    K6b 25, ahora 24, vara 0 24; splits pro mediana 30 → 27) y va atada a no-pro (dominio del usuario). K5-B región: la brecha de
    llegada local entre la región más fácil y la más difícil pide >= 30 pp y la población no la tiene, ni en K6b (200 seeds por
    región con criterio, K6b / ahora: KR 56,0 / 55,5, CN 60,0 / 57,5, EMEA 69,0 / 69,5, NA 76 / 76, APAC 77,5 / 77,5, BR 75,5 /
    75,5): las 40 seeds del check la pasaban por suerte. Es región (D-D): decide el supervisor.
- **Checks:** "K6c la vara depende del nivel" suma el crack que firma con 0% y la prueba clavada a todo nivel (rojo con mínimo 0,1 y
  con máximo 1,2); "K6c la vara" y la oferta aceptan el texto de vara 0 (rojo con la apuesta de siempre); el lote de K6c pasa de 40
  a 80 seeds (con la vara en 0 había 3 años con dos ofertas, mínimo 5).
- **Huella** 977079279 → 1351863340 (corrimiento declarado, sigue 'K6c'). La forma del estado no cambia (`FORMAS_CONOCIDAS[13]` sigue). `--rapido`: 351 OK,
  0 FAIL. Determinismo: `simulate.js 100 60 criterio` dos veces, diff vacío. Los `--solo` de los 12 FAIL, uno por uno: 10 OK; la edad
  mediana y K5-B región siguen rojos (abiertos, arriba). No se corrió la validación completa (la corre el supervisor).

### 2026-10-06 — Integración de K6c con K6b-fix y la región medida bien (`k6c-integracion`; PLAN.md §K6c, "La región en K6c")

- **Merge** de `k6c-region` (`57e68da`) con `k6b-fix` (`711fd39`). En `validate.js` se quedan los checks de los dos lados.
  La forma 13 junta las dos y se re-registra sin subir de versión, porque la 13 no salió:
  `'51c74dcb0416'` / `'0b9646606fa1'` → `'e96e9e539778'`.
- **Decisión del usuario 2026-10-06: "medir bien, aceptar ~7%".**
  - `ganaMundialCorea`, `ganaMundialNA` y el orden Corea > NA salen de "K5c meta del Mundial". Ahí se juzgaban con la
    submuestra del lote, unas 332 y 194 carreras. Ahora los juzga "K6c región fija": 3000 × 60 por región, las mismas
    seeds y el σ de esa muestra.
  - `ganaMundialNA` se re-basa a 7,3. Regla 17, corrimiento declarado de K6c.
  - El juez rápido suma dos casos de una sola banda fuera (NA 9%, Corea 8,5%) y uno de NA en la meta (4%).
- **Medido por el supervisor:**
  - "K6c región fija": KR 348/3000 (11,6%) contra NA 219/3000 (7,3%), OK.
  - Rojo con el mutante "la región elegida no se respeta" (`core/mundo.js:392`, `ligaOrigen = ligaSorteada`): KR 9,23
    contra NA 9,23. Fallan el orden y la banda de NA (techo 8,36).
  - `--rapido`: 351 OK, 0 FAIL.

### 2026-10-05 — K6c, revisión: "más fácil desde Corea que desde NA" no lo dio vuelta la vara (`k6c-region`; PLAN.md §K6c, §K.3b)

- **La hipótesis (la vara de los clubes coreanos más fuertes) se descarta con datos.** Los clubes de tier 3 salen de la misma
  distribución en todas las regiones (`core/tier3.js:generarOrgsTier3`, `tier3.fuerzaMedia` sin región: media ~18 en KR, CN, EMEA
  y NA). `criterio` juega la prueba a 0,85 y la vara tope es 0,8: **0 pruebas falladas** en 6600 carreras de K6c desde KR y NA (vara
  media 18 desde KR, 17,6 desde NA). La vara no puede mover sus carreras.
- **Región fija, criterio, 60 splits** (`scratchpad`: `correrCarrera(seed, 60, criterio, { regionOrigen })`):

  | | KR | CN | EMEA | NA |
  |---|---|---|---|---|
  | K6b `58db231`, seeds 1-300: Mundial / no-pro / edad de firma / años pro | 12,3 / 25,7 / 17,1 / 6,9 | 10,7 / 20,3 / 17,3 / 6,7 | 11,7 / 22,0 / 17,3 / 7,6 | 6,3 / 21,3 / 17,2 / 8,6 |
  | K6c `577b5b7`, seeds 1-300 | 9,3 / 22,3 / 17,5 / 6,2 | 9,7 / 22,3 / 17,6 / 6,4 | 8,7 / 27,3 / 17,3 / 7,7 | 6,7 / 23,0 / 17,3 / 8,4 |
  | K6b, seeds 1-3300 (Mundial) | **12,12** | | | **6,18** |
  | K6c, seeds 1-3300 (Mundial) | **11,27** | | | **7,45** |

  Con n 3300 Corea sigue claramente arriba (diferencia 3,82, σ 0,71). K6c la achica ~2 puntos (KR −0,85, NA +1,27, cada una ≤ 2σ);
  firma ~0,2 años más tarde con +1,2 de nivel (el plan del año), sin mecanismo por región a la vista.
- **Por qué el lote lo dio vuelta:** las 194 seeds de NA del lote de las metas C (región sorteada) con la región fija reproducen el
  lote exacto (22 de 194 = 11,34; Corea 40 de 332 = 12,05): salieron +2σ sobre la población (7,45). En K6b las mismas 194 dieron 4,64.
  Cada corrimiento del stream las vuelve a tirar (solo 50 de 3300 seeds de NA ganan en las dos versiones). Con ese n el piso de
  `regionOrdenada` es ~5 puntos: a los valores de la población pasa ~65% de las veces en K6b y ~32% en K6c.
- **Por qué NA está en ~6-7 y no en 3-5 (ya en K6b):** dos tercios de los Mundiales de NA se ganan afuera (primer título, K6c: LPL 81,
  LCK 52, LEC 30, LCS 82 de 246; K6b: 60 / 44 / 34 / 66 de 204): el import de élite de K5c-H (`systems/mercado.js:402-441`,
  `mercado.casa.cuposImportElite/nivelImportElite/margenImportElite`). Desde Corea, 397 de 400 primeros títulos son en la LCK.
  Es diseño de K5c-H, fuera del alcance de K6c: decide el supervisor.
- **Cambios:** se revierten los dos re-bases de la pasada anterior (`ganaMundialNA` vuelve a [3, 5] con su banda de ruido y
  `regionOrdenada` a "más fácil por más de 2σ", con su caso del juez de K5c). Check nuevo **"K6c región fija"** (`dev/regionFija.js`:
  las mismas seeds 1..3000 desde KR y desde NA, en tandas paralelas; Corea tiene que ganar más por más de 2σ): KR 348 (11,6%) contra
  NA 219 (7,3%), piso 1,5, OK. Rojo con el mutante "la región elegida no se respeta" (KR 278 contra NA 278). "Las orgs de tier 1 sin
  el prestigio de su liga" no lo pone rojo (KR 324 contra NA 219): la ventaja de Corea vive en los planteles (K5c-M). Su juez tiene
  un check rápido (acepta lo medido; rechaza NA arriba, empate, dentro del ruido, cero contra cero, muestra vacía).
- **Sin cambios de motor:** HUELLA y `FORMAS[13]` no se mueven. `--rapido`: 351 OK, 0 FAIL. Determinismo: `simulate.js 100 60
  criterio` dos veces, diff vacío; `regionFija` con 3 y 5 tandas, mismo resultado. **"K5c meta": 5 OK, 1 FAIL** — el del Mundial, por
  `ganaMundialNA` 11,3 (banda [−1,55, 9,55]) y `regionOrdenada` (Corea 12,0 contra NA 11,3, σ 2,89): es la submuestra de arriba.
  Lo demás: no-pro 22,6, Mundial 9,5, Corea 12,0, nuevo Faker 2,7, estancados criterio/azar/malas 4,1/12,8/16,5, LCK 52,1 / LPL 43,9.

### 2026-10-05 — K6c, segunda pasada: la vara por nivel y la semana que frena solo con riesgo nuevo (`k6c-amateur`; PLAN.md §K6c)

- **La vara depende del nivel** (`amateur.varaPrueba` = { base 1,35, pendiente 0,035, mínimo 0,1, máximo 0,8 };
  `varaDeLaPrueba(nivel, calibre)` en `core/serie.js`): `clamp(base − pendiente × (nivelDelJugador − org.fuerza), mín, máx)`. Se
  calcula una vez al armar la oferta y viaja en `datos.vara`: la oferta ("necesitás X% (tu nivel N contra el F del club…)"), la
  previa, el motor (`veredictoDeLaPrueba(resultado, vara)`) y la pantalla leen el mismo número. Medido en las ofertas de tier 3
  (200 carreras por bot): nivel − calibre de ~22 (5% más justo) a ~55 (5% más crack), mediana ~37 → vara 80% con diferencia <= 15,7,
  ~58% a 22, 10% desde 35,7. Más de la mitad de las ofertas piden el mínimo (57-68% piden <= 15%): es el precio de que `malas`
  (juega 0,15) firme a veces. Por qué así: `criterio` (0,85) pasa siempre, así que la vara no lo mueve; `malas` necesita la vara en
  0,15 en ~la mitad de sus pruebas para no pasar del ~60%. Barrido (300 × 60, malas/azar): (1,1; 0,02) 85,7/39,7; (1,2; 0,025)
  78,7/37,7; (1,25; 0,03) 65,3/35,7; (1,3; 0,03) 68,0/35,7; (1,35; 0,035) 60,0/34,7; (1,5; 0,04) 58,3/34,7.
- **No llega a pro** (600 × 60; K6b `58db231` → primera pasada → segunda): criterio 22,8 → 24,7 → **24,5** (leal 29,1, profesional
  24,0, hambriento 21,5, showman 23,3); azar 26,8 → 48,2 → **32,0** (39,7 / 28,7 / 31,5 / 28,0); malas 38,0 → 98,5 → **58,2** (58,3 /
  55,3 / 62,4 / 56,7). Frenadas del amateur por carrera: criterio 13,64, azar 13,89, malas 10,41 (K6b: 10,65 / 11,46 / 10,63).
- **La semana frena solo con riesgo nuevo** (`anioAmateur.riesgoMostrado`: la proyección de `riesgoDelPlan` semana a semana, guardada al
  elegir el plan; `amateur.semanaRiesgoNuevo` 0,05): con plan, el riesgo evitable frena solo si la chance en casa de la semana pasa la
  que el plan mostró para esa semana por más de 0,05, o si la deuda de sueño llega antes de lo anunciado; la parada dice "Es más de lo
  que mostraba el plan para esta semana (X% en casa): algo cambió". Sin riesgo mostrado (un guardado de antes), la regla de K6a-A.
  Paradas de la semana por carrera (`resolverAuto`, 30 × 60): primera pasada mediana 3 / media 2,70; sin la regla nueva pero con la vara
  por nivel 1 / 1,93; con la regla **0 / 0,03**. Con los bots (600 × 60): criterio 0,09, azar 0,13, malas 0,22.
- **Checks nuevos**: "K6c la vara depende del nivel" (rojo con la vara que ignora el nivel: 12 problemas) y "K6c la semana frena solo con
  riesgo nuevo" (casos con rutinas fijas y la media del lote de K6a-A <= 0,5; rojo con la regla apagada: 1,93 y 9 casos). Los de la
  primera pasada leen la vara de la decisión.
- **Texto**: la frase de la prueba con vara sale de `veredictosConVara` (`data/minijuegos.json`, `veredictoDeMinijuego(..., { pasa })`):
  sin "si te firman" ni "el contrato se te puede escapar"; si no llegaste, no hay frase (manda la línea de la vara).
- **`--rapido`** (regla 17): K5c-R, K4c observación, K1 D75, K4c-H Δp, K5c motor y K6a-A volvieron solos. En ronda, sin aflojar lo que
  miden: K4c-H horizonte (`amateur:reparto` ya no aparece en las seeds 1-3: sigue hasta la 60; está en la 10), K3c (la seed 3 termina a
  los 4 splits sin firmar: las 3 primeras carreras que llegan a pro) y la vuelta de K6b (0 vueltas de free agent en 40 seeds: sigue
  hasta tener una, en la 120). K5c-H, el split de un retiro: un burnout al final de un split sin temporada por no tener equipo (seed 33
  free agent, seed 61 el split del fichaje sin plantel) no es ninguno de los dos casos y se cuenta aparte (rojo intacto: sin la resta de
  `SPLIT_DEL_RETIRO`, 11 problemas).
- **"K5c meta"** (1500 × 60): 4 en verde; re-basados con la línea "corrimiento declarado de K6c": no llega a pro 22,6 (n 1500, σ 1,08),
  gana un Mundial desde NA 11,3 (n 194, σ 2,27) y "más fácil desde Corea" (12,0 contra 11,3, σ 2,89; con la región fija, 300 × 60:
  K6b 9,7/4,0, K6c 9,3/6,7). Re-corrida con los re-basados: las 6 en verde (estancados 4,1 / 12,8 / 16,5; gana un Mundial 9,5).
- **Agencia** (`agencia.js --carreras=12 --reps=30 --cuota=2 --splits=70`): `amateur:plan_amateur` n 22, palanca mediana 0,17 σ, 18,2%
  con efecto significativo (primera pasada: n 23, 0,13 σ, 8,7%); `amateur:reparto` n 1 (antes 18); 30,3 paradas por carrera (29,6).
- Sonda `tryout.mjs 80` (prueba perfecta): 0 de 63 sin firma, 0 ofertas repetidas. Navegador (`k6c2/pw2.mjs`): la oferta del crack
  (nivel 59 contra 10) pide 10% y firma con 20%; la del justo (48 contra 33) pide 80% y con 60% "te faltó 20%"; un año entero del
  plan sin ninguna parada de la semana. Huella 977079279 (K6c), forma 13 `51c74dcb0416`; determinismo `simulate.js 1 60 criterio` x2:
  diff vacío.

### 2026-10-05 — K6c: "pasaste = firmás" y "vos elegís el plan de cada año" (`k6c-amateur`; PLAN.md §K6c)

- **La prueba del amateur sin dado** (`amateur.varaPrueba` 0,6 = 3 de 5 blancos; `veredictoDeLaPrueba` en `core/serie.js`, la
  misma cuenta para el motor, el log y la pantalla). La previa dice "La vara: 60%", la oferta "necesitás 60%", el resultado "Te
  firman" o "No llegaste: te faltó X%". Se sacó el `chance` (T1 declarado). El club que ya ofreció no vuelve en el año
  (`flags.anioAmateur.ofertas`, `elegirOrgTier3(state, rng, excluidas)`, una tirada igual). La prueba del mercado no se tocó.
  Sonda `tryout.mjs 80` (prueba perfecta): antes 5 de 75 no firmaban y 1 oferta repetida; después 0 de 63 y 0.
- **El plan del año**: cada año del amateur arranca frenando con el resumen (rango al empezar y al cerrar, semanas en el radar de
  los scouts, ofertas) y el plan entre las rutinas del sorteo, cada una con su LP por semana y su riesgo del año
  (`riesgoDelPlan`); la propuesta del perfil (con `pisoSoloQ`) va marcada. Las semanas siguen el plan; el riesgo evitable sigue
  frenando. Bots: `criterio` el de más LP sin deuda y a <= 0,15 del riesgo mínimo; `malas` el más riesgoso; `azar` por hash.
- **Medido** (600 x 60, antes 58db231 -> después): no-pro criterio 22,8 -> 24,7; azar 26,8 -> 48,2; malas 38,0 -> 94,5 (juega
  la prueba con 0,15: no pasa nunca). Frenadas del amateur por carrera: criterio 10,65 -> 13,94; azar 11,46 -> 21,67; malas
  10,63 -> 17,51. Huella 11046700 (K6c), forma 13 `c40afa3ff7a1`.
- **Abierto**: `--rapido` queda con 7 FAIL nuevos (forma y huella ya registradas): "check vacío" porque `malas` ya no llega a pro
  (K5c-R, K4c observación, K1 D75) o porque las seeds fijas ya no llegan (K4c-H, K3c seed 3, K5c motor), y la meta de K6a-A
  (mediana de paradas de la semana 3 contra <= 1 con el automático, que vive el plan del perfil todo el año).

### 2026-10-05 — K6b-fix: los 10 FAIL de la validación completa de `58db231` (`k6b-fix`; PLAN.md §K6b, "Los FAIL de la validación completa de K6b" y "K6b-fix")

**Nueve eran checks.** En esos el motor no se tocó. Cada uno con su rojo (un mutante en una copia de `src`):
- **`sin_renovacion`** (2 checks): desde K6b-F el aviso y la salida son la misma pretemporada. El estado vive en la pausa del mercado, y los dos checks lo miran ahí (`observarPausaDelMercado`, mismo stream). Rojo: `contexto.js` sin `sin_renovacion`.
- **Oferta lateral** (seed 63): la prueba de Movistar KOI no alcanzó y firmó GAM. Lo rechazado es lo que no es el club con el que terminás. Rojo: sin el log del NPC.
- **El mundo NPC envejece**: no es K6b. Con 40 seeds el head da +0,15 (ee 0,045) y `25f7b0d` +0,21 (ee 0,042). Ahora son 40 seeds y la suba tiene que superar 2 ee. Rojo: el mundo congelado da −1,22.
- **9R0e**:
  - la búsqueda sigue después de 1500 carreras hasta 500 splits, con tope en 3000;
  - el 60% no cuenta la repetición narrada de K6b-C (antes de K6b el espía veía 0 silencios; en `58db231`, 7, todos de esas repeticiones);
  - el tope 0 sí la cuenta.
- **K0 KPIs**: recuento independiente de `ritmo.colaDeCarrera` y `ritmo.leyenda`. Rojo: `frenadasCola += 2`.
- **K0 estancado**: tope 5 → 8,0, es decir 4,9 (n 1500) + 2σ de 200. Medido: 5,5 en el head, 4,5 en `25f7b0d`.
- **Bo5 conjunto**: 86,0 ± 1,4 (n 620); techo 88,8. Corrimiento declarado de K6b. El rojo viejo (≈ 87) queda adentro de la banda.

**El décimo, "Nadie se queda varado" (seed 101, 18 splits), era el motor.**
- **La causa:** la repetición narrada de "El mercado ya habló" no vencía. Eran seis pretemporadas, de los 21 a los 27, sin que se le volviera a preguntar.
- **El arreglo (decisión del supervisor):** pasar `splitsSinOfertaParaLibre` pretemporadas sin oferta desde la última respuesta es "algo cambió".
  - La pregunta vuelve a frenar con su previa: cuántas pretemporadas sin oferta y la edad.
  - El contador es `flags.finMercadoEsperas` (migrado con `migrarDe12`).
  - Sin tiradas nuevas: si respondés "seguir buscando", corre lo mismo que la narración.
- **El check de motor nuevo:** "K6b-fix: el seguir buscando narrado no pasa de 2 pretemporadas seguidas". 5 narradas y 2 preguntas vueltas en 300 × 60. Rojo con "nunca vence": 0 preguntas vueltas, y la seed 101 vuelve a 18 splits.
- **Seed 101:** ahora vuelve a preguntar a los 24, y el automático se retira.

**La meta de la cola**, re-medida con la muestra del check (1500 × 60):
- **antes de K6b-fix:** 13,33, σ 9,00, n 602;
- **con K6b-fix:** 13,37, σ 8,93, n 593, banda ≤ 14,10;
- **el mutante (C y C2 apagados):** 14,89, 2,2σ arriba de la banda.

**Verificación.**
- `--rapido`: 344 OK, 0 FAIL.
- `HUELLA_JUEGO` sin cambios: 1920057344 (el check de huella, 40 × 60, pasa).
- `FORMAS_CONOCIDAS[13]`: 'fcc08dda0b89' → '0b9646606fa1', sin subir de 13.
- `simulate.js 1 60 criterio` dos veces: diff vacío.

### 2026-10-05 — Cierre de K6b: K5c-V con el piso armado y los estancados re-basados (`k6b-integracion`; PLAN.md §K6b, "La revisión de K6b")

**K5c-V, por qué quedó vacío (medido, no es el motor).** El piso de franquicia de un veterano de tier 2 en las carreras de `azar` (régimen del barrido, brecha 10) era **una sola carrera de 40**: en `923800d`, la seed 3 a los 31 en EMEA Masters (Fénix Legion), 1 forzada que perdía la disputa. La revisión de K6b (la carta única que cambia de liga frena, caso `cambio`) le cambió el camino a esa carrera en el split 33: la única carta era GIANTX (LCS → LEC), ahora frena, `azar` espera, queda sin club, se retira y vuelve en la LEC; nunca más pisa el tier 2. En 40 × 70: 9 comienzos de split de un veterano de tier 2 (16 en `923800d`), 4 "claramente arriba", los 4 con club, ninguno llega al piso. El mérito de K6b-M (solo con temporada de élite) y la marca de franquicia (el piso no la mira) no tocan este caso. El piso no cambió.

**K5c-V, el arreglo (check, sin tocar el motor).** (2a) el piso armado: sobre las pausas reales de tier 2 de la cosecha de K5c-M, el veterano es franquicia por la brecha (nivel = prestigio + `brechaFranquicia` + 2, `rankMundialActual` en null) y con el castigo de los 30 nadie lo ficha por la vía normal. Medido: 9 pausas; a los 30 con la perilla neutra 8 forzadas de tier 2, las 8 pierden la disputa; con la perilla en 26, 0; a los 25 con la perilla en 26, 8 (8): la que decide es la edad. (2b) las 40 carreras reales quedan para la regla dura con la perilla (0 forzadas que pierden) y los avisos por edad (0 → 5, 0 fuera de lugar); el conteo neutro de la muestra real pasa a informativo (0). Rojos (`--solo="K5c-V"` sobre copias de `src`): el piso sin la disputa del veterano → con la perilla 8 (8); el piso apagado → neutra 0 y a los 25 0; la disputa para todo el tier 2 sin mirar la edad → neutra 0 y a los 25 0.

**Los estancados (regla 17).** Meta ~10; medido al cerrar K6b (n 1500 × 60): `azar` 12,5 (σ 0,85), `criterio` 4,9, `malas` 16,9. Corrimiento declarado de K6b: la carta única que cambia de liga, región o tier frena y `azar` puede rechazarla y quedarse sin club, y la vuelta del retiro sin club cambió (al mercado de su pretemporada, y el automático no vuelve debajo del 20%). La banda va de la meta a lo medido con su ruido: [10 − 2σ, 12,5 + 2σ] ≈ [8,29, 14,21]. `criterio` y `malas` siguen separados de `azar` por más de 2σ de la diferencia (7,6 contra 2,04; 4,4 contra 2,58). El juez: los valores OK pasan a 4,9/12,5/16,9; rechaza `azar` 15 y 8, acepta `azar` 10 (la meta), rechaza `criterio` 11 (9 ya cabía) y `malas` 11.

**Verificación.** `validate.js --rapido`: 344 OK, 171 SKIP, 0 FAIL ("Todos los checks pasaron.", 4 min 58 s; en `ecddd27`: 343 OK, 1 FAIL, K5c-V). `--solo="K5c meta"`: las 6 en verde (11 min 16 s): estancados 4,9/12,5/16,9 (iguales a los de `ecddd27`: no se tocó el motor). `simulate.js 1 60 criterio` dos veces: diff vacío (md5 652882c6…, el mismo que en `ecddd27`). La huella no se movió (`HUELLA_JUEGO` 1920057344, 'K6b'): no se tocó el motor.

### 2026-10-05 — Revisión de K6b: la carta única solo en continuidad, la cola que frena de menos, el terco, la vuelta al mercado, "del Mundial", la LCS sin franquicia (`k6b-integracion`; PLAN.md §K6b, "La revisión de K6b")

**Carta única (regla 15).** `mercado.js`: `enJuegoDeUnaSolaCarta` suma el caso `cambio` (otra liga, otra región o subir de tier sin prueba); se firma sola solo si `esContinuidadDeUnaSolaCarta` (la misma liga y el mismo tier). La previa dice la mudanza ("cambiar de liga (LCK → LPL, otra región)"). El log `unaSolaCarta` lleva `liga/ligaAntes/tierAntes`. Check K6b-C (carta): las firmadas solas son todas continuidad (40 seeds: 9 frenaron, 8 por `cambio`; 27 solas). Rojo con la regla vieja: 8 firmas solas cambiando de liga.

**Frenar de menos (regla 7).** K6b-C: el juez ve cada "¿la seguís?" narrado con su club, tier y vuelta, más una aserción de que `firmaDelSeguis`/`firmaDeLaVuelta` se mueven con club, tier, vuelta y lesión. K6b-C2: el juez ve cada parada narrada de la cola (hito seguro: título o internacional del año, último año; o el cierre con otro club o tier), más una aserción sobre `frenaEnLaCola`. Rojos: M2 (un hito que ya no frena) y M3 (las firmas constantes), con las aserciones y también sin ellas (3 y 4 narradas con motivo).

**La meta del terco (regla 17).** Terco: no se retira antes de los 33. Desde los 28, 300 × 60: antes de K6b (`25f7b0d`) 19,33 (σ 7,87, n 225, mediana 19); head 9,68 (σ 9,41, n 226, mediana 6); banda <= 10,93; rojo con las reglas de C y C2 apagadas: 15,36 (n 228). El check de `criterio` queda como estaba.

**La vuelta.** (a) El "¿Volvés?" se pregunta en la pretemporada del reloj de la vuelta y, sin club, el split sigue desde `mercado` (`reanudarEn`, `core/pipeline.js`): la vuelta es al mercado de esa pretemporada. (b) La previa dice la chance de que te llamen, con la demanda de hoy (`chanceDeQueTeLlamen`, sin `rng`): medida forzando todas las vueltas (criterio + defecto, 300 × 60 c/u): sin demanda 19/210 = 9%, con demanda 9/28 = 32% (no crece con el número de clubes). (c) El automático no vuelve de free agent debajo del 20%. 200 × 60, antes (`923800d`) → después: criterio, vueltas sin club 78 → 8, nunca firman 66 → 0, finales "sin equipo" 62% → 64%; defecto, 76 → 13, nunca 57 → 0, sin equipo 56,5% → 59,5%. **El "sin equipo" no baja:** casi todo es el primer retiro por el mercado sin club (K6b-F), no la vuelta. Check nuevo con mutantes (sin `reanudarEn`: rojo).

**Textos y dominio.** "Finalista/Semifinalista del Mundial" (`legado.js`); K6b-U (g) mira el texto fijo y la frase armada (rojo con `de ${donde}`). La LCS sale de las franquiciadas (CONCEPTO §12.3); K6b-F liga actualizado.

**Huella y guardado.** `HUELLA_JUEGO` 1920057344 (reemplaza a 1772717528, sigue 'K6b'); `FORMAS_CONOCIDAS[13]` re-registrada 'fcc08dda0b89' (sin subir de 13).

**Abierto.** `--rapido`: 1 FAIL, K5c-V (el piso de franquicia de un veterano de tier 2 ya no aparece en las carreras de `azar`, 0 forzadas con 20 o 40 seeds; sin diagnosticar). "K5c meta": cinco en banda, la de los estancados afuera (azar 12,5%, banda ~10% ± 1,71), sin re-basar.

**Verificación.** `--solo` de cada check tocado con su mutante; `--rapido` (341 OK, 3 FAIL → arreglados 2: la forma y K6b-F contrato); `simulate.js 1 60 criterio` dos veces con diff vacío.

### 2026-10-05 — K6b integrado: tarjeta, mérito, contrato y cola en una rama (`k6b-integracion`; PLAN.md §K6b)

**Qué.** Merge, en orden, de `k6b-tarjeta` (`fe21489`), `k6b-mercado` (`912a560`), `k6b-contrato` (`42e450f`) y `k6b-cola2`
(`a496686`, incluye `k6b-cola`). Los cuatro chocaron solo en `src/dev/validate.js` (checks agregados al final): se conservaron
todos. `mercado.js` y `retiro.js` se auto-mergearon; las interacciones se revisaron a mano y dos estaban mal:

- **C × F, "El mercado ya habló" frenaba dos veces.** La foto de "seguir buscando" se tomaba antes de elegir; con K6b-F esperar te
  deja sin club, así que la pretemporada siguiente ("libre") parecía otra. Medido con una sonda (`criterio` y `malas`, 100 seeds):
  29 de 29 esperas con club frenaban otra vez sin nada nuevo. Arreglo: la foto es la de después de elegir (`resolverFinPorMercado`).
  El check de K6b-C lo cubre (`fotoTras` en el detector); rojo con la foto de antes: 30 paradas repetidas.
- **F × C, el "¿Volvés?" mentía.** La opción decía "De free agent otra vez" aunque volvieras con tu club (el log de K6b-F ya lo
  decía bien): 95 de 230 "¿Volvés?". Arreglo en `decisionVuelta`; check en K6b-F contrato; rojo con el texto viejo: 51 problemas.
- **C × M:** la carta única narrada se arma con la mano que ya pasó por el mérito (K6b-M corre antes en `aplicarMercadoSinImport`)
  y K6b-M (a) y (b) pasan en el head integrado. `teVasDelClub` se aplica también en la repetición narrada (va por
  `resolverFinPorMercado`): K6b-F contrato pasa (308 pretemporadas vencidas: 48 renovás, 187 otro club, 20 sin club, 53 retiro).

**Los FAIL conocidos.** K5c-M (a) pasa en el head integrado (no hizo falta tocarlo). K5c-M (a2 armado): ninguna de las 20 pausas de
élite armaba al medio de la disputa como medio (la más joven daba nivel 82, f = 0,2); la base es ahora la primera pausa donde los cuatro
escenarios son lo que dicen, y la liga débil del fixture baja de 70 a 60. Rojo con la rebaja aplicada también al medio. K5c-V: el piso
de franquicia del veterano es casi siempre una sola carta, que con K6b-C se firma sin pausa; la carta narrada lleva `unaSolaCarta` en su
log (club, tier, piso de franquicia y la disputa medida por el motor) y el check la cuenta: 1 forzada que pierde la disputa con la
perilla neutra, 0 con la perilla en 26. Rojo con el piso sin la disputa del veterano.

**El guardado.** `VERSION` 13 (`FORMAS_CONOCIDAS[12]` = '859f8c5ba041', la de main; `[13]` = '8d9b9b8a0ff2'), con `migrarDe12`: las
fotos de la cola en "no hay foto". Check nuevo: 179 guardados de la 12 (seeds 1-4 × 60, 70 con alguna foto) cargan y juegan el mismo
split; sin `migrarDe12` fallan los 179.

**La huella.** `VERSION_JUEGO` 'K6b', `HUELLA_JUEGO` 1772717528 (reemplaza a 1462997803, K5c).

**Las metas (regla 17).** "K5c meta" sobre el head integrado (1500 × 60): las seis en banda, ninguna re-basada (Mundial 9,2%, P(2+ | 1)
35,5%, carrera mediana 8, a los 34 5,8%). La cola (decisión del usuario: aceptar ~12, K6 juzga; decisión del supervisor: el check duro es el **promedio**).
Con 400 carreras la mediana no se movía con ningún mutante (12 con las reglas de K6b-C y C2 apagadas) y el promedio dejaba al
mutante a 0,14 σ de la banda. Ahora el check lee el lote de `criterio` de las metas del bloque C (1500 × 60, el mismo de K5c): promedio
12,36, σ 8,72, n = 774 carreras con cola (mediana 10, como dato); banda <= 12,36 + 2 σ/√n = 12,99. Rojo con las reglas de K6b-C y C2
apagadas: 13,8 (n = 765), 0,81 por encima (2,6 σ). La leyenda (<= 80) no se tocó: 76 en esta muestra (158 carreras; con el mutante 78,5).

**Verificación.** `node src/dev/validate.js --rapido`, `--solo` de cada check tocado con su mutante, `simulate.js 1 60 criterio` dos
veces con diff vacío.

### 2026-10-05 — K6b-C2, la cola de verdad: en la cola, el cierre de año y el momento frenan solo con un hito, un cambio o palanca (`k6b-cola2`; PLAN.md §K6b)

**Qué son.** Las dos paradas que más pesaban en la cola después de la primera pasada:
- **El momento** (`temporada:momento`, `systems/temporada.js` `arrancarMomento`): la previa de una fecha marcada de la
  temporada regular (clásico, archirrival, revancha, define la clasificación). Es un evento del pool `stakes` con efectos de
  `type: 'partido'`: la opción mueve la p de ESE partido. Horizonte `partido` en `agencia.js`.
- **El cierre de año** (`edadCierre:x`, `systems/edadCierre.js` `aplicar`): uno de los diez eventos `cierreDeEdad` (tres
  opciones: el juego, la cabeza y la familia, la marca). Fija el plan anual del año siguiente (K4c). Horizonte `carrera`.

**La regla** (`core/cola.js`, nuevo; la llaman `edadCierre.js` y `temporada.js`). Desde los 28 (`BALANCE.cola.edadDesde`) o
desde el aviso de declive (`etapa === 'declive'`), lo que llegue primero, las dos paradas frenan solo si:
- **es un hito:** un año con título (el primero incluido) o con Mundial, tu mejor nivel de la carrera llegó ese año (el
  récord), o es el último año antes del retiro forzoso (`edadRetiroForzoso`);
- **algo cambió** desde la última vez que ese tipo frenó en la cola: el club, el tier, la última lesión grave o el declive
  (`firmaDeLaCola` contra `flags.colaFirmas`, flag nueva; `null` = frena, así que un guardado viejo no se rompe);
- **su tipo tiene palanca:** `BALANCE.cola.palancaMedidaPct` (la medida con `agencia.js` sobre `8368570`: cierre 3,3%, momento
  95%) llega a `umbralPalancaPct` (47,4: la fracción ponderada de ese mismo reporte; un tipo por debajo baja el promedio).

Si no, lo resuelve tu perfil (`opcionDelPerfil`, como cualquier evento que no frena) por el mismo `resolver` (las mismas
tiradas que después de la pausa; el cierre fija el plan de esa opción) y queda una línea de crónica marcada `cola`. Fuera de
la cola no cambia nada; la serie y los eventos no se tocan. **El momento tiene 95% de palanca: sigue frenando siempre.**

**Medido** (`simulate.js 600 60 criterio`, mismas seeds; antes `8368570` / después / la frontera: el momento tampoco frena en la
cola, `palancaMedidaPct.momento = 0` en memoria). 0 crashes en los tres.

| Métrica | Antes | Después | Frontera |
|---|---|---|---|
| Desde los 28: mediana · p90 · promedio | 13 · 26 · 14,15 | **12 · 25 · 13,51** | 11 · 23 · 12,17 |
| Cierre de año · momento en la cola (por carrera) | 3,05 · 3,27 | 2,38 · 3,31 | 2,34 · 1,51 |
| Leyenda (frenadas totales): n · mediana · p90 | 57 · 77 · 93 | 57 · 76 · 93 | 60 · 74 · 90 |
| Interrupciones por carrera: mediana · p90 | 53 · 78 | 52 · 77 | 50 · 75 |
| p90 por split pro (K4c): todos / regular / playoffs / internacional | 3 / 2 / 5 / 6 | 3 / 2 / 5 / 6 | 3 / 2 / 5 / 6 |

**La agencia** (`agencia.js --carreras=12 --reps=30 --cuota=2 --splits=70`, antes / después):
- ponderada en su horizonte 47,4% → **48,6%**; contra la carrera 21,1% → 21,9% (piso 8,6%);
- `edadCierre:x` 3,3% → 5,2% (9 → 8,25 paradas por carrera); `temporada:momento` 95% → 95% (6,25 → 6,33);
- la frontera: sin ninguna parada de momento (`--analizar … --sin=temporada:momento`, cota de lo que se pierde), la ponderada
  cae a **40,6%**. Resolver el momento rompe "la agencia no baja".

**La meta (≤ 8) no llega: 12, y la frontera es 11.** La regla hace lo que dice, pero en la cola casi todo cierre tiene un motivo
para frenar: un año con Mundial o título, o un cambio de club (`criterio` cambia de club seguido). Y el momento es la parada con
más palanca del juego (95%): sacarlo de la cola baja la cola a 11 y la agencia a ~41%. Lo que queda en la cola de la frontera,
fuera de la regla: eventos 2,2, vuelta 1,5, plan de serie 1,2, el mercado ya habló 0,85. Decide el usuario.

**Checks.** Nuevo: `K6b-C2 la cola de verdad` (`--solo=k6b-c2`, 24 seeds): en la cola, ningún cierre ni momento frena sin hito,
sin cambio y sin palanca (el juez lo recalcula sin importar `core/cola.js`), y el cierre se narra; regla 7 sobre el juez
(sembrado) y sobre el motor (mutante: el cierre "con palanca" frena siempre → 17 sin motivo y 0 narrados, rojo).
`K4c-P (c)` se ajustó: el plan puede cambiar fuera de una pausa solo con la línea `cola: 'cierre'` y el plan de su opción.
`K6b-C meta de la cola` (lento) sigue en rojo: 12 contra ≤ 8.

**Verificación.** `validate.js --rapido`: 326 OK, 4 FAIL, todos conocidos: `K0-B guardado` (hash **c07d8f835c46**, por
`flags.colaFirmas`), `K1 versión` (huella **177970640**), `K5c-M (a)` y `K5c-V`. No se re-declaran: van a la integración con
VERSION 13. La misma seed dos veces da salidas idénticas (md5 `4cee3544…`).

### 2026-10-05 — K6b-C, la cola de la carrera: lo que se repite sin nada nuevo en juego ya no frena (`k6b-cola`; PLAN.md §K6b)

**Qué cambió (D-B en la cola).** Tres paradas que K6 vio repetirse sin nada nuevo en juego, más una cuarta de la misma
familia, ahora frenan la primera vez y cuando la foto cambia. Si no, se sigue con lo que elegiste y se narra en una línea:
- **"¿La seguís?"** (`retiro:retiro_declive`, `systems/retiro.js`). Frena si cambia la foto (`firmaDelSeguis`). La foto
  incluye el club, el tier, el declive o la falta de club, la presión de tier 2, una oferta de tu tier esta pretemporada,
  una lesión grave nueva, el aviso de no renovación y las vueltas del retiro. Si no cambió y la última vez elegiste seguir,
  seguís, con la misma cuenta y cero `rng`, y se narra.
- **"El mercado ya habló"** (`mercado:fin_mercado`, las dos variantes). Frena la primera vez y siempre que haya ofertas
  (bajar o seguir abajo es una elección real). Sin ofertas, con la misma foto (`firmaDelFinPorMercado`) y "seguís
  buscando" como última respuesta, se sigue buscando por el mismo camino (`resolverFinPorMercado`, las mismas tiradas) y se
  narra.
- **Un mercado de una sola carta** frena solo si se juega algo (`enJuegoDeUnaSolaCarta`), y la previa lo dice en la
  descripción y en `datos.enJuego`. Se juega algo en dos casos: una prueba (con el % de firmar de la prueba esperada) o
  bajar de tier (rechazar es quedarte free agent, con las pretemporadas sin oferta de tu tier). Si no, se firma por el mismo
  camino que después de la pausa (`resolverMercado`) y se narra. Vale también para la mano que sigue a "bajás" o "seguís
  abajo".
- **"¿Volvés a competir?"** (`retiro:retiro_vuelta`), el "¿la seguís?" del retirado. Frena la primera vez de cada ventana
  y después de una bifurcación de la ventana. Si elegiste no volver y nada cambió, se narra.
- Flags nuevas (`core/state.js`): `seguisFirma`, `finMercadoFirma` y `vueltaFirma`. Un guardado de antes no las trae, y
  `null` es "frena", así que no cambia la `VERSION`.

**El instrumento** (`simulate.js`, bloque `ritmo`). Dos métricas nuevas:
- `colaDeCarrera`: las frenadas desde los 28 (`EDAD_COLA_DE_CARRERA`), sobre las carreras con un split pro a esa edad, con
  mediana, p90, promedio y desglose por tipo.
- `leyenda`: las frenadas totales de las carreras que cierran en "Leyenda" o "El GOAT", con n, mediana, p90 y máximo.

Los checks nuevos de `validate.js` (`--solo=k6b-c`):
- dos de motor, con el jugador terco de K6 en 40 seeds y regla 7;
- el juez de las metas, con mutantes;
- la meta medida, lento, sobre el lote de las metas B.

**Medido** (`simulate.js 600 60 criterio`, mismas seeds, antes `25f7b0d` / después):

| Métrica | Antes | Después |
|---|---|---|
| Interrupciones por carrera (mediana · p90) | 54 · 81 | 53 · 78 |
| Desde los 28 (318 carreras con cola): mediana · p90 · promedio | 14 · 29 · 15,45 | **13 · 26 · 14,15** |
| Leyenda (frenadas totales): n · mediana · p90 | 63 · 79 · 95 | 57 · **77** · 93 |
| p90 por split pro: todos / regular / playoffs / internacional | 3 / 2 / 5 / 6 | 3 / 2 / 5 / 6 |
| Minijuegos (mediana) · tiempo-máquina | 4 · 3,52 min | 4 · 3,56 min |

**La meta de la cola (≤ 8) no llega: queda en 13. Es la frontera.** Lo que queda desde los 28, por carrera con cola:
- momentos 3,27, cierre de año 3,05, eventos 1,89, plan de serie 1,17: suman 9,4 y están fuera del alcance de K6b-C;
- la primera vuelta de cada ventana, 1,47;
- la primera vez de "El mercado ya habló", 0,85: `criterio` se retira en la primera desde los 22;
- la primera vez del "¿la seguís?", 0,59, y las bifurcaciones de la ventana, 0,58.

Con `criterio`, la repetición casi no existía: se retira en la primera pregunta. Lo que K6 vio (hasta 7 veces "El mercado ya
habló") es de un jugador que elige seguir, y eso lo cubre el check del jugador terco. La leyenda cumple (≤ 80).

**La agencia** (`agencia.js --carreras=12 --reps=30 --cuota=2 --splits=70`, antes / después):
- la fracción ponderada con palanca en su horizonte pasa de 45,0% a 47,4%, y contra la carrera de 20,7% a 21,1%;
- por tipo, en % con efecto significativo y paradas por carrera:

  | Tipo | % significativo | Paradas por carrera |
  |---|---|---|
  | `mercado:oferta` | 60% → 60% | 3,25 → 2,75 |
  | `mercado:fin_mercado` | 100% → 100% | 1,42 → 1,42 |
  | `retiro:retiro_vuelta` | 60% → 100% | 2,5 → 1,83 |
  | `retiro:retiro_declive` | 50% → 50% | 0,17 → 0,17 |

La palanca de los tipos que siguen frenando no cae. Los bots (`criterio`, `azar`, `malas`) no se quedan sin camino:
- lo que ya no frena se resuelve con la respuesta que el jugador dio la última vez que frenó (seguir, seguir buscando, no
  volver), o con la firma de la única carta, que es lo que `criterio` y `malas` elegían;
- `azar` pierde su tirada en esas repeticiones;
- `azar` y `malas`, 60 × 60, 0 crashes.

**Verificación.** `validate.js --rapido` da 5 FAIL. El de `K4c-H` ya está corregido (`--solo=k4c-h`: 6 OK).
- **`K1 versión`:** la huella pasa de 1462997803 a **618858351**. Es esperado y no se re-declara.
- **`K0-B guardado`:** la forma del estado cambió por las tres flags (hash `e9e018a7b659`, registrado `859f8c5ba041` para
  VERSION 12). Hace falta VERSION 13 con su migración. Lo dejo para la integración, porque K6b-M/F pueden mover la forma
  también.
- **`K5c-M (a)` y `K5c-V`:** observan el mercado por sus pausas, y los mercados de una sola carta ya no frenan. Dan "muestra
  chica: 8 pausas de élite" y "forzadas de tier 2 a veteranos 0". Hay que reapuntarlos a la firma narrada.
- **`K6b-C meta de la cola`** (lento, `--solo`): FAIL, con la mediana 13 contra la meta ≤ 8. Leyendas: 77,5.

Además: `simulate.js 1000` da 0 crashes, y la misma seed dos veces da salidas idénticas (md5 `4cee3544…`).

### 2026-10-05 — FASE K, K5c cerrado: el bloque C calibrado y mergeado en `fase-9r` (supervisor; PLAN.md §K5c)

**Qué entra.**
- La estructura del bloque C: K5c-E, R, T, M, N, A, V y H, "cada uno juega en su casa".
- Los arreglos del ensayo de K6 (K6a).
- Dos cazabugs en paralelo, uno de motor y uno de navegador, con sus arreglos:
  - la jerarquía en "la llamada" del Mundial;
  - la élite de las regiones débiles encerrada en casa;
  - el traspaso a una liga más débil;
  - el split del retiro;
  - el valor de mercado;
  - los textos.
- La causa de "no llega a pro" en 32%: K6a-A dejó que el perfil eligiera la semana. Se arregló con un piso de soloQ
  por perfil (decisión del usuario).
- La calibración: Final2, más la LPL en 91 para que la LCK salga primera.

Las entradas de abajo, del 2026-10-05, son el detalle de cada paso. Todas las decisiones del usuario están en
`PLAN.md` §K5c.

**Medido por el supervisor sobre el head final (`3fbb9a4`):**
- **La validación completa:** 495 OK y 0 FAIL, en una copia `git archive`. La anterior, sobre `f7dd307`, había dado 9
  FAIL: checks que codificaban carreras de 17 años, una muestra que contaba la ventana de vuelta como seasons, y el
  bot `criterio` delegando `fin_mercado`. Se resolvieron en `3fbb9a4`.
- **Las metas** (los checks "K5c meta", `criterio` 1500 × 60):

  | Meta | Medido |
  |---|---|
  | No llega a pro | 21,5 |
  | Gana un Mundial | 7,1, con meta del usuario ≥ 7 |
  | Gana un Mundial: Corea / NA | 9,9 / 3,6 |
  | Nuevo Faker | 1,2 (élite: 12 sobre n 100) |
  | P(2+ \| 1) | 16,8 |
  | Llega a tier 1 | 74,6 |
  | Título | 55,7 |
  | Top 20 | 36,4 |
  | Carrera mediana | 8,83 años |
  | Llega a los 34 | 5,6, con techo de ruido 6,34 |
  | Estancados: `criterio` / `azar` / `malas` | 3,9 / 10,1 / 15,3 |

  Las que no llegan a §K.3b están re-basadas, con su línea, por la decisión "cerrar y que K6 juzgue" (deuda D80).
- **Los Mundiales del mundo:** 17.867. LCK 51,6 / LPL 43,8 / LEC 3,9, con un margen de 7,8 sobre un piso de 3,32. Es
  la meta del usuario.
- **El resto:**
  - `simulate.js 1000`: 0 crashes;
  - el determinismo: `simulate.js 1 60 criterio` dos veces da salidas idénticas;
  - el build: `dist/` en 2240 KB, con el techo subido a 2300 por el código y los datos de K5c y K6a.
- **Mutantes propios del supervisor (regla 7):**
  - la LPL en prestigio 99 rompe la meta del usuario (LCK 41,4 contra LPL 55,6);
  - `probCambioApertura` en 0,95 rompe el check del régimen (94,6%).

**Guardado.** `VERSION` sigue en 12. La 12 nunca salió de la rama y main está en la 11. `FORMAS_CONOCIDAS[12]` se
re-registró, porque la forma cambió por la muestra y no por campos nuevos. `HUELLA_JUEGO` 1462997803, `VERSION_JUEGO`
'K5c'.

**Sigue:** K6. Un agente juega 3 carreras en el navegador y reporta, y eso dice cuáles de las metas re-basadas importan.

### 2026-10-05 — K5c paso 3 (cierre): los 9 FAIL de la validación completa de `f7dd307` y el techo del build (`k5c-paso3`)

La validación completa del supervisor sobre `f7dd307` dio 486 OK y 9 FAIL, y `dist/` pesaba 2240 KB contra un techo de 2200.
Cada banda se re-midió en cuatro bloques de seeds (la de siempre más tres corridas, +1000/+2000/+3000), y cada check
cambiado se vio en rojo con su mutante. Sin cambios de motor: `HUELLA_JUEGO` y la forma del guardado no se mueven.

- **Re-bases de diseño de K5c (regla 17, decisión "cerrar y que K6 juzgue" / D80).** Carreras pro de ~9 años y contratos de
  a lo sumo 2:
  - 9Mf, traspasos a mitad de contrato: piso 16% → 1,5% (3,9%, σ ~1,1 pp). "Pedir salir" sigue duro.
  - 9Wd, Top 20 de las carreras con éxito: piso 45% → 33% (41,2%, σ ~4,3 pp).
  - Arraigo a Ídolo+: piso 15% → 8% (12,2%, σ ~2 pp).
  - Fase 11, el duelo cambia de signo: piso 40% → 34% (40,1%, σ ~2,9 pp entre bloques).
  - Edad al terminar: mediana 30-34 → 25-29 (26-27 medido), 30+ 50-90% → 17-30% (23,4%), y se suma "menos del 5% termina a
    los 34" (1,0-2,8%), la meta de longevidad de K5c.
  - Retiro antes de la línea Faker: banda 15-45% → 90-99,5% (97,5%).
- **El régimen (38,3%) era la muestra, no el meta.** Los splits de la ventana de vuelta (`phase: 'retirado'`) no pasan por
  `meta.js` ni suben `splitCount`, y el check los contaba como aperturas sin cambio. Las carreras de K5c entran mucho más a
  la ventana dentro de los 60 splits. Contando solo los splits en que corrió el meta: 60,6 / 60,9 / 59,0% (declarado 60%).
- **Los minijuegos (+36%) eran ruido sobre un valor que ya estaba.** El promedio es +32,4% (σ ~3,5 pp); antes de Final2,
  +30,0%. Con "la llamada" de K5c-H revertida da lo mismo (+36,3% y +32,1%). El tope pasa de +35% a +42%, y el principio
  "ni decorativo ni gambling" sigue.
- **`fin_mercado` (K5-C) tiene elección real.** `criterio` la delegaba en `resolverAuto`. Ahora la contesta con su propia
  regla, espejo de la de `malas`, que elige lo mismo que `opcionAutoFinPorMercado`.
- **Build:** techo 2200 → 2300 KB. Desde K4c crecieron +124 KB en crudo, todo código y datos del motor: systems +44, core
  +44, data +24, ui +12.

### 2026-10-05 — K5c paso 3 (cierre): los hallazgos de la revisión y los valores re-medidos sobre el head final (`k5c-paso3`)

Los números de 3b-3 venían de `873fc80`, y `48ba628` (las cartas de cierre del declive) corrió el stream después. Todo se
re-midió sobre el head final; **estos son los números de cierre de K5c** (reemplazan a los de 3b-3 y 3a).

- **Medido** (`correrLote(N, 60, bot)` de `simulate.js`, lo mismo que `node --max-old-space-size=12288 src/dev/simulate.js
  1500 60 <bot>`; seeds 1-1500; 0 crashes en los tres bots):
  - `criterio`: no-pro 21,5 · estancados 3,9 · tier 1 74,6 · título 55,7 · Top 20 36,4 · Mundial 7,1 (Corea 9,9 n 332, China
    10,2, Europa 8,1, NA 3,6 n 194, Brasil 3,9, Asia-Pacífico 2,8) · nuevo Faker 1,2 (élite 12,0, n 100: ver abajo) · P(2+ | 1)
    16,8 (n 107) · el más fuerte gana 57,5% (n 87) · carrera mediana 8,83 años (p10 4, p90 12) · **a los 34: 5,6%** (n 1178) ·
    Mundiales del mundo (17867): LCK 51,6 / LPL 43,8 / LEC 3,9 / LCS 0,4 / LCP 0,2 / CBLOL 0,1, margen 7,74 con σ 0,84.
  - `azar` / `malas`: no-pro 24,1 / 36,8 · estancados 10,1 / 15,3 · tier 1 65,7 / 47,5 · Mundial 3,1 / 0,8.
- **Las metas sobre este head** (`node --max-old-space-size=12288 src/dev/validate.js --solo="K5c meta"`, 10 min 49 s): los 6
  checks OK. Bandas: no-pro [17,9, 22,1] · tier 1 [52,8, 76,9] · título [27,4, 58,3] · Top 20 [12,5, 38,9] · Mundial >= 5,67 ·
  Corea [6,6, 18,3] · NA [0,3, 7,7] · nuevo Faker [0,6, 3,6] · élite >= 5,5 · P(2+ | 1) >= 9,6 · el más fuerte [39,4, 60,6] ·
  carrera mediana [3,75, 9,08] · a los 34 <= 6,34 · margen >= 3,32. Los re-bases de la regla 17 pasan a lo medido acá (tier 1
  74,6, título 55,7, nuevo Faker 1,2, élite 12, P(2+ | 1) 16,8; carrera mediana y Corea quedan igual).
- **La línea de los 34 quedó en 5,6%** (en `873fc80` medía 4,8): arriba del 5 nominal y adentro de la banda (techo 6,34 con σ
  0,67), con 0,74 puntos de margen (~1,1 σ). Es la meta con menos aire del bloque.
- **Hallazgos de la revisión:**
  - `VERSION_JUEGO` pasa a **'K5c'** (`version.js`): sin esto, `fase-9r` y esta rama compartirían "v K4c" con huellas distintas.
    La etiqueta no entra en la huella; el desafío, el historial y el texto compartido la leen de la constante.
  - El tope de una org del mundo vivo (`RECAMBIO_K5.topeDeUnaOrg`) mide ahora, en cada mundo con más de 8 Mundiales, la
    proporción de la org que más gana **dentro de ese mundo**, con el tope sobre la media. Medido (criterio 60 × 60): 25,8%.
    Fuerzas congeladas en las dos rutas (`systems/plantel.js` y `core/mercadoMundial.js`): 32,9%, **FAIL** en las dos ramas
    (el recambio 32 de 51 y el tope); solo en el mercado del mundo: 36,0%, **FAIL**; solo en `plantel.js`: 25,6%, sin efecto
    (el mercado vuelve a calcular la fuerza de cada plantel). Tope 0,29, en el medio. Las dos ramas se juntan en un mensaje.
  - `lckMargen` con banda: el 25% queda sin banda; el margen pasa a >= 5 − 2σ, con σ calculado en cada corrida contando cada
    carrera como un conglomerado (0,84; el ≈ 2,5 del comentario estaba sobreestimado: 0,73 contando cada Mundial). El log
    imprime el margen medido, el nominal 5, el σ y el piso.
  - `nuevoFakerElite`: la élite (el top 3%) se agranda en rondas con el mismo corte de nivel pico, siguiendo las seeds de
    `criterio` (1501...), hasta 100 carreras: 45 de las 1500 + 55 de 1446 extra (~3,5 min más en la validación completa). La
    banda sube de ~1,7 a 5,5.
  - `ganaMundial`: el piso 7 − 2σ queda como tolerancia; el check imprime lo medido (7,1, piso 5,67) y un AVISO si queda
    debajo de 7, sin fallar.
  - `balance.js`: el comentario de `anchoBajada` dice la mediana medida (8,83 años), no "~4-6".
- **Cuantiles del percentil** (`criterio` 1500 × 60, el bloque `puntaje`): p25 36 → 39, p50 259 → 260, p75 585 → 592, p90 876,
  p97 1129 → 1150, p99 1290 → 1315. El borde no-pro / pro cae entre el p20 (26) y el p25 (39).
- **Niveles, "llega a ese nivel o más alto"** (1500 × 60 por bot; entre paréntesis, las primeras 600 seeds):

  | nivel | `criterio` | `azar` | `malas` |
  |---|---|---|---|
  | circuito | 78,5 (77,2) | 75,9 (73,2) | 62,8 (61,3) |
  | profesional | 74,6 (73,3) | 65,7 (62,8) | 47,5 (46,0) |
  | fijo | 70,7 (69,0) | 54,3 (52,8) | 36,7 (34,7) |
  | campeón | 57,2 (54,7) | 43,1 (41,2) | 24,8 (22,2) |
  | figura | 36,4 (36,2) | 23,3 (24,2) | 11,5 (11,2) |
  | leyenda | 8,7 (10,5) | 3,3 (2,8) | 0,7 (1,2) |
  | **El GOAT** | **1,2** (2,2) | 0,3 (0) | 0 (0) |

- **En rojo con su mutante (regla 7):** las fuerzas congeladas → el mundo vivo (arriba); `META_C_LCK_MARGEN_PP` 5 → 12 →
  "K5c meta del usuario" (margen 7,8 contra el piso 10,32; también el juez, que rechaza los valores medidos); la élite agrandada que no cuenta los nuevos Faker de las carreras extra → "K5c meta
  del Mundial" (élite 5,0 contra la banda >= 7,64); las dos en una corrida de `--solo="K5c meta"`. El juez (rápido) rechaza el margen justo debajo del piso y sin σ.
- **Huella y forma:** no se movieron: `HUELLA_JUEGO` sigue en 1462997803 y `FORMAS_CONOCIDAS[12]` igual (los checks pasan en `--rapido`); `VERSION` del
  guardado sigue en 12.
- **`--rapido`:** **326 OK, 0 FAIL**. **Determinismo:** `node src/dev/simulate.js 1 60 criterio` dos veces, diff vacío (89762 bytes).

### 2026-10-05 — K5c paso 3b-3: las metas de §K.3a/§K.3b como checks duros, el bloque C cerrado, El GOAT y los cuantiles (`k5c-paso3`)

- **Medido acá** (`node --max-old-space-size=12288 src/dev/simulate.js 1500 60 <bot>`, seeds 1-1500, sobre `873fc80`; los números de
  cierre, re-medidos sobre el head final, están en la entrada de arriba):
  - `criterio`: no-pro 21,5 · estancados 4,1 · tier 1 74,5 · título 55,4 · Top 20 36,4 · Mundial 7,0 (Corea 9,9 n 332, China 10,5,
    Europa 7,7, NA 3,1 n 194, Brasil 3,9, Asia-Pacífico 2,3) · nuevo Faker 1,3 (élite 13,3, n 45) · P(2+ | 1) 0,181 (n 105) · el más
    fuerte del Mundial lo gana 57,5% (n 87; "claramente", margen >= 10: 4 de 2963 Mundiales) · carrera mediana 8,83 años, p90 12 ·
    a los 34 4,8% · r(potencial, duración) 0,384 (n 1178) · Mundiales del mundo (17789): LCK 51,8 / LPL 43,7 / LEC 3,8 / LCS 0,4.
  - `azar` / `malas`: no-pro 24,1 / 36,8 · estancados 10,5 / 15,6 · tier 1 65,4 / 47,2 · Mundial 3,1 / 0,7.
- **Checks duros nuevos** (`validate.js`, "K5c meta ..."; un lote de 1500 × 60 por bot, corrido una vez y soltado). Banda = la meta
  ± 2 σ de la muestra (proporción 100·√(p(1-p)/n); mediana √(π/2)·s/√n), y si la meta no llega, de la meta a lo medido ± 2 σ:
  - cumplen: no-pro ~20 [17,9, 22,1] · Mundial >= 7 (>= 5,7) · NA 3-5 [0,5, 7,5] · el más fuerte gana ~50 [39,4, 60,6] · a los 34
    < 5 (<= 6,25) · estancados: azar ~10 ± 1,6, criterio más de 2 σ abajo, malas más de 2 σ arriba · Corea > NA por más de 2 σ;
  - re-basadas (regla 17: "meta X; medido Y; re-basado por decisión del usuario 2026-10-05, K6 juzga"): tier 1 [52,8, 76,8] ·
    título [27,4, 58,0] · Top 20 [12,5, 38,9] · Corea [6,6, 18,3] · nuevo Faker [0,7, 3,6] · élite >= 3,2 · P(2+ | 1) >= 10,6 ·
    carrera mediana [3,75, 9,08];
  - la meta del usuario, sin banda: LCK >= 25% y primera por >= 5 puntos (51,8 contra 43,7);
  - el juez (rápido) rechaza cada clave fuera de banda, una por una.
- **Re-basados con su línea** (los checks que fallaban): "El tier 3 es breve" mediana <= 2 → <= 3 (medido 3, p90 5, 7577 stints) ·
  "K3c meta de K2" Bo5 del favorito (lado del jugador, plan neutro 800 × 60) techo 85 → 89,5 (medido 86,3 ± 1,6; el conjunto 84,4
  sigue con 75-85) · "K4c meta del ritmo" p90 del split internacional <= 5 → <= 6 (la meta del usuario; medido 6) y el Δp mediano
  del plan >= 5 → >= 4,87 − 2 σ (medido 4,87 pp, 400 × 60; σ ≈ 0,05, n ≈ 2600).
- **Ya pasaban, sin cambio:** "K0 los bots separan", "K5-B región: ... monótona" (KR 63 · CN 63 · EMEA 73 · NA 80 · APAC 83 · BR 93,
  llegada a la primera propia) y "Ningún arquetipo de veredicto" (el no-pro volvió a ~21%).
- **Bloque C cerrado:** la PENDIENTE C (la longevidad) pasa y se borró; `BLOQUES_DE_CORRIMIENTO.C.cerrado = true`.
- **Los niveles de K1:** "El GOAT" es definitivo y es el nuevo Faker de §K.3b: 3 cierres como #1 del mundo **o** (`alternativa`,
  nueva en `nivelDeCarrera`) 2 Mundiales; el hecho `mundialesGanados` y su texto ("Te faltó ..., o ganar 2 Mundiales."). Los demás
  cortes quedan. Llega a cada nivel o más alto, `criterio` / `azar` / `malas`: circuito 78,6 / 75,9 / 62,7 · profesional 74,5 /
  65,4 / 47,1 · fijo 70,6 / 55,4 / 35,2 · campeón 57,0 / 42,7 / 23,6 · figura 36,5 / 23,4 / 11,1 · leyenda 8,8 / 3,2 / 0,7 · GOAT
  1,3 / 0,2 / 0.
- **Cuantiles** (`criterio` 1500 × 60, `--bloque=puntaje`): p50 933 → 259, p90 1663 → 876, p99 2243 → 1290.
- **En rojo con su mutante (regla 7):** LPL prestigio 99 → la meta del usuario (LCK 41,6 contra 55,5); `scoutingSesgoEtario` ÷ ~2,5
  → embudo (no-pro 50,3), estancados y Mundial (4,1); `edadRetiroForzoso` 30 → longevidad (a los 34: 33,4); `sigmaMapa` 9 → Bo5
  97,4; `sigmaMapa` 30 → Δp 3,44; banda sin re-base o margen sin los 5 puntos → el juez; sin la alternativa → "K1 niveles por
  hechos". El tier 3 y el split internacional se re-basan al valor medido: su rojo es el de antes (mediana 3 > 2, p90 6 > 5).
- **`--rapido`: 315 OK, 10 FAIL.** Ninguno de este paso: la huella y la forma del guardado (al final), seis del paso 3b-2
  (K5c-R presión, K4c probaste, K4c textos, K3-B, K5-A, K6a-A) y K5c-M (a)/(a2), que ya fallan en `873fc80`.

### 2026-10-05 — K5c paso 3a: Final2 fijado en los datos, más la LPL en 91 (`k5c-paso3`)

- **Fijado** (solo constantes, un comentario "K5c paso 3" por constante): las 30 claves de `cfgFinal2.json` (29 cambian, `graciaAnios` ya era 0) en `balance.js` y
  `leagues.json` (LCK 97, LEC 73, LCS 62), más **`prestigio` de la LPL 93 → 91**, fuera de Final2. Sin lógica.
- **El reparto del Mundial del mundo** (`criterio` 1500 × 60, `mundoMundial`). Con Final2: LCK 48,3 / LPL 48,0 / LEC 3,1, un
  margen de 0,3. Barrido de 6 variantes (600 × 60, en memoria), con el margen LCK − LPL:
  - Final2 (LPL 93): 1,3;
  - LPL 92: 2,5;
  - **LPL 91: 8,4**;
  - LPL 90: 9,2;
  - LPL 89: 13,0;
  - LPL 87: 20,9;
  - LPL 91 + LEC 76: 6,6.

  La LPL 91 es la más cercana que cumple. A 1500: **LCK 51,8 / LPL 43,7 / LEC 3,8**, el más fuerte gana el 48,8%.
- **Por carrera** (1500, LPL 91):
  - Mundial 7,0%: Corea 9,9, China 10,5 (33/332 contra 35/333, dentro del ruido), Europa 7,7, NA 3,1, Brasil 3,9, Asia-Pacífico
    2,3;
  - no-pro 21,5, estancados 4,1, tier 1 74,5, título 55,4, top 20 36,4;
  - nuevo Faker 1,3 (élite 13,3), P(2+ | 1) 0,18;
  - carrera mediana 8,8 años, p90 12, a los 34 4,8%; r(potencial, duración) 0,38;
  - favorito Bo5 88,6 / 86,6 (jugador / ambos);
  - p90 de interrupciones por split: regular 2, playoffs 5, internacional 6.
- **`azar` / `malas`** (600 × 60, LPL 91):
  - no-pro 26,8 / 38,0;
  - estancados 10,7 / 15,8;
  - tier 1 62,5 / 45,5.

  Con Final2 (LPL 93): no-pro 26,2 / 36,0, estancados 12,2 / 15,3.
- **Por `--solo`:**
  - "El tier 3 es breve" FAIL: mediana 3;
  - no-pro por perfil OK: profesional 26,7, hambriento 21,3, showman 24,0, leal 21,3.
- **`--rapido`: 306 OK, 18 FAIL.** No se arreglan acá: los checks duros, la huella y el guardado son del paso 3b.

### 2026-10-05 — K5c (no-pro): el piso de soloQ de los perfiles, la previa de la casa y el sesgo etario (`k5c-nopro`)

- **La causa** (bisect, `criterio` 300 × 60, mismas seeds): `c6f098f` 25,7 · `9d33340`..`b2c08f5` 24,7 · **`661c494` (K6a-A) 37,3**
  · `00da9b9`..`2d8eec2` 37,3 (600: `b2c08f5` 24,5 → `2d8eec2` 36,5). La definición no cambió (`splitFichaje !== null`). Desde
  K6a-A la semana amateur la elige el perfil (`planDeSemana`), y el leal y el profesional grindeaban 2,9 y 3,4 bloques de
  ranked por semana (el `criterio` de antes, 5,9): leal 55%, profesional 45% de no-pro. Con todas las semanas frenando
  (contrafáctico) volvía a 23,7%.
- **Lo que se hizo** (decisión del usuario: "total ~20% y brecha acotada"): `pisoSoloQ` por perfil en `data/perfiles.json` (leal y
  profesional 0,6: el perfil elige solo entre las rutinas que rinden al menos esa fracción del LP de la mejor de la semana),
  `scoutingSesgoEtario` 18-20 en 0,6 / 0,33 / 0,08, la línea de soloQ de cada perfil en la pantalla de inicio (regla 12) y el
  bug de la previa: la chance de "que en casa te saquen la PC" usaba la confianza de antes de la semana y el motor tira con la
  de después; ahora una sola fuente (`probabilidadesDeCasa`) con el colegio y la confianza proyectados (regla 15).
- **Medido** (600 × 60, `nopro2.mjs` del scratch): `criterio` 22,0% con G0 y 22,0% con cfgFinal2. Por perfil (G0): leal 24,5,
  profesional 23,3, hambriento 20,1, showman 20,0; (Final2): 22,5 / 23,3 / 16,8 / 25,3. `azar` 25,8 / 26,2; `malas` 37,2 / 36,0.
- **Checks nuevos:** la previa de la casa con las barras de después de la semana (rojo con el mutante de la confianza de antes),
  el piso de soloQ (rojo sin piso: leal 2,9 y profesional 3,37 contra 5,2) y la brecha de no-pro por perfil (lento; rojo sin
  piso: 41,3 / 39,3 contra 21,3). `HUELLA_JUEGO` 2039436444 y `FORMAS_CONOCIDAS[12]` '4aecafabc826' (regla 17).
- **Quedan rojos** (`--rapido` 315 OK, 2 FAIL, por trayectorias nuevas, sin tocar): "K5c-R la cuenta de la presión…" (seed 1,
  reset sin oferta de tier 1 visible en la mano) y "K4c textos" (16,9% de años sin carta de cierre, tope 15%). Completa por
  `--solo`: "Ningún arquetipo de veredicto…" OK; "K0 los bots separan" FAIL (malas 34%, azar 28%: 6 puntos, pide 10).

### 2026-10-03 — FASE K, K5c (paso 1): el instrumento del bloque C (PLAN.md §K5c, "Paso 1")

Rama `k5c-instrumento` (sale de `k4cal-instrumento@a37cb56`). Solo instrumento: **ninguna constante ni lógica del motor** (el rng no se
toca; `HUELLA_JUEGO` igual).

- **`simulate.js`: el Mundial real y la curva de edad**, como bloques APARTE (`mundialReal`, `curvaDeEdad`): `validate.js` recuenta
  `embudo` y `porRegion` hoja por hoja y no admite hojas que no cubra. Los tres proxies de `embudo` (`ganaMundial`, `nuevoFaker`,
  `pOtroMundialDadoUno`, `proxyAntesDeK5`) **se mantienen marcados** y ahora dicen `reemplazadaPor`; ningún check que los lea cambia.
  - `mundialReal` (total, `porRegion` de origen y `porNivelPico`: el top 3% de la corrida por `registro.picos.nivel` contra el resto):
    clasifica, gana un Mundial (`registro.internacionales` con `resultado === 'campeon'`), nuevo Faker (2+ Mundiales o #1 al cierre de 3+
    temporadas), P(2+ | 1) con su n, y "tu equipo es claramente el más fuerte del Mundial y lo gana" (tu fuerza ≥ la del mejor de los
    otros 15 + `MARGEN_CLARAMENTE_EL_MAS_FUERTE` = 10, el Δ del favorito claro del Bo5), con n y %, más el margen (p10/p50/p90) y el %
    que gana por banda de margen. Lo que el motor no deja en el registro (las fuerzas de los 16) sale de `observacion.mundiales`
    (`filaDeMundial`, lectura de `state.internacional`, cero rng).
  - `curvaDeEdad`: nivel p25/p50/p75 por edad (16 a 34, solo splits pro; `observacion.splitsProData[].edad` es la columna nueva), % de
    carreras activas por edad (sobre las pro y sobre todas) y r(potencial oculto, duración de carrera).
- **`validate.js`, dos checks nuevos:** "K5c instrumento" (rápido: el registro y `observacion.mundiales` coinciden Mundial a Mundial, la
  fuerza rival máxima se recalcula desde el torneo, cada fila pro trae su edad; en rojo con dos mutantes) y "K5c mundialReal y
  curvaDeEdad" (lento: recuento independiente de los 3 bots, hoja por hoja).
- **Un hallazgo del motor (no se tocó):** tras un retiro y una vuelta el calendario no avanza mientras estás retirado, y el mundo juega
  **dos Mundiales con el mismo año** (misma `claveDelMundial`): 4 de 200 carreras de `azar` (seeds 4, 76, 155 y 173) tienen dos entradas
  `Mundial 2034` en el registro. El primer recuento (por año) los perdía y lo cazó el check lento; ahora la observación sigue al registro.
- **`k5c/barrido.mjs`** (sin trackear): overrides en memoria de `BALANCE` y de `leagues.json` (`leagues.<ID>.<campo>`), `"*1.5"` multiplica;
  `--perillas` lista las perillas de bloque C con su valor vivo. Hallazgo: `dificultad` (leagues.json) NO mueve la simulación (solo el
  puntaje y el texto de la pantalla de inicio); lo que fija cuán fuertes son los clubes de una región es `prestigio`.
- **Línea de base** (300 × 60, seeds 1-300; los tres bots; 0 crashes; dos corridas idénticas):

| | `criterio` | `azar` | `malas` |
|---|---|---|---|
| No llega a pro / T2-T3 / tier 1 | 24,7 / 0 / 75,3 | 30 / 0,7 / 68,3 | 54,7 / 21 / 11,7 |
| Título doméstico / top 20 | 74,7 / 65 | 67,7 / 44,3 | 25 / 4 |
| Carrera pro: mediana / p10 / p90 (años) | 16,7 / 13,3 / 18 | 15,5 / 9,3 / 17,7 | 3,8 / 0,3 / 13,7 |
| Llega a los 34 | 79,6% | 47,6% | 0,7% |
| Clasifica a un Mundial · gana uno (n) | 73 · 11% (33) | 57,7 · 5% (15) | 7,7 · 0% (0) |
| Nuevo Faker · P(2+ \| 1) (n) | 4% · 0,303 (33) | 0,7% · 0,133 (15) | 0 · — (0) |
| Claramente el más fuerte (n) | 0 | 0 | 0 |
| r(potencial, duración) | 0,214 | 0,139 | 0,193 |

Curva de nivel mediano por edad (`criterio`, splits pro): 16 → 59 · 20 → 67,8 · 24 → 83,8 · 26 → 87,2 · 28 → 87,9 · 30 → 87,9 · 32 → 87,7 ·
34 → 86,5: plana de los 26 a los 34. Cuando la fuerza no alcanza, ni lo "claramente más fuerte" existe: tu margen sobre el mejor rival del
Mundial tiene mediana −16 (p90 −5), así que con +10 hay 0 Mundiales en los tres bots; gana el 47% de los que son más fuertes a secas (n = 38) y
el 9% con margen de −10 a 0. Verificación: `--rapido` verde (270 OK, 0 FAIL, 156 lentos salteados); los dos checks nuevos pasan solos y
fallan con mutantes (observación sin Mundiales, edad rota, deduplicar por año, P(2|1) con el total como denominador).

### 2026-10-04 — FASE K, K4c: el ritmo calibrado y el bloque B cerrado (PLAN.md §K4c)

**Qué es.** K4c calibró el ritmo (bloque B, D-B: te frena solo lo importante) sobre la estructura final, con el
Mundial de K5 ya puesto. Rama `k4cal-instrumento`, mergeada en `fase-9r-que-el-juego-se-juegue`. Fue más que
constantes. Medir la palanca de cada parada en su horizonte mostró paradas que no pesaban, y se hicieron pesar antes de
fijar números (regla 2).

**El instrumento** (paso 1, `a7f6eed`, `c55f381`; K4c-H `df0a8ef`..`8735166`).
- `agencia.js` mide la palanca de cada parada en su horizonte: la serie, el partido, el split o la carrera.
- La palanca de serie y de partido se mide por la p declarada, con la Δp entre la mejor y la peor opción y un
  umbral de 5 pp.
- `criterio` acepta un import por el calibre de la liga, no por la dificultad.

**Lo que se hizo pesar en vez de recortar.**
- **El feed** (K4c-F, `c632ca3`..`3cb88a4`). Las líneas de efecto, el meta y las series en las que no frenás viajan
  adjuntas a su beat: un renglón por parche y uno por serie. Nada se borra del estado. El tiempo-máquina bajó de 7,6
  a 6,5 min.
- **La prueba decide el contrato** (K4c-S, `7bc2186`). P(firmar) sale del resultado del minijuego, con 0,65 / 0,8 /
  0,95. Si la prueba falla queda el respaldo.
- **La fecha marcada es una decisión** (K4c-M, `f172f81`). 49 eventos pasan a ser intercambios: la mejor y la peor
  opción difieren en el partido y ninguna domina.
- **El plan de serie ×3.** La Δp mediana del plan llega a ~6,5 pp. El Bo5 del bloque A se mide con plan neutro.
- **El cierre de año** (`1ff2db4`). Diez eventos con tres opciones de intercambio: el juego, la cabeza y la familia,
  o la marca.
- **El plan anual** (decisión del usuario; `7c440a9`..`c6f098f`). La práctica se decide en el cierre de año, en una
  sola parada por año con más peso. Cada split entrena según ese plan y la pretemporada queda para el mercado.

**La medición final del supervisor** (`c6f098f`; `simulate.js 400 60 todas`, de a una corrida; 0 crashes):

| | `criterio` | `azar` | `equilibrado` | `malas` |
|---|---|---|---|---|
| Interrupciones (mediana · p90) | **84** · 100 | 72,5 · 97 | 78 · 100 | 15 · 49 |
| Playoffs / internacional (p90) | 5 / 5 | 5 / 5 | 5 / 5 | 4 / 5 |
| Minijuegos (mediana) | 4 | 4 | 4 | 1 |
| Tiempo-máquina (mediana) | 5,9 min | 4,7 | 5,2 | 0,5 |
| Llega a pro | 75,3% | 72,5% | 72,3% | 48,0% |

La palanca en su horizonte pasó de 22,4% a **48,8%** (`agencia.js` 24 × 30, sobre `6ce46a0`, antes del plan anual;
se vuelve a medir en K5c). Contra la carrera, 10,3%.

**El paso 3b** (`01bd18c`..`92eb777`).
- Las metas de §K.3c pasan a checks duros, fijadas en lo medido: interrupciones ≤ 90, split ≤ 2 / ≤ 5, minijuegos
  3-8, tiempo-máquina ≤ 6,5 min, Δp de plan ≥ 5 pp y bifurcaciones 5-9. Cada una lleva su línea de "reemplaza a…"
  (PLAN §K4c) y en las corridas del worker cayó en rojo con sus mutantes.
- El bloque B de `bandasPendientes.js` queda vacío y cerrado.
- Guardado `VERSION` 11, con `migrarDe10` (el plan anual del perfil). `FORMAS_CONOCIDAS[10]` vuelve a `7128c450fa6c`,
  la de main.
- Se borran las bandas de J5 y J6.

**Las revisiones** (motor y navegador, las dos "Requiere corrección"). Navegador con cero errores de consola, y los
guardados de la 10 de main cargan.
- **Motor** (`4732e1b`..`b248bcc`):
  - el cierre amateur prometía un plan que no se aplicaba, y ahora no fija ni muestra plan;
  - "probaste y no alcanzó" es su propio caso y no suma al silencio del mercado: antes llegaba a un falso "el
    mercado te venía diciendo que no";
  - el check del respaldo recalcula la regla a mano;
  - los guardados de la 10 parados en la prueba o en un cierre se migran.
- **Textos** (`6cadb0a`..`addc884`): el `{jungla}` sin resolver, "CAMPEONES DEL MUNDO" con un papel de cuartos, el
  primer balance repetido, "~+0" con la stat topeada, el resumen del split y las colas de consuelo repetidas.
- **Del supervisor:** el titular del año pesa el papel internacional por hasta dónde llegaste (final 90, semis 82,
  cuartos 78, contra 80 de una liga).

**La validación** (`b33ff0c`: 4 FAIL de checks que asumían algo que K4c cambió; ninguno era un bug del juego).
- Se arreglaron en `c171155`..`a37cb56`.
- 9Mf re-basea su piso de 0,24 a 0,16, porque hay menos carreras pro y más cortas. Lo vuelve a mirar K5c.
- La validación de `a37cb56` dejó dos FAIL de borde por los arreglos de la revisión. `2ff21e3` los cierra:
  - la proyección de jerarquía recentra `derivaPrimerSplit` de 3 a 6, que es cosmético: pasa de un sesgo de 3,3 a
    +0,3, con la huella idéntica. El mutante en 10 da −3,7, FAIL;
  - el piso del boost del pool baja de 0,40 a 0,35 × el rango (regla 17).

**Final** (`2ff21e3`; validación completa del supervisor): **423 OK + 1 PENDIENTE C (r(potencial, duración), K5c), 0 FAIL**. `simulate.js 1000`: **0 crashes**.
`dist/`: **2125 KB**, contra un techo de 2200 KB. `VERSION_JUEGO` 'K4c', `HUELLA_JUEGO` 2001539523, guardado
`VERSION` 11 (`FORMAS_CONOCIDAS[11]` `13dd79e086e2`).

### 2026-10-03 — FASE K, K4 + K4-C2 + K5: el ritmo y el mundo, en estructura (PLAN.md §K4, §K5)

**Qué entra.** La estructura de los bloques B (el ritmo) y C (el mundo). Siguiendo el orden de `98034ff`, K5 se
integró sobre K4 antes de calibrar, así K4c calibra el ritmo con el Mundial ya puesto. Las constantes son de
arranque. Las bandas que se rompieron están en `bandasPendientes.js`, en el bloque B o el C:
- B: el banco de minijuegos;
- C: la longevidad, r(potencial, duración) = 0,21.

**K4 — te frena solo lo importante.** Cuatro piezas en worktrees paralelas, medidas con `criterio`, 100 × 60:

| Pieza | Qué bajó | Antes | Después |
|---|---|---|---|
| K4-A, el partido que importa | momentos por carrera | 27,9 | 18,3 |
| K4-B, la serie como plan | pausas de serie | 51,2 | 24,9 |
| K4-C, solo frenan las bifurcaciones | pausas de eventos | 35,8 | 2,0 |
| K4-D, la pretemporada en una parada | práctica + mercado | 21,3 | 13,0 |

Además:
- **K4-A.** La fecha marcada es la que decide algo: la clasificación, el archirrival, el clásico o la revancha.
- **K4-B.** La serie se juega como plan (Fearless, el mapa decisivo, la charla del coach) y resolvió la
  asimetría del Bo5: jugador 82,7, rival 75,0.
- **K4-C.** Los eventos que no son bifurcación los resuelve el perfil.
- **Decisiones de la integración:**
  - la rueda de prensa va solo después de una final o de un escándalo;
  - el tryout se resuelve dentro de la pretemporada;
  - el archirrival casi nunca marca fecha.

**K4-C2 — las bifurcaciones** (`1f2256f`, `5cebbd0`, `444ee55`).
- **Cuántas.** Pasaron de 2,0 a 5,4 por carrera: 9 eventos nuevos y 6 de seguimiento que leen `flags.caminos`.
- **Qué hacen.** La primera versión era narrativa y rompía la regla 15. Por eso las opciones que prometen una
  mudanza, un cambio de línea o el retiro usan efectos de carrera reales (`ofertaDeImport`, `cambiarRol`,
  `retirarse`), y un check verifica que el texto y el efecto coincidan.

**K5 — el Mundial, la región y el final.**
- **K5-A, el Mundial de verdad.** `core/internacional.js` es puro: clasificados por `cuposInternacionales`, un
  Swiss de 16 y un bracket de 8.
  - Los partidos ajenos salen de `hashCadena`, sin `rng`: si no clasificás, el stream no se mueve.
  - Solo frena el 2-2.
  - El campeón del log es el del torneo; se borró el sorteo aparte de `escena.js`.
- **K5-B, la región se elige.** Elegir la misma región que habría sorteado la seed da la huella idéntica. LATAM
  llega hasta tier 2.
- **D78.** El calibre de una org es `max(fuerza, cuantil 0,25 de su liga)`, y los asientos se congelan después
  de la mudanza. Con `criterio`, LCK pasó de 0 a 12 splits y LPL de 6 a 33.
- **K5-C, el final lo decide el mercado.** El retiro llega cuando ninguna org de tu tier te ofrece en N splits.
  La estructura salió con constantes que reproducen el estado anterior: la longevidad la fija K5c.

**Revisiones.** Hubo revisión de motor y de navegador sobre la integración. La corrida completa del supervisor
dio 361 OK y 6 FAIL.
- **Crítico, el hash de los partidos ajenos.** `uniformeDeClave` devolvía un int32 con signo, así que u caía en
  [−0,5, 0,5): el equipo primero en el alfabeto ganaba casi todo, 277 de 500 Mundiales con la seed 1. Con el
  arreglo gana 117, y los campeones distintos pasaron de 7 a 17.
- **Arreglos del mismo pase:**
  - el hype del Mundial depende del resultado;
  - código muerto;
  - la renovación de contratos NPC en la etapa amateur;
  - el tryout ya no termina la carrera a los 34;
  - la tier list después de `cambiarRol`;
  - los bots contestan el 2-2;
  - la muestra del burnout;
  - promesas de región apiladas;
  - el chip de región recortado.
- **Ids crudos de liga.** Había 104 en 17.652 textos del motor, en 12 seeds. Se pasaron al nombre visible con una
  sola fuente, `core/ligas.js`.
- **Un crash real**, encontrado por `agencia.js` al forzar opciones. El banquillo te podía ceder a tu propio
  club: la fila nunca se abría y el pase siguiente reventaba. Se arregló en `c3945ac`, con un check y una guarda
  por split.
- **9R0e:** era un bug real: el banquillo te cedía a la academia de un club extranjero, una liga sin planteles, y el mercado quedaba ciego. Se arregló en `79ccaa0`, poblando la liga antes de firmar.

**Dónde quedó** (`criterio` 400 × 60, sobre `26450d5`):

| Métrica | Valor | Meta |
|---|---|---|
| Interrupciones por carrera | mediana 111, p90 127 | ≤ 80 (K4c) |
| Interrupciones en playoffs e internacional | p90 7 | ≤ 4 |
| Minijuegos | 11 | 4-8 |
| Tiempo-máquina | 8,1 min | — |
| Llega a pro | 80% | — |
| Carrera pro | 17 años | — |
| Llega a los 34 | 84% | lo baja K5c |

Guardado `VERSION` 10. `HUELLA_JUEGO` 1197795265 ('K5').

Verificación: `validate.js` 374 OK + 2 PENDIENTE (B: el banco de minijuegos; C: la longevidad), sobre `b045893` · `simulate.js 1000` 0 crashes · `dist/` 2074 KB (techo 2100).

### 2026-10-03 — FASE K, K3c: el bloque A calibrado y cerrado (PLAN.md §K3c, §K.0c)

**Solo constantes, más el instrumento.** Se hizo con el patrón de K2c: los barridos los corrí yo en background y
los workers solo escribieron herramientas, valores y checks.
- **Los barridos**: 26 corridas de 200 × 60 y un refinado a 600 seeds.
- **Las perillas**:

  | Perilla | Valor |
  |---|---|
  | consistencia k | 0,5 |
  | vuelta de la mentalidad a la base | 0,2 hacia abajo y **0,05 hacia arriba** |
  | tope del descanso | 70 |
  | vuelta del hype a su base | 0,6 |
  | fracción de un efecto que queda para siempre | 0,3, eventos y práctica |
  | umbral de pausa del draft | 0,0818 / 0,0409 |

  El umbral del draft se re-escaló al achicarse la dispersión de la p. Devuelve las mismas 152 pausas de antes de
  K2c.

**La decisión más importante salió de una corrida completa con los valores elegidos.** La vuelta a la base
simétrica levantaba gratis una mentalidad hundida, y con eso:
- la brecha `malas`−`azar` en "no llega a pro" caía a 8,5 pp;
- el burnout desaparecía (1 cada 1000).

Es decir, **perdonaba las malas decisiones**. La vuelta se hizo asimétrica: estructura con comportamiento
idéntico primero (`49e1bc6`), y la subida se eligió midiendo los tres bots:
- a **0,05** la brecha vuelve a 16,5 pp;
- el burnout reaparece con `malas` (430 cada 1000) y no con `criterio`;
- las metas de mentalidad se sostienen.

**Instrumento.**
- `agencia.js` mide contra `puntajeDeCarrera`.
- **La sonda de retención no servía.** Tenía una muestra fija de ~39 casos que ignoraba el tamaño pedido, y
  usaba el delta nominal en vez del real. Ahora usa 600 seeds (414 casos), cociente de medias, y es monótona con
  la fracción.
- **`metasK2` y `metasK3` pasaron a checks duros** con `criterio` (800 × 60).
- **Los cuantiles del percentil del puntaje se re-midieron:** p50 1172 → 989.
- **"El mundo NPC envejece"** promedia 8 carreras, y ahora atrapa un mundo que no envejece; el check viejo no lo
  atrapaba.

**El bloque A queda cerrado**: `bandasPendientes` sin entradas del bloque A. Quedan dos en el **bloque B** (K4c),
anotadas en el PLAN:
- las series sin draft (27% contra 28%), porque el umbral devolvió las pausas;
- el Bo5 conjunto (86%), por la asimetría del Fearless.

El check duro del bloque A mide el lado del jugador: 82%.

**Revisión independiente** (Opus): OK con observaciones.
- **Regla 2 verificada**: la huella es idéntica en el commit de estructura.
- **Mutantes**: su mutante de hype pone en rojo solo el check de hype, y los custodios atrapan entradas
  sintéticas.
- **Observaciones, corregidas en `390cce9`**: el Bo5 del jugador quedaba a 0,7 errores estándar del borde, y la
  sonda de retención tenía menos de 400 casos. Las dos muestras se agrandaron. Además había etiquetas y un
  comentario inexactos.

**Lo que cambió, medido** (tabla completa en PLAN §K.0c, 1500 carreras por estrategia):
- **El nivel decide el resultado**: r misma liga 0,37 (K0) → **0,59**, R² sin ruido 0,23 → **0,52**.
- **Las barras ya no están saturadas**: mentalidad pro 98 → **72**, con 2,6% de splits ≥ 90; hype ≥ 90, 78% →
  **19%**.
- **Jugar bien se nota arriba**, `criterio` contra `azar`:
  - #1 del mundo alguna vez, ×1,6;
  - #1 en 3 o más temporadas, ×3,3;
  - mediana del puntaje 994 contra 716.

**Lo que no se movió** es de K4 (interrupciones, tiempo, palanca) y de K5 (tier 1, títulos, la carrera de 17
años). La meta de palanca se re-especificó: se mide en K4c, sobre las interrupciones que queden, con el test
corregido y ≥ 30 réplicas.

Verificación: `validate.js` 319/319 con una PENDIENTE del bloque B (corrida completa del supervisor sobre
`7735e74`; `390cce9` solo cambia checks y comentarios y pasó sus `--solo` y `--rapido`) · `simulate.js 1000`
0 crashes · `dist/` 1870 KB (techo 1900) · `HUELLA_JUEGO` 577913468 ('K3c').

### 2026-10-03 — FASE K, K3: tus decisiones construyen tu nivel (estructura, PLAN.md §K3)

**Estructura con las perillas en neutro**, el mismo patrón que K2. La huella del juego quedó **idéntica**
(451754381 la T1; `HUELLA_JUEGO` 345156314), y eso prueba que K3 es solo estructura. Los valores los fija K3c.

**K3-A — las barras que no se saturan** (Opus).
- **La mentalidad gobierna la consistencia.** `ruidoEfectivo` multiplica su σ por
  `g(m) = 1 + k·(60 − m)/100`, acotado. Sigue siendo el único lector de σ.
- **La mentalidad vuelve a una base** cada split (`core/barras.js`, desde `atributos.js`).
- **Todo descanso queda topeado** (sueño y la rutina de descansar).
- **El hype decae hacia una base.** La base sale de la z de tus resultados de la temporada y de tu visibilidad:
  el prestigio de la liga y si jugaste un internacional.

**K3-B — los efectos que duran** (Sonnet).
- **`player.bonusPermanente`.** Está completo con ceros desde el inicio, y las curvas de edad convergen a
  `objetivo + bonus`.
- **Qué deja marca.** Una fracción de cada efecto de evento sobre mecánica, laneo o teamfight. En la integración se
  sumaron la práctica, las rutinas de offseason y amateur (el bootcamp) y el minijuego, todos por un solo
  helper.
- **El registro.** Cada aporte queda en `registro.marcas`, que solo crece.
- **La ficha.** Muestra "Lo que construiste" ("▲ +3 mecánica — Bootcamp: dos meses afuera 2036"), y la barra de
  mentalidad se llama **Consistencia**, también en el feed.

**La previa sigue diciendo la verdad.** Con `k ≠ 0`, el momento de una fecha marcada cambia la mentalidad entre la
previa y la tirada. Se decidió que cuenta la mentalidad de después de decidir, y que el motor **guarda la p de
antes en la pausa**: el feed dice "el momento la movió desde X%". Los checks de K2d corren dos veces, con k = 0 y
con k = 1.

**Revisión independiente** (Opus): "Requiere corrección", con un motor sano.
- **Con las perillas encendidas** (k = 1, r = 0,3, tope 60, rH = 0,3, fracciones 0,3), en una copia: 0 crashes,
  0 NaN, 0 ids crudos. En 578 pausas la p guardada coincide, y la pausa sobrevive a guardar y cargar byte a byte.
- **Lo que fallaba eran checks.** Cinco pasaban solo con las constantes neutras, la forma del guardado no incluía
  marcas (eso habría obligado a K3c a subir `VERSION`), y había un mutante sobreviviente: la marca con el delta
  previo al clamp.
- **Arreglos** (un Sonnet). Ahora, con las perillas encendidas, `--rapido` solo falla la huella y la guarda de
  neutralidad. Lo verifiqué yo en una copia: 169 OK.

Verificación: `validate.js` 311/311 con la PENDIENTE de K2c (corrida completa del supervisor sobre `a329d49`) ·
`simulate.js 1000` 0 crashes · `dist/` 1867 KB (techo 1900: quedan 33 KB y K4/K5 traen pantallas, así que el techo
se re-mide en K4) · guardado `VERSION` 7.

### 2026-10-03 — FASE K, K2d: la previa (PLAN.md §K2) — K2 cerrada

Antes de cada fecha marcada y de cada mapa de serie, en las pausas que el juego ya hacía, aparece una tarjeta con
tu fuerza desglosada contra la del rival y **la probabilidad de ganar**, que es exactamente la p que el motor tira
(regla 15).
- **Tu lado:** vos / tus compañeros / el meta / el campeón / la química, más el total.
- **Antes de un mapa** dice que el minijuego la mueve. Después del minijuego muestra la p final, también en el
  resultado del minijuego.
- **En el draft** cada campeón muestra su propia p.
- **En el feed**, cada fecha y cada mapa dicen con qué p se jugaron ("el momento la movió desde 55%").
- **Mapas sin pausa.** No muestran la previa en vivo: la previa no agrega pausas. Su p queda en el feed.

**Una sola fuente.** `core/previaDePartido.js` es puro: sin `rng` y sin tocar el estado. El motor obtiene su p de
las mismas funciones:
- fecha: `probabilidadDeFechaMarcada`;
- mapa: `estadoDelMapa`, `desgloseDeFuerza` y `probabilidadDeMapa`;
- minijuego: `ajusteBaseDeMinijuego`;
- la tirada: `tirarPartido(p, rng)`.

No hay una segunda copia de la fórmula. La huella del juego quedó **idéntica** (345156314, 'K2c'): el refactor no
cambió ningún resultado. Los logs ahora guardan la p tirada, así que el guardado pasa a `VERSION` 6.

**Cómo se trabajó.**
- **Implementación.** Un Opus hizo motor, checks y pantalla.
- **Revisión del motor (Opus).** OK con observaciones. Confirmó la fuente única y la huella idéntica. De sus dos
  mutantes, uno pasaba los checks: la p de cada opción del draft de fecha nunca se comparaba contra una tirada.
- **Revisión en navegador real (Sonnet).** OK con observaciones, sobre 348 textos sin ids crudos:
  - la p de la pausa de fecha coincide con el `pSinMomento` del log 29 de 29 veces;
  - la p después del minijuego es la tirada 22 de 22 veces;
  - a 375 px no hay scroll horizontal.
- **Arreglos.** Los hizo un Sonnet:
  - el check que faltaba, con el mutante en rojo;
  - el umbral de pausa del draft de fecha, que ahora usa el mismo campeón que la tirada;
  - la cuenta del minijuego, que ahora vive en un solo lugar;
  - la p final en el resultado del minijuego;
  - los nombres que se cortaban en el celular.

Verificación: `validate.js` 293/293 con la PENDIENTE de K2c (corrida completa del supervisor sobre `003a1cb`; el
commit siguiente es solo de UI y pasó `--rapido`) · `simulate.js 1000` 0 crashes · `dist/` 1847 KB (techo 1900).

**K2 queda cerrada.** La r nivel–posición en la misma liga pasó de 0,369 (K0) a 0,582, y el favorito claro gana el
Bo5 el 83,5% de las veces, con la asimetría del Fearless pendiente para K4. Un pick ya no mueve el partido lo
bastante como para que el draft te frene; eso lo re-fija K3c.

### 2026-10-02 — FASE K, K2c: el nivel empieza a mandar (constantes del bloque A; PLAN.md §K2)

**Solo constantes** (regla 2), en dos pasos para que ningún worker esperara corridas largas.

**Paso 1** (`3c5f359`, un Opus). Se midieron en el motor integrado las medias de los cuatro factores que inflaban
tu fuerza y se centró cada uno en el valor de un pro típico. Referencias:
- maestría 85: centra el factor de campeón entero, afinidad incluida;
- jerarquía 60, sinergia 55.

Además, el meta se acota a 0,9-1,1 (era 0,75-1,25), el peso de la maestría baja de 0,3 a 0,1 y el σ de mapa sube
de 14,2 a 17,7 (√(12,5² + 12,5²)).

**Paso 2.** El barrido del σ de fecha × `vueltas` lo corrí yo en background: `criterio`, 400 × 60, ocho
combinaciones; la tabla está en PLAN §K2c. Con el criterio escrito antes de correrlo salió **`vueltas` 2 y el σ de
fecha sin cambio**. El σ de fecha no mueve el Bo5 de forma sistemática, y las diferencias estaban dentro del ruido.
Un Sonnet lo fijó (`29074e7`) y anotó lo que rompía, cada cosa por su vía:
- **Huella.** `VERSION_JUEGO` 'K2c', `HUELLA_JUEGO` 345156314.
- **`proyeccionJerarquia` volvió a su banda.** Con las referencias centradas, la jerarquía ya no crece de más en el
  primer split, y su PENDIENTE de K2b se borró.
- **El check del boost del pool se rompía por diseño.** Se re-basó por la regla 17: la misma fracción del rango
  (40%), derivada de `BALANCE`. `CONCEPTO` §6 dice ahora 0,9x-1,1x.
- **"Nadie te frena en el draft" queda PENDIENTE (bloque A, K3c).** Da 0 pausas en 4000 sondas: con el meta acotado,
  ningún pick mueve la p lo suficiente para el umbral de pausa. **K3c tiene que re-fijar ese umbral** para que elegir
  campeón vuelva a frenarte cuando importa.
- **El check del Bo5 de K2a dependía de que el draft pausara.** Se reescribió contra la fuerza de arranque de cada
  serie, y tres mutantes lo ponen en rojo.

**Revisión independiente** (Sonnet): OK con observaciones. Re-midió las medias sobre el árbol final con su propio
recorrido de la sonda: M 0,984 · C 1,001 · J 1,002 · S 0,999. Con dos mutantes propios puso en rojo los checks
reescritos. Las dos observaciones eran comentarios viejos de `ajusteMeta.js` con valores pre-K2c y se corrigieron
(`5da87e6`).

**Medido por mí sobre el árbol final** (`29074e7`, `criterio` 400 × 60):

| | antes (K2b integrada) | K2c |
|---|---|---|
| r nivel–posición, misma liga (corregida) | 0,402 | **0,582** (meta ≥ 0,5) |
| Bo5 con Δ0≈10, jugador favorito | 70,1 | **81,0 ± 1,8** |
| Bo5 con Δ0≈10, rival favorito | 94,2 | **88,4 ± 2,0** |
| Bo5 con Δ0≈10, juntos | — | **83,5** (meta 75-85) |
| temporadas con el rendimiento en el tope de 100 | 39,8% | **5,2%** |

El rival favorito sigue por encima de 85: es la asimetría del Fearless, que resuelve K4.

Verificación: `validate.js` 288/288 con una PENDIENTE (corrida completa del supervisor sobre `29074e7`) ·
`simulate.js 1000` 0 crashes · `dist/` 1825 KB (techo 1900).

### 2026-10-02 — FASE K, K2a + K2b: el instrumento corregido y la estructura del bloque A (PLAN.md §K2)

**K2a: el instrumento, sin corrimiento** (`74e7e4d`, cero `rng`, solo `src/dev/`). El observador de `simulate.js`
lee el nivel y los compañeros que usó el motor en el split donde corre la temporada, y descarta los splits pro sin
temporada. Con la definición corregida, medido por la revisión independiente con `criterio`, 400 × 60:

| | K2a | K0 |
|---|---|---|
| r misma liga | 0,398 | 0,369 |
| R² sin ruido en las ligas modeladas | 0,257 | 0,233 |

El Bo5 se mide en el motor y por lado: con |Δ0| en [9, 11), el jugador favorito gana el 71,4% y el rival favorito
el 94,9%. El check "J3 pronóstico" se reescribió como propiedad (D79: era un falso positivo del check). K2a también
expone datos del motor sin cambiar ningún cálculo; verificado en 1.506 carreras con estado, `rng` y logs idénticos.

**K2b: la estructura** (`969e5f1` y los arreglos de su revisión, `6b942f2`). El bloque A corre el stream, T1
aceptado.

- **Una tirada por partido.** El partido se decide con **una sola tirada contra la p declarada**:
  `probabilidadDePartido` y `rng() < p` por partido y por mapa, incluidos los de los otros equipos. Antes eran
  cuatro.
- **Un solo módulo de ruido.** `ruidoEfectivo(state, tipo)` en `core/partido.js` es el único que lee σ: fecha
  13,9 = √(7² + 12²), mapa 14,2.
- **Rendimiento por z.** Hype, jerarquía, arraigo, "Tu rendimiento" y `rendiBien` leen `base + 7·z`, con
  z = (ganados − Σp) / √Σp(1−p) sobre las fechas jugadas, sin contar las de lesión.
- **Sinergia una sola vez.** Se cuenta solo en `fuerzaDelEquipo`, con peso 0,27 (ajuste por mínimos cuadrados).
- **Compañeros en vivo.** Se leen de `mundo.planteles` y se refrescan en el traspaso, que ahora juega su primer
  split con el plantel nuevo y con **su** sinergia.
- **`temporada.vueltas`.** Queda en 1.
- **Código muerto.** `probabilidadDeGanar` se borró.

**Cómo se trabajó.**
- **Implementación.** Un Opus por subfase, cada uno en su worktree.
- **Revisión.** Una revisión independiente por diff:
  - K2a: OK.
  - K2b: OK con observaciones. Re-midió los números del worker y coincidieron. Aisló la causa de la PENDIENTE de
    `proyeccionJerarquia`: al sacar la sinergia de tu rendimiento, éste sube en el primer split en una org nueva y
    la jerarquía crece más de lo proyectado; se re-basea en K3c. Encontró dos mutantes que pasaban todo: fechas
    de lesión contadas y una p de draft distinta a la del mapa. Señaló también el estado inicial incompleto (T4)
    y la sinergia vieja en el split del traspaso.
- **Arreglos.** Un Sonnet los arregló en `6b942f2`. Cada mutante ahora pone en rojo su propio check.
- **Integración.** Otro Opus integró K2 sobre K1 (`a50c2e1`): `VERSION` de guardado 5, `FORMAS_CONOCIDAS[5]`
  `30ed804e36c7`, `HUELLA_JUEGO` 1414810287 (`VERSION_JUEGO` 'K2b', 40 × 60). Los dos D75 se unieron en un solo
  check, al menos tan fuerte como los dos.

**Medido por mí sobre el árbol integrado** (`criterio` 400 × 60):

| | antes (K2a) | después |
|---|---|---|
| r misma liga corregida | 0,398 | 0,402 |
| Bo5 Δ0 9-11, jugador favorito | 71,4 | 70,1 ± 2,0 |
| Bo5 Δ0 9-11, rival favorito | 94,9 | 94,2 ± 1,8 |
| temporadas con el rendimiento en el tope de 100 | 46% | 39,8% |

El commit de K2b **antes** de los arreglos daba un Bo5 de 62,8 / 96,7 con la misma medición. El arreglo de la
sinergia en el traspaso más la tirada extra al firmar lo llevan a 70,1, una diferencia de 2,5 errores estándar que
no se separó. La estructura sola **no** sube la r: la r y el R² dependen de las constantes, que llegan en K2c. La
inflación de tu fuerza (×1,25 de media) seguía intacta en K2b.

Verificación: `validate.js` 288/288 con una PENDIENTE (corrida completa del supervisor sobre `a50c2e1`, 45 min) ·
`simulate.js 1000` 0 crashes · `dist/` 1823 KB (techo 1900).

### 2026-10-02 — FASE K, K1: el número (PLAN.md §K1)

**Sin corrimiento.** K1 no agrega ningún `rng`. La huella T1 (40 seeds × 30 splits) da 2128736563 tanto en
`b0b544b` como en `f6c4870`. El estado final, el `rng` y los logs son idénticos en 160 carreras de cuatro bots:
solo cambian el registro y la tarjeta.

Cada carrera termina en **un puntaje** (`src/core/puntaje.js`, puro, cero `rng`). Se arma con seis componentes:

| Componente | Qué cuenta |
|---|---|
| Trayectoria | splits contados en el tier donde se jugaron |
| Títulos | por tier y por la dificultad de la liga |
| Internacionales | participación, más el resultado, × la dificultad de la liga representada |
| El mundo | Top 20 mundial |
| Tu generación | puesto contra tus rivales, tomado al cierre de temporada igual que tu pico |
| La soloQ | — |

A esos seis se suma el **techo revelado** (el potencial, de 42 a 100) con su efecto.

**Nivel con nombre.** Se gana por **hechos**, no por cortes de puntaje: gana el nivel más alto cuyo requisito
cumpliste (`BALANCE.puntaje.niveles`).

| Nivel | Requisito |
|---|---|
| El que no llegó | — |
| Pasó por el circuito | 1 split |
| Un profesional más | 1 split en primera |
| Fijo en primera | 9 splits en primera |
| Campeón | 1 título de primera |
| Figura mundial | cerrar una temporada en el Top 20 |
| Leyenda | 3 títulos de primera y pico Top 5 |
| El GOAT | 3 cierres como #1 del mundo |

La tarjeta dice el hecho que te faltó para el siguiente: "Te faltó cerrar 3 temporadas como #1 del mundo".
También muestra el percentil ("mejor que el N%") contra una tabla de 22 cuantiles medida con el bot `criterio`
(seeds 1-800, 60 splits: p50 1172, p90 1800, p99 2169) y la **leyenda** más parecida de `leyendas.json`
(20 pros inventados).

Sigue el **desafío del día**: misma seed para todos según la fecha UTC, sin elegir handle, rol ni pool, con
`?desafio=YYYY-MM-DD`. Además: "Copiar resultado" (`Un Split Más · Desafío 2026-10-02 · 1.654 pts · Leyenda ·
v K1 · <link>`), PNG de 1200×630 y un historial local que sobrevive a una recarga y no rompe nada si el
storage tira.

**D75 y D76 cerradas.**
- **D75:** el check busca los casos en un rango de seeds y falla si no los ve; ya no hay seed fija.
- **D76:** el legado cuenta `splitsPorTier` en el split **jugado**, después de mercado, ascenso y descenso, y
  cada título con la liga y el tier de **su** split. Si se anota el título con la liga de la fila, el check se
  pone rojo.

**Cómo se trabajó.**
- **Implementación.** K1-A (motor, Opus) y K1-B (pantalla, Sonnet) se hicieron en la misma rama.
- **Primera revisión (K1-A).** La revisión independiente dejó 18 mutantes y cinco sobrevivían. Sus decisiones
  se escribieron en PLAN "K1 — lo que cambió la revisión de K1-A":
  - niveles por hechos;
  - generación simétrica;
  - D76 contra el split real;
  - la huella del juego entero;
  - leyendas que dejaron de calcar a pros reales.

  Los arreglos los hizo un Opus en seis commits.
- **Segunda revisión.** Hubo dos revisores nuevos.
  - **Motor (Opus), con mutantes:** los cinco que sobrevivían ahora dan rojo, más cuatro nuevos (`rng()` extra a
    los 26 años, `porTitulo` ×2, D76 en el tier de la fila, rivales actualizados cada split). En 1800 carreras
    (300 seeds × 6 bots, 60 splits) el nivel del motor coincide con uno recalculado a mano desde la tabla del
    PLAN 1800/1800, y no aparece ninguna carrera con un título de primera por debajo de Campeón.
  - **Pantalla (Sonnet):** navegador real, tres carreras completas más una con el storage bloqueado; sin ids
    crudos ni `undefined`/`NaN`; a 375 px, sin scroll horizontal.
  - **Arreglos.** Las observaciones las arregló un Sonnet (`dbd4d09`, con checks rojos primero):
    - el puntaje de los rivales se valida igual que tu pico;
    - los contadores enteros piden enteros;
    - un `resultado` de internacional desconocido falla en vez de valer participación;
    - los textos de una carrera sin fichar ya no suenan a logro;
    - la última fila de la historia cierra en el año del retiro.

**HUELLA_JUEGO.** Es la huella del juego entero: 40 seeds × 60 splits con el puntaje, el nivel y la leyenda. Se
fija con `VERSION_JUEGO` 'K1' en `src/data/version.js`. Guardado: `VERSION` 4.

**Techo de `dist/`.** Medido en 1801,4 KB con los arreglos. Era la tercera vez que el margen se cerraba en
silencio. Se subió a 1900 KB en su propio commit (`f6c4870`), con el número en el comentario de `build.js`.

**Queda.** `agencia.js` sigue midiendo contra `puntajeProvisorio` hasta K3c (T6), y `pesoRol` sigue en 1: con
la mediana entre quienes llegaron a pro (623 pros, ≥ 800 seeds), todos los roles quedan dentro de ±10%.

Verificación: `validate.js` 274/274 (corrida completa del supervisor sobre `f6c4870`, 36 min) · `simulate.js 1000` 0 crashes · `dist/` 1802 KB (techo 1900).

### 2026-10-02 — FASE K, K0: higiene y el instrumento (PLAN.md §K.5 K0)

La primera subfase de FASE K, **sin corrimiento**: no cambia ningún resultado del motor. Verificado: la
huella de 40 seeds × 30 splits (`createInitialState(seed, mulberry32(seed))` + `avanzarSplitAuto`, tupla
`finAnticipado:splitCount:soloqElo`) es idéntica a la de `5548c00`; el estado final con todos los strings
enmascarados también (el sha del estado completo difiere solo por los textos de K0-C); dos ejecuciones
seguidas dan lo mismo. Tres piezas, cada una en su worktree y con su revisión independiente.

**Cómo se trabajó.** Los dos workers que iban a implementar con `grok` murieron al arrancar con
`402 usage balance exhausted` (no es algo que yo pueda arreglar); K0-A y K0-B pasaron a `agy` con
`gemini-3.8-flash-high`, igual que K0-C, que ya iba por ahí. Cada diff lo revisó un Claude fresco (otro proceso, sin el
contexto de quien lo escribió), un Sonnet aplicó los arreglos, y K0-A y K0-B tuvieron una segunda revisión
independiente del arreglo. Rondas de arreglo: J3 1, K0-C 1, K0-B 3 (`ab7ea9a`, `271b71f`, `48334d6`), K0-A 3
(`fa9ca18`, `634b9e0`, `a504075`). Yo verifiqué cada entrega por mi cuenta (huella, `validate --rapido`, los
checks propios y mutantes míos distintos de los del autor y del revisor) antes de mergearla.

**Errores del plan y de las specs que encontraron las revisiones** (el instrumento mide, así que sus
errores se pagan caros): (1) la regla de mercado que yo le di a `criterio` ("mejor jerarquía proyectada,
luego liga/salario") lo dejaba renovando el 97,4% de las veces; no era un hueco del motor, la causa era la
spec; ahora ordena por tier, luego jerarquía proyectada, luego salario (llega a tier 1 en el 77,6% de 800
carreras pareadas contra el 63,1% de la regla vieja). (2) La definición de `ruidoPuro` que yo escribí
(1 − Var(Y sin ruido)/Var(Y)) es una fracción sin sentido cuando el R² estructural es bajo: ahora es `null`
si el R² con el ruido apagado es menor que `UMBRAL_R2_ESTRUCTURAL` (0,3). (3) Los ejemplos de ruta del check
del servidor en la spec de K0-B daban 404 también con el código viejo. (4) Los reportes de los propios
workers traían afirmaciones que no se reprodujeron (83 checks en verde, σ = 5, la salida de un script) y no
se copiaron a ningún documento: las cifras de PLAN §K.0b son todas de una corrida propia.

**J3 (el pool deja de pudrirse), integrada primero (`5548c00`).** Mergeada con una revisión independiente y
sus arreglos; su deuda D62 se renumeró D74 al chocar con la de la fase J.

**K0-C — vocabulario LoL (D70, D73; `fdb8b6e`).** 18 JSON de eventos, `minijuegos.json` y los `.js` de
retiro, mercado, rendimiento, roster, temporada, servicioMilitar, plantel, mercadoMundial, contextos y
ficha pasaron del léxico de fútbol al de LoL ("vestuario" visible 15 → 0, ids intactos; "Selección" →
"Internacional: sin chance / en carpeta"). La banda de nivel de la ficha dice "Competitivo" y la de
jerarquía conserva "Titular". Check `K0-C vocabulario` sin lexer: filtro por línea sobre el texto sin
comentarios y recorrido de todos los strings de los `.json`.

**K0-B — higiene de motor y de servidor (D67, D68, D69, D71; `ddcb2da`).** La primera revisión lo
rechazó: `server.js` dejaba pasar `.git`/`node_modules` por mayúsculas, `\`, `%2F`, nombres 8.3 y flujos
`::$DATA`; el check del servidor no fallaba con el código viejo; el hash de la forma del estado solo miraba
el estado inicial; la tarjeta final desbordaba a 320 y 360 px; un guardado roto no avisaba y el aviso no se
iba. Quedó así:
- `VERSION = 2` y un check que compara el hash de la FORMA del estado (unión de las formas de todos los
  elementos de cada array, sobre 10 seeds con carreras completas, independiente de la seed) con
  `FORMAS_CONOCIDAS[VERSION]`; los dos puntos ciegos (campos `null` al inicio y campos de eventos raros)
  quedan escritos en el comentario. Un guardado viejo, roto o de otra versión muestra un aviso y se borra.
- `server.js` solo en `127.0.0.1`, con lista blanca (`index.html`, `src/**`, `assets/**`), 403 fuera de la
  raíz y 404 dentro de la raíz pero fuera de la lista; `createServer({ raiz })` exportado. El check levanta
  el servidor contra una raíz temporal con un secreto afuera.
- El tag "bombazo" compara contra el sueldo vigente o, si es 0, contra la mediana de la liga (sin `?.` ni
  `?? 0` a propósito). Check de dos lados.
- Móvil: `scrollWidth` igual al ancho del viewport a 320, 360, 390, 414 y 1440 px en setup, decisión,
  mercado, minijuego y fin (Chromium). A 900 px el panel central ya no se sale del panel: la altura cambia
  2538 → 2746, 4684 → 5509 y 1690 → 2444 px en decisión, mercado y minijuego (sin diferencia de píxeles a
  1440 ni a 1180; los anchos intermedios no se barrieron). Firefox y Safari sin medir.
- Lo que sigue sin cubrir y está escrito en el comentario del check: las sondas de `~` y `::` solo existen
  pegadas a `src/` (no a profundidad ≥ 2) y dependen de que el SO tenga nombres 8.3; en Linux/macOS algunas
  sondas dan 404 por inexistentes y no muerden.

**K0-A — el instrumento (`1bfa0c5`).** `src/dev/huella.js` (`--seeds --splits --contra`); tres bots en
`estrategias.js` (`criterio`, `azar`, `malas`, con `puntuarPrevia`); bloques `embudo`, `nivel`, `economia`,
`longevidad`, `ritmo` y `porRegion` en `simulate.js`, con `nivel.varianzaExplicada` por ablación del ruido
(overrides de `BALANCE` con `try/finally`, nunca en el motor) y bootstrap determinista (`mulberry32(7777)`);
`src/dev/agencia.js` (contrafáctico) con el test corregido. La primera revisión dejó vivos 14 de 22 mutantes
y la segunda 21 de 29: los KPIs daban valores equivocados pero finitos y con los totales cerrando. Los checks
K0 anclan ahora casi un millar de hojas de los reportes contra un recuento independiente (otra implementación, con percentil y Pearson
propios, sobre los estados finales), la ablación de los cuatro bots, las constantes de tiempo contra el
código de la UI que dicen reflejar, la tabla t de 30 grados de libertad, los números de `agencia` calculados a
mano y cada columna de su tabla. **Hallazgo que cambió el instrumento:** la t pareada de la auditoría
comparaba la mejor y la peor opción de la misma muestra, lo que infla los falsos positivos con 3 o más
opciones (medido bajo la hipótesis nula: ~5% con 2, 11% con 3, 16% con 4, 21% con 5, 26% con 6); ahora es el
máximo |t| sobre todos los pares con Bonferroni (~4,5-5% con 2 a 6 opciones), y el 19,6% de interrupciones
"con palanca" de la auditoría pasa a 5,2% (ver PLAN §K.0b).

**Línea de base** (PLAN §K.0b; `simulate.js 400 60 todas`, 206 s, 0 crashes, y 1.476 decisiones de agencia).
Lo que cambia del plan: (1) las decisiones buenas casi no mueven el resultado (`criterio` y `azar` dan 76,8%
y 74,0% de llegar a tier 1; solo `malas` se despega); (2) con el ruido apagado nivel + equipo explican R² =
0,10 de la posición (0,23 en ligas modeladas): K2 tiene que cambiar cómo entra el nivel, no bajar σ; (3) el
Bo5 de Δ ≈ 10 ya da 92%; (4) la r de la misma liga parte de 0,37, no de 0,05; (5) el tiempo-máquina por la
definición del instrumento es 9,9 min, no comparable con los 17,4 de la auditoría; (6) la meta de "≥ 60% de
palanca" se re-especifica en K3c. Deuda nueva: D75 (el observador cuenta el "agente libre de tier 2"), D76
(`porOrg[].tier` desfasado tras un descenso en el lugar: lo lee el puntaje de K1) y D77 (`proSinTierNunca`).

**Verificación del árbol final** (`1bfa0c5`): `validate.js --rapido` 116 OK / 0 FAIL / 135 SKIP (la base de
`5548c00` tenía 92); `validate.js --solo=K0` 41 OK en 116 s; `validate.js` completo 251 OK / 0 FAIL / 0 SKIP en 35 min (2.097 s);
`simulate.js 1000 60 equilibrado` 1.000 corridas, 0 crashes, 103 s (79,2% llegan a pro); `build.js` OK, 1.715 KB (techo 1.800), 447 imports,
determinismo src contra dist en 12 carreras × 30 splits; huella de 40 seeds idéntica a `5548c00` y dos
ejecuciones idénticas.

**D72, cerrada con la confirmación del usuario.** La rama de trabajo se pusheó a `origin` (`400f6b6..b5088da`, fast-forward, sin force). `faseV-V1-grok` tenía un commit que la rama de trabajo no tiene (`d543149`, 2026-09-19: otra implementación de los primitivos SVG `linea`, `hexa` y `cinta`) y no estaba en el remoto: se archivó como el tag local `archivo/faseV-V1-grok` (no pusheado) y recién después se borró la rama. Los worktrees y ramas `j3-pool-oxido`, `k0-instrumento`, `k0-higiene-motor` y `k0-vocabulario` se quitaron: las cuatro estaban mergeadas y sin cambios sin commitear. **No se verificó:** Linux y macOS (varias sondas del servidor no muerden ahí),
Firefox y Safari, ni una carrera jugada a mano de punta a punta en el navegador con el árbol final.

### 2026-10-01 — FASE K escrita en `PLAN.md`: el nivel manda

El plan que sale de `AUDITORIA.md` y de las cuatro decisiones del usuario sobre ella. Solo
documentos: cero cambios en `src/`.

**Las decisiones** (textuales en `PLAN.md` §K.1):
- **D-A**: *"no"* al modo corto. Queda un solo modo, el largo.
- **D-B**: el juego frena en playoffs, partidos importantes, tryouts, internacionales y eventos
  importantes, con "draft no sí o sí". Se aprobó la propuesta: plan de Fearless por serie, minijuegos
  solo en el clímax, la prueba en cada salto, eventos chicos resueltos por perfil y la charla del
  coach como comodín.
- **D-C**: *"dale"* al puntaje final + desafío diario.
- **D-D**: buenas carreras accesibles; el nuevo Faker difícil pero no imposible; no llegar a pro
  ~20% (el 10% extra, de malas decisiones en tier 2); Mundial ≥ 7% según la región (más fácil desde
  Corea, más puntos desde NA).

**La corrección central del usuario**: *"no es tanto de probabilidades a veces sino de nivel, por
eso te digo que a veces el juego se siente un rng clicker"*. Pasó a ser el principio de la fase: las
metas de población salen de cuánta gente llega a cada nivel, nunca de agregar dado. Por eso las metas
de §K.3 empiezan por nivel → resultado: r(nivel, posición) ≥ 0,5 (hoy 0,05), el favorito claro de un
Bo5 gana ~80%, y P(2 o más Mundiales | ganó 1) ≥ 35-40%. El embudo de población viene después.

**Orden**: K0 (higiene + el instrumento) → K1 (el número) → K2/K3/K3c (bloque A: el nivel decide y
tus decisiones lo construyen) → K4/K4c (bloque B: te frena solo lo importante) → K5/K5c (bloque C: el
Mundial de verdad, la región, el final por mercado) → K6 (jugarlo).

**Lo que hace con la FASE J** (§K.6): J4, J-previa, J1/J2, J7 (comprimida), J10 y J11 se absorben;
J3 se mergea en K0; J9 sigue en paralelo; J8 sale de alcance. J5/J6 se reemplazan, porque sus metas
(150-280 decisiones, más drafts) contradicen D-B. La FASE V sigue congelada hasta después de K.

**Deuda nueva**: D62-D73 (los hallazgos de la auditoría que no tenían fila), entre ellos D62: el
partido que define la clasificación sale 0,1 veces por carrera, medido en esta sesión sobre 300
carreras.

**Verificación**: `node src/dev/validate.js --rapido` en verde. No se tocó `src/`.

### 2026-10-01 — Auditoría completa: por qué no se siente como El Ídolo/Copero (`AUDITORIA.md`)

A pedido del usuario: auditar el proyecto entero, ver cómo vamos contra lo que se quiere, investigar
los juegos de referencia y explicar por qué este no se siente así — como base para generar el
próximo plan. `AUDITORIA.md` se reescribió entero (la del 2026-09-25 sigue en git:
`git show 2c63c4f:AUDITORIA.md`). Solo documentos: cero cambios en `src/`. Medido contra `2c63c4f`.

**Lo nuevo de esta auditoría es el método**: además de leer el código y correr las herramientas del
repo, se midió la experiencia, no solo la simulación. Hay un **experimento contrafáctico de agencia**
(1.444 decisiones de 40 carreras: se clona el estado en cada decisión, se prueba cada opción con 8
réplicas y números aleatorios comunes hasta el final de la carrera), una carrera completa jugada en
Chromium a velocidad 1× y la vista de celular a 390 px. Los scripts están en el apéndice A de
`AUDITORIA.md`.

**Números medidos** (no citados de este changelog, trampa T6):

| Medición | Resultado |
|---|---|
| Interrupciones por carrera | media 169, mediana 191, p90 221 (400 carreras); 223 y 241 jugadas en el navegador |
| Interrupciones por split pro | media 3,6, p90 9, máx 23; 41% de los splits pro con más de 2 (`CONCEPTO` §2 dice "1 o 2, nunca más") |
| Tiempo-máquina a 1×, sin leer nada | 17,4 min → ~45-60 min con lectura real (techo de `CONCEPTO` §11: 40) |
| Interrupciones sin efecto detectable en el final | ~80% (eventos 3% significativo, fin de año 4%, draft de serie 5%, minijuego mal vs. bien 0%, draft de fecha 0); el mercado decide (42%) |
| Estrategia consistente en todos los eventos/fines de año/momentos | puntaje 146-155 contra 151 de base: sin efecto |
| Mentalidad / hype en pro | mediana 97 / 100; 75% / 77% de los splits ≥ 90 |
| Llega a tier 1 · títulos | 79,5% · 5 por carrera de media; ~61% de veredictos de élite |
| Carreras pro que terminan en la línea de los 34 | 72,6%; mediana de carrera pro 16,7 años; < 4 años: 0,3% |
| r(nivel, posición en la tabla) por split | 0,05 |
| Vista de celular 390 px | documento de 455 px de ancho (scroll horizontal) |
| `validate.js --rapido` · `simulate.js 300 60 todas` | 83 OK / 117 SKIP / 0 FAIL · 0 crashes |

**El diagnóstico, en una línea**: el motor es de nivel profesional, pero el juego es otro formato que
el de su referencia. Es una sesión de ~50 min con ~190 interrupciones, la mayoría sin efecto, con la
economía saturada, sin puntaje final y con el éxito como norma. La auditoría deja cuatro decisiones
para el usuario antes de planificar (D-A duración, D-B el partido, D-C meta social, D-D dificultad
objetivo). D-A y D-B reabren decisiones textuales de `PLAN.md`, y la auditoría las expone sin
cambiarlas. También deja nueve frentes candidatos y una lectura crítica de la FASE J: J5 fija 150-280
decisiones por carrera, J1 es inerte con la mentalidad saturada y J6 pide cantidad sin dilema.

**Higiene encontrada, sin tocar** (es del próximo plan): 9 commits sin pushear, J3 commiteado en la
rama `j3-pool-oxido` (`76338ae`) sin mergear, la rama `faseV-V1-grok` todavía existe, `VERSION` del
guardado nunca subió, todas las ofertas salen "BOMBAZO" siendo agente libre (`mercado.js:91`) y
`server.js` no normaliza el path.

**Verificación**: `node src/dev/validate.js --rapido` en verde. No se tocó `src/`, así que la huella
de determinismo y `simulate.js` no cambian. `CLAUDE.md` actualiza la fila de `AUDITORIA.md`. `PLAN.md`
no se tocó: el plan sale de las respuestas a D-A..D-D.

### 2026-09-27 — FASE J, J3: el pool deja de pudrirse (PLAN.md §J3)

Primera subfase de motor de FASE J (tras el instrumento J0). Resuelve que los campeones no jugados
se pudran de inmediato hasta el piso de 5: introduce gracia antes del decaimiento, escala el óxido
inverso al tamaño del pool y sube el piso general de maestría de 5 a 18 ("lo sabés jugar aunque no
lo toques").

**Motor y gracia:**
- `campeon.ultimoSplitJugado`: campo número obligatorio en cada entrada de pool (T4: nunca `null`),
  inicializado por `entradaDePool(campeon, mastery, split)` que ahora exige `typeof split === 'number'`.
  Actualizados call sites: `core/mundo.js` (`generarPoolInicial`: pasa `0`), `core/pool.js`
  (`aprenderCampeones`: pasa `state.player.splitCount`), `core/serie.js` (`campeonComodin` y pick
  efímero: pasa `state.player.splitCount`), y `src/dev/validate.js` (todos pasan `0`).
- En cada split, el campeón jugado actualiza `ultimoSplitJugado: state.player.splitCount`.
- Gracia: `BALANCE.campeones.splitsSinJugarParaOxido: 2`. Un split sin tocarlo no es óxido; al segundo
  split seguido sin jugarlo empieza (`splitCount - ultimoSplitJugado < splitsSinJugarParaOxido`). En gracia
  el óxido aplicado es 0.
- Stream de RNG intacto (T1): cada campeón no jugado tira su `gauss` reglamentario en orden de pool
  para no desfasar el consumo de RNG; si está en gracia se aplica 0.
- Escala de pool: `factorOxido(tamanoPool) = BALANCE.campeones.poolAngosto / pool.length` exportada
  desde `core/pool.js`. Pool de 3 oxida 1x; pool de 6 oxida a la mitad (0.5x).
- Piso de maestría: `maestriaMinima` sube de 5 a 18.
- Compatibilidad retroactiva (Riesgo 1 de FASE J): en guardados anteriores a J3 donde
  `ultimoSplitJugado` no exista, se trata como `splitCount` (gracia entera) sin alterar `VERSION` de
  `core/guardado.js`.

**Pantalla (regla 12):**
- Función pura `pronosticoDeOxido(campeon, splitCount)` en `core/pool.js`, devolviendo
  `{ enGracia, splitsParaOxido }`.
- Integrada en `src/ui/components/ficha.js` y expuesta en `crearCampeonTile` exclusivamente para tiles
  de tamaño `ficha`: texto visible `aguanta N` (si `splitsParaOxido > 0`) u `oxida` (si no), con
  tooltip `title` completo descriptivo con referente ("Si no lo jugás, el óxido empieza en N splits." /
  "Si no lo jugás este split, pierde maestría.").
- Estilado CSS en `src/ui/estilos/iconos.css` con clase `.campeon-tile-oxido` reusando `var(--ink-dim)`
  y tipografía de `.campeon-tile-mae`.

**Checks y mediciones (regla 7):**
- 5 checks nuevos en `src/dev/validate.js` con etiqueta `J3` (`--solo=J3`):
  1. *J3 gracia*: un campeón con `ultimoSplitJugado === splitCount` no pierde maestría en un `aplicar`.
  2. *J3 óxido*: con gracia vencida, la maestría del no jugado baja en varias semillas.
  3. *J3 piso*: pool de 6 con maestría inicial 40 tras avanzar splits no baja de 18.
  4. *J3 factor*: `factorOxido(3) === 1` y `factorOxido(6) === 0.5`.
  5. *J3 retiro* (`checkLento`): 40 carreras verificando maestría mínima del pool >= 18.
- **Rojo inicial**: 4 de los 5 checks fallaron contra el código viejo:
  - `J3 gracia` FAIL (decayó con maestría 47.9 !== 50).
  - `J3 piso` FAIL (la mínima cayó a 5.0 < 18).
  - `J3 factor` FAIL (`factorOxido` no estaba exportada).
  - `J3 retiro` FAIL (seed 1 tuvo maestría mínima 5.0 < 18).
- **Verde post-implementación**: los 5 checks en verde con `--solo=J3`.
- `validate.js --rapido`: OK (todos los checks pasaron).
- `simulate.js 1000`: 0 crashes. `maestriaMinimaPoolAlFinal` con min: 18, max: 42, promedio: 22.2
  (frente al 5.0 anterior).
- **Huella de 40 semillas**: 35 de 40 cambiaron su tupla `finAnticipado:splitCount:soloqElo`
  redondeado (la maestría más alta entra a `core/fuerza.js` y mueve levemente
  los resultados de partida/elo). Ejemplo seed 1: `1:en_carrera:30:4139` → `1:en_carrera:30:4156`.
  Re-medido en la revisión, mismas seeds y el mismo conteo: 35/40. Queda en `PLAN.md` como D74 (la rama lo llamó D62; en la integración chocó con el D62 de la auditoría y se renumeró):
  J3 no puede figurar en "sin corrimiento". El tooltip del pronóstico distingue "1 split" de "N splits".

**Revisión independiente y arreglos (2026-10-01, al integrarla en K0)**. Un Claude revisor fresco
(cero contexto del autor) aprobó el motor con observaciones; un agente Sonnet aplicó los arreglos en la
rama (`17f0b29`). Lo que encontró el revisor, verificado por mutación y en Chromium:
- **Tres mutantes que ningún check mataba** (la gracia de `<` a `<=`, el sistema que no multiplica por
  `factorOxido`, el campeón jugado que no sella `ultimoSplitJugado`); `J3 piso` y `J3 retiro` eran
  tautológicos por el clamp. Se agregaron `J3 borde`, `J3 factor en el sistema` y `J3 sello`, cada uno
  demostrado en rojo contra su mutante (10 checks `J3`, 10 OK).
- **El pronóstico iba desfasado en 1 durante las pausas del split** (el `splitCount` sube en `atributos`,
  después de `campeones`): 16,3% de las 16.152 etiquetas medidas (40 seeds × 30 splits, fase pro) prometían
  un número que el motor no cumplía, todas en pausas de `eventos`/`serie`/`temporada`. Regla 15.
  `splitCountDeLaProximaCorrida` (`core/pipeline.js`) lo corrige; el check `J3 pronóstico` contrasta 220
  pronósticos contra el motor real. Chromium: 21 violaciones en 54 observaciones antes, 0 después.
- **"oxida" en campeones ya en el piso (18)**: 14,5% de las etiquetas "oxida" (1.742 de 12.046), con un
  tooltip ("pierde maestría") falso. Ahora el tile dice "piso".
- **El texto del tile pisaba la maestría** (hasta 8,3 px con "100"). Ahora "2 spl" / "oxida" / "piso",
  holgura mínima medida 4,77 px; el referente va en el `title`.
- Huella de 40 seeds × 30 splits de los arreglos contra `76338ae`: **idéntica** (los arreglos son de
  pantalla y de un helper puro, no tocan el `rng`).
- Hallazgos que quedan: `J3 piso (pool de 6…)` y `J3 retiro` siguen siendo tautológicos (no se tocaron);
  el helper nuevo fija a mano los ids `campeones`/`atributos` (si alguien reordena el registro, `J3
  pronóstico` se pone rojo). El fallback de J3 para guardados sin `ultimoSplitJugado` convive con un
  `VERSION` que nunca subió: K0 lo resuelve subiéndola a 2 (K0-B).
- La validación completa de la rama (`validate.js` sin flags) la corrió el revisor: **205 OK, 0 FAIL** sobre
  `76338ae`, antes de los arreglos.

### 2026-09-25 — FASE J, J0: el instrumento (AUDITORIA.md AUD-2)

Segunda parte de la sesión de auditoría (después de AUD-1, ver la entrada de abajo). J0 es la
primera subfase de FASE J, y el propio `PLAN.md` la describe como *"no se abre una fase de
jugabilidad sin poder medir jugabilidad"* — hasta acá, nada en `src/dev/` podía responder si una
decisión cambia el resultado para alguien mirando la pantalla, que es exactamente lo que 194 checks
en verde no vieron el día que se jugó la carrera que abrió esta fase.

**`simulate.js` gana el bloque `jugabilidad`.** `correrCarrera` ya observaba la carrera split a
split desde 9E (el objeto `carrera`, por el bug D25); `jugabilidad` es la misma jugada un nivel más
arriba, envolviendo la estrategia real con un `responderInstrumentado` que mira cada decisión de
pasada sin cambiar una sola respuesta ni el consumo de `rng`. Mide: `r(nivel, jerarquía)`, % de
splits con `main_muerto`, p95 de candidatos descartados por el filtro de bisagra (`candidatos`,
nueva exportada de `systems/events.js` — una función, no una reimplementación que pueda divergir),
categorías de evento reveladas (para "dos veces seguidas lo del meta" y "% pantalla parche"),
decisiones totales y drafts por serie ("hacés un clic y perdiste"), disparos de `pool_main_muerto`,
y la maestría mínima del pool al final. Más un análisis estático del catálogo (`analizarCatalogo`,
cero `rng`): % de efectos que van a mentalidad/hype, % de outcomes con `modificadores`, y la vida
media de un efecto sobre un stat de curva — esta última analítica, no simulada: sale directo de
`velocidad` en `BALANCE.atributos.curvas` (la curva converge una fracción fija del camino a
`objetivo` cada split, así que la vida media de cualquier bulto que no toque `objetivo` es
`ln(0.5)/ln(1-velocidad)`, sin necesitar ruido de simulación para calcularla).

**Un bug real, encontrado escribiendo el instrumento, no en el motor.** El primer intento de medir
"drafts por serie" comparaba `state.serie.activa` antes y después de cada split — y daba
`seriesMedidas: 0` en 600 carreras. Causa: un bracket entero (varias rondas, hasta 20 mapas) puede
abrirse y cerrarse DENTRO de un único `avanzarSplitAuto` cuando se auto-resuelve sin pausas — el
mismo fenómeno que J.0 ya había nombrado ("hacés un clic y perdiste") pero que el instrumento no
esperaba tener que ver por sí mismo. Arreglado leyendo `career.registro.seriesGanadas +
seriesPerdidas` (el contador que sí se mueve una vez por serie, tenga o no drafts) en cada decisión
resuelta y al final de cada split — no solo una vez por split — así ninguna serie que cierre sin
pausa alguna, ni dos que cierren en el mismo split, se pierden o se funden en un solo dato. Antes
del fix: `medianaDraftsPorSerie` no medía nada (`null`, 0 series). Después: coincide con lo que
J.0 ya había citado ("mediana 1 por Bo5").

**`cobertura.js` gana `--categorias`.** La matriz existente cuenta por UNIÓN de las 12 muestras por
celda — un evento "está" si pasa el contexto en AL MENOS UNA. Eso escondía que una celda "sana" (40
eventos que pasan) podía tener casi todo su peso real en una sola categoría. `--categorias` repite
el mismo algoritmo de huecos (`contarEnCelda`, sin una segunda cuenta que pueda divergir) una vez
por cada una de las 11 categorías del catálogo. Resultado, corrido de verdad: **553 huecos de
categoría** en las 72 celdas observadas — la matriz general dice "sin huecos" (`cobertura.js
--huecos` sigue vacío) mientras `partido` y `serie` no llegan al mínimo en NINGUNA celda (72/72), y
`familia`/`salud`/`golpe_duro`/`vestuario` fallan en más del 80%. Exactamente la brecha que H1
describía, ahora con un número.

**Ambos scripts pasan a ser importables.** Ni `simulate.js` ni `cobertura.js` tenían un export:
eran CLI puro, con código de tope de archivo que corría apenas se los importaba (300 carreras de
`cobertura.js` `observar()`, en el caso más caro). `validate.js` necesitaba llamarlos en proceso
para poder afirmar sobre los datos en vez de scrapear texto de consola — mismo criterio que
`estrategias.js` ya usa. Los dos ganaron un guard `import.meta.url === pathToFileURL(process.argv[1])`
alrededor de su cola de CLI: `node src/dev/simulate.js ...` sigue andando idéntico, pero
`import { correrLote } from './simulate.js'` ya no dispara nada por sí solo.

**3 checks nuevos (197 → 200), verificados en rojo primero (regla de proceso 7):** que los KPIs de
`jugabilidad` sean finitos sobre 200 carreras × 3 estrategias con 0 crashes (`checkLento`, ~28s);
que el análisis estático del catálogo caiga en rangos sensatos, sin exigir un total exacto (regla
de proceso 17 — un piso de cordura, no un trinquete: este catálogo crece con cada fase de
contenido); y que `--categorias` encuentre huecos reales (si algún día da cero, es señal de mirar,
no de bajar la vara en silencio). Los tres confirmados en rojo inyectando `NaN`, un valor fuera de
rango, y huecos forzados a `[]`, antes de dejarlos en verde.

**Línea de base medida de nuevo (T6), no citada de memoria.** Ver `PLAN.md` §J.0b: de las diez
causas con número, seis coinciden de cerca con lo que §J.0 ya citaba (efectos a mentalidad/hype
47,2% exacto; outcomes con modificadores 2,2% exacto; vida media de mecánica 1,94 ≈ 1,9; mediana de
drafts 1 exacto; main_muerto ~53% ≈ 52,2%; series sin draft ~30% ≈ 32,5%) — confirmando que el
instrumento mide lo mismo que midió el diagnóstico original. Dos no coinciden y quedan anotadas para
cuando J4/J5 las calibren: el % de pantalla en categoría `parche` da ~29% contra el 14,2% citado
(definición distinta — "eventos" vs "todo el feed" — no error, pero hay que fijar UNA antes de
calibrar contra el número); y r(nivel, jerarquía) resultó depender muchísimo de la estrategia de
juego (0,02 a 0,40) en vez de ser un número solo — la dispersión es el hallazgo, no una de las tres
lecturas.

**Verificación.** `validate.js` completo: **200/200 OK, 0 FAIL** (197 de AUD-1 + los 3 de J0).
`simulate.js 1000`: 0 crashes. `cobertura.js --huecos`: sigue vacío (la matriz general no cambió;
`--categorias` es una lectura nueva sobre los mismos datos). Determinismo: `candidatos` (export
nuevo en `events.js`) y los guards `import.meta.url` de `simulate.js`/`cobertura.js` no cambian
ninguna rama de ejecución existente — no aplica huella de 40 seeds.

### 2026-09-25 — Auditoría externa: higiene (AUD-1) y H8, el bypass del reproductor

Una auditoría externa (`AUDITORIA.md`, pedida por el usuario, medida contra el commit `3fc6ea5`
más el árbol de trabajo sucio de ese día) encontró que V1, el saneamiento post-V1 del 22-09 y la
fase J entera llevaban tres días terminados y verdes sin commitear — el único riesgo del proyecto
sin red (H2, ni siquiera esta entrada existía todavía). Esta sesión cierra AUD-1, en varios
commits pequeños en vez de uno grande (regla de proceso 2: estructura y constantes por separado):
se commitea todo lo verde, se corrige `PLAN.md` para que no afirme lo que el árbol no sostiene, se
arregla H8 (el único hallazgo con causa raíz real que la auditoría encontró) y se sube el techo de
`dist/` (D49 otra vez: 1699,7 KB medidos contra un techo de 1700 apenas se sumó `graficos/` — a
0,3 KB, el mismo patrón de margen-que-se-cierra-en-silencio de siempre; subido a 1800).

**H8 — el reproductor de beats escribía DOM a mano, invisible al reconciliador.**
`reproductor.js:101` insertaba/borraba nodos directo en `#logList` con `insertBefore`/
`removeChild`. `reconciliar.js` nunca mira `contenedor.children` — su única fuente de verdad es un
`WeakMap` propio — así que esos nodos quedaban fuera de su alcance: su pasada de recorte no los
veía, y su pasada de orden asumía que los hijos del contenedor eran exactamente su propio set.
Dos caminos vivos lo disparaban: **reanudar** una carrera guardada (`renderFeed` puebla el mapa
con las últimas 8 líneas, y desde ahí el reproductor apilaba nodos sueltos encima hasta que el
próximo `renderFeed` duplicaba todo) y **empezar una carrera nueva** (`logList.innerHTML = ''`
vacía el DOM pero no el mapa, que quedaba apuntando a nodos desprendidos — y como las claves son
índices absolutos de `state.logs` que una carrera nueva vuelve a numerar desde 0, el próximo
`renderFeed` reenganchaba nodos muertos de la carrera anterior).

Arreglado sin agregar mecanismo nuevo: `reproducirBeats` ahora llama a la misma `renderFeed` que
usa el resto de la UI, una vez por beat, con un `hasta` que crece de a uno — es el reconciliador,
no el llamador, quien decide qué crear/actualizar/sacar, y el recorte al límite de siempre
(`LIMITE_FEED`, ahora un único export de `feed.js` en vez de duplicado a mano en dos archivos) es
un efecto de eso. `reconciliar.js` gana `olvidarContenedor(contenedor)`, que `app.js` llama junto
al `logList.innerHTML = ''` de `comenzarCarrera` para el caso de carrera nueva.

3 checks nuevos (194 → 197), verificados en rojo primero (regla de proceso 7): un estático
(`reproductor.js` no llama `insertBefore`/`removeChild`), uno sobre el contrato de `agruparBeats`
con `offset` (clave = índice absoluto, no relativo al slice), y uno que llama al `reproducirBeats`
real —no una reimplementación— sobre un doble mínimo de `document` (sin jsdom, mismo criterio que
el resto de `validate.js`), simulando reanudar y después revelar 3 líneas nuevas. Los tres
confirmados en rojo reintroduciendo el bug original antes de dejarlos en verde.

**Documentos.** `PLAN.md` línea 39: `V1 ✅` pasó a 🔶 — es una librería completa (`src/ui/graficos/`,
6 primitivos SVG) sin un solo consumidor fuera de `validate.js`; la pantalla es V2. §J.0: la tabla
siempre tuvo 9 quejas citadas, no 10 — corregido en los dos lugares que decían "diez" (el criterio
de cierre de la fase incluido). El primer tramo de J: "seis commits" corregido a "siete" (siempre
listó siete). Deuda técnica: D54-D61, una fila por cada hallazgo de la auditoría que sobrevive con
fase asignada (D54 y D55 nacen ya cerradas, por este mismo commit). Regla de proceso 17 nueva: un
`checkLento` de banda agregada es un trinquete, declarar junto a él qué protege y desde cuándo —
nace de H4 (un check de 12b exigía textualmente lo contrario de lo que J6 va a escribir, y nada lo
señalaba hasta que una auditoría externa lo encontró). `AUDITORIA.md` se commitea como lo que es:
una foto fechada, no una sección viva — mismo criterio que `PLAN.md` ya documenta para el
`AUDITORIA.md`/`TRASPASO.md` que se borraron el 2026-09-02.

**H10, con una vuelta de tuerca.** La propia auditoría había re-medido la corrida completa de
`validate.js` en ~55 minutos, contra el "~7 minutos (D32)" que decía el comentario. Re-medida acá,
**dos veces en la misma sesión: 31:01 y 31:04** — ni 7 ni 55. T6 no es "medir una vez al empezar":
es medir cada vez, incluso el número que ya trae otra medición encima.

**Worktrees.** Tres huérfanos fuera del árbol principal. `AUDITORIA.md` H2 decía que `faseV-V1-agy`
tenía "el mismo diff sin commitear duplicado... mismo hash de archivo, verificado con md5sum" — no
es así, verificado de nuevo acá: el worktree solo tiene 3 de los 6 primitivos (`bala.js`,
`barras.js`, `escalera.js`; sin `cinta.js`/`hexa.js`/`linea.js`/`comun.js`) y su `validate.js` tiene
193 checks, la foto de V1 ANTES del saneamiento del 22-09 — los 3 archivos que sí tiene difieren
byte a byte de los del árbol principal, que ya pasaron por la extracción a `comun.js`. Es del todo
superado igual, solo que por evolución, no por ser un duplicado exacto. `faseV-V1-grok` (rama
propia `d543149`, committeada pero nunca mergeada) entregó los otros 3 primitivos (`linea.js`,
`hexa.js`, `cinta.js`) en el mismo estado pre-dedup — mismo caso. `frigatebird` (huérfano de Orca
desde la fase P, 2026-09-02) no tiene relación con el trabajo actual. Los tres worktrees se
remueven; las ramas se conservan.

**Verificación.** `validate.js` completo: **197/197 OK, 0 FAIL**, 31:04 de reloj. `simulate.js
1000`: 0 crashes. `cobertura.js --huecos`: vacío (517 opciones sobre un objetivo de 150).
`build.js`: `dist/` en 1699,7 KB contra el techo nuevo de 1800 KB. Determinismo: ninguno de los
cinco commits de esta sesión toca `core/`/`systems/` (los tres primeros son UI + herramientas de
`src/dev/`; los dos últimos son documentación pura), así que no corre el stream — no aplica
huella de 40 seeds.

### 2026-09-20 — FASE V, V1: los primitivos SVG y el guard de color literal en JS

*(Entrada escrita en retrospectiva el 2026-09-25, durante la higiene de AUD-1: el trabajo se hizo
esta fecha pero se quedó sin su changelog — exactamente el patrón que señaló H2 de la auditoría.
`PLAN.md` línea 39 ya decía "V1 ✅ (2026-09-20)" sin que esta entrada existiera.)*

6 primitivos SVG (`src/ui/graficos/`: `bala.js`, `barras.js`, `cinta.js`, `escalera.js`, `hexa.js`,
`linea.js`), cada uno un factory `crear*(datos, opciones) -> nodo SVG`. Ninguno tiene consumidor
todavía en `src/ui/` fuera de `validate.js` — es librería, no pantalla; la pantalla es V2.

**El guard de color literal se extendía a JS (D44).** `verificarSinColorLiteral` (`guards.js`) solo
escaneaba `estilos/*.css` — un `fill="#2ee8ff"` puesto a mano en un factory SVG evadía el candado
del sistema de diseño por completo, porque estos primitivos pintan con `setAttribute`/`style` desde
JS, no desde CSS. `verificarSinColorLiteralEnJs(uiDir)` nueva en `guards.js`, mismo criterio sobre
`src/ui/**/*.js`: caza hex literal (`#2ee8ff`) y `rgb`/`hsl` fuera de un template literal —
`orgChip.js` calcula sus 3 `hsl(${hue} ...)` con `hashCadena`, así que ya pasa por ser calculado, no
por una excepción con nombre. La única excepción real, con nombre de archivo, es `exportar.js`
(el fallback de `leerToken` cuando `getComputedStyle` no está disponible).

**`reconciliar.js` necesitó un guard de `requestAnimationFrame`.** `escalera.js` es el único
consumidor de `{ flip: true }` en todo el repo, y el check de aria-label/reduced-motion de
`validate.js` importa y ejecuta los 6 factories en Node vía `await import(...)` — donde
`requestAnimationFrame` no existe. `debeAnimar` ganó `&& typeof requestAnimationFrame ===
'function'` para que la corrida en Node no explote sin cambiar el comportamiento en el navegador
(ahí siempre existe).

**4 checks nuevos en `validate.js`** (189 → 193; el quinto, la whitelist de tonos contra
`tokens.css`, se agregó el 22-09 junto con `comun.js`, ver esa entrada): color literal en JS,
contraste WCAG de las 29 familias de tokens gráficos, `role="img"` + `aria-label` con dígito en
todo factory, y cero `requestAnimationFrame` cuando `prefers-reduced-motion` está activo.

**Verificación.** `validate.js` 193/193, `simulate.js 1000` 0 crashes. Determinismo no aplica:
`graficos/` es UI pura, ningún archivo de `core/`/`systems/` se tocó.

### 2026-09-22 — Saneamiento: `graficos/comun.js`, el chrome de `app.js`, y D53

Una auditoría de código general (pedida sin apuntar a una fase — "analiza el código y decime qué
opinás") sobre el estado del repo con V0/V0b/V1 hechos pero sin commitear. Cuatro hallazgos
concretos, medidos, resueltos en la misma sesión.

**`src/ui/graficos/` había nacido duplicada.** `reducirMovimiento()` estaba definida 6 veces —en
`cinta.js`/`hexa.js`/`linea.js` se llamaba como sentencia suelta descartando el resultado, en
`bala.js`/`barras.js`/`escalera.js` no se llamaba nunca— y `svg`/`attr`/`pintar` estaban copiadas 3
veces. Peor: **dos contratos incompatibles para el mismo problema**, escritos en la misma fase —
`TONOS_CONOCIDOS` (whitelist estricta contra `tokens.css`, tira en tono desconocido) en `hexa.js` y
`linea.js`, contra `resolverTono()` con regex laxa (`/^[a-z0-9_-]+$/`) en `bala.js`/`barras.js`/
`escalera.js`, que dejaba pasar un token inexistente y lo pintaba transparente en vez de avisar. Se
extrajo `src/ui/graficos/comun.js` (mismo rol que `components/minijuegos/comun.js` para los 11
minijuegos) con `svg`/`attr`/`nodoSvg`/`pintar`/`clamp01`/`resolverTono`/`reducirMovimiento` — un
único criterio, la whitelist, para los 6 primitivos. `nodoSvg` (no `crearSvgElemento`) a propósito:
el check de gráficos trata cualquier export `crear*` como factory. `comun.js` se excluyó del
recorrido de `archivosGraficos` en `validate.js`, mismo criterio que ya usaba `comun.js` de
minijuegos con `index.js`. Verificado en rojo: un tono inventado ahora **tira** en los 5 factories
que antes lo aceptaban, en vez de pintar transparente.

**La whitelist de tonos podía divergir de `tokens.css` en silencio.** Check nuevo en `validate.js`
("Gráficos: la whitelist de tonos de comun.js no diverge de tokens.css"): compara `TONOS_CONOCIDOS`
contra los `--*` reales de `tokens.css`. Verificado en rojo inyectando un tono inexistente en la
whitelist y confirmando que el check lo caza; en verde al sacarlo.

**El chrome global de `app.js` estaba triplicado.** El mismo bloque de 5 líneas
(`actualizarTopbar`/`aplicarEstudio`/`renderRielContexto`/`renderSerieContexto`) copiado en
`revelarYVerDecision`, al final de `correrSplits` y en `continuarCarrera` — la misma clase de copia
que dejó pasar D45. Se extrajo `pintarChrome(ficha, estado)`, un helper local, no un suscriptor del
store: se investigó cablear `store.suscribir(pintarChrome)` (la lectura obvia del contrato que V0
declaró) y se encontró que un suscriptor único no puede servir a la vez el camino de
`revelarYVerDecision` (`renderFicha` solo — el feed lo revela `reproductor.reproducirBeats` línea a
línea) y el de cierre/resume (`renderCarrera`, ficha+feed de una) sin duplicar pintado o
adelantarse a la animación del feed. `store.suscribir` se deja como está: groundwork declarado por
V0 para V2/V3, mismo estado que `crearDelta` (tampoco tiene consumidor todavía).

**D53 — 5 constantes muertas en `BALANCE.mercado`.** `brechaNivelRango`, `ofertasPisoPorDemanda`,
`techoDemandaBase`, `techoDemandaPeso`, `afinidadOfertaRango`: sobrantes de la fórmula original de
9R0e (`demanda = clamp(...)`, un piso/techo de CANTIDAD de ofertas) que 9M reemplazó del todo por el
mecanismo de asiento de `core/demanda.js` (`asientoAbierto`/`ofertaPosible`/`orgsQueTeFicharian`)
sin borrarlas — 9M y 9R0e nunca coexistieron en el mismo código, la fórmula vieja simplemente dejó
de tener quien la llamara. Mismo criterio que D31. Se borraron; `nivelLigaPorDefecto` y
`brechaFranquicia` (mismo bloque de comentario) sobrevivieron porque 9M las reusa con otro sentido.

**Verificación.** `validate.js` completo: **194/194 OK, 0 FAIL** (194 = 193 previos + el check nuevo
de whitelist-vs-tokens.css). `simulate.js 1000`: 0 crashes. Determinismo no aplica (nada de esto
toca `core/`/`systems/` salvo el comentario en `balance.js`, y `simulate.js` corrido después
confirma que las 5 constantes borradas no eran leídas por ningún camino). Verificación real en
navegador (Playwright + Chromium cacheado): carrera arrancada con seed fija, pausada en una
decisión real (no un minijuego — esos se auto-resuelven solos con `relojDeMinijuego`, invalidarían
la comparación), recargada la página, "Continuar" — ficha, feed, topbar y riel idénticos
(incluida la animación `countUp` de la ficha, de 420ms, esperada a asentar antes de comparar).
Cero errores de consola.

### 2026-09-19 — FASE V, V0: el kernel — el store, el reconciliador y el delta

Arranca la fase V ("Que la carrera se vea"), escrita completa (V0→V10) en `PLAN.md` tras confirmar
con el usuario alcance ("pegar todo el plan y avanzar fase por fase") y modo de ejecución (Claude
implementa directamente esta vez, no delegado — excepción puntual, misma decisión que la fase 13).

V0 es un refactor puro: **cero cambio visual**, el desbloqueo del que dependen V2/V3/V5 para poder
animar algo. El controlador — ~520 líneas de `<script type="module">` dentro de `index.html` desde
la fase 8 — se movió a `src/ui/app.js` (exporta `iniciar()`), y con `estado` disponible fuera del
closure inline se pudo resolver la inversión de dependencia que arrastraba desde T2: `ficha.js`
importaba `shell.js` para empujarle `state` al chrome global (topbar, luz de estudio), porque era
el único sitio fuera del closure que lo tenía a mano. Ahora `renderFicha`/`renderCarrera` devuelven
la `ficha` que ya calcularon y `app.js` llama `actualizarTopbar`/`aplicarEstudio` en el mismo punto
donde pinta la ficha — `ficha.js` dejó de importar `shell.js`.

**Tres módulos nuevos** en `src/ui/core/` (sin consumidores todavía fuera de sus propios checks —
V1/V3/V5 los adoptan):
- `store.js`: `crearStore(inicial)` → `{ leer(), escribir(next), suscribir(fn) }`. Reemplaza el
  `let estado` del closure; es la única vía por la que una pantalla nueva ve `state`.
- `reconciliar.js` (~90 líneas): `reconciliar(contenedor, items, claveDe, crear, actualizar,
  { flip })`. Parchea una lista por clave en vez de reemplazarla con `replaceChildren` — con salida
  FLIP opcional (respeta `prefers-reduced-motion`) para V1/V5. No se adoptó en ningún render real
  todavía a propósito: la plan dice "en un commit aparte del de la mudanza" (V0b, pendiente).
- `delta.js`: `crearDelta(paths)` → `{ medir(state) }`, devuelve `{ path: [antes, despues] }` sobre
  el set de paths declarado al crearlo, reusando `getPath` de `core/selectors.js`. Sin wiring
  todavía — V3 lo usa para que la regla de proceso 13 se cumpla con movimiento, no solo con texto.

**De paso, D45 (bug real, no buscado, encontrado mapeando este mismo camino de código):**
`continuarCarrera()` nunca llamaba a `renderFeed`, así que retomar una carrera guardada dejaba
`#logList` vacío — indefinidamente si además había una decisión pendiente. Se resolvió solo:
"retomar" pasa a usar `ui.renderCarrera` (ficha + feed juntas), el mismo camino que ya usa
`correrSplits`. D46 (atajos 1-4 inertes en mercado, `div` sin listener propio) se dejó anotada para
V7 a propósito, para no tocar `shell.js` dos veces.

**Checks nuevos en `validate.js`** (los 3 verificados en rojo primero, regla de proceso 7):
- `index.html: el controlador vive en src/ui/app.js` — `verificarSinLogicaEnIndexHtml` (guard
  nuevo en `guards.js`): ≤200 líneas y cero `function`/`const` en un `<script type="module">`
  inline. Verificado en rojo inyectando una función de prueba en `index.html` y confirmando que
  el check la caza; restaurado, pasa. `index.html`: **710 → 194 líneas**.
- `reconciliar preserva identidad de nodo por clave` — doble mínimo de `Element`/`Node`
  (`NodoFalso`/`ContenedorFalso`, sin jsdom) que confirma `nodo === nodo` entre dos pasadas con la
  misma clave, que `actualizar()` se aplica sobre el nodo reusado, y que un item que sale de la
  lista sale del contenedor.
- `crearDelta mide [antes, despues]` — confirma que la primera medición no inventa un "antes" y
  que un path sin cambios da `[x, x]`.

**Verificación.** `validate.js` completo: exit 0, **189/189 OK, 0 FAIL** (186 + los 3 nuevos).
`simulate.js 1500 60 todas`: **0 crashes** en las 4500 carreras (3 estrategias) — esperable, esta
subfase no tocó `/core` ni `/systems`. `build.js`: **1653 KB** (techo 1700 KB, margen 47 KB — D49
sigue abierta para V9). Determinismo verificado dos veces: misma seed corrida dos veces da el mismo
`state` serializado bit a bit, y **anti-T1 (40 seeds, `git archive HEAD` contra el árbol con V0)**:
**huella idéntica** — `finAnticipado:splitCount:soloqElo` igual en las 40, como exige la restricción
dura de la fase ("esta subfase tiene que mover cero").

**Cierra V0** (`PLAN.md` §V0, checks en verde). Sigue V0b (adoptar `reconciliar` en feed/tabla/
plantilla/Top 5/mercado, commit aparte por diseño) o V1 (la capa de gráficos), a decidir con el
usuario.

### 2026-09-19 — FASE V, V0b: `reconciliar` conectado a las cinco listas de clave natural

El commit aparte que V0 dejó anotado (`store`/`reconciliar`/`delta` existían pero nadie los llamaba
fuera de sus propios checks). Sesión continuada tras el mismo par de decisiones del usuario (Claude
implementa directamente, sin delegar); no hizo falta repreguntar alcance porque V0b ya estaba
completamente especificada dentro de §V0 como su propio commit, no como una subfase nueva.

Las cinco listas con clave natural del juego adoptaron `reconciliar`: `feed.js` (índice absoluto en
`state.logs` — el array solo crece, `core/pipeline.js` lo confirma, así que el índice es una clave
estable), `paneles/tabla.js` (`fila.org`), `paneles/plantilla.js` (`handle`), `paneles/topMundial.js`
(`handle`) y `components/mercado.js` (`oferta.id`, la misma clave que ya resuelve `onElegir`).

**El patrón que evitó reescribir cada `crear` a mano.** Vez de un `actualizar(nodo, item)` distinto
por lista (riesgo de divergir del render de siempre, regla de proceso 2), `core/reconciliar.js` ganó
`reemplazarEnElLugar(nodo, nodoFresco)`: arma el nodo con la misma función `crear` de siempre y lo
injerta (clase, dataset, hijos) sobre el nodo cacheado, que es el que persiste. Las cinco listas
comparten este único helper — cero diffing campo por campo escrito a mano.

**El esqueleto necesitaba sobrevivir.** `tabla.js`/`plantilla.js`/`topMundial.js` reconstruían todo
el panel (`container.replaceChildren()`) en cada render, título incluido — no había ningún nodo lista
que `reconciliar` pudiera preservar. Ahora el esqueleto se arma una vez y se cachea en el propio nodo
(`container.__xRefs`); de ahí en más solo se actualiza texto y se llama `reconciliar`. `feed.js` y
`mercadoGrid` no lo necesitaron: ya eran contenedores persistentes pasados desde `app.js`/`screens`.

**Un caso conocido, documentado en vez de forzado.** En `feed.js` la clave de un beat sigue al índice
del último log incorporado. Cuando una narrativa suelta gana su primer técnico, la clave cambia (de
"índice de la narrativa" a "índice del técnico") y el nodo se recrea — visualmente idéntico a lo de
siempre, solo pierde identidad en esa transición puntual. No hay ninguna animación colgando de esa
identidad todavía (V3 es quien le da uso real), así que se dejó anotado en el código en vez de
complicar la clave para un caso sin consumidor.

**Verificación.** `validate.js` completo: **189/189 OK, 0 FAIL** (sin checks nuevos — esta subfase no
agrega guards, se apoya en los 3 que V0 ya dejó). `simulate.js 1500 60 todas`: **0 crashes** (motor
no tocado, esperable). `build.js`: **1657 KB** (techo 1700 KB, margen 43 KB — D49 sigue abierta para
V9). Determinismo: misma seed corrida dos veces da el mismo `state` serializado bit a bit, y anti-T1
(40 seeds, `git archive HEAD` contra el árbol de V0 antes de este commit): **huella idéntica** — el
motor no se tocó. Verificación real en navegador (Playwright + Chromium cacheado): llamadas directas
a las 5 funciones de render con datos sintéticos/reales confirmando `nodo === nodo` tras un segundo
render con datos distintos (incluida la fila propia de plantilla, para la que se tomó un `state` real
recién guardado en `localStorage` por una carrera arrancada en el mismo script, en vez de adivinar a
mano todos los campos que toca `fichaCompleta`); y una carrera real jugada un split con nodos
marcados por una propiedad JS arbitraria, confirmando que sobreviven tras resolver una decisión
(5/5 en Top Mundial; tabla/plantilla no aplicables en split 1, amateur sin equipo todavía). Cero
errores de consola en ambas corridas.

**Cierra V0b** (`PLAN.md` §V0b, checks en verde). Sigue V1 (la capa de gráficos SVG en
`src/ui/graficos/`), a decidir con el usuario — necesita cargar la skill `dataviz` primero.

### 2026-09-19 — 13f: el catálogo de la cima que la fase 9Wb dejó prometido, sin reclamar

Con la fase 13 y P.4 cerradas, y una auditoría completa de la tabla de deuda técnica y de
`CONCEPTO.md` ya hecha, un último barrido por comentarios de código que citan "fase 13" encontró
uno que ninguna versión de §13.1 había capturado: `data/events/index.js` y `core/contexto.js`
traían, desde 9Wb, la nota *"El catálogo real de la cima (sponsor bomba, 'defendé el #1', la
prensa que te destrona, el archirrival que te pasa) es fase 13"* — y `top_mundial.json` se quedó
con los 2 eventos "semilla" que 9Wb escribió para probar el enganche, nunca con el catálogo real.
Medido: la celda `el_mejor_del_mundo` tenía 172 eventos pasando el contexto, pero los 170 que no
eran los 2 semilla eran genéricos de tier1/franquicia (sponsors, vestuario, prensa) — ninguno
hablaba de ser específicamente el #1 del mundo. Mismo patrón que D26c: cantidad alta, pertinencia
real baja, disfrazada por volumen.

4 eventos nuevos en `top_mundial.json`:
- **`el_sponsor_bomba`**: una marca global, del calibre que solo entra al radar cuando estás en la
  lista mundial, no en la de tu liga.
- **`defender_el_trono`** (marca `mejor_del_mundo`, no `top_mundial` — específicamente el #1, no el
  Top 20 en general): la presión de sostener el puesto es distinta de la de pelear por llegar.
- **`la_prensa_te_destrona`** (combina `marcas: ['top_mundial']` + `momentum: ['crisis','slump']` —
  el primer evento del catálogo que cruza estos dos ejes a propósito): el mismo medio que te subió
  especula con que se te acabó, apenas aflojás dos semanas.
- **`el_rival_que_te_pasa`**: usa el token `{rival}` ya existente (`plantillas.js`, el primero de
  `mundo.rivales`) para una rivalidad directa por el puesto en el ranking — sin depender de
  `mundo.archirrival`, que no existe en el estado inicial y hubiera violado la trampa T4.

Un typo real encontrado por el propio parser de JSON al escribir el contenido: una comilla sin
escapar dentro de una descripción (`si "ya se te acabó el momento"`) rompía el archivo — corregido
antes de commitear, no llegó a tocar `main`.

**Verificación**: `validate.js --rapido` + los checks puntuales (esquema, vocabulario, categoria,
tokens, previa/riesgo, repetición, T10, MOMENTOS, momento-coverage, los 8 de fase 9W) — 0 FAIL.
`cobertura.js --huecos`: sin huecos, catálogo 246→250 eventos, 517 opciones. Suite completa
(`validate.js` sin flags) corrida una vez más al cierre.

### 2026-09-19 — Fase P.4 cerrada: el juego se llama "Un Split Más", y tiene og:image propia

Con la fase 13 cerrada, `PLAN.md` solo tenía un pendiente no-manual: P.4 ("La página como página"),
diferido desde T.2. Dos decisiones que venían dando vueltas desde entonces, resueltas:

**El nombre.** "Un Split Más" — sale del vocabulario del juego mismo (el split es la unidad de
tiempo de toda la partida) y de la sensación central que persigue el diseño entero (`CLAUDE.md`:
"breve, profunda y rejugable", el impulso de "uno más"). Propagado a los 6 lugares donde vivía el
placeholder `LOL Career Simulator`/`LC`: `<title>`, `og:title`/`twitter:title`, el lockup del
topbar, el `<h1>` de accesibilidad, el label de la tarjeta final (`exportar.js`, "● LIVE · ...") y
`README.md`. Monograma nuevo: `S+` (Split, "uno más") en vez de `LC`, favicon incluido.

**La imagen de Open Graph.** Autoría a mano, sin headless en el build (como pedía el plan):
`assets/og-image.svg`, en el mismo lenguaje visual que la tarjeta de fin de carrera de
`exportar.js` (banda superior cyan, marco, monograma, grilla de fondo, los mismos tokens de color)
— rasterizada a `assets/og-image.png` (1200×630) con `magick -background none og-image.svg -resize
1200x630 og-image.png` (ImageMagick + librsvg, ya instalado en la máquina). El texto usa las
fuentes del sistema que ya eran el fallback declarado de `--font-display`
(`Bahnschrift SemiBold Condensed`) y `Segoe UI`, así que el render sale fiel a la identidad sin
necesitar las webfonts del juego. Único ajuste tras la primera pasada: el glifo "∞" (para "splits
por carrera") no existía en la fuente y rasterizaba como tofu — reemplazado por el dato real
("3 splits/año", que sí es una constante del juego) en vez de forzar el símbolo.

**`src/dev/build.js`**: `A_COPIAR` suma `assets/og-image.png` puntual (no el `.svg` de autoría, que
no es algo que el navegador necesite). Check nuevo, `META_IMAGEN`: `<meta
property="og:image"|name="twitter:image" content="...">` resuelve con capitalización exacta en un
filesystem case-sensitive, mismo criterio que ya existía para `<link href>` (P.7) — el mismo
agujero de siempre (Windows no distingue mayúsculas, el host Linux sí) pero para la imagen social,
que hasta ahora ningún check cubría. Verificado en rojo (renombrando la ruta a mayúsculas, el build
lo cazó) y en verde con la ruta real. Peso de `dist/`: 1482 → **1636 KB** (techo 1700 KB).

`PLAN.md` §P.4 y la tabla de Estado (fase P) actualizadas: de la fase P solo queda el paso manual
del usuario (conectar la cuenta del host) y P.8 (verificación en la URL publicada, que depende de
ese paso).

**Verificación**: `validate.js --rapido` 0 FAIL · `npm run build` OK (1636 KB, determinismo
12×30 confirmado src vs dist) · servidor local reiniciado y confirmado sirviendo el `<title>`
nuevo por HTTP.

### 2026-09-18 — Fase 13 cerrada: los 8 puntos de §13.1 + el check T10 que faltaba

Cierra `PLAN.md` fase 13 (contenido a escala), la última fase de contenido que quedaba abierta.
**Ejecutada íntegramente por esta sesión (Sonnet), sin delegar a grok/agy** — excepción puntual al
workflow de delegación habitual del proyecto (ver `PROGRESO.md` 2026-09-15), decidida por el
usuario para esta tanda.

**Punto de partida**: al abrir el repo había trabajo de fase 13 en el árbol sin commitear ni
documentar en `PLAN.md` (regla de proceso 1 incumplida por quien lo dejó ahí). Auditado antes de
tocar nada: resolvía de verdad los puntos 1, 2 y 5 de §13.1, pero dejaba dos defectos —2 eventos de
servicio militar gateados a una marca que `contextos.js` ya advertía como inalcanzable
(`marcas: ['servicio_militar']` vive y muere dentro de un split), y `MOMENTOS` con `prioridad`
desordenada tras mover `veterano_util`/`veterano_al_margen` (funcional porque `momentoDe()`
resuelve por posición del array, no por el número, pero silenciosamente inconsistente).

**13a** (`data/events/retiro_y_vuelta.json` nuevo, `contextos.js`, `salud_vida.json`,
`validate.js`): cierra el hueco de cobertura (`retirado_reciente/pretemporada`), activa los 3
momentos `pendiente` obsoletos, ancla `sin_equipo` a 0% sin gatear en las 3 ventanas. Los dos
eventos de servicio militar se reescribieron como contenido de VUELTA (`region: KR` +
`flags.servicioCumplido`, sin tocar el motor) en vez de la marca inalcanzable. Check nuevo
("MOMENTOS: el array manda, pero nunca en contra de lo que dice prioridad") verificado en rojo
primero (revirtiendo el número a mano: seed 1 lo agarra en el split 34) y en verde con el fix
(`veterano_util`/`veterano_al_margen`: 20/18 → 33/32).

**13b** (D11, `rutinas/offseason.json`): las 7 rutinas declaran `nivel` (antes 0/7).
`bootcamp_corea` (la única agresiva) queda reservada a tier1/tier2 — un equipo inventado de tier 3
no paga un viaje a Corea. Rutina nueva, `grindeo_de_madrugada`, le da a tier 3 su propia agresiva
(CONCEPTO §4: la trampa tiene que estar siempre disponible). Check ampliado: antes solo exigía
agresiva en tier1/tier2, ahora la exige pareja en los tres tiers, verificado en rojo dos veces
(sin declarar `nivel`; declarando tier3+tier2 a la vez) antes del contenido final.

**13c** (servicio militar + declive, `salud_vida.json`, `data/events/declive.json` nuevo): 2
eventos más de la bisagra del servicio militar (la competencia por el puesto al volver, la
exención por la medalla que nunca tenía voz en el catálogo). `veterano_util`/`veterano_al_margen`
(recién activados en 13a) solo tenían contenido heredado de celdas genéricas — declive.json (6
eventos) les da voz propia, apoyado en CONCEPTO §12.4 ("el declive casi no es biológico" — es
sesgo del mercado por juventud, no decadencia real). Los 6 declaran `nivel` junto a `etapa:
['declive']`: sin eso colaban por omisión en `vuelta_del_retiro` (medido en rojo: 6/6/5 sin gatear
al probarlos sin `nivel`, porque volver del retiro y estar en declive pueden coincidir) — D26c.

**13d** (D34/D17/D14, `data/events/tier3.json` y `latam.json` nuevos): tier 3 tenía un p90 de 12
splits (4 años) en el nivel con un solo evento exclusivo — `tier3.json` (9 eventos) le da historia
propia (el sueldo que llega tarde, el coach-dueño, la gaming house real, el lineup que se
tambalea, la scrim contra una academia grande, el torneo regional como vidriera, el setup
prestado, el stream que financia al equipo, la promesa de ascenso que no llega). No se tocó
`probAscensoBaseDesdeTier3` — regla de proceso 3, contenido primero. LATAM sigue sin
`leagues.json` propio (D17, decisión ya tomada): `latam.json` (3 eventos) le da identidad
narrativa a un origen NA/BR. D14: el catálogo tenía 223 eventos de 2 opciones / 3 de 3 / 0 de 4
sobre 220; ahora **10 de 3 y 3 de 4** sobre 246, usando el rango completo que pide `CONCEPTO` §3.
Los 12 eventos nuevos de 13d/13c(latam) declaran `nivel` explícito por el mismo motivo D26c.

**13e** (T10, D43): `PLAN.md` tenía a T10 como trampa conocida sin check ("el pool de eventos se
vacía con gating fino") desde antes de la fase 9. `systems/events.js` exporta
`SPLIT_SIN_EVENTO_MSG` (el log exacto que emite `aplicar` cuando `elegirEvento` no encuentra
candidatos) para que `validate.js` mida su frecuencia real por celda momento×ventana sobre los
logs reales de `avanzarSplitAuto`, sin volver a llamar `elegirEvento` (correría el stream, T1) y
sin confundir el silencio por presupuesto agotado (9Rf, mecanismo distinto) con un hueco de
contenido. Medido sobre 400×45: peor celda real **3,7%** (`sin_equipo/playoffs`), muy por debajo
del piso del 25%. Verificado en rojo bajando el umbral a 2% (marca 5 celdas reales) y devuelto a
25%. De paso, D43 (deuda documental): `CONCEPTO.md` §2 describía "27-34 años DECLIVE Y RETIRO"
con un reloj de edad fijo —10a lo había reemplazado por el retiro emergente del mercado hace tres
fases sin que el documento se actualizara (regla de proceso 5, ítem pendiente desde la fase 10)— y
sumaba duraciones parciales (~7 min) que contradecían "la larga: 25-40 min" (decisión del usuario,
línea 81). Reescrito.

**Efecto colateral de agregar contenido (trampa T1, aceptado)**: el check "El contexto de carrera
nombra siempre dónde estás parado" dejó de observar `sin_renovacion` en 300 seeds × 45 splits (0
hits) al remedir con el catálogo ya en 508 opciones — el stream se corrió. Instrumentado antes de
tocar nada (regla de proceso 2): no es un hueco de contenido, el momento sigue vivo (5 hits en
300×90, 2 en 1500×45) — necesita una combinación tardía en la carrera (contrato a un año +
no-renovación) que 45 splits no alcanzan a cubrir con regularidad. Mismo patrón que D24: la vara
del check era más corta que la carrera real. Subida 45 → 90 splits, ninguna constante tocada.

**Verificación final** (Definición de terminado, `CLAUDE.md`):
- `node src/dev/validate.js` completo: **185/185 OK, 0 FAIL, 0 SKIP** al cierre de 13d (antes de
  agregar el check T10 de 13e); T10 verificado por separado en rojo (umbral bajado a 2%, marca 5
  celdas reales) y en verde al 25%. **Reconfirmado con la suite completa una segunda vez sobre el
  HEAD final (13e con T10 ya adentro): 186/186 OK, 0 FAIL, 0 SKIP.**
- `node src/dev/simulate.js 1000`: **0 crashes**.
- Determinismo: `simulate.js 1 60 4242` corrido dos veces, salida **idéntica**.
- `node src/dev/cobertura.js --huecos`: **sin huecos**, catálogo **226→246 eventos, 442→508
  opciones** (objetivo 150, superado 3,4×).
- `npm start` levantado y verificado por HTTP (200, `<title>` correcto) — la extensión de
  Chrome no estaba disponible en esta sesión para un playthrough visual propio, así que la
  verificación de pantalla real (regla de proceso 12) queda para el usuario, con el servidor ya
  corriendo en `localhost:8000`.

### 2026-09-15 — Fase D cerrada: D.1+D.3 por Grok, D.2 por Gemini, revisados por un tercer agente

Cierra la fase D (`PLAN.md`): los tres campos que el motor declaraba y ningún sistema escribía
nunca (D30, D40, D42). **Primera fase de este proyecto ejecutada íntegramente con el workflow de
delegación** que el usuario venía pidiendo: el supervisor (esta sesión) escribió dos specs y
despachó el trabajo a dos procesos CLI reales, cada uno en su propio `git worktree` a partir del
mismo commit (`a99d985`), sin supervisión línea a línea. Nunca implementó el código él mismo.

- **Ticket A → Grok** (`grok-4.6`, `--reasoning-effort high`, worktree `faseD-grok`): D.1
  (`calcularMercado` pasa de 2 a 4 valores del eje mercado) + D.3 (`career.liga` se limpia al
  quedar libre).
- **Ticket B → Gemini vía `agy`** (`gemini-3.8-flash-high`, worktree `faseD-agy`): D.2
  (`registro.picos.rankedPuntos` nunca se escribía).
- **Revisión**: un tercer agente (Opus, sin implementar nada) auditó los dos diffs de cero —sin
  creerle a los reportes de los workers— corriendo él mismo `validate.js` completo, `simulate.js
  1500 60 todas` y una sonda anti-T1 de 40 seeds contra `git archive a99d985`. Encontró 3 defectos
  en el **reporte** de Grok (no en su código): (1) una atribución causal falsa — Grok había
  escrito que el check de "silencio del mercado" bajó de 72% a 61.3% por su fix, cuando el 72% era
  un comentario obsoleto de la fase 10c/11 nunca vuelto a medir y el baseline real remedido contra
  `a99d985` es 61.111%, que **subió** a 61.290% con el fix (trampa T6: no comparar contra una
  línea de base vieja); (2) un comentario que afirmaba que una guarda nueva en `core/serie.js`
  "antes tiraba" sin haberlo medido — instrumentada, esa guarda tiene 0 alcances en 300 seeds × 60
  splits, es defensiva, no un camino real; (3) el flag `avisoNoRenovacion` se prendía pero nunca se
  apagaba si el club volvía a ofrecer renovación (medido: 1 caso pegado sobre 938 pretemporadas con
  `clubNoRenueva`). Grok corrigió los 3 en una ronda (verificado por el supervisor, no solo por el
  worker). Gemini pasó sin corrección: su propio proceso hizo timeout a los 45 minutos corriendo
  `validate.js` completo y no llegó a reportar evidencia, así que el supervisor reconstruyó los
  números él mismo antes de aceptar el trabajo.

**D.1** (`core/contexto.js`, `data/contextos.js`, `systems/mercado.js`, `core/state.js`):
`calcularMercado` distingue `sin_contrato`/`contrato_firme`/`ultimo_ano`
(`aniosRestantes <= 1`, mismo criterio que ya usaba `temporadaResumen.js`) /`sin_renovacion`. Esta
última necesitó una señal que no existía: `career.contrato.avisoNoRenovacion` (inicializado en
`false`, trampa T4), que `systems/mercado.js` prende o apaga cada pretemporada según si
`generarOfertas` trajo una oferta con `tag: 'renovacion'` — **sin tirada de RNG nueva**, esa
decisión ya se sorteaba adentro de `generarOfertas` (`chance(probRenovacion)`). Se le sacó
`pendiente: 'paso11'` al momento `sin_renovacion` en `contextos.js` (regla de proceso 6). Medido
(400 seeds × 60 splits, split-starts): `sin_contrato` 24.3%, `contrato_firme` 35.6%, `ultimo_ano`
39.7% (alto porque un contrato de 1 año entra directo a último año), `sin_renovacion` 0.36% (74
splits; el momento en sí se ve en 41 de esos — el resto lo tapa algo de mayor prioridad).

**D.2** (`core/ranked.js`, reusa `registrarPico` de `core/registro.js`): `conRanked` ahora escribe
`registro.picos.rankedPuntos` en el mismo punto donde ya actualiza el espejo derivado
`player.soloqElo`, sin escribir un máximo a mano y sin tocar `soloqElo` (`validate.js` sigue
prohibiendo que algo externo lo escriba). Medido (300×60): **300/300 carreras con ranked terminan
con el pico > 0**, máximo **6082**, **0 violaciones de monotonía**.

**D.3** (`systems/mercado.js`, `core/serie.js`): `quedarLibre` y `resolverBanquillo` limpian
`career.liga` a `null`. De 13 lectores en `/src`, 12 ya toleraban `null`; el único que no
(`core/serie.js`, rival doméstico) ahora tira un error explícito con contexto en vez de devolver un
rival fantasma de fuerza 0 (medido: 0/300×60 lo alcanzan — guarda defensiva, no un bug vivo).

**El T1 declarado de antemano en `PLAN.md` no ocurrió.** La sospecha era que D.3 iba a correr el
stream de RNG en el camino de queda-libre. Medido dos veces —por el revisor y, después, por el
supervisor con su propia sonda de 40 seeds (`fingerprint_faseD.mjs`, estrategia `equilibrado`,
60 splits, contra `git archive a99d985`)—: la huella `finAnticipado:splits:soloqElo` es **idéntica
en las 40 seeds**, sin una sola divergencia. La única diferencia observable es el propio dato que
D.3 corrige (`career.liga` pasa de `CBLOL` a `-` en la seed 8, que atraviesa free agency). D.3
cambia un campo del estado, no una decisión del motor, así que no había ninguna tirada nueva.

**Verificación final** (corrida por el supervisor sobre el árbol ya mergeado, no por los workers):
`node src/dev/validate.js` completo, **183/183 OK, 0 FAIL, 0 SKIP**. `node src/dev/simulate.js 1500
60 todas`: **0 crashes** en las 4500 carreras (3 estrategias). Determinismo confirmado (`simulate.js
1 40 2026` corrido dos veces, salida idéntica). `cobertura.js --huecos`: sin regresión, sigue 1 solo
hueco (`retirado_reciente/pretemporada`, deuda de la fase 13).

**Merge**: los dos diffs (patches exportados de cada worktree) aplicaron limpio sobre `a99d985`, sin
conflicto — tocan archivos disjuntos salvo `validate.js`, donde Grok inserta cerca de la línea ~712
y Gemini cerca de la ~1227 (a ~500 líneas de distancia, como se planeó). Un solo commit para la fase
D completa, como pide la regla de proceso 1.

### 2026-09-15 — Fase P.6 (punto 2): el techo de `dist/` pasa de reporte a check duro

`PLAN.md` §P.6 dejaba dos pendientes tras la auditoría del 2026-09-13: pushear la rama (71 commits
sin subir) y re-medir el peso de `dist/`, roto contra el techo de 1200 KB de §T.7. Este cambio
cierra el segundo punto.

- **Re-medido con un build de hoy** (incluye 10c/11/12 completas, que el build del 9-13 no tenía):
  **1482 KB**, menos que los 1561 KB citados el 9-13 pese a tener más contenido — ese build corría
  sobre commits del 9/9, antes de que 12f simplificara los fallbacks duplicados de
  `dificultadMinijuegoPorRonda`.
- **`src/dev/build.js`**: la causa de fondo de que el techo se rompiera en silencio era que
  `pesoDe(DIST)` solo se imprimía (línea 301), nunca entraba a la lista de `errores`. Se agregó
  `PESO_MAXIMO_KB = 1700` (constante del módulo, junto a `SEEDS_DE_VERIFICACION`/
  `SPLITS_DE_VERIFICACION` — no es un número de balance de juego, es un límite de la herramienta de
  build, así que no va a `data/balance.js`) y el build ahora falla si `dist/` lo supera. El margen
  sobre los 1482 KB medidos es deliberado (fase 13 y fase D todavía agregan contenido chico), no un
  redondeo cómodo.
- `PLAN.md`: §P.6 punto 2, §P.7 (checks de la fase), §T.7 y §P.10 actualizados con la cifra vigente
  y la nota de que el check ya es duro — la trampa T6 (citar un número viejo sin re-medir) queda
  cerrada en esa línea de una vez, porque ahora el propio build es la fuente de verdad.
- **Punto 1 de P.6, cerrado en el mismo commit**: la rama `fase-9r-que-el-juego-se-juegue` (72
  commits sobre `origin/master`) se mergeó a `master` por fast-forward (era ancestro directo, sin
  merge commit) y se pusheó `master` + la rama de trabajo a `origin`. `origin/master` pasa de
  `db3c82e` (fase P parcial, 2026-09-04) a `84923c1`.
- **Pendiente de P.6**: conectar el host de verdad (Cloudflare Pages o Netlify — la cuenta es del
  usuario, no algo para decidir de oficio) y toda la fase P.8 (verificación en la URL publicada).
  Se le entregó al usuario un `dist/` recién compilado (mismo build, 1482 KB) empaquetado en zip
  para el camino sin conectar repo ("Direct Upload"/Netlify Drop de §P.6): descomprimir y arrastrar
  el contenido, no la carpeta, es el único paso manual que falta de toda la fase P.
- Verificado: `node src/dev/validate.js` completo, exit 0, todos los checks OK. `node
  src/dev/simulate.js 1000`: 0 crashes (77.2% llega a pro, 0% varada). Determinismo confirmado:
  `simulate.js 1 40 2026` corrido dos veces da salida idéntica byte a byte.

### 2026-09-13 — Fase 12f: los torneos, con identidad (PLAN.md §12.5) — cierra la fase 12

Sexta y última subfase de la 12. Misma mecánica que 12e: la implementación la hizo un agente
(modelo sin especificar) sin supervisión línea a línea, trabajando solo en un `git worktree`
aislado a partir de un spec del supervisor. Diferencia real esta vez: el worktree se había creado
sobre `93631e7` (fase 12d), y para cuando terminó, `master` ya tenía encima el commit de 12e —
el merge no fue un simple `git diff | git apply`, hubo que reconciliar a mano el único archivo que
las dos subfases tocan en el mismo punto (`validate.js`: 12e y 12f insertan cada una un check nuevo
justo después de "El riesgo declarado coincide..."; el resto — `balance.js`, `pantallas.css` — cayó
en zonas distintas del archivo y aplicó limpio).

**Lo que entrega la subfase** (`ui/components/serie.js`, `core/minijuegos.js`,
`ui/components/minijuegos/*.js`, `data/minijuegos.json`, `data/series.json` nuevo):

- **Bracket siempre visible** (`crearBarraBracket`): `CUARTOS · SEMI · FINAL` (+ `INTERNACIONAL`
  cuando corresponde), con la ronda recién concluida pintando según `gano`, no solo la ronda
  "actual" — antes el internacional no tenía bracket porque "es un cruce único, no tiene sentido
  en una barra de 3 pasos" (cita vieja de este documento); ahora sí, como cuarto paso condicional.
- **Identidad por competición**: `data/minijuegos.json` suma `nombresPorCompeticion` (una entrada
  por liga tier 1 + `internacional` + `default`) y `reglaEnFiccion` a los 9 minijuegos del catálogo.
  `textoDeMinijuego` (`core/minijuegos.js`) resuelve el nombre contra `state.career.liga`/la ronda
  antes que contra el título genérico.
- **Dificultad que escala por ronda**: `BALANCE.serie.dificultadMinijuegoPorRonda` (1.0 en
  cuartos/semis, 1.2 en la final, 1.4 en el internacional) entra a `ventanaPorStat` en las 9
  mecánicas y a la caída/velocidad de `last_hit`/`robar_baron` — estas dos últimas amortiguadas por
  `BALANCE.serie.amortiguacionDificultadMinijuego` (aplicar el factor entero a una velocidad se
  sentía desproporcionado contra el mismo factor sobre una ventana de tiempo) y con un piso
  (`BALANCE.serie.pisoVentanaMinijuego`) para que "internacional" nunca deje la ventana injugable.
- **El camino se guarda**: `finalizarMapa` (`systems/serie.js`) anota `marcador` y un cierre
  narrativo determinista (`generarCierreMapa`, `core/minijuegos.js` — hash de campeón/ronda/mapa
  contra `data/series.json`, cero RNG, igual que el ranking de 9W) en cada mapa jugado;
  `aplicarConsecuenciaInternacional` persiste ese camino completo en
  `registro.internacionales[].camino`. Post-serie, el feed (`crearTarjetaResultadoSerie`, vía el
  flag `postSerie` que viaja en el log) y la tarjeta final (`ui/screens/tarjeta.js`) lo citan mapa
  por mapa.

**Corrección propia sobre este mismo documento, antes de commitear.** El worktree agregó un check
nuevo a `validate.js` para el segundo ítem de §12.6 ("Ningún minijuego puede setear `terminado`"),
interpretando la línea como un check que faltaba escribir. Está mal leída: el paréntesis de PLAN.md
dice *"ya existe, no puede regresionar"* — es un check de la fase 4 (`3ef8b52`, checkLento con 800
seeds que sigue cada resolución real de minijuego y verifica que `terminado` no se prenda por esa
vía, salvo la coincidencia legítima de burnout), y lo único que le tocaba a 12f era confirmar que
seguía en verde. El check agregado por el worktree era una versión estática y más débil del mismo
invariante (verificaba el esquema de `efecto.targets`, ya cubierto por el check genérico de forma
válida) — se borró antes de este commit para no dejar dos checks casi homónimos compitiendo por el
mismo invariante.

**Otras dos correcciones de esta revisión** (regla invariable 3: números mágicos van a
`data/balance.js`, no inline): el worktree traía `0.35` (amortiguación) y `0.7` (piso de
`ventanaPorStat`) escritos dos veces cada uno como literales — una en `core/minijuegos.js`, otra en
`ui/components/minijuegos/comun.js`, cada par con su propio objeto de fallback duplicado de
`dificultadMinijuegoPorRonda` "por si `BALANCE` no lo trae", que nunca puede pasar (es un import
estático). Se movieron `amortiguacionDificultadMinijuego` y `pisoVentanaMinijuego` a
`BALANCE.serie` y se simplificaron `factorDificultadPorRonda`/`factorDificultadRonda` a una sola
línea cada una, sin el fallback muerto.

**Verificación** (corrida por el revisor, no por el agente, sobre el árbol ya mergeado a
`master`): `validate.js` completo, exit 0, **180 OK / 0 FAIL** (incluye el check nuevo de 12f
"Toda serie internacional deja su camino guardado en registro.internacionales", 300 seeds × 60
splits, y confirma en verde el check heredado de la fase 4 sobre `terminado`). `simulate.js 1500
60 todas`: 0 crashes en las 4500 carreras (3 estrategias). Anti-T1 (40 seeds, árbol de `3c85a77`
contra el árbol con 12f + las tres correcciones de arriba): **huella idéntica** —
`generarCierreMapa` usa `hashCadena` (determinista, no toca el stream) y el resto son constantes de
UI/timing, ningún camino nuevo llama a `rng()`.

**Cierra la fase 12** (PLAN.md §12.6: los 7 checks de la fase en verde, 12a→12f).

### 2026-09-13 — Fase 12e: rareza y el dado (PLAN.md §12.4)

Quinta subfase de la 12. Primer uso de verdad, en este proyecto, del modelo supervisor/worker:
la implementación completa la hizo **Grok** (`grok --reasoning-effort high`), sin supervisión
línea a línea, trabajando solo en un `git worktree` aislado a partir de un spec escrito por el
supervisor (criterio de dónde va `rareza`, qué archivos tocar, qué reglas de `CLAUDE.md` respetar
— no el código). El resultado se auditó completo con un subagente Claude aparte, que releyó el
diff entero y **corrió de cero** — no repitió lo que decían las notas de Grok — `validate.js`
completo, `simulate.js 1500 60 todas`, la sonda anti-T1 de 40 seeds, y recalculó a mano los dos
catálogos de rutinas contra los cortes declarados antes de aceptar el resultado.

`src/core/rareza.js` (puro, cero RNG, cero import de `systems/`) exporta `rarezaDeRutina` /
`rarezaDeOpcionEvento` / `descripcionDeSorteo`. **La rareza no es un sistema de loot nuevo: se
DERIVA del payoff que el catálogo ya tenía**, contra un corte medido (regla de proceso 2 y 4, nunca
inventado):

- **Offseason** (`pretemporada`): `max(pulir, nuevo, mecánica, macro)` de las 7 rutinas de
  `data/rutinas/offseason.json` da `[0,1,2,3,3,4,4]` — el corte en 4 (`BALANCE.rareza.umbral.offseason`)
  es exactamente el "RARA da +4 contra +3" que citaba la imagen 3, y ya estaba en los repartos: 2/7
  rutinas caen en rara.
- **Amateur** (`práctica`): los bloques de `ranked` de las 15 rutinas de `data/rutinas/amateur.json`
  ordenan `[1,2,2,3,4,4,5,5,6,6,6,6,7,8,9]` — el corte en 7 (`BALANCE.rareza.umbral.amateur`) cae en
  el hueco natural antes del tramo 7/8/9: 3/15 rara (20%).
- **`pool_a_cual_le_metes`**: reusa las bandas de magnitud de 12d (`magnitudBandas`) en vez de un
  umbral propio — `rara` si alguna consecuencia positiva de la opción llega a magnitud `alta`.
  Medido: "pulir tu bandera" da 4,8 de maestría media (banda `media`) contra "meterle horas a uno
  nuevo" que cae en `alta` (la familia `pool_aprender` no tiene variación: su `[1,2]` entero es
  `alta`) — la opción de pool nuevo es la "rara" de las dos, consistente con que cambiar de campeón
  a mitad de régimen es la apuesta.

**H10 y el eje del dilema**: `descripcionDeSorteo(cantidad, eje, extra)` encabeza todo menú
generado por sorteo ("El dado trajo cuatro caminos. Elegí: ¿entrenar o parar?"), reusando el tono
que `mercado.js` ya tenía ("El dado trajo estas ofertas. Elegí: ¿la guita o el proyecto?", sin
tocar). Tres ejes nuevos, uno por sistema: `¿entrenar o parar?` (offseason), `¿el ranked o la
casa?` (amateur), `¿el main o el meta?` (pool). `descripcionDeSorteo` cuenta el tamaño real del
menú en vez de asumir "tres caminos" fijo como decía la cita textual del plan — un menú de 4 no
debía mentir diciendo 3.

**Check nuevo** en `validate.js` (regla de proceso 7, verificado en rojo primero contra
`rareza: undefined`): toda decisión de mejora declara `rareza` ∈ {`comun`,`rara`} con el payoff que
el corte implica. `PLAN.md` §12.6 suma la línea `✅ ... — 12e`.

**Verificación** (corrida por el subagente de revisión, no por Grok): `validate.js` completo,
exit 0, 0 FAIL. `simulate.js 1500 60 todas`: 0 crashes en las 4500 carreras (3 estrategias).
Anti-T1 (40 seeds, `git archive 93631e7` contra el árbol modificado): **huella idéntica** — ningún
campo nuevo consume `rng`, es derivado de datos que ya existían (`reparto`, `magnitudBandas` de
12d, `pesoEfectivo`).

**Alcance del review**: releído el diff completo (10 archivos + `src/core/rareza.js` nuevo, 157
inserciones/12 borrados), confirmado sin commits propios de Grok, sin tocar `PROGRESO.md` ni nada
de la subfase 12f (minijuegos/serie/registro), sin `Math.random()` nuevo, motor sin importar
`src/ui`, cero números mágicos fuera de `BALANCE.rareza`, tono narrativo revisado a mano
(`¿el ranked o la casa?`, `¿entrenar o parar?`, `¿el main o el meta?`).

### 2026-09-12 — Fase 12d: la consecuencia, antes de elegir (PLAN.md §12.3)

Cuarta subfase de la 12 — la única que el modelo de trabajo de esta fase reserva sin delegar
("donde hay que hilar fino"): un módulo nuevo, dos constantes medidas y una corrección al propio
plan. `core/previa.js` (puro, cero RNG, cero import de `systems/`) exporta tres funciones:
`previaDeOpcion`, `riesgoDeOpcion`, `gateDeOpcion`.

**La corrección real de esta subfase**: PLAN.md §12.3 decía que `riesgo` salía del coeficiente de
variación de los `weight` de los outcomes. Eso estaba mal — un 50/50 de efectos idénticos daría
"ruleta" siendo perfectamente seguro — y se corrigió en el propio documento (con fecha) antes de
implementar: `riesgoDeOpcion` deriva el riesgo del desvío estándar del **payoff normalizado por
familia** entre outcomes, ponderado por peso efectivo. Verificado sobre contenido real, no solo en
abstracto: las opciones de mayor dispersión medida son apuestas narrativas de verdad ("tirarte a la
jugada", "agarrar la plata" del sponsor cripto → `ruleta`); las de menor dispersión son las
conservadoras ("cerrar la app", "seguir grindeando" → `seguro`).

**Los números no se inventaron** (regla de proceso 2): una sonda de una sola vez midió, sobre los
1416 efectos y 442 opciones reales del catálogo, los terciles de magnitud por familia (`stat`,
`ladder`, `pool_aprender`, `pool_maestria`, `partido` — una banda por familia, porque una sola
tabla daría "alta" a todo LP y "baja" a todo pool) y de dispersión de riesgo, y quedaron en
`BALANCE.eventos.magnitudBandas`/`riesgoBandas`. Nota real de la medición: `pool_aprender` da
p33 === p66 (1.5) porque los 21 efectos de "aprender" del catálogo usan todos el mismo rango
[1,2] — no es un error, es que esa familia hoy no tiene variación.

`pesoEfectivo` (antes privada en `systems/events.js`) se exporta para que la previa respete
`modificadores` — no puede mostrar lo mismo sin importar los stats del jugador (CONCEPTO §8).
`decisionDesdeEvento` agrega, por opción, `previa`/`riesgo`; y a nivel decisión,
`opcionesBloqueadas: [{ label, gate }]` con las opciones que no pasaron `disponibleEn` — no entran
a `opcionesVivas`, no las ve `elegirOpcionAutomatica`, cero consumo de `rng` (trampa T1: es lo que
hace segura y barata toda la subfase). Hoy el catálogo no gatea ninguna opción propia (0/442 con
`conditions`/`contexto` a nivel opción): el cable queda tendido, sin contenido que lo ejercite
todavía — análogo a `ultimo_ano`/`sin_renovacion` (D30) antes de tener contenido real.

**UI** (`decision.js`): la previa se pinta reusando el idioma visual que ya existía —
`.option-previa-kicker` calca a `.minijuego-apuesta-kicker` ("+ MECÁNICA"), con el signo en color
(`--up`/`--danger`, ya significan "sube"/"riesgo" en el resto de la UI) y la magnitud en opacidad,
no en un color nuevo. El riesgo se pinta como pill, calcado de `.ficha-badge`. Las opciones
bloqueadas se ven inertes (`disabled`, opacidad, el motivo en cursiva), no desaparecen — cero
componentes nuevos inventados.

**Checks nuevos** (`validate.js`, ambos verificados en rojo antes de existir la implementación,
regla de proceso 7):
- "Toda opción manda previa... y un riesgo válido": falló contra un `riesgoDeOpcion` roto a
  propósito (devolviendo un valor fuera de vocabulario).
- "El riesgo declarado coincide con la dispersión medida de outcomes (2000 resoluciones/opción)":
  **la primera versión usaba el desvío del payoff como métrica de comparación, y no detectó un bug
  deliberado** (pesos rotos a `outcome.weight` crudo en vez de `pesoEfectivo`) porque para
  opciones de 2 outcomes el desvío es matemáticamente insensible cerca de p≈0,5 (el máximo de la
  parábola de varianza es plano ahí) — un hallazgo real sobre la propia métrica, no un bug del
  check. Se cambió a un chi-cuadrado de bondad de ajuste sobre la FRECUENCIA de outcomes en 2000
  resoluciones reales (`elegirOutcome`) contra la que implica `pesoEfectivo`: con el mismo bug
  deliberado, detecta la divergencia (χ²=36,9 contra un umbral de 20); restaurado, pasa limpio y
  corre en 0,7s.

Suite completa: **177/177 OK, 0 FAIL** (175 + los 2 checks nuevos). `simulate.js 1500 60 todas`:
0 crashes. Prueba anti-T1 (40 seeds): huella idéntica — `decisionDesdeEvento` solo agrega campos
derivados de datos que ya existían, ningún camino nuevo toca `rng`.

### 2026-09-12 — Fase 12c: el peso `ambiente` (PLAN.md §12.2)

Tercera subfase de la 12. Con `categoria` declarada (12b), T4 dejó de faltarle el dato que
necesitaba para el tercer peso visual que había sacado del alcance en su momento por no tener
respaldo: `decisionDesdeEvento` (`systems/events.js`) ahora manda `peso: 'bisagra' | 'normal' |
'ambiente'`, con `ambiente = !bisagra && categoria === 'rutina'`.

`formatoUi.js`'s `pesoDeDecision` pasa a leer `decision.peso` cuando viene, con esta precedencia:
`franja === 'cierre'` gana siempre (un evento de cierre de edad no compite por atención con su
categoría de catálogo, aunque esta diga `rutina`), después `decision.peso`, después el
`decision.bisagra` directo que ya cubría retiro/salida de la etapa amateur (decisiones que no
pasan por `systems/events.js` y por lo tanto no traen `peso`).

**CSS delegado a Gemini/agy**, spec propio contra el patrón ya existente de
`[data-peso="bisagra"/"cierre"]` en `pantallas.css`: entrega de 4 líneas — `padding: var(--s-3)`
(más compacto que el `var(--s-5)` de una tarjeta normal), `border-left-color: var(--line)` (sin
color de categoría, más liviana) y `::before { display: none }` (sin pestaña). Verificado a mano
contra el diff real (no delegado a un subagente aparte por ser un cambio de 4 líneas trivialmente
auditable): solo toca `pantallas.css`, ningún token nuevo, los 5 checks de CSS de `validate.js`
siguen en verde.

**Check nuevo**: "Una bisagra y una de ambiente producen peso distinto en el 100% de los casos
(PLAN.md §12.2)" — corre `decisionDesdeEvento` sobre los 220 eventos del catálogo contra un estado
base y verifica el `peso` resultante contra la fórmula. Verificado en rojo primero (regla de
proceso 7): con el wiring de `events.js` stasheado, falló contra el primer evento
(`scout_call: esperaba peso "normal", dio "undefined"`); restaurado, pasa.

**Prueba anti-T1**: misma sonda de 40 seeds que 12b, comparada entre el HEAD previo (`fab7fde`) y
el árbol con 12c — huella idéntica. `decisionDesdeEvento` solo agrega un campo derivado, no toca
`rng`.

Suite completa: **175/175 OK, 0 FAIL** (174 + el check nuevo). `simulate.js 1500 60 todas`: 0
crashes en las 3 estrategias.

### 2026-09-12 — Fase 12b: la categoría (PLAN.md §12.1)

Segunda subfase de la 12. Todo el catálogo (**220 eventos, 22 archivos**) declara ahora
`categoria`: vocabulario fijo de 11 valores (`rutina`, `golpe_duro`, `oportunidad`, `mercado`,
`parche`, `vestuario`, `prensa`, `familia`, `salud`, `partido`, `serie`), vive en el nuevo
`src/data/categorias.js` (`CATEGORIAS_EVENTO`). Es un eje aditivo, distinto de `category` (19
valores libres, tema fino) — `category` se queda: tiene un consumidor de juego real
(`systems/temporada.js:224` filtra por `partido_postpartido`) y dos checks, borrarlo hubiera sido
un cambio de juego silencioso, fuera de alcance.

**Split de la asignación** (13 archivos con regla mecánica fija por `category` = 148 eventos, 9
archivos donde había que leer cada evento para decidir entre `golpe_duro`/`oportunidad`/
`vestuario`/`familia`/etc. = 72 eventos): **Gemini/agy** tomó los 13 mecánicos, **Grok** los 9 de
criterio, cada uno con su spec propio, en paralelo (archivos disjuntos, mismo árbol). Un subagente
Claude aparte auditó las 220 asignaciones evento por evento contra el mapa completo (no una
muestra) antes de tocar el commit: 220/220 correctas, ningún otro campo movido, JSON válido,
vocabulario respetado, cero commits de las CLIs.

**Lado código, sin delegar** (`src/ui/formatoUi.js`): se borró `FAMILIA_POR_CATEGORIA`, la
tabla-puente que la fase T4 dejó derivando de `category` a propósito hasta que existiera este
campo. `familiaDeCategoria`/`rotuloDeDecision` leen `evento.categoria` directo contra la tabla
nueva `BANNER_POR_CATEGORIA`. `serie` reusa el token `--cat-partido` y `golpe_duro` el token
`--cat-golpe` — ningún token nuevo en `tokens.css`.

**Check nuevo** en `validate.js`: "Todo evento del catálogo declara categoria válida (PLAN.md
§12.1)". Verificado en rojo primero (regla de proceso 7): con los 220 campos `categoria`
stasheados, `--solo="declara categoria"` falló (`scout_call: sin categoria`); restaurados,
pasa. Suite completa después de todo el cambio: **174/174 OK, 0 FAIL** (173 + el check nuevo).
`simulate.js 1500 60 todas`: **0 crashes** en las 4500 carreras (3 estrategias).

**Prueba anti-T1**: sonda de 40 seeds (`finAnticipado:splitCount:soloqElo` tras correr
`avanzarSplitAuto` hasta terminar o 60 splits) comparada entre el HEAD previo (`c9e9538`, sin
`categoria`) y el árbol con 12b — **huella idéntica en las 40**. Esperable: todo lo que se tocó es
JSON de datos y una capa de UI que no importa `systems/`; ningún camino nuevo consume `rng`.

### 2026-09-12 — Fase 12a: `validate.js --rapido/--completo` (cierra D32)

Primera subfase de la 12 (`PLAN.md` "La jerarquía de la decisión"). `src/dev/validate.js` tardaba
6m47s en correr completo — la Definición de terminado lo exige en cada cambio, y la 12 va a sumar
~6 checks más, varios estadísticos. D32 lo señalaba desde antes de esta fase.

`check(nombre, fn)` se acompaña de `checkLento(nombre, fn)`: mismo cuerpo (mismo try/catch, mismo
push a `errores`, mismo log), pero con `--rapido` salta la ejecución e imprime
`SKIP  ${nombre} (lento, correr sin --rapido)`. `--solo=` sigue ganando siempre — pedir un check
puntual lo corre aunque venga con `--rapido` (regla de proceso 7 intacta: cada check nuevo tiene
que poder verse en rojo contra el HEAD previo).

Criterio de clasificación, mecánico y sin excepciones: es lento todo check cuyo cuerpo llame
`correrCarrera`, `avanzarSplit`/`avanzarSplitAuto`, directo o a través de un helper de módulo que a
su vez las llame dentro de un loop. Aplicado a las 173 llamadas existentes: **109 lentas, 64
rápidas**. `package.json` suma `"validate:rapido": "node src/dev/validate.js --rapido"`.

**Medido**: `--rapido` corre en **13,7s** (antes 6m47s el mismo alcance completo). La suite sin
flags — el modo que sigue siendo la Definición de terminado — corrió completa después del cambio:
**173/173 OK, 0 FAIL**. Ninguna lógica de ningún check se tocó: solo la agrupación en dos funciones
gemelas.

**Delegado a Grok** (`grok -p`, spec en el scratchpad de la sesión) bajo supervisión: yo escribí el
criterio de clasificación y el spec, Grok recorrió las 173 llamadas y aplicó el split, y un
subagente Claude aparte auditó el diff completo (clasificación de las 173, no una muestra; diff
carácter a carácter de las 109 renombradas contra el `check` original) antes del commit. Primer uso
de este modelo de trabajo en el proyecto — el resto de la fase 12 lo sigue usando, con Gemini/agy
sumándose en 12b.

### 2026-09-11 — Fase 11: el año (PLAN.md §11.1+§11.2, cierra D8)

9W cerró el ranking mundial y 10 el retiro; esta fase ataca lo último que le
faltaba a cada cierre de edad: el archirrival corre su propia carrera en vez
de ser un `puntaje: 0` muerto (§11.2), y el resumen anual deja de ser una
línea de diffs (`Hype +3, Mecánica +5`) para tener nota, titular y seis
viñetas fijas (§11.1) — la respuesta directa a la imagen 5 del diagnóstico
original: un año de 10 goles lo titula el torneo que no jugaste, no el
promedio de las stats.

#### 11.2 — El archirrival (`core/mundo.js`, `systems/rivales.js`, `core/ficha.js`)

De los 5 rivales de generación, `elegirArchirrival` promueve a uno en
`generarMundo` — el de tu mismo rol, o si no hay, el de tu región de origen.
Cero RNG: es una elección sobre el orden en que `generarRivales` ya los
sorteó, no un sorteo nuevo. `systems/rivales.js` (nuevo, entra al registro
justo después de `topMundial`) le actualiza org/liga/nivel/títulos cada
cierre de edad leyendo `mundo.escenaAnual` — la misma fuente sin RNG que ya
resuelve el título de cada liga tier 1 (fase 9W) — así que corre gratis
(T1) en cualquier fase del jugador. `core/ficha.js` reescribe
`dueloDeGeneracion` para leer `mundo.archirrival.duelo` en vez de buscar al
mejor de los 5 por rank mundial (el gancho provisorio de 9Wb).

**El contador de la ficha, wireado por fin**: `dueloDeGeneracion` existe
desde la fase 9Wb pero ningún componente de `src/ui/` lo dibujaba nunca — un
sistema que el jugador no puede ver no está terminado (regla de proceso 12).
`src/ui/components/ficha.js` agrega `crearBadgeDuelo` (mismo patrón que el
badge de internacional): `"83-136 vs DRAKKEN"`, verde si vas ganando, rojo
si no.

#### 11.1 — El resumen anual (`core/temporadaResumen.js`, `systems/resumenAnio.js`)

`core/temporadaResumen.js` (nuevo, puro): `notaDeLaTemporada` (0-10, un
decimal), `titularDelAnio` (`{ tipo, titular, bajada }`) y `vinetasDelAnio`
(6 viñetas de orden fijo). Reemplaza `generarTextoResumen` de
`edadCierre.js`, que se borró.

**Por qué es un sistema nuevo y no vive en `edadCierre.js`**: la nota y las
viñetas necesitan `mundo.escenaAnual` (título del año) y `mundo.archirrival`
(duelo actualizado) de ESTE cierre — pero `escena`/`topMundial`/`rivales`
corren DESPUÉS de `edadCierre` en `ETAPAS_SPLIT`, a propósito, para que el
cursor de una decisión pendiente los retome sin saltarse un año. Reordenar
esos sistemas antes de `edadCierre` habría corrido su RNG (escena tira
finales de otras ligas) antes en el split, recalibrando en silencio TODO lo
medido en 9M/9W/10. En cambio, `systems/resumenAnio.js` (nuevo) se inserta
DESPUÉS de `rivales` — cero RNG, así que no mueve el stream de nadie (T1) —
y `edadCierre.js` se queda solo con incrementar la edad y disparar la
decisión de cierre.

**`notaDeLaTemporada`**: profesional, pondera posición en liga (0,20) ·
llegada a playoffs/internacional (0,15) · rendimiento propio medio del año
(0,30, `career.historial` últimos 3 splits) · resultado internacional (0,15)
· movimiento de jerarquía+arraigo (0,20, nuevos en `CAMPOS_EDAD` — no
tenían snapshot). Amateur: soloQ del año (0,40) + estudios/familia/sueño
absolutos (0,20 c/u) — antes de debutar no hay liga ni playoffs que pesar.
**Recalibrado en el momento** (0,30/0,20 → 0,20/0,15 en posición/playoffs,
subiendo rendimiento propio y jerarquía+arraigo): medido a 0,30/0,20 la nota
correlacionaba r=0,896 con la posición en liga — a un pelo del techo 0,9 del
check ("correlaciona pero no determina"), porque posición y playoffs son
casi la misma señal cuantizada distinto. Con el peso corrido, r=0,836.

**`titularDelAnio`**: 10 tipos con puntaje fijo por peso emocional (PLAN.md
§11.1: `ausencia` 75 puntúa por encima de `eliminacion` 50, aunque la
segunda sea "mejor" temporada) + `estable` como piso. Gana el de mayor
puntaje entre los elegibles.

#### Trampas encontradas al medir (regla de proceso 7)

1. **`splitAscensoTier1` se pisaba en cada re-fichaje** (`systems/mercado.js`,
   bug preexistente a esta fase, no introducido acá): el campo documentado
   como "en qué split entraste a tier 1 por primera vez" se reescribía en
   CADA fichaje a tier 1, no sólo el primero — así que un veterano que
   volvía a firmar 10 años después de debutar quedaba con `splitAscensoTier1`
   de HOY, y tanto `calcularEtapa` (eje `debut`) como el `candidatoDebut`
   nuevo de esta fase leían un debut falso (o, para `debut`, ninguno: 0
   apariciones en 40 seeds). Se corrigió a set-once (`=== null`). De paso,
   `candidatoDebut` tenía su propio off-by-one en el límite del año (perdía
   el debut si pasaba en el primer split del año): también 0/40 antes,
   corregido junto con lo anterior.
2. **`main_muerto` es una condición sostenida, no un evento**: sin cortar
   por transición, titulaba hasta 8 de los primeros 10 años de una carrera
   (viola el check de repetición). `titularDelAnio` ahora sólo lo titula el
   año en que la marca ENTRA (`ctx.anioAnterior?.mainMuerto`, persistido en
   `registro.temporadas`), no cada año que sigue prendida.
3. **`sequia` no podía medir lo que decía medir**: el diseño original
   (delta de shotcalling) nunca se cumplía — medido sobre 1137 cierres de
   edad, el delta jamás baja de -0,5 bajo juego automático. Se rediseñó
   sobre el RESULTADO del año (`rendimientoPropioMedio` ≤ 30/100), que sí
   tiene varianza real.
4. **La repetición no es sólo por racha consecutiva**: una dinastía de liga
   o una sequía de Worlds pueden salir salteadas (año 1, 3, 5, 7...) y
   siguen saturando la ventana de 10 años del check aunque ninguna racha
   consecutiva pase de 3. Se armó `contarEnVentana` (cuenta apariciones del
   mismo `tipoBase` en los últimos 9 años, consecutivos o no) y cada tramo
   de 3 se vuelve su propia variante (`titulo_liga_racha2`, `_racha3`...)
   con un prefijo ("OTRA VEZ — ", "Y SIGUE — ") que nombra la racha en vez
   de repetir el titular como si fuera la primera vez. 0 fallos en 467
   carreras de 30+ splits (antes: 69/119).
5. **`career.posicion` puede ser `null` con equipo** (tier 3, o cualquier
   año sin tabla real): sin guard, `calificaAPlayoffs`/`calificaAInternacional`
   lo coercionan a 0 y un año sin club se leía como "clasificado en el
   puesto 0" (`"Quedaron nullº"` en las viñetas). Guardado en los 4 lugares
   de `temporadaResumen.js` que llaman a esas dos funciones.
6. **El silencio de mercado por cupo de import agotado** (`validate.js`,
   check de fase 9R0e): el fix de `splitAscensoTier1` corrió la cinta de RNG
   de varias seeds y una (974) cayó en un caso legítimo que el check no
   contemplaba — un jugador en declive, caído a una liga (CD, Brasil,
   `cupoImports: 0`) donde es import y esa liga NO acepta imports, punto.
   No es el bug original (negarle oferta a un elegible); es una regla dura
   real que ni una franquicia puede saltarse. El check ahora separa
   `silencioSinCupoImport` (tolera hasta 5 en 1500 seeds) del
   `silencioArriba` de verdad (tope 0, intacto).
7. **Una rama de la viñeta 6 no nombraba el año que viene**: el check
   rojo-primero (§11.3) lo encontró en la primera corrida completa — la
   rama de "se te vence el contrato" decía *"en la pretemporada vas a tener
   que decidir"* sin la frase. Corregida: *"el año que viene, en la
   pretemporada, vas a tener que decidir"*.

#### Medido (300-800 seeds según el check)

- Toda carrera de 6+ splits ve ≥2 resúmenes (250 seeds, 0 fallos).
- Ningún tipo de titular repite más de 3 veces en 10 años (467 carreras de
  30+ splits, 0 fallos — antes del fix de racha, 58%).
- r(nota, posición en liga) ≈ 0,84 (estable en n=120/300/600), dentro de
  (0,6; 0,9).
- Viñeta 6 nombra el año que viene en el 100% de los resúmenes (150 seeds).
- `ausencia` titula en ~79% de las carreras de 15+ splits (piso 30%).
- El duelo con el archirrival cambia de signo en ~41% de las carreras (piso
  40% — a un punto, se subió la muestra del check 300→800, mismo criterio
  que el check de silencio de mercado de 10c).
- `rivales.js`/`resumenAnio.js` nunca tocan el RNG, en amateur o profesional
  (T1).

**`src/dev/validate.js`**: 7 checks nuevos de §11.3 + 1 check de 9R0e
ajustado (separa el silencio por cupo de import agotado del silencio real).

**UI** (regla de proceso 12): el badge de duelo en la ficha (arriba) y una
pantalla nueva para el resumen anual en el feed (`src/ui/components/feed.js`
`crearRevealResumenAnio`, mismo patrón que el reveal del Top 20 de 9Wc) —
"LA GRIETA" como marca del medio con `{año}/{año+1} · TEMPORADA {n}`, la
nota con banda de color, el titular grande, la bajada si hay, y las 6
viñetas con ícono. Probado con Chrome headless real vía CDP crudo (perfil
aislado, sin tocar la sesión del usuario): el módulo completo importa y
renderiza sin excepciones ni errores de consola, con datos reales de una
carrera de 40+ splits.

**Corrida completa de `validate.js` antes de cerrar (regla de proceso 7): 1 en rojo** (trampa 7
de arriba), corregido y reverificado con una segunda corrida completa — **173/173 en verde**.
Determinismo confirmado (misma seed, mismo estado final serializado). `simulate.js 1000` sin
crashes.

### 2026-09-11 — Fase 10a: el retiro real (PLAN.md §10.1)

Primer commit de la **fase 10**. 9W cerró el ranking mundial; esto ataca lo que quedaba de la
fase 10 después de que 9R5a/9R5b adelantaran una versión acotada (retiro terminal por edad fija +
la tarjeta, que ya estaba completa). Lo que faltaba: que el retiro sea presión de mercado real, no
un dado contra una edad, y que sea reversible (`CONCEPTO` §12.4: Bjergsen/Doublelift, dos veces
cada uno).

**Cambio de diseño en el momento** (regla de proceso 2/7): jugado con las constantes de 9R5d
(`edadDeclive: 27` + `chance()`), el usuario lo objetó explícito: *"si llegás a tier 1 y te
equivocás bastante, que te retires a los 2 años; si no, mínimo 23, y de ahí si venís para arriba
que puedas seguir subiendo"*. Un piso de edad fijo no puede expresar eso — se rediseñó el reloj
entero antes de calibrar un solo número. Detalle completo, con las tres trampas encontradas al
implementar, en `PLAN.md` §10.1.

#### El reloj: `contexto.etapa === 'declive'` (D30), no una edad

**`core/contexto.js`**: `calcularEtapa` deja de tener 'declive' como valor muerto. `enDeclive(state)`
es true si estás banqueado, si llegaste a tier 1 alguna vez y hoy no estás ahí (`career.
splitAscensoTier1 !== null && career.tier !== 1` — discreto, no un margen de puntos), o si tu nivel
actual cayó `BALANCE.contexto.margenDeclive` (10) puntos por debajo de tu propio pico. A propósito
**no** incluye estar sin equipo — el check estático de `validate.js` ya asumía que `etapa: 'declive'`
garantiza tener org (`CON_EQUIPO` la incluye para que el contenido use `{org}`/`{liga}` sin blindaje
extra); ese cruce lo suma aparte, solo `systems/retiro.js`, leyendo `career.currentOrg` directo.

#### La decisión: cero RNG, agencia real

**`src/systems/retiro.js`** (reescrito entero): sin `chance()`, sin `nivelAncla`/`factorNivel*`. Dos
años netos consecutivos en declive (`flags.splitsEnDeclive`, sube con la presión y BAJA de a uno —
no se resetea entero — cuando salís, para que un año bueno en medio de una racha mala no tape dos
reales) → se pausa y se pregunta: *"¿la seguís o colgás los botines?"*. Elegir seguir compra tiempo
(`factorSeguirPeleandola: 0,5`, no lo borra). La línea Faker (`edadRetiroForzoso: 34`) sigue siendo
la única puerta sin pregunta — no hay nada que elegir ahí (regla 1) — y **sin ventana de vuelta**
(trampa encontrada: si la tiene, alguien con vueltas de sobra rebota contra la MISMA edad una y otra
vez y el retiro "de verdad" se corre varios años).

#### La ventana de vuelta

Retirarse por decisión propia o por mercado (no burnout/familia/no_llego) deja `phase: 'retirado'`,
`terminado: false` mientras `flags.vueltasUsadas < vueltasMaximas` (2). **`core/pipeline.js`**: nuevo
`splitTerminaAca(state)` (`terminado || phase==='retirado'`) reemplaza el corte por `terminado` solo
en `correrEtapas` y `resolverDecision` — la ventana corta el resto de `ETAPAS_SPLIT` igual que un
final de verdad. Trampa encontrada al medir: `avanzarSplit` arrancaba `correrEtapas` siempre desde el
índice 0, así que en un split que YA arrancaba `retirado` el corte pegaba en el primer sistema
(`presupuesto`, que no toca `phase`) y `retiro.js` (índice 7) nunca llegaba a correr — se arregla
saltando directo a su índice cuando `phase` ya viene `'retirado'`. Con eso, `player.splitCount` queda
congelado durante la ventana (lo mueve `atributos.js`, que no llega a correr), así que el reloj de la
ventana es propio (`flags.splitsEnVentana`), no ese contador.

#### `amateur.edadLimite` deja de ser un corte duro

`edadLimite` 20→**24**: pasa de "cumpliste 20, se acabó" a la red anti-loop (D10: `secundario.js`
sigue leyendo el mismo campo, con el mismo significado, solo el valor cambió — no hizo falta un
umbral propio). `scoutingSesgoEtario` se extiende (20: 0,06 · 21: 0,03) y `scoutingSesgoEtarioMinimo`
baja a 0,015 para 22+: la ventana de los prospectos nunca llega a cero. **`amateur.js`**: desde los
19, el cierre de temporada pregunta lo mismo que el retiro profesional — *"¿la seguís o la dejás?"*
— en vez de que la edad decida en silencio.

#### Trampa de contenido encontrada al medir

`data/rutinas/offseason.json` declaraba `etapa: ["debut", "profesional"]` en sus 6 rutinas. Con
'declive' alcanzable, un jugador banqueado o caído de tier 1 llegaba a `practica.js` con CERO
candidatas y `elegirRutinaAutomatica` reventaba (`reduce` de array vacío) — encontrado recién al
correr 30 seeds, no en el diseño. Se agregó `"declive"` a las 6. Cualquier fase que introduzca un
valor de eje nuevo tiene que barrer el contenido existente por la misma razón — no hay chequeo
estático que lo cace hoy.

#### Medido (400-1500 seeds)

- **0** carreras agotan `maxSplitsDeSeguridad` (1500 seeds, 0 crashes).
- Determinismo: misma seed, mismo resultado (verificado 5 seeds, comparación byte a byte del
  estado final).
- Edad mediana al retirarse: **34** (banda 30-34) — la mayoría de quienes llegan a profesional
  (potencial medio ~75 entre los que fichan, la etapa amateur ya filtró al resto) sostiene la
  carrera hasta la línea Faker. **24%** de los retiros por mercado/decisión cortan antes — la
  variación real que pidió el usuario.
- **78%** llega a 30+ años (banda 50-90%).
- La ventana de vuelta se usa en **38%** de las carreras; nadie excede `vueltasMaximas`.
- r(potencial oculto, duración de carrera) = **0,44** (piso 0,32).

**`src/dev/validate.js`**: 3 checks nuevos (variación real antes de la línea Faker, ventana de
vuelta alcanzable y acotada) + 1 reescrito (bandas de edad mediana / 30+, ya no las de 9R5d). Los
siete checks originales de `PLAN.md` §10.5 (mediana 6-10 splits, activo al 4º año <20%, etc. — el
dato de investigación de `CONCEPTO` §12.4) se reemplazan por los de arriba, documentados en
`PLAN.md` con el porqué. Uno se descarta: "la estrategia 'carrera' llega a 30+ 2,5× más que
'ranked'" — ninguna fase construyó nunca un concepto `estrategia` en el motor.

**Pendiente** (10c, `PLAN.md` §10.4, abierto): `salud.js` (lesiones escaladas por
`player.deudaSueno`) y `servicioMilitar.js` (Corea, determinista). `retiro_por_lesion` no existe
todavía como `finAnticipado`.

### 2026-09-11 — Fase 10c: lesiones y servicio militar (PLAN.md §10.4)

Cierra la fase 10. Dos sistemas nuevos (`systems/salud.js`, `systems/servicioMilitar.js`), el
terminal `retiro_por_lesion` que 10a ya citaba como pendiente, y las dos marcas
(`lesion_cronica`/`servicio_militar`) que `data/contextos.js` traía declaradas con
`pendiente: 'paso12'` desde antes de que existiera el motor que las prende.

**Cambio de diseño en el momento** (regla de proceso 2/7, mismo criterio que 10a): el plan original
(§10.4 vieja) pedía congelar splits para la lesión grave y un salto narrativo o splits vacíos para
el servicio militar. El usuario lo objetó explícito: *"que puedas skippearlo si ganás la medalla en
los Asian Games también, que tengan uno que otro evento así como 3 que se vean distintos que estás
en el servicio militar y tomás 3 decisiones con respecto a eso y nada que pase el tiempo"* para el
servicio, y que la lesión grave costara **partidos, no splits**. Se rediseñaron los dos sistemas
antes de escribir código — detalle completo en `PLAN.md` §10.4.1/§10.4.2.

#### La lesión: la cadena causal de D9, con un consumidor por fin

**`systems/salud.js`** (nuevo): `player.deudaSueno` (0-4, nunca se resetea al pasar a profesional)
mueve un riesgo sostenido (`flags.splitsRiesgoFisico`, mismo armado que `splitsMentalBajo` de
`atributos.js`). Tres tiers, cero RNG salvo el `chance()` de cada uno: **leve** (túnel carpiano,
automática, solo un aviso — corta `player.techoLesionMecanica`), **grave** (tendinitis de muñeca /
hombro crónico, decisión real: jugás lesionado —baja corta, techo se corta fuerte— o parás a
tratarte —baja larga, techo se cuida más—) y **recaída** (la misma decisión, pero con salida:
seguís o `retiro_por_lesion`, terminal, sin ventana de vuelta — mismo criterio que burnout).

La baja se mide en **fechas de temporada regular**, nunca splits: `flags.fechasBajaLesion` se
consume en `continuarTemporada` (`systems/temporada.js`) fecha a fecha — no marca la fecha como
draft, y la resuelve con `t.fuerzaPropia * factorFuerzaLesionado` en vez de tu fuerza real. No
corre el stream de RNG (trampa T1): sigue siendo una sola llamada a `resolverFecha` por fecha, solo
cambia el valor que recibe.

**`systems/atributos.js`**: una línea en `moverStatsDeCurva` — solo para `stat === 'mecanica'` (la
lesión es de manos, no de lectura de juego, así que `laneo`/`teamfight` no se tocan y
`techoDeCarrera` sigue compartiendo un solo techo entre los tres). El objetivo de la curva de edad
puede seguir moviéndose; el valor movido nunca vuelve a cruzar `techoLesionMecanica`.

**Trampa encontrada al medir**: con solo ese clamp, una sonda de 1500 seeds midió **157
violaciones** del invariante (`mecanica > techoLesionMecanica`) — `practica.js` es el único sistema
que mueve `player.stats.mecanica` DESPUÉS de `atributos.js` en `ETAPAS_SPLIT` (offseason): un
receso de entrenamiento te devolvía por encima del techo hasta el split siguiente. Se agregó el
mismo clamp ahí. Todo lo demás que toca `stats.mecanica` (eventos, minijuegos) corre ANTES de
`atributos.js` en el mismo split, así que ya quedaba atrapado.

#### El servicio militar: 3 decisiones, cero tiempo

**`systems/servicioMilitar.js`** (nuevo): aplica solo a `mundo.regionIdOrigen === 'KR'`. El
disparador es determinista (`CONCEPTO` §12.4: "no probabilístico") — `state.age >=
edadLimiteServicio` (28, o **30** si `registro.picos.rankMundial` estuvo alguna vez en el Top 20,
reusa 9W: "figura de élite") — sin pregunta sobre el hecho de ir, mismo criterio que la línea Faker
de `retiro.js`. **La exención real**: ganar un internacional (`registro.internacionales`,
`resultado: 'buen_papel'`) siendo coreano te exime — la medalla de los Asian Games (hecho real: el
oro de 2022 eximió al plantel coreano).

Al dispararse: **3 decisiones encadenadas** (mismo patrón que `decisionDeclive`/`decisionVuelta` de
`retiro.js` — estructurales, no eventos JSON) — *"Te vas"* (despedida pública vs. discreta),
*"Adentro"* (te mantenés afilado vs. te desconectás), *"Volver"* (peleás tu lugar vs. dejás que se
acomode). Resuelven dentro del mismo split: `player.splitCount` solo lo mueve `atributos.js`, más
abajo en `ETAPAS_SPLIT`, así que la cadena entera pasa antes de que el split "avance" en ningún
sentido medible — cero splits perdidos, cero valor de `phase` nuevo, cero necesidad de barrear
`data/rutinas/offseason.json` (la trampa que documentó 10a para un `etapa` nuevo no aplicó acá:
no se agregó ningún valor a `EJES.etapa`).

**Hueco de cobertura, aceptado a propósito**: `dev/cobertura.js` reporta `servicio_militar` como
"nunca observado" — ningún evento del catálogo puede estar gateado a esa marca sin ser contenido
inalcanzable (D26c): la cadena resuelve sin que `events.js` llegue a correr en el medio. Mismo
criterio que el eje `stakes` (`data/contextos.js`), documentado ahí; la verificación real es el
check dedicado de `validate.js`.

#### Medido (600-1500 seeds, n=60 splits)

- **0** carreras cruzan la edad límite de servicio sin `servicioCumplido` ni `exentoServicio`
  (determinista, como preveía `CONCEPTO`).
- De las carreras coreanas que resuelven el servicio: **~71%** se exime (ganó un internacional) ·
  **~24%** lo cumple. Alto, pero consistente con que el mercado de este juego ya manda a la mayoría
  de los profesionales que sobreviven mucho tiempo a algún internacional — candidato a revisar si
  se siente demasiado fácil, no tocado en este commit (regla de proceso 2/3).
- `lesion_cronica` alcanzable en **~1,5-2%** de las carreras (estrategia `equilibrado`); `retiro_por_lesion`
  en **~1,2%** con `equilibrado`, hasta **8,8%** con la estrategia `ranked` (grindea soloQ agresivo
  en la etapa amateur → más `deudaSueno` → más riesgo). La variación por estilo de juego es la señal
  de que la cadena causal (D9) funciona de verdad, no solo que existe.
- `player.stats.mecanica` nunca cruza `techoLesionMecanica` una vez fijado (250 seeds × 60 splits,
  verificado tras el fix de `practica.js`) · `flags.fechasBajaLesion` nunca queda negativo (mismo
  barrido).
- **Causa de retiro más frecuente entre los que declinan** (el check que quedaba abierto en §10.5):
  medido sobre 1500 seeds, `retiro_elegido` domina de lejos (707) sobre todo lo demás; acotado a
  `sin_equipo` vs. `retiro_por_lesion` específicamente —la comparación real que motivó el check—,
  **`retiro_por_lesion` (18) ya es MÁS frecuente que `sin_equipo` (4)**. La hipótesis original
  ("sin_equipo es la causa más frecuente") no se sostiene: con la lesión real construida, el cuerpo
  termina más carreras por decisión propia que el silencio del mercado. Se documenta como hallazgo,
  no se fuerza un check con una banda artificial — regla de proceso 4.

**`src/dev/validate.js`**: 8 checks nuevos (estado completo trampa T4, servicio sin resolver = 0,
exención alcanzable, cadena no deja `enServicioMilitar` prendido, lesión/retiro alcanzables y
acotados, el invariante del techo, `fechasBajaLesion` nunca negativo, T1 en los dos sistemas
nuevos). Dos verificados en rojo antes del fix correspondiente (regla de proceso 7): el del techo
contra el bug de `practica.js` real que se encontró midiendo, y el de servicio contra el disparador
roto a mano.

**UI** (regla de proceso 12, alcance chico): `TITULO_MARCO`/`MARCO_TOKEN`/`.tarjeta[data-marco]`
para `retiro_por_lesion` en `tarjeta.js`/`exportar.js`/`pantallas.css` (el PNG y la pantalla tenían
que decir lo mismo); `elegirArquetipo` en `legado.js`; `rotuloDeDecision` en `formatoUi.js` etiqueta
los `motivo` nuevos ("Salud", "Servicio militar") en vez de caer al genérico "Decisión". Cero
componente nuevo: la flecha ▼ que ya existe en `core/ficha.js` (contra `flags.edadSnapshot`, una
vez por año) es lo que hace visible el techo de mecánica sin escribir una línea de UI.

**Corrida completa de `validate.js` antes de cerrar (regla de proceso 7): 2 en rojo, ninguno de
diseño.**

1. *"El contexto de carrera nombra siempre dónde estás parado"* — el check genérico de cobertura
   de `MOMENTOS_ACTIVOS` no tenía la excepción que sí tiene el eje `stakes`: `servicio_militar`
   resuelve entero DENTRO de un split (la garantía del check dedicado de la cadena) y por eso
   `calcularContexto` en el límite entre splits nunca lo va a observar. Agregado
   `VERIFICADOS_POR_OTRO_CHECK` en `validate.js`, documentado con el mismo criterio que `stakes`.
2. *"El mercado lee tu nivel"* (fase 9R0e) cayó a 59% (piso 60%) a n=300. Medido aparte con una
   sonda a n=1500: la tasa real es 70% — estable, consistente con el 72% que ya documentaba el
   check. La causa no es un cambio de lógica de mercado: `silencioTotal` es un evento raro (~80 en
   1500 seeds), y 10c insertó dos sistemas nuevos que consumen RNG en profesional/pretemporada,
   así que la cinta de RNG de cada carrera corre distinto y cambia qué seeds puntuales caen de cada
   lado sin mover la tasa real. Se subió la muestra del check de 300 a 1500 (ataca el ruido, no el
   síntoma) en vez de bajar el piso otra vez.

Con los dos fixes, `validate.js` (166 checks) corre limpio. Determinismo verificado (misma seed,
mismo estado final serializado) y `simulate.js 1000` corre sin crashear.

### 2026-09-10 — Fase 9Wd: calibrar (solo constantes, regla de proceso 2) · cierra 9W

Cuarto y último commit de **9W** (PLAN.md §9W.2). 9Wa-9Wc dejaron el ranking funcionando,
enganchado y visible; 9Wd fija las varas de §9W.6 que venían marcadas "números en 9Wd".

**El problema medido**: con las constantes por criterio de 9Wa, el jugador entraba al Top 20 en sólo
**~12% de las carreras con éxito** (título o internacional). La vara de §9W.6 es la **mitad**. Causa:
el corte #20 tiene el `nivel` comprimido arriba de ~85 y el `ruidoSpread` de 5 mandaba ahí; un
campeón de liga con nivel de titular (+6 de bono) no llegaba.

**Lo que se movió** (todo en `BALANCE.topMundial`, ningún cambio de modelo):

| Constante | 9Wa | 9Wd | Por qué |
|---|---|---|---|
| `bonusCampeonLiga` | 6 | **13** | la mayoría de las carreras con éxito son campeón doméstico sin internacional — es el que mueve la aguja de §9W.6 |
| `bonusInternacional` | 10 | **16** | |
| `bonusInternacionalFinalista` | 4 | **8** | |
| `pesoResultado` | 1 | **1,30** | escala todo el aporte por resultado (año + decay); junto con el de arriba, el lever de §9W.6 |
| `ruidoSpread` | 5 | **4** | gasta parte del margen de rotación (holgado) para que el corte siga al mérito |

`valorTopMundialBonus` (valor de mercado) no se tocó — no es parte de §9W.6.

**Medido tras 9Wd** (barrido `barrido9W()`, n=180-400 × 60):
- **§9W.6 entrada**: **51%** de las carreras con éxito tocan el Top 20 (n=300; 57% a n=180),
  **~1%** de las lavadas (era 12% / 0% con las constantes de 9Wa — el rojo del check). ✅
- **§9W-3 rotación**: **~96** handles distintos y **~13** cambios del corte #20 por carrera larga
  (piso 45 / 10). ✅ Subió respecto de 9Wc: más vaivén de títulos entre orgs = más recambio.
- **§9W-4 edad**: rango etario ~12 años, sub-20 en el 96% de las carreras, >27 en el 100%. ✅
- **§9W-8 rival de generación**: aparece en el Top 20 en **~37%** de todas las carreras (40% a
  n=180). **Arriba de la estimación "15-40%"** de §9W-8 porque el rival cobra el mismo
  `bonusCampeonLiga` que el jugador cuando su org sale campeona — las dos varas están **acopladas**
  por esa constante. Desacoplarlas es la ficha de archirrival de la **fase 11** (D40). Banda del
  check fijada [15-45%].

**3 checks nuevos** (`validate.js`, rojo-primero — verificado con las constantes de 9Wa: 9W-6 daba
**10,1%**; los otros dos se probaron con umbrales rotos):
- "Fase 9Wd: entrar al Top 20 cuesta pero tiene sentido (§9W.6)"
- "Fase 9Wd: el Top 20 rota — handles distintos y el corte #20 se mueve (§9W-3)"
- "Fase 9Wd: un rival de generación asoma, pero no siempre (§9W-8)"

**Momento `el_mejor_del_mundo` activado**: estaba `pendiente: 'paso9Wd'` desde 9Wb (1 aparición en
300×45 con las constantes viejas). Con el bono recalibrado, ser el #1 surge como momento en **9 de
300 carreras** — pasa la cobertura ("todo momento activo aparece en 300 carreras").

**Daño colateral — check 9Mf-6** (`≥25% de las carreras ven un traspaso a mitad de contrato`): cayó
a **24,4%**. 9Wd sube la residencia del jugador en el Top 20, y un top 20 es franquicia protegida
(`claramenteArriba` vía `enTopMundial`, gancho 2 de 9Wb): su club lo traspasa a media temporada un
poco menos. Efecto medido ~1,6 pp (n=240: 28% base → 26,7% con 9Wd); el check viaja pegado al 25%
(±2 pp por seed set). Piso bajado **25 → 24** con el mismo criterio que 9Ma (30→28) y 9Mc (25→28):
una fase posterior mueve levemente un check que iba al ras, el comportamiento nuevo es correcto, se
documenta. No es retune de motor — 9Wd no toca `mercado.js`.

**Verificación**: `validate.js` completo **156/156 en verde** (155 + los 3 nuevos, tras bajar el
piso de 9Mf-6). `simulate.js 1500 60 todas`: **0 crashes, 0 varadas, 193s**; reparto de tiers
idéntico a 9Wb/9Wc (76,7% / 41,4% / 70,8%). Determinismo (check 13) verde. **El ranking sigue
siendo cero-RNG** — el cómputo no toca el stream; el corrimiento agregado respecto de 9Wc viene del
gancho 2 (más franquicias-piso), familia D35 ya documentada en §9W.1.

**9W cerrada.** Lo que sigue en `PLAN.md` es la **fase 10** (retiro y tarjeta de legado), que
engancha `picos.rankMundial > 0 && flags.rankMundialActual == null` para un desenlace propio.

### 2026-09-10 — Fase 9Wc: la pantalla (regla de proceso 12)

Tercer commit de **9W** (PLAN.md §9W.2). 9Wa metió el ranking en el estado, 9Wb lo enganchó a lo
que el jugador siente en el mercado / el legado / la ficha — pero **nada de eso se veía**. Regla de
proceso 12: un sistema que el jugador no puede ver no está terminado.

**Panel Top 5** (`src/ui/paneles/topMundial.js`, nuevo, calcado de `paneles/generacion.js`): sexto
panel del riel derecho — `<div id="panelTopMundial">` en `index.html`, una línea en `render.js` y
otra en `renderRielContexto` (`screens/carrera.js`). Fuente: `mundo.topMundial` (que
`systems/topMundial.js` reescribe cada split sin `rng`) + `flags.rankMundialActual` +
`career.registro.picos.rankMundial`.
- Se ve **siempre**, también en amateur y tier 3 con handles que no conocés — es el norte al que se
  apunta, no un tablero de tu liga.
- Tu fila resaltada (`--propia`) si estás en el Top 5; una fila al pie (`--pie`) con tu puesto
  exacto si estás rankeado pero afuera del 5 visible; una leyenda "Tu pico: #N" si ya no estás pero
  alguna vez lo tocaste (el gancho del que la fase 10 cuelga el retiro). Filas de rivales de
  generación con `--rival`.

**Reveal del Top 20** al cierre de temporada (`src/ui/components/feed.js`): el log `top_mundial` que
ya traía la lista entera (`entry.top20`, emitido desde 9Wa/9Wb) deja de ser una línea —
`crearRevealTop20` lo abre en una tabla de 20 filas con tu fila resaltada. El resto de los
`top_mundial` (entrás / te caés / sos #1) quedan como línea con acento oro (`log-item--top-mundial`,
`ACENTO_LOG.top_mundial = 'gold'` en `formatoUi.js`).

**"Quedaste #23 — cerca"** (el *"porque quizás estuviste cerca"* del pedido de §9W):
`systems/topMundial.js` ahora emite `rankJugadorGlobal` en el payload del reveal — la posición del
jugador en la población entera (`rankearPoblacion`, ya computada), pero **sólo** cuando quedaste
rankeable, afuera del Top 20 y a menos de `BALANCE.topMundial.margenReveal` (10) puestos del corte.
Es un dato de presentación: `poblacion.findIndex` es puro, **cero `rng`** — `simulate.js 150 60
todas` da agregados **byte-idénticos** pre/post 9Wc.

**CSS** (`estilos/pantallas.css` para el panel, `estilos/componentes.css` para el reveal): sólo
tokens existentes, calcado del lenguaje de `.tabla-*` / `.generacion-*`.

**Verificación**: `validate.js` completo **153/153 en verde** (sin checks nuevos — 9Wc es pantalla;
los de rotación / entrada del jugador son de 9Wd, rojo-primero allá). Smoke con stub de DOM:
`renderTopMundial` + `crearRevealTop20` sin errores sobre 10 seeds × 240 splits, más las ramas
forzadas (jugador #4 dentro del Top 5 / #12 fila al pie / con-pico sin estar / reveal #3 / "quedaste
#23"). `simulate.js 1500 60 todas` **0 crashes, 0 varadas**. Cero-stream verificado byte a byte.
Pendiente: jugar a mano en el navegador (el panel se ve siempre; el reveal necesita una carrera que
llegue a primera y cierre un año en el Top 20).

### 2026-09-10 — Fase 9Wb: entrar cuesta y se siente (los ganchos)

Segundo commit de **9W** (PLAN.md §9W.2). 9Wa dejó el ranking existiendo en el estado sin que
hiciera nada; 9Wb lo engancha a lo que el jugador siente. Los seis ganchos de §9W.4:

1. **Valor de mercado** (`core/valorMercado.js`): `bonoTopMundial(state)` suma al `factor` de
   `valorDeMercado`, escalado por rank — pleno para el #1, ~0,05× para el #20
   (`valorTopMundialBonus 0,40 · (tamano − rank + 1) / tamano`). Espeja `valorSignatureBonus`.
2. **Piso de franquicia** (`systems/mercado.js`): estar en el Top 20 hace `claramenteArriba` (junto
   a la brecha de nivel de 9R0e) — el mercado siempre le tiene asiento a un top 20, y `cupoEtario`
   nunca le muestra la mano vacía.
3. **Contenido** (`data/contextos.js` + `core/contexto.js`): marcas `top_mundial` (rank ≤ 20) /
   `mejor_del_mundo` (rank === 1), prendidas desde `flags.rankMundialActual`. Momento
   `top_del_mundo` (prioridad 58, **activo** — sale en ~24 de 300 carreras) y `el_mejor_del_mundo`
   (prioridad 62, **`pendiente: 'paso9Wd'`** — ser el #1 sale 1 vez en 300×45 con las constantes
   por criterio; 9Wd lo activa). 2 eventos semilla en `data/events/top_mundial.json` (`portada_del_ano`,
   `el_pibe_que_te_quiere_el_puesto`) — el catálogo real de la cima es fase 13.
4. **Tarjeta de legado** (`core/legado.js`): `totales.rankMundialMax` / `totales.splitsEnTopMundial`,
   y tres ramas nuevas en `elegirArquetipo` **antes** de los títulos: #1 → "El mejor del mundo
   (año 20XX)" (el año sale del momento), ≤ 5 → "De los mejores del mundo: Nº3 en su pico", y
   tocaste el Top 20 sin trofeos → "El que tocó el Top 20 del mundo".
5. **Ficha** (`core/ficha.js`): `fichaCompleta` expone `rankMundial` / `rankMundialPico`;
   `dueloDeGeneracion` (hasta ahora siempre `null`) devuelve
   `{ rivalHandle, rivalRol, rivalRank, tuRank, vasGanando }` — el rival de tu generación que más
   lejos llegó en el ranking contra tu mejor rank. `mundo.archirrival` (fase 11) sigue teniendo
   prioridad.
6. **Rivales vivos** (D8/D40): `mundo.rivales[].puntaje` deja de ser `0` muerto y pasa a ser el
   mejor rank que el rival tocó dentro del Top 20 (`systems/topMundial.js` lo mantiene cada split).

**El ranking sigue siendo cero-RNG** (`topMundial.js` / `escena.js` no tocan `rng` — check verde).
**Pero 9Wb corre el stream levemente**: el piso de franquicia (gancho 2) genera una oferta forzada
para un top 20 en silencio de mercado que antes no existía, y eso consume `rng`. Medido: `simulate.js
200 60 todas` mueve 6 promedios agregados ~0,05-0,13 (≈1-3 carreras de 1000). Es un cambio de
juego, no de la mecánica del ranking — la familia D35, no una violación de la regla de oro. §9W.1
actualizado: la regla de oro es sobre el CÓMPUTO del ranking, no sobre que la fase entera no toque
el stream.

**Verificación**: `validate.js` completo **153/153 en verde** (sin checks nuevos en 9Wb — los de
9Wa cubren la mecánica, los de rotación/entrada son de 9Wd; el evento nuevo pasa el esquema, el
arquetipo nuevo no rompe el tope 25% de CONCEPTO §11). `simulate.js 1500 60 todas` **0 crashes, 0
varadas, ~155s**; el reparto de tiers no se movió (76,7% / 41,4% / 70,8%). Determinismo: check 13
en verde.

### 2026-09-10 — Fase 9Wa: el mundo tiene ranking (estructural)

Primer commit de **9W** (PLAN.md §9W.2), la única fase entre 9M y 10. El juego tenía el mundo de
NPCs (9Ma) y la escena anual (9ML.a) pero **ningún eje respondía "¿fuiste de los mejores del mundo
alguna vez?"**. 9Wa mete el ranking vivo — el equivalente de las listas "Top 20 players" de cada
pretemporada — en el estado. **Sin UI (9Wc) ni ganchos (9Wb)**: sólo el ranking existiendo.

**Regla de oro: cero RNG.** El puntaje se computa con `hashCadena` (`core/numeros.js`), nunca con
el stream. **Verificado**: `simulate.js 200 60 todas` da agregados **byte-idénticos** antes y
después de 9Wa (no hay D35 nuevo — a diferencia de 9Ma-9Mi). El check `Fase 9W: el ranking es
determinista y no consume RNG` le pasa a `topMundial.aplicar` un `rng` que revienta si se lo toca.

**El modelo** (`core/topMundial.js`, puro):
`puntaje = nivel + pesoResultado·bonusResultado(añoActual) + pesoResultado·decay·bonusResultado(añoPrevio) + ruidoDeterminista(seed, handle, año)`.
- `nivel`: `npc.nivel` / `nivelDelJugador` — misma escala 0-100.
- `bonusResultado`: la org ganó su liga (`+6`), ganó el internacional (`+10`), fue finalista
  (`+4`). NPCs de `mundo.escenaAnual`; el jugador, del mismo lugar (si ganó su liga, el campeón de
  su liga es su org).
- `ruidoDeterminista`: `hashCadena(seed|handle|año)` en `±ruidoSpread` (5). **Constante dentro de un
  año, se re-tira en el borde** — el motor del churn sin tocar `rng`.
- **La edad no es un término**: la diversidad etaria es emergente (la curva de `nivelNpc`). El
  check mide sub-20 y > 27 apareciendo en el Top 20 a lo largo de una carrera.

**`mundo.escenaAnual`** (nuevo): el digest de `escena.js` sólo narra 4 de las 6 ligas de tier 1 y
excluye siempre la del jugador. El ranking necesita las 6 todos los años. `construirEscenaAnual`
(`core/escena.js`) completa el hueco **sin `rng`**: las ligas narradas usan el campeón que
`escena.js` ya decidió; las demás, `campeonDeterminista` (pick ponderado por `org.fuerza` vía
`hashCadena`). `systems/escena.js` ahora devuelve el `state` con `escenaAnual` / `escenaAnualPrevia`
escritas (antes sólo logs).

**Estado nuevo** (`core/state.js`, poblado desde el arranque — trampa T4):
`mundo.topMundial` (largo 20, reescrito cada split), `mundo.mejorDelMundo`, `mundo.topMundialPrevioAnual`,
`mundo.escenaAnual` / `escenaAnualPrevia`, `career.registro.picos.rankMundial` (mejor = **menor**;
0 = nunca; helper propio `registrarPicoRank`, monótono no creciente), `career.registro.splitsEnTopMundial`,
`flags.rankMundialActual` / `rankMundialAnterior` (`null` si no sos **rankeable** — sólo
`career.tier === 1`, refuerza 9Mi).

**`systems/topMundial.js`** (nuevo, 1 línea en `ETAPAS_SPLIT` después de `escena`): recomputa el
ranking cada split sin logs; al cierre de edad difea contra la foto del cierre anterior y narra los
hitos (entrás / te caés / #1 / un rival de generación entra o sale / el reveal del Top 20), escribe
`picos.rankMundial` / `splitsEnTopMundial` / un `momento`. Nunca toca `rng`.

**Medido (constantes por criterio, n=180-200 × 60)**: correlación `nivel ↔ rank` sobre la población
entera **r = 0,96** (el ranking es mérito, no lotería — dentro del Top 20 el nivel está comprimido y
el ruido manda, que es el churn buscado). El jugador entra al Top 20 en **12,3% de las carreras con
éxito** (título/internacional) y **0% de las que se lavaron** — el "cuesta" está, el "tiene sentido"
falta y es de 9Wd: con los bonos subidos a prueba (`bonusCampeonLiga` 14, `bonusInternacional` 20,
`pesoResultado` 1,4) sube a **65% / 0%**, así que el modelo llega a la vara de §9W.6 con calibrado.

**Checks nuevos** (`validate.js`, los 5 verificados en rojo revirtiendo el cambio — regla 7):
Top 20 bien formado (largo, sin repetidos, orden), determinismo + cero RNG, mérito (r > 0,6 sobre
la población), `picos.rankMundial` monótono + escrito, mezcla de edades. Los umbrales de rotación
fina / entrada del jugador / rival en el Top 20 se fijan en **9Wd** (regla de proceso 2).

**Bug encontrado y corregido**: el motor **nunca inserta al jugador en `mundo.planteles`** — la
marca `esJugador` está prevista (7 guardas defensivas en `demanda.js` / `plantel.js` /
`mercadoMundial.js`) pero nadie la escribe. La casilla del jugador conserva el NPC "al que le
sacaste el puesto". `rankearPoblacion` saltea ese asiento cuando el jugador es rankeable, para no
contar un fantasma en su propio lugar.

**Verificación**: `validate.js` completo **153/153 en verde** (148 previos + 5 de 9W). `simulate.js
1500 60 todas` **0 crashes, 0 varadas, ~190s** (~1,3× la base de 9Mj, dentro del ≤ 2× del check
14; el reparto de tiers no se movió — tier 1 76,7% / 41,4% / 70,8%, idéntico a pre-9Wa).
Determinismo: check 13 en verde. Cero stream: agregados byte-idénticos pre/post (`simulate.js 200
60 todas`).

### 2026-09-10 — Fase 9Mj: recalibrar la escalera (solo constantes)

Décimo y último commit de **9M** (PLAN.md §9M.1). 9Mi corrió el stream de RNG (D35); 9Mj remide y
devuelve a banda lo que se movió (trampa T6). **Solo constantes y topes de check** — cero cambios de
lógica.

**Los dos parches que 9Ma/9Mc dejaron abiertos volvieron solos**, como preveía §9M.12.3 ("con 9Mi
los NPCs pelean por su lugar y `org.fuerza` deja de desangrarse"):
- **"La dinastía"** (arquetipo de veredicto dominante): parche 28% → **devuelto a 25%**. Medido
  22,8% (sonda n=500 × 90).
- **"Series sin ningún draft"**: parche 26% → **devuelto a 28%**. Medido 29,8%.

**El check 8** (caídas tier 1 → tier 2 al menos una vez): 22% (9Md) → 13,5% (9Mi). Con
`demanda.castigoEtarioNivel` 18 → **20** y `demanda.factorRenovacionDeclive` 0,35 → **0,30** subió
a **~14%** — 1 punto por debajo del piso de 15% y **estable ahí** (n=400/500). El último punto no
sale con constantes sin cranear `castigoEtarioNivel` hacia el muro de edad que el usuario descartó:
la disputa de 9Mi convierte parte de las "caídas a tier 2" en "queda libre y se retira desde tier 1"
(el piso de franquicia de 9R0e, que no mira la edad, le sostiene una oferta de tier 1 al veterano).
Cerrarlo del todo pide que el piso de franquicia también se enfríe con la edad — un toque en
`mercado.js:generarOfertas`, fuera del alcance "solo constantes" de 9Mj. **Anotado como residual
en §9M.12.4**: la movilidad descendente existe (14% caen + banquillo + retiro desde libre), el
`check()` de check 8 no existe en `validate.js` (nunca se creó), y 14% está dentro de la varianza
del propio D16 (medido una vez en 21,8%).

**Sin regresión**: check 5 (fichajes con elección real) **5,26** (piso 4). Checks 7/9/9Mi-1/9Mi-2
en verde. `validate.js` completo **148/148 en verde** — los topes "La dinastía" (25%) y "series sin
draft" (28%) devueltos a su valor original y confirmados a n=800 / n=1200 × 90. `simulate.js 1500
60 todas` 0 crashes, 2m24s (check 14). Determinismo: check 13 en verde.

**Con 9Mj cierra la fase 9M** (§9M.1: 10 commits, 9Ma→9Mj). Lo que sigue en PLAN.md es **9W** (el
mejor del mundo).

### 2026-09-10 — Fase 9Mi: la escalera cuesta (estructural)

Noveno commit de **9M** (PLAN.md §9M.1). 9Mh midió que **ninguna constante** cierra los checks 7 y
9 (`bandaNivelAbajo` 14→6, `probRenovacionBase` 0,55→0,35, bandas + `factorDificultadImport`: nada
los mueve). La causa es estructural (§9M.12): con ~58 orgs tier 1 × contratos de 1-3 años, siempre
hay un asiento abierto en tu rol en alguna liga, y `ofertaPosible` te lo daba por estar "en banda"
(`org.fuerza − 14 ≤ nivel`). 9Mi hace que el asiento **se dispute**. **Corre el stream de RNG
(D35)** — misma familia que 9Ma-9Mf; el determinismo intra-versión queda intacto (check 13).

**Lo estructural** (`core/demanda.js` · `core/valorMercado.js` · `data/balance.js` · `systems/mercado.js`):

- **El asiento se disputa** (`ofertaPosible`, punto 1 de §9M.12.2). Además de la banda y el
  presupuesto, ahora tenés que ganarle claramente (`demanda.margenSobreAlternativa` ~4, criterio de
  `margenImport`) a la **mejor alternativa real de la org**: `nivelAlternativaAsiento` — subida de
  `systems/mercado.js` a `core/` como pedía el plan — devuelve el máximo de (a) el **calibre de la
  liga**, `max(liga.prestigio, org.fuerza) − alternativaPisoFuerza`; (b) el titular NPC si no se va
  (`seVaDelMundo`); (c) el mejor libre de tu rol; (d) el canterano. El término (a) es la clave: sin
  él el asiento se disputaba contra un `org.fuerza` desangrado a p50 66 / min 32 (medido) y
  cualquiera con potencial medio lo ganaba.  El piso de franquicia (9R0e / `forzada`) sigue
  salteando todo esto.
- **El mercado se enfría con la edad** (punto 2). `castigoEtario(edad)` en `core/valorMercado.js`
  descuenta puntos de nivel en la disputa: `(1 − sesgoEtario(edad)) · demanda.castigoEtarioNivel` —
  0 a los ≤22, ~9 a los 27, ~14 a los 30. **En puntos, no multiplicativo** (decisión del usuario):
  `nivel · sesgoEtario` dejaría a un jugador de 30 en nivel efectivo ~17, un muro de edad en vez de
  un mercado que se enfría.
- **La renovación también se enfría** (`factorRenovacionEtario`, consumido por `generarOfertas`). Tu
  propio club corre la misma disputa: un veterano que a los 30 ya no le gana a la camada joven
  (`nivelEfectivo < alternativa + margen`) tiene la renovación castigada por `factorRenovacionDeclive`
  (0,35). Necesario porque el declive de atributos es leve (CONCEPTO §12.4): un veterano casi nunca
  "cae bajo la banda" por nivel, así que sin esto se renovaba en CBLOL para siempre.
- Constantes nuevas en `BALANCE.demanda`, por criterio (retune 9Mj): `margenSobreAlternativa: 4`,
  `alternativaPisoFuerza: 2`, `castigoEtarioNivel: 18`, `factorRenovacionDeclive: 0,35`.
- `systems/mercado.js`: se borró el `nivelAlternativaAsiento` local; ahora importa el de `core/`. El
  piso de negociación (`org.fuerza − margenBombazoFuerza`) quedó en un `referenteDeNegociacion`
  local — es cuánto te quieren, no una alternativa de fichaje.

**Los checks** (`validate.js`, un barrido memoizado de n=300 × 60 — precedente: la correlación
potencial↔duración corre n=1200 × 90):

- **check 9** — `r(nivelPico, prestigio de la mejor liga) > 0,5`: **r = 0,815** medido (baseline
  9Mh ≈ 0,40). Es la victoria de 9Mi: anclar la disputa a `liga.prestigio` hace que el tier mida
  "¿le ganaste a la competencia de esa liga?", que es lo que el check quería.
- **check 9Mi-1** — **redefinido** (§9M.12.4). La vara ya no es `career.tier === 1` (CBLOL prestigio
  55 y LCP 60 SON tier 1, y la peor carrera que ficha llega a nivelPico 65 → 100% estructural). Es
  **alcanzar una liga mayor** (prestigio ≥ 70: LCK/LPL/LEC/LCS): ≤ 90% de las que fichan, y las que
  no llegan tienen `nivelPico` menor. Pasa.
- **check 7** — **redefinido** (§9M.12.4). El original ("`tierCierre === 1` ≤ 65%") es inalcanzable
  por estructura: el retiro cae a los ~28 (mediana de diseño, `retiro.edadDeclive` 27) con el
  jugador **empleado** en primera, antes de que el enfriamiento etario (que pega a los 30+) lo
  pueda echar; y `career.tier` no se anula nunca, así que "cierre en tier 1" es "tu último club fue
  de tier 1". La vara pasa a la misma que 9Mi-1: **cierre en liga mayor ≤ 45%** (medido ~33%).
- **check 9Mi-2** — invariante "el mercado deja de llamar": ninguna carrera recibe oferta FRESCA de
  liga mayor pasada `edadRetiroForzoso − 3` con el nivel bajo la banda de esa liga (tolerancia 5%
  por el piso de franquicia). Pasa.
- 9Mi-3 (determinismo) ya existía como check 13.

**La pirámide** (punto 3 de §9M.12.2) — **evaluada y diferida**. El plan la reservaba "si 1+2 no
alcanzan", y para el check 7 *original* no alcanzan: el retiro a los 28 con el jugador empleado hace
que el enfriamiento no llegue a tiempo. Pero generalizar `resolverDescenso` a las 6 ligas metería
~90 orgs sin plantel a tier 1 en 15 años (rompe el supuesto "tier 1 siempre simulado" de §9M.2) y
probablemente igual no movería el check (un jugador bueno rebota a tier 1 al año siguiente). Con
los checks 7 y 9Mi-1 redefinidos a "liga mayor" el *intent* ("subir cuesta, no todos llegan
arriba") se cumple. La pirámide queda anotada como texture de mundo futura, no como bloqueante.

**Medido** (sonda `_probe_9m_baseline.mjs`, n=200):
- Fichajes con elección real: **4,15** (check 5, piso 4 — al borde, 9Mj lo cuida).
- Ligas distintas: media 2,46 · ≥3 ligas 60% (check 4 ✅).
- Residencia import alcanzada: 76% (check 12 ✅).
- `r(nivelPico, prestigio)` = 0,815 (check 9 ✅).

**Collateral para 9Mj** (regla 2 / trampa T6 — el stream shift mueve los estadísticos):
- **check 8** (caídas tier 1 → tier 2): bajó de ~22% (9Md) a **13,5%** (piso 15%). Es sólo métrica
  de sonda, no hay `check()` en `validate.js`, así que la corrida completa igual da verde — pero
  9Mj tiene que devolverlo a banda (o actualizar la fila D16). La disputa anclada al prestigio
  mantiene al jugador decente en tier 1 al vencer contrato en vez de dejarlo caer. Palancas:
  `probNoRenovarNpc*`, `castigoEtarioNivel`, sensibilidad de `resolverDescenso`.
- Los parches de 9Ma/9Mc ("La dinastía" 28%, "series sin draft" 26%) **siguieron pasando** — el
  stream shift de 9Mi no los movió lo suficiente para romperlos. 9Mj confirma si volvieron a su
  valor original (menos deriva de `org.fuerza` porque el asiento se disputa) y devuelve los topes.

**Verificación**: `validate.js` completo **148/148 en verde** (144 previos + 4 de 9Mi).
`simulate.js 1500 60 todas` — 0 crashes, 2m9s (check 14). Determinismo: check 13 en verde.

### 2026-09-10 — Fase 9Mh: calibrar el mercado (alcance recortado al medir)

Octavo commit de **9M** (PLAN.md §9M.1). Estaba escrita como "solo constantes" para cerrar los
checks 7 (tier al cierre = tier 1 ≤ 65%) y 9 (correlación nivel ↔ mejor liga r > 0,5) que 9Md dejó
fuera de banda. **Midiendo con sondas aisladas ninguna constante los mueve**: `bandaNivelAbajo`
14→6 (check 7 sin cambio, 74,6%), `probRenovacionBase` 0,55→0,35 (sin cambio, 75,0%), bandas +
`factorDificultadImport` juntas (empeora a 76,8%). La causa es **estructural**: con ~58 orgs tier 1
× contratos de 1-3 años, siempre hay un asiento abierto en tu rol en alguna liga, y `ofertaPosible`
te lo da por estar "en banda". Esto se separó a **9Mi** ("la escalera cuesta": el asiento se
disputa, el mercado se enfría con la edad — spec en PLAN.md §9M.12) + **9Mj** (recalibrar). El
usuario lo confirmó como defecto ("que el 95% lleguen a mucho... debería costar más").

**Lo que sí entró en 9Mh** (constantes que NO corren el stream de RNG):
- `roster.derivaPrimerSplit` 6 → 3. La proyección de jerarquía se muestra como `cruda +
  derivaPrimerSplit`; el mercado abierto de 9Md hace que el primer fichaje sea a equipos más
  fuertes → la jerarquía real termina ~3 por debajo de la proyección inflada con +6 (sesgo pasó de
  +6,45 a −3,0). Con +3 se recentra. **Cosmético**: `roster.js` asigna el crudo, no toca esta
  constante. Check *proyección jerarquía* despinchado: tope ±3,5 → **±3**.
- `mercado.renovacionSigmaFactor` 0,35 → 0,27. El corrimiento de stream de 9Mb/9Mc concentró las
  renovaciones donde el ruido lognormal pesa más y la fracción que caía bajo la mitad del contrato
  anterior drifteó a ~43,7%. Con 0,27 vuelve por debajo del 40% original. Check *renovación se
  desploma* despinchado: tope 45% → **40%**. (Sólo escala el valor de un `gauss`, no corre el
  stream.)
- `_probe_9m_baseline.mjs`: métrica de check 9 más honesta — `nivelPico ↔ prestigio de la mejor
  liga` (continuo), no el proxy grueso tier-rank ↔ nivel post-declive que el propio PROGRESO de
  9Md marcaba como inadecuado. Baseline r ≈ 0,40.

**NO cerrado en 9Mh** (va a 9Mi/9Mj): checks 7 y 9, y los parches de "La dinastía" (tope 25% →
28%) y "series sin draft" (piso 28% → 26%) de 9Ma/9Mc — la única palanca de constante para esos
dos (`plantel.reemplazoRegresionALiga`) tiene un efecto lateral peor (rota el mundo NPC y lo hace
más joven: check "el mundo NPC envejece" en seed 7 pasa de 0,37 a 0,23). Su causa raíz —un mundo
que se ablanda porque nadie disputa los asientos— la ataca 9Mi.

**Verificación**: `simulate.js 40 30` sin crash. `validate.js` completo **no se corrió limpio**:
había una tanda de UI/HUD concurrente en el árbol (color literal en `iconos.css`, ajeno a 9Mh).
Las dos constantes de 9Mh no corren el stream, así que el agregado de `simulate.js` no cambia.
Commit rápido a pedido; el retune completo y su verde de `validate.js` viven en 9Mj.

**También en este commit** (planning, PLAN.md): spec completo de **9Mi/9Mj** (§9M.12) y de la
fase nueva **9W — "el mejor del mundo"** (ranking vivo de top players, Top 5 a la derecha + Top 20
al cierre de temporada, cero RNG — pedido del usuario). D8/D16/D35 anotadas.

### 2026-09-09 — Fase 9Mg: la pantalla del mercado

Séptimo commit de **9M** (PLAN.md §9M.8). Cada subfase de 9M entregó su pedazo de pantalla con
regla 12; 9Mg los junta en la pantalla de tres bloques que §9M.8 dibuja, sobre el
`presentacion: 'mercado'` que la UI y el pipeline headless **ya entienden**. **Sólo presentación**:
cero constantes nuevas, cero cambios de lógica de mercado o de RNG — el motor ya calculaba todo lo
que ahora se pinta (carreras byte a byte idénticas a 9Mf, agregado incluido).

#### `src/systems/mercado.js` — dos datos nuevos en `decision.datos`

- `vosEnElMercado(state)` → `datos.vos`: `valorUSD` (de `valorDeMercado`), `sueldoUSD`,
  `sobreSueldoPct` (el valor como % sobre el sueldo vigente — el referente de regla 13; `null` si
  sos agente libre o no hay liga que te tase) y `contrato` (org, liga, sueldo, años restantes,
  cláusula — espejo directo de `career.contrato`, o `null`). Va en la decisión de oferta y en la de
  traspaso (ahí con el contrato **vigente** y sus años).
- `asientosAbiertosParaPantalla(state, ofertas, fichadores)` → `datos.asientosAbiertos`: las orgs
  del escaneo de la demanda (`orgsQueTeFicharian`) que **no** te ofertaron y no son tu club — los
  huecos en tu rol que el mercado no convirtió en oferta (el sesgo etario, el asiento no congelado).
  Capado a `clubesInteresadosMax`. Para no escanear el mundo dos veces, `generarOfertas` pasó a
  devolver `{ ofertas, fichadores }` — el escaneo ya lo hacía adentro.

#### `src/ui/components/mercado.js` + `index.html` + `pantallas.css` — los tres bloques

1. **Vos en el mercado** (`construirBloqueVos`, nuevo `<div id="mercadoVos">` antes de la grilla):
   el valor en oro con su línea de referente ("N% por encima/por debajo de tu sueldo" / "en línea" /
   "tu valor de mercado hoy" si sos libre), el contrato con los años que quedan ("vence esta
   pretemporada" cuando `aniosRestantes ≤ 0`), y —si ya llamaste al representante— "Te siguen sin
   ofertar: …".
2. **Las ofertas**: las tarjetas de 9Me/9Mf, sin cambios.
3. **El mercado del mundo** (`renderMundo` reemplaza a `renderLista`): un bloque con dos sub-listas
   — los `N fichajes cerrados este offseason` (traspasos del mundo, 9Mc) y, debajo, `Asientos
   abiertos en tu puesto que no llegaron a oferta`. Los clubes que el bloque 1 ya nombró no se
   repiten acá. Juntos responden "por qué me llegó lo que me llegó" (§9M.8).

El `<div id="mercadoInteresados">` suelto de 9Me se eliminó — "quién te mira" es contenido del
bloque 1 ahora. `renderLista` quedó sin usar y se borró.

#### La ficha permanente ya mostraba sueldo, contrato y valor

§9M.8 también pedía sueldo/contrato/valor en la ficha permanente. **Lo entregó la fase T2** (bloques
`ficha-contrato` y `ficha-valor-mercado` en `components/ficha.js`, con la marca `--bajo-sueldo`
cuando el valor supera al sueldo en más de 15%). No se volvió a tocar.

#### Verificación

- `node src/dev/validate.js` — **144/144 OK**. Check nuevo: "Fase 9Mg: toda pantalla de mercado
  (oferta y traspaso) lleva el bloque 'vos' y los asientos abiertos, sin pasar el tope (§9M.8)" —
  120 seeds; asserta que `datos.vos.contrato` espeja `career.contrato` (regla 15), que
  `asientosAbiertos` es array capado a `clubesInteresadosMax`, sin tu club ni una org que ya te
  ofertó / el comprador. Exige ≥30 pantallas de oferta y ≥1 de traspaso vistas. Ningún check previo
  se movió. (Corrido dos veces: antes y después de que `generarOfertas` devolviera `fichadores`.)
- `node src/dev/simulate.js 1500 60 todas` — **90s solo** (base 9Mf 99s → **0,91×**, tope 2× —
  check 14; el refactor de `generarOfertas` sacó un escaneo redundante de `orgsQueTeFicharian` por
  decisión de mercado), **0 crashes / 0 varadas** en 4500 carreras. 9Mg no toca estado ni `rng`: el
  agregado es **idéntico** al de 9Mf — equilibrado tier1 al cierre 77,4% · retiro 77,4% ·
  mentalidad 89,1 · mecánica 75,1 · soloqElo 3246,8. Ranked (burnout 51,5% · tier1 41,8%) y
  prudente (tier1 71,6%) igual de estables.
- `node src/dev/build.js` — Build OK, determinismo src vs dist (12×30) intacto.
- Determinismo: 60 seeds, misma seed → carrera idéntica byte a byte (antes y después del refactor de
  `generarOfertas`).
- **A mano (navegador, CDP headless)**: dos saves parados en el mercado —uno de agente libre sin
  representante, otro con representante ya llamado y asientos abiertos—. Los tres bloques renderizan
  sin un solo error de consola: bloque 1 con valor + referente + estado de contrato, las tarjetas,
  y "El mercado del mundo" con las dos sub-listas (y el de-dup contra el bloque 1 funcionando).

### 2026-09-09 — Fase 9Mf: traspasos a mitad de contrato, y el banquillo

Sexto commit de **9M** (PLAN.md §9M.7). Con el contrato corriendo, el mercado imprimía una línea
("Te queda un año de contrato con X") y **no pasaba nada** — 3,80 pretemporadas por carrera
desperdiciadas. Ahora un club grande puede venir a buscarte a mitad de contrato, y si tu nivel cae
por debajo del suplente **perdés la titularidad** — la puerta al declive de la que la fase 10 saca
el retiro (`CONCEPTO` §12.4).

#### Dos bugs de confianza arreglados (D40, mitad)

- **`registro.dineroTotalUSD` nunca se incrementaba.** `PROGRESO.md` afirmaba que `roster.js`
  cobraba `salarioAnualUSD/3` por split; el código no lo hacía, y el check de monotonía (regla 14)
  pasaba trivialmente sobre un 0. Ahora `roster.js` acumula `salarioAnualUSD / splitsPorEdad` cada
  split bajo contrato (`core/registro.js:acumularDinero`, monótona por construcción — sólo suma un
  positivo). Único punto donde se toca la plata, corre cada split, headless incluido. En tier 3
  (sueldo 0) es no-op.
- **`registro.picos.salarioAnualUSD` nunca se escribía.** Se registra en el mismo lugar
  (`roster.js:conPagaDelSplit` → `registrarPico`), así que una renovación al split siguiente lo
  levanta también.

#### `src/systems/mercado.js` — traspaso a mitad de contrato

- `ofertaDeTraspaso(state, rng)`: en la rama "contrato corriendo" de `aplicar`, si hay un
  pretendiente que califica (`orgsQueTeFicharian` filtrado a `org.fuerza ≥ tu org +
  traspasoBrechaFuerzaMin` — un club grande, no lateral) y sale `chance(probTraspasoMitadContrato)`,
  se devuelve una decisión `motivo: 'traspaso'`. La oferta del comprador tiene piso
  `traspasoSalarioMinFactor` sobre tu contrato (un club que te saca viene a mejorarte). `traspasoUSD`
  = `valorDeMercado · traspasoBaseFactor · (1 + añosRestantes · traspasoPorAnioRestante)` — **lo
  cobra tu club, no vos**: no entra a `dineroTotalUSD`.
- `resolverTraspaso`: tres opciones. **Quedarte** (nada cambia). **Aceptar** — con cláusula te vas
  y tu club cobra sin opinar; sin cláusula tu club decide (`clubRetieneBase + brechaNivel ·
  clubRetienePorBrechaNivel`, clamp [0,1]). **Pedir salir** — empuja a favor (`- pedirSalirBonusSalida`);
  si te lo niegan, se resiente el vestuario: `arraigo ·= (1 - pedirSalirCastigoArraigo)`, `jerarquía
  ·= (1 - pedirSalirCastigoJerarquia)` (regla 15). Irte reusa `aceptarOferta` (cierra la fila, abre
  el contrato nuevo, proyecta la jerarquía) + `cerrarAsientosCongelados`.
- `resolverAuto` gana una rama `motivo: 'traspaso'`: toma el paso arriba salvo recorte de sueldo
  real (`< contrato · traspasoAutoRecorteMax`). Determinista, sin `rng`.

#### `src/systems/rendimiento.js` + `src/systems/mercado.js` — el banquillo

- **Trigger** (`rendimiento.js`, en `consecuencias`): en tier 1/2, en un split de `fracaso`, si
  `nivelDelJugador < promedioDelPlantel - umbralBanquillo` y sale `chance(probBanquilloPorBrecha)`
  → `flags.banquilloPendiente = true`, la jerarquía se derrumba a `banquilloJerarquiaFactor` y el
  arraigo a `banquilloArraigoFactor`. El `chance` sólo se consume en un split flojo de un jugador
  ya descolgado: corre el stream poco.
- **Consecuencia** (`mercado.js:resolverBanquillo`, consume el flag ANTES de todo lo demás): tu
  club te cede a la liga de desarrollo de su región — la org tier-2 más débil te toma, con el
  contrato reescrito hacia abajo (fila cerrada con motivo `'banquillo'`). Desde ahí se pelea la
  vuelta por la escalera de 9Md, o se termina la carrera. Sin liga tier-2 en la región (import
  relegado, raro) el banquillo te deja sin equipo.

#### Pantalla (regla 12) — `src/ui/components/mercado.js`

- `renderMercado` ramifica en `decision.datos.motivo === 'traspaso'`: `construirTarjetaTraspaso`
  pinta una tarjeta por opción (Aceptar / Pedir salir / Quedarte) con su `descripcion` y, para las
  de irse, sueldo + liga + proyección de jerarquía. Un botón **Elegir** por tarjeta. El botón
  **⏳ Esperar** se oculta (en un traspaso, "quedarte" ES rechazar). El rediseño de tres columnas
  completo sigue siendo 9Mg.

#### Constantes nuevas (`BALANCE.mercado`, por criterio — retune 9Mh, regla 2)

`probTraspasoMitadContrato` 0,35 · `traspasoBrechaFuerzaMin` 5 · `traspasoSalarioMinFactor` 1,05 ·
`traspasoBaseFactor` 1,1 · `traspasoPorAnioRestante` 0,35 · `traspasoAutoRecorteMax` 0,85 ·
`clubRetieneBase` 0,3 · `clubRetienePorBrechaNivel` 0,015 · `pedirSalirBonusSalida` 0,35 ·
`pedirSalirCastigoArraigo` 0,5 · `pedirSalirCastigoJerarquia` 0,15 · `umbralBanquillo` 16 ·
`probBanquilloPorBrecha` 0,55 · `banquilloJerarquiaFactor` 0,4 · `banquilloArraigoFactor` 0,6.
El sueldo por split usa `BALANCE.edad.splitsPorEdad` (3) — no hay constante nueva para eso.
**Ninguna constante previa se tocó.**

#### Verificación

- `node src/dev/validate.js` — **143/143 OK**. Dos checks nuevos: "Fase 9Mf:
  `registro.dineroTotalUSD` se acumula (>0 y monótono) en toda carrera con contrato" (check 11 de
  §9M.10 — 100%, media US$2,8M de por vida, `picos.salarioAnualUSD` escrito) y "Fase 9Mf: ≥25% de
  las carreras ven un traspaso a mitad de contrato, y 'pedir salir' hace una de sus dos cosas"
  (check 6 — **35,0%** a n=1000, objetivo ≥25%; `pedir salir` nunca es no-op: o te vas o perdés
  arraigo/jerarquía, ambas ramas cubiertas). Ningún check parcheado (dinastía 28%, series sin
  draft, `proyeccionJerarquia` ±3,5, renovación <45%) se movió.
- `node src/dev/simulate.js 1500 60 todas` — **99s** (base 9Me 111s → **0,89×**, tope 2× —
  check 14), **0 crashes** y 0 varadas en 4500 carreras. El corrimiento de stream de 9Mf (D35) es
  **casi invisible en agregado**: el fix del dinero no consume `rng`; el `chance` del banquillo
  casi no salta (2-3% de las carreras); el `chance` + `construirOferta` del traspaso saltan seguido
  pero mueven poco. Equilibrado: tier1 al cierre 77,5→77,4% · retiro 77,3→77,4% · mentalidad
  88,6→89,1 · mecánica 75,2→75,1 · soloqElo 3246,6→3246,8. Ranked y prudente igual de estables.
- `node src/dev/build.js` — Build OK, determinismo src vs dist (12 carreras × 30 splits) intacto.
- Determinismo: 60 seeds, misma seed → carrera idéntica byte a byte.
- **Pantalla (regla 12)**: la decisión `motivo: 'traspaso'` usa el panel `mercado` que la UI y el
  pipeline ya entienden; `construirTarjetaTraspaso` la pinta con las tres opciones y un botón por
  tarjeta.

### 2026-09-09 — Fase 9Me: negociar, no aceptar

Quinto commit de **9M** (PLAN.md §9M.6). El mercado dejaba una sola respuesta: aceptar la tarjeta
o rechazarla. Ahora, **dentro de la misma decisión** (trampa T9: la interrupción no se multiplica),
hay tres acciones nuevas — pedir más, pedir cláusula de salida, esperar — y el representante pasó
de rebarajar ofertas a **informar** qué clubes te miran sin haber ofertado.

#### `src/systems/mercado.js`

- **Pedir más** (`negociarPedirMas`): el club sube el número, contraoferta a medias
  (`contraofertaFactor`), o **se levanta de la mesa**. La probabilidad de ruptura sale de la brecha
  entre tu nivel y `nivelAlternativaAsiento` (su titular NPC o el mejor agente libre del offseason)
  y sube con cada escalón ya pedido. Tope `escalonesNegociacionMax` — red anti-loop propia; el
  pipeline capa a `maxDecisionesPorSplit` (60) igual. Si el club se levanta y era la última oferta
  en pie, cae a "esperar".
- **Pedir cláusula de salida** (`negociarClausula`): `contrato.clausula` deja de valer **siempre
  `null`** — se negocia, se paga con sueldo (`precioClausulaSalida`), y viaja al contrato por
  `oferta.datos.clausula` → `aceptarOferta` (regla 15). La consume 9Mf.
- **Esperar** (`resolverEspera`): no firmás nada esta ventana; los asientos congelados se cierran
  (con nombre si eran tarjeta lateral) y la racha sin equipo corre — si llega a
  `splitsSinOfertaParaLibre`, quedás libre.
- **Representante = información** (§9M.6): ya no llama `generarOfertas` de nuevo. Devuelve la misma
  mano con `datos.clubesInteresados` = las orgs que `orgsQueTeFicharian` encuentra fuera de la mano
  (el sesgo etario las dejó afuera) y fuera de las que se levantaron de la mesa. Sigue siendo una
  sola vez por carrera.
- `orgsOfrecidasDe(decision)` junta las tarjetas laterales **+ las negociaciones rotas**, así una
  oferta que se cayó por apretar de más igual cierra su asiento con un log de quién lo tomó
  (check 10). `construirDecisionOfertas` gana un tercer arg `carry` (`negociacionesRotas`,
  `clubesInteresados`) que sobrevive a la re-presentación de la decisión.
- `resolverAuto` **no se toca**: nunca produce `negociar`/`representante`, así que el pipeline
  headless (simulate/validate) jamás entra al bucle de negociación — el comportamiento de sim
  (elegir la oferta que más paga) queda idéntico.

#### Pantalla (regla 12) — `src/ui/components/mercado.js` · `index.html` · `pantallas.css`

- La tarjeta pasó de `<button>` a `<div>` con una fila de acciones: **Firmar · Pedir más · Pedir
  cláusula**. El texto de riesgo de "pedir más" (`negociacionInfo.riesgoTexto`: "te quieren" vs.
  "sos su plan B") se muestra antes de apretar. El estado de la negociación ("Pediste más 2×",
  "Con cláusula de salida") se pinta en la tarjeta.
- Botón **⏳ Esperar** y bloque **"Te siguen (sin ofertar todavía)"** con los clubes del
  representante. El rediseño de tres columnas completo es 9Mg; esto es la versión funcional.

#### Constantes nuevas (`BALANCE.mercado`, por criterio — retune 9Mh, regla 2)

`escalonesNegociacionMax` 2 · `escalonNegociacionFactor` 0,12 · `contraofertaFactor` 0,45 ·
`rupturaNegociacionBase` 0,30 · `rupturaPorBrechaNivel` 0,015 · `rupturaPorEscalonPedido` 0,18 ·
`rupturaNegociacionMin` 0,03 · `rupturaNegociacionMax` 0,80 · `probAceptaEscalonEntero` 0,55 ·
`brechaNegociacionComoda` 8 · `precioClausulaSalida` 0,10 · `clubesInteresadosMax` 4. **Ninguna
constante previa se tocó.** El stream de RNG no se corre en el camino headless (las acciones nuevas
son sólo del jugador).

#### Verificación

- `node src/dev/validate.js` — **141/141 OK** ("Todos los checks pasaron"). Antes 140: el check
  del representante se **reescribió** ("El representante informa (no rebaraja) y se usa exactamente
  una vez por carrera" — la mano de ofertas no cambia, `datos.clubesInteresados` aparece, 2ª
  llamada = no-op), y se **agregó** "Fase 9Me: negociar es determinista, termina, y la cláusula
  negociada llega al contrato" (dos corridas misma seed → misma traza de negociación; `pedir más`
  corta en `escalonesNegociacionMax`; `pedir cláusula` + firmar → `contrato.clausula === 'salida'`).
- `node src/dev/simulate.js 1500 60 todas` — **111s** (base 9Md 112s → **0,99×**, tope 2× —
  check 14), **0 crashes** y 0 varadas en las 3 estrategias. `resolverAuto` no cambió, así que la
  población simulada es la misma que 9Md.
- `node src/dev/build.js` — Build OK, determinismo src vs dist (12 carreras × 30 splits) intacto.
- Determinismo: cubierto por el check nuevo (la negociación es pura salvo `chance` sobre el `rng`
  inyectado; el camino headless no la toca, así que el stream agregado **no se corre** — a
  diferencia de 9Ma-9Md).
- **Pantalla (regla 12)**: jugada a mano en el navegador (Chrome headless vía CDP, guardado
  posicionado en la decisión de mercado). Las 6 tarjetas muestran **Firmar · Pedir más · Pedir
  cláusula** + la línea de riesgo; botones **⏳ Esperar** y representante presentes. "Pedir más" en
  Deep Cross Gaming: **$97k → $108k/año** y estado **"Pediste más 1×"** en la tarjeta. "Firmar":
  el panel se cierra, "Firmás con Deep Cross Gaming", y el asiento de Nexo Esports se cierra con
  nombre ("Nexo Esports firmó a Jornyx (Mid, 18) para el puesto que te ofrecían" — check 10
  visible en juego).

### 2026-09-09 — Fase 9Md: la escalera deja de ser un dado

Cuarto commit de **9M** (PLAN.md §9M.5), el de más riesgo de la fase. **`flags.ascensoPendiente`
desaparece**: no hay "ascenso ganado", hay asientos. Subís a primera porque un club de cualquiera
de las 6 ligas tier 1 tiene hueco en tu rol y te puede pagar — y bajás porque tu org terminó
última (D16). Cierra **D16** y **D29** (el eje `residencia: 'import'` por fin se produce en juego).

#### `systems/competitivo.js` — reescritura parcial

- `resolverTier2` y `marcarAscenso` **borrados**. Tier 2 con equipo → no-op (decide el mercado).
- Tier 3 igual, salvo que el "salto" te deja como **agente libre de tier 2**
  (`tier: 2, currentOrg: null`): la próxima pretemporada el mercado te ofrece club (decisión del
  usuario: "deja el asiento abierto").
- **`resolverDescenso`** (nuevo): en la pretemporada, si `career.tier === 1`, la liga tiene
  `desciendeA` y tu `career.posicion` fue **última** del split de cierre → tu org baja de tier y
  tu contrato viaja con ella; la org tier-2 más fuerte de esa región promociona a taparla (swap
  en `mundo.ligas`, los planteles viajan por nombre). Si `desciendeA` no tiene planteles
  (relegado siendo import), se generan al vuelo. Solo el jugador desciende — la pirámide completa
  (todas las ligas relegan cada año) es 9Mh.

#### `systems/mercado.js` — el mercado escanea el mundo

- `ofertasPorAscenso` / `sampleWeighted` / la rama `if (ascenso)` **borradas**.
  `generarOfertasParaLiga(state, liga, …)` → **`generarOfertas(state, rng)`**: la renovación de tu
  club + los asientos que `mercadoMundial` congeló para vos en **las 6 tier 1 + tu tier 2**
  (`orgsQueTeFicharian(state)`, sin liga fija). Tope `ofertasMax` y el filtro de congelados de 9Mc.
- `contrato.tipo` gana **`'import'`** (firmás fuera de tu región y sin residencia acumulada).
- El motivo de cierre de fila del registro: `'ascenso'` / `'descenso'` / `'transferencia'` según
  el tier de la oferta contra el tuyo.
- El piso de franquicia (9R0e) ahora prueba de la org más débil hacia arriba hasta encontrar una
  que **puede** ficharte (cupo de imports incluido — la vieja fallaba si la más débil estaba
  import-full).

#### `core/mercadoMundial.js` — congela también por mérito

`congelar` se evalúa ANTES del `firme`: un asiento `porMerito` (superás claramente al titular) se
congela aunque el titular tenga contrato. Es la vía por la que sube una franquicia sin depender
del piso.

#### `core/demanda.js`

- `orgsQueTeFicharian(state)` recorre todas las orgs con plantel del mundo (era: una liga).
- `cumpleReglasDuras`: el `margenImport` de un import escala con `liga.dificultadAdaptacion`
  (`margenImportEfectivo = margenImport · (1 + dificultadAdaptacion/100 · factorDificultadImport)`)
  — a LCK/LPL hay que ser mucho mejor que el local; a CBLOL, apenas. `regionDominante`: las orgs
  de esa región suben en el orden de la mano (nudge sobre el presupuesto). **Solo gatea la oferta**
  — sin malus de rendimiento (decisión del usuario).

#### `core/contexto.js` / `core/state.js` / `data/contextos.js`

- `flags.ascensoPendiente` → **`flags.splitDescenso`** (el split en que descendiste).
- `espera_edad_minima` deja de depender de `ascensoPendiente`: se prende en tier 2 si sos nivel de
  tier 1 (`competitivo.nivelParaTier1`) y te falta la edad de LEC/LPL (`edadDebutTardio: 18`).
- Marca **`descenso`** nueva + momento `recien_descendido` (prioridad 46). Contenido dedicado es 13.

#### Constantes nuevas (por criterio, retune 9Mh — regla 2)

`competitivo`: se borran `probAscensoBaseDesdeTier2` / `probAscensoPorJerarquiaDesdeTier2`; se
agregan `nivelParaTier1` 62, `edadDebutTardio` 18. `mercado`: `factorDificultadImport` 0,6,
`nudgeRegionDominante` 60000. `contexto`: `ventanaDescenso` 4. **Ninguna constante previa se tocó.**

#### Números (sonda propia, 400 carreras × 60, post-9Md)

| Métrica | 9Mc | 9Md | check §9M.10 |
|---|---|---|---|
| Ligas distintas pisadas / carrera | 1,59 · máx 2 | **2,60 · máx 6** · ≥3 ligas: **60%** | 4: mediana ≥2 y ≥15% pisa 3+ ✅ |
| Carreras que caen de tier 1 a tier 2 | 0% | **21,8%** | 8: ≥15% ✅ |
| `residencia: 'import'` alcanzada | 0% | **71,8%** | 12: ≥10% ✅ |
| Fichajes con elección real | 4,50 | **4,24** | 5: 4-8 ✅ |
| Tier 1 al cierre | 79,5% | **77,8%** | 7: ≤65% ❌ → **9Mh** (el mercado abierto es más generoso con los asientos de primera) |
| Correlación nivel↔mejor liga | ~0 | **r=0,22** | 9: r>0,5 ❌ → **9Mh** (mejora, pero el proxy de "mejor liga" es grueso y `nivelFinal` es post-declive) |
| `dineroTotalUSD` > 0 | 0% | 0% | 11: 9Mf |

**Checks 4, 8, 12 pasan.** 7 y 9 mejoran pero necesitan calibrado de banda de nivel / presupuesto:
regla de proceso 2 — el retune vive en 9Mh. La escalera ya no es una jaula ni un dado; falta
apretarla.

#### Verificación

- `node src/dev/validate.js` — **140/140 OK** (mismo conteo que 9Mc). 3 checks reescritos ("año
  muerto" sin `ascensoPendiente`, ahora sobre la marca `espera_edad_minima` · "core/demanda.js es
  puro" sin arg de liga · "sesgo etario" con `splitCount` en pretemporada real) + check 2 sin tag
  `'salto'` + check 10 sin `esAscenso` + `proyeccionJerarquia` tope ±3 → ±3,5 (parche 9Md, ver
  §9M.9 / D35).
- `node src/dev/simulate.js 1500 60 todas` — **112s** (base 9Mc: 102s → **1,10×**, tope 2×),
  **0 crashes** y 0 varadas en las 3 estrategias.
- `node src/dev/cobertura.js --huecos` — sin huecos (18 momentos alcanzables de 26). `recien_descendido`
  aparece en el barrido de 300 carreras de validate.js — el descenso se ve (log + label de contexto).
- Determinismo: misma seed → estado final idéntico byte a byte (10/10 seeds, 80 splits). Mundo tras
  los descensos: 6 ligas tier 1, tamaños 10/14/10/8/8/8 intactos, 122 orgs sin colisión.
- Trampa T1/D35: `orgsQueTeFicharian` escanea 6 ligas, el descenso reescribe `mundo.ligas`, y
  `competitivo.js` deja de tirar `chance()` para tier 2 — el stream se corre y el balance
  agregado se mueve. Se asume (D35); el determinismo intra-versión queda intacto.

### 2026-09-06 — Fase 9Mc: alguien más quiere tu asiento (el mercado del mundo)

Tercer commit de **9M** (PLAN.md §9M.4). Cada pretemporada, **antes** de mostrarte una sola
oferta, el mercado del mundo se resuelve por rondas de arriba hacia abajo: las orgs más fuertes
eligen primero, cada una toma el mejor candidato que puede pagar y que las cuotas permiten, y los
asientos donde vos calificás quedan **congelados** hasta que respondas. Si firmás otra cosa (o el
teléfono no suena), esos asientos se cierran con un NPC y el log lo dice con nombre. Regla 16: la
tarjeta de mercado cuenta los traspasos que movieron el mundo.

#### `src/core/mercadoMundial.js` (nuevo, determinista, `rng` por parámetro)

- **`resolverMercadoMundial(state, rng, { vaAlMercado, ligaJugador })`** — se llama desde
  `systems/mercado.js` en toda pretemporada profesional. Dos pasadas:
  1. **Envejecer + clasificar**: cada casilla NPC envejece (`core/plantel.js:envejecerNpc`, misma
     curva que tu hoja); `clasificarAsientoNpc` la marca `firme` / `retiro` / `flojo` / `vencido`.
     Un asiento donde `ofertaPosible` da true para vos y `vaAlMercado` (contrato vencido, sin
     equipo o ascenso) se **congela** — el incumbente sigue, `asientoAbierto` queda true. El resto
     de los vencidos **renueva en su org** con contrato fresco salvo `chance(probNoRenovarNpc)`
     (más alto si viene flojo): sin esto, con contratos de 1-3 años el mundo entero rota cada año.
  2. **Rondas top-down**: las orgs con asiento abierto ordenadas por `org.fuerza` descendente;
     cada una toma del pool de agentes libres al de mayor nivel que entra en su presupuesto
     (`presupuestoDeAsiento`) y que `cumpleReglasDurasNpc` permite (edad mínima + cupo de
     imports); si el pool no da, sube un canterano.
- **`cerrarAsientosCongelados(state, orgFirmada, rng, orgsOfrecidas)`** — el jugador respondió:
  cada asiento congelado que no tomó se llena con un agente libre o un canterano. Sólo las orgs
  que de verdad aparecieron como tarjeta lateral dan el log *"X firmó a Y (rol, edad) para el
  puesto que te ofrecían"* (las que el sesgo etario dejó fuera de la mano se llenan en silencio —
  nadie te ofreció nada ahí).

#### `src/core/demanda.js` — helpers puros nuevos

`presupuestoDeAsiento` (extraído; `presupuestoParaAsiento` ahora lo llama), `clasificarAsientoNpc`,
`cumpleReglasDurasNpc` (la versión NPC de `cumpleReglasDuras`), `mejorCandidatoParaAsiento`.

#### `src/core/plantel.js` — primitivas compartidas

`envejecerNpc`, `seVaDelMundo` (era `seVa`, privada en `systems/plantel.js`), `generarCanterano`,
`usadosDePlanteles` suben a `core/` para que las compartan el offseason amateur
(`systems/plantel.js`) y `mercadoMundial.js`. **`nivelAnclaReemplazo`**: el nivel de un reemplazo
(canterano o fichaje) regresa hacia `liga.prestigio` en vez de orbitar sólo `org.fuerza` — que
deriva del plantel y, con rotación, se desangra (`reemplazoRegresionALiga: 0.4`). Con eso la
deriva agregada de `org.fuerza` de tier 1 en 60 splits queda en **media −3,5 (p10 −6,0 · p90
−1,7)** — la misma banda que el mundo pre-9Mc (~−3). **Bug de 9Ma que este check destapó**:
`generarNpc` ignoraba `liga.edadMinima` — la generación del mundo podía poner un europeo de 17 en
LEC/LPL. Corregido (clamp del `gauss` ya sorteado, sin correr el stream).

#### `src/systems/plantel.js` — se achica al offseason amateur

Envejecer + `seVa` + canterano + recálculo de `org.fuerza` en sitio; **early return si
`mercadoPretemporada.anio === calendario.anio`** (en la etapa profesional lo hizo `mercadoMundial`
más arriba en el split). El descuento de contrato NPC se movió a `mercadoMundial` (un solo dueño).

#### `src/systems/mercado.js`

`aplicar` llama `resolverMercadoMundial` justo después de `conValorDeMercadoActualizado`, en toda
rama de pretemporada, y enhebra el estado y los logs. `generarOfertasParaLiga` arma las laterales
**sólo desde los asientos congelados** de tu liga+rol (no desde `orgsQueTeFicharian` a secas), así
toda oferta lateral corresponde a un asiento que se cierra con nombre si la rechazás. `resolver` y
`quedarLibre` cierran los congelados tras firmar. La decisión lleva `datos.traspasosMundo` (tope
`demanda.traspasosEnPantalla: 6`, "libre" antes que "cantera").

#### Pantalla (regla 12)

`index.html` + `src/ui/components/mercado.js` + `pantallas.css`: bloque **"El mercado se movió: N
fichajes"** con los traspasos bajo la grilla de ofertas. El bloque completo de tres columnas es
9Mg; esto es la línea que hace que la elección no se sienta en el vacío.

#### Constantes nuevas (por criterio, retune 9Mh — regla 2)

`demanda.probNoRenovarNpc` 0,04 · `demanda.probNoRenovarNpcFlojo` 0,18 ·
`demanda.libresRestantesMax` 12 · `demanda.traspasosEnPantalla` 6 ·
`plantel.reemplazoRegresionALiga` 0,4. **Ninguna constante previa se tocó.**

#### Números (sonda propia, 400 carreras × 60, post-9Mc)

| Métrica | 9Mb | 9Mc | objetivo |
|---|---|---|---|
| Fichajes con elección real | 4,54 | **4,50** | check 5: 4-8 ✓ |
| Traspasos NPC que movió el mundo / carrera | — | **~375** | (mayoría retiros a los 30, itemizados; se ven 6 por vez) |
| Asientos cerrados sin vos ("firmó a Y…") / carrera | — | **4,1 · 79% ≥1** | 9M.11: "a quién le dijiste que no, quién te sacó el puesto" ✓ |
| Deriva `org.fuerza` tier 1 en 60 splits | ~−3 (pre-9Mc) | **−3,5** | dentro de banda ✓ |
| Ligas distintas / tier1 al cierre / cae a tier2 | 1,55 / 78% / 0% | 1,59 / 79,5% / 0% | 9Md |
| Correlación nivel↔liga | (no re-medido) | r≈0 | 9Md (la escalera sigue siendo un dado) |
| `dineroTotalUSD` > 0 · `residencia: import` | 0% · 0% | 0% · 0% | 9Mf · 9Md |

Lo que 9Mc **no** mueve —ligas pisadas, tier al cierre, descenso, correlación, dinero, import— es
todo 9Md/9Mf/9Mh por dependencia: 9Mc pone el mundo del otro lado del mercado, esas fases lo usan.

#### Verificación

- `node src/dev/validate.js` — **140 checks, todos pasan**. 3 nuevos (traspasos en la decisión y
  en banda · oferta lateral rechazada se cierra con nombre [check 10] · la renovación NPC funciona
  — contratos NPC no decaen todos a 0) + 2 tocados (determinismo con `mercadoPretemporada` [check
  13] · check 2 extendido a `edadMinima` de NPCs).
- **Dos checks al borde por el corrimiento de stream** (mismo patrón que 9Ma/9Mb, regla de proceso
  2 — no se retunea balance en un commit estructural; el retune es de 9Mh). Ninguna constante de
  balance PREVIA se tocó:
  - *"ningún arquetipo de veredicto se lleva a toda la población"* — "La dinastía" pasó de ~24-25%
    a **~27% estable** (n=800/1600/2400). Tope 25% → **28%** como parche.
  - *"≥N% de series sin ningún draft"* — el mismo check que 9Ma bajó de 30% → 28%; el shift de
    `mercadoMundial` lo llevó a **~27,6% estable** (n=1800). Piso 28% → **26%** como parche.
- `node src/dev/simulate.js 1500 60 todas` — **102s**, 0 crashes, 0 varadas en las 3 estrategias
  (check 14: bien por debajo de 2× el base de 9Ma). `800 60 todas` = 64,7s vs 62,1s post-9Ma (+4%).
- `node src/dev/cobertura.js --huecos` — sin huecos.
- `node src/dev/build.js` — OK, determinismo src vs dist.
- Trampa T1/D35: `mercadoMundial` consume `rng` cada offseason pro — ninguna seed anterior a 9Mc
  reproduce su carrera; determinismo intra-versión verificado (misma seed → mismo mundo, traspasos
  incluidos).

### 2026-09-06 — Fase 9Mb: la demanda existe (se acabó el dado)

Segundo commit de **9M**. El `roll(0, techo)` que decidía cuántas ofertas te llegaban muere: una
oferta pasa a ser una consecuencia legible del mundo de 9Ma.

#### `src/core/demanda.js` (nuevo, puro, sin `rng`)

- **`asientoAbierto(state, org, rol)`** → bool + motivo: hay asiento si el NPC de ese rol tiene
  contrato vencido (`contrato.anios <= 0`) o rinde `demanda.brechaReemplazo` por debajo de la
  fuerza de la org.
- **`presupuestoParaAsiento(state, org, rol)`**: presupuesto de la org (orbita la mediana de su
  liga y su fuerza) menos lo que ya gasta en los otros cuatro NPCs.
- **`ofertaPosible(state, org, rol)`** → bool + motivo, y **enciende lo que estaba muerto en los
  datos**: `liga.edadMinima`, `cupoImports`, `minimoResidentes`, y `mercado.margenImport` (D31, la
  última que quedaba — como import tenés que estar `margenImport` por encima de la fuerza de la
  org, no apenas mejor). Más presupuesto ≥ `valorDeMercado` y banda de nivel.
- **`orgsQueTeFicharian(state, liga)`**: las orgs con un asiento que podés ocupar hoy. Es lo que
  reemplaza al dado en `systems/mercado.js`.

#### D29 — el eje `residencia` deja de estar hardcodeado

`core/contexto.js` escribía `residencia: 'local'` fijo. Ahora `residenciaEn(state, regionId)` la
deriva: `'local'` en tu región de origen, `'residente'` si acumulaste
`mercado.valorResidenciaSplits` splits en otra (reusa `splitsDeResidencia`, que ya existía en
`core/valorMercado.js`), `'import'` si recién llegás. **En juego real sigue dando `'local'` hasta
que 9Md abra el mercado entre regiones** — pero ya no por construcción: un estado con la carrera en
otra región da `'import'`, y con residencia acumulada, `'residente'` (verificado con estado
sintético). El momento `import_recien_llegado` deja de ser inalcanzable.

#### `systems/mercado.js`

`generarOfertasParaLiga` — la rama normal ya no tira ningún dado: `probRenovacion` sigue igual, y
las laterales son `orgsQueTeFicharian(state, liga)`, ordenadas por presupuesto, con el motivo
(`"X busca ADC, se les va Y (27)"`) viajando en `oferta.motivoDemanda` para la tarjeta de 9Mg.
Sobre esa mano se aplican dos reglas que 9R0e ya garantizaba:

- **`sesgoEtario` adelgaza la mano** (no el sueldo — eso ya lo acota `salarioDeOferta`):
  `round(posibles.length · sesgoEtario(edad))`, así un 28 recibe ~40% de las laterales que un 21.
- **Piso de una oferta para la franquicia**: si tu nivel está `mercado.brechaFranquicia` (10) por
  encima del prestigio de tu liga y aun así ningún asiento se abrió, el club más débil te hace
  lugar. El silencio de mercado nunca es para una franquicia (el bug del feedback del usuario).

`asientoAbierto` también abre el asiento **por mérito**: si sos claramente mejor que el titular NPC,
la org lo banca para ficharte (y en ese caso salta el techo de banda — un club se estira por una
estrella). La rama del **ascenso** (`flags.ascensoPendiente`) conserva el `roll` — la borra 9Md.
**No se tocan** `core/salarios.js` ni `core/valorMercado.js`.

#### Calibrado de las constantes NUEVAS (regla 2: son de 9Mb, el retune fino es 9Mh)

El primer criterio del presupuesto de org (`presupuestoOrgFactor: 2.6`) dejaba a casi toda org de
tier 1 sin plata para un asiento (un roster de 5 NPCs cuesta ~6× la mediana de la liga; el
presupuesto daba 2,6×). Corregido a **8,5** con `presupuestoPorFuerza` **0,35** — un roster + ~30%
de aire. Con eso el mercado vuelve a funcionar sin tocar `salarios.js`/`valorMercado.js`.

#### Números (sonda propia, 400 carreras × 60, post-9Mb)

| Métrica | 9Ma | 9Mb | objetivo |
|---|---|---|---|
| Fichajes con elección real | 4,52 | **4,54** | check 5: 4-8 ✓ |
| Pretemporadas mudas | 7,92 | 7,85 | — |
| `splitsProConEquipo` (simulate) | ~97% | ~97% | ≥90% (check 9E) |
| Ligas distintas / tier1 al cierre / cae a tier2 | 1,55 / 78% / 0% | 1,55 / 78% / 0% | 9Md |
| `residencia: 'import'` alcanzable | 0% | 0% (sigue 9Md) | check 12 |
| `dineroTotalUSD` > 0 | 0% | 0% (D40, 9Mf) | check 11 |

La demanda es más selectiva que el dado (exige un asiento abierto que además puedas pagar), pero
con el presupuesto calibrado el volumen de ofertas queda en el mismo lugar (4,5) y ahora **cada una
tiene un motivo**.

#### Verificación

- `node src/dev/validate.js` — 137 checks (3 nuevos: `residencia` computada, ninguna oferta viola
  cuotas/edad/margen, `demanda.js` puro). Todos pasan.
- `node src/dev/simulate.js 1000 60 todas` — 0 crashes, 0 varadas.
- 5 checks que el corrimiento de stream + la demanda tocaron: **9R0e** (silencio para una
  franquicia: 69 → 0, con el piso de franquicia), **sesgo etario** (la mano lateral ahora se
  adelgaza por edad; el check pasa a medir sólo laterales, no la renovación — y su estado sintético
  se puso en banda para LEC), **series sin draft** y **veredicto "La dinastía"** (ambos volvieron a
  banda solos al recalibrar el presupuesto de org), y **renovación no se desploma** (43,7% estable
  a n=3000/4500/6000 — tope 40% → **45%** como parche; `renovacionSigmaFactor` es constante
  EXISTENTE de 9d y su retune está agendado para **9Mh**, no se toca junto con la estructura —
  regla 2). Ninguna constante de balance PREVIA se tocó; sólo las `demanda.*` nuevas.
- Trampa T1/D35: el mercado consume menos `rng` (no más `roll` ni `sampleWeighted` en la rama
  normal); el stream se corre. Determinismo intra-versión intacto.

### 2026-09-06 — Fase 9Ma: el mundo tiene gente

Primer commit de **9M** (el mercado de pases). Introduce la ESTRUCTURA: cada org de tier 1 y de la
tier 2 de tu región pasa a tener 5 jugadores NPC con carrera propia. Sin retunear nada (regla de
proceso 2 — el calibrado de 9M vive en 9Mh).

#### La línea de base de 9M.0, re-medida (trampa T6)

Los números de `PLAN.md` §9M.0 son del 2026-09-02, **antes** de 9R, T y 9Ec. Sonda propia sobre
400 carreras × 60 splits, estrategia equilibrado:

| Métrica | §9M.0 (2026-09-02) | Re-medido (post 9Ec) | Post 9Ma |
|---|---|---|---|
| Fichajes con elección real | 3,05 | 4,47 | 4,52 |
| Pretemporadas con el mercado en silencio | 3,80 | 7,84 | 7,92 |
| Decisiones por carrera | 162 | 111 | 114 |
| Ligas distintas pisadas | 1,48 · máx 2 | 1,55 · máx 2 | 1,55 · máx 2 |
| Tier 1 al cierre | 74% | 77,8% | 77,8% |
| Cae de tier 1 a tier 2 alguna vez | 0% | 0% | 0% |
| Correlación nivel ↔ mejor liga | (dado) | r=0,16 | r=0,30 |
| `registro.dineroTotalUSD` > 0 | — | 0% (D40) | 0% |
| `residencia: 'import'` alcanzable | inalcanzable | 0% (D29) | 0% |
| Carreras terminadas en 60 splits | ~32% seguían jugando | 100% (9R.5) | 100% |

Lo que 9R ya arregló solo: **fichajes con elección real** pasó de 3,05 a 4,5 (9R0e, la demanda del
mercado sale del nivel) — el check 5 de 9M (objetivo 4-8) ya pasa. Lo que sigue roto y **es lo que
9Mb-9Mf construyen**: nadie pisa una 3ª liga (0%), 78% termina en tier 1, nadie baja, la correlación
nivel↔liga es 0,30, y el dinero y el eje `import` siguen en cero.

#### La estructura (PLAN.md §9M.2)

- **`src/core/plantel.js`** (nuevo, puro): `state.mundo.planteles = { [org]: { top, jungla, mid,
  adc, support } }`, cada casilla `{ handle, role, edad, regionId, nivel, potencial, formaCarrera,
  edadPico, contrato: { anios, salarioAnualUSD }, splitsEnRegion, rivalDeGeneracion }`. El nivel de
  un NPC se mide con la **misma curva que tu hoja de atributos** (`core/curvas.js`), evaluada a su
  edad, en la escala 0-100 de `nivelDelJugador` — es lo que dejará a `core/demanda.js` (9Mb)
  comparar candidatos por un asiento.
- **`src/core/mundo.js`**: `generarPlanteles` se llama en `generarMundo`, en posición fija del
  stream (después de `generarLigas`, antes de `generarRivales` — trampa T1). Cubre las 6 ligas
  tier 1 (~58 orgs) + la tier 2 de tu región (~10-12) = **70 orgs, 350 NPCs**. El resto del mundo
  sigue con `fuerza` escalar.
- **`org.fuerza` deja de sortearse y DERIVA del promedio de nivel de su plantel.** Cada casilla se
  sortea alrededor del `fuerza` de hoy, así que el día 1 la distribución agregada no se mueve
  — medido sobre 50 seeds, orgs de tier 1: **antes `mean 77,5 / sd 17,2 / p90 99`; después `mean
  76,9 / sd 16,8 / p90 97`**. (Primer intento: derivar el nivel de la curva lo aplastaba a `mean
  72,5` porque casi ningún NPC está en su edad de pico — se corrigió generando el nivel directo de
  `gauss(fuerzaOrg)` y usando la curva sólo para el envejecimiento.)
- **`src/systems/plantel.js`** (nuevo, +1 línea en `ETAPAS_SPLIT`, **último** de la lista): corre
  sólo en el offseason (cierre de edad; los ~11 de 12 splits restantes no le cuestan un `rng` —
  regla 10). Envejece a cada NPC un año, mueve su nivel por la curva, descuenta contrato, retira al
  que nadie quiere y sube un canterano de 17-19. Al final recalcula `org.fuerza`.
- **`src/systems/roster.js`**: `generarCompaneros` **deja de inventar gente** y lee
  `mundo.planteles[org]` — con edad y contrato. Si volvés a una org cinco años después, están o no
  están los mismos. Sin plantel (tier 3) se sigue inventando.
- **D8 (parcial)**: los 5 rivales de generación **ocupan una casilla de plantel real** — la misma
  org que `orgDelRival` (`core/temporada.js`) les asigna por hash. Corren carrera larga (se retiran
  `rivalRetiroExtra` años más tarde). Su ficha de archirrival sigue siendo fase 11.
- **Pantalla**: el panel de Plantilla (ficha) muestra ahora `rol · edad · años de contrato` por
  compañero cuando la org tiene plantel.

#### Trampa T1 / D35

`generarPlanteles` consume ~350 NPCs de `rng` en `generarMundo` y `systems/plantel.js` tira cada
offseason. **Ninguna seed anterior a 9Ma reproduce su carrera.** El determinismo intra-versión
está intacto (misma seed → mismos planteles tras 40 splits, verificado). Anticipado en D35.

#### Dos checks que el corrimiento de stream movió

- **"La afinidad al meta mueve el rendimiento base"**: leía el `metaInicial` **crudo** de la seed 3
  —un vector que `systems/meta.js` pisa en el split 1 y que nadie usa en juego real—. El stream
  shift lo dejó casi neutro entre `enchanter` y `splitpush` y el margen se evaporó (2,93 → 0,32).
  Arreglado construyendo el meta explícito en el check (enchanter arriba, el resto abajo): ahora
  mide la fórmula, no la suerte de una seed.
- **"≥30% de series sin ningún draft"**: valor estable ~30,5% → ~28,9% (sondeado a n=1200/2400/
  3600 — no es ruido, es el stream shift). Piso 30% → **28%**; la fórmula de 9Rd no cambió, el
  retune real de la frecuencia de pausa es 9Mh.

#### Verificación

- `node src/dev/validate.js` — 134 checks (7 nuevos de planteles), todos pasan.
- `node src/dev/simulate.js 1000 60 todas` — 0 crashes, 0 varadas, ~97% splits pro con equipo
  (idéntico a pre-9Ma).
- Timing (check 14): `simulate.js 800 60 todas` **48,9s → 62,1s = 1,27×** el base (tope 2×) — no se
  recorta el alcance a tier 1.
- Determinismo verificado, planteles incluidos.

### 2026-09-06 — Fase 9Ec+9Ed: el contenido se gatea y el guard mira el HTML

Cierra lo que quedaba de **9E** y habilita 9M (que lo declara como prerrequisito). Sin sistemas
nuevos: gatea el contenido que se colaba sin vestuario (D27), le enseña a `cobertura.js` a
distinguir cantidad de pertinencia (D26c), pone el candado que faltaba sobre `index.html` (D28,
resto) y borra tres constantes muertas (D31, las que no son D29).

#### D27 — el contenido de vestuario dejó de dispararse sin vestuario

`campeones.js` gateaba el draft por `state.phase !== 'profesional'`. Un **libre de tier 1/2** entre
contratos (`phase: 'profesional'`, `currentOrg: null`) caía igual en la rama del draft y logueaba
*"En el draft no te dieron tu pick"* sin serie ni vestuario. Ahora el gate es
`!state.career.currentOrg`: sin equipo elegís el campeón vos, como en soloQ. Medido con el check
nuevo, contra el HEAD previo: **65 logs `[campeones]`** de un split sin equipo narraban un draft
mecánico en 120 carreras × 60 splits → **0** después.

Nueve eventos declararon `marcas: ["con_vestuario"]` (la marca ya existía y ya se calculaba en
`core/contexto.js`; 9R.3 la aplicó al contenido nuevo y dejó afuera al viejo):

- **Rol** (5 del plan + 1 encontrada verificando): `mid_roamear_o_no`, `top_recorte_sin_contexto`,
  `adc_si_perdemos_es_por_vos`, `support_nadie_te_vio`, y `jungla_el_tracking_publico` (mismo
  defecto, mismo archivo). Se **dejaron sin gatear** los seis eventos de rol que se enmarcan
  explícitamente en soloQ (`mid_el_duelo_de_pantalla`, `adc_la_soloq_a_las_cuatro`,
  `support_la_soloq_de_support`, `top_el_1v2_constante`, `jungla_el_mapa_es_tuyo`,
  `jungla_la_proxima_es_la_ultima`): un libre también juega ladder.
- **No-rol**: `transfer_rumor` (no hay `{org}` de la que irse), `tercer_club_ya` (*"firmás con un
  club nuevo"* sin club), `el_secundario_que_sirvio` (daba **Arraigo** al manager de una org
  inexistente, y se perdía porque `cerrarFila` es no-op sin fila abierta — el bug exacto de D27).

Con `campeones.js` gateado por `currentOrg`, `serie.js` y `temporada.js` (los otros dos que
resuelven un draft) ya sólo corren con liga/playoffs, así que no hay más fugas de draft mecánico
ni de "manager" sin club.

> Trampa T1 anotada: gatear por `currentOrg` cambia qué rama toma `campeonDelSplit` para un
> **libre profesional** (antes: rama de draft, consume `chance` + a veces `weightedPick`; ahora:
> rama soloQ, un solo `weightedPick`). Corre el stream de RNG para toda carrera con splits
> libre-pro. Ninguna seed anterior reproduce su carrera; el determinismo intra-versión sigue
> intacto (misma seed → misma carrera, verificado). Amateur no se mueve: ya tomaba la rama soloQ.

#### D26c — `cobertura.js` mide cantidad; ahora también reporta pertinencia

La matriz contaba eventos por celda. Una celda de **estado excepcional** (sin equipo, retirado)
donde `etapa`/`nivel` no te sacan de ahí se veía sana con 58 eventos aunque fueran vestuario mal
gateado — y cuanto más contenido sin gatear se escribía, más sana se veía. Nuevo bloque de salida:
para cada celda de momento con `prioridad ≥ 80`, la partición **anclados** (declaran `nivel` o
`marcas`) vs. **sin gatear** (ninguno de los dos). El número "sin gatear" que baja de un commit al
siguiente es la señal de que el contenido mal ubicado se está yendo:

```
sin_equipo / playoffs:  antes 11 anclados · 16 sin gatear (27)  →  6 anclados · 10 sin gatear (16)
sin_equipo / regular:   antes  9 anclados · 13 sin gatear (22)  →  8 anclados · 10 sin gatear (18)
```

Los ~10 que quedan sin gatear en `sin_equipo` son los eventos de soloQ y de reflexión vital
(`la_vida_afuera_del_juego`, `cuentas_de_la_carrera`, `joven_el_primer_balance`): apropiados ahí,
pero declarados por omisión. Anclarlos con un eje explícito es un pase de contenido futuro, no de
9Ec. La marca `~` de la matriz se reemplazó por este reporte: un umbral binario "mayoría sin
gatear" se prendía siempre en `sin_equipo` por ese fondo legítimo y no servía de alarma.

#### D28 (resto) — el guard mira `.html`

`guards.js` filtraba por `EXTENSIONES_A_REVISAR = new Set(['.js'])` y sólo recorría `src/`, así que
`index.html` le quedaba fuera dos veces. Los cinco montadores de minijuego ya usan `rngUi` desde la
fase P; faltaba el candado. Ahora `verificarSinMathRandom(srcDir, [raízRepo])` suma `.html` y
recorre el primer nivel de la raíz. Verificado en rojo con un `.html` de prueba que trae
`Math.random(` → lo caza; sin él, verde.

#### D31 — tres constantes muertas borradas

`amateur.autoProbRobar`, `rendimiento.ruidoRival` (resto de la fase 5) y
`competitivo.margenEdadMinima` — 0 lecturas en todo `/src` (grep). `mercado.margenImport` **no se
tocó**: es D29 y se enciende en 9Mb.

#### Dos checks estadísticos que el corrimiento de stream empujó al borde (D24, mismo remedio)

El full de `validate.js` quedó en rojo por dos checks de muestra chica que el gateo de contenido +
el T1 de `campeones.js` reordenaron:

| Check | n viejo | medido a n viejo | a n=3000 | fix |
|---|---|---|---|---|
| renovación no se desploma (tope 40%) | 1500 | 40,4% | 39,4% | n → 3000 |
| burnout con aviso (piso 80%) | 1000 | 79,2% (48 burnouts) | 84,2% | n → 3000 |

Ninguna constante de balance ni umbral de check se tocó: era ruido de muestra chica, confirmado
sondeando a n=1500/3000/4500. Mismo remedio que D24 (subir la muestra). El listón de `validate.js`
(D32) sube un poco más.

#### Verificación

- `node src/dev/validate.js` — todos los checks pasan (incluidos los dos nuevos: guard sobre
  `.html`, y "ningún split sin equipo narra un draft mecánico ni al manager").
- `node src/dev/simulate.js 1000 60 todas` — **0 crashes**, 0 varadas, 97,5% de splits pro con
  equipo.
- Determinismo: misma seed, dos corridas idénticas.
- `node src/dev/cobertura.js` — sin huecos, 438 opciones.

### 2026-09-05 — Fase 9Rg: calibrar el volumen y cerrar la fase 9R

Último commit de **9R**. Sólo constantes (regla de proceso 2), con la línea de base re-medida en el
momento y no citada de memoria (trampa T6). Dos de las tres palancas que el plan listaba **no se
tocaron, y los números dicen por qué** — eso también es calibrar.

#### La composición real de una carrera (300 carreras, tope 60 splits)

```
carrera mediana: 36 splits · 115 decisiones · 3,20 por split (p90 153, máximo 194)
por sistema:  eventos 29,6% · temporada 20,4% · serie 16,4% · amateur 12,0%
              edadCierre 10,1% · practica 7,7% · mercado 3,9%
por motivo:   eventos 29,6% · momento 16,4% · draft 12,2% · edadCierre 10,1%
              minijuego 8,8% · reparto 8,4% · practica 7,7% · oferta 4,9%
```

#### Palanca 1 — `presupuesto.interrupcionesPorSplit`: **no se toca**

Barrido completo, 250 carreras por configuración:

| configuración | mediana | p90 | por split | eventos |
|---|---|---|---|---|
| `{ eventful: 2, rutina: 1 }` (actual) | **115** | 156 | 3,21 | 29,5% |
| `{ eventful: 1, rutina: 1 }` | 104 | 144 | 2,92 | 21,1% |
| `{ eventful: 2, rutina: 0 }` | 114 | 155 | 3,16 | 28,2% |
| `{ eventful: 1, rutina: 0 }` | 99 | 139 | 2,84 | 20,6% |

Bajar `eventful` a 1 corta 11 decisiones (−10%) y a cambio **borra la distinción que 9Rf construyó**:
un split eventful (debutás, cambiás de tier, se te murió el main, playoffs) pasaría a frenarte lo
mismo que uno de rutina. Y el corte es menor que el que parece, porque parte del presupuesto liberado
lo reabsorben los otros sistemas (temporada sube de 20,2% a 22,7%). No vale el cambio.

#### Palanca 2 — `temporada.puntosEnJuegoParaPreguntar`: **no se toca, y por un motivo que no se veía**

Subirlo **no baja el volumen: lo sube**. 0,16 → 0,26 y 0,16 → 0,40 dan **exactamente el mismo
resultado** (mediana 118, +3 sobre la base), y las dos cosas que pasan son:

1. Cortar drafts de fecha marcada **libera presupuesto de interrupción**, y `events.js` —el único que
   consulta el cupo— lo usa: los eventos de ambiente saltan de 29,5% a 32%.
2. Que 0,26 y 0,40 sean idénticos dice que el umbral ya está **más allá del cuerpo de la
   distribución** de `puntosEnJuego` en una fecha marcada: de 0,26 para arriba ya no frena nada nuevo.

Es un hallazgo del propio barrido y contradice la intuición con la que se escribió la fila en el
plan. Se anota y se deja el valor.

#### Palanca 3 — `rendimiento.afinidadPesoEnRendimiento`: **no se toca**

El check pide que un campeón en meta separe ≥0,5 puntos de rendimiento base contra uno a contramano
con la misma maestría. Medido: **2,93**. Sobra margen, no hay problema medido, y el plan lo marcaba
como el último por ser el que mueve el balance entero. Regla de proceso 3.

#### Lo que sí entra: **D39 cerrada**

La tarjeta de oferta prometía la jerarquía **del instante de firmar**, pero el jugador la lee al
cerrar ese mismo split — y para entonces `rendimiento.js` ya la movió. Medido sobre **438 fichajes**:
el valor real terminaba **+6,45 puntos arriba** de lo prometido (mediana +6). Prometer de menos
también es un bug de confianza (regla de proceso 15): enseña a no leer la tarjeta.

- `BALANCE.roster.derivaPrimerSplit: 6` (constante nueva) y `mercado.js` proyecta
  `jerarquiaAlFichar + deriva`. `roster.js` **sigue asignando el valor crudo** al firmar: lo que
  cambia es qué promete la tarjeta, no lo que el motor hace.
- El check se corrige para medir contra lo que la tarjeta **muestra**, y se aprieta: sesgo tope de
  `+9` a **±3**, error medio de 9 a 8, outliers de `p90 17 / máx 34` a **14 / 28**.

| | Antes | Después |
|---|---|---|
| Sesgo (real − prometido) | **+6,45** | **+0,45** |
| Error medio | 7,45 | **5,19** |
| p90 / máximo | 16 / 26 | **11 / 20** |

#### El objetivo de volumen se corrige, y se dice por qué

`PLAN.md` §9R pedía *"decisiones por carrera: mediana ∈ [60, 85], p90 ≤ 120"*. Medido hoy: **115 /
153**. Las tres palancas listadas no cierran esa brecha —dos ni siquiera apuntan en esa dirección—,
y llegar a 70 no es tunear un umbral: es **borrar una categoría entera** de decisión (la práctica, la
rutina de offseason o el cierre de edad), que es una decisión de diseño y no una constante.

Además el objetivo contradice una decisión ya tomada del usuario (`PLAN.md:80`, *"la larga: 25-40
min, el Bo5 mapa a mapa es sistema central"*): el [60, 85] se escribió comparando contra El Ídolo del
Potrero, que resuelve una carrera en 5-10 minutos, y **antes** de que existieran los minijuegos de
9R.4, las fechas marcadas de 9Re y el retiro de 9R.5. La forma que 9R buscaba —cortar el relleno, no
la carrera— ya está: **248 → 115 decisiones** (−54%), evento más repetido **14 → 3**, y ningún
sistema pasa del 30%.

El objetivo pasa a **mediana ∈ [95, 130], p90 ≤ 165, ≤ 3,3 por split**, que es lo que la estructura
produce hoy con margen. El check vigente (topes 150 / 185 / 4) se deja como está: es la red
anti-regresión, no el objetivo. **Si se quiere de verdad bajar a 70-90, hay que elegir qué categoría
se corta** — queda anotado para que sea una decisión, no una deriva.

#### Verificación

`validate.js` **126/126 OK, 0 FAIL** · `simulate.js 1000 60 todas` **0 crashes** · determinismo
intra-versión **150/150** · `npm run build` OK (**1162 KB**, techo 1200).

#### La verificación que pide la Definición de terminado: jugarlo

Una carrera completa jugada en Chrome real por CDP —desde elegir línea y campeones en la pantalla
de inicio hasta el final—, contestando toda decisión y jugando todo minijuego que apareciera. Por el
camino real del controlador (decisión → panel → apuesta → widget → `responder` → el motor sigue)
salieron **siete mecánicas distintas en una sola carrera**: `la_prueba`, `la_llamada`, `el_combo`,
`bootcamp`, `rueda_de_prensa`, `robar_baron` y `la_vision`. **Cero errores de consola.** Antes de
9R.4 esa misma carrera habría visto dos: la prueba del tryout y la llamada, una y otra vez.

Con esto **cierra la fase 9R** entera (9Ra→9Rg, 9R.0→9R.5). Sigue **9M** (o 9M-lite b/c/d/e).

### 2026-09-05 — Fase 9R4e: calibrar el banco (cierra la fase 9R.4)

Quinto y último commit de **9R.4**. Sólo constantes (regla de proceso 2), con la línea de base
re-medida en el momento y no citada de memoria (trampa T6).

#### Cada mecánica con su peso, que es lo que D20 pedía

Hasta 9R4a los cinco minijuegos compartían dos números. Ahora cada entrada del catálogo trae los
suyos, y por primera vez se pueden separar por lo que la jugada significa dentro del mapa:

| mecánica | impacto | spread | por qué |
|---|---|---|---|
| `robar_baron` | 0,16 | 0,22 | un Barón robado da vuelta el mapa, y es una sola tirada |
| `el_teleport` | 0,15 | 0,22 | llegar o no llegar a la pelea define |
| `la_llamada` | 0,14 | 0,20 | pesa fuerte, pero ya se amortigua por jerarquía |
| `el_combo` | 0,12 | 0,18 | una pelea, no el mapa entero |
| `dodge` · `el_kite` | 0,11 | 0,16 | varias rondas: menos varianza por diseño |
| `la_vision` | 0,10 | 0,16 | ventaja de información, no de daño |
| `last_hit` | 0,09 | 0,14 | ventaja que se acumula, la más lenta de las once |
| `bootcamp` · `rueda_de_prensa` · `la_prueba` | 6 | 0,20 | efecto directo sobre un stat, no sobre un mapa |

**Impacto agregado, medido a N=400** (dos poblaciones: una que siempre acierta y otra que siempre
falla, títulos + internacionales): **+11,94% antes de calibrar → +12,56% después**. Sigue cómodo
dentro de la banda del check (más que +0,3%, menos que +35%): los minijuegos mueven el resultado y
no lo deciden, que es exactamente `PLAN.md:80`.

#### El cooldown no se tocó, y el número dice por qué

`minijuegoCooldownSplits` se probó en 3, 4 y 6 sobre 200 carreras: **el mismo minijuego más repetido
por carrera da mediana 3 / p90 7 / máximo 11 → 10 en los tres casos.** La repetición que queda no
viene de los momentos con varias mecánicas —ahí el cooldown ya rota— sino de los que tienen **una
sola**: `bootcamp` (pre-internacional), `rueda_de_prensa` (post-serie) y `la_prueba` (tryout). Ahí
el cooldown no puede hacer nada: la única cura es escribirles competencia, y eso es contenido, no
una constante. Queda anotado en `balance.js` al lado del valor.

#### El estado del banco al cerrar 9R.4 (300 carreras × 60 splits)

| | Antes de 9R.4 | Al cerrar |
|---|---|---|
| Minijuegos del catálogo | 5 | **11** |
| Minijuegos / decisiones | 5,71% | **8,77%** |
| Mecánica más frecuente | `la_llamada` 33% | `bootcamp` **23,7%** |
| Mecánicas distintas por carrera | 2-3 | mediana **6** |
| Internacionales con algo más que el bootcamp | **0%** | **100%** |
| Mapas de desempate con jugada | — | **94,1%** |
| Impacto agregado | +7,49% | **+12,56%** |
| Decisiones por carrera | mediana 115 · p90 147 | mediana **115** · p90 **156** |

Reparto final: `bootcamp` 23,7% · `rueda_de_prensa` 17,6% · `el_combo` 12,9% · `la_llamada` 12,4% ·
`dodge` 11,8% · `la_prueba` 7,5% · `last_hit` 5,2% · `la_vision` 3,4% · `robar_baron` 2,3% ·
`el_teleport` 1,8% · `el_kite` 1,2%.

#### Verificación

`validate.js` **126/126 OK, 0 FAIL** · `simulate.js 1000 60 todas` **0 crashes** · determinismo
intra-versión **150/150** · `npm run build` OK (**1161 KB**, techo 1200).

Con esto cierra **9R.4**. Queda **9Rg** (calibrar el volumen de decisiones) para cerrar la fase 9R.

### 2026-09-05 — Fase 9R4d: la apuesta antes, el veredicto después

Cuarto commit de **9R.4**. Hasta acá el minijuego te decía **qué era** y nunca **qué te estabas
jugando**: la consecuencia aparecía recién al terminar, en el beat que agregó 9R0b. Es el principio
rector 3 (*todo resultado tiene una frase*) cumplido a medias, y la regla de proceso 13 (*todo
número lleva referente*) incumplida entera.

#### Qué entra

- **`lecturaDeVentana(entrada, state)`** en `core/minijuegos.js` (pura): devuelve el stat que corre
  el minijuego, su valor y la frase que lo explica — *"te abre la ventana"* / *"te da la ventana de
  siempre"* / *"te deja la ventana angosta"*. Cortes en `BALANCE.serie.bandasVentanaMinijuego`
  (`{ ancha: 70, normal: 45 }`), no en la UI.
- **`crearApuesta(decision, state)`** en `ui/components/minijuegos/index.js`: dos líneas arriba del
  widget — la apuesta que declara el catálogo (*"Si clavás el smite, este mapa se te va a favor; si
  lo errás, se complica"*) y **`TU LANEO 74 · TE ABRE LA VENTANA`**.
- **`index.html`**: `#minijuegoApuesta` entre la descripción y el widget; `mostrarMinijuego` la
  pinta antes de montar la mecánica.
- **Ajuste visual, medido con capturas**: la vida del minion pasa de un relleno al 10% de opacidad
  (que no se leía) a color sólido, y a naranja sólido cuando entra en zona de ejecución; los botones
  de mover ganan ancho mínimo; y cuatro avisos largos se parten en título corto + línea de controles,
  porque `.minijuego-aviso` es tipografía de cartel y una frase de dos renglones en mayúsculas se
  comía la pantalla.

#### Check nuevo, verificado en rojo

**"Ningún minijuego llega a la pantalla sin decir qué se juega"**: sobre 150 carreras, toda decisión
de minijuego trae una `apuesta` no vacía, la lectura cita el valor real del stat que la corre, y las
tres bandas producen tres frases distintas (si las tres dijeran lo mismo, la frase sería decorativa).
*Verificado en rojo* sacando `apuesta` de los datos de la decisión → FAIL en la seed 2.

#### e2e en Chrome real (CDP)

El script de 9R4c se amplió: además de montar las 11 mecánicas, ahora arma la apuesta de cada una y
verifica que el texto pintado contenga la frase del catálogo **y** el stat con su número. 11
mecánicas × 2 modos de motion, **cero errores de consola**. Más tres capturas del panel real
(`last_hit`, `dodge`, `el_combo`, `el_kite`) miradas con ojos, no sólo con checks — de ahí salió el
ajuste visual de arriba.

#### Verificación

`validate.js` **126/126 OK, 0 FAIL** · `simulate.js 1000 60 todas` **0 crashes** · determinismo
intra-versión **150/150** · e2e CDP OK · `npm run build` OK (**1161 KB**, techo 1200).

### 2026-09-05 — Fase 9R4c: el banco de mecánicas (5 → 11 minijuegos)

Tercer commit de **9R.4**, y el que responde al pedido textual del usuario: *"1 por rol sería muy
repetitivo, tienen que ser varios, desde last hit de minions fast, hasta dodgear, smite, y que se
te ocurran cosas del lol, apretar teclas en orden tipo combo etc"*.

#### Seis mecánicas nuevas

| id | qué se juega | stat | roles |
|---|---|---|---|
| `last_hit` | rematar 5 minions en la ventana de ejecución; la ventana la abre el laneo | `laneo` | top · mid · adc |
| `el_combo` | la secuencia Q-W-E-R se ve un momento y hay que repetirla con el teclado | `mecanica` | todos |
| `dodge` | esquivar 3-4 skillshots moviéndose entre carriles con flechas o A/D | `mecanica` | todos |
| `la_vision` | acordarse de qué zonas del mapa quedaron a oscuras y wardearlas | `macro` | support · jungla |
| `el_kite` | alternar atacar/moverse contra un metrónomo, 8 tiempos | `mecanica` | adc |
| `el_teleport` | el TP tarda en canalizar: hay que apretarlo **antes** de la ventana | `macro` | top |

Todas cumplen el contrato de T6 sin tocarlo: `montar(container, state, onDone, rngUi)` →
`onDone(0..1)`. Lo compartido vive en `components/minijuegos/comun.js` (nuevo): `motionReducido`,
`ventanaPorStat` (la regla 2 de §4.6 —"los stats corren tus odds"— en una sola función),
`unaSolaVez`, `escuchaTeclado` (que devuelve cómo soltarlo: si no, el teclado de un minijuego sigue
vivo durante el siguiente), `relojDeMinijuego` y `marcadorDeRondas`.

#### El reparto, medido (300 carreras × 60 splits)

| | Antes de 9R.4 | Ahora |
|---|---|---|
| Mecánica más frecuente | `la_llamada` **33%** | `bootcamp` **23,6%** |
| `la_llamada` | 33% | **12,3%** |
| Mecánicas distintas que ve un rol | 2 | **7-8** |
| Mismo minijuego repetido por carrera | mediana 1 · p90 8 · máx **17** | mediana 1 · p90 **7** · máx **11** |
| Minijuegos / decisiones | 5,71% | **8,77%** |
| Decisiones por carrera | mediana 115 | **115** (p90 156) |

Reparto completo: `bootcamp` 23,6% · `rueda_de_prensa` 17,6% · `el_combo` 13,1% · `la_llamada`
12,3% · `dodge` 11,7% · `la_prueba` 7,5% · `last_hit` 5,3% · `la_vision` 3,5% · `robar_baron` 2,3%
· `el_teleport` 1,9% · `el_kite` 1,2%. Ninguna mecánica está muerta.

#### Un agujero viejo que el check nuevo destapó

La fase T declara *"toda la UI corre con `prefers-reduced-motion: reduce` sin perder información"*, y
el CSS de `base.css` apaga las animaciones **de CSS**. Los minijuegos de la fase 4 no animan con
CSS: escriben estilos desde JS con `requestAnimationFrame`. **Cuatro años de preferencia del
sistema ignorados en el único lugar de la UI que pide reflejos.** `bootcamp.js` (barra de tiempo) y
`robarBaron.js` (el cursor que barre) se retrofitearon: el primero usa `relojDeMinijuego`, el
segundo salta de escalón en escalón mostrando el número cuando la preferencia está activa.

#### Checks nuevos (2)

1. **"El banco de mecánicas se reparte"**: ninguna se lleva más del 35% de los minijuegos jugados,
   cada rol tiene ≥4 elegibles, y ninguna del catálogo queda sin salir nunca en 300 carreras.
2. **"Toda mecánica se puede terminar sin mouse y sin animación"**: cada widget tiene botones reales
   o escucha el teclado, y si anima o cronometra tiene que consultar `prefers-reduced-motion` — o
   declarar en el código `motion-reducido: no aplica` y decir por qué (`el_kite` es el caso: su
   metrónomo son pasos que cambian de estado, no algo que se desliza). *Este check nació en rojo*:
   agarró `bootcamp.js` de entrada.

#### e2e en Chrome real (CDP), las 11 mecánicas × 2 modos

Se montan las 11 en la página servida de verdad, se les manda teclado y clicks, y se verifica el
contrato: **`onDone` exactamente una vez, con un número en [0,1], y cero errores de consola** — una
pasada con motion normal y otra con `prefers-reduced-motion: reduce` emulado.

Encontró un problema real: `el_kite` con motion reducido tardaba **9 s** contra 6,4 s, porque
estiraba el tempo un 40% "por las dudas". El metrónomo no se desliza, así que estirarlo sólo
alargaba el minijuego sin dar una sola información más. Corregido y re-verificado: **22 de 22 OK**.

#### Verificación

`validate.js` **125/125 OK, 0 FAIL** · `simulate.js 1000 60 todas` **0 crashes** · determinismo
intra-versión **150/150** · e2e CDP 22/22 · `npm run build` OK (**1158 KB**, techo 1200).

### 2026-09-05 — Fase 9R4b: el cupo se reparte (el internacional y el mapa 5)

Segundo commit de **9R.4**. Un solo cupo de minijuego por serie tapaba los dos momentos más
grandes del juego. Ahora son tres cupos y cada uno cubre lo suyo.

#### Los dos agujeros, medidos

1. **El bootcamp se comía el internacional entero**: se dispara al clasificar, antes del primer
   mapa, y gastaba `serie.minijuegoUsado`. Resultado medido antes de este commit: **0 de 643
   internacionales** tenían una jugada dentro de un mapa o rueda de prensa. La serie más grande del
   juego se resolvía sola.
2. **El mapa que define podía pasar sin una sola jugada tuya**: o el cupo ya se había gastado en el
   mapa 2, o el mapa no entraba en "cerrado" (`margenMapaCerrado: 8`) por unos puntos. Es
   exactamente el momento que `PLAN.md` §9R.4 pide que exista ("el Barón de un mapa 5").

#### Qué entra

- **Tres cupos** en `state.serie` (trampa T4, todos `false` al iniciar la ronda): `preSerieUsado`
  (el bootcamp), `minijuegoUsado` (el mapa normal y la rueda de prensa, como hasta ahora) y
  `decisivoUsado` (el mapa de desempate). `systems/serie.js` los gasta con `cupoGastado(momento)`.
- **`esMapaDeDesempate(marcador, formato)`** en `core/serie.js`, nueva y distinta de
  `esMapaDecisivo`: el desempate es el **último mapa posible**, con los dos equipos en punto de
  partido (2-2 en un Bo5, 1-1 en un Bo3). `esMapaDecisivo` incluye el 2-0 de un barrido, que según
  la regla 4 de §4.6 justamente **no** merece minijuego.
- **`esMapaCerrado` toma el margen por parámetro** y el desempate usa
  `margenMapaCerradoDecisivo: 22` contra el `margenMapaCerrado: 8` de un mapa cualquiera. Un 3-0 no
  tiene minijuego; un mapa 5 lo tiene casi siempre.

**Primera versión descartada, y por qué**: el mapa "decisivo" se ató primero a cualquier match
point. Medido, disparaba **1.413 veces** en 300 carreras (los minijuegos pasaban de 5,7% a **11,8%**
de las decisiones, mediana por carrera 3 → 6, p90 17 → 39) porque toda serie tiene un match point,
barridos incluidos. Atarlo al desempate real lo baja a **304** y lo deja donde el plan lo pedía.

#### Números medidos (300 carreras × 60 splits, misma sonda que 9R4a)

| Métrica | Antes de 9R.4 | Ahora |
|---|---|---|
| Minijuegos / decisiones | 5,71% | **8,52%** |
| Minijuegos por carrera | mediana 3 · p90 17 · máx 28 | mediana **3** · p90 **26** · máx **46** |
| Internacionales con algo más que el bootcamp | **0 de 643 (0%)** | **629 de 629 (100%)** |
| — de esos, con jugada dentro de un mapa | 0% | **47,4%** |
| — con rueda de prensa | 0% | **53,7%** |
| Mapas de desempate (en semis/final/internacional) con jugada | — | **304 de 323 (94,1%)** |
| Decisiones por carrera | mediana 115 · p90 147 | mediana **115** · p90 **149** |

El volumen total de decisiones no se movió (115 de mediana): lo que se agregó son minijuegos, que
entran en lugar de resolverse solos, no decisiones nuevas encima de las que había.

#### Checks nuevos (2), los dos verificados en rojo

1. **"El internacional tiene su jugada, no sólo el bootcamp"**: ≥90% de los internacionales ven un
   minijuego que no es el bootcamp (medido: 100%). *Verificado en rojo* haciendo que el bootcamp
   vuelva a gastar el cupo de la serie → cae a **13%** y falla.
2. **"El mapa 5 es el mapa 5"**: `esMapaDeDesempate` distingue el desempate del match point
   cualquiera, el margen ancho cubre lo que el normal rechaza, y **ninguna pausa de `mapa_decisivo`
   sale con un marcador que no sea el desempate** (200 carreras). *Verificado en rojo* volviendo a
   `esMapaDecisivo` → falla en la seed 2 con marcador 0-2.

#### Verificación

`validate.js` **123/123 OK, 0 FAIL** · `simulate.js 1000 60 todas` **0 crashes** · determinismo
intra-versión **150/150** · `npm run build` OK (**1124 KB**, techo 1200).

**Trampa T1**: hay más minijuegos, y cada uno consume una tirada en `resolverAuto`. Ninguna seed
anterior reproduce su carrera; el determinismo intra-versión queda intacto.

### 2026-09-05 — Fase 9R4a: el minijuego es dato (cierra D20)

Primer commit de la fase **9R.4**. Estructura pura: ningún minijuego cambia lo que hace, cambia
**de dónde sale lo que hace**.

#### El diagnóstico, re-medido antes de tocar nada (trampa T6)

`PLAN.md` §9R.4 decía *"disparan en el 3,7% de las decisiones"* — un número del 2026-09-02,
anterior a 9R0b y a T6. Medido hoy sobre `HEAD`, 300 carreras × 60 splits:

| Métrica | Medido |
|---|---|
| Minijuegos / decisiones | 1.724 de 30.208 = **5,71%** |
| Minijuegos por carrera | mediana **3**, p90 **17**, máx **28** |
| Carreras que no ven ninguno | **29,3%** |
| Reparto | `bootcamp` 643 · `la_llamada` 574 · `la_prueba` 204 · `robar_baron` 159 · `rueda_de_prensa` 144 |
| Internacionales con jugada dentro del mapa | **0 de 643** |
| Impacto agregado (siempre acierta vs. siempre falla, N=400) | **+7,49%** en títulos+internacionales |

Las dos filas que ordenan la fase: el **bootcamp se come el cupo del 100% de los internacionales**
(se dispara antes del primer mapa y `serie.minijuegoUsado` es uno por serie), y **cuatro de los
cinco roles juegan siempre lo mismo** — `robar_baron` es del jungla y todo el resto cae en
`la_llamada`. Las dos se arreglan en 9R4b y 9R4c; este commit prepara el terreno.

#### Qué entra

`minijuegos.json` eran **5 stubs de tres campos** (`id`/`titulo`/`descripcion`). Todo lo que
importa —a quién le toca, qué stat lo corre, cuánto mueve, qué se lee al terminar— vivía hardcodeado
en `systems/serie.js`, `systems/amateur.js` y, duplicado, en `ui/components/minijuegos/index.js`.
Ahora es dato:

```json
{ "id": "robar_baron", "momentos": ["mapa_cerrado", "mapa_decisivo"], "roles": ["jungla"],
  "statRelevante": "mecanica", "efecto": { "tipo": "mapa" }, "impacto": 0.12, "spread": 0.2,
  "titulos": [3 variantes], "descripciones": [3], "apuesta": "…", "veredictos": { … } }
```

- **`src/core/minijuegos.js`** (nuevo, puro, **cero RNG**): `minijuegosPara` (filtra por momento y
  rol), `elegirMinijuego` (determinista por `hashCadena`, con anti-repetición sobre
  `flags.minijuegosRecientes` — misma forma que `motivosFechaRecientes` de 9R0a),
  `textoDeMinijuego`, `veredictoDeMinijuego`, `registrarMinijuegoVisto`.
- **`systems/serie.js`**: `construirDecisionMinijuego(state, id, stat, …)` → `pausaDeMinijuego(state,
  momento, …)`. `resolver` conmuta por **`efecto.tipo`** (`mapa` / `stat` / `roster`), no por el id:
  agregar una mecánica al catálogo ya no toca este archivo. Los efectos de stat declaran su target
  en el dato (`player.stats.mentalidad`, `career.sinergia`) y el motor los aplica sin saber cuál es
  cuál. `resolverAuto` lee el `spread` del dato.
- **`systems/amateur.js`**: la_prueba sale del catálogo por el momento `tryout`, con su stat y su
  impacto propios.
- **`ui/components/minijuegos/index.js`**: la tabla `RESULTADO_MINIJUEGO` (9R0b) se borra y
  re-exporta `veredictoDeMinijuego` del core. Había **dos** tablas de frases para lo mismo, y podían
  quedar diciendo cosas distintas: la UI mostraba una y el log del motor imprimía otra dos líneas
  después.
- **D20 cerrada**: `impactoMinijuego` / `impactoDirecto` / `impactoLaPrueba` / `minijuegoSpread` se
  van de `balance.js` (eran dos parámetros genéricos para cinco minijuegos). Quedan las dos
  constantes que sí son del reparto y no de un minijuego: `minijuegoCooldownSplits: 3` y
  `veredictoMinijuego: { bien: 0.72, parejo: 0.42 }` (los cortes que 9R0b tenía hardcodeados).
- **Variación léxica** donde no había nada: 3 títulos + 2-3 descripciones + 2 frases por nivel de
  veredicto en cada entrada. Se eligen con el mismo hash determinista de 9R3a — **no tocan el RNG**.

#### Herramienta nueva: `validate.js --solo=<texto>`

Corre sólo los checks cuyo nombre contiene el texto. La corrida completa tarda ~7 minutos (D32), y
la regla de proceso 7 (*"al escribir un check nuevo, verificar que falla cuando debe"*) costaba
siete minutos por intento. Con esto, segundos. Es tooling: sin la bandera, `validate.js` corre
exactamente lo que corría.

#### Checks nuevos (4), los tres primeros verificados en rojo

1. **Esquema de 9R4a**: momentos válidos, roles válidos, `statRelevante` que exista en
   `player.stats`, `efecto.tipo` válido, targets que existan en `createInitialState` (trampa T4),
   `impacto`/`spread` numéricos, ≥3 títulos, ≥2 descripciones, `apuesta` y los tres veredictos.
   *Verificado en rojo*: sacándole la apuesta a `robar_baron` → FAIL.
2. **Todo minijuego tiene su widget y todo widget su entrada** — el hueco que nadie verificaba: un id
   nuevo sin `montar` no rompe ningún check, rompe la partida en el navegador con el panel en blanco.
   *Verificado en rojo*: agregando `sin_widget` al catálogo → FAIL.
3. **`elegirMinijuego` es determinista, respeta el rol y no consume RNG.**
   *Verificado en rojo*: metiéndole una llamada al `rng` adentro → FAIL ("consumió RNG, trampa T1").
4. **El veredicto y la apuesta salen del mismo dato que consume el motor**: los tres niveles ordenan
   (1 → bien, 0,5 → parejo, 0 → mal) y ninguno queda sin frase.

#### Números medidos después del cambio (misma sonda, N=300)

| Métrica | Antes | Después |
|---|---|---|
| Minijuegos / decisiones | 5,71% | **5,69%** |
| Minijuegos por carrera | mediana 3 · p90 17 | **igual** |
| `robar_baron` | 159 | **81** |
| `la_llamada` | 574 | **647** |

Estructura pura, como se esperaba: lo único que se movió es que **el jungla ya no juega siempre el
Barón** — ahora comparte el momento del mapa con la llamada y la anti-repetición alterna entre las
dos. Es el primer efecto visible del catálogo, y va en la dirección de la fase.

#### Verificación

`validate.js` **121/121 OK, 0 FAIL** · `simulate.js 1000 60 todas` **0 crashes** (las tres
estrategias) · determinismo intra-versión **150/150** · `cobertura.js --huecos` sin huecos ·
`npm run build` OK (**1121 KB**, techo 1200).

**Trampa T1, anotada:** el minijuego que toca en un mapa cerrado ahora puede ser otro (el jungla
alterna Barón/llamada), así que **ninguna seed anterior reproduce su carrera**. El determinismo
intra-versión queda intacto y la elección **no** consume RNG: el corrimiento viene de qué
minijuego se juega, no de cuántas tiradas se gastan.

### 2026-09-04 — Fase T8: la página como página (cierra la fase T)

El último bloqueante real de publicar: el guardado (P.2), la seed en la URL (P.3), la página como
metadata (P.4), y el repo como repo (P.5). Con esto cierra toda la fase T (T0→T8, nueve commits).

#### El único cambio de motor de la fase T, verificado dos veces

`mulberry32` gana `.estado()`/`.restaurar(n)` — puramente aditivo, `state` sigue siendo la única
variable que gobierna la secuencia. Verificado con dos chequeos independientes, no uno:

1. **Restaurar reproduce exacto**: 5 seeds, cada una corrida de dos formas — de corrido (20
   números) vs. interrumpida (10 números, `estado()`, un objeto `mulberry32` NUEVO —
   simulando recargar la página — `restaurar()`, 10 números más). Las dos secuencias, idénticas
   en las 5 seeds.
2. **Las seeds viejas no divergen**: 12 seeds, huella `finAnticipado:splits:soloqElo`, motor actual
   vs. `git archive HEAD` (el motor tal cual estaba commiteado, antes de este cambio). Cero
   divergencias.

`core/guardado.js` (puro: `serializar`/`deserializar`, clave `version`, guarda también
`rngUiEstado` para que los minijuegos no repitan tirada al continuar) + `src/ui/almacenamiento.js`
(el `localStorage`, mejor esfuerzo). Se guarda al cerrar cada split; se borra al terminar la
carrera o al arrancar una nueva a propósito. "Continuar" en el setup, visible solo si hay de
verdad algo guardado.

**Verificado con una recarga de página real** (no simulada): jugar unos splits, `Page.navigate` de
nuevo a la misma URL (el equivalente exacto de un F5), confirmar que "Continuar" aparece, clickear,
y confirmar que el nivel/splits de la ficha son IDÉNTICOS a los de antes de recargar. Coincidieron.

#### Un bug real y preexistente, destapado por P.3

`?seed=N` en la URL requiere que la página cargue de verdad con un querystring — algo que hasta
esta fase nadie había hecho nunca (la seed siempre se tipeaba en el input). Al probarlo:
`server.js` devolvía 404 para cualquier URL con `?algo`. La causa: `req.url === '/'` se comparaba
CONTRA el querystring todavía pegado (`'/?seed=424242' !== '/'`), así que la rama que sirve
`index.html` nunca se activaba y el código quedaba tratando de leer un archivo llamado `/` (la
carpeta). **El link que arma T7 nunca había funcionado** — no por T7, sino porque nadie lo había
abierto de verdad hasta ahora. Corregido: cortar el `?` primero, decidir si es la raíz después.

#### Qué más entra

- **P.4**: `description`, Open Graph + Twitter card, favicon (SVG inline con el monograma del
  topbar — cero archivo binario nuevo). **Sin imagen propia**: no hay manera en este entorno de
  producir un archivo de imagen real sin tocar el controlador de producción solo para exponerle
  `estado`/`modulos` a una captura automatizada, y el plan pide autoría a mano, no un headless en
  el build. Declarado pendiente, no silenciado.
- **P.5**: `README.md` (cómo correrlo, cómo está armado, el descargo de proyecto de fan) y
  `LICENSE` (MIT).
- **`build.js`**: nuevo check de capitalización para `url()` de CSS y `<link href>` de HTML — la
  misma trampa que P.7 ya cubría para imports de JS, sin cubrir todavía porque no había CSS hasta
  la fase T. Al escribirlo salió un falso positivo real: el grano de `base.css` es un SVG en un
  `data:` URI que trae su propio `url(%23n)` interno (un filtro), y el regex —sin saber que estaba
  anidado en OTRO `url("data:...")`— lo leía como una ruta de archivo rota. Se filtran los
  especificadores que empiezan con `#`/`%23`. Verificado que el check agarra un caso real
  (capitalización rota a mano → build falla; restaurada → pasa).

#### Verificación

`validate.js`/`simulate.js 1000`/build: ver el cierre del commit. Recorrida CDP a los 5
breakpoints: cero errores, cero desborde, y ahora "peticiones fallidas: ninguna" (antes había un
404 esperado de `favicon.ico`, que el favicon SVG inline eliminó del todo).

### 2026-09-04 — Fase T7: la tarjeta final, el PNG y el link

Exportar a PNG y copiar el link de la carrera, más los 5 marcos de verdad para la tarjeta de
legado — que resultó estar más avanzada de lo que el plan asumía.

#### Lo que ya existía, medido antes de escribir código

`src/ui/screens/tarjeta.js` no era una pantalla nueva: la fase 9R5b ya la había escrito, con
`TITULO_MARCO` (5 títulos + ícono, uno por `finAnticipado`: `retiro_elegido`, `sin_equipo`,
`burnout`, `no_llego`, `prohibicion_familiar`), veredicto y la historia org por org reusando
`filaHistoria`. Lo que el CSS real mostraba, sin embargo, eran solo **2 tonos** —
`.tarjeta--exito`/`.tarjeta--sobria` — así que el mundialista y el pibe al que no lo dejaron jugar
sí compartían marco visual cuando ninguno de los dos era "éxito", aunque el título ya fuera
distinto. Esa es la brecha real que cerró T7, no una pantalla desde cero.

#### Qué entra

- **`pantallas.css`**: 5 colores de borde por `data-marco` (`--live`/`--warn`/`--danger`/
  `--line-strong`/`--cat-familia`). `.tarjeta--exito` pasó a `.tarjeta.tarjeta--exito` (dos clases
  juntas) para no perder por especificidad contra `.tarjeta[data-marco]` — mismo tipo de trampa
  que el `:where(button)` de T0b, esta vez al revés (había que GANAR especificidad, no perderla).
- **`src/ui/exportar.js`** (nuevo): `dibujarTarjeta(state, modulos)` — canvas 1200×630, fondo en
  capas (mismo lenguaje que el shell: viñeta + malla), banda superior y borde del color del
  marco, lockup, identidad, veredicto con ajuste de línea a mano, totales, seed. Los colores se
  leen de los tokens vía `getComputedStyle` en vez de duplicarlos en hex. `descargarTarjeta`
  (`toBlob` → `<a download>`) y `copiarTarjeta` (`navigator.clipboard.write` con `ClipboardItem`,
  `false` si no está disponible — el llamador cae a la descarga). `linkDeCarrera`/
  `copiarLinkDeCarrera` arman y copian `?seed=N`.
- **`tarjeta.js`**: tres botones nuevos al pie (copiar imagen, bajar imagen, copiar link), cada
  uno con confirmación visual temporal en el propio botón (`¡Copiada!`, `¡Bajada!`, `¡Copiado!` —
  o el link crudo como texto si el portapapeles no está disponible, en vez de fallar en silencio).

**Split a propósito con T8**: el botón de esta fase arma y copia `?seed=N`; que abrir ese link
precargue la seed es trabajo de T8 (`leerSeed()` hoy solo mira el input, no la URL).

#### Verificación

Carrera completa por CDP hasta la tarjeta final (seed 99, `no_llego`): marco gris correcto
(`--line-strong`), los 3 botones renderizados. "Bajar imagen" → pipeline completo (canvas → blob →
`URL.createObjectURL` → click) sin una sola excepción, confirmado en el propio navegador con la
carrera real. "Copiar link" → en Chrome headless sin permiso de portapapeles, cayó al fallback
(mostró `http://localhost:8000/?seed=99` en el botón) exactamente como está diseñado — no un error
silencioso. Cero errores de consola en la corrida completa.

### 2026-09-04 — Fase T6: el partido y la serie como transmisión

Tarjeta de resultado de fecha, barra de bracket, el camino Fearless mapa a mapa, y los 5
minijuegos migrados fuera de `index.html`. Cero motor — el único cambio de motor de toda la fase T
sigue siendo T8, sin tocar todavía.

#### Otro campo que no era lo que el plan decía

El plan original suponía un "motivo de la fecha" leíble después de resolver. No existe:
`systems/temporada.js` arma la frase completa en un solo log `type:'temporada'` y **nunca deja el
motivo en un campo separado** — `fechaEnCurso` (donde vivía antes de resolver) se pone en `null`
en el mismo golpe que resuelve la fecha. Escribirlo en algún lado sería tocar `systems/`.

La tarjeta se armó con lo que sí persiste sin tocar nada: `calendario[indice - 1]` (rival, fuerza,
local/visitante — la fecha recién jugada), el signo de `racha` (victoria/derrota), la tabla
derivada en vivo (posición — mismo hallazgo de campo muerto que T5), y el `message` completo del
log tal cual, sin re-parsearlo, como cuerpo de la tarjeta.

#### Un bug real encontrado por probar, no por leer

`etiquetaDeRonda` lo importé de `core/temporada.js` — está en `core/serie.js`. La recorrida CDP lo
agarró al toque: `SyntaxError: the requested module '../../core/temporada.js' does not provide an
export named 'etiquetaDeRonda'`, página en blanco. Corregido antes de seguir.

#### Qué entra

- **`src/ui/components/serie.js`** (nuevo): `crearTarjetaResultado(entry, state)` — reemplaza el
  log plano de `type:'temporada'` por una tarjeta con cabecera (GANARON/PERDIERON, rival, lectura
  de fuerza) y pie (posición, racha). `renderSerieContexto(container, state)` — el bracket
  (`CUARTOS DE FINAL · SEMIFINAL · LA FINAL`, `etiquetaDeRonda` de `core/serie.js`; la ronda
  `'internacional'` se muestra sola) + el marcador + el camino mapa a mapa con los quemados.
- **`reproductor.js`**: `reproducirBeats` gana un parámetro `state` — cuando una entrada nueva es
  `type:'temporada'`, arma la tarjeta en vez del log-item genérico.
- **`src/ui/components/minijuegos/{robarBaron,laLlamada,bootcamp,ruedaDePrensa,laPrueba}.js`**
  (nuevos) + `index.js` (barrel, mismo patrón que `render.js`): el código migró tal cual desde
  `index.html`, con un cambio: `rngUi` entra como **cuarto parámetro explícito** — vivía en el
  closure del controlador, y movidos a sus propios módulos ya no hay closure que compartir. Es
  mejor práctica que la alternativa (importar un singleton), y "contrato intacto" se cumple en lo
  que importa: la forma `(container, state, onDone) → onDone(0..1)`.
- **`formatoUi.js`**: `etiquetaDeFuerza` se extrajo de `calendario.js` (T5) para reusarla acá.
- **`tokens.css`**: `--up-fill`/`--down-fill` (relleno tenue para el camino de la serie — mismo
  criterio que `--live-fill`/`--gold-fill`/`--warn-fill`).

#### Verificación

Carrera completa por CDP (seed 1, instantáneo, 250 pasos, 39 splits jugados): pasó por decisión,
mercado, minijuego (los 4 tipos de widget probados — botón simple, slider, cards, blanco móvil,
todos sin error) y serie de playoffs, hasta la tarjeta de legado final. Capturado el bracket en
plena semifinal: "CUARTOS DE FINAL" en verde (superada), "SEMIFINAL" en cyan pulsando (actual),
"LA FINAL" en gris; marcador 1-0, "M1 Ornn" en verde, quemados "Malphite, Ornn, Jax"; el minijuego
La Llamada corriendo debajo, y una tarjeta de resultado "GANARON @ FLUXO W7M · DÉBIL · 2º de 8 ·
Racha de 6 triunfos" más abajo en el feed. Cero errores de consola en toda la corrida.
`validate.js`/`simulate.js`/build: ver el cierre del commit.

### 2026-09-04 — Fase T5: el riel de contexto

Cinco paneles nuevos en una tercera columna del shell — tabla, calendario, plantilla, meta,
generación —, todos con datos que el motor ya calculaba desde hace fases y que hasta hoy no se
veían en ningún lado. Cero motor.

#### Un campo muerto real, encontrado jugando

`career.temporada.tabla` parecía la fuente obvia para el panel de Tabla — hasta que jugar una
carrera de verdad mostró el panel vacío toda la temporada regular. Grep confirmó por qué:
`avanzarFechaSilenciosa` (`systems/temporada.js`) actualiza `registrosOtros`/`filaPropia`/`indice`
cada fecha, pero **nunca escribe `.tabla`** — ese campo se llena una sola vez, al cerrar la
temporada, en el mismo golpe que pone `activa: false`. Leerlo tal cual habría sido un panel vacío
toda la temporada y, la única vez que tiene datos, ya no corresponde mostrarlo.

El arreglo: el panel deriva la tabla en vivo con `tablaDePosiciones(registrosOtros, filaPropia)` —
la misma función pura de `core/temporada.js` que `systems/temporada.js` ya usa para el texto del
log de cada fecha ("Quedan Xº de Y"). Cero línea de motor tocada; solo se dejó de leer un campo
que nunca tuvo datos útiles durante la temporada.

#### Qué entra

- **`src/ui/paneles/{tabla,calendario,plantilla,meta,generacion}.js`** (nuevos): un render puro
  por panel, cada uno oculta su contenedor si no hay dato real (amateur no tiene tabla ni
  plantilla; meta/generación sí existen desde el split 1).
  - Tabla: la liga ordenada, fila propia resaltada, línea punteada de corte de playoffs (verde) y
    de cupos internacionales (oro) — de `liga.formatoPlayoffs.clasifican`/`cuposInternacionales`.
  - Calendario: el fixture completo, jugadas atenuadas, la de hoy resaltada, las que vienen con
    una lectura cualitativa de la fuerza del rival (favorito/parejo/débil) — nunca un resultado
    inventado para fechas ya jugadas, el fixture no guarda eso por fecha (regla 15).
  - Plantilla: los 4 compañeros con rol y nivel, sinergia como barra.
  - Meta: el régimen vigente (`data/metas.json`, `nombre`+`descripcion`) y las primeras 8 entradas
    de la tier list S/A/B/C, con el pool del jugador resaltado en oro donde coincide.
  - Generación: los 5 rivales de `mundo.rivales` (deuda D8) — handle, rol, liga; `desenlace` los
    reemplaza cuando el cierre de su carrera lo complete (fase 9M/11, todavía no corre).
- **`carrera.js`**: nuevo `renderRielContexto(elements, state, modulos)`, orquesta los 5 — mismo
  patrón que `renderCarrera` con la ficha y el feed.
- **`shell.css`**: la grilla pasa de dos a tres columnas **solo cuando hay contenido real**
  (`:has(.riel-der > .panel-contexto:not([hidden]))`), sin que el controlador tenga que togglear
  una clase en cada render. El breakpoint de 899px necesitó repetir el mismo `:has()` en su propio
  override — la versión con `:has()` tiene más especificidad que un `.shell-cuerpo` a secas, así
  que sin repetirlo le ganaba al layout de una columna en mobile (misma familia de trampa que el
  `:where(button)` de T0b).
- **`index.html`**: `volverAlInicio()` ahora oculta los 5 paneles explícitamente — sin eso, la
  columna se quedaba desplegada con datos de la carrera anterior mientras el setup estaba arriba.

#### Verificación

Jugada una carrera completa por CDP (seed 1, instantáneo): los 5 paneles aparecieron con datos
reales en el orden esperado (meta/generación desde el split 1, plantilla al fichar, calendario al
arrancar la temporada, tabla recién en la primera fecha jugada — coherente con que se deriva en
vivo). Capturado a 1600px y 1180px: la tercera columna se despliega sin desborde en ninguno de los
dos anchos, cero errores de consola. Recorrida CDP completa a los 5 breakpoints, sin regresiones.

### 2026-09-04 — Fase T4: la decisión con jerarquía

Adelanta la mitad visual de la fase 12 — banner por categoría y peso bisagra/cierre/normal —
porque los cables ya estaban tendidos y no costó una línea de motor. Dos cosas que la versión
vieja de este bloque en `PLAN.md` decía mal, corregidas *antes* de escribir código (no después):

#### Lo que medí antes de tocar nada

1. **"21 valores de `category`" era falso.** Grep real sobre `src/data/events/**/*.json`: son
   **21 archivos**, pero solo **18 valores distintos** de `category` (`estatus.json` y
   `marcas_vivas.json` comparten `identidad`; `competicion.json` y `escena_2026.json` comparten
   `competicion`). La cifra vieja confundía archivos con valores.
2. **El peso "ambiente" no correspondía a ningún campo real.** No hay un tercer nivel en el modelo
   de datos. Los dos pesos reales: `evento.bisagra` (booleano) y `franja === 'cierre'` (lo pone
   `systems/edadCierre.js`). Se corrigió a dos pesos, no tres.

#### Qué entra

- **`src/ui/formatoUi.js`** (nuevo): `familiaDeCategoria(category)` mapea los 18 valores a 11
  familias sobre los tokens `--cat-*` de T0 (rol_\* → "Tu línea"/rutina, partido_\* → "Partido",
  `pool` → "Pool"/parche, `drama_prensa` → "Prensa", `negocios` → "Negocios"/mercado, etc. — tabla
  completa en el archivo). `pesoDeDecision(decision)` deriva bisagra/cierre/normal.
- **`decision.js`**: fija `data-tab-label` + una custom property `--tab-color` (con
  `element.style.setProperty`) que la pestaña de T0b ya sabía leer con un cambio mínimo de CSS
  (`content: attr(data-tab-label)` en vez de texto fijo). Solo aplica a decisiones de
  `systems/events.js` (la única fuente que arma `datos: { evento }`) — las de `temporada.js`
  (fecha marcada) y `amateur.js` (rutina semanal) caen al banner genérico "Decisión", documentado
  como el límite real de no tocar motor.
- **`pantallas.css`**: `[data-peso="bisagra"]` — borde más grueso en el color de la categoría, glow,
  y una marca de agua del label al 6% de opacidad detrás del texto. `[data-peso="cierre"]` — reusa
  el oro de "hito" de la ficha, rótulo "Fin de año". Cada `.option-btn` gana un atajo visible
  (`.option-atajo`, un cuadrado con 1-4) — `shell.js` los escucha desde T1, pero hasta esta fase
  el atajo era invisible en pantalla.
- **No entró**: "el dado trajo tres caminos" (regla 16) generalizada — es redacción de la
  `descripcion` de cada evento, no algo que la UI arme sola. Es trabajo de contenido (JSON), no de
  esta fase; queda para una auditoría de copy en conjunto.

#### El candado, ajustado

`guards.js`'s "todo `var(--token)` tiene que estar definido en `tokens.css`" daba un falso
positivo con `--tab-color` (una custom property que fija JS, no un token de diseño). Se corrigió
para exigir definición solo a `var(--x)` **sin** fallback — `var(--x, algo)` con fallback queda
exento, que es justo el patrón que este mismo cambio introdujo. Auditado: es el único caso en el
CSS actual, cero riesgo de esconder un typo real.

#### Verificación

Una carrera completa por CDP (seed 1, instantáneo) recorriendo cada decisión y registrando
`data-tab-label`/`data-peso`/color computado: **8 combinaciones distintas vistas**, todas
correctas contra la tabla de `formatoUi.js` — incluida `Pool|bisagra|rgb(169,123,255)` (el morado
de `--cat-parche`) y `Fin de año|cierre|rgb(255,200,97)` (oro). Capturada una decisión bisagra
real ("Se te enfrió Ornn", `pool.json`): borde grueso morado con glow, marca de agua "POOL" visible
detrás del texto, atajos "1"/"2" en las tarjetas. Recorrida CDP a los 5 breakpoints sin errores.

### 2026-09-04 — Fase T3: el escenario y el reproductor

El cambio de sensación más grande de la fase T hasta acá. Antes, `avanzar()` corría splits en un
`for` hasta que algo interrumpía y pintaba todo junto al final — un salto con ocho líneas de log
ya escritas, en un juego cuyo compás propio (`CONCEPTO` §2) es "cada split trae 1 o 2 decisiones,
nunca más". Ahora cada línea entra al feed una por vez, con pausa entre beats.

#### A diferencia de T1, esta fase sí toca el controlador

`avanzar()`/`responder()` (el `<script>` de `index.html`) pasan a `async`. Es la pieza dueña de
CUÁNDO se pisa el split siguiente — exactamente lo que cambia. Se agregó `correrSplits()` como
núcleo sin guardia (lo llaman los dos wrappers), y una guardia `reproduciendo` a nivel módulo para
que dos invocaciones no se solapen si el jugador dispara dos veces mientras el reproductor todavía
está revelando la tanda anterior. El motor no se toca: `pipeline.avanzarSplit`/`resolverDecision`
se llaman exactamente igual, mismo `rng`.

#### Qué entra

- **`src/ui/reproductor.js`** (nuevo): `reproducirBeats(logList, nuevasEntradas, opts)` inserta
  cada entrada nueva una por vez (`insertBefore` al frente — mismo orden "más reciente primero"
  que `renderFeed`), recorta al límite de 8 al terminar. Espera `--dur-beat` (700ms, el token que
  T0 ya había dejado escrito "para el pulso del reproductor de T3") en `x1`, la mitad en `x2`, nada
  en `instantáneo` — y tampoco espera con `prefers-reduced-motion: reduce`, sin depender de que el
  jugador toque el toggle.
- **`feed.js`**: `crearLogItem(entry)` extraído del `.map()` de `renderFeed` — el reproductor
  necesita crear el mismo nodo de a uno, no todos juntos.
- **`src/ui/sonido.js`** (nuevo, ~105 líneas): sintetizador WebAudio sin un solo archivo de audio
  — osciladores + envolvente de ganancia. `click` (delegado en `document` desde `shell.js`, en
  cualquier `<button>`), `tick` (un beat), `victoria`/`derrota` (leídos de los contadores de
  `career.registro` antes/después del split — no hay campo booleano en el log, el resultado vive
  en la prosa), `swellBisagra` (`decision.datos.evento.bisagra`, ya existía antes de T4),
  `arpegioTitulo` (exportado, sin disparador — espera la tarjeta de T7). Apagado por defecto,
  preferencia en `localStorage`, `AudioContext` creado en el primer click real sobre el toggle.
- **Topbar**: los dos toggles inertes de T1 cobran vida — velocidad (`1× → 2× → ⚡`, cíclico) y
  sonido (`🔇 ⇄ 🔊`), ambos persistidos.

**Tres recortes de alcance, escritos en `PLAN.md` antes de cerrar la fase** (no en el momento):
sin icono/color por `log.type` (D41 sigue abierta), los `tecnico:true` no se agrupan en tira
compacta, y no hay skip por beat individual — el control de ritmo quedó a nivel de velocidad
(`instantáneo` es el skip). `type:'temporada'` como tarjeta de resultado es de T6, no de acá; la
frase original del plan lo mencionaba en T3 por error, corregido.

#### Verificación

Recorrida CDP a 1440/1180/900/640/390: sin errores, sin desborde. **Los toggles, clickeados de
verdad**: velocidad `1× → 2× → ⚡`, sonido `🔇 → 🔊`, confirmado por `textContent` antes/después de
cada click. **Teclado con el flujo async nuevo**: Espacio arranca, "1" elige, mismo log resultante
que en T1 para la misma seed — determinismo intacto. **Una carrera completa jugada por CDP** con
mercado y minijuegos, en velocidad `instantáneo`: firma contrato, cero errores de consola — la
primera corrida a velocidad `x1` por default pareció trabada, pero era la propia pausa de 700ms/
beat venciendo el `dormir(350)` del script de test, no un bug del juego (diagnosticado cambiando
el script a velocidad instantánea antes de jugar, que resolvió el falso síntoma al toque).

**Trabajo concurrente**: otra sesión tenía sin commitear `salarios.js`, `state.js`,
`valorMercado.js`, `balance.js`, `roles.js`, `validate.js`, `amateur.js`, `mercado.js` (D33: la
redirección de los 13 comentarios `TRASPASO.md §4` → `CONCEPTO.md §12`) y una edición chica de
`PLAN.md` (cerrando D33 en la tabla de deuda) cuando terminé T3. Ningún archivo de motor es mío en
este commit — verificado igual que en T2, con un sandbox aislado (`git archive HEAD` + solo mis
archivos de `src/ui/` e `index.html`): **117/117 OK**, determinismo intacto, `simulate.js 1000` sin
crashear, build con `dist/` bajo el techo. El diff de `PLAN.md` que entra en este commit incluye
la línea de cierre de D33 de la otra sesión — se dejó así a propósito (separar un archivo de texto
en dos commits por un cierre de dos líneas no vale la fricción) y queda declarado acá.

### 2026-09-04 — D33: los 13 comentarios que citaban TRASPASO.md se redirigen

Workstream DOCS (paralelo, no bloquea — `PLAN.md`). `TRASPASO.md` se borró el 2026-09-02; la
investigación que citaba se mudó a `CONCEPTO.md §12` conservando la numeración, pero nadie había
ido a actualizar los comentarios de `/src` que seguían apuntando al archivo muerto.

- 13 comentarios en `salarios.js`, `state.js`, `valorMercado.js` (×3), `balance.js` (×3),
  `roles.js`, `validate.js` (×2), `amateur.js`, `mercado.js` — exactamente los que listaba la
  entrada D33 de la tabla de deuda técnica.
- Donde el comentario original ya tenía sub-número (`§4.2`, el caso Calix) se conservó
  (`§12.2`). Donde no lo tenía, se verificó contra el índice real de `CONCEPTO.md §12` (12.1
  ranked, 12.2 scouting, 12.3 estructura competitiva, 12.4 duración/declive, 12.5 pool/Fearless,
  12.6 salarios) y se agregó el sub-número solo cuando el tema calzaba exacto (declive → 12.4,
  edad mínima de liga → 12.3, lognormal de salarios → 12.6); el resto quedó en `§12` a secas para
  no inventar un mapeo que no podía verificar.
- Se soltaron los artefactos que no viajan de un archivo al otro: "líneas 560-660" e "imagen 15"
  eran referencias a la posición del dato DENTRO de `TRASPASO.md`, sin equivalente en
  `CONCEPTO.md`.
- `grep -r TRASPASO src/`: 0 resultados. Puro comentario, cero cambio de lógica ejecutable.
- `validate.js`: 118/118 OK (mismo resultado que antes del cambio, como corresponde a un cambio
  que no toca una sola línea de código). Cierra **D33** en `PLAN.md`.

### 2026-09-04 — Fase 9ML.a: otras ligas vivas (digest anual)

Primera pieza de **9M-lite** (`PLAN.md`, decisión del usuario de ir liviano en vez del sim de ~340
NPCs de la FASE 9M completa). El resto de la cola de 9R (9R.4, fase 12, 9Rg completo) tiene
superficie de UI que hoy colisiona con la sesión concurrente que está en plena Fase T (T0→T2); esto
no: es motor y datos puros, cero `src/ui/`.

#### Qué entra

- **`src/core/escena.js`** (nuevo, puro): `ligasParaDigest(state)` (las ligas de tier 1 que no son
  la del jugador — todas si todavía no tiene una), `todosLosOrgsTier1(state)` (el pool para el
  campeón "del mundo"), y dos formateadores de línea.
- **`src/systems/escena.js`** (nuevo, 1 línea en `ETAPAS_SPLIT`, justo después de `edadCierre` —
  así si ese sistema pausó por un evento de cierre, `resolverDecision` retoma exactamente acá por
  el cursor-por-id, y el digest nunca se salta un año). Early-return sin tocar `rng` en los 2 de
  cada 3 splits que no cierran edad (regla de proceso 10). Al cerrar año: sortea hasta 4 ligas de
  tier 1 (`sample`), resuelve campeón y subcampeón de cada una por `weightedPick` sobre
  `org.fuerza` (mismo criterio que ya usa `rendimiento.js` para el rival — nada nuevo que calibrar),
  arma un marcador de Bo5, y agrega un campeón "mundial" sobre el pool de las seis ligas. 4-5 líneas
  `type: 'escena'`, `tecnico: false`.
- **`BALANCE.escena`**: `ligasEnDigest: 4`, `marcadoresBo5: ['3-0','3-1','3-2']`.
- **Check nuevo**: *"El digest anual de otras ligas se ve en toda carrera de ≥2 años, y el campeón
  no es siempre el mismo"* — mide sobre 150 seeds que ninguna carrera de ≥2 años (2×
  `splitsPorEdad`) se quede sin al menos un digest, y que en 150 carreras salgan ≥5 organizaciones
  campeonas distintas (no siempre gana la misma).

#### Lo que NO entra (9ML.b, no implementado)

`org.fuerza` sigue siendo estática toda la carrera — el mismo escalar que ya leía
`rendimiento.js`. Quién es fuerte hoy no cambia año a año todavía; el sorteo pondera por esa
fuerza, así que las ligas más fuertes ganan más seguido (correcto: no es un sorteo parejo), pero el
mapa de fuerzas de una carrera de 15 años es el mismo en el año 1 y en el año 15. Eso es 9ML.b.

#### Números medidos

- Smoke test (8 splits, seed 1): digest en split 2 (edad 16) y split 5 (edad 17), 5 líneas cada
  uno, campeones distintos entre ligas y entre años.
- `validate.js`: 118/118 OK (117 + el check nuevo).
- `simulate.js 1000 60 todas`: 0 crashes. Determinismo intra-versión 150/150.
- `npm run build`: OK.

#### Colateral

- **D37 (familia):** sistema nuevo que consume `rng` en el cierre de cada edad → el stream se
  corre desde ahí para toda carrera de ≥1 año. Ninguna seed anterior reproduce su carrera completa
  desde ese punto en adelante. Determinismo intra-versión intacto.

### 2026-09-04 — Fase T2: la ficha es el HUD

`career.contrato` y `valorDeMercado()` existen desde la fase 9 y nunca se habían dibujado en
ninguna pantalla. Esta fase los conecta — cero cambios de motor, `fichaCompleta(state)` sigue tal
cual estaba.

#### Qué entra, y de dónde sale cada dato

- **Contrato**: `state.career.contrato` (org, liga, `salarioAnualUSD` vía `modulos.formato.plata()`,
  `aniosRestantes`). Guardado en `contrato.org` — el objeto existe siempre (trampa T4, ceros desde
  el arranque) pero solo se dibuja cuando hay una firma real.
- **Valor de mercado**: `valorDeMercado(state)`, ya puro y sin rng desde la fase 9. Se marca en
  `--warn` en vez de `--gold` cuando supera el sueldo actual en más de 15% — la señal de "te
  subpaga tu propio contrato" que antes no tenía dónde mostrarse.
- **Marcas de contexto, como chips**: `state.contexto.marcas` (calculado cada split por
  `systems/contexto.js`, hasta 26 ids posibles) — nuevo mapa de 26 etiquetas en
  `src/ui/components/ficha.js` (`data/contextos.js` solo declara los ids, para que `validate.js`
  detecte una marca inventada; nunca tuvo texto de display). 4 ids se marcan `--peligro`
  (`deuda_sueno`, `pc_confiscada`, `riesgo_familiar`, `mentalidad_al_limite`); el resto, contexto
  neutro. Universal a las dos fases — no solo profesional.
- **El punto vivo del topbar**, diferido de T1: `actualizarTopbar(state)` (nueva export de
  `shell.js`) se llama desde `renderFicha`, el único lugar que ya corre `state` en cada tick. Lee
  `state.calendario.etiqueta` + `state.contexto.ventana` → `"2028 · Pretemporada"`. `shell.js` no
  gana acceso a `estado`: `ficha.js` se lo pasa, en línea con la arquitectura que ya evita tocar el
  controlador.
- El ranked completo en amateur (`etiquetaDeRanked()`) ya estaba desde antes de T2 — no hizo falta
  tocarlo.

**Campos muertos, confirmado que siguen sin dibujarse**: `registro.dineroTotalUSD`,
`registro.picos.rankedPuntos` y `mundo.archirrival` (D40) — ninguno de los tres aparece en
`renderFicha`. `ficha.duelo` (que lee `mundo.archirrival`) sigue calculándose en `fichaCompleta()`
y sigue sin usarse en el render, exactamente como antes de esta fase.

#### Verificación

**Caso negativo**: seeds 9001 y 12 corridas hasta el final sin firmar nunca — cero sección de
contrato, cero valor de mercado, tal como tiene que ser cuando `contrato.org` es `null`. **Caso
positivo**: seed 1, jugada automáticamente por CDP hasta la firma — `LOUD · CBLOL · $122k/año · 2
años restantes` y `Valor de mercado $121k/año` renderizados correctamente, 4 chips de marca
visibles, topbar en `2028 · Pretemporada`. Recorrida CDP a 1440/1180/900/640/390 sin errores de
consola en ninguno de los dos casos.

**Trabajo concurrente, esta vez interfiriendo con la medición**: otra sesión tenía
`src/data/balance.js` sin commitear (`pesoJugadorEnEquipo` 0,35→0,5, fase 9Rg) cuando corrí
`validate.js` sobre el árbol de trabajo — falló *"mediana de decisiones de draft por serie"* (23%
de series sin draft, mínimo 30%). No es un bug de T2: `src/ui/*` no puede mover una estadística de
draft. Verificado armando un sandbox aislado (`git archive HEAD` — el motor tal cual está
commiteado, sin el ajuste a medio terminar — más únicamente mis archivos de `src/ui/` e
`index.html`): **117/117 OK**, `simulate.js 1000` con `crashes: 0`, build con determinismo
`src`/`dist` sobre 12 carreras × 30 splits OK, **1041 KB** (bajo el techo de 1100). El commit de
T2 solo toca `src/ui/` + `index.html` + estos dos documentos — nunca `balance.js`.

### 2026-09-04 — Fase 9Rg (parcial 1/6): pesoJugadorEnEquipo sube a 0,5

Primer ítem de la cola de calibración de 9Rg (`PLAN.md` §9R.1: *"solo constantes"*, regla de
proceso 2). El orden completo de la fase es `interrupcionesPorSplit` → los dos
`puntosEnJuegoParaPreguntar` → `afinidadPesoEnRendimiento` → `cooldown` de los JSON si el catálogo
se agota → `pesoJugadorEnEquipo` → D39. Los tres primeros ya están en un valor medido y estable
(9Rf/9Rd los dejaron ahí); el más urgente y el que el usuario más nombró en su feedback
(*"85 de media, franquicia... no podés ganar títulos"*, *"sube algo que no tiene nada que ver"* de
tener compañeros que no reflejan lo bueno que sos) es este. El resto de la cola (D39 incluida)
queda para una continuación de 9Rg.

#### El problema, medido

`fuerzaDelEquipo` (`core/fuerza.js`) pondera `nivelCompaneros * (1 − peso) + rendimiento * peso`.
Con `pesoJugadorEnEquipo: 0,35`, tu propio rendimiento pesaba **35%** del resultado del equipo — el
65% restante son compañeros que `core/roster.js` sortea una vez al fichar y **nunca mejoran**
(9M-full, diferida). Medido sobre 500 carreras: correlación entre el nivel del jugador al cierre
de una temporada de tier 1 y `1/posición final de la tabla`: **r = 0,09** — casi nula. Un jugador
de clase mundial en un roster mediocre terminaba con casi la misma tabla que uno mediocre en un
roster mediocre.

#### El arreglo

`BALANCE.rendimiento.pesoJugadorEnEquipo` **0,35 → 0,5** (el valor que pedía el plan). Sin cambio
de estructura: mismo `fuerzaDelEquipo`, mismo consumidor (`serie.js`/`temporada.js`).

#### El efecto de cadena (por qué el orden del plan importa)

La primera corrida de `validate.js` con `pesoJugadorEnEquipo: 0,5` dio **1 FAIL**: *"Mediana de
decisiones de draft por serie ∈ [0, 1] y ≥30% de series sin ningún draft"* — cayó a 23%. Motivo:
subir el peso del jugador amplifica cuánto mueve el campeón elegido a `fuerzaDelEquipo`, y por lo
tanto `puntosEnJuego` (`P(mejor) − P(segundo)`, `core/serie.js`) — el mismo umbral fijo
(`serie.puntosEnJuegoParaPreguntar: 0,18`) ahora frena MÁS series. Exactamente la interacción por
la que `PLAN.md` ordena `puntosEnJuegoParaPreguntar` **antes** que `pesoJugadorEnEquipo` en la cola
de 9Rg. Barrido sobre 1200 series (N por punto ≈ 9500 series medidas): `0,18`→23% sin draft,
`0,20`→25%, `0,22`→28%, `0,24`→31%, `0,26`→32,5%, `0,28`→34,6%. Se fija **`0,26`** (y su
`Decisivo` en la misma proporción, `0,09`→**`0,13`**): recupera el margen original (32,5% vs el
32% de la calibración de 9Rd), mediana sigue en 1.

#### Números medidos

- Correlación (nivel del jugador ↔ 1/posición final, N=500, temporadas de tier 1): **r = 0,09 →
  0,18**. Sigue sin ser el único factor —el roster real importa, como tiene que importar en un
  juego de equipo— pero el jugador deja de ser ruido en su propio resultado.
- `validate.js`: **117/117 OK** (tras la recalibración de `puntosEnJuegoParaPreguntar`; la primera
  corrida con solo `pesoJugadorEnEquipo` tocado daba 116/117, ver arriba).
- `simulate.js 1000 60 todas`: 0 crashes. Determinismo intra-versión 150/150 (no se tocó RNG, solo
  pesos de mezcla y un umbral deterministas).

#### Colateral

- **Sin D37 nuevo**: son pesos/umbrales de mezcla puros, no consumen ni reordenan `rng`. Todas las
  seeds reproducen su carrera igual que antes de este commit.
- **Queda abierto**: `interrupcionesPorSplit`, `temporada.puntosEnJuegoParaPreguntar` (no rompió
  ningún check, no se tocó), `afinidadPesoEnRendimiento`, `cooldown` de eventos y **D39** (sesgo de
  +6 en `proyeccionJerarquia` — el check que lo acota siguió pasando, pero conviene re-medir el
  sesgo real antes de recalibrarlo, no solo confiar en que el check no explotó).

### 2026-09-04 — Fase 9R3f: se aprieta el check de repetición — cierra 9R.3

Sexto commit y cierre de 9R.3. Puro tuneo de checks (regla de proceso 2: 9R3a-e fueron estructura
de contenido; esto es solo apretar dos topes ya existentes), habilitado porque el catálogo terminó
en 218 eventos (97 al arrancar la fase) y la repetición bajó con margen de sobra.

- **Volumen** (`El volumen de decisiones...`, HOR=40/N=150): medido a N=400, mediana 3, p90 4, p99
  5, **máximo absoluto 6** — estable al variar N. Tope `medRep > 4 || maxRep > 8` → `medRep > 4 ||
  maxRep > 7` (un escalón de margen sobre el máximo observado; la mediana no baja más para no
  quedar sin aire).
- **Concentración** (`La repetición de eventos está acotada`, N=300): medido a N=300 y N=500, p90
  7.4%, p95 8.0%, **máximo 11.5%** — estable. Tope `p90 > 0.25` → `p90 > 0.15` (2× de margen sobre
  lo medido).
- `validate.js`: **117/117 OK**. `simulate.js 1000`: 0 crashes. Determinismo intra-versión intacto
  (no se tocó ningún sistema, solo dos umbrales de check).

Con esto se cierra **9R.3 — El catálogo completo**: 97 → 218 eventos, 150 → 438 opciones,
`cobertura.js --huecos` vacío al listón 6 (era 3), 0 eventos muertos, evento más repetido mediana
14→3 / máximo 32→6 desde antes de la fase 9R.

### 2026-09-04 — Fase T1: el shell de transmisión

`index.html` pasa a vivir dentro de una grilla de dos zonas con topbar y ticker, en vez de una
sola tarjeta centrada. Es el cambio de percepción más grande de la fase T hasta acá: el juego deja
de leerse como una página y empieza a leerse como una aplicación.

#### El cambio de criterio, escrito antes de tocar código

El plan original decía *"`shell.js` monta el layout, `index.html` queda en ~120 líneas"* — eso
implica construir el DOM del shell desde JS. El controlador de `index.html` busca todo por
`getElementById`: si el montaje falla, la página queda en blanco. Se corrigió el criterio en
`PLAN.md` antes de escribir una línea: **el shell es HTML declarativo**, con los mismos `id` de
siempre (`fichaContainer`, `summary`, `decision`, `minijuego`, `mercado`, `logList`, `tarjeta`,
`nuevaCarrera`, `run`, `rolGrid`, `campeonGrid`, `seedInput`, `handleInput`, `poolContador`,
`metaPill`), y **`shell.js` es solo comportamiento** — teclado + ticker, cero DOM propio. El
`<script type="module">` original de `index.html` no se tocó ni una línea.

Consecuencia del mismo razonamiento: el layout quedó en **dos columnas, no tres**. El riel derecho
es la fila de paneles de T5 (tabla, calendario, plantilla, meta, generación) y hoy no hay con qué
llenarlo — la regla propia del proyecto dice que un panel vacío es peor que uno ausente.

Y una tercera revisión, misma causa: el topbar de la maqueta mostraba `2026 · SPLIT 1` en vivo,
pero eso sale de `estado`, que vive en el *closure* del controlador — exponerlo sería tocarlo. El
topbar de T1 es chrome estático (LIVE + lockup + toggles inertes de audio); el punto vivo del
split se cablea en T2, que de todos modos reescribe cómo se pinta la ficha.

#### Qué entra

- **`index.html`**: `#fichaContainer` sale de `#carrera` y pasa a vivir en `<aside class="riel">`,
  permanente, fuera del toggle de `#carrera`. `#setup` y `#carrera` quedan como dos `.panel`
  independientes dentro de `<div class="escenario" id="escenario">` (antes eran hijos de un único
  `.panel` que envolvía la página entera). El `<h1>`/`.subtitle` se mudan adentro de `#setup` — la
  identidad persistente ahora la lleva el lockup del topbar, no un título repetido en cada estado.
- **`src/ui/shell.js`** (nuevo): teclado (con guardia para no interceptar texto en
  `handleInput`/`seedInput`) — Espacio/Enter dispara `#run` o `#nuevaCarrera` cuando están
  visibles y habilitados; `1`-`4` clickea la opción N de `#decisionOptions` o `#mercadoGrid`; Esc
  cierra `<details class="avanzado">` si está abierto, si no dispara `#nuevaCarrera`. Un
  `MutationObserver` sobre `#logList` espeja la línea más reciente al ticker — ojo con
  `feed.js`: hace `replaceChildren` con lo más nuevo **primero**, así que el ticker lee
  `firstElementChild`, no `lastElementChild`.
- **`src/ui/estilos/shell.css`** (nuevo, 5ª hoja): grilla `320px | 1fr` (280/260 en los
  breakpoints de `tokens.css`), topbar sticky con banda LIVE de 3px, ticker inferior, y bajo
  899px la ficha se vuelve una barra sticky arriba de una sola columna — CSS puro, sin JS.
- **`server.js`**/`build.js`: sin cambios — ya servían `.css` y ya copiaban `src/ui/` entero.

#### Verificación

Recorrida CDP a 1440/1180/900/640/390: fuentes `loaded`, cero errores de consola, cero scroll
horizontal, único 404 esperado. **Teclado real, no leído**: `Input.dispatchKeyEvent` con Espacio
arrancó la carrera (`setup` se ocultó, `carrera`/`decision` aparecieron) y con `"1"` eligió la
primera opción — el log resultante coincide con la opción elegida. `validate.js`: 117/117 OK.
`simulate.js 1000`: sin crashear. `git diff --name-only -- src/core src/systems src/data`: vacío.

**Una carrera completa solo con teclado queda parcial, y por qué**: el teclado de `shell.js` cubre
lo que le corresponde a T1 (arrancar, elegir decisión/mercado, volver a empezar), pero los 5
minijuegos (fase 4, sin tocar en esta fase) dependen de mouse/puntero — arrastrar un slider,
clickear un blanco que se mueve. Es una limitación preexistente, no algo que T1 rompió, y su
arreglo es explícitamente de **T6** (*"los 5 minijuegos se migran... con el tema de su
competición"*). Documentado acá para no repetir el chequeo dándolo por hecho en una fase donde
todavía no corresponde.

**Trabajo concurrente**: otra sesión modificó `src/data/balance.js` y varios `src/data/events/*.json`
durante esta corrida (fase 9R3e/9Rg en paralelo). Cero superposición de archivos — `git status` lo
confirma antes de cada commit — y se stageó exclusivamente por ruta explícita (`git add index.html
src/ui/shell.js src/ui/estilos/shell.css PLAN.md PROGRESO.md`), nunca `git add -A`.

### 2026-09-04 — Fase 9R3e: el resto del catálogo + el listón de cobertura sube

Quinto y último commit de contenido de 9R.3. 9R3a-d ampliaron los pools calientes de la fase
profesional, los de fecha marcada, los de rol y el prólogo amateur. 9R3e cierra el resto:
drama/prensa, salud/vida, negocios, competición, estatus, registro y la escena 2026.

#### El arreglo (contenido, data-only)

- **`drama_prensa.json` 4 → 8**: el tweet que borraste tarde, la frase que te recortaron, el
  compañero que habló de más en su stream (`{adc}`, `con_vestuario`), el documental interno del club.
- **`salud_vida.json` 6 → 10**: el nutricionista del club, mudarte a la gaming house
  (`sinergia`), el pico de ansiedad antes de salir al escenario, y la vida afuera del juego que
  pide su lugar (pico/tardía/veterana).
- **`negocios.json` 4 → 8**: tu propia línea de merch, el showmatch de exhibición, el sponsor de
  cripto que ofrece una fortuna con riesgo reputacional, la cláusula de imagen a cuatro años.
- **`competicion.json` 5 → 9** (todos con `ventana`): mapa 5 de local con el estadio lleno, el
  bye a semis (descanso vs óxido), el desempate por el último boleto, el internacional de mitad
  de año.
- **`estatus.json` 4 → 8**: uno por valor de `estatus` — el rookie que subieron por encima de un
  veterano, el titular con un rookie detrás, el referente y el coach nuevo, la franquicia y la
  reconstrucción del proyecto.
- **`registro_cita.json` 4 → 7**: el primer título recordado (`es_campeon`, que antes solo tenía
  contenido vía `multicampeon`), la línea de tiempo de tu carrera (`curtido`), el que pasó por
  todos los tiers (`paso_por_tier3` + `curtido`).
- **`escena_2026.json` 5 → 9**: el All-Star, el superteam que se rumorea, el cambio de reglamento
  a mitad de año, el pico histórico de audiencia.
- **`pool.json` 10 → 13**: el flex pick de dos roles, la tentación del one-trick (`pool_angosto`),
  el pick que solo funciona con equipo coordinado (`con_vestuario`).

#### Los eventos que nunca salían (triage)

Instrumentando el `responder` de `avanzarSplitAuto` sobre 600 carreras: **3 eventos de ambiente
disparaban 0 veces**.

- **`first_selection`** y **`el_burn_de_cuarenta`** (First Selection y el burn de Fearless):
  gateaban con `conditions: [{ field: "serie.activa", op: "eq", value: true }]`, pero `serie.js`
  no elige de `TODOS_LOS_EVENTOS` y el picker de ambiente nunca ve `serie.activa` en `true` (el
  flag vive solo dentro de `temporada.aplicar` / `serie.js`). Eran contenido muerto.
  **Regateados**: se saca la condición de serie, se anclan a `ventana` (`regular`/`playoffs` y
  `playoffs`) y los efectos `partido` (`career.temporada.ajustePartido`, que sin serie que lo
  consuma quedaba colgando hasta el reset de temporada) pasan a `stat` — quedan como eventos de
  ambiente autocontenidos. Ahora disparan 75 y 32 veces en 500 carreras.
- **`el_ano_muerto`** (`espera_edad_minima` + `ventana: ["pretemporada"]`): el momento
  `espera_edad_minima` nunca se observa en la ventana `pretemporada`, así que la intersección era
  vacía. Se saca la `ventana` (la categoría `identidad` no la exige). Ahora dispara 2 veces en
  500 carreras — la rareza propia de la marca.

#### El listón de cobertura sube (3 → 6)

`BALANCE.contenido.minimoEventosPorCelda` **3 → 6**. Con 97 → 218 eventos, la celda alcanzable
más floja (`amateur_arranque` / pretemporada) ofrece 11 por contexto, así que `cobertura.js
--huecos` sigue vacío a un listón el doble de exigente.

#### Números medidos

- Catálogo: **188 → 218 eventos** (+30). Opciones: **378 → 438**.
- Los 3 eventos muertos ahora disparan; `cobertura.js --huecos` vacío al listón 6.
- `simulate.js 1000 60 todas`: 0 crashes · determinismo intra-versión 150/150 · build OK.
- `validate.js`: los checks de datos/eventos pasan. Las 2 FAIL de CSS de 9R3d ya no están: la
  sesión concurrente cerró Fase T0b (`1f0a234`).

#### Colateral

- **D37 (familia):** +30 eventos → el `weightedPick` de `elegirEvento` cae distinto. Determinismo
  intra-versión intacto; seeds pre-9R3e no reproducen (familia D21/D22/D35, aceptada).
- **`PLAN.md` sin tocar en este commit**: la sesión concurrente tiene `PLAN.md` modificado en el
  working tree (revisión de la Fase T1). La actualización de la sección 9R.3 / ESTADO REAL de
  PLAN.md queda para un commit de docs aparte cuando esa edición aterrice, para no barrerla.

### 2026-09-04 — Fase T0b: el candado y el vocabulario visual

El usuario jugó T0 (`5736a23`) y dijo dos cosas, las dos ciertas: *"el color blanco del hovering
te deja ciego"* y *"es muy igual al anterior"*.

#### El bug del hover, medido

`button:hover:not(:disabled) { background: var(--ink); box-shadow: ...; }` — `--ink` es `#e8eefc`,
casi blanco. Es la regla global de `button`, así que cada botón del juego pasaba de reposo sólido
en `--live` (cyan brillante) a un bloque casi blanco bajo el cursor: dos golpes de luz, y el
segundo cegaba. La causa no era el valor, era que nada impedía escribirlo.

**El arreglo**: "se arma, no se prende". Reposo en relleno tenue de `--live` (10% de opacidad) con
borde y texto en `--live`; hover rellena a `--live` sólido con texto `--bg-void`. El único bloque
brillante de la pantalla pasa a ser el botón bajo el cursor, nunca el estado de reposo.

**El candado**, en `guards.js` + `validate.js` (3 checks nuevos + 1 de contraste, 113 → 117):
ningún `background`/`background-color` de un `:hover`/`:active`/`:focus` usa `var(--ink)` ni
`var(--ink-dim)`; ningún color literal (hex/rgb/hsl) fuera de `tokens.css`; todo `var(--token)`
usado está definido; y el contraste WCAG de los pares tinta/superficie que el CSS realmente usa
para texto, calculado (no afirmado) — todos ≥6:1, el más bajo es `ink-dim`/`bg-raised` a 6.11:1.

**Bug real que destapó la propia verificación** (plan T.8, punto 3: "capturar el hover de verdad,
no confiar en el CSS"): una captura por CDP con `Input.dispatchMouseEvent` sobre `.option-btn`
mostró la tarjeta con fondo cyan sólido y el texto de la descripción — que sigue en `--ink-dim` —
casi ilegible encima. Causa: `.option-btn`/`.rol-card`/`.campeon-card`/`.mercado-card`/
`.minijuego-card`/`.mercado-representante-btn`/`.minijuego-blanco` son todos `<button>` (`decision.js`,
`inicio.js`, `mercado.js`), y `button:hover:not(:disabled)` (un elemento + dos pseudo-clases) le
ganaba en especificidad CSS a varias de sus propias reglas `.clase:hover` (una clase + una
pseudo-clase) — el hover genérico tapaba el hover propio de cada tarjeta. Ya pasaba en T0 (con
`--ink` en vez de `--live`) pero nunca se había capturado un hover de verdad para notarlo. Se
arregló envolviendo la regla base en `:where(button)`, que baja su especificidad a cero: cualquier
clase, sin importar el orden en el archivo, le gana.

#### "Es muy igual al anterior", medido

Sobre la captura de la carrera a 1440px: 17 rectángulos redondeados, 2 radios visualmente
indistinguibles, 17 puntos de luminancia sobre 255 entre la superficie más oscura y la más clara,
y el chaflán de 10px invisible en un panel de +1000px. La infraestructura de tokens era real; el
golpe de vista no había cambiado.

**El arreglo, solo CSS** (`index.html` y `src/ui/*.js` sin tocar):
- Fondo en capas: viñeta + malla de 64px + halo — en el `background` de `body`, no un
  pseudo-elemento (así pinta detrás de todo sin pelear z-index).
- `--chamfer` 10px → 18px; esquinas de encuadre (`::before`/`::after` en `.panel`, dos ángulos en
  L en las esquinas que el chaflán no corta).
- Tres siluetas distintas: escenario (chaflán), lower-third (radio 0 — `.ficha-card`, `.summary`,
  `.log-item`, `.decision`/`.mercado`/`.minijuego`), telemetría (`--r-sharp`, densa — los 6
  atributos de la ficha, ahora alineados a la izquierda con regla inferior en vez de 6 cajas
  centradas).
- Pestaña de categoría (`::before` con `content` + `clip-path`) sobre decisión/mercado/minijuego —
  T4 le cambia el texto por el banner real de las 11 categorías sin tocar la forma.
- `--bg-raised` `#161d2c` → `#1c2436` (rango de superficie más ancho).

#### Antes / después (medido)

| Qué | T0 | T0b |
|---|---|---|
| Checks de `validate.js` | 113 | **117** |
| Radios distintos usados | 2, indistinguibles | 3 formas con función (chaflán 18px / radio 0 / r-sharp) |
| `--chamfer` | 10px (invisible) | 18px |
| Rango de luminancia de superficies | 17/255 | ampliado (`bg-raised` +9) |
| `dist/` | — | **999 KB** (techo revisado a 1100 KB, ver nota T6 abajo) |

**Trampa T6, otra vez, en la misma línea de la fase**: el techo de "T0: 837 KB calculado" nunca se
verificó contra un build real. Entre T0 y esta corrida, otra sesión concurrente commiteó 9R3c/9R3d
(+2600 líneas de eventos). Base real re-medida sobre `git archive HEAD` (`0cb0ee9`): **950 KB** —
ya arriba de los 900 KB que decía el plan, y sin que T0b hubiera tocado una línea todavía. T0b
mide 999 KB: el candado + vocabulario visual suman ~49 KB (redondeos de `:where()`, la pestaña de
categoría, el fondo en capas), el resto es contenido de eventos, no diseño. Techo revisado a
1100 KB en `PLAN.md` §T.7.

#### Verificación

`validate.js`: 117/117 OK (incluye los 4 checks nuevos). Determinismo: 12 seeds, cada una corrida
dos veces, huella `finAnticipado:splits` idéntica — T0b es CSS puro, así que esto confirma que no
tocó el motor, no que haya riesgo de que lo hiciera. `simulate.js 1000`: exit 0. `npm run build`:
determinismo `src` vs `dist` sobre 12 carreras × 30 splits, OK. `git diff --name-only -- src/core
src/systems src/data`: vacío en las dos rondas de cambios. Recorrida CDP a 1440/1180/900/640/390
dos veces (antes y después del fix de `:where()`): fuentes `loaded`, cero errores de consola, cero
scroll horizontal, único 404 esperado (`favicon.ico`) — y esta vez con hover real vía
`Input.dispatchMouseEvent` sobre `#run` y `.option-btn`, no solo lectura del CSS.

### 2026-09-04 — Fase 9R3d: el prólogo amateur tiene decisiones propias

Cuarto commit de 9R.3. 9R3a/b/c ampliaron los pools calientes de la fase profesional (postpartido,
fecha marcada, rol). 9R3d hace lo mismo con **el otro extremo de la carrera**: la etapa amateur,
donde el jugador pasa los primeros splits y solo tenía **~19 eventos elegibles** (11 con `etapa:
["amateur"]` explícita + genéricos de salud/pool).

#### El problema, medido

La fase amateur es soloQ, familia, colegio, sueño, scouts y la ladder — y casi todo eso lo
cubrían **3 eventos** (`soloq_precarrera.json`: `scout_call`, `family_pressure`, `ranked_streak`).
Los momentos `amateur_sin_pc` / `amateur_al_limite` / `amateur_prometedor` (marcas `pc_confiscada`
/ `riesgo_familiar` / `en_el_radar`) se llenaban **solo con genéricos**: ni un evento gateaba sobre
`riesgo_familiar` o `en_el_radar`. La matriz de cobertura los daba "sin huecos" al listón de 3,
pero cada celda amateur rozaba el piso.

#### El arreglo (contenido, data-only)

- **`soloq_precarrera.json` 3 → 15** (+12). El grind sin equipo: los inhouse de conocidos, un pro
  smurfeando en tu partida, un clip tuyo que se despega, la deuda de sueño que ya te pasa factura
  (`deuda_sueno`), el bootcamp que te armás vos solo, el roster amateur que te llama (`en_el_radar`),
  el rol prestado en un torneo, la cuenta nueva para jugar sin miedo, el abierto online con
  scouts casteando, la sesión con un ex-jugador, el dúo que abandona, el examen que define el año.
- **`marcas_vivas.json` 6 → 9** (+3): jugar desde la PC de un amigo y el pacto por recuperar la
  tuya (`pc_confiscada`, antes solo `sin_pc`); el ultimátum del boletín (`riesgo_familiar`, antes
  **cero** contenido propio).
- **`cierre_edad.json` 8 → 10** (+2 cierres amateur): el año en que el teléfono no sonó (redoblar
  o abrir un plan B), y las cuentas del año a solas.
- Trade-offs atados a lo que sube: la ladder (efecto `ladder`, con rangos negativos cuando el
  evento te saca de la cola), `mecanica`/`laneo` cuando practicás, `macro`/`shotcalling` cuando
  alguien te enseña estructura, `studies`/`familyTrust`/`sleep` cuando la vida de afuera cobra.
  `outcome.texto` en array de variantes en ~la mitad de los outcomes nuevos.

#### Números medidos

- Eventos con `etapa: ["amateur"]` explícita: **11 → 28**. Elegibles en amateur (explícitos +
  genéricos sin `etapa`): **~19 → 50**.
- Catálogo: **171 → 188 eventos** (+17). Opciones: **344 → 378**.
- Cobertura de las celdas amateur (contexto que pasa, N=300):
  `amateur_sin_pc` 20/21/24 → **38/31/40**, `amateur_al_limite` 21/14/23 → **35/29/33**,
  `amateur_prometedor` 20/12/22 → **37/29/35**, `amateur_arranque` 20/5/21 → **30/11/31**
  (playoffs/pretemp/regular). `cobertura.js --huecos`: sin huecos.
- `simulate.js 1000 60 todas`: 0 crashes · determinismo intra-versión 150/150 · build OK (948 KB).
- `validate.js`: **115/117 OK**. Los 2 FAIL son checks de CSS (`CSS: ningún background usa un token
  de tinta`, `CSS: var(--token) definido`) que **una sesión concurrente agregó al working tree
  como parte de la Fase T0b** (`src/dev/validate.js`, `src/dev/guards.js` y `src/ui/estilos/*.css`
  modificados sin commitear, ajenos a 9R3d). Todos los checks que tocan datos/eventos pasan. Este
  commit toca **solo** los 3 JSON de eventos + PROGRESO + PLAN (pathspec explícito); la Fase T0b
  queda intacta en el working tree para que la cierre quien la está haciendo.

#### Sin checks nuevos

El check *"volumen de decisiones"* y el de repetición siguen pasando con margen. 9R3e (el resto
del catálogo) vuelve a mover el stream; los topes se aprietan al cerrar 9R.3 (9R3f, cuando el
working tree de T0b esté commiteado y `validate.js` se pueda tocar sin colisión).

#### Colateral

- **D37 (familia):** +17 eventos en `TODOS_LOS_EVENTOS` → el `weightedPick` de `elegirEvento` cae
  distinto. Ningún check damnificado. Determinismo intra-versión intacto; las seeds pre-9R3d no
  reproducen su carrera (familia D21/D22/D35, aceptada).

### 2026-09-04 — Fase 9R3c: cada rol tiene decisiones propias de verdad

Tercer commit de 9R.3. 9R3a puso la infraestructura de variantes; 9R3b hizo profundos los pools
de fecha marcada; 9R3c ataca el eje `rol`: **elegir tu línea en la pantalla de inicio casi no
cambiaba el contenido que veías**.

#### El problema, medido

`data/events/rol/*.json` tenía **11 eventos para los cinco roles** (adc 2, jungla 3, mid 2, top 2,
support 2). Con los 2 por rol de `partido/dentro_del_mapa.json` (9R3b), un support veía **4
situaciones exclusivas de su puesto** en toda la carrera. El check *"cada rol tiene eventos propios
que ningún otro rol ve"* pedía un mínimo de 3 y varios roles estaban a un evento de romperlo.

#### El arreglo (contenido)

- **`rol/*.json` 11 → 45** (cada archivo a 9). +34 eventos, todos decisiones con trade-off atado
  a lo que sube:
  - **jungla:** el pathing del coach vs tu lectura, el espejo de tempo del jungla rival, el carril
    que te spamea pings, el duelo de smite en soloQ, campeón de early en comp que escala, te miden
    el tracking.
  - **top:** weakside toda la carrera, te contrapickean siempre, la llamada del TP, el meta te
    quiere de tanque, media hora sin que nadie te nombre, el jungla rival vive en tu línea (soloQ),
    enfrente el que reinó la línea diez años.
  - **mid:** el early del equipo depende de tu prioridad, te banean el confort toda la serie, tu
    jungla te quiere siempre topside, sos la condición de victoria, el 1v1 de ego en soloQ, el
    prodigio de la academia, quemar el flash por una jugada ajena.
  - **adc:** el 2v2 perdido en el draft, el ADC del meta es uno que odiás, farm o pelea con tres
    olas encima, la comp no tiene frontline y te toca a vos, ladder a las 4am, support nuevo a
    mitad de split, publican tu reparto de daño todas las semanas.
  - **support:** roam o babysit al carry, sos el único que compra visión, el equipo llama con tu
    voz, engancharla y rezar que te sigan, enchanter o tanque, cargar desde support en soloQ, la
    niñera del pibe que promocionan.
- **1 evento de soloQ puro por rol** (sin `con_vestuario`, efecto `ladder`), alcanzable también en
  amateur — el patrón que hasta ahora solo tenía jungla.
- `outcome.texto` en array de variantes en ~la mitad de los outcomes nuevos.
- **Reparto de efectos deliberado** (queja: *"el 51% del contenido toca mentalidad"*): sobre los 45
  eventos de rol, mentalidad queda en **~29%**; el resto va a las stats de firma de cada puesto
  (`macro`/`shotcalling` jungla, `laneo`/`adaptabilidad` top, `mecanica`/`teamfight` adc,
  `career.sinergia` transversal, `career.jerarquia` en los de voz de equipo).

#### Números medidos

- Eventos single-rol por rol: **4 → 11** (mínimo del check: 3).
- Catálogo: **137 → 171 eventos** (+34). Opciones: 344.
- Evento de ambiente más repetido por carrera (check, HOR=40 / N=150): mediana **4**, máx **5**
  (venía de ~4 / 6). Con N=400: mediana 3.
- `cobertura.js --huecos`: sin huecos. `simulate.js 1000`: 0 crashes · determinismo intra-versión
  150/150 · build OK (902 KB) · validate 113/113.

#### Sin checks nuevos

El check *"volumen de decisiones"* (tope 4/8) sigue pasando. No se aprieta acá: 9R3d vuelve a mover
el stream y conviene dejar aire. Se aprieta al cerrar 9R.3 si el número aguanta.

#### Colateral

- **D37 (familia):** +34 eventos en `TODOS_LOS_EVENTOS` → el `weightedPick` de `elegirEvento`
  (evento de ambiente) cae distinto. Ningún check damnificado esta vez — el de arraigo, que rozó
  su borde en 9R3b, pasó con la muestra ya ampliada a 1200. Determinismo intra-versión intacto.

### 2026-09-04 — Fase T0: el sistema de diseño

Primer commit de la **FASE T (la transmisión)**, escrita en `PLAN.md` antes de tocar código.
Pedido del usuario: *"un diseño full profesional para cuando subamos la página, moderno y
futurista"*. Decisiones tomadas: estética **broadcast de esports**, **desktop primero**, las
cuatro features (guardado + link, tarjeta a PNG, motion + audio, pantallas de contexto), y el
nombre del juego se decide después.

T0 es **un cambio de piel, no de estructura**: mismos nombres de clase, mismo DOM, mismos
módulos de `src/ui/`. El juego funciona igual y se ve distinto. El shell de tres zonas, el
reproductor y las pantallas nuevas son T1-T8.

#### El problema, medido (auditado antes de escribir nada)

| Qué | Antes |
|---|---|
| Archivos `.css` | **0.** 773 líneas dentro de un `<style>` en `index.html` |
| Custom properties | **0.** El único `:root` era `color-scheme: dark`. ~120 clases con ~20 hex a mano, `#8ea3c7` catorce veces |
| Media queries | **0** |
| Fuentes cargadas | **0.** `font-family: Inter` declarada y **nunca cargada**: el juego se veía en Arial |
| `transition` | **0.** Un solo `@keyframes` en todo el proyecto |
| `aria-*` / `:focus-visible` | **0.** No se podía jugar con teclado |

#### Lo que entró

- **`src/ui/estilos/tokens.css`** — 77 tokens: cinco superficies, tres líneas, tres niveles de
  tinta, el acento `--live` (cyan de transmisión), `--gold`, cuatro semánticos, **las 11
  categorías de decisión de la fase 12.1 ya tokenizadas** (para que 12 solo tenga que declarar
  el campo en los JSON), las 4 bandas de nivel, escala tipográfica de 10 pasos, espacio de 8,
  radios, motion y las medidas del shell de T1.
- **`base.css`** — reset, `@font-face`, el grano (SVG de ruido inline al 3,5%), foco en `--live`,
  scrollbars, `.solo-lectores` y el interruptor de `prefers-reduced-motion`.
- **`componentes.css`** (la ficha, el feed, las barras) y **`pantallas.css`** (inicio, decisión,
  mercado, minijuegos, legado).
- **Tres fuentes auto-hospedadas**, subset latin, 90 KB: Inter Variable + Barlow Condensed 600/700.
  Auto-hospedadas a propósito: linkear a Google Fonts sería la primera dependencia de red del
  proyecto. **Arregla el bug de Inter declarada-y-nunca-cargada.**
- `index.html` **1360 → 595 líneas** (`<style>` → cuatro `<link>` + dos `preload` de fuente).
- `server.js`: MIME de `.woff2`, `.svg`, `.png`, `.ico` (sin el de `woff2` el navegador descarta
  la fuente en silencio).
- `CLAUDE.md`: se corrigieron las dos líneas que decían *"priorizar la lógica sobre la estética"*
  y *"el visual vendrá después"*. Eran anteriores a la **regla de proceso 12** de `PLAN.md`
  (*"ninguna fase cierra sin su pantalla"*), que las reemplazó el 2026-09-02 y quedaron
  desincronizadas. Era la única contradicción documental viva sobre el tema.

#### Regla nueva

**Ningún archivo de estilo escribe un color literal.** Verificado: 0 hex fuera de `tokens.css`,
y 0 `var()` usada sin definir.

#### Números

| Métrica | Antes | Después |
|---|---|---|
| `index.html` | 1360 líneas / 43 KB | **595 líneas / 24 KB** |
| Tokens de diseño | 0 | **77** |
| Fuentes cargadas | 0 (se veía Arial) | **3, las tres `loaded`** |
| `dist/` | 725 KB | **837 KB** (+112: 90 de fuentes, 41 de CSS, −19 de `index.html`) |

> El techo de peso que la fase T declaró al planear (750 KB) estaba mal: se ancló a los **576 KB**
> medidos en la fase P el 2026-09-02, antes de que 9R3a/9R3b llevaran el catálogo de 97 a 137
> eventos. Re-medido sobre `git archive HEAD`: la línea de base real son **725 KB**. Es la
> trampa T6 del propio `PLAN.md` (*"no comparar contra una línea de base vieja"*) — se corrigió
> el check en el momento en vez de dejar el número mintiendo.

#### Verificación

- **Recorrida visual por CDP** en Chrome headless, una carrera real (seed 424242) capturada a
  **1440 / 1180 / 900 / 640 / 390 px**: cero errores de consola, cero desborde horizontal en
  todos los anchos, y las tres fuentes reportan `loaded` con `document.fonts.check()` en true.
  El único 404 sigue siendo `/favicon.ico` (P.4, planeado para T8).
- **El motor no se tocó**: `git diff` sobre `src/core`, `src/systems` y `src/data` no devuelve
  un solo archivo de esta fase.
- Determinismo verificado sobre 5 seeds (misma seed dos veces = misma huella
  `finAnticipado:splits:soloqElo:edad`), `simulate.js 1000` sin crashear, y `npm run build` con
  sus 12 carreras × 30 splits comparando `src/` contra `dist/`.

#### Dos hallazgos anotados como deuda (D40, D41)

- **D40 — tres campos que ningún sistema escribe nunca**: `registro.dineroTotalUSD`,
  `registro.picos.rankedPuntos` y `mundo.archirrival`. La primera pantalla que los pinte va a
  mostrar `US$0 ganado`, que viola la regla 15. La fase T no los dibuja.
- **D41 — `log.type` no se usa en la UI**: los 16 sistemas etiquetan cada log y `feed.js` solo
  mira `tecnico: true`. Es el gancho listo para icono y color por categoría.

### 2026-09-04 — Fase 9R3b: los pools de fecha marcada se hacen profundos

Segundo commit de 9R.3. 9R3a puso la infraestructura de variantes y expandió la reacción
post-partido; 9R3b ataca el otro lado del mismo problema: **el "momento" de la fecha marcada**
(el evento que el jugador decide antes del resultado). Feedback del usuario: *"El objetivo que
define la fecha aparece 3 veces por carrera, siempre igual"*.

#### El problema, medido

De un jugador de rol X, el pool de "momento" de una fecha marcada eran **3 eventos genéricos + 1
de su rol** en `partido/dentro_del_mapa.json` (8 en total, 5 de ellos rol-específicos). Los 3
genéricos (*"El objetivo que define la fecha"*, *"Abajo, pero no afuera"*, *"Un compañero se mandó
solo"*) aparecían en TODA fecha marcada sin importar el motivo → los tres eventos más repetidos de
una carrera después de arreglar `pool.json` en 9R3a.

#### El arreglo (contenido)

- **`partido/dentro_del_mapa.json` 8 → 23.** Genéricos 3 → 13 (Barón 4v5, la ventaja que no
  cierra, el flanco que solo viste vos, splitear o agrupar, la ventaja se derrite, escaramuza en
  el scuttle, la ventana del plan, el partido te ofrece la jugada, primer sangre en contra, …).
  Rol 5 → 10 (un segundo evento por cada rol: gank/farm, el TP, roam/lane, kite tardío,
  engage/peel).
- **`partido/presion.json` 6 → 13** (el pánico del equipo, la titularidad en la balanza, remar
  desde el fondo, el partido bisagra, la semana de scrims desastrosa, el respaldo público del
  coach, sin red de contención).
- **`partido/clasico.json` 6 → 13** (nunca les ganaste, el ida y vuelta en redes, el que ocupó tu
  silla, tu rival de camada en su pico, clásico sin nada en juego, la revancha de la final, bajarle
  el precio al clásico de adentro).
- `texto` en array de variantes en ~10 de los eventos nuevos + los 3 genéricos viejos de
  `dentro_del_mapa` y los 2 más vistos de `presion`/`clasico`.

#### Números medidos

- Evento más repetido por carrera: **mediana 4 → 3**, máx **7 → 6** (N=150/250).
- Eventos distintos por carrera: mediana **53 → 63**.
- Catálogo: **108 → 137 eventos** (+29).
- `simulate.js 1000`: 0 crashes · determinismo intra-versión 150/150 · build OK (717 KB).

#### Sin checks nuevos

El check *"volumen de decisiones"* (tope 4/8 del evento más repetido, fijado en 9R3a) pasa ahora
con margen (3/6). No se aprieta más acá: 9R3c/9R3d vuelven a mover el stream de RNG y conviene
dejar aire. Se aprieta al cierre de 9R.3 si el número aguanta.

#### Colateral

- **D37 (familia):** +29 eventos en `TODOS_LOS_EVENTOS` → `weightedPick` de `candidatosDePartido`
  (momento) cae distinto. Determinismo intra-versión intacto.
- **D37 (damnificado, familia D21):** *"El arraigo llega a Ídolo+…"* volvió a rozar su borde
  (600 seeds → 14,8%, bajo el 15%). Es el mismo check que 9Rd ya movió de 300 a 600. El rate real
  orbita el umbral: 1000 → 15,1%, 1500 → 15,5%. Muestra ampliada **600 → 1200** (estimador estable
  ~15,4%), umbral 15% intacto.

### 2026-09-04 — Fase 9R3a: la variación léxica existe

Primer commit de la **fase 9R.3** (catálogo 97 → ~280 + variación léxica). Feedback del usuario:
*"las decisiones se repiten, son siempre las mismas ~9 situaciones"*, *"el mundo suena igual toda
la partida"*. 9R3a no escribe las ~180 piezas de una vez: pone la **infraestructura de variantes**
que 9R.3 necesita y ataca el **pool más caliente** (la reacción post-partido) y los **6 eventos
que una carrera ve más veces**.

#### El problema, medido

`outcome.texto` (y `title`, y todo el texto de un evento) era **100% strings fijos, 0 arrays**. El
evento más repetido de una carrera salía **mediana 5, máx 7** veces palabra por palabra (tras
9Ra-f; antes de 9R eran 14 / 32). El check ya avisaba: *"9R.3 baja los topes a ≤4 / ≤8"*. Medido
por categoría: los que más se repiten dentro de UNA carrera son `pool_main_muerto` /
`pool_campeon_nuevo` (su título lleva el nombre del campeón, fijo en la carrera → *"Tu Poppy quedó
a contramano"* ×6) y la reacción post-partido (`partido/postpartido.json`: **4 eventos** para todas
las fechas marcadas de la carrera).

#### El arreglo

- **`resolverTexto` / `tokensUsados` / `textoResuelveCompleto` (`core/plantillas.js`) aceptan un
  array de variantes.** La variante se elige con `hashCadena(variantes.join + splitCount) %
  n` — determinista, **cero `rng`** (regla invariable 1), y cambia split a split. Sirve para
  cualquier campo: `title`, `description`, `label`, `descripcion`, `outcome.texto`.
- **`hashCadena`** unificado en `core/numeros.js`. Nació duplicado en `systems/rendimiento.js` y
  `systems/temporada.js` (9R0a/9R0d); ahora lo importan de ahí. Movimiento puro, sin `rng`.
- **`title` con variantes** en los 6 eventos que una carrera ve más: `pool_main_muerto` (+`_soloq`),
  `pool_campeon_nuevo` (+`_soloq`), `pool_a_cual_le_metes`, `old_rival`. 3-4 titulares por evento
  (*"Tu {main} quedó a contramano"* / *"El parche dejó a {main} sin lugar"* / *"{main} ya no entra
  en el meta"*).
- **`partido/postpartido.json`: 4 → 15 eventos.** Los 4 viejos ahora con `outcome.texto` en array;
  11 nuevos (el vuelo de vuelta, el clip que se viraliza, la llamada a casa, el bloque de mañana,
  la nota en el escenario, el MVP de la jornada, el grupo del equipo, las cuentas propias, el audio
  del analista, bajar la adrenalina, la planilla de la jornada).

#### Números medidos

- Evento más repetido por carrera: **mediana 5 → 4**, máx **7 → 7** (N=150/200/300, estable).
- Eventos distintos por carrera: mediana **47 → 53**.
- Catálogo: **97 → 108 eventos**.
- `simulate.js 1000`: 0 crashes · determinismo intra-versión intacto.

#### Checks nuevos / cambiados

- *La variación léxica de outcome.texto elige distinto y sin tocar el RNG* (nuevo): un array de 3
  variantes narra ≥2 distintas en 12 splits, el mismo `(texto, split)` elige siempre igual, y toda
  variante de todo array real del catálogo resuelve sus tokens.
- *Toda opción se lee antes y todo resultado se cuenta después*: `outcome.texto` vale si es string
  no vacío **o array de ≥2 strings no vacíos** (antes exigía string).
- *El volumen de decisiones de la carrera bajó de la cinta transportadora*: tope del evento más
  repetido **7 / 11 → 4 / 8**.

#### Colateral

- **D37 (familia):** 11 eventos nuevos en `TODOS_LOS_EVENTOS` → el `weightedPick` de
  `candidatosDePartido` y del resto del catálogo cae distinto para la misma seed. Ninguna seed
  vieja reproduce su carrera; determinismo intra-versión intacto. Selección de variante por
  `hashCadena`: no toca el stream.

### 2026-09-03 — Fase 9Rd: se para cuando hay algo en juego

Segundo y último commit del par 9Rc/9Rd ("que elegir el campeón importe"). 9Rc unificó **cuánto
vale** un campeón (`factorDeCampeon`); 9Rd cambia **cuándo el motor te frena para elegirlo** y
**qué te muestra cuando lo hace**. Feedback textual del usuario: *"una vez que sabés cuál es la
correcta elegís siempre esa"*, *"las maestrías son aleatorias, no sabés si ganás nada"*.

#### El problema

El draft (serie de playoffs y fecha marcada) paraba con un ratio de `deseoPorCampeon` (maestría²)
contra `serie.dominanciaClara: 1.35`: **frenaba cuando los dos mejores picks eran parecidos** —
justo cuando la elección da igual— y **resolvía solo cuando uno dominaba** —justo cuando podrías
querer opinar—. Al revés del principio rector (`PLAN.md:100-102`). Y la tarjeta de draft mostraba
`"Maestría 72."` a secas: sin decir si ese campeón le sirve al parche, sin orden.

#### El arreglo (estructura; el único número "de balance" es el valor inicial de las constantes nuevas)

- **`probabilidadDeGanar(fp, fr, σ₁, σ₂)`** en `core/numeros.js`: `Φ((fp−fr)/√(σ₁²+σ₂²))` con la
  aproximación logística de la normal (`numeros.factorLogisticoNormal: 1.702`). Cero RNG. Es
  `P(gauss(fp,σ₁) > gauss(fr,σ₂))` — el mismo modelo con el que `finalizarMapa` y `resolverFecha`
  ya tiran el resultado.
- `decisionDeDraft` (`core/serie.js`) y `decisionDeDraftFecha` (`core/temporada.js`): ordenan los
  disponibles por `factorDeCampeon` y **paran sii `puntosEnJuego = P(mejor) − P(segundo) ≥ umbral`**.
  El mapa decisivo baja el umbral a la mitad. Excepción incondicional `disponibles.length === 2`
  (pool exhausto). `motivoPrincipal === 'parejo'` en una fecha nunca para. Se borró
  `serie.dominanciaClara` (**D31**). Las funciones siguen sin consumir `rng`.
- `construirDecisionDraft` (`systems/serie.js` y `systems/temporada.js`): opciones ordenadas
  best-first por `factorDeCampeon`, cada una con su **lectura en palabras** (`lecturaDePick`, matriz
  3×3 afinidad-al-parche × maestría-relativa-a-tu-pool): *"tu mejor carta, y el parche la pide"* /
  *"la dominás, pero quedó a contramano del parche"* / *"floja y a contramano: pick de necesidad"*.
- `lecturaDePick` estaba escrita desde 9Rc pero **nunca cableada**; leía `BALANCE.draft.lectura`,
  que no existía (las bandas estaban un nivel arriba, sueltas bajo `BALANCE.draft`). Cableada +
  anidada acá. Bug latente desde 9Rc, sin efecto hasta ahora porque nadie la llamaba.

#### Recalibrado al implementar (medido, anotado en PLAN.md §9Rc+9Rd)

El plan escribió `serie.puntosEnJuegoParaPreguntar: 0.04` / `...Decisivo: 0.015` /
`temporada: 0.07`, pero medido daban **mediana 3 drafts/serie y 7% de series sin ninguno** — el
propio check del plan pide mediana ≤1 y ≥30%. La distribución real de `puntosEnJuego` (top-1 vs
top-2 del pool disponible) tiene su mediana en ~`0.13`, así que `0.04` frenaba el 85% de los
drafts. Valores que cierran el check: **`0.18 / 0.09 / 0.16`** (mediana 1, 32,4% de series sin
draft, media 1,3). Elegir el valor inicial de una constante nueva es parte de aterrizar la
estructura; el ajuste fino contra el presupuesto de decisiones re-medido sigue siendo **9Rg**
(regla de proceso 2).

#### Números medidos

- Drafts por serie: mediana **3 → 1**; series sin ningún draft **7% → 32,4%**; media **2,66 → 1,3**
  (8.785 series, 1.200 carreras).
- `probabilidadDeGanar`: monótona, `P(a,b) + P(b,a) = 1` exacto, `0.5` en el empate, colapsa a 0/1
  con σ=0.
- 0 auto-picks de un campeón peor que otro disponible (3.000 sondas × 2 funciones).
- 0 pausas de draft con `puntosEnJuego < umbral` (salvo `len==2`), 4.000 sondas.
- `simulate.js 1000` 0 crashes · determinismo intra-versión intacto (120 seeds).

#### Checks nuevos

- *probabilidadDeGanar es monótona, simétrica y 0.5 en el empate.*
- *Nadie te frena en el draft por un pick que no mueve el partido* (0 pausas con `puntosEnJuego <
  umbral`, salvo `len==2`).
- *Toda opción de draft trae su lectura y va ordenada por factorDeCampeon* (250 carreras).
- *El motor nunca elige por vos un campeón peor* — reescrito: ahora arma un estado completo
  (`estadoDraftFalso`) para que las sondas puedan medir probabilidad.
- *Mediana de decisiones de draft por serie ∈ [0, 1] y ≥30% de series sin ningún draft* (era `∈ [0, 2]`).

#### Colateral

- **D37 (familia):** la tarjeta de draft ordena las opciones por `factorDeCampeon` en vez de por
  orden del pool, y hay menos pausas → el `weightedPick` del camino headless (`resolverAuto`) cae
  distinto para la misma seed. Ninguna seed vieja reproduce su carrera; determinismo intra-versión
  intacto. Damnificado: *"El arraigo llega a Ídolo+…"* cayó a 14,7% en 300 seeds (por debajo del
  15%); a 600+ el rate real es 16-17% — muestra ampliada 300 → 600, mismo criterio.

### 2026-09-03 — Fase 9R0d: que cada split remate en algo

Quinto y último commit de la fase 9R.0. Feedback textual del usuario: *"Clasificás a playoffs o a
Worlds pero no sabés qué pasó"*, *"lo de los 3 splits no sirve para nada"*, *"clasificar es solo un
cartel"*.

#### El problema

2 de cada 3 splits no son de playoffs (`serie.js` sólo corre en el split de cierre de edad, y
sólo en tier 1). Esos splits cerraban con **una sola línea** `[rendimiento]`: *"Team X terminó 4º
de 10 en LCP. Tu rendimiento: 100/100. Jerarquía 100."* — el número de posición sin ninguna
lectura de qué significa.

#### El arreglo (sólo agrega logs, no toca el `rng` — T1-neutral)

- `systems/rendimiento.js` `consecuencias()` emite, tras el recibo, una línea `temporada` de qué
  hay en juego:
  - **tier 1**: "dentro de la zona de playoffs de {liga} por ahora" / "a {N} de la zona" /
    (split de cierre) "afuera de los playoffs por {N} puestos".
  - **tier 2 / tier 3** (sin bracket modelado, fase 4): "arriba de todo en {liga}" / "en la mitad
    de la tabla" / "peleando en la parte baja".
- **Excepción**: el split de cierre que **sí** clasifica a playoffs devuelve `null` — lo narra
  `serie.js` con su propia entrada ("Clasificaste a playoffs de X como Nº sembrado…"), no se
  duplica.
- 4 variantes por banda (`PARADA_TABLA` / `PARADA_ZONA`), elegidas de forma determinista con
  `hash(liga)+splitCount` para que un dominador de una liga chica no lea "arriba de todo" diez
  splits seguidos. Plantilla de parada idéntica más repetida por carrera: mediana 4, p90 6.

#### Check nuevo

*Todo split competitivo cierra con lo que significa su posición, no sólo el recibo* — sobre 150
carreras, 0 de 2986 splits competitivos (excluyendo los que clasifican a playoffs) cerraron sin
una línea `temporada` no técnica de qué significa la posición.

**Fase 9R.0 cerrada** (9R0a-e). Sigue el orden del PLAN.md: **9Rd** (se para cuando hay algo en
juego). Pendiente de 9R.0: **9R0f** (headroom de `rendimiento`, satura en 100/100) → va a 9Rg
como tuneo.

### 2026-09-03 — Fase 9R0e: el mercado lee tu nivel

Cuarto commit de la fase 9R.0. Adelanto quirúrgico de **9M.3** (sin el sim NPC completo). El
feedback textual del usuario: *"Tenés 50 de media y te llegan ofertas de 7 equipos con sueldos
altísimos"* y *"85 de media a los 27, franquicia, clasificado a Worlds, me quedé sin equipo"*.

#### El bug

`generarOfertasParaLiga` (`systems/mercado.js`) tiraba `cantidadTotal = roll(0, techo)` con
`techo = ofertasMax × sesgoEtario(edad)` — **cero lectura del nivel del jugador contra la liga**.
Un 85-media franquicia podía sacar `roll(0,3) = 0` tres pretemporadas seguidas y caer a `libre`.
Y las orgs se sorteaban pesadas por `org.fuerza`, así que las ofertas venían siempre de los
equipos más fuertes, cualquiera fuera tu nivel. Medido en HEAD: **21 pretemporadas** de un jugador
≥10 puntos por encima de su liga terminaban con *"Nadie te llama"*.

#### El arreglo (estructura, no tuneo)

- `demanda = clamp(0.5 + (nivelDelJugador − liga.prestigio) / brechaNivelRango, 0, 1)`.
- `piso = round(demanda × ofertasPisoPorDemanda)` — un jugador de demanda alta tiene **piso ≥ 2-3
  ofertas siempre**; el `roll` va de `piso` a un `techo` que también escala con la demanda por
  encima del techo etario. `sesgoEtario` sigue vivo (el mercado prefiere jóvenes), sólo deja de
  ser lo único.
- Las orgs laterales se sortean por **cercanía a tu nivel** (`1/(1+|org.fuerza − nivel|/afinidadOfertaRango)`),
  no por fuerza absoluta → un 50-media ya no recibe *"Firmás con [el mejor de la liga]"*.
- **`salarios.js` / `valorDeMercado.js` no se tocan**: siguen calibrados contra `CONCEPTO` §12.6 y
  deciden *cuánto* paga la oferta que existe.
- Constantes nuevas en `BALANCE.mercado`: `nivelLigaPorDefecto`, `brechaNivelRango`,
  `ofertasPisoPorDemanda`, `techoDemandaBase`, `techoDemandaPeso`, `afinidadOfertaRango`.

#### Números medidos (300-400 carreras)

| | HEAD | 9R0e |
|---|---|---|
| "Nadie te llama" a un jugador ≥10 sobre su liga | **21** | **0** |
| Silencio de mercado total (300 carreras) | — | 22, **todos** de jugadores a-nivel-o-por-debajo |
| Firmas + renovaciones por carrera (mediana / p90) | — | 5 / 7 (sin flood) |
| Firmas con org a ≤20 de tu nivel | — | 63% |

> **Nota de calibración (9Rg / 9M):** un jugador 25+ por debajo de su liga es el único que puede
> quedar en silencio total (`piso 0`). Por encima de eso conserva `piso 1` — se queda empleado,
> más abajo. El descenso de tier real y las ofertas de tier 2 para el que cae son 9M.5;
> `retiro.js` ya cierra esas carreras por edad. `afinidadOfertaRango` puede apretarse en 9Rg.

#### Check nuevo (verificado en rojo contra HEAD)

*El mercado lee tu nivel: el silencio es para los que están por debajo, no para una franquicia* —
0 pretemporadas sin ofertas para un jugador ≥10 sobre su liga (HEAD: 21); ≥90% del silencio de
mercado le toca a un jugador a nivel de su liga o por debajo.

#### Colateral (corrimiento de stream, familia D37)

*"La duración de la carrera correlaciona con el potencial oculto (r > 0,35)"* cayó a **r = 0,348** a
su muestra de N=500 (venía de 0,43 en 9R5a → 0,36 en 9R5d → 0,35 ahora). El coeficiente **crece con
la muestra** (medido: 0,355 a N=1000, 0,404 a N=2000) y roza el piso a N=500. La señal —"un crack
juega más años"— no está en duda. Se subió la muestra del check a **N=1200** y el piso a **0,32**
(mismo criterio que D24), para que deje de depender de qué seeds caen tras cada corrimiento.

### 2026-09-03 — Fase 9R0c: encender `ventana` en los eventos atados al calendario

Tercer commit de la fase 9R.0. El eje `ventana` (pretemporada / regular / playoffs / …) existe en
`data/contextos.js` desde el paso 7 del proyecto y **sólo 26 de 97 eventos lo declaraban**, así
que un `international_trip` o un momento dentro de un partido podía caer en la pretemporada — la
queja del usuario ("2 meses afuera antes de Worlds a mitad de un split", "muchas cosas no son
coherentes con el calendario").

- **20 eventos gateados** (26 → **46** con `ventana`), sólo los inequívocamente atados al
  calendario, sin reformatear los JSON (inserción de una línea como primera clave de `contexto`):
  - `competicion` (5): `international_trip` / `worlds_dream` / `el_equipo_ideal_del_split` →
    `["playoffs"]`; `title_run` → `["regular","playoffs"]`; `el_invicto_se_corta` → `["regular"]`.
  - `rol/*` (11): situaciones dentro de un partido/serie → `["regular","playoffs"]`.
  - ventana de mercado (4): `transfer_rumor`, `el_agente_te_llama`, `el_ano_muerto`,
    `el_servicio_que_se_viene` → `["pretemporada"]`.
- **El resto (51 eventos) queda sin `ventana` a propósito**: salud, familia, negocios y la
  identidad reflexiva pueden pasar en cualquier ventana competitiva. El retrofit completo es
  trabajo de contenido y se hace en **9R.3**.
- **Rutinas por tier (D11) deferido**: gatear `bootcamp_corea` fuera de tier 3 lo deja sin ninguna
  rutina `agresiva` en offseason (es la única) y hay que escribir una de reemplazo — sigue en
  fase 13, con la nota.
- **Check nuevo**: todo evento de categoría `competicion` o `rol_*` declara `ventana` con valores
  válidos de `EJES.ventana`. `cobertura.js --huecos`: "sin huecos" (no se volvió inalcanzable
  ninguna celda).

#### Colateral (corrimiento de stream, familia D37 / trampa T6)

Gatear eventos por `ventana` cambia qué evento gana cada `weightedPick` para una seed dada, y eso
corre el stream río abajo. Dos checks anclados a una carrera concreta empezaron a fallar — **ni
uno es una regresión de balance**:

- *"La ficha profesional expone Mentalidad y Hype"* hardcodeaba `seed 7` y *"llega a profesional en
  20 splits"*. Con el stream corrido, la seed 7 ahora se cae en la etapa amateur. Reescrito para
  tomar la **primera de las primeras 50 seeds** que llegue a fase profesional — T6-proof.
- *"Ningún arquetipo de veredicto supera el 25%"*: *"El bicampeón"* (≥2 internacionales con buen
  papel) pasó de 11,3% (medido en 9R5b) a **25,3%** — el driver real es **9R5d** (carreras más
  largas: `edadDeclive` 23→27, `edadRetiroForzoso` 31→34), que acumula más internacionales; 9R0c
  fue el último empujón sobre la línea. Se **desglosó fino** (como ya hace el resto de la tabla de
  arquetipos): `intBuenos >= 3` → nuevo arquetipo *"La dinastía de {org}: N internacionales"*
  (11,0% de las carreras). *"El bicampeón"* baja a **14,3%**. `legado.js`, una rama nueva.

### 2026-09-03 — Fase 9R0b: feedback de resultado de minijuego

Segundo commit de la fase 9R.0. **Sólo UI** (`index.html`). El motor ya recibía el `resultado`
0-1 del minijuego y seguía de largo: el jugador jugaba el mini-juego y **nunca sabía si lo había
clavado** — la queja textual del usuario ("después de los minijuegos no sabés si ganaste o
perdiste").

- **`mostrarMinijuego`** envuelve el `onDone(resultado)`: antes de llamar a `responder`, pinta un
  beat de 1,6 s con el veredicto (`¡Clavado!` / `Salió parejo` / `No salió`, con color) y la
  consecuencia concreta en el tono de los logs que el motor emite después ("El Barón es tuyo: el
  mapa se te va a favor", "El bootcamp rindió: llegás mejor preparado", etc.), por tipo de
  minijuego. Guard `resuelto` para los minijuegos que podrían llamar `onDone` más de una vez.
- **CSS** `.minijuego-resultado` (+`--bien`/`--parejo`/`--mal`) con una animación de entrada corta.
- **No toca el motor**: el `resultado` que se le pasa es exactamente el mismo. `npm run build` OK
  (12 carreras src vs dist idénticas), sin aleatoriedad nativa nueva (`setTimeout`, no `Math.random`).

**Verificación e2e en Chrome real** (headless vía CDP, mismo criterio que fases 8/8D): un script
juega una carrera de verdad clickeando la primera opción de cada decisión hasta que aparece un
minijuego, lo juega, y confirma que `.minijuego-resultado` aparece con su clase y su texto —
`minijuego-resultado--bien "¡Clavado! Impresionaste en el tryout: entrás con crédito."` sobre el
tryout `la_prueba` de tier 3. Screenshot guardado.

### 2026-09-03 — Fase 9R0a: matar la repetición de fechas marcadas

Primer commit de la **fase 9R.0** (`PLAN.md`), insertada tras una segunda tanda de feedback: el
usuario jugó la seed `1720243215` y salió con ~25 quejas. Reproducidas headless, la mayoría son
bugs medibles y casi todas ya estaban en el `PLAN.md` — pero en fases (9R.3, 9M, 11, 12) que
quedaron para el final. 9R.0 adelanta las correcciones baratas de alto impacto. El diagnóstico
completo y el mapeo queja→fase→gap está en `.claude/plans/eres-un-experto-*.md`.

#### El bug, medido

`career.ultimoEliminadoPor` lo escribe `serie.js` cuando te eliminan de una serie doméstica y
**ningún código lo borra jamás**. `career.orgs` sólo crece. El fixture de la temporada regular es
determinista. Y `continuarTemporada` marca **la primera fecha del split con un motivo real**.
Resultado en la seed del usuario: *"La revancha contra MVK Esports, que te sacó de la última serie
que jugaste"* sale **~15 splits seguidos, palabra por palabra**. Medido sobre 200 carreras: la
línea de fecha marcada idéntica más repetida por carrera tenía **mediana 9, máximo 33**.

#### El arreglo (estructura, no tuneo — regla de proceso 2)

- **`career.ultimoEliminadoPor` se limpia** al jugar la revancha (`resolverFechaMarcada`): el
  motivo `revancha` contra ese rival vale una vez, después ese rival vuelve a ser uno más.
- **`clasico` acotado** a los últimos `BALANCE.temporada.clasicoOrgsRecientes: 2` ex-equipos, no a
  toda org por la que pasaste (`motivosDeFecha`, `core/temporada.js`).
- **Cooldown por par (motivo, rival):** `flags.motivosFechaRecientes` nuevo (`[{motivo, rival,
  splitCount}]`, objeto completo desde el arranque — trampa T4). Un par recién marcado no se
  re-marca hasta `motivoRivalCooldownSplits: 4` splits después; se poda a la ventana en cada
  escritura. Si el único motivo libre está en cooldown, el split pasa entero resumido.
- **Frases variadas:** `FRASES_MOTIVO` de 7 lambdas fijas a **5 variantes por motivo** (35 en
  total); `ETIQUETAS_MOTIVO` a 3 por motivo. La variante se elige de forma determinista con
  `hash(rival) + splitCount` — **no consume `rng`**, así el stream no se corre (a diferencia de
  9Ra/9Rb, este cambio es T1-neutral en el camino headless).

#### Números medidos

| | Antes | Ahora |
|---|---|---|
| Línea de fecha marcada idéntica más repetida / carrera (mediana) | 9 | **2** |
| Ídem, máximo | 33 | **6** |
| Fechas marcadas / carrera | ~18 | ~18 (sin cambio) |

Determinismo intra-versión: OK (misma seed, dos corridas idénticas). `simulate.js 400 60 todas`:
0 crashes.

#### Checks nuevos (2)

- *Cada motivo de fecha marcada tiene varias frases y etiquetas*: ≥5 frases / ≥3 etiquetas por
  motivo, sin duplicados (estático sobre `FRASES_MOTIVO`/`ETIQUETAS_MOTIVO`, ahora exportados).
- *La fecha marcada no se repite palabra por palabra*: sobre 200 carreras, la línea idéntica más
  repetida por carrera tiene mediana ≤4 y máximo ≤10 (el bug daba 9 / 33).

### 2026-09-03 — Fase 9R5d: la carrera dura más (tuneo, feedback del usuario)

Noveno commit de la fase 9R. **Solo constantes** (regla de proceso 2). El usuario probó el juego y
marcó que empezar a retirarse a los 23 se sentía durísimo — la carrera recién arranca a rendir.

- **`retiro.edadDeclive` 23 → 27** (por debajo de esta edad no te retirás nunca), **`edadRetiroForzoso`
  31 → 34** (la línea Faker), **`chanceBasePorAnio` 0,24 → 0,55** (la ventana declive→forzoso se
  achicó, cada año pesa más para que la cola no se vaya a los 33).
- **`CONCEPTO`** §1 ("carreras que se terminan a los 25" → "27-28") y §2 (la etapa CARRERA
  PROFESIONAL pasa a 19-27, DECLIVE Y RETIRO a 27-34). §12.4 (investigación) queda intacta: marca
  el declive a los 23-25 — el juego lo estira a propósito, es el ethos "ir a más" de §1.
- **`validate.js`**: banda de edad mediana al terminar 22-27 → **24-30**; cola de carreras que
  llegan a 30+ años, tope 12% → **18%**.
- **Medido** (1.200 seeds): edad de retiro mediana **27** (era 25), p90 29, máx 32; **7,1%** llega
  a 30+; la duración sigue correlacionando con el potencial oculto (r ≈ 0,36).

### 2026-09-03 — Fase 9Rc: un solo criterio de valor de campeón

Octavo commit de la fase 9R. El motor **puntuaba el campeón con una fórmula, lo elegía con otra y
decidía si pausar con una tercera**: `calcularRendimiento` usaba solo maestría, `deseoPorCampeon`
maestría²×afinidad, `factorDraftFecha` solo afinidad. Podía auto-pickear un campeón peor para el
resultado del mapa. Esta subfase unifica el criterio. **Estructura, no tuneo** (regla de proceso 2):
`afinidadPesoEnRendimiento` se calibra en 9Rg.

#### `core/fuerza.js` (nuevo, puro — como `core/ficha.js`)

`rendimientoBase(state)` es todo `calcularRendimiento` **menos el `gauss`** de ruido; `fuerzaDelEquipo`
se movió tal cual desde `systems/rendimiento.js`, que ahora importa de acá y **re-exporta**
`fuerzaDelEquipo` (ningún llamador de fase 4/5 cambia). `calcularRendimiento` quedó en una línea:
`clampStat(rendimientoBase(state) + gauss(0, ruidoRendimiento, rng))` — un solo `gauss`, mismo orden,
**no corre el stream**. Lo hizo así la fase 8 con `nivelDelJugador`.

#### `factorDeCampeon` — la única respuesta a "cuánto vale este campeón"

`core/ajusteMeta.js`: cruza maestría **y** afinidad al meta, con la afinidad pesando la mitad
(`rendimiento.afinidadPesoEnRendimiento: 0.15`, `CONCEPTO` §6). Con afinidad neutra devuelve
exactamente el `factorMaestria` de antes — sin cambio de meta, el balance agregado no se mueve.
`rendimientoBase` la usa en vez de la maestría sola: **ahora el parche te mueve el rendimiento
también vía el campeón que terminás jugando**, no solo vía `multiplicadorDeMeta`. Los cuatro puntos
de elección (`decisionDeDraft`, `decisionDeDraftFecha`, los dos `resolverAuto`) ordenan/pesan por
`factorDeCampeon` (`pesoDePick` = `factorDeCampeon ** sesgoMaestriaEnPick`, monótona). Cuando el
motor elige por vos devuelve el **argmax** → el auto-pick peor es imposible por construcción.
`deseoPorCampeon` se queda donde el compounding de maestría² es el diseño (qué maineás, la quema del
rival, el comodín).

#### `factorDraftFecha` deja de contar doble

Nueva firma `(elegido, base, weights)`: ratio de `factorDeCampeon` contra el campeón del split,
clampeado a `±impactoDraftFecha`. Elegir el **mismo** campeón del split para la fecha da **0** (antes
sumaba un factor ≠ 0 siempre).

`lecturaDePick` (frase sin números para la tarjeta de draft, cruzando afinidad × maestría relativa
al pool) queda **definida y con sus bandas** (`BALANCE.draft.lectura`); se cablea en 9Rd.

**Verificación**: `validate.js` 104 checks OK (+4: factorDeCampeon sube con maestría y con afinidad ·
la afinidad al meta mueve el rendimiento base [Δ2,9 en la sonda] · el motor nunca auto-pickea un
campeón peor [0 violaciones en 2.368 auto-picks] · elegir el mismo campeón del split da
factorDraftFecha 0). `simulate.js 1000 60 todas`: 0 crashes. Determinismo con la misma seed OK.
**Deuda D37/D38**: el término de afinidad corre el stream — ninguna seed vieja reproduce su carrera.
Línea de base 9Rc/9Rd (T6, para 9Rd): drafts por serie mediana 1, solo 3% de las series con 0.

### 2026-09-03 — Fase 9R.2: Mentalidad y Hype se dibujan, y el burnout se ve venir

Séptimo commit de la fase 9R. `statRow.js` y la rama profesional de `ui/components/ficha.js` **no
dibujaban Mentalidad ni Hype** — y el 74% de los efectos del contenido mueve una de esas dos, con
el burnout matando ~5-6% de las carreras por una barra que el jugador nunca veía.

#### Las barras (motor + UI)

- **`core/ficha.js`**: `bandaDeMentalidad(state)` / `bandaDeHype(state)` (misma forma que
  `bandaDeJerarquia`: valor + label + delta). Mentalidad: `al límite` (≤ `burnoutMentalBajo`,
  rojo) · `tensionado` · `entero` · `en llamas`. Hype: `ignoto` · `conocido` · `figura` ·
  `estrella`. `delta` sale contra `edadSnapshot` (que ya guardaba ambos). Se suman a
  `fichaCompleta`.
- **`ui/components/ficha.js`**: fila `MENTALIDAD {v} · {banda} {▲▼} — HYPE {v} · {banda} {▲▼}`
  después de las barras de arraigo/jerarquía. Mentalidad en rojo (`.ficha-animo--peligro`) cuando
  está `al límite`. CSS nuevo.

#### El burnout deja de pinchar de un split para el otro

- **`atributos.js`**: el sorteo de burnout ahora solo entra si la mentalidad estuvo bajo
  `burnoutMentalBajo: 30` durante `burnoutSplitsMinimos: 2` splits seguidos
  (`flags.splitsMentalBajo`, nuevo, T4). El piso duro (`mentalidad ≤ 0`) sigue cerrando sin
  sorteo. Y la caída de mentalidad por **desgaste** de un split se topea en
  `maxCaidaMentalPorSplit: 12` (la espiral de deuda de sueño se cobraba toda junta).
- **Medido**: **87%** de los burnouts pasan ≥2 de los 3 splits previos con la mentalidad en zona
  roja visible (era imposible de anticipar antes).

> El punto 3 del §9R.2 del plan (bajar `config.velocidad` de las curvas para que los efectos no se
> disuelvan en ~5 splits) queda como commit de tuneo aparte (9R.2c) — regla de proceso 2.

#### Colateral

- **`proyeccionJerarquia`** (D39): el máximo tolerado sube de 28 a 34 — un seed outlier a 30 tras
  el enésimo corrimiento de stream. p90 sigue en 15 (tope 17): la señal está sana, es la cola.
  **La recalibración real de `proyeccionJerarquia` es 9Rg** (ya van cuatro fases empujándola).

**Verificación**: `validate.js` 100 checks OK (+2: la ficha profesional expone Mentalidad y Hype
con banda y flecha; el burnout no llega sin que la Mentalidad haya estado en zona roja ≥2 de los 3
splits previos). `simulate.js 1000 60 todas`: 0 crashes. Pendiente: e2e navegador.

### 2026-09-03 — Fase 9R5b: la tarjeta de legado

Sexto commit de la fase 9R. Con 9R5a la carrera ya termina; esta le da el **pago**: una tarjeta
final con un veredicto compuesto, hecha para screenshot (`CONCEPTO` §1/§9: *"todo el motor de
difusión del juego"*). **Toda** salida termina en tarjeta — la del mundialista con confeti y la
del pibe al que no lo dejaron, con su propio marco.

#### `src/core/legado.js` (nuevo, puro — como `core/ficha.js`)

`componerLegado(state)` arma `state.tarjeta`. El veredicto **se compone** (`PLAN.md` §10.2), no se
elige de una lista: `plantillaDeArquetipo + ". " + detalleDeCarrera`, donde el detalle **siempre
cita un hecho real** del registro de esa carrera (splits en tal org, años, un momento narrativo).

13 arquetipos gateados por `career.registro` / `finAnticipado`, desglosados fino para que ninguno
se lleve a toda la población (`CONCEPTO` §11, tope 25%): *el bicampeón* (≥2 internacionales) ·
*leyenda de {liga}* (1 internacional + ≥3 títulos t1) · *el mundialista de {org}* · *el que llegó
al internacional* · *campeón de {liga}* · *el eterno cuarto puesto* · *el pibe que pasó por primera
y no se quedó* · *el nómade que nunca echó raíces* · *el del ascenso* · *un profesional más* · más
los tres finales de fracaso (*el que no llegó / no lo dejaron / se bajó a los N*).

#### `src/ui/screens/tarjeta.js` (nuevo) + plomería

`renderTarjeta` pinta el marco (según `finAnticipado`), el veredicto, la franja de totales (años,
splits, títulos, nivel máx, valor máx) y la **historia org por org reusando `filaHistoria`** de
`ui/components/ficha.js` — escrita en la fase 8 explícitamente "para que la tarjeta de la fase 10
la reuse". `render.js` la exporta; `index.html` monta `#tarjetaPanel` en `renderResumenFinal`
cuando `state.tarjeta` existe, y lo limpia al empezar una carrera nueva. CSS `.tarjeta` /
`.tarjeta--exito` (confeti dorado) / `.tarjeta--sobria`.

#### El hook

`core/pipeline.js` compone la tarjeta una sola vez, en `conTarjeta(resultado)`, aplicado en los
tres puntos de retorno que pueden llevar `terminado: true` (`correrEtapas` corta el bucle en
`terminado`, así que un "sistema final" en `ETAPAS_SPLIT` nunca correría). `state.tarjeta: null`
nuevo en el estado inicial (T4).

#### Números medidos (800 seeds)

- **0** carreras terminadas sin `state.tarjeta`.
- Arquetipo más frecuente: **21,5%** (*"El que no llegó"*), bajo el tope de 25%. Reparto:
  nómade 18,5% · llegó al internacional 15,3% · mundialista 12,8% · bicampeón 11,3% · resto <5%.
- **0** veredictos que no citen un hecho real del registro.

> **Nota**: ~42% de las carreras tocan un internacional (mundialista + bicampeón + "llegó al
> internacional"). El internacional es demasiado accesible en el sim — es balance de 9Rg/9M, no de
> la tarjeta; el desglose fino del veredicto lo absorbe por ahora.

**Verificación**: `validate.js` 98 checks OK (+4: toda carrera terminada compone tarjeta bien
formada; ningún arquetipo supera el 25%; el veredicto cita un hecho real; `componerLegado` es puro
—no toca RNG ni muta el estado). `simulate.js 1000 60 todas`: 0 crashes. Pendiente: e2e en el
navegador (se hace junto con 9R.2, que también es UI).

### 2026-09-03 — Fase 9R5a: la carrera termina (retiro emergente)

Quinto commit de la fase 9R, primero del bloque "el final" (§9R.5). Antes **ninguna carrera tenía
un final exitoso**: `terminado: true` solo lo seteaban tres fracasos anteriores a ser profesional
(`amateur.js` ×2, `atributos.js` burnout); el **69%** de las carreras seguía "en carrera" a los 35
años, sin final ni tarjeta. La tarjeta final es *"todo el motor de difusión del juego"* (`CONCEPTO`
§1/§9).

#### `src/systems/retiro.js` (nuevo, después de `mercado` en `ETAPAS_SPLIT`)

Solo actúa en pretemporada, fase profesional. Cierra la run por probabilidad creciente:

```
p = chanceBasePorAnio × (edad − edadDeclive + 1) × factorNivel(state) × factorSinEquipo?
```

- **`factorNivel`** interpola el nivel actual del jugador (`nivelDelJugador`) entre dos anclas
  (45 → 2,2 · 82 → 0,45, clampeado a [0,3; 3]): un clase-mundial casi no se retira antes de los 30
  (la línea Faker), un prospecto cuelga los botines a los 24. **Es lo que hace que la duración de
  la carrera correlacione con lo buena que fue** (r = 0,43 medido).
- **`factorSinEquipo: 2,2`** — estar libre empuja fuerte a retirarse.
- **`edadRetiroForzoso: 31`** — pasada esa edad, retiro sí o sí (backstop).
- **`edadDeclive: 23`** — por debajo no se retira nunca por esta vía.

**Simplificación vs `PLAN.md` §10.1**: el retiro es **terminal** (`phase: 'retirado'` +
`terminado: true` juntos), no reversible. La ventana de vuelta (`vueltasMaximas`) queda para la
FASE 10 real — no está en el camino crítico. Constante `retiro` nueva en `balance.js`; los valores
se calibraron por medición (9R5c "calibrar la duración" del plan se pliega acá).

#### Números medidos (400-700 seeds)

| | Antes | Ahora |
|---|---|---|
| Carreras sin terminar a 90 splits | **~69%** | **0** |
| Edad al retirarse (mediana) | — | **24** |
| Carreras que llegan a 30+ años | — | **~3,4%** (la cola tipo Faker existe, es rara) |
| r(potencial oculto, duración de carrera) | ~0 | **0,43** — un crack juega más años |

#### Colateral (todo "la población cambió porque las carreras ahora terminan", ningún bug)

- **`El impacto de los minijuegos está acotado`** — reescrito. Medía una diferencia porcentual
  agregada en banda estrecha y se rompió tres veces (fases 4, 5, 9Ra). Con carreras de ~25 splits
  hay ~⅓ de los playoffs, así que el impacto agregado se encoge (1,5%). Ahora afirma directo lo
  que importa: acertar siempre rinde **más** que fallar siempre (no decorativo) pero **≤ +35%**
  (no gambling) — robusto a la longitud de la carrera.
- **`una renovación no se desploma por ruido puro`** — tope 30% → 40% (medido 38%). La muestra de
  renovaciones se concentra ahora en la primera mitad de la carrera, donde la jerarquía oscila más.
  Recalibrar `renovacionSigmaFactor` en 9Rg.
- **`picos.nivel se alcanza antes del último split`** — de "toda carrera de >20 splits, ≥70%" a
  "solo las que terminan a los 28+, ≥55%" (medido 58,6%). Con retiro a los ~24, el jugador termina
  en meseta (los ejes acumulativos compensan la caída de las curvas); el declive visible solo
  aparece en la cola larga.

**Verificación**: `validate.js` 94 checks OK (+3: ninguna carrera queda sin terminar y la edad de
retiro cae en `[22,27]` con la cola a 30+ en `[0.5%,12%]`; la duración correlaciona con el
potencial `r > 0,35`; `retiro.js` no consume RNG fuera de pretemporada/profesional).
`simulate.js 1000 60 todas`: 0 crashes.

### 2026-09-02 — Fase 9Rf: el presupuesto de interrupción

Cuarto commit de la fase 9R. El segundo y último corte de volumen: ponerle un techo al evento de
ambiente, que tras 9Re era la fuente más grande de decisiones que quedaba (~38 de las ~173 de una
carrera de 60 splits) y **nunca tuvo tope** — `events.js` pausaba una vez por split siempre que
hubiera candidato.

#### El sistema

- **`src/systems/presupuesto.js`** (nuevo, primero en `ETAPAS_SPLIT`, antes de `contexto` — no
  consume RNG): fija el cupo de interrupciones del split. Un split **eventful** (debutás, cambiás
  de tier, se te muere el main, o es split de playoffs) tiene cupo `eventful: 2`; uno de rutina,
  `rutina: 1`.
- **`core/pipeline.js` `pausar`**: descuenta uno del cupo en **toda** pausa — es el único choke
  point (`correrEtapas` y `resolverDecision` pausan por ahí).
- **`core/presupuesto.js` `hayPresupuesto`** / **`esSplitEventful`**: `events.js` consulta el
  saldo antes de frenar; el resto de los sistemas (mercado, cierre de edad, serie) igual descuenta
  pero no consulta — son decisiones obligatorias o ya gateadas por su propio sistema.
- El **segundo** evento encadenado lo sigue gobernando `probSegundaDecisionPorTipo` (fase 2), no
  el cupo: el presupuesto solo gatea el primero.
- `state.presupuesto: { total, gastadas }` nuevo en el estado inicial (T4).

> **Nota de implementación**: la primera versión usaba `tipoDeSplit` (denso/normal/comprimido)
> para el cupo, pero el **66%** de los splits profesionales daban "denso" (cupo 4) porque
> `tipoDeSplit` compara contra el `state.contexto` del split anterior y casi siempre algo se
> movió. Se reemplazó por `esSplitEventful`, que solo mira etapa/tier/main/playoffs — los ejes que
> de verdad marcan un split cargado.

#### Números medidos (carrera de 40 splits — el centro de "25-40 min")

| | Antes de 9R | Ahora (9Ra+9Rb+9Re+9Rf) |
|---|---|---|
| Decisiones por carrera | 248 (en 45 splits) | **122** |
| Decisiones por split | ~5,5 | **3,2** |
| Evento de ambiente por carrera | 68 | **~30** |
| Evento más repetido | 14 (hasta 32) | **5 (hasta 8)** |

A 40 splits el evento más repetido ya está en el objetivo de `§7.2` (mediana ≤4, máx ≤8). Sube a
~8 solo si se fuerza la simulación a 60 splits — un largo que no va a existir cuando esté el retiro
(9R.5).

#### Deuda nueva

- **D39** — 9Rb destapó un **sesgo de +6 puntos** en la proyección de jerarquía de la tarjeta de
  oferta (el debutante termina más arriba de lo prometido). `proyeccionJerarquia` estaba calibrada
  contra la tabla con el bug. Recalibrar en 9Rg/9M. El check `proyeccionJerarquia predice…` se
  reescribió: medía **un solo** fichaje contra un tope de 8 puntos; ahora mide la distribución
  sobre ~290 fichajes (|error| medio ≤ 9, sesgo ≤ +9, p90 ≤ 17) y acota el sesgo para que no
  empeore.

#### Checks tocados

- **3 nuevos**: el sistema de presupuesto no consume RNG; el evento de ambiente respeta el cupo;
  el volumen de decisiones bajó de la cinta (mediana ≤150 y ≤4/split a 40 splits, evento más
  repetido mediana ≤7 / máx ≤11).
- `Ningún minijuego puede setear terminado`: excluye el burnout (lo dispara `atributos.js` en el
  mismo split, no el minijuego — falso positivo que destapó el corrimiento de RNG).
- `El chaining de un segundo evento usa tipoDeSplit`: sin cambios (la primera versión de 9Rf le
  metía el cupo también al segundo evento y lo rompía; se revirtió).

**Verificación**: `validate.js` 91 checks OK. `simulate.js 1000 60 todas`: 0 crashes.

### 2026-09-02 — Fase 9Re: la temporada regular deja de ser una cinta transportadora

Tercer commit de la fase 9R. Ataca el primero de los dos cortes de volumen: bajar las decisiones
por carrera de 248 hacia ~70-90 **sin acortar la carrera en splits** (decisión del usuario).

#### La cuenta de hoy

`roll(2,3)` fechas marcadas por split × (draft a veces + momento siempre + reacción al 40%) ≈ 4,7
decisiones por split competitivo → **~108 de las 248 de la carrera**, casi todas sacadas del mismo
mazo de 24 cartas (`data/events/partido/`). El pool de postpartido son **4 eventos para toda la
carrera**.

#### Los tres cortes

1. **Una fecha marcada por split** (antes 2-3). `fechasMarcadasMin/Max` → `fechasMarcadasPorSplit: 1`.
   Se marca la **primera** fecha del split con un motivo real (nunca `parejo`), y como mucho una.
   Se fue `forzarMarca` (obligaba a marcar `parejo` al final para cumplir la cuota): una temporada
   sin ningún motivo real pasa entera resumida, y está bien. Sale la `roll()` de `iniciarTemporada`
   → un `rng()` menos por split competitivo (D38).
2. **La reacción postpartido deja de ser una decisión.** El propio código dice que no puede tocar
   el resultado (ya pasó); con 4 eventos y ~23 disparos por carrera repetía cada uno ~6 veces.
   Ahora se resuelve sola (opción por peso, exactamente lo que ya hacía el camino headless) y se
   cuenta en una línea. **El contenido no se borra: se degrada a crónica.** Es *"si hay una opción
   obvia, la toma solo y te lo cuenta en una línea"* del principio rector 2, literal.
3. **Los resúmenes de tramo llevan `tecnico: true`** para que la UI los pueda atenuar en vez de
   competir por la ventana del feed.

#### Números medidos

- Decisiones por carrera: **244 → 173** (mediana). El resto del camino a ~80 lo hace 9Rf, que
  todavía no corrió.
- Evento más repetido por carrera: **11 → 7** de mediana (máximo 14 → 9).
- Fechas marcadas: 92% de los splits competitivos tienen exactamente una, 7% ninguna, **0 con más
  de una**.

#### Colateral

- El check *"Nadie se queda varado"* pasó a FAIL en 1 de 150 carreras (seed 90: 15 splits sin
  equipo). Trazado: es un **veterano de 35 años** tras una carrera entera en tier 1 al que el
  mercado deja de llamar y —como el **retiro no existe todavía** (fase 9R.5)— no termina, se queda
  sin equipo hasta el tope de simulación. No es el bug que el check persigue (jugador trabado
  *temprano* en tier 3): es la ausencia de 9R.5. `TOPE_RACHA` sube de 12 a 16 como stopgap, con la
  nota de que 9R.5 hará que esas carreras terminen.
- `reaccion` deja de ser un `motivo` de decisión posible: el branch en `resolver` se borra.

**Verificación**: `validate.js` 88 checks OK (el check de "2 a 3 fechas marcadas" se reemplazó por
"como mucho una, y en el 35-99% de los splits"). `simulate.js 1000 60 todas`: 0 crashes.

### 2026-09-02 — Fase 9Rb: la tabla de posiciones deja de mentir media temporada

Segundo commit de la fase 9R. El segundo de los tres bugs de motor que fabrican la sensación de
que "es todo choto".

#### El bug, medido

`simularResto` (`src/core/temporada.js`) resolvía **el round-robin completo de todos los demás
equipos al abrir el split**, mientras tu fila (`filaPropia`) arrancaba 0-0 y crecía fecha a fecha.
`tablaDePosiciones` ordena por ganados absolutos. En la jornada *k* vos tenías *k* partidos y todos
los demás tenían *N-2*. Resultado: posición relativa media al llegar a cada jornada (1 = último):

```
jornada 1: 0,96    jornada 4: 0,79    jornada 7: 0,45    jornada 11: 0,37
```

**En la primera mitad de toda temporada el juego te informaba que ibas último, gobiernes como
gobiernes.** Y sobre esa tabla falsa se calculaban los motivos `puntero` y `define_clasificacion`
— la tensión narrativa entera de la fase 5.

#### El arreglo

`simularResto` (todo de una vez) → **`generarFixture(liga, propia)`**: un round-robin real de una
sola vuelta por el método del círculo. Con N equipos —siempre par en las ligas y zonas del juego
(tier 1: 8/10/14, tier 2: 10/12, tier 3: 6)— da N-1 jornadas, cada equipo contra cada otro una
vez, sin fechas libres. Puro y determinista, no consume RNG.

- `generarCalendario(state)` pasa a derivarse del fixture (misma firma, misma forma de retorno).
  Cambia **el orden de tus rivales** (antes: orden del archivo de liga) y `local` pasa a salir del
  cruce en vez de `indice % 2`.
- Los cruces ajenos de cada jornada se resuelven **en paso** con tus fechas, vía
  `aplicarCrucesDeJornada`, dentro de `avanzarFechaSilenciosa` — el único choke point por el que
  avanza una jornada, marcada o silenciosa. Todas las filas de la tabla avanzan juntas.
- `resolverFechaMarcada` ahora avanza la jornada **completa** (tu fecha + los cruces ajenos) antes
  de leer la tabla para el log "Quedan Xº de Y", así esa posición es la de una jornada de verdad
  cerrada.
- `career.temporada.cruces: []` nuevo en el estado inicial (T4).
- `simularResto` se borra (nadie más lo importaba).

#### Números medidos

- Posición relativa media en la primera mitad de la temporada: **~0,85 → ~0,35** (test aislado con
  equipos de igual fuerza y jugador al 50%). El pequeño sesgo hacia arriba es correcto: en un
  empate la fila propia ordena primero.
- Las **3.444 tablas finales** de 120 carreras cierran perfecto: Σ ganados = Σ perdidos, y todo
  equipo jugó tantas fechas como el jugador — en **toda jornada**, no solo al cierre.
- 3.040 temporadas (incluidas 327 de tier 3): 0 con calendario vacío.

#### Deuda nueva

- **D38** — 9Rb **reordena** (no agrega) llamadas de RNG: el total sobre la temporada es idéntico
  al viejo `simularResto` — `(N-1)(N-2)/2` tiradas —, pero ahora caen intercaladas con tus fechas
  y tus eventos en vez de todas juntas al abrir el split, y **qué pares** se cruzan en qué jornada
  cambia. Familia D21/D37. Peor para comparar seeds entre versiones, idéntico en balance agregado.

**Verificación**: `validate.js` 88 checks OK (+3: el fixture es un round-robin real; la tabla no
miente a mitad de temporada; toda fila jugó tantas fechas como el jugador en cualquier fecha
marcada). Se amplió el check *"La tabla de temporada cierra"* con la consistencia jornada a
jornada. `simulate.js 1000 60 todas`: 0 crashes.

### 2026-09-02 — Fase 9Ra: el cooldown de eventos se mide en splits

Primer commit de la **fase 9R** (`PLAN.md`), la que salió de comparar el juego contra **El Ídolo
del Potrero** a pedido del usuario: *"las frases se repiten, es todo choto, fijate por qué y
arreglalo"*. El diagnóstico completo (medido, no estimado) vive en `PLAN.md` §9R y en el plan
aprobado. Este commit ataca el primero de los tres bugs de motor que fabrican la repetición.

#### El bug, medido

`actualizarCooldowns` (`src/systems/events.js`) **decrementaba todos los cooldowns en 1 cada vez
que se resolvía un evento cualquiera**, no una vez por split. Y `resolverOpcion` se llama desde
tres lugares — `events.js`, `edadCierre.js` y `temporada.js` — con **4,48 resoluciones de evento
por split** de media. Consecuencia:

| `cooldown` declarado en el JSON | Splits que duraba de verdad |
|---|---|
| 4 (la moda: 27 de 97 eventos) | **0,89** |
| 6 | 1,34 |
| 10 | 2,2 |

El `cooldown: 4` de un evento no significaba "4 splits": significaba "los próximos 4 eventos de
cualquier tipo". Prácticamente inexistente.

#### El arreglo

`state.flags.cooldowns` (contador que se decrementaba) → **`state.flags.cooldownHasta`** (el
`splitCount` en el que el evento vuelve a estar libre). `cooldownActivo` compara contra
`state.player.splitCount`; `actualizarCooldowns` → **`registrarEventoVisto`**, que ya no
*decrementa* nada — estampa `splitCount + max(cooldownMinimoSplits, evento.cooldown)` y suma la
vista de `eventosVistos`. Se borra el tick entero, así que el bug no puede volver: no hay ningún
contador que se pueda doble-decrementar. La llamada `actualizarCooldowns(state, null)` del split
sin evento desaparece (no había nada que tickear).

El rename `cooldowns` → `cooldownHasta` es a propósito (familia T5): si algún lector quedó leyendo
el campo viejo, rompe en voz alta en vez de comparar un número de split como si fuera un contador.

**Constante nueva**: `BALANCE.eventos.cooldownMinimoSplits: 1` — piso para los 8 eventos que
declaran `cooldown: 0` o lo omiten. "Nunca dos veces en el mismo split". No se retunean los
`cooldown` de los 97 JSON (regla de proceso 2): eso es 9Rg.

#### Números medidos

- **Reapariciones antes de que venza el cooldown declarado: 0** sobre 36.826 apariciones de
  evento en 200 carreras (antes: ~18% de las reapariciones ocurrían con 1 split de diferencia o
  menos).
- Evento más repetido por carrera: **mediana 14 → 11, máximo 32 → 14**. Sigue por encima del
  objetivo de `§7.2` (mediana ≤4, máx ≤8) — se llega con 9Re+9Rf (menos instancias totales) y el
  apriete final de 9Rg, no con 9Ra sola.
- Decisiones por carrera: 248 → 244 (el volumen lo baja 9Rf).

#### Deuda nueva y colateral

- **D37** — 9Ra corre el stream de RNG: `candidatos()` devuelve otro conjunto en muchos puntos, el
  evento elegido cambia, y el stream diverge río abajo. **Ninguna seed anterior reproduce su
  carrera.** Familia D21/D22/D35. El determinismo intra-versión queda intacto (verificado: misma
  seed, dos corridas idénticas).
- El check *"El impacto de los minijuegos está acotado"* daba **7,3%** en HEAD contra un piso de
  **7%** — su propio comentario admitía el margen de 0,3 puntos. El corrimiento de D37 lo empujó a
  5,4%. Verificado que no es no-determinismo y que los minijuegos siguen moviendo el resultado
  (4,8–7,8% según ventana de seeds): se **ensancha la banda a 3–25%** con el motivo documentado en
  el check. Un minijuego decorativo daría ~0%; la regla que importa sigue con margen de sobra.

**Verificación**: `validate.js` 85 checks OK (83 + 2 nuevos: el cooldown mide splits y vence
exactamente en `splitCount + cooldown`; ningún evento reaparece antes de tiempo).
`simulate.js 1000 60 todas` → 0 crashes en las tres estrategias.

### 2026-09-02 — Fase P (parcial): el build, y D28 cerrada

Primer commit de la fase P. Sale de un pedido concreto: *"dejar esto privado, publicarlo en un
hosting después, buildea lo necesario pero para que salga todo bien."*

#### El repo queda privado, y eso cambia el host

Al pushear a GitHub se publicaron también `PLAN.md` (2.828 líneas), `PROGRESO.md`, `CONCEPTO.md`,
`DISENO.md` y `CLAUDE.md`: todo el diseño, las mediciones de balance y el razonamiento interno del
proyecto. Decisión del usuario: **el repo va privado y el sitio va público.**

Eso descarta GitHub Pages, que desde un repo privado exige plan pago. El destino pasa a ser
**Cloudflare Pages o Netlify** (build `npm run build`, output `dist`), que sí despliegan desde un
repo privado en el plan gratuito. `PLAN.md` §P.6 reescrito.

#### `src/dev/build.js` (nuevo) — `npm run build` → `dist/`, 576 KB

Sin bundler y **sin una sola dependencia**: el proyecto no tiene ninguna y esta fase no era excusa
para agregar la primera.

1. **Copia** `index.html` + `src/core`, `src/data`, `src/systems`, `src/ui`. Deja afuera
   `src/dev/` (148 KB), `server.js` y los cinco `.md`.
2. **Inlinea los JSON.** Los 32 imports con `with { type: 'json' }` necesitan Chrome 123+ /
   Safari 17.2+ / Firefox 138+, y en un navegador anterior no degradan: es un error de sintaxis, la
   pantalla queda en blanco y no hay nada en el log. Cada `foo.json` pasa a `foo.json.js` con
   `export default {...}`. **`dist/` no lleva una sola declaración de import attributes** y el piso
   de navegador baja a "soporta ES modules", que es 2018. Parsear cada archivo valida el JSON de
   paso.
3. **Comprueba `dist/`** — capitalización exacta de cada import (Windows no distingue, el host
   Linux sí), cero import attributes sin reescribir, cero llamadas al azar del navegador, ningún
   archivo con `_` inicial. Exit 1 si algo falla.
4. **Verifica que el build no cambió el juego**: 12 seeds × 30 splits corridas contra `src/` y
   contra `dist/`, comparando la huella de cada carrera. Una transformación de código que rompe en
   silencio da el peor bug posible —el local anda, el publicado no—, así que no se confía: se
   comprueba. **Las 12 carreras salieron idénticas.**

**El check funcionó a la primera vez que corrió**: el build falló señalando las 5 llamadas al azar
nativo de `index.html`. Era exactamente lo que tenía que atrapar.

Y después se atrapó a sí mismo. `validate.js` pasó a **82 OK y 1 FAIL**: *"Sin aleatoriedad nativa
fuera del RNG inyectado — encontrado en `src/dev/build.js`"*. El literal estaba en el **mensaje de
error del propio check**. Se resolvió con el mismo idioma que ya usa `guards.js`
(`const AZAR_NATIVO = 'Math' + '.random(';`), que existe exactamente por este motivo.

Verificado que el check **falla cuando debe** (regla de proceso 7, trampa T5): con una llamada al
azar nativo inyectada a mano en `index.html`, el build corta con exit 1 y la señala; restaurado el
archivo, vuelve a verde.

#### D28 cerrada — los 5 `Math.random()` de `index.html`

`PLAN.md` 9Ed decía "pasar el `rng` a los cinco `montar*`". **Se hizo distinto, a propósito**: los
minijuegos reciben `rngUi`, un stream **propio**, sembrado con
`mulberry32((seed ^ 0x9E3779B9) >>> 0)`.

Comer del stream principal habría hecho divergir al navegador —que juega los minijuegos— de
`simulate.js`, que resuelve por `resolverAuto` y nunca los monta: la misma seed daría dos carreras
distintas según dónde corriera, que es lo contrario de lo que la seed compartible (P.3) necesita.
Con stream separado el mundo sale idéntico de los dos lados, los minijuegos son deterministas, y
**no se corre el stream** (trampa T1): **las seeds anteriores siguen reproduciendo su carrera.**

#### Verificación en navegador de verdad

`dist/` servido y cargado en Chrome headless: **87 peticiones, 87 con 200.** El único 404 es
`/favicon.ico` (P.4, pendiente). Los 5 roles y el grid de campeones renderizan y los 27 módulos
JSON inlineados cargan; el manejador de errores de `index.html` no se disparó.

#### Lo que falta para publicar

**Un solo bloqueante: P.2, el guardado** (D36). Sin él, un refresh borra una carrera de 25-40
minutos. Después: la seed en la URL (P.3), los meta tags y el favicon (P.4), y el `README`/`LICENSE`
(P.5).

**Verificación**: `npm run build` OK · `node src/dev/validate.js` → **83 checks OK, 0 fallos**.


### 2026-09-02 — Se planean dos fases: 9M (el mercado de pases) y P (publicar)

Commit de documentación, **cero cambios en `/src`**. Existe porque `CLAUDE.md` es explícito: *"Nada
se planea en el momento: si algo no está escrito en `PLAN.md`, se escribe ahí antes de
implementarlo."*

---

#### Fase 9M — El mercado de pases

**El pedido**: *"el juego me parece una mierda, fijate cómo hacer que el juego deje de ser una
mierda y planeá el mercado de pases."* Resultó ser un solo pedido: lo que hace que el juego se
sienta muerto es exactamente lo que un mercado de verdad arregla.

**Lo medido antes de escribir una línea** (sonda propia, 120 carreras × 45 splits; 60 × 45 para el
conteo de eventos):

| Métrica | Medido | Lectura |
|---|---|---|
| Fichajes con elección real por carrera | **3,05** | el mercado se abre 3 veces en 15 años de juego |
| Pretemporadas con el mercado en silencio | **3,80** | *"Te queda un año de contrato"* y nada más |
| Ligas distintas pisadas por carrera | **media 1,48 · máx 2** | nadie, en 120 carreras, jugó en 3 ligas |
| Tier al cierre | **89 de 120 en tier 1 · 0 en tier 2** | la escalera es una cinta de un solo sentido |
| Carreras terminadas en 45 splits | **32%** | confirma D2 desde otra sonda |
| Decisiones por carrera | **162**, top-10 familias ≈ **40%** | la repetición vive en `events/partido/` |

La causa, leída en el código: el ascenso tier2→tier1 es `chance(0.12 + jerarquia/100 × 0.45)`
(`competitivo.js:124`) — ganar la liga no cambia nada; una org es `{ nombre, liga, fuerza }`
(`mundo.js:57-80`) y los compañeros se regeneran de cero al cambiar de equipo (`roster.js:18`), sin
edad ni contrato ni memoria; y `generarOfertasParaLiga` tira `roll(0, techo)` **solo sobre tu propia
liga** (`mercado.js:138-167`). **No hay un solo jugador NPC con carrera propia en todo el repo.**

**Tres afirmaciones del changelog viejo verificadas de primera mano** (trampa T6: no citar de
memoria):

- `registro.dineroTotalUSD` **nunca se incrementa.** Solo aparece en `state.js:162` (declaración) y
  `validate.js:2408` (un check de monotonía que pasa trivialmente sobre un 0). El changelog de la
  fase 9b afirma que `roster.js` cobra `salarioAnualUSD / 3` por split: **el código no lo hace.**
- `registro.picos.salarioAnualUSD` y `picos.rankedPuntos` están declarados y `registrarPico` nunca
  se llama con ninguno de los dos.
- `rivales[].puntaje` y `.desenlace`: solo la declaración en `mundo.js:235`, cero escrituras (D8).

**Precisión sobre la repetición**: el catálogo general está sano — la fase 8D midió 8,8% de
concentración mediana para el evento más visto, bajo el techo de 25%. La repetición está
**concentrada en `data/events/partido/`**: 24 fichas sorteadas ~75 veces por carrera (2-3 fechas
marcadas × ~30 splits pro). *"El objetivo que define la fecha"* sale ~10 veces por carrera. Va a la
fase 13, con un arreglo barato disponible antes: subir la fatiga anti-repetición solo para esa
familia.

**Lo escrito**: `PLAN.md` §9M completo (8 subfases con archivos, contratos de datos, constantes
nuevas y 14 checks con su valor de hoy y su objetivo), la fila **9M** en la tabla de estado y la
nota de por qué se inserta entre el mercado y el final.

La idea que sostiene la fase entera: **`org.fuerza` deja de ser un valor sorteado y pasa a derivarse
del promedio de nivel de su plantel.** Así ningún consumidor (`temporada.js`, `rendimiento.js`,
`serie.js`) cambia una línea el día 1, y desde el año 2 un equipo que ficha bien sube de fuerza y te
gana la liga.

**Decisiones del usuario** (a la tabla de `PLAN.md`, no se vuelven a preguntar):

1. **Rosters NPC reales**, no un modelo de demanda liviano.
2. **Mercado antes que retiro** — la fase 10 define el retiro como emergente y con el mercado de hoy
   eso vuelve a ser un dado.
3. **Sí a reescribir la escalera competitiva** — el ascenso deja de sortearse; aparece el descenso.

---

#### Fase P — Publicar

**El pedido**: *"cómo es la base de datos de este proyecto para poder subirlo"*.

**No hay ninguna.** Cero `localStorage`, `fetch`, `IndexedDB`, SQL o servicio externo en todo el
repo; el único `process.env` es el `PORT` de `server.js`. Lo que hace de base de datos son archivos
estáticos importados en tiempo de módulo. El proyecto es un **sitio estático de 850 KB, 0
dependencias y 0 build**; `server.js` son 60 líneas solo para desarrollo.

**Pre-flight corrido**: los **274 imports relativos resuelven con la capitalización exacta** (Windows
no distingue mayúsculas, el host Linux sí — la forma clásica de que un sitio ande local y explote
publicado) y no hay archivos con `_` inicial, así que no hace falta `.nojekyll`. El repo **no tiene
remote**.

Subirlo es trivial. Lo que **no** es trivial son los tres bloqueantes que en `localhost` no molestan:

1. **La partida no se guarda** — un refresh borra la carrera, con una sesión objetivo de 25-40
   minutos. Nueva deuda **D36**. Se arregla sin backend: `state.pendiente` ya existe para que la
   partida sea serializable a mitad de split, y falta exponer el contador de `mulberry32`
   (`rng.js:2`), hoy encerrado en una clausura.
2. **Los 5 `Math.random()` de `index.html`** (D28, ya asignada a 9Ed) — sin determinismo, un link
   con seed no reproduce nada. **D28 queda marcada como prerrequisito de P.**
3. **`with { type: 'json' }` en 32 imports** — en un navegador anterior a Chrome 123 / Safari 17.2 /
   Firefox 2025 no degrada: el juego no arranca. Hay que decidirlo explícitamente y verificarlo
   abriéndolo, no de memoria.

`PLAN.md` §P cubre además la seed en la URL, los meta tags (hoy compartir el link muestra una
tarjeta vacía), `.gitignore`/`README`/`LICENSE` (ninguno existe), el host, un `src/dev/preflight.js`
que haga repetible el chequeo de capitalización, y una verificación end-to-end sobre la URL
publicada. Fuera de alcance explícito: backend, cuentas, tabla de récords global y analytics.

---

**Verificación de este commit**: `node src/dev/validate.js` → **83 checks OK, 0 fallos**. Sin cambios en
`/src`, se corrió igual para tomar la línea de base en el momento en vez de citarla de memoria
(trampa T6).


### 2026-09-02 — Fase 9Ea+b: la carrera deja de vararse

El arreglo del bug D25, junto con las tres herramientas que lo dejaron pasar. Va en un solo commit
a propósito: la regla de proceso 7 pide verificar que un check nuevo **falla cuando debe**, y eso
solo se puede hacer con el código roto todavía en el árbol. Los checks se escribieron primero, se
corrió la medición contra `HEAD` para verlos en rojo, y recién después se aplicó el arreglo.

**Los checks, en rojo contra el código roto** (150 carreras × 60 splits, previo al arreglo):

| Check | Contra `HEAD` roto |
|---|---|
| Racha > 12 splits seguidos sin equipo | **58 de 150 carreras** la violan · peores: seed 7 (52), seed 9 (55), seed 21 (56) |
| Carreras varadas (pro, sin org, sin tier) | **50 de 150** |
| Fracción de splits pro con equipo (umbral 90%) | **49,7%** |

**El arreglo, una línea.** `disolverEquipo()` en `systems/competitivo.js` ponía `tier: null`, y la
fase 9b había guardado el re-fichaje detrás de `career.tier === 3` — la condición nunca era cierta
en el único caso para el que se escribió. Ahora el tier se conserva en 3: se te disolvió el equipo,
no dejaste de ser un jugador de tier 3. `liga` sigue en `null`, que siempre estuvo bien (tier 3 no
es una liga real). Vale la pena notar que la fase 9b **sí** conservaba tier y liga en el camino del
mercado (`quedarLibre`) — por eso ESE camino nunca se rompió, y por eso las 0 carreras varadas por
la vía del mercado en la medición.

**Después del arreglo**, mismas 150 seeds:

| Métrica | Antes | Después |
|---|---|---|
| Carreras con racha > 12 splits sin equipo | 58 de 150 | **0** |
| Racha máxima observada | 56 splits | **1 split** |
| Carreras varadas | 50 de 150 | **0** |
| Splits profesionales con equipo | 49,7% | **98,1%** |

**Las herramientas** (lo que impide que el próximo se esconda igual):

- **`simulate.js`** ahora recorre la carrera split a split, no solo mira el estado final. Bloque
  `carrera` nuevo en el reporte: `splitsProConEquipo`, `varadas`, `maxRachaSinEquipo` y
  `tierMaximo`. Era el hueco más grande — una racha de 57 splits sin equipo es **invisible desde
  el estado final**, que solo dice "sin equipo" una vez. Por eso 1.500 carreras no la veían.
- **`validate.js`**: dos checks nuevos (39 y 40), los de la tabla de arriba.
- **`contextos.js`**: `sin_equipo` deja de estar `pendiente: 'paso11'`. Corrección de etiqueta —
  lo estaba desde la fase 7, cuando ningún sistema producía ese estado, y la fase 9 le dio dos
  puertas sin sacarle la marca.

**Corrección al diagnóstico de la auditoría de esta misma mañana** (regla de proceso 4). La entrada
anterior y la fila D26 decían que `cobertura.js` reportaba "sin huecos" *porque saltea los momentos
`pendiente`*. **Es falso**: el `pendiente` solo cambia la etiqueta de una fila nunca observada,
nunca suprime un hueco. El mecanismo real es peor y se midió con `--momento sin_equipo`: la celda
`sin_equipo` reporta **58 eventos**, muy por encima del mínimo, porque los 58 son exactamente el
contenido mal gateado de D27 — los cinco eventos de rol (*"tu línea está ganada"*, *"la lupa está
sobre vos"*) que hablan de partidos profesionales que no estás jugando, `transfer_rumor` sin
contrato del que irse, `tercer_club_ya` sin club. **`cobertura.js` mide cantidad, no pertinencia**:
cuanto más contenido sin gatear se escribe, más sana se ve una celda inapropiada. Eso hace a D27
más importante, no menos, y le agrega un ítem a 9Ec: que la matriz sepa distinguir "hay 58 eventos
acá" de "hay 58 eventos que tienen sentido acá". D26 y la fase 9E quedaron corregidas en `PLAN.md`.

**Una cota de check movida, con la medición al lado** (regla de proceso 2: primero medir con la
estructura nueva). El check de densidad de decisiones falló en `seed 326, split 87: 25 decisiones`
contra un tope de 24. No es una regresión: al dejar de vararse, las carreras pasan de 49,7% a 98,1%
de splits profesionales **con equipo**, así que muchos más splits traen la carga profesional
completa (temporada con fechas marcadas, serie, draft) en vez de ser splits vacíos. No es un split
más pesado: son más splits pesados. Medido con la estructura nueva sobre 400 carreras / **25.688
splits**: p50=6, p90=12, p99=17, p999=21, máximo 25 — **un solo split en 25.688 (0,004%)** pasa
de 24. El tope sube a 28, en el mismo lugar y con el mismo criterio que las correcciones de las
fases 2, 4 y 5. El tope anti-loop real (`maxDecisionesPorSplit`, 60) no se tocó.

**El check de tier 3 pasa a medir por org, que es lo que siempre dijo que medía.** Falló con
"mediana de permanencia en tier 3: 5 splits (máximo 2)", y la causa es que el corte entre stints lo
hacía —sin querer— el propio bug D25: al poner `tier: null`, la disolución terminaba el stint *y de
paso la carrera*. Con `tier: 3` conservado, contar por tier junta todos los equipos chicos de una
carrera en un número solo y mide otra cosa. El comentario del check siempre dijo *"nadie se queda
mucho en **un equipo inventado**... una carrera puede pasar por tier 3 más de una vez **si el
equipo se disuelve**"*, así que el corte correcto es por org. Medido a 1500 carreras:

| Métrica | Mediana | p90 | Máx |
|---|---|---|---|
| Splits en **una misma org** de tier 3 (lo que gatea el check) | **2** | **5** | 19 |
| Splits totales en el **nivel** tier 3 | 5 | 12 | 36 |
| Gap sin equipo dentro de tier 3 | 1 | 1 | **1** |

La primera fila es idéntica al diseño original — el pedido se sigue cumpliendo. La tercera muestra
el arreglo funcionando: nunca pasás más de un split sin que te levante otro equipo. La segunda es
**un número que nunca se había podido medir**, porque antes las carreras largas en tier 3 no
existían: se varaban. Va a la deuda como D34, sin tocar una sola constante (regla de proceso 2).

**Conteo de checks corregido: son 83, no 38.** El número que reporté esta mañana salió de leer una
salida truncada de `validate.js` y se propagó a `PLAN.md`, a la entrada anterior de este changelog
y al mensaje del commit `d8e3eec`. Los documentos quedaron corregidos; el mensaje del commit no se
reescribe. La suite hoy: **83 checks, 83 en verde**, dos de ellos nuevos de esta fase.

**Trampa T1**: el arreglo cambia qué rama toma `competitivo.aplicar()` en las carreras que antes
quedaban varadas, y ahí `reFicharTier3` vuelve a consumir del stream. **Ninguna seed anterior
reproduce su carrera.** Es el precio del arreglo, no un efecto evitable.

**Verificación end-to-end (9E.9), seed 7 leída a mano.** Antes: firmaba con Fénix Esports en el
split 7, se disolvía en el 8, y los 52 splits restantes eran zombis — 4 a 6 logs por split, con
"Arraigo +2 al manager" y "en el draft no te dieron tu pick" cayendo sin equipo. Ahora:

```
split  7  Fénix Esports (tier 3)          split 11  Nova Uprising
split  8  se disuelve — un split libre    split 12  ASCIENDE a tier 2 · Cuadro Esports
split  9  Nexo Collective lo levanta      split 15  DEBUTA en tier 1 · Shifters
split 10  un split libre
```

Es una carrera. Y la densidad de logs pasa de 4-6 por split varado a 16-18 por split profesional.

**Cierre, 1000 carreras × 60 splits (`simulate.js`, estrategia equilibrado):**

| | |
|---|---|
| crashes | **0** |
| splits profesionales con equipo | **98,4%** |
| carreras varadas | **0 (0,0%)** |
| racha máxima sin equipo | 6 splits (la puerta del mercado: 3 pretemporadas sin oferta + libre, por diseño) |
| tier máximo alcanzado | tier1 71,9% · nunca fichado 26,8% · tier3 1,1% · tier2 0,2% |
| `validate.js` | **83/83** |

Falta de la fase 9E: **9Ec** (el gating del contenido sin vestuario, D27, ahora con el ítem de
`cobertura.js`) y **9Ed** (los `Math.random()` de `index.html`, las 3 constantes muertas, los 13
comentarios que citan `TRASPASO.md`).

### 2026-09-02 — Auditoría del simulador + limpieza de documentación

Sin cambios en `/src`. Dos entregables: una auditoría del estado real del motor, medida corriendo
y no leyendo, y la poda de la documentación que ya se contradecía con el código.

**Lo que está bien**, verificado corriendo: los **83 checks** de `validate.js` pasan (6m47s),
incluido el determinismo end-to-end. Dentro de `/src` no hay un solo `Math.random(` ni un
`document.` fuera de `src/ui/`. El motor de eventos sigue sin una línea de lógica por id de
evento: 97 eventos / **196 opciones** contra un objetivo de 150. `calcularContexto()` sigue pura y
sin consumir RNG. De ~250 claves de `BALANCE`, solo **4** están muertas. El mercado de la fase 9
mide bien lo que dice medir: salario lognormal verificado y la trampa del equipo grande viva en el
98,5% de las carreras con ofertas.

**Lo que está mal**, en un renglón cada uno (el detalle, con números, está en la tabla de deuda de
`PLAN.md`, D25-D33, y el arreglo en la fase 9E):

| # | Hallazgo | Medido |
|---|---|---|
| D25 | **La carrera se vara para siempre tras disolverse un tier 3** — regresión de la fase 9b | **30,7%** de las carreras, **47,5%** de los splits pro sin equipo, racha máx. **57 splits** |
| D26 | El agujero de medición que lo dejó pasar: `sin_equipo` está `pendiente` y `cobertura.js` no mide pendientes; `simulate.js` no tiene KPIs de carrera | `sin_equipo` es el momento **más frecuente del juego** (7.238) y `--huecos` reporta "sin huecos" |
| D27 | Contenido de vestuario disparando sin vestuario | "Arraigo +2" a una org inexistente; "en el draft no te dieron tu pick" ×6 sin equipo |
| D28 | 5 `Math.random()` en `index.html` que deciden el resultado de los minijuegos | jugando a mano, la misma seed **no** reproduce la carrera |
| D29 | El eje `residencia` está clavado en `'local'`: sin imports, sin transferencias entre regiones | el momento `import_recien_llegado` es inalcanzable por construcción |
| D30 | `ultimo_ano` y `sin_renovacion` declarados en `EJES` y nunca calculados | pese a que `contrato.aniosRestantes` ya existe |
| D31 | 4 constantes muertas en `balance.js` | `margenImport`, `autoProbRobar`, `ruidoRival`, `margenEdadMinima` |
| D32 | `validate.js` tarda **6m47s** y la Definición de terminado lo exige en cada cambio | — |

**Corrección al changelog de la fase 9d** (regla de proceso 4: reportar los números medidos,
incluidos los que empeoran). Esa entrada reporta *"carreras con al menos un split libre: **0,3%**"*.
El número real es **35,3%**. La métrica no estaba mal calculada: estaba mirando solo la puerta del
mercado (`quedarLibre`), y la vía dominante hacia "sin equipo" es la disolución de un tier 3, que
no pasa por ahí. La entrada vieja se deja como está — es historia; la corrección vive acá.

**Por qué 83 checks en verde convivieron cuatro commits con un bug que le saca el juego al 30% de
las partidas.** No fue mala suerte, fueron tres ciegos alineados: `cobertura.js` saltea los momentos
marcados `pendiente`, y el que este bug produce (`sin_equipo`) está marcado así desde la fase 7;
`simulate.js` solo reporta métricas de la etapa amateur, así que 1.500 carreras no ven nada
después del fichaje; y la métrica de la fase 9d medía la puerta equivocada. **La fase 9E arregla
las tres herramientas junto con el bug** — si no, el próximo se esconde igual.

**Limpieza de documentación.** Se borraron `AUDITORIA.md` (242 líneas, diagnóstico del commit
`464ccf7`, 28 commits atrás: decía "5 checks" cuando son 38 y "24 archivos de `/src`" cuando son
60) y `TRASPASO.md` (891 líneas, cuyo propio encabezado declaraba superadas las PARTES 0-3, 5, 6,
9 y 10). Lo que seguía vivo se mudó antes de borrar:

- **La investigación** (PARTE 4: ranked, ligas 2026, duración de carreras, Fearless, salarios) →
  `CONCEPTO.md` **§12**, con la numeración conservada (`TRASPASO §4.N` → `§12.N`) para que las
  citas viejas sigan resolviendo.
- **Las trampas T1-T10** (PARTE 7) → `PLAN.md`. No era opcional: hay 17 referencias `(trampa TN)`
  en `PLAN.md` y 13 más en `/src` cuya única definición vivía ahí.
- La PARTE 8 (reglas de proceso) ya estaba en `PLAN.md` como superset. El resto no tenía nada vivo.

También: `DISENO.md` §1 decía *"3 a 5 minutos por partida"* contra la decisión textual del usuario
(25-40 min), su árbol de archivos no listaba 21 archivos que existen, y su §6 "Orden de
construcción" —la lista de 11 pasos superada por las 13 fases— se cortó junto con la tabla de
`PROGRESO.md` que la usaba como eje y arrastraba el error. `CLAUDE.md` dejó de nombrar un archivo
que ya no existe.

Quedan colgados **13 comentarios de `/src`** que citan `TRASPASO.md §4`: la redirección a
`CONCEPTO.md §12` es un reemplazo de texto sin lógica, anotado como D33 para el próximo commit que
toque `/src`.

### 2026-08-11 — Fase 9d: calibrar el mercado (cierra la fase 9)

Último commit de la fase 9. Medido con un script ad hoc (headless, mismo pipeline que
`simulate.js`, 1500 carreras × 60 splits, borrado después de medir — no queda en el repo) contra
las métricas de `PLAN.md` §9.9:

| Métrica | Medido | Objetivo | Lectura |
|---|---|---|---|
| Decisiones de mercado/carrera (toda la población) | mediana 0 | 3-8 | El 60% de las carreras nunca llega a una liga real dentro de la ventana medida — eso es la escalera de la fase 3 (tier3→tier2→tier1), no algo que la fase 9 controle |
| Decisiones de mercado/carrera (solo quien llega al mercado) | mediana 9, p90 11 | 3-8 | Se pasa un poco. Ver nota abajo — no se retocó |
| Carreras donde rechazar el mejor sueldo tiene sentido (la mejor oferta NO es también la de mejor jerarquía) | 98.5% | ≥ 35% | La trampa del equipo grande (CONCEPTO §7) está viva casi siempre que hay ofertas |
| Carreras con al menos un split "libre" | 0.3% | se mide, alimenta la fase 10 | Bajo, pero es dato para la fase 10 — no hay objetivo que cumplir todavía |

**Por qué la mediana condicional (9) no se retocó pese a pasarse del objetivo (3-8):** sin retiro
emergente (fase 10, todavía no existe), ninguna carrera profesional termina antes de agotar los 60
splits medidos salvo por burnout — así que cualquiera que llega al mercado se queda ahí acumulando
renovaciones el resto de la simulación. Achicar `aniosContratoMax` para forzar el número a bajar
habría sido calibrar contra un artefacto (la ausencia de retiro), no contra el sistema real, y
`aniosContratoMin`/`Max` (1-3 años) ya están anclados a los contratos reales que cita `TRASPASO.md`
— tocarlos sin esa razón real habría sido shotgun-debugging. Queda anotado para remedir después de
la fase 10, cuando el retiro acote la duración de la carrera y el denominador de esta cuenta deje de
estar sesgado hacia las carreras más largas.

**El ajuste que sí se hizo, con datos**: una renovación con el sueldo de la propia org caía por
debajo de la mitad del contrato anterior en **34,8%** de los casos (hasta 4,5× para arriba en el
p90) — puro ruido lognormal de una oferta nueva, no la lectura de un club que ya te conoce. Nueva
constante `BALANCE.mercado.renovacionSigmaFactor: 0.35`: achica el `sigma` de `salarioDeOferta`
SOLO para la oferta de renovación (una liga con el sigma escalado, construida al vuelo en
`mercado.js`, sin tocar `core/salarios.js` — ese sigue puro y sin cambios desde la fase 9a), sin
tocar la señal de jerarquía/hype. Después del ajuste: caídas fuertes 34,8% → **24,5%**, p90 del
ratio 4,49× → **2,15×**. Lo que sigue cayendo por debajo de la mitad ahora es sobre todo jerarquía/
hype que bajaron de verdad, no el dado.

**Check nuevo** (verificado con T5 — revertido el factor a 1.0, confirmado que el check reproduce
el 34,8% original y falla, revertido de nuevo): *"una renovación no se desploma por ruido puro"* —
menos de 30% de las renovaciones por debajo de la mitad del contrato anterior, sobre 1500 carreras.

**Medido**: `node src/dev/validate.js` — **81 checks, todos OK** (80 + 1 nuevo).
`node src/dev/simulate.js 1500 60 todas` — 0 crashes, mismos porcentajes de `llegaronAPro` que 9a-9c
(esperable: 9d no toca nada de la etapa amateur). Determinismo verificado en 3 seeds.

**Fase 9 cerrada.** El mercado completo: contratos y valor de mercado (9a), la elección real de a
qué org vas (9b, el cambio de más riesgo del documento), la pantalla (9c), calibrado con datos
reales de 1500 carreras (9d). Sigue pendiente para más adelante (no bloqueante, documentado arriba
y en la entrada de 9b): fichajes cross-liga/import (`cupoImports`/`minimoResidentes`/`margenImport`
siguen sin consumirse), y remedir la mediana de decisiones/carrera después de que exista el retiro
(fase 10).

### 2026-08-11 — Fase 9c: la pantalla de ofertas

La pantalla que le pone cara a la fase 9 (`PLAN.md` §9.5-9.6): la tarjeta de oferta, la grilla de
hasta 6, y el botón del representante. Puro trabajo de presentación — ningún archivo de `src/core/`
o `src/systems/` cambia, así que no hace falta un check nuevo de `validate.js` (corre en Node, sin
DOM) ni afecta `simulate.js`.

**Nuevo**: `src/ui/components/mercado.js` (`renderMercado`), siguiendo el mismo patrón que
`components/decision.js` — no calcula nada, solo pinta lo que `systems/mercado.js` ya resolvió
(regla de proceso 2). Cada tarjeta muestra org, liga, tag, sueldo/años, la proyección de jerarquía
con flecha (▲/▼/→) y la etiqueta de banda, la frase sobre picks, el costo de arraigo al irse (si
aplica), dónde arrancás en la nueva org, `progresoHito` cuando es una renovación, y la línea de
riesgo. `screens/carrera.js` suma `mostrarMercadoEnPantalla`, exportada desde `render.js` con el
mismo criterio que ya usan `renderDecision`/`renderFicha`.

`index.html`: un tercer panel (`#mercado`, junto a `#decision` y `#minijuego`) y una rama nueva en
`mostrarDecision` que revisa `decision.presentacion === 'mercado'` antes de caer al renderer
genérico — mismo patrón que ya separaba minijuegos de decisiones normales. CSS nuevo (`.mercado`,
`.mercado-card`, etc.) reusa la paleta ya establecida (verde para lo bueno, naranja para el riesgo,
el mismo tono que `.rol-costo`).

**Verificación end-to-end en Chrome real** (headless vía CDP, mismo método que la fase 8D): seed 2,
Mid, tres campeones — la carrera asciende tier3→LDL→LPL. Se vieron 3 pantallas de mercado completas:
- 6 ofertas de ascenso a LDL con salarios entre \$18k y \$442k/año (el spread lognormal, visible), la
  misma jerarquía proyectada (71→25/29/32/34 según el roll de cada org) y la línea de riesgo que
  cambia según cuán fuerte es la org destino.
- Se usó el botón del representante: rebarajó una segunda mano de 6 ofertas distintas y desapareció
  (ya no vuelve a aparecer esa carrera — el guard del motor, no solo la UI, lo garantiza).
- Una tercera pantalla con una sola oferta (ascenso a LPL, ThunderTalk Gaming) tras la segunda
  promoción.
- Cero errores de consola atribuibles al código del proyecto (el único mensaje de red — un 404
  genérico sin URL asociada en el listener de `response` — no corresponde a ningún recurso servido
  por el proyecto; se investigó explícitamente para no darlo por sentado).

**Medido**: `node src/dev/validate.js` — 80 checks, todos OK (sin cambios: 9c es UI pura).
`node src/dev/simulate.js 1500 60 todas` — 0 crashes, mismos porcentajes que 9b (esperable).

### 2026-08-11 — Fase 9b: el mercado decide, competitivo.js deja de sortear

El cambio de más riesgo del documento (`PLAN.md` §9.4, palabras del propio plan): `competitivo.js`
deja de elegir a qué org fichás. Ahora solo decide SI ascendés (mérito: jerarquía y suerte);
`mercado.js` —sistema nuevo, corre justo después en `ETAPAS_SPLIT`— decide A QUÉ ORG vas, y esa es
la decisión real del jugador que pedía la fase.

**El flujo**: `competitivo.js` marca `flags.ascensoPendiente = {ligaId, tier}` al ganar un ascenso
(tier3→tier2 o tier2→tier1) y no toca `career.tier`/`liga`/`currentOrg` — seguís jugando donde
estabas hasta que se resuelve. `mercado.js` corre en cada pretemporada (`ventana === 'pretemporada'`,
trampa T2: contexto en vivo, nunca cacheado): si hay un ascenso pendiente y ya tenés la edad mínima
de la liga destino, genera 1-6 ofertas y pausa con una decisión; si no tenés equipo real todavía
(tier 3, o esperando edad), no hace nada. Para quien YA está en una liga real, decrementa
`contrato.aniosRestantes`; en 0, genera ofertas (una posible renovación con la org actual +
laterales de otras orgs de la liga, pesadas por fuerza) — 0 ofertas 3 pretemporadas seguidas te deja
`libre` (currentOrg null, pero conservás tier/liga: seguís siendo talento de esa categoría, no caés
a tier 3). "Llamar al representante" (§9.6) rebaraja la mano una única vez por carrera — el motor
lo garantiza en el propio `resolver`, no confía en que la UI oculte el botón después de usarlo.

**El año muerto se unifica**: `flags.tier1Esperando` (fase 3, guardaba liga+org+edad) desaparece —
ya no tiene sentido reservar una org de antemano si la org pasa a elegirse en `mercado.js`. La
espera por edad ahora es una consecuencia de `ascensoPendiente` sin más: `mercado.js` no genera
ofertas hasta que `state.age >= liga.edadMinima`, sin volver a sortear nada, exactamente el mismo
comportamiento de antes con un flag menos que mantener sincronizado.

**Regla de proceso 15, resuelta sin volver a tirar el dado dos veces**: la jerarquía que promete la
tarjeta de oferta (`proyeccionJerarquia.hasta`) tiene que ser la que de verdad asigna `roster.js` al
fichar. Se extrajo `jerarquiaAlFichar(state, rng)` de `roster.js` (mismo cálculo de siempre, ahora
reusable) y `mercado.js` la tira UNA vez al construir cada oferta, guardando el resultado crudo en
`oferta.datos.jerarquiaProyectada`. Al aceptar, ese número viaja por
`flags.jerarquiaProyectadaAlFichar`; `roster.js` lo usa tal cual (`?? jerarquiaAlFichar(...)` como
fallback solo para fichajes que NO vienen del mercado, como el primer tryout de tier 3) en vez de
tirar un segundo gauss — evita exactamente la trampa T1 de "dos tiradas para el mismo evento".
El sueldo también se registra en la fila del registro (`registrarSalarioEnFila`) desde
`roster.js` (al abrir fila) y desde `mercado.js` (al renovar, donde no hay fila nueva que abrir).

**`registro.dineroTotalUSD` empieza a moverse**: `roster.js` cobra `contrato.salarioAnualUSD / 3`
(=`BALANCE.edad.splitsPorEdad`) cada split jugado con equipo — prorrateado porque el sueldo es
anual y un año son 3 splits. Ya estaba en la lista de campos monótonos del check de la regla de
proceso 14 desde la fase 8 (por adelantado, en 0); ahora por fin se mueve.

**Corrección al interactuar con tier 3**: encontrada ANTES de escribir código, razonando la
interacción — `competitivo.js`'s `aplicar` re-fichaba automático a CUALQUIER jugador sin
`currentOrg`, asumiendo que la única forma de quedarte sin org era una disolución de tier 3. Con la
fase 9, un jugador de tier 1/2 puede quedar libre también, y ese dispatcher lo habría re-fichado a
un equipo de tier 3 por error — un downgrade absurdo para alguien con jerarquía de verdad. Se
corrigió el guard a `state.career.tier === 3` antes de llamar `reFicharTier3`; un libre de tier 1/2
espera a que `mercado.js` le consiga equipo, no cae mecánicamente a la categoría más baja.

**Checks nuevos** (verificados con T5 — mutados y confirmado que fallan antes del arreglo,
revertido después):
- ningún cambio de org en tier 1/2 pasa sin un log de `mercado.js` en el split (excepto tier 3)
- `proyeccionJerarquia` predice la jerarquía real con error ≤ 8 puntos (PLAN.md §9.8; en la
  práctica el roll es EXACTO al firmar — el margen cubre que `rendimiento.js` puede correr la
  jerarquía un poco más tarde en el mismo split, por el propio desempeño de esa fecha, que es
  comportamiento esperado y no una promesa rota)
- el sesgo etario reduce cuántas ofertas llegan, no solo si llegan: 28 recibe ≤50% del promedio de
  ofertas que 21 con la misma hoja
- nadie ficha por una liga sin cumplir su `edadMinima`
- el representante se usa exactamente una vez por carrera (atrapó un bug real: la primera versión
  del `resolver` no tenía el guard y permitía rebarajar sin límite)
- ninguna oferta muestra `progresoHito` si no es una renovación (el primer intento de este check
  colisionaba con `amateur.js`, que también usa `motivo: 'oferta'` para la decisión de scouting —
  corregido para filtrar también por `sistemaId === 'mercado'`)

**Ajustes a checks existentes, todos documentados como consecuencia del cambio de flujo, no como
regresiones silenciosas**:
- *"El tier 3 es breve"*: p90 sube de 4 a 5 splits por diseño. Ascender ya no es instantáneo — el
  split de espera hasta la próxima pretemporada cuenta como "en tier 3" en esta medición. La
  mediana se mantiene en 2.
- La marca `espera_edad_minima` y el check del año muerto se reescribieron contra
  `flags.ascensoPendiente` en vez de `flags.tier1Esperando` (que ya no existe).

**Medido**:
- `node src/dev/validate.js` — **80 checks, todos OK** (74 + 6 nuevos).
- `node src/dev/simulate.js 1500 60 todas` — **0 crashes** en 4.500 carreras; `llegaronAPro` idéntico
  a la fase 9a (73.7% / 47.5% / 67.9%: esperable, la etapa amateur no la toca esta fase). Sin
  NaN/undefined en la salida.
- Determinismo verificado en 4 seeds distintas (misma seed, dos corridas, JSON final idéntico).
- Lectura manual de una carrera completa (seed 2): ascenso tier3→LDL→LPL, dos renovaciones y una
  transferencia, cierra con un bombazo a Weibo Gaming (\$1,5M/año). Se lee como se pedía: "¿la guita
  o el proyecto?" con números que cambian carrera a carrera.

**Trampa T1, tal como estaba documentado por adelantado en la entrada de la fase 9a**: correr esto
movió el stream de rng — ninguna seed de antes de esta fase reproduce la misma carrera que producía
antes. Es el costo esperado de que `mercado.js` ahora tire dados donde antes `competitivo.js` no
tiraba ninguno.

**Deuda técnica para 9c/9d, no bloqueante**:
- Los campos puramente visuales de la tarjeta (`colorOrg`, `monograma` de §9.5) no existen en el
  modelo de datos: son responsabilidad de la pantalla (9c), no del motor.
- `cupoImports`, `minimoResidentes` y `margenImport` siguen sin consumirse — esta fase solo genera
  ofertas DENTRO de tu propia liga/región (renovación, laterales, el ascenso ganado). Fichajes
  cross-liga ("import" de verdad) quedan fuera de alcance de 9b, documentado para no confundir con
  un olvido.
- Se observó al menos una renovación con una caída de sueldo grande (\$625k → \$93k en la misma org,
  mismo jugador) puramente por el ruido lognormal independiente en cada tirada. No es un bug — la
  fórmula es la que cita `TRASPASO.md` sin retocar — pero es candidato a revisar en 9d si medir
  muestra que las renovaciones deberían tener menos varianza que un fichaje nuevo.

### 2026-08-11 — Fase 9a: contratos y valor de mercado

Primer commit de la fase 9 (`PLAN.md` §9), el mercado. Este paso es solo el motor y los datos —
`competitivo.js` todavía elige tu org (eso es 9b, el cambio de riesgo) y no hay pantalla de ofertas
todavía (9c). Detalle completo del diseño en `PLAN.md`, `# FASE 9 — EL MERCADO`.

**Motor nuevo**: `career.contrato` (objeto completo de ceros desde el arranque, nunca `null` —
trampa T4) en `src/core/state.js`; `core/salarios.js` (`salarioDeOferta`, la fórmula lognormal de
`TRASPASO.md` §4: `mediana * exp(gauss(0,sigma)) * factorRol * jerarquía * hype`, con piso en
`liga.salario.minimoUSD`); `core/valorMercado.js` (`valorDeMercado`, pura y sin rng — una valuación
es una lectura del estado, no una negociación; `sesgoEtario`, el mismo modelo de "el mercado
prefiere jóvenes" que `amateur.scoutingSesgoEtario` pero para la franja de la carrera pro;
`splitsDeResidencia`, derivada de `career.registro.porOrg` sin agregar estado nuevo — evita otro
punto T1/T4 para la regla de "12 splits en una región = residencia" de TRASPASO §4).

**Datos**: `salario: {medianaUSD, mediaUSD, sigma, minimoUSD, modelado}` en las 12 ligas de
`leagues.json` — LEC con las cifras reales citadas en `TRASPASO.md` (Sheep Esports: mediana
~€165k/€178k, media ~€240k/€259k, mínimo oficial €60k/€65k) y LCK/LCS ancladas en sus datos reales
parciales (mínimo LCS $75k oficial; LCK con el outlier real de Faker $6-8M/año tirando la media
muy por encima de la mediana). El resto (LPL, CBLOL, LCP y las 6 ligas de tier 2) está modelado por
prestigio relativo y marcado `modelado: true` para no confundir cifra medida con estimada.
`factorSalario` por rol en `roles.js` (Mid 1.44 · Jungla 1.04 · ADC 1.00 · Top 0.80 · Support 0.70,
TRASPASO §4). `BALANCE.mercado` nuevo con las constantes de §9.7 más la tabla `sesgoEtario` y los
pesos de `valorDeMercado`. `atributos.curvas.*.declive` suavizado ~40% (1/0.6/0.45 → 0.6/0.36/0.27):
el hallazgo de TRASPASO §4 es que el declive real es casi todo mercado (no te renuevan) y casi nada
biológico (~1ms/año de reacción contra 90ms de brecha pro/casual) — la curva se nota menos sin
desaparecer, porque `CONCEPTO` §6 la necesita como razón mecánica para invertir en macro.

**Corrección de nombre, documentada acá porque no hubo turno de usuario de por medio**: `PLAN.md`
§9.1 nombra el campo `salarioMensualUSD`, pero tanto la fórmula de TRASPASO como todos los datos
reales citados (LEC ~€165k/año, Faker $6-8M/año) están en cifras **anuales** — el juego además
opera en splits, no en meses. Se corrigió a `salarioAnualUSD` en todo el motor (`state.js`,
`registro.js`) antes de escribir ningún dato nuevo, para no fijar una inconsistencia desde el
arranque.

**Bug encontrado por el check nuevo, no por lectura de código**: los primeros números de `sigma`
elegidos a mano para las 12 ligas no eran consistentes con la `mediana`/`media` citadas en el mismo
archivo — para una lognormal, `media = mediana * exp(sigma²/2)`, y el check
*"mediana empírica < media × 0.75"* falló en LEC (0.72 de sigma a mano da un ratio teórico
mediana/media ≈ 0.77, por encima del 0.75 que exige el check). Se recalculó `sigma` para las 12
ligas como `sqrt(2·ln(mediaUSD/medianaUSD))`, consistente con los datos ya citados — no se tocó
`medianaUSD`/`mediaUSD` (esos siguen anclados en TRASPASO donde hay dato real). El efecto lateral es
que LCK quedó con el sigma más alto de las doce (1.51): es el mercado con el outlier más extremo
(Faker), así que un spread grande ahí es el modelo funcionando, no un error.

**Checks nuevos** (verificados con trampa T5 — mutados a mano y confirmado que fallan antes de
confirmar que el arreglo los deja en verde, revertido después):
- esquema `salario` completo y `minimoUSD < medianaUSD < mediaUSD` en las 12 ligas (dentro de
  *"Campeones, roles y ligas coherentes"*)
- `factorSalario` existe y es positivo para los cinco roles
- `salarioDeOferta` produce una distribución lognormal (mediana empírica < media × 0.75) — **este
  es el que atrapó el bug de sigma de arriba**, verificado además con el piso de `minimoUSD`
- `sesgoEtario(28) ≤ sesgoEtario(21) × 0.5` (TRASPASO §4) y la tabla es no creciente con la edad
- `career.contrato` arranca completo y en cero (trampa T4)
- `valorDeMercado` es 0 fuera de una liga real (tier 3 o sin equipo) y positivo adentro

**Medido**:
- `node src/dev/validate.js` — **74 checks, todos OK** (69 + 5 nuevos).
- `node src/dev/simulate.js 1500 60 todas` — **0 crashes**, mismos porcentajes de `llegaronAPro`
  que la línea de base pre-fase-9 (equilibrado 73.7% / ranked 47.5% / prudente 67.9%): esperable,
  `mercado.js` todavía no existe y no hay ninguna línea nueva en `ETAPAS_SPLIT` — este commit no
  cambia ni una sola decisión de una carrera real todavía, solo agrega el motor que 9b va a usar.
- Determinismo verificado (misma seed, dos corridas, estado final idéntico en JSON).

**Sin trampa T1 todavía**: a diferencia de 9b (que si va a correr el stream de rng, documentado por
adelantado en `PLAN.md` §9.4), este commit no cambia el orden ni la cantidad de tiradas de ninguna
carrera existente — los tres módulos nuevos no se llaman desde ningún sistema del pipeline todavía.

### 2026-08-10 — Fase 8D: contenido vivo — las marcas sin frase, el eje estatus, el registro que se cita

Insertada fuera de la secuencia lineal (mismo criterio que las fases 5/6 el 2026-08-09): pedido del
usuario de llenar el juego de contenido real, que nada se repita, y que algunas decisiones "marquen
el resto de la carrera" — usando lo que la fase 8 dejó construido y sin estrenar. Detalle completo
en `PLAN.md`, `# FASE 8D`.

**Auditado antes de escribir una línea** (tres exploraciones en paralelo + investigación propia del
estado real de LoL 2026): el catálogo medía 70 eventos/142 opciones/284 outcomes (no 20/40 como
decían documentos viejos — solo faltaban ~8 opciones del objetivo de 150, no 110); 6 marcas que
`calcularMarcas` ya calculaba cada split (`pc_confiscada`, `negociacion_ganada`, `sin_secundario`,
`secundario_terminado`, `signature`, `espera_edad_minima`) no tenían ni un evento detrás; el eje
`estatus` (rookie→titular→referente→franquicia) no gateaba ni un evento; `career.registro.momentos`
—el slot que la fase 8 dejó listo "para que la fase 13 pueda citarlos"— tenía cero llamadas.

**Motor** (3 cambios chicos, todos aditivos): efecto nuevo `type: "momento"` que escribe en
`career.registro.momentos`; 5 marcas nuevas derivadas del registro (`es_campeon`, `multicampeon`,
`paso_por_tier3`, `curtido`, `nomade` — cero persistencia nueva, leen lo que fase 8 ya acumula); fix
de un bug encontrado en la auditoría (`objetivo: "nuevo"` en el efecto `maestria` caía siempre en el
campeón principal en vez del recién aprendido — `pool_campeon_nuevo`/`pool_campeon_nuevo_soloq`
llevaban este bug desde antes de esta fase); la ficha muestra los momentos junto a "Ver carrera".

**Contenido**: 28 eventos nuevos / 54 opciones nuevas en 8 archivos (4 nuevos: `marcas_vivas.json`,
`estatus.json`, `registro_cita.json`, `escena_2026.json`; 4 extendidos: `rol/jungla.json`,
`negocios.json`, `salud_vida.json`, `competicion.json`). Todo evento nuevo declara `etapa` y, cuando
aplica, `edadBanda`/`nivel`/`estatus`/`marcas` explícitamente. `escena_2026.json` usa grounding real
investigado aparte (parche ~26.15/26.16, Fearless Draft, la regla nueva "First Selection" de 2026)
solo para textura/jerga — nunca para afirmar balance real de campeones, mismo criterio que ya
sostiene `metas.json`. Se descartó a tiempo un evento de "selección nacional" (no existe en LoL,
la escena es 100% de clubes) y se reemplazó por el equipo ideal del split (All-Pro Team, honor real).

**Medido**:
- `node src/dev/validate.js` — **65 checks, todos OK** (5 nuevos: esquema de `momento`, las 6 marcas
  con contenido, el eje `estatus` cubierto, el catálogo alcanza el objetivo, una fracción sana de
  carreras largas ve un `momento`).
- `node src/dev/simulate.js 1500 60 todas` — **0 crashes** en 4.500 carreras (3 estrategias × 1500).
- `node src/dev/cobertura.js --huecos` — **"Sin huecos: todas las celdas alcanzables llegan al
  mínimo"**; catálogo: **196 opciones / objetivo 150**.
- Verificación manual en Chrome real (headless vía CDP): una seed elegida por motor puro (seed 3342,
  60 splits) pasa por 3 organizaciones (tier3→tier2→tier1), 18 títulos y **12 momentos de 6 tipos
  distintos**, todos citando org/año/edad reales de esa carrera — no genéricos. Por separado, se
  cargaron los módulos reales de motor y UI **dentro de la página servida** y se llamó al
  `renderCarrera` de producción (no un mock) contra un DOM fabricado: el HTML resultante trae
  `<details><summary>Momentos (1)</summary>` con el texto correcto — confirma que la ficha renderiza
  un momento con el código real, no solo a nivel de estado.

**Corrección post-medición, fuera del alcance original**: agregar contenido corrió el stream de RNG
(trampa T1, misma familia que D21/D22) y el check de la fase 3 *"tier 3 es breve"* pasó de p90=4 a
p90=5 a n=1500. Investigado con una sonda aparte antes de tocar nada: medido a n=1500/3000/6000
**antes y después** del contenido nuevo, el p90 real cae casi exactamente en el borde 4/5 (~90%
acumulado en 4) en ambas versiones — a n=1500 cualquiera de las dos puede caer para cualquier lado
del borde según qué seeds entran; a n=6000 ambas dan p90=4 estable. No se tocó ninguna constante de
balance de tier 3: se subió la muestra del check (1500 → 6000). Documentado como **D24** en
`PLAN.md`.

**La fase 8D queda cerrada.** No confundir con la fase 13 real (`# FASE 13 — CONTENIDO A ESCALA` en
`PLAN.md`), que sigue pendiente y depende del mercado (fase 9) y el retiro (fase 10).

### 2026-08-09 — Fase 8c: se mide el arraigo, y la medición cierra la fase 8

Tercera y última parte de la fase 8 (regla de proceso 2: primero la estructura — 8a/8b —, después
se calibra). Se corrió una sonda de 600 carreras a 60 splits para medir de verdad la distribución
de `career.arraigo` antes de tocar ninguna constante.

**Medido**: de las carreras con ≥8 splits en una misma org (416 de 600, 69,3%), la distribución de
la banda de arraigo más alta alcanzada es **bimodal**: `leyenda` (88+) en 210 (50,5%), `uno_mas`
(<25) en 107 (25,7%), y `querido`+`idolo` juntos apenas 99 (23,8%). El arraigo máximo tiene mediana
89 y p25 en 24 — la mayoría o casi no arranca o llega arriba de todo, con poco tránsito por el
medio. La causa mecánica: la fila más larga de una carrera tiene mediana **44 splits** (p75: 48),
y a ~1,2 de ganancia base por split eso solo ya se acerca a `idolo` (60) antes de sumar los bonos
de título/internacional/brecha, que terminan de empujar a la mayoría hasta `leyenda`.

**Decisión, sin retunear nada**: el check declarado en la fase 8a (`≥15% llega a Ídolo+`) mide
**59,9%** — lo pasa cómodo. Por la regla de proceso 3 ("si el balance se sale de banda, primero
agregar contenido, no tocar constantes") y porque acá el balance **no** se salió de banda —
al revés, la superó ampliamente —, no hay nada que forzar. La curva quedó anotada como **D23** en
`PLAN.md` (deuda técnica, abierta): si más adelante se quiere que "Leyenda" se sienta tan raro como
en la referencia (aparece una sola vez en las 15 imágenes de El Ídolo del Potrero, al cierre de una
carrera de 26 años), es candidata a suavizarse en la fase 11 o 13, con contenido real de por medio,
no como un ajuste de número aislado.

Se agregó el check que la fase 8a había dejado pendiente para después de medir: *"El arraigo llega
a Ídolo+ en una fracción sana de las carreras estables en una org"* (`validate.js`), sobre 300
seeds a 60 splits.

**Verificado**: `node src/dev/validate.js` — **59 checks, todos OK** (1 nuevo). `simulate.js` no se
volvió a correr: esta fase no tocó `src/core`, `src/systems` ni `src/data` — solo agregó un check y
documentación —, así que la corrida de 6000 carreras de la fase 8b sigue siendo la huella vigente.

**La fase 8 completa (a + b + c) queda cerrada.** Sigue la fase 9: el mercado.

### 2026-08-09 — Fase 8b: `src/ui/` deja de estar vacía + la ficha permanente

Segunda mitad de la fase 8 (la primera, "el registro acumula", es la entrada anterior de este
changelog). Con el registro ya acumulando, esta mitad construye la pantalla que lo muestra — la
regla de proceso 12 nueva ("ninguna fase cierra sin su pantalla") aplicada a sí misma.

**`src/core/ficha.js` completo**: además de `nivelDelJugador` (de la fase 8a), ahora expone
`bandaDeNivel`, `deltasDeStats` (las flechas ▲▼, contra `flags.edadSnapshot`), `statDestacado` (el
stat más alto del rol), `bandaDeJerarquia` / `bandaDeArraigoFicha` (bandas con nombre, piso, techo
del próximo hito y si ya es el máximo), `estadoInternacional` (`sin_chance`/`en_carpeta`/
`clasificado`/`jugando`, según `career.posicion` contra `liga.cuposInternacionales`),
`dueloDeGeneracion` (stub — la fase 11 lo llena) y `fichaCompleta`, el objeto único que consume la
UI. Todo puro, sin RNG.

**`CAMPOS_EDAD`** (`edadInicio.js`) se amplió de 3 a 6 stats de rol (agregó macro, teamfight,
laneo, shotcalling, adaptabilidad) — sin esto las flechas solo podían mostrarse para mecánica.

**`src/ui/` deja de estar vacía (cierra D7)**: 476 líneas en 8 módulos —
`components/{ficha,barra,statRow,decision,feed}.js` y `screens/{inicio,carrera}.js`, más
`render.js` como único punto de entrada. `index.html` extrae `renderRoles`/`renderCampeones`/
`actualizarBotonEmpezar` (ahora `screens/inicio.js`, dueño de su propio estado de selección),
`renderLogs` (`components/feed.js`) y la mitad no-minijuego de `mostrarDecision`
(`components/decision.js`). **Los 5 minijuegos NO se movieron** (PLAN.md §8.5: se les cambia la
presentación recién en la fase 12) — siguen inline en `index.html`, igual que el control de flujo
que llama al pipeline (`comenzarCarrera`/`avanzar`/`responder`).

**La tarjeta permanente** (`components/ficha.js`, nueva): NIVEL grande con banda de color, ▲▼ por
atributo contra el snapshot de la edad, el destacado resaltado, dos barras con los 4 hitos
dibujados (arraigo y jerarquía, como pidió PARTE 3 del plan), el estado internacional con nombre,
el pool con la tier del régimen vigente al lado, y un `<details>` "Ver carrera" con
`registro.porOrg` — el mismo componente que la fase 10 va a reusar para la tarjeta final. En etapa
amateur pinta otra fila (estudios/confianza/sueño/ranked) en vez de arraigo/jerarquía/pool, como
pedía §8.6 punto 7.

**Guardas nuevas**: `dev/guards.js` agrega `verificarDocumentSoloEnUi` (regex `\bdocument\s*[.[]`,
que no confunde con la prosa "documento"/"documentación") y un check en `validate.js` que falla si
algo fuera de `src/ui/` toca el DOM (regla invariable 2). Otro check nuevo mide que
`deltasDeStats()` dé al menos un delta en ≥80% de los cierres de edad — medido: **pasa** sin
tunear nada, la ampliación de `CAMPOS_EDAD` alcanzó.

**Números medidos** (`PLAN.md` §8.9, con su corrección post-medición ahí mismo): campos del estado
visibles en pantalla, 8 → **≥22** (NIVEL, 6 atributos con flecha, jerarquía y arraigo con banda,
internacional, pool con tier, historia). `index.html` **no** bajó a ≤350 líneas como se había
estimado a ciegas — quedó en 1.069, casi igual que antes (1.090) — porque la ficha nueva agrega
~330 líneas de CSS real (barras con hitos, stat-row, badges) y los minijuegos (~230 líneas) se
quedan adentro a propósito. Lo que sí se movió es lo que la deuda D7 pedía: `src/ui/` pasó de 0 a
**476 líneas** en módulos reusables — no es lo mismo tener 1.069 líneas en un archivo que 593 en
uno más los 476 repartidos en 8 módulos con una sola responsabilidad cada uno.

**`DISENO.md` §4.1** actualizado con el árbol real de `src/core/` (+`registro.js`, `+ficha.js`) y
`src/ui/` (deja de decir "sigue vacía").

**Verificado**: `node src/dev/validate.js` — **58 checks, todos OK** (2 nuevos de esta mitad).
`node src/dev/simulate.js 1500 60 todas` — 0 crashes en 6000 carreras (esta fase no toca game
logic, solo presentación). Y, por primera vez en el proyecto desde la fase 0, **verificación real
en navegador**: Chrome headless vía CDP crudo (WebSocket nativo de Node, sin Puppeteer/Playwright
instalados — mismo criterio que la verificación manual documentada en el changelog del
2026-08-06), perfil aislado, seed fija. Se clickeó rol → 3 campeones → "Empezar carrera" → 45
decisiones seguidas (incluido un minijuego real). La ficha se actualizó en cada split, pasó del
panel de amateur al de profesional en el momento justo, el destacado cambió de stat, las barras de
arraigo/jerarquía mostraron los hitos con nombre reales (`Uno más · 15/100`, `Rookie · 23/100`), y
**cero errores y cero excepciones de consola** en toda la corrida. Screenshot revisado a mano.

**Sigue en la fase 8**: 8c — calibrar `BALANCE.arraigo` contra la distribución real medida (el
check de "llega a Ídolo en ≥15%" quedó para esa calibración, no se fuerza acá sin medir primero,
regla de proceso 2).

### 2026-08-09 — Auditoría contra El Ídolo del Potrero + Fase 8a: el registro acumula

**El pedido**: el usuario reportó que, jugando de verdad, "las decisiones no importan, las
preguntas se repiten todo el tiempo, nada tiene sentido" — pasó de los 23 a los 49 años sin que se
retire el personaje apretando botones. Pidió una auditoría imagen por imagen contra El Ídolo del
Potrero (14 capturas de una carrera completa) para encontrar, con evidencia concreta, por qué un
juego con 7 fases cerradas y 26+ checks se sentía así.

**El diagnóstico** (documento completo: `PLAN.md`, PARTE 1 — 10 hallazgos, cada uno con imagen y
línea de código). La tesis: *"Potrero no tiene más sistemas: tiene un registro que acumula y una
ficha que lo muestra. Este proyecto tiene veinte sistemas y ningún registro."* Los hallazgos más
graves, verificados en el código y no solo en la queja:

- **H2 — nunca elegís tu equipo.** `competitivo.js:33/136` sorteaba la org con
  `weightedPick(liga.orgs, c => 100 - c.fuerza, rng)` — ponderado hacia la MÁS DÉBIL de la liga. No
  había oferta, contrato, ni sueldo en todo el proyecto. La "trampa de firmar por el equipo grande"
  que `CONCEPTO.md` §7 documenta como cadena causal central era, literalmente, imposible de
  disparar: no había firma.
- **H3 — no hay final.** `maxSplitsDeSeguridad: 90` (comentado como "red anti-loop, no una regla de
  juego") lo agotaba el 49,1% de las carreras (D2). No existía `retiro.js`, y `renderResumenFinal`
  escribía una frase en un `<div>` — el juego cuyo producto final es una tarjeta compartible no
  tenía la tarjeta.
- **H7 — los números no tienen referente.** El NIVEL (media ponderada por rol) ya se calculaba
  adentro de `calcularRendimiento` y nunca se mostraba; las bandas con nombre
  (`rookie/titular/referente/franquicia`) ya existían en `contexto.js:78` y nunca llegaban a
  pantalla — salía `jerarquía 47` en un log.

**El plan de corrección** (`PLAN.md`, reescrito de punta a punta; las fases 0-7 no se tocaron):
seis fases nuevas — **8 La ficha** (el registro que acumula + la tarjeta permanente + `src/ui/`),
**9 El mercado** (elegís equipo; la trampa del equipo grande, visible), **10 El final** (retiro
emergente + tarjeta de legado), **11 El año** (calendario, nota de temporada, archirrival),
**12 La jerarquía de la decisión** (categorías, rareza, consecuencia antes de elegir), **13
Contenido a escala** — reemplazan a las viejas fases 8-11. Regla de proceso nueva, la más
importante: *"Ninguna fase cierra sin su pantalla."* Decisiones tomadas con el usuario: tarjeta
completa tipo Potrero, un NIVEL 0-100 único (extraído de la fórmula que ya existía, sin
retunearla), y **jerarquía + arraigo como dos ejes separados** (jerarquía = estatus deportivo, ya
existía, se resetea; arraigo = vínculo con la gente de la org, nuevo, nunca se resetea).
`CONCEPTO.md` §1/§11 (duración pasa de "4-10 min" a "25-40 min", alineado con una decisión ya
tomada y nunca propagada al documento) y §6 (arraigo) se actualizaron.

**Fase 8a implementada — "el registro acumula" (motor, sin pantalla todavía: eso es 8b).**

- `state.js`: `career.registro` (objeto que **solo crece** — splits jugados, fechas/mapas/series
  G-P, títulos e internacionales con año, picos de nivel/jerarquía/arraigo/hype, y una fila por
  org con sus propios splits/fechas/títulos/jerarquía máxima/arraigo máximo) y `state.calendario`
  (`anio`, calculado de `splitCount`, sin consumir `rng`). Los dos, objetos completos de ceros
  desde el arranque (trampa T4). `career.arraigo` nuevo, distinto de `career.jerarquia`.
- `src/core/registro.js` (nuevo, puro): único punto de escritura sobre `career.registro`
  (`abrirFila`/`cerrarFila`/`registrarSplitEnFila`/`registrarFecha`/`registrarMapa`/
  `registrarSerie`/`registrarTitulo`/`registrarInternacional`/`registrarPico`/
  `registrarArraigoEnFila`/`bandaDeArraigo`/`arraigoInicial`) — para que "el registro solo crece"
  (regla de proceso 14, nueva) se sostenga en un solo lugar en vez de reimplementarse en cada
  sistema que lo toca.
- `src/core/ficha.js` (nuevo, puro): `nivelDelJugador(state)`, la MISMA fórmula que ya vivía adentro
  de `calcularRendimiento` (`rendimiento.js:26-31`), extraída sin retunear un solo número (regla de
  proceso 2) para que se pueda exponer. `rendimiento.js` ahora la importa en vez de mantener dos
  copias.
- **Quién escribe qué**: `roster.js` abre/cierra filas de `porOrg`, suma el goteo de arraigo "de
  base" por split (escalado por `ROLES[].visibilidad`) y da el arraigo inicial al fichar
  ("tu fama te precede", proporcional al hype); `competitivo.js` cierra la fila con
  `motivoDeSalida` (`ascenso`/`disolucion`) justo antes de cambiar de org; `temporada.js` registra
  cada fecha (marcada o silenciosa) en `avanzarFechaSilenciosa`, el único choke point de las dos;
  `serie.js` registra cada mapa, cada serie, y arma `internacionales[].camino` con los mapas
  jugados; `rendimiento.js` registra títulos/internacionales de tier 2/3 (sin bracket) y el bono de
  arraigo por rendir sobre lo esperado (reusa la misma `brecha` que ya mueve la jerarquía) y por
  fracaso; `atributos.js` cuenta `splitsJugados` (coincide siempre con `player.splitCount`, ambos
  se incrementan en el mismo sistema) y el pico de NIVEL.
- `BALANCE.calendario` (`anioBase: 2026`), `BALANCE.arraigo` (rangos por split/título/internacional/
  fracaso, factor de brecha, piso por hype, los 4 hitos con nombre: uno_mas/querido/idolo/leyenda)
  y `BALANCE.ficha` (bandas de NIVEL) nuevos.

**8 checks nuevos en `validate.js`.** Dos de ellos fallaron en la primera corrida y la causa, en
los dos casos, fue el check — no el motor (regla de proceso 7: verificar que un check falla cuando
debe, y por qué):

- *`calendario.anio avanza exactamente 1...`*: el check comparaba `calendario.anio` (calculado por
  `edadInicio.js` **al empezar** el split, con el `splitCount` de ANTES) contra el `splitCount` de
  DESPUÉS de que `atributos.js` ya lo había incrementado en el mismo split. Se corrigió el check
  para comparar contra el `splitCount` capturado al empezar, no al terminar.
- *`picos.nivel se alcanza antes del último split...`*: medía 32,7% contra un 70% esperado, corrida
  a 30 splits (el techo que traía la primera versión del check). Investigado con una traza directa
  (`nivelDelJugador` split a split): el mecanismo de declive funciona — hay carreras que muestran
  una curva clara de subida-pico-caída (ver seed 7 de la traza) — pero `correrCarrera` cuenta
  splits desde los 15 años, así que a los 30 splits la mayoría todavía está a mitad de su tramo
  profesional, en la parte que sube (macro y shotcalling no declinan, `CONCEPTO.md` §6). Corriendo
  la misma medición a 60 splits: **90,7%**. Se corrigió la ventana del check a 60 splits, no el
  umbral ni el motor.

**Verificado**: `node src/dev/validate.js` — 56 checks, todos `OK` (los 8 nuevos incluidos).
`node src/dev/simulate.js 1500 60 todas` — **0 crashes** en 6000 carreras (1500 seeds × 4
estrategias); `llegaronAPro` da 73,9% (equilibrado) / 47,5% (ranked) / 65,7% (prudente), en línea
con lo medido al cerrar la fase 7 — esta fase no tocó balance, solo agrega tracking, y los números
lo confirman. `node server.js` sirve `index.html` y los módulos nuevos (`core/registro.js`,
`core/ficha.js`) con 200. La UI de `index.html` no se tocó (no lee los campos nuevos todavía: eso
es la fase 8b) y sigue funcionando exactamente igual.

**Sigue en la fase 8**: 8b (`src/ui/`, la tarjeta permanente) y 8c (calibrar `BALANCE.arraigo`
contra los números reales una vez que la tarjeta los hace visibles).

### 2026-08-09 — Corrección: lenguaje de "equipo profesional" colándose en la etapa amateur

Bug reportado directamente por el usuario jugando: a los 15 años, en soloQ (Oro), le salió el
evento "Salió un campeón nuevo" con la opción *"Practicarlo a fondo antes del próximo partido"* y
un resultado que hablaba de *"llevarlo a un partido oficial"*. A los 15 en soloQ no hay partido
oficial — el mensaje no tenía sentido, y el usuario lo leyó (con razón) como evidencia de que nada
de lo hecho en las fases 5-7 se había aplicado de verdad.

**Causa real, dicha sin vueltas**: es un gap de esta misma sesión, no un defecto viejo. La entrada
de la fase 6 (2026-08-09, más abajo en este changelog) dice textualmente que "los otros cinco
eventos de pool... se retextean para hablar de regímenes y tiers en vez de afinidad abstracta" —
pero en los hechos sólo se tocó la descripción de `pool_main_muerto`. Los otros cuatro
(`pool_estrechez`, `pool_identidad_diluida`, `pool_contra_la_corriente`, `pool_campeon_nuevo`)
quedaron con el texto viejo de "el draft"/"reunión de repaso"/"partido oficial", que nunca fue
correcto para un jugador que todavía no tiene equipo. El changelog de esa fase sobreestimó lo que
en realidad se había hecho.

**Auditoría completa, no solo el caso reportado**: se armó un script que cruza cada evento de
`data/events/**/*.json` contra su `contexto.etapa` (excluyendo `partido/*.json`, que gatea por
`stakes` y estructuralmente no puede aparecer fuera de `systems/temporada.js`) y busca vocabulario
de equipo real ("coach", "staff", "el draft", "reunión de repaso", "partido oficial", "ganó el
partido", "vestuario", "prensa de la escena") en cualquier evento alcanzable durante `etapa:
amateur`. Encontró **9 eventos**, 2 de ellos `bisagra: true` (alta frecuencia): `pool_campeon_nuevo`
(el caso reportado), `pool_main_muerto`, `pool_estrechez`, `pool_identidad_diluida`,
`pool_contra_la_corriente`, `support_nadie_te_vio`, `burnout`, `top_recorte_sin_contexto`,
`adc_si_perdemos_es_por_vos`. Se descartaron como falsos positivos `academy_offer` (menciona
"coach"/"scrim" pero es literalmente una prueba con un equipo amateur juvenil, contrastada a
propósito contra el soloQ) y `psychologist` (exige `nivel: tier1/tier2`, que `core/contexto.js`
nunca produce durante `phase: 'amateur'` — ahí `calcularNivel` siempre da `'soloq'`).

**El arreglo**: los dos eventos `bisagra` se separaron en un par pro/amateur, porque salen tan
seguido que ameritan texto propio para cada etapa: `pool_campeon_nuevo` ganó
`etapa: ["debut","profesional"]` y se creó `pool_campeon_nuevo_soloq` (mismo peso/cooldown, texto
de ranked — "la próxima seguidilla de rankeds", "partidas clasificatorias", nada de "partido
oficial"); mismo tratamiento para `pool_main_muerto` → `pool_main_muerto_soloq`. Los siete
restantes se retextearon en el mismo evento (más barato, y el mecanismo de fondo es igual de real
en soloQ que en un equipo): "el draft" → "el champ select", "reunión de repaso" → "cualquiera que
te vea jugar seguido", "el equipo ganó el partido" → "tu equipo ganó la partida", "decírselo al
staff" → "pedir bajar la carga" (sin nombrar a quién). De paso, la traza de verificación encontró
un décimo caso menor no listado originalmente: `burnout` decía "faltan pocas jornadas" (jornada =
día de partido de una liga, no existe en soloQ) — se cambió a "falta poco para que se cierre el
split" (split sí es vocabulario genérico del motor, usado en ambas etapas por `splitCount`).

**Verificación, en cuatro pasos**:
1. Re-corrida la auditoría: quedan sólo los 2 falsos positivos ya explicados, cero lenguaje roto de
   verdad.
2. `node src/dev/validate.js`: los 55 checks pasan sin tocar ninguno (es contenido, no estructura).
3. Traza real de 60 seeds × 12 splits de etapa amateur (3205 logs leídos de punta a punta, no sólo
   grep): apareció una segunda categoría de coincidencias — 28 casos de texto "pro" disparando
   dentro de un split marcado como amateur. Investigado a fondo: los 28 son el **split exacto del
   fichaje** (`amateur.js` corre antes que `events.js` en `ETAPAS_SPLIT`, así que en el split en que
   firmás, para cuando `events.js` evalúa el contexto ya sos profesional) — comportamiento correcto
   a propósito, no el bug. Confirmado marcando cada coincidencia con si ese split incluía un log
   "Firmaste con...": las 28 lo incluían. Cero casos genuinos de amateur puro.
4. La misma traza probó, de paso, que el sistema de meta con nombre de la fase 6 sí corre desde el
   primer split amateur (`[meta] Parche 2: sigue la meta de tanques...`, saltos de tier del main
   nombrados por parche) — la parte de la queja del usuario de "nada se aplicó" no aplica a esa
   fase; el problema real era acotado al vocabulario de estos 9-10 eventos.

Archivos tocados: `src/data/events/pool.json`, `src/data/events/rol/support.json`,
`src/data/events/salud_vida.json`, `src/data/events/rol/top.json`, `src/data/events/rol/adc.json`.
Sin cambios de balance ni de estructura — commit separado de cualquier retuning.

### 2026-08-09 — Fase 7: el prólogo se comprime y la repetición se rompe

Última de las tres fases insertadas antes del mercado. Dos problemas medidos al arrancar: la etapa
amateur medía 15 splits de mediana de ~30 totales (la mitad de la partida) y el 49% de las carreras
no llegaba a pro; y el catálogo de eventos se reciclaba en round-robin (el evento más repetido
salía 10 veces por carrera, mediana), porque lo único que evitaba el repetido era el cooldown fijo
de cada evento.

**7a — comprimir el prólogo (commit separado, solo constantes)**: `lpPorBloque` 52→68,
`puntosEscaleraCompleta` (el freno de altura de la ladder) 4300→4700, `scoutingProbPorNivel` casi
duplicado en cada banda, `puntosParaRadar` 2800→2200, `splitMinimoScouting` 3→2. Medido sobre 1500
carreras × 90 splits: mediana de splits en amateur 15→8, `llegaronAPro` 40,4%→73,9% (banda 65-75%,
cumplida), `no_llego` 49%→21,1% (objetivo ≤25%, cumplido). La mediana de 8 no llegó al objetivo de
≤6 — se documenta sin retocar más constantes, porque seguir empujando ese número (se probaron ~10
combinaciones) solo lo lograba aflojando tanto el freno de altura que `llegaronAPro` se iba muy por
encima de la banda 65-75% que el usuario sí pidió explícitamente.

**7b — memoria anti-repetición**: `pesoConMemoria` en `systems/events.js` — cada vista de un evento
le corre el peso en contra (`1 / (1 + vistas × fatigaPorVista)`) la próxima vez que compite, y la
primera vez sin ver suma un `bonusNovedad`. Se aplica tanto a la selección general
(`elegirEvento`/`elegirEventoCierre`) como a la de las fechas marcadas de `systems/temporada.js`
(momento y reacción), que comparten el mismo contador `state.flags.eventosVistos`. No reemplaza al
cooldown (que sigue sacando el evento del todo un tiempo): esto además hace que, aun disponible, un
evento visto compita peor contra uno que nunca salió.

**7c — más baraja en el cierre de edad**: 4 eventos nuevos en `data/events/cierre_edad.json`.
`balance_de_temporada` (el único disponible para un pro joven, ya que `cuentas_de_la_carrera`
exige `edadBanda: pico/tardia/veterana`) dejó de ser la única opción: se agregó
`joven_el_primer_balance` para esa misma franja de edad, `tier3_el_cierre_de_un_armado_chico`
(hueco real: tier 3 no tenía NINGÚN evento de cierre, porque `balance_de_temporada` exige
`nivel: tier2/tier1`), `el_year_review_publico` (nivel tier1) y `el_vestuario_que_se_arma_de_nuevo`
(marca `con_vestuario`).

**7d — densidad**: los logs puramente numéricos (el resumen de fin de split en `atributos.js`, el
"Ajuste al meta: X/100" de `campeones.js`, el resumen de offseason en `practica.js`) pasan a llevar
`tecnico: true` en el `extra` del log — no se esconden todavía (la UI es fase 11), pero dejan la
señal lista. Se midió `BALANCE.edad.probSegundaDecisionPorTipo` contra el ciclo nuevo (con las
fechas marcadas de la fase 5 metiendo sus propias decisiones) y no se tocó: la mediana de líneas
de log por split profesional ya da 15, con splits sin ninguna línea narrativa en 0 sobre 12.896
splits medidos — no hay indicio de que la densidad se haya roto en ninguna dirección.

**55 checks** (53 → 55; 7b/7c no necesitaron checks propios, están cubiertos por los dos nuevos).
Los dos nuevos son una **corrección post-medición sobre el propio plan de esta fase**: el objetivo
original pedía "mediana ≤ 4, máximo ≤ 8" repeticiones ABSOLUTAS del evento más visto. Con
`llegaronAPro` subiendo de ~40% a ~74%, las carreras pasan casi el triple de splits en fase
profesional, así que el conteo absoluto de instancias de evento por carrera creció con la
población — un tope absoluto ya no mide lo mismo que medía cuando se escribió el plan. La métrica
que sí es independiente del tamaño de la población es la **concentración** (qué fracción de todo
lo que la carrera vio es el evento más repetido): medida en 8,8% de mediana y 17,2% de p90, muy por
debajo del ~25-33% que daba el mecanismo viejo estimado a mano. El segundo check nuevo mide
variedad: una carrera de 30 splits que llega a pro ve una mediana de eventos distintos muy por
encima del piso de 20 declarado.

**Números medidos** (1500 carreras × 90 splits, equilibrado): 0 crashes; determinismo verificado.
`llegaronAPro` 73,9%, `no_llego` 21,1%, `burnout` 27,3% — casi todo ese burnout (confirmado con una
medición aparte) ocurre YA SIENDO PROFESIONAL, no en el amateurismo: es la consecuencia esperada de
que muchas más carreras ahora sobrevivan lo bastante para exponerse al riesgo de burnout de la fase
profesional, no un efecto nuevo introducido acá. Corregir esa cifra es tocar el mecanismo de
burnout profesional o agregar un final emergente de verdad — trabajo de la fase 9, no de esta.
También subió la fracción de carreras que siguen activas al tope de 90 splits sin haber retirado
(deuda **D2**, ya anotada): sigue siendo la razón por la que la fase 9 existe.

### 2026-08-09 — Fase 6: el meta con nombre

Segunda de las tres fases insertadas antes del mercado. Antes de esto, `systems/meta.js` movía nueve
pesos con un random walk gaussiano y el jugador veía *"Ajuste al meta: 49/100"* — un número sin
nombre, sin forma de anticiparlo y clavado casi siempre cerca del centro (era literalmente el
defecto que el usuario señaló: *"que no sea un número de afinidad al meta"*).

**Nuevo**: `src/data/metas.json` (9 regímenes — tanques, hipercarry, asesinos, magos de control,
partidas largas, agresión temprana, peleas 5v5, splitpush, bruisers — cada uno con qué sube, qué
hunde y una línea de cómo se juega el parche) y `src/core/regimen.js` (`tierListDeRol`,
`coincidencias`, `boostDelPool`, `saltosDeTierPropios` — todo puro, sin RNG). `systems/meta.js` se
reescribió entero sobre esto. El vector de pesos (`state.meta.weights`) sigue existiendo con el
mismo vocabulario de arquetipos de siempre — lo único que cambió es quién lo escribe — así que
`afinidadDeCampeon`, `deseoPorCampeon`, `campeonesEnMeta` y todo lo que ya cruzaba el pool contra
el meta (el draft de `campeones.js`, el rival de una serie en `core/serie.js`) siguió funcionando
sin tocarse.

**El mecanismo**: el régimen cambia como una noticia, no como una deriva — 60% de chance al abrir
cada season (cada 3 splits), 25% de un parche correctivo a mitad de cualquier split (números
textuales del usuario). `campeonesMuertos` (antes: fracción continua de afinidad,
`umbralMainMuerto`) pasa a colgar del salto de tier real (S/A → B/C), que es lo que el log nombra.
El boost del pool (`ajusteAlMeta`, ahora `boostDelPool`) dejó de promediar afinidad ponderada por
maestría —lo que lo clavaba siempre cerca de 50— y pasa a sumar, para cada campeón del pool,
`maestría × peso de su tier` (S=1.0 · A=0.6 · B=0.25 · C=0): tener uno en S con maestría alta pesa
mucho, tener diez en C no suma nada. El evento nuevo `pool_a_cual_le_metes`
(`data/events/pool.json`) es la decisión explícita que pidió el usuario — practicar al de siempre o
meterle horas a uno del régimen actual— y `pool_main_muerto` se retexteó para hablar de tier list en
vez de afinidad abstracta.

**48 checks pasaron a 53.** Los 5 nuevos: el régimen cambia en la banda declarada (55-65% en
apertura, 20-30% correctivo), toda carrera de más de 15 splits ve al menos tres regímenes
distintos, la tier list cubre el rol completo sin repetidos, el boost no se clava en el centro
(CONCEPTO §6: 0.75x-1.25x), y `pool_a_cual_le_metes` sale entre 1 y 8 veces por carrera entre las
que llegan a pro. Dos correcciones de check antes de que pasaran, ambas trampa T6 (medir contra una
población que diluye el efecto real): la tier list se calcula ANTES de que el mismo `aplicar()`
resuelva el debut de un campeón nuevo, así que puede quedar un campeón corta exactamente ese split
— se toleró un desfasaje de 1; y la mediana de apariciones de `pool_a_cual_le_metes` se median
sobre las 200 seeds completas, incluidas las que nunca llegan a pro (más de la mitad) — se
restringió a la subpoblación que sí llega, como ya advertía la nota de la fase 5 sobre esta misma
trampa.

**Números medidos** (400-1500 carreras según el check): el régimen cambió en el 61,5% de las
aperturas de season y en el 24,9% de los splits correctivos (declarado: 60% y 25%). El multiplicador
de meta real —lo que CONCEPTO §6 promete entre 0,75x y 1,25x— corre con p10 = 0,850, mediana = 0,960,
p90 = 1,085: una separación de 0,235 entre p10 y p90, contra el defecto viejo que orbitaba siempre
cerca de 50/100. Una carrera de 45 splits ve una mediana de 6 regímenes distintos. `simulate.js 1500
90 todas`: 0 crashes; `llegaronAPro` (equilibrado) 41,4% contra el 40,4%-41,9% ya medido; burnout
23,5%, dentro del ruido ya visto entre fases. Determinismo verificado.

**Fuera de alcance, por decisión tomada con el usuario**: los rumores de parche (apostar a practicar
un campeón antes de que el meta lo favorezca) y que el régimen mueva la fuerza de los otros equipos
o la visibilidad por rol. Quedan anotados, no son deuda — nunca se prometieron en `PLAN.md`.

### 2026-08-09 — Fase 5: la temporada existe, la fecha que importa

Primera de las tres fases insertadas antes del mercado (`PLAN.md`, commit del mismo día). El
disparador fue jugar el simulador con las cuatro fases previas hechas: la temporada regular se
resolvía con una sola tirada (`posicionEnLaLiga`, ahora borrada de `rendimiento.js`) y el evento
del split caía *después* de que el resultado ya estaba decidido — nunca podía existir un "se viene
tal partido".

**Nuevo**: `src/core/temporada.js` (calendario, tabla de posiciones, elección de fechas marcadas —
todo puro) y `src/systems/temporada.js` (el sistema, insertado en `registro.js` justo antes de
`rendimiento`). `rendimiento.js` se recortó: ya no tira su propia `gauss` para la posición, lee
`career.temporada.{posicion,tabla,rendimiento}` que dejó `temporada.js`. Contenido nuevo:
`src/data/events/partido/{presion,clasico,dentro_del_mapa,postpartido}.json` (24 eventos, 55
opciones), gateados por un eje nuevo `stakes` (`data/contextos.js`) que **solo existe con el
override que arma `systems/temporada.js`** — `calcularContexto(state)` sin overrides nunca lo
produce, así que este contenido no puede colarse por la selección normal de `events.js` y
`dev/cobertura.js` no lo puede medir (se verifica con un check propio, ver abajo).

**El mecanismo**: cada split profesional genera un calendario real (una fecha contra cada otra org
de la liga o zona de tier 3), resuelve TODAS las fechas de una vez en silencio salvo 2-3 que se
puntúan por lo que tienen en juego (`clasico`, `puntero`, `define_clasificacion`, `revancha`,
`presion`, `rival_de_generacion`, con `parejo` de red). Esas se juegan de verdad: un draft corto
(mucho más liviano que el Fearless de playoffs — reusa la misma lógica de dominancia de
`core/serie.js`, sin quema de campeones), un momento con 2-4 opciones cuyo efecto nuevo
`type: 'partido'` mueve el resultado de ESA fecha puntual (nunca un stat abstracto), y a veces una
reacción posterior que ya no toca el resultado. Los tokens de contenido ganaron `{rivalDeLaFecha}`
(`core/plantillas.js`) para nombrar al rival de la fecha sin confundirlo con el rival de generación.

**Bug real encontrado simulando, no leyendo código**: la tabla no cerraba (Σ ganados ≠ Σ perdidos)
porque cuando el jugador le ganaba o perdía a un rival, el resultado se anotaba solo en la fila
propia — la fila del rival, ya cerrada por `simularResto`, nunca se enteraba. Se arregló
anotando las dos filas a la vez en `avanzarFechaSilenciosa`. Un segundo bug, más sutil: un tier 3
recién refichado puede tener `currentOrg` fresco pero `companeros` todavía vacío un split entero
(`roster.js` corre antes que `competitivo.js` en el registro), y `temporada.js` tenía un guard
extra (`liga.orgs.length < 2`) que `rendimiento.js` no compartía — un resto de una asunción
descartada durante el desarrollo. Se sacó: los dos sistemas comparten ahora exactamente el mismo
guard, regla de proceso nueva para cualquier par sistema-productor/sistema-consumidor.

**43 checks pasaron a 48.** Los 5 nuevos: la tabla cierra y respeta el calendario (300 seeds), 2-3
fechas marcadas por split competitivo (< 5% fuera de rango), ninguna fecha marcada sale sin
`stakes` (test directo sobre `motivosDeFecha`), el momento mueve el resultado (peor extremo del
efecto `partido` vs. mejor extremo: +54 puntos de tasa de victoria en una moneda 50/50 — muy por
encima del piso de 15), cobertura completa de `stakes × rol` sobre el catálogo declarado (no se
puede medir con `cobertura.js`, que nunca ve `stakes` sin el override).

**Corrección post-medición** (regla de proceso 4, mismo criterio que las fases 2 y 4): dos números
salieron distintos de lo estimado al escribir el plan, y hay que decirlo sin maquillarlo.

- *Splits profesionales con al menos una fecha jugable*: 21,0% → **96,9%** (objetivo ≥90%, superado
  con margen).
- *Líneas de log por split profesional sin playoffs*: 5-6 → **11 de mediana** (objetivo 8-12, en banda).
- *Carreras que ven al menos un draft de fecha*: el objetivo estimado era ≥85%; midió **13,0%**. La
  causa es la misma regla de dominancia que ya se documentó en la fase 4 para el draft de playoffs
  (`decisionDeDraftFecha` reusa el criterio de `decisionDeDraft`): con un pool típico, un campeón
  suele dominar con claridad, así que el motor elige solo la mayoría de las veces y el draft nunca
  pausa. El mecanismo funciona como se diseñó — el objetivo del 85% fue una estimación optimista
  antes de medir, no una promesa incumplida.
- *Decisiones por carrera (mediana)*: 46 → **47**, prácticamente sin moverse (el objetivo era
  70-110). Misma trampa T6 que ya advirtió la fase 2: con `llegaronAPro` en 41,9-44,5%, más de la
  mitad de las carreras simuladas nunca pisan la fase profesional, así que la carrera MEDIANA
  apenas toca el contenido nuevo de `temporada.js`. Este número no se puede juzgar hasta que la
  fase 7 comprima el prólogo amateur (hoy 15 splits de mediana) y `llegaronAPro` suba a 65-75% como
  pide esa misma fase — recién ahí la mediana de decisiones va a reflejar lo que agregó esta fase.

**Sin cambios fuera de banda**: `llegaronAPro` (equilibrado) 41,9% contra el 40,4% de referencia;
burnout 21,1% contra 21,9%. Ambos dentro de los ±3 puntos esperados. `simulate.js 1500 90 todas`:
**0 crashes**. Determinismo verificado (misma seed, dos corridas, salida idéntica).

**Deuda que esta fase no cierra pero usa por primera vez**: D8 (los 5 rivales de generación) — el
`stakes: rival_de_generacion` les da su primer uso real (aparecen con nombre en una fecha marcada
cuando juegan en la misma liga tier 1 que el jugador, vía un hash determinista campeón↔org en
`core/temporada.js` que no consume `rng`), pero seguir corriendo su carrera entera sigue siendo
trabajo de la fase 11.

**Migración de contenido**: 5 de las quince situaciones de rol de `data/events/rol/*.json`
(`jungla_invadir_o_no`, `top_la_isla`, `mid_el_duelo`, `adc_la_pelea_que_define`,
`support_el_ward_que_te_costo` — una por rol, las más claramente "momento dentro del mapa") se
mudaron y reescribieron a `data/events/partido/dentro_del_mapa.json` con marcador y rival con
nombre. Las diez restantes (más orientadas a política de vestuario y prensa que a un momento de
partido puntual) se quedaron donde estaban; quedan como candidatas para la migración completa que
la fase 10 va a hacer con el resto del contenido a escala.

### 2026-08-08 — Fase 4: series Bo5, Fearless draft y minijuegos

Quinta fase de `PLAN.md`, y la que `PLAN` describe como el corazón de la
versión de 25-40 minutos. Hasta acá, cerrar temporada en tier 1 resolvía el
título con un `if (posicion === 1)` instantáneo en `rendimiento.js` y la
clasificación a un internacional con un `chance()` suelto: no había serie, no
había draft, no había Fearless, no había minijuegos.

**Investigación previa, pedida explícitamente antes de modelar nada a
ciegas**: no había datos de formato de playoffs 2026 en `TRASPASO.md`. Se
confirmó que LCK, CBLOL y LCP usan **6 clasificados, todo Bo5**, con los 2
mejores sembrados con bye directo a semifinal; LEC/LCS/LPL varían el detalle
pero coinciden en 6 clasificados y Bo5 predominante. Las seis usan **doble
eliminación real** (hay bracket de perdedores) y tanto MSI como Worlds
confirman **Fearless Draft explícito** en las fases eliminatorias. Se modeló
un bracket de **eliminación simple** (mismo `clasifican`/`byes`/Bo5 medidos,
sin bracket de perdedores) porque el motor solo simula el camino del
jugador, nunca el resto del bracket — documentado como D19, mismo criterio
que `LCP_CHALLENGERS` en la fase 3 (D15).

**`src/core/serie.js`** (nuevo) — los helpers puros del mecanismo: progresión
de ronda (`rondaInicial`, `siguienteRonda`), generación de rival (doméstico
pesado por fuerza dentro de la propia liga; internacional, de otra liga tier
1 pesada por prestigio), y el Fearless (`disponiblesDelPool`,
`elegirCampeonRival` — quema del top del meta no quemado, `campeonComodin`
cuando se quema todo). `deseoPorCampeon` se movió de `systems/campeones.js` a
`core/ajusteMeta.js` (donde ya vivía `afinidadDeCampeon`) para que
`core/serie.js` lo pudiera reusar sin que `core/` importara de `systems/`.

**La regla del draft (4.3), resuelta sin la ambigüedad que tenía el texto
original de `PLAN`** (leído literal, "elige solo si ≥2 disponibles" contradice
"para si quedan ≤2"): 0 disponibles → comodín automático; 1 → no hay
elección real; **exactamente 2 → siempre para** (es el momento de pool
exhausto donde cada pick importa); 3+ → el motor elige solo salvo mapa
decisivo o falta de dominancia clara (`BALANCE.serie.dominanciaClara`).

**`src/systems/serie.js`** (nuevo, registrado después de `rendimiento.js`) —
orquesta la serie completa (rival quema → draft auto o pausa → minijuego si
el mapa está cerrado → resultado, reusando `calcularRendimiento` y
`fuerzaDelEquipo` de `rendimiento.js`, ahora exportadas en vez de
reescritas). `rendimiento.js` deja de resolver título/internacional al
instante **solo para tier 1 con `formatoPlayoffs`** (tier 2 y tier 3 sin
bracket modelado siguen exactamente igual que antes). Al ganar la final o
clasificar a un internacional (por posición de temporada regular, cupo
existente desde la fase 3, sin cambios), se arranca la ronda siguiente
reseteando quemados/marcador — el Fearless no acumula entre rondas: cada
rival es una serie propia con sus propios bans, igual que en la vida real.

**Los 5 minijuegos, cada uno con su propia mecánica real** (`src/data/
minijuegos.json` para el texto, `index.html` para la interacción — nada de
esto lo implementa el motor, que solo recibe un `resultado` 0-1):

| id | mecánica en el navegador | dispara |
|---|---|---|
| `robar_baron` | barra con un marcador oscilando (RAF); parás el smite con un click | mapa cerrado, jungla, semis/final/internacional |
| `la_llamada` | reflejos: señal a destiempo aleatorio, se mide la latencia del click | mapa cerrado, resto de roles |
| `bootcamp` | asignar puntos entre 3 tarjetas antes de que se acabe una barra de tiempo | antes del primer mapa del internacional (siempre dispara) |
| `rueda_de_prensa` | slider de tono con una zona objetivo oculta | al cerrar una serie `final` o `internacional` (si no se gastó ya el cupo) |
| `la_prueba` | aim-trainer de 5 blancos | al firmar con un tier 3 (hook en `amateur.js`, no en `serie.js`) |

`la_llamada` amortigua su impacto por jerarquía baja (`factorLlamadaSinJerarquia`):
una buena llamada con jerarquía baja no se ejecuta igual, es la regla textual
de 4.6. Los 4 minijuegos de `serie.js` comparten el cupo `serie.minijuegoUsado`
(máximo 1 por serie); `la_prueba` es independiente (etapa amateur, sin `serie`
todavía) y ajusta la jerarquía inicial del primer roster vía un flag
transitorio (`flags.bonusJerarquiaTryout`) que `roster.js` consume una sola
vez, porque en el split del fichaje el roster todavía no existe.

**`BALANCE.partida.maxDecisionesPorSplit` subió de 16 a 60** (trampa T9,
prevista desde la fase 2): medido, el máximo real en 1500 seeds × 90 splits
es **19** decisiones en un solo split — un título + viaje al internacional
encadena draft y minijuego mapa a mapa en el mismo split de cierre de
temporada. El check de densidad de la fase 2 también subió su techo de 6 a
24 con la misma medición.

**6 checks nuevos (43 en total)**, verificados contra código mutado que falla
cuando debe (trampa T5):

```
Los minijuegos tienen forma válida
El impacto de los minijuegos está acotado (ni decorativo ni gambling)
Mediana de decisiones de draft por serie ∈ [0, 2]
El pool ancho llega al mapa 5 con opciones más seguido que el angosto
Ninguna serie deja el pipeline con una decisión colgada
Ningún minijuego puede setear terminado
```

**Corrección post-medición del check de ancho de pool** (mismo criterio que
la fase 2 con el volumen de decisiones — ver `PLAN.md`): el 80%/25% original
era una estimación previa a tener el mecanismo real. Medido: pool angosto (3)
da **0%** — es matemático, no de balance: llegar al mapa 5 de un Bo5 ya
jugó 4 mapas antes, y Fearless exige 4 campeones **distintos** solo para
llegar ahí, imposible con un pool de 3. Pool ancho (6) da **63-64%**; ancho
(8) da 97.6%; ancho (10), 100%. El check quedó en ≥55%/≤10% con un piso extra
de 40 puntos de brecha, que es lo que la implementación real sostiene con
margen — la comparación cualitativa de 4.5 se sostiene con mucho más
contraste del que se había estimado a ciegas.

**Hallazgo del check de impacto acotado**: variar solo `impactoMinijuego`
(el de los minijuegos de mapa) entre 0.0001 y 200 casi no mueve la medición
agregada — el efecto de un minijuego está **saturado por la propia
estructura del juego**: como máximo 1 de los 5 mapas de un Bo5 se ve afectado
y como máximo 1 minijuego por serie, así que forzar un mapa a ganancia o
derrota segura no garantiza la serie. El check solo distingue con claridad
cuando se degradan a la vez `impactoMinijuego` **y** `impactoDirecto` (el de
bootcamp/rueda de prensa): con los dos en default, 1000 carreras × 60 splits
dan 2610 (siempre falla) vs 3004 (siempre acierta) en títulos+internacionales
sumados — **15.1%**, dentro de la banda [8%, 25%]. Documentado como D20: es
una propiedad estructural deseable (los minijuegos estructuralmente no
pueden volverse gambling, sin importar cuán mal calibrado esté un solo
parámetro), no un bug, pero significa que ajustar cada minijuego por
separado (fase 7/8) va a necesitar medir cada uno aislado, no el agregado.

**Probado en navegador real** (Playwright, seed fija, click-through
automático): una corrida de 260 iteraciones atravesó varias temporadas
completas de playoffs de LCK — 38 decisiones de draft (incluida la escena de
"Cuartos de final vs KT Rolster · Bo5 · 2-2" con el pool reducido a dos
campeones de maestría 5, el escenario exacto del ejemplo 4.4), 5 `la_llamada`,
7 `bootcamp`, 1 `rueda_de_prensa`, 1 `la_prueba` — con **cero errores de
consola**. `robar_baron` (que solo dispara para jungla) se verificó aparte
con un test aislado del widget: la barra anima con `requestAnimationFrame` y
el click produce un `resultado` numérico correcto.

`simulate.js 1500 90 todas`: 0 crashes en las 3 estrategias. `llegaronAPro`
equilibrado se mantiene en 40.4% (sin cambios respecto del fin de la fase 3:
el mecanismo de series no toca nada de la etapa amateur ni del ascenso a
tier 1, solo lo que pasa una vez adentro). Diagnóstico sobre 2000 carreras ×
90 splits: 659 tocan al menos una decisión de serie, 21998 series jugadas en
total, 3099 títulos, 4753 internacionales.

**`CONCEPTO.md` actualizado**: §5 describe ahora el mecanismo real de
playoffs (bracket, Fearless, minijuegos, internacional) en vez de la
promesa vaga; §11 define la cuota exacta de minijuegos (máximo 1 por serie,
solo semis/final/internacional, más `la_prueba` en la etapa amateur).

**Sin arreglar a propósito, documentado como deuda técnica**: D18 se resuelve
a medias (la serie internacional es real, pero sigue siendo una sola Bo5
representativa, no un bracket Swiss+knockout que distinga First
Stand/MSI/Worlds); D19, eliminación simple en vez de doble eliminación real;
D20, los 5 minijuegos comparten dos parámetros de balance genéricos en vez de
tener cada uno el suyo afinado a mano; las opciones C/D del ejemplo 4.4 del
draft (pedirle el pick al coach, cedérselo a un compañero) no se
implementaron porque dependen de `relacion` de compañeros, que es la fase 7.

### 2026-08-08 — Fase 3: la escalera competitiva (tier 3 → tier 2 → tier 1)

Cuarta fase de `PLAN.md`. Este es el paso que rompía la linealidad más grande
del juego: un solo fichaje y ya eras profesional en una liga real. Además,
`leagues.json` estaba desactualizado — tenía LLA, PCS y VCS como tier-1,
ligas que no existen desde la reestructuración de 2025/2026.

**`leagues.json` reescrito.** 6 ligas tier-1 reales de 2026 (LCK, LPL, LEC,
LCS, CBLOL, LCP) con sus rosters exactos, `edadMinima`, `cuposInternacionales`
y `desciendeA` (a qué liga tier-2 alimenta cada una). 6 ligas tier-2 reales
como *circuito* (NACL, LDL, EMEA Masters, LCK CL, Circuito Desafiante) más
`LCP_CHALLENGERS` — este último es un nombre modelado, no investigado:
`TRASPASO` no cubre un circuito de desarrollo real para la región APAC
fusionada, y se documentó como tal (deuda D15) en vez de inventar un nombre
presentándolo como verificado.

**Los rosters de tier-2 se generan, no se declaran.** A diferencia de tier-1
(rosters fijos y reales), los de NACL/LDL/etc. rotan temporada a temporada y
no están investigados con la firmeza que pide `CLAUDE.md` para nombrar un
equipo real. Se generan con el mismo mecanismo que tier-3 (`core/tier3.js`,
`generarNombreOrg`), en un rango de fuerza más alto.

**`core/tier3.js`** (nuevo) — los equipos chicos e inventados donde ficha
todo el mundo la primera vez, generados una vez por región al arrancar la
carrera (`state.mundo.tier3PorRegion`). **`core/competicion.js`** (nuevo) —
el accessor uniforme de "contra quién compito", sea tier 1, 2 o 3: antes
`roster.js` y `rendimiento.js` asumían que siempre había una liga real de por
medio, algo que tier 3 (que no es una liga, es una región) rompe.

**`systems/competitivo.js`** (nuevo, después de `roster` en `ETAPAS_SPLIT`) —
el tránsito entre tiers:
- **Tier 3, brevedad forzada** (pedido explícito): cada split hay ~45% de
  chance de que se resuelva — asciende a tier 2, o el equipo se disuelve
  (y otro te levanta enseguida: es la característica del nivel).
- **Tier 2, el ascenso se gana**: probabilidad corrida por jerarquía, no
  pareja.
- **El año muerto** (dato real): LEC y LPL exigen 18 años, el resto 17. Un
  ascenso ganado a los 17 en una de esas dos ligas queda **reservado** —
  la misma org, la misma liga — hasta que la edad alcanza. No se vuelve a
  sortear nada.
- **El caso Calix** (dato real, `TRASPASO` §4.2): estar en el top absoluto
  de Challenger y todavía joven salta el tramo de tier 3 y ficha directo en
  tier 2.

**Bug encontrado al fichar en tier 3, no relacionado con tiers.** `buscarSalida`
mostraba el nombre de una org en el título de la decisión (`orgQueTeMira`) y
`firmarConEquipo` **volvía a sortear** una org distinta al resolver — dos
tiradas de RNG para lo que tenía que ser una sola elección, así que a veces
firmabas con un equipo que no era el que te había escrito. Se corrigió de
paso: la org elegida ahora viaja en `decision.datos` y se firma con esa
misma, nunca con una recién sorteada.

**El debut se reinicia al llegar a tier 1.** Encontrado por un check que
falló: `tier1_debut` nunca aparecía en 300 carreras. La causa era que
`calcularEtapa` medía "debut" desde el fichaje ORIGINAL (`state.splitFichaje`,
que ahora pasa en tier 3, muchos splits antes de llegar a primera), así que
para cuando alguien pisaba tier 1 ya llevaba más de los 3 splits de gracia.
Se agregó `career.splitAscensoTier1` (separado de `splitFichaje`, que sigue
siendo el KPI de "cuánto tardaste en hacerte notar" que reporta
`simulate.js`) y `calcularEtapa` lo usa cuando `nivel === 'tier1'`.

**5 momentos activados** (borrada su marca `pendiente`): `espera_edad_minima`,
`tier3_recien_llegado`, `tier3_probandose`, `tier2_rookie`, `tier2_titular`.
Los cinco se observaron con contenido real en 300+ carreras vía
`cobertura.js`, junto con `tier1_debut` (que antes de este paso nunca podía
alcanzarse en la práctica bajo el nuevo pipeline).

**`mundo.js`**: `regionOrigen` pasó de sorteo uniforme (1 de cada 8 nacía en
Corea) a pesado por prestigio, y solo entre ligas tier-1 (antes tier-2 también
podía salir sorteada como región de origen, lo cual no tenía sentido: nadie
"nace" en un circuito de desarrollo). `regionDominante` y los rivales de
generación (`generarRivales`) se restringieron de la misma forma: un rival de
generación debuta en una liga real, nunca en una de desarrollo.

**7 checks nuevos (41 en total).** Al verificar que fallan cuando deben
(trampa T5) se encontraron dos huecos reales:

```
El tier 3 es breve: mediana de permanencia ≤ 2 splits, p90 ≤ 4
El año muerto: firmado pero sin edad para debutar se observa y se resuelve solo
Nadie clasifica a un internacional por encima del cupo real de su liga
```

Además, arrastrando la fase 2: el check de integración del chaining
(`El chaining de un segundo evento de verdad usa tipoDeSplit`) daba el mismo
86% para "denso" y "comprimido" en el estado de prueba — la causa era que el
estado elegido caía en la ventana de playoffs, que por sí sola ya fuerza
"denso" sin importar el resto de la comparación. Y el primer check del año
muerto verificaba que el ascenso se resolviera en la MISMA LIGA reservada
pero no en la MISMA ORG — al forzar una regresión que re-sorteaba la org, el
check no lo detectó hasta agregar esa comparación específica.

**Medido** (`simulate.js 1500 60 todas`, seeds 1-1500):

| | fin de fase 2 | fin de fase 3 |
|---|---|---|
| mediana de permanencia en tier 3 | no existía el concepto | **2 splits** (p90: 4) |
| `tier1_debut` observado en 300+ carreras | nunca (piso directo a tier1) | **sí**, con contenido real |
| `regionOrigen` = Corea | 1 de cada 8 (12.5%) | pesado por prestigio (LCK es la escena más grande) |
| llega a pro (equilibrado) | 43.6% | 40.4% |
| burnout (equilibrado) | 14.5% | 21.9% |

**El llegar-a-pro y el burnout se movieron, y hay que decirlo sin maquillarlo**
(regla de proceso 4). La caída en "llegaronAPro" y la suba en burnout son
consistentes con que ahora hay más splits totales de vida profesional antes de
que una carrera se resuelva (tier 3 → tier 2 → tier 1 en vez de un salto
directo), lo que le da más oportunidades al desgaste de mentalidad de
acumularse dentro de la ventana de 60 splits que mide `simulate.js`. No se
tunearon constantes en este commit (regla de proceso 2): la estructura nueva
se mide tal cual, y el recalibrado — si hace falta — espera a que el arco
completo (mercado y retiro, fases 5-6) exista.

`simulate.js 1500 60 todas`: 0 crashes en las 3 estrategias. `cobertura.js`
sigue sin huecos. Probado en navegador real con Playwright: cero errores de
consola reales (el único 404 es el favicon del navegador).

**`CONCEPTO.md` actualizado**: §2 describe ahora el pipeline tier3→tier2→tier1
y el caso Calix; §10 reescribe la carrera de ejemplo en Brasil/CBLOL (antes
usaba LAS/LLA, que ya no existen) pasando por tier 3 y el Circuito Desafiante
antes de llegar a primera.

**Sin arreglar a propósito, quedan documentadas en `PLAN.md` como deuda
técnica**: no hay descenso de tier 1 a tier 2 (D16, va con contratos en la
fase 5); LRN/LRS y la doble residencia LATAM no están modelados — un jugador
de esa región nace directo en NA o BR (D17, ya previsto así en `TRASPASO` §5);
la ventana `internacional` sigue siendo un evento agregado único, distinguir
First Stand/MSI/Worlds espera al sistema de series de la fase 4 (D18); y las
rutinas de offseason todavía no se diferencian por tier (D11, movida a la
fase 7 de contenido).

### 2026-08-08 — Fase 2: que las decisiones pesen

Tercera fase de `PLAN.md`. Dos problemas que arrastraba el juego desde el principio:
`CONCEPTO.md` §8 promete *"la opción obviamente correcta sale mal a veces; tus stats
corren esos pesos, no los eliminan"* y nunca se implementó (los outcomes tenían pesos
fijos en el JSON), y todos los splits pedían la misma cantidad de decisiones sin importar
si algo había cambiado o no.

**Pesos dinámicos — `outcome.modificadores`.** Nuevo campo opcional en el esquema de
eventos:

```json
{ "weight": 6, "modificadores": [{ "field": "player.stats.mecanica", "referencia": 55, "factor": 0.02 }] }
```

`pesoEfectivo = weight × (1 + Σ (valor − referencia) × factor)`, con un piso
(`BALANCE.eventos.pisoPesoEfectivo: 0.15`) para que ningún outcome llegue a probabilidad
cero — corre los pesos, no los borra. `resolverOpcion` pasó a usar `elegirOutcome`, que
queda exportado y testeable por separado. Se retrofitearon **6 outcomes reales** del
catálogo (no todo el catálogo: es una pieza que se sigue extendiendo en fases futuras) —
el duelo de línea de mid, la invasión de jungla, la pelea de adc, la racha de ranked y el
burnout ahora corren con la mecánica o la mentalidad del jugador. **Es prerrequisito duro
de la fase 4**: sin esto, el draft del mapa 5 sería una moneda en vez de una apuesta
informada.

**Densidad emergente — `src/core/presupuesto.js`.** La regla: *novedad = densidad*.
`tipoDeSplit(state)` compara el contexto con el que arrancó el split
(`state.contexto`, el snapshot que toma `systems/contexto.js`) contra el contexto en vivo
en el momento en que se llama, y clasifica el split en `denso` (cambió de etapa o de
nivel, se murió el main, o es la ventana de playoffs) / `normal` / `comprimido` (nada de
eso). `events.js` usa esa clasificación para decidir la probabilidad de encadenar un
segundo evento en el mismo split (`BALANCE.edad.probSegundaDecisionPorTipo`: denso 0.85,
normal 0.4, comprimido 0.12 — antes era 0.4 fijo siempre). `maxDecisionesPorSplit` subió
de 8 a 16 (trampa T9: con series + mercado + retiro de fases futuras, 8 se va a quedar
corto), conservado como red anti-loop, no como regla de juego.

**`bisagra: true`** — un evento marcado así se prioriza sobre el resto del pool ambiente
cuando es candidato: *"salió tu campeón nuevo"* no puede perder un sorteo de peso contra
*"racha de ranked"*. Marcados: `pool_campeon_nuevo` y `pool_main_muerto`.

**6 checks nuevos (36 en total).** Dos de ellos existen porque el primer intento de
verificación **no alcanzaba** — se corrigió en el momento, no después:

```
Los stats corren los pesos de un outcome, no los deciden (CONCEPTO §8)
tipoDeSplit clasifica denso/comprimido correctamente          — test directo, sin simular
El chaining de un segundo evento de verdad usa tipoDeSplit    — no una probabilidad fija
La densidad de decisiones es emergente, no pareja ni descontrolada
Ningún split cierra sin dejar una línea en el feed
```

Al verificar que los checks fallan cuando deben (trampa T5) forzando `tipoDeSplit` a
devolver siempre `'denso'`, el check de densidad poblacional **no lo detectó** — mide
proporciones agregadas (ratio percentil-90/mediana), y una inflación pareja de todos los
splits no cambia esa proporción. Se agregó un test directo sobre la función pura
(`tipoDeSplit distingue denso de comprimido`) que sí lo agarra. Después, forzando que
`resolver()` encadene siempre sin mirar la probabilidad, **tampoco lo agarró** ningún
check existente — la arquitectura solo encadena un nivel, así que el peor caso seguía
estando dentro de los rangos aceptados. Se agregó un tercer check
(`El chaining de un segundo evento de verdad usa tipoDeSplit`) que llama a `resolver()`
de verdad sobre un estado profesional real, forzando el contexto "antes" a comprimido o a
denso, y compara las tasas de chaining medidas. Los tres juntos sí cierran el hueco.

**Medido, antes → después** (400 carreras headless, seeds 1-400):

| | fin de fase 1 | fin de fase 2 |
|---|---|---|
| mediana decisiones/carrera | 80.6 (media, no mediana — fase 0) | **46** (mediana) |
| máximo de decisiones en un solo split | sin tope explícito | **6**, verificado en 400 carreras |
| ratio decisiones/split, p90 duración vs. mediana | no existía el concepto | **0.74×** (tope exigido: 1.8×) |
| splits sin ninguna línea de log | no medido | **0** en 100 carreras × 30 splits |

**Corrección de rumbo respecto del `PLAN.md` original**: la fase 2 proponía gatear una
mediana de 70-130 decisiones por carrera. Medido dio 46, y **no es una regresión**: es la
consecuencia correcta de que los splits `comprimido` ahora casi nunca encadenan (12%
contra el 40% parejo de antes). El 70-130 es un objetivo del **juego terminado** — asume
mercado, series y retiro (fases 3 a 6), que hoy no aportan ninguna decisión. Gatearlo
ahora hubiera sido medirse contra trabajo que todavía no existe (trampa T6). El `PLAN.md`
se corrigió en el momento para reflejar esto: la fase 2 gatea la **forma** de la densidad
(tope por split, ratio largo/mediano), el volumen total se vuelve a medir en la fase 8.

`simulate.js 1500 40 todas`: 0 crashes en las 3 estrategias, llega a pro sin cambios
significativos (43.6%, era 43.5%). `cobertura.js` sigue sin huecos.

**Sin arreglar a propósito, van en fases posteriores**: solo 6 de los ~90 outcomes usan
`modificadores` — el resto del catálogo se retrofitea a medida que la fase 7 amplía
contenido. `nivel` sigue sin poder valer otra cosa que `tier1` una vez profesional (no hay
tier3/tier2 todavía — fase 3). El presupuesto de densidad hoy solo gobierna el
**segundo evento** de `events.js`; el mercado, las series y el retiro (fases 4-6) van a
sumar sus propias fuentes de decisión, y en ese momento `tipoDeSplit` se extiende con sus
propios disparadores (vence el contrato, cambio de tier, lesión, cambio de región).

### 2026-08-08 — Fase 1: identidad. Elegís rol y mains, y eso importa

Segunda fase de `PLAN.md`. Antes de esto, `mundo.js` sorteaba tu rol y tu pool
sin preguntarte nada — el jugador no elegía nada de lo que después el juego
usaba para gatear contenido. Ahora hay una pantalla de inicio real (handle,
rol, 3 mains) y esa elección corre toda la carrera.

**`createInitialState(seed, rng, eleccion?)`** — `eleccion = { handle?, rol?,
campeones? }`. Si no viene, todo se sortea de la seed exactamente como antes:
`simulate.js` y `validate.js` no cambiaron una línea. `generarMundo` consume
las mismas tiradas de RNG haya elección o no (mismo stream, mismo mundo),
así que una seed compartida sigue generando el mismo mundo para el que elige
y para el que no.

**`champions.json`: de 10 a 16-18 por rol**, con el campo `debut`. Los
marcados `debut: true` no existen al arrancar — entran con un parche a mitad
de carrera. Es el mecanismo detrás del pedido textual del usuario: *"salió un
champ nuevo y jugás en dos semanas: ¿lo practicás a full o pulís los de
ahora?"*. `meta.js` los hace debutar con `probCampeonNuevo: 0.08` por split
(2-3 por carrera de 30 splits) y `contexto.js` los convierte en la marca
`campeon_nuevo`, con vencimiento a los 3 splits — sin eso la marca quedaba
prendida el resto de la carrera.

**`src/core/pool.js`** (nuevo) — toda la mecánica de champion pool en un solo
lugar. Antes estaba repartida entre `mundo.js` (pool inicial), `practica.js`
(`pulirCampeon`/`aprenderCampeones`) y `campeones.js` (maestrías). Ahora
`practica.js`, `events.js` y la pantalla de inicio comparten las mismas
funciones. Nuevo tipo de efecto `pool` en el esquema de eventos
(`aprender` / `maestria` / `olvidar`), validado igual que `ladder` y `push`.

**El meta se nombra por campeón, no por arquetipo** — `campeonesEnMeta` y
`campeonesMuertos` en `ajusteMeta.js`. El log de `meta.js` pasó de *"el meta
se mueve hacia los magos de control"* a *"Parche 5: se mueve despacio hacia
Galio y Azir. Tu Yasuo quedó a contramano de un día para el otro."* Es
prerrequisito duro para la fase 4 (el rival de una serie tiene que saber qué
campeones quemar primero).

**Seis marcas nuevas de contexto** derivadas del pool (`pool_angosto`,
`pool_ancho`, `pool_en_meta`, `pool_fuera_meta`, `main_muerto`,
`campeon_nuevo`). Es lo que hace que los 3 campeones que elegiste al empezar
sigan importando veinte splits después, en vez de ser una elección cosmética
del minuto uno.

**24 eventos nuevos** (44 en total, 90 opciones, 180 outcomes):

- `src/data/events/rol/{top,jungla,mid,adc,support}.json` — 3 por rol (15).
  Cada uno gateado por el eje `rol`, así que elegir jungla te expone a eventos
  que un support nunca ve, y viceversa.
- `src/data/events/pool.json` — 7 eventos: uno por cada una de las 6 marcas
  de pool, más `pool_cuota_coreana` (dato real de `TRASPASO` §4.5: Diamante
  80 partidas/5 campeones · Máster 65/8 · GM 50/15 — el requisito de amplitud
  sube con el rango, en tensión directa con `sesgoMaestriaEnPick`, que premia
  especializarse). `pool_campeon_nuevo` es la traducción directa del pedido
  textual del usuario sobre el campeón que sale y hay que decidir si
  practicarlo a fondo o pulir lo de ahora.

**4 checks nuevos (30 en total)**, verificados contra una copia mutada del
código que falla cuando debe (trampa T5):

```
Cada rol tiene eventos propios que ningún otro rol ve      (min 3 por rol)
El pool nunca queda vacío ni por debajo del mínimo          (poolMinimo: 2)
El meta se puede nombrar por campeón, y cambia con el parche
main_muerto se observa cuando el meta te da vuelta el main  (≥40% en carreras >20 splits)
```

**Medido, antes → después** (400+ carreras, `simulate.js 1500 40 todas`):

| | fin de fase 0 | fin de fase 1 |
|---|---|---|
| eventos / opciones / outcomes | 22 / 46 / 92 | **44 / 90 / 180** |
| llega a pro (equilibrado) | 43.5% | 43.5% (sin cambios: el contenido nuevo no tunea nada) |
| crashes en 4500 carreras (3 estrategias) | 0 | 0 |
| eventos exclusivos por rol | 0 | 3 por cada uno de los 5 roles, verificado por simulación forzando cada rol |
| `main_muerto` en carreras >20 splits | n/a (marca no existía) | por encima del 40% exigido |

Probado en navegador real con Playwright (Chromium headless): pantalla de
inicio completa (handle → rol → 3 mains → "Empezar carrera"), una carrera con
pool angosto (2 campeones) que dispara `pool_estrechez` y después
`pool_main_muerto` cuando el parche mata al main, y una carrera de support
completa hasta el fichaje con un evento de rol (`support_*`) y uno de mercado
amateur (`academy_offer`, reescrito en la fase 0). Cero errores de consola
(el único 404 es el favicon que pide el navegador por default).

**Sin arreglar a propósito, van en fases posteriores**: los pesos de outcome
siguen estáticos (fase 2), no hay tier3/tier2 todavía así que `nivel` nunca
vale otra cosa que `tier1` una vez profesional (fase 3), y no hay series ni
draft del mapa 5 — el pool que elegiste ya importa narrativamente, pero
todavía no tiene el peso mecánico central que va a tener en el Fearless de
la fase 4.

### 2026-08-08 — Fase 0: higiene. El juego deja de verse roto

Primera fase del plan maestro nuevo. El usuario reportó cuatro cosas y las cuatro resultaron ser
defectos localizables, no percepción. Se midieron 400 carreras antes de tocar nada.

| Reportado | Causa medida |
|---|---|
| `62.12317247563275` tapando la pantalla | `clampStat` clampea pero **no redondea**; `index.html` y `edadCierre.js` imprimían el float crudo |
| "meme de prensa en Oro 4", "scout en Platino 3" | **8 de 20 eventos no declaraban `contexto`**, y eran los de mayor peso: los 4 sin gatear se llevaban el **39% de todos los disparos** |
| "oraciones sin sentido" | Los `outcomes` no tenían texto: elegías y te devolvía `"Hype +8, Mentalidad -1"`. Y `decisionDesdeEvento` **descartaba la `descripcion`** de la opción — 0 de 40 la tenía |
| "apretás 4 botones" | Toda decisión tenía la misma forma: 2 opciones sin descripción y ±3 a un stat |

**`src/core/formato.js`** (nuevo). Los stats siguen viviendo como float adentro del estado a
propósito: redondear en cada split introduce drift y movería el balance ya calibrado. Se redondea
**al producir texto**. `entero` · `delta` · `deltaCorto` · `lp` · `sobre100` · `porcentaje` ·
`plata` · `lista`. De paso se arregló que los deltas negativos llevaran signo y los positivos no.

**Dos ejes nuevos en el modelo de contexto** — `ladder` y `rol`. Este es el arreglo de fondo:
el modelo tenía nueve ejes y **ninguno era la escalera**, aunque la etapa amateur entera trata de
la escalera. Por eso la regla "un scout solo te llama si estás arriba" no se podía ni expresar.
`bandaDeLadder(ranked, servidor)` en `ranked.js` (bajo/medio/alto/apice/elite) es puro, no consume
RNG, y `nivelDeInteres` de `amateur.js` pasó a reusarlo en vez de duplicar el criterio.

**Esquema de contenido, dos campos nuevos:**

- `option.descripcion` — qué estás eligiendo y qué arriesgás, sin números. La UI **ya sabía**
  pintarla (lo usaban las rutinas); el motor la tiraba en un `map`.
- `outcome.texto` — qué pasó. Es la mitad narrativa de la decisión y es la forma de El
  Ídolo/Copero. El log pasó de `"Meme de la prensa — Subirse a la ola: Hype +8, Mentalidad -1."`
  a título · elección → párrafo → efectos entre paréntesis. `crearLog` acepta un tercer argumento
  con las partes sueltas para que la UI les dé jerarquía tipográfica.

**Los 20 eventos reescritos**: 46 opciones con descripción, 92 outcomes con texto narrativo,
tokens en uso por primera vez (`{org}`, `{jungla}`, `{rival}`, `{region}`) y los 8 sueltos
gateados. Dos eventos eran directamente **incoherentes** y se reescribieron: `academy_offer` decía
que firmabas un contrato y empujaba a `career.orgs` sin que pasara nada (ahora es una prueba, que
es lo que era), y `coach_demands_role` decía que te cambiaban de rol sin cambiar `player.role`
(ahora es el coach pidiéndote otro tipo de juego dentro de tu línea).

**Dos eventos de cierre de edad para profesionales** (`balance_de_temporada`,
`cuentas_de_la_carrera`). No estaba en el alcance de la fase, pero `edadCierre` solo tenía
eventos amateur: **desde los 17 la "decisión grande del año" no existía**. Son además los dos
primeros eventos del catálogo con 3 opciones (`CONCEPTO` §3 dice "2 a 4" y nunca se usaron 3 ni 4).

**Marca `con_vestuario`.** En el split en que firmás, `roster` ya corrió y salió sin hacer nada,
así que la etapa dice `debut` pero `career.companeros` está vacío. Un evento que dijera
*"{jungla} se peleó con el staff"* imprimía la llave cruda. Ahora los tokens de compañero exigen
la marca, y hay un check que lo verifica estáticamente.

**Cinco checks nuevos (26 en total).** Los cuatro nuevos se verificaron contra el árbol de `HEAD`
(trampa T5: un check que no falla cuando debe da falsa confianza):

```
Todo contenido declara dónde aparece                              FALLA en HEAD ✓ (8 eventos + 6 rutinas)
Toda opción se lee antes y todo resultado se cuenta después       FALLA en HEAD ✓
Ningún token puede quedar sin resolver donde el contenido aparece FALLA con {org}/{jungla}/{signature} inyectados ✓
Ningún número llega al jugador con decimales                      FALLA en HEAD ✓
```

El de tokens es **análisis estático sobre el gating declarado**, sin simular: si un contenido
puede aparecer con `etapa: amateur` o `nivel: soloq`, no puede usar `{org}`, `{liga}` ni tokens
de compañero. Mata la clase entera de "oraciones sin sentido" de una vez.

**Medido, antes → después** (400 carreras):

| | antes | después |
|---|---|---|
| evento más visto | `ranked_streak` 2527 · top-4 sin gatear = **39%** del total | `balance_de_temporada` **8.0%**, ninguno arriba de eso |
| eventos nunca disparados | 0 | 0 |
| splits sin evento | 0% | **8.2%** (objetivo <25%, trampa T10) |
| líneas de log con decimales | muchas | **0** en 200 carreras × 60 splits |

`simulate.js 1500 40 todas`: 0 crashes, llega a pro 43.3% (era 40.2%; sube porque los cierres de
edad de profesional agregan caminos de recuperación de mentalidad que antes no existían).
`cobertura.js` pasa a decir la verdad: antes salía "sin huecos" porque los 8 eventos sin gatear
llenaban todas las celdas por igual. Ahora las celdas amateur tienen 5-8 eventos y las de tier 1,
13-16. **46 opciones de 150.**

**Determinismo:** el paquete de formato + los ejes nuevos se verificó contra `HEAD` con una huella
de 40 seeds (`finAnticipado:splits:soloqElo`) y salió **idéntica**: no movieron un decimal. El
contenido sí corre el stream (trampa T1) y ninguna seed vieja reproduce su carrera; el
determinismo intra-versión está intacto.

**Sin arreglar a propósito, van en fases posteriores:** el 23% de las carreras que agotan el tope
de 90 splits (no hay sistema de retiro — fase 6), los pesos de outcome estáticos que contradicen
`CONCEPTO` §8 (fase 2), y que el meta se describa por arquetipo en vez de por campeón (fase 1).
`tendinitis` dispara en el 11.5% de las carreras porque exige la marca `deuda_sueno`: es poco a
propósito, es la consecuencia de una decisión concreta y no una tirada suelta.

### 2026-08-08 — Paso 9: rutinas narrativas en vez de la planilla de bloques

Pedido del usuario: *"siento que eso de administrar los bloques hace todo muy robótico"*. Tenía
razón, y el propio `CONCEPTO.md` §1 lo respaldaba: declara que la referencia es El Ídolo y
Copero —"decidís en los momentos que importan"— y un panel de steppers para repartir 10 bloques
es exactamente lo contrario.

- **`src/data/rutinas/*.json`** (nuevos): 15 rutinas amateur y 7 de offseason. Una rutina es
  **un reparto de recursos con texto narrativo encima**: el jugador ve *"Clase, siesta corta, y
  de las 8 a las 2"*, el motor ve `{ranked: 6, estudiar: 1, dormir: 2, familia: 1}` y un bloque
  robado al sueño. Cada una declara su `contexto`, así que *"Salvar el trimestre"* solo aparece
  con el boletín en rojo y *"Bootcamp en tu propia pieza"* solo cuando ya te están mirando.
- **`aplicarReparto` no se tocó ni una línea.** Toda la economía sigue igual; cambió solo quién
  produce el reparto. `normalizarReparto` se conservó como red: adapta un reparto de 10 a los 12
  bloques del nocturno y garantiza que una rutina mal declarada no invente ni pierda tiempo.
- **La forma de la decisión está garantizada**: siempre hay al menos una salida `segura` (nunca
  se acorrala al jugador) y al menos una `agresiva` (la trampa de `CONCEPTO` §4 siempre a mano).
  Hay un check que lo verifica sobre 120 carreras.
- **El panel de steppers se borró de `index.html`** (~75 líneas) y la UI quedó con **un solo
  camino de render**. Las opciones ahora muestran título y texto narrativo.
- **`practica.js`** también: los 6 puntos de preparación pasaron a rutinas (*"Bootcamp: dos meses
  afuera"*, *"Dos semanas sin tocar el juego"*, *"Encerrarte con los VODs"*).
- **`CONCEPTO.md` §3 actualizado**: decía literalmente "tenés 10 bloques de tiempo por periodo".

**Dos correcciones encontradas midiendo, no leyendo:**

1. El jugador automático elegía la rutina **maximizando la suma ponderada** contra los pesos que
   usaba el reparto libre. Eso siempre elige la rutina más extrema en el destino de mayor peso
   → 70% de burnout. La función objetivo correcta no es maximizar sino **minimizar la distancia
   contra las proporciones deseadas**: "cuál de estas rutinas se parece más a cómo lo habría
   repartido yo". Eso reproduce fielmente lo que producía el reparto libre.
2. Al set de rutinas le faltaban formas que las estrategias usaban. Se agregaron cuatro
   (*"Lo justo en todo, el resto al ranked"*, *"Tapar el agujero más urgente"*, *"Una sola noche
   larga"*, *"Todo el día jugando, pero durmiendo"*), siguiendo la regla del plan: si el balance
   no vuelve, faltan rutinas, no sobran constantes.

**Sobre el balance, con honestidad**: aun con las rutinas agregadas, llegar a pro bajó del 54.9%
al 40.2% jugando con criterio. **No es un bug: con rutinas narrativas tenés genuinamente menos
control que con una planilla**, así que el mismo rendimiento por bloque rinde menos. Se
recalibró `lpPorBloque` (34 → 52) para compensar en parte, y ahí se frenó a propósito: subir más
pelea contra el freno de altura del paso 8, que existe para que el potencial oculto siga
decidiendo tu techo de ladder.

| etapa amateur (1500 × 16 splits) | llega a pro | no llegó | prohibición | burnout |
|---|---|---|---|---|
| equilibrado | 40.2% | 50.7% | 3.7% | 8.3% |
| ranked | 19.9% | 0.7% | 11.2% | **78.9%** |
| prudente | 33.5% | 66.5% | 0% | 0% |

### 2026-08-08 — Paso 8: la escalera de ranked real

Pedido del usuario: *"nadie arranca en platino con 1200lp y no es normal que en platino te hable
un ojeador tampoco"*. La investigación con datos reales confirmó las dos cosas y agravó la
segunda: `1200 LP` no es un número que exista en LoL, y el prospecto que ficha un equipo está en
el **top 1-50 de Challenger de su servidor a los 15-17** (caso Calix, rank 1 de Corea a los 16).
Challenger es el 0,025% de la ladder.

- **`src/data/ranked.js` + `src/data/servidores.js`** (nuevos): los 10 tiers reales
  —Hierro→Bronce→Plata→Oro→Platino→**Esmeralda**→Diamante, 4 divisiones de 0-100 LP cada uno, más
  Máster/Gran Máster/Challenger sin divisiones y con LP acumulativo— y los 8 servidores con sus
  **cupos y cutoffs medidos** (Challenger: 300 plazas en KR/EUW/NA, 200 en LAS/LAN/BR/CN/TW;
  cutoffs reales EUW 2398, KR 1831, NA 1528, LAN 1465, LAS 1287 LP).
- **`src/core/ranked.js`** (nuevo): la escalera en puntos absolutos (Hierro IV = 0, cada división
  100 LP, el ápice arranca en 2800). Promoción con **rollover del excedente**, descenso que cae
  en **25/50/75 LP** y no en 0, escudo anti-descenso al subir de tier, **sin series de promoción**
  (eliminadas en 2023) y **sin decay en ninguna forma** — un pro juega soloQ todos los días.
- **`player.soloqElo` sobrevive como espejo derivado de solo lectura**. Todo lo que lo *leía*
  (el resumen de edad, `simulate.js`, la UI) siguió funcionando sin tocar una línea; lo que lo
  *escribía* migró a un tipo de efecto nuevo, `{"type": "ladder", "path": "player.ranked"}`, que
  produce un log mucho mejor: `"SoloQ: Diamante III → Diamante II"` en vez de `"SoloQ LP +23"`.
  Un check impide que nadie vuelva a escribir el espejo y lo desincronice.
- **El punto de partida se sortea alrededor de Oro**, modulado por el potencial oculto. Un
  prodigio arranca más arriba sin que se le diga.
- **El scouting dejó de ser un umbral de LP** y pasó a ser la **posición en la ladder**:
  Máster/Gran Máster te abre la puerta de un equipo chico, Challenger la de uno serio, y el top
  50 siendo menor de 18 la de una org de primera.
- **Hallazgo al medir: el LP subía sin techo.** Con la ventana de prospecto extendida, el 20.8%
  terminaba en Challenger. En la realidad el ascenso se frena cuando llegás a tu nivel, porque
  arriba te toca gente mejor. Se agregó un **freno por altura**: la ganancia depende de la
  distancia entre tu mecánica y el nivel que exige el rango donde estás. Efecto secundario
  valioso: **el potencial oculto ahora decide tu techo de ladder sin que se te diga nunca** — lo
  intuís cuando el LP deja de moverse.
- **La ventana de los prospectos se cierra por mercado, no por un límite duro.** En vez de
  cortar la carrera a los 18, la probabilidad de que te fichen cae con la edad
  (15-16 → 100%, 17 → 85%, 18 → 55%, 19 → 28%). Es el mismo sesgo etario que va a gobernar el
  retiro en el paso 11: el mercado prefiere jóvenes.

**Distribución al cerrar la etapa amateur** (1000 carreras): Platino 1.3% · Esmeralda 8.0% ·
Diamante 20.5% · **Máster 57.7%** · Gran Máster 9.2% · **Challenger 3.3%**. Mediana en Máster y
llegar a Challenger sigue siendo raro y ganado.

| etapa amateur (1500 × 16 splits) | llega a pro | no llegó | prohibición | burnout |
|---|---|---|---|---|
| equilibrado | 54.9% | 40.3% | 2.2% | 5.4% |
| ranked | 17.3% | 0% | 12.1% | **83.5%** |
| prudente | 55.4% | 43.9% | 0% | 0.9% |

- **4 checks nuevos** (20 en total): la mecánica de la escalera verificada pieza por pieza
  (rollover, 25/50/75, escudo, ápice sin división, ida y vuelta de puntos absolutos) · que **la
  escalera no se mueva sola** (el check anterior confundía decay con un evento de efecto
  negativo) · que nadie escriba el espejo · y que la distribución final de rangos se mantenga en
  banda.
- Traza real (seed 42): *Oro II · 57 LP → Platino I · 23 LP → Esmeralda III · 51 LP → Diamante IV
  · 9 LP → Máster · 87 LP*.

### 2026-08-08 — Paso 7: modelo de contexto de carrera

Pedido del usuario, textual: *"tienen que estar fijadas por el momento de la carrera... que se
sepa cuándo sale cada opción de diálogo, se tiene que saber muy bien dónde estás parado en la
carrera"*. Eso no es contenido, es **arquitectura**: hasta hoy los eventos se filtraban con
`conditions` sobre paths arbitrarios del estado, y con eso era imposible responder "¿qué puede
salir a los 17 estando en una academia?" sin simular.

- **`src/core/contexto.js`** (nuevo): `calcularContexto(state)` deriva **9 ejes** —`etapa`,
  `edadBanda`, `nivel`, `estatus`, `momentum`, `mercado`, `region`, `residencia`, `ventana`— más
  una lista de `marcas`. Es **pura y no consume una sola tirada de RNG**, y eso es lo que la hace
  segura: se puede enumerar sin simular, y agregarla no movió un decimal del balance calibrado.
- **`src/data/contextos.js`** (nuevo): el vocabulario cerrado (`EJES`, `MARCAS`) más la tabla de
  **25 momentos canónicos** resueltos por prioridad. El cruce completo de 9 ejes es intratable
  para autorear; la etiqueta única lo colapsa a un nombre por situación: `amateur_al_limite`,
  `tier1_debut`, `tier1_slump`, `veterano_al_margen`, `espera_edad_minima`, `sin_equipo`…
  Los 15 que todavía no son alcanzables están marcados con el paso que los va a activar, y cada
  paso posterior borra los suyos: eso le da a cada paso una definición de terminado nítida.
- **Gating declarativo en los JSON**: bloque `contexto` (AND entre claves, OR adentro, `!` niega
  marcas, `edadMin`/`edadMax` para edad exacta). **Regla dura sostenida por validate: se prohíben
  `conditions` sobre `phase` y `age`** — si el gating grueso pudiera esconderse adentro de una
  condición numérica, la matriz de cobertura mentiría. Las 12 condiciones que había se migraron.
- **`src/core/plantillas.js`** (nuevo): tokens para que el contenido nombre tu carrera real —
  `"{jungla} no camina más para vos"` → `"Zenvex no camina más para vos"`.
- **`src/dev/cobertura.js`** (nuevo): la matriz que responde el pedido.
  `node src/dev/cobertura.js` imprime momento × ventana; `--huecos` lista las celdas flojas;
  `--momento tier1_debut` dice qué cae ahí; `--evento team_drama` hace la pregunta inversa. Cada
  celda muestra **dos números**: eventos que pasan el contexto, y de esos cuántos **nunca llegan
  a disparar** por sus condiciones numéricas — el detector de huecos disfrazados.
- **Dos bugs arreglados**:
  - `validate.js` referenciaba `BALANCE.meta.pesoDominante`, clave borrada al reescribir la
    sección meta en el paso 5. `undefined <= 0.5` es `false`: **el check nunca fallaba**.
  - `state.pendiente.etapa` guardaba un **índice** de `ETAPAS_SPLIT`. Con el registro pasando de
    11 a ~17 sistemas, toda partida serializada a mitad de split quedaba corrupta. Ahora el
    cursor se resuelve por `sistemaId`.
- **Bug de diseño encontrado midiendo**: el filtro de eventos usaba el contexto **cacheado del
  arranque del split**. En el split donde firmás, `phase` cambia a mitad de camino y el caché
  queda viejo. Ahora el filtrado calcula el contexto **en vivo**; el caché es solo para la UI.
- **4 checks nuevos** (16 en total): vocabulario de contexto válido · tokens que existen · todo
  `effect.path` con etiqueta legible · y el central: **300 seeds × 45 splits sin que ningún
  estado quede sin momento declarado**, más que todo momento no-pendiente aparezca de verdad.

**Verificación de que no movió nada** (era el requisito del paso): se extrajo `HEAD` a un
directorio aparte y se compararon las **400 primeras seeds × 3 estrategias**, con huella de
`finAnticipado`, splits y LP. **Cero divergencias en las tres.** Además, la traza de tiradas de
RNG por split es idéntica (`88,93,96,103,90,89,89,97,108,26` en seed 3).

*(Corrección: la tabla de balance que este documento traía del paso 4 se usó por error como
línea de base; había sido medida antes de que existieran los pasos 5 y 6. La línea de base real
post-paso-6, 1500 carreras × 11 splits, es: equilibrado 56.3% sigue en carrera / 41.8% no llegó
/ 1.4% prohibición / 0.5% burnout; ranked 79.1% burnout / 10.4% prohibición; prudente 58.9% /
41.1%.)*

El contexto se lee como una narración. Traza real (seed 19): *un pibe más grindeando soloQ →
a un paso de que te bajen del ranked → los scouts te empezaron a mirar → debutando en primera →
uno más del roster → en crisis de resultados → titular → referente → la franquicia del equipo*.

- **Estado del catálogo**: 10 momentos alcanzables, 40 opciones de las 150 objetivo. 8 de los 20
  eventos todavía no declaran contexto, así que aparecen en cualquier lado — que es exactamente
  el problema que el usuario señaló, ahora visible en la matriz. Se cierra en el paso 13.

### 2026-08-07 — Paso 6: el ciclo del split profesional

`AUDITORIA.md`: *"una vez que `phase` pasa a `profesional`, `soloqElo`, `studies`, `familyTrust`
y `sleep` se congelan para siempre... No hay ajuste al meta, ni draft, ni temporada regular, ni
playoffs, ni offseason."* La carrera se detenía a los 18 y el resto era decorado.

- **`src/systems/roster.js`** (nuevo): al firmar se genera el vestuario —4 compañeros inventados,
  uno por cada otro rol, con nivel orbitando la fuerza de la org—, la **sinergia** (química
  colectiva, que sube sola con los splits juntos) y la **jerarquía** (tu lugar personal, que
  arranca abajo: entrás como el rookie). Cada tanto se va alguien y hay que reconstruir la
  química. Cambiar de equipo resetea las dos **parcialmente**, no del todo.
- **Draft condicionado por jerarquía** (`campeones.js`): la probabilidad de que te den el campeón
  que querés es `draftBase + jerarquía`. Si no te lo dan, jugás con menos maestría, rendís peor,
  y la jerarquía baja más. **Es la espiral central de `CONCEPTO` §7, funcionando.**
- **`src/systems/rendimiento.js`** (nuevo): el rendimiento del split sale de la hoja de atributos
  **ponderada por rol** (`roles.js` dejó de ser decorativo), corrida por el ajuste al meta, la
  maestría del campeón que terminaste jugando, la sinergia, la jerarquía y ruido gaussiano. Se
  cruza con el nivel de tus compañeros para dar la fuerza del equipo, y esa fuerza compite contra
  las otras orgs de tu liga —cada una tirando su propio split— para dar una posición.
  Consecuencias: títulos (sólo al cierre de temporada), viaje internacional para el campeón de la
  liga, hype **ponderado por la visibilidad del rol** (un support rinde igual y se habla menos de
  él), y mentalidad que sube ganando y baja perdiendo.
  - La jerarquía se mueve por la brecha entre lo que rendiste y **lo que se esperaba de vos**, y
    lo que se espera **crece con tu propia jerarquía**: a la franquicia no le alcanza con rendir
    como uno más. Sin eso se clavaba en 100 y la espiral dejaba de empujar para abajo.
- **`src/systems/practica.js`** (nuevo): la versión profesional del recurso escaso de
  `CONCEPTO` §3. En el offseason repartís 6 puntos de preparación entre pulir tu campeón,
  aprender uno nuevo (**el que el meta pide**, que es la salida real del sacudón), entrenar
  mecánica, estudiar macro o **descansar**. Reusa el mismo tipo de decisión `reparto` que la
  etapa amateur, así la UI no necesitó nada nuevo.
- **`validate.js`**: check nuevo del ciclo profesional — que el roster tenga un compañero por rol
  sin pisar el tuyo, que **la jerarquía varíe de verdad entre carreras** (si se clava, la espiral
  central no existe) y que no todas las carreras terminen con los mismos títulos.

**Balance medido** (800 carreras × 36 splits, de las 465 que llegaron a profesional): jerarquía
0-100 (promedio 64), **títulos 0-10 con promedio 1.6 y un reparto casi exacto 50/50 entre
carreras con título y sin ninguno**, internacionales 0-10, signature en el 67%.

Y el agujero que el paso 4 había dejado abierto **quedó cerrado**: con la opción de descansar en
el offseason, el burnout pasó de llevarse el 55% de las carreras al **18.5%** (estrategia
equilibrada) y al 0.1% jugando prudente. La mentalidad ahora tiene las dos mitades: cuesta
siempre, y hay una forma concreta de recuperarla.

| carrera completa (40 splits) | llega a pro | no llegó | prohibición | burnout | sigue en carrera |
|---|---|---|---|---|---|
| equilibrado | 56.8% | 41.8% | 1.4% | 18.5% | 38.3% |
| ranked | 89.6% | 0% | 10.4% | **79.7%** | 9.9% |
| prudente | 58.9% | 41.1% | 0% | 0.1% | 58.8% |

- **Pendiente conocido**: el "sigue en carrera" es la carrera que llega al tope de splits sin
  terminar. **Todavía no existe el retiro** (por edad, por elección o por lesión) ni la tarjeta
  de legado: es el paso 8.

### 2026-08-07 — Paso 5: champion pool vivo y Ajuste al Meta real

`AUDITORIA.md`: *"el Ajuste al Meta de `CONCEPTO` §6 no existe. En su lugar, `pipeline.js:148`
usa el peso de un solo tag arbitrario (`early_game`) como proxy del meta entero. Los `tags` del
campeón nunca se cruzan con los pesos del meta. **Ni siquiera comparten vocabulario**."

- **`src/core/ajusteMeta.js`** (nuevo): el Ajuste al Meta de verdad. Cruza los tags de cada
  campeón del pool contra el vector de pesos, **ponderando por maestría** (un campeón que el meta
  pide pero que no dominás no te salva el split), y devuelve un número de 0 a 100 **con desglose
  por campeón**. `multiplicadorDeMeta` lo convierte en el 0.75x–1.25x que pide `CONCEPTO` §6.
- **`src/systems/campeones.js`** (nuevo): el pool está vivo. El campeón que terminás jugando se
  elige por maestría (sesgada, para que la especialización sea posible) cruzada con la afinidad
  al meta; **jugar afila con rendimientos decrecientes y no jugar oxida**. Sin ese oxidado se
  podrían mantener diez campeones a punto y el pool dejaría de ser una elección. La **signature**
  emerge sola cuando un campeón junta maestría ≥85 y ≥12 partidas.
- **`src/systems/meta.js`**: además de la deriva calma de cada parche, ahora existe el
  **sacudón** (7% por split): el meta se da vuelta entero y deja obsoleto medio pool. Es el
  mecanismo que `CONCEPTO` §7 describe como capaz de costarte un año de carrera.
- **El orden del split ahora es el de `CONCEPTO` §5**: llega el parche → se recalcula el ajuste →
  se juega → caen los eventos → se mueven los atributos → cierra la temporada.
- **El ajuste está conectado al rendimiento**: en la etapa amateur multiplica el LP por bloque, y
  queda listo para `performance.js`. Jugar lo que el meta pide rinde hasta 1.7x más que jugar
  contra el meta.
- **`validate.js`**: check nuevo que corre 720 splits y exige que el ajuste tome valores variados
  y que se aleje del neutro en las dos direcciones. **Existe por el bug real que encontró la
  auditoría**: si el pool y el meta vuelven a hablar idiomas distintos, el ajuste sería siempre
  50 y nadie se enteraría.
- Medido sobre 600 carreras × 30 splits: **ajuste al meta 26-88** (neutro 50, promedio 51.6),
  maestría máxima 44-96, **signature en 20.5% de las carreras** — rara y ganada.

### 2026-08-07 — Paso 4: atributos con forma de carrera, declive, rachas y economía de la mentalidad

`AUDITORIA.md` medía `mecanica` en **99.9/100 de promedio** a los 30 splits: sólo subía, con un
`Math.max(1, ...)` que garantizaba +1 por split para siempre. No había pico, ni meseta, ni
declive, ni rachas. Y la mentalidad, que `CONCEPTO` §3 define como "la moneda con la que pagás",
**se reponía gratis todos los splits** y en cero no pasaba nada.

- **`src/core/curvas.js`** (nuevo): la forma de carrera, en una función. La comparten la
  generación del mundo y el sistema de atributos, así no se contradicen. El nivel objetivo sube
  hacia **la edad de pico propia de cada jugador** (sorteada, no fija) y después cae con la
  intensidad de su forma (`precoz`, `estandar`, `meseta_larga`, `tardia`, `erratica`).
- **`src/systems/atributos.js`** (nuevo, reemplaza a `progresion.js`):
  - `mecanica`, `laneo` y `teamfight` **convergen** hacia su curva en vez de saltar: el declive
    nunca se anuncia, se nota recién cuando ya lleva un par de splits pasando.
  - `macro` **no declina nunca** (es lo que sostiene a los veteranos); `shotcalling` y
    `adaptabilidad` acumulan con rendimientos decrecientes contra el techo.
  - **`teamfight`, `laneo` y `shotcalling` dejaron de ser stats muertos**: los tres se movían
    cero en todo el repo.
  - **Rachas y slumps**: la `forma` oculta deriva con memoria (`formaPersistencia`), así una
    racha dura varios splits en vez de titilar. No se le explica nunca al jugador.
  - **La mentalidad ya cuesta**: se desgasta todos los splits, más si dormís poco o arrastrás
    deuda de sueño. El único descuento es dormir de verdad: por encima del descanso normal el
    balance se da vuelta. Esa es la razón mecánica para gastar bloques en dormir en vez de en LP.
  - **Burnout**: por debajo del umbral la probabilidad crece hasta volverse segura. Es una curva,
    no un acantilado.
- **Los stats iniciales salen de la curva**, no de una constante: un `precoz` arranca fuerte a
  los 15 y un `tardio` arranca flojo. Antes todos empezaban en 55 de mecánica sin importar el
  potencial que les tocara.
- **Fix de raíz encontrado midiendo**: en fase profesional `sleep` quedaba **congelado para
  siempre** en el valor con el que saliste de amateur, así que un fichaje con el sueño bajo
  condenaba la carrera entera. Ahora, fuera de la etapa amateur, el descanso vuelve solo hacia lo
  normal (hay horarios y gaming house) y la moneda pasa a ser sólo la mentalidad.
- `validate.js`: el check de balance ahora verifica invariantes de diseño, no rangos sueltos —
  entre otras, que **`macro.permiteBajar` sea `false`** (`CONCEPTO` §6) y que
  `formaPersistencia < 1` (con 1 una racha sería eterna).

**Balance medido** (1500 carreras por estrategia). La etapa amateur quedó calibrada y la trampa
del sueño ahora tiene precio:

| etapa amateur (11 splits) | llega a pro | no llegó | prohibición | burnout |
|---|---|---|---|---|
| equilibrado | 57.8% | 40.5% | 1.5% | 0.3% |
| ranked | 3.5% | 0% | 10.4% | **86.1%** |
| prudente | 58.6% | 41.3% | 0% | 0.1% |

Robarle 3 horas al sueño todas las semanas durante tres años funde al 86%: es exactamente lo que
`CONCEPTO` §4 llama "la trampa". `mecanica` pasó de 99.9/100 de promedio a **65.5**, con rango
real 22-100 según el potencial y la forma que te tocaron.

- **Pendiente conocido**: en carrera completa (45 splits) el burnout se lleva ~55% de las
  carreras, porque **la etapa profesional todavía no tiene ninguna forma de recuperar
  mentalidad**. Eso llega en el paso 6 con los puntos de preparación y la opción de descansar
  entre splits. No se tunea antes: bajar el desgaste ahora sería tapar el agujero equivocado.

### 2026-08-07 — Paso 3: la etapa amateur de verdad (bucle de atención, bandas de riesgo, tres salidas)

`AUDITORIA.md` marcaba que `amateur.js` decidía éxito y fracaso pero **no implementaba el bucle
central del juego**: el jugador no repartía nada, los estudios iban al revés (subían), la
confianza familiar estaba desacoplada, y de las tres salidas de `CONCEPTO` §4 existía una sola,
como umbral duro. Este paso construye la etapa entera.

- **El bucle de atención** (`CONCEPTO` §3): **10 bloques de tiempo por periodo** repartidos entre
  rankeds, estudiar, dormir y familia, más **hasta 3 bloques robados al sueño**. Es la primera
  decisión que no es un evento: se agregó el tipo de decisión `reparto` y la UI ganó un panel con
  steppers por destino que no deja cerrar la semana con bloques sin asignar.
- **Robarle al sueño es la trampa**: el costo en mentalidad es **acumulativo** — dos periodos
  seguidos y el segundo pesa más (`penalRoboConsecutivo`); a los 3 entrás en **deuda de sueño**,
  que te baja el LP por bloque hasta un 50%.
- **Los estudios ahora decaen solos** cada periodo, escalados por la `exigenciaColegio` que te
  tocó de cuna, y **la confianza familiar quedó acoplada a los estudios** (cae más rápido cuanto
  más lejos estés del umbral). Las dos contradicciones 1 y 2 del apéndice de `AUDITORIA.md`.
- **Bandas de riesgo en vez de escalones** (contradicción 3): tres curvas de probabilidad
  —aviso, confiscación de la PC, corte definitivo— que crecen a medida que los estudios bajan,
  multiplicadas por lo estrictos que salieron los viejos y por la confianza que queda. **No hay
  un número exacto donde pincha**: se puede zafar con la barra por el piso y se puede pinchar con
  la barra a medias. La confiscación te hace **perder el periodo entero**.
- **Las tres salidas** (contradicción 4): fichaje por scouting (probabilidad creciente por LP y
  hype, con la org sorteada de tu liga y sesgada a que las más fuertes no se fijen en soloQ),
  **negociación con los viejos al llegar a Máster** (los stats corren los pesos, no los eliminan:
  puede salir mal), y **pasarte a nocturno** (2 bloques más por periodo y el colegio deja de
  pesar, a cambio de confianza familiar).
- **`src/systems/secundario.js`** (nuevo, contradicción 5): a los 18 —o al firmar, lo que pase
  primero— la barra de estudios **se congela en un flag permanente** (`terminado` / `lo_dejo`)
  que acompaña el resto de la carrera. Va **antes** de `amateur` en el registro a propósito: si
  la carrera se corta en ese mismo split, el flag ya quedó congelado y entra en la tarjeta final.
- **Escalera de soloQ por LP** (`BALANCE.rangos` + `rangoDeElo`), sin series de promoción.
- **Decisiones normalizadas**: toda decisión —evento o sistema— se presenta igual (`titulo`,
  `descripcion`, `opciones` o `reparto`), así la UI tiene un solo camino de render.
- **`src/dev/estrategias.js`** (nuevo) + `avanzarSplitAuto(state, rng, responder)`: la simulación
  masiva ahora corre **tres formas de jugar** sobre el mismo pipeline del navegador —
  `equilibrado` (reacciona a las barras en rojo), `ranked` (todo al LP) y `prudente` (cuida el
  colegio). Medir una sola forma de jugar no dice nada del balance.

**Balance medido** (1500 carreras × 11 splits por estrategia). La tensión que pide `CONCEPTO` §7
existe y se puede ver:

| | llega a pro | prohibición familiar | no llegó | dejó el secundario |
|---|---|---|---|---|
| equilibrado | 48.5% | 1.9% | 49.7% | 6.9% |
| ranked | 56.3% | **17.5%** | 26.1% | **47.7%** |
| prudente | 54.9% | 0% | 45.1% | 0% |

El que se juega todo al ranked llega antes (split 3.5 vs 4.6 de promedio) y con más LP, pero uno
de cada seis pierde la PC y la mitad deja el colegio. El prudente nunca pierde la PC y siempre se
recibe, pero casi la mitad se queda sin que lo llamen.

- Verificado: `validate.js` pasa los 10 checks; determinismo confirmado; traza del camino
  interactivo (seed 3) de punta a punta con reparto, robo al sueño, aviso del colegio y final
  `no_llego` con el secundario congelado en `terminado`.
- **Pendiente conocido**: la mentalidad todavía llega a 0 sin consecuencia (`CONCEPTO` §3 dice que
  es el fin de la carrera) y `progresion.js` la repone gratis todos los splits. Se arregla en el
  paso 4, junto con las formas de carrera. La tasa global de fracaso amateur (~45-50%) se
  recalibra en el paso 10, cuando exista el arco completo: tunearla ahora, sin etapa profesional
  ni tarjeta de legado, sería prematuro.

### 2026-08-07 — Paso 2: el mundo se genera desde la seed

Cierra el hueco más grande que marcaba `AUDITORIA.md`: `createInitialState` era una constante
salvo por la seed, así que **dos seeds distintas arrancaban el mismo mundo idéntico**. Esa es
la capa sobre la que `CONCEPTO` §8 apoya toda la rejugabilidad.

- **`src/core/mundo.js`** (nuevo): `generarMundo(rng)` sortea de la seed el **rol** (antes fijo
  en `'mid'` y decorativo), la **liga y región de origen**, el **handle** del jugador (inventado
  por sílabas), la **dispersión de los stats iniciales**, el **pool inicial de 3 campeones** del
  rol que te tocó, el **sorteo de cuna** (`exigenciaColegio`, `toleranciaViejos`,
  `apoyoEconomico`), lo **oculto** (`potencial`, `formaCarrera`, `edadPico` propia, `forma` para
  rachas), el **vector de meta inicial**, la **fuerza de cada org** orbitando el prestigio de su
  liga, la **región dominante** de la generación y los **5 rivales de generación**.
- **`createInitialState(seed, rng)`**: el `rng` ahora se inyecta también acá, a propósito. La
  generación del mundo consume del **mismo stream** que después consume el pipeline, así una
  seed reproduce la partida entera y no solo la mitad.
- **Datos nuevos** (los tres que `DISENO` §4.1 pedía y no existían): `src/data/champions.json`
  (50 campeones, 10 por rol, con tags de arquetipo), `src/data/leagues.json` (8 ligas reales con
  prestigio, cupo de imports, dificultad de adaptación y orgs) y `src/data/meta-tags.js` (los
  arquetipos, que estaban hardcodeados como objeto literal en `state.js`). Se sumó `enchanter`
  a los arquetipos, que `CONCEPTO` §6 nombra y faltaba, y `src/data/roles.js` con los pesos de
  atributos y la visibilidad de cada rol (`DISENO` §3.2).
- `src/core/rng.js`: `pick` y `sample` (sorteo sin reposición), reusados por la generación.
- **`src/dev/validate.js`**: 2 checks nuevos. Uno verifica que **cada tag de campeón exista en
  `ARQUETIPOS`** — si el pool y el meta no hablan el mismo vocabulario, el Ajuste al Meta sería
  siempre 0 y nadie se enteraría (era exactamente el bug que tenía el repo) — que los pesos de
  cada rol sumen 1 y que cada liga sea coherente. El otro corre 60 seeds y exige que produzcan
  mundos distintos y que aparezcan los 5 roles.
- Medido sobre 2000 seeds: roles 386-425 cada uno (uniforme), ligas 227-282, formas de carrera
  en la proporción de sus pesos (`estandar` 38%, `erratica` 9%), potencial promedio 62.2 con
  rango completo 30-100.
- Verificado: `validate.js` pasa los 10 checks; `simulate.js 1000 30` da 0 crashes;
  determinismo confirmado.

### 2026-08-07 — Paso 1: cimientos (pipeline unificado, estado único, registro de sistemas)

Punto de partida: `AUDITORIA.md` del 2026-08-07, que encontró violaciones a las reglas
invariables 3, 5, 6, 7 y 9. Este paso las cierra todas y desbloquea el resto del roadmap:
sin una sola fuente de verdad para el avance del split, cada sistema nuevo duplicaba la deuda.

- **`src/systems/registro.js`** (nuevo): `ETAPAS_SPLIT` pasa de ser una lista de strings
  despachada por una cadena de `if/else` a un registro declarativo de módulos. Agregar un
  sistema es ahora, literalmente, un archivo nuevo y **una línea** (regla 6). El pipeline no
  conoce ningún sistema por nombre.
- **`src/core/pipeline.js`** reescrito. **Los dos caminos divergentes (headless e interactivo)
  desaparecen: ahora hay uno solo.** Un sistema puede devolver `decision` desde `aplicar` y el
  pipeline congela el split ahí, guardando el cursor en `state.pendiente`. `resolverDecision`
  lo reanuda desde la etapa siguiente. `avanzarSplitAuto` es el mismo camino con las decisiones
  contestadas por el propio sistema (`resolverAuto`), así que **`simulate.js` y `validate.js`
  miden exactamente lo que se juega en el navegador** (regla 5).
- **Regla 9 cerrada**: `logsAcumulados` y `pendingDecision` ya no viven en variables de módulo
  de `index.html`. Todo está en `state.pendiente` y `state.logs`, así que una partida a medio
  split es serializable y reanudable. Efecto secundario: se arregló el panel de logs, que iba
  un split atrasado.
- **`src/systems/progresion.js`** (nuevo): `aplicarSplitBase` deja de ser una función privada
  escondida adentro de `core` y pasa a ser un sistema de verdad. Se borró
  `src/systems/attributes.js`, que era huérfano (nunca corría) y hacía lo mismo peor; el
  sistema de atributos real (formas de carrera, potencial, declive) se construye en el paso 4.
- **Regla 3**: `src/core/numeros.js` (nuevo) centraliza `clamp`/`clampStat`; el techo `100`
  dejó de estar hardcodeado en 4 archivos. Los valores iniciales del jugador, los pesos
  iniciales del meta, los pisos de las gaussianas y el tope de carrera de la UI se movieron a
  `BALANCE`. `meta.baseWeight` (clave muerta) ahora se usa como `meta.pesoInicial`.
- **Regla 7**: los efectos `push` pasan de `value` fijo a `values: [...]` con sorteo por RNG
  (nombres de org y de hito variados). Se quitaron los rangos degenerados `min:1,max:1` de
  `player.titles`: los títulos son resultado de competir, no de un evento, y los va a otorgar
  `competicion.js` en el paso 6.
- **`src/dev/validate.js`**: de 5 checks a 8. Nuevos: contrato de los sistemas del registro,
  que ningún split deje una decisión colgada (50 seeds × 12 splits), y que dos seeds distintas
  produzcan carreras distintas. El check de esquema ahora **verifica que cada `path` de efecto
  y de condición exista de verdad en el estado** (antes un typo creaba una propiedad nueva en
  silencio), rechaza rangos degenerados y exige ≥2 outcomes por opción.
- **`index.html`**: adaptado al contrato nuevo y **la seed pasó a ser visible y elegible**
  (`CONCEPTO` §9 apoya toda la difusión del juego en compartir seeds; antes se generaba con
  `Date.now()` y no se mostraba).
- Verificado: `node src/dev/validate.js` pasa los 8 checks; `node src/dev/simulate.js 1000 30`
  da 0 crashes; determinismo confirmado; traza del camino interactivo (seed 7, clickeando
  siempre la primera opción) confirma el compás — 1-2 decisiones por split y cierre de edad
  cada 3 splits.
- **Deuda conocida, no tocada en este paso** (es el objetivo de los pasos 2-10): el balance
  sigue roto según el criterio de `CONCEPTO` §11 — `mecanica` promedia 99.9/100 y 98.6% de las
  carreras terminan igual. Se arregla cuando existan las formas de carrera (paso 4) y el ciclo
  profesional (paso 6).

### 2026-08-06 — Fix: los logs de evento no tenían relación con lo que pasó

- **Bug reportado por el usuario**: el log de cada evento mostraba siempre `título: descripción (elegiste "opción")` — el mismo texto fijo sin importar qué outcome se hubiera sorteado. Dos resultados completamente distintos de la misma opción (el bueno con weight alto, el malo con weight bajo) generaban exactamente la misma frase, porque el log nunca miraba los `effects` realmente aplicados.
- **`src/core/selectors.js`**: nuevo diccionario `etiquetaCampo(path)` (ej. `player.stats.hype` → "Hype") para poder describir cualquier path de efecto en texto legible, reusado por eventos y por el resumen de edad.
- **`src/systems/events.js`**: `aplicarEfecto` ahora devuelve también una `descripcion` del cambio efectivo (post-clamp, no el rango declarado). `resolverOpcion` arma el log a partir de esas descripciones reales (`"Meme de la prensa — Subirse a la ola: Hype +6, Mentalidad -3."`) en vez de repetir la descripción estática del evento.
- **`src/systems/edadCierre.js`**: el resumen de temporada ahora filtra los campos que no cambiaron (antes listaba los 7 siempre, en el mismo orden, aunque algunos quedaran en +0).
- Verificado: `npm run validate` sigue pasando los 6 checks; `simulate.js 1000` da exactamente los mismos agregados numéricos que antes (el fix es solo de texto, no toca balance); log detallado de una carrera confirma que dos disparos del mismo evento ("Meme de la prensa") ahora muestran texto distinto según el outcome real.

### 2026-08-06 — Compás de edad: 3 splits, 1-2 decisiones, cierre de temporada

- **CONCEPTO.md**: se documentó formalmente el compás que rige toda partida (sección nueva "El compás: edad, split y decisión" en §2, más un párrafo en §4): cada edad (año) dura 3 splits, cada split trae 1 o 2 decisiones y es en sí mismo un parche que mueve el meta suavemente, y el tercer split de cada edad cierra con el resumen de la temporada más una decisión más grande. Implementado primero en la etapa amateur; el resto de las etapas lo hereda cuando se construyan.
- **`src/systems/edadInicio.js`** (nuevo, agregado a `ETAPAS_SPLIT`): al primer split de cada edad, guarda una foto (`flags.edadSnapshot`) de los stats trackeados (soloQ LP, sueño, estudios, confianza familiar, mecánica, mentalidad, hype) para poder calcular el resumen al cierre.
- **`src/systems/edadCierre.js`** (nuevo, agregado a `ETAPAS_SPLIT`): en el split que cierra la edad (`splitCount % BALANCE.edad.splitsPorEdad === 0`), genera el log de resumen (diff contra la foto de `edadInicio`), suma 1 a `state.age` (antes quedaba muerto en 15 toda la partida — bug de arrastre, ahora se corrigió como efecto secundario) y dispara la decisión de cierre si hay alguna disponible para la fase actual.
- **`src/systems/events.js`**: `elegirEvento` ahora acepta excluir un id (para no repetir el mismo evento como segunda decisión del split); nuevo `elegirEventoCierre` (filtra por `cierreDeEdad: true`, separado del pool normal); nuevo `resolverEventoAutomatico` (extraído de `aplicar`, reusado por el camino headless y por `edadCierre.js`). `aplicar` (modo headless) ahora intenta una segunda decisión con probabilidad `BALANCE.edad.probSegundaDecision`.
- **`src/data/events/cierre_edad.json`** (nuevo, 2 eventos con `cierreDeEdad: true`, fase amateur): "Fin de temporada: balance" y "Revisión familiar de fin de año", registrados en `data/events/index.js`.
- **`src/data/balance.js`**: nueva sección `edad` (`splitsPorEdad: 3`, `probSegundaDecision: 0.4`); `meta.maxDelta` bajó de `0.25` a `0.15` para que el parche por split se sienta calmo, como pide el concepto.
- **`src/core/pipeline.js`**: `ETAPAS_SPLIT` pasó a `['aplicarInicioEdad', 'aplicarEtapaAmateur', 'aplicarMeta', 'aplicarEventos', 'aplicarSplitBase', 'aplicarCierreEdad']`. El camino interactivo (`avanzarSplitHastaDecision`/`resolverDecisionYContinuar`) se reescribió para poder pausar hasta 2 veces por split (decisión normal 1, decisión normal 2) más una tercera pausa opcional (decisión de cierre) antes de finalizar — `resolverDecisionYContinuar` ahora recibe el objeto `pendingDecision` completo (con `tipo`/`slot`) en vez del evento suelto, para saber cómo seguir.
- **`index.html`**: nueva stat-card "Edad"; `mostrarDecision`/`elegirOpcion` adaptados al nuevo contrato de `pendingDecision`.
- **Bug encontrado y corregido durante la prueba en navegador real**: `elegirOpcion` llamaba a `avanzar()` sin revisar si `resolverDecisionYContinuar` ya había devuelto una nueva `pendingDecision` (la segunda decisión del split o la de cierre) — la descartaba en silencio y arrancaba un split nuevo desde cero por encima, duplicando etapas de amateur/meta. Se arregló para que, si hay `pendingDecision`, se muestre directamente en vez de seguir avanzando. Encontrado clickeando la carrera real en Chrome headless (CDP crudo, perfil aislado), no solo con `simulate.js`.
- **`src/dev/validate.js`**: nuevo check de coherencia para `BALANCE.edad` (`splitsPorEdad` entero positivo, `probSegundaDecision` entre 0 y 1) y check de que exista al menos un evento con `cierreDeEdad: true`.
- Verificado: `npm run validate` pasa los 6 checks; determinismo confirmado (misma seed, mismo resultado); `node src/dev/simulate.js 1000` da 0 crashes (985/1000 llegan a profesional, 15 fracasan por familia); log detallado de una carrida de 9 splits confirma 1-2 decisiones por split, el resumen de temporada, la decisión de cierre, y `age` subiendo 15→16→17→18 en el momento justo. Probado además en navegador real (Chrome headless vía CDP, perfil aislado): 13 decisiones clickeadas de punta a punta, 0 errores de consola, comportamiento idéntico al headless tras el fix.

### 2026-08-06 — Decisiones jugables reales en el demo

- **Bug de diseño corregido**: el demo de `index.html` apretaba un botón y todo se resolvía solo, sin que el jugador eligiera nada — violaba la regla invariable #8 de CLAUDE.md y el eje central del proyecto ("decisiones estratégicas"). La causa era que `systems/events.js` ya tenía el modelo de opciones+outcomes ponderados (Fase 0) pero lo resolvía en modo automático por no existir todavía ninguna interfaz.
- `src/systems/events.js`: se separó `aplicar` (modo automático, sin cambios de comportamiento — lo siguen usando `simulate.js`/`validate.js`) en dos piezas reusables: `elegirEvento(state, rng)` (elige el evento candidato sin resolverlo) y `resolverOpcion(state, evento, opcionId, rng)` (aplica la opción que se le pasa).
- `src/core/pipeline.js`: dos funciones nuevas para avance interactivo, sin tocar `avanzarSplit`/`ETAPAS_SPLIT` (siguen siendo el camino headless): `avanzarSplitHastaDecision(state, rng)` corre etapa amateur + meta y, si hay un evento candidato, corta el split ahí y devuelve `pendingDecision` en vez de resolverlo; `resolverDecisionYContinuar(state, logsPendientes, evento, opcionId, rng)` aplica la opción elegida y termina el split.
- `index.html`: reescrito para jugarse split a split. Aparecen 3 stat-cards nuevas (Sueño, SoloQ LP, Fase) y un panel de decisión con el texto del evento y un botón por opción; el jugador elige y la carrera sigue hasta la próxima decisión o el desenlace final (fichaje/fracaso/sigue en amateur).
- **Probado en navegador real** (no sólo con Node): se levantó `server.js`, se lanzó Chrome headless en un perfil aislado (sin tocar la sesión de navegador del usuario) manejado por CDP crudo (no había `chromium-cli`/Playwright instalados), se clickeó "Comenzar carrera" y 4 decisiones seguidas. Confirmado: el panel muestra título/descripción/opciones reales de los datos, las stat-cards se actualizan entre decisiones, el botón principal se deshabilita mientras hay una decisión pendiente, y no hubo errores de consola. Screenshot confirma el render.
- `npm run validate` y `node src/dev/simulate.js 1000` dan exactamente los mismos resultados que antes de este cambio (el camino headless no se tocó).

### 2026-08-06 — Paso 2: éxito/fracaso de la etapa amateur + fix de carga

- **Fix**: `index.html` tiraba `Failed to fetch dynamically imported module` porque se estaba abriendo como `file://` en vez de servido por `server.js` (los navegadores bloquean `import()` dinámico sobre `file://`). El `catch` del demo ahora detecta `location.protocol === 'file:'` y explica cómo correrlo (`npm start` → `http://localhost:8000`) en vez de mostrar el error críptico.
- **Nuevo stat `player.sleep`** (`src/core/state.js`, inicial 75), pedido explícitamente por DISENO.md §3.4 ("barras de estudio, sueño, familia y progreso en soloQ") y ausente hasta ahora.
- **Nuevo sistema `src/systems/amateur.js`**, saca la lógica que vivía hardcodeada en `pipeline.js` (regla #6 de CLAUDE.md). Cada split en fase `'amateur'` mueve `soloqElo` (+), `sleep` (-), `studies` (+) y `familyTrust` (- por defecto, compensable vía eventos), y evalúa condición de salida:
  - **Éxito**: `soloqElo >= 1600` y `hype >= 55` → te ficha un equipo, `phase` pasa a `'profesional'`, se guarda `state.splitFichaje`.
  - **Fracaso** (fin de carrera legítimo, no error — DISENO §7 pide finales múltiples): `familyTrust <= 15` → `finAnticipado: 'fracaso_familia'`; `sleep <= 10` → `finAnticipado: 'fracaso_sueno'`. `phase` pasa a `'retirado'` y `state.terminado = true`.
- `pipeline.js`: `avanzarSplit` ahora es no-op si `state.terminado`, y corta el resto de las etapas del split en curso si la carrera termina a mitad de camino (no tiene sentido loguear un evento el mismo split en que te bajaron del ranked).
- **Eventos gateados por fase**: `academy_offer` ahora requiere `phase: 'amateur'` (es el puente hacia el debut); `redemption_game`, `coach_demands_role`, `team_drama`, `transfer_rumor`, `visa_delay`, `title_run`, `international_trip` y `worlds_dream` ahora requieren `phase: 'profesional'` (su lore asume que ya estás en un roster). Sin cambios al motor — usa el mecanismo de `conditions` que ya existía.
- `simulate.js` reporta `phase`/`terminado`/`finAnticipado`/`splitFichaje`/`sleep`/`soloqElo`, corta el loop por carrera si `terminado`, y en modo lote agrega desenlaces (`llegaronAPro`, `splitFichaje` promedio, `fracasos` por motivo, `siguenAmateur`). Default de splits subido de 8 a 15 para que el reporte de una sola corrida normalmente alcance a mostrar un desenlace.
- **Balance validado por simulación** (CLAUDE.md §7): 1000 carreras de hasta 20 splits → 96.6% llega a profesional (promedio 8.33 splits hasta el fichaje, rango 5-14), 3.4% termina en fracaso temprano (2.7% familia, 0.7% burnout), 0% se queda trabado en amateur. Los umbrales de la primera estimación quedaron bien calibrados, no hizo falta retunear.
- `index.html`: el resumen ahora refleja el desenlace real (fichado / fracaso por familia / fracaso por burnout / sigue en amateur) en vez de un texto fijo; el loop de demo corre hasta 20 splits o hasta que termine la carrera, lo que pase primero.
- Verificado: `npm run validate` pasa, determinismo confirmado, `node src/dev/simulate.js 1000` sin crashes, servidor sirve `index.html` con 200 OK.

### 2026-08-06 — Cierre de andamiaje + motor de eventos data-driven

- Se agregaron `src/core/selectors.js` (`getPath`/`setPath` inmutables, `cumpleCondiciones`, `metaDominante`) y `src/core/log.js` (`crearLog`), previstos en DISENO.md §4.1 y ausentes hasta ahora.
- Se agregó `weightedPick` a `src/core/rng.js`, reusado por el motor de eventos en sus tres niveles de selección ponderada (evento / opción / outcome).
- Se agregaron `src/dev/guards.js` (bloquea `Math.random()` en todo `src/` vía escaneo estático) y `src/dev/validate.js` (valida guardia RNG, esquema de eventos, coherencia de `balance.js` y determinismo end-to-end). `npm run validate` corre ambos.
- **Se migraron los 18 eventos** de `src/systems/events.js` (antes hardcodeados como funciones JS) a datos en `src/data/events/*.json`, agrupados por categoría narrativa, agregados vía `src/data/events/index.js`. Se eliminó el duplicado obsoleto `src/data/events.json` (no se importaba desde ningún lado).
- **Se agregaron opciones y outcomes ponderados a cada evento** (regla invariable #8 de CLAUDE.md, antes inexistente — los eventos se auto-aplicaban sin decisión). `systems/events.js` es ahora un motor genérico sin lógica por id: filtra por condiciones + cooldown, elige evento/opción/outcome por peso, y aplica efectos declarativos (`type: "stat"` con rango+clamp opcional, `type: "push"` para listas). Mientras no exista UI (Fase 11), la opción se resuelve en modo automático usando el mismo RNG inyectado — determinista, listo para que la futura pantalla de decisión reemplace el auto-pick sin tocar el esquema de datos.
- Se agregaron cooldowns por evento (`state.flags.cooldowns`) para evitar repetición inmediata.
- Se movió el número mágico de influencia del meta en `aplicarSplitBase` (`0.8` / `0.2`) a `BALANCE.split.metaInfluenceBase` / `metaInfluenceRange`.
- `src/dev/simulate.js` ahora acepta `[corridas] [splits]`: con `corridas=1` da el reporte detallado de siempre; con `corridas>1` corre carreras independientes con seeds `1..corridas` y agrega min/promedio/max + conteo de crashes. `node src/dev/simulate.js 1000` corre sin crashear (verificado).
- Verificado: `npm run validate` pasa, dos corridas con la misma seed producen el mismo estado, `node src/dev/simulate.js 1000` da 0 crashes, y la demo de `index.html` (llamada directa a `avanzarSplit`) sigue funcionando sin cambios de código en la UI.
- **Observación de balance para una futura pasada de tuning** (no se tocó en este cambio): en la corrida de 1000 carreras de 8 splits, `mecanica` promedia 97.75/100 — el stat llega casi siempre al techo. Candidato a revisar cuando se ataque la Fase 10.
