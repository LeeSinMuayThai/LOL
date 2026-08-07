import { gauss, weightedPick } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { clamp } from '../core/numeros.js';
import { afinidadDeCampeon, ajusteAlMeta } from '../core/ajusteMeta.js';
import { BALANCE } from '../data/balance.js';

export const id = 'campeones';

// Que campeon terminas jugando este split. En soloQ elegis vos, asi que pesa lo
// que dominas y lo que el meta pide. Cuando exista el draft (etapa profesional)
// esta eleccion va a depender ademas de tu jerarquia en el equipo.
function campeonDelSplit(state, rng) {
  const { weights } = state.meta;

  return weightedPick(
    state.player.championPool,
    (campeon) => Math.max(BALANCE.campeones.maestriaMinima, campeon.mastery) ** BALANCE.campeones.sesgoMaestriaEnPick
      * afinidadDeCampeon(campeon, weights),
    rng
  );
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

  const jugado = campeonDelSplit(state, rng);
  const championPool = moverMaestrias(state, jugado, rng);
  const signatureChampion = buscarSignature(championPool, state.player.signatureChampion);

  const { valor: ajuste } = ajusteAlMeta({ ...state, player: { ...state.player, championPool } });
  const logs = [];

  if (signatureChampion !== state.player.signatureChampion) {
    logs.push(crearLog('campeones', `${signatureChampion} ya es tu campeón: se te reconoce por él.`));
  }

  logs.push(crearLog(
    'campeones',
    `Este split lo jugaste con ${jugado.name} (maestría ${Math.round(championPool.find((c) => c.name === jugado.name).mastery)}). `
    + `Ajuste al meta: ${ajuste}/100.`
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
