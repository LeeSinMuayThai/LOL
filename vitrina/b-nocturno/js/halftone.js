// El halftone de B · NOCTURNO: el splash del campeón impreso como trama de puntos.
// Implementa el contrato de comun/ambiente.md: crearAmbiente(contenedor, opciones) ->
//   { ambiente({era, animo, arte}), pulso(tipo), congelar(t), pausar(), reanudar(), destruir() }
// y suma dos métodos propios: respirar(bool) (la trama respira en el relato y se aquieta en las paradas) y
// listo() (Promise del primer cuadro con arte).
// WebGL2 a escala 0,5, ≤ 2 texturas (A/B para el fundido), ≤ 30 fps, en pausa con la pestaña oculta, maneja la
// pérdida de contexto. Sin WebGL (data-sin-webgl o sin contexto): la misma trama dibujada una vez en canvas 2D.
// Los colores salen de los tokens (--ht-*) con getComputedStyle; lo aleatorio, de comun/azar.js.

import { cargarImagen, urlSplash, urlCentrada } from '../../comun/arte.js';
import { crearAzar } from '../../comun/azar.js';

const ESCALA = 0.5;
const FPS_MAX = 30;
const TAU_MS = 260; // constante de tiempo de las transiciones de parámetros (≈ 1 s hasta quedar quietas)
const PULSO_MS = { elegir: 700, logro: 850, golpe: 950, peligro: 900, gloria: 950 };
const ANIMOS = ['normal', 'peligro', 'gloria'];
const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
// Dónde está la cara en cada splash (fracción del ancho y del alto): el recorte "cover" se centra ahí.
const FOCOS = { Yone: [0.6, 0.26], Sylas: [0.45, 0.38], Anivia: [0.56, 0.42] };
const focoDe = (op, key) => op.foco ?? (op.recorte === 'centrada' ? [0.5, 0.4] : FOCOS[key] ?? [0.5, 0.42]);

const reducido = () =>
  document.documentElement.hasAttribute('data-reducido') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const inst = () => document.documentElement.hasAttribute('data-inst');

// Niveles: punto negro y blanco desde el histograma de luminancia (percentiles 2 y 98) de una copia chica.
const PCT_NEGRO = 0.02;
const PCT_BLANCO = 0.98;
export function nivelesDe(img) {
  if (!img) return [0, 1];
  try {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 54;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const hist = new Array(256).fill(0);
    for (let i = 0; i < d.length; i += 4) hist[Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)]++;
    const total = d.length / 4;
    let acum = 0;
    let negro = 0;
    let blanco = 255;
    for (let v = 0; v < 256; v++) {
      acum += hist[v];
      if (acum <= total * PCT_NEGRO) negro = v;
      if (acum <= total * PCT_BLANCO) blanco = v;
    }
    return [negro / 255, Math.max(negro + 8, blanco) / 255];
  } catch {
    return [0, 1];
  }
}

