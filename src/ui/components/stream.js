// EL STREAM del Swiss (PLANUI U2b; portado de `crearSwissLinea` de vitrina/fusion/js/partido.js con `op=linea`). El 2-2
// del Swiss del Mundial es LA MISMA TRANSMISIÓN del cara a cara vista en un stream: la costura adentro de la caja del
// video (`costura.marco`) con la gráfica de Worlds y una cámara lenta; alrededor, la página del stream teñida de la noche
// de Worlds (el canal, EN VIVO, los espectadores, el clip, la racha de hype, los cruces de la ronda, la predicción con el
// número del motor y el chat). Elegir responde al motor; `narrar` juega el Bo1 con tu chance real (el de vida o muerte,
// con su suspenso) y entra AFUERA (o ADENTRO) como un takeover con beats: la palabra cae letra por letra, la p de las dos
// opciones ("la decisión movió el número, el dado salió igual") y lo que se movió. Lo decorativo (el chat, los
// espectadores, la cámara) sale de `fx/azar.js` con la semilla de la carrera: nunca del rng del motor ni de `rngUi`.
import { el, svg, quieto, celular, EXPO } from '../fx/util.js';
import { entrar, esperar, lineasConMascara, num, odometro } from '../fx/movimiento.js';
import { animar } from '../fx/util.js';
import { icono, glifoDeCampo, triangulos } from '../fx/iconos.js';
import { marcador as marcadorTx, placaInferior } from '../fx/transmision.js';
import { victoriaDerrota } from '../fx/ceremonia.js';
import { crearBeats } from '../fx/beats.js';
import { tonoOrg, tonoCompeticion, separar, paletaDe } from '../fx/tono.js';
import { logoOrg, logoComp, siglaDe, logosListos } from '../fx/competicion.js';
import { cargarImagen, urlCentrada } from '../fx/arte.js';
import { azarFx } from '../fx/azar.js';
import { claveDe } from '../core/mundo.js';
import { nombreVisibleDeLiga } from '../formatoUi.js';
import { BALANCE } from '../../data/balance.js';
import { crearNarracion } from '../narracion.js';
import { anim, pct, ventanaTx, irseEn, tonosDeLados, carasDe, cabeceraTx, competicionDeEstado, TX_SUS, programarSuspenso, placaDecisiva, latirPlaca, entrarPlaca } from './transmisionComun.js';

const TXS = {
  t0: 380, // después de elegir: la charla (si la usaste) o el Bo1
  charla: 1150,
  juego: 1000, // EN JUEGO: el Bo1
  pip: 260,
  post: 1500, // del resultado a AFUERA
  apagon: 160,
  golpe: 120,
  letra: 85,
  letras: 220,
  asentar: 1300,
  asentarse: 2300,
  dur: 2700,
  sostener: 1800, // después de asentarse, AFUERA se queda antes del relato
  camara: 6000, // cada cuánto se mueve la cámara del video
  espectadores: [184000, 412000], // decorativo: lo que mira una ronda decisiva del Swiss
  subenCada: 1700,
  suben: [40, 420],
  aquietar: 900,
  susDesde: 600, // el suspenso arranca con EN JUEGO ya en pantalla
  entrada: -200 // la parada entra después del relato: un poco antes que en la vitrina
};
// el zoom y el paneo de la cámara del video: el marco de la costura crece (zoom) y se corre (paneo) adentro de la caja
const CAMARA = { zoom: [1.03, 1.1], paneo: 0.025 };
// la racha de hype (decorativa): dónde arranca, hasta dónde la sube la tensión, el empujón de apuntar y al elegir
const HYPE = { desde: 0.18, tension: 0.58, subida: 9000, apuntar: 0.08, elegir: 0.86 };
const ETQ_PRED = { charla: 'con la charla', sinCharla: 'guardando la charla' };
const ETQ_CAMBIO = { 'career.arraigo': ['arraigo', 'Arraigo'], 'player.stats.hype': ['hype', 'Hype'], 'player.worlds': ['mundo', 'Mundiales'] };
const STREAM = { calidades: ['1080p60'], esconder: 2600 };
const SWISS = BALANCE.mundial;

// Los logs del Bo1 dentro de la respuesta: la charla (si la hubo), el partido del Swiss y, si te eliminó, el cierre.
export function logsDelSwiss(logs) {
  const i = logs.findIndex((l) => l?.etapa === 'swiss' && l.ronda != null);
  if (i < 0) return [];
  const fin = logs.findIndex((l, k) => k > i && l?.mundial);
  return logs.slice(0, (fin >= 0 ? fin : i) + 1);
}

