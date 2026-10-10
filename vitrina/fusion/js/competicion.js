// LA COMPETICION (PLANUI §4.7). El usuario, del Swiss: "deberia ser un 20 % menos amarilla y mas estetica de la
// competicion (LEC WORLDS MSI LO QUE SE ESTE JUGANDO)". Cada pantalla de partido sabe que se juega por los datos de la
// muestra (la liga de la ficha; el internacional y su clave) y lo dice con la identidad de esa competicion: su logo
// oficial, su paleta y su motivo. La paleta vive en tokens (--comp-<id>-luz/-contra/-acento, estilos/tokens.css):
//   luz     la luz del mundo durante el partido (el shader la mezcla con la de la era: ambiente({ paleta }))
//   contra  la luz de contra (el filo del campeon, los cabezales pares de la arena)
//   acento  el acento de la interfaz (el filete, la barra apuntada, la banda de VIDA O MUERTE): toma el lugar de --luz
// De donde sale cada paleta: el color dominante del logo oficial (static.lolesports.com, medido por pixeles) y su
// motivo conocido. Ningun brand book publico da los hex (los casos de BUCK para Worlds y MSI no los publican): donde
// el logo es blanco, el segundo color es una decision nuestra y lo dice el comentario.
// Logos: SOLO <img> enlazado (nunca canvas, nunca versionado). Si no carga, o la org es inventada, va el escudo-monograma
// del sistema (las iniciales con el filete de la luz).
import { el } from './util.js';

const CDN = 'https://static.lolesports.com';
// → logos.js (los de las ligas y torneos: la API publica de LoL Esports, getLeagues; verificados 200)
export const LOGOS_LIGA = {
  worlds: `${CDN}/leagues/1592594612171_WorldsDarkBG.png`,
  msi: `${CDN}/leagues/1592594634248_MSIDarkBG.png`,
  firststand: `${CDN}/leagues/1740042025201_RG_LOL_FIRST_STAND_LOGO_VOLT_ALPHA.png`,
  cblol: `${CDN}/leagues/cblol-logo-symbol-offwhite.png`,
  lec: `${CDN}/leagues/1592516184297_LEC-01-FullonDark.png`,
  lck: `${CDN}/leagues/lck-color-on-black.png`,
  lpl: `${CDN}/leagues/1592516115322_LPL-01-FullonDark.png`,
  lcs: `${CDN}/leagues/1706356907418_LCSNew-01-FullonDark.png`,
  lcp: `${CDN}/leagues/1733468139601_lcp-color-golden.png`,
};
// → logos.js (los de los equipos: la API publica de LoL Esports, getTeams; el equipo activo de cada org, verificados 200)
// `sigla`: el tricode de la transmision (el `code` de la API).
export const LOGOS_EQUIPO = {
  'red canids kalunga': { url: `${CDN}/teams/1631820575924_red-2021-worlds.png`, sigla: 'RED' },
  'fluxo w7m': { url: `${CDN}/teams/1766161431111_LogoColorida.png`, sigla: 'FX' },
  'los grandes': { url: `${CDN}/teams/1784013312149_LOS-OLaranja.png`, sigla: 'LOS' },
  'pain gaming': { url: `${CDN}/teams/1674657011011_pain_logo_white.png`, sigla: 'PAIN' },
  loud: { url: `${CDN}/teams/Logo-LOUD-Esports_Original.png`, sigla: 'LOUD' },
  furia: { url: `${CDN}/teams/FURIA---black.png`, sigla: 'FUR' },
  leviatán: { url: `${CDN}/teams/1643795049372_LEV-CLAROWhite.png`, sigla: 'LEV' },
  'vivo keyd stars': { url: `${CDN}/teams/1670542079678_vks.png`, sigla: 'VKS' },
  'movistar koi': { url: `${CDN}/teams/1734012609283_MKOI_FullColor_Blue.png`, sigla: 'MKOI' },
  'karmine corp': { url: `${CDN}/teams/1704714951336_KC.png`, sigla: 'KC' },
  'top esports': { url: `${CDN}/teams/1592592064571_TopEsportsTES-01-FullonDark.png`, sigla: 'TES' },
  'team secret whales': { url: `${CDN}/teams/1774598000328_White_EyeText_600p.png`, sigla: 'TSW' },
  'ninjas in pyjamas': { url: `${CDN}/teams/1673425724696_NIP-Symbol-RGB-NeonYellow1.png`, sigla: 'NIP' },
};

