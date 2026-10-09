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
| `inicio` | Arranque (líneas de BIOS con humor → logo de FARO) → **pantalla de bloqueo**: el reloj gigante es el año de la carrera (2026), el login es la carrera nueva (nombre de invocador tipeándose, servidor = región, rol, perfil, tus 3 mains), "Continuar" es tu última sesión (con su fecha), el desafío del día llega como notificación, el historial es una carpeta. **Entrar** (o Enter) abre la ventana de **selección de campeones**: pestañas por rol, grilla de Data Dragon, el splash del apuntado de fondo, 3 ranuras, BLOQUEAR. |
| `decision/evento` | Escritorio FARO 32 (estación de pro, monocromo). Ventana enfocada con kicker (categoría · bisagra · cuándo), título ≤ 46 px, planteo en una línea + "más", opciones = label + glifos (ícono del eje + ▲/▲▲/▲▲▲ por magnitud, color por signo) + riesgo (ícono + nombre); la opción bloqueada con candado y su motivo en el inspector. **Inspector**: la prosa de UNA opción (hover, foco, flechas). A la derecha, el relato del split como notificaciones ("lo último que pasó" destacado) y el widget **Vos**. **Elegir** (1-4 o clic): la opción vuela a ser tu mensaje (FLIP), "escribiendo…", llega el resultado real (`resultados[opcionId]`) con sus efectos, los números del widget ruedan y entra un toast del sistema. |
| `decision/planAmateur` | Escritorio FARO 26 (la pieza a la noche, el splash de tu main de papel de pared). La parada es una **planilla**: filas = opciones, columnas = ejes (SoloQ como barra + LP, estudios, sueño, casa, consistencia con flechas y valor), riesgo con nombre + medidor de "en casa %" + "deuda de sueño sem. N", rareza y "tu perfil" como etiquetas. Widget = **el cliente de ranked** (escudo propio en SVG, LP, barra) + vitales + pool. Elegir: el escudo cambia de liga (Oro I → Platino III), la barra se llena, destella y arranca; los vitales ruedan. |
| `cumbre/titulo` | **Tribuna**, el stream a pantalla completa: la cámara es el splash del campeón que cerró la serie, CAMPEONES letra por letra, el marcador con los mapas (íconos, G/P), el plantel como zócalo, el chat cayendo (mensajes y emotes en texto armados con `comun/azar.js` a partir de la serie real). Pico ≤ 2,4 s, salteable (Saltar / Esc). |
| `cumbre/final` | La PC se apaga (CRT) y queda **el salón de la fama**: "SE CIERRA UNA CARRERA" gigante, de dónde salen los puntos, la **carta** (arte de carga del main, 1.494 en oro, escalón como rareza, Golden Road como variante con canto dorado y reflejo), y la ventana **carrera.log** (cinta de orgs + curva de nivel + títulos + Golden Road + cifras). |
| `eras` | El **mismo escritorio** cortado en cinco franjas a escala 1:1, una por era (2026 · 2028 · 2029 · 2033 · 2044), cada una con su papel de pared (una instancia del ambiente por franja), su barra, su ventana "Vos" con el jugador de ese año y su dock. La era del panel ensancha su franja; clic en una franja fija esa era. |
| Celular | La misma página a 390×844: barra de estado (la bandeja = tu cuerpo), el contexto como chip, la parada a pantalla completa, el inspector en una línea + "más", la planilla como matriz compacta, el dock de cuartos abajo. Bloqueo de teléfono, stream en vertical, salón en columna, eras en filas. |

## Tokens (`estilos/tokens.css`, el único archivo con colores)

