# UNA LÍNEA: el contrato de la corrección `op=linea` (PLANUI §4.9)

> Lo leen todos los workers de las olas 1-3 antes de tocar nada. El *porqué*, las citas del usuario y la auditoría están
> en `PLANUI.md` §4.9. Este archivo dice **qué** y **cómo**: las reglas, las interfaces fijadas, los dueños de cada
> archivo y lo que rechaza el verificador. Si algo de acá choca con tu brief, gana tu brief y se lo avisás al
> supervisor en el informe.

## 0. La idea en un párrafo

El usuario dijo que la demostración final parecían *"varios estilos distintos en el mismo juego"*, y tenía razón:
tres workers en paralelo inventaron cada uno su escenario (un estadio de CSS, un skyline en silueta, una planilla de
aeropuerto). La corrección vuelve a **una sola línea**, que es la del inicio: arte fotográfico del campeón en bitono,
dentro de la luz volumétrica, con tipografía grande y paneles de cliente. Esa línea se aplica a todo: **al 100% en el
inicio y "un poco" después**. El color que falta (*"todo negro y dorado lo hace muy aburrido"*) sale del **segundo
tono**, que cambia según dónde estás. La variedad viene del tono; la unidad, del tratamiento.

## 1. Las 8 reglas (se miden en la revisión; después son guards de producción)

1. **Una imagen héroe por pantalla, siempre fotográfica**: arte de Data Dragon, logos reales (`<img>`) o la copa en 3D.
   **Prohibido el decorado dibujado como héroe**: estadios de CSS, pantallas LED de cajas, skylines o público en
   silueta, tableros split-flap. Una silueta solo puede quedar como atmósfera lejana (desenfocada, ≤ 15% de contraste).
2. **El bitono es la gradación de todo el arte**, con la curva del usuario (§2).
3. **El segundo tono dice dónde estás**: era, destino, competición, org u oro (§3).
   - El oro es solo para la ceremonia: ¡ACEPTAR!, VICTORIA y la copa.
   - **Los negros se tiñen del tono**: ningún fondo de pantalla gris o negro neutro. Los paneles siguen siendo la
     superficie de §4.5, sobre una noche teñida.
4. **La misma luz.** El único decorado es el ambiente WebGL: haces, bruma, polvo y bokeh. El público son lightsticks
   en bokeh del color del tono, nunca cabezas.
5. **Un hover, el aura, en todos lados.** Apuntar lleva la luz a lo apuntado: el campeón, el camino de una decisión o
   la org del mercado.
6. **La costura.** Dos mundos enfrentados (el cara a cara de la serie, el video del Swiss, los dos destinos de la
   bisagra) se dibujan igual: una diagonal de luz y cada mitad en su tono. **La dibuja el shader del ambiente** (§4.2),
   nunca el DOM: un `duotono()` por CPU queda plano y sería otra vez "otro estilo".
7. **La ceremonia del LoL, un solo estilo.** Los gestos nativos comparten un estilo de inspiración hextech: filete de
   oro, un turquesa propio y azul petróleo. Son el aro de ¡ACEPTAR!, BLOQUEAR/FIRMAR, VICTORIA/DERROTA y el quemado de
   Fearless (`ceremonia.js`, §4.3). Solo esos gestos lo usan. Es un patrón propio, nunca assets de Riot.
8. **Los momentos son secuencias de beats, no fundidos.** El orden es apagón → golpe de luz → revelación → asentarse →
   loop vivo, con un solo helper (`beats.js`, §4.5).
   - Espacio salta al asentarse.
   - Con movimiento reducido o INST se ve el cuadro final.
   - ≤ 3 destellos por segundo.
   - La firma y el título duran ≤ 5 s; el resultado de un mapa, ≤ 2,4 s.

Siguen vigentes las 7 reglas de §4.5:
- una sola superficie de panel y ≤ 2 niveles de contenedor;
- Mona condensada mayúscula en los momentos, Mona ancha minúscula ≤ 56 px en los títulos, Geist en el cuerpo, Geist
  Mono 11-13 px en los rótulos y Mona expandida 900 tabular en los números;
- expo-out 180-320 ms y el orden luz → rótulo → título → opciones.

## 2. La curva del bitono (la política de color `linea`, `js/color.js`)

