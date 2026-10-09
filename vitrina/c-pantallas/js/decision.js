// La decisión como ventana enfocada (FARO). Evento: la ventana de la parada con opciones = label + glifos, un inspector
// con la prosa de a una, y el resultado real que llega como respuesta mientras el widget de contexto rueda sus números.
// Plan amateur: la misma ventana pero como planilla (filas = opciones, columnas = ejes).
import { el, anim, bucle, odometro, rodar, entero, conSigno, quieto, TIER_DE_NOMBRE } from './util.js';
import {
  icono, flechas, glifoDe, cortoDe, RIESGOS, barraMenu, dock, ventana, notificacion, appDeLog, escudo, bateria, senal,
} from './os.js';

const CAT_CONOCIDAS = ['mercado', 'caminos', 'equipo', 'vida'];
const STATS = [
  ['player.stats.mecanica', 'mecanica'], ['player.stats.macro', 'macro'], ['player.stats.laneo', 'laneo'],
  ['player.stats.teamfight', 'teamfight'], ['player.stats.shotcalling', 'shotcalling'], ['player.stats.adaptabilidad', 'adaptabilidad'],
  ['player.stats.mentalidad', 'mentalidad'], ['player.stats.hype', 'hype'],
];

// ---------- peor caso: los textos y nombres más largos que produce el motor ----------
export function conPeorCaso(m, peor) {
  if (!peor) return m;
  const c = structuredClone(m);
  const largos = peor.textosMasLargos ?? {};
  c.franja.quien.handle = peor.handle;
  c.franja.quien.texto = `${peor.handle} · ${c.franja.quien.rolEtiqueta}`;
  c.franja.club.org = peor.org?.nombre ?? c.franja.club.org;
  if (largos['decision.titulo']) c.decision.titulo = largos['decision.titulo'].texto;
  if (largos['decision.descripcion']) c.decision.descripcion = largos['decision.descripcion'].texto;
  const o = c.decision.opciones[0];
  if (o && largos['opcion.label']) o.label = largos['opcion.label'].texto;
  if (o && largos['opcion.descripcion']) o.descripcion = largos['opcion.descripcion'].texto;
  return c;
}

