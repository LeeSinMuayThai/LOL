import { pathToFileURL } from 'url';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto } from '../core/pipeline.js';
import { calcularContexto } from '../core/contexto.js';
import { nivelDelJugador } from '../core/ficha.js';
import { candidatos } from '../systems/events.js';
import { esCierreDeEdad } from '../systems/edadCierre.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { BALANCE } from '../data/balance.js';
import { probabilidadDeGanar } from '../core/numeros.js';
import { ESTRATEGIAS, NOMBRES_ESTRATEGIA } from './estrategias.js';

// Constante del reproductor (src/ui/reproductor.js, ESPERA_MS.x1): 700 ms por beat no técnico.
export const DURACION_BEAT_MS = 700;

// Máximo de carreras para el cálculo de varianza explicada por ablación.
export const MAX_CORRIDAS_ABLACION = 200;

// Fase 9E & J0 & K0: además del estado final, la carrera se observa SPLIT A SPLIT.
export function correrCarrera(seed, splits, responder) {
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
  let seriesVistas = state.career.registro.seriesGanadas + state.career.registro.seriesPerdidas;

  function marcarSeriesCerradas(st) {
    const seriesAhora = st.career.registro.seriesGanadas + st.career.registro.seriesPerdidas;
    if (seriesAhora <= seriesVistas) {
      return;
    }
    for (let k = 1; k < seriesAhora - seriesVistas; k += 1) {
      jugabilidad.draftsPorSerie.push(0);
    }
    jugabilidad.draftsPorSerie.push(draftsSerieActual);
    draftsSerieActual = 0;
    seriesVistas = seriesAhora;
  }

  // Métricas del instrumento de Fase K0.
  const observacion = {
    decisionesPorTipo: {},
    minijuegosCount: 0,
    decisionesPorSplitPro: [],
    splitsProData: [],
    temporadasNumero1: 0
  };

  let decisionesEnSplitActual = 0;

  const responderInstrumentado = (sistema, st, decision, rngLocal) => {
    marcarSeriesCerradas(st);
    jugabilidad.decisiones += 1;
    decisionesEnSplitActual += 1;

    const tipo = `${sistema.id}:${decision.datos?.motivo ?? decision.presentacion ?? 'x'}`;
    observacion.decisionesPorTipo[tipo] = (observacion.decisionesPorTipo[tipo] ?? 0) + 1;

    if (decision.presentacion === 'minijuego' || decision.datos?.motivo === 'minijuego') {
      observacion.minijuegosCount += 1;
    }

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
    decisionesEnSplitActual = 0;

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
    observacion.decisionesPorSplitPro.push(decisionesEnSplitActual);

    // Registro de split pro para K0 (economía y nivel).
    const mediaLiga = calcularMediaNivelLiga(state);
    const nivel = nivelDelJugador(state);
    const companeros = state.career.companeros ?? [];
    const companerosNivel = companeros.length > 0
      ? companeros.reduce((acc, c) => acc + c.nivel, 0) / companeros.length
      : mediaLiga;

    let posNorm = null;
    if (state.career.posicion && state.career.temporada?.tabla?.length > 1) {
      posNorm = 1 - (state.career.posicion - 1) / (state.career.temporada.tabla.length - 1);
    }

    observacion.splitsProData.push({
      mentalidad: state.player.stats.mentalidad,
      hype: state.player.stats.hype,
      posNorm,
      nivel,
      nivelRelativoJugador: nivel - mediaLiga,
      nivelRelativoCompaneros: companerosNivel - mediaLiga
    });

    if (esCierreDeEdad(state) && state.flags.rankMundialActual === 1) {
      observacion.temporadasNumero1 += 1;
    }

    if (state.career.currentOrg) {
      carrera.splitsConEquipo += 1;
      rachaSinEquipo = 0;
    } else {
      rachaSinEquipo += 1;
      carrera.maxRachaSinEquipo = Math.max(carrera.maxRachaSinEquipo, rachaSinEquipo);
    }

    if (state.career.tier !== null && (carrera.tierMaximo === null || state.career.tier < carrera.tierMaximo)) {
      carrera.tierMaximo = state.career.tier;
    }
  }

  carrera.varada = state.phase === 'profesional' && !state.career.currentOrg && state.career.tier === null;

  jugabilidad.poolMainMuerto = state.flags.eventosVistos?.pool_main_muerto ?? 0;
  jugabilidad.maestriaMinimaPool = state.player.championPool.length > 0
    ? Math.min(...state.player.championPool.map((campeon) => campeon.mastery))
    : null;

  const logsNoTecnicos = state.logs.filter((log) => !log.tecnico).length;
  observacion.tiempoMaquinaMin = (logsNoTecnicos * DURACION_BEAT_MS) / (1000 * 60);

  return { state, carrera, jugabilidad, observacion };
}

