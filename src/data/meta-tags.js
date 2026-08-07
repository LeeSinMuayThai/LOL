// Los arquetipos sobre los que se define TODO el sistema de meta. El vector de
// pesos del meta y los tags de cada campeon hablan este mismo vocabulario: si
// no coinciden, el Ajuste al Meta no existe.

export const ARQUETIPOS = [
  'tanque',
  'bruiser',
  'asesino',
  'mago_control',
  'escalado',
  'early_game',
  'engage',
  'splitpush',
  'enchanter'
];

const ETIQUETAS = {
  tanque: 'los tanques',
  bruiser: 'los bruisers',
  asesino: 'los asesinos',
  mago_control: 'los magos de control',
  escalado: 'los campeones de escalado',
  early_game: 'el early game',
  engage: 'los engage',
  splitpush: 'el splitpush',
  enchanter: 'las enchanters'
};

export function etiquetaArquetipo(tag) {
  return ETIQUETAS[tag] ?? tag;
}