// ---------- la pantalla ----------
export function pintarDecision(raiz, m, ctx) {
  const esPlan = Array.isArray(m.decision.opciones) && m.decision.opciones.some((o) => o.previa?.some((p) => p.campo === 'player.ranked'));
  const fr = m.franja;
  const ficha = m.ficha;
  const jug = ficha.jugador;
  const amateur = jug.fase === 'amateur';

  const tray = amateur
    ? [bateria(jug.sueno, 'Sueño'), senal(jug.confianzaFamiliar, 'Casa')]
    : [bateria(ficha.mentalidad?.valor ?? jug.stats.mentalidad, 'Cabeza'), senal(ficha.jerarquia?.valor ?? jug.jerarquia, 'Jerarquía')];
  const quien = el('span', { class: 'barra-quien' }, fr.quien.texto, fr.club.org ? el('b', {}, ` · ${fr.club.org}`) : fr.club.fase ? el('b', {}, ` · ${fr.club.fase}`) : null);
  const app = esPlan ? 'Planilla' : nombreCat(m.categoria ?? m.decision.datos?.evento?.categoria);
  const doc = esPlan ? `plan-${fr.cuando.anioEtiqueta}.planilla` : m.decision.datos?.evento?.id ?? null;
  const barra = barraMenu({ app, doc, tray: [quien, ...tray], fecha: `${fr.cuando.anioEtiqueta} · ${fr.cuando.ventana?.texto ?? ''}`, pipsDe: fr.cuando.pips });

  // la ventana enfocada
  const parada = esPlan ? planilla(m) : paradaEvento(m);
  const win = ventana({
    app: esPlan ? 'Planilla' : app, icon: esPlan ? 'temporada' : 'cronica', titulo: doc, clase: esPlan ? 'ventana-parada ventana-planilla' : 'ventana-parada',
    cuerpo: [parada.nodo], pieza: 'decision', etiqueta: m.decision.titulo,
  });

  // el panel de contexto (acompañante) y lo último que pasó
  const widget = esPlan ? widgetRanked(ficha, fr) : widgetVos(ficha, fr);
  const notis = feed(m);
  const lateral = el('aside', { class: 'lateral', 'aria-label': 'Contexto' }, notis, widget.nodo);
  const chip = chipContexto(fr, ficha);

  const escritorio = el('div', { class: 'escritorio', 'data-pantalla-c': 'decision' },
    barra,
    el('main', { class: 'area area-decision' }, chip, win, lateral),
    dock(m.acompanante?.cuarto ?? 'vos', { abierto: m.acompanante?.cuarto ?? 'vos' }));
  raiz.append(escritorio);

  // entrada: lo último que pasó llega primero, después se abre la ventana de la parada
  anim(barra, [{ transform: 'translateY(-100%)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  anim(escritorio.querySelector('.dock'), [{ transform: 'translateY(120%)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  notis.querySelectorAll('.noti').forEach((n, i) => anim(n, [{ transform: 'translateX(112%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: 120 + i * 70, duration: 340, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }));
  anim(widget.nodo, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { delay: 260, duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  abrirVentana(win, 420);
  parada.nodo.querySelectorAll('.opcion').forEach((o, i) => anim(o, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: 620 + i * 50, duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }));

  let elegida = 0;
  function elegir(n) {
    const op = m.decision.opciones[n - 1];
    if (!op || elegida) return;
    elegida = n;
    for (const a of raiz.getAnimations({ subtree: true })) if (a.effect?.getTiming().iterations !== Infinity) a.finish();
    const res = m.resultados?.find((r) => r.opcionId === op.id);
    ctx.amb?.pulso('elegir');
    parada.elegir(n, op, res, widget, notis);
  }

  // teclado: 1-4 eligen; flechas recorren; el inspector sigue al foco
  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key)) {
      const b = parada.nodo.querySelector(`.opcion[data-atajo="${e.key}"]`);
      if (b) { e.preventDefault(); elegir(Number(e.key)); }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const ops = [...parada.nodo.querySelectorAll('.opcion:not([disabled])')];
      if (!ops.length) return;
      const i = ops.indexOf(document.activeElement);
      const j = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + ops.length) % ops.length;
      ops[j].focus();
      e.preventDefault();
    }
  }
  document.addEventListener('keydown', tecla);
  parada.nodo.addEventListener('click', (e) => {
    const b = e.target.closest('.opcion[data-atajo]');
    if (b) elegir(Number(b.dataset.atajo));
  });

  return {
    elegir,
    destruir() { document.removeEventListener('keydown', tecla); },
  };
}

function nombreCat(c) {
  const t = { mercado: 'Mercado', caminos: 'Caminos', equipo: 'Equipo', vida: 'Vida' };
  return t[c] ?? 'Parada';
}

export function abrirVentana(win, delay = 0) {
  anim(win, [
    { opacity: 0, transform: 'translateY(18px) scale(0.955)' },
    { opacity: 1, transform: 'translateY(-2px) scale(1.004)', offset: 0.7 },
    { opacity: 1, transform: 'none' },
  ], { delay, duration: 300, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
}

// ---------- encabezado de la parada ----------
function cabecera(m, { kicker }) {
  const id = `planteo-${m.seed ?? 'x'}`;
  const planteo = el('p', { class: 'parada-planteo', id },
    el('span', { class: 'planteo-texto' }, m.decision.descripcion ?? ''));
  const mas = el('button', { class: 'mas', type: 'button', 'aria-expanded': 'false', 'aria-controls': id }, 'más');
  mas.addEventListener('click', () => {
    const abierto = planteo.toggleAttribute('data-abierto');
    mas.setAttribute('aria-expanded', String(abierto));
    mas.textContent = abierto ? 'menos' : 'más';
  });
  return el('div', { class: 'parada-cab', 'data-foco': '', tabindex: '-1' },
    el('p', { class: 'parada-kicker' }, ...kicker),
    el('h1', { class: 'parada-titulo' }, m.decision.titulo),
    el('div', { class: 'planteo-fila' }, planteo, mas));
}

function kickerDe(m) {
  const cat = m.categoria ?? m.decision.datos?.evento?.categoria;
  const catVar = CAT_CONOCIDAS.includes(cat) ? cat : 'otro';
  const fr = m.franja;
  return [
    cat ? el('span', { class: 'cat', style: { '--cat': `var(--cat-${catVar})` } }, nombreCat(cat)) : null,
    m.esBisagra ? el('span', { class: 'bisagra' }, 'bisagra') : null,
    el('span', { class: 'kicker-cuando' }, fr.cuando.texto),
  ];
}

// glifos de una opción: ícono del eje + flechas (cantidad = magnitud) + etiqueta corta
function glifos(previa = []) {
  return el('span', { class: 'glifos' }, ...previa.map((p) => el('span', { class: `glifo ${p.signo === '-' ? 'neg' : 'pos'}`, title: p.texto },
    icono(glifoDe(p.campo), 'ico ico-eje'), flechas(p.signo, p.magnitud), el('span', { class: 'glifo-et' }, cortoDe(p.campo, p.etiqueta)))));
}
function riesgoChip(o) {
  if (!o.riesgo) return null;
  const [ic, nombre] = RIESGOS[o.riesgo] ?? ['incierto', o.riesgo];
  return el('span', { class: 'riesgo', 'data-riesgo': o.riesgo, title: o.riesgoTexto ?? '' }, icono(ic, 'ico ico-chico'), nombre);
}

// la prosa completa de una opción (inspector y aria-describedby)
function prosa(o) {
  return [
    el('p', { class: 'insp-desc' }, o.descripcion ?? ''),
    o.previa?.length ? el('ul', { class: 'insp-previa' }, ...o.previa.map((p) => el('li', { class: p.signo === '-' ? 'neg' : 'pos' }, icono(glifoDe(p.campo), 'ico ico-chico'), p.texto))) : null,
    o.riesgoTexto ? el('p', { class: 'insp-riesgo' }, icono((RIESGOS[o.riesgo] ?? ['incierto'])[0], 'ico ico-chico'), o.riesgoTexto) : null,
    o.propuesta ? el('p', { class: 'insp-propuesta' }, o.propuesta) : null,
  ].filter(Boolean);
}

function inspector(opciones, bloqueadas = []) {
  const caja = el('aside', { class: 'inspector', 'aria-live': 'polite' });
  const mas = el('button', { class: 'insp-mas', type: 'button', 'aria-expanded': 'false', onclick: () => {
    const a = caja.toggleAttribute('data-abierto');
    mas.setAttribute('aria-expanded', String(a));
    mas.textContent = a ? 'menos' : 'más';
  } }, 'más');
  const mostrar = (i) => {
    const o = opciones[i];
    if (o) caja.replaceChildren(el('p', { class: 'insp-cab' }, el('kbd', {}, String(i + 1)), o.label), ...prosa(o), mas);
  };
  const mostrarBloq = (b) => caja.replaceChildren(el('p', { class: 'insp-cab bloq' }, icono('candado', 'ico ico-chico'), b.label), el('p', { class: 'insp-desc' }, b.gate ?? ''));
  mostrar(0);
  return { caja, mostrar, mostrarBloq };
}

// ---------- evento ----------
function paradaEvento(m) {
  const ops = m.decision.opciones;
  const bloq = m.decision.opcionesBloqueadas ?? [];
  const insp = inspector(ops, bloq);
  const ocultas = el('div', { class: 'sr' }, ...ops.map((o, i) => el('div', { id: `desc-${m.seed}-${i + 1}` }, ...prosa(o))));
  const lista = el('ol', { class: 'opciones' },
    ...ops.map((o, i) => el('li', {}, el('button', {
      class: 'opcion', type: 'button', 'data-atajo': String(i + 1), 'aria-describedby': `desc-${m.seed}-${i + 1}`,
      onmouseenter: () => insp.mostrar(i), onfocus: () => insp.mostrar(i),
    },
    el('kbd', { class: 'atajo' }, String(i + 1)),
    el('span', { class: 'opcion-label' }, o.label),
    el('span', { class: 'opcion-pie' }, glifos(o.previa), riesgoChip(o)),
    el('span', { class: 'destello', 'aria-hidden': 'true' })))),
    ...bloq.map((b) => el('li', {}, el('button', {
      class: 'opcion bloqueada', type: 'button', 'aria-disabled': 'true', onmouseenter: () => insp.mostrarBloq(b), onfocus: () => insp.mostrarBloq(b),
    }, el('span', { class: 'atajo' }, icono('candado', 'ico ico-chico')), el('span', { class: 'opcion-label' }, b.label),
    el('span', { class: 'opcion-pie' }, el('span', { class: 'bloq-motivo' }, 'cerrada: mirá por qué'))))));
  const cuerpo = el('div', { class: 'parada-cuerpo' }, lista, insp.caja);
  const hilo = el('div', { class: 'hilo', 'aria-live': 'polite' });
  const nodo = el('div', { class: 'parada' }, cabecera(m, { kicker: kickerDe(m) }), el('div', { class: 'parada-pila' }, cuerpo, hilo), ocultas);

  function elegir(n, op, res, widget, notis) {
    nodo.dataset.elegido = String(n);
    const boton = lista.querySelector(`.opcion[data-atajo="${n}"]`);
    const desde = boton.getBoundingClientRect();
    const t = respuesta(op, res, hilo, { primerRetardo: 240 });
    // la opción elegida vuela a ser tu mensaje (FLIP)
    const mia = t.mia.getBoundingClientRect();
    anim(t.mia, [
      { transform: `translate(${desde.left - mia.left}px, ${desde.top - mia.top}px)`, opacity: 1 },
      { transform: 'none', opacity: 1 },
    ], { delay: 110, duration: 300, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1.06)' });
    anim(boton.querySelector('.destello'), [{ opacity: 1 }, { opacity: 0 }], { duration: 360 });
    anim(cuerpo, [{ opacity: 1, visibility: 'visible', transform: 'none' }, { opacity: 0, visibility: 'visible', transform: 'translateY(6px)' }], { delay: 60, duration: 220, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });
    widget.aplicar(res?.inmediato?.cambios ?? [], 1250);
    toast(notis, res, op, 1500);
    t.seguir.focus({ preventScroll: true });
  }
  return { nodo, elegir };
}

// el hilo: tu mensaje -> escribiendo… -> la respuesta del sistema con los efectos
function respuesta(op, res, hilo, { primerRetardo = 380, mia = true } = {}) {
  const logs = res?.inmediato?.logs ?? [];
  const ultimo = logs[logs.length - 1];
  const texto = ultimo?.cuerpo ?? ultimo?.message ?? '';
  const cambios = (res?.inmediato?.cambios ?? []).filter((c) => typeof c.delta === 'number' && CAMPO_VISIBLE.has(c.campo) && Math.round(c.delta) !== 0);
  const rango = (res?.inmediato?.cambios ?? []).find((c) => c.campo === 'ranked');
  const burbujaMia = mia ? el('div', { class: 'burbuja mia' }, el('span', { class: 'burbuja-de' }, 'Vos'), op.label) : el('span');
  const escribiendo = el('div', { class: 'burbuja escribiendo', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'));
  const efectos = el('ul', { class: 'efectos' },
    rango ? el('li', { class: 'efecto rango' }, icono('soloq', 'ico ico-chico'), `${rango.antes} → ${rango.despues}`) : null,
    ...cambios.map((c) => el('li', { class: `efecto ${c.delta < 0 ? 'neg' : 'pos'}` }, icono(glifoDe(c.campo), 'ico ico-chico'),
      el('span', {}, cortoDe(c.campo)), el('b', {}, `${conSigno(c.delta)}${c.campo === 'player.soloqElo' ? ' LP' : ''}`))));
  const resp = el('div', { class: 'burbuja respuesta' }, el('span', { class: 'burbuja-de' }, icono('nivel', 'ico ico-chico'), 'Lo que pasó'), el('p', {}, texto), efectos);
  const seguir = el('button', { class: 'seguir', type: 'button', onclick: () => window.vitrina?.repetir() }, 'Seguir', icono('flecha', 'ico ico-chico'));
  hilo.replaceChildren(burbujaMia, escribiendo, resp, seguir);

  const t0 = primerRetardo;
  const fin = t0 + 720;
  bucle(escribiendo.children[0], [{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 600 });
  bucle(escribiendo.children[1], [{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 600, delay: 120 });
  bucle(escribiendo.children[2], [{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 600, delay: 240 });
  // "escribiendo…" vive entre t0 y fin; su estado natural es oculto
  anim(escribiendo, [
    { opacity: 0, transform: 'scale(0.8)', visibility: 'visible' }, { opacity: 1, transform: 'none', visibility: 'visible', offset: 0.12 },
    { opacity: 1, transform: 'none', visibility: 'visible', offset: 0.88 }, { opacity: 0, transform: 'scale(0.9)', visibility: 'visible' },
  ], { delay: t0, duration: fin - t0 });
  anim(resp, [{ opacity: 0, transform: 'translateY(10px) scale(0.97)' }, { opacity: 1, transform: 'none' }], { delay: fin, duration: 280, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1.06)' });
  efectos.querySelectorAll('.efecto').forEach((e, i) => anim(e, [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { delay: fin + 180 + i * 70, duration: 220 }));
  anim(seguir, [{ opacity: 0 }, { opacity: 1 }], { delay: fin + 700, duration: 260 });
  return { mia: burbujaMia, resp, seguir };
}

const CAMPO_VISIBLE = new Set([
  'player.stats.mecanica', 'player.stats.macro', 'player.stats.laneo', 'player.stats.teamfight', 'player.stats.shotcalling',
  'player.stats.adaptabilidad', 'player.stats.mentalidad', 'player.stats.hype', 'career.arraigo', 'career.sinergia',
  'player.studies', 'player.sleep', 'player.familyTrust', 'player.soloqElo',
]);

function toast(notis, res, op, delay) {
  const cambios = (res?.inmediato?.cambios ?? []).filter((c) => typeof c.delta === 'number' && CAMPO_VISIBLE.has(c.campo) && c.campo !== 'player.soloqElo' && Math.round(c.antes) !== Math.round(c.despues));
  const texto = cambios.map((c) => `${cortoDe(c.campo)} ${entero(c.antes)} → ${entero(c.despues)}`).join(' · ');
  const n = notificacion({ app: 'Carrera', icon: 'carrera', titulo: 'Quedó en tu carrera', texto: texto || op.label, clase: 'noti-toast' });
  (notis.closest('.area') ?? notis).append(n);
  anim(n, [{ transform: 'translateX(112%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay, duration: 360, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
}

// ---------- plan amateur: la planilla ----------
function planilla(m) {
  const ops = m.decision.opciones;
  const ejes = [];
  for (const o of ops) for (const p of o.previa ?? []) if (!ejes.some((e) => e.campo === p.campo)) ejes.push({ campo: p.campo, etiqueta: p.etiqueta });
  ejes.sort((a, b) => (a.campo === 'player.ranked' ? -1 : b.campo === 'player.ranked' ? 1 : 0));
  const maxLp = Math.max(1, ...ops.map((o) => o.previa?.find((p) => p.campo === 'player.ranked')?.valor ?? 0));
  const insp = inspector(ops);
  const ocultas = el('div', { class: 'sr' }, ...ops.map((o, i) => el('div', { id: `desc-${m.seed}-${i + 1}` }, ...prosa(o))));
  const cols = `var(--col-plan) ${ejes.map((e) => (e.campo === 'player.ranked' ? 'var(--col-lp)' : 'var(--col-eje)')).join(' ')} var(--col-riesgo)`;

  const cab = el('div', { class: 'pl-fila pl-cab', role: 'row', style: { '--cols': cols } },
    el('span', { class: 'pl-c pl-plan', role: 'columnheader' }, 'Plan'),
    ...ejes.map((e) => el('span', { class: 'pl-c', role: 'columnheader', title: e.etiqueta }, icono(glifoDe(e.campo), 'ico ico-eje'), el('span', {}, cortoDe(e.campo, e.etiqueta)))),
    el('span', { class: 'pl-c', role: 'columnheader' }, icono('peligro', 'ico ico-eje'), el('span', {}, 'Riesgo')));

  const filas = ops.map((o, i) => {
    const celdas = ejes.map((e) => {
      const p = o.previa?.find((x) => x.campo === e.campo);
      if (!p) return el('span', { class: 'pl-c pl-vacio', role: 'cell' }, '—');
      if (e.campo === 'player.ranked') {
        return el('span', { class: 'pl-c pl-lp', role: 'cell', title: p.texto },
          el('span', { class: 'lp-barra', style: { '--v': String((p.valor ?? 0) / maxLp) } }),
          el('b', {}, `${conSigno(p.valor ?? 0)}`), el('small', {}, 'LP'));
      }
      return el('span', { class: `pl-c pl-eje ${p.signo === '-' ? 'neg' : 'pos'}`, role: 'cell', title: p.texto },
        flechas(p.signo, p.magnitud), p.valor != null ? el('b', {}, conSigno(p.valor)) : null);
    });
    const r = RIESGOS[o.riesgo] ?? ['incierto', o.riesgo];
    const riesgo = el('span', { class: 'pl-c pl-riesgo', role: 'cell', 'data-riesgo': o.riesgo, title: o.riesgoTexto ?? '' },
      el('span', { class: 'riesgo-nombre' }, icono(r[0], 'ico ico-chico'), r[1]),
      typeof o.riesgoCasa === 'number' ? el('span', { class: 'medidor', title: 'riesgo en casa en el año' },
        el('span', { class: 'medidor-barra', style: { '--v': String(o.riesgoCasa / 100) } }), el('small', {}, `casa ${entero(o.riesgoCasa)}%`)) : null,
      o.semanaDeuda ? el('small', { class: 'deuda' }, icono('sueno', 'ico ico-micro'), `deuda sem. ${o.semanaDeuda}`) : null);
    return el('button', {
      class: 'pl-fila opcion', type: 'button', role: 'row', style: { '--cols': cols }, 'data-atajo': String(i + 1),
      'aria-describedby': `desc-${m.seed}-${i + 1}`, onmouseenter: () => insp.mostrar(i), onfocus: () => insp.mostrar(i),
    },
    el('span', { class: 'pl-c pl-plan', role: 'cell' }, el('kbd', { class: 'atajo' }, String(i + 1)),
      el('span', { class: 'opcion-label' }, o.label),
      el('span', { class: 'pl-tags' },
        o.rareza && o.rareza !== 'comun' ? el('span', { class: 'tag tag-rara' }, icono('rareza', 'ico ico-micro'), o.rareza) : null,
        o.propuesta ? el('span', { class: 'tag tag-perfil' }, icono('vos', 'ico ico-micro'), 'tu perfil') : null)),
    ...celdas, riesgo, el('span', { class: 'destello', 'aria-hidden': 'true' }));
  });

  const tabla = el('div', { class: 'planilla', role: 'table', 'aria-label': 'Las opciones del plan, comparadas' }, cab, ...filas);
  const hilo = el('div', { class: 'hilo hilo-plan', 'aria-live': 'polite' });
  const pie = el('div', { class: 'parada-pila pila-plan' }, insp.caja, hilo);
  const nodo = el('div', { class: 'parada' }, cabecera(m, { kicker: kickerPlan(m) }), tabla, pie, ocultas);

  function elegir(n, op, res, widget, notis) {
    nodo.dataset.elegido = String(n);
    filas.forEach((f, i) => { if (i === n - 1) f.setAttribute('aria-pressed', 'true'); else f.setAttribute('data-apagada', 'si'); });
    const fila = filas[n - 1];
    anim(fila.querySelector('.destello'), [{ opacity: 1 }, { opacity: 0 }], { duration: 420 });
    anim(fila, [{ transform: 'scale(0.985)' }, { transform: 'scale(1.006)', offset: 0.5 }, { transform: 'none' }], { duration: 260 });
    filas.forEach((f, i) => i !== n - 1 && anim(f, [{ opacity: 1 }, { opacity: 0.4 }], { delay: 80, duration: 260 }));
    anim(insp.caja, [{ opacity: 1, visibility: 'visible' }, { opacity: 0, visibility: 'visible' }], { delay: 60, duration: 200 });
    const t = respuesta(op, res, hilo, { primerRetardo: 300, mia: false });
    widget.aplicar(res?.inmediato?.cambios ?? [], 1150);
    toast(notis, res, op, 1450);
    t.seguir.focus({ preventScroll: true });
  }
  return { nodo, elegir };
}

function kickerPlan(m) {
  const fr = m.franja;
  return [el('span', { class: 'cat', style: { '--cat': 'var(--accent)' } }, 'Plan del año'), el('span', { class: 'kicker-cuando' }, `${fr.cuando.texto} · ${fr.club.fase ?? fr.club.org ?? ''}`)];
}

// ---------- lo último que pasó: el relato del split como notificaciones ----------
function feed(m) {
  const beats = (m.pagina?.beats ?? []).slice().reverse();
  const antes = m.antes?.log;
  const lista = el('div', { class: 'notis-lista' });
  if (antes) {
    const [appN, ic] = appDeLog(antes.type);
    lista.append(notificacion({ app: `${appN} · lo último que pasó`, icon: ic, titulo: antes.titulo ?? null, texto: antes.cuerpo ?? antes.message, meta: antes.efectos ?? null, destacada: true }));
  }
  const resto = beats.filter((b) => b.log !== antes && b.log?.message !== antes?.message).slice(0, antes ? 2 : 3);
  for (const b of resto) {
    const [appN, ic] = appDeLog(b.log.type);
    lista.append(notificacion({ app: appN, icon: ic, texto: b.log.titulo ? `${b.log.titulo}` : b.log.message, clase: b.log.tecnico ? 'noti-tecnica' : '' }));
  }
  const cartel = m.pagina?.cartel;
  const ocultos = Math.max(0, (m.pagina?.beats?.length ?? 0) - resto.length - (antes ? 1 : 0));
  return el('section', { class: 'notis', 'aria-label': 'Notificaciones' },
    el('header', { class: 'notis-cab' }, el('span', {}, cartel?.texto ?? 'Notificaciones'), ocultos ? el('span', { class: 'notis-mas' }, `+${ocultos} antes`) : null),
    lista);
}

// ---------- widgets de contexto ----------
function filaStat(campo, icon, etiqueta, valor, { max = 100, extra } = {}) {
  const odo = odometro(valor);
  const barra = el('span', { class: 'w-barra', style: { '--v': String(Math.max(0, Math.min(1, valor / max))) } });
  const fila = el('li', { class: 'w-fila', 'data-campo': campo }, icono(icon, 'ico ico-chico'), el('span', { class: 'w-et' }, etiqueta), barra, el('span', { class: 'w-num' }, odo), extra ?? null, el('span', { class: 'destello', 'aria-hidden': 'true' }));
  return fila;
}

function aplicarEn(nodo, cambios, delay, max = 100) {
  let k = 0;
  for (const c of cambios) {
    const fila = nodo.querySelector(`.w-fila[data-campo="${c.campo}"]`);
    if (!fila || typeof c.delta !== 'number' || Math.round(c.antes) === Math.round(c.despues)) continue;
    const d = delay + k * 120;
    k++;
    rodar(fila.querySelector('.odo'), c.antes, c.despues, { delay: d, duracion: 720 });
    const barra = fila.querySelector('.w-barra');
    const vNuevo = Math.max(0, Math.min(1, c.despues / max));
    const vViejo = Math.max(0, Math.min(1, c.antes / max));
    barra.style.setProperty('--v', String(vNuevo));
    anim(barra, [{ '--v': String(vViejo) }, { '--v': String(vNuevo) }], { delay: d, duration: 720, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    fila.style.setProperty('--retardo', `${d}ms`);
    fila.dataset.cambio = c.delta < 0 ? 'baja' : 'sube';
    anim(fila.querySelector('.destello'), [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }], { delay: d, duration: 1100 });
  }
}

function widgetVos(ficha, fr) {
  const j = ficha.jugador;
  const banda = ['promesa', 'titular', 'elite', 'clase_mundial'].includes(ficha.bandaNivel) ? ficha.bandaNivel : 'otro';
  const nivel = el('div', { class: 'w-heroe' },
    el('span', { class: 'w-heroe-num' }, odometro(ficha.nivel)),
    el('span', { class: 'w-heroe-lado' },
      el('span', { class: 'banda', style: { '--banda': `var(--nivel-${banda})` } }, fr.numero.bandaTexto ?? ficha.bandaNivel),
      el('span', { class: 'w-heroe-et' }, 'nivel', fr.numero.delta && fr.numero.delta !== '=' ? el('b', { class: fr.numero.delta.startsWith('▼') ? 'neg' : 'pos' }, ` ${fr.numero.delta.replace('▲', '+').replace('▼', '−')} vs. el split pasado`) : null)));
  const estados = el('ul', { class: 'w-estados' },
    estado('Jerarquía', ficha.jerarquia?.label, ficha.jerarquia?.valor),
    estado('Hype', ficha.hype?.label, ficha.hype?.valor, ficha.hype?.delta),
    estado('Cabeza', ficha.mentalidad?.label, ficha.mentalidad?.valor, ficha.mentalidad?.delta),
    estado('Arraigo', ficha.arraigo?.label, ficha.arraigo?.valor));
  const stats = el('ul', { class: 'w-stats' }, ...STATS.map(([campo, k]) => filaStat(campo, k === 'mentalidad' ? 'consistencia' : k, cortoDe(campo), j.stats[k])));
  const duelo = ficha.duelo ? el('p', { class: 'w-duelo' }, icono('teamfight', 'ico ico-chico'), `Tu duelo: ${ficha.duelo.handle} (${ficha.duelo.org})`, el('b', {}, ` ${ficha.duelo.tuyos}–${ficha.duelo.suyos}`)) : null;
  const nodo = el('section', { class: 'widget', 'data-cuarto': 'vos', 'aria-label': 'Vos' },
    el('header', { class: 'widget-cab' }, icono('vos', 'ico ico-chico'), el('span', {}, 'Vos'), el('span', { class: 'widget-sub' }, `${j.rolEtiqueta} · ${j.org ?? ''}`)),
    nivel, estados, stats, duelo);
  return { nodo, aplicar: (cambios, delay) => aplicarEn(nodo, cambios, delay) };
}

function estado(nombre, label, valor, delta) {
  return el('li', { class: 'w-estado' }, el('span', { class: 'w-estado-n' }, nombre), el('b', {}, label ?? '—'),
    valor != null ? el('span', { class: 'w-estado-v' }, entero(valor), delta ? el('i', { class: delta < 0 ? 'neg' : 'pos' }, ` ${conSigno(delta)}`) : null) : null);
}

function widgetRanked(ficha, fr) {
  const j = ficha.jugador;
  const rk = j.ranked;
  const caja = el('div', { class: 'rk-escudo' }, escudo(rk.tier));
  const tier = el('p', { class: 'rk-tier' }, j.rankedTexto?.split(' · ')[0] ?? rk.tier);
  const lpOdo = odometro(rk.lp);
  const barra = el('span', { class: 'rk-barra', style: { '--v': String(Math.min(1, rk.lp / 100)) } });
  const rango = el('div', { class: 'rk' }, caja,
    el('div', { class: 'rk-datos' }, tier, el('p', { class: 'rk-lp' }, lpOdo, el('span', {}, ' LP'), el('small', {}, ` · ${rk.servidor}`)), el('span', { class: 'rk-pista' }, barra), el('p', { class: 'rk-pie' }, '100 LP para subir de división')));
  const vitales = el('ul', { class: 'w-stats' },
    filaStat('player.studies', 'estudios', 'Estudios', j.estudios),
    filaStat('player.sleep', 'sueno', 'Sueño', j.sueno),
    filaStat('player.familyTrust', 'familia', 'Casa', j.confianzaFamiliar),
    filaStat('player.stats.mentalidad', 'consistencia', 'Consist.', j.stats.mentalidad));
  const pool = el('ul', { class: 'w-pool' }, ...(j.pool ?? []).map((p) => el('li', {}, el('span', { class: 'w-pool-n' }, p.name),
    el('span', { class: 'w-barra', style: { '--v': String(p.maestria / 100) } }), el('small', {}, `maestría ${entero(p.maestria)}`))));
  const nodo = el('section', { class: 'widget widget-ranked', 'data-cuarto': 'vos', 'aria-label': 'Ranked' },
    el('header', { class: 'widget-cab' }, icono('soloq', 'ico ico-chico'), el('span', {}, 'Ranked'), el('span', { class: 'widget-sub' }, fr.quien.texto)),
    rango, vitales, el('p', { class: 'w-sub' }, 'Tu pool'), pool);

  function aplicar(cambios, delay) {
    aplicarEn(nodo, cambios, delay + 260);
    const cr = cambios.find((c) => c.campo === 'ranked');
    const lp = cambios.find((c) => c.campo === 'player.ranked.lp');
    const div = cambios.find((c) => c.campo === 'player.ranked.division');
    if (!cr || !lp) return;
    const primera = String(cr.despues).split(' · ')[0];
    const nuevoTier = Object.keys(TIER_DE_NOMBRE).find((n) => primera.startsWith(n));
    const tierId = nuevoTier ? TIER_DE_NOMBRE[nuevoTier] : rk.tier;
    const sube = (div?.delta ?? 0) !== 0 || tierId !== rk.tier;
    // el escudo viejo se va y entra el nuevo; la barra se llena, destella y arranca de nuevo
    const viejo = escudo(rk.tier, 'escudo escudo-viejo');
    const nuevo = escudo(tierId);
    caja.replaceChildren(nuevo, viejo);
    // el nombre viejo se queda hasta que cambia el escudo; después entra el nuevo
    const tViejo = el('span', {}, tier.textContent);
    const tNuevo = el('span', {}, primera);
    tier.replaceChildren(tNuevo, tViejo);
    tier.classList.add('rk-tier-doble');
    rodar(lpOdo, lp.antes, lp.despues, { delay: delay + 420, duracion: 620 });
    const vN = Math.min(1, lp.despues / 100);
    barra.style.setProperty('--v', String(vN));
    if (sube) {
      anim(barra, [{ '--v': String(Math.min(1, lp.antes / 100)) }, { '--v': '1', offset: 0.42 }, { '--v': '0', offset: 0.43 }, { '--v': String(vN) }], { delay, duration: 1100, easing: 'cubic-bezier(0.3, 0.7, 0.2, 1)' });
      anim(viejo, [{ opacity: 1, transform: 'none' }, { opacity: 1, transform: 'scale(1.08)', offset: 0.4 }, { opacity: 0, transform: 'scale(0.6)' }], { delay, duration: 760 });
      anim(nuevo, [{ opacity: 0, transform: 'scale(1.5) rotate(-8deg)', filter: 'brightness(2.4)' }, { opacity: 1, transform: 'scale(0.94)', filter: 'brightness(1.6)', offset: 0.6 }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: delay + 420, duration: 620, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
      anim(tViejo, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], { delay: delay + 380, duration: 200 });
      anim(tNuevo, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: delay + 520, duration: 300 });
      nodo.dataset.subio = 'si';
    }
  }
  return { nodo, aplicar };
}

// En el celular el contexto es un chip
function chipContexto(fr, ficha) {
  return el('div', { class: 'chip-contexto', 'aria-hidden': 'true' },
    el('span', {}, fr.numero.texto), fr.numero.bandaTexto ? el('span', { class: 'chip-banda' }, fr.numero.bandaTexto) : null,
    fr.numero.delta && fr.numero.delta !== '=' ? el('b', {}, fr.numero.delta.replace('▲', '+').replace('▼', '−')) : null,
    el('span', { class: 'chip-sep' }, fr.cuando.texto));
}
