// Cinta temporal de clubes (fase V1). Presentación pura: desde/hasta ya
// resueltos por el caller, cero core/, cero systems/.
//
// Todas las orgs van en una sola fila consecutiva en el tiempo. El
// separador de 2px color-superficie aplica entre segmentos consecutivos
// de esa fila, no como carriles apilados.

import { hueDeOrg, inicialesDeOrg } from '../formatoUi.js';
import { NS_SVG, svg, attr, pintar } from './comun.js';

const ALTO_POR_TIER = { 1: 24, 2: 16, 3: 10 };
const SEPARADOR = 2;
const RADIO_ESQUINA = 4;
const TAMANO_HIT = 24;
const GROSOR_EJE = 1;
const JOIN_TRAZO = 'round';
const CAP_TRAZO = 'round';
const PAD_IZQ = 8;
const PAD_DER = 8;
const PAD_ARR = 14;
const PAD_ABJ = 16;
const FRACCION_FADE_ACTIVA = 0.1;
const FRACCION_DOMINIO_ABIERTA = 0.2;
const SATURACION_ORG = 60;
const LUMINOSIDAD_ORG = 55;
const ANCHO_MIN_INICIALES = 28;
const TOKEN_EJE = 'line-faint';
const TOKEN_TINTA = 'ink';
const TOKEN_TINTA_EJE = 'ink-mute';
const TOKEN_SUPERFICIE = 'bg-surface';

let seqGradiente = 0;

function colorDeOrg(nombre) {
  const hue = hueDeOrg(nombre);
  return `hsl(${hue} ${SATURACION_ORG}% ${LUMINOSIDAD_ORG}%)`;
}

