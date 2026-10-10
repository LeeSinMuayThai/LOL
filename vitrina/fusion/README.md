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

## Las dos perillas del mundo: el color y el espacio (PLANUI §4.6)

El usuario, sobre la fusión: el estilo del campeón pesa demasiado después del inicio. Primero lo leímos como espacio
(cuánto campeón hay de fondo) y él aclaró: *"Me refería más al blanco y negro, violeta ese que tienen… estaba bien para
el inicio, pero si estaba siempre iba a ser como un estilo repetitivo. Que esté presente, pero no tan fuerte"*, y el
espacio *"un poco nomás"*. Quedan dos perillas en el hash de `index.html` (y en el panel de la vitrina: "Color", Alt+K;
"Fondo", Alt+F). **Sin ninguna de las dos (o con `color=duotono` y `fondo=pleno`) la fusión es la de hoy**, píxel a píxel.

**`color=duotono|real|mitad|capas`, el eje principal** (`js/color.js`):

| Variante | Qué hace |
|---|---|
| `duotono` — *como hoy* | blanco y negro + la luz de la era, en todos lados. Es el valor por defecto y queda siempre en el inicio, las eras, CAMPEONES, la firma y AFUERA. |
| `real` — *A color* | todo campeón con sus colores reales: el fondo, el escenario, el video de la Tribuna, los libres, las ranuras, los picks, los quemados, las cartas de carga y la banda de "vos". La era queda en la luz (haces, bruma, polvo, filete) y en un lavado del 18 % sobre el arte de fondo, para que esté en la escena y no pegado. |
| `mitad` — *Mitad* | 50 % color real y 50 % duotono, en todos lados: se reconocen sus colores, llevados a la paleta de la era. |
| `capas` — *Fondo en duotono, retratos a color* | el fondo de pantalla completa sigue en duotono, más suave (presencia × 0,72, contraste × 0,8); toda pieza de interfaz con campeón va a color, como en el cliente. |

**`fondo=pleno|menos|tenue|paso|lugar`, el espacio** (`js/fondo.js`), ahora selector secundario:

| Variante | Qué hace |
|---|---|
| `pleno` — *hoy* | el campeón en la luz, a pantalla completa, siempre. |
| `menos` — *un poco menos* | la misma composición, con el campeón al 70 % y la luz de contra de la era al 40 % (sin el derrame rosa del borde derecho de la serie), y un poco más de viñeta. **Las tres variantes de color se muestran con `menos`.** |
| `tenue` | el campeón siempre, a ~40 %, desenfocado y fundido en más bruma, sin la profundidad 2,5D. |
| `paso` | en reposo solo luz; el campeón entra con el aura, en cada mapa (tu pick de ese mapa), en el resultado y en el post-game del Swiss, y vuelve a la luz en 2 s. |
| `lugar` | solo luz de fondo; el campeón vive recortado en una ventana de la interfaz: una carta al lado de "Apuntando <nombre>" en el draft (se apaga mientras se juega: las cartas de carga ya son los lugares), el video de la Tribuna y una banda arriba del panel "vos". |

**Dónde vive la política.** El espacio es una tabla en `js/fondo.js`: cada variante dice qué **estado** del mundo usa
en reposo, con el aura, en un momento y en un takeover (`POLITICAS`), con sus `TIEMPOS` (sube 520 ms, vuelve a la luz
en 2000 ms, cruza 1300 ms entre pantallas y 700 ms al cambiar de variante), las pantallas que van siempre al 100 % y los
`LUGARES`. Un estado son 14 números: `presencia`, `profundidad`, `bruma`, `vineta`, `contraste`, `suave`, `enLugar`,
`ventana`, `contra`, `luz`, `polvo` y los tres del color: `colorFondo`, `lavado` y `colorLugar`. El color es otra tabla en
`js/color.js` (`POLITICAS_COLOR`: `fondo`, `lavado`, `pieza`, y los multiplicadores de `presencia` y `contraste`) con las
pantallas que van siempre en duotono; `fondo.js` le suma a cada estado el color con `conColor()`, y el takeover
vuelve al duotono.

Quién la lee:
- **el ambiente** (`js/ambiente.js`): `fondo({ politica, lugar })` la fija por pantalla; la intensidad es una función
  del reloj (un estado inicial + cruces programados), así `congelar(t)` la fotografía. La vuelca al shader en `uI`,
  `uJ`, `uK`, `uColor`, `uRec` y `uRadio`; con `pleno`/`duotono` todos son identidad. El color del arte de fondo es
  `mix(duotono, mix(color real, duotono, lavado), colorFondo)` y, adentro de la ventana de `lugar`, el de las piezas.
  Sin WebGL, el respaldo CSS pinta el arte con la misma mezcla y aplica presencia y desenfoque.
- **las piezas** (`partido.js`): libres, ranuras, picks e intención del rival y las cartas de carga se pintan con
  `pintarCampeon()` de `color.js` (el duotono de siempre y, encima, el color real con la mezcla de la política). Los
  quemados leen `--pieza-color` (main.js la pone en `<html>`): se ven quemados en grises, con su color asomando.
- **el aura** (`js/aura.js`): avisa `apuntado: true|false`; el ambiente lleva el mundo al estado `aura`.
- **las pantallas** declaran hechos: `partido.js` dice "momento" (los mapas, con tu pick de cada uno, y el resultado de la
  serie; el post-game del Swiss) y "takeover" (AFUERA). Ninguna pantalla sabe qué variante corre.
- **en vivo**: cambiar una perilla (selector, Alt+F/Alt+K, el hash) cruza el mundo en 700 ms y repinta las piezas sin
  salir de la pantalla.

**`variantes.html`** (`estilos/variantes.css`, `js/variantes.js`): las tres columnas son `real`, `mitad` y `capas` ("A
color", "Mitad", "Fondo en duotono, retratos a color") con `fondo=menos`, cada una un iframe vivo de la fusión a
1440×900 escalado con el panel oculto; las pestañas (la serie, el Swiss, la decisión, el mercado) cambian las tres a la
vez; "lo mismo en las tres" con el enlace a "así arranca" (el inicio en duotono, al 100 %). Un clic en una columna (o
1-3) la abre grande; arriba, el conmutador (1-3 las tres; 0 "como hoy": duotono y pleno; con Alt desde adentro del
juego) y el selector de **espacio** (hoy, un poco menos, tenue, de paso, en su lugar); Esc vuelve (si el juego no lo usó
para saltar). Con una grande abierta, las otras dos pausan su ambiente (`postMessage` → `amb.pausar()`).

**Trasladable a producción** (lo que se elija): la fila de `POLITICAS_COLOR` y la de `POLITICAS` con `TIEMPOS`,
`SIEMPRE_DUOTONO` y `SIEMPRE_PLENO`; `conColor()`; los uniformes y la intensidad como función del reloj de `ambiente.js`
(`fondo/momento/takeover`); `pintarCampeon()` para toda pieza de campeón; `--pieza-color`; `apuntado` en el aura; los
hechos de `partido.js`; si se elige `lugar`, `LUGARES` + `estilos/fondo.css`. **Solo de prototipo**: los selectores
inyectados en el Shadow DOM del panel y el envoltorio de `history.replaceState` que conserva `color`/`fondo` (el panel
de `comun/` reescribe el hash con sus claves y no se toca), el `postMessage` de pausa y `variantes.html`.

**Verificación (2026-10-09).**
- Sin perillas = la fusión de hoy: capturas del código anterior contra el nuevo, congeladas a 6000 ms: serie máx. 9
  (2 píxeles de polvo), plan 8, inicio, mercado y Swiss 6 niveles por canal; el mismo código contra sí mismo da hasta 8
  (el grano y el polvo dependen del reloj absoluto). Inicio, título y firma con otro `fondo`: máx. 4-6 (van al 100 %).
- Contraste por píxeles (la copia de `c-pantallas/contraste.mjs` apuntada a `fusion/`): las tres de color con
  `fondo=menos`, 30 casos (serie, Swiss, evento, plan, mercado, final, el mapa 1, el post-game y AFUERA del Swiss, el
  resultado del evento): 2565 textos, 0 debajo de 4,5:1, peor 5,77. Las del espacio: 3201 textos, 0 debajo; la línea
  "antes" del evento en `paso`/`lugar`, 5,03 en las cinco eras.
- `verificar.mjs` en verde; `capturar.mjs --direccion fusion`: 102 capturas, 0 errores (antes del color).
- `variantes.html`: 0 errores de consola; el aura en una columna, clic y 1-3 abren la grande, Alt+1/Alt+0/Alt+3 y el
  selector de espacio cambian la vista, 1 juega la serie, Esc salta y Esc vuelve, las cuatro pestañas.
- Rendimiento (Chromium headless con la GPU real, ANGLE D3D11 sobre una RTX 2060): lado a lado, los tres ambientes a
  30 cuadros/s (la página a 4,2 ms por cuadro, p95 4,3); con una grande, esa a 30 y las otras dos en 0.

**Límites.** Con Sylas (la serie, la decisión) `real` y `mitad` se parecen al duotono: su paleta ya es pálida y
violácea; la diferencia se ve en los libres, las cartas y con el aura. Con Anivia (Swiss) y Yone (mercado), de un
vistazo. La carta holográfica de la final queda en el duotono de su rareza (es un objeto). En `paso`, el campeón de
cada mapa entra en tiempo real (no entra en `congelar`). Sin WebGL, `lugar` queda en la luz sola. La banda del video
de la Tribuna se mide al montar.

## Opciones (PLANUI §4.7)

### La decisión: `op=escena|cliente|bisagra` (`js/escena.js`, el final de `estilos/decision.css`, su bloque de `tokens.css`)

El usuario, sobre la decisión del import a Corea: *"me gusta como está diseñada pero siento que es muy aburrida, interactúa
poco con el fondo, y principalmente, representa poco lo que está pasando"*. Las tres opciones **no tocan el panel** (las
opciones con glifos, el inspector y "vos" quedan iguales) y le suman escena, interacción y oficio. **Sin `op` la pantalla
es la de hoy, píxel a píxel** (medido: 0 píxeles distintos contra el código anterior en evento, plan, los dos resultados y
el celular, con INST y sin WebGL).

