// El ambiente de A · LUZ. Implementa el contrato de comun/ambiente.md:
//   crearAmbiente(contenedor, { meta }) -> { ambiente({ era, animo, arte }), pulso, congelar, pausar, reanudar, destruir }
// Extras propios (opcionales, nadie esta obligado a usarlos): ambiente({ ..., encuadre, velo, apuntado }), aquietar(si),
// reloj(), y fotografiar() para la tira de eras.
// La intensidad del mundo (PLANUI §4.6) la decide la politica de js/fondo.js: fondo({ politica, lugar }) la fija por
// pantalla, y las pantallas declaran hechos con momento({ retardo, dura }) y takeover(retardo). El ambiente convierte
// cada estado de la politica en uniformes (presencia, profundidad, bruma, vineta, contraste, desenfoque y el lugar), como
// funcion del reloj: congelar(t) tambien fotografia la intensidad del instante t.
//
// WebGL2: un fragment shader a pantalla completa (escala 0,5, <= 30 fps, 2 texturas) dibuja la bruma (fbm), los haces
// volumetricos desde la fuente de la era, la luz de contra, el polvo que solo brilla adentro del haz, el bokeh del
// publico, los tubos de la sala de practica o el resplandor del monitor; el splash del campeon entra en duotono (sombras
// = noche, luces = luz de la era) y se mezcla en "pantalla" con la luz: vive adentro del haz, no en un recuadro.
// Todo el estado es funcion del reloj del ambiente, asi congelar(t) dibuja exactamente el instante t.
// Sin WebGL (data-sin-webgl, sin contexto o contexto perdido): capas CSS radiales + haces con conic-gradient + el arte
// en duotono por canvas 2D.
import { cargarImagen, urlCentrada } from '../../comun/arte.js';
import { crearAzar } from '../../comun/azar.js';
import { leerColor, reducido, inst, el } from './util.js';
import { ESTADO_PLENO, TIEMPOS, mezclarEstados } from './fondo.js';
import { pintarCampeon } from './color.js';

export const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
const ANIMOS = ['normal', 'peligro', 'gloria', 'caida'];
export const PULSOS = { elegir: 0.45, logro: 0.7, golpe: 1, peligro: 0.8, gloria: 1, cambio: 0.32, apuntar: 0.12 };
const T_ERA = 1300;
const T_ARTE = 900;
export const T_AURA = 750; // el cruce del aura (foco de campeon): 600-900 ms
const T_QUIEBRE = 420; // la luz que se quiebra un instante ("te leyeron")
const VIVO_EN_CALMA = 0.2; // el splash vivo "respira" en las paradas
const T_CALMA = 800;
const T_ANIMO = 900;
const T_PULSO = 380;
// (PLANUI §4.9, U) Los pulsos se superponen: uno nuevo no corta la cola del anterior. Y no pasan de 3 destellos por
// segundo: dos arranques quedan a SEP_PULSO como minimo (el margen de beats.js). Uno mas debil (o igual) que el que ya
// esta cerca se funde en el; uno mas fuerte lo reemplaza si todavia no arranco, o espera su turno si ya arranco.
const SEP_PULSO = 335;
const MAX_PULSOS = 8;
const PULSO_TOPE = Math.max(...Object.values(PULSOS));
// Donde entra un pulso nuevo en `lista` ({ t, k }): { t } (un arranque nuevo), { subir: p } (sube el k de p) o null.
export function ubicarPulso(lista, t, k, ahora) {
  for (let i = 0; i <= lista.length; i++) {
    const choca = lista.find((p) => Math.abs(p.t - t) < SEP_PULSO);
    if (!choca) return { t };
    if (k <= choca.k) return null;
    if (choca.t > ahora) return { subir: choca };
    t = choca.t + SEP_PULSO;
  }
  return null;
}
// La suma de los pulsos en t (con el tope de un pulso solo: superponerlos no da un destello mas fuerte que el mayor).
export function pulsoEn(lista, t) {
  let s = 0;
  for (const p of lista) if (t >= p.t) s += p.k * Math.exp(-(t - p.t) / T_PULSO);
  return Math.min(PULSO_TOPE, s);
}
// el camino quieto: movimiento reducido o INST
const quieto = () => reducido() || inst();
const FPS_MAX = 30;
const ESCALA = 0.5; // la luz (bruma, haces, polvo), en escala de la pantalla
const ESCALA_ARTE = 1; // el arte del campeon se compone a resolucion nativa (PLANUI §4.7: el fondo nitido)
const LUZ_REL = ESCALA / ESCALA_ARTE;
const REPOSO_REDUCIDO = 6000; // instante fijo que se dibuja con movimiento reducido
const PARALLAX_PX = 8;
// La fusion de hoy en uniformes (la politica `pleno`): identidad en el shader.
const I_PLENO = [1, 1, 0, 0];
const J_PLENO = [1, 0, 1, 0];
const K_PLENO = [1, 1, 1, 0];
const C_DUOTONO = [0, 0, 0, 0];
const REC_NADA = [0, 0, 0, 0];
const MAX_EVENTOS = 32;
const T_CRUCE_MAPA = 380; // el cruce de un campeon al siguiente cuando un momento trae los suyos (los mapas)
const DESENFOQUE_CSS = 14; // px de desenfoque del arte sin WebGL con `suave` = 1
// PLANUI §4.9, la costura: el angulo por defecto (grados respecto de la vertical) y donde cae la cara de cada lado
// (COS_CARA: la fraccion de su mitad, desde el borde; COS_Y: la altura de la cara; COS_ALTO: el alto del arte; en el
// celular, cada mitad es la mitad de alto: el arte mas chico)
const ANGULO_COSTURA = 12;
const COS_CARA = 0.52;
const COS_Y = 0.6;
const COS_ALTO = 1;
const COS_ALTO_CEL = 0.62;
// (PLANUI §4.9, A) `costura.marco`: la costura adentro de un rectangulo de la pantalla ({ x, y, w, h } en fracciones,
// desde arriba a la izquierda, como el CSS): el video del Swiss. Las caras, el alto del arte y el punto por donde pasa
// la linea se calculan adentro del marco; sin marco (o con el de toda la pantalla) la cuenta es exactamente la de antes.
const MARCO_TODO = Object.freeze({ x: 0, y: 0, w: 1, h: 1 });
const leerMarco = (m) => (m && [m.x, m.y, m.w, m.h].every(Number.isFinite) && m.w > 0 && m.h > 0 ? { x: m.x, y: m.y, w: m.w, h: m.h } : MARCO_TODO);
const mezclarMarco = (a = MARCO_TODO, b = MARCO_TODO, k) => (a === b ? a : { x: mezclar(a.x, b.x, k), y: mezclar(a.y, b.y, k), w: mezclar(a.w, b.w, k), h: mezclar(a.h, b.h, k) });
// los encuadres de la costura (uv, y hacia arriba) llevados de toda la pantalla al marco
function enMarco(mc, m) {
  if (m === MARCO_TODO) return mc;
  const lleva = (x) => ({ x: m.x + m.w * x.x, y: 1 - m.y - m.h + m.h * x.y, alto: x.alto * m.h, op: x.op });
  return { a: lleva(mc.a), b: lleva(mc.b) };
}
// el `posicion` que entiende el shader (la linea pasa por (pos, 0,5) en escritorio y por (0,5, 1 - pos) en el celular)
// para que, con marco, pase por el punto de la costura adentro del marco. asp: ancho / alto del lienzo.
function posLinea(pos, grados, vertical, m, asp) {
  if (m === MARCO_TODO) return pos;
  const tg = Math.tan((grados * Math.PI) / 180);
  if (vertical) return m.y + m.h * pos + (m.x + m.w * 0.5 - 0.5) * asp * tg;
  return m.x + m.w * pos - (0.5 - m.y - m.h * 0.5) * (tg / asp);
}
// (PLANUI §4.9, U) `costura.caras`: donde caen las caras, para encuadrarlas en una franja de la pantalla (la decision:
// entre los destinos y el panel). { a: { x, y }, b: { x, y }, alto }: el punto de cada cara y el alto del arte, en
// fracciones de la pantalla (o del marco, si hay) y desde ARRIBA, como lo que devuelve costura(). Cada cara se queda de
// su lado: si la linea le pasa a menos de COS_MIN, la empuja. Se hereda entre llamadas, como la posicion (`caras: null`
// la saca); al cambiar, cruza con el resto. Sin `caras`, la cuenta de siempre (COS_CARA, COS_Y, COS_ALTO).
const COS_MIN = 0.04;
const leerPunto = (p) => (p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : null);
const leerCaras = (c) => {
  const a = leerPunto(c?.a);
  const b = leerPunto(c?.b);
  return a && b && Number.isFinite(c.alto) && c.alto > 0 ? { a, b, alto: c.alto } : null;
};
const mezclarPunto = (p, q, k) => ({ x: mezclar(p.x, q.x, k), y: mezclar(p.y, q.y, k) });
const mezclarCaras = (x, y, k) => (!y ? null : !x ? y : { a: mezclarPunto(x.a, y.a, k), b: mezclarPunto(x.b, y.b, k), alto: mezclar(x.alto, y.alto, k) });
// Las caras de los dos lados (uv, y hacia arriba) adentro de la caja de la costura (toda la pantalla o el marco). asp:
// ancho / alto de esa caja. La linea es la del shader: en escritorio pasa por (pos, 0,5) y en el celular por (0,5, 1 - pos).
function carasCostura(pos, vertical, grados, asp, caras) {
  if (!caras) {
    return vertical
      ? { a: { x: 0.5, y: 1 - pos * 0.5, alto: COS_ALTO_CEL, op: 1 }, b: { x: 0.5, y: (1 - pos) * 0.5, alto: COS_ALTO_CEL, op: 1 } }
      : { a: { x: pos * COS_CARA, y: COS_Y, alto: COS_ALTO, op: 1 }, b: { x: pos + (1 - pos) * (1 - COS_CARA), y: COS_Y, alto: COS_ALTO, op: 1 } };
  }
  const tg = Math.tan((grados * Math.PI) / 180);
  const alto = caras.alto;
  if (vertical) {
    // la altura de la linea (uv, hacia arriba) en cada x; A queda arriba y B abajo
    const linea = (x) => 1 - pos + (x - 0.5) * asp * tg;
    const ya = 1 - caras.a.y;
    const yb = 1 - caras.b.y;
    return { a: { x: caras.a.x, y: Math.max(ya, linea(caras.a.x) + COS_MIN), alto, op: 1 }, b: { x: caras.b.x, y: Math.min(yb, linea(caras.b.x) - COS_MIN), alto, op: 1 } };
  }
  // la x de la linea en cada altura (uv); A queda a la izquierda y B a la derecha
  const linea = (y) => pos + ((y - 0.5) * tg) / asp;
  const ya = 1 - caras.a.y;
  const yb = 1 - caras.b.y;
  return { a: { x: Math.min(caras.a.x, linea(ya) - COS_MIN), y: ya, alto, op: 1 }, b: { x: Math.max(caras.b.x, linea(yb) + COS_MIN), y: yb, alto, op: 1 } };
}

// La escena de cada era (sin colores: salen de --luz-<era> y --contra-<era>).
const ESCENAS = {
  pieza: { fuente: [0.86, 1.06], abanico: 0.5, bruma: 0.5, polvo: 0.32, bokeh: 0, tubos: 0, monitor: 1, contra: [0.99, 0.74], brillo: 0.9, haces: 0.35, cruce: 0, rim: 1.2, contraF: 2.6, brasas: 0.15 },
  academia: { fuente: [0.62, 1.14], abanico: 0.85, bruma: 0.35, polvo: 0.22, bokeh: 0, tubos: 1, monitor: 0, contra: [0.04, 0.5], brillo: 0.9, haces: 0.5, cruce: 0, rim: 0, contraF: 1, brasas: 0.1 },
  escenario: { fuente: [0.74, 1.2], abanico: 0.95, bruma: 0.95, polvo: 0.6, bokeh: 1.6, tubos: 0, monitor: 0, contra: [1.0, 0.5], brillo: 1.3, haces: 1.35, cruce: 0.9, rim: 1.2, contraF: 2.2, brasas: 0.45 },
  mundial: { fuente: [0.6, 1.24], abanico: 1.3, bruma: 0.95, polvo: 1, bokeh: 0.7, tubos: 0, monitor: 0, contra: [0.2, 1.06], brillo: 1.1, haces: 1, cruce: 0, rim: 0, contraF: 1, brasas: 1 },
  leyenda: { fuente: [1.08, 0.34], abanico: 0.8, bruma: 0.6, polvo: 0.45, bokeh: 0.12, tubos: 0, monitor: 0, contra: [-0.05, 0.16], brillo: 0.9, haces: 0.8, cruce: 0, rim: 0, contraF: 1, brasas: 0.7 },
};
// Donde vive el arte: el punto de la pantalla (uv, y hacia arriba) donde cae el FOCO del campeon (su cara), el alto
// relativo a la pantalla y la opacidad. El foco de cada splash centrado vive en FOCO (coordenadas de la imagen, y abajo).
export const ENCUADRES = {
  derecha: { x: 0.79, y: 0.75, alto: 1.02, op: 1 },
  eras: { x: 0.614, y: 0.748, alto: 1.18, op: 1 },
  inicio: { x: 0.733, y: 0.752, alto: 1.2, op: 1 },
  cumbre: { x: 0.672, y: 0.762, alto: 1.25, op: 0.9 },
  carta: { x: 0.276, y: 0.731, alto: 1.1, op: 0.35 },
  partido: { x: 0.8, y: 0.79, alto: 0.98, op: 1 },
  swiss: { x: 0.74, y: 0.78, alto: 1.16, op: 0.95 },
  firma: { x: 0.7, y: 0.76, alto: 1.2, op: 0.95 },
  centro: { x: 0.476, y: 0.731, alto: 1.1, op: 0.85 },
  // (fusion) la ventana del draft: la cara cae en el escenario, entre los dos equipos
  draft: { x: 0.56, y: 0.6, alto: 0.95, op: 1 },
  // (fusion) la Tribuna: el "video" ocupa el player, a la izquierda del chat
  tribuna: { x: 0.42, y: 0.66, alto: 1.15, op: 1 },
  celular: { x: 0.462, y: 0.825, alto: 0.5, op: 0.9 },
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const suave = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(x)));
const mezclar = (a, b, k) => a + (b - a) * k;
const mezclarV = (a, b, k) => a.map((v, i) => mezclar(v, b[i], k));
export const FOCO = { Sylas: [0.48, 0.3], Yone: [0.48, 0.27] };
const FOCO_DEF = [0.48, 0.29];
// (PLANUI §4.10, T) EL SUSPENSO, ambiente({ suspenso }): unos segundos que se construyen antes de un resultado (el mapa
// decisivo). Opcional y aditivo: sin el campo, nada cambia. La pantalla arma las curvas (muestras parejas en `dura`, desde
// el `retardo` de la llamada) y el ambiente las lee con su reloj, asi congelar(t) dibuja fiel cualquier instante; afuera
// de su rato no hace nada, null lo apaga y con INST o movimiento reducido no corre. El WebGL lo dibuja; sin WebGL se ignora.
//   { dura,                   // ms
//     vaiven: [d, ...],       // cuanto se corre la costura (fraccion de su caja, + hacia B): el tira y afloje
//     tonos: [w, ...],        // la luz entre los dos tonos (-1 = la de A, 1 = la de B)
//     publico: [k, ...],      // cuanto mas se encienden los lightsticks (0-1)
//     latidos: [[ms, k], ...] } // pulsos propios (desde el arranque): laten la linea y la luz, sin ocupar la lista de
//                               // pulso() (la pantalla los pasa ya separados por beats.destello: <= 3 por segundo)
// T_LATIDO: lo que tarda en apagarse un latido; LATIDO_LUZ: cuanto de cada latido va a la luz del mundo (el resto, a la
// linea de la costura).
const T_LATIDO = 240;
const LATIDO_LUZ = 0.5;
const curvaDe = (c) => (Array.isArray(c) && c.length && c.every(Number.isFinite) ? c : null);
function curvaEn(c, u) {
  if (!c) return 0;
  const x = clamp01(u) * (c.length - 1);
  const i = Math.floor(x);
  return mezclar(c[i], c[Math.min(c.length - 1, i + 1)], x - i);
}
function leerSuspenso(s, t) {
  if (!s || !(s.dura > 0)) return null;
  const latidos = (Array.isArray(s.latidos) ? s.latidos : []).filter((x) => Array.isArray(x) && Number.isFinite(x[0]) && Number.isFinite(x[1]));
  return { t, dura: s.dura, vaiven: curvaDe(s.vaiven), tonos: curvaDe(s.tonos), publico: curvaDe(s.publico), latidos };
}
const focoDe = (key) => FOCO[key] ?? FOCO_DEF;

