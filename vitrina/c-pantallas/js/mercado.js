// El mercado: la bandeja de contratos de FARO (la firma 4 de C). Cada oferta es un mail con remitente (la org, su color
// solo en su ícono), asunto (lo que buscan) y los términos como campos: sueldo, años, jerarquía proyectada y plantel.
// La prosa va al panel de lectura, de a una. Enter firma. Elegir lleva a "La prueba de ingreso"; la de LOUD (la que pasó
// de verdad) encadena a la firma: tu handle se traza como firma y la PC de la pieza pasa a ser la del equipo.
import { cargarImagen, urlSplash } from '../../comun/arte.js';
import { el, svg, anim, entero, monogramaDe } from './util.js';
import { icono, barraMenu, dock, ventana, notificacion, logoFaro } from './os.js';
import { abrirVentana } from './decision.js';

const ORG_TOKEN = {
  FURIA: 'var(--org-furia)', LOUD: 'var(--org-loud)', 'Ecos Force': 'var(--org-ecos)', 'Enclave Esports': 'var(--org-enclave)',
  'Onda Collective': 'var(--org-onda)', 'Vórtice Squad': 'var(--org-vortice)',
};
const LIGAS = { CD: 'Circuito Desafiante' };
const ENTRA = 'cubic-bezier(0.16, 1, 0.3, 1)';
const PICO = 2400;
const usd = (v) => `USD ${entero(v)}`;
const anios = (n) => `${n} ${n === 1 ? 'año' : 'años'}`;

export function pintarMercado(raiz, muestra, ctx) {
  return muestra === 'firma' ? firma(raiz, ctx) : bandeja(raiz, ctx);
}

export function orgIco(org, clase = 'org-ico') {
  return el('span', { class: clase, style: { '--org': ORG_TOKEN[org] ?? 'var(--org-otra)' }, 'aria-hidden': 'true' }, monogramaDe(org) ?? '?');
}

