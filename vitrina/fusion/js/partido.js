// El Partido (fusion): la interfaz de C dentro del mundo de A.
// `serie` / `serieReplan`: EL DRAFT. Un solo panel con tres columnas, como el champ select: tu equipo y el rival a los
// costados (las 5 ranuras, una por mapa), y al centro la parada. En el medio del centro el panel se abre: el escenario es
// una ventana al mundo, y lo que se ve ahi es la luz con el splash vivo. Apuntar un campeon (tus libres, los picks de las
// ranuras, los quemados) es el aura: la luz va a el y su nombre cambia en el escenario. Los quemados son los baneados.
// Elegir juega la serie mapa a mapa: las ranuras se llenan, el escenario es la pantalla de carga del mapa (tu pick contra
// el del rival, en el duotono de la era) y su post-game (VICTORIA/DERROTA), el marcador rueda, Fearless quema; al final la
// luz cae, sube o queda en tension. En `serieReplan` la luz se quiebra ("te leyeron") y el escenario se tapa un instante.
// `swiss`: LA TRIBUNA. El partido internacional como transmision: el "video" es el splash vivo en la luz del Mundial,
// VIDA O MUERTE, el camino del Swiss, el chat (PRNG decorativo armado con los datos reales). Elegir juega el Bo1; la
// eliminacion es la real y entra como el takeover de A: AFUERA, con la p de las dos opciones (la decision fue real).
// Todo lo de elegir se programa de una vez (WAAPI con retardo + el reloj del ambiente): congelar(t) fotografia cualquier
// instante.
import { cargarImagen, urlCarga, urlCentrada, urlIcono } from '../../comun/arte.js';
import { crearAzar } from '../../comun/azar.js';
import { el, svg, animar, entrar, esperar, lineasConMascara, primeraOracion, num, conSigno, odometro, reducido, inst, celular, leerColor, duotono, EXPO, DUR } from './util.js';
import { icono, triangulos, glifoDeCampo } from './iconos.js';
import { franja, trayectoria, cuartos } from './marco.js';
import { claveCampeon } from './aura.js';

const MAPA = 980; // lo que dura cada mapa al jugar la serie (ms)
const CHARLA = 760; // la charla del coach entre mapas
const T0_MAPAS = 420; // el primer mapa, cuando el plan ya se volvio la cabecera
const RESULTADO = 1600; // cuanto dura el resultado de la serie como momento del mundo, antes de volver a la luz
const RONDAS = { final: 'La final', semis: 'Semifinal', semifinal: 'Semifinal', cuartos: 'Cuartos de final' };
const ETQ_CAMBIO = { 'career.arraigo': ['arraigo', 'Arraigo'], 'player.stats.hype': ['hype', 'Hype'], 'player.worlds': ['mundo', 'Mundiales'] };
const ETIQUETAS = {
  mago_control: 'Mago de control', escalado: 'Escala', asesino: 'Asesino', bruiser: 'Peleador', tanque: 'Tanque', tirador: 'Tirador',
  encantador: 'Encantador', iniciador: 'Iniciador', duelista: 'Duelista', explosivo: 'Daño explosivo', temprano: 'Juego temprano', utilidad: 'Utilidad', mago: 'Mago', luchador: 'Luchador',
};

const quieto = () => inst() || reducido();
const pct = (p) => `${Math.round((p ?? 0) * 100)}%`;
// Atajo: animar con la forma de C (duration) sobre el animar de A (fill backwards, congelable).
const anim = (n, c, o = {}) => animar(n, c, { dur: o.duration ?? DUR.entra, delay: o.delay ?? 0, easing: o.easing ?? 'linear', fill: o.fill ?? 'backwards' });
// Una capa que existe solo en una ventana de tiempo (su estado natural es oculta).
const ventanaDeTiempo = (nodo, desde, dura, { entra = 0.12, sale = 0.9 } = {}) =>
  anim(nodo, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: entra }, { opacity: 1, visibility: 'visible', offset: sale }, { opacity: 0, visibility: 'visible' }], { delay: desde, duration: dura });
const rgbDe = (token) => `rgb(${leerColor(token).map((v) => Math.round(v * 255)).join(', ')})`;

// nombre y etiquetas desde el catalogo real del inicio; si no esta, la clave misma
function fichaDe(datos, k) {
  const key = claveCampeon(k);
  const c = Object.values(datos.inicio?.catalogos?.campeonesPorRol ?? {}).flat().find((x) => x.ddragon === key);
  return { key, nombre: c?.name ?? key ?? '', tags: (c?.tags ?? []).map((t) => ETIQUETAS[t] ?? String(t)) };
}
// El arte en el duotono de la era (A): sombra = el vacio, luz = la luz de la era, recortado por la cara.
function pintar(canvas, img, era, foco) {
  if (!img) return;
  duotono(img, leerColor('--bg-void'), leerColor(`--luz-${era}`), canvas.width, canvas.height, { canvas, foco, brillo: 1.12 });
}
const eraDe = () => document.documentElement.dataset.era || 'escenario';

// el emblema del post-game: un escudo con un haz de luz adentro (propio, nunca el de Riot)
function emblema(gano) {
  return svg('svg', { class: `emblema ${gano ? 'gano' : 'perdio'}`, viewBox: '0 0 120 120', 'aria-hidden': 'true' }, [
    svg('path', { class: 'em-marco', d: 'M60 6 L108 30 L108 74 Q108 100 60 116 Q12 100 12 74 L12 30 Z' }),
    svg('path', { class: 'em-interior', d: 'M60 18 L97 37 L97 72 Q97 92 60 104 Q23 92 23 72 L23 37 Z' }),
    svg('path', { class: 'em-haz', d: gano ? 'M54 56 L96 40 L96 80 L54 64 Z' : 'M54 58 L84 54 L84 66 L54 62 Z' }),
    svg('circle', { class: 'em-lampara', cx: '44', cy: '60', r: gano ? '10' : '8' }),
  ]);
}

// la cabecera de una parada: rotulo, titulo ancho, planteo en una linea + "mas"
function cabecera({ rotulo, titulo, descripcion, alerta }) {
  const [primera, resto] = primeraOracion(descripcion ?? '');
  const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'planteo' }, [el('span', { class: 'planteo-1', text: primera }), resto ? el('span', { class: 'planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const a = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', a);
    btnMas.setAttribute('aria-expanded', String(a));
    btnMas.textContent = a ? 'menos' : 'más';
  });
  const rot = el('p', { class: 'rotulo-cat' }, [el('i', { class: 'punto-luz' }), ...rotulo.map((r, i) => el('span', { class: i ? 'bisagra' : null, text: r })), alerta ? el('span', { class: 'bisagra alerta', text: alerta }) : null]);
  const h1 = el('h1', { class: 'titulo-parada', 'data-foco': '', tabindex: '-1', text: titulo });
  return { nodo: el('header', { class: 'panel-cab' }, [rot, h1, planteo]), rotulo: rot, titulo: h1, planteo };
}

