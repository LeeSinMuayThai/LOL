// UNA LINEA (PLANUI §4.9; LINEA.md §4.6): el confeti de los momentos. Un participante de beats.js.
//
//   import { crearConfeti } from './confeti.js';
//   const confeti = crearConfeti(canvas, { colores: ['--gold', '--org-furia'], semilla: 'titulo-2031', cantidad: 260,
//     origenes: [{ tipo: 'canon', x: 0, y: 1.02, angulo: 22, t: 260 }, { tipo: 'canon', x: 1, y: 1.02, angulo: -22, t: 260 },
//                { tipo: 'cortina', t: 420 }, { tipo: 'lluvia', t: 2600 }] });
//   beats.agregar(confeti);   // en(t) dibuja el instante t
//
// `en(t)` es una funcion PURA de t: cada papelito se mueve en forma cerrada (gravedad + arrastre lineal + viento:
// x(s) = x0 + w s + (vx - w)(1 - e^-ks)/k, y(s) = y0 + (g/k) s + (vy - g/k)(1 - e^-ks)/k), con un vaiven que crece a
// medida que frena, un giro en el plano y un volteo (la escala Y oscila: se ven las dos caras, una mas oscura, y el oro
// destella de frente). Asi congelar(t) dibuja exactamente lo mismo dos veces, sin re-simular nada. Todo lo aleatorio
// sale del PRNG decorativo (comun/azar.js) al crear; la lluvia del loop vivo recicla cada papelito por generaciones con
// un hash entero de (papelito, generacion), tambien puro.
//   canon    dispara desde (x, y) hacia arriba, inclinado `angulo` grados desde la vertical (+ hacia la derecha)
//   cortina  papelitos y serpentinas que caen desde arriba
//   lluvia   unos pocos que siguen cayendo para siempre (el loop vivo), reciclados cada `periodo` ms
// Colores: nombres de token (el hex vive en tokens.css). Unidades: el alto del lienzo es 1.
// `calma` (opcional): { desde, dur, alfa, zonas() } — desde `desde` (ms), en `dur` ms, lo que pasa por detras de las
// zonas (rects en px CSS del lienzo; la pantalla devuelve la caja del texto) baja a `alfa`: el confeti no le roba
// contraste a la letra chica. Sigue siendo puro en t (las zonas son layout, no estado).
import { crearAzar } from '../../comun/azar.js';
import { leerColor } from './util.js';

const MAXIMO = 300;
const DPR_MAX = 2;
const ALTO_REF = 900; // el tamano de los papelitos esta pensado para un lienzo de 900 px de alto
const ESCALA_MIN = 0.62;
const PARTES = { canon: 0.34, cortina: 0.14, lluvia: 0.18 };
const SERPENTINA = { parte: 0.45, puntos: 22, largo: [0.07, 0.15], ancho: [2.2, 3.4], vueltas: [0.8, 1.5], cae: [0.045, 0.085] };
const CANON = { apertura: 15, fuerza: [1.45, 2.6], dur: 170, arrastre: [2.4, 4.2], cae: [0.07, 0.16] };
const CORTINA = { dur: 1700, arrastre: [1.5, 2.5], cae: [0.06, 0.12] };
const LLUVIA = { periodo: [7000, 11500], cae: [0.06, 0.11] };
const VIENTO = [-0.012, 0.02];
const PAPEL = { ancho: [6, 10], alto: [9, 15], giro: [-7, 7], volteo: [5, 13], vaiven: [0.006, 0.02], frec: [1.4, 3.2] };
const PROFUNDIDAD = [0.55, 1];
const PESO_ORO = 0.5; // la mitad de los papelitos son del primer color (el oro)

export const ORIGENES_DEF = [
  { tipo: 'canon', x: 0, y: 1.02, angulo: 22, t: 0 },
  { tipo: 'canon', x: 1, y: 1.02, angulo: -22, t: 0 },
  { tipo: 'cortina', t: 160 },
  { tipo: 'lluvia', t: 2400 },
];

// hash entero -> [0, 1): la lluvia lo usa por (papelito, generacion, campo) sin estado
function hash01(a, b, c) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
const entre = (u, [a, b]) => a + u * (b - a);

