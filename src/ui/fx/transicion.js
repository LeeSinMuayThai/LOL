// El envoltorio de View Transitions (PLANUI §6.3, §9.4). Es de U1 (cimientos), pegado a `revelar` (`ui/escena.js`); el
// resto de `fx/` es del kit. Importarlo no toca el DOM (corre en Node).
//
// Por qué un envoltorio: `revelar` es síncrono y `app.js` depende de eso; `startViewTransition` difiere el cambio un
// cuadro, su overlay se traga los clics, una segunda llamada rechaza `ready` con AbortError (ensucia la consola) y un
// nombre de transición duplicado la aborta. Entonces:
//   - sin `animar` (INST, la misma pieza, al retomar: lo decide `revelar`) o sin soporte, el cambio corre YA, síncrono,
//     como siempre;
//   - con movimiento reducido (PLANUI §0.3: nunca un corte seco) la transición es un fundido de opacidad corto
//     (`html[data-transicion="fundido"]`, estilos/shell.css: nada se mueve ni cambia de tamaño, <= 150 ms);
//   - las llamadas seguidas mientras una transición espera su cuadro se juntan en esa misma transición, en orden; una
//     llamada síncrona en ese medio corre antes lo que esperaba (el orden no se invierte) y saltea la transición;
//   - atrapa las tres promesas (`ready`, `updateCallbackDone`, `finished`): un aborto no ensucia la consola, un error de
//     verdad en el cambio sí se reporta;
//   - pone `html[data-transicion]` mientras dura (`="fundido"` con movimiento reducido): los nombres de transición viven
//     solo ahí (estilos/shell.css: únicos, el ambiente con nombre propio y `animation: none`, el overlay sin clics, el
//     fundido del movimiento reducido aparte);
//   - `alTerminar` (enfocar el encabezado) corre en `updateCallbackDone`, cuando la pieza nueva ya está en el DOM.

import { reducido } from './util.js';

let pendiente = null; // { pasos: [{ actualizar, alTerminar }], transicion } — esperando su cuadro
let actual = null; // la transición que está corriendo (para no borrar el atributo de otra)

const esAborto = (error) => error?.name === 'AbortError';

function puedeAnimar() {
  const doc = globalThis.document;
  return Boolean(doc) && typeof doc.startViewTransition === 'function';
}
// Cómo se ve la transición: la de siempre, o el fundido corto del movimiento reducido.
const modoDeTransicion = () => (reducido() ? 'fundido' : '');

// Corre los cambios en orden aunque uno falle (el primero que falla se relanza al final: nadie queda a medio pintar).
function correrPasos(pasos) {
  let fallo = null;
  for (const paso of pasos) {
    try {
      paso.actualizar();
    } catch (error) {
      fallo ??= error;
    }
  }
  if (fallo) throw fallo;
}

function terminarPasos(pasos) {
  for (const paso of pasos) {
    try {
      paso.alTerminar?.();
    } catch (error) {
      console.error('transicion: no se pudo terminar el cambio', error);
    }
  }
}

// Lo que esperaba su cuadro corre ya (y la transición, si llega a correr, no tiene nada que mostrar: se saltea).
function vaciarPendiente() {
  if (!pendiente) return;
  const cola = pendiente;
  pendiente = null;
  const pasos = cola.pasos.splice(0);
  try {
    cola.transicion?.skipTransition();
  } catch {
    // ya terminó: nada que saltear
  }
  correrPasos(pasos);
  terminarPasos(pasos);
}

// `actualizar`: el cambio del DOM (síncrono). `animar`: si este cambio va con transición (lo decide quien llama).
// `alTerminar`: lo que va cuando el cambio ya está (el foco). Devuelve la transición, o `null` si fue síncrono.
export function transicionar(actualizar, { animar = false, alTerminar = null } = {}) {
  const paso = { actualizar, alTerminar };
  if (!animar || !puedeAnimar()) {
    vaciarPendiente();
    correrPasos([paso]);
    terminarPasos([paso]);
    return null;
  }
  if (pendiente) {
    pendiente.pasos.push(paso);
    return pendiente.transicion;
  }

  const cola = { pasos: [paso], transicion: null };
  pendiente = cola;
  const raiz = document.documentElement;
  raiz.dataset.transicion = modoDeTransicion();
  let hechos = [];
  let transicion;
  try {
    transicion = document.startViewTransition(() => {
      if (pendiente === cola) pendiente = null;
      hechos = cola.pasos.splice(0);
      correrPasos(hechos);
    });
  } catch (error) {
    console.warn('transicion: sin View Transition, el cambio va directo', error);
    if (pendiente === cola) pendiente = null;
    if (!actual) delete raiz.dataset.transicion;
    const pasos = cola.pasos.splice(0);
    correrPasos(pasos);
    terminarPasos(pasos);
    return null;
  }
  cola.transicion = transicion;
  actual = transicion;

  transicion.updateCallbackDone.then(
    () => terminarPasos(hechos),
    (error) => {
      if (!esAborto(error)) console.error('transicion: el cambio falló', error);
      terminarPasos(hechos);
    }
  );
  transicion.ready.catch((error) => {
    if (!esAborto(error)) console.warn('transicion: la animación no arrancó', error);
  });
  const limpiar = () => {
    if (actual === transicion) {
      actual = null;
      delete raiz.dataset.transicion;
    }
  };
  transicion.finished.then(limpiar, limpiar);
  return transicion;
}
