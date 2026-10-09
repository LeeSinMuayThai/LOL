# La fusión — *"El cliente de tu carrera, iluminado."*

**El concepto, en tres líneas.** Dos capas, y cada una viene de una sola dirección: **el mundo es de A** (el ambiente
WebGL con los 5 equipos de luz por era, el splash vivo, el aura, las transiciones de luz, los takeovers y la carta) y **la
interfaz es de C** (el panel de cliente, la jerarquía de lectura, el draft, la Tribuna, la planilla, el feedback de cliente,
la barra de cuartos). La interfaz es una sola y no cambia con la era: lo que cambia es la luz que le pega.

Servir: `node vitrina/servir.mjs --puerto 8114` → `http://127.0.0.1:8114/fusion/index.html`.
Capturas: `node vitrina/comun/capturar.mjs --puerto 8114 --direccion fusion` (quedan en `capturas/`, no se versionan).

## Las 7 reglas de "una misma línea" (PLANUI §4.5) y cómo se cumplen

| Regla | Cómo |
|---|---|
| 1. Una sola superficie | Un panel: `--panel` (oscuro translúcido, **sin** `backdrop-filter`), filete de 1 px `--filete` = la luz de la era mezclada con la línea, y un canto de luz arriba. Adentro solo hay **secciones separadas por líneas** (y la sección honda `--panel-hondo`): nunca caja → caja → caja. Radios: `--r-panel` 10 · `--r-control` 5 · `--r-chip` pastilla (la carta, que es un objeto y no interfaz, tiene el suyo). Los mismos selectores (`.parada-col`, `.contexto`, `.panel`) visten la decisión, el plan, el mercado, el panel "vos", el inicio y la vitrina de trofeos; el draft y la Tribuna son el mismo panel con una **ventana** sin fondo en el medio (el escenario, el player), por donde se ve el mundo. |
| 2. Una sola jerarquía tipográfica | La interfaz habla como C: **Geist** en el cuerpo (16/18), **Mona Sans ancha (125 %) 800 en minúsculas** en los títulos de pantalla (`--t-titulo` 46, `--t-titulo-s` 34), **Geist Mono 11-12,5** en los rótulos. Los momentos gritan como A: **Mona Sans condensada (75 %) 900 en mayúsculas, 96-214 px**, solo en takeovers y cierres (UN SPLIT MÁS, CAMPEONES, LOUD, AFUERA, LEYENDA, VICTORIA/DERROTA de cada mapa, QUEMADO). Los números: **Mona Sans expandida 900, tabulares** (`.num`, `--t-num*`). |
| 3. Un solo color | Tintas, semánticos (`--up`/`--down`/`--warn`) y oro, de A. **El único acento es `--luz`** (y sus derivados `--luz-texto`, `--luz-suave`, `--luz-tenue`, `--filete`): la barra de la opción apuntada, la tecla encendida, el cuarto activo, el decisivo de la serie, la banda VIDA O MUERTE, los nombres del chat. El violeta de C desapareció. El color de un club vive solo en su chip (`.mk-chip`). |
| 4. Las eras cambian la luz y el arte, nunca la interfaz | No hay ningún selector `[data-era]` en las hojas de interfaz (`base`, `decision`, `partido`, `mercado`, `inicio`, `cumbre`): solo `tokens.css` elige `--luz`/`--contra` por era (y el respaldo del ambiente y las miniaturas de `eras`, que son luz, no interfaz). Se acabaron la ventana clara de 2028 y el cromo por era de C. La pantalla `eras` lo demuestra: la misma parada, cinco luces. |
| 5. Una sola gramática de movimiento | La de A: expo-out (`--expo`), 180-320 ms, el orden luz → rótulo → título (por líneas, con máscara) → opciones, y quieto en las paradas (el ambiente se aquieta). Encima, el micro-feedback de cliente de C: la barra de luz que crece al costado de la opción apuntada, la tecla que se hunde, los botones que se aprietan, los retratos que suben. |
| 6. El hover, igual en todos lados | Todo lo que representa a un campeón lleva `data-campeon` y dispara **el aura** (`js/aura.js`): la grilla y las ranuras del inicio, la placa "Continuar", tus libres del draft, los picks de cada ranura (tuyos y del rival), los quemados, los mapas del final de la serie, el campeón del split del panel "vos". En el draft, el nombre del escenario cambia con la luz (`aura.alCambiar`). Todo lo interactivo tiene el feedback de cliente. |
| 7. Un solo sistema de momentos | El takeover de A para el título, la firma y AFUERA (la luz cae, la palabra entra despacio). La Tribuna de C para los partidos internacionales, con el splash vivo en la luz del Mundial como "video". |

