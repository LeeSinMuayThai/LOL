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
| **U0 · ronda 1b** | A y C ampliadas: `partido` (serie con Fearless, Swiss 2-2) y `mercado` (ofertas + firma); A profundiza el aura y los fondos animados, C lo clásico tipo cliente (§4.3) | ✅ 2026-10-09 (2 × Opus xhigh; merges `6f145e1`, `3c790c2`; referencias en `vitrina/referencia/ronda-1b/`) |
| **Compuerta 1 (final)** | El usuario elige A, C o una mezcla | ✅ 2026-10-09: una mezcla: serie y Swiss de C, mercado de A, y "que sigan una misma línea" (§4.4) |
| **U0 · fusión** | Una sola dirección: la interfaz de C dentro del mundo de A, con 7 reglas de una misma línea (§4.5) | ✅ 2026-10-09 (1 × Opus xhigh, `f35fcb4`; merge `d7622e9`; referencias en `vitrina/referencia/fusion/`) |
| **Compuerta 1b** | El usuario mira la fusión | 🔶 2026-10-09: "está bien", pero el duotono "blanco y negro + violeta" de los campeones se vuelve repetitivo después del inicio; pidió tres variantes (§4.6) |
| **U0 · intensidad** | Una página con tres variantes de color del campeón (a color, mitad, fondo en duotono y retratos a color) y el espacio "un poco" menos (§4.6) | ✅ 2026-10-09 (`899ed27`, merge `81993d4`); el usuario respondió con capturas (§4.7) |
| **U0 · opciones** | La serie con la receta de color y el fondo nítido; tres opciones por pantalla para el partido (la competición), la decisión y el mercado (logos reales) (§4.7) | 🔶 en curso |
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

**Resultado (2026-10-09).** Las dos cumplieron todo el orden de prioridades: 102 capturas cada una, 0 errores, contraste
medido por píxeles.

**A** (`0726c8d`):
- El **aura** es un solo mecanismo (`js/aura.js`, por `data-campeon`) en la selección, los mains, la pared de Fearless,
  los picks de cada mapa, los quemados, el campeón del split y el plantel del título. Entra a los 120 ms, cruza en
  750 ms y no salta si llega otro campeón mientras cruza.
- El **splash vivo** sale del shader (profundidad 2,5D, parallax, deriva, flujo en las luces, barrido de luz cada
  11 s, polvo y brasas por era) y respira en las paradas.
- Transiciones de luz entre pantallas.
- CommunityDragon: solo 12 de 2167 skins tienen splash animado (ninguna base, ninguna de esta carrera, ~2,8 MB cada
  una). Descartado: el splash vivo procedural es el camino.
- Las pantallas nuevas:
  - la serie con la pared de retratos que se apaga al quemarse y la serie jugada mapa a mapa;
  - el replan con la luz que se quiebra;
  - el Swiss 2-2 en oro, que termina en DERROTA → AFUERA, con el récord rodando a 2-3;
  - el mercado como tabla de ofertas;
  - la firma de LOUD como takeover: la luz de la pieza se abre en la de la academia y el handle se traza en luz.

**C** (`ee7e33e`):
- El **hover-pick del cliente** (`js/campeones.js`): apuntar un campeón cruza su splash y muestra su nombre en la
  ventana Cliente, como el champ select, sin aura de ambiente. Además, el feedback clásico: una barra de luz en la
  opción, teclas que se hunden.
- La serie es **un draft**:
  - los dos equipos a los costados con 5 ranuras y la p de cada mapa contra el 50%;
  - los quemados como baneados;
  - un **post-game** VICTORIA/DERROTA con emblema propio en cada mapa ("tenías 78%").
- El replan entra como notificación.
- El Swiss va en la **Tribuna**, con la banda VIDA O MUERTE y el chat nervioso. Termina en "Fin de la transmisión", con
  las dos p (42% con la charla, 19% sin) y lo que quedó.
- El mercado es la **bandeja de contratos**: el color del club solo en su ícono, Enter firma.
- La **firma se dibuja**, y la PC de la pieza se cierra y queda la del equipo.

