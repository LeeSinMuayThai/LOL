// Primitivo de gráficos: bala / bullet chart (fase V, PLAN.md §V1).
// Presentación pura: valor vs objetivo vs banda cualitativa con referente explícito.
// Cero dependencias, cero color literal en JS, cero azar nativo (regla invariable 1).

import { NS_SVG, nodoSvg, resolverTono as resolverTonoComun } from './comun.js';

const PADDING_LATERAL = 8;
const PADDING_VERTICAL = 4;
const RADIO_EXTREMO_BARRA = 4;
const GROSOR_MAX_BARRA = 24;
const ANCHO_MARCADOR_OBJETIVO = 3;

function resolverTono(tono) {
  return resolverTonoComun(tono, 'crearBala');
}

function caminoBarraHorizontal(x, y, w, h, radio = RADIO_EXTREMO_BARRA) {
  if (w <= 0) return '';
  const r = Math.min(radio, w, Math.floor(h / 2));
  // Recto contra la base izquierda, extremo derecho redondeado a r
  return `M ${x} ${y} h ${w - r} a ${r} ${r} 0 0 1 ${r} ${r} v ${h - 2 * r} a ${r} ${r} 0 0 1 -${r} ${r} H ${x} Z`;
}

export function crearBala({
  valor,
  objetivo,
  banda,
  max = 100,
  tono = 'up',
  ancho = 200,
  alto = 28
} = {}) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new Error('crearBala: valor debe ser un número finito');
  }
  if (typeof objetivo !== 'number' || !Number.isFinite(objetivo)) {
    throw new Error('crearBala: objetivo debe ser un número finito');
  }
  if (!Array.isArray(banda) || banda.length < 2) {
    throw new Error('crearBala: banda debe ser un array [min, max]');
  }

  const maxEscala = typeof max === 'number' && max > 0 ? max : 100;
  const tonoColor = resolverTono(tono);

  const svg = nodoSvg('svg', {
    xmlns: NS_SVG,
    viewBox: `0 0 ${ancho} ${alto}`,
    width: ancho,
    height: alto,
    role: 'img'
  });

  const x0 = PADDING_LATERAL;
  const anchoUtil = Math.max(10, ancho - 2 * PADDING_LATERAL);
  const altoUtil = Math.min(GROSOR_MAX_BARRA, Math.max(10, alto - 2 * PADDING_VERTICAL));
  const y0 = PADDING_VERTICAL + (alto - 2 * PADDING_VERTICAL - altoUtil) / 2;

  const escala = (v) => Math.max(0, Math.min(anchoUtil, (v / maxEscala) * anchoUtil));

  // 1. Pista completa de fondo (0 a max)
  const fondo = nodoSvg('rect', {
    x: x0,
    y: y0,
    width: anchoUtil,
    height: altoUtil,
    rx: 2,
    fill: 'var(--bg-sunken)'
  });
  svg.appendChild(fondo);

  // 2. Banda cualitativa de fondo (tono neutro / muted más claro)
  const minBanda = Math.min(banda[0], banda[1]);
  const maxBanda = Math.max(banda[0], banda[1]);
  const xBanda = x0 + escala(minBanda);
  const wBanda = Math.max(0, escala(maxBanda) - escala(minBanda));

  const bandaEl = nodoSvg('rect', {
    x: xBanda,
    y: y0,
    width: wBanda,
    height: altoUtil,
    rx: 2,
    fill: 'var(--line-faint)'
  });
  svg.appendChild(bandaEl);

  // 3. Barra delgada con el valor real en tono (redondeada a 4px en el extremo, recta en la base)
  const altoBarraValor = Math.max(4, Math.round(altoUtil * 0.5));
  const yBarraValor = y0 + (altoUtil - altoBarraValor) / 2;
  const wValor = escala(valor);

  if (wValor > 0) {
    const dBarra = caminoBarraHorizontal(x0, yBarraValor, wValor, altoBarraValor, RADIO_EXTREMO_BARRA);
    const barraEl = nodoSvg('path', {
      d: dBarra,
      fill: tonoColor
    });
    svg.appendChild(barraEl);
  }

  // 4. Marca perpendicular (tick vertical) en objetivo
  const xObj = x0 + escala(objetivo);
  const tickObj = nodoSvg('line', {
    x1: xObj,
    y1: y0 - 1,
    x2: xObj,
    y2: y0 + altoUtil + 1,
    stroke: 'var(--ink)',
    'stroke-width': ANCHO_MARCADOR_OBJETIVO,
    'stroke-linecap': 'round'
  });
  svg.appendChild(tickObj);

  // 5. Área de hit transparente >= 24px
  const hit = nodoSvg('rect', {
    x: 0,
    y: 0,
    width: ancho,
    height: alto,
    fill: 'transparent',
    tabindex: 0
  });
  svg.appendChild(hit);

  // Accesibilidad: incluye valor, objetivo y al menos un número de banda
  const ariaLabel = `Gráfico de bala: valor ${valor} de ${maxEscala}, objetivo ${objetivo}, banda ${minBanda} a ${maxBanda}`;
  svg.setAttribute('aria-label', ariaLabel);
  hit.setAttribute('aria-label', ariaLabel);

  return {
    nodo: svg,
    series: [
      { id: 'valor', label: 'Valor', color: tonoColor }
    ]
  };
}
