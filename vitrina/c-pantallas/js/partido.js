// El partido. La serie Bo5 con Fearless es un champ select en la ventana "Cliente" de FARO: tu equipo y el rival a los
// costados con los 5 mapas como ranuras, tus libres como retratos de carga (apuntar = hover-pick), los quemados como
// baneados, y los planes como opciones (5 barritas por mapa + el % de la serie). Elegir juega la serie mapa a mapa con su
// post-game (VICTORIA/DERROTA con un emblema propio). El replan es la misma ventana interrumpida por "te leyeron".
// El Swiss es Tribuna, el stream: VIDA O MUERTE, el chat nervioso y una eliminación que se dibuja con dignidad.
// Todo el movimiento es WAAPI creado de una sola vez: congelar(ms) muestra cualquier instante.
import { cargarImagen, urlSplash, urlCarga, urlCentrada, urlIcono } from '../../comun/arte.js';
import { crearAzar } from '../../comun/azar.js';
import { el, svg, anim, bucle, odometro, rodar, entero } from './util.js';
import { icono, barraMenu, dock, ventana, notificacion, logoFaro, bateria, senal, cortoDe, glifoDe } from './os.js';
import { vistaPick, fichaDe, clave } from './campeones.js';
import { abrirVentana } from './decision.js';

const RONDAS = { final: 'La final', semis: 'Semifinal', semifinal: 'Semifinal', cuartos: 'Cuartos de final' };
const MAPA = 980;        // lo que dura cada mapa al jugar la serie (ms)
const CHARLA = 760;      // la charla del coach entre mapas
const pct = (p) => `${Math.round(p * 100)}%`;
const ENTRA = 'cubic-bezier(0.16, 1, 0.3, 1)';

export function pintarPartido(raiz, muestra, ctx) {
  return muestra === 'swiss' ? swiss(raiz, ctx) : draft(raiz, ctx, muestra === 'serieReplan');
}

// el emblema del post-game: propio (la lámpara de FARO dentro de un escudo de pantalla), nunca el de Riot
export function emblema(gano) {
  return svg('svg', { class: `emblema ${gano ? 'gano' : 'perdio'}`, viewBox: '0 0 120 120', 'aria-hidden': 'true' },
    svg('path', { class: 'em-marco', d: 'M60 6 L108 30 L108 74 Q108 100 60 116 Q12 100 12 74 L12 30 Z' }),
    svg('path', { class: 'em-interior', d: 'M60 18 L97 37 L97 72 Q97 92 60 104 Q23 92 23 72 L23 37 Z' }),
    svg('path', { class: 'em-haz', d: gano ? 'M54 56 L96 40 L96 80 L54 64 Z' : 'M54 58 L84 54 L84 66 L54 62 Z' }),
    svg('circle', { class: 'em-lampara', cx: '44', cy: '60', r: gano ? '10' : '8' }));
}

function terminar(raiz) {
  for (const a of raiz.getAnimations({ subtree: true })) if (a.effect?.getTiming().iterations !== Infinity) a.finish();
}

// una capa que existe solo en una ventana de tiempo (su estado natural es oculta)
function ventanaDeTiempo(nodo, desde, dura, { entra = 0.12, sale = 0.9 } = {}) {
  return anim(nodo, [
    { opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: entra },
    { opacity: 1, visibility: 'visible', offset: sale }, { opacity: 0, visibility: 'visible' },
  ], { delay: desde, duration: dura });
}

function imagenEn(nodo, url, { clase, alt = '' } = {}) {
  return cargarImagen(url).then((img) => {
    if (!img) return;
    const c = img.cloneNode();
    c.alt = alt;
    if (clase) c.className = clase;
    nodo.prepend(c);
  });
}

