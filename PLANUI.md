# PLANUI — la UI nueva de Un Split Más

> **Este documento es el plan vigente de la interfaz.** `PLAN.md` terminó (FASE V cerrada el 2026-10-08) y sigue siendo
> la fuente de las reglas de proceso, las trampas T1-T10 y la tabla de deuda técnica; este plan las respeta y continúa su
> numeración (deudas D102 en adelante). Lo que quedaba de V8b (D98, D99) se pliega acá.
>
> **Estado del documento: BORRADOR (2026-10-09).** Se cierra en dos compuertas del usuario: la **compuerta 1** (elige una
> dirección mirando la vitrina) fija §5; la **compuerta 2** (aprueba este documento) habilita la producción. Antes de la
> compuerta 2 no se toca `src/`, `index.html` ni `server.js`.
>
> Orden de lectura: §1 (por qué) → §3 (la vara) → §4 (la vitrina) → §5-§8 (qué) → §9-§11 (cómo) → §12 (cómo se verifica).

---

## 0. Estado

| Paso | Qué | Estado |
|---|---|---|
| **U0 · ola 0** | El andamio de la vitrina: datos reales (`vitrina/datos/`), panel, cargador de arte, PRNG decorativo, fuentes, verificador, capturas, "hoy", índice | ✅ 2026-10-09 (`a7126d1`, `dacbec8`, `dcb741f`; merge en `u-integracion`) |
| **U0 · ronda 1** | Las tres direcciones (A · LUZ, B · NOCTURNO, C · PANTALLAS): inicio, decisión, cumbre, tira de eras, celular | ✅ 2026-10-09 (3 × Opus xhigh en paralelo + una ronda de observaciones cada una; merge `c1d88f5`) |
| **Compuerta 1** | El usuario elige (o mezcla) mirando la vitrina; su reacción en frío queda textual en `PROGRESO.md` | 🔶 2026-10-09: finalistas **A y C** (B archivada); pidió ampliarlas para decidir (§4.2) |
| **U0 · ronda 1b** | A y C ampliadas: `partido` (serie con Fearless, Swiss 2-2) y `mercado` (ofertas + firma); A profundiza el aura y los fondos animados, C lo clásico tipo cliente (§4.3) | 🔶 en curso |
| **Compuerta 1 (final)** | El usuario elige A, C o una mezcla | ⬜ |
| **U0 · ronda 2** | La ganadora completa la estrella del norte: serie, Swiss, mercado, celular, trayectoria y PNG | ⬜ |
| **Compuerta 2** | El usuario aprueba este documento (incluida la enmienda de la regla 1, §2) | ⬜ |
| **U1 + U1a** | Cimientos (tokens, fuentes, shell, `fx/`, era) + andamio de medición | ⬜ |
| **C1** | El usuario prueba luz, tipografía, ritmo y rendimiento en su máquina | ⬜ |
| **U2 + U2c** | Las pantallas del norte (inicio + decisión; partido + mercado) + franja, cuartos y contenedor de minijuegos | ⬜ |
| **U3** | Los momentos + la carta, el PNG y la trayectoria | ⬜ |
| **C2** | El usuario juega una carrera completa | ⬜ |
| **U4** | Pulido y cierre (D98, D99, contraste, celular, rendimiento, docs) | ⬜ |

---

## 1. Por qué un tercer plan

### 1.1 Cómo se ve hoy

Medido sobre las capturas del recorrido de V8a (seed 25, 1440×900 y 390×844; copias en `vitrina/hoy/`):

- **El vacío.** Fondo casi negro con una grilla tenue y escuadras en las esquinas de la ventana. El escenario es una
  columna de ~720 px flotando en el medio; a 1440 px, más de la mitad de la pantalla es negro plano.
- **Cajas dentro de cajas.** Panel achaflanado → caja con escuadras → tarjeta de opción achaflanada → chip con borde. Tres
  y cuatro niveles de marco para decir una sola cosa.
- **Una sola voz tipográfica.** Barlow Condensed en mayúsculas para títulos, rótulos, botones y números; Inter para el
  resto. Sin contraste de escala: el título de una parada y el rótulo de una pestaña se leen casi igual.
- **Cero imagen.** El splash de Data Dragon existe (J9) pero solo aparece borroso en el inicio; los íconos de campeón,
  en el inicio, el pool y el tablero de Fearless. Ni el resultado de un mapa, ni la carta final, ni un título tienen arte.
- **Movimiento mínimo.** Beats de texto de 700 ms, conteos y fundidos. Ganar el Mundial es una línea más del relato y una
  tarjeta dorada.
- **Una pared de texto.** El plan amateur muestra 4 opciones × (label + 2 líneas + 4-5 chips de texto + nota del perfil).
  El 2-2 del Swiss del Mundial —"vida o muerte"— es una cajita con un botón "A JUGARLO" y 700 px de negro debajo.

### 1.2 Por qué los dos planes anteriores salieron iguales

Lo midió un explorador de historia sobre `PLAN.md`, `PROGRESO.md`, `AUDITORIA.md` y el git log:

1. **Los briefs eran de estructura y foco.** FASE T ("La transmisión", 2026-09-04) armó el sistema de diseño y el shell;
   FASE V ("Una cosa por vez", 2026-10-07/08) reordenó la pantalla. La auditoría de 2026-10-01 protegía el look a
   propósito: *"la estética es de muy buena calidad; el problema es de foco"*, *"pintar la casa antes de mover las
   paredes"*.
2. **Nunca hubo dirección de arte.** Ni referencias ni maquetas más allá de ASCII. "Broadcast de esports" se volvió un set
   de tokens y cada pasada recoloreó lo mismo: cyan `#2ee8ff`, oro `#ffc861`, Inter + Barlow Condensed **idénticos desde
   T0**. El único brief visual del usuario —*"un diseño full profesional para cuando subamos la página, moderno y
   futurista"* (2026-09-04)— nunca se tradujo a una imagen. Tras T0 el usuario dijo *"es muy igual al anterior"*.
3. **Las herramientas re-imponen lo viejo.** Los guards empujan cada cambio por los mismos acentos, fuentes y fondo; y el
   recorrido **exige** la columna centrada de ≤ 720 px (`src/dev/recorrido.mjs:668-687`, la regla f2).
4. **Se aprobaron por métricas, no mirando.** Cada plan se construyó en horas con workers baratos en las familias de
   pantalla (Sonnet high) y se cerró por números de layout (números a la vista, opciones arriba del pliegue, contraste).
   Las pruebas del usuario C1 y C2 de FASE V no tienen feedback registrado.

### 1.3 Qué cambia esta vez (proceso, no intención)

- **La imagen antes que las palabras.** La dirección se elige mirando prototipos que funcionan sobre datos reales (§4).
- **El prototipo es la especificación.** Los tokens, el movimiento y los efectos de la ganadora se copian **textuales** a
  `src/ui/` (con un check temporal de que siguen iguales); los renderers se reescriben limpios (§9).
- **La estrella del norte en el mismo estado exacto.** Cada muestra de la vitrina trae su guardado real; el recorrido lo
  inyecta en el juego y compara las dos capturas (§12).
- **Lo viejo, prohibido por guard** (§5.9) y **la regla f2 reescrita primero** (U1a).
- **Gusto con modelo caro.** Opus xhigh en lo visual; Sonnet en lo mecánico (§11).
- **Un crítico que no construyó** con una rúbrica de señales de plantilla (§3.3).
- **El usuario mira tres veces antes del merge**: la vitrina, C1 y C2.

---

## 2. Decisiones del usuario (textuales — respetarlas, no volver a preguntar)