| Opción | Hash | Qué es |
|---|---|---|
| **La escena** | `#pantalla=decision&muestra=evento&op=escena` | El fondo cuenta la situación. A la izquierda, tu lugar: el logo de tu liga y el de tu club (CBLOL y FURIA, logos oficiales). A la derecha, la liga que te llama sobre su ciudad de noche: el logo de la LCK flotando sobre Seúl (la silueta con la N Seoul Tower y la Lotte World Tower, ventanas encendidas, la luz de contra de la era como neón). Entre las dos, un arco de luz por el que un pulso viaja de ellos a vos ("te están llamando"). **Apuntar una opción cruza la escena a ese camino**: el bootcamp enciende el arco y suma la vuelta punteada por abajo (el viaje corto, ida y vuelta); "seguir en tu liga" apaga la ciudad y devuelve la luz a casa; la cerrada deja el arco punteado, gris y con candado. Elegir deja la traza del camino elegido. El campeón sale del fondo: la escena lo reemplaza. |
| **El momento del cliente** | `…&op=cliente` | La bisagra llega como "partida encontrada": el anillo con el logo de quien llama, el reloj dorado que se vacía (12 s) y **Aceptar** (Enter, Espacio o clic; 1-9 aceptan y eligen directo; si se acaba el reloj, se acepta solo). Aceptar abre el panel de siempre con el filete y el rombo hextech; al elegir, la tecla y la barra del resultado se "bloquean" en oro (el lock-in). El hextech vive **solo** en la bisagra: el plan amateur entra sin invitación, igual que hoy. |
| **El peso** | `…&op=bisagra` | La bisagra como capítulo: el mundo se oscurece, entra "DECISIÓN BISAGRA · 2032" en la voz de los momentos y se va. Desde el panel se abren los caminos, uno a cada lado, y al final de cada uno lo que arriesgás: cada eje que mueve la opción, su valor de hoy (de la ficha) y su barra con lo que se corre por la magnitud (antes → después, sin inventar números). **Apuntar un camino tira la luz hacia su lado** (el hueco de la oscuridad viaja, la carta se enciende, la luz corre por el camino); la cerrada es un tramo punteado que se corta. Elegir apaga el otro camino y lleva las barras de la carta elegida a los valores reales del resultado. Las decisiones comunes lo llevan atenuado: sin capítulo ni cartas, oscuridad a la mitad y un camino por opción. |

**Campo del evento → elemento de la escena** (nunca se parsea prosa; lo que falta, no se dibuja):

| Campo | Escena | Cliente | Peso |
|---|---|---|---|
| `ficha.jugador.liga` / `org` (o `contrato`) | tu lugar: logo de la liga + del club | la ruta chica (tu liga → la de ellos) | — |
| sin liga ni org (amateur) | tu servidor (`ranked.servidor`) en un escudo-monograma | — | — |
| efecto con `liga` en las opciones (`decision.datos.evento.options[].outcomes[].effects`) | la liga que llama, su ciudad (`LIGAS`) y el arco | el logo del anillo y "Invitación · LCK" | — |
| efectos de cada opción: `liga` en todos sus resultados / `camino` abierto / el resto | el camino al apuntarla: **ir** (mudanza), **viaje** (ida y vuelta), **casa** (te quedás) | — | — |
| `opcionesBloqueadas` (emparejadas por id con las del evento) | el arco apagado con candado | — | el tramo punteado que se corta |
| `esBisagra` | — | invitación + hextech (sin bisagra: el panel de hoy) | capítulo + cartas (sin bisagra: atenuado) |
| `anio` | — | — | el año del capítulo |
| `categoria` | el monograma si no hay liga ni servidor | quien llama si no hay liga ni org | — |
| `previa[]` (`campo`, `signo`, `magnitud`) | — | — | las filas de cada carta: glifo, valor de hoy, barra y ▲/▼ por cantidad |
| `riesgo` | sin geografía, la forma del haz: firme, cortado, titila, en rojo | — | — |
| `rareza` (≠ común) | sin geografía, el final del haz en oro | — | — |
| `resultados[].inmediato.cambios` | — | — | al elegir, las barras van al valor real |
| sin destino (el plan, una decisión de vida) | un haz por opción desde tu lugar, en el hueco libre sobre "vos" | — | — |

**Logos.** `LOGOS` en `js/escena.js` (con el comentario `// → logos.js`, para unificar con el mapa del mercado): LCK, CBLOL,
LEC, LPL y FURIA, del CDN oficial (`static.lolesports.com`, vía `esports-api.lolesports.com` `getLeagues`/`getTeams`), cada
uno verificado con 200 `image/png`. Van en `<img>`; el de FURIA es negro y se pasa a la tinta con un filtro. Una org o liga
que no está en el mapa, o que no carga, lleva el escudo-monograma del sistema (iniciales + el filete de la luz). LCS se
dejó afuera porque su URL responde `binary/octet-stream`.

**Trasladable.** `leerEvento()` (la lectura del evento por campos, con la clasificación ir/viaje/casa), las tablas `LIGAS`,
`CAMPO_FICHA` y `LARGO_MAGNITUD`, la ciudad determinista por su nombre (`crearAzar('ciudad:<ciudad>')`), los tres estados
de la escena como atributos (`data-estado`, `data-lado`) que el CSS cruza, la invitación como un `role="dialog"` con el
foco en Aceptar, y el contrato con `decision.js`: `apuntar(i)` (solo lo que apunta el jugador: hover, flechas, foco, "más"),
`soltar()`, `elegir(i, resultado)`, `entrar()`, `destruir()`. **Solo de prototipo**: los logos enlazados del CDN (antes
de publicar se revisa la política de uso, §15) y los hitos dibujados solo para Seúl (las otras ciudades llevan la silueta
genérica).

**Verificación (2026-10-09).** Hoja de contactos de 5 filas (evento en reposo, apuntando la 1, apuntando la 2, el
resultado de elegir y el plan en reposo) × 4 columnas (hoy, escena, cliente, bisagra), a 1440×900: 0 errores de consola y 0
`requestfailed`. Contraste por píxeles (la copia de `c-pantallas/contraste.mjs` apuntada a `fusion/`): 15 casos (las tres
opciones en reposo, eligiendo la 1 y la 2, el plan y el celular): 985 textos, 0 debajo de 4,5:1; el peor, 5,63 (la línea "antes" con la escena). Movimiento
reducido, INST y sin WebGL: las tres andan (sin WebGL la escena se ve igual de clara). `verificar.mjs` en verde.

