// La narración de una parada (PLANUI §0.2, punto 4): la parada cuenta su respuesta en el lugar (la opción que se vuelve
// su resultado con los números rodando, los mapas de la serie, la firma) antes de que entre el relato. Este módulo es el
// reloj de esa narración, el mismo para todas las familias:
//   - las esperas escalan con la velocidad del reproductor (`ctx.escala`: 1 en x1, la mitad en x2, ~un tercio en rápido);
//   - el modo (`ctx.modo`, de `reproductor.modoDeMovimiento`; PLANUI §0.3, la regla nueva del movimiento reducido):
//       'normal'    la secuencia entera; Espacio la saltea (las animaciones de sus nodos terminan ya y las esperas
//                   pendientes se resuelven);
//       'reducido'  cada paso es un cuadro fijo con un fundido corto (`FUNDIDO_MS`) y su tiempo de lectura (las esperas
//                   valen); Espacio, Enter o un clic ADELANTAN un cuadro (resuelven la espera de ahora, no las que siguen);
//     (PLANUI §0.4: el modo 'inst', que iba al cuadro final, ya no existe; rápido es 'normal' con la escala corta. Un
//     `ctx.modo` viejo 'inst' o un `ctx.rapido` caen en 'normal'.)
//   - un cuarto abierto la pausa (el reproductor la pausa y la reanuda, como a un beat): las animaciones y las esperas
//     se congelan donde estaban.
// `ctx` es el de `app.js` (`narrarRespuesta`). `nodos`: donde viven las animaciones de la narración (las que Espacio
// termina y un cuarto pausa) y, con movimiento reducido, donde un clic adelanta. `reloj` (opcional): un reloj
// propio de la parada (los beats de `fx/beats.js`) con `saltar`, `pausar` y `reanudar`: Espacio y el cuarto le llegan a
// él en vez de terminar las animaciones a mano. `adelantar` (por defecto, si hay `nodos`): Enter y el clic sobre los
// nodos adelantan con movimiento reducido; una capa con sus propias teclas (el fichaje) lo apaga.

import { animar } from './fx/util.js';

// (PLANUI §0.4) Lo que se quedaba a la vista el cuadro final en INST. Ya no se usa (`vistazo()` no espera: la narración
// corre entera); se exporta todavía porque lo importan paradas de otros.
export const VISTAZO_INST_MS = 900;
// Movimiento reducido: el fundido de un cuadro al siguiente (<= 150 ms, PLANUI §0.3; el --dur-fundido de tokens.css).
export const FUNDIDO_MS = 120;

// El fundido corto de un cuadro al siguiente (movimiento reducido): lo nuevo entra en opacidad, sin moverse. Corre aunque
// el movimiento esté reducido (es opacidad).
export function fundirCuadro(nodo) {
  return nodo ? animar(nodo, [{ opacity: 0 }, { opacity: 1 }], { dur: FUNDIDO_MS, easing: 'linear', forzar: true }) : null;
}

const MODOS = ['normal', 'reducido'];
const INTERACTIVO = 'button, a[href], input, select, textarea, summary, [role="button"]';

// El modo de un `ctx` de narración: el que trae; cualquier otro (el 'inst' de antes de §0.4, un `rapido`) es 'normal'.
export function modoDe(ctx) {
  return MODOS.includes(ctx?.modo) ? ctx.modo : 'normal';
}