| Tema | Decisión |
|---|---|
| El pedido (2026-10-09) | *"una UI mucho más avanzada y profesional […] esto va a estar en un portfolio […] quiero que entres a jugar y que sea de esas páginas que digas wow"* · *"es la 3era vez que hago un plan de UI y todos terminaron muy parecidos"* · *"no quiero algo que tome muchísimo tiempo"* · *"buildeá varios ejemplos y ponelos en una página para mostrarme opciones, funciones etc como quedaría antes de aprobar"* |
| Leer menos (2026-10-09) | *"intentá que la UI minimice o resuma un poco el texto de las opciones porque a veces parece un juego de lectura, intentá que aunque sea un poco lo haga, tampoco que se pierda info"* → §7 |
| El brief visual de antes (2026-09-04) | *"un diseño full profesional para cuando subamos la página, moderno y futurista"* |
| Siguen vigentes (§V.1 de `PLAN.md`) | **"Escenario + un panel"** (una pieza + un panel de contexto; en el celular, sin el panel) · **"Una página por split"** · el escalón en el cierre de año · **Golden Road** "Todo el año" como **"Logro aparte"** |
| Reemplazada | T.2 "broadcast de esports, desktop primero": la estética la decide la compuerta 1 |
| **Pendiente — compuerta 1** | La dirección (A, B, C o mezcla) |
| **Pendiente — compuerta 2: enmienda de la regla 1 de §V.3** | Hoy: *"mientras hay una parada, nada más se anima"*. Propuesta: **el ambiente se aquieta en ≤ 1 s cuando aparece una parada** y solo vuelve a moverse en el relato; nada más se anima durante una parada |

---

## 3. La vara

### 3.1 Qué significa "wow" acá

Tres pruebas que juzgan personas y cinco que mide el recorrido.

- **Los 5 segundos** (la juzga el usuario): alguien que nunca vio el juego, en los primeros 5 s del inicio, ve
  movimiento, el arte de un campeón, un título que impone, y entiende que es la carrera de un pro de LoL.
- **La captura** (la juzgan el supervisor y el revisor): cualquier captura de cualquier parada tiene **3 capas de
  profundidad** (ambiente, arte, contenido), **un punto focal ≥ 3× el cuerpo de texto**, y la identidad se reconoce sin
  el logo.
- **La carrera entera** (la juzga el usuario en C2): el wow no se gasta en el primer cuadro; cambia con las eras y explota
  en los momentos.

### 3.2 Lo que mide el recorrido (§12 tiene el detalle)

1. Dentro de **±15% de la estrella del norte**, en los mismos guardados: proporción de vacío plano, cobertura de arte y
   efectos, relación tipografía grande/cuerpo, histograma de tono, anidamiento de contenedores.
2. **Pisos**: anidamiento ≤ 2; cero prohibidos (§5.9); ≥ 4 cambios de era en una carrera completa de `criterio`; todo
   cambio de pieza animado entre 180 y 320 ms (salvo INST o movimiento reducido); `data-era` quieto durante el relato.
3. **Leer menos**: −50% de palabras visibles por parada en escritorio, cada dato a ≤ 1 interacción.
4. **Rendimiento**: p95 de cuadro ≤ 20 ms con navegador visible en la máquina del usuario; tareas largas < 50 ms en las
   transiciones.
5. **Lo de siempre**: las metas de FASE V (≤ 45 números a la vista en escritorio, ≤ 25 en el celular, la opción 1 arriba
   del pliegue, cero scroll horizontal, cero errores de consola), teclado, retomar, contraste, motor intacto.

### 3.3 La rúbrica del crítico (señales de plantilla de IA)

El revisor de cada ola y el supervisor la pasan sobre las capturas. Cada "sí" es una observación:

- ¿Todos los radios son iguales? ¿Todo está adentro de una caja? ¿Hay cajas dentro de cajas?
- ¿Las pilas están centradas por defecto, sin una decisión de composición?
- ¿Hay degradados violeta-azul genéricos, vidrio esmerilado en todo, brillos sin fuente de luz?
- ¿Hay más de dos acentos compitiendo? ¿Gris sobre gris?
- ¿Los íconos son de un set genérico o emojis?
- ¿El título y el cuerpo tienen casi el mismo tamaño?
- ¿La pantalla se entiende igual sin el arte? (Si sí, el arte es decoración, no ambiente.)
- ¿Se parece a lo de hoy (§1.1)?

---

## 4. La vitrina y la elección

`vitrina/` vive fuera de `src/` y de `dist/` (`build.js` copia solo `index.html`, `src/{core,data,systems,ui}` y el
og-image) y se sirve con su propio servidor (`node vitrina/servir.mjs`, puerto 8095), no con `server.js` (el check K0-B
prueba su lista blanca con mutantes).

- **Datos reales** (`vitrina/datos/generar.mjs`): el bot `criterio` juega cientos de carreras headless con
  `avanzarSplitAuto` (`src/core/pipeline.js:180`); se elige una seed héroe por cobertura (plan amateur de 4 opciones, Bo5
  con quemados, Swiss 2-2, título, mercado con ≥ 3 ofertas, primer contrato; deseables: Mundial, lesión, cierre con
  parada, Golden Road). Cada muestra guarda las salidas de los helpers puros del juego, la página del relato, el
  resultado real de **cada** opción (resuelta en un clon desde el mismo estado) y **su guardado real** (`serializar` + el
  marcador `lolcs-vista`). Correr dos veces da el mismo archivo.
  **Medido (2026-10-09)**: barrido de 2500 seeds sin errores; la seed héroe es la **61** (Elurah89, mid, BR: Enclave
  Collective → LOUD → RED Canids Kalunga → FURIA, 4 CBLOL → Karmine Corp, LEC 2035 y **Golden Road 2036**; retiro
  elegido a los 33, puntaje 1494, percentil 99): cumple los 6 obligatorios y todos los deseables menos la lesión (no hay
  una seed en 2500 que tenga lesión grave y los 6 obligatorios a la vez). `muestras.json` pesa 426 KB y 9 guardados
  reales validados (`vitrina/datos/guardados/`). El atajo `--seed 61` difiere de la corrida completa solo en las 3 filas
  del historial del inicio: la canónica es la completa.
- **La era de cada muestra** (`comun/catalogo.js`, `ERA_DE_MUESTRA`): inicio y plan amateur → `pieza`; mercado y firma
  → `academia`; evento, serie, cierre y título → `escenario`; Swiss y Mundial → `mundial`; final → `leyenda`. Es el
  primer borrador de la regla que va a vivir en `ui/core/era.js` (§9.2), que la deriva de la `vista`.
- **El andamio común** (`vitrina/comun/`): el panel (pantalla, muestra, era, repetir, sonido, celular, movimiento
  reducido, INST, WebGL sí/no, FPS, textos breves/completos, peor caso, "hoy"), el cargador CORS de Data Dragon, el PRNG
  decorativo, el contrato del ambiente, las fuentes OFL, el verificador (las reglas de `guards.js` + la lista de
  prohibidos) y las capturas (escritorio, celular, reloj congelado, tiras de cuadros, con y sin WebGL).
- **Ronda 1**: las tres direcciones en paralelo, mismas pantallas y mismos datos: **inicio** con intro · **decisión**
  (un evento de 2 opciones y el plan amateur de 4, con "leer menos" y elegir → resultado real) · **la cumbre** (el título
  que desemboca en la carta) · **la tira de eras** (la misma pantalla en las 5 eras) · **celular**.
- **El índice**: las tres con su inicio vivo, el **modo lado a lado** (A|B|C sobre la misma pantalla y muestra), la matriz
  de funciones, antes/después contra `hoy/`, la recomendación y **"Copiar mi elección"**.
- **Compuerta 1** → **ronda 2** (solo la ganadora): serie (la pared de retratos de Fearless, el Swiss 2-2, la serie mapa
  a mapa), mercado (ofertas + la firma), celular de ambas, trayectoria + PNG.

### 4.1 La ronda 1: cómo son las tres (2026-10-09)