function hexARgb(hex) {
  const h = hex.trim().replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Lee los tokens del elemento (las eras cambian --ht-* por [data-era]).
export function leerTokens(el, modo) {
  const cs = getComputedStyle(el);
  const v = (n) => cs.getPropertyValue(n).trim();
  const num = (n, d) => (Number.isFinite(parseFloat(v(n))) ? parseFloat(v(n)) : d);
  const papel = modo === 'papel';
  return {
    fondo: hexARgb(v(papel ? '--ht-papel' : '--ht-fondo')),
    tinta: hexARgb(v(papel ? '--ht-papel-tinta' : '--ht-tinta')),
    tinta2: hexARgb(v(papel ? '--ht-papel-tinta-2' : '--ht-tinta-2')),
    peligro: hexARgb(v('--ht-peligro')),
    gloria: hexARgb(v('--ht-gloria')),
    celda: num('--ht-celda', 10),
    angulo: (num('--ht-angulo', 45) * Math.PI) / 180,
    grano: num('--ht-grano', 0.1),
    contraste: num('--ht-contraste', 1.2),
    brillo: papel ? num('--ht-papel-brillo', 0.2) : 0,
    gamma: num('--ht-gamma', 0.8),
    estilo: modo === 'papel' ? 0 : num('--ht-estilo', 0),
  };
}

const VERT = `#version 300 es
in vec2 a_pos; out vec2 v_uv;
void main(){ v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5); gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv; out vec4 o;
uniform sampler2D u_a, u_b; uniform float u_mezcla;
uniform vec2 u_res, u_resA, u_resB, u_foco; uniform float u_zoom;
uniform float u_brillo, u_cobertura, u_gamma, u_estilo;
uniform vec2 u_nivA, u_nivB;
uniform float u_celda, u_angulo, u_grano, u_contraste, u_t, u_respira, u_pulso, u_pulsoFuerza, u_arte, u_modo, u_semilla;
uniform vec3 u_fondo, u_tinta, u_tinta2;
uniform vec4 u_fade; uniform vec2 u_pulsoC;
vec2 cubrir(vec2 uv, vec2 r){
  float ar = u_res.x / u_res.y, ir = r.x / r.y;
  vec2 s = ar > ir ? vec2(1.0, ir / ar) : vec2(ar / ir, 1.0);
  s /= u_zoom;
  vec2 c = clamp(u_foco, s * 0.5, 1.0 - s * 0.5);
  return (uv - 0.5) * s + c;
}
float luz(vec2 uv){
  vec3 a = texture(u_a, cubrir(uv, u_resA)).rgb;
  vec3 b = texture(u_b, cubrir(uv, u_resB)).rgb;
  float la = clamp((dot(a, vec3(0.299, 0.587, 0.114)) - u_nivA.x) / (u_nivA.y - u_nivA.x), 0.0, 1.0);
  float lb = clamp((dot(b, vec3(0.299, 0.587, 0.114)) - u_nivB.x) / (u_nivB.y - u_nivB.x), 0.0, 1.0);
  return pow(mix(la, lb, u_mezcla), u_gamma);
}
float desv(float t, float a, float b){
  if (a == b) return 1.0;
  return a < b ? 1.0 - smoothstep(a, b, t) : smoothstep(b, a, t);
}
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21) + u_semilla); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 px = v_uv * u_res;
  float ca = cos(u_angulo), sa = sin(u_angulo);
  mat2 rot = mat2(ca, sa, -sa, ca);
  vec2 q = rot * px;
  vec2 celda = floor(q / u_celda);
  vec2 cq = (celda + 0.5) * u_celda;
  vec2 c = transpose(rot) * cq;
  vec2 uvc = clamp(c / u_res, 0.0, 1.0);
  float v = clamp((luz(uvc) - 0.5) * u_contraste + 0.5 + u_brillo, 0.0, 1.0);
  if (u_modo > 0.5) v = 1.0 - v;
  v *= u_arte * desv(uvc.y, u_fade.x, u_fade.y) * desv(uvc.x, u_fade.z, u_fade.w);
  float resp = 1.0 + u_respira * 0.09 * sin(u_t * 0.85 + c.y * 0.011 + c.x * 0.004);
  float d = distance(c / u_res.y, u_pulsoC * vec2(u_res.x / u_res.y, 1.0));
  float onda = exp(-pow((d - u_pulso * 1.4) * 7.0, 2.0)) * (1.0 - u_pulso) * u_pulsoFuerza;
  float barrido = clamp(u_cobertura * 1.6 - uvc.y * 0.6, 0.0, 1.0);
  float r = sqrt(v) * 0.5 * u_celda * 1.16 * resp * (1.0 + onda) * barrido;
  if (u_estilo > 0.5) {
    // fotocopia de fanzine: 1 bit por píxel, umbral con ruido, y la segunda tinta corrida de registro
    vec2 uvp = clamp(px / u_res, 0.0, 1.0);
    float f = u_arte * desv(uvp.y, u_fade.x, u_fade.y) * desv(uvp.x, u_fade.z, u_fade.w) * clamp(u_cobertura * 1.6 - uvp.y * 0.6, 0.0, 1.0);
    float l1 = clamp((luz(uvp) - 0.5) * u_contraste + 0.5 + u_brillo, 0.0, 1.0) * f;
    float l2 = clamp((luz(clamp((px + vec2(2.0, 1.0)) / u_res, 0.0, 1.0)) - 0.5) * u_contraste + 0.5, 0.0, 1.0) * f;
    float ruido = (hash(floor(px)) - 0.5) * u_grano * 1.6;
    float on1 = step(0.5, l1 + ruido);
    float on2 = step(0.5, l2 + ruido * 0.7);
    vec3 cf = mix(u_fondo, u_tinta2, on2);
    cf = mix(cf, u_tinta, on1);
    o = vec4(cf, 1.0);
    return;
  }
  float aa = 0.7;
  float p1 = 1.0 - smoothstep(r - aa, r + aa, length(q - cq));
  float p2 = 1.0 - smoothstep(r - aa, r + aa, length(q - cq - vec2(u_celda * 0.24, u_celda * 0.2)));
  vec3 col = mix(u_fondo, u_tinta2, p2 * 0.92);
  col = mix(col, u_tinta, p1);
  col += (hash(floor(px)) - 0.5) * u_grano * 0.24;
  o = vec4(col, 1.0);
}`;

// ——— la trama en canvas 2D (respaldo sin WebGL, hojas de contacto, miniaturas de eras) ———
// Dibuja una sola vez: no respira. img puede ser null (queda el fondo con grano).
export function tramaEstatica(canvas, img, o) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;
  const t = o.tokens;
  const css = (rgb, a = 1) => `rgb(${rgb.map((x) => Math.round(x * 255)).join(' ')} / ${a})`;
  ctx.fillStyle = css(t.fondo);
  ctx.fillRect(0, 0, W, H);
  const celda = Math.max(2.5, t.celda * (o.escala ?? 1));
  let leer = () => 0;
  if (img) {
    // la imagen, ya recortada tipo "cover" con foco, a la resolución de la grilla de celdas
    const gw = Math.max(1, Math.ceil(W / (celda * 0.5)));
    const gh = Math.max(1, Math.ceil(H / (celda * 0.5)));
    const muestra = document.createElement('canvas');
    muestra.width = gw;
    muestra.height = gh;
    const mc = muestra.getContext('2d', { willReadFrequently: true });
    const ar = W / H;
    const ir = img.naturalWidth / img.naturalHeight;
    let sw = ar > ir ? img.naturalWidth : img.naturalHeight * ar;
    let sh = ar > ir ? img.naturalWidth / ar : img.naturalHeight;
    sw /= o.zoom ?? 1;
    sh /= o.zoom ?? 1;
    const fx = Math.min(Math.max((o.foco?.[0] ?? 0.5) * img.naturalWidth, sw / 2), img.naturalWidth - sw / 2);
    const fy = Math.min(Math.max((o.foco?.[1] ?? 0.5) * img.naturalHeight, sh / 2), img.naturalHeight - sh / 2);
    try {
      mc.drawImage(img, fx - sw / 2, fy - sh / 2, sw, sh, 0, 0, gw, gh);
      const datos = mc.getImageData(0, 0, gw, gh).data;
      const [n0, n1] = o.niveles ?? nivelesDe(img);
      const g = t.gamma ?? 1;
      leer = (x, y) => {
        const i = (Math.min(gh - 1, Math.max(0, Math.floor((y / H) * gh))) * gw + Math.min(gw - 1, Math.max(0, Math.floor((x / W) * gw)))) * 4;
        const l = (datos[i] * 0.299 + datos[i + 1] * 0.587 + datos[i + 2] * 0.114) / 255;
        return Math.pow(Math.min(1, Math.max(0, (l - n0) / (n1 - n0))), g);
      };
    } catch {
      leer = () => 0; // canvas "sucio" (sin CORS): queda sin arte
    }
  }
  const fade = o.fade ?? [0, 0, 0, 0];
  const desv = (v, a, b) => (a === b ? 1 : a < b ? 1 - suave(a, b, v) : suave(b, a, v));
  if (t.estilo === 1 && o.modo !== 'papel') {
    // fotocopia: 1 bit por bloque de 2 px, umbral con ruido y la segunda tinta corrida de registro
    const azarF = crearAzar(`fotocopia-${W}x${H}`);
    const im = ctx.getImageData(0, 0, W, H);
    const d = im.data;
    const pintar = (x, y, c) => {
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const k = ((y + dy) * W + (x + dx)) * 4;
        if (k < d.length && x + dx < W) { d[k] = c[0] * 255; d[k + 1] = c[1] * 255; d[k + 2] = c[2] * 255; }
      }
    };
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        const f = img ? desv(y / H, fade[0], fade[1]) * desv(x / W, fade[2], fade[3]) : 0;
        const ruido = (azarF.siguiente() - 0.5) * t.grano * 1.6;
        const l1 = Math.min(1, Math.max(0, (leer(x, y) - 0.5) * t.contraste + 0.5)) * f;
        const l2 = Math.min(1, Math.max(0, (leer(x + 4, y + 2) - 0.5) * t.contraste + 0.5)) * f;
        if (l1 + ruido > 0.5) pintar(x, y, t.tinta);
        else if (l2 + ruido * 0.7 > 0.5) pintar(x, y, t.tinta2);
      }
    }
    ctx.putImageData(im, 0, 0);
    return;
  }
  const ca = Math.cos(t.angulo);
  const sa = Math.sin(t.angulo);
  const diag = Math.hypot(W, H);
  const n = Math.ceil(diag / celda) + 2;
  const capas = [
    { color: css(t.tinta2, 0.92), dx: celda * 0.24, dy: celda * 0.2 },
    { color: css(t.tinta), dx: 0, dy: 0 },
  ];
  for (const capa of capas) {
    ctx.fillStyle = capa.color;
    ctx.beginPath();
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const qx = (i + 0.5) * celda;
        const qy = (j + 0.5) * celda;
        const x = ca * qx + sa * qy; // vuelta a pantalla (rotación inversa)
        const y = -sa * qx + ca * qy;
        if (x < -celda || y < -celda || x > W + celda || y > H + celda) continue;
        let v = Math.min(1, Math.max(0, (leer(x, y) - 0.5) * t.contraste + 0.5 + (t.brillo ?? 0)));
        if (o.modo === 'papel') v = 1 - v;
        if (!img) v = 0;
        v *= desv(y / H, fade[0], fade[1]) * desv(x / W, fade[2], fade[3]);
        const r = Math.sqrt(v) * 0.5 * celda * 1.16;
        if (r < 0.35) continue;
        const cx = x + ca * capa.dx + sa * capa.dy;
        const cy = y - sa * capa.dx + ca * capa.dy;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }
  if (t.grano > 0) {
    const azar = crearAzar(`grano-${W}x${H}`);
    const img2 = ctx.getImageData(0, 0, W, H);
    const d = img2.data;
    const k = t.grano * 0.24 * 255;
    for (let i = 0; i < d.length; i += 4) {
      const g = (azar.siguiente() - 0.5) * k;
      d[i] += g;
      d[i + 1] += g;
      d[i + 2] += g;
    }
    ctx.putImageData(img2, 0, 0);
  }
}