| Token | FARO 26 · pieza | FARO 28 · academia | FARO 31 · escenario | FARO 33 · mundial | FARO 44 · leyenda |
|---|---|---|---|---|---|
| `--bg-void` / `--bg-surface` | `#07080b` / `#15171c` | `#c9ced8` / `#fbfbfd` (clara) | `#040405` / `#0f1012` | `#0e0e10` / `#18181b` | `#0b0907` / `#1b1713` |
| `--ink` / `--ink-dim` / `--ink-mute` | `#eceef4` / `#b0b4c3` / `#8a8fa2` | `#14161b` / `#454b58` / `#626978` | `#f3f3f0` / `#a9aaae` / `#85878d` | `#efeff1` / `#b3b3bd` / `#8b8b98` | `#f6efe1` / `#c9bea9` / `#a39882` |
| `--accent` | `#7c5cff` | `#2d55ff` (la org, en detalles) | `#f3f3f0` (la tinta es el acento) | `#ff4fd8` (en vivo) | `#ffd27a` |
| `--r-ventana` / `--r-control` | 12 / 8 px | 10 / 6 | 4 / 3 | 8 / 6 | 26 / 14 |
| Cromo | barra de tareas entera, controles redondos | clara, controles cuadrados, dock centrado | mono en mayúsculas, rayas, dock compacto | ídem, plataforma | sin marco: manija, isla flotante, sin barra |
| `--f-ui` / `--f-momento` (ancho) | Geist / Mona Sans 112 % | Geist / Mona Sans 100 % | Geist (+ cromo Geist Mono) / Mona Sans 125 % 860 | Geist / Mona Sans 125 % 900 | Mona Sans / Mona Sans 88 % 640 |
| Papel de pared | splash del main, brillo .42, velo frío | monograma de la org | splash, brillo .72, desaturado | casi negro | splash sepia .55 + grano |
| Movimiento | `--dur-ventana` 240 ms, rebote leve | 240 ms | 180 ms (más rápido) | 240 ms | 420 ms, sin rebote |

Semánticos comunes: `--up #3df2a0`, `--down/--danger #ff5468`, `--warn #ffb547`, `--gold #ffd27a` (la academia los
oscurece para fondo claro). Además `--rank-*` (escudos), `--nivel-*` (bandas), `--cat-*` (categorías), `--chat-*`,
`--vivo`, `--animo-*`, y los defaults de las props de componente (`--v`, `--d`, `--carga`, `--i`, `--cols`, `--cat`,
`--banda`, `--rank`). Movimiento: `--ease-ventana`, `--ease-entrar`, `--dur-*`.

## Efectos (qué hace cada `js/*`)

| Archivo | Qué hace |
|---|---|
| `main.js` | Carga los datos, arma el panel, decide el papel de pared por era (splash del main / monograma de la org) y pinta una pantalla por vez. Pone `--os-version` = el año. `window.vitrina.listo`. |
| `ambiente.js` | El contrato de `comun/ambiente.md` con capas DOM + WAAPI (sin WebGL: con `data-sin-webgl` se ve igual). Cada capa lleva su `data-era` y se funde sobre la anterior; deriva lenta del splash (quieta en una parada); `pulso` = destello de pantalla; opciones propias: `monograma`, `quieto`, `encuadre`, `vivo`. |
| `os.js` | FARO: glifos propios (SVG 24×24 de trazo), logo (lámpara + haz), barra de menú con la bandeja-cuerpo, dock de cuartos, ventana (la enfocada tiene la "lámpara" prendida), notificación, escudo de rango propio, flechas de magnitud. |
| `decision.js` | La parada (evento) y la planilla (plan amateur), el inspector, el hilo del resultado (FLIP + escribiendo + respuesta), los widgets Vos y Ranked con odómetros, el toast, el peor caso. Teclas: 1-4 eligen, ↑↓ recorren. |
| `cumbre.js` | Tribuna (stream + chat generado con `azar.js`, pico ≤ 2,4 s, Saltar/Esc) y el salón (CRT, carta, carrera.log en SVG). |
| `inicio.js` | Arranque, pantalla de bloqueo, login de la carrera nueva y la ventana de selección de campeones. |
| `eras.js` | Las cinco franjas con un ambiente por franja. |
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

- La selección de campeones no sale en las capturas automáticas (se abre con Entrar/Enter).
- `--cat-*` cubre las categorías conocidas (mercado, caminos, equipo, vida); el resto cae a `--cat-otro`.
- La bandeja de contratos queda para la ronda 2.
