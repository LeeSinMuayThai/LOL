# B · NOCTURNO — *"Tu carrera, impresa de noche."*

**El concepto en 3 líneas.** Un Split Más contado como una revista deportiva que sale de noche: fondo negro, una sola
tinta ácida, una grotesca variable usada con violencia (Archivo condensada al 62 % contra ancha al 125 %), grilla
editorial con filetes y folios, y el splash del campeón impreso como **halftone** por shader. El papel aparece solo
cuando algo merece tapa (el ¡EXTRA!, la edición de colección, la crónica de la era leyenda). El texto se vuelve tipografía.

Correr: `node vitrina/servir.mjs --puerto 8112` → `http://127.0.0.1:8112/b-nocturno/index.html`.

## Pantallas

| Pantalla | Qué hay |
|---|---|
| **Inicio** | La portada del Nº 1: cabecera UN SPLIT MÁS a todo el ancho, bajada con la fecha del desafío, el main (Yone) en halftone, el perfil como frase para completar con campos en línea (handle, rol, servidor, mains), los roles como palabras grandes, los campeones del rol como **hoja de contactos** (íconos de Data Dragon tramados en canvas 2D, numerados 01A…17A, los 3 elegidos marcados con lápiz graso ácido), "EMPEZAR LA NOTA →" y el índice "En este número" (continuar, desafío, historial; el número de página es un dato real). Intro: la portada se imprime (letras de la cabecera en orden de imprenta, la trama crece como tinta, ~2,4 s, se saltea con un clic o Escape). |
| **Decisión · evento** | La doble página. Izquierda: la crónica del split (foto del campeón del split en halftone con pie, cartel "ARRANCA 2032", beats con capitular, breves en mono, "ÚLTIMO MOMENTO" a máquina y la cita destacada en Fraunces itálica). Derecha: LA DECISIÓN — título ≤ 56 px, planteo en una línea (+ "seguir leyendo"), opciones numeradas 01/02 con glifos (ícono del eje + ▲/▲▲/▲▲▲ o ▼ + riesgo con dial), la opción bloqueada tachada en rojo con su motivo, y la **nota al margen** (el inspector) que cambia con la opción apuntada. |
| **Decisión · plan amateur** | El mismo pliego con la página izquierda angosta y la **tabla de almanaque**: planes en filas; SoloQ (barra comparativa + LP por semana), Estudios, Sueño, Confianza, Consistencia (flechas por magnitud + valor, con el "hoy" del jugador como referente en la cabecera) y Riesgo en casa (dial + % + "deuda de sueño · sem. 3" de `semanaDeuda`). Etiquetas "rara" y "tu perfil iría por esta" salen de `rareza` y `propuesta`. |
| **Elegir** (1-4, clic, Enter) | La opción elegida se subraya con un trazo de marcador ácido (300 ms) y el resultado real (`resultados[opcionId]`) se imprime como **P. D.**: el cuerpo del log y los números "sellados" con odómetro (antes → después, delta, y lo previsto por la previa al lado). |
| **Cumbre · título** | El ¡EXTRA!: sobre la noche (la final mapa a mapa, el plan, los quemados del Fearless) entra girando una tapa de papel y frena (880 ms, se saltea): "¡CAMPEONES!", el halftone de Yone en una tinta sobre papel, la bajada armada con org/liga/año/marcador/rival, el marcador ancho, el plantel con el jugador resaltado y la serie W/L. Desemboca en "LA EDICIÓN DE COLECCIÓN →". |
| **Cumbre · final** | La edición de colección: cabecera, "Se cierra una carrera", Yone en papel, el escalón (LEYENDA) como titular, el puntaje como número de edición (odómetro) con su percentil, el sello Golden Road 2036 y la seed como código de barras (decorativo, de los dígitos). Al lado, el almanaque: curva de nivel por split con trama, cinta de clubes (los que dieron títulos en ácido), cada título como ◆, el Golden Road marcado en oro, el pico anotado, la nota de cada año, los 8 Mundiales y las cifras grandes con su referente. |
| **Eras** | La misma doble página (evento) en las cinco eras a escala, con el main y el folio de cada foto de `muestras.eras`, y la leyenda de las tintas. Tocar una miniatura (o Alt+A) cambia la era de toda la página. |
| **Celular** | La decisión como nota de revista en una columna: folio arriba, el contexto como chip, la foto en franja, opciones con glifos (sin etiquetas), "más" por opción que abre una sola nota de una línea (+ "más"), la crónica debajo y la barra de cuartos fija abajo. La tabla del plan pasa a fila = plan, celdas alineadas a una cabecera de íconos. |

## Tokens (`estilos/tokens.css`, únicos colores literales)

