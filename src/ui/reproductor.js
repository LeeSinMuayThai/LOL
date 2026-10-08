// El reproductor de beats (fase T3, PLAN.md "T3 — El escenario y el
// reproductor"). Antes de esta fase, `avanzar()` corría splits en un `for`
// hasta que algo interrumpía y pintaba todo junto al final: el jugador veía
// un salto con ocho líneas de log ya escritas, en un juego cuyo compás es
// "cada split trae 1 o 2 decisiones, nunca más" (`CONCEPTO` §2). Esto no
// cambia qué calcula el motor — solo cuándo y cómo entra cada línea al DOM.
import { agruparBeats, renderFeed, renderPagina } from './components/feed.js';
import * as sonido from './sonido.js';

const CLAVE_VELOCIDAD = 'lolcs-velocidad-reproductor';
const VELOCIDADES = ['x1', 'x2', 'instantaneo'];
// `--dur-beat` en tokens.css es 700ms — "el pulso del reproductor de T3",
// literal desde que se escribió T0. x2 es la mitad; instantáneo no espera.
const ESPERA_MS = { x1: 700, x2: 350, instantaneo: 0 };
// FASE V (V4): el momento del cierre de año. Si el split cerró un año y el motor NO frenó en el cierre (`edadCierre` frena en
// ~92% de los años de `criterio` y en ~73% de los de `malas`: medido en 100 carreras × 60 splits), la tarjeta "Cierre de 2031"
// se sostiene este tiempo ADEMÁS de la espera de su beat. Una por año como máximo, nunca junto a la parada del motor (T9). No
// suma clics: Espacio la salta como a un beat, y en INST o con movimiento reducido pasa sola. Es un espejo para `simulate.js`
// (`ESPERA_CIERRE_ANIO_MS`) y lo guarda el check "K0 espejos de la UI".
const ESPERA_CIERRE_ANIO_MS = { x1: 2400, x2: 1200, instantaneo: 0 };
// Compacto a propósito: comparte espacio en el topbar con el toggle de
// sonido, que es un solo emoji. `title` (en index.html) lleva la palabra
// completa para quien lo lea con lupa.
const LABEL_VELOCIDAD = { x1: '1×', x2: '2×', instantaneo: 'INST' };

let velocidad = leerVelocidad();

function leerVelocidad() {
  try {
    const guardada = localStorage.getItem(CLAVE_VELOCIDAD);
    return VELOCIDADES.includes(guardada) ? guardada : 'x1';
  } catch {
    return 'x1';
  }
}

function guardarVelocidad() {
  try {
    localStorage.setItem(CLAVE_VELOCIDAD, velocidad);
  } catch { /* localStorage puede no estar disponible */ }
}

export function velocidadActual() {
  return velocidad;
}

export function labelVelocidad() {
  return LABEL_VELOCIDAD[velocidad];
}

export function ciclarVelocidad() {
  const i = VELOCIDADES.indexOf(velocidad);
  velocidad = VELOCIDADES[(i + 1) % VELOCIDADES.length];
  guardarVelocidad();
  return velocidad;
}

let skipActual = null;

export function saltarBeat() {
  if (typeof skipActual === 'function') skipActual();
}

function dormir(ms) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      if (skipActual === resolver) skipActual = null;
      resolve();
    }, ms);
    const resolver = () => {
      clearTimeout(t);
      skipActual = null;
      resolve();
    };
    skipActual = resolver;
  });
}

// FASE V (V2-C; PLAN.md §V.4): con un cuarto abierto el relato se pausa y al cerrarlo sigue. La espera de cada beat
// termina, pero el beat siguiente (y lo que venga después del último: la parada, la `vista`) no entra hasta `reanudar`.
// Sin espera entre beats (INST o movimiento reducido) la tanda entera es sincrónica: no hay nada que pausar.
let pausado = false;
let alReanudar = [];

export function pausar() {
  pausado = true;
}

export function reanudar() {
  pausado = false;
  const pendientes = alReanudar;
  alReanudar = [];
  for (const seguir of pendientes) seguir();
}

function esperarLaPausa() {
  return new Promise((resolve) => {
    alReanudar.push(resolve);
  });
}

// La misma preferencia que ya apaga las animaciones en CSS (base.css):
// acá se respeta también para el TIMING de JS — sin esto, el CSS no
// animaría nada pero el reproductor igual pausaría 700ms entre líneas.
function motionReducido() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// FASE V (V2-B): sin espera entre beats (INST o movimiento reducido), la tarjeta de cierre de un split no llega a verse:
// el controlador lo pregunta al abrir la página siguiente, que entonces arranca con la línea "Split anterior: …".
export function sinEspera() {
  return velocidad === 'instantaneo' || motionReducido();
}

