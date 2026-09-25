// Primitivo de gráficos: escalera ranked / Top 20 (fase V, PLAN.md §V1).
// Presentación pura: posición como peldaño con animación FLIP al reordenar.
// Cero dependencias, cero color literal en JS, cero azar nativo (regla invariable 1).

import { reconciliar } from '../core/reconciliar.js';
import { NS_SVG, nodoSvg, resolverTono as resolverTonoComun } from './comun.js';

const PADDING_TOP = 24;
const PADDING_BOTTOM = 24;
const PADDING_LEFT = 16;
const PADDING_RIGHT = 16;
const MARCADOR_RADIO_NORMAL = 5;
const MARCADOR_RADIO_VOS = 7;
const GROSOR_BORDE_VOS = 2;
const SEPARADOR_ANILLO = 2;
const ALTO_HIT_PELTANO = 24;

function resolverTono(tono) {
  return resolverTonoComun(tono, 'crearEscalera');
}

function calcularY(indice, total, alto) {
  if (total <= 1) return Math.round(alto / 2);
  const alturaUtil = alto - PADDING_TOP - PADDING_BOTTOM;
  const paso = alturaUtil / (total - 1);
  return Math.round(PADDING_TOP + indice * paso);
}

function crearNodoPeldano(peldano, ancho, y, onHoverPeldano, indice) {
  const g = nodoSvg('g', {
    class: 'escalera-peldano',
    transform: `translate(0, ${y})`
  });

  const anchoLinea = ancho - PADDING_LEFT - PADDING_RIGHT;

  // Línea del peldaño (estante)
  const linea = nodoSvg('line', {
    x1: PADDING_LEFT,
    y1: 0,
    x2: PADDING_LEFT + anchoLinea,
    y2: 0,
    stroke: 'var(--line-faint)',
    'stroke-width': 1
  });
  g.appendChild(linea);

  // Marcador de color
  const radio = peldano.esVos ? MARCADOR_RADIO_VOS : MARCADOR_RADIO_NORMAL;
  const strokeColor = peldano.esVos ? 'var(--ink)' : 'var(--bg-surface)';
  const strokeWidth = peldano.esVos ? GROSOR_BORDE_VOS : SEPARADOR_ANILLO;
  const marcador = nodoSvg('circle', {
    cx: PADDING_LEFT + 10,
    cy: 0,
    r: radio,
    fill: resolverTono(peldano.tono),
    stroke: strokeColor,
    'stroke-width': strokeWidth
  });
  g.appendChild(marcador);

  // Etiqueta de texto (D51: siempre visible junto al color, tinta no color de serie)
  const texto = nodoSvg('text', {
    x: PADDING_LEFT + 24,
    y: 4,
    fill: peldano.esVos ? 'var(--ink)' : 'var(--ink-dim)',
    'font-size': '12',
    'font-family': 'var(--font-ui)',
    'font-weight': peldano.esVos ? '700' : '500'
  });
  texto.textContent = `${peldano.label || ''}${peldano.esVos ? ' (Vos)' : ''}`;
  g.appendChild(texto);

  // Área de hit transparente >= 24px
  const hit = nodoSvg('rect', {
    x: PADDING_LEFT,
    y: -ALTO_HIT_PELTANO / 2,
    width: anchoLinea,
    height: ALTO_HIT_PELTANO,
    fill: 'transparent',
    tabindex: 0,
    'aria-label': `${peldano.label || ''}: posición ${indice + 1}`
  });

  if (typeof onHoverPeldano === 'function') {
    hit.addEventListener('pointermove', (evento) => onHoverPeldano({ peldano, posicion: indice + 1, evento }));
    hit.addEventListener('focus', (evento) => onHoverPeldano({ peldano, posicion: indice + 1, evento }));
  }
  g.appendChild(hit);

  g._peldanoRefs = { linea, marcador, texto, hit };
  return g;
}