**Lo que ninguna resolvió del todo** (queda para la ronda 2 de la ganadora):
- A: la columna derecha de la serie compite un poco con la decisión, y un cuadro del odómetro de la firma muestra un
  "." suelto.
- C: el toast del replan tapa la cabecera del rival ~3 s, y entre mapa y mapa asoma el hover-pick.

**Proceso.**
- Dos Opus xhigh nuevos en paralelo, uno por dirección; leen el `README.md` y el código de su dirección en vez de
  continuar a los de la ronda 1, que tienen contextos de ~500K.

### 4.4 Compuerta 1, segunda vuelta: lo que dijo el usuario sobre A y C ampliadas (2026-10-09, textual)

Recorrió en orden los enlaces directos que se le pasaron: la serie, el Swiss, el mercado y la firma.

> En el, en el primero me gusta más el del C. Un toque más. El A está bueno, pero el C es más de juego, siento yo. O
> sea, el A está bueno, pero el C me gusta un poquitito más. En el segundo... En el segundo... Me gusta más el de A. En
> el tercero... Me gusta más el de A. pero noto que aveces los diseños no siguen una misma linea no se, Para que sepas
> las combinaciones que tenés que hacer y eso, me gusta más el de C en el primero. Por un poquito. En el segundo me
> gusta más el de C porque siento que es más de juego. El de A está bueno, pero el de C tiene mejor interfaz. Y en el
> tercero también creo que se ve un poco mejor el de... El de A y aparte tiene mejor interfaz. En el segundo la
> interfaz del del A También está buena, pero el del C es un poquito mejor. O sea, tampoco... Tampoco es un re cambio.

Lo que se lee:
- **La serie: C, por poco** ("es más de juego").
- **El Swiss: C, por poco.** En la primera vuelta dijo A y en la segunda C ("tiene mejor interfaz"); vale la segunda,
  que es la que justificó.
- **El mercado: A** ("se ve un poco mejor y aparte tiene mejor interfaz").
- **La firma:** no la comparó.
- **Las diferencias son chicas** ("tampoco es un re cambio").
- **El pedido de fondo: "los diseños no siguen una misma línea".** La respuesta no puede ser un collage de pantallas de
  A y de C, porque eso empeoraría justo lo que marcó. Tiene que ser **una dirección nueva y única** que combine las dos
  según sus preferencias, con un solo sistema de diseño (§4.5).
- Esto se suma a la primera vuelta (§4.2): de A le encantó el aura y las animaciones; de C, que es "clásico, como del
  LoL, lo más fácil de entender".

### 4.5 La fusión: la interfaz de C dentro del mundo de A (el plan, escrito antes de implementarlo)

**La idea en una línea:** *el cliente de tu carrera, iluminado.* Hay dos capas, y cada una viene de una sola dirección:
- **El mundo, de A.** El ambiente WebGL con los 5 equipos de luz por era, el splash vivo, el **aura** (apuntar un
  campeón lleva la luz a él), las transiciones de luz entre pantallas, los takeovers (título, firma, AFUERA) y la carta
  holográfica.
- **La interfaz, de C.** Paneles claros "de cliente", la jerarquía de lectura, el draft de la serie con los quemados
  como baneados, el post-game de cada mapa, la Tribuna con el chat para los partidos internacionales, la planilla, el
  feedback clásico de cliente (la barra en la opción apuntada, la tecla que se hunde) y la barra de cuartos abajo.

**Las reglas de "una misma línea"** (se miden en la revisión y después son guards de producción):
1. **Una sola superficie.** Un tipo de panel (fondo oscuro translúcido de token, sin desenfoque sobre el canvas, filete
   de 1 px teñido por la luz de la era), una escala de radios (panel, control, chip) y ≤ 2 niveles de contenedor.
