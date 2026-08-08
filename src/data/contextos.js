// El vocabulario con el que el juego describe DONDE ESTAS PARADO en la carrera.
//
// Todo el contenido —eventos, rutinas, ofertas— se declara contra estos ejes, y
// esa es la unica forma de poder autorear 150+ opciones sabiendo cuando aparece
// cada una. Si una pieza de contenido no declara contexto, aparece en cualquier
// lado, y el catalogo deja de ser legible.

// Los ejes. Cada uno es un conjunto cerrado de valores posibles: si un dia hace
// falta uno nuevo, se agrega aca y validate exige que la tabla de MOMENTOS lo
// cubra.
export const EJES = {
  etapa: ['amateur', 'debut', 'profesional', 'declive', 'retirado'],
  edadBanda: ['temprana', 'joven', 'pico', 'tardia', 'veterana'],
  nivel: ['soloq', 'tier3', 'tier2', 'tier1', 'libre'],
  estatus: ['ninguno', 'rookie', 'titular', 'referente', 'franquicia'],
  momentum: ['crisis', 'slump', 'estable', 'racha'],
  mercado: ['sin_contrato', 'contrato_firme', 'ultimo_ano', 'sin_renovacion'],
  // LATAM desaparece en el paso 10, cuando las ligas pasen a ser las de 2026:
  // LATAM Norte quedo absorbida por LCS y LATAM Sur por CBLOL.
  region: ['KR', 'CN', 'EMEA', 'NA', 'BR', 'LATAM', 'APAC'],
  residencia: ['local', 'import', 'residente'],
  ventana: ['pretemporada', 'regular', 'playoffs', 'internacional', 'offseason']
};

// Las marcas son booleanos enumerables que no merecen un eje propio. Se declaran
// aca para que validate pueda detectar una marca inventada en un JSON.
export const MARCAS = [
  'deuda_sueno',
  'pc_confiscada',
  'riesgo_familiar',
  'en_el_radar',
  'nocturno',
  'negociacion_ganada',
  'sin_secundario',
  'secundario_terminado',
  'signature',
  'mentalidad_al_limite',
  // Pendientes: los activan los pasos 10 a 12.
  'espera_edad_minima',
  'lesion_cronica',
  'servicio_militar',
  'ventana_de_vuelta',
  'vuelta_del_retiro'
];

