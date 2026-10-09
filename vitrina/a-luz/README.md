# A · LUZ — *"Tu carrera, iluminada."*

**Concepto.** Una carrera de LoL se vive de noche, y esta dirección la cuenta con luz: un ambiente WebGL de haces
volumétricos, bruma, polvo y bokeh que cambia de "equipo de luz" con la era (el monitor de la pieza → los tubos de la
sala → el estadio → el oro del Mundial → el atardecer). El campeón vive **adentro** de esa luz (splash en duotono, mezclado
en "pantalla" con los haces), el contenido se apoya sobre ella sin cajas y la tipografía hace el resto (Mona Sans de 56 a
214 px contra Geist 17 y Geist Mono 11-13).

**Ronda 1b (ampliada).** Lo que el usuario amó de A, el aura (apuntar un campeón cambia la luz con una transición),
ahora está en todo el juego con un solo mecanismo (`js/aura.js`); el splash es un plano vivo animado por el shader; cambiar
de pantalla es una transición de luz; y hay pantallas nuevas: `partido` (la serie con Fearless, el replan, el Swiss del
Mundial) y `mercado` (las ofertas y el momento de la firma).

Servir: `node vitrina/servir.mjs --puerto 8111` → `http://127.0.0.1:8111/a-luz/index.html`.
Capturas: `node vitrina/comun/capturar.mjs --puerto 8111 --direccion a-luz` (quedan en `capturas/`, no se versionan).

## Pantallas

