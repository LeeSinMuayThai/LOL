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
import { el, svg, animar, entrar, esperar, lineasConMascara, primeraOracion, num, conSigno, odometro, reducido, inst, celular, leerColor, EXPO, DUR } from './util.js';
import { icono, triangulos, glifoDeCampo, glifoRol } from './iconos.js';
import { franja, trayectoria, cuartos } from './marco.js';
import { claveCampeon } from './aura.js';
import { pintarCampeon } from './color.js';
import { competicionDe, logoOrg, logoComp, siglaDe, logosListos } from './competicion.js';
// PLANUI §4.9 (op=linea): el kit de la linea (K) y el reloj de los momentos (M)
import { tonoOrg, tonoCompeticion, separar, aplicarTono, paletaDe } from './tono.js';
import { marcador as marcadorTx, placaInferior } from './transmision.js';
import { victoriaDerrota, quemar as quemarCarta } from './ceremonia.js';
import { crearBeats } from './beats.js';

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

// ---------- PLANUI §4.7: las opciones del partido (ctx.op). Sin `op`, la pantalla es la de hoy. ----------
//   luz          la luz del evento: el mundo toma la paleta de la competicion; su logo en la cabecera, los de los
//                equipos en el marcador, las columnas y el camino
//   transmision  la transmision oficial: el marcador como "score bug", las placas inferiores y una cortina de entrada
//   escenario    la arena: el campeon en la pantalla gigante, los cabezales en la paleta del torneo, el publico
//   final        PLANUI §4.8, la ultima demostracion: el estadio con sus pantallas LED (la serie) y el Swiss como stream
const OPCIONES = ['luz', 'transmision', 'escenario', 'final'];
// cuanto toma la paleta de la competicion el lugar de la luz de la era (el resto sigue siendo la era)
const K_PALETA = { luz: 0.85, transmision: 0.55, escenario: 1, final: 1 };
// §4.8: la sala del estadio. `suelo`: el piso del escenario (uv) segun la forma; los cabezales a un 30 % y casi quietos
// (luz de ambiente, no de recital); el publico del shader apagado (lo dibuja el DOM, por delante de las pantallas).
const SALA_FINAL = { draft: { suelo: 0.5 }, tribuna: { suelo: 0.42 } };
const HACES_FINAL = 0.3;
const CORTINA = 1500; // la cortina de entrada de la transmision (ms); Espacio o Esc la saltean
const LED_ARTE = [520, 400]; // §4.8: la resolucion del arte de cada lado del duelo de la pantalla central (px del canvas)
const LED_SOLAPE = 160; // §4.8: cuanto se pisan dos mapas seguidos en la pantalla central (ms), para que no quede un hueco
// el publico de la arena: la linea de las cabezas (uv, desde abajo) segun la forma de la pantalla
const SUELO_ARENA = { draft: 0.37, tribuna: 0.3 };
let duenoComp = null; // la pantalla que puso html[data-comp]: la vieja no se lo saca a la nueva

function identidad(op, datos, muestra, forma) {
  if (!OPCIONES.includes(op)) return { activa: false, op: null, comp: null, props: {}, marcar() {}, soltar() {}, luz: (era) => leerColor(`--luz-${era}`) };
  const comp = competicionDe(datos, muestra);
  const yo = {};
  const k = K_PALETA[op];
  return {
    activa: true,
    op,
    comp,
    // lo que main.js le pasa al mundo: la paleta, la arena y la escena (js/fondo.js)
    props: {
      paleta: { luz: comp.tokens.luz, contra: comp.tokens.contra, k },
      arena: op === 'escenario' ? { k: 1, suelo: SUELO_ARENA[forma] } : op === 'final' ? { k: 1, suelo: SALA_FINAL[forma].suelo, haces: HACES_FINAL, publico: 0 } : 0,
      escena: op === 'escenario' ? 'arena' : op === 'final' ? 'estadio' : null,
    },
    marcar() {
      duenoComp = yo;
      document.documentElement.dataset.comp = comp.id;
    },
    soltar() {
      if (duenoComp !== yo) return;
      duenoComp = null;
      delete document.documentElement.dataset.comp;
    },
    // la luz con la que se pinta el duotono de las piezas: la de la era, llevada a la de la competicion como el mundo
    luz: (era) => {
      const a = leerColor(`--luz-${era}`);
      const b = leerColor(comp.tokens.luz);
      return a.map((v, i) => v + (b[i] - v) * k);
    },
  };
}

