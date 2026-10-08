// Sparkline / escalón / área (fase V1). Presentación pura: puntos ya
// numéricos, cero core/, cero systems/. El caller traduce el state.
//
// Dos series con escalas muy distintas deben pasar dominioY explícito en
// llamadas separadas (dos <svg>). Acá un solo dominioY se comparte entre
// series; no hay normalización cross-escala.

import { NS_SVG, svg, attr, pintar, resolverTono } from './comun.js';

const GROSOR_TRAZO = 2;
const GROSOR_EJE = 1;
const RADIO_MARCADOR = 4;
const TAMANO_HIT = 24;
const RADIO_HIT = TAMANO_HIT / 2;
const RADIO_SWATCH = 3;
const OFFSET_ETIQUETA_EJE = 4;
const OPACIDAD_RELLENO = 0.1;
const JOIN_TRAZO = 'round';
const CAP_TRAZO = 'round';
const PAD_IZQ = 36;
const PAD_DER = 18;
const PAD_ARR = 14;
const PAD_ABJ = 22;
const PAD_ABJ_SIN_ETIQUETAS = 6;
const TOKEN_EJE = 'line-faint';
const TOKEN_TINTA = 'ink';
const TOKEN_TINTA_EJE = 'ink-mute';
const MODOS = new Set(['linea', 'escalon', 'area']);

function colorDeTono(tono) {
  return resolverTono(tono, 'crearLinea');
}

function aplicarTrazo(nodo, color, grosor) {
  pintar(nodo, 'fill', 'none');
  pintar(nodo, 'stroke', color);
  pintar(nodo, 'stroke-width', `${grosor}px`);
  pintar(nodo, 'stroke-linejoin', JOIN_TRAZO);
  pintar(nodo, 'stroke-linecap', CAP_TRAZO);
}

function textoSvg(contenido, x, y, tokenTinta, ancla = 'start') {
  const nodo = svg('text');
  attr(nodo, { x, y, 'text-anchor': ancla, 'dominant-baseline': 'middle' });
  pintar(nodo, 'fill', `var(--${tokenTinta})`);
  pintar(nodo, 'font-family', 'var(--font-ui)');
  pintar(nodo, 'font-size', 'var(--fs-0)');
  pintar(nodo, 'letter-spacing', 'var(--track-label)');
  nodo.textContent = contenido;
  return nodo;
}

function formatear(n) {
  if (!Number.isFinite(n)) return '';
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

function dominio(valores) {
  const nums = valores.filter(Number.isFinite);
  if (nums.length === 0) return [0, 1];
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return [min, max];
}

function proyectar(puntos, xMin, xMax, yMin, yMax, x0, y0, innerW, innerH) {
  const spanX = xMax - xMin || 1;
  const spanY = yMax - yMin || 1;
  return puntos.map((p) => ({
    dato: p,
    px: x0 + ((p.x - xMin) / spanX) * innerW,
    py: y0 + (1 - (p.y - yMin) / spanY) * innerH
  }));
}

function dLinea(pts) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.px} ${p.py}`).join(' ');
}

function dEscalon(pts) {
  if (pts.length === 0) return '';
  let d = `M${pts[0].px} ${pts[0].py}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += ` H${pts[i].px} V${pts[i].py}`;
  }
  return d;
}

