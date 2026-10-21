// B · TRANSMISION — las piezas de la familia: el marcador (la ficha), el zocalo (la opcion), la tecla, los iconos y la
// rueda de numeros. Todo lo animado es WAAPI y queda anotado en ANIMS, para que ?t=<ms> congele la linea de tiempo.

const NS = 'http://www.w3.org/2000/svg';
export const ANIMS = new Set();
export const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function el(tag, attrs = {}, hijos = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  for (const h of [].concat(hijos)) if (h != null) n.append(h);
  return n;
}
export function svg(tag, attrs = {}, hijos = []) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const h of [].concat(hijos)) if (h != null) n.append(h);
  return n;
}

// Anima con WAAPI (fill 'both': antes del retardo muestra el primer cuadro, despues se queda en el ultimo).
// Movimiento reducido: no anima; el estado final ya esta puesto en el DOM/CSS.
export function anim(nodo, cuadros, { delay = 0, dur = 300, easing = 'cubic-bezier(0.16, 1, 0.3, 1)', fill = 'both' } = {}) {
  if (!nodo || reducido()) return null;
  const a = nodo.animate(cuadros, { duration: dur, delay, easing, fill });
  ANIMS.add(a);
  return a;
}
export function congelarEn(t) {
  for (const a of ANIMS) {
    a.pause();
    a.currentTime = t;
  }
}

// ---------- iconos (SVG inline, nada de emoji) ----------
const icono = (clase, vb, hijos) => svg('svg', { class: `ico ${clase}`, viewBox: vb, 'aria-hidden': 'true', focusable: 'false' }, hijos);
export const ICONOS = {
  sube: () => icono('ico-sube', '0 0 10 10', [svg('path', { d: 'M5 1 L9.5 9 H0.5 Z' })]),
  baja: () => icono('ico-baja', '0 0 10 10', [svg('path', { d: 'M5 9 L9.5 1 H0.5 Z' })]),
  aviso: () => icono('ico-aviso', '0 0 20 18', [svg('path', { d: 'M10 0.8 L19.4 17.2 H0.6 Z' }), svg('path', { class: 'ico-hueco', d: 'M9 6 H11 L10.7 11.6 H9.3 Z M9 13.2 H11 V15.2 H9 Z' })]),
  enter: () => icono('ico-enter', '0 0 20 16', [svg('path', { d: 'M17 1 V9 H5', fill: 'none', 'stroke-width': '2.4' }), svg('path', { d: 'M1 9 L6.5 4 V14 Z' })]),
  mano: () => icono('ico-mano', '0 0 20 20', [svg('path', { d: 'M3 10 A7 7 0 0 1 15.5 5.5', fill: 'none', 'stroke-width': '2.4' }), svg('path', { d: 'M17.5 1.5 V8 H11 Z' }), svg('path', { d: 'M17 10 A7 7 0 0 1 4.5 14.5', fill: 'none', 'stroke-width': '2.4' }), svg('path', { d: 'M2.5 18.5 V12 H9 Z' })]),
  vara: () => icono('ico-vara', '0 0 20 20', [svg('circle', { cx: 10, cy: 10, r: 8, fill: 'none', 'stroke-width': '2.2' }), svg('circle', { cx: 10, cy: 10, r: 4, fill: 'none', 'stroke-width': '2.2' }), svg('circle', { cx: 10, cy: 10, r: 1.4 })]),
  ola: () => icono('ico-ola', '0 0 24 16', [svg('path', { d: 'M1 11 Q4 4 7 11 T13 11 T19 11 T25 11', fill: 'none', 'stroke-width': '2.4' }), svg('path', { d: 'M1 5 Q4 -2 7 5 T13 5 T19 5', fill: 'none', 'stroke-width': '1.6', class: 'ico-tenue' })]),
  charla: () => icono('ico-charla', '0 0 24 24', [svg('path', { d: 'M3 9 H8 L16 4 V20 L8 15 H3 Z' }), svg('path', { d: 'M19 8 Q22 12 19 16', fill: 'none', 'stroke-width': '2' })]),
  poder: () => icono('ico-poder', '0 0 24 24', [svg('path', { d: 'M14 1 L4 14 H11 L9 23 L20 9 H13 Z' })]),
};

