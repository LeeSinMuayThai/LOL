// EL MOVIMIENTO del kit (PLANUI §5.7, §6.4, §9.2; portado de vitrina/fusion/js/util.js): revelar, escalonar, esperar con
// el reloj de WAAPI, plegar lo que se va, el titulo que entra por linea y el odometro.
//   - todo con WAAPI, para que congelar(t) de una captura congele (las animaciones se devuelven);
//   - expo-out (DUR.entra, 380 ms desde PLANUI §0.4) y el orden luz -> rotulo -> titulo -> opciones (LINEA.md §1);
//   - el camino quieto (movimiento reducido): nada se anima, todo aparece en su estado final (el de CSS).
// El odometro (§6.4) esta montado sobre moverNumero de ui/core/delta.js: en el camino quieto, sin cambio o sin numeros,
// es moverNumero el que deja el valor final (y nada se programa); si no, rueda cada digito en su columna.
// Clases (estilos/fx.css): ln-odo*, ln-linea*, ln-palabra, ln-fantasma, ln-plegado. Importarlo no toca el DOM.
import { el, animar, quieto, reducido, EXPO, SALE, DUR, RECORRIDO } from './util.js';
import { moverNumero } from '../core/delta.js';

// ---------- revelar, salir, escalonar ----------
export const revelar = (nodo, delay = 0, desde = RECORRIDO, dur = DUR.entra) =>
  animar(nodo, [{ opacity: 0, transform: `translateY(${desde}px)` }, { opacity: 1, transform: 'none' }], { delay, dur });
// (el nombre de la vitrina, para portar las pantallas sin renombrar)
export const entrar = revelar;
export const salir = (nodo, delay = 0) =>
  animar(nodo, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], { delay, dur: DUR.sale, easing: SALE, fill: 'forwards' });
// Revela una lista en escalera: cada uno `paso` ms despues del anterior. Devuelve las animaciones (sin las nulas).
export const PASO_ESCALERA = 40;
export function escalonar(nodos, { delay = 0, paso = PASO_ESCALERA, desde = RECORRIDO, dur = DUR.entra } = {}) {
  return [...(nodos ?? [])].map((n, i) => revelar(n, delay + i * paso, desde, dur)).filter(Boolean);
}

// Reloj de secuencias que respeta congelar(): una animacion vacia de WAAPI cuyo `finished` dispara lo que sigue.
export function esperar(nodo, ms) {
  if (!nodo || reducido() || ms <= 0) return Promise.resolve();
  try {
    const a = nodo.animate([{ opacity: 1 }, { opacity: 1 }], { duration: ms });
    return a.finished.then(() => undefined, () => undefined);
  } catch {
    return Promise.resolve();
  }
}

// Lo que se va al elegir se pliega YA (el layout queda en su lugar final: congelar(t) fotografia el instante correcto,
// sin depender de un `finished` que en una tira congelada nunca llega) y un fantasma de eso mismo se apaga encima.
// `contenedor` tiene que estar posicionado. `oculta`: el nodo que no va en el fantasma (la fila que crece).
export function plegar(contenedor, { fantasma = [], plegar: plegables = [], oculta = null } = {}) {
  const r0 = contenedor.getBoundingClientRect();
  const capa = el('div', { class: 'ln-fantasma', 'aria-hidden': 'true', style: { position: 'absolute', left: '0', top: '0', width: '100%', height: '0', margin: '0' } });
  oculta?.setAttribute('data-oculta', '');
  for (const n of fantasma) {
    if (!n?.isConnected) continue;
    const r = n.getBoundingClientRect();
    const c = n.cloneNode(true);
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
    c.querySelectorAll('[data-oculta]').forEach((x) => (x.style.visibility = 'hidden'));
    Object.assign(c.style, { position: 'absolute', left: `${r.left - r0.left}px`, top: `${r.top - r0.top}px`, width: `${r.width}px`, margin: '0' });
    capa.append(c);
  }
  oculta?.removeAttribute('data-oculta');
  for (const n of plegables) n?.classList.add('ln-plegado');
  contenedor.append(capa);
  const a = animar(capa, [{ opacity: 1 }, { opacity: 0, filter: 'blur(2px)' }], { dur: DUR.sale, fill: 'forwards', easing: 'linear' });
  if (a) a.finished.then(() => capa.remove(), () => {});
  else capa.remove();
}