## Tokens (`estilos/tokens.css`, el único archivo con colores y la única escala)

| Token | Valor | Uso |
|---|---|---|
| `--bg-void` / `--bg-surface` / `--bg-raised` | `#04050a` / `#0a0d16` / `#151b2b` | el vacío, la noche, lo apretado |
| `--ink` / `--ink-dim` / `--ink-mute` | `#f4f6fb` / `#a9b3c7` / `#8590a6` | tintas (la `mute` subió de A para medir ≥ 4,5:1 sobre el panel) |
| `--up` / `--down` / `--warn` / `--gold` | `#3df2a0` / `#ff5468` / `#ffb547` / `#ffd27a` | sube, baja, riesgo, logro |
| `--luz-<era>` / `--contra-<era>` | pieza `#2f6bff`/`#ffb45a` · academia `#43e6c3`/`#e8f6ff` · escenario `#7fa8ff`/`#ff3da8` · mundial `#ffc94d`/`#fff3d6` · leyenda `#ff9a5a`/`#ff4f7a` | los equipos de luz; `html[data-era]` elige `--luz` y `--contra` |
| `--luz-texto` · `--luz-suave` · `--luz-tenue` · `--luz-fuerte` | `color-mix` de `--luz` | el único acento: texto (≥ 4,5:1), lavados, halos |
| `--panel` · `--panel-hondo` · `--panel-claro` | `#070a12e8` · `#04060cf2` · `#0d1220d9` | **la** superficie y su sección honda |
| `--filete` · `--filete-fuerte` | `color-mix(--luz 34 %, --linea)` · `--luz 70 %` | el borde de 1 px del panel y su canto, teñidos por la era |
| `--linea` / `--linea-fuerte` | `#f4f6fb1a` / `#f4f6fb38` | separadores de sección y bordes de control |
| `--velo-lectura/medio/suave/nada` | `#04050a` f0/a8/66/00 | velos (leves: la lectura la garantiza el panel) |
| `--org-*`, `--rank-*`, `--nivel-*`, `--carta-*`, `--foil-*` | | clubes (solo en su chip), rangos, bandas, la carta |
| `--f-display` · `--f-cuerpo` · `--f-mono` | Mona Sans · Geist · Geist Mono | |
| `--t-rotulo` 11 · `--t-rotulo-g` 12,5 · `--t-chico` 13 · `--t-cuerpo` 16 · `--t-cuerpo-g` 18 · `--t-opcion` 17 | | la interfaz |
| `--t-titulo` 46 · `--t-titulo-s` 34 · `--ancho-titulo` 125 % | | los títulos de pantalla (≤ 56) |
| `--t-momento-s` 96 · `--t-momento` 112-180 · `--t-momento-l` 128-214 · `--ancho-momento` 75 % | | los momentos |
| `--t-num-s` 20 · `--t-num` 30 · `--t-num-m` 44 · `--t-num-l` 64 · `--t-num-xl` 128 · `--ancho-numero` 125 % | | los números |
| `--r-panel` 10 · `--r-control` 5 · `--r-chip` 999 · `--r-carta` 18 | | radios |
| `--margen` 48 a 1440 · `--franja-alto` 52 · `--barra-alto` 44 · `--canal` 20 | | retícula de 12 columnas |
| `--expo` · `--salida` · `--dur-micro` 120 · `--dur-entrada` 280 · `--dur-salida` 160 · `--dur-era` 1300 | | movimiento |

## Qué viene de A y qué de C

