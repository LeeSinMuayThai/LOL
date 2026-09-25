import { pathToFileURL } from 'url';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto } from '../core/pipeline.js';
import { calcularContexto } from '../core/contexto.js';
import { nivelDelJugador } from '../core/ficha.js';
import { candidatos } from '../systems/events.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { BALANCE } from '../data/balance.js';
import { ESTRATEGIAS, NOMBRES_ESTRATEGIA } from './estrategias.js';

// Fase 9E: además del estado final, la carrera se observa SPLIT A SPLIT.
//
// Hasta acá simulate.js solo miraba el estado final, y por eso 1.500 carreras
// no vieron nunca el bug D25: una racha de 57 splits sin equipo es invisible
// desde el final, que solo dice "sin equipo" una vez. `carrera` es lo que
// pasó en el medio — es la mitad de la partida que el reporte no miraba.
//
// Fase J0 (AUDITORIA.md, "el instrumento" — PLAN.md §J0): un nivel más
// arriba todavía. `carrera` mide si el motor te dejó jugar; `jugabilidad`
// mide si lo que te dejó jugar fue una decisión real — exactamente lo que
// 194 checks en verde no vieron el día que se jugó la carrera que abrió la
// FASE J. Cada campo corresponde a una causa medida en §J.0: `splitsPro`/
// `splitsConMainMuerto` a "siempre sale lo mismo"; `descartadosPorBisagra` al
// filtro exclusivo de `conPrioridadDeBisagra`; `categoriasReveladas` a "dos
// veces seguidas lo del meta"; `decisiones`/`draftsPorSerie` a "hacés un clic
// y perdiste"; `poolMainMuerto` a "maestría 5, antes tenía más"; `nivelFinal`/
// `jerarquiaFinal` a "es todo RNG, mi skill no importa".
function correrCarrera(seed, splits, responder) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);

  const carrera = { splitsPro: 0, splitsConEquipo: 0, maxRachaSinEquipo: 0, tierMaximo: null };
  let rachaSinEquipo = 0;

  const jugabilidad = {
    splitsPro: 0,
    splitsConMainMuerto: 0,
    descartadosPorBisagra: [],
    categoriasReveladas: [],
    decisiones: 0,
    draftsPorSerie: [],
    nivelFinal: null,
    jerarquiaFinal: null
  };
  let draftsSerieActual = 0;
  // `seriesGanadas + seriesPerdidas` es el contador que de verdad se mueve
  // una vez por serie cerrada, tenga o no drafts — no `state.serie.activa`
  // antes/después del split: un bracket entero (hasta 20 mapas, varias
  // rondas) puede abrirse y cerrarse DENTRO de un único `avanzarSplitAuto`
  // (§J.0, "hacés un clic y perdiste"), así que revisar el contador solo una
  // vez por split fusionaría todas esas series en un solo dato inflado. Se
  // revisa en cada decisión resuelta (abajo) y al final de cada split, así
  // que ninguna serie que cierre entre dos decisiones se pierde.
  let seriesVistas = state.career.registro.seriesGanadas + state.career.registro.seriesPerdidas;

  function marcarSeriesCerradas(st) {
    const seriesAhora = st.career.registro.seriesGanadas + st.career.registro.seriesPerdidas;
    if (seriesAhora <= seriesVistas) {
      return;
    }
    // Si cerraron 2+ series sin una decisión en el medio (el caso de arriba),
    // no hay cómo repartirles los drafts acumulados: se le asignan todos a
    // la última y el resto quedan en 0 — nunca inventa drafts que no se
    // vieron, y sigue contando cada serie por separado.
    for (let k = 1; k < seriesAhora - seriesVistas; k += 1) {
      jugabilidad.draftsPorSerie.push(0);
    }
    jugabilidad.draftsPorSerie.push(draftsSerieActual);
    draftsSerieActual = 0;
    seriesVistas = seriesAhora;
  }

  // Envuelve la estrategia real (o `resolverAuto` si `responder` es null,
  // el mismo default que ya usa `avanzarSplitAuto`) sin cambiar una sola
  // respuesta: solo mira la decisión de pasada antes de contestarla, así
  // el comportamiento y el consumo de `rng` quedan idénticos a hoy.
  const responderInstrumentado = (sistema, st, decision, rngLocal) => {
    marcarSeriesCerradas(st);
    jugabilidad.decisiones += 1;
    if (sistema.id === 'eventos' && decision.datos?.evento) {
      jugabilidad.categoriasReveladas.push(decision.datos.evento.categoria);
    }
    if (sistema.id === 'serie' && decision.datos?.motivo === 'draft') {
      draftsSerieActual += 1;
    }
    return responder
      ? responder(sistema, st, decision, rngLocal)
      : sistema.resolverAuto(st, decision, rngLocal);
  };

  for (let i = 0; i < splits && !state.terminado; i += 1) {
    // `candidatos`/`calcularContexto` son puros (T2: contexto siempre en
    // vivo) — llamarlos acá no consume `rng` ni duplica lo que
    // `elegirEvento` calcula adentro, así que mirar antes de avanzar no
    // desincroniza el stream (T1) ni arriesga que las dos cuentas diverjan.
    if (state.phase === 'profesional') {
      const contexto = calcularContexto(state);
      jugabilidad.splitsPro += 1;
      if (contexto.marcas.includes('main_muerto')) {
        jugabilidad.splitsConMainMuerto += 1;
      }
      const elegibles = candidatos(state);
      const bisagras = elegibles.filter((evento) => evento.bisagra);
      if (bisagras.length > 0) {
        jugabilidad.descartadosPorBisagra.push(elegibles.length - bisagras.length);
      }
      jugabilidad.nivelFinal = nivelDelJugador(state);
      jugabilidad.jerarquiaFinal = state.career.jerarquia;
    }

    state = avanzarSplitAuto(state, rng, responderInstrumentado).state;
    marcarSeriesCerradas(state);

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

  jugabilidad.poolMainMuerto = state.flags.eventosVistos?.pool_main_muerto ?? 0;
  jugabilidad.maestriaMinimaPool = state.player.championPool.length > 0
    ? Math.min(...state.player.championPool.map((campeon) => campeon.mastery))
    : null;

  return { state, carrera, jugabilidad };
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

function promedio(valores) {
  return valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
}

function mediana(valores) {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0 ? (ordenados[medio - 1] + ordenados[medio]) / 2 : ordenados[medio];
}

function percentil(valores, p) {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.floor(p * ordenados.length));
  return ordenados[indice];
}

