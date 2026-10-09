// La cumbre. Título: se vive en un stream a pantalla completa ("Tribuna", la plataforma de FARO) con el chat cayendo;
// pico <= 2,4 s, salteable. Final: la PC se apaga (CRT) y queda el salón de la fama: la carta de la carrera y la
// ventana carrera.log. Todo el movimiento es WAAPI creado de una vez: congelar(ms) muestra cualquier instante.
import { cargarImagen, urlSplash, urlCarga, urlIcono } from '../../comun/arte.js';
import { crearAzar } from '../../comun/azar.js';
import { el, svg, anim, bucle, entero } from './util.js';
import { icono, logoFaro, barraMenu, dock } from './os.js';

const PICO = 2400;

export function pintarCumbre(raiz, cual, ctx) {
  return cual === 'final' ? salon(raiz, ctx) : stream(raiz, ctx);
}

// ---------- el stream ----------
function stream(raiz, ctx) {
  const t = ctx.datos.titulo;
  const log = t.log;
  const meta = ctx.meta;
  const ultimoMapa = log.mapas[log.mapas.length - 1];
  const camara = ultimoMapa?.campeon ?? ctx.mainDelHeroe();
  const yo = t.plantel.find((p) => p.esJugador);
  const [nos, ellos] = log.marcador;
  const peor = ctx.peor;
  const handle = peor ? peor.handle : yo?.handle;
  const org = peor ? peor.org?.nombre : t.org;

  ctx.fondo({ era: ctx.era, arte: camara, org, animo: 'gloria', quieto: true });

  const foto = el('div', { class: 'camara' });
  const flash = el('div', { class: 'stream-flash', 'aria-hidden': 'true' });
  const marcador = el('div', { class: 'marcador' },
    el('span', { class: 'mc-eq mc-nos' }, org, el('b', {}, String(nos))),
    el('ol', { class: 'mc-mapas', 'aria-label': 'Mapas de la serie' }, ...log.mapas.map((mp) => {
      const li = el('li', { 'data-res': mp.resultado, title: `Mapa ${mp.mapa}: ${mp.campeon} · ${mp.resultado === 'W' ? 'ganado' : 'perdido'} · ${mp.marcador}` });
      cargarImagen(urlIcono(mp.campeon, meta)).then((img) => { if (img) { const c = img.cloneNode(); c.alt = mp.campeon; li.prepend(c); } });
      li.append(el('span', {}, mp.resultado === 'W' ? 'G' : 'P'));
      return li;
    })),
    el('span', { class: 'mc-eq mc-ellos' }, el('b', {}, String(ellos)), log.rival));
  const titulo = el('div', { class: 'campeones', 'data-foco': '' },
    el('p', { class: 'camp-kicker' }, `${t.titulo.nombre} ${t.titulo.anio} · ${log.ronda === 'final' ? 'Gran final' : log.ronda}`),
    el('h1', { class: 'camp-titulo' }, ...'CAMPEONES'.split('').map((c) => el('span', {}, c))),
    el('p', { class: 'camp-sub' }, log.message));
  const lower = el('ol', { class: 'lower', 'aria-label': 'Plantel' }, ...t.plantel.map((p) => el('li', { 'data-yo': p.esJugador ? 'si' : null },
    el('span', { class: 'lw-rol' }, p.rol), el('b', {}, p.esJugador ? handle : p.handle))));
  const player = el('div', { class: 'player' }, foto, flash,
    el('div', { class: 'player-cab' }, el('span', { class: 'vivo' }, el('i'), 'EN VIVO'), el('span', {}, `${t.titulo.liga} ${t.titulo.anio}`)),
    marcador, titulo, lower);

  // el chat
  const chat = chatDelTitulo(t, handle, org);
  const aside = el('aside', { class: 'chat', 'aria-label': 'Chat del stream' },
    el('header', { class: 'chat-cab' }, icono('chat', 'ico ico-chico'), 'Chat del stream', el('span', { class: 'chat-modo' }, 'solo emotes: no')),
    el('div', { class: 'chat-pista' }, chat.lista),
    el('footer', { class: 'chat-pie' }, el('span', {}, 'Mandá un mensaje'), el('kbd', {}, 'Enter')));

  const saltar = el('button', { class: 'stream-boton', type: 'button' }, 'Saltar', el('kbd', {}, 'Esc'));
  const seguir = el('button', { class: 'stream-boton primario', type: 'button', onclick: () => window.vitrina?.muestra('final') }, 'Al salón de la fama', icono('flecha', 'ico ico-chico'));
  const raizStream = el('div', { class: 'stream', 'data-pieza': 'cumbre' },
    el('header', { class: 'stream-barra' }, logoFaro(), el('span', { class: 'stream-app' }, 'Tribuna'), el('span', { class: 'stream-canal' }, `${org} vs ${log.rival}`),
      el('span', { class: 'stream-der' }, saltar, seguir)),
    el('div', { class: 'stream-cuerpo' }, player, aside));
  raiz.append(raizStream);

  const listo = cargarImagen(urlSplash(camara, meta)).then((img) => {
    if (!img) return;
    const c = img.cloneNode();
    c.alt = '';
    c.className = 'camara-img';
    foto.append(c);
    bucle(c, [{ transform: 'scale(1.06) translate3d(0, 0, 0)' }, { transform: 'scale(1.14) translate3d(-1.5%, 1%, 0)' }], { duration: 16000, direction: 'alternate', easing: 'ease-in-out' });
    anim(c, [{ filter: 'blur(14px) brightness(2.2)', opacity: 0.4 }, { filter: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  });

  // el pico: corte de cámara, CAMPEONES, el marcador, el plantel, el chat a full
  anim(flash, [{ opacity: 0.85 }, { opacity: 0 }], { duration: 380, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
  titulo.querySelectorAll('.camp-titulo span').forEach((s, i) => anim(s, [
    { opacity: 0, transform: 'translateY(0.35em) scale(1.5)', filter: 'blur(10px)' },
    { opacity: 1, transform: 'translateY(-0.03em) scale(0.98)', filter: 'blur(0)', offset: 0.7 },
    { opacity: 1, transform: 'none', filter: 'blur(0)' },
  ], { delay: 120 + i * 34, duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' }));
  anim(titulo.querySelector('.camp-kicker'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: 520, duration: 320 });
  anim(titulo.querySelector('.camp-sub'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: 640, duration: 320 });
  anim(marcador, [{ opacity: 0, transform: 'translateY(-24px)' }, { opacity: 1, transform: 'none' }], { delay: 260, duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  lower.querySelectorAll('li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateX(-28px)' }, { opacity: 1, transform: 'none' }], { delay: 760 + i * 60, duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }));
  anim(seguir, [{ opacity: 0 }, { opacity: 1 }], { delay: PICO - 200, duration: 300 });
  chat.animar();
  ctx.amb?.pulso('gloria');

  function terminarPico() {
    for (const a of raizStream.getAnimations({ subtree: true })) if (a.effect?.getTiming().iterations !== Infinity) a.finish();
    seguir.focus({ preventScroll: true });
  }
  saltar.addEventListener('click', terminarPico);
  const tecla = (e) => { if (e.key === 'Escape') terminarPico(); };
  document.addEventListener('keydown', tecla);
  return { listo, destruir: () => document.removeEventListener('keydown', tecla) };
}

// mensajes y emotes generados con comun/azar.js (determinista) a partir de la serie real; nada ofensivo
function chatDelTitulo(t, handle, org) {
  const az = crearAzar(`chat-${t.titulo.nombre}-${t.titulo.anio}`);
  const m = t.log.mapas;
  const perdido = m.find((x) => x.resultado === 'L');
  const cierre = m[m.length - 1];
  const guardado = t.serieFinal?.guardado;
  const frases = [
    ':COPA: :COPA: :COPA:', 'CAMPEONES', 'É CAMPEÃO', `${org.toUpperCase()} ${org.toUpperCase()}`, 'VAMOOOOO', ':GG:',
    `${handle} ídolo`, `${handle.toUpperCase()} ${handle.toUpperCase()}`, `ese ${cierre.campeon} no es de este planeta`,
    `${t.log.marcador.join('-')} y a casa`, `GG ${t.log.rival}, dignos`, 'llorando en el bondi', 'mi vieja dijo que era una fase',
    'o mid é brabo demais', 'clip it clip it', 'alguien grabó eso??', ':FUEGO:', 'que final, por favor', ':GG: :GG:',
    perdido ? `perdimos el ${perdido.mapa} con ${perdido.campeon} y después nada` : 'ni un mapa regalado',
    guardado ? `guardaron a ${guardado} y ni hizo falta` : 'el plan salió perfecto', `${t.titulo.nombre} ${t.titulo.anio} ES NUESTRO`,
    'me tiemblan las manos', 'hoy no se duerme', ':COPA:', 'GGWP', `${cierre.campeon} diff`, 'a cobrar las apuestas con mi primo',
  ];
  const nombres = ['tito', 'nacho', 'lu', 'sofi', 'beto', 'gabi', 'duda', 'caio', 'rafa', 'mel', 'juanma', 'bia', 'teo', 'pipe', 'lara', 'vini', 'flor', 'gui'];
  const colas = ['_br', '99', 'gg', '.mid', '_furioso', 'zinho', '777', '_lol', '', '2k', 'tv'];
  const N = 64;
  const T = 6400;
  const tiempos = [];
  let tt = 0;
  for (let i = 0; i < N; i++) {
    tt += tt < 400 ? az.entre(70, 130) : tt < 2000 ? az.entre(22, 58) : tt < 2600 ? az.entre(80, 160) : az.entre(140, 260);
    tiempos.push(Math.min(T - 1, tt));
  }
  const lista = el('ol', { class: 'chat-lista' }, ...tiempos.map((_, i) => {
    const quien = `${az.elegir(nombres)}${az.elegir(colas)}`;
    const texto = az.elegir(frases);
    const tono = ['a', 'b', 'c'][az.entero(0, 2)];
    return el('li', { class: 'chat-msg', 'data-tono': tono },
      el('b', {}, quien), ' ',
      ...texto.split(/(:[A-Z]+:)/).filter(Boolean).map((p) => (/^:[A-Z]+:$/.test(p) ? el('span', { class: 'emote' }, p.slice(1, -1)) : p)));
  }));
  function animar() {
    const alto = parseFloat(getComputedStyle(lista).getPropertyValue('--alto-msg')) || 30;
    const cuadros = [{ offset: 0, transform: `translateY(${N * alto}px)` }];
    tiempos.forEach((ti, i) => cuadros.push({ offset: ti / T, transform: `translateY(${(N - 1 - i) * alto}px)`, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }));
    cuadros.push({ offset: 1, transform: 'translateY(0px)' });
    anim(lista, cuadros, { duration: T });
  }
  return { lista, animar };
}

// ---------- el salón de la fama ----------
function salon(raiz, ctx) {
  const f = ctx.datos.final;
  const meta = ctx.meta;
  const main = ctx.mainDelHeroe();
  const peor = ctx.peor;
  const handle = peor ? peor.handle : f.jugador?.handle ?? 'Elurah89';
  const gr = f.goldenRoads?.length ? f.goldenRoads[0] : null;

  ctx.fondo({ era: ctx.era, arte: main, org: null, animo: 'gloria', quieto: false, encuadre: 'center 30%' });

  // la PC que se apaga (FARO de la era, con su barra y su isla)
  const crt = el('div', { class: 'crt', 'aria-hidden': 'true' },
    barraMenu({ app: 'Sistema', doc: null, tray: [], fecha: `${f.trayectoria.dominio[1]}` }),
    el('p', { class: 'crt-msg' }, logoFaro(), el('span', {}, `Apagando. Gracias por ${f.trayectoria.dominio[1] - 2026} años.`)),
    dock(null));

  const max = Math.max(...f.puntaje.componentes.map((c) => c.puntos));
  const componentes = el('ol', { class: 'componentes', 'aria-label': 'De dónde sale el puntaje' }, ...f.puntaje.componentes.map((c) => el('li', { title: c.detalle },
    el('span', { class: 'cp-et' }, c.etiqueta), el('span', { class: 'cp-barra', style: { '--v': String(c.puntos / max) } }), el('b', {}, entero(c.puntos)))));
  const sig = f.escalon?.siguiente;
  const texto = el('div', { class: 'salon-texto' },
    el('p', { class: 'salon-kicker' }, icono('apagar', 'ico ico-chico'), peor ? `${handle} · mid · se retiró a los ${f.tarjeta.edadRetiro}` : f.identidad),
    el('h1', { class: 'salon-titulo', 'data-foco': '' }, f.marco?.titulo ?? 'SE CIERRA UNA CARRERA'),
    el('p', { class: 'salon-sub' }, 'De dónde salen los puntos'),
    componentes,
    sig ? el('p', { class: 'escalon-sig' }, el('span', {}, `Siguiente escalón: ${sig.nombre}`), sig.enPasado) : null);

  const img = el('div', { class: 'carta-arte' });
  const carta = el('figure', { class: 'carta', 'data-golden': gr ? 'si' : null, 'aria-label': 'La carta de la carrera' },
    img,
    el('div', { class: 'carta-brillo', 'aria-hidden': 'true' }),
    el('div', { class: 'carta-top' },
      el('span', { class: 'rareza' }, icono('rareza', 'ico ico-chico'), f.escalon?.actual?.nombre ?? f.puntaje.nivel.nombre),
      gr ? el('span', { class: 'variante' }, `Golden Road ${gr}`) : null),
    el('figcaption', { class: 'carta-pie' },
      el('p', { class: 'carta-handle' }, handle),
      el('p', { class: 'carta-rol' }, `Mid · ${f.tarjeta.historia[0]?.desdeAnio ?? ''}–${f.trayectoria.dominio[1]}`),
      el('p', { class: 'carta-puntos' }, entero(f.puntaje.total)),
      el('p', { class: 'carta-ref' }, el('span', {}, 'puntos'), el('span', {}, `percentil ${f.puntaje.percentil}`))));

  const log = ventanaLog(f, peor);
  const escena = el('div', { class: 'salon', 'data-pieza': 'final' }, el('div', { class: 'salon-luz', 'aria-hidden': 'true' }), texto, carta, log, crt);
  raiz.append(escena);

  const listo = cargarImagen(urlCarga(main, meta)).then((im) => {
    if (!im) return;
    const c = im.cloneNode();
    c.alt = main;
    img.append(c);
  });

  // el apagado CRT y la entrada del salón
  anim(crt, [
    { opacity: 1, visibility: 'visible', transform: 'none', filter: 'none' },
    { opacity: 1, visibility: 'visible', transform: 'scale(1, 0.006)', filter: 'brightness(3)', offset: 0.55 },
    { opacity: 1, visibility: 'visible', transform: 'scale(0.002, 0.006)', filter: 'brightness(4)', offset: 0.9 },
    { opacity: 0, visibility: 'visible', transform: 'scale(0, 0)', filter: 'brightness(4)' },
  ], { delay: 120, duration: 560, easing: 'cubic-bezier(0.6, 0, 0.4, 1)' });
  anim(escena.querySelector('.salon-luz'), [{ opacity: 0 }, { opacity: 1 }], { delay: 640, duration: 520 });
  anim(texto, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { delay: 760, duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  anim(carta, [{ opacity: 0, transform: 'perspective(1200px) rotateY(-24deg) translateY(30px) scale(0.92)' }, { opacity: 1, transform: 'none' }], { delay: 700, duration: 620, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
  anim(log, [{ opacity: 0, transform: 'translateY(20px) scale(0.97)' }, { opacity: 1, transform: 'none' }], { delay: 900, duration: 400, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' });
  const curva = log.querySelector('.log-curva');
  if (curva) anim(curva, [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }], { delay: 980, duration: 480, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
  componentes.querySelectorAll('li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { delay: 900 + i * 50, duration: 260 }));
  bucle(carta.querySelector('.carta-brillo'), [{ transform: 'translateX(-60%) rotate(18deg)' }, { transform: 'translateX(160%) rotate(18deg)' }], { duration: 5200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
  return { listo };
}

// carrera.log: la cinta de orgs y la curva de nivel, con los títulos y el Golden Road
function ventanaLog(f, peor) {
  const tr = f.trayectoria;
  const [x0, x1] = tr.dominio;
  const W = 520;
  const H = 210;
  const yMin = 30;
  const yMax = 100;
  const X = (x) => 12 + ((x - x0) / (x1 - x0 + 1)) * (W - 24);
  const Y = (v) => 34 + (1 - (v - yMin) / (yMax - yMin)) * (H - 86);
  const pts = tr.puntos.map((p) => [X(p.x), Y(p.nivel)]);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const cx = (ax + bx) / 2;
    d += ` C${cx.toFixed(1)} ${ay.toFixed(1)} ${cx.toFixed(1)} ${by.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)} ${H - 46} L${pts[0][0].toFixed(1)} ${H - 46} Z`;
  const pico = tr.puntos.reduce((a, b) => (b.nivel > a.nivel ? b : a));
  const g = svg('svg', { class: 'log-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Nivel por split de ${x0} a ${x1}; pico ${pico.nivel} en ${Math.floor(pico.x)}` });
  for (const v of [50, 75, 100]) g.append(svg('line', { class: 'log-guia', x1: 12, x2: W - 12, y1: Y(v), y2: Y(v) }), svg('text', { class: 'log-eje', x: W - 12, y: Y(v) - 4, 'text-anchor': 'end' }, String(v)));
  if (tr.goldenRoads?.length) for (const a of tr.goldenRoads) g.append(svg('rect', { class: 'log-gr', x: X(a), y: 4, width: X(a + 1) - X(a), height: H - 50 }), svg('text', { class: 'log-gr-t', x: X(a) - 4, y: 14, 'text-anchor': 'end' }, `Golden Road ${a}`));
  g.append(svg('path', { class: 'log-area', d: area }), svg('path', { class: 'log-curva', d, pathLength: '1' }));
  for (const h of tr.hitos.filter((x) => x.tipo === 'titulo')) {
    const p = tr.puntos.filter((q) => Math.floor(q.x) === h.anio).reduce((a, b) => (!a || b.nivel > a.nivel ? b : a), null);
    if (p) g.append(svg('circle', { class: 'log-titulo', cx: X(p.x), cy: Y(p.nivel), r: 3.6 }));
  }
  g.append(svg('circle', { class: 'log-pico', cx: X(pico.x), cy: Y(pico.nivel), r: 5 }), svg('text', { class: 'log-pico-t', x: X(pico.x) + 9, y: Y(pico.nivel) - 8 }, `pico ${pico.nivel}`));
  tr.tramos.forEach((t, i) => {
    const a = X(t.desde);
    const b = i < tr.tramos.length - 1 ? X(tr.tramos[i + 1].desde) : X(t.hasta + 0.98);
    const org = peor && i === 3 ? peor.org.nombre : t.org;
    g.append(svg('rect', { class: `log-tramo t${i % 2}`, x: a, y: H - 40, width: Math.max(2, b - a - 2), height: 14, rx: 2 }));
    const cabe = Math.floor((b - a - 4) / 5.6);
    if (cabe >= 3) g.append(svg('text', { class: 'log-org', x: a + 2, y: H - 14 }, org.length > cabe ? `${org.slice(0, cabe - 1)}…` : org));
  });
  for (const a of [x0, 2032, 2036, 2040, x1]) g.append(svg('text', { class: 'log-anio', x: X(a), y: H - 46 + 0 - 2 }, String(a)));
  const reg = f.registro;
  const cifras = el('ul', { class: 'log-cifras' },
    el('li', {}, el('b', {}, entero(reg.titulos.length)), 'títulos'),
    el('li', {}, el('b', {}, entero(reg.internacionales.length)), 'internacionales'),
    el('li', {}, el('b', {}, entero(f.puntaje.hechos.splitsJugados)), 'splits'),
    el('li', {}, el('b', {}, `#${f.puntaje.hechos.rankPico}`), 'pico mundial'));
  // la vitrina de copas: los títulos agrupados por torneo (datos estructurados de trayectoria.titulos y .mundiales)
  const grupos = new Map();
  for (const t of tr.titulos ?? []) {
    const g = grupos.get(t.nombre) ?? { nombre: t.nombre, anios: [] };
    g.anios.push(t.anio);
    grupos.set(t.nombre, g);
  }
  const copas = el('ul', { class: 'log-copas' },
    ...(tr.mundiales ?? []).map((m) => el('li', { class: 'mundial' }, icono('copa', 'ico ico-chico'), el('b', {}, m.torneo), el('span', {}, m.org))),
    ...[...grupos.values()].map((g) => el('li', {}, icono('copa', 'ico ico-chico'),
      el('b', {}, g.anios.length > 1 ? `${g.nombre} ×${g.anios.length}` : g.nombre),
      el('span', {}, g.anios.length > 1 ? `${Math.min(...g.anios)}–${Math.max(...g.anios)}` : String(g.anios[0])))));
  const v = el('section', { class: 'ventana ventana-log', 'data-enfocada': 'si', 'aria-label': 'carrera.log' },
    el('div', { class: 'ventana-titulo' }, el('span', { class: 'ventana-app' }, icono('carrera', 'ico ico-chico'), el('span', {}, 'Terminal')), el('span', { class: 'ventana-doc' }, 'carrera.log'), el('span', { class: 'ventana-ctl', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'))),
    el('div', { class: 'ventana-cuerpo log-cuerpo' },
      el('p', { class: 'log-cmd' }, el('span', {}, '$'), ` cat carrera.log --desde ${x0} --hasta ${x1}`),
      g, cifras, copas));
  return v;
}
