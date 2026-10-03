// El contrafáctico de agencia: para cada parada del juego, ¿elegir distinto cambia el número de la carrera?
//
// K4c (paso 1): con potencia y por tipo de parada. Uso (desde la raíz del repo):
//   node src/dev/agencia.js --carreras=12 --reps=30 --cuota=2 --splits=70 --procesos=12 --salida=agencia-k4c.json
// `--reps=30` es lo que pide §K.0c (>= 30 réplicas por decisión); `--procesos=N` reparte las carreras entre N procesos de
// Node (una carrera por proceso, de a N a la vez) y junta los crudos: da EXACTAMENTE los mismos datos que correrlas en serie
// (cada carrera depende solo de su seed), pero tarda ~1/N. Con `--salida` guarda los crudos y `--analizar=a.json,b.json` los
// vuelve a analizar sin simular. `--sin=tipo1,tipo2` dice cuánta palanca queda si esas paradas se resuelven solas.
// El reporte trae, además de la tabla de siempre, la palanca POR TIPO DE PARADA (los mismos tipos que `desglosePorTipo` del
// bloque `ritmo` de simulate.js) y la tabla de recorte: qué queda si se resuelven solas, de a una, las de menos palanca.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplit, resolverDecision, avanzarSplitAuto } from '../core/pipeline.js';
import { sistemaPorId } from '../systems/registro.js';
import { nivelDelJugador } from '../core/ficha.js';
import { hashCadena } from '../core/numeros.js';
import { tierMasAltoJugado } from '../core/registro.js';
import { puntajeDeCarrera } from '../core/puntaje.js';
import {
  RESULTADO_MINIJUEGO_BIEN, RESULTADO_MINIJUEGO_MAL, esDecisionDeMinijuego, esDecisionDeMercado
} from './estrategias.js';
import { promedio, medianaInferior, desvioMuestral } from './simulate.js';

// Los valores por defecto de la CLI y de `medirAgencia` (antes duplicados en los dos): 12 carreras con 6 réplicas
// por opción, a lo sumo 2 decisiones medidas por tipo y por carrera, hasta 70 splits (los de AUDITORIA.md §4.3),
// seeds desde la 1, y 60 carreras para la σ poblacional del puntaje.
export const DEFAULTS_AGENCIA = {
  carreras: 12,
  reps: 6,
  cuota: 2,
  splits: 70,
  desde: 1,
  sigmaCarreras: 60
};

// Mínimos para que la medición tenga sentido: con una sola réplica por opción no hay varianza de las
// diferencias (la t pareada sale infinita con cualquier diferencia) y con 0 carreras no se mide nada.
export const MIN_REPS_AGENCIA = 2;
export const MIN_CARRERAS_AGENCIA = 1;
// La meta de K4c (§K.0c): >= 30 réplicas por decisión. Con menos, `agencia.js` avisa (no cambia el default).
export const META_REPS_K4C = 30;

// Umbral mínimo de porcentaje de decisiones con efecto estadísticamente significativo (ver `ALFA_FAMILIA`)
// para considerar que un tipo de decisión tiene "palanca" real en el final de carrera (PLAN.md §K.5 K0 / AUDITORIA.md §4.3).
export const UMBRAL_SIGNIFICATIVO = 10;

// Cuántas réplicas válidas por opción hacen falta para analizar una decisión: `min(MIN_REPLICAS_VALIDAS,
// reps)`. La auditoría (AUDITORIA.md §4.3) exigía 4 con 8 réplicas por opción; con una corrida corta (como
// la del check, `--reps=2`) pedir 4 descartaría todo, así que el piso baja a las réplicas que se pidieron.
export const MIN_REPLICAS_VALIDAS = 4;

// Nivel de error de la FAMILIA de comparaciones de UNA decisión: la probabilidad de declarar "hay palanca"
// cuando ninguna opción tiene efecto. Es 5% (el p < 0,05 de la auditoría) repartido por Bonferroni entre los
// K·(K−1)/2 pares de opciones, ver `testMaximoT`.
export const ALFA_FAMILIA = 0.05;

// σ poblacional de referencia del puntaje: cuántas carreras simula, desde qué seed y hasta cuántos splits.
// La seed arranca en 1001 para NO pisar las de la medición (que arrancan en 1 por defecto) y los 70 splits
// son los de la auditoría (`--splits=70` por defecto).
const SEMILLA_BASE_SIGMA = 1001;
const SPLITS_SIGMA_POBLACION = 70;

// Desvío estándar por debajo del cual las diferencias entre dos opciones se consideran todas iguales (la t
// pareada se define aparte, ±Infinity o 0, en vez de dividir por ~0). Los puntajes son sumas de enteros y
// medios, así que un desvío real de una decisión que sí tiene varianza es ≥ 0,1 (el paso más chico de
// `fin.score` es 1): 1e-9 es un cero numérico, no un umbral de diseño.
const EPSILON_DESVIO = 1e-9;

// La función objetivo del contrafáctico (K3c, trampa T6): el número de la carrera que ve el jugador,
// `puntajeDeCarrera(state).total` (`core/puntaje.js`). Hasta K3c era el puntaje provisorio de AUDITORIA.md §4.3
// (títulos, internacionales, ranking, splits en tier 1 y llegar a pro), que K1 dejó a propósito para no mover la
// línea de base de §K.0b; K3c la re-mide con este. La comparten las réplicas (`metricas`) y la σ poblacional
// (`sigmaPoblacional`): las dos tienen que medir con la misma vara.
export function puntajeDeAgencia(st) {
  return puntajeDeCarrera(st).total;
}

function metricas(st) {
  const r = st.career.registro;
  return {
    score: puntajeDeAgencia(st),
    titulos: r.titulos.length,
    // K1 (D75): "llegó a tier 1" = jugó al menos un split con contrato en tier 1.
    t1: tierMasAltoJugado(r) === 1 ? 1 : 0,
    splits: r.splitsJugados,
    rank: r.picos.rankMundial ?? 0
  };
}

function corto(st) {
  return {
    pos: st.career.posicion ?? null,
    nivel: nivelDelJugador(st),
    jer: st.career.jerarquia,
    ment: st.player.stats.mentalidad,
    hype: st.player.stats.hype,
    elo: st.player.soloqElo
  };
}