| Pantalla | Qué hay |
|---|---|
| Inicio | Intro de ~3 s la primera vez (brillo de monitor → "15 años. Una pieza." → la luz se abre → UN SPLIT MÁS), salteable con Espacio/clic; ▶ Repetir la vuelve a pasar. Selección: invocador, servidor (8 regiones con su liga y su línea), perfil en una línea, 5 roles como glifos sobre la Grieta, la grilla de 17 retratos del rol (el apuntado pasa a ser el arte del ambiente con un cruce), 3 ranuras y BLOQUEAR que se enciende con 3 mains. A la derecha: "Continuar" como placa con el arte del main en duotono, el desafío del día y el historial. |
| Decisión `evento` | El relato del split entra beat por beat (ícono por tipo) y se pliega en la línea "antes" (el split completo a un toque). Rótulo, título ≤ 56 px con máscara por línea, planteo en una línea + "más". Opciones como franjas de luz: label + glifos (ícono del eje + ▲/▲▲/▲▲▲ o ▼ por cantidad, riesgo como ícono + nombre, % como medidor). La prosa de a una en el inspector (hover, ↑↓, Tab); 1-4 eligen. La opción bloqueada muestra su candado y su motivo en el inspector. Panel "vos" como placa translúcida. |
| Decisión `planAmateur` | La matriz: opciones en filas, ejes en columnas (SoloQ, Estudios, Sueño, Casa, Cabeza) con el valor actual como referente en el encabezado, barras alineadas (divergentes si la columna mezcla signos), riesgo en casa como medidor + marcas de deuda de sueño (s3). "Tu perfil" y la rareza como etiquetas. |
| Elegir (las dos) | La fila elegida crece y se vuelve la tarjeta de **su** resultado real (`resultados[opcionId]`): el texto del motor, los números que cambiaron rodando por dígito (odómetro con resorte) con ▲/▼ y "antes N", el rango que cambia con un barrido, "hasta la próxima parada"; los mismos números ruedan en el panel y en la franja. |
| Cumbre `titulo` | Takeover ≤ 2,4 s, salteable: la luz sube al oro (era `mundial` + `gloria`), CAMPEONES letra por letra con un barrido especular, liga/año en mono, la serie mapa por mapa, el plantel como créditos (el tuyo en oro), polvo dorado con el PRNG común. Espacio/botón → la carta. |
| Cumbre `final` | Veredicto en titular (LEYENDA), 1.494 pts con percentil, totales, el escalón siguiente; la carta holográfica 5:7 (arte de carga de Yone en duotono de la rareza; Golden Road = variante dorada; se inclina ±12°, brillo y foil siguen al puntero); la trayectoria dibujada (curva de nivel por split, cinta de orgs, hitos, Golden Road 2036). |
| Eras | La página entera en la era activa (el panel la cambia) y abajo la tira de las cinco a escala: la misma composición fotografiada con el mismo shader, cada una con su equipo de luz y el campeón de ese año. Clic en una = cambia la era de la página. |
| **El aura** (1b) | Todo lo que muestra un campeón lleva `data-campeon`: la grilla y las ranuras del inicio, la placa "Continuar", la pared de Fearless, los picks de cada mapa (tuyos y del rival), los quemados del rival, el `campeonDelSplit` de la placa "vos" y los picks del takeover del título. Apuntarlo (hover o Tab) lleva el ambiente a ese campeón: entra a los 120 ms, cruza en 750 ms, vuelve al campeón de la pantalla 600 ms después de soltar. En el inicio es pegajosa (el último apuntado queda: es la selección). En las paradas el ambiente sigue quieto; el aura responde a tu mano. Las opciones dan un pulso leve de luz al apuntarlas. |
| **Transiciones** (1b) | Cambiar de pantalla o de muestra: lo viejo sale en 160 ms (fundido + desenfoque), el ambiente ya cruza de era/campeón con un pulso leve, y lo nuevo entra con su orden (luz → rótulo → título → opciones). INST o movimiento reducido: instantáneo. |
| Partido `serie` (1b) | La final al Bo5 con Fearless. **La pared de retratos** (arte de carga 308×560 en el duotono de la era, abajo a la derecha): libres encendidos con un filo de luz, quemados apagados (sin color, sin luz, nombre tachado, llama + mapa). Los 3 planes como franjas: label + "el decisivo NN%" y al lado 5 barritas (la p de cada mapa, medida desde el 50%: la moneda al aire) y el % de la serie grande. La previa general como tira chica (79% de ganar el mapa 1, 60 vs 47, Vos/Compañeros/Meta/Campeón/Química con color; el "por qué" a un toque). La prosa del plan en el inspector, con el "mapa a mapa" del motor. **Elegir** juega la serie mapa a mapa (~4,5 s, salteable con clic/Espacio): el plan se vuelve la cabecera, el marcador rueda paso a paso, cada mapa muestra tu pick contra el del rival y la p de antes, VICTORIA con luz de oro o DERROTA desaturada; la pared se quema en vivo (tu pick y el del rival, también si era uno de los tuyos) y su contador rueda. Al final la luz cae (perdiste 3-1), sube (gloria) o queda en tensión (2-2: la serie sigue en la parada que dice el motor). |
| Partido `serieReplan` (1b) | "Te leyeron": el aviso entra y **la luz se quiebra** un instante (bandas que se corren y se desaturan; ánimo peligro que se recupera en ~1 s); la luz de la pantalla es Sylas, el que te quemaron. La pared: Sylas apagado ("Te lo leyeron", en rojo), Anivia M1, Corki M2, y "y del rival: Ahri, Azir". Los planes con las barritas de los mapas que faltan. |
| Partido `swiss` (1b) | El 2-2 del Mundial a pantalla completa en la luz de oro: el **2–2 enorme** (172 px), "Ganás: cuartos. / Perdés: a casa.", el camino R1-R4 (rival, liga, resultado) y R5 hoy; la previa como placa (19%, FURIA 70 vs Movistar KOI 84, el desglose; el porqué a un toque). **Elegir** juega el Bo1: con la charla, su beat; el mapa con la p de antes (42% con la charla, 19% sin) que se llena; DERROTA; el récord rueda a 2–3 y "Ganás: cuartos" se tacha; **la luz cae** (ánimo `caida`: sin color, sin latido) y **AFUERA** entra despacio, sin estridencia, con el mensaje del motor y lo que cambió (arraigo, hype, Mundiales jugados). Es el resultado real: las dos opciones pierden. |
| Mercado `mercado` (1b) | Las 6 ofertas como franjas alineadas (subgrid): el club con su color **solo en el chip** + liga y tier, el sueldo en mono con barra (referente: tu valor), los años como pips, la jerarquía proyectada como barra con su etiqueta, y el plantel al que llegás como ícono + nombre corto + puesto (de `plantelEnLiga`, no de la prosa). La prosa (descripción, demanda, riesgo, arraigo, negociación) en el inspector. A la derecha, "vos en el mercado" y el mundo que se mueve. **Elegir** → "→ la prueba de ingreso en <club>". Con LOUD (lo que pasó de verdad) encadena a la firma a los 1,9 s; con las otras dice que el motor no jugó esa prueba y ofrece ver lo que pasó. |
| Mercado `firma` (1b) | Takeover del primer contrato (≤ 2,4 s, salteable, Repetir/R lo vuelve a pasar en el lugar): la luz de la pieza (el monitor) se abre en la de academia (los tubos de la sala de práctica), LOUD gigante letra por letra con un barrido, USD 40.000 rodando en mono, CBLOL 2029 · 1 año · Transferencia, **tu handle trazado como firma de luz** (SVG: el trazo se dibuja y se llena) con la rúbrica, y quién firmó en los puestos que te ofrecían. |
| Celular | La misma página a 390×844: franja de dos líneas, opciones con "más" (una sola descripción a la vez), la matriz en columnas compactas, "ver contexto" abre el panel como hoja, barra de cuartos fija abajo. Ronda 1b: la pared de Fearless como **tira horizontal** (retratos de 64 px, con scroll) antes de los planes; los planes con las barritas en una segunda fila; el camino del Swiss con scroll; el mercado en filas de dos columnas con "más"; la firma compacta. |