export function crearConfeti(lienzo, { colores = ['--gold', '--carta-oro-a', '--luz-blanca'], semilla = 'confeti', origenes = ORIGENES_DEF, cantidad = 260, calma = null } = {}) {
  const azar = crearAzar(String(semilla));
  const total = Math.min(MAXIMO, Math.max(0, Math.round(cantidad)));
  // tres tonos por color: la cara de atras (oscura), la de frente y el destello
  const tonos = colores.map((tok) => {
    const c = leerColor(tok).map((v) => Math.round(v * 255));
    const osc = c.map((v) => Math.round(v * 0.52));
    const cla = c.map((v) => Math.round(v + (255 - v) * 0.5));
    return [osc, c, cla].map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);
  });
  const elegirColor = (u) => (u < PESO_ORO || tonos.length === 1 ? 0 : 1 + Math.floor(((u - PESO_ORO) / (1 - PESO_ORO)) * (tonos.length - 1)));
  const papel = (z) => ({
    w: azar.entre(...PAPEL.ancho) * z,
    h: azar.entre(...PAPEL.alto) * z,
    rot0: azar.entre(0, Math.PI * 2),
    giro: azar.entre(...PAPEL.giro),
    volteo: azar.entre(...PAPEL.volteo),
    fase: azar.entre(0, Math.PI * 2),
    vaiven: azar.entre(...PAPEL.vaiven),
    frec: azar.entre(...PAPEL.frec),
    color: elegirColor(azar.siguiente()),
    alfa: 0.55 + 0.45 * z,
  });

  // el reparto: cada origen se lleva su parte de `total`
  const pesos = origenes.map((o) => o.parte ?? PARTES[o.tipo] ?? 0.1);
  const suma = pesos.reduce((s, x) => s + x, 0) || 1;
  const papeles = [];
  const serpentinas = [];
  const lluvia = [];
  origenes.forEach((o, i) => {
    const n = Math.round((total * pesos[i]) / suma);
    for (let j = 0; j < n; j++) {
      const z = azar.entre(...PROFUNDIDAD);
      if (o.tipo === 'canon') {
        const ap = ((o.apertura ?? CANON.apertura) * Math.PI) / 180;
        const ang = ((o.angulo ?? 0) * Math.PI) / 180 + azar.entre(-ap, ap);
        const f = azar.entre(...(o.fuerza ?? CANON.fuerza));
        const k = azar.entre(...CANON.arrastre);
        papeles.push({ ...papel(z), t0: (o.t ?? 0) + azar.entre(0, o.dur ?? CANON.dur), x0: o.x ?? 0, y0: o.y ?? 1, vx: Math.sin(ang) * f, vy: -Math.cos(ang) * f, k, g: azar.entre(...CANON.cae) * k, vw: azar.entre(...VIENTO) });
      } else if (o.tipo === 'cortina') {
        const k = azar.entre(...CORTINA.arrastre);
        const base = { t0: (o.t ?? 0) + azar.entre(0, o.dur ?? CORTINA.dur), x0: azar.entre(0.02, 0.98), y0: azar.entre(-0.08, -0.02), vx: 0, vy: 0, k, vw: azar.entre(...VIENTO) };
        if (azar.siguiente() < (o.serpentinas ?? SERPENTINA.parte)) {
          serpentinas.push({ ...base, g: azar.entre(...SERPENTINA.cae) * k, largo: azar.entre(...SERPENTINA.largo) * z, ancho: azar.entre(...SERPENTINA.ancho) * z, vueltas: azar.entre(...SERPENTINA.vueltas), fase: azar.entre(0, Math.PI * 2), frec: azar.entre(...PAPEL.frec), vaiven: azar.entre(...PAPEL.vaiven), color: elegirColor(azar.siguiente()), alfa: 0.6 + 0.4 * z, inclina: azar.entre(-0.5, 0.5) });
        } else papeles.push({ ...papel(z), ...base, g: azar.entre(...CORTINA.cae) * k });
      } else if (o.tipo === 'lluvia') {
        lluvia.push({ indice: j + i * MAXIMO, t: o.t ?? 0, periodo: azar.entre(...(o.periodo ?? LLUVIA.periodo)), desfase: azar.entre(0, 1), z });
      }
    }
  });

  const ctx = lienzo.getContext('2d');
  let css = { ancho: 0, alto: 0, dpr: 1 };
  function medir() {
    const ancho = lienzo.clientWidth;
    const alto = lienzo.clientHeight;
    if (!ancho || !alto) return false;
    const dpr = Math.min(DPR_MAX, devicePixelRatio || 1);
    if (ancho !== css.ancho || alto !== css.alto || dpr !== css.dpr) {
      css = { ancho, alto, dpr };
      lienzo.width = Math.round(ancho * dpr);
      lienzo.height = Math.round(alto * dpr);
    }
    return true;
  }

  // donde esta un papelito s segundos despues de salir (en px CSS)
  function posicion(p, s) {
    const e = 1 - Math.exp(-p.k * s);
    const term = p.g / p.k;
    const x = p.x0 * (css.ancho / css.alto) + p.vw * s + ((p.vx - p.vw) * e) / p.k + p.vaiven * Math.sin(p.frec * s + p.fase) * e;
    const y = p.y0 + term * s + ((p.vy - term) * e) / p.k;
    return [x * css.alto, y * css.alto];
  }
  // la calma: cuanto alfa le queda a lo que pasa por detras de una zona en t
  let zonas = [];
  let kCalma = 1;
  const enZona = (x, y) => zonas.some((z) => x >= z.left && x <= z.right && y >= z.top && y <= z.bottom);
  const alfaEn = (x, y, a) => (kCalma < 1 && enZona(x, y) ? a * kCalma : a);
  function dibujarPapel(p, x, y, s, esc) {
    const rot = p.rot0 + p.giro * s;
    const fl = Math.cos(p.fase + p.volteo * s);
    const af = Math.abs(fl);
    const d = css.dpr;
    const c = Math.cos(rot) * d;
    const sn = Math.sin(rot) * d;
    ctx.setTransform(c, sn, -sn * fl, c * fl, x * d, y * d);
    ctx.globalAlpha = alfaEn(x, y, p.alfa);
    ctx.fillStyle = tonos[p.color][fl < 0 ? 0 : af > 0.93 ? 2 : 1];
    ctx.fillRect((-p.w * esc) / 2, (-p.h * esc) / 2, p.w * esc, p.h * esc);
  }

  function en(t) {
    if (!medir()) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    const esc = Math.max(ESCALA_MIN, css.alto / ALTO_REF);
    const fuera = css.alto * 1.06;
    kCalma = 1;
    zonas = [];
    if (calma && t > calma.desde) {
      const k = Math.min(1, (t - calma.desde) / (calma.dur || 1));
      kCalma = 1 - (1 - calma.alfa) * k * k * (3 - 2 * k);
      zonas = calma.zonas?.() ?? [];
    }
    for (const p of papeles) {
      const s = (t - p.t0) / 1000;
      if (s < 0) continue;
      const [x, y] = posicion(p, s);
      if (y > fuera || y < -css.alto || x < -40 || x > css.ancho + 40) continue;
      dibujarPapel(p, x, y, s, esc);
    }
    // las serpentinas: una cinta que ondula y se retuerce mientras cae (cada tramo con el tono de su cara)
    ctx.lineCap = 'round';
    for (const r of serpentinas) {
      const s = (t - r.t0) / 1000;
      if (s < 0) continue;
      const [cx, cy] = posicion(r, s);
      if (cy - r.largo * css.alto > fuera) continue;
      const d = css.dpr;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.globalAlpha = alfaEn(cx, cy, r.alfa);
      ctx.lineWidth = r.ancho * esc;
      const L = r.largo * css.alto;
      const amp = L * 0.12;
      const inc = r.inclina + 0.25 * Math.sin(r.frec * 0.5 * s + r.fase);
      let prev = null;
      for (let j = 0; j < SERPENTINA.puntos; j++) {
        const u = j / (SERPENTINA.puntos - 1);
        const onda = Math.sin(u * Math.PI * 2 * r.vueltas + r.frec * s + r.fase);
        const lx = onda * amp;
        const ly = (u - 0.5) * L;
        const px = cx + lx * Math.cos(inc) - ly * Math.sin(inc);
        const py = cy + lx * Math.sin(inc) + ly * Math.cos(inc);
        if (prev) {
          const cara = Math.cos(u * Math.PI * 4 * r.vueltas + r.frec * 1.3 * s);
          ctx.strokeStyle = tonos[r.color][cara < -0.2 ? 0 : cara > 0.85 ? 2 : 1];
          ctx.beginPath();
          ctx.moveTo(prev[0], prev[1]);
          ctx.lineTo(px, py);
          ctx.stroke();
        }
        prev = [px, py];
      }
    }
    // la lluvia del loop vivo: cada papelito vuelve a caer en su generacion (hash puro de indice y generacion)
    for (const l of lluvia) {
      const transcurrido = t - l.t - l.desfase * l.periodo;
      if (transcurrido < 0) continue;
      const gen = Math.floor(transcurrido / l.periodo);
      const s = (transcurrido - gen * l.periodo) / 1000;
      const h = (c) => hash01(l.indice, gen, c);
      const k = 2;
      const p = {
        x0: h(1), y0: -0.04, vx: 0, vy: 0, k, g: entre(h(2), LLUVIA.cae) * k, vw: entre(h(3), VIENTO),
        vaiven: entre(h(4), PAPEL.vaiven), frec: entre(h(5), PAPEL.frec), fase: h(6) * Math.PI * 2,
        rot0: h(7) * Math.PI * 2, giro: entre(h(8), PAPEL.giro), volteo: entre(h(9), PAPEL.volteo),
        w: entre(h(10), PAPEL.ancho) * l.z, h: entre(h(11), PAPEL.alto) * l.z, color: elegirColor(h(12)), alfa: 0.5 + 0.4 * l.z,
      };
      const [x, y] = posicion(p, s);
      if (y > fuera) continue;
      dibujarPapel(p, x, y, s, esc);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  return {
    nodo: lienzo,
    fps: 60,
    cantidad: papeles.length + serpentinas.length + lluvia.length,
    en,
    redimensionar: medir,
    destruir() {
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    },
  };
}
