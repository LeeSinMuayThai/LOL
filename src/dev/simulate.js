import { pathToFileURL } from 'url';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto } from '../core/pipeline.js';
import { calcularContexto } from '../core/contexto.js';
import { nivelDelJugador } from '../core/ficha.js';
import { tierMasAltoJugado } from '../core/registro.js';
import { puntajeDeCarrera, NIVELES } from '../core/puntaje.js';
import { candidatos } from '../systems/events.js';
import { esCierreDeEdad } from '../systems/edadCierre.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { BALANCE } from '../data/balance.js';
import { probabilidadDeGanar } from '../core/numeros.js';
import { ESTRATEGIAS, NOMBRES_ESTRATEGIA, esDecisionDeMinijuego } from './estrategias.js';

// --- Constantes de medición (PLAN.md §K.5 K0) ---
// Nada de esto es del juego (esas van en `data/balance.js`): son parámetros de las sondas.

// Cuánto espera el reproductor del navegador entre beats a velocidad 1x: `ESPERA_MS.x1` en
// src/ui/reproductor.js (línea 14, `const ESPERA_MS = { x1: 700, x2: 350, instantaneo: 0 }`). Si
// alguien cambia el pulso del reproductor, este número se desactualiza en silencio: es un espejo.
export const DURACION_BEAT_MS = 700;

// Cuánto espera la UI después de que el jugador termina un minijuego, antes de seguir:
// src/ui/app.js (línea 174, `setTimeout(() => responder({ resultado }), 1600)`). Mismo aviso de espejo.
export const ESPERA_MINIJUEGO_MS = 1600;

const MS_POR_MINUTO = 1000 * 60;

// Máximo de carreras para el cálculo de varianza explicada por ablación.
export const MAX_CORRIDAS_ABLACION = 200;

// Remuestreos del bootstrap por carrera para el error estándar de `varianzaExplicada`, y su semilla
// (determinista: el azar sale siempre de `mulberry32`, ni siquiera las sondas usan el generador nativo).
export const REMUESTREOS_BOOTSTRAP = 200;
export const SEMILLA_BOOTSTRAP = 7777;

// Muestra mínima para devolver un coeficiente (Pearson, OLS) o una probabilidad condicional: con menos
// de 30 pares, el número es puro ruido de muestra.
export const MUESTRA_MINIMA = 30;

// Si con el ruido de resultados en CERO nivel + equipo explican menos que esto de la posición, `ruidoPuro`
// no sirve como medida: el nivel ya no era lo que el ruido escondía. Ver `bloqueVarianza`.
export const UMBRAL_R2_ESTRUCTURAL = 0.3;

// `mentalidad` y `hype` "saturados": K.3c mira el % de splits pro con el valor en el techo (>= 90).
export const UMBRAL_SATURACION = 90;

// Metas de ritmo de K.3c: "<= 2 interrupciones por split pro; <= 4 en playoffs o internacional".
export const UMBRAL_INTERRUPCIONES_SPLIT = 2;
export const UMBRAL_INTERRUPCIONES_SPLIT_LARGO = 4;

// Carrera pro "corta" para K.3b: menos de 4 años.
export const UMBRAL_CARRERA_CORTA_ANIOS = 4;

// Δ de fuerza (el equipo más fuerte contra el más débil) para la tabla analítica de favorito Bo5.
export const DELTAS_FAVORITO_BO5 = [0, 2, 4, 6, 8, 10, 12, 15];

// Mejor de 5: gana el primero en llevarse este número de mapas.
const MAPAS_PARA_GANAR_BO5 = 3;

// K1 (bloque `puntaje`): los percentiles de la distribución del puntaje que se reportan por estrategia, rol y
// región; los de la tabla fina con la que se escribe `BALANCE.puntaje.cuantiles`; y la tolerancia de la regla de
// `pesoRol` (PLAN.md "K1 — decisiones de spec", corregida en "lo que cambió la revisión de K1-A": compensar un
// rol solo si su mediana ENTRE LOS QUE LLEGARON A PRO se aparta más de ±10% de la de todos los pros, con
// `criterio` y ≥ 800 seeds; la distribución completa es bimodal, con los no-pros cerca de 0).
export const PERCENTILES_PUNTAJE = [0.1, 0.25, 0.5, 0.75, 0.9, 0.99];
export const PERCENTILES_CUANTILES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 97, 99];
export const UMBRAL_DESVIO_ROL_PCT = 10;

// Cero numérico del determinante de la regresión de 2 regresores (`regresionLineal2Regresores`): por debajo de
// esto el nivel del jugador y el de sus compañeros son colineales y el R² conjunto no está definido (se
// devuelve `null`). Medido en 40 carreras de `equilibrado` x 60 splits (seeds 1-40): el determinante vale
// 1,8e10 con los 1.532 splits con tabla y 5,9e6 con solo 30 filas, así que 1e-12 atrapa la colinealidad
// exacta (x2 = a*x1 + b) y no una correlación alta.
export const EPSILON_DETERMINANTE = 1e-12;

// Los tres tipos de split pro que distingue `ritmo` (ver `clasificarSplit`).
export const TIPOS_DE_SPLIT = ['regular', 'playoffs', 'internacional'];

// Los cinco ruidos de resultados que apaga la ablación de `varianzaExplicada`: [grupo de BALANCE, clave].
// Exportado para que `validate.js` pueda fotografiarlos ANTES de cualquier corrida y comprobar que la
// ablación los apaga adentro de su ventana y los restaura después.
export const PARAMETROS_RUIDO = [
  ['rendimiento', 'ruidoRendimiento'],
  ['temporada', 'ruidoFecha'],
  ['temporada', 'ruidoRivalFecha'],
  ['serie', 'ruidoMapa'],
  ['serie', 'ruidoRivalSerie']
];