| Pantalla | Base | Qué se sumó / cómo se reescribió |
|---|---|---|
| Inicio | A: la intro, la selección con el aura (pegajosa), UN SPLIT MÁS | el formulario es **un panel de cliente** (servidor como control segmentado, perfil como pestañas, roles como teclas, retratos que suben, BLOQUEAR como botón primario en la sección honda); "Continuar", el desafío y el historial son **otro panel** con secciones. |
| Decisión `evento` | la estructura de C: **un panel** anclado abajo (cabecera + opciones con glifos \| inspector al costado) y el panel "vos" a la derecha | el relato del split de A pasa por el mundo, arriba, y se pliega en la línea "antes"; la cara del campeón queda libre arriba a la derecha; elegir = la opción crece y se vuelve **su** resultado (A), con los números rodando en la tarjeta, en "vos" y en la franja. |
| Decisión `planAmateur` | la **planilla** de C (opciones × ejes, referente en el encabezado) | la matriz de A (barras divergentes, deuda de sueño, "tu perfil", rareza) adentro del panel; el inspector es la última sección. |
| Partido `serie` | **C**: el draft (los dos equipos con 5 ranuras, la p del plan apuntado en cada mapa, los quemados como baneados, los planes con 5 barritas + el % de la serie, el inspector) | el centro del panel se abre: **el escenario es una ventana al mundo** (la luz + el splash vivo, encuadre `draft`); el aura en cada libre/pick/quemado, con el nombre del apuntado; los libres y las ranuras en el **duotono de la era**. Elegir: cada mapa es su pantalla de carga (tu pick contra el del rival) y su post-game (VICTORIA/DERROTA en condensada), el marcador rueda, Fearless quema, la victoria es un pulso de luz y al final **la luz cae** (perdiste 3-1), sube (gloria) o queda en tensión. |
| Partido `serieReplan` | el mismo draft | "Te leyeron": la **luz se quiebra** (A) y el escenario se tapa con QUEMADO un instante; el replan entra después. Se fue el toast de C que tapaba al rival. |
| Partido `swiss` | **C**: la Tribuna (EN VIVO, VIDA O MUERTE, el camino R1-R5, el chat nervioso con el PRNG, la parada abajo a la izquierda) | el "video" es el splash vivo en el oro del Mundial (encuadre `tribuna`); el post-game DERROTA; **AFUERA es el takeover de A** sobre el player (la luz cae), con las **dos p** (42 % con la charla, 19 % sin: la decisión movió el número, el dado salió igual) y lo que cambió, rodando; el chat sigue al costado y se apaga. |
| Mercado `mercado` | **A**: la tabla de ofertas (chip del club, sueldo con barra, años en pips, jerarquía proyectada, plantel) | adentro del panel; el **panel de lectura de UNA oferta** de C es la última sección, con "Firmar" como botón primario: **Enter firma** la que estás leyendo, 1-6 eligen directo. → "la prueba de ingreso en <club>"; con LOUD encadena a la firma. |
| Mercado `firma` | A: el takeover (la luz de la pieza se abre en la de academia, LOUD letra por letra, el handle trazado en luz) | el tipo y los botones del sistema. |
| Cumbre `titulo` | A: el takeover CAMPEONES | el tipo y los botones del sistema. |
| Cumbre `final` | A: LEYENDA, la carta holográfica, la trayectoria dibujada | la fila de totales (que repetía la carta) se volvió **la vitrina de trofeos** de `carrera.log` (C) como lista, en el panel del sistema: los títulos agrupados por liga y club, y el Mundial (Golden Road) en oro. |
| Eras | A: la misma pantalla en las 5 luces | la composición ahora es el panel de la decisión. |
| Celular | la barra de cuartos de C (abajo, siempre) y las hojas de A ("ver contexto") | el draft compacto (parada, escenario, planes; los equipos abajo), la Tribuna vertical (el chat abajo), el mercado en filas con "más", la planilla compacta. |
| Marco | — | **arriba**, la franja de A (handle, club, edad, año, nivel); **abajo**, la barra del cliente: los 6 cuartos (Vos, Temporada, Equipo, Mundo, Carrera, Crónica) con la trayectoria mínima a la derecha. La misma en todas las pantallas del juego. |

**Lo que NO se trajo de C**: FARO, el escritorio, las barras de título de ventana, el dock flotante, la bandeja del sistema
como cuerpo, el cambio de tema por era (la ventana clara de 2028), el violeta, la bandeja de contratos como app de correo, la
BIOS y la pantalla de bloqueo, el apagado CRT, la notificación del replan. El emblema del post-game se quedó, sin la
lámpara de FARO como marca: es un escudo con un haz de luz.