2. **Una sola jerarquía tipográfica.**
   - La interfaz habla como C: Geist en el cuerpo; Mona Sans ancha y en minúsculas en los títulos de pantalla (≤ 56 px
     en las paradas); Geist Mono 11-13 px en los rótulos.
   - Los momentos gritan como A: Mona Sans condensada en mayúsculas, 96-214 px, solo en takeovers y cierres.
   - Los números: Mona Sans expandida 900, tabulares.
3. **Un solo color.** Tintas, semánticos (`--up`/`--down`/`--warn`) y oro, de A. **El único acento es la luz de la era**:
   el violeta de C desaparece. El color de una org vive solo en su chip.
4. **Las eras cambian la luz y el arte, nunca la interfaz.** Se acaba la ventana clara de 2028 y el cambio de chrome por
   era de C: es lo que más rompe la línea. El paso del tiempo lo cuentan la luz, el arte y los datos.
5. **Una sola gramática de movimiento.** La de A: expo-out 180-320 ms, el orden luz → rótulo → título → opciones,
   quieto en las paradas. Encima va el micro-feedback de cliente de C.
6. **El hover, igual en todos lados.** Todo lo que representa a un campeón dispara el aura. Todo lo interactivo tiene el
   feedback de cliente.
7. **Un solo sistema de momentos.** El takeover de A para título, firma, AFUERA y Mundial. La Tribuna de C (el "video"
   es el splash vivo en la luz de la era) para los partidos internacionales.

**Pantalla por pantalla** (de dónde sale cada una; todas reescritas con las reglas de arriba):

| Pantalla | Base | Qué se suma |
|---|---|---|
| Inicio | A (la selección con el aura, la intro) | los paneles y controles de C (servidor, perfil, roles) |
| Decisión (evento, plan amateur) | la estructura de C (un panel con opciones + inspector, el widget de contexto, la planilla) | la luz y el arte de A, con la cara del campeón libre |
| Serie y replan | **C** (el draft, los quemados como baneados, el post-game por mapa) | el aura en cada retrato y pick, y la luz que cae en DERROTA o sube en VICTORIA |
| Swiss 2-2 | **C** (la Tribuna, VIDA O MUERTE, el chat, "Fin de la transmisión") | el video del stream es el splash vivo en la luz del Mundial; AFUERA como takeover de A |
| Mercado | **A** (la tabla de ofertas sobre la luz de la academia) | el panel de lectura de una oferta por vez de C, y Enter firma |
| Firma | A (la luz de la pieza se abre en la de la academia, el handle trazado en luz) | — |
| Cumbre: título | A (el takeover CAMPEONES) | — |
| Cumbre: final | A (la carta holográfica + la trayectoria) | la vitrina de trofeos de `carrera.log` de C, como lista |
| Eras | A (la misma pantalla en las 5 luces) | — |
| Celular | la barra de cuartos de C y las hojas de A | — |

**Proceso.**
- Un solo Opus xhigh construye la fusión en una carpeta nueva, `vitrina/fusion/`, partiendo del código de A y de C.
  Uno solo, porque el requisito central es la coherencia, y dos workers en paralelo la romperían.
- A y C quedan como están, como referencia.
- Una ronda de observaciones del supervisor, con la rúbrica + las 7 reglas de arriba.
- Se sirve en el 8095 y el usuario la mira. Si la aprueba, **la fusión es la dirección elegida**: §5 se reescribe con
  sus tokens y la producción la traslada textual.

**Resultado (2026-10-09, `f35fcb4`).** Cubre el catálogo entero (inicio, evento, plan, serie, replan, Swiss, mercado,
firma, título, final, eras, celular), con el resultado real al elegir en todas las paradas. Parte del código de A.

Qué se armó:
- `js/partido.js` reescribe el draft y la Tribuna de C sobre los helpers de A. El centro del draft queda abierto al
  mundo. El aura responde en cada libre, pick y quemado, y el nombre del campeón sigue a la luz (`aura.alCambiar`). Cada
  mapa se juega como pantalla de carga en duotono → VICTORIA/DERROTA. En el Swiss, el video es el splash vivo en oro y
  AFUERA llega como takeover.