function terminarCarrera(st, rng, splitsHechos, maxSplits) {
  let s = st;
  let n = splitsHechos;
  let corto1 = null;

  while (s.pendiente) {
    const { sistemaId, decision } = s.pendiente;
    const sis = sistemaPorId(sistemaId);
    s = resolverDecision(s, sis.resolverAuto(s, decision, rng), rng).state;
  }

  const splitAlDecidir = st.player.splitCount;
  while (!s.terminado && n < maxSplits) {
    s = avanzarSplitAuto(s, rng).state;
    n += 1;
    if (corto1 === null && s.player.splitCount >= splitAlDecidir + 1) {
      corto1 = corto(s);
    }
  }

  return { fin: metricas(s), c1: corto1 ?? corto(s) };
}

function opcionesDe(decision) {
  if (esDecisionDeMinijuego(decision)) {
    return [
      { resultado: RESULTADO_MINIJUEGO_MAL, _l: 'mal' },
      { resultado: RESULTADO_MINIJUEGO_BIEN, _l: 'bien' }
    ];
  }
  if (esDecisionDeMercado(decision)) {
    const ops = (decision.opciones ?? []).map((o) => ({ opcionId: o.id, _l: o.org ?? o.id }));
    return [...ops, { negociar: 'esperar', _l: 'esperar' }];
  }
  return (decision.opciones ?? []).map((o) => ({ opcionId: o.id, _l: o.id }));
}

function tipoDe(sistemaId, decision) {
  const m = decision.datos?.motivo ?? decision.presentacion ?? 'x';
  const cat = decision.datos?.evento?.categoria;
  return `${sistemaId}:${m}${cat ? ':' + cat : ''}`;
}

// Estadística compartida con simulate.js (`promedio`, `desvioMuestral`). `mean` devuelve 0 con una lista
// vacía (`promedio` devuelve null); `med` es la mediana INFERIOR, la que usaba el análisis de la auditoría.
const mean = (a) => promedio(a) ?? 0;
const sd = desvioMuestral;
const med = medianaInferior;

// Valor crítico de t bilateral con p < 0,05, por grados de libertad (df 1 a 30); con más de 30 se usa el
// límite normal, 1,96. Es la tabla de la auditoría: la usa el test VIEJO (`significativaTestViejo`) y es la
// referencia contra la que `validate.js` valida `tCriticoBilateral`; el test nuevo calcula el crítico para
// cualquier α con `tCriticoBilateral`.
const T_CRITICO_BILATERAL = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060,
  26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042
};
const T_CRITICO_NORMAL = 1.96;

export function tCritico(df) {
  return T_CRITICO_BILATERAL[df] ?? T_CRITICO_NORMAL;
}

// --- Cuantil de la t de Student, sin dependencias --------------------------------------------------------------
// P(|T| > t) con `df` grados de libertad = I_x(df/2, 1/2) con x = df / (df + t²), donde I es la función beta
// incompleta regularizada (fracción continua de Lentz, Numerical Recipes §6.4); ln Γ por la aproximación de
// Lanczos (g = 7, 9 términos). El cuantil sale por bisección sobre t.

// Coeficientes de Lanczos para g = 7, n = 9 (Godfrey): error relativo de ln Γ < 1e-15 para x ≥ 0,5.
const LANCZOS_G = 7;
const COEFICIENTES_LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
];
const LN_RAIZ_DOS_PI = 0.5 * Math.log(2 * Math.PI);

// Iteraciones máximas de la fracción continua y su tolerancia: converge en < 30 iteraciones para los df y α
// de esta herramienta, y el piso evita dividir por cero en el algoritmo de Lentz.
const ITERACIONES_FRACCION_CONTINUA = 300;
const TOLERANCIA_FRACCION_CONTINUA = 1e-14;
const PISO_LENTZ = 1e-300;

// Pasos de la bisección sobre t: cada paso divide el intervalo a la mitad, 200 pasos agotan la precisión del
// double mucho antes. El techo del bracket (`T_MAXIMO_BRACKET`) es el de la t con df = 1 y α ≈ 1e-14.
const PASOS_BISECCION = 200;
const T_MAXIMO_BRACKET = 1e15;

function lnGamma(z) {
  const x = z - 1;
  let suma = COEFICIENTES_LANCZOS[0];
  for (let i = 1; i < COEFICIENTES_LANCZOS.length; i += 1) {
    suma += COEFICIENTES_LANCZOS[i] / (x + i);
  }
  const t = x + LANCZOS_G + 0.5;
  return LN_RAIZ_DOS_PI + (x + 0.5) * Math.log(t) - t + Math.log(suma);
}

function fraccionContinuaBeta(x, a, b) {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < PISO_LENTZ) d = PISO_LENTZ;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= ITERACIONES_FRACCION_CONTINUA; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < PISO_LENTZ) d = PISO_LENTZ;
    c = 1 + aa / c;
    if (Math.abs(c) < PISO_LENTZ) c = PISO_LENTZ;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < PISO_LENTZ) d = PISO_LENTZ;
    c = 1 + aa / c;
    if (Math.abs(c) < PISO_LENTZ) c = PISO_LENTZ;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < TOLERANCIA_FRACCION_CONTINUA) break;
  }
  return h;
}

// I_x(a, b): la beta incompleta regularizada. Usa la simetría I_x(a, b) = 1 − I_{1−x}(b, a) donde la fracción
// continua converge más rápido (x > (a + 1) / (a + b + 2)).
function betaIncompletaRegularizada(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnFrente = lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  if (x < (a + 1) / (a + b + 2)) {
    return (Math.exp(lnFrente) * fraccionContinuaBeta(x, a, b)) / a;
  }
  return 1 - (Math.exp(lnFrente) * fraccionContinuaBeta(1 - x, b, a)) / b;
}

// P(|T| > t) para una t de Student con `df` grados de libertad (t ≥ 0).
function colasDeT(t, df) {
  return betaIncompletaRegularizada(df / (df + t * t), df / 2, 0.5);
}

const cacheTCritico = new Map();

// Valor crítico de la t de Student BILATERAL con `df` grados de libertad: el t > 0 tal que P(|T| > t) = alfa.
// Para alfa = 0,05 coincide con `tCritico` (la tabla) hasta el 4º decimal.
export function tCriticoBilateral(df, alfa) {
  if (!(df >= 1) || !(alfa > 0 && alfa < 1)) {
    throw new RangeError(`tCriticoBilateral(df = ${df}, alfa = ${alfa}): hace falta df >= 1 y 0 < alfa < 1`);
  }
  const clave = `${df}|${alfa}`;
  if (cacheTCritico.has(clave)) {
    return cacheTCritico.get(clave);
  }
  let alto = 1;
  while (colasDeT(alto, df) > alfa && alto < T_MAXIMO_BRACKET) {
    alto *= 2;
  }
  let bajo = 0;
  for (let paso = 0; paso < PASOS_BISECCION; paso += 1) {
    const medio = (bajo + alto) / 2;
    if (colasDeT(medio, df) > alfa) {
      bajo = medio;
    } else {
      alto = medio;
    }
  }
  const t = (bajo + alto) / 2;
  cacheTCritico.set(clave, t);
  return t;
}

