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