## Efectos (qué hace cada `js/*`)

| Archivo | Qué hace |
|---|---|
| `ambiente.js` | (de A) el shader WebGL2 con los 5 equipos de luz, el splash vivo, los ánimos (`peligro`, `gloria`, `caida`), `quiebre`, `retardo`, el cruce del aura, `congelar(t)`, el respaldo CSS. Nuevo: los encuadres `draft` (la cara cae en el escenario, entre los dos equipos) y `tribuna` (el "video" del player). |
| `aura.js` | (de A) un solo mecanismo delegado por `data-campeon`. Nuevo: `alCambiar(f)` (el nombre del escenario sigue a la luz) e `ir(key)`. |
| `partido.js` | **nuevo**: el draft y la Tribuna de C reescritos sobre las piezas de A (`animar`, el reloj del ambiente, el duotono, el aura); todo lo de elegir se programa de una vez: `congelar(t)` fotografía cualquier instante. |
| `decision.js` | (de A) reordenado en el panel de C: cabecera + cuerpo (opciones \| inspector) y la línea "antes" afuera. |
| `mercado.js` | (de A) la tabla en el panel, el panel de lectura con "Firmar" y Enter. |
| `cumbre.js` | (de A) + la vitrina de trofeos. |
| `marco.js` | la franja, la barra de cuartos con la trayectoria, el panel "vos". |
| `inicio.js`, `eras.js`, `iconos.js` (+ glifos de los cuartos), `util.js`, `sonido.js`, `main.js` | de A, con el panel y el tipo del sistema. |

## Trasladable al juego

**Tal cual**: `tokens.css` entero (es la especificación); el sistema de panel de `base.css` (`.panel`/`.parada-col`/
`.contexto`, `.seccion`, `.panel-cab`, `.panel-cuerpo`, el filete y el canto de luz); los controles (`.op-tecla`, `.boton`,
`.boton-pri`, `.btn-mas`, `.opcion` con la barra de luz y la tecla que se hunde, `.cuarto`); la franja y la barra de
cuartos; `ambiente.js` y `aura.js` (con `alCambiar`); el draft (`crearDraft`) y la Tribuna (`crearSwiss`) como estructuras;
la tabla del mercado con el panel de lectura y Enter; los takeovers; la vitrina de trofeos; las reglas 1-7 como guards
(un solo `tokens.css`, ningún `[data-era]` fuera de los tokens, ningún color fuera de `--luz` salvo semánticos/oro/chips de
club, los tres tamaños de radio, las tres voces de tipo).

**Solo de prototipo**: el montaje por hash/panel de `main.js`; la cadena mercado → firma salta a otra muestra; el chat
del Swiss es decorativo (PRNG con datos reales); los cuartos de la barra no navegan (salvo "Vos" en el celular); el
"Volver a decidir" repite la parada; los títulos de la tira de eras usan la misma parada en las cinco.

## Verificación (2026-10-09)

- `capturar.mjs --direccion fusion`: 102 capturas, 0 errores, 0 avisos (WebGL, SwiftShader y sin WebGL; las 7 tiras).
- Reglas de `verificar.mjs` sobre `fusion/` (23 archivos): en verde (ver "Límites": se corrió una copia con `fusion` en la
  lista de direcciones).
- **Contraste medido por píxeles** (una copia de `c-pantallas/contraste.mjs` apuntada a `fusion/`, que además resuelve
  los colores `color-mix()` a sRGB y no cuenta los glifos SVG como fondo): 30 casos (las 5 eras del evento, todas las
  paradas, los resultados de elegir, la serie jugada, AFUERA, los takeovers y el celular) → **1911 textos, 0 por debajo**
  de 4,5:1 (3:1 en ≥ 24 px). Los peores: el título 4,70 ("support", 10,5 px, los créditos de CAMPEONES), la serie en el
  post-game 4,93, el evento 5,62-5,92 según la era.
- La hoja de contactos de las 10 pantallas de escritorio: `capturas/hoja-contactos.png` (se regenera, no se versiona).

## Límites conocidos

- El nombre del campeón del escenario del draft está en la voz del título (ancha, 46 px), no en mayúsculas: el champ
  select real lo grita; acá no es un momento.