| Token | Valor | Uso |
|---|---|---|
| `--bg-void` / `--bg-surface` / `--bg-raised` / `--bg-sunken` | `#0b0b0c` / `#111112` / `#19191b` / `#070708` | la noche; `raised` solo en la cinta de clubes |
| `--ink` / `--ink-dim` / `--ink-mute` | `#ece8e1` / `#a29d96` / `#8e8a84` | tinta, secundaria (7,4:1), folios y rótulos (5,6:1) |
| `--rule` / `--rule-strong` | `#3a3936` / `#5e5b57` | filetes (nunca texto) |
| `--acid` / `--acid-shadow` / `--on-acid` | `#c8ff2e` / `#3f5410` / `#0b0b0c` | la única tinta de acento; su sombra impresa (trama); texto sobre ácido |
| `--up` / `--down` / `--danger` | `#c8ff2e` / `#ff5a4e` / `#ff5a4e` | sube = la tinta (decidido: en esta revista lo que suma va en ácido); baja/peligro en rojo |
| `--warn` | `#ffb547` | definido, sin uso en la ronda 1: el riesgo se dibuja (dial), no se colorea |
| `--gold` | `#e8c35a` | segunda tinta: era mundial, Golden Road, Mundial ganado |
| `--paper` / `--paper-ink` / `--paper-dim` / `--paper-rule` / `--paper-acid` | `#f1ece2` / `#121212` / `#5b5750` / `#c9c2b4` / `#b4ea12` | SOLO tapas; el ácido sobre papel como segunda tinta (sellos, resaltador) |
| `--focus` / `--focus-halo` | `#c8ff2e` / `#0b0b0c` | anillo de foco con halo negro: se ve sobre trama y sobre papel |
| `--ht-*` | por era | lo que lee el shader: `--ht-tinta`, `--ht-tinta-2`, `--ht-celda` (px), `--ht-angulo` (°), `--ht-grano`, `--ht-contraste`, `--ht-papel*` |
| `--era-acento` | por era | pieza crema · academia ácido · escenario ácido · mundial oro · leyenda papel |

Eras (`[data-era]`): **pieza** fanzine fotocopiado (trama 11 px a 15°, grano 0,34, titulares calados y torcidos), **academia**
revista de la liga (trama crema con sombra ácida corrida), **escenario** ácido pleno, **mundial** aparece el oro,
**leyenda** la crónica se imprime en papel (la trama pasa a tinta oscura).

Tipografía: Archivo (62 % / 850-900 titulares, 125 % / 900 números, 100 % / 400 cuerpo 16-18 px), IBM Plex Mono 9,5-13 px
(folios, datos, tablas, la máquina de escribir), Fraunces itálica SOLO en la cita destacada.

## Efectos (`js/`)

| Archivo | Qué hace |
|---|---|
| `halftone.js` | El ambiente (contrato de `comun/ambiente.md` + `respirar()`, `imprimir()`, `sinImpresion()`, `listo()`). WebGL2 a escala 0,5, 2 texturas (fundido A/B), ≤ 30 fps, pausa con la pestaña oculta, pérdida de contexto. Trama rotada por celdas con tamaño de punto por luminancia, segunda tinta corrida (sombra impresa), grano, respiración (onda lenta que se aquieta en ≤ 1 s en las paradas), pulso como onda que agranda los puntos, "imprimir" (la trama crece de arriba abajo), modo papel (puntos oscuros sobre papel). Sin WebGL: `tramaEstatica()` dibuja la misma trama en canvas 2D (también la usan la hoja de contactos y las eras). |
| `decision.js` | La doble página, la tabla de almanaque, la nota al margen (hover/foco/flechas), elegir (marcador + P. D. + odómetros), el modo papel de leyenda. |
| `cumbre.js` | El ¡EXTRA! (tapa que gira y frena, salteable) y la edición de colección con el almanaque en SVG (curva, trama, cinta, hitos, notas, Mundiales). |
| `inicio.js` | La portada, la frase con campos, roles, hoja de contactos con lápiz graso, índice, la intro impresa. |
| `eras.js` | Las cinco miniaturas (la decisión real montada a 1440×900 y escalada, trama estática). |
| `folio.js` / `util.js` | Folios y cuartos; DOM, glifos (pictogramas de ejes y dial de riesgo), flechas por cantidad, trazo de marcador, revelado de tinta, máquina de escribir, odómetro, código de barras. |
| `main.js` | Panel común, router de pantallas, `window.vitrina.listo`, 1-4 eligen, Escape/Espacio saltean. |

Todo movimiento es WAAPI con `fill: 'backwards'` (al terminar sale de `getAnimations()` y queda el CSS final), así las
capturas congeladas no rebobinan las entradas. Camino quieto: `prefers-reduced-motion`, `data-reducido` y `data-inst`
apagan transiciones, máquina, giro y trama (la imagen queda).

## Trasladable al juego tal cual vs. solo prototipo

**Tal cual:** `tokens.css` (colores, eras, escala), `halftone.js` completo (contrato + respaldo), los glifos de
`util.js` (pictogramas, flechas por magnitud, dial de riesgo, marcador, odómetro, máquina), la gramática de la doble
página y de la tabla de almanaque (`decision.css`), los folios con su referente, el ¡EXTRA! y la edición de colección.

**Solo prototipo:** los datos fijos de `muestras.json`; el inicio no crea una carrera (el CTA navega a la decisión); los
cuartos del pie no navegan; el "peor caso" solo pisa handle, org, título, planteo y una descripción; los focos de cara
por splash (`FOCOS` en `halftone.js`) cubren solo Yone, Sylas y Anivia (el resto cae al centro); las miniaturas de eras
usan el layout de escritorio con media queries de viewport (en el juego convendrían container queries).