// ======================================================================================================================
// La serie: el draft
// ======================================================================================================================
function draft(raiz, ctx, replan) {
  const m = ctx.datos[replan ? 'serieReplan' : 'serie'];
  const dec = m.decision;
  const ops = dec.opciones;
  const pg = m.previas.general;
  const se = m.serieEnCurso ?? m.acompanante?.datos?.serie ?? {};
  const formato = se.formato ?? 5;
  const fr = m.franja;
  const ficha = m.ficha;
  const jug = ficha.jugador;
  const liga = jug.liga ?? 'CBLOL';
  const ronda = RONDAS[se.ronda] ?? se.ronda ?? '';
  const nos = pg.propio?.nombre ?? fr.club.org;
  const ellos = pg.rival?.nombre ?? se.rival?.org;
  const libres = (m.acompanante?.datos?.libres ?? []).map(clave);
  const quemados0 = (m.quemadosAlParar ?? []).map(clave);
  // los mapas que ya se jugaron (el replan llega 1-1): el pick rival sale del log estructurado de cada mapa
  const beats = (m.pagina?.beats ?? []).map((b) => b.log).filter((l) => l?.mapa);
  const jugados = (se.mapas ?? []).map((mp) => ({ ...mp, rivalJuega: [...beats].reverse().find((l) => l.mapa === mp.mapa && l.campeon === mp.campeon)?.rivalJuega ?? null }));
  const offset = jugados.length;
  const leido = replan ? clave(se.rivalJuega) : null;
  const intencionRival = clave(pg.rival?.campeon);
  const pickInicial = clave(pg.desglose?.campeon ?? libres[0]);
  const meta = ctx.meta;

  ctx.fondo({ era: ctx.era, arte: clave(jug.campeonDelSplit) || ctx.mainDelHeroe(), org: fr.club.org, quieto: true });

  // ---------- la barra y la bandeja ----------
  const tray = [
    el('span', { class: 'barra-quien' }, fr.quien.texto, el('b', {}, ` · ${fr.club.org}`)),
    bateria(ficha.mentalidad?.valor ?? jug.stats.mentalidad, 'Cabeza'), senal(ficha.jerarquia?.valor ?? jug.jerarquia, 'Jerarquía'),
  ];
  const doc = `${se.ronda ?? 'serie'}-${liga.toLowerCase()}-${m.anio}.draft`;
  const barra = barraMenu({ app: 'Cliente', doc, tray, fecha: `${fr.cuando.anioEtiqueta} · ${fr.cuando.ventana?.texto ?? ''}`, pipsDe: fr.cuando.pips });

  // ---------- los dos equipos: 5 ranuras, una por mapa ----------
  function columna(lado, nombre, fuerza, kicker) {
    const ranuras = Array.from({ length: formato }, (_, i) => el('li', { class: 'ranura', 'data-mapa': String(i + 1), 'data-decisivo': i === formato - 1 ? 'si' : null },
      el('span', { class: 'ranura-n' }, `Mapa ${i + 1}`, i === formato - 1 ? el('small', {}, 'el decisivo') : null),
      el('span', { class: 'ranura-cuerpo' }, el('span', { class: 'ranura-espera' }))));
    const nodo = el('section', { class: `equipo equipo-${lado}`, 'aria-label': nombre },
      el('header', { class: 'eq-cab' }, el('p', { class: 'eq-kicker' }, kicker),
        el('p', { class: 'eq-nombre' }, nombre), el('p', { class: 'eq-fuerza' }, el('b', {}, fuerza), el('span', {}, 'fuerza'))),
      el('ol', { class: 'ranuras' }, ...ranuras));
    return { nodo, ranuras };
  }
  const colNos = columna('nos', nos, pg.propio?.texto ?? '', 'Tu equipo');
  const colEllos = columna('ellos', ellos, pg.rival?.texto ?? '', 'Rival');
  colEllos.nodo.querySelector('.eq-fuerza').append(el('small', {}, `vs ${pg.propio?.texto ?? ''} tuyo`));

  // un pick en una ranura: el arte centrado del campeón, su nombre y el resultado del mapa
  function pickEn(ranura, k, { res, sub, intencion = false } = {}) {
    const arte = el('span', { class: 'ranura-arte' });
    imagenEn(arte, urlCentrada(k, meta));
    const nodo = el('span', { class: 'ranura-pick', 'data-intencion': intencion ? 'si' : null },
      arte, el('span', { class: 'ranura-txt' }, el('b', {}, fichaDe(ctx.datos, k).nombre), sub ? el('small', {}, sub) : null),
      res ? el('span', { class: 'ranura-res', 'data-res': res }, res === 'W' ? 'V' : 'D') : null);
    ranura.querySelector('.ranura-cuerpo').append(nodo);
    return nodo;
  }
  jugados.forEach((mp) => {
    const i = mp.mapa - 1;
    colNos.ranuras[i].dataset.jugado = 'si';
    colEllos.ranuras[i].dataset.jugado = 'si';
    pickEn(colNos.ranuras[i], clave(mp.campeon), { res: mp.resultado, sub: mp.marcador });
    if (mp.rivalJuega) pickEn(colEllos.ranuras[i], clave(mp.rivalJuega), { res: mp.resultado === 'W' ? 'L' : 'W' });
  });
  // lo que se sabe del rival para el próximo mapa (el previo del motor trae su pick)
  if (intencionRival) pickEn(colEllos.ranuras[offset], intencionRival, { sub: 'intención', intencion: true });
  colEllos.ranuras.forEach((r, i) => { if (i > offset) r.querySelector('.ranura-espera').textContent = 'sin ver'; });

  // la p del plan apuntado en tus ranuras pendientes
  const barrasP = colNos.ranuras.map((r, i) => {
    if (i < offset) return null;
    const v = el('b', {});
    const b = el('span', { class: 'p-barra' });
    r.querySelector('.ranura-espera').append(b, v);
    return { b, v };
  });

  // ---------- el por qué: la previa del próximo mapa ----------
  const total = pg.fuerzaFinal ?? pg.filas.reduce((a, f) => a + f.valor, 0);
  const porque = el('section', { class: 'porque', 'aria-label': pg.titulo },
    el('p', { class: 'porque-k' }, pg.titulo),
    el('p', { class: 'porque-p', 'aria-label': pg.textoProbabilidad }, el('b', {}, `${pg.porcentaje}%`), el('span', {}, 'de ganar')),
    el('ul', { class: 'porque-filas' }, ...pg.filas.map((f) => el('li', { 'data-signo': f.valor < -0.5 ? 'neg' : f.valor > 0.5 ? 'pos' : 'cero' },
      el('span', {}, f.etiqueta), el('span', { class: 'porque-barra', style: { '--v': String(Math.min(1, Math.abs(f.valor) / Math.max(1, total))) } }), el('b', {}, f.texto)))),
    el('p', { class: 'porque-vs' }, el('b', {}, pg.propio?.texto ?? ''), ' vs ', el('b', {}, pg.rival?.texto ?? ''), el('span', {}, ` · ${ellos}`)));
  colNos.nodo.append(porque);

  // ---------- quemados (Fearless): los baneados de la serie ----------
  const capacidad = formato * 2;
  const tablero = el('ul', { class: 'quemados', 'aria-label': 'Quemados por Fearless' });
  const quemadoNodo = (k, { leido: esLeido = false } = {}) => {
    const li = el('li', { class: 'quemado', title: `${fichaDe(ctx.datos, k).nombre}: quemado`, 'data-leido': esLeido ? 'si' : null },
      el('span', { class: 'quemado-tacha', 'aria-hidden': 'true' }));
    imagenEn(li, urlIcono(k, meta), { alt: fichaDe(ctx.datos, k).nombre });
    return li;
  };
  quemados0.forEach((k) => tablero.append(quemadoNodo(k, { leido: k === leido })));
  const huecos = () => { tablero.querySelectorAll('.quemado-hueco').forEach((h) => h.remove()); for (let i = tablero.children.length; i < capacidad; i++) tablero.append(el('li', { class: 'quemado-hueco', 'aria-hidden': 'true' })); };
  huecos();
  colEllos.nodo.append(el('section', { class: 'tablero' },
    el('p', { class: 'porque-k' }, `Quemados · Fearless`, el('small', {}, quemados0.length ? `${quemados0.length} de ${capacidad}` : 'ninguno todavía')), tablero));

  // ---------- el escenario: el hover-pick y tus libres ----------
  const pick = vistaPick(ctx, { clase: 'escenario-pick', kicker: 'Apuntando' });
  const libresNodos = new Map();
  const libresRow = el('ul', { class: 'libres', 'aria-label': `Tus libres: ${libres.length}` }, ...libres.map((k) => {
    const f = fichaDe(ctx.datos, k);
    const arte = el('span', { class: 'libre-arte' });
    imagenEn(arte, urlCarga(k, meta));
    const b = el('button', { class: 'libre', type: 'button', title: f.nombre, onmouseenter: () => pick.apuntar(k), onfocus: () => pick.apuntar(k) },
      arte, el('span', { class: 'libre-n' }, f.nombre), el('span', { class: 'libre-quema', 'aria-hidden': 'true' }, el('i'), el('small', {}, 'quemado')));
    libresNodos.set(k, b);
    return el('li', {}, b);
  }));
  const marc = [odometro(se.marcador?.[0] ?? 0), odometro(se.marcador?.[1] ?? 0)];
  const marcador = el('p', { class: 'marcador-serie', 'aria-label': 'Marcador de la serie' }, el('span', { class: 'ms-eq' }, nos), marc[0], el('i', {}, '–'), marc[1], el('span', { class: 'ms-eq' }, ellos));
  const juego = el('div', { class: 'juego', 'aria-live': 'polite' });
  const escenario = el('div', { class: 'escenario' }, pick.nodo,
    el('div', { class: 'escenario-pie' }, el('p', { class: 'libres-k' }, 'Tus libres', el('small', {}, String(libres.length))), libresRow),
    marcador, juego);

  // ---------- la cabecera de la parada ----------
  const id = `planteo-serie-${replan ? 'r' : 's'}`;
  const planteo = el('p', { class: 'parada-planteo', id }, el('span', { class: 'planteo-texto' }, dec.descripcion ?? ''));
  const mas = el('button', { class: 'mas', type: 'button', 'aria-expanded': 'false', 'aria-controls': id, onclick: () => {
    const a = planteo.toggleAttribute('data-abierto');
    mas.setAttribute('aria-expanded', String(a));
    mas.textContent = a ? 'menos' : 'más';
  } }, 'más');
  const cab = el('div', { class: 'parada-cab', 'data-foco': '', tabindex: '-1' },
    el('p', { class: 'parada-kicker' }, el('span', { class: 'cat', style: { '--cat': 'var(--cat-equipo)' } }, `${liga} ${m.anio}`),
      el('span', {}, ronda), el('span', {}, `Bo${formato} · Fearless`), replan ? el('span', { class: 'bisagra' }, 'replan') : null),
    el('h1', { class: 'parada-titulo' }, dec.titulo), el('div', { class: 'planteo-fila' }, planteo, mas));

  // ---------- los planes: 5 barritas (la p de cada mapa) + el % de la serie ----------
  const mejor = Math.max(...ops.map((o) => o.pSerie ?? 0));
  const prosaPlan = (o, i) => [
    el('p', { class: 'insp-desc' }, o.descripcion ?? ''),
    pg.opciones?.[i]?.texto ? el('p', { class: 'insp-previa-txt' }, pg.opciones[i].texto) : null,
    pg.nota ? el('p', { class: 'insp-nota' }, pg.nota) : null,
  ];
  const insp = el('aside', { class: 'inspector', 'aria-live': 'polite' });
  function mostrar(i) {
    const o = ops[i];
    if (!o) return;
    insp.replaceChildren(el('p', { class: 'insp-cab' }, el('kbd', {}, String(i + 1)), o.label), ...prosaPlan(o, i).filter(Boolean));
    barrasP.forEach((x, j) => {
      if (!x) return;
      const p = o.pMapas?.[j - offset];
      x.b.style.setProperty('--v', String(p ?? 0));
      x.v.textContent = p != null ? pct(p) : '—';
    });
    planesNodo.querySelectorAll('.plan').forEach((b, j) => b.toggleAttribute('data-apuntado', j === i));
  }
  const planesNodo = el('ol', { class: 'planes' }, ...ops.map((o, i) => el('li', {}, el('button', {
    class: 'opcion plan', type: 'button', 'data-atajo': String(i + 1), 'aria-describedby': `desc-plan-${i + 1}`,
    onmouseenter: () => mostrar(i), onfocus: () => mostrar(i),
  },
  el('kbd', { class: 'atajo' }, String(i + 1)),
  el('span', { class: 'opcion-label' }, o.label),
  barritas(o.pMapas ?? [], offset, formato),
  el('span', { class: 'plan-serie', 'data-mejor': o.pSerie === mejor ? 'si' : null }, el('b', {}, pct(o.pSerie ?? 0)), el('small', {}, 'la serie')),
  el('span', { class: 'destello', 'aria-hidden': 'true' })))));
  const ocultas = el('div', { class: 'sr' }, ...ops.map((o, i) => el('div', { id: `desc-plan-${i + 1}` }, ...prosaPlan(o, i).filter(Boolean))));
  const saltar = el('button', { class: 'stream-boton saltar', type: 'button', onclick: () => terminar(raiz) }, 'Saltar', el('kbd', {}, 'Esc'));
  const jugando = el('div', { class: 'jugando' });
  const decide = el('div', { class: 'decide' }, planesNodo, insp, jugando);
  const centro = el('div', { class: 'draft-centro' }, cab, escenario, decide, ocultas);

  const draftNodo = el('div', { class: 'draft', 'data-replan': replan ? 'si' : null }, colNos.nodo, centro, colEllos.nodo);
  const win = ventana({ app: 'Cliente', icon: 'soloq', titulo: doc, clase: 'ventana-draft', cuerpo: [draftNodo], pieza: 'partido', etiqueta: dec.titulo });
  const area = el('main', { class: 'area area-partido' }, win);
  const escritorio = el('div', { class: 'escritorio', 'data-pantalla-c': 'partido' }, barra, area, dock(m.acompanante?.cuarto ?? 'temporada', { abierto: m.acompanante?.cuarto ?? 'temporada' }));
  raiz.append(escritorio);
  mostrar(0);
  pick.apuntar(pickInicial);

  // ---------- entrada: la ventana se abre, los equipos entran por los costados, los planes suben ----------
  anim(barra, [{ transform: 'translateY(-100%)' }, { transform: 'none' }], { duration: 260, easing: ENTRA });
  abrirVentana(win, 60);
  anim(colNos.nodo, [{ opacity: 0, transform: 'translateX(-28px)' }, { opacity: 1, transform: 'none' }], { delay: 220, duration: 360, easing: ENTRA });
  anim(colEllos.nodo, [{ opacity: 0, transform: 'translateX(28px)' }, { opacity: 1, transform: 'none' }], { delay: 220, duration: 360, easing: ENTRA });
  [...colNos.ranuras, ...colEllos.ranuras].forEach((r, i) => anim(r, [{ opacity: 0 }, { opacity: 1 }], { delay: 300 + (i % formato) * 45, duration: 220 }));
  libresRow.querySelectorAll('li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { delay: 420 + i * 45, duration: 300, easing: ENTRA }));
  const tPlanes = replan ? 1150 : 560;
  planesNodo.querySelectorAll('.plan').forEach((b, i) => anim(b, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: tPlanes + i * 60, duration: 260, easing: ENTRA }));
  anim(insp, [{ opacity: 0 }, { opacity: 1 }], { delay: tPlanes + 120, duration: 260 });

  // ---------- el replan: una notificación del sistema interrumpe y el draft vuelve con Sylas gris ----------
  if (replan) {
    const aviso = notificacion({ app: 'Serie', icon: 'peligro', titulo: dec.titulo, texto: m.antes?.mensaje ?? '', clase: 'noti-sistema noti-leido', destacada: true, hora: 'ahora' });
    area.append(aviso);
    anim(aviso, [
      { transform: 'translateX(112%)', opacity: 0, visibility: 'visible', easing: ENTRA }, { transform: 'translateX(-6px)', opacity: 1, visibility: 'visible', offset: 0.06 },
      { transform: 'none', opacity: 1, visibility: 'visible', offset: 0.1 }, { transform: 'none', opacity: 1, visibility: 'visible', offset: 0.88 },
      { transform: 'translateX(40px)', opacity: 0, visibility: 'visible' },
    ], { delay: 240, duration: 3600 });
    const selloArte = el('div', { class: 'sello-arte' });
    imagenEn(selloArte, urlSplash(leido, meta));
    const sello = el('div', { class: 'sello-leido', 'aria-hidden': 'true' }, selloArte,
      el('p', { class: 'sello-txt' }, el('b', {}, 'Quemado'), el('span', {}, `${fichaDe(ctx.datos, leido).nombre} · ${ellos} te leyó`)));
    escenario.append(sello);
    ventanaDeTiempo(sello, 200, 1900, { entra: 0.08, sale: 0.86 });
    anim(sello.querySelector('.sello-txt b'), [{ transform: 'scale(1.7) rotate(-9deg)', opacity: 0 }, { transform: 'rotate(-4deg)', opacity: 1 }], { delay: 460, duration: 280, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
    const q = tablero.querySelector('[data-leido]');
    if (q) anim(q, [{ transform: 'scale(1.5)', boxShadow: '0 0 0 3px var(--danger)' }, { transform: 'none', boxShadow: '0 0 0 2px var(--danger)' }], { delay: 520, duration: 420, easing: ENTRA });
  }

  // ---------- elegir: la serie se juega mapa a mapa ----------
  let elegida = 0;
  function elegir(n) {
    const op = ops[n - 1];
    if (!op || elegida) return;
    elegida = n;
    terminar(raiz);
    const r = m.resultados?.find((x) => x.opcionId === op.id);
    const logs = (r?.logsDeLaSerie ?? r?.inmediato?.logs ?? []);
    const primerMapa = logs.findIndex((l) => l.mapa);
    const ultimoMapa = logs.length - 1 - [...logs].reverse().findIndex((l) => l.mapa);
    draftNodo.dataset.jugando = 'si';
    ctx.amb?.pulso('elegir');
    const boton = planesNodo.querySelector(`.plan[data-atajo="${n}"]`);
    anim(boton.querySelector('.destello'), [{ opacity: 1 }, { opacity: 0 }], { duration: 380 });
    jugando.replaceChildren(el('span', { class: 'jugando-k' }, 'En juego · tu plan'), el('b', {}, op.label), el('span', { class: 'jugando-p' }, `la serie: ${pct(op.pSerie ?? 0)}`), saltar);
    anim(jugando, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: 80, duration: 260, easing: ENTRA });

    const quemados = new Set(quemados0);
    let t = 420;
    const cambiosMarcador = [[], []];
    juego.replaceChildren();
    logs.forEach((l, i) => {
      if (l.mapa) {
        jugarMapa(l, t, i === ultimoMapa);
        t += MAPA;
      } else if (i > primerMapa && i < ultimoMapa && primerMapa >= 0) {
        // la charla del coach entre mapas
        const cartel = el('div', { class: 'cartel-charla' }, icono('shotcalling', 'ico ico-chico'), el('p', {}, l.message));
        juego.append(cartel);
        ventanaDeTiempo(cartel, t, CHARLA);
        t += CHARLA;
      }
    });
    marc.forEach((odo, lado) => rodarSecuencia(odo, se.marcador?.[lado] ?? 0, cambiosMarcador[lado]));
    const final = logs[logs.length - 1];
    finalDeSerie(final?.mapa ? null : final, logs.filter((l) => l.mapa), t, r);

    function jugarMapa(l, t0, esUltimo) {
      const k = clave(l.campeon);
      const rk = clave(l.rivalJuega);
      const i = l.mapa - 1;
      const gano = l.resultado === 'W';
      // las ranuras: la p se va, entra el pick (el tuyo y el del rival, como en el champ select)
      const rn = colNos.ranuras[i];
      const re = colEllos.ranuras[i];
      [rn, re].forEach((r0) => r0.querySelectorAll('.ranura-espera, .ranura-pick[data-intencion]').forEach((x) => { x.style.opacity = '0'; anim(x, [{ opacity: 1 }, { opacity: 0 }], { delay: t0, duration: 160 }); }));
      const pn = pickEn(rn, k, { res: l.resultado, sub: l.marcador });
      const pe = pickEn(re, rk, { res: gano ? 'L' : 'W' });
      anim(pn, [{ opacity: 0, transform: 'translateX(-18px)' }, { opacity: 1, transform: 'none' }], { delay: t0, duration: 260, easing: ENTRA });
      anim(pe, [{ opacity: 0, transform: 'translateX(18px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 90, duration: 260, easing: ENTRA });
      [pn, pe].forEach((p) => anim(p.querySelector('.ranura-res'), [{ opacity: 0, transform: 'scale(1.8)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 430, duration: 220, easing: ENTRA }));
      // el escenario: tu pick contra el del rival, y el post-game
      const capa = el('div', { class: 'mapa-capa', 'data-res': l.resultado });
      const fondo = el('div', { class: 'mapa-fondo' });
      imagenEn(fondo, urlSplash(k, meta));
      const vs = el('p', { class: 'mapa-vs' }, el('span', { class: 'mapa-n' }, `Mapa ${l.mapa}`),
        el('b', {}, fichaDe(ctx.datos, k).nombre), el('i', {}, 'vs'), el('span', {}, fichaDe(ctx.datos, rk).nombre));
      const post = el('div', { class: 'postgame' }, emblema(gano),
        el('p', { class: 'pg-titulo' }, gano ? 'Victoria' : 'Derrota'),
        el('p', { class: 'pg-sub' }, el('b', {}, l.marcador), el('span', {}, `tenías ${pct(l.p)}`)));
      capa.append(fondo, vs, post);
      juego.append(capa);
      if (esUltimo) anim(capa, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: 0.12 }, { opacity: 1, visibility: 'visible' }], { delay: t0, duration: MAPA });
      else ventanaDeTiempo(capa, t0, MAPA, { entra: 0.1, sale: 0.93 });
      anim(fondo, [{ transform: 'scale(1.12)', filter: 'brightness(1.6)' }, { transform: 'scale(1.03)', filter: 'none' }], { delay: t0, duration: MAPA, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      anim(vs, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 60, duration: 240, easing: ENTRA });
      anim(post, [{ opacity: 0, transform: 'scale(1.18)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: t0 + 380, duration: 280, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
      anim(post.querySelector('.emblema'), [{ transform: 'rotate(-14deg) scale(0.6)' }, { transform: 'none' }], { delay: t0 + 380, duration: 420, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
      // el marcador de la serie (se anima entero al final, con todos sus cambios)
      const [a, b] = String(l.marcador).split('-').map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) { cambiosMarcador[0].push([t0 + 400, a]); cambiosMarcador[1].push([t0 + 400, b]); }
      // Fearless: lo que salió queda quemado para los dos
      const tq = t0 + Math.round(MAPA * 0.6);
      for (const q of [k, rk]) {
        if (!q || quemados.has(q)) continue;
        quemados.add(q);
        const nodo = quemadoNodo(q);
        // el hueco punteado queda visible hasta que el campeón cae en él
        const hueco = [...tablero.querySelectorAll('.quemado-hueco')].find((h) => !h.children.length);
        if (hueco) hueco.append(nodo); else tablero.append(nodo);
        anim(nodo, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'none' }], { delay: tq, duration: 260, easing: ENTRA });
        const lib = libresNodos.get(q);
        if (lib) {
          const marca = lib.querySelector('.libre-quema');
          const arte = lib.querySelector('.libre-arte');
          marca.style.opacity = '1';
          arte.style.filter = 'grayscale(1) brightness(0.45)';
          anim(marca, [{ opacity: 0 }, { opacity: 1 }], { delay: tq, duration: 220 });
          anim(arte, [{ filter: 'none' }, { filter: 'grayscale(1) brightness(0.45)' }], { delay: tq, duration: 220 });
        }
      }
    }
  }

  // el resultado de la serie: el marcador grande, los mapas en pips y el texto del motor
  function finalDeSerie(final, mapas, t0, r) {
    const ultimo = mapas[mapas.length - 1];
    const gano = r?.serie?.resultado?.gano ?? ultimo?.resultado === 'W';
    const todos = [...jugados, ...mapas];
    const card = el('div', { class: 'serie-final', 'data-gano': gano ? 'si' : null },
      emblema(gano),
      el('div', {},
        el('p', { class: 'sf-k' }, `${liga} ${m.anio} · ${ronda} · Bo${formato}`),
        el('p', { class: 'sf-marcador' }, ultimo?.marcador ?? ''),
        el('ol', { class: 'sf-mapas' }, ...todos.map((mp) => el('li', { 'data-res': mp.resultado, title: `Mapa ${mp.mapa}: ${mp.campeon}` }, el('span', {}, String(mp.mapa)), el('b', {}, fichaDe(ctx.datos, clave(mp.campeon)).nombre)))),
        final?.message ? el('p', { class: 'sf-texto' }, final.message) : null,
        el('button', { class: 'seguir', type: 'button', onclick: () => window.vitrina?.repetir() }, 'Seguir', icono('flecha', 'ico ico-chico'))));
    juego.append(card);
    anim(card, [{ opacity: 0, visibility: 'visible', transform: 'translateY(14px)' }, { opacity: 1, visibility: 'visible', transform: 'none' }], { delay: t0, duration: 380, easing: ENTRA });
    anim(card.querySelector('.emblema'), [{ transform: 'scale(0.4) rotate(-20deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: t0 + 80, duration: 520, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
    card.querySelectorAll('.sf-mapas li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 200 + i * 50, duration: 220 }));
    anim(saltar, [{ opacity: 1 }, { opacity: 0 }], { delay: t0, duration: 200 });
    marcador.style.opacity = '0';
    anim(marcador, [{ opacity: 1 }, { opacity: 0 }], { delay: t0, duration: 200 });
    saltar.style.opacity = '0';
    saltar.style.pointerEvents = 'none';
    setTimeout(() => card.querySelector('.seguir')?.focus({ preventScroll: true }), quietoOno(t0 + 400));
  }

  // teclado: 1-3 eligen, flechas recorren, Esc saltea
  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key) && planesNodo.querySelector(`.plan[data-atajo="${e.key}"]`)) { e.preventDefault(); elegir(Number(e.key)); }
    else if (e.key === 'Escape' && elegida) terminar(raiz);
    else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegida) {
      const bs = [...planesNodo.querySelectorAll('.plan')];
      const i = bs.indexOf(document.activeElement);
      bs[i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus();
      e.preventDefault();
    }
  }
  document.addEventListener('keydown', tecla);
  planesNodo.addEventListener('click', (e) => { const b = e.target.closest('.plan[data-atajo]'); if (b) elegir(Number(b.dataset.atajo)); });
  // el arte de la serie se precarga: al jugarla, cada mapa ya tiene su splash
  const precarga = Promise.all((m.resultados ?? []).flatMap((r) => (r.logsDeLaSerie ?? []).filter((l) => l.mapa)
    .flatMap((l) => [cargarImagen(urlSplash(clave(l.campeon), meta)), cargarImagen(urlCentrada(clave(l.campeon), meta)), cargarImagen(urlCentrada(clave(l.rivalJuega), meta))])));
  return { elegir, listo: Promise.all([pick.listo, precarga]), destruir: () => document.removeEventListener('keydown', tecla) };
}

// Un odómetro de un dígito que pasa por varios valores en el tiempo (el marcador de la serie): una sola animación
// sobre la tira, con un escalón por cada cambio. El estado natural es el último valor.
function rodarSecuencia(odo, desde, cambios, dura = 360) {
  const final = cambios.length ? cambios[cambios.length - 1][1] : desde;
  rodar(odo, final, final);
  const tira = odo.querySelector('.odo-tira');
  if (!tira || !cambios.length) return;
  const fin = cambios[cambios.length - 1][0] + dura;
  const y = (v) => `translateY(${-(v + 1)}em)`;
  const cuadros = [{ offset: 0, transform: y(desde) }];
  let antes = desde;
  for (const [t, v] of cambios) {
    if (v === antes) continue;
    cuadros.push({ offset: t / fin, transform: y(antes), easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    cuadros.push({ offset: Math.min(1, (t + dura) / fin), transform: y(v) });
    antes = v;
  }
  if (cuadros[cuadros.length - 1].offset < 1) cuadros.push({ offset: 1, transform: y(final) });
  anim(tira, cuadros, { duration: fin });
}

// con movimiento quieto (o INST) las esperas son cero
function quietoOno(ms) {
  const h = document.documentElement;
  return h.hasAttribute('data-reducido') || h.hasAttribute('data-inst') || matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

// 5 barritas: la p de cada mapa del plan (el decisivo marcado), contra la línea del 50%
function barritas(pMapas, offset, formato) {
  return el('span', { class: 'barritas', 'aria-hidden': 'true' },
    ...Array.from({ length: formato }, (_, i) => {
      const p = i >= offset ? pMapas[i - offset] : null;
      return el('span', { class: 'barrita', 'data-decisivo': i === formato - 1 ? 'si' : null, 'data-jugado': i < offset ? 'si' : null, style: { '--v': String(p ?? 0) } },
        el('small', {}, i < offset ? '·' : `M${i + 1}`));
    }));
}

// ======================================================================================================================
// El Swiss: Tribuna, el stream
// ======================================================================================================================
function swiss(raiz, ctx) {
  const m = ctx.datos.swiss;
  const dec = m.decision;
  const ops = dec.opciones;
  const pg = m.previas.general;
  const it = m.internacional ?? m.acompanante?.datos?.internacional ?? {};
  const fr = m.franja;
  const org = fr.club.org;
  const handle = ctx.peor ? ctx.peor.handle : fr.quien.handle;
  const rival = dec.datos?.rival ?? pg.rival?.nombre;
  const participante = (n) => (it.participantes ?? []).find((p) => p.nombre === n);
  const ligaRival = participante(rival)?.liga ?? '';
  const rondas = (it.swiss?.rondas ?? []).flat().filter((x) => x.propio).sort((a, b) => a.ronda - b.ronda);
  const rec = it.swiss?.record?.[org] ?? { v: 0, d: 0 };
  const camara = clave(pg.desglose?.campeon ?? m.ficha?.jugador?.campeonDelSplit) || ctx.mainDelHeroe();
  const anio = it.anio ?? m.anio;
  const meta = ctx.meta;

  ctx.fondo({ era: ctx.era, arte: camara, org, animo: 'peligro', quieto: true });

  // ---------- el player ----------
  const foto = el('div', { class: 'camara' });
  const flash = el('div', { class: 'stream-flash', 'aria-hidden': 'true' });
  const vom = el('div', { class: 'vom' }, el('p', { class: 'vom-band' }, 'Vida o muerte'),
    el('p', { class: 'vom-sub' }, el('b', { class: 'vom-rec' }, el('span', {}, `${rec.v}-${rec.d}`)), ` vs ${rival}`, ligaRival ? el('small', {}, ligaRival) : null));
  const proxima = (rondas[rondas.length - 1]?.ronda ?? 0) + 1;
  const pipNodo = (r) => {
    const gano = r.ganador === org;
    const otro = r.a === org ? r.b : r.a;
    return el('li', { 'data-res': gano ? 'W' : 'L', title: `Ronda ${r.ronda}: ${gano ? 'le ganaste a' : 'perdiste con'} ${otro} · tenías ${pct(r.p)}` },
      el('span', {}, `R${r.ronda}`), el('b', {}, gano ? 'V' : 'D'), el('small', {}, otro));
  };
  const r5 = el('li', { 'data-res': 'vivo' }, el('span', {}, `R${proxima}`), el('b', {}, '?'), el('small', {}, rival));
  const camino = el('ol', { class: 'swiss-camino', 'aria-label': `Swiss: vas ${rec.v}-${rec.d}` }, ...rondas.map(pipNodo), r5);

  // la parada como overlay del stream: el planteo, las 2 opciones y la previa
  const id = 'planteo-swiss';
  const planteo = el('p', { class: 'parada-planteo', id }, el('span', { class: 'planteo-texto' }, dec.descripcion ?? ''));
  const mas = el('button', { class: 'mas', type: 'button', 'aria-expanded': 'false', 'aria-controls': id, onclick: () => {
    const a = planteo.toggleAttribute('data-abierto');
    mas.setAttribute('aria-expanded', String(a));
    mas.textContent = a ? 'menos' : 'más';
  } }, 'más');
  const ICONOS = ['chat', 'candado'];
  const insp = el('p', { class: 'sw-insp', 'aria-live': 'polite' });
  const mostrar = (i) => { insp.textContent = ops[i]?.descripcion ?? ''; opsNodo.querySelectorAll('.opcion').forEach((b, j) => b.toggleAttribute('data-apuntado', j === i)); };
  const opsNodo = el('ol', { class: 'sw-opciones' }, ...ops.map((o, i) => el('li', {}, el('button', {
    class: 'opcion sw-opcion', type: 'button', 'data-atajo': String(i + 1), 'aria-describedby': `desc-sw-${i + 1}`,
    onmouseenter: () => mostrar(i), onfocus: () => mostrar(i),
  }, el('kbd', { class: 'atajo' }, String(i + 1)), icono(ICONOS[i] ?? 'nivel', 'ico'), el('span', { class: 'opcion-label' }, o.label), el('span', { class: 'destello', 'aria-hidden': 'true' })))));
  const ocultas = el('div', { class: 'sr' }, ...ops.map((o, i) => el('div', { id: `desc-sw-${i + 1}` }, o.descripcion ?? '')));
  const previa = el('div', { class: 'sw-previa' },
    el('p', { class: 'sw-p', 'aria-label': pg.textoProbabilidad }, el('b', {}, `${pg.porcentaje}%`), el('span', {}, 'de ganar')),
    el('span', { class: 'sw-medidor', style: { '--v': String(pg.p ?? 0) } }, el('i')),
    el('p', { class: 'sw-vs' }, el('b', {}, pg.propio?.texto ?? ''), ` ${org} vs ${rival} `, el('b', {}, pg.rival?.texto ?? '')),
    pg.nota ? el('p', { class: 'sw-nota' }, icono('chat', 'ico ico-micro'), pg.nota) : null);
  const parada = el('section', { class: 'sw-parada', 'data-pieza': 'decision', 'aria-label': dec.titulo },
    el('div', { class: 'parada-cab', 'data-foco': '', tabindex: '-1' },
      el('p', { class: 'parada-kicker' }, el('span', { class: 'cat', style: { '--cat': 'var(--accent)' } }, `Mundial ${anio}`), el('span', {}, `Swiss · ronda ${proxima} · Bo1`)),
      el('h1', { class: 'parada-titulo' }, dec.titulo), el('div', { class: 'planteo-fila' }, planteo, mas)),
    el('div', { class: 'sw-cuerpo' }, el('div', {}, opsNodo, insp), previa), ocultas);
  mostrar(0);

  const juego = el('div', { class: 'juego sw-juego', 'aria-live': 'polite' });
  const player = el('div', { class: 'player' }, foto, flash,
    el('div', { class: 'player-cab' }, el('span', { class: 'vivo' }, el('i'), 'EN VIVO'), el('span', {}, `Mundial ${anio} · Swiss`)),
    vom, camino, parada, juego);

  const chat = chatSwiss(m, { handle, org, rival, ligaRival, rec, rondas, camara: fichaDe(ctx.datos, camara).nombre }, 'antes');
  const chatPista = el('div', { class: 'chat-pista' }, chat.lista);
  const chatModo = el('span', { class: 'chat-modo' }, 'modo lento: no');
  const aside = el('aside', { class: 'chat', 'aria-label': 'Chat del stream' },
    el('header', { class: 'chat-cab' }, icono('chat', 'ico ico-chico'), 'Chat del stream', chatModo),
    chatPista, el('footer', { class: 'chat-pie' }, el('span', {}, 'Mandá un mensaje'), el('kbd', {}, 'Enter')));
  const saltar = el('button', { class: 'stream-boton', type: 'button', onclick: () => terminar(raiz) }, 'Saltar', el('kbd', {}, 'Esc'));
  saltar.hidden = true;
  const raizStream = el('div', { class: 'stream stream-swiss', 'data-pieza': 'partido' },
    el('header', { class: 'stream-barra' }, logoFaro(), el('span', { class: 'stream-app' }, 'Tribuna'),
      el('span', { class: 'stream-canal' }, `${org} vs ${rival} · Mundial ${anio}`), el('span', { class: 'stream-der' }, saltar)),
    el('div', { class: 'stream-cuerpo' }, player, aside));
  raiz.append(raizStream);

  const listo = cargarImagen(urlSplash(camara, meta)).then((img) => {
    if (!img) return;
    const c = img.cloneNode();
    c.alt = '';
    c.className = 'camara-img';
    foto.append(c);
    bucle(c, [{ transform: 'scale(1.05)' }, { transform: 'scale(1.12) translate3d(1%, 0.6%, 0)' }], { duration: 14000, direction: 'alternate', easing: 'ease-in-out' });
  });

  // entrada: corte a oscuro, la banda VIDA O MUERTE, el camino del Swiss y la parada
  anim(flash, [{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 420 });
  anim(vom.querySelector('.vom-band'), [{ opacity: 0, transform: 'scaleX(0.2)', letterSpacing: '0.6em' }, { opacity: 1, transform: 'none' }], { delay: 160, duration: 420, easing: ENTRA });
  anim(vom.querySelector('.vom-sub'), [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: 380, duration: 300, easing: ENTRA });
  camino.querySelectorAll('li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: 420 + i * 70, duration: 240, easing: ENTRA }));
  bucle(r5, [{ boxShadow: '0 0 0 1.5px var(--accent)' }, { boxShadow: '0 0 0 4px var(--accent-suave)' }], { duration: 900, direction: 'alternate', easing: 'ease-in-out' });
  anim(parada, [{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { delay: 520, duration: 380, easing: ENTRA });
  chat.animar();

  let elegida = 0;
  function elegir(n) {
    const op = ops[n - 1];
    if (!op || elegida) return;
    elegida = n;
    terminar(raiz);
    const r = m.resultados?.find((x) => x.opcionId === op.id);
    const logs = r?.inmediato?.logs ?? [];
    const partido = logs.find((l) => l.etapa === 'swiss' && l.ronda != null);
    const antes = logs.slice(0, logs.indexOf(partido)).filter((l) => !l.etapa);
    const fin = logs[logs.length - 1] !== partido ? logs[logs.length - 1] : null;
    const otro = m.resultados?.find((x) => x.opcionId !== op.id);
    const pOtro = otro?.inmediato?.logs?.find((l) => l.etapa === 'swiss' && l.ronda != null)?.p;
    const gano = partido?.resultado === 'W';
    ctx.amb?.pulso('peligro');
    saltar.hidden = false;
    player.dataset.jugando = 'si';
    const boton = opsNodo.querySelector(`.opcion[data-atajo="${n}"]`);
    anim(boton.querySelector('.destello'), [{ opacity: 1 }, { opacity: 0 }], { duration: 360 });
    anim(parada, [{ opacity: 1, visibility: 'visible', transform: 'none' }, { opacity: 0, visibility: 'visible', transform: 'translateY(30px)' }], { delay: 120, duration: 300, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });

    let t = 380;
    juego.replaceChildren();
    // la charla (si la usaste) como zócalo
    for (const l of antes) {
      const z = el('div', { class: 'zocalo' }, el('span', { class: 'zocalo-k' }, icono('shotcalling', 'ico ico-chico'), 'Vestuario'), el('p', {}, l.message));
      juego.append(z);
      ventanaDeTiempo(z, t, 820, { entra: 0.14, sale: 0.86 });
      t += 720;
    }
    // el Bo1 en juego: tu chance real, que no cambia lo que sale
    const enJuego = el('div', { class: 'zocalo zocalo-juego' }, el('span', { class: 'zocalo-k' }, el('i', { class: 'punto-vivo' }), 'En juego · Bo1'),
      el('p', {}, el('b', {}, `${org} vs ${rival}`)), el('span', { class: 'sw-medidor', style: { '--v': String(partido?.p ?? 0) } }, el('i')),
      el('small', {}, `tu chance: ${pct(partido?.p ?? 0)}`));
    juego.append(enJuego);
    ventanaDeTiempo(enJuego, t, 980, { entra: 0.1, sale: 0.9 });
    anim(enJuego.querySelector('.sw-medidor i'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: t + 120, duration: 600, easing: ENTRA });
    const tPost = t + 920;
    // el post-game: DERROTA (o VICTORIA) con el emblema propio
    const post = el('div', { class: 'postgame sw-post', 'data-res': partido?.resultado ?? 'L' }, emblema(gano),
      el('p', { class: 'pg-titulo' }, gano ? 'Victoria' : 'Derrota'),
      el('p', { class: 'pg-sub' }, el('b', {}, `${gano ? rec.v + 1 : rec.v}-${gano ? rec.d : rec.d + 1}`), el('span', {}, `Swiss · ronda ${partido?.ronda ?? proxima}`)));
    juego.append(post);
    ventanaDeTiempo(post, tPost, 1500, { entra: 0.1, sale: 0.86 });
    anim(post.querySelector('.emblema'), [{ transform: 'scale(0.5) rotate(-16deg)' }, { transform: 'none' }], { delay: tPost, duration: 520, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
    anim(flash, [{ opacity: 0 }, { opacity: 0.85, offset: 0.25 }, { opacity: 0 }], { delay: tPost - 120, duration: 520 });
    // el camino: la ronda en vivo se resuelve
    const res5 = el('span', { class: 'r5-res', 'data-res': partido?.resultado ?? 'L' }, el('b', {}, gano ? 'V' : 'D'));
    r5.append(res5);
    anim(res5, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'none' }], { delay: tPost + 200, duration: 320, easing: ENTRA });
    const recViejo = vom.querySelector('.vom-rec span');
    const recNuevo = el('span', { class: 'vom-nuevo' }, `${gano ? rec.v + 1 : rec.v}-${gano ? rec.d : rec.d + 1}`);
    vom.querySelector('.vom-rec').append(recNuevo);
    recViejo.style.opacity = '0';
    anim(recViejo, [{ opacity: 1 }, { opacity: 0 }], { delay: tPost + 120, duration: 160 });
    anim(recNuevo, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: tPost + 160, duration: 260, easing: ENTRA });
    // la cámara se apaga de a poco
    anim(foto, [{ filter: 'none' }, { filter: 'grayscale(1) brightness(0.45)' }], { delay: tPost + 400, duration: 1400, easing: 'ease-out' });
    foto.style.filter = 'grayscale(1) brightness(0.45)';
    // fin de la transmisión: la eliminación con dignidad, y la decisión que fue real
    const tFin = tPost + 1500;
    const cambios = (r?.inmediato?.cambios ?? []).filter((c) => typeof c.delta === 'number' && Math.round(c.antes) !== Math.round(c.despues));
    const offline = el('div', { class: 'offline' },
      el('p', { class: 'off-k' }, logoFaro(false), 'Tribuna · fin de la transmisión'),
      el('p', { class: 'off-titulo' }, gano ? 'Siguen vivos' : 'Hasta acá llegó el Mundial'),
      fin?.message ? el('p', { class: 'off-texto' }, fin.message) : null,
      el('div', { class: 'off-p' },
        el('p', { 'data-elegida': 'si' }, el('span', {}, op.label), el('b', {}, pct(partido?.p ?? 0))),
        pOtro != null ? el('p', {}, el('span', {}, otro.label), el('b', {}, pct(pOtro))) : null,
        el('small', {}, 'tu chance en ese Bo1: la decisión movió el número, el dado salió igual')),
      cambios.length ? el('ul', { class: 'off-cambios' }, ...cambios.map((c) => el('li', {}, icono(c.campo === 'player.worlds' ? 'mundo' : glifoDe(c.campo), 'ico ico-chico'),
        el('span', {}, c.campo === 'player.worlds' ? 'Mundiales' : cortoDe(c.campo)), el('b', {}, `${entero(c.antes)} → ${entero(c.despues)}`)))) : null,
      el('button', { class: 'seguir', type: 'button', onclick: () => window.vitrina?.repetir() }, 'Seguir', icono('flecha', 'ico ico-chico')));
    juego.append(offline);
    anim(offline, [{ opacity: 0, visibility: 'visible', transform: 'translateY(12px)' }, { opacity: 1, visibility: 'visible', transform: 'none' }], { delay: tFin, duration: 520, easing: ENTRA });
    offline.querySelectorAll('.off-p p, .off-cambios li').forEach((p, i) => anim(p, [{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { delay: tFin + 260 + i * 80, duration: 240 }));
    // el chat: nervioso, el partido, y después se apaga
    const chat2 = chatSwiss(m, { handle, org, rival, ligaRival, rec, rondas, camara: fichaDe(ctx.datos, camara).nombre, tPost, tFin, gano }, 'despues');
    chatPista.replaceChildren(chat2.lista);
    chat2.animar();
    anim(chatModo, [{ opacity: 0 }, { opacity: 1 }], { delay: tFin, duration: 200 });
    chatModo.textContent = 'transmisión terminada';
    saltar.style.opacity = '0';
    anim(saltar, [{ opacity: 1 }, { opacity: 0 }], { delay: tFin, duration: 200 });
    setTimeout(() => offline.querySelector('.seguir')?.focus({ preventScroll: true }), quietoOno(tFin + 500));
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key) && opsNodo.querySelector(`.opcion[data-atajo="${e.key}"]`)) { e.preventDefault(); elegir(Number(e.key)); }
    else if (e.key === 'Escape' && elegida) terminar(raiz);
  }
  document.addEventListener('keydown', tecla);
  opsNodo.addEventListener('click', (e) => { const b = e.target.closest('.opcion[data-atajo]'); if (b) elegir(Number(b.dataset.atajo)); });
  return { elegir, listo, destruir: () => document.removeEventListener('keydown', tecla) };
}

// El chat del Swiss, determinista (comun/azar.js) y armado con los datos reales; nada ofensivo.
// 'antes': nervios del 2-2. 'despues': los nervios, el partido, la derrota (respeto, nada de bronca) y el silencio.
function chatSwiss(m, d, fase) {
  const az = crearAzar(`swiss-${fase}-${m.anio}-${d.rival}`);
  const ultimo = d.rondas[d.rondas.length - 1];
  const verdugo = ultimo ? (ultimo.a === d.org ? ultimo.b : ultimo.a) : null;
  const nervios = [
    `${d.rec.v}-${d.rec.d} y al Bo1, no puedo mirar`, `vamos ${d.org}`, `${d.org.toUpperCase()} ${d.org.toUpperCase()}`, 'tres y pasás, tres y a casa',
    `${d.handle} en vos confío`, 'me transpiran las manos', `${d.rival} es duro pero se puede`, 'ahora o nunca', ':VAMO: :VAMO:',
    verdugo ? `lo de ${verdugo} ya fue, cabeza en esto` : 'cabeza fría', `${d.camara} o nada`, 'mi vieja pregunta qué es un Swiss',
    'no respiro', ':FE:', 'si pasamos me tatúo el logo', 'vida o muerte literal', `${d.ligaRival} vs CBLOL, historia pura`,
  ];
  const partido = ['VAMOOO', 'dale dale dale', 'no no no', 'esa pelea…', ':FE: :FE:', 'mirá ese flank', `${d.handle} jugando con el alma`, 'tranqui tranqui', 'el baron…'];
  const despues = [
    `GG ${d.rival}`, 'dignos', 'duele', 'orgulloso igual', 'gracias por el año', 'volvemos el año que viene', `${d.handle} dejó todo`, 'o7', ':GG:',
    'llorando pero aplaudiendo', `${d.org} hasta el final`, 'se juega así, se pierde así', 'gracias muchachos',
  ];
  const nombres = ['tito', 'nacho', 'lu', 'sofi', 'beto', 'gabi', 'duda', 'caio', 'rafa', 'mel', 'juanma', 'bia', 'teo', 'pipe', 'lara', 'vini', 'flor', 'gui'];
  const colas = ['_br', '99', 'gg', '.mid', 'zinho', '777', '_lol', '', '2k', 'tv'];
  const items = [];
  let tt = 0;
  const mazo = (lista) => { let pila = []; return () => { if (!pila.length) pila = [...lista].sort(() => az.siguiente() - 0.5); return pila.pop(); }; };
  const deNervios = mazo(nervios);
  const dePartido = mazo(partido);
  const deDespues = mazo(despues);
  if (fase === 'antes') {
    const N = 40;
    for (let i = 0; i < N; i++) {
      tt = i < 12 ? 0 : tt + (tt < 900 ? az.entre(60, 110) : az.entre(110, 200));
      items.push({ t: tt, texto: deNervios() });
    }
  } else {
    const fin = d.tFin ?? 4000;
    const post = d.tPost ?? 2600;
    for (let i = 0; i < 14; i++) items.push({ t: 0, texto: deNervios() });
    while (tt < post) { tt += az.entre(70, 140); items.push({ t: Math.min(tt, post - 1), texto: tt < post - 1400 ? deNervios() : dePartido() }); }
    // la derrota: un pico de respeto y después cada vez más lento
    let paso = 120;
    while (tt < fin + 1200) { tt += paso; paso *= 1.35; items.push({ t: tt, texto: d.gano ? dePartido() : deDespues() }); }
    items.push({ t: tt + 400, texto: null });
  }
  const T = Math.max(...items.map((x) => x.t)) + 1;
  const lista = el('ol', { class: 'chat-lista' }, ...items.map((x) => (x.texto == null
    ? el('li', { class: 'chat-msg chat-sistema' }, 'Fin de la transmisión · gracias por mirar')
    : el('li', { class: 'chat-msg', 'data-tono': ['a', 'b', 'c'][az.entero(0, 2)] },
      el('b', {}, `${az.elegir(nombres)}${az.elegir(colas)}`), ' ',
      ...x.texto.split(/(:[A-Z]+:)/).filter(Boolean).map((p) => (/^:[A-Z]+:$/.test(p) ? el('span', { class: 'emote' }, p.slice(1, -1)) : p))))));
  function animar() {
    const alto = parseFloat(getComputedStyle(lista).getPropertyValue('--alto-msg')) || 30;
    const N = items.length;
    // los que ya estaban escritos (t = 0) arrancan a la vista
    const yaEstaban = items.filter((x) => x.t === 0).length;
    const cuadros = [{ offset: 0, transform: `translateY(${(N - yaEstaban) * alto}px)` }];
    items.forEach((x, i) => { if (x.t > 0) cuadros.push({ offset: x.t / T, transform: `translateY(${(N - 1 - i) * alto}px)`, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }); });
    cuadros.push({ offset: 1, transform: 'translateY(0px)' });
    anim(lista, cuadros, { duration: T });
  }
  return { lista, animar };
}
