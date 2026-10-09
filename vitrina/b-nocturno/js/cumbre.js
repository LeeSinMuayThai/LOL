// La cumbre. `titulo`: el "¡EXTRA!" — una tapa de papel entra girando y frena (≤ 900 ms, salteable) sobre la noche,
// donde quedó la final mapa a mapa. `final`: la edición de colección — el puntaje como número de edición, el escalón como
// titular, el Golden Road como sello, la seed como código de barras — y al lado el almanaque de la carrera.

import { crearAmbiente } from './halftone.js';
import { crearAzar } from '../../comun/azar.js';
import { h, fmt, mayus, revelar, entrar, quieto, codigoDeBarras, odometro } from './util.js';
import { folio, numeroFranja, folioAbajo } from './folio.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, ...hijos) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, v);
  for (const c of hijos.flat()) if (c !== null && c !== undefined) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
};
const ROL = { top: 'Top', jungla: 'Jungla', mid: 'Mid', adc: 'ADC', support: 'Support' };

export function montarCumbre(raiz, ctx) {
  return ctx.muestra === 'final' ? montarColeccion(raiz, ctx) : montarExtra(raiz, ctx);
}

// ——— ¡EXTRA! ———
function montarExtra(raiz, ctx) {
  const { datos, meta } = ctx;
  const T = datos.titulo;
  const log = T.log;
  const main = datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone';
  const f = T.franja;
  const ganados = log.mapas.filter((m) => m.resultado === 'W').length;

  const pagina = h('article.cumbre.cumbre-extra', { 'data-pieza': 'cumbre', 'data-muestra': 'titulo' });
  const fondo = h('div.extra-fondo', { 'aria-hidden': 'true' });

  const mapas = h(
    'ol.mapas',
    log.mapas.map((m) =>
      h(
        `li.mapa${m.resultado === 'W' ? '.gano' : '.perdio'}`,
        h('span.mapa-n', `M${m.mapa}`),
        h('span.mapa-marcador', m.marcador),
        h('span.mapa-campeon', m.campeon),
        h('span.mapa-res', m.resultado === 'W' ? 'Ganan' : 'Pierden'),
        h('p.mapa-cierre', m.cierre),
      ),
    ),
  );
  const plan = T.logsDelSplit?.[0]?.message;
  const quemados = T.serieFinal?.quemados ?? [];
  const cronica = h(
    'section.extra-cronica',
    h('p.kicker', h('span.kicker-acento', 'La final'), ` · ${T.titulo.liga} ${T.titulo.anio} · vs ${log.rival}`),
    plan ? h('p.extra-plan', plan) : null,
    mapas,
    quemados.length ? h('p.quemados', h('span.kicker', 'Quemados en la serie'), h('span.quemados-lista', quemados.map((q) => h('s', q)))) : null,
  );

  // la tapa de papel
  const foto = h('figure.tapa-foto', { 'aria-hidden': 'true' });
  const plantel = h(
    'ul.plantel',
    T.plantel.map((p) => h(`li${p.esJugador ? '.vos' : ''}`, h('span', ROL[p.rol] ?? p.rol), h('b', p.handle))),
  );
  const tapa = h(
    'section.tapa.tapa-extra',
    { 'aria-label': `¡Extra! Campeones de ${T.titulo.nombre} ${T.titulo.anio}` },
    h(
      'header.tapa-cabecera',
      h('span.tapa-marca', 'Un Split Más'),
      h('span.tapa-extra-sello', '¡Extra!'),
      h('span.tapa-fecha', `${T.titulo.liga} · ${mayus(f.cuando?.ventana?.texto ?? '')} · ${T.titulo.anio}`),
    ),
    h('h1.tapa-titular', '¡Campeones!'),
    foto,
    h(
      'div.tapa-bajada',
      h('p.tapa-bajada-txt', h('b', T.titulo.org), ` levanta la ${T.titulo.nombre} ${T.titulo.anio}. Cerró la final ${log.marcador.join('-')} ante ${log.rival}.`),
      h('p.tapa-marcador', h('span', String(log.marcador[0])), h('i', '–'), h('span', String(log.marcador[1]))),
    ),
    h('div.tapa-pie', plantel, h('p.tapa-serie', log.mapas.map((m) => h(`span${m.resultado === 'W' ? '.w' : ''}`, m.resultado)), h('em', `${ganados} de ${log.mapas.length} mapas`))),
  );
  const salir = h('button.extra-siguiente', { type: 'button', onclick: () => ctx.irA('cumbre', 'final') }, h('span.kicker', 'Fin de la carrera'), h('span.extra-siguiente-txt', 'La edición de colección →'));

  pagina.append(
    folio(['Un Split Más', `Edición ${T.titulo.anio}`, mayus(f.cuando?.ventana?.texto ?? ''), 'Edición extra'], [f.quien?.handle, f.quien?.rolEtiqueta, f.club?.org, f.cuando?.edadTexto, numeroFranja(f.numero)]),
    fondo,
    cronica,
    salir,
    tapa,
    folioAbajo(0, 'Temporada'),
  );
  raiz.append(pagina);

  const amb = crearAmbiente(fondo, { meta, fade: [0, 0, 0.56, 0.36], zoom: 1, semilla: 'extra' });
  const ambTapa = crearAmbiente(foto, { meta, modo: 'papel', fade: [0.74, 1.0, 0, 0], zoom: 1.5, semilla: 'tapa', respira: false });
  const listo = Promise.all([
    amb.ambiente({ era: ctx.era, animo: 'gloria', arte: main }),
    ambTapa.ambiente({ era: ctx.era, animo: 'normal', arte: main }),
  ]);

  let anims = [];
  let tGolpe = 0;
  function girar() {
    anims.forEach((a) => a.cancel());
    anims = [];
    clearTimeout(tGolpe);
    pagina.querySelectorAll('.mapa, .extra-plan, .quemados').forEach((el, i) => entrar(el, { delay: 80 + i * 60 }));
    if (quieto()) return;
    anims.push(
      tapa.animate(
        [
          { transform: 'translate(-34%, 46%) rotate(-620deg) scale(0.05)', opacity: 0, boxShadow: '0 0 0 0 var(--paper-shadow)' },
          { opacity: 1, offset: 0.1 },
          { transform: 'translate(0, 0) rotate(-2.2deg) scale(1.035)', boxShadow: '0 0 0 0 var(--paper-shadow)', offset: 0.84 },
          { transform: 'translate(0, 0) rotate(-2.2deg) scale(1)', boxShadow: '0 30px 60px -10px var(--paper-shadow)' },
        ],
        { duration: 880, easing: 'cubic-bezier(0.16, 0.74, 0.2, 1)', fill: 'backwards' },
      ),
      salir.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 900, fill: 'backwards', easing: 'ease-out' }),
    );
    tGolpe = setTimeout(() => amb.pulso('gloria'), 740);
  }
  amb.respirar(true);
  girar();
  pagina.addEventListener('click', (e) => {
    if (!e.target.closest('button') && saltar()) e.stopPropagation();
  });
  function saltar() {
    const vivas = anims.filter((a) => a.playState === 'running');
    vivas.forEach((a) => a.finish());
    return vivas.length > 0;
  }

  return {
    listo,
    repetir: girar,
    saltar,
    congelar(ms) {
      amb.congelar(ms);
      ambTapa.congelar(ms);
    },
    alEra(era) {
      amb.ambiente({ era });
      ambTapa.ambiente({ era });
    },
    destruir() {
      clearTimeout(tGolpe);
      amb.destruir();
      ambTapa.destruir();
      pagina.remove();
    },
  };
}