- La decisión es el panel de C anclado abajo, con la cara del campeón libre.
- El mercado es la tabla de A con el panel de lectura de C.
- La final suma la vitrina de trofeos de C.

Verificación:
- Una sola superficie, una barra arriba y una abajo en todas las pantallas de cliente, títulos en Mona ancha minúscula,
  la luz de la era como único acento, ninguna hoja de interfaz que cambie por era.
- La hoja de contactos de las 10 pantallas (`vitrina/referencia/fusion/fusion-hoja-de-contactos.jpg`) lo confirma.
- 102 capturas, 0 errores.
- Contraste medido: 1911 textos en 30 casos, 0 debajo de 4,5:1.

Pendiente de pulido (para la ronda con lo que diga el usuario):
- el draft está denso;
- queda una fila "Tu plan · 91%" después del resultado de la serie;
- el nombre del campeón en el draft habla con la voz de título, y el champ select real lo grita;
- las transiciones dentro de la página se revisaron cuadro a cuadro, nadie las vio en vivo.
- Mismas reglas de `comun.md`, una ronda de observaciones del supervisor, y la vitrina se vuelve a servir en el 8095.
- **Compuerta 1 (final):** el usuario elige A, C o una mezcla. Después, la ronda 2 de la ganadora es solo lo que falte
  (trayectoria + PNG y los celulares de la serie y el mercado), y se cierra §5.

### 4.6 Compuerta 1b: lo que dijo el usuario sobre la fusión (2026-10-09, textual), y las tres intensidades

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

Lo que se lee:
- **La fusión está bien** ("está bien, pero…"), y la interfaz de C en la serie sigue siendo la elegida.
- **Lo que pesa es el mundo.** Hoy el splash del campeón ocupa toda la pantalla, en la luz de la era, en todas las
  pantallas y todo el tiempo. En `vitrina/referencia/fusion/fusion-serie.jpg` y `fusion-decision-evento.jpg`, el Sylas en
  violeta es lo más grande de la pantalla.
- **En el inicio está bien al 100%**: al arrancar la carrera y elegir los mains. Ahí no se toca.
- **Después: la esencia, "no tan heavy".** Se queda la luz de la era. Los campeones, "quizás sí un poco, pero no tanto",
  y "que no estén todo el tiempo".
- **Pide ver variantes antes de decidir**: una página con tres, mostrando la serie "o eso".

**Las tres variantes.** Cada una baja el campeón por un eje distinto, para que la diferencia se vea de un vistazo:
1. **Tenue: el mismo mundo, a bajo volumen.** El campeón sigue de fondo siempre, pero a un tercio de presencia:
   - fundido en la luz de la era, con más bruma y viñeta y menos contraste;
   - sin la cara en primer plano;
   - el aura sigue cruzando de campeón, igual de tenue.
   - La pantalla se lee primero como luz y después como campeón.
2. **De paso: el campeón aparece cuando importa y se va.** El fondo de reposo es solo la luz de la era (haces, bruma,
   polvo). El campeón entra:
   - con el aura, al apuntar un campeón;
   - en la pantalla de carga de cada mapa y en VICTORIA/DERROTA;
   - al elegir.
   - Después se funde de vuelta a la luz en ~2 s.
   - En la decisión y el mercado no hay campeón salvo con el hover.
3. **En su lugar: el campeón vive en un lugar fijo de la interfaz, como en el cliente.** El fondo de pantalla completa
   es solo luz. El campeón aparece contenido y recortado en lugares fijos:
   - el escenario del draft (la ventana del medio);
   - la cara en el panel "vos" de la decisión;
   - los retratos y las ranuras.
   - El aura cambia ese lugar y tiñe la luz, pero no inunda la pantalla.

**Lo mismo en las tres:**
- **la interfaz no cambia**: es la misma fusión, solo cambia el mundo;
- **el inicio queda al 100%**: es la referencia de "así arranca";
- **los takeovers (CAMPEONES, la firma, AFUERA) quedan al 100%**, porque son los momentos. Es una decisión del
  supervisor; si el usuario los quiere también atenuados, se cambia;
