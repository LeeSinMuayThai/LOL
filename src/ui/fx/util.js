// Las utilidades del kit de efectos (PLANUI §9.2; portado de vitrina/fusion/js/util.js): los modos de movimiento, las
// curvas, la animacion con WAAPI (para que congelar() congele), el DOM, el color de los tokens y el duotono por CPU.
//
// Importar este modulo NO toca el DOM (el juego importa la UI en Node): todo acceso a `document`, `window` o
// `matchMedia` va adentro de una funcion. Nada de colores literales: los colores se leen de los tokens por nombre.
//
// Los modos (los mismos atributos que la vitrina, en <html>):
//   data-reducido  el movimiento reducido forzado (ademas de `prefers-reduced-motion`)
//   data-inst      el reproductor en INST (lo pone api.inst(si) de fx/index.js)
//   data-sin-webgl el ambiente y la copa van por su respaldo (CSS / SVG)
// Con movimiento reducido o INST todo aparece en su cuadro final: "el camino quieto".

export const raizHtml = () => (typeof document === 'undefined' ? null : document.documentElement);
const consulta = (q) => typeof matchMedia === 'function' && matchMedia(q).matches;
export const reducido = () => {
  const r = raizHtml();
  if (!r) return true;
  return r.hasAttribute('data-reducido') || consulta('(prefers-reduced-motion: reduce)');
};
export const inst = () => Boolean(raizHtml()?.hasAttribute('data-inst'));
// el camino quieto: movimiento reducido o INST
export const quieto = () => reducido() || inst();
const ANCHO_CELULAR = 640;
export const celular = () => consulta(`(max-width: ${ANCHO_CELULAR}px)`);

// Curvas: expo-out para entrar, expo-in corta para salir, resorte (linear()) para numeros y la carta.
export const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const SALE = 'cubic-bezier(0.7, 0, 0.84, 0)';
export const RESORTE =
  'linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1)';
export const DUR = { entra: 280, sale: 160, larga: 420 };

// Anima con WAAPI. fill 'backwards' por defecto: al terminar la animacion desaparece de document.getAnimations()
// y el elemento queda en su estado de CSS (asi congelar() de una tira no rebobina entradas ya terminadas).
// Movimiento reducido o INST: no anima nada (el estado final ya es el de CSS). Un fallo devuelve null (degrada a nada).
export function animar(nodo, cuadros, { dur = DUR.entra, delay = 0, easing = EXPO, fill = 'backwards', forzar = false } = {}) {
  if (!nodo || inst() || (reducido() && !forzar)) return null;
  try {
    return nodo.animate(cuadros, { duration: dur, delay, easing, fill });
  } catch {
    return null;
  }
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

// ---------- color de tokens ----------
// leerColor('--luz-pieza') -> [r, g, b] en 0..1. El valor del token se normaliza en un canvas de 1x1 (asi vale cualquier
// color de CSS que el navegador entienda); un #rrggbb(aa) se lee directo (es la misma cuenta que la vitrina, sin canvas).
// Sin DOM, o con un valor que no es un color, devuelve negro. Cachea por valor.
const NEGRO = Object.freeze([0, 0, 0]);
const cacheColor = new Map();
let lienzoColor = null;
function normalizarColor(valor) {
  if (!valor) return NEGRO;
  if (cacheColor.has(valor)) return cacheColor.get(valor);
  let rgb = NEGRO;
  const h = valor.startsWith('#') ? valor.slice(1) : '';
  if (/^[0-9a-f]{6}/i.test(h)) rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  else {
    try {
      if (typeof CSS !== 'undefined' && CSS.supports?.('color', valor)) {
        lienzoColor ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 });
        const ctx = lienzoColor.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = valor;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        rgb = [d[0] / 255, d[1] / 255, d[2] / 255];
      }
    } catch {
      rgb = NEGRO;
    }
  }
  cacheColor.set(valor, rgb);
  return rgb;
}
export function leerColor(token, nodo = raizHtml()) {
  if (!nodo || typeof getComputedStyle !== 'function') return [...NEGRO];
  const v = getComputedStyle(nodo).getPropertyValue(token).trim();
  return [...normalizarColor(v)];
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

// Envuelve un efecto: si tira, degrada a `def` (nunca frena el juego ni ensucia la consola).
export function seguro(fn, def = null) {
  try {
    return fn();
  } catch {
    return def;
  }
}