function quietoOno(ms) {
  const h = document.documentElement;
  return h.hasAttribute('data-reducido') || h.hasAttribute('data-inst') || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

// ======================================================================================================================
// La bandeja
// ======================================================================================================================
function bandeja(raiz, ctx) {
  const m = ctx.datos.mercado;
  const dec = m.decision;
  const ops = dec.opciones;
  const fr = m.franja;
  const porOpcion = (o) => m.previas?.porOpcion?.find((p) => p.id === o.id) ?? {};
  const sueldo = (o) => o.salarioAnualUSD ?? o.negociacion?.salarioBase ?? 0;
  const maxSueldo = Math.max(1, ...ops.map(sueldo));
  const maxAnios = Math.max(1, ...ops.map((o) => o.anios ?? 1));

  ctx.fondo({ era: ctx.era, arte: null, org: null, quieto: true });

  const barra = barraMenu({
    app: 'Contratos', doc: 'bandeja de entrada',
    tray: [el('span', { class: 'barra-quien' }, fr.quien.texto, el('b', {}, ` · ${fr.club.fase ?? fr.club.org ?? ''}`))],
    fecha: `${fr.cuando.anioEtiqueta} · ${fr.cuando.ventana?.texto ?? ''}`, pipsDe: fr.cuando.pips,
  });

  // ---------- cada oferta: un contrato en la bandeja ----------
  const filas = ops.map((o, i) => {
    const liga = LIGAS[o.liga] ?? o.liga;
    const jer = o.datos?.jerarquiaProyectada ?? 0;
    const pl = o.plantelEnLiga;
    return el('li', {}, el('button', {
      class: 'opcion contrato', type: 'button', 'data-atajo': String(i + 1), 'aria-describedby': `desc-oferta-${i + 1}`,
      onmouseenter: () => leer(i), onfocus: () => leer(i),
    },
    el('kbd', { class: 'atajo' }, String(i + 1)),
    orgIco(o.org ?? o.id),
    el('span', { class: 'contrato-de' }, el('b', {}, o.org ?? o.id),
      el('span', { class: 'liga', 'data-tier': String(o.tier ?? '') }, liga),
      o.tag === 'bombazo' ? el('span', { class: 'tag-bombazo' }, 'bombazo') : null),
    el('span', { class: 'contrato-asunto' }, o.motivoDemanda ?? ''),
    el('span', { class: 'terminos' },
      el('span', { class: 't-sueldo', title: 'Sueldo base por año, contra la oferta más alta' },
        el('span', { class: 't-barra', style: { '--v': String(sueldo(o) / maxSueldo) } }), el('b', {}, usd(sueldo(o))), el('small', {}, '/año')),
      el('span', { class: 't-anios', title: anios(o.anios ?? 1) }, el('span', { class: 'pips-anios' }, ...Array.from({ length: maxAnios }, (_, k) => el('i', { 'data-on': k < (o.anios ?? 1) ? 'si' : null }))), el('small', {}, anios(o.anios ?? 1))),
      el('span', { class: 't-jer', title: 'Jerarquía proyectada (de 100)' }, icono('nivel', 'ico ico-micro'),
        el('span', { class: 't-barra', style: { '--v': String(jer / 100) } }), el('b', {}, entero(jer)), el('small', {}, o.proyeccionJerarquia?.etiqueta ?? '')),
      pl ? el('span', { class: 't-plantel', 'data-banda': pl.banda, title: `Plantel: ${pl.puesto}º de ${pl.de} en ${pl.liga}` }, icono('equipo', 'ico ico-micro'), el('b', {}, `${pl.puesto}º`), el('small', {}, `de ${pl.de}`)) : null),
    el('span', { class: 'destello', 'aria-hidden': 'true' })));
  });
  const lista = el('ol', { class: 'contratos', 'aria-label': `${ops.length} ofertas` }, ...filas);
  const cabCols = el('div', { class: 'contratos-cab', 'aria-hidden': 'true' },
    el('span', {}, 'Sueldo'), el('span', {}, 'Años'), el('span', {}, 'Jerarquía'), el('span', {}, 'Plantel'));

  // ---------- el panel de lectura: la prosa de UNA oferta ----------
  const prosa = (o) => [
    el('p', { class: 'lect-desc' }, o.descripcion ?? ''),
    porOpcion(o).riesgo ? el('p', { class: 'lect-riesgo' }, icono('peligro', 'ico ico-chico'), porOpcion(o).riesgo) : null,
    o.negociacionInfo?.riesgoTexto ? el('p', { class: 'lect-linea' }, icono('chat', 'ico ico-chico'), o.negociacionInfo.riesgoTexto) : null,
    o.proyeccionPicks ? el('p', { class: 'lect-linea' }, icono('shotcalling', 'ico ico-chico'), o.proyeccionPicks) : null,
    o.arraigoInicial?.etiqueta ? el('p', { class: 'lect-linea' }, icono('arraigo', 'ico ico-chico'), o.arraigoInicial.etiqueta) : null,
    o.costeArraigo?.etiqueta ? el('p', { class: 'lect-linea' }, icono('flecha', 'ico ico-chico'), o.costeArraigo.etiqueta) : null,
  ].filter(Boolean);
  const campo = (et, valor, extra) => el('div', { class: 'lect-campo' }, el('dt', {}, et), el('dd', {}, valor, extra ? el('small', {}, extra) : null));
  const lectura = el('section', { class: 'lectura', 'aria-live': 'polite', 'aria-label': 'Panel de lectura' });
  const firmar = el('button', { class: 'boton-pri firmar', type: 'button', onclick: () => elegir(sel + 1) }, 'Firmar', el('kbd', {}, 'Enter'));
  let sel = 0;
  let elegida = 0;
  function leer(i) {
    const o = ops[i];
    if (!o || elegida) return;
    sel = i;
    const pj = o.proyeccionJerarquia;
    const pl = o.plantelEnLiga;
    lectura.replaceChildren(
      el('header', { class: 'lect-cab' }, orgIco(o.org ?? o.id, 'org-ico org-ico-grande'),
        el('div', {}, el('p', { class: 'lect-org' }, o.org ?? o.id), el('p', { class: 'lect-liga' }, `${LIGAS[o.liga] ?? o.liga} · tier ${o.tier ?? '—'} · ${o.datos?.tipo ?? ''}`))),
      el('p', { class: 'lect-asunto' }, el('span', {}, 'Asunto'), o.motivoDemanda ?? ''),
      el('dl', { class: 'lect-campos' },
        campo('Sueldo base', usd(sueldo(o)), 'por año'),
        campo('Duración', anios(o.anios ?? 1), o.negociacion?.clausula || o.datos?.clausula ? 'con cláusula' : 'sin cláusula'),
        campo('Jerarquía proyectada', `${entero(o.datos?.jerarquiaProyectada ?? 0)}/100`, pj ? `${pj.etiqueta} · ${entero(pj.desde)} → ${entero(pj.hasta)}` : null),
        pl ? campo('Plantel', `${pl.puesto}º de ${pl.de}`, `en ${LIGAS[pl.liga] ?? pl.liga} · fuerza ${entero(pl.fuerza)}`) : null,
        o.arraigoInicial ? campo('Arraigo', `arrancás en ${entero(o.arraigoInicial.valor)}/100`, o.costeArraigo ? `dejás ${entero(o.costeArraigo.pierde)}` : null) : null),
      el('div', { class: 'lect-prosa' }, ...prosa(o)),
      el('footer', { class: 'lect-pie' }, firmar, el('small', {}, `o ${i + 1} para firmar esta`)));
    lista.querySelectorAll('.contrato').forEach((b, j) => b.toggleAttribute('data-leida', j === i));
  }
  const ocultas = el('div', { class: 'sr' }, ...ops.map((o, i) => el('div', { id: `desc-oferta-${i + 1}` }, ...prosa(o))));

  // ---------- la cabecera de la parada ----------
  const id = 'planteo-mercado';
  const planteo = el('p', { class: 'parada-planteo', id }, el('span', { class: 'planteo-texto' }, dec.descripcion ?? ''));
  const mas = el('button', { class: 'mas', type: 'button', 'aria-expanded': 'false', 'aria-controls': id, onclick: () => {
    const a = planteo.toggleAttribute('data-abierto');
    mas.setAttribute('aria-expanded', String(a));
    mas.textContent = a ? 'menos' : 'más';
  } }, 'más');
  const cab = el('div', { class: 'parada-cab', 'data-foco': '', tabindex: '-1' },
    el('p', { class: 'parada-kicker' }, el('span', { class: 'cat', style: { '--cat': 'var(--cat-mercado)' } }, 'Mercado'),
      el('span', {}, fr.club.fase ?? ''), el('span', { class: 'kicker-cuando' }, fr.cuando.texto),
      el('span', { class: 'kicker-n' }, `${ops.length} sin leer`)),
    el('h1', { class: 'parada-titulo' }, dec.titulo), el('div', { class: 'planteo-fila' }, planteo, mas));

  const bandejaNodo = el('div', { class: 'bandeja' }, el('div', { class: 'bandeja-lista' }, cab, cabCols, lista, ocultas), lectura);
  const win = ventana({ app: 'Contratos', icon: 'cronica', titulo: 'bandeja de entrada', clase: 'ventana-bandeja', cuerpo: [bandejaNodo], pieza: 'decision', etiqueta: dec.titulo });

  // ---------- el mundo se mueve: tu valor, los asientos abiertos y los traspasos ----------
  const md = m.mercadoDelMundo ?? {};
  const vos = m.vosEnElMercado ?? {};
  const mundo = el('section', { class: 'widget widget-mundo', 'aria-label': 'El mercado' },
    el('header', { class: 'widget-cab' }, icono('mundo', 'ico ico-chico'), el('span', {}, 'El mercado'), el('span', { class: 'widget-sub' }, fr.cuando.texto)),
    el('div', { class: 'mundo-valor' }, el('span', {}, 'Lo que valés hoy'), el('b', {}, usd(vos.valorUSD ?? 0)), el('small', {}, vos.sueldoUSD ? `cobrás ${usd(vos.sueldoUSD)}` : 'sin contrato')),
    md.asientosAbiertos?.length ? el('div', { class: 'mundo-asientos' }, el('p', { class: 'w-sub' }, 'Asientos abiertos en tu rol'),
      el('ul', {}, ...md.asientosAbiertos.map((a) => el('li', {}, orgIco(a.org, 'org-ico org-ico-chico'), el('b', {}, a.org), el('small', {}, LIGAS[a.liga] ?? a.liga))))) : null);
  const traspasos = el('section', { class: 'notis notis-mundo', 'aria-label': 'Se mueve el mundo' },
    el('header', { class: 'notis-cab' }, el('span', {}, 'Se mueve el mundo'), el('span', { class: 'notis-n' }, String(md.traspasosMundo?.length ?? 0))),
    el('div', { class: 'notis-lista' }, ...(md.traspasosMundo ?? []).slice(0, 4).map((t, i) => notificacion({
      app: `${t.org} · ${t.liga}`, icon: 'equipo', texto: t.motivo, hora: i === 0 ? 'ahora' : 'recién', destacada: i === 0,
    }))));
  const lateral = el('aside', { class: 'lateral lateral-mercado', 'aria-label': 'Contexto' }, mundo, traspasos);

  const area = el('main', { class: 'area area-mercado' }, win, lateral);
  const escritorio = el('div', { class: 'escritorio', 'data-pantalla-c': 'mercado' }, barra, area, dock(m.acompanante?.cuarto ?? 'mundo', { abierto: m.acompanante?.cuarto ?? 'mundo' }));
  raiz.append(escritorio);
  leer(0);

  // entrada: llega el correo (las filas entran de a una, como mails nuevos)
  anim(barra, [{ transform: 'translateY(-100%)' }, { transform: 'none' }], { duration: 280, easing: ENTRA });
  abrirVentana(win, 120);
  filas.forEach((f, i) => anim(f, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { delay: 420 + i * 70, duration: 280, easing: ENTRA }));
  anim(lectura, [{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'none' }], { delay: 520, duration: 320, easing: ENTRA });
  lateral.querySelectorAll('.widget, .noti').forEach((n, i) => anim(n, [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], { delay: 300 + i * 80, duration: 340, easing: ENTRA }));

  // ---------- elegir: firmar la oferta lleva a la prueba de ingreso ----------
  function elegir(n) {
    const o = ops[n - 1];
    if (!o || elegida) return;
    leer(n - 1);
    elegida = n;
    for (const a of raiz.getAnimations({ subtree: true })) if (a.effect?.getTiming().iterations !== Infinity) a.finish();
    const r = m.resultados?.find((x) => x.opcionId === o.id);
    const delBot = m.resultados?.find((x) => x.eligioElBot);
    const sigue = r?.inmediato?.encadenaOtraParada?.titulo ?? 'La prueba de ingreso';
    ctx.amb?.pulso('elegir');
    bandejaNodo.dataset.elegida = String(n);
    const fila = filas[n - 1].querySelector('.contrato');
    fila.setAttribute('aria-pressed', 'true');
    anim(fila.querySelector('.destello'), [{ opacity: 1 }, { opacity: 0 }], { duration: 420 });
    filas.forEach((f, i) => { if (i === n - 1) return; f.querySelector('.contrato').setAttribute('aria-disabled', 'true'); anim(f, [{ opacity: 1 }, { opacity: 0.38 }], { delay: 60, duration: 260 }); });
    // el contrato aceptado se va como mail enviado y llega la respuesta: la próxima parada
    const esElReal = r?.eligioElBot;
    const verFirma = el('button', { class: esElReal ? 'boton-pri' : 'boton-sec', type: 'button', onclick: () => window.vitrina?.muestra('firma') },
      esElReal ? 'Ver cómo salió' : `Ver la de ${delBot?.opcionId ?? ''}`, esElReal ? el('kbd', {}, 'Enter') : icono('flecha', 'ico ico-chico'));
    const respuesta = el('div', { class: 'respuesta-mercado' },
      el('p', { class: 'resp-enviado' }, icono('check', 'ico ico-chico'), `Aceptaste: ${o.label}`),
      el('div', { class: 'resp-carta' },
        el('p', { class: 'resp-k' }, icono('flecha', 'ico ico-chico'), 'Siguiente parada'),
        el('p', { class: 'resp-titulo' }, sigue),
        el('p', { class: 'resp-org' }, 'en ', el('b', {}, o.org ?? o.id), orgIco(o.org ?? o.id, 'org-ico org-ico-chico')),
        el('p', { class: 'resp-nota' }, esElReal ? 'Es la que se eligió en esta carrera: la prueba ya se jugó.' : `Cómo sale esta prueba no está en esta carrera: acá se eligió ${delBot?.label ?? ''}.`),
        verFirma));
    lectura.replaceChildren(respuesta);
    anim(respuesta.querySelector('.resp-enviado'), [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: 80, duration: 240, easing: ENTRA });
    anim(respuesta.querySelector('.resp-carta'), [{ opacity: 0, transform: 'translateY(16px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { delay: 360, duration: 340, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1.06)' });
    setTimeout(() => verFirma.focus({ preventScroll: true }), quietoOno(500));
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key) && lista.querySelector(`.contrato[data-atajo="${e.key}"]`)) { e.preventDefault(); elegir(Number(e.key)); }
    else if (e.key === 'Enter' && !elegida && !(e.target instanceof HTMLButtonElement && !e.target.classList.contains('contrato'))) { e.preventDefault(); elegir(sel + 1); }
    else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegida) {
      const bs = [...lista.querySelectorAll('.contrato')];
      const i = bs.indexOf(document.activeElement);
      bs[i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus();
      e.preventDefault();
    }
  }
  document.addEventListener('keydown', tecla);
  lista.addEventListener('click', (e) => { const b = e.target.closest('.contrato[data-atajo]'); if (b) elegir(Number(b.dataset.atajo)); });
  return { elegir, destruir: () => document.removeEventListener('keydown', tecla) };
}

