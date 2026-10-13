// Lo común de la transmisión (PLANUI §4.9-§4.10 y U2b; portado de vitrina/fusion/js/partido.js con `op=linea`): la
// cabecera de una parada de partido, las ventanas de tiempo de los beats, la geometría de la costura y EL SUSPENSO del
// mapa decisivo (el Bo5 a 2-2 y el Bo1 de vida o muerte del Swiss). Lo usan el cara a cara (`components/caraACara.js`)
// y el stream del Swiss (`components/stream.js`). Importarlo no toca el DOM.
import { el, animar, quieto, EXPO, DUR } from '../fx/util.js';
import { pintarCampeon } from '../fx/color.js';
import { leerColor } from '../fx/util.js';
import { logoOrg } from '../fx/competicion.js';
import { logoLiga } from '../fx/logos.js';
import { COMPETICIONES } from '../fx/competicion.js';
import { partirDescripcion } from './decision.js';
import { primeraDe } from '../core/bisagra.js';
import { nombreVisibleDeLiga } from '../formatoUi.js';
import { porcentaje } from '../../core/previaDePartido.js';

// La p en porcentaje entero (la del motor: nunca 0 % ni 100 % si no lo es).
export const pct = (p) => (Number.isFinite(p) ? `${porcentaje(p)}%` : '—');
// Animar con la forma de la vitrina (`duration`) sobre el `animar` del kit (fill backwards: congelable, quieto en INST).
export const anim = (n, c, o = {}) => animar(n, c, { dur: o.duration ?? DUR.entra, delay: o.delay ?? 0, easing: o.easing ?? 'linear', fill: o.fill ?? 'backwards' });

// Una capa que existe solo en una ventana de tiempo (su estado natural es oculta: CSS).
export function ventanaTx(nodo, desde, dura, entra = 160, sale = 200) {
  const d = Math.max(1, dura);
  return anim(nodo, [
    { opacity: 0, visibility: 'visible' },
    { opacity: 1, visibility: 'visible', offset: Math.min(0.45, entra / d) },
    { opacity: 1, visibility: 'visible', offset: Math.max(0.55, 1 - sale / d) },
    { opacity: 0, visibility: 'visible' }
  ], { delay: desde, duration: d });
}
// Algo que ya está y se va en `t` (su estado final, oculto, queda puesto ya).
export function irseEn(nodo, t, dura = 200) {
  nodo.style.visibility = 'hidden';
  return anim(nodo, [{ visibility: 'visible', opacity: 1 }, { visibility: 'visible', opacity: 1, offset: 0.98 }, { visibility: 'visible', opacity: 0 }], { delay: 0, duration: Math.max(1, t + dura) });
}

// El arte de una pieza en el bitono de un tono (las sombras en su noche, las luces en su luz).
export function pintarEnTono(canvas, img, tono, foco) {
  if (!img || !tono) return;
  pintarCampeon(canvas, img, leerColor(tono.noche).map((v) => v * 0.5), leerColor(tono.luz), { foco, brillo: 1.08 });
}
// Los colores de cada lado de la costura, para el CSS (el filete y los pips de cada equipo).
export function tonosDeLados(nodo, tA, tB) {
  for (const [lado, t] of [['a', tA], ['b', tB]]) {
    nodo.style.setProperty(`--tx-${lado}`, `var(${t.acento})`);
    nodo.style.setProperty(`--tx-${lado}-luz`, `var(${t.luz})`);
    nodo.style.setProperty(`--tx-${lado}-noche`, `var(${t.noche})`);
  }
}
// La geometría de la costura (con WebGL trae las caras; sin WebGL, la cara de cada lado se estima con la regla del kit).
const CARA_RESPALDO = { y: 0.4 };
export function carasDe(g, marco = { x: 0, y: 0, w: 1, h: 1 }) {
  if (g?.a && g?.b) return g;
  const pos = g?.posicion ?? 0.5;
  const lleva = ([x, y]) => ({ x: marco.x + marco.w * x, y: marco.y + marco.h * y });
  return g?.vertical
    ? { ...g, k: g?.k ?? 1, a: lleva([0.5, pos * 0.5]), b: lleva([0.5, pos + (1 - pos) * 0.5]) }
    : { ...g, k: g?.k ?? 1, a: lleva([pos * 0.5, CARA_RESPALDO.y]), b: lleva([pos + (1 - pos) * 0.5, CARA_RESPALDO.y]) };
}