// Cuántos beats cuenta el reproductor para un lote de logs nuevos (`agruparBeats`, src/ui/components/feed.js):
// un beat por log no técnico, más uno extra si el lote ARRANCA con líneas técnicas (esas no tienen una
// narrativa a la que pegarse y forman su propio beat). `validate.js` comprueba que esto coincide con
// `agruparBeats(lote).length` sobre lotes reales — así no hace falta importar la UI en una sonda del motor.
export function contarBeats(lote) {
  let beats = 0;
  for (const log of lote) {
    if (!log.tecnico) {
      beats += 1;
    }
  }
  return lote.length > 0 && lote[0].tecnico ? beats + 1 : beats;
}

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
//
// Fase K0 (PLAN.md §K.5): `observacion` es lo que el instrumento de K agrega, siempre por lectura pura del
// `state` (nunca consume `rng` ni cambia una respuesta): una fila por split pro con los regresores del
// nivel y la posición (`splitsProData`), las interrupciones de cada split pro con su tipo
// (`splitsProRitmo`), los beats del reproductor y los minijuegos, y las temporadas como #1 del mundo.
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

  // Métricas del instrumento de Fase K0.
  const observacion = {
    seed,
    decisionesPorTipo: {},
    minijuegosCount: 0,
    splitsProRitmo: [],
    splitsProData: [],
    temporadasNumero1: 0,
    beatsReproductor: 0
  };

  let decisionesEnSplitActual = 0;

  // Los logs que el reproductor muestra en una tanda: lo que el motor emite entre dos pausas (la que
  // abre `avanzarSplit` hasta la primera decisión, y cada `resolverDecision` hasta la próxima decisión o
  // el final del split). Cada tanda se agrupa en beats por separado, como hace `reproducirBeats`.
  let logsContados = state.logs.length;
  function contarTanda(st) {
    observacion.beatsReproductor += contarBeats(st.logs.slice(logsContados));
    logsContados = st.logs.length;
  }

  // Envuelve la estrategia real (o `resolverAuto` si `responder` es null,
  // el mismo default que ya usa `avanzarSplitAuto`) sin cambiar una sola
  // respuesta: solo mira la decisión de pasada antes de contestarla, así
  // el comportamiento y el consumo de `rng` quedan idénticos a hoy.
  const responderInstrumentado = (sistema, st, decision, rngLocal) => {
    marcarSeriesCerradas(st);
    contarTanda(st);
    jugabilidad.decisiones += 1;
    decisionesEnSplitActual += 1;

    const tipo = `${sistema.id}:${decision.datos?.motivo ?? decision.presentacion ?? 'x'}`;
    observacion.decisionesPorTipo[tipo] = (observacion.decisionesPorTipo[tipo] ?? 0) + 1;

    if (esDecisionDeMinijuego(decision)) {
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

    const registroAntes = state.career.registro;
    state = avanzarSplitAuto(state, rng, responderInstrumentado).state;
    marcarSeriesCerradas(state);
    contarTanda(state);

    if (state.phase !== 'profesional') {
      continue;
    }
    carrera.splitsPro += 1;
    observacion.splitsProRitmo.push({
      decisiones: decisionesEnSplitActual,
      tipo: clasificarSplit(registroAntes, state.career.registro)
    });

    // Registro de split pro para K0 (economía y nivel).
    const { media: mediaLiga, modelada: ligaModelada } = nivelMedioDeLiga(state);
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
      nivelRelativoCompaneros: companerosNivel - mediaLiga,
      // false = la liga no está en `mundo.ligas` (los splits de tier 3): la "media de la liga" es la
      // constante `nivelLigaPorDefecto`, no un dato. Ver `bloquePosicion`.
      ligaModelada
    });

    // "#1 del mundo en una temporada" = estar #1 al cierre de la edad, que es cuando el juego revela el Top 20.
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
  }

  // K1 (D75): "llegó a tier N" = jugó al menos un split con contrato en tier N (`splitsPorTier[N] > 0` en alguna
  // fila del registro), la misma definición que usan el puntaje y el veredicto. Antes se tomaba el menor
  // `career.tier` visto después de cada split pro, y eso contaba el "agente libre de tier 2" que sigue a un salto
  // desde tier 3 sin haber fichado nunca en tier 2. El tier es 1 arriba y 3 abajo: el máximo es el MENOR número.
  carrera.tierMaximo = tierMasAltoJugado(state.career.registro);

  // Varada: profesional, sin org y sin tier. Ningún sistema la puede rescatar
  // —`competitivo` se guarda detrás del tier, `mercado` detrás de la liga—,
  // así que no es "estar libre": es no tener juego.
  carrera.varada = state.phase === 'profesional' && !state.career.currentOrg && state.career.tier === null;

  jugabilidad.poolMainMuerto = state.flags.eventosVistos?.pool_main_muerto ?? 0;
  jugabilidad.maestriaMinimaPool = state.player.championPool.length > 0
    ? Math.min(...state.player.championPool.map((campeon) => campeon.mastery))
    : null;

  // `tiempoMaquinaMin`, definición LITERAL de la spec de K0-A: cada log no técnico del `state.logs` final
  // × 700 ms. Es una cota inferior barata, no lo que tarda de verdad el reproductor: ignora el beat extra
  // de las tandas que arrancan con líneas técnicas, los 1.600 ms de espera tras cada minijuego, y cuenta
  // los logs del arranque de la carrera, que el reproductor no reproduce.
  const logsNoTecnicos = state.logs.filter((log) => !log.tecnico).length;
  observacion.tiempoMaquinaMin = (logsNoTecnicos * DURACION_BEAT_MS) / MS_POR_MINUTO;

  // `tiempoReproductorMin`: lo que mide el reproductor — los beats reales de cada tanda (`contarBeats`) ×
  // 700 ms, más 1.600 ms por cada minijuego jugado. Tampoco es lo que tarda una persona: no incluye leer
  // y decidir. NO es comparable con los 17,4 min de AUDITORIA.md, que salieron de un Chromium real
  // (`play.mjs`: esperas de 120 ms por decisión, 1.800 ms por minijuego, la interacción del bot adentro del
  // minijuego y la latencia de Playwright) — esos tiempos no están acá.
  observacion.tiempoReproductorMin = (
    observacion.beatsReproductor * DURACION_BEAT_MS + observacion.minijuegosCount * ESPERA_MINIJUEGO_MS
  ) / MS_POR_MINUTO;

  return { state, carrera, jugabilidad, observacion };
}

// Qué clase de split pro fue, según los contadores del `registro` (el motor no tiene un estado de split
// "playoffs" ni "internacional": se distinguen por lo que crece al avanzar): si creció la lista de
// internacionales fue un split internacional; si no, pero crecieron las series (`seriesGanadas +
// seriesPerdidas`, que solo cuentan series de bracket), fue de playoffs; si no, es un split regular.
export function clasificarSplit(registroAntes, registroDespues) {
  if (registroDespues.internacionales.length > registroAntes.internacionales.length) {
    return 'internacional';
  }
  const seriesAntes = registroAntes.seriesGanadas + registroAntes.seriesPerdidas;
  const seriesDespues = registroDespues.seriesGanadas + registroDespues.seriesPerdidas;
  return seriesDespues > seriesAntes ? 'playoffs' : 'regular';
}