function dArea(dTrazo, pts, yBase) {
  if (pts.length === 0) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${dTrazo} L${last.px} ${yBase} L${first.px} ${yBase} Z`;
}

function cablearHit(nodo, dato, onHover) {
  if (typeof onHover !== 'function') return;
  const disparar = () => onHover(dato, nodo);
  nodo.addEventListener('pointermove', disparar);
  nodo.addEventListener('focus', disparar);
  nodo.setAttribute('tabindex', '0');
}

function hitPunto(cx, cy, dato, onHover) {
  const nodo = svg('circle');
  attr(nodo, { cx, cy, r: RADIO_HIT });
  pintar(nodo, 'fill', 'var(--bg-surface)');
  pintar(nodo, 'fill-opacity', '0');
  cablearHit(nodo, dato, onHover);
  return nodo;
}

// V5 (la pestaña Carrera): tres perillas opcionales, todas con el comportamiento de siempre por defecto.
//  - `dominioX: [desde, hasta]`: el eje de abajo se fija afuera (la cinta de clubes de arriba usa el mismo).
//  - `padIzq` / `padDer`: los márgenes laterales.
//  - `etiquetas: false`: sin los números de los ejes ni el del último punto (el acompañante, que no puede gastar números); el
//    marcador del último punto queda.
export function crearLinea({
  series,
  modo = 'linea',
  ancho = 320,
  alto = 96,
  dominioY = null,
  onHoverPunto = null,
  dominioX = null,
  padIzq = PAD_IZQ,
  padDer = PAD_DER,
  etiquetas = true
} = {}) {
  if (!MODOS.has(modo)) {
    throw new Error(`crearLinea: modo desconocido "${modo}"`);
  }
  if (!Array.isArray(series)) {
    throw new Error('crearLinea: series tiene que ser un array');
  }

  const seriesNorm = series.map((s) => {
    const color = colorDeTono(s.tono);
    const puntos = (s.puntos ?? [])
      .filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))
      .slice()
      .sort((a, b) => a.x - b.x);
    return { id: s.id, label: s.label, color, puntos };
  });

  const xs = seriesNorm.flatMap((s) => s.puntos.map((p) => p.x));
  const ys = seriesNorm.flatMap((s) => s.puntos.map((p) => p.y));
  const [xMin, xMax] = Array.isArray(dominioX) && dominioX.length === 2 && Number(dominioX[1]) > Number(dominioX[0])
    ? [Number(dominioX[0]), Number(dominioX[1])]
    : dominio(xs);
  const [yMin, yMax] = Array.isArray(dominioY) && dominioY.length === 2
    ? [Number(dominioY[0]), Number(dominioY[1])]
    : dominio(ys);

  const innerW = Math.max(0, ancho - padIzq - padDer);
  const padAbj = etiquetas ? PAD_ABJ : PAD_ABJ_SIN_ETIQUETAS;
  const innerH = Math.max(0, alto - PAD_ARR - padAbj);
  const x0 = padIzq;
  const y0 = PAD_ARR;
  const yBase = y0 + innerH;

  const nodo = svg('svg');
  const nSeries = seriesNorm.length;
  const nPuntos = seriesNorm.reduce((acc, s) => acc + s.puntos.length, 0);
  attr(nodo, {
    xmlns: NS_SVG,
    width: ancho,
    height: alto,
    viewBox: `0 0 ${ancho} ${alto}`,
    role: 'img',
    'aria-label': `Línea de ${nSeries} series y ${nPuntos} puntos, modo ${modo}`
  });
  pintar(nodo, 'overflow', 'visible');

  const fraccionesGrilla = [0, 0.5, 1];
  for (const f of fraccionesGrilla) {
    const y = y0 + innerH * (1 - f);
    const linea = svg('line');
    attr(linea, { x1: x0, x2: x0 + innerW, y1: y, y2: y });
    aplicarTrazo(linea, `var(--${TOKEN_EJE})`, GROSOR_EJE);
    nodo.appendChild(linea);
  }

  if (etiquetas) {
    nodo.appendChild(textoSvg(formatear(yMax), x0 - OFFSET_ETIQUETA_EJE, y0, TOKEN_TINTA_EJE, 'end'));
    nodo.appendChild(textoSvg(formatear(yMin), x0 - OFFSET_ETIQUETA_EJE, yBase, TOKEN_TINTA_EJE, 'end'));
    nodo.appendChild(textoSvg(formatear(xMin), x0, yBase + 12, TOKEN_TINTA_EJE, 'start'));
    nodo.appendChild(textoSvg(formatear(xMax), x0 + innerW, yBase + 12, TOKEN_TINTA_EJE, 'end'));
  }

  const proyectadas = seriesNorm.map((s) => ({
    ...s,
    pts: proyectar(s.puntos, xMin, xMax, yMin, yMax, x0, y0, innerW, innerH)
  }));

  if (modo === 'area') {
    for (const s of proyectadas) {
      if (s.pts.length === 0) continue;
      const dTrazo = dLinea(s.pts);
      const area = svg('path');
      attr(area, { d: dArea(dTrazo, s.pts, yBase) });
      pintar(area, 'fill', s.color);
      pintar(area, 'fill-opacity', String(OPACIDAD_RELLENO));
      pintar(area, 'stroke', 'none');
      nodo.appendChild(area);
    }
  }

  for (const s of proyectadas) {
    if (s.pts.length === 0) continue;
    const d = modo === 'escalon' ? dEscalon(s.pts) : dLinea(s.pts);
    const path = svg('path');
    attr(path, { d });
    aplicarTrazo(path, s.color, GROSOR_TRAZO);
    nodo.appendChild(path);
  }

  for (const s of proyectadas) {
    if (s.pts.length === 0) continue;
    const extremo = s.pts[s.pts.length - 1];
    const pico = s.pts.reduce((mejor, p) => (p.dato.y > mejor.dato.y ? p : mejor), s.pts[0]);

    const marcador = svg('circle');
    attr(marcador, { cx: extremo.px, cy: extremo.py, r: RADIO_MARCADOR });
    pintar(marcador, 'fill', s.color);
    pintar(marcador, 'stroke', 'none');
    nodo.appendChild(marcador);

    if (!etiquetas) continue;
    const etiquetaDe = pico.dato.y >= extremo.dato.y ? pico : extremo;
    const aLaIzquierda = etiquetaDe.px > x0 + innerW * 0.7;
    const swatchX = aLaIzquierda ? etiquetaDe.px - 14 : etiquetaDe.px + 10;
    const textX = aLaIzquierda ? swatchX - 8 : swatchX + 8;
    const textY = etiquetaDe.py - 10;
    const swatch = svg('circle');
    attr(swatch, { cx: swatchX, cy: textY, r: RADIO_SWATCH });
    pintar(swatch, 'fill', s.color);
    pintar(swatch, 'stroke', 'none');
    nodo.appendChild(swatch);
    nodo.appendChild(textoSvg(
      formatear(etiquetaDe.dato.y),
      textX,
      textY,
      TOKEN_TINTA,
      aLaIzquierda ? 'end' : 'start'
    ));
  }

  for (const s of proyectadas) {
    for (const p of s.pts) {
      nodo.appendChild(hitPunto(p.px, p.py, p.dato, onHoverPunto));
    }
  }

  return {
    nodo,
    series: seriesNorm.map((s) => ({ id: s.id, label: s.label, color: s.color }))
  };
}
