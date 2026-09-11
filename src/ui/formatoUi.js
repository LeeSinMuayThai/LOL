// Mapas de presentación puros (fase T4, PLAN.md "T4 — La decisión con
// jerarquía"): de un dato que el motor ya calcula a cómo se ve. Nada de
// esto es lógica de juego — la fase T separa exactamente esto: `src/ui/`
// traduce, `src/core`/`src/systems` deciden.
import { hashCadena } from '../core/numeros.js';

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
//
// Fase 10a: `decision.bisagra` directo (sin pasar por `datos.evento`) cubre
// las decisiones que no vienen de `systems/events.js` pero cambian el
// resultado igual — retiro y salida de la etapa amateur, las dos primeras.
export function pesoDeDecision(decision) {
  if (decision?.bisagra || decision?.datos?.evento?.bisagra) {
    return 'bisagra';
  }
  if (decision?.franja === 'cierre') {
    return 'cierre';
  }
  return 'normal';
}

// Rótulo de la pestaña, sin parsear `descripcion` y sin campo nuevo en JSON.
// Si hay `category` manda T4. Si no: partido (serie o fecha en curso),
// semana amateur, o el fallback de siempre.
export function rotuloDeDecision(decision, state) {
  const peso = pesoDeDecision(decision);
  if (peso === 'cierre') {
    return { label: 'Fin de año', token: 'rutina' };
  }
  const categoria = decision?.datos?.evento?.category ?? null;
  if (categoria) {
    return familiaDeCategoria(categoria);
  }
  if (state?.serie?.activa || state?.career?.temporada?.fechaEnCurso) {
    return { label: 'Partido', token: 'partido' };
  }
  const motivo = decision?.datos?.motivo;
  if (motivo === 'retiro_declive' || motivo === 'retiro_vuelta' || motivo === 'salida_amateur') {
    return { label: 'Retiro', token: 'salud' };
  }
  if (motivo === 'reparto' || motivo === 'practica' || state?.phase === 'amateur') {
    return { label: 'La semana', token: 'rutina' };
  }
  return FAMILIA_DEFECTO;
}

// --- Identidad de org (T0 lo prometió, nunca se codeó) ---------------------
// `hashCadena` es puro y determinista: el mismo nombre da el mismo hue en
// cada render y en el PNG de la tarjeta. Cero RNG.

export function hueDeOrg(nombre) {
  return hashCadena(nombre ?? '') % 360;
}

// 2-3 letras. "T1" se queda T1, "Gen.G" → GEN, "Cloud9 KIA" → C9K,
// "JD Gaming" → JDG. Nada de escudos.
export function inicialesDeOrg(nombre) {
  const limpio = String(nombre ?? '').trim();
  if (!limpio) return '?';
  if (limpio.length <= 3) return limpio.toUpperCase();
  const partes = limpio.split(/[\s_-]+/).filter(Boolean);
  if (partes.length >= 2) {
    return partes.slice(0, 3).map((p) => {
      const letra = p[0] ?? '';
      const num = p.match(/\d+/);
      return (letra + (num ? num[0] : '')).toUpperCase();
    }).join('').slice(0, 3);
  }
  return limpio.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
}

export function inicialesDeCampeon(nombre) {
  const limpio = String(nombre ?? '').trim();
  if (!limpio) return '?';
  const partes = limpio.split(/[\s']+/).filter(Boolean);
  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
  // "K'Sante" ya se partió. "Jarvan IV" → J + I. "Aatrox" → AA.
  return limpio.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
}

const ARQ_POR_TAG = {
  tanque: 'tanque',
  bruiser: 'bruiser',
  asesino: 'asesino',
  mago_control: 'mago',
  enchanter: 'mago',
  escalado: 'escalado',
  early_game: 'early',
  engage: 'engage',
  splitpush: 'split'
};

export function arquetipoDeTags(tags) {
  if (!tags || tags.length === 0) return 'early';
  return ARQ_POR_TAG[tags[0]] ?? 'early';
}

// --- log.type → acento (cierra D41, recortado en T3) ----------------------

const ACENTO_LOG = {
  temporada: 'up',
  meta: 'parche',
  escena: 'gold',
  top_mundial: 'gold',
  mercado: 'mercado',
  amateur: 'familia',
  event: 'live',
  competitivo: 'live',
  edad: 'gold',
  campeones: 'parche',
  contexto: 'mute',
  split: 'danger',
  practica: 'live'
};

export function acentoDeLog(type) {
  return ACENTO_LOG[type] ?? 'mute';
}