// Media de nivel de los jugadores de la liga actual del jugador, y si ese dato es REAL: `modelada` es false
// cuando la liga no está en `mundo.ligas` (los splits de tier 3 hoy) o no tiene plantel, y entonces `media`
// es la constante `BALANCE.mercado.nivelLigaPorDefecto`, que no sirve para centrar nada.
export function nivelMedioDeLiga(state) {
  const orgActual = state.career.currentOrg;
  const ligaId = state.career.liga;
  const ligas = state.mundo.ligas ?? [];
  const liga = ligas.find((l) => l.id === ligaId)
    ?? ligas.find((l) => l.orgs?.some((o) => o.nombre === orgActual));

  if (!liga) {
    return { media: BALANCE.mercado.nivelLigaPorDefecto, modelada: false };
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
    return { media: niveles.reduce((s, v) => s + v, 0) / niveles.length, modelada: true };
  }

  return { media: BALANCE.mercado.nivelLigaPorDefecto, modelada: false };
}

// Fase K0 (PLAN.md §K.3a): cálculo analítico cerrado de Bo5 para Δ de fuerza.
// Nota: K2 va a reemplazar estos sigmas fijos por `ruidoEfectivo(state)`.
// El 80% objetivo de K.3a es para Δ ≈ 10.
//
// Lo que esta tabla dice HOY (σ combinado = √(7² + 12²) ≈ 13,9): la aproximación logística de
// `probabilidadDeGanar` sobreestima ~1 pp contra Monte Carlo (Bo5, 400.000 series por Δ: Δ=10 da 0,9192
// contra 0,9109; Δ=4 da 0,7167 contra 0,7045) — es lo que pide la spec (usar `probabilidadDeGanar`), así
// que se deja. Con Δ=10 el favorito ya gana ~92% de una Bo5: lo que no cumple K.3a es la distribución de
// Δ entre equipos y el peso del nivel, no el σ del mapa. Para llevar la Bo5 a 80% con Δ=10 haría falta un
// σ combinado de ≈ 22 (22,3 con la normal exacta, 23,5 con la logística del motor; hoy 13,9), lo que
// chocaría de frente con `ruidoPuro <= 25%`.
export function calcularFavoritoBo5(
  deltas = DELTAS_FAVORITO_BO5,
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
    const pSerieBo5 = (pMapa ** MAPAS_PARA_GANAR_BO5) * (1 + 3 * q + 6 * (q ** 2));
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
// Y = b0 + b1*X1 + b2*X2. Devuelve los R² SIN redondear (el reporte redondea): `null` con menos de
// `MUESTRA_MINIMA` filas, o si los dos regresores son colineales.
export function regresionLineal2Regresores(ys, xs1, xs2) {
  const n = ys.length;
  if (n < MUESTRA_MINIMA) {
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

  const acotar = (r2) => Math.max(0, Math.min(1, r2));
  const det = s11 * s22 - s12 * s12;
  let r2NivelYEquipo = null;
  if (Math.abs(det) > EPSILON_DETERMINANTE) {
    const b1 = (s22 * s1y - s12 * s2y) / det;
    const b2 = (s11 * s2y - s12 * s1y) / det;
    const ssreg = b1 * s1y + b2 * s2y;
    r2NivelYEquipo = acotar(ssreg / sstot);
  }

  const r2SoloNivel = s11 > 0 ? acotar((s1y * s1y) / (s11 * sstot)) : null;
  const r2SoloEquipo = s22 > 0 ? acotar((s2y * s2y) / (s22 * sstot)) : null;

  return { r2NivelYEquipo, r2SoloNivel, r2SoloEquipo };
}

// Corre las carreras de `semillas` con el ruido de resultados APAGADO — por overrides de `BALANCE` en
// el proceso de la sonda, siempre restaurados en un `try/finally`: `validate.js` importa `correrLote` en el
// mismo proceso, y un `BALANCE` que se queda en 0 le rompería todo lo que corre después. Devuelve, por
// carrera, sus filas de `splitsProData`, y cuántas carreras reventaron (un crash adentro de la ablación
// no tira el lote: se cuenta). Usa `correrCarrera`, o sea las MISMAS definiciones de posición y regresores
// que el lote normal.
export function correrSinRuido(semillas, splits, responder) {
  const originales = PARAMETROS_RUIDO.map(([grupo, clave]) => BALANCE[grupo][clave]);
  const filasPorCarrera = [];
  let crashes = 0;

  try {
    for (const [grupo, clave] of PARAMETROS_RUIDO) {
      BALANCE[grupo][clave] = 0;
    }
    for (const seed of semillas) {
      try {
        filasPorCarrera.push(correrCarrera(seed, splits, responder).observacion.splitsProData);
      } catch {
        crashes += 1;
      }
    }
  } finally {
    PARAMETROS_RUIDO.forEach(([grupo, clave], i) => {
      BALANCE[grupo][clave] = originales[i];
    });
  }

  return { filasPorCarrera, crashes };
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

// Helpers estadísticos: se exportan para que `agencia.js` los reuse en vez de tener su propia copia.
export function promedio(valores) {
  return valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
}

export function mediana(valores) {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0 ? (ordenados[medio - 1] + ordenados[medio]) / 2 : ordenados[medio];
}

// La mediana "de abajo" (con n par, el elemento central inferior en vez del promedio de los dos). Es la
// que usaba el análisis de AUDITORIA.md §4.3 (Apéndice A, `analisis.mjs`): `agencia.js` la conserva para
// que su tabla siga siendo comparable con la de la auditoría.
export function medianaInferior(valores) {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor((ordenados.length - 1) / 2)];
}

// Percentil "por piso": con los valores ordenados de menor a mayor, el de la posición min(n - 1, floor(p * n)).
// No interpola (devuelve siempre un valor que está en la lista) y con n par el p50 es el central SUPERIOR; por eso
// la mediana de los reportes (`mediana`) es otra función. `validate.js` recuenta los KPIs con esta misma definición.
export function percentil(valores, p) {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.floor(p * ordenados.length));
  return ordenados[indice];
}

// Desvío estándar muestral (n - 1). `0` con menos de 2 valores.
export function desvioMuestral(valores) {
  if (valores.length < 2) return 0;
  const m = promedio(valores);
  return Math.sqrt(valores.reduce((s, x) => s + (x - m) ** 2, 0) / (valores.length - 1));
}

// Mismo cálculo que `pearson9Mi` de `validate.js` (fase 9Mi): coeficiente de
// Pearson simple, sin librería. `null` con menos de 30 pares — con menos, el
// coeficiente es puro ruido de muestra.
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < MUESTRA_MINIMA) return null;
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

// Redondeo para el PUNTO DE REPORTE (las funciones de arriba devuelven el número crudo).
function redondear(valor, decimales) {
  return valor === null || valor === undefined ? null : Number(valor.toFixed(decimales));
}

