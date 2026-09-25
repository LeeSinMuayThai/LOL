// El reproductor de beats (fase T3, PLAN.md "T3 — El escenario y el
// reproductor"). Antes de esta fase, `avanzar()` corría splits en un `for`
// hasta que algo interrumpía y pintaba todo junto al final: el jugador veía
// un salto con ocho líneas de log ya escritas, en un juego cuyo compás es
// "cada split trae 1 o 2 decisiones, nunca más" (`CONCEPTO` §2). Esto no
// cambia qué calcula el motor — solo cuándo y cómo entra cada línea al DOM.
import { agruparBeats, renderFeed } from './components/feed.js';
import * as sonido from './sonido.js';

const CLAVE_VELOCIDAD = 'lolcs-velocidad-reproductor';
const VELOCIDADES = ['x1', 'x2', 'instantaneo'];
// `--dur-beat` en tokens.css es 700ms — "el pulso del reproductor de T3",
// literal desde que se escribió T0. x2 es la mitad; instantáneo no espera.
const ESPERA_MS = { x1: 700, x2: 350, instantaneo: 0 };
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

// La misma preferencia que ya apaga las animaciones en CSS (base.css):
// acá se respeta también para el TIMING de JS — sin esto, el CSS no
// animaría nada pero el reproductor igual pausaría 700ms entre líneas.
function motionReducido() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
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
export async function reproducirBeats(logList, nuevasEntradas, { registroAntes, registroDespues, bisagra, state, offset = 0 } = {}) {
  if (!logList || nuevasEntradas.length === 0) {
    return;
  }

  const instantaneo = velocidad === 'instantaneo' || motionReducido();
  const espera = instantaneo ? 0 : ESPERA_MS[velocidad];

  const beats = agruparBeats(nuevasEntradas, offset);
  for (const beat of beats) {
    renderFeed(logList, state, { hasta: beat.clave + 1 });
    if (beat.narrativa && !beat.narrativa.tecnico) {
      sonido.tick();
    }
    if (espera > 0) {
      await dormir(espera);
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