Las tres corren sobre la seed 61, con las mismas pantallas (inicio, decisión del evento y del plan amateur, la cumbre del
título → la final, la tira de eras, el celular). Cada una se construyó con un Opus xhigh en paralelo y tuvo una ronda de
observaciones del supervisor (rúbrica de §3.3, mirando todas las capturas y las tiras). Las tres pasan `verificar.mjs`
y su captura completa, con 0 errores de consola y 0 `requestfailed`. El código vive en `vitrina/<dir>/` (con su
`README.md`: tokens, efectos y qué se traslada). Las capturas de referencia están en `vitrina/referencia/ronda-1/` (8
por dirección: inicio, evento, plan amateur, el momento del título, la final, eras, el resultado al elegir, celular). Las
capturas completas no se versionan: se regeneran con `comun/capturar.mjs`.

**A · LUZ** (`vitrina/a-luz/`, commits `bfecc59` → `5a63908`).
- *El mundo.* Un ambiente WebGL2 propio (`js/ambiente.js`): haces, bruma, polvo, bokeh, tubos y el resplandor del
  monitor, con 5 equipos de luz por era:
  - `pieza`: azul de monitor + ámbar de velador;
  - `academia`: fluorescente verde agua;
  - `escenario`: haces cruzados de estadio + rim magenta + público en bokeh;
  - `mundial`: oro;
  - `leyenda`: atardecer.
  El splash del campeón vive dentro de la luz, en duotono de la era, encuadrado por la cara (no en un recuadro). Todo
  depende de un reloj: `congelar(t)` dibuja ese instante, así las tiras son fieles.
- *Tipografía.* Mona Sans condensada 800 en títulos (≤ 56 px en las paradas, 96-214 px en el inicio y la cumbre),
  expandida 900 en los números; Geist en el cuerpo; Geist Mono 11-13 px en los rótulos. El contraste de escala es la
  herramienta.
- *Inicio.* Intro de ~3 s ("15 años. Una pieza.") y la selección: al apuntar un campeón, su splash reemplaza al
  anterior en el ambiente con una transición (**lo que más le gustó al usuario**, §4.2). Servidor como selector,
  BLOQUEAR que se enciende con 3 mains.
- *Decisión.* Las opciones son franjas con glifos (eje + ▲/▲▲/▲▲▲ por cantidad, riesgo con ícono) y un inspector con la
  prosa de a una. El plan amateur es una matriz con el valor actual de cada eje en el encabezado. Al elegir, la franja
  crece y se vuelve la tarjeta del resultado real, con los números rodando ("75 → 76", "64 → 61"). La placa de
  contexto queda a la derecha, sin repetir el nivel de la franja.
- *Cumbre.* Takeover de 2,4 s: la luz sube a oro, "CAMPEONES" letra por letra con un barrido especular, los créditos
  del plantel y polvo dorado. Desemboca en la carta holográfica 5:7 (puntaje grande, LEYENDA, Golden Road, banda
  iridiscente) con la trayectoria dibujada.
- *Contraste medido* con un script de píxeles: peor caso por era entre 4,59 y 5,56 en las paradas.
- *Débil:* en el celular el ambiente queda bastante tapado por los velos que hacen falta para el contraste.

**B · NOCTURNO** (`vitrina/b-nocturno/`, commits `1a717ad` → `5b9b8f2`). *Queda archivada después de la compuerta 1
(§4.2): sus ideas se pueden importar.*
- *El mundo.* Una revista que sale de noche: negro, una tinta ácida `#C8FF2E`, Archivo variable con violencia
  tipográfica, IBM Plex Mono en los folios ("UN SPLIT MÁS · EDICIÓN 2032 · PRETEMPORADA · P. 283") y Fraunces itálica
  solo en la cita destacada.
- *El arte.* El splash en semitono por shader, con niveles por histograma antes del tramado.
- *Cada era es otra imprenta:*
  - `pieza`: fotocopia de fanzine de 1 bit;
  - `academia`: la revista de la liga;
  - `escenario`: el ácido pleno;
  - `mundial`: oro como segunda tinta;
  - `leyenda`: papel.
- *Lo mejor:*
  - la doble página de la decisión (la crónica con capitular, ÚLTIMO MOMENTO a máquina y la cita, a la izquierda; LA
    DECISIÓN con números grandes y la "nota al margen" como inspector, a la derecha);
  - el plan amateur como tabla de almanaque;
  - el ¡EXTRA! en papel que entra girando;
  - la edición de colección con el almanaque de la carrera (curva, cinta de clubes, nota de cada año, los 8
    Mundiales).
- *Débil:* el arte en semitono se lee a medias en tamaño grande.

**C · PANTALLAS** (`vitrina/c-pantallas/`, commits `8cfc45e` → `bb3ddfe`).
- *El mundo.* Un sistema operativo inventado, **FARO**, cuya versión es el año del juego (FARO 26 en la pieza, FARO 32
  en FURIA, FARO 44 al retiro). Los mismos componentes se re-tematizan por era:
  - 2026: oscuro con violeta;
  - 2028: la PC clara del equipo;
  - escenario: la estación de pro monocroma;
  - mundial: el stream;
  - 2040s: sin marcos, con el dock flotante.
  La ventana enfocada es el escenario, el widget acoplado es el acompañante, el dock son los 6 cuartos, y la bandeja
  del sistema es tu cuerpo (batería = sueño/cabeza, señal = jerarquía).
- *Inicio.* BIOS → logo → pantalla de bloqueo con un reloj gigante "2026" → el login como "nueva carrera". La
  selección de campeones vive en la ventana "Cliente".
- *Decisión.* La ventana enfocada con glifos e inspector. Las notificaciones son un stack real de FARO. El plan amateur
  es una planilla con el escudo de rango en SVG propio. Al elegir, la opción vuela y se vuelve tu mensaje, después
  "escribiendo…", y la respuesta real llena la ventana mientras los números ruedan en el widget.
- *Cumbre.* El título como **stream** a pantalla completa con el chat cayendo (PRNG decorativo, armado con datos reales
  de la serie). Termina con un apagado CRT y el **salón de la fama**: la carta con el splash a sangre y `carrera.log`
  con la curva.
- *Contraste medido:* 0 fallas en 879 textos.
- *Débil:* la decisión se lee un poco más "app" que juego, y no hay WebGL: el wow descansa en el concepto y el
  movimiento.

### 4.2 Compuerta 1: lo que dijo el usuario (2026-10-09, textual)

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

Lo que se lee (sin sobre-interpretar):
- **Finalistas: A y C. B queda archivada.**
- De A le gusta el **aura**: que el fondo cambie con transición cuando apuntás un campeón, y las animaciones en
  general. Propone **fondos animados** si se consiguen.
- De C le gusta que es **clásico, "como del LoL"**: simple, lo más fácil de entender, aunque al apuntar no cambia nada.
- "El fondo retro" queda **ambiguo**: puede ser el semitono de B o el escritorio de 2026 de C. No se actúa sobre esa
  frase sin preguntar.
- Pide **ampliar A y C un poco** para decidir mejor. No pide mucho.

### 4.3 Ronda 1b: A y C ampliadas (el plan, escrito antes de implementarlo)

**Las mismas pantallas nuevas para las dos**, para que la comparación sea justa. Son las que esta sección ya preveía para
la ronda 2 de la ganadora, así que la ronda 2 se achica:
- **`partido`**:
  - la serie Bo5 con Fearless: el plan de 3 opciones con la p de cada mapa, los quemados, el replan cuando "te
    leyeron" (`serieReplan`), la serie jugada mapa a mapa con VICTORIA/DERROTA;
  - el **Swiss 2-2 del Mundial**, "vida o muerte", con su resultado real.
- **`mercado`**: las 6 ofertas (sueldo, años, arraigo, jerarquía proyectada, riesgo) y **la firma** como momento.
- Los datos: la ola de datos agrega `resultados[]` al Swiss y al mercado (rama `u-vitrina-datos2`).