// ——— la edición de colección + el almanaque ———
function montarColeccion(raiz, ctx) {
  const { datos, meta } = ctx;
  const F = datos.final;
  const P = F.puntaje;
  const tray = F.trayectoria;
  const main = datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone';
  const seed = F.seed ?? meta.seed;
  const azar = crearAzar(`barras-${seed}`);
  const foto = F.fotoDeLaFranja;

  const pagina = h('article.cumbre.cumbre-final', { 'data-pieza': 'final' });
  const fotoTapa = h('figure.tapa-foto', { 'aria-hidden': 'true' });
  const gr = (F.goldenRoads ?? [])[0];
  const sello = gr ? selloGoldenRoad(gr) : null;
  const tapa = h(
    'section.tapa.tapa-coleccion',
    { 'aria-label': `Edición de colección: ${F.identidad}` },
    h('header.col-cabecera', h('span.col-marca', 'Un Split Más'), h('span.col-kicker', h('span', 'Edición de colección'), h('span', F.marco?.titulo ?? ''))),
    fotoTapa,
    sello,
    h('p.col-escalon-kicker', 'El escalón'),
    h('h1.col-escalon', P.nivel?.nombre ?? F.escalon?.actual?.nombre),
    h(
      'div.col-pie',
      h('p.col-numero', h('span.col-n', 'Nº'), h('span.col-total', odometro(0, P.total, { delay: 380 })), h('span.col-ref', h('b', 'puntos'), ` · percentil ${P.percentil}`)),
      h('div.col-codigo', codigoDeBarras(seed, azar), h('span', `seed ${seed}${F.versionDelJuego ? ` · v ${F.versionDelJuego}` : ''}`)),
    ),
    h('p.col-identidad', F.identidad),
  );

  // el almanaque
  const H = P.hechos ?? {};
  const R = F.registro ?? {};
  const cifras = [
    { n: (R.titulos ?? []).length, t: 'títulos', ref: `${H.titulosTier1 ?? 0} de primera` },
    { n: (R.internacionales ?? []).length, t: 'internacionales', ref: `${(R.internacionales ?? []).filter((i) => i.resultado === 'final' || i.resultado === 'campeon').length} finales` },
    { n: H.mundialesGanados ?? 0, t: 'Mundial', ref: (tray.mundiales ?? []).map((m) => `${m.org} ${m.anio}`).join(' · ') },
    { n: `#${H.rankPico ?? '—'}`, t: 'pico del mundo', ref: `${H.cierresEnTop20 ?? 0} cierres en el Top 20` },
  ];
  const almanaque = h(
    'section.almanaque-carrera',
    h('p.kicker.alm-kicker', h('span.kicker-acento', 'El almanaque'), h('span.kicker-filete'), h('span', `${tray.dominio[0]}—${tray.dominio[1]}`)),
    h('h2.alm-titulo', `${new Set((F.tarjeta?.historia ?? []).map((x) => x.org)).size} camisetas, ${H.splitsJugados ?? ''} splits`),
    grafico(tray, R),
    notas(tray.notas ?? []),
    mundiales(R.internacionales ?? []),
    h('ul.cifras', cifras.map((c) => h('li', h('b.t-ancha', String(c.n)), h('span.cifra-t', c.t), h('span.cifra-ref', c.ref)))),
    F.escalon?.siguiente ? h('p.alm-siguiente', h('span.kicker', `Lo que faltó para ${F.escalon.siguiente.nombre}`), h('span', F.escalon.siguiente.enPasado)) : null,
  );

  pagina.append(
    folio(['Un Split Más', 'Edición de colección', `${tray.dominio[0]}—${tray.dominio[1]}`], [foto?.quien?.handle, foto?.quien?.rolEtiqueta, foto?.club?.fase, foto?.cuando?.edadTexto, h('span.folio-numero', h('b', `pico ${foto?.numero?.valor ?? ''}`), foto?.numero?.bandaTexto ? ` · ${foto.numero.bandaTexto}` : '')]),
    tapa,
    almanaque,
    folioAbajo(0, 'Carrera'),
  );
  raiz.append(pagina);

  const amb = crearAmbiente(fotoTapa, { meta, modo: 'papel', fade: [0.66, 1.0, 0, 0], zoom: 1.45, semilla: 'coleccion', respira: false });
  const listo = amb.ambiente({ era: ctx.era, animo: 'normal', arte: main });

  function entrada() {
    revelar(tapa, { dur: 420, desde: 'arriba' });
    if (sello && !quieto()) sello.animate([{ transform: 'rotate(-14deg) scale(1.6)', opacity: 0 }, { transform: 'rotate(-14deg) scale(1)', opacity: 1 }], { duration: 260, delay: 560, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)', fill: 'backwards' });
    revelar(almanaque.querySelector('.alm-titulo'), { delay: 160 });
    const curva = almanaque.querySelector('.curva');
    if (curva && !quieto()) curva.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900, delay: 240, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'backwards' });
    almanaque.querySelectorAll('.cinta-tramo, .hito, .notas li, .cifras li').forEach((el, i) => entrar(el, { delay: 300 + i * 22, dur: 260 }));
  }
  entrada();

  return {
    listo,
    repetir: entrada,
    congelar: (ms) => amb.congelar(ms),
    alEra: (era) => amb.ambiente({ era }),
    destruir() {
      amb.destruir();
      pagina.remove();
    },
  };
}