// Porcentaje con un decimal; `null` si no hay base (nunca un NaN en el reporte).
function pct(parte, total) {
  return total > 0 ? Number(((parte / total) * 100).toFixed(1)) : null;
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

// ---------------------------------------------------------------------------
// Bloques del reporte de `correrLote`. Cada uno recibe listas paralelas por carrera (`resultados` =
// estados finales, `carreras`, `observaciones`) para poder aplicarse tanto al lote entero como a un
// subconjunto (`porRegion` reusa estas mismas funciones: nada de una segunda copia del cálculo que se
// desincronice en silencio).
// ---------------------------------------------------------------------------

// Cuántos internacionales con resultado 'buen_papel' tiene la carrera.
function buenPapelDe(estado) {
  return estado.career.registro.internacionales.filter((intl) => intl.resultado === 'buen_papel').length;
}

// Notas de lo que los KPIs de "Mundial" miden DE VERDAD antes de K5 (el torneo mundial no existe todavía).
const NOTAS_PROXY = {
  ganaMundial: {
    proxyAntesDeK5: true,
    nota: 'Mide haber tenido AL MENOS UN internacional con resultado buen_papel (una serie internacional ganada o una tirada de rendiBien), no un Mundial ganado.'
  },
  nuevoFaker: {
    proxyAntesDeK5: true,
    nota: 'Casi todo sale de ">= 2 buen_papel" (ver buenPapelPorCarrera: son varios por carrera) y casi nada de "#1 del mundo 3 temporadas"; no mide ganar dos Mundiales.'
  },
  pOtroMundialDadoUno: {
    proxyAntesDeK5: true,
    nota: 'P(>= 2 buen_papel | >= 1) es estructural, porque buen_papel se reparte varias veces por carrera; no es la probabilidad de repetir un Mundial.'
  }
};

// §K.3b — el embudo de la carrera, en % del total de carreras.
function bloqueEmbudo(resultados, carreras, observaciones, { conNotas = false } = {}) {
  const total = resultados.length;
  const tierMaximo = (indice) => carreras[indice].tierMaximo;
  const indices = resultados.map((_, indice) => indice);

  const noLlegaAPro = indices.filter((i) => resultados[i].splitFichaje === null).length;
  const llegaAPro = indices.filter((i) => resultados[i].splitFichaje !== null).length;
  // Llegó a pro y nunca a tier 1 (`tierMaximo >= 2`). Los pros que no jugaron NINGÚN split con contrato
  // (`tierMaximo === null`, D75) no son "estancados en T2/T3": se cuentan aparte.
  const estancadoT2T3 = indices.filter((i) => resultados[i].splitFichaje !== null && tierMaximo(i) !== null && tierMaximo(i) >= 2).length;
  const proSinTierNunca = indices.filter((i) => resultados[i].splitFichaje !== null && tierMaximo(i) === null).length;
  const llegaATier1 = indices.filter((i) => tierMaximo(i) === 1).length;

  // En el motor actual, registro.titulos acumula campeonatos domésticos de liga (systems/rendimiento.js, systems/serie.js).
  // Los torneos internacionales se registran por separado en registro.internacionales.
  const ganaTituloDomestico = resultados.filter((r) => r.career.registro.titulos.length >= 1).length;
  const top20 = resultados.filter((r) => (r.career.registro.picos.rankMundial ?? 0) > 0).length;
  const numeroUnoAlgunaVez = resultados.filter((r) => r.career.registro.picos.rankMundial === 1).length;

  // Proxy de Mundial antes de K5: haber participado de un torneo internacional con resultado === 'buen_papel'.
  const buenPapel = resultados.map(buenPapelDe);
  const conAlMenosUno = buenPapel.filter((n) => n >= 1).length;
  const conDosOMas = buenPapel.filter((n) => n >= 2).length;

  const temporadasComoNumeroUno = observaciones.map((o) => o.temporadasNumero1);
  // nuevoFaker = >= 2 mundiales (proxy) o #1 del mundo en >= 3 temporadas.
  const nuevoFaker = indices.filter((i) => buenPapel[i] >= 2 || temporadasComoNumeroUno[i] >= 3).length;
  const numeroUno3Temporadas = temporadasComoNumeroUno.filter((n) => n >= 3).length;

  const embudo = {
    noLlegaAPro: pct(noLlegaAPro, total),
    llegaAPro: pct(llegaAPro, total),
    estancadoT2T3: pct(estancadoT2T3, total),
    proSinTierNunca: pct(proSinTierNunca, total),
    llegaATier1: pct(llegaATier1, total),
    ganaTituloDomestico: pct(ganaTituloDomestico, total),
    top20: pct(top20, total),
    top20DeTier1: llegaATier1 > 0 ? pct(top20, llegaATier1) : 0,
    numeroUnoAlgunaVez: pct(numeroUnoAlgunaVez, total),
    numeroUnoDelMundo3Temporadas: pct(numeroUno3Temporadas, total),
    ganaMundial: pct(conAlMenosUno, total),
    proxyAntesDeK5: true,
    nuevoFaker: pct(nuevoFaker, total),
    pOtroMundialDadoUno: conAlMenosUno >= MUESTRA_MINIMA ? redondear(conDosOMas / conAlMenosUno, 3) : null,
    pOtroMundialN: conAlMenosUno,
    buenPapelPorCarrera: {
      media: redondear(promedio(buenPapel), 2),
      mediana: mediana(buenPapel)
    }
  };
  if (conNotas) {
    embudo.proxies = NOTAS_PROXY;
  }
  return embudo;
}

// §K.3a — correlación nivel/posición. `rNivelPosicionMismaLiga` centra el nivel del jugador por la media de
// SU liga, pero los splits cuya liga no está modelada (tier 3: no está en `mundo.ligas`) usan una constante
// como "nivel de la liga": ahí no hay centración real, así que se EXCLUYEN (y se cuenta cuántos). El
// `rNivelPosicionBruto` (sin centrar) va sobre todos, para continuidad con la auditoría (valía 0,05).
function bloquePosicion(observaciones) {
  const conTabla = observaciones.flatMap((o) => o.splitsProData).filter((d) => d.posNorm !== null);
  const modelados = conTabla.filter((d) => d.ligaModelada);
  return {
    rNivelPosicionMismaLiga: redondear(pearson(
      modelados.map((d) => d.nivelRelativoJugador),
      modelados.map((d) => d.posNorm)
    ), 3),
    rNivelPosicionBruto: redondear(pearson(
      conTabla.map((d) => d.nivel),
      conTabla.map((d) => d.posNorm)
    ), 3),
    splitsConTabla: conTabla.length,
    splitsExcluidosLigaNoModelada: conTabla.length - modelados.length
  };
}

function remuestrear(filasPorCarrera, rng) {
  const remuestra = [];
  for (let i = 0; i < filasPorCarrera.length; i += 1) {
    remuestra.push(filasPorCarrera[Math.floor(rng() * filasPorCarrera.length)]);
  }
  return remuestra.flat();
}

// Estadísticos de la ablación sobre un conjunto de filas planas.
function estadisticosDeVarianza(filas) {
  const { r2NivelYEquipo, r2SoloNivel, r2SoloEquipo } = regresionLineal2Regresores(
    filas.map((d) => d.posNorm),
    filas.map((d) => d.nivelRelativoJugador),
    filas.map((d) => d.nivelRelativoCompaneros)
  );
  return { varianza: varianza(filas.map((d) => d.posNorm)), r2NivelYEquipo, r2SoloNivel, r2SoloEquipo };
}

// §K.3a — varianza explicada por ablación, sobre las primeras `corridasAblacion = min(corridas, 200)`
// carreras del lote (mismas seeds en la corrida normal y en la de ruido apagado).
//  - `r2NivelYEquipo`: R² de la posición normalizada contra [nivel relativo del jugador, nivel relativo de
//    los compañeros], en el lote normal. `r2NivelYEquipoSinRuido`: el mismo R² con el ruido de resultados
//    en cero, o sea el TECHO ESTRUCTURAL: cuánto podrían explicar nivel + equipo si el ruido no existiera.
//  - `ruidoPuro = 1 - Var(Y_sinRuido) / Var(Y_base)`, con su error estándar (bootstrap por carrera).
//
// Conclusión medida (K0-A, 200 carreras x 60 splits): con ruido cero, nivel + equipo explican ~5-10% de la
// posición (R² sin ruido de 0,07 con `equilibrado` y 0,10 con `criterio`, sobre todos los splits con
// tabla); K2 tiene que reestructurar cómo el nivel entra a la tabla, no solo bajar σ. Por eso `ruidoPuro`
// NO sirve de gate cuando
// `r2NivelYEquipoSinRuido` < `UMBRAL_R2_ESTRUCTURAL`: la tabla determinista ya no depende de esos
// regresores, así que sacar el ruido no deja ver al nivel (el EE es de 0,04-0,06 y el valor crudo puede dar
// negativo con `ranked`; el gate `<= 0,25` "se cumplía" con un R² de 0,06). En ese caso `ruidoPuro` es
// `null` y el número crudo viaja en `ruidoPuroCrudo`.
//
// Ojo, la ablación no es "ruido puro": con σ=0, `probabilidadDeGanar` devuelve 0, 0,5 o 1, y eso también
// cambia los frenos de draft y de minijuego (que deciden con esa probabilidad), no solo los resultados.
//
// `soloLigaModelada` repite todo sobre los splits cuya liga SÍ está en `mundo.ligas` (sin los de tier 3,
// donde "nivel relativo a la liga" es el nivel menos una constante, no una centración real). El titular
// (`r2NivelYEquipo`) queda sobre todos los splits con tabla —la definición de la spec— y la versión
// centrada de verdad al lado: sin los de tier 3 el R² sin ruido sube a 0,24 (`equilibrado`) y 0,23
// (`criterio`), todavía lejos del 0,5 que pide K2.
function estadisticasDeAblacion(filasBasePorCarrera, filasSinPorCarrera) {
  const base = estadisticosDeVarianza(filasBasePorCarrera.flat());
  const sin = estadisticosDeVarianza(filasSinPorCarrera.flat());
  const ruidoPuroCrudo = base.varianza > 0 ? 1 - sin.varianza / base.varianza : null;

  // Bootstrap por carrera (remuestreo de carreras enteras, no de splits sueltos: los splits de una carrera
  // están correlacionados), cada lote por separado. Determinista.
  const rng = mulberry32(SEMILLA_BOOTSTRAP);
  const muestras = { ruidoPuro: [], r2Base: [], r2Sin: [] };
  for (let b = 0; b < REMUESTREOS_BOOTSTRAP; b += 1) {
    const remBase = estadisticosDeVarianza(remuestrear(filasBasePorCarrera, rng));
    const remSin = estadisticosDeVarianza(remuestrear(filasSinPorCarrera, rng));
    if (remBase.varianza > 0) {
      muestras.ruidoPuro.push(1 - remSin.varianza / remBase.varianza);
    }
    if (remBase.r2NivelYEquipo !== null) {
      muestras.r2Base.push(remBase.r2NivelYEquipo);
    }
    if (remSin.r2NivelYEquipo !== null) {
      muestras.r2Sin.push(remSin.r2NivelYEquipo);
    }
  }

  return {
    r2NivelYEquipo: base.r2NivelYEquipo,
    r2NivelYEquipoEE: desvioMuestral(muestras.r2Base),
    r2SoloNivel: base.r2SoloNivel,
    r2SoloEquipo: base.r2SoloEquipo,
    r2NivelYEquipoSinRuido: sin.r2NivelYEquipo,
    r2NivelYEquipoSinRuidoEE: desvioMuestral(muestras.r2Sin),
    ruidoPuroCrudo,
    ruidoPuroEE: desvioMuestral(muestras.ruidoPuro),
    varBase: base.varianza,
    varSinRuido: sin.varianza,
    nSplitsBase: filasBasePorCarrera.flat().length,
    nSplitsSinRuido: filasSinPorCarrera.flat().length
  };
}

// ¿`ruidoPuro` es interpretable? Solo si el techo estructural (R² de nivel + equipo con el ruido de resultados
// en cero) llega a `UMBRAL_R2_ESTRUCTURAL`; con `null` (regresores colineales) tampoco. Devuelve
// `{ interpretable, ruidoPuro }`: `ruidoPuro` es el crudo redondeado a 3 decimales, o `null` si no sirve de gate.
// Pura (sin lote ni ablación) para que `validate.js` la pruebe con entradas sintéticas.
export function decidirRuidoPuro(r2NivelYEquipoSinRuido, ruidoPuroCrudo) {
  const interpretable = r2NivelYEquipoSinRuido !== null && r2NivelYEquipoSinRuido >= UMBRAL_R2_ESTRUCTURAL;
  return { interpretable, ruidoPuro: interpretable ? redondear(ruidoPuroCrudo, 3) : null };
}

function bloqueVarianza(observaciones, splits, responder) {
  const corridasAblacion = Math.min(observaciones.length, MAX_CORRIDAS_ABLACION);
  const observacionesBase = observaciones.slice(0, corridasAblacion);
  const conTabla = (filas) => filas.filter((d) => d.posNorm !== null);
  const soloModeladas = (filas) => conTabla(filas).filter((d) => d.ligaModelada);

  const sinRuido = correrSinRuido(observacionesBase.map((o) => o.seed), splits, responder);
  const baseTodas = observacionesBase.map((o) => conTabla(o.splitsProData));
  const sinTodas = sinRuido.filasPorCarrera.map(conTabla);
  const titular = estadisticasDeAblacion(baseTodas, sinTodas);
  const modelada = estadisticasDeAblacion(
    observacionesBase.map((o) => soloModeladas(o.splitsProData)),
    sinRuido.filasPorCarrera.map(soloModeladas)
  );

  const { interpretable, ruidoPuro } = decidirRuidoPuro(titular.r2NivelYEquipoSinRuido, titular.ruidoPuroCrudo);
  const estructuralInsuficiente = !interpretable;
  return {
    r2NivelYEquipo: redondear(titular.r2NivelYEquipo, 3),
    r2NivelYEquipoEE: redondear(titular.r2NivelYEquipoEE, 3),
    r2SoloNivel: redondear(titular.r2SoloNivel, 3),
    r2SoloEquipo: redondear(titular.r2SoloEquipo, 3),
    r2NivelYEquipoSinRuido: redondear(titular.r2NivelYEquipoSinRuido, 3),
    r2NivelYEquipoSinRuidoEE: redondear(titular.r2NivelYEquipoSinRuidoEE, 3),
    ruidoPuro,
    ruidoPuroCrudo: redondear(titular.ruidoPuroCrudo, 3),
    ruidoPuroEE: redondear(titular.ruidoPuroEE, 3),
    umbralR2Estructural: UMBRAL_R2_ESTRUCTURAL,
    nota: estructuralInsuficiente
      ? `ruidoPuro = null: con el ruido de resultados en cero, nivel + equipo explican solo R2 = ${redondear(titular.r2NivelYEquipoSinRuido, 3)} (< ${UMBRAL_R2_ESTRUCTURAL}) de la posición. El ruido no es lo que esconde el nivel: la tabla determinista ya no depende de esos regresores. No sirve de gate; mirar r2NivelYEquipoSinRuido.`
      : 'ruidoPuro es interpretable: el techo estructural (r2NivelYEquipoSinRuido) supera el umbral.',
    varBase: redondear(titular.varBase, 4),
    varSinRuido: redondear(titular.varSinRuido, 4),
    corridasAblacion,
    crashesAblacion: sinRuido.crashes,
    remuestreos: REMUESTREOS_BOOTSTRAP,
    nSplitsBase: titular.nSplitsBase,
    nSplitsSinRuido: titular.nSplitsSinRuido,
    soloLigaModelada: {
      r2NivelYEquipo: redondear(modelada.r2NivelYEquipo, 3),
      r2NivelYEquipoEE: redondear(modelada.r2NivelYEquipoEE, 3),
      r2NivelYEquipoSinRuido: redondear(modelada.r2NivelYEquipoSinRuido, 3),
      r2NivelYEquipoSinRuidoEE: redondear(modelada.r2NivelYEquipoSinRuidoEE, 3),
      ruidoPuroCrudo: redondear(modelada.ruidoPuroCrudo, 3),
      ruidoPuroEE: redondear(modelada.ruidoPuroEE, 3),
      nSplitsBase: modelada.nSplitsBase,
      nSplitsSinRuido: modelada.nSplitsSinRuido
    }
  };
}

// `varianzaExplicada` se calcula la PRIMERA VEZ que se lee (y se recuerda): la ablación vuelve a correr hasta
// 200 carreras, o sea que cuesta tanto como el lote entero, y quien solo mira otros bloques (el check J0 de
// `validate.js` lee `jugabilidad` de 3 lotes de 200 carreras) no tiene por qué pagarlo. Es una propiedad
// enumerable: `JSON.stringify`, `Object.entries` y el spread la evalúan como a cualquier otra.
function bloqueNivel(observaciones, splits, responder) {
  const nivel = { ...bloquePosicion(observaciones), favoritoBo5: calcularFavoritoBo5() };
  let varianzaExplicada = null;
  Object.defineProperty(nivel, 'varianzaExplicada', {
    enumerable: true,
    configurable: true,
    get() {
      varianzaExplicada ??= bloqueVarianza(observaciones, splits, responder);
      return varianzaExplicada;
    }
  });
  return nivel;
}

// §K.3c — economía: distribución de `mentalidad` y `hype` sobre todos los splits pro (el estado después
// de cada split pro) y % de splits saturados.
function bloqueEconomia(observaciones) {
  const splitsPro = observaciones.flatMap((o) => o.splitsProData);
  const distribucion = (valores) => ({
    p10: redondear(percentil(valores, 0.1), 1),
    p25: redondear(percentil(valores, 0.25), 1),
    p50: redondear(percentil(valores, 0.5), 1),
    p75: redondear(percentil(valores, 0.75), 1),
    p90: redondear(percentil(valores, 0.9), 1),
    pctMayorIgual90: pct(valores.filter((v) => v >= UMBRAL_SATURACION).length, valores.length)
  });
  return {
    mentalidad: distribucion(splitsPro.map((d) => d.mentalidad)),
    hype: distribucion(splitsPro.map((d) => d.hype))
  };
}

// §K.3b — longevidad: años de carrera pro de los que llegaron a pro (`BALANCE.edad.splitsPorEdad` splits
// por año), % con carrera corta y % que termina en la línea forzosa.
function bloqueLongevidad(resultados) {
  const llegaronAPro = resultados.filter((r) => r.splitFichaje !== null);
  const aniosPro = llegaronAPro.map((r) => (r.player.splitCount - r.splitFichaje) / BALANCE.edad.splitsPorEdad);
  const forzoso = llegaronAPro.filter((r) => r.age >= BALANCE.retiro.edadRetiroForzoso).length;

  return {
    aniosCarreraPro: {
      mediana: mediana(aniosPro),
      p10: percentil(aniosPro, 0.1),
      p90: percentil(aniosPro, 0.9),
      pctMenosDe4Anios: pct(aniosPro.filter((a) => a < UMBRAL_CARRERA_CORTA_ANIOS).length, aniosPro.length)
    },
    pctTerminaEnLineaForzosa34: llegaronAPro.length > 0 ? pct(forzoso, llegaronAPro.length) : 0,
    desgloseFinAnticipado: porcentajes(
      conteo(llegaronAPro, (r) => r.finAnticipado ?? 'retiro_normal'),
      llegaronAPro.length || 1
    )
  };
}

// Resumen de interrupciones por split pro de un conjunto de splits.
function resumenInterrupciones(valores) {
  return {
    n: valores.length,
    p50: mediana(valores),
    p90: percentil(valores, 0.9),
    max: valores.length > 0 ? Math.max(...valores) : null,
    pctMasDe2: pct(valores.filter((d) => d > UMBRAL_INTERRUPCIONES_SPLIT).length, valores.length),
    pctMasDe4: pct(valores.filter((d) => d > UMBRAL_INTERRUPCIONES_SPLIT_LARGO).length, valores.length)
  };
}

// §K.3c — el ritmo: cuántas veces te frena el juego.
function bloqueRitmo(observaciones) {
  const total = observaciones.length;
  const sumar = (mapa) => Object.values(mapa).reduce((a, b) => a + b, 0);
  const decisionesPorCarrera = observaciones.map((o) => sumar(o.decisionesPorTipo));
  const splitsPro = observaciones.flatMap((o) => o.splitsProRitmo);
  const minijuegosPorCarrera = observaciones.map((o) => o.minijuegosCount);
  const tiemposMaquinaMin = observaciones.map((o) => o.tiempoMaquinaMin);
  const tiemposReproductorMin = observaciones.map((o) => o.tiempoReproductorMin);

  const decisionesPorTipoAcum = {};
  for (const o of observaciones) {
    for (const [k, v] of Object.entries(o.decisionesPorTipo)) {
      decisionesPorTipoAcum[k] = (decisionesPorTipoAcum[k] ?? 0) + v;
    }
  }
  const totalDecisionesTodas = sumar(decisionesPorTipoAcum);

  const porTipoDeSplit = {};
  for (const tipo of TIPOS_DE_SPLIT) {
    porTipoDeSplit[tipo] = resumenInterrupciones(splitsPro.filter((s) => s.tipo === tipo).map((s) => s.decisiones));
  }

  const estadisticasCarrera = estadisticas(decisionesPorCarrera);
  const enMinutos = (valores) => ({
    mediana: redondear(mediana(valores), 2),
    p90: redondear(percentil(valores, 0.9), 2)
  });

  return {
    interrupcionesPorCarrera: {
      min: estadisticasCarrera.min,
      max: estadisticasCarrera.max,
      promedio: estadisticasCarrera.promedio,
      mediana: mediana(decisionesPorCarrera),
      p90: percentil(decisionesPorCarrera, 0.9)
    },
    // `todos` junta los splits pro; los otros tres los separan por tipo (`clasificarSplit`). Metas de K.3c:
    // <= 2 por split pro y <= 4 en playoffs o internacional.
    interrupcionesPorSplitPro: {
      todos: resumenInterrupciones(splitsPro.map((s) => s.decisiones)),
      ...porTipoDeSplit
    },
    desglosePorTipo: Object.entries(decisionesPorTipoAcum)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, cant]) => ({
        tipo,
        cantidadPorCarrera: redondear(cant / total, 1),
        pctDelTotal: pct(cant, totalDecisionesTodas) ?? 0
      })),
    minijuegosPorCarrera: {
      promedio: redondear(promedio(minijuegosPorCarrera), 2),
      mediana: mediana(minijuegosPorCarrera)
    },
    // Cada log no técnico del estado final × 700 ms (`DURACION_BEAT_MS`, src/ui/reproductor.js). Es la
    // definición literal de la spec de K0-A y una cota inferior: ver `correrCarrera`.
    tiempoMaquinaMin: enMinutos(tiemposMaquinaMin),
    // Beats reales del reproductor × 700 ms + 1.600 ms por minijuego (`ESPERA_MINIJUEGO_MS`, src/ui/app.js).
    // NO es comparable con los 17,4 min de AUDITORIA.md (salieron de un Chromium real): ver `correrCarrera`.
    tiempoReproductorMin: enMinutos(tiemposReproductorMin)
  };
}

