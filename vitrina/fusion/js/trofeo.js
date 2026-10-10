// UNA LINEA (PLANUI §4.9; LINEA.md §4.6): la copa en 3D, en tiempo real.
//
//   import { crearTrofeo, copaDe } from './trofeo.js';
//   const copa = crearTrofeo(canvas, { ...copaDe('cblol'), tonos: { luz: '--luz-mundial', contra: '--contra-mundial', noche: '--cu-noche-oro' } });
//   contenedor.append(copa.nodo);   // el canvas, o la copa en SVG si no hay WebGL
//   copa.entrar(600);               // la subida empieza en t = 600 ms (el reloj de beats.js)
//   beats.agregar(copa);            // en(t) la dibuja en t; fps = 30
//   copa.listo.then(...);           // despues del primer cuadro (compilar el shader en Windows puede tardar > 1 s)
//   copa.placa();                   // { x, y, ancho, alto } en px CSS dentro del lienzo: ahi va el <img> del logo
//   copa.destruir();                // libera el contexto (WEBGL_lose_context): si no, visitar la pantalla N veces se
//                                   // come los contextos y el navegador mata el mas viejo, que es el del ambiente
//   copa.foco(0.3, t);              // (PLANUI §4.10) la luz de la copa en el reloj de en(t): la bisagra con dos copas
//
// La tecnica: WebGL2, un triangulo de pantalla completa y raymarching de una SUPERFICIE DE REVOLUCION. El perfil de
// cada copa es una tabla de puntos (y, radio) -copa, cuello, nudo, base- que se interpola en JS (cubica monotona, sin
// sobrepicos) y viaja al shader como una textura de MUESTRAS_PERFIL x 1 (RGBA32F, interpolada a mano): radio de afuera, radio
// del hueco y el factor de Lipschitz local (las pendientes fuertes, como el escalon de la base, piden pasos mas cortos).
// Asi la distancia es O(1): una lectura de textura, sin recorrer segmentos. Encima, por repeticion polar: las asas (un
// toro recortado en el plano del eje, achatado como una hoja), las caras (la seccion de n lados) y las estrias. El
// pedestal (fijo: la copa gira sobre el) lleva la placa, donde la pantalla superpone el logo como <img> (nunca en el
// canvas: CORS).
// El material: metal con BRDF (Fresnel de Schlick, especular GGX con Smith, rugosidad ~0,2-0,3, la aproximacion de Karis
// para el entorno pre-filtrado) que refleja un entorno procedural armado con los tonos de la escena (`luz` arriba como el
// foco, `contra` en dos varas de escenario, `noche` en el piso y lightsticks en el horizonte), un brillo que barre (una
// vara de luz que cruza el entorno), borde de luz, oclusion barata, mapeo de tonos ACES, un halo suave y antialias del
// contorno por cobertura. Salida temprana: el rayo solo marcha dentro del cilindro envolvente; <= PASOS pasos; <= 30 fps;
// la resolucion se adapta sola si un cuadro tarda. Sin WebGL (`webgl=0`) o con el contexto perdido: la copa en SVG,
// con el mismo perfil y su barrido de brillo.
import { el, svg, leerColor } from './util.js';

// ---------------------------------------------------------------------------------------------------- la tabla de copas
// competicion -> { material, perfil }. Las fuentes estan en el README (Los momentos (M)). Donde no se sabe, la copa
// generica dorada.
export const COPAS = {
  worlds: { material: 'plata', perfil: 'invocador' }, // la Copa del Invocador (Tiffany & Co., 2022): plata
  msi: { material: 'oro', perfil: 'generica' }, // sin fuente
  firststand: { material: 'oro', perfil: 'generica' }, // sin fuente
  cblol: { material: 'plata', perfil: 'cblol' }, // 2024: aluminio, plata y rojo cromados, 5 caras y 5 asas
  lec: { material: 'plata', perfil: 'generica' }, // Thomas Lyte (2019): plata; la silueta, sin fuente
  lck: { material: 'oro', perfil: 'lck' }, // "Rise & Victory" (2019): la silueta; el material, sin fuente
  lpl: { material: 'plata', perfil: 'generica' }, // la Copa del Dragon de Plata (Tiffany & Co.)
  lcs: { material: 'oro', perfil: 'reloj' }, // Volpin (2021): reloj de arena con la gema azul; la final, oro y azul
  lcp: { material: 'oro', perfil: 'generica' }, // sin fuente
};
export const copaDe = (idComp) => COPAS[idComp] ?? { material: 'oro', perfil: 'generica' };

