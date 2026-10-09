// Las eras: la misma doble página de la decisión en las cinco ediciones, una al lado de la otra a escala. Cambian la
// tinta, el grano y el tratamiento de la trama; el arte es el main de cada era y el folio sale de su foto
// (muestras.eras). El panel cambia la era de la página entera; tocar una miniatura también.

import { montarDecision } from './decision.js';
import { h, mayus, dos } from './util.js';
import { folio } from './folio.js';

const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
const TRATAMIENTO = {
  pieza: ['Fanzine fotocopiado', 'Tinta clara, trama gruesa y mucho grano. El ácido, solo como resaltador.'],
  academia: ['La revista de la liga', 'Tinta clara con la sombra ácida corrida. Trama media, grano bajo.'],
  escenario: ['Tinta ácida plena', 'La trama en ácido, fina y nítida. La noche en serio.'],
  mundial: ['Aparece el oro', 'Segunda tinta: oro. El ácido queda para lo que se elige.'],
  leyenda: ['Edición de colección', 'Tinta y papel. Trama fina, casi sin grano.'],
};

export function montarEras(raiz, ctx) {
  const { datos } = ctx;
  const E = datos.eras;
  const movil = innerWidth <= 700;
  const [W, Hh] = movil ? [390, 844] : [1440, 900];
  const pagina = h('article.eras', { 'data-pieza': 'eras' });
  const grilla = h('div.eras-grilla');
  const minis = [];

  ERAS.forEach((era, i) => {
    const e = E[era];
    if (!e) return;
    const lienzo = h('div.mini-lienzo', { 'data-era': era, inert: true, style: { width: `${W}px`, height: `${Hh}px` } });
    const marco = h('button.mini-marco', { type: 'button', 'aria-label': `Ver toda la página en la era ${era}`, onclick: () => window.vitrina.era(era) }, lienzo);
    const fig = h(
      'figure.mini',
      { 'data-mini': era },
      marco,
      h(
        'figcaption.mini-pie',
        h('span.mini-n', dos(i + 1)),
        h('b', mayus(era)),
        h('span', `${e.anio} · ${e.edad} años · ${e.org ?? e.fase}`),
        h('em', TRATAMIENTO[era][0]),
      ),
    );
    grilla.append(fig);
    minis.push({ era, e, lienzo, marco });
  });
  grilla.append(
    h(
      'aside.tintas',
      h('p.kicker', h('span.kicker-acento', 'Las tintas'), ' · cómo cambia la revista'),
      h('ol', ERAS.map((era) => h('li.tinta', { 'data-era': era }, h('i'), h('b', mayus(era)), h('span', TRATAMIENTO[era][1])))),
      h('p.tintas-nota', h('kbd', 'Alt+A'), ' cambia la era de toda la página. Tocá una miniatura para verla en grande.'),
    ),
  );

  const primera = E.pieza ?? Object.values(E)[0];
  const ultima = E.leyenda ?? primera;
  pagina.append(
    folio(['Un Split Más', 'Las cinco ediciones', `${primera.anio}—${ultima.anio}`], [primera.handle, mayus(primera.rol), 'La misma doble página, cinco tintas']),
    h(
      'header.eras-cabeza',
      h('div', h('p.kicker', h('span.kicker-acento', 'Eras'), ' · de los 15 al retiro'), h('h1.eras-titulo', 'La misma doble página, cinco tintas')),
      h('p.eras-bajada', 'Mismo relato, misma decisión. Lo que cambia con la carrera es la impresión: la tinta, el grano y la trama del campeón.'),
    ),
    grilla,
  );
  raiz.append(pagina);

  const montadas = minis.map(({ era, e, lienzo }) =>
    montarDecision(lienzo, {
      datos,
      meta: ctx.meta,
      muestra: 'evento',
      era,
      miniatura: true,
      campeon: e.main,
      franja: e.franja,
      anio: e.anio,
    }),
  );

  function escalar() {
    for (const { lienzo, marco } of minis) {
      const k = marco.clientWidth / W;
      lienzo.style.transform = `scale(${k})`;
      marco.style.height = `${Hh * k}px`;
    }
  }
  const ro = new ResizeObserver(escalar);
  ro.observe(grilla);
  escalar();

  function marcar(era) {
    pagina.querySelectorAll('.mini').forEach((m) => m.classList.toggle('actual', m.dataset.mini === era));
  }
  marcar(ctx.era);

  return {
    listo: Promise.all(montadas.map((m) => m.listo)),
    alEra: marcar,
    destruir() {
      ro.disconnect();
      montadas.forEach((m) => m.destruir());
      pagina.remove();
    },
  };
}
