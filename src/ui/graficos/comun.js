// Lo que comparten los 6 primitivos de gráficos SVG (fase V, V1 — saneamiento
// posterior). Hasta acá cada módulo de `graficos/` repetía su propio
// `svg`/`attr`/`pintar`/`reducirMovimiento` (6 copias de esta última, 3 sin
// una sola llamada real) y, peor, dos contratos de color incompatibles a la
// vez para el mismo problema: una whitelist estricta contra `tokens.css` en
// hexa/linea que tira si el tono no existe, y una regex laxa
// (`/^[a-z0-9_-]+$/`) en bala/barras/escalera que dejaba pasar un token
// inexistente y pintaba transparente en vez de avisar. Acá vive un solo
// criterio — la whitelist — igual que `components/minijuegos/comun.js` es lo
// compartido de los 11 minijuegos.

export const NS_SVG = 'http://www.w3.org/2000/svg';

// Espejo manual de las familias de tokens.css. `validate.js` (check "Gráficos:
// la whitelist de tonos no diverge de tokens.css") compara este set contra
// los `--*` reales para que una familia nueva (V5, V6) no lo deje desactualizado
// en silencio.
export const TONOS_CONOCIDOS = new Set([
  'up', 'down', 'warn', 'danger', 'ice', 'live', 'gold',
  'ink', 'ink-dim', 'ink-mute',
  'bg-surface', 'bg-raised', 'bg-sunken',
  'line', 'line-faint', 'line-strong',
  'rank-iron', 'rank-bronze', 'rank-silver', 'rank-gold',
  'rank-platinum', 'rank-emerald', 'rank-diamond',
  'rank-master', 'rank-grandmaster', 'rank-challenger',
  'nivel-prospecto', 'nivel-titular', 'nivel-elite', 'nivel-clase_mundial',
  'cat-rutina', 'cat-golpe', 'cat-oportunidad', 'cat-mercado', 'cat-parche',
  'cat-vestuario', 'cat-prensa', 'cat-familia', 'cat-salud', 'cat-partido'
]);

export function reducirMovimiento() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function svg(tag) {
  return document.createElementNS(NS_SVG, tag);
}

export function attr(nodo, mapa) {
  for (const [k, v] of Object.entries(mapa)) {
    if (v == null) continue;
    nodo.setAttribute(k, String(v));
  }
}

// Atajo para los factories que crean y atribuyen en un solo llamado
// (bala/barras/escalera) en vez de encadenar `svg()` + `attr()` a mano.
// Nombrado sin el prefijo `crear` a propósito: el check de `validate.js`
// que recorre `graficos/*.js` trata cualquier export `crear*` como factory
// de gráfico y espera que devuelva `{ nodo, series }`.
export function nodoSvg(tag, atributos = {}) {
  const nodo = svg(tag);
  attr(nodo, atributos);
  return nodo;
}

export function pintar(nodo, prop, valor) {
  nodo.style.setProperty(prop, valor);
}

export function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// Único criterio de validación de tono para los 6 gráficos: whitelist
// estricta, nunca regex. Un tono inexistente es un error de desarrollo (no
// debería llegar a producción), no una marca que se pinta transparente.
export function resolverTono(tono, nombreFn) {
  const nombre = String(tono ?? '').replace(/^--/, '');
  if (!TONOS_CONOCIDOS.has(nombre)) {
    throw new Error(`${nombreFn}: tono desconocido "${tono}" — no hay token --${nombre}`);
  }
  return `var(--${nombre})`;
}