// La cabecera de una parada de partido: el rótulo (partes), el título y el planteo en una línea con su "más".
export function cabeceraTx({ rotulo, titulo, descripcion, alerta = null, logo = null }) {
  const [primera, resto] = partirDescripcion(descripcion ?? '');
  const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'planteo' }, [el('span', { class: 'planteo-1', text: primera }), resto ? el('span', { class: 'planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const abrir = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', abrir);
    btnMas.setAttribute('aria-expanded', String(abrir));
    btnMas.textContent = abrir ? 'menos' : 'más';
  });
  const rot = el('p', { class: 'rotulo-cat' }, [
    logo ?? el('i', { class: 'punto-luz' }),
    ...rotulo.filter(Boolean).map((r, i) => el('span', { class: i ? 'bisagra' : null, text: r })),
    alerta ? el('span', { class: 'bisagra alerta', text: alerta }) : null
  ]);
  const h1 = el('h1', { class: 'titulo-parada tx-titulo', id: 'decisionTitle', 'data-foco': '', tabindex: '-1', text: titulo });
  return { nodo: el('header', { class: 'panel-cab tx-cab' }, [rot, h1, planteo]), rotulo: rot, titulo: h1, planteo };
}

// Qué se juega (la competición de la pantalla): su nombre, su logo, su tono y el año. `swiss`/`internacional`: el
// internacional en curso (`state.internacional`); si no, la liga de tu carrera (las de segunda llevan el tono de la
// primera de su región y su propio logo).
const DE_LIGA = { CBLOL: 'cblol', LEC: 'lec', LCK: 'lck', LPL: 'lpl', LCS: 'lcs', LCP: 'lcp' };
const DE_INTERNACIONAL = { mundial: 'worlds', msi: 'msi', firststand: 'firststand', first_stand: 'firststand' };
export function competicionDeEstado(estado, { internacional = false } = {}) {
  const it = estado?.internacional ?? null;
  if (internacional && it) {
    const tipo = String(it.clave ?? '').split('|')[1] ?? 'mundial';
    const id = DE_INTERNACIONAL[tipo.toLowerCase()] ?? 'worlds';
    const c = COMPETICIONES[id];
    const anio = it.anio ?? estado.calendario?.anio ?? null;
    return { id, nombre: c.nombre, rotulo: `${c.nombre} ${anio ?? ''}`.trim(), largo: c.largo, anio, logo: logoLiga(tipo === 'msi' ? 'msi' : 'mundial').src, tokens: tokensDe(id) };
  }
  const carrera = estado?.career ?? {};
  const id = DE_LIGA[primeraDe(carrera.liga)] ?? 'cblol';
  const c = COMPETICIONES[id];
  const anio = estado?.calendario?.anio ?? null;
  const nombre = carrera.liga ? nombreVisibleDeLiga(carrera.liga) : c.nombre;
  // El rótulo de la transmisión: la liga por su nombre visible (nunca el id) y el año.
  const rotulo = `${carrera.liga ? nombreVisibleDeLiga(carrera.liga) : c.nombre} ${anio ?? ''}`.trim();
  return { id, nombre, rotulo, largo: carrera.liga && primeraDe(carrera.liga) === carrera.liga ? c.largo : nombre, anio, logo: logoLiga(nombre).src, tokens: tokensDe(id) };
}
const tokensDe = (id) => ({ luz: `--comp-${id}-luz`, contra: `--comp-${id}-contra`, acento: `--comp-${id}-acento` });

