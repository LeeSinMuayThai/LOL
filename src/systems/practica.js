import { gauss, roll, weightedPick, sample } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { afinidadDeCampeon } from '../core/ajusteMeta.js';
import { BALANCE } from '../data/balance.js';
import CAMPEONES from '../data/champions.json' with { type: 'json' };

export const id = 'practica';

// La version profesional del recurso escaso de CONCEPTO §3. En la etapa amateur
// la atencion son bloques de tiempo; aca son puntos de preparacion entre
// splits. Es tambien la unica forma de recuperar mentalidad una vez que ya no
// administras tus propias horas de sueño.

const DESTINOS = [
  { id: 'pulir', label: 'Pulir tu campeón principal' },
  { id: 'nuevo', label: 'Aprender un campeón nuevo' },
  { id: 'mecanica', label: 'Entrenar mecánica' },
  { id: 'macro', label: 'Estudiar macro' },
  { id: 'descansar', label: 'Descansar' }
];

const IDS_DESTINO = DESTINOS.map((destino) => destino.id);

function esOffseason(state) {
  return state.phase === 'profesional' && state.player.splitCount % BALANCE.edad.splitsPorEdad === 0;
}

function campeonesAprendibles(state) {
  const enPool = new Set(state.player.championPool.map((campeon) => campeon.name));
  return CAMPEONES.filter((campeon) => campeon.role === state.player.role && !enPool.has(campeon.name));
}

function normalizar(respuesta, puntos) {
  const pedido = respuesta?.reparto ?? {};
  const crudo = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, Math.max(0, Math.round(pedido[destino] ?? 0))]));
  const total = IDS_DESTINO.reduce((suma, destino) => suma + crudo[destino], 0);

  if (total === 0) {
    return { ...crudo, descansar: puntos };
  }

  const escala = puntos / total;
  const ajustado = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, Math.floor(crudo[destino] * escala)]));

  let sobrante = puntos - IDS_DESTINO.reduce((suma, destino) => suma + ajustado[destino], 0);
  const porPrioridad = [...IDS_DESTINO].sort((a, b) => crudo[b] - crudo[a]);
  for (let i = 0; sobrante > 0; i = (i + 1) % porPrioridad.length, sobrante -= 1) {
    ajustado[porPrioridad[i]] += 1;
  }

  return ajustado;
}

function pulirCampeon(pool, puntos, weights, rng) {
  if (puntos === 0) {
    return { pool, texto: null };
  }

  const p = BALANCE.practica;
  const principal = pool.reduce((mejor, campeon) => (campeon.mastery > mejor.mastery ? campeon : mejor));
  const margen = (BALANCE.stats.max - principal.mastery) / BALANCE.stats.max;
  const ganancia = Math.max(0, gauss(p.gananciaPulir * puntos, p.ruidoPractica * puntos, rng)) * margen;

  return {
    pool: pool.map((campeon) => (
      campeon.name === principal.name
        ? { ...campeon, mastery: clamp(campeon.mastery + ganancia, 0, BALANCE.stats.max) }
        : campeon
    )),
    texto: `${principal.name} +${Math.round(ganancia)} maestría`
  };
}

function aprenderCampeones(state, pool, puntos, rng) {
  const p = BALANCE.practica;
  const disponibles = campeonesAprendibles({ ...state, player: { ...state.player, championPool: pool } });
  const cupo = Math.min(puntos, p.poolMaximo - pool.length, disponibles.length);

  if (cupo <= 0) {
    return { pool, texto: null };
  }

  // No se aprende cualquier campeon: se aprende lo que el meta pide. Eso es lo
  // que hace que invertir en el pool sea una salida del sacudon de meta y no
  // una loteria.
  const candidatos = [...disponibles]
    .sort((a, b) => afinidadDeCampeon(b, state.meta.weights) - afinidadDeCampeon(a, state.meta.weights))
    .slice(0, Math.max(cupo, Math.ceil(disponibles.length / 2)));

  // Aprender uno nuevo entra con maestria baja: por eso un cambio de meta
  // todavia se paga el split siguiente.
  const nuevos = sample(candidatos, cupo, rng).map((campeon) => ({
    name: campeon.name,
    tags: [...campeon.tags],
    mastery: Math.round(clamp(gauss(p.maestriaCampeonNuevo, p.maestriaCampeonNuevoSpread, rng), BALANCE.campeones.maestriaMinima, BALANCE.stats.max)),
    partidas: 0
  }));

  return { pool: [...pool, ...nuevos], texto: `entra ${nuevos.map((c) => c.name).join(' y ')} al pool` };
}

