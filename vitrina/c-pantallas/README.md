# C · PANTALLAS — "Todo pasa en tus pantallas."

**El concepto, en tres líneas.** La carrera se vive a través de las pantallas del jugador, y la interfaz *es* esos
dispositivos: un sistema operativo inventado, **FARO**, cuya versión es el año del juego (FARO 26 en la pieza del pibe,
FARO 32 en la estación de FURIA, FARO 44 cuando se apaga). El SO envejece con el calendario: materiales, cromo,
tipografía y dock cambian por era, y los mismos componentes se re-tematizan solos con `data-era`.

Mapa al juego ("una pieza + un panel"): **la ventana enfocada = el escenario**, **el widget acoplado = el panel de
contexto** (`acompanante`), **el dock = los 6 cuartos**, **la bandeja del sistema = tu cuerpo** (la batería es el sueño
o la cabeza; la señal, la confianza de tu casa o tu jerarquía), **el teléfono = el celular**. El chat solo aparece
donde el dato ya es una conversación (tu elección y su resultado; el chat del stream).

## Pantallas

| Pantalla | Qué hay |
|---|---|
| `inicio` | Arranque (líneas de BIOS con humor → logo de FARO) → **pantalla de bloqueo**: el reloj gigante es el año de la carrera (2026), el login es la carrera nueva (nombre de invocador tipeándose, servidor = región, rol, perfil, tus 3 mains), "Continuar" es tu última sesión (con su fecha), el desafío del día llega como notificación, el historial es una carpeta. La ventana **Cliente** junta el login y la **selección de campeones**, visible en reposo: el rol son las pestañas de la grilla de Data Dragon, los elegidos llevan su número, el splash del apuntado es el fondo de la cabecera, 3 ranuras y BLOQUEAR (Enter). |
| `decision/evento` | Escritorio FARO 32 (estación de pro, monocromo). La ventana se ancla abajo y la cara del campeón del split (encuadrada por foco) queda arriba, a la vista. Ventana enfocada con kicker (categoría · bisagra · cuándo), título ≤ 46 px, planteo en una línea + "más", opciones = label + glifos (ícono del eje + ▲/▲▲/▲▲▲ por magnitud, color por signo) + riesgo (ícono + nombre); la opción bloqueada con candado y su motivo en el inspector. **Inspector**: la prosa de UNA opción (hover, foco, flechas). A la derecha, el relato del split como **stack de notificaciones de FARO** (la última arriba con su hora relativa, las otras asomando; un toque lo despliega) y el widget **Vos** acoplado al borde como un cajón. **Elegir** (1-4 o clic): la cabecera se apaga, la opción vuela a ser tu mensaje (FLIP), "escribiendo…", la ventana se enciende y el resultado real (`resultados[opcionId]`) ocupa la ventana con sus efectos grandes; los números del widget ruedan y un toast del sistema entra y se va solo. |
| `decision/planAmateur` | Escritorio FARO 26 (la pieza a la noche; la cara de tu main arriba a la derecha, sobre la columna de contexto). La parada es una **planilla**: filas = opciones, columnas = ejes (SoloQ como barra + LP, estudios, sueño, casa, consistencia con flechas y valor), riesgo con nombre + medidor de "en casa %" + "deuda de sueño sem. N", rareza y "tu perfil" como etiquetas. Widget = **el cliente de ranked** (escudo propio en SVG, LP, barra) + vitales + pool. Elegir: el escudo cambia de liga (Oro I → Platino III), la barra se llena, destella y arranca; los vitales ruedan. |
| `cumbre/titulo` | **Tribuna**, el stream a pantalla completa: la cámara es el splash del campeón que cerró la serie, CAMPEONES letra por letra, el marcador con los mapas (íconos, G/P), el plantel como zócalo, el chat cayendo (mensajes y emotes en texto armados con `comun/azar.js` a partir de la serie real). Pico ≤ 2,4 s, salteable (Saltar / Esc). El corte de entrada es a oscuro (nada de destellos blancos). |
| `cumbre/final` | La PC se apaga (CRT) y queda **el salón de la fama**: "SE CIERRA UNA CARRERA" gigante, de dónde salen los puntos, la **carta** (arte de carga del main, 1.494 en oro, escalón como rareza, Golden Road como variante con canto dorado y reflejo), y la ventana **carrera.log** (cinta de orgs + curva de nivel + títulos + Golden Road + cifras). |
| `eras` | El **mismo escritorio** cortado en cinco franjas a escala 1:1, una por era (2026 · 2028 · 2029 · 2033 · 2044), cada una con su papel de pared (una instancia del ambiente por franja), su barra, su ventana "Vos" con el jugador de ese año y su dock. La era del panel ensancha su franja; clic en una franja fija esa era. |
| `partido/serie` | **El draft** (ronda 1b): la serie Bo5 con Fearless como un champ select en la ventana **Cliente** de FARO. A los costados, tu equipo y el rival con su fuerza (60 vs 47) y los 5 mapas como ranuras: las tuyas muestran la p del plan apuntado (barra con la marca del 50 %, el decisivo en ámbar); la del rival trae su **intención** para el próximo mapa (el pick que trae la previa del motor). Al pie, la previa como un "por qué" chico (79 % de ganar: Vos 31 · Tus compañeros 30 · El meta ±0 · El campeón −1 · La química +1) y el **tablero de quemados** (10 huecos punteados, 2 por mapa). Al centro, el **hover-pick**: el splash a sangre del apuntado con su nombre gigante, y tus libres como retratos de carga (308×560). Los 3 planes: label + 5 barritas por mapa (contra la línea del 50 %) + el % de la serie grande (el más alto en verde); el inspector con la prosa de uno. **Elegir** (1-3) juega la serie mapa a mapa (~1 s por mapa, Saltar/Esc): las ranuras se llenan con tu pick y el del rival, el escenario muestra tu campeón contra el suyo y el **post-game** propio (VICTORIA/DERROTA con el emblema de FARO, el marcador y "tenías 78 %"), los quemados caen en el tablero y tachan tus libres, la charla del coach entra como cartel entre mapas, y termina en el resultado de la serie con el texto del motor. |
| `partido/serieReplan` | El mismo draft interrumpido: una **notificación del sistema** ("Te leyeron: Los Grandes quemó a Sylas") entra por la derecha, el escenario se tapa con Sylas en gris y un sello QUEMADO, el Sylas del tablero se marca en rojo, y el draft vuelve (los planes suben a 1,15 s) con los mapas 1-2 ya jugados en las ranuras y la intención del rival (Sylas) en el mapa 3. |
| `partido/swiss` | **Tribuna** en la era `mundial`: la cámara es el campeón del split, la banda **VIDA O MUERTE** con "2-2 vs Movistar KOI · LEC", el camino del Swiss (R1-R4 con V/D y el rival, R5 latiendo) y el chat nervioso (PRNG decorativo, armado con los datos reales, sin repetir). La parada es un overlay del stream: las 2 opciones con ícono, el inspector en una línea y la previa (19 % con su medidor, 70 vs 84, la nota de la charla). **Elegir**: la charla como zócalo "Vestuario", el Bo1 "en juego" con tu chance real, el post-game DERROTA, la R5 que se vuelve D, la cámara que se apaga a gris, el chat que pasa de los nervios al respeto y se va callando, y **Fin de la transmisión**: el texto del motor, **las dos p** (con la charla 42 %, sin ella 19 %: la decisión movió el número, el dado salió igual) y lo que quedó (Arraigo 74 → 79, Hype 95 → 99, Mundiales 1 → 2). |
| `mercado/mercado` | **La bandeja de contratos** (la firma 4 de C): la app Contratos de FARO, clara (FARO 29). Cada oferta es un mail: remitente (el ícono de la org, el único lugar con su color), liga como chip (tier 1 en acento), asunto (`motivoDemanda`) y los términos como columnas alineadas: sueldo con barra contra la oferta más alta, años en pips, jerarquía proyectada con barra y su etiqueta, puesto del plantel. El panel de lectura muestra UNA oferta: sus campos (sueldo, duración, jerarquía, plantel, arraigo) y la prosa (riesgo, negociación, picks, arraigo). A la derecha, el mercado del mundo (lo que valés, asientos abiertos, traspasos). **Enter firma** la que estás leyendo; 1-6 eligen directo. Elegir → "Siguiente parada: La prueba de ingreso · en <org>"; con LOUD (la que pasó) el botón encadena a la firma; con las otras se dice que esa prueba no está en esta carrera. |
| `mercado/firma` | **La firma se dibuja** (≤ 2,4 s, Saltar/Esc, Repetir): en la PC de la pieza (FARO 26, oscura, con el splash del main) el contrato de LOUD abierto; tu handle se traza en Fraunces itálica (cada letra se dibuja mientras la mano corre de izquierda a derecha, después la tinta y la rúbrica), entra "Contrato firmado · LOUD · CBLOL · 1 año · USD 40.000", la PC vieja se cierra en la lámpara del logo y queda la del equipo (FARO 29, clara, con el monograma de LOUD), el contrato firmado y el mercado que se cierra (los logs reales). |
| Celular | La misma página a 390×844: barra de estado (la bandeja = tu cuerpo), el contexto como chip, la parada a pantalla completa, el inspector en una línea + "más", la planilla como matriz compacta, el dock de cuartos abajo. Bloqueo de teléfono, stream en vertical, salón en columna, eras en filas. Ronda 1b: el draft compacto (parada, escenario, planes y abajo los dos equipos lado a lado), el Swiss vertical (la parada sobre el player, el chat abajo), la bandeja como lista de mails y el contrato en el teléfono. |

