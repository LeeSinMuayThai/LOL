import { gauss, chance, weightedPick } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp } from '../core/numeros.js';
import { deseoPorCampeon } from '../core/ajusteMeta.js';
import { boostDelPool } from '../core/regimen.js';
import { BALANCE } from '../data/balance.js';

export const id = 'campeones';

// Que campeon terminas jugando este split.
//
// En soloQ elegis vos: pesa lo que dominas y lo que el meta pide. En un equipo
// hay draft, y ahi se cruza todo: la probabilidad de que te den el campeon que
// queres depende de tu jerarquia. Si te dan otro, jugas con menos maestria,
// rendis peor, y la jerarquia baja mas. Es la espiral central de CONCEPTO §7.
function campeonDelSplit(state, rng) {
  const { weights } = state.meta;
  const pool = state.player.championPool;
  const preferido = pool.reduce((mejor, campeon) => (
    deseoPorCampeon(campeon, weights) > deseoPorCampeon(mejor, weights) ? campeon : mejor
  ));

  if (state.phase !== 'profesional' || pool.length === 1) {
    return { campeon: weightedPick(pool, (c) => deseoPorCampeon(c, weights), rng), tuvoSuPick: true };
  }

  const r = BALANCE.rendimiento;
  const probPick = r.draftBase + (state.career.jerarquia / BALANCE.stats.max) * r.draftPorJerarquia;

  if (chance(probPick, rng)) {
    return { campeon: preferido, tuvoSuPick: true };
  }

  // No te lo dieron: te toca lo que sobra del pool.
  const resto = pool.filter((campeon) => campeon.name !== preferido.name);
  return { campeon: weightedPick(resto, (c) => deseoPorCampeon(c, weights), rng), tuvoSuPick: false };
}

function moverMaestrias(state, jugado, rng) {
  const c = BALANCE.campeones;

  return state.player.championPool.map((campeon) => {
    if (campeon.name === jugado.name) {
      // Rendimientos decrecientes: pasar de 80 a 90 cuesta mucho mas que de 30 a 40.
      const margen = (BALANCE.stats.max - campeon.mastery) / BALANCE.stats.max;
      const ganancia = Math.max(0, gauss(c.maestriaGanancia, c.maestriaGananciaSpread, rng)) * margen;
      return {
        ...campeon,
        mastery: clamp(campeon.mastery + ganancia, c.maestriaMinima, BALANCE.stats.max),
        partidas: campeon.partidas + 1
      };
    }

    // Los campeones que no jugas pierden maestria. Sin esto se podrian mantener
    // diez a punto y el pool dejaria de ser una eleccion.
    const oxido = Math.max(0, gauss(c.maestriaDecaimiento, c.maestriaDecaimientoSpread, rng));
    return { ...campeon, mastery: clamp(campeon.mastery - oxido, c.maestriaMinima, BALANCE.stats.max) };
  });
}

function buscarSignature(pool, signatureActual) {
  const c = BALANCE.campeones;
  const candidatos = pool.filter((campeon) => campeon.mastery >= c.signatureMaestria && campeon.partidas >= c.signaturePartidas);

  if (candidatos.length === 0) {
    return signatureActual;
  }

  return candidatos.reduce((mejor, campeon) => (campeon.mastery > mejor.mastery ? campeon : mejor)).name;
}

export function aplicar(state, rng) {
  if (state.player.championPool.length === 0) {
    return { state, logs: [] };
  }

  const { campeon: jugado, tuvoSuPick } = campeonDelSplit(state, rng);
  const championPool = moverMaestrias(state, jugado, rng);
  const signatureChampion = buscarSignature(championPool, state.player.signatureChampion);

  // `state.meta.tierList` ya la calculó `systems/meta.js` este mismo split
  // (corre antes en el registro): no hace falta recalcularla, solo cruzarla
  // contra el pool que acaba de moverse.
  const { valor: ajuste } = boostDelPool(championPool, state.meta.tierList);
  const logs = [];

  if (signatureChampion !== state.player.signatureChampion) {
    logs.push(crearLog('campeones', `${signatureChampion} ya es tu campeón: se te reconoce por él.`));
  }

  const maestriaJugada = Math.round(championPool.find((c) => c.name === jugado.name).mastery);
  logs.push(crearLog(
    'campeones',
    tuvoSuPick
      ? `Jugaste con ${jugado.name} (maestría ${maestriaJugada}). Ajuste al meta: ${ajuste}/100.`
      : `En el draft no te dieron tu pick: te tocó ${jugado.name} (maestría ${maestriaJugada}). Ajuste al meta: ${ajuste}/100.`
  ));

  return {
    state: {
      ...state,
      player: { ...state.player, championPool, signatureChampion, campeonDelSplit: jugado.name },
      meta: { ...state.meta, ajuste }
    },
    logs
  };
}
