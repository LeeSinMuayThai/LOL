// El kit del arcade (H3k, PLANUI §0.10 "El kit"). Lo que comparten las mecánicas de canvas:
//   · el lienzo 2-D con DPR, que se dibuja en unidades del mundo de la mecánica y se ajusta al ancho;
//   · el bucle con paso fijo (`reloj.js`): a 60 y a 144 Hz la simulación avanza igual; el cuadro solo dibuja;
//   · la entrada: teclado (en `window`, como siempre), mouse y toque, en una cola que el paso consume;
//   · el jugo: partículas, sacudida, hit-stop, cámara lenta, destellos y números que saltan. Su azar es un stream propio
//     que la mecánica siembra con UNA tirada del azar de la interfaz (nunca el azar nativo del navegador);
//   · la entrada a cada juego: una línea, una demo animada de 2 s y 3-2-1;
//   · `prefers-reduced-motion`: sin sacudida, sin cámara lenta, sin chispas de más, y el juego se juega igual.
// Los colores salen de los tokens (`estilos/tokens.css`), leídos en vivo: acá no hay un solo color escrito.

import { crearAcumulador } from './reloj.js';
import { cargarImagen, urlIcono } from '../fx/arte.js';
import { mainDe } from '../core/mundo.js';
import { tick, ding } from '../sonido.js';

export function motionReducido() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// --- color -----------------------------------------------------------------------------------------------------------
const TOKENS = {
  fondo: '--bg-void', superficie: '--bg-surface', elevado: '--bg-raised', hundido: '--bg-sunken',
  tinta: '--ink', tenue: '--ink-dim', mudo: '--ink-mute',
  aliado: '--luz-escenario', rival: '--danger', oro: '--gold', bien: '--up', aviso: '--warn',
  baron: '--rank-master', dragon: '--luz-leyenda', atakhan: '--contra-leyenda', rio: '--luz-academia', blanco: '--luz-blanca'
};
const BLANCO_DE_RESPALDO = { r: 255, g: 255, b: 255 };

function desdeHex(texto) {
  let h = String(texto ?? '').trim().replace('#', '');
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}/i.test(h)) return BLANCO_DE_RESPALDO;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

export function leerPaleta(nodo = document.documentElement) {
  const cs = getComputedStyle(nodo);
  const pal = {};
  for (const [k, v] of Object.entries(TOKENS)) pal[k] = desdeHex(cs.getPropertyValue(v));
  pal.fuente = getComputedStyle(document.body).fontFamily || 'sans-serif';
  pal.display = cs.getPropertyValue('--f-display').trim() || pal.fuente;
  return pal;
}

export const tinte = (c, a = 1) => `rgba(${c.r},${c.g},${c.b},${a})`;
export const mezcla = (a, b, t) => ({ r: Math.round(a.r + (b.r - a.r) * t), g: Math.round(a.g + (b.g - a.g) * t), b: Math.round(a.b + (b.b - a.b) * t) });

// --- el lienzo ---------------------------------------------------------------------------------------------------------
const DPR_MAXIMO = 2;
export function crearLienzo(contenedor, [ancho, alto], { etiqueta = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'arc-lienzo';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  if (etiqueta) canvas.setAttribute('aria-label', etiqueta);
  contenedor.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const l = { canvas, ctx, ancho, alto, escala: 1, dpr: 1 };
  l.ajustar = () => {
    const css = canvas.clientWidth || contenedor.clientWidth || ancho;
    l.dpr = Math.min(DPR_MAXIMO, window.devicePixelRatio || 1);
    l.escala = css / ancho;
    canvas.style.height = `${(css * alto) / ancho}px`;
    canvas.width = Math.round(css * l.dpr);
    canvas.height = Math.round(((css * alto) / ancho) * l.dpr);
  };
  // `n` píxeles de pantalla en unidades del mundo (el texto se lee igual en el celular y en el monitor)
  l.px = (n) => n / l.escala;
  l.empezar = (dx = 0, dy = 0) => {
    const k = l.dpr * l.escala;
    ctx.setTransform(k, 0, 0, k, dx * k, dy * k);
  };
  l.aMundo = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * ancho, y: ((clientY - r.top) / r.height) * alto };
  };
  l.ajustar();
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => l.ajustar()) : null;
  ro?.observe(canvas);
  l.destruir = () => ro?.disconnect();
  return l;
}

