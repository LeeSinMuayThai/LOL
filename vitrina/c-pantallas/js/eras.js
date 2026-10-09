// Las eras: el MISMO escritorio cortado en cinco franjas, una por era, a escala 1:1 y una al lado de la otra. Cada franja
// trae su propio data-era (los mismos componentes se re-tematizan solos), su papel de pared (una instancia del ambiente
// por franja) y el mismo jugador fotografiado ese año. La era de la página (el panel) ensancha su franja.
import { cargarImagen, urlIcono } from '../../comun/arte.js';
import { el, anim, monogramaDe, TIER_DE_NOMBRE } from './util.js';
import { barraMenu, dock, ventana, escudo, bateria, senal, icono } from './os.js';
import { crearAmbiente } from './ambiente.js';

const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
const NOMBRE = { pieza: 'La pieza', academia: 'La PC del equipo', escenario: 'La estación de pro', mundial: 'El stream', leyenda: 'Los 2040' };

// "Oro I · 62 LP" -> 'gold' (vocabulario fijo de rangos, no prosa)
const tierDe = (texto = '') => TIER_DE_NOMBRE[Object.keys(TIER_DE_NOMBRE).find((n) => texto.startsWith(n))] ?? 'gold';

export function pintarEras(raiz, ctx) {
  const eras = ctx.datos.eras;
  const meta = ctx.meta;
  const ambs = [];
  const cargas = [];
  ctx.fondo({ era: ctx.era, arte: null, org: null, quieto: true });

  const cols = ERAS.filter((e) => eras[e]).map((e, i) => {
    const d = eras[e];
    const fr = d.franja;
    const handle = ctx.peor ? ctx.peor.handle : d.handle;
    const amateur = d.fase === 'amateur';
    const tray = d.fase === 'retirado' ? [] : [bateria(d.ficha?.mentalidad?.valor ?? 0, 'Cabeza')];
    const icon = el('span', { class: 'era-av' });
    cargas.push(cargarImagen(urlIcono(d.main, meta)).then((img) => img && icon.append(Object.assign(img.cloneNode(), { alt: d.main }))));
    const n = fr.numero;
    const numero = n.tipo === 'rango'
      ? el('div', { class: 'era-num' }, el('span', { class: 'era-escudo' }, escudo(tierDe(n.texto))), el('b', {}, n.texto))
      : el('div', { class: 'era-num' }, el('b', {}, n.tipo === 'pico' ? `pico ${n.valor}` : n.texto), n.bandaTexto ? el('span', { class: 'era-banda' }, n.bandaTexto) : null);
    const win = ventana({
      app: 'Vos', icon: 'vos', titulo: `${handle}.perfil`, clase: 'ventana-era', enfocada: true,
      cuerpo: [el('div', { class: 'era-cuerpo' },
        el('div', { class: 'era-quien' }, icon, el('div', {}, el('p', { class: 'era-handle' }, handle), el('p', { class: 'era-rol' }, `${fr.quien.rolEtiqueta} · ${fr.club.org ?? fr.club.fase ?? ''}`))),
        numero,
        el('ul', { class: 'era-datos' },
          el('li', {}, icono('temporada', 'ico ico-chico'), fr.cuando.texto),
          el('li', {}, icono('mundo', 'ico ico-chico'), d.liga ?? (amateur ? 'SoloQ · BR' : 'sin liga')),
          el('li', {}, icono('mecanica', 'ico ico-chico'), `main: ${d.main}`)))],
    });
    const col = el('section', {
      class: 'era-col', 'data-era': e, 'data-activa': e === ctx.era ? 'si' : null, 'aria-label': `${NOMBRE[e]} · ${d.anio}`, tabindex: '0',
      onclick: () => window.vitrina?.era(e),
      onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); window.vitrina?.era(e); } },
    },
    el('div', { class: 'era-escritorio' },
      barraMenu({ app: NOMBRE[e], doc: null, tray, fecha: d.etiquetaDeAnio }),
      el('div', { class: 'era-area' },
        el('header', { class: 'era-cab', 'data-foco': e === ctx.era ? '' : null },
          el('p', { class: 'era-anio' }, String(d.anio)),
          el('p', { class: 'era-os' }, el('span', { class: 'faro-nombre' }, 'FARO'), el('span', {}, String(d.anio).slice(2)), el('small', {}, NOMBRE[e]))),
        win),
      dock('vos', { abierto: 'vos' })));
    col.style.setProperty('--os-version', `'${String(d.anio).slice(2)}'`);
    raiz.append(col);
    const amb = crearAmbiente(col, { meta });
    ambs.push(amb);
    cargas.push(amb.ambiente({ era: e, arte: e === 'academia' ? null : d.main, monograma: e === 'academia' ? monogramaDe(d.org) : null, quieto: true }));
    anim(col, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { delay: 80 + i * 90, duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    return col;
  });
  const fila = el('div', { class: 'eras', 'data-pieza': 'eras' }, ...cols);
  raiz.append(fila);
  return {
    listo: Promise.all(cargas),
    congelar: (ms) => ambs.forEach((a) => a.congelar(ms)),
    destruir: () => ambs.forEach((a) => a.destruir()),
  };
}