function colores() {
  const c = { vacio: leerColor('--bg-void'), noche: leerColor('--bg-surface'), oro: leerColor('--gold'), blanco: leerColor('--luz-blanca') };
  for (const e of ERAS) c[e] = { luz: leerColor(`--luz-${e}`), contra: leerColor(`--contra-${e}`) };
  return c;
}
function paramsDeEra(era, col) {
  const s = ESCENAS[era];
  return {
    a: [s.fuente[0], s.fuente[1], s.abanico, s.bruma],
    b: [s.polvo, s.bokeh, s.tubos, s.monitor],
    c: [s.contra[0], s.contra[1], s.brillo, s.haces],
    e: [s.cruce, s.rim, s.contraF, s.brasas],
    luz: col[era].luz,
    contra: col[era].contra,
    // PLANUI §4.9: la noche y el vacio tambien son de la paleta (sin paleta, los de siempre)
    noche: col.noche,
    vacio: col.vacio,
  };
}
function mezclarParams(p, q, k) {
  return { a: mezclarV(p.a, q.a, k), b: mezclarV(p.b, q.b, k), c: mezclarV(p.c, q.c, k), e: mezclarV(p.e, q.e, k), luz: mezclarV(p.luz, q.luz, k), contra: mezclarV(p.contra, q.contra, k), noche: mezclarV(p.noche, q.noche, k), vacio: mezclarV(p.vacio, q.vacio, k) };
}
const celularAhora = () => matchMedia('(max-width: 640px)').matches;

// ----------------------------------------------------------------------------------------------------------------------
// La intensidad del mundo como funcion del reloj: un estado inicial y una lista de cruces programados { t, hacia, dur }.
// `hacia` es un estado de la politica por nombre ('reposo', 'aura', 'momento', 'takeover', 'base') o un estado literal;
// se resuelve al evaluar, asi un momento que vuelve "a la base" vuelve al takeover si este ya empezo.
// ----------------------------------------------------------------------------------------------------------------------
function crearIntensidad() {
  let pol = { reposo: ESTADO_PLENO, aura: ESTADO_PLENO, momento: ESTADO_PLENO, takeover: ESTADO_PLENO, lugar: null };
  let base = ESTADO_PLENO;
  let eventos = [];
  let takeoverDesde = Infinity;
  const resolver = (h, t) => (typeof h === 'object' ? h : h === 'base' ? (t >= takeoverDesde ? pol.takeover : pol.reposo) : pol[h] ?? pol.reposo);
  const valorSeg = (seg, t) => (seg.dur <= 0 ? resolver(seg.hacia, seg.t) : mezclarEstados(seg.desde, resolver(seg.hacia, seg.t), suave((t - seg.t) / seg.dur)));
  // el segmento vigente en t (y su indice), con el valor desde el que arranca
  function vigente(t) {
    let seg = null;
    let i = -1;
    for (let k = 0; k < eventos.length && eventos[k].t <= t; k++) {
      seg = { ...eventos[k], desde: seg ? valorSeg(seg, eventos[k].t) : base };
      i = k;
    }
    return { seg, i };
  }
  const en = (t) => {
    const { seg } = vigente(t);
    return seg ? valorSeg(seg, t) : base;
  };
  function programar(hacia, t, dur) {
    const e = { t, hacia, dur: inst() || reducido() ? 0 : Math.max(0, dur) };
    const k = eventos.findIndex((x) => x.t > t);
    if (k < 0) eventos.push(e);
    else eventos.splice(k, 0, e);
    if (eventos.length > MAX_EVENTOS) {
      // se olvida lo que ya paso: el segmento vigente arranca desde su valor de inicio
      const { seg, i } = vigente(t);
      if (seg && i > 0) {
        base = seg.desde;
        eventos = eventos.slice(i);
      }
    }
  }
  return {
    en,
    get politica() {
      return pol;
    },
    // otra politica (otra pantalla u otra variante): se cruza desde donde esta hacia su reposo
    fijar(p, t, dur) {
      base = en(t);
      eventos = [];
      takeoverDesde = Infinity;
      pol = p;
      programar('reposo', t, dur);
    },
    programar,
    momento(t, dura) {
      programar('momento', t, TIEMPOS.sube);
      programar('base', t + dura, TIEMPOS.vuelta);
    },
    takeover(t) {
      takeoverDesde = Math.min(takeoverDesde, t);
      programar('takeover', t, TIEMPOS.sube);
    },
    // saltar: lo programado se resuelve ya (sube rapido, o vuelve a la luz en ~2 s)
    resolverYa(t) {
      if (!eventos.some((e) => e.t > t)) return;
      const ultimo = eventos[eventos.length - 1];
      if (takeoverDesde > t && takeoverDesde < Infinity) takeoverDesde = t;
      const hacia = resolver(ultimo.hacia, Math.max(t, ultimo.t));
      const ahora = en(t);
      base = ahora;
      eventos = [];
      programar(hacia, t, hacia.presencia + hacia.enLugar >= ahora.presencia + ahora.enLugar ? TIEMPOS.sube : TIEMPOS.vuelta);
    },
  };
}

// ======================================================================================================================
// Shader, en dos pasadas (PLANUI §4.7: "que el fondo tenga mas calidad")
// ----------------------------------------------------------------------------------------------------------------------
// Por que dos: el splash salia blando y con dientes. Tres causas, medidas:
//   1. todo se pintaba a escala 0,5 y el navegador lo estiraba x2: el arte de 720 px de alto quedaba en ~430 y volvia a
//      crecer (papilla);
//   2. la textura no tenia mipmaps: al achicarla a la mitad, las lineas finas y brillantes (la energia de Sylas)
//      saltaban de un texel a otro (dientes), y el duotono, que dispara la luz de contra en los brillos, los marcaba;
//   3. el "vivo" desplazaba cada pixel segun SU luminancia: dos pixeles vecinos de luz distinta se corrian distinto y el
//      borde se rasgaba.
// Ahora: la LUZ (bruma, haces, polvo, la escena; lo blando y lo caro) se pinta a escala 0,5 en dos texturas, y el ARTE
// se compone a resolucion nativa encima, leyendo esa luz. La textura del arte lleva mipmaps (textureLod con el nivel de
// su escala) y la profundidad 2,5D y el flujo del vivo salen de un nivel borroso del mip: un campo suave, que ya no
// rasga los bordes. La luz no cambia ni un tono: es la misma cuenta, partida en dos.
// ======================================================================================================================
const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

// Lo comun a las dos pasadas: los uniformes y el ruido.
const COMUN = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uT, uTL, uSemilla;
uniform vec3 uVacio, uNoche, uLuz, uContra, uOro, uBlanco;
uniform vec4 uA, uB, uC, uD, uE;
uniform vec4 uF; // x: vivo (el splash como plano vivo), y: caida (la luz que cae), z: quiebre (la luz que se quiebra)
// La politica del mundo (js/fondo.js). Con la fusion de hoy (pleno) todo es identidad: uI = (1,1,0,0), uJ = (1,0,1,0).
uniform vec4 uI; // x: presencia del campeon a pantalla completa, y: profundidad (2,5D), z: bruma extra, w: vineta extra
uniform vec4 uJ; // x: contraste del duotono, y: desenfoque, z: presencia adentro del lugar, w: cuanto pesa el lugar (0-1)
uniform vec4 uK; // x: haces (1 = los de hoy), y: polvo (1 = el de hoy), z: la luz de contra (1 = la de hoy)
uniform vec4 uS; // la arena (PLANUI §4.7, op=escenario): x: cuanto (0-1), y: el alto del publico (uv), z: los cabezales
                 // (1 = los de §4.7; §4.8 los baja y los aquieta), w: el publico del shader (0 en §4.8: lo dibuja el DOM)
uniform float uEsc; // la escala con la que se guarda la luz (1 con texturas de medio flotante, 2 con 8 bits)
// PLANUI §4.9, la costura: dos mundos enfrentados, una diagonal de luz y cada mitad en su tono. El lado A usa los colores
// de siempre (uLuz/uContra/uNoche/uVacio: la paleta, que con la costura es el tono de A) y el arte de las ranuras 0/1;
// el lado B, su juego de colores y su ranura propia.
uniform vec4 uCos;  // x: presencia (0 = apagada), y: posicion (0-1), z: angulo (rad, respecto de la vertical), w: 1 = celular
uniform vec4 uCosF; // donde cae la cara de cada lado (uv, y hacia arriba): xy = A, zw = B
uniform vec3 uLuzB, uContraB, uNocheB, uVacioB;
uniform vec4 uL;    // x: el publico en lightsticks (bokeh del tono, abajo), 0-1
                    // (PLANUI §4.10, T) el suspenso, 0 sin el: y el publico que se enciende, z el latido de la linea,
                    // w la luz entre los dos tonos (-1 = la de A, 1 = la de B)
// los colores de ESTE pixel: los de siempre, o con la costura los de su lado
vec3 gLuz, gContra, gNoche, gVacio;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * ruido(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
// La costura: x = distancia firmada a la linea (en altos de pantalla; > 0 = lado B), y = la posicion a lo largo de la
// linea (0 en el centro). La linea deriva despacio (dos ondas lentas), igual en las dos pasadas.
vec2 costura(vec2 uv, float asp, float t) {
  vec2 p = vec2(uv.x * asp, uv.y);
  float a = uCos.z;
  vec2 c, n, v;
  if (uCos.w > 0.5) { c = vec2(0.5 * asp, 1.0 - uCos.y); v = vec2(cos(a), sin(a)); n = vec2(sin(a), -cos(a)); }
  else { c = vec2(uCos.y * asp, 0.5); v = vec2(sin(a), cos(a)); n = vec2(cos(a), -sin(a)); }
  float s = dot(p - c, v);
  float d = dot(p - c, n) + sin(s * 2.3 + t * 0.21) * 0.006 + sin(s * 6.1 - t * 0.33) * 0.0022;
  return vec2(d, s);
}
// hacia donde queda la costura desde un pixel (en uv): el lado A mira a +n, el B a -n
vec2 haciaCostura(float d, float asp) {
  float a = uCos.z;
  vec2 n = uCos.w > 0.5 ? vec2(sin(a), -cos(a)) : vec2(cos(a), -sin(a));
  n *= d > 0.0 ? -1.0 : 1.0;
  return normalize(vec2(n.x / asp, n.y));
}
`;

// Primera pasada (escala 0,5): la luz del mundo, en dos texturas.
//   oFondo  = la luz detras del campeon (rgb) y el "campo" (cuanto lo ilumina el haz, / 1,3)
//   oFrente = lo que va por delante del campeon (la bruma extra, el polvo cercano, las brasas) y la niebla (para la gloria)
const FRAG_LUZ = `${COMUN}
layout(location = 0) out vec4 oFondo;
layout(location = 1) out vec4 oFrente;

float haces(vec2 p, vec2 src, vec2 base, float abanico, float t) {
  vec2 d = p - src; float dist = length(d);
  float ang = atan(d.x, d.y) - atan(base.x, base.y);
  ang = mod(ang + 3.14159, 6.28318) - 3.14159;
  float s = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float a0 = (fi - 3.0) * abanico * 0.15 + sin(t * 0.21 + fi * 1.9 + uSemilla) * 0.035;
    float w = 0.018 + 0.032 * h21(vec2(fi, uSemilla));
    float k = 0.4 + 0.6 * h21(vec2(fi * 3.1, uSemilla + 1.0));
    s += k * exp(-pow((ang - a0) / w, 2.0));
  }
  return s * smoothstep(2.4, 0.15, dist);
}
float polvo(vec2 p, float t) {
  float s = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float esc = 14.0 + fk * 13.0;
    vec2 q = p * esc + vec2(t * (0.05 + fk * 0.02), t * (0.16 + fk * 0.06)) * esc * 0.1;
    vec2 id = floor(q); vec2 f = fract(q) - 0.5;
    float r = h21(id + fk * 17.3 + uSemilla);
    vec2 o = vec2(h21(id + 3.1), h21(id + 5.7)) - 0.5;
    float tam = 0.05 + 0.08 * h21(id + 9.3);
    s += step(0.84, r) * smoothstep(tam, 0.0, length(f - o * 0.6)) * (0.55 + 0.45 * sin(t * 1.7 + r * 40.0)) * (1.0 - fk * 0.22);
  }
  return s;
}
vec3 bokeh(vec2 p, vec2 uv, float t) {
  vec3 s = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float esc = 6.0 + fk * 5.0;
    vec2 q = p * esc + vec2(t * 0.025 * (1.0 + fk), 0.0);
    vec2 id = floor(q); vec2 f = fract(q) - 0.5;
    float r = h21(id + 31.7 * fk + uSemilla);
    vec2 o = (vec2(h21(id + 1.3), h21(id + 7.1)) - 0.5) * 0.5;
    float rad = 0.16 + 0.2 * h21(id + 4.4);
    float c = smoothstep(rad, rad - 0.05, length(f - o));
    vec3 tinte = mix(gLuz, gContra, step(0.8, r));
    s += tinte * c * step(0.5, r) * (0.3 + 0.7 * h21(id + 2.2)) * (0.65 + 0.35 * sin(t * 0.8 + r * 30.0));
  }
  return s * smoothstep(0.46, 0.0, uv.y);
}
float tubos(vec2 uv, float t) {
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float y = 0.93 - fi * 0.07;
    float x0 = 0.1 + fi * 0.24 + 0.06 * h21(vec2(fi, 2.0));
    float x1 = x0 + 0.24 + 0.1 * h21(vec2(fi, 5.0));
    float seg = smoothstep(x0, x0 + 0.006, uv.x) * smoothstep(x1, x1 - 0.006, uv.x);
    float dy = uv.y - y;
    float titila = 0.82 + 0.18 * step(0.08, h21(vec2(floor(t * 9.0), fi)));
    float cx = (x0 + x1) * 0.5; float hw = (x1 - x0) * 0.5;
    s += (seg * (exp(-dy * dy * 20000.0) * 1.4 + exp(-dy * dy * 160.0) * 0.18) + exp(-pow((uv.x - cx) / (hw * 1.3), 2.0) - pow(dy * 5.0, 2.0)) * 0.1) * titila;
  }
  return s;
}
float monitor(vec2 uv, float asp) {
  vec2 d = (uv - vec2(0.66, -0.08)) * vec2(asp * 0.75, 1.25);
  return exp(-dot(d, d) * 2.0);
}
// Brasas que suben (por delante del campeon), segun la era.
float brasas(vec2 p, float t) {
  float s = 0.0;
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float esc = 6.0 + fk * 5.0;
    vec2 q = p * esc + vec2(sin(t * 0.3 + fk * 2.0) * 0.5, -t * (0.32 + fk * 0.14));
    vec2 id = floor(q); vec2 f = fract(q) - 0.5;
    float r = h21(id + fk * 11.0 + uSemilla);
    vec2 o = vec2(h21(id + 2.7), h21(id + 8.1)) - 0.5;
    s += step(0.88, r) * smoothstep(0.075 + fk * 0.03, 0.0, length(f - o * 0.6)) * (0.45 + 0.55 * sin(t * 2.1 + r * 50.0)) * (1.0 - fk * 0.35);
  }
  return s;
}
// La arena (op=escenario): los cabezales moviles colgados del techo, en la paleta del torneo. Cada uno un cono que
// barre despacio; la niebla los vuelve volumen. "haces" (PLANUI §4.8): 1 = los de §4.7; menos = mas bajos y casi
// quietos (el barrido cae con el cuadrado: a 0,3 queda en un 18 %), luz de ambiente y no de recital.
vec3 cabezales(vec2 uv, float asp, float t, float niebla, float haces) {
  vec3 s = vec3(0.0);
  float barrido = 0.1 + 0.9 * haces * haces;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 src = vec2((0.08 + fi * 0.168) * asp, 1.04);
    float ang = (fi - 2.5) * 0.11 + sin(t * (0.23 + 0.04 * fi) * barrido + fi * 1.7 + uSemilla) * 0.32 * barrido;
    vec2 d = vec2(uv.x * asp, uv.y) - src;
    float a = atan(d.x, -d.y) - ang;
    float cono = exp(-pow(a / (0.045 + 0.012 * mod(fi, 2.0)), 2.0)) * smoothstep(1.35, 0.1, length(d));
    s += mix(gLuz, gContra, mod(fi, 2.0)) * cono * (0.35 + niebla * 0.9);
  }
  return s * haces;
}
// El publico: dos filas de siluetas (cabezas y hombros) recortadas contra la luz del escenario. Devuelve cuanto tapa.
float publico(vec2 uv, float asp, float suelo) {
  float tapa = 0.0;
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float esc = 18.0 - fk * 7.0;
    float x = uv.x * asp * esc + fk * 7.3;
    float id = floor(x);
    float f = fract(x) - 0.5 + (h21(vec2(id, fk)) - 0.5) * 0.3;
    float alto = suelo - fk * 0.055 + (h21(vec2(id, fk + 4.0)) - 0.5) * 0.02;
    float r = (0.2 + 0.08 * h21(vec2(id, fk + 9.0))) / esc;
    vec2 c = vec2(f / esc, uv.y - alto - r * 1.1);
    float cabeza = smoothstep(r, r * 0.8, length(c * vec2(1.0, 0.85)));
    float hombros = smoothstep(0.004, 0.0, uv.y - alto + 0.002 * sin(x * 3.1));
    tapa = max(tapa, max(cabeza, hombros) * (0.75 + fk * 0.25));
  }
  return tapa;
}