- la luz de la era y su cambio entre eras siguen;
- el contraste sigue en ≥ 4,5:1.

**Cómo se construye:**
- **Una perilla en la fusión.** `fondo=pleno|tenue|paso|lugar` en el hash. Por defecto queda `pleno`, que es la de hoy.
  El panel de la vitrina tiene el selector.
- **Una página nueva, `vitrina/fusion/variantes.html`**, con las tres variantes lado a lado sobre la misma pantalla:
  - pestañas para la serie, el Swiss, la decisión y el mercado;
  - el inicio al 100% como referencia;
  - clic (o 1-3) en una variante para abrirla grande e interactiva;
  - un enlace desde la sección de la fusión del índice.
- **Un solo worker**, Opus xhigh, en `vitrina/fusion/**` (más el enlace del índice).
- **El pulido pendiente de §4.5 espera** a que el usuario elija la intensidad, y entra en la misma ronda.

**Primera versión (`abb6734`).**
- **La perilla `fondo`** vive en `js/fondo.js`.
- **Hojas de contactos** de 4 pantallas × 4 variantes.
- **Lo que mostraron las hojas:** en la serie, `lugar` casi no se distinguía de `pleno`, porque el campeón ya vivía en el
  escenario. Se pidió una corrección.

**La aclaración del usuario (2026-10-09, textual), que cambia el eje:**

> Yo no iba tanto al espacio, aunque sí un poco, pero, pero un poco nomás. Me refería, por ejemplo, más al, al blanco y
> negro, violeta ese que tienen, que a veces, o sea, estaba bien para el inicio eso, pero si estaba siempre iba a ser
> como un estilo repetitivo. Que estaba bueno, que esté presente, pero no tan fuerte siempre. No sé si llegaste a
> entender eso.

**Lo que se lee:**
- **Lo repetitivo es el color, no el tamaño.** Es el **duotono de la era**, que deja a cada campeón en "blanco y negro +
  violeta". Está en el fondo, en el escenario, en los libres, ranuras y picks, en las cartas de carga y en el video de la
  Tribuna.
- **En el inicio está bien.**
- **Después tiene que seguir presente, pero no tan fuerte siempre.**
- **El espacio baja "un poco nomás".**

**Las tres variantes, rehechas sobre el color.** Es una perilla nueva, `color=duotono|real|mitad|capas`, en un solo
lugar, como `fondo.js`.
- **`duotono`** es la de hoy. Es el valor por defecto y queda siempre en el inicio y en los takeovers.
- **1 · A color (`real`).** Después del inicio, todo campeón va con sus colores reales. La era queda en la luz (haces,
  bruma, polvo, filete) y en un lavado leve (≤ ~20%) sobre el arte de fondo, para integrarlo a la escena.
- **2 · Mitad (`mitad`).** Una mezcla de ~50% entre el color real y el duotono, en todos lados: los colores del campeón
  se reconocen, desaturados y llevados hacia la paleta de la era.
- **3 · Fondo en duotono, retratos a color (`capas`).**
  - El fondo de pantalla completa conserva el duotono, más suave.
  - Todo campeón que es pieza de interfaz (retratos, libres, picks, ranuras, quemados, cartas de carga, la banda de "vos")
    va a color, como en el cliente del LoL.

**El espacio, "un poco nomás":**
- Un nivel nuevo, `fondo=menos`: la composición de `pleno` con el campeón de fondo a ~70% y sin derrame fuera de los
  paneles.
- Las tres variantes de color se muestran con `fondo=menos`.
- Las variantes de espacio de la primera versión (tenue, de paso, en su lugar) quedan como selector secundario en el
  modo grande de `variantes.html`.

**Resultado (2026-10-09, `899ed27`, merge `81993d4`).**
- **La política vive en dos tablas.** `js/color.js` tiene la de color y `js/fondo.js` la de espacio, que suma `menos`.
  Las leen el ambiente, el aura y `partido.js`, que solo declara "momento" y "takeover".