// --- la entrada --------------------------------------------------------------------------------------------------------
// `teclas`: las que el juego usa (se les saca el comportamiento por defecto: el Espacio no scrollea la página).
export function crearEntradas(lienzo, { teclas = [] } = {}) {
  const abajo = new Set();
  const cola = [];
  const puntero = { x: lienzo.ancho / 2, y: lienzo.alto / 2, visto: false };
  const usa = new Set(teclas);
  const bajar = (ev) => {
    const k = ev.key.toLowerCase();
    if (!usa.has(k)) return;
    ev.preventDefault();
    if (!ev.repeat) cola.push({ tipo: 'tecla', k });
    abajo.add(k);
  };
  const subir = (ev) => abajo.delete(ev.key.toLowerCase());
  const tocar = (ev) => {
    ev.preventDefault();
    const p = lienzo.aMundo(ev.clientX, ev.clientY);
    Object.assign(puntero, p, { visto: true });
    cola.push({ tipo: 'toque', ...p });
    lienzo.canvas.focus({ preventScroll: true });
  };
  const mover = (ev) => Object.assign(puntero, lienzo.aMundo(ev.clientX, ev.clientY), { visto: true });
  const sinMenu = (ev) => ev.preventDefault();
  window.addEventListener('keydown', bajar);
  window.addEventListener('keyup', subir);
  lienzo.canvas.addEventListener('pointerdown', tocar);
  lienzo.canvas.addEventListener('pointermove', mover);
  lienzo.canvas.addEventListener('contextmenu', sinMenu);
  return {
    abajo,
    puntero,
    empujar: (ev) => cola.push(ev),
    sacar: () => cola.splice(0),
    destruir() {
      window.removeEventListener('keydown', bajar);
      window.removeEventListener('keyup', subir);
      lienzo.canvas.removeEventListener('pointerdown', tocar);
      lienzo.canvas.removeEventListener('pointermove', mover);
      lienzo.canvas.removeEventListener('contextmenu', sinMenu);
    }
  };
}