// `porRegion` (`state.mundo.regionOrigen`): los mismos bloques de arriba aplicados al subconjunto de
// carreras de cada región — como mínimo `embudo`, `longevidad`, la correlación nivel/posición y las
// medianas de `ritmo`.
function bloquePorRegion(resultados, carreras, observaciones) {
  const indicesPorRegion = {};
  resultados.forEach((r, idx) => {
    const region = r.mundo.regionOrigen ?? 'Desconocida';
    indicesPorRegion[region] = indicesPorRegion[region] ?? [];
    indicesPorRegion[region].push(idx);
  });

  const porRegion = {};
  for (const [region, indices] of Object.entries(indicesPorRegion)) {
    const resRegion = indices.map((i) => resultados[i]);
    const carRegion = indices.map((i) => carreras[i]);
    const obsRegion = indices.map((i) => observaciones[i]);
    const ritmo = bloqueRitmo(obsRegion);

    porRegion[region] = {
      totalCarreras: indices.length,
      embudo: bloqueEmbudo(resRegion, carRegion, obsRegion),
      longevidad: bloqueLongevidad(resRegion),
      nivel: bloquePosicion(obsRegion),
      ritmo: {
        interrupcionesPorCarreraMediana: ritmo.interrupcionesPorCarrera.mediana,
        interrupcionesPorSplitProMediana: ritmo.interrupcionesPorSplitPro.todos.p50,
        minijuegosPorCarreraMediana: ritmo.minijuegosPorCarrera.mediana,
        tiempoMaquinaMinMediana: ritmo.tiempoMaquinaMin.mediana,
        tiempoReproductorMinMediana: ritmo.tiempoReproductorMin.mediana
      }
    };
  }
  return porRegion;
}

