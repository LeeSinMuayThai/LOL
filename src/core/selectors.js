import { BALANCE } from '../data/balance.js';

const OPERADORES = {
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b
};

export function getPath(state, path) {
  return path.split('.').reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), state);
}

export function setPath(state, path, value) {
  const keys = path.split('.');
  const [head, ...rest] = keys;

  if (rest.length === 0) {
    return { ...state, [head]: value };
  }

  return {
    ...state,
    [head]: setPath(state[head] ?? {}, rest.join('.'), value)
  };
}

export function cumpleCondiciones(state, conditions = []) {
  return conditions.every(({ field, op, value }) => {
    const operador = OPERADORES[op];
    if (!operador) {
      throw new Error(`Operador de condición desconocido: ${op}`);
    }
    return operador(getPath(state, field), value);
  });
}

export function metaDominante(state) {
  return Object.entries(state.meta.weights).sort((a, b) => b[1] - a[1])[0][0];
}

const ETIQUETAS_CAMPO = {
  'player.soloqElo': 'SoloQ',
  'player.ranked': 'SoloQ',
  'player.sleep': 'Sueño',
  'player.studies': 'Estudios',
  'player.familyTrust': 'Confianza familiar',
  'player.stats.mecanica': 'Mecánica',
  'player.stats.macro': 'Macro',
  'player.stats.teamfight': 'Teamfight',
  'player.stats.laneo': 'Laneo',
  'player.stats.shotcalling': 'Shotcalling',
  'player.stats.adaptabilidad': 'Adaptabilidad',
  'player.stats.mentalidad': 'Mentalidad',
  'player.stats.hype': 'Hype',
  'player.championPool': 'Pool',
  'player.titles': 'Títulos',
  'player.worlds': 'Apariciones en Worlds',
  'career.orgs': 'Organizaciones',
  'career.hitos': 'Hitos',
  'career.sinergia': 'Sinergia',
  'career.jerarquia': 'Jerarquía',
  'career.arraigo': 'Arraigo',
  // Fase 5: el efecto `type: 'partido'` no usa esta etiqueta en su propio
  // texto (arma el suyo en `aplicarEfecto`), pero el check de esquema exige
  // que todo `path` declarado tenga una entrada legible igual.
  'career.temporada.ajustePartido': 'El partido',
  // Fase 8D: el efecto `type: 'momento'` tampoco usa esta etiqueta en su
  // propio texto (arma el suyo en `aplicarEfecto`, "Momento: ..."), pero
  // declara este path para el chequeo de esquema — mismo criterio que
  // `partido` arriba.
  'career.registro.momentos': 'Momentos'
};

export function etiquetaCampo(path) {
  return ETIQUETAS_CAMPO[path] ?? path;
}
