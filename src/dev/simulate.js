import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto } from '../core/pipeline.js';
import { ESTRATEGIAS, NOMBRES_ESTRATEGIA } from './estrategias.js';

function correrCarrera(seed, splits, responder) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);

  for (let i = 0; i < splits && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng, responder ?? undefined).state;
  }

  return state;
}

function reporteDetallado(state, seed) {
  return {
    seed,
    handle: state.player.name,
    rol: state.player.role,
    liga: state.mundo.ligaOrigen,
    origen: state.origen,
    oculto: state.player.oculto,
    age: state.age,
    phase: state.phase,
    terminado: state.terminado,
    finAnticipado: state.finAnticipado,
    splitFichaje: state.splitFichaje,
    splitCount: state.player.splitCount,
    secundario: state.flags.secundario,
    stats: state.player.stats,
    studies: Math.round(state.player.studies),
    familyTrust: Math.round(state.player.familyTrust),
    sleep: Math.round(state.player.sleep),
    soloqElo: state.player.soloqElo,
    pool: state.player.championPool.map((campeon) => `${campeon.name} (${campeon.mastery})`),
    latestLog: state.logs.at(-1)
  };
}

function estadisticas(valores) {
  if (valores.length === 0) {
    return { min: null, max: null, promedio: null };
  }
  const suma = valores.reduce((acc, v) => acc + v, 0);
  return {
    min: Math.round(Math.min(...valores)),
    max: Math.round(Math.max(...valores)),
    promedio: Number((suma / valores.length).toFixed(2))
  };
}

function conteo(lista, clave) {
  return lista.reduce((acc, valor) => {
    const k = clave(valor);
    return { ...acc, [k]: (acc[k] ?? 0) + 1 };
  }, {});
}

function porcentajes(mapa, total) {
  return Object.fromEntries(
    Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .map(([clave, cantidad]) => [clave, `${cantidad} (${((cantidad / total) * 100).toFixed(1)}%)`])
  );
}

function correrLote(corridas, splits, estrategia) {
  const responder = ESTRATEGIAS[estrategia];
  const resultados = [];
  let crashes = 0;

  for (let seed = 1; seed <= corridas; seed += 1) {
    try {
      resultados.push(correrCarrera(seed, splits, responder));
    } catch (error) {
      crashes += 1;
      console.error(`Crash en seed ${seed} (${estrategia}): ${error.message}`);
    }
  }

  const total = resultados.length;
  const llegaronAPro = resultados.filter((r) => r.splitFichaje !== null);

  return {
    estrategia,
    corridas,
    splits,
    crashes,
    finales: porcentajes(conteo(resultados, (r) => r.finAnticipado ?? (r.phase === 'amateur' ? 'sigue_amateur' : 'en_carrera')), total),
    llegaronAPro: `${llegaronAPro.length} (${((llegaronAPro.length / total) * 100).toFixed(1)}%)`,
    splitFichaje: estadisticas(llegaronAPro.map((r) => r.splitFichaje)),
    secundario: porcentajes(conteo(resultados, (r) => r.flags.secundario ?? 'sin_congelar'), total),
    salidas: {
      nocturno: resultados.filter((r) => r.flags.nocturno).length,
      negociacionGanada: resultados.filter((r) => r.flags.negociacionGanada).length,
      avisosRecibidos: resultados.filter((r) => (r.flags.avisos ?? 0) > 0).length
    },
    soloqElo: estadisticas(resultados.map((r) => r.player.soloqElo)),
    estudios: estadisticas(resultados.map((r) => r.player.studies)),
    familyTrust: estadisticas(resultados.map((r) => r.player.familyTrust)),
    mecanica: estadisticas(resultados.map((r) => r.player.stats.mecanica)),
    mentalidad: estadisticas(resultados.map((r) => r.player.stats.mentalidad)),
    hype: estadisticas(resultados.map((r) => r.player.stats.hype))
  };
}

const corridas = Number(process.argv[2] || 1);
const splits = Number(process.argv[3] || 15);
const estrategia = process.argv[4] || 'equilibrado';

if (!(estrategia in ESTRATEGIAS) && estrategia !== 'todas') {
  console.error(`Estrategia desconocida: ${estrategia}. Opciones: ${NOMBRES_ESTRATEGIA.join(', ')}, todas.`);
  process.exit(1);
}

if (corridas <= 1) {
  const seed = 42;
  console.log(JSON.stringify(reporteDetallado(correrCarrera(seed, splits, ESTRATEGIAS[estrategia]), seed), null, 2));
} else if (estrategia === 'todas') {
  console.log(JSON.stringify(NOMBRES_ESTRATEGIA.map((nombre) => correrLote(corridas, splits, nombre)), null, 2));
} else {
  console.log(JSON.stringify(correrLote(corridas, splits, estrategia), null, 2));
}
