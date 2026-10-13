// Los ejes de lo que ganás y perdés, con un color cada uno (PLANUI §0.3, punto 1). Contrato compartido entre la
// planilla del plan del año, la tarjeta de "lo que pasó", los chips del relato y la placa "Vos": el mismo eje tiene el
// mismo color, el mismo glifo y el mismo nombre corto en todas las pantallas, para que "ganaste casa" se vea sin leer.
//
// El signo (subió o bajó) NO va en el color del eje: va en los triángulos y en el número (--up / --down, como siempre).
// El color dice QUÉ se movió; el triángulo, hacia dónde.
//
// Puro: no toca el DOM (corre en Node). Los colores viven en tokens.css (--eje-<id>, --eje-<id>-fill), nunca acá.

// id del eje -> { etiqueta, corto, glifo (fx/iconos.js) }. `juego` agrupa las stats de juego (el glifo distingue cuál).
export const EJES = {
  soloq: { etiqueta: 'SoloQ', corto: 'SoloQ', glifo: 'ranked' },
  estudios: { etiqueta: 'Estudios', corto: 'Estudios', glifo: 'studies' },
  sueno: { etiqueta: 'Sueño', corto: 'Sueño', glifo: 'sleep' },
  casa: { etiqueta: 'Confianza familiar', corto: 'Casa', glifo: 'familyTrust' },
  cabeza: { etiqueta: 'Consistencia', corto: 'Cabeza', glifo: 'mentalidad' },
  juego: { etiqueta: 'Juego', corto: 'Juego', glifo: 'nivel' },
  fama: { etiqueta: 'Hype', corto: 'Hype', glifo: 'hype' },
  equipo: { etiqueta: 'Equipo', corto: 'Equipo', glifo: 'equipo' }
};

// Clave del motor (la última parte de la ruta: `player.stats.macro` -> `macro`) -> id del eje.
const POR_CLAVE = {
  ranked: 'soloq', soloqElo: 'soloq', lp: 'soloq',
  studies: 'estudios',
  sleep: 'sueno',
  familyTrust: 'casa',
  mentalidad: 'cabeza',
  mecanica: 'juego', macro: 'juego', laneo: 'juego', teamfight: 'juego', shotcalling: 'juego', adaptabilidad: 'juego',
  nivel: 'juego', maestria: 'juego',
  hype: 'fama',
  jerarquia: 'equipo', sinergia: 'equipo', arraigo: 'equipo'
};

// Cómo lo nombra el texto del motor (minúsculas, sin tildes) -> id del eje. Para leer los efectos que vienen en texto
// ("estudios -7, sueño -5, confianza -2", "Mecánica +1, Laneo +3", "Sylas +2 maestría").
const POR_PALABRA = {
  soloq: 'soloq', lp: 'soloq', ranked: 'soloq', elo: 'soloq',
  estudios: 'estudios', estudio: 'estudios',
  sueno: 'sueno',
  confianza: 'casa', 'confianza familiar': 'casa', casa: 'casa', familia: 'casa',
  consistencia: 'cabeza', cabeza: 'cabeza', mentalidad: 'cabeza',
  mecanica: 'juego', macro: 'juego', laneo: 'juego', teamfight: 'juego', shotcalling: 'juego', calls: 'juego',
  adaptabilidad: 'juego', nivel: 'juego', maestria: 'juego',
  hype: 'fama', fama: 'fama',
  jerarquia: 'equipo', sinergia: 'equipo', arraigo: 'equipo'
};

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// `campo`: una ruta o clave del motor (`player.studies`, `ranked`) o una palabra del texto ("Sueño", "confianza").
// Devuelve el id del eje, o `null` si no es un eje (entonces se pinta neutro, sin color de eje).
export function ejeDe(campo) {
  if (campo == null) return null;
  const crudo = String(campo);
  const clave = crudo.split('.').pop();
  if (POR_CLAVE[clave]) return POR_CLAVE[clave];
  return POR_PALABRA[sinTildes(crudo)] ?? null;
}

// Los nombres de las variables CSS del eje (tokens.css): el color pleno (trazo, glifo, texto) y el de relleno (fondo
// de chip, barra tenue).
export function tokenDeEje(id) {
  return id && EJES[id] ? { color: `var(--eje-${id})`, fill: `var(--eje-${id}-fill)` } : null;
}
