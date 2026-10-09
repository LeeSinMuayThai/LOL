// FARO: el sistema operativo inventado. Piezas: glifos propios, logo, barra de menú (la bandeja del sistema es tu cuerpo:
// la batería es el sueño, la señal es la confianza de tu casa o tu jerarquía), dock de los 6 cuartos, ventanas,
// notificaciones y el escudo de rango en SVG propio.
import { el, svg, entero } from './util.js';

// ---------- glifos (24x24, trazo, currentColor) ----------
const P = {
  mecanica: 'M6 3.5 L6 17 L9.6 13.6 L12.2 19.6 L14.6 18.6 L12 12.8 L17 12.6 Z',
  macro: 'M12 3 L21 12 L12 21 L3 12 Z M8 12 L11 15 L16 9',
  laneo: 'M5 20 L10 4 M19 20 L14 4 M12 9 L12 11 M12 14 L12 16',
  teamfight: 'M9 12 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M15 12 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0',
  shotcalling: 'M4 10 L4 14 L8 14 L15 19 L15 5 L8 10 Z M18 9 Q20.5 12 18 15',
  adaptabilidad: 'M4 9 Q9 3 16 7 L18.5 8.5 M18.5 4.5 L18.5 8.5 L14.5 8.5 M20 15 Q15 21 8 17 L5.5 15.5 M5.5 19.5 L5.5 15.5 L9.5 15.5',
  consistencia: 'M3 12 L8 12 L10 8 L13 16 L15 12 L21 12',
  hype: 'M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z',
  arraigo: 'M12 3 L12 14 M12 14 Q7 15 5 20 M12 14 Q17 15 19 20 M12 14 L12 20',
  sinergia: 'M9.5 12 m-4.5 0 a4.5 4.5 0 1 0 9 0 M14.5 12 m4.5 0 a4.5 4.5 0 1 0 -9 0',
  estudios: 'M4 5 Q8 4 12 6.5 Q16 4 20 5 L20 18 Q16 17 12 19.5 Q8 17 4 18 Z M12 6.5 L12 19.5',
  sueno: 'M15.5 3.5 A8.5 8.5 0 1 0 20.5 15 A7 7 0 0 1 15.5 3.5 Z',
  familia: 'M4 11 L12 4 L20 11 M6.5 9.5 L6.5 20 L17.5 20 L17.5 9.5 M10.5 20 L10.5 15 L13.5 15 L13.5 20',
  soloq: 'M5 19 L12 13 L19 19 M5 13.5 L12 7.5 L19 13.5 M8.5 5 L12 2.5 L15.5 5',
  nivel: 'M5 20 L5 14 M10 20 L10 10 M15 20 L15 6 M20 20 L20 3',
  vos: 'M12 8 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M4 21 Q4.5 14 12 14 Q19.5 14 20 21',
  temporada: 'M4 6 L20 6 L20 20 L4 20 Z M4 10 L20 10 M8.5 3 L8.5 7.5 M15.5 3 L15.5 7.5 M8 14 L10 14 M14 14 L16 14 M8 17 L10 17',
  equipo: 'M12 4.5 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M4.5 10 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M19.5 10 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M7.5 18.5 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M16.5 18.5 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0',
  mundo: 'M12 12 m-8.5 0 a8.5 8.5 0 1 0 17 0 a8.5 8.5 0 1 0 -17 0 M3.5 12 L20.5 12 M12 3.5 Q7 12 12 20.5 M12 3.5 Q17 12 12 20.5',
  carrera: 'M3 19 L8.5 12.5 L12.5 15.5 L20.5 5 M15.5 5 L20.5 5 L20.5 10',
  cronica: 'M5 4 L19 4 L19 20 L5 20 Z M8 8 L16 8 M8 11.5 L16 11.5 M8 15 L13 15',
  seguro: 'M12 3 L19.5 6 L19.5 11.5 Q19.5 18 12 21 Q4.5 18 4.5 11.5 L4.5 6 Z M8.5 12 L11 14.5 L15.5 9.5',
  incierto: 'M3 14 Q6 8 9 14 Q12 20 15 14 Q18 8 21 14',
  ruleta: 'M12 12 m-8.5 0 a8.5 8.5 0 1 0 17 0 a8.5 8.5 0 1 0 -17 0 M12 3.5 L12 7 M12 12 L16.5 8.5 M12 12 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0',
  peligro: 'M12 3.5 L21 19.5 L3 19.5 Z M12 9.5 L12 14 M12 16.5 L12 17',
  candado: 'M6 11 L18 11 L18 20 L6 20 Z M8.5 11 L8.5 8 Q8.5 4.5 12 4.5 Q15.5 4.5 15.5 8 L15.5 11',
  check: 'M5 12.5 L10 17.5 L19 7',
  flecha: 'M5 12 L19 12 M13.5 6.5 L19 12 L13.5 17.5',
  mas: 'M12 5 L12 19 M5 12 L19 12',
  rareza: 'M12 3 L20 9 L12 21 L4 9 Z M4 9 L20 9 M9 3.5 L12 9 L15 3.5',
  carpeta: 'M3 6 L9.5 6 L11.5 8.5 L21 8.5 L21 19 L3 19 Z',
  copa: 'M7 4 L17 4 L17 9 Q17 14 12 14 Q7 14 7 9 Z M7 6 L4 6 Q4 10 7.5 10.5 M17 6 L20 6 Q20 10 16.5 10.5 M12 14 L12 18 M8 20 L16 20',
  chat: 'M4 5 L20 5 L20 16 L11 16 L6.5 20 L6.5 16 L4 16 Z',
  apagar: 'M12 3 L12 11 M7 6.5 Q3.5 9.5 4.5 14 Q6 20 12 20 Q18 20 19.5 14 Q20.5 9.5 17 6.5',
};

