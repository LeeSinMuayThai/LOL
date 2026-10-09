// Utilidades de A · LUZ: DOM, modos de movimiento, animacion (WAAPI, para que congelar() congele), odometro, duotono.
// Nada de colores literales: los colores se leen de los tokens con getComputedStyle.

export const raizHtml = document.documentElement;
export const reducido = () =>
  raizHtml.hasAttribute('data-reducido') || matchMedia('(prefers-reduced-motion: reduce)').matches;
export const inst = () => raizHtml.hasAttribute('data-inst');
export const celular = () => matchMedia('(max-width: 640px)').matches;

// Curvas: expo-out para entrar, expo-in corta para salir, resorte (linear()) para numeros y la carta.
export const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const SALE = 'cubic-bezier(0.7, 0, 0.84, 0)';
export const RESORTE =
  'linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1)';
export const DUR = { entra: 280, sale: 160, larga: 420 };

// Anima con WAAPI. fill 'backwards' por defecto: al terminar la animacion desaparece de document.getAnimations()
// y el elemento queda en su estado de CSS (asi congelar() de una tira no rebobina entradas ya terminadas).
// Movimiento reducido o INST: no anima nada (el estado final ya es el de CSS).
export function animar(nodo, cuadros, { dur = DUR.entra, delay = 0, easing = EXPO, fill = 'backwards', forzar = false } = {}) {
  if (!nodo || inst() || (reducido() && !forzar)) return null;
  return nodo.animate(cuadros, { duration: dur, delay, easing, fill });
}
export const entrar = (nodo, delay = 0, desde = 14, dur = DUR.entra) =>
  animar(nodo, [{ opacity: 0, transform: `translateY(${desde}px)` }, { opacity: 1, transform: 'none' }], { delay, dur });
export const salir = (nodo, delay = 0) =>
  animar(nodo, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], { delay, dur: DUR.sale, easing: SALE, fill: 'forwards' });

// Reloj de secuencias que respeta congelar(): una animacion vacia de WAAPI cuyo `finished` dispara lo que sigue.
export function esperar(nodo, ms) {
  if (!nodo || inst() || reducido() || ms <= 0) return Promise.resolve();
  const a = nodo.animate([{ opacity: 1 }, { opacity: 1 }], { duration: ms });
  return a.finished.then(() => undefined, () => undefined);
}

// Lo que se va al elegir se pliega YA (el layout queda en su lugar final: congelar(t) fotografia el instante correcto,
// sin depender de un `finished` que en una tira congelada nunca llega) y un fantasma de eso mismo se apaga encima.
// `contenedor` tiene que estar posicionado. `oculta`: el nodo que no va en el fantasma (la fila que crece).
export function plegar(contenedor, { fantasma = [], plegar: plegables = [], oculta = null } = {}) {
  const r0 = contenedor.getBoundingClientRect();
  const capa = el('div', { class: 'fantasma', 'aria-hidden': 'true', style: { position: 'absolute', left: '0', top: '0', width: '100%', height: '0', margin: '0' } });
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
  for (const n of plegables) n?.classList.add('plegado');
  contenedor.append(capa);
  const a = animar(capa, [{ opacity: 1 }, { opacity: 0, filter: 'blur(2px)' }], { dur: DUR.sale, fill: 'forwards', easing: 'linear' });
  if (a) a.finished.then(() => capa.remove(), () => {});
  else capa.remove();
}

// ---------- DOM ----------
export function el(tag, attrs = {}, hijos = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) p.startsWith('--') ? n.style.setProperty(p, x) : (n.style[p] = x);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const h of [].concat(hijos)) if (h != null && h !== false) n.append(h);
  return n;
}
const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, hijos = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const h of [].concat(hijos)) if (h) n.append(h);
  return n;
}
export const sr = (texto) => el('span', { class: 'sr', text: texto });

// ---------- texto ----------
// La primera oracion de un texto del motor (solo para mostrar: el texto completo queda siempre en el DOM).
export function primeraOracion(texto = '') {
  const m = /^(.+?[.!?])(\s+)(.+)$/s.exec(texto.trim());
  return m ? [m[1], m[3]] : [texto.trim(), ''];
}
const fmt = new Intl.NumberFormat('es-AR');
export const num = (n) => fmt.format(Math.round(n));
export const conSigno = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt.format(Math.abs(Math.round(n)));