// ---------- el emblema del rango (diamante), plano ----------
export function emblemaRango() {
  return svg('svg', { class: 'emblema', viewBox: '0 0 60 60', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('path', { class: 'em-ala', d: 'M2 30 L14 16 L20 30 L14 44 Z M58 30 L46 16 L40 30 L46 44 Z' }),
    svg('path', { class: 'em-cuerpo', d: 'M30 3 L46 30 L30 57 L14 30 Z' }),
    svg('path', { class: 'em-faceta', d: 'M30 3 L46 30 L30 30 Z M30 30 L30 57 L14 30 Z' }),
    svg('path', { class: 'em-gema', d: 'M30 20 L36 30 L30 40 L24 30 Z' }),
  ]);
}

// ---------- la ficha = el marcador de arriba, como el del espectador ----------
export const ROTULOS = { mecanica: 'Mecánica', macro: 'Macro', laneo: 'Laneo', cabeza: 'Cabeza', hype: 'Hype' };
export const STATS = { mecanica: 70, macro: 58, laneo: 66, cabeza: 61, hype: 34 };

const celda = (id, rot, valor) =>
  el('div', { class: 'celda', 'data-stat': id }, [
    el('span', { class: 'celda-rot' }, rot),
    el('span', { class: 'celda-num' }, el('span', { class: 'rueda' }, el('span', {}, String(valor)))),
    el('span', { class: 'bandera', 'aria-hidden': 'true' }),
  ]);

export function crearFicha() {
  return el('header', { class: 'ficha', 'aria-label': 'Ficha' }, [
    el('div', { class: 'ficha-ala izq' }, ['mecanica', 'macro', 'laneo'].map((k) => celda(k, ROTULOS[k], STATS[k]))),
    el('div', { class: 'ficha-centro' }, [
      emblemaRango(),
      el('span', { class: 'rango' }, 'DIAMANTE II'),
      el('span', { class: 'lp' }, [el('span', { class: 'sep' }, '·'), ' 64 LP']),
    ]),
    el('div', { class: 'ficha-ala der' }, [celda('cabeza', ROTULOS.cabeza, STATS.cabeza), celda('hype', ROTULOS.hype, STATS.hype), celda('edad', 'Edad', 17)]),
    el('div', { class: 'ficha-reloj' }, 'Temporada 2026'),
  ]);
}

// La consecuencia va a la ficha: el numero rueda (una columna de valores que sube) y la bandera cuelga con el delta.
export function rodar(ficha, id, hasta, { delay = 150, dur = 600 } = {}) {
  const c = ficha.querySelector(`.celda[data-stat="${id}"]`);
  const desde = STATS[id];
  const paso = hasta > desde ? 1 : -1;
  const vals = [];
  for (let v = desde; v !== hasta + paso; v += paso) vals.push(v);
  const col = el('span', { class: 'rueda' }, vals.map((v) => el('span', {}, String(v))));
  const fin = `translateY(${-(vals.length - 1)}em)`;
  col.style.transform = fin;
  c.querySelector('.celda-num').replaceChildren(col);
  const d = hasta - desde;
  c.dataset.delta = d > 0 ? 'sube' : 'baja';
  const b = c.querySelector('.bandera');
  b.replaceChildren(d > 0 ? ICONOS.sube() : ICONOS.baja(), String(Math.abs(d)));
  anim(col, [{ transform: 'translateY(0)' }, { transform: fin }], { delay, dur, easing: 'cubic-bezier(0.2, 0.7, 0.15, 1)' });
  anim(b, [{ transform: 'translateY(-100%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay, dur: 260 });
  anim(c.querySelector('.celda-num'), [{ transform: 'scale(1)' }, { transform: 'scale(1.15)', offset: 0.3 }, { transform: 'scale(1)' }], { delay, dur: dur + 200, easing: 'ease-out' });
}

// ---------- el zocalo: la opcion es un lower third ----------
export function tecla(n, clase = '') {
  return el('span', { class: `tecla ${clase}`.trim(), 'aria-hidden': 'true' }, String(n));
}
export function efecto(tipo, texto) {
  return el('span', { class: `ef ef-${tipo}` }, [ICONOS[tipo](), texto]);
}
export function crearZocalo({ n, titulo, efectos = [], linea, tag = 'button' }) {
  return el(tag, { class: 'zocalo', 'data-n': n, 'data-estado': 'reposo', ...(tag === 'button' ? { type: 'button' } : {}) }, [
    tecla(n),
    el('span', { class: 'zoc-cuerpo' }, [
      el('span', { class: 'zoc-fila' }, [el('span', { class: 'zoc-titulo' }, titulo), el('span', { class: 'zoc-efectos' }, efectos)]),
      linea ? el('span', { class: 'zoc-linea' }, linea) : null,
    ]),
  ]);
}
export function seguir() {
  return el('span', { class: 'seguir' }, ['SEGUIR', ICONOS.enter()]);
}