// Calcula la media de nivel de los jugadores de la liga actual del jugador.
export function calcularMediaNivelLiga(state) {
  const orgActual = state.career.currentOrg;
  const ligaId = state.career.liga;
  const ligas = state.mundo.ligas ?? [];
  const liga = ligas.find((l) => l.id === ligaId)
    ?? ligas.find((l) => l.orgs?.some((o) => o.nombre === orgActual));

  if (!liga) {
    return BALANCE.mercado.nivelLigaPorDefecto;
  }

  const planteles = state.mundo.planteles ?? {};
  const niveles = [];
  for (const org of liga.orgs ?? []) {
    const plantel = planteles[org.nombre];
    if (plantel) {
      for (const jugador of Object.values(plantel)) {
        if (typeof jugador?.nivel === 'number') {
          niveles.push(jugador.nivel);
        }
      }
    }
  }

  if (niveles.length > 0) {
    return niveles.reduce((s, v) => s + v, 0) / niveles.length;
  }

  return BALANCE.mercado.nivelLigaPorDefecto;
}

// Fase K0 (PLAN.md §K.3a): cálculo analítico cerrado de Bo5 para Δ de fuerza.
// Nota: K2 va a reemplazar estos sigmas fijos por `ruidoEfectivo(state)`.
// El 80% objetivo de K.3a es para Δ ≈ 10.
export function calcularFavoritoBo5(
  deltas = [0, 2, 4, 6, 8, 10, 12, 15],
  sigmaPropio = BALANCE.serie.ruidoMapa,
  sigmaRival = BALANCE.serie.ruidoRivalSerie
) {
  return deltas.map((delta) => {
    const pMapa = probabilidadDeGanar(delta, 0, sigmaPropio, sigmaRival);
    const q = 1 - pMapa;
    // Fórmula binomial/negativa para mejor de 5 (primero a 3):
    // 3-0: p^3
    // 3-1: 3 * p^3 * q
    // 3-2: 6 * p^3 * q^2
    const pSerieBo5 = (pMapa ** 3) * (1 + 3 * q + 6 * (q ** 2));
    return {
      delta,
      pMapa: Number(pMapa.toFixed(4)),
      pSerieBo5: Number(pSerieBo5.toFixed(4))
    };
  });
}

export function varianza(valores) {
  if (!valores || valores.length < 2) return 0;
  const m = promedio(valores);
  let sumaCuadrados = 0;
  for (const v of valores) {
    sumaCuadrados += (v - m) ** 2;
  }
  return sumaCuadrados / valores.length;
}

