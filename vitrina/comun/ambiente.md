# Contrato del ambiente

Las tres direcciones implementan **el mismo contrato**, para que el traslado al juego sea 1:1 y se pueda cambiar de
implementación (WebGL, CSS, canvas 2D) sin tocar a quien lo llama. `comun/ambiente-css.js` es la implementación de
respaldo sin WebGL y la referencia de comportamiento.

## Firma

```js
import { crearAmbiente } from '../comun/ambiente-css.js';   // o la implementación propia de la dirección

const amb = crearAmbiente(contenedor, opciones);
// contenedor: elemento HTML, posicionado (si no, se le pone position:relative). El ambiente se inserta como
//             PRIMER hijo, ocupa todo el contenedor, queda detrás del contenido (z-index 0) y no captura el mouse.
// opciones:   { meta }  -> muestras.meta (para armar la URL del arte). Una implementación puede aceptar más
//             opciones propias, pero no puede exigirlas.

await amb.ambiente({ era, animo, arte });
amb.pulso(tipo);
amb.congelar(t);
amb.pausar();
amb.reanudar();
amb.destruir();
```

| Método | Qué hace |
|---|---|
| `ambiente({ era, animo, arte })` | Cambia el ambiente con **transición** (no corte). Devuelve una Promise que resuelve cuando el arte quedó puesto (o cuando se descartó porque llegó otra llamada, o falló la carga). Llamarlo rápido muchas veces es seguro: gana la última. |
| `pulso(tipo)` | Destello/latido breve (< 1 s) que se monta sobre el ambiente. Sin efecto si el movimiento está reducido. |
| `congelar(t)` | Deja el ambiente quieto en el instante `t` (ms desde que arrancó la animación). Para capturas y para mirar cuadros. Equivale a `pausar()` + posicionar. |
| `pausar()` / `reanudar()` | Detiene / retoma el movimiento (animaciones, partículas, bucle de `requestAnimationFrame`). Pausado no gasta GPU. |
| `destruir()` | Saca todo del DOM, cancela el bucle y libera texturas/contextos. Idempotente. |

## Valores

- `era`: `pieza` · `academia` · `escenario` · `mundial` · `leyenda`. Un valor desconocido se ignora (queda la era anterior).
- `animo`: `normal` · `peligro` · `gloria`. Es un tinte/ritmo encima de la era (peligro = tenso y frío o rojizo;
  gloria = cálido y abierto). Valor desconocido: se ignora.
- `arte`: la `key` de Data Dragon de un campeón (`"Ahri"`, `"Ekko"`) o `null`. Con una key, el ambiente carga el
  **splash** con `comun/arte.js` (`urlSplash(key, meta)` + `cargarImagen`) y lo usa de fondo; con `null` lo saca.
  Si la carga falla (sin red) el ambiente sigue andando sin arte, sin error.
- `tipo` de `pulso`: `elegir` (chico, al elegir una opción) · `logro` (mediano) · `golpe` (fuerte, un momento de skill) ·
  `peligro` · `gloria`. Un tipo desconocido se ignora.

## Reglas que las tres cumplen igual

1. **Nada de `url()` de CSS para el arte**: siempre `cargarImagen` (CORS, caché, `null` si falla).
2. **Movimiento reducido**: si `<html>` tiene `data-reducido` o `prefers-reduced-motion: reduce`, el ambiente no se
   anima solo (cambia de era sin transición larga, `pulso` no hace nada). La imagen sigue ahí.
3. **INST** (`<html data-inst>`): sin esperas; las transiciones pasan a 0.
4. **Sin WebGL** (`<html data-sin-webgl>`): una implementación WebGL tiene que caer sola a la de respaldo
   (`ambiente-css.js`) si hay este atributo o si no consigue contexto.
5. **Determinismo decorativo**: lo aleatorio sale de `comun/azar.js` (`crearAzar(semilla)`), nunca de `Math.random`.
6. **Colores** solo de tokens (`--amb-*` en el `tokens.css` de la dirección; los defaults están en
   `comun/tokens.css`). Nada de colores sueltos en JS.
7. **Una sola instancia viva por contenedor**; `destruir()` antes de recrear.

## Qué hereda quien llama

El ambiente no sabe nada del juego: el código de la pantalla decide `era` según el año de carrera, `animo` según el
momento (un descenso = `peligro`, un título = `gloria`) y `arte` según el main del jugador
(`muestras.jugador.mains[n].ddragon`).
