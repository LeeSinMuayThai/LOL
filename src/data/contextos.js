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
  // LATAM ya no es una region de origen (fase 3, ligas 2026): LATAM Norte
  // quedo absorbida por LCS y LATAM Sur por CBLOL. Los jugadores de esas
  // zonas nacen hoy en la escena de NA o de BR.
  region: ['KR', 'CN', 'EMEA', 'NA', 'BR', 'APAC'],
  residencia: ['local', 'import', 'residente'],
  ventana: ['pretemporada', 'regular', 'playoffs', 'internacional', 'offseason'],
  // Altura en la escalera de soloQ. Sin este eje no se podia expresar "esto
  // solo pasa si estas arriba", y por eso un scout te llamaba en Platino: la
  // etapa amateur entera trata de la ladder y el modelo no la miraba.
  ladder: ['bajo', 'medio', 'alto', 'apice', 'elite'],
  // Tu linea. El rol define que se espera de vos, que se ve de lo que hacés y
  // que problemas tenés; sin el eje, ningun evento podia ser de un rol.
  rol: ['top', 'jungla', 'mid', 'adc', 'support'],
  // Qué tiene en juego una fecha de la temporada regular (fase 5). A
  // diferencia de los demás ejes, `calcularContexto(state)` SIN overrides
  // nunca produce un valor real acá (queda `null`): solo existe adentro de
  // `systems/temporada.js`, que calcula el motivo principal de la fecha
  // marcada y lo pasa como override. Es management deliberado: un evento de
  // `stakes` nunca puede colarse por la selección normal de `events.js`, y
  // `dev/cobertura.js` (que solo recorre `calcularContexto` sin overrides) no
  // los va a ver alcanzables — por eso la fase 5 valida esta celda con un
  // check propio en `validate.js`, no con `cobertura.js --huecos`.
  stakes: ['clasico', 'puntero', 'define_clasificacion', 'revancha', 'presion', 'rival_de_generacion', 'parejo']
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
  // Tenés compañeros con nombre. No alcanza con ser profesional: en el split en
  // que firmás, `roster` ya corrió y salió sin hacer nada, asi que la etapa dice
  // 'debut' pero el vestuario todavia esta vacio. Sin esta marca, un evento que
  // dice "{jungla} se peleó con el staff" imprime "{jungla}" en pantalla.
  'con_vestuario',
  // El pool que elegiste, leido como contexto. Es lo que hace que los campeones
  // que elegiste al empezar sigan importando veinte splits despues.
  'pool_angosto',
  'pool_ancho',
  'pool_en_meta',
  'pool_fuera_meta',
  'main_muerto',
  'campeon_nuevo',
  // Lo que ya viviste, leído de `career.registro` (fase 8D). Nunca se
  // resetean: una vez campeón, `es_campeon` queda prendida el resto de la
  // carrera, igual que `nomade` una vez que pasaste por tu tercer club.
  'es_campeon',
  'multicampeon',
  'paso_por_tier3',
  'curtido',
  'nomade',
  // Fase 9Md (D16): bajaste de tier 1 hace poco.
  'descenso',
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

  { id: 'espera_edad_minima', prioridad: 88,
    label: 'Firmado, pero sin edad para debutar',
    patron: { marcas: ['espera_edad_minima'] } },

  // Fase 9E: deja de estar `pendiente`. Lo estaba desde la fase 7, cuando
  // "sin equipo" todavía no lo producía ningún sistema — pero la fase 9 le
  // dio dos puertas (el mercado que deja de llamarte, y la disolución de un
  // tier 3) y nadie sacó la marca. Consecuencia: `cobertura.js` saltea los
  // pendientes, así que reportaba "sin huecos" sobre el momento MÁS
  // frecuente del juego mientras el bug D25 lo volvía el estado dominante.
  // Un momento alcanzable marcado como pendiente es una herramienta mirando
  // para otro lado.
  { id: 'sin_equipo', prioridad: 85,
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
  { id: 'tier3_recien_llegado', prioridad: 55,
    label: 'Recién llegado a un equipo de tier 3',
    patron: { nivel: ['tier3'], estatus: ['rookie'] } },

  { id: 'tier3_probandose', prioridad: 50,
    label: 'Probándote en tier 3',
    patron: { nivel: ['tier3'] } },

  // --- Tier 2 (ligas de desarrollo reales) ---
  { id: 'tier2_rookie', prioridad: 48,
    label: 'Rookie en la liga de desarrollo',
    patron: { nivel: ['tier2'], estatus: ['rookie'] } },

  // Fase 9Md (D16): descendiste y estás rearmándote en tier 2.
  { id: 'recien_descendido', prioridad: 46,
    label: 'Recién descendido de primera',
    patron: { nivel: ['tier2'], marcas: ['descenso'] } },

  { id: 'tier2_titular', prioridad: 45,
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