// Un marcador de un digito por lado que rueda paso a paso (una animacion por lado, un tramo por cambio).
function marcadorRodante(pasos, inicial) {
  const fin = pasos.length ? pasos[pasos.length - 1] : { a: inicial[0], b: inicial[1] };
  const total = (pasos[pasos.length - 1]?.t ?? 0) + 500;
  const col = (lado) => {
    const tira = el('span', { class: 'odo-tira' }, Array.from({ length: 10 }, (_, d) => el('span', { text: String(d) })));
    const v = lado === 0 ? fin.a : fin.b;
    tira.style.transform = `translateY(${-v * 10}%)`;
    const cuadros = [{ transform: `translateY(${-inicial[lado] * 10}%)`, offset: 0 }];
    let prev = inicial[lado];
    for (const p of pasos) {
      const v2 = lado === 0 ? p.a : p.b;
      if (v2 === prev) continue;
      cuadros.push({ transform: `translateY(${-prev * 10}%)`, offset: Math.min(1, p.t / total), easing: 'cubic-bezier(.3,1.5,.5,1)' });
      cuadros.push({ transform: `translateY(${-v2 * 10}%)`, offset: Math.min(1, (p.t + 420) / total) });
      prev = v2;
    }
    cuadros.push({ transform: `translateY(${-v * 10}%)`, offset: 1 });
    if (pasos.length) animar(tira, cuadros, { dur: total, easing: 'linear' });
    return el('span', { class: 'odo-col', 'aria-hidden': 'true' }, tira);
  };
  return el('span', { class: 'ms-num odometro', 'aria-label': `${fin.a}-${fin.b}` }, [col(0), el('i', { 'aria-hidden': 'true', text: '–' }), col(1)]);
}

export function crearPartido(ctx) {
  return ctx.muestra === 'swiss' ? crearSwiss(ctx) : crearDraft(ctx);
}