**Cada una profundiza lo que le gustó al usuario:**
- **A, el aura.**
  - Que **todo lo que muestra un campeón** reaccione al apuntarlo con la transición del ambiente: la selección, la pared
    de retratos de Fearless, el plantel, los picks de la serie. En las opciones, la luz responde sutil al eje apuntado.
  - **Fondos animados**: el splash pasa a ser un plano vivo, animado por el shader (profundidad 2,5D, deriva lenta,
    partículas de la era, barridos de luz), sin assets nuevos ni dependencias. Los splash animados reales existen solo
    para algunos skins y no están en Data Dragon. El worker puede sondear CommunityDragon (≤ 5 llamadas) para
    informarlo, pero el juego no depende de eso.
  - Transiciones de luz entre pantallas en vez de cortes.
- **C, lo clásico.** Que se sienta **como el cliente del LoL**, sin clonarlo:
  - la serie como una ventana de draft, con los picks y los quemados de Fearless en gris;
  - el fin de cada mapa como la pantalla de VICTORIA/DERROTA;
  - el Swiss como el stream;
  - el mercado como la **bandeja de contratos**, donde la firma se dibuja (su firma 4, que había quedado para la
    ronda 2).
  La vara de C: simple, se entiende de un vistazo.

**Proceso.**
- Dos Opus xhigh nuevos en paralelo, uno por dirección; leen el `README.md` y el código de su dirección en vez de
  continuar a los de la ronda 1, que tienen contextos de ~500K.
- Mismas reglas de `comun.md`, una ronda de observaciones del supervisor, y la vitrina se vuelve a servir en el 8095.
- **Compuerta 1 (final):** el usuario elige A, C o una mezcla. Después, la ronda 2 de la ganadora es solo lo que falte
  (trayectoria + PNG y los celulares de la serie y el mercado), y se cierra §5.

---

## 5. La dirección

> **Se fija en la compuerta 1.** Abajo, A completa (la recomendada) y B/C en resumen; si el usuario elige otra o una
> mezcla, esta sección se reescribe con su prototipo y sus tokens, y las ideas importadas se traducen al idioma de la
> ganadora (se importan ideas, no estilos).

### 5.1 A · LUZ — *"Tu carrera, iluminada."*

Una carrera de LoL se vive de noche: el monitor de la pieza, la sala de práctica, el escenario, el estadio del Mundial.
A cuenta esa historia con **luz**. El fondo es un ambiente WebGL de haces volumétricos, bruma y polvo que cambia de
"equipo de luz" con la era; el campeón que importa en cada pantalla está **en el ambiente** (su splash, en duotono de la
era, enmascarado en la luz), no en un recuadro; el contenido se apoya sobre la luz sin cajas; la tipografía hace el
resto.

Palabras: cinemático · nocturno · eléctrico · preciso · cinético. Vocabulario de referencia: la luz de escenario de las
ceremonias de Worlds, la escala tipográfica de las páginas de producto de Apple, los títulos de documentales deportivos.

### 5.2 Color: las eras

| Era | Cuándo (desde `vista`) | Luz principal | Luz de contra | Sensación |
|---|---|---|---|---|
| `pieza` | amateur sin club | `#2F6BFF` (monitor) | `#FFB45A` (velador) | de noche en tu cuarto |
| `academia` | tier 3 o tier 2 | `#43E6C3` (fluorescente frío) | `#E8F6FF` | sala de práctica |
| `escenario` | tier 1 | `#7FA8FF` (estadio) | `#FF3DA8` (rim) | el escenario de la liga |
| `mundial` | en un internacional | `#FFC94D` (oro) | `#FFF3D6` | el estadio del Mundial |
| `leyenda` | final / retirado | `#FF9A5A` (atardecer) | `#FF4F7A` | lo que quedó |

Base: vacío `#04050A`, noche `#0A0D16`; tintas `#F4F6FB` / `#A9B3C7` / `#7C879C`; semánticos `#3DF2A0` (sube) /
`#FF5468` (baja) / `#FFB547` (riesgo). El color de la org vive **solo** en su chip y en las barras del marcador: no
compite con la luz de la era ni con las 11 categorías. Ánimos: `peligro` desatura y baja la luz (pulso ≤ 1 Hz), `gloria`
sube el bloom unos segundos.

### 5.3 Tipografía

- **Mona Sans** variable (ancho 75-125, peso 200-900): títulos de parada condensados peso 800, **≤ 56 px** (regla 2:
  primero lo que se decide); titulares de momento, cierre e inicio 96-140 px; números expandidos peso 900, tabulares.
- **Geist** 16-18 px para el cuerpo; **Geist Mono** 11-13 px, +0,14em, para rótulos y telemetría.
- Presupuesto: la display ≤ 70 KB (si el subset variable no entra, 2-3 instancias estáticas); sale Barlow.

### 5.4 Grilla y composición

12 columnas, márgenes de 96 px a 1440. El contenido a la izquierda (7 columnas) y el acompañante a la derecha (4): se
cumple "Escenario + un panel" sin columna centrada en un vacío. La franja es una banda translúcida de 56 px; abajo, la
trayectoria mínima de 28 px (de 15 años al presente). En el celular, una columna y el acompañante en su hoja.

### 5.5 Profundidad y textura

Tres capas siempre: ambiente (canvas) → arte (splash en duotono, enmascarado) → contenido. Las placas para legibilidad
son translúcidas **sin `backdrop-filter`** sobre el canvas (costo de GPU). Polvo y brasas como únicas partículas.

### 5.6 Iconografía

Un set propio en SVG (`components/iconos.js`): los 5 roles (ya existen), los ejes de la previa (mecánica, macro,
mentalidad, estudios, sueño, confianza familiar, LP…), el riesgo, la rareza, los escudos de rango (Hierro → Challenger,
propios, no los de Riot).

### 5.7 Movimiento

Entradas expo-out 180-320 ms, salidas 160 ms; orden de entrada: luz → rótulo → título (máscara por línea) → cuerpo →
opciones (escalonadas 50 ms) → panel. Resortes con `linear()` en los números y la carta. Takeovers ≤ 2,4 s. Como mucho
2 stingers. Todo con camino quieto en CSS **y** JS, también para `::view-transition-*`.

### 5.8 Sonido

Sintetizado (WebAudio, sin archivos): el clic de siempre, un stinger, la multitud (ruido filtrado), el acorde de título
(`arpegioTitulo`, escrito en T3 y nunca usado). Apagado por defecto, con invitación en el inicio ("mejor con sonido").

### 5.9 La lista de prohibidos (guard)

Falla el build si aparece: `--clip-corte` (el chaflán), ticks/escuadras (`--tick*`, `escuadra`), `--scanline`, la grilla
de fondo con `linear-gradient` repetido, la familia Barlow, el cyan `#2ee8ff` como color principal, más de 2 niveles de
contenedor visible (lo mide el recorrido), y la columna centrada en un vacío (la regla f2 nueva).

### 5.10 Las otras dos (resumen; ver el apéndice A)

- **B · NOCTURNO** — *"Tu carrera, impresa de noche."* Fondo negro, una tinta ácida (`#C8FF2E`), Archivo variable + IBM
  Plex Mono, grilla editorial con filetes y folios, splash en halftone por shader; papel solo en las tapas (la del año
  con la seed como código de barras, el "¡EXTRA!", la edición de colección); la cita destacada como beat decisivo.
- **C · PANTALLAS** — *"Todo pasa en tus pantallas."* El escritorio de tu PC a los 15, la estación del equipo de pro y el
  stream del Mundial; los aparatos envejecen con el calendario (2026 → 2040s). Ventana enfocada = escenario, widget =
  acompañante, dock = cuartos, teléfono = celular. Tres firmas: el escritorio amateur, la bandeja de contratos que se
  firman con Enter, el stream con el chat cayendo.

---

## 6. Sistemas firma

### 6.1 El ambiente