## Tokens (`estilos/tokens.css`, el único archivo con colores)

| Token | FARO 26 · pieza | FARO 28 · academia | FARO 31 · escenario | FARO 33 · mundial | FARO 44 · leyenda |
|---|---|---|---|---|---|
| `--bg-void` / `--bg-surface` | `#07080b` / `#15171c` | `#c9ced8` / `#fbfbfd` (clara) | `#040405` / `#0f1012` | `#0e0e10` / `#18181b` | `#0b0907` / `#1b1713` |
| `--ink` / `--ink-dim` / `--ink-mute` | `#eceef4` / `#b0b4c3` / `#8a8fa2` | `#14161b` / `#454b58` / `#626978` | `#f3f3f0` / `#a9aaae` / `#85878d` | `#efeff1` / `#b3b3bd` / `#8b8b98` | `#f6efe1` / `#c9bea9` / `#a39882` |
| `--accent` | `#7452f7` (el `#7c5cff` del brief medía 4,35:1 con blanco encima) | `#2d55ff` (la org, en detalles) | `#f3f3f0` (la tinta es el acento) | `#ff4fd8` (en vivo) | `#ffd27a` |
| `--r-ventana` / `--r-control` | 12 / 8 px | 10 / 6 | 4 / 3 | 8 / 6 | 26 / 14 |
| Cromo | barra de tareas entera, controles redondos | clara, controles cuadrados, dock centrado | mono en mayúsculas, rayas, dock compacto | ídem, plataforma | sin marco: manija, isla flotante, sin barra |
| `--f-ui` / `--f-momento` (ancho) | Geist / Mona Sans 112 % | Geist / Mona Sans 100 % | Geist (+ cromo Geist Mono) / Mona Sans 125 % 860 | Geist / Mona Sans 125 % 900 | Mona Sans / Mona Sans 88 % 640 |
| Papel de pared | splash del main, brillo .42, velo frío | monograma de la org | splash, brillo .72, desaturado | casi negro | splash sepia .55 + grano |
| Movimiento | `--dur-ventana` 240 ms, rebote leve | 240 ms | 180 ms (más rápido) | 240 ms | 420 ms, sin rebote |