function selloGoldenRoad(anio) {
  const id = `gr-${anio}`;
  const svg = s(
    'svg',
    { viewBox: '0 0 120 120', class: 'sello-gr', role: 'img', 'aria-label': `Golden Road ${anio}` },
    s('defs', {}, s('path', { id, d: 'M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0' })),
    s('circle', { cx: 60, cy: 60, r: 57, class: 'sello-aro' }),
    s('circle', { cx: 60, cy: 60, r: 33, class: 'sello-aro' }),
    s('text', { class: 'sello-txt' }, s('textPath', { href: `#${id}`, startOffset: '0', textLength: 272, lengthAdjust: 'spacing' }, `GOLDEN ROAD · ${anio} · GOLDEN ROAD · ${anio} · `)),
    s('text', { x: 60, y: 64, class: 'sello-centro' }, String(anio)),
    s('text', { x: 60, y: 76, class: 'sello-centro-chico' }, 'LIGA + MUNDIAL'),
  );
  return svg;
}

// La trayectoria como infografía impresa: la curva de nivel con su trama, la cinta de orgs y los títulos.
function grafico(tray, R) {
  const W = 640;
  const Hh = 250;
  const x0 = Math.floor(Math.min(...tray.puntos.map((p) => p.x), tray.dominio[0]));
  const x1 = tray.dominio[1] + 1;
  const nivMin = 30;
  const nivMax = 100;
  const X = (a) => ((a - x0) / (x1 - x0)) * W;
  const Y = (n) => 150 - ((n - nivMin) / (nivMax - nivMin)) * 140;
  const pts = tray.puntos.map((p) => [X(p.x), Y(p.nivel)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)} 150 L${pts[0][0].toFixed(1)} 150 Z`;
  const pico = tray.puntos.reduce((a, b) => (b.nivel > a.nivel ? b : a));
  const picoR = R.picos ?? {};
  const g = s(
    'svg',
    { viewBox: `-8 -34 ${W + 16} ${Hh + 34}`, class: 'grafico', role: 'img', 'aria-label': `Nivel por split de ${x0} a ${x1 - 1}; pico ${Math.round(pico.nivel)}` },
    s('defs', {}, s('pattern', { id: 'trama-curva', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('circle', { cx: 2.5, cy: 2.5, r: 1.15, class: 'trama-punto' }))),
    s('line', { x1: 0, x2: W, y1: Y(60), y2: Y(60), class: 'ref' }),
    s('text', { x: W, y: Y(60) - 4, class: 'eje-txt', 'text-anchor': 'end' }, 'nivel 60'),
    s('line', { x1: 0, x2: W, y1: Y(80), y2: Y(80), class: 'ref' }),
    s('text', { x: W, y: Y(80) - 4, class: 'eje-txt', 'text-anchor': 'end' }, 'nivel 80'),
    s('path', { d: area, class: 'area' }),
    s('path', { d, class: 'curva', pathLength: 1 }),
    s('circle', { cx: X(pico.x), cy: Y(pico.nivel), r: 4, class: 'pico' }),
    s('text', { x: X(pico.x) + 8, y: Y(pico.nivel) - 8, class: 'pico-txt' }, `PICO ${Math.round(picoR.nivel ?? pico.nivel)}${picoR.edadDelPicoDeNivel ? ` · ${picoR.edadDelPicoDeNivel} AÑOS` : ''}`),
    // la cinta de orgs
    (tray.tramos ?? []).map((t) => {
      const xa = X(t.desde);
      const xb = Math.max(xa + 3, X(t.hasta + 0.98) - 2);
      const conTitulos = (t.titulos ?? []).length > 0 && t.tier === 1;
      const cabe = xb - xa > t.org.length * 6.1 + 10;
      return s(
        'g',
        { class: `cinta-tramo${conTitulos ? ' con-titulos' : ''}` },
        s('rect', { x: xa, y: 172, width: xb - xa, height: 26 }),
        cabe ? s('text', { x: xa + 6, y: 189, class: 'cinta-txt' }, mayus(t.org)) : null,
        s('title', {}, `${t.org} · ${t.desdeAnio}–${t.hastaAnio}${t.titulos?.length ? ` · ${t.titulos.length} títulos` : ''}`),
      );
    }),
    // los títulos y los hitos
    (tray.hitos ?? []).map((hi, i, arr) => {
      const x = X(hi.anio + 0.5);
      const mismos = arr.slice(0, i).filter((o) => o.anio === hi.anio).length;
      const y = 166 - mismos * 9;
      if (hi.tipo === 'goldenRoad' || hi.tipo === 'mundial') return null;
      return s('g', { class: 'hito' }, s('rect', { x: x - 3, y: y - 3, width: 6, height: 6, transform: `rotate(45 ${x} ${y})` }), s('title', {}, hi.texto));
    }),
    (() => {
      const gr = (tray.hitos ?? []).find((hi) => hi.tipo === 'goldenRoad');
      if (!gr) return null;
      const x = X(gr.anio + 0.5);
      return s('g', { class: 'hito hito-gr' }, s('line', { x1: x, x2: x, y1: -22, y2: 160 }), s('text', { x: x + 6, y: -16, class: 'gr-txt' }, `GOLDEN ROAD ${gr.anio}`), s('text', { x: x + 6, y: -4, class: 'gr-sub' }, 'liga + Mundial el mismo año'));
    })(),
    // años
    Array.from({ length: Math.floor((x1 - x0) / 2) + 1 }, (_, k) => x0 + k * 2).filter((a) => a < x1).map((a) => s('text', { x: X(a + 0.5), y: 222, class: 'anio-txt', 'text-anchor': 'middle' }, String(a))),
    s('text', { x: 0, y: 244, class: 'eje-txt' }, 'cada ◆ es un título · la cinta, tus clubes'),
  );
  return h('figure.grafico-wrap', g);
}

const RESULTADO = { campeon: 'Campeón', final: 'Final', eliminado: 'Afuera' };
function mundiales(lista) {
  if (!lista.length) return null;
  return h(
    'div.mundiales-wrap',
    h('p.kicker', 'Los Mundiales'),
    h(
      'ol.mundiales',
      lista.map((m) =>
        h(`li.mundial-${m.resultado}`, { title: `${m.torneo} · ${m.org} · ${m.record}` }, h('span.mund-anio', `’${String(m.anio).slice(2)}`), h('b', RESULTADO[m.resultado] ?? m.resultado), h('span.mund-org', m.org), h('span.mund-rec', m.record)),
      ),
    ),
  );
}

function notas(lista) {
  if (!lista.length) return null;
  return h(
    'div.notas-wrap',
    h('p.kicker', 'La nota de cada año'),
    h(
      'ol.notas',
      lista.map((n) =>
        h(`li.nota-${n.banda}`, { title: `${n.anio}: ${n.nota}` }, h('i', { style: { height: `${Math.max(4, n.nota * 3.2)}px` } }), h('b', String(n.nota).replace('.', ',')), h('span', `’${String(n.anio).slice(2)}`)),
      ),
    ),
  );
}