WebGL2 a media resolución con un fallback CSS de la **misma API**: `ambiente({ era, animo, arte })`, `pulso(tipo)`,
`congelar(t)`, `pausar()`, `reanudar()`. Lee los colores de los tokens (§9.5). Lo alimentan solo la `vista` (vía
`ui/core/era.js`) y los ganchos de los momentos: **nunca el `store`** (regla 4). Se aquieta en ≤ 1 s cuando aparece una
parada (enmienda de la regla 1, §2). Presupuesto: escala ≤ 0,5, ≤ 2 texturas, 30 fps, render a demanda, en pausa con
minijuego, cuarto abierto o pestaña oculta, maneja la pérdida de contexto y se degrada solo.

### 6.2 El arte

Un solo cargador CORS de Data Dragon (verificado el 2026-10-09: splash 1215×717, carga 308×560, centrada, tiles e íconos
responden `Access-Control-Allow-Origin: *`) para `<img>`, textura WebGL y el PNG. Sin `url()` de CSS para el arte (un
cacheo mixto contamina el canvas del PNG); nunca aborta una carga (el recorrido cuenta `requestfailed` como error); sin
red, se degrada a nada y el tile cae a las iniciales (ya existe). Qué arte va en cada pantalla: tu main en la pieza y la
academia; tu campeón del mapa en la serie; el rival en el cruce; el arte de carga en la carta.

### 6.3 Las transiciones

View Transitions (Baseline desde octubre de 2025: Chrome/Edge, Safari 18, Firefox 144) **solo** en tres lugares:
elegir → resultado, → partido y → final. El resto entra con la coreografía de CSS. El envoltorio está en §9.4.

### 6.4 El número que rueda

Odómetro por dígito con su delta (▲3), montado sobre `moverNumero` (`ui/core/delta.js`) y `countUp`. En INST o con
movimiento reducido aparece en su valor final.

### 6.5 Los momentos

Un solo componente de takeover con **3 variantes** —la firma, el título, el Mundial (Golden Road es su estado dorado)—,
banners para lo mediano y ceremonias cortas para lo chico. Topes: ≤ 1 takeover por página, ≤ 8 por carrera, ≤ 2,4 s cada
uno; Espacio los saltea; un cuarto abierto los pausa; 0 s en INST o con movimiento reducido. `momentosVistos` va en el
marcador `lolcs-vista` para que retomar no los repita.

| Momento | Peso | Señal (sin tocar el motor) |
|---|---|---|
| Primer contrato (pieza → academia) | takeover "firma" | `phase` amateur→`profesional` + log `amateur` "Firmaste con X" |
| Título de liga | takeover "título" | log `serie` con `postSerie`, `ronda:'final'`, `gano` |
| Campeón del Mundo / Golden Road | takeover "Mundial" (dorado) | log `internacional` `{resultado:'campeon'}` / `seguimientoGoldenRoad().completo` al cierre del año |
| Retiro | transición lenta a la final | `phase:'retirado'` + `finAnticipado` |
| Debut tier 1 · ascenso/descenso · clasificar · Top 20 · bombazo/traspaso | banner | `splitAscensoTier1`, log `competitivo`, log `internacional`, log `top_mundial`, oferta `bombazo`/log de traspaso |
| Ascenso de rango (Diamante → Challenger) | ceremonia corta | `player.ranked.tier` entre `fotoInicio` y la `vista` |
| Lesión grave · burnout · servicio militar | ánimo `peligro` + banner sobrio | `lesion_grave`, `burnout_pro`, log `servicioMilitar` |
| Cierre de año | la tarjeta de cierre | log `edad` `{nota, banda, tipo, bajada, vinetas}` |
| VICTORIA / DERROTA por mapa | cartel | `serie.mapas[]` (`campeon`, `rivalJuega`, `resultado`, `cierre`) |

Frecuencias con `criterio` (para calibrar cuánto se ve cada uno): 71% llega a tier 1, 52% gana un título, 37% entra al
Top 20, 10% gana el Mundial, 2,6% hace el Golden Road. No existe MVP, KDA, oro, torres ni duración: no se dibujan.

### 6.6 La carta

La tarjeta final como objeto: inclinación con el puntero, brillo y foil; **no se da vuelta** (recorte). La rareza sale
del escalón del puntaje (`escalonDeCarrera`); el Golden Road es una variante. La cara se dibuja **una vez en un canvas**
y ese canvas es el PNG: lo que se ve es lo que se baja (reemplaza el dibujo aparte de `exportar.js`).

### 6.7 La trayectoria

No es un sistema nuevo: es la trayectoria de V5 (`ui/core/trayectoria.js`, `cuartos/carrera.js`: cinta de clubes, curva
fina de nivel, notas por año, hitos, archirrival) re-dibujada con el sistema nuevo; aparece en la final y de fondo en el
PNG. Regla 15: lo dibujado es el registro.

### 6.8 La intro

~3 s la primera vez (brillo de monitor → "15 años. Una pieza." → la luz → el título), salteable con cualquier tecla o
clic; después, solo con "ver intro".

### 6.9 Gestos nativos de LoL (patrones, no assets de Riot)

"Aceptar" con anillo para las paradas de una sola opción y el "¡Vamos!" de los minijuegos; la selección de campeones con
"BLOQUEAR"; VICTORIA/DERROTA por mapa; la ceremonia de ascenso de rango con escudo propio; la región como selector de
servidor.

---

## 7. Leer menos, sin perder nada

El motor da casi todo estructurado: `previa[]` con `signo`, `magnitud` (`baja|media|alta`) y `texto` ("Mecánica ~+4");
`riesgo`/`riesgoTexto`; `rareza`; `plan.texto`; la p de cada plan y mapa a mapa (`components/decision.js:190-248`). La UI
lo **dibuja** en vez de escribirlo.

1. **La opción es su label + glifos.** Ícono del eje + ▲/▲▲/▲▲▲ o ▼ (la magnitud por cantidad de flechas, no por
   opacidad: cierra D99a); el riesgo como ícono + nombre corto; el % como medidor con su número (regla 13); el plan de
   Fearless como 5 barritas + el % de la serie grande.
2. **La prosa, de a una.** En escritorio, la descripción aparece en **un** inspector cuando apuntás una opción (hover,
   flechas, Tab); 1-4 sigue eligiendo directo. En el celular, una línea + "más". Nunca tres descripciones a la vez.
3. **El planteo en una línea**: la primera oración de la descripción de la parada; el resto, a un toque.
4. **Las paradas de plan** (plan amateur, plan del año, plan de Fearless) **como matriz**: opciones en filas, ejes en
   columnas, barras y flechas alineadas. Se compara de un vistazo.
5. **Nada se pierde.** Todo texto del motor sigue en el DOM a ≤ 1 interacción, con `aria-describedby`; un ajuste
   "Textos: breves | completos" en la franja. **El texto del motor no se reescribe** y **nunca se parsea prosa**: los %
   que solo viven dentro de una descripción armada (p. ej. `systems/amateur.js:1061`, "66% de que salga bien…") quedan
   en el inspector.
6. **El inventario** de la vitrina (`vitrina/datos/INVENTARIO.md`) dice cuántas paradas traen datos estructurados y
   cuántas solo prosa. Si las solo-prosa pesan, se propone una subfase aditiva chica (**U-m**: campos estructurados
   junto a la prosa, sin `rng`, huella idéntica, como fue GR-m) para aprobar aparte. **Medido (2026-10-09)**: el 76% de
   las opciones de la carrera héroe ya trae datos estructurados y solo el **3%** tiene un % que vive únicamente en la
   prosa (`amateur:negociacion` 50%, `amateur:oferta` 48%, `retiro:retiro_vuelta` 35%). No pesan: **U-m no hace falta**
   por ahora (queda como deuda chica si C2 la pide).
7. **Meta**: −50% de palabras visibles por parada en escritorio con "breves", contra la línea de base de hoy (U1a).

---

## 8. Pantalla por pantalla

> Escrito para A; la ronda 2 y la compuerta 1 lo ajustan. Cada pantalla nombra su estrella del norte (captura de la
> vitrina) y lo que tiene que estar sí o sí.

