// Glifos propios de A · LUZ (SVG de trazo, 16x16; los de rol en 24x24 sobre el mapa). Nada de emojis ni sets genericos:
// cada eje del motor tiene su dibujo, el riesgo tiene el suyo y los roles se leen sobre la Grieta.
import { svg } from './util.js';

const P = {
  mecanica: ['M3.5 2l8.5 4.6-3.8 1.3-1.4 3.9z', 'M11.5 11l2.5 2.5', 'M12.6 8.4h2.2', 'M9.2 12.6v2.2'],
  macro: ['M8 1.6L14.4 8 8 14.4 1.6 8z', 'M5.2 10.8L10.8 5.2'],
  laneo: ['M2 11.5L11.5 2', 'M4.5 14L14 4.5', { c: [7.8, 7.8, 1.3] }],
  teamfight: [{ c: [8, 3.2, 1.5], f: 1 }, { c: [3.2, 7, 1.5], f: 1 }, { c: [12.8, 7, 1.5], f: 1 }, { c: [5, 12.6, 1.5], f: 1 }, { c: [11, 12.6, 1.5], f: 1 }],
  shotcalling: [{ c: [3.8, 12.2, 1.4], f: 1 }, 'M3.8 8.2a4 4 0 0 1 4 4', 'M3.8 4.2a8 8 0 0 1 8 8'],
  adaptabilidad: ['M3 6.5a5.2 5.2 0 0 1 9.3-1.8', 'M12.6 2v3h-3', 'M13 9.5a5.2 5.2 0 0 1-9.3 1.8', 'M3.4 14v-3h3'],
  mentalidad: ['M1.5 8c1.6-4.2 3-4.2 4.3 0s2.6 2.2 4 0 2.6-1.2 4.7 0'],
  arraigo: ['M8 2v7.5', 'M8 9.5l-4.5 4.5', 'M8 9.5l4.5 4.5', 'M8 9.5V14.5', 'M5.5 4.5L8 2l2.5 2.5'],
  sinergia: [{ c: [6, 8, 4] }, { c: [10, 8, 4] }],
  hype: ['M8 1.5l1.6 4.9L14.5 8l-4.9 1.6L8 14.5 6.4 9.6 1.5 8l4.9-1.6z'],
  ranked: ['M3 6l5-4 5 4', 'M3 10l5-4 5 4', 'M3 14l5-4 5 4'],
  studies: ['M8 4.2C6 2.9 3.6 2.6 1.6 3.1v9.8c2-.5 4.4-.2 6.4 1.1 2-1.3 4.4-1.6 6.4-1.1V3.1c-2-.5-4.4-.2-6.4 1.1z', 'M8 4.2V14'],
  sleep: ['M10.8 2.4A6 6 0 1 0 13.6 11 5 5 0 0 1 10.8 2.4z'],
  familyTrust: ['M2 8l6-5.5L14 8', 'M4 7v7h8V7', 'M7 14v-3.5h2V14'],
  jerarquia: ['M3 14v-4', 'M8 14V6', 'M13 14V2'],
  nivel: ['M1.5 13l4-5 3 3 6-8'],
  hypeFama: ['M8 1.5l1.6 4.9L14.5 8l-4.9 1.6L8 14.5 6.4 9.6 1.5 8l4.9-1.6z'],
  // riesgo
  seguro: ['M8 1.6l5.4 2v4.3c0 3.4-2.4 5.7-5.4 6.5-3-.8-5.4-3.1-5.4-6.5V3.6z'],
  incierto: [{ c: [8, 8, 6] }, { d: 'M8 2a6 6 0 0 1 0 12z', f: 1 }],
  ruleta: ['M3 3h10v10H3z', { c: [5.6, 5.6, 0.9], f: 1 }, { c: [10.4, 10.4, 0.9], f: 1 }, { c: [8, 8, 0.9], f: 1 }],
  alto: ['M8 2l6.5 11.5h-13z', 'M8 6.3v3.4', { c: [8, 11.6, 0.6], f: 1 }],
  candado: ['M4.8 7V5.2a3.2 3.2 0 0 1 6.4 0V7', 'M3.2 7h9.6v7.4H3.2z'],
  // tipos de beat del relato
  meta: ['M8 1.5v13', 'M1.5 8h13', 'M8 4.5L11.5 8 8 11.5 4.5 8z'],
  mercado: ['M2 5h10.5L10 2.5', 'M14 11H3.5L6 13.5'],
  practica: [{ c: [8, 8, 6] }, { c: [8, 8, 3] }, { c: [8, 8, 0.8], f: 1 }],
  campeones: ['M8 1.5l5.6 3.25v6.5L8 14.5l-5.6-3.25v-6.5z'],
  temporada: ['M2 3.5h12v10.5H2z', 'M2 6.5h12', 'M5 2v3', 'M11 2v3'],
  rendimiento: ['M3 14v-4', 'M8 14V6', 'M13 14V2'],
  event: ['M8 1.5l1.6 4.9L14.5 8l-4.9 1.6L8 14.5 6.4 9.6 1.5 8l4.9-1.6z'],
  amateur: ['M2 8l6-5.5L14 8', 'M4 7v7h8V7'],
  serie: ['M3 3l10 10', 'M13 3L3 13'],
  punto: [{ c: [8, 8, 2.2], f: 1 }],
  copa: ['M4.5 2h7v3.5a3.5 3.5 0 0 1-7 0z', 'M8 9v3', 'M5 14h6', 'M4.5 3.5H2.5a2 2 0 0 0 2 2.6', 'M11.5 3.5h2a2 2 0 0 1-2 2.6'],
  mundo: [{ c: [8, 8, 6] }, 'M2 8h12', 'M8 2c2.2 2.2 2.2 9.8 0 12', 'M8 2c-2.2 2.2-2.2 9.8 0 12'],
  flecha: ['M2.5 8h11', 'M9.5 4l4 4-4 4'],
};