// Los perfiles. Unidades: la copa va de y = 0 (la base) a y = 1 (el borde); el pedestal, debajo (y < 0).
//   afuera   [[y, radio], ...]  el perfil de afuera, de abajo hacia arriba (dos puntos casi a la misma altura: un escalon)
//   adentro  [[y, radio], ...]  el hueco de la copa (desde el fondo hasta el borde), o null
//   asas     { n, y, radio, grosor, sale, apertura (grados, a cada lado), achatar }  un toro recortado; `sale`: donde
//            queda su centro, medido desde el eje
//   acento   'asas': las asas en el metal de acento (el rojo cromado del CBLOL)
//   caras    n lados de la seccion (0: redonda) · estrias { n, hondo } · gema { y, radio } (la del LCS)
//   pedestal { ancho, alto, fondo, canto, material: 'laca' | 'madera' } (ancho y fondo, medios) · placa { ancho, alto }
export const PERFILES = {
  generica: {
    nombre: 'Copa generica',
    afuera: [[0, 0.25], [0.04, 0.25], [0.055, 0.215], [0.1, 0.195], [0.14, 0.115], [0.22, 0.062], [0.34, 0.056], [0.375, 0.088], [0.41, 0.06], [0.47, 0.07], [0.56, 0.16], [0.7, 0.24], [0.86, 0.272], [1, 0.288]],
    adentro: [[0.6, 0], [0.64, 0.15], [0.78, 0.236], [1, 0.268]],
    asas: { n: 2, y: 0.735, radio: 0.12, grosor: 0.019, sale: 0.282, apertura: 108, achatar: 1.5 },
    pedestal: { ancho: 0.3, alto: 0.15, fondo: 0.3, canto: 0.02, material: 'laca' },
    placa: { ancho: 0.17, alto: 0.055 },
  },
  invocador: {
    nombre: 'La Copa del Invocador',
    afuera: [[0, 0.3], [0.035, 0.3], [0.05, 0.265], [0.085, 0.25], [0.11, 0.17], [0.17, 0.085], [0.26, 0.058], [0.33, 0.06], [0.37, 0.094], [0.4, 0.094], [0.435, 0.06], [0.49, 0.064], [0.55, 0.13], [0.64, 0.23], [0.76, 0.292], [0.88, 0.326], [0.97, 0.345], [1, 0.35]],
    adentro: [[0.62, 0], [0.66, 0.16], [0.76, 0.258], [0.88, 0.302], [1, 0.33]],
    asas: { n: 2, y: 0.74, radio: 0.155, grosor: 0.024, sale: 0.33, apertura: 112, achatar: 1.7 },
    pedestal: { ancho: 0.36, alto: 0.16, fondo: 0.36, canto: 0.03, material: 'madera' },
    placa: { ancho: 0.2, alto: 0.06 },
  },
  cblol: {
    nombre: 'CBLOL (2024)',
    afuera: [[0, 0.24], [0.04, 0.24], [0.06, 0.2], [0.12, 0.12], [0.22, 0.07], [0.4, 0.056], [0.455, 0.088], [0.5, 0.058], [0.56, 0.088], [0.7, 0.19], [0.86, 0.252], [1, 0.288]],
    adentro: [[0.66, 0], [0.7, 0.14], [0.86, 0.224], [1, 0.264]],
    asas: { n: 5, y: 0.8, radio: 0.19, grosor: 0.013, sale: 0.14, apertura: 80, achatar: 2.6 },
    acento: 'asas',
    caras: 5,
    pedestal: { ancho: 0.29, alto: 0.15, fondo: 0.29, canto: 0.015, material: 'laca' },
    placa: { ancho: 0.17, alto: 0.055 },
  },
  lck: {
    nombre: 'LCK · Rise & Victory (2019)',
    afuera: [[0, 0.2], [0.05, 0.2], [0.07, 0.16], [0.15, 0.1], [0.45, 0.08], [0.62, 0.12], [0.78, 0.22], [0.92, 0.31], [1, 0.326]],
    adentro: [[0.8, 0], [0.84, 0.17], [0.94, 0.272], [1, 0.302]],
    estrias: { n: 35, hondo: 0.006 },
    pedestal: { ancho: 0.27, alto: 0.15, fondo: 0.27, canto: 0.015, material: 'laca' },
    placa: { ancho: 0.17, alto: 0.055 },
  },
  reloj: {
    nombre: 'LCS (2021): el reloj de arena',
    afuera: [[0, 0.26], [0.05, 0.26], [0.1, 0.22], [0.3, 0.14], [0.45, 0.075], [0.5, 0.07], [0.55, 0.075], [0.7, 0.14], [0.9, 0.22], [0.95, 0.26], [1, 0.26]],
    adentro: [[0.965, 0], [1, 0.2]],
    gema: { y: 0.5, radio: 0.105 },
    pedestal: { ancho: 0.3, alto: 0.15, fondo: 0.3, canto: 0.02, material: 'laca' },
    placa: { ancho: 0.17, alto: 0.055 },
  },
};

// Los colores (nombres de token: el hex vive en tokens.css)
const METAL = { oro: '--cu-metal-oro', plata: '--cu-metal-plata' };
const ACENTO = '--cu-metal-rojo';
const GEMA = '--cu-gema-azul';
const LACA = '--cu-laca';
const MADERA = '--cu-madera';
export const TONOS_DEF = { luz: '--luz-mundial', contra: '--contra-mundial', noche: '--cu-noche-oro' };

// ---------------------------------------------------------------------------------------------------- constantes
const FPS_COPA = 30;
const PASOS = 96;
const MUESTRAS_PERFIL = 512;
const VENTANA_LIPSCHITZ = 40; // muestras a cada lado donde se toma el peor factor (un escalon cercano frena el paso)
const LIP_MIN = 0.12;
const LIP_SEGURIDAD = 0.9;
const RUGOSIDAD = { oro: 0.27, plata: 0.22 };
const FOV = (22 * Math.PI) / 180;
const INCLINACION = (7 * Math.PI) / 180; // la camara apenas arriba: se ve el borde de la copa como una elipse finita
const MARGEN = 0.14; // aire alrededor (el halo)
const DPR_MAX = 1.5;
const ESCALA_MIN = 0.45;
const ESCALA_PASO = 0.12;
const CUADRO_LENTO = 38; // ms entre cuadros que ya cuentan como lentos (el objetivo es 30 fps = 33 ms)
const CUADRO_RAPIDO = 34.5;
const MUESTRA_FPS = 12; // cuadros que se promedian antes de cambiar la escala
const PAUSA_CALIDAD = 250; // un en(t) suelto (congelar, el cuadro final) se dibuja a escala plena
export const SUBIDA = 1200; // ms: la copa sube desde abajo hasta el foco
const LUZ_MIN = 0.16; // la exposicion de la copa abajo, antes de entrar en el foco
const GIRO_LENTO = (2 * Math.PI) / 16; // rad/s: una vuelta cada 16 s, asentada
const GIRO_RAPIDO = (2 * Math.PI) / 1.6; // rad/s al arrancar la subida
const TAU_GIRO = 0.75; // s: cuanto tarda en frenar
const GIRO_INICIAL = -0.35;
const BARRIDO = { adelanto: 160, dur: 900, periodo: 6500, durLoop: 1400, desde: -1.55, hasta: 1.55, kLoop: 0.65 };
const HALO = { base: 0.55, golpe: 0.7, ancho: 320 };
// (PLANUI §4.10, D) EL FOCO: dos copas enfrentadas (la bisagra, `var=copas`). foco(k, t, dur) lleva la luz de la copa a k
// (1: la de siempre; 0: apagada) en `dur` ms desde t, en el reloj de en(t). Al subir, la copa toma la luz: un impulso de
// giro que frena solo (como la subida, mas corto) y una pasada del brillo; al bajar se apaga (la exposicion, el foco de
// arriba y el halo). Todo es funcion pura de t (congelar es fiel). Sin llamarlo (el titulo), la copa es la de siempre.
//   expo, luz, halo: lo que queda de cada uno con el foco en 0 · giro: rad/s del impulso por unidad de foco que sube ·
//   tau: s que tarda en frenar · adelanto: ms desde que sube hasta la pasada del brillo · max: eventos que se guardan
const FOCO = { dur: 520, expo: 0.34, luz: 0.3, halo: 0.12, giro: (2 * Math.PI) / 1.8, tau: 0.55, adelanto: 90, max: 16 };

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const suave = (x) => x * x * (3 - 2 * x);
const lineal = (c) => c.map((v) => Math.pow(v, 2.2));

