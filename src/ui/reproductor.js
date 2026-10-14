// El reproductor de beats (fase T3, PLAN.md "T3 — El escenario y el
// reproductor"). Antes de esta fase, `avanzar()` corría splits en un `for`
// hasta que algo interrumpía y pintaba todo junto al final: el jugador veía
// un salto con ocho líneas de log ya escritas, en un juego cuyo compás es
// "cada split trae 1 o 2 decisiones, nunca más" (`CONCEPTO` §2). Esto no
// cambia qué calcula el motor — solo cuándo y cómo entra cada línea al DOM.
import { agruparBeats, renderFeed, renderPagina } from './components/feed.js';
import * as sonido from './sonido.js';
import { reducido } from './fx/util.js';

const CLAVE_VELOCIDAD = 'lolcs-velocidad-reproductor';
const VELOCIDADES = ['x1', 'x2', 'instantaneo'];
// `--dur-beat` en tokens.css es 700ms — "el pulso del reproductor de T3",
// literal desde que se escribió T0. x2 es la mitad; instantáneo no espera.
const ESPERA_MS = { x1: 700, x2: 350, instantaneo: 0 };
// FASE V (V4): el momento del cierre de año. Si el split cerró un año y el motor NO frenó en el cierre (`edadCierre` frena en
// ~92% de los años de `criterio` y en ~73% de los de `malas`: medido en 100 carreras × 60 splits), la tarjeta "Cierre de 2031"
// se sostiene este tiempo ADEMÁS de la espera de su beat. Una por año como máximo, nunca junto a la parada del motor (T9). No
// suma clics: Espacio la salta como a un beat, y en rápido no espera (el valor 0). PLANUI §0.6: en TODAS las velocidades, después
// de la tarjeta entra el resumen de la temporada (un momento, `momentos` de `reproducirBeats`), que espera a Continuar. Es un
// espejo para `simulate.js` (`ESPERA_CIERRE_ANIO_MS`; los `x1` no cambian) y lo guarda el check "K0 espejos de la UI".
const ESPERA_CIERRE_ANIO_MS = { x1: 2400, x2: 1200, instantaneo: 0 };
// PLANUI §0.4 (P1, el movimiento): el botón dice el ESTADO, no una acción ("INST" se leía como "apretá para ir
// instantáneo" y el jugador creía haberlo sacado). El valor guardado sigue siendo `instantaneo`, por compatibilidad con
// las carreras y preferencias ya guardadas; en pantalla es "RÁPIDO". `NOMBRE_VELOCIDAD` es la palabra del `title`.
const LABEL_VELOCIDAD = { x1: '1×', x2: '2×', instantaneo: 'RÁPIDO' };
const NOMBRE_VELOCIDAD = { x1: 'normal (1×)', x2: 'doble (2×)', instantaneo: 'rápida' };
// PLANUI §0.4: en rápido el relato no espera entre beats (`ESPERA_MS.instantaneo` = 0, el espejo de simulate.js), pero
// las narraciones de las paradas corren su secuencia entera, con las esperas a esta escala de las de 1×.
const ESCALA_RAPIDA = 0.35;

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

// La velocidad en palabras, para el `title` y el `aria-label` del botón ("Velocidad: rápida — clic para cambiar").
export function nombreVelocidad() {
  return NOMBRE_VELOCIDAD[velocidad];
}

export function ciclarVelocidad() {
  const i = VELOCIDADES.indexOf(velocidad);
  velocidad = VELOCIDADES[(i + 1) % VELOCIDADES.length];
  guardarVelocidad();
  return velocidad;
}

let skipActual = null;
// PLANUI §0.2 (narrar la respuesta en el lugar): mientras una parada cuenta su resultado (la opción que se vuelve su
// resultado, los mapas de la serie, la firma), Espacio la saltea y un cuarto abierto la pausa, igual que a un beat.
let narracion = null;

export function saltarBeat() {
  if (typeof skipActual === 'function') skipActual();
  else narracion?.saltar?.();
}

// `control`: `{ saltar, pausar, reanudar }` de la narración en curso. Devuelve cómo soltarla.
export function narrar(control) {
  narracion = control;
  if (pausado) control?.pausar?.();
  return () => {
    if (narracion === control) narracion = null;
  };
}

