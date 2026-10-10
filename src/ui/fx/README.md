# `src/ui/fx/`: el kit de efectos

El kit de la fusión con `op=linea` (la especificación de producción, PLANUI §2), portado de `vitrina/fusion/js/` (U1k,
PLANUI §11). Contrato: `vitrina/fusion/LINEA.md` §4. Las pantallas de la ola 2 lo usan **sin cambiarlo**: si falta
algo, se pide (no se inventa un efecto propio en la familia).

Reglas que cumple todo el kit:
- importar cualquier módulo **no toca el DOM** (el juego importa la UI en Node); todo acceso a `document` va adentro de funciones;
- cero colores literales: los colores salen de los tokens **por nombre** (`util.js leerColor`, normalizado por un canvas
  de 1×1); al shader viajan como uniformes (el GLSL no tiene tripletes literales, PLANUI §9.5);
- el azar decorativo es `azar.js`, nunca `rngUi` ni `Math.random`;
- todo efecto degrada a nada si falla; con INST (`<html data-inst>`, lo pone `api.inst(si)`), `data-reducido` o
  `prefers-reduced-motion` todo aparece en su cuadro final; ≤ 3 destellos por segundo;
- las hojas viven en `src/ui/estilos/fx.css` (prefijos `ln-` y `cu-`), con los tokens de `tokens.css` (los nombres de la vitrina).

## La raíz: `index.js`

`montarFx(contenedor) -> api | null` (la firma fijada en `4e3ff8a`; U1 la monta sobre `#fx-ambiente`). Cada método
está envuelto: un fallo degrada a nada.

| Método | Qué hace |
|---|---|
| `ambiente({ era, animo, arte, paleta, cruce, costura, suspenso, encuadre, velo, lightsticks, apuntado, retardo, instantaneo })` | parcial (lo que no viene se mantiene); ver `ambiente.js` |
| `fondo({ contexto, escena, instantaneo, dur })` | la política del mundo de la pantalla: `contexto` `'inicio'`/`'juego'`/`'momento'` (la curva del bitono) y `escena: 'costura'` |
| `tono(tono, { paleta = true, k = 1 })` | el segundo tono en `<html>` (`--tono-*`, `data-tono`: tiñe la noche, `fx.css`) y en la luz del mundo |
| `pulso(tipo, retardo)` | `elegir`, `logro`, `golpe`, `peligro`, `gloria`, `cambio`, `apuntar`; se superponen, ≥ 335 ms entre arranques |
| `momento({ retardo, dura })` / `takeover(retardo)` | el mundo sube al momento y vuelve en ~2 s / va al 100 % y se queda |
| `aquietar(si = true)` | la enmienda de la regla 1: en ≤ 1 s (800 ms) el mundo va al 35 % de su velocidad y el arte deja de "respirar" |
| `costura()` | la geometría de la costura ahora: `{ k, posicion, angulo, vertical, a: {x, y}, b: {x, y} }` (fracciones, desde arriba) |
| `quiebre(retardo)` | la luz que se quiebra un instante ("te leyeron") |
| `congelar(ms)` / `pausar()` / `reanudar()` / `destruir()` | capturas; minijuego o cuarto abierto (la pestaña oculta ya pausa sola) |
| `aura` | el foco de campeón (`aura.js`): `pantalla(clave, { pegajosa })`, `ir(clave)`, `alCambiar(fn)` |
| `inst(si)` | el reproductor entró o salió de INST |
| `reloj()`, `cuadros()`, `intensidad()`, `impl` | el reloj del ambiente, los cuadros dibujados (fps), el estado del mundo, `'webgl'`/`'css'` |

## Los módulos