// --- el jugo -----------------------------------------------------------------------------------------------------------
const CHISPAS_REDUCIDO = 3;
const ROCE = 3.2;
const CAIDA_SACUDIDA = 9;
const VIDA_TEXTO_S = 1.1;
const SUBE_TEXTO = 9;
const VIDA_DESTELLO_S = 0.28;
export function crearJugo(azar, reducido) {
  const chispas = [];
  const textos = [];
  let sacudida = 0;
  let parado = 0;
  let lento = 0;
  let factorLento = 1;
  let destello = null;
  return {
    chispas(x, y, n, color, velocidad = 30, vida = 0.5, tam = 0.9) {
      const total = reducido ? Math.min(n, CHISPAS_REDUCIDO) : n;
      for (let i = 0; i < total; i += 1) {
        const a = azar() * Math.PI * 2;
        const v = velocidad * (0.35 + azar() * 0.65);
        chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: vida * (0.6 + azar() * 0.4), max: vida, color, tam: tam * (0.5 + azar()) });
      }
    },
    texto(x, y, str, color, tam = 14) {
      textos.push({ x, y, str, color, tam, vida: VIDA_TEXTO_S });
    },
    sacudir(m) { if (!reducido) sacudida = Math.max(sacudida, m); },
    parar(ms) { if (!reducido) parado = Math.max(parado, ms / 1000); },
    camaraLenta(f, ms) { if (!reducido) { factorLento = f; lento = ms / 1000; } },
    destellar(color, a = 0.35) { destello = { color, a, vida: VIDA_DESTELLO_S }; },
    // cuánto tiempo de juego corre en este cuadro (0 en hit-stop, una fracción en cámara lenta)
    escala(dt) {
      if (parado > 0) { parado -= dt; return 0; }
      if (lento > 0) { lento -= dt; return factorLento; }
      return 1;
    },
    lento: () => lento > 0 || parado > 0,
    actualizar(dt) {
      for (const c of chispas) {
        c.x += c.vx * dt; c.y += c.vy * dt;
        c.vx -= c.vx * ROCE * dt; c.vy -= c.vy * ROCE * dt;
        c.vida -= dt;
      }
      for (let i = chispas.length - 1; i >= 0; i -= 1) if (chispas[i].vida <= 0) chispas.splice(i, 1);
      for (const t of textos) { t.vida -= dt; t.y -= SUBE_TEXTO * dt; }
      for (let i = textos.length - 1; i >= 0; i -= 1) if (textos[i].vida <= 0) textos.splice(i, 1);
      sacudida = Math.max(0, sacudida - sacudida * CAIDA_SACUDIDA * dt);
      if (destello) { destello.vida -= dt; if (destello.vida <= 0) destello = null; }
    },
    desplazamiento() {
      if (sacudida < 0.05) return { x: 0, y: 0 };
      return { x: (azar() - 0.5) * sacudida, y: (azar() - 0.5) * sacudida };
    },
    dibujar(ctx, lienzo) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const c of chispas) {
        ctx.fillStyle = tinte(c.color, Math.max(0, c.vida / c.max));
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.tam * (0.4 + c.vida / c.max), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      for (const t of textos) {
        const vida = t.vida / VIDA_TEXTO_S;
        // el número salta: arranca grande y se asienta
        const pop = 1 + Math.max(0, vida - 0.8) * 2.2;
        ctx.save();
        ctx.globalAlpha = Math.min(1, vida * 2.5);
        ctx.font = `800 ${lienzo.px(t.tam * pop)}px ${lienzo.paleta?.display ?? 'sans-serif'}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = lienzo.px(4);
        ctx.strokeStyle = tinte(lienzo.paleta?.fondo ?? BLANCO_DE_RESPALDO, 0.85);
        ctx.strokeText(t.str, t.x, t.y);
        ctx.fillStyle = tinte(t.color);
        ctx.fillText(t.str, t.x, t.y);
        ctx.restore();
      }
    },
    dibujarDestello(ctx, lienzo) {
      if (!destello) return;
      ctx.fillStyle = tinte(destello.color, destello.a * (destello.vida / VIDA_DESTELLO_S));
      ctx.fillRect(-2, -2, lienzo.ancho + 4, lienzo.alto + 4);
    }
  };
}

// --- el bucle ----------------------------------------------------------------------------------------------------------
// `alPaso()` corre una vez por paso fijo; `alDibujar(dtReal)` una vez por cuadro. El jugo escala el tiempo de juego
// (hit-stop, cámara lenta), nunca el del dibujo.
export function crearBucle({ alPaso, alDibujar, jugo = null }) {
  const acumular = crearAcumulador();
  let ultimo = performance.now();
  let vivo = true;
  let id = 0;
  const cuadro = (ahora) => {
    if (!vivo) return;
    const dt = Math.min(0.1, Math.max(0, (ahora - ultimo) / 1000));
    ultimo = ahora;
    const n = acumular(dt * (jugo ? jugo.escala(dt) : 1));
    for (let i = 0; i < n && vivo; i += 1) alPaso();
    jugo?.actualizar(dt);
    if (vivo) alDibujar(dt);
    if (vivo) id = requestAnimationFrame(cuadro);
  };
  id = requestAnimationFrame(cuadro);
  return { parar() { vivo = false; cancelAnimationFrame(id); } };
}

// --- la entrada al juego -----------------------------------------------------------------------------------------------
// Una línea arriba, la demo (`demo(ctx, t 0..1)`, dibujada por la mecánica) durante 2 s y 3-2-1. Cualquier tecla o toque
// saltea la demo (no el 3-2-1). Con motion reducido, la demo queda quieta en su mejor cuadro.
const DEMO_S = 2;
const CUENTA_S = 0.55;
export function presentar(lienzo, { linea, demo, reducido = false }) {
  const { ctx, canvas } = lienzo;
  const pal = lienzo.paleta;
  return new Promise((resolver) => {
    const inicio = performance.now();
    let salteado = null;
    const saltear = () => { if (salteado === null) salteado = performance.now(); };
    window.addEventListener('keydown', saltear);
    canvas.addEventListener('pointerdown', saltear);
    let ultimoNumero = 0;
    const cuadro = (ahora) => {
      let t = (ahora - inicio) / 1000;
      if (salteado !== null) t = Math.max(t, DEMO_S + (ahora - salteado) / 1000);
      lienzo.empezar();
      const enDemo = t < DEMO_S;
      demo(ctx, reducido ? 0.72 : Math.min(1, t / DEMO_S), enDemo);
      ctx.fillStyle = tinte(pal.fondo, enDemo ? 0.25 : 0.55);
      ctx.fillRect(0, 0, lienzo.ancho, lienzo.alto);
      ctx.fillStyle = tinte(pal.fondo, 0.82);
      ctx.fillRect(0, 0, lienzo.ancho, lienzo.px(40));
      ctx.textAlign = 'center';
      ctx.font = `700 ${lienzo.px(15)}px ${pal.fuente}`;
      ctx.fillStyle = tinte(pal.tinta);
      ctx.fillText(linea, lienzo.ancho / 2, lienzo.px(26));
      if (!enDemo) {
        const k = Math.floor((t - DEMO_S) / CUENTA_S);
        if (k >= 3) {
          window.removeEventListener('keydown', saltear);
          canvas.removeEventListener('pointerdown', saltear);
          ding();
          resolver();
          return;
        }
        if (k + 1 !== ultimoNumero) { ultimoNumero = k + 1; tick(); }
        const f = ((t - DEMO_S) % CUENTA_S) / CUENTA_S;
        const tam = reducido ? 72 : 72 * (1.35 - 0.35 * Math.min(1, f * 3));
        ctx.globalAlpha = reducido ? 1 : 1 - Math.max(0, f - 0.7) * 2.5;
        ctx.font = `800 ${lienzo.px(tam)}px ${pal.display}`;
        ctx.fillStyle = tinte(pal.oro);
        ctx.fillText(String(3 - k), lienzo.ancho / 2, lienzo.alto / 2 + lienzo.px(tam * 0.35));
        ctx.globalAlpha = 1;
      } else {
        ctx.font = `600 ${lienzo.px(11)}px ${pal.fuente}`;
        ctx.fillStyle = tinte(pal.tenue);
        ctx.fillText('así se juega · tocá cualquier tecla para arrancar ya', lienzo.ancho / 2, lienzo.alto - lienzo.px(12));
      }
      requestAnimationFrame(cuadro);
    };
    requestAnimationFrame(cuadro);
  });
}

// --- tu main -----------------------------------------------------------------------------------------------------------
// El retrato de tu campeón (Data Dragon, `fx/arte.js`): es tu partida, así que acá sí va su cara. Sin red, las iniciales.
export function retratoDe(state) {
  const clave = mainDe(state);
  const r = { img: null, iniciales: String(state?.player?.name ?? 'Vos').slice(0, 2).toUpperCase() };
  if (clave) cargarImagen(urlIcono(clave)).then((img) => { r.img = img; });
  return r;
}

// El marco común: el lienzo, la fila de botones grandes (para el toque) y el pie con las teclas.
export function crearMarco(container, { clase, mundo, etiqueta, botones = [], pie = '' }) {
  container.innerHTML = '';
  const caja = document.createElement('div');
  caja.className = `arc ${clase}`;
  container.appendChild(caja);
  const lienzo = crearLienzo(caja, mundo, { etiqueta });
  lienzo.paleta = leerPaleta(container);
  const fila = document.createElement('div');
  fila.className = 'arc-botones';
  const nodos = botones.map(({ texto, tecla, alTocar }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'arc-boton';
    b.innerHTML = `<span>${texto}</span>${tecla ? `<kbd>${tecla}</kbd>` : ''}`;
    b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); alTocar(); });
    b.addEventListener('click', (ev) => { if (ev.detail === 0) alTocar(); });
    fila.appendChild(b);
    return b;
  });
  if (nodos.length) caja.appendChild(fila);
  if (pie) {
    const p = document.createElement('p');
    p.className = 'arc-pie';
    p.textContent = pie;
    caja.appendChild(p);
  }
  return { caja, lienzo, botones: nodos };
}
