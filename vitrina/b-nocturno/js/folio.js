// Folios: la línea de arriba (cabecera, edición, ventana, página | quién, club, cuándo, el número con su referente)
// y la de abajo (los cuartos como secciones de la revista + los atajos). Todo sale de los datos (franja, pagina).

import { h, mayus } from './util.js';

export const CUARTOS = ['Vos', 'Temporada', 'Equipo', 'Mundo', 'Carrera', 'Crónica'];

export function folio(izq, der, clase = 'folio-arriba') {
  return h(
    `header.folio.${clase}`,
    h('p.folio-izq', izq.filter(Boolean).map((t, i) => [i ? h('span.folio-sep', { 'aria-hidden': 'true' }, '·') : null, h('span', t)])),
    der ? h('p.folio-der', der.filter(Boolean).map((t, i) => [i ? h('span.folio-sep', { 'aria-hidden': 'true' }, '·') : null, typeof t === 'string' ? h('span', t) : t])) : null,
  );
}

// El número de la franja con su referente: "nivel 76 ▲1 · Élite" / "Oro I · 62 LP".
export function numeroFranja(numero) {
  if (!numero) return null;
  const delta = numero.delta && numero.delta !== '=' ? numero.delta : null;
  return h(
    'span.folio-numero',
    h('b', numero.texto ?? String(numero.valor)),
    delta ? h(`span.folio-delta${delta.startsWith('▼') ? '.baja' : ''}`, ` ${delta}`) : null,
    numero.bandaTexto ? h('span.folio-banda', ` · ${numero.bandaTexto}`) : null,
  );
}

export function folioArriba(M, datos, { anio }) {
  const f = M.franja ?? {};
  const club = f.club?.org ?? f.club?.fase ?? '';
  return folio(
    ['Un Split Más', `Edición ${anio}`, mayus(f.cuando?.ventana?.texto ?? ''), M.pagina?.desde != null ? `P. ${M.pagina.desde + 1}` : null],
    [f.quien?.handle, f.quien?.rolEtiqueta, club, f.cuando?.edadTexto, numeroFranja(f.numero)],
  );
}

export function folioAbajo(nOpciones, activo = 'Temporada') {
  return h(
    'footer.folio.folio-abajo',
    h(
      'nav.cuartos',
      { 'aria-label': 'Cuartos' },
      CUARTOS.map((c, i) => h(`a.cuarto${c === activo ? '.activo' : ''}`, { href: '#', 'aria-current': c === activo ? 'page' : null, onclick: (e) => e.preventDefault() }, h('span.cuarto-n', `0${i + 1}`), c)),
    ),
    nOpciones ? h('p.atajos', h('kbd', `1–${nOpciones}`), ' elegís', h('span.folio-sep', '·'), h('kbd', '↑↓'), ' recorrés', h('span.folio-sep', '·'), h('kbd', 'Enter'), ' confirma') : null,
  );
}
