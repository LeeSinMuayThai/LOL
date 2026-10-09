// El Partido.
// `serie` / `serieReplan`: la serie al Bo5 con Fearless. La firma es la PARED DE RETRATOS: el arte de carga de tus
// campeones, los libres encendidos en la luz de la era y los quemados apagados (sin color, sin luz, con su marca).
// Apuntar un retrato es el aura. Los planes son franjas: 5 barritas (la p de cada mapa) + el % de la serie. La previa
// general es un desglose chico. Elegir juega la serie MAPA A MAPA (4-5 s, salteable): tu pick contra el del rival,
// VICTORIA en luz de oro o DERROTA desaturada, el marcador rodando, la pared quemandose. En `serieReplan` ("te
// leyeron") la luz se quiebra un instante cuando entra el aviso.
// `swiss`: el 2-2 del Mundial, vida o muerte, a pantalla completa. Elegir juega el Bo1 y la eliminacion es la real:
// la luz cae y AFUERA entra con dignidad, con la p que habia antes del dado.
// Todo lo que se mueve al elegir se programa de una vez (WAAPI con retardo + el reloj del ambiente): congelar(t)
// fotografia cualquier instante de la serie.
import { cargarImagen, urlCarga } from '../../comun/arte.js';
import { el, entrar, animar, esperar, lineasConMascara, primeraOracion, num, conSigno, reducido, inst, celular, leerColor, duotono, odometro, plegar, EXPO, DUR } from './util.js';
import { icono, triangulos, glifoDeCampo } from './iconos.js';
import { franja, trayectoria, cuartos } from './marco.js';
import { claveCampeon } from './aura.js';

const PASO = 860; // cada mapa de la serie
const INICIO_MAPAS = 640; // el primer mapa, cuando el plan ya se volvio la cabecera
const SELLO = 400; // del pick al resultado del mapa
const RONDA = { final: 'La final', semis: 'Semifinal', cuartos: 'Cuartos', grupos: 'Fase de grupos' };
const ETQ_CAMBIO = { 'career.arraigo': ['arraigo', 'Arraigo'], 'player.stats.hype': ['hype', 'Hype'], 'player.worlds': ['mundo', 'Mundiales jugados'] };

const quieto = () => inst() || reducido();
const pct = (p) => `${Math.round(p * 100)}%`;
// Un token de color resuelto a canales sRGB para fotogramas de WAAPI (que no resuelven var()).
const rgbDe = (token) => `rgb(${leerColor(token).map((v) => Math.round(v * 255)).join(', ')})`;
// Sostiene un estado visual hasta `ms` (despues manda el CSS final): asi el desenlace no se ve antes de su momento.
const sostener = (nodo, estilo, ms) => animar(nodo, [estilo, estilo], { dur: ms, easing: 'linear' });

// ---------------------------------------------------------------- piezas compartidas
// El arte de carga (308x560, vertical) en el duotono de la era, recortado por la cara.
function pintarRetrato(canvas, img, era, foco = [0.5, 0.16]) {
  if (!img) return;
  duotono(img, leerColor('--bg-void'), leerColor(`--luz-${era}`), canvas.width, canvas.height, { canvas, foco, brillo: 1.12 });
}
const cargaDe = (key, meta) => cargarImagen(urlCarga(claveCampeon(key), meta));

// La previa general como desglose chico: la p grande, propio vs rival, y de que esta hecha la fuerza.
function previaGeneral(g, { titulo, kicker } = {}) {
  if (!g) return null;
  const max = Math.max(1, ...g.filas.map((f) => Math.max(0, f.valor)));
  const filas = el('ul', { class: 'pv-desglose', 'aria-label': 'De qué está hecha tu fuerza' }, g.filas.map((f) => {
    const w = Math.min(70, (Math.abs(f.valor) / max) * 70);
    return el('li', { class: f.valor < -0.5 ? 'baja' : f.valor > 0.5 ? 'sube' : 'neutro' }, [
      el('span', { class: 'pv-et', text: f.etiqueta }),
      el('span', { class: 'pv-barra', 'aria-hidden': 'true' }, el('i', { style: f.valor >= 0 ? { left: '30%', width: `${w}%` } : { right: '70%', width: `${Math.min(30, w)}%` } })),
      el('b', { class: 'pv-v', text: f.texto }),
    ]);
  }));
  const fuerzas = g.propio && g.rival
    ? el('div', { class: 'pv-fuerzas' }, [
        el('span', { class: 'pv-f' }, [el('span', { text: g.propio.nombre }), el('i', { style: { width: `${Math.min(100, g.propio.fuerza)}%` } }), el('b', { text: g.propio.texto })]),
        el('span', { class: 'pv-f rival' }, [el('span', { text: g.rival.nombre }), el('i', { style: { width: `${Math.min(100, g.rival.fuerza)}%` } }), el('b', { text: g.rival.texto })]),
      ])
    : null;
  return el('aside', { class: 'pv', 'aria-label': g.titulo }, [
    el('p', { class: 'pv-k' }, [el('i', { class: 'punto-luz' }), kicker ?? g.titulo]),
    el('div', { class: 'pv-p' }, [
      el('b', { class: 'pv-num', text: `${g.porcentaje}%` }),
      el('span', { class: 'pv-num-ref' }, [el('span', { text: 'de ganar' }), el('span', { text: titulo ?? g.subtitulo ?? '' })]),
    ]),
    fuerzas,
    filas,
    porQue(g),
  ]);
}
// La letra chica de la previa (porQue, nota) queda a un toque: en el DOM, plegada.
function porQue(g) {
  const textos = [g.porQue, g.nota].filter(Boolean);
  if (!textos.length) return null;
  const id = `pv-nota-${g.tipo ?? 'p'}-${g.porcentaje}`;
  const nota = el('p', { class: 'pv-nota', id, hidden: true, text: textos.join(' ') });
  const b = el('button', { type: 'button', class: 'btn-mas pv-porque', 'aria-expanded': 'false', 'aria-controls': id, text: 'por qué' });
  b.addEventListener('click', () => {
    nota.hidden = !nota.hidden;
    b.setAttribute('aria-expanded', String(!nota.hidden));
  });
  return el('div', { class: 'pv-pie' }, [b, nota]);
}

