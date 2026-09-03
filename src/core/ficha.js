import { BALANCE } from '../data/balance.js';
import { ROLES } from '../data/roles.js';
import { bandaDeArraigo as idDeBandaDeArraigo } from './registro.js';

// La ficha de carrera (fase 8, PLAN.md §8.3): lo que la UI pinta en la
// tarjeta permanente (`src/ui/components/ficha.js`). Puro, sin RNG — se
// puede llamar en cualquier momento sin mover el balance.

// --- El número único (H7 de PLAN.md) ---
//
// La MISMA suma ponderada por rol que ya usa `calcularRendimiento`
// (systems/rendimiento.js) ANTES de aplicarle meta, maestría, sinergia,
// jerarquía y ruido — el "cuánto rendís en limpio", sin el contexto del
// split. Se extrae acá para que rendimiento.js la importe en vez de
// mantener dos copias de la misma fórmula (regla de proceso 2: la fórmula
// no se reescribe ni se retunea, solo se expone).
export function nivelDelJugador(state) {
  const { pesos } = ROLES[state.player.role];
  return Object.entries(pesos).reduce((suma, [stat, peso]) => suma + state.player.stats[stat] * peso, 0);
}

export function bandaDeNivel(nivel) {
  const { nivelBandas } = BALANCE.ficha;
  if (nivel <= nivelBandas.prospecto) {
    return 'prospecto';
  }
  if (nivel <= nivelBandas.titular) {
    return 'titular';
  }
  if (nivel <= nivelBandas.elite) {
    return 'elite';
  }
  return 'clase_mundial';
}

// --- Las flechas ▲▼ (imagen 2/14 de PLAN.md) ---
//
// Contra `flags.edadSnapshot` (la foto que `edadInicio.js` toma al abrir
// cada edad — `CAMPOS_EDAD` incluye los 6 atributos de rol desde la fase 8).
// Un delta menor a `BALANCE.ficha.umbralFlecha` no dibuja flecha: una deriva
// de 0,4 no es una noticia.
const STATS_DE_ROL = ['mecanica', 'macro', 'teamfight', 'laneo', 'shotcalling', 'adaptabilidad'];

export function deltasDeStats(state) {
  const snapshot = state.flags.edadSnapshot ?? {};
  const deltas = {};
  for (const stat of STATS_DE_ROL) {
    const antes = snapshot[`player.stats.${stat}`];
    if (antes === undefined) {
      continue;
    }
    const diferencia = state.player.stats[stat] - antes;
    if (Math.abs(diferencia) >= BALANCE.ficha.umbralFlecha) {
      deltas[stat] = Math.round(diferencia);
    }
  }
  return deltas;
}

// El stat que más pesa de un vistazo: el más alto entre los que tu rol
// pondera (imagen 1 de PLAN.md: "65 VELOCIDAD" resaltado).
export function statDestacado(state) {
  const stats = Object.keys(ROLES[state.player.role].pesos);
  return stats.reduce((mejor, stat) => (state.player.stats[stat] > state.player.stats[mejor] ? stat : mejor), stats[0]);
}

// --- Mentalidad y Hype (fase 9R.2) ---
//
// Hasta acá NO se dibujaban en ninguna pantalla profesional, y el 74% de los
// efectos del contenido mueve una de las dos. El 12,5% de las carreras muere
// de burnout (`atributos.js`, `mentalidad ≤ burnoutUmbral` con probabilidad
// creciente) sin que el jugador vea nunca la barra. `al_limite` es el aviso
// que no existía.
function delta(state, campo) {
  const antes = state.flags.edadSnapshot?.[`player.stats.${campo}`];
  if (antes === undefined) {
    return 0;
  }
  const diferencia = state.player.stats[campo] - antes;
  return Math.abs(diferencia) >= BALANCE.ficha.umbralFlecha ? Math.round(diferencia) : 0;
}

const LABELS_MENTALIDAD = { al_limite: 'al límite', tensionado: 'tensionado', entero: 'entero', en_llamas: 'en llamas' };

export function bandaDeMentalidad(state) {
  const valor = state.player.stats.mentalidad;
  // `al_limite` = la zona roja desde la que el burnout puede pinchar
  // (`atributos.burnoutMentalBajo`). Es exactamente la barra que hay que
  // mirar.
  const id = valor <= BALANCE.atributos.burnoutMentalBajo ? 'al_limite'
    : valor <= 50 ? 'tensionado'
      : valor <= 75 ? 'entero'
        : 'en_llamas';
  return { id, label: LABELS_MENTALIDAD[id], valor: Math.round(valor), delta: delta(state, 'mentalidad'), peligro: id === 'al_limite' };
}