- **Sin perillas, la fusión no cambia.** La diferencia es de 6 a 9 niveles, lo mismo que da el grano del reloj del
  código contra sí mismo.
- **`variantes.html`** muestra tres iframes vivos lado a lado, con pestañas para la serie, el Swiss, la decisión y el
  mercado. El modo grande se cambia con 1-3 (0 vuelve a "como hoy") y tiene el espacio como selector secundario. Rinde
  a 30 fps por mundo; con una variante abierta en grande, las otras dos se pausan.
- **Contraste:** 2565 textos, 0 debajo de 4,5:1 (el peor da 5,77). `verificar.mjs` está en verde y el smoke en el 8095
  no da errores.
- **Lo que se ve:**
  - con Sylas (la serie y la decisión), `real` y `mitad` se parecen al duotono, porque su splash ya es pálido y violáceo;
    la diferencia está en los retratos y en el aura sobre otros campeones;
  - en el Swiss, el mercado y las cartas de carga, las tres se distinguen de un vistazo;
  - el Yone rojo del mercado en `real` es lo que más "pegado" queda.
- **Lo que falta:**
  - la carta de la final sigue en el duotono de su rareza;
  - sin WebGL, `lugar` muestra solo luz.

### 4.7 Compuerta 1b, tercera vuelta: color fino, la competición, y que la pantalla cuente lo que pasa (2026-10-09, textual)

Mandó cuatro capturas de `variantes.html`, en el orden de las pestañas: la serie, el Swiss, la decisión y el mercado.
La cuarta se adjuntó repetida: llegó otra vez la de la decisión. Por el orden y por "los logos de los equipos", el
comentario 4 es del mercado.

> los campeones ahi estan bien que sean medio bitono y el fondo tambien, pero yo intentaria que el fondo tenga mas
> calidad y que los campeones tengan un 15% mas de color mientras que el fondo un 10% mas, eso en la primera foto […] la
> imagen 2 esta bien pero deberia ser un 20% menos amarilla y mas estetica de la competicion (LEC WORLDS MSI LO QUE SE
> ESTE JUGANDO) […] despues la imagen 3 me gusta como esta diseñada pero siento que es muy aburrida, interactua poco con
> el fondo, y principalmente, representa poco lo que esta pasando, o no se si eso pero es un poco "simple" "poco
> original" "aburrida" "sin escencia del lol" […] y la imagen 4 siento que le falta un poco representar lo que esta
> pasando, falta ese aspecto de peso de decision importante o formal, y tambien se deberian añadir los logos actuales de
> los equipos etc, pensalo bien y empeza a buildear directo las preview con opciones

**Lo que se lee, pantalla por pantalla:**
- **Serie: la receta de color, con números.**
  - La base es `mitad`. Los campeones (retratos, libres, picks) suben un 15% de color, a ~65% color / 35% duotono.
  - El campeón de fondo sube un 10%, a ~60/40.
  - **El fondo tiene que tener "más calidad".** Hoy el splash sale blando y con bordes pixelados (el rosa en la cara de
    Sylas), porque el shader pinta a escala ≤ 0,5 y el "vivo" desplaza la imagen. Tiene que verse nítido, como el splash
    del champ select.
- **Swiss: un 20% menos amarillo, y con la estética de la competición.**
  - Hoy el Mundial es "oro" genérico de la era. Cada pantalla de partido tiene que verse como **lo que se está jugando**:
    Worlds, MSI, LEC, LCK, CBLOL, con su identidad, su logo y su paleta.
  - Es un eje nuevo: **la identidad de la competición** se monta sobre la luz de la era en las pantallas de partido.
- **Decisión: el diseño gusta; el problema es que es aburrida.** Interactúa poco con el fondo, no cuenta lo que está
  pasando, y le falta originalidad y "esencia del LoL".
  - El ejemplo es "Un equipo coreano te quiere en su cupo de import". El fondo es tu campeón y nada más: Corea, el
    equipo y la LCK no aparecen.