| Dónde | Color real del campeón | Bitono | Clave en la política |
|---|---|---|---|
| Inicio y la tira de eras | 0% | 100% | (siempre duotono, no cambia) |
| Pantallas de juego: piezas (retratos, libres, cartas de carga, la costura) | 65% | 35% | `pieza: 0.65` |
| Pantallas de juego: el arte de fondo | 60% | 40% | `fondo: 0.6` |
| Momentos (firma, título, AFUERA) | 70% | 30% | `momento: { fondo: 0.7, pieza: 0.7 }` |

- Con `op=linea` en el hash, la política por defecto es `linea`; un `color=` explícito sigue mandando.
- Las demás políticas (`duotono`, `real`, `mitad`, `capas`, `receta`) quedan idénticas bit a bit.
- Nadie fija a mano el porcentaje: se lee de la política (`mezclaPieza()`, los estados de `fondo.js`).

## 3. El segundo tono (`js/tono.js`)

Un tono es noche + luz, y lo aplica todo lo que dibuja arte o tiñe la noche.

| Contexto | Cuándo | De dónde sale |
|---|---|---|
| `era` | inicio, decisiones comunes, el reposo del mercado | `--luz-<era>` / `--contra-<era>` (ya existen) |
| `destino` | la decisión bisagra: cada mitad de la costura | la competición de ese destino (CBLOL, LCK…) |
| `competicion` | la serie y el Swiss | `--comp-<id>-*` (ya existen; se suman la noche y el vacío) |
| `org` | el mercado al apuntar, la firma, cada mitad del cara a cara | tokens `--tono-org-<slug>-*`, medidos del logo como en `competicion.js`; las orgs inventadas, las paletas del sistema (`--org-p1…p4`) |
| `oro` | el título, y la plata en Worlds | `--tono-oro-*`, `--tono-plata-*` |

Para que dos tonos de una costura no se confundan, `parecidos(t1, t2)` mide la distancia de matiz. Si se parecen, el
lado B toma la contra de la competición.

## 4. Las interfaces fijadas (las implementa la ola 1; la ola 2 las usa sin cambiarlas)

Las firmas son de JS. Los tonos se pasan como objetos con **nombres de token**, nunca hex: el hex vive solo en
`tokens.css`.

### 4.1 `js/tono.js` (K)

```js
// { id, luz, contra, acento, noche, vacio }: cada campo es el NOMBRE de un token ('--tono-cblol-luz')
export function tonoDe({ pantalla, muestra, contexto }) // contexto opcional: { tipo, clave }
export function tonoEra(era)
export function tonoCompeticion(idComp)       // 'cblol' | 'lck' | 'worlds' | ...
export function tonoDestino(liga)              // 'CBLOL' | 'LCK' | ... -> el de su competicion
export function tonoOrg(nombreOrg)             // real: medido; inventada: paleta del sistema
export const TONO_ORO, TONO_PLATA
export function parecidos(t1, t2)              // true si el matiz esta a < umbral (constante en tono.js)
export function aplicarTono(elemento, tono)    // pone --tono-luz/-contra/-acento/-noche en el elemento (var(--tono-<id>-x))
```

### 4.2 El ambiente (`js/ambiente.js`, K): lo que se suma a `ambiente({...})`

```js
ambiente({
  ...lo de hoy,
  paleta: { luz, contra, noche, vacio, k } | null,  // AHORA tambien tine la noche y el vacio (las sombras del arte)
  cruce: ms,                                         // velocidad del cruce de paleta/costura (hoy fijo en 1300 ms)
  costura: {                                         // null la apaga
    a: { arte, tono },           // arte: clave Data Dragon (p. ej. 'Sylas'); tono: objeto de tono.js
    b: { arte: clave | null, tono },  // null = ese lado solo luz en su tono (el logo del rival va como <img> encima)
    posicion: 0.5,               // donde cruza la costura (0-1 desde la izquierda; en el celular, desde arriba)
    angulo: 12,                  // grados respecto de la vertical
    k: 1,                        // presencia
  },                             // parcial: los campos que no vienen se mantienen
})
```

- **El aura sobre la costura.** Con la costura prendida, `ambiente({ arte })` (que es lo que hace el aura al apuntar un
  campeón) cambia el lado A.
- **El campo nuevo de la pantalla.** Las fábricas de pantalla devuelven `costura` (y `cruce`) junto a `arte` y
  `paleta`, y `main.js` lo reenvía como hace con `paleta`.
