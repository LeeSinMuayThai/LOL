// El ambiente de A · LUZ. Implementa el contrato de comun/ambiente.md:
//   crearAmbiente(contenedor, { meta }) -> { ambiente({ era, animo, arte }), pulso, congelar, pausar, reanudar, destruir }
// Extras propios (opcionales, nadie esta obligado a usarlos): ambiente({ ..., encuadre, velo }), aquietar(si),
// reloj(), y fotografiar() para la tira de eras.
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
import { leerColor, reducido, inst, duotono, el } from './util.js';

export const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
const ANIMOS = ['normal', 'peligro', 'gloria', 'caida'];
const PULSOS = { elegir: 0.45, logro: 0.7, golpe: 1, peligro: 0.8, gloria: 1, cambio: 0.32, apuntar: 0.12 };
const T_ERA = 1300;
const T_ARTE = 900;
export const T_AURA = 750; // el cruce del aura (foco de campeon): 600-900 ms
const T_QUIEBRE = 420; // la luz que se quiebra un instante ("te leyeron")
const VIVO_EN_CALMA = 0.2; // el splash vivo "respira" en las paradas
const T_CALMA = 800;
const T_ANIMO = 900;
const T_PULSO = 380;
const FPS_MAX = 30;
const ESCALA = 0.5;
const REPOSO_REDUCIDO = 6000; // instante fijo que se dibuja con movimiento reducido
const PARALLAX_PX = 8;

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
  };
}
function mezclarParams(p, q, k) {
  return { a: mezclarV(p.a, q.a, k), b: mezclarV(p.b, q.b, k), c: mezclarV(p.c, q.c, k), e: mezclarV(p.e, q.e, k), luz: mezclarV(p.luz, q.luz, k), contra: mezclarV(p.contra, q.contra, k) };
}
const celularAhora = () => matchMedia('(max-width: 640px)').matches;

