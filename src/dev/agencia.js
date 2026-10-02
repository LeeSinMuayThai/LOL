import fs from 'fs';
import { pathToFileURL } from 'url';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplit, resolverDecision, avanzarSplitAuto } from '../core/pipeline.js';
import { sistemaPorId } from '../systems/registro.js';
import { nivelDelJugador } from '../core/ficha.js';
import { hashCadena } from '../core/numeros.js';
import {
  RESULTADO_MINIJUEGO_BIEN, RESULTADO_MINIJUEGO_MAL, esDecisionDeMinijuego, esDecisionDeMercado
} from './estrategias.js';
import { promedio, medianaInferior, desvioMuestral } from './simulate.js';

// Umbral mínimo de porcentaje de decisiones con efecto estadísticamente significativo (t pareada p < 0.05)
// para considerar que un tipo de decisión tiene "palanca" real en el final de carrera (PLAN.md §K.5 K0 / AUDITORIA.md §4.3).
export const UMBRAL_SIGNIFICATIVO = 10;

// Cuántas réplicas válidas por opción hacen falta para analizar una decisión: `min(MIN_REPLICAS_VALIDAS,
// reps)`. La auditoría (AUDITORIA.md §4.3) exigía 4 con 8 réplicas por opción; con una corrida corta (como
// la del check, `--reps=2`) pedir 4 descartaría todo, así que el piso baja a las réplicas que se pidieron.
export const MIN_REPLICAS_VALIDAS = 4;

// σ poblacional de referencia del puntaje: cuántas carreras simula, desde qué seed y hasta cuántos splits.
// La seed arranca en 1001 para NO pisar las de la medición (que arrancan en 1 por defecto) y los 70 splits
// son los de la auditoría (`--splits=70` por defecto).
const SEMILLA_BASE_SIGMA = 1001;
const SPLITS_SIGMA_POBLACION = 70;

// Puntaje de carrera provisorio (AUDITORIA.md §4.3) usado como función objetivo
// hasta que la subfase K1 implemente `core/puntaje.js`.
export function puntajeProvisorio(st) {
  const r = st.career.registro;
  const intBuenos = r.internacionales.filter((i) => i.resultado === 'buen_papel').length;
  const intTot = r.internacionales.length;
  const t1 = r.porOrg.filter((f) => f.tier === 1).reduce((s, f) => s + f.splits, 0);
  const rank = r.picos.rankMundial ?? 0;
  return (
    10 * r.titulos.length
    + 15 * intBuenos
    + 5 * (intTot - intBuenos)
    + (rank > 0 ? (21 - rank) * 2 : 0)
    + t1
    + (st.splitFichaje !== null ? 10 : 0)
  );
}

function metricas(st) {
  const r = st.career.registro;
  return {
    score: puntajeProvisorio(st),
    titulos: r.titulos.length,
    t1: r.porOrg.some((f) => f.tier === 1) ? 1 : 0,
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
// límite normal, 1,96.
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

export function medirAgencia({
  carreras = 12,
  reps = 6,
  cuota = 2,
  splits = 70,
  desde = 1
} = {}) {
  const resultados = [];
  const baseline = [];
  const frecuenciasTipo = {};
  let totalInterrupciones = 0;

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
          const porOpcion = ops.map(() => []);

          for (let r = 0; r < Number(reps); r += 1) {
            ops.forEach((op, i) => {
              const rr = mulberry32(hashCadena(`${seed}|${splitCount}|${tipo}|${r}`));
              const clon = structuredClone(st);
              const { _l, ...resp } = op;
              let s2;
              try {
                s2 = resolverDecision(clon, resp, rr).state;
              } catch {
                porOpcion[i].push(null);
                return;
              }
              porOpcion[i].push(terminarCarrera(s2, rr, splitCount, Number(splits)));
            });
          }
          resultados.push({ seed, split: splitCount, tipo, labels: ops.map((o) => o._l), porOpcion });
        }

        const sis = sistemaPorId(sistemaId);
        st = resolverDecision(st, sis.resolverAuto(st, decision, rng), rng).state;
      }
      splitCount += 1;
    }
    baseline.push(metricas(st));
  }

  return { baseline, resultados, frecuenciasTipo, totalInterrupciones };
}