// Clave del motor -> glifo (el campo de `previa` es una ruta tipo player.stats.macro).
export function glifoDeCampo(campo = '') {
  const k = campo.split('.').pop();
  if (k === 'ranked' || k === 'soloqElo') return 'ranked';
  if (P[k]) return k;
  return 'punto';
}
export const ABREVIATURA = {
  mecanica: 'MEC', macro: 'MACRO', laneo: 'LANEO', teamfight: 'TF', shotcalling: 'CALLS', adaptabilidad: 'ADAPT',
  mentalidad: 'CONS', arraigo: 'ARRAIGO', sinergia: 'SINERG', hype: 'HYPE', ranked: 'SOLOQ', studies: 'ESTUD',
  sleep: 'SUEÑO', familyTrust: 'CASA', jerarquia: 'JERARQ', nivel: 'NIVEL',
};

export function icono(nombre, { clase = 'ico', titulo } = {}) {
  const trazos = P[nombre] ?? P.punto;
  const s = svg('svg', { class: clase, viewBox: '0 0 16 16', 'aria-hidden': titulo ? null : 'true', role: titulo ? 'img' : null, 'aria-label': titulo ?? null });
  for (const t of trazos) {
    if (typeof t === 'string') s.append(svg('path', { d: t }));
    else if (t.c) s.append(svg('circle', { cx: t.c[0], cy: t.c[1], r: t.c[2], class: t.f ? 'lleno' : null }));
    else if (t.d) s.append(svg('path', { d: t.d, class: t.f ? 'lleno' : null }));
  }
  return s;
}

// Magnitud por CANTIDAD: baja = 1, media = 2, alta = 3 triangulos. Arriba si suma, abajo si resta.
const CANTIDAD = { baja: 1, media: 2, alta: 3 };
export function triangulos(magnitud, signo) {
  const n = CANTIDAD[magnitud] ?? 1;
  const baja = signo === '-';
  const s = svg('svg', { class: `tri ${baja ? 'baja' : 'sube'}`, viewBox: `0 0 ${n * 8} 8`, width: n * 8, height: 8, 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) {
    const x = i * 8;
    s.append(svg('path', { d: baja ? `M${x + 0.5} 1.5h6l-3 5z` : `M${x + 0.5} 6.5h6l-3-5z` }));
  }
  return s;
}

// Rol sobre la Grieta: el cuadrado del mapa tenue y el carril propio encendido.
const ROL = {
  top: ['M5 19V5h14'],
  jungla: ['M6.5 13c2.6-.4 4-4.6 6.8-5.6', 'M10.7 17.6c2.6-.4 4-4.6 6.8-5.6'],
  mid: ['M6 18L18 6'],
  adc: ['M5 19h14V5'],
  support: ['M15.5 10.5l3 4.5-3 4.5-3-4.5z', 'M5 19h7'],
};
export function glifoRol(rol, clase = 'glifo-rol') {
  const s = svg('svg', { class: clase, viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  s.append(svg('path', { class: 'mapa', d: 'M3.5 3.5h17v17h-17z' }));
  for (const d of ROL[rol] ?? ROL.mid) s.append(svg('path', { class: 'carril', d }));
  return s;
}
