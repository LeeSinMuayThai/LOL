# Vitrina — tres direcciones de arte para la UI nueva

Una página para **comparar tres direcciones de arte** de Un Split Más con la misma carrera real. **No es parte del
juego**: vive en `vitrina/`, fuera de `src/` y de `dist/`, y no la sirve `server.js`. Cero dependencias, ES modules.

## Cómo correrla

```
node vitrina/servir.mjs                 # http://127.0.0.1:8095/
node vitrina/servir.mjs --puerto 8102
```

Abrir la URL que imprime. `index.html` es el índice (las tres direcciones, lado a lado, funciones, antes/después, cómo
elegir). Cada dirección se abre sola en `/<direccion>/index.html`.

## Estructura

```
vitrina/
  servir.mjs            servidor estático (127.0.0.1, sin salir de vitrina/)
  index.html/.css/.js   el índice (neutral)
  README.md             este archivo
  datos/muestras.json   datos reales de una carrera (los genera otro proceso; no se edita a mano)
  hoy/                  capturas del juego tal como está hoy + indice.json (pantalla/muestra -> captura)
  comun/                lo compartido (ver abajo)
  a-luz/  b-nocturno/  c-pantallas/    una carpeta por dirección
```

Una dirección:

```
<direccion>/
  index.html            carga ../comun/fuentes.css, ../comun/tokens.css, estilos/tokens.css y sus hojas
  estilos/tokens.css    TODOS los colores literales de la dirección (y solo ahí)
  estilos/*.css         el resto de las hojas, solo con var(--token)
  js/                   módulos ES; importan de ../../comun/
  capturas/             PNG + informe.json que escribe comun/capturar.mjs (NO se versiona: ~70 MB por dirección, está en el .gitignore; se regenera)
  README.md             decisiones de la dirección, qué hay en cada pantalla, qué falta
```

## `comun/` — lo compartido

| Archivo | Para qué |
|---|---|
| `datos.js` | `cargarMuestras()` → `fetch('../datos/muestras.json')` con caché; si falta, cae a `stub-muestras.json` y avisa por consola (warning). |
| `azar.js` | `crearAzar(semillaTexto)` → `{ siguiente(), entre(a,b), entero(a,b), elegir(arr) }`. PRNG decorativo determinista (xmur3 + mulberry32). No hay `Math.random` en la vitrina. |
| `arte.js` | Cargador único de Data Dragon: `cargarImagen(url)` (CORS `anonymous`, caché por URL, resuelve `null` si falla, nunca aborta) y `urlSplash/urlCarga/urlCentrada/urlTile/urlIcono(key, meta)`. Nada de `url()` de CSS para el arte. |
| `ambiente.md` | El **contrato** del ambiente (abajo). |
| `ambiente-css.js` + `.css` | Implementación de respaldo sin WebGL (capas CSS que cambian por era). Toma sus colores de los `--amb-*`. |
| `panel.js` + `panel.css` | El panel flotante (abajo). Vive en Shadow DOM. |
| `celular.html` (+ `.css`, `.js`) | La misma página dentro de un iframe de 390×844 con un marco de teléfono sobrio. |
| `catalogo.js` | Pantallas y muestras comunes, `hashDe(...)` y la era automática. **Ronda 1b** (`PANTALLAS`, lo único que muestran el panel y el índice): `inicio`; `decision` = evento, planAmateur; `partido` = serie, serieReplan, swiss; `mercado` = mercado, firma; `cumbre` = titulo, final; `eras`. Finalistas (`FINALISTAS`): a-luz y c-pantallas; **b-nocturno queda archivada** en la ronda 1 (`PANTALLAS_RONDA_1`): se abre igual, el panel no le ofrece las pantallas nuevas y el índice dice "esta dirección no tiene esta pantalla" (`direccionTiene()`). **Ronda 2** (`RONDA_2`, oculta): temporada = cierreAnio; cumbre = mundial. `ERA_DE_MUESTRA` dice qué era le toca a cada muestra (los datos no traen campo `era`). Las muestras son claves de primer nivel de `datos/muestras.json`. |
| `tokens.css` | Colores y escala del panel, del índice, del marco de celular, y los `--amb-*` de respaldo. Una dirección puede redefinir los `--amb-*` en su propio `estilos/tokens.css`. |
| `fuentes.css` + `fuentes/` | `@font-face` locales (latin, woff2, `font-display: swap`). |
| `verificar.mjs`, `capturar.mjs` | Verificador y capturas (abajo). |

