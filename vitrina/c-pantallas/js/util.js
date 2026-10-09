// Utilidades de C · PANTALLAS: armar DOM, movimiento (WAAPI, congelable), números que ruedan, formato.
// Regla de movimiento: el estilo "natural" de cada elemento es SU ESTADO FINAL. Las animaciones solo describen el camino
// (fill 'backwards'): con movimiento reducido o INST no se crean y queda el final; congelar(ms) las posiciona; al
// terminar salen de document.getAnimations() y no ensucian la tira siguiente.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, ...hijos) {
  const n = document.createElement(tag);
  aplicar(n, attrs);
  for (const h of hijos.flat(Infinity)) if (h != null && h !== false) n.append(h instanceof Node ? h : String(h));
  return n;
}

export function svg(tag, attrs = {}, ...hijos) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) n.setAttribute(k, String(v));
  for (const h of hijos.flat(Infinity)) if (h != null && h !== false) n.append(h instanceof Node ? h : String(h));
  return n;
}

function aplicar(n, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) n.style.setProperty(p, x);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, String(v));
  }
}

// ---------- tokens ----------
export function tok(nombre, nodo = document.documentElement) {
  return getComputedStyle(nodo).getPropertyValue(nombre).trim();
}
export const ms = (nombre, nodo) => parseFloat(tok(nombre, nodo)) || 0;

// ---------- movimiento ----------
export function quieto() {
  const h = document.documentElement;
  return h.hasAttribute('data-reducido') || h.hasAttribute('data-inst') || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Anima si hay movimiento. fill por defecto 'backwards': antes del delay muestra el primer cuadro, después el natural.
export function anim(nodo, cuadros, opciones = {}) {
  if (!nodo || quieto()) return null;
  return nodo.animate(cuadros, { fill: 'backwards', easing: 'linear', ...opciones });
}

// Animación en bucle (ambiente, "escribiendo…"). Con movimiento quieto no corre.
export function bucle(nodo, cuadros, opciones = {}) {
  if (!nodo || quieto()) return null;
  return nodo.animate(cuadros, { iterations: Infinity, ...opciones });
}

export function cancelarEn(raiz) {
  for (const a of raiz.getAnimations({ subtree: true })) a.cancel();
}

// ---------- números ----------
const fmtEntero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
export const entero = (v) => fmtEntero.format(Math.round(v));
export const conSigno = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmtEntero.format(Math.abs(Math.round(v)));

// Odómetro: cada dígito es una tira 0-9 que se traslada. Congelable (WAAPI sobre transform).
export function odometro(valor, { clase = 'odo', digitos } = {}) {
  const raiz = el('span', { class: clase, 'aria-label': String(Math.round(valor)) });
  raiz.dataset.valor = String(Math.round(valor));
  pintarOdo(raiz, Math.round(valor), digitos);
  return raiz;
}

// posiciones de la tira: 0 = en blanco (un cero a la izquierda), 1..10 = los dígitos 0..9
const posiciones = (v, ancho) => String(Math.abs(v)).padStart(ancho, ' ').split('').map((c) => (c === ' ' ? 0 : Number(c) + 1));
function pintarOdo(raiz, v, digitos) {
  raiz.replaceChildren(
    ...(v < 0 ? [el('span', { class: 'odo-signo', 'aria-hidden': 'true' }, '−')] : []),
    ...posiciones(v, digitos ?? 1).map((d) => {
      const tira = el('span', { class: 'odo-tira', 'aria-hidden': 'true' }, el('span', {}, ' '), ...'0123456789'.split('').map((x) => el('span', {}, x)));
      tira.style.setProperty('--d', String(d));
      return el('span', { class: 'odo-dig' }, tira);
    }),
  );
}

// Rueda de `de` a `a`: deja el estado final y anima cada dígito desde el viejo (y una vuelta extra si cambia mucho).
export function rodar(raiz, de, a, { delay = 0, duracion = 700, easing = 'cubic-bezier(0.2, 0.8, 0.2, 1)' } = {}) {
  const ancho = Math.max(String(Math.abs(Math.round(de))).length, String(Math.abs(Math.round(a))).length);
  pintarOdo(raiz, Math.round(a), ancho);
  raiz.dataset.valor = String(Math.round(a));
  raiz.setAttribute('aria-label', String(Math.round(a)));
  const viejo = posiciones(Math.round(de), ancho);
  raiz.querySelectorAll('.odo-tira').forEach((tira, i) => {
    const desde = viejo[i] ?? 0;
    const hasta = Number(tira.style.getPropertyValue('--d'));
    if (desde === hasta) return;
    anim(tira, [{ transform: `translateY(${-desde}em)` }, { transform: `translateY(${-hasta}em)` }], {
      delay: delay + i * 40,
      duration: duracion,
      easing,
    });
  });
}

// Texto que se tipea letra por letra (congelable): cada letra entra con su delay.
export function tipeado(texto, { delay = 0, paso = 28, clase = 'tipeo' } = {}) {
  const raiz = el('span', { class: clase, 'aria-label': texto });
  [...texto].forEach((c, i) => {
    const s = el('span', { 'aria-hidden': 'true' }, c);
    raiz.append(s);
    anim(s, [{ opacity: 0 }, { opacity: 1 }], { delay: delay + i * paso, duration: 1 });
  });
  return raiz;
}

export function limpiarHijos(n) {
  cancelarEn(n);
  n.replaceChildren();
}

// Rango de soloQ legible
const TIERS = {
  iron: 'Hierro', bronze: 'Bronce', silver: 'Plata', gold: 'Oro', platinum: 'Platino', emerald: 'Esmeralda',
  diamond: 'Diamante', master: 'Máster', grandmaster: 'Gran Maestro', challenger: 'Challenger',
};
export const nombreTier = (t) => TIERS[t] ?? t;
export const TIER_DE_NOMBRE = Object.fromEntries(Object.entries(TIERS).map(([k, v]) => [v, k]));

// Monograma de una org para el papel de pared de la PC del equipo ("Enclave Collective" -> "EC")
export function monogramaDe(texto) {
  if (!texto) return null;
  return texto.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