**Límites.** En el cliente, después de aceptar, el fondo es el de hoy: la opción es el momento de llegada, no la escena. Los
halos de los caminos no llevan desenfoque (un `filter: blur()` sobre el SVG dejaba un fantasma de las cartas con el WebGL de
SwiftShader): son dos trazos anchos y tenues. Con el plan amateur, la escena es chica (el escudo del servidor y cuatro haces
sobre "vos") porque la planilla ocupa casi toda la pantalla. En el celular la escena es solo la ciudad abajo, en el espacio
libre, y el peso no muestra las cartas.

### Partido: la serie, el replan y el Swiss (`op=luz|transmision|escenario`)

El usuario, de la serie: *"que el fondo tenga más calidad y que los campeones tengan un 15 % más de color mientras que
el fondo un 10 % más"*; del Swiss: *"un 20 % menos amarilla y más estética de la competición (LEC WORLDS MSI LO QUE SE
ESTÉ JUGANDO)"*. Abrir: `index.html#pantalla=partido&muestra=serie&op=luz` (o `serieReplan`, `swiss`; y
`transmision`, `escenario`).

**Lo que llevan las tres** (y que va más allá del partido):
- **La receta de color (`color=receta`, `js/color.js`).** Parte de `mitad`: las piezas de campeón a 65 % color / 35 %
  duotono y el campeón de fondo a 60/40. El inicio y los takeovers siguen en duotono. Con cualquier `op=` en el hash y
  sin `color=`, `main.js` la usa por defecto (`COLOR_OP`); `color=` explícito manda. También está en el selector
  "Color" del panel.
- **El fondo nítido, en todas las variantes y también sin `op`** (es la única excepción a "sin `op`, como hoy"). La
  "poca calidad" tenía tres causas, medidas sobre la cara de Sylas: (1) todo el shader pintaba a escala 0,5 y el
  navegador lo estiraba ×2, así que el arte de 720 px de alto quedaba en ~430 (papilla); (2) la textura no tenía mipmaps
  y, achicada, las líneas finas y brillantes saltaban de texel en texel; el duotono, que dispara la contra en los
  brillos, marcaba esos dientes (el rosa dentado); (3) el "vivo" desplazaba cada píxel según su propia luminancia, y dos
  vecinos de luz distinta se corrían distinto. Arreglo (`js/ambiente.js`): **dos pasadas**. La luz (bruma, haces,
  polvo, la escena) se sigue pintando a 0,5 en dos texturas (`RGBA16F` si hay `EXT_color_buffer_float`; si no, 8 bits
  con la luz a la mitad); el arte se compone a resolución nativa encima, con mipmaps y `textureLod` al nivel de su
  escala; la profundidad 2,5D y el flujo del vivo salen de un nivel borroso del mip (un campo suave) y el flujo bajó
  de 0,016 a 0,007. La cuenta de la luz es la misma, partida en dos: sin WebGL la fusión da idéntica (máx. 1 nivel en
  serie, Swiss, evento, mercado y replan) y con WebGL la diferencia queda en el arte. 29-30 cuadros/s del ambiente con
  la GPU real (la página, p95 4,3 ms).
- **La competición (`js/competicion.js`).** Cada pantalla sabe qué se juega por la muestra (la liga de la ficha; la
  clave del internacional): la serie es CBLOL 2030 y el Swiss es Worlds 2033. Sus tokens son `--comp-<id>-luz`, `-contra`
  y `-acento` (Worlds, MSI, First Stand, CBLOL, LEC, LCK, LPL, LCS, LCP, en el bloque §4.7 · partido de `tokens.css`).
  - La paleta sale del color dominante del logo oficial, medido por píxeles, y de su motivo. Worlds es la plata de la
    Copa con un oro viejo en la contra; CBLOL es el blanco hueso del símbolo con el rojo de su trofeo. Ningún brand
    book público da los hex, y donde el logo es blanco el segundo color es nuestro (está anotado).
  - Con una opción, `html[data-comp]` cambia el acento de la interfaz (`--luz`) por el de la competición, y el mundo
    recibe `ambiente({ paleta })`. El oro (`--gold`) queda para el logro.
- **Los logos** (`<img>` del CDN de LoL Esports, constantes `// → logos.js`):
  - el del torneo en el rótulo de la cabecera y en los kickers;
  - los de los equipos en las columnas del draft, el marcador, las pantallas de carga de cada mapa, el rival de VIDA O
    MUERTE y el camino del Swiss (logo + sigla, con el nombre en el `title`);
  - si no cargan, o la org es inventada, va el escudo-monograma (`.escudo`: las iniciales con el filete de la luz).

| Opción | Qué es |
|---|---|
| `luz` · La luz del evento | El cambio mínimo: el mundo toma la paleta de la competición (85 %), la interfaz su acento, y los logos. |
| `transmision` · La transmisión | El mundo a mitad de camino (55 %). El marcador es el *score bug* (el logo del torneo, logo + sigla + marcador de cada equipo y la fase debajo). Lo apuntado del draft es una placa inferior con quién juega; en el Swiss, un bug con el récord de los dos (rueda al terminar) y la placa de Elurah89 · Anivia sobre la parada. Al entrar, una cortina de 1,5 s ("WORLDS 2033 · SWISS · RONDA 5 · BO1"): Espacio, Esc o elegir la saltean. En el celular se compacta: el bug vuelve al lugar del marcador y no hay placas. |
| `escenario` · La arena | El mundo es el estadio (`ambiente({ arena })` + `escena: 'arena'` en `js/fondo.js`). El campeón vive en la pantalla gigante, que emite como un LED: es un lugar fijo, y el aura cambia lo que se ve ahí. Seis cabezales móviles cuelgan del techo en la paleta del torneo, con humo en el piso, el resplandor del escenario y dos filas de público en silueta con celulares. La interfaz flota adelante. |

**Trasladable.**
- Tal cual: las dos pasadas del ambiente (vale para todo el juego, no solo el partido), `POLITICAS_COLOR.receta`,
  `competicionDe()` + los tokens `--comp-*` + `html[data-comp]`, `logoOrg`/`logoComp` con el escudo de respaldo, y
  `ambiente({ paleta, arena })`.
- La opción que se elija: el score bug, las placas y la cortina (`partido.css`), o `ESCENAS.arena` con su pantalla.

**Solo de prototipo.** Las URLs de logos enlazadas al CDN (antes de publicar, §15, se revisa la política de uso). El
default `op → receta` de `main.js`.

**Verificación.**
- `verificar.mjs` en verde.
- Contraste por píxeles (la copia de `contraste.mjs` de la fusión), 24 casos: las tres opciones × serie, VICTORIA, el
  final, replan, Swiss, DERROTA, AFUERA y celular. 2151 textos y después 828 del Swiss y el celular corregidos: 0
  debajo de 4,5:1; el peor da 6,13.
- 0 errores de consola.
- El amarillo del Swiss (b* medio sobre los tonos oro): hoy 5,5 en duotono y 0,8 con la receta; `luz` 0,0,
  `transmision` 0,0, `escenario` 0,4.

**Límites.**
- Sin WebGL no hay paleta ni arena: el respaldo CSS queda en la luz de la era y la pantalla gigante no se dibuja.
- En el CBLOL la luz `luz` es blanco hueso, y la identidad la cargan sobre todo los logos.
- AFUERA es un takeover: se ve igual en las cuatro columnas.

### Mercado y firma: `mesa`, `anuncio`, `orgs` (+ `js/logos.js`)

El usuario: *"le falta representar lo que está pasando, falta ese aspecto de peso de decisión importante o formal, y
también se deberían añadir los logos actuales de los equipos"*. Las tres opciones valen para `muestra=mercado` y para
`muestra=firma`, todas llevan logos y la tabla de ofertas se queda. **Sin `op` el mercado y la firma son los de hoy**
(`crearOfertas` y `crearFirma` no se tocaron).