// Regresión lineal multivariada con 2 regresores a mano (OLS sin librerías).
// Y = b0 + b1*X1 + b2*X2
export function regresionLineal2Regresores(ys, xs1, xs2) {
  const n = ys.length;
  if (n < 30) {
    return { r2NivelYEquipo: null, r2SoloNivel: null, r2SoloEquipo: null };
  }
  const my = promedio(ys);
  const mx1 = promedio(xs1);
  const mx2 = promedio(xs2);

  let s11 = 0;
  let s22 = 0;
  let s12 = 0;
  let s1y = 0;
  let s2y = 0;
  let sstot = 0;

  for (let i = 0; i < n; i += 1) {
    const y = ys[i] - my;
    const x1 = xs1[i] - mx1;
    const x2 = xs2[i] - mx2;

    sstot += y * y;
    s11 += x1 * x1;
    s22 += x2 * x2;
    s12 += x1 * x2;
    s1y += x1 * y;
    s2y += x2 * y;
  }

  if (sstot <= 0) {
    return { r2NivelYEquipo: 0, r2SoloNivel: 0, r2SoloEquipo: 0 };
  }

  const det = s11 * s22 - s12 * s12;
  let r2NivelYEquipo = null;
  if (Math.abs(det) > 1e-12) {
    const b1 = (s22 * s1y - s12 * s2y) / det;
    const b2 = (s11 * s2y - s12 * s1y) / det;
    const ssreg = b1 * s1y + b2 * s2y;
    r2NivelYEquipo = Number(Math.max(0, Math.min(1, ssreg / sstot)).toFixed(3));
  }

  const r2SoloNivel = s11 > 0 ? Number(Math.max(0, Math.min(1, (s1y * s1y) / (s11 * sstot))).toFixed(3)) : null;
  const r2SoloEquipo = s22 > 0 ? Number(Math.max(0, Math.min(1, (s2y * s2y) / (s22 * sstot))).toFixed(3)) : null;

  return { r2NivelYEquipo, r2SoloNivel, r2SoloEquipo };
}

function correrSplitsSinRuido(corridasAblacion, splits, responder) {
  const overrides = {
    rendimiento: BALANCE.rendimiento.ruidoRendimiento,
    fecha: BALANCE.temporada.ruidoFecha,
    rivalFecha: BALANCE.temporada.ruidoRivalFecha,
    mapa: BALANCE.serie.ruidoMapa,
    rivalSerie: BALANCE.serie.ruidoRivalSerie
  };

  const ysSinRuido = [];

  try {
    BALANCE.rendimiento.ruidoRendimiento = 0;
    BALANCE.temporada.ruidoFecha = 0;
    BALANCE.temporada.ruidoRivalFecha = 0;
    BALANCE.serie.ruidoMapa = 0;
    BALANCE.serie.ruidoRivalSerie = 0;

    for (let seed = 1; seed <= corridasAblacion; seed += 1) {
      const rng = mulberry32(seed);
      let state = createInitialState(seed, rng);
      for (let split = 0; split < splits && !state.terminado; split += 1) {
        state = avanzarSplitAuto(state, rng, responder ?? undefined).state;
        if (state.phase === 'profesional' && state.career.posicion && state.career.temporada?.tabla?.length > 1) {
          const posNorm = 1 - (state.career.posicion - 1) / (state.career.temporada.tabla.length - 1);
          ysSinRuido.push(posNorm);
        }
      }
    }
  } finally {
    BALANCE.rendimiento.ruidoRendimiento = overrides.rendimiento;
    BALANCE.temporada.ruidoFecha = overrides.fecha;
    BALANCE.temporada.ruidoRivalFecha = overrides.rivalFecha;
    BALANCE.serie.ruidoMapa = overrides.mapa;
    BALANCE.serie.ruidoRivalSerie = overrides.rivalSerie;
  }

  return ysSinRuido;
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
  return denominador > 0 ? Number((sxy / denominador).toFixed(3)) : null;
}