- El Swiss no muestra pick porque el motor no lo registra en el Bo1.
- `verificar.mjs` no conoce la carpeta `fusion` (su lista de direcciones es fija): se verificó con una copia del mismo
  script con `fusion` agregada (ver el informe).

## Las tres intensidades (PLANUI §4.6)

El usuario: la fusión está bien, pero el campeón de fondo pesa demasiado después del inicio ("que mantengas la esencia,
pero no tan fuerte"). Lo que se queda es la luz de la era (haces, bruma, polvo, su color y su cambio entre eras) y el
aura como gesto; lo que baja es el campeón. Una perilla, `fondo=pleno|tenue|paso|lugar`, en el hash de `index.html`
(y en el panel de la vitrina: "Fondo", o Alt+F). **`pleno` es la fusión de hoy y el valor por defecto**: sin `fondo` nada
cambia. La página para elegir es **`variantes.html`**.

| Variante | Qué hace |
|---|---|
| `tenue` — *el mismo mundo, a bajo volumen* | el campeón siempre, a ~40 % de presencia, desenfocado y fundido en más bruma, con más viñeta y menos contraste, sin la profundidad 2,5D (sin parallax por capas, sin contraluz, sin flujo). El aura cruza de campeón al mismo volumen. Se lee primero la luz. |
| `paso` — *el campeón aparece cuando importa y se va* | en reposo, solo la luz de la era (con un poco más de haz y de polvo para que no quede un fondo plano). El campeón entra con el aura (apuntar cualquier `data-campeon`, y se va con el cruce al soltar), en las pantallas de carga y el post-game de cada mapa y en el resultado de la serie, y en el post-game del Swiss; se funde de vuelta a la luz en 2 s. En la decisión y el mercado, solo con el hover. |
| `lugar` — *el campeón vive en un lugar fijo, como en el cliente* | el fondo de pantalla completa es solo luz. El campeón vive recortado, nítido y entero, en una ventana de la interfaz: el escenario del draft (como el splash del champ select), el "video" de la Tribuna (una banda entre la cabecera del player y la parada) y una banda pegada arriba del panel "vos" en la decisión, el plan y el mercado. Adentro de la ventana la luz baja, para que el campeón se lea como imagen. El aura cambia el campeón de la ventana y tiñe la luz de afuera (un velo de color, sin forma). |

Lo mismo en las cuatro: la interfaz no cambia (en `lugar` solo se suma la ventana decorativa); el inicio, las eras, el
título y la firma van al 100 % siempre; **AFUERA es un takeover y lleva el mundo al 100 %** en las cuatro; la luz de la
era y su cambio siguen.

**La política del mundo vive en un solo lugar: `js/fondo.js`.** Es una tabla, no `if`s:
- un **estado** del mundo son 10 números: `presencia` (campeón a pantalla completa), `profundidad` (2,5D), `bruma` y
  `vineta` extra, `contraste` y `suave` (desenfoque) del duotono, `enLugar` (presencia adentro de la ventana), `ventana`
  (cuánto pesa la ventana; 0 en un takeover), `luz` y `polvo` (más haz y más polvo cuando no hay campeón);
- cada variante dice qué estado usa en **reposo**, con el **aura**, en un **momento** y en un **takeover**
  (`POLITICAS`); `TIEMPOS`: sube 520 ms, vuelve a la luz en 2000 ms, cruza 1300 ms al cambiar de pantalla y 700 ms al
  cambiar de variante en vivo; `SIEMPRE_PLENO`: inicio, eras, título y firma; `LUGARES`: dónde está la ventana de
  cada pantalla (ancla, foco de la cara, escala del splash).

Quién la lee:
- **el ambiente** (`js/ambiente.js`): `fondo({ politica, lugar })` la fija por pantalla; la intensidad es una función
  del reloj (un estado inicial + cruces programados), así `congelar(t)` también fotografía la intensidad del instante;
  la vuelca al shader en `uI`, `uJ`, `uK`, `uRec` y `uRadio` (con `pleno` todos son identidad: la fusión de hoy da los
  mismos píxeles). La ventana se mide en cada cuadro (`getBoundingClientRect`) y el splash se recorta a su rectángulo con
  las esquinas redondeadas. Sin WebGL: presencia y desenfoque por variables CSS (en `lugar` queda la luz sola).
- **el aura** (`js/aura.js`): avisa `apuntado: true|false` cuando hay una mano sobre un campeón; el ambiente lleva el
  mundo al estado `aura` de la política y de vuelta a la base.
- **las pantallas** solo declaran hechos: `partido.js` dice "momento" (los mapas y el resultado de la serie; el
  post-game del Swiss) y "takeover" (AFUERA). Ninguna pantalla sabe qué variante corre.

**`variantes.html`** (`estilos/variantes.css`, `js/variantes.js`): las tres columnas, cada una un iframe vivo de la
fusión a 1440×900 escalado con su `fondo` en el hash y el panel oculto; las pestañas (la serie, el Swiss, la decisión,
el mercado) cambian las tres a la vez; "lo mismo en las tres" con el enlace a "así arranca" (el inicio al 100 %). Un clic
en una columna (o 1-3) la abre grande; adentro, Alt+1-3 cambia la variante sin salir de la pantalla y Alt+0 es "como hoy"
(o la barra de arriba); Esc vuelve (si el juego no lo usó para saltar). Con una grande abierta, las otras dos pausan su
ambiente (`postMessage` → `amb.pausar()`).

**Trasladable a producción** (si se elige una): la fila elegida de `POLITICAS` con sus estados y `TIEMPOS` (y
`SIEMPRE_PLENO`); los uniformes y la intensidad como función del reloj de `ambiente.js`, con `fondo/momento/takeover`;
`apuntado` en el aura; los dos hechos de `partido.js`; si es `lugar`, `LUGARES` + `estilos/fondo.css` (la banda y el
video, con `--lugar-banda` y `--lugar-video-top` de los tokens). **Solo de prototipo**: el selector inyectado en el
Shadow DOM del panel y el envoltorio de `history.replaceState` que conserva `fondo` (el panel de `comun/` reescribe el
hash con sus claves y no se toca), el `postMessage` de pausa y `variantes.html`.

**Verificación (2026-10-09).**
- `pleno` = la fusión de hoy: capturas del código anterior (`git stash`) contra el nuevo, congeladas a 6000 ms: serie
  máx. 5, plan 6, mercado 4, Swiss 5 niveles de diferencia por canal (el ruido de grano del shader, que depende del reloj
  absoluto; el mismo código contra sí mismo da hasta 8). El inicio, el título y la firma con `fondo=paso` y `fondo=lugar`
  contra `pleno`: máx. 4-6 (van al 100 %).
- `capturar.mjs --puerto 8116 --direccion fusion` (captura `pleno`): 102 capturas, 0 errores, 0 avisos.
- `verificar.mjs`: en verde (fusion, 28 archivos).
- Contraste por píxeles (la copia de `c-pantallas/contraste.mjs` apuntada a `fusion/`), 36 casos de las tres variantes
  (serie, replan, Swiss, evento, plan, mercado, final, el mapa 1, el fin de la serie, el post-game y AFUERA del Swiss,
  el resultado del evento): 3201 textos, 0 debajo de 4,5:1. El peor era la línea "antes" del evento en `paso`/`lugar`
  (4,56, por el haz extra); con `luz` 1,2 se volvió a medir el evento en las cinco eras: 800 textos, peor 5,03.
- `variantes.html`: 0 errores de consola; hover adentro (el aura dispara en la columna), clic y 1-3 abren la grande,
  Alt+1/Alt+0 cambian la variante, 1 elige y juega la serie, Esc salta y Esc vuelve, las cuatro pestañas.
- Rendimiento (Chromium headless con la GPU real, ANGLE D3D11 sobre una RTX 2060): lado a lado, los tres ambientes a
  30 cuadros/s y la página a 4,2 ms por cuadro (p95 4,3); con una grande, esa a 30 y las otras dos en 0 (pausadas).

**Límites.** En la serie, `lugar` se parece a `pleno`: el campeón ya vivía en el escenario; la diferencia es que no se
derrama y se lee como imagen. En `paso`, el momento de los mapas muestra el campeón de la pantalla, no el pick de cada
mapa. Sin WebGL, `lugar` queda en la luz sola (no se recorta la ventana). La banda del video de la Tribuna se mide al
montar (no sigue un cambio de tamaño de la ventana).
