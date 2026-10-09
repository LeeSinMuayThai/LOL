// Las eras: cinco imprentas de la misma revista. Una doble página grande (la decisión real, con el main y el folio de
// la foto de cada era en muestras.eras) y un selector. pieza = fotocopia de fanzine; academia = la revista de la liga;
// escenario = el ácido pleno; mundial = el oro; leyenda = el papel. El panel (Alt+A) o el selector cambian la era de
// toda la página.

import { montarDecision } from './decision.js';
import { h, mayus, dos } from './util.js';
import { folio } from './folio.js';

const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
const IMPRENTA = {
  pieza: ['Fotocopia de fanzine', 'Un bit, grano y la segunda pasada corrida de registro. Titulares recortados y pegados. El ácido, solo como resaltador.'],
  academia: ['La revista de la liga', 'Limpia y fría: trama fina a 0°, tinta fría, titulares en caja baja, números llenos.'],
  escenario: ['El ácido pleno', 'La trama en ácido a 45°, fina y nítida. La noche en serio.'],
  mundial: ['El oro', 'Segunda tinta: oro en la trama, en los números y en los filetes.'],
  leyenda: ['El papel', 'La crónica se imprime en papel; la decisión sigue de noche.'],
};

export function montarEras(raiz, ctx) {
  const { datos } = ctx;
  const E = datos.eras;
  const movil = innerWidth <= 700;
  const [W, Hh] = movil ? [390, 844] : [1440, 900];
  const pagina = h('article.eras', { 'data-pieza': 'eras' });
  const lienzo = h('div.mini-lienzo', { inert: true, style: { width: `${W}px`, height: `${Hh}px` } });
  const marco = h('div.mini-marco.grande', lienzo);
  const pie = h('p.eras-pie');

  const selector = h(
    'ol.selector',
    { 'aria-label': 'Eras' },
    ERAS.filter((e) => E[e]).map((era, i) =>
      h(
        'li',
        h(
          'button.sel',
          { type: 'button', 'data-sel': era, onclick: () => window.vitrina.era(era) },
          h('span.sel-n', dos(i + 1)),
          h('span.sel-muestra', { 'data-era': era, 'aria-hidden': 'true' }, h('i')),
          h('b.sel-nombre', mayus(era)),
          h('span.sel-imprenta', IMPRENTA[era][0]),
          h('span.sel-dato', `${E[era].anio} · ${E[era].edad} años · ${E[era].org ?? E[era].fase}`),
        ),
      ),
    ),
  );

  const primera = E.pieza ?? Object.values(E)[0];
  const ultima = E.leyenda ?? primera;
  pagina.append(
    folio(['Un Split Más', 'Cinco imprentas', `${primera.anio}—${ultima.anio}`], [primera.handle, mayus(primera.rol), 'La misma doble página']),
    h(
      'div.eras-cuerpo',
      h(
        'aside.eras-lado',
        h('p.kicker', h('span.kicker-acento', 'Eras'), ' · de los 15 al retiro'),
        h('h1.eras-titulo', 'Cinco imprentas'),
        h('p.eras-bajada', 'La misma decisión, impresa como la imprimiría cada etapa de la carrera.'),
        selector,
        h('p.tintas-nota', h('kbd', 'Alt+A'), ' o un clic cambian la era de toda la página.'),
      ),
      h('figure.eras-figura', marco, pie),
    ),
  );
  raiz.append(pagina);

  let actual = null;
  let listo = Promise.resolve();
  function montar(era) {
    actual?.destruir();
    lienzo.dataset.era = era;
    const e = E[era] ?? primera;
    actual = montarDecision(lienzo, { datos, meta: ctx.meta, muestra: 'evento', era, miniatura: true, campeon: e.main, franja: e.franja, anio: e.anio });
    listo = actual.listo;
    pagina.querySelectorAll('.sel').forEach((b) => {
      const si = b.dataset.sel === era;
      b.classList.toggle('actual', si);
      b.setAttribute('aria-pressed', String(si));
    });
    pie.replaceChildren(h('b', mayus(era)), h('span', IMPRENTA[era][0]), h('em', IMPRENTA[era][1]));
    return listo;
  }

  function escalar() {
    const k = marco.clientWidth / W;
    lienzo.style.transform = `scale(${k})`;
    marco.style.height = `${Hh * k}px`;
  }
  const ro = new ResizeObserver(escalar);
  ro.observe(marco);
  montar(ERAS.includes(ctx.era) ? ctx.era : 'pieza');
  escalar();

  return {
    get listo() {
      return listo;
    },
    alEra: (era) => montar(era),
    destruir() {
      ro.disconnect();
      actual?.destruir();
      pagina.remove();
    },
  };
}