- **La escena nueva de `fondo.js`, `escena: 'costura'`.** Presencia 0 en reposo, aura y momento, para que no haya
  campeón doble, y plena en el takeover (AFUERA tiene su campeón). Más luz y polvo que `estadio`.
- **El celular** (`encuadre: 'celular'`) parte la costura en vertical.
- **Sin WebGL**, el fallback CSS acepta la paleta y la costura (dos capas en `clip-path`).
- **El presupuesto** puede subir a 3 texturas, para el cruce dentro de un lado.

### 4.3 `js/ceremonia.js` + `estilos/ceremonia.css` (K)

```js
// El aviso tipo PARTIDA ENCONTRADA. El aro es una animacion WAAPI de `segundos` (se puede buscar con congelar).
// Al llegar a cero llama alAceptar (entra solo, nunca decide). En INST/reducido: aro lleno, quieto, sin entrada sola.
anilloAceptar({ escudo /* Node */, encabezado /* '¡OFERTA ENCONTRADA!' */, cola /* 'Cupo de import · LCK' */,
                tono, segundos = 12, alAceptar, sonido }) -> { nodo, aceptar(), destruir(), animaciones }
// El boton de BLOQUEAR del inicio (el mismo look), con el destello de ceremonia al bloquear. FIRMAR lo usa.
bloquear({ texto = 'BLOQUEAR', tecla = 'Enter', alBloquear, sonido }) -> { nodo, bloquear(), habilitar(si) }
// El cartel de fin de partida: VICTORIA (oro) o DERROTA, con su emblema propio. Devuelve sus animaciones (WAAPI, con delay).
victoriaDerrota({ gano, sub, tono, retardo = 0 }) -> { nodo, animaciones }
// El quemado de Fearless sobre una carta: se desatura, una linea de brasa la cruza en diagonal y queda apagada.
quemar(nodoCarta, { retardo = 0, sonido }) -> animaciones
```

### 4.4 `js/transmision.js` + `estilos/transmision.css` (K)

```js
// El marcador de transmision (arriba al centro): logo de la competicion, rotulo, los dos equipos (logo + sigla), el
// marcador y los pips de mapa (formato 1/3/5).
marcador({ comp, rotulo, local, visita /* { nombre, sigla, logo: Node, marcador } */, formato, mapas /* [{ resultado }] */ })
  -> { nodo, actualizar({ local, visita, mapas }) }
placaInferior({ rotulo, titulo, sub, tono }) -> nodo                 // la placa inferior (lower third)
cinta({ rotulo, items /* [{ texto, logo?: Node }] */ }) -> nodo       // la cinta de noticias que corre
```

### 4.5 `js/beats.js` (M)

```js
// Un participante (canvas o lo que no sea WAAPI): { en(t), saltar?(), pausar?(), reanudar?(), destruir?(), listo?, placa?() }
crearBeats({ duracion, asentarse /* ms donde salta Espacio */ }) -> {
  waapi(animaciones),            // registra animaciones WAAPI (las mueve por currentTime)
  agregar(participante),         // registra un participante con su en(t)
  destello(t),                   // pide un destello en t; hace cumplir <= 3/s (corre o descarta el que sobra)
  esperar(t) -> Promise,         // resuelve cuando el reloj REAL pasa t; NO dispara si congelar() busca mas adelante
  iniciar(), congelar(t), saltar() /* va a `asentarse`, nunca finish() */, pausar(), reanudar(), destruir(),
}
```

### 4.6 `js/trofeo.js` y `js/confeti.js` (M)

```js
crearTrofeo(lienzo, { material /* 'oro'|'plata' */, perfil /* id de la tabla de copas */, tonos /* { luz, contra, noche } */ })
  -> { entrar(t0), en(t), pausar(), reanudar(), destruir() /* WEBGL_lose_context */, listo /* Promise */,
       placa() /* rect de la placa de la base, para el logo <img> */, redimensionar() }
crearConfeti(lienzo, { colores /* nombres de token */, semilla, origenes, cantidad }) -> participante
```

### 4.7 `js/sonido.js` (K): lo que se suma

`ding()` (el aviso), `golpe()` (letras, logo), `quemado()`, `confeti()`, `victoria()`, `derrota()` y `flash()`, todos
sintetizados con WebAudio y mudos si el sonido está apagado. Las pantallas los llaman así: `sonido.golpe?.()`.