- **Mercado: no cuenta lo que pasa y no tiene peso formal.** Firmar con un equipo tiene que sentirse una decisión
  importante. Faltan **los logos actuales de los equipos**.
- **"Empezá a buildear directo las preview con opciones"**: varias opciones por pantalla, para elegir mirando.

**Decisiones del supervisor:**
- **Los logos reales de los equipos y de las ligas entran.** Esto revierte el recorte "colores reales de org" de §14, por
  pedido del usuario.
  - En la vitrina se enlazan desde el CDN oficial (`<img>`, nunca en un canvas ni versionados). Si no cargan, queda el
    chip de hoy.
  - Las orgs inventadas de la simulación llevan un escudo-monograma del sistema.
  - Antes de publicar (§15) se revisa la política de uso.
- **Rige la regla 3 de §4.5, con una excepción.** El color de una org entra solo con su logo, en el mercado y en el
  marcador.

**Las opciones.** Hay una perilla nueva, `op=<id>`, en el hash de la fusión. Cada pantalla interpreta sus ids y sin
`op` es la de hoy. La serie lleva la receta de color en todas sus opciones.

| Pantalla | Opción | Qué es |
|---|---|---|
| Serie y Swiss | `luz` · **La luz del evento** | la luz del mundo toma la paleta oficial de la competición (sin el oro genérico); el logo del torneo y los de los equipos en el marcador |
| | `transmision` · **La transmisión oficial** | la Tribuna y el draft vestidos como la transmisión de esa competición: el marcador con logos, las placas inferiores, una cortina de entrada "WORLDS 2033 · SWISS · RONDA 5" |
| | `escenario` · **El escenario** | el fondo es la arena del evento (luces de escenario en la paleta del torneo, la pantalla gigante con el campeón, siluetas de público); la interfaz flota adelante |
| Decisión | `escena` · **La escena** | el fondo cuenta la situación: la org que te llama con su logo, la región (Seúl, la LCK) y el arco de tu liga a la de ellos. Al apuntar una opción, la escena cruza a ese camino (el "aura" de las decisiones) |
| | `cliente` · **El momento del cliente** | la decisión bisagra llega como una invitación del cliente del LoL (el logo del equipo, "te invita", el anillo de Aceptar con su reloj) y se abre en el panel; vocabulario hextech solo en la bisagra |
| | `bisagra` · **El peso** | la decisión grande como capítulo: el mundo se oscurece, rótulo de capítulo, lo que arriesgás antes/después y los dos caminos abiertos en la luz, a izquierda y derecha; apuntar uno tira la luz a su lado |
| Mercado | `mesa` · **La mesa de firma** | cada oferta es un contrato: el logo grande de la org, la liga, los términos y la línea de firma con tipografía formal. Enter firma y la firma se dibuja |
| | `anuncio` · **El anuncio** | cada oferta se previsualiza como la placa oficial de fichaje que publicaría la org ("WELCOME Elurah89", con su logo, sus colores y tu main). Elegir la publica |
| | `orgs` · **Te llaman** | los logos de las orgs flotan en la luz alrededor tuyo, con tamaño por sueldo o interés. Apuntar una lleva el mundo a sus colores (el aura de las orgs) y la tabla queda abajo |

**Cómo se construye:**
- **Tres Opus xhigh en paralelo**, en ramas separadas sobre `vitrina/fusion/`:
  - **partido**: el color, la calidad del fondo, la competición y sus 3 opciones;
  - **decisión**: sus 3 opciones;
  - **mercado**: sus 3 opciones y `js/logos.js`, el mapa de logos de equipos.
- **Cada worker toca solo sus archivos.**
  - Los tokens van en su bloque marcado de `tokens.css`.
  - La plomería de `op` ya está en `main.js` (la hizo el supervisor).
- **Después del merge**, el supervisor arma `opciones.html`, una página con pestañas por pantalla y las opciones lado a
  lado, con "como hoy" para comparar. También conecta los logos de equipo al marcador de la serie y del Swiss.

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