// t pareada de una lista de diferencias: media / (desvío / √n). Con desvío ~0 (todas las diferencias iguales)
// la t no está definida: ±Infinity si la diferencia es constante y distinta de 0, 0 si es 0.
function tPareada(dif) {
  const n = dif.length;
  const m = mean(dif);
  const s = sd(dif);
  if (s > EPSILON_DESVIO) {
    return m / (s / Math.sqrt(n));
  }
  return m !== 0 ? Math.sign(m) * Infinity : 0;
}

// ¿Hay un efecto real entre las opciones de UNA decisión? `scores[i][r]` = puntaje final de la opción i en la
// réplica r (`null` si esa réplica reventó). Las réplicas están PAREADAS por números aleatorios comunes (la
// réplica r usa el mismo rng para todas las opciones, ver `replicasDeDecision`), así que cada par de opciones se
// compara con una t pareada sobre las réplicas válidas en TODAS las opciones.
//
// El test es el del MÁXIMO |t| sobre todos los pares K·(K−1)/2, con Bonferroni: la decisión es significativa
// si algún par supera el crítico bilateral de α = `alfaFamilia` / (nº de pares) con df = n − 1. Así la
// probabilidad de un falso positivo de la familia entera es ≤ `alfaFamilia` sin importar cuántas opciones
// haya (con 2 opciones es un solo par y el test es el de siempre).
//
// Por qué no el test viejo (`significativaTestViejo`): elegía la mejor y la peor opción POR SUS MEDIAS EN LA
// MISMA MUESTRA y las comparaba al 5%; con K opciones el máximo de K medias está sesgado hacia arriba y el
// falso positivo crece con K. Medido bajo la nula: K opciones que son réplicas del mismo proceso (ninguna tiene efecto),
// 6 réplicas, 20.000 decisiones sintéticas por K, números normales de `mulberry32(20261001)` (cada puntaje = un efecto
// común de la réplica, que comparten las opciones por los números aleatorios comunes, + ruido propio de la opción), pasadas
// por `analizarDatosAgencia`; es la misma medición del check "K0 agencia bajo la nula" de `validate.js`, que corre 10.000:
//
//   K (opciones)               2       3       4       5       6
//   test viejo (antes)       5,13%  10,74%  16,11%  21,45%  25,63%
//   test del máximo |t|      5,14%   4,55%   4,61%   4,71%   4,59%   (después)
//
// Con 2 opciones (un solo par) los dos tests coinciden salvo en el borde de la tabla (2,571 contra 2,5706 de df 5): 2 de
// 20.000 decisiones. El error estándar de cada celda es 0,15 pp. Un revisor independiente midió el test viejo con otro
// generador y 6 réplicas: 5,1 / 11,5 / 16,4 / 20,6 / 26,1%.
export function testMaximoT(scores, alfaFamilia = ALFA_FAMILIA) {
  const k = scores.length;
  const largo = Math.max(0, ...scores.map((s) => s.length));
  const validas = [];
  for (let r = 0; r < largo; r += 1) {
    if (scores.every((s) => s[r] !== null && s[r] !== undefined)) {
      validas.push(r);
    }
  }
  const n = validas.length;
  const pares = (k * (k - 1)) / 2;
  if (n < 2 || pares < 1) {
    return { sig: false, tMax: 0, tCritico: Infinity, n, pares };
  }
  const tCrit = tCriticoBilateral(n - 1, alfaFamilia / pares);
  let tMax = 0;
  for (let i = 0; i < k; i += 1) {
    for (let j = i + 1; j < k; j += 1) {
      const t = Math.abs(tPareada(validas.map((r) => scores[i][r] - scores[j][r])));
      if (t > tMax) tMax = t;
    }
  }
  return { sig: tMax > tCrit, tMax, tCritico: tCrit, n, pares };
}

// El test de la auditoría (AUDITORIA.md §4.3), tal cual: la mejor y la peor opción por sus medias, t pareada
// al 5% con la tabla. Se conserva SOLO para comparar (`pctInterrupcionesConPalancaAuditoriaTestViejo`) y para
// medir su tasa de falsos positivos; no es un test válido con 3 o más opciones. `vals[i]` = las réplicas
// válidas de la opción i, sin alinear por réplica.
export function significativaTestViejo(vals) {
  const medias = vals.map((v) => mean(v.map((x) => x.fin.score)));
  const iMax = medias.indexOf(Math.max(...medias));
  const iMin = medias.indexOf(Math.min(...medias));
  const n = Math.min(vals[iMax].length, vals[iMin].length);
  const dif = Array.from({ length: n }, (_, r) => vals[iMax][r].fin.score - vals[iMin][r].fin.score);
  const sDif = sd(dif);
  const tcrit = tCritico(Math.max(1, n - 1));
  const t = sDif > EPSILON_DESVIO ? mean(dif) / (sDif / Math.sqrt(n)) : (mean(dif) !== 0 ? Infinity : 0);
  return Math.abs(t) > tcrit;
}

// Un mensaje de error si los parámetros no permiten una medición con sentido; `null` si están bien. `!(x >= m)`
// y no `x < m`: un NaN (un `--reps=abc`) tampoco pasa.
export function validarParametrosAgencia({ carreras, reps, cuota, splits }) {
  if (!(Number(reps) >= MIN_REPS_AGENCIA)) {
    return `--reps=${reps}: hacen falta al menos ${MIN_REPS_AGENCIA} réplicas por opción (con una sola no hay varianza y la t pareada sale infinita).`;
  }
  if (!(Number(carreras) >= MIN_CARRERAS_AGENCIA)) {
    return `--carreras=${carreras}: hace falta al menos ${MIN_CARRERAS_AGENCIA} carrera (con 0 no se mide ninguna decisión).`;
  }
  if (!(Number(cuota) >= 1)) {
    return `--cuota=${cuota}: hace falta al menos 1 decisión medida por tipo y por carrera.`;
  }
  if (!(Number(splits) >= 1)) {
    return `--splits=${splits}: hace falta al menos 1 split.`;
  }
  return null;
}