// ======================================================================================================================
// La serie: el draft
// ======================================================================================================================
function crearDraft({ datos, muestra, amb, aura, sonido, peor }) {
  const m = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const replan = Boolean(m.esReplan || m.decision?.datos?.replan);
  const dec = m.decision;
  const ops = dec.opciones;
  const pg = m.previas?.general ?? {};
  const se = m.serieEnCurso ?? m.acompanante?.datos?.serie ?? {};
  const formato = se.formato ?? 5;
  const fr = m.franja;
  const liga = m.ficha?.jugador?.liga ?? 'CBLOL';
  const ronda = RONDAS[se.ronda] ?? se.ronda ?? 'La serie';
  const nos = pc?.org?.nombre ?? pg.propio?.nombre ?? fr.club.org;
  const ellos = pg.rival?.nombre ?? se.rival?.org ?? 'el rival';
  const libres = (m.acompanante?.datos?.libres ?? []).map(claveCampeon);
  const quemados0 = (m.quemadosAlParar ?? []).map(claveCampeon);
  const beatsMapa = (m.pagina?.beats ?? []).map((b) => b.log).filter((l) => l?.mapa);
  const jugados = (se.mapas ?? []).map((mp) => ({ ...mp, rivalJuega: [...beatsMapa].reverse().find((l) => l.mapa === mp.mapa && l.campeon === mp.campeon)?.rivalJuega ?? null }));
  const offset = jugados.length;
  const leido = replan ? claveCampeon(se.rivalJuega) : null;
  const intencionRival = claveCampeon(pg.rival?.campeon);
  const base = claveCampeon(replan ? se.rivalJuega : pg.desglose?.campeon ?? m.ficha?.jugador?.campeonDelSplit) ?? libres[0];
  const meta = datos.meta;
  const marcadorAhora = se.marcador ?? [0, 0];
  const cargas = [];
  const lienzos = []; // [canvas, img, foco] para repintar al cambiar de era
  const retratoDe = (k, url, w, h, foco, clase = 'retrato') => {
    const c = el('canvas', { class: clase, width: String(w), height: String(h), 'aria-hidden': 'true' });
    const reg = [c, null, foco];
    lienzos.push(reg);
    cargas.push(cargarImagen(url(k, meta)).then((img) => {
      reg[1] = img;
      pintar(c, img, eraDe(), foco);
    }));
    return c;
  };

  // ---------- los dos equipos: 5 ranuras, una por mapa ----------
  function columna(lado, nombre, fuerza, kicker) {
    const ranuras = Array.from({ length: formato }, (_, i) => el('li', { class: 'ranura', 'data-mapa': String(i + 1), 'data-decisivo': i === formato - 1 ? '' : null }, [
      el('span', { class: 'ranura-n' }, [`Mapa ${i + 1}`, i === formato - 1 ? el('small', { text: 'el decisivo' }) : null]),
      el('span', { class: 'ranura-cuerpo' }, el('span', { class: 'ranura-espera' })),
    ]));
    const nodo = el('section', { class: `equipo equipo-${lado}`, 'aria-label': nombre }, [
      el('header', { class: 'eq-cab' }, [
        el('p', { class: 'eq-kicker', text: kicker }),
        el('p', { class: 'eq-nombre', text: nombre }),
        el('p', { class: 'eq-fuerza' }, [el('b', { class: 'num', text: fuerza }), el('span', { text: lado === 'nos' ? 'fuerza' : `fuerza · vs ${pg.propio?.texto ?? ''}` })]),
      ]),
      el('ol', { class: 'ranuras' }, ranuras),
    ]);
    return { nodo, ranuras };
  }
  const colNos = columna('nos', nos, pg.propio?.texto ?? '', 'Tu equipo');
  const colEllos = columna('ellos', ellos, pg.rival?.texto ?? '', 'Rival');

  // un pick en una ranura: el arte del campeon en el duotono de la era, su nombre y el resultado del mapa
  function pickEn(ranura, k, { res, sub, intencion = false } = {}) {
    const nodo = el('span', { class: 'ranura-pick', 'data-campeon': k, tabindex: '0', 'data-intencion': intencion ? '' : null }, [
      retratoDe(k, urlCentrada, 240, 60, [0.5, 0.26], 'ranura-arte'),
      el('span', { class: 'ranura-txt' }, [el('b', { text: fichaDe(datos, k).nombre }), sub ? el('small', { text: sub }) : null]),
      res ? el('span', { class: 'ranura-res', 'data-res': res, text: res === 'W' ? 'V' : 'D' }) : null,
    ]);
    ranura.querySelector('.ranura-cuerpo').append(nodo);
    return nodo;
  }
  jugados.forEach((mp) => {
    const i = mp.mapa - 1;
    colNos.ranuras[i].dataset.jugado = '';
    colEllos.ranuras[i].dataset.jugado = '';
    pickEn(colNos.ranuras[i], claveCampeon(mp.campeon), { res: mp.resultado, sub: mp.marcador });
    if (mp.rivalJuega) pickEn(colEllos.ranuras[i], claveCampeon(mp.rivalJuega), { res: mp.resultado === 'W' ? 'L' : 'W' });
  });
  if (intencionRival && colEllos.ranuras[offset]) pickEn(colEllos.ranuras[offset], intencionRival, { sub: 'su intención', intencion: true });
  colEllos.ranuras.forEach((r, i) => {
    if (i > offset) r.querySelector('.ranura-espera').textContent = 'sin ver';
  });
  // la p del plan apuntado en tus ranuras pendientes
  const barrasP = colNos.ranuras.map((r, i) => {
    if (i < offset) return null;
    const v = el('b', { class: 'num' });
    const b = el('span', { class: 'p-barra' });
    r.querySelector('.ranura-espera').append(b, v);
    return { b, v };
  });

  // ---------- el por que: la previa del proximo mapa (al pie de tu equipo) ----------
  const filas = pg.filas ?? [];
  const total = pg.fuerzaFinal ?? Math.max(1, filas.reduce((a, f) => a + Math.max(0, f.valor), 0));
  const porque = el('section', { class: 'porque', 'aria-label': pg.titulo ?? 'La previa' }, [
    el('p', { class: 'eq-kicker', text: `La previa · mapa ${offset + 1}` }),
    el('p', { class: 'porque-p', 'aria-label': pg.textoProbabilidad }, [el('b', { class: 'num', text: `${pg.porcentaje ?? Math.round((pg.p ?? 0) * 100)}%` }), el('span', { text: 'de ganar' })]),
    el('ul', { class: 'porque-filas' }, filas.map((f) => el('li', { 'data-signo': f.valor < -0.5 ? 'neg' : f.valor > 0.5 ? 'pos' : 'cero' }, [
      el('span', { text: f.etiqueta }),
      el('span', { class: 'porque-barra', style: { '--v': String(Math.min(1, Math.abs(f.valor) / total)) } }),
      el('b', { text: f.texto }),
    ]))),
  ]);
  colNos.nodo.append(porque);

  // ---------- quemados (Fearless): los baneados de la serie (al pie del rival) ----------
  const capacidad = formato * 2;
  const tablero = el('ul', { class: 'quemados', 'aria-label': 'Quemados por Fearless' });
  const quemadoNodo = (k, { esLeido = false } = {}) => {
    const li = el('li', { class: 'quemado', title: `${fichaDe(datos, k).nombre}: quemado`, 'data-campeon': k, tabindex: '0', 'data-leido': esLeido ? '' : null }, el('span', { class: 'quemado-tacha', 'aria-hidden': 'true' }));
    cargas.push(cargarImagen(urlIcono(k, meta)).then((img) => {
      if (!img) return;
      const c = img.cloneNode();
      c.alt = fichaDe(datos, k).nombre;
      li.prepend(c);
    }));
    return li;
  };
  quemados0.forEach((k) => tablero.append(quemadoNodo(k, { esLeido: k === leido })));
  for (let i = tablero.children.length; i < capacidad; i++) tablero.append(el('li', { class: 'quemado-hueco', 'aria-hidden': 'true' }));
  const contadorQ = el('small', { text: quemados0.length ? `${quemados0.length} de ${capacidad}` : 'ninguno todavía' });
  colEllos.nodo.append(el('section', { class: 'tablero' }, [el('p', { class: 'eq-kicker' }, [el('span', { text: 'Quemados · Fearless' }), contadorQ]), tablero]));

  // ---------- el escenario: la ventana al mundo. El nombre del apuntado, tus libres, el marcador ----------
  const nombreAp = el('p', { class: 'ap-nombre' });
  const tagsAp = el('p', { class: 'ap-tags' });
  const ponerNombre = (k) => {
    const f = fichaDe(datos, k ?? base);
    nombreAp.textContent = f.nombre;
    tagsAp.textContent = f.tags.join(' · ');
    if (!quieto()) {
      anim(nombreAp, [{ opacity: 0, transform: 'translateX(-10px)', letterSpacing: '0.04em' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EXPO });
    }
  };
  const desuscribir = aura?.alCambiar((k) => ponerNombre(k));
  const libresNodos = new Map();
  const libresRow = el('ul', { class: 'libres', 'aria-label': `Tus libres: ${libres.length}` }, libres.map((k) => {
    const b = el('button', { class: 'libre', type: 'button', 'data-campeon': k, title: fichaDe(datos, k).nombre }, [
      retratoDe(k, urlCarga, 120, 218, [0.5, 0.18], 'libre-arte'),
      el('span', { class: 'libre-n', text: fichaDe(datos, k).nombre }),
      el('span', { class: 'libre-quema', 'aria-hidden': 'true' }, [el('i'), el('small', { text: 'quemado' })]),
    ]);
    libresNodos.set(k, b);
    return el('li', {}, b);
  }));
  const marcador = el('p', { class: 'marcador-serie', 'aria-label': 'Marcador de la serie' }, [el('span', { class: 'ms-eq', text: nos }), marcadorRodante([], marcadorAhora), el('span', { class: 'ms-eq', text: ellos })]);
  const juego = el('div', { class: 'juego', 'aria-live': 'polite' });
  const escenario = el('div', { class: 'escenario' }, [
    el('div', { class: 'ap' }, [el('p', { class: 'eq-kicker', text: replan ? 'Te lo leyeron' : 'Apuntando' }), nombreAp, tagsAp]),
    el('div', { class: 'escenario-pie' }, [el('p', { class: 'eq-kicker' }, [el('span', { text: 'Tus libres' }), el('b', { class: 'libres-n', text: String(libres.length) })]), libresRow]),
    marcador,
    juego,
  ]);
  ponerNombre(base);

  // ---------- la cabecera de la parada ----------
  const cab = cabecera({
    rotulo: [`${liga} ${m.anio}`, ronda, `Bo${formato} · Fearless`, replan ? `Van ${marcadorAhora[0]}–${marcadorAhora[1]}` : 'cada pick se quema'],
    titulo: dec.titulo,
    descripcion: dec.descripcion,
    alerta: replan ? 'Replan' : null,
  });

  // ---------- los planes: label + 5 barritas (la p de cada mapa) + el % de la serie; el inspector con la prosa ----------
  const mejor = Math.max(...ops.map((o) => o.pSerie ?? 0));
  const pOpc = Object.fromEntries((pg.opciones ?? []).map((o) => [o.id, o]));
  const barritas = (o) => el('span', { class: 'barritas', 'aria-hidden': 'true' }, Array.from({ length: formato }, (_, i) => {
    const p = i >= offset ? o.pMapas?.[i - offset] : null;
    return el('span', { class: 'barrita', 'data-decisivo': i === formato - 1 ? '' : null, 'data-jugado': i < offset ? '' : null, style: { '--v': String(p ?? 0) } }, el('small', { text: i < offset ? '·' : i === formato - 1 ? 'D' : `M${i + 1}` }));
  }));
  const planes = el('div', { class: 'planes', role: 'group', 'aria-label': 'Planes' });
  const filasPlan = ops.map((o, i) => {
    const b = el('button', { class: 'opcion plan', type: 'button', 'data-atajo': String(i + 1), 'aria-describedby': `desc-plan-${muestra}-${i + 1}` }, [
      el('span', { class: 'op-tecla', text: String(i + 1) }),
      el('span', { class: 'op-cuerpo' }, [el('span', { class: 'op-label', text: o.label }), el('span', { class: 'op-glifos' }, [icono(o.id in { guardar: 1, conTodo: 1, coach: 1 } ? o.id : 'serie'), `el decisivo ${pct((o.pMapas ?? []).at(-1))}`])]),
      barritas(o),
      el('span', { class: 'plan-serie', 'data-mejor': o.pSerie === mejor ? '' : null }, [el('b', { class: 'num', text: pct(o.pSerie) }), el('small', { text: 'la serie' })]),
    ]);
    planes.append(b);
    return b;
  });
  const ocultas = el('div', { class: 'sr' }, ops.map((o, i) => el('div', { id: `desc-plan-${muestra}-${i + 1}` }, [o.descripcion ?? '', ' ', pOpc[o.id]?.texto ?? ''])));
  const inspector = el('div', { class: 'inspector', 'aria-live': 'polite' });
  let apuntada = 0;
  function apuntar(i, mover = false) {
    apuntada = Math.max(0, Math.min(ops.length - 1, i));
    const o = ops[apuntada];
    filasPlan.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    inspector.replaceChildren(
      el('p', { class: 'insp-kicker' }, [el('span', { class: 'insp-n', text: String(apuntada + 1) }), o.label]),
      el('p', { class: 'insp-texto', text: o.descripcion ?? '' }),
      pOpc[o.id]?.texto ? el('p', { class: 'insp-mono', text: pOpc[o.id].texto }) : null,
    );
    barrasP.forEach((x, j) => {
      if (!x) return;
      const p = o.pMapas?.[j - offset];
      x.b.style.setProperty('--v', String(p ?? 0));
      x.v.textContent = p != null ? pct(p) : '—';
    });
    if (mover) filasPlan[apuntada].focus({ preventScroll: true });
  }
  filasPlan.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (i !== apuntada) amb.pulso('apuntar');
      apuntar(i);
    });
    f.addEventListener('focus', () => apuntar(i));
    f.addEventListener('click', () => elegir(i + 1));
  });
  const enJuego = el('div', { class: 'en-juego' });
  const decide = el('div', { class: 'decide' }, [planes, inspector, enJuego]);
  const centro = el('div', { class: 'draft-centro' }, [cab.nodo, escenario, decide, ocultas]);
  const draft = el('div', { class: 'draft', 'data-replan': replan ? '' : null }, [colNos.nodo, centro, colEllos.nodo]);

  const raiz = el('section', { class: 'parada partido', 'data-pieza': 'partido', 'data-forma': 'draft', 'data-muestra': muestra });
  const frN = franja(fr, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });
  const tray = trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad);
  raiz.append(frN, draft, cuartos('temporada', null, tray));
  apuntar(0);

  // ---------- entrada: luz -> rotulo -> titulo -> los equipos por los costados -> planes ----------
  function entrada() {
    entrar(frN, 0, -10);
    anim(draft, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { delay: 80, duration: 320, easing: EXPO });
    entrar(cab.rotulo, 160, 8);
    lineasConMascara(cab.titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 220 + i * 70, dur: 420 }));
    entrar(cab.planteo, 380, 8);
    anim(colNos.nodo, [{ opacity: 0, transform: 'translateX(-24px)' }, { opacity: 1, transform: 'none' }], { delay: 200, duration: 320, easing: EXPO });
    anim(colEllos.nodo, [{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }], { delay: 200, duration: 320, easing: EXPO });
    [...colNos.ranuras, ...colEllos.ranuras].forEach((r, i) => anim(r, [{ opacity: 0 }, { opacity: 1 }], { delay: 280 + (i % formato) * 40, duration: 220 }));
    libresRow.querySelectorAll('li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { delay: 420 + i * 45, duration: 300, easing: EXPO }));
    const tPlanes = replan ? 1150 : 520;
    filasPlan.forEach((b, i) => {
      anim(b, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: tPlanes + i * 60, duration: 280, easing: EXPO });
      b.querySelectorAll('.barrita').forEach((x, k) => anim(x, [{ transform: 'scaleY(0)' }, { transform: 'none' }], { delay: tPlanes + 80 + i * 60 + k * 30, duration: 420, easing: EXPO }));
    });
    anim(inspector, [{ opacity: 0 }, { opacity: 1 }], { delay: tPlanes + 120, duration: 260 });
    esperar(raiz, 700).then(() => amb.aquietar(true));
    if (quieto()) amb.aquietar(true);
    if (replan) {
      // te leyeron: la luz se quiebra un instante, el escenario se tapa con el sello, y el draft vuelve
      amb.quiebre(quieto() ? 0 : 220);
      amb.ambiente({ animo: 'peligro' });
      amb.ambiente({ animo: 'normal', retardo: 1100 });
      const sello = el('div', { class: 'sello-leido', 'aria-hidden': 'true' }, [
        el('p', { class: 'sello-t', text: 'Quemado' }),
        el('p', { class: 'sello-sub', text: `${fichaDe(datos, leido).nombre} · ${ellos} te leyó` }),
      ]);
      escenario.append(sello);
      ventanaDeTiempo(sello, 200, 1900, { entra: 0.08, sale: 0.86 });
      anim(sello.querySelector('.sello-t'), [{ transform: 'scale(1.5)', opacity: 0, letterSpacing: '0.3em', filter: 'blur(10px)' }, { transform: 'none', opacity: 1, filter: 'none' }], { delay: 420, duration: 420, easing: EXPO });
      const q = tablero.querySelector('[data-leido]');
      if (q) anim(q, [{ transform: 'scale(1.5)' }, { transform: 'none' }], { delay: 520, duration: 420, easing: EXPO });
    }
  }

  // ---------- elegir: la serie se juega mapa a mapa ----------
  let elegida = 0;
  let saltar = null;
  function elegir(n) {
    const op = ops[n - 1];
    if (!op || elegida) return;
    elegida = n;
    const r = m.resultados?.find((x) => x.opcionId === op.id);
    const logs = r?.logsDeLaSerie ?? r?.inmediato?.logs ?? [];
    const iMapas = logs.map((l, i) => (l.mapa ? i : -1)).filter((i) => i >= 0);
    const primerMapa = iMapas[0] ?? -1;
    const ultimoMapa = iMapas[iMapas.length - 1] ?? -1;
    draft.dataset.jugando = '';
    // el escenario deja de ser la seleccion: el nombre apuntado y tus libres se apagan, entra la serie
    escenario.querySelectorAll('.ap, .escenario-pie').forEach((x) => {
      x.style.opacity = '0';
      anim(x, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    });
    amb.pulso('elegir');
    amb.aquietar(false); // la serie en juego: la luz vuelve a estar viva
    sonido?.clic();
    enJuego.replaceChildren(
      el('span', { class: 'op-tecla', text: String(n) }),
      el('span', { class: 'en-juego-t' }, [el('span', { class: 'eq-kicker', text: 'Tu plan' }), el('b', { text: op.label })]),
      el('span', { class: 'plan-serie' }, [el('b', { class: 'num', text: pct(op.pSerie) }), el('small', { text: 'la serie' })]),
      el('button', { type: 'button', class: 'boton saltar', onclick: () => saltar?.() }, ['Saltar', el('kbd', { text: 'Esc' })]),
    );
    anim(enJuego, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: 60, duration: 260, easing: EXPO });

    const quemados = new Set(quemados0);
    let t = T0_MAPAS;
    const pasos = [];
    juego.replaceChildren();
    logs.forEach((l, i) => {
      if (l.mapa) {
        jugarMapa(l, t, i === ultimoMapa);
        t += MAPA;
      } else if (primerMapa >= 0 && i > primerMapa && i < ultimoMapa) {
        // la charla del coach entre mapas
        const cartel = el('div', { class: 'cartel-charla' }, [icono('coach'), el('p', { text: l.message })]);
        juego.append(cartel);
        ventanaDeTiempo(cartel, t, CHARLA);
        t += CHARLA;
      }
    });
    marcador.querySelector('.ms-num').replaceWith(marcadorRodante(pasos, marcadorAhora));
    const mapas = logs.filter((l) => l.mapa);
    const fin = logs[logs.length - 1];
    const finalNodo = finalDeSerie(fin?.mapa ? null : fin, mapas, t, r);

    function jugarMapa(l, t0, esUltimo) {
      const k = claveCampeon(l.campeon);
      const rk = claveCampeon(l.rivalJuega);
      const i = l.mapa - 1;
      const gano = l.resultado === 'W';
      // las ranuras: la p se va, entra el pick (el tuyo y el del rival, como en el champ select)
      const rn = colNos.ranuras[i];
      const re = colEllos.ranuras[i];
      [rn, re].forEach((r0) => r0?.querySelectorAll('.ranura-espera, .ranura-pick[data-intencion]').forEach((x) => {
        x.style.opacity = '0';
        anim(x, [{ opacity: 1 }, { opacity: 0 }], { delay: t0, duration: 160 });
      }));
      const pn = rn ? pickEn(rn, k, { res: l.resultado, sub: l.marcador }) : null;
      const pe = re && rk ? pickEn(re, rk, { res: gano ? 'L' : 'W' }) : null;
      if (pn) anim(pn, [{ opacity: 0, transform: 'translateX(-18px)' }, { opacity: 1, transform: 'none' }], { delay: t0, duration: 260, easing: EXPO });
      if (pe) anim(pe, [{ opacity: 0, transform: 'translateX(18px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 90, duration: 260, easing: EXPO });
      [pn, pe].forEach((p) => p && anim(p.querySelector('.ranura-res'), [{ opacity: 0, transform: 'scale(1.8)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 430, duration: 220, easing: EXPO }));
      // el escenario: la pantalla de carga del mapa (tu pick contra el del rival) y su post-game
      const capa = el('div', { class: 'mapa-capa', 'data-res': l.resultado }, [
        el('div', { class: 'carga carga-nos' }, [retratoDe(k, urlCarga, 176, 320, [0.5, 0.2], 'carga-arte'), el('b', { text: fichaDe(datos, k).nombre })]),
        el('div', { class: 'carga carga-ellos' }, [rk ? retratoDe(rk, urlCarga, 176, 320, [0.5, 0.2], 'carga-arte') : null, el('b', { text: rk ? fichaDe(datos, rk).nombre : '' })]),
        el('p', { class: 'mapa-n', text: `Mapa ${l.mapa}${l.mapa === formato ? ' · el decisivo' : ''}` }),
        el('div', { class: 'postgame' }, [
          emblema(gano),
          el('p', { class: 'pg-titulo', text: gano ? 'Victoria' : 'Derrota' }),
          el('p', { class: 'pg-sub' }, [el('b', { class: 'num', text: l.marcador }), el('span', { text: `tenías ${pct(l.p)}` })]),
        ]),
      ]);
      juego.append(capa);
      if (esUltimo) anim(capa, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: 0.12 }, { opacity: 1, visibility: 'visible' }], { delay: t0, duration: MAPA });
      else ventanaDeTiempo(capa, t0, MAPA, { entra: 0.1, sale: 0.93 });
      capa.querySelectorAll('.carga').forEach((c, j) => anim(c, [{ opacity: 0, transform: `translateX(${j ? 26 : -26}px)` }, { opacity: 1, transform: 'none' }], { delay: t0 + j * 70, duration: 320, easing: EXPO }));
      anim(capa.querySelector('.mapa-n'), [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 60, duration: 240, easing: EXPO });
      const post = capa.querySelector('.postgame');
      anim(post, [{ opacity: 0, transform: 'scale(1.12)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: t0 + 380, duration: 300, easing: EXPO });
      anim(post.querySelector('.pg-titulo'), [{ letterSpacing: '0.3em' }, { letterSpacing: '0.02em' }], { delay: t0 + 380, duration: 420, easing: EXPO });
      anim(post.querySelector('.emblema'), [{ transform: 'rotate(-14deg) scale(0.6)' }, { transform: 'none' }], { delay: t0 + 380, duration: 420, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
      // la derrota apaga la pantalla de carga; la victoria es un pulso de luz en el mundo
      if (!gano) capa.querySelectorAll('.carga-nos canvas').forEach((c) => anim(c, [{ filter: 'none' }, { filter: 'grayscale(1) brightness(0.5)' }], { delay: t0 + 380, duration: 320 }));
      else amb.pulso('logro', quieto() ? 0 : t0 + 380);
      const [a, b] = String(l.marcador).split('-').map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) pasos.push({ t: t0 + 400, a, b });
      // Fearless: lo que salio queda quemado para los dos
      const tq = t0 + Math.round(MAPA * 0.6);
      for (const q of [k, rk]) {
        if (!q || quemados.has(q)) continue;
        quemados.add(q);
        const nodo = quemadoNodo(q);
        const hueco = [...tablero.querySelectorAll('.quemado-hueco')].find((h) => !h.children.length);
        if (hueco) hueco.append(nodo);
        else tablero.append(nodo);
        anim(nodo, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'none' }], { delay: tq, duration: 260, easing: EXPO });
        const lib = libresNodos.get(q);
        if (lib) {
          lib.dataset.quemado = '';
          anim(lib.querySelector('.libre-quema'), [{ opacity: 0 }, { opacity: 1 }], { delay: tq, duration: 220 });
          anim(lib.querySelector('canvas'), [{ filter: 'none' }, { filter: 'grayscale(1) brightness(0.45)' }], { delay: tq, duration: 220 });
        }
      }
    }

    // el desenlace: la luz cae (perdiste), sube (gloria) o queda en tension (la serie sigue)
    const gano = r?.serie?.resultado?.gano ?? fin?.gano ?? (fin?.postSerie ? mapas[mapas.length - 1]?.resultado === 'W' : null);
    const animoFin = fin?.postSerie ? (gano ? 'gloria' : 'caida') : 'peligro';
    amb.ambiente({ animo: animoFin, retardo: quieto() ? 0 : t });
    // las pantallas de carga, los post-game y el resultado son un momento del mundo (la politica decide que se ve)
    amb.momento?.({ retardo: quieto() ? 0 : T0_MAPAS, dura: t - T0_MAPAS + RESULTADO });
    if (animoFin === 'gloria') amb.pulso('gloria', quieto() ? 0 : t);
    contadorQ.textContent = `${quemados.size} de ${capacidad}`;
    anim(contadorQ, [{ opacity: 0 }, { opacity: 1 }], { delay: t - MAPA * 0.4, duration: 200 });
    saltar = () => {
      for (const a of raiz.getAnimations({ subtree: true })) {
        try {
          if (a.effect?.getTiming().iterations !== Infinity) a.finish();
        } catch {
          /* sin fin */
        }
      }
      amb.ambiente({ animo: animoFin, instantaneo: true });
      saltar = null;
    };
    esperar(raiz, t + 420).then(() => {
      saltar = null;
      finalNodo.querySelector('.boton')?.focus({ preventScroll: true });
    });
  }

  // el resultado de la serie: el marcador grande, los mapas en pips y el texto del motor (en el escenario)
  function finalDeSerie(final, mapas, t0, r) {
    const ultimo = mapas[mapas.length - 1];
    const gano = r?.serie?.resultado?.gano ?? final?.gano ?? ultimo?.resultado === 'W';
    const sigue = !final?.postSerie;
    const todos = [...jugados, ...mapas];
    const enc = r?.inmediato?.encadenaOtraParada;
    const texto = final?.message ?? (enc ? `${ultimo?.marcador ?? ''}: la serie sigue en «${enc.titulo}».` : ultimo?.message ?? '');
    const card = el('div', { class: 'serie-final', 'data-gano': sigue ? 'sigue' : String(Boolean(gano)) }, [
      emblema(sigue ? true : gano),
      el('div', { class: 'sf-cuerpo' }, [
        el('p', { class: 'eq-kicker', text: `${liga} ${m.anio} · ${ronda} · Bo${formato}${sigue ? ' · sigue' : ''}` }),
        el('p', { class: 'sf-marcador num', text: (ultimo?.marcador ?? '').replace('-', '–') }),
        el('ol', { class: 'sf-mapas' }, todos.map((mp) => el('li', { 'data-res': mp.resultado, 'data-campeon': claveCampeon(mp.campeon), tabindex: '0' }, [el('span', { text: `M${mp.mapa}` }), el('b', { text: fichaDe(datos, mp.campeon).nombre })]))),
        texto ? el('p', { class: 'sf-texto', text: texto }) : null,
        el('button', { class: 'boton', type: 'button', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]),
      ]),
    ]);
    juego.append(card);
    anim(card, [{ opacity: 0, visibility: 'visible', transform: 'translateY(14px)' }, { opacity: 1, visibility: 'visible', transform: 'none' }], { delay: t0, duration: 380, easing: EXPO });
    anim(card.querySelector('.emblema'), [{ transform: 'scale(0.4) rotate(-20deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: t0 + 80, duration: 520, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
    card.querySelectorAll('.sf-mapas li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 200 + i * 50, duration: 220 }));
    marcador.style.opacity = '0';
    anim(marcador, [{ opacity: 1 }, { opacity: 0 }], { delay: t0, duration: 200 });
    const sal = enJuego.querySelector('.saltar');
    if (sal) {
      sal.style.visibility = 'hidden';
      anim(sal, [{ visibility: 'visible', opacity: 1 }, { visibility: 'visible', opacity: 0 }], { delay: t0, duration: 200 });
    }
    return card;
  }

  // teclado: 1-3 eligen, flechas recorren, Esc/Espacio saltea, R repite
  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= ops.length && !elegida) {
      e.preventDefault();
      elegir(Number(e.key));
    } else if ((e.key === 'Escape' || e.code === 'Space') && saltar) {
      e.preventDefault();
      saltar();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegida) {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), true);
    } else if ((e.key === 'r' || e.key === 'R') && elegida) window.vitrina?.repetir();
  }

  // el arte de la serie se precarga: al jugarla, cada mapa ya tiene su pantalla de carga y sus quemados
  const precarga = (m.resultados ?? []).flatMap((r) => (r.logsDeLaSerie ?? r.inmediato?.logs ?? []).filter((l) => l.mapa))
    .flatMap((l) => [l.campeon, l.rivalJuega].filter(Boolean).map(claveCampeon))
    .flatMap((k) => [cargarImagen(urlCarga(k, meta)), cargarImagen(urlCentrada(k, meta)), cargarImagen(urlIcono(k, meta))]);
  return {
    nodo: raiz,
    entrar: entrada,
    elegir,
    tecla,
    listo: () => Promise.all([...cargas, ...precarga]),
    alCambiarEra(e) {
      for (const [c, img, foco] of lienzos) pintar(c, img, e, foco);
    },
    destruir: () => desuscribir?.(),
    arte: base,
    animo: 'normal',
    encuadre: celular() ? 'celular' : 'draft',
    velo: 0.4,
  };
}

// ======================================================================================================================
// El Swiss: la Tribuna
// ======================================================================================================================
function crearSwiss({ datos, muestra, amb, sonido, peor }) {
  const m = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const dec = m.decision;
  const ops = dec.opciones;
  const pg = m.previas?.general ?? {};
  const it = m.internacional ?? m.acompanante?.datos?.internacional ?? {};
  const fr = m.franja;
  const org = it.jugador ?? fr.club.org;
  const orgVista = pc?.org?.nombre ?? org;
  const handle = pc ? pc.handle : fr.quien.handle;
  const rival = dec.datos?.rival ?? it.partidoEnCurso?.rival ?? pg.rival?.nombre ?? '';
  const ligaRival = it.partidoEnCurso?.ligaRival ?? (it.participantes ?? []).find((p) => p.nombre === rival)?.liga ?? '';
  const rondas = (it.swiss?.rondas ?? []).flat().filter((x) => x.a === org || x.b === org).sort((a, b) => a.ronda - b.ronda);
  const ligaDe = (n) => (it.participantes ?? []).find((p) => p.nombre === n)?.liga ?? '';
  const rec = it.swiss?.record?.[org] ?? { v: 0, d: 0 };
  const camara = claveCampeon(pg.desglose?.campeon ?? m.ficha?.jugador?.campeonDelSplit) ?? 'Anivia';
  const anio = it.anio ?? m.anio;
  const proxima = (rondas[rondas.length - 1]?.ronda ?? 0) + 1;

  // ---------- el player: la ventana al mundo (la luz del Mundial y el splash vivo son el "video") ----------
  const pipNodo = (r) => {
    const gano = r.ganador === org;
    const otro = r.a === org ? r.b : r.a;
    return el('li', { 'data-res': gano ? 'W' : 'L', title: `Ronda ${r.ronda}: ${gano ? 'le ganaste a' : 'perdiste con'} ${otro}${r.p != null ? ` · tenías ${pct(r.p)}` : ''}` }, [
      el('span', { text: `R${r.ronda}` }), el('b', { text: gano ? 'V' : 'D' }), el('small', { text: otro }),
    ]);
  };
  const r5 = el('li', { 'data-res': 'vivo' }, [el('span', { text: `R${proxima}` }), el('b', { text: '?' }), el('small', { text: rival })]);
  const camino = el('ol', { class: 'swiss-camino', 'aria-label': `Swiss: vas ${rec.v}-${rec.d}` }, [...rondas.map(pipNodo), r5]);
  const recViejo = el('span', { text: `${rec.v}-${rec.d}` });
  const vom = el('div', { class: 'vom' }, [
    el('p', { class: 'vom-band', text: 'Vida o muerte' }),
    el('p', { class: 'vom-sub' }, [el('b', { class: 'vom-rec num' }, recViejo), el('span', { text: `vs ${rival}` }), ligaRival ? el('small', { text: ligaRival }) : null]),
  ]);
  const cabPlayer = el('div', { class: 'player-cab' }, [
    el('span', { class: 'en-vivo' }, [el('i'), 'En vivo']),
    el('span', { class: 'eq-kicker', text: `Tribuna · Mundial ${anio} · Swiss` }),
  ]);

  // ---------- la parada: el panel abajo a la izquierda (cabecera + opciones | previa) ----------
  const cab = cabecera({ rotulo: [`Mundial ${anio}`, `Swiss · ronda ${proxima} · Bo1`], titulo: dec.titulo, descripcion: dec.descripcion });
  const ICONOS = { charla: 'charla', sinCharla: 'sinCharla' };
  const insp = el('p', { class: 'sw-insp', 'aria-live': 'polite' });
  const filas = ops.map((o, i) => el('button', { class: 'opcion sw-opcion', type: 'button', 'data-atajo': String(i + 1), 'aria-describedby': `desc-sw-${i + 1}` }, [
    el('span', { class: 'op-tecla', text: String(i + 1) }), icono(ICONOS[o.id] ?? 'serie'), el('span', { class: 'op-label', text: o.label }),
  ]));
  let apuntada = 0;
  const apuntar = (i, mover = false) => {
    apuntada = Math.max(0, Math.min(ops.length - 1, i));
    insp.textContent = ops[apuntada]?.descripcion ?? '';
    filas.forEach((b, j) => b.classList.toggle('apuntada', j === apuntada));
    if (mover) filas[apuntada].focus({ preventScroll: true });
  };
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (i !== apuntada) amb.pulso('apuntar');
      apuntar(i);
    });
    f.addEventListener('focus', () => apuntar(i));
    f.addEventListener('click', () => elegir(i + 1));
  });
  const opsNodo = el('div', { class: 'sw-opciones', role: 'group', 'aria-label': 'Opciones' }, filas);
  const ocultas = el('div', { class: 'sr' }, ops.map((o, i) => el('div', { id: `desc-sw-${i + 1}`, text: o.descripcion ?? '' })));
  const previa = el('div', { class: 'sw-previa' }, [
    el('p', { class: 'eq-kicker', text: 'La previa' }),
    el('p', { class: 'sw-p', 'aria-label': pg.textoProbabilidad }, [el('b', { class: 'num', text: `${pg.porcentaje ?? Math.round((pg.p ?? 0) * 100)}%` }), el('span', { text: 'de ganar' })]),
    el('span', { class: 'sw-medidor', style: { '--v': String(pg.p ?? 0) } }, el('i')),
    el('p', { class: 'sw-vs' }, [el('b', { class: 'num', text: pg.propio?.texto ?? '' }), ` ${orgVista} vs ${rival} `, el('b', { class: 'num', text: pg.rival?.texto ?? '' })]),
    pg.nota ? el('p', { class: 'sw-nota' }, [icono('charla'), pg.nota]) : null,
  ]);
  const parada = el('section', { class: 'sw-parada', 'data-pieza': 'decision', 'aria-label': dec.titulo }, [
    cab.nodo,
    el('div', { class: 'sw-cuerpo' }, [el('div', { class: 'sw-col' }, [opsNodo, insp]), previa]),
    ocultas,
  ]);
  apuntar(0);

  const juego = el('div', { class: 'juego sw-juego', 'aria-live': 'polite' });
  const player = el('div', { class: 'player' }, [cabPlayer, vom, camino, parada, juego]);

  // ---------- el chat ----------
  const chat = chatSwiss(m, { handle, org: orgVista, rival, ligaRival, rec, rondas, camara: fichaDe(datos, camara).nombre }, 'antes');
  const pista = el('div', { class: 'chat-pista' }, chat.lista);
  const chatModo = el('span', { class: 'chat-modo', text: 'modo lento: no' });
  const aside = el('aside', { class: 'chat', 'aria-label': 'Chat de la Tribuna' }, [
    el('header', { class: 'chat-cab' }, [icono('chat'), el('b', { text: 'Chat' }), chatModo]),
    pista,
    el('footer', { class: 'chat-pie' }, [el('span', { text: 'Mandá un mensaje' }), el('kbd', { text: 'Enter' })]),
  ]);
  const tribuna = el('div', { class: 'tribuna' }, [player, aside]);

  const raiz = el('section', { class: 'parada partido swiss', 'data-pieza': 'partido', 'data-forma': 'tribuna', 'data-muestra': muestra });
  const frN = franja(fr, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });
  const tray = trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad);
  raiz.append(frN, tribuna, cuartos('mundo', null, tray));

  // ---------- entrada: la luz, la banda, el camino, la parada; el chat ya corre ----------
  function entrada() {
    entrar(frN, 0, -10);
    anim(tribuna, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
    anim(vom.querySelector('.vom-band'), [{ opacity: 0, transform: 'scaleX(0.3)', letterSpacing: '0.4em' }, { opacity: 1, transform: 'none' }], { delay: 160, duration: 420, easing: EXPO });
    anim(vom.querySelector('.vom-sub'), [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: 340, duration: 300, easing: EXPO });
    camino.querySelectorAll('li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: 380 + i * 60, duration: 240, easing: EXPO }));
    if (!quieto()) r5.animate([{ boxShadow: `inset 0 0 0 1px ${rgbDe('--luz')}` }, { boxShadow: `inset 0 0 0 1px ${rgbDe('--luz')}, 0 0 0 4px ${rgbDe('--bg-raised')}` }], { duration: 900, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
    anim(parada, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], { delay: 480, duration: 320, easing: EXPO });
    entrar(cab.rotulo, 560, 8);
    lineasConMascara(cab.titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 600 + i * 70, dur: 420 }));
    filas.forEach((f, i) => entrar(f, 760 + i * 60, 12));
    entrar(previa, 800, 8);
    chat.animar();
    esperar(raiz, 900).then(() => amb.aquietar(true));
    if (quieto()) amb.aquietar(true);
  }

  let elegida = 0;
  let saltar = null;
  function elegir(n) {
    const op = ops[n - 1];
    if (!op || elegida) return;
    elegida = n;
    const r = m.resultados?.find((x) => x.opcionId === op.id);
    const logs = r?.inmediato?.logs ?? [];
    const partido = logs.find((l) => l.etapa === 'swiss' && l.ronda != null);
    const antes = logs.slice(0, Math.max(0, logs.indexOf(partido))).filter((l) => !l.etapa && !l.mundial);
    const fin = logs.find((l) => l.mundial) ?? (logs[logs.length - 1] !== partido ? logs[logs.length - 1] : null);
    const otro = m.resultados?.find((x) => x.opcionId !== op.id);
    const pOtro = otro?.inmediato?.logs?.find((l) => l.etapa === 'swiss' && l.ronda != null)?.p;
    const gano = partido?.resultado === 'W';
    const recFinal = fin?.mundial?.record ?? `${gano ? rec.v + 1 : rec.v}-${gano ? rec.d : rec.d + 1}`;
    const fuera = fin?.mundial?.resultado === 'eliminado';
    amb.pulso('peligro');
    amb.aquietar(false);
    sonido?.clic();
    player.dataset.jugando = '';
    filas[n - 1].classList.add('apuntada');
    anim(parada, [{ opacity: 1, visibility: 'visible', transform: 'none' }, { opacity: 0, visibility: 'visible', transform: 'translateY(26px)' }], { delay: 120, duration: 280, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });

    let t = 380;
    juego.replaceChildren();
    // la charla (si la usaste) como zocalo de la transmision
    for (const l of antes) {
      const z = el('div', { class: 'zocalo' }, [el('span', { class: 'eq-kicker' }, [icono('coach'), 'Vestuario']), el('p', { text: l.message })]);
      juego.append(z);
      ventanaDeTiempo(z, t, 820, { entra: 0.14, sale: 0.86 });
      t += 720;
    }
    // el Bo1 en juego: tu chance real, que no cambia lo que sale
    const enJuego = el('div', { class: 'zocalo zocalo-juego' }, [
      el('span', { class: 'eq-kicker' }, [el('i', { class: 'punto-vivo' }), 'En juego · Bo1']),
      el('p', {}, el('b', { text: `${orgVista} vs ${rival}` })),
      el('span', { class: 'sw-medidor', style: { '--v': String(partido?.p ?? 0) } }, el('i')),
      el('small', { text: `tu chance: ${pct(partido?.p)}` }),
    ]);
    juego.append(enJuego);
    ventanaDeTiempo(enJuego, t, 980, { entra: 0.1, sale: 0.9 });
    anim(enJuego.querySelector('.sw-medidor i'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: t + 120, duration: 600, easing: EXPO });
    const tPost = t + 920;
    // el post-game: DERROTA (o VICTORIA)
    const post = el('div', { class: 'postgame sw-post', 'data-res': partido?.resultado ?? 'L' }, [
      emblema(gano),
      el('p', { class: 'pg-titulo', text: gano ? 'Victoria' : 'Derrota' }),
      el('p', { class: 'pg-sub' }, [el('b', { class: 'num', text: recFinal }), el('span', { text: `Swiss · ronda ${partido?.ronda ?? proxima}` })]),
    ]);
    juego.append(post);
    ventanaDeTiempo(post, tPost, 1300, { entra: 0.1, sale: 0.84 });
    anim(post.querySelector('.emblema'), [{ transform: 'scale(0.5) rotate(-16deg)' }, { transform: 'none' }], { delay: tPost, duration: 520, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
    anim(post.querySelector('.pg-titulo'), [{ letterSpacing: '0.3em', filter: 'blur(8px)' }, { letterSpacing: '0.02em', filter: 'none' }], { delay: tPost, duration: 460, easing: EXPO });
    // el camino: la ronda en vivo se resuelve; el record rueda
    const res5 = el('span', { class: 'r5-res', 'data-res': partido?.resultado ?? 'L' }, el('b', { text: gano ? 'V' : 'D' }));
    r5.append(res5);
    r5.dataset.res = partido?.resultado ?? 'L';
    anim(res5, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'none' }], { delay: tPost + 200, duration: 320, easing: EXPO });
    const recNuevo = el('span', { class: 'vom-nuevo', text: recFinal });
    vom.querySelector('.vom-rec').append(recNuevo);
    recViejo.style.opacity = '0';
    anim(recViejo, [{ opacity: 1 }, { opacity: 0 }], { delay: tPost + 120, duration: 160 });
    anim(recNuevo, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: tPost + 160, duration: 260, easing: EXPO });
    // la luz cae (sin color, sin latido) y AFUERA entra despacio: el takeover de A, con la decision que fue real
    const tCae = tPost + 260;
    const tAfuera = tPost + 1250;
    amb.ambiente({ animo: fuera ? 'caida' : 'gloria', retardo: quieto() ? 0 : tCae });
    // el post-game es un momento del mundo; AFUERA es un takeover: el mundo va al 100 % y se queda
    amb.momento?.({ retardo: quieto() ? 0 : tPost, dura: tAfuera - tPost });
    amb.takeover?.(quieto() ? 0 : tAfuera - 160);
    const cambios = (r?.inmediato?.cambios ?? []).filter((c) => ETQ_CAMBIO[c.campo] && Math.round(c.antes) !== Math.round(c.despues));
    const afuera = el('div', { class: 'sw-afuera', 'data-fuera': fuera ? '' : null }, [
      el('p', { class: 'eq-kicker', text: `Mundial ${anio} · Swiss · fin de la transmisión` }),
      el('p', { class: 'sw-afuera-t', text: fuera ? 'Afuera' : 'Adentro' }),
      el('p', { class: 'sw-afuera-rec' }, [el('b', { class: 'num', text: recFinal.replace('-', '–') }), el('span', { text: fin?.message ?? partido?.message ?? '' })]),
      el('div', { class: 'sw-dos-p' }, [
        el('p', { 'data-elegida': '' }, [el('span', { text: op.label }), el('b', { class: 'num', text: pct(partido?.p) })]),
        pOtro != null ? el('p', {}, [el('span', { text: otro.label }), el('b', { class: 'num', text: pct(pOtro) })]) : null,
        el('small', { text: 'tu chance en ese Bo1: la decisión movió el número, el dado salió igual' }),
      ]),
      cambios.length ? el('div', { class: 'res-numeros sw-cambios' }, cambios.map((c) => {
        const [ico, et] = ETQ_CAMBIO[c.campo];
        const a = Math.round(c.antes);
        const b = Math.round(c.despues);
        return el('div', { class: 'res-num' }, [
          el('span', { class: 'rn-rotulo' }, [icono(ico === 'mundo' ? 'mundo' : glifoDeCampo(c.campo)), et]),
          el('span', { class: 'rn-fila' }, [el('span', { class: 'rn-antes', text: num(a) }), icono('flecha'), el('b', { class: 'rn-valor', 'data-desde': String(a), 'data-hasta': String(b), text: num(b) }), el('span', { class: `rn-delta ${b > a ? 'sube' : 'baja'}` }, [triangulos('baja', b > a ? '+' : '-'), conSigno(b - a)])]),
        ]);
      })) : null,
      el('button', { type: 'button', class: 'boton', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]),
    ]);
    juego.append(afuera);
    anim(afuera, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible' }], { delay: tAfuera - 160, duration: 420 });
    anim(afuera.querySelector('.sw-afuera-t'), [{ opacity: 0, letterSpacing: '0.4em', filter: 'blur(16px)' }, { opacity: 1, letterSpacing: '-0.01em', filter: 'none' }], { delay: tAfuera, duration: 1100, easing: EXPO });
    afuera.querySelectorAll('.eq-kicker, .sw-afuera-rec, .sw-dos-p p, .sw-dos-p small, .sw-cambios, .boton').forEach((x, i) => entrar(x, tAfuera + 260 + i * 90, 10));
    afuera.querySelectorAll('.rn-valor[data-desde]').forEach((v) => odometro(v, Number(v.dataset.desde), Number(v.dataset.hasta), { delay: tAfuera + 700, dur: 1000 }));
    // el chat: nervioso, el partido, la derrota con respeto y despues el silencio
    const chat2 = chatSwiss(m, { handle, org: orgVista, rival, ligaRival, rec, rondas, camara: fichaDe(datos, camara).nombre, tPost, tFin: tAfuera, gano }, 'despues');
    pista.replaceChildren(chat2.lista);
    chat2.animar();
    chatModo.textContent = 'transmisión terminada';
    anim(chatModo, [{ opacity: 0 }, { opacity: 1 }], { delay: tAfuera, duration: 200 });
    saltar = () => {
      for (const a of raiz.getAnimations({ subtree: true })) {
        try {
          if (a.effect?.getTiming().iterations !== Infinity) a.finish();
        } catch {
          /* sin fin */
        }
      }
      amb.ambiente({ animo: fuera ? 'caida' : 'gloria', instantaneo: true });
      saltar = null;
    };
    esperar(raiz, tAfuera + 1200).then(() => {
      saltar = null;
      afuera.querySelector('.boton')?.focus({ preventScroll: true });
    });
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= ops.length && !elegida) {
      e.preventDefault();
      elegir(Number(e.key));
    } else if ((e.key === 'Escape' || e.code === 'Space') && saltar) {
      e.preventDefault();
      saltar();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegida) {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), true);
    } else if ((e.key === 'r' || e.key === 'R') && elegida) window.vitrina?.repetir();
  }

  return {
    nodo: raiz,
    entrar: entrada,
    elegir,
    tecla,
    arte: camara,
    animo: 'normal',
    encuadre: celular() ? 'celular' : 'tribuna',
    velo: 0.4,
  };
}