// ---------------------------------------------------------------------------------------------------- el perfil
// Cubica monotona (Fritsch-Carlson): pasa por los puntos sin sobrepicos.
function interpolador(puntos, fuera = null) {
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const n = xs.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  const m = new Array(n).fill(0);
  m[0] = d[0] ?? 0;
  m[n - 1] = d[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return fuera ?? ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// La tabla que viaja al shader: [radio de afuera, radio del hueco, factor de Lipschitz, 0] por muestra.
function tablaPerfil(pf) {
  const N = MUESTRAS_PERFIL;
  const fa = interpolador(pf.afuera);
  const fi = pf.adentro ? interpolador(pf.adentro, 0) : () => 0;
  const r = [];
  const ri = [];
  for (let i = 0; i < N; i++) {
    const y = (i + 0.5) / N;
    r.push(fa(y));
    ri.push(Math.max(0, fi(y)));
  }
  const pend = [];
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(N - 1, i + 1);
    const h = (b - a) / N;
    const d1 = (r[b] - r[a]) / h;
    const d2 = (ri[b] - ri[a]) / h;
    pend.push(1 / Math.sqrt(1 + Math.max(d1 * d1, d2 * d2)));
  }
  const datos = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    let lip = 1;
    for (let j = Math.max(0, i - VENTANA_LIPSCHITZ); j <= Math.min(N - 1, i + VENTANA_LIPSCHITZ); j++) lip = Math.min(lip, pend[j]);
    datos[i * 4] = r[i];
    datos[i * 4 + 1] = ri[i];
    datos[i * 4 + 2] = Math.max(LIP_MIN, lip * LIP_SEGURIDAD);
  }
  return { datos, radio: (y) => fa(clamp01(y)), hueco: (y) => (y < (pf.adentro?.[0]?.[0] ?? 2) ? 0 : fi(y)) };
}

// Las medidas de la escena (el cilindro envolvente y el encuadre).
function geometria(pf) {
  const rCopa = Math.max(...pf.afuera.map((p) => p[1]));
  const rAsas = pf.asas ? pf.asas.sale + pf.asas.radio + pf.asas.grosor : 0;
  const ped = pf.pedestal;
  const rPed = Math.hypot(ped.ancho, ped.fondo);
  const rGema = pf.gema ? pf.gema.radio * 1.1 : 0;
  return { radio: Math.max(rCopa, rAsas, rPed, rGema) + 0.01, rVisible: Math.max(rCopa, rAsas, ped.ancho), yMin: -ped.alto, yMax: 1 };
}

