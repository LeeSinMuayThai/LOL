import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto } from '../core/pipeline.js';

function correrCarrera(seed, splits) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);

  for (let i = 0; i < splits && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng).state;
  }

  return state;
}

function reporteDetallado(state, seed) {
  return {
    seed,
    age: state.age,
    phase: state.phase,
    terminado: state.terminado,
    finAnticipado: state.finAnticipado,
    splitFichaje: state.splitFichaje,
    splitCount: state.player.splitCount,
    mecanica: state.player.stats.mecanica,
    mentalidad: state.player.stats.mentalidad,
    studies: state.player.studies,
    familyTrust: state.player.familyTrust,
    sleep: state.player.sleep,
    soloqElo: state.player.soloqElo,
    meta: state.meta.weights,
    latestLog: state.logs.at(-1)
  };
}

function estadisticas(valores) {
  if (valores.length === 0) {
    return { min: null, max: null, promedio: null };
  }
  const suma = valores.reduce((acc, v) => acc + v, 0);
  return {
    min: Math.min(...valores),
    max: Math.max(...valores),
    promedio: Number((suma / valores.length).toFixed(2))
  };
}

function correrLote(corridas, splits) {
  const resultados = [];
  let crashes = 0;

  for (let seed = 1; seed <= corridas; seed += 1) {
    try {
      resultados.push(correrCarrera(seed, splits));
    } catch (error) {
      crashes += 1;
      console.error(`Crash en seed ${seed}: ${error.message}`);
    }
  }

  const fracasos = resultados.filter((r) => r.terminado);
  const llegaronAPro = resultados.filter((r) => r.phase === 'profesional');
  const siguenAmateur = resultados.filter((r) => r.phase === 'amateur' && !r.terminado);

  return {
    corridas,
    splits,
    crashes,
    exitosas: resultados.length,
    desenlace: {
      llegaronAPro: llegaronAPro.length,
      splitFichaje: estadisticas(llegaronAPro.map((r) => r.splitFichaje)),
      fracasos: fracasos.length,
      fracasoFamilia: fracasos.filter((r) => r.finAnticipado === 'fracaso_familia').length,
      fracasoSueno: fracasos.filter((r) => r.finAnticipado === 'fracaso_sueno').length,
      siguenAmateur: siguenAmateur.length
    },
    mecanica: estadisticas(resultados.map((r) => r.player.stats.mecanica)),
    mentalidad: estadisticas(resultados.map((r) => r.player.stats.mentalidad)),
    hype: estadisticas(resultados.map((r) => r.player.stats.hype)),
    titles: estadisticas(resultados.map((r) => r.player.titles))
  };
}

const corridas = Number(process.argv[2] || 1);
const splits = Number(process.argv[3] || 15);

if (corridas <= 1) {
  const seed = 42;
  console.log(JSON.stringify(reporteDetallado(correrCarrera(seed, splits), seed), null, 2));
} else {
  console.log(JSON.stringify(correrLote(corridas, splits), null, 2));
}