export function narrando() {
  return narracion !== null;
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
// Sin espera entre beats (rápido) la tanda entera es sincrónica: no hay nada que pausar.
let pausado = false;
let alReanudar = [];

export function pausar() {
  pausado = true;
  narracion?.pausar?.();
}

export function reanudar() {
  pausado = false;
  narracion?.reanudar?.();
  const pendientes = alReanudar;
  alReanudar = [];
  for (const seguir of pendientes) seguir();
}

function esperarLaPausa() {
  return new Promise((resolve) => {
    alReanudar.push(resolve);
  });
}

// PLANUI §0.4 (P1): "sin movimiento ni números que ruedan" (los cuadros finales van puestos) es SOLO el movimiento
// reducido (la preferencia del sistema o `data-reducido`; `fx/util.js reducido`, que en Node, sin DOM, es verdadero).
// Antes también lo era INST, y el jugador que iba rápido no veía ni una animación: en rápido todo se mueve, solo que el
// relato no espera. El PULSO entre beats es otra pregunta, `sinPulso`.
export function sinEspera() {
  return reducido();
}

// FASE V (V2-B) y PLANUI §0.3: el relato no espera entre beats solo en rápido (la velocidad que eligió el jugador); ahí
// la tarjeta de cierre de un split no llega a verse y el controlador lo pregunta al abrir la página siguiente, que
// arranca con la línea "Split anterior: …". Con movimiento reducido (una preferencia del sistema operativo) el relato
// conserva el pulso de la velocidad elegida: los beats aparecen sin desplazarse pero cada uno tiene su tiempo de lectura.
export function sinPulso() {
  return velocidad === 'instantaneo';
}

// PLANUI §0.3 y §0.4: cómo cuenta una parada su resultado en el lugar. 'reducido' es la preferencia del sistema (o
// `data-reducido`): cuenta lo mismo sin desplazamientos, cada paso un cuadro fijo con un fundido corto y su tiempo de
// lectura. 'normal': la secuencia entera, con las esperas a `escalaDeEspera()` (rápido también: el modo 'inst', que iba
// al cuadro final, ya no existe).
export function modoDeMovimiento() {
  return reducido() ? 'reducido' : 'normal';
}

// PLANUI §0.2: la escala de las esperas de una narración (la parada que cuenta su resultado en el lugar): 1 en x1, la
// mitad en x2 (la misma proporción que el pulso del reproductor) y `ESCALA_RAPIDA` en rápido (§0.4: la secuencia
// entera, corta). Con movimiento reducido las esperas valen (son el tiempo de lectura de cada cuadro, §0.3).
export function escalaDeEspera() {
  return velocidad === 'instantaneo' ? ESCALA_RAPIDA : ESPERA_MS[velocidad] / ESPERA_MS.x1;
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
//
// `momentos` (PLANUI §0.6, U3a; opcional): `[{ indice, alFinal?, mostrar }]`, los de `ui/core/momentos.js` que `app.js` ya
// filtró. Uno entra después del beat que trae su log (`indice <= beat.clave`) y de la espera de ese beat; uno `alFinal` (el
// resumen de la temporada), después del último beat y de la espera del año. El relato no sigue hasta que `mostrar()`
// resuelve (el jugador apretó Continuar), en TODAS las velocidades: en rápido el relato no espera entre beats, pero un
// momento espera igual. Sin beats nuevos (la parada ya contó todo el tramo en el lugar), los momentos entran igual.
export async function reproducirBeats(logList, nuevasEntradas, { registroAntes, registroDespues, bisagra, state, offset = 0, pagina = null, momentos = null } = {}) {
  if (!logList) {
    return;
  }
  const pendientes = Array.isArray(momentos) ? [...momentos] : [];
  // ¿Hay un momento para mostrar después del beat `clave` (`Infinity`: el final del tramo, también los `alFinal`)?
  const toca = (m, clave) => clave === Infinity || (!m.alFinal && m.indice <= clave);
  async function mostrarMomentos(clave) {
    for (let i = pendientes.findIndex((m) => toca(m, clave)); i >= 0; i = pendientes.findIndex((m) => toca(m, clave))) {
      const [momento] = pendientes.splice(i, 1);
      skipActual = null;
      try {
        await momento.mostrar();
      } catch (error) {
        console.error('No se pudo mostrar el momento:', error);
      }
    }
  }
  if (nuevasEntradas.length === 0) {
    if (pagina?.cierre) {
      // D97: una página con tarjeta de cierre y sin beats (al retomar entre splits se reabre la del split anterior) tiene su
      // espera, la del último beat: si no, el primer beat de la página siguiente la reemplaza antes de que se pinte.
      const quieto = sinPulso();
      renderPagina(logList, state, { ...pagina, animar: !sinEspera() });
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
    await mostrarMomentos(Infinity);
    return;
  }

  const instantaneo = sinPulso();
  // sin movimiento (movimiento reducido): el beat aparece puesto, sin que ruede su número; en rápido entra CON su
  // animación aunque no haya espera (PLANUI §0.4)
  const animar = !sinEspera();
  const espera = instantaneo ? 0 : ESPERA_MS[velocidad];
  const esperaDelAnio = instantaneo ? 0 : ESPERA_CIERRE_ANIO_MS[velocidad];

  const beats = agruparBeats(nuevasEntradas, offset);
  // un momento cuyo log ya contó la parada en el lugar (la firma que la carta dijo como resultado) entra antes del relato
  await mostrarMomentos(offset - 1);
  for (const [i, beat] of beats.entries()) {
    const ultimo = i === beats.length - 1;
    if (pagina) {
      renderPagina(logList, state, { ...pagina, hasta: beat.clave + 1, cierre: ultimo ? pagina.cierre : null, animar });
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
    // sin momentos pendientes para este beat no hay `await`: en rápido la tanda sigue siendo sincrónica
    if (!ultimo && pendientes.some((m) => toca(m, beat.clave))) {
      await mostrarMomentos(beat.clave);
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

  // el último beat ya se pintó (con la tarjeta de cierre, si el split cerró) y esperó: el título que trajo y el resumen
  // de la temporada, en ese orden
  await mostrarMomentos(Infinity);
}
