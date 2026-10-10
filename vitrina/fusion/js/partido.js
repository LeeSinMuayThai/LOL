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