// La previa como TIRA chica (la serie): la p grande, propio vs rival y de que esta hecha, en una fila.
function previaTira(g, { titulo, kicker } = {}) {
  if (!g) return null;
  return el('div', { class: 'pv-tira', 'aria-label': g.titulo }, [
    el('div', { class: 'pv-p' }, [
      el('b', { class: 'pv-num', text: `${g.porcentaje}%` }),
      el('span', { class: 'pv-num-ref' }, [el('span', { text: 'de ganar' }), el('span', { text: titulo ?? '' })]),
    ]),
    g.propio && g.rival
      ? el('div', { class: 'pv-duelo' }, [
          el('span', { class: 'pv-k', text: kicker ?? '' }),
          el('span', {}, [el('span', { text: g.propio.nombre }), el('b', { text: g.propio.texto }), el('span', { class: 'pv-x', text: 'vs' }), el('b', { class: 'rival', text: g.rival.texto }), el('span', { text: g.rival.nombre })]),
        ])
      : null,
    el('ul', { class: 'pv-chips', 'aria-label': 'De qué está hecha tu fuerza' }, g.filas.map((f) => el('li', { class: f.valor < -0.5 ? 'baja' : f.valor > 0.5 ? 'sube' : 'neutro' }, [el('span', { text: f.etiqueta.replace('Tus compañeros', 'Compañeros') }), el('b', { text: f.texto })]))),
    porQue(g),
  ]);
}

// Opciones como franjas + UN inspector (la prosa de a una). `glifos(o, i)` dibuja lo estructurado de cada opcion.
function franjasDeOpciones(muestra, opciones, { glifos, lado, detalle }) {
  const lista = el('div', { class: 'opciones', role: 'group', 'aria-label': 'Opciones' });
  const filas = opciones.map((o, i) => {
    const desc = el('span', { class: 'sr', id: `desc-${muestra}-${o.id}` }, [o.descripcion, detalle?.(o) ? ` ${detalle(o)}` : '']);
    const b = el('button', { type: 'button', class: 'opcion', 'data-atajo': String(i + 1), 'data-id': o.id, 'aria-describedby': desc.id }, [
      el('span', { class: 'op-tecla', text: String(i + 1) }),
      el('span', { class: 'op-cuerpo' }, [el('span', { class: 'op-label', text: o.label }), el('span', { class: 'op-glifos' }, glifos(o, i))]),
      lado?.(o, i) ?? el('span'),
      desc,
    ]);
    lista.append(b);
    return b;
  });
  const inspector = el('div', { class: 'inspector', 'aria-live': 'polite' });
  let apuntada = 0;
  function pintar(i) {
    const o = opciones[i];
    inspector.textContent = '';
    const extra = detalle?.(o);
    inspector.append(el('p', { class: 'insp-kicker' }, [el('span', { class: 'insp-n', text: String(i + 1) }), o.label]), el('p', { class: 'insp-texto', text: o.descripcion }));
    if (extra) inspector.append(el('p', { class: 'insp-detalle', text: extra }));
  }
  function apuntar(i, mover = false) {
    apuntada = Math.max(0, Math.min(filas.length - 1, i));
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    pintar(apuntada);
    if (mover) filas[apuntada].focus({ preventScroll: true });
  }
  return {
    lista,
    inspector,
    filas,
    apuntar,
    get apuntada() {
      return apuntada;
    },
    conectar(amb, elegir) {
      filas.forEach((f, i) => {
        f.addEventListener('pointerenter', () => {
          if (celular()) return;
          if (i !== apuntada) amb.pulso('apuntar');
          apuntar(i);
        });
        f.addEventListener('focus', () => apuntar(i));
        f.addEventListener('click', () => elegir(i + 1));
      });
      apuntar(0);
    },
  };
}

function encabezado(muestra, { antes, alerta, rotulo, titulo, descripcion }) {
  const [primera, resto] = primeraOracion(descripcion ?? '');
  const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'planteo' }, [el('span', { class: 'planteo-1', text: primera }), resto ? el('span', { class: 'planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const a = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', a);
    btnMas.setAttribute('aria-expanded', String(a));
    btnMas.textContent = a ? 'menos' : 'más';
  });
  const h1 = el('h1', { class: 'titulo-parada', 'data-foco': '', tabindex: '-1', text: titulo });
  return {
    antes: antes ? el('p', { class: 'antes' + (alerta ? ' alerta' : ''), role: alerta ? 'alert' : null }, [icono(alerta ? 'alto' : 'serie'), el('span', { class: 'antes-texto' }, el('b', { text: antes }))]) : null,
    rotulo: el('p', { class: 'rotulo-cat' }, [el('i', { class: 'punto-luz' }), ...rotulo.map((r, i) => el('span', { class: i ? 'bisagra' : null, text: r }))]),
    titulo: h1,
    planteo,
  };
}

// Un marcador que rueda paso a paso (una animacion por lado, con fotogramas en el instante de cada mapa).
function marcadorRodante(pasos, inicial) {
  // pasos: [{ t, a, b }] con t en ms desde ahora; inicial: [a, b]
  const fin = pasos.length ? pasos[pasos.length - 1] : { a: inicial[0], b: inicial[1] };
  const col = (lado) => {
    const tira = el('span', { class: 'odo-tira' }, Array.from({ length: 10 }, (_, d) => el('span', { text: String(d) })));
    const v = lado === 0 ? fin.a : fin.b;
    tira.style.transform = `translateY(${-v * 10}%)`;
    const total = (pasos[pasos.length - 1]?.t ?? 0) + 500;
    const cuadros = [{ transform: `translateY(${-inicial[lado] * 10}%)`, offset: 0 }];
    let prev = inicial[lado];
    for (const p of pasos) {
      const v2 = lado === 0 ? p.a : p.b;
      if (v2 === prev) continue;
      cuadros.push({ transform: `translateY(${-prev * 10}%)`, offset: Math.min(1, p.t / total) });
      cuadros.push({ transform: `translateY(${-v2 * 10}%)`, offset: Math.min(1, (p.t + 420) / total), easing: 'linear' });
      prev = v2;
    }
    cuadros.push({ transform: `translateY(${-v * 10}%)`, offset: 1 });
    // el resorte va en cada tramo: se arma con easing por fotograma
    for (let k = 1; k < cuadros.length; k += 2) cuadros[k].easing = 'cubic-bezier(.3,1.5,.5,1)';
    if (pasos.length) animar(tira, cuadros, { dur: total, easing: 'linear' });
    return el('span', { class: 'odo-col', 'aria-hidden': 'true' }, tira);
  };
  return el('span', { class: 'pt-score odometro', 'aria-label': `${fin.a}-${fin.b}` }, [col(0), el('span', { class: 'odo-fijo', 'aria-hidden': 'true', text: '–' }), col(1)]);
}