function decisionDePractica(state) {
  const aprendibles = campeonesAprendibles(state).length;
  const hayCupo = state.player.championPool.length < BALANCE.practica.poolMaximo && aprendibles > 0;

  return {
    tipo: 'reparto',
    titulo: `Offseason: ${BALANCE.practica.puntos} puntos de preparación`,
    descripcion: 'Se terminó la temporada. Lo que hagas ahora es lo que llevás al año que viene.'
      + (hayCupo ? '' : ' (El pool está lleno: aprender un campeón nuevo no va a entrar.)'),
    bloques: BALANCE.practica.puntos,
    extraMax: 0,
    destinos: DESTINOS,
    datos: { motivo: 'practica' }
  };
}

export function aplicar(state, rng) {
  if (!esOffseason(state)) {
    return { state, logs: [] };
  }
  return { state, logs: [], decision: decisionDePractica(state) };
}

export function resolver(state, decision, respuesta, rng) {
  const p = BALANCE.practica;
  const reparto = normalizar(respuesta, BALANCE.practica.puntos);
  const partes = [];

  const pulido = pulirCampeon(state.player.championPool, reparto.pulir, state.meta.weights, rng);
  if (pulido.texto) {
    partes.push(pulido.texto);
  }

  const aprendido = aprenderCampeones(state, pulido.pool, reparto.nuevo, rng);
  if (aprendido.texto) {
    partes.push(aprendido.texto);
  }

  const stats = { ...state.player.stats };

  if (reparto.mecanica > 0) {
    const ganancia = Math.max(0, gauss(p.gananciaMecanica * reparto.mecanica, p.ruidoPractica * reparto.mecanica, rng));
    stats.mecanica = clampStat(stats.mecanica + ganancia);
    partes.push(`mecánica +${Math.round(ganancia)}`);
  }

  if (reparto.macro > 0) {
    const ganancia = Math.max(0, gauss(p.gananciaMacro * reparto.macro, p.ruidoPractica * reparto.macro, rng));
    stats.macro = clampStat(stats.macro + ganancia);
    stats.shotcalling = clampStat(stats.shotcalling + ganancia / 2);
    partes.push(`macro +${Math.round(ganancia)}`);
  }

  if (reparto.descansar > 0) {
    const ganancia = Math.max(0, gauss(p.gananciaDescanso * reparto.descansar, p.ruidoPractica * reparto.descansar, rng));
    stats.mentalidad = clampStat(stats.mentalidad + ganancia);
    partes.push(`mentalidad +${Math.round(ganancia)}`);
  }

  return {
    state: { ...state, player: { ...state.player, championPool: aprendido.pool, stats } },
    logs: [crearLog('practica', `Offseason: ${partes.length > 0 ? partes.join(', ') : 'no aprovechaste el receso'}.`)]
  };
}

export function resolverAuto(state, decision, rng) {
  const p = BALANCE.practica;
  const urgenciaMental = clamp((p.autoMentalidadObjetivo - state.player.stats.mentalidad) / p.autoMentalidadObjetivo, 0, 1);
  const hayCupo = state.player.championPool.length < p.poolMaximo && campeonesAprendibles(state).length > 0;

  const pesos = {
    pulir: p.autoPesoPulir,
    nuevo: hayCupo ? p.autoPesoNuevo : 0.0001,
    mecanica: p.autoPesoMecanica,
    macro: p.autoPesoMacro,
    descansar: p.autoPesoDescanso + urgenciaMental * p.autoReaccionMentalidad
  };

  const reparto = Object.fromEntries(IDS_DESTINO.map((destino) => [destino, 0]));
  for (let punto = 0; punto < decision.bloques; punto += 1) {
    reparto[weightedPick(IDS_DESTINO, (destino) => pesos[destino], rng)] += 1;
  }

  return { reparto, extra: 0 };
}