// Parte un titulo en lineas reales (segun el ancho) y envuelve cada una en una mascara para entrar por linea.
// Devuelve las lineas internas (para revelarlas en escalera).
export function lineasConMascara(nodo) {
  const texto = nodo.textContent;
  nodo.textContent = '';
  const palabras = texto.split(/\s+/).filter(Boolean).map((p) => el('span', { class: 'ln-palabra', text: p + ' ' }));
  nodo.append(...palabras);
  const lineas = [];
  let top = null;
  for (const p of palabras) {
    if (p.offsetTop !== top) {
      lineas.push([]);
      top = p.offsetTop;
    }
    lineas[lineas.length - 1].push(p.textContent);
  }
  nodo.textContent = '';
  const internas = lineas.map((l) => el('span', { class: 'ln-linea-int', text: l.join('').trim() }));
  nodo.append(...internas.map((i) => el('span', { class: 'ln-linea' }, i)));
  nodo.setAttribute('aria-label', texto);
  return internas;
}

// ---------- el numero que rueda (PLANUI §6.4) ----------
const fmt = new Intl.NumberFormat('es-AR');
export const num = (n) => fmt.format(Math.round(n));
// El delta en texto: "▲3", "▼1" o "=" (el mismo formato que deltaDeCierre de ui/core/escena.js).
export function textoDelta(antes, despues, sufijo = '') {
  if (!Number.isFinite(antes) || !Number.isFinite(despues)) return '';
  const d = Math.round(despues - antes);
  if (d > 0) return `▲${d}${sufijo}`;
  if (d < 0) return `▼${-d}${sufijo}`;
  return '=';
}
// El delta como nodo (<span class="ln-odo-delta" data-signo="sube|baja|igual">), para ponerlo al lado del numero.
export function deltaNodo(antes, despues, { sufijo = '' } = {}) {
  const texto = textoDelta(antes, despues, sufijo);
  const signo = texto.startsWith('▲') ? 'sube' : texto.startsWith('▼') ? 'baja' : 'igual';
  return el('span', { class: 'ln-odo-delta', 'data-signo': signo, text: texto });
}

// Odometro: cada digito rueda en su columna. `nodo` queda con el numero final escrito (aria-label) y una columna por
// digito. PLANUI §4.9: rueda con expo-out, sin rebote (el resorte se pasaba de largo: con un salto de varios digitos
// dejaba ver los vecinos) y la columna se funde en sus bordes (--ln-odo-borde): mientras rueda, el digito entra y sale
// de la ventana sin cortes duros. `delta: true` suma el delta (▲3) al final; `sufijo` va pegado al delta (' LP').
export const DUR_ODOMETRO = 900;
const PASO_DIGITO = 40;
export function odometro(nodo, desde, hasta, { delay = 0, dur = DUR_ODOMETRO, delta = false, sufijo = '' } = {}) {
  if (!nodo) return nodo;
  nodo.classList.add('ln-odo');
  const sinRodar = quieto() || !Number.isFinite(desde) || !Number.isFinite(hasta) || desde === hasta;
  if (sinRodar) {
    // el camino quieto: el valor final, sin programar nada (moverNumero con animar: false)
    moverNumero(nodo, desde, hasta, { formato: (n) => (Number.isFinite(n) ? num(n) : String(n ?? '')), animar: false });
    nodo.setAttribute('aria-label', nodo.textContent);
    if (delta) nodo.append(deltaNodo(desde, hasta, { sufijo }));
    return nodo;
  }
  const a = num(desde);
  const b = num(hasta);
  nodo.textContent = '';
  nodo.setAttribute('aria-label', b);
  const largo = Math.max(a.length, b.length);
  const pa = a.padStart(largo, ' ');
  const pb = b.padStart(largo, ' ');
  for (let i = 0; i < largo; i++) {
    const ca = pa[i];
    const cb = pb[i];
    if (!/\d/.test(cb)) {
      nodo.append(el('span', { class: 'ln-odo-fijo', 'aria-hidden': 'true', text: cb === ' ' ? '' : cb }));
      continue;
    }
    const col = el('span', { class: 'ln-odo-col', 'aria-hidden': 'true' });
    const tira = el('span', { class: 'ln-odo-tira' });
    for (let d = 0; d <= 9; d++) tira.append(el('span', { text: String(d) }));
    col.append(tira);
    nodo.append(col);
    const fin = Number(cb);
    tira.style.transform = `translateY(${-fin * 10}%)`;
    if (ca === cb) continue;
    // un digito que aparece (99 -> 100) entra desde el vacio, no desde un cero
    const desdeY = /\d/.test(ca) ? -Number(ca) * 10 : hasta >= desde ? 10 : -100;
    animar(tira, [{ transform: `translateY(${desdeY}%)` }, { transform: `translateY(${-fin * 10}%)` }], {
      delay: delay + (largo - i) * PASO_DIGITO,
      dur,
      easing: EXPO,
    });
  }
  if (delta) nodo.append(deltaNodo(desde, hasta, { sufijo }));
  return nodo;
}
