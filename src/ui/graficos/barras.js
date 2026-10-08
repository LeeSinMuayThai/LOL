// Primitivo de gráficos: barras comparables (fase V, PLAN.md §V1).
// Presentación pura: recibe datos ya en forma, devuelve nodo <svg> accesible + series.
// Cero dependencias, cero color literal en JS, cero azar nativo (regla invariable 1).

import { NS_SVG, nodoSvg, resolverTono as resolverTonoComun } from './comun.js';

const PADDING_SUPERIOR = 20;
const PADDING_INFERIOR = 24;
const PADDING_LATERAL = 16;
const GROSOR_MAX_BARRA = 24;
const RADIO_EXTREMO_BARRA = 4;
const GAP_ENTRE_BARRAS = 2; // Separador de 2px entre barras que se tocan
const ALTO_HIT_MINIMO = 24;
const ANCHO_HIT_MINIMO = 24;
const MIN_ALTO_TEXTO_INTERNO = 20;

function resolverTono(tono) {
  return resolverTonoComun(tono, 'crearBarras');
}

function caminoBarra(x, y, w, h, radio = RADIO_EXTREMO_BARRA) {
  if (h <= 0) return '';
  const r = Math.min(radio, h, Math.floor(w / 2));
  return `M ${x} ${y + h} L ${x} ${y + r} a ${r} ${r} 0 0 1 ${r} -${r} h ${w - 2 * r} a ${r} ${r} 0 0 1 ${r} ${r} L ${x + w} ${y + h} Z`;
}

