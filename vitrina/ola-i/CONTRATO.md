# Vitrina I · Una sola cara (PLANUI §0.11, I4)

> Lo leen los dos workers de la vitrina antes de tocar nada. El porqué y las citas del usuario están en `PLANUI.md`
> §0.11. Acá está **qué** se construye, con qué contenido y qué se rechaza.

## 0. Qué se elige

El fondo y el arte del campeón quedan como están. El usuario los quiere ("el fondo, el arte, los campeones"). Lo que se
elige es **la familia de componentes** que va encima. Hoy cada componente es distinto, y el usuario lo describió así:

> "muy básica, muy HTML, la UI" · "full HTML simple… un borde con letras de colores… no tiene una consistencia" ·
> "hay mucho texto, todo tiene 1000 descripciones"

Hay dos direcciones, con el mismo contenido y las mismas cuatro pantallas. El usuario las mira lado a lado y elige una.

| Carpeta | Dirección | En una línea |
|---|---|---|
| `vitrina/i-cliente/` | **A · Cliente** | El idioma del cliente de LoL: selección de campeones, loot hextech, el HUD del juego |
| `vitrina/i-transmision/` | **B · Transmisión** | El idioma de la transmisión de esports: el paquete gráfico de LCK, LEC y Worlds |

## 1. Las cuatro pantallas y su contenido (textual; las dos direcciones usan esto mismo)

El texto ya está recortado con los topes de I2 e I3. **No se agrega texto.** Si una pantalla pide un rótulo que no está
acá, se usa un ícono o un número.

### 1.1 La decisión (amateur)

- **Ficha** (siempre visible). Lo primero que se ve es el rango de soloQ: **DIAMANTE II · 64 LP**. Va grande, con el
  color del rango. Debajo, chico: Mecánica 70 · Macro 58 · Laneo 66 · Cabeza 61 · Hype 34. Edad 17 · Temporada 2026.
- **Evento.** Kicker `UN DM RARO`. Texto (34 palabras): *"Una cuenta sin foto te escribe a las tres de la mañana: te
  sube a Master en una semana por cuarenta lucas. «Nadie se entera, hermano.» Ya le hizo la cuenta a dos de tu server."*
- **Opción 1 · Denunciarlo.** Titular: ▲ Cabeza +2 · ▲ Hype +1. Una línea: *"Soporte lo banea y quedás de incorruptible."*
- **Opción 2 · Ignorarlo.** Titular: ▲ Cabeza +3 · ▲ Mecánica +1, con ⚠ *"puede insistir"*. Una línea: *"Subís a pulmón y
  el LP se siente tuyo."*
- Las teclas 1 y 2 eligen. Al apuntar una opción, se ilumina.

### 1.2 La consecuencia (después de elegir "Ignorarlo")

- **No aparece ninguna tarjeta.** No hay banda, ni carta que gira, ni nada que aparezca y se vaya solo.
- La consecuencia va **a la ficha**: Cabeza 61 → 64 (▲3) y Mecánica 70 → 71 (▲1). Los números ruedan y el ▲ se
  destaca.
- Bajo la opción elegida queda una línea, hasta que el jugador sigue (clic o Enter): *"El DM queda perdido entre cien.
  Subís a pulmón."* La otra opción se apaga.
- **Línea de tiempo (ms):**
  - 0: clic;
  - 0-150: la opción no elegida baja al 35%;
  - 150-750: los dos números ruedan en la ficha con su ▲;
  - 300-600: entra la línea bajo la opción;
  - después, todo queda quieto hasta que el jugador sigue (`SEGUIR ⏎`).

### 1.3 El minijuego: la previa, el HUD y el resultado (pro)

- **Previa** (≤ 25 palabras en total):
  - Rótulo: `LCS · SPLIT 2 · CUARTOS`. Cruce: **SEN vs CK** con los dos logos.
  - La serie: Bo5, cinco casilleros vacíos.
  - Qué hacer, una línea: *"Esquivá los skillshots. Flash con F."*
  - La vara, un número con su porqué: **6 de 8 oleadas**, *"CK es 2.º de la tabla"*.
  - Botón `JUGAR`.
  - El poder, la charla del coach y el desempate **no van como recuadros**: son íconos dentro del HUD.
- **HUD en juego** (una captura quieta del juego en curso; no hace falta que se pueda jugar):
  - el retrato del campeón de ese mapa: `Orianna`, no el main;
  - **una barra de vida** como la del LoL, con marcas cada 100 de vida, que baja al recibir un golpe;
  - **el Flash** como ícono de hechizo de invocador, cuadrado, con su tecla `F` y el barrido del enfriamiento cuando se
    usó;
  - el contador de oleadas `5 / 8`;
  - el ícono de la charla (usada / guardada);
  - el ícono del poder.
