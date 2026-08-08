import { gauss } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp, clampStat } from '../core/numeros.js';
import { campeonesAprendibles, pulirCampeon, aprenderCampeones } from '../core/pool.js';
import { BALANCE } from '../data/balance.js';
import { ofrecerRutinas, rutinaPorId, elegirRutinaAutomatica } from '../core/rutinas.js';

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

function decisionDePractica(state, rng) {
  const aprendibles = campeonesAprendibles(state).length;
  const hayCupo = state.player.championPool.length < BALANCE.practica.poolMaximo && aprendibles > 0;
  const rutinas = ofrecerRutinas(state, rng, { pool: 'offseason' });

  return {
    tipo: 'opciones',
    titulo: 'Se terminó la temporada',
    descripcion: 'Lo que hagas en el receso es lo que llevás al año que viene.'
      + (hayCupo ? '' : ' Tu pool ya está lleno: no entra ningún campeón nuevo.'),
    opciones: rutinas.map((rutina) => ({ id: rutina.id, label: rutina.titulo, descripcion: rutina.texto })),
    datos: { motivo: 'practica', rutinas }
  };
}

export function aplicar(state, rng) {
  if (!esOffseason(state)) {
    return { state, logs: [] };
  }
  return { state, logs: [], decision: decisionDePractica(state, rng) };
}

export function resolver(state, decision, respuesta, rng) {
  const p = BALANCE.practica;
  const rutina = rutinaPorId(decision.datos.rutinas, respuesta.opcionId);
  const reparto = normalizar({ reparto: rutina.reparto }, BALANCE.practica.puntos);
  const partes = [];

  const pulido = pulirCampeon(state.player.championPool, reparto.pulir, rng);
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

  return { opcionId: elegirRutinaAutomatica(decision.datos.rutinas, pesos, rng).id };
}