export function icono(nombre, clase = 'ico') {
  const d = P[nombre] ?? P.nivel;
  const relleno = nombre === 'sueno' || nombre === 'hype';
  return svg('svg', { class: clase, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svg('path', { d, fill: relleno ? 'currentColor' : 'none', 'fill-opacity': relleno ? '0.9' : null, stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

// Flechas de magnitud: la cantidad dice cuánto (baja 1, media 2, alta 3); el color, el signo.
const CANT = { baja: 1, media: 2, alta: 3 };
export function flechas(signo, magnitud) {
  const n = CANT[magnitud] ?? 1;
  const sube = signo !== '-';
  const caja = svg('svg', { class: `flechas ${sube ? 'sube' : 'baja'}`, viewBox: `0 0 ${n * 9} 10`, width: n * 9, height: 10, 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) {
    const x = i * 9;
    caja.append(svg('path', { d: sube ? `M${x + 0.5} 9 L${x + 4} 2 L${x + 7.5} 9 Z` : `M${x + 0.5} 1 L${x + 4} 8 L${x + 7.5} 1 Z`, fill: 'currentColor' }));
  }
  return caja;
}

// campo del motor -> [glifo, etiqueta corta]
const CAMPOS = {
  'player.stats.mecanica': ['mecanica', 'Mecánica'],
  'player.stats.macro': ['macro', 'Macro'],
  'player.stats.laneo': ['laneo', 'Laneo'],
  'player.stats.teamfight': ['teamfight', 'Teamfight'],
  'player.stats.shotcalling': ['shotcalling', 'Shotcalling'],
  'player.stats.adaptabilidad': ['adaptabilidad', 'Adaptab.'],
  'player.stats.mentalidad': ['consistencia', 'Consist.'],
  'player.stats.hype': ['hype', 'Hype'],
  'career.arraigo': ['arraigo', 'Arraigo'],
  'career.sinergia': ['sinergia', 'Sinergia'],
  'player.studies': ['estudios', 'Estudios'],
  'player.sleep': ['sueno', 'Sueño'],
  'player.familyTrust': ['familia', 'Casa'],
  'player.ranked': ['soloq', 'SoloQ'],
  'player.soloqElo': ['soloq', 'SoloQ'],
  nivel: ['nivel', 'Nivel'],
};
export const glifoDe = (campo) => CAMPOS[campo]?.[0] ?? 'nivel';
export const cortoDe = (campo, etiqueta) => CAMPOS[campo]?.[1] ?? etiqueta ?? campo;

export const RIESGOS = { seguro: ['seguro', 'Seguro'], incierto: ['incierto', 'Incierto'], ruleta: ['ruleta', 'Ruleta'], peligroso: ['peligro', 'Peligroso'] };

// ---------- logo ----------
export function logoFaro(conVersion = true) {
  return el('span', { class: 'faro-logo' },
    svg('svg', { viewBox: '0 0 30 20', class: 'faro-glifo', 'aria-hidden': 'true' },
      svg('path', { class: 'faro-haz', d: 'M10 8.3 L29 2.5 L29 17.5 L10 11.7 Z', fill: 'currentColor' }),
      svg('circle', { cx: '5.5', cy: '10', r: '3.6', fill: 'currentColor' })),
    el('span', { class: 'faro-nombre' }, 'FARO'),
    conVersion ? el('span', { class: 'faro-version' }) : null);
}

// ---------- bandeja: el cuerpo como indicadores del sistema ----------
export function bateria(valor, titulo) {
  const v = Math.max(0, Math.min(100, valor));
  const nodo = el('span', { class: 'bandeja-item', title: `${titulo}: ${entero(v)}/100` },
    el('span', { class: 'bateria', style: { '--carga': String(v / 100) }, 'data-baja': v < 35 ? 'si' : null }, el('span', { class: 'bateria-carga' })),
    el('span', { class: 'bandeja-num' }, entero(v)),
    el('span', { class: 'bandeja-et' }, titulo));
  return nodo;
}
export function senal(valor, titulo) {
  const v = Math.max(0, Math.min(100, valor));
  const barras = Math.round(v / 25);
  return el('span', { class: 'bandeja-item', title: `${titulo}: ${entero(v)}/100` },
    el('span', { class: 'senal' }, ...[1, 2, 3, 4].map((i) => el('span', { 'data-on': i <= barras ? 'si' : null, style: { '--i': i } }))),
    el('span', { class: 'bandeja-num' }, entero(v)),
    el('span', { class: 'bandeja-et' }, titulo));
}

export function pips(p) {
  if (!p) return null;
  return el('span', { class: 'pips', 'aria-label': `${p.hechos} de ${p.total}` },
    ...Array.from({ length: p.total }, (_, i) => el('span', { 'data-on': i < p.hechos ? 'si' : i === p.actual ? 'actual' : null })));
}

export function barraMenu({ app, doc, tray = [], fecha, pipsDe }) {
  return el('header', { class: 'barra' },
    el('div', { class: 'barra-izq' }, logoFaro(), el('span', { class: 'barra-app' }, app), doc ? el('span', { class: 'barra-doc' }, doc) : null),
    el('div', { class: 'barra-der' }, ...tray,
      fecha ? el('span', { class: 'barra-fecha' }, fecha, pips(pipsDe)) : null));
}

// ---------- dock: los 6 cuartos ----------
export const CUARTOS = [
  ['vos', 'Vos'], ['temporada', 'Temporada'], ['equipo', 'Equipo'], ['mundo', 'Mundo'], ['carrera', 'Carrera'], ['cronica', 'Crónica'],
];
export function dock(activo, { abierto } = {}) {
  return el('nav', { class: 'dock', 'aria-label': 'Cuartos' },
    el('span', { class: 'dock-inicio' }, logoFaro(false)),
    ...CUARTOS.map(([id, nombre]) => el('button', {
      class: 'dock-app', type: 'button', 'data-cuarto': id, 'aria-current': id === activo ? 'true' : null,
      'data-abierto': id === abierto ? 'si' : null, title: nombre,
    }, icono(id), el('span', { class: 'dock-nombre' }, nombre))));
}

// ---------- ventana ----------
export function ventana({ app, icon, titulo, clase = '', cuerpo = [], enfocada = true, pieza, etiqueta }) {
  return el('section', { class: `ventana ${clase}`, 'data-enfocada': enfocada ? 'si' : null, 'data-pieza': pieza, 'aria-label': etiqueta ?? titulo },
    el('div', { class: 'ventana-titulo' },
      el('span', { class: 'ventana-app' }, icon ? icono(icon, 'ico ico-chico') : null, el('span', {}, app)),
      titulo ? el('span', { class: 'ventana-doc' }, titulo) : null,
      el('span', { class: 'ventana-ctl', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'))),
    el('div', { class: 'ventana-cuerpo' }, ...cuerpo));
}

// ---------- notificación ----------
export function notificacion({ app, icon = 'cronica', titulo, texto, meta, clase = '', destacada = false, hora }) {
  return el('article', { class: `noti ${clase}`, 'data-destacada': destacada ? 'si' : null },
    el('div', { class: 'noti-cab' }, el('span', { class: 'noti-ico' }, icono(icon, 'ico ico-chico')), el('span', { class: 'noti-app' }, app), hora ? el('span', { class: 'noti-hora' }, hora) : null),
    titulo ? el('p', { class: 'noti-titulo' }, titulo) : null,
    texto ? el('p', { class: 'noti-texto' }, texto) : null,
    meta ? el('p', { class: 'noti-meta' }, meta) : null);
}

// tipo de log -> [app, glifo]
const APPS = {
  meta: ['Parche', 'mundo'], campeones: ['Campeones', 'mecanica'], practica: ['Práctica', 'nivel'], temporada: ['Liga', 'temporada'],
  rendimiento: ['Rendimiento', 'carrera'], event: ['Prensa', 'cronica'], amateur: ['Tu semana', 'vos'], serie: ['Serie', 'equipo'],
  escena: ['Mundo', 'mundo'], mercado: ['Mercado', 'cronica'],
};
export const appDeLog = (tipo) => APPS[tipo] ?? ['Sistema', 'nivel'];

// ---------- escudo de rango (propio, no el de Riot) ----------
const ORDEN_TIER = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'master', 'grandmaster', 'challenger'];
export function escudo(tier, clase = 'escudo') {
  const i = Math.max(0, ORDEN_TIER.indexOf(tier));
  const alas = Math.min(3, Math.floor(i / 3) + 1);
  const g = svg('svg', { class: clase, viewBox: '0 0 120 120', 'aria-hidden': 'true', style: `--rank: var(--rank-${ORDEN_TIER[i]})` });
  for (let k = 0; k < alas; k++) {
    const dx = 8 + k * 9;
    g.append(svg('path', { class: 'escudo-ala', d: `M${30 - dx} ${40 + k * 6} L${44 - k * 2} ${54 + k * 4} L${38 - dx} ${78 - k * 2} Z`, opacity: String(0.85 - k * 0.22) }));
    g.append(svg('path', { class: 'escudo-ala', d: `M${90 + dx} ${40 + k * 6} L${76 + k * 2} ${54 + k * 4} L${82 + dx} ${78 - k * 2} Z`, opacity: String(0.85 - k * 0.22) }));
  }
  g.append(
    svg('path', { class: 'escudo-cuerpo', d: 'M60 12 L92 26 L92 62 Q92 92 60 108 Q28 92 28 62 L28 26 Z' }),
    svg('path', { class: 'escudo-interior', d: 'M60 24 L82 34 L82 62 Q82 84 60 96 Q38 84 38 62 L38 34 Z' }),
    svg('path', { class: 'escudo-gema', d: `M60 ${44 - i} L${70 + i * 0.6} 60 L60 ${76 + i} L${50 - i * 0.6} 60 Z` }),
  );
  return g;
}