// En la página (cronológica, el beat nuevo abajo), el último renglón se trae a la vista: sin esto, un split largo se
// contaba por debajo del pliegue.
function seguirAlUltimo(contenedor) {
  contenedor.lastElementChild?.scrollIntoView?.({ block: 'nearest' });
}

// Revela `nuevasEntradas` en `logList`, una por una — por `renderFeed`
// (fase J-higiene, H8), no a mano. Antes esto insertaba/borraba nodos
// directo con `insertBefore`/`removeChild`, invisibles al `WeakMap` que
// `reconciliar.js` usa como única fuente de verdad sobre lo que hay en el
// contenedor: al reanudar una carrera guardada (`renderFeed` puebla el
// mapa) y, más raro, al salir por `maxSplitsDeSeguridad`, el feed podía
// terminar con hasta el doble de filas. Ahora cada paso llama a la MISMA
// `renderFeed` que usa el resto de la UI con un `hasta` que crece de a un
// beat — el reconciliador es quien decide qué crear, actualizar o sacar, y
// el recorte al límite de siempre es un efecto de eso, no un paso aparte.
//
// `offset` (mismo contrato que `agruparBeats`, fase V, V0b): índice
// absoluto en `state.logs` de `nuevasEntradas[0]` — es el `logsAntes` que
// `app.js` ya tiene. Sin esto las claves arrancarían de 0 y no
// coincidirían con las que `renderFeed` calculó para las mismas líneas.
//
// `registroAntes`/`registroDespues` (opcionales, `career.registro`) son
// para el stinger de victoria/derrota: no hay un campo booleano en el log
// — el resultado vive en la prosa del `message` — así que se lee la
// diferencia en los contadores que el registro ya lleva, en vez de
// adivinar por texto.
//
// `pagina` (FASE V, V2-B; opcional): `{ desde, anterior, cierre, cartel }`. Con ella, cada paso pinta la página del split
// (`renderPagina`: cronológica, desde `inicioDePagina`) en vez de la ventana de `renderFeed`, y la tarjeta de `cierre`
// (si el split cerró) entra JUNTO con el último beat: usa su espera, no suma una propia. Sin `pagina`, el camino de
// siempre (`renderFeed`), el que miden los checks de H8.
export async function reproducirBeats(logList, nuevasEntradas, { registroAntes, registroDespues, bisagra, state, offset = 0, pagina = null } = {}) {
  if (!logList) {
    return;
  }
  if (nuevasEntradas.length === 0) {
    if (pagina?.cierre) {
      // D97: una página con tarjeta de cierre y sin beats (al retomar entre splits se reabre la del split anterior) tiene su
      // espera, la del último beat: si no, el primer beat de la página siguiente la reemplaza antes de que se pinte.
      const quieto = sinEspera();
      renderPagina(logList, state, { ...pagina, animar: !quieto });
      seguirAlUltimo(logList);
      const pausa = quieto ? 0 : ESPERA_MS[velocidad] + (pagina.cierre.anio ? ESPERA_CIERRE_ANIO_MS[velocidad] : 0);
      if (pausa > 0) {
        await dormir(pausa);
        if (pausado) {
          await esperarLaPausa();
        }
        skipActual = null;
      }
    }
    return;
  }

  const instantaneo = sinEspera();
  const espera = instantaneo ? 0 : ESPERA_MS[velocidad];
  const esperaDelAnio = instantaneo ? 0 : ESPERA_CIERRE_ANIO_MS[velocidad];

  const beats = agruparBeats(nuevasEntradas, offset);
  for (const [i, beat] of beats.entries()) {
    const ultimo = i === beats.length - 1;
    if (pagina) {
      renderPagina(logList, state, { ...pagina, hasta: beat.clave + 1, cierre: ultimo ? pagina.cierre : null, animar: !instantaneo });
      if (espera > 0 || ultimo) {
        seguirAlUltimo(logList);
      }
    } else {
      renderFeed(logList, state, { hasta: beat.clave + 1 });
    }
    if (beat.narrativa && !beat.narrativa.tecnico) {
      sonido.tick();
    }
    if (espera > 0) {
      // El último beat de un split que cerró un año sin parada del motor sostiene también el momento del año.
      await dormir(espera + (ultimo && pagina?.cierre?.anio ? esperaDelAnio : 0));
      if (pausado) {
        await esperarLaPausa();
      }
    }
  }

  skipActual = null;

  if (registroAntes && registroDespues) {
    if (registroDespues.seriesGanadas > registroAntes.seriesGanadas
      || registroDespues.fechasGanadas > registroAntes.fechasGanadas) {
      sonido.victoria();
    } else if (registroDespues.seriesPerdidas > registroAntes.seriesPerdidas
      || registroDespues.fechasPerdidas > registroAntes.fechasPerdidas) {
      sonido.derrota();
    }
  }

  if (bisagra) {
    sonido.swellBisagra();
  }
}
