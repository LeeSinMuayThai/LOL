// El reconciliador (fase V, PLAN.md "V0 — El kernel"): parchea una lista en
// el lugar por clave en vez de reemplazarla entera. Hasta esta fase, toda
// lista del juego (`feed.js`, `mercado.js`, los paneles del riel) se pintaba
// con `replaceChildren`/`innerHTML = ''`: los nodos se destruyen en cada
// tick, así que no hay identidad de nodo que animar entre dos estados —
// exactamente lo que bloquea la regla de proceso 13 ("el delta se ve, no se
// lee") en V3 y el reordenamiento FLIP de la tabla/Top 20 en V1/V5.
//
// Sin DOM real: solo usa `insertBefore`/`remove`/`firstChild`/`nextSibling`
// (subset mínimo de `Node`) y, si `flip` está encendido,
// `getBoundingClientRect`/`requestAnimationFrame`/`matchMedia` — por eso el
// test de identidad de `validate.js` puede correr contra un doble mínimo de
// `Element`, sin jsdom.

const mapaPorContenedor = new WeakMap();

function reducirMovimiento() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function medirPosiciones(nodos) {
  const posiciones = new Map();
  for (const nodo of nodos) {
    posiciones.set(nodo, nodo.getBoundingClientRect());
  }
  return posiciones;
}

function animarFlip(nodos, posicionesAntes) {
  requestAnimationFrame(() => {
    for (const nodo of nodos) {
      const antes = posicionesAntes.get(nodo);
      if (!antes) continue; // nodo nuevo: no tiene posición previa que invertir
      const despues = nodo.getBoundingClientRect();
      const dx = antes.left - despues.left;
      const dy = antes.top - despues.top;
      if (dx === 0 && dy === 0) continue;
      nodo.style.transition = 'none';
      nodo.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        nodo.style.transition = '';
        nodo.style.transform = '';
      });
    }
  });
}

// reconciliar(contenedor, items, claveDe, crear, actualizar, opciones?)
// - claveDe(item) -> string, la identidad estable del item.
// - crear(item) -> nodo nuevo, se llama solo la primera vez que se ve la clave.
// - actualizar(nodo, item) -> muta el nodo existente in-place.
// - opciones.flip: true habilita la animación de reordenamiento (off por
//   defecto y siempre off con prefers-reduced-motion).
// Devuelve el array de nodos en el orden final.
export function reconciliar(contenedor, items, claveDe, crear, actualizar, { flip = false } = {}) {
  let mapa = mapaPorContenedor.get(contenedor);
  if (!mapa) {
    mapa = new Map();
    mapaPorContenedor.set(contenedor, mapa);
  }

  const debeAnimar = flip && !reducirMovimiento();
  const posicionesAntes = debeAnimar ? medirPosiciones(mapa.values()) : null;

  const clavesVistas = new Set();
  const nodosEnOrden = [];

  for (const item of items) {
    const clave = String(claveDe(item));
    if (clavesVistas.has(clave)) {
      throw new Error(`reconciliar: clave duplicada "${clave}"`);
    }
    clavesVistas.add(clave);

    let nodo = mapa.get(clave);
    if (!nodo) {
      nodo = crear(item);
      mapa.set(clave, nodo);
    } else {
      actualizar(nodo, item);
    }
    nodosEnOrden.push(nodo);
  }

  for (const [clave, nodo] of mapa) {
    if (!clavesVistas.has(clave)) {
      nodo.remove();
      mapa.delete(clave);
    }
  }

  let referencia = contenedor.firstChild;
  for (const nodo of nodosEnOrden) {
    if (nodo === referencia) {
      referencia = referencia.nextSibling;
      continue;
    }
    contenedor.insertBefore(nodo, referencia);
  }

  if (debeAnimar) {
    animarFlip(nodosEnOrden, posicionesAntes);
  }

  return nodosEnOrden;
}