// K1 (PLAN.md §K1, "decisiones de spec") — el puntaje de carrera (`core/puntaje.js`) del lote: su distribución en
// total, por rol y por región de origen, el % de carreras en cada nivel con nombre (los niveles se ganan con
// hechos, no con puntos), lo que aporta cada componente, y los cuantiles finos con los que se arma
// `BALANCE.puntaje.cuantiles`. Se mide sobre el estado final de cada carrera (terminada o no: `puntajeDeCarrera`
// es puro y no necesita la tarjeta). Con `criterio`, 400 seeds y 60 splits fija los `cuantiles` provisorios;
// K5c los re-mide. "Llegó a pro" = no es "El que no llegó" (jugó al menos un split con contrato).
function distribucionDePuntaje(totales) {
  const fila = { n: totales.length };
  for (const p of PERCENTILES_PUNTAJE) {
    fila[`p${Math.round(p * 100)}`] = percentil(totales, p);
  }
  fila.promedio = redondear(promedio(totales), 1);
  return fila;
}

function porGrupoDePuntaje(resultados, totales, grupoDe) {
  const grupos = {};
  resultados.forEach((estado, i) => {
    const grupo = grupoDe(estado);
    grupos[grupo] = grupos[grupo] ?? [];
    grupos[grupo].push(totales[i]);
  });
  return grupos;
}