// ================================================================================================= la serie (Fearless)
export function crearPartido(ctx) {
  return ctx.muestra === 'swiss' ? crearSwiss(ctx) : crearSerie(ctx);
}

function crearSerie({ datos, muestra, amb, sonido, peor }) {
  const m = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const replan = Boolean(m.esReplan || m.decision?.datos?.replan);
  const sc = m.serieEnCurso ?? m.acompanante?.datos?.serie ?? {};
  const rival = sc.rival?.org ?? m.previas?.general?.rival?.nombre ?? 'el rival';
  const g = m.previas?.general;
  const era = () => document.documentElement.dataset.era || 'escenario';
  const planes = m.decision.opciones;
  const pOpc = Object.fromEntries((g?.opciones ?? []).map((o) => [o.id, o]));
  const resultados = Object.fromEntries((m.resultados ?? []).map((r) => [r.opcionId, r]));
  const jugados = sc.mapas ?? [];
  const primerMapa = jugados.length + 1;

  // ---- la pared: tu pool (libres + tus picks + tus mains), primero los libres
  const libres = (m.acompanante?.datos?.libres ?? []).map(claveCampeon);
  const quemados = (m.quemadosAlParar ?? sc.quemados ?? []).map(claveCampeon);
  const mains = (datos.inicio?.jugador?.mains ?? []).map((x) => claveCampeon(x.ddragon));
  const tuyos = new Set([...libres, ...jugados.map((x) => claveCampeon(x.campeon)), ...mains]);
  const pool = [...libres, ...[...tuyos].filter((k) => !libres.includes(k))];
  const delRival = quemados.filter((k) => !tuyos.has(k));
  const marcaDe = (k) => {
    if (claveCampeon(sc.rivalJuega) === k) return { texto: 'Te lo leyeron', leido: true };
    const mp = jugados.find((x) => claveCampeon(x.campeon) === k);
    return mp ? { texto: `M${mp.mapa}` } : { texto: 'Quemado' };
  };
  const imgs = {};
  const retratos = {};
  const pared = el('figure', { class: 'pt-pared', 'aria-label': `Fearless: ${libres.length} libres, ${quemados.length} quemados` }, [
    el('figcaption', { class: 'pt-pared-k' }, [
      el('span', { text: 'Fearless · tus campeones' }),
      el('span', { class: 'pt-cuenta' }, [el('b', { text: String(libres.length) }), ' libres', el('i'), el('b', { text: String(pool.length - libres.length) }), ' quemados']),
    ]),
  ]);
  const fila = el('ol', { class: 'pt-retratos', style: { '--n': String(pool.length) } });
  const cargas = [];
  for (const k of pool) {
    const quemado = !libres.includes(k);
    const marca = quemado ? marcaDe(k) : null;
    const canvas = el('canvas', { width: '176', height: '560', 'aria-hidden': 'true' });
    const li = el('li', { class: 'pt-retrato', 'data-estado': quemado ? 'quemado' : 'libre', 'data-leido': marca?.leido ? '' : null }, [
      el('button', { type: 'button', class: 'pt-retrato-b', 'data-campeon': k, 'aria-label': `${k}${quemado ? `, quemado (${marca.texto})` : ', libre'}` }, [
        canvas,
        el('span', { class: 'pt-luz', 'aria-hidden': 'true' }),
        el('span', { class: 'pt-nom' }, [el('b', { text: k }), el('span', { class: 'pt-marca' }, quemado ? [icono('quemado'), marca.texto] : [])]),
      ]),
    ]);
    retratos[k] = li;
    fila.append(li);
    cargas.push(cargaDe(k, datos.meta).then((img) => {
      imgs[k] = img;
      pintarRetrato(canvas, img, era());
    }));
  }
  pared.append(fila);
  if (delRival.length) pared.append(el('p', { class: 'pt-rival-q' }, [icono('quemado'), 'Y del rival: ', ...delRival.flatMap((k, i) => [i ? ', ' : '', el('b', { class: 'campeon-foco', 'data-campeon': k, tabindex: '0', text: k })])]));

  // ---- encabezado
  const marcadorAhora = sc.marcador ?? [0, 0];
  const cab = encabezado(muestra, {
    antes: replan ? m.antes?.mensaje : null,
    alerta: replan,
    rotulo: [RONDA[sc.ronda] ?? 'La serie', `Bo${sc.formato ?? 5} · Fearless`, replan ? `Van ${marcadorAhora[0]}–${marcadorAhora[1]}` : 'Cada pick se quema'],
    titulo: m.decision.titulo,
    descripcion: m.decision.descripcion,
  });

  // ---- los planes: 5 barritas (la p de cada mapa que falta) + el % de la serie
  const barritas = (o) => {
    const ps = o.pMapas ?? [];
    const decisivo = (sc.formato ?? 5);
    // la barra mide desde el 50% (la moneda al aire) hasta el 100%: asi se ven las diferencias entre mapas
    return el('span', { class: 'pt-mapas', role: 'img', title: 'Cada barra: la p de ganar ese mapa, desde el 50%', 'aria-label': `Mapa a mapa: ${ps.map(pct).join(', ')}` }, ps.map((p, k) => {
      const n = primerMapa + k;
      const alto = Math.max(4, Math.min(100, ((p - 0.5) / 0.5) * 100));
      return el('span', { class: 'pt-m' + (n === decisivo ? ' decisivo' : '') + (p < 0.5 ? ' bajo' : '') }, [el('i', { style: { height: `${alto}%` } }), el('span', { class: 'pt-m-n', text: n === decisivo ? 'D' : `M${n}` })]);
    }));
  };
  const ops = franjasDeOpciones(muestra, planes, {
    glifos: (o) => [el('span', { class: 'eje' }, [icono(o.id in { guardar: 1, conTodo: 1, coach: 1 } ? o.id : 'serie'), el('span', { class: 'eje-nom', text: `el decisivo ${pct((o.pMapas ?? []).at(-1) ?? 0)}` })])],
    lado: (o) => el('span', { class: 'pt-lado' }, [barritas(o), el('span', { class: 'pt-serie' }, [el('b', { text: pct(o.pSerie) }), el('span', { text: 'la serie' })])]),
    detalle: (o) => pOpc[o.id]?.texto ?? null,
  });
  ops.lista.classList.add('pt-planes');

  // ---- la previa
  const previa = previaTira(g, { titulo: `el mapa ${primerMapa}`, kicker: replan ? `Van ${marcadorAhora[0]}–${marcadorAhora[1]} · la fuerza` : 'La fuerza' });

  // ---- montaje
  const raiz = el('section', { class: 'parada partido', 'data-pieza': 'decision', 'data-forma': 'serie', 'data-muestra': muestra, 'data-replan': replan ? '' : null });
  const fr = franja(m.franja, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });
  const col = el('div', { class: 'parada-col' }, [cab.antes, cab.rotulo, cab.titulo, cab.planteo, previa, ops.lista, ops.inspector]);
  if (celular()) col.insertBefore(pared, ops.lista);
  const historia = datos.final?.tarjeta?.historia ?? [];
  raiz.append(fr, col, celular() ? null : pared, trayectoria(historia, m.anio, m.edad), cuartos('temporada'));
  ops.conectar(amb, (n) => elegir(n));

  // ---- entrada: luz -> rotulo -> titulo -> planes escalonados; la pared se enciende retrato por retrato
  function entrada() {
    lineasConMascara(cab.titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 260 + i * 70, dur: 420 }));
    entrar(fr, 0, -10);
    if (replan) {
      // te leyeron: el aviso entra y la luz se quiebra un instante; despues, el replan
      amb.quiebre(quieto() ? 0 : 220);
      amb.ambiente({ animo: 'peligro' });
      amb.ambiente({ animo: 'normal', retardo: 1100 });
      animar(cab.antes, [{ opacity: 0, transform: 'translateX(-14px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none', offset: 0.35 }, { opacity: 1 }], { delay: 160, dur: 700 });
      const leido = raiz.querySelector('[data-leido]');
      if (leido) animar(leido, [{ filter: 'brightness(2.4)' }, { filter: 'none' }], { delay: 240, dur: 900, easing: 'ease-out' });
    }
    esperar(raiz, 700).then(() => amb.aquietar(true));
    if (quieto()) amb.aquietar(true);
    entrar(cab.rotulo, 120, 10);
    entrar(cab.planteo, 420, 10);
    ops.filas.forEach((f, i) => {
      entrar(f, 480 + i * 60, 16);
      f.querySelectorAll('.pt-m i').forEach((b, k) => animar(b, [{ transform: 'scaleY(0)' }, { transform: 'none' }], { delay: 560 + i * 60 + k * 40, dur: 520 }));
    });
    entrar(ops.inspector, 640, 8);
    if (previa) previa.querySelectorAll('.pv-p, .pv-duelo, .pv-chips li, .pv-pie').forEach((x, i) => entrar(x, 440 + i * 35, 8));
    entrar(pared.querySelector('.pt-pared-k'), 380, 8);
    fila.querySelectorAll('.pt-retrato').forEach((r, i) => {
      animar(r, [{ opacity: 0, clipPath: 'inset(100% 0 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { delay: 300 + i * 70, dur: 620 });
      animar(r.querySelector('.pt-luz'), [{ opacity: 1 }, { opacity: 0 }], { delay: 520 + i * 70, dur: 700, easing: 'ease-out' });
    });
  }

  // ---- elegir: el plan se vuelve la cabecera y la serie se juega mapa a mapa
  let elegido = false;
  let saltar = null;
  function elegir(n) {
    if (elegido) return;
    const o = planes[n - 1];
    if (!o) return;
    elegido = true;
    amb.pulso('elegir');
    amb.aquietar(false); // la serie en juego: la luz vuelve a estar viva
    sonido?.clic();
    const res = resultados[o.id];
    const logs = res?.inmediato?.logs ?? [];
    const mapas = logs.filter((l) => l.mapa);
    const fin = logs.find((l) => l.postSerie);
    const enc = res?.inmediato?.encadenaOtraParada;
    const T = (k) => INICIO_MAPAS + k * PASO;

    // la cabecera: el plan elegido, con su % de la serie
    const cabecera = el('div', { class: 'res-cab pt-cab' }, [el('span', { class: 'op-tecla', text: String(n) }), el('span', { class: 'op-label', text: o.label }), el('span', { class: 'res-tag', text: `Elegiste · ${pct(o.pSerie)} la serie` })]);
    // el tablero: los 5 mapas del Bo5
    const tablero = el('ol', { class: 'pt-tablero', 'aria-label': 'La serie, mapa por mapa' });
    const formato = sc.formato ?? 5;
    const pasos = [];
    for (let k = 1; k <= formato; k++) {
      const previo = jugados.find((x) => x.mapa === k);
      const ahora = mapas.find((x) => x.mapa === k);
      const d = previo ?? ahora;
      const li = el('li', { class: 'pt-slot', 'data-res': d ? d.resultado : 'nada', 'data-previo': previo ? '' : null, 'data-decisivo': k === formato ? '' : null }, [
        el('i', { class: 'pt-slot-luz', 'aria-hidden': 'true' }),
        el('span', { class: 'pt-slot-n' }, [`M${k}`, k === formato ? el('span', { class: 'pt-slot-d', text: ' · decisivo' }) : null]),
        d ? el('span', { class: 'pt-slot-vos campeon-foco', 'data-campeon': claveCampeon(d.campeon), tabindex: '0' }, [el('canvas', { width: '96', height: '132', 'aria-hidden': 'true' }), el('b', { text: d.campeon })]) : el('span', { class: 'pt-slot-vacio', 'aria-hidden': 'true' }),
        ahora?.rivalJuega ? el('span', { class: 'pt-slot-vs' }, ['vs ', el('b', { class: 'campeon-foco', 'data-campeon': claveCampeon(ahora.rivalJuega), tabindex: '0', text: ahora.rivalJuega })]) : el('span', { class: 'pt-slot-vs', text: previo ? 'ya jugado' : d ? '' : '—' }),
        d ? el('span', { class: 'pt-sello', text: d.resultado === 'W' ? 'Victoria' : 'Derrota' }) : null,
        ahora ? el('span', { class: 'pt-slot-p', text: `${pct(ahora.p)} antes` }) : null,
      ]);
      tablero.append(li);
      if (ahora) {
        const [a, b] = ahora.marcador.split('-').map(Number);
        pasos.push({ t: T(pasos.length) + SELLO, a, b, li, m: ahora });
      }
    }
    const marcador = marcadorRodante(pasos, marcadorAhora);
    const vs = el('p', { class: 'pt-vs' }, [el('b', { text: pc?.org?.nombre ?? m.org ?? '' }), marcador, el('b', { class: 'rival', text: rival })]);
    const ultimo = mapas[mapas.length - 1];
    const cierreTexto = fin?.message ?? (enc ? `${ultimo?.marcador ?? ''}: la serie sigue en «${enc.titulo}».` : ultimo?.message ?? '');
    const gano = fin ? fin.gano : null;
    const cierre = el('p', { class: 'pt-cierre', 'data-gano': gano == null ? 'sigue' : String(gano) }, [icono(gano == null ? 'serie' : gano ? 'copa' : 'alto'), el('span', { text: cierreTexto })]);
    const otra = el('button', { type: 'button', class: 'res-otra', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]);
    const juego = el('div', { class: 'resultado pt-juego', 'data-pieza': 'resultado', tabindex: '-1', 'aria-label': `Resultado: ${o.label}. ${cierreTexto}` }, [cabecera, vs, tablero, cierre, otra]);

    // las otras opciones se apagan, la elegida crece y se vuelve el tablero
    const r0 = ops.filas[n - 1].getBoundingClientRect();
    plegar(col, { fantasma: [cab.planteo, previa, ops.lista, ops.inspector], plegar: [cab.planteo, previa, ops.inspector], oculta: ops.filas[n - 1] });
    ops.lista.replaceWith(juego);
    const r1 = juego.getBoundingClientRect();
    animar(juego, [{ transform: `translateY(${r0.top - r1.top}px)`, clipPath: `inset(0 0 calc(100% - ${r0.height}px) 0)` }, { transform: 'none', clipPath: 'inset(0 0 0 0)' }], { dur: DUR.larga });
    entrar(vs, 200, 10);
    tablero.querySelectorAll('.pt-slot').forEach((s, k) => entrar(s, 300 + k * 40, 10));
    entrar(otra, T(pasos.length) + 300, 6);

    // los mapas ya jugados (replan) se pintan; los nuevos se juegan
    tablero.querySelectorAll('.pt-slot canvas').forEach((c) => {
      const key = c.parentElement.dataset.campeon;
      cargaDe(key, datos.meta).then((img) => pintarRetrato(c, img, era(), [0.5, 0.14]));
    });
    pasos.forEach((p, k) => {
      const t0 = T(k);
      const slot = p.li;
      animar(slot, [{ opacity: 0.35 }, { opacity: 1 }], { delay: t0, dur: 240 });
      animar(slot.querySelector('.pt-slot-vos'), [{ opacity: 0, transform: 'translateY(18px) scale(.94)' }, { opacity: 1, transform: 'none' }], { delay: t0, dur: 360 });
      animar(slot.querySelector('.pt-slot-vs'), [{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 120, dur: 300 });
      animar(slot.querySelector('.pt-slot-p'), [{ opacity: 0 }, { opacity: 1 }], { delay: t0 + 120, dur: 300 });
      const sello = slot.querySelector('.pt-sello');
      animar(sello, [{ opacity: 0, transform: 'scale(1.6)', letterSpacing: '0.5em', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: p.t, dur: 380 });
      // el resultado del mapa: la luz de oro o el apagon (el estado final vive en el CSS de data-res)
      if (p.m.resultado === 'W') animar(slot.querySelector('.pt-slot-luz'), [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1.06)', offset: 0.4 }, { opacity: 1, transform: 'none' }], { delay: p.t, dur: 520 });
      else animar(slot.querySelector('canvas'), [{ filter: 'none' }, { filter: 'grayscale(1) brightness(.45)' }], { delay: p.t, dur: 520 });
      if (p.m.resultado === 'W') amb.pulso('logro', p.t);
      // Fearless: tu pick y el del rival quedan quemados para los dos
      for (const [key, texto] of [[claveCampeon(p.m.campeon), `M${p.m.mapa}`], [claveCampeon(p.m.rivalJuega), `M${p.m.mapa} · ${rival}`]]) {
        const r = retratos[key];
        if (!r || r.dataset.estado === 'quemado') continue;
        r.dataset.estado = 'quemado';
        r.querySelector('.pt-marca').append(icono('quemado'), texto);
        r.querySelector('.pt-retrato-b').setAttribute('aria-label', `${key}, quemado (${texto})`);
        animar(r.querySelector('canvas'), [{ filter: 'none' }, { filter: 'grayscale(1) brightness(1.8)', offset: 0.18 }, { filter: 'grayscale(1) brightness(.34) contrast(.9)' }], { delay: p.t + 60, dur: 700, fill: 'backwards' });
        animar(r.querySelector('.pt-marca'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: p.t + 260, dur: 300 });
      }
    });
    // el contador de la pared sigue a los quemados
    const quemadosFin = pool.filter((k) => retratos[k].dataset.estado === 'quemado').length;
    const [cLibres, cQuemados] = pared.querySelectorAll('.pt-cuenta b');
    const tUltimaQuema = (pasos[pasos.length - 1]?.t ?? 0) + 60;
    odometro(cLibres, libres.length, pool.length - quemadosFin, { delay: tUltimaQuema, dur: 600 });
    odometro(cQuemados, pool.length - libres.length, quemadosFin, { delay: tUltimaQuema, dur: 600 });
    const tFin = (pasos[pasos.length - 1]?.t ?? INICIO_MAPAS) + 520;
    animar(cierre, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: tFin, dur: 420 });
    amb.ambiente({ animo: gano == null ? 'peligro' : gano ? 'gloria' : 'caida', retardo: quieto() ? 0 : tFin });
    if (gano) amb.pulso('gloria', tFin);
    saltar = () => {
      for (const a of raiz.getAnimations({ subtree: true })) {
        try {
          a.finish();
        } catch {
          /* sin fin */
        }
      }
      amb.ambiente({ animo: gano == null ? 'peligro' : gano ? 'gloria' : 'caida', instantaneo: true });
      saltar = null;
    };
    esperar(raiz, tFin + 400).then(() => {
      saltar = null;
      juego.focus({ preventScroll: true });
    });
    raiz.addEventListener('click', (e) => {
      if (saltar && !e.target.closest('button')) saltar();
    });
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= planes.length) {
      e.preventDefault();
      elegir(Number(e.key));
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegido) {
      e.preventDefault();
      ops.apuntar(ops.apuntada + (e.key === 'ArrowDown' ? 1 : -1), true);
    } else if ((e.code === 'Space' || e.key === 'Escape') && saltar) {
      e.preventDefault();
      saltar();
    } else if ((e.key === 'r' || e.key === 'R') && elegido) window.vitrina?.repetir();
  }

  return {
    nodo: raiz,
    entrar: entrada,
    elegir,
    tecla,
    listo: () => Promise.all(cargas),
    alCambiarEra(e) {
      for (const k of pool) pintarRetrato(retratos[k].querySelector('canvas'), imgs[k], e);
    },
    // la luz de la pantalla: tu campeon del split; en el replan, el que te leyeron (se quiebra con el aviso)
    arte: claveCampeon(replan ? sc.rivalJuega : m.ficha?.jugador?.campeonDelSplit) ?? mains[0],
    animo: 'normal',
    encuadre: 'partido',
    velo: 0.6,
  };
}

// ================================================================================================= el Swiss
function crearSwiss({ datos, muestra, amb, sonido, peor }) {
  const m = datos[muestra];
  const pc = peor ? datos.peorCaso : null;
  const g = m.previas?.general;
  const intl = m.internacional ?? m.acompanante?.datos?.internacional ?? {};
  const yo = intl.jugador ?? m.org;
  const enCurso = intl.partidoEnCurso ?? {};
  const rival = enCurso.rival ?? m.decision?.datos?.rival ?? '';
  const ligaRival = enCurso.ligaRival ?? '';
  const rec = intl.swiss?.record?.[yo] ?? { v: 2, d: 2 };
  const propias = (intl.swiss?.rondas ?? []).flat().filter((x) => x.propio);
  const resultados = Object.fromEntries((m.resultados ?? []).map((r) => [r.opcionId, r]));
  const opciones = m.decision.opciones;
  const ligaDe = Object.fromEntries((intl.participantes ?? []).map((p) => [p.nombre, p.liga]));

  const raiz = el('section', { class: 'parada swiss', 'data-pieza': 'decision', 'data-forma': 'swiss', 'data-muestra': muestra });
  const fr = franja(m.franja, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });

  // el 2-2 enorme y el camino que lo trajo hasta aca
  const camino = el('ol', { class: 'sw-camino', 'aria-label': 'Tu Swiss, ronda por ronda' }, [
    ...propias.map((x) => {
      const otro = x.a === yo ? x.b : x.a;
      const gano = x.ganador === yo;
      return el('li', { class: gano ? 'gano' : 'perdio' }, [el('span', { class: 'sw-r', text: `R${x.ronda}` }), el('i', { 'aria-hidden': 'true' }), el('b', { text: otro }), el('span', { class: 'sw-l', text: `${ligaDe[otro] ?? ''} · ${gano ? 'ganado' : 'perdido'}` })]);
    }),
    el('li', { class: 'sw-hoy' }, [el('span', { class: 'sw-r', text: `R${propias.length + 1}` }), el('i', { 'aria-hidden': 'true' }), el('b', { text: rival }), el('span', { class: 'sw-l', text: `${ligaRival} · hoy, al Bo1` })]),
  ]);
  const record = el('div', { class: 'sw-record' }, [
    el('p', { class: 'sw-k' }, [el('i', { class: 'punto-luz' }), el('span', { text: `Mundial ${intl.anio ?? m.anio}` }), el('span', { class: 'bisagra', text: `Swiss · ronda ${propias.length + 1} · Bo1` })]),
    el('div', { class: 'sw-dosados' }, [
      el('b', { class: 'sw-num', 'aria-label': `Vas ${rec.v}-${rec.d}` }, [el('span', { class: 'sw-v', text: String(rec.v) }), el('span', { class: 'sw-guion', 'aria-hidden': 'true' }), el('span', { class: 'sw-d', text: String(rec.d) })]),
      el('div', { class: 'sw-lema' }, [el('span', { text: 'Ganás: cuartos.' }), el('span', { text: 'Perdés: a casa.' })]),
    ]),
    camino,
  ]);
  const cab = encabezado(muestra, { antes: null, rotulo: ['Vida o muerte'], titulo: m.decision.titulo, descripcion: m.decision.descripcion });
  cab.rotulo.classList.add('sw-rotulo');
  const ops = franjasDeOpciones(muestra, opciones, {
    glifos: (o) => [el('span', { class: 'eje' }, [icono(o.id === 'charla' ? 'charla' : 'sinCharla'), el('span', { class: 'eje-nom', text: o.id === 'charla' ? 'la charla, ahora' : 'la charla, guardada' })])],
    detalle: () => null,
  });
  const previa = previaGeneral(g, { titulo: `el Bo1 vs ${rival}`, kicker: `La previa · ${yo} vs ${rival}` });
  const col = el('div', { class: 'parada-col' }, [record, cab.rotulo, cab.titulo, cab.planteo, ops.lista, ops.inspector]);
  raiz.append(fr, col, previa, trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad), cuartos('temporada'));
  ops.conectar(amb, (n) => elegir(n));

  function entrada() {
    lineasConMascara(cab.titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 520 + i * 70, dur: 420 }));
    entrar(fr, 0, -10);
    esperar(raiz, 900).then(() => amb.aquietar(true));
    if (quieto()) amb.aquietar(true);
    entrar(record.querySelector('.sw-k'), 60, 8);
    const [v, guion, d] = record.querySelectorAll('.sw-num > span');
    animar(v, [{ opacity: 0, transform: 'translateX(-30%)', filter: 'blur(14px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: 140, dur: 700 });
    animar(d, [{ opacity: 0, transform: 'translateX(30%)', filter: 'blur(14px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: 220, dur: 700 });
    animar(guion, [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'none' }], { delay: 360, dur: 500 });
    record.querySelectorAll('.sw-lema span').forEach((x, i) => entrar(x, 420 + i * 90, 8));
    camino.querySelectorAll('li').forEach((li, i) => entrar(li, 380 + i * 60, 8));
    entrar(cab.rotulo, 480, 8);
    entrar(cab.planteo, 700, 8);
    ops.filas.forEach((f, i) => entrar(f, 760 + i * 60, 16));
    entrar(ops.inspector, 880, 8);
    if (previa) {
      entrar(previa, 720, 0);
      previa.querySelectorAll('.pv-p, .pv-fuerzas, .pv-desglose li, .pv-pie').forEach((x, i) => entrar(x, 780 + i * 40, 8));
    }
  }

  let elegido = false;
  let saltar = null;
  function elegir(n) {
    if (elegido) return;
    const o = opciones[n - 1];
    if (!o) return;
    elegido = true;
    amb.pulso('elegir');
    amb.aquietar(false);
    sonido?.clic();
    const res = resultados[o.id];
    const logs = res?.inmediato?.logs ?? [];
    const charla = logs.find((l) => !l.etapa && !l.mundial);
    const mapa = logs.find((l) => l.etapa === 'swiss');
    const fin = logs.find((l) => l.mundial);
    const recFinal = fin?.mundial?.record ?? `${rec.v}-${rec.d}`;
    const fuera = fin?.mundial?.resultado === 'eliminado';
    const tMapa = charla ? 900 : 520;
    const tSello = tMapa + 760;
    const tCae = tSello + 260;
    const tAfuera = tSello + 560;
    const cambios = (res?.inmediato?.cambios ?? []).filter((c) => ETQ_CAMBIO[c.campo] && Math.round(c.antes) !== Math.round(c.despues));

    const cabecera = el('div', { class: 'res-cab' }, [el('span', { class: 'op-tecla', text: String(n) }), el('span', { class: 'op-label', text: o.label }), el('span', { class: 'res-tag', text: 'Elegiste' })]);
    const beat = charla ? el('p', { class: 'sw-beat' }, [icono('charla'), charla.message]) : null;
    const pAntes = mapa?.p ?? g?.p ?? 0;
    const bo1 = el('div', { class: 'sw-bo1', 'data-res': mapa?.resultado ?? '' }, [
      el('p', { class: 'sw-bo1-k', text: `Swiss · ronda ${mapa?.ronda ?? propias.length + 1} · Bo1` }),
      el('p', { class: 'sw-bo1-vs' }, [el('b', { text: yo }), el('span', { class: 'sw-x', text: 'vs' }), el('b', { text: `${rival}` }), el('span', { class: 'sw-liga', text: ligaRival })]),
      el('div', { class: 'sw-p' }, [
        el('span', { class: 'sw-p-barra', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pAntes * 100)), 'aria-label': 'La p de ganar antes del mapa' }, el('i', { style: { width: pct(pAntes) } })),
        el('b', { text: pct(pAntes) }),
        el('span', { text: o.id === 'charla' ? 'de ganar · con la charla' : 'de ganar · sin la charla' }),
      ]),
      el('p', { class: 'sw-sello', text: mapa?.resultado === 'W' ? 'Victoria' : 'Derrota' }),
    ]);
    const afuera = el('div', { class: 'sw-afuera', 'data-fuera': fuera ? '' : null }, [
      el('p', { class: 'sw-afuera-t', text: fuera ? 'Afuera' : 'Adentro' }),
      el('p', { class: 'sw-afuera-rec' }, [el('b', { text: recFinal.replace('-', '–') }), el('span', { text: `Swiss del Mundial ${intl.anio ?? m.anio}` })]),
      el('p', { class: 'sw-afuera-msg', text: fin?.message ?? mapa?.message ?? '' }),
      cambios.length ? el('div', { class: 'res-numeros sw-cambios' }, cambios.map((c) => {
        const [ico, et] = ETQ_CAMBIO[c.campo];
        const a = Math.round(c.antes);
        const b = Math.round(c.despues);
        return el('div', { class: 'res-num' }, [
          el('span', { class: 'rn-rotulo' }, [icono(ico === 'mundo' ? 'mundo' : glifoDeCampo(c.campo)), et]),
          el('span', { class: 'rn-fila' }, [el('span', { class: 'rn-antes', text: num(a) }), icono('flecha'), el('b', { class: 'rn-valor', 'data-desde': String(a), 'data-hasta': String(b), text: num(b) }), el('span', { class: `rn-delta ${b > a ? 'sube' : 'baja'}` }, [triangulos('baja', b > a ? '+' : '-'), conSigno(b - a)])]),
        ]);
      })) : null,
      el('button', { type: 'button', class: 'res-otra', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]),
    ]);
    const juego = el('div', { class: 'resultado sw-juego', 'data-pieza': 'resultado', tabindex: '-1', 'aria-label': `Resultado: ${o.label}. ${fin?.message ?? ''}` }, [cabecera, beat, bo1]);
    raiz.append(afuera);

    const r0 = ops.filas[n - 1].getBoundingClientRect();
    plegar(col, { fantasma: [cab.rotulo, cab.titulo, cab.planteo, ops.lista, ops.inspector], plegar: [cab.rotulo, cab.titulo, cab.planteo, ops.inspector], oculta: ops.filas[n - 1] });
    if (previa) plegar(raiz, { fantasma: [previa], plegar: [previa] });
    ops.lista.replaceWith(juego);
    if (beat) animar(beat, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: 260, dur: 380 });
    animar(bo1, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: tMapa, dur: 380 });
    animar(bo1.querySelector('.sw-p-barra i'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: tMapa + 160, dur: 600 });
    animar(bo1.querySelector('.sw-sello'), [{ opacity: 0, transform: 'scale(1.5)', letterSpacing: '0.5em', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: tSello, dur: 420 });
    animar(bo1.querySelector('.sw-p-barra i'), [{ filter: 'none' }, { filter: 'grayscale(1) brightness(.6)' }], { delay: tSello + 200, dur: 900 });
    // el camino suma la ronda de hoy (el resultado aparece con el sello, no antes)
    const hoy = camino.querySelector('.sw-hoy');
    const tHoy = tSello + 120;
    hoy.classList.add(mapa?.resultado === 'W' ? 'gano' : 'perdio');
    const lHoy = hoy.querySelector('.sw-l');
    const lRes = el('span', { class: 'sw-l sw-l-res', text: `${ligaRival} · ${mapa?.resultado === 'W' ? 'ganado' : 'perdido'}` });
    lHoy.after(lRes);
    const oro = rgbDe('--gold');
    sostener(lHoy, { opacity: 1 }, tHoy);
    animar(lRes, [{ opacity: 0 }, { opacity: 1 }], { delay: tHoy, dur: 300 });
    sostener(hoy.querySelector('i'), { backgroundColor: 'transparent', boxShadow: `0 0 0 2px ${oro}, 0 0 12px ${oro}` }, tHoy);
    animar(hoy.querySelector('i'), [{ transform: 'scale(2.2)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: tHoy, dur: 420, fill: 'none' });
    // el record: 2-2 -> 2-3
    const [, dRec] = recFinal.split('-').map(Number);
    const sd = record.querySelector('.sw-d');
    if (Number.isFinite(dRec) && dRec !== rec.d) {
      odometro(sd, rec.d, dRec, { delay: tSello + 80, dur: 700 });
      record.classList.add(fuera ? 'fuera' : 'adentro');
      const tinta = rgbDe('--ink');
      const [l1, l2] = record.querySelectorAll('.sw-lema span');
      sostener(sd, { color: tinta }, tSello + 80);
      sostener(l1, { color: tinta, textDecorationColor: 'transparent' }, tSello + 300);
      sostener(l2, { color: rgbDe('--ink-dim') }, tSello + 300);
    }
    // el FLIP se mide recien ahora: el record ya se volvio odometro (su caja cambia de alto)
    const r1 = juego.getBoundingClientRect();
    animar(juego, [{ transform: `translateY(${r0.top - r1.top}px)`, clipPath: `inset(0 0 calc(100% - ${r0.height}px) 0)` }, { transform: 'none', clipPath: 'inset(0 0 0 0)' }], { dur: DUR.larga });
    // la luz cae: sin latido, sin color; AFUERA entra despacio, sin estridencia
    amb.ambiente({ animo: fuera ? 'caida' : 'gloria', retardo: quieto() ? 0 : tCae });
    animar(afuera, [{ opacity: 0 }, { opacity: 1 }], { delay: tAfuera - 160, dur: 420 });
    animar(afuera.querySelector('.sw-afuera-t'), [{ opacity: 0, letterSpacing: '0.4em', filter: 'blur(16px)' }, { opacity: 1, letterSpacing: '-0.01em', filter: 'none' }], { delay: tAfuera, dur: 1100, easing: EXPO });
    afuera.querySelectorAll('.sw-afuera-rec, .sw-afuera-msg, .sw-cambios, .res-otra').forEach((x, i) => entrar(x, tAfuera + 260 + i * 110, 10));
    afuera.querySelectorAll('.rn-valor[data-desde]').forEach((v) => odometro(v, Number(v.dataset.desde), Number(v.dataset.hasta), { delay: tAfuera + 600, dur: 1000 }));
    saltar = () => {
      for (const a of raiz.getAnimations({ subtree: true })) {
        try {
          a.finish();
        } catch {
          /* sin fin */
        }
      }
      amb.ambiente({ animo: fuera ? 'caida' : 'gloria', instantaneo: true });
      saltar = null;
    };
    esperar(raiz, tAfuera + 1200).then(() => {
      saltar = null;
      juego.focus({ preventScroll: true });
    });
    raiz.addEventListener('click', (e) => {
      if (saltar && !e.target.closest('button')) saltar();
    });
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= opciones.length) {
      e.preventDefault();
      elegir(Number(e.key));
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !elegido) {
      e.preventDefault();
      ops.apuntar(ops.apuntada + (e.key === 'ArrowDown' ? 1 : -1), true);
    } else if ((e.code === 'Space' || e.key === 'Escape') && saltar) {
      e.preventDefault();
      saltar();
    } else if ((e.key === 'r' || e.key === 'R') && elegido) window.vitrina?.repetir();
  }

  return {
    nodo: raiz,
    entrar: entrada,
    elegir,
    tecla,
    arte: claveCampeon(m.ficha?.jugador?.campeonDelSplit) ?? 'Anivia',
    animo: 'normal',
    encuadre: 'swiss',
    velo: 0.6,
  };
}