// ======================================================================================================================
// La firma: un momento (<= 2,4 s, salteable, Repetir lo vuelve a pasar)
// ======================================================================================================================
function documento(f, handle, { animar = false } = {}) {
  const c = f.contrato ?? {};
  const trazo = svg('text', { class: 'firma-trazo', x: '14', y: '78' }, handle);
  const rubrica = svg('path', { class: 'firma-rubrica', d: 'M18 96 C 120 84, 220 104, 300 88 S 380 70, 404 84', pathLength: '1' });
  const firmaSvg = svg('svg', { class: 'firma-svg', viewBox: '0 0 420 120', role: 'img', 'aria-label': `Firma: ${handle}` }, trazo, rubrica);
  const nodo = ventana({
    app: 'Contratos', icon: 'cronica', titulo: `contrato-${String(f.org).toLowerCase()}-${f.anio}.pdf`, clase: 'ventana-contrato', pieza: 'mercado', etiqueta: 'El contrato',
    cuerpo: [el('div', { class: 'doc' },
      el('header', { class: 'doc-cab' }, orgIco(f.org, 'org-ico org-ico-grande'),
        el('div', {}, el('p', { class: 'doc-k' }, 'Contrato profesional'), el('p', { class: 'doc-org' }, `${f.org} · ${LIGAS[f.liga] ?? f.liga}`), el('p', { class: 'doc-sub' }, `tier ${f.tier} · ${f.tipoDeContrato ?? c.tipo ?? ''}`))),
      el('dl', { class: 'doc-campos' },
        el('div', {}, el('dt', {}, 'Jugador'), el('dd', {}, handle, el('small', {}, ` · ${f.edad ?? c.firmadoAEdad} años`))),
        el('div', {}, el('dt', {}, 'Duración'), el('dd', {}, anios(f.anios ?? c.anios ?? 1))),
        el('div', {}, el('dt', {}, 'Sueldo'), el('dd', {}, usd(f.sueldoAnualUSD ?? c.salarioAnualUSD ?? 0), el('small', {}, ' / año'))),
        el('div', {}, el('dt', {}, 'Cláusula'), el('dd', {}, c.clausula ? 'sí' : 'no'))),
      f.log?.message ? el('p', { class: 'doc-log' }, f.log.message) : null,
      el('div', { class: 'doc-firma' }, firmaSvg, el('p', { class: 'doc-linea' }, el('span', {}, 'Firma del jugador'), el('span', {}, `${f.anio ?? c.firmadoEnAnio}`))))],
  });
  return { nodo, trazo, rubrica, firmaSvg };
}