### Panel

```js
import { crearPanel } from '../../comun/panel.js';
crearPanel({
  direccion: 'a-luz',
  pantallas: Object.keys(PANTALLAS),     // import { PANTALLAS } from '../../comun/catalogo.js' (ronda 1)
  muestras: PANTALLAS,
  eras: ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'],       // opcional
  alCambiar(estado, cambios) {},    // al arrancar (cambios = todas las claves) y en cada cambio
  acciones: { repetir() {}, elegir(n) {}, congelar(ms) {} },            // todas opcionales
});
```

Controles: pantalla · muestra · era (`Auto (la de la muestra)` + las 5 eras; `Alt+A` cicla auto → pieza → … → leyenda → auto; en la pantalla `eras`, auto usa `pieza` de base) · ▶ Repetir · Elegir 1/2/3 · Hoy · Escritorio/Celular · Sonido · Movimiento
reducido · INST · WebGL · Medidor de FPS · Peor caso · Textos breves.

**Todo el estado vive en el hash**: `#pantalla=decision&muestra=evento&era=auto&dispositivo=escritorio` y, si no son los
valores por defecto, `sonido=1 reducido=1 inst=1 webgl=0 fps=1 textos=breves peor=1`. Además `panel=0` esconde el
panel (miniaturas, capturas) y `abierto=1` lo abre. Cambiar el hash a mano también funciona.

Atributos que el panel pone en `<html>` (las direcciones los leen en CSS y en JS):

| Atributo | Cuándo |
|---|---|
| `data-pantalla`, `data-muestra`, `data-era`, `data-dispositivo`, `data-direccion` | siempre. `data-era` es **siempre la era efectiva** (nunca `auto`). |
| `data-era-fija` | la era se forzó a mano (no es `auto`) |
| `data-textos="breves\|completos"` | siempre (por defecto `completos`) |
| `data-reducido` | movimiento reducido manual. **Además** hay que respetar `prefers-reduced-motion` (`estado().reducido` ya junta los dos). |
| `data-inst` | INST: sin esperas, todo instantáneo |
| `data-sin-webgl` | WebGL "no" → usar el ambiente de respaldo |
| `data-peor-caso` | cargar los datos del peor caso (`muestras.peorCaso`) |
| `data-sonido` | sonido prendido |

`window.vitrina`:

```
irA(pantalla)  muestra(m)  era(e)  repetir()  elegir(n)  congelar(ms)  set(clave, valor)  estado()
estado().era            'auto' o una era;  estado().eraEfectiva  la ya resuelta (alCambiar avisa también cuando cambia ésta,
                        p. ej. al cambiar de muestra en auto)
fps() -> { fps, p95, n }          catalogo() -> { pantallas, muestras, eras }
listo            (opcional) la direccion lo define: () => Promise que resuelve cuando arte y ambiente quedaron puestos
```

`capturar.mjs` espera `window.vitrina.listo()` si existe (si no, que terminen las `<img>`). `congelar(ms)` llama a `acciones.congelar(ms)` y además pausa **todas** las animaciones WAAPI/CSS del documento en
`currentTime = ms`. Por eso lo animado tiene que ser WAAPI/CSS (o implementar `acciones.congelar` para lo que corre por
`requestAnimationFrame`/WebGL), si no las capturas "congeladas" no congelan.

Atajos `Alt+…` (para no pisar teclas de las direcciones: 1-4, Espacio, letras): `P` pantalla siguiente · `N` muestra
siguiente · `A` era siguiente · `R` repetir · `S` sonido · `M` movimiento reducido · `I` INST · `W` WebGL · `G` FPS ·
`Z` peor caso · `T` textos · `C` celular/escritorio · `H` hoy · `V` plegar/desplegar. (Se evitaron `Alt+F` y `Alt+E`,
que abren el menú de Chrome.)

**Celular**: al elegirlo, el panel lleva a `comun/celular.html?src=<página>#<mismo hash>`; ahí la página corre dentro de
un iframe de 390×844 (la dirección se adapta por su tamaño de viewport, no por `data-dispositivo`). "Escritorio" vuelve.

**Hoy**: abre en un lightbox la captura actual del juego para esa muestra/pantalla según `hoy/indice.json`
(busca primero por muestra, después por pantalla; usa `movil` si el dispositivo es celular y existe).

### Ambiente

