import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto } from '../core/pipeline.js';
import { ESTRATEGIAS, NOMBRES_ESTRATEGIA } from './estrategias.js';

// Fase 9E: además del estado final, la carrera se observa SPLIT A SPLIT.
//
// Hasta acá simulate.js solo miraba el estado final, y por eso 1.500 carreras
// no vieron nunca el bug D25: una racha de 57 splits sin equipo es invisible
// desde el final, que solo dice "sin equipo" una vez. `carrera` es lo que
// pasó en el medio — es la mitad de la partida que el reporte no miraba.
function correrCarrera(seed, splits, responder) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);

  const carrera = { splitsPro: 0, splitsConEquipo: 0, maxRachaSinEquipo: 0, tierMaximo: null };
  let rachaSinEquipo = 0;

  for (let i = 0; i < splits && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng, responder ?? undefined).state;

    if (state.phase !== 'profesional') {
      continue;
    }
    carrera.splitsPro += 1;

    if (state.career.currentOrg) {
      carrera.splitsConEquipo += 1;
      rachaSinEquipo = 0;
    } else {
      rachaSinEquipo += 1;
      carrera.maxRachaSinEquipo = Math.max(carrera.maxRachaSinEquipo, rachaSinEquipo);
    }

    // El tier es 1 arriba y 3 abajo: el máximo alcanzado es el MENOR número.
    if (state.career.tier !== null && (carrera.tierMaximo === null || state.career.tier < carrera.tierMaximo)) {
      carrera.tierMaximo = state.career.tier;
    }
  }

  // Varada: profesional, sin org y sin tier. Ningún sistema la puede rescatar
  // —`competitivo` se guarda detrás del tier, `mercado` detrás de la liga—,
  // así que no es "estar libre": es no tener juego.
  carrera.varada = state.phase === 'profesional' && !state.career.currentOrg && state.career.tier === null;

  return { state, carrera };
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
  const carreras = [];
  let crashes = 0;

  for (let seed = 1; seed <= corridas; seed += 1) {
    try {
      const { state, carrera } = correrCarrera(seed, splits, responder);
      resultados.push(state);
      carreras.push(carrera);
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
    // Fase 9E: la mitad de la partida que este reporte no miraba. Sin esto,
    // 1.500 carreras podían salir "sanas" con el 47,5% de los splits
    // profesionales jugándose sin equipo (bug D25).
    carrera: (() => {
      const conPro = carreras.filter((c) => c.splitsPro > 0);
      const splitsPro = conPro.reduce((s, c) => s + c.splitsPro, 0);
      const conEquipo = conPro.reduce((s, c) => s + c.splitsConEquipo, 0);
      const varadas = carreras.filter((c) => c.varada).length;

      return {
        splitsProConEquipo: splitsPro > 0 ? `${((conEquipo / splitsPro) * 100).toFixed(1)}%` : 'sin splits pro',
        varadas: `${varadas} (${((varadas / total) * 100).toFixed(1)}%)`,
        maxRachaSinEquipo: estadisticas(conPro.map((c) => c.maxRachaSinEquipo)),
        tierMaximo: porcentajes(conteo(carreras, (c) => (c.tierMaximo === null ? 'nunca_fichado' : `tier${c.tierMaximo}`)), total)
      };
    })(),
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
  const { state, carrera } = correrCarrera(seed, splits, ESTRATEGIAS[estrategia]);
  console.log(JSON.stringify({ ...reporteDetallado(state, seed), carrera }, null, 2));
} else if (estrategia === 'todas') {
  console.log(JSON.stringify(NOMBRES_ESTRATEGIA.map((nombre) => correrLote(corridas, splits, nombre)), null, 2));
} else {
  console.log(JSON.stringify(correrLote(corridas, splits, estrategia), null, 2));
}