export function crearStream(contenedor, decision, { estado, previa = null, mundo, sonido = null, responder }) {
  const comp = competicionDeEstado(estado, { internacional: true });
  const fx = () => mundo?.fx?.() ?? null;
  const ops = decision.opciones ?? [];
  const pg = previa ?? {};
  const it = estado.internacional ?? {};
  const org = it.jugador ?? estado.career?.currentOrg ?? '';
  const handle = estado.player?.name ?? '';
  const rival = decision.datos?.rival ?? it.partidoEnCurso?.rival ?? pg.rival?.nombre ?? '';
  // Las ligas del cruce (sus ids: en pantalla van por nombreVisibleDeLiga).
  const delRival = { liga: it.partidoEnCurso?.ligaRival ?? (it.participantes ?? []).find((p) => p.nombre === rival)?.liga ?? '' };
  const deVos = { liga: (it.participantes ?? []).find((p) => p.nombre === org)?.liga ?? estado.career?.liga ?? '' };
  const rondas = (it.swiss?.rondas ?? []).flat().filter((x) => x.a === org || x.b === org).sort((a, b) => a.ronda - b.ronda);
  const rec = it.swiss?.record?.[org] ?? { v: 0, d: 0 };
  const recRival = it.swiss?.record?.[rival];
  const camaraN = pg.desglose?.campeon ?? estado.player?.campeonDelSplit ?? null;
  const camara = claveDe(camaraN);
  const anio = it.anio ?? comp.anio;
  const proxima = (rondas[rondas.length - 1]?.ronda ?? 0) + 1;
  const sNos = siglaDe(org);
  const sEllos = siglaDe(rival);
  const pOpc = Object.fromEntries((pg.opciones ?? []).map((o) => [o.id, o]));
  const quietoSw = quieto();
  const vidaOMuerte = rec.v === SWISS.victoriasParaAvanzar - 1 && rec.d === SWISS.derrotasParaQuedarAfuera - 1;
  const semilla = `${estado.seed}-${anio}-${rival}`;

  // ---------- los tonos: la noche de Worlds (la página) y cada org (cada mitad del video) ----------
  const tComp = tonoCompeticion(comp.id);
  const tA = tonoOrg(org);
  const tB = separar(tA, tonoOrg(rival), tComp);
  // el rival del Bo1 no tiene pick en el motor: su lado queda solo tono, con su logo encima
  const ladoCostura = { a: { arte: camara, tono: tA }, b: { arte: null, tono: tB }, posicion: 0.5 };

  const raiz = el('section', { class: 'tx tx-swiss' });
  tonosDeLados(raiz, tA, tB);

  // ---------- el video: la gráfica de Worlds sobre la costura ----------
  const mc = marcadorTx({ comp, rotulo: `Swiss · ronda ${proxima}`, local: { nombre: org, sigla: sNos, logo: logoOrg(org) }, visita: { nombre: rival, sigla: sEllos, logo: logoOrg(rival) }, formato: 1, mapas: [] });
  mc.nodo.classList.add('tx-mc');
  const pipCamino = (r) => {
    const gano = r.ganador === org;
    const otro = r.a === org ? r.b : r.a;
    return el('li', { 'data-res': gano ? 'W' : 'L', title: `Ronda ${r.ronda}: ${gano ? 'le ganaste a' : 'perdiste con'} ${otro}${r.p != null ? ` · tenías ${pct(r.p)}` : ''}` }, [
      el('span', { text: `R${r.ronda}` }), logoOrg(otro, { clase: 'tx-cam-logo' }), el('b', { text: siglaDe(otro) })
    ]);
  };
  const r5 = el('li', { 'data-res': 'vivo', title: `Ronda ${proxima}: ${rival}` }, [el('span', { text: `R${proxima}` }), logoOrg(rival, { clase: 'tx-cam-logo' }), el('b', { text: sEllos })]);
  const camino = el('ol', { class: 'tx-camino', 'aria-label': `Swiss: vas ${rec.v}-${rec.d}` }, [...rondas.map(pipCamino), r5]);
  const vom = el('div', { class: 'tx-sw-vom' }, placaInferior({
    rotulo: vidaOMuerte ? 'Eliminación · vida o muerte' : `Swiss · ronda ${proxima}`,
    titulo: `${org} vs ${rival}`,
    sub: `${rec.v}–${rec.d}${recRival ? ` contra ${recRival.v}–${recRival.d}` : ''}${vidaOMuerte ? ': el que pierde se vuelve a casa' : ''}`,
    tono: tComp
  }));
  const caraA = el('div', { class: 'tx-sw-cara', 'data-lado': 'a', 'aria-hidden': 'true' }, [
    el('p', { class: 'tx-cara-n', text: camaraN ?? org }),
    el('p', { class: 'tx-cara-q' }, [logoOrg(org, { clase: 'tx-cara-logo' }), el('span', { text: `${handle} · ${sNos}` })])
  ]);
  const caraB = el('div', { class: 'tx-sw-cara', 'data-lado': 'b', 'aria-hidden': 'true' }, [
    logoOrg(rival, { clase: 'tx-sw-logo-b' }),
    el('p', { class: 'tx-cara-n', text: rival }),
    el('p', { class: 'tx-cara-q' }, [el('span', { text: delRival.liga ? `${nombreVisibleDeLiga(delRival.liga)}${recRival ? ` · ${recRival.v}–${recRival.d}` : ''}` : '' })])
  ]);
  const juego = el('div', { class: 'tx-juego tx-sw-juego', 'aria-live': 'polite' });
  const vivoPill = el('p', { class: 'tx-sw-vivo' }, [el('i'), 'En vivo']);
  const controles = barraPlayer();
  const player = el('div', { class: 'tx-sw-player', 'data-ui': 'on' }, [
    el('div', { class: 'tx-sw-graf' }, [vivoPill, logoComp(comp, { clase: 'tx-sw-agua' }), mc.nodo, caraA, caraB, vom, camino, juego]),
    controles.nodo
  ]);

  // ---------- la página del stream ----------
  const azS = azarFx(`stream-${semilla}`);
  let espectadores = azS.entero(TXS.espectadores[0], TXS.espectadores[1]);
  const nEspect = el('b', { class: 'num', text: num(espectadores) });
  const clip = el('button', { type: 'button', class: 'tx-clip', 'aria-label': 'Clip de los últimos 30 segundos' }, [icoClip(), el('span', { class: 'tx-clip-et' }, [el('span', { class: 'tx-clip-t', text: 'Clip' }), el('span', { class: 'tx-clip-ya', text: '¡Clip!' })])]);
  clip.addEventListener('click', () => clip.toggleAttribute('data-hecho', true));
  const hypeBarra = el('i', { class: 'tx-hype-in', style: { '--v': String(HYPE.desde) } });
  const hypeNivel = el('b', { class: 'tx-hype-nivel', text: 'Nivel 1' });
  const hype = el('div', { class: 'tx-hype', role: 'img', 'aria-label': 'Racha de hype del chat' }, [
    el('span', { class: 'tx-hype-k' }, [icoLlama(), el('span', { text: 'Racha de hype' }), hypeNivel]),
    el('i', { class: 'tx-hype-barra' }, hypeBarra)
  ]);
  const info = el('div', { class: 'tx-sw-info' }, [
    el('i', { class: 'tx-sw-avatar', 'aria-hidden': 'true' }, logoComp(comp, { clase: 'tx-sw-avatar-logo' })),
    el('div', { class: 'tx-sw-txt' }, [
      el('p', { class: 'tx-sw-titulo', text: `${comp.nombre.toUpperCase()} ${anio} · Swiss, ronda ${proxima}: ${org} vs ${rival} · ${rec.v}-${rec.d}${vidaOMuerte ? ', vida o muerte' : ''}` }),
      el('p', { class: 'tx-sw-canal' }, [el('b', { text: comp.nombre }), el('span', { text: `transmisión oficial · ${comp.largo}` })]),
      el('p', { class: 'tx-sw-tags' }, ['League of Legends', 'Español', 'Esports', 'Swiss'].map((t) => el('span', { text: t })))
    ]),
    el('div', { class: 'tx-sw-acciones' }, [
      el('p', { class: 'tx-sw-espect' }, [el('span', { class: 'tx-sw-vivo' }, [el('i'), 'En vivo']), nEspect, el('span', { text: 'espectadores' })]),
      el('div', { class: 'tx-sw-fila' }, [clip, hype])
    ])
  ]);
  const recDe = (n) => it.swiss?.record?.[n];
  const ladoCruce = (n) => [logoOrg(n, { clase: 'tx-cruce-logo' }), el('b', { text: siglaDe(n), title: n }), el('span', { class: 'num', text: recDe(n) ? `${recDe(n).v}–${recDe(n).d}` : '' })];
  const cruces = el('section', { class: 'tx-sw-cruces', 'aria-label': `Swiss, ronda ${proxima}: los cruces` }, [
    el('p', { class: 'eq-kicker', text: `Ronda ${proxima} · los cruces` }),
    el('ul', {}, (it.partidoEnCurso?.cruces ?? []).map((x) => {
      const vos = [x.a, x.b].includes(org);
      return el('li', { 'data-vos': vos ? '' : null }, [...ladoCruce(x.a), el('i', { text: 'vs' }), ...ladoCruce(x.b).reverse(), vos ? el('small', { text: 'en pantalla' }) : null]);
    }))
  ]);

  // ---------- la decisión: un panel de cliente al costado (nunca tapa el video) ----------
  const cab = cabeceraTx({ rotulo: [`${comp.nombre} ${anio}`, `Swiss · ronda ${proxima} · Bo1`], titulo: decision.titulo, descripcion: decision.descripcion, logo: logoComp(comp, { clase: 'rot-logo' }) });
  const ICONOS = { charla: 'charla', sinCharla: 'sinCharla' };
  const filas = ops.map((o, i) => el('button', { class: 'opcion tx-sw-op', type: 'button', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'aria-describedby': `tx-sw-desc-${i + 1}` }, [
    el('span', { class: 'op-tecla', 'aria-hidden': 'true', text: String(i + 1) }), icono(ICONOS[o.id] ?? 'serie'), el('span', { class: 'op-label', text: o.label })
  ]));
  const insp = el('p', { class: 'tx-sw-insp', 'aria-live': 'polite', text: 'Apuntá una opción: la predicción del stream se mueve con el número del motor.' });
  const ocultas = el('div', { class: 'solo-lectores' }, ops.map((o, i) => el('div', { id: `tx-sw-desc-${i + 1}`, text: `${o.descripcion ?? ''} ${pOpc[o.id]?.texto ?? ''}` })));
  const panel = el('section', { class: 'tx-sw-decision panel', 'aria-label': decision.titulo }, [cab.nodo, el('div', { class: 'tx-sw-ops', id: 'decisionOptions', role: 'group', 'aria-label': 'Opciones' }, filas), insp, ocultas]);

  // la previa como predicción del stream: el número del motor, que se mueve al apuntar una opción
  const p0 = Number.isFinite(pg.p) ? Math.round(pg.p * 100) : Number.isFinite(pg.porcentaje) ? pg.porcentaje : 50;
  const predP = el('b', { class: 'num tx-pred-p', text: `${p0}%` });
  const predEt = el('span', { class: 'tx-pred-et', text: 'de ganar el Bo1 · así como están' });
  const predNo = el('b', { class: 'num tx-pred-no', text: `${100 - p0}%` });
  const predBarra = el('i', { class: 'tx-pred-si', style: { '--v': String(p0 / 100) } });
  const pregunta = vidaOMuerte ? `¿${org} pasa de ronda?` : `¿${org} gana el Bo1?`;
  const pred = el('section', { class: 'tx-pred', 'aria-live': 'polite', 'aria-label': `Predicción del stream: ${org} gana, ${p0}%` }, [
    el('p', { class: 'tx-pred-k' }, [icoPrediccion(), el('span', { text: 'Predicción' }), el('b', { text: pregunta })]),
    el('div', { class: 'tx-pred-fila' }, [el('span', { class: 'tx-pred-lado', 'data-lado': 'si' }, [predP, el('small', { text: 'sí' })]), el('i', { class: 'tx-pred-barra' }, predBarra), el('span', { class: 'tx-pred-lado', 'data-lado': 'no' }, [el('small', { text: 'no' }), predNo])]),
    predEt
  ]);
  let pMostrado = p0;
  function moverPrediccion(p, etiqueta) {
    if (p === pMostrado && predEt.textContent === etiqueta) return;
    odometro(predP, pMostrado, p, { dur: 520 });
    predP.append('%');
    odometro(predNo, 100 - pMostrado, 100 - p, { dur: 520 });
    predNo.append('%');
    pMostrado = p;
    predBarra.style.setProperty('--v', String(p / 100));
    predEt.textContent = etiqueta;
    pred.setAttribute('aria-label', `Predicción del stream: ${org} gana, ${p}% ${etiqueta}`);
  }

  // ---------- el chat vivo ----------
  const ultimo = rondas[rondas.length - 1];
  const chat = crearChatTx({
    semilla,
    d: {
      org, sigla: sNos, rival, siglaRival: sEllos, handle, camara: camaraN ?? org, ligaRival: delRival.liga ? nombreVisibleDeLiga(delRival.liga) : '', ligaPropia: deVos.liga ? nombreVisibleDeLiga(deVos.liga) : '', rec,
      verdugo: ultimo ? (ultimo.ganador !== org ? (ultimo.a === org ? ultimo.b : ultimo.a) : null) : null,
      cruces: (it.partidoEnCurso?.cruces ?? []).filter((x) => ![x.a, x.b].includes(org)).map((x) => [siglaDe(x.a), siglaDe(x.b)]),
      vidaOMuerte
    }
  });

  // en el celular, el video queda fijo arriba y lo demás corre debajo
  const scrollCel = celular() ? el('div', { class: 'tx-sw-scroll' }, [panel, pred, info, chat.nodo, cruces]) : null;
  const sw = scrollCel
    ? el('div', { class: 'tx-sw' }, [player, scrollCel])
    : el('div', { class: 'tx-sw' }, [el('div', { class: 'tx-sw-stream' }, [player, info, cruces]), el('div', { class: 'tx-sw-lateral' }, [panel, pred, chat.nodo])]);
  raiz.append(sw);
  contenedor.replaceChildren(raiz);

  // apuntar: la predicción se mueve, el chat aconseja y la racha de hype se empuja
  let apuntada = -1;
  let hypeV = HYPE.desde;
  function apuntar(i, { mover = false } = {}) {
    if (elegida) return;
    const nuevo = Math.max(0, Math.min(ops.length - 1, i));
    const cambia = nuevo !== apuntada;
    apuntada = nuevo;
    const o = ops[apuntada];
    filas.forEach((f, j) => f.classList.toggle('apuntada', j === apuntada));
    insp.textContent = o.descripcion ?? '';
    const po = pOpc[o.id];
    if (po && Number.isFinite(po.p)) moverPrediccion(po.porcentaje ?? Math.round(po.p * 100), ETQ_PRED[o.id] ?? `con «${o.label}»`);
    if (cambia) {
      chat.rafaga(o.id);
      empujarHype(HYPE.apuntar);
    }
    if (mover) filas[apuntada].focus({ preventScroll: true });
  }
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (elegida) return;
      if (i !== apuntada) fx()?.pulso?.('apuntar');
      apuntar(i);
    });
    f.addEventListener('focus', () => apuntar(i));
    f.addEventListener('click', () => elegir(i));
  });
  function empujarHype(dv, hasta = null) {
    hypeV = Math.min(1, hasta ?? hypeV + dv);
    hypeBarra.style.setProperty('--v', String(hypeV));
    hypeNivel.textContent = hypeV >= 1 ? '¡Nivel 3!' : hypeV >= 0.5 ? 'Nivel 2' : 'Nivel 1';
  }

  // ---------- el marco de la costura: la caja del video, medida (y la cámara que se mueve adentro) ----------
  let marcoBase = null;
  function medirMarco() {
    const r = player.getBoundingClientRect();
    const W = document.documentElement.clientWidth || innerWidth;
    const H = innerHeight;
    marcoBase = r.width > 2 && r.height > 2 ? { x: r.left / W, y: r.top / H, w: r.width / W, h: r.height / H } : null;
    return marcoBase;
  }
  const azCam = azarFx(`camara-${semilla}`);
  function marcoCamara(z = 1, dx = 0, dy = 0) {
    const b = marcoBase;
    if (!b) return null;
    const w = b.w * z;
    const h = b.h * z;
    return { x: b.x - (w - b.w) / 2 + dx * b.w, y: b.y - (h - b.h) / 2 + dy * b.h, w, h };
  }
  let camaraReloj = 0;
  let takeoverYa = false;
  function moverCamara() {
    if (takeoverYa || !raiz.isConnected) return;
    const marco = marcoCamara(azCam.entre(CAMARA.zoom[0], CAMARA.zoom[1]), azCam.entre(-CAMARA.paneo, CAMARA.paneo), azCam.entre(-CAMARA.paneo, CAMARA.paneo));
    if (marco) mundo?.costura?.({ marco }, TXS.camara);
  }
  function ponerCostura({ cruce, k = 1 } = {}) {
    if (takeoverYa) return;
    medirMarco();
    const marco = quietoSw ? marcoBase : marcoCamara(CAMARA.zoom[0]);
    mundo?.costura?.({ ...ladoCostura, k, marco }, cruce ?? null);
  }
  let medida = 0;
  const alMover = () => {
    cancelAnimationFrame(medida);
    medida = requestAnimationFrame(() => {
      const antes = marcoBase;
      medirMarco();
      if (!marcoBase || takeoverYa || (antes && Math.abs(antes.y - marcoBase.y) < 0.002 && Math.abs(antes.w - marcoBase.w) < 0.002)) return;
      mundo?.costura?.({ marco: quietoSw ? marcoBase : marcoCamara(CAMARA.zoom[0]) }, 1);
    });
  };
  // el logo del rival y su nombre siguen a la cara de B (la geometría del ambiente)
  let seguirRaf = 0;
  function seguir() {
    seguirRaf = requestAnimationFrame(seguir);
    if (!raiz.isConnected) return;
    const g = carasDe(mundo?.geometria?.(), marcoBase ?? undefined);
    const r = player.getBoundingClientRect();
    if (!g?.b || !(r.width > 2)) return;
    caraB.style.left = `${g.b.x * innerWidth - r.left}px`;
    caraB.style.top = `${g.b.y * innerHeight - r.top}px`;
  }

  // ---------- entrar ----------
  let espectReloj = 0;
  const d0 = TXS.entrada;
  const dl = (ms) => Math.max(0, ms + d0);
  function entrada() {
    anim(sw, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
    ponerCostura({ cruce: quietoSw ? 0 : 900 });
    addEventListener('resize', alMover);
    addEventListener('scroll', alMover, { passive: true });
    seguir();
    anim(mc.nodo, [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], { delay: dl(360), duration: 360, easing: EXPO });
    anim(caraA, [{ opacity: 0, transform: 'translateX(-30px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { delay: dl(520), duration: 480, easing: EXPO });
    anim(caraB, [{ opacity: 0 }, { opacity: 1 }], { delay: dl(640), duration: 420 });
    anim(vom, [{ opacity: 0, transform: 'translateX(-16px)' }, { opacity: 1, transform: 'none' }], { delay: dl(700), duration: 360, easing: EXPO });
    camino.querySelectorAll('li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: dl(760) + i * 60, duration: 260, easing: EXPO }));
    anim(panel, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { delay: dl(300), duration: 340, easing: EXPO });
    entrar(cab.rotulo, dl(380), 8);
    lineasConMascara(cab.titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: dl(420) + i * 70, dur: 420 }));
    filas.forEach((f, i) => entrar(f, dl(560) + i * 60, 12));
    entrar(pred, dl(640), 10);
    entrar(info, dl(420), 10);
    entrar(cruces, dl(520), 10);
    chat.guion('antes');
    controles.mostrar();
    if (!quietoSw) {
      camaraReloj = setInterval(moverCamara, TXS.camara);
      setTimeout(moverCamara, 1000);
      espectReloj = setInterval(() => {
        if (!raiz.isConnected) return;
        espectadores += azS.entero(TXS.suben[0], TXS.suben[1]);
        nEspect.textContent = num(espectadores);
      }, TXS.subenCada);
      requestAnimationFrame(() => {
        hypeBarra.style.transitionDuration = `${HYPE.subida}ms`;
        empujarHype(0, HYPE.tension);
        setTimeout(() => (hypeBarra.style.transitionDuration = ''), HYPE.subida);
      });
    }
  }

  // ---------- elegir ----------
  let elegida = null;
  function elegir(i) {
    const op = ops[i];
    if (!op || elegida) return;
    elegida = { i, op };
    raiz.dataset.jugando = '';
    filas.forEach((f, j) => {
      f.classList.toggle('apuntada', j === i);
      if (j !== i) f.classList.add('bloqueada');
      f.setAttribute('aria-disabled', 'true');
    });
    insp.textContent = op.descripcion ?? '';
    empujarHype(0, HYPE.elegir);
    fx()?.pulso?.('peligro');
    mundo?.aquietar?.(false);
    sonido?.clic?.();
    responder({ opcionId: op.id });
  }
  raiz.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || elegida) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      apuntar(apuntada < 0 ? 0 : apuntada + (e.key === 'ArrowDown' ? 1 : -1), { mover: true });
    }
  });

  // ---------- narrar: el Bo1, el resultado y AFUERA (una secuencia de beats) ----------
  let beats = null;
  async function narrar(ctx) {
    if (!elegida || !raiz.isConnected) return 0;
    const logs = logsDelSwiss(ctx.logs ?? []);
    if (logs.length === 0) return 0;
    const { op } = elegida;
    const partido = logs.find((l) => l.etapa === 'swiss' && l.ronda != null);
    const antes = logs.slice(0, logs.indexOf(partido)).filter((l) => !l.etapa && !l.mundial && !l.tecnico);
    const fin = logs.find((l) => l.mundial) ?? null;
    const otro = ops.find((o) => o.id !== op.id) ?? null;
    const pOtro = otro ? pOpc[otro.id]?.p : null;
    const gano = partido?.resultado === 'W';
    const recFinal = fin?.mundial?.record ?? `${gano ? rec.v + 1 : rec.v}-${gano ? rec.d : rec.d + 1}`;
    const fuera = fin?.mundial?.resultado === 'eliminado';
    const pElegida = Math.round((partido?.p ?? pOpc[op.id]?.p ?? 0) * 100);
    moverPrediccion(pElegida, `${ETQ_PRED[op.id] ?? op.label} · predicción cerrada`);
    pred.dataset.cerrada = '';

    let t = TXS.t0;
    const placas = [];
    for (const l of antes) {
      placas.push({ t0: t, nodo: el('div', { class: 'tx-charla' }, placaInferior({ rotulo: 'Vestuario · el coach', titulo: l.message, tono: tComp })) });
      t += TXS.charla;
    }
    const tJuego = t;
    const sus = vidaOMuerte && !quietoSw;
    const tS = tJuego + TXS.susDesde;
    const tPost = sus ? tS + TX_SUS.dura : tJuego + TXS.juego;
    // AFUERA solo si el Bo1 cierra tu Swiss: eliminado o adentro (el de vida o muerte); si no, la ronda sigue
    const cierra = fuera || vidaOMuerte;
    const tAfuera = tPost + TXS.post;
    const total = cierra ? tAfuera + TXS.dur : tPost + TXS.post;
    const asentarse = cierra ? tAfuera + TXS.asentarse : tPost + TXS.post;
    const b = crearBeats({ duracion: total, asentarse });
    beats = b;
    chat.guion('despues', { tPost, tFin: cierra ? tAfuera : tPost + TXS.post, gano, fuera });

    b.waapi(irseEn(vom, TXS.t0, TXS.golpe));
    placas.forEach((x) => {
      juego.append(x.nodo);
      b.waapi(ventanaTx(x.nodo, x.t0, TXS.charla));
    });
    const enJuego = el('div', { class: 'tx-sw-enjuego' }, [
      el('p', { class: 'tx-sw-enjuego-k' }, [el('i', { class: 'tx-sw-punto' }), 'En juego · Bo1']),
      el('p', { class: 'tx-sw-enjuego-vs' }, [logoOrg(org, { clase: 'tx-cara-logo' }), el('b', { text: `${sNos} vs ${sEllos}` }), logoOrg(rival, { clase: 'tx-cara-logo' })]),
      el('p', { class: 'tx-sw-enjuego-p' }, [el('b', { class: 'num', text: pct(partido?.p) }), el('span', { text: 'tu chance en este Bo1' })])
    ]);
    juego.append(enJuego);
    b.waapi(ventanaTx(enJuego, tJuego, sus ? TXS.susDesde + 160 : TXS.juego + 120));
    const vd = victoriaDerrota({ gano, sub: `Swiss · ronda ${partido?.ronda ?? proxima} · ${recFinal.replace('-', '–')}`, retardo: tPost });
    const vdCaja = el('div', { class: 'tx-vd tx-sw-vd', 'data-lado': gano ? 'a' : 'b' }, vd.nodo);
    juego.append(vdCaja);
    b.waapi(ventanaTx(vdCaja, tPost, (cierra ? tAfuera : tPost + TXS.post) - tPost + 200, 60, 260));
    b.waapi(vd.animaciones);
    const td = b.destello(tPost + 40);
    if (td != null && gano) fx()?.pulso?.('logro', td);
    b.esperar(tPost + 60).then((ok) => ok && (gano ? sonido?.victoria?.() : sonido?.derrota?.()));
    if (sus) {
      const pl = placaDecisiva({ rotulo: `En juego · Bo1 · ${rec.v}–${rec.d}`, linea: 'vida o muerte: el que pierde se vuelve a casa', p: partido?.p, nos: org, ellos: rival, pie: 'la chance del motor en este Bo1' });
      pl.nodo.classList.add('tx-sw-sus');
      juego.append(pl.nodo);
      entrarPlaca(b, pl, tS);
      latirPlaca(b, pl, programarSuspenso({ b, api: fx(), sonido, tS }), tS);
    }
    const res5 = el('b', { class: 'tx-cam-res', 'data-res': partido?.resultado ?? 'L', text: gano ? 'V' : 'D' });
    r5.append(res5);
    b.waapi(anim(res5, [{ opacity: 0, transform: 'scale(1.8)' }, { opacity: 1, transform: 'none' }], { delay: tPost + 200, duration: 320, easing: EXPO }));
    clip.dataset.hecho = '';
    b.waapi([
      anim(clip, [{ boxShadow: '0 0 0 0 transparent' }, { boxShadow: '0 0 0 6px var(--tx-sw-clip-brillo)', offset: 0.3 }, { boxShadow: '0 0 0 0 transparent' }], { delay: tPost + 300, duration: 900 }),
      anim(clip.querySelector('.tx-clip-ya'), [{ opacity: 0, visibility: 'hidden' }, { opacity: 0, visibility: 'hidden' }], { delay: 0, duration: tPost + 300 }),
      anim(clip.querySelector('.tx-clip-t'), [{ opacity: 1, visibility: 'visible' }, { opacity: 1, visibility: 'visible' }], { delay: 0, duration: tPost + 300 })
    ]);
    b.esperar(tPost).then((ok) => ok && empujarHype(0, 1));
    b.agregar({
      fps: 30,
      n: -1,
      en(tt) {
        const s = tt >= tPost + TXS.pip ? 1 : 0;
        if (s === this.n) return;
        this.n = s;
        mc.actualizar({ mapas: s ? [{ resultado: partido?.resultado ?? 'L' }] : [] });
      }
    });

    if (cierra) {
      // AFUERA (o ADENTRO): la luz cae, el video se corta a negro, el golpe de luz, la palabra cae letra por letra
      mundo?.momento?.(fuera ? 'caida' : 'gloria', { retardo: quieto() ? 0 : tPost + 260 });
      fx()?.takeover?.(quieto() ? 0 : tAfuera - TXS.apagon);
      b.esperar(tAfuera - TXS.apagon).then(() => {
        takeoverYa = true;
      });
      const afuera = afueraNodo({ op, otro, partido, pOtro, fin, recFinal, fuera, cambios: ctx.inmediato?.()?.cambios ?? [] });
      sw.append(afuera.nodo);
      b.waapi([irseEn(player, tAfuera + TXS.golpe, 1), irseEn(info, tAfuera + TXS.golpe, 1), irseEn(cruces, tAfuera + TXS.golpe, 1)]);
      if (scrollCel) b.waapi(irseEn(scrollCel, tAfuera + TXS.golpe, 1));
      b.waapi(afuera.animar(tAfuera));
      const tg = b.destello(tAfuera + TXS.golpe);
      if (tg != null) fx()?.pulso?.(fuera ? 'peligro' : 'gloria', tg);
      b.esperar(tAfuera + TXS.golpe).then((ok) => ok && sonido?.golpe?.());
    }

    const narracion = crearNarracion(ctx, [raiz], { reloj: b });
    try {
      b.iniciar();
      if (!narracion.saltada) {
        await b.esperar(asentarse);
        await narracion.esperar(TXS.sostener);
      }
    } finally {
      narracion.fin();
    }
    return logs.length;
  }

  // AFUERA: el takeover sobre la columna del stream (el chat sigue al costado)
  function afueraNodo({ op, otro, partido, pOtro, fin, recFinal, fuera, cambios: todos }) {
    const palabra = fuera ? 'Afuera' : 'Adentro';
    const letras = [...palabra.toUpperCase()].map((c) => el('span', { class: 'tx-af-l', text: c }));
    const cambios = todos.filter((c) => ETQ_CAMBIO[c.campo] && Number.isFinite(c.antes) && Math.round(c.antes) !== Math.round(c.despues));
    const apagon = el('i', { class: 'tx-af-apagon', 'aria-hidden': 'true' });
    const finTx = el('p', { class: 'tx-af-fin' }, [el('i'), fuera ? 'Fin de la transmisión' : 'La transmisión sigue en cuartos']);
    const kicker = el('p', { class: 'eq-kicker' }, [logoComp(comp, { clase: 'rot-logo' }), `${comp.nombre} ${anio} · Swiss · ronda ${partido?.ronda ?? proxima}`]);
    const titulo = el('h2', { class: 'tx-af-t', 'aria-label': palabra }, letras);
    const recN = el('p', { class: 'tx-af-rec' }, [el('b', { class: 'num', text: recFinal.replace('-', '–') }), el('span', { text: fin?.message ?? partido?.message ?? '' })]);
    const dos = el('div', { class: 'tx-af-dos' }, [
      el('p', { 'data-elegida': '' }, [el('span', { text: op.label }), el('b', { class: 'num', text: pct(partido?.p) })]),
      Number.isFinite(pOtro) ? el('p', {}, [el('span', { text: otro.label }), el('b', { class: 'num', text: pct(pOtro) })]) : null,
      el('small', { text: 'tu chance en ese Bo1: la decisión movió el número, el dado salió igual' })
    ]);
    const nums = cambios.length ? el('div', { class: 'tx-af-cambios' }, cambios.map((c) => {
      const [ico, et] = ETQ_CAMBIO[c.campo];
      const a = Math.round(c.antes);
      const bb = Math.round(c.despues);
      const d = bb - a;
      return el('p', { class: 'tx-af-cambio' }, [icono(ico === 'mundo' ? 'mundo' : glifoDeCampo(c.campo)), el('span', { text: et }), el('span', { class: 'tx-af-antes', text: num(a) }), icono('flecha'), el('b', { class: 'num', text: num(bb) }), el('span', { class: `tx-af-delta ${d > 0 ? 'sube' : 'baja'}` }, [triangulos('baja', d > 0 ? '+' : '-'), `${d > 0 ? '+' : '−'}${num(Math.abs(d))}`])]);
    })) : null;
    const cuerpo = el('div', { class: 'tx-af-cuerpo' }, [finTx, kicker, titulo, recN, dos, nums]);
    const nodo = el('div', { class: 'tx-afuera', 'data-fuera': fuera ? '' : null, role: 'status' }, [apagon, cuerpo]);
    function animarAfuera(t0) {
      const A = t0 - TXS.apagon;
      const G = t0 + TXS.golpe;
      return [
        anim(nodo, [{ visibility: 'hidden' }, { visibility: 'hidden' }], { delay: 0, duration: Math.max(1, A) }),
        anim(apagon, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: (G - A - 60) / (G - A + 420) }, { opacity: 1, visibility: 'visible', offset: (G - A) / (G - A + 420) }, { opacity: 0, visibility: 'visible' }], { delay: A, duration: G - A + 420, easing: 'linear' }),
        anim(kicker, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: G + 60, duration: 320, easing: EXPO }),
        ...letras.map((l, i) => anim(l, [{ opacity: 0, transform: 'translateY(-46%) scale(1.5)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: t0 + TXS.letras + i * TXS.letra, duration: 380, easing: 'cubic-bezier(0.2, 1.3, 0.4, 1)' })),
        anim(titulo, [{ transform: 'none' }, { transform: 'translateY(3px)', offset: 0.3 }, { transform: 'none' }], { delay: t0 + TXS.letras + (letras.length - 1) * TXS.letra + 200, duration: 260 }),
        ...[recN, dos, nums].filter(Boolean).map((x, i) => anim(x, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + TXS.asentar + i * 110, duration: 320, easing: EXPO })),
        anim(finTx, [{ opacity: 0 }, { opacity: 1 }], { delay: t0 + TXS.asentar + 500, duration: 300 })
      ];
    }
    return { nodo, animar: animarAfuera };
  }

  return {
    titulo: cab.titulo,
    // el mundo: la costura (apagada hasta medir la caja del video), la noche de Worlds y el público
    mundo: { arte: camara, encuadre: celular() ? 'celular' : 'tribuna', velo: 0.2, tono: tComp, paleta: paletaDe(tComp), costura: { ...ladoCostura, k: 0 }, escena: 'costura', lightsticks: 1 },
    alMontar: () => {
      entrada();
      esperar(raiz, TXS.aquietar).then(() => mundo?.aquietar?.(true));
    },
    listo: () => Promise.all([logosListos(raiz), camara ? cargarImagen(urlCentrada(camara)) : null]),
    narrar,
    destruir() {
      clearInterval(camaraReloj);
      clearInterval(espectReloj);
      cancelAnimationFrame(seguirRaf);
      cancelAnimationFrame(medida);
      removeEventListener('resize', alMover);
      removeEventListener('scroll', alMover);
      controles.destruir();
      chat.destruir();
      beats?.destruir();
      mundo?.soltarMomento?.();
    }
  };
}