// El chat de la Tribuna, determinista (comun/azar.js) y armado con los datos reales; nada ofensivo.
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
  // un mazo: no repite hasta agotar (el orden lo baraja el PRNG con Fisher-Yates)
  const mazo = (lista) => {
    let pila = [];
    return () => {
      if (!pila.length) {
        pila = [...lista];
        for (let i = pila.length - 1; i > 0; i--) {
          const j = az.entero(0, i);
          [pila[i], pila[j]] = [pila[j], pila[i]];
        }
      }
      return pila.pop();
    };
  };
  const deNervios = mazo(nervios);
  const dePartido = mazo(partido);
  const deDespues = mazo(despues);
  if (fase === 'antes') {
    for (let i = 0; i < 40; i++) {
      tt = i < 12 ? 0 : tt + (tt < 900 ? az.entre(60, 110) : az.entre(110, 200));
      items.push({ t: tt, texto: deNervios() });
    }
  } else {
    const fin = d.tFin ?? 4000;
    const post = d.tPost ?? 2600;
    for (let i = 0; i < 14; i++) items.push({ t: 0, texto: deNervios() });
    while (tt < post) {
      tt += az.entre(70, 140);
      items.push({ t: Math.min(tt, post - 1), texto: tt < post - 1400 ? deNervios() : dePartido() });
    }
    let paso = 120;
    while (tt < fin + 1200) {
      tt += paso;
      paso *= 1.35;
      items.push({ t: tt, texto: d.gano ? dePartido() : deDespues() });
    }
    items.push({ t: tt + 400, texto: null });
  }
  const T = Math.max(...items.map((x) => x.t)) + 1;
  const lista = el('ol', { class: 'chat-lista' }, items.map((x) => (x.texto == null
    ? el('li', { class: 'chat-msg chat-sistema', text: 'Fin de la transmisión · gracias por mirar' })
    : el('li', { class: 'chat-msg', 'data-tono': ['a', 'b', 'c'][az.entero(0, 2)] }, [
      el('b', { text: `${az.elegir(nombres)}${az.elegir(colas)}` }), ' ',
      ...x.texto.split(/(:[A-Z]+:)/).filter(Boolean).map((p) => (/^:[A-Z]+:$/.test(p) ? el('span', { class: 'emote', text: p.slice(1, -1) }) : p)),
    ]))));
  function animar() {
    const alto = parseFloat(getComputedStyle(lista).getPropertyValue('--alto-msg')) || 30;
    const N = items.length;
    const yaEstaban = items.filter((x) => x.t === 0).length;
    const cuadros = [{ offset: 0, transform: `translateY(${(N - yaEstaban) * alto}px)` }];
    items.forEach((x, i) => {
      if (x.t > 0) cuadros.push({ offset: x.t / T, transform: `translateY(${(N - 1 - i) * alto}px)`, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    });
    cuadros.push({ offset: 1, transform: 'translateY(0px)' });
    anim(lista, cuadros, { duration: T });
  }
  return { lista, animar };
}