| Opción | Hash | Qué es |
|---|---|---|
| `mesa` · La mesa de firma | `#pantalla=mercado&muestra=mercado&op=mesa` | La oferta que leés es **un contrato**, a la derecha de la tabla: el logo grande de la org, su liga (con su logo), "Contrato de jugador profesional", las partes, cuatro cláusulas con número grande (sueldo con "×tu valor", duración, jerarquía proyectada, plantel), las notas en mono y la línea de firma: el sello de la org ya está, la tuya falta. Apuntar otra fila cambia de hoja. **Enter firma**: el mundo se aquieta (una capa de silencio y la tabla que se aparta), tu handle se traza en luz sobre la línea (0,42-1,47 s), la rúbrica y el sello FIRMADO (1,65 s). Después, la prueba de ingreso como hoy; con LOUD, la firma. En `firma`: el logo de LOUD junto al nombre gigante y el contrato que se firma solo. |
| `anuncio` · El anuncio | `…&op=anuncio` | Cada oferta se previsualiza como **la placa de fichaje** que publicaría la org: su logo, sus colores (el arte de tu main llevado a los colores de la org con un `mix-blend-mode: color`, una luz de marca y la barra de marca abajo), "WELCOME Elurah89" o "NOSSO NOVO MID / ELURAH89" según la org, tu rol, la liga y los años. Apuntar otra fila barre la placa. Elegir la **publica**: la placa crece, un barrido de luz, los likes y los comentarios ruedan (decorativos, `comun/azar.js`, escala por tier; no son datos del motor) y cuatro comentarios entran al mundo. Solo se publica la oferta que de verdad se firmó en esta carrera (LOUD); las otras quedan como **BORRADOR · si pasás la prueba**, porque el motor no jugó esa prueba. En `firma`: la placa publicada con los likes y el chat. |
| `orgs` · Te llaman | `…&op=orgs` | Los **logos flotan en la luz alrededor de tu campeón** (encuadre `centro`), cada uno con su nombre y su sueldo. Tamaño = sueldo (52-148 px, lineal contra el más alto); cercanía = jerarquía proyectada (los dos de más jerarquía, al lado de tu campeón; los dos siguientes, arriba; los dos últimos, afuera). La leyenda trae el referente: un círculo punteado del tamaño de **tu valor** (USD 19.291). "Mientras tanto" flota arriba a la derecha. **Apuntar una org lleva el mundo a sus colores** (el aura de las orgs: entra a los 120 ms, vuelve a los 600, como la de los campeones; las demás se apagan). La tabla queda abajo y compacta, con una línea de inspector. Elegir **acerca el logo** (crece en la luz y viaja hasta el encabezado del contrato) y **entra al contrato** de `mesa`, que se firma. En `firma`: el mundo en el color de LOUD y su logo llegando desde la luz, con el takeover de siempre. |

**`js/logos.js`** (el dueño es este worker): `logoOrg(nombre)` → `{ src, iniciales, liga }` (o `{ src: null, iniciales }`),
`logoLiga(id)` → `{ src, iniciales, nombre }` (acepta `CBLOL`, `CD`, `mundial`, `Mundial 2036`, `MSI`…),
`pintarLogo(nombre, { tam, liga, alt, clase })` → `<span class="logo">` con el `<img>` (y `onerror` → el escudo; nunca
aborta una carga), `escudo(iniciales)`, `tonoOrg(nombre)` (el token `--org-*`) e `INVENTADAS`.
- **Fuente:** la API pública de LoL Esports (`esports-api.lolesports.com/persisted/gw/getTeams` y `getLeagues`), con las
  imágenes oficiales y actuales de su CDN, `static.lolesports.com`; se eligió la versión para fondo oscuro. Los Grandes
  usa el logo de **LØS**, su nombre de hoy (Leaguepedia redirige el logo de Los Grandes al de LØS).
- **Verificado (2026-10-09):** cada URL respondió 200 con una imagen (por `fetch`, firma PNG/WebP) y las 53 cargan en
  Chromium (`naturalWidth > 0`, 0 rotas). Cobertura contra `muestras.json`: **43 orgs reales con logo** (más Fukuoka
  SoftBank HAWKS gaming y CTBC Flying Oyster, que aparecen en el peor caso y en textos), **7 inventadas con escudo**
  (Ecos Force, Enclave Esports, Enclave Collective, Espectro Legion, Fénix Gaming, Onda Collective, Vórtice Squad), **0
  sin resolver**; ligas: CBLOL, CD, LEC, LCK, LPL, LCS, LCP, LRN, LRS, Mundial, MSI y First Stand.
- **Colores de org:** `--org-<tono>-hondo` en el bloque §4.7 de `tokens.css` (el fondo de la placa); el acento es el
  `--org-<tono>` de siempre. Solo aparecen junto al logo (la placa, el aura del logo, su contrato).

**Trasladable:** `js/logos.js` entero (el mapa, el escudo-monograma, `pintarLogo` con su `onerror`); la tabla con logos;
el contrato como pieza (`crearContrato`: cláusulas, línea de firma, `firmar(t0)` programada de una vez); la placa
(`crearPost`) con la regla "solo se publica lo que el motor confirmó"; el aura de las orgs (`.mk-tinte`, una capa
delante del lienzo y detrás de los paneles) y los asientos por jerarquía (`ASIENTOS`). **Solo de prototipo:** los likes
y los comentarios (PRNG decorativo), los estilos de anuncio por org (`ESTILO_ANUNCIO`), el salto a la muestra `firma`.

**Verificación (2026-10-09, puerto 8123):**
- Sin `op`, contra las capturas tomadas antes de tocar nada (congeladas, mismas tomas): reposo máx. 4 niveles, hover de
  LOUD 8, firma 10; 0 píxeles con más de 16 (el grano del reloj da 6-9).
- Contraste por píxeles (la copia de `c-pantallas/contraste.mjs` apuntada a `fusion/`): 15 casos (las tres en reposo,
  los resultados de elegir, las placas de cuatro tonos, el borrador, las tres firmas, dos celulares) → **876 textos, 0
  debajo de 4,5:1**; el peor, "Welcome" de 100 px en la firma del anuncio, 5,30; el resto ≥ 6,17. Lo apartado al elegir
  queda `inert` y fuera del lector (la tarjeta del resultado lo reemplaza).
- `verificar.mjs` en verde; 0 errores de consola y 0 `requestfailed` en todas las capturas (hoja de contactos, tiras,
  celular).
- Hoja de contactos (no se versiona): filas reposo / apuntando LOUD / apuntando Onda Collective / el momento de firmar /
  la firma (LOUD); columnas hoy, `mesa`, `anuncio`, `orgs`.

**Límites.** La firma de `mesa` dura 1,65 s hasta el sello y se saltea con un clic, Enter o Espacio. En `orgs` el
contrato aparece arriba a la izquierda, encima del panel de abajo apagado. Los likes de la placa escalan por tier, pero
siguen siendo decorativos. En el celular, `orgs` no muestra el cielo (queda la tabla con el inspector) y el anuncio no
muestra el chat.

## La demostración final, `op=final` (PLANUI §4.8)