const LABELS_HYPE = { ignoto: 'ignoto', conocido: 'conocido', figura: 'figura', estrella: 'estrella' };

export function bandaDeHype(state) {
  const valor = state.player.stats.hype;
  const id = valor <= 25 ? 'ignoto'
    : valor <= 55 ? 'conocido'
      : valor <= 80 ? 'figura'
        : 'estrella';
  return { id, label: LABELS_HYPE[id], valor: Math.round(valor), delta: delta(state, 'hype') };
}

// --- Las barras con hitos (jerarquía y arraigo) ---

const LABELS_JERARQUIA = { rookie: 'Rookie', titular: 'Titular', referente: 'Referente', franquicia: 'Franquicia' };

// Reusa `BALANCE.contexto.estatusBandas` — las mismas bandas que ya
// gatean contenido en `core/contexto.js:78`, ahora también expuestas para
// la barra visual.
export function bandaDeJerarquia(state) {
  const valor = state.career.jerarquia;
  const { estatusBandas } = BALANCE.contexto;
  const ids = ['rookie', 'titular', 'referente', 'franquicia'];
  const pisos = [0, estatusBandas.rookie, estatusBandas.titular, estatusBandas.referente];
  const techos = [estatusBandas.rookie, estatusBandas.titular, estatusBandas.referente, BALANCE.stats.max];

  let i = techos.length - 1;
  for (let k = 0; k < techos.length; k += 1) {
    if (valor <= techos[k]) {
      i = k;
      break;
    }
  }

  return { id: ids[i], label: LABELS_JERARQUIA[ids[i]], valor, piso: pisos[i], techo: techos[i], esMaxima: i === ids.length - 1 };
}

const LABELS_ARRAIGO = { uno_mas: 'Uno más', querido: 'Querido', idolo: 'Ídolo', leyenda: 'Leyenda' };

// Reusa `bandaDeArraigo` de `core/registro.js` (el id) para no mantener dos
// veces la comparación contra `BALANCE.arraigo.hitos` — acá se enriquece con
// lo que la barra necesita: piso, techo del próximo hito, y si ya es el
// último (para pintarla dorada, imagen 14 de PLAN.md).
export function bandaDeArraigoFicha(valorArraigo) {
  const { hitos } = BALANCE.arraigo;
  const ids = ['uno_mas', 'querido', 'idolo', 'leyenda'];
  const pisos = ids.map((id) => hitos[id]);
  const id = idDeBandaDeArraigo(valorArraigo);
  const i = ids.indexOf(id);
  const techo = i === ids.length - 1 ? BALANCE.stats.max : pisos[i + 1];

  return { id, label: LABELS_ARRAIGO[id], valor: valorArraigo, piso: pisos[i], techo, esMaxima: i === ids.length - 1 };
}

// --- El estado internacional, con nombre en vez de un contador ---
//
// Imagen 1/5/6 de PLAN.md: "SELECCIÓN: SIN CHANCE" → "EN CARPETA" →
// "CONVOCADO". El equivalente de LoL es el cupo internacional de tu liga.
function ligaDe(state) {
  if (!state.career.liga) {
    return null;
  }
  return state.mundo.ligas.find((liga) => liga.id === state.career.liga) ?? null;
}

export function estadoInternacional(state) {
  if (state.serie?.activa && state.serie.ronda === 'internacional') {
    return 'jugando';
  }
  const liga = ligaDe(state);
  const cupos = liga?.cuposInternacionales ?? 0;
  if (cupos <= 0 || !state.career.posicion) {
    return 'sin_chance';
  }
  if (state.career.posicion <= cupos) {
    return 'clasificado';
  }
  return state.career.posicion <= cupos + 2 ? 'en_carpeta' : 'sin_chance';
}

// El duelo contra el archirrival: la fase 11 (`mundo.archirrival`) lo llena.
// Hasta entonces no hay nada que mostrar.
export function dueloDeGeneracion(state) {
  return state.mundo.archirrival ?? null;
}

// El objeto único que consume `src/ui/components/ficha.js`.
export function fichaCompleta(state) {
  return {
    nivel: Math.round(nivelDelJugador(state)),
    bandaNivel: bandaDeNivel(nivelDelJugador(state)),
    destacado: statDestacado(state),
    deltas: deltasDeStats(state),
    jerarquia: bandaDeJerarquia(state),
    arraigo: bandaDeArraigoFicha(state.career.arraigo),
    mentalidad: bandaDeMentalidad(state),
    hype: bandaDeHype(state),
    estadoInternacional: estadoInternacional(state),
    duelo: dueloDeGeneracion(state)
  };
}