// Mismo cálculo que `pearson9Mi` de `validate.js` (fase 9Mi): coeficiente de
// Pearson simple, sin librería. `null` con menos de 30 pares — con menos, el
// coeficiente es puro ruido de muestra.
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 30) return null;
  const mx = promedio(xs);
  const my = promedio(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const denominador = Math.sqrt(sxx * syy);
  return denominador > 0 ? sxy / denominador : null;
}

// Fracción de pares consecutivos que repiten valor — usado para "dos veces
// seguidas lo del meta" (§J.0): cuántos eventos revelados seguidos comparten
// `categoria` con el anterior.
function pctParesConsecutivosIguales(lista) {
  if (lista.length < 2) return null;
  let iguales = 0;
  for (let i = 1; i < lista.length; i += 1) {
    if (lista[i] === lista[i - 1]) iguales += 1;
  }
  return iguales / (lista.length - 1);
}

// Análisis estático del catálogo (fase J0): cero simulación, cero `rng` — es
// la mitad de §J.0 que ya está en los datos, no en el comportamiento. Cada
// campo corresponde a una causa medida: `pctEfectosMentalidadHype`/
// `sigmaEfectoTipico` a "las opciones no afectan nada" (mentalidad/hype no se
// leen en `fuerza.js`, así que un efecto típico se pierde contra
// `ruidoRendimiento`); `pctEfectosDeRolQueSonDeCurva`/`vidaMediaPorCurva` a
// que la curva de `atributos.js` converge al objetivo biológico y se come
// cualquier bulto que no sea permanente; `pctOutcomesConModificadores` a que
// la promesa de CONCEPTO §8 ("tus stats corren esos pesos") hoy se cumple en
// una fracción chica del catálogo. Memoizado: el catálogo no cambia entre
// llamadas de la misma corrida.
let _catalogo = null;
export function analizarCatalogo() {
  if (_catalogo) return _catalogo;

  const statsDeCurva = Object.keys(BALANCE.atributos.curvas);
  const statsDeRol = [...statsDeCurva, ...Object.keys(BALANCE.atributos.acumulativos)];

  let efectosTotal = 0;
  let efectosMentalidadHype = 0;
  const magnitudesMentalidadHype = [];
  let efectosDeRol = 0;
  let efectosDeCurva = 0;
  let outcomesTotal = 0;
  let outcomesConModificadores = 0;

  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options) {
      for (const outcome of opcion.outcomes) {
        outcomesTotal += 1;
        if (outcome.modificadores) {
          outcomesConModificadores += 1;
        }
        for (const efecto of outcome.effects ?? []) {
          efectosTotal += 1;
          if (efecto.type !== 'stat') continue;
          const stat = efecto.path?.split('.').pop();
          if (stat === 'mentalidad' || stat === 'hype') {
            efectosMentalidadHype += 1;
            magnitudesMentalidadHype.push(Math.abs((efecto.min + efecto.max) / 2));
          }
          if (statsDeRol.includes(stat)) {
            efectosDeRol += 1;
            if (statsDeCurva.includes(stat)) {
              efectosDeCurva += 1;
            }
          }
        }
      }
    }
  }

  const magnitudMediaMentalidadHype = promedio(magnitudesMentalidadHype) ?? 0;

  const vidaMediaPorCurva = {};
  const retencion4SplitsPorCurva = {};
  for (const stat of statsDeCurva) {
    const decaimiento = 1 - BALANCE.atributos.curvas[stat].velocidad;
    vidaMediaPorCurva[stat] = Number((Math.log(0.5) / Math.log(decaimiento)).toFixed(2));
    retencion4SplitsPorCurva[stat] = Number((decaimiento ** 4).toFixed(3));
  }

  _catalogo = {
    efectosTotal,
    pctEfectosMentalidadHype: efectosTotal > 0 ? efectosMentalidadHype / efectosTotal : null,
    magnitudMediaEfectoMentalidadHype: Number(magnitudMediaMentalidadHype.toFixed(2)),
    sigmaEfectoTipico: Number((magnitudMediaMentalidadHype / BALANCE.rendimiento.ruidoRendimiento).toFixed(3)),
    pctEfectosDeRolQueSonDeCurva: efectosDeRol > 0 ? efectosDeCurva / efectosDeRol : null,
    outcomesTotal,
    pctOutcomesConModificadores: outcomesTotal > 0 ? outcomesConModificadores / outcomesTotal : null,
    // Analítico, no medido: el objetivo biológico (`nivelDeCurva`) es una
    // función pura de edad/oculto/splitsJugados, y `moverStatsDeCurva`
    // converge hacia él con una fracción fija (`velocidad`) por split — la
    // vida media de CUALQUIER bulto que no toque `objetivo` sale directo de
    // esa fracción, sin necesidad (ni ruido de) simular.
    vidaMediaPorCurva,
    retencion4SplitsPorCurva
  };
  return _catalogo;
}

