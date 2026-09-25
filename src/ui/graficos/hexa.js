// Radar de 6 ejes con frame anterior fantasma (fase V1). Presentación
// pura: valores ya normalizados 0-1, cero core/, cero systems/.

import { NS_SVG, svg, attr, pintar, clamp01, resolverTono } from './comun.js';

const N_EJES = 6;
const GROSOR_TRAZO_ACTUAL = 2;
const GROSOR_TRAZO_FANTASMA = 1;
const GROSOR_EJE = 1;
const GROSOR_ANILLO = 2;
const RADIO_MARCADOR = 4;
const TAMANO_HIT = 24;
const RADIO_HIT = TAMANO_HIT / 2;
const OPACIDAD_RELLENO = 0.1;
const JOIN_TRAZO = 'round';
const CAP_TRAZO = 'round';
const MARGEN_ETIQUETA = 28;
const OFFSET_ETIQUETA = 14;
const NIVELES_GRILLA = [0.5, 1];
const TOKEN_EJE = 'line-faint';
const TOKEN_TINTA = 'ink';
const TOKEN_FANTASMA = 'ink-mute';
const TOKEN_SUPERFICIE = 'bg-surface';

function colorDeTono(tono) {
  return resolverTono(tono, 'crearHexa');
}

function aplicarTrazo(nodo, color, grosor) {
  pintar(nodo, 'fill', 'none');
  pintar(nodo, 'stroke', color);
  pintar(nodo, 'stroke-width', `${grosor}px`);
  pintar(nodo, 'stroke-linejoin', JOIN_TRAZO);
  pintar(nodo, 'stroke-linecap', CAP_TRAZO);
}

function anguloDe(i) {
  return -Math.PI / 2 + i * (Math.PI / 3);
}

function vertice(cx, cy, radio, i, valor) {
  const ang = anguloDe(i);
  const r = radio * valor;
  return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, ang };
}

function puntosAttr(puntos) {
  return puntos.map((p) => `${p.x},${p.y}`).join(' ');
}

function textoSvg(contenido, x, y, ancla, baseline) {
  const nodo = svg('text');
  attr(nodo, { x, y, 'text-anchor': ancla, 'dominant-baseline': baseline });
  pintar(nodo, 'fill', `var(--${TOKEN_TINTA})`);
  pintar(nodo, 'font-family', 'var(--font-ui)');
  pintar(nodo, 'font-size', 'var(--fs-0)');
  pintar(nodo, 'letter-spacing', 'var(--track-label)');
  nodo.textContent = contenido;
  return nodo;
}

function anclaDe(ang) {
  const c = Math.cos(ang);
  if (c > 0.35) return 'start';
  if (c < -0.35) return 'end';
  return 'middle';
}

function baselineDe(ang) {
  const s = Math.sin(ang);
  if (s > 0.35) return 'hanging';
  if (s < -0.35) return 'alphabetic';
  return 'middle';
}

function exigirSeis(arr, que) {
  if (!Array.isArray(arr) || arr.length !== N_EJES) {
    throw new Error(`crearHexa: ${que} tiene que tener ${N_EJES} ejes, llegaron ${arr?.length ?? 0}`);
  }
}

