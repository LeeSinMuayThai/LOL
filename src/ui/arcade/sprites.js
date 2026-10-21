// Los sprites del arcade (H3k): LoL dibujado por código, sin un solo archivo de arte. El Barón (y sus primos: el dragón y
// el Heraldo, la misma bestia con otro color y otro tamaño), los campeones como fichas con el retrato adentro, los minions,
// el rayo del smite y los skillshots telegrafiados (línea, círculo, cono) como los pinta el cliente. Todo en unidades del
// mundo de la mecánica; los colores llegan de la paleta (`kit.js`, de los tokens).

import { tinte, mezcla } from './kit.js';

const TAU = Math.PI * 2;

// Una ficha de campeón: el retrato recortado en círculo (o las iniciales), el aro del equipo y su brillo.
export function campeon(ctx, x, y, r, { borde, retrato = null, pal, brillo = 0.6, px = (n) => n * 0.2 }) {
  ctx.save();
  ctx.shadowColor = tinte(borde, brillo);
  ctx.shadowBlur = r * 2.2 * (1 / Math.max(0.0001, px(1)));
  ctx.fillStyle = tinte(pal.hundido);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.86, 0, TAU);
  ctx.clip();
  if (retrato?.img) {
    ctx.drawImage(retrato.img, x - r, y - r, r * 2, r * 2);
  } else {
    const g = ctx.createLinearGradient(x, y - r, x, y + r);
    g.addColorStop(0, tinte(mezcla(borde, pal.fondo, 0.4)));
    g.addColorStop(1, tinte(mezcla(borde, pal.fondo, 0.8)));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    if (retrato?.iniciales) {
      ctx.fillStyle = tinte(pal.tinta);
      ctx.font = `800 ${r * 0.8}px ${pal.display}`;
      ctx.textAlign = 'center';
      ctx.fillText(retrato.iniciales, x, y + r * 0.3);
    }
  }
  ctx.restore();
  ctx.strokeStyle = tinte(borde);
  ctx.lineWidth = Math.max(r * 0.14, px(1.5));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
}

// Un minion: el cuerpo, la cabeza con su casco y el paso (bamboleo con `t`).
export function minion(ctx, x, y, s, color, t, pal) {
  const bob = Math.sin(t * 9) * s * 0.12;
  ctx.fillStyle = tinte(mezcla(color, pal.fondo, 0.35));
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.2 + bob, s * 0.55, s * 0.6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = tinte(color);
  ctx.beginPath();
  ctx.arc(x, y - s * 0.45 + bob, s * 0.42, Math.PI, 0);
  ctx.lineTo(x + s * 0.5, y - s * 0.3 + bob);
  ctx.lineTo(x - s * 0.5, y - s * 0.3 + bob);
  ctx.fill();
  ctx.fillStyle = tinte(pal.oro, 0.9);
  ctx.fillRect(x - s * 0.18, y - s * 0.42 + bob, s * 0.36, s * 0.1);
}