// Las réplicas de UNA decisión: `reps` veces, cada opción de `ops` se responde sobre un clon del estado y la
// carrera sigue sola hasta `splits`. NÚMEROS ALEATORIOS COMUNES: la réplica r usa el MISMO rng (la misma seed)
// para todas las opciones, así que dos opciones idénticas dan exactamente el mismo resultado réplica por
// réplica y la diferencia entre opciones queda libre del azar compartido. Es lo que hace válida la t pareada.
// Devuelve `porOpcion[i][r]` = `{ fin, c1 }` de la opción i en la réplica r, o `null` si esa réplica reventó EN
// CUALQUIER PUNTO (al responder la decisión o mientras la carrera seguía sola): una réplica rota no tira abajo la
// medición. Si se pasa `fallos` (un arreglo), cada réplica rota se anota ahí con su seed, decisión, opción, réplica y
// la primera línea del error. `terminar` es la carrera que sigue sola (inyectable para probar el manejo del error).
export function replicasDeDecision(st, ops, { seed, splitCount, tipo, reps, splits, fallos = null, terminar = terminarCarrera }) {
  const porOpcion = ops.map(() => []);
  for (let r = 0; r < Number(reps); r += 1) {
    ops.forEach((op, i) => {
      const rr = mulberry32(hashCadena(`${seed}|${splitCount}|${tipo}|${r}`));
      const clon = structuredClone(st);
      const { _l, ...resp } = op;
      try {
        const s2 = resolverDecision(clon, resp, rr).state;
        porOpcion[i].push(terminar(s2, rr, splitCount, Number(splits)));
      } catch (error) {
        porOpcion[i].push(null);
        if (fallos) {
          fallos.push({ seed, split: splitCount, tipo, opcion: _l ?? i, replica: r, error: primeraLinea(error) });
        }
      }
    });
  }
  return porOpcion;
}

function primeraLinea(error) {
  return String(error?.message ?? error).split('\n')[0];
}

// Una línea por réplica rota (o por seed fallida): lo que sale en la salida de agencia.js cuando una medición tuvo fallos.
export function describirFallos(fallos) {
  return fallos.map((f) => (f.proceso
    ? `seed ${f.seed}: la carrera entera falló (${f.error})`
    : `seed ${f.seed}, split ${f.split}, decisión ${f.tipo}, opción ${f.opcion}, réplica ${f.replica}: ${f.error}`));
}

export function medirAgencia({
  carreras = DEFAULTS_AGENCIA.carreras,
  reps = DEFAULTS_AGENCIA.reps,
  cuota = DEFAULTS_AGENCIA.cuota,
  splits = DEFAULTS_AGENCIA.splits,
  desde = DEFAULTS_AGENCIA.desde,
  terminar = terminarCarrera
} = {}) {
  const problema = validarParametrosAgencia({ carreras, reps, cuota, splits });
  if (problema) {
    throw new RangeError(problema);
  }
  const resultados = [];
  const baseline = [];
  const frecuenciasTipo = {};
  let totalInterrupciones = 0;
  const fallos = [];

  for (let seed = Number(desde); seed < Number(desde) + Number(carreras); seed += 1) {
    const rng = mulberry32(seed);
    let st = createInitialState(seed, rng);
    let splitCount = 0;
    const usados = {};

    while (!st.terminado && splitCount < Number(splits)) {
      let res = avanzarSplit(st, rng);
      st = res.state;

      while (st.pendiente) {
        totalInterrupciones += 1;
        const { sistemaId, decision } = st.pendiente;
        const tipo = tipoDe(sistemaId, decision);
        frecuenciasTipo[tipo] = (frecuenciasTipo[tipo] ?? 0) + 1;

        const ops = opcionesDe(decision);
        if (ops.length >= 2 && (usados[tipo] ?? 0) < Number(cuota)) {
          usados[tipo] = (usados[tipo] ?? 0) + 1;
          const porOpcion = replicasDeDecision(st, ops, { seed, splitCount, tipo, reps, splits, fallos, terminar });
          resultados.push({ seed, split: splitCount, tipo, labels: ops.map((o) => o._l), porOpcion });
        }

        const sis = sistemaPorId(sistemaId);
        st = resolverDecision(st, sis.resolverAuto(st, decision, rng), rng).state;
      }
      splitCount += 1;
    }
    baseline.push(metricas(st));
  }

  return { baseline, resultados, frecuenciasTipo, totalInterrupciones, carreras: baseline.length, fallos };
}

// K4c (paso 1): junta las mediciones de varios procesos (una por carrera o por tramo de seeds) en una sola, en el orden
// dado. Puro: la medición de una carrera no depende de las demás, así que el resultado es el de correrlas en serie.
export function combinarMediciones(partes) {
  const combinada = { baseline: [], resultados: [], frecuenciasTipo: {}, totalInterrupciones: 0, carreras: 0, fallos: [] };
  for (const parte of partes) {
    combinada.baseline.push(...parte.baseline);
    combinada.resultados.push(...parte.resultados);
    for (const [tipo, cantidad] of Object.entries(parte.frecuenciasTipo)) {
      combinada.frecuenciasTipo[tipo] = (combinada.frecuenciasTipo[tipo] ?? 0) + cantidad;
    }
    combinada.totalInterrupciones += parte.totalInterrupciones;
    combinada.carreras += parte.carreras ?? parte.baseline.length;
    combinada.fallos.push(...(parte.fallos ?? []));
  }
  return combinada;
}

// El tipo de parada tal como lo cuenta `desglosePorTipo` (simulate.js): sistema:motivo, sin la categoría que agencia le
// agrega a los eventos (`eventos:x:rutina` -> `eventos:x`).
export function tipoDeParada(tipo) {
  return tipo.split(':').slice(0, 2).join(':');
}