function altoDeTier(tier) {
  return ALTO_POR_TIER[tier] ?? ALTO_POR_TIER[2];
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

function abierta(banda) {
  return Boolean(banda.activa) && banda.hasta == null;
}

export function crearCinta({
  bandas,
  ancho = 480,
  alto = 64,
  onHoverBanda = null
} = {}) {
  if (!Array.isArray(bandas)) {
    throw new Error('crearCinta: bandas tiene que ser un array');
  }

  const innerW = Math.max(0, ancho - PAD_IZQ - PAD_DER);
  const innerH = Math.max(0, alto - PAD_ARR - PAD_ABJ);
  const x0 = PAD_IZQ;
  const x1 = x0 + innerW;

  const desdes = bandas.map((b) => Number(b.desde)).filter(Number.isFinite);
  const hastas = bandas.map((b) => Number(b.hasta)).filter(Number.isFinite);
  const xMin = desdes.length ? Math.min(...desdes) : 0;
  let xMax = hastas.length ? Math.max(...hastas) : xMin;
  xMax = Math.max(xMax, ...desdes, xMin);
  if (xMax === xMin) xMax = xMin + 1;
  // Banda activa sin cierre: el caller no inventa `hasta`. Reservamos cola
  // a la derecha para que el fade no colapse a ancho 0 cuando `desde`
  // coincide con el máximo del resto.
  if (bandas.some(abierta)) {
    xMax += (xMax - xMin) * FRACCION_DOMINIO_ABIERTA;
  }

  const xDe = (valor) => x0 + ((valor - xMin) / (xMax - xMin)) * innerW;

  const nodo = svg('svg');
  const nBandas = bandas.length;
  attr(nodo, {
    xmlns: NS_SVG,
    width: ancho,
    height: alto,
    viewBox: `0 0 ${ancho} ${alto}`,
    role: 'img',
    'aria-label': `Cinta de ${nBandas} clubes entre ${formatear(xMin)} y ${formatear(xMax)}`
  });
  pintar(nodo, 'overflow', 'visible');

  const eje = svg('line');
  attr(eje, { x1: x0, x2: x1, y1: PAD_ARR + innerH, y2: PAD_ARR + innerH });
  pintar(eje, 'fill', 'none');
  pintar(eje, 'stroke', `var(--${TOKEN_EJE})`);
  pintar(eje, 'stroke-width', `${GROSOR_EJE}px`);
  pintar(eje, 'stroke-linejoin', JOIN_TRAZO);
  pintar(eje, 'stroke-linecap', CAP_TRAZO);
  nodo.appendChild(eje);
  nodo.appendChild(textoSvg(formatear(xMin), x0, alto - 6, TOKEN_TINTA_EJE, 'start'));
  nodo.appendChild(textoSvg(formatear(xMax), x1, alto - 6, TOKEN_TINTA_EJE, 'end'));

  const defs = svg('defs');
  nodo.appendChild(defs);

  const ordenadas = bandas
    .map((banda, indice) => ({ banda, indice }))
    .slice()
    .sort((a, b) => {
      const da = Number(a.banda.desde) - Number(b.banda.desde);
      return da !== 0 ? da : a.indice - b.indice;
    });

  for (let i = 0; i < ordenadas.length; i += 1) {
    const { banda } = ordenadas[i];
    const esUltima = i === ordenadas.length - 1;
    const color = colorDeOrg(banda.org);
    const altoBanda = altoDeTier(banda.tier);
    const yBanda = PAD_ARR + (innerH - altoBanda) / 2;
    const xIni = xDe(Number(banda.desde));
    const xFinDatos = abierta(banda) ? x1 : xDe(Number(banda.hasta ?? banda.desde));
    const xFin = (!esUltima && !abierta(banda)) ? xFinDatos - SEPARADOR : xFinDatos;
    const w = Math.max(0, xFin - xIni);

    const rect = svg('rect');
    attr(rect, {
      x: xIni,
      y: yBanda,
      width: w,
      height: altoBanda,
      rx: RADIO_ESQUINA,
      ry: RADIO_ESQUINA
    });

    if (abierta(banda) && w > 0) {
      seqGradiente += 1;
      const gradId = `org-fade-${seqGradiente}`;
      const grad = svg('linearGradient');
      attr(grad, { id: gradId, x1: '0', x2: '1', y1: '0', y2: '0' });
      const offsets = [0, 1 - FRACCION_FADE_ACTIVA, 1];
      const opacidades = [1, 1, 0];
      for (let k = 0; k < offsets.length; k += 1) {
        const stop = svg('stop');
        attr(stop, { offset: `${offsets[k] * 100}%` });
        pintar(stop, 'stop-color', color);
        pintar(stop, 'stop-opacity', String(opacidades[k]));
        grad.appendChild(stop);
      }
      defs.appendChild(grad);
      pintar(rect, 'fill', `url(#${gradId})`);
    } else {
      pintar(rect, 'fill', color);
    }
    pintar(rect, 'stroke', 'none');
    nodo.appendChild(rect);

    if (w >= ANCHO_MIN_INICIALES) {
      const iniciales = inicialesDeOrg(banda.org);
      nodo.appendChild(textoSvg(
        iniciales,
        xIni + RADIO_ESQUINA + 2,
        yBanda + altoBanda / 2,
        TOKEN_TINTA,
        'start'
      ));
    }

    const hitAlto = Math.max(TAMANO_HIT, altoBanda);
    const hitY = yBanda + altoBanda / 2 - hitAlto / 2;
    const hit = svg('rect');
    attr(hit, { x: xIni, y: hitY, width: Math.max(w, TAMANO_HIT), height: hitAlto, rx: RADIO_ESQUINA });
    pintar(hit, 'fill', `var(--${TOKEN_SUPERFICIE})`);
    pintar(hit, 'fill-opacity', '0');
    if (typeof onHoverBanda === 'function') {
      const disparar = () => onHoverBanda(banda, hit);
      hit.addEventListener('pointermove', disparar);
      hit.addEventListener('focus', disparar);
      hit.setAttribute('tabindex', '0');
    }
    nodo.appendChild(hit);
  }

  return {
    nodo,
    series: bandas.map((b) => ({ id: b.org, label: b.org, color: colorDeOrg(b.org) }))
  };
}