function firma(raiz, ctx) {
  const f = ctx.datos.firma;
  const fr = f.franja;
  const handle = ctx.peor ? ctx.peor.handle : fr.quien.handle;
  const meta = ctx.meta;
  const main = ctx.mainDelHeroe();
  ctx.fondo({ era: ctx.era, arte: null, org: f.org, quieto: true });

  // después: la PC del equipo (FARO de la era, clara), con el contrato firmado y el mercado que se cierra
  const despuesDoc = documento(f, handle);
  const notis = el('section', { class: 'notis notis-firma', 'aria-label': 'El mercado se cierra' },
    el('header', { class: 'notis-cab' }, el('span', {}, 'El mercado se cierra'), el('span', { class: 'notis-n' }, String((f.logsDelMercado ?? []).length))),
    el('div', { class: 'notis-lista' }, ...(f.logsDelMercado ?? []).slice(1).map((l, i) => notificacion({ app: 'Mercado', icon: i === 0 ? 'check' : 'equipo', texto: l.message, destacada: i === 0, hora: i === 0 ? 'ahora' : 'recién' }))));
  const barraDespues = barraMenu({ app: 'Contratos', doc: despuesDoc.nodo.querySelector('.ventana-doc')?.textContent, tray: [el('span', { class: 'barra-quien' }, fr.quien.texto, el('b', {}, ` · ${f.org}`))], fecha: `${fr.cuando.anioEtiqueta} · ${fr.cuando.ventana?.texto ?? ''}`, pipsDe: fr.cuando.pips });
  const despues = el('div', { class: 'escritorio firma-despues', 'data-pantalla-c': 'firma' }, barraDespues,
    el('main', { class: 'area area-firma' }, despuesDoc.nodo, notis), dock('carrera', { abierto: 'carrera' }));

  // antes: la PC de la pieza (FARO 26, oscura, el splash de tu main de papel de pared) con el contrato a firmar
  const antesDoc = documento(f, handle, { animar: true });
  const pared = el('div', { class: 'firma-pared', 'aria-hidden': 'true' });
  cargarImagen(urlSplash(main, meta)).then((img) => { if (img) pared.append(Object.assign(img.cloneNode(), { alt: '' })); });
  const antes = el('div', { class: 'firma-antes', 'data-era': 'pieza', 'aria-hidden': 'true' }, pared,
    el('div', { class: 'escritorio' }, barraMenu({ app: 'Contratos', doc: 'firmando…', tray: [el('span', { class: 'barra-quien' }, fr.quien.texto)], fecha: `${fr.cuando.anioEtiqueta}` }),
      el('main', { class: 'area area-firma' }, antesDoc.nodo), dock('vos')));

  const aviso = notificacion({ app: 'Sistema', icon: 'check', titulo: 'Contrato firmado', texto: `${f.org} · ${f.liga} · ${anios(f.anios ?? 1)} · ${usd(f.sueldoAnualUSD ?? 0)}`, clase: 'noti-sistema noti-firmado', destacada: true, hora: 'ahora' });
  const saltar = el('button', { class: 'stream-boton firma-saltar', type: 'button', onclick: () => terminar() }, 'Saltar', el('kbd', {}, 'Esc'));
  const escena = el('div', { class: 'firma', 'data-pieza': 'mercado' }, despues, antes, aviso, saltar);
  raiz.append(escena);

  // la firma se dibuja: el trazo de cada letra con la mano que va de izquierda a derecha, después la tinta
  // la mano va de izquierda a derecha (un recorte que se abre) mientras cada letra se traza
  anim(antesDoc.firmaSvg, [{ clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)' }], { delay: 140, duration: 1000, easing: 'cubic-bezier(0.4, 0.1, 0.5, 1)' });
  anim(antesDoc.trazo, [{ strokeDashoffset: '420', fillOpacity: 0 }, { strokeDashoffset: '0', fillOpacity: 0, offset: 0.78 }, { strokeDashoffset: '0', fillOpacity: 1 }], { delay: 140, duration: 1060, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' });
  anim(antesDoc.rubrica, [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }], { delay: 880, duration: 300, easing: 'cubic-bezier(0.5, 0, 0.2, 1)' });
  // el sistema confirma
  anim(aviso, [{ transform: 'translateX(112%)', opacity: 0, visibility: 'visible' }, { transform: 'translateX(-6px)', opacity: 1, visibility: 'visible', offset: 0.75 }, { transform: 'none', opacity: 1, visibility: 'visible' }], { delay: 1080, duration: 380, easing: ENTRA });
  // el escritorio cambia: la PC de la pieza se cierra en la lámpara y queda la del equipo
  anim(antes, [
    { clipPath: 'circle(180% at 28px 15px)', visibility: 'visible', filter: 'none', easing: 'cubic-bezier(0.7, 0, 0.35, 1)' },
    { clipPath: 'circle(0% at 28px 15px)', visibility: 'visible', filter: 'brightness(1.8)' },
  ], { delay: 1300, duration: 620 });
  anim(antes, [{ visibility: 'visible' }, { visibility: 'visible' }], { duration: 1300 });
  anim(barraDespues, [{ transform: 'translateY(-100%)' }, { transform: 'none' }], { delay: 1600, duration: 280, easing: ENTRA });
  abrirVentana(despuesDoc.nodo, 1560);
  notis.querySelectorAll('.noti').forEach((n, i) => anim(n, [{ transform: 'translateX(112%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: 1760 + i * 90, duration: 300, easing: ENTRA }));
  saltar.style.opacity = '0';
  anim(saltar, [{ opacity: 1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { duration: PICO });

  function terminar() { for (const a of escena.getAnimations({ subtree: true })) if (a.effect?.getTiming().iterations !== Infinity) a.finish(); }
  const tecla = (e) => { if (e.key === 'Escape') terminar(); };
  document.addEventListener('keydown', tecla);
  return { destruir: () => document.removeEventListener('keydown', tecla) };
}