### Partido: la serie con las pantallas del stage, el Swiss como stream
El usuario, de la serie: *"el 3 está bueno si se hiciese más como las pantallas del stage"* (y el 1 *"tiene mucho de
las luces de escenario"*); del Swiss: *"que se sienta más como pantalla de stream si tenés el chat… porque está el chat
pero el champ detrás"*. Abrir: `index.html#pantalla=partido&muestra=serie&op=final` (o `serieReplan`, `swiss`).

**La serie y el replan: el estadio arriba, el draft abajo.**
- **El estadio** (`crearEstadio` en `js/partido.js`, DOM, `aria-hidden`: es el mundo; todo lo que dice también está en
  el panel):
  - **la pantalla LED central** es el duelo de mid: tu pick contra el del rival a pantalla partida, en diagonal, con
    "VS"; arriba, el logo del torneo, la ronda, el marcador con los logos y las siglas, y "Bo5 · Fearless". Por defecto
    es tu campeón planeado contra la intención del rival (Sylas vs Ahri); en el replan, "Tu pick ?" contra el que te
    leyeron (Sylas).
  - **el aura sigue:** apuntar un campeón (libre, ranura, quemado) lo pone en la central, del lado de quien lo juega,
    con un destello de corte del LED.
  - **las dos laterales**, en ángulo: cada equipo con su logo, su nombre y los mapas que lleva (los pips del Bo5). La
    tuya suma **la placa de jugadores** de la transmisión: handle + rol de tus cuatro compañeros y vos (de
    `ficha.jugador.companeros`), sin campeón: el motor no simula sus picks. Del rival no hay plantel en los datos: logo,
    nombre y ronda.
  - **la faja de LED** al pie: Fearless, los diez huecos que se queman mapa a mapa (el leído, en rojo) y el contador.
  - **el público** en siluetas (SVG con el PRNG decorativo, dos filas, algún celular en alto que titila), por delante
    de las pantallas.
- **Jugar la serie:** cada mapa es la pantalla de carga en la central (tu pick contra el del rival, "MAPA n"), después
  VICTORIA/DERROTA a todo el LED con el marcador del mapa y la p que tenías; la lateral del que ganó destella y suma su
  pip, la faja quema los dos picks, el marcador de arriba rueda. Cada mapa queda en el LED hasta que el siguiente lo
  tapa (no vuelve al duelo entre mapas). Al final la central da el marcador grande con los dos logos y quién se la
  lleva ("Campeones", en oro, o "FX gana la final"); el resultado con el texto del motor y "Volver a decidir" va en el
  panel. En el replan, QUEMADO cae sobre la central.
- **El draft se queda delante**, compacto: los equipos con sus 5 ranuras (38 px), la previa en una línea que se parte,
  los quemados; al centro la parada, **tus libres** (bajaron de la ventana al panel) y los planes con el inspector.
- **La sala** (el ambiente, `escena: 'estadio'` de `js/fondo.js`): sin campeón en el mundo, la paleta del CBLOL, los
  cabezales al 30 % y casi quietos (`arena.haces`, el barrido cae con el cuadrado) y el público del shader apagado
  (`arena.publico: 0`), porque lo dibuja el DOM por delante de las pantallas.

**El Swiss: la transmisión oficial, vista en un stream.**
- **La página del stream** ocupa todo el ancho entre la franja y la barra: oscura y opaca. El mundo se ve **solo
  adentro del reproductor** (la sombra del reproductor pinta la página alrededor). Debajo: el avatar (el logo del
  torneo), el título del stream, el canal ("Worlds · transmisión oficial"), las etiquetas, EN VIVO y los espectadores
  (decorativos, del PRNG) y **los cruces de la ronda 5** del motor (KC–GZ, OMG–GX y el tuyo, "en pantalla").
- **El feed** es el escenario del Mundial 2033 (el mismo estadio, en la paleta de Worlds): en la central tu campeón del
  split (Anivia, el que el motor usa en la previa; del Bo1 no hay pick) contra el escudo de Movistar KOI, con VIDA O
  MUERTE en el medio y los records arriba; las laterales, FURIA con su plantel y MKOI con su liga; la faja, los otros
  cruces. Encima, los gráficos de `transmision`: el score bug con logos (FUR 2–2 vs 2–2 MKOI · SWISS · RONDA 5 · BO1),
  la marca de agua del torneo, la placa de Elurah89 · Anivia y el camino R1-R5.
- **El reproductor** (patrón de stream, sin marcas de ninguna plataforma): pausar/reproducir (congela el feed y aparece
  el botón grande), volumen con deslizador (el botón silencia y recuerda el nivel), EN VIVO, calidad (un menú, Esc o un
  clic afuera lo cierran) y pantalla completa (el reproductor tapa todo; el navegador entra en pantalla completa si lo
  deja). La barra se esconde a los 3,2 s sin mover el mouse y vuelve al moverlo, con el foco o en pausa.
- **La parada** queda fijada arriba del chat (como lo fijado de un stream): las dos opciones, el inspector y la previa
  del 19 %, sin tapar nada del feed. Al elegir queda resuelta (la elegida encendida, la otra apagada).
- **DERROTA** es el gráfico de la transmisión sobre el feed, el record rueda en el bug y en el LED y la central se
  apaga. **AFUERA** sigue siendo el takeover: tapa la columna del stream (la página queda opaca, a la derecha se ve el
  estadio apagado) y el chat sigue al costado hasta "Fin de la transmisión".

**Archivos.** `js/partido.js` (el estadio, el reproductor, la serie y el Swiss con `op=final`), `estilos/partido.css`
(el bloque §4.8 al final), `js/ambiente.js` (`arena: { haces, publico }`, `uS.zw`), `js/fondo.js` (la escena
`estadio`), `js/competicion.js` (los logos salen ahora de `js/logos.js`: se cerró el pendiente de §4.7; quedan los
tricodes) y el bloque §4.7 · partido de `tokens.css` (`--led-*`, `--publico*`, `--stream-*`, `--panel-opaco`).

**Trasladable tal cual:** `crearEstadio` + `publicoSvg` (las pantallas en unidades de contenedor: el mismo estadio
escala del escenario al feed cambiando cinco variables), la escena `estadio` y `arena.haces/publico`, el reproductor
(`controlesPlayer`) y la página del stream. **Solo de prototipo:** los espectadores, el chat y el público son
decorativos (PRNG); la pantalla completa es la del navegador.

**Verificación (2026-10-10).**
- `verificar.mjs`: todo en verde.
- 0 errores de consola en todas las capturas (serie, replan, Swiss, sus resultados, sin WebGL, movimiento reducido,
  celular; y las opciones de §4.7 y sin `op`, sin cambios).
- Contraste por píxeles (`contraste-fusion.mjs`): 864 textos en 11 casos, 0 debajo de 4,5:1, el peor 5,34. Como el
  medidor salta lo `aria-hidden`, se midió aparte una copia que incluye las pantallas: 399 textos, 0 debajo (el "VS"
  daba 2,32 sobre el arte y el "?" 1,70: ahora van sobre placa y en `--ink-mute`).
- 390×844: la opción 1 entera arriba del pliegue en la serie y en el Swiss.

**Límites.** Sin WebGL el estadio está entero (es DOM), pero la sala queda en la luz de la era (el respaldo CSS no toma
la paleta del torneo). Las laterales en ángulo (`rotateY`) deforman un poco su letra, como una pantalla vista de
costado. La pantalla completa no se probó en el navegador headless.

<!-- separador: no tocar -->
<!-- separador: no tocar -->
<!-- separador: no tocar -->

### Decisión: la invitación y el capítulo con destinos

El usuario: *"en la decisión, el b y el c están bien pero el b está medio vacío, se podría hacer algo ahí más original o
mejorar el c"*. Abrir: `index.html#pantalla=decision&muestra=evento&op=final` (y `muestra=planAmateur`). Código:
`crearFinal` y `crearPortal` en `js/escena.js` (más el modo `final` de `crearEscena` y `crearPeso`), el bloque §4.8 al
final de `estilos/decision.css` y sus tokens en el bloque de la decisión de `tokens.css`. **El panel de las opciones no
cambia**: lo nuevo es el mundo alrededor.

**1 · La invitación es un portal.** La bisagra llega como "partida encontrada" (B), pero llena:
- **atrás**, el mundo de `escena` atenuado y desenfocado: tu lugar a la izquierda (CBLOL, FURIA, São Paulo), la LCK y
  Seúl a la derecha, el arco con el pulso que te llama;
- **el anillo es el borde de una ventana**: adentro se ve nítida la ciudad que llama (la N Seoul Tower, la Lotte, las
  ventanas), con el logo de la LCK adelante y el reloj dorado alrededor;
- el modal suma lo del cliente: el cupo ("Cupo de import", por el **tipo** del efecto `ofertaDeImport`), quién te invita
  y desde dónde (logo + LCK + "Seúl, Corea"), tu ruta (CBLOL → LCK) y Aceptar.

**2 · Aceptar abre el capítulo (C), con destinos.** El logo se disuelve, el borde del portal crece hasta salir de la
pantalla y la cámara se aleja de Seúl al mundo entero (0,14-1,4 s); cae la oscuridad del capítulo, entra "DECISIÓN
BISAGRA · 2032", los caminos se dibujan y el panel entra. Cada camino termina en **su destino**, arriba de su carta (lo que
arriesgás, antes → después, como en §4.7):
- el bootcamp: **Seúl** (logo de la LCK, "LCK · ida y vuelta"), sobre la ciudad de noche;
- seguir: **São Paulo** (logos de CBLOL y FURIA, "CBLOL · te quedás"), sobre tu ciudad, con ventanas tibias;
- la cerrada: **Corea** apagada (el logo en gris, "cerrada"), arriba a la derecha; su camino sube punteado y se corta en
  un candado.

Lo tuyo va a la izquierda y lo que te llama a la derecha, como en la escena: por eso el 2 queda a la izquierda del 1.
**Apuntar** un camino lleva el hueco de luz a su carta, enciende su ciudad (la otra se apaga) e inclina la cámara hacia
ese lado; apuntar la cerrada pone Seúl en gris y enciende el candado. **Elegir**: el otro destino y la cerrada se van, el
hueco de luz se abre sobre el elegido, su ciudad queda encendida, las barras van a los valores reales y el panel muestra
el resultado con los números rodando, como hoy. Si el panel crece hasta las cartas, el camino no se vuelve a dibujar: el
destino queda abierto en la luz.

**3 · Las demás.** Una decisión común con geografía lleva el capítulo atenuado (sin invitación, oscuridad a la mitad,
caminos tenues, sin rótulo). Sin geografía (el plan amateur, una decisión de vida) cae a la versión simple de §4.7: los
haces tenues sobre la luz de la era, con el campeón; los finales de los caminos ya no se meten debajo de la franja.