Semánticos comunes: `--up #3df2a0`, `--down/--danger #ff5468`, `--warn #ffb547`, `--gold #ffd27a` (la academia los
oscurece para fondo claro). Además `--rank-*` (escudos), `--nivel-*` (bandas), `--cat-*` (categorías), `--chat-*`,
`--vivo`, `--animo-*`, y los defaults de las props de componente (`--v`, `--d`, `--carga`, `--i`, `--cols`, `--cat`,
`--banda`, `--rank`). Movimiento: `--ease-ventana`, `--ease-entrar`, `--dur-*`.

**Cromo de FARO**: la barra de título es una **pestaña** que sobresale arriba a la izquierda, unida al cuerpo por una
curva inversa, con la lámpara (punto de acento) prendida solo en la ventana enfocada; en FARO 31/32 la pestaña va
invertida (tinta sobre negro, mayúsculas mono); en FARO 44 no hay pestaña, solo una manija. `--accent-texto` es el acento
cuando es texto chico (≥ 4,5:1).

**Ronda 1b, lo clásico**: apuntar reacciona donde reacciona el cliente del LoL (el hover-pick en la cabecera del Cliente y en el escenario del draft; el tile que sube); el resto tiene el feedback de cliente (`cliente.css`: la barra de luz al costado de la opción apuntada, la tecla que se hunde, los botones que se aprietan). **Hojas nuevas**: `cliente.css`, `partido.css`, `mercado.css`. **Tokens nuevos**: `--org-*` (el color de cada org, solo en su ícono, blanco encima ≥ 4,5:1), `--org-ink`, `--em` (el emblema del post-game), `--f-firma`, `--pick-encuadre`.

**Contraste medido** con `contraste.mjs` (esconde el texto, captura el fondo real y calcula el contraste de cada texto
visible contra los píxeles de atrás, percentil 10, con opacidades): evento en las 5 eras, plan, inicio, eras, título,
final y celular → 0 textos por debajo de 4,5:1 (3:1 en grandes). Ronda 1b: el medidor ahora también elige y congela en cualquier instante (`nombre|hash|w|h|elegirN|ms`), recorta la caja por los ancestros con overflow, no mide lo tapado por otra capa ni los controles inactivos (WCAG 1.4.3); en las pantallas nuevas (reposo, post-game, finales, celular) y el inicio/evento de control → 1523 textos, 0 por debajo.

## Efectos (qué hace cada `js/*`)