// σ poblacional de referencia del puntaje y de los títulos (determinista): `sigmaCarreras` carreras con el
// criterio por defecto del motor. Aparte para que `analizarDatosAgencia` pueda recibirlo ya calculado.
export function sigmaPoblacional(sigmaCarreras = 60) {
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
    pop.push(puntajeProvisorio(st));
    popT.push(st.career.registro.titulos.length);
  }
  return { sPop: sd(pop) || 1, sPopT: sd(popT) || 1 };
}

// `referencia` (opcional) = `{ sPop, sPopT }` ya calculados: así el análisis se puede probar con un
// conjunto sintético sin simular la población.
export function analizarDatosAgencia(
  datosCombinados,
  sigmaCarreras = 60,
  referencia = null
) {
  const { resultados, frecuenciasTipo = {}, totalInterrupciones = 0 } = datosCombinados;

  const { sPop, sPopT } = referencia ?? sigmaPoblacional(sigmaCarreras);

  const porTipo = {};

  for (const d of resultados) {
    const vals = d.porOpcion.map((repsArr) => repsArr.filter(Boolean));
    const repsPedidas = d.porOpcion[0]?.length ?? MIN_REPLICAS_VALIDAS;
    if (vals.some((v) => v.length < Math.min(MIN_REPLICAS_VALIDAS, repsPedidas))) {
      continue;
    }

    const medias = vals.map((v) => mean(v.map((x) => x.fin.score)));
    const iMax = medias.indexOf(Math.max(...medias));
    const iMin = medias.indexOf(Math.min(...medias));
    const spread = medias[iMax] - medias[iMin];
    const n = Math.min(vals[iMax].length, vals[iMin].length);
    const dif = Array.from({ length: n }, (_, r) => vals[iMax][r].fin.score - vals[iMin][r].fin.score);

    const sDif = sd(dif);
    const tcrit = tCritico(Math.max(1, n - 1));
    const t = sDif > 1e-9 ? mean(dif) / (sDif / Math.sqrt(n)) : (mean(dif) !== 0 ? Infinity : 0);
    const sig = Math.abs(t) > tcrit;

    const dentro = mean(vals.map((v) => sd(v.map((x) => x.fin.score))));
    const mT = vals.map((v) => mean(v.map((x) => x.fin.titulos)));
    const mT1 = vals.map((v) => mean(v.map((x) => x.fin.t1)));
    const cortoDiff = (k) => {
      const m = vals.map((v) => mean(v.map((x) => x.c1[k] ?? 0)));
      return Math.max(...m) - Math.min(...m);
    };

    const tipoNormalizado = d.tipo.replace(/:x:/, ':').replace(/^edadCierre:.*/, 'edadCierre:*');
    const clave = tipoNormalizado.startsWith('eventos:') ? 'eventos:*' : tipoNormalizado;

    for (const k of [clave, tipoNormalizado !== clave ? tipoNormalizado : null].filter(Boolean)) {
      porTipo[k] = porTipo[k] ?? [];
      porTipo[k].push({
        L: spread / sPop,
        sig,
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

  // Cálculo de pctInterrupcionesConPalanca ponderado por frecuencia real
  let interrupcionesConPalanca = 0;
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

    const pctSig = (100 * mean(v.map((x) => (x.sig ? 1 : 0))));
    if (pctSig >= UMBRAL_SIGNIFICATIVO) {
      interrupcionesConPalanca += freq;
    }
    totalInterrupcionesContadas += freq;
  }

  // El denominador son TODAS las interrupciones de las carreras medidas, no solo las de los tipos que
  // llegaron a medirse: una interrupción sin elección real (un solo camino) tiene palanca cero, y sacarla
  // de la cuenta inflaría el porcentaje. Los archivos crudos viejos sin `totalInterrupciones` caen al total
  // de las frecuencias contadas.
  const divisor = totalInterrupciones || totalInterrupcionesContadas || 1;
  const pctInterrupcionesConPalanca = Number(((interrupcionesConPalanca / divisor) * 100).toFixed(1));

  return {
    sPop: Number(sPop.toFixed(2)),
    sPopT: Number(sPopT.toFixed(2)),
    totalDecisionesMedidas: resultados.length,
    filas: filas.map(([tipo, v]) => ({
      tipo,
      n: v.length,
      palancaMediana: Number((med(v.map((x) => x.L)) ?? 0).toFixed(2)),
      pctSignificativo: Number((100 * mean(v.map((x) => (x.sig ? 1 : 0)))).toFixed(1)),
      ruidoDentro: Number((med(v.map((x) => x.dentroRel)) ?? 0).toFixed(2)),
      dTitulosMed: Number((med(v.map((x) => x.dTit)) ?? 0).toFixed(2)),
      dTier1Med: Number((med(v.map((x) => x.dT1)) ?? 0).toFixed(2))
    })),
    pctInterrupcionesConPalanca
  };
}

async function main() {
  const args = process.argv.slice(2);
  let carreras = 12;
  let reps = 6;
  let cuota = 2;
  let splits = 70;
  let desde = 1;
  let sigmaCarreras = 60;
  let salida = null;
  let analizarArchivos = null;

  for (const arg of args) {
    if (arg.startsWith('--carreras=')) carreras = Number(arg.slice('--carreras='.length));
    else if (arg.startsWith('--reps=')) reps = Number(arg.slice('--reps='.length));
    else if (arg.startsWith('--cuota=')) cuota = Number(arg.slice('--cuota='.length));
    else if (arg.startsWith('--splits=')) splits = Number(arg.slice('--splits='.length));
    else if (arg.startsWith('--desde=')) desde = Number(arg.slice('--desde='.length));
    else if (arg.startsWith('--sigmaCarreras=')) sigmaCarreras = Number(arg.slice('--sigmaCarreras='.length));
    else if (arg.startsWith('--salida=')) salida = arg.slice('--salida='.length);
    else if (arg.startsWith('--analizar=')) analizarArchivos = arg.slice('--analizar='.length).split(',');
  }

  let datosCrudos;

  if (analizarArchivos && analizarArchivos.length > 0) {
    const todosResultados = [];
    const frecuenciasAcum = {};
    let totInt = 0;

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
      todosResultados.push(...contenido.resultados);
      for (const [k, v] of Object.entries(contenido.frecuenciasTipo ?? {})) {
        frecuenciasAcum[k] = (frecuenciasAcum[k] ?? 0) + v;
      }
      totInt += contenido.totalInterrupciones ?? 0;
    }
    if (todosResultados.length === 0) {
      fallar('los archivos no traen ninguna decisión medida');
    }
    datosCrudos = { resultados: todosResultados, frecuenciasTipo: frecuenciasAcum, totalInterrupciones: totInt };
  } else {
    datosCrudos = medirAgencia({ carreras, reps, cuota, splits, desde });
    if (salida) {
      fs.writeFileSync(salida, JSON.stringify(datosCrudos, null, 2), 'utf8');
      console.log(`Datos crudos guardados en ${salida}`);
    }
  }

  const analisis = analizarDatosAgencia(datosCrudos, sigmaCarreras);

  console.log(`\n=== ANÁLISIS DE AGENCIA (CONTRAFÁCTICO) ===`);
  console.log(`Decisiones medidas: ${analisis.totalDecisionesMedidas} | σ_pob(score) = ${analisis.sPop}`);
  console.log(`pctInterrupcionesConPalanca (≥ ${UMBRAL_SIGNIFICATIVO}% sig): ${analisis.pctInterrupcionesConPalanca}%\n`);

  console.log('tipo | n | palanca mediana (Δscore/σ) | % con efecto significativo | ruido dentro de la opción (σ/σpob)');
  console.log('-----|---|----------------------------|----------------------------|-----------------------------------');
  for (const f of analisis.filas) {
    console.log(`${f.tipo} | ${f.n} | ${f.palancaMediana} σ | ${f.pctSignificativo}% | ${f.ruidoDentro}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('Error en agencia:', err);
    process.exit(1);
  });
}