// PLANUI §4.9: el publico como lightsticks en bokeh (nunca cabezas). Tres filas de luces del tono, abajo, cada una con su
// vaiven leve; las de adelante mas grandes y mas blandas. Devuelve la luz (ya teñida con los colores del pixel).
vec3 lightsticks(vec2 p, vec2 uv, float t) {
  vec3 s = vec3(0.0);
  // (PLANUI §4.10, T) en el suspenso el publico se levanta: las filas suben (uL.y; 0 sin suspenso)
  float y = uv.y - 0.36 * uL.y;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float esc = 50.0 - fk * 12.0;
    float techo = 0.13 + fk * 0.03;
    vec2 q = vec2(p.x * esc + fk * 13.7, y * esc);
    vec2 id = floor(q);
    float r = h21(id + vec2(fk * 7.1, uSemilla));
    float vaiven = sin(t * (1.1 + 0.5 * h21(id + 3.3)) + r * 31.0) * 0.2;
    vec2 o = vec2(h21(id + 1.9) - 0.5 + vaiven, h21(id + 5.3) - 0.5) * 0.55;
    vec2 f = fract(q) - 0.5 - o;
    float rad = 0.08 + 0.05 * fk + 0.04 * h21(id + 8.8);
    float disco = smoothstep(rad, rad * (0.55 - 0.15 * fk), length(f));
    float nucleo = exp(-dot(f, f) / (rad * rad * 0.08));
    vec3 tinte = mix(gLuz, gContra, step(0.72, r));
    tinte = mix(tinte, uBlanco, 0.18 * step(0.93, r));
    float titila = 0.6 + 0.4 * sin(t * (1.4 + fk * 0.4) + r * 50.0);
    s += tinte * (disco * 0.5 + nucleo * 0.7) * step(0.36, r) * titila * smoothstep(techo, techo * 0.3, y) * (0.5 + 0.25 * fk);
  }
  return s;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  float t = uTL;
  float calma = uD.x, peligro = uD.y, gloria = uD.z;
  float vivo = uF.x, caida = uF.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float arena = uS.x;
  gLuz = uLuz; gContra = uContra; gNoche = uNoche; gVacio = uVacio;
  // la costura: cada lado con su tono (un cruce blando de los colores alrededor de la linea)
  float kB = 0.0, ladoL = 0.0;
  vec2 dC = vec2(0.0);
  if (uCos.x > 0.0) {
    dC = costura(uv, asp, t);
    ladoL = smoothstep(-0.05, 0.05, dC.x);
    kB = ladoL * uCos.x;
    gLuz = mix(uLuz, uLuzB, kB); gContra = mix(uContra, uContraB, kB); gNoche = mix(uNoche, uNocheB, kB); gVacio = mix(uVacio, uVacioB, kB);
  }

  vec3 col = mix(gVacio, gNoche, smoothstep(-0.1, 1.1, uv.y));
  float niebla = fbm(p * 1.7 + vec2(t * 0.025, -t * 0.012)) * 0.65 + fbm(p * 4.4 - vec2(t * 0.04, t * 0.018)) * 0.35;
  vec2 src = vec2(uA.x * asp, uA.y);
  vec2 base = vec2(0.5 * asp, 0.45) - src;
  float hz = haces(p, src, base, uA.z, t) * uC.w;
  if (uE.x > 0.0) {
    vec2 src2 = vec2((1.0 - uA.x) * asp, uA.y);
    hz += haces(p, src2, vec2(0.5 * asp, 0.45) - src2, uA.z, t + 7.0) * uC.w * uE.x;
  }
  // la costura: dos abanicos que nacen arriba de la linea, cada uno hacia la cara de su lado
  float campoCos = 0.0;
  if (uCos.x > 0.0) {
    vec2 fA = vec2(uCosF.x * asp, uCosF.y), fB = vec2(uCosF.z * asp, uCosF.w);
    vec2 sA, sB;
    if (uCos.w > 0.5) { sA = vec2(-0.08, 1.0 - uCos.y + 0.05); sB = vec2(asp + 0.08, 1.0 - uCos.y - 0.05); }
    else { float xt = uCos.y * asp + 0.62 * tan(uCos.z); sA = vec2(xt - 0.05, 1.14); sB = vec2(xt + 0.05, 1.14); }
    float hzA = haces(p, sA, fA - sA, 0.7, t);
    float hzB = haces(p, sB, fB - sB, 0.7, t + 7.0);
    hz = mix(hz, mix(hzA, hzB, ladoL) * 0.62 * uC.w, uCos.x);
    vec2 dA = p - fA, dB = p - fB;
    campoCos = mix(exp(-dot(dA, dA) * 2.2), exp(-dot(dB, dB) * 2.2), ladoL);
  }
  // sin el campeon, mas haz (la politica del mundo)
  if (uK.x != 1.0) hz *= uK.x;
  // en la arena, la fuente de la era deja lugar a los cabezales (y con los cabezales bajos, §4.8, casi se apaga)
  if (arena > 0.0) hz *= 1.0 - arena * (1.0 - 0.4 * uS.z);
  float kp = uB.x;
  if (uK.y != 1.0) kp *= uK.y;
  float d0 = length(p - src);
  float brillo = uC.z * (1.0 + gloria * 0.5) * (1.0 - peligro * 0.3) * (1.0 - calma * 0.05) * (1.0 - caida * 0.55);
  float ktm = 1.0;
  if (arena > 0.0) ktm = 1.0 - arena;

  col += gLuz * hz * (0.22 + uA.w * niebla * 1.25) * 0.5 * brillo;
  // con la costura, la fuente y la contra de la era ceden: la luz es la costura (si no, un lado queda lavado)
  float kEra = 1.0;
  if (uCos.x > 0.0) kEra = 1.0 - 0.75 * uCos.x;
  col += gLuz * exp(-d0 * d0 * 2.4) * 0.34 * brillo * kEra;
  vec2 cd = (p - vec2(uC.x * asp, uC.y)) * vec2(1.3, 0.8);
  float kco = 1.0;
  if (uK.z != 1.0) kco = uK.z;
  kco *= kEra;
  col += gContra * exp(-dot(cd, cd) * 3.2) * (0.14 + 0.3 * niebla) * brillo * uE.z * kco;
  col += gContra * exp(-dot(cd, cd) * 38.0) * 0.32 * max(uE.z - 1.0, 0.0) * brillo * kco;
  float mon = monitor(uv, asp);
  col += gLuz * mon * uB.w * 0.5 * brillo * ktm;
  col += gLuz * tubos(uv, t) * uB.z * 0.62 * brillo * ktm;
  col += bokeh(p, uv, t) * uB.y * 0.3 * brillo * ktm * (1.0 - 0.75 * uL.x);
  col += mix(gLuz, gContra, 0.3) * niebla * niebla * uA.w * 0.07 * brillo;
  // polvo lejano, por detras del campeon
  col += mix(gLuz, gContra, 0.25) * polvo(p * 0.62 + vec2(3.1, 1.7), t * 0.55) * (hz * 0.8 + 0.06) * kp * 0.45 * brillo;
  // la bruma se enciende cerca de la costura, cada lado en su tono
  if (uCos.x > 0.0) col += gLuz * exp(-abs(dC.x) * 8.0) * (0.05 + 0.2 * niebla) * uCos.x * brillo;

  vec3 frente = vec3(0.0);
  if (arena > 0.0) {
    // la sala a oscuras, los cabezales del techo, el humo del piso y la pared de pantallas del fondo
    col *= 1.0 - arena * 0.2;
    vec3 cab = cabezales(uv, asp, t, niebla, uS.z) * brillo;
    col += cab * 0.9 * arena;
    float humo = fbm(p * vec2(2.2, 4.0) + vec2(t * 0.03, 0.0)) * smoothstep(0.62, 0.05, uv.y);
    col += mix(gLuz, gContra, 0.5) * humo * 0.16 * arena * brillo;
    col += mix(gLuz, gContra, uv.x) * exp(-pow((uv.y - uS.y - 0.05) * 7.0, 2.0)) * 0.26 * arena * brillo;
    // el publico tapa (por delante del campeon de la pantalla gigante) y sus celulares titilan
    float tapa = publico(uv, asp, uS.y) * arena * uS.w;
    vec2 q = p * 46.0 + vec2(0.0, t * 0.05);
    float cel = step(0.93, h21(floor(q) + uSemilla)) * smoothstep(0.12, 0.0, length(fract(q) - 0.5)) * smoothstep(uS.y + 0.02, uS.y - 0.06, uv.y) * (0.5 + 0.5 * sin(t * 2.0 + h21(floor(q)) * 30.0));
    frente += mix(uBlanco, gLuz, 0.4) * cel * 0.8 * arena * uS.w;
    frente -= col * tapa * 0.94;
    frente += cab * tapa * 0.08;
  }

  // mas bruma de la era por encima del campeon (tenue): lo funde en la luz
  if (uI.z > 0.0) frente += mix(gLuz, gContra, 0.3) * (0.18 + niebla * 0.9) * uI.z * 0.16 * brillo;
  // el publico: lightsticks en bokeh, por delante (es la primera fila)
  if (uL.x > 0.0) frente += lightsticks(p, uv, t) * uL.x * 0.7 * brillo * (1.0 + 1.2 * uL.y);
  float pv = polvo(p, t);
  frente += mix(gLuz, uBlanco, 0.45) * pv * (hz * 1.5 + 0.1) * kp * brillo;
  frente += mix(gContra, uOro, 0.5) * brasas(p, t) * uE.w * (0.35 + 0.65 * vivo) * 0.55 * brillo * (1.0 - caida * 0.8);

  float campo = clamp(hz * 0.55 + exp(-d0 * d0 * 1.1) * 0.75 + uB.w * mon * 0.9 * ktm + 0.44, 0.0, 1.3);
  // con la costura, cada campeon esta iluminado alrededor de su cara (y por su abanico)
  if (uCos.x > 0.0) campo = mix(campo, clamp(hz * 0.55 + campoCos * 0.8 + 0.42, 0.0, 1.3), uCos.x);
  oFondo = vec4(col / uEsc, campo / 1.3);
  oFrente = vec4(frente / uEsc * 0.5 + 0.5, niebla);
}`;

// Segunda pasada (resolucion nativa): el campeon, nitido, adentro de la luz de la primera; despues lo que va por
// delante y el ultimo grado (peligro, gloria, la caida, el quiebre, la vineta, el grano).
const FRAG_ARTE = `${COMUN}
out vec4 color;
uniform sampler2D uLuz0, uLuz1;
uniform vec2 uFoco0, uFoco1;
uniform sampler2D uArte0, uArte1;
uniform vec2 uTam0, uTam1;
uniform vec4 uArteE;
uniform vec4 uMarco;
uniform vec2 uPar;
uniform vec4 uColor; // el color del campeon (js/color.js): x: en el fondo, y: lavado de la era, z: adentro del lugar
uniform vec4 uRec; // el lugar fijo (uv, y hacia arriba): x0, y0, x1, y1
uniform float uRadio; // el radio de sus esquinas, en pixeles del lienzo
// la costura (PLANUI §4.9): el encuadre de cada lado y el arte del lado B (su ranura propia, la tercera textura)
uniform vec4 uMarcoA, uMarcoB;
uniform sampler2D uArteB;
uniform vec2 uFocoB, uTamB;
uniform vec4 uCosE; // x: presencia del arte de B (0 = ese lado solo luz), y: el color de las piezas (js/color.js), z: el trazo (0-1)
float dentroG = 0.0; // cuanto de este pixel cae adentro del lugar fijo (se calcula una vez en main)

