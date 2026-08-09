import { gauss, chance } from '../core/rng.js';
import { crearLog } from '../core/log.js';
import { deltaCorto, entero } from '../core/formato.js';
import { clamp, clampStat } from '../core/numeros.js';
import { nivelDeCurva, techoDeCarrera } from '../core/curvas.js';
import { nivelDelJugador } from '../core/ficha.js';
import { registrarPicoNivel } from '../core/registro.js';
import { BALANCE } from '../data/balance.js';

export const id = 'atributos';

// La forma deriva sola con memoria: por eso las rachas duran varios splits en
// vez de titilar. El jugador nunca ve este numero.
function derivarForma(state, rng) {
  const a = BALANCE.atributos;
  const siguiente = state.player.oculto.forma * a.formaPersistencia + gauss(0, a.formaShock, rng);
  return clamp(siguiente, -a.formaMax, a.formaMax);
}

function moverStatsDeCurva(stats, state, forma, rng) {
  const a = BALANCE.atributos;
  const { oculto } = state.player;
  const splitsJugados = state.player.splitCount;
  const movidos = { ...stats };

  for (const [stat, config] of Object.entries(a.curvas)) {
    const objetivo = nivelDeCurva(state.age, oculto, { declive: config.declive, splitsJugados })
      * (1 + forma * a.formaAmplitud);

    // Converge hacia el objetivo en vez de saltar: el declive nunca se anuncia,
    // se nota recien cuando ya lleva un par de splits pasando.
    const delta = (objetivo - movidos[stat]) * config.velocidad + gauss(0, config.ruido, rng);
    movidos[stat] = clampStat(movidos[stat] + delta);
  }

  return movidos;
}

function moverStatsAcumulativos(stats, state, rng) {
  const a = BALANCE.atributos;
  const techo = clampStat(techoDeCarrera(state.player.oculto, state.player.splitCount) + a.techoAcumulativoBonus);
  const movidos = { ...stats };

  for (const [stat, config] of Object.entries(a.acumulativos)) {
    // Rendimientos decrecientes: cuanto mas cerca del techo, menos rinde.
    const margen = Math.max(0, techo - movidos[stat]) / BALANCE.stats.max;
    const bruto = gauss(config.ganancia, config.spread, rng) * margen;
    const delta = config.permiteBajar ? bruto : Math.max(0, bruto);
    movidos[stat] = clampStat(movidos[stat] + delta);
  }

  return movidos;
}

// En la etapa amateur el sueño se administra a mano, bloque por bloque. Una vez
// que sos profesional deja de ser tuyo: hay horarios, gaming house y alguien
// que te controla la dieta, asi que la barra vuelve sola hacia un descanso
// normal. Lo que sigue costando —y no se repone solo— es la mentalidad.
function normalizarSueno(state, rng) {
  const a = BALANCE.atributos;

  if (state.phase === 'amateur') {
    return state.player.sleep;
  }

  const delta = (a.suenoConfortable - state.player.sleep) * a.suenoRegresionPro;
  return clampStat(state.player.sleep + delta + gauss(0, a.suenoRuidoPro, rng));
}

// Casi todo lo que te hace mejor jugador cuesta mentalidad. El unico descuento
// que existe es dormir de verdad: por encima del descanso normal, el balance se
// da vuelta y la barra sube. Es la razon mecanica para gastar bloques en dormir
// en vez de en LP.
function desgasteDeMentalidad(state, rng) {
  const a = BALANCE.atributos;
  const { sleep, deudaSueno } = state.player;

  const falta = Math.max(0, a.suenoConfortable - sleep) * a.suenoPesoEnDesgaste;
  const sobra = Math.max(0, sleep - a.suenoConfortable) * a.recuperacionPorSuenoAlto;

  return gauss(a.desgasteBase, a.desgasteSpread, rng) + falta + deudaSueno * a.deudaPesoEnDesgaste - sobra;
}

function probabilidadDeBurnout(mentalidad) {
  const a = BALANCE.atributos;
  if (mentalidad >= a.burnoutUmbral) {
    return 0;
  }
  return Math.min(a.burnoutTecho, (a.burnoutUmbral - mentalidad) / a.burnoutPendiente);
}

export function aplicar(state, rng) {
  const forma = derivarForma(state, rng);
  const sleep = normalizarSueno(state, rng);

  const conCurva = moverStatsDeCurva(state.player.stats, state, forma, rng);
  const conAcumulados = moverStatsAcumulativos(conCurva, state, rng);
  const mentalidad = clampStat(conAcumulados.mentalidad - desgasteDeMentalidad({ ...state, player: { ...state.player, sleep } }, rng));

  const stats = { ...conAcumulados, mentalidad };
  const deltaMecanica = stats.mecanica - state.player.stats.mecanica;

  // Fase 8: cada split del juego (amateur o pro) suma a `registro.splitsJugados`
  // — coincide siempre con `player.splitCount`, que este mismo sistema
  // incrementa acá abajo. El NIVEL (core/ficha.js) se mide con los stats YA
  // movidos de este split, así que el pico refleja de verdad el mejor
  // momento de la carrera, no el arranque de ella.
  const nivelDeEsteSplit = nivelDelJugador({ player: { role: state.player.role, stats } });
  const registro = registrarPicoNivel(
    { ...state.career.registro, splitsJugados: state.career.registro.splitsJugados + 1 },
    nivelDeEsteSplit,
    state.age
  );

  const nextState = {
    ...state,
    player: {
      ...state.player,
      stats,
      sleep,
      oculto: { ...state.player.oculto, forma },
      splitCount: state.player.splitCount + 1
    },
    career: { ...state.career, currentSplit: state.career.currentSplit + 1, registro }
  };

  // Fase 7: `tecnico: true` marca los logs puramente numéricos — nadie los
  // borra (siguen siendo útiles para depurar y para simulate.js), pero le
  // dan a la UI (fase 11) la señal para esconderlos o achicarlos. Un split
  // profesional sin playoffs era 5-6 líneas, la mayoría de este tipo.
  const logs = [crearLog(
    'split',
    `Split ${state.career.currentSplit}: mecánica ${deltaCorto(deltaMecanica)}, `
    + `macro ${entero(stats.macro)}, mentalidad ${entero(mentalidad)}.`,
    { tecnico: true }
  )];

  // La mentalidad en cero es el fin de la carrera, pero el borde no es un
  // acantilado: abajo del umbral la probabilidad crece hasta volverse segura.
  if (mentalidad <= BALANCE.stats.min || chance(probabilidadDeBurnout(mentalidad), rng)) {
    return {
      state: { ...nextState, phase: 'retirado', terminado: true, finAnticipado: 'burnout' },
      logs: [...logs, crearLog('split', 'No da más la cabeza. Te bajás: esto se terminó acá.')]
    };
  }

  return { state: nextState, logs };
}