export function crearNarracion(ctx, nodos = [], { reloj: propio = null, adelantar = nodos.length > 0 } = {}) {
  const modo = modoDe(ctx);
  const escala = Number.isFinite(ctx?.escala) ? ctx.escala : 1;
  let saltada = escala <= 0;
  let pausada = false;
  const relojes = new Set();
  const lugares = new Set(nodos.filter(Boolean));
  const desde = typeof performance !== 'undefined' ? performance.now() : 0;

  const animaciones = () => [...lugares].flatMap((n) => (n.isConnected ? n.getAnimations?.({ subtree: true }) ?? [] : []));

  function arrancar(reloj) {
    reloj.desde = performance.now();
    reloj.t = setTimeout(() => terminar(reloj), Math.max(0, reloj.resta));
  }
  function terminar(reloj) {
    clearTimeout(reloj.t);
    relojes.delete(reloj);
    reloj.resolver();
  }
  function esperarCrudo(ms) {
    return new Promise((resolver) => {
      const reloj = { resta: ms, desde: 0, t: null, resolver };
      relojes.add(reloj);
      if (!pausada) arrancar(reloj);
    });
  }

  // Una espera de `ms` (a velocidad x1). Saltada o sin espera, se resuelve ya.
  function esperar(ms) {
    if (saltada || !(ms > 0)) return Promise.resolve();
    return esperarCrudo(ms * escala);
  }

  const control = {
    saltar() {
      // movimiento reducido: adelanta un cuadro (la espera de ahora se resuelve; la del cuadro siguiente vale)
      if (modo === 'reducido') {
        propio?.saltar?.();
        for (const reloj of [...relojes]) terminar(reloj);
        return;
      }
      saltada = true;
      if (propio) propio.saltar?.();
      else for (const a of animaciones()) {
        try {
          a.finish();
        } catch {
          /* una animación infinita no termina: queda donde está */
        }
      }
      for (const reloj of [...relojes]) terminar(reloj);
    },
    pausar() {
      if (pausada) return;
      pausada = true;
      if (propio) propio.pausar?.();
      else for (const a of animaciones()) a.pause();
      for (const reloj of relojes) {
        if (reloj.t === null) continue;
        clearTimeout(reloj.t);
        reloj.t = null;
        reloj.resta -= performance.now() - reloj.desde;
      }
    },
    reanudar() {
      if (!pausada) return;
      pausada = false;
      if (propio) propio.reanudar?.();
      else for (const a of animaciones()) a.play();
      for (const reloj of relojes) if (reloj.t === null) arrancar(reloj);
    }
  };
  const soltar = typeof ctx?.controlar === 'function' ? ctx.controlar(control) : () => {};

  // Enter y el clic (con movimiento reducido): adelantan. Lo que llegó antes de que la narración empezara (el
  // Enter o el clic que eligió) no cuenta; sobre algo interactivo, manda su acción nativa.
  const conTeclas = adelantar && modo !== 'normal' && typeof document !== 'undefined';
  const vino = (e) => !(e.timeStamp <= desde) && !document.querySelector('dialog[open]');
  const tecla = (e) => {
    if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.key !== 'Enter' || !vino(e)) return;
    const activo = document.activeElement;
    if (activo && activo !== document.body && activo.matches?.(INTERACTIVO) && activo.checkVisibility?.() !== false) return;
    e.preventDefault();
    control.saltar();
  };
  const clic = (e) => {
    if (!vino(e) || e.target?.closest?.(INTERACTIVO)) return;
    control.saltar();
  };
  const clicables = [...lugares];
  if (conTeclas) {
    document.addEventListener('keydown', tecla);
    for (const n of clicables) n.addEventListener('click', clic);
  }

  return {
    modo,
    esperar,
    // PLANUI §0.4: era el instante del cuadro final en INST. Ya no espera: todo modo tuvo su secuencia o sus cuadros.
    vistazo() {
      return Promise.resolve();
    },
    // El jugador adelanta (lo mismo que Espacio): la capa que maneja sus propias teclas (el fichaje) lo llama.
    adelantar() {
      control.saltar();
    },
    // Un nodo más donde corren animaciones de la narración (la placa "Vos", la franja).
    incluir(nodo) {
      if (nodo) lugares.add(nodo);
    },
    get saltada() {
      return saltada;
    },
    // La narración terminó: Espacio vuelve a ser del relato.
    fin() {
      for (const reloj of [...relojes]) terminar(reloj);
      if (conTeclas) {
        document.removeEventListener('keydown', tecla);
        for (const n of clicables) n.removeEventListener('click', clic);
      }
      soltar?.();
    }
  };
}
