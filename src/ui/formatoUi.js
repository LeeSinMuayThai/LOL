// Mapas de presentación puros (fase T4, PLAN.md "T4 — La decisión con
// jerarquía"): de un dato que el motor ya calcula a cómo se ve. Nada de
// esto es lógica de juego — la fase T separa exactamente esto: `src/ui/`
// traduce, `src/core`/`src/systems` deciden.

// --- La categoría del evento → familia de banner ---------------------------
// Medido sobre `src/data/events/**/*.json` el 2026-09-04 (no asumido): 18
// valores reales de `category` en 21 archivos — no los "21 valores" que
// decía una versión vieja de PLAN.md, esa cifra confundía archivos con
// valores distintos. Se agrupan acá a 11 familias sobre los tokens
// `--cat-*` que T0 dejó escritos. La fase 12 reemplaza esta tabla-puente
// por un campo `categoria` declarado en el JSON con su propio check
// estático — hasta entonces, esto deriva.
const FAMILIA_POR_CATEGORIA = {
  rol_top: { label: 'Tu línea', token: 'rutina' },
  rol_jungla: { label: 'Tu línea', token: 'rutina' },
  rol_mid: { label: 'Tu línea', token: 'rutina' },
  rol_adc: { label: 'Tu línea', token: 'rutina' },
  rol_support: { label: 'Tu línea', token: 'rutina' },
  partido_clasico: { label: 'Partido', token: 'partido' },
  partido_dentro_del_mapa: { label: 'Partido', token: 'partido' },
  partido_postpartido: { label: 'Partido', token: 'partido' },
  partido_presion: { label: 'Partido', token: 'partido' },
  identidad: { label: 'Identidad', token: 'rutina' },
  soloq_precarrera: { label: 'SoloQ', token: 'oportunidad' },
  debut_academy: { label: 'Academia', token: 'oportunidad' },
  competicion: { label: 'Competencia', token: 'oportunidad' },
  drama_prensa: { label: 'Prensa', token: 'prensa' },
  negocios: { label: 'Negocios', token: 'mercado' },
  pool: { label: 'Pool', token: 'parche' },
  salud_vida: { label: 'Salud', token: 'salud' }
  // `cierre_edad` no entra acá a propósito: `pesoDeDecision` la intercepta
  // antes (es peso `cierre`, con su propio rótulo "Fin de año") — un evento
  // de cierre no compite por atención con el resto de las categorías.
};

const FAMILIA_DEFECTO = { label: 'Decisión', token: 'rutina' };

// Decisiones que no vienen de `systems/events.js` (fecha marcada, por
// ejemplo) no traen `datos.evento` — `decisionDesdeEvento` es la única que
// arma `datos: { evento }`. Sin el evento no hay `category` que leer: cae
// al rótulo genérico, que es exactamente lo que tenía toda decisión antes
// de esta fase. No es un bug — es el límite real de "T4 no toca motor".
export function familiaDeCategoria(category) {
  if (!category) {
    return FAMILIA_DEFECTO;
  }
  return FAMILIA_POR_CATEGORIA[category] ?? FAMILIA_DEFECTO;
}

// --- Fuerza relativa de un rival, en palabras (T5, reusada en T6) ----------
export function etiquetaDeFuerza(fuerzaRival, fuerzaPropia) {
  const diferencia = fuerzaRival - fuerzaPropia;
  if (diferencia > 8) return 'favorito';
  if (diferencia < -8) return 'débil';
  return 'parejo';
}

// --- El peso visual: bisagra > cierre > normal ------------------------------
// Dos campos reales, no tres inventados: `evento.bisagra` (boolean, ya
// existe en varios eventos de `pool.json`) y `franja` ('normal' | 'cierre',
// puesto por `systems/edadCierre.js`). Una versión anterior de PLAN.md
// hablaba de un tercer peso "ambiente" que no correspondía a ningún campo
// real — se sacó al escribir esta fase.
export function pesoDeDecision(decision) {
  if (decision?.datos?.evento?.bisagra) {
    return 'bisagra';
  }
  if (decision?.franja === 'cierre') {
    return 'cierre';
  }
  return 'normal';
}