- **Resultado** (una sola vez):
  - el sello `PASASTE · 7 / 8`;
  - después, la serie contada como resumen, sin suspenso: **SEN 3-1 CK**, con una fila por mapa (ganado / perdido) y
    ningún "VICTORIA" repetido ni porcentaje.
- **Línea de tiempo (ms):**
  - el sello entra en 0-250 y queda 1200;
  - las filas de la serie entran de a una, cada 120 ms;
  - después, quieto hasta `SEGUIR ⏎`.

### 1.4 La mano del año (cierre de temporada)

- **Las tres cartas aparecen boca arriba, de una**. Hoy se reparten tapadas y se dan vuelta, y el usuario lo ve roto:
  *"primero como que aparece tapado y después se muestra todo"*. Una entrada de ≤ 300 ms está bien.
- La rareza se lee en el **material del marco**, sin etiqueta de texto. Más rareza es más número **y** más costo:

  | Rareza | Carta | Efecto |
  |---|---|---|
  | común | **SOLOQ DE MADRUGADA** | +2 Mecánica |
  | rara | **BOOTCAMP EN COREA** | +4 Laneo −1 Cabeza |
  | épica | **PSICÓLOGO DEL EQUIPO** | +6 Cabeza −2 Hype |

  Cada carta lleva el nombre y el número grande. **Nada más.**
- Abajo, `OTRA MANO` (una por año).
- Al elegir, la carta va a la ficha y el número rueda allí, como en 1.2.

## 2. Reglas comunes (las dos direcciones)

1. **Fondo y arte, reutilizados.** Usá los de `vitrina/fusion/` (su ambiente y su fondo) o el arte de Data Dragon con
   `vitrina/comun/arte.js`. No inventes un fondo nuevo: no es lo que se elige.
2. **Una familia.** Los cuatro componentes usan el mismo marco, la misma escala tipográfica (≤ 3 tamaños por componente)
   y los mismos estados (reposo, apuntado, elegido, apagado). Si tapás el texto, tiene que reconocerse que son del mismo
   juego.
3. **Prohibido**, porque es lo que el usuario llamó "full HTML":
   - recuadros con borde de 1 px y texto de color adentro;
   - chips o pastillas para cada dato;
   - emoji como íconos (los íconos van en SVG, inline);
   - párrafos de explicación;
   - más de una carta o caja por idea.
4. **El texto, el de §1, sin agregar.** Contá las palabras de cada pantalla e informalas.
5. **Colores** solo en `estilos/tokens.css` de tu carpeta. **Fuentes:** las de `vitrina/comun/fuentes/`. Si tu dirección
   necesita otra, una sola, OFL, en woff2 dentro de tu carpeta, y decí cuál.
6. Cero dependencias, ES modules, sin `Math.random` (`vitrina/comun/azar.js` si hace falta azar decorativo).
7. **Movimiento:** el de las líneas de tiempo de §1, con `prefers-reduced-motion` respetado.
8. **Una página por dirección**: `index.html` con las cuatro pantallas, que se cambian con las teclas 1-4 o con
   `?pantalla=decision|consecuencia|minijuego|mano`. También `?pantalla=consecuencia&t=<ms>` para capturar un instante
   de la línea de tiempo.
9. **Capturas:** ≤ 10 PNG en `<tu carpeta>/capturas/`, que no se versiona:
   - las cuatro pantallas a 1440×900;
   - la consecuencia a t=300 y t=900;
   - el HUD y el resultado del minijuego;
   - dos a 390×844 (la decisión y la mano).
10. `README.md` de tu carpeta, ≤ 30 líneas: la idea, de qué parte del LoL sale cada pieza y qué falta.

## 3. Las dos direcciones

**A · Cliente** (`vitrina/i-cliente/`). Sale del cliente de LoL tal como lo conoce un jugador:
- el marco biselado con filete dorado y esquinas cortadas;
- el azul noche del cliente y el brillo hextech celeste para lo interactivo;
- las mayúsculas espaciadas de los títulos.

Cada pieza:
- **la opción** es como la ficha de campeón en la selección: se ilumina al apuntarla y queda trabada al elegirla;
- **las cartas** son como el loot hextech: el material del marco y la gema dicen la rareza (acero, hextech azul, violeta
  épico);
- **el HUD** es el del juego: la barra de vida con sus marcas y el Flash en su casilla de hechizo con el barrido.

**B · Transmisión** (`vitrina/i-transmision/`). Sale del paquete gráfico de una transmisión de LCK, LEC o Worlds:
- plano y filoso, con cortes en diagonal;
- tipografía condensada y pesada;
- barras de color de equipo y zócalos;
- el marcador arriba, como el del espectador.

Cada pieza:
- **la opción** es un zócalo;
- **las cartas** son como las placas de pick del draft, con el número enorme;
- **la serie** son los casilleros del Bo5 de la transmisión;
- **el HUD** es el overlay del espectador.

Las dos tienen que verse de LoL a primera vista. Ninguna puede verse como una plantilla web.