// La palanca por tipo de parada. `porParada[tipo]` = una fila `{ sig, L }` por decisión medida (si el test corregido la
// declara significativa, y su palanca en σ). `frecuenciasTipo` = cuántas veces paró cada tipo en las carreras medidas
// (con la categoría; se normaliza igual). Un tipo que paró pero nunca se midió (una parada con un solo camino) queda con
// `n: 0` y fracción 0: palanca cero, como en el KPI. `divisor` = el total de paradas, el del KPI (`pctInterrupcionesConPalanca`).
// `aportePct` = lo que ese tipo suma al KPI, en puntos porcentuales del total de paradas.
export function palancaPorTipoDeParada(porParada, frecuenciasTipo, carreras, divisor) {
  const frecuencia = {};
  for (const [tipo, cantidad] of Object.entries(frecuenciasTipo)) {
    const normalizado = tipoDeParada(tipo);
    frecuencia[normalizado] = (frecuencia[normalizado] ?? 0) + cantidad;
  }
  const tipos = new Set([...Object.keys(frecuencia), ...Object.keys(porParada)]);
  return [...tipos]
    .map((tipo) => {
      const decisiones = porParada[tipo] ?? [];
      const veces = frecuencia[tipo] ?? 0;
      const fraccionSignificativa = decisiones.length > 0 ? mean(decisiones.map((x) => (x.sig ? 1 : 0))) : 0;
      return {
        tipo,
        frecuencia: veces,
        porCarrera: carreras ? Number((veces / carreras).toFixed(2)) : null,
        n: decisiones.length,
        fraccionSignificativa,
        pctSignificativo: Number((100 * fraccionSignificativa).toFixed(1)),
        palancaMediana: decisiones.length > 0 ? Number((med(decisiones.map((x) => x.L)) ?? 0).toFixed(2)) : null,
        aportePct: Number(((veces * fraccionSignificativa / divisor) * 100).toFixed(1))
      };
    })
    .sort((a, b) => b.frecuencia - a.frecuencia);
}

// Qué queda si los tipos de `quitar` dejan de parar (se resuelven solos): las paradas que sobreviven y la fracción
// ponderada de ellas que tiene palanca (la meta de §K.0c es >= 60%). `paradas` = `palancaPorTipoDeParada`. Puro.
export function palancaSobreLasQueQuedan(paradas, quitar = [], carreras = null) {
  const fuera = new Set(quitar);
  const quedan = paradas.filter((parada) => !fuera.has(parada.tipo));
  const total = quedan.reduce((suma, parada) => suma + parada.frecuencia, 0);
  const conPalanca = quedan.reduce((suma, parada) => suma + parada.frecuencia * parada.fraccionSignificativa, 0);
  return {
    paradas: total,
    paradasPorCarrera: carreras ? Number((total / carreras).toFixed(1)) : null,
    pctPalanca: total > 0 ? Number(((conPalanca / total) * 100).toFixed(1)) : null
  };
}

// La tabla para decidir el recorte: se resuelven solos, de a uno, los tipos de MENOS palanca (a igual palanca, el más
// frecuente primero), y cada fila dice qué queda. Los tipos con pocas decisiones medidas (`n`) tienen una fracción poco firme.
export function tablaDeRecorte(paradas, carreras = null) {
  const orden = paradas
    .filter((parada) => parada.frecuencia > 0)
    .sort((a, b) => a.fraccionSignificativa - b.fraccionSignificativa || b.frecuencia - a.frecuencia);
  const quitados = [];
  return orden.map((parada) => {
    quitados.push(parada.tipo);
    return {
      quitando: parada.tipo,
      pctSignificativo: parada.pctSignificativo,
      n: parada.n,
      ...palancaSobreLasQueQuedan(paradas, quitados, carreras)
    };
  });
}

// σ poblacional de referencia del puntaje y de los títulos (determinista): `sigmaCarreras` carreras con el
// criterio por defecto del motor. Aparte para que `analizarDatosAgencia` pueda recibirlo ya calculado.
export function sigmaPoblacional(sigmaCarreras = DEFAULTS_AGENCIA.sigmaCarreras) {
  const pop = [];
  const popT = [];
  for (let seed = SEMILLA_BASE_SIGMA; seed < SEMILLA_BASE_SIGMA + Number(sigmaCarreras); seed += 1) {
    const rng = mulberry32(seed);
    let st = createInitialState(seed, rng);
    let n = 0;
    while (!st.terminado && n < SPLITS_SIGMA_POBLACION) {
      st = avanzarSplitAuto(st, rng).state;
      n += 1;
    }
    pop.push(puntajeDeAgencia(st));
    popT.push(st.career.registro.titulos.length);
  }
  return { sPop: sd(pop) || 1, sPopT: sd(popT) || 1 };
}