// ---------- el reproductor (el patrón de los streams, sin marcas): reproducir, volumen, EN VIVO, calidad, completa ----------
const ICONO_PLAYER = {
  play: ['M7 4.5v15l12-7.5z'],
  pausa: ['M6.5 4.5h4v15h-4z', 'M13.5 4.5h4v15h-4z'],
  volumen: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M15.5 8.5a5 5 0 0 1 0 7', 'M18 6a8.5 8.5 0 0 1 0 12'],
  mudo: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M16 9.5l5 5', 'M21 9.5l-5 5'],
  calidad: ['M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z', 'M12 2.5v3', 'M12 18.5v3', 'M2.5 12h3', 'M18.5 12h3', 'M5.3 5.3l2.1 2.1', 'M16.6 16.6l2.1 2.1', 'M5.3 18.7l2.1-2.1', 'M16.6 7.4l2.1-2.1'],
  completa: ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5']
};
const LLENOS = new Set(['play', 'pausa']);
function icoPlayer(nombre) {
  const s = svg('svg', { class: `pl-ico${LLENOS.has(nombre) ? ' lleno' : ''}`, viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  for (const d of ICONO_PLAYER[nombre] ?? []) s.append(svg('path', { d }));
  return s;
}
// Los controles se esconden solos si no se mueve el mouse y vuelven al moverlo o con el foco. Pausar congela la gráfica.
function barraPlayer() {
  const boton = (clase, etiqueta, ico) => el('button', { type: 'button', class: `tx-pl-btn ${clase}`, 'aria-label': etiqueta, title: etiqueta }, icoPlayer(ico));
  const play = boton('tx-pl-play', 'Pausar', 'pausa');
  const vol = boton('tx-pl-vol', 'Silenciar', 'volumen');
  const calidad = el('span', { class: 'tx-pl-calidad' }, [icoPlayer('calidad'), el('span', { text: STREAM.calidades[0] })]);
  const completa = boton('tx-pl-completa', 'Pantalla completa', 'completa');
  const nodo = el('div', { class: 'tx-pl-barra' }, [play, vol, el('span', { class: 'tx-pl-vivo' }, [el('i'), 'En vivo']), el('span', { class: 'tx-pl-espacio' }), calidad, completa]);
  let reloj = 0;
  const player = () => nodo.closest('.tx-sw-player');
  const mostrar = () => {
    const p = player();
    if (!p) return;
    p.dataset.ui = 'on';
    clearTimeout(reloj);
    reloj = setTimeout(() => {
      if (!p.hasAttribute('data-pausa')) p.dataset.ui = 'off';
    }, STREAM.esconder);
  };
  const alMover = (e) => (e.target instanceof Element && e.target.closest('.tx-sw-player') ? mostrar() : null);
  document.addEventListener('pointermove', alMover);
  nodo.addEventListener('focusin', mostrar);
  play.addEventListener('click', () => {
    const p = player();
    const si = !p.hasAttribute('data-pausa');
    p.toggleAttribute('data-pausa', si);
    play.replaceChildren(icoPlayer(si ? 'play' : 'pausa'));
    play.setAttribute('aria-label', si ? 'Reproducir' : 'Pausar');
    for (const a of p.querySelector('.tx-sw-graf').getAnimations({ subtree: true })) {
      if (si) a.pause();
      else if (a.playState === 'paused') a.play();
    }
    mostrar();
  });
  vol.addEventListener('click', () => {
    const mudo = vol.toggleAttribute('data-mudo');
    vol.replaceChildren(icoPlayer(mudo ? 'mudo' : 'volumen'));
    vol.setAttribute('aria-label', mudo ? 'Activar sonido' : 'Silenciar');
  });
  completa.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else player()?.requestFullscreen?.().catch(() => {});
  });
  return {
    nodo,
    mostrar,
    destruir() {
      clearTimeout(reloj);
      document.removeEventListener('pointermove', alMover);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
  };
}
// los glifos del stream (propios): el clip, la llama de la racha de hype, la predicción
const icoDe = (clase, paths) => {
  const s = svg('svg', { class: `tx-ico ${clase}`, viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  for (const d of paths) s.append(svg('path', { d }));
  return s;
};
const icoClip = () => icoDe('tx-ico-clip', ['M4 6.5h11.5l4.5-2.5v15l-4.5-2.5H4z', 'M8 10.2l4 1.8-4 1.8z']);
const icoLlama = () => icoDe('tx-ico-llama lleno', ['M12 2.5c.8 3.6 4.8 5.5 4.8 10a4.8 4.8 0 0 1-9.6 0c0-2.4 1.5-3.6 2.3-5.6.5 1.9 1.3 2.7 2 3.1-.4-2.4-.2-5.1.5-7.5z']);
const icoPrediccion = () => icoDe('tx-ico-pred', ['M4 19V11', 'M10 19V6', 'M16 19v-9', 'M21 19H3']);

// ---------- el chat del stream: decorativo, determinista (fx/azar.js) y armado con los datos reales ----------
// Nombres de colores, insignias propias (sub con sus meses, mod, VIP), emotes propios en SVG, mensajes destacados y
// ráfagas sincronizadas: el nombre de tu org al entrar, consejos al apuntar, y al terminar una pared de GG (o de F si
// quedan afuera). Cada guion es una lista { t, nodo } y UNA animación WAAPI que corre la lista.
const CHAT_TX = { alto: 28, colores: 8, usuarios: 44, inicial: 14, antesHasta: 60000, rafaga: 6, gapRafaga: 110 };
const MESES_SUB = [0, 0, 0, 0, 1, 2, 3, 4, 6, 9, 12, 14, 18, 24, 30, 36, 48];
const NIVEL_SUB = [[24, 5], [12, 4], [6, 3], [3, 2], [1, 1]];
const INSIGNIAS = {
  sub1: ['M3 10.5L8 5.5l5 5v3l-5-5-5 5z'],
  sub2: ['M3 8L8 3l5 5v2.6l-5-5-5 5z', 'M3 13l5-5 5 5v2.6l-5-5-5 5z'],
  sub3: ['M8 1.6l1.9 4.3 4.7.4-3.6 3.1 1.1 4.6L8 11.6 3.9 14l1.1-4.6-3.6-3.1 4.7-.4z'],
  sub4: ['M8 1l6 2.5V8c0 3.5-2.6 6-6 7-3.4-1-6-3.5-6-7V3.5z', 'M8 4.8l1.1 2.4 2.6.2-2 1.7.6 2.6L8 10.4l-2.3 1.3.6-2.6-2-1.7 2.6-.2z'],
  sub5: ['M2 6l3-4h6l3 4-6 8.5z', 'M2 6h12M5 2l3 12.5L11 2'],
  mod: ['M8 1l6 2.5V8c0 3.5-2.6 6-6 7-3.4-1-6-3.5-6-7V3.5z', 'M5 8.2l2.1 2.1L11 6.4'],
  vip: ['M8 1.5L14.5 8 8 14.5 1.5 8z', 'M8 4.5L11.5 8 8 11.5 4.5 8z']
};
function insignia(tipo, etiqueta) {
  const s = svg('svg', { class: `tx-ins tx-ins-${tipo}`, viewBox: '0 0 16 16', role: 'img', 'aria-label': etiqueta });
  INSIGNIAS[tipo].forEach((d, i) => s.append(svg('path', { d, class: i ? 'tx-ins-2' : 'tx-ins-1' })));
  return s;
}
const EMOTES = {
  garra: [['f', 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z'], ['t', 'M7 18L10.5 6'], ['t', 'M11 18.5L14.5 6.5'], ['t', 'M15 18l3-9']],
  vamo: [['f', 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z'], ['t', 'M7.5 12.5L12 8l4.5 4.5'], ['t', 'M7.5 17L12 12.5l4.5 4.5']],
  fe: [['f', 'M12 2c1 4.4 6 6.6 6 12.4A6 6 0 0 1 6 14.4c0-3 1.9-4.5 2.9-7 .6 2.4 1.6 3.4 2.5 3.9C10.9 8.3 11.2 5 12 2z'], ['l', 'M12 12.5c.5 2 2.6 3 2.6 5.1a2.6 2.6 0 0 1-5.2 0c0-1.3.8-2 1.3-3 .3.9.6 1.3 1 1.5-.1-1.2.1-2.5.3-3.6z']],
  gg: [['f', 'M2.5 6A3 3 0 0 1 5.5 3h13a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3z'], ['t', 'M10.6 9.2A3.4 3.4 0 1 0 11 12.6H8.6'], ['t', 'M18.2 9.2a3.4 3.4 0 1 0 .4 3.4h-2.4']],
  f: [['f', 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z'], ['l', 'M8 6h8.5v3H11v2h4.5v3H11v4.5H8z'], ['g', 'M18 13.5c.9 1.5 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.5 1.4-3z']],
  nervio: [['f', 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z'], ['l', 'M8.6 9.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM15.4 9.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z'], ['t', 'M7.8 16.2q1.4-1.2 2.8 0t2.8 0 2.8 0'], ['g', 'M19 3.5c.9 1.5 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.5 1.4-3z']],
  ojos: [['l', 'M7 6.5c2.5 0 4 2.5 4 5.5s-1.5 5.5-4 5.5S3 15 3 12s1.5-5.5 4-5.5zM17 6.5c2.5 0 4 2.5 4 5.5s-1.5 5.5-4 5.5-4-2.5-4-5.5 1.5-5.5 4-5.5z'], ['f', 'M8.2 10a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM18.2 10a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8z']],
  copa: [['f', 'M7 3.5h10V8c0 3-2 5-4.2 5.4v3.1h2.7V19h-7v-2.5h2.7v-3.1C9 13 7 11 7 8z'], ['t', 'M7 5.5H4.5c0 3 1.2 4.5 3 4.8M17 5.5h2.5c0 3-1.2 4.5-3 4.8']]
};
function emote(nombre) {
  const s = svg('svg', { class: `tx-emote tx-em-${nombre}`, viewBox: '0 0 24 24', role: 'img', 'aria-label': `:${nombre}:` });
  for (const [tipo, d] of EMOTES[nombre]) s.append(svg('path', { d, class: `tx-ep-${tipo}` }));
  return s;
}
const partesConEmotes = (texto) => String(texto).split(/(:[a-z]+:)/).filter(Boolean).map((p) => {
  const k = /^:([a-z]+):$/.exec(p)?.[1];
  return k && EMOTES[k] ? emote(k) : p;
});

function crearChatTx({ semilla, d }) {
  const az = azarFx(`chat-${semilla}`);
  const NOMBRES = ['tito', 'nacho', 'lu', 'sofi', 'beto', 'gabi', 'duda', 'caio', 'rafa', 'mel', 'juanma', 'bia', 'teo', 'pipe', 'lara', 'vini', 'flor', 'gui', 'cami', 'tomi', 'pato', 'ana', 'leo', 'nina'];
  const COLAS = ['_br', '99', 'gg', '.mid', 'zinho', '777', '_lol', '', '2k', 'tv', '_ok', 'xd', '10'];
  const usuarios = Array.from({ length: CHAT_TX.usuarios }, () => ({
    nombre: `${az.elegir(NOMBRES)}${az.elegir(COLAS)}`,
    color: az.entero(1, CHAT_TX.colores),
    meses: az.elegir(MESES_SUB),
    mod: az.siguiente() < 0.06,
    vip: az.siguiente() < 0.08
  }));
  const quien = () => az.elegir(usuarios);
  const ORG = d.org.toUpperCase();
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
  const nervios = mazo([
    `${d.rec.v}-${d.rec.d} y al Bo1, no puedo mirar`, `vamos ${d.org}`, `${ORG} ${ORG} :garra:`, d.vidaOMuerte ? 'tres y pasás, tres y a casa' : 'una más y respiramos', `${d.handle} en vos confío`,
    'me transpiran las manos :nervio:', `${d.rival} es duro pero se puede`, 'ahora o nunca', ':vamo: :vamo:', d.verdugo ? `lo de ${d.verdugo} ya fue, cabeza en esto` : 'cabeza fría',
    `${d.camara} o nada`, 'mi vieja pregunta qué es un Swiss', 'no respiro :nervio:', ':fe:', 'si pasamos me tatúo el logo', d.vidaOMuerte ? 'vida o muerte literal' : 'cada ronda pesa',
    d.ligaRival ? `${d.ligaRival} vs ${d.ligaPropia || 'nosotros'}, historia pura` : 'historia pura', ':ojos: :ojos:', `${d.sigla} a cuartos, lo siento en el pecho :fe:`,
    ...(d.cruces[0] ? [`${d.cruces[0][0]}–${d.cruces[0][1]} también se define ahora`] : []), d.vidaOMuerte ? 'el que pierde se va, así de simple' : 'sumar y seguir', `${d.camara} en mid, confío`
  ]);
  const juego = mazo(['VAMOOO', 'dale dale dale', 'no no no', 'esa pelea…', ':fe: :fe:', 'mirá ese flank', `${d.handle} jugando con el alma`, 'tranqui tranqui', 'el baron…', ':nervio:', ':ojos:', `${d.camara} :garra:`]);
  const aliento = mazo([`${ORG} ${ORG}`, `${ORG} ${ORG} :garra:`, ':garra: :garra: :garra:', `VAMOS ${ORG}`, `${d.handle.toUpperCase()} ${d.handle.toUpperCase()}`, `${ORG} :vamo:`, `:vamo: ${ORG} :vamo:`]);
  const consejos = {
    charla: mazo(['QUE HABLE EL COACH', 'charla YA :fe:', 'es ahora o nunca, que hable', 'la charla es para el 2-2, obvio', 'para qué la guardás si te vas a casa :nervio:', 'coach, decí algo']),
    sinCharla: mazo(['guardala para cuartos', 'confío sin charla :garra:', 'si pasan, la charla en cuartos vale oro', 'arriesgado eh :nervio:', 'salen así y listo', 'sin charla, puro corazón'])
  };
  const pared = (gano) => (gano ? mazo(['GG', 'GG GG GG', ':gg: :gg:', `GG ${d.rival}`, `${ORG} A CUARTOS`, ':copa: :copa:', 'LOCURA']) : mazo(['F', 'F F F', ':f: :f:', `F por ${d.org}`, `GG ${d.rival}`, 'o7', ':f:', 'dignos', 'duele']));
  const respeto = mazo([`GG ${d.rival}`, 'dignos', 'duele', 'orgulloso igual', 'gracias por el año', 'volvemos el año que viene', `${d.handle} dejó todo`, 'o7', ':gg:', 'llorando pero aplaudiendo', `${d.org} hasta el final`, 'gracias muchachos']);
  const destacados = mazo(['si pasan a cuartos regalo 50 subs :fe:', `${d.handle}, desde casa te bancamos :garra:`, 'primera vez que miro un Swiss y ya sufro', `${d.sigla} o muerte, el grupo entero mirando :ojos:`]);

  function nodoMsg(x) {
    const u = x.u ?? quien();
    if (x.sistema) return el('li', { class: 'tx-msg tx-msg-sistema', text: x.texto });
    const ins = [];
    if (u.mod) ins.push(insignia('mod', 'Moderador'));
    if (u.vip) ins.push(insignia('vip', 'VIP'));
    const nivel = NIVEL_SUB.find(([mm]) => u.meses >= mm)?.[1];
    if (nivel) ins.push(insignia(`sub${nivel}`, `Suscriptor · ${u.meses} ${u.meses === 1 ? 'mes' : 'meses'}`));
    if (x.anuncio) {
      return el('li', { class: 'tx-msg tx-msg-anuncio', 'data-alto': '2' }, [
        el('p', {}, [insignia(`sub${nivel ?? 1}`, 'Suscriptor'), el('b', { class: `tx-c${u.color}`, text: u.nombre }), el('span', { text: ` se suscribió · ${Math.max(1, u.meses)} ${u.meses === 1 ? 'mes' : 'meses'}` })]),
        el('p', { class: 'tx-msg-t' }, partesConEmotes(x.texto))
      ]);
    }
    if (x.destacado) {
      return el('li', { class: 'tx-msg tx-msg-destacado', 'data-alto': '2' }, [
        el('p', { class: 'tx-msg-k', text: 'Mensaje destacado' }),
        el('p', {}, [...ins, el('b', { class: `tx-c${u.color}`, text: u.nombre }), ' ', ...partesConEmotes(x.texto)])
      ]);
    }
    return el('li', { class: 'tx-msg' }, [...ins, el('b', { class: `tx-c${u.color}`, text: u.nombre }), ' ', ...partesConEmotes(x.texto)]);
  }

  const lista = el('ol', { class: 'tx-chat-lista' });
  const pista = el('div', { class: 'tx-chat-pista' }, lista);
  const modo = el('span', { class: 'tx-chat-modo', text: 'modo lento: no' });
  const nodo = el('aside', { class: 'tx-chat', 'aria-label': 'Chat del stream' }, [
    el('header', { class: 'tx-chat-cab' }, [icono('chat'), el('b', { text: 'Chat del stream' }), modo]),
    pista,
    el('footer', { class: 'tx-chat-pie' }, [el('span', { text: 'Mandá un mensaje' }), el('span', { class: 'tx-chat-em', 'aria-hidden': 'true' }, [emote('garra'), emote('fe'), emote('gg')]), el('kbd', { text: 'Enter' })])
  ]);

  let items = [];
  let animacion = null;
  let fase = 'antes';
  function render(ahora = 0) {
    items.sort((a, b) => a.t - b.t);
    for (const x of items) x.nodo ??= nodoMsg(x);
    lista.replaceChildren(...items.map((x) => x.nodo));
    animacion?.cancel();
    animacion = null;
    if (quieto() || !items.length) return;
    // la lista está anclada abajo: para que el último visible sea el i, se corre hacia abajo lo que mide lo de después
    const altos = items.map((x) => (x.nodo.dataset.alto ? Number(x.nodo.dataset.alto) : 1) * CHAT_TX.alto);
    const total = altos.reduce((s, h) => s + h, 0);
    const abajo = [];
    altos.reduce((s, h, i) => (abajo[i] = s + h), 0);
    const T = Math.max(...items.map((x) => x.t)) + 1;
    const ya = items.filter((x) => x.t <= 0).length;
    const cuadros = [{ offset: 0, transform: `translateY(${total - (ya ? abajo[ya - 1] : 0)}px)` }];
    items.forEach((x, i) => {
      if (x.t > 0) cuadros.push({ offset: x.t / T, transform: `translateY(${total - abajo[i]}px)`, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    });
    cuadros.push({ offset: 1, transform: 'translateY(0px)' });
    animacion = anim(lista, cuadros, { duration: T });
    if (animacion && ahora > 0) animacion.currentTime = ahora;
  }
  const reloj = () => (animacion ? Number(animacion.currentTime) || 0 : 0);
  const de = (gen, t, extra = {}) => ({ t, texto: gen(), ...extra });

  function guion(tipo, o = {}) {
    fase = tipo;
    if (tipo === 'antes') {
      items = [];
      for (let i = 0; i < CHAT_TX.inicial; i++) items.push(de(nervios, 0));
      let t = 80;
      for (let i = 0; i < 12; i++, t += az.entre(70, 130)) items.push(de(aliento, t));
      while (t < CHAT_TX.antesHasta) {
        t += az.entre(200, 520);
        const r = az.siguiente();
        if (r < 0.04) items.push(de(destacados, t, { destacado: true }));
        else if (r < 0.07) items.push(de(nervios, t, { anuncio: true }));
        else items.push(de(nervios, t));
      }
      render(0);
      return;
    }
    const ahora = reloj();
    items = items.filter((x) => x.t <= ahora).slice(-CHAT_TX.inicial).map((x) => ({ ...x, t: 0 }));
    const { tPost = 2600, tFin = 4000, gano = false, fuera = true } = o;
    let t = 0;
    while (t < tPost - 200) {
      t += az.entre(110, 230);
      items.push(de(juego, Math.min(t, tPost - 200)));
    }
    const muro = pared(gano);
    for (let i = 0; i < 16; i++) items.push(de(muro, tPost + 40 + i * az.entre(45, 80)));
    t = tPost + 1400;
    let paso = 140;
    while (t < tFin + 2400) {
      t += paso;
      paso *= 1.22;
      items.push(de(gano ? muro : az.siguiente() < 0.5 ? muro : respeto, t));
    }
    items.push({ t: t + 500, sistema: true, texto: fuera ? 'Fin de la transmisión · gracias por mirar' : 'La transmisión sigue en la próxima ronda' });
    render(0);
    modo.textContent = 'modo lento: sí';
  }
  function rafaga(id) {
    if (fase !== 'antes' || !consejos[id]) return;
    const ahora = quieto() ? Math.max(0, ...items.map((x) => x.t)) + 1 : reloj();
    for (let i = 0; i < CHAT_TX.rafaga; i++) items.push(de(consejos[id], ahora + 40 + i * CHAT_TX.gapRafaga));
    render(ahora);
  }
  return { nodo, guion, rafaga, destruir: () => animacion?.cancel() };
}
