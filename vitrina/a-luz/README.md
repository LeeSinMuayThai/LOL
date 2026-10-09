# A · LUZ — *"Tu carrera, iluminada."*

**Concepto.** Una carrera de LoL se vive de noche, y esta dirección la cuenta con luz: un ambiente WebGL de haces
volumétricos, bruma, polvo y bokeh que cambia de "equipo de luz" con la era (el monitor de la pieza → los tubos de la
sala → el estadio → el oro del Mundial → el atardecer). El campeón vive **adentro** de esa luz (splash en duotono, mezclado
en "pantalla" con los haces), el contenido se apoya sobre ella sin cajas y la tipografía hace el resto (Mona Sans de 56 a
214 px contra Geist 17 y Geist Mono 11-13).

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
| Celular | La misma página a 390×844: franja de dos líneas, opciones con "más" (una sola descripción a la vez), la matriz en columnas compactas, "ver contexto" abre el panel como hoja, barra de cuartos fija abajo. |

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
| `--t-parada` 56 · `--t-opcion` 26 · `--t-gigante` 128 · `--t-mono` 12 | | escala tipográfica |
| `--margen` 96 a 1440 · `--franja-alto` 56 · `--tray-alto` 28 | | retícula de 12 columnas |
| `--expo` · `--salida` · `--r-placa` 2 · `--r-carta` 18 · `--r-pildora` | | movimiento y radios (distintos a propósito) |

## Efectos (`js/`)

| Archivo | Qué hace |
|---|---|
| `ambiente.js` | El contrato de `comun/ambiente.md` en WebGL2: un fragment shader (fbm de bruma, 7 haces con abanico por era, luz de contra, polvo que solo brilla adentro del haz, bokeh, tubos, monitor), splash centrado del campeón en duotono mezclado en pantalla, transiciones de era de 1,3 s, ánimos (peligro desatura y late a 0,8 Hz, gloria sube el bloom y decae), pulsos, `aquietar()` (≤ 0,8 s) cuando aparece una parada, parallax ≤ 8 px. Escala 0,5, ≤ 30 fps, 2 texturas, pausa con la pestaña oculta, pérdida de contexto → cae al respaldo. Todo es función del reloj del ambiente: `congelar(t)` dibuja exactamente el instante t. Respaldo CSS (radiales + haces con `conic-gradient` + duotono en canvas 2D). `fotografiar()` saca las fotos de la tira de eras con el mismo shader. |
| `util.js` | DOM, modos (reducido/INST: nada se anima), `animar()` sobre WAAPI con `fill: backwards` (lo terminado sale de `getAnimations()`, así una tira no rebobina entradas viejas), `esperar()` como reloj congelable, odómetro por dígito, títulos en líneas con máscara, duotono 2D. |
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

**Solo prototipo:** el montaje por hash/panel de `main.js`; la intro se saltea en automatización (`navigator.webdriver`)
para que la captura del Inicio muestre la selección (la tira la muestra con Repetir); los botones del Inicio (desafío,
continuar, historial) no navegan; "Volver a decidir" repite la parada; los títulos de la tira de eras usan la misma parada
(`evento`) en las cinco para comparar luz contra luz.