export function crearHexa({
  ejes,
  fantasma = null,
  tono = 'nivel-titular',
  tamano = 200,
  onHoverPunto = null
} = {}) {
  exigirSeis(ejes, 'ejes');
  if (fantasma != null) exigirSeis(fantasma, 'fantasma');

  const colorActual = colorDeTono(tono);
  const colorAnterior = `var(--${TOKEN_FANTASMA})`;
  const cx = tamano / 2;
  const cy = tamano / 2;
  const radio = Math.max(0, tamano / 2 - MARGEN_ETIQUETA);

  const nodo = svg('svg');
  attr(nodo, {
    xmlns: NS_SVG,
    width: tamano,
    height: tamano,
    viewBox: `0 0 ${tamano} ${tamano}`,
    role: 'img',
    'aria-label': fantasma
      ? `Radar de ${N_EJES} ejes con frame anterior`
      : `Radar de ${N_EJES} ejes`
  });
  pintar(nodo, 'overflow', 'visible');

  for (const nivel of NIVELES_GRILLA) {
    const ring = Array.from({ length: N_EJES }, (_, i) => vertice(cx, cy, radio, i, nivel));
    const poly = svg('polygon');
    attr(poly, { points: puntosAttr(ring) });
    aplicarTrazo(poly, `var(--${TOKEN_EJE})`, GROSOR_EJE);
    nodo.appendChild(poly);
  }

  for (let i = 0; i < N_EJES; i += 1) {
    const punta = vertice(cx, cy, radio, i, 1);
    const rayo = svg('line');
    attr(rayo, { x1: cx, y1: cy, x2: punta.x, y2: punta.y });
    aplicarTrazo(rayo, `var(--${TOKEN_EJE})`, GROSOR_EJE);
    nodo.appendChild(rayo);
  }

  if (fantasma) {
    const ptsFantasma = fantasma.map((e, i) => vertice(cx, cy, radio, i, clamp01(e.valor)));
    const polyFantasma = svg('polygon');
    attr(polyFantasma, { points: puntosAttr(ptsFantasma) });
    aplicarTrazo(polyFantasma, colorAnterior, GROSOR_TRAZO_FANTASMA);
    nodo.appendChild(polyFantasma);
  }

  const ptsActual = ejes.map((e, i) => vertice(cx, cy, radio, i, clamp01(e.valor)));
  const polyActual = svg('polygon');
  attr(polyActual, { points: puntosAttr(ptsActual) });
  pintar(polyActual, 'fill', colorActual);
  pintar(polyActual, 'fill-opacity', String(OPACIDAD_RELLENO));
  pintar(polyActual, 'stroke', colorActual);
  pintar(polyActual, 'stroke-width', `${GROSOR_TRAZO_ACTUAL}px`);
  pintar(polyActual, 'stroke-linejoin', JOIN_TRAZO);
  pintar(polyActual, 'stroke-linecap', CAP_TRAZO);
  nodo.appendChild(polyActual);

  for (let i = 0; i < N_EJES; i += 1) {
    const p = ptsActual[i];
    if (fantasma) {
      const anillo = svg('circle');
      attr(anillo, { cx: p.x, cy: p.y, r: RADIO_MARCADOR + GROSOR_ANILLO });
      pintar(anillo, 'fill', `var(--${TOKEN_SUPERFICIE})`);
      pintar(anillo, 'stroke', 'none');
      nodo.appendChild(anillo);
    }
    const marca = svg('circle');
    attr(marca, { cx: p.x, cy: p.y, r: RADIO_MARCADOR });
    pintar(marca, 'fill', colorActual);
    pintar(marca, 'stroke', 'none');
    nodo.appendChild(marca);
  }

  for (let i = 0; i < N_EJES; i += 1) {
    const punta = vertice(cx, cy, radio, i, 1);
    const lx = cx + Math.cos(punta.ang) * (radio + OFFSET_ETIQUETA);
    const ly = cy + Math.sin(punta.ang) * (radio + OFFSET_ETIQUETA);
    nodo.appendChild(textoSvg(String(ejes[i].label ?? ''), lx, ly, anclaDe(punta.ang), baselineDe(punta.ang)));
  }

  for (let i = 0; i < N_EJES; i += 1) {
    const p = ptsActual[i];
    const hit = svg('circle');
    attr(hit, { cx: p.x, cy: p.y, r: RADIO_HIT });
    pintar(hit, 'fill', `var(--${TOKEN_SUPERFICIE})`);
    pintar(hit, 'fill-opacity', '0');
    if (typeof onHoverPunto === 'function') {
      const dato = ejes[i];
      const disparar = () => onHoverPunto(dato, hit);
      hit.addEventListener('pointermove', disparar);
      hit.addEventListener('focus', disparar);
      hit.setAttribute('tabindex', '0');
    }
    nodo.appendChild(hit);
  }

  const series = [{ id: 'actual', label: 'Actual', color: colorActual }];
  if (fantasma) {
    series.push({ id: 'anterior', label: 'Anterior', color: colorAnterior });
  }
  return { nodo, series };
}