## Tokens (`estilos/tokens.css`, único archivo con colores)

| Token | Valor | Uso |
|---|---|---|
| `--bg-void` / `--bg-surface` | `#04050a` / `#0a0d16` | el vacío y la noche |
| `--ink` / `--ink-dim` / `--ink-mute` | `#f4f6fb` / `#a9b3c7` / `#7c879c` | tintas |
| `--up` / `--down` / `--warn` | `#3df2a0` / `#ff5468` / `#ffb547` | sube, baja, riesgo |
| `--gold` | `#ffd27a` | logro (cumbre, títulos, Golden Road) |
| `--luz-<era>` / `--contra-<era>` | pieza `#2f6bff`/`#ffb45a` · academia `#43e6c3`/`#e8f6ff` · escenario `#7fa8ff`/`#ff3da8` · mundial `#ffc94d`/`#fff3d6` · leyenda `#ff9a5a`/`#ff4f7a` | los equipos de luz; `html[data-era]` elige `--luz` y `--contra` |
| `--luz-texto` / `--luz-suave` / `--luz-tenue` / `--luz-fuerte` | `color-mix` de `--luz` | texto acentuado (≥ 4,5:1) y halos |
| `--placa`, `--franja-fondo`, `--velo-*`, `--linea*` | translúcidos `#rrggbbaa` | la placa sin desenfoque, la franja, el velo de lectura, las líneas |
| `--rank-*`, `--nivel-*`, `--carta-*`, `--foil-*` | | rangos, bandas, rarezas de la carta, foil |
| `--org-loud` / `--org-furia` / `--org-p1..p4` / `--org-tinta` | `#3dff7e` / `#ececf2` / `#ff8a63` `#c2a0ff` `#5fd0f2` `#f5cf5a` / `#05060b` | el color de cada club, **solo en su chip** (los reales, el suyo; los inventados, la paleta por hash del nombre) |
| `--t-parada` 56 · `--t-opcion` 26 · `--t-gigante` 128 · `--t-mono` 12 | | escala tipográfica |
| `--margen` 96 a 1440 · `--franja-alto` 56 · `--tray-alto` 28 | | retícula de 12 columnas |
| `--expo` · `--salida` · `--r-placa` 2 · `--r-carta` 18 · `--r-pildora` | | movimiento y radios (distintos a propósito) |

## Efectos (`js/`)