// La bestia del pozo. `s` = escala (≈ medio ancho de la cabeza); `golpe` (0..1) la pone blanca un instante; `furia`
// (0..1) le abre la boca y le enciende los ojos cuando le queda poca vida.
export function bestia(ctx, x, y, s, t, { color, pal, golpe = 0, furia = 0, cuernos = 3 }) {
  const oscuro = mezcla(color, pal.fondo, 0.62);
  const piel = mezcla(color, pal.blanco, golpe * 0.75);
  // los tentáculos, detrás: cuatro curvas gruesas que se mecen
  for (let k = 0; k < 4; k += 1) {
    const lado = k < 2 ? -1 : 1;
    const abre = k % 2 === 0 ? 1.25 : 0.7;
    const fase = t * 1.6 + k * 1.3;
    const bx = x + lado * s * 0.5;
    const by = y + s * 0.45;
    const tx = x + lado * s * (1.6 * abre) + Math.sin(fase) * s * 0.25;
    const ty = y + s * (0.2 + 0.55 * (k % 2)) + Math.cos(fase) * s * 0.18;
    ctx.strokeStyle = tinte(oscuro);
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.34;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(x + lado * s * 1.1, y + s * 1.05, tx, ty);
    ctx.stroke();
    ctx.strokeStyle = tinte(color, 0.55);
    ctx.lineWidth = s * 0.12;
    ctx.stroke();
  }
  // el cuello que sale del pozo
  const sway = Math.sin(t * 1.2) * s * 0.08;
  ctx.fillStyle = tinte(oscuro);
  ctx.beginPath();
  ctx.ellipse(x + sway * 0.5, y + s * 0.8, s * 0.7, s * 0.55, 0, 0, TAU);
  ctx.fill();
  // la cabeza
  const hx = x + sway;
  const hy = y - s * 0.1 + Math.sin(t * 2.1) * s * 0.04;
  const g = ctx.createRadialGradient(hx, hy - s * 0.4, s * 0.1, hx, hy, s * 1.1);
  g.addColorStop(0, tinte(mezcla(piel, pal.blanco, 0.18)));
  g.addColorStop(0.55, tinte(piel));
  g.addColorStop(1, tinte(oscuro));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(hx - s, hy);
  ctx.quadraticCurveTo(hx - s * 0.95, hy - s * 0.95, hx, hy - s * 0.98);
  ctx.quadraticCurveTo(hx + s * 0.95, hy - s * 0.95, hx + s, hy);
  ctx.quadraticCurveTo(hx + s * 0.75, hy + s * 0.75, hx, hy + s * 0.82);
  ctx.quadraticCurveTo(hx - s * 0.75, hy + s * 0.75, hx - s, hy);
  ctx.fill();
  // las placas del caparazón
  ctx.strokeStyle = tinte(oscuro, 0.8);
  ctx.lineWidth = s * 0.05;
  for (let k = 1; k <= 2; k += 1) {
    ctx.beginPath();
    ctx.arc(hx, hy + s * 0.2, s * (0.35 + 0.28 * k), Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  // los cuernos
  ctx.fillStyle = tinte(mezcla(oscuro, pal.tinta, 0.25));
  for (let k = 0; k < cuernos; k += 1) {
    const u = cuernos === 1 ? 0 : k / (cuernos - 1) - 0.5;
    const cx = hx + u * s * 1.2;
    const cy = hy - s * 0.85 + Math.abs(u) * s * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.12, cy + s * 0.1);
    ctx.lineTo(cx + u * s * 0.5, cy - s * 0.55);
    ctx.lineTo(cx + s * 0.12, cy + s * 0.1);
    ctx.fill();
  }
  // los ojos
  ctx.save();
  ctx.shadowColor = tinte(pal.oro, 0.9);
  ctx.shadowBlur = s * (0.6 + furia);
  ctx.fillStyle = tinte(mezcla(pal.oro, pal.blanco, furia * 0.5));
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(hx + lado * s * 0.42, hy - s * 0.18, s * 0.17, s * 0.07 + furia * s * 0.03, lado * 0.35, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // la boca y los dientes
  const abre = s * (0.1 + furia * 0.22 + Math.max(0, Math.sin(t * 3)) * 0.05);
  ctx.fillStyle = tinte(pal.hundido);
  ctx.beginPath();
  ctx.ellipse(hx, hy + s * 0.38, s * 0.42, abre, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = tinte(pal.tinta, 0.9);
  for (let k = -2; k <= 2; k += 1) {
    ctx.beginPath();
    ctx.moveTo(hx + k * s * 0.15 - s * 0.05, hy + s * 0.38 - abre);
    ctx.lineTo(hx + k * s * 0.15, hy + s * 0.38 - abre + s * 0.12);
    ctx.lineTo(hx + k * s * 0.15 + s * 0.05, hy + s * 0.38 - abre);
    ctx.fill();
  }
}

// El rayo del smite: quebrado, con el núcleo blanco y el halo del color. `azar` es el del jugo.
export function rayo(ctx, x1, y1, x2, y2, { color, pal, azar, ancho = 1.2, quiebres = 9 }) {
  const pts = [[x1, y1]];
  for (let i = 1; i < quiebres; i += 1) {
    const u = i / quiebres;
    const desvio = (azar() - 0.5) * Math.hypot(x2 - x1, y2 - y1) * 0.12;
    pts.push([x1 + (x2 - x1) * u + desvio, y1 + (y2 - y1) * u + desvio * 0.3]);
  }
  pts.push([x2, y2]);
  const trazo = (w, c) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  trazo(ancho * 4, tinte(color, 0.25));
  trazo(ancho * 1.8, tinte(color, 0.8));
  trazo(ancho * 0.6, tinte(pal.blanco, 0.95));
  ctx.restore();
}

// Un skillshot telegrafiado como en el cliente: el área en el color del rival, el relleno que avanza con `progreso`
// (0..1, cuando llega al borde pega) y, activo, el golpe en sí.
export function telegrafo(ctx, tiro, progreso, { pal, activo = false, t = 0 }) {
  const c = pal.rival;
  ctx.save();
  if (tiro.tipo === 'linea') {
    ctx.translate(tiro.ox, tiro.oy);
    ctx.rotate(Math.atan2(tiro.dy, tiro.dx));
    const w = tiro.ancho;
    ctx.fillStyle = tinte(c, activo ? 0.5 : 0.13);
    ctx.fillRect(0, -w / 2, tiro.largo, w);
    if (!activo) {
      ctx.fillStyle = tinte(c, 0.28);
      ctx.fillRect(0, -w / 2, tiro.largo * progreso, w);
    }
    ctx.strokeStyle = tinte(c, 0.85);
    ctx.lineWidth = 0.35;
    ctx.strokeRect(0, -w / 2, tiro.largo, w);
    if (activo) {
      const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
      g.addColorStop(0, tinte(c, 0));
      g.addColorStop(0.5, tinte(pal.blanco, 0.95));
      g.addColorStop(1, tinte(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, -w * 0.3, tiro.largo, w * 0.6);
    }
  } else if (tiro.tipo === 'circulo') {
    ctx.fillStyle = tinte(c, activo ? 0.55 : 0.12);
    ctx.beginPath();
    ctx.arc(tiro.cx, tiro.cy, tiro.radio, 0, TAU);
    ctx.fill();
    if (!activo) {
      ctx.fillStyle = tinte(c, 0.3);
      ctx.beginPath();
      ctx.arc(tiro.cx, tiro.cy, tiro.radio * progreso, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = tinte(activo ? pal.blanco : c, 0.9);
    ctx.lineWidth = activo ? 0.8 : 0.35;
    ctx.beginPath();
    ctx.arc(tiro.cx, tiro.cy, tiro.radio + (activo ? Math.sin(t * 40) * 0.4 : 0), 0, TAU);
    ctx.stroke();
  } else {
    const a0 = tiro.angulo - tiro.apertura / 2;
    const a1 = tiro.angulo + tiro.apertura / 2;
    const cuña = (r) => {
      ctx.beginPath();
      ctx.moveTo(tiro.ox, tiro.oy);
      ctx.arc(tiro.ox, tiro.oy, r, a0, a1);
      ctx.closePath();
    };
    ctx.fillStyle = tinte(c, activo ? 0.5 : 0.12);
    cuña(tiro.alcance);
    ctx.fill();
    if (!activo) {
      ctx.fillStyle = tinte(c, 0.28);
      cuña(tiro.alcance * progreso);
      ctx.fill();
    }
    ctx.strokeStyle = tinte(activo ? pal.blanco : c, 0.85);
    ctx.lineWidth = 0.35;
    cuña(tiro.alcance);
    ctx.stroke();
  }
  ctx.restore();
}