**Campo del evento → elemento** (se suma a la tabla de §4.7; nada sale de la prosa):

| Campo | `op=final` |
|---|---|
| `esBisagra` | el portal y el capítulo pleno (sin bisagra: el capítulo atenuado, sin invitación) |
| efecto con `liga` ≠ la tuya | la ciudad del portal, la del destino a la derecha y el "Te invita" (`LIGAS`: ciudad, región, hitos) |
| tipo de efecto en `CUPO` (`ofertaDeImport`) | "Cupo de import" en la invitación |
| `ficha.jugador.liga` / `org` + `LIGAS[liga].ciudad` | tu ciudad dibujada a la izquierda y el destino de "seguir" (logos de liga y club) |
| camino de cada opción (`leerEvento`: ir / viaje / casa / neutro) | el lado de su carta, su destino y su nombre corto (`CAMINO`: mudanza, ida y vuelta, te quedás); neutro: sin destino, en la luz de la era |
| `opcionesBloqueadas` | el destino apagado con la región (`LIGAS[liga].region`), el camino cortado y el candado |
| sin liga de destino | la versión simple (§4.7 `bisagra`) y, si es bisagra, la invitación del cliente |

**Trasladable:** `crearFinal` (el contrato de siempre más `invitacion` y `retardoAceptar`), el portal (`clip-path` que crece
desde el hueco del anillo + la cámara como `transform` desde el foco), `GEO_FINAL`, `GEO_CAP` y `T_FIN` (tiempos),
`destinoDe`, la cerrada partida con De Casteljau, y las tablas `CUPO` y `CAMINO`. **Solo de prototipo:** los logos del CDN y
los hitos dibujados solo para Seúl (São Paulo es una silueta genérica).

**Arreglo de paso.** `mercado.css` (que carga después) redefine `.logo` a 32 px y achicaba todos los logos de la
decisión, también los de `escena` y `cliente` de §4.7; los tamaños de la decisión ahora van con dos clases
(`.logo.esc-liga`…). Medido con INST y sin WebGL contra el código anterior: `bisagra` y "sin `op`" dan 0 píxeles
distintos; `escena` y `cliente` cambian solo en la caja de los logos.

**Verificación (2026-10-10, puerto 8132).**
- **Sin `op`, como hoy:** evento en reposo, apuntando la 1, el resultado, el plan y el celular contra el código anterior
  (INST, sin WebGL): **0 píxeles distintos** en los cinco.
- **Contraste** (la copia de `contraste.mjs` de la fusión, con "aceptar" y "apuntar"): 17 casos (la invitación, el capítulo,
  apuntar 1/2/la cerrada, elegir 1/2, el plan y su resultado, el celular antes y después de aceptar, cuatro eras más) →
  **1066 textos, 0 debajo de 4,5:1**, el peor 5,94 ("Cupo de import"). Las cartas del capítulo son `aria-hidden` y el
  medidor las saltea: con una copia que las mide, **1296 textos, 0 debajo**, el peor 5,83.
- 0 errores de consola y 0 `requestfailed` en todas las capturas (WebGL por SwiftShader, INST, sin WebGL, celular).
  `verificar.mjs` en verde.
- Hoja de contactos (no se versiona): la invitación, el capítulo en reposo, apuntando 1 y 2, el resultado y el plan, ×
  hoy y `final`; y la tira de "aceptar → capítulo" a 0/150/400/800/1500/2400 ms (a 1/50 de velocidad por CDP).

**Límites.**
- En el celular el panel tapa la banda de los destinos: hay portal, pero después del capítulo queda la ciudad abajo, sin
  caminos ni cartas.
- La invitación pinta el mundo dos veces (nítido en el portal y desenfocado atrás); el desenfocado se borra al abrir.
- Las cartas están fijas al lado de su destino: si el panel crece mucho, quedan arriba sin camino.

<!-- separador: no tocar -->
<!-- separador: no tocar -->
<!-- separador: no tocar -->

### Mercado: las ofertas que entran, el contrato animado y el telón del fichaje
El usuario: *"el A y el C están muy buenos eso de que se firme con animación […] y también una mini animación de cómo
van entrando las ofertas […] lo que no me copa tanto es el campeón atrás, se podría hacer algo más que represente el
mercado de pases"*. `op=final` es **la mesa (A) + los logos que llegan (C), sin campeón**: el fondo es el fichaje.
Hash: `#pantalla=mercado&muestra=mercado&op=final` y `…&muestra=firma&op=final`. Sin `op` y con `mesa|anuncio|orgs`,
todo queda como estaba (las funciones nuevas son aparte: `crearOfertasFinal`, `crearFirmaFinal`).

| Pieza | Qué es |
|---|---|
| **La pared** (sin campeón) | La pantalla declara `arte: null` y el mundo de atrás es una capa propia (`.mk-pared`, fija, detrás de los paneles). En reposo, arriba a la izquierda, **el tablero de la ventana de pases**: un tablero de paletas (estilo aeropuerto) con los movimientos reales de `mercadoDelMundo` (los 6 `traspasosMundo`: logo, jugador, rol, club, liga, FIRMÓ/ACADEMIA, y los 2 `asientosAbiertos` como VACANTE · ABIERTO). Cada letra es una tira que cae hasta la justa (`steps()`, las letras de paso salen del PRNG decorativo). El tablero es `aria-hidden`: el lector tiene la lista "Mientras tanto" con la frase entera del motor. |
| **El telón de prensa** | Apuntar una fila (mouse, flechas, Tab) lleva la pared al **step-and-repeat de esa org**: su logo en patrón (`<img>` de `js/logos.js`, 14 × 8; el escudo-monograma en las inventadas), sus colores (`--org-*`/`--org-*-hondo`) y la luz cálida de una sala de conferencias (`--telon-luz`). Entra a los 120 ms y vuelve al tablero a los 600, como el aura de los campeones. Las orgs inventadas de la muestra tienen un tono distinto cada una (en el orden de la tabla): con el hash de `tonoOrg`, tres de las cuatro caían en el mismo. |
| **La entrada** | Las ofertas **llegan una por una a la pared**, como los logos de C: de la de menos sueldo a la de más, de lejos y desenfocadas, con su nombre y su sueldo; **tamaño = sueldo** (60-150 px), **altura = jerarquía proyectada**. Mientras están en la pared, el tablero espera en penumbra y la tabla es un esqueleto (las teclas 1-6 y sus líneas: los lugares que esperan). Después cada logo **baja a su fila** (en el orden de la tabla) y la fila se llena al aterrizar; el tablero se despierta (las letras caen) y el contrato se apoya en la mesa. **2,45 s**; Espacio la saltea; con INST o movimiento reducido no existe (todo quieto en su lugar). |
| **El contrato** | El de `mesa` (`crearContrato`), a la derecha, con el alto de la mesa: apuntar otra fila cambia de hoja. **Enter firma** (1-6 eligen directo): la pared se apaga (`--mk-silencio-hondo`), la tabla se aparta, el documento se levanta, el handle se traza (0,42-1,47 s), la rúbrica, y **el sello cae** acelerando, se aplasta y se asienta (1,65-2,03 s). **El golpe** (1,92 s): la onda del sello, la mesa que tiembla 220 ms, el pulso de logro y el acorde. Con el golpe **se prende la conferencia**: el telón de la elegida queda y empiezan los flashes de cámara. Después, la prueba de ingreso (2,3 s); con LOUD, la firma (3,9 s). |
| **Los flashes** | Decorativos (PRNG `comun/azar.js`, semilla por org y handle): un punto blanco con su halo, la estría de la lente y un lavado suave de la sala, detrás de los paneles (no tocan el contraste del texto). Entre uno y otro, 360-640 ms: **≤ 3 por segundo**. Con movimiento reducido no hay ninguno. |
| **La firma (LOUD)** | El takeover de siempre (la luz de la pieza a la de la academia, LOUD letra por letra, el sueldo que rueda, el handle trazado en luz) con la escenografía del fichaje: **el telón de LOUD en lugar de tu campeón**, que aparece cuando **la luz se abre** (una rendija sobre el logo que se abre a toda la pared, 1,3 s), el logo de LOUD en el foco y los flashes mientras firmás (desde 1,75 s). El resto del mercado queda para el lector. |