// Parte un titulo en lineas reales (segun el ancho) y envuelve cada una en una mascara para entrar por linea.
export function lineasConMascara(nodo) {
  const texto = nodo.textContent;
  nodo.textContent = '';
  const palabras = texto.split(/\s+/).filter(Boolean).map((p) => el('span', { class: 'palabra', text: p + ' ' }));
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
  const internas = lineas.map((l) => el('span', { class: 'linea-int', text: l.join('').trim() }));
  nodo.append(...internas.map((i) => el('span', { class: 'linea' }, i)));
  nodo.setAttribute('aria-label', texto);
  return internas;
}

// ---------- odometro: cada digito rueda en su columna ----------
// `nodo` queda con el numero final escrito (aria-label) y una columna por digito.
export function odometro(nodo, desde, hasta, { delay = 0, dur = 900 } = {}) {
  const a = num(desde);
  const b = num(hasta);
  nodo.textContent = '';
  nodo.classList.add('odometro');
  nodo.setAttribute('aria-label', b);
  const largo = Math.max(a.length, b.length);
  const pa = a.padStart(largo, ' ');
  const pb = b.padStart(largo, ' ');
  for (let i = 0; i < largo; i++) {
    const ca = pa[i];
    const cb = pb[i];
    if (!/\d/.test(cb)) {
      nodo.append(el('span', { class: 'odo-fijo', 'aria-hidden': 'true', text: cb === ' ' ? '' : cb }));
      continue;
    }
    const col = el('span', { class: 'odo-col', 'aria-hidden': 'true' });
    const tira = el('span', { class: 'odo-tira' });
    for (let d = 0; d <= 9; d++) tira.append(el('span', { text: String(d) }));
    col.append(tira);
    nodo.append(col);
    const fin = Number(cb);
    tira.style.transform = `translateY(${-fin * 10}%)`;
    if (ca === cb) continue;
    // un digito que aparece (99 -> 100) entra desde el vacio, no desde un cero
    const desdeY = /\d/.test(ca) ? -Number(ca) * 10 : hasta >= desde ? 10 : -100;
    animar(tira, [{ transform: `translateY(${desdeY}%)` }, { transform: `translateY(${-fin * 10}%)` }], {
      delay: delay + (largo - i) * 40,
      dur,
      easing: RESORTE,
    });
  }
  return nodo;
}

// ---------- color de tokens ----------
export function leerColor(token, nodo = raizHtml) {
  const v = getComputedStyle(nodo).getPropertyValue(token).trim();
  const h = v.replace('#', '');
  if (!/^[0-9a-f]{6}/i.test(h)) return [0, 0, 0];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

// ---------- duotono en canvas 2D (para la carta, los retratos y el respaldo sin WebGL) ----------
// sombra/luz: [r,g,b] 0..1. Recorta "cover" al tamano pedido. Devuelve el canvas.
export function duotono(img, sombra, luz, ancho, alto, { foco = [0.5, 0.35], brillo = 1, canvas } = {}) {
  const c = canvas ?? document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!img) return c;
  const esc = Math.max(ancho / img.naturalWidth, alto / img.naturalHeight);
  const w = img.naturalWidth * esc;
  const h = img.naturalHeight * esc;
  ctx.drawImage(img, (ancho - w) * foco[0], (alto - h) * foco[1], w, h);
  let datos;
  try {
    datos = ctx.getImageData(0, 0, ancho, alto);
  } catch {
    return c; // lienzo contaminado (sin CORS): queda la imagen sin duotono
  }
  const p = datos.data;
  for (let i = 0; i < p.length; i += 4) {
    let l = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) / 255;
    l = Math.min(1, Math.max(0, (l - 0.05) / 0.85));
    l = l * l * (3 - 2 * l) * brillo;
    const hi = Math.pow(Math.min(1, l), 5) * 0.55;
    p[i] = Math.min(255, (sombra[0] + (luz[0] - sombra[0]) * l + hi) * 255);
    p[i + 1] = Math.min(255, (sombra[1] + (luz[1] - sombra[1]) * l + hi) * 255);
    p[i + 2] = Math.min(255, (sombra[2] + (luz[2] - sombra[2]) * l + hi) * 255);
  }
  ctx.putImageData(datos, 0, 0);
  return c;
}
