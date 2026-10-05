import { pathToFileURL } from 'url';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto } from '../core/pipeline.js';
import { calcularContexto } from '../core/contexto.js';
import { nivelDelJugador } from '../core/ficha.js';
import { tierMasAltoJugado, esBuenPapel } from '../core/registro.js';
import { resultadoDelJugador, mundialSinJugador } from '../core/internacional.js';
import { puntajeDeCarrera, NIVELES } from '../core/puntaje.js';
import { candidatos } from '../systems/events.js';
import { esCierreDeEdad } from '../systems/edadCierre.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { BALANCE } from '../data/balance.js';
import { conPermanencia } from '../core/curvas.js';
import { probabilidadDePartido, ruidoEfectivo } from '../core/partido.js';
import { ESTRATEGIAS, NOMBRES_ESTRATEGIA, esDecisionDeMinijuego, efectosDeCarreraDeOpcion } from './estrategias.js';
import { verificarSplitJugadoSinFila } from './guards.js';
import { formaBeat } from '../core/log.js';

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

// K5c (paso 1): las sondas del Mundial real y de la curva de edad. Nada de esto es del juego (esas van en `balance.js`).
// "Tu equipo es claramente el más fuerte del Mundial" (§K.3a): tu fuerza (`fuerzaDePartido` al abrir el torneo) le saca a la
// del mejor de los otros 15 clasificados al menos este margen — el Δ de fuerza con el que el motor mide al "favorito claro
// de un Bo5" (`BANDA_FAVORITO_CLARO`, 9-11, ~80% de serie): ganar tres series seguidas siendo ese favorito da ~50%.
export const MARGEN_CLARAMENTE_EL_MAS_FUERTE = 10;
// Los cortes del margen (fuerza propia menos la del mejor rival) con los que se abre "cuánto gana cada margen" del Mundial.
export const CORTES_MARGEN_MUNDIAL = [-20, -10, 0, 10];
// "Nuevo Faker" (§K.3b): 2 o más Mundiales ganados, o #1 del mundo al cierre de 3 o más temporadas.
export const FAKER_MUNDIALES_GANADOS = 2;
export const FAKER_TEMPORADAS_NUMERO_UNO = 3;
// "Nivel pico de élite" (§K.3b): el top 3% de la corrida (todas las carreras del lote, las que no llegaron a pro incluidas)
// por `registro.picos.nivel`, la "media máx" que muestra la ficha.
export const FRACCION_NIVEL_PICO_ELITE = 0.03;
// K5c-H: los cortes de nivel pico del bloque `casa` (el % de temporadas de tier 1 en la liga de tu región, por nivel).
export const CORTES_NIVEL_PICO_CASA = [70, 75, 80, 85, 90];
// La curva de nivel por edad: de los 16 (la edad mínima de una liga) a la línea forzosa de los 34.
export const EDAD_CURVA_MIN = 16;
export const EDAD_CURVA_MAX = 34;
const RESULTADO_CAMPEON = 'campeon';

// Δ de fuerza (el equipo más fuerte contra el más débil) para la tabla analítica de favorito Bo5.
export const DELTAS_FAVORITO_BO5 = [0, 2, 4, 6, 8, 10, 12, 15];

// K2a (PLAN.md "K2 — lo que midió la investigación", viñeta K2a): el favorito de un Bo5 MEDIDO EN EL MOTOR, por bandas
// de |Δ0| = |fuerza propia al empezar la serie (campeón del split, sin ruido) − fuerza del rival|, [desde, hasta). Son
// las bandas de la investigación (`k2inv/a_bo5b.mjs`) más una de 20 a 30; lo que cae afuera se cuenta aparte.
export const BANDAS_DELTA_BO5 = [[0, 3], [3, 5], [5, 7], [7, 9], [9, 11], [11, 13], [13, 16], [16, 20], [20, 30]];
// "Favorito claro" = Δ de fuerza ≈ 10 al empezar la serie (≈ 1º contra 4º de una liga tier 1, que da 11,8): PLAN.md, K2c.
export const BANDA_FAVORITO_CLARO = [9, 11];
// Mejor de 5 = el formato de la serie (`serie.formato`).
const FORMATO_BO5 = 5;
// Para pasar una probabilidad a puntos porcentuales.
const PUNTOS_PORCENTUALES = 100;

// K2a: las metas de los checks de K2 (PLAN.md "Checks de K2"), sobre la definición corregida. Se reportan en
// `nivel.metasK2` con la meta al lado; desde K3c son también checks duros de `validate.js` ("K3c meta ..."), que leen
// estas mismas constantes.
export const META_K2_R_MISMA_LIGA = 0.5;
export const META_K2_R2_SIN_RUIDO = 0.5;
export const META_K2_BO5_FAVORITO_CLARO_PCT = [75, 85];

// K3-A: las metas de K3 (PLAN.md "K3 — Tus decisiones construyen tu nivel", Checks), con el mismo criterio que las
// de K2: se reportan en `metasK3` con la meta al lado y, desde K3c, son checks duros de `validate.js` ("K3c meta ...").
// Con las constantes neutras de K3-A (k = 0, r = 0, rH = 0, topeDescanso = 100) estaban en rojo: el juego era el de antes.
export const META_K3_MENTALIDAD_MEDIANA = [45, 75];
// "< 20% de splits pro con mentalidad ≥ 90" y "hype ≥ 90 en < 25% de los splits pro" (`UMBRAL_SATURACION`).
export const META_K3_MENTALIDAD_SATURADA_PCT = 20;
export const META_K3_HYPE_SATURADO_PCT = 25;
// "Con mentalidad 20 contra 80, el desvío del resultado del mapa difiere de forma medible (con la cabeza mal, más
// varianza)": la sonda pone la mentalidad en 20 y en 80 y, A FUERZA IGUAL (los mismos Δ de `DELTAS_FAVORITO_BO5`
// mayores que 0), mide el desvío del resultado de un mapa contra lo que la fuerza promete. "Medible" = el batacazo
// (que gane el de menos fuerza) sube al menos este número de puntos porcentuales con la cabeza en 20.
export const META_K3_DIFERENCIA_BATACAZO_PP = 2;
const MENTALIDADES_SONDA_K3 = [20, 80];

// K3-B: lo que un efecto sobre un stat de curva conserva a 4 splits (PLAN.md "K3 — decisiones de spec": meta >= 40%).
// `retencionDeUnEfecto` la mide; el bloque `metasK3` la reporta con esta meta al lado (`retencion4Splits`). K3c fijó
// `BALANCE.atributos.fraccionPermanente` (0,3) para que se cumpla.
export const META_K3_RETENCION_4_SPLITS = 0.4;
// `seeds` es la muestra: cuántas carreras se prueban (con 40 el error estándar era ~0,07, más que el escalón de 0,05 que
// separa dos fracciones vecinas: el barrido de K3c salía no monótono). De las `seeds` carreras no todas cuentan: las que
// terminan antes de medir y las que tocan el clamp quedan afuera (con 400 quedaban 286; el PLAN pide >= 400 casos). Con 600
// quedan ~414 y el error estándar es ~0,020 (con 286 era ~0,025); corre en ~18 s.
// La exclusión por clamp significa que la sonda mide la retención de las carreras que no tocan los límites del stat.
export const SONDA_RETENCION = { seeds: 600, splitsPrevios: 18, splitsDespues: 4, stat: 'mecanica', delta: 8 };

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

// Los ruidos de resultados que apaga la ablación de `varianzaExplicada`: [grupo de BALANCE, clave].
// Exportado para que `validate.js` pueda fotografiarlos ANTES de cualquier corrida y comprobar que la
// ablación los apaga adentro de su ventana y los restaura después. K2b: eran cinco (el del rendimiento
// del split y los dos σ por lado de la fecha y del mapa); desde que cada partido es una tirada contra su
// p (`core/partido.js`) son los dos σ combinados que lee `ruidoEfectivo`.
export const PARAMETROS_RUIDO = [
  ['partido', 'sigmaFecha'],
  ['partido', 'sigmaMapa']
];

// K4c (paso 1): de dónde sale cada log no técnico, para repartir el tiempo-máquina por fuente. La fuente es el `type` del
// log (el sistema que lo escribió) y, si el log trae una de estas claves, se le agrega como sufijo (la primera que tenga,
// en este orden): separa el log por mapa de la serie del de cierre, la crónica de un evento de su tarjeta, etc. Es un
// nombre de la sonda, no del juego.
export const CLAVES_DE_FORMA_DE_LOG = ['mapa', 'postSerie', 'cronica', 'ajustePartido', 'etapa', 'mundial', 'vinetas', 'top20', 'efectos'];

export function fuenteDeLog(log) {
  const clave = CLAVES_DE_FORMA_DE_LOG.find((candidata) => log[candidata] !== undefined);
  return clave ? `${log.type}:${clave}` : log.type;
}