// adentro del lugar fijo: 1 adentro, 0 afuera, con el borde de un pixel y las esquinas redondeadas
float enLugar(vec2 uv) {
  vec2 c = (uRec.xy + uRec.zw) * 0.5 * uRes;
  vec2 h = (uRec.zw - uRec.xy) * 0.5 * uRes;
  vec2 d = abs(uv * uRes - c) - h + uRadio;
  float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - uRadio;
  return clamp(0.5 - sd, 0.0, 1.0);
}
// El splash como plano vivo: profundidad 2,5D falsa (luminancia + la cara en primer plano + un degrade vertical), con
// parallax al puntero y una deriva lenta tipo Ken Burns; las luces altas (pelo, tela, energia) fluyen con un ruido leve.
// La profundidad y el flujo salen de un nivel borroso del mip (un campo suave): mover cada pixel por su propia luz
// rasgaba los bordes. El color se lee con el nivel de mip de su escala: nitido, sin dientes.
vec4 muestraArte(sampler2D tx, vec2 tam, vec2 uv, float asp, vec2 foco, float t, float vivo, vec4 marco) {
  float ah = marco.z;
  float aw = ah * (tam.x / max(tam.y, 1.0)) / asp;
  vec2 centro = marco.xy + uPar * 0.5 - vec2((foco.x - 0.5) * aw, (0.5 - foco.y) * ah);
  vec2 fq = vec2(foco.x, 1.0 - foco.y);
  vec2 q = (uv - centro) / vec2(aw, ah) + 0.5;
  // Ken Burns: la escala respira alrededor de la cara y el encuadre se desliza
  float kb = 1.0 + 0.05 * vivo * (0.5 + 0.5 * sin(t * 0.05 - 1.2));
  q = (q - fq) / kb + fq + vec2(sin(t * 0.033), cos(t * 0.029)) * 0.012 * vivo;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return vec4(0.0);
  // el nivel de mip: cuantos texeles caen en un pixel de la pantalla
  float lod = max(0.0, log2(tam.y / max(ah * uRes.y * kb, 1.0)));
  float l0 = dot(textureLod(tx, vec2(q.x, 1.0 - q.y), lod + 3.0).rgb, vec3(0.299, 0.587, 0.114));
  vec2 dc = (q - fq) * vec2(1.7, 1.0);
  float prof = clamp(l0 * 0.42 + exp(-dot(dc, dc) * 7.0) * 0.4 + (1.0 - q.y) * 0.26, 0.0, 1.0);
  vec2 desp = (uPar * 2.4 + vec2(sin(t * 0.13), cos(t * 0.11)) * 0.0045 * vivo) * (prof - 0.42);
  // sin profundidad (tenue): el splash es un plano, sin la cara que se despega hacia adelante
  if (uI.y < 1.0) desp *= uI.y;
  vec2 qd = q - desp / vec2(aw, ah);
  float hl = smoothstep(0.42, 0.85, l0);
  vec2 flujo = vec2(ruido(q * 8.0 + vec2(0.0, t * 0.42)), ruido(q * 8.0 + vec2(5.2, -t * 0.36))) - 0.5;
  float kf = vivo;
  if (uI.y < 1.0) kf *= uI.y;
  qd += flujo * 0.007 * hl * kf;
  vec3 c = textureLod(tx, vec2(clamp(qd.x, 0.0, 1.0), 1.0 - clamp(qd.y, 0.0, 1.0)), lod).rgb;
  // desenfoque (tenue, el tinte del lugar): dos anillos de muestras alrededor. Adentro del lugar, nitido.
  float sv = uJ.y * (1.0 - dentroG);
  if (sv > 0.0) {
    vec3 s = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float an = float(i) * 0.785398 + 0.39;
      vec2 o = vec2(cos(an), sin(an)) * sv * (i < 4 ? 0.012 : 0.026);
      vec2 qq = clamp(qd + o, 0.0, 1.0);
      s += textureLod(tx, vec2(qq.x, 1.0 - qq.y), lod + 1.0).rgb;
    }
    c = mix(c, s / 8.0, clamp(sv * 1.2, 0.0, 1.0));
  }
  float borde = smoothstep(0.0, 0.26, q.x) * smoothstep(1.0, 0.74, q.x) * smoothstep(0.0, 0.3, q.y) * smoothstep(1.0, 0.86, q.y);
  // adentro del lugar fijo el splash llena la ventana hasta el borde, como en el cliente
  if (dentroG > 0.0) borde = mix(borde, 1.0, dentroG);
  return vec4(c, borde);
}
// LA COSTURA: un lado del cara a cara, con la MISMA cuenta del bitono del arte de siempre (sombras = noche, luces = la
// luz del tono, el filo de contra, las luces altas que titilan, el barrido, el color de las piezas), en su tono y su
// encuadre. peso: cuanto de este pixel es de este lado. d: la distancia firmada a la costura (el filo mira hacia ella).
vec3 componerLado(vec3 col, sampler2D tx, vec2 tam, vec2 foco, vec4 marco, vec3 c, float a, float peso, vec3 luz, vec3 contra, vec3 noche,
                  float campo, vec2 uv, float asp, float t, float vivo, float d) {
  if (a * peso <= 0.0) return col;
  float l = smoothstep(0.04, 0.9, dot(c, vec3(0.299, 0.587, 0.114)));
  if (uJ.x != 1.0) l = 0.42 + (l - 0.42) * uJ.x;
  // la contra, del lado que mira a la costura
  float cerca = exp(-abs(d) * 5.0);
  vec3 duo = mix(noche * 0.5, luz * 1.05, l);
  duo = mix(duo, contra, smoothstep(0.55, 1.0, l) * (0.35 + 0.65 * cerca) * 0.5);
  duo += mix(luz, uBlanco, 0.6) * pow(l, 4.0) * 0.7;
  duo += luz * pow(l, 2.5) * (ruido(vec2(uv.x * 16.0, uv.y * 9.0 - t * 0.7)) - 0.42) * 0.4 * vivo;
  float xs = (uv.x - marco.x) * asp * 0.8 + (uv.y - marco.y) * 0.5;
  float barr = exp(-pow((xs - (fract(t / 11.0) * 3.2 - 1.6)) / 0.06, 2.0));
  duo += mix(luz, uBlanco, 0.75) * barr * smoothstep(0.2, 0.75, l) * 0.6 * max(vivo, 0.35);
  // el color de las piezas (la costura es una pieza: js/color.js, 'pieza')
  if (uCosE.y > 0.0) duo = mix(duo, c * 1.08, uCosE.y);
  float m = a * campo * marco.w * peso;
  col = 1.0 - (1.0 - col) * (1.0 - clamp(duo * m, 0.0, 1.0));
  // el filo: la luz de la costura recorta al campeon del lado que la mira
  vec2 hacia = haciaCostura(d, asp) * vec2(0.0045, 0.0045 * asp);
  vec4 b = muestraArte(tx, tam, uv + hacia, asp, foco, t, vivo, marco);
  float lb = dot(b.rgb, vec3(0.299, 0.587, 0.114));
  float la = dot(c, vec3(0.299, 0.587, 0.114));
  float rim = smoothstep(0.07, 0.3, la - lb) * smoothstep(0.12, 0.5, la);
  col += mix(contra, luz, 0.35) * rim * (0.6 + 0.9 * cerca) * a * marco.w * peso * uI.y;
  return col;
}
// Las chispas que corren a lo largo de la costura (en coordenadas de la linea: s a lo largo, d a traves).
float chispas(float s, float d, float t) {
  float acc = 0.0;
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float esc = 24.0 + fk * 17.0;
    float q = s * esc - t * (1.6 + fk * 0.9);
    float id = floor(q);
    float f = fract(q) - 0.5;
    float r = h21(vec2(id, fk + uSemilla));
    float off = (h21(vec2(id, fk + 3.1)) - 0.5) * 0.022 + sin(t * 2.0 + r * 30.0) * 0.003;
    vec2 e = vec2(f / esc, d - off);
    float tam = 0.0014 + 0.002 * h21(vec2(id, fk + 7.7));
    acc += step(0.52, r) * exp(-dot(e, e) / (tam * tam)) * (0.45 + 0.55 * sin(t * 5.0 + r * 40.0));
  }
  return acc;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  float t = uTL;
  float calma = uD.x, peligro = uD.y, gloria = uD.z, pulso = uD.w;
  float vivo = uF.x, caida = uF.y, quiebre = uF.z;
  // la luz que se quiebra: bandas horizontales que se corren un instante
  if (quiebre > 0.001) {
    float fila = floor(uv.y * 22.0);
    uv.x += step(0.62, h21(vec2(fila, floor(uT * 14.0)))) * (h21(vec2(fila, 3.7)) - 0.5) * 0.05 * quiebre;
  }
  vec2 p = vec2(uv.x * asp, uv.y);
  vec4 L0 = texture(uLuz0, uv);
  vec4 L1 = texture(uLuz1, uv);
  vec3 col = L0.rgb * uEsc;
  float niebla = L1.a;
  vec2 src = vec2(uA.x * asp, uA.y);
  float d0 = length(p - src);

  // el arte, en duotono y adentro de la luz
  if (uJ.w > 0.0) dentroG = enLugar(uv) * uJ.w;
  // adentro del lugar fijo la luz baja, como la pantalla del cliente detras del splash: el campeon se lee como imagen
  // (en la arena, la pantalla gigante emite: el campeon se ve sobre negro, como una pantalla LED)
  if (dentroG > 0.0) col *= 1.0 - dentroG * mix(0.45, 0.85, uS.x);
  if (uArteE.y + uArteE.z > 0.0 && uI.x + uJ.w > 0.0) {
    vec4 a0 = muestraArte(uArte0, uTam0, uv, asp, uFoco0, t, vivo, uMarco); a0.a *= uArteE.y;
    vec4 a1 = muestraArte(uArte1, uTam1, uv, asp, uFoco1, t, vivo, uMarco); a1.a *= uArteE.z;
    float a = mix(a0.a, a1.a, uArteE.x);
    if (a > 0.0) {
      vec3 c = mix(a0.rgb, a1.rgb, uArteE.x);
      float l = smoothstep(0.04, 0.9, dot(c, vec3(0.299, 0.587, 0.114)));
      // menos contraste (tenue): el duotono se aplana hacia el medio, sin negros ni brillos duros
      if (uJ.x != 1.0) l = 0.42 + (l - 0.42) * mix(uJ.x, 1.0, dentroG);
      float lado = smoothstep(0.2, 0.9, abs(uv.x - uC.x) < 0.5 ? 1.0 - abs(uv.x - uC.x) * 1.4 : 0.0);
      vec3 duo = mix(uNoche * 0.5, uLuz * 1.05, l);
      duo = mix(duo, uContra, smoothstep(0.55, 1.0, l) * lado * 0.5);
      duo += mix(uLuz, uBlanco, 0.6) * pow(l, 4.0) * 0.7;
      // las luces altas titilan como energia, y cada tanto un barrido de luz cruza al campeon
      duo += uLuz * pow(l, 2.5) * (ruido(vec2(uv.x * 16.0, uv.y * 9.0 - t * 0.7)) - 0.42) * 0.4 * vivo;
      float xs = (uv.x - uMarco.x) * asp * 0.8 + (uv.y - uMarco.y) * 0.5;
      float barr = exp(-pow((xs - (fract(t / 11.0) * 3.2 - 1.6)) / 0.06, 2.0));
      duo += mix(uLuz, uBlanco, 0.75) * barr * smoothstep(0.2, 0.75, l) * 0.6 * max(vivo, 0.35);
      // el color del campeon (js/color.js): 0 = el duotono de la era, 1 = sus colores reales; afuera del lugar, con un
      // lavado leve de la era para que quede en la escena y no pegado
      if (uColor.x + uColor.z > 0.0) {
        float kc = mix(uColor.x, uColor.z, dentroG);
        vec3 real = mix(c * 1.08, duo, uColor.y * (1.0 - dentroG));
        duo = mix(duo, real, kc);
      }
      float campo = L0.a * 1.3;
      // en su lugar el campeon esta iluminado entero, no solo donde le pega el haz
      if (dentroG > 0.0) campo = mix(campo, max(campo, 1.0 + 0.2 * uS.x), dentroG);
      float m = a * campo * uMarco.w;
      // la presencia del campeon: a pantalla completa (uI.x) o, si hay lugar fijo, adentro (uJ.z) y afuera (uI.x)
      float pres = uI.x;
      if (uJ.w > 0.0) pres = mix(uI.x, uJ.z, dentroG);
      if (pres != 1.0) m *= pres;
      col = 1.0 - (1.0 - col) * (1.0 - clamp(duo * m, 0.0, 1.0));
      // luz de contra recortando al campeon: el borde que mira a la contra, donde la imagen cae hacia lo oscuro
      float kr = uE.y;
      if (uI.y < 1.0 || pres != 1.0) kr *= uI.y * pres;
      if (kr > 0.0) {
        vec2 hacia = normalize(vec2(uC.x, uC.y) - uv) * vec2(0.0045, 0.0045 * asp);
        vec4 b0 = muestraArte(uArte0, uTam0, uv + hacia, asp, uFoco0, t, vivo, uMarco);
        vec4 b1 = muestraArte(uArte1, uTam1, uv + hacia, asp, uFoco1, t, vivo, uMarco);
        float lb = dot(mix(b0.rgb, b1.rgb, uArteE.x), vec3(0.299, 0.587, 0.114));
        float la = dot(c, vec3(0.299, 0.587, 0.114));
        float rim = smoothstep(0.07, 0.3, la - lb) * smoothstep(0.12, 0.5, la);
        col += uContra * rim * kr * a * uMarco.w * 1.1;
      }
    }
  }

  // LA COSTURA: cada lado su campeon (o solo su luz), su tono y su filo; y entre los dos, la linea de luz
  vec2 dC = vec2(0.0);
  if (uCos.x > 0.0) {
    dC = costura(uv, asp, t);
    float px = 1.0 / uRes.y;
    float ladoB = smoothstep(-1.2 * px, 1.2 * px, dC.x);
    float campo = L0.a * 1.3;
    if (uArteE.y + uArteE.z > 0.0 && ladoB < 1.0) {
      vec4 a0 = muestraArte(uArte0, uTam0, uv, asp, uFoco0, t, vivo, uMarcoA); a0.a *= uArteE.y;
      vec4 a1 = muestraArte(uArte1, uTam1, uv, asp, uFoco1, t, vivo, uMarcoA); a1.a *= uArteE.z;
      vec3 ca = mix(a0.rgb, a1.rgb, uArteE.x);
      // el filo usa la ranura que domina el cruce
      if (uArteE.x < 0.5) col = componerLado(col, uArte0, uTam0, uFoco0, uMarcoA, ca, mix(a0.a, a1.a, uArteE.x), (1.0 - ladoB) * uCos.x, uLuz, uContra, uNoche, campo, uv, asp, t, vivo, dC.x);
      else col = componerLado(col, uArte1, uTam1, uFoco1, uMarcoA, ca, mix(a0.a, a1.a, uArteE.x), (1.0 - ladoB) * uCos.x, uLuz, uContra, uNoche, campo, uv, asp, t, vivo, dC.x);
    }
    if (uCosE.x > 0.0 && ladoB > 0.0) {
      vec4 b = muestraArte(uArteB, uTamB, uv, asp, uFocoB, t, vivo, uMarcoB);
      col = componerLado(col, uArteB, uTamB, uFocoB, uMarcoB, b.rgb, b.a * uCosE.x, ladoB * uCos.x, uLuzB, uContraB, uNocheB, campo, uv, asp, t, vivo, dC.x);
    }
    // el lado sin campeon (solo tono): un foco de su luz donde va el logo del rival (un <img> encima)
    if (uCosE.x < 1.0) {
      vec2 fb = (uv - uCosF.zw) * vec2(asp, 1.0);
      col += uLuzB * exp(-dot(fb, fb) * 9.0) * 0.32 * (1.0 - uCosE.x) * ladoB * uCos.x;
    }
  }

  // lo que va por delante (la bruma extra, el polvo cercano, las brasas, el publico de la arena)
  col += ((L1.rgb - 0.5) * 2.0) * uEsc;
  // la linea de la costura: el nucleo caliente (casi blanco) y el halo en los dos tonos, que respira; se traza de abajo
  // hacia arriba al prenderse (uCosE.z); chispas que corren a lo largo
  if (uCos.x > 0.0) {
    float ad = abs(dC.x);
    float px = 1.0 / uRes.y;
    float traza = smoothstep(0.0, 0.12, (-0.75 + 1.7 * uCosE.z) - dC.y * (uCos.w > 0.5 ? -1.0 : 1.0));
    vec3 tinte = mix(uLuz, uLuzB, smoothstep(-0.003, 0.003, dC.x));
    float resp = (0.86 + 0.14 * sin(t * 0.9)) * (1.0 + 2.4 * uL.z);
    col += tinte * (exp(-ad * 46.0) * 0.5 + exp(-ad * 10.0) * 0.16) * resp * uCos.x * traza;
    float nucleo = exp(-pow(ad / (1.4 * px + 0.0009), 2.0));
    col += mix(uBlanco, mix(uLuz, uLuzB, 0.5), 0.22) * nucleo * 1.05 * uCos.x * traza;
    col += mix(uBlanco, tinte, 0.45) * chispas(dC.y, dC.x, t) * 0.9 * uCos.x * traza;
    // (PLANUI §4.10, T) el suspenso: la luz va de un tono al otro sin destellar (la misma cantidad, cambia el color)
    if (uL.y > 0.0) {
      vec3 ta = uLuz / max(max(uLuz.r, uLuz.g), max(uLuz.b, 0.05));
      vec3 tb = uLuzB / max(max(uLuzB.r, uLuzB.g), max(uLuzB.b, 0.05));
      col += mix(ta, tb, 0.5 + 0.5 * uL.w) * 0.05 * uL.y * uCos.x;
    }
  }

  // (PLANUI §4.9) con la politica de color linea (uF.w = 1) ningun animo saca el color: los momentos van con el 70 %
  // del color real del campeon y la regla 3 prohibe el gris neutro. El peligro y la caida se cuentan con la luz.
  float conColor = uF.w;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum), peligro * 0.6 * (1.0 - conColor));
  col *= 1.0 - peligro * (0.16 + 0.12 * sin(uT * 5.0));
  col += uOro * gloria * 0.07 * (niebla + 0.3);
  col += mix(uLuz, uBlanco, 0.5) * pulso * 0.22 * (exp(-d0 * d0 * 0.8) + 0.35);
  // la luz que cae (una eliminacion): se apaga y se queda sin color, sin latir; con la linea, se apaga y se enfria y las
  // sombras caen a la noche del tono, pero el arte conserva su color
  float lum2 = dot(col, vec3(0.299, 0.587, 0.114));
  if (conColor > 0.5) {
    vec3 nocheP = uCos.x > 0.0 ? mix(uNoche, uNocheB, smoothstep(-0.003, 0.003, dC.x) * uCos.x) : uNoche;
    col = mix(col, col * vec3(0.8, 0.9, 1.0) + nocheP * 0.16, caida);
  } else col = mix(col, vec3(lum2) * vec3(0.92, 0.95, 1.0), caida * 0.78);
  col *= 1.0 - caida * 0.3;
  col = mix(col, vec3(lum2), quiebre * 0.85);
  col *= 1.0 - quiebre * 0.4;

  vec2 vq = (uv - 0.5) * vec2(0.95, 1.15);
  float kv = 0.85;
  if (uI.w > 0.0) kv += uI.w;
  col *= 1.0 - dot(vq, vq) * kv;
  col *= 1.0 - uArteE.w * smoothstep(0.66, 0.0, uv.x) * 0.5;
  col += (h21(gl_FragCoord.xy + fract(uT * 7.0) * 100.0) - 0.5) * 0.014;
  color = vec4(max(col, 0.0), 1.0);
}`;

const UNIFORMES = ['uRes', 'uT', 'uTL', 'uSemilla', 'uVacio', 'uNoche', 'uLuz', 'uContra', 'uOro', 'uBlanco', 'uA', 'uB', 'uC', 'uD', 'uE', 'uFoco0', 'uFoco1', 'uArte0', 'uArte1', 'uTam0', 'uTam1', 'uArteE', 'uMarco', 'uPar', 'uF', 'uI', 'uJ', 'uK', 'uS', 'uColor', 'uRec', 'uRadio', 'uEsc', 'uLuz0', 'uLuz1',
  'uCos', 'uCosF', 'uLuzB', 'uContraB', 'uNocheB', 'uVacioB', 'uL', 'uMarcoA', 'uMarcoB', 'uArteB', 'uFocoB', 'uTamB', 'uCosE'];
const ARENA_NADA = [0, 0, 0, 0];
const COS_NADA = [0, 0.5, 0, 0];
const COSF_NADA = [0.25, 0.6, 0.75, 0.6];
const L_NADA = [0, 0, 0, 0];
const MARCO_NADA = [0.5, 0.6, 1, 1];
// las unidades de textura: el arte (0 y 1: el cruce del campeon, que con la costura es el lado A), la luz de la primera
// pasada (2 y 3) y el arte del lado B de la costura (4)
const UNIDAD_ARTE = [0, 1, 4];

// Un lienzo WebGL2 con los dos programas compilados y la luz en un framebuffer a media escala. Lo usan el ambiente y
// fotografiar(). El lienzo es del tamaño nativo: el arte se compone ahi; la luz, en LUZ_REL de ese tamaño.
function crearLienzo(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const compilar = (tipo, src) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const enlazar = (frag) => {
    const prog = gl.createProgram();
    gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
    const U = {};
    for (const n of UNIFORMES) U[n] = gl.getUniformLocation(prog, n);
    return { prog, U };
  };
  let luzP;
  let arteP;
  try {
    luzP = enlazar(FRAG_LUZ);
    arteP = enlazar(FRAG_ARTE);
  } catch (e) {
    console.warn('[a-luz] el shader no compilo, uso el respaldo CSS:', e.message);
    return null;
  }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const nuevaTextura = (unidad, filtroMin) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unidad);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(3));
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, filtroMin], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  };
  // el arte (unidades 0, 1 y 4, con mipmaps) y la luz de la primera pasada (2 y 3)
  const texturas = UNIDAD_ARTE.map((i) => nuevaTextura(i, gl.LINEAR));
  const luzTex = [2, 3].map((i) => nuevaTextura(i, gl.LINEAR));
  // La luz se guarda en medio flotante si se puede (la gloria y el pulso la pasan de 1); si no, en 8 bits a la mitad.
  let flotante = Boolean(gl.getExtension('EXT_color_buffer_float'));
  const fbo = gl.createFramebuffer();
  let fw = 0;
  let fh = 0;
  function asegurarLuz(w, h) {
    if (w === fw && h === fh) return;
    fw = w;
    fh = h;
    for (let intento = 0; intento < 2; intento++) {
      luzTex.forEach((t, i) => {
        gl.activeTexture(gl.TEXTURE2 + i);
        gl.bindTexture(gl.TEXTURE_2D, t);
        if (flotante) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      luzTex.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (ok || !flotante) return;
      flotante = false;
    }
  }
  const tam = [[1, 1], [1, 1], [1, 1]];
  const focos = [FOCO_DEF, FOCO_DEF, FOCO_DEF];
  function poner({ U }, u, w, h) {
    gl.uniform2f(U.uRes, w, h);
    gl.uniform1f(U.uT, u.t);
    gl.uniform1f(U.uTL, u.tl);
    gl.uniform1f(U.uSemilla, u.semilla);
    // la noche y el vacio de la paleta (PLANUI §4.9: el tono tiñe las sombras) o, sin paleta, los de siempre
    for (const [n, v] of [['uVacio', u.p.vacio ?? u.col.vacio], ['uNoche', u.p.noche ?? u.col.noche], ['uOro', u.col.oro], ['uBlanco', u.col.blanco], ['uLuz', u.p.luz], ['uContra', u.p.contra]]) gl.uniform3fv(U[n], v);
    gl.uniform4fv(U.uA, u.p.a);
    gl.uniform4fv(U.uB, u.p.b);
    gl.uniform4fv(U.uC, u.p.c);
    gl.uniform4fv(U.uD, u.d);
    gl.uniform4fv(U.uE, u.p.e);
    gl.uniform4fv(U.uF, u.f ?? [0, 0, 0, 0]);
    gl.uniform4fv(U.uI, u.i ?? I_PLENO);
    gl.uniform4fv(U.uJ, u.j ?? J_PLENO);
    gl.uniform4fv(U.uK, u.k ?? K_PLENO);
    gl.uniform4fv(U.uS, u.s ?? ARENA_NADA);
    gl.uniform1f(U.uEsc, flotante ? 1 : 2);
    // la costura (apagada si no viene) y los lightsticks
    gl.uniform4fv(U.uCos, u.cos ?? COS_NADA);
    gl.uniform4fv(U.uCosF, u.cosF ?? COSF_NADA);
    const b = u.cosB ?? null;
    for (const [n, k, def] of [['uLuzB', 'luz', u.p.luz], ['uContraB', 'contra', u.p.contra], ['uNocheB', 'noche', u.p.noche ?? u.col.noche], ['uVacioB', 'vacio', u.p.vacio ?? u.col.vacio]]) gl.uniform3fv(U[n], b?.[k] ?? def);
    gl.uniform4fv(U.uL, u.l ?? L_NADA);
  }
  return {
    gl,
    // slot 0/1: el campeon (y el lado A de la costura); 2: el lado B
    textura(slot, img, foco = FOCO_DEF) {
      focos[slot] = foco;
      gl.activeTexture(gl.TEXTURE0 + UNIDAD_ARTE[slot]);
      gl.bindTexture(gl.TEXTURE_2D, texturas[slot]);
      if (img) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        tam[slot] = [img.naturalWidth, img.naturalHeight];
      }
    },
    dibujar(u) {
      const W = canvas.width;
      const H = canvas.height;
      const w = Math.max(2, Math.round(W * LUZ_REL));
      const h = Math.max(2, Math.round(H * LUZ_REL));
      asegurarLuz(w, h);
      // 1. la luz, a media escala
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, w, h);
      gl.useProgram(luzP.prog);
      poner(luzP, u, w, h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // 2. el arte, nativo, sobre la luz
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(arteP.prog);
      const { U } = arteP;
      poner(arteP, u, W, H);
      gl.uniform1i(U.uArte0, 0);
      gl.uniform1i(U.uArte1, 1);
      gl.uniform1i(U.uLuz0, 2);
      gl.uniform1i(U.uLuz1, 3);
      gl.uniform1i(U.uArteB, UNIDAD_ARTE[2]);
      luzTex.forEach((t, i) => {
        gl.activeTexture(gl.TEXTURE2 + i);
        gl.bindTexture(gl.TEXTURE_2D, t);
      });
      gl.uniform2fv(U.uFoco0, focos[0]);
      gl.uniform2fv(U.uFoco1, focos[1]);
      gl.uniform4fv(U.uArteE, u.arte);
      gl.uniform4fv(U.uMarco, u.marco);
      gl.uniform2fv(U.uPar, u.par);
      gl.uniform4fv(U.uColor, u.c ?? C_DUOTONO);
      gl.uniform4fv(U.uRec, u.rec ?? REC_NADA);
      gl.uniform1f(U.uRadio, u.radio ?? 0);
      gl.uniform2fv(U.uTam0, tam[0]);
      gl.uniform2fv(U.uTam1, tam[1]);
      gl.uniform2fv(U.uTamB, tam[2]);
      gl.uniform2fv(U.uFocoB, focos[2]);
      gl.uniform4fv(U.uMarcoA, u.marcoA ?? MARCO_NADA);
      gl.uniform4fv(U.uMarcoB, u.marcoB ?? MARCO_NADA);
      gl.uniform4fv(U.uCosE, u.cosE ?? L_NADA);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    liberar() {
      [...texturas, ...luzTex].forEach((t) => gl.deleteTexture(t));
      gl.deleteFramebuffer(fbo);
      gl.deleteBuffer(buf);
      gl.deleteProgram(luzP.prog);
      gl.deleteProgram(arteP.prog);
    },
  };
}

// ======================================================================================================================
// Ambiente WebGL
// ======================================================================================================================
function crearAmbienteGL(contenedor, opciones, alPerder) {
  const canvas = el('canvas', { class: 'luz-gl', 'aria-hidden': 'true' });
  const lienzo = crearLienzo(canvas);
  if (!lienzo) return null;
  contenedor.prepend(canvas);
  const col = colores();
  const semilla = crearAzar('a-luz-ambiente').entre(0, 100);

  let t0 = performance.now();
  let pausado = false;
  let congeladoEn = null;
  let raf = 0;
  let ultimo = 0;
  let vivo = true;
  const reloj = () => (congeladoEn != null ? congeladoEn : performance.now() - t0);

  // estado como funcion del reloj
  let eraHacia = null;
  let pDesde = null;
  let pHacia = null;
  let tEra = -1e9;
  let animo = { desde: [0, 0, 0], hacia: [0, 0, 0], t: -1e9, gloriaT: -1e9 };
  let quiebreT = -1e9;
  let calmaEventos = [{ t: 0, desde: 0, hacia: 0, base: 0 }];
  let pulsos = []; // los pulsos programados ({ t, k }, por t): se superponen (ubicarPulso)
  let marco = { ...ENCUADRES.derecha };
  let marcoDesde = { ...marco };
  let tMarco = -1e9;
  let velo = 0.6;
  // arte: dos ranuras; `activa` es la que se ve; la mezcla va hacia ella
  const arte = { on: [0, 0], activa: 0, t: -1e9, dur: T_ARTE, key: [null, null], token: 0, carga: Promise.resolve() };
  let actual = { era: null, animo: 'normal', arte: undefined };
  const intensidad = crearIntensidad();
  const mapas = new Set(); // los cambios de campeon programados de un momento
  const limpiarMapas = () => {
    mapas.forEach(clearTimeout);
    mapas.clear();
  };
  let lugar = null; // { nodo, foco, escala }: la ventana de la interfaz donde vive el campeon (fondo `lugar`)
  // PLANUI §4.7: la paleta de la competicion (cuanto toma el lugar de la luz de la era) y la arena (op=escenario).
  // Cruzan en T_ERA, como la era (o en el `cruce` de la llamada, PLANUI §4.9): son funcion del reloj.
  // PLANUI §4.9: la paleta tambien tiñe la noche y el vacio (las sombras del arte y el fondo del mundo); si no los trae,
  // quedan los de siempre.
  const SIN_PALETA = { luz: [0, 0, 0], contra: [0, 0, 0], noche: col.noche, vacio: col.vacio, k: 0 };
  let palDesde = SIN_PALETA;
  let palHacia = SIN_PALETA;
  let tPal = -1e9;
  let durPal = T_ERA;
  // haces/publico (PLANUI §4.8): los cabezales y el publico del shader, 1 = los de §4.7
  let arenaDesde = { k: 0, suelo: 0, haces: 1, publico: 1 };
  let arenaHacia = { k: 0, suelo: 0, haces: 1, publico: 1 };
  let tArena = -1e9;
  const paletaEn = (t) => {
    const k = suave((t - tPal) / durPal);
    const a = palDesde.k > 0 ? palDesde : { ...palHacia, k: 0 };
    const b = palHacia.k > 0 ? palHacia : { ...palDesde, k: 0 };
    return { luz: mezclarV(a.luz, b.luz, k), contra: mezclarV(a.contra, b.contra, k), noche: mezclarV(a.noche, b.noche, k), vacio: mezclarV(a.vacio, b.vacio, k), k: mezclar(a.k, b.k, k) };
  };
  // PLANUI §4.9, LA COSTURA: la presencia, la posicion, el angulo y cuanto manda el tono de A cruzan con el reloj (en el
  // `cruce` de la llamada); los colores de cada lado, tambien. El arte de A son las ranuras de siempre (el aura lo cambia);
  // el de B, su ranura propia: al cambiar se apaga y se vuelve a encender en ese lado (un cruce sin cuarta textura).
  const COLORES_COS = ['luz', 'contra', 'noche', 'vacio'];
  const cosVacia = () => ({ k: 0, pos: 0.5, ang: ANGULO_COSTURA, aK: 0, a: null, b: null, m: MARCO_TODO, cr: null });
  let cosDesde = cosVacia();
  let cosHacia = cosVacia();
  let tCos = -1e9;
  let durCos = T_ERA;
  let cosPedida = null; // lo ultimo que pidio la pantalla: los parciales se mezclan sobre esto
  let cosVertical = false; // en el celular la costura se parte en vertical (A arriba, B abajo)
  const coloresDe = (tono, base) => (tono ? Object.fromEntries(COLORES_COS.map((k) => [k, leerColor(tono[k])])) : base);
  const mezclarColores = (x, y, k) => Object.fromEntries(COLORES_COS.map((c) => [c, mezclarV(x[c], y[c], k)]));
  function costuraEn(t) {
    const e = suave((t - tCos) / durCos);
    const d = cosDesde;
    const h = cosHacia;
    const lado = (x, y) => (x && y ? mezclarColores(x, y, e) : y ?? x);
    return { k: mezclar(d.k, h.k, e), pos: mezclar(d.pos, h.pos, e), ang: mezclar(d.ang, h.ang, e), aK: mezclar(d.aK, h.aK, e), a: lado(d.a, h.a), b: lado(d.b, h.b), m: mezclarMarco(d.m, h.m, e), cr: mezclarCaras(d.cr, h.cr, e) };
  }
  // donde cae la cara de cada lado (uv, y hacia arriba): en escritorio, a izquierda y derecha de la linea; en el celular,
  // arriba y abajo. (PLANUI §4.9, A) Con `marco`, todo eso adentro de ese rectangulo de la pantalla (el video del Swiss).
  // (U) Con `caras`, medidas desde la linea (carasCostura).
  const marcosCostura = (cz) => {
    const asp = canvas.width / Math.max(1, canvas.height);
    return enMarco(carasCostura(cz.pos, cosVertical, cz.ang, (asp * cz.m.w) / cz.m.h, cz.cr), cz.m);
  };
  const arteB = { key: undefined, desde: 0, hacia: 0, t: -1e9, dur: 1, token: 0, carga: Promise.resolve() };
  const presB = (t) => mezclar(arteB.desde, arteB.hacia, suave((t - arteB.t) / arteB.dur));
  // los lightsticks del publico (0-1), con el reloj
  let lsDesde = 0;
  let lsHacia = 0;
  let tLs = -1e9;
  let durLs = T_ERA;
  const lsEn = (t) => mezclar(lsDesde, lsHacia, suave((t - tLs) / durLs));
  // (PLANUI §4.10, T) el suspenso pedido (leerSuspenso) y lo que vale en t: null afuera de su rato
  let sus = null;
  function suspensoEn(t) {
    if (!sus || quieto()) return null;
    const dt = t - sus.t;
    if (dt < 0 || dt > sus.dura) return null;
    const u = dt / sus.dura;
    let latido = 0;
    for (const [ms, k] of sus.latidos) if (dt >= ms) latido += k * Math.exp(-(dt - ms) / T_LATIDO);
    return { pos: curvaEn(sus.vaiven, u), tono: curvaEn(sus.tonos, u), publico: clamp01(curvaEn(sus.publico, u)), latido: clamp01(latido) };
  }
  // la costura que se ve: la pedida, mas el tira y afloje del suspenso (fijarCostura sigue cruzando desde la pedida)
  const costuraVista = (t, su = suspensoEn(t)) => {
    const cz = costuraEn(t);
    return su?.pos ? { ...cz, pos: clamp01(cz.pos + su.pos) } : cz;
  };
  let cuadros = 0;
  const arenaEn = (t) => {
    const k = suave((t - tArena) / T_ERA);
    const fin = arenaHacia.k > 0 ? arenaHacia : arenaDesde;
    return { k: mezclar(arenaDesde.k, arenaHacia.k, k), suelo: fin.suelo, haces: fin.haces, publico: fin.publico };
  };
  const par = [0, 0];
  const parObjetivo = [0, 0];

  // la era, con la paleta encima (si hay) y, con la costura, el tono de A encima de todo
  function paramsBase(t) {
    // (antes de la primera era, la primera: alguien puede pedir el fondo o la costura antes que la era)
    if (!pHacia) return paramsDeEra(ERAS[0], col);
    const k = suave((t - tEra) / T_ERA);
    const p = mezclarParams(pDesde, pHacia, k);
    const pal = paletaEn(t);
    if (!(pal.k > 0)) return p;
    return { ...p, luz: mezclarV(p.luz, pal.luz, pal.k), contra: mezclarV(p.contra, pal.contra, pal.k), noche: mezclarV(p.noche, pal.noche, pal.k), vacio: mezclarV(p.vacio, pal.vacio, pal.k) };
  }
  function paramsEn(t, cz = costuraEn(t)) {
    const p = paramsBase(t);
    if (!(cz.aK > 0) || !cz.a) return p;
    return { ...p, ...mezclarColores(p, cz.a, cz.aK) };
  }
  function calmaEn(t) {
    let e = calmaEventos[0];
    for (const x of calmaEventos) if (x.t <= t) e = x;
    return { e, v: mezclar(e.desde, e.hacia, expoOut((t - e.t) / T_CALMA)) };
  }
  // tiempo "lento": el ambiente se mueve mas despacio cuando esta aquietado (integral de la velocidad)
  function tiempoLento(t) {
    const { e } = calmaEn(t);
    const pasos = 16;
    const fin = Math.min(t, e.t + T_CALMA);
    let s = e.base;
    const dt = (fin - e.t) / pasos;
    for (let i = 0; i < pasos; i++) {
      const v = mezclar(e.desde, e.hacia, expoOut(((i + 0.5) * dt) / T_CALMA));
      s += dt * (1 - 0.65 * v);
    }
    if (t > fin) s += (t - fin) * (1 - 0.65 * e.hacia);
    return s;
  }
  function uniformes(t) {
    // el camino quieto (movimiento reducido o INST): el mundo es el cuadro fijo de siempre, sin deriva ni pulsos
    const fijo = quieto();
    const tr = fijo ? REPOSO_REDUCIDO : t;
    const ka = clamp01((t - animo.t) / T_ANIMO);
    const peligro = mezclar(animo.desde[0], animo.hacia[0], suave(ka));
    let gloria = mezclar(animo.desde[1], animo.hacia[1], suave(ka));
    const caida = mezclar(animo.desde[2], animo.hacia[2], suave(ka));
    const dq = t - quiebreT;
    const quiebre = dq >= 0 && !fijo ? Math.exp(-dq / T_QUIEBRE) * (0.7 + 0.3 * Math.cos(dq * 0.05)) : 0;
    const vivoAhora = fijo ? 0 : 1 - (1 - VIVO_EN_CALMA) * calmaEn(t).v;
    // la gloria se asienta (en el camino quieto, ya asentada: el cuadro final)
    gloria *= fijo ? 0.5 : 0.5 + 0.5 * Math.exp(-Math.max(0, t - animo.gloriaT) / 2600);
    const su = suspensoEn(t);
    const pk = fijo ? 0 : su ? Math.min(PULSO_TOPE, pulsoEn(pulsos, t) + su.latido * LATIDO_LUZ) : pulsoEn(pulsos, t);
    const km = expoOut((t - tMarco) / T_ERA);
    let m = { x: mezclar(marcoDesde.x, marco.x, km), y: mezclar(marcoDesde.y, marco.y, km), alto: mezclar(marcoDesde.alto, marco.alto, km), op: mezclar(marcoDesde.op, marco.op, km) };
    const it = intensidad.en(t);
    const lg = medirLugar();
    // en su lugar, el encuadre es el de la ventana; en un takeover (ventana 0) vuelve al de la pantalla
    const kv = lg ? it.ventana * lg.peso : 0;
    if (lg) m = { x: mezclar(m.x, lg.marco.x, kv), y: mezclar(m.y, lg.marco.y, kv), alto: mezclar(m.alto, lg.marco.alto, kv), op: mezclar(m.op, lg.marco.op, kv) };
    const kArte = suave((t - arte.t) / arte.dur);
    const mezclaArte = arte.activa === 1 ? kArte : 1 - kArte;
    // la costura: su presencia baja en el takeover (el estado `costura` de la politica) y el campeon de siempre le deja
    // el lugar (sin costura, kc = 0 y la presencia queda exacta)
    const cz = costuraVista(t, su);
    const kc = cz.k * it.costura;
    const mc = marcosCostura(cz);
    return {
      t: tr / 1000,
      tl: (fijo ? REPOSO_REDUCIDO : tiempoLento(t)) / 1000,
      semilla,
      col,
      p: paramsEn(t, cz),
      cos: [kc, posLinea(cz.pos, cz.ang, cosVertical, cz.m, canvas.width / Math.max(1, canvas.height)), (cz.ang * Math.PI) / 180, cosVertical ? 1 : 0],
      cosF: [mc.a.x, mc.a.y, mc.b.x, mc.b.y],
      cosB: kc > 0 ? cz.b : null,
      marcoA: [mc.a.x, mc.a.y, mc.a.alto, mc.a.op],
      marcoB: [mc.b.x, mc.b.y, mc.b.alto, mc.b.op],
      cosE: [presB(t), it.colorLugar, cz.k, 0],
      l: su ? [lsEn(t), su.publico, su.latido, su.tono] : [lsEn(t), 0, 0, 0],
      d: [calmaEn(t).v, peligro, gloria, pk],
      arte: [mezclaArte, arte.on[0], arte.on[1], velo],
      marco: [m.x, m.y, m.alto, m.op],
      par,
      // w: la politica de color pide que los animos no saquen el color (la linea: js/color.js, `animoConColor`)
      f: [vivoAhora, caida, Math.max(0, quiebre), intensidad.politica.color?.animoConColor ? 1 : 0],
      i: [it.presencia * (1 - kc), it.profundidad, it.bruma, it.vineta],
      j: [it.contraste, it.suave, it.enLugar, kv],
      k: [it.luz, it.polvo, it.contra, 0],
      s: (() => {
        const a = arenaEn(t);
        return [a.k, a.suelo, a.haces, a.publico];
      })(),
      c: [it.colorFondo, it.lavado, it.colorLugar, 0],
      rec: lg ? lg.rec : REC_NADA,
      radio: lg ? lg.radio : 0,
    };
  }
  // El lugar fijo, medido en cada cuadro (el escenario se mueve con la entrada): su rectangulo en uv y el encuadre que
  // pone la cara del campeon adentro.
  function medirLugar() {
    if (!lugar?.nodo?.isConnected) return null;
    const W = contenedor.clientWidth || innerWidth;
    const H = contenedor.clientHeight || innerHeight;
    const r = lugar.nodo.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    const cs = getComputedStyle(lugar.nodo);
    const radio = parseFloat(cs.borderTopLeftRadius) || 0;
    // la opacidad de la ventana es el peso del lugar (la carta del draft se apaga mientras se juega)
    const peso = parseFloat(cs.opacity);
    if (!(peso > 0.001)) return null;
    return {
      peso,
      rec: [r.left / W, 1 - r.bottom / H, r.right / W, 1 - r.top / H],
      radio: radio * ESCALA_ARTE,
      marco: { x: (r.left + r.width * lugar.foco[0]) / W, y: 1 - (r.top + r.height * lugar.foco[1]) / H, alto: (r.height * lugar.escala) / H, op: 1 },
    };
  }
  function medir() {
    const w = Math.max(2, Math.round(contenedor.clientWidth * ESCALA_ARTE));
    const h = Math.max(2, Math.round(contenedor.clientHeight * ESCALA_ARTE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    return false;
  }
  function dibujar() {
    if (!vivo || lienzo.gl.isContextLost()) return;
    medir();
    lienzo.dibujar(uniformes(reloj()));
  }
  function bucle(ahora) {
    raf = requestAnimationFrame(bucle);
    if (pausado || document.hidden || congeladoEn != null) return;
    if (ahora - ultimo < 1000 / FPS_MAX - 2) return;
    ultimo = ahora;
    if (!quieto()) {
      par[0] += (parObjetivo[0] - par[0]) * 0.08;
      par[1] += (parObjetivo[1] - par[1]) * 0.08;
    }
    dibujar();
    cuadros++;
  }
  const alMover = (e) => {
    if (quieto() || celularAhora()) return;
    const w = contenedor.clientWidth || innerWidth;
    const h = contenedor.clientHeight || innerHeight;
    parObjetivo[0] = ((e.clientX / w - 0.5) * 2 * PARALLAX_PX) / w;
    parObjetivo[1] = (-(e.clientY / h - 0.5) * 2 * PARALLAX_PX) / h;
  };
  const alVisibilidad = () => {
    if (!document.hidden) ultimo = 0;
  };
  const alPerderCtx = (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    vivo = false;
    alPerder?.();
  };
  addEventListener('pointermove', alMover, { passive: true });
  document.addEventListener('visibilitychange', alVisibilidad);
  canvas.addEventListener('webglcontextlost', alPerderCtx);
  addEventListener('resize', dibujar);
  raf = requestAnimationFrame(bucle);

  // Dos ranuras: la nueva entra en la que no se ve. Si llega otra mientras dura un cruce (el aura barriendo campeones),
  // espera a que el cruce termine: reemplazar la textura que todavia se esta yendo seria un salto.
  async function ponerArte(key, { dur = T_ARTE, retardo = 0 } = {}) {
    if (key === actual.arte) return arte.carga;
    actual.arte = key;
    const mio = ++arte.token;
    const img = key ? await cargarImagen(urlCentrada(key, opciones.meta)) : null;
    if (mio !== arte.token || !vivo) return;
    const resta = arte.t + arte.dur - reloj();
    if (resta > 0 && congeladoEn == null && !inst() && !reducido()) {
      await new Promise((r) => setTimeout(r, resta + 20));
      if (mio !== arte.token || !vivo) return;
    }
    const slot = 1 - arte.activa;
    if (img) lienzo.textura(slot, img, focoDe(key));
    arte.on[slot] = img ? 1 : 0;
    arte.activa = slot;
    arte.dur = Math.max(1, dur);
    arte.t = inst() || reducido() ? -1e9 : reloj() + retardo;
    dibujar();
  }
  // El arte del lado B de la costura: lo que estaba se apaga (la mitad del cruce), entra la textura nueva y se enciende
  // (la otra mitad). `null`: ese lado queda en su luz sola.
  async function ponerArteB(key, { dur = T_ARTE } = {}) {
    if (key === arteB.key) return arteB.carga;
    arteB.key = key;
    const mio = ++arteB.token;
    const quieto = inst() || reducido();
    const mitad = Math.max(1, dur / 2);
    const ahora = presB(reloj());
    if (ahora > 0 && !quieto) Object.assign(arteB, { desde: ahora, hacia: 0, t: reloj(), dur: mitad });
    const img = key ? await cargarImagen(urlCentrada(key, opciones.meta)) : null;
    if (mio !== arteB.token || !vivo) return;
    const resta = arteB.hacia === 0 ? arteB.t + arteB.dur - reloj() : 0;
    if (img && resta > 0 && congeladoEn == null && !quieto) {
      await new Promise((r) => setTimeout(r, resta + 20));
      if (mio !== arteB.token || !vivo) return;
    }
    if (img) {
      lienzo.textura(2, img, focoDe(key));
      Object.assign(arteB, { desde: quieto ? 1 : 0, hacia: 1, t: quieto ? -1e9 : reloj(), dur: mitad });
    } else Object.assign(arteB, { desde: quieto ? 0 : presB(reloj()), hacia: 0, t: quieto ? -1e9 : reloj(), dur: mitad });
    dibujar();
  }
  // La costura pedida: un objeto (parcial: lo que no viene se mantiene) o null (se apaga).
  function fijarCostura(c, t, dur, instantaneo) {
    const ahora = costuraEn(t);
    const base = paramsBase(t);
    const colBase = { luz: base.luz, contra: base.contra, noche: base.noche, vacio: base.vacio };
    let hacia;
    if (c === null) {
      cosPedida = null;
      hacia = { ...ahora, k: 0, aK: 0 };
    } else {
      cosPedida = { ...(cosPedida ?? {}), ...c, a: { ...(cosPedida?.a ?? {}), ...(c.a ?? {}) }, b: { ...(cosPedida?.b ?? {}), ...(c.b ?? {}) } };
      const k = clamp01(cosPedida.k ?? 1);
      hacia = {
        k,
        pos: clamp01(cosPedida.posicion ?? 0.5),
        ang: Number.isFinite(cosPedida.angulo) ? cosPedida.angulo : ANGULO_COSTURA,
        aK: cosPedida.a.tono ? k : 0,
        a: coloresDe(cosPedida.a.tono, ahora.a ?? colBase),
        b: coloresDe(cosPedida.b.tono, ahora.b ?? colBase),
        // el marco NO se hereda entre llamadas (a diferencia del resto): vale en la llamada que lo trae, y una costura
        // pedida sin `marco` es la de toda la pantalla. Asi el del Swiss nunca se le pega a la pantalla siguiente.
        m: leerMarco(c.marco),
        // (U) las caras se heredan, como la posicion
        cr: leerCaras(cosPedida.caras),
      };
      if (typeof cosPedida.vertical === 'boolean') cosVertical = cosPedida.vertical;
    }
    // desde apagada: la geometria y los colores ya son los nuevos (solo sube la presencia); hacia apagada: se quedan
    const desde = ahora.k > 0 ? ahora : { ...hacia, k: 0, aK: 0 };
    if (hacia.k <= 0) Object.assign(hacia, { a: ahora.a, b: ahora.b, pos: ahora.pos, ang: ahora.ang, m: ahora.m, cr: ahora.cr });
    cosDesde = instantaneo ? hacia : desde;
    cosHacia = hacia;
    tCos = instantaneo ? -1e9 : t;
    durCos = Math.max(1, dur);
  }

  const api = {
    impl: 'webgl',
    ambiente({ era, animo: an, arte: key, encuadre, velo: v, instantaneo: corte = false, retardo = 0, cruce, apuntado, paleta, arena, costura: cos, lightsticks, suspenso } = {}) {
      // retardo: el cambio se programa en el reloj del ambiente (asi congelar(t) lo dibuja fiel en las tiras)
      const t = reloj() + Math.max(0, retardo);
      // (PLANUI §4.10, T) el suspenso: arranca en t; null lo apaga
      if (suspenso !== undefined) sus = quieto() ? null : leerSuspenso(suspenso, t);
      const instantaneo = inst() || reducido() || corte;
      // el aura: apuntar un campeon lleva el mundo al estado `aura` de la politica; soltarlo, de vuelta a la base
      if (typeof apuntado === 'boolean') intensidad.programar(apuntado ? 'aura' : 'base', t, cruce ?? T_AURA);
      if (corte) intensidad.resolverYa(t);
      if (ERAS.includes(era) && (era !== eraHacia || corte)) {
        const nuevo = paramsDeEra(era, col);
        pDesde = pHacia && !instantaneo ? paramsEn(t) : nuevo;
        pHacia = nuevo;
        tEra = !instantaneo && eraHacia ? t : -1e9;
        eraHacia = era;
      }
      if (corte && ANIMOS.includes(an)) actual.animo = null;
      if (ANIMOS.includes(an) && an !== actual.animo) {
        const ka = clamp01((t - animo.t) / T_ANIMO);
        const ahora = [0, 1, 2].map((i) => mezclar(animo.desde[i], animo.hacia[i], ka));
        animo = { desde: instantaneo ? null : ahora, hacia: [an === 'peligro' ? 1 : 0, an === 'gloria' ? 1 : 0, an === 'caida' ? 1 : 0], t: instantaneo ? -1e9 : t, gloriaT: an === 'gloria' ? t : animo.gloriaT };
        animo.desde ??= animo.hacia;
        actual.animo = an;
      }
      const enc = encuadre && ENCUADRES[encuadre] ? ENCUADRES[encuadre] : null;
      if (enc) cosVertical = encuadre === 'celular';
      if (enc) {
        const km = expoOut((t - tMarco) / T_ERA);
        marcoDesde = { x: mezclar(marcoDesde.x, marco.x, km), y: mezclar(marcoDesde.y, marco.y, km), alto: mezclar(marcoDesde.alto, marco.alto, km), op: mezclar(marcoDesde.op, marco.op, km) };
        marco = { ...enc };
        tMarco = instantaneo ? -1e9 : t;
        if (instantaneo) marcoDesde = { ...enc };
      }
      if (typeof v === 'number') velo = v;
      // la paleta de la competicion: { luz, contra (tokens), k } o null (vuelve a la luz de la era)
      // PLANUI §4.9: { luz, contra, noche, vacio (tokens), k }: la noche y el vacio son opcionales (sin ellos, los de siempre)
      if (paleta !== undefined) {
        const nueva = paleta
          ? { luz: leerColor(paleta.luz), contra: leerColor(paleta.contra), noche: paleta.noche ? leerColor(paleta.noche) : col.noche, vacio: paleta.vacio ? leerColor(paleta.vacio) : col.vacio, k: paleta.k ?? 1 }
          : SIN_PALETA;
        const igual = nueva.k === palHacia.k && ['luz', 'contra', 'noche', 'vacio'].every((c) => nueva[c].join() === palHacia[c].join());
        if (!igual) {
          palDesde = instantaneo ? nueva : paletaEn(t);
          palHacia = nueva;
          tPal = instantaneo ? -1e9 : t;
          durPal = Math.max(1, cruce ?? T_ERA);
        }
      }
      if (cos !== undefined) fijarCostura(cos, t, cruce ?? T_ERA, instantaneo);
      if (typeof lightsticks === 'number') {
        const nuevo = clamp01(lightsticks);
        if (nuevo !== lsHacia) {
          lsDesde = instantaneo ? nuevo : lsEn(t);
          lsHacia = nuevo;
          tLs = instantaneo ? -1e9 : t;
          durLs = Math.max(1, cruce ?? T_ERA);
        }
      }
      // la arena: un numero (0-1) o { k, suelo, haces, publico } (el alto del publico en uv; los cabezales y el publico
      // del shader, 1 por defecto: §4.8 los baja)
      if (arena !== undefined) {
        const nueva = typeof arena === 'number'
          ? { k: arena, suelo: arenaHacia.suelo || 0.2, haces: 1, publico: 1 }
          : { k: arena?.k ?? 0, suelo: arena?.suelo ?? 0.2, haces: arena?.haces ?? 1, publico: arena?.publico ?? 1 };
        if (['k', 'suelo', 'haces', 'publico'].some((c) => nueva[c] !== arenaHacia[c])) {
          arenaDesde = instantaneo ? nueva : arenaEn(t);
          arenaHacia = nueva;
          tArena = instantaneo ? -1e9 : t;
        }
      }
      actual.era = eraHacia;
      if (key !== undefined) arte.carga = ponerArte(key, { dur: cruce ?? T_ARTE, retardo });
      // con la costura, su lado A es el campeon de siempre (si viene, gana sobre `arte`) y el B tiene su ranura
      if (cos?.a && 'arte' in cos.a) arte.carga = ponerArte(cos.a.arte ?? null, { dur: cruce ?? T_ARTE, retardo });
      if (cos?.b && 'arte' in cos.b) arteB.carga = ponerArteB(cos.b.arte ?? null, { dur: cruce ?? T_ARTE });
      dibujar();
      return cos !== undefined ? Promise.all([arte.carga, arteB.carga]) : arte.carga;
    },
    // (PLANUI §4.9) la geometria de la costura ahora, para ubicar el DOM encima (el logo del lado solo tono): la
    // presencia, la posicion, el angulo (grados), si esta partida en vertical y donde cae la cara de cada lado (en
    // fracciones de la pantalla, y desde ARRIBA, como el CSS)
    costura() {
      const cz = costuraVista(reloj());
      const mc = marcosCostura(cz);
      return { k: cz.k, posicion: cz.pos, angulo: cz.ang, vertical: cosVertical, a: { x: mc.a.x, y: 1 - mc.a.y }, b: { x: mc.b.x, y: 1 - mc.b.y } };
    },
    // (PLANUI §4.9) cuantos cuadros dibujo el bucle (para medir los cuadros por segundo)
    cuadros: () => cuadros,
    quiebre(retardo = 0) {
      if (reducido() || inst()) return;
      quiebreT = reloj() + retardo;
    },
    // La politica del mundo para esta pantalla (js/fondo.js) y su lugar fijo, si tiene.
    fondo({ politica, lugar: l = null, instantaneo = false, dur = TIEMPOS.pantalla } = {}) {
      limpiarMapas();
      lugar = l;
      intensidad.fijar(politica, reloj(), instantaneo ? 0 : dur);
      dibujar();
    },
    // Un momento (la pantalla de carga de un mapa, el post-game, el resultado): el mundo sube al estado `momento` y
    // despues de `dura` vuelve a la base en ~2 s.
    // `campeones`: [[ms, clave], ...] los campeones del momento (tu pick de cada mapa); si la politica lo pide, el mundo
    // los muestra a su tiempo (en tiempo real: es la demostracion en vivo, no entra en congelar).
    momento({ retardo = 0, dura = 0, campeones = [] } = {}) {
      intensidad.momento(reloj() + Math.max(0, retardo), Math.max(0, dura));
      if (!intensidad.politica.campeonDelMomento || !campeones.length) return;
      limpiarMapas();
      if (inst() || reducido()) {
        ponerArte(campeones[campeones.length - 1][1], { dur: T_CRUCE_MAPA });
        return;
      }
      for (const [ms, key] of campeones) {
        const id = setTimeout(() => {
          mapas.delete(id);
          if (vivo) ponerArte(key, { dur: T_CRUCE_MAPA });
        }, Math.max(0, ms));
        mapas.add(id);
      }
    },
    // Un takeover (AFUERA): el mundo va al 100 % y se queda.
    takeover(retardo = 0) {
      intensidad.takeover(reloj() + Math.max(0, retardo));
    },
    intensidad: () => intensidad.en(reloj()),
    aquietar(si = true) {
      const t = reloj();
      const { v } = calmaEn(t);
      const objetivo = si ? 1 : 0;
      if (calmaEventos[calmaEventos.length - 1].hacia === objetivo) return;
      calmaEventos.push({ t, desde: inst() || reducido() ? objetivo : v, hacia: objetivo, base: tiempoLento(t) });
      if (calmaEventos.length > 32) calmaEventos = calmaEventos.slice(-16);
    },
    pulso(tipo, retardo = 0) {
      if (!(tipo in PULSOS) || quieto()) return;
      const k = PULSOS[tipo];
      const ahora = reloj();
      const u = ubicarPulso(pulsos, ahora + retardo, k, ahora);
      if (!u) return;
      if (u.subir) u.subir.k = k;
      else {
        pulsos.push({ t: u.t, k });
        pulsos.sort((a, b) => a.t - b.t);
        if (pulsos.length > MAX_PULSOS) pulsos = pulsos.slice(-MAX_PULSOS);
      }
    },
    reloj,
    congelar(t) {
      congeladoEn = Math.max(0, t);
      dibujar();
    },
    pausar() {
      pausado = true;
    },
    reanudar() {
      if (congeladoEn != null) {
        t0 = performance.now() - congeladoEn;
        congeladoEn = null;
      }
      pausado = false;
    },
    destruir() {
      if (!vivo && !canvas.isConnected) return;
      limpiarMapas();
      vivo = false;
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', alMover);
      removeEventListener('resize', dibujar);
      document.removeEventListener('visibilitychange', alVisibilidad);
      canvas.removeEventListener('webglcontextlost', alPerderCtx);
      try {
        lienzo.liberar();
        lienzo.gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        /* ya perdido */
      }
      canvas.remove();
    },
    estadoActual: () => ({ ...actual }),
  };
  return api;
}

// ======================================================================================================================
// Respaldo CSS (sin WebGL): capas radiales por era, haces con conic-gradient y el arte en duotono por canvas 2D.
// ======================================================================================================================
function crearAmbienteCss(contenedor, opciones) {
  const raiz = el('div', { class: 'luz-css', 'aria-hidden': 'true', 'data-era': 'pieza', 'data-animo': 'normal' });
  for (const era of ERAS) {
    raiz.append(
      el('div', { class: 'luz-css-era', 'data-era': era }, [
        el('div', { class: 'lc-fuente' }),
        el('div', { class: 'lc-haces' }),
        el('div', { class: 'lc-contra' }),
        el('div', { class: 'lc-escena' }),
      ]),
    );
  }
  const lienzos = [el('canvas', { class: 'lc-arte' }), el('canvas', { class: 'lc-arte' })];
  // PLANUI §4.9: la costura sin WebGL, dos capas recortadas con clip-path (cada una su tono y su arte) y la linea
  const lados = ['a', 'b'].map((l) => el('div', { class: 'lc-cos-lado', 'data-lado': l }, [el('canvas', { class: 'lc-cos-arte' })]));
  const linea = el('div', { class: 'lc-cos-linea' });
  const cajaCos = el('div', { class: 'lc-costura' }, [...lados, linea]);
  raiz.append(...lienzos, cajaCos, el('div', { class: 'lc-vineta' }), el('div', { class: 'lc-velo' }));
  const capaPulso = el('div', { class: 'lc-pulso' });
  raiz.append(capaPulso);
  let pulsosCss = []; // { t (performance.now), k, anim }
  contenedor.prepend(raiz);
  const col = colores();
  let activa = 0;
  let token = 0;
  let actual = { era: 'pieza', animo: 'normal', arte: undefined, img: null };
  let carga = Promise.resolve();
  let t0 = performance.now();
  // la politica del mundo sin WebGL: presencia y desenfoque del arte por variables CSS; lo programado, con temporizadores.
  // (Sin WebGL el lugar fijo no se recorta: en `lugar` el fondo queda en la luz sola.)
  let pol = null;
  let takeoverYa = false;
  let presCss = 1;
  let suaveCss = 0;
  const programados = new Set();
  const programar = (fn, ms) => {
    const id = setTimeout(() => {
      programados.delete(id);
      fn();
    }, Math.max(0, ms));
    programados.add(id);
  };
  const limpiar = () => {
    programados.forEach(clearTimeout);
    programados.clear();
  };
  function poner(k, dur) {
    if (!pol) return;
    const e = k === 'base' ? (takeoverYa ? pol.takeover : pol.reposo) : pol[k] ?? pol.reposo;
    // el takeover de la escena `costura` saca la costura (AFUERA tiene su campeon)
    raiz.toggleAttribute('data-sin-costura', e.costura === 0);
    // sin cambio no se toca nada (la fusion de hoy queda exactamente igual, con su cruce de 900 ms)
    if (e.presencia === presCss && e.suave === suaveCss) return;
    presCss = e.presencia;
    suaveCss = e.suave;
    raiz.style.setProperty('--lc-presencia', String(e.presencia));
    raiz.style.setProperty('--lc-desenfoque', `${Math.round(e.suave * DESENFOQUE_CSS)}px`);
    raiz.style.setProperty('--lc-cruce', `${inst() || reducido() ? 0 : Math.round(dur)}ms`);
    raiz.toggleAttribute('data-suave', e.suave > 0);
  }

  // PLANUI §4.9: la paleta sin WebGL. Pisa la luz y la contra de las eras en esta capa (las capas de luz las leen) y la
  // noche/vacio del fondo; el arte se pinta con su luz y su noche. Sin paleta (o con k < 0,5), lo de siempre.
  let palCss = null;
  function ponerPaleta(paleta) {
    palCss = paleta && (paleta.k ?? 1) >= 0.5 ? paleta : null;
    for (const e of ERAS) {
      for (const c of ['luz', 'contra']) {
        if (palCss) raiz.style.setProperty(`--${c}-${e}`, `var(${palCss[c]})`);
        else raiz.style.removeProperty(`--${c}-${e}`);
      }
    }
    for (const c of ['noche', 'vacio']) {
      if (palCss?.[c]) raiz.style.setProperty(`--lc-${c}`, `var(${palCss[c]})`);
      else raiz.style.removeProperty(`--lc-${c}`);
    }
  }
  const luzArte = (era) => (palCss ? leerColor(palCss.luz) : col[era].luz);
  const nocheArte = () => (palCss?.noche ? leerColor(palCss.noche) : col.noche);
  function pintarArte(img, era, lienzo) {
    const w = Math.round(Math.min(900, (contenedor.clientWidth || innerWidth) * 0.6));
    const h = Math.round(w * 0.5625);
    lienzo.width = w;
    lienzo.height = h;
    pintarCampeon(lienzo, img, nocheArte().map((v) => v * 0.5), luzArte(era), { foco: [0.5, 0.5], mezcla: pol?.reposo.colorFondo ?? 0 });
  }
  // La costura sin WebGL: cada lado recortado por la diagonal (clip-path), con el fondo y el arte en su tono.
  let cosCss = null;
  // donde cae la cara de cada lado, en fracciones de la caja de la costura (desde arriba): la misma cuenta que WebGL
  const carasCss = (pos, vertical, W, H) => {
    const c = carasCostura(pos, vertical, Number.isFinite(cosCss?.angulo) ? cosCss.angulo : ANGULO_COSTURA, W / Math.max(1, H), leerCaras(cosCss?.caras));
    return { a: [c.a.x, 1 - c.a.y], b: [c.b.x, 1 - c.b.y], alto: c.a.alto / (vertical ? COS_ALTO_CEL : COS_ALTO) };
  };
  const cosImg = { a: null, b: null };
  const cosKey = { a: undefined, b: undefined };
  function pintarCosturaCss() {
    const on = Boolean(cosCss) && (cosCss.k ?? 1) > 0;
    raiz.toggleAttribute('data-costura', on);
    if (!on) return;
    const pos = clamp01(cosCss.posicion ?? 0.5);
    const grados = Number.isFinite(cosCss.angulo) ? cosCss.angulo : ANGULO_COSTURA;
    const ang = (grados * Math.PI) / 180;
    // (PLANUI §4.9, A) con `marco`, la caja de la costura es ese rectangulo: las capas y las caras se miden adentro
    const m = cosCss.marco ?? MARCO_TODO;
    for (const [k, v] of [['left', m.x], ['top', m.y], ['width', m.w], ['height', m.h]]) {
      if (m === MARCO_TODO) cajaCos.style.removeProperty(k);
      else cajaCos.style.setProperty(k, `${(v * 100).toFixed(3)}%`);
    }
    const W = (contenedor.clientWidth || innerWidth) * m.w;
    const H = (contenedor.clientHeight || innerHeight) * m.h;
    const vertical = cosCss.vertical ?? celularAhora();
    raiz.style.setProperty('--lc-cos-k', String(clamp01(cosCss.k ?? 1)));
    const pc = (v) => `${(v * 100).toFixed(2)}%`;
    if (vertical) {
      const dy = (0.5 * Math.tan(ang) * W) / H;
      const yl = pos + dy;
      const yr = pos - dy;
      lados[0].style.clipPath = `polygon(0 0, 100% 0, 100% ${pc(yr)}, 0 ${pc(yl)})`;
      lados[1].style.clipPath = `polygon(0 ${pc(yl)}, 100% ${pc(yr)}, 100% 100%, 0 100%)`;
      Object.assign(linea.style, { left: '-20%', top: pc(pos), width: '140%', height: '2px', transform: `rotate(${-grados}deg)` });
    } else {
      const dx = (0.5 * Math.tan(ang) * H) / W;
      const xt = pos + dx;
      const xb = pos - dx;
      lados[0].style.clipPath = `polygon(0 0, ${pc(xt)} 0, ${pc(xb)} 100%, 0 100%)`;
      lados[1].style.clipPath = `polygon(${pc(xt)} 0, 100% 0, 100% 100%, ${pc(xb)} 100%)`;
      Object.assign(linea.style, { left: pc(pos), top: '-20%', width: '2px', height: '140%', transform: `rotate(${grados}deg)` });
    }
    const caras = carasCss(pos, vertical, W, H);
    raiz.style.setProperty('--lc-cos-escala', caras.alto.toFixed(3));
    ['a', 'b'].forEach((l, i) => {
      const tono = cosCss[l]?.tono;
      const lado = lados[i];
      for (const c of ['luz', 'contra', 'noche', 'vacio']) {
        if (tono?.[c]) lado.style.setProperty(`--lc-cos-${c}`, `var(${tono[c]})`);
        else lado.style.removeProperty(`--lc-cos-${c}`);
      }
      lado.style.setProperty('--lc-cos-x', pc(caras[l][0]));
      lado.style.setProperty('--lc-cos-y', pc(caras[l][1]));
      const lienzo = lado.firstChild;
      const img = cosImg[l];
      lienzo.toggleAttribute('data-visible', Boolean(img));
      if (!img) return;
      const w = Math.round(Math.min(900, W * (vertical ? 1.2 : 0.62)));
      lienzo.width = w;
      lienzo.height = Math.round(w * 0.5625);
      const luz = tono ? leerColor(tono.luz) : luzArte(actual.era);
      const noche = tono ? leerColor(tono.noche) : nocheArte();
      pintarCampeon(lienzo, img, noche.map((v) => v * 0.5), luz, { foco: [0.5, 0.5], mezcla: pol?.reposo.colorLugar ?? 0 });
    });
  }
  async function cargarLado(l, key) {
    if (key === cosKey[l]) return;
    cosKey[l] = key;
    const img = key ? await cargarImagen(urlCentrada(key, opciones.meta)) : null;
    if (cosKey[l] !== key) return;
    cosImg[l] = img;
    pintarCosturaCss();
  }
  async function ponerArte(key) {
    actual.arte = key;
    const mio = ++token;
    const img = key ? await cargarImagen(urlCentrada(key, opciones.meta)) : null;
    if (mio !== token) return;
    actual.img = img;
    const sig = 1 - activa;
    if (img) pintarArte(img, actual.era, lienzos[sig]);
    lienzos[sig].toggleAttribute('data-visible', Boolean(img));
    lienzos[activa].removeAttribute('data-visible');
    activa = sig;
  }
  return {
    impl: 'css',
    ambiente({ era, animo, arte: key, encuadre, velo, apuntado, paleta, costura } = {}) {
      raiz.toggleAttribute('data-quieto', inst() || reducido());
      if (typeof apuntado === 'boolean') poner(apuntado ? 'aura' : 'base', T_AURA);
      if (paleta !== undefined) {
        ponerPaleta(paleta);
        if (actual.img) pintarArte(actual.img, actual.era, lienzos[activa]);
      }
      const cargas = [];
      if (costura !== undefined) {
        // (el marco no se hereda entre llamadas, como en WebGL)
        cosCss = costura === null ? null : { ...(cosCss ?? {}), ...costura, a: { ...(cosCss?.a ?? {}), ...(costura.a ?? {}) }, b: { ...(cosCss?.b ?? {}), ...(costura.b ?? {}) }, marco: leerMarco(costura.marco) };
        if (cosCss) cargas.push(cargarLado('a', 'arte' in cosCss.a ? cosCss.a.arte : key !== undefined ? key : actual.arte), cargarLado('b', cosCss.b.arte ?? null));
        pintarCosturaCss();
      } else if (cosCss && key) cargas.push(cargarLado('a', key)); // el aura cambia el lado A
      if (ERAS.includes(era) && era !== actual.era) {
        actual.era = era;
        raiz.dataset.era = era;
        if (actual.img) pintarArte(actual.img, era, lienzos[activa]);
        if (cosCss) pintarCosturaCss();
      } else if (ERAS.includes(era)) raiz.dataset.era = era;
      if (ANIMOS.includes(animo)) raiz.dataset.animo = animo;
      if (encuadre && ENCUADRES[encuadre]) raiz.dataset.encuadre = encuadre;
      if (typeof velo === 'number') raiz.style.setProperty('--lc-velo', String(velo));
      if (key !== undefined && key !== actual.arte) carga = ponerArte(key);
      return cargas.length ? Promise.all([carga, ...cargas]) : carga;
    },
    // (PLANUI §4.9, U) como con WebGL: tambien donde cae la cara de cada lado (fracciones de la pantalla, desde arriba)
    costura() {
      if (!cosCss) return { k: 0 };
      const posicion = clamp01(cosCss.posicion ?? 0.5);
      const vertical = cosCss.vertical ?? celularAhora();
      const m = cosCss.marco ?? MARCO_TODO;
      const W = (contenedor.clientWidth || innerWidth) * m.w;
      const H = (contenedor.clientHeight || innerHeight) * m.h;
      const c = carasCss(posicion, vertical, W, H);
      const cara = ([x, y]) => ({ x: m.x + m.w * x, y: m.y + m.h * y });
      return { k: cosCss.k ?? 1, posicion, angulo: cosCss.angulo ?? ANGULO_COSTURA, vertical, a: cara(c.a), b: cara(c.b) };
    },
    cuadros: () => 0,
    aquietar(si = true) {
      raiz.toggleAttribute('data-calma', si);
    },
    fondo({ politica, instantaneo = false, dur = TIEMPOS.pantalla } = {}) {
      limpiar();
      const repintar = actual.img && pol?.reposo.colorFondo !== politica.reposo.colorFondo;
      pol = politica;
      if (repintar) pintarArte(actual.img, actual.era, lienzos[activa]);
      takeoverYa = false;
      raiz.dataset.fondo = politica.nombre ?? '';
      // (PLANUI §4.9, U) la linea: los animos no sacan el color (estilos/ambiente.css)
      raiz.toggleAttribute('data-animo-color', Boolean(politica.color?.animoConColor));
      poner('reposo', instantaneo ? 0 : dur);
    },
    momento({ retardo = 0, dura = 0 } = {}) {
      programar(() => poner('momento', TIEMPOS.sube), retardo);
      programar(() => poner('base', TIEMPOS.vuelta), retardo + dura);
    },
    takeover(retardo = 0) {
      programar(() => {
        takeoverYa = true;
        poner('takeover', TIEMPOS.sube);
      }, retardo);
    },
    intensidad: () => null,
    // los pulsos se superponen (composite 'add': uno nuevo no corta al anterior), con la misma regla de <= 3 por segundo
    pulso(tipo, retardo = 0) {
      if (!(tipo in PULSOS) || reducido() || inst()) return;
      const k = PULSOS[tipo];
      const ahora = performance.now();
      const u = ubicarPulso(pulsosCss, ahora + retardo, k, ahora);
      if (!u) return;
      const lanzar = (t) => capaPulso.animate([{ opacity: k * 0.5 }, { opacity: 0 }], { duration: 600, delay: t - ahora, easing: 'ease-out', composite: 'add' });
      if (u.subir) {
        u.subir.anim.cancel();
        Object.assign(u.subir, { k, anim: lanzar(u.subir.t) });
        return;
      }
      pulsosCss.push({ t: u.t, k, anim: lanzar(u.t) });
      pulsosCss.sort((a, b) => a.t - b.t);
      if (pulsosCss.length > MAX_PULSOS) pulsosCss = pulsosCss.slice(-MAX_PULSOS);
    },
    quiebre(retardo = 0) {
      if (reducido() || inst()) return;
      raiz.animate([{ filter: 'saturate(0.1) brightness(0.55)', transform: 'translateX(-6px)' }, { filter: 'saturate(0.4) brightness(0.8)', transform: 'translateX(4px)', offset: 0.2 }, { filter: 'none', transform: 'none' }], { duration: 700, delay: retardo, easing: 'ease-out' });
    },
    reloj: () => performance.now() - t0,
    congelar() {
      raiz.setAttribute('data-congelado', '');
    },
    pausar() {
      raiz.setAttribute('data-congelado', '');
    },
    reanudar() {
      raiz.removeAttribute('data-congelado');
      t0 = performance.now();
    },
    destruir() {
      token++;
      limpiar();
      raiz.remove();
    },
    estadoActual: () => ({ era: actual.era, animo: raiz.dataset.animo, arte: actual.arte }),
  };
}

// ======================================================================================================================
// Fabrica con caida automatica al respaldo (atributo, sin contexto, contexto perdido)
// ======================================================================================================================
export function crearAmbiente(contenedor, opciones = {}) {
  if (getComputedStyle(contenedor).position === 'static') contenedor.style.position = 'relative';
  let ultimo = {};
  let ultimoFondo = null;
  let impl = null;
  const aCss = () => {
    impl?.destruir();
    impl = crearAmbienteCss(contenedor, opciones);
    if (ultimoFondo) impl.fondo({ ...ultimoFondo, instantaneo: true });
    impl.ambiente(ultimo);
  };
  if (!document.documentElement.hasAttribute('data-sin-webgl')) impl = crearAmbienteGL(contenedor, opciones, aCss);
  if (!impl) impl = crearAmbienteCss(contenedor, opciones);
  return {
    get impl() {
      return impl.impl;
    },
    ambiente(o = {}) {
      const { apuntado, instantaneo, ...resto } = o;
      ultimo = { ...ultimo, ...resto };
      return impl.ambiente(o);
    },
    fondo(o) {
      ultimoFondo = o;
      impl.fondo(o);
    },
    momento: (o) => impl.momento(o),
    takeover: (retardo) => impl.takeover(retardo),
    intensidad: () => impl.intensidad(),
    costura: () => impl.costura(),
    cuadros: () => impl.cuadros(),
    aquietar: (si) => impl.aquietar(si),
    pulso: (tipo, retardo) => impl.pulso(tipo, retardo),
    quiebre: (retardo) => impl.quiebre(retardo),
    reloj: () => impl.reloj(),
    congelar: (t) => impl.congelar(t),
    pausar: () => impl.pausar(),
    reanudar: () => impl.reanudar(),
    destruir: () => impl.destruir(),
  };
}

// Fotos fijas de cada era con la misma escena (para la pantalla de eras). Devuelve { era: canvas2D } o null sin WebGL.
export async function fotografiar(eras, { ancho, alto, meta, artePorEra = {}, encuadre = 'eras', t = 9000 }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ancho * ESCALA_ARTE);
  canvas.height = Math.round(alto * ESCALA_ARTE);
  const lienzo = crearLienzo(canvas);
  if (!lienzo) return null;
  const col = colores();
  const semilla = crearAzar('a-luz-ambiente').entre(0, 100);
  const enc = ENCUADRES[encuadre];
  const fotos = {};
  for (const era of eras) {
    const key = artePorEra[era];
    const img = key ? await cargarImagen(urlCentrada(key, meta)) : null;
    if (img) lienzo.textura(0, img, focoDe(key));
    lienzo.dibujar({ t: t / 1000, tl: t / 1000, semilla, col, p: paramsDeEra(era, col), d: [0.4, 0, 0, 0], arte: [0, img ? 1 : 0, 0, 0.45], marco: [enc.x, enc.y, enc.alto, enc.op], par: [0, 0], f: [0.3, 0, 0, 0] });
    const foto = document.createElement('canvas');
    foto.width = canvas.width;
    foto.height = canvas.height;
    foto.getContext('2d').drawImage(canvas, 0, 0);
    fotos[era] = foto;
  }
  lienzo.liberar();
  lienzo.gl.getExtension('WEBGL_lose_context')?.loseContext();
  return fotos;
}

// (PLANUI §4.9) Fotos fijas del MISMO campeon en varios tonos (la hoja del kit, linea.html): la escena de una era con la
// luz, la contra, la noche y el vacio de cada tono (objetos de js/tono.js), y el color del arte de la politica
// (`mezcla`: 0 = bitono, 1 = color real). `marco` ([x, y, alto, op]) pisa el encuadre (para acercar la cara).
// Devuelve { id: canvas2D } o null sin WebGL.
export async function fotografiarTonos(tonos, { ancho, alto, meta, arte, era = 'escenario', encuadre = 'eras', marco = null, t = 9000, mezcla = 0 }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(ancho * ESCALA_ARTE);
  canvas.height = Math.round(alto * ESCALA_ARTE);
  const lienzo = crearLienzo(canvas);
  if (!lienzo) return null;
  const col = colores();
  const semilla = crearAzar('a-luz-ambiente').entre(0, 100);
  const enc = ENCUADRES[encuadre];
  const img = arte ? await cargarImagen(urlCentrada(arte, meta)) : null;
  if (img) lienzo.textura(0, img, focoDe(arte));
  const fotos = {};
  for (const tono of tonos) {
    const p = { ...paramsDeEra(era, col), luz: leerColor(tono.luz), contra: leerColor(tono.contra), noche: leerColor(tono.noche), vacio: leerColor(tono.vacio) };
    lienzo.dibujar({ t: t / 1000, tl: t / 1000, semilla, col, p, d: [0.4, 0, 0, 0], arte: [0, img ? 1 : 0, 0, 0.45], marco: marco ?? [enc.x, enc.y, enc.alto, enc.op], par: [0, 0], f: [0.3, 0, 0, 0], c: [mezcla, 0, mezcla, 0] });
    const foto = document.createElement('canvas');
    foto.width = canvas.width;
    foto.height = canvas.height;
    foto.getContext('2d').drawImage(canvas, 0, 0);
    fotos[tono.id] = foto;
  }
  lienzo.liberar();
  lienzo.gl.getExtension('WEBGL_lose_context')?.loseContext();
  return fotos;
}