## 5. Quién es dueño de qué

| Ola | Worker | Archivos (solo estos) |
|---|---|---|
| 1 | **K · el kit** | `js/`: `color`, `fondo`, `ambiente`, `main`, `aura`, `util`, `iconos`, `marco`, `sonido`, `competicion`, `logos`, `opciones`, `tono`, `ceremonia`, `transmision`, `final` · `estilos/`: `base`, `ambiente`, `fondo`, `final`, `linea`, `ceremonia`, `transmision` · `index.html`, `final.html`, `linea.html` (nuevo) · su bloque de `tokens.css` · su subsección del README |
| 1 | **M · los momentos** | `js/`: `beats`, `trofeo`, `confeti`, `cumbre` · `estilos/`: `momento` (nuevo: ahí se muda la clase base `.takeover`, que hoy está en `cumbre.css` y que la firma también usa), `cumbre` · `trofeo.html` (nuevo) · su bloque de `tokens.css` · su subsección del README |
| 2 | **A · la transmisión** | `js/partido.js`, `estilos/partido.css` · su bloque · su subsección |
| 2 | **B · la decisión** | `js/decision.js`, `js/escena.js`, `estilos/decision.css` · su bloque · su subsección |
| 2 | **C · el mercado y la firma** | `js/mercado.js`, `estilos/mercado.css` · su bloque · su subsección |
| 3 | **U · la unificación** | lo que diga su lista de observaciones |

- **En la ola 2, todo lo de K y M queda congelado.** Si te falta algo, lo pedís en el informe (o al supervisor), no lo
  inventás en tu archivo.
- **Nadie toca:** `vitrina/comun/**` (lo comparten las otras direcciones), `vitrina/datos/**`, `src/**`, `a-luz`,
  `b-nocturno`, `c-pantallas`, `inicio.js`/`inicio.css` (el inicio es la referencia), `eras.*`, `variantes.*` y
  `opciones.html`.
- **Prefijos de clase nuevos** (la lección de §4.8: una clase genérica de una hoja pisó a otra pantalla):

  | Prefijo | Quién |
  |---|---|
  | `ln-` | el kit, también la ceremonia y la transmisión |
  | `cu-` | los momentos |
  | `tx-` | la transmisión |
  | `dc-` | la decisión |
  | `ms-` | el mercado y la firma (`mk-` ya es de `op=final`) |

  Nada genérico (`.logo`, `.titulo`, `.boton`) en hojas nuevas.
- **`op=linea` es aditivo.** `final`, las opciones de §4.7 (`luz`, `transmision`, `escenario`, `escena`, `cliente`,
  `bisagra`, `mesa`, `anuncio`, `orgs`) y "sin op" se tienen que ver igual que antes: son la comparación del usuario
  (la tecla `0` de `final.html`).

## 6. Lo que rechaza `vitrina/comun/verificar.mjs` (corrélo antes de cada commit)

- **`tick` en cualquier forma**: `--tick`, `.tick`/`.ticks`, `class="tick"` e incluso un método `x.tick()`. Usá
  `paso()`, `cuadro()` o `marcas` para las marcas del aro (y el aro del LoL no las tiene).
- **`scanline`**, aun en un comentario: nada de rayas CRT en el video del stream.
- **`repeating-linear-gradient`** y las grillas de `linear-gradient` repetido con `background-size`.
- **`escuadra`**: nada de esquineros en el marco hextech.
- **El hex `#2ee8ff`**: el turquesa de la ceremonia es otro, medido y en un token.
- **La familia Barlow** y `--clip-corte`.
- **`Math.random(`**, aun en un comentario. El azar decorativo sale de `vitrina/comun/azar.js`.
- **Color literal fuera de `tokens.css`.**
  - En JS, ningún `#hex`, aun en un comentario, y `rgb(`/`hsl(` solo dentro de un template literal (con un backtick
    antes en la misma línea).
  - El GLSL usa `vec3` en floats o lee los tokens con `leerColor`.
- **`var(--x)` sin fallback** que no esté declarado en un `tokens.css` o en el mismo archivo. Las `--tono-*` de tiempo
  de ejecución necesitan su valor por defecto en `tokens.css`.

## 7. Reglas espejo de producción (las de siempre)