function actualizarNodoPeldano(g, peldano, ancho, y, onHoverPeldano, indice) {
  g.setAttribute('transform', `translate(0, ${y})`);

  const refs = g._peldanoRefs;
  if (!refs) return;

  const radio = peldano.esVos ? MARCADOR_RADIO_VOS : MARCADOR_RADIO_NORMAL;
  const strokeColor = peldano.esVos ? 'var(--ink)' : 'var(--bg-surface)';
  const strokeWidth = peldano.esVos ? GROSOR_BORDE_VOS : SEPARADOR_ANILLO;

  refs.marcador.setAttribute('r', radio);
  refs.marcador.setAttribute('fill', resolverTono(peldano.tono));
  refs.marcador.setAttribute('stroke', strokeColor);
  refs.marcador.setAttribute('stroke-width', strokeWidth);

  refs.texto.setAttribute('fill', peldano.esVos ? 'var(--ink)' : 'var(--ink-dim)');
  refs.texto.setAttribute('font-weight', peldano.esVos ? '700' : '500');
  refs.texto.textContent = `${peldano.label || ''}${peldano.esVos ? ' (Vos)' : ''}`;

  refs.hit.setAttribute('aria-label', `${peldano.label || ''}: posición ${indice + 1}`);
}

export function crearEscalera({
  peldanos = [],
  ancho = 240,
  alto = 400,
  onHoverPeldano = null
} = {}, contenedorParaFlip = null) {
  if (!Array.isArray(peldanos)) {
    throw new Error('crearEscalera: peldanos debe ser un array');
  }

  // Ordenar por valorOrden descendente (más alto = más arriba)
  const ordenados = [...peldanos].sort((a, b) => (Number(b.valorOrden) || 0) - (Number(a.valorOrden) || 0));
  const total = ordenados.length;

  const host = contenedorParaFlip || {};
  let refs = host.__escaleraRefs;

  if (!refs) {
    const svg = nodoSvg('svg', {
      xmlns: NS_SVG,
      viewBox: `0 0 ${ancho} ${alto}`,
      width: ancho,
      height: alto,
      role: 'img'
    });

    const style = nodoSvg('style');
    style.textContent = `
      .escalera-peldano { transition: transform var(--dur, 220ms) var(--ease, ease); }
      @media (prefers-reduced-motion: reduce) {
        .escalera-peldano { transition: none !important; }
      }
    `;
    svg.appendChild(style);

    const lista = nodoSvg('g', { class: 'escalera-lista' });
    svg.appendChild(lista);

    refs = { svg, lista };
    host.__escaleraRefs = refs;
  } else {
    refs.svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
    refs.svg.setAttribute('width', ancho);
    refs.svg.setAttribute('height', alto);
  }

  // Reconciliar nodos de peldaño con FLIP habilitado
  reconciliar(
    refs.lista,
    ordenados,
    (p) => String(p.id),
    (p) => {
      const idx = ordenados.indexOf(p);
      const y = calcularY(idx, total, alto);
      return crearNodoPeldano(p, ancho, y, onHoverPeldano, idx);
    },
    (nodo, p) => {
      const idx = ordenados.indexOf(p);
      const y = calcularY(idx, total, alto);
      actualizarNodoPeldano(nodo, p, ancho, y, onHoverPeldano, idx);
    },
    { flip: true }
  );

  // Accesibilidad: aria-label con resumen y dígitos
  const descripcion = `Escalera de ${total} peldaños: ${ordenados.map((p, i) => `#${i + 1} ${p.label || ''}${p.esVos ? ' (Vos)' : ''}`).join(', ')}`;
  refs.svg.setAttribute('aria-label', descripcion);

  // Series únicas por tono
  const seriesMap = new Map();
  for (const p of ordenados) {
    if (!seriesMap.has(p.tono)) {
      seriesMap.set(p.tono, {
        id: p.tono,
        label: p.label || p.tono,
        color: resolverTono(p.tono)
      });
    }
  }

  return {
    nodo: refs.svg,
    series: [...seriesMap.values()]
  };
}