function pctParesConsecutivosIguales(lista) {
  if (lista.length < 2) return null;
  let iguales = 0;
  for (let i = 1; i < lista.length; i += 1) {
    if (lista[i] === lista[i - 1]) iguales += 1;
  }
  return iguales / (lista.length - 1);
}

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
  const observaciones = [];
  let crashes = 0;

  for (let seed = 1; seed <= corridas; seed += 1) {
    try {
      const { state, carrera, jugabilidad, observacion } = correrCarrera(seed, splits, responder);
      resultados.push(state);
      carreras.push(carrera);
      jugabilidades.push(jugabilidad);
      observaciones.push(observacion);
    } catch (error) {
      crashes += 1;
      console.error(`Crash en seed ${seed} (${estrategia}): ${error.message}`);
    }
  }

  const total = resultados.length;
  const llegaronAPro = resultados.filter((r) => r.splitFichaje !== null);

  // --- Bloque EMBUDO (§K.3b) ---
  const noLlegaAProCount = resultados.filter((r) => r.splitFichaje === null).length;
  const estancadoT2T3Count = resultados.filter((r, idx) => r.splitFichaje !== null && (carreras[idx].tierMaximo === null || carreras[idx].tierMaximo >= 2)).length;
  const llegaATier1Count = resultados.filter((r, idx) => carreras[idx].tierMaximo === 1).length;

  // En el motor actual, registro.titulos acumula campeonatos domésticos de liga (systems/rendimiento.js, systems/serie.js).
  // Los torneos internacionales se registran por separado en registro.internacionales.
  const ganaTituloDomesticoCount = resultados.filter((r) => r.career.registro.titulos.length >= 1).length;
  const top20Count = resultados.filter((r) => (r.career.registro.picos.rankMundial ?? 0) > 0).length;

  // Proxy de Mundial antes de K5: haber participado de un torneo internacional con resultado === 'buen_papel'.
  const ganaMundialProxyCount = resultados.filter((r) => (
    r.career.registro.internacionales.some((intl) => intl.resultado === 'buen_papel')
  )).length;

  const carrerasConAlMenosUnMundial = resultados.filter((r) => (
    r.career.registro.internacionales.some((intl) => intl.resultado === 'buen_papel')
  ));
  const carrerasConDosOMasMundiales = carrerasConAlMenosUnMundial.filter((r) => (
    r.career.registro.internacionales.filter((intl) => intl.resultado === 'buen_papel').length >= 2
  ));

  const pOtroMundialDadoUno = carrerasConAlMenosUnMundial.length >= 30
    ? {
        p: Number((carrerasConDosOMasMundiales.length / carrerasConAlMenosUnMundial.length).toFixed(3)),
        n: carrerasConAlMenosUnMundial.length
      }
    : null;

  // nuevoFaker = >= 2 mundiales (proxy) o #1 del mundo en >= 3 temporadas.
  const nuevoFakerCount = resultados.filter((r, idx) => {
    const mundiales = r.career.registro.internacionales.filter((intl) => intl.resultado === 'buen_papel').length;
    const temporadas1 = observaciones[idx].temporadasNumero1;
    return mundiales >= 2 || temporadas1 >= 3;
  }).length;

  const embudo = {
    noLlegaAPro: Number(((noLlegaAProCount / total) * 100).toFixed(1)),
    estancadoT2T3: Number(((estancadoT2T3Count / total) * 100).toFixed(1)),
    llegaATier1: Number(((llegaATier1Count / total) * 100).toFixed(1)),
    ganaTituloDomestico: Number(((ganaTituloDomesticoCount / total) * 100).toFixed(1)),
    top20: Number(((top20Count / total) * 100).toFixed(1)),
    top20DeTier1: llegaATier1Count > 0 ? Number(((top20Count / llegaATier1Count) * 100).toFixed(1)) : 0,
    ganaMundial: Number(((ganaMundialProxyCount / total) * 100).toFixed(1)),
    proxyAntesDeK5: true,
    nuevoFaker: Number(((nuevoFakerCount / total) * 100).toFixed(1)),
    pOtroMundialDadoUno: pOtroMundialDadoUno ? pOtroMundialDadoUno.p : null,
    pOtroMundialN: carrerasConAlMenosUnMundial.length
  };

  // --- Bloque NIVEL (§K.3a) ---
  const splitsProValidos = observaciones.flatMap((o) => o.splitsProData).filter((d) => d.posNorm !== null);
  const rNivelPosicionMismaLiga = pearson(
    splitsProValidos.map((d) => d.nivelRelativoJugador),
    splitsProValidos.map((d) => d.posNorm)
  );
  const rNivelPosicionBruto = pearson(
    splitsProValidos.map((d) => d.nivel),
    splitsProValidos.map((d) => d.posNorm)
  );

  const favoritoBo5 = calcularFavoritoBo5();

  // Varianza explicada por ablación sobre las primeras corridasAblacion carreras.
  const corridasAblacion = Math.min(total, MAX_CORRIDAS_ABLACION);
  const splitsProAblacionBase = observaciones.slice(0, corridasAblacion).flatMap((o) => o.splitsProData).filter((d) => d.posNorm !== null);
  const ysBase = splitsProAblacionBase.map((d) => d.posNorm);
  const xs1Base = splitsProAblacionBase.map((d) => d.nivelRelativoJugador);
  const xs2Base = splitsProAblacionBase.map((d) => d.nivelRelativoCompaneros);

  const varBase = varianza(ysBase);
  const ysSinRuido = correrSplitsSinRuido(corridasAblacion, splits, responder);
  const varSinRuido = varianza(ysSinRuido);
  const ruidoPuro = varBase > 0 ? Number((1 - varSinRuido / varBase).toFixed(3)) : null;

  const { r2NivelYEquipo, r2SoloNivel, r2SoloEquipo } = regresionLineal2Regresores(ysBase, xs1Base, xs2Base);

  const varianzaExplicada = {
    ruidoPuro,
    r2NivelYEquipo,
    r2SoloNivel,
    r2SoloEquipo,
    varBase: Number(varBase.toFixed(4)),
    varSinRuido: Number(varSinRuido.toFixed(4)),
    corridasAblacion,
    nSplitsBase: ysBase.length,
    nSplitsSinRuido: ysSinRuido.length
  };

  const nivel = {
    rNivelPosicionMismaLiga,
    rNivelPosicionBruto,
    favoritoBo5,
    varianzaExplicada
  };

  // --- Bloque ECONOMÍA (§K.3c) ---
  const todosSplitsPro = observaciones.flatMap((o) => o.splitsProData);
  const mentalidadesPro = todosSplitsPro.map((d) => d.mentalidad);
  const hypesPro = todosSplitsPro.map((d) => d.hype);

  const economia = {
    mentalidad: {
      p10: percentil(mentalidadesPro, 0.1),
      p25: percentil(mentalidadesPro, 0.25),
      p50: percentil(mentalidadesPro, 0.5),
      p75: percentil(mentalidadesPro, 0.75),
      p90: percentil(mentalidadesPro, 0.9),
      pctMayorIgual90: mentalidadesPro.length > 0
        ? Number(((mentalidadesPro.filter((m) => m >= 90).length / mentalidadesPro.length) * 100).toFixed(1))
        : null
    },
    hype: {
      p10: percentil(hypesPro, 0.1),
      p25: percentil(hypesPro, 0.25),
      p50: percentil(hypesPro, 0.5),
      p75: percentil(hypesPro, 0.75),
      p90: percentil(hypesPro, 0.9),
      pctMayorIgual90: hypesPro.length > 0
        ? Number(((hypesPro.filter((h) => h >= 90).length / hypesPro.length) * 100).toFixed(1))
        : null
    }
  };

  // --- Bloque LONGEVIDAD (§K.3b) ---
  const aniosPro = llegaronAPro.map((r) => (r.player.splitCount - r.splitFichaje) / 3);
  const forzoso34Count = llegaronAPro.filter((r) => r.age >= BALANCE.retiro.edadRetiroForzoso).length;

  const longevidad = {
    aniosCarreraPro: {
      mediana: mediana(aniosPro),
      p10: percentil(aniosPro, 0.1),
      p90: percentil(aniosPro, 0.9),
      pctMenosDe4Anios: aniosPro.length > 0
        ? Number(((aniosPro.filter((a) => a < 4).length / aniosPro.length) * 100).toFixed(1))
        : null
    },
    pctTerminaEnLineaForzosa34: llegaronAPro.length > 0
      ? Number(((forzoso34Count / llegaronAPro.length) * 100).toFixed(1))
      : 0,
    desgloseFinAnticipado: porcentajes(
      conteo(llegaronAPro, (r) => r.finAnticipado ?? 'retiro_normal'),
      llegaronAPro.length || 1
    )
  };

  // --- Bloque RITMO (§K.3c) ---
  const decisionesPorCarrera = jugabilidades.map((j) => j.decisiones);
  const todasDecisionesPorSplitPro = observaciones.flatMap((o) => o.decisionesPorSplitPro);
  const minijuegosPorCarrera = observaciones.map((o) => o.minijuegosCount);
  const tiemposMaquinaMin = observaciones.map((o) => o.tiempoMaquinaMin);

  const decisionesPorTipoAcum = {};
  for (const o of observaciones) {
    for (const [k, v] of Object.entries(o.decisionesPorTipo)) {
      decisionesPorTipoAcum[k] = (decisionesPorTipoAcum[k] ?? 0) + v;
    }
  }
  const totalDecisionesTodas = Object.values(decisionesPorTipoAcum).reduce((a, b) => a + b, 0);

  const ritmo = {
    interrupcionesPorCarrera: {
      min: estadisticas(decisionesPorCarrera).min,
      max: estadisticas(decisionesPorCarrera).max,
      promedio: estadisticas(decisionesPorCarrera).promedio,
      mediana: mediana(decisionesPorCarrera),
      p90: percentil(decisionesPorCarrera, 0.9)
    },
    interrupcionesPorSplitPro: {
      p50: mediana(todasDecisionesPorSplitPro),
      p90: percentil(todasDecisionesPorSplitPro, 0.9),
      max: todasDecisionesPorSplitPro.length > 0 ? Math.max(...todasDecisionesPorSplitPro) : 0,
      pctSplitsConMasDe2: todasDecisionesPorSplitPro.length > 0
        ? Number(((todasDecisionesPorSplitPro.filter((d) => d > 2).length / todasDecisionesPorSplitPro.length) * 100).toFixed(1))
        : 0,
      // Nota metodológica: en el motor actual, los playoffs e internacionales se resuelven
      // dentro de los mismos splits regulares o de cierre, sin un estado de split dedicado.
      splitsPlayoffsInternacionalSeparados: null
    },
    desglosePorTipo: Object.entries(decisionesPorTipoAcum)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, cant]) => ({
        tipo,
        cantidadPorCarrera: Number((cant / total).toFixed(1)),
        pctDelTotal: totalDecisionesTodas > 0 ? Number(((cant / totalDecisionesTodas) * 100).toFixed(1)) : 0
      })),
    minijuegosPorCarrera: {
      promedio: promedio(minijuegosPorCarrera) !== null ? Number(promedio(minijuegosPorCarrera).toFixed(2)) : null,
      mediana: mediana(minijuegosPorCarrera)
    },
    // Beats * 700ms (src/ui/reproductor.js): tiempo en minutos que el reproductor web toma
    // para emitir cada log no técnico a velocidad 1x (DURACION_BEAT_MS = 700).
    tiempoMaquinaMin: {
      mediana: mediana(tiemposMaquinaMin) !== null ? Number(mediana(tiemposMaquinaMin).toFixed(2)) : null,
      p90: percentil(tiemposMaquinaMin, 0.9) !== null ? Number(percentil(tiemposMaquinaMin, 0.9).toFixed(2)) : null
    }
  };

  // --- Bloque POR REGIÓN ---
  const indicesPorRegion = {};
  resultados.forEach((r, idx) => {
    const reg = r.mundo.regionOrigen ?? 'Desconocida';
    indicesPorRegion[reg] = indicesPorRegion[reg] ?? [];
    indicesPorRegion[reg].push(idx);
  });

  const porRegion = {};
  for (const [region, indices] of Object.entries(indicesPorRegion)) {
    const nReg = indices.length;
    const resReg = indices.map((i) => resultados[i]);
    const carReg = indices.map((i) => carreras[i]);
    const obsReg = indices.map((i) => observaciones[i]);
    const proReg = resReg.filter((r) => r.splitFichaje !== null);

    const noProCount = resReg.filter((r) => r.splitFichaje === null).length;
    const estCount = resReg.filter((r, i) => r.splitFichaje !== null && (carReg[i].tierMaximo === null || carReg[i].tierMaximo >= 2)).length;
    const t1Count = resReg.filter((r, i) => carReg[i].tierMaximo === 1).length;
    const titCount = resReg.filter((r) => r.career.registro.titulos.length >= 1).length;
    const top20RCount = resReg.filter((r) => (r.career.registro.picos.rankMundial ?? 0) > 0).length;
    const mundRCount = resReg.filter((r) => (
      r.career.registro.internacionales.some((intl) => intl.resultado === 'buen_papel')
    )).length;
    const fakerRCount = resReg.filter((r, i) => {
      const mund = r.career.registro.internacionales.filter((intl) => intl.resultado === 'buen_papel').length;
      return mund >= 2 || obsReg[i].temporadasNumero1 >= 3;
    }).length;

    const aniosR = proReg.map((r) => (r.player.splitCount - r.splitFichaje) / 3);
    const forz34R = proReg.filter((r) => r.age >= BALANCE.retiro.edadRetiroForzoso).length;

    const splitsValReg = obsReg.flatMap((o) => o.splitsProData).filter((d) => d.posNorm !== null);

    const decsCarreraReg = indices.map((i) => jugabilidades[i].decisiones);
    const decsSplitProReg = obsReg.flatMap((o) => o.decisionesPorSplitPro);
    const minisReg = obsReg.map((o) => o.minijuegosCount);
    const tiempoReg = obsReg.map((o) => o.tiempoMaquinaMin);

    porRegion[region] = {
      totalCarreras: nReg,
      embudo: {
        noLlegaAPro: Number(((noProCount / nReg) * 100).toFixed(1)),
        estancadoT2T3: Number(((estCount / nReg) * 100).toFixed(1)),
        llegaATier1: Number(((t1Count / nReg) * 100).toFixed(1)),
        ganaTituloDomestico: Number(((titCount / nReg) * 100).toFixed(1)),
        top20: Number(((top20RCount / nReg) * 100).toFixed(1)),
        ganaMundial: Number(((mundRCount / nReg) * 100).toFixed(1)),
        nuevoFaker: Number(((fakerRCount / nReg) * 100).toFixed(1))
      },
      longevidad: {
        aniosCarreraProMediana: mediana(aniosR),
        p10: percentil(aniosR, 0.1),
        p90: percentil(aniosR, 0.9),
        pctTerminaEnLineaForzosa34: proReg.length > 0 ? Number(((forz34R / proReg.length) * 100).toFixed(1)) : 0
      },
      nivel: {
        rNivelPosicionMismaLiga: pearson(splitsValReg.map((d) => d.nivelRelativoJugador), splitsValReg.map((d) => d.posNorm)),
        rNivelPosicionBruto: pearson(splitsValReg.map((d) => d.nivel), splitsValReg.map((d) => d.posNorm))
      },
      ritmo: {
        interrupcionesPorCarreraMediana: mediana(decsCarreraReg),
        interrupcionesPorSplitProMediana: mediana(decsSplitProReg),
        minijuegosPorCarreraMediana: mediana(minisReg),
        tiempoMaquinaMinMediana: mediana(tiempoReg) !== null ? Number(mediana(tiempoReg).toFixed(2)) : null
      }
    };
  }

  return {
    estrategia,
    corridas,
    splits,
    crashes,
    finales: porcentajes(conteo(resultados, (r) => r.finAnticipado ?? (r.phase === 'amateur' ? 'sigue_amateur' : 'en_carrera')), total),
    llegaronAPro: `${llegaronAPro.length} (${((llegaronAPro.length / total) * 100).toFixed(1)}%)`,
    splitFichaje: estadisticas(llegaronAPro.map((r) => r.splitFichaje)),
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
    })(),

    // Nuevos bloques instrumentados de la Fase K0
    embudo,
    nivel,
    economia,
    longevidad,
    ritmo,
    porRegion
  };
}

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
    const { state, carrera, jugabilidad, observacion } = correrCarrera(seed, splits, ESTRATEGIAS[estrategia]);
    console.log(JSON.stringify({ ...reporteDetallado(state, seed), carrera, jugabilidad, observacion }, null, 2));
  } else if (estrategia === 'todas') {
    console.log(JSON.stringify(NOMBRES_ESTRATEGIA.map((nombre) => correrLote(corridas, splits, nombre)), null, 2));
  } else {
    console.log(JSON.stringify(correrLote(corridas, splits, estrategia), null, 2));
  }
}