| Módulo | API | Lo usa |
|---|---|---|
| `ambiente.js` | `crearAmbiente(contenedor, { meta })` (lo monta `index.js`); `ENCUADRES`, `PULSOS`, `ERAS`; `fotografiar(eras, o)` / `fotografiarTonos(tonos, o)` (fotos fijas del mundo en un canvas 2D: la carta, el PNG) | todas, vía `api` |
| `fondo.js` | `politica({ contexto, escena })`, `TIEMPOS`, `ESTADO_PLENO` | `api.fondo` |
| `color.js` | `colorDe(contexto)`, `fijarColor(contexto)`, `mezclaPieza()`, `pintarCampeon(canvas, img, sombra, luz, { foco, mezcla })` | retratos, libres, cartas de carga (inicio, serie, mercado) |
| `tono.js` | `tonoEra`, `tonoCompeticion`, `tonoDestino`, `tonoOrg`, `TONO_ORO`, `TONO_PLATA`, `tonoDe({ contexto })`, `parecidos(t1, t2)`, `separar(tA, tB, tComp)`, `aplicarTono(nodo, tono)`, `paletaDe(tono, k)` | todas (el tono dice dónde estás) |
| `aura.js` | `crearAura(amb)` (lo crea `index.js`: `api.aura`), `claveCampeon(k)`; cualquier nodo con `data-campeon="<clave>"` lleva la luz a ese campeón | inicio (champ select, `pegajosa`), serie, decisión |
| `arte.js` | `cargarImagen(url)` (CORS, nunca aborta ni rechaza: sin red, `null`), `urlSplash/urlCarga/urlCentrada/urlTile/urlIcono(clave)`, `precargar(urls)` | todo arte de campeón (`<img>`, canvas, WebGL) |
| `azar.js` | `crearAzar(texto)` (mulberry32 + xmur3), `azarFx(seed)` = `crearAzar(seed + ':fx')` | chat de relleno, partículas, confeti |
| `ceremonia.js` | `anilloAceptar({ escudo, encabezado, cola, tono, segundos, alAceptar, sonido, velo })`, `bloquear({ texto, tecla, alBloquear, sonido })`, `victoriaDerrota({ gano, sub, tono, retardo })`, `quemar(nodoCarta, { retardo, sonido })`, `ARO` | inicio (`bloquear`), serie y Swiss (VICTORIA/DERROTA, `quemar`), mercado (FIRMAR = `bloquear`, ¡OFERTA ENCONTRADA! = `anilloAceptar`), decisión bisagra (el aviso) |
| `transmision.js` | `marcador({ comp, rotulo, local, visita, formato, mapas })` → `{ nodo, actualizar }`, `placaInferior({ rotulo, titulo, sub, tono })`, `cinta({ rotulo, items })` | serie y Swiss; la cinta del mercado |
| `competicion.js` | `competicionDe(vista, { swiss })`, `COMPETICIONES`, `logoOrg(nombre)`, `logoComp(comp)`, `siglaDe(nombre)`, `equipoReal`, `logosListos(raiz)` | el marcador, la serie, el Swiss |
| `logos.js` | `pintarLogo(nombre, { tam, liga, alt })`, `logoOrg`, `logoLiga`, `equiposDe(liga)` (la pared de escudos), `escudo(ini)`, `iniciales`, `tonoOrg(nombre)` (la paleta `--org-<x>`; no confundir con el de `tono.js`) | decisión bisagra (`liga`), mercado, título |
| `iconos.js` | `icono(nombre)`, `triangulos(magnitud, signo)`, `glifoDeCampo(campo)`, `ABREVIATURA`, `glifoRol(rol, clase = 'ln-glifo-rol')` | decisión, inicio (roles), mercado (el mapa de las líneas) |
| `movimiento.js` | `revelar`/`entrar(nodo, delay, desde, dur)`, `salir`, `escalonar(nodos, { paso })`, `esperar(nodo, ms)`, `plegar(contenedor, o)`, `lineasConMascara(nodo)`, `odometro(nodo, desde, hasta, { delta, sufijo })` (sobre `moverNumero` de `ui/core/delta.js`), `deltaNodo`, `textoDelta`, `num` | todas |
| `beats.js` | `crearBeats({ duracion, asentarse })` → `{ waapi, agregar, destello, esperar, iniciar, congelar, saltar, pausar, reanudar, destruir }` | momentos (firma, título), la serie, el mercado |
| `trofeo.js` | `crearTrofeo(canvas, { material, perfil, tonos, foco })` → `{ nodo, entrar, en, foco, listo, placa, redimensionar, destruir }` (SVG sin WebGL), `copaDe(idComp)`, `COPAS`, `SUBIDA` | título; decisión bisagra (`copas`: dos copas con `foco`) |
| `confeti.js` | `crearConfeti(canvas, { colores, semilla, origenes, cantidad, calma })` → participante de `beats` (`<canvas class="cu-confeti">`) | título, firma |
| `util.js` | `el`, `svg`, `leerColor`, `duotono`, `animar`, `reducido`, `inst`, `quieto`, `celular`, `EXPO`, `SALE`, `RESORTE`, `DUR`, `seguro` | el kit |

El sonido del kit vive en `src/ui/sonido.js` (aditivo): `ding`, `golpe`, `quemado`, `confeti`, `flash`, `tension`,
`latido`, `victoriaCeremonia`, `derrotaCeremonia` y el objeto `sonidoFx` (los nombres de LINEA §4.7) que se pasa como
`sonido` a la ceremonia y a las pantallas. Mudos con el sonido apagado.

## Qué usa cada pantalla de la ola 2

- **La decisión bisagra** (según el contexto, PLANUI §2): `api.ambiente({ costura: { a: { arte, tono: tonoDestino(liga) }, b: {…}, caras } })`;
  `copas`: `crearTrofeo` × 2 con `foco(k, t)` y `copaDe`; `liga`: `equiposDe` + `pintarLogo`; el aviso: `anilloAceptar`.
- **La serie y el Swiss**: `api.fondo({ contexto: 'juego', escena: 'costura' })`, la costura del cara a cara (`separar`
  si los tonos se parecen), `marcador`/`placaInferior`, `victoriaDerrota`, `quemar`, `api.momento`/`api.takeover`
  (AFUERA), y el suspenso del decisivo: `api.ambiente({ suspenso: { dura, vaiven, tonos, publico, latidos } })` con
  los latidos pasados por `beats.destello` (las curvas las arma la pantalla: `curvasSuspenso` de `vitrina/fusion/js/partido.js`).
- **El mercado** (ofertas → firma → tu línea en el mapa → camiseta): `tonoOrg` + `api.tono` al apuntar, `anilloAceptar`,
  FIRMAR = `bloquear`, `cinta`, `glifoRol` para el mapa de la Grieta, `beats` + `confeti` en la firma. La firma sobre el
  contrato, la caída de la línea y la camiseta los dibuja la ola 2 (son de `vitrina/fusion/js/mercado.js`, no del kit).
- **El inicio**: `api.fondo({ contexto: 'inicio' })`, el champ select con `data-campeon` + `api.aura.pantalla(main, { pegajosa: true })`, `bloquear`.
- **Los momentos** (U3a): `beats`, `trofeo`, `confeti`, `api.takeover`. La base `.takeover` de la vitrina (`momento.css`)
  no está en `fx.css`: es de `fx/momento.js`.