// ======================================================================================================================
// Shader
// ======================================================================================================================
const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 color;
uniform vec2 uRes;
uniform float uT, uTL, uSemilla;
uniform vec3 uVacio, uNoche, uLuz, uContra, uOro, uBlanco;
uniform vec4 uA, uB, uC, uD, uE;
uniform vec2 uFoco0, uFoco1;
uniform sampler2D uArte0, uArte1;
uniform vec2 uTam0, uTam1;
uniform vec4 uArteE;
uniform vec4 uMarco;
uniform vec2 uPar;
uniform vec4 uF; // x: vivo (el splash como plano vivo), y: caida (la luz que cae), z: quiebre (la luz que se quiebra)

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * ruido(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }

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
    vec3 tinte = mix(uLuz, uContra, step(0.8, r));
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
// El splash como plano vivo: profundidad 2,5D falsa (luminancia + la cara en primer plano + un degrade vertical), con
// parallax al puntero y una deriva lenta tipo Ken Burns; las luces altas (pelo, tela, energia) fluyen con un ruido leve.
vec4 muestraArte(sampler2D tx, vec2 tam, vec2 uv, float asp, vec2 foco, float t, float vivo) {
  float ah = uMarco.z;
  float aw = ah * (tam.x / max(tam.y, 1.0)) / asp;
  vec2 centro = uMarco.xy + uPar * 0.5 - vec2((foco.x - 0.5) * aw, (0.5 - foco.y) * ah);
  vec2 fq = vec2(foco.x, 1.0 - foco.y);
  vec2 q = (uv - centro) / vec2(aw, ah) + 0.5;
  // Ken Burns: la escala respira alrededor de la cara y el encuadre se desliza
  float kb = 1.0 + 0.05 * vivo * (0.5 + 0.5 * sin(t * 0.05 - 1.2));
  q = (q - fq) / kb + fq + vec2(sin(t * 0.033), cos(t * 0.029)) * 0.012 * vivo;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return vec4(0.0);
  float l0 = dot(texture(tx, vec2(q.x, 1.0 - q.y)).rgb, vec3(0.299, 0.587, 0.114));
  vec2 dc = (q - fq) * vec2(1.7, 1.0);
  float prof = clamp(l0 * 0.42 + exp(-dot(dc, dc) * 7.0) * 0.4 + (1.0 - q.y) * 0.26, 0.0, 1.0);
  vec2 desp = (uPar * 2.4 + vec2(sin(t * 0.13), cos(t * 0.11)) * 0.0045 * vivo) * (prof - 0.42);
  vec2 qd = q - desp / vec2(aw, ah);
  float hl = smoothstep(0.42, 0.85, l0);
  vec2 flujo = vec2(ruido(q * 8.0 + vec2(0.0, t * 0.42)), ruido(q * 8.0 + vec2(5.2, -t * 0.36))) - 0.5;
  qd += flujo * 0.016 * hl * vivo;
  vec3 c = texture(tx, vec2(clamp(qd.x, 0.0, 1.0), 1.0 - clamp(qd.y, 0.0, 1.0))).rgb;
  float borde = smoothstep(0.0, 0.26, q.x) * smoothstep(1.0, 0.74, q.x) * smoothstep(0.0, 0.3, q.y) * smoothstep(1.0, 0.86, q.y);
  return vec4(c, borde);
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

  vec3 col = mix(uVacio, uNoche, smoothstep(-0.1, 1.1, uv.y));
  float niebla = fbm(p * 1.7 + vec2(t * 0.025, -t * 0.012)) * 0.65 + fbm(p * 4.4 - vec2(t * 0.04, t * 0.018)) * 0.35;
  vec2 src = vec2(uA.x * asp, uA.y);
  vec2 base = vec2(0.5 * asp, 0.45) - src;
  float hz = haces(p, src, base, uA.z, t) * uC.w;
  if (uE.x > 0.0) {
    vec2 src2 = vec2((1.0 - uA.x) * asp, uA.y);
    hz += haces(p, src2, vec2(0.5 * asp, 0.45) - src2, uA.z, t + 7.0) * uC.w * uE.x;
  }
  float d0 = length(p - src);
  float brillo = uC.z * (1.0 + gloria * 0.5) * (1.0 - peligro * 0.3) * (1.0 - calma * 0.05) * (1.0 - caida * 0.55);

  col += uLuz * hz * (0.22 + uA.w * niebla * 1.25) * 0.5 * brillo;
  col += uLuz * exp(-d0 * d0 * 2.4) * 0.34 * brillo;
  vec2 cd = (p - vec2(uC.x * asp, uC.y)) * vec2(1.3, 0.8);
  col += uContra * exp(-dot(cd, cd) * 3.2) * (0.14 + 0.3 * niebla) * brillo * uE.z;
  col += uContra * exp(-dot(cd, cd) * 38.0) * 0.32 * max(uE.z - 1.0, 0.0) * brillo;
  float mon = monitor(uv, asp);
  col += uLuz * mon * uB.w * 0.5 * brillo;
  col += uLuz * tubos(uv, t) * uB.z * 0.62 * brillo;
  col += bokeh(p, uv, t) * uB.y * 0.3 * brillo;
  col += mix(uLuz, uContra, 0.3) * niebla * niebla * uA.w * 0.07 * brillo;
  // polvo lejano, por detras del campeon
  col += mix(uLuz, uContra, 0.25) * polvo(p * 0.62 + vec2(3.1, 1.7), t * 0.55) * (hz * 0.8 + 0.06) * uB.x * 0.45 * brillo;

  // el arte, en duotono y adentro de la luz
  if (uArteE.y + uArteE.z > 0.0) {
    vec4 a0 = muestraArte(uArte0, uTam0, uv, asp, uFoco0, t, vivo); a0.a *= uArteE.y;
    vec4 a1 = muestraArte(uArte1, uTam1, uv, asp, uFoco1, t, vivo); a1.a *= uArteE.z;
    vec3 c = mix(a0.rgb, a1.rgb, uArteE.x);
    float a = mix(a0.a, a1.a, uArteE.x);
    float l = smoothstep(0.04, 0.9, dot(c, vec3(0.299, 0.587, 0.114)));
    float lado = smoothstep(0.2, 0.9, abs(uv.x - uC.x) < 0.5 ? 1.0 - abs(uv.x - uC.x) * 1.4 : 0.0);
    vec3 duo = mix(uNoche * 0.5, uLuz * 1.05, l);
    duo = mix(duo, uContra, smoothstep(0.55, 1.0, l) * lado * 0.5);
    duo += mix(uLuz, uBlanco, 0.6) * pow(l, 4.0) * 0.7;
    // las luces altas titilan como energia, y cada tanto un barrido de luz cruza al campeon
    duo += uLuz * pow(l, 2.5) * (ruido(vec2(uv.x * 16.0, uv.y * 9.0 - t * 0.7)) - 0.42) * 0.4 * vivo;
    float xs = (uv.x - uMarco.x) * asp * 0.8 + (uv.y - uMarco.y) * 0.5;
    float barr = exp(-pow((xs - (fract(t / 11.0) * 3.2 - 1.6)) / 0.06, 2.0));
    duo += mix(uLuz, uBlanco, 0.75) * barr * smoothstep(0.2, 0.75, l) * 0.6 * max(vivo, 0.35);
    float campo = clamp(hz * 0.55 + exp(-d0 * d0 * 1.1) * 0.75 + uB.w * mon * 0.9 + 0.44, 0.0, 1.3);
    float m = a * campo * uMarco.w;
    col = 1.0 - (1.0 - col) * (1.0 - clamp(duo * m, 0.0, 1.0));
    // luz de contra recortando al campeon: el borde que mira a la contra, donde la imagen cae hacia lo oscuro
    if (uE.y > 0.0) {
      vec2 hacia = normalize(vec2(uC.x, uC.y) - uv) * vec2(0.0045, 0.0045 * asp);
      vec4 b0 = muestraArte(uArte0, uTam0, uv + hacia, asp, uFoco0, t, vivo);
      vec4 b1 = muestraArte(uArte1, uTam1, uv + hacia, asp, uFoco1, t, vivo);
      float lb = dot(mix(b0.rgb, b1.rgb, uArteE.x), vec3(0.299, 0.587, 0.114));
      float la = dot(c, vec3(0.299, 0.587, 0.114));
      float rim = smoothstep(0.07, 0.3, la - lb) * smoothstep(0.12, 0.5, la);
      col += uContra * rim * uE.y * a * uMarco.w * 1.1;
    }
  }

  float pv = polvo(p, t);
  col += mix(uLuz, uBlanco, 0.45) * pv * (hz * 1.5 + 0.1) * uB.x * brillo;
  col += mix(uContra, uOro, 0.5) * brasas(p, t) * uE.w * (0.35 + 0.65 * vivo) * 0.55 * brillo * (1.0 - caida * 0.8);

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum), peligro * 0.6);
  col *= 1.0 - peligro * (0.16 + 0.12 * sin(uT * 5.0));
  col += uOro * gloria * 0.07 * (niebla + 0.3);
  col += mix(uLuz, uBlanco, 0.5) * pulso * 0.22 * (exp(-d0 * d0 * 0.8) + 0.35);
  // la luz que cae (una eliminacion): se apaga y se queda sin color, sin latir
  float lum2 = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum2) * vec3(0.92, 0.95, 1.0), caida * 0.78);
  col *= 1.0 - caida * 0.3;
  col = mix(col, vec3(lum2), quiebre * 0.85);
  col *= 1.0 - quiebre * 0.4;

  vec2 vq = (uv - 0.5) * vec2(0.95, 1.15);
  col *= 1.0 - dot(vq, vq) * 0.85;
  col *= 1.0 - uArteE.w * smoothstep(0.66, 0.0, uv.x) * 0.5;
  col += (h21(gl_FragCoord.xy + fract(uT * 7.0) * 100.0) - 0.5) * 0.014;
  color = vec4(max(col, 0.0), 1.0);
}`;

// Un lienzo WebGL2 con el programa compilado. Lo usan el ambiente y fotografiar().
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
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
  } catch (e) {
    console.warn('[a-luz] el shader no compilo, uso el respaldo CSS:', e.message);
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uRes', 'uT', 'uTL', 'uSemilla', 'uVacio', 'uNoche', 'uLuz', 'uContra', 'uOro', 'uBlanco', 'uA', 'uB', 'uC', 'uD', 'uE', 'uFoco0', 'uFoco1', 'uArte0', 'uArte1', 'uTam0', 'uTam1', 'uArteE', 'uMarco', 'uPar', 'uF']) U[n] = gl.getUniformLocation(prog, n);
  const texturas = [0, 1].map((i) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(3));
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  });
  gl.uniform1i(U.uArte0, 0);
  gl.uniform1i(U.uArte1, 1);
  const tam = [[1, 1], [1, 1]];
  const focos = [FOCO_DEF, FOCO_DEF];
  return {
    gl,
    textura(slot, img, foco = FOCO_DEF) {
      focos[slot] = foco;
      gl.activeTexture(gl.TEXTURE0 + slot);
      gl.bindTexture(gl.TEXTURE_2D, texturas[slot]);
      if (img) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        tam[slot] = [img.naturalWidth, img.naturalHeight];
      }
    },
    dibujar(u) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uT, u.t);
      gl.uniform1f(U.uTL, u.tl);
      gl.uniform1f(U.uSemilla, u.semilla);
      for (const [n, v] of [['uVacio', u.col.vacio], ['uNoche', u.col.noche], ['uOro', u.col.oro], ['uBlanco', u.col.blanco], ['uLuz', u.p.luz], ['uContra', u.p.contra]]) gl.uniform3fv(U[n], v);
      gl.uniform4fv(U.uA, u.p.a);
      gl.uniform4fv(U.uB, u.p.b);
      gl.uniform4fv(U.uC, u.p.c);
      gl.uniform4fv(U.uD, u.d);
      gl.uniform4fv(U.uE, u.p.e);
      gl.uniform2fv(U.uFoco0, focos[0]);
      gl.uniform2fv(U.uFoco1, focos[1]);
      gl.uniform4fv(U.uArteE, u.arte);
      gl.uniform4fv(U.uMarco, u.marco);
      gl.uniform2fv(U.uPar, u.par);
      gl.uniform4fv(U.uF, u.f ?? [0, 0, 0, 0]);
      gl.uniform2fv(U.uTam0, tam[0]);
      gl.uniform2fv(U.uTam1, tam[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    liberar() {
      texturas.forEach((t) => gl.deleteTexture(t));
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
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
  let pulso = { t: -1e9, k: 0 };
  let marco = { ...ENCUADRES.derecha };
  let marcoDesde = { ...marco };
  let tMarco = -1e9;
  let velo = 0.6;
  // arte: dos ranuras; `activa` es la que se ve; la mezcla va hacia ella
  const arte = { on: [0, 0], activa: 0, t: -1e9, dur: T_ARTE, key: [null, null], token: 0, carga: Promise.resolve() };
  let actual = { era: null, animo: 'normal', arte: undefined };
  const par = [0, 0];
  const parObjetivo = [0, 0];

  function paramsEn(t) {
    const k = suave((t - tEra) / T_ERA);
    return mezclarParams(pDesde, pHacia, k);
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
    const tr = reducido() ? REPOSO_REDUCIDO : t;
    const ka = clamp01((t - animo.t) / T_ANIMO);
    const peligro = mezclar(animo.desde[0], animo.hacia[0], suave(ka));
    let gloria = mezclar(animo.desde[1], animo.hacia[1], suave(ka));
    const caida = mezclar(animo.desde[2], animo.hacia[2], suave(ka));
    const dq = t - quiebreT;
    const quiebre = dq >= 0 && !reducido() && !inst() ? Math.exp(-dq / T_QUIEBRE) * (0.7 + 0.3 * Math.cos(dq * 0.05)) : 0;
    const vivoAhora = reducido() ? 0 : 1 - (1 - VIVO_EN_CALMA) * calmaEn(t).v;
    gloria *= 0.5 + 0.5 * Math.exp(-Math.max(0, t - animo.gloriaT) / 2600);
    const pk = t >= pulso.t && !reducido() ? pulso.k * Math.exp(-(t - pulso.t) / T_PULSO) : 0;
    const km = expoOut((t - tMarco) / T_ERA);
    const m = { x: mezclar(marcoDesde.x, marco.x, km), y: mezclar(marcoDesde.y, marco.y, km), alto: mezclar(marcoDesde.alto, marco.alto, km), op: mezclar(marcoDesde.op, marco.op, km) };
    const kArte = suave((t - arte.t) / arte.dur);
    const mezclaArte = arte.activa === 1 ? kArte : 1 - kArte;
    return {
      t: tr / 1000,
      tl: (reducido() ? REPOSO_REDUCIDO : tiempoLento(t)) / 1000,
      semilla,
      col,
      p: paramsEn(t),
      d: [calmaEn(t).v, peligro, gloria, pk],
      arte: [mezclaArte, arte.on[0], arte.on[1], velo],
      marco: [m.x, m.y, m.alto, m.op],
      par,
      f: [vivoAhora, caida, Math.max(0, quiebre), 0],
    };
  }
  function medir() {
    const w = Math.max(2, Math.round(contenedor.clientWidth * ESCALA));
    const h = Math.max(2, Math.round(contenedor.clientHeight * ESCALA));
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
    if (!reducido()) {
      par[0] += (parObjetivo[0] - par[0]) * 0.08;
      par[1] += (parObjetivo[1] - par[1]) * 0.08;
    }
    dibujar();
  }
  const alMover = (e) => {
    if (reducido() || celularAhora()) return;
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
    arte.dur = dur;
    arte.t = inst() || reducido() ? -1e9 : reloj() + retardo;
    dibujar();
  }

  const api = {
    impl: 'webgl',
    ambiente({ era, animo: an, arte: key, encuadre, velo: v, instantaneo: corte = false, retardo = 0, cruce } = {}) {
      // retardo: el cambio se programa en el reloj del ambiente (asi congelar(t) lo dibuja fiel en las tiras)
      const t = reloj() + Math.max(0, retardo);
      const instantaneo = inst() || reducido() || corte;
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
      if (enc) {
        const km = expoOut((t - tMarco) / T_ERA);
        marcoDesde = { x: mezclar(marcoDesde.x, marco.x, km), y: mezclar(marcoDesde.y, marco.y, km), alto: mezclar(marcoDesde.alto, marco.alto, km), op: mezclar(marcoDesde.op, marco.op, km) };
        marco = { ...enc };
        tMarco = instantaneo ? -1e9 : t;
        if (instantaneo) marcoDesde = { ...enc };
      }
      if (typeof v === 'number') velo = v;
      actual.era = eraHacia;
      if (key !== undefined) arte.carga = ponerArte(key, { dur: cruce ?? T_ARTE, retardo });
      dibujar();
      return arte.carga;
    },
    quiebre(retardo = 0) {
      if (reducido() || inst()) return;
      quiebreT = reloj() + retardo;
    },
    aquietar(si = true) {
      const t = reloj();
      const { v } = calmaEn(t);
      const objetivo = si ? 1 : 0;
      if (calmaEventos[calmaEventos.length - 1].hacia === objetivo) return;
      calmaEventos.push({ t, desde: inst() || reducido() ? objetivo : v, hacia: objetivo, base: tiempoLento(t) });
      if (calmaEventos.length > 32) calmaEventos = calmaEventos.slice(-16);
    },
    pulso(tipo, retardo = 0) {
      if (!(tipo in PULSOS) || reducido()) return;
      pulso = { t: reloj() + retardo, k: PULSOS[tipo] };
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
  raiz.append(...lienzos, el('div', { class: 'lc-vineta' }), el('div', { class: 'lc-velo' }));
  const capaPulso = el('div', { class: 'lc-pulso' });
  raiz.append(capaPulso);
  contenedor.prepend(raiz);
  const col = colores();
  let activa = 0;
  let token = 0;
  let actual = { era: 'pieza', animo: 'normal', arte: undefined, img: null };
  let carga = Promise.resolve();
  let t0 = performance.now();

  function pintarArte(img, era, lienzo) {
    const w = Math.round(Math.min(900, (contenedor.clientWidth || innerWidth) * 0.6));
    const h = Math.round(w * 0.5625);
    duotono(img, col.noche.map((v) => v * 0.5), col[era].luz, w, h, { canvas: lienzo, foco: [0.5, 0.5] });
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
    ambiente({ era, animo, arte: key, encuadre, velo } = {}) {
      raiz.toggleAttribute('data-quieto', inst() || reducido());
      if (ERAS.includes(era) && era !== actual.era) {
        actual.era = era;
        raiz.dataset.era = era;
        if (actual.img) pintarArte(actual.img, era, lienzos[activa]);
      } else if (ERAS.includes(era)) raiz.dataset.era = era;
      if (ANIMOS.includes(animo)) raiz.dataset.animo = animo;
      if (encuadre && ENCUADRES[encuadre]) raiz.dataset.encuadre = encuadre;
      if (typeof velo === 'number') raiz.style.setProperty('--lc-velo', String(velo));
      if (key !== undefined && key !== actual.arte) carga = ponerArte(key);
      return carga;
    },
    aquietar(si = true) {
      raiz.toggleAttribute('data-calma', si);
    },
    pulso(tipo, retardo = 0) {
      if (!(tipo in PULSOS) || reducido() || inst()) return;
      capaPulso.animate([{ opacity: PULSOS[tipo] * 0.5 }, { opacity: 0 }], { duration: 600, delay: retardo, easing: 'ease-out' });
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
  let impl = null;
  const aCss = () => {
    impl?.destruir();
    impl = crearAmbienteCss(contenedor, opciones);
    impl.ambiente(ultimo);
  };
  if (!document.documentElement.hasAttribute('data-sin-webgl')) impl = crearAmbienteGL(contenedor, opciones, aCss);
  if (!impl) impl = crearAmbienteCss(contenedor, opciones);
  return {
    get impl() {
      return impl.impl;
    },
    ambiente(o = {}) {
      ultimo = { ...ultimo, ...o };
      return impl.ambiente(o);
    },
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
  canvas.width = Math.round(ancho * ESCALA * 2);
  canvas.height = Math.round(alto * ESCALA * 2);
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