**Hoja de contactos** (no se versiona; `scratchpad/fm/shots/h2/`): filas entrada (1,5 s) / reposo con el tablero /
apuntando LOUD / apuntando Onda Collective / el sello / la firma de LOUD; columnas hoy y `final`; más las tiras de la
entrada, de la firma de LOUD y del momento de firmar (0-2400 ms, congeladas con `vitrina.repetir()`/`elegir()` +
`congelar(t)`: todo se programa de una vez).

**Verificación (2026-10-10, puerto 8133):**
- Contraste por píxeles (la copia de `contraste-fusion.mjs`, con apuntar): 14 casos (reposo, las 6 orgs apuntadas, firmar
  LOUD y una inventada, la firma, reducido, sin WebGL, dos celulares) → **1147 textos, 0 debajo de 4,5:1**; el peor, 6,13
  ("Mid" de la franja, 11 px). El tablero, las etiquetas de la llegada y los flashes son `aria-hidden` (no se miden).
- `verificar.mjs` en verde; 0 errores de consola y 0 `requestfailed` en todas las capturas.
- Recorrido con teclado: Espacio saltea la entrada (0 viajeros, 0 animaciones vivas), ↓ apunta LOUD (foco, telón y
  contrato), Enter firma (sello, foco en la tarjeta, flashes, telón de LOUD) y encadena a la firma; "Volver a decidir"
  después de firmar no encadena; 3 firma con Ecos Force ("Hasta acá llega esta muestra").

**Trasladable:** el tablero (`crearTablero`: paletas con tiras y `steps()`), el telón (`crearTelon`) y la regla "el fondo
del mercado es el fichaje" (`arte: null` + una capa de pared), la entrada por llegada (`programarLlegadas`: mide los
destinos y programa todo de una vez), el sello con golpe, los flashes con su tope de frecuencia.
**Solo de prototipo:** los flashes y las letras de paso del tablero (PRNG decorativo), el salto a la muestra `firma`.

**Límites.** En el celular no hay pared (ni tablero, ni telón, ni llegada): la tabla y el contrato, como en `mesa`. Si la
pantalla es más baja que 900 px, el tablero se recorta abajo. El tablero muestra 8 filas: si el motor trae más
movimientos, el resto queda solo en la lista del lector (que los tiene todos).

## Una línea, `op=linea` (PLANUI §4.9)

El contrato de esta ronda (las 8 reglas, las interfaces fijadas, los dueños de cada archivo, lo que rechaza el
verificador) está en [`LINEA.md`](LINEA.md). Cada worker escribe solo su subsección.

### El kit de la línea (K): el color, el tono, la costura, la ceremonia y la transmisión

La hoja del kit es [`linea.html`](linea.html): la costura en vivo atrás (cara a cara Sylas | Ahri, la bisagra CBLOL |
LCK, un lado solo tono, apagada; posición, ángulo y el aura del lado A), el mismo campeón en cinco tonos, las cuatro
ceremonias con «Repetir», el marcador, la placa, la cinta y el odómetro. `#reducido=1`, `#inst=1` y `#webgl=0` muestran
el camino quieto y el respaldo CSS. Para las capturas: `window.linea = { listo(), costura(n), ceremonia(n), presionar(),
congelar(ms), cuadros() }`.

**El color (`js/color.js`).** La política nueva `linea` es la receta (piezas 65 %, fondo 60 % de color real) más
`momento: { fondo: 0.7, pieza: 0.7 }`. Con `op=linea` y sin `color=` es la de defecto (`colorDeOp(op)`). Siempre en
duotono quedan solo el inicio y las eras; el título, la firma y el camino `takeover` de `conColor` usan `c.momento ??
duotono`. Las otras cinco políticas no cambian (medido abajo).

**El segundo tono (`js/tono.js` + el bloque K de `tokens.css`).** Un tono son nombres de token, nunca hex:

```js
import { tonoDe, tonoEra, tonoCompeticion, tonoDestino, tonoOrg, TONO_ORO, TONO_PLATA, parecidos, separar, aplicarTono, paletaDe } from './tono.js';
tonoCompeticion('lck')            // { id: 'lck', luz: '--tono-lck-luz', contra, acento, noche, vacio }
tonoDestino('CBLOL')              // el de su competición; si su luz es blanca, la contra pasa a ser la luz (rojo CBLOL / azul LCK)
tonoOrg('Movistar KOI')           // real: medido de su logo; inventada ('Vórtice Squad'): la paleta del sistema por hash
tonoDe({ pantalla: 'cumbre', muestra: 'titulo' })  // sin contexto: oro en el título, la era de <html> en el resto
tonoDe({ contexto: { tipo: 'org', clave: 'LOUD' } })
parecidos(tonoOrg('RED Canids Kalunga'), tonoOrg('Fluxo W7M'))  // true: matiz a < 38° (o los dos blancos)
separar(tA, tB, tonoCompeticion('cblol'))  // si se parecen, B toma la contra de la competición (o su propia contra)
aplicarTono(nodo, tono)           // --tono-luz/-contra/-acento/-noche/-vacio = var(--tono-<id>-x); null las saca
paletaDe(tono)                    // { luz, contra, noche, vacio, k: 1 } para ambiente({ paleta })
```