function suave(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ——— el ambiente ———
export function crearAmbiente(contenedor, opciones = {}) {
  if (getComputedStyle(contenedor).position === 'static') contenedor.style.position = 'relative';
  const modo = opciones.modo === 'papel' ? 'papel' : 'noche';
  const raiz = document.createElement('div');
  raiz.className = 'ht';
  raiz.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'ht-lienzo';
  raiz.appendChild(canvas);
  contenedor.prepend(raiz);

  const sinWebgl = document.documentElement.hasAttribute('data-sin-webgl') || opciones.estatico;
  const gl = sinWebgl ? null : canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  const semilla = crearAzar(`ht-${opciones.semilla ?? 'nocturno'}`).siguiente();

  const estado = {
    era: 'escenario',
    animo: 'normal',
    arteKey: null,
    imgs: [null, null], // A y B
    niveles: [[0, 1], [0, 1]],
    activa: 0,
    mezcla: 0,
    mezclaObj: 0,
    respira: opciones.respira === false ? 0 : 1,
    respiraObj: opciones.respira === false ? 0 : 1,
    tokens: null,
    tokensObj: null,
    animoMix: [0, 0],
    animoObj: [0, 0],
    pulso: null,
    t0: performance.now(),
    tCongelado: null,
    pausado: false,
    destruido: false,
    perdido: false,
  };
  let raf = 0;
  let ultimo = 0;
  let resolverListo;
  let listoP = new Promise((r) => (resolverListo = r));
  let token = 0;

  // ——— WebGL ———
  let prog = null;
  let texs = [];
  let U = {};
  function iniciarGL() {
    if (!gl) return;
    const sh = (tipo, src) => {
      const s = gl.createShader(tipo);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('[b-nocturno] shader:', gl.getShaderInfoLog(s));
      return s;
    };
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['u_a', 'u_b', 'u_mezcla', 'u_res', 'u_resA', 'u_resB', 'u_foco', 'u_zoom', 'u_celda', 'u_angulo', 'u_grano', 'u_contraste', 'u_t', 'u_respira', 'u_pulso', 'u_pulsoFuerza', 'u_arte', 'u_modo', 'u_semilla', 'u_fondo', 'u_tinta', 'u_tinta2', 'u_fade', 'u_pulsoC', 'u_brillo', 'u_cobertura', 'u_gamma', 'u_estilo', 'u_nivA', 'u_nivB'])
      U[n] = gl.getUniformLocation(prog, n);
    texs = [0, 1].map((i) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    });
    gl.uniform1i(U.u_a, 0);
    gl.uniform1i(U.u_b, 1);
    estado.imgs.forEach((img, i) => img && subir(i, img));
  }
  function subir(i, img) {
    if (!gl || estado.perdido) return;
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, texs[i]);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    } catch {
      /* imagen sin CORS: queda la textura negra */
    }
  }
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    estado.perdido = true;
    cancelAnimationFrame(raf);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    estado.perdido = false;
    iniciarGL();
    pedirCuadro();
  });

  // ——— tamaño ———
  function medir() {
    const w = Math.max(1, Math.round(contenedor.clientWidth * (gl ? ESCALA : 1)));
    const h = Math.max(1, Math.round(contenedor.clientHeight * (gl ? ESCALA : 1)));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      return true;
    }
    return false;
  }
  const ro = new ResizeObserver(() => {
    if (medir()) {
      if (gl) pedirCuadro();
      else dibujarEstatico();
    }
  });
  ro.observe(contenedor);

  // ——— parámetros ———
  function tokensDeEra() {
    raiz.dataset.era = estado.era;
    const t = leerTokens(raiz, modo);
    const k = opciones.apagado ?? 0;
    if (k) {
      const gris = (c) => c.map(() => (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114));
      const bajar = (c) => c.map((x, i) => (x + (gris(c)[i] - x) * k) * (1 - k * 0.55) + t.fondo[i] * k * 0.55);
      t.tinta = bajar(t.tinta);
      t.tinta2 = bajar(t.tinta2);
      t.contraste *= 1 - k * 0.35;
    }
    return t;
  }
  function mezclarTokens(a, b, k) {
    const m = (x, y) => x + (y - x) * k;
    const mv = (x, y) => x.map((xi, i) => m(xi, y[i]));
    return {
      fondo: mv(a.fondo, b.fondo), tinta: mv(a.tinta, b.tinta), tinta2: mv(a.tinta2, b.tinta2),
      peligro: b.peligro, gloria: b.gloria,
      celda: m(a.celda, b.celda), angulo: m(a.angulo, b.angulo), grano: m(a.grano, b.grano), contraste: m(a.contraste, b.contraste), brillo: m(a.brillo, b.brillo), gamma: m(a.gamma, b.gamma), estilo: b.estilo,
    };
  }
  function avanzar(dt) {
    const quieto = reducido() || inst();
    const k = quieto ? 1 : 1 - Math.exp(-dt / TAU_MS);
    estado.tokens = estado.tokens ? mezclarTokens(estado.tokens, estado.tokensObj, k) : estado.tokensObj;
    estado.mezcla += (estado.mezclaObj - estado.mezcla) * k;
    estado.respira += ((quieto ? 0 : estado.respiraObj) - estado.respira) * k;
    estado.animoMix = estado.animoMix.map((x, i) => x + (estado.animoObj[i] - x) * k);
    return Math.abs(estado.mezclaObj - estado.mezcla) > 0.002 || Math.abs(estado.tokens.celda - estado.tokensObj.celda) > 0.01 || Math.abs(estado.tokens.tinta[0] - estado.tokensObj.tinta[0]) > 0.002 || Math.abs(estado.animoMix[0] - estado.animoObj[0]) > 0.002 || Math.abs(estado.animoMix[1] - estado.animoObj[1]) > 0.002;
  }
  // "imprimir": la trama crece desde cero como tinta que entra en el papel (la intro del inicio).
  function cobertura(tMs) {
    const im = estado.imprimir;
    if (!im) return 1;
    const k = (tMs - im.t0) / im.dur;
    if (k >= 1) {
      estado.imprimir = null;
      return 1;
    }
    return Math.max(0, k);
  }
  function pulsoActual(ahora) {
    const p = estado.pulso;
    if (!p) return [1, 0];
    const k = (ahora - p.t0) / p.dur;
    if (k >= 1) {
      estado.pulso = null;
      return [1, 0];
    }
    return [k, p.fuerza];
  }

  function dibujarGL(ahoraMs, pulsoK) {
    if (!gl || estado.perdido || !estado.tokens) return;
    const t = estado.tokens;
    const tinta = t.tinta.map((x, i) => x + (t.peligro[i] - x) * estado.animoMix[0] * 0.55 + (t.gloria[i] - x) * estado.animoMix[1] * 0.5);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const img = (i) => estado.imgs[i];
    const res = (i) => (img(i) ? [img(i).naturalWidth, img(i).naturalHeight] : [1, 1]);
    // la textura A es la "activa" vieja y B la nueva: u_mezcla 0 → A, 1 → B
    const [ia, ib] = estado.activa === 0 ? [1, 0] : [0, 1];
    gl.uniform1i(U.u_a, ia);
    gl.uniform1i(U.u_b, ib);
    gl.uniform1f(U.u_mezcla, estado.mezcla);
    gl.uniform2f(U.u_res, canvas.width, canvas.height);
    gl.uniform2f(U.u_resA, ...res(ia));
    gl.uniform2f(U.u_resB, ...res(ib));
    gl.uniform2f(U.u_foco, ...focoDe(opciones, estado.arteKey));
    gl.uniform1f(U.u_zoom, opciones.zoom ?? 1);
    gl.uniform1f(U.u_celda, celdaCss(t) * ESCALA);
    gl.uniform1f(U.u_angulo, t.angulo);
    gl.uniform1f(U.u_grano, t.grano);
    gl.uniform1f(U.u_contraste, t.contraste);
    gl.uniform1f(U.u_brillo, t.brillo);
    gl.uniform1f(U.u_gamma, t.gamma);
    gl.uniform1f(U.u_estilo, t.estilo);
    gl.uniform2f(U.u_nivA, ...estado.niveles[ia]);
    gl.uniform2f(U.u_nivB, ...estado.niveles[ib]);
    gl.uniform1f(U.u_cobertura, cobertura(ahoraMs));
    gl.uniform1f(U.u_t, ahoraMs / 1000);
    gl.uniform1f(U.u_respira, estado.respira);
    gl.uniform1f(U.u_pulso, pulsoK[0]);
    gl.uniform1f(U.u_pulsoFuerza, pulsoK[1]);
    gl.uniform1f(U.u_arte, img(0) || img(1) ? 1 : 0);
    gl.uniform1f(U.u_modo, modo === 'papel' ? 1 : 0);
    gl.uniform1f(U.u_semilla, semilla);
    gl.uniform3f(U.u_fondo, ...t.fondo);
    gl.uniform3f(U.u_tinta, ...tinta);
    gl.uniform3f(U.u_tinta2, ...t.tinta2);
    gl.uniform4f(U.u_fade, ...(opciones.fade ?? [0, 0, 0, 0]));
    gl.uniform2f(U.u_pulsoC, ...(opciones.pulsoCentro ?? [0.5, 0.5]));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // La celda en px CSS: si la superficie pide `celdas` a lo ancho, la era la escala (--ht-celda / 6).
  function celdaCss(t) {
    if (!opciones.celdas) return t.celda;
    return Math.max(3, (contenedor.clientWidth / opciones.celdas) * (t.celda / 6));
  }
  function dibujarEstatico() {
    if (gl || !estado.tokensObj) return;
    const img = estado.imgs[estado.activa];
    tramaEstatica(canvas, img, { tokens: { ...estado.tokensObj, celda: celdaCss(estado.tokensObj) }, modo, fade: opciones.fade, foco: focoDe(opciones, estado.arteKey), zoom: opciones.zoom, niveles: estado.niveles[estado.activa] });
  }

  function cuadro(ahora) {
    raf = 0;
    if (estado.destruido || estado.pausado || estado.perdido) return;
    const dt = Math.min(100, ahora - (ultimo || ahora));
    if (ultimo && ahora - ultimo < 1000 / FPS_MAX - 1) {
      raf = requestAnimationFrame(cuadro);
      return;
    }
    ultimo = ahora;
    const transicion = avanzar(dt);
    const pk = pulsoActual(ahora);
    dibujarGL(ahora - estado.t0, pk);
    const vivo = transicion || estado.respira > 0.002 || estado.pulso || estado.imprimir;
    if (vivo) raf = requestAnimationFrame(cuadro);
  }
  function pedirCuadro() {
    if (!gl) return dibujarEstatico();
    if (!raf && !estado.pausado && !estado.destruido) {
      ultimo = 0;
      raf = requestAnimationFrame(cuadro);
    }
  }

  function alVisibilidad() {
    if (document.hidden) cancelAnimationFrame(raf), (raf = 0);
    else pedirCuadro();
  }
  document.addEventListener('visibilitychange', alVisibilidad);

  async function ponerArte(key, mio) {
    if (key === estado.arteKey) return;
    estado.arteKey = key;
    let img = null;
    if (key) {
      const url = opciones.recorte === 'centrada' ? urlCentrada(key, opciones.meta) : urlSplash(key, opciones.meta);
      img = await cargarImagen(url);
    }
    if (mio !== token || estado.destruido) return;
    const destino = estado.imgs[estado.activa] ? 1 - estado.activa : estado.activa;
    estado.imgs[destino] = img;
    estado.niveles[destino] = nivelesDe(img);
    if (img) subir(destino, img);
    if (destino !== estado.activa) {
      estado.activa = destino;
      estado.mezcla = 0;
      estado.mezclaObj = 1;
      if (reducido() || inst()) estado.mezcla = 1;
    } else {
      estado.mezcla = 1;
      estado.mezclaObj = 1;
    }
  }

  if (gl) iniciarGL();
  medir();

  const api = {
    async ambiente({ era, animo, arte } = {}) {
      const mio = ++token;
      if (ERAS.includes(era)) estado.era = era;
      if (ANIMOS.includes(animo)) {
        estado.animo = animo;
        estado.animoObj = [animo === 'peligro' ? 1 : 0, animo === 'gloria' ? 1 : 0];
      }
      estado.tokensObj = tokensDeEra();
      if (!estado.tokens || reducido() || inst()) estado.tokens = estado.tokensObj;
      if (arte !== undefined) await ponerArte(arte, mio);
      if (mio !== token || estado.destruido) return;
      // la mezcla A/B usa u_mezcla 0→1 hacia la activa: el dibujo lo resuelve
      if (gl) {
        if (estado.tCongelado !== null) {
          avanzar(1e6);
          dibujarGL(estado.tCongelado, [1, 0]);
        } else pedirCuadro();
      } else dibujarEstatico();
      raiz.classList.add('ht-listo');
      resolverListo();
    },
    pulso(tipo) {
      if (reducido() || !PULSO_MS[tipo] || !gl) return;
      const fuerza = { elegir: 0.5, logro: 0.8, golpe: 1.2, peligro: 0.9, gloria: 1.1 }[tipo];
      estado.pulso = { t0: performance.now(), dur: PULSO_MS[tipo], fuerza };
      estado.tCongelado = null;
      pedirCuadro();
    },
    imprimir(dur = 1400) {
      if (reducido() || inst() || !gl) return;
      estado.imprimir = { t0: performance.now() - estado.t0, dur };
      estado.tCongelado = null;
      pedirCuadro();
    },
    sinImpresion() {
      estado.imprimir = null;
    },
    respirar(si) {
      estado.respiraObj = si ? 1 : 0;
      pedirCuadro();
    },
    congelar(t = 0) {
      api.pausar();
      estado.tCongelado = t;
      avanzar(1e6); // los parámetros quedan en su destino
      let pk = [1, 0];
      if (estado.pulso) pk = [Math.min(1, t / estado.pulso.dur), estado.pulso.fuerza];
      if (estado.imprimir) estado.imprimir.t0 = 0;
      if (gl) dibujarGL(t, pk);
      else dibujarEstatico();
    },
    pausar() {
      estado.pausado = true;
      cancelAnimationFrame(raf);
      raf = 0;
    },
    reanudar() {
      estado.pausado = false;
      estado.tCongelado = null;
      pedirCuadro();
    },
    destruir() {
      if (estado.destruido) return;
      estado.destruido = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', alVisibilidad);
      if (gl && !estado.perdido) {
        texs.forEach((t) => gl.deleteTexture(t));
        if (prog) gl.deleteProgram(prog);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
      raiz.remove();
    },
    listo: () => listoP,
    webgl: Boolean(gl),
  };
  return api;
}
