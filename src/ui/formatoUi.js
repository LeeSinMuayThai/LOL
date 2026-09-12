// Mapas de presentación puros (fase T4, PLAN.md "T4 — La decisión con
// jerarquía"): de un dato que el motor ya calcula a cómo se ve. Nada de
// esto es lógica de juego — la fase T separa exactamente esto: `src/ui/`
// traduce, `src/core`/`src/systems` deciden.
import { hashCadena } from '../core/numeros.js';

// --- La categoría del evento → familia de banner ---------------------------
// Fase 12 (PLAN.md §12.1): todo evento del catálogo declara `categoria`,
// vocabulario fijo de 11 valores, con su propio check estático. Reemplaza
// la tabla-puente que esta fase tenía (derivaba de `category`, 19 valores
// libres — ese campo se queda en el JSON para su otro consumidor real,
// `systems/temporada.js`, pero la UI ya no lo lee).
//
// `serie` reusa el token `partido` (mismo rojo LoL) y `golpe_duro` el token
// `golpe`: son los 10 `--cat-*` que ya existían en `tokens.css` — un token
// nuevo por un color repetido sería ruido (decisión de estructura de la
// fase 12).
const BANNER_POR_CATEGORIA = {
  rutina: { label: 'La semana', token: 'rutina' },
  golpe_duro: { label: 'Golpe duro', token: 'golpe' },
  oportunidad: { label: 'Te llamaron', token: 'oportunidad' },
  mercado: { label: 'Mercado de pases', token: 'mercado' },
  parche: { label: 'Parche', token: 'parche' },
  vestuario: { label: 'Vestuario', token: 'vestuario' },
  prensa: { label: 'Sala de prensa', token: 'prensa' },
  familia: { label: 'En tu casa', token: 'familia' },
  salud: { label: 'El cuerpo', token: 'salud' },
  partido: { label: 'Partido', token: 'partido' },
  serie: { label: 'Serie', token: 'partido' }
};

const FAMILIA_DEFECTO = { label: 'Decisión', token: 'rutina' };

// Decisiones que no vienen de `systems/events.js` (fecha marcada, por
// ejemplo) no traen `datos.evento` — `decisionDesdeEvento` es la única que
// arma `datos: { evento }`. Sin el evento no hay `categoria` que leer: cae
// al rótulo genérico, que es exactamente lo que tenía toda decisión antes
// de esta fase. No es un bug — es el límite real de "T4 no toca motor".
export function familiaDeCategoria(categoria) {
  if (!categoria) {
    return FAMILIA_DEFECTO;
  }
  return BANNER_POR_CATEGORIA[categoria] ?? FAMILIA_DEFECTO;
}

// --- Fuerza relativa de un rival, en palabras (T5, reusada en T6) ----------
export function etiquetaDeFuerza(fuerzaRival, fuerzaPropia) {
  const diferencia = fuerzaRival - fuerzaPropia;
  if (diferencia > 8) return 'favorito';
  if (diferencia < -8) return 'débil';
  return 'parejo';
}

// --- El peso visual: cierre > (lo que traiga decision.peso) > bisagra > normal
// Fase 12c (PLAN.md §12.2): `decisionDesdeEvento` calcula `peso` una sola vez
// (`'bisagra' | 'normal' | 'ambiente'`, este último = `!bisagra && categoria
// === 'rutina'` — antes T4 no tenía de dónde sacarlo sin inventar un campo).
// Acá solo se lee. `franja === 'cierre'` sigue ganándole a todo: un evento de
// cierre no compite por atención con el resto de las categorías, aunque su
// `categoria` de catálogo diga `rutina`.
//
// Fase 10a: `decision.bisagra` directo (sin pasar por `datos.evento`) sigue
// cubriendo las decisiones que no vienen de `systems/events.js` y por lo
// tanto no traen `peso` — retiro y salida de la etapa amateur.
export function pesoDeDecision(decision) {
  if (decision?.franja === 'cierre') {
    return 'cierre';
  }
  if (decision?.peso) {
    return decision.peso;
  }
  if (decision?.bisagra) {
    return 'bisagra';
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
  const categoria = decision?.datos?.evento?.categoria ?? null;
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
  // Fase 10c: mismas dos estructurales que no vienen de `events.js`.
  if (motivo === 'lesion_grave') {
    return { label: 'Salud', token: 'salud' };
  }
  if (motivo === 'servicio_te_vas' || motivo === 'servicio_adentro' || motivo === 'servicio_volver') {
    return { label: 'Servicio militar', token: 'salud' };
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