// Cuántos beats cuenta el reproductor para un lote de logs nuevos (`agruparBeats`, src/ui/components/feed.js):
// un beat por log que `formaBeat` (core/log.js, la misma función que usa `agruparBeats`), más uno extra si el
// lote ARRANCA con líneas que no lo forman (técnicas o `adjunto`: no tienen una narrativa a la que pegarse y
// forman su propio beat). `validate.js` comprueba que esto coincide con `agruparBeats(lote).length` sobre lotes
// reales — así no hace falta importar la UI en una sonda del motor.
export function contarBeats(lote) {
  let beats = 0;
  for (const log of lote) {
    if (formaBeat(log)) {
      beats += 1;
    }
  }
  return lote.length > 0 && !formaBeat(lote[0]) ? beats + 1 : beats;
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
// veces seguidas lo del meta"; `decisiones`/`seriesCerradas` a "hacés un clic
// y perdiste"; `poolMainMuerto` a "maestría 5, antes tenía más"; `nivelFinal`/
// `jerarquiaFinal` a "es todo RNG, mi skill no importa".
//
// Fase K0 (PLAN.md §K.5): `observacion` es lo que el instrumento de K agrega, siempre por lectura pura del
// `state` (nunca consume `rng` ni cambia una respuesta): una fila por split pro con los regresores del
// nivel y la posición (`splitsProData`), las interrupciones de cada split pro con su tipo
// (`splitsProRitmo`), los beats del reproductor y los minijuegos, y las temporadas como #1 del mundo.
// K4c-S: el Δp de una parada de plan de serie (`serie:plan`, `internacional:plan`): p de la mejor opción − p de la peor,
// leída de la `pSerie` que cada opción declara (la de la previa, la que el motor tira). `null` si no hay p por opción.
// Lectura pura, cero `rng`: es la palanca de la parada medida sin ruido (la misma idea que `deltaPDeDecision` de
// `agencia.js`, K4c-H, sobre las paradas que declaran `pSerie`).
export function deltaPDePlan(opciones) {
  const ps = (opciones ?? []).map((opcion) => opcion.pSerie);
  return ps.length >= 2 && ps.every((p) => Number.isFinite(p)) ? Math.max(...ps) - Math.min(...ps) : null;
}

// K5c-H: `eleccion` (opcional) es la del inicio de `createInitialState` (por ejemplo `{ regionOrigen: 'KR' }`): los checks de
// K5c-H corren carreras de una región. Sin ella (`null`, el valor por defecto de `createInitialState`) todo se sortea de la
// seed como siempre.
export function correrCarrera(seed, splits, responder, eleccion = null) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng, eleccion);

  const carrera = { splitsPro: 0, splitsConEquipo: 0, maxRachaSinEquipo: 0, tierMaximo: null };
  let rachaSinEquipo = 0;

  const jugabilidad = {
    splitsPro: 0,
    splitsConMainMuerto: 0,
    descartadosPorBisagra: [],
    categoriasReveladas: [],
    decisiones: 0,
    seriesCerradas: 0,
    nivelFinal: null,
    jerarquiaFinal: null
  };
  // K4 (revisión): la serie ya no frena por draft (K4-B la pausa por plan), así que "drafts por serie" valía 0 siempre y
  // se sacó. Queda el conteo de series cerradas (`seriesMedidas` del reporte), con el mismo valor que daba antes: el
  // contador del registro al final menos el del arranque.
  const seriesAlArrancar = state.career.registro.seriesGanadas + state.career.registro.seriesPerdidas;

  // Métricas del instrumento de Fase K0.
  //
  // K2a: `temporadasData` es la observación CORREGIDA del nivel (PLAN.md "K2 — lo que midió la investigación"): una
  // fila por split en el que corrió la temporada, con el nivel y los compañeros QUE USÓ EL MOTOR para la fuerza de esa
  // temporada (`career.temporada.nivelJugador`/`nivelCompaneros`, expuestos por `systems/temporada.js`) y la posición
  // final de ESA temporada. `splitsProData` (la de K0) queda igual por continuidad: lee el nivel después del split, los
  // compañeros del snapshot y arrastra la posición del split anterior en los splits pro sin temporada (~5% de sus
  // filas). `seriesData`: una fila por serie cerrada, con las dos fuerzas al empezar la serie (el Bo5 medido en el motor).
  const observacion = {
    seed,
    decisionesPorTipo: {},
    minijuegosCount: 0,
    splitsProRitmo: [],
    splitsProData: [],
    temporadasData: [],
    seriesData: [],
    temporadasNumero1: 0,
    // K5c (paso 1): una fila por Mundial en el que clasificó tu equipo (ver `filaDeMundial`): hasta dónde llegó y las
    // fuerzas con las que arrancó el torneo. Lectura pura de `state.internacional`, cero `rng`.
    mundiales: [],
    // K5c-M: una fila por Mundial DEL MUNDO (lo juegues o no): el campeón y los 16 participantes con liga, región y fuerza.
    // Lectura pura (`mundialSinJugador` es por hash, cero `rng`). Ver `filaDeMundialDelMundo`.
    mundialesDelMundo: [],
    beatsReproductor: 0,
    // K4c (paso 1), solo lectura pura del state: los minijuegos por mecánica (`datos.minijuego`), las bifurcaciones
    // (eventos con `bifurcacion: true` que frenaron, en total y por evento), las que ELIGIÓ con un efecto de carrera
    // (por tipo), y lo que de verdad cambió en la carrera: las veces que cambió de línea (`player.role`), de región (la de
    // `career.liga`) y las mudanzas firmadas desde una oferta de bifurcación (`flags.ofertaDeImport` que se resuelve en
    // una liga de la promesa). `logsConBeatPorFuente` se llena al final (ver `fuenteDeLog`).
    minijuegosPorMecanica: {},
    // K4c-S: una fila `{ tipo, deltaP }` por parada de plan de serie (`serie:plan`, `internacional:plan`), con su Δp.
    planDeltaP: [],
    bifurcaciones: 0,
    bifurcacionesPorEvento: {},
    carreraElegida: {},
    cambiosDeLinea: 0,
    cambiosDeRegion: 0,
    mudanzasFirmadas: 0,
    fueraDeSuRegion: false
  };
  let rolPrevio = state.player.role;
  let regionPrevia = null;
  // El `splitCount` al arrancar el split en curso: la clave de las filas de temporada y de serie de ese split.
  let splitEnCurso = state.player.splitCount;
  // K5c-M: el `escenaAnual` del último año observado (el objeto cambia una vez por cierre de año, en `systems/escena.js`).
  let escenaObservada = null;
  // Las vueltas del retiro usadas al arrancar el split en curso: si en `st` ya hay más, `retiro` adelantó el reloj.
  let vueltasAlArrancar = state.flags.vueltasUsadas;

  let decisionesEnSplitActual = 0;

  // Los logs que el reproductor muestra en una tanda: lo que el motor emite entre dos pausas (la que
  // abre `avanzarSplit` hasta la primera decisión, y cada `resolverDecision` hasta la próxima decisión o
  // el final del split). Cada tanda se agrupa en beats por separado, como hace `reproducirBeats`.
  let logsContados = state.logs.length;
  function contarTanda(st) {
    const nuevos = st.logs.slice(logsContados);
    observacion.beatsReproductor += contarBeats(nuevos);
    // K5c (validación): también en las pausas de adentro del split (el plan de una serie, el draft): si `retiro` ya adelantó
    // el reloj en este split, los cierres de serie que salen en esta tanda son del reloj de la vuelta, no del del arranque.
    if (st.flags.vueltasUsadas > vueltasAlArrancar) {
      splitEnCurso = st.flags.splitVuelta;
    }
    // K2a: cada serie cerrada deja UN log de cierre (`postSerie`) con su formato y las dos fuerzas al empezarla.
    for (const log of nuevos) {
      const fila = filaDeSerie(log, splitEnCurso);
      if (fila) {
        observacion.seriesData.push(fila);
      }
    }
    logsContados = st.logs.length;
  }

  // Envuelve la estrategia real (o `resolverAuto` si `responder` es null,
  // el mismo default que ya usa `avanzarSplitAuto`) sin cambiar una sola
  // respuesta: solo mira la decisión de pasada antes de contestarla, así
  // el comportamiento y el consumo de `rng` quedan idénticos a hoy.
  const responderInstrumentado = (sistema, st, decision, rngLocal) => {
    contarTanda(st);
    jugabilidad.decisiones += 1;
    decisionesEnSplitActual += 1;

    const tipo = `${sistema.id}:${decision.datos?.motivo ?? decision.presentacion ?? 'x'}`;
    observacion.decisionesPorTipo[tipo] = (observacion.decisionesPorTipo[tipo] ?? 0) + 1;

    if (esDecisionDeMinijuego(decision)) {
      observacion.minijuegosCount += 1;
      const mecanica = decision.datos?.minijuego;
      if (mecanica) {
        observacion.minijuegosPorMecanica[mecanica] = (observacion.minijuegosPorMecanica[mecanica] ?? 0) + 1;
      }
    }
    if (decision.datos?.motivo === 'plan') {
      const deltaP = deltaPDePlan(decision.opciones);
      if (deltaP !== null) {
        observacion.planDeltaP.push({ tipo, deltaP });
      }
    }
    if (decision.datos?.evento?.bifurcacion) {
      observacion.bifurcaciones += 1;
      const idEvento = decision.datos.evento.id;
      observacion.bifurcacionesPorEvento[idEvento] = (observacion.bifurcacionesPorEvento[idEvento] ?? 0) + 1;
    }

    if (sistema.id === 'eventos' && decision.datos?.evento) {
      jugabilidad.categoriasReveladas.push(decision.datos.evento.categoria);
    }
    const respuesta = responder
      ? responder(sistema, st, decision, rngLocal)
      : sistema.resolverAuto(st, decision, rngLocal);
    if (decision.datos?.evento?.bifurcacion && respuesta?.opcionId) {
      for (const efecto of efectosDeCarreraDeOpcion(decision, respuesta.opcionId)) {
        observacion.carreraElegida[efecto.type] = (observacion.carreraElegida[efecto.type] ?? 0) + 1;
      }
    }
    return respuesta;
  };

  for (let i = 0; i < splits && !state.terminado; i += 1) {
    decisionesEnSplitActual = 0;
    splitEnCurso = state.player.splitCount;
    // K2a: `systems/temporada.js` es el único que escribe `career.temporada` y la arma ENTERA de nuevo cada vez que
    // corre (`iniciarTemporada`); los demás sistemas la copian por referencia. Si al cerrar el split el objeto es
    // otro, la temporada corrió en ESTE split; si es el mismo, es la del split anterior.
    const temporadaAntes = state.career.temporada;
    // K2a: el mundo contra el que se centra el nivel de la temporada (ver `mundoDeLaTemporada`).
    const mundoAntes = state.mundo;

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
    // K2c: la jerarquía con la que arrancó el split (la de la temporada que corra en él), para `jerarquiaMedia`.
    const jerarquiaAntes = state.career.jerarquia;
    const importPendiente = state.flags.ofertaDeImport;
    const vueltasAntes = state.flags.vueltasUsadas;
    vueltasAlArrancar = vueltasAntes;
    state = avanzarSplitAuto(state, rng, responderInstrumentado).state;
    // K5c (validación): en el split de una vuelta del retiro, `retiro` adelanta el reloj lo que pasó afuera
    // (`relojAlVolver`, `flags.splitVuelta`) antes de que corran `temporada` y `serie`: sus filas llevan ese reloj, no el
    // congelado con el que arrancó el split (criterio seed 6: la temporada que corrió en el split 39 quedaba como la 36).
    if (state.flags.vueltasUsadas > vueltasAntes) {
      splitEnCurso = state.flags.splitVuelta;
    }
    contarTanda(state);
    // K5c (paso 1): el Mundial que cerró en este split, si tu equipo jugó uno: el registro crece UNA entrada y `state.internacional`
    // es ese torneo. Se detecta por el registro y no por el año: antes de K5c (motor), tras un retiro y una vuelta el calendario
    // no avanzaba y el mundo jugaba dos Mundiales con el mismo año (4 de 200 carreras de `azar`); por el registro no depende de eso.
    const mundialesRegistrados = state.career.registro.internacionales.length;
    if (mundialesRegistrados !== observacion.mundiales.length) {
      const fila = filaDeMundial(state.internacional);
      if (mundialesRegistrados !== observacion.mundiales.length + 1 || !fila) {
        throw new Error(`seed ${seed}, split ${state.player.splitCount}: el registro tiene ${mundialesRegistrados} Mundiales y la observación ${observacion.mundiales.length}`);
      }
      observacion.mundiales.push(fila);
    }
    // K5c-M: el Mundial del mundo del año que cerró en este split (el `escenaAnual` es un objeto nuevo por cierre de año).
    if (state.mundo.escenaAnual && state.mundo.escenaAnual !== escenaObservada) {
      escenaObservada = state.mundo.escenaAnual;
      observacion.mundialesDelMundo.push(filaDeMundialDelMundo(state, escenaObservada));
    }
    const sinFila = verificarSplitJugadoSinFila(state);
    if (sinFila) {
      throw new Error(`seed ${seed}, split ${state.player.splitCount}: ${sinFila}`);
    }

    // K4c (paso 1): lo que cambió de verdad en este split (lectura pura).
    if (state.player.role !== rolPrevio) {
      observacion.cambiosDeLinea += 1;
      rolPrevio = state.player.role;
    }
    const ligaDelSplit = state.career.liga ? state.mundo.ligas.find((liga) => liga.id === state.career.liga) : null;
    if (ligaDelSplit) {
      if (regionPrevia !== null && ligaDelSplit.regionId !== regionPrevia) {
        observacion.cambiosDeRegion += 1;
      }
      regionPrevia = ligaDelSplit.regionId;
      if (ligaDelSplit.region !== state.mundo.regionOrigen) {
        observacion.fueraDeSuRegion = true;
      }
    }
    if (importPendiente && !state.flags.ofertaDeImport && ligaDelSplit && [].concat(importPendiente.ligas).includes(ligaDelSplit.id)) {
      observacion.mudanzasFirmadas += 1;
    }

    const temporadaJugada = state.career.temporada !== temporadaAntes;
    if (temporadaJugada) {
      const mundo = mundoDeLaTemporada(mundoAntes, state.mundo);
      observacion.temporadasData.push({ ...filaDeTemporada(mundo, state.career.temporada, splitEnCurso), jerarquia: jerarquiaAntes });
    }

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
      // K5c (paso 1): la edad con la que cierra el split (la curva de nivel por edad).
      edad: state.age,
      mentalidad: state.player.stats.mentalidad,
      hype: state.player.stats.hype,
      posNorm,
      nivel,
      nivelRelativoJugador: nivel - mediaLiga,
      nivelRelativoCompaneros: companerosNivel - mediaLiga,
      // false = la liga no está en `mundo.ligas` (los splits de tier 3): la "media de la liga" es la
      // constante `nivelLigaPorDefecto`, no un dato. Ver `bloquePosicion`.
      ligaModelada,
      // K2a: si en este split corrió la temporada. Con `false` y `posNorm` no nulo, la fila arrastra la posición
      // de la temporada anterior (las "filas rancias" de la definición de K0): `nivel.corregida.splitsProSinTemporada`.
      temporadaJugada
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

  jugabilidad.seriesCerradas = state.career.registro.seriesGanadas + state.career.registro.seriesPerdidas - seriesAlArrancar;
  jugabilidad.poolMainMuerto = state.flags.eventosVistos?.pool_main_muerto ?? 0;
  jugabilidad.maestriaMinimaPool = state.player.championPool.length > 0
    ? Math.min(...state.player.championPool.map((campeon) => campeon.mastery))
    : null;

  // `tiempoMaquinaMin`: cada log del `state.logs` final que forma un beat del reproductor (`formaBeat`, core/log.js:
  // ni técnico ni `adjunto`) × 700 ms. Regla 17 — K4c-F: esta definición reemplaza a la LITERAL de la spec de K0-A
  // ("cada log no técnico × 700 ms"), que dejó de medir lo que se reproduce cuando el feed empezó a meter líneas
  // `adjunto` adentro del beat anterior (los efectos de un evento, el mundo que no te toca, el segundo renglón de un
  // parche, los mapas de una serie que no te frenó): esas siguen en `state.logs` pero no cuestan un beat. Sigue siendo
  // una cota inferior barata, no lo que tarda de verdad el reproductor: ignora el beat extra de las tandas que
  // arrancan con líneas que no forman beat, los 1.600 ms de espera tras cada minijuego, y cuenta los logs del
  // arranque de la carrera, que el reproductor no reproduce.
  const logsConBeat = state.logs.filter(formaBeat).length;
  observacion.logsConBeatPorFuente = {};
  for (const log of state.logs) {
    if (formaBeat(log)) {
      const fuente = fuenteDeLog(log);
      observacion.logsConBeatPorFuente[fuente] = (observacion.logsConBeatPorFuente[fuente] ?? 0) + 1;
    }
  }
  observacion.tiempoMaquinaMin = (logsConBeat * DURACION_BEAT_MS) / MS_POR_MINUTO;

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

// K5c (paso 1): la fila de un Mundial para `observacion.mundiales`. `null` si tu equipo no clasificó (el torneo se
// juega igual por hash, pero no es tuyo). `fuerzaRivalMax` es la del mejor de los otros 15 clasificados.
export function filaDeMundial(torneo) {
  if (!torneo?.jugador) {
    return null;
  }
  const propia = torneo.participantes.find((p) => p.esJugador);
  const fuerzasAjenas = torneo.participantes.filter((p) => !p.esJugador).map((p) => p.fuerza);
  return {
    anio: torneo.anio,
    resultado: resultadoDelJugador(torneo),
    fuerzaPropia: propia.fuerza,
    fuerzaRivalMax: Math.max(...fuerzasAjenas)
  };
}

// K5c-M: la fila de un Mundial del MUNDO. El torneo es el que `systems/escena.js` usó: `state.internacional` si es de ese año y
// terminó (lo jugaste), o `mundialSinJugador` (por hash, el mismo que usa la escena). El campeón de verdad es el de
// `escenaAnual.campeonMundial`; `coincide` dice si el torneo reconstruido (con el state al cierre del split, por si algún sistema
// posterior movió una fuerza) llega al mismo campeón. Lectura pura, cero `rng`.
export function filaDeMundialDelMundo(state, escena) {
  const torneo = state.internacional?.anio === escena.anio && state.internacional.campeon
    ? state.internacional
    : mundialSinJugador(state, escena.anio);
  const regionDe = Object.fromEntries(state.mundo.ligas.map((liga) => [liga.id, liga.regionId]));
  return {
    anio: escena.anio,
    campeon: escena.campeonMundial,
    coincide: torneo.campeon === escena.campeonMundial,
    jugado: Boolean(torneo.jugador),
    participantes: torneo.participantes.map((p) => ({ nombre: p.nombre, liga: p.liga, region: regionDe[p.liga] ?? p.liga, fuerza: p.fuerza }))
  };
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
  return nivelMedioDe(state, liga);
}

// K2a: la misma media, para la liga a la que pertenece una org (la de la temporada que se observa, no la de
// `career.liga` al cerrar el split). Devuelve también la liga, o `null` si la org no está en `mundo.ligas` (tier 3).
export function nivelMedioDeLigaDeOrg(state, orgNombre) {
  const liga = (state.mundo.ligas ?? []).find((l) => l.orgs?.some((o) => o.nombre === orgNombre)) ?? null;
  return { ...nivelMedioDe(state, liga), liga };
}

function nivelMedioDe(state, liga) {
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

// K2a — los planteles tal como estaban al ARRANCAR la temporada del split, que es contra los que se centra el nivel. El
// observador no ve adentro del split; lo resuelve quién mueve el mundo y cuándo (el orden de `ETAPAS_SPLIT`):
//  - ANTES de `temporada`: `competitivo` (solo AGREGA planteles, para las orgs de la liga a la que ascendés) y `mercado`
//    (el mercado del mundo y el cierre de los asientos congelados; cada vez que corre deja un `mercadoPretemporada`
//    nuevo);
//  - DESPUÉS de `temporada`: `plantel`, que envejece el mundo en el cierre de edad, y solo si el mercado del mundo no
//    corrió ese año (el split del cierre de edad del año en que firmaste desde amateur, o en el que jugaste una tier 2
//    que no es la de tu región).
// Así que si `mercadoPretemporada` cambió en el split, todo lo que se movió fue antes de la temporada y valen los
// planteles del cierre; si no, los que ya existían antes del split no los tocó nadie antes de la temporada (a lo sumo
// `plantel` después) y valen los de antes, y los que aparecieron los agregó `competitivo` antes de la temporada. Medido
// sobre 400 carreras de `criterio`: con solo los del cierre, 4 de 13.628 temporadas quedaban centradas contra el mundo
// ya envejecido. `validate.js` lo verifica contra un espía de `temporada.aplicar` (check "K2a observador").
export function mundoDeLaTemporada(mundoAntes, mundoDespues) {
  if (mundoDespues.mercadoPretemporada !== mundoAntes.mercadoPretemporada) {
    return mundoDespues;
  }
  return { ...mundoDespues, planteles: { ...(mundoDespues.planteles ?? {}), ...(mundoAntes.planteles ?? {}) } };
}

// K2a — la fila corregida de una temporada: el nivel y los compañeros QUE USÓ EL MOTOR (los expone `iniciarTemporada`
// sobre el mismo estado con el que calcula `rendimiento` y `fuerzaPropia`), centrados por la media de la liga en la que
// se jugó esa temporada (la de la org de `filaPropia`, con los planteles del arranque de la temporada: ver
// `mundoDeLaTemporada`), y la posición final de esa misma tabla.
export function filaDeTemporada(mundo, temporada, split) {
  const { media, modelada, liga } = nivelMedioDeLigaDeOrg({ mundo }, temporada.filaPropia.org);
  const equipos = temporada.tabla?.length ?? 0;
  const posNorm = temporada.posicion && equipos > 1 ? 1 - (temporada.posicion - 1) / (equipos - 1) : null;
  return {
    split,
    org: temporada.filaPropia.org,
    liga: liga?.id ?? null,
    tier: liga?.tier ?? null,
    posicion: temporada.posicion,
    equipos,
    posNorm,
    nivel: temporada.nivelJugador,
    nivelCompaneros: temporada.nivelCompaneros,
    mediaLiga: media,
    nivelRelativoJugador: temporada.nivelJugador - media,
    nivelRelativoCompaneros: temporada.nivelCompaneros - media,
    ligaModelada: modelada
  };
}

// K2a — la fila de una serie cerrada, desde su log de cierre (`systems/serie.js#concluirRonda`, `postSerie: true`):
// `delta` = Δ0 = tu fuerza al empezar la serie (campeón del split, rendimiento determinista acotado a 0-100) − la del
// rival. `null` si el log no es un cierre de serie.
export function filaDeSerie(log, split) {
  if (log.type !== 'serie' || log.postSerie !== true) {
    return null;
  }
  return {
    split,
    ronda: log.ronda,
    formato: log.formato,
    fuerzaInicial: log.fuerzaInicial,
    fuerzaRival: log.fuerzaRival,
    delta: log.fuerzaInicial - log.fuerzaRival,
    gano: log.gano,
    marcador: [...log.marcador]
  };
}

// Fase K0 (PLAN.md §K.3a): cálculo analítico cerrado de Bo5 para Δ de fuerza.
// El 80% objetivo de K.3a es para Δ ≈ 10. K2b: la p de cada mapa es la del motor
// (`probabilidadDePartido(null, Δ, 0, 'mapa')`, el σ combinado de `ruidoEfectivo`), así que la tabla
// sigue sola a K2c y a K3; `pMapaDe` deja inyectar otra p (validate lo usa con σ = 0).
//
// Lo que decía esta tabla en K0 (σ combinado = √(7² + 12²) ≈ 13,9): la aproximación logística
// sobreestima ~1 pp contra Monte Carlo (Bo5, 400.000 series por Δ: Δ=10 da 0,9192 contra 0,9109; Δ=4
// da 0,7167 contra 0,7045). Es analítica y omite el Fearless: la medida en el motor es `bo5Motor`.
export function calcularFavoritoBo5(
  deltas = DELTAS_FAVORITO_BO5,
  pMapaDe = (delta) => probabilidadDePartido(null, delta, 0, 'mapa')
) {
  return deltas.map((delta) => {
    const pMapa = pMapaDe(delta);
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
  // K2a: las filas corregidas (una por temporada jugada) de las mismas carreras sin ruido.
  const temporadasPorCarrera = [];
  let crashes = 0;

  try {
    for (const [grupo, clave] of PARAMETROS_RUIDO) {
      BALANCE[grupo][clave] = 0;
    }
    for (const seed of semillas) {
      try {
        const { observacion } = correrCarrera(seed, splits, responder);
        filasPorCarrera.push(observacion.splitsProData);
        temporadasPorCarrera.push(observacion.temporadasData);
      } catch {
        crashes += 1;
      }
    }
  } finally {
    PARAMETROS_RUIDO.forEach(([grupo, clave], i) => {
      BALANCE[grupo][clave] = originales[i];
    });
  }

  return { filasPorCarrera, temporadasPorCarrera, crashes };
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

// K3-B, la sonda de retención: cuánto de un efecto de `delta` sobre un stat de curva sigue en pie `splitsDespues`
// splits después. Por seed: se juega la carrera hasta `splitsPrevios` (un punto fijo, ya profesional) y desde ahí se
// corren dos futuros con el MISMO estado del rng, restaurado: uno tal cual y otro con el efecto aplicado — el stat
// movido y, con `fraccionPermanente` > 0, el bonus y la marca (`conPermanencia`, la misma regla que usa el
// aplicador de efectos de `systems/events.js`, que le pasa el delta REAL, ya con el clamp). Los dos futuros pueden
// bifurcarse (el efecto cambia decisiones y partidos, y con eso cuánto rng consume cada uno): una carrera sola es
// ruido (desvío ~0,3-0,5 de la retención), de ahí la muestra grande.
//
// La retención es un COCIENTE DE MEDIAS en carreras emparejadas: la media de lo retenido (el stat con efecto menos el
// stat sin efecto, a `splitsDespues`) sobre la media de lo aplicado (el delta que de verdad entró, tras el clamp).
// No es la media de los cocientes por seed. Quedan afuera, y se cuentan en `descartadas`: las carreras que terminan
// antes de medir (`terminada`) y las censuradas por el clamp (`tope`) — el stat estaba a menos de `delta` del techo
// (el efecto no entra entero) o algún futuro tocó 0 o 100 (la diferencia queda recortada y subestima lo retenido).
// `errorEstandar` es el del cociente (linealización). `opciones` pisa `SONDA_RETENCION`.
export function retencionDeUnEfecto(opciones = {}) {
  const { seeds, splitsPrevios, splitsDespues, stat, delta } = { ...SONDA_RETENCION, ...opciones };
  const { min, max } = BALANCE.stats;
  const casos = [];
  const descartadas = { terminada: 0, tope: 0 };
  for (let seed = 1; seed <= seeds; seed += 1) {
    const rng = mulberry32(seed);
    let base = createInitialState(seed, rng);
    for (let i = 0; i < splitsPrevios && !base.terminado; i += 1) {
      base = avanzarSplitAuto(base, rng).state;
    }
    if (base.terminado) {
      descartadas.terminada += 1;
      continue;
    }
    const antes = base.player.stats[stat];
    const aplicado = Math.min(max, antes + delta) - antes;
    if (aplicado < delta) {
      descartadas.tope += 1;
      continue;
    }
    const punto = rng.estado();
    const movido = { ...base, player: { ...base.player, stats: { ...base.player.stats, [stat]: antes + aplicado } } };
    const conEfecto = conPermanencia(movido, stat, aplicado, 'sonda de retención');
    const futuro = (estado) => {
      rng.restaurar(punto);
      let st = estado;
      let tocoTope = false;
      for (let i = 0; i < splitsDespues && !st.terminado; i += 1) {
        st = avanzarSplitAuto(st, rng).state;
        const valor = st.player.stats[stat];
        tocoTope = tocoTope || valor <= min || valor >= max;
      }
      return { st, tocoTope };
    };
    const sin = futuro(base);
    const con = futuro(conEfecto);
    if (sin.st.terminado || con.st.terminado) {
      descartadas.terminada += 1;
      continue;
    }
    if (sin.tocoTope || con.tocoTope) {
      descartadas.tope += 1;
      continue;
    }
    casos.push({ seed, aplicado, retenido: con.st.player.stats[stat] - sin.st.player.stats[stat] });
  }
  const retenido = promedio(casos.map((c) => c.retenido)) / (promedio(casos.map((c) => c.aplicado)) ?? NaN);
  const n = casos.length;
  const errorEstandar = n < 2 ? null
    : Math.sqrt(casos.reduce((s, c) => s + (c.retenido - retenido * c.aplicado) ** 2, 0) / (n - 1))
      / (Math.sqrt(n) * promedio(casos.map((c) => c.aplicado)));
  return { retenido: Number.isNaN(retenido) ? null : retenido, errorEstandar, muestras: n, descartadas, casos };
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
// leen en `fuerza.js`, así que un efecto típico se pierde contra la
// dispersión del rendimiento del split — hasta K2a `ruidoRendimiento`, desde
// K2b `puntosPorDesvioDeResultados`, el mismo 7); `pctEfectosDeRolQueSonDeCurva`/`vidaMediaPorCurva` a
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
    sigmaEfectoTipico: Number((magnitudMediaMentalidadHype / BALANCE.rendimiento.puntosPorDesvioDeResultados).toFixed(3)),
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

// Cuántos Mundiales con buen papel tiene la carrera. K5-A: buen papel es pasar el Swiss (`esBuenPapel`: cuartos o más);
// sigue siendo un proxy — los Mundiales ganados (`resultado === 'campeon'`) los pasa a medir K5c.
function buenPapelDe(estado) {
  return estado.career.registro.internacionales.filter(esBuenPapel).length;
}

// Notas de lo que los KPIs de "Mundial" miden DE VERDAD antes de K5 (el torneo mundial no existe todavía).
const NOTAS_PROXY = {
  ganaMundial: {
    proxyAntesDeK5: true,
    reemplazadaPor: 'mundialReal.total.ganaMundialPct',
    nota: 'Desde K5-A mide haber pasado AL MENOS UNA VEZ el Swiss del Mundial (cuartos o más, esBuenPapel), no un Mundial ganado: eso lo pasa a medir K5c.'
  },
  nuevoFaker: {
    proxyAntesDeK5: true,
    reemplazadaPor: 'mundialReal.total.nuevoFakerPct',
    nota: 'Casi todo sale de ">= 2 buen_papel" (ver buenPapelPorCarrera: son varios por carrera) y casi nada de "#1 del mundo 3 temporadas"; no mide ganar dos Mundiales.'
  },
  pOtroMundialDadoUno: {
    proxyAntesDeK5: true,
    reemplazadaPor: 'mundialReal.total.pDosOMasDadoUno',
    nota: 'P(>= 2 buen_papel | >= 1) es estructural, porque buen_papel se reparte varias veces por carrera; no es la probabilidad de repetir un Mundial.'
  }
};

// §K.3b — el embudo de la carrera, en % del total de carreras.
export function bloqueEmbudo(resultados, carreras, observaciones, { conNotas = false } = {}) {
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
  // K5c-T: "gana un título doméstico" es de primera (§K.3b: ~30%): solo los títulos con `tier === 1`. Reemplaza a
  // `titulos.length >= 1`, que contaba los de tier 2 (Challengers, academias). Los de tier 2 se reportan aparte.
  const tituloDeTier = (r, tier) => r.career.registro.titulos.some((titulo) => titulo.tier === tier);
  const ganaTituloDomestico = resultados.filter((r) => tituloDeTier(r, 1)).length;
  const ganaTituloTier2 = resultados.filter((r) => tituloDeTier(r, 2)).length;
  const top20 = resultados.filter((r) => (r.career.registro.picos.rankMundial ?? 0) > 0).length;
  const numeroUnoAlgunaVez = resultados.filter((r) => r.career.registro.picos.rankMundial === 1).length;

  // Proxy de Mundial (K5-A): pasar el Swiss (esBuenPapel). Los Mundiales ganados los pasa a medir K5c.
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
    ganaTituloTier2: pct(ganaTituloTier2, total),
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
//
// K2a: `corregida` repite las dos r con la DEFINICIÓN CORREGIDA (PLAN.md "K2 — lo que midió la investigación"): una fila
// por temporada jugada (`temporadasData`), con el nivel y los compañeros que usó el motor y la posición de esa misma
// temporada. Los campos de arriba quedan con la definición de K0 por continuidad (§K.0b); los checks de K2 van sobre
// `corregida`. `splitsProSinTemporada` cuenta las filas de K0 con posición que vienen de un split pro en el que no corrió
// la temporada (arrastran la posición del split anterior).
function bloquePosicion(observaciones) {
  const conTabla = observaciones.flatMap((o) => o.splitsProData).filter((d) => d.posNorm !== null);
  const modelados = conTabla.filter((d) => d.ligaModelada);
  const temporadas = observaciones.flatMap((o) => o.temporadasData).filter((d) => d.posNorm !== null);
  const temporadasModeladas = temporadas.filter((d) => d.ligaModelada);
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
    splitsExcluidosLigaNoModelada: conTabla.length - modelados.length,
    corregida: {
      rNivelPosicionMismaLiga: redondear(pearson(
        temporadasModeladas.map((d) => d.nivelRelativoJugador),
        temporadasModeladas.map((d) => d.posNorm)
      ), 3),
      rNivelPosicionBruto: redondear(pearson(
        temporadas.map((d) => d.nivel),
        temporadas.map((d) => d.posNorm)
      ), 3),
      temporadasConTabla: temporadas.length,
      temporadasExcluidasLigaNoModelada: temporadas.length - temporadasModeladas.length,
      splitsProSinTemporada: conTabla.filter((d) => !d.temporadaJugada).length
    }
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
// Ojo, la ablación no es "ruido puro": con σ=0, `probabilidadDePartido` devuelve 0, 0,5 o 1, y eso también
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

function bloqueVarianza(observaciones, splits, responder, maxCorridasAblacion = MAX_CORRIDAS_ABLACION) {
  const corridasAblacion = Math.min(observaciones.length, maxCorridasAblacion);
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
  // K2a: lo mismo con la definición corregida (una fila por temporada jugada), sobre las MISMAS carreras sin ruido.
  const corregidaTodas = estadisticasDeAblacion(
    observacionesBase.map((o) => conTabla(o.temporadasData)),
    sinRuido.temporadasPorCarrera.map(conTabla)
  );
  const corregidaModelada = estadisticasDeAblacion(
    observacionesBase.map((o) => soloModeladas(o.temporadasData)),
    sinRuido.temporadasPorCarrera.map(soloModeladas)
  );
  const r2Corregido = (e) => ({
    r2NivelYEquipo: redondear(e.r2NivelYEquipo, 3),
    r2NivelYEquipoEE: redondear(e.r2NivelYEquipoEE, 3),
    r2NivelYEquipoSinRuido: redondear(e.r2NivelYEquipoSinRuido, 3),
    r2NivelYEquipoSinRuidoEE: redondear(e.r2NivelYEquipoSinRuidoEE, 3),
    nTemporadasBase: e.nSplitsBase,
    nTemporadasSinRuido: e.nSplitsSinRuido
  });

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
    },
    // K2a: el R² de nivel + equipo con la definición corregida, con y sin el ruido de resultados, sobre todas las
    // temporadas con tabla y solo sobre las de liga modelada (la meta de K2 va sobre `soloLigaModelada`).
    corregida: { ...r2Corregido(corregidaTodas), soloLigaModelada: r2Corregido(corregidaModelada) }
  };
}

// `varianzaExplicada` se calcula la PRIMERA VEZ que se lee (y se recuerda): la ablación vuelve a correr hasta
// 200 carreras, o sea que cuesta tanto como el lote entero, y quien solo mira otros bloques (el check J0 de
// `validate.js` lee `jugabilidad` de 3 lotes de 200 carreras) no tiene por qué pagarlo. Es una propiedad
// enumerable: `JSON.stringify`, `Object.entries` y el spread la evalúan como a cualquier otra.
//
// K2a: `bo5Motor` es el favorito de un Bo5 medido en el motor (ver `bloqueBo5Motor`), al lado de la tabla analítica de
// K0 (`favoritoBo5`). `metasK2` (también al leerla: necesita la ablación) son los checks de K2 con la meta al lado.
function bloqueNivel(observaciones, splits, responder, maxCorridasAblacion = MAX_CORRIDAS_ABLACION) {
  const nivel = {
    ...bloquePosicion(observaciones),
    favoritoBo5: calcularFavoritoBo5(),
    bo5Motor: bloqueBo5Motor(observaciones)
  };
  let varianzaExplicada = null;
  Object.defineProperty(nivel, 'varianzaExplicada', {
    enumerable: true,
    configurable: true,
    get() {
      varianzaExplicada ??= bloqueVarianza(observaciones, splits, responder, maxCorridasAblacion);
      return varianzaExplicada;
    }
  });
  Object.defineProperty(nivel, 'metasK2', {
    enumerable: true,
    configurable: true,
    get() {
      return metasK2(nivel);
    }
  });
  return nivel;
}

// K2a — "el favorito gana el Bo5", MEDIDO EN EL MOTOR (PLAN.md "K2 — lo que midió la investigación": el 91,9% de K0
// era analítico y omitía el Fearless). Sobre las series Bo5 cerradas (`seriesData`, el log de cierre de cada serie):
// Δ0 = tu fuerza al empezar la serie (campeón del split, sin ruido) − la del rival. Por banda de |Δ0| y por lado: el
// jugador favorito (Δ0 >= 0, como en la investigación) y el rival favorito (Δ0 < 0), y los dos juntos; en cada celda,
// n, el % de series que ganó el favorito y su error estándar binomial en puntos (sqrt(p(1-p)/n); las series de una
// misma carrera no son independientes, así que es una cota optimista). Con menos de `MUESTRA_MINIMA` series, el % y
// el error son `null` (pero `n` va siempre).
function celdaBo5(favoritoGana) {
  const n = favoritoGana.length;
  if (n < MUESTRA_MINIMA) {
    return { n, ganaFavoritoPct: null, eePct: null };
  }
  const p = favoritoGana.filter(Boolean).length / n;
  return {
    n,
    ganaFavoritoPct: redondear(p * PUNTOS_PORCENTUALES, 1),
    eePct: redondear(Math.sqrt((p * (1 - p)) / n) * PUNTOS_PORCENTUALES, 1)
  };
}

export function bloqueBo5Motor(observaciones) {
  const series = observaciones.flatMap((o) => o.seriesData).filter((d) => d.formato === FORMATO_BO5);
  const favoritoGana = (d) => (d.delta >= 0 ? d.gano : !d.gano);
  const enBanda = ([desde, hasta]) => (d) => Math.abs(d.delta) >= desde && Math.abs(d.delta) < hasta;
  const fila = (banda) => {
    const deLaBanda = series.filter(enBanda(banda));
    return {
      desde: banda[0],
      hasta: banda[1],
      jugadorFavorito: celdaBo5(deLaBanda.filter((d) => d.delta >= 0).map(favoritoGana)),
      rivalFavorito: celdaBo5(deLaBanda.filter((d) => d.delta < 0).map(favoritoGana)),
      ambos: celdaBo5(deLaBanda.map(favoritoGana))
    };
  };
  const enAlgunaBanda = (d) => BANDAS_DELTA_BO5.some((banda) => enBanda(banda)(d));
  return {
    seriesBo5: series.length,
    pctJugadorFavorito: pct(series.filter((d) => d.delta >= 0).length, series.length),
    deltaMedio: redondear(promedio(series.map((d) => d.delta)), 2),
    fueraDeBandas: series.filter((d) => !enAlgunaBanda(d)).length,
    bandas: BANDAS_DELTA_BO5.map(fila),
    favoritoClaro: fila(BANDA_FAVORITO_CLARO)
  };
}

// K2a — los checks de K2 (PLAN.md "Checks de K2"), sobre la definición corregida y con la meta al lado. Son REPORTE, no
// checks: hoy están en rojo a propósito y `validate.js` no tiene una convención para checks de una fase futura. `cumple`
// es false si el valor no existe (muestra chica). Las bandas finales las fija K3c. Los otros cuatro checks de K2 (la p
// de la previa es la que tira el motor, el traspaso juega con el plantel nuevo, una tirada por partido y por mapa,
// `ruidoEfectivo` único lector de σ) protegen estructura que recién crean K2b y K2d: se escriben ahí.
function metasK2(nivel) {
  const enRango = (valor, [min, max]) => valor !== null && valor >= min && valor <= max;
  const alMenos = (valor, min) => valor !== null && valor >= min;
  const r = nivel.corregida.rNivelPosicionMismaLiga;
  const r2 = nivel.varianzaExplicada.corregida.soloLigaModelada.r2NivelYEquipoSinRuido;
  const { jugadorFavorito, rivalFavorito } = nivel.bo5Motor.favoritoClaro;
  const [bo5Min, bo5Max] = META_K2_BO5_FAVORITO_CLARO_PCT;
  const bandaBo5 = `|Δ0| en [${BANDA_FAVORITO_CLARO[0]}, ${BANDA_FAVORITO_CLARO[1]})`;
  return {
    rNivelPosicionMismaLiga: {
      valor: r, meta: `>= ${META_K2_R_MISMA_LIGA}`, cumple: alMenos(r, META_K2_R_MISMA_LIGA),
      fuente: 'nivel.corregida.rNivelPosicionMismaLiga'
    },
    r2NivelYEquipoSinRuidoLigaModelada: {
      valor: r2, meta: `>= ${META_K2_R2_SIN_RUIDO}`, cumple: alMenos(r2, META_K2_R2_SIN_RUIDO),
      fuente: 'nivel.varianzaExplicada.corregida.soloLigaModelada.r2NivelYEquipoSinRuido'
    },
    bo5FavoritoClaroJugador: {
      valor: jugadorFavorito.ganaFavoritoPct, n: jugadorFavorito.n, meta: `${bo5Min}-${bo5Max}% con ${bandaBo5}`,
      cumple: enRango(jugadorFavorito.ganaFavoritoPct, META_K2_BO5_FAVORITO_CLARO_PCT),
      fuente: 'nivel.bo5Motor.favoritoClaro.jugadorFavorito'
    },
    bo5FavoritoClaroRival: {
      valor: rivalFavorito.ganaFavoritoPct, n: rivalFavorito.n, meta: `${bo5Min}-${bo5Max}% con ${bandaBo5}`,
      cumple: enRango(rivalFavorito.ganaFavoritoPct, META_K2_BO5_FAVORITO_CLARO_PCT),
      fuente: 'nivel.bo5Motor.favoritoClaro.rivalFavorito'
    }
  };
}

// K3-A: las metas de K3 con la meta al lado (`META_K3_*`). Las dos de economía salen de `bloqueEconomia` (los
// splits pro); la del desvío es una sonda analítica sobre la p de mapa del motor (`probabilidadDePartido`, que pasa
// por `ruidoEfectivo` y su factor de consistencia): la misma fuerza, dos mentalidades.
function metasK3(economia) {
  const [medMin, medMax] = META_K3_MENTALIDAD_MEDIANA;
  const deltas = DELTAS_FAVORITO_BO5.filter((delta) => delta > 0);
  const sonda = Object.fromEntries(MENTALIDADES_SONDA_K3.map((mentalidad) => {
    const conCabeza = { player: { stats: { mentalidad } } };
    const ps = deltas.map((delta) => probabilidadDePartido(conCabeza, delta, 0, 'mapa'));
    return [mentalidad, {
      sigmaMapa: redondear(ruidoEfectivo(conCabeza, 'mapa'), 2),
      // Que gane el de menos fuerza, promediado sobre los Δ.
      batacazoPct: redondear(PUNTOS_PORCENTUALES * ps.reduce((suma, p) => suma + (1 - p), 0) / ps.length, 2),
      // El desvío del resultado de un mapa (Bernoulli) contra su esperanza, √(p(1 − p)), promediado.
      desvioResultado: redondear(ps.reduce((suma, p) => suma + Math.sqrt(p * (1 - p)), 0) / ps.length, 4)
    }];
  }));
  const [bajo, alto] = MENTALIDADES_SONDA_K3;
  const retencion = retencionDeUnEfecto();
  const diferenciaPp = redondear(sonda[bajo].batacazoPct - sonda[alto].batacazoPct, 2);
  return {
    mentalidadMedianaPro: {
      valor: economia.mentalidad.p50, meta: `${medMin}-${medMax}`,
      cumple: economia.mentalidad.p50 >= medMin && economia.mentalidad.p50 <= medMax, fuente: 'economia.mentalidad.p50'
    },
    mentalidadSaturadaPro: {
      valor: economia.mentalidad.pctMayorIgual90, meta: `< ${META_K3_MENTALIDAD_SATURADA_PCT}% de splits pro >= ${UMBRAL_SATURACION}`,
      cumple: economia.mentalidad.pctMayorIgual90 < META_K3_MENTALIDAD_SATURADA_PCT, fuente: 'economia.mentalidad.pctMayorIgual90'
    },
    hypeSaturadoPro: {
      valor: economia.hype.pctMayorIgual90, meta: `< ${META_K3_HYPE_SATURADO_PCT}% de splits pro >= ${UMBRAL_SATURACION}`,
      cumple: economia.hype.pctMayorIgual90 < META_K3_HYPE_SATURADO_PCT, fuente: 'economia.hype.pctMayorIgual90'
    },
    desvioMapaMentalidad20vs80: {
      valor: diferenciaPp, [`mentalidad${bajo}`]: sonda[bajo], [`mentalidad${alto}`]: sonda[alto], deltas,
      meta: `batacazo con mentalidad ${bajo} >= ${META_K3_DIFERENCIA_BATACAZO_PP} pp más que con ${alto}, a fuerza igual`,
      cumple: diferenciaPp >= META_K3_DIFERENCIA_BATACAZO_PP, fuente: 'sonda: probabilidadDePartido(mapa) con la mentalidad fija'
    },
    // "Un efecto sobre stat de curva conserva >= 40% a 4 splits": la sonda de K3-B aplica un delta conocido (con
    // `conPermanencia`, la regla del aplicador de efectos) y lo sigue `SONDA_RETENCION.splitsDespues` splits.
    retencion4Splits: {
      valor: retencion.retenido === null ? null : redondear(retencion.retenido, 3), muestras: retencion.muestras,
      errorEstandar: retencion.errorEstandar === null ? null : redondear(retencion.errorEstandar, 3),
      descartadas: retencion.descartadas,
      sonda: `${SONDA_RETENCION.stat} +${SONDA_RETENCION.delta}, ${SONDA_RETENCION.seeds} seeds, cociente de medias`,
      meta: `>= ${META_K3_RETENCION_4_SPLITS} a ${SONDA_RETENCION.splitsDespues} splits`,
      cumple: retencion.retenido !== null && retencion.retenido >= META_K3_RETENCION_4_SPLITS,
      fuente: 'sonda: retencionDeUnEfecto()'
    }
  };
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

// K5c (revisión): los splits de carrera pro desde el primer contrato de tier 2 o tier 1, sin los que pasaron retirado (la ventana de
// vuelta: `career.splitsRetirado`, que el reloj del mundo sí cuenta en `splitCount`). 0 si nunca firmó uno. Lo usan la longevidad y
// el r(potencial, duración) del instrumento.
export function duracionProDe(r) {
  const desde = r.career.splitPrimerContratoTier2;
  return desde === null || desde === undefined ? 0 : r.player.splitCount - desde - (r.career.splitsRetirado ?? 0);
}

// §K.3b — longevidad: años de carrera pro de los que llegaron a pro (`BALANCE.edad.splitsPorEdad` splits
// por año), % con carrera corta y % que termina en la línea forzosa.
// K5c-R: la duración se cuenta desde el primer contrato de tier 2 o tier 1 (`career.splitPrimerContratoTier2`; 0 si nunca firmó
// uno). Reemplaza a `(splitCount - splitFichaje) / splitsPorEdad`, que contaba desde tier 3. Quiénes "llegaron a pro" no cambia
// (`splitFichaje`, como el embudo): solo la duración.
export function bloqueLongevidad(resultados) {
  const llegaronAPro = resultados.filter((r) => r.splitFichaje !== null);
  const aniosPro = llegaronAPro.map((r) => {
    return duracionProDe(r) / BALANCE.edad.splitsPorEdad;
  });
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

// K4c (paso 1): el desglose del tiempo-máquina por fuente, ordenado de más a menos logs por carrera.
function tiempoMaquinaPorFuente(observaciones) {
  const fuentes = new Set(observaciones.flatMap((o) => Object.keys(o.logsConBeatPorFuente ?? {})));
  const filas = [...fuentes].map((fuente) => {
    const porCarrera = observaciones.map((o) => o.logsConBeatPorFuente?.[fuente] ?? 0);
    return { fuente, porCarrera, promedio: promedio(porCarrera) };
  });
  const totalPromedio = filas.reduce((suma, fila) => suma + fila.promedio, 0);
  return filas
    .sort((a, b) => b.promedio - a.promedio)
    .map((fila) => ({
      fuente: fila.fuente,
      logsPorCarrera: redondear(fila.promedio, 1),
      mediana: mediana(fila.porCarrera),
      minutosPorCarrera: redondear((fila.promedio * DURACION_BEAT_MS) / MS_POR_MINUTO, 2),
      pctDelTotal: pct(fila.promedio, totalPromedio) ?? 0
    }));
}

// §K.3c — el ritmo: cuántas veces te frena el juego.
export function bloqueRitmo(observaciones) {
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
    // K4c (paso 1): de dónde salen esos minutos. Por fuente (`fuenteDeLog`: el sistema que escribió el log y, si hay, su
    // forma), los logs no técnicos por carrera (promedio y mediana) y lo que pesan en minutos-máquina (promedio por carrera
    // × 700 ms). Una fuente que una carrera no usó cuenta 0 en esa carrera (así el promedio suma al total).
    tiempoMaquinaPorFuente: tiempoMaquinaPorFuente(observaciones),
    // `logsPorCarrera`, `minutosPorCarrera` y `pctDelTotal` de arriba son sobre el PROMEDIO de logs por carrera; la mediana
    // va aparte, en cada fila (`mediana`). Las columnas que suman al total son las del promedio, no esa.
    tiempoMaquinaPorFuenteSobre: 'promedio de logs por carrera (la mediana de cada fuente va aparte, en su fila)',
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

// El tramo de una banda de `ganaPorMargen`, escrito: los bordes abiertos sin número (sin null ni Infinity en el reporte).
export function nombreDeBandaDeMargen(desde, hasta) {
  if (!Number.isFinite(desde)) {
    return `< ${hasta}`;
  }
  return Number.isFinite(hasta) ? `${desde} a ${hasta}` : `>= ${desde}`;
}

// La liga del campeón de un Mundial del mundo (una fila de `observacion.mundialesDelMundo`). Exportada para el σ del margen de la
// meta del usuario en `validate.js` (K5c, cierre).
export const ligaDelCampeonMundial = (m) => m.participantes.find((p) => p.nombre === m.campeon)?.liga ?? 'desconocida';

// El nuevo Faker de una carrera (la definición de `mundialReal.definiciones.nuevoFaker`). Exportada para que `validate.js` agrande
// la muestra de la élite con carreras sueltas (K5c, cierre) sin copiar la definición.
export function esNuevoFaker(estado, observacion) {
  const titulos = estado.career.registro.internacionales.filter((entrada) => entrada.resultado === RESULTADO_CAMPEON).length;
  return titulos >= FAKER_MUNDIALES_GANADOS || observacion.temporadasNumero1 >= FAKER_TEMPORADAS_NUMERO_UNO;
}

// El nivel pico con el que una carrera entra a la élite, y el corte de la élite de una corrida: el top `FRACCION_NIVEL_PICO_ELITE`
// por nivel pico (con empates en el corte entran todas las del corte).
export const nivelPicoDe = (estado) => estado.career.registro.picos.nivel ?? 0;
export function corteDeElite(resultados) {
  const cantidadElite = Math.max(1, Math.ceil(FRACCION_NIVEL_PICO_ELITE * resultados.length));
  return resultados.map(nivelPicoDe).sort((a, b) => b - a)[cantidadElite - 1];
}

// K5c (paso 1) — el Mundial REAL (§K.3a / §K.3b). Reemplaza a los tres proxies de `embudo` (`ganaMundial`,
// `nuevoFaker`, `pOtroMundialDadoUno`, marcados `proxyAntesDeK5`, que se mantienen con su nota `reemplazadaPor`): acá un
// Mundial ganado es una entrada de `career.registro.internacionales` con `resultado === 'campeon'` (el torneo de
// `core/internacional.js`). Las fuerzas con las que arrancó cada Mundial salen de `observacion.mundiales`.
// `indices` = las carreras del grupo (todas, una región, la élite de nivel pico o el resto).
function metricasMundialReal(resultados, observaciones, indices) {
  const registrosDe = (i) => resultados[i].career.registro.internacionales;
  const titulos = indices.map((i) => registrosDe(i).filter((entrada) => entrada.resultado === RESULTADO_CAMPEON).length);
  const total = indices.length;
  const conTitulo = titulos.filter((n) => n >= 1).length;
  const conDosOMas = titulos.filter((n) => n >= FAKER_MUNDIALES_GANADOS).length;
  const nuevoFaker = indices.filter((i) => esNuevoFaker(resultados[i], observaciones[i])).length;
  const clasifican = indices.filter((i) => registrosDe(i).length > 0).length;

  const mundiales = indices.flatMap((i) => observaciones[i].mundiales);
  const ganados = (lista) => lista.filter((m) => m.resultado === RESULTADO_CAMPEON).length;
  const masFuertes = mundiales.filter((m) => m.fuerzaPropia > m.fuerzaRivalMax);
  const claros = mundiales.filter((m) => m.fuerzaPropia >= m.fuerzaRivalMax + MARGEN_CLARAMENTE_EL_MAS_FUERTE);

  return {
    carreras: total,
    clasificaAlMundialPct: pct(clasifican, total),
    mundialesJugadosPorCarrera: redondear(mundiales.length / (total || 1), 2),
    ganaMundialPct: pct(conTitulo, total),
    ganaMundialN: conTitulo,
    nuevoFakerPct: pct(nuevoFaker, total),
    nuevoFakerN: nuevoFaker,
    // P(2 o más | 1): sin el piso de `MUESTRA_MINIMA` (los grupos son chicos): `n` dice cuánto pesa.
    pDosOMasDadoUno: { p: conTitulo > 0 ? redondear(conDosOMas / conTitulo, 3) : null, n: conTitulo },
    // Cuánto le sacás (o te saca) al mejor de los otros 15 clasificados, en puntos de fuerza, entre todos tus Mundiales.
    // Una banda por tramo de margen, con sus Mundiales y el % que lo ganó: lo que dice "cuánto vale ser más fuerte" en este
    // torneo. K5c (validación): `banda` es el tramo escrito ("< -20", "-20 a -10", ..., ">= 10"); reemplaza a la tupla
    // [desde, hasta, n, %], que ponía null en los bordes abiertos (el reporte K0 no admite null estructurales). `pctGana` es
    // null solo con `mundiales: 0` (sin dato, como todo `pct`).
    ganaPorMargen: [-Infinity, ...CORTES_MARGEN_MUNDIAL].map((desde, k) => {
      const hasta = CORTES_MARGEN_MUNDIAL[k] ?? Infinity;
      const banda = mundiales.filter((m) => m.fuerzaPropia - m.fuerzaRivalMax >= desde && m.fuerzaPropia - m.fuerzaRivalMax < hasta);
      return { banda: nombreDeBandaDeMargen(desde, hasta), mundiales: banda.length, pctGana: pct(ganados(banda), banda.length) };
    }),
    margenSobreElMejorRival: (() => {
      const margenes = mundiales.map((m) => m.fuerzaPropia - m.fuerzaRivalMax);
      return { p10: redondear(percentil(margenes, 0.1), 1), p50: redondear(mediana(margenes), 1), p90: redondear(percentil(margenes, 0.9), 1) };
    })(),
    // Por Mundial jugado (no por carrera): si tu fuerza era la mayor, y si era la mayor por el margen del favorito claro.
    elMasFuerte: { mundiales: masFuertes.length, pctDeLosMundiales: pct(masFuertes.length, mundiales.length), ganados: ganados(masFuertes), pctGana: pct(ganados(masFuertes), masFuertes.length) },
    claramenteElMasFuerte: { mundiales: claros.length, pctDeLosMundiales: pct(claros.length, mundiales.length), ganados: ganados(claros), pctGana: pct(ganados(claros), claros.length) }
  };
}

export function bloqueMundialReal(resultados, observaciones) {
  const todos = resultados.map((_, i) => i);
  const porRegion = {};
  resultados.forEach((r, i) => {
    const region = r.mundo.regionOrigen ?? 'Desconocida';
    porRegion[region] = porRegion[region] ?? [];
    porRegion[region].push(i);
  });

  // La élite: el top `FRACCION_NIVEL_PICO_ELITE` de la corrida por nivel pico (las que no llegaron a pro cuentan con el suyo,
  // que nunca está arriba). Con empates en el corte entran todas las del corte.
  const picos = resultados.map(nivelPicoDe);
  const corte = corteDeElite(resultados);
  const elite = todos.filter((i) => picos[i] >= corte);
  const resto = todos.filter((i) => picos[i] < corte);

  return {
    definiciones: {
      real: 'ganar un Mundial = registro.internacionales con resultado campeon; reemplaza a embudo.ganaMundial / nuevoFaker / pOtroMundialDadoUno (proxies, proxyAntesDeK5)',
      nuevoFaker: `${FAKER_MUNDIALES_GANADOS}+ Mundiales ganados o #1 del mundo al cierre de ${FAKER_TEMPORADAS_NUMERO_UNO}+ temporadas`,
      claramenteElMasFuerte: `tu fuerza >= la del mejor de los otros 15 clasificados + ${MARGEN_CLARAMENTE_EL_MAS_FUERTE}`,
      nivelPicoElite: `top ${FRACCION_NIVEL_PICO_ELITE * 100}% de la corrida por registro.picos.nivel`
    },
    total: metricasMundialReal(resultados, observaciones, todos),
    porRegion: Object.fromEntries(Object.entries(porRegion).map(([region, indices]) => [region, metricasMundialReal(resultados, observaciones, indices)])),
    porNivelPico: {
      corteNivelPico: redondear(corte, 1),
      elite: metricasMundialReal(resultados, observaciones, elite),
      resto: metricasMundialReal(resultados, observaciones, resto)
    }
  };
}

// K5c-M — quién gana el Mundial del mundo, por liga y por región, y si gana el más fuerte. Sobre TODOS los años de todas las
// carreras (`observacion.mundialesDelMundo`). Los Mundiales cuyo torneo reconstruido no llega al campeón del motor (`coincide`
// false) cuentan en el reparto de títulos pero quedan fuera de las métricas de fuerza. El campeón que no está entre los
// participantes (no debería pasar) también.
const TOP_DEL_CAMPO_MUNDIAL = 3;

export function bloqueMundoMundial(observaciones) {
  const todos = observaciones.flatMap((o) => o.mundialesDelMundo);
  const medibles = todos.filter((m) => m.coincide && m.participantes.some((p) => p.nombre === m.campeon));
  const filas = medibles.map((m) => {
    const orden = [...m.participantes].sort((a, b) => b.fuerza - a.fuerza);
    const campeon = m.participantes.find((p) => p.nombre === m.campeon);
    const rango = orden.filter((p) => p.fuerza > campeon.fuerza).length + 1;
    return { m, orden, campeon, rango, masFuerte: orden[0] };
  });
  const cuenta = (lista, clave) => lista.reduce((acc, x) => { acc[clave(x)] = (acc[clave(x)] ?? 0) + 1; return acc; }, {});
  const reparto = (conteos) => Object.fromEntries(Object.entries(conteos)
    .sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, { n, pct: pct(n, todos.length) ?? 0 }]));
  const ligaDe = ligaDelCampeonMundial;
  const regionDe = (m) => m.participantes.find((p) => p.nombre === m.campeon)?.region ?? 'desconocida';
  const ligas = [...new Set(todos.flatMap((m) => m.participantes.map((p) => p.liga)))].sort();
  const fuerzaPorLiga = Object.fromEntries(ligas.map((liga) => {
    const deLiga = (m) => m.participantes.filter((p) => p.liga === liga);
    const mejores = medibles.map((m) => Math.max(...deLiga(m).map((p) => p.fuerza)));
    return [liga, {
      clasificadosPorMundial: redondear(promedio(todos.map((m) => deLiga(m).length)) ?? 0, 2),
      fuerzaMedia: redondear(promedio(todos.flatMap((m) => deLiga(m).map((p) => p.fuerza))) ?? 0, 1),
      fuerzaDelMejorMedia: redondear(promedio(mejores) ?? 0, 1),
      tieneAlMasFuertePct: pct(filas.filter((f) => f.masFuerte.liga === liga).length, filas.length) ?? 0,
      enElTop3Pct: pct(filas.filter((f) => f.orden.slice(0, TOP_DEL_CAMPO_MUNDIAL).some((p) => p.liga === liga)).length, filas.length) ?? 0
    }];
  }));
  return {
    definiciones: {
      alcance: 'todos los Mundiales del mundo (cada año, los juegue o no el jugador), por observacion.mundialesDelMundo',
      fuerza: 'la fuerza de cada participante en el torneo (participantes[].fuerza: la del bracket); el jugador, si juega, con fuerzaDeMundial',
      metricasDeFuerza: 'solo los Mundiales cuyo torneo reconstruido llega al campeón del motor (coincide)'
    },
    mundiales: todos.length,
    medibles: medibles.length,
    coincidenciaPct: pct(medibles.length, todos.length) ?? 0,
    jugadosPorElJugadorPct: pct(todos.filter((m) => m.jugado).length, todos.length) ?? 0,
    titulosPorLiga: reparto(cuenta(todos, ligaDe)),
    titulosPorRegion: reparto(cuenta(todos, regionDe)),
    elMasFuerteGanaPct: pct(filas.filter((f) => f.rango === 1).length, filas.length) ?? 0,
    unoDelTop3GanaPct: pct(filas.filter((f) => f.rango <= TOP_DEL_CAMPO_MUNDIAL).length, filas.length) ?? 0,
    ganaLaLigaDelMasFuertePct: pct(filas.filter((f) => f.campeon.liga === f.masFuerte.liga).length, filas.length) ?? 0,
    rangoMedioDelCampeon: redondear(promedio(filas.map((f) => f.rango)) ?? 0, 2),
    fuerzaCampeonMenosMaxima: redondear(promedio(filas.map((f) => f.campeon.fuerza - f.masFuerte.fuerza)) ?? 0, 2),
    fuerzaPorLiga
  };
}

// K5c-H — cada uno juega en su casa: las temporadas de tier 1 de una carrera, en splits (`registro.porOrg[].splitsPorTier[1]`),
// y cuántas fueron en la liga de tier 1 de tu región de origen (`mundo.regionIdOrigen`). Lectura pura del estado final. La
// usan el bloque `casa` y los checks de K5c-H de `validate.js`.
export function temporadasTier1EnCasa(state) {
  const casa = state.mundo.ligas.find((liga) => liga.tier === 1 && liga.regionId === state.mundo.regionIdOrigen)?.id ?? null;
  let total = 0;
  let enCasa = 0;
  for (const fila of state.career.registro.porOrg) {
    const splits = fila.splitsPorTier?.[1] ?? 0;
    total += splits;
    enCasa += fila.liga !== null && fila.liga === casa ? splits : 0;
  }
  return { total, enCasa };
}

function metricasCasa(resultados, indices) {
  const temporadas = indices.map((i) => temporadasTier1EnCasa(resultados[i]));
  const splitsTier1 = temporadas.reduce((suma, t) => suma + t.total, 0);
  const enCasa = temporadas.reduce((suma, t) => suma + t.enCasa, 0);
  return { carreras: indices.length, splitsTier1, pctEnCasa: pct(enCasa, splitsTier1) };
}

// El % de las temporadas de tier 1 que se jugaron en la liga de tu región, en total, por región de origen (la misma clave
// que `mundialReal.porRegion`) y por nivel pico (`CORTES_NIVEL_PICO_CASA`). El Mundial por región ya está en
// `mundialReal.porRegion`. `pctEnCasa` es null solo si la celda no tiene temporadas de tier 1 (`splitsTier1: 0`).
export function bloqueCasa(resultados) {
  const todos = resultados.map((_, i) => i);
  const porRegion = {};
  resultados.forEach((r, i) => {
    const region = r.mundo.regionOrigen ?? 'Desconocida';
    porRegion[region] = porRegion[region] ?? [];
    porRegion[region].push(i);
  });
  const picos = resultados.map((r) => r.career.registro.picos.nivel ?? 0);
  return {
    definicion: 'splits de tier 1 jugados en la liga de tier 1 de tu región de origen / todos tus splits de tier 1 (registro.porOrg)',
    total: metricasCasa(resultados, todos),
    porRegion: Object.fromEntries(Object.entries(porRegion).map(([region, indices]) => [region, metricasCasa(resultados, indices)])),
    porNivelPico: [-Infinity, ...CORTES_NIVEL_PICO_CASA].map((desde, k) => {
      const hasta = CORTES_NIVEL_PICO_CASA[k] ?? Infinity;
      return { banda: nombreDeBandaDeMargen(desde, hasta), ...metricasCasa(resultados, todos.filter((i) => picos[i] >= desde && picos[i] < hasta)) };
    })
  };
}

// K5c (paso 1) — la curva de nivel por edad (la que hoy es plana, §K5c) y el % de carreras activas por edad. Una fila por
// split pro (`splitsProData`), con la edad con la que cerró el split y el nivel de ese momento: es el nivel de los que
// SIGUEN jugando a esa edad (los que ya se retiraron no están). `pctDeLasPro` y `pctDeTodas`: las carreras con al menos un
// split pro a esa edad, sobre las que llegaron a pro y sobre todas las del lote. `rPotencialDuracion`: r(potencial oculto,
// splits de carrera pro) entre las que llegaron a pro (el check largo "La duración de la carrera correlaciona con el
// potencial": piso 0,32).
export function bloqueCurvaDeEdad(resultados, observaciones) {
  const llegaronAPro = resultados.filter((r) => r.splitFichaje !== null).length;
  const filas = observaciones.flatMap((o, carrera) => o.splitsProData.map((d) => ({ edad: d.edad, nivel: d.nivel, carrera })));
  const porEdad = [];
  for (let edad = EDAD_CURVA_MIN; edad <= EDAD_CURVA_MAX; edad += 1) {
    const deEstaEdad = filas.filter((fila) => fila.edad === edad);
    const niveles = deEstaEdad.map((fila) => fila.nivel);
    const activas = new Set(deEstaEdad.map((fila) => fila.carrera)).size;
    porEdad.push({
      edad,
      splits: deEstaEdad.length,
      nivel: { p25: redondear(percentil(niveles, 0.25), 1), p50: redondear(mediana(niveles), 1), p75: redondear(percentil(niveles, 0.75), 1) },
      carrerasActivas: activas,
      pctDeLasPro: pct(activas, llegaronAPro),
      pctDeTodas: pct(activas, resultados.length)
    });
  }
  const pros = resultados.filter((r) => r.splitFichaje !== null);
  // K5c (revisión): la duración es la de los años pro (`duracionProDe`: desde el primer contrato de tier 2 o tier 1, sin la ventana
  // de retiro). Reemplaza a `splitCount - splitFichaje`, que contaba desde tier 3 y los años retirado.
  const r = pearson(
    pros.map((estado) => estado.player.oculto.potencial),
    pros.map(duracionProDe)
  );
  return { porEdad, rPotencialDuracion: { r: redondear(r, 3), n: pros.length } };
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
    seriesMedidas: jugabilidades.reduce((suma, j) => suma + j.seriesCerradas, 0),
    poolMainMuertoPorCarrera: (() => {
      const v = promedio(jugabilidades.map((j) => j.poolMainMuerto));
      return v === null ? null : Number(v.toFixed(2));
    })(),
    decisionesPorCarrera: estadisticas(jugabilidades.map((j) => j.decisiones)),
    maestriaMinimaPoolAlFinal: estadisticas(jugabilidades.map((j) => j.maestriaMinimaPool).filter((v) => v !== null))
  };
}

// `opciones.corridasAblacion` (K2a): cuántas carreras corre la ablación de `nivel.varianzaExplicada` (por defecto
// `MAX_CORRIDAS_ABLACION`, las primeras 200). La investigación de K2 midió el R² sin ruido sobre 400.
// K2c (barrido de σ de fecha × vueltas): dos lecturas de las bandas del bloque A que el reporte no trae. Los
// títulos domésticos por carrera (sobre todas las carreras del lote) y la jerarquía media al empezar los splits
// en que corrió la temporada, en ligas modeladas. Ojo: es la de ANTES de las etapas del split, ~2 puntos arriba de
// la que mide la temporada al arrancar (la de la investigación de K2, 71,7 → 55,9): sirve para comparar puntos del
// barrido entre sí, no contra esos números.
export function titulosPorCarrera(resultados) {
  return promedio(resultados.map((r) => r.career.registro.titulos.length));
}

export function jerarquiaMedia(observaciones) {
  return promedio(observaciones.flatMap((o) => o.temporadasData).filter((d) => d.ligaModelada).map((d) => d.jerarquia));
}

export function correrLote(corridas, splits, estrategia, { corridasAblacion = MAX_CORRIDAS_ABLACION } = {}) {
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

  const economia = bloqueEconomia(observaciones);
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
    nivel: bloqueNivel(observaciones, splits, responder, corridasAblacion),
    economia,
    // K3-A: las metas de K3 con la meta al lado (reporte, no check: pasan a duros en K3c).
    metasK3: metasK3(economia),
    longevidad: bloqueLongevidad(resultados),
    ritmo: bloqueRitmo(observaciones),
    porRegion: bloquePorRegion(resultados, carreras, observaciones),
    // K5c (paso 1): el Mundial real (por región y por nivel pico) y la curva de nivel por edad. Bloques APARTE de `embudo`
    // y de `porRegion`: `validate.js` recuenta esas hojas una por una y no admite hojas que no cubra.
    mundialReal: bloqueMundialReal(resultados, observaciones),
    // K5c-H: el % de temporadas de tier 1 en la liga de tu región (total, por región y por nivel pico).
    casa: bloqueCasa(resultados),
    // K5c-M: quién gana el Mundial del mundo (por liga y región), si gana el más fuerte, y la fuerza de cada liga.
    mundoMundial: bloqueMundoMundial(observaciones),
    curvaDeEdad: bloqueCurvaDeEdad(resultados, observaciones),
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
  // K2a: `--ablacion=<n>` sube (o baja) el tope de carreras de la ablación de `nivel.varianzaExplicada`.
  const ablacionArg = process.argv.slice(2).find((arg) => arg.startsWith('--ablacion='))?.slice('--ablacion='.length);
  const corridasAblacion = ablacionArg === undefined ? MAX_CORRIDAS_ABLACION : Number(ablacionArg);
  if (!(Number.isInteger(corridasAblacion) && corridasAblacion >= 1)) {
    console.error(`--ablacion tiene que ser un entero >= 1 (vino ${ablacionArg}).`);
    process.exit(1);
  }
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
    console.log(JSON.stringify(NOMBRES_ESTRATEGIA.map((nombre) => recortar(correrLote(corridas, splits, nombre, { corridasAblacion }))), null, 2));
  } else {
    console.log(JSON.stringify(recortar(correrLote(corridas, splits, estrategia, { corridasAblacion })), null, 2));
  }
}