Ver `comun/ambiente.md`: `crearAmbiente(contenedor, opciones)` → `{ ambiente({ era, animo, arte }), pulso(tipo),
congelar(t), pausar(), reanudar(), destruir() }`. Las tres direcciones implementan **el mismo contrato**;
`ambiente-css.js` es la referencia y el respaldo sin WebGL.

### Fuentes

Subset `latin`, woff2, bajadas de la API CSS2 de Google Fonts. **Todas OFL 1.1** (SIL Open Font License): se pueden
usar, modificar y redistribuir con el juego.

| Familia (`font-family`) | Archivo | Pesos / ejes | Peso del archivo |
|---|---|---|---|
| Mona Sans | `MonaSans.woff2` | `wght 200–900`, `wdth 75–125%` | 96 KB |
| Archivo | `Archivo.woff2` | `wght 100–900`, `wdth 62–125%` | 88 KB |
| Geist | `Geist.woff2` | `wght 100–900` | 29 KB |
| Geist Mono | `GeistMono.woff2` | `wght 100–900` | 23 KB |
| Fraunces | `Fraunces.woff2` | `wght 100–900` (+ `opsz`) | 66 KB |
| Fraunces itálica | `Fraunces-Italic.woff2` | `wght 100–900` (+ `opsz`) | 80 KB |
| IBM Plex Mono | `IBMPlexMono-400.woff2`, `-600.woff2` | 400 y 600 | 14 + 15 KB |
| JetBrains Mono | `JetBrainsMono.woff2` | `wght 100–800` | 39 KB |
| Inter | `Inter.woff2` | `wght 100–900` | 47 KB |

Latin = español completo (á é í ó ú ñ ü ¿ ¡ « »). Para un símbolo fuera de latin (flechas, ▶, estrellas) hay que
caer a la fuente del sistema o a un SVG. Para el ancho de Mona Sans/Archivo: `font-stretch: 75%…125%`.

## Verificar

```
node vitrina/comun/verificar.mjs [--direccion a-luz]
```

Por ámbito (`comun`, `indice`, cada dirección): cero `Math.random(`; color literal solo en `tokens.css`; todo
`var(--x)` sin fallback definido en el `tokens.css` de su carpeta (o en el de `comun/`, que toda página carga) o
declarado en el mismo archivo; ningún `:hover` con fondo de `--ink`; y la **lista de prohibidos** de la UI nueva
(`--clip-corte`, ticks y escuadras, `--scanline`, grilla de fondo con `linear-gradient` repetido, la familia
`Barlow`, el hex `#2ee8ff`). Código 1 si algo falla. Reutiliza `src/dev/guards.js` donde sirve tal cual
(`verificarSinFondoDeTinta`) y reimplementa las demás reglas por ámbito citando su línea.

## Capturar

```
node vitrina/servir.mjs --puerto 8102                                 # en otra terminal
node vitrina/comun/capturar.mjs --puerto 8102 --direccion a-luz       # [--congelar 1500] [--rapido]
```

Usa el Chromium en caché de Playwright (`PLAYWRIGHT_CORE` / `CHROMIUM_EXE` para cambiar las rutas). Escribe en
`vitrina/<direccion>/capturas/`:

- cada pantalla × muestra a 1440×900 y a 390×844 (la pantalla `eras` además una por era), con el movimiento prendido y
  el reloj congelado (`congelar(1500)`);
- tiras (siempre con `era=auto`) a 0/150/400/800/1500/2400 ms: `tira-elegir-evento-*` y `tira-elegir-planAmateur-*` (`elegir(1)` en decision/evento y decision/planAmateur), `tira-repetir-titulo-*` (`repetir()` en cumbre/titulo, el takeover) y `tira-repetir-inicio-*` (`repetir()` en inicio, la intro); ronda 1b: `tira-elegir-serie-*`, `tira-elegir-swiss-*` (`elegir(1)` en partido/serie y partido/swiss) y `tira-repetir-firma-*` (`repetir()` en mercado/firma), solo si la dirección tiene esa pantalla y muestra;
- una pasada con `--enable-unsafe-swiftshader` (`*-swiftshader.png`) y otra con `webgl=0` (`*-sinwebgl.png`);
- `informe.json`: errores de consola, `pageerror`, `requestfailed`, avisos, FPS por pantalla y la lista de PNG.

Sale con código 1 si hay errores (incluye imágenes de Data Dragon que no cargan: sin red, el informe lo dice).