- **Logos de orgs y ligas:** solo `<img>` enlazado a `static.lolesports.com` (de `js/logos.js`), nunca en un canvas ni
  en una textura WebGL (CORS), y nunca versionados. Si no cargan, va el escudo-monograma.
- **El arte de campeón** sí va a canvas o WebGL: Data Dragon responde CORS. Hay que usar el cargador de
  `comun/arte.js`.
- **Camino quieto**: con movimiento reducido o INST todo aparece en su estado final, en CSS y en JS.
- **Destellos**: ≤ 3 por segundo, sumando todo lo que destella (fogonazo, onda, flash, VICTORIA, `amb.pulso`).
- **Contraste** ≥ 4,5:1 **medido por píxeles** (como en §4.7/§4.8), incluidas las capas `aria-hidden` con texto.
- **Sin `backdrop-filter`** sobre el canvas del ambiente.
- **Números con referente** (regla 13) y **lo dibujado es el motor**: nada de campeones, stats ni resultados inventados.
  El chat y los espectadores son decorativos y se arman con datos reales y el PRNG decorativo.
- **El celular** (390×844) sin scroll horizontal, y `webgl=0` y `peor=1` tienen que andar.
- **Teclado**: `final.html` se queda con ← → (cambia de pestaña), `0` y `R`. Las pantallas usan 1-9, Enter, Espacio y
  Tab.

## 8. Datos, servidor y capturas

- **Datos**: `vitrina/datos/muestras.json` (seed 61), con las claves `inicio`, `evento`, `planAmateur`, `serie`,
  `serieReplan`, `swiss`, `mercado`, `firma`, `titulo`, `final`, `mundial`, `cierreAnio`, `eras`, `peorCaso` y `meta`.
  El código de cada pantalla ya las lee (`partido.js`, `decision.js`, `mercado.js`, `cumbre.js`): seguí ese camino en
  vez de explorar el JSON entero.
  - Cada mapa de la serie trae `campeon` (el tuyo), `rivalJuega`, `resultado`, `p`, `cierre` y `quemadosDespues`.
  - El motor **no** tiene los campeones de los otros 8 jugadores.
- **Servidor**: desde la raíz de tu worktree, `node vitrina/servir.mjs --puerto <tu puerto>`:

  | Worker | Puerto |
  |---|---|
  | K | 8111 |
  | M | 8112 |
  | A | 8113 |
  | B | 8114 |
  | C | 8115 |
  | U | 8116 |

  Matá solo el PID que abriste (`taskkill //PID <pid> //F`). Nunca `pkill`, `killall` ni `taskkill /IM node.exe`.
  **Nunca toques el 8090 ni el 8095** (el 8095 es el que mira el usuario).
- **La URL** es `http://127.0.0.1:<puerto>/fusion/index.html#pantalla=<p>&muestra=<m>&op=linea&era=auto&panel=0`.
  Las pantallas y muestras son: `decision/evento`, `decision/planAmateur`, `partido/serie`, `partido/serieReplan`,
  `partido/swiss`, `mercado/mercado`, `mercado/firma` y `cumbre/titulo`.
- **Las capturas**: un script de Playwright propio en tu carpeta temporal (no en el repo).
  - Chromium en caché: `C:/Users/Ignacio/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe`.
  - `playwright-core` por `createRequire` desde
    `C:/Users/Ignacio/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core`.
  - Flags: `--no-sandbox --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
  - Esperá `window.vitrina.listo()`. Para elegir, `window.vitrina.elegir(n)`; para fijar un instante,
    `window.vitrina.congelar(ms)`.
  - **Las tiras** van a 0, 150, 400, 800, 1500, 2400, 4000 y 5000 ms, y se juntan en **una hoja de contactos** (una
    sola imagen).
  - **Mirá tus capturas** (Read): cero errores de consola no prueba que se vea bien.
- **Antes de cada commit**: `node vitrina/comun/verificar.mjs` en verde y 0 errores de consola en tus pantallas con
  `op=linea`, `op=final` y sin op.

## 9. Entrega

- Commits en tu rama, con mensajes en castellano.
- **Un informe de ≤ 15 líneas**: qué hiciste y dónde, las decisiones que tomaste, lo que pedís de un archivo congelado,
  los números medidos (contraste, fps) y la ruta de tu hoja de contactos.
- No pegues archivos.