Tokens: `--tono-era-<era>-*` (5), `--tono-<comp>-*` (9), `--tono-org-<slug>-*` (las 43 orgs reales de `js/logos.js`),
`--tono-org-p1…p4-*` (inventadas), `--tono-oro-*`, `--tono-plata-*`. La noche es un oscuro del matiz del tono (L 7,5 %),
el vacío uno más hondo (L 3,4 %); el matiz sale de la luz o, si la luz es blanca (croma < 0,25), de la contra. Las
orgs: el color dominante de cada logo medido por píxeles con un script offline de Playwright (nunca un canvas de la
página); con < 8 % de píxeles con color el logo es blanco: la luz es ese blanco y la contra su acento medido o una
decisión anotada. Cada línea de `tokens.css` dice de dónde sale (p. ej. LOUD #13ff00 100 %, Movistar KOI #4b9bec,
Karmine Corp #00e7ff, RED #b52433 14 % + blanco, Fluxo #ea2267 + #b520e0, FURIA blanco + acero frío, decisión). Todo
acento de org se lee ≥ 6,5:1 sobre el panel. Variables de ejecución con defecto en tokens.css: `--tono-luz: var(--luz)`,
`--tono-contra`, `--tono-acento`, `--tono-noche: var(--bg-surface)`, `--tono-vacio: var(--bg-void)`.

**El ambiente (`js/ambiente.js`, `js/fondo.js`, `js/main.js`).**

```js
amb.ambiente({ paleta: paletaDe(tonoCompeticion('lpl')), cruce: 750 })   // tiñe la luz Y la noche/vacío; cruza en 750 ms
amb.ambiente({ costura: { a: { arte: 'Sylas', tono: tA }, b: { arte: 'Ahri', tono: tB }, posicion: 0.5, angulo: 12, k: 1 }, cruce: 750 })
amb.ambiente({ costura: { b: { arte: null } } })   // parcial: B queda solo luz en su tono (el logo va como <img> encima)
amb.ambiente({ costura: { posicion: 0.62 } })      // la decisión: apuntar un camino corre la costura hacia su lado
amb.ambiente({ arte: 'Yone' })                     // con la costura prendida cambia el lado A (el aura sigue andando)
amb.ambiente({ costura: null })                    // apagada
amb.ambiente({ lightsticks: 1 })                   // el público en bokeh del tono, abajo, con vaivén (nunca cabezas)
amb.costura()   // { k, posicion, angulo, vertical, a: { x, y }, b: { x, y } } en fracciones de pantalla, y desde arriba
```

- La costura la dibuja el shader con la misma cuenta del bitono del inicio (sombras = noche, luces = luz, el filo de
  contra que mira a la costura, las luces altas, el barrido, el grano, el campo de luz alrededor de cada cara) y el color
  de pieza de la política (65 %). La línea: un núcleo casi blanco de ~1,4 px, un halo en los dos tonos que respira, una
  deriva lenta y chispas que corren a lo largo; se traza de abajo hacia arriba al prenderse. Cada mitad tiene su
  abanico de haces desde arriba de la línea; la fuente y la contra de la era ceden (si no, un lado quedaba lavado).
- Texturas: 3 (las dos del cruce del campeón = lado A; la tercera = lado B, unidad 4). Al cambiar el arte de B, B se
  apaga y se vuelve a encender en ese lado (medio `cruce` cada mitad): un cruce sin cuarta textura.
- En el celular (`encuadre: 'celular'`) se parte en vertical: A arriba, B abajo (`posicion` desde arriba).
- `escena: 'costura'` (fondo.js): el campeón de siempre a 0 en reposo, aura y momento (sin campeón doble), luz 1 y
  polvo 1,4 (el estadio: 0,85 y 1,1); en el takeover vuelve al 100 % y la costura se va (el campo nuevo `costura` de
  los estados: 1 en todas las políticas, 0 solo en ese takeover).
- Sin WebGL: la paleta pisa `--luz-<era>`/`--contra-<era>` y la noche de la capa CSS; la costura son dos capas con
  `clip-path` (fondo y arte en su tono) y una línea con brillo. Sin lightsticks.
- Las fábricas de pantalla pueden devolver `costura`, `cruce`, `lightsticks` y `tono`; main.js los reenvía como la
  `paleta`. Con `op=linea`: si la pantalla no declara `tono`, va el de su contexto (la era; el oro en el título) a
  `<html>` (aplicarTono) y, si no trae paleta, al mundo; la arena queda apagada; el partido trae los lightsticks
  prendidos; los velos (`--velo-*`) se tiñen del vacío del tono (`estilos/linea.css`). `pausar/reanudar` (el mensaje
  de variantes.html y de final.html) llegan también a la pantalla (`actual.pausar?.()`).

**La ceremonia (`js/ceremonia.js`, `estilos/ceremonia.css`).** Hextech propio: filete de oro en degradé
(`--ln-oro-claro` #f4e4b4 → `--ln-oro` #c9a45a → `--ln-oro-hondo` #6b4f22), relleno petróleo (`--ln-petroleo*`), el
turquesa `--ln-turquesa` #5fd9d1 (10,2:1 sobre el petróleo hondo; solo brillo). Sin esquineros. ≤ 1 destello por gesto.

```js
const a = anilloAceptar({ escudo: imgLogoLCK, encabezado: '¡Oferta encontrada!', cola: 'Cupo de import · LCK', tono: tonoDestino('LCK'), segundos: 12, alAceptar, sonido });
contenedor.append(a.nodo);  // fixed sobre la pantalla; adentro de un [data-ln-caja], absoluto en su caja. a.aceptar(), a.destruir(), a.animaciones
const b = bloquear({ texto: 'Firmar', alBloquear, sonido });   // el look del BLOQUEAR del inicio (con --tono-luz); Enter
b.habilitar(false); b.bloquear();                              // al bloquear: el anillo de destello y el estado bloqueado
const v = victoriaDerrota({ gano: true, sub: 'Mapa 2 · 1-1 · Corki', retardo: 0 });   // { nodo, animaciones }
const anims = quemar(nodoCarta, { retardo: 200, sonido });     // nodoCarta: un contenedor (la carta con su retrato)
```

El aro es un trazo SVG que se vacía con WAAPI (con una cabeza brillante en la punta); al llegar a cero llama
`alAceptar` solo si el reloj real corrió todo el tiempo (si alguien lo busca con congelar, no dispara). Con movimiento
reducido o INST: aro lleno y quieto, sin entrada sola, todo en su estado final.

**La transmisión (`js/transmision.js`, `estilos/transmision.css`).** Usa el acento del tono (`--tono-acento` de un
ancestro, o `tono` en la placa):

```js
const mc = marcador({ comp: competicionDe(datos, 'serieReplan'), rotulo: 'Cuartos de final', local: { nombre, sigla, logo: logoOrg(nombre) }, visita, formato: 5, mapas: [] });
mc.actualizar({ mapas: [{ resultado: 'L' }, { resultado: 'W' }] });   // los pips y el golpe del número (resultado desde el local)
placaInferior({ rotulo: 'Mapa 2 · cuartos de final', titulo: m.cierre, sub: 'RED 1–1 LOS · al mejor de 5', tono })
cinta({ rotulo: 'Mientras tanto', items: traspasos.map((t) => ({ texto: t.motivo, logo: logoOrg(t.org) })) })   // quieta con reducido/INST
```

**Los sonidos (`js/sonido.js`).** `ding`, `golpe`, `quemado`, `confeti`, `victoria`, `derrota`, `flash`: WebAudio
sintetizado (el ruido del PRNG común), mudos con el sonido apagado. Se llaman `sonido.golpe?.()`.

**El odómetro (`js/util.js`, `estilos/base.css`).** Rueda con expo-out (el resorte se pasaba de largo y con un salto de
varios dígitos dejaba ver los vecinos) y cada columna se funde en sus bordes (`--ln-odo-borde`, medido: el dígito de
Mona Sans 900 ocupa de 0,15 a 0,9 em de su celda). Vale para todas las pantallas.

**`final.html`.** Cada pestaña es `{ op: 'linea', antes: 'final' | null }` (decisión, serie, Swiss, mercado y firma
contra la final de §4.8; el título contra sin op; el inicio no cambia: es la referencia). `0` alterna, `←` `→` y `R`
siguen igual. «Las 7 juntas» muestra `../referencia/linea/hoja-de-contactos.jpg` (la pide recién al abrirse; si no
existe, queda el texto «se arma al final de la ronda»).

**Verificación (2026-10-10, puerto 8111).**
- `verificar.mjs` en verde.
- Sin cambios donde no hay `op=linea`: capturas del código de antes (`8bae46c`) contra el nuevo, congeladas a 6000 ms,
  23 casos (sin op × 8 pantallas, `final` × 5, `luz`/`transmision`/`escenario`/`escena`/`cliente`/`bisagra`/`mesa`/
  `orgs`/`anuncio`, `color=real`): 20 con máx. ≤ 23 niveles y p99,9 ≤ 4; los otros 3 (la serie sin op, la decisión
  `final`, `mesa`) varían igual entre dos corridas del MISMO código (5,2 %, 3,2 %, 2,1 % de píxeles): no son del kit.
- 0 errores de consola y 0 requestfailed: 10 pantallas × (sin op, `final`, `linea`), `webgl=0` y `peor=1` en serie y
  mercado (con y sin `linea`), `opciones.html`, `variantes.html`, `linea.html` (y `#webgl=0`, `#reducido=1`),
  `final.html` (salvo un 404 en «Las 7 juntas» mientras no exista la hoja).
- La política: con `op=linea`, la serie da piezas 0,65, fondo 0,6 y takeover 0,7; la firma y el título 0,7; el
  inicio 0.
- La paleta: una zona oscura pasa de (7, 14, 32) a (32, 5, 5) con la paleta del LPL, y el cruce de 750 ms termina a
  los 750 ms (0 / 250 / 500 / 750 / 1000 ms); solo la noche y el vacío (misma luz): (7, 14, 32) → (13, 13, 28).
- La costura: 30 cuadros/s (el tope del ambiente) a 1440×900, 1920×1080 y 390×844, cara a cara y un lado solo tono
  (Chromium con la GPU real, ANGLE D3D11, RTX 2060).
- Contraste por píxeles (captura con y sin texto; el glifo son los píxeles que cambian; percentil 10): 26 textos de la
  ceremonia y la transmisión a 1440×900, el peor 4,65:1 (el BLOQUEAR encendido, el mismo look del inicio); 23 a 390×844,
  el peor 4,84:1.

**Límites.** La costura sin WebGL es más simple (sin halo en dos tonos ni chispas). El lado solo tono pone un foco de su
luz donde va el logo; el `<img>` lo ubica la pantalla con `amb.costura().b`. `quemar` desatura los hijos de la carta
(un `<img>` suelto no sirve: va adentro de un contenedor). El aviso escucha Enter en el documento mientras está montado:
la pantalla no tiene que manejar esa tecla.

<!-- separador: no tocar -->
<!-- separador: no tocar -->
<!-- separador: no tocar -->

### Los momentos (M): `beats.js`, la copa, el confeti y el título

*(lo escribe M)*

<!-- separador: no tocar -->
<!-- separador: no tocar -->
<!-- separador: no tocar -->

### La transmisión (A): la serie y el Swiss

*(lo escribe A)*

<!-- separador: no tocar -->
<!-- separador: no tocar -->
<!-- separador: no tocar -->

### La decisión (B): ¡OFERTA ENCONTRADA! y la costura

*(lo escribe B)*

<!-- separador: no tocar -->
<!-- separador: no tocar -->
<!-- separador: no tocar -->

### El mercado y la firma (C): tu segunda selección y el anuncio

*(lo escribe C)*

<!-- separador: no tocar -->
<!-- separador: no tocar -->
<!-- separador: no tocar -->

### La unificación (ola 3)

*(lo escribe U)*