- **Inicio.** La intro (§6.8); el título que impone; la selección de campeones: cinco glifos de rol grandes, la grilla de
  retratos del rol, el splash del campeón apuntado como ambiente, tres ranuras que se llenan con transición y "BLOQUEAR"
  que se enciende con tres mains. Nombre de invocador, región como selector de servidor, perfil en una línea. Continuar
  como placa con el arte de tu main; el desafío del día y el historial, chicos y abajo. *Sí o sí*: el arte vivo detrás
  de la selección, el "BLOQUEAR", el ambiente de la era `pieza`.
- **Relato (la página del split).** Cada beat entra con su ícono por `log.type` (cierra de paso D41) y su peso; los
  técnicos, en una tira tenue; los que ya tienen tarjeta propia (resultado de fecha, serie, ranking, año, Mundial,
  parche) se re-dibujan como gráficos del sistema. *Sí o sí*: `data-era` quieto mientras cuenta (regla 4).
- **Cierre de split y de año.** El resultado grande ("3.º DE 10"), el número que se movió rodando, la banda; en el año,
  la nota (0-10) grande, el titular, las 6 viñetas como íconos, el escalón ("Vas por Campeón · para Figura mundial te
  falta…") y el Golden Road vivo como 5 marcas. D98 (la espera de 2,4 s) se calibra en U4 con lo que diga el usuario.
- **Decisión.** Rótulo de categoría, título ≤ 56 px, primera oración, las opciones como franjas anchas con glifos y
  medidor, el inspector; la elegida se transforma en su resultado (View Transition) y los números ruedan. *Sí o sí*: §7.
- **Plan amateur y plan del año.** La matriz de §7.4.
- **Partido.** Fecha marcada: el cruce como gráfico (tu org vs la rival, la p grande, el porqué de la fecha). Plan de
  Fearless: la **pared de retratos de carga** del pool (308×560) que se apagan al quemarse, las cartas de plan con sus 5
  barritas y el % de la serie. Mapa decisivo: la previa del clutch y el "Aceptar". Swiss 2-2: **entrada a pantalla
  completa de "vida o muerte"** con el récord en 5 marcas, la p y el "Aceptar". Bracket como cinta. Cada mapa con su
  cartel VICTORIA/DERROTA y los dos campeones del cruce.
- **Mercado.** Las ofertas como contratos lado a lado (org, sueldo grande rodando, años, liga, jerarquía desde → hasta,
  la etiqueta Bombazo/Ascenso/…); comparar resalta lo mejor de cada una; firmar es el momento "firma" (la firma se
  dibuja). El mercado del mundo, en el acompañante.
- **Minijuegos.** Las 10 mecánicas no se tocan; cambian el contenedor (la previa con la apuesta en una placa, el
  "¡Vamos!" como "Aceptar") y el jugo (destello, sacudón ≤ 4 px, chispas), desde `fx/jugo.js` (el check de conteo de
  `components/minijuegos/` no admite archivos extra).
- **Prueba y prensa.** Como los minijuegos, con su rótulo propio.
- **Retiro y vuelta.** La luz baja hacia `leyenda`; la decisión con el mismo sistema.
- **Final.** La luz `leyenda`; la carta (§6.6) a la izquierda; el veredicto, los totales en números grandes y la
  trayectoria (§6.7); compartir (copiar imagen, bajar, copiar link, nueva carrera).
- **Franja.** Banda translúcida de 56 px: handle · glifo de rol · chip de org · edad · año · ventana · el número con su
  banda y su delta (odómetro); velocidad, sonido, textos breves/completos, `?`; las pestañas de cuartos.
- **Acompañante.** Una placa translúcida a la derecha con el contexto de la pieza (`acompananteDe`, sin cambios de
  lógica): rango y barras, tabla, bracket y Fearless, previa, mercado del mundo, escalón y Golden Road.
- **Cuartos.** El `<dialog>` de siempre con el sistema nuevo: Vos (la ficha con el radar de 6 atributos de
  `graficos/hexa.js`, hoy sin usar), Temporada (tabla y fixture), Equipo, Mundo, Carrera (la trayectoria), Crónica.
- **Celular.** El mismo sistema en una columna; el ambiente a menor resolución o el fallback CSS; los takeovers
  adaptados; el acompañante en su hoja.

---

## 9. Arquitectura

### 9.1 Lo que se queda

El motor entero. En la UI: `app.js`, el director (`ui/escena.js` + `ui/core/escena.js`), los dos stores (`store` y
`vista`), `reproductor.js`, `teclado.js`, las familias por dueño (`paradas/*`), el guardado y el marcador `lolcs-vista`
(que suma `momentosVistos`). Los ids que lee el recorrido se conservan o se actualizan en el mismo commit.

### 9.2 Lo nuevo

- **`src/ui/fx/`** — una raíz aparte (como `teclado.js`), montada después de idle, un solo canvas, cada efecto envuelto
  para que un fallo degrade a nada y nunca frene el juego; sin DOM al importar:
  `ambiente.js` (WebGL2 + fallback), `arte.js` (el cargador CORS), `transicion.js` (§9.4), `movimiento.js` (revelar,
  escalonar, odómetro, resortes), `momento.js` (el takeover), `azar.js` (`mulberry32(hash(seed + ':fx'))`, el PRNG
  decorativo), `jugo.js` (el de los minijuegos).
- **Puros, corren en Node**: `ui/core/era.js` (era y ánimo desde la `vista`; **reemplaza a `aplicarEstudio`**,
  `shell.js:37`, para que haya un solo escritor de la luz) y `ui/core/momentos.js` (qué momento trae un beat, por su
  clave y las diferencias del registro).
- **El gancho del reproductor**: `reproductor.js` se importa en Node; recibe un `alBeat` inyectado por `app.js` y nunca
  importa `fx/`. Las esperas de los momentos van por su `dormir` (Espacio saltea, un cuarto abierto pausa).

### 9.3 Cómo se trasladan los prototipos

Se copian **textuales** los tokens, el movimiento y los efectos de la ganadora (con un check temporal que compara el
`tokens.css` del juego contra el de la vitrina hasta U4); los renderers de las familias se reescriben sobre el sistema
(no se pega HTML del prototipo).

### 9.4 El envoltorio de View Transitions

`revelar` (`ui/escena.js:48`) es síncrono y `app.js` depende de eso (`:442→456` pinta beats enseguida; `:678-679` fuerza
un reflow para la entrada). `startViewTransition` difiere el cambio un cuadro, su overlay se traga los clics, una
segunda llamada rechaza `ready` con AbortError (ensucia la consola del recorrido en INST) y un nombre de transición
duplicado la aborta. Por eso el envoltorio:

- es **síncrono** (como hoy) en INST, sin espera, sin soporte, en la misma pieza o al retomar;
- junta llamadas seguidas y atrapa las tres promesas (`ready`, `updateCallbackDone`, `finished`);
- usa nombres únicos, `pointer-events: none` en el overlay, el canvas con nombre propio y `animation: none` (para que el
  ambiente no se congele), y movimiento reducido también en `::view-transition-*` (la regla `*` de `base.css` no los
  alcanza);
- enfoca el encabezado en `updateCallbackDone`.

### 9.5 Colores al shader y guards

Los colores del shader salen de los tokens con `leerToken` (`exportar.js:25`), normalizados por un canvas de 1×1.
`guards.js` se extiende: atrapa `oklch|oklab|lab|lch|color(|color-mix(` en las hojas y tripletes de color en GLSL; las
tintas y placas siguen en `#rrggbb` (los parsers de contraste no leen oklch). Guard nuevo: `rngUi` aparece solo en
`components/minijuegos/`, `paradas/minijuego.js` y `app.js` (un uso decorativo correría los minijuegos humanos sin que
ningún bot lo note). Guard nuevo: la lista de prohibidos (§5.9).

### 9.6 Contraste sobre arte

`contraste.mjs` compone solo los `background-color` de los ancestros: un canvas detrás del texto pasa en falso. Dos
checks nuevos: (1) **la regla de la placa**, estática: toda tinta × toda placa ≥ 4,5:1, con la placa compuesta sobre
blanco; (2) **píxeles** para la tipografía grande sobre arte: se oculta el texto, se captura, se decodifica en la página
y se exige ≥ 3:1 contra el p90 de luminancia bajo cada caja. Anillo de foco doble (claro y oscuro).

### 9.7 Presupuestos

`index.html` (196/200 líneas) suma un solo `<link>` (`fx.css`) y recorta comentarios. Fuentes: sale Barlow; Mona Sans
(95 KB el subset variable, medido) entra si se compensa o va en instancias; Geist 28 KB y Geist Mono 22 KB (medidos).
`dist/` (2617/2700 KB): si se pasa, el techo sube con su número en su propio commit (regla 2).

---

## 10. Restricciones duras

- **El motor no cambia**: `HUELLA_JUEGO` 79304237 idéntica y `VERSION` del guardado 15 en cada subfase. (Única excepción
  posible: U-m, §7.6, aditiva y con aprobación aparte.)
- **Guards actuales** (`src/dev/guards.js`): cero `Math.random(` en `src/**/*.js` (aun en comentarios); color literal
  solo en `tokens.css` (en JS de `src/ui`, hex prohibido aun en comentarios, `rgb()/hsl()` solo en template literal);
  todo `var(--x)` sin fallback definido en `tokens.css`; `index.html` ≤ 200 líneas y su script inline sin
  `function`/`const`; `shell.css` con el selector literal de las 7 piezas; 42 módulos de UI importados en Node; el
  contrato de `graficos/*.js`; `components/minijuegos/` sin archivos extra; los checks de texto literal en
  `paradas/minijuego.js`, `ficha.js`, `decision.js`, `inicio.js`, `app.js`, `reproductor.js`; los de Data Dragon
  (iniciales, `<img>` que se saca en error, dos capas de splash).
- **El contraste de `validate.js`** (243-301) y `TONOS_CONOCIDOS` (8873) leen tokens por nombre en `#rrggbb`: los tokens
  nuevos conservan esos nombres (cambian los valores) o el check se actualiza en el mismo commit con los mismos umbrales.
- **Una sola pieza visible en el DOM** (`checkVisibility()` ignora opacidad).
- **Espejos de tiempo** de `simulate.js` (700 / 1600 / 2400 ms; check "K0 espejos"): toda espera nueva actualiza el
  espejo en el mismo commit.
- **Reglas de proceso** 13 (todo número con referente), 15 (lo dibujado es el motor), 16 (el azar grande se declara).
- Teclado (1-4, Espacio, letras de cuartos, Esc), retomar a mitad de parada, `prefers-reduced-motion`, ≤ 3 destellos por
  segundo, sonido apagado por defecto.
- **Workers**: solo `validate.js --rapido` y `--solo=`; nunca la validación completa; matan solo su PID; no tocan el
  puerto 8090 ni el 8095; el supervisor re-corre sus números sobre una copia exacta.

---

## 11. Subfases y olas

Cuatro olas, ≤ 3 workers por ola, ramas desde `u-integracion`, un worktree por subfase, un revisor Sonnet con
navegador por ola (tope ~30-40 tool calls) y el supervisor comparando capturas contra la estrella del norte en los
mismos guardados.

| Ola | Subfase | Entrega | Dueño de | Worker |
|---|---|---|---|---|
| 1 | **U1 · cimientos** | Tokens nuevos y fuentes copiados de la ganadora; shell sin columna centrada (franja, escenario, acompañante) conservando los ids; `fx/` entero; `ui/core/era.js` reemplazando `aplicarEstudio`; el envoltorio de transiciones dentro de `revelar`; la lista de prohibidos y los guards nuevos (§9.5); el check temporal de tokens | `tokens.css`, `base.css`, `shell.css`, `primitivos.css`, `index.html`, `ui/escena.js`, `shell.js`, `fx/**`, `ui/core/era.js`, `guards.js` | Opus xhigh |
| 1 | **U1a · andamio** | La regla f2 reescrita desde la estrella del norte; el modo de captura con movimiento y reloj congelado; pasadas con swiftshader y sin WebGL; las métricas nuevas (palabras visibles, anidamiento, transiciones corridas, vacío plano, cobertura de arte, relación título/cuerpo, histograma de tono); la inyección de los guardados de la vitrina y las composiciones lado a lado; los checks de placas y de píxeles; la línea de base medida sobre la UI de hoy | `src/dev/recorrido.mjs`, `src/dev/contraste.mjs`, `src/dev/estrella.mjs` (nuevo) | Sonnet high |
| — | **C1** | El usuario prueba la luz, la tipografía, el ritmo y el rendimiento en su máquina; se sigue sin esperar | — | supervisor |
| 2 | **U2a · inicio y decisión** | Inicio (intro, selección de campeones), relato y cierre, decisión genérica, plan amateur y plan del año como matriz, leer menos completo | `screens/inicio.js`, `paradas/decision.js`, `components/{decision,feed,cierre}.js` y sus hojas | Opus xhigh |
| 2 | **U2b · partido y mercado** | Fecha marcada, plan de Fearless con la pared de retratos, decisivo, Swiss 2-2, bracket, VICTORIA/DERROTA; mercado con la firma | `paradas/{partido,mercado}.js`, `components/{serie,previaPartido,mundial,mercado}.js` y sus hojas | Opus xhigh |
| 2 | **U2c · franja, cuartos, minijuegos** | Franja, acompañante, los 6 cuartos y la ayuda; el contenedor de minijuegos, prueba y prensa con su jugo | `franja.js`, `acompanante.js`, `cuartos*`, `components/ficha.js`, `paneles/*`, `paradas/minijuego.js`, hojas propias | Sonnet xhigh |
| 3 | **U3a · momentos** | `ui/core/momentos.js`, `fx/momento.js` con las 3 variantes, banners y ceremonias; el gancho `alBeat`; sonido; `momentosVistos`; espejo de `simulate.js` y "K0 espejos" | `ui/core/momentos.js`, `fx/momento.js`, `reproductor.js` (gancho), `sonido.js`, `simulate.js` (espejo) | Opus xhigh |
| 3 | **U3b · la carta** | La carta (canvas único = PNG), la final, la trayectoria re-dibujada, `exportar.js` | `screens/tarjeta.js`, `exportar.js`, `cuartos/carrera.js`, `ui/core/trayectoria.js`, `graficos/*` | Opus xhigh |
| — | **C2** | El usuario juega una carrera completa; lo que encuentre abre una ronda corta | — | supervisor |
| 4 | **U4 · pulido y cierre** | D98 (la espera del cierre de año), D99 (contraste), lo nuevo del contraste, el celular, el rendimiento, el CSS muerto, `DISENO.md` §4.5-4.6 y `CONCEPTO.md`; el cierre: `--rapido`, `simulate.js 1000`, determinismo, build, recorrido con 3 seeds × 2 tamaños, merge en `fase-9r`, `PROGRESO.md`; push solo con OK nuevo | lo que quede | Sonnet high + supervisor |

**Tamaño**: 7 workers en 4 olas (FASE V fueron 12 subfases en ~2 días); estimado ~1,5-2 días de agentes y ~3-4M tokens.

**El contrato de las familias** se actualiza en la cabecera de `ui/escena.js` en U1: además de lo de V (`mostrar`,
`acompanante`, `data-atajo`, `data-foco`, su hoja, no editar los archivos compartidos), cada familia usa los tokens y
`fx/` (nunca efectos propios), respeta ≤ 2 niveles de contenedor, títulos ≤ 56 px, "leer menos", y entrega sus capturas
contra la estrella del norte.

---

## 12. Verificación

**Cada subfase**: `validate.js --rapido`; `huella.js` contra la base (`HUELLA_JUEGO` idéntica); `build.js` (guards,
techo y huella de `src/` contra `dist/`); el recorrido con las seeds 25, 39 y 152 a 390×844, 1024×768 y 1440×900, más
los guardados de la vitrina (estrella del norte). El revisor de la ola mira las composiciones lado a lado y pasa la
rúbrica (§3.3).

**Las métricas nuevas** (U1a las construye y mide la línea de base sobre la UI de hoy):

| Métrica | Cómo | Meta |
|---|---|---|
| Vacío plano | % de píxeles casi uniformes y oscuros en la captura | ±15% de la estrella del norte |
| Cobertura de arte/efectos | diferencia de píxeles con y sin las capas de ambiente y arte | ±15% |
| Relación título/cuerpo | tamaño computado del mayor texto visible ÷ el cuerpo | ±15%, y ≥ 3 en los momentos y cierres |
| Histograma de tono | histograma de matiz de la captura | ±15% (distancia) |
| Anidamiento | ancestros con borde o fondo visible entre el viewport y el texto de una opción | ≤ 2 |
| Palabras visibles | conteo en el viewport, con "breves" | −50% contra la línea de base |
| Transiciones | cambios de pieza que pasaron por el envoltorio o la coreografía | 100% (salvo INST/reducido), 180-320 ms |
| Eras | cambios de `data-era` en una carrera completa de `criterio` | ≥ 4; quieto durante el relato |
| Cuadro | p95 con navegador visible en la máquina del usuario (`?fps=1`) | ≤ 20 ms |

**Robustez**: una corrida INST sin errores de consola; martillar "1" produce exactamente un `responder`; retomar en cada
tipo de parada no repite un momento.

**Accesibilidad**: contraste de placas y de píxeles en verde; una carrera solo con teclado; una con movimiento reducido.

**El cierre** (U4): la Definición de terminado de `CLAUDE.md` entera, y el usuario juega antes del merge (C2).

---

## 13. Riesgos

| Riesgo | Mitigación |
|---|---|
| A termina pareciéndose a lo de hoy (mismo concepto, mismo nombre de pieza) | brief de luz, arte y tipografía; la lista de prohibidos como guard; tokens textuales de la ganadora; composiciones en los mismos guardados; la regla f2 reescrita primero; la reacción en frío del usuario |
| Texto ilegible sobre arte con los checks en verde | la regla de la placa + el check de píxeles + revisión de capturas |
| View Transitions rompe teclado, retomar o el recorrido | el envoltorio de §9.4, transiciones solo en 3 lugares, corrida INST y prueba de martilleo |
| Costo de GPU y batería | presupuestos, quieto en las paradas, degradación automática, dos pasadas del recorrido |
| El ambiente o la era adelantan el resultado (leen `store`) | `era.js` puro sobre la `vista` y el check de `data-era` quieto en el relato |
| Atajos del prototipo que se cuelan a producción | guards sobre la vitrina, la API fija del ambiente, renderers reescritos |
| Los takeovers alargan la partida o se repiten al retomar | topes, salto, `momentosVistos`, espejo de `simulate.js` |
| Presupuestos (fuentes, 4 líneas de `index.html`, checks de texto literal) | presupuesto de fuentes, un solo `<link>`, las regex actualizadas en el mismo commit |
| El usuario elige una mezcla | se traduce al idioma de la ganadora en la ronda 2 |
| Data Dragon caído o sin red | el arte se degrada a nada; tiles con iniciales; PNG sin splash |

---

## 14. Fuera de alcance

Cambios de comportamiento o de balance del motor (salvo U-m, si se aprueba) · contenido nuevo o reescribir el texto de
los eventos · las mecánicas internas de los 10 minijuegos · los colores reales de las orgs y sus escudos (licencias) ·
física de página y dar vuelta la carta · layouts de celular a medida (el celular es el mismo sistema) · tablas de
almanaque en el escenario · dependencias, frameworks, bundler · el host (P.6, §15).

---

## 15. Después: publicar

Con el OK del usuario (es hacia afuera): P.6 (el host: Cloudflare Pages o Netlify, conectar la cuenta es del usuario) y
P.8 (verificar en la URL publicada). Para el portfolio: el README con un GIF de 20-30 s (la intro, una decisión, un
título, la carta), un og-image nuevo sacado de la carta, y una sección "cómo está hecho" (motor determinista, cero
dependencias, WebGL a mano). Idea anotada, no planificada: un **modo tráiler** ("mirá una carrera en 90 segundos") para
el visitante que no va a jugar 30 minutos.

---

## Deuda nueva (D102 en adelante)

*(vacía: se llena con lo que se descubra midiendo)*

---

## Apéndice A — los briefs de dirección (ronda 1)

Común a las tres: vara "sitio del día" de Awwwards; la prueba de la captura (§3.1); ≤ 2 niveles de contenedor; leer
menos (§7); números con referente; texto sobre arte sobre placa; la lista de prohibidos (§5.9); la rúbrica (§3.3); datos
solo de `vitrina/datos/muestras.json`; tokens con los nombres de producción en `#rrggbb`; cero `Math.random`; camino
quieto en CSS y JS; respetar `data-pieza`, `data-atajo`, `data-foco` y los ids que lee el recorrido; el contrato del
ambiente de `vitrina/comun/`.

**A · LUZ** — ver §5.1-§5.9.

**B · NOCTURNO** — *"Tu carrera, impresa de noche."* Palabras: editorial, gráfico, ácido, tipográfico, con oficio.
Vocabulario: Bloomberg Businessweek, tapas de revistas deportivas, pósters suizos, The Players' Tribune. Paleta: negro
`#0B0B0C`, tinta `#ECE8E1`, una tinta ácida `#C8FF2E`, papel solo en las tapas (`#F1ECE2` con tinta `#121212`). Tipos:
Archivo variable (ancho 62-125: titulares condensados extremos, números anchos), IBM Plex Mono (folios y datos), Fraunces
itálica solo para la cita destacada. Grilla editorial de 12 columnas con filetes y folios ("UN SPLIT MÁS · EDICIÓN 2037 ·
SPLIT 2 · P. 14"), márgenes de 120 px. El splash en halftone por shader. Movimiento: revelados de tinta, máquina de
escribir para "ÚLTIMO MOMENTO", el "¡EXTRA!" girando (≤ 900 ms); el resto, quieto. Pantallas: inicio (la portada del Nº 1,
el perfil como frase para completar, la hoja de contactos con los mains marcados) · decisión (el split con capitular y la
cita destacada a la izquierda; "LA DECISIÓN" con opciones numeradas, glifos al margen y el inspector como nota al margen a
la derecha) · cumbre (el "¡EXTRA! ¡CAMPEONES!" en papel que desemboca en la tapa de colección) · tira de eras (cambian la
tinta y la tapa) · celular.

**C · PANTALLAS** — *"Todo pasa en tus pantallas."* Palabras: íntimo, auténtico, con humor; futurista porque los
aparatos envejecen con el calendario. Vocabulario: Emily is Away, Hypnospace Outlaw, Her Story, A Normal Lost Phone, el
pulido de un sistema operativo actual. Por era: pieza (wallpaper = tu main en splash, ventanas de vidrio `#15171C`, acento
`#7C5CFF`), academia y escenario (la estación del equipo), mundial (el stream `#0E0E10`), leyenda (la PC que se apaga).
Tipos: Geist, Geist Mono, Mona Sans ancha para los momentos. Mapa: ventana enfocada = escenario, widget = acompañante,
dock = cuartos, teléfono = celular. Pantallas: inicio (arranque → login con nombre de invocador y selector de servidor →
la ventana de selección) · decisión (la ventana de la decisión al frente, el cliente de ranked como widget, la
notificación con lo último que pasó; elegir → el resultado como notificación del sistema; el plan amateur como planilla)
· cumbre (el stream a pantalla completa con el chat cayendo y "CAMPEONES", que desemboca en el salón de la fama con la
carta) · tira de eras (el mismo escritorio de 2026 a 2040) · celular (el teléfono).