export function correrLote(corridas, splits, estrategia) {
  const responder = ESTRATEGIAS[estrategia];
  const resultados = [];
  const carreras = [];
  const jugabilidades = [];
  let crashes = 0;

  for (let seed = 1; seed <= corridas; seed += 1) {
    try {
      const { state, carrera, jugabilidad } = correrCarrera(seed, splits, responder);
      resultados.push(state);
      carreras.push(carrera);
      jugabilidades.push(jugabilidad);
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
    hype: estadisticas(resultados.map((r) => r.player.stats.hype)),
    // Fase J0: el instrumento que 194 checks en verde no tenían — ver el
    // comentario de `correrCarrera`. `catalogo` es estático (no depende de
    // `estrategia` ni de las carreras corridas, pero viaja en cada reporte
    // para que quien lea un solo bloque `todas` no tenga que cruzar con otro).
    jugabilidad: (() => {
      const catalogo = analizarCatalogo();
      const conSplitsPro = jugabilidades.filter((j) => j.splitsPro > 0);
      const splitsProTotal = conSplitsPro.reduce((s, j) => s + j.splitsPro, 0);
      const splitsConMainMuertoTotal = conSplitsPro.reduce((s, j) => s + j.splitsConMainMuerto, 0);

      const descartadosPorBisagra = jugabilidades.flatMap((j) => j.descartadosPorBisagra);
      const categorias = jugabilidades.flatMap((j) => j.categoriasReveladas);
      const draftsPorSerie = jugabilidades.flatMap((j) => j.draftsPorSerie);
      const paresNivelJerarquia = jugabilidades.filter((j) => j.nivelFinal !== null && j.jerarquiaFinal !== null);

      return {
        catalogo,
        rNivelJerarquiaFinal: pearson(
          paresNivelJerarquia.map((j) => j.nivelFinal),
          paresNivelJerarquia.map((j) => j.jerarquiaFinal)
        ),
        pctSplitsConMainMuerto: splitsProTotal > 0 ? Number((splitsConMainMuertoTotal / splitsProTotal).toFixed(3)) : null,
        p95DescartadosPorBisagra: percentil(descartadosPorBisagra, 0.95),
        pctParesConsecutivosMismaCategoria: categorias.length > 1 ? Number(pctParesConsecutivosIguales(categorias).toFixed(3)) : null,
        pctPantallaCategoriaParche: categorias.length > 0
          ? Number((categorias.filter((c) => c === 'parche').length / categorias.length).toFixed(3))
          : null,
        pctSeriesSinDraft: draftsPorSerie.length > 0
          ? Number((draftsPorSerie.filter((d) => d === 0).length / draftsPorSerie.length).toFixed(3))
          : null,
        medianaDraftsPorSerie: mediana(draftsPorSerie),
        seriesMedidas: draftsPorSerie.length,
        poolMainMuertoPorCarrera: (() => {
          const v = promedio(jugabilidades.map((j) => j.poolMainMuerto));
          return v === null ? null : Number(v.toFixed(2));
        })(),
        decisionesPorCarrera: estadisticas(jugabilidades.map((j) => j.decisiones)),
        maestriaMinimaPoolAlFinal: estadisticas(jugabilidades.map((j) => j.maestriaMinimaPool).filter((v) => v !== null))
      };
    })()
  };
}

// Fase J0 (AUDITORIA.md AUD-2): guardado detrás de `import.meta.url` para
// que `validate.js` pueda importar `correrLote`/`analizarCatalogo` en
// proceso (mismo criterio que `estrategias.js`) sin que el sólo hecho de
// importar dispare una corrida completa por `process.argv`.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const corridas = Number(process.argv[2] || 1);
  const splits = Number(process.argv[3] || 15);
  const estrategia = process.argv[4] || 'equilibrado';

  if (!(estrategia in ESTRATEGIAS) && estrategia !== 'todas') {
    console.error(`Estrategia desconocida: ${estrategia}. Opciones: ${NOMBRES_ESTRATEGIA.join(', ')}, todas.`);
    process.exit(1);
  }

  if (corridas <= 1) {
    const seed = 42;
    const { state, carrera, jugabilidad } = correrCarrera(seed, splits, ESTRATEGIAS[estrategia]);
    console.log(JSON.stringify({ ...reporteDetallado(state, seed), carrera, jugabilidad }, null, 2));
  } else if (estrategia === 'todas') {
    console.log(JSON.stringify(NOMBRES_ESTRATEGIA.map((nombre) => correrLote(corridas, splits, nombre)), null, 2));
  } else {
    console.log(JSON.stringify(correrLote(corridas, splits, estrategia), null, 2));
  }
}