// La etiqueta canonica. El cruce completo de los 9 ejes es intratable para
// autorear; esta tabla lo colapsa a un nombre unico por situacion, resuelto por
// prioridad (gana el primero que matchea).
//
// `pendiente` marca los momentos que todavia no son alcanzables porque el
// sistema que los produce no existe. Cada paso posterior activa los suyos y
// borra la marca: eso le da a cada paso una definicion de terminado nitida.
export const MOMENTOS = [
  // --- Estados excepcionales, por encima de todo lo demas ---
  { id: 'servicio_militar', prioridad: 100, pendiente: 'paso12',
    label: 'Cumpliendo el servicio militar',
    patron: { marcas: ['servicio_militar'] } },

  { id: 'retirado_reciente', prioridad: 95, pendiente: 'paso12',
    label: 'Retirado, con la puerta entreabierta',
    patron: { etapa: ['retirado'], marcas: ['ventana_de_vuelta'] } },

  { id: 'vuelta_del_retiro', prioridad: 92, pendiente: 'paso12',
    label: 'De vuelta después del retiro',
    patron: { marcas: ['vuelta_del_retiro'] } },

  { id: 'lesionado', prioridad: 90, pendiente: 'paso12',
    label: 'Arrastrando una lesión que no se va',
    patron: { marcas: ['lesion_cronica'] } },

  { id: 'espera_edad_minima', prioridad: 88, pendiente: 'paso10',
    label: 'Firmado, pero sin edad para debutar',
    patron: { marcas: ['espera_edad_minima'] } },

  { id: 'sin_equipo', prioridad: 85, pendiente: 'paso11',
    label: 'Sin equipo',
    patron: { nivel: ['libre'] } },

  { id: 'sin_renovacion', prioridad: 82, pendiente: 'paso11',
    label: 'No te renovaron',
    patron: { mercado: ['sin_renovacion'] } },

  { id: 'retirado', prioridad: 80, pendiente: 'paso12',
    label: 'Retirado',
    patron: { etapa: ['retirado'] } },

  // --- Etapa amateur ---
  { id: 'amateur_sin_pc', prioridad: 70,
    label: 'Con la PC adentro del placard',
    patron: { etapa: ['amateur'], marcas: ['pc_confiscada'] } },

  { id: 'amateur_al_limite', prioridad: 68,
    label: 'A un paso de que te bajen del ranked',
    patron: { etapa: ['amateur'], marcas: ['riesgo_familiar'] } },

  { id: 'amateur_prometedor', prioridad: 60,
    label: 'Los scouts te empezaron a mirar',
    patron: { etapa: ['amateur'], marcas: ['en_el_radar'] } },

  { id: 'amateur_arranque', prioridad: 10,
    label: 'Un pibe más grindeando soloQ',
    patron: { etapa: ['amateur'] } },

  // --- Tier 3 (equipos inventados, efimeros) ---
  { id: 'tier3_recien_llegado', prioridad: 55, pendiente: 'paso10',
    label: 'Recién llegado a un equipo de tier 3',
    patron: { nivel: ['tier3'], estatus: ['rookie'] } },

  { id: 'tier3_probandose', prioridad: 50, pendiente: 'paso10',
    label: 'Probándote en tier 3',
    patron: { nivel: ['tier3'] } },

  // --- Tier 2 (ligas de desarrollo reales) ---
  { id: 'tier2_rookie', prioridad: 48, pendiente: 'paso10',
    label: 'Rookie en la liga de desarrollo',
    patron: { nivel: ['tier2'], estatus: ['rookie'] } },

  { id: 'tier2_titular', prioridad: 45, pendiente: 'paso10',
    label: 'Titular en la liga de desarrollo',
    patron: { nivel: ['tier2'] } },

  // --- Tier 1 ---
  { id: 'tier1_debut', prioridad: 42,
    label: 'Debutando en primera',
    patron: { etapa: ['debut'], nivel: ['tier1'] } },

  { id: 'tier1_slump', prioridad: 40,
    label: 'En crisis de resultados',
    patron: { nivel: ['tier1'], momentum: ['crisis'] } },

  { id: 'import_recien_llegado', prioridad: 38, pendiente: 'paso11',
    label: 'Import recién llegado a una región nueva',
    patron: { residencia: ['import'], estatus: ['rookie', 'titular'] } },

  { id: 'tier1_franquicia', prioridad: 30,
    label: 'La franquicia del equipo',
    patron: { nivel: ['tier1'], estatus: ['franquicia'] } },

  { id: 'tier1_referente', prioridad: 28,
    label: 'Referente del vestuario',
    patron: { nivel: ['tier1'], estatus: ['referente'] } },

  { id: 'tier1_titular', prioridad: 25,
    label: 'Titular en primera',
    patron: { nivel: ['tier1'], estatus: ['titular'] } },

  { id: 'tier1_rookie', prioridad: 22,
    label: 'Uno más del roster',
    patron: { nivel: ['tier1'], estatus: ['rookie'] } },

  // --- Declive ---
  { id: 'veterano_util', prioridad: 20, pendiente: 'paso11',
    label: 'Veterano que todavía rinde',
    patron: { etapa: ['declive'], estatus: ['referente', 'franquicia'] } },

  { id: 'veterano_al_margen', prioridad: 18, pendiente: 'paso11',
    label: 'Veterano al que ya casi no llaman',
    patron: { etapa: ['declive'] } }
];

export function momentoPorId(id) {
  return MOMENTOS.find((momento) => momento.id === id) ?? null;
}

export const MOMENTOS_ACTIVOS = MOMENTOS.filter((momento) => !momento.pendiente);