| Archivo | Qué hace |
|---|---|
| `main.js` | Carga los datos, arma el panel, decide el papel de pared por era (splash del main / monograma de la org) y pinta una pantalla por vez. Pone `--os-version` = el año. `window.vitrina.listo`. |
| `ambiente.js` | El contrato de `comun/ambiente.md` con capas DOM + WAAPI (sin WebGL: con `data-sin-webgl` se ve igual). Cada capa lleva su `data-era` y se funde sobre la anterior; deriva lenta del splash (quieta en una parada); `pulso` = destello de pantalla; opciones propias: `monograma`, `quieto`, `encuadre`, `vivo`, y `foco`/`destino`/`zoom` (pone la cara del splash en la zona que dejan libre las ventanas, con una máscara radial; los focos por campeón están en `main.js`). |
| `os.js` | FARO: glifos propios (SVG 24×24 de trazo), logo (lámpara + haz), barra de menú con la bandeja-cuerpo, dock de cuartos, ventana (la enfocada tiene la "lámpara" prendida), notificación, escudo de rango propio, flechas de magnitud. |
| `decision.js` | La parada (evento) y la planilla (plan amateur), el inspector, el hilo del resultado (FLIP + escribiendo + respuesta), los widgets Vos y Ranked con odómetros, el toast, el peor caso. Teclas: 1-4 eligen, ↑↓ recorren. |
| `cumbre.js` | Tribuna (stream + chat generado con `azar.js`, pico ≤ 2,4 s, Saltar/Esc) y el salón (CRT, carta, carrera.log en SVG). |
| `inicio.js` | Arranque, pantalla de bloqueo, login de la carrera nueva y la ventana de selección de campeones. |
| `eras.js` | Las cinco franjas con un ambiente por franja. |
| `campeones.js` | Ronda 1b. Nombres y etiquetas de campeón desde el catálogo real, `clave()` (normaliza a letras antes de armar una URL) y el **hover-pick** (`vistaPick`): apuntar cruza el splash (el nuevo entra corrido con un destello, el viejo se apaga), el ícono ya en caché ocupa el lugar mientras baja el splash, y el nombre entra cerrándose. Lo usan el inicio (la cabecera del Cliente, con el nombre arriba a la derecha) y el draft. |
| `partido.js` | Ronda 1b. El draft (serie y replan) y el Swiss. La serie jugada es un único armado de WAAPI (ranuras, escenario, post-game, marcador que rueda, quemados), así que `congelar(ms)` y la tira son fieles. El chat del Swiss sale de `comun/azar.js` con un mazo (no repite hasta agotar). |
| `mercado.js` | Ronda 1b. La bandeja de contratos y la firma (el trazo del handle con `stroke-dashoffset` + un recorte que se abre; la PC vieja que se cierra en la lámpara). |
| `util.js` | DOM, `anim()` (fill `backwards`: el estilo natural es el estado final; con movimiento reducido o INST no se anima nada), odómetro con ceros a la izquierda en blanco, texto tipeado congelable. |

**Regla de movimiento**: todo es WAAPI creado de una sola vez (la entrada, el resultado de elegir, el pico del stream,
el chat, el CRT), así que `congelar(ms)` muestra cualquier instante y la tira de cuadros es fiel. Las entradas terminan
antes de 1,5 s; el ambiente se aquieta al aparecer una parada.

## Trasladable tal cual / solo de prototipo

**Tal cual**: `tokens.css` entero (con su esquema por `data-era`), las hojas `os.css`/`decision.css` (gramática
`data-pieza`, `data-atajo`, `data-foco`), los glifos y el escudo de `os.js`, `util.anim/rodar/odometro`, el ambiente
(cumple el contrato), la regla "estilo natural = estado final", la planilla y el inspector, el hilo del resultado, el
stream y el salón.

**Solo de prototipo**: el chat del stream (los textos son decorativos, armados con la serie real), el texto de la BIOS y
los chistes del cromo, la ventana de selección de campeones (no guarda nada), el "Seguir" que vuelve a la parada, el
mapeo `ranked` → escudo leyendo la primera palabra de "Platino III · 67 LP" (vocabulario fijo de rangos; en el juego
conviene que el motor exponga el tier en `cambios`), y las fuentes cargadas desde `comun/`.

## Lo que falta / límites conocidos

- `--cat-*` cubre las categorías conocidas (mercado, caminos, equipo, vida); el resto cae a `--cat-otro`.
- Ronda 1b: el replan dibuja la intención del rival y los mapas jugados desde logs estructurados (`pagina.beats[].log` con `mapa`); si el motor no los trae, esas ranuras quedan vacías.
- La firma usa Fraunces itálica: no es una letra manuscrita de verdad (no hay una en `comun/fuentes`).
- El replan: el toast del sistema tapa la cabecera del rival durante ~3 s (es una interrupción; después se va).
