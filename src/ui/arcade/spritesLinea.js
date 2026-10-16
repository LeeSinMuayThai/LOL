// Los sprites de la línea, el kite y el gancho (M1, ola H entrega 2): LoL dibujado por código, como `sprites.js` (que no se toca).
// La torre y los minions vistos de costado, el bruiser visto desde arriba, el anillo del ataque y el gancho con su cadena. Todo
// en unidades del mundo de la mecánica; los colores llegan de la paleta (`kit.js`, de los tokens).

import { tinte, mezcla } from './kit.js';

const TAU = Math.PI * 2;

// La torre vista de costado: base ancha, fuste y la gema que carga el tiro (`carga` 0..1).
export function torreLado(ctx, x, ySuelo, alto, color, pal, carga = 0) {
  const ancho = alto * 0.42;
  const g = ctx.createLinearGradient(x - ancho / 2, 0, x + ancho / 2, 0);
  g.addColorStop(0, tinte(mezcla(color, pal.fondo, 0.7)));
  g.addColorStop(0.5, tinte(mezcla(color, pal.fondo, 0.35)));
  g.addColorStop(1, tinte(mezcla(color, pal.fondo, 0.75)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - ancho * 0.5, ySuelo);
  ctx.lineTo(x - ancho * 0.28, ySuelo - alto * 0.85);
  ctx.lineTo(x + ancho * 0.28, ySuelo - alto * 0.85);
  ctx.lineTo(x + ancho * 0.5, ySuelo);
  ctx.fill();
  ctx.fillStyle = tinte(mezcla(color, pal.fondo, 0.5));
  ctx.fillRect(x - ancho * 0.4, ySuelo - alto, ancho * 0.8, alto * 0.16);
  ctx.save();
  ctx.shadowColor = tinte(color, 0.9);
  ctx.shadowBlur = alto * (0.25 + carga * 0.5);
  ctx.fillStyle = tinte(mezcla(color, pal.blanco, carga * 0.6));
  ctx.beginPath();
  ctx.arc(x, ySuelo - alto * 1.12, alto * (0.07 + carga * 0.05), 0, TAU);
  ctx.fill();
  ctx.restore();
}

// Un minion visto de costado, mirando a `lado` (1 derecha, -1 izquierda). `escala` 1 = melee; el cañón va más grande.
export function minionLado(ctx, x, ySuelo, s, color, t, pal, { lado = 1, golpe = 0, canon = false, brillo = 0 } = {}) {
  const bob = Math.sin(t * 8 + x) * s * 0.06;
  const avance = golpe * s * 0.35 * lado;
  ctx.save();
  if (brillo > 0) { ctx.shadowColor = tinte(pal.oro, 0.9); ctx.shadowBlur = s * 1.6 * brillo; }
  ctx.fillStyle = tinte(mezcla(color, pal.fondo, 0.4));
  ctx.beginPath();
  ctx.ellipse(x + avance, ySuelo - s * 0.55 + bob, s * 0.5, s * (canon ? 0.62 : 0.55), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = tinte(color);
  ctx.beginPath();
  ctx.arc(x + avance + lado * s * 0.08, ySuelo - s * 1.18 + bob, s * 0.36, Math.PI, 0);
  ctx.lineTo(x + avance + s * 0.38, ySuelo - s * 1.05 + bob);
  ctx.lineTo(x + avance - s * 0.38, ySuelo - s * 1.05 + bob);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = tinte(pal.oro, 0.9);
  ctx.fillRect(x + avance + lado * s * 0.12 - s * 0.12, ySuelo - s * 1.12 + bob, s * 0.24, s * 0.08);
  if (canon) {
    ctx.fillStyle = tinte(pal.mudo);
    ctx.fillRect(x + avance + lado * s * 0.35, ySuelo - s * 0.75 + bob, lado * s * 0.7, s * 0.2);
    ctx.fillStyle = tinte(pal.tinta, 0.9);
    ctx.beginPath();
    ctx.arc(x + avance + lado * s * 1.05, ySuelo - s * 0.65 + bob, s * 0.13, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = tinte(pal.hundido, 0.7);
  ctx.beginPath();
  ctx.ellipse(x, ySuelo + s * 0.05, s * 0.55, s * 0.1, 0, 0, TAU);
  ctx.fill();
}

// La barra de vida del minion con la zona de remate (lo que tu auto alcanza a sacar) y la marca del límite.
export function barraConRemate(ctx, x, y, ancho, alto, frac, fracRemate, pal, { color, enZona = false }) {
  const x0 = x - ancho / 2;
  ctx.fillStyle = tinte(pal.hundido, 0.92);
  ctx.fillRect(x0 - 0.6, y - 0.6, ancho + 1.2, alto + 1.2);
  ctx.fillStyle = tinte(color);
  ctx.fillRect(x0, y, ancho * Math.max(0, Math.min(1, frac)), alto);
  ctx.fillStyle = tinte(pal.oro, enZona ? 0.5 : 0.22);
  ctx.fillRect(x0, y, ancho * fracRemate, alto);
  ctx.fillStyle = tinte(pal.oro);
  ctx.fillRect(x0 + ancho * fracRemate - 0.25, y - 1.4, 0.5, alto + 2.8);
}

// El bruiser visto desde arriba: el cuerpo con la hombrera del lado al que mira, y el aura (`aura` > 0 dibuja el slow).
export function bruiser(ctx, x, y, r, dx, dy, pal, { t = 0, aturdido = false, aura = 0, furia = 0 } = {}) {
  if (aura > 0) {
    ctx.save();
    ctx.setLineDash([2.2, 2]);
    ctx.lineDashOffset = -t * 6;
    ctx.strokeStyle = tinte(pal.rio, 0.85);
    ctx.lineWidth = 0.6;
    ctx.fillStyle = tinte(pal.rio, 0.1 + 0.05 * Math.sin(t * 6));
    ctx.beginPath();
    ctx.arc(x, y, aura, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  const a = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.shadowColor = tinte(pal.rival, 0.5 + furia * 0.4);
  ctx.shadowBlur = r * 1.8;
  ctx.fillStyle = tinte(mezcla(pal.rival, pal.fondo, aturdido ? 0.75 : 0.45));
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = tinte(mezcla(pal.rival, pal.blanco, 0.15 + furia * 0.2));
  ctx.beginPath();
  ctx.arc(r * 0.18, -r * 0.62, r * 0.38, 0, TAU);
  ctx.arc(r * 0.18, r * 0.62, r * 0.38, 0, TAU);
  ctx.fill();
  ctx.fillStyle = tinte(pal.hundido);
  ctx.beginPath();
  ctx.arc(r * 0.1, 0, r * 0.42, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = tinte(pal.rival);
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = tinte(pal.oro, 0.9);
  ctx.beginPath();
  ctx.moveTo(r * 1.28, 0);
  ctx.lineTo(r * 0.92, -r * 0.2);
  ctx.lineTo(r * 0.92, r * 0.2);
  ctx.fill();
  ctx.restore();
}

// El anillo del ataque alrededor de tu campeón: se llena con `u` (0..1) y, lleno, brilla.
export function anilloDeAtaque(ctx, x, y, r, u, pal, t = 0) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = tinte(pal.mudo, 0.35);
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  const lleno = u >= 1;
  ctx.strokeStyle = tinte(lleno ? pal.oro : mezcla(pal.aliado, pal.oro, u * 0.5), lleno ? 0.8 + 0.2 * Math.sin(t * 14) : 0.95);
  ctx.shadowColor = tinte(pal.oro, lleno ? 0.9 : 0);
  ctx.shadowBlur = lleno ? r * 1.2 : 0;
  ctx.lineWidth = r * (lleno ? 0.22 : 0.16);
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, u));
  ctx.stroke();
  ctx.restore();
}

// El gancho: la cadena desde `(x1,y1)` hasta la cabeza en `(x2,y2)`, con eslabones, y la punta.
export function ganchoConCadena(ctx, x1, y1, x2, y2, pal, { color, ancho = 0.9, t = 0 }) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d < 0.5) return;
  const ux = (x2 - x1) / d;
  const uy = (y2 - y1) / d;
  ctx.save();
  ctx.strokeStyle = tinte(mezcla(color, pal.fondo, 0.3), 0.9);
  ctx.lineWidth = ancho;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = tinte(pal.tinta, 0.85);
  for (let s = 2; s < d; s += 3.2) {
    ctx.beginPath();
    ctx.arc(x1 + ux * s, y1 + uy * s + Math.sin(t * 30 + s) * 0.15, ancho * 0.55, 0, TAU);
    ctx.fill();
  }
  ctx.shadowColor = tinte(color, 0.9);
  ctx.shadowBlur = 8;
  ctx.fillStyle = tinte(mezcla(color, pal.blanco, 0.45));
  ctx.beginPath();
  ctx.moveTo(x2 + ux * 3.4, y2 + uy * 3.4);
  ctx.lineTo(x2 - uy * 2.2, y2 + ux * 2.2);
  ctx.lineTo(x2 - ux * 1.2, y2 - uy * 1.2);
  ctx.lineTo(x2 + uy * 2.2, y2 - ux * 2.2);
  ctx.fill();
  ctx.restore();
}