// V5 (la pestaña Carrera): `valores: false` apaga el número de la punta de cada barra (con muchos años en un celular los
// números se pisan; la etiqueta de abajo y el `aria-label` siguen).
export function crearBarras({
  grupos = [],
  ancho = 320,
  alto = 160,
  dominioY = null,
  onHoverBarra = null,
  valores = true
} = {}) {
  if (!Array.isArray(grupos)) {
    throw new Error('crearBarras: grupos debe ser un array');
  }

  const svg = nodoSvg('svg', {
    xmlns: NS_SVG,
    viewBox: `0 0 ${ancho} ${alto}`,
    width: ancho,
    height: alto,
    role: 'img'
  });

  const todosLosValores = grupos.flatMap((g) => (g.barras || []).map((b) => Number(b.valor) || 0));
  const maxDato = todosLosValores.length > 0 ? Math.max(0, ...todosLosValores) : 0;

  const [minY, maxY] = Array.isArray(dominioY) && dominioY.length === 2
    ? dominioY
    : [0, maxDato > 0 ? maxDato : 1];

  const rangoY = maxY - minY > 0 ? maxY - minY : 1;

  const x0 = PADDING_LATERAL;
  const x1 = ancho - PADDING_LATERAL;
  const y0 = PADDING_SUPERIOR;
  const yBase = alto - PADDING_INFERIOR;
  const alturaGrafico = Math.max(10, yBase - y0);

  // Línea de base (grilla de 1px sólido en gris tenue fuera de superficie)
  const lineaBase = nodoSvg('line', {
    x1: x0,
    y1: yBase,
    x2: x1,
    y2: yBase,
    stroke: 'var(--line-faint)',
    'stroke-width': 1
  });
  svg.appendChild(lineaBase);

  const seriesMap = new Map();
  const cantGrupos = grupos.length;
  const anchoZonaUtil = x1 - x0;
  const anchoRanuraGrupo = cantGrupos > 0 ? anchoZonaUtil / cantGrupos : anchoZonaUtil;

  grupos.forEach((grupo, iGrupo) => {
    const barras = grupo.barras || [];
    const cantBarras = barras.length;

    // Registrar series por tono distinto
    for (const barra of barras) {
      if (!seriesMap.has(barra.tono)) {
        seriesMap.set(barra.tono, {
          id: barra.tono,
          label: barra.label || barra.tono,
          color: resolverTono(barra.tono)
        });
      }
    }

    const anchoBarraCalculado = cantBarras > 0
      ? Math.floor((anchoRanuraGrupo * 0.7 - (cantBarras - 1) * GAP_ENTRE_BARRAS) / cantBarras)
      : GROSOR_MAX_BARRA;
    const anchoBarra = Math.max(4, Math.min(GROSOR_MAX_BARRA, anchoBarraCalculado));
    const anchoTotalBarras = cantBarras * anchoBarra + Math.max(0, cantBarras - 1) * GAP_ENTRE_BARRAS;

    const centroGrupo = x0 + (iGrupo + 0.5) * anchoRanuraGrupo;
    const xInicioBarras = centroGrupo - anchoTotalBarras / 2;

    barras.forEach((barra, iBarra) => {
      const val = Number(barra.valor) || 0;
      const fraccion = Math.max(0, Math.min(1, (val - minY) / rangoY));
      const hBarra = Math.round(fraccion * alturaGrafico);
      const xBarra = xInicioBarras + iBarra * (anchoBarra + GAP_ENTRE_BARRAS);
      const yBarra = yBase - hBarra;

      const tonoColor = resolverTono(barra.tono);

      if (hBarra > 0) {
        const d = caminoBarra(xBarra, yBarra, anchoBarra, hBarra, RADIO_EXTREMO_BARRA);
        const pathEl = nodoSvg('path', {
          d,
          fill: tonoColor
        });
        svg.appendChild(pathEl);
      }

      // Valor en el cap de la barra (adentro si entra, afuera si no; nunca clipeado)
      const entraAdentro = hBarra >= MIN_ALTO_TEXTO_INTERNO;
      const yTexto = entraAdentro ? yBarra + 13 : Math.max(12, yBarra - 4);

      if (valores) {
        const textoValor = nodoSvg('text', {
          x: xBarra + anchoBarra / 2,
          y: yTexto,
          'text-anchor': 'middle',
          'font-size': '11',
          'font-family': 'var(--font-ui)',
          'font-weight': '600',
          fill: 'var(--ink)'
        });
        textoValor.textContent = String(val);
        svg.appendChild(textoValor);
      }

      // Área de hit transparente >= 24px
      const anchoHit = Math.max(ANCHO_HIT_MINIMO, anchoBarra);
      const altoHit = Math.max(ALTO_HIT_MINIMO, hBarra);
      const xHit = xBarra - (anchoHit - anchoBarra) / 2;
      const yHit = Math.min(yBarra, yBase - altoHit);

      const hit = nodoSvg('rect', {
        x: xHit,
        y: yHit,
        width: anchoHit,
        height: altoHit,
        fill: 'transparent',
        tabindex: 0,
        'aria-label': `${grupo.label || ''} ${barra.label || ''}: ${val}`.trim()
      });

      if (typeof onHoverBarra === 'function') {
        hit.addEventListener('pointermove', (evento) => onHoverBarra({ grupo, barra, evento }));
        hit.addEventListener('focus', (evento) => onHoverBarra({ grupo, barra, evento }));
      }
      svg.appendChild(hit);
    });

    // Etiqueta del grupo debajo de la línea de base
    if (grupo.label) {
      const labelGrupo = nodoSvg('text', {
        x: centroGrupo,
        y: yBase + 16,
        'text-anchor': 'middle',
        'font-size': '11',
        'font-family': 'var(--font-ui)',
        fill: 'var(--ink-dim)'
      });
      labelGrupo.textContent = grupo.label;
      svg.appendChild(labelGrupo);
    }
  });

  // Accesibilidad: aria-label con resumen y dígitos
  const totalBarras = todosLosValores.length;
  const descripcion = `Gráfico de barras: ${cantGrupos} grupos, ${totalBarras} barras en total (máximo ${maxY})`;
  svg.setAttribute('aria-label', descripcion);

  const series = [...seriesMap.values()];
  return { nodo: svg, series };
}