// La cortina de entrada de la transmision: "CBLOL 2030 · La final". Corta, y Espacio/Esc la saltean. Es WAAPI con
// fill backwards: al terminar (o congelada despues) no esta.
function cortina(contenedor, comp, titulo, sub) {
  if (quieto()) return null;
  const nodo = el('div', { class: 'tv-cortina', 'aria-hidden': 'true' }, [
    el('i', { class: 'tv-cortina-filo' }),
    el('div', { class: 'tv-cortina-cuerpo' }, [logoComp(comp, { clase: 'tv-cortina-logo' }), el('p', { class: 'tv-cortina-t', text: titulo }), el('p', { class: 'tv-cortina-sub', text: sub })]),
  ]);
  contenedor.append(nodo);
  anim(nodo, [{ visibility: 'visible', clipPath: 'inset(0 100% 0 0)' }, { visibility: 'visible', clipPath: 'inset(0 0 0 0)', offset: 0.16 }, { visibility: 'visible', clipPath: 'inset(0 0 0 0)', offset: 0.8 }, { visibility: 'visible', clipPath: 'inset(0 0 0 100%)' }], { duration: CORTINA, easing: 'cubic-bezier(0.7, 0, 0.3, 1)' });
  anim(nodo.querySelector('.tv-cortina-filo'), [{ transform: 'translateX(-100%)' }, { transform: 'translateX(100%)' }], { duration: CORTINA * 0.45, delay: 60, easing: EXPO });
  anim(nodo.querySelector('.tv-cortina-logo'), [{ opacity: 0, transform: 'scale(0.7)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 180, easing: EXPO });
  anim(nodo.querySelector('.tv-cortina-t'), [{ opacity: 0, letterSpacing: '0.3em' }, { opacity: 1, letterSpacing: '0.01em' }], { duration: 520, delay: 240, easing: EXPO });
  anim(nodo.querySelector('.tv-cortina-sub'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 420, easing: EXPO });
  return {
    saltar() {
      for (const a of nodo.getAnimations({ subtree: true })) a.finish();
    },
    viva: () => nodo.getAnimations({ subtree: true }).some((a) => a.playState === 'running'),
  };
}

// nombre y etiquetas desde el catalogo real del inicio; si no esta, la clave misma
function fichaDe(datos, k) {
  const key = claveCampeon(k);
  const c = Object.values(datos.inicio?.catalogos?.campeonesPorRol ?? {}).flat().find((x) => x.ddragon === key);
  return { key, nombre: c?.name ?? key ?? '', tags: (c?.tags ?? []).map((t) => ETIQUETAS[t] ?? String(t)) };
}
// El arte en el duotono de la era (A): sombra = el vacio, luz = la luz de la era, recortado por la cara. Cuanto color
// real lleva encima lo decide la politica del color (js/color.js).
function pintar(canvas, img, era, foco, luz = leerColor(`--luz-${era}`)) {
  if (!img) return;
  pintarCampeon(canvas, img, leerColor('--bg-void'), luz, { foco, brillo: 1.12 });
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

// ======================================================================================================================
// PLANUI §4.8 (op=final): EL ESTADIO
// ======================================================================================================================
// El escenario del torneo, como en una final de LoL Esports: la pantalla LED central, dos laterales en angulo (un equipo
// cada una) y la faja de LED al pie del escenario. Adelante, el publico en siluetas, recortado contra las pantallas.
// Las pantallas son DOM: los logos son <img> (nunca canvas) y el arte es canvas 2D con la receta del color. La sala (la
// luz de ambiente, el humo, los cabezales quietos) es del ambiente: js/fondo.js, escena 'estadio'. Todo es el mundo
// (aria-hidden): lo que dicen las pantallas tambien lo dice el panel. La serie y el Swiss (adentro del reproductor)
// arman la misma estructura; cada uno llena las pantallas con lo suyo.
const PUBLICO = {
  ancho: 1600,
  alto: 120,
  // dos filas: la de atras mas chica y lavada por el humo, la de adelante en negro
  filas: [
    { clase: 'fila-lejos', escala: 0.56, paso: 25, base: 98, varia: 0.2 },
    { clase: 'fila-cerca', escala: 1, paso: 44, base: 128, varia: 0.26 },
  ],
  celulares: 0.1, // cuantos levantan el celular
};
const ORDEN_ROL = ['top', 'jungla', 'mid', 'adc', 'support'];
const ETQ_ROL = { top: 'Top', jungla: 'Jungla', mid: 'Mid', adc: 'ADC', support: 'Support' };

// El publico: siluetas (cabeza y hombros) con el PRNG decorativo, y algun celular en alto que titila (CSS; quieto con
// movimiento reducido). Se escala con `slice`: siempre cubre el ancho, recortando arriba.
function publicoSvg(semilla) {
  const az = crearAzar(`publico-${semilla}`);
  const { ancho: W, alto: H } = PUBLICO;
  const s = svg('svg', { class: 'publico', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMax slice', 'aria-hidden': 'true' });
  for (const f of PUBLICO.filas) {
    let d = '';
    const cels = [];
    for (let x = az.entre(-24, 0); x < W + 30; x += f.paso * az.entre(0.7, 1.35)) {
      const k = f.escala * az.entre(1 - f.varia, 1 + f.varia);
      const r = 10.5 * k;
      const hombro = 24 * k;
      const arriba = f.base - 34 * k + az.entre(-4, 4) * k;
      const cy = arriba - r * 0.72;
      d += `M${(x - hombro).toFixed(1)} ${H + 4}V${(arriba + 13 * k).toFixed(1)}Q${(x - hombro).toFixed(1)} ${arriba.toFixed(1)} ${(x - hombro * 0.4).toFixed(1)} ${arriba.toFixed(1)}`;
      d += `H${(x + hombro * 0.4).toFixed(1)}Q${(x + hombro).toFixed(1)} ${arriba.toFixed(1)} ${(x + hombro).toFixed(1)} ${(arriba + 13 * k).toFixed(1)}V${H + 4}Z`;
      d += `M${(x - r).toFixed(1)} ${cy.toFixed(1)}a${r.toFixed(1)} ${(r * 1.18).toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${(r * 1.18).toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`;
      if (az.siguiente() < PUBLICO.celulares) cels.push({ x: x + az.entre(-9, 9) * k, y: cy - r * 2.9, k, demora: az.entre(0, 3.2) });
    }
    s.append(svg('path', { class: f.clase, d }));
    for (const c of cels) {
      s.append(svg('path', { class: `brazo ${f.clase}`, d: `M${(c.x - 5 * c.k).toFixed(1)} ${(c.y + 34 * c.k).toFixed(1)}L${c.x.toFixed(1)} ${(c.y + 9 * c.k).toFixed(1)}`, 'stroke-width': (5.5 * c.k).toFixed(1) }));
      s.append(svg('rect', { class: 'cel', x: (c.x - 3.5 * c.k).toFixed(1), y: c.y.toFixed(1), width: (7 * c.k).toFixed(1), height: (11 * c.k).toFixed(1), rx: (1.4 * c.k).toFixed(1), style: `animation-delay:-${c.demora.toFixed(2)}s` }));
    }
  }
  return s;
}

// El esqueleto: las cuatro pantallas y el publico. `en`: 'escenario' (la serie, arriba del draft) o 'feed' (el Swiss,
// adentro del reproductor).
function crearEstadio({ en, semilla }) {
  const centro = el('div', { class: 'led led-centro' });
  const nos = el('div', { class: 'led led-lado led-nos' });
  const ellos = el('div', { class: 'led led-lado led-ellos' });
  const faja = el('div', { class: 'led led-faja' });
  const nodo = el('div', { class: 'estadio', 'data-en': en, 'aria-hidden': 'true' }, [
    el('div', { class: 'estadio-escena' }, [nos, ellos, centro, faja]),
    publicoSvg(semilla),
  ]);
  return { nodo, centro, nos, ellos, faja };
}

// La placa de jugadores de la transmision: handle + rol, sin campeon (el motor no simula los picks de tus companeros).
function plantelDe(m, fr) {
  const yo = { handle: fr.quien?.handle, rol: fr.quien?.rol, vos: true };
  const otros = (m.ficha?.jugador?.companeros ?? []).map((c) => ({ handle: c.handle, rol: c.role ?? c.rol }));
  return [yo, ...otros].filter((x) => x.handle).sort((a, b) => ORDEN_ROL.indexOf(a.rol) - ORDEN_ROL.indexOf(b.rol));
}
const plantelLed = (lista) => el('ol', { class: 'led-plantel' }, lista.map((p) => el('li', { 'data-vos': p.vos ? '' : null }, [glifoRol(p.rol), el('b', { text: p.handle }), el('small', { text: ETQ_ROL[p.rol] ?? p.rol ?? '' })])));

// La pantalla de un equipo: el logo, el nombre, los mapas que lleva (los pips del Bo) y lo que se sume abajo.
function ladoLed(nodo, nombre, { pips = 0, prendidos = 0, kicker, extra = [] } = {}) {
  const ps = Array.from({ length: pips }, (_, i) => el('i', { class: 'led-pip', 'data-on': i < prendidos ? '' : null }, el('i')));
  nodo.append(...[
    logoOrg(nombre, { clase: 'led-lado-logo' }),
    kicker ? el('p', { class: 'led-lado-k', text: kicker }) : null,
    el('p', { class: 'led-lado-n', text: nombre }),
    pips ? el('p', { class: 'led-pips' }, ps) : null,
    ...extra,
  ].filter(Boolean));
  return ps;
}
// El encendido de las pantallas al entrar: suben de negro con un parpadeo corto, la central primero.
function encenderEstadio(est, t0) {
  [est.centro, est.nos, est.ellos, est.faja].forEach((n, i) => anim(n, [{ opacity: 0, filter: 'brightness(0.2)' }, { opacity: 1, filter: 'brightness(1.9)', offset: 0.35 }, { opacity: 0.75, offset: 0.5 }, { opacity: 1, filter: 'none' }], { delay: t0 + (i ? 90 + i * 70 : 0), duration: 520, easing: 'linear' }));
}

// ---------- §4.8: el reproductor del stream ----------
// El patron de los reproductores de stream (sin marcas de ninguna plataforma): reproducir/pausar, volumen con su
// deslizador, la marca EN VIVO, la calidad (un menu) y pantalla completa. Los controles se esconden solos si no se
// mueve el mouse (como un reproductor) y vuelven al moverlo, con el teclado o en pausa.
const STREAM = {
  espectadores: [184000, 412000], // decorativo (PRNG): lo que mira una ronda decisiva del Swiss
  esconder: 3200, // ms sin mover el mouse hasta que la barra se va
  calidades: ['1080p60', '720p60', '480p', '360p', 'Automática'],
  volumen: 64,
};
const ICONO_PLAYER = {
  play: ['M8 5.5v13l10.5-6.5z'],
  pausa: ['M7 5h3.6v14H7z', 'M13.4 5H17v14h-3.6z'],
  volumen: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M15.5 9a4.2 4.2 0 0 1 0 6', 'M18 6.5a8 8 0 0 1 0 11'],
  mudo: ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M15.5 9.5l5 5', 'M20.5 9.5l-5 5'],
  calidad: ['M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z', 'M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7'],
  completa: ['M4 9V4h5', 'M15 4h5v5', 'M20 15v5h-5', 'M9 20H4v-5'],
  salir: ['M9 4v5H4', 'M20 9h-5V4', 'M15 20v-5h5', 'M4 15h5v5'],
};
const LLENOS = new Set(['play', 'pausa']);
function icoPlayer(nombre) {
  const s = svg('svg', { class: `pl-ico${LLENOS.has(nombre) ? ' lleno' : ''}`, viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  for (const d of ICONO_PLAYER[nombre]) s.append(svg('path', { d }));
  return s;
}
function controlesPlayer(player, feed) {
  const boton = (clase, etiqueta, ico) => el('button', { type: 'button', class: `pl-btn ${clase}`, 'aria-label': etiqueta, title: etiqueta }, icoPlayer(ico));
  const play = boton('pl-play', 'Pausar', 'pausa');
  const vol = boton('pl-vol', 'Silenciar', 'volumen');
  const barraVol = el('input', { type: 'range', class: 'pl-vol-barra', min: '0', max: '100', step: '1', value: String(STREAM.volumen), 'aria-label': 'Volumen' });
  barraVol.style.setProperty('--v', String(STREAM.volumen / 100));
  const calidad = el('button', { type: 'button', class: 'pl-btn pl-calidad', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'Calidad' }, [icoPlayer('calidad'), el('span', { text: STREAM.calidades[0] })]);
  const menu = el('ul', { class: 'pl-menu', role: 'menu', 'aria-label': 'Calidad', hidden: true }, STREAM.calidades.map((q, i) => el('li', { role: 'none' }, el('button', { type: 'button', role: 'menuitemradio', 'aria-checked': i ? 'false' : 'true', 'data-q': q }, [q, i ? null : el('small', { text: 'fuente' })]))));
  const completa = boton('pl-completa', 'Pantalla completa', 'completa');
  const grande = el('button', { type: 'button', class: 'pl-grande', 'aria-label': 'Reproducir', tabindex: '-1' }, icoPlayer('play'));
  const barra = el('div', { class: 'pl-barra' }, [
    play,
    el('span', { class: 'pl-vol-grupo' }, [vol, barraVol]),
    el('span', { class: 'pl-vivo' }, [el('i'), 'En vivo']),
    el('span', { class: 'pl-espacio' }),
    el('span', { class: 'pl-calidad-grupo' }, [calidad, menu]),
    completa,
  ]);
  player.append(grande, barra);
  // la barra: se va sola si no se mueve el mouse; vuelve al moverlo, con el foco o en pausa
  let reloj = 0;
  const mostrar = () => {
    player.dataset.ui = 'on';
    clearTimeout(reloj);
    reloj = setTimeout(() => {
      if (!player.dataset.pausa && menu.hidden) player.dataset.ui = 'off';
    }, STREAM.esconder);
  };
  player.addEventListener('pointermove', mostrar);
  player.addEventListener('focusin', mostrar);
  // reproducir / pausar: en pausa el video se congela (las animaciones del feed) y aparece el boton grande
  const pausar = (si) => {
    player.toggleAttribute('data-pausa', si);
    play.replaceChildren(icoPlayer(si ? 'play' : 'pausa'));
    play.setAttribute('aria-label', si ? 'Reproducir' : 'Pausar');
    play.title = play.getAttribute('aria-label');
    for (const a of feed.getAnimations({ subtree: true })) {
      if (si) a.pause();
      else if (a.playState === 'paused') a.play();
    }
    mostrar();
  };
  play.addEventListener('click', () => pausar(!player.hasAttribute('data-pausa')));
  grande.addEventListener('click', () => pausar(false));
  // el volumen: el boton silencia (y recuerda el nivel), el deslizador lo mueve
  let antes = STREAM.volumen;
  const ponerVol = (v) => {
    barraVol.value = String(v);
    barraVol.style.setProperty('--v', String(v / 100));
    vol.replaceChildren(icoPlayer(v > 0 ? 'volumen' : 'mudo'));
    vol.setAttribute('aria-label', v > 0 ? 'Silenciar' : 'Activar sonido');
    vol.title = vol.getAttribute('aria-label');
  };
  vol.addEventListener('click', () => {
    const v = Number(barraVol.value);
    if (v > 0) antes = v;
    ponerVol(v > 0 ? 0 : antes || STREAM.volumen);
  });
  barraVol.addEventListener('input', () => ponerVol(Number(barraVol.value)));
  // la calidad: un menu de opciones (Esc o un clic afuera lo cierran)
  const abrir = (si) => {
    menu.hidden = !si;
    calidad.setAttribute('aria-expanded', String(si));
    if (si) menu.querySelector('[aria-checked="true"]')?.focus();
  };
  calidad.addEventListener('click', () => abrir(menu.hidden));
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    menu.querySelectorAll('[data-q]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    calidad.querySelector('span').textContent = b.dataset.q;
    abrir(false);
    calidad.focus();
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    abrir(false);
    calidad.focus();
  });
  const afuera = (e) => {
    if (!menu.hidden && !e.target.closest?.('.pl-calidad-grupo')) abrir(false);
  };
  document.addEventListener('pointerdown', afuera);
  // pantalla completa: el reproductor ocupa la pantalla (y el navegador pasa a pantalla completa si lo deja)
  const tribuna = () => player.closest('.tribuna');
  const enCompleta = (si) => {
    tribuna()?.toggleAttribute('data-completa', si);
    completa.replaceChildren(icoPlayer(si ? 'salir' : 'completa'));
    completa.setAttribute('aria-label', si ? 'Salir de pantalla completa' : 'Pantalla completa');
    completa.title = completa.getAttribute('aria-label');
  };
  completa.addEventListener('click', () => {
    const si = !tribuna()?.hasAttribute('data-completa');
    enCompleta(si);
    if (si) document.documentElement.requestFullscreen?.().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  });
  const alSalir = () => {
    if (!document.fullscreenElement && tribuna()?.hasAttribute('data-completa')) enCompleta(false);
  };
  document.addEventListener('fullscreenchange', alSalir);
  return {
    mostrar,
    destruir() {
      clearTimeout(reloj);
      document.removeEventListener('pointerdown', afuera);
      document.removeEventListener('fullscreenchange', alSalir);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    },
  };
}

export function crearPartido(ctx) {
  // PLANUI §4.9: con `op=linea`, la transmision (al final del archivo). Sin op, `final` y §4.7 siguen por aca, intactas.
  if (ctx.op === 'linea') return ctx.muestra === 'swiss' ? crearSwissLinea(ctx) : crearSerieLinea(ctx);
  return ctx.muestra === 'swiss' ? crearSwiss(ctx) : crearDraft(ctx);
}

// ======================================================================================================================
// La serie: el draft
// ======================================================================================================================
function crearDraft({ datos, muestra, amb, aura, sonido, peor, op }) {
  const m = datos[muestra];
  const ident = identidad(op, datos, muestra, 'draft');
  ident.marcar();
  // §4.8: el estadio arriba (las pantallas LED) y el draft abajo
  const final = ident.op === 'final';
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
      pintar(c, img, eraDe(), foco, ident.luz(eraDe()));
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
        ident.activa ? logoOrg(nombre, { clase: 'eq-logo' }) : null,
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
  let alAura = null; // §4.8: el duelo de la pantalla central sigue al aura
  const desuscribir = aura?.alCambiar((k) => {
    ponerNombre(k);
    alAura?.(k);
  });
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
  // §4.7: con una opcion, el marcador lleva los logos y las siglas de la transmision; en `transmision` es el "score bug"
  const msEq = (n) => (ident.activa ? el('span', { class: 'ms-eq ms-eq-logo' }, [logoOrg(n, { clase: 'ms-logo' }), el('b', { class: 'ms-sigla', text: siglaDe(n) })]) : el('span', { class: 'ms-eq', text: n }));
  const marcador = el('p', { class: 'marcador-serie', 'aria-label': ident.activa ? `Marcador de la serie: ${nos} contra ${ellos}` : 'Marcador de la serie' }, [msEq(nos), marcadorRodante([], marcadorAhora), msEq(ellos)]);
  if (ident.op === 'transmision') {
    marcador.classList.add('tv-bug');
    marcador.prepend(logoComp(ident.comp, { clase: 'tv-bug-comp' }));
    marcador.append(el('span', { class: 'tv-bug-fase', text: `${ident.comp.fase} · Bo${formato}` }));
  }
  const juego = el('div', { class: 'juego', 'aria-live': 'polite' });
  // §4.7 transmision: lo apuntado es una placa inferior, con quien juega (tu handle, tu rol, tu equipo)
  const quien = ident.op === 'transmision' ? el('p', { class: 'tv-placa-quien' }, [logoOrg(nos, { clase: 'tv-placa-logo' }), el('b', { text: fr.quien?.handle ?? '' }), el('span', { text: `${fr.quien?.rolEtiqueta ?? ''} · ${siglaDe(nos)}` })]) : null;
  const kickerLibres = el('p', { class: 'eq-kicker' }, [el('span', { text: 'Tus libres' }), el('b', { class: 'libres-n', text: String(libres.length) })]);
  const escenario = final ? null : el('div', { class: 'escenario' }, [
    el('div', { class: 'ap' }, [el('p', { class: 'eq-kicker', text: replan ? 'Te lo leyeron' : 'Apuntando' }), nombreAp, tagsAp, quien]),
    el('div', { class: 'escenario-pie' }, [kickerLibres, libresRow]),
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
  // §4.7: el logo del torneo en la cabecera, en el lugar del punto de luz
  if (ident.activa) cab.rotulo.querySelector('.punto-luz')?.replaceWith(logoComp(ident.comp, { clase: 'rot-logo' }));

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
  // §4.8: sin la ventana del escenario, tus libres pasan al panel, arriba de los planes
  const decide = el('div', { class: 'decide' }, final ? [el('div', { class: 'libres-bloque' }, [kickerLibres, libresRow]), planes, inspector, enJuego] : [planes, inspector, enJuego]);
  const centro = el('div', { class: 'draft-centro' }, final ? [cab.nodo, decide, ocultas] : [cab.nodo, escenario, decide, ocultas]);
  const draft = el('div', { class: 'draft', 'data-replan': replan ? '' : null }, [colNos.nodo, centro, colEllos.nodo]);
  const est = final ? estadioSerie() : null;

  const raiz = el('section', { class: 'parada partido', 'data-pieza': 'partido', 'data-forma': 'draft', 'data-muestra': muestra, 'data-op': ident.op, 'data-comp': ident.comp?.id });
  const frN = franja(fr, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });
  const tray = trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad);
  raiz.append(frN, ...(est ? [est.nodo] : []), draft, cuartos('temporada', null, tray));
  if (est) alAura = est.aDuelo;
  apuntar(0);

  // ---------- §4.8: las pantallas del estadio ----------
  // La central es el duelo de mid (tu pick contra el del rival, con el marcador y los logos arriba); las laterales, los
  // equipos (logo, mapas ganados y tu plantel); la faja, Fearless. El aura pone el campeon apuntado en la central, del
  // lado de quien lo juega.
  function estadioSerie() {
    const e = crearEstadio({ en: 'escenario', semilla: `${m.anio}-${muestra}` });
    const siglaNos = siglaDe(nos);
    const siglaEllos = siglaDe(ellos);
    const rol = fr.quien?.rol ?? 'mid';
    // la cabecera de la central: el torneo y la ronda; el marcador (con sus logos) en el medio
    const cabLed = el('div', { class: 'led-cab' }, [
      el('p', { class: 'led-cab-comp' }, [logoComp(ident.comp, { clase: 'led-cab-logo' }), el('span', { text: ronda })]),
      marcador,
      el('p', { class: 'led-cab-fl', text: replan ? `Bo${formato} · mapa ${offset + 1}` : `Bo${formato} · Fearless` }),
    ]);
    const pjNos = pjLed('nos');
    const pjEllos = pjLed('ellos');
    const duelo = el('div', { class: 'led-duelo' }, [pjNos.nodo, pjEllos.nodo, el('p', { class: 'led-vs', text: 'vs' }), el('p', { class: 'led-rol' }, [glifoRol(rol), ETQ_ROL[rol] ?? rol])]);
    e.centro.append(cabLed, duelo, juego);
    // el duelo por defecto: tu campeon planeado contra la intencion del rival; en el replan, el que te leyeron y tu pick
    // todavia sin hacer
    const subNos = `${fr.quien?.handle ?? ''} · ${siglaNos}`;
    const defNos = replan ? null : base;
    const defEllos = replan ? leido : intencionRival;
    const subEllos = `${siglaEllos} · ${replan ? 'te lo leyó' : 'su intención'}`;
    // de que lado juega cada campeon (para el aura)
    const lado = new Map();
    libres.forEach((k) => lado.set(k, 'nos'));
    jugados.forEach((mp) => {
      lado.set(claveCampeon(mp.campeon), 'nos');
      if (mp.rivalJuega) lado.set(claveCampeon(mp.rivalJuega), 'ellos');
    });
    if (intencionRival) lado.set(intencionRival, 'ellos');
    if (leido) lado.set(leido, 'ellos');
    const aDuelo = (k) => {
      if (!k || k === base) {
        pjNos.mostrar(defNos, subNos);
        pjEllos.mostrar(defEllos, subEllos);
      } else if (lado.get(k) === 'ellos') {
        pjNos.mostrar(defNos, subNos);
        pjEllos.mostrar(k, `${siglaEllos} · apuntado`);
      } else {
        pjNos.mostrar(k, subNos);
        pjEllos.mostrar(defEllos, subEllos);
      }
    };
    aDuelo(null);
    // las laterales: los equipos, con los mapas que lleva cada uno (al mejor de `formato`)
    const aGanar = Math.ceil(formato / 2);
    const pipsNos = ladoLed(e.nos, nos, { pips: aGanar, prendidos: marcadorAhora[0], extra: [plantelLed(plantelDe(m, fr))] });
    const pipsEllos = ladoLed(e.ellos, ellos, { pips: aGanar, prendidos: marcadorAhora[1], kicker: ronda });
    // la faja: Fearless, los quemados de la serie
    const contador = el('b', { class: 'led-faja-n num', text: `${quemados0.length}/${capacidad}` });
    // cada hueco: el marco vacio y, adentro, lo quemado (el icono y la tacha), que es lo que se anima al quemarse
    const huecos = Array.from({ length: capacidad }, () => el('i', { class: 'led-q' }, el('i', { class: 'led-q-in' }, el('i', { class: 'led-q-tacha' }))));
    const quemar = (k, i, leidoK = false) => {
      const h = huecos[i];
      if (!h) return null;
      const adentro = h.firstElementChild;
      h.dataset.on = '';
      if (leidoK) h.dataset.leido = '';
      cargas.push(cargarImagen(urlIcono(k, meta)).then((img) => img && adentro.prepend(img.cloneNode())));
      return adentro;
    };
    quemados0.forEach((k, i) => quemar(k, i, k === leido));
    e.faja.append(logoComp(ident.comp, { clase: 'led-faja-logo' }), el('p', { class: 'led-faja-t' }, [el('b', { text: 'Fearless' }), el('span', { text: 'quemados' })]), el('span', { class: 'led-faja-q' }, huecos), contador);
    return { ...e, aDuelo, pipsNos, pipsEllos, quemar, contador, siglaNos, siglaEllos };
  }
  // un lado del duelo: el arte del campeon (canvas, la receta del color) y su nombre; sin campeon, el "?" de tu pick
  function pjLed(ladoPj) {
    const c = el('canvas', { class: 'led-arte', width: String(LED_ARTE[0]), height: String(LED_ARTE[1]) });
    const reg = [c, null, [0.5, 0.26]];
    lienzos.push(reg);
    const nombre = el('b');
    const sub = el('small');
    const nodo = el('div', { class: `led-pj ${ladoPj}` }, [c, el('span', { class: 'led-pj-vacio', text: '?' }), el('p', { class: 'led-pj-n' }, [nombre, sub])]);
    let actualK;
    let pedido = 0;
    function mostrar(k, texto) {
      sub.textContent = texto;
      if (k === actualK) return;
      const primera = actualK === undefined;
      actualK = k;
      const yo = ++pedido;
      nodo.toggleAttribute('data-vacio', !k);
      nombre.textContent = k ? fichaDe(datos, k).nombre : 'Tu pick';
      if (!primera && !quieto()) anim(nodo, [{ filter: 'brightness(2.2) saturate(0.4)' }, { filter: 'none' }], { duration: 300, easing: EXPO });
      if (!k) {
        reg[1] = null;
        c.getContext('2d').clearRect(0, 0, c.width, c.height);
        return;
      }
      cargas.push(cargarImagen(urlCentrada(k, meta)).then((img) => {
        if (yo !== pedido || !img) return;
        reg[1] = img;
        pintar(c, img, eraDe(), reg[2], ident.luz(eraDe()));
      }));
    }
    return { nodo, mostrar };
  }

  // ---------- entrada: luz -> rotulo -> titulo -> los equipos por los costados -> planes ----------
  let telon = null;
  function entrada() {
    if (ident.op === 'transmision') telon = cortina(draft, ident.comp, `${ident.comp.nombre} ${ident.comp.anio ?? ''}`.trim(), `${ident.comp.fase} · Bo${formato} · Fearless`);
    entrar(frN, 0, -10);
    if (est) encenderEstadio(est, 40);
    anim(draft, [{ opacity: 0, transform: `translateY(${est ? 28 : 14}px)` }, { opacity: 1, transform: 'none' }], { delay: est ? 140 : 80, duration: 320, easing: EXPO });
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
      (est ? est.centro : escenario).append(sello);
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
    telon?.saltar(); // elegir saltea la cortina de la transmision (si sigue)
    const r = m.resultados?.find((x) => x.opcionId === op.id);
    const logs = r?.logsDeLaSerie ?? r?.inmediato?.logs ?? [];
    const iMapas = logs.map((l, i) => (l.mapa ? i : -1)).filter((i) => i >= 0);
    const primerMapa = iMapas[0] ?? -1;
    const ultimoMapa = iMapas[iMapas.length - 1] ?? -1;
    draft.dataset.jugando = '';
    // §4.8: la central deja el duelo de la seleccion cuando arranca el primer mapa
    const duelo = est?.centro.querySelector('.led-duelo');
    if (duelo) {
      duelo.style.visibility = 'hidden';
      anim(duelo, [{ visibility: 'visible' }, { visibility: 'visible' }], { duration: T0_MAPAS + MAPA * 0.12 });
    }
    // el escenario deja de ser la seleccion: el nombre apuntado y tus libres se apagan, entra la serie
    escenario?.querySelectorAll('.ap, .escenario-pie').forEach((x) => {
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
    const picks = []; // [ms, campeon]: tu pick de cada mapa, para el mundo (si la politica lo muestra)
    juego.replaceChildren();
    logs.forEach((l, i) => {
      if (l.mapa) {
        picks.push([t, claveCampeon(l.campeon)]);
        jugarMapa(l, t, i === ultimoMapa);
        t += MAPA;
      } else if (primerMapa >= 0 && i > primerMapa && i < ultimoMapa) {
        // la charla del coach entre mapas
        const cartel = el('div', { class: 'cartel-charla' }, [icono('coach'), el('p', { text: l.message })]);
        (est ? decide : juego).append(cartel);
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
      if (est) {
        mapaEnEstadio(l, k, rk, t0, esUltimo);
        if (gano) amb.pulso('logro', quieto() ? 0 : t0 + 380);
        fearless(l, k, rk, t0);
        return;
      }
      // el escenario: la pantalla de carga del mapa (tu pick contra el del rival) y su post-game
      const capa = el('div', { class: 'mapa-capa', 'data-res': l.resultado }, [
        el('div', { class: 'carga carga-nos' }, [retratoDe(k, urlCarga, 176, 320, [0.5, 0.2], 'carga-arte'), el('b', { text: fichaDe(datos, k).nombre }), ident.activa ? logoOrg(nos, { clase: 'carga-logo' }) : null]),
        el('div', { class: 'carga carga-ellos' }, [rk ? retratoDe(rk, urlCarga, 176, 320, [0.5, 0.2], 'carga-arte') : null, el('b', { text: rk ? fichaDe(datos, rk).nombre : '' }), ident.activa ? logoOrg(ellos, { clase: 'carga-logo' }) : null]),
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
      fearless(l, k, rk, t0);
    }
    // el marcador y Fearless: lo que salio queda quemado para los dos (el tablero del panel, tus libres y la faja)
    function fearless(l, k, rk, t0) {
      const [a, b] = String(l.marcador).split('-').map(Number);
      if (Number.isFinite(a) && Number.isFinite(b)) pasos.push({ t: t0 + 400, a, b });
      const tq = t0 + Math.round(MAPA * 0.6);
      for (const q of [k, rk]) {
        if (!q || quemados.has(q)) continue;
        quemados.add(q);
        const nodo = quemadoNodo(q);
        const hueco = [...tablero.querySelectorAll('.quemado-hueco')].find((h) => !h.children.length);
        if (hueco) hueco.append(nodo);
        else tablero.append(nodo);
        anim(nodo, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'none' }], { delay: tq, duration: 260, easing: EXPO });
        const enFaja = est?.quemar(q, quemados.size - 1);
        if (enFaja) anim(enFaja, [{ opacity: 0, transform: 'scale(1.9)', filter: 'brightness(2.4)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: tq, duration: 360, easing: EXPO });
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
    amb.momento?.({ retardo: quieto() ? 0 : T0_MAPAS, dura: t - T0_MAPAS + RESULTADO, campeones: picks.filter(([, k]) => k) });
    if (animoFin === 'gloria') amb.pulso('gloria', quieto() ? 0 : t);
    contadorQ.textContent = `${quemados.size} de ${capacidad}`;
    anim(contadorQ, [{ opacity: 0 }, { opacity: 1 }], { delay: t - MAPA * 0.4, duration: 200 });
    if (est) {
      est.contador.textContent = `${quemados.size}/${capacidad}`;
      anim(est.contador, [{ opacity: 0 }, { opacity: 1 }], { delay: t - MAPA * 0.4, duration: 200 });
    }
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
        el('p', { class: 'eq-kicker' }, [ident.activa ? logoComp(ident.comp, { clase: 'rot-logo' }) : null, `${liga} ${m.anio} · ${ronda} · Bo${formato}${sigue ? ' · sigue' : ''}`]),
        el('p', { class: 'sf-marcador num', text: (ultimo?.marcador ?? '').replace('-', '–') }),
        el('ol', { class: 'sf-mapas' }, todos.map((mp) => el('li', { 'data-res': mp.resultado, 'data-campeon': claveCampeon(mp.campeon), tabindex: '0' }, [el('span', { text: `M${mp.mapa}` }), el('b', { text: fichaDe(datos, mp.campeon).nombre })]))),
        texto ? el('p', { class: 'sf-texto', text: texto }) : null,
        el('button', { class: 'boton', type: 'button', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]),
      ]),
    ]);
    (est ? decide : juego).append(card);
    anim(card, [{ opacity: 0, visibility: 'visible', transform: 'translateY(14px)' }, { opacity: 1, visibility: 'visible', transform: 'none' }], { delay: t0, duration: 380, easing: EXPO });
    if (est) finalEnEstadio(gano, sigue, ultimo, t0);
    anim(card.querySelector('.emblema'), [{ transform: 'scale(0.4) rotate(-20deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: t0 + 80, duration: 520, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
    card.querySelectorAll('.sf-mapas li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 200 + i * 50, duration: 220 }));
    if (!est) {
      marcador.style.opacity = '0';
      anim(marcador, [{ opacity: 1 }, { opacity: 0 }], { delay: t0, duration: 200 });
    }
    const sal = enJuego.querySelector('.saltar');
    if (sal) {
      sal.style.visibility = 'hidden';
      anim(sal, [{ visibility: 'visible', opacity: 1 }, { visibility: 'visible', opacity: 0 }], { delay: t0, duration: 200 });
    }
    return card;
  }

  // §4.8: un mapa en el estadio. La central es la pantalla de carga (tu pick contra el del rival, a pantalla partida) y
  // despues el resultado (VICTORIA/DERROTA a todo el LED); la lateral del que gano se enciende y suma su mapa.
  function mapaEnEstadio(l, k, rk, t0, esUltimo) {
    const gano = l.resultado === 'W';
    const ladoCarga = (kk, lado, sub) => el('div', { class: `led-pj ${lado}` }, [
      kk ? retratoDe(kk, urlCentrada, LED_ARTE[0], LED_ARTE[1], [0.5, 0.26], 'led-arte') : null,
      el('p', { class: 'led-pj-n' }, [el('b', { text: kk ? fichaDe(datos, kk).nombre : '' }), el('small', { text: sub })]),
    ]);
    const capa = el('div', { class: 'led-mapa', 'data-res': l.resultado }, [
      ladoCarga(k, 'nos', `${fr.quien?.handle ?? ''} · ${est.siglaNos}`),
      ladoCarga(rk, 'ellos', est.siglaEllos),
      el('p', { class: 'led-vs', text: 'vs' }),
      el('p', { class: 'led-mapa-n', text: `Mapa ${l.mapa}${l.mapa === formato ? ' · el decisivo' : ''}` }),
      el('div', { class: 'led-res' }, [
        el('p', { class: 'led-res-t', text: gano ? 'Victoria' : 'Derrota' }),
        el('p', { class: 'led-res-sub' }, [logoOrg(gano ? nos : ellos, { clase: 'led-res-logo' }), el('b', { class: 'num', text: String(l.marcador).replace('-', '–') }), el('span', { text: `tenías ${pct(l.p)}` })]),
      ]),
    ]);
    juego.append(capa);
    // el LED no vuelve al duelo entre mapas: cada mapa queda (con su resultado) hasta que el siguiente lo tapa, aunque
    // en el medio hable el coach
    const dura = esUltimo ? MAPA : MAPA + CHARLA + LED_SOLAPE;
    anim(capa, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: (MAPA * 0.12) / dura }, { opacity: 1, visibility: 'visible' }], { delay: t0, duration: dura });
    // la carga entra desde los costados, el resultado cae encima con un destello del LED
    capa.querySelectorAll('.led-pj').forEach((c, j) => anim(c, [{ opacity: 0, transform: `translateX(${j ? 8 : -8}%)` }, { opacity: 1, transform: 'none' }], { delay: t0 + j * 70, duration: 340, easing: EXPO }));
    anim(capa.querySelector('.led-mapa-n'), [{ opacity: 0, transform: 'translateY(-60%)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 60, duration: 240, easing: EXPO });
    const res = capa.querySelector('.led-res');
    // el resultado queda arriba de la carga mientras dure la capa del mapa
    anim(res, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: 260 / (dura - 380) }, { opacity: 1, visibility: 'visible' }], { delay: t0 + 380, duration: dura - 380 });
    anim(res.querySelector('.led-res-t'), [{ transform: 'scale(1.35)', letterSpacing: '0.3em', filter: 'blur(6px) brightness(2)' }, { transform: 'none', filter: 'none' }], { delay: t0 + 380, duration: 420, easing: EXPO });
    const vs = capa.querySelector('.led-vs');
    vs.style.opacity = '0';
    anim(vs, [{ opacity: 1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { delay: t0, duration: 400 });
    if (!gano) capa.querySelectorAll('.led-pj.nos canvas').forEach((c) => anim(c, [{ filter: 'none' }, { filter: 'grayscale(1) brightness(0.5)' }], { delay: t0 + 380, duration: 320 }));
    // la lateral del que gano: un destello y su mapa
    const [a, b] = String(l.marcador).split('-').map(Number);
    const lado = gano ? est.nos : est.ellos;
    const pip = (gano ? est.pipsNos : est.pipsEllos)[(gano ? a : b) - 1];
    anim(lado, [{ filter: 'brightness(1.9)' }, { filter: 'none' }], { delay: t0 + 400, duration: 700, easing: EXPO });
    if (pip) {
      pip.dataset.on = '';
      anim(pip.firstElementChild, [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 420, duration: 360, easing: EXPO });
    }
  }
  // §4.8: el final de la serie en la central: el marcador grande con los dos logos y quien se la lleva
  function finalEnEstadio(gano, sigue, ultimo, t0) {
    const [a, b] = String(ultimo?.marcador ?? '').split('-');
    const titular = sigue ? 'La serie sigue' : gano ? (se.ronda === 'final' ? 'Campeones' : `${est.siglaNos} gana la serie`) : `${est.siglaEllos} gana ${se.ronda === 'final' ? 'la final' : 'la serie'}`;
    const capa = el('div', { class: 'led-final', 'data-gano': sigue ? 'sigue' : String(Boolean(gano)) }, [
      el('div', { class: 'led-final-eq', 'data-gana': !sigue && gano ? '' : null }, [logoOrg(nos, { clase: 'led-final-logo' }), el('b', { class: 'num', text: a ?? '' })]),
      el('div', { class: 'led-final-c' }, [el('p', { class: 'led-final-k', text: `${ident.comp.nombre} ${m.anio} · ${ronda}` }), el('p', { class: 'led-final-t', text: titular })]),
      el('div', { class: 'led-final-eq', 'data-gana': !sigue && !gano ? '' : null }, [el('b', { class: 'num', text: b ?? '' }), logoOrg(ellos, { clase: 'led-final-logo' })]),
    ]);
    juego.append(capa);
    anim(capa, [{ opacity: 0, visibility: 'visible', filter: 'brightness(2.4)' }, { opacity: 1, visibility: 'visible', filter: 'none' }], { delay: t0, duration: 520, easing: EXPO });
    anim(capa.querySelector('.led-final-t'), [{ opacity: 0, letterSpacing: '0.3em' }, { opacity: 1 }], { delay: t0 + 160, duration: 620, easing: EXPO });
  }

  // teclado: 1-3 eligen, flechas recorren, Esc/Espacio saltea, R repite
  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.key === 'Escape' || e.code === 'Space') && telon?.viva()) {
      e.preventDefault();
      telon.saltar();
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= ops.length && !elegida) {
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
    listo: () => Promise.all([...cargas, ...precarga, logosListos(raiz)]),
    alCambiarEra(e) {
      for (const [c, img, foco] of lienzos) pintar(c, img, e, foco, ident.luz(e));
    },
    destruir: () => {
      desuscribir?.();
      ident.soltar();
    },
    arte: base,
    animo: 'normal',
    encuadre: celular() ? 'celular' : 'draft',
    velo: 0.4,
    ...ident.props,
  };
}

// ======================================================================================================================
// El Swiss: la Tribuna
// ======================================================================================================================
function crearSwiss({ datos, muestra, amb, sonido, peor, op }) {
  const m = datos[muestra];
  const ident = identidad(op, datos, muestra, 'tribuna');
  ident.marcar();
  // §4.8: la transmision oficial adentro de un reproductor de stream; afuera, la pagina del stream y el chat
  const final = ident.op === 'final';
  const meta = datos.meta;
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
      el('span', { text: `R${r.ronda}` }), el('b', { text: gano ? 'V' : 'D' }), quienPip(otro),
    ]);
  };
  // §4.7: en el camino, el logo y la sigla de cada rival (se lee de un vistazo; el nombre entero queda en el title)
  function quienPip(n) {
    return ident.activa ? el('small', { class: 'pip-quien' }, [logoOrg(n, { clase: 'pip-logo' }), el('b', { text: siglaDe(n) })]) : el('small', { text: n });
  }
  const r5 = el('li', { 'data-res': 'vivo', title: ident.activa ? `Ronda ${proxima}: ${rival}` : null }, [el('span', { text: `R${proxima}` }), el('b', { text: '?' }), quienPip(rival)]);
  const camino = el('ol', { class: 'swiss-camino', 'aria-label': `Swiss: vas ${rec.v}-${rec.d}` }, [...rondas.map(pipNodo), r5]);
  const recViejo = el('span', { text: `${rec.v}-${rec.d}` });
  const vom = el('div', { class: 'vom' }, [
    el('p', { class: 'vom-band', text: 'Vida o muerte' }),
    el('p', { class: 'vom-sub' }, [el('b', { class: 'vom-rec num' }, recViejo), el('span', { text: `vs ${rival}` }), ident.activa ? logoOrg(rival, { clase: 'vom-logo' }) : null, ligaRival ? el('small', { text: ligaRival }) : null]),
  ]);
  const cabPlayer = el('div', { class: 'player-cab' }, [
    el('span', { class: 'en-vivo' }, [el('i'), 'En vivo']),
    ident.activa ? logoComp(ident.comp, { clase: 'cab-logo' }) : null,
    // con el logo del torneo, el rotulo se acorta (el logo ya dice que torneo es)
    el('span', { class: 'eq-kicker', text: ident.activa ? 'Tribuna · Swiss' : `Tribuna · Mundial ${anio} · Swiss` }),
  ]);
  // §4.7 transmision: el "score bug" (los dos equipos con su record del Swiss) debajo de la cabecera
  const recRival = it.swiss?.record?.[rival];
  const bug = ident.op === 'transmision' || final ? el('p', { class: 'tv-bug tv-bug-swiss', 'aria-label': `${orgVista} ${rec.v}-${rec.d}, ${rival} ${recRival ? `${recRival.v}-${recRival.d}` : ''}` }, [
    logoOrg(orgVista, { clase: 'ms-logo' }), el('b', { class: 'ms-sigla', text: siglaDe(orgVista) }), el('span', { class: 'tv-bug-rec num' }, el('span', { text: `${rec.v}–${rec.d}` })),
    el('i', { class: 'tv-bug-vs', text: 'vs' }),
    el('span', { class: 'tv-bug-rec num', text: recRival ? `${recRival.v}–${recRival.d}` : '' }), el('b', { class: 'ms-sigla', text: siglaDe(rival) }), logoOrg(rival, { clase: 'ms-logo' }),
    el('span', { class: 'tv-bug-fase', text: `${ident.comp.fase} · Bo1` }),
  ]) : null;

  // ---------- la parada: el panel abajo a la izquierda (cabecera + opciones | previa) ----------
  const cab = cabecera({ rotulo: [`Mundial ${anio}`, `Swiss · ronda ${proxima} · Bo1`], titulo: dec.titulo, descripcion: dec.descripcion });
  if (ident.activa) cab.rotulo.querySelector('.punto-luz')?.replaceWith(logoComp(ident.comp, { clase: 'rot-logo' }));
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
  // §4.7 transmision: la placa inferior de quien juega, apoyada sobre la parada
  const placa = ident.op === 'transmision' || final ? el('div', { class: 'tv-placa' }, [
    logoOrg(orgVista, { clase: 'tv-placa-logo' }),
    el('p', { class: 'tv-placa-t' }, [el('b', { text: handle }), el('span', { text: `${fr.quien?.rolEtiqueta ?? ''} · ${siglaDe(orgVista)}` })]),
    el('p', { class: 'tv-placa-campeon', text: fichaDe(datos, camara).nombre }),
  ]) : null;
  const parada = el('section', { class: 'sw-parada', 'data-pieza': 'decision', 'aria-label': dec.titulo }, [
    final ? null : placa,
    cab.nodo,
    el('div', { class: 'sw-cuerpo' }, [el('div', { class: 'sw-col' }, [opsNodo, insp]), previa]),
    ocultas,
  ]);
  apuntar(0);

  const juego = el('div', { class: 'juego sw-juego', 'aria-live': 'polite' });
  // §4.8: el feed (la transmision: el estadio del torneo y sus graficos) adentro del reproductor, con sus controles
  const est = final ? estadioSwiss() : null;
  const feed = final ? el('div', { class: 'feed' }, [est.nodo, el('div', { class: 'feed-marca', 'aria-hidden': 'true' }, logoComp(ident.comp, { clase: 'feed-marca-logo' })), bug, camino, placa, juego]) : null;
  const player = final ? el('div', { class: 'player', 'data-ui': 'on' }, [feed]) : el('div', { class: 'player' }, [cabPlayer, bug, vom, camino, parada, juego]);
  const reproductor = final ? controlesPlayer(player, feed) : null;

  // ---------- el chat ----------
  const chat = chatSwiss(m, { handle, org: orgVista, rival, ligaRival, rec, rondas, camara: fichaDe(datos, camara).nombre }, 'antes');
  const pista = el('div', { class: 'chat-pista' }, chat.lista);
  const chatModo = el('span', { class: 'chat-modo', text: 'modo lento: no' });
  const aside = el('aside', { class: 'chat', 'aria-label': 'Chat de la Tribuna' }, [
    el('header', { class: 'chat-cab' }, [icono('chat'), el('b', { text: 'Chat' }), chatModo]),
    pista,
    el('footer', { class: 'chat-pie' }, [el('span', { text: 'Mandá un mensaje' }), el('kbd', { text: 'Enter' })]),
  ]);
  // §4.8: la pagina del stream: el reproductor, el titulo y el canal, y los otros cruces de la ronda; al costado, la
  // parada (fijada arriba del chat) y el chat
  const stream = final ? el('div', { class: 'stream' }, [player, infoStream(), rondaStream()]) : null;
  const tribuna = final
    ? el('div', { class: 'tribuna' }, [stream, el('div', { class: 'lateral' }, [parada, aside])])
    : el('div', { class: 'tribuna' }, [player, aside]);

  const raiz = el('section', { class: 'parada partido swiss', 'data-pieza': 'partido', 'data-forma': 'tribuna', 'data-muestra': muestra, 'data-op': ident.op, 'data-comp': ident.comp?.id });
  const frN = franja(fr, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });
  const tray = trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad);
  raiz.append(frN, tribuna, cuartos('mundo', null, tray));

  // ---------- entrada: la luz, la banda, el camino, la parada; el chat ya corre ----------
  let telon = null;
  function entrada() {
    if (ident.op === 'transmision') telon = cortina(tribuna, ident.comp, `${ident.comp.nombre} ${anio}`, `${ident.comp.fase} · Bo1`);
    entrar(frN, 0, -10);
    anim(tribuna, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
    if (est) {
      encenderEstadio(est, 120);
      [bug, placa].forEach((g, i) => g && anim(g, [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], { delay: 520 + i * 120, duration: 320, easing: EXPO }));
      reproductor.mostrar();
    }
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
    telon?.saltar(); // elegir saltea la cortina de la transmision (si sigue)
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
    if (final) {
      // la parada queda fijada, resuelta: la elegida encendida, la otra apagada
      apuntar(n - 1);
      parada.dataset.elegida = '';
      filas.forEach((f, j) => {
        if (j !== n - 1) f.classList.add('bloqueada');
        f.setAttribute('aria-disabled', 'true');
      });
      placa && anim(placa, [{ opacity: 1 }, { opacity: 0 }], { delay: 200, duration: 200, fill: 'forwards' });
    } else anim(parada, [{ opacity: 1, visibility: 'visible', transform: 'none' }, { opacity: 0, visibility: 'visible', transform: 'translateY(26px)' }], { delay: 120, duration: 280, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });

    let t = 380;
    juego.replaceChildren();
    // la charla (si la usaste) como zocalo de la transmision
    for (const l of antes) {
      const z = el('div', { class: 'zocalo' }, [el('span', { class: 'eq-kicker' }, [icono('coach'), 'Vestuario', ident.activa ? logoComp(ident.comp, { clase: 'zocalo-logo' }) : null]), el('p', { text: l.message })]);
      juego.append(z);
      ventanaDeTiempo(z, t, 820, { entra: 0.14, sale: 0.86 });
      t += 720;
    }
    // el Bo1 en juego: tu chance real, que no cambia lo que sale
    const enJuego = el('div', { class: 'zocalo zocalo-juego' }, [
      el('span', { class: 'eq-kicker' }, [el('i', { class: 'punto-vivo' }), 'En juego · Bo1', ident.activa ? logoComp(ident.comp, { clase: 'zocalo-logo' }) : null]),
      el('p', { class: ident.activa ? 'zocalo-vs' : null }, ident.activa ? [logoOrg(orgVista, { clase: 'ms-logo' }), el('b', { text: `${orgVista} vs ${rival}` }), logoOrg(rival, { clase: 'ms-logo' })] : el('b', { text: `${orgVista} vs ${rival}` })),
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
    // §4.8: las pantallas del estadio: el record rueda y la central da el resultado
    est?.alResultado(recFinal, gano, tPost);
    // §4.7 transmision: el record del score bug rueda igual
    const bugRec = bug?.querySelector('.tv-bug-rec');
    if (bugRec) {
      const v0 = bugRec.firstElementChild;
      const v1 = el('span', { text: recFinal.replace('-', '–') });
      bugRec.append(v1);
      v0.style.opacity = '0';
      anim(v0, [{ opacity: 1 }, { opacity: 0 }], { delay: tPost + 120, duration: 160 });
      anim(v1, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: tPost + 160, duration: 260, easing: EXPO });
    }
    // la luz cae (sin color, sin latido) y AFUERA entra despacio: el takeover de A, con la decision que fue real
    const tCae = tPost + 260;
    const tAfuera = tPost + 1250;
    amb.ambiente({ animo: fuera ? 'caida' : 'gloria', retardo: quieto() ? 0 : tCae });
    // el post-game es un momento del mundo; AFUERA es un takeover: el mundo va al 100 % y se queda
    amb.momento?.({ retardo: quieto() ? 0 : tPost, dura: tAfuera - tPost });
    amb.takeover?.(quieto() ? 0 : tAfuera - 160);
    const cambios = (r?.inmediato?.cambios ?? []).filter((c) => ETQ_CAMBIO[c.campo] && Math.round(c.antes) !== Math.round(c.despues));
    const afuera = el('div', { class: 'sw-afuera', 'data-fuera': fuera ? '' : null }, [
      el('p', { class: 'eq-kicker' }, [ident.activa ? logoComp(ident.comp, { clase: 'rot-logo' }) : null, `Mundial ${anio} · Swiss · fin de la transmisión`]),
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
    (final ? stream : juego).append(afuera);
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

  // ---------- §4.8: el estadio del Mundial (el feed) ----------
  // La central es el cartel del partido: tu campeon del split (el que el motor usa en la previa) a la izquierda, el
  // logo del rival a la derecha (del Bo1 no hay pick: no se inventa), VIDA O MUERTE en el medio y los records arriba.
  // Las laterales, los dos equipos (tu plantel; del rival, el logo y su liga). La faja, los otros cruces de la ronda.
  function estadioSwiss() {
    const e = crearEstadio({ en: 'feed', semilla: `${anio}-${rival}` });
    const recR = it.swiss?.record?.[rival];
    const recNos = el('b', { class: 'led-rec num', text: `${rec.v}–${rec.d}` });
    const cabLed = el('div', { class: 'led-cab' }, [
      el('p', { class: 'led-cab-comp' }, [logoComp(ident.comp, { clase: 'led-cab-logo' }), el('span', { text: 'Swiss' })]),
      el('p', { class: 'marcador-serie led-recs' }, [logoOrg(orgVista, { clase: 'ms-logo' }), el('b', { class: 'ms-sigla', text: siglaDe(orgVista) }), el('span', { class: 'led-rec-c' }, recNos), el('i', { text: 'vs' }), el('b', { class: 'led-rec num', text: recR ? `${recR.v}–${recR.d}` : '' }), el('b', { class: 'ms-sigla', text: siglaDe(rival) }), logoOrg(rival, { clase: 'ms-logo' })]),
      el('p', { class: 'led-cab-fl', text: `Ronda ${proxima} · Bo1` }),
    ]);
    const c = el('canvas', { class: 'led-arte', width: String(LED_ARTE[0]), height: String(LED_ARTE[1]) });
    const lienzo = [c, null, [0.5, 0.26]];
    const cargaArte = cargarImagen(urlCentrada(camara, meta)).then((img) => {
      lienzo[1] = img;
      pintar(c, img, eraDe(), lienzo[2], ident.luz(eraDe()));
    });
    const duelo = el('div', { class: 'led-duelo' }, [
      el('div', { class: 'led-pj nos' }, [c, el('p', { class: 'led-pj-n' }, [el('b', { text: fichaDe(datos, camara).nombre }), el('small', { text: `${handle} · ${siglaDe(orgVista)}` })])]),
      el('div', { class: 'led-pj ellos led-pj-logo' }, [logoOrg(rival, { clase: 'led-pj-escudo' }), el('p', { class: 'led-pj-n' }, [el('b', { text: rival }), el('small', { text: ligaRival })])]),
      el('p', { class: 'led-vom' }, [el('span', { text: 'Vida' }), el('small', { text: 'o' }), el('span', { text: 'muerte' })]),
    ]);
    e.centro.append(cabLed, duelo);
    ladoLed(e.nos, orgVista, { kicker: ligaDe(orgVista) || m.ficha?.jugador?.liga, extra: [plantelLed(plantelDe(m, fr))] });
    ladoLed(e.ellos, rival, { kicker: ligaRival });
    // la faja: los otros cruces de la ronda (los del motor; el tuyo ya esta en la central)
    const cruces = (it.partidoEnCurso?.cruces ?? []).filter((x) => ![x.a, x.b].includes(org)).map((x) => el('span', { class: 'led-cruce' }, [logoOrg(x.a, { clase: 'led-cruce-logo' }), el('b', { text: siglaDe(x.a) }), el('i', { text: 'vs' }), el('b', { text: siglaDe(x.b) }), logoOrg(x.b, { clase: 'led-cruce-logo' })]));
    e.faja.append(logoComp(ident.comp, { clase: 'led-faja-logo' }), el('p', { class: 'led-faja-t' }, [el('b', { text: `Ronda ${proxima}` }), el('span', { text: 'también' })]), el('span', { class: 'led-faja-cruces' }, cruces));
    // el resultado en la central (al terminar el Bo1): el record nuevo rueda (DERROTA es el grafico de la transmision)
    function alResultado(recFinal, gano, t0) {
      const nuevo = el('span', { text: recFinal.replace('-', '–') });
      const viejo = el('span', { text: recNos.textContent });
      recNos.replaceChildren(viejo, nuevo);
      viejo.style.opacity = '0';
      anim(viejo, [{ opacity: 1 }, { opacity: 0 }], { delay: t0 + 120, duration: 160 });
      anim(nuevo, [{ opacity: 0, transform: 'translateY(30%)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 160, duration: 260, easing: EXPO });
      // la central se apaga un poco: la serie de luces del estadio despues del Bo1
      anim(e.centro, [{ filter: 'none' }, { filter: gano ? 'brightness(1.5)' : 'brightness(0.55) saturate(0.4)' }], { delay: t0, duration: 600, easing: EXPO, fill: 'forwards' });
    }
    return { ...e, alResultado, cargaArte, lienzo };
  }

  // ---------- §4.8: la pagina del stream debajo del reproductor ----------
  // El titulo, el canal (el torneo: su logo es el avatar), los espectadores (decorativos, del PRNG) y la ronda.
  function infoStream() {
    const az = crearAzar(`stream-${anio}-${rival}`);
    const espectadores = az.entero(STREAM.espectadores[0], STREAM.espectadores[1]);
    return el('div', { class: 'stream-info' }, [
      el('i', { class: 'stream-avatar', 'aria-hidden': 'true' }, logoComp(ident.comp, { clase: 'stream-avatar-logo' })),
      el('div', { class: 'stream-txt' }, [
        el('p', { class: 'stream-titulo', text: `${ident.comp.nombre.toUpperCase()} ${anio} · Swiss, ronda ${proxima}: ${orgVista} vs ${rival} · ${rec.v}-${rec.d}, vida o muerte` }),
        el('p', { class: 'stream-canal' }, [el('b', { text: ident.comp.nombre }), el('span', { text: `transmisión oficial · ${ident.comp.largo}` })]),
        el('p', { class: 'stream-tags' }, ['League of Legends', 'Español', 'Esports'].map((t) => el('span', { text: t }))),
      ]),
      el('p', { class: 'stream-vivo' }, [el('span', { class: 'en-vivo' }, [el('i'), 'En vivo']), el('b', { class: 'num', text: num(espectadores) }), el('span', { text: 'espectadores' })]),
    ]);
  }

  // los cruces de la ronda (los del motor), como los paneles de la pagina del stream; el tuyo es el que esta en pantalla
  function rondaStream() {
    const recDe = (n) => it.swiss?.record?.[n];
    const lado = (n) => [logoOrg(n, { clase: 'stream-cruce-logo' }), el('b', { text: siglaDe(n), title: n }), el('span', { class: 'num', text: recDe(n) ? `${recDe(n).v}–${recDe(n).d}` : '' })];
    return el('section', { class: 'stream-ronda', 'aria-label': `Swiss, ronda ${proxima}: los cruces` }, [
      el('p', { class: 'eq-kicker', text: `Swiss · ronda ${proxima} · los cruces` }),
      el('ul', {}, (it.partidoEnCurso?.cruces ?? []).map((x) => {
        const vos = [x.a, x.b].includes(org);
        return el('li', { 'data-vos': vos ? '' : null }, [...lado(x.a), el('i', { text: 'vs' }), ...lado(x.b).reverse(), vos ? el('small', { text: 'en pantalla' }) : null]);
      })),
    ]);
  }

  function tecla(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.key === 'Escape' || e.code === 'Space') && telon?.viva()) {
      e.preventDefault();
      telon.saltar();
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= ops.length && !elegida) {
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
    ...(ident.activa ? { listo: () => Promise.all([logosListos(raiz), est?.cargaArte]), destruir: () => { reproductor?.destruir(); ident.soltar(); } } : {}),
    ...(est ? { alCambiarEra: (e) => est.lienzo[1] && pintar(est.lienzo[0], est.lienzo[1], e, est.lienzo[2], ident.luz(e)) } : {}),
    arte: camara,
    animo: 'normal',
    encuadre: celular() ? 'celular' : 'tribuna',
    velo: 0.4,
    ...ident.props,
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

// ======================================================================================================================
// PLANUI §4.9 (op=linea): LA TRANSMISION. La serie es EL CARA A CARA; el Swiss, LA MISMA TRANSMISION vista en un stream.
// ======================================================================================================================
// "Una linea" (LINEA.md). El usuario, de §4.8: "el stage se ve muy falso, parece poco avanzado y poco original, ademas de
// que sea todo negro y dorado lo hace muy aburrido"; y del Swiss: "un poco muy sobrio y el stream no se logra tan bien".
//  - La imagen heroe es la costura del shader (ambiente({ costura })): tu campeon en el tono de tu org contra el del rival
//    en el suyo (separar() si se parecen). El motor simula solo esos dos por mapa: los otros 8 no se dibujan. Nada de
//    estadio de CSS, pantallas ni siluetas; el publico son los lightsticks del kit.
//  - Arriba, el marcador de la transmision (js/transmision.js); abajo, una franja de transmision: el plan como barras,
//    tus libres como cartas de carga (apuntar una es el aura: cruza tu lado de la costura) y la tira de Fearless. El
//    detalle de cada mapa va al inspector al apuntar ("leer menos").
//  - Elegir es una secuencia de beats (js/beats.js), <= 2,4 s por mapa: la costura cambia a los campeones del mapa y
//    entran las cartas de carga; VICTORIA/DERROTA sobre el lado del ganador; el pip y el golpe del marcador; el quemado de
//    Fearless. Al final, la placa de cierre. congelar(t) fotografia cualquier instante; Espacio salta al asentarse.
//  - El Swiss: la costura adentro de la caja del video (`costura.marco`, la opcion aditiva de ambiente.js), con la
//    grafica de Worlds y un movimiento de camara lento; alrededor, la pagina del stream teñida de la noche de Worlds.
//    AFUERA es un takeover con beats, y el stream reacciona atras (el chat, el clip, "fin de la transmision").
const TX = {
  t0: 360, // el primer mapa, despues de fijar el plan (ms desde elegir)
  mapa: 2400, // lo que dura un mapa (LINEA regla 8: <= 2,4 s)
  charla: 1150, // la charla del coach entre dos mapas: una placa inferior
  cruce: 520, // el cruce de la costura a los campeones del mapa
  rotulo: 60, // el rotulo del mapa
  carta: 110, // entran las dos cartas de carga desde los costados
  cartaDur: 460,
  resultado: 860, // VICTORIA / DERROTA sobre el lado del ganador
  pip: 1420, // el pip del mapa y el golpe del marcador
  quema: 1760, // el quemado de los dos campeones en la tira de Fearless
  cierreDur: 1700, // la placa de cierre, hasta el final de la secuencia
  asentarse: 1150, // desde la placa de cierre: hasta aca salta Espacio
  aquietar: 700, // despues de entrar, el mundo se aquieta
  alerta: [220, 2400], // el aviso del replan: desde, cuanto dura
};
// el arte de carga de Data Dragon (308 x 560): el de los mapas entero, el de tus libres a la mitad
const TX_CARTA = { libre: [154, 280], mapa: [308, 560] };
const TX_FOCO_CARGA = [0.5, 0.18];
// la fuerza de un equipo va de 0 a 100: es el referente de la barrita de la fuerza
const TX_FUERZA_MAX = 100;

// El arte de una pieza en el bitono de un tono (las sombras en su noche, las luces en su luz) con el color real de la
// politica (`pieza`: 65 % con `linea`, js/color.js).
function pintarEnTono(canvas, img, tono, foco) {
  if (!img || !tono) return;
  pintarCampeon(canvas, img, leerColor(tono.noche).map((v) => v * 0.5), leerColor(tono.luz), { foco, brillo: 1.08 });
}
// los colores de cada lado de la costura, para el CSS (el filete y los pips de cada equipo)
function tonosDeLados(nodo, tA, tB) {
  for (const [lado, t] of [['a', tA], ['b', tB]]) {
    nodo.style.setProperty(`--tx-${lado}`, `var(${t.acento})`);
    nodo.style.setProperty(`--tx-${lado}-luz`, `var(${t.luz})`);
    nodo.style.setProperty(`--tx-${lado}-noche`, `var(${t.noche})`);
  }
}
// una capa que existe solo en una ventana de tiempo (su estado natural es oculta: CSS)
const ventanaTx = (nodo, desde, dura, entra = 160, sale = 200) => {
  const d = Math.max(1, dura);
  return anim(nodo, [
    { opacity: 0, visibility: 'visible' },
    { opacity: 1, visibility: 'visible', offset: Math.min(0.45, entra / d) },
    { opacity: 1, visibility: 'visible', offset: Math.max(0.55, 1 - sale / d) },
    { opacity: 0, visibility: 'visible' },
  ], { delay: desde, duration: d });
};
// algo que ya esta y se va en `t` (su estado final, oculto, queda puesto ya: congelar(t) lo fotografia bien)
function irseEn(nodo, t, dura = 200) {
  nodo.style.visibility = 'hidden';
  return anim(nodo, [{ visibility: 'visible', opacity: 1 }, { visibility: 'visible', opacity: 1, offset: 0.98 }, { visibility: 'visible', opacity: 0 }], { delay: 0, duration: Math.max(1, t + dura) });
}
// la geometria de la costura que dibuja el ambiente (con WebGL trae las caras; sin WebGL, solo la linea: la cara de cada
// lado se estima con la misma regla del kit: a media mitad, un poco arriba del centro)
const TX_CARA_RESPALDO = { y: 0.4 };
function carasDe(g, marco = { x: 0, y: 0, w: 1, h: 1 }) {
  if (g?.a && g?.b) return g;
  const pos = g?.posicion ?? 0.5;
  const vertical = g?.vertical;
  const lleva = ([x, y]) => ({ x: marco.x + marco.w * x, y: marco.y + marco.h * y });
  return vertical
    ? { ...g, a: lleva([0.5, pos * 0.5]), b: lleva([0.5, pos + (1 - pos) * 0.5]) }
    : { ...g, a: lleva([pos * 0.5, TX_CARA_RESPALDO.y]), b: lleva([pos + (1 - pos) * 0.5, TX_CARA_RESPALDO.y]) };
}

// ======================================================================================================================
// PLANUI §4.10 (T): EL SUSPENSO del mapa decisivo
// ======================================================================================================================
// El usuario: "cuando te vas al quinto mapa y no se sabe si es victoria o derrota, me gustaria que haya como una animacion
// de que se buildea, asi como un suspensito ... unos segunditos de animacion antes de saber si ganaste o perdiste".
//  - Cuando: el mapa que puede cerrar la serie con los dos a un mapa de ganarla (el quinto de un Bo5 a 2-2, leido del
//    marcador del motor) y el Bo1 de vida o muerte del Swiss (a una victoria de pasar y a una derrota de quedar afuera,
//    leido del record). Los demas mapas quedan exactamente como estaban.
//  - Que: ~3 s que se construyen. La placa del decisivo con la chance del motor (la tuya y la que queda), la costura que
//    tira de un lado al otro cada vez mas rapido (y las cartas con ella), la luz que va de un tono al otro, el publico de
//    lightsticks que se enciende, un pulso que se acelera (la linea y la luz laten) y un colchon de tension (sonido.js,
//    apagado por defecto). Antes del golpe, un silencio; recien despues, VICTORIA o DERROTA.
//  - Reglas: todo va en el reloj de los beats y en el del ambiente (ambiente({ suspenso })), asi congelar(t) fotografia
//    cualquier instante; Espacio salta al asentarse (el resultado ya revelado); con INST o movimiento reducido no hay
//    suspenso; cada latido pasa por beats.destello (<= 3 destellos por segundo, contando el golpe).
const TX_SUS = {
  dura: 3000, // el suspenso: del ultimo respiro de calma al golpe del resultado (2,5-3,5 s)
  cola: 1400, // despues del golpe, el publico se apaga de a poco
  vaiven: 0.055, // cuanto tira la costura en el pico (fraccion de su caja)
  hz: [0.5, 1.4], // el tira y afloje se acelera (vueltas por segundo): <= 2,8 cambios de lado por segundo
  entra: 0.22, // fraccion del suspenso en la que el tira y afloje llega a su amplitud
  suelta: 0.88, // desde aca vuelve al centro: el golpe arranca con la costura quieta
  publicoTope: 0.85, // fraccion del suspenso en la que el publico queda todo encendido
  // el pulso: el primer intervalo, cuanto se acorta cada vez, el minimo (>= la separacion de beats.destello), el silencio
  // antes del golpe y la fuerza del primero al ultimo
  latido: { primero: 760, acelera: 0.82, minimo: 340, silencio: 340, k: [0.3, 0.6], cae: 220, golpe: 0.035 },
  muestras: 110, // las curvas que lee el ambiente (parejas en dura + cola)
  pasosDom: 72, // los cuadros del tira y afloje de las cartas y la placa
  abrir: 420, // las cartas se abren y entra la placa
  separar: 80, // px que se corre cada carta para dejarle el centro a la placa (escritorio)
  // las cartas acompanan el tira y afloje: cuanto del corrimiento de la costura siguen y cuanto crece la del que empuja
  siguen: 0.35,
  crece: 0.03,
  salePlaca: 160, // la placa se va justo antes del golpe
};
// el Swiss del Mundial: espejo de BALANCE.mundial.victoriasParaAvanzar / derrotasParaQuedarAfuera (src/data/balance.js;
// la vitrina no importa el motor)
const SWISS_FORMATO = { avanzar: 3, afuera: 3 };
const SUS_SW = { desde: 600 }; // el suspenso del Swiss arranca con EN JUEGO ya en pantalla (ms desde EN JUEGO)
const TX_SUS_PIP = 14; // px del halo del pip del decisivo en cada latido
const suaveSus = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const expoSus = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, x)));
// el mapa decisivo: el que puede cerrar la serie con los dos a un mapa de ganarla. Se lee del marcador del motor (el de
// despues del mapa, sacandole el mapa), nunca de un indice fijo
function esDecisivo(l, formato) {
  const [a, b] = String(l?.marcador ?? '').split('-').map(Number);
  if (!l?.mapa || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  const falta = Math.floor(Math.max(1, Number(formato) || 1) / 2);
  const gano = l.resultado === 'W';
  return (gano ? a - 1 : a) === falta && (gano ? b : b - 1) === falta;
}
// el Bo1 de vida o muerte del Swiss: a una victoria de pasar y a una derrota de quedar afuera
const esVidaOMuerte = (rec) => rec?.v === SWISS_FORMATO.avanzar - 1 && rec?.d === SWISS_FORMATO.afuera - 1;
// el tira y afloje en u (0-1 del suspenso): -1..1, crece, se acelera y vuelve al centro antes del golpe
function tiraEn(u, c = TX_SUS) {
  if (!(u > 0 && u < 1)) return 0;
  const env = suaveSus(u / c.entra) * (1 - suaveSus((u - c.suelta) / (1 - c.suelta))) * (0.5 + 0.5 * u);
  return Math.sin(2 * Math.PI * (c.dura / 1000) * (c.hz[0] * u + ((c.hz[1] - c.hz[0]) * u * u) / 2)) * env;
}
// Las curvas que lee el ambiente (muestras parejas en dura + cola) y los latidos (ms desde el arranque, con su fuerza)
function curvasSuspenso(c = TX_SUS) {
  const total = c.dura + c.cola;
  const vaiven = [];
  const tonos = [];
  const publico = [];
  for (let i = 0; i <= c.muestras; i++) {
    const t = (i / c.muestras) * total;
    const u = t / c.dura;
    const tira = tiraEn(u, c);
    // la costura se corre hacia B cuando A empuja: la luz es la de A (-1)
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
// la placa late con el pulso: un golpe de escala (`scale`, que se suma al `transform` de su entrada) y su brillo
function latirPlaca(b, pl, latidos, tS) {
  const tL = tS - TX_SUS.latido.cae;
  const dL = TX_SUS.dura + TX_SUS.latido.cae;
  b.waapi([
    anim(pl.brillo, cuadrosLatido(latidos, tL, dL), { delay: tL, duration: dL, fill: 'none' }),
    anim(pl.nodo, cuadrosLatido(latidos, tL, dL, { valor: (v) => ({ scale: String(1 + v * TX_SUS.latido.golpe) }) }), { delay: tL, duration: dL, fill: 'none' }),
  ]);
}
// Lo que no es DOM: los latidos (cada uno pasa por beats.destello), el ambiente (la costura, la luz, el publico) y el
// sonido. Espacio y destruir cortan el suspenso del ambiente y el colchon. Devuelve los latidos aceptados (ms de los beats).
function programarSuspenso({ b, amb, sonido, tS }) {
  const cv = curvasSuspenso();
  const aceptados = [];
  for (const [ms, k] of cv.latidos) {
    const t = b.destello(tS + ms);
    if (t != null) aceptados.push([t - tS, k]);
  }
  amb.ambiente({ suspenso: { dura: cv.total, vaiven: cv.vaiven, tonos: cv.tonos, publico: cv.publico, latidos: aceptados }, retardo: tS });
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
    amb.ambiente({ suspenso: null });
  };
  b.agregar({ fps: 1, saltar: apagar, pausar: cortar, destruir: apagar });
  return aceptados.map(([ms]) => tS + ms);
}
// los cuadros de un brillo que late con los latidos (opacidad), en una animacion de [t0, t0 + dura]
// (`valor(v)` arma el cuadro: por defecto, la opacidad)
function cuadrosLatido(tiempos, t0, dura, { alto = 1, bajo = 0, valor = (v) => ({ opacity: v }) } = {}) {
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
// los cuadros del tira y afloje para el DOM (la propiedad `translate`, que se suma al `transform` de la entrada): px es
// cuanto mide la caja de la costura en el eje del tira y afloje; base(u), un corrimiento propio (las cartas se abren)
// (`k`: cuanto del corrimiento siguen; `crece`: lo que crece la carta del lado que empuja, `lado` 1 = A, -1 = B)
function cuadrosTira(px, { eje = 'x', base = () => 0, k = 1, crece = 0, lado = 1 } = {}) {
  return Array.from({ length: TX_SUS.pasosDom + 1 }, (_, i) => {
    const u = i / TX_SUS.pasosDom;
    const tira = tiraEn(u);
    const d = (base(u) + tira * TX_SUS.vaiven * px * k).toFixed(2);
    const c = { offset: u, translate: eje === 'x' ? `${d}px 0px` : `0px ${d}px` };
    if (crece) c.scale = String((1 + Math.max(0, tira * lado) * crece).toFixed(4));
    return c;
  });
}
// La placa del decisivo: el rotulo, lo que se juega y la chance del motor partida entre los dos (la tuya y la que queda)
function placaDecisiva({ rotulo, linea, p, nos, ellos, pie }) {
  const pA = Math.round((p ?? 0) * 100);
  const brillo = el('i', { class: 'tx-sus-brillo', 'aria-hidden': 'true' });
  const nodo = el('div', { class: 'tx-sus', role: 'status', 'aria-label': `${rotulo}. ${linea}. Tu chance en el motor: ${pA}%` }, [
    brillo,
    el('p', { class: 'tx-sus-k', 'aria-hidden': 'true' }, [el('i', { class: 'tx-sus-punto' }), el('span', { text: rotulo })]),
    el('p', { class: 'tx-sus-linea', 'aria-hidden': 'true', text: linea }),
    el('div', { class: 'tx-sus-p', 'aria-hidden': 'true', style: { '--v': String(pA / 100) } }, [
      el('p', { class: 'tx-sus-nums' }, [el('b', { class: 'num', 'data-lado': 'a', text: `${pA}%` }), el('b', { class: 'num', 'data-lado': 'b', text: `${100 - pA}%` })]),
      el('div', { class: 'tx-sus-fila' }, [logoOrg(nos, { clase: 'tx-sus-logo' }), el('i', { class: 'tx-sus-barra' }, el('i', { class: 'tx-sus-si' })), logoOrg(ellos, { clase: 'tx-sus-logo' })]),
    ]),
    el('p', { class: 'tx-sus-pie', 'aria-hidden': 'true', text: pie }),
  ]);
  return { nodo, brillo };
}

// ======================================================================================================================
// La serie: el cara a cara
// ======================================================================================================================
function crearSerieLinea({ datos, muestra, amb, aura, sonido, peor }) {
  const m = datos[muestra];
  const comp = competicionDe(datos, muestra);
  const pc = peor ? datos.peorCaso : null;
  const replan = Boolean(m.esReplan || m.decision?.datos?.replan);
  const dec = m.decision;
  const ops = dec.opciones;
  const pg = m.previas?.general ?? {};
  const se = m.serieEnCurso ?? m.acompanante?.datos?.serie ?? {};
  const formato = se.formato ?? 5;
  const fr = m.franja;
  const meta = datos.meta;
  const liga = m.ficha?.jugador?.liga ?? 'CBLOL';
  const ronda = RONDAS[se.ronda] ?? se.ronda ?? 'La serie';
  const nos = pc?.org?.nombre ?? pg.propio?.nombre ?? fr.club.org;
  const ellos = pg.rival?.nombre ?? se.rival?.org ?? 'el rival';
  const handle = pc?.handle ?? fr.quien?.handle ?? '';
  const sNos = siglaDe(nos);
  const sEllos = siglaDe(ellos);
  const libres = (m.acompanante?.datos?.libres ?? []).map(claveCampeon);
  const quemados0 = (m.quemadosAlParar ?? []).map(claveCampeon);
  const beatsMapa = (m.pagina?.beats ?? []).map((b) => b.log).filter((l) => l?.mapa);
  const jugados = (se.mapas ?? []).map((mp) => ({ ...mp, rivalJuega: [...beatsMapa].reverse().find((l) => l.mapa === mp.mapa && l.campeon === mp.campeon)?.rivalJuega ?? null }));
  const offset = jugados.length;
  // en el replan, el rival ya juega el que te leyo; si no, el cara a cara es tu campeon contra su intencion
  const leido = replan ? claveCampeon(se.rivalJuega ?? pg.rival?.campeon) : null;
  const tuyo = claveCampeon(pg.desglose?.campeon ?? m.ficha?.jugador?.campeonDelSplit) ?? libres[0];
  const suyo = leido ?? (replan ? null : claveCampeon(pg.rival?.campeon));
  const marcadorAhora = se.marcador ?? [0, 0];
  const cargas = [];

  // ---------- los tonos: la competicion (la pagina) y cada org (cada mitad de la costura) ----------
  const tComp = tonoCompeticion(comp.id);
  const tA = tonoOrg(nos);
  const tB = separar(tA, tonoOrg(ellos), tComp);
  const costura0 = { a: { arte: tuyo, tono: tA }, b: { arte: suyo, tono: tB }, posicion: 0.5, k: 1 };

  const raiz = el('section', { class: 'tx tx-serie', 'data-pieza': 'partido', 'data-muestra': muestra, 'data-op': 'linea', 'data-replan': replan ? '' : null });
  tonosDeLados(raiz, tA, tB);

  // ---------- arriba: el marcador de la transmision y, debajo, la fuerza y los mapas ----------
  const mc = marcadorTx({
    comp,
    rotulo: `${ronda} · Fearless`,
    local: { nombre: nos, sigla: sNos, logo: logoOrg(nos) },
    visita: { nombre: ellos, sigla: sEllos, logo: logoOrg(ellos) },
    formato,
    mapas: jugados.map((mp) => ({ resultado: mp.resultado })),
  });
  mc.nodo.classList.add('tx-mc');
  const pipsMapa = Array.from({ length: formato }, (_, i) => el('i', { class: 'tx-mp', 'data-decisivo': i === formato - 1 ? '' : null, 'data-siguiente': i === offset ? '' : null }, el('i', { class: 'tx-mp-in' })));
  jugados.forEach((mp) => {
    const p = pipsMapa[mp.mapa - 1];
    if (p) p.firstElementChild.dataset.res = mp.resultado;
  });
  const fuerza = (lado, n) => el('p', { class: 'tx-fuerza', 'data-lado': lado, title: `Fuerza del equipo, de 0 a ${TX_FUERZA_MAX}: el motor las compara para la chance de cada mapa` }, [
    el('b', { class: 'num', text: n?.texto ?? '' }),
    el('span', { class: 'tx-fuerza-k' }, [el('small', { text: 'fuerza' }), el('i', { class: 'tx-fuerza-barra', style: { '--v': String(Math.min(1, (n?.fuerza ?? 0) / TX_FUERZA_MAX)) } })]),
  ]);
  const etqMapas = `Mapas de la serie, al mejor de ${formato}${jugados.length ? `: ${jugados.map((mp) => `mapa ${mp.mapa} ${mp.resultado === 'W' ? 'ganado' : 'perdido'}`).join(', ')}` : ''}`;
  const sub = el('div', { class: 'tx-sub' }, [fuerza('a', pg.propio), el('span', { class: 'tx-mapas', role: 'img', 'aria-label': etqMapas }, pipsMapa), fuerza('b', pg.rival)]);
  const arriba = el('div', { class: 'tx-arriba' }, [mc.nodo, sub]);

  // ---------- el centro: los nombres gigantes sobre la costura (lo dibuja el shader; aca solo la letra) ----------
  function parCaras(kA, kB, { subA, subB, clase = '' } = {}) {
    const cara = (lado, k, subT, org) => el('div', { class: 'tx-cara', 'data-lado': lado, 'data-equipo': k ? null : '' }, [
      el('p', { class: 'tx-cara-n', text: k ? fichaDe(datos, k).nombre : org }),
      el('p', { class: 'tx-cara-q' }, [logoOrg(org, { clase: 'tx-cara-logo' }), el('span', { text: subT })]),
    ]);
    return el('div', { class: `tx-par ${clase}`.trim(), 'aria-hidden': 'true' }, [cara('a', kA, subA, nos), cara('b', kB, subB, ellos)]);
  }
  const subA = `${handle} · ${sNos}`;
  const parReposo = parCaras(tuyo, suyo, { subA, subB: `${sEllos} · ${replan ? 'te lo leyó' : 'su intención'}`, clase: 'tx-par-reposo' });
  const nombreA = parReposo.querySelector('[data-lado="a"] .tx-cara-n');
  const caras = el('div', { class: 'tx-caras' }, [parReposo]);
  const juego = el('div', { class: 'tx-juego', 'aria-live': 'polite' });
  // si el rival no tiene campeon a la vista, su lado queda solo tono y su logo va encima, donde cae su cara
  const logoB = suyo ? null : el('div', { class: 'tx-logo-b', 'aria-hidden': 'true' }, logoOrg(ellos));
  const escenario = el('div', { class: 'tx-escenario' }, [caras, juego, logoB]);
  const vs = el('p', { class: 'sr', text: `${fichaDe(datos, tuyo).nombre} (${handle}, ${nos}) contra ${suyo ? `${fichaDe(datos, suyo).nombre} (${ellos}${replan ? ', te lo leyó' : ', su intención'})` : ellos}` });

  // ---------- abajo: la franja de transmision ----------
  const cab = cabecera({
    rotulo: [`${liga} ${m.anio}`, ronda, `Bo${formato} · Fearless`, replan ? `Van ${marcadorAhora[0]}–${marcadorAhora[1]}` : 'cada pick se quema'],
    titulo: dec.titulo,
    descripcion: dec.descripcion,
    alerta: replan ? 'Replan' : null,
  });
  cab.rotulo.querySelector('.punto-luz')?.replaceWith(logoComp(comp, { clase: 'rot-logo' }));
  cab.titulo.classList.add('tx-titulo');
  cab.nodo.classList.add('tx-cab');

  // tus libres: cartas de carga (el arte de carga de Data Dragon en el bitono de tu org, al color de pieza)
  const libresNodos = new Map();
  const cartasLibres = libres.map((k) => {
    const c = el('canvas', { class: 'tx-carta-arte', width: String(TX_CARTA.libre[0]), height: String(TX_CARTA.libre[1]), 'aria-hidden': 'true' });
    cargas.push(cargarImagen(urlCarga(k, meta)).then((img) => pintarEnTono(c, img, tA, TX_FOCO_CARGA)));
    const b = el('button', { type: 'button', class: 'tx-carta', 'data-campeon': k, 'aria-label': `${fichaDe(datos, k).nombre}: apuntalo para verlo en tu lado` }, [c, el('span', { class: 'tx-carta-n', 'aria-hidden': 'true', text: fichaDe(datos, k).nombre })]);
    libresNodos.set(k, b);
    return el('li', {}, b);
  });
  const secLibres = el('section', { class: 'tx-libres', 'aria-label': `Tus libres: ${libres.length}` }, [
    el('p', { class: 'eq-kicker' }, [el('span', { text: 'Tus libres' }), el('b', { class: 'tx-k-n', text: String(libres.length) })]),
    el('ul', { class: 'tx-cartas' }, cartasLibres),
  ]);

  // el plan: tres barras de transmision (label, la chance de cada mapa en pips, el % de la serie grande)
  const mejor = Math.max(...ops.map((o) => o.pSerie ?? 0));
  const pOpc = Object.fromEntries((pg.opciones ?? []).map((o) => [o.id, o]));
  const filas = ops.map((o, i) => el('button', { class: 'opcion tx-op', type: 'button', 'data-atajo': String(i + 1), 'data-mejor': o.pSerie === mejor ? '' : null, 'aria-describedby': `tx-desc-${muestra}-${i + 1}`, style: { '--v': String(o.pSerie ?? 0) } }, [
    el('span', { class: 'op-tecla', text: String(i + 1) }),
    el('span', { class: 'op-label', text: o.label }),
    el('span', { class: 'tx-op-mapas', 'aria-hidden': 'true' }, Array.from({ length: formato }, (_, j) => {
      const p = j >= offset ? o.pMapas?.[j - offset] : null;
      return el('i', { 'data-jugado': j < offset ? '' : null, 'data-decisivo': j === formato - 1 ? '' : null, style: { '--v': String(p ?? 0) } });
    })),
    el('span', { class: 'tx-op-serie' }, [el('b', { class: 'num', text: pct(o.pSerie) }), el('small', { text: 'la serie' })]),
  ]));
  const ocultas = el('div', { class: 'sr' }, ops.map((o, i) => el('div', { id: `tx-desc-${muestra}-${i + 1}` }, [o.descripcion ?? '', ' ', pOpc[o.id]?.texto ?? ''])));
  const insp = el('div', { class: 'tx-insp', 'aria-live': 'polite' });
  let apuntada = 0;
  function apuntar(i, { mover = false, detalle = false } = {}) {
    apuntada = Math.max(0, Math.min(ops.length - 1, i));
    const o = ops[apuntada];
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    // leer menos: en reposo, la prosa; el numero de cada mapa recien al apuntar
    insp.replaceChildren(...[
      el('p', { class: 'tx-insp-t' }, [el('b', { text: o.label }), ' ', o.descripcion ?? '']),
      detalle && pOpc[o.id]?.texto ? el('p', { class: 'tx-insp-mono', text: pOpc[o.id].texto }) : null,
    ].filter(Boolean));
    if (mover) filas[apuntada].focus({ preventScroll: true });
  }
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (elegida) return;
      if (i !== apuntada) amb.pulso('apuntar');
      apuntar(i, { detalle: true });
    });
    f.addEventListener('focus', () => !elegida && apuntar(i, { detalle: true }));
    f.addEventListener('click', () => elegir(i + 1));
  });
  const secPlan = el('section', { class: 'tx-plan' }, [el('div', { class: 'tx-planes', role: 'group', 'aria-label': 'El plan' }, filas), insp]);

  // la tira de Fearless: lo quemado de la serie (el leido, marcado)
  const capacidad = formato * 2;
  const slots = Array.from({ length: capacidad }, () => el('li', { class: 'tx-q' }));
  function ponerIcono(slot, k, esLeido = false) {
    slot.dataset.lleno = '';
    slot.title = `${fichaDe(datos, k).nombre}: quemado`;
    if (esLeido) slot.dataset.leido = '';
    const ico = el('span', { class: 'tx-q-ico' });
    cargas.push(cargarImagen(urlIcono(k, meta)).then((img) => {
      if (!img) return;
      const c = img.cloneNode();
      c.alt = fichaDe(datos, k).nombre;
      ico.append(c);
    }));
    slot.append(ico);
    return ico;
  }
  quemados0.forEach((k, i) => {
    if (!slots[i]) return;
    ponerIcono(slots[i], k, k === leido);
    // lo que ya estaba quemado al parar: el estado final del quemado de la ceremonia, sin animar
    quemarCarta(slots[i]).forEach((a) => a.finish());
  });
  const contador = el('small', { text: quemados0.length ? `${quemados0.length} de ${capacidad}` : 'ninguno todavía' });
  const secFearless = el('section', { class: 'tx-fearless', 'aria-label': 'Quemados por Fearless' }, [
    el('p', { class: 'eq-kicker' }, [el('span', { text: 'Fearless' }), contador]),
    el('ul', { class: 'tx-qs' }, slots),
  ]);

  const franjaTx = el('div', { class: 'tx-franja panel' }, [cab.nodo, el('div', { class: 'tx-cuerpo' }, [secLibres, secPlan, secFearless]), ocultas, vs]);
  const frN = franja(fr, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });
  const tray = trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad);
  raiz.append(frN, arriba, escenario, franjaTx, cuartos('temporada', null, tray));
  apuntar(0);

  // el aura: apuntar un libre cruza tu lado de la costura (main.js -> aura -> ambiente({ arte })); el nombre la sigue
  const desuscribir = aura?.alCambiar((k) => {
    if (elegida || !k) return;
    nombreA.textContent = fichaDe(datos, k).nombre;
    if (!quieto()) anim(nombreA, [{ opacity: 0, transform: 'translateX(-24px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { duration: 320, easing: EXPO });
  });

  // el logo del lado solo tono sigue a la cara de B (la geometria del ambiente)
  let seguirRaf = 0;
  function seguir() {
    seguirRaf = requestAnimationFrame(seguir);
    if (!logoB || !raiz.isConnected) return;
    const g = carasDe(amb.costura?.());
    const r = escenario.getBoundingClientRect();
    logoB.style.left = `${g.b.x * innerWidth - r.left}px`;
    logoB.style.top = `${g.b.y * innerHeight - r.top}px`;
    logoB.style.opacity = String(g.k ?? 1);
  }

  // ---------- entrar: la luz (la costura se traza sola) -> el marcador -> los nombres -> la franja ----------
  function entrada() {
    entrar(frN, 0, -10);
    anim(arriba, [{ opacity: 0, transform: 'translateY(-18px)' }, { opacity: 1, transform: 'none' }], { delay: 140, duration: 380, easing: EXPO });
    parReposo.querySelectorAll('.tx-cara').forEach((c, i) => anim(c, [{ opacity: 0, transform: `translateX(${i ? 40 : -40}px)`, clipPath: i ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { delay: 300 + i * 90, duration: 480, easing: EXPO }));
    anim(franjaTx, [{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { delay: 180, duration: 360, easing: EXPO });
    entrar(cab.rotulo, 260, 8);
    lineasConMascara(cab.titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 300 + i * 70, dur: 420 }));
    entrar(cab.planteo, 420, 8);
    cartasLibres.forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { delay: 420 + i * 45, duration: 320, easing: EXPO }));
    const tPlan = replan ? 1150 : 480;
    filas.forEach((f, i) => {
      anim(f, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: tPlan + i * 60, duration: 300, easing: EXPO });
      anim(f.querySelector('.tx-op-serie b'), [{ opacity: 0 }, { opacity: 1 }], { delay: tPlan + 120 + i * 60, duration: 260 });
      f.querySelectorAll('.tx-op-mapas i').forEach((x, k) => anim(x, [{ transform: 'scaleY(0)' }, { transform: 'none' }], { delay: tPlan + 80 + i * 60 + k * 30, duration: 420, easing: EXPO }));
    });
    slots.forEach((s, i) => anim(s, [{ opacity: 0 }, { opacity: 1 }], { delay: 520 + i * 25, duration: 200 }));
    esperar(raiz, TX.aquietar).then(() => amb.aquietar(true));
    if (quieto()) amb.aquietar(true);
    if (logoB) seguir();
    if (replan) {
      // te leyeron: la luz se quiebra, el aviso de la transmision y el quemado de lo que te leyeron
      amb.quiebre(quieto() ? 0 : TX.alerta[0]);
      amb.ambiente({ animo: 'peligro' });
      amb.ambiente({ animo: 'normal', retardo: quieto() ? 0 : 1100 });
      const aviso = el('div', { class: 'tx-alerta', role: 'status' }, placaInferior({
        rotulo: 'Replan · te leyeron',
        titulo: `${ellos} te leyó ${leido ? fichaDe(datos, leido).nombre : 'el plan'}`,
        sub: `${leido ? `${fichaDe(datos, leido).nombre} sale quemado para vos` : 'Lo que guardabas ya no está'}: rearmá el plan para los mapas que quedan.`,
        tono: { id: 'tx-alerta', luz: '--down', contra: '--down', acento: '--down', noche: tComp.noche, vacio: tComp.vacio },
      }));
      escenario.append(aviso);
      ventanaTx(aviso, TX.alerta[0], TX.alerta[1]);
      const sl = slots.find((s) => s.hasAttribute('data-leido'));
      if (sl && !quieto()) quemarCarta(sl, { retardo: TX.alerta[0] + 420 });
    }
  }

  // ---------- elegir: la serie, mapa a mapa, como una secuencia de beats ----------
  let elegida = 0;
  let beats = null;
  let saltar = null;
  function elegir(n) {
    const op = ops[n - 1];
    if (!op || elegida) return;
    elegida = n;
    const r = m.resultados?.find((x) => x.opcionId === op.id);
    const logs = r?.logsDeLaSerie ?? r?.inmediato?.logs ?? [];
    const iMapas = logs.map((l, i) => (l.mapa ? i : -1)).filter((i) => i >= 0);
    const primero = iMapas[0] ?? -1;
    const ultimo = iMapas[iMapas.length - 1] ?? -1;
    raiz.dataset.jugando = '';
    // el plan queda fijado: el elegido encendido, los otros apagados; el aura se apaga (la costura es de los mapas)
    apuntar(n - 1);
    filas.forEach((f, j) => {
      if (j !== n - 1) f.classList.add('bloqueada');
      f.setAttribute('aria-disabled', 'true');
    });
    for (const c of libresNodos.values()) c.removeAttribute('data-campeon');
    pipsMapa.forEach((p) => p.removeAttribute('data-siguiente'));
    amb.pulso('elegir');
    amb.aquietar(false);
    sonido?.clic?.();

    // la linea de tiempo: cada mapa (TX.mapa; el decisivo, mas su suspenso: PLANUI §4.10) y la charla del coach entre
    // mapas (TX.charla)
    const mapasT = [];
    const charlas = [];
    let t = TX.t0;
    logs.forEach((l, i) => {
      if (l.mapa) {
        const s = esDecisivo(l, formato) && !quieto() ? TX_SUS.dura : 0;
        mapasT.push({ l, t0: t, k: claveCampeon(l.campeon), rk: claveCampeon(l.rivalJuega), s });
        t += TX.mapa + s;
      } else if (primero >= 0 && i > primero && i < ultimo) {
        charlas.push({ l, t0: t });
        t += TX.charla;
      }
    });
    const tFin = t;
    const fin = logs[logs.length - 1];
    const b = crearBeats({ duracion: tFin + TX.cierreDur, asentarse: tFin + TX.asentarse });
    beats = b;

    // los nombres de la seleccion se van cuando entra el primer mapa
    b.waapi(irseEn(parReposo, mapasT[0]?.t0 ?? TX.t0));
    if (logoB) b.waapi(irseEn(logoB, mapasT[0]?.t0 ?? TX.t0));

    // Fearless: cuantos hay quemados despues de cada mapa (para el contador, que sigue al reloj)
    const quemados = new Set(quemados0);
    let qi = quemados0.length;
    const cuentaQ = [];
    mapasT.forEach((mp, j) => {
      const tSig = mapasT[j + 1]?.t0 ?? tFin;
      jugarMapa(mp, tSig, j === mapasT.length - 1);
      cuentaQ.push({ t: mp.t0 + TX.quema + mp.s, n: qi });
    });
    charlas.forEach((ch) => {
      const caja = el('div', { class: 'tx-charla' }, placaInferior({ rotulo: 'Vestuario · el coach', titulo: ch.l.message, tono: tComp }));
      juego.append(caja);
      b.waapi(ventanaTx(caja, ch.t0, TX.charla));
    });
    const ganoSerie = r?.serie?.resultado?.gano ?? fin?.gano ?? mapasT[mapasT.length - 1]?.l.resultado === 'W';
    const btnCierre = cierre(fin?.mapa ? null : fin, mapasT, tFin, r, ganoSerie);

    // un mapa: la costura cambia, las cartas de carga, VICTORIA/DERROTA del lado del ganador, el pip, el quemado
    function jugarMapa(mp, tSig, esUltimo) {
      const { l, t0, k, rk, s } = mp;
      const gano = l.resultado === 'W';
      // el decisivo: el resultado, el pip y el quemado llegan despues del suspenso (s = 0 en los demas: como siempre)
      const tR = t0 + TX.resultado + s;
      const par = parCaras(k, rk, { subA, subB: rk ? sEllos : '', clase: 'tx-par-mapa' });
      caras.append(par);
      b.waapi(ventanaTx(par, t0, tSig - t0 + (esUltimo ? 200 : 0), 160, 160));
      par.querySelectorAll('.tx-cara-n').forEach((x, i) => b.waapi(anim(x, [{ transform: `translateX(${i ? 34 : -34}px)`, clipPath: i ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { transform: 'none', clipPath: 'inset(0 0 0 0)' }], { delay: t0 + 140 + i * 60, duration: 420, easing: EXPO })));
      // las dos cartas de carga: tu pick en el tono de tu org, el del rival en el suyo
      const carta = (kk, tono, lado, quien, org) => {
        const c = el('canvas', { class: 'tx-carga-arte', width: String(TX_CARTA.mapa[0]), height: String(TX_CARTA.mapa[1]), 'aria-hidden': 'true' });
        cargas.push(cargarImagen(urlCarga(kk, meta)).then((img) => pintarEnTono(c, img, tono, TX_FOCO_CARGA)));
        return el('figure', { class: 'tx-carga', 'data-lado': lado }, [c, el('figcaption', {}, [el('b', { text: fichaDe(datos, kk).nombre }), el('span', {}, [logoOrg(org, { clase: 'tx-carga-logo' }), quien])])]);
      };
      const cA = carta(k, tA, 'a', subA, nos);
      const cB = rk ? carta(rk, tB, 'b', sEllos, ellos) : null;
      const vd = victoriaDerrota({ gano, sub: `Mapa ${l.mapa} · ${String(l.marcador).replace('-', '–')} · tenías ${pct(l.p)}`, retardo: tR });
      const caja = el('div', { class: 'tx-vd', 'data-lado': gano ? 'a' : 'b' }, vd.nodo);
      const rot = el('p', { class: 'tx-mapa-n' }, [el('b', { text: `Mapa ${l.mapa}` }), l.mapa === formato ? el('span', { text: 'el decisivo' }) : null]);
      const capa = el('div', { class: 'tx-mapa', 'data-res': l.resultado }, [rot, cA, cB, caja]);
      juego.append(capa);
      b.waapi(ventanaTx(capa, t0, tSig - t0 + (esUltimo ? 200 : 0), 120, 220));
      b.waapi(anim(rot, [{ opacity: 0, transform: 'translateY(-10px)', letterSpacing: '0.4em' }, { opacity: 1, transform: 'none' }], { delay: t0 + TX.rotulo, duration: 360, easing: EXPO }));
      [cA, cB].forEach((c, j) => c && b.waapi(anim(c, [{ opacity: 0, transform: `translateX(${j ? 52 : -52}vw) rotate(${j ? 5 : -5}deg)` }, { opacity: 1, transform: 'none' }], { delay: t0 + TX.carta + j * 60, duration: TX.cartaDur, easing: EXPO })));
      b.waapi(vd.animaciones);
      // el ganador se enciende; el perdedor se apaga
      const [cg, cp] = gano ? [cA, cB] : [cB, cA];
      if (cg) b.waapi(anim(cg, [{ filter: 'brightness(1.7)' }, { filter: 'none' }], { delay: tR, duration: 640, easing: EXPO }));
      if (cp) b.waapi(anim(cp, [{ filter: 'none' }, { filter: 'grayscale(1) brightness(0.5)' }], { delay: tR, duration: 360, fill: 'both' }));
      const td = b.destello(tR + 40);
      if (td != null && gano) amb.pulso('logro', td);
      b.esperar(tR + 60).then((ok) => ok && (gano ? sonido?.victoria?.() : sonido?.derrota?.()));
      if (s) suspenso({ l, tS: t0 + TX.resultado, cA, cB, capa });
      // el pip del mapa (el color del que gano)
      const pin = pipsMapa[l.mapa - 1]?.firstElementChild;
      if (pin) {
        pin.dataset.res = l.resultado;
        b.waapi(anim(pin, [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'none' }], { delay: t0 + TX.pip + s, duration: 380, easing: EXPO }));
      }
      b.esperar(t0 + TX.pip + s).then((ok) => ok && sonido?.golpe?.());
      // Fearless: los dos picks se queman (en la tira y, si era un libre tuyo, su carta)
      let quemo = false;
      for (const q of [k, rk]) {
        if (!q || quemados.has(q)) continue;
        quemados.add(q);
        const slot = slots[qi++];
        if (slot) {
          const ico = ponerIcono(slot, q);
          b.waapi(anim(ico, [{ opacity: 0, transform: 'scale(1.7)' }, { opacity: 1, transform: 'none' }], { delay: t0 + TX.quema + s - 180, duration: 240, easing: EXPO }));
          b.waapi(quemarCarta(slot, { retardo: t0 + TX.quema + s }));
          quemo = true;
        }
        const lib = libresNodos.get(q);
        if (lib) b.waapi(quemarCarta(lib, { retardo: t0 + TX.quema + s }));
      }
      if (quemo) b.esperar(t0 + TX.quema + s).then((ok) => ok && sonido?.quemado?.());
    }

    // EL SUSPENSO del mapa decisivo (PLANUI §4.10): las cartas se abren y entra la placa del decisivo con la chance del
    // motor; la costura (y las cartas con ella) tira de un lado al otro cada vez mas rapido y late, la luz va de un tono
    // al otro, el publico se enciende y el pulso se acelera. La placa se va justo antes del golpe de VICTORIA/DERROTA.
    function suspenso({ l, tS, cA, cB, capa }) {
      const D = TX_SUS.dura;
      const cel = celular();
      const [a, bb] = String(l.marcador).split('-').map(Number);
      const empate = l.resultado === 'W' ? `${a - 1}–${bb}` : `${a}–${bb - 1}`;
      const pl = placaDecisiva({
        rotulo: `En juego · ${empate}`,
        linea: `el que gana se lleva ${se.ronda === 'final' ? 'la final' : 'la serie'}`,
        p: l.p,
        nos,
        ellos,
        pie: 'la chance del motor para este mapa',
      });
      capa.append(pl.nodo);
      b.waapi([
        ventanaTx(pl.nodo, tS, D, 220, TX_SUS.salePlaca),
        anim(pl.nodo, [{ transform: 'translate(-50%, -50%) scale(0.86)', filter: 'blur(6px)' }, { transform: 'translate(-50%, -50%)', filter: 'none' }], { delay: tS, duration: TX_SUS.abrir, easing: EXPO }),
        anim(pl.nodo.querySelector('.tx-sus-si'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: tS + 200, duration: 620, easing: EXPO }),
      ]);
      // el tira y afloje: las cartas (que ademas se abren, en el escritorio) acompanan a la costura y la del que empuja
      // crece; la placa queda quieta (lo que se lee no tiembla)
      const caja = document.documentElement;
      const px = cel ? caja.clientHeight || innerHeight : caja.clientWidth || innerWidth;
      const eje = cel ? 'y' : 'x';
      const abre = (u) => (cel ? 0 : TX_SUS.separar * expoSus(u * (D / TX_SUS.abrir)));
      [cA, cB].forEach((c, j) => c && b.waapi(anim(c, cuadrosTira(px, { eje, base: (u) => (j ? 1 : -1) * abre(u), k: TX_SUS.siguen, crece: TX_SUS.crece, lado: j ? -1 : 1 }), { delay: tS, duration: D, fill: 'both' })));
      // el pulso: la linea y la luz laten (el ambiente), y en el DOM el brillo de la placa y el pip del decisivo
      const latidos = programarSuspenso({ b, amb, sonido, tS });
      latirPlaca(b, pl, latidos, tS);
      const tL = tS - TX_SUS.latido.cae;
      const dL = D + TX_SUS.latido.cae;
      const pip = pipsMapa[l.mapa - 1];
      const halo = (v) => ({ boxShadow: `inset 0 0 0 1px var(--linea-fuerte), 0 0 ${(v * TX_SUS_PIP).toFixed(1)}px var(--luz)` });
      if (pip) b.waapi(anim(pip, cuadrosLatido(latidos, tL, dL, { valor: halo }), { delay: tL, duration: dL, fill: 'none' }));
    }

    // los participantes que no son WAAPI: la costura (el ambiente) y el marcador (la grafica del kit)
    const costuraP = {
      fps: 20,
      i: -2,
      en(tt) {
        let i = -1;
        for (let j = 0; j < mapasT.length; j++) if (tt >= mapasT[j].t0) i = j;
        if (i === this.i) return;
        this.i = i;
        const mp = mapasT[i];
        amb.ambiente({ costura: mp ? { a: { arte: mp.k }, b: { arte: mp.rk ?? null } } : { a: { arte: tuyo }, b: { arte: suyo } }, cruce: TX.cruce });
      },
    };
    const marcadorP = {
      fps: 30,
      n: -1,
      en(tt) {
        let s = 0;
        for (const mp of mapasT) if (tt >= mp.t0 + TX.pip + mp.s) s++;
        let q = quemados0.length;
        for (const x of cuentaQ) if (tt >= x.t) q = x.n;
        contador.textContent = q ? `${q} de ${capacidad}` : 'ninguno todavía';
        if (s === this.n) return;
        this.n = s;
        mc.actualizar({ mapas: [...jugados, ...mapasT.slice(0, s).map((x) => x.l)].map((x) => ({ resultado: x.resultado })) });
      },
    };
    b.agregar(costuraP);
    b.agregar(marcadorP);

    // el desenlace en el mundo: la luz cae (perdiste), sube (gloria) o queda en tension (la serie sigue)
    const animoFin = fin?.postSerie ? (ganoSerie ? 'gloria' : 'caida') : 'peligro';
    amb.ambiente({ animo: animoFin, retardo: quieto() ? 0 : tFin });
    if (animoFin === 'gloria') {
      const td = b.destello(tFin);
      if (td != null) amb.pulso('gloria', td);
    }
    saltar = () => {
      b.saltar();
      amb.ambiente({ animo: animoFin, instantaneo: true });
      saltar = null;
    };
    b.esperar(tFin + TX.asentarse).then(() => {
      saltar = null;
      if (raiz.isConnected) btnCierre?.focus({ preventScroll: true });
    });
    b.iniciar();
  }

  // la placa de cierre: el resultado grande (los dos logos y el marcador), quien se la lleva y el texto del motor
  function cierre(finLog, mapasT, t0, r, gano) {
    const ultimoMp = mapasT[mapasT.length - 1]?.l;
    const sigue = !finLog?.postSerie;
    const enc = r?.inmediato?.encadenaOtraParada;
    const [a, b] = String(ultimoMp?.marcador ?? `${marcadorAhora[0]}-${marcadorAhora[1]}`).split('-');
    const titular = sigue ? 'La serie sigue' : gano ? (se.ronda === 'final' ? 'Campeones' : `${sNos} gana la serie`) : `${sEllos} gana ${se.ronda === 'final' ? 'la final' : 'la serie'}`;
    const texto = finLog?.message ?? (enc ? `La serie sigue en «${enc.titulo}».` : ultimoMp?.cierre ?? '');
    const btn = el('button', { class: 'boton tx-cierre-btn', type: 'button', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]);
    const res = el('div', { class: 'tx-cierre-res' }, [
      el('span', { class: 'tx-cierre-eq', 'data-lado': 'a', 'data-gana': !sigue && gano ? '' : null }, [logoOrg(nos, { clase: 'tx-cierre-logo' }), el('b', { class: 'num', text: a ?? '' })]),
      el('i', { class: 'tx-cierre-guion', 'aria-hidden': 'true', text: '–' }),
      el('span', { class: 'tx-cierre-eq', 'data-lado': 'b', 'data-gana': !sigue && !gano ? '' : null }, [el('b', { class: 'num', text: b ?? '' }), logoOrg(ellos, { clase: 'tx-cierre-logo' })]),
    ]);
    const titulo = el('p', { class: 'tx-cierre-t', 'data-gano': sigue ? 'sigue' : String(Boolean(gano)), text: titular });
    const placa = placaInferior({ rotulo: `${comp.nombre} ${m.anio} · ${ronda} · Bo${formato}`, titulo: texto, sub: `${sNos} ${a ?? ''}–${b ?? ''} ${sEllos}${sigue ? ' · la serie sigue' : ''}`, tono: tComp });
    const nodo = el('div', { class: 'tx-cierre', role: 'status', 'aria-label': `${titular}: ${nos} ${a}, ${ellos} ${b}` }, [res, titulo, el('div', { class: 'tx-cierre-pie' }, [placa, btn])]);
    juego.append(nodo);
    beats.waapi([
      anim(nodo, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible' }], { delay: t0, duration: 360 }),
      anim(res, [{ transform: 'scale(1.35)', filter: 'blur(10px) brightness(2)' }, { transform: 'none', filter: 'none' }], { delay: t0, duration: 520, easing: EXPO }),
      anim(titulo, [{ opacity: 0, letterSpacing: '0.32em', transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + 220, duration: 560, easing: EXPO }),
      anim(placa, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { delay: t0 + 480, duration: 420, easing: EXPO }),
      anim(btn, [{ opacity: 0 }, { opacity: 1 }], { delay: t0 + 700, duration: 260 }),
    ]);
    return btn;
  }

  // teclado: 1-3 eligen, flechas recorren, Espacio/Esc salta al asentarse, R repite
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
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), { mover: true, detalle: true });
    } else if ((e.key === 'r' || e.key === 'R') && elegida) window.vitrina?.repetir();
  }

  // el arte de la serie se precarga: al jugarla, cada mapa ya tiene su carta, su costura y su quemado
  const precarga = (m.resultados ?? []).flatMap((x) => (x.logsDeLaSerie ?? x.inmediato?.logs ?? []).filter((l) => l.mapa))
    .flatMap((l) => [l.campeon, l.rivalJuega].filter(Boolean).map(claveCampeon))
    .flatMap((k) => [cargarImagen(urlCarga(k, meta)), cargarImagen(urlCentrada(k, meta)), cargarImagen(urlIcono(k, meta))]);
  return {
    nodo: raiz,
    entrar: entrada,
    elegir,
    tecla,
    listo: () => Promise.all([...cargas, ...precarga, logosListos(raiz)]),
    congelar: (ms) => beats?.congelar(ms),
    pausar: () => beats?.pausar(),
    reanudar: () => beats?.reanudar(),
    destruir: () => {
      desuscribir?.();
      cancelAnimationFrame(seguirRaf);
      beats?.destruir();
    },
    arte: tuyo,
    animo: 'normal',
    encuadre: celular() ? 'celular' : 'derecha',
    velo: 0,
    tono: tComp,
    paleta: paletaDe(tComp),
    costura: costura0,
    escena: 'costura',
    lightsticks: 1,
  };
}

// ======================================================================================================================
// El Swiss: la misma transmision, vista en un stream
// ======================================================================================================================
const TXS = {
  t0: 380, // despues de elegir: la charla (si la usaste) o el Bo1
  charla: 1150, // la charla del coach, como placa inferior adentro del video
  juego: 1000, // EN JUEGO: el Bo1
  pip: 260, // despues del resultado: el pip y el golpe del marcador
  post: 1500, // del resultado a AFUERA
  apagon: 160, // AFUERA: el corte a negro, antes del golpe de luz
  golpe: 120, // el golpe de luz (un destello)
  letra: 85, // entre letra y letra de AFUERA
  letras: 220, // cuando empieza a caer la primera
  asentar: 1300, // los datos y el boton
  asentarse: 2300, // desde AFUERA: hasta aca salta Espacio
  dur: 2700, // desde AFUERA: el final de la secuencia
  camara: 6000, // cada cuanto se mueve la camara del video (ms; cruza en ese tiempo)
  espectadores: [184000, 412000], // decorativo (PRNG): lo que mira una ronda decisiva del Swiss
  subenCada: 1700, // cada cuanto suben los espectadores (decorativo)
  suben: [40, 420],
  aquietar: 900,
};
// el zoom y el paneo de la camara del video: el marco de la costura crece (zoom) y se corre (paneo) adentro de la caja
const CAMARA = { zoom: [1.03, 1.1], paneo: 0.025 };
// la racha de hype (decorativa): donde arranca, hasta donde la sube la tension, el empujon de apuntar y al elegir
const HYPE = { desde: 0.18, tension: 0.58, subida: 9000, apuntar: 0.08, elegir: 0.86 };
const ETQ_PRED = { charla: 'con la charla', sinCharla: 'guardando la charla' };

function crearSwissLinea({ datos, muestra, amb, sonido, peor }) {
  const m = datos[muestra];
  const comp = competicionDe(datos, muestra);
  const meta = datos.meta;
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
  const ligaPropia = (it.participantes ?? []).find((p) => p.nombre === org)?.liga ?? m.ficha?.jugador?.liga ?? '';
  const rondas = (it.swiss?.rondas ?? []).flat().filter((x) => x.a === org || x.b === org).sort((a, b) => a.ronda - b.ronda);
  const rec = it.swiss?.record?.[org] ?? { v: 0, d: 0 };
  const recRival = it.swiss?.record?.[rival];
  const camara = claveCampeon(pg.desglose?.campeon ?? m.ficha?.jugador?.campeonDelSplit) ?? 'Anivia';
  const anio = it.anio ?? m.anio;
  const proxima = (rondas[rondas.length - 1]?.ronda ?? 0) + 1;
  const sNos = siglaDe(orgVista);
  const sEllos = siglaDe(rival);
  const pOpc = Object.fromEntries((pg.opciones ?? []).map((o) => [o.id, o]));
  const quietoSw = quieto();
  // (PLANUI §4.10) el Bo1 de vida o muerte (a una victoria de pasar y a una derrota de quedar afuera) trae el suspenso
  const vidaOMuerte = esVidaOMuerte(rec);

  // ---------- los tonos: la noche de Worlds (la pagina) y cada org (cada mitad del video) ----------
  const tComp = tonoCompeticion(comp.id);
  const tA = tonoOrg(orgVista);
  const tB = separar(tA, tonoOrg(rival), tComp);
  // el rival del Bo1 no tiene pick en el motor: su lado queda solo tono, con su logo encima
  const ladoCostura = { a: { arte: camara, tono: tA }, b: { arte: null, tono: tB }, posicion: 0.5 };

  const raiz = el('section', { class: 'tx tx-swiss', 'data-pieza': 'partido', 'data-muestra': muestra, 'data-op': 'linea' });
  tonosDeLados(raiz, tA, tB);

  // ---------- el video: la grafica de Worlds sobre la costura ----------
  const mc = marcadorTx({ comp, rotulo: `Swiss · ronda ${proxima}`, local: { nombre: orgVista, sigla: sNos, logo: logoOrg(orgVista) }, visita: { nombre: rival, sigla: sEllos, logo: logoOrg(rival) }, formato: 1, mapas: [] });
  mc.nodo.classList.add('tx-mc');
  const pipCamino = (r) => {
    const gano = r.ganador === org;
    const otro = r.a === org ? r.b : r.a;
    return el('li', { 'data-res': gano ? 'W' : 'L', title: `Ronda ${r.ronda}: ${gano ? 'le ganaste a' : 'perdiste con'} ${otro}${r.p != null ? ` · tenías ${pct(r.p)}` : ''}` }, [
      el('span', { text: `R${r.ronda}` }), logoOrg(otro, { clase: 'tx-cam-logo' }), el('b', { text: siglaDe(otro) }),
    ]);
  };
  const r5 = el('li', { 'data-res': 'vivo', title: `Ronda ${proxima}: ${rival}` }, [el('span', { text: `R${proxima}` }), logoOrg(rival, { clase: 'tx-cam-logo' }), el('b', { text: siglaDe(rival) })]);
  const camino = el('ol', { class: 'tx-camino', 'aria-label': `Swiss: vas ${rec.v}-${rec.d}` }, [...rondas.map(pipCamino), r5]);
  const vom = el('div', { class: 'tx-sw-vom' }, placaInferior({
    rotulo: 'Eliminación · vida o muerte',
    titulo: `${orgVista} vs ${rival}`,
    sub: `${rec.v}–${rec.d}${recRival ? ` contra ${recRival.v}–${recRival.d}` : ''}: el que pierde se vuelve a casa`,
    tono: tComp,
  }));
  const caraA = el('div', { class: 'tx-sw-cara', 'data-lado': 'a', 'aria-hidden': 'true' }, [
    el('p', { class: 'tx-cara-n', text: fichaDe(datos, camara).nombre }),
    el('p', { class: 'tx-cara-q' }, [logoOrg(orgVista, { clase: 'tx-cara-logo' }), el('span', { text: `${handle} · ${sNos}` })]),
  ]);
  // el lado del rival: su logo (<img>, nunca en el lienzo) donde cae su cara en la costura, y su nombre debajo
  const caraB = el('div', { class: 'tx-sw-cara', 'data-lado': 'b', 'aria-hidden': 'true' }, [
    logoOrg(rival, { clase: 'tx-sw-logo-b' }),
    el('p', { class: 'tx-cara-n', text: rival }),
    el('p', { class: 'tx-cara-q' }, [el('span', { text: ligaRival ? `${ligaRival} · ${recRival ? `${recRival.v}–${recRival.d}` : ''}` : '' })]),
  ]);
  const juego = el('div', { class: 'tx-juego tx-sw-juego', 'aria-live': 'polite' });
  const vivoPill = el('p', { class: 'tx-sw-vivo' }, [el('i'), 'En vivo']);
  const controles = barraPlayer();
  const player = el('div', { class: 'tx-sw-player', 'data-ui': 'on' }, [
    el('div', { class: 'tx-sw-graf' }, [vivoPill, logoComp(comp, { clase: 'tx-sw-agua' }), mc.nodo, caraA, caraB, vom, camino, juego]),
    controles.nodo,
  ]);

  // ---------- la pagina del stream: el titulo, el canal, EN VIVO, el clip y la racha de hype ----------
  const azS = crearAzar(`tx-stream-${anio}-${rival}`);
  let espectadores = azS.entero(TXS.espectadores[0], TXS.espectadores[1]);
  const nEspect = el('b', { class: 'num', text: num(espectadores) });
  const clip = el('button', { type: 'button', class: 'tx-clip', 'aria-label': 'Clip de los últimos 30 segundos' }, [icoClip(), el('span', { class: 'tx-clip-et' }, [el('span', { class: 'tx-clip-t', text: 'Clip' }), el('span', { class: 'tx-clip-ya', text: '¡Clip!' })])]);
  clip.addEventListener('click', () => clip.toggleAttribute('data-hecho', true));
  const hypeBarra = el('i', { class: 'tx-hype-in', style: { '--v': String(HYPE.desde) } });
  const hypeNivel = el('b', { class: 'tx-hype-nivel', text: 'Nivel 1' });
  const hype = el('div', { class: 'tx-hype', role: 'img', 'aria-label': 'Racha de hype del chat' }, [
    el('span', { class: 'tx-hype-k' }, [icoLlama(), el('span', { text: 'Racha de hype' }), hypeNivel]),
    el('i', { class: 'tx-hype-barra' }, hypeBarra),
  ]);
  const info = el('div', { class: 'tx-sw-info' }, [
    el('i', { class: 'tx-sw-avatar', 'aria-hidden': 'true' }, logoComp(comp, { clase: 'tx-sw-avatar-logo' })),
    el('div', { class: 'tx-sw-txt' }, [
      el('p', { class: 'tx-sw-titulo', text: `${comp.nombre.toUpperCase()} ${anio} · Swiss, ronda ${proxima}: ${orgVista} vs ${rival} · ${rec.v}-${rec.d}, vida o muerte` }),
      el('p', { class: 'tx-sw-canal' }, [el('b', { text: comp.nombre }), el('span', { text: `transmisión oficial · ${comp.largo}` })]),
      el('p', { class: 'tx-sw-tags' }, ['League of Legends', 'Español', 'Esports', 'Swiss'].map((t) => el('span', { text: t }))),
    ]),
    el('div', { class: 'tx-sw-acciones' }, [
      el('p', { class: 'tx-sw-espect' }, [el('span', { class: 'tx-sw-vivo' }, [el('i'), 'En vivo']), nEspect, el('span', { text: 'espectadores' })]),
      el('div', { class: 'tx-sw-fila' }, [clip, hype]),
    ]),
  ]);
  // los cruces de la ronda (los del motor): el tuyo es el que esta en pantalla
  const recDe = (n) => it.swiss?.record?.[n];
  const ladoCruce = (n) => [logoOrg(n, { clase: 'tx-cruce-logo' }), el('b', { text: siglaDe(n), title: n }), el('span', { class: 'num', text: recDe(n) ? `${recDe(n).v}–${recDe(n).d}` : '' })];
  const cruces = el('section', { class: 'tx-sw-cruces', 'aria-label': `Swiss, ronda ${proxima}: los cruces` }, [
    el('p', { class: 'eq-kicker', text: `Ronda ${proxima} · los cruces` }),
    el('ul', {}, (it.partidoEnCurso?.cruces ?? []).map((x) => {
      const vos = [x.a, x.b].includes(org);
      return el('li', { 'data-vos': vos ? '' : null }, [...ladoCruce(x.a), el('i', { text: 'vs' }), ...ladoCruce(x.b).reverse(), vos ? el('small', { text: 'en pantalla' }) : null]);
    })),
  ]);

  // ---------- la decision: un panel de cliente al costado (nunca tapa el video) ----------
  const cab = cabecera({ rotulo: [`Mundial ${anio}`, `Swiss · ronda ${proxima} · Bo1`], titulo: dec.titulo, descripcion: dec.descripcion });
  cab.rotulo.querySelector('.punto-luz')?.replaceWith(logoComp(comp, { clase: 'rot-logo' }));
  cab.titulo.classList.add('tx-titulo');
  const ICONOS = { charla: 'charla', sinCharla: 'sinCharla' };
  const filas = ops.map((o, i) => el('button', { class: 'opcion tx-sw-op', type: 'button', 'data-atajo': String(i + 1), 'aria-describedby': `tx-sw-desc-${i + 1}` }, [
    el('span', { class: 'op-tecla', text: String(i + 1) }), icono(ICONOS[o.id] ?? 'serie'), el('span', { class: 'op-label', text: o.label }),
  ]));
  const insp = el('p', { class: 'tx-sw-insp', 'aria-live': 'polite', text: 'Apuntá una opción: la predicción del stream se mueve con el número del motor.' });
  const ocultas = el('div', { class: 'sr' }, ops.map((o, i) => el('div', { id: `tx-sw-desc-${i + 1}`, text: `${o.descripcion ?? ''} ${pOpc[o.id]?.texto ?? ''}` })));
  const decision = el('section', { class: 'tx-sw-decision panel', 'data-pieza': 'decision', 'aria-label': dec.titulo }, [cab.nodo, el('div', { class: 'tx-sw-ops', role: 'group', 'aria-label': 'Opciones' }, filas), insp, ocultas]);

  // la previa como prediccion del stream: el numero del motor, que se mueve al apuntar una opcion
  const p0 = pg.porcentaje ?? Math.round((pg.p ?? 0) * 100);
  const predP = el('b', { class: 'num tx-pred-p', text: `${p0}%` });
  const predEt = el('span', { class: 'tx-pred-et', text: 'de ganar el Bo1 · así como están' });
  const predNo = el('b', { class: 'num tx-pred-no', text: `${100 - p0}%` });
  const predBarra = el('i', { class: 'tx-pred-si', style: { '--v': String(p0 / 100) } });
  const pred = el('section', { class: 'tx-pred', 'aria-live': 'polite', 'aria-label': `Predicción del stream: ${orgVista} gana, ${p0}%` }, [
    el('p', { class: 'tx-pred-k' }, [icoPrediccion(), el('span', { text: 'Predicción' }), el('b', { text: `¿${orgVista} pasa a cuartos?` })]),
    el('div', { class: 'tx-pred-fila' }, [el('span', { class: 'tx-pred-lado', 'data-lado': 'si' }, [predP, el('small', { text: 'sí' })]), el('i', { class: 'tx-pred-barra' }, predBarra), el('span', { class: 'tx-pred-lado', 'data-lado': 'no' }, [el('small', { text: 'no' }), predNo])]),
    predEt,
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
    pred.setAttribute('aria-label', `Predicción del stream: ${orgVista} gana, ${p}% ${etiqueta}`);
  }

  // ---------- el chat vivo ----------
  const ultimo = rondas[rondas.length - 1];
  const chat = crearChatTx({
    semilla: `${anio}-${rival}`,
    d: {
      org: orgVista, sigla: sNos, rival, siglaRival: sEllos, handle, camara: fichaDe(datos, camara).nombre, ligaRival, ligaPropia, rec,
      verdugo: ultimo ? (ultimo.a === org ? ultimo.b : ultimo.a) : null,
      cruces: (it.partidoEnCurso?.cruces ?? []).filter((x) => ![x.a, x.b].includes(org)).map((x) => [siglaDe(x.a), siglaDe(x.b)]),
    },
  });

  const frN = franja(fr, { peor: pc ? { handle: pc.handle, org: pc.org?.nombre } : null });
  const tray = trayectoria(datos.final?.tarjeta?.historia ?? [], m.anio, m.edad);
  // en el celular, el video queda fijo arriba y lo demas corre debajo (nada pasa por detras de la caja del video)
  const scrollCel = celular() ? el('div', { class: 'tx-sw-scroll' }, [decision, pred, info, chat.nodo, cruces]) : null;
  const sw = scrollCel
    ? el('div', { class: 'tx-sw' }, [player, scrollCel])
    : el('div', { class: 'tx-sw' }, [el('div', { class: 'tx-sw-stream' }, [player, info, cruces]), el('div', { class: 'tx-sw-lateral' }, [decision, pred, chat.nodo])]);
  raiz.append(frN, sw, cuartos('mundo', null, tray));

  // apuntar: la prediccion se mueve, el chat aconseja y la racha de hype se empuja
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
    if (po) moverPrediccion(po.porcentaje ?? Math.round(po.p * 100), ETQ_PRED[o.id] ?? `con «${o.label}»`);
    if (cambia) {
      chat.rafaga(o.id);
      empujarHype(HYPE.apuntar);
    }
    if (mover) filas[apuntada].focus({ preventScroll: true });
  }
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (elegida) return;
      if (i !== apuntada) amb.pulso('apuntar');
      apuntar(i);
    });
    f.addEventListener('focus', () => apuntar(i));
    f.addEventListener('click', () => elegir(i + 1));
  });
  function empujarHype(dv, hasta = null) {
    hypeV = Math.min(1, hasta ?? hypeV + dv);
    hypeBarra.style.setProperty('--v', String(hypeV));
    hypeNivel.textContent = hypeV >= 1 ? '¡Nivel 3!' : hypeV >= 0.5 ? 'Nivel 2' : 'Nivel 1';
  }

  // ---------- el marco de la costura: la caja del video, medida (y la camara que se mueve adentro) ----------
  let marcoBase = null;
  let congelado = false;
  function medirMarco() {
    const r = player.getBoundingClientRect();
    const W = document.documentElement.clientWidth || innerWidth;
    const H = innerHeight;
    marcoBase = r.width > 2 && r.height > 2 ? { x: r.left / W, y: r.top / H, w: r.width / W, h: r.height / H } : null;
    return marcoBase;
  }
  const azCam = crearAzar(`tx-camara-${anio}-${rival}`);
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
    if (congelado || takeoverYa || !raiz.isConnected) return;
    const marco = marcoCamara(azCam.entre(CAMARA.zoom[0], CAMARA.zoom[1]), azCam.entre(-CAMARA.paneo, CAMARA.paneo), azCam.entre(-CAMARA.paneo, CAMARA.paneo));
    if (marco) amb.ambiente({ costura: { marco }, cruce: TXS.camara });
  }
  function ponerCostura({ cruce, k = 1 } = {}) {
    if (takeoverYa) return null;
    medirMarco();
    const marco = quietoSw ? marcoBase : marcoCamara(CAMARA.zoom[0]);
    return amb.ambiente({ costura: { ...ladoCostura, k, marco }, ...(cruce != null ? { cruce } : {}) });
  }
  // la pagina se mueve (el celular, o una ventana baja): el marco la sigue
  let medida = 0;
  const alMover = () => {
    cancelAnimationFrame(medida);
    medida = requestAnimationFrame(() => {
      const antes = marcoBase;
      medirMarco();
      if (!marcoBase || takeoverYa || (antes && Math.abs(antes.y - marcoBase.y) < 0.002 && Math.abs(antes.w - marcoBase.w) < 0.002)) return;
      amb.ambiente({ costura: { marco: quietoSw ? marcoBase : marcoCamara(CAMARA.zoom[0]) }, cruce: 1 });
    });
  };

  // el logo del rival y su nombre siguen a la cara de B (la geometria del ambiente)
  let seguirRaf = 0;
  function seguir() {
    seguirRaf = requestAnimationFrame(seguir);
    if (!raiz.isConnected) return;
    const g = carasDe(amb.costura?.(), marcoBase ?? undefined);
    const r = player.getBoundingClientRect();
    if (!g?.b || !(r.width > 2)) return;
    caraB.style.left = `${g.b.x * innerWidth - r.left}px`;
    caraB.style.top = `${g.b.y * innerHeight - r.top}px`;
  }

  // ---------- entrar ----------
  let espectReloj = 0;
  function entrada() {
    entrar(frN, 0, -10);
    anim(sw, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
    // la costura entra recien con la caja del video medida
    ponerCostura({ cruce: 900 });
    addEventListener('resize', alMover);
    raiz.closest('.escena')?.addEventListener('scroll', alMover, { passive: true });
    seguir();
    anim(mc.nodo, [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], { delay: 360, duration: 360, easing: EXPO });
    anim(caraA, [{ opacity: 0, transform: 'translateX(-30px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'none', clipPath: 'inset(0 0 0 0)' }], { delay: 520, duration: 480, easing: EXPO });
    anim(caraB, [{ opacity: 0 }, { opacity: 1 }], { delay: 640, duration: 420 });
    anim(vom, [{ opacity: 0, transform: 'translateX(-16px)' }, { opacity: 1, transform: 'none' }], { delay: 700, duration: 360, easing: EXPO });
    camino.querySelectorAll('li').forEach((li, i) => anim(li, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { delay: 760 + i * 60, duration: 260, easing: EXPO }));
    anim(decision, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { delay: 300, duration: 340, easing: EXPO });
    entrar(cab.rotulo, 380, 8);
    lineasConMascara(cab.titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: 420 + i * 70, dur: 420 }));
    filas.forEach((f, i) => entrar(f, 560 + i * 60, 12));
    entrar(pred, 640, 10);
    entrar(info, 420, 10);
    entrar(cruces, 520, 10);
    chat.guion('antes');
    controles.mostrar();
    if (!quietoSw) {
      camaraReloj = setInterval(moverCamara, TXS.camara);
      setTimeout(moverCamara, 1000);
      espectReloj = setInterval(() => {
        if (congelado || !raiz.isConnected) return;
        espectadores += azS.entero(TXS.suben[0], TXS.suben[1]);
        nEspect.textContent = num(espectadores);
      }, TXS.subenCada);
      // la tension del 2-2 llena la racha de hype sola
      requestAnimationFrame(() => {
        hypeBarra.style.transitionDuration = `${HYPE.subida}ms`;
        empujarHype(0, HYPE.tension);
        setTimeout(() => (hypeBarra.style.transitionDuration = ''), HYPE.subida);
      });
    }
    esperar(raiz, TXS.aquietar).then(() => amb.aquietar(true));
    if (quietoSw) amb.aquietar(true);
  }

  // ---------- elegir: el Bo1, el resultado y AFUERA (una secuencia de beats) ----------
  let elegida = 0;
  let beats = null;
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
    raiz.dataset.jugando = '';
    // la decision queda resuelta: la elegida encendida, la otra apagada; la prediccion se cierra con tu numero
    filas.forEach((f, j) => {
      f.classList.toggle('apuntada', j === n - 1);
      if (j !== n - 1) f.classList.add('bloqueada');
      f.setAttribute('aria-disabled', 'true');
    });
    insp.textContent = op.descripcion ?? '';
    const pElegida = Math.round((partido?.p ?? pOpc[op.id]?.p ?? 0) * 100);
    moverPrediccion(pElegida, `${ETQ_PRED[op.id] ?? op.label} · predicción cerrada`);
    pred.dataset.cerrada = '';
    empujarHype(0, HYPE.elegir);
    amb.pulso('peligro');
    amb.aquietar(false);
    sonido?.clic?.();

    let t = TXS.t0;
    const placas = [];
    for (const l of antes) {
      placas.push({ t0: t, nodo: el('div', { class: 'tx-charla' }, placaInferior({ rotulo: 'Vestuario · el coach', titulo: l.message, tono: tComp })) });
      t += TXS.charla;
    }
    const tJuego = t;
    // el de vida o muerte: EN JUEGO y, desde SUS_SW.desde, el suspenso hasta el resultado (PLANUI §4.10)
    const sus = vidaOMuerte && !quietoSw;
    const tS = tJuego + SUS_SW.desde;
    const tPost = sus ? tS + TX_SUS.dura : tJuego + TXS.juego;
    const tAfuera = tPost + TXS.post;
    const b = crearBeats({ duracion: tAfuera + TXS.dur, asentarse: tAfuera + TXS.asentarse });
    beats = b;
    chat.guion('despues', { tPost, tFin: tAfuera, gano, fuera });

    // la placa de "vida o muerte" le deja el lugar a la del vestuario (no se pisan)
    b.waapi(irseEn(vom, TXS.t0, TXS.golpe));
    placas.forEach((x) => {
      juego.append(x.nodo);
      b.waapi(ventanaTx(x.nodo, x.t0, TXS.charla));
    });
    // EN JUEGO: el Bo1, con tu chance real (que no cambia lo que sale)
    const enJuego = el('div', { class: 'tx-sw-enjuego' }, [
      el('p', { class: 'tx-sw-enjuego-k' }, [el('i', { class: 'tx-sw-punto' }), 'En juego · Bo1']),
      el('p', { class: 'tx-sw-enjuego-vs' }, [logoOrg(orgVista, { clase: 'tx-cara-logo' }), el('b', { text: `${sNos} vs ${sEllos}` }), logoOrg(rival, { clase: 'tx-cara-logo' })]),
      el('p', { class: 'tx-sw-enjuego-p' }, [el('b', { class: 'num', text: pct(partido?.p) }), el('span', { text: 'tu chance en este Bo1' })]),
    ]);
    juego.append(enJuego);
    b.waapi(ventanaTx(enJuego, tJuego, sus ? SUS_SW.desde + 160 : TXS.juego + 120));
    // el resultado: VICTORIA/DERROTA sobre el lado del ganador, adentro del video
    const vd = victoriaDerrota({ gano, sub: `Swiss · ronda ${partido?.ronda ?? proxima} · ${recFinal.replace('-', '–')}`, retardo: tPost });
    const vdCaja = el('div', { class: 'tx-vd tx-sw-vd', 'data-lado': gano ? 'a' : 'b' }, vd.nodo);
    juego.append(vdCaja);
    b.waapi(ventanaTx(vdCaja, tPost, tAfuera - tPost + 200, 60, 260));
    b.waapi(vd.animaciones);
    const td = b.destello(tPost + 40);
    if (td != null && gano) amb.pulso('logro', td);
    b.esperar(tPost + 60).then((ok) => ok && (gano ? sonido?.victoria?.() : sonido?.derrota?.()));
    if (sus) suspensoSw({ b, partido, tS });
    // el camino: la ronda en vivo se resuelve
    const res5 = el('b', { class: 'tx-cam-res', 'data-res': partido?.resultado ?? 'L', text: gano ? 'V' : 'D' });
    r5.append(res5);
    b.waapi(anim(res5, [{ opacity: 0, transform: 'scale(1.8)' }, { opacity: 1, transform: 'none' }], { delay: tPost + 200, duration: 320, easing: EXPO }));
    // el clip destella en el resultado; la racha de hype llega al tope
    clip.dataset.hecho = '';
    b.waapi([
      anim(clip, [{ boxShadow: '0 0 0 0 transparent' }, { boxShadow: '0 0 0 6px var(--tx-sw-clip-brillo)', offset: 0.3 }, { boxShadow: '0 0 0 0 transparent' }], { delay: tPost + 300, duration: 900 }),
      anim(clip.querySelector('.tx-clip-ya'), [{ opacity: 0, visibility: 'hidden' }, { opacity: 0, visibility: 'hidden' }], { delay: 0, duration: tPost + 300 }),
      anim(clip.querySelector('.tx-clip-t'), [{ opacity: 1, visibility: 'visible' }, { opacity: 1, visibility: 'visible' }], { delay: 0, duration: tPost + 300 }),
    ]);
    b.esperar(tPost).then((ok) => ok && empujarHype(0, 1));
    // los participantes que no son WAAPI: el marcador (la grafica del kit) y la camara del video
    b.agregar({
      fps: 30,
      n: -1,
      en(tt) {
        const s = tt >= tPost + TXS.pip ? 1 : 0;
        if (s === this.n) return;
        this.n = s;
        mc.actualizar({ mapas: s ? [{ resultado: partido?.resultado ?? 'L' }] : [] });
      },
    });

    // AFUERA (o ADENTRO): el takeover. La luz cae, el video se corta a negro (el apagon), el golpe de luz, la palabra cae
    // letra por letra, los datos se asientan y queda vivo. El mundo va al takeover (la escena `costura` saca la costura y
    // trae tu campeon al 70 % de su color: la politica `linea`).
    amb.ambiente({ animo: fuera ? 'caida' : 'gloria', retardo: quieto() ? 0 : tPost + 260 });
    amb.takeover?.(quieto() ? 0 : tAfuera - TXS.apagon);
    b.esperar(tAfuera - TXS.apagon).then(() => {
      takeoverYa = true;
    });
    const afuera = afueraNodo({ op, otro, partido, pOtro, fin, recFinal, fuera, r });
    sw.append(afuera.nodo);
    // el stream se corta: lo de la columna del stream se va en el golpe de luz (queda el mundo, con tu campeon)
    b.waapi([irseEn(player, tAfuera + TXS.golpe, 1), irseEn(info, tAfuera + TXS.golpe, 1), irseEn(cruces, tAfuera + TXS.golpe, 1)]);
    // en el celular todo corre en una sola columna: la transmision entera se corta (el takeover queda solo)
    if (scrollCel) b.waapi(irseEn(scrollCel, tAfuera + TXS.golpe, 1));
    b.waapi(afuera.animar(tAfuera));
    const tg = b.destello(tAfuera + TXS.golpe);
    if (tg != null) amb.pulso('peligro', tg);
    b.esperar(tAfuera + TXS.golpe).then((ok) => ok && sonido?.golpe?.());

    saltar = () => {
      b.saltar();
      takeoverYa = true;
      amb.ambiente({ animo: fuera ? 'caida' : 'gloria', instantaneo: true });
      saltar = null;
    };
    b.esperar(tAfuera + TXS.asentarse).then(() => {
      saltar = null;
      if (raiz.isConnected) afuera.boton.focus({ preventScroll: true });
    });
    b.iniciar();
  }

  // EL SUSPENSO del Bo1 de vida o muerte (PLANUI §4.10): EN JUEGO le deja el lugar a la placa del decisivo (la chance del
  // motor partida entre los dos), abajo en el video; adentro, la costura tira de un lado al otro y late (el logo del rival
  // la sigue), la luz va de un tono al otro y el pulso se acelera; la placa se va justo antes del golpe del resultado.
  function suspensoSw({ b, partido, tS }) {
    const D = TX_SUS.dura;
    const pl = placaDecisiva({
      rotulo: `En juego · Bo1 · ${rec.v}–${rec.d}`,
      linea: 'vida o muerte: el que pierde se vuelve a casa',
      p: partido?.p,
      nos: orgVista,
      ellos: rival,
      pie: 'la chance del motor en este Bo1',
    });
    pl.nodo.classList.add('tx-sw-sus');
    juego.append(pl.nodo);
    b.waapi([
      ventanaTx(pl.nodo, tS, D, 220, TX_SUS.salePlaca),
      anim(pl.nodo, [{ transform: 'translate(-50%, -50%) scale(0.86)', filter: 'blur(6px)' }, { transform: 'translate(-50%, -50%)', filter: 'none' }], { delay: tS, duration: TX_SUS.abrir, easing: EXPO }),
      anim(pl.nodo.querySelector('.tx-sus-si'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: tS + 200, duration: 620, easing: EXPO }),
    ]);
    latirPlaca(b, pl, programarSuspenso({ b, amb, sonido, tS }), tS);
  }

  // AFUERA: el takeover sobre la columna del stream (el chat sigue al costado)
  function afueraNodo({ op, otro, partido, pOtro, fin, recFinal, fuera, r }) {
    const palabra = fuera ? 'Afuera' : 'Adentro';
    const letras = [...palabra.toUpperCase()].map((c) => el('span', { class: 'tx-af-l', text: c }));
    const cambios = (r?.inmediato?.cambios ?? []).filter((c) => ETQ_CAMBIO[c.campo] && Math.round(c.antes) !== Math.round(c.despues));
    const boton = el('button', { type: 'button', class: 'boton', onclick: () => window.vitrina?.repetir() }, ['Volver a decidir', el('kbd', { text: 'R' })]);
    const apagon = el('i', { class: 'tx-af-apagon', 'aria-hidden': 'true' });
    const finTx = el('p', { class: 'tx-af-fin' }, [el('i'), 'Fin de la transmisión']);
    const kicker = el('p', { class: 'eq-kicker' }, [logoComp(comp, { clase: 'rot-logo' }), `Mundial ${anio} · Swiss · ronda ${partido?.ronda ?? proxima}`]);
    const titulo = el('h2', { class: 'tx-af-t', 'aria-label': palabra }, letras);
    const recN = el('p', { class: 'tx-af-rec' }, [el('b', { class: 'num', text: recFinal.replace('-', '–') }), el('span', { text: fin?.message ?? partido?.message ?? '' })]);
    const dos = el('div', { class: 'tx-af-dos' }, [
      el('p', { 'data-elegida': '' }, [el('span', { text: op.label }), el('b', { class: 'num', text: pct(partido?.p) })]),
      pOtro != null ? el('p', {}, [el('span', { text: otro.label }), el('b', { class: 'num', text: pct(pOtro) })]) : null,
      el('small', { text: 'tu chance en ese Bo1: la decisión movió el número, el dado salió igual' }),
    ]);
    const nums = cambios.length ? el('div', { class: 'tx-af-cambios' }, cambios.map((c) => {
      const [ico, et] = ETQ_CAMBIO[c.campo];
      const a = Math.round(c.antes);
      const bb = Math.round(c.despues);
      return el('p', { class: 'tx-af-cambio' }, [icono(ico === 'mundo' ? 'mundo' : glifoDeCampo(c.campo)), el('span', { text: et }), el('span', { class: 'tx-af-antes', text: num(a) }), icono('flecha'), el('b', { class: 'num', text: num(bb) }), el('span', { class: `tx-af-delta ${bb > a ? 'sube' : 'baja'}` }, [triangulos('baja', bb > a ? '+' : '-'), conSigno(bb - a)])]);
    })) : null;
    const cuerpo = el('div', { class: 'tx-af-cuerpo' }, [finTx, kicker, titulo, recN, dos, nums, boton]);
    const nodo = el('div', { class: 'tx-afuera', 'data-fuera': fuera ? '' : null, role: 'status' }, [apagon, cuerpo]);
    function animar(t0) {
      const A = t0 - TXS.apagon;
      const G = t0 + TXS.golpe;
      return [
        // antes del apagon no esta (su estado natural, visible, es el cuadro final)
        anim(nodo, [{ visibility: 'hidden' }, { visibility: 'hidden' }], { delay: 0, duration: Math.max(1, A) }),
        // el apagon: el video se corta a negro y el golpe de luz lo abre
        anim(apagon, [{ opacity: 0, visibility: 'visible' }, { opacity: 1, visibility: 'visible', offset: (G - A - 60) / (G - A + 420) }, { opacity: 1, visibility: 'visible', offset: (G - A) / (G - A + 420) }, { opacity: 0, visibility: 'visible' }], { delay: A, duration: G - A + 420, easing: 'linear' }),
        anim(kicker, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: G + 60, duration: 320, easing: EXPO }),
        // la palabra cae letra por letra, con peso
        ...letras.map((l, i) => anim(l, [{ opacity: 0, transform: 'translateY(-46%) scale(1.5)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { delay: t0 + TXS.letras + i * TXS.letra, duration: 380, easing: 'cubic-bezier(0.2, 1.3, 0.4, 1)' })),
        anim(titulo, [{ transform: 'none' }, { transform: 'translateY(3px)', offset: 0.3 }, { transform: 'none' }], { delay: t0 + TXS.letras + (letras.length - 1) * TXS.letra + 200, duration: 260 }),
        ...[recN, dos, nums, boton].filter(Boolean).map((x, i) => anim(x, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: t0 + TXS.asentar + i * 110, duration: 320, easing: EXPO })),
        anim(finTx, [{ opacity: 0 }, { opacity: 1 }], { delay: t0 + TXS.asentar + 500, duration: 300 }),
      ];
    }
    return { nodo, boton, animar };
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
      apuntar(apuntada < 0 ? 0 : apuntada + (e.key === 'ArrowDown' ? 1 : -1), { mover: true });
    } else if ((e.key === 'r' || e.key === 'R') && elegida) window.vitrina?.repetir();
  }

  return {
    nodo: raiz,
    entrar: entrada,
    elegir,
    tecla,
    listo: () => Promise.all([logosListos(raiz), cargarImagen(urlCentrada(camara, meta))]),
    congelar: (ms) => {
      congelado = true;
      beats?.congelar(ms);
    },
    pausar: () => beats?.pausar(),
    reanudar: () => beats?.reanudar(),
    destruir: () => {
      clearInterval(camaraReloj);
      clearInterval(espectReloj);
      cancelAnimationFrame(seguirRaf);
      cancelAnimationFrame(medida);
      removeEventListener('resize', alMover);
      raiz.closest('.escena')?.removeEventListener('scroll', alMover);
      controles.destruir();
      chat.destruir();
      beats?.destruir();
    },
    arte: camara,
    animo: 'normal',
    // el takeover trae tu campeon a la columna del stream (a la izquierda del chat)
    encuadre: celular() ? 'celular' : 'tribuna',
    velo: 0.2,
    tono: tComp,
    paleta: paletaDe(tComp),
    // la costura entra en entrar(), con la caja del video ya medida (aca, apagada: precarga el arte y los tonos)
    costura: { ...ladoCostura, k: 0 },
    escena: 'costura',
    lightsticks: 1,
  };
}

// ---------- el reproductor (el patron de los streams, sin marcas): reproducir, volumen, EN VIVO, calidad, completa ----------
// Los controles se esconden solos si no se mueve el mouse y vuelven al moverlo o con el foco. Pausar congela la grafica.
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
    },
  };
}
// los glifos del stream (propios): el clip, la llama de la racha de hype, la prediccion
const icoDe = (clase, paths) => {
  const s = svg('svg', { class: `tx-ico ${clase}`, viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  for (const d of paths) s.append(svg('path', { d }));
  return s;
};
const icoClip = () => icoDe('tx-ico-clip', ['M4 6.5h11.5l4.5-2.5v15l-4.5-2.5H4z', 'M8 10.2l4 1.8-4 1.8z']);
const icoLlama = () => icoDe('tx-ico-llama lleno', ['M12 2.5c.8 3.6 4.8 5.5 4.8 10a4.8 4.8 0 0 1-9.6 0c0-2.4 1.5-3.6 2.3-5.6.5 1.9 1.3 2.7 2 3.1-.4-2.4-.2-5.1.5-7.5z']);
const icoPrediccion = () => icoDe('tx-ico-pred', ['M4 19V11', 'M10 19V6', 'M16 19v-9', 'M21 19H3']);

// ---------- el chat del stream: decorativo, determinista (comun/azar.js) y armado con los datos reales ----------
// Nombres de colores, insignias propias (sub con sus meses, mod, VIP), emotes propios en SVG, mensajes destacados y
// ráfagas sincronizadas: "FURIA FURIA" al entrar, consejos al apuntar, y al terminar una pared de GG (o de F si quedan
// afuera). Cada guion es una lista { t, nodo } y UNA animacion WAAPI que corre la lista (congelar(t) la fotografia).
const CHAT_TX = { alto: 28, colores: 8, usuarios: 44, inicial: 14, antesHasta: 60000, rafaga: 6, gapRafaga: 110 };
const MESES_SUB = [0, 0, 0, 0, 1, 2, 3, 4, 6, 9, 12, 14, 18, 24, 30, 36, 48];
// los cinco niveles de la insignia de sub, por meses (como los de los streams: cambia la forma, no un numero)
const NIVEL_SUB = [[24, 5], [12, 4], [6, 3], [3, 2], [1, 1]];
const INSIGNIAS = {
  sub1: ['M3 10.5L8 5.5l5 5v3l-5-5-5 5z'],
  sub2: ['M3 8L8 3l5 5v2.6l-5-5-5 5z', 'M3 13l5-5 5 5v2.6l-5-5-5 5z'],
  sub3: ['M8 1.6l1.9 4.3 4.7.4-3.6 3.1 1.1 4.6L8 11.6 3.9 14l1.1-4.6-3.6-3.1 4.7-.4z'],
  sub4: ['M8 1l6 2.5V8c0 3.5-2.6 6-6 7-3.4-1-6-3.5-6-7V3.5z', 'M8 4.8l1.1 2.4 2.6.2-2 1.7.6 2.6L8 10.4l-2.3 1.3.6-2.6-2-1.7 2.6-.2z'],
  sub5: ['M2 6l3-4h6l3 4-6 8.5z', 'M2 6h12M5 2l3 12.5L11 2'],
  mod: ['M8 1l6 2.5V8c0 3.5-2.6 6-6 7-3.4-1-6-3.5-6-7V3.5z', 'M5 8.2l2.1 2.1L11 6.4'],
  vip: ['M8 1.5L14.5 8 8 14.5 1.5 8z', 'M8 4.5L11.5 8 8 11.5 4.5 8z'],
};
function insignia(tipo, etiqueta) {
  const s = svg('svg', { class: `tx-ins tx-ins-${tipo}`, viewBox: '0 0 16 16', role: 'img', 'aria-label': etiqueta });
  INSIGNIAS[tipo].forEach((d, i) => s.append(svg('path', { d, class: i ? 'tx-ins-2' : 'tx-ins-1' })));
  return s;
}
// los emotes propios (24 x 24): f = relleno, t = trazo, l = luz, g = la gota
const EMOTES = {
  garra: [['f', 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z'], ['t', 'M7 18L10.5 6'], ['t', 'M11 18.5L14.5 6.5'], ['t', 'M15 18l3-9']],
  vamo: [['f', 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z'], ['t', 'M7.5 12.5L12 8l4.5 4.5'], ['t', 'M7.5 17L12 12.5l4.5 4.5']],
  fe: [['f', 'M12 2c1 4.4 6 6.6 6 12.4A6 6 0 0 1 6 14.4c0-3 1.9-4.5 2.9-7 .6 2.4 1.6 3.4 2.5 3.9C10.9 8.3 11.2 5 12 2z'], ['l', 'M12 12.5c.5 2 2.6 3 2.6 5.1a2.6 2.6 0 0 1-5.2 0c0-1.3.8-2 1.3-3 .3.9.6 1.3 1 1.5-.1-1.2.1-2.5.3-3.6z']],
  gg: [['f', 'M2.5 6A3 3 0 0 1 5.5 3h13a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3z'], ['t', 'M10.6 9.2A3.4 3.4 0 1 0 11 12.6H8.6'], ['t', 'M18.2 9.2a3.4 3.4 0 1 0 .4 3.4h-2.4']],
  f: [['f', 'M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z'], ['l', 'M8 6h8.5v3H11v2h4.5v3H11v4.5H8z'], ['g', 'M18 13.5c.9 1.5 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.5 1.4-3z']],
  nervio: [['f', 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z'], ['l', 'M8.6 9.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM15.4 9.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z'], ['t', 'M7.8 16.2q1.4-1.2 2.8 0t2.8 0 2.8 0'], ['g', 'M19 3.5c.9 1.5 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.5 1.4-3z']],
  ojos: [['l', 'M7 6.5c2.5 0 4 2.5 4 5.5s-1.5 5.5-4 5.5S3 15 3 12s1.5-5.5 4-5.5zM17 6.5c2.5 0 4 2.5 4 5.5s-1.5 5.5-4 5.5-4-2.5-4-5.5 1.5-5.5 4-5.5z'], ['f', 'M8.2 10a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM18.2 10a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8z']],
  copa: [['f', 'M7 3.5h10V8c0 3-2 5-4.2 5.4v3.1h2.7V19h-7v-2.5h2.7v-3.1C9 13 7 11 7 8z'], ['t', 'M7 5.5H4.5c0 3 1.2 4.5 3 4.8M17 5.5h2.5c0 3-1.2 4.5-3 4.8']],
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
  const az = crearAzar(`tx-chat-${semilla}`);
  const NOMBRES = ['tito', 'nacho', 'lu', 'sofi', 'beto', 'gabi', 'duda', 'caio', 'rafa', 'mel', 'juanma', 'bia', 'teo', 'pipe', 'lara', 'vini', 'flor', 'gui', 'cami', 'tomi', 'pato', 'ana', 'leo', 'nina'];
  const COLAS = ['_br', '99', 'gg', '.mid', 'zinho', '777', '_lol', '', '2k', 'tv', '_ok', 'xd', '10'];
  const usuarios = Array.from({ length: CHAT_TX.usuarios }, () => ({
    nombre: `${az.elegir(NOMBRES)}${az.elegir(COLAS)}`,
    color: az.entero(1, CHAT_TX.colores),
    meses: az.elegir(MESES_SUB),
    mod: az.siguiente() < 0.06,
    vip: az.siguiente() < 0.08,
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
    `${d.rec.v}-${d.rec.d} y al Bo1, no puedo mirar`, `vamos ${d.org}`, `${ORG} ${ORG} :garra:`, 'tres y pasás, tres y a casa', `${d.handle} en vos confío`,
    'me transpiran las manos :nervio:', `${d.rival} es duro pero se puede`, 'ahora o nunca', ':vamo: :vamo:', d.verdugo ? `lo de ${d.verdugo} ya fue, cabeza en esto` : 'cabeza fría',
    `${d.camara} o nada`, 'mi vieja pregunta qué es un Swiss', 'no respiro :nervio:', ':fe:', 'si pasamos me tatúo el logo', 'vida o muerte literal',
    d.ligaRival ? `${d.ligaRival} vs ${d.ligaPropia || 'nosotros'}, historia pura` : 'historia pura', ':ojos: :ojos:', `${d.sigla} a cuartos, lo siento en el pecho :fe:`,
    ...(d.cruces[0] ? [`${d.cruces[0][0]}–${d.cruces[0][1]} también se define ahora`] : []), 'el que pierde se va, así de simple', `${d.camara} en mid, confío`,
  ]);
  const juego = mazo(['VAMOOO', 'dale dale dale', 'no no no', 'esa pelea…', ':fe: :fe:', 'mirá ese flank', `${d.handle} jugando con el alma`, 'tranqui tranqui', 'el baron…', ':nervio:', ':ojos:', `${d.camara} :garra:`]);
  const furia = mazo([`${ORG} ${ORG}`, `${ORG} ${ORG} :garra:`, ':garra: :garra: :garra:', `VAMOS ${ORG}`, `${d.handle.toUpperCase()} ${d.handle.toUpperCase()}`, `${ORG} :vamo:`, `:vamo: ${ORG} :vamo:`]);
  const consejos = {
    charla: mazo(['QUE HABLE EL COACH', 'charla YA :fe:', 'es ahora o nunca, que hable', 'la charla es para el 2-2, obvio', 'para qué la guardás si te vas a casa :nervio:', 'coach, decí algo']),
    sinCharla: mazo(['guardala para cuartos', `confío sin charla :garra:`, 'si pasan, la charla en cuartos vale oro', 'arriesgado eh :nervio:', 'salen así y listo', 'sin charla, puro corazón']),
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
        el('p', { class: 'tx-msg-t' }, partesConEmotes(x.texto)),
      ]);
    }
    if (x.destacado) {
      return el('li', { class: 'tx-msg tx-msg-destacado', 'data-alto': '2' }, [
        el('p', { class: 'tx-msg-k', text: 'Mensaje destacado' }),
        el('p', {}, [...ins, el('b', { class: `tx-c${u.color}`, text: u.nombre }), ' ', ...partesConEmotes(x.texto)]),
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
    el('footer', { class: 'tx-chat-pie' }, [el('span', { text: 'Mandá un mensaje' }), el('span', { class: 'tx-chat-em', 'aria-hidden': 'true' }, [emote('garra'), emote('fe'), emote('gg')]), el('kbd', { text: 'Enter' })]),
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
    // la lista esta anclada abajo: para que el ultimo visible sea el i, se corre hacia abajo lo que mide lo de despues
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
      // "FURIA FURIA": la rafaga de entrada
      let t = 80;
      for (let i = 0; i < 12; i++, t += az.entre(70, 130)) items.push(de(furia, t));
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
    // despues de elegir: lo ultimo que se veia queda, el Bo1, la pared (F o GG) y el fin de la transmision
    const ahora = reloj();
    const vistos = items.filter((x) => x.t <= ahora).slice(-CHAT_TX.inicial).map((x) => ({ ...x, t: 0 }));
    items = vistos;
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
    items.push({ t: t + 500, sistema: true, texto: fuera ? 'Fin de la transmisión · gracias por mirar' : 'La transmisión sigue en los cuartos de final' });
    render(0);
    modo.textContent = 'modo lento: sí';
  }
  // los consejos al apuntar una opcion (en vivo): entran ya, en una rafaga
  function rafaga(id) {
    if (fase !== 'antes' || !consejos[id]) return;
    const ahora = quieto() ? Math.max(0, ...items.map((x) => x.t)) + 1 : reloj();
    for (let i = 0; i < CHAT_TX.rafaga; i++) items.push(de(consejos[id], ahora + 40 + i * CHAT_TX.gapRafaga));
    render(ahora);
  }
  return { nodo, guion, rafaga, destruir: () => animacion?.cancel() };
}