// `referencia` (opcional) = `{ sPop, sPopT }` ya calculados: así el análisis se puede probar con un
// conjunto sintético sin simular la población.
//
// `pctInterrupcionesConPalanca` (el KPI de K.3c): el PONDERADO, sin umbral. Para cada tipo de decisión, su
// frecuencia entre las interrupciones de las carreras medidas × la fracción de sus decisiones con efecto
// significativo (`testMaximoT`), sumado y dividido por el TOTAL de interrupciones:
//   Σ_tipos frecuencia(tipo) × fracciónSignificativa(tipo) / totalInterrupciones.
// Es lo que el jugador siente: "de cada 100 veces que el juego me frena, ¿cuántas cambian algo?".
//
// `pctInterrupcionesConPalancaAuditoria`: el cálculo de la auditoría (AUDITORIA.md §4.3), TODO-O-NADA: la
// frecuencia entera de un tipo cuenta si el tipo llega a `UMBRAL_SIGNIFICATIVO` % de decisiones
// significativas, y nada si no llega. Es el que se compara con el ~17% de la auditoría, pero NO es
// idénticamente comparable: acá la significancia sale del test corregido por comparaciones múltiples
// (`testMaximoT`), la auditoría usaba el test viejo. `...AuditoriaTestViejo` es el mismo cálculo con el test
// viejo (`significativaTestViejo`), para ver cuánto del número era inflación del test.
export function analizarDatosAgencia(
  datosCombinados,
  sigmaCarreras = DEFAULTS_AGENCIA.sigmaCarreras,
  referencia = null
) {
  const { resultados, frecuenciasTipo = {}, totalInterrupciones = 0, carreras = datosCombinados.baseline?.length ?? null } = datosCombinados;

  const { sPop, sPopT } = referencia ?? sigmaPoblacional(sigmaCarreras);

  const porTipo = {};
  const porParada = {};

  for (const d of resultados) {
    const vals = d.porOpcion.map((repsArr) => repsArr.filter(Boolean));
    const repsPedidas = d.porOpcion[0]?.length ?? MIN_REPLICAS_VALIDAS;
    const test = testMaximoT(d.porOpcion.map((repsArr) => repsArr.map((x) => (x ? x.fin.score : null))));
    // Las réplicas válidas en TODAS las opciones son las que se pueden parear; con menos del mínimo no se analiza.
    if (test.n < Math.min(MIN_REPLICAS_VALIDAS, repsPedidas)) {
      continue;
    }

    const medias = vals.map((v) => mean(v.map((x) => x.fin.score)));
    const spread = Math.max(...medias) - Math.min(...medias);
    const sig = test.sig;
    const sigViejo = significativaTestViejo(vals);

    const dentro = mean(vals.map((v) => sd(v.map((x) => x.fin.score))));
    const mT = vals.map((v) => mean(v.map((x) => x.fin.titulos)));
    const mT1 = vals.map((v) => mean(v.map((x) => x.fin.t1)));
    const cortoDiff = (k) => {
      const m = vals.map((v) => mean(v.map((x) => x.c1[k] ?? 0)));
      return Math.max(...m) - Math.min(...m);
    };

    const parada = tipoDeParada(d.tipo);
    porParada[parada] = porParada[parada] ?? [];
    porParada[parada].push({ sig, L: spread / sPop });

    const tipoNormalizado = d.tipo.replace(/:x:/, ':').replace(/^edadCierre:.*/, 'edadCierre:*');
    const clave = tipoNormalizado.startsWith('eventos:') ? 'eventos:*' : tipoNormalizado;

    for (const k of [clave, tipoNormalizado !== clave ? tipoNormalizado : null].filter(Boolean)) {
      porTipo[k] = porTipo[k] ?? [];
      porTipo[k].push({
        L: spread / sPop,
        sig,
        sigViejo,
        dentroRel: dentro / sPop,
        dTit: Math.max(...mT) - Math.min(...mT),
        dT1: Math.max(...mT1) - Math.min(...mT1),
        dPos: cortoDiff('pos'),
        dNivel: cortoDiff('nivel'),
        dJer: cortoDiff('jer'),
        dMent: cortoDiff('ment'),
        dHype: cortoDiff('hype'),
        dElo: cortoDiff('elo')
      });
    }
  }

  const filas = Object.entries(porTipo)
    .filter(([, v]) => v.length >= 1)
    .sort((a, b) => med(b[1].map((x) => x.L)) - med(a[1].map((x) => x.L)));

  // Cálculo de las interrupciones con palanca, ponderado por la frecuencia real de cada tipo.
  let interrupcionesConPalancaAuditoria = 0;
  let interrupcionesConPalancaAuditoriaViejo = 0;
  let interrupcionesPonderadas = 0;
  let totalInterrupcionesContadas = 0;

  for (const [clave, v] of Object.entries(porTipo)) {
    // Tomar solo claves agregadas principales para no duplicar conteo
    if (clave.includes(':') && clave !== 'eventos:*' && clave.startsWith('eventos:')) {
      continue;
    }
    const freq = Object.entries(frecuenciasTipo).reduce((acum, [k, cant]) => {
      const match = (clave === 'eventos:*' && k.startsWith('eventos:'))
        || (clave === 'edadCierre:*' && k.startsWith('edadCierre:'))
        || k === clave;
      return match ? acum + cant : acum;
    }, 0);

    const fraccionSig = mean(v.map((x) => (x.sig ? 1 : 0)));
    const pctSig = 100 * fraccionSig;
    const pctSigViejo = 100 * mean(v.map((x) => (x.sigViejo ? 1 : 0)));
    if (pctSig >= UMBRAL_SIGNIFICATIVO) {
      interrupcionesConPalancaAuditoria += freq;
    }
    if (pctSigViejo >= UMBRAL_SIGNIFICATIVO) {
      interrupcionesConPalancaAuditoriaViejo += freq;
    }
    interrupcionesPonderadas += freq * fraccionSig;
    totalInterrupcionesContadas += freq;
  }

  // El denominador son TODAS las interrupciones de las carreras medidas, no solo las de los tipos que
  // llegaron a medirse: una interrupción sin elección real (un solo camino) tiene palanca cero, y sacarla
  // de la cuenta inflaría el porcentaje. Los archivos crudos viejos sin `totalInterrupciones` caen al total
  // de las frecuencias contadas.
  const divisor = totalInterrupciones || totalInterrupcionesContadas || 1;
  const sobreElTotal = (cantidad) => Number(((cantidad / divisor) * 100).toFixed(1));

  const porTipoDeParada = palancaPorTipoDeParada(porParada, frecuenciasTipo, carreras, divisor);

  return {
    sPop: Number(sPop.toFixed(2)),
    sPopT: Number(sPopT.toFixed(2)),
    carreras,
    totalDecisionesMedidas: resultados.length,
    // K4c (paso 1): la palanca por tipo de parada (los tipos de `desglosePorTipo`) y la fracción ponderada sobre el total
    // de paradas, sumando los tipos (`pctInterrupcionesConPalanca` agrupa los eventos de otra forma: difiere en décimas).
    porTipoDeParada,
    pctPalancaPorTipoDeParada: Number(((porTipoDeParada.reduce((suma, fila) => suma + fila.frecuencia * fila.fraccionSignificativa, 0) / divisor) * 100).toFixed(1)),
    filas: filas.map(([tipo, v]) => ({
      tipo,
      n: v.length,
      palancaMediana: Number((med(v.map((x) => x.L)) ?? 0).toFixed(2)),
      pctSignificativo: Number((100 * mean(v.map((x) => (x.sig ? 1 : 0)))).toFixed(1)),
      ruidoDentro: Number((med(v.map((x) => x.dentroRel)) ?? 0).toFixed(2)),
      dTitulosMed: Number((med(v.map((x) => x.dTit)) ?? 0).toFixed(2)),
      dTier1Med: Number((med(v.map((x) => x.dT1)) ?? 0).toFixed(2))
    })),
    pctInterrupcionesConPalanca: sobreElTotal(interrupcionesPonderadas),
    pctInterrupcionesConPalancaAuditoria: sobreElTotal(interrupcionesConPalancaAuditoria),
    pctInterrupcionesConPalancaAuditoriaTestViejo: sobreElTotal(interrupcionesConPalancaAuditoriaViejo)
  };
}