// ======================================================================================================================
// EL SUSPENSO del mapa decisivo (PLANUI §4.10, T): ~3 s que se construyen antes de VICTORIA/DERROTA. La placa del
// decisivo con la chance del motor; la costura (y las cartas con ella) tira de un lado al otro cada vez más rápido, la
// luz va de un tono al otro, el público de lightsticks se enciende y el pulso se acelera; antes del golpe, un silencio.
// Todo en el reloj de los beats y en el del ambiente; con INST o movimiento reducido no hay suspenso.
// ======================================================================================================================
export const TX_SUS = {
  dura: 3000,
  cola: 1400,
  vaiven: 0.055,
  hz: [0.5, 1.4],
  entra: 0.22,
  suelta: 0.88,
  publicoTope: 0.85,
  latido: { primero: 760, acelera: 0.82, minimo: 340, silencio: 340, k: [0.3, 0.6], cae: 220, golpe: 0.035 },
  muestras: 110,
  pasosDom: 72,
  abrir: 420,
  separar: 80,
  siguen: 0.35,
  crece: 0.03,
  salePlaca: 160
};
// px del halo del pip del decisivo en cada latido.
export const TX_SUS_PIP = 14;
const suaveSus = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
export const expoSus = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * Math.max(0, x)));
// El mapa decisivo: el que puede cerrar la serie con los dos a un mapa de ganarla (del marcador del motor).
export function esDecisivo(l, formato) {
  const [a, b] = String(l?.marcador ?? '').split('-').map(Number);
  if (!l?.mapa || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  const falta = Math.floor(Math.max(1, Number(formato) || 1) / 2);
  const gano = l.resultado === 'W';
  return (gano ? a - 1 : a) === falta && (gano ? b : b - 1) === falta;
}
// El tira y afloje en u (0-1 del suspenso): -1..1, crece, se acelera y vuelve al centro antes del golpe.
export function tiraEn(u, c = TX_SUS) {
  if (!(u > 0 && u < 1)) return 0;
  const env = suaveSus(u / c.entra) * (1 - suaveSus((u - c.suelta) / (1 - c.suelta))) * (0.5 + 0.5 * u);
  return Math.sin(2 * Math.PI * (c.dura / 1000) * (c.hz[0] * u + ((c.hz[1] - c.hz[0]) * u * u) / 2)) * env;
}
function curvasSuspenso(c = TX_SUS) {
  const total = c.dura + c.cola;
  const vaiven = [];
  const tonos = [];
  const publico = [];
  for (let i = 0; i <= c.muestras; i++) {
    const t = (i / c.muestras) * total;
    const u = t / c.dura;
    const tira = tiraEn(u, c);
    vaiven.push(Number((tira * c.vaiven).toFixed(5)));
    tonos.push(Number((-tira).toFixed(4)));
    publico.push(Number((u <= 1 ? suaveSus(u / c.publicoTope) : 1 - suaveSus((t - c.dura) / c.cola)).toFixed(4)));
  }
  const tiempos = [];
  const L = c.latido;
  for (let x = 0, d = L.primero; x <= c.dura - L.silencio; x += d, d = Math.max(L.minimo, d * L.acelera)) tiempos.push(Math.round(x));
  const latidos = tiempos.map((x, i) => [x, L.k[0] + ((L.k[1] - L.k[0]) * i) / Math.max(1, tiempos.length - 1)]);
  return { total, vaiven, tonos, publico, latidos };
}
// Los cuadros de un brillo que late con los latidos, en una animación de [t0, t0 + dura].
export function cuadrosLatido(tiempos, t0, dura, { alto = 1, bajo = 0, valor = (v) => ({ opacity: v }) } = {}) {
  const sube = 40;
  const cuadros = [{ offset: 0, ...valor(bajo) }];
  for (const t of tiempos) {
    const a = (t - t0) / dura;
    const z = (t + TX_SUS.latido.cae - t0) / dura;
    if (a <= cuadros[cuadros.length - 1].offset || z >= 1) continue;
    cuadros.push({ offset: a, ...valor(bajo) }, { offset: (t + sube - t0) / dura, ...valor(alto), easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)' }, { offset: z, ...valor(bajo) });
  }
  cuadros.push({ offset: 1, ...valor(bajo) });
  return cuadros;
}
// Los cuadros del tira y afloje para el DOM (la propiedad `translate`, que se suma al `transform` de la entrada).
export function cuadrosTira(px, { eje = 'x', base = () => 0, k = 1, crece = 0, lado = 1 } = {}) {
  return Array.from({ length: TX_SUS.pasosDom + 1 }, (_, i) => {
    const u = i / TX_SUS.pasosDom;
    const tira = tiraEn(u);
    const d = (base(u) + tira * TX_SUS.vaiven * px * k).toFixed(2);
    const c = { offset: u, translate: eje === 'x' ? `${d}px 0px` : `0px ${d}px` };
    if (crece) c.scale = String((1 + Math.max(0, tira * lado) * crece).toFixed(4));
    return c;
  });
}
// La placa late con el pulso: un golpe de escala y su brillo.
export function latirPlaca(b, pl, latidos, tS) {
  const tL = tS - TX_SUS.latido.cae;
  const dL = TX_SUS.dura + TX_SUS.latido.cae;
  b.waapi([
    anim(pl.brillo, cuadrosLatido(latidos, tL, dL), { delay: tL, duration: dL, fill: 'none' }),
    anim(pl.nodo, cuadrosLatido(latidos, tL, dL, { valor: (v) => ({ scale: String(1 + v * TX_SUS.latido.golpe) }) }), { delay: tL, duration: dL, fill: 'none' })
  ]);
}
// Lo que no es DOM: los latidos (cada uno pasa por beats.destello), el ambiente (la costura, la luz, el público) y el
// sonido. Devuelve los latidos aceptados (ms de los beats).
export function programarSuspenso({ b, api, sonido, tS }) {
  const cv = curvasSuspenso();
  const aceptados = [];
  for (const [ms, k] of cv.latidos) {
    const t = b.destello(tS + ms);
    if (t != null) aceptados.push([t - tS, k]);
  }
  api?.ambiente?.({ suspenso: { dura: cv.total, vaiven: cv.vaiven, tonos: cv.tonos, publico: cv.publico, latidos: aceptados }, retardo: tS });
  let tension = null;
  b.esperar(tS).then((ok) => {
    if (ok) tension = sonido?.tension?.(TX_SUS.dura / 1000) ?? null;
  });
  for (const [ms, k] of aceptados) b.esperar(tS + ms).then((ok) => ok && sonido?.latido?.(k));
  const cortar = () => {
    tension?.parar?.();
    tension = null;
  };
  const apagar = () => {
    cortar();
    api?.ambiente?.({ suspenso: null });
  };
  b.agregar({ fps: 1, en() {}, saltar: apagar, pausar: cortar, destruir: apagar });
  return aceptados.map(([ms]) => tS + ms);
}
// La placa del decisivo: el rótulo, lo que se juega y la chance del motor partida entre los dos.
export function placaDecisiva({ rotulo, linea, p, nos, ellos, pie }) {
  const pA = porcentaje(p ?? 0);
  const brillo = el('i', { class: 'tx-sus-brillo', 'aria-hidden': 'true' });
  const nodo = el('div', { class: 'tx-sus', role: 'status', 'aria-label': `${rotulo}. ${linea}. Tu chance en el motor: ${pA}%` }, [
    brillo,
    el('p', { class: 'tx-sus-k', 'aria-hidden': 'true' }, [el('i', { class: 'tx-sus-punto' }), el('span', { text: rotulo })]),
    el('p', { class: 'tx-sus-linea', 'aria-hidden': 'true', text: linea }),
    el('div', { class: 'tx-sus-p', 'aria-hidden': 'true', style: { '--v': String(pA / 100) } }, [
      el('p', { class: 'tx-sus-nums' }, [el('b', { class: 'num', 'data-lado': 'a', text: `${pA}%` }), el('b', { class: 'num', 'data-lado': 'b', text: `${100 - pA}%` })]),
      el('div', { class: 'tx-sus-fila' }, [logoOrg(nos, { clase: 'tx-sus-logo' }), el('i', { class: 'tx-sus-barra' }, el('i', { class: 'tx-sus-si' })), logoOrg(ellos, { clase: 'tx-sus-logo' })])
    ]),
    el('p', { class: 'tx-sus-pie', 'aria-hidden': 'true', text: pie })
  ]);
  return { nodo, brillo };
}

// El suspenso empieza a correr con la placa entrando: su escala y su desenfoque.
export function entrarPlaca(b, pl, tS) {
  b.waapi([
    ventanaTx(pl.nodo, tS, TX_SUS.dura, 220, TX_SUS.salePlaca),
    anim(pl.nodo, [{ transform: 'translate(-50%, -50%) scale(0.86)', filter: 'blur(6px)' }, { transform: 'translate(-50%, -50%)', filter: 'none' }], { delay: tS, duration: TX_SUS.abrir, easing: EXPO }),
    anim(pl.nodo.querySelector('.tx-sus-si'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: tS + 200, duration: 620, easing: EXPO })
  ]);
}

// ¿Hay suspenso? Nunca en INST ni con movimiento reducido.
export const conSuspenso = () => !quieto();