export function bloquePuntaje(resultados) {
  const puntajes = resultados.map((estado) => puntajeDeCarrera(estado));
  const totales = puntajes.map((p) => p.total);
  const total = totales.length;
  const medianaGeneral = mediana(totales);
  const esPro = puntajes.map((p) => p.nivel.id !== 'no_llego');
  const totalesPro = totales.filter((_, i) => esPro[i]);
  const medianaPro = totalesPro.length > 0 ? mediana(totalesPro) : 0;

  // Por rol, con el desvío de su mediana ENTRE LOS PROS contra la de todos los pros: la regla de
  // `BALANCE.puntaje.pesoRol` es compensar solo si un rol se aparta más de ±UMBRAL_DESVIO_ROL_PCT.
  const porRol = {};
  for (const [rol, valores] of Object.entries(porGrupoDePuntaje(resultados, totales, (st) => st.player.role))) {
    const prosDelRol = totales.filter((_, i) => esPro[i] && resultados[i].player.role === rol);
    const medianaRolPro = prosDelRol.length > 0 ? mediana(prosDelRol) : 0;
    porRol[rol] = {
      ...distribucionDePuntaje(valores),
      mediana: mediana(valores),
      nPros: prosDelRol.length,
      medianaPros: medianaRolPro,
      desvioMedianaPct: medianaPro > 0 && prosDelRol.length > 0 ? redondear((medianaRolPro / medianaPro - 1) * 100, 1) : 0,
      fueraDeTolerancia: medianaPro > 0 && prosDelRol.length > 0 && Math.abs(medianaRolPro / medianaPro - 1) * 100 > UMBRAL_DESVIO_ROL_PCT
    };
  }

  const porRegion = {};
  for (const [region, valores] of Object.entries(porGrupoDePuntaje(resultados, totales, (st) => st.mundo.regionOrigen ?? 'Desconocida'))) {
    porRegion[region] = distribucionDePuntaje(valores);
  }

  const porNivel = {};
  for (const { id } of NIVELES) {
    porNivel[id] = pct(puntajes.filter((p) => p.nivel.id === id).length, total);
  }

  const promedioPorComponente = {};
  for (const { id } of puntajes[0]?.componentes ?? []) {
    promedioPorComponente[id] = redondear(promedio(puntajes.map((p) => p.componentes.find((c) => c.id === id).puntos)), 1);
  }

  return {
    total: { ...distribucionDePuntaje(totales), mediana: medianaGeneral, nPros: totalesPro.length, medianaPros: medianaPro },
    porRol,
    porRegion,
    porNivel,
    promedioPorComponente,
    // [percentil, puntaje] con la misma definición de `percentil` (por piso): el formato de `BALANCE.puntaje.cuantiles`.
    cuantiles: PERCENTILES_CUANTILES.map((p) => [p, percentil(totales, p / 100)]),
    carrerasTerminadas: pct(resultados.filter((st) => st.terminado).length, total)
  };
}