| Archivo | Qué hace |
|---|---|
| `ambiente.js` | **1b, el splash vivo:** el arte se muestrea como un plano 2,5D (profundidad falsa = luminancia + la cara en primer plano + un degradé vertical) con parallax al puntero y una deriva Ken Burns; las luces altas fluyen con ruido; un barrido de luz cruza al campeón cada 11 s; polvo lejano detrás y brasas que suben delante (según la era). "Vivo" vale 1 en el inicio, el relato, la cumbre, la firma y la serie jugada, y 0,2 en las paradas (respira). Nuevo: ánimo `caida` (la luz cae: sin color, sin latido), `quiebre(retardo)` (la luz se quiebra un instante), `retardo` en `ambiente()`/`pulso()` (los cambios se programan en el reloj del ambiente: las tiras congeladas los dibujan fieles), `cruce` (duración del cruce de arte) y una cola: si llega otro campeón mientras dura un cruce, espera a que termine (con 2 texturas, reemplazar la que se está yendo sería un salto). **Sigue en 2 texturas**: el aura usa las mismas dos ranuras. Respaldo CSS: deriva lenta del arte, `caida` y `quiebre` con filtros. — El contrato de `comun/ambiente.md` en WebGL2: un fragment shader (fbm de bruma, 7 haces con abanico por era, luz de contra, polvo que solo brilla adentro del haz, bokeh, tubos, monitor), splash centrado del campeón en duotono mezclado en pantalla, transiciones de era de 1,3 s, ánimos (peligro desatura y late a 0,8 Hz, gloria sube el bloom y decae), pulsos, `aquietar()` (≤ 0,8 s) cuando aparece una parada, parallax ≤ 8 px. Escala 0,5, ≤ 30 fps, 2 texturas, pausa con la pestaña oculta, pérdida de contexto → cae al respaldo. Todo es función del reloj del ambiente: `congelar(t)` dibuja exactamente el instante t. Respaldo CSS (radiales + haces con `conic-gradient` + duotono en canvas 2D). `fotografiar()` saca las fotos de la tira de eras con el mismo shader. |
| `aura.js` | (1b) El foco de campeón: un solo mecanismo delegado en el documento (`pointerover`/`focusin` sobre `[data-campeon]`), con retardo de entrada, cruce y vuelta; `pantalla(key, {pegajosa})` declara el campeón de cada pantalla; `claveCampeon()` normaliza (solo letras). |
| `partido.js` | (1b) La serie (pared, planes, previa, la serie mapa a mapa) y el Swiss (2-2, camino, Bo1, AFUERA). Todo lo de elegir se programa de una vez (WAAPI con retardo + `retardo` del ambiente): `congelar(t)` fotografía cualquier instante. |
| `mercado.js` | (1b) Las ofertas (tabla con subgrid + inspector) y el takeover de la firma. |
| `util.js` | (1b: `plegar()` — lo que se va al elegir se pliega ya y un fantasma se apaga encima, así una tira congelada tiene el layout final) DOM, modos (reducido/INST: nada se anima), `animar()` sobre WAAPI con `fill: backwards` (lo terminado sale de `getAnimations()`, así una tira no rebobina entradas viejas), `esperar()` como reloj congelable, odómetro por dígito, títulos en líneas con máscara, duotono 2D. |
| `iconos.js` | Glifos propios: un ícono por eje del motor, por riesgo y por tipo de beat; ▲/▼ por cantidad; los roles dibujados sobre el mapa de la Grieta. |
| `marco.js` | Franja de 56 px, trayectoria mínima de 28 px (de los 15 al presente, por org), placa "vos", el rodar de los números en el panel, barra de cuartos. |
| `decision.js` | Relato, parada, opciones por glifos, inspector, matriz, y la opción que se transforma en su resultado. |
| `cumbre.js` | Takeover y carta holográfica + trayectoria dibujada. |
| `inicio.js` | Intro y selección. |
| `eras.js` | Página en la era activa + tira de las cinco. |
| `sonido.js` | Opcional (apagado): clic, barrido, multitud (ruido filtrado del PRNG), acorde. WebAudio, sin archivos. |
| `main.js` | Panel, montaje de pantallas, intermediario del ambiente (se recrea al prender/apagar WebGL), `listo()`, `congelar` relativo a la última acción (para que las tiras y el ambiente marquen el mismo instante). |

## Trasladable tal cual / solo prototipo

**Tal cual al juego:** los tokens; `ambiente.js` (contrato + shader + respaldo); `util.js` (animar/odómetro/duotono);
`iconos.js`; la franja, la placa, la trayectoria; el patrón opción-glifos + inspector + matriz; la transformación
opción → resultado; el takeover y la carta; las curvas (`--expo`, el resorte `linear()`).

**Ronda 1b, tal cual al juego:** `aura.js` (mecanismo y tiempos), el splash vivo del shader, la transición de pantalla
(`montar` de `main.js`), la pared de Fearless, los planes con barritas desde el 50%, la serie mapa a mapa, el Swiss con la
eliminación, la tabla de ofertas y el takeover de la firma. **Solo prototipo:** la cadena mercado → firma salta a otra
muestra de la vitrina (en el juego, la prueba de ingreso es una parada intermedia); el Swiss no muestra pick porque el
motor no lo registra en el Bo1. No se usó View Transitions: congelaría el lienzo del ambiente en una foto justo cuando
tiene que cruzar; la transición es WAAPI + el reloj del ambiente.

**Splash animados reales (sondeo de CommunityDragon, 2 llamadas):** `skins.json` (2167 skins) trae `splashVideoPath`
solo en 12 skins de 12 campeones (ninguna skin base, ninguno de los campeones de esta carrera); el webm pesa ~2,8 MB y
viene con `Access-Control-Allow-Origin: *`. No alcanza para el juego: el splash vivo es del shader.

**Solo prototipo:** el montaje por hash/panel de `main.js`; la intro se saltea en automatización (`navigator.webdriver`)
para que la captura del Inicio muestre la selección (la tira la muestra con Repetir); los botones del Inicio (desafío,
continuar, historial) no navegan; "Volver a decidir" repite la parada; los títulos de la tira de eras usan la misma parada
(`evento`) en las cinco para comparar luz contra luz.