// K4c (paso 1): `medirAgencia` repartido en procesos. Cada carrera es un proceso hijo (`--soloMedir`: mide y guarda los
// crudos en un archivo temporal, sin analizar), de a `procesos` a la vez; al final se juntan en el orden de las seeds. Es lo
// mismo que correrlas en serie (la medición de una carrera solo depende de su seed) en ~1/procesos del tiempo.
// Un hijo que termina mal NO mata al resto: su seed queda como fallida (`fallos`, con `proceso: true`) y las demás se
// juntan igual. El directorio temporal se borra siempre. `archivo` y `base` son inyectables (para probarlo sin simular).
export async function medirEnProcesos({
  carreras, reps, cuota, splits, desde, procesos, archivo = fileURLToPath(import.meta.url), base = os.tmpdir()
}) {
  const dir = fs.mkdtempSync(path.join(base, 'agencia-'));
  try {
    const seeds = Array.from({ length: Number(carreras) }, (_, i) => Number(desde) + i);
    const inicio = Date.now();
    let siguiente = 0;
    let terminadas = 0;
    const fallosDeProceso = new Map();

    const correrUna = (seed) => new Promise((resolve) => {
      const parcial = path.join(dir, `seed-${seed}.json`);
      let stderr = '';
      const fallar = (motivo) => {
        fallosDeProceso.set(seed, { seed, proceso: true, error: motivo });
        console.error(`  seed ${seed} FALLÓ: ${motivo}`);
        resolve(null);
      };
      const hijo = spawn(process.execPath, [
        archivo, '--carreras=1', `--desde=${seed}`, `--reps=${reps}`, `--cuota=${cuota}`, `--splits=${splits}`, `--soloMedir=${parcial}`
      ], { stdio: ['ignore', 'ignore', 'pipe'] });
      hijo.stderr.on('data', (trozo) => {
        stderr += trozo;
        process.stderr.write(trozo);
      });
      hijo.on('error', (error) => fallar(`no se pudo lanzar el proceso (${primeraLinea(error)})`));
      hijo.on('close', (codigo) => {
        if (fallosDeProceso.has(seed)) {
          return;
        }
        if (codigo !== 0) {
          const linea = stderr.split('\n').find((l) => /Error/.test(l));
          fallar(`terminó con código ${codigo}${linea ? `: ${linea.trim()}` : ''}`);
          return;
        }
        terminadas += 1;
        console.error(`  seed ${seed} lista (${terminadas}/${seeds.length}, ${Math.round((Date.now() - inicio) / 1000)} s)`);
        resolve(parcial);
      });
    });

    const trabajador = async () => {
      while (siguiente < seeds.length) {
        const seed = seeds[siguiente];
        siguiente += 1;
        await correrUna(seed);
      }
    };

    await Promise.all(Array.from({ length: Math.max(1, Math.min(Number(procesos), seeds.length)) }, trabajador));
    const partes = [];
    for (const seed of seeds) {
      if (fallosDeProceso.has(seed)) {
        partes.push({ baseline: [], resultados: [], frecuenciasTipo: {}, totalInterrupciones: 0, carreras: 0, fallos: [fallosDeProceso.get(seed)] });
        continue;
      }
      try {
        partes.push(JSON.parse(fs.readFileSync(path.join(dir, `seed-${seed}.json`), 'utf8')));
      } catch (error) {
        partes.push({ baseline: [], resultados: [], frecuenciasTipo: {}, totalInterrupciones: 0, carreras: 0, fallos: [{ seed, proceso: true, error: `su archivo de crudos no se pudo leer (${primeraLinea(error)})` }] });
      }
    }
    return combinarMediciones(partes);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  let { carreras, reps, cuota, splits, desde, sigmaCarreras } = DEFAULTS_AGENCIA;
  let salida = null;
  let analizarArchivos = null;
  let procesos = 1;
  let soloMedir = null;
  let sin = [];

  for (const arg of args) {
    if (arg.startsWith('--carreras=')) carreras = Number(arg.slice('--carreras='.length));
    else if (arg.startsWith('--reps=')) reps = Number(arg.slice('--reps='.length));
    else if (arg.startsWith('--cuota=')) cuota = Number(arg.slice('--cuota='.length));
    else if (arg.startsWith('--splits=')) splits = Number(arg.slice('--splits='.length));
    else if (arg.startsWith('--desde=')) desde = Number(arg.slice('--desde='.length));
    else if (arg.startsWith('--sigmaCarreras=')) sigmaCarreras = Number(arg.slice('--sigmaCarreras='.length));
    else if (arg.startsWith('--salida=')) salida = arg.slice('--salida='.length);
    else if (arg.startsWith('--analizar=')) analizarArchivos = arg.slice('--analizar='.length).split(',');
    else if (arg.startsWith('--procesos=')) procesos = Number(arg.slice('--procesos='.length));
    else if (arg.startsWith('--soloMedir=')) soloMedir = arg.slice('--soloMedir='.length);
    else if (arg.startsWith('--sin=')) sin = arg.slice('--sin='.length).split(',').filter(Boolean);
  }

  let datosCrudos;

  if (analizarArchivos && analizarArchivos.length > 0) {
    const todosResultados = [];
    const frecuenciasAcum = {};
    let totInt = 0;
    let totCarreras = 0;

    // Un archivo que no existe, que no es JSON o que no trae `resultados` es un error, no "0 decisiones,
    // 0%": un análisis vacío con salida 0 parece una medición válida.
    const fallar = (mensaje) => {
      console.error(`--analizar: ${mensaje}`);
      process.exit(1);
    };

    for (const arch of analizarArchivos) {
      if (!fs.existsSync(arch)) {
        fallar(`no existe el archivo ${arch}`);
      }
      let contenido;
      try {
        contenido = JSON.parse(fs.readFileSync(arch, 'utf8'));
      } catch (error) {
        fallar(`${arch} no es un JSON válido (${error.message})`);
      }
      if (!Array.isArray(contenido.resultados)) {
        fallar(`${arch} no trae una lista \`resultados\` (¿es la salida de --salida?)`);
      }
      // Con varios archivos el denominador es la SUMA de sus `totalInterrupciones`: un archivo del formato
      // viejo (sin ese campo) sumaría 0 y el porcentaje saldría inflado sin avisar.
      if (analizarArchivos.length > 1 && typeof contenido.totalInterrupciones !== 'number') {
        fallar(`${arch} no trae \`totalInterrupciones\` (formato viejo): con varios archivos el denominador quedaría subestimado. Volvé a generarlo con --salida.`);
      }
      todosResultados.push(...contenido.resultados);
      for (const [k, v] of Object.entries(contenido.frecuenciasTipo ?? {})) {
        frecuenciasAcum[k] = (frecuenciasAcum[k] ?? 0) + v;
      }
      totInt += contenido.totalInterrupciones ?? 0;
      totCarreras += contenido.carreras ?? contenido.baseline?.length ?? 0;
    }
    if (todosResultados.length === 0) {
      fallar('los archivos no traen ninguna decisión medida');
    }
    datosCrudos = { resultados: todosResultados, frecuenciasTipo: frecuenciasAcum, totalInterrupciones: totInt, carreras: totCarreras || null };
  } else {
    const problema = validarParametrosAgencia({ carreras, reps, cuota, splits });
    if (problema) {
      console.error(`agencia: ${problema}`);
      process.exit(1);
    }
    if (reps < MIN_REPLICAS_VALIDAS) {
      console.error(`aviso: con --reps=${reps} (< ${MIN_REPLICAS_VALIDAS}) la t pareada tiene ${reps - 1} grado(s) de libertad y casi nunca declara un efecto significativo.`);
    }
    if (soloMedir) {
      // Proceso hijo de `medirEnProcesos`: mide, guarda los crudos (compactos) y no analiza.
      fs.writeFileSync(soloMedir, JSON.stringify(medirAgencia({ carreras, reps, cuota, splits, desde })), 'utf8');
      return;
    }
    if (reps < META_REPS_K4C) {
      console.error(`aviso: con --reps=${reps} (< ${META_REPS_K4C}) no se cumple la meta de K4c (>= ${META_REPS_K4C} réplicas por decisión, §K.0c): sirve para probar, no para decidir.`);
    }
    datosCrudos = procesos > 1
      ? await medirEnProcesos({ carreras, reps, cuota, splits, desde, procesos })
      : medirAgencia({ carreras, reps, cuota, splits, desde });
    if (datosCrudos.fallos?.length > 0) {
      console.error(`
AVISO: ${datosCrudos.fallos.length} fallo(s) en la medición (las réplicas rotas quedan fuera del análisis):`);
      for (const linea of describirFallos(datosCrudos.fallos)) {
        console.error(`  - ${linea}`);
      }
      if (!(datosCrudos.carreras > 0)) {
        console.error('agencia: ninguna carrera se midió completa.');
        process.exit(1);
      }
    }
    if (salida) {
      fs.writeFileSync(salida, JSON.stringify(datosCrudos, null, 2), 'utf8');
      console.log(`Datos crudos guardados en ${salida}`);
    }
  }

  const analisis = analizarDatosAgencia(datosCrudos, sigmaCarreras);

  console.log(`\n=== ANÁLISIS DE AGENCIA (CONTRAFÁCTICO) ===`);
  console.log(`Decisiones medidas: ${analisis.totalDecisionesMedidas} | σ_pob(score) = ${analisis.sPop}`);
  console.log(`pctInterrupcionesConPalanca (ponderado por la fracción significativa de cada tipo, sin umbral): ${analisis.pctInterrupcionesConPalanca}%`);
  console.log(`pctInterrupcionesConPalancaAuditoria (todo-o-nada, tipos con ≥ ${UMBRAL_SIGNIFICATIVO}% significativo; test corregido): ${analisis.pctInterrupcionesConPalancaAuditoria}%`);
  console.log(`pctInterrupcionesConPalancaAuditoriaTestViejo (el mismo con el test de la auditoría, mejor vs peor opción al 5%): ${analisis.pctInterrupcionesConPalancaAuditoriaTestViejo}%\n`);

  console.log('tipo | n | palanca mediana (Δscore/σ) | % con efecto significativo | ruido dentro de la opción (σ/σpob)');
  console.log('-----|---|----------------------------|----------------------------|-----------------------------------');
  for (const f of analisis.filas) {
    console.log(`${f.tipo} | ${f.n} | ${f.palancaMediana} σ | ${f.pctSignificativo}% | ${f.ruidoDentro}`);
  }

  // K4c (paso 1): por tipo de parada (los tipos de `desglosePorTipo`). Las frecuencias son las de las carreras medidas, que
  // juegan con el criterio de cada sistema (`resolverAuto`) y no con `criterio`: sirven para ponderar, no para reemplazar
  // el desglose de simulate.js.
  const carrerasMedidas = analisis.carreras;
  console.log(`\n=== PALANCA POR TIPO DE PARADA (${carrerasMedidas ?? '?'} carreras, ${analisis.totalDecisionesMedidas} decisiones medidas) ===`);
  console.log(`Fracción ponderada con palanca, sumando los tipos: ${analisis.pctPalancaPorTipoDeParada}% de las paradas\n`);
  console.log('tipo | paradas por carrera | n medidas | % significativo | palanca mediana (σ) | aporte (pp del total)');
  console.log('-----|---------------------|-----------|-----------------|---------------------|----------------------');
  for (const f of analisis.porTipoDeParada) {
    console.log(`${f.tipo} | ${f.porCarrera ?? '?'} | ${f.n} | ${f.n > 0 ? `${f.pctSignificativo}%` : 'sin medir'} | ${f.palancaMediana ?? '-'} | ${f.aportePct}`);
  }

  const paradasPorCarrera = (analisis.porTipoDeParada.reduce((suma, f) => suma + f.frecuencia, 0) / (carrerasMedidas || 1)).toFixed(1);
  console.log(`\n=== TABLA DE RECORTE: se resuelven solas, de a una, las paradas de menos palanca (hoy: ${paradasPorCarrera} paradas por carrera) ===`);
  console.log('se quita | su % significativo | n | paradas por carrera que quedan | % con palanca de las que quedan');
  console.log('---------|--------------------|---|--------------------------------|---------------------------------');
  for (const fila of tablaDeRecorte(analisis.porTipoDeParada, carrerasMedidas)) {
    console.log(`${fila.quitando} | ${fila.n > 0 ? `${fila.pctSignificativo}%` : 'sin medir'} | ${fila.n} | ${fila.paradasPorCarrera ?? '?'} | ${fila.pctPalanca ?? '-'}%`);
  }

  if (sin.length > 0) {
    const desconocidos = sin.filter((tipo) => !analisis.porTipoDeParada.some((f) => f.tipo === tipo));
    if (desconocidos.length > 0) {
      console.error(`--sin: tipos que no aparecen en la medición: ${desconocidos.join(', ')}`);
    }
    const queda = palancaSobreLasQueQuedan(analisis.porTipoDeParada, sin, carrerasMedidas);
    console.log(`\nSin ${sin.join(', ')}: quedan ${queda.paradasPorCarrera ?? '?'} paradas por carrera y ${queda.pctPalanca ?? '-'}% tiene palanca.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('Error en agencia:', err);
    process.exit(1);
  });
}
