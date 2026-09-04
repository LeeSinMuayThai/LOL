// El reproductor de beats (fase T3, PLAN.md "T3 — El escenario y el
// reproductor"). Antes de esta fase, `avanzar()` corría splits en un `for`
// hasta que algo interrumpía y pintaba todo junto al final: el jugador veía
// un salto con ocho líneas de log ya escritas, en un juego cuyo compás es
// "cada split trae 1 o 2 decisiones, nunca más" (`CONCEPTO` §2). Esto no
// cambia qué calcula el motor — solo cuándo y cómo entra cada línea al DOM.
import { crearLogItem } from './components/feed.js';
import * as sonido from './sonido.js';

const CLAVE_VELOCIDAD = 'lolcs-velocidad-reproductor';
const VELOCIDADES = ['x1', 'x2', 'instantaneo'];
// `--dur-beat` en tokens.css es 700ms — "el pulso del reproductor de T3",
// literal desde que se escribió T0. x2 es la mitad; instantáneo no espera.
const ESPERA_MS = { x1: 700, x2: 350, instantaneo: 0 };
// Compacto a propósito: comparte espacio en el topbar con el toggle de
// sonido, que es un solo emoji. `title` (en index.html) lleva la palabra
// completa para quien lo lea con lupa.
const LABEL_VELOCIDAD = { x1: '1×', x2: '2×', instantaneo: '⚡' };

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

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// La misma preferencia que ya apaga las animaciones en CSS (base.css):
// acá se respeta también para el TIMING de JS — sin esto, el CSS no
// animaría nada pero el reproductor igual pausaría 700ms entre líneas.
function motionReducido() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

const LIMITE_FEED = 8; // mismo número que `renderFeed` (components/feed.js)

// Revela `nuevasEntradas` en `logList`, una por una. `logList` ya trae lo
// que quedó de renders anteriores — esto NO lo reemplaza (a diferencia de
// `renderFeed`): inserta arriba (más reciente primero, mismo orden que
// siempre) y recorta abajo al límite de siempre cuando termina.
//
// `registroAntes`/`registroDespues` (opcionales, `career.registro`) son
// para el stinger de victoria/derrota: no hay un campo booleano en el log
// — el resultado vive en la prosa del `message` — así que se lee la
// diferencia en los contadores que el registro ya lleva, en vez de
// adivinar por texto.
export async function reproducirBeats(logList, nuevasEntradas, { registroAntes, registroDespues, bisagra } = {}) {
  if (!logList || nuevasEntradas.length === 0) {
    return;
  }

  const instantaneo = velocidad === 'instantaneo' || motionReducido();
  const espera = instantaneo ? 0 : ESPERA_MS[velocidad];

  for (const entrada of nuevasEntradas) {
    logList.insertBefore(crearLogItem(entrada), logList.firstChild);
    if (!entrada.tecnico) {
      sonido.tick();
    }
    if (espera > 0) {
      await dormir(espera);
    }
  }

  while (logList.children.length > LIMITE_FEED) {
    logList.removeChild(logList.lastChild);
  }

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