// El bloque `carrera` del reporte (ver el comentario en `correrLote`).
function bloqueCarrera(carreras, total) {
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
}

// El bloque `jugabilidad` del reporte (ver el comentario en `correrLote`).
function bloqueJugabilidad(jugabilidades) {
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

  const reporte = {
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
    carrera: bloqueCarrera(carreras, total),
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
    jugabilidad: bloqueJugabilidad(jugabilidades),

    // Nuevos bloques instrumentados de la Fase K0
    embudo: bloqueEmbudo(resultados, carreras, observaciones, { conNotas: true }),
    nivel: bloqueNivel(observaciones, splits, responder),
    economia: bloqueEconomia(observaciones),
    longevidad: bloqueLongevidad(resultados),
    ritmo: bloqueRitmo(observaciones),
    porRegion: bloquePorRegion(resultados, carreras, observaciones),
    // K1: el número de la carrera (`core/puntaje.js`), su distribución y los niveles.
    puntaje: bloquePuntaje(resultados)
  };
  // Los datos crudos de las carreras del lote (estados finales y observaciones, en el orden de las seeds 1..n),
  // para que `validate.js` recuente los KPIs desde ellos sin simular de nuevo. NO enumerable: no sale en el
  // JSON del reporte, ni en `Object.entries`, ni en el spread.
  Object.defineProperty(reporte, 'crudos', {
    value: { resultados, carreras, jugabilidades, observaciones },
    enumerable: false
  });
  return reporte;
}

// Fase J0 (AUDITORIA.md AUD-2): guardado detrás de `import.meta.url` para
// que `validate.js` pueda importar `correrLote`/`analizarCatalogo` en
// proceso (mismo criterio que `estrategias.js`) sin que el sólo hecho de
// importar dispare una corrida completa por `process.argv`.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // Posicionales: corridas, splits, estrategia. K1: `--bloque=<nombre>` imprime solo ese bloque de cada lote (por
  // ejemplo `--bloque=puntaje`), con la estrategia y el tamaño al lado; sin él, el reporte entero de siempre.
  const posicionales = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const bloque = process.argv.slice(2).find((arg) => arg.startsWith('--bloque='))?.slice('--bloque='.length) ?? null;
  const corridas = Number(posicionales[0] || 1);
  const splits = Number(posicionales[1] || 15);
  const estrategia = posicionales[2] || 'equilibrado';

  if (!(estrategia in ESTRATEGIAS) && estrategia !== 'todas') {
    console.error(`Estrategia desconocida: ${estrategia}. Opciones: ${NOMBRES_ESTRATEGIA.join(', ')}, todas.`);
    process.exit(1);
  }

  const recortar = (lote) => {
    if (bloque === null) {
      return lote;
    }
    if (!(bloque in lote)) {
      console.error(`Bloque desconocido: ${bloque}. Opciones: ${Object.keys(lote).join(', ')}.`);
      process.exit(1);
    }
    return { estrategia: lote.estrategia, corridas: lote.corridas, splits: lote.splits, crashes: lote.crashes, [bloque]: lote[bloque] };
  };

  if (corridas <= 1) {
    const seed = 42;
    const { state, carrera, jugabilidad, observacion } = correrCarrera(seed, splits, ESTRATEGIAS[estrategia]);
    console.log(JSON.stringify({ ...reporteDetallado(state, seed), carrera, jugabilidad, observacion }, null, 2));
  } else if (estrategia === 'todas') {
    console.log(JSON.stringify(NOMBRES_ESTRATEGIA.map((nombre) => recortar(correrLote(corridas, splits, nombre))), null, 2));
  } else {
    console.log(JSON.stringify(recortar(correrLote(corridas, splits, estrategia)), null, 2));
  }
}