// La camara: mira al centro de la escena desde un poco arriba, a la distancia que la encuadra ("contain").
function camara(geo, aspecto) {
  const tan = Math.tan(FOV / 2);
  const altoMedio = ((geo.yMax - geo.yMin) / 2) * (1 + MARGEN);
  const anchoMedio = geo.rVisible * (1 + MARGEN);
  const dist = Math.max(altoMedio / tan, anchoMedio / (tan * aspecto)) + geo.rVisible;
  const cy = (geo.yMin + geo.yMax) / 2;
  const pos = [0, cy + dist * Math.sin(INCLINACION), dist * Math.cos(INCLINACION)];
  const f = norm([0 - pos[0], cy - pos[1], 0 - pos[2]]);
  const r = norm(cruz(f, [0, 1, 0]));
  const u = cruz(r, f);
  return { pos, f, r, u, tan };
}
const norm = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// un punto del mundo -> px CSS dentro de un lienzo de ancho x alto
function proyectar(cam, p, ancho, alto) {
  const v = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]];
  const z = punto(v, cam.f);
  const sx = punto(v, cam.r) / (z * 2 * cam.tan);
  const sy = punto(v, cam.u) / (z * 2 * cam.tan);
  return [ancho / 2 + sx * alto, alto / 2 - sy * alto];
}
function rectPlaca(pf, cam, ancho, alto) {
  const ped = pf.pedestal;
  const cy = -ped.alto / 2;
  const z = ped.fondo + 0.006;
  const esquinas = [[-pf.placa.ancho, cy - pf.placa.alto, z], [pf.placa.ancho, cy - pf.placa.alto, z], [-pf.placa.ancho, cy + pf.placa.alto, z], [pf.placa.ancho, cy + pf.placa.alto, z]].map((p) => proyectar(cam, p, ancho, alto));
  const xs = esquinas.map((e) => e[0]);
  const ys = esquinas.map((e) => e[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, ancho: Math.max(...xs) - x, alto: Math.max(...ys) - y };
}

// ---------------------------------------------------------------------------------------------------- el tiempo
// El foco en t (PLANUI §4.10): { nivel, giro (rad extra), barrido ([pos, k] o null) }. `f`: { inicial, base, eventos }.
function focoEn(t, f) {
  let nivel = f.inicial;
  let giro = f.base;
  let barrido = null;
  for (const e of f.eventos) {
    if (e.t > t) break;
    nivel = e.desde + (e.hacia - e.desde) * suave(clamp01((t - e.t) / e.dur));
    const sube = e.hacia - e.desde;
    if (sube <= 0) continue;
    giro += sube * FOCO.giro * FOCO.tau * (1 - Math.exp(-(t - e.t) / 1000 / FOCO.tau));
    const k = (t - e.t - FOCO.adelanto) / BARRIDO.dur;
    if (k >= 0 && k <= 1) barrido = [BARRIDO.desde + (BARRIDO.hasta - BARRIDO.desde) * k, Math.sin(Math.PI * k) * Math.min(1, sube * 1.4)];
  }
  return { nivel, giro, barrido };
}

// Lo que cambia con t (funcion pura de t: congelar(t) es fiel). t0: cuando empieza la subida (null: ya asentada).
// f: el foco (null: sin foco, la copa de siempre).
function cuadroEn(t, t0, f = null) {
  const asentada = t0 == null;
  const s = asentada ? t / 1000 : (t - t0) / 1000;
  const prog = asentada ? 1 : clamp01((t - t0) / SUBIDA);
  const giro = asentada
    ? GIRO_INICIAL + GIRO_LENTO * s
    : GIRO_INICIAL + (s <= 0 ? 0 : GIRO_LENTO * s + (GIRO_RAPIDO - GIRO_LENTO) * TAU_GIRO * (1 - Math.exp(-s / TAU_GIRO)));
  const luzK = LUZ_MIN + (1 - LUZ_MIN) * suave(clamp01((prog - 0.3) / 0.7));
  const llegada = asentada ? -Infinity : t0 + SUBIDA;
  // el brillo que barre: una pasada fuerte al llegar y despues una cada BARRIDO.periodo
  let barrido = [0, 0];
  const iniBarrido = llegada - BARRIDO.adelanto;
  const enLlegada = (t - iniBarrido) / BARRIDO.dur;
  if (enLlegada >= 0 && enLlegada <= 1) barrido = [BARRIDO.desde + (BARRIDO.hasta - BARRIDO.desde) * enLlegada, Math.sin(Math.PI * enLlegada)];
  else {
    const desde = asentada ? t : t - iniBarrido - BARRIDO.dur;
    if (desde > 0) {
      const k = (desde % BARRIDO.periodo) / BARRIDO.durLoop;
      if (k <= 1) barrido = [BARRIDO.desde + (BARRIDO.hasta - BARRIDO.desde) * k, Math.sin(Math.PI * k) * BARRIDO.kLoop];
    }
  }
  const golpe = asentada ? 0 : Math.exp(-(((t - llegada) / HALO.ancho) ** 2));
  const c = { giro, luzK, barrido, halo: HALO.base * suave(prog) + HALO.golpe * golpe, oculta: !asentada && t < t0, expo: 1 };
  if (!f) return c;
  const fo = focoEn(t, f);
  const mix = (lo) => lo + (1 - lo) * fo.nivel;
  return { ...c, giro: c.giro + fo.giro, luzK: c.luzK * mix(FOCO.luz), halo: c.halo * mix(FOCO.halo), expo: mix(FOCO.expo), barrido: fo.barrido && fo.barrido[1] > c.barrido[1] ? fo.barrido : c.barrido };
}

// ---------------------------------------------------------------------------------------------------- shaders
const VERT = `#version 300 es
layout(location = 0) in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 salida;
uniform vec2 uRes;
uniform vec3 uCamPos, uCamR, uCamU, uCamF;
uniform float uTan, uRot, uLuzK, uHalo, uRug, uLip, uAcentoEn, uExpo;
uniform vec2 uBarrido;
uniform vec3 uLuz, uContra, uNoche, uMetal, uAcento, uGemaC, uLaca, uMadera, uBound;
uniform vec4 uAsa, uAsa2, uForma, uPed, uPed2, uGema;
uniform sampler2D uPerfil;
const float PI = 3.14159265;
const float TAU = 6.2831853;
const int PASOS = ${PASOS};
const int N = ${MUESTRAS_PERFIL};
const vec3 LUZ_1 = vec3(-0.4472, 0.7826, 0.4332);
const vec3 LUZ_2 = vec3(0.7071, 0.3536, -0.6124);

mat2 giro(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
// el perfil a la altura y (RGBA32F sin filtro: la interpolacion es a mano; el medio flotante no alcanza para las normales)
vec4 perfil(float y) {
  float x = clamp(y, 0.0, 1.0) * float(N) - 0.5;
  float i = floor(x);
  vec4 a = texelFetch(uPerfil, ivec2(int(clamp(i, 0.0, float(N - 1))), 0), 0);
  vec4 b = texelFetch(uPerfil, ivec2(int(clamp(i + 1.0, 0.0, float(N - 1))), 0), 0);
  return mix(a, b, x - i);
}

// la copa, en su propio espacio (gira): cuerpo de revolucion + asas + gema, menos el hueco
float copa(vec3 p, out float mat) {
  float ang = atan(p.z, p.x);
  float q = length(p.xz);
  float qc = q;
  if (uForma.x > 2.5) { float s = TAU / uForma.x; float a = mod(ang + 0.5 * s, s) - 0.5 * s; qc = q * cos(a); }
  float qe = qc;
  if (uForma.y > 0.5) qe += uForma.z * (0.5 - 0.5 * cos(ang * uForma.y));
  vec4 pr = perfil(p.y);
  float d = max((qe - pr.r) * pr.b, max(-p.y, p.y - 1.0));
  mat = 0.0;
  if (uAsa.x > 0.5) {
    float s = TAU / uAsa.x;
    float a = mod(ang + 0.5 * s, s) - 0.5 * s;
    vec3 c = vec3(abs(p.y - uAsa.y), q * cos(a) - uAsa2.x, q * sin(a) * uAsa2.w);
    float k = (uAsa2.y * c.x > uAsa2.z * c.y) ? dot(c.xy, uAsa2.zy) : length(c.xy);
    float da = (sqrt(max(dot(c, c) + uAsa.z * uAsa.z - 2.0 * uAsa.z * k, 0.0)) - uAsa.w) / uAsa2.w;
    if (da < d) { d = da; mat = uAcentoEn; }
  }
  if (uGema.z > 0.5) {
    vec3 g = p - vec3(0.0, uGema.x, 0.0);
    float dg = max(length(g) - uGema.y, (abs(g.x) + abs(g.y) + abs(g.z) - uGema.y * 1.3) * 0.57735);
    if (dg < d) { d = dg; mat = 4.0; }
  }
  if (pr.g > 0.0005) d = max(d, (pr.g - qc) * pr.b);
  return d * uLip;
}
// el pedestal (fijo) con la placa al frente
float pedestal(vec3 p, out float mat) {
  vec3 c = p - vec3(0.0, -0.5 * uPed.y, 0.0);
  vec3 q = abs(c) - (vec3(uPed.x, 0.5 * uPed.y, uPed.z) - uPed.w);
  float d = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - uPed.w;
  vec3 qp = abs(c - vec3(0.0, 0.0, uPed.z)) - vec3(uPed2.x, uPed2.y, 0.006);
  float dp = length(max(qp, 0.0)) + min(max(qp.x, max(qp.y, qp.z)), 0.0) - 0.002;
  mat = 2.0;
  if (dp < d) { d = dp; mat = 3.0; }
  return d;
}
float escena(vec3 p, out float mat) {
  vec3 pc = p;
  pc.xz = giro(uRot) * pc.xz;
  float m1, m2;
  float d1 = copa(pc, m1);
  float d2 = pedestal(p, m2);
  mat = d1 < d2 ? m1 : m2;
  return min(d1, d2);
}
vec3 normal(vec3 p, float e) {
  const vec2 k = vec2(1.0, -1.0);
  float m;
  return normalize(k.xyy * escena(p + k.xyy * e, m) + k.yyx * escena(p + k.yyx * e, m) + k.yxy * escena(p + k.yxy * e, m) + k.xxx * escena(p + k.xxx * e, m));
}
// el entorno: lo que refleja el metal, armado con los tonos de la escena. r: rugosidad (ensancha todo)
vec3 entorno(vec3 d, float r) {
  float w = 0.06 + r * 0.8;
  float az = atan(d.x, d.z);
  vec3 blanca = mix(uLuz, vec3(1.0), 0.45);
  // el piso del escenario (tenido de la luz cerca del horizonte) y el fondo
  vec3 c = mix(uNoche + uLuz * 0.1, uNoche + uLuz * 0.3, smoothstep(-0.9, -0.02, d.y));
  c = mix(c, uNoche * 1.2, smoothstep(0.05, 0.6, d.y));
  // el horizonte: la banda del publico con sus lightsticks
  float banda = smoothstep(-0.2 - w, -0.03, d.y) * (1.0 - smoothstep(0.05, 0.2 + w, d.y));
  c += uLuz * banda * 0.14;
  float celda = floor(az * 14.0);
  float h = fract(sin(celda * 91.7) * 43758.5453);
  float chispa = smoothstep(0.62, 1.0, h) * exp(-pow((fract(az * 14.0) - 0.5) / (0.1 + r), 2.0)) * banda;
  c += mix(uLuz, uContra, h) * chispa * 1.4;
  // el relleno detras de la camara (ancho y suave: el frente de la copa refleja algo, no un negro)
  c += blanca * exp(-pow(az / (0.75 + w), 2.0)) * smoothstep(-0.35, 0.1, d.y) * (1.0 - smoothstep(0.45, 0.85, d.y)) * 0.38;
  // el foco de arriba
  c += blanca * smoothstep(0.48 - w, 0.84, d.y) * 3.2 * uLuzK;
  // dos varas de escenario, a los costados (las rayas verticales del metal)
  float alto = smoothstep(-0.3, 0.1, d.y) * (1.0 - smoothstep(0.7, 0.95, d.y));
  c += mix(uContra, vec3(1.0), 0.3) * (exp(-pow((az - 1.1) / (0.11 + w), 2.0)) + 0.8 * exp(-pow((az + 1.25) / (0.11 + w), 2.0))) * alto * 2.2;
  // el brillo que barre
  c += mix(uLuz, vec3(1.0), 0.6) * exp(-pow((az - uBarrido.x) / (0.07 + w), 2.0)) * smoothstep(-0.45, 0.1, d.y) * uBarrido.y * 4.5;
  return c;
}
vec3 envBRDF(vec3 f0, float r, float nv) {
  vec4 q = r * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
  float a = min(q.x * q.x, exp2(-9.28 * nv)) * q.x + q.y;
  vec2 ab = vec2(-1.04, 1.04) * a + q.zw;
  return f0 * ab.x + ab.y;
}
vec3 ggx(vec3 n, vec3 v, vec3 l, vec3 c, vec3 f0, float r) {
  vec3 h = normalize(l + v);
  float nl = max(dot(n, l), 0.0), nh = max(dot(n, h), 0.0), nv = max(dot(n, v), 0.001), vh = max(dot(v, h), 0.0);
  float a2 = r * r * r * r;
  float f = nh * nh * (a2 - 1.0) + 1.0;
  float k = (r + 1.0) * (r + 1.0) / 8.0;
  float g = (nl / (nl * (1.0 - k) + k)) * (nv / (nv * (1.0 - k) + k));
  vec3 fr = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
  return a2 / (PI * f * f) * g * fr / max(4.0 * nl * nv, 0.001) * nl * c;
}
vec3 sombrear(vec3 p, vec3 rd, float t, float pix) {
  float mat;
  escena(p, mat);
  vec3 n = normal(p, max(0.0005, pix * t * 0.6));
  vec3 v = -rd;
  float nv = max(dot(n, v), 0.001);
  vec3 f0 = uMetal;
  float r = uRug;
  vec3 dif = vec3(0.0);
  if (mat > 0.5 && mat < 1.5) { f0 = uAcento; r = uRug * 0.85; }
  else if (mat > 1.5 && mat < 2.5) {
    bool madera = uPed2.z > 0.5;
    dif = madera ? uMadera * (0.8 + 0.2 * sin(p.x * 140.0 + sin(p.y * 38.0 + p.z * 9.0) * 2.5)) : uLaca;
    f0 = vec3(0.04);
    r = madera ? 0.5 : 0.3;
  } else if (mat > 2.5 && mat < 3.5) {
    vec3 c = p - vec3(0.0, -0.5 * uPed.y, uPed.z);
    bool marco = abs(c.x) > uPed2.x - 0.011 || abs(c.y) > uPed2.y - 0.011;
    f0 = marco ? uMetal : vec3(0.04);
    r = marco ? uRug : 0.22;
    dif = marco ? vec3(0.0) : uLaca * 0.5;
  } else if (mat > 3.5) { f0 = uGemaC; r = 0.08; dif = uGemaC * 0.6; }
  float m2;
  float ao = clamp(0.3 + 0.7 * escena(p + n * 0.03, m2) / 0.03, 0.0, 1.0) * clamp(0.45 + 0.55 * escena(p + n * 0.09, m2) / 0.09, 0.0, 1.0);
  vec3 col = entorno(reflect(rd, n), r) * envBRDF(f0, r, nv);
  col += dif * entorno(n, 1.0) * 0.35;
  col += ggx(n, v, LUZ_1, uLuz * 2.4 * uLuzK, f0, r) + ggx(n, v, LUZ_2, uContra * 1.5, f0, r);
  col *= ao;
  col += uContra * pow(1.0 - nv, 4.0) * 0.55 * uLuzK;
  return col;
}
vec2 envolvente(vec3 ro, vec3 rd) {
  float a = dot(rd.xz, rd.xz), b = dot(ro.xz, rd.xz), c = dot(ro.xz, ro.xz) - uBound.x * uBound.x;
  float h = b * b - a * c;
  if (h < 0.0 || a < 1e-6) return vec2(-1.0);
  h = sqrt(h);
  float ry = abs(rd.y) < 1e-5 ? 1e-5 : rd.y;
  float y0 = (uBound.y - ro.y) / ry, y1 = (uBound.z - ro.y) / ry;
  float t0 = max((-b - h) / a, min(y0, y1)), t1 = min((-b + h) / a, max(y0, y1));
  if (t1 < max(t0, 0.0)) return vec2(-1.0);
  return vec2(max(t0, 0.0), t1);
}
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 rd = normalize(uCamF + (uv.x * 2.0 * uTan) * uCamR + (uv.y * 2.0 * uTan) * uCamU);
  vec3 ro = uCamPos;
  float pix = 2.0 * uTan / uRes.y;
  vec3 col = vec3(0.0);
  float alfa = 0.0;
  vec2 tb = envolvente(ro, rd);
  if (tb.x >= 0.0) {
    float t = tb.x, mejor = 1e9, tMejor = t, m;
    bool toco = false;
    for (int i = 0; i < PASOS; i++) {
      float d = escena(ro + rd * t, m);
      if (d < 0.3 * pix * t) { toco = true; tMejor = t; break; }
      float dt = d / t;
      if (dt < mejor) { mejor = dt; tMejor = t; }
      t += min(d, 0.06);
      if (t > tb.y) break;
    }
    alfa = toco ? 1.0 : 1.0 - smoothstep(0.0, 1.0, mejor / pix);
    if (alfa > 0.0) col = pow(aces(sombrear(ro + rd * tMejor, rd, tMejor, pix) * uExpo), vec3(0.4545));
  }
  // el halo: la luz alrededor de la copa (cerca del eje, segun el perfil a esa altura), que se apaga en los bordes
  float a2 = dot(rd.xz, rd.xz);
  vec3 pc = ro + rd * (a2 > 1e-6 ? -dot(ro.xz, rd.xz) / a2 : 0.0);
  float rp = perfil(pc.y).r;
  float fuera = max(length(pc.xz) - rp, 0.0) + max(-pc.y, 0.0) * 0.8 + max(pc.y - 1.0, 0.0);
  vec2 e = gl_FragCoord.xy / uRes;
  float borde = smoothstep(0.0, 0.14, e.x) * smoothstep(0.0, 0.14, 1.0 - e.x) * smoothstep(0.0, 0.1, e.y) * smoothstep(0.0, 0.12, 1.0 - e.y);
  vec3 halo = pow(uLuz, vec3(0.4545)) * exp(-fuera * 8.0) * borde * uHalo * 0.5 * (1.0 - alfa);
  salida = vec4(col * alfa + halo, alfa);
}`;

const UNIFORMES = ['uRes', 'uCamPos', 'uCamR', 'uCamU', 'uCamF', 'uTan', 'uRot', 'uLuzK', 'uHalo', 'uRug', 'uLip', 'uAcentoEn', 'uExpo', 'uBarrido', 'uLuz', 'uContra', 'uNoche', 'uMetal', 'uAcento', 'uGemaC', 'uLaca', 'uMadera', 'uBound', 'uAsa', 'uAsa2', 'uForma', 'uPed', 'uPed2', 'uGema', 'uPerfil'];

// ---------------------------------------------------------------------------------------------------- WebGL2
function crearGL(lienzo, { pf, material, tonos, alPerder }) {
  const gl = lienzo.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const geo = geometria(pf);
  const tabla = tablaPerfil(pf);
  const paralelo = gl.getExtension('KHR_parallel_shader_compile');
  const sombreador = (tipo, src) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const vs = sombreador(gl.VERTEX_SHADER, VERT);
  const fs = sombreador(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  let U = null;
  let vivo = true;
  let pendiente = null; // el ultimo cuadro pedido antes de que el programa este listo
  let ultimoC = null; // el ultimo cuadro dibujado (redimensionar borra el lienzo: se vuelve a dibujar)
  let cam = null;
  let css = { ancho: 0, alto: 0 };
  let escala = 1;
  let intervalos = [];
  let ultimo = 0;
  let resolverListo;
  const listo = new Promise((r) => (resolverListo = r));

  const vao = gl.createVertexArray();
  const buf = gl.createBuffer();
  const tex = gl.createTexture();
  function preparar() {
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[copa] el shader no compilo, uso la copa en SVG:', gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(prog));
      resolverListo();
      alPerder?.();
      return;
    }
    gl.useProgram(prog);
    U = Object.fromEntries(UNIFORMES.map((n) => [n, gl.getUniformLocation(prog, n)]));
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, MUESTRAS_PERFIL, 1, 0, gl.RGBA, gl.FLOAT, tabla.datos);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.uniform1i(U.uPerfil, 0);
    // lo que no cambia
    const col = (tok) => lineal(leerColor(tok));
    gl.uniform3fv(U.uMetal, col(METAL[material] ?? METAL.oro));
    gl.uniform3fv(U.uAcento, col(pf.acento ? ACENTO : METAL[material] ?? METAL.oro));
    gl.uniform1f(U.uAcentoEn, pf.acento === 'asas' ? 1 : 0);
    gl.uniform3fv(U.uGemaC, col(GEMA));
    gl.uniform3fv(U.uLaca, lineal(leerColor(tonos.noche)).map((v, i) => v * 0.5 + col(LACA)[i] * 0.5));
    gl.uniform3fv(U.uMadera, col(MADERA));
    gl.uniform3fv(U.uLuz, col(tonos.luz));
    gl.uniform3fv(U.uContra, col(tonos.contra));
    gl.uniform3fv(U.uNoche, col(tonos.noche));
    gl.uniform1f(U.uRug, RUGOSIDAD[material] ?? RUGOSIDAD.oro);
    const a = pf.asas;
    gl.uniform4f(U.uAsa, a ? a.n : 0, a?.y ?? 0, a?.radio ?? 0, a?.grosor ?? 0);
    const ap = ((a?.apertura ?? 90) * Math.PI) / 180;
    gl.uniform4f(U.uAsa2, a?.sale ?? 0, Math.cos(ap), Math.sin(ap), a?.achatar ?? 1);
    const est = pf.estrias;
    gl.uniform4f(U.uForma, pf.caras ?? 0, est?.n ?? 0, est?.hondo ?? 0, 0);
    // las estrias inclinan el gradiente: se compensa con un factor global (el radio mas fino de la copa)
    const rMin = Math.min(...pf.afuera.map((p) => p[1]));
    gl.uniform1f(U.uLip, est ? 1 / Math.sqrt(1 + ((est.hondo * est.n) / 2 / rMin) ** 2) : 1);
    const ped = pf.pedestal;
    gl.uniform4f(U.uPed, ped.ancho, ped.alto, ped.fondo, ped.canto);
    gl.uniform4f(U.uPed2, pf.placa.ancho, pf.placa.alto, ped.material === 'madera' ? 1 : 0, 0);
    gl.uniform4f(U.uGema, pf.gema?.y ?? 0, pf.gema?.radio ?? 0, pf.gema ? 1 : 0, 0);
    gl.uniform3f(U.uBound, geo.radio, geo.yMin - 0.01, geo.yMax + 0.01);
    medir(true);
    const c = pendiente;
    pendiente = null;
    if (c) dibujar(c, true);
    else gl.clear(gl.COLOR_BUFFER_BIT);
    requestAnimationFrame(() => resolverListo());
  }
  if (paralelo) {
    const sondear = () => {
      if (!vivo) return;
      if (gl.getProgramParameter(prog, paralelo.COMPLETION_STATUS_KHR)) preparar();
      else requestAnimationFrame(sondear);
    };
    requestAnimationFrame(sondear);
  } else queueMicrotask(() => vivo && preparar());

  function medir(forzar = false) {
    const ancho = lienzo.clientWidth;
    const alto = lienzo.clientHeight;
    if (!ancho || !alto) return false;
    const dpr = Math.min(DPR_MAX, devicePixelRatio || 1);
    const w = Math.max(2, Math.round(ancho * dpr * escala));
    const h = Math.max(2, Math.round(alto * dpr * escala));
    if (!forzar && w === lienzo.width && h === lienzo.height && ancho === css.ancho && alto === css.alto) return true;
    css = { ancho, alto };
    lienzo.width = w;
    lienzo.height = h;
    cam = camara(geo, ancho / alto);
    if (U) {
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.uRes, w, h);
      gl.uniform3fv(U.uCamPos, cam.pos);
      gl.uniform3fv(U.uCamR, cam.r);
      gl.uniform3fv(U.uCamU, cam.u);
      gl.uniform3fv(U.uCamF, cam.f);
      gl.uniform1f(U.uTan, cam.tan);
    }
    return true;
  }
  // La resolucion se adapta: si los cuadros llegan lentos, baja; si sobran, sube de a poco.
  function adaptar(ahora) {
    const dt = ultimo ? ahora - ultimo : 0;
    ultimo = ahora;
    if (!dt || dt > PAUSA_CALIDAD) {
      intervalos = [];
      return dt > PAUSA_CALIDAD;
    }
    intervalos.push(dt);
    if (intervalos.length < MUESTRA_FPS) return false;
    const media = intervalos.reduce((s, x) => s + x, 0) / intervalos.length;
    intervalos = [];
    const antes = escala;
    if (media > CUADRO_LENTO) escala = Math.max(ESCALA_MIN, escala - ESCALA_PASO);
    else if (media < CUADRO_RAPIDO) escala = Math.min(1, escala + ESCALA_PASO / 2);
    if (escala !== antes) medir(true);
    return false;
  }
  function dibujar(c, calidad = false) {
    if (!vivo || gl.isContextLost()) return;
    if (!U) {
      pendiente = c;
      return;
    }
    ultimoC = c;
    if (calidad && escala < 1) {
      escala = 1;
      medir(true);
    } else if (!medir()) return;
    gl.clearColor(0, 0, 0, 0);
    if (c.oculta) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    gl.uniform1f(U.uRot, c.giro);
    gl.uniform1f(U.uLuzK, c.luzK);
    gl.uniform2f(U.uBarrido, c.barrido[0], c.barrido[1]);
    gl.uniform1f(U.uHalo, c.halo);
    gl.uniform1f(U.uExpo, c.expo ?? 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return {
    nodo: lienzo,
    gl,
    listo,
    dibujar(c, fijo = false) {
      const suelto = adaptar(performance.now());
      dibujar(c, suelto || fijo);
    },
    // redimensionar (el ResizeObserver, la pantalla): si cambio el tamano, el lienzo quedo en blanco y se redibuja
    medir() {
      const antes = [lienzo.width, lienzo.height, css.ancho, css.alto].join();
      if (!medir()) return;
      if (ultimoC && antes !== [lienzo.width, lienzo.height, css.ancho, css.alto].join()) dibujar(ultimoC, true);
    },
    placa() {
      if (!cam && !medir(true)) return null;
      return rectPlaca(pf, cam, css.ancho, css.alto);
    },
    escala: () => escala,
    destruir() {
      vivo = false;
      resolverListo?.();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
      gl.deleteVertexArray(vao);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// ---------------------------------------------------------------------------------------------------- la copa en SVG
let instancias = 0;
const ESCALA_SVG = 1000;
function crearSvg({ pf, material }) {
  const id = `cu-copa-${++instancias}`;
  const geo = geometria(pf);
  const tabla = tablaPerfil(pf);
  const ancho = geo.rVisible * (1 + MARGEN) * 2 * ESCALA_SVG;
  const alto = (geo.yMax - geo.yMin) * (1 + MARGEN) * ESCALA_SVG;
  const cx = ancho / 2;
  const piso = alto - ((alto - (geo.yMax - geo.yMin) * ESCALA_SVG) / 2) - pf.pedestal.alto * ESCALA_SVG; // y = 0 de la copa
  const X = (r) => r * ESCALA_SVG;
  const Y = (y) => piso - y * ESCALA_SVG;
  const PASOS_SVG = 80;
  const der = [];
  for (let i = 0; i <= PASOS_SVG; i++) {
    const y = i / PASOS_SVG;
    der.push([cx + X(tabla.radio(y)), Y(y)]);
  }
  const izq = der.map(([x, y]) => [2 * cx - x, y]).reverse();
  const cuerpo = `M${[...der, ...izq].map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z`;
  const asas = [];
  if (pf.asas) {
    const a = pf.asas;
    const ap = (a.apertura * Math.PI) / 180;
    for (const lado of [1, -1]) {
      const c = [cx + lado * X(a.sale), Y(a.y)];
      const p0 = [c[0] + lado * X(a.radio) * Math.cos(-ap), c[1] - X(a.radio) * Math.sin(-ap)];
      const p1 = [c[0] + lado * X(a.radio) * Math.cos(ap), c[1] - X(a.radio) * Math.sin(ap)];
      asas.push(`M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${X(a.radio).toFixed(1)} ${X(a.radio).toFixed(1)} 0 1 ${lado > 0 ? 0 : 1} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`);
    }
  }
  const ped = pf.pedestal;
  const raiz = svg('svg', { class: 'cu-lienzo cu-copa-svg', viewBox: `0 0 ${ancho.toFixed(0)} ${alto.toFixed(0)}`, preserveAspectRatio: 'xMidYMid meet', 'data-material': material, 'aria-hidden': 'true', focusable: 'false' });
  const brillo = svg('linearGradient', { id: `${id}-b`, gradientUnits: 'userSpaceOnUse', x1: '0', y1: '0', x2: String(ancho * 0.18), y2: String(-alto * 0.06) }, [
    svg('stop', { offset: '0', class: 'cu-svg-nada' }),
    svg('stop', { offset: '0.5', class: 'cu-svg-luz' }),
    svg('stop', { offset: '1', class: 'cu-svg-nada' }),
  ]);
  const metal = svg('linearGradient', { id: `${id}-m`, x1: '0', y1: '0', x2: '1', y2: '0' }, ['cu-svg-p0', 'cu-svg-p1', 'cu-svg-p2', 'cu-svg-p3', 'cu-svg-p4'].map((c, i) => svg('stop', { offset: String(i / 4), class: c })));
  const acentoId = pf.acento ? `${id}-a` : `${id}-m`;
  const acento = pf.acento ? svg('linearGradient', { id: `${id}-a`, x1: '0', y1: '0', x2: '1', y2: '0' }, ['cu-svg-a0', 'cu-svg-a1', 'cu-svg-a0'].map((c, i) => svg('stop', { offset: String(i / 2), class: c }))) : null;
  const silueta = svg('clipPath', { id: `${id}-c` }, [svg('path', { d: cuerpo })]);
  raiz.append(svg('defs', {}, [brillo, metal, acento, silueta]));
  const pedX = cx - X(ped.ancho);
  raiz.append(svg('rect', { class: 'cu-svg-pedestal', x: pedX.toFixed(1), y: Y(0).toFixed(1), width: X(ped.ancho * 2).toFixed(1), height: X(ped.alto).toFixed(1), rx: X(ped.canto).toFixed(1) }));
  const placa = { x: cx - X(pf.placa.ancho), y: Y(-ped.alto / 2) - X(pf.placa.alto), ancho: X(pf.placa.ancho * 2), alto: X(pf.placa.alto * 2) };
  raiz.append(svg('rect', { class: 'cu-svg-placa', x: placa.x.toFixed(1), y: placa.y.toFixed(1), width: placa.ancho.toFixed(1), height: placa.alto.toFixed(1), rx: '4' }));
  for (const d of asas) raiz.append(svg('path', { class: 'cu-svg-asa', d, stroke: `url(#${acentoId})`, 'stroke-width': X(pf.asas.grosor * 2).toFixed(1) }));
  raiz.append(svg('path', { class: 'cu-svg-cuerpo', d: cuerpo, fill: `url(#${id}-m)` }));
  if (pf.gema) raiz.append(svg('circle', { class: 'cu-svg-gema', cx: cx.toFixed(1), cy: Y(pf.gema.y).toFixed(1), r: X(pf.gema.radio).toFixed(1) }));
  const banda = svg('rect', { class: 'cu-svg-barrido', x: '0', y: '0', width: ancho.toFixed(0), height: alto.toFixed(0), fill: `url(#${id}-b)`, 'clip-path': `url(#${id}-c)` });
  const sombra = svg('path', { class: 'cu-svg-sombra', d: cuerpo });
  raiz.append(banda, sombra);
  return {
    nodo: raiz,
    listo: Promise.resolve(),
    dibujar(c) {
      // el barrido: la banda de luz cruza la silueta (su posicion sale de c.barrido, igual que en el shader)
      const k = (c.barrido[0] - BARRIDO.desde) / (BARRIDO.hasta - BARRIDO.desde);
      const x = -ancho * 0.25 + k * ancho * 1.25;
      brillo.setAttribute('gradientTransform', `translate(${x.toFixed(1)} 0)`);
      banda.setAttribute('opacity', (c.barrido[1] * 0.9).toFixed(3));
      sombra.setAttribute('opacity', ((1 - c.luzK * (c.expo ?? 1)) * 0.8).toFixed(3));
      raiz.style.visibility = c.oculta ? 'hidden' : '';
    },
    medir() {},
    placa() {
      const w = raiz.clientWidth || raiz.getBoundingClientRect().width;
      const h = raiz.clientHeight || raiz.getBoundingClientRect().height;
      if (!w || !h) return null;
      const s = Math.min(w / ancho, h / alto);
      const ox = (w - ancho * s) / 2;
      const oy = (h - alto * s) / 2;
      return { x: ox + placa.x * s, y: oy + placa.y * s, ancho: placa.ancho * s, alto: placa.alto * s };
    },
    escala: () => 1,
    destruir() {},
  };
}

// ---------------------------------------------------------------------------------------------------- la copa
// `foco` (PLANUI §4.10, opcional): el nivel de luz con que arranca (0-1); sin el, la copa de siempre hasta que se llame
// a foco(). Con foco, `en(t)` lo aplica en el reloj de en(t).
export function crearTrofeo(lienzo, { material = 'oro', perfil = 'generica', tonos = TONOS_DEF, foco = null } = {}) {
  const pf = PERFILES[perfil] ?? PERFILES.generica;
  const mat = METAL[material] ? material : 'oro';
  const ton = { ...TONOS_DEF, ...tonos };
  let t0 = null;
  let ultimoT = 0;
  // el foco: null hasta que se usa (asi el titulo pasa por cuadroEn sin foco, bit a bit igual que antes)
  let focos = Number.isFinite(foco) ? { inicial: clamp01(foco), base: 0, eventos: [] } : null;
  let impl = null;
  let observador = null;
  const aSvg = () => {
    const viejo = impl;
    impl = crearSvg({ pf, material: mat });
    viejo?.nodo?.replaceWith?.(impl.nodo);
    viejo?.destruir?.();
    impl.dibujar(cuadroEn(ultimoT, t0, focos));
    api.nodo = impl.nodo;
  };
  const alPerder = (e) => {
    e?.preventDefault?.();
    lienzo.removeEventListener('webglcontextlost', alPerder);
    observador?.disconnect();
    aSvg();
  };
  if (!document.documentElement.hasAttribute('data-sin-webgl')) {
    lienzo.classList.add('cu-lienzo');
    impl = crearGL(lienzo, { pf, material: mat, tonos: ton, alPerder: () => alPerder() });
  }
  const api = {
    nodo: null,
    fps: FPS_COPA,
    material: mat,
    perfil: perfil in PERFILES ? perfil : 'generica',
    // la subida empieza en t0 (ms del reloj de beats); sin llamarlo, la copa esta asentada
    entrar(t) {
      t0 = t;
    },
    // fijo: un cuadro suelto (congelar, el cuadro final): a escala plena, sin la resolucion adaptativa
    en(t, fijo = false) {
      ultimoT = t;
      impl.dibujar(cuadroEn(t, t0, focos), fijo);
    },
    // (PLANUI §4.10) la luz de la copa: k (0-1) desde t (el reloj de en(t)) en dur ms (0: ya)
    foco(k, t, dur = FOCO.dur) {
      focos ??= { inicial: 1, base: 0, eventos: [] };
      const desde = focoEn(t, focos).nivel;
      const hacia = clamp01(k);
      if (Math.abs(hacia - desde) < 1e-3 && !focos.eventos.some((e) => e.t > t)) return;
      // los eventos van en orden; si se vuelve atras en el tiempo, lo que venia despues ya no vale
      focos.eventos = focos.eventos.filter((e) => e.t <= t);
      focos.eventos.push({ t, desde, hacia, dur: Math.max(1, dur) });
      // los viejos (con su impulso ya frenado) se pliegan en la base
      while (focos.eventos.length > FOCO.max && t - focos.eventos[0].t > 5 * FOCO.tau * 1000) {
        const e = focos.eventos.shift();
        focos.base += Math.max(0, e.hacia - e.desde) * FOCO.giro * FOCO.tau;
        focos.inicial = e.hacia;
      }
    },
    get listo() {
      return impl.listo;
    },
    placa: () => impl.placa(),
    redimensionar: () => impl.medir(),
    escala: () => impl.escala(),
    pausar() {},
    reanudar() {},
    destruir() {
      observador?.disconnect();
      lienzo.removeEventListener('webglcontextlost', alPerder);
      impl.destruir();
    },
  };
  if (impl) {
    api.nodo = lienzo;
    lienzo.addEventListener('webglcontextlost', alPerder);
    if (typeof ResizeObserver === 'function') {
      observador = new ResizeObserver(() => impl.medir());
      observador.observe(lienzo);
    }
  } else aSvg();
  return api;
}