// Las competiciones de 2026 (CONCEPTO §12.3: 6 ligas tier-1 y 3 internacionales). `motivo`: lo reconocible de cada una,
// que la transmision usa como gesto (no se dibuja ningun asset de Riot: el motivo es un patron).
export const COMPETICIONES = {
  worlds: { nombre: 'Worlds', largo: 'Campeonato Mundial', motivo: 'la Copa del Invocador: la plata' },
  msi: { nombre: 'MSI', largo: 'Mid-Season Invitational', motivo: 'el fuego ("ignite the fire within", 2025)' },
  firststand: { nombre: 'First Stand', largo: 'First Stand', motivo: 'el naranja volt del logo' },
  cblol: { nombre: 'CBLOL', largo: 'Campeonato Brasileiro', motivo: 'el simbolo blanco hueso y el rojo cromado de su trofeo' },
  lec: { nombre: 'LEC', largo: 'LoL EMEA Championship', motivo: 'el turquesa' },
  lck: { nombre: 'LCK', largo: 'LoL Champions Korea', motivo: 'el chevron blanco' },
  lpl: { nombre: 'LPL', largo: 'LoL Pro League', motivo: 'el rojo' },
  lcs: { nombre: 'LCS', largo: 'LoL Championship Series', motivo: 'la plata' },
  lcp: { nombre: 'LCP', largo: 'LoL Championship Pacific', motivo: 'el dorado anaranjado' },
};
const DE_LIGA = { CBLOL: 'cblol', LEC: 'lec', LCK: 'lck', LPL: 'lpl', LCS: 'lcs', LCP: 'lcp' };
const DE_INTERNACIONAL = { mundial: 'worlds', msi: 'msi', firstStand: 'firststand', firststand: 'firststand' };
const RONDAS = { final: 'La final', semis: 'Semifinal', semifinal: 'Semifinal', cuartos: 'Cuartos de final' };

// Que se juega en esta muestra: { id, nombre, anio, fase, logo, tokens }.
export function competicionDe(datos, muestra) {
  const m = datos?.[muestra] ?? {};
  const it = m.internacional ?? m.acompanante?.datos?.internacional ?? null;
  let id;
  let fase;
  let anio = m.anio;
  if (muestra === 'swiss' && it) {
    id = DE_INTERNACIONAL[it.clave] ?? 'worlds';
    anio = it.anio ?? anio;
    const rec = it.swiss?.record?.[it.jugador];
    const ronda = rec ? rec.v + rec.d + 1 : null;
    fase = ronda ? `Swiss · ronda ${ronda}` : 'Swiss';
  } else {
    id = DE_LIGA[m.ficha?.jugador?.liga] ?? 'cblol';
    const se = m.serieEnCurso ?? m.acompanante?.datos?.serie ?? {};
    fase = RONDAS[se.ronda] ?? 'Playoffs';
  }
  const c = COMPETICIONES[id];
  return {
    id,
    nombre: c.nombre,
    largo: c.largo,
    anio,
    fase,
    logo: LOGOS_LIGA[id] ?? null,
    tokens: { luz: `--comp-${id}-luz`, contra: `--comp-${id}-contra`, acento: `--comp-${id}-acento` },
  };
}

const clave = (nombre) => String(nombre ?? '').trim().toLowerCase();
export const equipoReal = (nombre) => LOGOS_EQUIPO[clave(nombre)] ?? null;
// las iniciales de una org (para el escudo y la sigla de las inventadas)
export function iniciales(nombre) {
  const p = String(nombre ?? '').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return (p.length === 1 ? p[0].slice(0, 3) : p.slice(0, 3).map((x) => x[0]).join('')).toUpperCase();
}
export const siglaDe = (nombre) => equipoReal(nombre)?.sigla ?? iniciales(nombre);

// El logo de una org: el oficial (<img>) o, si no hay o no carga, el escudo-monograma del sistema.
export function logoOrg(nombre, { clase = '' } = {}) {
  const real = equipoReal(nombre);
  const escudo = () => el('span', { class: 'escudo', 'aria-hidden': 'true', text: iniciales(nombre) });
  const caja = el('i', { class: `logo-org ${clase}`.trim(), 'aria-hidden': 'true' });
  if (!real) {
    caja.append(escudo());
    return caja;
  }
  const img = el('img', { src: real.url, alt: '', decoding: 'async', loading: 'eager', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', () => img.replaceWith(escudo()), { once: true });
  caja.append(img);
  return caja;
}
// El logo de la competicion (o su nombre, si no carga).
export function logoComp(comp, { clase = '' } = {}) {
  const caja = el('i', { class: `logo-comp ${clase}`.trim(), 'aria-hidden': 'true' });
  if (!comp?.logo) {
    caja.append(el('span', { class: 'escudo', text: comp?.nombre ?? '' }));
    return caja;
  }
  const img = el('img', { src: comp.logo, alt: '', decoding: 'async', loading: 'eager', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', () => img.replaceWith(el('span', { class: 'escudo', text: comp.nombre })), { once: true });
  caja.append(img);
  return caja;
}
// Las imagenes de una pantalla, para su listo(): resuelve cuando todas cargaron o fallaron (nunca rechaza).
export function logosListos(raiz) {
  return Promise.all([...raiz.querySelectorAll('.logo-org img, .logo-comp img')].map((i) => (i.complete ? null : new Promise((r) => {
    i.addEventListener('load', r, { once: true });
    i.addEventListener('error', r, { once: true });
  }))));
}
