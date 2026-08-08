import { BALANCE } from '../data/balance.js';
import { TIERS, TIERS_CON_DIVISION, tierPorId, romano } from '../data/ranked.js';
import { servidorPorId } from '../data/servidores.js';
import { pick } from './rng.js';

// La escalera de soloQ, en puntos absolutos.
//
// Hierro IV con 0 LP es el punto 0. Cada division vale 100 LP, asi que los 7
// tiers con division ocupan 2800 puntos y el ápice arranca ahi, acumulando LP
// sin techo. Trabajar en puntos absolutos hace que sumar y restar LP sea una
// sola operacion y que promocion y descenso caigan solos.
//
// Sin decay: un profesional juega soloQ todos los dias, asi que la inactividad
// no es parte de esta historia.

const PUNTOS_POR_DIVISION = () => BALANCE.ranked.lpPorDivision;
const DIVISIONES = () => BALANCE.ranked.divisionesPorTier;

export function puntosDelApice() {
  return TIERS_CON_DIVISION.length * DIVISIONES() * PUNTOS_POR_DIVISION();
}

export function esApice(ranked) {
  return Boolean(tierPorId(ranked.tier)?.apice);
}

export function puntosAbsolutos(ranked) {
  if (esApice(ranked)) {
    return puntosDelApice() + ranked.lp;
  }
  const tier = tierPorId(ranked.tier);
  const escalones = tier.orden * DIVISIONES() + (DIVISIONES() - ranked.division);
  return escalones * PUNTOS_POR_DIVISION() + ranked.lp;
}

// En el ápice el tier visible no se guarda: se recalcula contra los cupos del
// servidor, igual que hace la ladder real cada 24 horas.
function tierApice(lp, servidor) {
  if (lp >= servidor.cutoffChallenger) {
    return 'challenger';
  }
  return lp >= servidor.cutoffGM ? 'grandmaster' : 'master';
}

export function desdePuntos(puntos, servidor) {
  const limpio = Math.max(0, Math.round(puntos));

  if (limpio >= puntosDelApice()) {
    const lp = limpio - puntosDelApice();
    return { tier: tierApice(lp, servidor), division: null, lp };
  }

  const escalones = Math.floor(limpio / PUNTOS_POR_DIVISION());
  const lp = limpio % PUNTOS_POR_DIVISION();
  const tier = TIERS_CON_DIVISION[Math.floor(escalones / DIVISIONES())];
  const division = DIVISIONES() - (escalones % DIVISIONES());

  return { tier: tier.id, division, lp };
}

export function etiquetaDeRanked(ranked, servidor) {
  const tier = tierPorId(ranked.tier);
  if (!tier) {
    return 'Sin rango';
  }
  if (tier.apice) {
    const puesto = servidor ? rangoAproximado(ranked, servidor) : null;
    return `${tier.label} · ${ranked.lp} LP${puesto ? ` (#${puesto} de ${servidor.label})` : ''}`;
  }
  return `${tier.label} ${romano(ranked.division)} · ${ranked.lp} LP`;
}

// Puesto aproximado en la ladder del servidor. La densidad de la ladder crece
// exponencialmente hacia abajo, asi que se interpola en log entre el puesto 1
// (lpTop1) y el ultimo puesto de Challenger (el cutoff).
export function rangoAproximado(ranked, servidor) {
  if (!esApice(ranked) || ranked.lp < servidor.cutoffChallenger) {
    return null;
  }
  const techo = Math.max(servidor.lpTop1, servidor.cutoffChallenger + 1);
  const avance = Math.min(1, (ranked.lp - servidor.cutoffChallenger) / (techo - servidor.cutoffChallenger));
  return Math.max(1, Math.round(servidor.cupoChallenger * Math.exp(-Math.log(servidor.cupoChallenger) * avance)));
}

// Percentil de la playerbase que quedó por debajo, contra la distribución real:
// Diamante+ es el top 5%, Máster+ el top 1%, Challenger el 0,025%.
export function percentil(ranked) {
  const escalera = BALANCE.ranked.percentilPorTier;
  return escalera[ranked.tier] ?? 0;
}

// La UNICA funcion que mueve la escalera, y la unica que consume RNG (para el
// LP con el que caes al descender de division).
export function aplicarLP(ranked, deltaLP, servidor, rng) {
  const antes = puntosAbsolutos(ranked);
  const tierAntes = tierPorId(ranked.tier);

  let despues = Math.max(0, antes + Math.round(deltaLP));

  // Escudo anti-descenso: recién promocionado a un tier nuevo no se baja de
  // tier. En el juego real son 10 partidas; a escala de split se redondea a un
  // split de protección.
  if (ranked.escudo > 0 && !tierAntes.apice) {
    const pisoDelTier = tierAntes.orden * DIVISIONES() * PUNTOS_POR_DIVISION();
    despues = Math.max(pisoDelTier, despues);
  }

  const crudo = desdePuntos(despues, servidor);
  const tierDespues = tierPorId(crudo.tier);

  // Al descender de división no caés en 0 LP: quedás en 25, 50 o 75 según el
  // MMR. Acá se sortea, que es lo que el jugador ve.
  const bajoDeDivision = !tierDespues.apice
    && despues < antes
    && (crudo.tier !== ranked.tier || crudo.division !== ranked.division);

  const lp = bajoDeDivision ? pick(BALANCE.ranked.lpDescenso, rng) : crudo.lp;
  const subioDeTier = tierDespues.orden > tierAntes.orden;

  return {
    ...ranked,
    ...crudo,
    lp,
    escudo: subioDeTier ? BALANCE.ranked.escudoSplits : Math.max(0, ranked.escudo - 1),
    partidas: ranked.partidas + 1
  };
}

// Los cutoffs de un servidor se sortean una vez por partida (en la generación
// del mundo) alrededor de sus valores reales. Este helper los reconstruye desde
// el id cuando no hay mundo a mano.
export function servidorConCutoffs(servidorId, sorteados = null) {
  const base = servidorPorId(servidorId);
  return {
    ...base,
    cutoffChallenger: sorteados?.cutoffChallenger ?? base.cutoffChallengerBase,
    cutoffGM: sorteados?.cutoffGM ?? Math.round(base.cutoffChallengerBase * BALANCE.ranked.proporcionCutoffGM)
  };
}

// Los cutoffs vividos de esta partida: se sortean una vez en la generacion del
// mundo y se guardan en el estado, para que "estar en Challenger" signifique
// algo distinto en cada carrera.
export function servidorDeLaPartida(state, servidorId = state.player.ranked.servidor) {
  return servidorConCutoffs(servidorId, state.mundo.servidores?.[servidorId]);
}

// `player.soloqElo` sobrevive como ESPEJO derivado de solo lectura: todo lo que
// lo lee (el resumen de edad, los umbrales, la UI) sigue funcionando sin tocar
// una linea, y nadie mas que esta funcion lo escribe.
export function conRanked(state, ranked) {
  return {
    ...state,
    player: { ...state.player, ranked, soloqElo: puntosAbsolutos(ranked) }
  };
}

export function aplicarLPAlEstado(state, deltaLP, rng) {
  const servidor = servidorDeLaPartida(state);
  return conRanked(state, aplicarLP(state.player.ranked, deltaLP, servidor, rng));
}

export function rankedInicial(servidorId, puntos) {
  return {
    servidor: servidorId,
    ...desdePuntos(puntos, servidorConCutoffs(servidorId)),
    escudo: 0,
    partidas: 0
  };
}

export { TIERS };
