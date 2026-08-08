import { gauss, sample } from './rng.js';
import { clamp } from './numeros.js';
import { afinidadDeCampeon } from './ajusteMeta.js';
import { BALANCE } from '../data/balance.js';
import CAMPEONES from '../data/champions.json' with { type: 'json' };

// Todo lo que toca el champion pool vive acá.
//
// Antes estaba repartido: `generarPoolInicial` en mundo.js, `pulirCampeon` y
// `aprenderCampeones` adentro de practica.js, y `moverMaestrias` en campeones.js.
// El pool dejó de ser cosa de un sistema el día que pasó a ser una elección del
// jugador: ahora lo tocan la pantalla de inicio, los eventos con efecto `pool`,
// el offseason y —desde la fase 4— el draft de la serie.
//
// Ninguna función de acá lee `state.player.championPool` por su cuenta: el pool
// entra por parámetro. Eso permite encadenar transformaciones adentro de un
// mismo outcome sin escribir el estado en el medio.

// --- Qué campeones existen ---

// Los `debut` no están al empezar: entran con un parche a mitad de carrera. Es
// lo que hace posible el evento "salió un campeón nuevo y jugás en dos semanas".
export function campeonesElegiblesAlInicio(rol) {
  return CAMPEONES.filter((campeon) => campeon.role === rol && !campeon.debut);
}

// `mundo.campeonesDebutados` guarda `{ nombre, split }`: el split importa porque
// "salió un campeón nuevo" es una noticia con fecha de vencimiento. Sin eso, la
// marca `campeon_nuevo` quedaría prendida el resto de la carrera.
export function nombresDebutados(state) {
  return new Set((state.mundo.campeonesDebutados ?? []).map((entrada) => entrada.nombre));
}

// Los que existen en ESTE mundo hoy: los de siempre más los que ya debutaron.
export function campeonesDisponibles(state, rol = state.player.role) {
  const debutados = nombresDebutados(state);
  return CAMPEONES.filter((campeon) => (
    campeon.role === rol && (!campeon.debut || debutados.has(campeon.name))
  ));
}

// Los que todavía no debutaron y podrían salir en un parche.
export function campeonesPorDebutar(state, rol = state.player.role) {
  const debutados = nombresDebutados(state);
  return CAMPEONES.filter((campeon) => (
    campeon.role === rol && campeon.debut && !debutados.has(campeon.name)
  ));
}

// El campeón que acaba de salir y todavía no tenés, mientras siga siendo noticia.
export function campeonNuevoPendiente(state) {
  const enPool = new Set(state.player.championPool.map((campeon) => campeon.name));
  const reciente = state.player.splitCount - BALANCE.meta.splitsCampeonNuevo;

  return [...(state.mundo.campeonesDebutados ?? [])]
    .reverse()
    .find((entrada) => entrada.split >= reciente && !enPool.has(entrada.nombre))?.nombre ?? null;
}

export function campeonesAprendibles(state, pool = state.player.championPool) {
  const enPool = new Set(pool.map((campeon) => campeon.name));
  return campeonesDisponibles(state).filter((campeon) => !enPool.has(campeon.name));
}

// --- Leer el pool ---

export function principalDelPool(pool) {
  return pool.reduce((mejor, campeon) => (campeon.mastery > mejor.mastery ? campeon : mejor));
}

export function peorDelPool(pool) {
  return pool.reduce((peor, campeon) => (campeon.mastery < peor.mastery ? campeon : peor));
}

export function entradaDePool(campeon, mastery) {
  return { name: campeon.name, tags: [...campeon.tags], mastery, partidas: 0 };
}

// --- Mover el pool ---

// Rendimientos decrecientes: pasar de 80 a 90 cuesta mucho más que de 30 a 40.
// Sin eso, cualquier inversión sostenida termina con todo el pool en 100 y el
// draft deja de ser una elección.
export function pulirCampeon(pool, puntos, rng) {
  if (puntos <= 0) {
    return { pool, texto: null };
  }

  const p = BALANCE.practica;
  const principal = principalDelPool(pool);
  const margen = (BALANCE.stats.max - principal.mastery) / BALANCE.stats.max;
  const ganancia = Math.max(0, gauss(p.gananciaPulir * puntos, p.ruidoPractica * puntos, rng)) * margen;

  return {
    pool: pool.map((campeon) => (
      campeon.name === principal.name
        ? { ...campeon, mastery: clamp(campeon.mastery + ganancia, 0, BALANCE.stats.max) }
        : campeon
    )),
    texto: `${principal.name} +${Math.round(ganancia)} maestría`,
    campeon: principal.name
  };
}

// Sube la maestría de un campeón puntual del pool. Lo usa el tipo de efecto
// `pool` con accion 'maestria'.
export function subirMaestria(pool, nombre, cantidad) {
  return pool.map((campeon) => (
    campeon.name === nombre
      ? { ...campeon, mastery: clamp(campeon.mastery + cantidad, BALANCE.campeones.maestriaMinima, BALANCE.stats.max) }
      : campeon
  ));
}

// No se aprende cualquier campeón: se aprende lo que el meta pide, o el que
// acaba de salir. Eso es lo que hace que invertir en el pool sea una salida del
// sacudón de meta y no una lotería.
//
// `criterio`:
//   'meta'  — los de mayor afinidad con el vector del parche (por defecto)
//   'debut' — los que acaban de salir, si hay alguno disponible
export function aprenderCampeones(state, pool, cantidad, rng, { criterio = 'meta' } = {}) {
  const p = BALANCE.practica;
  const aprendibles = campeonesAprendibles(state, pool);
  const debutados = nombresDebutados(state);

  const fuente = criterio === 'debut'
    ? aprendibles.filter((campeon) => campeon.debut && debutados.has(campeon.name))
    : aprendibles;

  const disponibles = fuente.length > 0 ? fuente : aprendibles;
  const cupo = Math.min(cantidad, p.poolMaximo - pool.length, disponibles.length);

  if (cupo <= 0) {
    return { pool, texto: null };
  }

  // Se sortea entre los mejores para el meta, no entre todos: el jugador elige
  // invertir en el pool, no elige el campeón exacto (para eso está el draft).
  const candidatos = [...disponibles]
    .sort((a, b) => afinidadDeCampeon(b, state.meta.weights) - afinidadDeCampeon(a, state.meta.weights))
    .slice(0, Math.max(cupo, Math.ceil(disponibles.length / 2)));

  // Entra con maestría baja: por eso un cambio de meta todavía se paga el split
  // siguiente y no en el momento.
  const nuevos = sample(candidatos, cupo, rng).map((campeon) => entradaDePool(
    campeon,
    Math.round(clamp(
      gauss(p.maestriaCampeonNuevo, p.maestriaCampeonNuevoSpread, rng),
      BALANCE.campeones.maestriaMinima,
      BALANCE.stats.max
    ))
  ));

  return {
    pool: [...pool, ...nuevos],
    texto: `entra ${nuevos.map((campeon) => campeon.name).join(' y ')} al pool`,
    campeones: nuevos.map((campeon) => campeon.name)
  };
}

// Sacarse un campeón de encima. Nunca deja el pool por debajo del mínimo: un
// pool vacío rompe `campeonDelSplit` y no significa nada narrativamente.
export function olvidarPeor(pool) {
  if (pool.length <= BALANCE.campeones.poolMinimo) {
    return { pool, texto: null };
  }
  const peor = peorDelPool(pool);
  return {
    pool: pool.filter((campeon) => campeon.name !== peor.name),
    texto: `${peor.name} sale del pool`,
    campeon: peor.name
  };
}
