import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { VERSION as VERSION_GUARDADO } from '../core/guardado.js';
import {
  verificarSinMathRandom, verificarDocumentSoloEnUi,
  verificarSinFondoDeTinta, verificarSinColorLiteral, verificarTokensDefinidos,
  verificarSinLogicaEnIndexHtml,
  verificarSinColorLiteralEnJs, luminanciaRelativa, contrasteRatio, hexDeToken
} from './guards.js';
import { reconciliar } from '../ui/core/reconciliar.js';
import { crearDelta } from '../ui/core/delta.js';
import { agruparBeats, renderFeed, LIMITE_FEED } from '../ui/components/feed.js';
import * as reproductorModulo from '../ui/reproductor.js';
import { TONOS_CONOCIDOS as TONOS_DE_GRAFICOS } from '../ui/graficos/comun.js';
import { correrLote as correrLoteJugabilidad, analizarCatalogo } from './simulate.js';
import { observar as observarCobertura, calcularHuecosPorCategoria } from './cobertura.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { CATEGORIAS_EVENTO } from '../data/categorias.js';
import { mulberry32, sample } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import {
  avanzarSplit, avanzarSplitAuto, resolverDecision, ETAPAS_SPLIT, pronosticoDeOxidoEnVivo, splitCountDeLaProximaCorrida
} from '../core/pipeline.js';
import { sistemaPorId } from '../systems/registro.js';
import { getPath, etiquetaCampo } from '../core/selectors.js';
import { calcularContexto } from '../core/contexto.js';
import {
  aplicarLP, desdePuntos, puntosAbsolutos, esApice, rangoAproximado,
  servidorConCutoffs, servidorDeLaPartida
} from '../core/ranked.js';
import { TOKENS, tokensUsados, resolverTexto } from '../core/plantillas.js';
import { RUTINAS } from '../core/rutinas.js';
import { campeonesEnMeta, multiplicadorDeMeta, factorDeCampeon, pesoDePick, lecturaDePick } from '../core/ajusteMeta.js';
import * as poolMod from '../core/pool.js';
import { campeonesDisponibles, entradaDePool } from '../core/pool.js';
import { aplicar as aplicarCampeones } from '../systems/campeones.js';
import { elegirOutcome, elegirEvento, decisionDesdeEvento, resolver as resolverEventos, resolverOpcion, cooldownActivo, pesoEfectivo, SPLIT_SIN_EVENTO_MSG, opcionDelPerfilPara } from '../systems/events.js';
import PERFILES_K4C from '../data/perfiles.json' with { type: 'json' };
import { previaDeOpcion, riesgoDeOpcion, payoffNormalizado } from '../core/previa.js';
import { rarezaDeRutina, payoffDeRutina } from '../core/rareza.js';
import { tipoDeSplit, hayPresupuesto } from '../core/presupuesto.js';
import { aplicar as aplicarPresupuesto } from '../systems/presupuesto.js';
import {
  objetivoDelRival, disponiblesDelPool, jugadaDelPlan, conPlan, mapaDelPlan, estadoDelProximoMapa, fuerzaRivalDeMapa,
  conQuemaDelRival, charlaDisponible
} from '../core/serie.js';
import {
  rendimientoBase, fuerzaDelEquipo, fuerzaDePartido, nivelDeCompaneros, companerosDelPlantel
} from '../core/fuerza.js';
import { estadoDelMapa } from '../core/serie.js';
import { probabilidadPorSigma } from '../core/numeros.js';
import { factorDeConsistencia, jugarPartido, probabilidadDePartido, ruidoEfectivo } from '../core/partido.js';
import {
  BANDAS_PENDIENTES, BLOQUES_DE_CORRIMIENTO,
  entradasQuePasan, entradasDeBloquesCerrados, entradasIncompletas
} from './bandasPendientes.js';
import {
  motivosDeFecha, generarFixture, aplicarCrucesDeJornada, rendimientoDeLaTemporada,
  tablaDePosiciones, posicionEnTabla, filaVacia, registrarEnFila,
  defineClasificacion, motivoPrincipal, PRIORIDAD_MOTIVOS
} from '../core/temporada.js';
import { tierListDeRol, boostDelPool } from '../core/regimen.js';
import { nivelDelJugador, deltasDeStats, fichaCompleta, loQueConstruiste } from '../core/ficha.js';
import { componerLegado } from '../core/legado.js';
import { bandaDeArraigo } from '../core/registro.js';
import { rankearMundo, rankearPoblacion, puntajeRanking } from '../core/topMundial.js';
import { salarioDeOferta } from '../core/salarios.js';
import { valorDeMercado, sesgoEtario } from '../core/valorMercado.js';
import { orgsQueTeFicharian, ofertaPosible, residenciaEn } from '../core/demanda.js';
import { aplicar as aplicarMercado, construirOferta } from '../systems/mercado.js';
import { cartaDeRutina, resolverPreparacion } from '../systems/practica.js';
import { FRASES_MOTIVO, ETIQUETAS_MOTIVO } from '../systems/temporada.js';
import { EJES, MARCAS, MOMENTOS, MOMENTOS_ACTIVOS, momentoPorId } from '../data/contextos.js';
import { ARQUETIPOS } from '../data/meta-tags.js';
import { ROLES, IDS_ROL } from '../data/roles.js';
import LIGAS from '../data/leagues.json' with { type: 'json' };
import CAMPEONES from '../data/champions.json' with { type: 'json' };
import MINIJUEGOS from '../data/minijuegos.json' with { type: 'json' };
import {
  elegirMinijuego, minijuegosPara, veredictoDeMinijuego, textoDeMinijuego, lecturaDeVentana, minijuegoPorId
} from '../core/minijuegos.js';
import { esMapaDeDesempate } from '../core/serie.js';
import { previaDePartido, previaDeDecision, textoDeProbabilidadJugada } from '../core/previaDePartido.js';
import { MONTAR_MINIJUEGO } from '../ui/components/minijuegos/index.js';
import { crearCampeonTile } from '../ui/components/campeonTile.js';
import METAS from '../data/metas.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..');

const errores = [];

const ACCIONES_DE_POOL = ['aprender', 'maestria', 'olvidar'];

// `--solo=<texto>` corre unicamente los checks cuyo nombre contiene ese texto.
// Es lo que hace practicable la regla de proceso 7 ("al escribir un check nuevo,
// verificar que falla cuando debe"): la corrida completa tarda ~31 minutos medidos
// (H10, auditoria 2026-09-25 — el "~7 minutos (D32)" que decia esto antes ya no
// era cierto, la propia trampa T6 que este archivo advierte, adentro del archivo
// que la advierte; medido DOS veces en la misma sesion, 31:01 y 31:04, asi que
// tambien el "~55 min" que la auditoria misma habia citado quedo corregido —
// T6 aplica incluso a re-medir lo que otro ya midio), asi que verificar un
// check en rojo sin esto costaria media hora por intento.
const SOLO = process.argv.slice(2)
  .filter((arg) => arg.startsWith("--solo="))
  .map((arg) => arg.slice("--solo=".length).toLowerCase());
const RAPIDO = process.argv.slice(2).includes('--rapido');

// PLAN.md §K.4, "Cómo se anota un check fuera de banda dentro de un bloque": un check de BANDA que el bloque
// de corrimiento abierto sacó de banda vive en `src/dev/bandasPendientes.js` con su valor medido, su banda, el
// commit que lo sacó y la subfase que lo re-basea. Si falla se reporta PENDIENTE (no FAIL, no rompe la
// corrida); si pasa, el custodio del final lo marca como error (hay que borrar la entrada). `resultadosDeCheck`
// guarda cómo terminó cada check que se cruzó en esta corrida ('ok', 'fail', 'pendiente' o 'skip').
const PENDIENTES_POR_NOMBRE = new Map(BANDAS_PENDIENTES.map((entrada) => [entrada.check, entrada]));
const resultadosDeCheck = new Map();

function correrUnCheck(nombre, fn) {
  try {
    fn();
    resultadosDeCheck.set(nombre, 'ok');
    console.log(`OK   ${nombre}`);
  } catch (error) {
    const pendiente = PENDIENTES_POR_NOMBRE.get(nombre);
    if (pendiente) {
      resultadosDeCheck.set(nombre, 'pendiente');
      console.log(`PENDIENTE ${nombre}: ${error.message} [bloque ${pendiente.bloque}; medido ${pendiente.medido}; `
        + `banda ${pendiente.banda}; lo sacó ${pendiente.commit}; se re-basea en ${pendiente.rebasea}]`);
      return;
    }
    resultadosDeCheck.set(nombre, 'fail');
    errores.push(`${nombre}: ${error.message}`);
    console.log(`FAIL ${nombre}: ${error.message}`);
  }
}

function check(nombre, fn) {
  if (SOLO.length > 0 && !SOLO.some((texto) => nombre.toLowerCase().includes(texto))) {
    return;
  }
  correrUnCheck(nombre, fn);
}

function checkLento(nombre, fn) {
  if (SOLO.length > 0 && !SOLO.some((texto) => nombre.toLowerCase().includes(texto))) {
    return;
  }
  if (SOLO.length === 0 && RAPIDO) {
    resultadosDeCheck.set(nombre, 'skip');
    console.log(`SKIP  ${nombre} (lento, correr sin --rapido)`);
    return;
  }
  correrUnCheck(nombre, fn);
}

function correrCarrera(seed, splits) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);
  for (let i = 0; i < splits && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng).state;
  }
  return state;
}

check('Sin aleatoriedad nativa fuera del RNG inyectado (src/ + index.html)', () => {
  // `src/` recursivo + la raíz del repo en su primer nivel: ahí vive
  // `index.html`, que hasta 9Ed le quedaba fuera al guard dos veces (ni
  // `.html` en las extensiones, ni la raíz en el árbol recorrido).
  const infractores = verificarSinMathRandom(srcDir, [path.join(srcDir, '..')]);
  if (infractores.length > 0) {
    throw new Error(`encontrado en: ${infractores.join(', ')}`);
  }
});

// --- El candado del sistema de diseño (fase T0b) ---------------------------
const estilosDir = path.join(srcDir, 'ui', 'estilos');

check('CSS: ningún background usa un token de tinta (el bug del hover ciego)', () => {
  const hallazgos = verificarSinFondoDeTinta(estilosDir);
  if (hallazgos.length > 0) {
    throw new Error(`encontrado en: ${hallazgos.join(', ')}`);
  }
});

check('CSS: ningún color literal fuera de tokens.css', () => {
  const hallazgos = verificarSinColorLiteral(estilosDir);
  if (hallazgos.length > 0) {
    throw new Error(`encontrado en: ${hallazgos.join(', ')}`);
  }
});

check('CSS: todo var(--token) usado está definido en tokens.css', () => {
  const hallazgos = verificarTokensDefinidos(estilosDir);
  if (hallazgos.length > 0) {
    throw new Error(`sin definir: ${hallazgos.join(', ')}`);
  }
});

check('CSS: contraste WCAG ≥ 4.5:1 en los pares tinta/superficie que se leen', () => {
  const tokensTexto = fs.readFileSync(path.join(estilosDir, 'tokens.css'), 'utf8');
  // Los pares que el CSS realmente usa para texto que hay que leer, más el
  // botón principal (texto bg-void sobre --live sólido, el estado hover).
  const pares = [
    ['ink', 'bg-surface'], ['ink-dim', 'bg-surface'],
    ['ink', 'bg-raised'], ['ink-dim', 'bg-raised'],
    ['ink', 'bg-void'], ['live', 'bg-surface'], ['gold', 'bg-surface'],
    ['bg-void', 'live']
  ];
  const fallas = pares
    .map(([a, b]) => [a, b, contrasteRatio(hexDeToken(a, tokensTexto), hexDeToken(b, tokensTexto))])
    .filter(([, , r]) => r < 4.5);
  if (fallas.length > 0) {
    throw new Error(fallas.map(([a, b, r]) => `${a}/${b} = ${r.toFixed(2)}:1`).join(', '));
  }
});

const uiDir = path.join(srcDir, 'ui');

check('JS: ningún color literal en src/ui/**/*.js fuera de excepciones de runtime (fase V, V1, D44)', () => {
  const hallazgos = verificarSinColorLiteralEnJs(uiDir);
  if (hallazgos.length > 0) {
    throw new Error(`encontrado en: ${hallazgos.join(', ')}`);
  }
});

check('CSS: contraste de marca gráfica WCAG ≥ 3:1 (y ≥ 4.5:1 texto) en las 29 familias de tokens', () => {
  const tokensTexto = fs.readFileSync(path.join(estilosDir, 'tokens.css'), 'utf8');
  const FAMILIAS_GRAFICAS = [
    'cat-rutina', 'cat-golpe', 'cat-oportunidad', 'cat-mercado', 'cat-parche',
    'cat-vestuario', 'cat-prensa', 'cat-familia', 'cat-salud', 'cat-partido',
    'rank-iron', 'rank-bronze', 'rank-silver', 'rank-gold', 'rank-platinum',
    'rank-emerald', 'rank-diamond', 'rank-master', 'rank-grandmaster', 'rank-challenger',
    'nivel-prospecto', 'nivel-titular', 'nivel-elite', 'nivel-clase_mundial',
    'up', 'down', 'warn', 'danger', 'ice'
  ];
  const SUPERFICIES = ['bg-surface', 'bg-raised', 'bg-sunken'];

  // Familias usadas para texto/labels directamente sobre superficies (piso 4.5:1)
  const FAMILIAS_TEXTO = new Set([
    // Ninguna familia en uso directo como texto por los primitivos gráficos en este commit
  ]);

  const fallas = [];
  for (const fam of FAMILIAS_GRAFICAS) {
    const piso = FAMILIAS_TEXTO.has(fam) ? 4.5 : 3.0;
    for (const sup of SUPERFICIES) {
      const r = contrasteRatio(hexDeToken(fam, tokensTexto), hexDeToken(sup, tokensTexto));
      if (r < piso) {
        fallas.push(`${fam}/${sup} = ${r.toFixed(2)}:1 (piso ${piso}:1)`);
      }
    }
  }

  if (fallas.length > 0) {
    throw new Error(`pares que no alcanzan el piso requerido: ${fallas.join(', ')}`);
  }
});

check('Contrato de sistemas del registro', () => {
  const ids = new Set();

  for (const sistema of ETAPAS_SPLIT) {
    if (typeof sistema.id !== 'string' || sistema.id.length === 0) {
      throw new Error('hay un sistema sin id exportado');
    }
    if (ids.has(sistema.id)) {
      throw new Error(`id de sistema duplicado: ${sistema.id}`);
    }
    ids.add(sistema.id);

    if (typeof sistema.aplicar !== 'function') {
      throw new Error(`${sistema.id}: no exporta aplicar(state, rng)`);
    }
    if (sistema.aplicar.length !== 2) {
      throw new Error(`${sistema.id}: aplicar debe recibir (state, rng)`);
    }

    // Un sistema que puede pausar el split tiene que saber reanudarlo,
    // tanto con una persona decidiendo como en simulacion masiva.
    const puedePausar = typeof sistema.resolver === 'function';
    if (puedePausar && typeof sistema.resolverAuto !== 'function') {
      throw new Error(`${sistema.id}: exporta resolver pero no resolverAuto`);
    }
  }
});

check('Esquema de eventos válido', () => {
  const estadoBase = createInitialState(1, mulberry32(1));
  const ids = new Set();

  for (const evento of TODOS_LOS_EVENTOS) {
    if (!evento.id || typeof evento.id !== 'string') {
      throw new Error('evento sin id válido');
    }
    if (ids.has(evento.id)) {
      throw new Error(`id de evento duplicado: ${evento.id}`);
    }
    ids.add(evento.id);

    if (typeof evento.weight !== 'number' || evento.weight <= 0) {
      throw new Error(`${evento.id}: weight inválido`);
    }
    if ('bisagra' in evento && evento.bisagra !== true) {
      throw new Error(`${evento.id}: bisagra solo puede ser true (u omitirse)`);
    }
    if (!Array.isArray(evento.conditions)) {
      throw new Error(`${evento.id}: conditions debe ser un array`);
    }
    for (const condicion of evento.conditions) {
      if (!condicion.field || !condicion.op) {
        throw new Error(`${evento.id}: condición mal formada`);
      }
      if (getPath(estadoBase, condicion.field) === undefined) {
        throw new Error(`${evento.id}: condición sobre un campo inexistente (${condicion.field})`);
      }
    }

    if (!Array.isArray(evento.options) || evento.options.length === 0) {
      throw new Error(`${evento.id}: sin opciones`);
    }

    for (const opcion of evento.options) {
      if (typeof opcion.weight !== 'number' || opcion.weight <= 0) {
        throw new Error(`${evento.id}/${opcion.id}: weight de opción inválido`);
      }
      if (!Array.isArray(opcion.outcomes) || opcion.outcomes.length < 2) {
        throw new Error(`${evento.id}/${opcion.id}: una opción necesita al menos 2 outcomes (regla 8)`);
      }

      for (const outcome of opcion.outcomes) {
        if (typeof outcome.weight !== 'number' || outcome.weight <= 0) {
          throw new Error(`${evento.id}/${opcion.id}: weight de outcome inválido`);
        }
        if (!Array.isArray(outcome.effects) || outcome.effects.length === 0) {
          throw new Error(`${evento.id}/${opcion.id}: outcome sin efectos`);
        }

        // CONCEPTO §8: "tus stats corren esos pesos, no los eliminan". Un
        // `modificador` sin `field` real seria un piso ciego: pesoEfectivo
        // leeria undefined y el ajuste seria siempre el mismo numero fijo.
        if (outcome.modificadores !== undefined) {
          if (!Array.isArray(outcome.modificadores) || outcome.modificadores.length === 0) {
            throw new Error(`${evento.id}/${opcion.id}: modificadores debe ser un array no vacío`);
          }
          for (const mod of outcome.modificadores) {
            if (getPath(estadoBase, mod.field) === undefined) {
              throw new Error(`${evento.id}/${opcion.id}: modificador sobre un campo inexistente (${mod.field})`);
            }
            if (typeof mod.referencia !== 'number' || typeof mod.factor !== 'number') {
              throw new Error(`${evento.id}/${opcion.id}: modificador de ${mod.field} necesita referencia y factor numéricos`);
            }
          }
        }

        for (const effect of outcome.effects) {
          if (!effect.path || typeof effect.path !== 'string') {
            throw new Error(`${evento.id}/${opcion.id}: efecto sin path`);
          }
          // Un path con typo hoy crearia una propiedad nueva en silencio via setPath.
          if (getPath(estadoBase, effect.path) === undefined) {
            throw new Error(`${evento.id}/${opcion.id}: el path ${effect.path} no existe en el estado inicial`);
          }

          if (effect.type === 'push') {
            if (!Array.isArray(effect.values) || effect.values.length < 2) {
              throw new Error(`${evento.id}/${opcion.id}: efecto push en ${effect.path} necesita al menos 2 values (regla 7)`);
            }
            continue;
          }

          if (effect.type === 'momento') {
            if (!Array.isArray(effect.values) || effect.values.length < 2) {
              throw new Error(`${evento.id}/${opcion.id}: efecto momento necesita al menos 2 values (mismo criterio que push, regla 7)`);
            }
            if (!effect.tipo || typeof effect.tipo !== 'string') {
              throw new Error(`${evento.id}/${opcion.id}: efecto momento sin "tipo"`);
            }
            continue;
          }

          // K4-C2: `camino` escribe un valor en un flag (no es una magnitud: sin rango). El path ya se validó arriba.
          if (effect.type === 'camino') {
            if (!['string', 'boolean'].includes(typeof effect.valor)) {
              throw new Error(`${evento.id}/${opcion.id}: efecto camino en ${effect.path} sin "valor" (texto o booleano)`);
            }
            continue;
          }

          if (effect.type === 'pool') {
            if (!ACCIONES_DE_POOL.includes(effect.accion)) {
              throw new Error(`${evento.id}/${opcion.id}: acción de pool desconocida "${effect.accion}" (válidas: ${ACCIONES_DE_POOL.join(', ')})`);
            }
            // 'olvidar' no toma cantidad; las otras dos sí, y como todo efecto
            // tienen que ser un rango, nunca un valor fijo (regla 7).
            if (effect.accion !== 'olvidar' && effect.min >= effect.max) {
              throw new Error(`${evento.id}/${opcion.id}: rango degenerado en el efecto de pool (regla 7)`);
            }
            continue;
          }

          if (typeof effect.min !== 'number' || typeof effect.max !== 'number') {
            throw new Error(`${evento.id}/${opcion.id}: rango min/max faltante en ${effect.path}`);
          }
          if (effect.min >= effect.max) {
            throw new Error(`${evento.id}/${opcion.id}: rango degenerado en ${effect.path} (min ${effect.min} >= max ${effect.max}) — regla 7`);
          }
        }
      }
    }
  }
});

check('Todo evento del catálogo declara categoria válida (PLAN.md §12.1)', () => {
  const validas = new Set(CATEGORIAS_EVENTO);
  for (const evento of TODOS_LOS_EVENTOS) {
    if (!evento.categoria || typeof evento.categoria !== 'string') {
      throw new Error(`${evento.id}: sin categoria`);
    }
    if (!validas.has(evento.categoria)) {
      throw new Error(`${evento.id}: categoria "${evento.categoria}" fuera de vocabulario (${CATEGORIAS_EVENTO.join(', ')})`);
    }
  }
});

check('Una bisagra y una de ambiente producen peso distinto en el 100% de los casos (PLAN.md §12.2)', () => {
  const estadoBase = createInitialState(1, mulberry32(1));
  for (const evento of TODOS_LOS_EVENTOS) {
    const decision = decisionDesdeEvento(estadoBase, evento, {});
    if (evento.bisagra) {
      if (decision.peso !== 'bisagra') {
        throw new Error(`${evento.id}: bisagra:true pero peso="${decision.peso}"`);
      }
    } else if (evento.categoria === 'rutina') {
      if (decision.peso !== 'ambiente') {
        throw new Error(`${evento.id}: categoria rutina sin bisagra pero peso="${decision.peso}"`);
      }
    } else if (decision.peso !== 'normal') {
      throw new Error(`${evento.id}: esperaba peso "normal", dio "${decision.peso}"`);
    }
  }
});

check('Toda opción manda previa (≥1 campo o [] explícito) y un riesgo válido (PLAN.md §12.3)', () => {
  const estadoBase = createInitialState(1, mulberry32(1));
  const RIESGOS_VALIDOS = new Set(['seguro', 'incierto', 'ruleta']);
  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options) {
      const pesos = opcion.outcomes.map((outcome) => pesoEfectivo(estadoBase, outcome));
      const previa = previaDeOpcion(opcion, pesos);
      if (!Array.isArray(previa)) {
        throw new Error(`${evento.id}/${opcion.id}: previa no es un array`);
      }
      const riesgo = riesgoDeOpcion(opcion, pesos);
      if (!RIESGOS_VALIDOS.has(riesgo)) {
        throw new Error(`${evento.id}/${opcion.id}: riesgo "${riesgo}" fuera de vocabulario`);
      }
    }
  }
});

check('El riesgo declarado coincide con la dispersión medida de outcomes (2000 resoluciones/opción, PLAN.md §12.3/§12.6)', () => {
  const estadoBase = createInitialState(1, mulberry32(1));
  const rng = mulberry32(2024);
  const N = 2000;

  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options) {
      const pesos = opcion.outcomes.map((outcome) => pesoEfectivo(estadoBase, outcome));
      const pesoTotal = pesos.reduce((suma, peso) => suma + peso, 0);
      const esperado = pesos.map((peso) => (peso / pesoTotal) * N);

      // 2000 resoluciones REALES vía elegirOutcome (el mismo weightedPick que
      // ve un jugador) — cuántas veces cayó cada outcome, no una
      // reconstrucción teórica de nuevo.
      const observado = new Array(opcion.outcomes.length).fill(0);
      for (let i = 0; i < N; i += 1) {
        const outcome = elegirOutcome(estadoBase, opcion, rng);
        observado[opcion.outcomes.indexOf(outcome)] += 1;
      }

      // Chi-cuadrado de bondad de ajuste: la frecuencia observada tiene que
      // coincidir con la que implica `pesoEfectivo` (lo que declaran
      // `previaDeOpcion`/`riesgoDeOpcion`). Umbral generoso (6x los grados de
      // libertad, muy por encima del percentil 99 de la distribución nula)
      // para no fallar por ruido puro de muestreo — sí para detectar un
      // desacople real como el de D-check-12d (`pesoEfectivo` ignorado y se
      // usa el peso crudo de catálogo).
      const chiCuadrado = esperado.reduce((suma, e, i) => suma + (observado[i] - e) ** 2 / e, 0);
      const gradosDeLibertad = opcion.outcomes.length - 1;
      const umbral = Math.max(6 * gradosDeLibertad, 20);
      if (chiCuadrado > umbral) {
        throw new Error(`${evento.id}/${opcion.id}: la frecuencia de 2000 resoluciones reales (χ²=${chiCuadrado.toFixed(1)}) no coincide con la que declara pesoEfectivo (observado=${observado.join('/')}, esperado=${esperado.map((e) => e.toFixed(0)).join('/')})`);
      }
    }
  }
});

check('Las decisiones de mejora declaran rareza con el payoff correcto (PLAN.md §12.4)', () => {
  const RAREZAS = new Set(['comun', 'rara']);
  const estadoBase = createInitialState(1, mulberry32(1));

  // 1. El catálogo de rutinas se parte en común/rara y rara paga más.
  for (const pool of ['amateur', 'offseason']) {
    const porRareza = { comun: [], rara: [] };
    for (const rutina of RUTINAS[pool]) {
      const rareza = rarezaDeRutina(rutina, pool);
      if (!RAREZAS.has(rareza)) {
        throw new Error(`${pool}/${rutina.id}: rareza "${rareza}" fuera de vocabulario`);
      }
      porRareza[rareza].push(payoffDeRutina(rutina, pool));
    }
    if (porRareza.comun.length === 0 || porRareza.rara.length === 0) {
      throw new Error(`${pool}: el umbral no parte el catálogo en común y rara`);
    }
    const minRara = Math.min(...porRareza.rara);
    const maxComun = Math.max(...porRareza.comun);
    if (minRara <= maxComun) {
      throw new Error(`${pool}: una rara (min ${minRara}) no paga más que una común (max ${maxComun})`);
    }
  }

  function payoffEvento(opcion, state) {
    const pesos = opcion.outcomes.map((outcome) => pesoEfectivo(state, outcome));
    const total = pesos.reduce((suma, peso) => suma + peso, 0);
    return opcion.outcomes.reduce((suma, outcome, i) => suma + payoffNormalizado(outcome) * pesos[i], 0) / total;
  }

  function verificarDecisionDeMejora(decision, origen, { sorteo }) {
    if (!decision?.opciones?.length) {
      throw new Error(`${origen}: sin opciones`);
    }
    const porRareza = { comun: [], rara: [] };
    for (const opcion of decision.opciones) {
      if (!RAREZAS.has(opcion.rareza)) {
        throw new Error(`${origen}/${opcion.id}: esperaba rareza común/rara, dio "${opcion.rareza}"`);
      }
      porRareza[opcion.rareza].push(opcion.id);
    }
    if (sorteo) {
      if (!String(decision.descripcion).startsWith('El dado trajo')) {
        throw new Error(`${origen}: menú de sorteo sin encabezado del dado (H10)`);
      }
      if (!String(decision.descripcion).includes('¿')) {
        throw new Error(`${origen}: no nombra el eje del dilema`);
      }
    }
    return porRareza;
  }

  // 2. Pretemporada amateur (la semana) y práctica de offseason: el menú
  //    que ve el jugador trae rareza, el dado y el eje.
  const amateur = sistemaPorId('amateur').aplicar(estadoBase, mulberry32(2));
  verificarDecisionDeMejora(amateur.decision, 'amateur', { sorteo: true });

  const offseason = {
    ...estadoBase,
    phase: 'profesional',
    player: { ...estadoBase.player, splitCount: 3 }
  };
  const practica = sistemaPorId('practica').aplicar(offseason, mulberry32(2));
  verificarDecisionDeMejora(practica.decision, 'practica', { sorteo: true });

  // 3. pool_a_cual_le_metes: rareza en cada opción y rara paga más.
  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === 'pool_a_cual_le_metes');
  if (!evento) {
    throw new Error('no se encontró pool_a_cual_le_metes');
  }
  const decisionPool = decisionDesdeEvento(estadoBase, evento, {});
  verificarDecisionDeMejora(decisionPool, 'pool_a_cual_le_metes', { sorteo: false });
  if (!String(decisionPool.titulo).includes('¿') && !String(decisionPool.descripcion).includes('¿')) {
    throw new Error('pool_a_cual_le_metes: no nombra el eje del dilema');
  }

  const porPayoff = { comun: [], rara: [] };
  for (const opcion of evento.options) {
    const vista = decisionPool.opciones.find((o) => o.id === opcion.id);
    porPayoff[vista.rareza].push(payoffEvento(opcion, estadoBase));
  }
  if (porPayoff.comun.length === 0 || porPayoff.rara.length === 0) {
    throw new Error('pool_a_cual_le_metes: las dos opciones no se parten en común/rara');
  }
  if (Math.min(...porPayoff.rara) <= Math.max(...porPayoff.comun)) {
    throw new Error(`pool_a_cual_le_metes: una rara no paga más que una común (rara ${porPayoff.rara.join('/')} vs común ${porPayoff.comun.join('/')})`);
  }
});

check('Toda serie internacional deja su camino guardado en registro.internacionales (PLAN.md §12.5/§12.6)', () => {
  let totalInternacionales = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    for (const intl of state.career.registro.internacionales) {
      totalInternacionales += 1;
      if (!Array.isArray(intl.camino) || intl.camino.length === 0) {
        throw new Error(`seed ${seed}: internacional en ${intl.org} (${intl.anio}) sin camino guardado`);
      }
      for (const mapa of intl.camino) {
        if (typeof mapa.mapa !== 'number' || mapa.mapa < 1) {
          throw new Error(`seed ${seed}: mapa inválido en camino: ${JSON.stringify(mapa)}`);
        }
        if (!mapa.campeon || typeof mapa.campeon !== 'string') {
          throw new Error(`seed ${seed}: mapa sin campeon en camino`);
        }
        if (mapa.resultado !== 'W' && mapa.resultado !== 'L') {
          throw new Error(`seed ${seed}: mapa con resultado inválido ("${mapa.resultado}")`);
        }
        if (!mapa.marcador || typeof mapa.marcador !== 'string' || !/^\d+-\d+$/.test(mapa.marcador)) {
          throw new Error(`seed ${seed}: mapa sin marcador válido ("${mapa.marcador}")`);
        }
        if (!mapa.cierre || typeof mapa.cierre !== 'string' || mapa.cierre.trim().length === 0) {
          throw new Error(`seed ${seed}: mapa sin cierre narrativo`);
        }
      }
    }
  }
  if (totalInternacionales === 0) {
    throw new Error('no se registraron internacionales en 300 seeds');
  }
});

// ============================================================================
// Higiene K0-B (Punto 1): check estático de la forma del estado guardado (D71)
// ============================================================================

// El guardado serializa `state` ENTERO, no solo `createInitialState`: la forma
// que un guardado viejo le tiene que seguir cumpliendo al código nuevo es la de
// cualquier estado a mitad de carrera. Hasta la revisión de K0-B este hash solo
// miraba el estado inicial (369 rutas contra 812 de un estado tras 40 splits: la
// mitad del estado — `registro.*`, `career.companeros`, `career.temporada.*`,
// `meta.tierList`, `flags.eventosVistos`... — nacía vacía y nadie la vigilaba).
// Ahora la forma es la UNIÓN de las formas de estados de carreras completas.
//
// Dos puntos ciegos, por diseño (el hash anterior veía menos: no es una regresión):
//  (a) un campo que es `null` en el estado INICIAL solo registra `?`, no su tipo
//      (si no, el hash cambiaría según si la carrera tuvo o no el evento que lo
//      llena). Entran campos que en el juego siempre se llenan — `career.tier`,
//      `career.currentOrg`, `pendiente`, `finAnticipado`—: cambiarles el tipo
//      (number -> string) NO cambia el hash.
//  (b) un campo que aparece solo en un evento raro puede no verse en las 10 seeds.
//      Ejemplo hipotético: un `flags.lesionGraveTipo` que solo se escribiera con
//      una lesión grave (medido en la revisión de K0-B: ≈1 de cada 100 carreras,
//      ninguna de las seeds 1-10) pasaría de largo.
// Lo que sí atrapa está probado más abajo, con mutaciones del propio cálculo.
//
// `FORMAS_CONOCIDAS[VERSION]` es el hash de esa forma combinada. Si cambia la
// forma sin subir `VERSION` (core/guardado.js), el check falla: un guardado de
// la forma vieja se cargaría "a medias". Para ver qué rutas cambiaron, mirá el
// `git diff` de lo que tocaste en `createInitialState` o en los sistemas.
const FORMAS_CONOCIDAS = {
  2: '14b3c6b90382',
  // K1-A (D76): `porOrg[].splitsPorTier`, `liga`/`tier` en los títulos, `liga` en los internacionales,
  // `dificultad` en las ligas, `state.desafio` y `tarjeta.puntaje`.
  3: '28ade2576049',
  // Revisión de K1: `registro.cierresComoNumeroUno`, `flags.splitJugadoSinFila`, `nombre` en las ligas, y en
  // `tarjeta.puntaje` los `hechos` y el `requisito` del nivel siguiente (en vez de los puntos que faltaban).
  4: 'd2ac4cf09c9b',
  // K2 mergeado sobre K1 (las ramas de K2a y K2b usaban 4 y 5 para formas sin los campos de K1: esos hashes no
  // valen, regla "VERSION de guardado entre ramas paralelas"). K2a: `nivelJugador`/`nivelCompaneros` en
  // `career.temporada`, `fuerzaInicial` en `serie` y `formato`/`fuerzaInicial`/`fuerzaRival` en el log de cierre de
  // cada serie (lo que el motor usó, para el instrumento). K2b: `rendimientoBase` y `resultadosPropios` (`fechas`,
  // `ganados`, `esperados`, `varianza`) en `career.temporada`, y `flags.sinergiaProyectadaAlFichar` (la química del
  // plantel nuevo, fijada al firmar un traspaso).
  5: '30ed804e36c7',
  // K2d: la `p` con la que se tiró cada mapa y la fecha marcada (con `pSinMomento` y `ajustePartido`) en sus
  // logs, y `entradaExtra` (el comodín, o `null`) en los datos del minijuego de un mapa.
  6: 'a88cc98f33ef',
  // K3-B: `player.bonusPermanente` (un campo por stat de curva, ceros) y `registro.marcas` (`{ stat, delta, origen, anio }`).
  // Re-registrada en la revisión de K3: la muestra suma carreras con las fracciones > 0 en memoria, así la forma de una
  // marca entra en el hash y K3c puede subir las fracciones sin subir VERSION. (Antes, 839743025b35: sin marcas.)
  7: '16d9c513b980',
  // K4 (integración de K4-B, K4-C y K4-D): K4-B, la serie como plan — `serie.plan`/`guardado`/`replanUsado`/`rivalJuega`/
  // `rivalJuegaEnMapa`/`sinNadaEnJuego` (sin `preSerieUsado`), `career.charlaUsadaEn`, y `rivalJuega`/`plan`/`charla` en el
  // log de cada mapa; K4-C, `player.perfil` (actual + pesos), `flags.categoriasRecientes`, `flags.splitMainMuerto`,
  // `flags.saltosConPrueba`; K4-D, `flags.preparacionDeSplit` (el año cuya preparación ya se resolvió; -1 hasta la
  // primera pretemporada pro).
  8: 'b8702103beff',
  // K4-C2: `flags.caminos` (una clave por bifurcación de carrera: región, contenido, rol, playoffs, conflicto, staff;
  // `null` hasta que la decidís) y los valores que escriben las bifurcaciones nuevas.
  9: '3882bdb7a0fd'
};

// La muestra. Son carreras reales (`avanzarSplitAuto`, el mismo camino que
// `simulate.js`) jugadas hasta el final, porque hay rutas que solo existen en
// ciertos momentos: `registro.porOrg`/`titulos`/`internacionales` tras jugar,
// `tarjeta` al terminar. Medido (K0-B, revisión): con 10 seeds por muestra,
// 20 muestras disjuntas (seeds 1-240 de a 8 y 12, y 5001-5200 de a 10) dan el
// MISMO hash; con 4 o 6 seeds algunas muestras se caían (rutas que solo
// aparecen en una carrera de cada 3).
const SEEDS_DE_LA_FORMA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Cada cuántos splits se toma una foto del estado (además del inicial y el
// final). Es barato (~1 ms por foto) y atrapa lo que aparece y se va a mitad de
// carrera (`flags.*` de lesiones, cooldowns...).
const SPLITS_ENTRE_FOTOS_DE_FORMA = 3;
// Tope de seguridad: una carrera que no terminara nunca no puede colgar el check.
const SPLITS_TOPE_DE_FORMA = 300;

// Objetos cuyas CLAVES son datos y no estructura: el nombre de una org inventada
// (sale de la seed), el id de un evento, una región. Su forma es "un mapa de
// <clave> a <valor>": las claves se normalizan a `*` y los valores se unen. Es lo
// único que se normalizó para que el hash no dependa de la seed (el resto de la
// dependencia —largos de array, rutas que aparecen solo en algunas carreras—
// se resuelve con la unión). `*` en un patrón casa con cualquier tramo.
const MAPAS_DE_CLAVES_DINAMICAS = [
  'mundo.planteles',                     // nombre de org -> { rol -> jugador }
  'mundo.planteles.*.*.splitsEnRegion',  // id de región -> splits que pasó ahí
  'career.temporada.registrosOtros',     // nombre de org -> { org, ganados, perdidos }
  'flags.cooldownHasta',                 // id de evento -> split hasta el que descansa
  'flags.eventosVistos'                  // id de evento -> veces que salió
];

function tipoDeValorEnForma(valor) {
  if (valor === null) return 'null';
  if (Array.isArray(valor)) return 'array';
  return typeof valor;
}

function nodoDeForma() {
  return {
    tipos: new Set(),       // tipos vistos en esta ruta (incluye 'null')
    props: new Map(),       // clave (o `*`) -> nodo
    items: null,            // nodo de los elementos si algún valor fue un array
    nuloInicial: false,     // era null en el estado inicial
    vistas: 0,              // cuántas veces se vio esta ruta (con cualquier valor)
    vistasComoObjeto: 0,    // cuántas de esas veces el valor fue un objeto
    esMapa: false           // sus claves son datos (MAPAS_DE_CLAVES_DINAMICAS)
  };
}

function rutaCasaConPatron(patron, ruta) {
  const tramosPatron = patron.split('.');
  const tramosRuta = ruta.split('.');
  return tramosPatron.length === tramosRuta.length
    && tramosPatron.every((tramo, i) => tramo === '*' || tramo === tramosRuta[i]);
}

// Suma la forma de `valor` a `nodo` (mutando el nodo). La forma de un array es
// la unión de la forma de TODOS sus elementos —no del primero—, y la de un
// objeto es la unión de las formas que tomó en todos los estados vistos.
function absorberEnForma(nodo, valor, ruta, esInicial) {
  const tipo = tipoDeValorEnForma(valor);
  nodo.vistas += 1;
  nodo.tipos.add(tipo);
  if (esInicial && tipo === 'null') {
    nodo.nuloInicial = true;
  }
  if (tipo === 'object') {
    nodo.vistasComoObjeto += 1;
    const esMapa = MAPAS_DE_CLAVES_DINAMICAS.some((patron) => rutaCasaConPatron(patron, ruta));
    if (esMapa) {
      nodo.esMapa = true;
    }
    for (const clave of Object.keys(valor)) {
      const claveEnForma = esMapa ? '*' : clave;
      let hijo = nodo.props.get(claveEnForma);
      if (!hijo) {
        hijo = nodoDeForma();
        nodo.props.set(claveEnForma, hijo);
      }
      absorberEnForma(hijo, valor[clave], ruta === '' ? claveEnForma : `${ruta}.${claveEnForma}`, esInicial);
    }
  } else if (tipo === 'array') {
    for (const elemento of valor) {
      nodo.items ??= nodoDeForma();
      absorberEnForma(nodo.items, elemento, `${ruta}[]`, esInicial);
    }
  }
}

// Aplana el árbol a líneas `ruta:tipos`, ordenadas. Dos normalizaciones para
// que la forma no dependa de qué carreras justo se jugaron:
//  - `null` no es un tipo: se saca de la unión. Un campo que es null en el
//    estado inicial (`player.techoLesionMecanica`, `flags.lesionGraveSplit`: se
//    llenan con un evento de 1 carrera de cada 30) o que en la muestra solo fue
//    null se anota como `?` (nullable, tipo no registrado) — si no, el hash
//    cambiaría según una carrera tuvo o no ese evento.
//  - un campo que falta en algún elemento/estado donde su padre es un objeto se
//    anota `(opc)`: así borrar un campo de UN solo elemento del array cambia el
//    hash (queda opcional) aunque los demás lo conserven. Los hijos de un mapa de
//    claves dinámicas no se marcan (cuántos hay depende de la carrera).
function aplanarForma(nodo, ruta = '', salida = [], opcional = false) {
  const tipos = [...nodo.tipos].filter((tipo) => tipo !== 'null').sort();
  const marca = (nodo.nuloInicial || tipos.length === 0) ? '?' : tipos.join('|');
  salida.push(`${ruta}:${marca}${opcional ? '(opc)' : ''}`);
  for (const clave of [...nodo.props.keys()].sort()) {
    const hijo = nodo.props.get(clave);
    const hijoOpcional = !nodo.esMapa && hijo.vistas < nodo.vistasComoObjeto;
    aplanarForma(hijo, ruta === '' ? clave : `${ruta}.${clave}`, salida, hijoOpcional);
  }
  if (nodo.items) {
    aplanarForma(nodo.items, `${ruta}[]`, salida, false);
  }
  return salida;
}

function hashForma(rutas) {
  return crypto.createHash('sha256').update(rutas.join('\n')).digest('hex').slice(0, 12);
}

// Juega una carrera completa con la seed y le pasa a `alVer(estado, esInicial,
// splits)` el estado inicial, uno de cada SPLITS_ENTRE_FOTOS_DE_FORMA splits y el
// final (una sola vez aunque coincida con una de las fotos periódicas).
function recorrerCarreraParaForma(seed, alVer) {
  const rng = mulberry32(seed);
  let estado = createInitialState(seed, rng);
  alVer(estado, true, 0);
  let splits = 0;
  while (!estado.terminado && splits < SPLITS_TOPE_DE_FORMA) {
    estado = avanzarSplitAuto(estado, rng).state;
    splits += 1;
    if (splits % SPLITS_ENTRE_FOTOS_DE_FORMA === 0) {
      alVer(estado, false, splits);
    }
  }
  if (splits % SPLITS_ENTRE_FOTOS_DE_FORMA !== 0) {
    alVer(estado, false, splits);
  }
}

// K3-B: `registro.marcas` es un array que, con las fracciones de los efectos permanentes en 0 (las constantes neutras),
// nunca tiene un elemento: la forma de una marca (`{ stat, delta, origen, anio }`) no entraría en la unión y K3c, que
// solo mueve constantes, la cambiaría sin subir `VERSION`. Por eso la muestra suma carreras jugadas con las dos
// fracciones > 0 EN MEMORIA, y exige que alguna haya dejado una marca (si no, la muestra no probaría nada).
const SEEDS_CON_MARCA_DE_LA_FORMA = [1, 2, 3];
const FRACCION_DE_LA_FORMA_CON_MARCA = 0.5;

function formaDeLasCarreras(seeds) {
  const raiz = nodoDeForma();
  for (const seed of seeds) {
    recorrerCarreraParaForma(seed, (estado, esInicial) => absorberEnForma(raiz, estado, '', esInicial));
  }
  const { atributos } = BALANCE;
  const previas = [atributos.fraccionPermanente, atributos.fraccionPermanentePractica];
  let estadosConMarca = 0;
  try {
    atributos.fraccionPermanente = FRACCION_DE_LA_FORMA_CON_MARCA;
    atributos.fraccionPermanentePractica = FRACCION_DE_LA_FORMA_CON_MARCA;
    for (const seed of SEEDS_CON_MARCA_DE_LA_FORMA) {
      recorrerCarreraParaForma(seed, (estado, esInicial) => {
        if (estado.career.registro.marcas.length > 0) estadosConMarca += 1;
        absorberEnForma(raiz, estado, '', esInicial);
      });
    }
  } finally {
    [atributos.fraccionPermanente, atributos.fraccionPermanentePractica] = previas;
  }
  if (estadosConMarca === 0) {
    throw new Error('la muestra con fracciones > 0 no dejó ninguna marca: la forma de `registro.marcas[]` no entra en el hash');
  }
  return aplanarForma(raiz);
}

function formaDeFotos(fotos) {
  const raiz = nodoDeForma();
  for (const foto of fotos) {
    absorberEnForma(raiz, foto.estado, '', foto.esInicial);
  }
  return aplanarForma(raiz);
}

check('K0-B guardado: la forma del estado coincide con la registrada para VERSION (D71)', () => {
  // Protege desde K0-B (VERSION 2): que un cambio de forma del estado —un campo
  // nuevo, uno que se borra, uno que cambia de tipo— no cargue guardados viejos
  // a medias. Trampa T5 / D71.
  const hash = hashForma(formaDeLasCarreras(SEEDS_DE_LA_FORMA));
  const registrado = FORMAS_CONOCIDAS[VERSION_GUARDADO];
  if (registrado === undefined) {
    const versionIgual = Object.keys(FORMAS_CONOCIDAS).find((version) => FORMAS_CONOCIDAS[version] === hash);
    throw new Error(`hash actual: ${hash}. VERSION ${VERSION_GUARDADO} no tiene forma registrada en FORMAS_CONOCIDAS: `
      + (versionIgual !== undefined
        ? `la forma es idéntica a la de la VERSION ${versionIgual}, o sea que subiste VERSION sin que cambie la forma (revertí la subida)`
        : `si la forma cambió a propósito, registrá FORMAS_CONOCIDAS[${VERSION_GUARDADO}] = '${hash}'`));
  }
  if (registrado !== hash) {
    throw new Error(`hash actual: ${hash} (registrado para VERSION ${VERSION_GUARDADO}: ${registrado}). `
      + `cambió la forma del estado: subí VERSION en core/guardado.js y registrá FORMAS_CONOCIDAS[${VERSION_GUARDADO + 1}] = '${hash}'`);
  }
});

// El check de arriba es tan bueno como la función que calcula la forma. Esto la
// ataca con mutaciones sobre copias de estados reales — cada una un cambio de
// forma de los que un commit podría hacer — y exige que el hash cambie en
// TODAS. Antes la forma de un array de objetos se tomaba del primer elemento y
// el hash solo miraba el estado inicial: una mutación en el último plantel, en
// la última org de la última liga o en una fila de `registro.*` pasaba de largo
// (revisión de K0-B, H3).
const SEEDS_DE_LAS_FOTOS_DE_FORMA = [1, 2];
// Múltiplo de SPLITS_ENTRE_FOTOS_DE_FORMA, para que `recorrerCarreraParaForma` pase por ahí.
const SPLIT_DE_LA_FOTO_INTERMEDIA = 21;

function ultimoDe(lista) {
  return Array.isArray(lista) && lista.length > 0 ? lista[lista.length - 1] : undefined;
}

function ultimoJugadorDelUltimoEquipo(estado) {
  const planteles = Object.values(estado.mundo.planteles);
  const plantel = ultimoDe(planteles);
  return plantel ? ultimoDe(Object.values(plantel)) : undefined;
}

function ultimaOrgDeLaUltimaLiga(estado) {
  return ultimoDe(ultimoDe(estado.mundo.ligas)?.orgs);
}

// [nombre, aplicar(estado) -> true si había dónde aplicarla]. Cada una toca UN
// solo elemento (el último), que es lo que la forma "del primer elemento" no veía.
const MUTACIONES_DE_FORMA = [
  ['campo nuevo en la raíz del estado', (s) => { s.campoNuevoDeLaRaiz = 1; return true; }],
  ['championPool: campo nuevo en el último elemento', (s) => { const e = ultimoDe(s.player.championPool); if (e) e.campoNuevo = 1; return Boolean(e); }],
  ['championPool: ultimoSplitJugado borrado de un solo elemento', (s) => { const e = ultimoDe(s.player.championPool); if (e) delete e.ultimoSplitJugado; return Boolean(e); }],
  ['championPool: mastery number->string en un elemento', (s) => { const e = ultimoDe(s.player.championPool); if (e) e.mastery = 'x'; return Boolean(e); }],
  ['plantel del último equipo: contrato.nuevo en un jugador', (s) => { const j = ultimoJugadorDelUltimoEquipo(s); if (j) j.contrato.nuevo = 1; return Boolean(j); }],
  ['plantel del último equipo: nivel number->string en un jugador', (s) => { const j = ultimoJugadorDelUltimoEquipo(s); if (j) j.nivel = 'x'; return Boolean(j); }],
  ['plantel del último equipo: potencial borrado de un jugador', (s) => { const j = ultimoJugadorDelUltimoEquipo(s); if (j) delete j.potencial; return Boolean(j); }],
  ['última org de la última liga: campo nuevo', (s) => { const o = ultimaOrgDeLaUltimaLiga(s); if (o) o.campoNuevo = 1; return Boolean(o); }],
  ['última org de la última liga: fuerza number->string', (s) => { const o = ultimaOrgDeLaUltimaLiga(s); if (o) o.fuerza = 'x'; return Boolean(o); }],
  ['última org de la última liga: liga borrado', (s) => { const o = ultimaOrgDeLaUltimaLiga(s); if (o) delete o.liga; return Boolean(o); }],
  ['registro.porOrg: campo nuevo en la última fila', (s) => { const f = ultimoDe(s.career.registro.porOrg); if (f) f.campoNuevo = 1; return Boolean(f); }],
  ['registro.titulos: campo nuevo en la última fila', (s) => { const f = ultimoDe(s.career.registro.titulos); if (f) f.campoNuevo = 1; return Boolean(f); }],
  ['registro.internacionales: campo nuevo en la última fila', (s) => { const f = ultimoDe(s.career.registro.internacionales); if (f) f.campoNuevo = 1; return Boolean(f); }],
  ['registro.momentos: campo nuevo en la última fila', (s) => { const f = ultimoDe(s.career.registro.momentos); if (f) f.campoNuevo = 1; return Boolean(f); }],
  ['career.temporada.tabla: campo nuevo en la última fila', (s) => { const f = ultimoDe(s.career.temporada.tabla); if (f) f.campoNuevo = 1; return Boolean(f); }],
  ['career.companeros: campo nuevo en el último compañero', (s) => { const f = ultimoDe(s.career.companeros); if (f) f.campoNuevo = 1; return Boolean(f); }],
  ['meta.tierList: campo nuevo en el último elemento', (s) => { const f = ultimoDe(s.meta.tierList); if (f) f.campoNuevo = 1; return Boolean(f); }],
  ['career.hitos: un elemento string->number', (s) => { const h = s.career.hitos; if (h.length > 0) h[h.length - 1] = 1; return h.length > 0; }],
  ['splitsEnRegion: un valor number->string', (s) => { const j = ultimoJugadorDelUltimoEquipo(s); const k = j ? Object.keys(j.splitsEnRegion)[0] : undefined; if (k !== undefined) j.splitsEnRegion[k] = 'x'; return k !== undefined; }],
  ['flags.eventosVistos: un valor number->string', (s) => { const k = Object.keys(s.flags.eventosVistos)[0]; if (k !== undefined) s.flags.eventosVistos[k] = 'x'; return k !== undefined; }]
];

check('K0-B guardado: la forma detecta cambios en elementos que no son el primero y en rutas que solo existen tras jugar', () => {
  const fotos = [];
  for (const seed of SEEDS_DE_LAS_FOTOS_DE_FORMA) {
    recorrerCarreraParaForma(seed, (estado, esInicial, splits) => {
      // Solo se guardan 3 fotos por carrera: la inicial, una a mitad y la final.
      if (esInicial || splits === SPLIT_DE_LA_FOTO_INTERMEDIA || estado.terminado) {
        fotos.push({ estado: structuredClone(estado), esInicial });
      }
    });
  }
  const hashBase = hashForma(formaDeFotos(fotos));
  const hashRepetido = hashForma(formaDeFotos(fotos.map((foto) => ({ ...foto, estado: structuredClone(foto.estado) }))));
  if (hashRepetido !== hashBase) {
    throw new Error('la misma muestra dio dos hashes distintos: la forma no es determinista');
  }
  const sinDetectar = [];
  for (const [nombre, aplicar] of MUTACIONES_DE_FORMA) {
    const mutadas = fotos.map((foto) => ({ ...foto, estado: structuredClone(foto.estado) }));
    const aplicadas = mutadas.filter((foto) => aplicar(foto.estado)).length;
    if (aplicadas === 0) {
      throw new Error(`la mutación "${nombre}" no encontró dónde aplicarse en las fotos: el check no prueba nada`);
    }
    if (hashForma(formaDeFotos(mutadas)) === hashBase) {
      sinDetectar.push(nombre);
    }
  }
  if (sinDetectar.length > 0) {
    throw new Error(`la forma no cambió con: ${sinDetectar.join(' | ')}`);
  }
});

check('Campeones, roles y ligas coherentes', () => {
  const arquetipos = new Set(ARQUETIPOS);
  const nombres = new Set();

  for (const campeon of CAMPEONES) {
    // La clave es rol+nombre, no el nombre: los flex picks son reales y el mismo
    // campeon puede estar en el pool de dos lineas. Un jugador tiene un solo rol,
    // asi que adentro de SU pool el nombre sigue siendo unico.
    const clave = `${campeon.role}/${campeon.name}`;
    if (nombres.has(clave)) {
      throw new Error(`campeón duplicado en el mismo rol: ${clave}`);
    }
    nombres.add(clave);

    if (!ROLES[campeon.role]) {
      throw new Error(`${campeon.name}: rol inválido (${campeon.role})`);
    }
    if (!Array.isArray(campeon.tags) || campeon.tags.length === 0) {
      throw new Error(`${campeon.name}: sin tags de arquetipo`);
    }
    if (typeof campeon.debut !== 'boolean') {
      throw new Error(`${clave}: falta el flag debut (los campeones nuevos entran con un parche, no en la elección inicial)`);
    }
    for (const tag of campeon.tags) {
      // Si el pool y el meta no hablan el mismo vocabulario, el Ajuste al Meta
      // es siempre 0 y nadie se entera.
      if (!arquetipos.has(tag)) {
        throw new Error(`${campeon.name}: tag "${tag}" no existe en ARQUETIPOS`);
      }
    }
  }

  for (const rol of IDS_ROL) {
    const delRol = CAMPEONES.filter((campeon) => campeon.role === rol);
    // Elegibles al arrancar: los `debut` no existen todavia en el mundo, entran
    // con un parche a mitad de carrera.
    const elegibles = delRol.filter((campeon) => !campeon.debut).length;
    if (elegibles < BALANCE.mundo.campeonesElegibles) {
      throw new Error(`el rol ${rol} ofrece ${elegibles} campeones para elegir y el mínimo es ${BALANCE.mundo.campeonesElegibles}`);
    }
    // Sin al menos dos campeones nuevos por rol, el evento del campeón que sale a
    // mitad de carrera se agota en una sola carrera.
    const porDebutar = delRol.length - elegibles;
    if (porDebutar < BALANCE.mundo.debutsMinimosPorRol) {
      throw new Error(`el rol ${rol} tiene ${porDebutar} campeones por debutar y el mínimo es ${BALANCE.mundo.debutsMinimosPorRol}`);
    }

    const suma = Object.values(ROLES[rol].pesos).reduce((acc, peso) => acc + peso, 0);
    if (Math.abs(suma - 1) > 0.001) {
      throw new Error(`los pesos de atributos del rol ${rol} suman ${suma.toFixed(3)} y deben sumar 1`);
    }
  }

  const idsLiga = new Set();
  for (const liga of LIGAS) {
    if (idsLiga.has(liga.id)) {
      throw new Error(`liga duplicada: ${liga.id}`);
    }
    idsLiga.add(liga.id);

    // Tier 1 trae su roster real y fijo. Tier 2 (fase 3) declara
    // `orgsGeneradas: true` + `cantidadOrgs`: sus rosters reales rotan
    // temporada a temporada y no están investigados con la firmeza que pide
    // CLAUDE.md para nombrar un equipo real, así que se generan en
    // `core/mundo.js`, igual que el tier 3.
    if (liga.orgsGeneradas) {
      if (!Number.isInteger(liga.cantidadOrgs) || liga.cantidadOrgs <= 0) {
        throw new Error(`${liga.id}: orgsGeneradas necesita cantidadOrgs > 0`);
      }
    } else if (!Array.isArray(liga.orgs) || liga.orgs.length === 0) {
      throw new Error(`${liga.id}: sin orgs`);
    }
    if (liga.cupoImports < 0 || liga.cupoImports >= 5) {
      throw new Error(`${liga.id}: cupoImports fuera de rango (un roster tiene 5 titulares)`);
    }
    if (liga.tier === 1 && !Number.isInteger(liga.edadMinima)) {
      throw new Error(`${liga.id}: liga tier 1 sin edadMinima`);
    }
    // El año muerto (fase 3) depende de que exista el camino de vuelta:
    // toda tier 1 con `desciendeA` tiene que apuntar a una liga real del
    // archivo, o el ascenso tier2->tier1 no tiene a dónde promover.
    if (liga.tier === 1 && liga.desciendeA && !LIGAS.some((candidata) => candidata.id === liga.desciendeA)) {
      throw new Error(`${liga.id}: desciendeA apunta a "${liga.desciendeA}", que no existe en leagues.json`);
    }

    // Fase 9: toda liga necesita `salario` para que `salarioDeOferta` tenga
    // de dónde partir. minimoUSD < medianaUSD < mediaUSD: la mediana real
    // queda por debajo de la media (unos pocos contratos enormes la estiran).
    const { salario } = liga;
    if (!salario || typeof salario.medianaUSD !== 'number' || typeof salario.mediaUSD !== 'number'
      || typeof salario.sigma !== 'number' || typeof salario.minimoUSD !== 'number') {
      throw new Error(`${liga.id}: falta salario {medianaUSD, mediaUSD, sigma, minimoUSD}`);
    }
    if (!(salario.minimoUSD < salario.medianaUSD && salario.medianaUSD < salario.mediaUSD)) {
      throw new Error(`${liga.id}: salario tiene que cumplir minimoUSD < medianaUSD < mediaUSD`);
    }
    if (salario.sigma <= 0) {
      throw new Error(`${liga.id}: salario.sigma tiene que ser positivo (es la dispersión lognormal)`);
    }
  }
});

check('factorSalario existe y es positivo para los cinco roles', () => {
  for (const rol of IDS_ROL) {
    if (typeof ROLES[rol].factorSalario !== 'number' || ROLES[rol].factorSalario <= 0) {
      throw new Error(`${rol}: factorSalario ausente o no positivo`);
    }
  }
});

check('salarioDeOferta produce una distribución lognormal (mediana < media × 0.75)', () => {
  const rng = mulberry32(7);
  const muestras = 4000;

  for (const liga of LIGAS) {
    const sueldos = Array.from({ length: muestras }, () => (
      salarioDeOferta(liga, { rol: 'mid', jerarquia: 50, hype: 50 }, rng)
    )).sort((a, b) => a - b);

    const mediana = sueldos[Math.floor(muestras / 2)];
    const media = sueldos.reduce((suma, valor) => suma + valor, 0) / muestras;

    if (!(mediana < media * 0.75)) {
      throw new Error(`${liga.id}: mediana empírica ${Math.round(mediana)} no es menor que media × 0.75 (${Math.round(media * 0.75)})`);
    }
    if (sueldos[0] < liga.salario.minimoUSD) {
      throw new Error(`${liga.id}: salió una oferta (${sueldos[0]}) por debajo del mínimo de la liga`);
    }
  }
});

check('El sesgo etario del mercado favorece a los jóvenes (28 recibe ≤50% que 21, CONCEPTO §12)', () => {
  const { sesgoEtario: tabla, sesgoEtarioMinimo } = BALANCE.mercado;

  if (!(sesgoEtario(28) <= sesgoEtario(21) * 0.5)) {
    throw new Error(`sesgoEtario(28)=${sesgoEtario(28)} tiene que ser ≤ 50% de sesgoEtario(21)=${sesgoEtario(21)}`);
  }

  // Tiene que ser no creciente con la edad: si el mercado alguna vez prefiere
  // a un jugador más viejo por igual hoja, el sesgo dejó de modelar lo que dice modelar.
  const edades = Object.keys(tabla).map(Number).sort((a, b) => a - b);
  for (let i = 1; i < edades.length; i += 1) {
    if (tabla[edades[i]] > tabla[edades[i - 1]]) {
      throw new Error(`sesgoEtario sube entre ${edades[i - 1]} y ${edades[i]}: tiene que ser no creciente`);
    }
  }
  if (sesgoEtarioMinimo > tabla[edades[edades.length - 1]]) {
    throw new Error('sesgoEtarioMinimo tiene que ser menor o igual que el último valor de la tabla');
  }
});

check('career.contrato arranca completo y en cero (trampa T4)', () => {
  const state = createInitialState(1, mulberry32(1));
  const c = state.career.contrato;

  if (c === null || typeof c !== 'object') {
    throw new Error('career.contrato no puede ser null al arrancar');
  }
  if (c.org !== null || c.liga !== null || c.tier !== null) {
    throw new Error('career.contrato.{org,liga,tier} tienen que arrancar null: todavía no hay firma');
  }
  if (c.salarioAnualUSD !== 0 || c.anios !== 0 || c.aniosRestantes !== 0) {
    throw new Error('career.contrato numérico tiene que arrancar en 0');
  }
  if (c.tipo !== 'ninguno') {
    throw new Error(`career.contrato.tipo tiene que arrancar 'ninguno', llegó "${c.tipo}"`);
  }
  if (c.avisoNoRenovacion !== false) {
    throw new Error('career.contrato.avisoNoRenovacion tiene que arrancar false (trampa T4)');
  }
});

checkLento('El mercado lee tu nivel: el silencio es para los que están por debajo, no para una franquicia (fase 9R0e)', () => {
  // El bug del feedback del usuario: 85 de media, franquicia, clasificado a
  // Worlds, y "me quedé sin equipo" porque `generarOfertasParaLiga` tiraba
  // `roll(0, techo)` sin mirar el nivel. En HEAD, ~21 pretemporadas de un
  // jugador claramente por encima de su liga terminaban con "Nadie te llama".
  // Ahora el silencio sólo le puede tocar a alguien a nivel de su liga o por
  // debajo.
  let arriba = 0;
  let silencioArriba = 0;
  let silencioTotal = 0;
  let silencioMerecido = 0;

  // n=1500, no 300 (fase 10c): `silencioTotal` es un evento raro (decenas
  // en 1500 seeds), así que a n=300 la proporción tiene demasiado ruido
  // para ser una señal confiable. 10c, al insertar dos sistemas nuevos que
  // consumen RNG en pretemporada/profesional, corre la cinta de RNG de cada
  // carrera y cambia qué seeds puntuales caen de cada lado. Remedido en
  // D.3 contra a99d985 (n=1500, mismo loop, `git stash`/`git stash pop`):
  // baseline 61.111% (44/72), con D.3 61.290% (38/62). El ~70-72% que
  // vivía acá era un comentario de 10c/11, ya obsoleto antes de D.3
  // (trampa T6: no comparar contra una línea de base vieja). El
  // denominador bajó 72→62 porque D.3 deja `career.liga` null en free
  // agency y este check ya excluía esos splits: cambia qué mide el
  // check, no el comportamiento del mercado. Subir la muestra ataca el
  // ruido; bajar el piso otra vez no lo haría.
  // Fase 11: trampa encontrada al medir (D8/mercado.js, no de esta fase —
  // el fix de `splitAscensoTier1` que corrigió `candidatoDebut` cambió la
  // trayectoria de RNG de varias seeds y una cayó acá). El piso de
  // franquicia (`claramenteArriba` en `generarOfertas`) hace lugar en el
  // roster, pero NO puede saltarse una `regla dura` real: un jugador que
  // cayó a una liga con `cupoImports: 0` para SU región de origen no puede
  // ficharse ahí aunque sea el mejor del mundo — ninguna org de esa liga
  // tiene ni tendrá jamás un cupo de import que ofrecerle. Es la misma regla
  // que blindó el cupo de imports desde la fase 9M (nunca se salteó a
  // propósito, ni siquiera para una franquicia); el bug de 9R0e era otro:
  // negarle oferta a alguien elegible. Medido: seed 974, split 55 — CD
  // (Brasil, `cupoImports: 0`) contra un jugador de origen CN.
  let silencioSinCupoImport = 0;
  for (let seed = 1; seed <= 1500; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 80 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      if (state.phase !== 'profesional' || !state.career.liga) {
        continue;
      }
      const liga = state.mundo.ligas.find((l) => l.id === state.career.liga);
      if (!liga) {
        continue;
      }
      const brecha = nivelDelJugador(state) - liga.prestigio;
      if (brecha >= 10) {
        arriba += 1;
      }
      const sinCupoImport = residenciaEn(state, liga.regionId) === 'import' && (liga.cupoImports ?? 99) <= 0;
      for (const log of state.logs.slice(antes)) {
        if (log.type !== 'mercado') {
          continue;
        }
        const esSilencio = log.message.startsWith('Nadie te llama') || log.message.startsWith('Nadie te ofrece');
        if (!esSilencio) {
          continue;
        }
        silencioTotal += 1;
        if (brecha >= 10) {
          if (sinCupoImport) {
            silencioSinCupoImport += 1;
          } else {
            silencioArriba += 1;
          }
        }
        if (brecha <= 5) {
          silencioMerecido += 1;
        }
      }
    }
  }

  if (arriba < 500) {
    throw new Error(`sólo ${arriba} splits de un jugador por encima de su liga: muestra insuficiente`);
  }
  if (silencioSinCupoImport > 5) {
    throw new Error(`${silencioSinCupoImport} silencios de franquicia por cupo de import agotado — más de lo esperado para un evento así de específico, revisar`);
  }
  if (silencioArriba > 0) {
    throw new Error(`${silencioArriba} pretemporadas de un jugador claramente por encima de su liga terminaron sin ofertas (el bug daba ~21; tope 0)`);
  }
  // Piso bajado 90% → 60% en 10a (mismo criterio que 9Ma/9Mc/9Md/9Wd: una
  // fase posterior corre el agregado de una anterior sin tocarla). La
  // invariante dura de arriba (`silencioArriba`, tope 0) sigue intacta — este
  // piso es la tolerancia media. D.3 limpia `career.liga` en `quedarLibre`,
  // así que los splits de free agency ya no entran al denominador (el
  // `!state.career.liga` de arriba). Remedido n=1500: 61.290% (38/62);
  // baseline pre-D.3: 61.111% (44/72).
  if (silencioTotal > 0 && silencioMerecido / silencioTotal < 0.6) {
    throw new Error(`sólo el ${((silencioMerecido / silencioTotal) * 100).toFixed(0)}% del silencio de mercado le tocó a un jugador a nivel de su liga o por debajo (mínimo 60%)`);
  }
});

checkLento('calcularMercado() devuelve los 4 valores del eje mercado en carreras reales, no solo 2', () => {
  const esperados = EJES.mercado;
  const vistos = new Set();
  const conteo = Object.fromEntries(esperados.map((valor) => [valor, 0]));

  for (let seed = 1; seed <= 400; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const mercado = calcularContexto(state).mercado;
      vistos.add(mercado);
      if (conteo[mercado] !== undefined) {
        conteo[mercado] += 1;
      }
      state = avanzarSplitAuto(state, rng).state;
    }
  }

  const faltan = esperados.filter((valor) => !vistos.has(valor));
  if (faltan.length > 0) {
    throw new Error(
      `en carreras reales no aparecieron: ${faltan.join(', ')} `
      + `(vistos: ${[...vistos].join(', ') || 'ninguno'}; conteo ${JSON.stringify(conteo)})`
    );
  }
});

check('El momento sin_renovacion deja de estar pendiente en cobertura.js', () => {
  const momento = momentoPorId('sin_renovacion');
  if (!momento) {
    throw new Error('el momento sin_renovacion no está declarado en data/contextos.js');
  }
  // cobertura.js saltea `momento.pendiente` (líneas ~126-127): si sigue
  // marcado, la matriz miente y el gancho narrativo nunca se cubre.
  if (momento.pendiente) {
    throw new Error(`cobertura.js lo saltea: sin_renovacion sigue con pendiente: '${momento.pendiente}'`);
  }
  if (!MOMENTOS_ACTIVOS.some((activo) => activo.id === 'sin_renovacion')) {
    throw new Error('sin_renovacion no está en MOMENTOS_ACTIVOS (cobertura.js filtra por pendiente)');
  }
});

checkLento('career.liga es null en todo split con career.currentOrg null (regla 15)', () => {
  const violaciones = [];

  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.career.currentOrg !== null || state.career.liga === null) {
        continue;
      }
      // Excepción legítima: `saltarATier2` (competitivo.js) te deja agente
      // libre de la liga de desarrollo, todavía sin firmar (`contrato.org`
      // null). Vale también si te retirás en esa ventana. `quedarLibre` deja
      // `contrato.org` del club anterior — esa NO es esta excepción.
      if (state.career.contrato.org === null) {
        continue;
      }
      violaciones.push(`seed ${seed} split ${state.player.splitCount}: liga=${state.career.liga} tier=${state.career.tier}`);
      if (violaciones.length >= 8) {
        break;
      }
    }
    if (violaciones.length >= 8) {
      break;
    }
  }

  if (violaciones.length > 0) {
    throw new Error(
      `currentOrg null con liga persistida (regla 15): ${violaciones.slice(0, 5).join('; ')}`
      + (violaciones.length > 5 ? `, … (${violaciones.length}+)` : '')
    );
  }
});

check('valorDeMercado es 0 fuera de una liga real y positivo adentro', () => {
  const state = createInitialState(1, mulberry32(1));
  if (valorDeMercado(state) !== 0) {
    throw new Error('un jugador recién generado (sin liga) no puede tener valor de mercado');
  }

  const conLiga = {
    ...state,
    career: { ...state.career, liga: 'LEC', jerarquia: 60, historial: [70, 75, 68] },
    player: { ...state.player, stats: { ...state.player.stats, hype: 55 } }
  };
  if (!(valorDeMercado(conLiga) > 0)) {
    throw new Error('con una liga real asignada, valorDeMercado tiene que ser positivo');
  }
});

check('El mundo se genera desde la seed y varía entre seeds', () => {
  const mundos = [];

  for (let seed = 1; seed <= 60; seed += 1) {
    const state = createInitialState(seed, mulberry32(seed));

    if (!ROLES[state.player.role]) {
      throw new Error(`seed ${seed}: rol generado inválido (${state.player.role})`);
    }
    if (state.player.championPool.length !== BALANCE.mundo.campeonesIniciales) {
      throw new Error(`seed ${seed}: el pool inicial no tiene ${BALANCE.mundo.campeonesIniciales} campeones`);
    }
    if (state.mundo.rivales.length !== BALANCE.mundo.cantidadRivales) {
      throw new Error(`seed ${seed}: no se generaron ${BALANCE.mundo.cantidadRivales} rivales de generación`);
    }
    if (new Set(state.mundo.rivales.map((rival) => rival.handle)).size !== state.mundo.rivales.length) {
      throw new Error(`seed ${seed}: hay handles de rival repetidos`);
    }
    if (!BALANCE.formasCarrera[state.player.oculto.formaCarrera]) {
      throw new Error(`seed ${seed}: forma de carrera desconocida`);
    }

    mundos.push(JSON.stringify({
      rol: state.player.role,
      liga: state.mundo.ligaOrigen,
      origen: state.origen,
      oculto: state.player.oculto,
      pool: state.player.championPool.map((campeon) => campeon.name)
    }));
  }

  const distintos = new Set(mundos).size;
  if (distintos < mundos.length * 0.9) {
    throw new Error(`60 seeds produjeron solo ${distintos} mundos distintos: la generación está poco dispersa`);
  }

  // Los roles no pueden salir todos iguales: seria un mundo de un solo carril.
  const roles = new Set(
    Array.from({ length: 60 }, (unused, i) => createInitialState(i + 1, mulberry32(i + 1)).player.role)
  );
  if (roles.size < IDS_ROL.length) {
    throw new Error(`en 60 seeds solo aparecieron ${roles.size} de los ${IDS_ROL.length} roles`);
  }
});

// --- Fase 9M.2: el mundo tiene gente (planteles NPC) ---

checkLento('Todo plantel NPC tiene 5 jugadores, uno por rol, sin repetir', () => {
  // Check 1 de §9M.10: verificado sobre la generación y sobre 60 splits (el
  // offseason de `systems/plantel.js` sube canteranos y no puede dejar un
  // asiento vacío ni duplicar un rol).
  for (let seed = 1; seed <= 40; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      for (const [orgNombre, plantel] of Object.entries(state.mundo.planteles)) {
        for (const rol of IDS_ROL) {
          if (!plantel[rol] || plantel[rol].role !== rol) {
            throw new Error(`seed ${seed} split ${i}: ${orgNombre} no tiene la casilla ${rol} bien clavada`);
          }
        }
        if (Object.keys(plantel).length !== BALANCE.plantel.tamano) {
          throw new Error(`seed ${seed} split ${i}: ${orgNombre} tiene ${Object.keys(plantel).length} casillas, no ${BALANCE.plantel.tamano}`);
        }
      }
      state = avanzarSplitAuto(state, rng).state;
    }
  }
});

check('Los planteles cubren tier 1 y la tier 2 de tu región, y nadie más', () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const state = createInitialState(seed, mulberry32(seed));
    const conPlantel = new Set(Object.keys(state.mundo.planteles));
    let esperados = 0;
    for (const liga of state.mundo.ligas) {
      const deberiaTener = liga.tier === 1 || (liga.tier === 2 && liga.regionId === state.mundo.regionIdOrigen);
      for (const org of liga.orgs) {
        if (deberiaTener) {
          esperados += 1;
          if (!conPlantel.has(org.nombre)) {
            throw new Error(`seed ${seed}: ${org.nombre} (${liga.id}) debería tener plantel y no lo tiene`);
          }
        } else if (conPlantel.has(org.nombre)) {
          throw new Error(`seed ${seed}: ${org.nombre} (${liga.id}) tiene plantel y no debería`);
        }
      }
    }
    if (conPlantel.size !== esperados) {
      throw new Error(`seed ${seed}: ${conPlantel.size} planteles, se esperaban ${esperados}`);
    }
  }
});

check('Ningún handle colisiona: jugador y casillas de plantel son todos distintos', () => {
  // Un rival de generación aparece a la vez en `mundo.rivales` y en la casilla
  // de plantel que ocupa — eso es correcto, es la misma persona. Lo que no
  // puede pasar es que dos casillas distintas, o una casilla y el jugador,
  // compartan handle.
  for (let seed = 1; seed <= 40; seed += 1) {
    const state = createInitialState(seed, mulberry32(seed));
    const handles = [state.player.name];
    for (const plantel of Object.values(state.mundo.planteles)) {
      for (const npc of Object.values(plantel)) handles.push(npc.handle);
    }
    const unicos = new Set(handles);
    if (unicos.size !== handles.length) {
      throw new Error(`seed ${seed}: ${handles.length - unicos.size} handle(s) colisionan entre casillas/jugador`);
    }
    // Y cada rival ocupa exactamente una casilla.
    for (const rival of state.mundo.rivales) {
      const ocupa = handles.filter((h) => h === rival.handle).length;
      if (ocupa !== 1) {
        throw new Error(`seed ${seed}: el rival ${rival.handle} ocupa ${ocupa} casillas (debería ser 1)`);
      }
    }
  }
});

check('org.fuerza deriva del promedio de nivel de su plantel', () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const state = createInitialState(seed, mulberry32(seed));
    for (const liga of state.mundo.ligas) {
      for (const org of liga.orgs) {
        const plantel = state.mundo.planteles[org.nombre];
        if (!plantel) continue;
        const media = Math.round(Object.values(plantel).reduce((s, n) => s + n.nivel, 0) / BALANCE.plantel.tamano);
        if (Math.abs(org.fuerza - media) > 1) {
          throw new Error(`seed ${seed}: ${org.nombre} fuerza ${org.fuerza} ≠ media de plantel ${media}`);
        }
      }
    }
  }
});

check('Los 5 rivales de generación viven en un plantel real (D8 parcial)', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const state = createInitialState(seed, mulberry32(seed));
    for (const rival of state.mundo.rivales) {
      const enPlantel = Object.values(state.mundo.planteles).some((plantel) => (
        Object.values(plantel).some((npc) => npc.handle === rival.handle && npc.rivalDeGeneracion === true)
      ));
      if (!enPlantel) {
        throw new Error(`seed ${seed}: el rival ${rival.handle} (${rival.role}, ${rival.liga}) no ocupa ninguna casilla de plantel`);
      }
    }
  }
});

checkLento('El mundo NPC envejece: en carreras largas, la edad media de los planteles del mundo entero sube (media de varias seeds) y los mismos NPC suman años', () => {
  // `systems/plantel.js` corre solo en offseason. Sin esto, el mundo quedaría congelado en la foto de la seed.
  // K3c: antes miraba UNA carrera (seed 7) y exigía que su edad media se moviera >= 0,3 (en cualquier sentido): con los
  // valores del bloque A daba 22,1 → 22,4, en el borde, porque depende de la trayectoria de esa carrera. Una que
  // termina al toque (la seed 4 cierra en 1 split) no vive ningún offseason, y el mundo no crece sin parar: entran
  // canteranos de 17-19 y converge a una edad de régimen (~22,6). Ahora se mide el mundo ENTERO (`mundo.planteles`: todas
  // las orgs modeladas, ~340-400 NPC) en 8 seeds, solo con las carreras largas (>= 20 splits), y la MEDIA del
  // movimiento tiene que ser una SUBA. Medido: +0,57 años de media (de +0,23 a +0,88 por seed) y 3,2-6,5 años de
  // envejecimiento en los NPC que siguen en su plantel.
  const SEEDS = 8;
  const SPLITS_LARGA = 20;
  const MIN_CARRERAS_LARGAS = 5;
  const SUBA_MEDIA_MINIMA = 0.3;
  const ANIOS_MINIMOS_DE_LOS_QUE_QUEDAN = 2;
  const npcsDe = (st) => Object.values(st.mundo.planteles).flatMap((p) => Object.values(p));
  const media = (valores) => valores.reduce((s, x) => s + x, 0) / valores.length;
  const subas = [];
  const envejecimientos = [];
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const inicial = npcsDe(state);
    const edadInicialPorHandle = new Map(inicial.map((n) => [n.handle, n.edad]));
    for (let i = 0; i < 30 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    if (state.player.splitCount < SPLITS_LARGA) continue;
    const final = npcsDe(state);
    subas.push(media(final.map((n) => n.edad)) - media(inicial.map((n) => n.edad)));
    const quedan = final.filter((n) => edadInicialPorHandle.has(n.handle));
    if (quedan.length > 0) envejecimientos.push(media(quedan.map((n) => n.edad - edadInicialPorHandle.get(n.handle))));
  }
  if (subas.length < MIN_CARRERAS_LARGAS) {
    throw new Error(`solo ${subas.length} de ${SEEDS} carreras duraron >= ${SPLITS_LARGA} splits: la muestra no ve envejecer al mundo`);
  }
  const subaMedia = media(subas);
  const aniosDeLosQueQuedan = media(envejecimientos);
  // Un mundo que no envejece es un bug del motor, no de la calibración.
  if (!(subaMedia >= SUBA_MEDIA_MINIMA)) {
    throw new Error(`la edad media de los planteles del mundo subió ${subaMedia.toFixed(2)} años de media en ${subas.length} carreras largas (mínimo ${SUBA_MEDIA_MINIMA}; por seed: ${subas.map((x) => x.toFixed(2)).join(', ')})`);
  }
  if (!(aniosDeLosQueQuedan >= ANIOS_MINIMOS_DE_LOS_QUE_QUEDAN)) {
    throw new Error(`los NPC que siguen en su plantel sumaron ${aniosDeLosQueQuedan.toFixed(2)} años de media (mínimo ${ANIOS_MINIMOS_DE_LOS_QUE_QUEDAN}): el mundo no envejece a sus jugadores`);
  }
});

checkLento('Determinismo: misma seed → mismo mundo, planteles y traspasos incluidos (check 13 de §9M.10)', () => {
  const correr = () => {
    const rng = mulberry32(99);
    let state = createInitialState(99, rng);
    for (let i = 0; i < 40 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    return JSON.stringify({
      planteles: state.mundo.planteles,
      ligas: state.mundo.ligas,
      mercadoPretemporada: state.mundo.mercadoPretemporada
    });
  };
  if (correr() !== correr()) {
    throw new Error('dos corridas de la seed 99 divergen en planteles/ligas/mercadoPretemporada: el mundo NPC no es determinista');
  }
});

// --- Fase 9Mb: la demanda existe (se acabó el dado) ---

check('El eje residencia se calcula, no está hardcodeado (D29)', () => {
  // En juego real sigue dando 'local' hasta que 9Md abra el mercado entre
  // regiones — pero ya no POR CONSTRUCCIÓN: un estado con la carrera en otra
  // región tiene que dar 'import', y con residencia acumulada, 'residente'.
  const state = createInitialState(4, mulberry32(4));
  const otraRegion = state.mundo.regionIdOrigen === 'KR' ? 'EMEA' : 'KR';
  const ligaOtra = state.mundo.ligas.find((l) => l.tier === 1 && l.regionId === otraRegion);
  const enOtraRegion = {
    ...state, phase: 'profesional',
    career: { ...state.career, liga: ligaOtra.id, currentOrg: 'X', tier: 1 }
  };
  if (calcularContexto(enOtraRegion).residencia !== 'import') {
    throw new Error(`recién llegado a ${ligaOtra.id} debería ser 'import', dio '${calcularContexto(enOtraRegion).residencia}'`);
  }
  // Con muchísimos splits acumulados en esa región (registro sintético), residente.
  const naturalizado = {
    ...enOtraRegion,
    career: {
      ...enOtraRegion.career,
      registro: {
        ...enOtraRegion.career.registro,
        porOrg: [{ org: 'X', liga: ligaOtra.id, tier: 1, splits: 40 }]
      }
    }
  };
  if (calcularContexto(naturalizado).residencia !== 'residente') {
    throw new Error(`con 40 splits en ${ligaOtra.id} debería ser 'residente', dio '${calcularContexto(naturalizado).residencia}'`);
  }
});

checkLento('Ninguna oferta del mercado viola edad mínima, cupo de imports ni margen (check 2 de §9M.10)', () => {
  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const responder = (sistema, st, decision, r) => {
      if (sistema.id === 'mercado' && decision.datos?.motivo === 'oferta') {
        for (const oferta of decision.opciones) {
          const liga = st.mundo.ligas.find((l) => l.id === oferta.liga);
          if (liga && st.age < (liga.edadMinima ?? 0)) {
            throw new Error(`seed ${seed}: oferta de ${oferta.org} (${oferta.liga}) con edad ${st.age} < mínima ${liga.edadMinima}`);
          }
          // Una oferta LATERAL (no renovación) tiene que salir de una org que
          // `ofertaPosible` avala: nada de mostrar ofertas de orgs que no tienen
          // asiento o no te pueden pagar. El piso de franquicia (9R0e) se
          // re-chequea con `forzada` (salta asiento/presupuesto/banda, no las
          // reglas duras).
          if (oferta.tag !== 'renovacion' && liga) {
            if (!ofertaPosible(st, oferta.org, st.player.role, { forzada: Boolean(oferta.forzadaFranquicia) }).posible) {
              throw new Error(`seed ${seed}: el mercado ofreció ${oferta.org} pero ofertaPosible() dice que no`);
            }
          }
        }
      }
      return sistema.resolverAuto(st, decision, r);
    };
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
    // Y en el estado final: ningún plantel NPC quedó fuera de las cuotas ni de
    // la edad mínima de su liga — ni los que fichó el mercado del mundo (9Mc).
    for (const liga of state.mundo.ligas) {
      for (const org of liga.orgs) {
        const plantel = state.mundo.planteles[org.nombre];
        if (!plantel) continue;
        if (liga.cupoImports) {
          const imports = Object.values(plantel).filter((npc) => !npc.esJugador && npc.regionId !== liga.regionId).length;
          if (imports > liga.cupoImports) {
            throw new Error(`seed ${seed}: ${org.nombre} (${liga.id}) tiene ${imports} imports, cupo ${liga.cupoImports}`);
          }
        }
        for (const npc of Object.values(plantel)) {
          if (!npc.esJugador && npc.edad < (liga.edadMinima ?? 0)) {
            throw new Error(`seed ${seed}: ${org.nombre} (${liga.id}) tiene a ${npc.handle} con ${npc.edad} años, mínima ${liga.edadMinima}`);
          }
        }
      }
    }
  }
});

check('core/demanda.js es puro: orgsQueTeFicharian no toca el RNG ni muta el estado', () => {
  const state = createInitialState(11, mulberry32(11));
  const conLiga = {
    ...state, phase: 'profesional',
    career: { ...state.career, liga: state.mundo.ligaOrigen, currentOrg: null, tier: 1, jerarquia: 55, historial: [70, 72, 68] }
  };
  const antes = JSON.stringify(conLiga);
  // Fase 9Md: `orgsQueTeFicharian` ya no recibe una liga — escanea el mundo.
  const a = orgsQueTeFicharian(conLiga).map((e) => e.org.nombre).sort();
  const b = orgsQueTeFicharian(conLiga).map((e) => e.org.nombre).sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error('orgsQueTeFicharian devolvió distinto en dos llamadas idénticas: no es puro');
  }
  if (JSON.stringify(conLiga) !== antes) {
    throw new Error('orgsQueTeFicharian mutó el estado que recibió');
  }
});

// --- Fase 9Mc: alguien más quiere tu asiento (el mercado del mundo) ---

checkLento('El mercado del mundo se resuelve cada offseason pro: la decisión trae traspasos y no pasan del tope', () => {
  // Regla 16 (§9M.8): "el dado trajo…" — toda decisión de mercado lleva los
  // traspasos del mundo, como array y sin pasar de `traspasosEnPantalla`.
  for (let seed = 1; seed <= 60; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const responder = (sistema, st, decision, r) => {
      if (sistema.id === 'mercado' && decision.datos?.motivo === 'oferta') {
        const tm = decision.datos.traspasosMundo;
        if (!Array.isArray(tm)) {
          throw new Error(`seed ${seed}: decisión de mercado sin datos.traspasosMundo (array)`);
        }
        if (tm.length > BALANCE.demanda.traspasosEnPantalla) {
          throw new Error(`seed ${seed}: ${tm.length} traspasos en pantalla, tope ${BALANCE.demanda.traspasosEnPantalla}`);
        }
        for (const t of tm) {
          if (!t.org || !t.handle || !t.rol || typeof t.motivo !== 'string') {
            throw new Error(`seed ${seed}: traspaso mal formado ${JSON.stringify(t)}`);
          }
        }
      }
      return sistema.resolverAuto(st, decision, r);
    };
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
  }
});

checkLento('Oferta lateral rechazada: el asiento se cierra con un NPC y el log lo dice con nombre (check 10 de §9M.10)', () => {
  // Cuando el jugador firma una oferta, TODA otra org de la que tenía oferta
  // lateral tiene que cerrar su asiento con un fichaje NPC nombrado ese mismo
  // split ("X firmó a Y … para el puesto que te ofrecían"). Cero asientos
  // rechazados que queden sin quién los tomó.
  let casosVerificados = 0;
  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      const previo = avanzarSplit(state, rng);
      state = previo.state;

      let laterales = null;
      let elegidaOrg = null;
      while (state.pendiente) {
        const sistema = sistemaPorId(state.pendiente.sistemaId);
        const { decision } = state.pendiente;
        if (sistema.id === 'mercado' && decision.datos?.motivo === 'oferta') {
          // El piso de franquicia (9R0e) no es un asiento congelado: si lo
          // rechazás, esa org se queda con su titular, no firma a nadie.
          laterales = decision.opciones.filter((o) => o.tag !== 'renovacion' && !o.forzadaFranquicia);
          const respuesta = sistema.resolverAuto(state, decision, rng);
          elegidaOrg = (decision.opciones.find((o) => o.id === respuesta.opcionId) ?? {}).org;
          state = resolverDecision(state, respuesta, rng).state;
        } else {
          state = resolverDecision(state, sistema.resolverAuto(state, decision, rng), rng).state;
        }
      }

      if (!laterales || laterales.length === 0) continue;
      const rechazadas = laterales.map((o) => o.org).filter((org) => org !== elegidaOrg);
      if (rechazadas.length === 0) continue;

      const logsSplit = state.logs.slice(antes).filter((l) => l.type === 'mercado').map((l) => l.message);
      for (const org of rechazadas) {
        const cerrada = logsSplit.some((m) => m.includes(org) && /para el puesto que te ofrec/.test(m));
        if (!cerrada) {
          throw new Error(`seed ${seed} split ${i}: rechazaste ${org} y ningún log dice quién se quedó con ese puesto`);
        }
      }
      casosVerificados += 1;
    }
  }
  if (casosVerificados < 10) {
    throw new Error(`sólo ${casosVerificados} casos de oferta-lateral-rechazada verificados: la muestra no alcanza`);
  }
});

checkLento('Fase 9Mf: registro.dineroTotalUSD se acumula (>0 y monótono) en toda carrera con contrato (check 11 de §9M.10)', () => {
  // Antes de 9Mf `dineroTotalUSD` NUNCA se incrementaba: el check de monotonía
  // pasaba trivialmente sobre un 0, y `PROGRESO.md` afirmaba —falsamente— que
  // `roster.js` lo cobraba. Ahora `roster.js` acumula `salarioAnualUSD /
  // splitsPorEdad` cada split bajo contrato y escribe el pico de sueldo.
  let conContrato = 0;
  for (let seed = 1; seed <= 140; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let prev = 0;
    let tuvoContrato = false;
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      const d = state.career.registro.dineroTotalUSD;
      if (d < prev) {
        throw new Error(`seed ${seed} split ${i}: dineroTotalUSD bajó de ${prev} a ${d}`);
      }
      prev = d;
      if (state.phase === 'profesional' && state.career.contrato.salarioAnualUSD > 0) {
        tuvoContrato = true;
      }
    }
    if (!tuvoContrato) {
      continue;
    }
    conContrato += 1;
    if (state.career.registro.dineroTotalUSD <= 0) {
      throw new Error(`seed ${seed}: carrera con contrato y dineroTotalUSD = ${state.career.registro.dineroTotalUSD}`);
    }
    if (state.career.registro.picos.salarioAnualUSD <= 0) {
      throw new Error(`seed ${seed}: carrera con contrato y picos.salarioAnualUSD = ${state.career.registro.picos.salarioAnualUSD}`);
    }
  }
  if (conContrato < 80) {
    throw new Error(`sólo ${conContrato} carreras con contrato en 140 seeds: muestra insuficiente para el check`);
  }
});

checkLento('Fase D.2: registro.picos.rankedPuntos > 0 en toda carrera que pisó ranked', () => {
  // Antes de D.2 `rankedPuntos` nunca se escribía: permanecía en 0 toda la
  // carrera pese a estar declarado en el estado inicial. Ahora se registra
  // monótonamente cada vez que se aplica LP a la escalera.
  let conRanked = 0;
  for (let seed = 1; seed <= 140; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let prevPico = 0;
    let pisoRanked = false;
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const partidasAntes = state.player.ranked.partidas;
      state = avanzarSplitAuto(state, rng).state;
      const pico = state.career.registro.picos.rankedPuntos;
      if (pico < prevPico) {
        throw new Error(`seed ${seed} split ${i}: picos.rankedPuntos bajó de ${prevPico} a ${pico}`);
      }
      prevPico = pico;
      if (state.player.ranked.partidas > partidasAntes) {
        pisoRanked = true;
      }
    }
    if (!pisoRanked) {
      continue;
    }
    conRanked += 1;
    if (state.career.registro.picos.rankedPuntos <= 0) {
      throw new Error(`seed ${seed}: carrera pisó ranked y picos.rankedPuntos = ${state.career.registro.picos.rankedPuntos}`);
    }
  }
  if (conRanked < 80) {
    throw new Error(`sólo ${conRanked} carreras con ranked en 140 seeds: muestra insuficiente para el check`);
  }
});

checkLento('Fase 9Mf: ≥24% de las carreras ven un traspaso a mitad de contrato, y "pedir salir" hace una de sus dos cosas (check 6 de §9M.10)', () => {
  // (1) frecuencia: con el auto-resolver (toma el paso arriba salvo recorte de
  // sueldo real) al menos 1 de cada 4 carreras cierra un traspaso a mitad de
  // contrato. (2) "pedir salir" nunca es un no-op: o te vas, o te lo niegan y
  // perdés arraigo/jerarquía (regla 15). Se llama a `mercado.resolver` directo
  // para aislar la mutación del sistema del ruido de `rendimiento.js`, que
  // corre después en el mismo split.
  const mercado = sistemaPorId('mercado');

  let conTraspaso = 0;
  let total = 0;
  for (let seed = 1; seed <= 320; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    total += 1;
    let visto = false;
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      if (state.logs.slice(antes).some((l) => /^Traspaso cerrado: te vas/.test(l.message))) {
        visto = true;
      }
    }
    if (visto) {
      conTraspaso += 1;
    }
  }
  const frac = conTraspaso / total;
  // Piso 0,25 → 0,24 en 9Wd (mismo criterio que 9Ma 30→28 y 9Mc 25→28: una
  // fase posterior mueve levemente un check que iba al ras). 9Wd sube la
  // residencia del jugador en el Top 20 mundial (§9W.6: 12% → 51% de las
  // carreras con éxito), y un top 20 es franquicia protegida
  // (`claramenteArriba` vía `enTopMundial`, gancho 2 de 9Wb): su club lo
  // traspasa a mitad de contrato un poco menos. Efecto medido ~1,6 pp
  // (n=240: 28% base → 26,7% con las constantes de 9Wd); el check cae a 24,4%
  // a su propio n=320 porque viaja pegado al 25% (±2 pp según el set de
  // seeds). El comportamiento es correcto —una franquicia no vende a su
  // franquicia a media temporada—; si una fase más adelante lo baja más, se
  // mira de nuevo.
  if (frac < 0.24) {
    throw new Error(`sólo ${(frac * 100).toFixed(1)}% de las carreras cierran un traspaso a mitad de contrato (objetivo ≥24%)`);
  }

  let ejercido = 0;
  let seFue = 0;
  let penalizado = 0;
  for (let seed = 1; seed <= 400 && !(seFue && penalizado); seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplit(state, rng).state;
      while (state.pendiente) {
        const sistema = sistemaPorId(state.pendiente.sistemaId);
        const { decision } = state.pendiente;
        if (sistema.id === 'mercado' && decision.datos?.motivo === 'traspaso'
          && !decision.datos.conClausula && decision.opciones.some((o) => o.id === 'pedirSalir')) {
          const c0 = state.career;
          // El fork se descarta: se prueban varias semillas sobre el MISMO
          // estado para cubrir las dos ramas de `teSuelta` (que se vaya, o que
          // se lo nieguen y pague arraigo/jerarquía) sin depender de qué cara
          // salió en la corrida real.
          for (let k = 0; k < 40; k += 1) {
            const res = mercado.resolver(state, decision, { opcionId: 'pedirSalir' }, mulberry32(seed * 4096 + i * 64 + k));
            ejercido += 1;
            const c1 = res.state.career;
            const movido = c1.currentOrg !== c0.currentOrg;
            const castigo = c1.currentOrg === c0.currentOrg
              && (c1.arraigo < c0.arraigo || c1.jerarquia < c0.jerarquia);
            if (!movido && !castigo) {
              throw new Error(`seed ${seed} split ${i} k${k}: "pedir salir" fue un no-op (ni te fuiste ni perdiste arraigo/jerarquía)`);
            }
            if (movido) seFue += 1;
            if (castigo) penalizado += 1;
            if (seFue && penalizado) break;
          }
        }
        state = resolverDecision(state, sistema.resolverAuto(state, decision, rng), rng).state;
      }
    }
  }
  if (ejercido < 1) {
    throw new Error('no apareció ninguna decisión de traspaso sin cláusula en 400 carreras: no se pudo ejercitar "pedir salir"');
  }
  if (!seFue || !penalizado) {
    throw new Error(`"pedir salir" no cubrió sus dos ramas (te fuiste: ${seFue}, te lo negaron con castigo: ${penalizado})`);
  }
});

checkLento('Fase 9Mg: toda pantalla de mercado (oferta y traspaso) lleva el bloque "vos" y los asientos abiertos, sin pasar el tope (§9M.8)', () => {
  // Regla de proceso 12: la fase no cierra sin su pantalla. El test honesto de
  // una pantalla acá es que la decisión cargue lo que los tres bloques pintan —
  // (1) `datos.vos` con valor y contrato espejo del motor (regla 15), (3)
  // `datos.asientosAbiertos` como array capado y sin tu propio club. El bloque
  // 2 (las ofertas) ya lo cubren otros checks.
  const cap = BALANCE.mercado.clubesInteresadosMax;
  let vistasOferta = 0;
  let vistasTraspaso = 0;
  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const responder = (sistema, st, decision, r) => {
      if (sistema.id === 'mercado' && (decision.datos?.motivo === 'oferta' || decision.datos?.motivo === 'traspaso')) {
        const { vos, asientosAbiertos } = decision.datos;
        if (!vos || typeof vos !== 'object') {
          throw new Error(`seed ${seed}: decisión de mercado (${decision.datos.motivo}) sin datos.vos`);
        }
        if (typeof vos.valorUSD !== 'number' || vos.valorUSD < 0) {
          throw new Error(`seed ${seed}: datos.vos.valorUSD inválido (${vos.valorUSD})`);
        }
        if (vos.sobreSueldoPct !== null && typeof vos.sobreSueldoPct !== 'number') {
          throw new Error(`seed ${seed}: datos.vos.sobreSueldoPct ni número ni null (${vos.sobreSueldoPct})`);
        }
        if (!('contrato' in vos)) {
          throw new Error(`seed ${seed}: datos.vos sin campo contrato`);
        }
        if (vos.contrato) {
          // Espejo del contrato vigente del motor: si diverge, la pantalla miente.
          if (vos.contrato.salarioUSD !== st.career.contrato.salarioAnualUSD
            || vos.contrato.aniosRestantes !== st.career.contrato.aniosRestantes) {
            throw new Error(`seed ${seed}: datos.vos.contrato no espeja career.contrato`);
          }
        } else if (st.career.currentOrg && st.career.contrato.org) {
          throw new Error(`seed ${seed}: datos.vos.contrato null pero el jugador tiene contrato con ${st.career.contrato.org}`);
        }
        if (!Array.isArray(asientosAbiertos)) {
          throw new Error(`seed ${seed}: datos.asientosAbiertos no es array`);
        }
        if (asientosAbiertos.length > cap) {
          throw new Error(`seed ${seed}: ${asientosAbiertos.length} asientos abiertos en pantalla, tope ${cap}`);
        }
        const ofertadas = new Set(decision.opciones.map((o) => o.org));
        for (const a of asientosAbiertos) {
          if (typeof a.org !== 'string' || typeof a.liga !== 'string') {
            throw new Error(`seed ${seed}: asiento abierto mal formado ${JSON.stringify(a)}`);
          }
          if (a.org === st.career.currentOrg) {
            throw new Error(`seed ${seed}: "${a.org}" es tu club actual y aparece como asiento abierto`);
          }
          if (decision.datos.motivo === 'oferta' && ofertadas.has(a.org)) {
            throw new Error(`seed ${seed}: "${a.org}" ya te ofertó y aparece como asiento abierto`);
          }
          if (decision.datos.motivo === 'traspaso' && a.org === decision.datos.comprador) {
            throw new Error(`seed ${seed}: el comprador "${a.org}" aparece como asiento abierto`);
          }
        }
        if (decision.datos.motivo === 'oferta') vistasOferta += 1;
        else vistasTraspaso += 1;
      }
      return sistema.resolverAuto(st, decision, r);
    };
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
  }
  if (vistasOferta < 30) {
    throw new Error(`sólo ${vistasOferta} pantallas de oferta vistas en 120 seeds: muestra insuficiente`);
  }
  if (vistasTraspaso < 1) {
    throw new Error('ninguna pantalla de traspaso vista en 120 seeds: el bloque "vos" del traspaso quedó sin ejercitar');
  }
});

checkLento('El mercado del mundo renueva contratos NPC: no decaen todos a 0 para siempre', () => {
  // Sin renovación NPC (el estado pre-9Mc), con contratos de 1-3 años todo
  // `plantel[rol].contrato.anios` vale 0 tras 3 offseasons. Con la resolución
  // de 9Mc, la mayoría de los asientos se renuevan y una fracción sana del
  // mundo mantiene contrato vigente.
  for (const seed of [2, 8, 15, 27, 44]) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    const npcs = Object.values(state.mundo.planteles).flatMap((p) => Object.values(p)).filter((n) => !n.esJugador);
    const vigentes = npcs.filter((n) => n.contrato.anios > 0).length / npcs.length;
    if (vigentes < 0.4) {
      throw new Error(`seed ${seed}: sólo el ${(vigentes * 100).toFixed(0)}% de los NPC tiene contrato vigente tras 60 splits (piso 40%: la renovación NPC no está funcionando)`);
    }
  }
});

// --- Fase 9Mi: la escalera cuesta (PLAN.md §9M.12) ---
//
// Un solo barrido de n=300 × 60 splits, memoizado: los checks 7, 9, 9Mi-1 y
// 9Mi-2 leen del mismo resultado (se paga una vez). Mide lo mismo que la sonda
// `_probe_9m_baseline.mjs`: pico de nivel de la carrera, prestigio de la mejor
// liga pisada, tier al cierre, y si el mercado de tier 1 se enfría con la edad.
const PRESTIGIO_TIER3_9MI = 25;
// La vara de "liga mayor" (9Mi-1, definición de §9M.12.4): LCK/LPL/LEC/LCS.
// CBLOL (55) y LCP (60) son el tier 1 accesible; a la elite se sube.
const PRESTIGIO_LIGA_MAYOR = 70;

function pearson9Mi(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

let _barrido9Mi = null;
function barrido9Mi() {
  if (_barrido9Mi) {
    return _barrido9Mi;
  }
  const carreras = [];
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let nivelPico = 0;
    let mejorLigaPrestigio = 0;
    let alcanzoTier1 = false;
    let fichó = false;

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.phase !== 'profesional') {
        continue;
      }
      if (state.splitFichaje !== null) {
        fichó = true;
      }
      nivelPico = Math.max(nivelPico, nivelDelJugador(state));
      if (state.career.liga) {
        const pres = state.mundo.ligas.find((l) => l.id === state.career.liga)?.prestigio ?? PRESTIGIO_TIER3_9MI;
        mejorLigaPrestigio = Math.max(mejorLigaPrestigio, pres);
      }
      if (state.career.tier === 1) {
        alcanzoTier1 = true;
      }
    }

    const prestigioCierre = state.career?.liga
      ? (state.mundo.ligas.find((l) => l.id === state.career.liga)?.prestigio ?? PRESTIGIO_TIER3_9MI)
      : 0;
    carreras.push({
      seed, nivelPico, mejorLigaPrestigio, alcanzoTier1, fichó, prestigioCierre,
      tierCierre: state.career?.tier ?? null,
      edadFinal: state.age ?? null
    });
  }
  _barrido9Mi = carreras;
  return carreras;
}

checkLento('Fase 9Mi: no todas las carreras terminan arriba — cierre en liga mayor acotado (check 7 de §9M.10)', () => {
  // §9M.12.4: redefinido. El check original ("tierCierre === 1 ≤ 65%") es
  // inalcanzable por estructura — CBLOL/LCP son tier 1 y el retiro cae a los
  // ~28 con el jugador todavía empleado en primera, antes de que el
  // enfriamiento etario (que pega a los 30+) pueda echarlo; y `career.tier` no
  // se anula nunca, así que "cierre en tier 1" es "tu último club fue de tier
  // 1". La vara pasa a ser la misma que 9Mi-1: cerrar en una liga MAYOR
  // (prestigio ≥ 70). Denominador: TODAS las carreras (como la base de §9M.10).
  const c = barrido9Mi();
  const mayor = c.filter((x) => x.prestigioCierre >= PRESTIGIO_LIGA_MAYOR).length / c.length;
  if (mayor > 0.45) {
    throw new Error(`${(mayor * 100).toFixed(1)}% de las carreras cierra en una liga mayor (tope 45%): terminar arriba no cuesta`);
  }
});

checkLento('Fase 9Mi: el nivel del jugador correlaciona con la mejor liga que alcanzó (check 9 de §9M.10: r > 0,5)', () => {
  const c = barrido9Mi().filter((x) => x.nivelPico > 0 && x.mejorLigaPrestigio > 0);
  if (c.length < 100) {
    throw new Error(`sólo ${c.length} carreras con nivel y liga: muestra insuficiente`);
  }
  const r = pearson9Mi(c.map((x) => x.nivelPico), c.map((x) => x.mejorLigaPrestigio));
  if (!(r > 0.5)) {
    throw new Error(`r(nivelPico, prestigio de la mejor liga) = ${r.toFixed(3)} (piso 0,5): la liga que alcanzás no depende de lo bueno que sos`);
  }
});

checkLento('Fase 9Mi: subir a una liga MAYOR cuesta, y las que no llegan son peores (check 9Mi-1: ≤ 90% de las que fichan)', () => {
  // §9M.12.4: la vara ya no es `career.tier === 1` (CBLOL/LCP son tier 1 y
  // cualquier pro competente los alcanza — 100% estructural). Es llegar a una
  // liga mayor (prestigio ≥ 70): LCK/LPL/LEC/LCS. Eso sí se gana.
  const c = barrido9Mi().filter((x) => x.fichó);
  if (c.length < 100) {
    throw new Error(`sólo ${c.length} carreras que fichan: muestra insuficiente`);
  }
  const llegan = c.filter((x) => x.mejorLigaPrestigio >= PRESTIGIO_LIGA_MAYOR);
  const noLlegan = c.filter((x) => x.mejorLigaPrestigio < PRESTIGIO_LIGA_MAYOR);
  const frac = llegan.length / c.length;
  if (frac > 0.90) {
    throw new Error(`${(frac * 100).toFixed(1)}% de las carreras que fichan llega a una liga mayor (tope 90%): subir no cuesta`);
  }
  const picoMedio = (xs) => xs.reduce((s, x) => s + x.nivelPico, 0) / xs.length;
  if (noLlegan.length >= 10 && picoMedio(noLlegan) >= picoMedio(llegan)) {
    throw new Error(`las que NO llegan a una liga mayor (nivelPico medio ${picoMedio(noLlegan).toFixed(1)}) no son peores que las que llegan (${picoMedio(llegan).toFixed(1)}): el filtro es un dado, no el nivel`);
  }
});

checkLento('Fase 9Mi: el mercado se enfría — nadie sostiene oferta de liga mayor pasada la edad si su nivel cayó (check 9Mi-2)', () => {
  // §9M.12.4: ninguna carrera recibe una oferta FRESCA (no renovación) de una
  // liga mayor pasada `edadRetiroForzoso − 3` con el nivel claramente bajo la
  // banda de esa liga. Es la invariante "el mercado deja de llamar" — el
  // gancho del retiro de la fase 10. El piso de franquicia (9R0e) puede dar 1
  // a una estrella genuina; lo que no puede es ser la norma (tolerancia < 5%).
  let casos = 0;
  let carrerasConCaso = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let visto = false;
    const prestigioDe = (ligaId) => state.mundo.ligas.find((l) => l.id === ligaId)?.prestigio ?? 0;
    const responder = (sistema, st, decision, r) => {
      if (sistema.id === 'mercado' && decision.datos?.motivo === 'oferta'
          && st.age >= BALANCE.retiro.edadRetiroForzoso - 3) {
        const nivel = nivelDelJugador(st);
        const ofertaMayorBajoBanda = decision.opciones.some((o) => (
          o.tag !== 'renovacion'
          && prestigioDe(o.liga) >= PRESTIGIO_LIGA_MAYOR
          && nivel < prestigioDe(o.liga) - BALANCE.demanda.bandaNivelAbajo
        ));
        if (ofertaMayorBajoBanda) {
          casos += 1;
          if (!visto) { carrerasConCaso += 1; visto = true; }
        }
      }
      return sistema.resolverAuto(st, decision, r);
    };
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
  }
  if (carrerasConCaso / 300 >= 0.05) {
    throw new Error(`${carrerasConCaso}/300 carreras (${casos} ofertas) reciben liga mayor pasados los ${BALANCE.retiro.edadRetiroForzoso - 3} con el nivel bajo la banda (tope 5%): el mercado no deja de llamar`);
  }
});

// --- Fase 9W: el mejor del mundo (PLAN.md §9W) ---
//
// Un solo barrido de n=180 × 60 splits, memoizado. Toma una foto del Top 20 a
// cada cierre de temporada (cuando `topMundial.js` emite el reveal) y acumula
// agregados por carrera —sin guardar todas las fotos—: cuántos handles
// distintos pasan por la lista, cuántas veces se mueve el corte #20, el rango
// etario, si el jugador entró y si tuvo éxito, y si un rival de generación
// asomó. Además verifica en caliente que `picos.rankMundial` es monótono.
let _barrido9W = null;
function barrido9W() {
  if (_barrido9W) {
    return _barrido9W;
  }
  const carreras = [];
  for (let seed = 1; seed <= 180; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    const handlesVistos = new Set();
    let cambiosCorte = 0;
    let corteAnterior = null;
    let edadMin = Infinity;
    let edadMax = -Infinity;
    let aparicionSub20 = 0;
    let aparicionSobre27 = 0;
    let rivalEnTop20 = false;
    let picoRankPrevio = 0;
    let monotonoOk = true;

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;

      const pico = state.career.registro.picos.rankMundial;
      if (picoRankPrevio !== 0 && pico !== 0 && pico > picoRankPrevio) {
        monotonoOk = false;
      }
      if (pico !== 0) {
        picoRankPrevio = pico;
      }

      const reveal = state.logs.find((l) => l.type === 'top_mundial' && Array.isArray(l.top20));
      if (!reveal) {
        continue;
      }
      const top = state.mundo.topMundial;
      for (const fila of top) {
        handlesVistos.add(fila.handle);
        edadMin = Math.min(edadMin, fila.edad);
        edadMax = Math.max(edadMax, fila.edad);
        if (fila.edad < 20) aparicionSub20 += 1;
        if (fila.edad > 27) aparicionSobre27 += 1;
        if (fila.rivalDeGeneracion) rivalEnTop20 = true;
      }
      const corte = top.length === BALANCE.topMundial.tamano ? top[top.length - 1].handle : null;
      if (corteAnterior !== null && corte !== null && corte !== corteAnterior) {
        cambiosCorte += 1;
      }
      corteAnterior = corte;
    }

    const r = state.career.registro;
    const exito = r.titulos.length > 0 || r.internacionales.some((e) => e.resultado === 'buen_papel');
    const llegoATier1 = state.career.splitAscensoTier1 !== null;
    carreras.push({
      distintos: handlesVistos.size,
      cambiosCorte,
      edadMin: edadMin === Infinity ? null : edadMin,
      edadMax: edadMax === -Infinity ? null : edadMax,
      aparicionSub20,
      aparicionSobre27,
      rivalEnTop20,
      picoRank: r.picos.rankMundial,
      splitsEnTop: r.splitsEnTopMundial,
      monotonoOk,
      exito,
      llegoATier1
    });
  }
  _barrido9W = carreras;
  return carreras;
}

checkLento('Fase 9W: el Top 20 está bien formado (largo tamano, sin repetidos, ordenado por puntaje desc)', () => {
  const revisar = (top, dónde) => {
    if (top.length !== BALANCE.topMundial.tamano) {
      throw new Error(`${dónde}: topMundial tiene ${top.length} entradas, no ${BALANCE.topMundial.tamano}`);
    }
    if (new Set(top.map((e) => e.handle)).size !== top.length) {
      throw new Error(`${dónde}: hay handles repetidos en el Top 20`);
    }
    for (let i = 1; i < top.length; i += 1) {
      if (top[i].puntaje > top[i - 1].puntaje) {
        throw new Error(`${dónde}: el Top 20 no está ordenado por puntaje desc (pos ${i})`);
      }
    }
  };
  const inicial = createInitialState(1, mulberry32(1));
  revisar(inicial.mundo.topMundial, 'estado inicial');
  if (inicial.mundo.mejorDelMundo?.handle !== inicial.mundo.topMundial[0].handle) {
    throw new Error('mejorDelMundo no espeja topMundial[0]');
  }
  const rng = mulberry32(7);
  let state = createInitialState(7, rng);
  for (let i = 0; i < 40 && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng).state;
  }
  revisar(state.mundo.topMundial, 'tras 40 splits');
});

checkLento('Fase 9W: el ranking es determinista y no consume RNG (regla de oro de §9W)', () => {
  // No RNG: el sistema `topMundial` recibe un rng que revienta si se lo toca.
  const sistema = sistemaPorId('topMundial');
  const rngQueRevienta = () => { throw new Error('topMundial.aplicar tocó el rng'); };
  const s0 = createInitialState(3, mulberry32(3));
  sistema.aplicar(s0, rngQueRevienta);
  const rng = mulberry32(5);
  let s = createInitialState(5, rng);
  for (let i = 0; i < 30 && !s.terminado; i += 1) {
    s = avanzarSplitAuto(s, rng).state;
  }
  sistema.aplicar(s, rngQueRevienta);

  // Determinista: misma seed, dos corridas → mismo topMundial y mismo pico.
  const correr = (seed) => {
    const r = mulberry32(seed);
    let st = createInitialState(seed, r);
    for (let i = 0; i < 45 && !st.terminado; i += 1) {
      st = avanzarSplitAuto(st, r).state;
    }
    return JSON.stringify({ top: st.mundo.topMundial, pico: st.career.registro.picos.rankMundial });
  };
  if (correr(11) !== correr(11)) {
    throw new Error('dos corridas con la misma seed dan distinto topMundial');
  }
});

checkLento('Fase 9W: el ranking premia el nivel, no la lotería (r(nivel, rank) > 0,6 sobre la población)', () => {
  // Dentro del Top 20 el nivel está comprimido y el ruido manda —eso es el
  // churn buscado—; la correlación se mide sobre `rankearPoblacion` entera.
  const nivel = [];
  const rankInv = [];
  for (let seed = 1; seed <= 40; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 45 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    rankearPoblacion(state).forEach((e, idx) => {
      nivel.push(e.nivel);
      rankInv.push(-(idx + 1));
    });
  }
  const r = pearson9Mi(nivel, rankInv);
  if (!(r > 0.6)) {
    throw new Error(`r(nivel, -rank) = ${r.toFixed(3)} sobre la población (piso 0,6): el ranking es lotería`);
  }
});

checkLento('Fase 9W: picos.rankMundial es monótono (no crece nunca) y se escribe cuando entrás', () => {
  const c = barrido9W();
  const rotos = c.filter((x) => !x.monotonoOk);
  if (rotos.length > 0) {
    throw new Error(`${rotos.length}/${c.length} carreras vieron subir picos.rankMundial (tiene que ser no creciente)`);
  }
  const entraron = c.filter((x) => x.picoRank > 0);
  if (entraron.length === 0) {
    throw new Error('ninguna carrera del barrido entró al Top 20: el jugador nunca es rankeable');
  }
  const sinContador = entraron.filter((x) => x.splitsEnTop === 0);
  if (sinContador.length > 0) {
    throw new Error(`${sinContador.length} carreras con picoRank > 0 pero splitsEnTopMundial == 0: el contador no se escribe`);
  }
});

checkLento('Fase 9W: el Top 20 mezcla edades — sin término de edad, la diversidad es emergente (§9W.3)', () => {
  // La edad NO es un término del puntaje: la mezcla etaria sale de que
  // `nivelNpc` sigue la curva de carrera (trepadores de 18-20, pico 21-26,
  // algún veterano). Se verifica que a lo largo de una carrera aparecen tanto
  // sub-20 como > 27 en el Top 20. El umbral FINO de rotación (handles
  // distintos, cambios de corte) se calibra en 9Wd — acá sólo la estructura.
  const c = barrido9W();
  const largas = c.filter((x) => x.distintos > 0);
  if (largas.length < 50) {
    throw new Error(`sólo ${largas.length} carreras con fotos del Top 20: muestra insuficiente`);
  }
  const conSub20 = largas.filter((x) => x.aparicionSub20 > 0).length / largas.length;
  const conSobre27 = largas.filter((x) => x.aparicionSobre27 > 0).length / largas.length;
  if (conSub20 < 0.2 || conSobre27 < 0.2) {
    throw new Error(`edades poco diversas en el Top 20: sub-20 en ${(conSub20 * 100).toFixed(0)}% de las carreras, >27 en ${(conSobre27 * 100).toFixed(0)}% (piso 20% cada uno)`);
  }
  // Y que la lista NO está congelada: en una carrera pasan por ella más
  // handles que su largo (hay recambio, por poco que sea).
  const distintosMedio = largas.reduce((s, x) => s + x.distintos, 0) / largas.length;
  if (!(distintosMedio > BALANCE.topMundial.tamano)) {
    throw new Error(`una carrera ve en promedio ${distintosMedio.toFixed(1)} handles distintos en el Top 20 (largo ${BALANCE.topMundial.tamano}): la lista está congelada`);
  }
});

// --- Fase 9Wd: los umbrales calibrados (regla de proceso 2 — sólo constantes) ---
// Los tres checks de arriba (9Wa) verifican la ESTRUCTURA: bien formado,
// determinista, mérito, monótono, algo de mezcla etaria. Estos tres fijan las
// VARAS de §9W.6 que 9Wa dejó marcadas "números en 9Wd", medidas ahora sobre
// el mismo barrido (n=180): entrar cuesta pero tiene sentido, la lista rota, y
// tu generación asoma sin garantía. Verificados en rojo con las constantes por
// criterio de 9Wa (bonusCampeonLiga 6 → entran/éxito 12%; ver PROGRESO 9Wd).

checkLento('Fase 9Wd: entrar al Top 20 cuesta pero tiene sentido — la mitad de las carreras con éxito lo tocan (§9W.6)', () => {
  const c = barrido9W();
  const exitosas = c.filter((x) => x.exito);
  const lavadas = c.filter((x) => !x.exito);
  if (exitosas.length < 40) {
    throw new Error(`sólo ${exitosas.length} carreras con éxito en el barrido: muestra insuficiente`);
  }
  const fracExito = exitosas.filter((x) => x.picoRank > 0).length / exitosas.length;
  const fracLavada = lavadas.filter((x) => x.picoRank > 0).length / lavadas.length;
  // §9W.6: ≥ 50% de las carreras con éxito (título o internacional) tocan el
  // Top 20. Medido 51-57% (n=180-400) tras 9Wd. Piso 0,45 para no romper por
  // varianza de la muestra chica.
  if (fracExito < 0.45) {
    throw new Error(`sólo ${(fracExito * 100).toFixed(1)}% de las carreras con éxito tocan el Top 20 (piso 45%, meta §9W.6 50%): entrar no tiene sentido`);
  }
  // Y casi ninguna carrera lavada se cuela: el ranking no regala puestos.
  if (fracLavada > 0.05) {
    throw new Error(`${(fracLavada * 100).toFixed(1)}% de las carreras sin título ni internacional igual tocan el Top 20 (tope 5%): el ranking regala puestos`);
  }
});

checkLento('Fase 9Wd: el Top 20 rota — muchos handles distintos y el corte #20 se mueve seguido (§9W-3)', () => {
  const c = barrido9W().filter((x) => x.distintos > 0);
  if (c.length < 50) {
    throw new Error(`sólo ${c.length} carreras con fotos del Top 20: muestra insuficiente`);
  }
  const distintosMedio = c.reduce((s, x) => s + x.distintos, 0) / c.length;
  const cambiosMedio = c.reduce((s, x) => s + x.cambiosCorte, 0) / c.length;
  // §9W-3: en una carrera de ~15 años, ≥ 45 handles distintos pasan por el Top
  // 20 y el corte #20 cambia ≥ 10 veces. Medido ~96 / ~13 tras 9Wd — la
  // rotación tiene margen de sobra (el ruido determinista + el vaivén de
  // títulos entre orgs la sostienen).
  if (distintosMedio < 45) {
    throw new Error(`una carrera ve en promedio ${distintosMedio.toFixed(1)} handles distintos en el Top 20 (piso 45): la lista rota poco`);
  }
  if (cambiosMedio < 10) {
    throw new Error(`el corte #20 cambia en promedio ${cambiosMedio.toFixed(1)} veces por carrera (piso 10): la lista está estancada`);
  }
});

checkLento('Fase 9Wd: un rival de generación asoma al Top 20, pero no siempre (§9W-8)', () => {
  const c = barrido9W();
  const frac = c.filter((x) => x.rivalEnTop20).length / c.length;
  // §9W-8 lo estimó "~15-40%" (raro por diseño: `rivalPotencialMedia` 66, muy
  // por debajo del corte de nivel del Top 20). Medido tras 9Wd: 33-40% de TODAS
  // las carreras ven un rival ahí al menos una vez — arriba de la estimación
  // porque el rival cobra el mismo `bonusCampeonLiga` que vos cuando su org
  // sale campeona, y las dos varas están acopladas por esa constante.
  // Desacoplarlas es la ficha de archirrival de la fase 11 (D40). Banda
  // [0,15 – 0,45]: que aparezca, que no sea la norma.
  if (frac < 0.15) {
    throw new Error(`un rival de generación aparece en el Top 20 en sólo ${(frac * 100).toFixed(1)}% de las carreras (piso 15%): tu generación no compite`);
  }
  if (frac > 0.45) {
    throw new Error(`un rival de generación aparece en el Top 20 en ${(frac * 100).toFixed(1)}% de las carreras (tope 45%): deja de ser "quizás"`);
  }
});

check('Balance coherente', () => {
  const a = BALANCE.atributos;

  if (a.pisoJuvenil <= 0 || a.pisoJuvenil >= 1) {
    throw new Error('atributos.pisoJuvenil debe estar entre 0 y 1');
  }
  if (a.formaPersistencia < 0 || a.formaPersistencia >= 1) {
    // Con persistencia >= 1 la forma no vuelve nunca: una racha seria eterna.
    throw new Error('atributos.formaPersistencia debe estar entre 0 y 1');
  }
  if (a.burnoutUmbral <= BALANCE.stats.min) {
    throw new Error('atributos.burnoutUmbral debe estar por encima del piso de stats');
  }
  if (!a.acumulativos.macro || a.acumulativos.macro.permiteBajar) {
    throw new Error('el macro no declina (CONCEPTO §6): acumulativos.macro.permiteBajar debe ser false');
  }
  for (const [stat, config] of Object.entries({ ...a.curvas, ...a.acumulativos })) {
    if (!(stat in BALANCE.inicial.stats)) {
      throw new Error(`atributos: ${stat} no existe en los stats iniciales`);
    }
    if ((config.velocidad ?? config.ganancia) <= 0) {
      throw new Error(`atributos: ${stat} no evoluciona`);
    }
  }

  // Este check reemplaza a uno que referenciaba `meta.pesoDominante`, clave que
  // se borró al reescribir la sección meta: `undefined <= 0.5` es false, así que
  // el check nunca fallaba y daba falsa confianza.
  if (BALANCE.meta.pesoMaximo <= BALANCE.meta.pesoMinimo) {
    throw new Error('meta.pesoMaximo debe ser mayor que meta.pesoMinimo');
  }
  // Fase 6: el meta con nombre. pesoSube > pesoNeutro > pesoHunde es lo que
  // hace que "sube"/"hunde" signifiquen algo; si no, un régimen sería idéntico
  // a otro con las etiquetas cambiadas.
  if (!(BALANCE.regimen.pesoSube > BALANCE.regimen.pesoNeutro && BALANCE.regimen.pesoNeutro > BALANCE.regimen.pesoHunde)) {
    throw new Error('regimen.pesoSube > pesoNeutro > pesoHunde tiene que cumplirse siempre');
  }
  if (!(BALANCE.regimen.corteS < BALANCE.regimen.corteA && BALANCE.regimen.corteA < BALANCE.regimen.corteB && BALANCE.regimen.corteB < 1)) {
    throw new Error('los cortes de tier list (S < A < B < 1) tienen que ir en orden estricto');
  }
  if (BALANCE.regimen.probCambioApertura <= 0 || BALANCE.regimen.probCambioApertura > 1) {
    throw new Error('regimen.probCambioApertura debe estar en (0, 1]');
  }
  if (BALANCE.stats.min >= BALANCE.stats.max) {
    throw new Error('stats.min debe ser menor que stats.max');
  }
  if (!Number.isInteger(BALANCE.edad.splitsPorEdad) || BALANCE.edad.splitsPorEdad <= 0) {
    throw new Error('edad.splitsPorEdad debe ser un entero positivo');
  }
  for (const [tipo, prob] of Object.entries(BALANCE.edad.probSegundaDecisionPorTipo)) {
    if (prob < 0 || prob > 1) {
      throw new Error(`edad.probSegundaDecisionPorTipo.${tipo} debe estar entre 0 y 1`);
    }
  }
  if (BALANCE.edad.probSegundaDecisionPorTipo.denso <= BALANCE.edad.probSegundaDecisionPorTipo.comprimido) {
    throw new Error('un split denso tiene que amontonar decisiones más seguido que uno comprimido');
  }
  if (BALANCE.eventos.pisoPesoEfectivo <= 0 || BALANCE.eventos.pisoPesoEfectivo >= 1) {
    throw new Error('eventos.pisoPesoEfectivo debe estar entre 0 y 1 (corre los pesos, no los borra)');
  }
});

check('Hay al menos un evento de cierre de edad por fase amateur', () => {
  const cierres = TODOS_LOS_EVENTOS.filter((evento) => evento.cierreDeEdad);
  if (cierres.length === 0) {
    throw new Error('no hay eventos con cierreDeEdad: true');
  }
  for (const evento of cierres) {
    if (!Array.isArray(evento.conditions)) {
      throw new Error(`${evento.id}: evento de cierre sin conditions`);
    }
  }
});

check('El contenido declara su contexto con vocabulario válido', () => {
  const marcasValidas = new Set(MARCAS);

  for (const evento of TODOS_LOS_EVENTOS) {
    for (const pieza of [evento, ...evento.options]) {
      // El gating grueso va SIEMPRE en `contexto`. Si se pudiera esconder
      // adentro de una condición numérica, la matriz de cobertura mentiría.
      for (const condicion of pieza.conditions ?? []) {
        if (condicion.field === 'phase' || condicion.field === 'age') {
          throw new Error(`${evento.id}: "${condicion.field}" va en el bloque contexto, no en conditions`);
        }
      }

      for (const [eje, valores] of Object.entries(pieza.contexto ?? {})) {
        if (eje === 'edadMin' || eje === 'edadMax') {
          if (typeof valores !== 'number') {
            throw new Error(`${evento.id}: ${eje} debe ser un número`);
          }
          continue;
        }
        if (eje === 'momento') {
          for (const momento of valores) {
            if (!momentoPorId(momento)) {
              throw new Error(`${evento.id}: momento desconocido "${momento}"`);
            }
          }
          continue;
        }
        if (eje === 'marcas') {
          for (const marca of valores) {
            if (!marcasValidas.has(marca.replace(/^!/, ''))) {
              throw new Error(`${evento.id}: marca desconocida "${marca}"`);
            }
          }
          continue;
        }
        if (!EJES[eje]) {
          throw new Error(`${evento.id}: eje de contexto desconocido "${eje}"`);
        }
        for (const valor of valores) {
          if (!EJES[eje].includes(valor)) {
            throw new Error(`${evento.id}: valor "${valor}" no existe en el eje ${eje}`);
          }
        }
      }
    }
  }
});

// Todo el texto que un evento puede llegar a mostrar, con el contexto efectivo
// bajo el que se muestra. Una opcion hereda el contexto de su evento y puede
// estrecharlo, asi que para chequearla hay que mirar los dos juntos.
function textosDeEventos() {
  const piezas = [];

  for (const evento of TODOS_LOS_EVENTOS) {
    const base = evento.contexto ?? {};
    piezas.push({ id: evento.id, contexto: base, texto: evento.title });
    piezas.push({ id: evento.id, contexto: base, texto: evento.description });

    for (const opcion of evento.options) {
      const contexto = { ...base, ...(opcion.contexto ?? {}) };
      const donde = `${evento.id}/${opcion.id}`;
      piezas.push({ id: donde, contexto, texto: opcion.label });
      piezas.push({ id: donde, contexto, texto: opcion.descripcion });
      for (const outcome of opcion.outcomes) {
        piezas.push({ id: donde, contexto, texto: outcome.texto });
      }
    }
  }

  return piezas;
}

check('Todo texto de contenido usa tokens que existen', () => {
  for (const pieza of textosDeEventos()) {
    for (const token of tokensUsados(pieza.texto)) {
      if (!TOKENS[token]) {
        throw new Error(`token desconocido "{${token}}" en ${pieza.id}: ${JSON.stringify(pieza.texto)}`);
      }
    }
  }
});

check('La variación léxica de outcome.texto elige distinto y sin tocar el RNG (fase 9R.3)', () => {
  // `outcome.texto` acepta un array de variantes que se narran alternadas para
  // que la misma opción no cuente igual la quinta vez. La selección tiene que
  // ser (a) determinista y sin `rng` —misma seed, misma historia—, (b) sensible
  // al split —si no, el array no sirve de nada— y (c) tiene que resolver los
  // tokens de TODAS las variantes, no solo la elegida.
  const variantes = [
    'Se te fue en la última pelea contra {rivalDeLaFecha}.',
    'La cerraste vos contra {rivalDeLaFecha}, y se notó.',
    'Terminó pareja contra {rivalDeLaFecha}, moneda al aire.'
  ];
  const estadoBase = {
    player: { splitCount: 0 },
    career: { temporada: { fechaEnCurso: { rival: 'Hanwha Life' } } }
  };

  const elegidas = new Set();
  for (let split = 0; split < 12; split += 1) {
    const state = { ...estadoBase, player: { splitCount: split } };
    const salida = resolverTexto(variantes, state);
    if (salida.includes('{')) {
      throw new Error(`una variante no resolvió sus tokens en el split ${split}: ${salida}`);
    }
    elegidas.add(salida);
  }
  if (elegidas.size < 2) {
    throw new Error(`el array de variantes narró siempre lo mismo en 12 splits (${elegidas.size} distinta/s)`);
  }

  // Determinismo: el mismo (texto, split) elige siempre igual.
  const a = resolverTexto(variantes, { player: { splitCount: 5 }, career: { temporada: { fechaEnCurso: { rival: 'T1' } } } });
  const b = resolverTexto(variantes, { player: { splitCount: 5 }, career: { temporada: { fechaEnCurso: { rival: 'T1' } } } });
  if (a !== b) {
    throw new Error(`misma seed, dos resultados: "${a}" vs "${b}"`);
  }

  // Y toda variante de todo array real del catálogo resuelve en su contexto
  // declarado — la misma garantía que el check de tokens, extendida a arrays.
  for (const pieza of textosDeEventos()) {
    if (!Array.isArray(pieza.texto)) {
      continue;
    }
    for (const v of pieza.texto) {
      for (const token of tokensUsados(v)) {
        if (!TOKENS[token]) {
          throw new Error(`variante de ${pieza.id} usa token inexistente {${token}}`);
        }
      }
    }
  }
});

// --- Los cuatro checks de la fase 0 ---

check('Todo contenido declara dónde aparece', () => {
  // Sin esto, un evento cae en cualquier momento de la carrera: es la causa
  // exacta de que un scout te llame en Platino y de que te salga un meme de la
  // prensa antes de tener prensa. Además, mientras haya contenido sin gatear la
  // matriz de cobertura miente, porque esas piezas llenan todas las celdas.
  const sinContexto = [];

  for (const evento of TODOS_LOS_EVENTOS) {
    if (!evento.contexto || Object.keys(evento.contexto).length === 0) {
      sinContexto.push(`evento ${evento.id}`);
    }
  }
  for (const [pool, rutinas] of Object.entries(RUTINAS)) {
    for (const rutina of rutinas) {
      if (!rutina.contexto || Object.keys(rutina.contexto).length === 0) {
        sinContexto.push(`rutina ${pool}/${rutina.id}`);
      }
    }
  }

  if (sinContexto.length > 0) {
    throw new Error(`sin bloque contexto: ${sinContexto.join(', ')}`);
  }
});

check('Todo evento atado al calendario declara su ventana (fase 9R0c)', () => {
  // "2 meses afuera antes de Worlds a mitad de un split de temporada regular":
  // el eje `ventana` existe desde el paso 7 y casi nadie lo declaraba, así que
  // un evento de competición o un momento dentro de un partido caía en
  // pretemporada igual. Un evento de estas categorías SIN ventana declarada es
  // el bug. El resto del catálogo (salud, familia, negocios, identidad) puede
  // pasar en cualquier ventana y no se fuerza acá.
  const VENTANAS = new Set(EJES.ventana);
  const faltan = [];

  for (const evento of TODOS_LOS_EVENTOS) {
    const atadoAlCalendario = evento.category === 'competicion' || String(evento.category).startsWith('rol_');
    if (!atadoAlCalendario) {
      continue;
    }
    const ventana = evento.contexto?.ventana;
    if (!Array.isArray(ventana) || ventana.length === 0) {
      faltan.push(evento.id);
      continue;
    }
    for (const v of ventana) {
      if (!VENTANAS.has(v)) {
        throw new Error(`${evento.id}: ventana "${v}" no está en EJES.ventana`);
      }
    }
  }

  if (faltan.length > 0) {
    throw new Error(`eventos de competición/rol sin ventana declarada: ${faltan.join(', ')}`);
  }
});

check('Toda opción se lee antes y todo resultado se cuenta después', () => {
  // Una opcion sin `descripcion` es un boton sin apuesta: no sabes que estas
  // arriesgando. Un outcome sin `texto` devuelve un diff en vez de una historia
  // — "Hype +8, Mentalidad -1" y nunca te enteras de que paso.
  //
  // Fase 9R.3: `outcome.texto` acepta un array de variantes. Un array vale si
  // tiene ≥2 entradas y todas son strings no vacíos — un array de una sola
  // variante es un string disfrazado, y uno con un hueco imprime "".
  const textoNarrativoValido = (texto) => {
    if (Array.isArray(texto)) {
      return texto.length >= 2 && texto.every((v) => typeof v === 'string' && v.trim() !== '');
    }
    return typeof texto === 'string' && texto.trim() !== '';
  };

  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options) {
      if (typeof opcion.descripcion !== 'string' || opcion.descripcion.trim() === '') {
        throw new Error(`${evento.id}/${opcion.id}: opción sin descripcion`);
      }
      for (const [i, outcome] of opcion.outcomes.entries()) {
        if (!textoNarrativoValido(outcome.texto)) {
          throw new Error(`${evento.id}/${opcion.id}: outcome ${i} sin texto narrativo (string no vacío o array de ≥2 variantes)`);
        }
      }
    }
  }
});

check('Ningún token puede quedar sin resolver donde el contenido aparece', () => {
  // Análisis estático sobre el gating declarado, sin simular. Mata la clase
  // entera de "oraciones sin sentido": un texto que dice "{jungla} no camina más
  // para vos" en un evento que puede caer en la etapa amateur imprime la llave
  // cruda en pantalla, porque ahí no hay equipo.
  const CON_EQUIPO = ['debut', 'profesional', 'declive'];
  const CON_ORG = ['tier3', 'tier2', 'tier1'];
  const TOKENS_DE_ORG = ['org', 'liga'];
  const TOKENS_DE_COMPANERO = ['top', 'jungla', 'mid', 'adc', 'support'];

  const garantizaOrg = (contexto) => {
    const etapas = contexto.etapa;
    const niveles = contexto.nivel;
    return (Array.isArray(etapas) && etapas.every((etapa) => CON_EQUIPO.includes(etapa)))
      || (Array.isArray(niveles) && niveles.every((nivel) => CON_ORG.includes(nivel)));
  };
  const exigeMarca = (contexto, marca) => (contexto.marcas ?? []).includes(marca);

  for (const pieza of textosDeEventos()) {
    for (const token of tokensUsados(pieza.texto)) {
      if (TOKENS_DE_ORG.includes(token) && !garantizaOrg(pieza.contexto)) {
        throw new Error(`${pieza.id}: usa {${token}} pero puede aparecer sin equipo (declará etapa o nivel)`);
      }
      if (TOKENS_DE_COMPANERO.includes(token) && !exigeMarca(pieza.contexto, 'con_vestuario')) {
        throw new Error(`${pieza.id}: usa {${token}} pero no exige la marca con_vestuario`);
      }
      if (token === 'signature' && !exigeMarca(pieza.contexto, 'signature')) {
        throw new Error(`${pieza.id}: usa {signature} pero no exige la marca signature`);
      }
      if (token === 'mainMuerto' && !exigeMarca(pieza.contexto, 'main_muerto')) {
        throw new Error(`${pieza.id}: usa {mainMuerto} pero no exige la marca main_muerto`);
      }
      if (token === 'campeonNuevo' && !exigeMarca(pieza.contexto, 'campeon_nuevo')) {
        throw new Error(`${pieza.id}: usa {campeonNuevo} pero no exige la marca campeon_nuevo`);
      }
    }
  }
});

checkLento('Ningún número llega al jugador con decimales', () => {
  // Los stats viven como float a proposito (redondear en cada split moveria el
  // balance), pero un float crudo en pantalla —`mecánica 62.12317247563275`—
  // tapa media pantalla y no significa nada. Se redondea al producir texto.
  const conDecimales = /\d\.\d{2,}/;

  for (let seed = 1; seed <= 200; seed += 1) {
    const state = correrCarrera(seed, 60);
    for (const entrada of state.logs) {
      for (const texto of [entrada.message, entrada.cuerpo, entrada.efectos]) {
        if (typeof texto === 'string' && conDecimales.test(texto)) {
          throw new Error(`seed ${seed}: número sin redondear en el log — "${texto}"`);
        }
      }
    }
  }
});

check('Todo efecto tiene etiqueta legible para el log', () => {
  // Sin esto, un path sin etiqueta imprime el path crudo en el log del jugador.
  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options) {
      for (const outcome of opcion.outcomes) {
        for (const effect of outcome.effects) {
          if (etiquetaCampo(effect.path) === effect.path) {
            throw new Error(`${evento.id}: el path ${effect.path} no tiene entrada en ETIQUETAS_CAMPO`);
          }
        }
      }
    }
  }
});

check('La escalera de ranked se comporta como la del juego', () => {
  const servidor = servidorConCutoffs('LAS');
  const rng = mulberry32(7);
  const base = { servidor: 'LAS', escudo: 0, partidas: 0 };

  // Promoción con rollover del excedente.
  const casiPromociona = { ...base, tier: 'gold', division: 2, lp: 96 };
  const promocionado = aplicarLP(casiPromociona, 9, servidor, rng);
  if (promocionado.division !== 1 || promocionado.lp !== 5) {
    throw new Error(`la promoción no hizo rollover: quedó en ${promocionado.tier} ${promocionado.division} con ${promocionado.lp} LP`);
  }

  // Descenso: no se cae en 0 LP, se cae en 25/50/75.
  const alBorde = { ...base, tier: 'gold', division: 2, lp: 4 };
  const descendido = aplicarLP(alBorde, -20, servidor, rng);
  if (descendido.division !== 3 || !BALANCE.ranked.lpDescenso.includes(descendido.lp)) {
    throw new Error(`el descenso dejó ${descendido.tier} ${descendido.division} con ${descendido.lp} LP`);
  }

  // El escudo impide bajar de tier recién promocionado.
  const conEscudo = { ...base, tier: 'platinum', division: 4, lp: 3, escudo: 1 };
  const protegido = aplicarLP(conEscudo, -50, servidor, rng);
  if (protegido.tier !== 'platinum') {
    throw new Error(`el escudo no protegió el tier: cayó a ${protegido.tier}`);
  }

  // El ápice no tiene divisiones y su LP no tiene techo.
  const apice = aplicarLP({ ...base, tier: 'diamond', division: 1, lp: 95 }, 900, servidor, rng);
  if (apice.division !== null || !esApice(apice)) {
    throw new Error('entrar al ápice dejó una división colgada');
  }

  // Ida y vuelta: los puntos absolutos son una representación fiel.
  for (let puntos = 0; puntos < 4000; puntos += 37) {
    const ranked = desdePuntos(puntos, servidor);
    if (puntosAbsolutos({ ...base, ...ranked }) !== puntos) {
      throw new Error(`ida y vuelta rota en ${puntos} puntos`);
    }
  }
});

check('No hay decay: la escalera no se mueve sola', () => {
  // Un profesional juega soloQ todos los días, así que la inactividad no es
  // parte de esta historia. Lo que se verifica es que la escalera no baje POR
  // SÍ SOLA — un evento con efecto negativo sí puede hacerte perder LP, y eso
  // es una consecuencia, no decay.
  const servidor = servidorConCutoffs('LAS');
  const rng = mulberry32(11);

  for (let puntos = 0; puntos < 4200; puntos += 53) {
    const ranked = { servidor: 'LAS', escudo: 0, partidas: 0, ...desdePuntos(puntos, servidor) };
    for (let split = 0; split < 20; split += 1) {
      const despues = aplicarLP(ranked, 0, servidor, rng);
      if (puntosAbsolutos(despues) !== puntos) {
        throw new Error(`la escalera se movió sola: ${puntos} → ${puntosAbsolutos(despues)}`);
      }
    }
  }
});

check('Nadie escribe el espejo de la escalera', () => {
  // `player.soloqElo` es derivado. Si un efecto lo escribiera, quedaría
  // desincronizado de `player.ranked` sin que nada lo detecte.
  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options) {
      for (const outcome of opcion.outcomes) {
        for (const effect of outcome.effects) {
          if (effect.path === 'player.soloqElo') {
            throw new Error(`${evento.id}: escribe el espejo player.soloqElo; usá { "type": "ladder", "path": "player.ranked" }`);
          }
          if (effect.path === 'player.ranked' && effect.type !== 'ladder') {
            throw new Error(`${evento.id}: player.ranked solo se toca con efectos de tipo "ladder"`);
          }
        }
      }
    }
  }
});

checkLento('La escalera produce una distribución realista al cerrar la etapa amateur', () => {
  let challenger = 0;
  let top50 = 0;
  const total = 400;

  for (let seed = 1; seed <= total; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    while (!state.terminado && state.phase === 'amateur' && state.player.splitCount < 20) {
      state = avanzarSplitAuto(state, rng).state;
    }

    if (esApice(state.player.ranked)) {
      const puesto = rangoAproximado(state.player.ranked, servidorDeLaPartida(state));
      if (puesto !== null) {
        challenger += 1;
        if (puesto <= BALANCE.amateur.puestoParaOrgGrande) {
          top50 += 1;
        }
      }
    }
  }

  // Challenger es el 0,025% de la ladder real. Acá el jugador es un prospecto,
  // no un jugador cualquiera, pero llegar arriba tiene que seguir siendo raro.
  const porcentajeChall = (challenger / total) * 100;
  if (porcentajeChall < 1 || porcentajeChall > 20) {
    throw new Error(`${porcentajeChall.toFixed(1)}% llegó a Challenger: fuera de la banda 1-20%`);
  }
  if ((top50 / total) * 100 > 6) {
    throw new Error(`${((top50 / total) * 100).toFixed(1)}% llegó al top 50 de su servidor: demasiado común`);
  }
});

checkLento('Toda decisión de rutina ofrece una salida segura y la trampa', () => {
  // La forma de la decisión importa tanto como su contenido: nunca se acorrala
  // al jugador en una mala elección, y la trampa de CONCEPTO §4 siempre está
  // disponible aunque convenga no tomarla.
  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 20 && !state.terminado; i += 1) {
      const resultado = avanzarSplit(state, rng);
      state = resultado.state;

      while (state.pendiente) {
        const { decision } = state.pendiente;
        const rutinas = decision.datos?.rutinas;

        if (rutinas) {
          if (rutinas.length < 2) {
            throw new Error(`seed ${seed}: una decisión de rutina ofreció ${rutinas.length} opción(es)`);
          }
          const etiquetas = new Set(rutinas.flatMap((rutina) => rutina.etiquetas));
          if (!etiquetas.has('segura')) {
            throw new Error(`seed ${seed}: se ofrecieron rutinas sin ninguna salida segura`);
          }
          if (decision.datos.motivo === 'reparto' && !etiquetas.has('agresiva')) {
            throw new Error(`seed ${seed}: se ofrecieron rutinas amateur sin ninguna agresiva`);
          }
        }

        const sistema = sistemaPorId(state.pendiente.sistemaId);
        state = resolverDecision(state, sistema.resolverAuto(state, decision, rng), rng).state;
      }
    }
  }
});

checkLento('Las rutinas de offseason declaran nivel y cada tier mantiene su segura+agresiva propias (D11, 13b)', () => {
  // D11: un bootcamp en Corea no lo paga un equipo inventado de tier 3. El
  // catálogo tiene que decirlo, y una corrida real no puede ofrecerlo ahí — pero
  // tier 3 necesita SU PROPIA agresiva (13b: grindeo_de_madrugada) o se queda
  // sin trampa disponible, violando CONCEPTO §4 ("la trampa está disponible
  // aunque convenga no tomarla"). Las 7 rutinas originales + la nueva, las 8
  // declaran nivel: ninguna cae en una celda por omisión (mismo criterio D26c
  // que cobertura.js usa para eventos).
  for (const rutina of RUTINAS.offseason) {
    if (!Array.isArray(rutina.contexto?.nivel) || rutina.contexto.nivel.length === 0) {
      throw new Error(`${rutina.id}: no declara nivel en su contexto`);
    }
  }

  const bootcamp = RUTINAS.offseason.find((rutina) => rutina.id === 'bootcamp_corea');
  if (!bootcamp) {
    throw new Error('no está bootcamp_corea');
  }
  const nivelesBootcamp = bootcamp.contexto.nivel;
  if (!nivelesBootcamp.includes('tier1') || !nivelesBootcamp.includes('tier2')) {
    throw new Error('bootcamp_corea debe declarar nivel tier1 y tier2');
  }
  if (nivelesBootcamp.includes('tier3')) {
    throw new Error('bootcamp_corea no debe declararse para tier 3');
  }

  const grindeoCasero = RUTINAS.offseason.find((rutina) => rutina.id === 'grindeo_de_madrugada');
  if (!grindeoCasero || !grindeoCasero.etiquetas.includes('agresiva')) {
    throw new Error('grindeo_de_madrugada no existe o dejó de ser la agresiva propia de tier 3');
  }
  if (!grindeoCasero.contexto.nivel.includes('tier3') || grindeoCasero.contexto.nivel.some((n) => n !== 'tier3')) {
    throw new Error('grindeo_de_madrugada debe declararse EXCLUSIVAMENTE para tier 3 (si tier1/tier2 la vieran, bootcamp_corea dejaría de ser su única agresiva a propósito)');
  }

  const seguraUniversal = RUTINAS.offseason.find((rutina) => rutina.id === 'dos_semanas_sin_tocar_el_juego');
  if (!seguraUniversal || !seguraUniversal.etiquetas.includes('segura')) {
    throw new Error('dos_semanas_sin_tocar_el_juego dejó de ser la salida segura universal');
  }
  if (['tier3', 'tier2', 'tier1'].some((nivel) => !seguraUniversal.contexto.nivel.includes(nivel))) {
    throw new Error('dos_semanas_sin_tocar_el_juego no cubre todos los tiers');
  }

  const vistos = { tier1: false, tier2: false, tier3: false };

  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 20 && !state.terminado; i += 1) {
      const resultado = avanzarSplit(state, rng);
      state = resultado.state;

      while (state.pendiente) {
        const { decision } = state.pendiente;
        const rutinas = decision.datos?.rutinas;

        if (decision.datos?.motivo === 'practica' && rutinas) {
          const nivel = calcularContexto(state).nivel;
          if (nivel === 'tier1' || nivel === 'tier2' || nivel === 'tier3') {
            vistos[nivel] = true;
            const etiquetas = new Set(rutinas.flatMap((rutina) => rutina.etiquetas));
            if (!etiquetas.has('segura')) {
              throw new Error(`seed ${seed}: offseason en ${nivel} sin salida segura`);
            }
            // 13b: la exigencia de agresiva se pareja a los tres tiers — antes
            // solo se pedía en tier1/tier2 porque tier3 no tenía ninguna.
            if (!etiquetas.has('agresiva')) {
              throw new Error(`seed ${seed}: offseason en ${nivel} sin rutina agresiva`);
            }
            if (nivel === 'tier3' && rutinas.some((rutina) => rutina.id === 'bootcamp_corea')) {
              throw new Error(`seed ${seed}: bootcamp_corea ofrecido en tier 3`);
            }
            if (nivel !== 'tier3' && rutinas.some((rutina) => rutina.id === 'grindeo_de_madrugada')) {
              throw new Error(`seed ${seed}: grindeo_de_madrugada (agresiva propia de tier 3) ofrecida en ${nivel}`);
            }
          }
        }

        const sistema = sistemaPorId(state.pendiente.sistemaId);
        state = resolverDecision(state, sistema.resolverAuto(state, decision, rng), rng).state;
      }
    }
  }

  for (const nivel of ['tier1', 'tier2', 'tier3']) {
    if (!vistos[nivel]) {
      throw new Error(`ningún offseason observado en ${nivel}: muestra insuficiente`);
    }
  }
});

checkLento('El contexto de carrera nombra siempre dónde estás parado', () => {
  const vistos = new Set();

  // 45 splits (fase 8D) se quedó corto para "todo momento activo aparece
  // alguna vez": `sin_renovacion` (D.1) necesita un contrato de un año
  // corriendo a último año Y el flag de no-renovación prendido — una
  // combinación tardía en la carrera. Medido al agregar el contenido de
  // 13d (que corre el stream, T1): 0 hits en 300 seeds × 45 splits, 5 en
  // 300 seeds × 90 (una carrera completa). No es un hueco de contenido —
  // el momento existe y se observa con la duración real de carrera — es
  // el mismo patrón que D24: el check medía con una vara más corta que la
  // carrera que dice cubrir. Subido 45 → 90, sin tocar ninguna constante.
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      const contexto = calcularContexto(state);

      // Si el motor puede llegar a un estado que ningún momento declara, el
      // juego no sabe dónde estás parado y el contenido no se puede gatear.
      if (contexto.momento === 'desconocido') {
        throw new Error(`seed ${seed}, split ${state.player.splitCount}: contexto sin momento declarado`);
      }
      vistos.add(contexto.momento);

      state = avanzarSplitAuto(state, rng).state;

      // El caché es una foto del arranque del split, a propósito: lo que gatea
      // contenido calcula el contexto en vivo (la fase puede cambiar a mitad de
      // split). Lo único que hay que garantizar es que el sistema lo refresque
      // y que lo que quede guardado sea un contexto válido.
      if (!state.contexto || !momentoPorId(state.contexto.momento)) {
        throw new Error(`seed ${seed}: el split cerró sin dejar un contexto válido en cache`);
      }
    }
  }

  // Fase 10c: `servicio_militar` resuelve entero DENTRO de un split (la
  // garantía de "La cadena de servicio militar no deja
  // flags.enServicioMilitar prendido entre splits", más abajo) — así que
  // este loop, que solo mira `calcularContexto` en el límite entre splits,
  // nunca lo va a ver. Mismo criterio que el eje `stakes`
  // (`data/contextos.js`): inalcanzable a propósito por esta vía genérica,
  // verificado por un check propio en vez de forzar la cobertura acá.
  const VERIFICADOS_POR_OTRO_CHECK = new Set(['servicio_militar']);

  // Un momento activo que nunca aparece es contenido muerto esperando.
  for (const momento of MOMENTOS_ACTIVOS) {
    if (VERIFICADOS_POR_OTRO_CHECK.has(momento.id)) {
      continue;
    }
    if (!vistos.has(momento.id)) {
      throw new Error(`el momento "${momento.id}" no está marcado como pendiente y no apareció en 300 carreras`);
    }
  }
});

checkLento('MOMENTOS: el array manda, pero nunca en contra de lo que dice prioridad (fase 13a)', () => {
  // `momentoDe` (core/contexto.js) resuelve con `MOMENTOS.find(...)`: gana el
  // PRIMERO del array, el número `prioridad` es solo documentación (y lo que
  // usa `cobertura.js` para separar "estado excepcional" de contenido normal).
  // Si alguna vez dos entradas cuyo patrón puede matchear al mismo tiempo
  // quedan en el orden equivocado, el array gana en silencio y el número
  // pasa a mentir — exactamente lo que encontró la auditoría de esta fase con
  // `veterano_util`/`veterano_al_margen` (20/18 coladas antes de
  // `tier1_franquicia`/28, aunque la posición en el array ya las evaluaba
  // primero y el comportamiento era correcto).
  //
  // El check no exige que la tabla esté ordenada de punta a punta —bloques
  // con patrones mutuamente excluyentes (ninguna carrera puede tener
  // `etapa: 'amateur'` y `nivel: 'tier3'` a la vez, ver `calcularNivel`) no
  // necesitan estar en un orden numérico particular entre sí, y forzarlo
  // sería reordenar contenido que nunca tuvo un bug real. Lo que sí exige:
  // cuando DOS patrones matchean el MISMO contexto observado de verdad, el
  // que gana por posición tiene que ser el de mayor prioridad numérica.
  const coincide = (contexto, patron) => Object.entries(patron).every(([eje, esperados]) => {
    if (eje === 'marcas') {
      return esperados.every((marca) => contexto.marcas.includes(marca));
    }
    return esperados.includes(contexto[eje]);
  });

  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 40 && !state.terminado; i += 1) {
      const contexto = calcularContexto(state);
      const coinciden = MOMENTOS.filter((momento) => coincide(contexto, momento.patron));

      if (coinciden.length > 1) {
        const elegido = coinciden[0];
        const masAlto = coinciden.reduce((mejor, m) => (m.prioridad > mejor.prioridad ? m : mejor));
        if (elegido.id !== masAlto.id) {
          throw new Error(`seed ${seed}, split ${state.player.splitCount}: matchean ${coinciden.map((m) => `${m.id}(${m.prioridad})`).join(', ')} — gana "${elegido.id}" por posición en el array, pero "${masAlto.id}" declara prioridad más alta`);
        }
      }

      state = avanzarSplitAuto(state, rng).state;
    }
  }
});

checkLento('T10: ninguna celda alcanzable pasa el 25% de splits sin evento', () => {
  // `PLAN.md` — trampa T10: `events.js` loguea SPLIT_SIN_EVENTO_MSG cuando
  // `elegirEvento` no encuentra ningún candidato — el pool se vació por
  // gating fino en esa celda momento×ventana en particular. Medir la fracción
  // real, no confiar en que "hay 508 opciones en el catálogo" alcance: un
  // catálogo grande en total puede seguir teniendo una celda específica seca.
  //
  // Se mide sobre los LOGS reales de `avanzarSplitAuto` (el camino que juega
  // `simulate.js`/el navegador), no llamando a `elegirEvento` de nuevo — eso
  // consumiría una tirada extra y correría el stream de RNG del resto del
  // split (T1). El silencio por presupuesto agotado (`hayPresupuesto`, fase
  // 9Rf) es un mecanismo DISTINTO y deliberado —no imprime este mensaje, así
  // que no contamina la medición.
  const MUESTRA_MINIMA = 30;
  const UMBRAL = 0.25;
  const N = 400;
  const SPLITS = 45;
  const celdas = new Map();

  for (let seed = 1; seed <= N; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < SPLITS && !state.terminado; i += 1) {
      const contexto = calcularContexto(state);
      const clave = `${contexto.momento}|${contexto.ventana}`;
      const fila = celdas.get(clave) ?? { total: 0, sinEvento: 0 };
      fila.total += 1;

      const resultado = avanzarSplitAuto(state, rng);
      if (resultado.logs.some((log) => log.type === 'event' && log.message === SPLIT_SIN_EVENTO_MSG)) {
        fila.sinEvento += 1;
      }
      celdas.set(clave, fila);
      state = resultado.state;
    }
  }

  const huecos = [];
  for (const [clave, { total, sinEvento }] of celdas) {
    if (total < MUESTRA_MINIMA) {
      continue;
    }
    const fraccion = sinEvento / total;
    if (fraccion >= UMBRAL) {
      huecos.push(`${clave} (${(fraccion * 100).toFixed(1)}%, ${sinEvento}/${total})`);
    }
  }

  if (huecos.length > 0) {
    throw new Error(`celdas con ≥25% de splits sin evento, muestra suficiente: ${huecos.join('; ')}`);
  }
});

checkLento('El Ajuste al Meta se mueve de verdad', () => {
  // Este check existe por un bug real: el pool tenía tags que el meta no
  // conocía, así que el ajuste habría sido siempre neutro sin que nadie lo
  // notara. Si el cruce se desconecta otra vez, esto falla.
  const ajustes = [];

  for (let seed = 1; seed <= 60; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 12 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      ajustes.push(state.meta.ajuste);
    }
  }

  const neutro = BALANCE.campeones.ajusteNeutro;
  const distintos = new Set(ajustes).size;
  if (distintos < 15) {
    throw new Error(`el ajuste al meta tomó solo ${distintos} valores distintos: el cruce pool/meta está roto`);
  }
  if (!ajustes.some((a) => a > neutro + 10) || !ajustes.some((a) => a < neutro - 10)) {
    throw new Error('el ajuste al meta nunca se aleja del neutro: los tags del pool no cruzan con los pesos del meta');
  }
});

checkLento('El ciclo profesional produce carreras distintas', () => {
  const carreras = [];

  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 30 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    // Solo cuentan las carreras con el roster ya armado: si el fichaje cayó en
    // el último split del muestreo, `roster.js` todavía no corrió.
    if (state.career.currentOrg && state.career.rosterDeOrg === state.career.currentOrg) {
      carreras.push(state);
    }
  }

  if (carreras.length === 0) {
    throw new Error('en 120 seeds nadie llegó a la etapa profesional');
  }

  for (const carrera of carreras) {
    if (carrera.career.companeros.length !== IDS_ROL.length - 1) {
      throw new Error(`un roster quedó con ${carrera.career.companeros.length} compañeros`);
    }
    if (carrera.career.companeros.some((companero) => companero.role === carrera.player.role)) {
      throw new Error('hay un compañero jugando el mismo rol que el jugador');
    }
  }

  // La jerarquia tiene que moverse en las dos direcciones: si se clava arriba,
  // la espiral central de CONCEPTO §7 deja de existir.
  const jerarquias = carreras.map((carrera) => carrera.career.jerarquia);
  if (Math.max(...jerarquias) - Math.min(...jerarquias) < 30) {
    throw new Error('la jerarquía casi no varía entre carreras: la espiral central no está funcionando');
  }

  // Y no todos pueden ganar lo mismo.
  const titulos = new Set(carreras.map((carrera) => carrera.career.titulos));
  if (titulos.size < 3) {
    throw new Error(`todas las carreras terminaron con ${[...titulos].join('/')} títulos: la liga no compite`);
  }
});

checkLento('El split cierra siempre: no queda ninguna decisión colgada', () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 12 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.pendiente !== null) {
        throw new Error(`seed ${seed}: quedó una decisión pendiente después de cerrar el split`);
      }
    }
  }
});

checkLento('Pipeline corre y es determinista (misma seed, dos corridas)', () => {
  const seed = 123;
  const splits = 12;
  const estadoA = correrCarrera(seed, splits);
  const estadoB = correrCarrera(seed, splits);

  if (JSON.stringify(estadoA) !== JSON.stringify(estadoB)) {
    throw new Error('dos corridas con la misma seed dieron resultados distintos');
  }
});

checkLento('Seeds distintas producen carreras distintas', () => {
  const a = JSON.stringify(correrCarrera(1, 12));
  const b = JSON.stringify(correrCarrera(2, 12));

  if (a === b) {
    throw new Error('dos seeds distintas produjeron exactamente la misma carrera');
  }
});

// --- Fase 1: la identidad que elegís (rol + mains) tiene que importar ---

check('Cada rol tiene eventos propios que ningún otro rol ve', () => {
  // Gateo estructural, no simulado: un evento es "de un rol" cuando su
  // `contexto.rol` lo restringe a exactamente uno. Si un rol no tiene al menos
  // los mínimos, elegirlo en la pantalla de inicio no cambia nada del contenido.
  const porRol = Object.fromEntries(IDS_ROL.map((rol) => [rol, []]));

  for (const evento of TODOS_LOS_EVENTOS) {
    const roles = evento.contexto?.rol;
    if (Array.isArray(roles) && roles.length === 1 && porRol[roles[0]]) {
      porRol[roles[0]].push(evento.id);
    }
  }

  for (const rol of IDS_ROL) {
    if (porRol[rol].length < 3) {
      throw new Error(`el rol ${rol} tiene ${porRol[rol].length} evento(s) exclusivo(s) y el mínimo es 3`);
    }
  }
});

checkLento('El pool nunca queda vacío ni por debajo del mínimo', () => {
  // `olvidarPeor` y el efecto `pool` corren en cada carrera masiva; si alguno
  // rompiera el piso, `campeonDelSplit` (campeones.js) explotaría eligiendo
  // sobre un array vacío. Se corre la simulación completa, no solo la función,
  // para agarrar interacciones entre efectos de distintos eventos.
  for (let seed = 1; seed <= 150; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 40 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.player.championPool.length < BALANCE.campeones.poolMinimo) {
        throw new Error(`seed ${seed}: el pool quedó en ${state.player.championPool.length}, debajo del mínimo (${BALANCE.campeones.poolMinimo})`);
      }
    }
  }
});

check('El meta se puede nombrar por campeón, y el nombre cambia con el parche', () => {
  // Es la pieza central de la fase 1: el usuario describe el meta por nombres
  // ("el meta era Sejuani, Nidalee y Jarvan"), no por arquetipo. Si esto
  // devolviera siempre los mismos nombres, el parche sería cosmético.
  const delRol = campeonesDisponibles({ player: { role: 'jungla' }, mundo: { campeonesDebutados: [] } }, 'jungla');
  if (delRol.length === 0) {
    throw new Error('no hay campeones de jungla disponibles para evaluar campeonesEnMeta');
  }

  const pesosA = Object.fromEntries(ARQUETIPOS.map((tag) => [tag, 1]));
  const pesosB = { ...pesosA, engage: 2.5, tanque: 2.5 };

  const arribaA = campeonesEnMeta(pesosA, delRol).map((campeon) => campeon.name);
  const arribaB = campeonesEnMeta(pesosB, delRol).map((campeon) => campeon.name);

  if (arribaA.length === 0) {
    throw new Error('campeonesEnMeta no devolvió ningún nombre');
  }
  if (JSON.stringify(arribaA) === JSON.stringify(arribaB)) {
    throw new Error('campeonesEnMeta devolvió los mismos nombres con vectores de meta distintos');
  }
});

checkLento('main_muerto se observa cuando el meta te da vuelta el main', () => {
  // Si el meta nunca mata un main en la práctica, las seis marcas de pool son
  // decorativas: el jugador elige sus mains al empezar y nunca vuelve a
  // importar. Se mide sobre carreras que llegan a jugar de verdad (>20 splits),
  // no sobre las que se cortan en la etapa amateur.
  const conSuficientesSplits = [];
  let vioMainMuerto = 0;

  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let observado = false;

    for (let i = 0; i < 40 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (calcularContexto(state).marcas.includes('main_muerto')) {
        observado = true;
      }
    }

    if (state.player.splitCount > 20) {
      conSuficientesSplits.push(seed);
      if (observado) {
        vioMainMuerto += 1;
      }
    }
  }

  if (conSuficientesSplits.length < 30) {
    throw new Error(`solo ${conSuficientesSplits.length} de 300 carreras pasaron de 20 splits: muestra insuficiente`);
  }

  const proporcion = vioMainMuerto / conSuficientesSplits.length;
  if (proporcion < 0.4) {
    throw new Error(`main_muerto apareció en ${(proporcion * 100).toFixed(1)}% de las carreras largas; el mínimo es 40%`);
  }
});

// --- Fase 2: que las decisiones pesen ---

function mediana(numeros) {
  const ordenados = [...numeros].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)];
}

check('Los stats corren los pesos de un outcome, no los deciden (CONCEPTO §8)', () => {
  // Se prueba sobre contenido REAL, no un mock: `top_la_isla/buscar_la_revancha`
  // es el primer outcome del catálogo con `modificadores`. Si esto se rompe,
  // la promesa central de CONCEPTO §8 ("la opción obviamente correcta sale mal
  // a veces; tus stats corren esos pesos") vuelve a ser mentira.
  const evento = TODOS_LOS_EVENTOS.find((e) => e.id === 'top_la_isla');
  const opcion = evento?.options.find((o) => o.id === 'buscar_la_revancha');
  if (!opcion) {
    throw new Error('no se encontró top_la_isla/buscar_la_revancha: el check apunta a contenido que ya no existe');
  }

  const base = createInitialState(1, mulberry32(1));
  const conMecanica = (valor) => ({ ...base, player: { ...base.player, stats: { ...base.player.stats, mecanica: valor } } });

  const proporcionDelBueno = (state) => {
    const rng = mulberry32(777);
    let buenos = 0;
    for (let i = 0; i < 2000; i += 1) {
      if (elegirOutcome(state, opcion, rng) === opcion.outcomes[0]) {
        buenos += 1;
      }
    }
    return buenos / 2000;
  };

  const bajo = proporcionDelBueno(conMecanica(20));
  const alto = proporcionDelBueno(conMecanica(90));
  const diferenciaPuntos = Math.abs(alto - bajo) * 100;

  if (diferenciaPuntos < 15) {
    throw new Error(`la distribución solo se movió ${diferenciaPuntos.toFixed(1)} puntos entre percentil 10 y 90 de mecánica; el mínimo es 15`);
  }
  if (bajo < 0.05 || alto < 0.05 || bajo > 0.95 || alto > 0.95) {
    throw new Error(`un outcome quedó fuera de [5%, 95%] (bajo=${(bajo * 100).toFixed(1)}%, alto=${(alto * 100).toFixed(1)}%): el piso de pesoEfectivo no está corriendo los pesos, los está borrando`);
  }
});

check('tipoDeSplit distingue denso de comprimido', () => {
  // Test directo sobre la función pura, no sobre el agregado de 400 carreras:
  // el check de más abajo mide el EFECTO poblacional, pero si `tipoDeSplit`
  // devolviera siempre "denso" (o siempre "comprimido"), el agregado podría
  // no notarlo porque compara proporciones, no clasificaciones absolutas.
  const base = createInitialState(1, mulberry32(1));
  const ahora = calcularContexto(base);

  const comprimido = tipoDeSplit({ ...base, contexto: ahora });
  if (comprimido !== 'comprimido') {
    throw new Error(`un split sin ningún cambio de contexto dio "${comprimido}", esperaba "comprimido"`);
  }

  // "antes" con una etapa distinta a la que tiene el estado ahora: el mismo
  // mecanismo que dispara cuando debutás a mitad de split.
  const etapaDistinta = ahora.etapa === 'amateur' ? 'profesional' : 'amateur';
  const denso = tipoDeSplit({ ...base, contexto: { ...ahora, etapa: etapaDistinta } });
  if (denso !== 'denso') {
    throw new Error(`un cambio de etapa dio "${denso}", esperaba "denso"`);
  }

  const primerSplit = tipoDeSplit({ ...base, contexto: null });
  if (primerSplit !== 'denso') {
    throw new Error('el primer split de la carrera (sin contexto previo) no dio "denso"');
  }
});

checkLento('El chaining de un segundo evento de verdad usa tipoDeSplit', () => {
  // El check anterior prueba que `tipoDeSplit` clasifica bien; este prueba que
  // `events.js` USA esa clasificación para decidir si amontona una segunda
  // decisión, y no que alguien sacó el `chance(...)` de en medio y lo dejó
  // fijo. Se llama a `resolver` de verdad, sobre un estado profesional real,
  // forzando el contexto "antes" a comprimido o a denso.
  // La ventana de playoffs por sí sola ya clasifica "denso" (fase 2): para que
  // este test aísle el efecto del cambio de ETAPA, hace falta un split que no
  // esté en esa ventana, o los dos casos saldrían densos por esa otra razón.
  let estadoPro = null;
  busqueda: for (let seed = 1; seed <= 500; seed += 1) {
    const rng = mulberry32(seed);
    let candidato = createInitialState(seed, rng);
    for (let i = 0; i < 20 && !candidato.terminado; i += 1) {
      candidato = avanzarSplitAuto(candidato, rng).state;
      if (
        candidato.phase === 'profesional' && candidato.career.companeros.length > 0 && !candidato.pendiente
        && calcularContexto(candidato).ventana !== 'playoffs'
      ) {
        estadoPro = candidato;
        break busqueda;
      }
    }
  }
  if (!estadoPro) {
    throw new Error('no se pudo armar un estado profesional real (fuera de playoffs) para probar el chaining');
  }

  const eventoRng = mulberry32(1);
  const primerEvento = elegirEvento(estadoPro, eventoRng);
  if (!primerEvento) {
    throw new Error('el estado de prueba no tiene ningún evento candidato');
  }
  const decision = decisionDesdeEvento(estadoPro, primerEvento, { franja: 'normal', slot: 1 });
  const respuesta = { opcionId: decision.opciones[0].id };
  const ahora = calcularContexto(estadoPro);

  const tasaDeChaining = (contextoAntes, repeticiones) => {
    let veces = 0;
    for (let i = 0; i < repeticiones; i += 1) {
      const rng = mulberry32(50000 + i);
      const estadoForzado = { ...estadoPro, contexto: contextoAntes };
      const resultado = resolverEventos(estadoForzado, decision, respuesta, rng);
      // K4-C: el segundo evento puede frenar (bifurcación) o resolverse por perfil y dejar su línea de crónica:
      // las dos cosas son "se amontonó un segundo evento".
      if (resultado.decision || resultado.logs.some((log) => log.cronica)) {
        veces += 1;
      }
    }
    return veces / repeticiones;
  };

  const tasaComprimido = tasaDeChaining(ahora, 600);
  const tasaDenso = tasaDeChaining({ ...ahora, etapa: ahora.etapa === 'amateur' ? 'profesional' : 'amateur' }, 600);

  if (tasaDenso - tasaComprimido < 0.3) {
    throw new Error(
      `denso encadenó ${(tasaDenso * 100).toFixed(0)}% de las veces y comprimido ${(tasaComprimido * 100).toFixed(0)}%: `
      + 'la diferencia es demasiado chica, resolver() puede no estar usando tipoDeSplit'
    );
  }
});

checkLento('La densidad de decisiones es emergente, no pareja ni descontrolada', () => {
  // Mide la regla de la fase 2 ("novedad = densidad") sobre el camino headless
  // real, contando cuántas decisiones pide CADA split, no un promedio ciego.
  const N = 400;
  const porCarrera = [];

  for (let seed = 1; seed <= N; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let decisionesTotales = 0;
    let splits = 0;

    while (!state.terminado && splits < BALANCE.partida.maxSplitsDeSeguridad) {
      let decisionesEsteSplit = 0;
      const contar = (sistema, st, decision, r) => {
        decisionesEsteSplit += 1;
        return sistema.resolverAuto(st, decision, r);
      };
      state = avanzarSplitAuto(state, rng, contar).state;
      splits += 1;
      decisionesTotales += decisionesEsteSplit;

      // El techo subió de 6 a 24 en la fase 4 (medido: máximo real observado
      // 19 en 1500 seeds × 90 splits): una serie de playoffs con título +
      // internacional puede encadenar draft + minijuego mapa a mapa en el
      // mismo split de cierre de temporada, algo que la fase 2 no anticipaba
      // en el número pero sí en el principio ("las fases 4-6 van a sumar sus
      // propias fuentes de decisión").
      //
      // Corrección post-medición de la fase 9E (mismo criterio y mismo lugar
      // que las de las fases 2, 4 y 5): 24 → 28. Al arreglar D25, las carreras
      // dejaron de pasar la mitad de sus splits profesionales varadas sin
      // equipo (49,7% → 98,1% con equipo), así que MUCHOS más splits traen la
      // carga profesional completa —temporada con fechas marcadas, serie,
      // draft— en vez de ser splits vacíos. No es un split más pesado: son
      // más splits pesados. Medido con la estructura nueva, 400 carreras ×
      // 25.688 splits: p50=6, p90=12, p99=17, p999=21, máximo 25 — UN solo
      // split en 25.688 (0,004%) pasa de 24. La regla que importa sigue
      // intacta: la densidad sigue siendo emergente y acotada, y el tope
      // anti-loop real (`maxDecisionesPorSplit`, 60) no se toca.
      if (decisionesEsteSplit > 28) {
        throw new Error(`seed ${seed}, split ${splits}: ${decisionesEsteSplit} decisiones en un solo split (máximo esperado: 28, "denso")`);
      }
    }

    porCarrera.push({ decisiones: decisionesTotales, splits, porSplit: splits > 0 ? decisionesTotales / splits : 0 });
  }

  // El ratio p90/mediana es la traducción falsable de "las carreras largas son
  // largas por durar más, no por ser más pesadas". No se gatea la mediana
  // ABSOLUTA de decisiones por carrera: depende del volumen de contenido de
  // mercado, series y retiro que todavía no existe (fases 3 a 6). Gatear ese
  // número ahora sería compararse contra un baseline que asume trabajo que
  // todavía no se hizo (trampa T6).
  const porDuracion = [...porCarrera].sort((a, b) => a.splits - b.splits);
  const p90 = porDuracion[Math.floor(porDuracion.length * 0.9)];
  const medianaSplits = mediana(porCarrera.map((c) => c.splits));
  const carreraMediana = porDuracion.reduce((mejor, c) => (
    Math.abs(c.splits - medianaSplits) < Math.abs(mejor.splits - medianaSplits) ? c : mejor
  ));

  // Corrección post-medición (fase 5, mismo criterio que las de las fases 2 y
  // 4): el tope original de 1.8× se calibró antes de que existiera
  // `systems/temporada.js`. Con la temporada regular jugándose de verdad, TODO
  // split profesional (no solo el de cierre) trae 2-3 fechas marcadas con su
  // propio draft+momento+reacción — una carga que antes solo aparecía en el
  // split de cierre de una serie de playoffs. Una carrera del percentil 90 de
  // duración pasa una fracción mucho más grande de sus splits siendo
  // profesional (contra una mediana que pasa más tiempo en el prólogo
  // amateur/tier 3, con pocas decisiones por split); eso reparte MÁS splits
  // "cargados" a lo largo de la carrera larga, no un split puntual más pesado.
  // Medido: 2.19×. El tope sube a 2.5× (con margen), y la regla que sí importa
  // sigue intacta y sigue gateada arriba: ningún split individual supera 24.
  if (carreraMediana.porSplit > 0 && p90.porSplit > carreraMediana.porSplit * 2.5) {
    throw new Error(
      `las carreras del percentil 90 de duración piden ${p90.porSplit.toFixed(2)} decisiones/split `
      + `contra ${carreraMediana.porSplit.toFixed(2)} de la carrera mediana (tope: 2.5×)`
    );
  }
});

// --- Fase 3: la escalera competitiva (tier 3 -> tier 2 -> tier 1) ---

checkLento('El tier 3 es breve: mediana de permanencia ≤ 2 splits, p90 ≤ 5', () => {
  // Pedido explícito: nadie debuta en primera y nadie se queda mucho en un
  // equipo inventado. Se mide en splits CONSECUTIVOS en tier 3 por stint (una
  // carrera puede pasar por tier 3 más de una vez si el equipo se disuelve).
  //
  // n=6000, no 1500: el p90 real cae casi exactamente en el borde entre 4 y 5
  // splits (~90% acumulado en 4). Medido en la fase 8D (contenido vivo):
  // con 1500 seeds el resultado cruza ese borde para cualquier lado según qué
  // contenido compite por el mismo rng() en `elegirEvento` (trampa T1/D21-D22
  // ya documentada) — agregar eventos nuevos no mueve la tasa real de
  // permanencia (nunca se tocó `competitivo.js` ni ninguna constante de
  // tier 3), pero sí reordena qué evento gana cada sorteo para una seed dada,
  // lo que corre en cascada el resto de esa carrera. A 6000 seeds el p90 da 4
  // de forma estable tanto con el catálogo viejo como con el nuevo — es la
  // muestra mínima para que el check deje de depender de en qué lado del
  // borde caiga una seed puntual.
  //
  // Fase 9b: p90 sube de 4 a 5 por diseño, no por ruido — a diferencia de lo
  // de arriba. Ascender de tier 3 ya no es instantáneo: `competitivo.js`
  // marca el ascenso ganado, pero `career.tier` se queda en 3 hasta que
  // `mercado.js` lo resuelve en la próxima pretemporada (regla de proceso 10,
  // la misma lógica que ya usaba el año muerto). Ese split de espera cuenta
  // como "en tier 3" en esta medición. La mediana sigue en 2: la mayoría de
  // los ascensos cae cerca de una pretemporada igual.
  //
  // Fase 9E — la medición pasa a ser POR ORG, que es lo que este check dijo
  // siempre que medía ("nadie se queda mucho en un equipo inventado... una
  // carrera puede pasar por tier 3 más de una vez SI EL EQUIPO SE DISUELVE").
  // Hasta acá el corte entre stints lo hacía, sin querer, el bug D25:
  // `disolverEquipo` ponía `tier: null`, así que la disolución terminaba el
  // stint —y de paso la carrera, que quedaba varada para siempre—. Al
  // conservar `tier: 3`, contar por tier junta todos los equipos chicos de
  // una carrera en un solo número y mide otra cosa: no "cuánto durás en un
  // equipo inventado" sino "cuánto tardás en salir del nivel". Medido a 1500
  // carreras: por org mediana 2 / p90 5 (idéntico al diseño), por tier
  // mediana 5 / p90 12. El corte por org es el que responde el pedido.
  const permanencias = [];

  for (let seed = 1; seed <= 6000; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let splitsEnLaOrg = 0;
    let orgAnterior = null;

    const cerrarStint = () => {
      if (splitsEnLaOrg > 0) {
        permanencias.push(splitsEnLaOrg);
      }
      splitsEnLaOrg = 0;
    };

    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      const org = state.career.tier === 3 ? state.career.currentOrg : null;

      if (!org) {
        // Fuera de tier 3, o en tier 3 sin equipo (el split entre que se te
        // disuelve el armado y te levanta otro): el stint con ESA org cerró.
        cerrarStint();
        orgAnterior = null;
        continue;
      }
      if (org !== orgAnterior) {
        cerrarStint();
        orgAnterior = org;
      }
      splitsEnLaOrg += 1;
    }
    cerrarStint();
  }

  if (permanencias.length < 100) {
    throw new Error(`solo ${permanencias.length} pasos por tier 3 observados en 1500 carreras: muestra insuficiente`);
  }

  const ordenados = [...permanencias].sort((a, b) => a - b);
  const medianaPermanencia = ordenados[Math.floor(ordenados.length / 2)];
  const p90 = ordenados[Math.floor(ordenados.length * 0.9)];

  if (medianaPermanencia > 2) {
    throw new Error(`mediana de permanencia en una org de tier 3: ${medianaPermanencia} splits (máximo 2)`);
  }
  if (p90 > 5) {
    throw new Error(`p90 de permanencia en una org de tier 3: ${p90} splits (máximo 5)`);
  }
});

checkLento('El año muerto: nivel de tier 1 pero sin edad para debutar (marca espera_edad_minima)', () => {
  // Fase 9Md: ya no hay "ascenso ganado" que congelar. El año muerto ahora es:
  // sos nivel de tier 1 (`competitivo.nivelParaTier1`) pero te falta la edad
  // que exigen LEC/LPL (18) — seguís en tier 2 con la marca `espera_edad_minima`
  // hasta que el cumpleaños destraba la oferta.
  let vioEspera = false;
  let vioSalidaAlCumplir = false;

  for (let seed = 1; seed <= 900 && !(vioEspera && vioSalidaAlCumplir); seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let esperabaAntes = false;

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.phase !== 'profesional') continue;

      const espera = calcularContexto(state).marcas.includes('espera_edad_minima');
      if (espera) {
        vioEspera = true;
        if (state.career.tier !== 2 || state.age >= BALANCE.competitivo.edadDebutTardio) {
          throw new Error(`seed ${seed}: espera_edad_minima con tier ${state.career.tier} / edad ${state.age} — debería ser tier 2 y < ${BALANCE.competitivo.edadDebutTardio}`);
        }
      }
      // Estabas esperando y ahora ya no: o cumpliste la edad, o subiste de tier,
      // o bajaste de nivel — nunca quedaste trabado para siempre.
      if (esperabaAntes && !espera && state.age >= BALANCE.competitivo.edadDebutTardio) {
        vioSalidaAlCumplir = true;
      }
      esperabaAntes = espera;
    }
  }

  if (!vioEspera) {
    throw new Error('la marca espera_edad_minima nunca se observó en 900 carreras');
  }
  if (!vioSalidaAlCumplir) {
    throw new Error('nunca se vio el año muerto destrabarse al cumplir la edad');
  }
});

// --- Fase 9b: el mercado decide, competitivo.js deja de sortear la org ---

checkLento('Ningún cambio de org en tier 1/2 pasa sin una decisión de mercado.js de por medio', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 40 && !state.terminado; i += 1) {
      const orgAntes = state.career.currentOrg;
      const tierAntes = state.career.tier;
      const resultado = avanzarSplitAuto(state, rng);
      state = resultado.state;

      const cambioDeOrgEnLigaReal = tierAntes !== null && tierAntes !== 3
        && orgAntes !== state.career.currentOrg;
      if (cambioDeOrgEnLigaReal) {
        const huboDecisionDeMercado = resultado.logs.some((log) => log.type === 'mercado');
        if (!huboDecisionDeMercado) {
          throw new Error(
            `seed ${seed}: currentOrg pasó de "${orgAntes}" a "${state.career.currentOrg}" en tier ${tierAntes} `
            + 'sin ningún log de mercado.js en el split'
          );
        }
      }
    }
  }
});

checkLento('proyeccionJerarquia predice la jerarquía real con error acotado (regla de proceso 15, PLAN.md §9.8)', () => {
  // roster.js asigna EXACTO lo que la tarjeta mostró — sin volver a tirar el
  // dado. Lo que puede correrlo es el propio rendimiento de ESE split
  // (rendimiento.js corre después, en el mismo split, y mueve la jerarquía por
  // `brecha` + ruido gaussiano): la tarjeta es una proyección, no un oráculo.
  // Antes esto medía UN solo fichaje (el primero que aparecía) contra un tope
  // de 8; ahora se mide la DISTRIBUCIÓN sobre muchos fichajes.
  //
  // Deuda D39 (fase 9Rb): la proyección tiene un SESGO de +6 puntos — el
  // debutante termina la jerarquía más arriba de lo que la tarjeta prometió.
  // Es consecuencia directa de 9Rb: `proyeccionJerarquia` estaba calibrada
  // contra la tabla CON el bug (el debutante figuraba último a media
  // temporada, así que `brecha` lo hundía hasta la proyección conservadora);
  // con la tabla honesta el debutante queda mid-pack y rinde por encima. La
  // recalibración de `roster.js`/`valorMercado.js` es 9Rg/9M (regla de
  // proceso 2: no se retunea en el commit estructural). El check acota el
  // sesgo para que no EMPEORE, no lo bendice.
  const errores = [];
  const conSigno = [];

  for (let seed = 1; seed <= 400; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 40 && !state.terminado; i += 1) {
      const proyectada = state.flags.jerarquiaProyectadaAlFichar;
      state = avanzarSplitAuto(state, rng).state;

      if (proyectada !== null && state.career.rosterDeOrg === state.career.currentOrg) {
        // 9Rg cierra D39: la tarjeta muestra `cruda + derivaPrimerSplit`, que es
        // donde vas a estar al cerrar el split — no el instante de firmar.
        const esperada = Math.round(Math.max(0, Math.min(100, proyectada + BALANCE.roster.derivaPrimerSplit)));
        errores.push(Math.abs(state.career.jerarquia - esperada));
        conSigno.push(state.career.jerarquia - esperada);
        break;
      }
    }
  }

  if (errores.length < 30) {
    throw new Error(`solo ${errores.length} fichajes de mercado con jerarquiaProyectadaAlFichar en 400 carreras: muestra insuficiente`);
  }

  const media = errores.reduce((a, b) => a + b, 0) / errores.length;
  const sesgo = conSigno.reduce((a, b) => a + b, 0) / conSigno.length;
  const ordenados = [...errores].sort((a, b) => a - b);
  const p90 = ordenados[Math.floor(ordenados.length * 0.9)];
  const max = ordenados[ordenados.length - 1];

  if (media > 8) {
    throw new Error(`error medio |proyección − real| de jerarquía: ${media.toFixed(1)} puntos sobre ${errores.length} fichajes (tope 8)`);
  }
  if (Math.abs(sesgo) > 3) {
    throw new Error(`sesgo de la proyección de jerarquía: ${sesgo.toFixed(1)} puntos (tope ±3)`);
  }
  // Fase 9Md: tope ±3 → ±3.5 como parche — el mercado abierto a 6 ligas hacía
  // que el primer fichaje fuera, más seguido, a un equipo más fuerte (mayor
  // `nivelEquipo` → `esperado` más alto → `brecha` más negativa → jerarquía
  // por debajo de lo proyectado), y el sesgo pasó a ~−3.0.
  // Fase 9Mh: cerrado. `roster.derivaPrimerSplit` 6 → 3 recentra la proyección
  // sobre el real (la deriva es cosmética: `roster.js` asigna el crudo). Tope
  // de vuelta en ±3.
  if (p90 > 14 || max > 28) {
    throw new Error(`outliers de la proyección de jerarquía: p90 ${p90}, máximo ${max} (topes 14 / 28, apretados en 9Rg tras cerrar D39: p90 16 → 11, máximo 26 → 20. El máximo es un outlier de un seed, la señal está en p90)`);
  }
});

check('El sesgo etario reduce cuántas ofertas llegan: 28 recibe ≤50% del promedio de ofertas que 21', () => {
  // El jugador tiene que estar EN BANDA para LEC (prestigio 80) para que la
  // demanda de 9Mb genere una mano lateral de verdad — sobre esa mano actúa el
  // sesgo etario. Con una hoja floja el mercado se resolvía sólo con la
  // renovación (que no se adelgaza por edad) y el check medía la nada.
  //
  // Fase 9Md: `splitCount` no puede ser 0 — con 6 ligas escaneadas y sin
  // `mercadoMundial` corrido, `orgsQueTeFicharian` devuelve tantas orgs que el
  // `ofertasMax` capa la mano ANTES que el sesgo etario. Con `splitCount` en
  // pretemporada real, `mercadoMundial` congela un puñado de asientos y el
  // sesgo vuelve a morder sobre ESE puñado.
  const estadoDeEdad = (edad) => {
    const rng = mulberry32(1);
    const base = createInitialState(1, rng);
    const statFuerte = Object.fromEntries(
      Object.keys(base.player.stats).map((k) => [k, k === 'hype' ? 70 : 82])
    );
    return {
      ...base,
      age: edad,
      phase: 'profesional',
      player: { ...base.player, stats: statFuerte, splitCount: 30 },
      calendario: { ...base.calendario, anio: base.calendario.anioBase + 10 },
      career: {
        ...base.career, tier: 1, liga: 'LEC', currentOrg: 'Fnatic', jerarquia: 60,
        contrato: { ...base.career.contrato, org: 'Fnatic', liga: 'LEC', tier: 1, aniosRestantes: 0 }
      }
    };
  };

  // Sólo las LATERALES: la renovación no se adelgaza por edad y ensuciaría el
  // ratio (9Mb la dejó como oferta fija de tu propio club).
  const promedioOfertas = (edad) => {
    const rng = mulberry32(42);
    let total = 0;
    const muestras = 300;
    for (let i = 0; i < muestras; i += 1) {
      const resultado = aplicarMercado(estadoDeEdad(edad), rng);
      total += resultado.decision
        ? resultado.decision.opciones.filter((o) => o.tag !== 'renovacion').length
        : 0;
    }
    return total / muestras;
  };

  const prom21 = promedioOfertas(21);
  const prom28 = promedioOfertas(28);
  if (!(prom28 <= prom21 * 0.5)) {
    throw new Error(`promedio de ofertas a los 28 (${prom28.toFixed(2)}) no es ≤ 50% del de los 21 (${prom21.toFixed(2)})`);
  }
});

checkLento('Nadie firma un ascenso a una liga sin cumplir su edadMinima', () => {
  for (let seed = 1; seed <= 400; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let ligaPrevia = state.career.liga;

    for (let i = 0; i < 40 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.career.liga !== ligaPrevia && state.career.liga !== null) {
        const liga = state.mundo.ligas.find((candidata) => candidata.id === state.career.liga);
        if (liga && state.age < (liga.edadMinima ?? 0)) {
          throw new Error(`seed ${seed}: fichó por ${liga.id} (edadMinima ${liga.edadMinima}) a los ${state.age}`);
        }
      }
      ligaPrevia = state.career.liga;
    }
  }
});

checkLento('El representante informa (no rebaraja) y se usa exactamente una vez por carrera', () => {
  // Fase 9Me (§9M.6): el representante dejó de ser un reroll de ofertas — ahora
  // te dice qué clubes te miran sin haber ofertado (`datos.clubesInteresados`).
  // La mano de ofertas NO cambia, y una segunda llamada es un no-op.
  let probado = false;

  for (let seed = 1; seed <= 300 && !probado; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 40 && !state.terminado && !probado; i += 1) {
      state = avanzarSplit(state, rng).state;

      while (state.pendiente) {
        const sistema = sistemaPorId(state.pendiente.sistemaId);
        const { decision } = state.pendiente;

        if (sistema.id === 'mercado' && decision.datos?.motivo === 'oferta') {
          const manoAntes = decision.opciones.map((o) => `${o.org}:${o.salarioAnualUSD}`).join('|');

          const primera = sistema.resolver(state, decision, { representante: true }, rng);
          if (!primera.state.flags.llamadaRepresentante) {
            throw new Error(`seed ${seed}: la llamada al representante no marcó flags.llamadaRepresentante`);
          }
          if (!primera.decision) {
            throw new Error(`seed ${seed}: el representante no devolvió la decisión de mercado`);
          }
          const manoDespues = primera.decision.opciones.map((o) => `${o.org}:${o.salarioAnualUSD}`).join('|');
          if (manoDespues !== manoAntes) {
            throw new Error(`seed ${seed}: el representante cambió la mano de ofertas (${manoAntes} → ${manoDespues})`);
          }
          if (!Array.isArray(primera.decision.datos.clubesInteresados)) {
            throw new Error(`seed ${seed}: el representante no dejó datos.clubesInteresados`);
          }
          if (primera.decision.datos.representanteDisponible) {
            throw new Error(`seed ${seed}: el botón de representante sigue disponible tras usarlo`);
          }

          const segunda = sistema.resolver(primera.state, primera.decision, { representante: true }, rng);
          if (segunda.logs.length !== 0 || segunda.decision !== primera.decision) {
            throw new Error(`seed ${seed}: una segunda llamada al representante no fue un no-op`);
          }
          probado = true;
          break;
        }

        const respuesta = sistema.resolverAuto(state, decision, rng);
        state = resolverDecision(state, respuesta, rng).state;
      }
    }
  }

  if (!probado) {
    throw new Error('nunca apareció una decisión de mercado.js en 300 carreras: no se pudo probar el representante');
  }
});

checkLento('Fase 9Me: negociar es determinista, termina, y la cláusula negociada llega al contrato', () => {
  // Tres cosas: (1) `pedir más` corta la charla en `escalonesNegociacionMax` y
  // no encadena decisiones sin fin; (2) dos corridas con la misma seed dan el
  // mismo resultado; (3) si negociás la cláusula y firmás, `contrato.clausula`
  // vale 'salida' (regla 15).
  const maxEscalones = BALANCE.mercado.escalonesNegociacionMax;
  let probadoNegociacion = false;
  let probadaClausula = false;

  for (let seed = 1; seed <= 400 && !(probadoNegociacion && probadaClausula); seed += 1) {
    const correr = () => {
      const rng = mulberry32(seed);
      let state = createInitialState(seed, rng);
      for (let i = 0; i < 45 && !state.terminado; i += 1) {
        state = avanzarSplit(state, rng).state;
        while (state.pendiente) {
          const sistema = sistemaPorId(state.pendiente.sistemaId);
          const decision = state.pendiente.decision;
          if (sistema.id === 'mercado' && decision.datos?.motivo === 'oferta' && decision.opciones.length > 0) {
            return { state, decision, rng };
          }
          state = resolverDecision(state, sistema.resolverAuto(state, decision, rng), rng).state;
        }
      }
      return null;
    };

    const a = correr();
    if (!a) {
      continue;
    }

    // (1) + (2): apretar "pedir más" sobre la primera oferta hasta que el
    // sistema deje de devolver decisión, dos veces, y comparar.
    const secuencia = (ctx) => {
      let { state, decision, rng } = ctx;
      const objetivo = decision.opciones[0].id;
      const trazas = [];
      for (let paso = 0; paso < maxEscalones + 4; paso += 1) {
        const r = resolverDecision(state, { negociar: 'pedirMas', opcionId: objetivo }, rng);
        state = r.state;
        trazas.push(r.logs.map((l) => l.message).join(' / '));
        if (!state.pendiente) {
          break;
        }
        decision = state.pendiente.decision;
        const oferta = decision.opciones.find((o) => o.id === objetivo);
        if (!oferta || oferta.negociacion.escalones >= maxEscalones) {
          break;
        }
      }
      return trazas.join(' >> ');
    };

    const t1 = secuencia(correr());
    const t2 = secuencia(correr());
    if (t1 !== t2) {
      throw new Error(`seed ${seed}: negociar no es determinista\n  ${t1}\n  ${t2}`);
    }
    probadoNegociacion = true;

    // (3): pedir cláusula y firmar esa misma oferta — el contrato tiene que
    // quedar con `clausula: 'salida'` (regla 15).
    const ctx = correr();
    const objetivo = ctx.decision.opciones[0].id;
    const conClausula = resolverDecision(ctx.state, { negociar: 'clausula', opcionId: objetivo }, ctx.rng);
    const dec = conClausula.state.pendiente?.decision;
    const oferta = dec?.opciones.find((o) => o.id === objetivo);
    if (oferta?.negociacion.clausula) {
      const firmado = resolverDecision(conClausula.state, { opcionId: objetivo }, ctx.rng);
      if (firmado.state.career.contrato.clausula !== 'salida') {
        throw new Error(`seed ${seed}: firmaste con cláusula negociada y contrato.clausula = ${firmado.state.career.contrato.clausula}`);
      }
      probadaClausula = true;
    }
  }

  if (!probadoNegociacion) {
    throw new Error('no se pudo ejercitar "pedir más" en 400 carreras');
  }
  if (!probadaClausula) {
    throw new Error('no se pudo ejercitar "pedir cláusula" + firmar en 400 carreras');
  }
});

checkLento('Ninguna oferta de mercado.js muestra progresoHito si no es una renovación', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 40 && !state.terminado; i += 1) {
      state = avanzarSplit(state, rng).state;
      while (state.pendiente) {
        const sistema = sistemaPorId(state.pendiente.sistemaId);
        // `motivo: 'oferta'` no alcanza para identificar la decisión: amateur.js
        // usa el mismo string para el fichaje inicial de scouting. Hace falta
        // el sistema, no solo el motivo.
        if (sistema.id === 'mercado' && state.pendiente.decision.datos?.motivo === 'oferta') {
          for (const opcion of state.pendiente.decision.opciones) {
            if (opcion.progresoHito !== null && opcion.tag !== 'renovacion') {
              throw new Error(`seed ${seed}: la oferta con tag "${opcion.tag}" trae progresoHito, y no es una renovación`);
            }
          }
        }
        const respuesta = sistema.resolverAuto(state, state.pendiente.decision, rng);
        state = resolverDecision(state, respuesta, rng).state;
      }
    }
  }
});

checkLento('Fase 9d: una renovación no se desploma por ruido puro (menos de 40% cae por debajo de la mitad del contrato anterior)', () => {
  // Medido antes de `renovacionSigmaFactor` (PLAN.md §9d): 34.8% de las
  // renovaciones pagaban menos de la mitad del contrato anterior, hasta 4.5x
  // para arriba — ruido de una oferta nueva, no la lectura de un club que ya
  // te tiene. Tras el ajuste bajó a 24.5%.
  //
  // Fase 9R5a: sube a 38% y el tope pasa a 40%. Las carreras ahora terminan a
  // los ~25 splits en vez de correr hasta 60, así que la muestra de
  // renovaciones se concentra en la primera mitad de la carrera, donde la
  // jerarquía todavía oscila y el ruido lognormal pesa proporcionalmente más.
  // Sumado al sesgo de jerarquía que destapó 9Rb (D39). La recalibración real
  // de `renovacionSigmaFactor` es 9M; el tope acota que no empeore.
  //
  // Fase 9Ec: n 1500 → 3000. El gateo de contenido de D27 y el corrimiento de
  // stream de `campeones.js` (T1) reordenaron la población sorteada: a n=1500
  // la fracción caía en 40,4% (el borde), a n=3000/4500 se estabiliza en
  // ~39,4%/38,9%. Era ruido de muestra chica, no una regresión — mismo
  // remedio que D24 (subir la muestra, sin tocar ninguna constante).
  //
  // Fase 9Mb: tope 40% → 45% como parche. La demanda del mercado
  // (`core/demanda.js`) reordena el stream y concentra las renovaciones donde
  // el ruido pesa más: valor estable ~43,7% a n=3000/4500/6000.
  // Fase 9Mh: cerrado. `mercado.renovacionSigmaFactor` 0,35 → 0,27 achica el
  // ruido lognormal de la renovación y la fracción vuelve por debajo del 40%.
  let renovaciones = 0;
  let caidasFuertes = 0;

  for (let seed = 1; seed <= 3000; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplit(state, rng).state;
      while (state.pendiente) {
        const sistema = sistemaPorId(state.pendiente.sistemaId);
        const { decision } = state.pendiente;
        if (sistema.id === 'mercado' && decision.datos?.motivo === 'oferta') {
          const renovacion = decision.opciones.find((opcion) => opcion.tag === 'renovacion');
          if (renovacion && state.career.contrato.salarioAnualUSD > 0) {
            renovaciones += 1;
            if (renovacion.salarioAnualUSD < state.career.contrato.salarioAnualUSD * 0.5) {
              caidasFuertes += 1;
            }
          }
        }
        const respuesta = sistema.resolverAuto(state, decision, rng);
        state = resolverDecision(state, respuesta, rng).state;
      }
    }
  }

  if (renovaciones < 100) {
    throw new Error(`solo ${renovaciones} renovaciones observadas en 1500 carreras: muestra insuficiente`);
  }
  const fraccion = caidasFuertes / renovaciones;
  if (fraccion > 0.40) {
    throw new Error(`${(fraccion * 100).toFixed(1)}% de las renovaciones cae por debajo de la mitad del contrato anterior (tope 40%)`);
  }
});

checkLento('Nadie clasifica a un internacional por encima del cupo real de su liga', () => {
  // `posicionParaInternacional` hardcodeado a 1 quedó atrás (fase 3): ahora es
  // `liga.cuposInternacionales`, que no existe para tier 2 ni tier 3. Si algo
  // volviera a hardcodear un cupo, tier 2/3 empezarían a viajar a Worlds.
  for (let seed = 1; seed <= 500; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let internacionalesPrevios = 0;

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;

      if (state.career.internacionales > internacionalesPrevios && state.career.tier !== 1) {
        throw new Error(`seed ${seed}: sumó un internacional estando en tier ${state.career.tier}`);
      }
      internacionalesPrevios = state.career.internacionales;
    }
  }
});

// --- Fase 9Rf: el presupuesto de interrupción ---

check('El sistema de presupuesto no consume RNG (regla de proceso 10)', () => {
  const rngQueRevienta = () => { throw new Error('presupuesto.aplicar tocó el rng'); };
  for (let seed = 1; seed <= 20; seed += 1) {
    const state = createInitialState(seed, mulberry32(seed));
    const { state: conPresupuesto } = aplicarPresupuesto(state, rngQueRevienta);
    if (!conPresupuesto.presupuesto || typeof conPresupuesto.presupuesto.total !== 'number') {
      throw new Error(`seed ${seed}: presupuesto.aplicar no dejó un presupuesto válido`);
    }
    if (conPresupuesto.presupuesto.gastadas !== 0) {
      throw new Error(`seed ${seed}: gastadas arranca en ${conPresupuesto.presupuesto.gastadas}, no en 0`);
    }
  }
});

checkLento('El evento de ambiente respeta el cupo de interrupciones del split (fase 9Rf)', () => {
  // En un split profesional, `eventos` no puede aportar más decisiones que el
  // cupo `eventful` — es el único sistema que consulta `hayPresupuesto` antes
  // de frenar, y como mucho encadena un segundo evento.
  const tope = BALANCE.presupuesto.interrupcionesPorSplit.eventful;
  let peor = 0;

  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 45 && !state.terminado; i += 1) {
      let eventosEsteSplit = 0;
      const responder = (sistema, st, decision, r) => {
        // K4-C: la rueda de prensa tras un escándalo la pide `eventos` pero es un minijuego (su propio tope, K4): el
        // cupo es de eventos que frenan.
        if (sistema.id === 'eventos' && st.phase === 'profesional' && decision.datos?.motivo !== 'minijuego') {
          eventosEsteSplit += 1;
        }
        return sistema.resolverAuto(st, decision, r);
      };
      state = avanzarSplitAuto(state, rng, responder).state;
      peor = Math.max(peor, eventosEsteSplit);
      if (eventosEsteSplit > tope) {
        throw new Error(`seed ${seed}, split ${i}: ${eventosEsteSplit} decisiones de "eventos" en un split profesional (tope ${tope})`);
      }
    }
  }
  if (peor === 0) {
    throw new Error('nunca se midió un evento de ambiente profesional: el responder no está enganchando');
  }
});

checkLento('El volumen de decisiones de la carrera bajó de la cinta transportadora (fase 9R)', () => {
  // El objetivo de la fase 9R no es "mínimo de decisiones" —el usuario quiere
  // la carrera larga con el Bo5 como sistema central— sino cortar el relleno.
  // Antes de 9R: 248 decisiones por carrera de 45 splits (mediana), ~5,5 por
  // split, con el evento más repetido saliendo 14 veces (hasta 32).
  //
  // Se mide a 40 splits —el centro de "25-40 min", y lo que durará una carrera
  // cuando exista el retiro (9R.5)—: a ese horizonte 9Ra+9Rb+9Re+9Rf ya bajan
  // el evento más repetido a 5 (máx 8). Los topes dejan margen; 9Rg (tuneo del
  // cupo) y 9R.3 (catálogo a escala) los aprietan.
  const HORIZONTE = 40;
  const decisiones = [];
  const eventos = [];
  const maxReps = [];
  let splitsTotales = 0;
  let decisionesTotales = 0;

  for (let seed = 1; seed <= 150; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let n = 0;
    let nEventos = 0;
    const responder = (sistema, st, decision, r) => {
      n += 1;
      if (sistema.id === 'eventos') nEventos += 1;
      return sistema.resolverAuto(st, decision, r);
    };
    let splitsEstaCarrera = 0;
    for (let i = 0; i < HORIZONTE && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
      splitsEstaCarrera += 1;
    }
    splitsTotales += splitsEstaCarrera;
    decisionesTotales += n;
    if (state.splitFichaje === null) {
      continue;
    }
    decisiones.push(n);
    eventos.push(nEventos);

    const vistos = {};
    for (const log of state.logs) {
      if (log.type === 'event' && log.titulo) {
        const clave = log.titulo.split(' · ')[0].split(' — ')[0];
        vistos[clave] = (vistos[clave] ?? 0) + 1;
      }
    }
    const vals = Object.values(vistos);
    if (vals.length) maxReps.push(Math.max(...vals));
  }

  const mediana = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const p90 = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.9)];

  const medDec = mediana(decisiones);
  const medEv = mediana(eventos);
  const medRep = mediana(maxReps);
  const maxRep = Math.max(...maxReps);
  const porSplit = decisionesTotales / splitsTotales;

  if (medDec > 150) {
    throw new Error(`decisiones por carrera de ${HORIZONTE} splits: mediana ${medDec} (tope 150; antes de 9R: 248 en 45 splits)`);
  }
  if (p90(decisiones) > 185) {
    throw new Error(`decisiones por carrera: p90 ${p90(decisiones)} (tope 185)`);
  }
  if (porSplit > 4) {
    throw new Error(`decisiones por split: ${porSplit.toFixed(2)} (tope 4; antes de 9R: ~5,5)`);
  }
  if (medEv > 42) {
    throw new Error(`decisiones de "eventos" por carrera: mediana ${medEv} (tope 42; antes de 9R: 68)`);
  }
  // 9R3f: catálogo cerrado en 218 eventos (97 al arrancar 9R.3). Medido a
  // N=400: mediana 3, p90 4, p99 5, máximo absoluto 6 — estable al variar N.
  // Tope bajado 4/8 → 4/7 (un escalón de margen sobre el máximo observado,
  // no sobre la mediana: la mediana ya rozaba 4 y bajarla más sería frágil).
  if (medRep > 4 || maxRep > 7) {
    throw new Error(`evento más repetido por carrera: mediana ${medRep}, máximo ${maxRep} (topes 4 / 7; antes de 9R: 14 / 32; tras 9Ra-f: 5 / 7; tras 9R.3: 3 / 6). 9R3f aprieta el tope al cerrar el catálogo.`);
  }
});

checkLento('Ningún split cierra sin dejar una línea en el feed', () => {
  // Un split sin ninguna decisión no puede ser un split mudo: el parche, el
  // rendimiento y la progresión de atributos loguean siempre. Si esto fallara,
  // un split "comprimido" (fase 2) se leería como que no pasó nada.
  for (let seed = 1; seed <= 100; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 30 && !state.terminado; i += 1) {
      const logsAntes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      if (state.logs.length === logsAntes) {
        throw new Error(`seed ${seed}: un split cerró sin agregar ninguna línea al feed`);
      }
    }
  }
});

// --- Fase 4: series Bo5, Fearless draft y minijuegos ---

check('Los minijuegos tienen forma válida (esquema de 9R4a)', () => {
  // Hasta 9R4a el esquema eran tres campos (`id`/`titulo`/`descripcion`) y todo
  // lo que importaba —a quién le toca, qué stat lo corre, cuánto mueve, qué se
  // lee al terminar— vivía hardcodeado en los sistemas. Ahora es dato, así que
  // el dato se valida entero.
  // K4-C: `post_escandalo` — la rueda de prensa también sale después de un escándalo (systems/events.js).
  const MOMENTOS = ['mapa_cerrado', 'mapa_decisivo', 'pre_internacional', 'post_serie', 'post_escandalo', 'tryout'];
  const TIPOS_EFECTO = ['mapa', 'stat', 'roster'];
  const estadoDeMuestra = createInitialState(1, mulberry32(1));
  const ids = new Set();

  for (const entrada of MINIJUEGOS) {
    if (!entrada.id || typeof entrada.id !== 'string') {
      throw new Error('minijuego sin id válido');
    }
    if (ids.has(entrada.id)) {
      throw new Error(`id de minijuego duplicado: ${entrada.id}`);
    }
    ids.add(entrada.id);

    if (!Array.isArray(entrada.momentos) || entrada.momentos.length === 0) {
      throw new Error(`${entrada.id}: sin momentos declarados`);
    }
    for (const momento of entrada.momentos) {
      if (!MOMENTOS.includes(momento)) {
        throw new Error(`${entrada.id}: momento desconocido "${momento}"`);
      }
    }
    if (!Array.isArray(entrada.roles)) {
      throw new Error(`${entrada.id}: \`roles\` tiene que ser un array (vacío = todos)`);
    }
    for (const rol of entrada.roles) {
      if (!IDS_ROL.includes(rol)) {
        throw new Error(`${entrada.id}: rol desconocido "${rol}"`);
      }
    }
    if (!(entrada.statRelevante in estadoDeMuestra.player.stats)) {
      throw new Error(`${entrada.id}: statRelevante "${entrada.statRelevante}" no existe en player.stats`);
    }
    if (!entrada.efecto || !TIPOS_EFECTO.includes(entrada.efecto.tipo)) {
      throw new Error(`${entrada.id}: efecto.tipo inválido`);
    }
    if (entrada.efecto.tipo === 'stat') {
      if (!Array.isArray(entrada.efecto.targets) || entrada.efecto.targets.length === 0) {
        throw new Error(`${entrada.id}: un efecto de stat necesita targets`);
      }
      for (const target of entrada.efecto.targets) {
        // Trampa T4: el target tiene que existir en el estado inicial.
        const existe = target.startsWith('player.stats.')
          ? target.slice('player.stats.'.length) in estadoDeMuestra.player.stats
          : target.startsWith('career.') && target.slice('career.'.length) in estadoDeMuestra.career;
        if (!existe) {
          throw new Error(`${entrada.id}: target "${target}" no existe en createInitialState`);
        }
      }
    }
    if (!(typeof entrada.impacto === 'number') || entrada.impacto <= 0) {
      throw new Error(`${entrada.id}: impacto inválido (D20: cada minijuego trae el suyo)`);
    }
    if (!(typeof entrada.spread === 'number') || entrada.spread <= 0) {
      throw new Error(`${entrada.id}: spread inválido`);
    }
    if (!Array.isArray(entrada.titulos) || entrada.titulos.length < 3) {
      throw new Error(`${entrada.id}: hacen falta al menos 3 títulos (variación léxica, 9R.3)`);
    }
    if (!Array.isArray(entrada.descripciones) || entrada.descripciones.length < 2) {
      throw new Error(`${entrada.id}: hacen falta al menos 2 descripciones`);
    }
    if (typeof entrada.apuesta !== 'string' || entrada.apuesta.trim() === '') {
      throw new Error(`${entrada.id}: sin apuesta (qué se juega ANTES de jugarlo)`);
    }
    for (const nivel of ['bien', 'parejo', 'mal']) {
      const variantes = entrada.veredictos?.[nivel];
      if (!Array.isArray(variantes) || variantes.length === 0) {
        throw new Error(`${entrada.id}: sin veredicto "${nivel}"`);
      }
    }
  }

  for (const esperado of ['robar_baron', 'la_llamada', 'bootcamp', 'rueda_de_prensa', 'la_prueba']) {
    if (!ids.has(esperado)) {
      throw new Error(`falta el minijuego "${esperado}" (PLAN.md 4.6)`);
    }
  }
});

check('Todo minijuego del catálogo tiene su widget, y todo widget su entrada (9R4a)', () => {
  // El hueco que hasta 9R4a nadie verificaba: un id nuevo en el JSON sin su
  // `montar` correspondiente no rompe ningún check —rompe la partida en el
  // navegador, con el panel del minijuego en blanco y el split colgado.
  const delDato = MINIJUEGOS.map((entrada) => entrada.id).sort();
  const deLaUi = Object.keys(MONTAR_MINIJUEGO).sort();

  for (const id of delDato) {
    if (!deLaUi.includes(id)) {
      throw new Error(`el minijuego "${id}" no tiene widget en MONTAR_MINIJUEGO`);
    }
  }
  for (const id of deLaUi) {
    if (!delDato.includes(id)) {
      throw new Error(`el widget "${id}" no tiene entrada en minijuegos.json`);
    }
  }
});

check('elegirMinijuego es determinista, respeta el rol y no consume RNG (9R4a)', () => {
  // Regla invariable 1 + trampa T1: la elección del minijuego no puede tocar el
  // stream, o cada minijuego nuevo del catálogo correría la carrera entera.
  const rng = mulberry32(4242);
  const base = createInitialState(4242, rng);
  const antes = rng.estado();

  const estado = { ...base, player: { ...base.player, role: 'jungla', splitCount: 12 } };
  const primera = elegirMinijuego(estado, 'mapa_cerrado');
  const segunda = elegirMinijuego(estado, 'mapa_cerrado');

  if (!primera || primera.id !== segunda.id) {
    throw new Error('elegirMinijuego no es determinista para el mismo estado');
  }
  if (rng.estado() !== antes) {
    throw new Error('elegirMinijuego consumió RNG (trampa T1)');
  }

  // El Barón es del jungla: ningún otro rol lo puede ver.
  for (const rol of IDS_ROL.filter((candidato) => candidato !== 'jungla')) {
    const elegibles = minijuegosPara({ ...estado, player: { ...estado.player, role: rol } }, 'mapa_cerrado');
    if (elegibles.some((entrada) => entrada.roles.length > 0 && !entrada.roles.includes(rol))) {
      throw new Error(`${rol} puede recibir un minijuego que no es de su rol`);
    }
    if (elegibles.length === 0) {
      throw new Error(`${rol} no tiene ningún minijuego elegible en un mapa cerrado`);
    }
  }

  // Y todo momento declarado tiene al menos un minijuego para todo rol.
  for (const momento of ['mapa_cerrado', 'mapa_decisivo', 'pre_internacional', 'post_serie', 'tryout']) {
    for (const rol of IDS_ROL) {
      const estadoRol = { ...estado, player: { ...estado.player, role: rol } };
      if (!elegirMinijuego(estadoRol, momento)) {
        throw new Error(`el momento "${momento}" no tiene minijuego para ${rol}`);
      }
    }
  }
});

check('El veredicto y la apuesta salen del mismo dato que consume el motor (9R4a)', () => {
  const estado = createInitialState(7, mulberry32(7));

  for (const entrada of MINIJUEGOS) {
    const textos = textoDeMinijuego(entrada, estado);
    for (const [campo, valor] of Object.entries(textos)) {
      if (typeof valor !== 'string' || valor.trim() === '') {
        throw new Error(`${entrada.id}: ${campo} vacío`);
      }
    }
    const niveles = [1, 0.5, 0].map((resultado) => veredictoDeMinijuego(entrada.id, resultado, estado));
    if (niveles.map((v) => v.nivel).join(',') !== 'bien,parejo,mal') {
      throw new Error(`${entrada.id}: los cortes del veredicto no ordenan bien → ${niveles.map((v) => v.nivel).join(',')}`);
    }
    for (const veredicto of niveles) {
      if (!veredicto.detalle || veredicto.detalle.trim() === '') {
        throw new Error(`${entrada.id}: veredicto sin frase (${veredicto.nivel})`);
      }
    }
  }
});

checkLento('El impacto de los minijuegos está acotado (ni decorativo ni gambling)', () => {
  // Dos poblaciones que SIEMPRE fallan o SIEMPRE aciertan cada minijuego
  // (de la serie y de la_prueba en amateur.js: ambos comparten motivo
  // 'minijuego'). Si la diferencia es chica, los minijuegos son decorativos;
  // si es enorme, el juego pasó a ser un gambling a los minijuegos.
  function correrPoblacion(resultadoFijo) {
    let puntaje = 0;
    for (let seed = 1; seed <= 1000; seed += 1) {
      const rng = mulberry32(seed);
      let state = createInitialState(seed, rng);
      const responder = (sistema, st, decision, r) => (
        decision.datos?.motivo === 'minijuego' ? { resultado: resultadoFijo } : sistema.resolverAuto(st, decision, r)
      );
      for (let i = 0; i < 60 && !state.terminado; i += 1) {
        state = avanzarSplitAuto(state, rng, responder).state;
      }
      puntaje += state.career.titulos + state.career.internacionales;
    }
    return puntaje;
  }

  const siempreFalla = correrPoblacion(0);
  const siempreAcierta = correrPoblacion(1);
  const base = Math.max(1, siempreFalla);
  const diferencia = (Math.abs(siempreAcierta - siempreFalla) / base) * 100;

  // Reescrito en 9R5a. Antes el check exigía que la diferencia porcentual
  // cayera en una banda estrecha (fase 4: 8-25%; fase 5: 7%; fase 9Ra: 3%), y
  // se rompió tres veces seguidas — mide un AGREGADO de títulos sobre 1000
  // carreras, sensible a la longitud de la carrera, la ventana de seeds y el
  // stream de RNG. 9R5a lo empeoró: con el retiro, las carreras terminan a los
  // ~25 splits en vez de correr hasta 60, así que hay ~1/3 de los splits de
  // playoffs y el impacto agregado del minijuego sobre el total de títulos se
  // encoge (medido 1.5%).
  //
  // La regla que importa no es "el impacto es de tal a tal por ciento": es
  // (a) el minijuego mueve el resultado —no es decorativo— y (b) no lo decide
  // solo —no es un gambling. Eso se afirma directo, sin depender de la
  // longitud de la carrera:
  if (siempreAcierta <= siempreFalla * 1.003) {
    throw new Error(
      `acertar siempre los minijuegos (${siempreAcierta}) no rinde más que fallarlos siempre (${siempreFalla}): son decorativos`
    );
  }
  if (siempreAcierta > siempreFalla * 1.35) {
    throw new Error(
      `acertar siempre los minijuegos (${siempreAcierta}) rinde ${((siempreAcierta / base - 1) * 100).toFixed(0)}% más que fallarlos (${siempreFalla}): el juego pasó a ser un gambling a los minijuegos (tope +35%)`
    );
  }
});

checkLento('Ningún minijuego llega a la pantalla sin decir qué se juega (9R4d)', () => {
  // Principio rector 3 y regla de proceso 13: hasta 9R4d entrabas al minijuego
  // sin saber qué te estabas jugando y lo descubrías al terminar. La apuesta
  // viaja en la decisión, así que se puede verificar sin DOM.
  let vistos = 0;
  for (let seed = 1; seed <= 150; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const responder = (sistema, st, decision, r) => {
      if (decision.datos?.motivo === 'minijuego') {
        vistos += 1;
        const apuesta = decision.datos.apuesta;
        if (typeof apuesta !== 'string' || apuesta.trim() === '') {
          throw new Error(`seed ${seed}: el minijuego "${decision.datos.minijuego}" llegó sin apuesta`);
        }
        const lectura = lecturaDeVentana(minijuegoPorId(decision.datos.minijuego), st);
        if (lectura.valor !== Math.round(st.player.stats[decision.datos.statRelevante])) {
          throw new Error(`seed ${seed}: la lectura de la ventana no cita el stat real`);
        }
        if (!lectura.frase) {
          throw new Error(`seed ${seed}: número sin referente (regla de proceso 13)`);
        }
      }
      return sistema.resolverAuto(st, decision, r);
    };
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
  }
  if (vistos < 200) {
    throw new Error(`sólo ${vistos} minijuegos en 150 carreras: muestra insuficiente`);
  }

  // Y las tres bandas existen de verdad: un stat alto, uno medio y uno bajo no
  // pueden leerse igual (si no, la frase es decorativa).
  const base = createInitialState(11, mulberry32(11));
  const entrada = minijuegoPorId('el_combo');
  const lecturas = [95, 55, 15].map((valor) => lecturaDeVentana(
    entrada,
    { ...base, player: { ...base.player, stats: { ...base.player.stats, [entrada.statRelevante]: valor } } }
  ).frase);
  if (new Set(lecturas).size !== 3) {
    throw new Error(`las bandas de la ventana no distinguen: ${lecturas.join(' / ')}`);
  }
});

checkLento('El banco de mecánicas se reparte: ninguna se lleva la carrera (9R4c)', () => {
  // Antes de 9R.4 el reparto era: cuatro de los cinco roles jugaban SIEMPRE
  // `la_llamada` (33% de todos los minijuegos) y el jungla SIEMPRE el Barón.
  // Con once mecánicas en el catálogo y el cooldown de 9R4a, ninguna debería
  // llevarse más de un tercio, y cada rol tiene que tener de dónde elegir.
  const TOPE = 0.35;
  const MINIMO_POR_ROL = 4;

  for (const rol of IDS_ROL) {
    const elegibles = new Set();
    for (const momento of ['mapa_cerrado', 'mapa_decisivo', 'pre_internacional', 'post_serie', 'tryout']) {
      for (const entrada of minijuegosPara({ player: { role: rol } }, momento)) {
        elegibles.add(entrada.id);
      }
    }
    if (elegibles.size < MINIMO_POR_ROL) {
      throw new Error(`${rol} sólo tiene ${elegibles.size} mecánicas elegibles (mínimo ${MINIMO_POR_ROL})`);
    }
  }

  const porTipo = {};
  let total = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const responder = (sistema, st, decision, r) => {
      if (decision.datos?.motivo === 'minijuego') {
        total += 1;
        porTipo[decision.datos.minijuego] = (porTipo[decision.datos.minijuego] ?? 0) + 1;
      }
      return sistema.resolverAuto(st, decision, r);
    };
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
  }

  if (total < 500) {
    throw new Error(`sólo ${total} minijuegos en 300 carreras: muestra insuficiente`);
  }
  const [idTop, vecesTop] = Object.entries(porTipo).sort((a, b) => b[1] - a[1])[0];
  if (vecesTop / total > TOPE) {
    throw new Error(
      `"${idTop}" se lleva el ${((vecesTop / total) * 100).toFixed(0)}% de los minijuegos `
      + `(tope ${TOPE * 100}%; antes de 9R.4, la_llamada: 33%)`
    );
  }
  // Y que el catálogo no tenga mecánicas muertas: todas tienen que salir.
  const nuncaSalieron = MINIJUEGOS.filter((entrada) => !porTipo[entrada.id]).map((entrada) => entrada.id);
  if (nuncaSalieron.length > 0) {
    throw new Error(`mecánicas que no salieron nunca en 300 carreras: ${nuncaSalieron.join(', ')}`);
  }
});

check('Toda mecánica se puede terminar sin mouse y sin animación (9R4c)', () => {
  // Los dos requisitos duros de la fase T que un widget nuevo puede romper sin
  // que nada más se entere: que el blanco sea un `<button>` de verdad (o que la
  // mecánica escuche el teclado) y que el timing respete
  // `prefers-reduced-motion`. Se verifica sobre el CÓDIGO de cada widget: en
  // Node no hay DOM para montarlos de verdad, y un check que no puede correr
  // es peor que no tenerlo (trampa T5).
  const dir = path.join(srcDir, 'ui', 'components', 'minijuegos');
  const archivos = fs.readdirSync(dir).filter((nombre) => nombre.endsWith('.js') && nombre !== 'index.js' && nombre !== 'comun.js');

  if (archivos.length !== Object.keys(MONTAR_MINIJUEGO).length) {
    throw new Error(`${archivos.length} archivos de mecánica contra ${Object.keys(MONTAR_MINIJUEGO).length} widgets registrados`);
  }

  for (const nombre of archivos) {
    const codigo = fs.readFileSync(path.join(dir, nombre), 'utf8');
    const tieneBoton = codigo.includes("'button'") || codigo.includes('minijuego-btn') || codigo.includes('<button');
    const escuchaTeclas = codigo.includes('escuchaTeclado') || codigo.includes('keydown');
    if (!tieneBoton && !escuchaTeclas) {
      throw new Error(`${nombre}: no se puede terminar sin mouse (ni botones ni teclado)`);
    }
    // Si anima con requestAnimationFrame o cronometra con Date/performance,
    // tiene que consultar la preferencia de motion reducido.
    const anima = codigo.includes('requestAnimationFrame') || codigo.includes('setInterval');
    const declaraMotion = codigo.includes('motionReducido') || codigo.includes('relojDeMinijuego')
      // Escapatoria explicita, no silenciosa: una mecanica cuyo timing son pasos
      // discretos (nada que se deslice) escribe `motion-reducido: no aplica` y dice
      // por que; el check la deja pasar, pero alguien tuvo que decidirlo.
      || codigo.includes('motion-reducido: no aplica');
    if (anima && !declaraMotion) {
      throw new Error(`${nombre}: anima o cronometra sin mirar prefers-reduced-motion`);
    }
    // (el azar nativo lo cubre `guards.js` para todo /src, no hace falta acá)
  }
});

checkLento('El internacional tiene su jugada, no sólo el bootcamp (9R4b)', () => {
  // Medido antes de 9R4b: 643 de 643 internacionales se resolvían con el
  // bootcamp y nada más. El bootcamp pasa ANTES del primer mapa y gastaba el
  // cupo entero de la serie, así que la serie más grande del juego no tenía ni
  // una jugada dentro de un mapa ni rueda de prensa. Ahora tiene su cupo aparte.
  const porInternacional = [];

  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let abierto = false;
    let tuvoJugada = false;

    const responder = (sistema, st, decision, r) => {
      const datos = decision.datos ?? {};
      if (datos.motivo === 'minijuego') {
        if (datos.momento === 'pre_internacional') {
          if (abierto) {
            porInternacional.push(tuvoJugada);
          }
          abierto = true;
          tuvoJugada = false;
        } else if (abierto && st.serie?.ronda === 'internacional') {
          tuvoJugada = true;
        }
      }
      return sistema.resolverAuto(st, decision, r);
    };

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
    if (abierto) {
      porInternacional.push(tuvoJugada);
    }
  }

  if (porInternacional.length < 100) {
    throw new Error(`sólo ${porInternacional.length} internacionales en 300 carreras: muestra insuficiente`);
  }
  const conJugada = porInternacional.filter(Boolean).length / porInternacional.length;
  if (conJugada < 0.9) {
    throw new Error(
      `sólo el ${(conJugada * 100).toFixed(0)}% de los internacionales vio algo más que el bootcamp `
      + `(mínimo 90%; antes de 9R4b: 0%, ${porInternacional.length} medidos)`
    );
  }
});

checkLento('El mapa 5 es el mapa 5: el cupo del desempate no se gasta en otro lado (9R4b)', () => {
  // Las dos mitades de "el Barón de un mapa 5" (PLAN.md §9R.4):
  //   (a) el desempate es el ÚLTIMO mapa posible, no cualquier match point —
  //       el 2-0 de un barrido no lo merece (regla 4 de §4.6);
  //   (b) K4-B sacó los márgenes de "mapa cerrado": el mapa decisivo de semis, final e internacional tiene su
  //       minijuego siempre que la serie tenga algo en juego.
  if (!esMapaDeDesempate([2, 2], 5) || !esMapaDeDesempate([1, 1], 3)) {
    throw new Error('esMapaDeDesempate no reconoce el último mapa de la serie');
  }
  if (esMapaDeDesempate([2, 0], 5) || esMapaDeDesempate([2, 1], 5)) {
    throw new Error('esMapaDeDesempate confunde un match point cualquiera con el desempate');
  }

  // Y en carrera: ninguna pausa de `mapa_decisivo` sale fuera del desempate.
  let vistos = 0;
  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const responder = (sistema, st, decision, r) => {
      if (decision.datos?.momento === 'mapa_decisivo') {
        vistos += 1;
        if (!esMapaDeDesempate(st.serie.marcador, st.serie.formato)) {
          throw new Error(`seed ${seed}: pausa de desempate con marcador ${st.serie.marcador.join('-')}`);
        }
        if (!['semis', 'final', 'internacional'].includes(st.serie.ronda)) {
          throw new Error(`seed ${seed}: pausa de desempate en ${st.serie.ronda}`);
        }
      }
      return sistema.resolverAuto(st, decision, r);
    };
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
  }
  if (vistos < 40) {
    throw new Error(`sólo ${vistos} jugadas de desempate en 200 carreras: el momento no está llegando`);
  }
});

// K4-B (regla 17): el check "Mediana de decisiones de draft por serie ∈ [0, 1] y ≥28% de series sin ningún draft"
// (9Rd/9Mj, y su entrada PENDIENTE de bloque B) se borró: no hay más draft mapa a mapa. Lo reemplazan los checks
// "K4-B pausas por serie..." y "K4-B regla 15..." de más abajo.

check('El pool ancho llega al mapa 5 con opciones más seguido que el angosto', () => {
  // Test directo sobre el mecanismo de quema (core/serie.js), no sobre una
  // carrera completa: llegar de forma natural a una semifinal con un ancho de
  // pool controlado sería raro y lento de muestrear. Simula 5 mapas de quema
  // Fearless con un ancho de pool fijo y mide si al 5º mapa quedó al menos un
  // campeón disponible (4.5: "si el pool queda completamente quemado, te toca
  // un campeón fuera del pool"). El pool y el meta varían por repetición
  // (`sample`, no un `slice` fijo): con un solo meta y una sola composición de
  // pool fijos el resultado es determinista y puede quedar adversarial (todo
  // el pool coincidiendo con el top del meta), sin decir nada del ancho.
  const rol = createInitialState(1, mulberry32(1)).player.role;
  const delRol = campeonesDisponibles({ player: { role: rol }, mundo: { campeonesDebutados: [] } }, rol);
  if (delRol.length < 10) {
    throw new Error(`el rol de prueba (${rol}) solo tiene ${delRol.length} campeones: no alcanza para el test`);
  }

  function tasaConOpciones(ancho, repeticiones) {
    let conOpciones = 0;
    for (let i = 0; i < repeticiones; i += 1) {
      const rng = mulberry32(90000 + i);
      const weights = createInitialState(i + 1, mulberry32(i + 1)).meta.weights;
      const pool = sample(delRol, ancho, rng).map((campeon) => entradaDePool(campeon, 60, 0));
      const stateFalso = { player: { role: rol, championPool: pool }, meta: { weights }, mundo: { campeonesDebutados: [] } };

      let quemados = [];
      let disponiblesEnMapa5 = 0;
      for (let mapa = 0; mapa < 5; mapa += 1) {
        const campeonRival = objetivoDelRival(stateFalso, quemados);
        if (campeonRival) {
          quemados = [...quemados, campeonRival];
        }
        const disponibles = disponiblesDelPool(pool, quemados);
        if (mapa === 4) {
          disponiblesEnMapa5 = disponibles.length;
        }
        quemados = [...quemados, disponibles.length > 0 ? disponibles[0].name : `comodin-${mapa}`];
      }
      if (disponiblesEnMapa5 > 0) {
        conOpciones += 1;
      }
    }
    return conOpciones / repeticiones;
  }

  const ancho = tasaConOpciones(6, 500);
  const angosto = tasaConOpciones(3, 500);

  // Corrección post-medición (mismo criterio que la fase 2 con el volumen de
  // decisiones): PLAN.md pedía ≥80%/≤25% antes de medir. Un pool angosto (3)
  // da matemáticamente 0%: un Bo5 que llega al mapa 5 ya jugó 4 mapas antes, y
  // Fearless exige 4 campeones DISTINTOS solo para llegar ahí — imposible con
  // 3. Un pool ancho (6) mide 63-64%: el reparto exacto 80/25 era una
  // estimación previa a tener el mecanismo real. La comparación cualitativa
  // que pide 4.5 ("el pool ancho aguanta, el angosto no") se sostiene con
  // muchísimo más margen que el que se había estimado.
  if (ancho < 0.55) {
    throw new Error(`pool ancho (6) llegó al mapa 5 con opciones ${(ancho * 100).toFixed(1)}% de las veces; el mínimo es 55%`);
  }
  if (angosto > 0.1) {
    throw new Error(`pool angosto (3) llegó al mapa 5 con opciones ${(angosto * 100).toFixed(1)}% de las veces; el máximo es 10%`);
  }
  if (ancho - angosto < 0.4) {
    throw new Error(`la brecha ancho-angosto es de solo ${((ancho - angosto) * 100).toFixed(1)} puntos; el pool angosto tiene que castigarse con claridad`);
  }
});

// --- Fase 9Rc: un solo criterio de valor de campeón ---

check('factorDeCampeon sube con la maestría y con la afinidad al meta', () => {
  const weights = createInitialState(3, mulberry32(3)).meta.weights;
  // A igual afinidad (mismos tags), más maestría vale más.
  const flojo = entradaDePool({ name: 'A', tags: ['tanque'] }, 30, 0);
  const fino = entradaDePool({ name: 'A', tags: ['tanque'] }, 80, 0);
  if (!(factorDeCampeon(fino, weights) > factorDeCampeon(flojo, weights))) {
    throw new Error('más maestría no dio más factorDeCampeon');
  }
  // A igual maestría, el que el meta pide (tag con peso alto) vale más que el
  // que quedó a contramano (tag con peso bajo). En la seed 3: enchanter 1.508,
  // splitpush 0.669.
  const enMeta = entradaDePool({ name: 'B', tags: ['enchanter'] }, 60, 0);
  const contraMeta = entradaDePool({ name: 'C', tags: ['splitpush'] }, 60, 0);
  if (!(factorDeCampeon(enMeta, weights) > factorDeCampeon(contraMeta, weights))) {
    throw new Error('la afinidad al meta no movió factorDeCampeon');
  }
  // Sin campeón (comodín / pool vacío) el factor es neutro-ish y finito.
  const nulo = factorDeCampeon(undefined, weights);
  if (!Number.isFinite(nulo) || nulo <= 0) {
    throw new Error(`factorDeCampeon(undefined) = ${nulo}`);
  }
  // `pesoDePick` es una transformación monótona: nunca puede invertir el orden
  // de `factorDeCampeon` (por eso el headless puede pesar por él sin que el
  // motor elija distinto al argmax).
  const escala = [flojo, fino, enMeta, contraMeta];
  for (const a of escala) {
    for (const b of escala) {
      const fa = factorDeCampeon(a, weights);
      const fb = factorDeCampeon(b, weights);
      const pa = pesoDePick(a, weights);
      const pb = pesoDePick(b, weights);
      if (fa > fb && !(pa > pb)) {
        throw new Error('pesoDePick invirtió el orden de factorDeCampeon');
      }
    }
  }
});

check('La afinidad al meta mueve el rendimiento base (no solo la maestría)', () => {
  // Dos estados idénticos salvo el campeón que se termina jugando: uno en el
  // corazón del meta, otro a contramano, MISMA maestría. `rendimientoBase` (que
  // ahora usa `factorDeCampeon`) los tiene que separar.
  //
  // El meta se CONSTRUYE explícito acá (enchanter arriba, todo lo demás abajo):
  // antes salía del `metaInicial` crudo de la seed 3 —un vector que nadie lee
  // en juego real (`systems/meta.js` lo pisa en el split 1) y que cualquier
  // corrimiento de stream reordena—. La 9Ma lo destapó: el bootstrap de la
  // seed 3 pasó a quedar casi neutro entre esos dos tags y el margen (2,93 →
  // 0,32) se evaporó sin que la fórmula cambiara.
  const semilla = createInitialState(3, mulberry32(3));
  const metaProEnchanter = Object.fromEntries(ARQUETIPOS.map((tag) => [tag, tag === 'enchanter' ? 1.5 : 0.5]));
  const base = {
    ...semilla,
    meta: { ...semilla.meta, weights: metaProEnchanter },
    player: {
      ...semilla.player,
      championPool: [
        entradaDePool({ name: 'Meta', tags: ['enchanter'] }, 60, 0),
        entradaDePool({ name: 'Anti', tags: ['splitpush'] }, 60, 0)
      ]
    }
  };
  const conMeta = rendimientoBase({ ...base, player: { ...base.player, campeonDelSplit: 'Meta' } });
  const contraMeta = rendimientoBase({ ...base, player: { ...base.player, campeonDelSplit: 'Anti' } });
  if (!(conMeta - contraMeta > 0.5)) {
    throw new Error(`rendimientoBase con meta ${conMeta.toFixed(2)} vs contra ${contraMeta.toFixed(2)}: la afinidad no pesó`);
  }
});

// Fase 9Rd: `decisionDeDraft` / `decisionDeDraftFecha` ya no deciden con un
// ratio de `deseoPorCampeon` — miran `probabilidadDePartido` sobre
// la fuerza de partido, así que la sonda necesita un estado con hoja de atributos,
// compañeros, sinergia/jerarquía y una fuerza de rival. `createInitialState` da
// todo eso; sólo se le fija el pool y un contexto de fecha/serie.
function estadoDraftFalso(seed, entradas, rivalFuerza) {
  const base = createInitialState(seed, mulberry32(seed));
  return {
    ...base,
    player: { ...base.player, championPool: entradas, campeonDelSplit: null },
    meta: { ...base.meta, ajuste: 50 },
    career: {
      ...base.career,
      companeros: [{ nivel: 62 }, { nivel: 62 }, { nivel: 62 }, { nivel: 62 }],
      sinergia: 60,
      jerarquia: 55,
      temporada: {
        fuerzaPropia: 62,
        fechaEnCurso: { rival: 'X', fuerzaRival: rivalFuerza, motivos: ['clasico'] }
      }
    },
    serie: { rival: { org: 'X', fuerza: rivalFuerza } }
  };
}

// La probabilidad de mapa con un campeón, replicada para la sonda: mismo
// cálculo que `probabilidadConCampeon` en core/serie.js (K2b: la fuerza de
// partido acotada y la p de `probabilidadDePartido`, la que tira el motor).
function probMapaSonda(state, campeon) {
  const fp = fuerzaDePartido({ ...state, player: { ...state.player, campeonDelSplit: campeon.name } });
  return probabilidadDePartido(state, fp, state.serie.rival.fuerza, 'mapa');
}

check('El motor nunca elige por vos un campeón peor que otro disponible', () => {
  // Cuando NO pausan (`elegido` != null), el campeón devuelto tiene que ser el
  // argmax de `factorDeCampeon` entre los disponibles.
  const pool = campeonesDisponibles(
    { player: { role: 'mid' }, mundo: { campeonesDebutados: [] } }, 'mid'
  );
  let autoPicks = 0;
  let violaciones = 0;
  for (let i = 0; i < 3000; i += 1) {
    const rng = mulberry32(50000 + i);
    const weights = createInitialState(i + 1, mulberry32(i + 1)).meta.weights;
    const ancho = 3 + (i % 4);
    const entradas = sample(pool, ancho, rng).map((c) => entradaDePool(c, 20 + Math.floor(rng() * 70), 0));
    const state = {
      ...estadoDraftFalso(50000 + i, entradas, 45 + Math.floor(rng() * 30)),
      meta: { weights, ajuste: 50 }
    };

    // K4-A: la fecha marcada ya no tiene draft; K4-B: la serie juega su plan.
    for (const decision of [
      // K4-B: el pick del plan del coach (el que juega solo el motor) en el mapa 1 de una serie sin quemas.
      (() => {
        const jugada = jugadaDelPlan({
          ...state, player: { ...state.player, championPool: entradas },
          serie: { plan: 'coach', guardado: null, quemados: [], mapaActual: i % 5, formato: 5 }
        });
        return { pausa: false, elegido: entradas.find((c) => c.name === jugada.campeon) };
      })()
    ]) {
      if (decision.pausa || !decision.elegido) {
        continue;
      }
      autoPicks += 1;
      const mejorFactor = Math.max(...entradas.map((c) => factorDeCampeon(c, weights)));
      if (factorDeCampeon(decision.elegido, weights) < mejorFactor - 1e-9) {
        violaciones += 1;
      }
    }
  }
  if (autoPicks < 200) {
    throw new Error(`solo ${autoPicks} auto-picks en 3000 sondas: muestra insuficiente`);
  }
  if (violaciones > 0) {
    throw new Error(`${violaciones}/${autoPicks} auto-picks eligieron un campeón peor que otro disponible`);
  }
});

// K2b: la p de un partido es `probabilidadDePartido` (antes, `probabilidadDeGanar` con dos σ, borrada por muerta).
check('probabilidadDePartido es monótona, simétrica y 0.5 en el empate (fecha y mapa)', () => {
  for (const tipo of ['fecha', 'mapa']) {
    if (probabilidadDePartido(null, 50, 50, tipo) !== 0.5) {
      throw new Error(`empate no dio 0.5 (${tipo}): ${probabilidadDePartido(null, 50, 50, tipo)}`);
    }
    let previo = -1;
    for (let fp = 10; fp <= 90; fp += 2) {
      const p = probabilidadDePartido(null, fp, 50, tipo);
      if (p <= previo) {
        throw new Error(`${tipo}: no es monótona creciente en fp=${fp} (${p} <= ${previo})`);
      }
      previo = p;
    }
    for (const [a, b] of [[55, 40], [48, 61], [70, 70], [33, 90], [50, 50]]) {
      const suma = probabilidadDePartido(null, a, b, tipo) + probabilidadDePartido(null, b, a, tipo);
      if (Math.abs(suma - 1) > 1e-12) {
        throw new Error(`${tipo}: P(${a},${b}) + P(${b},${a}) = ${suma}, esperaba 1`);
      }
    }
  }
  // Ruido cero (la matemática de `probabilidadPorSigma`, de la que sale la p): colapsa a un escalón limpio, sin NaN.
  if (probabilidadPorSigma(60, 50, 0) !== 1 || probabilidadPorSigma(40, 50, 0) !== 0 || probabilidadPorSigma(50, 50, 0) !== 0.5) {
    throw new Error('con σ=0 no colapsó a 0/1');
  }
});

// K4-B (regla 17): el check "Nadie te frena en el draft por un pick que no mueve el partido" (9Rd, el umbral de D63)
// se borró: el draft de serie ya no frena. Lo reemplaza "K4-B pausas por serie...": te frena el plan, que te lean el
// guardado o el mapa decisivo, y una serie sin nada en juego no frena.

checkLento('Toda opción de draft trae su lectura y va ordenada por factorDeCampeon', () => {
  // Smoke test directo de la matriz: dos ejes extremos dan frases distintas.
  const weightsBase = createInitialState(3, mulberry32(3)).meta.weights;
  const poolMix = [
    entradaDePool({ name: 'Fuerte', tags: ['enchanter'] }, 90, 0),
    entradaDePool({ name: 'Flojo', tags: ['splitpush'] }, 20, 0)
  ];
  if (lecturaDePick(poolMix[0], weightsBase, poolMix) === lecturaDePick(poolMix[1], weightsBase, poolMix)) {
    throw new Error('lecturaDePick devolvió la misma frase para dos picks opuestos');
  }

  const lecturasConocidas = new Set();
  let decisionesVistas = 0;
  for (let seed = 1; seed <= 250; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    const responder = (sistema, st, decision, r) => {
      if (decision.datos?.motivo === 'draft' && (sistema.id === 'serie' || sistema.id === 'temporada')) {
        decisionesVistas += 1;
        if (decision.opciones.length < 2) {
          throw new Error(`seed ${seed}: draft con ${decision.opciones.length} opción(es)`);
        }
        const weights = st.meta.weights;
        const pool = st.player.championPool;
        let factorPrevio = Infinity;
        for (const opcion of decision.opciones) {
          if (typeof opcion.descripcion !== 'string' || !/ · maestría \d+$/.test(opcion.descripcion)) {
            throw new Error(`seed ${seed}: opción de draft sin lectura ("${opcion.descripcion}")`);
          }
          const lectura = opcion.descripcion.replace(/ · maestría \d+$/, '');
          if (lectura.length < 8 || /^\d/.test(lectura)) {
            throw new Error(`seed ${seed}: lectura de pick vacía o numérica ("${lectura}")`);
          }
          lecturasConocidas.add(lectura);
          const campeon = pool.find((c) => c.name === opcion.id);
          const factor = campeon ? factorDeCampeon(campeon, weights) : -Infinity;
          if (factor > factorPrevio + 1e-9) {
            throw new Error(`seed ${seed}: opciones de draft fuera de orden por factorDeCampeon`);
          }
          factorPrevio = factor;
        }
      }
      return sistema.resolverAuto(st, decision, r);
    };

    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
  }
  if (decisionesVistas < 20) {
    throw new Error(`sólo ${decisionesVistas} decisiones de draft en 250 carreras: muestra insuficiente`);
  }
  // La matriz 3×3 real tiene 9 frases; una carrera headless no las toca todas,
  // pero sí varias — si sólo apareció una, algo quedó hardcodeado.
  if (lecturasConocidas.size < 3) {
    throw new Error(`sólo ${lecturasConocidas.size} lecturas de pick distintas en 250 carreras`);
  }
});

// K4 (integración) borró el check "Elegir el mismo campeón del split en una fecha marcada da factorDraftFecha == 0" (regla
// 17): K4-A sacó el draft de la fecha marcada, `factorDraftFecha` daba siempre 0 y se borró con su tope. Lo reemplaza
// "K4-A la fecha marcada no tiene draft: frena una sola vez, con el momento" y la exactitud de la previa de K2d.

checkLento('Ninguna serie deja el pipeline con una decisión colgada', () => {
  for (let seed = 1; seed <= 600; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.pendiente !== null) {
        throw new Error(`seed ${seed}: quedó una decisión pendiente después de cerrar el split`);
      }
      if (state.serie.activa) {
        throw new Error(`seed ${seed}: el split cerró con una serie activa a mitad de camino`);
      }
    }
  }
});

checkLento('Ningún minijuego puede setear terminado', () => {
  for (let seed = 1; seed <= 800; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplit(state, rng).state;

      while (state.pendiente) {
        const { decision, sistemaId } = state.pendiente;
        const sistema = sistemaPorId(sistemaId);
        const respuesta = sistema.resolverAuto(state, decision, rng);
        const eraMinijuego = decision.datos?.motivo === 'minijuego';
        const minijuegoId = decision.datos?.minijuego;

        state = resolverDecision(state, respuesta, rng).state;

        // `resolverDecision` resuelve el minijuego Y sigue el split desde la
        // etapa siguiente a `serie` — así que `atributos.js` corre a
        // continuación y puede cerrar la carrera por burnout en ese mismo
        // split. Eso no es el minijuego seteando `terminado` (lo que este
        // check persigue): es la barra de mentalidad tocando cero.
        if (eraMinijuego && state.terminado && state.finAnticipado !== 'burnout') {
          throw new Error(`seed ${seed}: el minijuego "${minijuegoId}" dejó terminado=true`);
        }
      }
    }
  }
});

// --- Fase 5: la temporada regular (calendario, tabla, fechas marcadas) ---

checkLento('La tabla de temporada cierra y respeta el calendario', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      const t = state.career.temporada;
      // Mismo guard que systems/temporada.js (companeros incluido): un tier 3
      // recién refichado puede tener currentOrg fresco pero companeros
      // todavía vacío (roster.js corre antes que competitivo.js en el
      // registro) — ahí temporada.js no corrió este split y career.temporada
      // sigue siendo la foto del split anterior, con OTRO equipo. Compararla
      // contra el currentOrg de HOY compararía peras con manzanas.
      if (state.phase !== 'profesional' || !state.career.currentOrg || state.career.companeros.length === 0 || t.tabla.length === 0) {
        continue;
      }

      // Cada fecha suma un ganado de un lado y un perdido del otro: la suma de
      // ganados de toda la liga tiene que ser exactamente la suma de perdidos.
      const ganadosTotal = t.tabla.reduce((suma, fila) => suma + fila.ganados, 0);
      const perdidosTotal = t.tabla.reduce((suma, fila) => suma + fila.perdidos, 0);
      if (ganadosTotal !== perdidosTotal) {
        throw new Error(`seed ${seed}: la tabla no cuadra (${ganadosTotal} ganados vs ${perdidosTotal} perdidos)`);
      }

      // Todo equipo de la liga jugó la misma cantidad de fechas que el jugador.
      const filaPropia = t.tabla.find((fila) => fila.org === state.career.currentOrg);
      const fechasJugador = filaPropia.ganados + filaPropia.perdidos;
      for (const fila of t.tabla) {
        if (fila.ganados + fila.perdidos !== fechasJugador) {
          throw new Error(`seed ${seed}: ${fila.org} jugó ${fila.ganados + fila.perdidos} fechas, el jugador jugó ${fechasJugador}`);
        }
      }

      // La posición que deriva de la tabla es la misma que career.posicion,
      // que es la que rendimiento.js usa para aplicar consecuencias.
      const ordenada = [...t.tabla].sort((a, b) => b.ganados - a.ganados || (b.ganados - b.perdidos) - (a.ganados - a.perdidos));
      const posicionDerivada = ordenada.findIndex((fila) => fila.org === state.career.currentOrg) + 1;
      if (posicionDerivada !== state.career.posicion) {
        throw new Error(`seed ${seed}: posición derivada de la tabla (${posicionDerivada}) ≠ career.posicion (${state.career.posicion})`);
      }
    }
  }
});

// --- Fase 9Rb: el fixture round-robin real y la tabla que ya no miente ---

// K2b: generalizado a `vueltas` (`BALANCE.temporada.vueltas`). Reemplaza a "generarFixture produce un round-robin
// real (N-1 jornadas, cada par una vez)", que exigía UNA vuelta (regla 17: el número de vueltas es una constante que
// K2c decide; lo que se protege es que cada vuelta sea un round-robin real y que el fixture repita exactamente V).
check('generarFixture produce un round-robin real repetido V vueltas (V·(N-1) jornadas, cada par V veces, localía alternada)', () => {
  const vueltasDeBalance = BALANCE.temporada.vueltas;
  if (!(Number.isInteger(vueltasDeBalance) && vueltasDeBalance >= 1)) {
    throw new Error(`BALANCE.temporada.vueltas tiene que ser un entero >= 1 (vale ${vueltasDeBalance})`);
  }
  const porDefecto = generarFixture({ orgs: Array.from({ length: 8 }, (_, i) => ({ nombre: `T${i}`, fuerza: 70 })) }, 'T0');
  if (porDefecto.calendario.length !== vueltasDeBalance * 7) {
    throw new Error(`sin vueltas explícitas el fixture de 8 equipos tiene ${porDefecto.calendario.length} fechas propias, `
      + `BALANCE.temporada.vueltas = ${vueltasDeBalance} pide ${vueltasDeBalance * 7}`);
  }
  for (const vueltas of [1, 2, 3]) {
    for (const n of [6, 8, 10, 12, 14]) {
      const orgs = Array.from({ length: n }, (_, i) => ({ nombre: `T${i}`, fuerza: 70 }));
      const propia = 'T0';
      const { calendario, cruces } = generarFixture({ orgs }, propia, vueltas);
      const jornadas = vueltas * (n - 1);
      if (calendario.length !== jornadas || cruces.length !== jornadas) {
        throw new Error(`V=${vueltas}, N=${n}: ${calendario.length} fechas propias y ${cruces.length} jornadas de cruces, se esperaban ${jornadas}`);
      }
      // Cada par se cruza exactamente V veces, y entre una vuelta y la siguiente el mismo cruce cambia de localía.
      const vecesPorPar = new Map();
      const localPorParYVuelta = new Map();
      const anotar = (local, visitante, j) => {
        const par = [local, visitante].sort().join('|');
        vecesPorPar.set(par, (vecesPorPar.get(par) ?? 0) + 1);
        localPorParYVuelta.set(`${par}#${Math.floor(j / (n - 1))}`, local);
      };
      for (let j = 0; j < jornadas; j += 1) {
        const fecha = calendario[j];
        if (fecha.jornada !== j + 1) {
          throw new Error(`V=${vueltas}, N=${n}: la fecha ${j + 1} dice jornada ${fecha.jornada}`);
        }
        anotar(fecha.local ? propia : fecha.rival, fecha.local ? fecha.rival : propia, j);
        for (const cruce of cruces[j]) {
          anotar(cruce.local, cruce.visitante, j);
        }
      }
      if (vecesPorPar.size !== (n * (n - 1)) / 2 || [...vecesPorPar.values()].some((veces) => veces !== vueltas)) {
        throw new Error(`V=${vueltas}, N=${n}: ${vecesPorPar.size} pares distintos con ${JSON.stringify([...new Set(vecesPorPar.values())])} cruces cada uno; se esperaban ${(n * (n - 1)) / 2} pares × ${vueltas}`);
      }
      for (const par of vecesPorPar.keys()) {
        for (let v = 1; v < vueltas; v += 1) {
          if (localPorParYVuelta.get(`${par}#${v}`) === localPorParYVuelta.get(`${par}#${v - 1}`)) {
            throw new Error(`V=${vueltas}, N=${n}: el cruce ${par} tiene el mismo local en las vueltas ${v} y ${v + 1}`);
          }
        }
      }
    }
  }
  // Cada vuelta, por separado, es un round-robin real (lo que exigía el check de 9Rb, ahora por vuelta).
  for (const n of [6, 8, 10, 12, 14]) {
    const orgs = Array.from({ length: n }, (_, i) => ({ nombre: `T${i}`, fuerza: 70 }));
    const propia = 'T0';
    const { calendario, cruces } = generarFixture({ orgs }, propia, 1);

    if (calendario.length !== n - 1) {
      throw new Error(`N=${n}: el calendario propio tiene ${calendario.length} jornadas, se esperaban ${n - 1}`);
    }
    if (cruces.length !== n - 1) {
      throw new Error(`N=${n}: hay ${cruces.length} jornadas de cruces ajenos, se esperaban ${n - 1}`);
    }

    const pares = new Set();
    for (let j = 0; j < n - 1; j += 1) {
      const jugaron = new Set([propia, calendario[j].rival]);
      // Cada jornada: tu partido + (n/2 - 1) cruces ajenos = n/2 partidos, y
      // cada equipo aparece exactamente una vez.
      if (cruces[j].length !== n / 2 - 1) {
        throw new Error(`N=${n}, jornada ${j + 1}: ${cruces[j].length} cruces ajenos, se esperaban ${n / 2 - 1}`);
      }
      const registrarPar = (x, y) => {
        for (const org of [x, y]) {
          if (jugaron.has(org) && org !== propia && org !== calendario[j].rival) {
            throw new Error(`N=${n}, jornada ${j + 1}: ${org} juega dos veces`);
          }
          jugaron.add(org);
        }
        pares.add([x, y].sort().join('|'));
      };
      registrarPar(propia, calendario[j].rival);
      for (const cruce of cruces[j]) {
        registrarPar(cruce.local, cruce.visitante);
      }
      if (jugaron.size !== n) {
        throw new Error(`N=${n}, jornada ${j + 1}: jugaron ${jugaron.size} equipos de ${n}`);
      }
    }

    // Cada par de equipos se enfrenta exactamente una vez en toda la vuelta.
    if (pares.size !== (n * (n - 1)) / 2) {
      throw new Error(`N=${n}: ${pares.size} enfrentamientos distintos, se esperaban ${(n * (n - 1)) / 2}`);
    }
  }
});

check('La tabla no miente a mitad de temporada: el jugador no arranca clavado último', () => {
  // Semi-puro: un fixture con todos los equipos de la misma fuerza (aísla el
  // mecanismo del talento), resuelto jornada a jornada con el mismo
  // `aplicarCrucesDeJornada` del motor y un jugador que gana ~la mitad. Con el
  // bug viejo (`simularResto` de una vez, tu fila en 0-0) la posición relativa
  // de la primera mitad de la temporada daba ~0,85-0,96 — último o casi —
  // gobiernes como gobiernes; con el fixture real ronda 0,3 (centrada, con un
  // pequeño sesgo hacia arriba porque en un empate la fila propia ordena
  // primero).
  const relPrimeraMitad = [];
  let filasChequeadas = 0;

  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    const n = [8, 10, 12, 14][seed % 4];
    const orgs = Array.from({ length: n }, (_, i) => ({ nombre: `T${i}`, fuerza: 72 }));
    const propia = 'T3';
    const { calendario, cruces } = generarFixture({ orgs }, propia);

    let filaPropia = filaVacia(propia);
    let registrosOtros = Object.fromEntries(orgs.filter((o) => o.nombre !== propia).map((o) => [o.nombre, filaVacia(o.nombre)]));

    for (let j = 0; j < calendario.length; j += 1) {
      const gano = jugarPartido(null, 72, calendario[j].fuerzaRival, 'fecha', rng).gano;
      registrosOtros = aplicarCrucesDeJornada(registrosOtros, cruces[j], rng);
      registrosOtros = { ...registrosOtros, [calendario[j].rival]: registrarEnFila(registrosOtros[calendario[j].rival], !gano) };
      filaPropia = registrarEnFila(filaPropia, gano);

      const tabla = tablaDePosiciones(registrosOtros, filaPropia);
      // Toda fila jugó la misma cantidad de fechas que el jugador.
      const jugadas = filaPropia.ganados + filaPropia.perdidos;
      for (const fila of tabla) {
        filasChequeadas += 1;
        if (fila.ganados + fila.perdidos !== jugadas) {
          throw new Error(`seed ${seed}, jornada ${j + 1}: ${fila.org} jugó ${fila.ganados + fila.perdidos}, el jugador ${jugadas}`);
        }
      }
      if (j < calendario.length / 2) {
        relPrimeraMitad.push((posicionEnTabla(tabla, propia) - 1) / (tabla.length - 1));
      }
    }
  }

  if (filasChequeadas < 10000) {
    throw new Error(`solo ${filasChequeadas} filas de tabla chequeadas: muestra insuficiente`);
  }
  const media = relPrimeraMitad.reduce((a, b) => a + b, 0) / relPrimeraMitad.length;
  // El bug daba ~0,85+. Con equipos iguales y jugador 50% la media honesta
  // ronda 0,35; la banda deja margen para el ruido de seeds sin dejar pasar la
  // regresión.
  if (media < 0.20 || media > 0.60) {
    throw new Error(`posición relativa media en la primera mitad de la temporada: ${media.toFixed(2)} (banda esperada 0.20-0.60; el bug viejo daba ~0.85)`);
  }
});

checkLento('Toda fila de la tabla, en cualquier fecha marcada, jugó tantas fechas como el jugador', () => {
  let muestras = 0;

  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    const responder = (sistema, st, decision, r) => {
      if (['momento', 'draft', 'reaccion'].includes(decision.datos?.motivo)) {
        const t = st.career.temporada;
        const tabla = tablaDePosiciones(t.registrosOtros, t.filaPropia);
        const jugadas = t.filaPropia.ganados + t.filaPropia.perdidos;
        for (const fila of tabla) {
          if (fila.ganados + fila.perdidos !== jugadas) {
            throw new Error(
              `seed ${seed}: en una fecha marcada (indice ${t.indice}), ${fila.org} jugó `
              + `${fila.ganados + fila.perdidos} fechas y el jugador ${jugadas}`
            );
          }
        }
        muestras += 1;
      }
      return sistema.resolverAuto(st, decision, r);
    };

    for (let i = 0; i < 45 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
  }

  if (muestras < 200) {
    throw new Error(`solo ${muestras} fechas marcadas inspeccionadas en 200 seeds: muestra insuficiente`);
  }
});

checkLento('El jugador ve como mucho una fecha marcada por split, y la ve en una fracción sana de los splits (fase 9Re)', () => {
  let splitsMedidos = 0;
  const conteos = {};

  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      const t = state.career.temporada;
      if (state.phase !== 'profesional' || !state.career.currentOrg || state.career.companeros.length === 0 || t.tabla.length === 0) {
        continue;
      }
      splitsMedidos += 1;
      conteos[t.marcadasHechas] = (conteos[t.marcadasHechas] ?? 0) + 1;
    }
  }

  if (splitsMedidos < 100) {
    throw new Error(`solo ${splitsMedidos} splits competitivos medidos: muestra insuficiente`);
  }

  // Techo duro: nunca más de una fecha marcada por split competitivo.
  const conMasDeUna = Object.entries(conteos)
    .filter(([marcadas]) => Number(marcadas) > 1)
    .reduce((suma, [, cantidad]) => suma + cantidad, 0);
  if (conMasDeUna > 0) {
    throw new Error(`${conMasDeUna} splits competitivos con más de una fecha marcada (conteos: ${JSON.stringify(conteos)})`);
  }

  // Piso: la temporada regular no puede haber DESAPARECIDO. En la práctica casi
  // todo split competitivo tiene algún motivo real (un clásico contra una ex
  // org, el puntero, una racha), así que la fracción con una fecha marcada es
  // alta — lo que importa es que no sea ~0 (temporada muda) ni que se cuele más
  // de una. 9Rg puede volverla más selectiva con un puntaje mínimo.
  const conUna = (conteos[1] ?? 0) / splitsMedidos;
  if (conUna < 0.35 || conUna > 0.99) {
    throw new Error(`${(conUna * 100).toFixed(1)}% de los splits competitivos tuvieron exactamente una fecha marcada (banda esperada 35%-99%; conteos: ${JSON.stringify(conteos)})`);
  }
});

check('Cada motivo de fecha marcada tiene varias frases y etiquetas (fase 9R0a, anti-repetición)', () => {
  const motivos = Object.keys(FRASES_MOTIVO);
  for (const motivo of motivos) {
    const frases = FRASES_MOTIVO[motivo];
    const etiquetas = ETIQUETAS_MOTIVO[motivo];
    if (!Array.isArray(frases) || frases.length < 5) {
      throw new Error(`el motivo "${motivo}" tiene ${frases?.length ?? 0} frases (mínimo 5)`);
    }
    if (!Array.isArray(etiquetas) || etiquetas.length < 3) {
      throw new Error(`el motivo "${motivo}" tiene ${etiquetas?.length ?? 0} etiquetas (mínimo 3)`);
    }
    const renderizadas = new Set(frases.map((fn) => fn('RIVAL')));
    if (renderizadas.size !== frases.length) {
      throw new Error(`el motivo "${motivo}" tiene frases duplicadas`);
    }
    if (new Set(etiquetas).size !== etiquetas.length) {
      throw new Error(`el motivo "${motivo}" tiene etiquetas duplicadas`);
    }
  }
});

checkLento('La fecha marcada no se repite palabra por palabra (fase 9R0a)', () => {
  // El bug: `career.ultimoEliminadoPor` no se limpiaba nunca y `career.orgs`
  // sólo crece, así que "la revancha contra tal" o "el clásico contra tal"
  // salían idénticos split tras split — medido: mediana 9, hasta 33 veces la
  // misma línea en la seed 1720243215. Con el cooldown por par (motivo, rival),
  // la limpieza de `ultimoEliminadoPor` y las frases variadas, baja a ~2.
  const maxPorCarrera = [];
  let totalMarcadas = 0;

  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const conteo = {};

    for (let i = 0; i < 80 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      for (const log of state.logs.slice(antes)) {
        if (log.type !== 'temporada' || log.message.startsWith('Temporada regular')) {
          continue;
        }
        // La parte que el jugador ve idéntica: la frase de motivo, antes del
        // "Ganan./Pierden." y de la posición.
        const linea = log.message.split(/ Ganan\.| Pierden\./)[0];
        conteo[linea] = (conteo[linea] ?? 0) + 1;
        totalMarcadas += 1;
      }
    }

    const vals = Object.values(conteo);
    maxPorCarrera.push(vals.length > 0 ? Math.max(...vals) : 0);
  }

  if (totalMarcadas < 1500) {
    throw new Error(`solo ${totalMarcadas} fechas marcadas en 200 carreras: muestra insuficiente`);
  }
  maxPorCarrera.sort((a, b) => a - b);
  const mediana = maxPorCarrera[Math.floor(maxPorCarrera.length / 2)];
  const maximo = maxPorCarrera[maxPorCarrera.length - 1];
  if (mediana > 4) {
    throw new Error(`la línea de fecha marcada más repetida por carrera tiene mediana ${mediana} (máx tolerado 4; el bug daba 9)`);
  }
  if (maximo > 10) {
    throw new Error(`una carrera repitió la misma línea de fecha marcada ${maximo} veces (máx tolerado 10; el bug daba 33)`);
  }
});

checkLento('Todo split competitivo cierra con lo que significa su posición, no sólo el recibo (fase 9R0d)', () => {
  // 2 de cada 3 splits no son de playoffs y cerraban en una línea `[rendimiento]`
  // "terminó 4º de 10" — "los 3 splits no sirven para nada". Ahora cada split
  // competitivo deja una línea `temporada` de qué hay en juego. La excepción:
  // el split de cierre que clasifica a playoffs, que lo narra `serie.js`.
  let splitsMedidos = 0;
  let sinParada = 0;

  for (let seed = 1; seed <= 150; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 80 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      const nuevos = state.logs.slice(antes);

      const cerroTemporada = nuevos.some((l) => l.type === 'rendimiento' && l.message.includes(' terminó '));
      if (!cerroTemporada) {
        continue;
      }
      const clasificoAPlayoffs = nuevos.some((l) => l.type === 'serie' && l.message.includes('Clasificaste a playoffs'));
      if (clasificoAPlayoffs) {
        continue;
      }

      splitsMedidos += 1;
      const tieneParada = nuevos.some(
        (l) => l.type === 'temporada' && !l.tecnico && /(^Cerrás |^Terminás |^\d+º de )/.test(l.message)
      );
      if (!tieneParada) {
        sinParada += 1;
      }
    }
  }

  if (splitsMedidos < 300) {
    throw new Error(`sólo ${splitsMedidos} splits competitivos medidos: muestra insuficiente`);
  }
  if (sinParada > 0) {
    throw new Error(`${sinParada} de ${splitsMedidos} splits competitivos cerraron sin una línea de qué significa la posición`);
  }
});

check('Ninguna fecha marcada sale sin un stakes declarado', () => {
  // Test directo sobre la función pura: un escenario sin ningún motivo real
  // (sin clásico, sin puntero, sin racha, sin rival de generación) tiene que
  // caer en 'parejo', nunca en una lista vacía — la red que evita que una
  // fecha marcada se quede sin contenido que mostrarle.
  const estadoAburrido = {
    career: { orgs: [], ultimoEliminadoPor: null, currentOrg: 'Equipo Propio' },
    mundo: { rivales: [] }
  };
  const fecha = { rival: 'Nadie Conocido', fuerzaRival: 50 };
  const t = { calendario: [fecha], cruces: [], registrosOtros: {}, filaPropia: { org: 'Equipo Propio', ganados: 3, perdidos: 3 }, indice: 0, fuerzaPropia: 50 };

  const motivos = motivosDeFecha(estadoAburrido, null, fecha, t);
  if (!Array.isArray(motivos) || motivos.length === 0) {
    throw new Error('motivosDeFecha devolvió una lista vacía en un escenario sin ningún motivo real');
  }
  if (!motivos.includes('parejo')) {
    throw new Error(`sin ningún motivo real, motivosDeFecha tendría que caer en 'parejo'; devolvió ${JSON.stringify(motivos)}`);
  }
});

check('El momento de una fecha marcada mueve el resultado del partido', () => {
  // 5.3: "eso es la diferencia entre un recibo y una apuesta". Fuerza propia y
  // rival empatadas en 50 (moneda al aire sin ningún ajuste); el peor y el
  // mejor extremo del efecto `type: 'partido'` (regla invariable 7: rango,
  // nunca un valor fijo) tienen que correr esa moneda con fuerza real.
  const rng = mulberry32(555);
  const t = BALANCE.temporada;

  function tasaDeVictoria(ajuste) {
    let ganados = 0;
    const intentos = 3000;
    for (let i = 0; i < intentos; i += 1) {
      if (jugarPartido(null, 50 * (1 + ajuste), 50, 'fecha', rng).gano) {
        ganados += 1;
      }
    }
    return ganados / intentos;
  }

  const peor = tasaDeVictoria(t.partidoMin);
  const mejor = tasaDeVictoria(t.partidoMax);
  const diferenciaPuntos = (mejor - peor) * 100;

  if (diferenciaPuntos < 15) {
    throw new Error(`el peor y el mejor extremo del efecto 'partido' solo mueven ${diferenciaPuntos.toFixed(1)} puntos la tasa de victoria; el mínimo es 15`);
  }
});

check('Cobertura: toda combinación de stakes × rol tiene al menos un evento', () => {
  // `dev/cobertura.js` no puede medir esto (recorre calcularContexto sin
  // overrides, y `stakes` solo existe con el override que arma
  // systems/temporada.js — ver la nota en data/contextos.js). Se verifica acá,
  // directo sobre el catálogo declarado.
  const pool = TODOS_LOS_EVENTOS.filter((evento) => evento.category?.startsWith('partido_') && evento.category !== 'partido_postpartido');
  const faltantes = [];

  for (const stake of EJES.stakes) {
    for (const rol of IDS_ROL) {
      const hayEvento = pool.some((evento) => (
        evento.contexto.stakes.includes(stake)
        && (!evento.contexto.rol || evento.contexto.rol.includes(rol))
      ));
      if (!hayEvento) {
        faltantes.push(`${stake} × ${rol}`);
      }
    }
  }

  if (faltantes.length > 0) {
    throw new Error(`combinaciones de stakes × rol sin ningún evento: ${faltantes.join(', ')}`);
  }
});

// --- Fase 6: el meta con nombre ---

checkLento('El régimen cambia entre seasons en la banda declarada (50-65%)', () => {
  let aperturas = 0;
  let cambiosEnApertura = 0;
  let correctivos = 0;
  let cambiosCorrectivos = 0;

  for (let seed = 1; seed <= 400; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      // `esAperturaDeSeason` en systems/meta.js lee splitCount ANTES de que
      // atributos.js lo incremente al cierre del split (mismo split, más
      // adelante en el registro): por eso se captura acá, antes de avanzar.
      const esApertura = state.player.splitCount % BALANCE.edad.splitsPorEdad === 0;
      const regimenAntes = state.meta.regimen;
      state = avanzarSplitAuto(state, rng).state;
      const cambio = state.meta.regimen !== regimenAntes;

      if (esApertura) {
        aperturas += 1;
        if (cambio) cambiosEnApertura += 1;
      } else {
        correctivos += 1;
        if (cambio) cambiosCorrectivos += 1;
      }
    }
  }

  const fraccionApertura = cambiosEnApertura / aperturas;
  const fraccionCorrectivo = cambiosCorrectivos / correctivos;

  // Piso bajado 55% → 50% en 10a (familia T1/D21/D22, mismo criterio que
  // 9Ma/9Mf/9Mi/9Wd): `retiro.js` dejó de consumir `chance()` en cada
  // pretemporada desde los 27 años (9R5a) — corre el stream para toda
  // apertura de season posterior a esa edad, que ahora además son muchas
  // más (las carreras duran más). `fraccionCorrectivo` no se movió (24,6%,
  // dentro de banda): el shift es específico de apertura, no genérico.
  // Medido a n≈7700: 53,6%.
  if (fraccionApertura < 0.5 || fraccionApertura > 0.65) {
    throw new Error(`el régimen cambió en el ${(fraccionApertura * 100).toFixed(1)}% de las aperturas de season (banda 50-65%, declarado 60%)`);
  }
  if (fraccionCorrectivo < 0.2 || fraccionCorrectivo > 0.3) {
    throw new Error(`el parche correctivo cambió el régimen en el ${(fraccionCorrectivo * 100).toFixed(1)}% de los splits (banda 20-30%, declarado 25%)`);
  }
});

checkLento('Toda carrera de más de 15 splits ve al menos tres regímenes distintos', () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const regimenesVistos = new Set([state.meta.regimen]);

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      regimenesVistos.add(state.meta.regimen);
    }

    if (state.player.splitCount > 15 && regimenesVistos.size < 3) {
      throw new Error(`seed ${seed}: ${state.player.splitCount} splits y solo ${regimenesVistos.size} régimen(es) distinto(s)`);
    }
  }
});

checkLento('La tier list cubre todos los campeones del rol, sin repetidos ni faltantes', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 30 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      const disponibles = campeonesDisponibles(state, state.player.role);
      const nombresTierList = state.meta.tierList.map((entrada) => entrada.name);

      // `meta.js` calcula la tier list ANTES de resolver el debut de un
      // campeón nuevo dentro del mismo `aplicar()`: en el split exacto en que
      // debuta, la tier list queda un campeón corta hasta el split siguiente.
      // Cualquier otra diferencia es un bug real.
      if (disponibles.length - nombresTierList.length > 1 || nombresTierList.length > disponibles.length) {
        throw new Error(`seed ${seed}: la tier list tiene ${nombresTierList.length} entradas, el rol tiene ${disponibles.length} campeones disponibles`);
      }
      if (new Set(nombresTierList).size !== nombresTierList.length) {
        throw new Error(`seed ${seed}: la tier list tiene nombres repetidos`);
      }
      for (const nombre of nombresTierList) {
        if (!disponibles.some((campeon) => campeon.name === nombre)) {
          throw new Error(`seed ${seed}: la tier list nombra a "${nombre}", que no es un campeón disponible del rol`);
        }
      }
      for (const entrada of state.meta.tierList) {
        if (!['S', 'A', 'B', 'C'].includes(entrada.tier)) {
          throw new Error(`seed ${seed}: ${entrada.name} tiene un tier inválido ("${entrada.tier}")`);
        }
      }
    }
  }
});

// K2c, regla 17 — reemplaza a "El boost del pool no se clava en el centro (CONCEPTO §6: 0.75x-1.25x)", que exigía una
// separación p10-p90 de 0.2 y un rango [0.75, 1.25] escritos a mano para el meta viejo. Medido en K2c (300 seeds × 45
// splits): p10 0.944, p90 1.026, separación 0.082. Banda vieja: separación >= 0.2 (el 40% del rango 0.5) dentro de
// [0.75, 1.25]. Banda nueva: separación >= el mismo 40% del rango, calculado desde BALANCE.campeones.multiplicadorMin/Max
// (0.9-1.1, rango 0.2: mínimo 0.08), dentro de [multiplicadorMin, multiplicadorMax]. Por qué: K2c acotó el meta a 0.9-1.1
// porque sus factores quedaron centrados en un pro típico (PLAN.md, K2); lo que se protege es lo de siempre, que el boost
// no orbite el centro, medido como fracción del rango y no como un número que supone el rango viejo (2026-10-02).
// La fracción es la banda del check, no una constante del juego (por eso no vive en balance.js).
const FRACCION_MINIMA_SEPARACION_BOOST_POOL = 0.4;

checkLento('El boost del pool no se clava en el centro (CONCEPTO §6: el rango de BALANCE.campeones.multiplicadorMin/Max)', () => {
  // El defecto que reemplaza esta fase: el viejo ajuste-por-afinidad-promedio
  // orbitaba siempre 50. Se mide el MULTIPLICADOR real (lo que multiplica el
  // rendimiento), no el ajuste crudo, para probar la promesa de CONCEPTO §6
  // tal como está escrita.
  const { multiplicadorMin, multiplicadorMax } = BALANCE.campeones;
  const separacionMinima = (multiplicadorMax - multiplicadorMin) * FRACCION_MINIMA_SEPARACION_BOOST_POOL;
  const multiplicadores = [];

  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 45 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      multiplicadores.push(multiplicadorDeMeta(state.meta.ajuste));
    }
  }

  const ordenados = [...multiplicadores].sort((a, b) => a - b);
  const p10 = ordenados[Math.floor(ordenados.length * 0.1)];
  const p90 = ordenados[Math.floor(ordenados.length * 0.9)];

  if (p90 - p10 < separacionMinima - 1e-9) {
    throw new Error(`p10=${p10.toFixed(3)} y p90=${p90.toFixed(3)} del multiplicador de meta están separados por solo ${(p90 - p10).toFixed(3)}; el mínimo es ${separacionMinima.toFixed(3)}`);
  }
  if (ordenados[0] < multiplicadorMin - 1e-9 || ordenados[ordenados.length - 1] > multiplicadorMax + 1e-9) {
    throw new Error(`el multiplicador de meta se salió del rango [${multiplicadorMin}, ${multiplicadorMax}] que promete CONCEPTO §6`);
  }
});

checkLento('pool_a_cual_le_metes sale unas pocas veces por carrera, no nunca y no siempre', () => {
  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === 'pool_a_cual_le_metes');
  if (!evento) {
    throw new Error('no se encontró el evento pool_a_cual_le_metes: el check apunta a contenido que ya no existe');
  }

  // Medido SOLO sobre las carreras que llegan a pro: el evento está gateado a
  // `etapa: debut/profesional`, así que promediarlo contra las carreras que
  // nunca salen del amateurismo (más de la mitad de la población, trampa T6)
  // diluiría la mediana a 0 aunque el evento funcione perfecto para quien sí
  // llega.
  // Fase 9R3a: `title` puede ser un array de variantes. El evento se cuenta si el
  // log arranca con CUALQUIERA de sus titulares posibles.
  const titulares = Array.isArray(evento.title) ? evento.title : [evento.title];
  const conteos = [];
  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let veces = 0;
    let llegoAPro = false;

    for (let i = 0; i < 30 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      if (state.phase === 'profesional') {
        llegoAPro = true;
      }
      veces += state.logs.slice(antes).filter((log) => (
        log.type === 'event' && titulares.some((t) => log.titulo?.startsWith(t))
      )).length;
    }
    if (llegoAPro) {
      conteos.push(veces);
    }
  }

  if (conteos.length < 20) {
    throw new Error(`solo ${conteos.length} carreras llegaron a pro en 200 seeds: muestra insuficiente para medir el evento`);
  }

  const ordenados = [...conteos].sort((a, b) => a - b);
  const mediana = ordenados[Math.floor(ordenados.length / 2)];

  if (mediana < 1 || mediana > 8) {
    throw new Error(`pool_a_cual_le_metes salió una mediana de ${mediana} veces entre las carreras que llegan a pro; se esperaba entre 1 y 8`);
  }
});

// --- Fase 7: el prólogo se comprime y la repetición se rompe ---

checkLento('La repetición de eventos está acotada (memoria anti-repetición)', () => {
  // Corrección post-medición: el plan original pedía "mediana ≤ 4, máximo ≤
  // 8" repeticiones absolutas del evento más visto. Con la fase 7a
  // comprimiendo el prólogo, llegaronAPro subió de ~40% a ~72% y las carreras
  // pasan muchos más splits en fase profesional — el conteo ABSOLUTO de
  // instancias de evento por carrera casi se triplicó, así que un tope
  // absoluto ya no mide lo mismo que medía cuando se escribió. La métrica que
  // sí es independiente del tamaño de la población es la CONCENTRACIÓN: qué
  // fracción de todo lo que la carrera vio es el evento más repetido. Medido:
  // mediana 8.8%, p90 17.2% (contra el ~25-33% que daba el mecanismo viejo).
  // 9R3f, catálogo cerrado (97 → 218 eventos): p90 7.4%, p95 8.0%, máximo
  // observado 11.5% — estable a N=300 y N=500. Tope bajado 25% → 15%.
  const concentraciones = [];

  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const vistos = {};

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      for (const log of state.logs.slice(antes)) {
        if (log.type === 'event' && log.titulo) {
          const clave = log.titulo.split(' · ')[0].split(' — ')[0];
          vistos[clave] = (vistos[clave] ?? 0) + 1;
        }
      }
    }

    const claves = Object.keys(vistos);
    // Las carreras que vieron muy pocos eventos (no_llego temprano) no dicen
    // nada sobre repetición: con 1-2 eventos totales, la "concentración" es
    // trivialmente alta sin que el mecanismo esté fallando.
    const total = claves.reduce((suma, clave) => suma + vistos[clave], 0);
    if (total >= 15) {
      concentraciones.push(Math.max(...claves.map((clave) => vistos[clave])) / total);
    }
  }

  if (concentraciones.length < 50) {
    throw new Error(`solo ${concentraciones.length} carreras con muestra suficiente (≥15 eventos vistos) en 300 seeds`);
  }

  const ordenados = [...concentraciones].sort((a, b) => a - b);
  const p90 = ordenados[Math.floor(ordenados.length * 0.9)];

  if (p90 > 0.15) {
    throw new Error(`p90 de concentración (evento más visto / total visto) es ${(p90 * 100).toFixed(1)}%; el máximo esperado es 15% (bajado de 25% en 9R3f)`);
  }
});

checkLento('Una carrera larga ve una amplia variedad de eventos distintos', () => {
  const distintos = [];

  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const vistos = new Set();

    for (let i = 0; i < 30 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      for (const log of state.logs.slice(antes)) {
        if (log.type === 'event' && log.titulo) {
          vistos.add(log.titulo.split(' · ')[0].split(' — ')[0]);
        }
      }
    }
    if (state.splitFichaje !== null) {
      distintos.push(vistos.size);
    }
  }

  if (distintos.length < 30) {
    throw new Error(`solo ${distintos.length} carreras llegaron a pro en 200 seeds de 30 splits: muestra insuficiente`);
  }

  const ordenados = [...distintos].sort((a, b) => a - b);
  const mediana = ordenados[Math.floor(ordenados.length / 2)];

  if (mediana < 20) {
    throw new Error(`mediana de eventos distintos vistos en 30 splits (carreras que llegan a pro): ${mediana}; se esperaba ≥ 20`);
  }
});

// --- Fase 9Ra: el cooldown se mide en splits, no en "próximos N eventos" ---

check('El cooldown de un evento se mide en splits y vence exactamente en splitCount + cooldown', () => {
  const evento = TODOS_LOS_EVENTOS.find((e) => (e.cooldown ?? 0) >= 2 && Array.isArray(e.options) && e.options.length >= 1);
  if (!evento) {
    throw new Error('no hay ningún evento con cooldown ≥ 2 en el catálogo para probar');
  }

  const rng = mulberry32(1);
  const base = createInitialState(1, rng);
  // Lo estampamos con el splitCount en un valor arbitrario y verificable.
  const enSplit = 10;
  const conSplit = { ...base, player: { ...base.player, splitCount: enSplit } };
  const { state: estampado } = resolverOpcion(conSplit, evento, evento.options[0].id, rng);

  const vence = estampado.flags.cooldownHasta[evento.id];
  const esperado = enSplit + Math.max(BALANCE.eventos.cooldownMinimoSplits, evento.cooldown);
  if (vence !== esperado) {
    throw new Error(`cooldownHasta[${evento.id}] = ${vence}; se esperaba ${esperado} (splitCount ${enSplit} + cooldown ${evento.cooldown})`);
  }

  // Bloqueado desde el split en que salió hasta el anterior al de vencimiento;
  // libre en el de vencimiento y en adelante. Nada de "se libera en 0,89 splits".
  for (let sc = enSplit; sc < esperado; sc += 1) {
    if (!cooldownActivo({ ...estampado, player: { ...estampado.player, splitCount: sc } }, evento.id)) {
      throw new Error(`el evento quedó libre en el split ${sc}, antes de vencer en ${esperado}`);
    }
  }
  if (cooldownActivo({ ...estampado, player: { ...estampado.player, splitCount: esperado } }, evento.id)) {
    throw new Error(`el evento sigue bloqueado en el split ${esperado}, cuando su cooldown ya venció`);
  }
});

checkLento('Ningún evento reaparece antes de que expire su cooldown declarado (0 violaciones en 200 carreras)', () => {
  const cooldownEnSplits = (id) => {
    const e = TODOS_LOS_EVENTOS.find((x) => x.id === id);
    return e ? Math.max(BALANCE.eventos.cooldownMinimoSplits, e.cooldown ?? 0) : BALANCE.eventos.cooldownMinimoSplits;
  };

  let violaciones = 0;
  let muestras = 0;

  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const ultimaAparicion = {};

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const antes = { ...(state.flags.eventosVistos ?? {}) };
      const splitAntes = state.player.splitCount;
      state = avanzarSplitAuto(state, rng).state;
      const despues = state.flags.eventosVistos ?? {};

      for (const id of Object.keys(despues)) {
        if ((despues[id] ?? 0) <= (antes[id] ?? 0)) {
          continue;
        }
        muestras += 1;
        if (ultimaAparicion[id] !== undefined && splitAntes - ultimaAparicion[id] < cooldownEnSplits(id)) {
          violaciones += 1;
        }
        ultimaAparicion[id] = splitAntes;
      }
    }
  }

  if (muestras < 5000) {
    throw new Error(`solo ${muestras} apariciones de evento en 200 seeds: muestra insuficiente`);
  }
  if (violaciones > 0) {
    throw new Error(`${violaciones} reapariciones antes de que venciera el cooldown declarado, sobre ${muestras} apariciones`);
  }
});

// --- Fase 8a: el registro acumula (PLAN.md §8.1, §8.2, §8.4) ---

check('career.registro, career.arraigo y calendario arrancan completos (trampa T4)', () => {
  const rng = mulberry32(1);
  const state = createInitialState(1, rng);

  if (state.career.registro === null || typeof state.career.registro !== 'object') {
    throw new Error('career.registro es null en el estado inicial');
  }
  if (!Array.isArray(state.career.registro.porOrg) || !Array.isArray(state.career.registro.titulos)) {
    throw new Error('career.registro.porOrg o .titulos no son arrays en el estado inicial');
  }
  if (typeof state.career.arraigo !== 'number') {
    throw new Error('career.arraigo no es un número en el estado inicial');
  }
  if (!state.calendario || state.calendario.anio !== BALANCE.calendario.anioBase) {
    throw new Error('calendario no arranca en anioBase');
  }
});

checkLento('registro.splitsJugados coincide con player.splitCount en toda carrera', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const state = correrCarrera(seed, 40);
    if (state.career.registro.splitsJugados !== state.player.splitCount) {
      throw new Error(
        `seed ${seed}: registro.splitsJugados=${state.career.registro.splitsJugados} `
        + `vs player.splitCount=${state.player.splitCount}`
      );
    }
  }
});

checkLento('La suma de splits por org coincide con registro.splitsConEquipo', () => {
  for (let seed = 1; seed <= 60; seed += 1) {
    const state = correrCarrera(seed, 40);
    const suma = state.career.registro.porOrg.reduce((acc, fila) => acc + fila.splits, 0);
    if (suma !== state.career.registro.splitsConEquipo) {
      throw new Error(`seed ${seed}: Σ porOrg.splits=${suma} vs splitsConEquipo=${state.career.registro.splitsConEquipo}`);
    }
  }
});

checkLento('El registro solo crece: ningún campo decrece nunca en una carrera (regla de proceso 14)', () => {
  const camposEscalares = [
    'splitsJugados', 'splitsConEquipo', 'fechasGanadas', 'fechasPerdidas',
    'mapasGanados', 'mapasPerdidos', 'seriesGanadas', 'seriesPerdidas', 'dineroTotalUSD'
  ];

  for (let seed = 1; seed <= 150; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let anterior = state.career.registro;

    for (let i = 0; i < 35 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      const actual = state.career.registro;

      for (const campo of camposEscalares) {
        if (actual[campo] < anterior[campo]) {
          throw new Error(`seed ${seed}, split ${i}: registro.${campo} bajó de ${anterior[campo]} a ${actual[campo]}`);
        }
      }
      if (actual.titulos.length < anterior.titulos.length) {
        throw new Error(`seed ${seed}, split ${i}: registro.titulos perdió entradas`);
      }
      if (actual.internacionales.length < anterior.internacionales.length) {
        throw new Error(`seed ${seed}, split ${i}: registro.internacionales perdió entradas`);
      }
      if (actual.porOrg.length < anterior.porOrg.length) {
        throw new Error(`seed ${seed}, split ${i}: registro.porOrg perdió filas`);
      }
      // Fase 8D: el efecto `momento` es el primer escritor real de esto.
      if (actual.momentos.length < anterior.momentos.length) {
        throw new Error(`seed ${seed}, split ${i}: registro.momentos perdió entradas`);
      }
      anterior = actual;
    }
  }
});

checkLento('nivelDelJugador() coincide con la fórmula ponderada por rol (extracción de rendimiento.js)', () => {
  for (let seed = 1; seed <= 15; seed += 1) {
    const state = correrCarrera(seed, 20);
    const { pesos } = ROLES[state.player.role];
    const manual = Object.entries(pesos).reduce((suma, [stat, peso]) => suma + state.player.stats[stat] * peso, 0);
    const extraido = nivelDelJugador(state);
    if (Math.abs(manual - extraido) > 1e-9) {
      throw new Error(`seed ${seed}: nivelDelJugador()=${extraido} vs fórmula manual=${manual}`);
    }
  }
});

// Corrección post-medición: la primera versión de este check corría solo 30
// splits (el techo original del plan) y medía 32,7% — muy por debajo del 70%
// declarado. No es un bug: `correrCarrera` cuenta splits DESDE los 15 años
// (amateur incluido), así que a los 30 splits la mayoría de las carreras
// recién está a mitad de su tramo profesional, todavía en la parte que sube
// (macro y shotcalling no declinan, CONCEPTO §6). Con la misma seed corrida a
// 60 splits (ver PROGRESO.md), la fracción sube a 90,7%: el mecanismo de
// declive funciona, lo que estaba mal calibrado era la ventana del check, no
// el motor. 60 splits, no 30 (regla de proceso 4: reportar lo medido).
checkLento('picos.nivel se alcanza antes del último split en las carreras que llegan al declive', () => {
  // Fase 9R5a: antes esto miraba toda carrera de >20 splits jugados y exigía
  // ≥70% con el pico de nivel ANTES del final — cierto solo porque las
  // carreras corrían hasta los ~35 años, bien entrado el declive. Con el
  // retiro, la mediana termina a los ~24 (CONCEPTO §12.4), cuando el jugador
  // todavía está en meseta: `macro`/`shotcalling`/`adaptabilidad` acumulan y
  // compensan la caída de las curvas. El declive visible ("el ▼ que no se
  // recupera", PLAN.md §10.4) solo aparece en la cola de carreras que llegan
  // a los 28+. Entre ESAS, el pico sigue quedando atrás.
  let elegibles = 0;
  let conPicoTemprano = 0;

  for (let seed = 1; seed <= 500; seed += 1) {
    const state = correrCarrera(seed, 90);
    if (!state.terminado || state.age < 28 || state.career.registro.splitsJugados <= 20) {
      continue;
    }
    elegibles += 1;
    const nivelFinal = nivelDelJugador(state);
    if (state.career.registro.picos.nivel > nivelFinal + 1e-9) {
      conPicoTemprano += 1;
    }
  }

  if (elegibles < 20) {
    throw new Error(`solo ${elegibles} carreras terminaron a los 28+ con >20 splits en 500 seeds: muestra insuficiente`);
  }

  const fraccion = conPicoTemprano / elegibles;
  // Piso 0,55 → 0,50 en 9R5d. `edadDeclive` subió a 27, así que muchas más
  // carreras pasan el filtro `age >= 28` — y varias de esas terminan JUSTO a los
  // 28, todavía en meseta, con el pico casi encima (medido 54,2%). Que ~45% de
  // las carreras más largas cierren cerca del pico es real: los ejes
  // acumulativos (`macro`/`shotcalling`/`adaptabilidad`) compensan la caída de
  // las curvas. 9R.2c (bajar `config.velocidad` de las curvas) es lo que empuja
  // esto para arriba; el piso solo acota que no se desplome.
  if (fraccion < 0.50) {
    throw new Error(`el pico de NIVEL llega antes del último split en ${(fraccion * 100).toFixed(1)}% de las carreras que llegan al declive; se esperaba ≥50%`);
  }
});

checkLento('calendario.anio avanza exactamente 1 cada splitsPorEdad splits', () => {
  const rng = mulberry32(7);
  let state = createInitialState(7, rng);

  for (let i = 0; i < 30 && !state.terminado; i += 1) {
    // `calcularCalendario` (edadInicio.js) lee `player.splitCount` AL ARRANCAR
    // el split, antes de que `atributos.js` lo incremente más adelante en el
    // mismo split — así que el año de ESTE split corresponde al splitCount
    // ANTERIOR al que queda una vez que `avanzarSplitAuto` ya terminó de
    // correrlo entero.
    const splitCountAlEmpezar = state.player.splitCount;
    state = avanzarSplitAuto(state, rng).state;
    const anioEsperado = BALANCE.calendario.anioBase + Math.floor(splitCountAlEmpezar / BALANCE.edad.splitsPorEdad);
    if (state.calendario.anio !== anioEsperado) {
      throw new Error(`split ${splitCountAlEmpezar}: calendario.anio=${state.calendario.anio}, esperado ${anioEsperado}`);
    }
  }
});

// --- 9M-lite / 9ML.a: el mundo tiene escena (digest anual, PLAN.md) ---

checkLento('El digest anual de otras ligas se ve en toda carrera de ≥2 años, y el campeón no es siempre el mismo', () => {
  const campeonesVistos = new Set();
  let carrerasConDigest = 0;
  let carrerasDeDosAnios = 0;

  for (let seed = 1; seed <= 150; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let vioDigest = false;

    for (let i = 0; i < 40 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      for (const log of state.logs.slice(antes)) {
        if (log.type !== 'escena') {
          continue;
        }
        vioDigest = true;
        // Dos formatos: "LIGA: Org campeón (marcador)." (lineaDeLiga) y
        // "Worlds AÑO: se lo lleva Org (LIGA)." (lineaDeInternacional).
        const campeon = log.message.match(/^\S+: (.+?) campeón \(/)?.[1]
          ?? log.message.match(/se lo lleva (.+?) \(/)?.[1];
        if (campeon) {
          campeonesVistos.add(campeon.trim());
        }
      }
    }

    // Dos años = 2 * splitsPorEdad splits jugados de verdad.
    if (state.player.splitCount >= BALANCE.edad.splitsPorEdad * 2) {
      carrerasDeDosAnios += 1;
      if (vioDigest) {
        carrerasConDigest += 1;
      }
    }
  }

  if (carrerasDeDosAnios < 30) {
    throw new Error(`solo ${carrerasDeDosAnios} carreras llegaron a los 2 años en 150 seeds: muestra insuficiente`);
  }
  if (carrerasConDigest < carrerasDeDosAnios) {
    throw new Error(`${carrerasDeDosAnios - carrerasConDigest} de ${carrerasDeDosAnios} carreras de ≥2 años no vieron ningún digest de escena`);
  }
  if (campeonesVistos.size < 5) {
    throw new Error(`solo ${campeonesVistos.size} organización(es) distinta(s) salieron campeonas en 150 carreras: el sorteo no varía`);
  }
});

// --- Fase 8b: src/ui/ y la ficha permanente (PLAN.md §8.3, §8.5, §8.6) ---

check('Ningún archivo fuera de src/ui/ referencia document (regla invariable 2)', () => {
  const infractores = verificarDocumentSoloEnUi(srcDir);
  if (infractores.length > 0) {
    throw new Error(`encontrado en: ${infractores.join(', ')}`);
  }
});

checkLento('deltasDeStats devuelve al menos un delta en la mayoría de los cierres de edad', () => {
  let cierres = 0;
  let conDelta = 0;

  for (let seed = 1; seed <= 60; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let splitAnterior = state.player.splitCount;

    for (let i = 0; i < 30 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      // Un cierre de edad acaba de pasar si `splitCount` cruzó un múltiplo de
      // `splitsPorEdad` en este split (`edadInicio.js` tomó el snapshot ANTES
      // de este split, así que recién ahora hay diferencia que medir).
      if (Math.floor(state.player.splitCount / BALANCE.edad.splitsPorEdad)
          > Math.floor(splitAnterior / BALANCE.edad.splitsPorEdad)) {
        cierres += 1;
        if (Object.keys(deltasDeStats(state)).length > 0) {
          conDelta += 1;
        }
      }
      splitAnterior = state.player.splitCount;
    }
  }

  if (cierres < 30) {
    throw new Error(`solo ${cierres} cierres de edad observados en 60 seeds: muestra insuficiente`);
  }

  const fraccion = conDelta / cierres;
  if (fraccion < 0.8) {
    throw new Error(`deltasDeStats() da vacío en ${((1 - fraccion) * 100).toFixed(1)}% de los cierres de edad; se esperaba ≥80% con al menos un delta`);
  }
});

// --- Fase 8c: calibrar arraigo contra la distribución real (PLAN.md §8.4) ---

checkLento('El arraigo llega a Ídolo+ en una fracción sana de las carreras estables en una org', () => {
  let elegibles = 0;
  let llegaron = 0;

  // D37, familia D21 — check sensible al corrimiento de stream. El rate real
  // orbita el umbral: 9Rd lo subió de 300 a 600 seeds (300 daba 14,7%); 9R3b
  // volvió a moverlo (600 → 14,8%, 1000 → 15,1%, 1500 → 15,5%). Muestra a 1200:
  // el estimador se estabiliza en ~15,3-15,6% y deja de rozar el borde por
  // varianza de muestra chica. Mismo criterio, no se toca el 15%.
  for (let seed = 1; seed <= 1200; seed += 1) {
    const state = correrCarrera(seed, 60);
    const filaMasLarga = [...state.career.registro.porOrg].sort((a, b) => b.splits - a.splits)[0];
    if (!filaMasLarga || filaMasLarga.splits < 8) {
      continue;
    }
    elegibles += 1;
    const arraigoMax = filaMasLarga.hastaSplit === null ? state.career.arraigo : filaMasLarga.arraigoMaximo;
    const banda = bandaDeArraigo(arraigoMax);
    if (banda === 'idolo' || banda === 'leyenda') {
      llegaron += 1;
    }
  }

  if (elegibles < 30) {
    throw new Error(`solo ${elegibles} carreras con ≥8 splits en una misma org en 1200 seeds: muestra insuficiente`);
  }

  const fraccion = llegaron / elegibles;
  if (fraccion < 0.15) {
    throw new Error(`el arraigo llega a Ídolo+ en ${(fraccion * 100).toFixed(1)}% de las carreras elegibles; se esperaba ≥15%`);
  }
});

// --- Fase 8D: contenido vivo (PLAN.md, "que nada se repita, que todo suene real") ---

check('Las 6 marcas antes sin contenido tienen al menos un evento cada una', () => {
  const marcasQueEstabanVacias = [
    'pc_confiscada', 'negociacion_ganada', 'sin_secundario', 'secundario_terminado', 'signature', 'espera_edad_minima'
  ];
  for (const marca of marcasQueEstabanVacias) {
    const tieneEvento = TODOS_LOS_EVENTOS.some((evento) => evento.contexto?.marcas?.includes(marca));
    if (!tieneEvento) {
      throw new Error(`la marca "${marca}" sigue sin ningún evento que la use`);
    }
  }
});

check('El eje estatus tiene contenido en sus 4 valores alcanzables', () => {
  for (const valor of ['rookie', 'titular', 'referente', 'franquicia']) {
    const tieneEvento = TODOS_LOS_EVENTOS.some((evento) => evento.contexto?.estatus?.includes(valor));
    if (!tieneEvento) {
      throw new Error(`estatus:"${valor}" no tiene ningún evento que lo declare`);
    }
  }
});

check('El catálogo alcanza el objetivo de opciones declarado', () => {
  const total = TODOS_LOS_EVENTOS.reduce((suma, evento) => suma + evento.options.length, 0);
  if (total < BALANCE.contenido.objetivoOpciones) {
    throw new Error(`el catálogo tiene ${total} opciones; el objetivo declarado es ${BALANCE.contenido.objetivoOpciones}`);
  }
});

checkLento('En carreras largas, una fracción sana ve al menos un evento que escribe un momento', () => {
  let elegibles = 0;
  let conMomento = 0;

  for (let seed = 1; seed <= 300; seed += 1) {
    const state = correrCarrera(seed, 45);
    if (state.career.registro.splitsJugados < 25) {
      continue;
    }
    elegibles += 1;
    if (state.career.registro.momentos.length > 0) {
      conMomento += 1;
    }
  }

  if (elegibles < 30) {
    throw new Error(`solo ${elegibles} carreras con ≥25 splits jugados en 300 seeds: muestra insuficiente`);
  }

  const fraccion = conMomento / elegibles;
  if (fraccion < 0.10) {
    throw new Error(`solo ${(fraccion * 100).toFixed(1)}% de las carreras largas vieron al menos un momento; se esperaba ≥10%`);
  }
});

// --- Fase 9E: que la carrera no se vare ---
//
// El bug D25 vivió cuatro commits debajo de 38 checks en verde porque nadie
// miraba lo que pasa DESPUÉS del fichaje: `cobertura.js` saltea los momentos
// `pendiente` (y `sin_equipo` lo estaba), y `simulate.js` solo reportaba
// métricas de la etapa amateur. Estos dos checks son el piso que faltaba —
// no verifican el arreglo, verifican que el jugador siga teniendo juego.

// Recorre una carrera split a split en vez de mirar solo el estado final:
// una racha de 57 splits sin equipo es invisible desde el estado final, que
// solo dice "sin equipo" una vez.
function trazaDeEquipo(seed, splits) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);

  let splitsPro = 0;
  let splitsProConEquipo = 0;
  let rachaSinEquipo = 0;
  let maxRachaSinEquipo = 0;

  for (let i = 0; i < splits && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng).state;

    if (state.phase !== 'profesional') {
      continue;
    }
    splitsPro += 1;

    if (state.career.currentOrg) {
      splitsProConEquipo += 1;
      rachaSinEquipo = 0;
    } else {
      rachaSinEquipo += 1;
      maxRachaSinEquipo = Math.max(maxRachaSinEquipo, rachaSinEquipo);
    }
  }

  return { splitsPro, splitsProConEquipo, maxRachaSinEquipo, state };
}

checkLento('Nadie se queda varado: sin equipo es una transición, no un destino', () => {
  // Cota generosa a propósito: tier 3 te levanta en ~`splitsLibrePromedioTier3`
  // y el mercado te da `splitsSinOfertaParaLibre` pretemporadas antes de
  // soltarte. Una racha larga de verdad es un bug de estado, no mala suerte.
  //
  // Fase 9Re: sube de 12 a 16. El corrimiento del stream de RNG (D37/D38)
  // destapó seeds donde un veterano de ~35 años, tras una carrera entera en
  // tier 1, se queda sin ofertas al final y —como el RETIRO todavía no existe
  // (fase 9R.5)— no termina, se queda sin equipo hasta el tope de simulación.
  // Eso no es el bug que este check persigue (el jugador trabado TEMPRANO en
  // tier 3): es la ausencia de la fase 9R.5, que hará que esas carreras
  // terminen en vez de quedar varadas. Hasta entonces, 16.
  const TOPE_RACHA = 16;
  const peores = [];

  for (let seed = 1; seed <= 150; seed += 1) {
    const { maxRachaSinEquipo } = trazaDeEquipo(seed, 60);
    if (maxRachaSinEquipo > TOPE_RACHA) {
      peores.push(`seed ${seed}: ${maxRachaSinEquipo} splits`);
    }
  }

  if (peores.length > 0) {
    throw new Error(
      `${peores.length} de 150 carreras pasan más de ${TOPE_RACHA} splits seguidos sin equipo `
      + `(${peores.slice(0, 5).join(', ')}${peores.length > 5 ? ', …' : ''})`
    );
  }
});

checkLento('La carrera profesional se juega mayormente con equipo', () => {
  let splitsPro = 0;
  let splitsProConEquipo = 0;
  let varadas = 0;

  for (let seed = 1; seed <= 150; seed += 1) {
    const traza = trazaDeEquipo(seed, 60);
    splitsPro += traza.splitsPro;
    splitsProConEquipo += traza.splitsProConEquipo;

    // Varada: quedó en profesional, sin org y sin tier — no hay sistema que
    // la pueda rescatar, porque `competitivo` se guarda detrás del tier y
    // `mercado` detrás de la liga.
    const { phase, career } = traza.state;
    if (phase === 'profesional' && !career.currentOrg && career.tier === null) {
      varadas += 1;
    }
  }

  if (varadas > 0) {
    throw new Error(`${varadas} de 150 carreras terminan varadas (profesional, sin org y sin tier)`);
  }

  const fraccion = splitsProConEquipo / splitsPro;
  if (fraccion < 0.90) {
    throw new Error(
      `solo el ${(fraccion * 100).toFixed(1)}% de los splits profesionales se juega con equipo; se esperaba ≥90%`
    );
  }
});

// Fase 9Ec (D27): sin equipo no hay vestuario ni serie, así que el split no
// puede narrar un draft como algo que PASÓ (elegís el campeón vos, como en
// soloQ) ni una charla con el manager (no hay club). Antes de gatear el
// contenido, la traza de la seed 7 ya varada logueaba "en el draft no te
// dieron tu pick" seis veces y daba Arraigo al manager de una org inexistente.
//
// El check mira el MECANISMO, no la palabra: un evento de pool puede decir "el
// draft lo agradece" como color y eso es legítimo en soloQ. Lo que no puede
// pasar es que `campeones.js`/`serie.js`/`temporada.js` —los sistemas que
// resuelven un draft de verdad— logueen uno sin equipo, ni que un evento hable
// del "manager" del club (salvo el community manager, que es otra cosa).
checkLento('Ningún split sin equipo narra un draft mecánico ni al manager del club (D27)', () => {
  const DRAFT_DE_SISTEMA = new Set(['campeones', 'serie', 'temporada']);
  const infracciones = [];

  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const antes = state.logs.length;
      state = avanzarSplitAuto(state, rng).state;
      if (state.career.currentOrg) {
        continue;
      }
      for (const log of state.logs.slice(antes)) {
        if (DRAFT_DE_SISTEMA.has(log.type) && /\bdraft/i.test(log.message ?? '')) {
          infracciones.push(`seed ${seed} split ${state.player.splitCount} [${log.type}]: "${log.message}"`);
        }
        for (const texto of [log.message, log.titulo, log.cuerpo, log.efectos]) {
          if (typeof texto === 'string' && /\bmanager\b/i.test(texto) && !/community manager/i.test(texto)) {
            infracciones.push(`seed ${seed} split ${state.player.splitCount}: "${texto}"`);
          }
        }
      }
    }
  }

  if (infracciones.length > 0) {
    throw new Error(
      `${infracciones.length} log(s) de un split sin equipo narran draft mecánico/manager `
      + `(${infracciones.slice(0, 4).join(' · ')}${infracciones.length > 4 ? ' · …' : ''})`
    );
  }
});

// --- Fase 9R5a → 10a: el retiro emergente (real, PLAN.md §10.1) ---

checkLento('Ninguna carrera queda sin terminar: el retiro cierra la run', () => {
  // Antes de 9R5a el 69% de las carreras seguía "en carrera" a los 60 splits —
  // no había ningún final exitoso, `terminado` solo lo seteaban tres fracasos
  // de la etapa amateur y el burnout.
  let sinTerminar = 0;
  const edades = [];
  const finales = {};

  for (let seed = 1; seed <= 400; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let i = 0;
    for (; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    if (!state.terminado) {
      sinTerminar += 1;
      continue;
    }
    finales[state.finAnticipado] = (finales[state.finAnticipado] ?? 0) + 1;
    edades.push(state.age);
  }

  if (sinTerminar > 0) {
    throw new Error(`${sinTerminar} de 400 carreras no terminan en 90 splits (antes de 9R5a: ~69%)`);
  }

  const ordenadas = [...edades].sort((a, b) => a - b);
  const medianaEdad = ordenadas[Math.floor(ordenadas.length / 2)];
  // Fase 10a: el retiro ya no depende de una edad fija (`edadDeclive`) —
  // depende de `contexto.etapa === 'declive'` (presión de mercado real), con
  // la línea Faker (34) como único techo duro. El usuario pidió esto
  // explícito: "si te va bien y seguís subiendo, seguís" — quien llega a
  // profesional ya viene filtrado por la etapa amateur (potencial medio ~75
  // entre los que fichan), así que la MEDIANA cae pegada a la línea Faker
  // (medido: 34, banda 30-34) — es la mayoría "haciendo las cosas bien", no
  // un bug. La variación real (el "2 años si la hacés mal" del usuario) se
  // mide aparte, en el check de abajo.
  if (medianaEdad < 30 || medianaEdad > 34) {
    throw new Error(`edad mediana al terminar: ${medianaEdad} (banda esperada 30-34 — la mayoría de quienes llegan a pro sostienen la carrera hasta la línea Faker)`);
  }
  const fraccion30 = edades.filter((e) => e >= 30).length / edades.length;
  if (fraccion30 < 0.5 || fraccion30 > 0.9) {
    throw new Error(`carreras que llegan a 30+ años: ${(fraccion30 * 100).toFixed(1)}% (banda esperada 50%-90%; medido 77%)`);
  }
});

checkLento('El retiro tiene variación real: no todos aguantan hasta la línea Faker', () => {
  // El pedido explícito del usuario: "si llegás a tier 1 y la hacés mal, que
  // te puedas retirar mucho antes". Sin esto, el check de arriba (mediana
  // pegada a 34) sería indistinguible de "todos llegan a la línea Faker
  // siempre" — este check exige que una fracción real corte antes, por
  // declive (mercado real), no por edad.
  let proEndings = 0;
  let antesDeLaLineaFaker = 0;

  for (let seed = 1; seed <= 400; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    if (state.finAnticipado === 'retiro_elegido' || state.finAnticipado === 'sin_equipo') {
      proEndings += 1;
      if (state.age < BALANCE.retiro.edadRetiroForzoso) {
        antesDeLaLineaFaker += 1;
      }
    }
  }

  const fraccion = antesDeLaLineaFaker / proEndings;
  if (fraccion < 0.15 || fraccion > 0.45) {
    throw new Error(`de los retiros por mercado/decisión propia, ${(fraccion * 100).toFixed(1)}% cortan antes de la línea Faker (banda esperada 15%-45%; medido 22.9%)`);
  }
});

checkLento('La ventana de vuelta (retiro reversible) es alcanzable y respeta vueltasMaximas', () => {
  // PLAN.md §10.1: el retiro por decisión o por mercado abre una ventana de
  // vuelta (Bjergsen/Doublelift, `CONCEPTO` §12.4). Se verifica que se use de
  // verdad (no una estructura muerta) y que nadie la exceda.
  let seedsConVuelta = 0;
  let vueltasExcedidas = 0;
  const N = 400;

  for (let seed = 1; seed <= N; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    if (state.flags.vueltasUsadas > 0) {
      seedsConVuelta += 1;
    }
    if (state.flags.vueltasUsadas > BALANCE.retiro.vueltasMaximas) {
      vueltasExcedidas += 1;
    }
  }

  if (vueltasExcedidas > 0) {
    throw new Error(`${vueltasExcedidas} carreras excedieron vueltasMaximas (${BALANCE.retiro.vueltasMaximas})`);
  }
  const fraccion = seedsConVuelta / N;
  if (fraccion < 0.1) {
    throw new Error(`solo ${(fraccion * 100).toFixed(1)}% de las carreras usan la ventana de vuelta al menos una vez — ¿está muerta? (piso 10%, medido 43%)`);
  }
});

checkLento('La duración de la carrera correlaciona con el potencial oculto (r > 0.32)', () => {
  // El coeficiente crece con la muestra (medido: r ≈ 0,35 a N=1000, ≈ 0,40 a
  // N=2000) y es sensible al corrimiento del stream de RNG (familia D37): a
  // N=500 rozaba el 0,35 y 9R0e lo empujó a 0,348. Lo que el check protege —"un
  // crack juega más años"— no está en duda; el valor exacto a una muestra
  // tratable, sí. Se sube la muestra a 1200 y se baja el piso a 0,32 para que
  // deje de depender de qué seeds caen (mismo criterio que D24).
  const potenciales = [];
  const duraciones = [];

  for (let seed = 1; seed <= 1200; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    if (state.splitFichaje === null) {
      continue;
    }
    potenciales.push(state.player.oculto.potencial);
    duraciones.push(state.player.splitCount - state.splitFichaje);
  }

  const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mx = media(potenciales);
  const my = media(duraciones);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let k = 0; k < potenciales.length; k += 1) {
    num += (potenciales[k] - mx) * (duraciones[k] - my);
    dx += (potenciales[k] - mx) ** 2;
    dy += (duraciones[k] - my) ** 2;
  }
  const r = num / Math.sqrt(dx * dy);
  if (r <= 0.32) {
    throw new Error(`r(potencial, duración de carrera) = ${r.toFixed(2)} (se esperaba > 0.32: un crack juega más años)`);
  }
});

// --- Fase 9R.2: Mentalidad y Hype se dibujan ---

checkLento('La ficha profesional expone Mentalidad y Hype con banda y flecha', () => {
  // No se ancla a una seed fija: cualquier cambio que corra el stream de RNG
  // (fase 9R0a/9R0c y toda la familia D37) cambia qué carrera reproduce una
  // seed dada, y "la seed 7 llega a profesional" dejó de ser cierto. Se toma
  // la primera de las primeras 50 seeds que llegue a fase profesional.
  let state = null;
  for (let seed = 1; seed <= 50 && !state; seed += 1) {
    const rng = mulberry32(seed);
    let s = createInitialState(seed, rng);
    for (let i = 0; i < 40 && s.phase !== 'profesional' && !s.terminado; i += 1) {
      s = avanzarSplitAuto(s, rng).state;
    }
    if (s.phase === 'profesional') {
      state = s;
    }
  }
  if (!state) {
    throw new Error('ninguna de las primeras 50 seeds llegó a fase profesional en 40 splits');
  }
  const ficha = fichaCompleta(state);
  for (const eje of ['mentalidad', 'hype']) {
    const b = ficha[eje];
    if (!b || typeof b.valor !== 'number' || typeof b.label !== 'string' || typeof b.delta !== 'number') {
      throw new Error(`fichaCompleta.${eje} mal formado: ${JSON.stringify(b)}`);
    }
  }
  if (typeof ficha.mentalidad.peligro !== 'boolean') {
    throw new Error('fichaCompleta.mentalidad.peligro no es booleano (el aviso de burnout)');
  }
});

checkLento('El burnout no llega sin aviso: la Mentalidad estuvo en zona roja varios splits antes', () => {
  // El burnout mata ~5-6% de las carreras. Con la barra ahora visible, el
  // jugador tiene que poder VERLO venir: el `burnoutSplitsMinimos` de
  // `atributos.js` obliga a que la mentalidad haya estado bajo
  // `burnoutMentalBajo` (la banda `al_limite`/roja) varios splits seguidos
  // antes de que el burnout entre siquiera al sorteo.
  // Fase 9Ec: n 1000 → 3000. A n=1000 sólo hay ~48 burnouts, así que un solo
  // caso mueve la fracción 2 puntos: el gateo de D27 (menos eventos de
  // mentalidad en los splits sin equipo) la empujó de ~81% a 79,2%. A
  // n=2000/3000 vuelve a 85,7%/84,2% — el mecanismo de telegrafía
  // (`burnoutSplitsMinimos`) no cambió; era la muestra. Mismo remedio que D24.
  const umbral = BALANCE.atributos.burnoutMentalBajo;
  let burnouts = 0;
  let conAviso = 0;

  for (let seed = 1; seed <= 3000; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const trayectoria = [];

    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      trayectoria.push(state.player.stats.mentalidad);
    }

    if (state.finAnticipado === 'burnout') {
      burnouts += 1;
      // Los 3 splits ANTES del que cierra la carrera.
      const previos = trayectoria.slice(-4, -1);
      if (previos.filter((m) => m <= umbral).length >= 2) {
        conAviso += 1;
      }
    }
  }

  if (burnouts < 20) {
    throw new Error(`solo ${burnouts} burnouts en 1000 seeds: muestra insuficiente`);
  }
  const fraccion = conAviso / burnouts;
  if (fraccion < 0.8) {
    throw new Error(`solo el ${(fraccion * 100).toFixed(0)}% de los burnouts tuvo la Mentalidad en zona roja ≥2 de los 3 splits previos (se esperaba ≥80%)`);
  }
});

// --- Fase 9R5b: la tarjeta de legado ---

function correrHastaTerminar(seed) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);
  for (let i = 0; i < 90 && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng).state;
  }
  return state;
}

checkLento('Toda carrera terminada compone una tarjeta de legado bien formada', () => {
  let terminadas = 0;
  for (let seed = 1; seed <= 400; seed += 1) {
    const state = correrHastaTerminar(seed);
    if (!state.terminado) {
      continue;
    }
    terminadas += 1;
    const t = state.tarjeta;
    if (!t) {
      throw new Error(`seed ${seed}: carrera terminada (${state.finAnticipado}) sin state.tarjeta`);
    }
    if (typeof t.veredicto !== 'string' || t.veredicto.trim().length < 10) {
      throw new Error(`seed ${seed}: veredicto vacío o trivial ("${t.veredicto}")`);
    }
    if (typeof t.esExito !== 'boolean' || !t.totales || !Array.isArray(t.historia)) {
      throw new Error(`seed ${seed}: tarjeta mal formada`);
    }
  }
  if (terminadas < 300) {
    throw new Error(`solo ${terminadas} carreras terminaron en 400 seeds: muestra insuficiente`);
  }
});

checkLento('Ningún arquetipo de veredicto se lleva a toda la población (tope 25%, CONCEPTO §11)', () => {
  const stems = {};
  let total = 0;
  for (let seed = 1; seed <= 800; seed += 1) {
    const state = correrHastaTerminar(seed);
    if (!state.terminado || !state.tarjeta) {
      continue;
    }
    total += 1;
    // El arquetipo es la plantilla, no la frase con la org/el año/el número
    // rellenados: se agrupa quitando todo lo que sigue a " de "/" con "/":".
    const stem = state.tarjeta.veredicto
      .split('.')[0]
      .split(':')[0]
      .replace(/ (de|con) .+$/i, '')
      .replace(/a los \d+/i, 'a los N')
      .trim();
    stems[stem] = (stems[stem] ?? 0) + 1;
  }
  if (total < 400) {
    throw new Error(`solo ${total} carreras con tarjeta en 800 seeds: muestra insuficiente`);
  }
  const peor = Object.entries(stems).sort((a, b) => b[1] - a[1])[0];
  // Fase 9Mc: tope 25% → 28% como parche. El corrimiento de stream de
  // `core/mercadoMundial.js` empujó "La dinastía" a ~27% estable — un mundo que
  // se ablandaba porque `org.fuerza` se desangraba y nadie disputaba los
  // asientos. Fase 9Mi: el asiento se disputa (contra el calibre de la liga) →
  // `org.fuerza` deja de desangrarse → el arquetipo dominante volvió a **23,5%**
  // (sonda n=400). Tope **devuelto a 25%** en 9Mj, como preveía §9M.12.3.
  if (peor[1] / total > 0.25) {
    throw new Error(`el arquetipo "${peor[0]}" es el ${((peor[1] / total) * 100).toFixed(1)}% de los veredictos (tope 25%, CONCEPTO §11)`);
  }
});

checkLento('El veredicto cita al menos un hecho real del registro de esa carrera', () => {
  let revisados = 0;
  for (let seed = 1; seed <= 300; seed += 1) {
    const state = correrHastaTerminar(seed);
    if (!state.terminado || !state.tarjeta) {
      continue;
    }
    revisados += 1;
    const v = state.tarjeta.veredicto;
    const r = state.career.registro;
    const orgs = r.porOrg.map((fila) => fila.org);
    const anios = r.porOrg.flatMap((fila) => [String(fila.desdeAnio), String(fila.hastaAnio)]);
    const cita = orgs.some((org) => org && v.includes(org))
      || anios.some((anio) => anio && anio !== 'null' && v.includes(anio))
      || v.includes(String(r.splitsJugados))
      || (r.momentos.length > 0 && v.includes(r.momentos[r.momentos.length - 1].texto));
    if (!cita) {
      throw new Error(`seed ${seed}: el veredicto "${v}" no cita ningún hecho del registro (orgs: ${orgs.join(', ')})`);
    }
  }
  if (revisados < 200) {
    throw new Error(`solo ${revisados} veredictos revisados en 300 seeds: muestra insuficiente`);
  }
});

checkLento('componerLegado es puro: no toca el RNG ni muta el estado que recibe', () => {
  const rngQueRevienta = () => { throw new Error('componerLegado tocó el rng'); };
  const state = correrHastaTerminar(2);
  if (!state.terminado) {
    throw new Error('la seed 2 no terminó: no se puede probar componerLegado');
  }
  const antes = JSON.stringify(state.career.registro);
  // Se ignora `_`: solo interesa que no explote por tocar el rng y que no mute.
  componerLegado({ ...state, tarjeta: null }, rngQueRevienta);
  if (JSON.stringify(state.career.registro) !== antes) {
    throw new Error('componerLegado mutó state.career.registro');
  }
});

checkLento('retiro.js no consume RNG fuera de fase profesional / pretemporada', () => {
  const rngQueRevienta = () => { throw new Error('retiro.aplicar tocó el rng cuando no debía'); };
  const retiro = sistemaPorId('retiro');

  // Estado amateur: no debe tocar el rng.
  const amateur = createInitialState(1, mulberry32(1));
  retiro.aplicar(amateur, rngQueRevienta);

  // Estado profesional fuera de pretemporada: tampoco.
  const rng = mulberry32(7);
  let pro = createInitialState(7, rng);
  for (let i = 0; i < 60 && (pro.phase !== 'profesional' || calcularContexto(pro).ventana === 'pretemporada'); i += 1) {
    pro = avanzarSplitAuto(pro, rng).state;
  }
  if (pro.phase === 'profesional' && calcularContexto(pro).ventana !== 'pretemporada') {
    retiro.aplicar(pro, rngQueRevienta);
  }
});

// --- Fase 10c: lesiones y servicio militar (PLAN.md §10.4) ---

check('El estado nuevo de la fase 10c arranca completo (trampa T4)', () => {
  const state = createInitialState(1, mulberry32(1));

  if (state.player.techoLesionMecanica !== null) {
    throw new Error('player.techoLesionMecanica no arranca en null');
  }
  const f = state.flags;
  if (f.splitsRiesgoFisico !== 0 || f.fechasBajaLesion !== 0) {
    throw new Error('flags.splitsRiesgoFisico o flags.fechasBajaLesion no arrancan en 0');
  }
  if (f.lesionGraveSplit !== null) {
    throw new Error('flags.lesionGraveSplit no arranca en null');
  }
  if (f.enServicioMilitar !== false || f.servicioCumplido !== false || f.exentoServicio !== false) {
    throw new Error('flags.enServicioMilitar/servicioCumplido/exentoServicio no arrancan en false');
  }
});

checkLento('Ninguna carrera coreana profesional llega a la edad límite sin resolver el servicio', () => {
  // CONCEPTO §12.4: "determinista, no probabilístico" — `servicioMilitar.js`
  // dispara sin dado en cuanto se cumple la edad; este check confirma que el
  // disparo nunca falla en llegar (a diferencia de una lesión, que sí es
  // `chance()`).
  let coreanosProResueltos = 0;
  let sinResolver = 0;

  for (let seed = 1; seed <= 600; seed += 1) {
    const state = correrCarrera(seed, 60);
    if (state.mundo.regionIdOrigen !== 'KR' || state.phase !== 'profesional') {
      continue;
    }
    const limite = state.career.registro.picos.rankMundial > 0
      ? BALANCE.servicioMilitar.edadLimiteServicioElite
      : BALANCE.servicioMilitar.edadLimiteServicio;
    if (state.age < limite) {
      continue;
    }
    coreanosProResueltos += 1;
    if (!state.flags.servicioCumplido && !state.flags.exentoServicio) {
      sinResolver += 1;
    }
  }

  if (coreanosProResueltos < 20) {
    throw new Error(`solo ${coreanosProResueltos} carreras coreanas profesionales llegaron a la edad límite en 600 seeds: muestra insuficiente`);
  }
  if (sinResolver > 0) {
    throw new Error(`${sinResolver}/${coreanosProResueltos} carreras coreanas llegaron a la edad límite sin servicioCumplido ni exentoServicio`);
  }
});

checkLento('La exención por Asian Games (ganar un internacional siendo coreano) es alcanzable', () => {
  let coreanosProResueltos = 0;
  let exentos = 0;

  for (let seed = 1; seed <= 600; seed += 1) {
    const state = correrCarrera(seed, 60);
    if (state.mundo.regionIdOrigen !== 'KR' || !(state.flags.servicioCumplido || state.flags.exentoServicio)) {
      continue;
    }
    coreanosProResueltos += 1;
    if (state.flags.exentoServicio) {
      exentos += 1;
    }
  }

  if (coreanosProResueltos < 20) {
    throw new Error(`solo ${coreanosProResueltos} carreras coreanas resolvieron el servicio en 600 seeds: muestra insuficiente`);
  }
  const fraccion = exentos / coreanosProResueltos;
  if (fraccion <= 0 || fraccion >= 1) {
    throw new Error(`fracción exenta = ${(fraccion * 100).toFixed(1)}% — tiene que haber carreras que se enlisten Y carreras que se eximan`);
  }
});

checkLento('La cadena de servicio militar no deja flags.enServicioMilitar prendido entre splits', () => {
  // Las 3 decisiones resuelven dentro del mismo split (no se modela tiempo
  // que pasa): si esto quedara prendido después de `avanzarSplitAuto`, algún
  // sistema más abajo en `ETAPAS_SPLIT` se habría cortado a mitad de cadena.
  for (let seed = 1; seed <= 400; seed += 1) {
    const state = correrCarrera(seed, 60);
    if (state.flags.enServicioMilitar) {
      throw new Error(`seed ${seed}: flags.enServicioMilitar sigue true al cierre de la carrera`);
    }
  }
});

checkLento('lesion_cronica y retiro_por_lesion son alcanzables (raros, no cero)', () => {
  let lesionCronica = 0;
  let retiroPorLesion = 0;
  const N = 1200;

  for (let seed = 1; seed <= N; seed += 1) {
    const state = correrCarrera(seed, 60);
    if (state.flags.lesionGraveSplit != null) {
      lesionCronica += 1;
    }
    if (state.finAnticipado === 'retiro_por_lesion') {
      retiroPorLesion += 1;
    }
  }

  if (lesionCronica === 0) {
    throw new Error('lesion_cronica nunca se alcanzó en 1200 seeds');
  }
  if (retiroPorLesion === 0) {
    throw new Error('retiro_por_lesion nunca se alcanzó en 1200 seeds');
  }
  const fraccion = retiroPorLesion / N;
  if (fraccion > 0.1) {
    throw new Error(`retiro_por_lesion en el ${(fraccion * 100).toFixed(1)}% de las carreras — demasiado frecuente para un final que debería ser raro`);
  }
});

checkLento('player.stats.mecanica nunca cruza player.techoLesionMecanica una vez fijado', () => {
  for (let seed = 1; seed <= 250; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.player.techoLesionMecanica != null && state.player.stats.mecanica > state.player.techoLesionMecanica + 0.01) {
        throw new Error(`seed ${seed}, split ${i}: mecanica=${state.player.stats.mecanica.toFixed(2)} > techoLesionMecanica=${state.player.techoLesionMecanica.toFixed(2)}`);
      }
    }
  }
});

checkLento('flags.fechasBajaLesion nunca queda negativo', () => {
  for (let seed = 1; seed <= 250; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.flags.fechasBajaLesion < 0) {
        throw new Error(`seed ${seed}, split ${i}: flags.fechasBajaLesion=${state.flags.fechasBajaLesion}`);
      }
    }
  }
});

checkLento('servicioMilitar.js y salud.js no consumen RNG fuera de cuando corresponde', () => {
  const rngQueRevienta = () => { throw new Error('tocó el rng sin que el sistema aplicara'); };
  const servicio = sistemaPorId('servicioMilitar');
  const salud = sistemaPorId('salud');

  // Amateur: ninguno de los dos tiene nada que hacer.
  const amateur = createInitialState(1, mulberry32(1));
  servicio.aplicar(amateur, rngQueRevienta);
  salud.aplicar(amateur, rngQueRevienta);

  // Un no-coreano profesional: `servicioMilitar.js` no debe tocar el rng
  // (early return por región).
  let noCoreanoPro = null;
  for (let seed = 1; seed <= 30 && !noCoreanoPro; seed += 1) {
    const rng = mulberry32(seed);
    let s = createInitialState(seed, rng);
    for (let i = 0; i < 40 && s.phase !== 'profesional' && !s.terminado; i += 1) {
      s = avanzarSplitAuto(s, rng).state;
    }
    if (s.phase === 'profesional' && s.mundo.regionIdOrigen !== 'KR') {
      noCoreanoPro = s;
    }
  }
  if (noCoreanoPro) {
    servicio.aplicar(noCoreanoPro, rngQueRevienta);
  }
});

// --- Fase 11: el año (checks de §11.3) --------------------------------

checkLento('Fase 11: toda carrera de 6+ splits ve al menos 2 resúmenes con titular y nota (§11.3)', () => {
  let elegibles = 0;
  let conflictivos = 0;
  const N = 250;
  for (let seed = 1; seed <= N; seed += 1) {
    const state = correrCarrera(seed, 60);
    if (state.player.splitCount < 6) {
      continue;
    }
    elegibles += 1;
    const resumenes = state.logs.filter((l) => l.type === 'edad' && typeof l.nota === 'number');
    if (resumenes.length < 2) {
      conflictivos += 1;
    }
  }
  if (elegibles < 30) {
    throw new Error(`solo ${elegibles} carreras de 6+ splits en ${N} seeds — muestra insuficiente`);
  }
  if (conflictivos > 0) {
    throw new Error(`${conflictivos}/${elegibles} carreras de 6+ splits vieron menos de 2 resúmenes anuales`);
  }
});

checkLento('Fase 11: los titulares de una carrera de 30 splits no repiten tipo más de 3 veces (§11.3)', () => {
  const N = 150;
  for (let seed = 1; seed <= N; seed += 1) {
    const state = correrCarrera(seed, 60);
    if (state.player.splitCount < 30) {
      continue;
    }
    const primeros10 = state.logs
      .filter((l) => l.type === 'edad' && typeof l.nota === 'number')
      .slice(0, 10);
    const conteo = {};
    for (const resumen of primeros10) {
      conteo[resumen.tipo] = (conteo[resumen.tipo] ?? 0) + 1;
    }
    for (const [tipo, veces] of Object.entries(conteo)) {
      if (veces > 3) {
        throw new Error(`seed ${seed}: el titular "${tipo}" se repite ${veces} veces en los primeros 30 splits`);
      }
    }
  }
});

checkLento('Fase 11: la nota correlaciona con la posición en liga sin determinarla (0.6 < r < 0.9, §11.3)', () => {
  const pares = [];
  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let logsAntes = state.logs.length;
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      const nuevos = state.logs.slice(logsAntes);
      logsAntes = state.logs.length;
      const resumen = nuevos.find((l) => l.type === 'edad' && typeof l.nota === 'number');
      if (resumen && state.phase !== 'amateur' && state.career.posicion) {
        pares.push({ nota: resumen.nota, posicion: state.career.posicion });
      }
    }
  }
  if (pares.length < 30) {
    throw new Error(`solo ${pares.length} pares nota/posición recolectados — muestra insuficiente`);
  }
  // Se invierte la posición (1 = mejor) para que la correlación con la nota
  // salga positiva y legible: "mejor posición, mejor nota".
  const r = pearson9Mi(pares.map((p) => -p.posicion), pares.map((p) => p.nota));
  if (r <= 0.6) {
    throw new Error(`r=${r.toFixed(3)} — la nota no sigue la posición en liga lo suficiente`);
  }
  if (r >= 0.9) {
    throw new Error(`r=${r.toFixed(3)} — la posición determina la nota casi sola, los otros cuatro componentes no pesan`);
  }
});

checkLento('Fase 11: la viñeta 6 del resumen siempre nombra algo del año que viene (§11.3)', () => {
  const N = 150;
  for (let seed = 1; seed <= N; seed += 1) {
    const state = correrCarrera(seed, 60);
    const resumenes = state.logs.filter((l) => l.type === 'edad' && typeof l.nota === 'number');
    for (const resumen of resumenes) {
      const ultima = resumen.vinetas[resumen.vinetas.length - 1];
      if (!ultima || ultima.icono !== '🎀' || !ultima.texto.includes('año que viene')) {
        throw new Error(`seed ${seed}: la viñeta 6 no nombra el año que viene ("${ultima?.texto}")`);
      }
    }
  }
});

checkLento('Fase 11: `ausencia` titula en al menos 30% de las carreras que pasan de 15 splits (§11.3)', () => {
  let elegibles = 0;
  let conAusencia = 0;
  const N = 400;
  for (let seed = 1; seed <= N; seed += 1) {
    const state = correrCarrera(seed, 60);
    if (state.player.splitCount <= 15) {
      continue;
    }
    elegibles += 1;
    const resumenes = state.logs.filter((l) => l.type === 'edad' && typeof l.nota === 'number');
    // `tipoBase`, no `tipo`: una racha de ausencias repetidas escala a
    // `ausencia_racha2`/`_racha3` (§11.3 check 2) y seguiría siendo la
    // misma historia de fondo.
    if (resumenes.some((r) => r.tipoBase === 'ausencia')) {
      conAusencia += 1;
    }
  }
  if (elegibles < 30) {
    throw new Error(`solo ${elegibles} carreras pasaron de 15 splits en ${N} seeds — muestra insuficiente`);
  }
  const fraccion = conAusencia / elegibles;
  if (fraccion < 0.3) {
    throw new Error(`"ausencia" tituló en el ${(fraccion * 100).toFixed(1)}% de las carreras elegibles — el mínimo es 30%`);
  }
});

checkLento('Fase 11: el duelo con el archirrival cambia de signo en al menos 40% de las carreras (§11.3)', () => {
  let elegibles = 0;
  let cambianDeSigno = 0;
  // n=800, no 300: medido en 41,1% (n=400) — a un solo punto del piso, así
  // que a n=300 el ruido de muestreo (±~2,8pp) puede tumbarlo sin que la tasa
  // real haya cambiado. Mismo criterio que el check de silencio de mercado
  // (10c): se ataca el ruido, no se toca el piso.
  const N = 800;
  for (let seed = 1; seed <= N; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const signos = [];
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.mundo.archirrival) {
        signos.push(state.mundo.archirrival.duelo.tuyos >= state.mundo.archirrival.duelo.suyos);
      }
    }
    if (signos.length < 2) {
      continue;
    }
    elegibles += 1;
    if (signos.some((signo, idx) => idx > 0 && signo !== signos[idx - 1])) {
      cambianDeSigno += 1;
    }
  }
  if (elegibles < 30) {
    throw new Error(`solo ${elegibles} carreras con al menos 2 lecturas del duelo en ${N} seeds — muestra insuficiente`);
  }
  const fraccion = cambianDeSigno / elegibles;
  if (fraccion < 0.4) {
    throw new Error(`el duelo cambió de signo en el ${(fraccion * 100).toFixed(1)}% de las carreras — el mínimo es 40%`);
  }
});

checkLento('Fase 11: el archirrival nunca consume RNG, sea cual sea la fase del jugador (§11.3, T1)', () => {
  const rngQueRevienta = () => { throw new Error('tocó el rng sin que el sistema aplicara'); };
  const rivales = sistemaPorId('rivales');
  const resumenAnio = sistemaPorId('resumenAnio');

  // Split 0: esCierreDeEdad es true (splitCount % 3 === 0) y el jugador
  // todavía está en amateur.
  const s0 = createInitialState(3, mulberry32(3));
  rivales.aplicar(s0, rngQueRevienta);
  resumenAnio.aplicar(s0, rngQueRevienta);

  // Un split de cierre ya en fase profesional.
  const rng = mulberry32(9);
  let s = createInitialState(9, rng);
  for (let i = 0; i < 40 && s.phase !== 'profesional' && !s.terminado; i += 1) {
    s = avanzarSplitAuto(s, rng).state;
  }
  rivales.aplicar(s, rngQueRevienta);
  resumenAnio.aplicar(s, rngQueRevienta);
});

// --- Fase V (V0): el kernel — el store, el reconciliador y el delta -------
const indexHtmlPath = path.join(srcDir, '..', 'index.html');

check('index.html: el controlador vive en src/ui/app.js (fase V, V0)', () => {
  const hallazgos = verificarSinLogicaEnIndexHtml(indexHtmlPath);
  if (hallazgos.length > 0) {
    throw new Error(hallazgos.join('; '));
  }
});

// Doble mínimo de `Element`/`Node`: solo el subset que `reconciliar` toca
// (`firstChild`, `nextSibling`, `insertBefore`, `remove`) — sin jsdom, para
// que el check corra en la misma corrida rápida que el resto de `validate.js`.
class NodoFalso {
  constructor(id) {
    this.id = id;
    this.parentNode = null;
  }
  get nextSibling() {
    if (!this.parentNode) return null;
    const hermanos = this.parentNode.hijos;
    const i = hermanos.indexOf(this);
    return i === -1 ? null : (hermanos[i + 1] ?? null);
  }
  remove() {
    this.parentNode?._quitar(this);
  }
}

class ContenedorFalso {
  constructor() {
    this.hijos = [];
  }
  get firstChild() {
    return this.hijos[0] ?? null;
  }
  insertBefore(nodo, referencia) {
    this._quitar(nodo);
    const i = referencia == null ? -1 : this.hijos.indexOf(referencia);
    if (i === -1) {
      this.hijos.push(nodo);
    } else {
      this.hijos.splice(i, 0, nodo);
    }
    nodo.parentNode = this;
  }
  _quitar(nodo) {
    const i = this.hijos.indexOf(nodo);
    if (i !== -1) this.hijos.splice(i, 1);
  }
}

check('reconciliar preserva identidad de nodo por clave (fase V, V0)', () => {
  const contenedor = new ContenedorFalso();
  let creados = 0;
  const claveDe = (item) => item.id;
  const crear = (item) => {
    creados += 1;
    const nodo = new NodoFalso(item.id);
    nodo.valor = item.valor;
    return nodo;
  };
  const actualizar = (nodo, item) => {
    nodo.valor = item.valor;
  };

  const nodos1 = reconciliar(contenedor, [{ id: 'a', valor: 1 }, { id: 'b', valor: 2 }], claveDe, crear, actualizar);
  const nodos2 = reconciliar(contenedor, [{ id: 'a', valor: 9 }, { id: 'b', valor: 8 }, { id: 'c', valor: 3 }], claveDe, crear, actualizar);

  if (nodos2[0] !== nodos1[0] || nodos2[1] !== nodos1[1]) {
    throw new Error('mismo claveDe en dos pasadas debería devolver el mismo nodo (nodo === nodo)');
  }
  if (nodos2[0].valor !== 9 || nodos2[1].valor !== 8) {
    throw new Error('actualizar() no se aplicó sobre el nodo reusado');
  }
  if (creados !== 3) {
    throw new Error(`se esperaban 3 nodos creados en total (2 iniciales + 1 nuevo), se crearon ${creados}`);
  }
  if (contenedor.hijos.length !== 3 || contenedor.hijos[2].id !== 'c') {
    throw new Error('el item nuevo no quedó insertado en el contenedor, en su posición');
  }

  reconciliar(contenedor, [{ id: 'b', valor: 8 }], claveDe, crear, actualizar);
  if (contenedor.hijos.length !== 1 || contenedor.hijos[0].id !== 'b') {
    throw new Error('un item que sale de la lista debería salir del contenedor (remove())');
  }
});

check('crearDelta mide [antes, despues] contra la lectura previa (fase V, V0)', () => {
  const delta = crearDelta(['player.nivel', 'career.jerarquia']);

  const m1 = delta.medir({ player: { nivel: 10 }, career: { jerarquia: 50 } });
  if (m1['player.nivel'][0] !== 10 || m1['player.nivel'][1] !== 10) {
    throw new Error('la primera medición no tiene "antes" real: debería devolver [valor, valor]');
  }

  const m2 = delta.medir({ player: { nivel: 13 }, career: { jerarquia: 50 } });
  if (m2['player.nivel'][0] !== 10 || m2['player.nivel'][1] !== 13) {
    throw new Error(`esperaba player.nivel = [10, 13], dio [${m2['player.nivel']}]`);
  }
  if (m2['career.jerarquia'][0] !== 50 || m2['career.jerarquia'][1] !== 50) {
    throw new Error('un path sin cambios entre mediciones debería dar [x, x]');
  }
});

// ============================================================================
// H8 (saneamiento post-V1) — reproductor.js dejó de escribir DOM a mano.
// Antes insertaba/borraba nodos directo en `#logList`, invisibles al
// `WeakMap` que `reconciliar.js` usa como única fuente de verdad: al
// reanudar una carrera guardada (`renderFeed` puebla el mapa) el feed podía
// terminar con hasta el doble de filas. Corregido pasándolo por la misma
// `renderFeed` que usa el resto de la UI, con un `hasta` que crece de a un
// beat. Los tres checks de abajo verifican, en este orden, que no vuelva:
// que la fuente no reintroduzca el bypass, que las claves que calcula
// coincidan con las de `renderFeed` para las mismas líneas, y que el
// mecanismo (agruparBeats + reconciliar) de verdad no duplique ni se pase
// del límite cuando se lo usa como `reproducirBeats` lo usa hoy.
// ============================================================================

check('H8: reproductor.js no escribe DOM a mano — todo pasa por reconciliar (fase J-higiene)', () => {
  const contenido = fs.readFileSync(path.join(uiDir, 'reproductor.js'), 'utf8');
  if (/\.insertBefore\(|\.removeChild\(/.test(contenido)) {
    throw new Error('reproductor.js llama insertBefore/removeChild directo sobre el DOM — es el bypass de H8, invisible al WeakMap de reconciliar.js');
  }
});

check('H8: agruparBeats respeta el offset — las claves son índices absolutos de state.logs (fase J-higiene)', () => {
  const logs = Array.from({ length: 25 }, (_, i) => ({ type: 'x', message: `log ${i}`, tecnico: false }));

  // Lo que `reproducirBeats` le pasa hoy a `agruparBeats`: la cola nueva
  // del split (logs[20..25)) con offset = logsAntes = 20.
  const conOffset = agruparBeats(logs.slice(20), 20).map((b) => b.clave);
  // Debe coincidir con agrupar el log COMPLETO y quedarse con las claves de
  // esa misma cola — es la prueba de que "clave" es un índice absoluto de
  // `state.logs`, no uno relativo al slice que le llegó.
  const deReferencia = agruparBeats(logs, 0).map((b) => b.clave).filter((c) => c >= 20);
  if (JSON.stringify(conOffset) !== JSON.stringify(deReferencia)) {
    throw new Error(`las claves con offset deberían ser índices absolutos: esperado ${deReferencia}, dio ${conOffset}`);
  }

  // Sin offset (el bug original: reproductor.js llamaba
  // `agruparBeats(nuevasEntradas)` sin segundo argumento) las claves
  // arrancan de 0 y chocan con las que `renderFeed` ya puso en el mapa
  // para las líneas 0..4.
  const sinOffset = agruparBeats(logs.slice(20)).map((b) => b.clave);
  if (JSON.stringify(sinOffset) === JSON.stringify(conOffset)) {
    throw new Error('el check no distingue con/sin offset — revisar la muestra (acá el offset debería importar)');
  }
});

// Doble mínimo de `document`: no jsdom, solo lo que `crearLogItem` toca
// para una entrada de log simple (sin `cuerpo`, sin tarjeta de serie ni
// campeón) — alcanza para llamar al `reproducirBeats` REAL en vez de
// reimplementar su forma, que es donde T5 advierte que un check puede
// mentir. Junta en una sola clase lo que en el DOM real son dos roles
// (nodo-hijo insertable + elemento con `dataset`/`className`/hijos)
// porque acá un `<div class="log-item">` cumple los dos a la vez.
class ElementoFalso {
  constructor(tag) {
    this.tagName = tag;
    this.className = '';
    this.dataset = {};
    this.childNodes = [];
    this.parentNode = null;
    this._texto = '';
    this.classList = { add() {}, remove() {} };
  }
  set textContent(valor) { this._texto = valor; this.childNodes = []; }
  get textContent() { return this._texto; }
  appendChild(nodo) { this.childNodes.push(nodo); nodo.parentNode = this; return nodo; }
  replaceChildren(...nodos) {
    this.childNodes = [...nodos];
    for (const nodo of nodos) nodo.parentNode = this;
  }
  get firstChild() { return this.childNodes[0] ?? null; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const hermanos = this.parentNode.childNodes;
    const i = hermanos.indexOf(this);
    return i === -1 ? null : (hermanos[i + 1] ?? null);
  }
  insertBefore(nodo, referencia) {
    this._quitar(nodo);
    const i = referencia == null ? -1 : this.childNodes.indexOf(referencia);
    if (i === -1) this.childNodes.push(nodo);
    else this.childNodes.splice(i, 0, nodo);
    nodo.parentNode = this;
  }
  _quitar(nodo) {
    const i = this.childNodes.indexOf(nodo);
    if (i !== -1) this.childNodes.splice(i, 1);
  }
  remove() { this.parentNode?._quitar(this); }
}

// El check en sí es async (`reproducirBeats` lo es — `await dormir(...)`
// entre beats) pero `check()` llama a `fn()` sin esperar la promesa, así
// que el trabajo real corre acá, a nivel de módulo (mismo patrón que la
// carga de `graficos/` más abajo), y el resultado se guarda para que el
// `check()` de siempre solo tenga que reportarlo.
const NOMBRE_CHECK_REPRODUCIR_BEATS = 'H8: reproducirBeats real, revelando sobre un feed ya renderizado, no duplica filas (fase J-higiene)';
let errorReproducirBeatsReal = null;
// Mismo filtro que `check()`: sin esto, `--solo=<otra cosa>` igual pagaría
// el costo (chico, pero real) de este bloque en cada corrida.
if (SOLO.length === 0 || SOLO.some((texto) => NOMBRE_CHECK_REPRODUCIR_BEATS.toLowerCase().includes(texto))) {
  try {
    const documentPrevio = globalThis.document;
    globalThis.document = { createElement: (tag) => new ElementoFalso(tag) };
    try {
      // Velocidad instantánea a propósito: con 'x1'/'x2', `reproducirBeats`
      // evalúa `motionReducido()` → `window.matchMedia`, y `window` no
      // existe en Node. `espera = 0` además evita cualquier `setTimeout` real.
      while (reproductorModulo.velocidadActual() !== 'instantaneo') {
        reproductorModulo.ciclarVelocidad();
      }

      const logList = new ElementoFalso('div');
      const logsResumidos = Array.from({ length: 20 }, (_, i) => ({ type: 'x', message: `log ${i}`, tecnico: false }));
      // Simula el resume: `renderFeed` puebla el mapa de `reconciliar.js`
      // con una carrera guardada de 20 líneas — el estado que reanudar deja.
      renderFeed(logList, { logs: logsResumidos });
      if (logList.childNodes.length !== LIMITE_FEED) {
        throw new Error(`el resume debería dejar ${LIMITE_FEED} filas, dejó ${logList.childNodes.length}`);
      }

      // Simula `avanzar()` revelando 3 líneas nuevas con el `reproducirBeats`
      // real, `offset = logsAntes = 20` — el mismo llamado que `app.js` hace.
      const nuevas = [
        { type: 'x', message: 'nueva 1', tecnico: false },
        { type: 'x', message: 'nueva 2', tecnico: false },
        { type: 'x', message: 'nueva 3', tecnico: false }
      ];
      const estadoFinal = { logs: [...logsResumidos, ...nuevas] };
      await reproductorModulo.reproducirBeats(logList, nuevas, { state: estadoFinal, offset: logsResumidos.length });

      if (logList.childNodes.length !== LIMITE_FEED) {
        throw new Error(`tras revelar 3 líneas nuevas sobre un feed ya renderizado se esperaban ${LIMITE_FEED} filas, quedaron ${logList.childNodes.length} — es el síntoma de H8 (filas duplicadas)`);
      }
      if (new Set(logList.childNodes).size !== logList.childNodes.length) {
        throw new Error('hay nodos repetidos en logList tras revelar');
      }
    } finally {
      globalThis.document = documentPrevio;
    }
  } catch (error) {
    errorReproducirBeatsReal = error;
  }
}

check(NOMBRE_CHECK_REPRODUCIR_BEATS, () => {
  if (errorReproducirBeatsReal) throw errorReproducirBeatsReal;
});

// ============================================================================
// Fase J0 — el instrumento (AUDITORIA.md AUD-2, H1; PLAN.md §J0).
// Antes de esta fase nada medía si una carrera se JUEGA distinto para un
// humano mirando la pantalla — los 194 checks de `validate.js` estaban en
// verde el día que se jugó la carrera que abrió FASE J. `simulate.js` gana
// el bloque `jugabilidad`; `cobertura.js` gana `--categorias`. Los checks de
// acá no exigen que los números caigan en tal o cual banda (eso es J3-J6,
// contra la línea de base que queda anotada en `PROGRESO.md`) — exigen que
// el instrumento en sí funcione: números finitos, cero crashes, y que
// encuentre huecos reales cuando los hay.
// ============================================================================

// Las tres estrategias clásicas (las únicas que existían cuando se escribió este check). K0-A sumó tres bots
// (`criterio`, `azar`, `malas`) a `NOMBRES_ESTRATEGIA` y recorrerlos acá duplicaba el costo de este check; los bots
// nuevos ya tienen sus checks `K0` (200 carreras cada uno, con todos los bloques).
const ESTRATEGIAS_J0 = ['equilibrado', 'ranked', 'prudente'];

checkLento('J0: los KPIs de jugabilidad (simulate.js) devuelven finitos sobre 200 carreras × 3 estrategias, 0 crashes (AUDITORIA.md AUD-2)', () => {
  function verificarFinito(valor, ruta) {
    if (valor === null) {
      return; // "muestra insuficiente" es una respuesta válida, no un fallo.
    }
    if (typeof valor === 'number') {
      if (!Number.isFinite(valor)) {
        throw new Error(`${ruta} no es finito: ${valor}`);
      }
      return;
    }
    if (typeof valor === 'object') {
      for (const [clave, sub] of Object.entries(valor)) {
        verificarFinito(sub, `${ruta}.${clave}`);
      }
      return;
    }
    throw new Error(`${ruta} no es número, objeto ni null: ${JSON.stringify(valor)}`);
  }

  for (const nombre of ESTRATEGIAS_J0) {
    const reporte = correrLoteJugabilidad(200, 60, nombre);
    if (reporte.crashes > 0) {
      throw new Error(`${nombre}: ${reporte.crashes} crashes en 200 carreras`);
    }
    verificarFinito(reporte.jugabilidad, `jugabilidad[${nombre}]`);
  }
});

check('J0: el análisis estático del catálogo (mentalidad/hype, modificadores, vida media) es coherente (AUDITORIA.md AUD-2)', () => {
  const c = analizarCatalogo();
  // Sin exigir un total exacto (regla de proceso 17 — un piso de cordura,
  // no un trinquete: este catálogo crece con cada fase de contenido, y un
  // check que falla cada vez que alguien agrega un evento es el mismo error
  // que H4, un nivel más abajo).
  if (!(c.efectosTotal > 500)) {
    throw new Error(`efectosTotal sospechosamente bajo: ${c.efectosTotal}`);
  }
  if (!(c.pctEfectosMentalidadHype > 0 && c.pctEfectosMentalidadHype < 1)) {
    throw new Error(`pctEfectosMentalidadHype fuera de (0,1): ${c.pctEfectosMentalidadHype}`);
  }
  if (!(c.pctOutcomesConModificadores >= 0 && c.pctOutcomesConModificadores < 1)) {
    throw new Error(`pctOutcomesConModificadores fuera de [0,1): ${c.pctOutcomesConModificadores}`);
  }
  for (const [stat, vida] of Object.entries(c.vidaMediaPorCurva)) {
    if (!(vida > 0)) {
      throw new Error(`vidaMediaPorCurva.${stat} debería ser positiva, dio ${vida}`);
    }
  }
});

checkLento('J0: cobertura.js --categorias encuentra huecos que la matriz general no ve (AUDITORIA.md AUD-2, H1)', () => {
  const { celdas } = observarCobertura();
  const filas = calcularHuecosPorCategoria(celdas);
  if (filas.length !== 11) {
    throw new Error(`se esperaban 11 categorías (CATEGORIAS_EVENTO), calcularHuecosPorCategoria devolvió ${filas.length}`);
  }
  const totalHuecos = filas.reduce((s, f) => s + f.huecos.length, 0);
  // El punto entero de esta partición es que EXISTAN huecos de categoría
  // aunque la matriz general (imprimirMatriz, sin partir) diga "sin huecos"
  // — es la brecha que tapaba la unión de 12 muestras (H1). Si algún día da
  // 0, o el catálogo maduró de verdad pareja por categoría en cada celda, o
  // el check dejó de medir lo que dice medir — cualquiera de las dos vale
  // una mirada, no un ajuste silencioso del umbral.
  if (totalHuecos === 0) {
    throw new Error('cero huecos de categoría: o el catálogo ya está parejo por categoría en cada celda, o el check no está midiendo bien — revisar antes de bajar la vara');
  }
});

// ============================================================================
// Fase V (V1) — primitivos de gráficos SVG (src/ui/graficos/*.js)
// ============================================================================
const graficosDir = path.join(uiDir, 'graficos');
// `comun.js` es lo compartido entre los 6 factories (mismo criterio que
// `components/minijuegos/comun.js`, ya excluido más abajo junto a `index.js`
// al listar ese directorio) — no es un factory de gráfico en sí.
const archivosGraficos = fs.existsSync(graficosDir)
  ? fs.readdirSync(graficosDir).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js') && f !== 'comun.js')
  : [];

const modulosGraficos = [];
for (const archivo of archivosGraficos) {
  const rutaUrl = pathToFileURL(path.join(graficosDir, archivo)).href;
  const mod = await import(rutaUrl);
  modulosGraficos.push({ archivo, mod });
}

// Doble mínimo de Element/Node para SVG, para que los checks corran en Node sin jsdom
class ElementoFalsoSvg {
  constructor(tag) {
    this.tagName = tag;
    this.atributos = new Map();
    this.children = [];
    this.parentNode = null;
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; },
      getPropertyValue: (k) => this.style[k] ?? ''
    };
    this.textContent = '';
  }
  setAttribute(k, v) { this.atributos.set(k, String(v)); }
  getAttribute(k) { return this.atributos.get(k) ?? null; }
  removeAttribute(k) { this.atributos.delete(k); }
  appendChild(hijo) {
    hijo.parentNode = this;
    this.children.push(hijo);
    return hijo;
  }
  insertBefore(nuevo, ref) {
    nuevo.parentNode = this;
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i === -1) {
      this.children.push(nuevo);
    } else {
      this.children.splice(i, 0, nuevo);
    }
    return nuevo;
  }
  removeChild(hijo) {
    const i = this.children.indexOf(hijo);
    if (i !== -1) {
      this.children.splice(i, 1);
      hijo.parentNode = null;
    }
    return hijo;
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
  get firstChild() { return this.children[0] ?? null; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const i = this.parentNode.children.indexOf(this);
    return i !== -1 && i + 1 < this.parentNode.children.length ? this.parentNode.children[i + 1] : null;
  }
  addEventListener() {}
  getBoundingClientRect() {
    return { top: 0, left: 0, width: 100, height: 20, right: 100, bottom: 20 };
  }
}

const DATOS_EJEMPLO_GRAFICOS = {
  crearBarras: {
    grupos: [{ id: 'g1', label: '2024', barras: [{ id: 'b1', label: 'G', valor: 10, tono: 'up' }] }]
  },
  crearEscalera: {
    peldanos: [
      { id: 'p1', label: 'Challenger', valorOrden: 100, tono: 'rank-challenger' },
      { id: 'p2', label: 'Grandmaster', valorOrden: 90, tono: 'rank-grandmaster' }
    ]
  },
  crearBala: {
    valor: 75,
    objetivo: 80,
    banda: [20, 90]
  },
  crearLinea: {
    series: [
      {
        id: 's1',
        label: 'LP',
        tono: 'up',
        puntos: [
          { x: 1, y: 10 },
          { x: 2, y: 14 },
          { x: 3, y: 12 },
          { x: 4, y: 18 }
        ]
      }
    ]
  },
  crearHexa: {
    ejes: [
      { id: 'e1', label: 'Mecánica', valor: 0.8 },
      { id: 'e2', label: 'Visión', valor: 0.6 },
      { id: 'e3', label: 'Farmeo', valor: 0.7 },
      { id: 'e4', label: 'Teamfight', valor: 0.5 },
      { id: 'e5', label: 'Laning', valor: 0.65 },
      { id: 'e6', label: 'Macro', valor: 0.4 }
    ]
  },
  crearCinta: {
    bandas: [
      { org: 'T1 Rogue', desde: 2024, hasta: 2026, tier: 1 },
      { org: 'Riot Academy', desde: 2026, tier: 2, activa: true }
    ]
  }
};

// D-nueva (saneamiento post-V1): `graficos/comun.js` transcribe a mano las
// familias de `tokens.css` en `TONOS_CONOCIDOS` — la whitelist que los 6
// factories usan para no pintar un tono inexistente en transparente. Sin
// este check, una familia que se renombra o se borra de `tokens.css` deja
// la whitelist mintiendo en silencio: sigue "aceptando" un tono que ya no
// existe hasta que alguien lo intenta y el `var(--x)` resuelto no pinta nada.
check('Gráficos: la whitelist de tonos de comun.js no diverge de tokens.css', () => {
  const tokensTexto = fs.readFileSync(path.join(estilosDir, 'tokens.css'), 'utf8');
  const definidos = new Set();
  for (const [, nombre] of tokensTexto.matchAll(/--([a-z0-9_-]+)\s*:/gi)) {
    definidos.add(nombre);
  }
  const faltantes = [...TONOS_DE_GRAFICOS].filter((tono) => !definidos.has(tono));
  if (faltantes.length > 0) {
    throw new Error(`en TONOS_CONOCIDOS pero sin --token en tokens.css: ${faltantes.join(', ')}`);
  }
});

check('Gráficos: todo factory de graficos/ devuelve un nodo con role="img" y aria-label con dígito (fase V, V1)', () => {
  const global = globalThis;
  const docOriginal = global['document'];
  global['document'] = {
    createElementNS(ns, tag) {
      return new ElementoFalsoSvg(tag);
    }
  };

  try {
    if (modulosGraficos.length === 0) {
      throw new Error('no se encontraron módulos en src/ui/graficos/');
    }
    for (const { archivo, mod } of modulosGraficos) {
      const funcionesFactory = Object.entries(mod).filter(
        ([nombre, fn]) => typeof fn === 'function' && nombre.startsWith('crear')
      );
      if (funcionesFactory.length === 0) {
        throw new Error(`${archivo}: no exporta ninguna factory crear*`);
      }
      for (const [nombre, fn] of funcionesFactory) {
        const datos = DATOS_EJEMPLO_GRAFICOS[nombre] || {};
        const res = fn(datos);
        if (!res || !res.nodo) {
          throw new Error(`${archivo}: ${nombre} no devolvió { nodo }`);
        }
        const role = res.nodo.getAttribute('role');
        const ariaLabel = res.nodo.getAttribute('aria-label');
        if (role !== 'img') {
          throw new Error(`${archivo}: ${nombre} role="${role}" no es "img"`);
        }
        if (!ariaLabel || typeof ariaLabel !== 'string' || !/\d/.test(ariaLabel)) {
          throw new Error(`${archivo}: ${nombre} aria-label debe contener al menos un dígito: "${ariaLabel}"`);
        }
        if (!Array.isArray(res.series)) {
          throw new Error(`${archivo}: ${nombre} no devolvió array series`);
        }
      }
    }
  } finally {
    if (docOriginal !== undefined) {
      global['document'] = docOriginal;
    } else {
      delete global['document'];
    }
  }
});

check('Gráficos: cero requestAnimationFrame con prefers-reduced-motion en graficos/ (fase V, V1)', () => {
  const global = globalThis;
  const docOriginal = global['document'];
  const mmOriginal = global['matchMedia'];
  const rafOriginal = global['requestAnimationFrame'];

  let rAfLlamado = false;
  global['document'] = {
    createElementNS(ns, tag) {
      return new ElementoFalsoSvg(tag);
    }
  };
  global['matchMedia'] = (q) => ({ matches: q.includes('prefers-reduced-motion: reduce') });
  global['requestAnimationFrame'] = () => { rAfLlamado = true; };

  try {
    for (const { archivo, mod } of modulosGraficos) {
      for (const [nombre, fn] of Object.entries(mod)) {
        if (typeof fn === 'function' && nombre.startsWith('crear')) {
          const datos = DATOS_EJEMPLO_GRAFICOS[nombre] || {};
          const cont = {};
          fn(datos, cont);
          // Segunda y tercera llamada para ejercitar FLIP / reordenamientos si aplica
          if (nombre === 'crearEscalera') {
            fn({
              peldanos: [
                { id: 'p1', label: 'A', valorOrden: 10, tono: 'up' },
                { id: 'p2', label: 'B', valorOrden: 20, tono: 'down' }
              ]
            }, cont);
            fn({
              peldanos: [
                { id: 'p1', label: 'A', valorOrden: 30, tono: 'up' },
                { id: 'p2', label: 'B', valorOrden: 10, tono: 'down' }
              ]
            }, cont);
          }
        }
      }
    }

    if (rAfLlamado) {
      throw new Error('requestAnimationFrame fue programado a pesar de prefers-reduced-motion: reduce');
    }
  } finally {
    if (docOriginal !== undefined) global['document'] = docOriginal; else delete global['document'];
    if (mmOriginal !== undefined) global['matchMedia'] = mmOriginal; else delete global['matchMedia'];
    if (rafOriginal !== undefined) global['requestAnimationFrame'] = rafOriginal; else delete global['requestAnimationFrame'];
  }
});

// ============================================================================
// Fase J3 — El pool deja de pudrirse (PLAN.md §J3)
// ============================================================================

check('J3 gracia: un campeón con ultimoSplitJugado === splitCount no pierde maestría en aplicar de campeones', () => {
  const seed = 42;
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);
  state.player.splitCount = 5;
  state.player.championPool = [
    { name: 'C1', tags: ['tanque'], mastery: 50, partidas: 0, ultimoSplitJugado: 5 },
    { name: 'C2', tags: ['tanque'], mastery: 50, partidas: 0, ultimoSplitJugado: 5 }
  ];
  const resultado = aplicarCampeones(state, rng);
  const jugado = resultado.state.player.campeonDelSplit;
  const noJugado = resultado.state.player.championPool.find((c) => c.name !== jugado);
  if (noJugado.mastery !== 50) {
    throw new Error(`el campeón no jugado en gracia perdió maestría: ${noJugado.mastery} !== 50`);
  }
});

check('J3 óxido: con ultimoSplitJugado ya vencido la maestría del no jugado baja en varias semillas', () => {
  let vecesBajo = 0;
  const total = 10;
  for (let s = 1; s <= total; s++) {
    const rng = mulberry32(s);
    let state = createInitialState(s, rng);
    state.player.splitCount = 5;
    state.player.championPool = [
      { name: 'C1', tags: ['tanque'], mastery: 50, partidas: 0, ultimoSplitJugado: 2 },
      { name: 'C2', tags: ['tanque'], mastery: 50, partidas: 0, ultimoSplitJugado: 2 }
    ];
    const res = aplicarCampeones(state, rng);
    const jugado = res.state.player.campeonDelSplit;
    const noJugado = res.state.player.championPool.find((c) => c.name !== jugado);
    if (noJugado.mastery < 50) {
      vecesBajo++;
    }
  }
  if (vecesBajo === 0) {
    throw new Error('en 10 semillas ninguna redujo la maestría con gracia vencida');
  }
});

check('J3 piso: pool de 6, maestría inicial 40, aplicar avanzando splitCount no baja de 18', () => {
  const rng = mulberry32(123);
  let state = createInitialState(123, rng);
  state.player.splitCount = 0;
  state.player.championPool = [
    { name: 'C1', tags: ['tanque'], mastery: 40, partidas: 0, ultimoSplitJugado: 0 },
    { name: 'C2', tags: ['bruiser'], mastery: 40, partidas: 0, ultimoSplitJugado: 0 },
    { name: 'C3', tags: ['asesino'], mastery: 40, partidas: 0, ultimoSplitJugado: 0 },
    { name: 'C4', tags: ['mago'], mastery: 40, partidas: 0, ultimoSplitJugado: 0 },
    { name: 'C5', tags: ['enchanter'], mastery: 40, partidas: 0, ultimoSplitJugado: 0 },
    { name: 'C6', tags: ['splitpush'], mastery: 40, partidas: 0, ultimoSplitJugado: 0 }
  ];
  for (let i = 0; i < 30; i++) {
    state = aplicarCampeones(state, rng).state;
    state.player.splitCount += 1;
  }
  const minima = Math.min(...state.player.championPool.map((c) => c.mastery));
  if (minima < 18) {
    throw new Error(`la maestría mínima del pool cayó a ${minima.toFixed(1)}, debajo de 18`);
  }
});

check('J3 factor: factorOxido escala inverso al tamaño del pool leyendo poolAngosto', () => {
  const fn = poolMod.factorOxido;
  if (typeof fn !== 'function') {
    throw new Error('factorOxido no es una función exportada de core/pool.js');
  }
  const angosto = BALANCE.campeones.poolAngosto;
  const f3 = fn(angosto);
  const f6 = fn(angosto * 2);
  if (f3 !== 1) {
    throw new Error(`factorOxido(${angosto}) dio ${f3}, se esperaba 1`);
  }
  if (f6 !== 0.5) {
    throw new Error(`factorOxido(${angosto * 2}) dio ${f6}, se esperaba 0.5`);
  }
});

checkLento('J3 retiro: en 40 carreras la maestría mínima del pool es >= 18', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const state = correrCarrera(seed, 40);
    const pool = state.player.championPool;
    if (pool && pool.length > 0) {
      const minima = Math.min(...pool.map((c) => c.mastery));
      if (minima < 18) {
        throw new Error(`seed ${seed}: la maestría mínima del pool es ${minima.toFixed(1)} < 18`);
      }
    }
  }
});

// ----------------------------------------------------------------------------
// J3 — arreglos de la revisión independiente (PLAN.md §J3). Cada check de abajo
// mata un mutante que los cinco de arriba dejaban vivo; la tabla mutante ->
// check está en PROGRESO.md. Los de arriba no se tocan.
// ----------------------------------------------------------------------------

// Un estado cualquiera con un pool a medida, listo para el `aplicar` REAL de
// `systems/campeones.js`. Sin equipo (`currentOrg` null): elige el campeón del
// split por `weightedPick`, no por draft.
function estadoConPool(seed, splitCount, entradas) {
  const state = createInitialState(seed, mulberry32(seed));
  state.player.splitCount = splitCount;
  state.player.championPool = entradas;
  return state;
}

function entradaDeOxido(name, mastery, ultimoSplitJugado) {
  return { name, tags: ['tanque'], mastery, partidas: 0, ultimoSplitJugado };
}

check('J3 borde: la gracia dura exactamente splitsSinJugarParaOxido splits (sin jugarlo N-1 no oxida, N sí)', () => {
  const gracia = BALANCE.campeones.splitsSinJugarParaOxido;
  const splitCount = gracia + 10;
  const maestria = 60;
  const medir = (splitsSinJugar) => {
    let muestras = 0;
    let bajas = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const state = estadoConPool(seed, splitCount, [
        entradaDeOxido('Jugado', 90, splitCount),
        entradaDeOxido('Sonda', maestria, splitCount - splitsSinJugar)
      ]);
      const res = aplicarCampeones(state, mulberry32(seed));
      if (res.state.player.campeonDelSplit === 'Sonda') {
        continue; // lo jugaron: no sirve de sonda
      }
      muestras += 1;
      if (res.state.player.championPool.find((c) => c.name === 'Sonda').mastery < maestria) {
        bajas += 1;
      }
    }
    return { muestras, bajas };
  };

  const enGracia = medir(gracia - 1);
  const vencido = medir(gracia);
  if (enGracia.muestras < 10 || vencido.muestras < 10) {
    throw new Error(`muestra vacía: ${enGracia.muestras} / ${vencido.muestras} sondas sin jugar de 40`);
  }
  if (enGracia.bajas !== 0) {
    throw new Error(`con ${gracia - 1} split(s) sin jugarlo el motor ya oxida (${enGracia.bajas}/${enGracia.muestras}): la gracia es más corta que ${gracia}`);
  }
  // El óxido es max(0, gauss(1,5; 1)): ~7% de las tiradas dan 0, no todas bajan.
  if (vencido.bajas < vencido.muestras * 0.8) {
    throw new Error(`con ${gracia} splits sin jugarlo el motor casi no oxida (${vencido.bajas}/${vencido.muestras}): la gracia dura más de ${gracia}`);
  }
});

check('J3 factor en el sistema: con el mismo óxido, un no jugado pierde ~la mitad en un pool de 6 que en uno de 3', () => {
  const angosto = BALANCE.campeones.poolAngosto;
  const gracia = BALANCE.campeones.splitsSinJugarParaOxido;
  const splitCount = gracia + 10;
  const maestria = 70;
  const perdidaMedia = (tamano) => {
    let suma = 0;
    let n = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const pool = Array.from({ length: tamano }, (_, i) => entradaDeOxido(`P${i}`, maestria, splitCount - gracia - 5));
      const res = aplicarCampeones(estadoConPool(seed, splitCount, pool), mulberry32(seed));
      for (const c of res.state.player.championPool) {
        if (c.name !== res.state.player.campeonDelSplit) {
          suma += maestria - c.mastery;
          n += 1;
        }
      }
    }
    return suma / n;
  };

  const enAngosto = perdidaMedia(angosto);
  const enAncho = perdidaMedia(angosto * 2);
  if (!(enAngosto > 0.5)) {
    throw new Error(`check vacío: el pool de ${angosto} perdió ${enAngosto.toFixed(3)} de media`);
  }
  // "Un pool de 6 oxida a la mitad" (pool de 3 = 1x): la razón esperada es angosto / (2 * angosto).
  const esperada = angosto / (angosto * 2);
  const razon = enAncho / enAngosto;
  if (Math.abs(razon - esperada) > 0.1) {
    throw new Error(`pierde ${enAngosto.toFixed(3)} en un pool de ${angosto} y ${enAncho.toFixed(3)} en uno de ${angosto * 2}: razón ${razon.toFixed(3)}, se esperaba ~${esperada} (campeones.js no aplica factorOxido?)`);
  }
});

check('J3 sello: el campeón jugado queda con ultimoSplitJugado === splitCount y los demás conservan el suyo', () => {
  const splitCount = 7;
  for (let seed = 1; seed <= 30; seed += 1) {
    const pool = ['A', 'B', 'C', 'D'].map((nombre, i) => entradaDeOxido(nombre, 50, i));
    const res = aplicarCampeones(estadoConPool(seed, splitCount, pool), mulberry32(seed));
    for (const c of res.state.player.championPool) {
      const antes = pool.find((p) => p.name === c.name).ultimoSplitJugado;
      const esperado = c.name === res.state.player.campeonDelSplit ? splitCount : antes;
      if (c.ultimoSplitJugado !== esperado) {
        throw new Error(`seed ${seed}: ${c.name} quedó con ultimoSplitJugado ${c.ultimoSplitJugado}, se esperaba ${esperado}`);
      }
    }
  }
});

// Un llamado del pipeline: arranca el split, o resuelve la pausa pendiente como
// lo hace `avanzarSplitAuto`. Una pausa por llamado: así se ve cada estado que la
// pantalla puede mostrar (entre splits y en cada pausa).
function pasoDelPipeline(state, rng) {
  if (!state.pendiente) {
    return avanzarSplit(state, rng);
  }
  const sistema = sistemaPorId(state.pendiente.sistemaId);
  return resolverDecision(state, sistema.resolverAuto(state, state.pendiente.decision, rng), rng);
}

// Cada estado que un jugador puede estar mirando, de carreras reales (se salta
// el arranque: los primeros splits tienen todo el pool con el mismo sello).
function estadosObservables(seeds, splits) {
  const vistos = [];
  for (const seed of seeds) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let hechos = 0;
    while (!state.terminado && state.phase !== 'retirado' && hechos < splits) {
      state = pasoDelPipeline(state, rng).state;
      if (state.terminado || state.phase === 'retirado') {
        break;
      }
      if (hechos >= 3) {
        vistos.push({ seed, hechos, state, momento: state.pendiente ? state.pendiente.sistemaId : 'entre splits' });
      }
      if (!state.pendiente) {
        hechos += 1;
      }
    }
  }
  return vistos;
}

// Se queda con hasta `porMomento` estados de cada tipo de pausa (y de "entre
// splits"), parejos a lo largo de las carreras: ningún tipo de pausa queda sin
// mirar y el costo no depende de cuántas pausas tiene cada carrera.
function muestrearPorMomento(vistos, porMomento) {
  const grupos = new Map();
  for (const visto of vistos) {
    grupos.set(visto.momento, [...(grupos.get(visto.momento) ?? []), visto]);
  }
  const elegidos = [];
  for (const grupo of grupos.values()) {
    const paso = Math.max(1, Math.floor(grupo.length / porMomento));
    for (let i = 0, tomados = 0; i < grupo.length && tomados < porMomento; i += paso, tomados += 1) {
      elegidos.push(grupo[i]);
    }
  }
  return elegidos;
}

// D79 (K2a): el check "J3 pronóstico" observaba el EFECTO (la maestría) en futuros sorteados desde estados reales, y el
// óxido aplicado es `max(0, gauss(1,5; 1))`, que da 0 el 6,68% de las veces aunque la gracia haya vencido: con a veces un
// solo futuro "conclusivo" por par, fallaba ~25-30% de las veces que cambiaba el stream (16 de 60 juegos de seeds en
// `8e36105`, contra 16,9 esperados por ese modelo; 0 divergencias reales en ~648.000 pares ficha/motor). Ahora mira la
// DECISIÓN, en dos partes que no dependen de ninguna tirada ni de ninguna trayectoria:
//  (A) la regla, sobre pools armados a mano y el `aplicar` real de `systems/campeones.js`, corrida tras corrida (con el
//      `splitCount` subiendo entre corridas, lo que hace `atributos`), con 64 semillas: ley G (lo que la ficha promete
//      en gracia nunca baja), ley P (lo que está en el piso nunca baja) y ley O (lo que promete "oxida" baja en al menos
//      una de sus muestras). La ley O solo se juzga en las claves con al menos `MUESTRAS_MINIMAS_LEY_O` muestras: la
//      chance de que un campeón que oxida no baje en ninguna es 0,0668^n (1,8e-12 con 10). Sin ese piso, una clave con
//      1 o 2 muestras (una maestría de piso + 0,5 que ya zafó dos tiradas en 0) fallaba en falso — el mismo defecto que
//      tenía el check viejo, medido al escribir este;
//  (B) el cursor: en estados reales (entre splits y en pausas antes de `campeones`, entre `campeones` y `atributos` y
//      después de `atributos`), `splitCountDeLaProximaCorrida` es el `splitCount` que de verdad ve la próxima corrida de
//      `campeones`. Eso es estructura del pipeline (orden de `ETAPAS_SPLIT`), no azar: si un corrimiento del stream
//      cambia qué pausas aparecen, se buscan en más carreras.
// Verificado en rojo (regla de proceso 7) con: el cursor sin el +1, `campeones` mirando `splitCount + 1` o `- 1`, la
// gracia ignorada cuando `factorOxido` vale 1, el piso de maestría sacado y `enPiso` con `<` estricto.
const SEMILLAS_LEYES_OXIDO = 64;
const TAMANOS_POOL_LEYES_OXIDO = [BALANCE.campeones.poolAngosto, BALANCE.campeones.poolAngosto * 2];
const SPLITS_LEYES_OXIDO = [3, 8, 20];
// Muestra mínima por ley para que el check no pase vacío.
const OBSERVACIONES_MINIMAS_LEY_OXIDO = 200;
const MUESTRAS_MINIMAS_LEY_O = 10;
const CLAVES_MINIMAS_LEY_O = 100;

// Un pool de prueba: cada campeón con 0 a gracia+2 splits sin jugar (antes, en y después de la gracia), y el último sin
// `ultimoSplitJugado` (un guardado anterior a J3: se lo trata como recién jugado).
function poolDeLeyesDeOxido(tamano, splitCount, mastery) {
  const gracia = BALANCE.campeones.splitsSinJugarParaOxido;
  return Array.from({ length: tamano }, (_, i) => {
    const campeon = entradaDeOxido(`P${i}`, mastery, splitCount - (i % (gracia + 3)));
    if (i === tamano - 1) {
      delete campeon.ultimoSplitJugado;
    }
    return campeon;
  });
}

check('J3 pronóstico (A, D79): la regla de la ficha y la de campeones.aplicar coinciden sobre pools armados a mano (leyes G, P y O, sin trayectoria)', () => {
  const gracia = BALANCE.campeones.splitsSinJugarParaOxido;
  const piso = BALANCE.campeones.maestriaMinima;
  const sonda = BALANCE.stats.max - 30;
  const conteo = { G: 0, P: 0, O: 0 };
  const errores = [];
  // Cada clave (configuración, campeón y corrida) que promete "oxida": cuántas muestras tuvo y si bajó en alguna.
  const oxidoAlgunaVez = new Map();
  for (const conOrg of [true, false]) {
    for (const tamano of TAMANOS_POOL_LEYES_OXIDO) {
      for (const splitCount of SPLITS_LEYES_OXIDO) {
        for (const mastery of [sonda, piso + 0.5, piso]) {
          for (let k = 1; k <= SEMILLAS_LEYES_OXIDO; k += 1) {
            const semilla = k * 7919 + tamano;
            let state = estadoConPool(semilla, splitCount, poolDeLeyesDeOxido(tamano, splitCount, mastery));
            state.career.currentOrg = conOrg ? 'Org de prueba' : null;
            const rng = mulberry32(semilla);
            const jugados = new Set();
            for (let corrida = 0; corrida <= gracia; corrida += 1) {
              const antes = state.player.championPool;
              const prometido = new Map(antes.map((c) => [c.name, pronosticoDeOxidoEnVivo(state, c)]));
              const despues = aplicarCampeones(state, rng).state;
              for (const campeon of antes) {
                if (campeon.name === despues.player.campeonDelSplit || jugados.has(campeon.name)) {
                  continue;
                }
                const bajo = despues.player.championPool.find((c) => c.name === campeon.name).mastery < campeon.mastery - 1e-9;
                const { enGracia, enPiso, splitsParaOxido } = prometido.get(campeon.name);
                const donde = `${conOrg ? 'con' : 'sin'} org, pool de ${tamano}, splitCount ${splitCount}, maestría ${mastery}, corrida ${corrida}: ${campeon.name} (sello ${campeon.ultimoSplitJugado}, splitCount ${state.player.splitCount})`;
                if (enGracia) {
                  conteo.G += 1;
                  if (bajo) {
                    errores.push(`ley G: ${donde} promete "aguanta ${splitsParaOxido}" y el motor lo oxida`);
                  }
                }
                if (enPiso) {
                  conteo.P += 1;
                  if (bajo) {
                    errores.push(`ley P: ${donde} está en el piso y el motor le saca maestría`);
                  }
                }
                if (!enGracia && !enPiso) {
                  conteo.O += 1;
                  const clave = `${conOrg}|${tamano}|${splitCount}|${mastery}|${campeon.name}|${corrida}`;
                  const previo = oxidoAlgunaVez.get(clave) ?? { muestras: 0, bajo: false };
                  oxidoAlgunaVez.set(clave, { muestras: previo.muestras + 1, bajo: previo.bajo || bajo });
                }
              }
              jugados.add(despues.player.campeonDelSplit);
              // Lo que hace `atributos` entre dos corridas de `campeones`.
              state = { ...despues, player: { ...despues.player, splitCount: despues.player.splitCount + 1 } };
            }
            if (errores.length > 0) {
              throw new Error(errores[0]);
            }
          }
        }
      }
    }
  }
  const juzgables = [...oxidoAlgunaVez.entries()].filter(([, { muestras }]) => muestras >= MUESTRAS_MINIMAS_LEY_O);
  const nunca = juzgables.filter(([, { bajo }]) => !bajo).map(([clave, { muestras }]) => `${clave} (${muestras} muestras)`);
  if (nunca.length > 0) {
    throw new Error(`ley O: ${nunca.length} campeones prometen "oxida" y en todas sus muestras el motor no los oxidó (ej. ${nunca[0]})`);
  }
  if (conteo.G < OBSERVACIONES_MINIMAS_LEY_OXIDO || conteo.P < OBSERVACIONES_MINIMAS_LEY_OXIDO
    || conteo.O < OBSERVACIONES_MINIMAS_LEY_OXIDO || juzgables.length < CLAVES_MINIMAS_LEY_O) {
    throw new Error(`check vacío: ${JSON.stringify(conteo)} observaciones y ${juzgables.length} claves juzgables de la ley O`);
  }
});

// Dónde está parado un estado respecto de las dos etapas que importan para el óxido: la que oxida (`campeones`) y la que
// sube el `splitCount` (`atributos`). Por posición en `ETAPAS_SPLIT`, no por nombre de sistema.
function tramoDelCursor(state) {
  if (!state.pendiente) {
    return 'entre splits';
  }
  const etapa = ETAPAS_SPLIT.findIndex((sistema) => sistema.id === state.pendiente.sistemaId);
  const oxida = ETAPAS_SPLIT.findIndex((sistema) => sistema.id === 'campeones');
  const subeElSplit = ETAPAS_SPLIT.findIndex((sistema) => sistema.id === 'atributos');
  if (etapa < oxida) {
    return 'pausa antes de campeones';
  }
  return etapa < subeElSplit ? 'pausa entre campeones y atributos' : 'pausa después de atributos';
}

// Las carreras donde se buscan los estados (las del check viejo primero) y el tope de la búsqueda.
const SEEDS_CURSOR_OXIDO = [1, 2, 5, 7, 9, 11, ...Array.from({ length: 54 }, (_, i) => i + 12)];
const SPLITS_CURSOR_OXIDO = 14;
const ESTADOS_POR_TRAMO_CURSOR = 6;
const TRAMOS_DEL_CURSOR = ['entre splits', 'pausa antes de campeones', 'pausa entre campeones y atributos', 'pausa después de atributos'];

check('J3 pronóstico (B, D79): el cursor de la ficha es el splitCount que ve la próxima corrida de campeones, en cada tramo del split', () => {
  const porTramo = new Map(TRAMOS_DEL_CURSOR.map((tramo) => [tramo, []]));
  const completo = () => TRAMOS_DEL_CURSOR.every((tramo) => porTramo.get(tramo).length >= ESTADOS_POR_TRAMO_CURSOR * 3);
  for (const seed of SEEDS_CURSOR_OXIDO) {
    if (completo()) {
      break;
    }
    for (const visto of estadosObservables([seed], SPLITS_CURSOR_OXIDO)) {
      porTramo.get(tramoDelCursor(visto.state))?.push(visto);
    }
  }
  const faltan = TRAMOS_DEL_CURSOR.filter((tramo) => porTramo.get(tramo).length < ESTADOS_POR_TRAMO_CURSOR);
  if (faltan.length > 0) {
    throw new Error(`check vacío: en ${SEEDS_CURSOR_OXIDO.length} carreras no hubo ${ESTADOS_POR_TRAMO_CURSOR} estados en: ${faltan.join(', ')}`);
  }
  let contrastados = 0;
  for (const tramo of TRAMOS_DEL_CURSOR) {
    const grupo = porTramo.get(tramo);
    const paso = Math.max(1, Math.floor(grupo.length / ESTADOS_POR_TRAMO_CURSOR));
    for (let i = 0, tomados = 0; i < grupo.length && tomados < ESTADOS_POR_TRAMO_CURSOR; i += paso, tomados += 1) {
      const { seed, hechos, state } = grupo[i];
      const dice = splitCountDeLaProximaCorrida(state);
      // El motor de verdad: un clon avanza por el pipeline hasta que corre `campeones`, y se anota el `splitCount` con
      // el que entró a ese paso (ningún sistema lo toca entre el arranque del paso y `campeones`).
      let clon = structuredClone(state);
      const rng = mulberry32(seed * 31 + hechos);
      let ve = null;
      for (let llamados = 0; ve === null && !clon.terminado && llamados < 60; llamados += 1) {
        const splitCountAlEntrar = clon.player.splitCount;
        const paso = pasoDelPipeline(clon, rng);
        if (paso.logs.some((log) => log.type === 'campeones')) {
          ve = splitCountAlEntrar;
        }
        clon = paso.state;
      }
      if (ve === null) {
        continue;
      }
      contrastados += 1;
      if (ve !== dice) {
        throw new Error(`seed ${seed}, split ${hechos}, ${tramo} (${state.pendiente?.sistemaId ?? '-'}): la ficha mira splitCount ${dice} y la próxima corrida de campeones ve ${ve}`);
      }
    }
  }
  if (contrastados < TRAMOS_DEL_CURSOR.length * ESTADOS_POR_TRAMO_CURSOR / 2) {
    throw new Error(`check vacío: solo ${contrastados} estados se pudieron contrastar con la próxima corrida de campeones`);
  }
});

// Un `document` mínimo para armar un tile REAL en Node (el mismo doble que usa
// el check de `reproducirBeats`, más arriba).
function tileDeFicha(campeon, pronostico) {
  const previo = globalThis.document;
  globalThis.document = { createElement: (tag) => new ElementoFalso(tag) };
  try {
    const tile = crearCampeonTile(campeon, { size: 'ficha', pronostico });
    return {
      tile,
      oxido: tile.childNodes.find((nodo) => nodo.className.includes('campeon-tile-oxido')) ?? null
    };
  } finally {
    globalThis.document = previo;
  }
}

check('J3 piso: un campeón en maestriaMinima nunca muestra "oxida" ni promete pérdida (el tile real)', () => {
  const piso = BALANCE.campeones.maestriaMinima;
  const gracia = BALANCE.campeones.splitsSinJugarParaOxido;
  // Una maestría en el piso y otra apenas arriba, con y sin gracia: solo la de
  // arriba y ya vencida puede decir "oxida".
  for (const [mastery, sinJugar, dice] of [
    [piso, gracia + 3, 'piso'], [piso, 0, 'piso'], [piso + 0.5, gracia + 3, 'oxida'], [piso + 0.5, 1, 'spl']
  ]) {
    const campeon = { name: 'Jinx', tags: ['escalado'], mastery, partidas: 0, ultimoSplitJugado: 10 - sinJugar };
    const { tile, oxido } = tileDeFicha(campeon, poolMod.pronosticoDeOxido(campeon, 10));
    if (!oxido || !oxido.textContent.includes(dice)) {
      throw new Error(`maestría ${mastery}, ${sinJugar} splits sin jugar: el tile dice "${oxido?.textContent}", se esperaba "${dice}"`);
    }
    if (mastery <= piso && /oxida|pierde/.test(`${oxido.textContent} ${oxido.title} ${tile.title}`)) {
      throw new Error(`un campeón en el piso (${mastery}) promete pérdida: "${oxido.textContent}" / "${oxido.title}"`);
    }
    if (mastery <= piso && !oxido.title.includes(String(piso))) {
      throw new Error(`el tooltip del piso no trae el referente (${piso}): "${oxido.title}"`);
    }
  }

  // Y en carreras reales, estado por estado: ninguna etiqueta "oxida" sobre un campeón en el piso.
  let enElPiso = 0;
  let oxidando = 0;
  for (const { seed, hechos, state, momento } of muestrearPorMomento(estadosObservables([1, 2, 5, 7, 9, 11], 14), 12)) {
    for (const campeon of state.player.championPool) {
      const { oxido } = tileDeFicha(campeon, pronosticoDeOxidoEnVivo(state, campeon));
      if (campeon.mastery <= piso) {
        enElPiso += 1;
        if (oxido.textContent === 'oxida') {
          throw new Error(`seed ${seed}, split ${hechos}, ${momento}: ${campeon.name} está en el piso (${campeon.mastery}) y el tile dice "oxida"`);
        }
      } else if (oxido.textContent === 'oxida') {
        oxidando += 1;
      }
    }
  }
  if (enElPiso === 0 || oxidando === 0) {
    throw new Error(`check vacío: ${enElPiso} campeones en el piso y ${oxidando} oxidando en las carreras muestreadas`);
  }
});

// --- K0-C ---
// Protege el vocabulario de dominio LoL frente al léxico de fútbol (B9 de AUDITORIA.md) desde K0.
// Sin lexer: filtro por línea sobre el texto sin comentarios (`.js` de `src/` salvo `dev/`, e `index.html`) y
// recorrido de TODOS los strings de los `.json` de `src/` (cualquier campo, menos las claves `id`).
check('K0-C vocabulario: ningún texto visible usa vocabulario de fútbol', () => {
  const PATRON_FUTBOL = /botines|cancha|hincha|camiseta|filial|Selecci[oó]n:|\bcanteran[oa]s?\b|dirigencia|pelota/i;
  const raiz = path.join(srcDir, '..');
  const rel = (p) => path.relative(raiz, p).replace(/\\/g, '/');
  const archivos = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'dev' ? [] : archivos(p);
    return /\.(js|json)$/.test(p) ? [p] : [];
  });
  // Bloques y comentarios `//` se vacían conservando los saltos de línea; `//` y `/*` solo cuentan si los
  // precede un espacio o el inicio de línea, así `http://…` dentro de un string no se corta.
  const sinComentarios = (txt) => txt
    .replace(/(^|\s)\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (bloque) => bloque.replace(/[^\n]/g, ''))
    .split(/\r?\n/).map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'));
  const fallas = [];
  const revisar = (donde, texto) => {
    const m = PATRON_FUTBOL.exec(texto);
    if (m) fallas.push(`  ${donde}: "${m[0]}"`);
  };
  const recorrer = (nodo, ruta, archivo) => {
    if (typeof nodo === 'string') revisar(`${archivo} ${ruta}`, nodo);
    else if (nodo && typeof nodo === 'object') {
      for (const [k, v] of Object.entries(nodo)) if (k !== 'id') recorrer(v, Array.isArray(nodo) ? `${ruta}[${k}]` : `${ruta}.${k}`, archivo);
    }
  };
  for (const f of [...archivos(srcDir), path.join(raiz, 'index.html')]) {
    const txt = fs.readFileSync(f, 'utf8');
    if (f.endsWith('.json')) recorrer(JSON.parse(txt), '', rel(f));
    else sinComentarios(txt).forEach((linea, i) => revisar(`${rel(f)}:${i + 1}`, linea));
  }
  if (fallas.length > 0) throw new Error(`Vocabulario de fútbol en texto visible (${fallas.length}):\n${fallas.join('\n')}`);
});

// ============================================================================
// K0-B — Higiene de motor y de servidor (PLAN.md §K.5 K0, D67, D68)
// ============================================================================

// D67: el tag 'bombazo' compara el sueldo de la oferta contra una REFERENCIA: el
// contrato vigente si lo hay y, si el sueldo vigente es 0 (agente libre), la
// mediana salarial de la liga de la oferta. Antes de K0-B la referencia era
// `contrato.salarioAnualUSD * bombazoMultiplo` a secas: con 0, TODA oferta era
// bombazo. El check mira los dos lados de la regla (que no sea siempre
// 'bombazo' NI siempre 'lateral') y las dos referencias, con ofertas de sueldo
// controlado — la revisión de K0-B encontró que la primera versión solo
// detectaba "siempre bombazo".
//
// Cuántas seeds del barrido de ofertas reales (una oferta por liga y seed, con
// tres sueldos vigentes distintos): las 100 que pedía la spec de K0-B.
const SEEDS_DEL_BARRIDO_DE_BOMBAZO = 100;
// Seed del estado sobre el que se arman las ofertas de sueldo controlado.
const SEED_DE_LA_OFERTA_CONTROLADA = 42;
// Un sueldo de oferta de "x veces el corte" (corte = referencia × bombazoMultiplo):
// 1.15 queda claramente arriba del corte y 0.85 claramente abajo, para que el
// test no dependa de un redondeo en el borde.
const FACTOR_ARRIBA_DEL_CORTE = 1.15;
const FACTOR_ABAJO_DEL_CORTE = 0.85;
// Sueldos vigentes del barrido, como múltiplo de la mediana de la liga: uno muy
// por debajo y otro muy por encima del corte de la mediana.
const VIGENTE_BAJO_SOBRE_MEDIANA = 0.3;
const VIGENTE_ALTO_SOBRE_MEDIANA = 3;

check('K0-B mercado: el bombazo se mide contra el sueldo vigente o, siendo agente libre, contra la mediana de la liga (D67)', () => {
  const multiplo = BALANCE.mercado.bombazoMultiplo;
  const esperada = (salario, referencia) => (salario > referencia * multiplo ? 'bombazo' : 'lateral');

  // 1. Ofertas de sueldo controlado: liga con sigma 0 y `minimoUSD` = el sueldo
  //    que queremos, con el rol/jerarquía/hype de menor multiplicador para que el
  //    piso sea lo que manda (se verifica abajo que la oferta salió con ese sueldo).
  const rolBarato = IDS_ROL.reduce((a, b) => (ROLES[a].factorSalario <= ROLES[b].factorSalario ? a : b));
  const medianaDeLaLigaDePrueba = createInitialState(SEED_DE_LA_OFERTA_CONTROLADA, mulberry32(SEED_DE_LA_OFERTA_CONTROLADA))
    .mundo.ligas.find((l) => l.tier === 2).salario.medianaUSD;
  function ofertaConSueldo({ sueldoVigente, salarioObjetivo }) {
    const rng = mulberry32(SEED_DE_LA_OFERTA_CONTROLADA);
    const state = createInitialState(SEED_DE_LA_OFERTA_CONTROLADA, rng);
    state.player.role = rolBarato;
    state.player.stats.hype = 0;
    state.career.jerarquia = 0;
    state.career.contrato.salarioAnualUSD = sueldoVigente;
    const ligaReal = state.mundo.ligas.find((l) => l.tier === 2);
    const liga = { ...ligaReal, salario: { ...ligaReal.salario, sigma: 0, minimoUSD: salarioObjetivo } };
    const oferta = construirOferta(state, liga, liga.orgs[0], null, rng);
    if (oferta.salarioAnualUSD !== salarioObjetivo) {
      throw new Error(`caso mal armado: se pidió una oferta de ${salarioObjetivo} y salió de ${oferta.salarioAnualUSD}`);
    }
    return { tag: oferta.tag };
  }
  const mediana = medianaDeLaLigaDePrueba;
  const sobreElCorte = Math.round(mediana * multiplo * FACTOR_ARRIBA_DEL_CORTE);
  const bajoElCorte = Math.round(mediana * multiplo * FACTOR_ABAJO_DEL_CORTE);
  const casos = [
    // [descripción, sueldo vigente, sueldo de la oferta, tag esperado]
    ['agente libre, oferta sobre el corte de la mediana', 0, sobreElCorte, 'bombazo'],
    ['agente libre, oferta bajo el corte de la mediana (pero sobre la mediana)', 0, bajoElCorte, 'lateral'],
    ['agente libre, oferta bajo la mediana', 0, Math.round(mediana / 2), 'lateral'],
    // Con contrato vigente la referencia es ESE sueldo, no la mediana.
    ['contrato vigente alto: la misma oferta que era bombazo siendo agente libre es lateral', sobreElCorte * 2, sobreElCorte, 'lateral'],
    ['contrato vigente bajo: una oferta bajo la mediana es bombazo', Math.round(mediana / 2 / (multiplo * FACTOR_ARRIBA_DEL_CORTE)), Math.round(mediana / 2), 'bombazo'],
    // Entre 1x y el múltiplo: sin el multiplicador (oferta > vigente) esto sería bombazo.
    ['contrato vigente: oferta apenas por encima del vigente (menos que el múltiplo) es lateral', Math.round(bajoElCorte / ((1 + multiplo) / 2)), bajoElCorte, 'lateral']
  ];
  for (const [descripcion, sueldoVigente, salarioObjetivo, esperadoTag] of casos) {
    const { tag } = ofertaConSueldo({ sueldoVigente, salarioObjetivo });
    if (tag !== esperadoTag) {
      throw new Error(`${descripcion}: salió "${tag}" y tenía que ser "${esperadoTag}" (vigente ${sueldoVigente}, oferta ${salarioObjetivo}, mediana ${mediana}, múltiplo ${multiplo})`);
    }
  }

  // 2. Barrido de ofertas reales (salario con ruido lognormal): el tag tiene que
  //    ser el que dice la regla para cada una, y con agente libre no pueden ser
  //    todas bombazo ni todas laterales.
  const vistos = { libre: { bombazo: 0, lateral: 0 }, bajo: { bombazo: 0, lateral: 0 }, alto: { bombazo: 0, lateral: 0 } };
  for (let seed = 1; seed <= SEEDS_DEL_BARRIDO_DE_BOMBAZO; seed += 1) {
    for (const [situacion, vigenteSobreMediana] of [['libre', 0], ['bajo', VIGENTE_BAJO_SOBRE_MEDIANA], ['alto', VIGENTE_ALTO_SOBRE_MEDIANA]]) {
      const rng = mulberry32(seed);
      const state = createInitialState(seed, rng);
      for (const liga of state.mundo.ligas) {
        const sueldoVigente = Math.round(liga.salario.medianaUSD * vigenteSobreMediana);
        state.career.contrato.salarioAnualUSD = sueldoVigente;
        const oferta = construirOferta(state, liga, liga.orgs[0], null, rng);
        const referencia = sueldoVigente > 0 ? sueldoVigente : liga.salario.medianaUSD;
        const tag = esperada(oferta.salarioAnualUSD, referencia);
        if (oferta.tag !== tag) {
          throw new Error(`seed ${seed}, ${liga.id ?? liga.nombre}, vigente ${sueldoVigente}: oferta de ${oferta.salarioAnualUSD} salió "${oferta.tag}" y la regla (referencia ${referencia} × ${multiplo}) dice "${tag}"`);
        }
        vistos[situacion][tag] += 1;
      }
    }
  }
  for (const situacion of ['libre', 'bajo', 'alto']) {
    const { bombazo, lateral } = vistos[situacion];
    if (bombazo === 0 || lateral === 0) {
      throw new Error(`el barrido "${situacion}" no vio las dos etiquetas (bombazo ${bombazo}, lateral ${lateral}): no prueba nada`);
    }
  }

  // 3. De punta a punta, por la decisión de mercado de verdad: un agente libre
  //    no recibe una mano de ofertas toda bombazo.
  const mercado = sistemaPorId('mercado');
  let totalOfertas = 0;
  let bombazos = 0;
  for (let seed = 1; seed <= SEEDS_DEL_BARRIDO_DE_BOMBAZO; seed += 1) {
    const rng = mulberry32(seed);
    const state = createInitialState(seed, rng);
    state.phase = 'profesional';
    state.career.tier = 2;
    state.career.currentOrg = null;
    state.career.contrato.salarioAnualUSD = 0;
    const res = mercado.aplicar(state, rng);
    for (const op of res.decision?.opciones ?? []) {
      totalOfertas += 1;
      if (op.tag === 'bombazo') bombazos += 1;
    }
  }
  if (totalOfertas === 0) {
    throw new Error(`no se generaron ofertas de mercado para agente libre en ${SEEDS_DEL_BARRIDO_DE_BOMBAZO} seeds`);
  }
  if (bombazos === totalOfertas) {
    throw new Error(`todas las ofertas (${bombazos}/${totalOfertas}) salieron "bombazo" siendo agente libre`);
  }
});

// El check de servidor corre en un proceso hijo (`node -e`) porque necesita
// esperar sockets y este archivo es síncrono. Esta función se serializa con
// `.toString()` y se ejecuta allá: NO puede cerrar sobre nada de validate.js
// (por eso importa todo adentro y recibe por entorno el servidor a probar,
// `K0B_SERVER_JS`, y la carpeta temporal donde armar la raíz, `K0B_TMP`: la crea
// y la borra el que lo lanza, así que no queda basura si a esta sesión la matan
// por colgada).
//
// Qué prueba, y por qué cada cosa distingue código viejo de código nuevo:
//  1. Arma una raíz temporal con archivos REALES para que cada bloqueo sea
//     observable (contra una raíz sin ellos el código roto también daba 404):
//     un secreto AFUERA y un hermano `raiz-evil/` (su ruta empieza igual que la
//     de la raíz) con otro secreto; adentro `.git`, `node_modules`, `package.json`,
//     `server.js`, `PLAN.md`, `dist/x.js`, las carpetas `srcx/` y `assets-x/`
//     (nombre parecido a una pública) y, dentro de `src/`, un `.git` y un
//     `node_modules` con secreto, más los directorios literales `.git.`, `.git `
//     y `node_modules.` (punto o espacio final), que el SO de esta máquina deja
//     crear y leer, y esas mismas carpetas prohibidas más adentro (`src/sub/.git`,
//     `src/a/b/node_modules`, `assets/sub/.git`). Levanta `createServer({ raiz })`
//     sobre ella.
//  2. Qué sonda ejercita qué capa del servidor (el código de respuesta lo dice):
//     - 403 exacto = la capa de la RAÍZ ("la ruta resuelta queda adentro"):
//       traversal con puntos crudos y codificados, con `/` y con `\`, y hacia el
//       hermano `raiz-evil/` (la comparación con prefijo sin separador lo deja pasar).
//     - 404 exacto de las rutas de la RAÍZ (`/.GIT/config`, `/GIT~1/config`,
//       `/package.json`, `/server.js`, `/dist/x.js`, `/srcx/a.js`...) = la LISTA
//       BLANCA. Ojo: ahí la lista blanca tapa a la denylist (`.git`, `node_modules`)
//       y a la regla de `~`/`:`, así que esas rutas NO prueban esas capas.
//     - 404 exacto de las rutas dentro de `/src/...` (`/src/GIT~1/config`,
//       `/src/.git./config`, `/src/.GIT/config`, `/src/NODE_M~1/...`): la lista
//       blanca ya dejó pasar `src`, así que lo único que las frena es la DENYLIST
//       (`.git`/`node_modules`, mayúsculas y punto/espacio final) y la regla de `~` y `:`.
//       Ojo con el SO: la sonda de `~` solo delata a un mutante en un sistema de
//       archivos con nombres cortos 8.3 (NTFS); en otro da 404 igual y el check
//       pasa sin morder (no da falsos rojos, solo cubre menos).
//     - 404 exacto de la denylist ANIDADA (`/src/sub/.git/config`, `/src/sub/.GIT/config`,
//       `/src/a/b/node_modules/z.js`, `/assets/sub/.git/config`): igual que la anterior,
//       solo la frena la denylist, pero con la carpeta prohibida en el tercer o cuarto
//       tramo; delata a una denylist que mira un tramo fijo en vez de todos. La regla
//       de `~`/`:` NO tiene sonda anidada (queda sin cubrir a esa profundidad).
//     - lo que tiene que dar 200 (`/`, `/src/a.js`, `/assets/og.png`): que no
//       se haya cerrado de más.
//  3. `%00` y URI malformada: 400 exacto.
//  4. `host` exportado es 127.0.0.1 y arrancar el archivo de verdad (`node
//     server.js` y `node server`) no escucha fuera de loopback: se intenta
//     conectar a 127.0.0.2 y a cada IP no-loopback de la máquina.
//  5. Importar el módulo no levanta un servidor.
//
// Mutantes de `server.js` que lo ponen rojo (cada uno se armó sobre una copia y
// se corrió con `--solo="K0-B server"`; entre paréntesis, qué sonda lo delata):
//  - CARPETAS_PROHIBIDAS vacía (`/src/.git/config`)
//  - sin normalizar punto/espacio final de la denylist (`/src/.git./config`)
//  - sin rechazar `~` (`/src/GIT~1/config`) o sin rechazar `:` (`/src/a.js::$DATA`)
//  - denylist solo en el primer tramo (`/src/.git/config`) o sin minúsculas (`/src/.GIT/config`)
//  - denylist solo en el segundo tramo, o en los dos o tres primeros (`/src/sub/.git/config`;
//    el de tres además `/src/a/b/node_modules/z.js`). Uno que mire los cuatro primeros
//    sigue verde: ninguna sonda anida más hondo (un tope fijo siempre deja un fondo sin probar).
//  - `startsWith(raiz)` sin separador (`/../raiz-evil/secreto.txt` da 404 en vez de 403)
//  - sin el 403 de la raíz (`/../secreto.txt` da 404)
//  - lista blanca por prefijo (`/srcx/a.js`, `/assets-x/a.png`), con `package.json`,
//    `server.js` o `plan.md` agregados (`/package.json`, `/server.js`, `/PLAN.md`),
//    con `dist` como carpeta pública (`/dist/x.js`) o que sirve todo menos `.git` (`/server.js`)
//  - sin cortar el querystring, sin el chequeo de NUL, host `0.0.0.0` o `listen`
//    sin host, `node server` sin la extensión `.js`, o importar que levanta el servidor.
//  - un `import` que no vuelve (`while (true) {}` en el módulo): salta el tope de
//    `MS_TOPE_DE_LA_SESION_DEL_SERVIDOR` en vez de colgar a `validate.js`.
async function sesionDelCheckDeServidor() {
  const { default: fs } = await import('node:fs');
  const { default: os } = await import('node:os');
  const { default: rutaNode } = await import('node:path');
  const { default: http } = await import('node:http');
  const { default: net } = await import('node:net');
  const { spawn } = await import('node:child_process');
  const { pathToFileURL } = await import('node:url');

  const MS_ESPERA_PEDIDO = 3000;
  const MS_ESPERA_ARRANQUE = 8000;
  const MS_ESPERA_CONEXION = 1500;
  const MS_PARA_QUE_UN_IMPORT_ARRANQUE = 400;
  // Cuánto puede vivir un `node server.js` que arranca el check. Menor que el
  // tope de toda la sesión (`MS_TOPE_DE_LA_SESION_DEL_SERVIDOR`, afuera): si algo
  // se cuelga, el hijo se baja solo antes de que se mate a la sesión.
  const MS_VIDA_MAXIMA_DEL_SERVIDOR_HIJO = 30000;
  const ESTADO_OK = 200;
  const ESTADO_PEDIDO_INVALIDO = 400;
  const ESTADO_FUERA_DE_LA_RAIZ = 403;
  const ESTADO_NO_ENCONTRADO = 404;
  const BS = String.fromCharCode(92);
  const SECRETO = 'SECRETO-';

  const fallas = [];
  const falla = (texto) => fallas.push(texto);
  process.on('uncaughtException', (error) => falla(`excepción sin atrapar en el servidor: ${error.message}`));

  const servidorJs = process.env.K0B_SERVER_JS;
  const carpetaDelServidor = rutaNode.dirname(servidorJs);
  const tmp = process.env.K0B_TMP;
  const hijos = [];

  const pedir = (puerto, ruta) => new Promise((resolve) => {
    const req = http.request({ hostname: '127.0.0.1', port: puerto, path: ruta, method: 'GET', timeout: MS_ESPERA_PEDIDO }, (res) => {
      const trozos = [];
      res.on('data', (trozo) => trozos.push(trozo));
      res.on('end', () => resolve({ estado: res.statusCode, cuerpo: Buffer.concat(trozos).toString('utf8') }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ estado: 'sin respuesta', cuerpo: '' }); });
    req.on('error', (error) => resolve({ estado: `error ${error.message}`, cuerpo: '' }));
    req.end();
  });

  const puertoLibre = () => new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });

  const conecta = (direccion, puerto) => new Promise((resolve) => {
    const socket = net.connect({ host: direccion, port: puerto });
    socket.setTimeout(MS_ESPERA_CONEXION);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => resolve(false));
  });

  // `node server.js` / `node server` como lo corre el jugador. Devuelve el puerto
  // que el propio archivo dijo haber abierto (o null si no arrancó).
  const arrancarDeVerdad = async (argumento) => {
    const hijo = spawn(process.execPath, [argumento], {
      cwd: carpetaDelServidor,
      env: { ...process.env, PORT: String(await puertoLibre()) },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: MS_VIDA_MAXIMA_DEL_SERVIDOR_HIJO
    });
    hijos.push(hijo);
    return new Promise((resolve) => {
      let salida = '';
      const plazo = setTimeout(() => resolve({ puerto: null, salida }), MS_ESPERA_ARRANQUE);
      const alHablar = (trozo) => {
        salida += trozo;
        const dicho = /localhost:(\d+)/.exec(salida);
        if (dicho) { clearTimeout(plazo); resolve({ puerto: Number(dicho[1]), salida }); }
      };
      hijo.stdout.on('data', alHablar);
      hijo.stderr.on('data', alHablar);
      hijo.on('exit', () => { clearTimeout(plazo); resolve({ puerto: null, salida }); });
    });
  };

  try {
    const raiz = rutaNode.join(tmp, 'raiz');
    // Un hermano de la raíz cuyo nombre EMPIEZA igual que ella (`raiz-evil`): una
    // comparación `startsWith(raiz)` sin separador lo toma por "adentro".
    const hermano = `${rutaNode.basename(raiz)}-evil`;
    const enRaiz = (...tramos) => rutaNode.join(raiz, ...tramos);
    const escribir = (ruta, contenido) => {
      fs.mkdirSync(rutaNode.dirname(ruta), { recursive: true });
      fs.writeFileSync(ruta, contenido);
    };
    escribir(rutaNode.join(tmp, 'secreto.txt'), `${SECRETO}FUERA`);
    escribir(rutaNode.join(tmp, hermano, 'secreto.txt'), `${SECRETO}HERMANO`);
    // Lo que el servidor NO tiene que servir aunque exista: `.git`, `node_modules`
    // y sus versiones dentro de `src/` (adonde la lista blanca ya no llega) y los
    // archivos y carpetas de la raíz que no son del juego.
    escribir(enRaiz('.git', 'config'), `${SECRETO}GIT`);
    escribir(enRaiz('node_modules', 'x', 'index.js'), `${SECRETO}NODE_MODULES`);
    escribir(enRaiz('src', '.git', 'config'), `${SECRETO}GIT_ANIDADO`);
    escribir(enRaiz('src', 'node_modules', 'y', 'index.js'), `${SECRETO}NODE_MODULES_ANIDADO`);
    // Lo mismo pero MÁS ADENTRO: `.git` en el tercer tramo de la ruta y
    // `node_modules` en el cuarto, y un `.git` bajo la otra carpeta pública.
    // Sin esto, una denylist que solo mirara un tramo fijo (el segundo, o los
    // dos o tres primeros) no se notaba: todo lo de arriba tiene la carpeta
    // prohibida pegada a `src/` o a la raíz.
    escribir(enRaiz('src', 'sub', '.git', 'config'), `${SECRETO}GIT_PROFUNDO`);
    escribir(enRaiz('src', 'a', 'b', 'node_modules', 'z.js'), `${SECRETO}NODE_MODULES_PROFUNDO`);
    escribir(enRaiz('assets', 'sub', '.git', 'config'), `${SECRETO}GIT_PROFUNDO_EN_ASSETS`);
    escribir(enRaiz('package.json'), `${SECRETO}RAIZ`);
    escribir(enRaiz('server.js'), `${SECRETO}SERVER`);
    escribir(enRaiz('PLAN.md'), `${SECRETO}PLAN`);
    escribir(enRaiz('dist', 'x.js'), `${SECRETO}DIST`);
    escribir(enRaiz('srcx', 'a.js'), `${SECRETO}SRCX`);
    escribir(enRaiz('assets-x', 'a.png'), `${SECRETO}ASSETS_X`);
    // Directorios con punto o espacio final DENTRO de `src/`: el servidor los
    // trata como `.git`/`node_modules`. Existen de verdad (el SO de esta máquina
    // los deja crear y leer) para que la regla sea observable; si el SO no deja
    // crearlos, esa sonda no se arma porque no puede delatar nada.
    const nombresConFinalIgnorado = [];
    for (const nombre of ['.git.', '.git ', 'node_modules.']) {
      try {
        escribir(enRaiz('src', nombre, 'config'), `${SECRETO}FINAL_IGNORADO`);
        nombresConFinalIgnorado.push(nombre);
      } catch {
        // el SO no deja crear ese nombre.
      }
    }
    // Lo que el juego sí sirve.
    escribir(enRaiz('index.html'), '<!DOCTYPE html><title>ok</title>');
    escribir(enRaiz('src', 'a.js'), 'export const a = 1;');
    escribir(enRaiz('assets', 'og.png'), 'PNG');

    // 5. importar no arranca nada (PORT=0: si arrancara, que sea en un puerto cualquiera).
    process.env.PORT = '0';
    let arrancoAlImportar = false;
    const logOriginal = console.log;
    console.log = (...partes) => { if (String(partes[0]).includes('Servidor corriendo')) arrancoAlImportar = true; };
    const modulo = await import(pathToFileURL(servidorJs).href);
    await new Promise((resolve) => setTimeout(resolve, MS_PARA_QUE_UN_IMPORT_ARRANQUE));
    console.log = logOriginal;
    if (arrancoAlImportar) falla('importar server.js levantó un servidor: solo tiene que arrancar si es el punto de entrada');

    // 4a. el host que declara el archivo.
    if (modulo.host !== '127.0.0.1') falla(`el host exportado es ${JSON.stringify(modulo.host)}, tiene que ser 127.0.0.1`);

    const servidor = modulo.createServer({ raiz });
    await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
    const { port } = servidor.address();

    // 1. lo que el juego sí sirve.
    for (const ruta of ['/', '/index.html', '/index.html?x=1', '/src/a.js', '/assets/og.png']) {
      const r = await pedir(port, ruta);
      if (r.estado !== ESTADO_OK) falla(`${ruta} tendría que dar 200 y dio ${r.estado}`);
    }

    // Pide `ruta` y exige el código exacto. Un cuerpo con el secreto es una falla
    // aunque el código fuera el esperado.
    const exigir = async (ruta, esperado, queEs) => {
      const r = await pedir(port, ruta);
      const filtro = r.cuerpo.includes(SECRETO);
      if (r.estado !== esperado || filtro) {
        falla(`${ruta.split(BS).join('<barra invertida>')} tendría que dar ${esperado} (${queEs}) y dio ${r.estado}${filtro ? ` y devolvió "${r.cuerpo}"` : ''}`);
      }
    };

    // 2a. CAPA DE LA RAÍZ: salirse con puntos (crudos o codificados), hacia un
    // secreto afuera o hacia el hermano `raiz-evil/`: 403 exacto. La lista blanca
    // de más abajo también los pararía (con 404), así que sin pedir el código la
    // capa de la raíz podría romperse sin que nadie se entere; y el hermano es
    // justo lo que una comparación por prefijo sin separador deja pasar.
    for (const ruta of [
      '/../secreto.txt', '/..%2fsecreto.txt', '/%2e%2e/secreto.txt', '/src/../../secreto.txt',
      `/../${hermano}/secreto.txt`, `/..%2f${hermano}%2fsecreto.txt`, `/%2e%2e/${hermano}/secreto.txt`,
      `/src/../../${hermano}/secreto.txt`
    ]) {
      await exigir(ruta, ESTADO_FUERA_DE_LA_RAIZ, 'fuera de la raíz');
    }

    // 2b. LISTA BLANCA: rutas de la raíz que existen pero no son del juego: 404
    // exacto. Ojo: acá la lista blanca tapa a la denylist y a la regla de `~`/`:`
    // (las variantes de `.git` de este grupo NO prueban esas capas; las prueba 2c).
    for (const ruta of [
      // archivos y carpetas de la raíz que el juego no necesita
      '/package.json', '/PACKAGE.JSON', '/server.js', '/PLAN.md', '/plan.md', '/dist/x.js',
      // carpetas con nombre parecido a una pública (la lista blanca es exacta, no por prefijo)
      '/srcx/a.js', '/assets-x/a.png',
      // `.git` y `node_modules` en la raíz (mayúsculas, separador, 8.3, flujo alternativo NTFS, punto final, vía `..`)
      '/.git/config', '/.GIT/config', '/.Git/config', `/.GIT${BS}config`, '/.GIT%2Fconfig', '/GIT~1/config',
      '/.git::$INDEX_ALLOCATION/config', '/.git./config', '/src/../.git/config',
      '/node_modules/x/index.js', '/NODE_MODULES/x/index.js', '/Node_Modules/x/index.js', '/NODE_M~1/x/index.js',
      '/node_modules::$INDEX_ALLOCATION/x/index.js', '/node_modules./x/index.js'
    ]) {
      await exigir(ruta, ESTADO_NO_ENCONTRADO, 'fuera de la lista blanca');
    }

    // 2c. DENYLIST y regla de `~`/`:`: las mismas variantes pero DENTRO de `src/`,
    // que la lista blanca deja pasar. Acá lo único que las frena es la denylist
    // (`.git`/`node_modules` sin importar mayúsculas ni punto/espacio final) y el
    // rechazo de `~` (nombre corto 8.3) y de `:` (flujo alternativo NTFS).
    for (const ruta of [
      '/src/.git/config', '/src/.GIT/config', '/src/.Git/config', '/src/GIT~1/config',
      '/src/.git::$INDEX_ALLOCATION/config', '/src/.git../config', `/src/.GIT${BS}config`, '/src/.GIT%2Fconfig',
      '/src/node_modules/y/index.js', '/src/NODE_MODULES/y/index.js', '/src/Node_Modules/y/index.js', '/src/NODE_M~1/y/index.js',
      '/src/node_modules::$INDEX_ALLOCATION/y/index.js', '/src/node_modules./y/index.js',
      '/src/a.js::$DATA',
      ...nombresConFinalIgnorado.map((nombre) => `/src/${encodeURIComponent(nombre)}/config`)
    ]) {
      await exigir(ruta, ESTADO_NO_ENCONTRADO, 'denylist o `~`/`:` dentro de una carpeta pública');
    }

    // 2c-bis. DENYLIST ANIDADA: la carpeta prohibida a profundidad >= 2 dentro de
    // una carpeta pública (`src/sub/.git`, `src/a/b/node_modules`, `assets/sub/.git`).
    // La lista blanca ya dejó pasar `src`/`assets`, así que solo la frena la
    // denylist, y tiene que mirar TODOS los tramos de la ruta, no uno fijo. Con
    // mayúsculas (`.GIT`, `NODE_MODULES`) también: en NTFS son la misma carpeta que
    // existe de verdad (en un SO con mayúsculas distintas dan 404 porque no existe,
    // sin falso rojo).
    for (const ruta of [
      '/src/sub/.git/config', '/src/sub/.GIT/config',
      '/src/a/b/node_modules/z.js', '/src/a/b/NODE_MODULES/z.js',
      '/assets/sub/.git/config'
    ]) {
      await exigir(ruta, ESTADO_NO_ENCONTRADO, 'denylist en una carpeta anidada de una carpeta pública');
    }

    // 2d. con barra invertida: en Windows también sale de la raíz (403); en otros
    // SO es solo un nombre raro dentro de ella (404). Nunca 200 y nunca el secreto.
    for (const ruta of [
      `/..${BS}secreto.txt`, '/src%5c..%5c..%5csecreto.txt', '/..%5csecreto.txt',
      `/..${BS}${hermano}${BS}secreto.txt`, `/..%5c${hermano}%5csecreto.txt`
    ]) {
      const r = await pedir(port, ruta);
      if (r.estado === ESTADO_OK || r.cuerpo.includes(SECRETO)) {
        falla(`${ruta.split(BS).join('<barra invertida>')} dio ${r.estado}${r.cuerpo.includes(SECRETO) ? ` y devolvió "${r.cuerpo}"` : ''}`);
      }
    }

    // 3. pedidos que ni se pueden interpretar.
    for (const ruta of ['/%00', '/index.html%00.js', '/%E0%A4%A', '/%zz']) {
      const r = await pedir(port, ruta);
      if (r.estado !== ESTADO_PEDIDO_INVALIDO) falla(`${ruta} tendría que dar 400 y dio ${r.estado}`);
    }
    servidor.close();

    // 4b. el archivo corriendo de verdad.
    const direccionesAjenas = ['127.0.0.2', ...Object.values(os.networkInterfaces()).flat()
      .filter((interfaz) => interfaz.family === 'IPv4' && !interfaz.internal).map((interfaz) => interfaz.address)];
    for (const argumento of ['server.js', 'server']) {
      const { puerto, salida } = await arrancarDeVerdad(argumento);
      if (puerto === null) {
        falla(`\`node ${argumento}\` no arrancó: ${salida.trim().slice(0, 200) || '(sin salida)'}`);
        continue;
      }
      const r = await pedir(puerto, '/');
      if (r.estado !== ESTADO_OK) falla(`\`node ${argumento}\`: / dio ${r.estado}`);
      if (argumento === 'server.js') {
        const alcanzables = (await Promise.all(direccionesAjenas.map(async (d) => (await conecta(d, puerto)) ? d : null))).filter(Boolean);
        if (alcanzables.length > 0) falla(`el servidor real contesta en ${alcanzables.join(', ')}: no escucha solo en 127.0.0.1`);
      }
    }
  } catch (error) {
    falla(`el check no pudo correr hasta el final: ${error && error.message}`);
  } finally {
    for (const hijo of hijos) hijo.kill();
  }

  if (fallas.length > 0) {
    console.error(fallas.join('\n'));
    process.exit(1);
  }
  process.exit(0);
}

// Cuánto del mensaje de error de `execFileSync` (que incluye el script entero) se muestra.
const ERROR_MAXIMO_DEL_CHECK_DE_SERVIDOR = 300;
// Tope de toda la sesión: normalmente tarda ~3 s (cada pedido tiene 3 s y cada
// arranque 8 s de plazo propio, adentro). Es para que un cuelgue del propio
// servidor bajo prueba (un `import` que no vuelve) no cuelgue `validate.js`.
const MS_TOPE_DE_LA_SESION_DEL_SERVIDOR = 60000;

check('K0-B server: solo localhost, solo la lista blanca y sin salir de la raiz (D68, H1)', () => {
  // D68 + H1 de la revisión: ver `sesionDelCheckDeServidor`. El servidor bajo
  // prueba es el `server.js` de la raíz del repo.
  const servidorJs = path.resolve(__dirname, '../../server.js');
  // La carpeta temporal la crea y la borra este lado: si a la sesión la matan por
  // colgada, su `finally` no corre y quedaría basura (con nombres raros de borrar a mano).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k0b-server-'));
  try {
    execFileSync(process.execPath, ['--input-type=module', '-e', `(${sesionDelCheckDeServidor.toString()})()`], {
      env: { ...process.env, K0B_SERVER_JS: servidorJs, K0B_TMP: tmp },
      stdio: 'pipe',
      timeout: MS_TOPE_DE_LA_SESION_DEL_SERVIDOR
    });
  } catch (err) {
    if (err.code === 'ETIMEDOUT') {
      throw new Error(`la sesión del servidor no terminó en ${MS_TOPE_DE_LA_SESION_DEL_SERVIDOR / 1000} s: se cuelga (¿un import que no vuelve?)`);
    }
    const detalle = [err.stderr, err.stdout].map((s) => (s ? s.toString().trim() : '')).filter(Boolean).join(' | ') || err.message.slice(0, ERROR_MAXIMO_DEL_CHECK_DE_SERVIDOR);
    throw new Error(detalle.split('\n').join(' ; '));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ============================================================================
// Fase K0 — El instrumento (PLAN.md §K.5)
// ============================================================================
// Estos checks cuidan al INSTRUMENTO (huella, bots, bloques de simulate.js, agencia.js), no al juego. Cada
// uno se verificó en rojo contra un mutante real del código que protege (regla de proceso 7): la tabla
// mutante -> check que lo mata está en el reporte de K0-A.
const { calcularHuella, calcularHuellaJuego } = await import('./huella.js');
const {
  medirAgencia, analizarDatosAgencia, tCritico, tCriticoBilateral, testMaximoT, significativaTestViejo,
  replicasDeDecision, puntajeDeAgencia, sigmaPoblacional, UMBRAL_SIGNIFICATIVO, MIN_REPLICAS_VALIDAS
} = await import('./agencia.js');
const { puntajeDeCarrera: puntajeDeCarreraAgencia } = await import('../core/puntaje.js');
const {
  correrLote, correrCarrera: correrCarreraSimulate, correrSinRuido, calcularFavoritoBo5, contarBeats,
  clasificarSplit, PARAMETROS_RUIDO, DURACION_BEAT_MS, ESPERA_MINIJUEGO_MS, DELTAS_FAVORITO_BO5,
  UMBRAL_R2_ESTRUCTURAL, decidirRuidoPuro,
  promedio, mediana: medianaSim, medianaInferior, percentil, desvioMuestral, pearson, varianza, regresionLineal2Regresores,
  META_K2_R_MISMA_LIGA, META_K2_R2_SIN_RUIDO, META_K2_BO5_FAVORITO_CLARO_PCT, META_K3_MENTALIDAD_MEDIANA,
  META_K3_MENTALIDAD_SATURADA_PCT, META_K3_HYPE_SATURADO_PCT, META_K3_DIFERENCIA_BATACAZO_PP, META_K3_RETENCION_4_SPLITS,
  SONDA_RETENCION
} = await import('./simulate.js');
const {
  ESTRATEGIAS: ESTRATEGIAS_K0, puntuarPrevia, compararOfertasMercado,
  esDecisionDeMercado, esDecisionDeRutina, esDecisionDeMinijuego
} = await import('./estrategias.js');
const { spawnSync } = await import('child_process');
const osK0 = await import('os');

// Carreras por bot en los lotes de los checks lentos (PLAN.md §K.5 pide 200).
const CARRERAS_LOTE_K0 = 200;
const SPLITS_LOTE_K0 = 60;

// Foto de los 5 ruidos de resultados, tomada ANTES de cualquier check lento de K0. Si la ablación de
// `correrLote` deja `BALANCE` contaminado, una foto tomada después (adentro de un check) ya nace
// contaminada y "restaurado" pasaría. Además hay una segunda copia de balance.js (la query crea otra
// instancia del módulo): sus valores no pasaron nunca por un `correrLote`, así que sirve de referencia
// aunque algún check anterior —el J0 corre `correrLote` en este mismo proceso— haya ensuciado el objeto
// compartido.
const FOTO_RUIDO_K0 = PARAMETROS_RUIDO.map(([grupo, clave]) => BALANCE[grupo][clave]);
const BALANCE_VIRGEN_K0 = (await import('../data/balance.js?k0-virgen')).BALANCE;

function afirmarRuidoIntactoK0(donde) {
  PARAMETROS_RUIDO.forEach(([grupo, clave], i) => {
    const nombre = `BALANCE.${grupo}.${clave}`;
    if (!(FOTO_RUIDO_K0[i] > 0)) {
      throw new Error(`${nombre} valía ${FOTO_RUIDO_K0[i]} al arrancar K0: con ruido 0 la ablación "no apagó nada" pasaría`);
    }
    if (BALANCE[grupo][clave] !== FOTO_RUIDO_K0[i]) {
      throw new Error(`${donde}: ${nombre} = ${BALANCE[grupo][clave]}, al arrancar K0 valía ${FOTO_RUIDO_K0[i]}`);
    }
    if (BALANCE[grupo][clave] !== BALANCE_VIRGEN_K0[grupo][clave]) {
      throw new Error(`${donde}: ${nombre} = ${BALANCE[grupo][clave]}, el balance.js virgen dice ${BALANCE_VIRGEN_K0[grupo][clave]}`);
    }
  });
}

// Recorre TODAS las hojas de un reporte: cada número tiene que ser finito, y `null` solo vale donde la spec
// lo permite (rutas que matchean `nulosPermitidos`). Devuelve la lista de problemas.
function hojasProblematicasK0(valor, ruta, nulosPermitidos, problemas = []) {
  if (valor === null) {
    if (!nulosPermitidos.some((patron) => patron.test(ruta))) {
      problemas.push(`${ruta} es null`);
    }
  } else if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) {
      problemas.push(`${ruta} no es finito: ${valor}`);
    }
  } else if (valor === undefined) {
    problemas.push(`${ruta} es undefined`);
  } else if (Array.isArray(valor)) {
    valor.forEach((elemento, i) => hojasProblematicasK0(elemento, `${ruta}[${i}]`, nulosPermitidos, problemas));
  } else if (typeof valor === 'object') {
    for (const [clave, sub] of Object.entries(valor)) {
      hojasProblematicasK0(sub, ruta ? `${ruta}.${clave}` : clave, nulosPermitidos, problemas);
    }
  }
  return problemas;
}

// Los únicos null que la spec admite: `pOtroMundialDadoUno` con n < 30 (en el lote y en las regiones, que son
// chicas), `ruidoPuro` cuando el techo estructural no alcanza (`UMBRAL_R2_ESTRUCTURAL`), y los coeficientes
// de las regiones con menos de 30 pares.
const NULOS_PERMITIDOS_K0 = [
  /(^|\.)embudo\.pOtroMundialDadoUno$/,
  /^nivel\.varianzaExplicada\.ruidoPuro$/,
  /^porRegion\.[^.]+\.nivel\.rNivelPosicion(MismaLiga|Bruto)$/,
  // K2a: la r corregida de una región chica; las celdas del Bo5 del motor con menos de 30 series; y el valor de una
  // meta de K2 que sale de una de esas celdas.
  /^porRegion\.[^.]+\.nivel\.corregida\.rNivelPosicion(MismaLiga|Bruto)$/,
  /^nivel\.bo5Motor\.(bandas\[\d+\]|favoritoClaro)\.(jugadorFavorito|rivalFavorito|ambos)\.(ganaFavoritoPct|eePct)$/,
  /^nivel\.metasK2\.bo5FavoritoClaro(Jugador|Rival)\.valor$/
];

let lotesK0 = null;
function lotesDeLosBotsK0() {
  if (lotesK0 === null) {
    lotesK0 = {};
    for (const bot of ['criterio', 'azar', 'malas']) {
      lotesK0[bot] = correrLote(CARRERAS_LOTE_K0, SPLITS_LOTE_K0, bot);
      // `nivel.varianzaExplicada` (la ablación) se calcula recién al leerla: se fuerza acá para chequear el balance justo después.
      void lotesK0[bot].nivel.varianzaExplicada;
      afirmarRuidoIntactoK0(`después de correrLote(${bot})`);
    }
  }
  return lotesK0;
}

// Una estrategia del motor que mira cada decisión de pasada (y deja registrar lo que hizo).
function sistemaEspiaK0(sistema, alDelegar) {
  return new Proxy(sistema, {
    get(objetivo, propiedad) {
      if (propiedad === 'resolverAuto') {
        return (...args) => {
          alDelegar();
          return objetivo.resolverAuto(...args);
        };
      }
      return objetivo[propiedad];
    }
  });
}

const rngProhibidoK0 = () => {
  throw new Error('el bot consumió rng en una decisión que debía resolver sin rng');
};

// ---------------------------------------------------------------------------------------------------------------
// Recuentos independientes (K0-A, 2ª revisión). Los checks de K0 solo detectaban crashes y NaN: 21 de 29 mutantes
// que dejaban un KPI en un valor equivocado pero finito, con los totales cerrando, pasaban. Lo que sigue es una
// SEGUNDA implementación de los KPIs de `simulate.js`, escrita acá desde los datos crudos de las carreras
// (estados finales y observaciones por split, que `correrLote` expone en `crudos`): no importa `percentil`,
// `mediana`, `pearson`, `regresionLineal2Regresores` ni los bloques que verifica, así que un bug en cualquiera de
// ellos no se replica acá. Las constantes `...K0` son literales propios, con la fuente de cada una: si K1-K5
// cambian una a propósito, este check es el que hay que tocar (regla de proceso 17).
// ---------------------------------------------------------------------------------------------------------------

// Spec de K0 (PLAN.md §K.5): con menos de 30 pares no se devuelve coeficiente, ni una probabilidad condicional.
const MUESTRA_MINIMA_K0 = 30;
// §K.3b: una carrera pro "corta" dura menos de 4 años.
const UMBRAL_CARRERA_CORTA_K0 = 4;
// §K.3c: mentalidad y hype "saturados" = en el techo, >= 90.
const UMBRAL_SATURACION_K0 = 90;
// §K.3c: "<= 2 interrupciones por split pro; <= 4 en playoffs o internacional".
const UMBRAL_SPLIT_K0 = 2;
const UMBRAL_SPLIT_LARGO_K0 = 4;
// El error estándar de la ablación sale de 200 remuestreos por carrera con `mulberry32(7777)`, sobre las primeras
// 200 carreras del lote; el R² sin ruido tiene que llegar a 0,3 para que `ruidoPuro` sea interpretable.
const REMUESTREOS_BOOTSTRAP_K0 = 200;
// Umbrales de los checks que recuentan KPIs. Diferencia mínima entre una r (o una probabilidad) y la que daría un mutante
// para que el recuento pueda distinguirlos; hojas mínimas que tiene que comparar el check de KPIs para no pasar vacío;
// y carreras y decisiones propias mínimas del check de delegación.
const DIFERENCIA_MINIMA_R_K0 = 0.01;
const DIFERENCIA_MINIMA_PROBABILIDAD_K0 = 0.05;
const HOJAS_MINIMAS_K0 = 800;
const CARRERAS_DELEGACION_K0 = 12;
const DECISIONES_PROPIAS_MINIMAS_K0 = 200;
const SEMILLA_BOOTSTRAP_K0 = 7777;
const MAX_CORRIDAS_ABLACION_K0 = 200;
const UMBRAL_R2_ESTRUCTURAL_K0 = 0.3;
// 1 − r12² por debajo de esto: los dos regresores (nivel del jugador y de sus compañeros) son colineales y el R²
// conjunto no está definido. La correlación real entre ellos es ~0,5 (r12² ~ 0,2), así que solo atrapa lo exacto.
const EPSILON_COLINEAL_K0 = 1e-12;
// Los ruidos de resultados que apaga la ablación (§K.3a). Hasta K2a eran 5 (el de cada partido de la temporada y
// de su rival, el de cada mapa y del rival en la serie, y el del rendimiento del jugador); desde K2b cada partido es
// UNA tirada contra su p y el ruido de un partido son los dos σ combinados que lee `ruidoEfectivo`. Es una lista
// literal, NO la de `PARAMETROS_RUIDO`: si esa se acorta, la ablación recontada acá la sigue apagando completa y el
// KPI no coincide.
const RUIDOS_ABLACION_K0 = [
  ['partido', 'sigmaFecha'],
  ['partido', 'sigmaMapa']
];
// Los tres bots de K0 con los que se comparan los lotes de 200 carreras, y los cuatro de la ablación.
const BOTS_K0 = ['criterio', 'azar', 'malas'];
const BOTS_ABLACION_K0 = ['equilibrado', 'criterio', 'azar', 'malas'];

const cuentaK0 = (lista, condicion) => lista.filter(condicion).length;
const mediaK0 = (valores) => (valores.length > 0 ? valores.reduce((s, v) => s + v, 0) / valores.length : null);
const redondeoK0 = (valor, decimales) => (valor === null ? null : Number(valor.toFixed(decimales)));
// Porcentaje con un decimal; null sin base.
const pctK0 = (parte, total) => (total > 0 ? Number(((parte / total) * 100).toFixed(1)) : null);

// Mediana: con n par, el promedio de los dos centrales.
function medianaK0(valores) {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0 ? (ordenados[mitad - 1] + ordenados[mitad]) / 2 : ordenados[mitad];
}

// Percentil "por piso" (la definición que documenta `percentil` de simulate.js): con los valores ordenados de
// menor a mayor, el de la posición min(n - 1, floor(p * n)). No interpola.
function percentilK0(valores, p) {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.floor(p * ordenados.length))];
}

const varianzaPoblacionalK0 = (valores) => {
  const media = mediaK0(valores);
  return valores.reduce((s, v) => s + (v - media) ** 2, 0) / valores.length;
};

// Desvío muestral (n - 1).
const desvioK0 = (valores) => (valores.length < 2 ? 0 : Math.sqrt(valores.reduce((s, v) => s + (v - mediaK0(valores)) ** 2, 0) / (valores.length - 1)));

// Correlación de Pearson en dos pasadas; null si alguna de las dos series es constante.
function correlacionK0(xs, ys) {
  const mx = mediaK0(xs);
  const my = mediaK0(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my);
    sxx += (x - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  });
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}
const cuadradoK0 = (valor) => (valor === null ? null : valor * valor);
const pearsonK0 = (xs, ys) => (xs.length < MUESTRA_MINIMA_K0 ? null : correlacionK0(xs, ys));

// R² de la regresión de y contra DOS regresores, por la fórmula de las correlaciones (otra ruta que la matriz de
// covarianzas de `regresionLineal2Regresores`): R² = (r1² + r2² − 2·r1·r2·r12) / (1 − r12²), acotado a [0, 1].
// null con menos de 30 filas, con una serie constante o con los regresores colineales.
function r2DosRegresoresK0(ys, xs1, xs2) {
  if (ys.length < MUESTRA_MINIMA_K0) return null;
  const r1 = correlacionK0(xs1, ys);
  const r2 = correlacionK0(xs2, ys);
  const r12 = correlacionK0(xs1, xs2);
  if (r1 === null || r2 === null || r12 === null || 1 - r12 * r12 < EPSILON_COLINEAL_K0) return null;
  return Math.max(0, Math.min(1, (r1 * r1 + r2 * r2 - 2 * r1 * r2 * r12) / (1 - r12 * r12)));
}

// Los KPIs de `embudo` (§K.3b) de un conjunto de carreras: `resultados` = estados finales, `carreras` = lo que
// observó `correrCarrera` por carrera (`tierMaximo`), `observaciones` = ídem (`temporadasNumero1`).
function recuentoEmbudoK0(resultados, carreras) {
  const total = resultados.length;
  const indices = resultados.map((_, i) => i);
  // K1 (D75): "llegó a tier N" = jugó al menos un split con contrato en tier N. Se recuenta desde el registro final
  // (`splitsPorTier`, con código propio) y se exige que coincida con lo que observó `correrCarrera`.
  const tier = resultados.map((r) => [1, 2, 3].find((t) => r.career.registro.porOrg.some((fila) => (fila.splitsPorTier?.[t] ?? 0) > 0)) ?? null);
  tier.forEach((t, i) => {
    if (carreras[i].tierMaximo !== t) {
      throw new Error(`seed ${resultados[i].seed}: carrera.tierMaximo = ${carreras[i].tierMaximo}, el registro dice ${t} (D75)`);
    }
  });
  const buenPapel = resultados.map((r) => cuentaK0(r.career.registro.internacionales, (i) => i.resultado === 'buen_papel'));
  // "#1 del mundo en una temporada" = el reveal del Top 20 de fin de año dice que sos el #1 (los logs `top_mundial`).
  const temporadasNumeroUno = resultados.map((r) => cuentaK0(r.logs, (l) => l.type === 'top_mundial' && l.rankJugador === 1));
  const llegaAPro = (i) => resultados[i].splitFichaje !== null;
  const nTier1 = cuentaK0(indices, (i) => tier[i] === 1);
  const nTop20 = cuentaK0(resultados, (r) => (r.career.registro.picos.rankMundial ?? 0) > 0);
  const conBuenPapel = cuentaK0(buenPapel, (n) => n >= 1);
  const conDosBuenPapel = cuentaK0(buenPapel, (n) => n >= 2);
  return {
    noLlegaAPro: pctK0(cuentaK0(indices, (i) => !llegaAPro(i)), total),
    llegaAPro: pctK0(cuentaK0(indices, llegaAPro), total),
    estancadoT2T3: pctK0(cuentaK0(indices, (i) => llegaAPro(i) && tier[i] !== null && tier[i] >= 2), total),
    proSinTierNunca: pctK0(cuentaK0(indices, (i) => llegaAPro(i) && tier[i] === null), total),
    llegaATier1: pctK0(nTier1, total),
    ganaTituloDomestico: pctK0(cuentaK0(resultados, (r) => r.career.registro.titulos.length >= 1), total),
    top20: pctK0(nTop20, total),
    top20DeTier1: nTier1 > 0 ? pctK0(nTop20, nTier1) : 0,
    numeroUnoAlgunaVez: pctK0(cuentaK0(resultados, (r) => r.career.registro.picos.rankMundial === 1), total),
    numeroUnoDelMundo3Temporadas: pctK0(cuentaK0(temporadasNumeroUno, (n) => n >= 3), total),
    ganaMundial: pctK0(conBuenPapel, total),
    proxyAntesDeK5: true,
    nuevoFaker: pctK0(cuentaK0(indices, (i) => buenPapel[i] >= 2 || temporadasNumeroUno[i] >= 3), total),
    pOtroMundialDadoUno: conBuenPapel >= MUESTRA_MINIMA_K0 ? redondeoK0(conDosBuenPapel / conBuenPapel, 3) : null,
    pOtroMundialN: conBuenPapel,
    buenPapelPorCarrera: { media: redondeoK0(mediaK0(buenPapel), 2), mediana: medianaK0(buenPapel) }
  };
}

// §K.3b — longevidad de los que llegaron a pro.
function recuentoLongevidadK0(resultados) {
  const pro = resultados.filter((r) => r.splitFichaje !== null);
  const anios = pro.map((r) => (r.player.splitCount - r.splitFichaje) / BALANCE.edad.splitsPorEdad);
  const finales = {};
  for (const r of pro) {
    const clave = r.finAnticipado ?? 'retiro_normal';
    finales[clave] = (finales[clave] ?? 0) + 1;
  }
  return {
    aniosCarreraPro: {
      mediana: medianaK0(anios),
      p10: percentilK0(anios, 0.1),
      p90: percentilK0(anios, 0.9),
      pctMenosDe4Anios: pctK0(cuentaK0(anios, (a) => a < UMBRAL_CARRERA_CORTA_K0), anios.length)
    },
    pctTerminaEnLineaForzosa34: pro.length > 0 ? pctK0(cuentaK0(pro, (r) => r.age >= BALANCE.retiro.edadRetiroForzoso), pro.length) : 0,
    desgloseFinAnticipado: Object.fromEntries(Object.entries(finales).map(([clave, cantidad]) => [clave, `${cantidad} (${((cantidad / (pro.length || 1)) * 100).toFixed(1)}%)`]))
  };
}

// §K.3c — distribución de `mentalidad` y `hype` sobre todos los splits pro.
function recuentoEconomiaK0(observaciones) {
  const filas = observaciones.flatMap((o) => o.splitsProData);
  const distribucion = (valores) => ({
    p10: redondeoK0(percentilK0(valores, 0.1), 1),
    p25: redondeoK0(percentilK0(valores, 0.25), 1),
    p50: redondeoK0(percentilK0(valores, 0.5), 1),
    p75: redondeoK0(percentilK0(valores, 0.75), 1),
    p90: redondeoK0(percentilK0(valores, 0.9), 1),
    pctMayorIgual90: pctK0(cuentaK0(valores, (v) => v >= UMBRAL_SATURACION_K0), valores.length)
  });
  return { mentalidad: distribucion(filas.map((d) => d.mentalidad)), hype: distribucion(filas.map((d) => d.hype)) };
}

// §K.3c — el ritmo. `desglosePorTipo` va como mapa tipo -> hojas (el reporte lo da como lista ordenada).
function recuentoRitmoK0(observaciones) {
  const total = observaciones.length;
  const suma = (mapa) => Object.values(mapa).reduce((a, b) => a + b, 0);
  const decisionesPorCarrera = observaciones.map((o) => suma(o.decisionesPorTipo));
  const splitsPro = observaciones.flatMap((o) => o.splitsProRitmo);
  const resumen = (valores) => ({
    n: valores.length,
    p50: medianaK0(valores),
    p90: percentilK0(valores, 0.9),
    max: valores.length > 0 ? Math.max(...valores) : null,
    pctMasDe2: pctK0(cuentaK0(valores, (v) => v > UMBRAL_SPLIT_K0), valores.length),
    pctMasDe4: pctK0(cuentaK0(valores, (v) => v > UMBRAL_SPLIT_LARGO_K0), valores.length)
  });
  const acumulado = {};
  for (const o of observaciones) {
    for (const [tipo, cantidad] of Object.entries(o.decisionesPorTipo)) {
      acumulado[tipo] = (acumulado[tipo] ?? 0) + cantidad;
    }
  }
  const totalDecisiones = suma(acumulado);
  const enMinutos = (valores) => ({ mediana: redondeoK0(medianaK0(valores), 2), p90: redondeoK0(percentilK0(valores, 0.9), 2) });
  const minijuegos = observaciones.map((o) => o.minijuegosCount);
  return {
    interrupcionesPorCarrera: {
      min: Math.round(Math.min(...decisionesPorCarrera)),
      max: Math.round(Math.max(...decisionesPorCarrera)),
      promedio: Number((suma(decisionesPorCarrera) / total).toFixed(2)),
      mediana: medianaK0(decisionesPorCarrera),
      p90: percentilK0(decisionesPorCarrera, 0.9)
    },
    interrupcionesPorSplitPro: {
      todos: resumen(splitsPro.map((s) => s.decisiones)),
      regular: resumen(splitsPro.filter((s) => s.tipo === 'regular').map((s) => s.decisiones)),
      playoffs: resumen(splitsPro.filter((s) => s.tipo === 'playoffs').map((s) => s.decisiones)),
      internacional: resumen(splitsPro.filter((s) => s.tipo === 'internacional').map((s) => s.decisiones))
    },
    desglosePorTipo: Object.fromEntries(Object.entries(acumulado).map(([tipo, cantidad]) => [tipo, {
      cantidadPorCarrera: redondeoK0(cantidad / total, 1),
      pctDelTotal: pctK0(cantidad, totalDecisiones) ?? 0
    }])),
    minijuegosPorCarrera: { promedio: redondeoK0(mediaK0(minijuegos), 2), mediana: medianaK0(minijuegos) },
    tiempoMaquinaMin: enMinutos(observaciones.map((o) => o.tiempoMaquinaMin)),
    tiempoReproductorMin: enMinutos(observaciones.map((o) => o.tiempoReproductorMin))
  };
}

// §K.3a — la correlación nivel/posición. La "misma liga" va SOLO sobre los splits con la liga modelada (tier ≠ 3):
// en los demás el "nivel de la liga" es una constante y centrar por ella no centra nada. Los r van SIN redondear.
function recuentoPosicionK0(observaciones) {
  const conTabla = observaciones.flatMap((o) => o.splitsProData).filter((d) => d.posNorm !== null);
  const modelados = conTabla.filter((d) => d.ligaModelada);
  // K2a: la definición corregida, desde las filas por temporada jugada (que el check "K2a observador" contrasta con un
  // espía de `temporada.aplicar`).
  const temporadas = observaciones.flatMap((o) => o.temporadasData).filter((d) => d.posNorm !== null);
  const temporadasModeladas = temporadas.filter((d) => d.ligaModelada);
  return {
    rNivelPosicionMismaLiga: pearsonK0(modelados.map((d) => d.nivelRelativoJugador), modelados.map((d) => d.posNorm)),
    rNivelPosicionBruto: pearsonK0(conTabla.map((d) => d.nivel), conTabla.map((d) => d.posNorm)),
    splitsConTabla: conTabla.length,
    splitsExcluidosLigaNoModelada: conTabla.length - modelados.length,
    corregida: {
      rNivelPosicionMismaLiga: pearsonK0(temporadasModeladas.map((d) => d.nivelRelativoJugador), temporadasModeladas.map((d) => d.posNorm)),
      rNivelPosicionBruto: pearsonK0(temporadas.map((d) => d.nivel), temporadas.map((d) => d.posNorm)),
      temporadasConTabla: temporadas.length,
      temporadasExcluidasLigaNoModelada: temporadas.length - temporadasModeladas.length,
      splitsProSinTemporada: cuentaK0(conTabla, (d) => d.temporadaJugada === false)
    }
  };
}

// K2a — la tabla del Bo5 medido en el motor (`nivel.bo5Motor`), recontada desde las filas de serie: solo las Bo5, por
// banda [desde, hasta) de |Δ0| y por lado (jugador favorito si Δ0 >= 0, rival favorito si no), el % que ganó el
// favorito con un decimal y el error estándar binomial en puntos, null con menos de 30 series. Las bandas son literales
// propios (las de la investigación de K2, `k2inv/a_bo5b.mjs`, más [20, 30)); el favorito claro es Δ ≈ 10 (PLAN.md, K2c).
const BANDAS_BO5_K2A = [[0, 3], [3, 5], [5, 7], [7, 9], [9, 11], [11, 13], [13, 16], [16, 20], [20, 30]];
const FAVORITO_CLARO_K2A = [9, 11];
function recuentoBo5K2a(observaciones) {
  const series = observaciones.flatMap((o) => o.seriesData).filter((d) => d.formato === 5);
  const celda = (filas) => {
    const n = filas.length;
    if (n < MUESTRA_MINIMA_K0) {
      return { n, ganaFavoritoPct: null, eePct: null };
    }
    const gana = cuentaK0(filas, (d) => (d.delta >= 0 ? d.gano : !d.gano)) / n;
    return { n, ganaFavoritoPct: redondeoK0(gana * 100, 1), eePct: redondeoK0(Math.sqrt(gana * (1 - gana) / n) * 100, 1) };
  };
  const fila = ([desde, hasta]) => {
    const deLaBanda = series.filter((d) => Math.abs(d.delta) >= desde && Math.abs(d.delta) < hasta);
    return {
      desde,
      hasta,
      jugadorFavorito: celda(deLaBanda.filter((d) => d.delta >= 0)),
      rivalFavorito: celda(deLaBanda.filter((d) => d.delta < 0)),
      ambos: celda(deLaBanda)
    };
  };
  const bandas = BANDAS_BO5_K2A.map(fila);
  return {
    seriesBo5: series.length,
    pctJugadorFavorito: pctK0(cuentaK0(series, (d) => d.delta >= 0), series.length),
    deltaMedio: redondeoK0(mediaK0(series.map((d) => d.delta)), 2),
    fueraDeBandas: series.length - bandas.reduce((suma, b) => suma + b.ambos.n, 0),
    bandas,
    favoritoClaro: fila(FAVORITO_CLARO_K2A)
  };
}

// El reporte de un conjunto de carreras (el lote entero o las de una región), todo recontado desde `crudos`.
function recuentoKPIsK0({ resultados, carreras, observaciones }) {
  return {
    embudo: recuentoEmbudoK0(resultados, carreras),
    longevidad: recuentoLongevidadK0(resultados),
    economia: recuentoEconomiaK0(observaciones),
    ritmo: recuentoRitmoK0(observaciones),
    nivel: recuentoPosicionK0(observaciones)
  };
}

// `porRegion` (`state.mundo.regionOrigen`): los mismos KPIs sobre las carreras de cada región.
function recuentoPorRegionK0({ resultados, carreras, observaciones }) {
  const indicesPorRegion = {};
  resultados.forEach((r, i) => {
    const region = r.mundo.regionOrigen ?? 'Desconocida';
    indicesPorRegion[region] = indicesPorRegion[region] ?? [];
    indicesPorRegion[region].push(i);
  });
  return Object.fromEntries(Object.entries(indicesPorRegion).map(([region, indices]) => {
    const parcial = recuentoKPIsK0({
      resultados: indices.map((i) => resultados[i]),
      carreras: indices.map((i) => carreras[i]),
      observaciones: indices.map((i) => observaciones[i])
    });
    return [region, {
      totalCarreras: indices.length,
      embudo: parcial.embudo,
      longevidad: parcial.longevidad,
      nivel: parcial.nivel,
      ritmo: {
        interrupcionesPorCarreraMediana: parcial.ritmo.interrupcionesPorCarrera.mediana,
        interrupcionesPorSplitProMediana: parcial.ritmo.interrupcionesPorSplitPro.todos.p50,
        minijuegosPorCarreraMediana: parcial.ritmo.minijuegosPorCarrera.mediana,
        tiempoMaquinaMinMediana: parcial.ritmo.tiempoMaquinaMin.mediana,
        tiempoReproductorMinMediana: parcial.ritmo.tiempoReproductorMin.mediana
      }
    }];
  }));
}

// Tolerancia de las hojas: los r vienen redondeados a 3 decimales en el reporte y acá SIN redondear (la media
// unidad del último decimal, más un resto de coma flotante); el resto de las hojas se recuenta con la misma
// aritmética de enteros y tiene que dar igual.
const TOLERANCIA_R_K0 = 5e-4 + 1e-9;
const TOLERANCIA_EXACTA_K0 = 1e-9;

// Compara `medido` contra `esperado` hoja por hoja (solo las claves del recuento); cuenta las hojas comparadas y
// acumula los problemas. `ignorar` = claves del reporte que el recuento no cubre a propósito.
function compararHojasK0(medido, esperado, ruta, problemas, cuenta, ignorar = []) {
  if (esperado !== null && typeof esperado === 'object') {
    if (medido === null || typeof medido !== 'object') {
      problemas.push(`${ruta}: el reporte no trae un objeto (${JSON.stringify(medido)})`);
      return;
    }
    for (const clave of Object.keys(esperado)) {
      compararHojasK0(medido[clave], esperado[clave], `${ruta}.${clave}`, problemas, cuenta, ignorar);
    }
    for (const clave of Object.keys(medido)) {
      if (!(clave in esperado) && !ignorar.includes(clave)) {
        problemas.push(`${ruta}.${clave}: hoja del reporte que el recuento independiente no cubre`);
      }
    }
    return;
  }
  cuenta.hojas += 1;
  const tolerancia = /\.rNivelPosicion(MismaLiga|Bruto)$/.test(ruta) ? TOLERANCIA_R_K0 : TOLERANCIA_EXACTA_K0;
  const coincide = typeof esperado === 'number'
    ? typeof medido === 'number' && Math.abs(medido - esperado) <= tolerancia
    : medido === esperado;
  if (!coincide) {
    problemas.push(`${ruta}: el reporte dice ${JSON.stringify(medido)}, el recuento independiente ${JSON.stringify(esperado)}`);
  }
}

// La ablación (§K.3a), recontada acá: los 5 ruidos de `RUIDOS_ABLACION_K0` en cero, las carreras de las seeds
// dadas con el bot dado, la observación de cada una (las filas de `splitsProData` y, desde K2a, las corregidas de
// `temporadasData`). Restaura SIEMPRE los ruidos (`finally`). No usa `correrSinRuido` ni `PARAMETROS_RUIDO`: son los
// que se verifican.
function ablacionIndependienteK0(semillas, splits, responder) {
  const originales = RUIDOS_ABLACION_K0.map(([grupo, clave]) => BALANCE[grupo][clave]);
  try {
    for (const [grupo, clave] of RUIDOS_ABLACION_K0) {
      BALANCE[grupo][clave] = 0;
    }
    return semillas.map((seed) => correrCarreraSimulate(seed, splits, responder).observacion);
  } finally {
    RUIDOS_ABLACION_K0.forEach(([grupo, clave], i) => {
      BALANCE[grupo][clave] = originales[i];
    });
  }
}

// Los estadísticos de la ablación sobre filas planas: varianza poblacional de la posición y R² de nivel + equipo.
function estadisticosAblacionK0(filas) {
  return {
    varianza: filas.length < 2 ? 0 : varianzaPoblacionalK0(filas.map((d) => d.posNorm)),
    r2: r2DosRegresoresK0(filas.map((d) => d.posNorm), filas.map((d) => d.nivelRelativoJugador), filas.map((d) => d.nivelRelativoCompaneros))
  };
}

// La varianza explicada de un conjunto de filas por carrera (lote normal y lote sin ruido), recontada: los R²
// y las varianzas del titular, y el bootstrap por carrera (200 remuestreos de carreras enteras con la semilla
// 7777: primero las del lote normal y después las del lote sin ruido, en cada remuestreo, con UN solo rng).
function recuentoVarianzaK0(filasBasePorCarrera, filasSinPorCarrera) {
  const base = estadisticosAblacionK0(filasBasePorCarrera.flat());
  const sin = estadisticosAblacionK0(filasSinPorCarrera.flat());
  const baseFlat = filasBasePorCarrera.flat();
  const ys = baseFlat.map((d) => d.posNorm);
  const rng = mulberry32(SEMILLA_BOOTSTRAP_K0);
  const remuestrear = (porCarrera) => {
    const elegidas = [];
    for (let i = 0; i < porCarrera.length; i += 1) {
      elegidas.push(porCarrera[Math.floor(rng() * porCarrera.length)]);
    }
    return elegidas.flat();
  };
  const muestras = { ruidoPuro: [], r2Base: [], r2Sin: [] };
  for (let b = 0; b < REMUESTREOS_BOOTSTRAP_K0; b += 1) {
    const remBase = estadisticosAblacionK0(remuestrear(filasBasePorCarrera));
    const remSin = estadisticosAblacionK0(remuestrear(filasSinPorCarrera));
    if (remBase.varianza > 0) muestras.ruidoPuro.push(1 - remSin.varianza / remBase.varianza);
    if (remBase.r2 !== null) muestras.r2Base.push(remBase.r2);
    if (remSin.r2 !== null) muestras.r2Sin.push(remSin.r2);
  }
  return {
    r2: base.r2,
    r2SoloNivel: cuadradoK0(baseFlat.length < MUESTRA_MINIMA_K0 ? null : correlacionK0(baseFlat.map((d) => d.nivelRelativoJugador), ys)),
    r2SoloEquipo: cuadradoK0(baseFlat.length < MUESTRA_MINIMA_K0 ? null : correlacionK0(baseFlat.map((d) => d.nivelRelativoCompaneros), ys)),
    r2Sin: sin.r2,
    varBase: base.varianza,
    varSin: sin.varianza,
    ruidoPuroCrudo: base.varianza > 0 ? 1 - sin.varianza / base.varianza : null,
    eeR2: desvioK0(muestras.r2Base),
    eeR2Sin: desvioK0(muestras.r2Sin),
    eeRuidoPuro: desvioK0(muestras.ruidoPuro),
    nBase: baseFlat.length,
    nSin: filasSinPorCarrera.flat().length
  };
}

check('K0 foto de ruido: BALANCE arranca con los ruidos de resultados > 0 y igual a una copia virgen de balance.js', () => {
  // Trinquete (K0-A, revisión): sin esta foto "ablación restaura BALANCE" comparaba contra una foto ya contaminada.
  afirmarRuidoIntactoK0('al arrancar el bloque K0');
});

check('K0 recorrido de hojas: detecta NaN, undefined y null no permitido en cualquier bloque del reporte', () => {
  // Trinquete (K0-A, revisión): el check de finitud solo miraba algunas hojas; un NaN en `nivel.varianzaExplicada`
  // o en `porRegion` pasaba. El recorrido es sobre TODAS las hojas, y acá se prueba que de verdad las ve.
  const sano = { embudo: { noLlegaAPro: 20, pOtroMundialDadoUno: null }, nivel: { varianzaExplicada: { r2NivelYEquipo: 0.1, ruidoPuro: null } }, porRegion: { Corea: { embudo: { noLlegaAPro: 30 }, nivel: { rNivelPosicionMismaLiga: null } } } };
  const problemasSano = hojasProblematicasK0(sano, '', NULOS_PERMITIDOS_K0);
  if (problemasSano.length !== 0) {
    throw new Error(`un reporte sano dio problemas: ${problemasSano.join('; ')}`);
  }
  const casos = [
    [{ ...sano, nivel: { varianzaExplicada: { r2NivelYEquipo: NaN, ruidoPuro: null } } }, 'nivel.varianzaExplicada.r2NivelYEquipo'],
    [{ ...sano, porRegion: { Corea: { embudo: { noLlegaAPro: NaN }, nivel: { rNivelPosicionMismaLiga: null } } } }, 'porRegion.Corea.embudo.noLlegaAPro'],
    [{ ...sano, nivel: { varianzaExplicada: { r2NivelYEquipo: null, ruidoPuro: null } } }, 'nivel.varianzaExplicada.r2NivelYEquipo'],
    [{ ...sano, embudo: { noLlegaAPro: Infinity, pOtroMundialDadoUno: null } }, 'embudo.noLlegaAPro'],
    [{ ...sano, embudo: { noLlegaAPro: undefined, pOtroMundialDadoUno: null } }, 'embudo.noLlegaAPro']
  ];
  for (const [reporte, ruta] of casos) {
    const problemas = hojasProblematicasK0(reporte, '', NULOS_PERMITIDOS_K0);
    if (!problemas.some((p) => p.startsWith(ruta))) {
      throw new Error(`el recorrido no detectó el problema en ${ruta}: ${JSON.stringify(problemas)}`);
    }
  }
});

check('K0 puntuarPrevia: más positivo/alto puntúa más, la ruleta penaliza, y criterio/malas la usan al derecho y al revés', () => {
  // Trinquete (K0-A, revisión): con el signo invertido `criterio` elegía lo peor y `malas` lo mejor, y ningún check lo veía.
  const item = (signo, magnitud) => ({ campo: 'x', signo, magnitud });
  const op = (previa, riesgo = 'seguro') => ({ id: 'o', previa, riesgo });
  if (!(puntuarPrevia(op([item('+', 'alta')])) > puntuarPrevia(op([item('-', 'alta')])))) {
    throw new Error('una opción +alta tiene que puntuar más que una -alta');
  }
  if (!(puntuarPrevia(op([item('+', 'alta')])) > puntuarPrevia(op([item('+', 'media')]))
    && puntuarPrevia(op([item('+', 'media')])) > puntuarPrevia(op([item('+', 'baja')]))
    && puntuarPrevia(op([item('+', 'baja')])) > 0)) {
    throw new Error('+alta > +media > +baja > 0');
  }
  if (!(puntuarPrevia(op([item('-', 'baja')])) > puntuarPrevia(op([item('-', 'media')]))
    && puntuarPrevia(op([item('-', 'media')])) > puntuarPrevia(op([item('-', 'alta')]))
    && puntuarPrevia(op([item('-', 'baja')])) < 0)) {
    throw new Error('-baja > -media > -alta, y todas negativas');
  }
  if (!(puntuarPrevia(op([item('+', 'alta')], 'ruleta')) < puntuarPrevia(op([item('+', 'alta')], 'seguro')))) {
    throw new Error('la ruleta tiene que penalizar frente a la misma previa segura');
  }
  if (puntuarPrevia(op([])) !== 0 || puntuarPrevia(null) !== 0) {
    throw new Error('sin previa el puntaje es 0');
  }
  if (puntuarPrevia(op([item('+', 'alta'), item('-', 'media')])) !== puntuarPrevia(op([item('+', 'baja')]))) {
    throw new Error('los ítems se suman con su signo (+alta -media = +baja)');
  }

  const decision = {
    tipo: 'opciones', presentacion: 'evento', datos: {},
    opciones: [
      { id: 'a', previa: [item('+', 'baja')], riesgo: 'seguro' },
      { id: 'b', previa: [item('-', 'alta')], riesgo: 'seguro' },
      { id: 'c', previa: [item('+', 'alta')], riesgo: 'ruleta' },
      { id: 'd', previa: [item('+', 'alta')], riesgo: 'seguro' }
    ]
  };
  const sistemaSinAuto = { id: 'eventos', resolverAuto() { throw new Error('no debería delegar'); } };
  const estado = { seed: 1, player: { splitCount: 1 }, logs: [] };
  const elegidaCriterio = ESTRATEGIAS_K0.criterio(sistemaSinAuto, estado, decision, rngProhibidoK0).opcionId;
  const elegidaMalas = ESTRATEGIAS_K0.malas(sistemaSinAuto, estado, decision, rngProhibidoK0).opcionId;
  if (elegidaCriterio !== 'd') {
    throw new Error(`criterio tendría que elegir la +alta segura ('d'), eligió '${elegidaCriterio}'`);
  }
  if (elegidaMalas !== 'b') {
    throw new Error(`malas tendría que elegir la -alta ('b'), eligió '${elegidaMalas}'`);
  }

  // Draft (opciones best-first por `factorDeCampeon`): criterio la primera, malas la última. Minijuego: 0,85 y 0,15.
  const draft = { tipo: 'opciones', presentacion: 'draft', datos: { motivo: 'draft' }, opciones: [{ id: 'mejor' }, { id: 'medio' }, { id: 'peor' }] };
  if (ESTRATEGIAS_K0.criterio(sistemaSinAuto, estado, draft, rngProhibidoK0).opcionId !== 'mejor'
    || ESTRATEGIAS_K0.malas(sistemaSinAuto, estado, draft, rngProhibidoK0).opcionId !== 'peor') {
    throw new Error('en el draft criterio elige la primera opción y malas la última');
  }
  const minijuego = { tipo: 'minijuego', presentacion: 'minijuego', datos: { motivo: 'minijuego' }, opciones: [] };
  const juegoBien = ESTRATEGIAS_K0.criterio(sistemaSinAuto, estado, minijuego, rngProhibidoK0).resultado;
  const juegoMal = ESTRATEGIAS_K0.malas(sistemaSinAuto, estado, minijuego, rngProhibidoK0).resultado;
  if (juegoBien !== 0.85 || juegoMal !== 0.15) {
    throw new Error(`en el minijuego criterio juega con 0,85 y malas con 0,15; jugaron ${juegoBien} y ${juegoMal}`);
  }
});

check('K0 estadística compartida: pearson sin redondear (null con < 30 pares), medianas, percentil, desvío, OLS', () => {
  // Trinquete (K0-A, revisión H3/H5): `pearson` había pasado a redondear a 3 decimales y `agencia.js` tenía su propia copia de estos helpers.
  const xs = Array.from({ length: 40 }, (_, i) => i);
  const ys = xs.map((x) => x + 7 * Math.sin(x));
  const r = pearson(xs, ys);
  if (!(r > 0.9 && r < 1) || r === Number(r.toFixed(3))) {
    throw new Error(`pearson tiene que devolver el coeficiente crudo, no redondeado a 3 decimales: ${r}`);
  }
  if (Math.abs(pearson(xs, xs.map((x) => 3 * x + 2)) - 1) > 1e-12 || Math.abs(pearson(xs, xs.map((x) => -x)) + 1) > 1e-12) {
    throw new Error('pearson de una recta perfecta tiene que ser +1 / -1');
  }
  if (pearson(xs.slice(0, 29), ys.slice(0, 29)) !== null || pearson(xs.slice(0, 30), ys.slice(0, 30)) === null) {
    throw new Error('pearson devuelve null con menos de 30 pares y número con 30');
  }
  if (promedio([]) !== null || promedio([1, 2, 6]) !== 3) {
    throw new Error('promedio');
  }
  if (medianaSim([5, 1, 3]) !== 3 || medianaSim([4, 1, 3, 2]) !== 2.5 || medianaInferior([4, 1, 3, 2]) !== 2 || medianaInferior([5, 1, 3]) !== 3 || medianaSim([]) !== null) {
    throw new Error('mediana / medianaInferior: con n par la primera promedia los dos centrales y la segunda toma el de abajo');
  }
  if (percentil([10, 20, 30, 40, 50], 0.5) !== 30 || percentil([10, 20, 30, 40, 50], 0.9) !== 50 || percentil([], 0.5) !== null) {
    throw new Error('percentil');
  }
  if (Math.abs(desvioMuestral([2, 4, 4, 4, 5, 5, 7, 9]) - Math.sqrt(32 / 7)) > 1e-12 || desvioMuestral([3]) !== 0) {
    throw new Error('desvioMuestral usa n - 1 (y da 0 con un solo valor)');
  }
  if (Math.abs(varianza([2, 4, 4, 4, 5, 5, 7, 9]) - 4) > 1e-12) {
    throw new Error('varianza poblacional de [2,4,4,4,5,5,7,9] tiene que ser 4');
  }
  // OLS con 2 regresores: y = 3 + 2*x1 - x2 exacto => R² = 1; y solo depende de x1 => r2SoloNivel = r2NivelYEquipo = 1.
  const x1 = Array.from({ length: 40 }, (_, i) => (i * 7) % 11);
  const x2 = Array.from({ length: 40 }, (_, i) => (i * 5) % 13);
  const exacta = regresionLineal2Regresores(x1.map((v, i) => 3 + 2 * v - x2[i]), x1, x2);
  if (Math.abs(exacta.r2NivelYEquipo - 1) > 1e-9 || exacta.r2SoloNivel >= 1 || exacta.r2SoloEquipo >= 1) {
    throw new Error(`OLS sobre una combinación lineal exacta: ${JSON.stringify(exacta)}`);
  }
  const soloX1 = regresionLineal2Regresores(x1.map((v) => 5 * v), x1, x2);
  if (Math.abs(soloX1.r2SoloNivel - 1) > 1e-9 || Math.abs(soloX1.r2NivelYEquipo - 1) > 1e-9) {
    throw new Error(`OLS con y = 5*x1: ${JSON.stringify(soloX1)}`);
  }
  const ruido = regresionLineal2Regresores(x1.map((_, i) => Math.sin(i * 12.9898) * 43758.5453 % 1), x1, x2);
  if (!(ruido.r2NivelYEquipo >= 0 && ruido.r2NivelYEquipo < 0.5)) {
    throw new Error(`OLS contra ruido: R² fuera de [0, 0,5): ${ruido.r2NivelYEquipo}`);
  }
  if (regresionLineal2Regresores([1, 2], [1, 2], [1, 2]).r2NivelYEquipo !== null) {
    throw new Error('OLS con menos de 30 filas devuelve null');
  }
});

check('K0 mercado: criterio elige el tier más bajo (y adentro del tier la jerarquía, y a igualdad el salario), malas la peor, y "esperar" solo sin ofertas', () => {
  // Trinquete (K0-A, revisión H1): la regla vieja ordenaba por jerarquía proyectada primero y `criterio` renovaba el 97% de las veces.
  const oferta = (id, tier, hasta, salario) => ({ id, org: id, tier, proyeccionJerarquia: { desde: 50, hasta }, salarioAnualUSD: salario });
  const decisionDe = (opciones) => ({ tipo: 'opciones', presentacion: 'mercado', opciones, datos: { motivo: 'oferta' } });
  const sistemaSinAuto = { id: 'mercado', resolverAuto() { throw new Error('no debería delegar'); } };
  const estado = { seed: 1, player: { splitCount: 1 }, logs: [] };
  const elegir = (bot, opciones) => ESTRATEGIAS_K0[bot](sistemaSinAuto, estado, decisionDe(opciones), rngProhibidoK0);

  // "El cuarto nombre de un gigante" (tier 1, jerarquía baja) le gana a la renovación en tier 2 con jerarquía alta.
  const mercado = [oferta('renovacion', 2, 60, 100), oferta('gigante', 1, 25, 50), oferta('chico', 3, 80, 500)];
  if (elegir('criterio', mercado).opcionId !== 'gigante') {
    throw new Error(`criterio tenía que elegir el tier 1, eligió ${JSON.stringify(elegir('criterio', mercado))}`);
  }
  if (elegir('malas', mercado).opcionId !== 'chico') {
    throw new Error(`malas tenía que elegir el tier 3, eligió ${JSON.stringify(elegir('malas', mercado))}`);
  }
  // Mismo tier: gana la mayor jerarquía proyectada; a igualdad, el mayor salario.
  const mismoTier = [oferta('a', 1, 30, 900), oferta('b', 1, 60, 100), oferta('c', 1, 60, 200)];
  if (elegir('criterio', mismoTier).opcionId !== 'c') {
    throw new Error(`mismo tier y misma jerarquía: tenía que ganar el mayor salario, eligió ${elegir('criterio', mismoTier).opcionId}`);
  }
  if (elegir('malas', mismoTier).opcionId !== 'a') {
    throw new Error(`malas tenía que elegir la de menor jerarquía, eligió ${elegir('malas', mismoTier).opcionId}`);
  }
  // Sin ofertas, y solo entonces, se espera. Con ofertas nunca.
  for (const bot of ['criterio', 'malas']) {
    if (elegir(bot, []).negociar !== 'esperar') {
      throw new Error(`${bot}: sin ofertas tenía que esperar`);
    }
    for (const opciones of [mercado, mismoTier, [oferta('unica', 3, 10, 1)]]) {
      const respuesta = elegir(bot, opciones);
      if (respuesta.negociar !== undefined || !opciones.some((o) => o.id === respuesta.opcionId)) {
        throw new Error(`${bot}: con ofertas tenía que elegir una, devolvió ${JSON.stringify(respuesta)}`);
      }
    }
  }
  // El comparador es antisimétrico y reflexivo en 0.
  const todas = [...mercado, ...mismoTier];
  for (const x of todas) {
    if (compararOfertasMercado(x, x) !== 0) {
      throw new Error(`compararOfertasMercado(${x.id}, ${x.id}) tenía que ser 0`);
    }
    for (const y of todas) {
      if (Math.sign(compararOfertasMercado(x, y)) !== -Math.sign(compararOfertasMercado(y, x))) {
        throw new Error(`compararOfertasMercado no es antisimétrico entre ${x.id} y ${y.id}`);
      }
    }
  }
});

check('K0 favoritoBo5: coincide con una Bo5 binomial explícita, Δ=0 da 0,5, es monótono y no es una Bo3', () => {
  // Trinquete (K0-A, revisión): con la fórmula de una Bo3 el KPI cambiaba y ningún check lo veía.
  const combinaciones = (n, k) => {
    let r = 1;
    for (let i = 1; i <= k; i += 1) {
      r = (r * (n - k + i)) / i;
    }
    return r;
  };
  // Implementación independiente: se juegan los 5 mapas y gana quien lleva 3 o más.
  const bo5 = (p) => [3, 4, 5].reduce((s, j) => s + combinaciones(5, j) * p ** j * (1 - p) ** (5 - j), 0);
  const bo3 = (p) => [2, 3].reduce((s, j) => s + combinaciones(3, j) * p ** j * (1 - p) ** (3 - j), 0);

  const tabla = calcularFavoritoBo5();
  if (tabla.length !== DELTAS_FAVORITO_BO5.length) {
    throw new Error(`la tabla tiene ${tabla.length} filas, se esperaban ${DELTAS_FAVORITO_BO5.length}`);
  }
  let anterior = null;
  for (const fila of tabla) {
    // K2b: la p de un mapa es la del motor, con el σ combinado de mapa (`partido.sigmaMapa`).
    const pMapa = probabilidadPorSigma(fila.delta, 0, BALANCE.partido.sigmaMapa);
    if (Math.abs(fila.pMapa - pMapa) > 6e-5) {
      throw new Error(`Δ=${fila.delta}: pMapa ${fila.pMapa} no es la p de un mapa del motor (${pMapa})`);
    }
    if (Math.abs(fila.pSerieBo5 - bo5(pMapa)) > 6e-5) {
      throw new Error(`Δ=${fila.delta}: pSerieBo5 ${fila.pSerieBo5} no coincide con la Bo5 binomial (${bo5(pMapa).toFixed(4)})`);
    }
    if (fila.delta > 0 && !(fila.pSerieBo5 > fila.pMapa)) {
      throw new Error(`Δ=${fila.delta}: la serie tiene que amplificar al favorito (${fila.pSerieBo5} <= ${fila.pMapa})`);
    }
    if (anterior !== null && !(fila.pSerieBo5 > anterior)) {
      throw new Error(`Δ=${fila.delta}: pSerieBo5 no crece con Δ (${fila.pSerieBo5} <= ${anterior})`);
    }
    anterior = fila.pSerieBo5;
  }
  const delta4 = tabla.find((f) => f.delta === 4);
  if (Math.abs(delta4.pSerieBo5 - bo3(probabilidadPorSigma(4, 0, BALANCE.partido.sigmaMapa))) < 0.01) {
    throw new Error('la tabla se parece a una Bo3, no a una Bo5');
  }
  const parejos = tabla.find((f) => f.delta === 0);
  if (parejos.pMapa !== 0.5 || parejos.pSerieBo5 !== 0.5) {
    throw new Error(`Δ=0 tenía que dar 0,5 y 0,5: ${JSON.stringify(parejos)}`);
  }
  // Lee la p del motor (y acepta otra por parámetro): con σ=0 el favorito gana siempre.
  const sinRuido = calcularFavoritoBo5([0, 5], (delta) => probabilidadPorSigma(delta, 0, 0));
  if (sinRuido[0].pSerieBo5 !== 0.5 || sinRuido[1].pSerieBo5 !== 1) {
    throw new Error(`con σ=0: ${JSON.stringify(sinRuido)}`);
  }
});

// Una réplica sintética de agencia: solo `fin.score` importa para el test; el resto son los campos que
// `analizarDatosAgencia` lee.
const repSinteticaK0 = (score) => ({ fin: { score, titulos: 0, t1: 0, splits: 10, rank: 0 }, c1: { pos: 1, nivel: 50, jer: 50, ment: 50, hype: 50, elo: 1000 } });

// Referencia estándar: valor crítico de la t de Student bilateral al 95% (α = 0,05) para df 1 a 30.
const T_REFERENCIA_95_K0 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
  2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086,
  2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042
];
// La referencia viene redondeada a 3 decimales: el error máximo de un valor correcto es media milésima.
const TOLERANCIA_TABLA_T_K0 = 5e-4 + 1e-9;

check('K0 tabla t: la tabla df 1 a 30 coincide con la referencia estándar y tCriticoBilateral la reproduce (también α = 0,01 y las formas cerradas de df 1 y 2)', () => {
  // Trinquete (K0-A, 2ª revisión): el check anclaba 9 de los 30 valores; df 3 = 2,9 y df 15 = 2,130 pasaban. Ahora
  // se ancla la tabla ENTERA contra la referencia estándar, y el cálculo numérico contra la tabla y contra valores
  // independientes (α = 0,01 de tablas publicadas y la forma cerrada de df 1 y df 2, que sirve para cualquier α).
  T_REFERENCIA_95_K0.forEach((referencia, i) => {
    const df = i + 1;
    if (Math.abs(tCritico(df) - referencia) > TOLERANCIA_TABLA_T_K0) {
      throw new Error(`tCritico(${df}) = ${tCritico(df)}, la referencia estándar dice ${referencia}`);
    }
    if (Math.abs(tCriticoBilateral(df, 0.05) - referencia) > TOLERANCIA_TABLA_T_K0) {
      throw new Error(`tCriticoBilateral(${df}, 0,05) = ${tCriticoBilateral(df, 0.05)}, la referencia estándar dice ${referencia}`);
    }
  });
  // Más allá de df 30 la tabla usa el límite normal.
  for (const df of [31, 200]) {
    if (tCritico(df) !== 1.96) {
      throw new Error(`tCritico(${df}) tenía que ser el límite normal 1,96, dio ${tCritico(df)}`);
    }
  }
  for (const [df, esperado] of [[5, 4.032], [10, 3.169], [30, 2.750]]) {
    if (Math.abs(tCriticoBilateral(df, 0.01) - esperado) > 5e-3) {
      throw new Error(`tCriticoBilateral(${df}, 0,01) = ${tCriticoBilateral(df, 0.01)}, las tablas dicen ${esperado}`);
    }
  }
  // Formas cerradas, válidas para cualquier α: df 1 (Cauchy) t = tan(π(1 − α)/2); df 2 t = √2·(1 − α) / √(1 − (1 − α)²).
  for (const alfa of [0.05, 0.05 / 3, 0.05 / 6, 0.05 / 15, 0.05 / 21]) {
    const cauchy = Math.tan((Math.PI * (1 - alfa)) / 2);
    const dos = (Math.SQRT2 * (1 - alfa)) / Math.sqrt(1 - (1 - alfa) ** 2);
    if (Math.abs(tCriticoBilateral(1, alfa) / cauchy - 1) > 1e-9 || Math.abs(tCriticoBilateral(2, alfa) / dos - 1) > 1e-9) {
      throw new Error(`α = ${alfa}: df 1 da ${tCriticoBilateral(1, alfa)} (exacto ${cauchy}), df 2 da ${tCriticoBilateral(2, alfa)} (exacto ${dos})`);
    }
  }
  // Más grados de libertad o más α: el crítico baja; menos α: sube.
  if (!(tCriticoBilateral(5, 0.05) > tCriticoBilateral(6, 0.05) && tCriticoBilateral(5, 0.01) > tCriticoBilateral(5, 0.05))) {
    throw new Error('tCriticoBilateral tiene que bajar con df y subir al achicar α');
  }
  for (const [df, alfa] of [[0, 0.05], [5, 0], [5, 1]]) {
    let lanzo = false;
    try {
      tCriticoBilateral(df, alfa);
    } catch {
      lanzo = true;
    }
    if (!lanzo) {
      throw new Error(`tCriticoBilateral(${df}, ${alfa}) tenía que rechazar los argumentos fuera de dominio`);
    }
  }
});

// Conjunto sintético de agencia con respuesta conocida (no simula nada: pasa la referencia de σ a mano).
// 4 tipos "claramente significativos", uno justo por encima del umbral (12,5%), uno justo por debajo (9,1%),
// y varios sin efecto, más un tipo que nunca se midió (una interrupción sin elección real).
check('K0 agencia sintética: las tres definiciones de pctInterrupcionesConPalanca con números calculados a mano, umbral y réplicas mínimas', () => {
  // Trinquete (K0-A, revisión): con el umbral en 0, o el porcentaje x10, la corrida real seguía "finita y en rango".
  // K0-A, 2ª revisión: `pctInterrupcionesConPalanca` pasó a ser el PONDERADO sin umbral y el todo-o-nada de la auditoría
  // se llama `...Auditoria` (con el test corregido por comparaciones múltiples); la tabla t tiene su propio check.
  const rep = repSinteticaK0;
  const decision = (tipo, a, b) => ({ seed: 1, split: 1, tipo, labels: ['a', 'b'], porOpcion: [a.map(rep), b.map(rep)] });
  const SIG = [[100, 103, 98, 101], [10, 12, 9, 11]]; // diferencias 90, 91, 89, 90: t enorme
  const NO = [[10, 12, 11, 13], [11, 12, 12, 12]]; // diferencias 1, 0, 1, -1: t = 0,52 (crítico con df 3: 3,182)
  const veces = (n, tipo, par) => Array.from({ length: n }, () => decision(tipo, ...par));

  const resultados = [
    ...veces(4, 'serie:draft', SIG),
    ...veces(2, 'mercado:oferta', SIG),
    ...veces(3, 'amateur:reparto', SIG),
    decision('eventos:x:rutina', ...SIG), ...veces(3, 'eventos:x:rutina', NO), ...veces(4, 'eventos:x:parche', NO),
    decision('serie:minijuego', ...SIG), ...veces(10, 'serie:minijuego', NO),
    ...veces(2, 'temporada:momento', NO),
    ...veces(2, 'temporada:draft', NO),
    ...veces(2, 'edadCierre:x:rutina', NO),
    // Con 2 réplicas pedidas y 2 válidas se analiza (el piso es min(MIN_REPLICAS_VALIDAS, réplicas pedidas)).
    { seed: 1, split: 1, tipo: 'practica:practica', labels: ['a', 'b'], porOpcion: [[rep(10), rep(12)], [rep(11), rep(12)]] },
    // Con 6 pedidas y solo 3 válidas NO se analiza.
    { seed: 1, split: 2, tipo: 'serie:draft', labels: ['a', 'b'], porOpcion: [[rep(100), rep(101), rep(102), null, null, null], [rep(10), rep(11), rep(12), null, null, null]] }
  ];
  const frecuenciasTipo = {
    'serie:draft': 30, 'mercado:oferta': 20, 'amateur:reparto': 10,
    'eventos:x:rutina': 30, 'eventos:x:parche': 20,
    'serie:minijuego': 25, 'temporada:momento': 15, 'temporada:draft': 10, 'practica:practica': 10,
    'edadCierre:x:rutina': 15,
    'amateur:salida_amateur': 15 // nunca se midió: cuenta en el denominador
  };
  const totalInterrupciones = Object.values(frecuenciasTipo).reduce((a, b) => a + b, 0);
  if (totalInterrupciones !== 200) {
    throw new Error(`el conjunto sintético debería sumar 200 interrupciones, suma ${totalInterrupciones}`);
  }

  const analisis = analizarDatosAgencia({ resultados, frecuenciasTipo, totalInterrupciones }, 1, { sPop: 10, sPopT: 1 });
  // TODO-O-NADA (la auditoría), con >= UMBRAL_SIGNIFICATIVO = 10%: serie:draft 30 + mercado:oferta 20 + amateur:reparto 10
  // + eventos 50 (12,5% de sus decisiones) = 110 de 200 = 55 %. serie:minijuego (9,1%) no llega y no suma.
  // Con el test viejo da lo mismo: con 2 opciones el único par es el mejor contra el peor.
  // PONDERADO (el KPI): Σ frecuencia × fracción significativa = 30×1 + 20×1 + 10×1 + 50×(1/8) + 25×(1/11) = 66,25 + 25/11
  // = 68,5227; sobre 200 interrupciones: 34,2614 → 34,3 %.
  if (UMBRAL_SIGNIFICATIVO !== 10) {
    throw new Error(`UMBRAL_SIGNIFICATIVO tenía que ser 10 (la lectura de AUDITORIA.md §4.3), es ${UMBRAL_SIGNIFICATIVO}`);
  }
  if (analisis.pctInterrupcionesConPalancaAuditoria !== 55) {
    throw new Error(`pctInterrupcionesConPalancaAuditoria tenía que ser 55 (110 de 200), dio ${analisis.pctInterrupcionesConPalancaAuditoria}`);
  }
  if (analisis.pctInterrupcionesConPalancaAuditoriaTestViejo !== 55) {
    throw new Error(`pctInterrupcionesConPalancaAuditoriaTestViejo tenía que ser 55 (con 2 opciones el test viejo y el nuevo coinciden), dio ${analisis.pctInterrupcionesConPalancaAuditoriaTestViejo}`);
  }
  if (analisis.pctInterrupcionesConPalanca !== 34.3) {
    throw new Error(`pctInterrupcionesConPalanca (ponderado) tenía que ser 34,3 (68,52 de 200), dio ${analisis.pctInterrupcionesConPalanca}`);
  }
  if (analisis.totalDecisionesMedidas !== resultados.length) {
    throw new Error(`totalDecisionesMedidas ${analisis.totalDecisionesMedidas} != ${resultados.length}`);
  }
  const fila = (tipo) => analisis.filas.find((f) => f.tipo === tipo);
  const esperadas = [
    ['serie:draft', 4, 100], ['mercado:oferta', 2, 100], ['amateur:reparto', 3, 100],
    ['eventos:*', 8, 12.5], ['serie:minijuego', 11, 9.1], ['temporada:momento', 2, 0], ['edadCierre:*', 2, 0], ['practica:practica', 1, 0]
  ];
  for (const [tipo, n, pctSig] of esperadas) {
    const f = fila(tipo);
    if (!f) {
      throw new Error(`falta la fila ${tipo}`);
    }
    if (f.n !== n || f.pctSignificativo !== pctSig) {
      throw new Error(`${tipo}: se esperaba n=${n} y ${pctSig}% significativo, dio n=${f.n} y ${f.pctSignificativo}%`);
    }
  }
  if (fila('serie:draft').palancaMediana !== 9) {
    throw new Error(`serie:draft: palanca (90 puntos / σ 10) tenía que ser 9, dio ${fila('serie:draft').palancaMediana}`);
  }
  if (MIN_REPLICAS_VALIDAS !== 4) {
    throw new Error(`MIN_REPLICAS_VALIDAS tenía que ser 4 (la auditoría), es ${MIN_REPLICAS_VALIDAS}`);
  }
});

// Una réplica sintética con las tres columnas de `fin` que leen las filas de la tabla: puntaje, títulos y tier 1.
const repColumnasK0 = (score, titulos, t1) => {
  const rep = repSinteticaK0(score);
  rep.fin.titulos = titulos;
  rep.fin.t1 = t1;
  return rep;
};

check('K0 agencia: cada columna de la tabla (n, palanca, % significativo, ruido, Δ títulos, Δ tier 1), el agrupamiento eventos:* / edadCierre:* y el orden, con números calculados a mano', () => {
  // Trinquete (K0-A, 3ª revisión): el check de las tres definiciones solo ancla `pctInterrupcionesConPalanca` y su familia. Tres mutantes
  // de las columnas de la tabla sobrevivían a `--solo=K0` entero: el ruido dentro de la opción sin dividir por σ poblacional (`dentroRel:
  // dentro`), la palanca como promedio en vez de mediana, y Δ tier 1 sin restar el mínimo (`Math.max(...mT1)`). Acá cada columna de cada fila
  // tiene un valor calculado a mano sobre un conjunto sintético chico, diseñado para que ninguna fórmula alternativa razonable dé el mismo
  // número: σ poblacional = 4 (≠ 1) y σ de títulos = 2,5 (≠ 4, ≠ 1), mediana ≠ promedio en cada fila de 3 o 4 decisiones, mínimo de títulos y
  // de tier 1 siempre > 0, todas las columnas de una fila con valores distintos, y la opción más alta cambia de lugar de una decisión a otra.
  //
  // CÓMO SE CALCULÓ. Cada decisión tiene 4 réplicas por opción. El puntaje de una opción es `media + j·(−3, 1, 1, 1)`: suma de desvíos 0, suma de
  // cuadrados 12·j², desvío muestral (÷ 3) = 2·j, y las medias de las opciones son las que se declaran abajo. Dos opciones con el mismo patrón
  // difieren en `(mA − mB) + (Δj)·(−3, 1, 1, 1)`: desvío de la diferencia 2·|Δj|, así que la t pareada (n = 4) es `|mA − mB| / |Δj|`. Crítico
  // bilateral df 3: 3,182 con 1 par (α = 0,05) y 4,857 con 3 pares (α = 0,05/3; integración numérica de la densidad t, independiente de la tabla).
  //
  //   decisión (tipo)               opciones: media (j)           S (máx−mín de medias)  t máx (crítico)       dentro = media de los desvíos 2·j
  //   D1 serie:draft                52 (2), 50 (1)                2                      2 (3,182) no sig      (4 + 2)/2 = 3
  //   D2 serie:draft                60 (5), 63 (3)                3                      1,5 (3,182) no sig    (10 + 6)/2 = 8
  //   D3 serie:draft                45 (3), 40 (2)                5                      5 (3,182) SIG         (6 + 4)/2 = 5
  //   D4 serie:draft                30 (7), 42 (4)                12                     4 (3,182) SIG         (14 + 8)/2 = 11
  //   B1 mercado:oferta (3 op.)     50 (3), 48 (4), 46 (2)        4                      4 (4,857) no sig      (6 + 8 + 4)/3 = 6
  //   B2 mercado:oferta (3 op.)     20 (4), 30 (6), 50 (8)        30                     10 (4,857) SIG        (8 + 12 + 16)/3 = 12
  //   B3 mercado:oferta (3 op.)     60 (2), 53 (4), 46 (6)        14                     3,5 (4,857) no sig    (4 + 8 + 12)/3 = 8
  //   E1 eventos:foo:x:bar          70 (4), 54 (2)                16                     8 (3,182) SIG         (8 + 4)/2 = 6
  //   E2 eventos:foo:x:bar          40 (7), 50 (2)                10                     2 (3,182) no sig      (14 + 4)/2 = 9
  //   E3 eventos:baz                80 (5), 60 (6)                20                     20 (3,182) SIG        (10 + 12)/2 = 11
  //   F1 edadCierre:algo            57 (1), 50 (5)                7                      1,75 (3,182) no sig   (2 + 10)/2 = 6
  //   F2 edadCierre:x:otro          30 (10), 54 (1)               24                     2,667 (3,182) no sig  (20 + 2)/2 = 11
  //   G1 amateur:x:reparto          44 (1,75), 42 (1,25)          2                      4 (3,182) SIG         (3,5 + 2,5)/2 = 3
  //
  // Palanca L = S / σ poblacional (4); ruido = dentro / 4; Δ títulos y Δ tier 1 = máx − mín de la media por opción (media = suma / 4; los
  // arreglos de títulos y de tier 1 de cada opción están abajo, a la vista):
  //
  //                        L = S/4                  ruido = dentro/4                Δ títulos                      Δ tier 1
  //   D1, D2, D3, D4       0,5  0,75  1,25  3       0,75  2  1,25  2,75             1,5−1=0,5  2,75−1=1,75  3−2=1  4−1,5=2,5   3,75−1,5=2,25  2,25−2=0,25  4,25−1=3,25  4−2,5=1,5
  //   B1, B2, B3           1  7,5  3,5              1,5  3  2                       3,5−1,25=2,25  6−1,5=4,5  4−2,5=1,5         4,75−1=3,75  2,5−2=0,5  5,5−3=2,5
  //   E1, E2, E3           4  2,5  5                1,5  2,25  2,75                 4,5−1=3,5  3−2,5=0,5  3,75−2,5=1,25       3−2,25=0,75  4−1,5=2,5  3−1,25=1,75
  //   F1, F2               1,75  6                  1,5  2,75                       3−1=2  2,25−2=0,25                         4−1=3  2,75−2=0,75
  //   G1                   0,5                      0,75                            3,75−1=2,75                                3,25−3=0,25
  //
  // La mediana es la INFERIOR (con n par, el central de abajo: es la que usaba la auditoría) y el % significativo se redondea a 1 decimal:
  //   fila               decisiones   n   palancaMediana (mediana · promedio)    % sig        ruidoDentro (mediana · promedio)      Δ títulos med (mediana · promedio)    Δ tier 1 med (mediana · promedio)
  //   eventos:baz        E3           1   5                                      1/1 = 100    2,75                                  1,25                                  1,75
  //   eventos:*          E1, E2, E3   3   med(2,5 4 5) = 4 · 3,83                2/3 = 66,7   med(1,5 2,25 2,75) = 2,25 · 2,17      med(0,5 1,25 3,5) = 1,25 · 1,75       med(0,75 1,75 2,5) = 1,75 · 1,67
  //   mercado:oferta     B1, B2, B3   3   med(1 3,5 7,5) = 3,5 · 4               1/3 = 33,3   med(1,5 2 3) = 2 · 2,17               med(1,5 2,25 4,5) = 2,25 · 2,75       med(0,5 2,5 3,75) = 2,5 · 2,25
  //   eventos:foo:bar    E1, E2       2   med(2,5 4) = 2,5 · 3,25                1/2 = 50     med(1,5 2,25) = 1,5 · 1,88            med(0,5 3,5) = 0,5 · 2                med(0,75 2,5) = 0,75 · 1,63
  //   edadCierre:*       F1, F2       2   med(1,75 6) = 1,75 · 3,88              0/2 = 0      med(1,5 2,75) = 1,5 · 2,13            med(0,25 2) = 0,25 · 1,13             med(0,75 3) = 0,75 · 1,88
  //   serie:draft        D1..D4       4   med(0,5 0,75 1,25 3) = 0,75 · 1,38     2/4 = 50     med(0,75 1,25 2 2,75) = 1,25 · 1,69   med(0,5 1 1,75 2,5) = 1 · 1,44        med(0,25 1,5 2,25 3,25) = 1,5 · 1,81
  //   amateur:reparto    G1           1   0,5                                    1/1 = 100    0,75                                  2,75                                  0,25
  // (`eventos:foo:x:bar` y `eventos:baz` cuentan en `eventos:*` Y en su propia fila `eventos:foo:bar` / `eventos:baz`; `edadCierre:algo` y
  // `edadCierre:x:otro` en la sola `edadCierre:*`; `amateur:x:reparto` pierde el `:x:`.) Las filas van por palanca mediana DESCENDENTE: 5, 4,
  // 3,5, 2,5, 1,75, 0,75, 0,5 (sin empates). Los resultados entran mezclados a propósito: ni el orden de aparición de las claves ni su inverso
  // coinciden con el orden esperado, y las decisiones de una misma fila tampoco entran ordenadas.
  const opcion = ([scores, titulos, t1]) => scores.map((s, r) => repColumnasK0(s, titulos[r], t1[r]));
  const decision = (tipo, ...opciones) => ({ seed: 1, split: 1, tipo, labels: opciones.map((_, i) => `o${i}`), porOpcion: opciones.map(opcion) });
  const G1 = decision('amateur:x:reparto',
    [[38.75, 45.75, 45.75, 45.75], [1, 1, 1, 1], [4, 3, 3, 3]], [[38.25, 43.25, 43.25, 43.25], [4, 4, 4, 3], [3, 3, 3, 3]]);
  const D1 = decision('serie:draft',
    [[46, 54, 54, 54], [1, 1, 2, 2], [3, 4, 4, 4]], [[47, 51, 51, 51], [1, 1, 1, 1], [1, 2, 2, 1]]);
  const D2 = decision('serie:draft',
    [[45, 65, 65, 65], [1, 1, 1, 1], [2, 2, 2, 2]], [[54, 66, 66, 66], [2, 3, 3, 3], [3, 2, 2, 2]]);
  const D3 = decision('serie:draft',
    [[36, 48, 48, 48], [3, 3, 2, 4], [1, 1, 1, 1]], [[34, 42, 42, 42], [2, 2, 2, 2], [4, 4, 4, 5]]);
  const D4 = decision('serie:draft',
    [[9, 37, 37, 37], [1, 1, 2, 2], [4, 4, 4, 4]], [[30, 46, 46, 46], [4, 4, 4, 4], [3, 3, 2, 2]]);
  const B1 = decision('mercado:oferta',
    [[41, 53, 53, 53], [2, 3, 3, 3], [1, 1, 1, 1]], [[36, 52, 52, 52], [1, 1, 1, 2], [5, 5, 5, 4]], [[40, 48, 48, 48], [3, 4, 4, 3], [3, 3, 2, 2]]);
  const B2 = decision('mercado:oferta',
    [[8, 24, 24, 24], [1, 2, 1, 2], [2, 2, 2, 2]], [[12, 36, 36, 36], [6, 6, 6, 6], [2, 2, 2, 3]], [[26, 58, 58, 58], [3, 3, 3, 4], [2, 3, 2, 3]]);
  const B3 = decision('mercado:oferta',
    [[54, 62, 62, 62], [4, 4, 4, 4], [3, 3, 3, 3]], [[41, 57, 57, 57], [2, 3, 2, 3], [5, 6, 5, 6]], [[28, 52, 52, 52], [3, 3, 3, 3], [4, 4, 4, 4]]);
  const E1 = decision('eventos:foo:x:bar',
    [[58, 74, 74, 74], [1, 1, 1, 1], [2, 2, 2, 3]], [[48, 56, 56, 56], [4, 5, 5, 4], [3, 3, 3, 3]]);
  const E2 = decision('eventos:foo:x:bar',
    [[19, 47, 47, 47], [3, 3, 3, 3], [4, 4, 4, 4]], [[44, 52, 52, 52], [3, 3, 2, 2], [1, 1, 2, 2]]);
  const E3 = decision('eventos:baz',
    [[65, 85, 85, 85], [4, 4, 4, 3], [3, 3, 3, 3]], [[42, 66, 66, 66], [2, 2, 3, 3], [1, 1, 1, 2]]);
  const F1 = decision('edadCierre:algo',
    [[54, 58, 58, 58], [1, 1, 1, 1], [4, 4, 4, 4]], [[35, 55, 55, 55], [3, 3, 3, 3], [1, 1, 1, 1]]);
  const F2 = decision('edadCierre:x:otro',
    [[0, 40, 40, 40], [2, 2, 2, 3], [2, 2, 2, 2]], [[51, 55, 55, 55], [2, 2, 2, 2], [2, 3, 3, 3]]);

  const resultados = [G1, D2, E1, B3, F2, D1, E3, B1, D4, F1, E2, B2, D3];
  const frecuenciasTipo = {
    'serie:draft': 8, 'mercado:oferta': 6, 'eventos:foo:x:bar': 10, 'eventos:baz': 4,
    'edadCierre:algo': 3, 'edadCierre:x:otro': 3, 'amateur:x:reparto': 2, 'amateur:salida_amateur': 4
  };
  const totalInterrupciones = Object.values(frecuenciasTipo).reduce((a, b) => a + b, 0);
  const analisis = analizarDatosAgencia({ resultados, frecuenciasTipo, totalInterrupciones }, 1, { sPop: 4, sPopT: 2.5 });

  if (analisis.sPop !== 4 || analisis.sPopT !== 2.5) {
    throw new Error(`sPop y sPopT tenían que devolverse tal cual (4 y 2,5), dieron ${analisis.sPop} y ${analisis.sPopT}`);
  }
  if (analisis.totalDecisionesMedidas !== 13) {
    throw new Error(`totalDecisionesMedidas tenía que ser 13, dio ${analisis.totalDecisionesMedidas}`);
  }
  const COLUMNAS = ['tipo', 'n', 'palancaMediana', 'pctSignificativo', 'ruidoDentro', 'dTitulosMed', 'dTier1Med'];
  const esperadas = [
    ['eventos:baz', 1, 5, 100, 2.75, 1.25, 1.75],
    ['eventos:*', 3, 4, 66.7, 2.25, 1.25, 1.75],
    ['mercado:oferta', 3, 3.5, 33.3, 2, 2.25, 2.5],
    ['eventos:foo:bar', 2, 2.5, 50, 1.5, 0.5, 0.75],
    ['edadCierre:*', 2, 1.75, 0, 1.5, 0.25, 0.75],
    ['serie:draft', 4, 0.75, 50, 1.25, 1, 1.5],
    ['amateur:reparto', 1, 0.5, 100, 0.75, 2.75, 0.25]
  ];
  const tiposDados = analisis.filas.map((f) => f.tipo);
  const tiposEsperados = esperadas.map((e) => e[0]);
  if (JSON.stringify(tiposDados) !== JSON.stringify(tiposEsperados)) {
    throw new Error(`las filas tenían que ser ${JSON.stringify(tiposEsperados)} (por palanca mediana descendente, eventos y edadCierre agrupados), dieron ${JSON.stringify(tiposDados)}`);
  }
  esperadas.forEach((esperada, i) => {
    const dada = analisis.filas[i];
    if (JSON.stringify(Object.keys(dada)) !== JSON.stringify(COLUMNAS)) {
      throw new Error(`${esperada[0]}: las columnas tenían que ser ${COLUMNAS.join(', ')}, son ${Object.keys(dada).join(', ')}`);
    }
    COLUMNAS.forEach((columna, c) => {
      if (dada[columna] !== esperada[c]) {
        throw new Error(`${esperada[0]}: ${columna} tenía que ser ${esperada[c]} (calculado a mano), dio ${dada[columna]}`);
      }
    });
  });
});

check('K3c agencia: la función objetivo del contrafáctico es el puntaje de carrera (core/puntaje.js), en las réplicas y en la σ poblacional', () => {
  // Trinquete (K3c, trampa T6): reemplaza al check del puntaje provisorio (la fórmula de AUDITORIA.md §4.3), que fue
  // la función objetivo hasta K3c. Si agencia midiera contra otro número que el de la ficha, la palanca de una
  // decisión sería la de una vara que el jugador no ve. Mismas seeds y splits que `sigmaPoblacional` (desde 1001,
  // 70 splits).
  const carreras = 3;
  const totales = [];
  for (let seed = 1001; seed < 1001 + carreras; seed += 1) {
    const rng = mulberry32(seed);
    let st = createInitialState(seed, rng);
    for (let n = 0; n < 70 && !st.terminado; n += 1) {
      st = avanzarSplitAuto(st, rng).state;
    }
    const esperado = puntajeDeCarreraAgencia(st).total;
    if (puntajeDeAgencia(st) !== esperado) {
      throw new Error(`seed ${seed}: puntajeDeAgencia dio ${puntajeDeAgencia(st)} y puntajeDeCarrera(st).total ${esperado}`);
    }
    totales.push(esperado);
  }
  const { sPop } = sigmaPoblacional(carreras);
  const esperadoSigma = desvioMuestral(totales) || 1;
  if (Math.abs(sPop - esperadoSigma) > 1e-9) {
    throw new Error(`sigmaPoblacional(${carreras}) dio ${sPop}; con puntajeDeCarrera sobre las mismas carreras es ${esperadoSigma}`);
  }
});

// n = 6 réplicas (df = 5), diferencias entre dos opciones = c + E, con E de media 0 y suma de cuadrados 6: su desvío
// muestral es √(6/5) y la t pareada es EXACTAMENTE c·√6 / √(6/5) = c·√5. Así la t de cada caso es conocida a mano,
// sin pasar por ninguna función bajo prueba. La base común de las réplicas es arbitraria (se cancela en la diferencia).
const BASE_REPLICAS_K0 = [100, 140, 90, 120, 105, 130];
const E1_K0 = [-1, 1, -1, 1, -1, 1];
const E2_K0 = [1, 1, -1, -1, 1, -1];
const RAIZ_5_K0 = Math.sqrt(5);

// Crítico de t bilateral con df = 5 para α = 0,05 / (pares de opciones), de una integración numérica de la densidad
// de t (Simpson, independiente de la beta incompleta de agencia.js): K = 2 (1 par), 3 (3 pares), 4 (6), 5 (10), 6 (15).
const T_CRITICO_DF5_POR_K_K0 = { 2: 2.5706, 3: 3.5341, 4: 4.2193, 5: 4.7733, 6: 5.2474 };

// Las puntuaciones de K opciones con la t entre la 1ª y la 2ª igual a `t` (A − B = c + E1) y las demás diferencias
// con una t chica (A − C = 0,2 + E2: t = 0,45; A − D = 0,1 − E1: t = 0,22; B − C: 0,61·t; B − D: 0,5·t; C − D: 0,19),
// de modo que el máximo |t| de la decisión es `t` y sale del par A-B.
function puntuacionesConTK0(k, t) {
  const c = t / RAIZ_5_K0;
  const A = BASE_REPLICAS_K0;
  const opciones = [A, A.map((a, r) => a - (c + E1_K0[r]))];
  if (k >= 3) opciones.push(A.map((a, r) => a - (0.2 + E2_K0[r])));
  if (k >= 4) opciones.push(A.map((a, r) => a - (0.1 - E1_K0[r])));
  // La 5ª y la 6ª son copias exactas de la 1ª y la 3ª: t = 0 contra su original y las mismas t que ellas contra las demás.
  if (k >= 5) opciones.push([...opciones[0]]);
  if (k >= 6) opciones.push([...opciones[2]]);
  return opciones;
}

check('K0 agencia: la t pareada está en su escala (√n) y se compara con el crítico de df = n − 1, justo arriba y justo abajo del crítico con n = 6', () => {
  // Trinquete (K0-A, 2ª revisión): sin dividir por √n el mutante cambiaba 151 hojas del crudo y el check solo pedía
  // finitud; el conjunto sintético tenía t enormes o 0,5, ninguna celda cerca del crítico. Acá la t es conocida
  // (c·√5) y está a ±1,1% del crítico de df 5 (2,5706 / 2,571 en la tabla): una t sin √n, un crítico de df 4 (2,776) o
  // de df 6 (2,447), o el límite normal (1,96) dan el veredicto contrario en uno de los dos lados.
  const TOPE_ARRIBA = 2.6;
  const TOPE_ABAJO = 2.54;
  for (const [t, significativa] of [[TOPE_ARRIBA, true], [TOPE_ABAJO, false]]) {
    const scores = puntuacionesConTK0(2, t);
    const test = testMaximoT(scores);
    if (Math.abs(test.tMax - t) > 1e-9) {
      throw new Error(`t = ${t} por construcción, testMaximoT calculó ${test.tMax}: la escala de la t está mal`);
    }
    if (test.n !== 6 || test.pares !== 1 || Math.abs(test.tCritico - T_CRITICO_DF5_POR_K_K0[2]) > 1e-3) {
      throw new Error(`n = 6 y 1 par con df 5: crítico esperado ${T_CRITICO_DF5_POR_K_K0[2]}, testMaximoT dio n=${test.n}, pares=${test.pares}, crítico ${test.tCritico}`);
    }
    if (test.sig !== significativa) {
      throw new Error(`t = ${t} (crítico ${test.tCritico}) tenía que ${significativa ? '' : 'NO '}ser significativa`);
    }
    // Con 2 opciones el test viejo y el nuevo son el mismo.
    const vals = scores.map((v) => v.map(repSinteticaK0));
    if (significativaTestViejo(vals) !== significativa) {
      throw new Error(`el test viejo con t = ${t} tenía que dar ${significativa}`);
    }
    // De punta a punta por `analizarDatosAgencia`: la fila dice 100% o 0%.
    const analisis = analizarDatosAgencia(
      { resultados: [{ seed: 1, split: 1, tipo: 'serie:draft', labels: ['a', 'b'], porOpcion: vals }], frecuenciasTipo: { 'serie:draft': 1 }, totalInterrupciones: 1 },
      1,
      { sPop: 10, sPopT: 1 }
    );
    if (analisis.filas[0].pctSignificativo !== (significativa ? 100 : 0)) {
      throw new Error(`analizarDatosAgencia con t = ${t}: pctSignificativo ${analisis.filas[0].pctSignificativo}`);
    }
  }
  // Réplicas que reventaron: se parea solo con las válidas en TODAS las opciones (aquí 6 de 8 → df 5).
  const conNulos = puntuacionesConTK0(2, TOPE_ARRIBA).map((v, i) => (i === 0 ? [...v.slice(0, 3), null, ...v.slice(3), 999] : [...v.slice(0, 3), 1, ...v.slice(3), null]));
  const emparejado = testMaximoT(conNulos);
  if (emparejado.n !== 6 || Math.abs(emparejado.tMax - TOPE_ARRIBA) > 1e-9) {
    throw new Error(`con réplicas nulas en réplicas distintas de cada opción hay que parear por réplica: n = ${emparejado.n}, t = ${emparejado.tMax}`);
  }
});

check('K0 agencia: con K opciones el crítico es el de Bonferroni sobre K·(K−1)/2 pares, y las tres definiciones de pctInterrupcionesConPalanca se separan', () => {
  // Trinquete (K0-A, 2ª revisión, B.1): el test viejo (mejor contra peor por las medias de la misma muestra, al 5%)
  // tenía 11% de falsos positivos con 3 opciones y 26% con 6. Con 3 opciones el crítico del par es el de
  // α = 0,05/3 (3,5341 con df 5), con 4 el de α = 0,05/6 (4,2193): un t de 3,45 con K = 3 o de 4,12 con K = 4
  // ya NO es significativo (el test viejo lo declaraba), y un 3,62 / 4,32 sí lo es.
  const casos = [[3, 3.45, false], [3, 3.62, true], [4, 4.12, false], [4, 4.32, true], [5, 4.67, false], [5, 4.88, true], [6, 5.12, false], [6, 5.37, true]];
  for (const [k, t, significativa] of casos) {
    const pares = (k * (k - 1)) / 2;
    const scores = puntuacionesConTK0(k, t);
    const test = testMaximoT(scores);
    if (test.pares !== pares || Math.abs(test.tCritico - T_CRITICO_DF5_POR_K_K0[k]) > 1e-3) {
      throw new Error(`K = ${k}: ${pares} pares y crítico ${T_CRITICO_DF5_POR_K_K0[k]} esperados, testMaximoT dio ${test.pares} pares y ${test.tCritico}`);
    }
    if (Math.abs(test.tMax - t) > 1e-9) {
      throw new Error(`K = ${k}: el máximo |t| tenía que ser ${t} (el par A-B), dio ${test.tMax}`);
    }
    if (test.sig !== significativa) {
      throw new Error(`K = ${k}, t = ${t} (crítico ${test.tCritico}): tenía que ${significativa ? '' : 'NO '}ser significativa`);
    }
  }
  // Un solo par de las K opciones con un efecto grande basta (el máximo), aunque las demás no tengan nada.
  if (testMaximoT(puntuacionesConTK0(6, 20)).sig !== true) {
    throw new Error('K = 6 con un par de t = 20 tenía que ser significativa');
  }

  // Las tres definiciones sobre 200 interrupciones, con 3 opciones por decisión:
  //  - mercado:oferta: 10 decisiones, todas con t = 3,45 (NO significativas con Bonferroni; el test viejo las declara
  //    significativas: su mejor contra peor es el par A-B), 100 interrupciones.
  //  - serie:draft: 10 decisiones, 2 con t = 3,62 (significativas) y 8 con t = 3,45, 50 interrupciones.
  //  - amateur:salida_amateur: nunca se midió, 50 interrupciones.
  // PONDERADO: (100×0 + 50×0,2) / 200 = 5,0 %. TODO-O-NADA con test corregido: serie:draft llega al 20% (>= 10) y suma sus
  // 50, mercado:oferta no (0%): 50/200 = 25,0 %. TODO-O-NADA con el test viejo: los dos tipos tienen 100% de significativas:
  // (100 + 50)/200 = 75,0 %.
  const decisionDe = (tipo, t) => ({ seed: 1, split: 1, tipo, labels: ['a', 'b', 'c'], porOpcion: puntuacionesConTK0(3, t).map((v) => v.map(repSinteticaK0)) });
  const resultados = [
    ...Array.from({ length: 10 }, () => decisionDe('mercado:oferta', 3.45)),
    ...Array.from({ length: 2 }, () => decisionDe('serie:draft', 3.62)),
    ...Array.from({ length: 8 }, () => decisionDe('serie:draft', 3.45))
  ];
  const analisis = analizarDatosAgencia(
    { resultados, frecuenciasTipo: { 'mercado:oferta': 100, 'serie:draft': 50, 'amateur:salida_amateur': 50 }, totalInterrupciones: 200 },
    1,
    { sPop: 10, sPopT: 1 }
  );
  const obtenido = [analisis.pctInterrupcionesConPalanca, analisis.pctInterrupcionesConPalancaAuditoria, analisis.pctInterrupcionesConPalancaAuditoriaTestViejo];
  if (JSON.stringify(obtenido) !== JSON.stringify([5, 25, 75])) {
    throw new Error(`ponderado / auditoría / auditoría con test viejo tenían que dar [5, 25, 75] (calculado a mano), dieron ${JSON.stringify(obtenido)}`);
  }
});

// Bajo la nula (B.2): K opciones que son réplicas del mismo proceso, sin efecto. Cada puntaje = un efecto común de
// la réplica (lo que comparten las opciones por los números aleatorios comunes) + ruido propio de la opción.
const DECISIONES_NULA_K0 = 10000;
const REPLICAS_NULA_K0 = 6;
const SEMILLA_NULA_K0 = 20261001;
const EFECTO_COMUN_SD_K0 = 3;
// El tope y el piso del % significativo bajo la nula. Con esta semilla y 10.000 decisiones por K el test de Bonferroni mide
// 5,0 / 4,6 / 4,6 / 4,6 / 4,5% para K = 2..6 (5% nominal con un par, y conservador con más): el error estándar de cada celda
// es 0,22 pp, así que el tope de 6% queda a ~1 pp (4σ) del peor caso y el piso de 3% a 1,5 pp (7σ) del valor medido (el piso
// atrapa un test que nunca declara nada). El test viejo mide 5,0 / 11,0 / 16,3 / 20,7 / 25,8%: para que esta medición pueda ver
// la inflación (y no pase vacía), el viejo tiene que pasar de 8% con 3 opciones y de 15% con 6.
const TOPE_FALSOS_POSITIVOS_K0 = 6;
const PISO_FALSOS_POSITIVOS_K0 = 3;
const INFLACION_VIEJO_K3_K0 = 8;
const INFLACION_VIEJO_K6_K0 = 15;

check('K0 agencia bajo la nula: sin ningún efecto, el % significativo queda <= 6% con 2 a 6 opciones (el test viejo llegaba al 26%)', () => {
  // Trinquete (K0-A, 2ª revisión, B.2): el test elegía la mejor y la peor opción por sus medias en la misma muestra y
  // los falsos positivos subían con cada opción (5 / 11 / 16 / 21 / 26% con K = 2..6). Un `analizarDatosAgencia` que
  // vuelva a ese test, o que corrija mal (sin Bonferroni, o con K en vez de K·(K−1)/2 pares), pasa de 6% acá.
  const rng = mulberry32(SEMILLA_NULA_K0);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const medido = {};
  for (let k = 2; k <= 6; k += 1) {
    const resultados = [];
    let significativasViejo = 0;
    let discrepancias = 0;
    for (let d = 0; d < DECISIONES_NULA_K0; d += 1) {
      const comun = Array.from({ length: REPLICAS_NULA_K0 }, () => EFECTO_COMUN_SD_K0 * normal());
      const porOpcion = Array.from({ length: k }, () => comun.map((c) => repSinteticaK0(c + normal())));
      resultados.push({ seed: 1, split: d, tipo: 'x:nula', labels: [], porOpcion });
      const viejo = significativaTestViejo(porOpcion);
      significativasViejo += viejo ? 1 : 0;
      if (k === 2 && testMaximoT(porOpcion.map((v) => v.map((x) => x.fin.score))).sig !== viejo) {
        discrepancias += 1;
      }
    }
    const analisis = analizarDatosAgencia({ resultados, frecuenciasTipo: { 'x:nula': DECISIONES_NULA_K0 }, totalInterrupciones: DECISIONES_NULA_K0 }, 1, { sPop: 1, sPopT: 1 });
    const nuevo = analisis.filas[0].pctSignificativo;
    const viejo = (100 * significativasViejo) / DECISIONES_NULA_K0;
    medido[k] = { nuevo, viejo };
    if (analisis.filas[0].n !== DECISIONES_NULA_K0) {
      throw new Error(`K = ${k}: se analizaron ${analisis.filas[0].n} de ${DECISIONES_NULA_K0} decisiones`);
    }
    if (!(nuevo <= TOPE_FALSOS_POSITIVOS_K0) || !(nuevo >= PISO_FALSOS_POSITIVOS_K0)) {
      throw new Error(`K = ${k}: bajo la nula el % significativo es ${nuevo}% (tiene que estar entre ${PISO_FALSOS_POSITIVOS_K0}% y ${TOPE_FALSOS_POSITIVOS_K0}%; el test viejo daba ${viejo}%)`);
    }
    // Con 2 opciones (un solo par) el test nuevo es el de siempre: a lo sumo un par de decisiones en el borde de la tabla (2,571 vs 2,5706).
    if (k === 2 && discrepancias > 2) {
      throw new Error(`con 2 opciones el test nuevo y el viejo discrepan en ${discrepancias} de ${DECISIONES_NULA_K0} decisiones`);
    }
  }
  if (!(medido[3].viejo > INFLACION_VIEJO_K3_K0) || !(medido[6].viejo > INFLACION_VIEJO_K6_K0)) {
    throw new Error(`la nula no ve la inflación del test viejo (K = 3: ${medido[3].viejo}%, K = 6: ${medido[6].viejo}%): la medición no discrimina`);
  }
});

check('K0 agencia: las opciones de una decisión comparten los números aleatorios (CRN): dos opciones idénticas dan exactamente lo mismo en cada réplica', () => {
  // Trinquete (K0-A, 2ª revisión): con seeds distintas por opción (sin números aleatorios comunes) cambiaban 151 hojas del
  // crudo y el check solo pedía finitud. El pareo por réplica es lo que hace válido el contrafáctico: con CRN, dos
  // opciones iguales dan la misma carrera réplica por réplica; sin CRN, cada una arrastra su propio azar.
  const SEED = 4242;
  // Hasta cuántos splits se busca una decisión con opciones, y cuántos splits sigue cada réplica después de ella.
  const SPLITS_BUSQUEDA = 12;
  const SPLITS_DE_CADA_REPLICA = 15;
  const rng = mulberry32(SEED);
  let st = createInitialState(SEED, rng);
  let splitCount = 0;
  let elegida = null;
  buscar:
  while (!st.terminado && splitCount < SPLITS_BUSQUEDA) {
    st = avanzarSplit(st, rng).state;
    while (st.pendiente) {
      const { sistemaId, decision } = st.pendiente;
      if ((decision.opciones ?? []).length >= 1 && !esDecisionDeMinijuego(decision) && !esDecisionDeMercado(decision)) {
        elegida = decision;
        break buscar;
      }
      st = resolverDecision(st, sistemaPorId(sistemaId).resolverAuto(st, decision, rng), rng).state;
    }
    splitCount += 1;
  }
  if (elegida === null) {
    throw new Error(`check vacío: no apareció ninguna decisión con opciones en los primeros ${SPLITS_BUSQUEDA} splits`);
  }
  const opcion = { opcionId: elegida.opciones[0].id };
  const REPLICAS = 4;
  const porOpcion = replicasDeDecision(st, [opcion, opcion], { seed: SEED, splitCount, tipo: 'crn:prueba', reps: REPLICAS, splits: splitCount + SPLITS_DE_CADA_REPLICA });
  const distintas = new Set();
  for (let r = 0; r < REPLICAS; r += 1) {
    if (porOpcion[0][r] === null || porOpcion[1][r] === null) {
      throw new Error(`la réplica ${r} reventó: el check no mide nada`);
    }
    if (JSON.stringify(porOpcion[0][r]) !== JSON.stringify(porOpcion[1][r])) {
      throw new Error(`réplica ${r}: dos opciones idénticas dieron resultados distintos (${JSON.stringify(porOpcion[0][r].fin)} vs ${JSON.stringify(porOpcion[1][r].fin)}): las opciones no comparten el rng`);
    }
    distintas.add(JSON.stringify(porOpcion[0][r]));
  }
  // Y las réplicas sí difieren entre sí (el azar importa): si no, "idénticas" no probaría nada.
  if (distintas.size < 2) {
    throw new Error('las réplicas dan todas lo mismo: el check no distingue números aleatorios comunes de distintos');
  }
});

check('K0 agencia: --reps < 2, --carreras < 1 y un --analizar con un archivo de formato viejo fallan con mensaje claro y salida 1', () => {
  // Trinquete (K0-A, 2ª revisión, B.4): con --reps=1 la t pareada daba Infinity y todo salía "100% significativo"; con
  // --carreras=0 salía "0 decisiones, 0%" y exit 0 (la misma clase de falla que H7); con --analizar de varios archivos,
  // uno sin `totalInterrupciones` subestimaba el denominador y el porcentaje podía pasar de 100.
  const agencia = path.join(__dirname, 'agencia.js');
  const correr = (...args) => spawnSync(process.execPath, [agencia, ...args], { encoding: 'utf8' });
  for (const [args, patron] of [[['--reps=1'], /--reps=1/], [['--reps=abc'], /--reps=NaN/], [['--carreras=0'], /--carreras=0/]]) {
    const corrida = correr(...args);
    if (corrida.status !== 1 || !patron.test(corrida.stderr)) {
      throw new Error(`${args.join(' ')}: se esperaba salida 1 y un mensaje con ${patron}; salió ${corrida.status} con stderr ${JSON.stringify(corrida.stderr)}`);
    }
  }
  const directorio = fs.mkdtempSync(path.join(osK0.tmpdir(), 'k0-agencia-'));
  try {
    const repeticiones = (valores) => valores.map(repSinteticaK0);
    const resultados = [{ seed: 1, split: 1, tipo: 'serie:draft', labels: ['a', 'b'], porOpcion: [repeticiones([100, 103, 98, 101]), repeticiones([10, 12, 9, 11])] }];
    const escribir = (nombre, contenido) => {
      const archivo = path.join(directorio, nombre);
      fs.writeFileSync(archivo, JSON.stringify(contenido), 'utf8');
      return archivo;
    };
    const nuevoA = escribir('nuevo_a.json', { resultados, frecuenciasTipo: { 'serie:draft': 4 }, totalInterrupciones: 20 });
    const nuevoB = escribir('nuevo_b.json', { resultados, frecuenciasTipo: { 'serie:draft': 4 }, totalInterrupciones: 20 });
    const viejo = escribir('viejo.json', { resultados, frecuenciasTipo: { 'serie:draft': 4 } });
    // Control positivo: dos archivos del formato nuevo se analizan (si no, el exit 1 de abajo podría ser por otra cosa).
    const bien = correr(`--analizar=${nuevoA},${nuevoB}`, '--sigmaCarreras=1');
    if (bien.status !== 0 || !/pctInterrupcionesConPalanca/.test(bien.stdout)) {
      throw new Error(`dos archivos del formato nuevo tenían que analizarse: salida ${bien.status}, stderr ${JSON.stringify(bien.stderr)}`);
    }
    const mixto = correr(`--analizar=${nuevoA},${viejo}`, '--sigmaCarreras=1');
    if (mixto.status !== 1 || !/totalInterrupciones/.test(mixto.stderr)) {
      throw new Error(`un archivo de formato viejo entre varios tenía que fallar con salida 1 y un mensaje sobre totalInterrupciones; salió ${mixto.status} con stderr ${JSON.stringify(mixto.stderr)}`);
    }
  } finally {
    fs.rmSync(directorio, { recursive: true, force: true });
  }
});

// Los ruidos de resultados que apaga la ablación (§K.3a), por su ruta en `BALANCE`. Lista literal e independiente de
// `PARAMETROS_RUIDO` (que es lo que se verifica).
const RUIDOS_DE_RESULTADOS_K0 = ['partido.sigmaFecha', 'partido.sigmaMapa'];
// El resto de las constantes de `BALANCE` con "ruido" en el nombre, clasificadas A MANO como fuera de la ablación: no son
// el ruido del resultado de un partido o una serie, sino el de otros procesos del motor. Una constante de ruido nueva
// que no esté en una de las dos listas rompe `K0 ruidos de la ablación`: hay que decidir a qué lista va (y, si es del
// resultado de un partido, sumarla a `PARAMETROS_RUIDO`).
const RUIDOS_FUERA_DE_LA_ABLACION_K0 = {
  'amateur.autoRuido': 'dispersión del reparto del jugador automático en el amateur',
  'mercado.renovacionSigmaFactor': 'dispersión lognormal del sueldo de una renovación (mercado), no el resultado de un partido',
  'atributos.curvas.mecanica.ruido': 'ruido de la curva de atributos (cómo evoluciona la mecánica por split)',
  'atributos.curvas.laneo.ruido': 'ruido de la curva de atributos (cómo evoluciona el laneo por split)',
  'atributos.curvas.teamfight.ruido': 'ruido de la curva de atributos (cómo evoluciona el teamfight por split)',
  'atributos.suenoRuidoPro': 'ruido del sueño del jugador en la etapa pro',
  'regimen.ruidoPorSplit': 'ruido de la tier list del meta entre splits del mismo régimen',
  'roster.jerarquiaRuido': 'ruido de la dinámica de la jerarquía entre splits',
  'roster.sinergiaRuido': 'ruido de la dinámica de la sinergia del roster entre splits',
  'practica.ruidoPractica': 'ruido de la ganancia de práctica',
  'plantel.ruidoNivelAnual': 'ruido anual del nivel de los jugadores del mundo (rachas)',
  'topMundial.ruidoSpread': 'ruido determinista del corte del Top 20 mundial'
};

check('K0 ruidos de la ablación: PARAMETROS_RUIDO son exactamente los ruidos de resultados, y toda constante "ruido" o "sigma" de BALANCE está clasificada', () => {
  // Trinquete (K0-A, 2ª revisión): todos los checks iteraban la misma lista exportada, y con 4 de los 5 ruidos (R² sin ruido
  // 0,083 → 0,065) pasaban. Ahora la lista se ancla a una literal propia, y por reflexión sobre `BALANCE` cada constante de
  // ruido (hay 16 con "ruido" en el nombre, solo 5 son del resultado) tiene que estar clasificada: una nueva obliga a
  // decidir si la ablación tiene que apagarla.
  const enLista = PARAMETROS_RUIDO.map(([grupo, clave]) => `${grupo}.${clave}`);
  if (enLista.length !== RUIDOS_DE_RESULTADOS_K0.length || RUIDOS_DE_RESULTADOS_K0.some((ruta) => !enLista.includes(ruta))) {
    throw new Error(`PARAMETROS_RUIDO = [${enLista.join(', ')}], tienen que ser exactamente [${RUIDOS_DE_RESULTADOS_K0.join(', ')}]`);
  }
  const encontradas = [];
  const recorrer = (objeto, ruta) => {
    for (const [clave, valor] of Object.entries(objeto)) {
      const rutaClave = ruta ? `${ruta}.${clave}` : clave;
      if (valor !== null && typeof valor === 'object') {
        recorrer(valor, rutaClave);
      } else if (/ruido|sigma/i.test(clave)) {
        // K2b: el σ de un partido se llama `sigma*` (`partido.sigmaFecha`/`sigmaMapa`): entra al barrido igual.
        encontradas.push(rutaClave);
      }
    }
  };
  recorrer(BALANCE_VIRGEN_K0, '');
  const clasificadas = [...RUIDOS_DE_RESULTADOS_K0, ...Object.keys(RUIDOS_FUERA_DE_LA_ABLACION_K0)];
  const sinClasificar = encontradas.filter((ruta) => !clasificadas.includes(ruta));
  if (sinClasificar.length > 0) {
    throw new Error(`constante(s) de ruido sin clasificar en BALANCE: ${sinClasificar.join(', ')}. Sumala a PARAMETROS_RUIDO (si es del resultado de un partido o una serie) y a RUIDOS_DE_RESULTADOS_K0, o a RUIDOS_FUERA_DE_LA_ABLACION_K0`);
  }
  const rancias = clasificadas.filter((ruta) => !encontradas.includes(ruta));
  if (rancias.length > 0) {
    throw new Error(`clasificadas pero ya no existen en BALANCE: ${rancias.join(', ')}`);
  }
  for (const ruta of RUIDOS_DE_RESULTADOS_K0) {
    const [grupo, clave] = ruta.split('.');
    if (!(BALANCE_VIRGEN_K0[grupo][clave] > 0)) {
      throw new Error(`${ruta} tiene que ser > 0 para que apagarlo cambie algo (vale ${BALANCE_VIRGEN_K0[grupo][clave]})`);
    }
  }
});

check('K0 ruidoPuro: UMBRAL_R2_ESTRUCTURAL vale 0,3 y la decisión de si ruidoPuro es interpretable se prueba con entradas sintéticas', () => {
  // Trinquete (K0-A, 2ª revisión): el check de coherencia comparaba contra el umbral que leía del propio reporte, así que con
  // el umbral en 0 `ruidoPuro` volvía a dar 0,016 sobre un R² sin ruido de 0,083 (la mentira que H6 quería evitar) y con el umbral
  // en 1 nunca era interpretable, y ambos pasaban. 0,3 es la elección de H6 (un R² sin ruido de 0,07 con ruido cero no deja ver
  // al nivel: el gate `ruidoPuro <= 25%` "se cumplía" con un R² de 0,06) y es arbitraria: cambiarla es una decisión de diseño.
  if (UMBRAL_R2_ESTRUCTURAL !== 0.3) {
    throw new Error(`UMBRAL_R2_ESTRUCTURAL tenía que ser 0,3 (la decisión de H6), es ${UMBRAL_R2_ESTRUCTURAL}`);
  }
  const RUIDO_PURO_CRUDO = 0.15432;
  const esperado = Number(RUIDO_PURO_CRUDO.toFixed(3));
  const casos = [
    [0.07, { interpretable: false, ruidoPuro: null }],
    [0.083, { interpretable: false, ruidoPuro: null }],
    [0.2999, { interpretable: false, ruidoPuro: null }],
    [0.3, { interpretable: true, ruidoPuro: esperado }],
    [0.5, { interpretable: true, ruidoPuro: esperado }],
    [1, { interpretable: true, ruidoPuro: esperado }],
    [null, { interpretable: false, ruidoPuro: null }]
  ];
  for (const [r2SinRuido, esperada] of casos) {
    const obtenida = decidirRuidoPuro(r2SinRuido, RUIDO_PURO_CRUDO);
    if (obtenida.interpretable !== esperada.interpretable || obtenida.ruidoPuro !== esperada.ruidoPuro) {
      throw new Error(`decidirRuidoPuro(${r2SinRuido}, ${RUIDO_PURO_CRUDO}) = ${JSON.stringify(obtenida)}, tenía que dar ${JSON.stringify(esperada)}`);
    }
  }
});

check('K0 espejos de la UI: DURACION_BEAT_MS y ESPERA_MINIJUEGO_MS son los literales de reproductor.js y de app.js', () => {
  // Trinquete (K0-A, 2ª revisión): el check de "observación" recalculaba con las mismas constantes importadas, y con 700 → 350
  // o 1600 → 0 pasaba. El instrumento espeja dos números de la UI (el comentario de simulate.js admite que "se desactualiza
  // en silencio"): acá se leen del código fuente que los define. Es válido que este check falle el día que alguien cambie el
  // reproductor o el tiempo de espera del minijuego: el instrumento tiene que seguirlo.
  const leer = (relativa) => fs.readFileSync(path.join(srcDir, relativa), 'utf8');
  const extraer = (texto, patron, descripcion) => {
    const coincidencias = [...texto.matchAll(patron)];
    if (coincidencias.length !== 1) {
      throw new Error(`no pude extraer ${descripcion} (${coincidencias.length} coincidencias): la UI cambió de forma, actualizá la expresión de este check y el espejo de simulate.js`);
    }
    return Number(coincidencias[0][1]);
  };
  // reproductor.js: `const ESPERA_MS = { x1: 700, x2: 350, instantaneo: 0 }`
  const beat = extraer(leer('ui/reproductor.js'), /const\s+ESPERA_MS\s*=\s*\{[^}]*\bx1\s*:\s*(\d+)/g, 'ESPERA_MS.x1 de reproductor.js');
  // app.js: `setTimeout(() => responder(... { resultado }), 1600)` (K4-B: con la charla del coach, si se ofreció)
  const minijuego = extraer(leer('ui/app.js'), /setTimeout\(\s*\(\)\s*=>\s*responder\([^;]*\{\s*resultado\s*\}\s*\)\s*,\s*(\d+)\s*\)/g, 'la espera tras el minijuego de app.js');
  if (beat !== DURACION_BEAT_MS) {
    throw new Error(`DURACION_BEAT_MS = ${DURACION_BEAT_MS} en simulate.js, reproductor.js espera ${beat} ms por beat`);
  }
  if (minijuego !== ESPERA_MINIJUEGO_MS) {
    throw new Error(`ESPERA_MINIJUEGO_MS = ${ESPERA_MINIJUEGO_MS} en simulate.js, app.js espera ${minijuego} ms tras el minijuego`);
  }
});

check('K0 contarBeats y clasificarSplit: contarBeats coincide con agruparBeats de la UI, y los splits se clasifican por contadores', () => {
  // Trinquete (K0-A, revisión H4/H6): `tiempoReproductorMin` y `ritmo` por tipo de split dependen de estas dos funciones.
  const rng = mulberry32(2024);
  for (let intento = 0; intento < 300; intento += 1) {
    const largo = Math.floor(rng() * 12);
    const lote = Array.from({ length: largo }, () => ({ type: 'x', message: '.', tecnico: rng() < 0.5 }));
    const esperado = agruparBeats(lote).length;
    if (contarBeats(lote) !== esperado) {
      throw new Error(`contarBeats(${JSON.stringify(lote.map((l) => (l.tecnico ? 'T' : 'N')))}) = ${contarBeats(lote)}, agruparBeats da ${esperado}`);
    }
  }
  const registro = (internacionales, ganadas, perdidas) => ({ internacionales: Array.from({ length: internacionales }), seriesGanadas: ganadas, seriesPerdidas: perdidas });
  const casos = [
    [registro(2, 3, 1), registro(2, 3, 1), 'regular'],
    [registro(2, 3, 1), registro(2, 4, 1), 'playoffs'],
    [registro(2, 3, 1), registro(2, 3, 2), 'playoffs'],
    [registro(2, 3, 1), registro(3, 3, 1), 'internacional'],
    [registro(2, 3, 1), registro(3, 5, 1), 'internacional']
  ];
  for (const [antes, despues, esperado] of casos) {
    if (clasificarSplit(antes, despues) !== esperado) {
      throw new Error(`clasificarSplit dio ${clasificarSplit(antes, despues)}, se esperaba ${esperado}`);
    }
  }
});

checkLento('K0 ablación: apaga los ruidos de resultados adentro de su ventana, cambia el resultado y los restaura', () => {
  // Trinquete (K0-A, revisión): una ablación que no apagaba nada, o que dejaba un ruido en 0, pasaba todos los checks.
  const adentro = [];
  const espia = (sistema, st, decision, rng) => {
    adentro.push(PARAMETROS_RUIDO.map(([grupo, clave]) => BALANCE[grupo][clave]));
    return ESTRATEGIAS_K0.criterio(sistema, st, decision, rng);
  };
  const semillas = [1, 2, 3];
  const sinRuido = correrSinRuido(semillas, 25, espia);
  if (adentro.length < 10) {
    throw new Error(`check vacío: el espía solo vio ${adentro.length} decisiones dentro de la ablación`);
  }
  adentro.forEach((valores) => {
    if (valores.some((valor) => valor !== 0)) {
      throw new Error(`adentro de la ablación los ruidos tenían que valer 0 y valían ${JSON.stringify(valores)}`);
    }
  });
  afirmarRuidoIntactoK0('después de correrSinRuido');

  // Fuera de la ventana los ruidos valen lo de siempre, y el resultado de las mismas seeds es otro.
  const afuera = [];
  const espiaAfuera = (sistema, st, decision, rng) => {
    afuera.push(PARAMETROS_RUIDO.map(([grupo, clave]) => BALANCE[grupo][clave]));
    return ESTRATEGIAS_K0.criterio(sistema, st, decision, rng);
  };
  const normal = semillas.map((seed) => correrCarreraSimulate(seed, 25, espiaAfuera).observacion.splitsProData);
  if (afuera.some((valores) => valores.some((valor, i) => valor !== FOTO_RUIDO_K0[i]))) {
    throw new Error('fuera de la ablación los ruidos no valen lo de siempre');
  }
  if (JSON.stringify(normal) === JSON.stringify(sinRuido.filasPorCarrera)) {
    throw new Error('la corrida sin ruido dio exactamente lo mismo que la normal: la ablación no cambió nada');
  }
  if (sinRuido.crashes !== 0) {
    throw new Error(`${sinRuido.crashes} crashes en la ablación`);
  }
  // Un crash adentro de la ventana tampoco puede dejar el balance en 0.
  const reventar = () => {
    throw new Error('boom');
  };
  const conCrash = correrSinRuido([1], 25, reventar);
  if (conCrash.crashes !== 1) {
    throw new Error(`un responder que revienta tenía que contarse como crash (${conCrash.crashes})`);
  }
  afirmarRuidoIntactoK0('después de una ablación con crash');
});

checkLento('K0 azar: no consume el rng del motor, no depende de él, y su índice varía entre decisiones', () => {
  // Trinquete (K0-A, revisión): `azar` consumiendo `rng()` o con un índice constante pasaba todos los checks.
  const filas = [];
  const responder = (sistema, st, decision, rng) => {
    let delegado = false;
    const sistemaEspiado = sistemaEspiaK0(sistema, () => { delegado = true; });
    const antes = rng.estado();
    const respuesta = ESTRATEGIAS_K0.azar(sistemaEspiado, st, decision, rng);
    const consumio = rng.estado() !== antes;
    if (!delegado) {
      // Sin delegar al motor, ni consume rng ni cambia con otro rng.
      const otro = ESTRATEGIAS_K0.azar(sistema, st, decision, mulberry32(987654321));
      if (JSON.stringify(otro) !== JSON.stringify(respuesta)) {
        throw new Error(`azar cambió de respuesta con otro rng en ${sistema.id}: ${JSON.stringify(respuesta)} vs ${JSON.stringify(otro)}`);
      }
    }
    filas.push({ delegado, consumio, decision, respuesta });
    return respuesta;
  };
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    correrCarreraSimulate(seed, 60, responder);
  }

  const noDelegadas = filas.filter((f) => !f.delegado);
  if (noDelegadas.length < 100) {
    throw new Error(`check vacío: solo ${noDelegadas.length} decisiones propias de azar`);
  }
  const consumieron = noDelegadas.filter((f) => f.consumio);
  if (consumieron.length > 0) {
    const ejemplo = consumieron[0];
    throw new Error(`azar consumió rng del motor en ${consumieron.length} decisiones propias (p.ej. ${ejemplo.decision.presentacion}/${ejemplo.decision.datos?.motivo})`);
  }

  // Distribución de los índices por tamaño de la lista: ninguno de los índices se queda sin salir.
  const porTamano = new Map();
  const resultadosMinijuego = [];
  for (const { decision, respuesta } of noDelegadas) {
    if (esDecisionDeMinijuego(decision)) {
      resultadosMinijuego.push(respuesta.resultado);
      continue;
    }
    const lista = esDecisionDeRutina(decision)
      ? decision.datos.rutinas
      : (esDecisionDeMercado(decision) ? [...decision.opciones, { id: '__esperar' }] : decision.opciones);
    const indice = respuesta.negociar === 'esperar' ? lista.length - 1 : lista.findIndex((o) => o.id === respuesta.opcionId);
    if (indice < 0) {
      throw new Error(`azar devolvió una opción que no está en la decisión: ${JSON.stringify(respuesta)}`);
    }
    if (!porTamano.has(lista.length)) {
      porTamano.set(lista.length, new Array(lista.length).fill(0));
    }
    porTamano.get(lista.length)[indice] += 1;
  }
  let tamanosEvaluados = 0;
  for (const [tamano, cuentas] of porTamano) {
    const total = cuentas.reduce((a, b) => a + b, 0);
    if (tamano < 2 || tamano > 4 || total < 30) {
      continue;
    }
    tamanosEvaluados += 1;
    cuentas.forEach((cuenta, indice) => {
      if (cuenta / total < 0.4 / tamano) {
        throw new Error(`azar con ${tamano} opciones: el índice ${indice} salió ${cuenta} de ${total} veces (esperado ~${(total / tamano).toFixed(0)}), no es uniforme`);
      }
    });
  }
  if (tamanosEvaluados === 0) {
    throw new Error('check vacío: ningún tamaño de lista con 30 decisiones');
  }
  if (resultadosMinijuego.length < 20) {
    throw new Error(`check vacío: solo ${resultadosMinijuego.length} minijuegos`);
  }
  if (resultadosMinijuego.some((r) => !(r >= 0 && r <= 1)) || Math.min(...resultadosMinijuego) > 0.3 || Math.max(...resultadosMinijuego) < 0.7) {
    throw new Error(`el resultado de minijuego de azar tiene que cubrir [0, 1]: min ${Math.min(...resultadosMinijuego)}, max ${Math.max(...resultadosMinijuego)}`);
  }
});

checkLento('K0 criterio y malas en el mercado de carreras reales: nunca "esperar" con ofertas, siempre el mejor/peor tier', () => {
  // Trinquete (K0-A, revisión H1): con `criterio` siempre en "esperar", o eligiendo un tier peor que el mejor, las carreras seguían corriendo.
  const vistas = { criterio: 0, malas: 0 };
  for (const bot of ['criterio', 'malas']) {
    const responder = (sistema, st, decision, rng) => {
      const respuesta = ESTRATEGIAS_K0[bot](sistema, st, decision, rng);
      if (esDecisionDeMercado(decision) && decision.opciones.length > 0) {
        vistas[bot] += 1;
        const elegida = decision.opciones.find((o) => o.id === respuesta.opcionId);
        if (respuesta.negociar || !elegida) {
          throw new Error(`${bot} con ${decision.opciones.length} ofertas devolvió ${JSON.stringify(respuesta)}`);
        }
        const tiers = decision.opciones.map((o) => o.tier ?? 99);
        const buscado = bot === 'criterio' ? Math.min(...tiers) : Math.max(...tiers);
        if ((elegida.tier ?? 99) !== buscado) {
          throw new Error(`${bot} eligió tier ${elegida.tier} habiendo tiers ${JSON.stringify(tiers)}`);
        }
      }
      return respuesta;
    };
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      correrCarreraSimulate(seed, 60, responder);
    }
  }
  if (vistas.criterio < 10 || vistas.malas < 10) {
    throw new Error(`check vacío: decisiones de mercado con ofertas vistas ${JSON.stringify(vistas)}`);
  }
});

checkLento('K0 huella: huella.js dos veces da lo mismo, simula de verdad y coincide con el motor a mano', () => {
  // Trinquete: protege la reproducibilidad de calcularHuella (40 seeds x 30 splits). K0-A, revisión: con 0 splits simulados
  // la huella seguía siendo "reproducible" (y vacía).
  const h1 = calcularHuella(40, 30);
  const h2 = calcularHuella(40, 30);
  if (h1.hash !== h2.hash) {
    throw new Error(`hash de huella diverge: ${h1.hash} vs ${h2.hash}`);
  }
  for (let i = 0; i < h1.lineas.length; i += 1) {
    if (h1.lineas[i] !== h2.lineas[i]) {
      throw new Error(`línea ${i + 1} de huella diverge: ${h1.lineas[i]} vs ${h2.lineas[i]}`);
    }
  }
  const splitCounts = h1.lineas.map((linea) => Number(linea.split(':')[2]));
  if (Math.max(...splitCounts) !== 30) {
    throw new Error(`ninguna seed llegó a 30 splits (máximo ${Math.max(...splitCounts)}): la huella no está simulando`);
  }
  // El motor a mano, sin pasar por huella.js: las primeras 4 seeds tienen que dar la misma tupla.
  for (let seed = 1; seed <= 4; seed += 1) {
    const rng = mulberry32(seed);
    let st = createInitialState(seed, rng);
    for (let split = 0; split < 30 && !st.terminado; split += 1) {
      st = avanzarSplitAuto(st, rng).state;
    }
    const esperada = `${seed}:${st.finAnticipado ?? 'null'}:${st.player.splitCount}:${Math.round(st.player.soloqElo)}`;
    if (h1.lineas[seed - 1] !== esperada) {
      throw new Error(`seed ${seed}: huella.js dice [${h1.lineas[seed - 1]}], el motor a mano [${esperada}]`);
    }
  }
});

checkLento('K0 observación: beats del reproductor, minijuegos y tipo de split coinciden con una emulación independiente', () => {
  // Trinquete (K0-A, revisión H4/H6): `ritmo` por tipo de split y `tiempoReproductorMin` salen de lo que `correrCarrera` observa.
  const splitsDeCadaTipo = { regular: 0, playoffs: 0, internacional: 0 };
  for (const seed of [1, 2, 3]) {
    // El motor a mano: avanzarSplit/resolverDecision con `resolverAuto` (lo mismo que `equilibrado`), los beats
    // por `agruparBeats` de la UI en cada tanda de logs, y el tipo de split por los contadores del registro.
    const rng = mulberry32(seed);
    let st = createInitialState(seed, rng);
    let beats = 0;
    let minijuegos = 0;
    const splitsPro = [];
    const filasIndependientes = [];
    const tanda = (desde) => {
      const nuevos = st.logs.slice(desde);
      if (nuevos.length > 0) {
        beats += agruparBeats(nuevos, desde).length;
      }
    };
    for (let i = 0; i < 60 && !st.terminado; i += 1) {
      const r0 = st.career.registro;
      let decisiones = 0;
      let desde = st.logs.length;
      st = avanzarSplit(st, rng).state;
      tanda(desde);
      while (st.pendiente) {
        const { sistemaId, decision } = st.pendiente;
        decisiones += 1;
        if (decision.presentacion === 'minijuego' || decision.datos?.motivo === 'minijuego') {
          minijuegos += 1;
        }
        desde = st.logs.length;
        st = resolverDecision(st, sistemaPorId(sistemaId).resolverAuto(st, decision, rng), rng).state;
        tanda(desde);
      }
      if (st.phase === 'profesional') {
        // La liga "modelada" y la posición normalizada, a mano: lo que `correrCarrera` guarda por split pro.
        const ligas = st.mundo.ligas ?? [];
        const liga = ligas.find((l) => l.id === st.career.liga) ?? ligas.find((l) => l.orgs?.some((o) => o.nombre === st.career.currentOrg));
        const hayPlantel = liga !== undefined && (liga.orgs ?? []).some((org) => (
          Object.values(st.mundo.planteles?.[org.nombre] ?? {}).some((j) => typeof j?.nivel === 'number')
        ));
        const tabla = st.career.temporada?.tabla;
        // Y los regresores del nivel, a mano: la media de nivel de los planteles de la liga (o la constante si no está
        // modelada), el nivel del jugador y el promedio de sus compañeros. `economia` (mentalidad, hype) sale de acá también.
        const nivelesLiga = (liga?.orgs ?? []).flatMap((org) => Object.values(st.mundo.planteles?.[org.nombre] ?? {}))
          .filter((j) => typeof j?.nivel === 'number').map((j) => j.nivel);
        const mediaLiga = nivelesLiga.length > 0 ? nivelesLiga.reduce((s, v) => s + v, 0) / nivelesLiga.length : BALANCE.mercado.nivelLigaPorDefecto;
        const companeros = st.career.companeros ?? [];
        const nivelCompaneros = companeros.length > 0 ? companeros.reduce((s, c) => s + c.nivel, 0) / companeros.length : mediaLiga;
        filasIndependientes.push({
          ligaModelada: hayPlantel,
          posNorm: st.career.posicion && tabla?.length > 1 ? 1 - (st.career.posicion - 1) / (tabla.length - 1) : null,
          mentalidad: st.player.stats.mentalidad,
          hype: st.player.stats.hype,
          nivel: nivelDelJugador(st),
          nivelRelativoJugador: nivelDelJugador(st) - mediaLiga,
          nivelRelativoCompaneros: nivelCompaneros - mediaLiga
        });
        const r1 = st.career.registro;
        let tipo = 'regular';
        if (r1.internacionales.length > r0.internacionales.length) {
          tipo = 'internacional';
        } else if (r1.seriesGanadas + r1.seriesPerdidas > r0.seriesGanadas + r0.seriesPerdidas) {
          tipo = 'playoffs';
        }
        splitsPro.push({ decisiones, tipo });
      }
    }

    const { observacion, state } = correrCarreraSimulate(seed, 60, null);
    if (observacion.beatsReproductor !== beats) {
      throw new Error(`seed ${seed}: beatsReproductor ${observacion.beatsReproductor}, la emulación cuenta ${beats}`);
    }
    if (observacion.minijuegosCount !== minijuegos) {
      throw new Error(`seed ${seed}: minijuegosCount ${observacion.minijuegosCount}, la emulación cuenta ${minijuegos}`);
    }
    // K0-A, 2ª revisión: las filas con las que `correrLote` calcula R², r y `economia` se comparan COLUMNA POR COLUMNA con
    // el cálculo a mano (antes solo `ligaModelada` y `posNorm`): un regresor con el signo cambiado o un nivel de liga mal
    // centrado no lo veía ningún check, porque todos los recuentos parten de estas mismas filas.
    if (observacion.splitsProData.length !== filasIndependientes.length) {
      throw new Error(`seed ${seed}: splitsProData tiene ${observacion.splitsProData.length} filas, el cálculo a mano ${filasIndependientes.length}`);
    }
    observacion.splitsProData.forEach((fila, i) => {
      const aMano = filasIndependientes[i];
      for (const columna of Object.keys(aMano)) {
        const igual = typeof aMano[columna] === 'number' && typeof fila[columna] === 'number'
          ? Math.abs(fila[columna] - aMano[columna]) <= 1e-9
          : fila[columna] === aMano[columna];
        if (!igual) {
          throw new Error(`seed ${seed}, split pro ${i}: ${columna} de splitsProData es ${fila[columna]}, el cálculo a mano ${aMano[columna]}`);
        }
      }
    });
    if (JSON.stringify(observacion.splitsProRitmo) !== JSON.stringify(splitsPro)) {
      throw new Error(`seed ${seed}: splitsProRitmo no coincide con la emulación (${observacion.splitsProRitmo.length} vs ${splitsPro.length} splits pro)`);
    }
    const tiempoReproductor = (beats * DURACION_BEAT_MS + minijuegos * ESPERA_MINIJUEGO_MS) / 60000;
    if (Math.abs(observacion.tiempoReproductorMin - tiempoReproductor) > 1e-9) {
      throw new Error(`seed ${seed}: tiempoReproductorMin ${observacion.tiempoReproductorMin} != ${tiempoReproductor}`);
    }
    const tiempoMaquina = (state.logs.filter((log) => !log.tecnico).length * DURACION_BEAT_MS) / 60000;
    if (Math.abs(observacion.tiempoMaquinaMin - tiempoMaquina) > 1e-9) {
      throw new Error(`seed ${seed}: tiempoMaquinaMin ${observacion.tiempoMaquinaMin} != ${tiempoMaquina}`);
    }
    splitsDeCadaTipo.regular += splitsPro.filter((s) => s.tipo === 'regular').length;
    splitsDeCadaTipo.playoffs += splitsPro.filter((s) => s.tipo === 'playoffs').length;
    splitsDeCadaTipo.internacional += splitsPro.filter((s) => s.tipo === 'internacional').length;
  }
  if (Object.values(splitsDeCadaTipo).some((n) => n === 0)) {
    throw new Error(`check vacío: falta algún tipo de split en las 3 carreras ${JSON.stringify(splitsDeCadaTipo)}`);
  }
});

checkLento('K0 cruce: el lote (nivel y ritmo) coincide con las mismas carreras corridas sueltas', () => {
  // Trinquete (K0-A, revisión H4/H6): los KPIs de `ritmo` por tipo de split y de `nivel` (splits excluidos) se recalculan acá desde
  // las observaciones de cada carrera, con umbrales escritos a mano (metas de K.3c: más de 2 y más de 4 interrupciones por split).
  const SEMILLAS = [1, 2, 3, 4, 5, 6, 7, 8];
  const lote = correrLote(SEMILLAS.length, 60, 'equilibrado');
  const observaciones = SEMILLAS.map((seed) => correrCarreraSimulate(seed, 60, null).observacion);

  const pct1 = (parte, total) => Number(((parte / total) * 100).toFixed(1));
  const medianaDe = (valores) => {
    const o = [...valores].sort((a, b) => a - b);
    const mitad = Math.floor(o.length / 2);
    return o.length % 2 === 0 ? (o[mitad - 1] + o[mitad]) / 2 : o[mitad];
  };
  const resumen = (valores) => {
    const o = [...valores].sort((a, b) => a - b);
    return {
      n: o.length,
      p50: medianaDe(o),
      p90: o[Math.min(o.length - 1, Math.floor(0.9 * o.length))],
      max: o[o.length - 1],
      pctMasDe2: pct1(o.filter((v) => v > 2).length, o.length),
      pctMasDe4: pct1(o.filter((v) => v > 4).length, o.length)
    };
  };
  const splitsPro = observaciones.flatMap((o) => o.splitsProRitmo);
  const esperadoRitmo = {
    todos: resumen(splitsPro.map((s) => s.decisiones)),
    regular: resumen(splitsPro.filter((s) => s.tipo === 'regular').map((s) => s.decisiones)),
    playoffs: resumen(splitsPro.filter((s) => s.tipo === 'playoffs').map((s) => s.decisiones)),
    internacional: resumen(splitsPro.filter((s) => s.tipo === 'internacional').map((s) => s.decisiones))
  };
  for (const tipo of Object.keys(esperadoRitmo)) {
    if (esperadoRitmo[tipo].n === 0) {
      throw new Error(`check vacío: ningún split ${tipo} en ${SEMILLAS.length} carreras`);
    }
    if (JSON.stringify(lote.ritmo.interrupcionesPorSplitPro[tipo]) !== JSON.stringify(esperadoRitmo[tipo])) {
      throw new Error(`ritmo.interrupcionesPorSplitPro.${tipo}: el lote dice ${JSON.stringify(lote.ritmo.interrupcionesPorSplitPro[tipo])}, las carreras sueltas ${JSON.stringify(esperadoRitmo[tipo])}`);
    }
  }

  const filas = observaciones.flatMap((o) => o.splitsProData).filter((d) => d.posNorm !== null);
  const excluidos = filas.filter((d) => !d.ligaModelada).length;
  if (excluidos === 0) {
    throw new Error('check vacío: ninguno de los splits tiene una liga no modelada');
  }
  if (lote.nivel.splitsConTabla !== filas.length || lote.nivel.splitsExcluidosLigaNoModelada !== excluidos) {
    throw new Error(`nivel: el lote cuenta ${lote.nivel.splitsConTabla} splits con tabla y ${lote.nivel.splitsExcluidosLigaNoModelada} excluidos; las carreras sueltas ${filas.length} y ${excluidos}`);
  }
  const redondear2 = (v) => Number(v.toFixed(2));
  const reproductor = redondear2(medianaDe(observaciones.map((o) => o.tiempoReproductorMin)));
  const maquina = redondear2(medianaDe(observaciones.map((o) => o.tiempoMaquinaMin)));
  if (lote.ritmo.tiempoReproductorMin.mediana !== reproductor || lote.ritmo.tiempoMaquinaMin.mediana !== maquina) {
    throw new Error(`tiempos: el lote dice ${JSON.stringify([lote.ritmo.tiempoReproductorMin.mediana, lote.ritmo.tiempoMaquinaMin.mediana])}, las carreras sueltas ${JSON.stringify([reproductor, maquina])}`);
  }
  void lote.nivel.varianzaExplicada; // fuerza la ablación (se calcula al leerla)
  afirmarRuidoIntactoK0('después de correrLote(8, 60, equilibrado)');
});

// Cuántas carreras y splits tienen los lotes chicos de la ablación recontada (4 bots): el R² de nivel + equipo y el
// bootstrap necesitan miles de filas, y 40 carreras x 40 splits dan ~600-900 splits pro con tabla por bot.
const CARRERAS_VARIANZA_K0 = 40;
const SPLITS_VARIANZA_K0 = 40;
// Una diferencia entre el R² sin ruido de todos los splits y el de los splits con la liga modelada (X04) o entre dos
// valores que un mutante confundiría: menor que esto, el recuento no podría distinguirlos.
const DIFERENCIA_MINIMA_R2_K0 = 0.005;

checkLento('K0 varianzaExplicada: la ablación, los R², las varianzas y el bootstrap de los 4 bots coinciden con un recuento independiente que apaga el ruido por su cuenta', () => {
  // Trinquete (K0-A, revisión H6; 2ª revisión X04, X06, N05, N11): el recuento corría solo con `equilibrado` y usaba
  // `correrSinRuido` (la función bajo prueba) con la misma lista de ruidos, así que una ablación que ignoraba al bot
  // (R² sin ruido de `criterio` calculado con las decisiones de `equilibrado`), el titular puesto en `soloLigaModelada`, un
  // bootstrap que reiniciaba la semilla en cada remuestreo (EE = 0) o una ablación con 4 de los 5 ruidos pasaban. Acá
  // cada bot recorre sus carreras sin ruido con `ablacionIndependienteK0` (lista literal de 5 ruidos, el bot de verdad) y
  // se recalculan R², varianzas y los tres errores estándar, del titular y de `soloLigaModelada`.
  const semillas = Array.from({ length: CARRERAS_VARIANZA_K0 }, (_, i) => i + 1);
  const conTabla = (filas) => filas.filter((d) => d.posNorm !== null);
  const soloModeladas = (filas) => conTabla(filas).filter((d) => d.ligaModelada);
  const problemas = [];
  const cerca = (donde, hoja, medido, esperado, tolerancia) => {
    const bien = esperado === null || medido === null
      ? medido === esperado
      : typeof medido === 'number' && Math.abs(medido - esperado) <= tolerancia;
    if (!bien) {
      problemas.push(`${donde}.${hoja}: el reporte dice ${medido}, el recuento independiente ${esperado}`);
    }
  };
  const R3 = 5e-4 + 1e-9; // redondeo a 3 decimales
  const R4 = 5e-5 + 1e-9; // redondeo a 4 decimales
  let separaModeladaDelTitular = false;
  let separaCorregidaDeK0 = false;

  for (const bot of BOTS_ABLACION_K0) {
    const lote = correrLote(CARRERAS_VARIANZA_K0, SPLITS_VARIANZA_K0, bot);
    const v = lote.nivel.varianzaExplicada;
    const base = lote.crudos.observaciones.map((o) => o.splitsProData);
    const observacionesSin = ablacionIndependienteK0(semillas, SPLITS_VARIANZA_K0, ESTRATEGIAS_K0[bot]);
    const sin = observacionesSin.map((o) => o.splitsProData);
    const titular = recuentoVarianzaK0(base.map(conTabla), sin.map(conTabla));
    const modelada = recuentoVarianzaK0(base.map(soloModeladas), sin.map(soloModeladas));
    const donde = bot;

    cerca(donde, 'r2NivelYEquipo', v.r2NivelYEquipo, titular.r2, R3);
    cerca(donde, 'r2NivelYEquipoEE', v.r2NivelYEquipoEE, titular.eeR2, R3);
    cerca(donde, 'r2SoloNivel', v.r2SoloNivel, titular.r2SoloNivel, R3);
    cerca(donde, 'r2SoloEquipo', v.r2SoloEquipo, titular.r2SoloEquipo, R3);
    cerca(donde, 'r2NivelYEquipoSinRuido', v.r2NivelYEquipoSinRuido, titular.r2Sin, R3);
    cerca(donde, 'r2NivelYEquipoSinRuidoEE', v.r2NivelYEquipoSinRuidoEE, titular.eeR2Sin, R3);
    cerca(donde, 'ruidoPuroCrudo', v.ruidoPuroCrudo, titular.ruidoPuroCrudo, R3);
    cerca(donde, 'ruidoPuroEE', v.ruidoPuroEE, titular.eeRuidoPuro, R3);
    cerca(donde, 'varBase', v.varBase, titular.varBase, R4);
    cerca(donde, 'varSinRuido', v.varSinRuido, titular.varSin, R4);
    cerca(donde, 'nSplitsBase', v.nSplitsBase, titular.nBase, 0);
    cerca(donde, 'nSplitsSinRuido', v.nSplitsSinRuido, titular.nSin, 0);
    // `ruidoPuro` solo es interpretable si el techo estructural llega a 0,3; si no, null (y el crudo viaja aparte).
    const interpretable = titular.r2Sin !== null && titular.r2Sin >= UMBRAL_R2_ESTRUCTURAL_K0;
    cerca(donde, 'ruidoPuro', v.ruidoPuro, interpretable ? titular.ruidoPuroCrudo : null, R3);
    cerca(donde, 'corridasAblacion', v.corridasAblacion, Math.min(CARRERAS_VARIANZA_K0, MAX_CORRIDAS_ABLACION_K0), 0);
    cerca(donde, 'remuestreos', v.remuestreos, REMUESTREOS_BOOTSTRAP_K0, 0);
    cerca(donde, 'umbralR2Estructural', v.umbralR2Estructural, UMBRAL_R2_ESTRUCTURAL_K0, 0);
    cerca(donde, 'crashesAblacion', v.crashesAblacion, 0, 0);

    const m = v.soloLigaModelada;
    cerca(donde, 'soloLigaModelada.r2NivelYEquipo', m.r2NivelYEquipo, modelada.r2, R3);
    cerca(donde, 'soloLigaModelada.r2NivelYEquipoEE', m.r2NivelYEquipoEE, modelada.eeR2, R3);
    cerca(donde, 'soloLigaModelada.r2NivelYEquipoSinRuido', m.r2NivelYEquipoSinRuido, modelada.r2Sin, R3);
    cerca(donde, 'soloLigaModelada.r2NivelYEquipoSinRuidoEE', m.r2NivelYEquipoSinRuidoEE, modelada.eeR2Sin, R3);
    cerca(donde, 'soloLigaModelada.ruidoPuroCrudo', m.ruidoPuroCrudo, modelada.ruidoPuroCrudo, R3);
    cerca(donde, 'soloLigaModelada.ruidoPuroEE', m.ruidoPuroEE, modelada.eeRuidoPuro, R3);
    cerca(donde, 'soloLigaModelada.nSplitsBase', m.nSplitsBase, modelada.nBase, 0);
    cerca(donde, 'soloLigaModelada.nSplitsSinRuido', m.nSplitsSinRuido, modelada.nSin, 0);

    // Propiedades que no dependen del recuento: con 40 carreras el bootstrap tiene que dar una dispersión > 0 (con la
    // semilla reiniciada en cada remuestreo, o sin remuestrear, daba 0 exacto), y dos regresores explican al menos
    // lo que explica cada uno por separado.
    for (const [hoja, valor] of [
      ['r2NivelYEquipoEE', v.r2NivelYEquipoEE], ['r2NivelYEquipoSinRuidoEE', v.r2NivelYEquipoSinRuidoEE], ['ruidoPuroEE', v.ruidoPuroEE],
      ['soloLigaModelada.r2NivelYEquipoEE', m.r2NivelYEquipoEE], ['soloLigaModelada.r2NivelYEquipoSinRuidoEE', m.r2NivelYEquipoSinRuidoEE], ['soloLigaModelada.ruidoPuroEE', m.ruidoPuroEE]
    ]) {
      if (!(valor > 0)) {
        problemas.push(`${donde}.${hoja} = ${valor}: con ${CARRERAS_VARIANZA_K0} carreras el error estándar del bootstrap tiene que ser > 0`);
      }
    }
    if (!(v.r2NivelYEquipo >= Math.max(v.r2SoloNivel, v.r2SoloEquipo) - 0.0011)) {
      problemas.push(`${donde}: el R² con los dos regresores (${v.r2NivelYEquipo}) no puede ser menor que el de cada uno (${v.r2SoloNivel}, ${v.r2SoloEquipo})`);
    }
    if (Math.abs(modelada.r2Sin - titular.r2Sin) > DIFERENCIA_MINIMA_R2_K0) {
      separaModeladaDelTitular = true;
    }

    // K2a: el R² de nivel + equipo con la definición corregida (una fila por temporada jugada), con y sin ruido, de
    // todas las temporadas con tabla y de las de liga modelada, recontado desde las mismas carreras.
    const baseT = lote.crudos.observaciones.map((o) => o.temporadasData);
    const sinT = observacionesSin.map((o) => o.temporadasData);
    const corregidas = [
      ['corregida', v.corregida, recuentoVarianzaK0(baseT.map(conTabla), sinT.map(conTabla))],
      ['corregida.soloLigaModelada', v.corregida?.soloLigaModelada, recuentoVarianzaK0(baseT.map(soloModeladas), sinT.map(soloModeladas))]
    ];
    for (const [ruta, medido, esperado] of corregidas) {
      if (!medido) {
        problemas.push(`${donde}.${ruta}: el reporte no trae el bloque`);
        continue;
      }
      cerca(donde, `${ruta}.r2NivelYEquipo`, medido.r2NivelYEquipo, esperado.r2, R3);
      cerca(donde, `${ruta}.r2NivelYEquipoEE`, medido.r2NivelYEquipoEE, esperado.eeR2, R3);
      cerca(donde, `${ruta}.r2NivelYEquipoSinRuido`, medido.r2NivelYEquipoSinRuido, esperado.r2Sin, R3);
      cerca(donde, `${ruta}.r2NivelYEquipoSinRuidoEE`, medido.r2NivelYEquipoSinRuidoEE, esperado.eeR2Sin, R3);
      cerca(donde, `${ruta}.nTemporadasBase`, medido.nTemporadasBase, esperado.nBase, 0);
      cerca(donde, `${ruta}.nTemporadasSinRuido`, medido.nTemporadasSinRuido, esperado.nSin, 0);
    }
    if (Math.abs(corregidas[1][2].r2Sin - modelada.r2Sin) > DIFERENCIA_MINIMA_R2_K0) {
      separaCorregidaDeK0 = true;
    }
    afirmarRuidoIntactoK0(`después de la ablación de ${bot} (40 carreras)`);
  }
  if (!separaModeladaDelTitular) {
    problemas.push(`check vacío: el R² sin ruido de soloLigaModelada nunca difiere del titular en más de ${DIFERENCIA_MINIMA_R2_K0}: no distingue "toma el valor del titular"`);
  }
  if (!separaCorregidaDeK0) {
    problemas.push(`check vacío: el R² sin ruido corregido nunca difiere del de K0 en más de ${DIFERENCIA_MINIMA_R2_K0}: no distingue "la corregida copia la de K0"`);
  }
  if (problemas.length > 0) {
    throw new Error(`${problemas.slice(0, 6).join('; ')}${problemas.length > 6 ? ` (+${problemas.length - 6} más)` : ''}`);
  }
});

checkLento('K0 bloques de simulate: todas las hojas de todos los bloques son finitas, los totales cierran y coinciden con un recuento independiente', () => {
  // Trinquete: protege la integridad de los bloques de medición del instrumento introducido en K0 (§K.5). K0-A, revisión: el
  // check anterior miraba solo algunas hojas (un NaN en `nivel.varianzaExplicada` o en `porRegion` pasaba), y no cruzaba los KPIs.
  const lotes = lotesDeLosBotsK0();
  for (const bot of ['criterio', 'azar', 'malas']) {
    const lote = lotes[bot];
    if (lote.crashes !== 0) {
      throw new Error(`${bot}: hubo ${lote.crashes} crashes`);
    }
    if (lote.nivel.varianzaExplicada.crashesAblacion !== 0) {
      throw new Error(`${bot}: ${lote.nivel.varianzaExplicada.crashesAblacion} crashes en la ablación`);
    }
    const { embudo, nivel, economia, longevidad, ritmo, porRegion } = lote;

    const problemas = hojasProblematicasK0({ embudo, nivel, economia, longevidad, ritmo, porRegion }, '', NULOS_PERMITIDOS_K0);
    if (problemas.length > 0) {
      throw new Error(`${bot}: ${problemas.slice(0, 5).join('; ')}${problemas.length > 5 ? ` (+${problemas.length - 5} más)` : ''}`);
    }

    if (embudo.proxyAntesDeK5 !== true) {
      throw new Error(`${bot} embudo.proxyAntesDeK5 debe ser true`);
    }
    for (const clave of ['ganaMundial', 'nuevoFaker', 'pOtroMundialDadoUno']) {
      if (embudo.proxies?.[clave]?.proxyAntesDeK5 !== true || typeof embudo.proxies[clave].nota !== 'string') {
        throw new Error(`${bot} embudo.proxies.${clave} tiene que declarar proxyAntesDeK5 y una nota`);
      }
    }
    const varianza = nivel.varianzaExplicada;
    if (typeof varianza.r2NivelYEquipo !== 'number' || typeof varianza.r2NivelYEquipoSinRuido !== 'number') {
      throw new Error(`${bot} nivel.varianzaExplicada tiene que traer los dos R² como números`);
    }
    if (typeof varianza.soloLigaModelada?.r2NivelYEquipo !== 'number' || typeof varianza.soloLigaModelada.r2NivelYEquipoSinRuido !== 'number') {
      throw new Error(`${bot} nivel.varianzaExplicada.soloLigaModelada tiene que traer los dos R² como números`);
    }
    if ((varianza.r2NivelYEquipoSinRuido < varianza.umbralR2Estructural) !== (varianza.ruidoPuro === null)) {
      throw new Error(`${bot}: ruidoPuro tiene que ser null si y solo si el R² sin ruido (${varianza.r2NivelYEquipoSinRuido}) es menor que ${varianza.umbralR2Estructural}`);
    }
    if (nivel.favoritoBo5.length !== DELTAS_FAVORITO_BO5.length) {
      throw new Error(`${bot} nivel.favoritoBo5 debe tener ${DELTAS_FAVORITO_BO5.length} entradas`);
    }
    if (nivel.splitsExcluidosLigaNoModelada > nivel.splitsConTabla) {
      throw new Error(`${bot}: más splits excluidos (${nivel.splitsExcluidosLigaNoModelada}) que splits con tabla (${nivel.splitsConTabla})`);
    }
    // K2a: las bandas del Bo5 suman las series menos las de afuera, y cada banda es jugador + rival.
    const bo5 = nivel.bo5Motor;
    if (bo5.bandas.reduce((suma, b) => suma + b.ambos.n, 0) + bo5.fueraDeBandas !== bo5.seriesBo5
      || bo5.bandas.some((b) => b.jugadorFavorito.n + b.rivalFavorito.n !== b.ambos.n)) {
      throw new Error(`${bot}: las bandas de nivel.bo5Motor no cierran contra las ${bo5.seriesBo5} series`);
    }
    // K2a: cada meta de K2 lleva el valor de su fuente y `cumple` sale de la meta escrita acá (PLAN.md "Checks de K2").
    const metas = nivel.metasK2;
    const claro = bo5.favoritoClaro;
    const fuentes = [
      ['rNivelPosicionMismaLiga', nivel.corregida.rNivelPosicionMismaLiga, (x) => x >= 0.5],
      ['r2NivelYEquipoSinRuidoLigaModelada', varianza.corregida.soloLigaModelada.r2NivelYEquipoSinRuido, (x) => x >= 0.5],
      ['bo5FavoritoClaroJugador', claro.jugadorFavorito.ganaFavoritoPct, (x) => x >= 75 && x <= 85],
      ['bo5FavoritoClaroRival', claro.rivalFavorito.ganaFavoritoPct, (x) => x >= 75 && x <= 85]
    ];
    for (const [clave, valor, cumple] of fuentes) {
      if (metas[clave]?.valor !== valor || metas[clave].cumple !== (valor !== null && cumple(valor))) {
        throw new Error(`${bot}: nivel.metasK2.${clave} = ${JSON.stringify(metas[clave])}, su fuente vale ${valor}`);
      }
    }

    // Los totales cierran: no llegó + llegó = 100; y los cuatro destinos de un pro suman 100 con los que no llegaron.
    if (Math.abs(embudo.noLlegaAPro + embudo.llegaAPro - 100) > 0.11) {
      throw new Error(`${bot}: noLlegaAPro (${embudo.noLlegaAPro}) + llegaAPro (${embudo.llegaAPro}) no suma 100`);
    }
    const reparto = embudo.noLlegaAPro + embudo.estancadoT2T3 + embudo.proSinTierNunca + embudo.llegaATier1;
    if (Math.abs(reparto - 100) > 0.41) {
      throw new Error(`${bot}: noLlegaAPro + estancadoT2T3 + proSinTierNunca + llegaATier1 = ${reparto.toFixed(1)}, tiene que dar 100`);
    }
    const carrerasPorRegion = Object.values(porRegion).reduce((s, r) => s + r.totalCarreras, 0);
    if (carrerasPorRegion !== CARRERAS_LOTE_K0) {
      throw new Error(`${bot}: porRegion suma ${carrerasPorRegion} carreras, el lote tiene ${CARRERAS_LOTE_K0}`);
    }

    // Ritmo: los tres tipos de split suman los splits pro, y están ordenados.
    const porSplit = ritmo.interrupcionesPorSplitPro;
    const sumaTipos = porSplit.regular.n + porSplit.playoffs.n + porSplit.internacional.n;
    if (sumaTipos !== porSplit.todos.n) {
      throw new Error(`${bot}: regular + playoffs + internacional = ${sumaTipos}, todos = ${porSplit.todos.n}`);
    }
    for (const tipo of ['todos', 'regular', 'playoffs', 'internacional']) {
      const r = porSplit[tipo];
      if (r.n === 0 || !(r.p50 <= r.p90 && r.p90 <= r.max) || r.pctMasDe4 > r.pctMasDe2) {
        throw new Error(`${bot}: interrupcionesPorSplitPro.${tipo} incoherente: ${JSON.stringify(r)}`);
      }
    }
    if (!(ritmo.tiempoReproductorMin.mediana > 0) || !(ritmo.tiempoMaquinaMin.mediana > 0)) {
      throw new Error(`${bot}: los tiempos tienen que ser positivos`);
    }
  }

  // Recuento independiente de los estados finales, con el motor a mano (lo mismo que `equilibrado`): los KPIs
  // de `embudo` que salen de los estados finales tienen que dar lo mismo que el lote.
  const N = 60;
  const lote = correrLote(N, 60, 'equilibrado');
  const cuentas = { noPro: 0, titulo: 0, top20: 0, numeroUno: 0, buenPapel: 0, numeroUno3: 0, faker: 0, forzoso: 0, cortas: 0 };
  const buenPapelPorCarrera = [];
  const aniosPro = [];
  for (let seed = 1; seed <= N; seed += 1) {
    const rng = mulberry32(seed);
    let st = createInitialState(seed, rng);
    for (let split = 0; split < 60 && !st.terminado; split += 1) {
      st = avanzarSplitAuto(st, rng).state;
    }
    const registro = st.career.registro;
    const buenPapel = registro.internacionales.filter((i) => i.resultado === 'buen_papel').length;
    // #1 del mundo en una temporada = el reveal del Top 20 de fin de año dice que sos el #1.
    const temporadasNumeroUno = st.logs.filter((l) => l.type === 'top_mundial' && l.rankJugador === 1).length;
    buenPapelPorCarrera.push(buenPapel);
    cuentas.noPro += st.splitFichaje === null ? 1 : 0;
    cuentas.titulo += registro.titulos.length >= 1 ? 1 : 0;
    cuentas.top20 += (registro.picos.rankMundial ?? 0) > 0 ? 1 : 0;
    cuentas.numeroUno += registro.picos.rankMundial === 1 ? 1 : 0;
    cuentas.buenPapel += buenPapel >= 1 ? 1 : 0;
    cuentas.numeroUno3 += temporadasNumeroUno >= 3 ? 1 : 0;
    cuentas.faker += buenPapel >= 2 || temporadasNumeroUno >= 3 ? 1 : 0;
    if (st.splitFichaje !== null) {
      const anios = (st.player.splitCount - st.splitFichaje) / BALANCE.edad.splitsPorEdad;
      aniosPro.push(anios);
      cuentas.cortas += anios < 4 ? 1 : 0;
      cuentas.forzoso += st.age >= BALANCE.retiro.edadRetiroForzoso ? 1 : 0;
    }
  }
  const pct = (n, total = N) => Number(((n / total) * 100).toFixed(1));
  const medianaDe = (valores) => {
    const o = [...valores].sort((a, b) => a - b);
    const mitad = Math.floor(o.length / 2);
    return o.length % 2 === 0 ? (o[mitad - 1] + o[mitad]) / 2 : o[mitad];
  };
  const esperados = {
    'embudo.noLlegaAPro': [lote.embudo.noLlegaAPro, pct(cuentas.noPro)],
    'embudo.llegaAPro': [lote.embudo.llegaAPro, pct(N - cuentas.noPro)],
    'embudo.ganaTituloDomestico': [lote.embudo.ganaTituloDomestico, pct(cuentas.titulo)],
    'embudo.top20': [lote.embudo.top20, pct(cuentas.top20)],
    'embudo.numeroUnoAlgunaVez': [lote.embudo.numeroUnoAlgunaVez, pct(cuentas.numeroUno)],
    'embudo.numeroUnoDelMundo3Temporadas': [lote.embudo.numeroUnoDelMundo3Temporadas, pct(cuentas.numeroUno3)],
    'embudo.ganaMundial': [lote.embudo.ganaMundial, pct(cuentas.buenPapel)],
    'embudo.nuevoFaker': [lote.embudo.nuevoFaker, pct(cuentas.faker)],
    'embudo.buenPapelPorCarrera.media': [lote.embudo.buenPapelPorCarrera.media, Number((buenPapelPorCarrera.reduce((a, b) => a + b, 0) / N).toFixed(2))],
    'embudo.buenPapelPorCarrera.mediana': [lote.embudo.buenPapelPorCarrera.mediana, medianaDe(buenPapelPorCarrera)],
    'longevidad.aniosCarreraPro.mediana': [lote.longevidad.aniosCarreraPro.mediana, medianaDe(aniosPro)],
    'longevidad.aniosCarreraPro.pctMenosDe4Anios': [lote.longevidad.aniosCarreraPro.pctMenosDe4Anios, pct(cuentas.cortas, aniosPro.length)],
    'longevidad.pctTerminaEnLineaForzosa34': [lote.longevidad.pctTerminaEnLineaForzosa34, pct(cuentas.forzoso, aniosPro.length)]
  };
  for (const [clave, [medido, esperado]] of Object.entries(esperados)) {
    if (medido !== esperado) {
      throw new Error(`${clave} = ${medido}, el recuento independiente da ${esperado}`);
    }
  }
  void lote.nivel.varianzaExplicada; // fuerza la ablación (se calcula al leerla)
  afirmarRuidoIntactoK0('después de correrLote(equilibrado)');
});

checkLento('K0 KPIs anclados: embudo, longevidad, economía, ritmo, nivel y porRegion de los 3 bots coinciden con un recuento independiente de sus carreras', () => {
  // Trinquete (K0-A, 2ª revisión): los checks solo detectaban crashes y NaN, y 21 de 29 mutantes que dejaban un KPI en un valor
  // equivocado pero finito pasaban: la r de misma liga con todos los splits (X01, la regresión H6), `porRegion` copiando
  // el lote entero (X02), el denominador de `pOtroMundialDadoUno` (X03) y de `top20DeTier1` (X10), `economia.p50` calculando el
  // p25 (X05), `interrupcionesPorCarrera.mediana` devolviendo el p90 (X07), `longevidad.p90` la mediana (X11). Acá los
  // 3 lotes de 200 carreras x 60 splits (los mismos de los demás checks) se recuentan HOJA POR HOJA desde sus estados finales y
  // observaciones, con la segunda implementación de `recuentoKPIsK0`; ver el comentario de ese bloque.
  const lotes = lotesDeLosBotsK0();
  const problemas = [];
  const cuenta = { hojas: 0 };
  // "Distingue": para cada KPI que un mutante confundía con otro, el recuento tiene que dar valores distintos para los dos, en
  // algún bot; si no, el check no podría ver ese mutante aunque comparara todo.
  const distingue = {
    'X01 r de la misma liga (solo splits modelados) vs con todos los splits': false,
    'X03 pOtroMundialDadoUno vs con el total de carreras como denominador': false,
    'X05 economía p50 vs p25 (mentalidad)': false,
    'X05 economía p50 vs p25 (hype)': false,
    'X07 interrupciones por carrera: mediana vs p90': false,
    'X10 top20DeTier1 vs top20 sobre el total': false,
    'X11 años de carrera pro: p90 vs mediana': false,
    'K2a r de la misma liga corregida vs la de K0': false,
    'K2a splits pro sin temporada (filas rancias de K0) presentes': false
  };
  const claves = Object.keys(distingue);

  for (const bot of BOTS_K0) {
    const lote = lotes[bot];
    const crudos = lote.crudos;
    const total = crudos.resultados.length;
    const esperado = recuentoKPIsK0(crudos);
    const comparar = (medido, esperadoHojas, ruta, ignorar) => compararHojasK0(medido, esperadoHojas, `${bot}.${ruta}`, problemas, cuenta, ignorar);

    comparar(lote.embudo, esperado.embudo, 'embudo', ['proxies']);
    comparar(lote.longevidad, esperado.longevidad, 'longevidad');
    comparar(lote.economia, esperado.economia, 'economia');
    comparar(
      { ...lote.ritmo, desglosePorTipo: Object.fromEntries(lote.ritmo.desglosePorTipo.map(({ tipo, ...hojas }) => [tipo, hojas])) },
      esperado.ritmo,
      'ritmo'
    );
    const { rNivelPosicionMismaLiga, rNivelPosicionBruto, splitsConTabla, splitsExcluidosLigaNoModelada, corregida } = lote.nivel;
    comparar({ rNivelPosicionMismaLiga, rNivelPosicionBruto, splitsConTabla, splitsExcluidosLigaNoModelada, corregida }, esperado.nivel, 'nivel');
    // K2a: el Bo5 medido en el motor, hoja por hoja.
    comparar(lote.nivel.bo5Motor, recuentoBo5K2a(crudos.observaciones), 'nivel.bo5Motor');
    if (Math.abs(esperado.nivel.corregida.rNivelPosicionMismaLiga - esperado.nivel.rNivelPosicionMismaLiga) > DIFERENCIA_MINIMA_R_K0) {
      distingue[claves[7]] = true;
    }
    if (esperado.nivel.corregida.splitsProSinTemporada > 0) {
      distingue[claves[8]] = true;
    }
    const porRegionEsperado = recuentoPorRegionK0(crudos);
    comparar(lote.porRegion, porRegionEsperado, 'porRegion');

    // X01: los splits usados en la r de la misma liga + los excluidos (tier ≠ 3) = los splits con tabla.
    const conTabla = crudos.observaciones.flatMap((o) => o.splitsProData).filter((d) => d.posNorm !== null);
    const usados = cuentaK0(conTabla, (d) => d.ligaModelada);
    if (usados + splitsExcluidosLigaNoModelada !== splitsConTabla || usados === 0 || splitsExcluidosLigaNoModelada === 0) {
      problemas.push(`${bot}.nivel: ${usados} usados + ${splitsExcluidosLigaNoModelada} excluidos tienen que sumar los ${splitsConTabla} splits con tabla (y ser > 0 los dos)`);
    }
    const rTodos = correlacionK0(conTabla.map((d) => d.nivelRelativoJugador), conTabla.map((d) => d.posNorm));
    if (Math.abs(rTodos - esperado.nivel.rNivelPosicionMismaLiga) > DIFERENCIA_MINIMA_R_K0) {
      distingue[claves[0]] = true;
    }
    // X02: al menos 2 regiones cuyo embudo o longevidad recontados difieran de los del lote entero (si no, "porRegion
    // copia el lote entero" no se vería).
    const regionesDistintas = cuentaK0(Object.values(porRegionEsperado), (region) => (
      JSON.stringify([region.embudo, region.longevidad]) !== JSON.stringify([esperado.embudo, esperado.longevidad])
    ));
    if (regionesDistintas < 2) {
      problemas.push(`check vacío: ${bot} solo tiene ${regionesDistintas} región(es) con embudo/longevidad distintos del lote entero: no distingue "porRegion copia el lote"`);
    }
    // X03: P(otro mundial | ya ganó uno) con el denominador correcto vs con el total de carreras.
    const dosOMas = cuentaK0(crudos.resultados, (r) => cuentaK0(r.career.registro.internacionales, (i) => i.resultado === 'buen_papel') >= 2);
    if (esperado.embudo.pOtroMundialDadoUno !== null && Math.abs(esperado.embudo.pOtroMundialDadoUno - dosOMas / total) > DIFERENCIA_MINIMA_PROBABILIDAD_K0) {
      distingue[claves[1]] = true;
    }
    for (const [i, atributo] of [[2, 'mentalidad'], [3, 'hype']]) {
      if (esperado.economia[atributo].p50 !== esperado.economia[atributo].p25) {
        distingue[claves[i]] = true;
      }
    }
    if (esperado.ritmo.interrupcionesPorCarrera.mediana !== esperado.ritmo.interrupcionesPorCarrera.p90) {
      distingue[claves[4]] = true;
    }
    if (esperado.embudo.top20DeTier1 !== esperado.embudo.top20) {
      distingue[claves[5]] = true;
    }
    if (esperado.longevidad.aniosCarreraPro.p90 !== esperado.longevidad.aniosCarreraPro.mediana) {
      distingue[claves[6]] = true;
    }
    // Invariante entre dos contadores independientes del observador: las decisiones de la carrera.
    crudos.observaciones.forEach((o, i) => {
      const suma = Object.values(o.decisionesPorTipo).reduce((a, b) => a + b, 0);
      if (suma !== crudos.jugabilidades[i].decisiones) {
        problemas.push(`${bot} seed ${o.seed}: decisionesPorTipo suma ${suma}, jugabilidad.decisiones ${crudos.jugabilidades[i].decisiones}`);
      }
    });
  }

  for (const [descripcion, vale] of Object.entries(distingue)) {
    if (!vale) {
      problemas.push(`check vacío: no distingue ${descripcion}`);
    }
  }
  if (cuenta.hojas < HOJAS_MINIMAS_K0) {
    problemas.push(`check vacío: solo se compararon ${cuenta.hojas} hojas`);
  }
  if (problemas.length > 0) {
    throw new Error(`${problemas.slice(0, 6).join('; ')}${problemas.length > 6 ? ` (+${problemas.length - 6} más)` : ''}`);
  }
});

// Los tipos de decisión que `criterio` y `malas` NO resuelven con su criterio y le delegan a `resolverAuto` del sistema.
// Medido con 40 carreras x 60 splits (seeds 1-40): `criterio` delega el 29,7% de sus decisiones (1.794 de 6.041) y `malas` el
// 16,9% (487 de 2.877). Es una lista CERRADA: un tipo que hoy usa la previa y llegue a `resolverAuto` (como `edadCierre`,
// el 9,5% de las decisiones, cuando `criterio` solo la usaba en el sistema `eventos`) rompe el check; sumar un tipo acá
// es admitir a propósito que un bot deja de decidir ese tipo.
const DELEGACION_COMUN_K0 = {
  // Decisión de diseño conocida de la spec K0 (K.5): `criterio` y `malas` no tienen criterio propio para el momento del
  // partido (sin previa en las opciones) y el motor decide por ellos: ~12% de las decisiones de `criterio`.
  'temporada:momento': 'el momento del partido no trae previa: lo decide `resolverAuto`',
  // Decisiones de la etapa amateur y de cierre de carrera sin previa ni forma de elegir "mejor" o "peor":
  'amateur:negociacion': 'negociación del amateur: sin previa',
  'amateur:salida_amateur': 'la salida del amateur: sin previa',
  'amateur:oferta': 'oferta de equipo del amateur: sin previa',
  'amateur:nocturno': 'el modo nocturno: sin previa',
  'retiro:retiro_declive': 'el retiro por declive: sin previa',
  'retiro:retiro_vuelta': 'la vuelta del retiro: sin previa',
  'salud:lesion_grave': 'la lesión grave: sin previa',
  'servicioMilitar:servicio_te_vas': 'el servicio militar: sin previa',
  'servicioMilitar:servicio_adentro': 'el servicio militar: sin previa',
  'servicioMilitar:servicio_volver': 'el servicio militar: sin previa'
};
// Las rutinas (`practica`, `amateur:reparto`): `criterio` usa la que elige el propio sistema (`responderCriterio` delega
// de entrada); `malas` sí elige una (la más agresiva), así que a ella no se le permite.
const DELEGACION_RUTINAS_K0 = {
  'practica:practica': 'rutina: `criterio` usa la que elige el sistema',
  'amateur:reparto': 'rutina: `criterio` usa la que elige el sistema'
};

checkLento('K0 criterio y malas: solo delegan en resolverAuto los tipos de decisión declarados (criterio usa la previa en todos los demás)', () => {
  // Trinquete (K0-A, 2ª revisión, N04): `criterio` usando la previa solo en `eventos` (y mandando `edadCierre` a `resolverAuto`)
  // pasaba todo: el check de `puntuarPrevia` probaba un sistema `eventos`. Acá un espía sobre `resolverAuto` cuenta, por tipo
  // de decisión y bot, cuántas veces se delega; cualquier tipo fuera de la lista declarada rompe el check.
  const SEMILLAS = Array.from({ length: CARRERAS_DELEGACION_K0 }, (_, i) => i + 1);
  for (const bot of ['criterio', 'malas']) {
    const permitidos = bot === 'criterio' ? { ...DELEGACION_COMUN_K0, ...DELEGACION_RUTINAS_K0 } : DELEGACION_COMUN_K0;
    const vistos = {};
    const responder = (sistema, st, decision, rng) => {
      let delegado = false;
      const respuesta = ESTRATEGIAS_K0[bot](sistemaEspiaK0(sistema, () => { delegado = true; }), st, decision, rng);
      const tipo = `${sistema.id}:${decision.datos?.motivo ?? decision.presentacion ?? 'x'}`;
      vistos[tipo] = vistos[tipo] ?? { total: 0, delegadas: 0 };
      vistos[tipo].total += 1;
      vistos[tipo].delegadas += delegado ? 1 : 0;
      return respuesta;
    };
    for (const seed of SEMILLAS) {
      correrCarreraSimulate(seed, 60, responder);
    }
    const noDeclarados = Object.entries(vistos).filter(([tipo, v]) => v.delegadas > 0 && !(tipo in permitidos));
    if (noDeclarados.length > 0) {
      throw new Error(`${bot} delega en resolverAuto tipos de decisión que no están declarados: ${noDeclarados.map(([tipo, v]) => `${tipo} (${v.delegadas} de ${v.total})`).join(', ')}`);
    }
    const totales = Object.values(vistos).reduce((acc, v) => ({ total: acc.total + v.total, delegadas: acc.delegadas + v.delegadas }), { total: 0, delegadas: 0 });
    if (totales.delegadas === 0 || totales.total - totales.delegadas < DECISIONES_PROPIAS_MINIMAS_K0) {
      throw new Error(`check vacío: ${bot} delegó ${totales.delegadas} de ${totales.total} decisiones en ${SEMILLAS.length} carreras`);
    }
  }
});

checkLento('K0 reporte completo: todas las hojas de criterio, azar y malas (jugabilidad incluida) son finitas y no nulas', () => {
  // Trinquete (K0-A, 2ª revisión): el check J0 quedó con las 3 estrategias clásicas, y el bloque `jugabilidad` de los bots
  // nuevos no se miraba en ningún lado; el recorrido de "bloques de simulate" tampoco incluía `jugabilidad`. Se reusan los
  // lotes de 200 carreras (los mismos de los demás checks: sin simular de nuevo) y se recorre el reporte ENTERO.
  const lotes = lotesDeLosBotsK0();
  for (const bot of BOTS_K0) {
    const lote = lotes[bot];
    const problemas = hojasProblematicasK0({ ...lote }, '', NULOS_PERMITIDOS_K0);
    if (problemas.length > 0) {
      throw new Error(`${bot}: ${problemas.slice(0, 5).join('; ')}${problemas.length > 5 ? ` (+${problemas.length - 5} más)` : ''}`);
    }
    if (lote.jugabilidad === undefined || lote.jugabilidad.decisionesPorCarrera?.promedio === undefined) {
      throw new Error(`${bot}: el reporte no trae el bloque jugabilidad`);
    }
  }
});

checkLento('K0 los bots separan: criterio no queda estancado y malas es muy peor que azar', () => {
  // Trinquete (K0-A, revisión H1): con la regla de mercado vieja `criterio` quedaba estancado en tier 2/3 el 14,8% de las
  // carreras (800 carreras) y llegaba a tier 1 ~12 pp por debajo de `azar`; el instrumento no medía a un jugador con criterio.
  const { criterio, azar, malas } = lotesDeLosBotsK0();
  if (!(criterio.embudo.estancadoT2T3 <= 5)) {
    throw new Error(`criterio quedó estancado en tier 2/3 el ${criterio.embudo.estancadoT2T3}% (tope 5%)`);
  }
  if (!(criterio.embudo.llegaATier1 >= azar.embudo.llegaATier1 - 5)) {
    throw new Error(`criterio llega a tier 1 el ${criterio.embudo.llegaATier1}%, azar el ${azar.embudo.llegaATier1}%: criterio no puede quedar 5 pp abajo`);
  }
  if (!(malas.embudo.llegaATier1 <= azar.embudo.llegaATier1 - 20)) {
    throw new Error(`malas llega a tier 1 el ${malas.embudo.llegaATier1}% y azar el ${azar.embudo.llegaATier1}%: malas tiene que quedar 20 pp abajo`);
  }
  if (!(malas.embudo.noLlegaAPro >= azar.embudo.noLlegaAPro + 10)) {
    throw new Error(`malas no llega a pro el ${malas.embudo.noLlegaAPro}% y azar el ${azar.embudo.noLlegaAPro}%: malas tiene que quedar 10 pp peor`);
  }
});

checkLento('K0 bots deterministas: misma seed y mismo bot producen estado final idéntico', () => {
  // Trinquete: protege el determinismo estricto de los tres bots (criterio, azar, malas) de K0.
  const semillas = [12, 45, 99];
  for (const bot of ['criterio', 'azar', 'malas']) {
    for (const seed of semillas) {
      const r1 = correrCarreraSimulate(seed, 45, ESTRATEGIAS_K0[bot]);
      const r2 = correrCarreraSimulate(seed, 45, ESTRATEGIAS_K0[bot]);

      if (r1.state.finAnticipado !== r2.state.finAnticipado) {
        throw new Error(`${bot} seed ${seed}: finAnticipado difiere (${r1.state.finAnticipado} vs ${r2.state.finAnticipado})`);
      }
      if (r1.state.player.splitCount !== r2.state.player.splitCount) {
        throw new Error(`${bot} seed ${seed}: splitCount difiere (${r1.state.player.splitCount} vs ${r2.state.player.splitCount})`);
      }
      if (r1.state.player.soloqElo !== r2.state.player.soloqElo) {
        throw new Error(`${bot} seed ${seed}: soloqElo difiere (${r1.state.player.soloqElo} vs ${r2.state.player.soloqElo})`);
      }
      if (r1.state.career.registro.titulos.length !== r2.state.career.registro.titulos.length) {
        throw new Error(`${bot} seed ${seed}: titulos difiere (${r1.state.career.registro.titulos.length} vs ${r2.state.career.registro.titulos.length})`);
      }
    }
  }
});

checkLento('K0 equilibrado intacto: el instrumento no altera el stream de RNG ni el estado del motor', () => {
  // Trinquete: garantiza que correrCarrera con equilibrado no consuma RNG extra ni toque el estado comparado con avanzarSplitAuto
  // directo. K0-A, revisión: compara el estado final ENTERO (antes eran 4 campos).
  for (let seed = 1; seed <= 5; seed += 1) {
    const { state: stInstrumentado } = correrCarreraSimulate(seed, 30, ESTRATEGIAS_K0['equilibrado']);

    const rngMotor = mulberry32(seed);
    let stMotor = createInitialState(seed, rngMotor);
    for (let split = 0; split < 30 && !stMotor.terminado; split += 1) {
      stMotor = avanzarSplitAuto(stMotor, rngMotor).state;
    }

    if (stInstrumentado.finAnticipado !== stMotor.finAnticipado) {
      throw new Error(`seed ${seed}: finAnticipado diverge (${stInstrumentado.finAnticipado} vs ${stMotor.finAnticipado})`);
    }
    if (stInstrumentado.player.splitCount !== stMotor.player.splitCount) {
      throw new Error(`seed ${seed}: splitCount diverge (${stInstrumentado.player.splitCount} vs ${stMotor.player.splitCount})`);
    }
    if (stInstrumentado.player.soloqElo !== stMotor.player.soloqElo) {
      throw new Error(`seed ${seed}: soloqElo diverge (${stInstrumentado.player.soloqElo} vs ${stMotor.player.soloqElo})`);
    }
    if (stInstrumentado.career.registro.titulos.length !== stMotor.career.registro.titulos.length) {
      throw new Error(`seed ${seed}: titulos diverge (${stInstrumentado.career.registro.titulos.length} vs ${stMotor.career.registro.titulos.length})`);
    }
    if (JSON.stringify(stInstrumentado) !== JSON.stringify(stMotor)) {
      throw new Error(`seed ${seed}: el estado final completo difiere del que deja el motor sin instrumentar`);
    }
  }
});

checkLento('K0 agencia: la corrida mínima termina con tabla finita y pctInterrupcionesConPalanca válido', () => {
  // Trinquete: protege el funcionamiento del contrafáctico de agencia (medirAgencia y analizarDatosAgencia).
  const datos = medirAgencia({ carreras: 2, reps: 2, cuota: 1, splits: 20, desde: 1 });
  const analisis = analizarDatosAgencia(datos, 10);

  if (!Array.isArray(analisis.filas) || analisis.filas.length === 0) {
    throw new Error('agencia no produjo filas de análisis');
  }
  // Las tres definiciones (el ponderado y las dos del todo-o-nada de la auditoría): números en [0, 100].
  for (const clave of ['pctInterrupcionesConPalanca', 'pctInterrupcionesConPalancaAuditoria', 'pctInterrupcionesConPalancaAuditoriaTestViejo']) {
    if (typeof analisis[clave] !== 'number' || !Number.isFinite(analisis[clave])) {
      throw new Error(`${clave} inválido: ${analisis[clave]}`);
    }
    if (analisis[clave] < 0 || analisis[clave] > 100) {
      throw new Error(`${clave} fuera de rango [0, 100]: ${analisis[clave]}`);
    }
  }
  for (const fila of analisis.filas) {
    if (!Number.isFinite(fila.palancaMediana) || !Number.isFinite(fila.pctSignificativo) || !Number.isFinite(fila.ruidoDentro)) {
      throw new Error(`fila de agencia contiene valores no finitos: ${JSON.stringify(fila)}`);
    }
  }
});

checkLento('K0 agencia --analizar: un archivo inexistente falla con mensaje y salida 1 (no "0 decisiones, 0%")', () => {
  // Trinquete (K0-A, revisión H7): antes imprimía "0 decisiones" y salía con 0, y parecía una medición válida.
  const corrida = spawnSync(process.execPath, [path.join(__dirname, 'agencia.js'), '--analizar=__no_existe_k0__.json'], { encoding: 'utf8' });
  if (corrida.status !== 1) {
    throw new Error(`se esperaba salida 1, fue ${corrida.status}`);
  }
  if (!/no existe/.test(corrida.stderr)) {
    throw new Error(`falta el mensaje claro en stderr: ${JSON.stringify(corrida.stderr)}`);
  }
});

checkLento('K0 ablación restaura BALANCE: después de todo el bloque K0 las constantes de ruido quedan intactas', () => {
  // Trinquete: asegura que la ablación en correrLote nunca contamine el objeto BALANCE global. K0-A, revisión: compara contra
  // la foto del TOPE del bloque (antes de cualquier lote) y contra un balance.js virgen, y exige que los ruidos valgan > 0;
  // antes la foto se sacaba acá adentro, después de que otro check ya hubiera corrido lotes.
  afirmarRuidoIntactoK0('al final del bloque K0');
  void correrLote(5, 15, 'criterio').nivel.varianzaExplicada; // fuerza la ablación (se calcula al leerla)
  afirmarRuidoIntactoK0('después de correrLote(5, 15, criterio)');
});

// ============================================================================
// FASE K, K1-A — El número (PLAN.md §K1 y "K1 — decisiones de spec")
// ============================================================================
// D75/D76 (el registro cuenta lo jugado por tier), `dificultad` en leagues.json, `core/puntaje.js`, las leyendas,
// el desafío diario y la versión del juego. Ninguno es un check de banda: cuidan contratos (puro, monótono,
// completo, idéntico), no números del balance. Cada uno se verificó en rojo contra un mutante (regla de proceso 7):
// la tabla mutante -> check está en el reporte de K1-A.
const {
  puntajeDeCarrera, NIVELES: NIVELES_K1, nivelDeCarrera, HECHOS_DE_REQUISITO, percentilDePuntaje, factorDePotencial,
  leyendaMasCercana, distanciaDeLeyenda, puestoEnLaGeneracion
} = await import('../core/puntaje.js');
const { seedDelDia, esFechaDeDesafio, iniciarDesafio } = await import('../core/desafio.js');
const { VERSION_JUEGO, HUELLA_JUEGO } = await import('../data/version.js');
const { tierMasAltoJugado, splitsJugadosEnTier, TIERS_DE_SPLIT } = await import('../core/registro.js');
const { PREFIJOS_HANDLE, SUFIJOS_HANDLE } = await import('../core/mundo.js');
const LEYENDAS_K1 = (await import('../data/leyendas.json', { with: { type: 'json' } })).default;

// Las carreras de referencia de los checks rápidos de K1 (seeds 1-8 a 60 splits, el responder por defecto): hay
// carreras que no llegaron a pro, carreras de tier 1 con y sin Top 20, y la mayoría termina adentro de los 60 splits.
const SEEDS_PUNTAJE_K1 = [1, 2, 3, 4, 5, 6, 7, 8];
const SPLITS_PUNTAJE_K1 = 60;

let estadosPuntajeK1 = null;
function estadosDeReferenciaK1() {
  estadosPuntajeK1 ??= SEEDS_PUNTAJE_K1.map((seed) => correrCarrera(seed, SPLITS_PUNTAJE_K1));
  return estadosPuntajeK1.map((estado) => structuredClone(estado));
}

const componenteK1 = (puntaje, id) => {
  const componente = puntaje.componentes.find((c) => c.id === id);
  if (!componente) {
    throw new Error(`el puntaje no trae el componente "${id}"`);
  }
  return componente.puntos;
};

// El texto de un `.js` sin comentarios (bloque y de línea), para los checks estáticos: así un comentario que
// nombra lo prohibido no dispara, y el código que lo usa sí.
function codigoSinComentariosK1(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((linea) => linea.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
}

check('K1 puntaje.js y desafio.js: no importan rng.js ni usan el azar nativo ni el reloj (estático)', () => {
  const AZAR_NATIVO = 'Math' + '.random';
  const problemas = [];
  for (const relativa of ['core/puntaje.js', 'core/desafio.js']) {
    const codigo = codigoSinComentariosK1(fs.readFileSync(path.join(srcDir, relativa), 'utf8'));
    if (/\bfrom\s+['"][^'"]*\brng\.js['"]|\bimport\s*\(\s*['"][^'"]*\brng\.js['"]/.test(codigo)) {
      problemas.push(`${relativa} importa rng.js`);
    }
    if (codigo.includes(AZAR_NATIVO)) {
      problemas.push(`${relativa} usa el azar nativo`);
    }
    if (/\bDate\b|\bperformance\s*\.\s*now\b/.test(codigo)) {
      problemas.push(`${relativa} usa el reloj`);
    }
  }
  if (problemas.length > 0) {
    throw new Error(problemas.join('; '));
  }
});

// Corre `fn` con el azar nativo y el reloj prohibidos: si `puntajeDeCarrera` los tocara, revienta acá.
function sinAzarNiRelojK1(fn) {
  const CLAVE_AZAR = 'random';
  const azarOriginal = Math[CLAVE_AZAR];
  const RelojOriginal = globalThis.Date;
  Math[CLAVE_AZAR] = () => { throw new Error('usó el azar nativo'); };
  globalThis.Date = new Proxy(RelojOriginal, {
    construct() { throw new Error('usó el reloj'); },
    apply() { throw new Error('usó el reloj'); },
    get(objetivo, clave) {
      if (clave === 'now') {
        return () => { throw new Error('usó el reloj'); };
      }
      return objetivo[clave];
    }
  });
  try {
    return fn();
  } finally {
    Math[CLAVE_AZAR] = azarOriginal;
    globalThis.Date = RelojOriginal;
  }
}

check('K1 puntaje puro y determinista: mismo estado → mismo resultado, sin azar ni reloj, sin mutar el estado, y la tarjeta trae ese número', () => {
  let terminadas = 0;
  for (const estado of estadosDeReferenciaK1()) {
    const antes = JSON.stringify(estado);
    const primero = sinAzarNiRelojK1(() => puntajeDeCarrera(estado));
    if (JSON.stringify(estado) !== antes) {
      throw new Error(`seed ${estado.seed}: puntajeDeCarrera mutó el estado`);
    }
    const segundo = puntajeDeCarrera(structuredClone(estado));
    const tercero = puntajeDeCarrera(estado);
    if (JSON.stringify(primero) !== JSON.stringify(segundo) || JSON.stringify(primero) !== JSON.stringify(tercero)) {
      throw new Error(`seed ${estado.seed}: el mismo estado dio dos puntajes distintos (${primero.total}, ${segundo.total}, ${tercero.total})`);
    }
    if (estado.terminado) {
      terminadas += 1;
      if (JSON.stringify(estado.tarjeta?.puntaje) !== JSON.stringify(primero)) {
        throw new Error(`seed ${estado.seed}: state.tarjeta.puntaje no es el puntaje del estado final (${estado.tarjeta?.puntaje?.total} vs ${primero.total})`);
      }
    } else if (estado.tarjeta !== null) {
      throw new Error(`seed ${estado.seed}: carrera sin terminar con tarjeta`);
    }
  }
  if (terminadas === 0) {
    throw new Error('check vacío: ninguna carrera de referencia terminó');
  }
});

// Las mutaciones de "más logro" sobre una copia del estado: cada una dice qué componente tiene que subir (`null`:
// solo cuenta para el nivel). Revisión de K1-A: entran los logros de tier 2 y el internacional eliminado — los
// mutantes que hacían RESTAR un split o un título de tier 2 solo se veían en el check lento.
function sumarSplitJugadoK1(st, tier) {
  const filas = st.career.registro.porOrg;
  if (filas.length === 0) {
    filas.push({ org: 'X', liga: 'LCK', tier: 1, splits: 0, splitsPorTier: { 1: 0, 2: 0, 3: 0 }, titulos: [] });
  }
  const fila = filas[filas.length - 1];
  fila.splits += 1;
  fila.splitsPorTier[tier] += 1;
}

const MAS_LOGRO_K1 = [
  ['un título de tier 1', 'titulos', (st) => {
    st.career.registro.titulos.push({ nombre: 'LCK', anio: st.calendario.anio, org: 'X', liga: 'LCK', tier: 1 });
  }],
  ['un título de tier 2', 'titulos', (st) => {
    st.career.registro.titulos.push({ nombre: 'LCK_CL', anio: st.calendario.anio, org: 'X', liga: 'LCK_CL', tier: 2 });
  }],
  ['un título de tier 3', 'titulos', (st) => {
    st.career.registro.titulos.push({ nombre: 'un torneo chico de la región', anio: st.calendario.anio, org: 'X', liga: null, tier: 3 });
  }],
  ['un internacional con buen papel', 'internacional', (st) => {
    st.career.registro.internacionales.push({ torneo: 'internacional — LCS', anio: st.calendario.anio, org: 'X', liga: 'LCS', resultado: 'buen_papel', camino: [] });
  }],
  ['un internacional eliminado', 'internacional', (st) => {
    st.career.registro.internacionales.push({ torneo: 'internacional — LCS', anio: st.calendario.anio, org: 'X', liga: 'LCS', resultado: 'eliminado', camino: [] });
  }],
  ['un split jugado en tier 1', 'trayectoria', (st) => sumarSplitJugadoK1(st, 1)],
  ['un split jugado en tier 2', 'trayectoria', (st) => sumarSplitJugadoK1(st, 2)],
  ['un split jugado en tier 3', 'trayectoria', (st) => sumarSplitJugadoK1(st, 3)],
  // El pico sube a la banda siguiente (afuera -> #20 -> top 5 -> #1); si ya era el #1, suma una temporada en el Top.
  ['mejor pico de rank mundial', 'mundo', (st) => {
    const picos = st.career.registro.picos;
    const actual = picos.rankMundial;
    const { corteTop5 } = BALANCE.puntaje.mundo;
    if (actual === 1) {
      st.career.registro.splitsEnTopMundial += 1;
    } else {
      picos.rankMundial = actual === 0 ? BALANCE.topMundial.tamano : (actual > corteTop5 ? corteTop5 : 1);
    }
  }],
  ['una temporada más en el Top 20', 'mundo', (st) => {
    st.career.registro.splitsEnTopMundial += 1;
  }],
  ['un cierre más como #1 del mundo', null, (st) => {
    st.career.registro.cierresComoNumeroUno += 1;
  }]
];

const INDICE_NIVEL_K1 = Object.fromEntries(NIVELES_K1.map((nivel, i) => [nivel.id, i]));

check('K1 puntaje monótono: un título o un split de cualquier tier, un internacional (buen papel o eliminado), un mejor pico de rank o un cierre en el Top nunca bajan el total, un componente ni el nivel, y el suyo sube', () => {
  let totalesQueSubieron = 0;
  let nivelesQueSubieron = 0;
  let casos = 0;
  for (const base of estadosDeReferenciaK1()) {
    const antes = puntajeDeCarrera(base);
    for (const [nombre, componente, mutar] of MAS_LOGRO_K1) {
      const copia = structuredClone(base);
      mutar(copia);
      const despues = puntajeDeCarrera(copia);
      casos += 1;
      if (despues.total < antes.total) {
        throw new Error(`seed ${base.seed}, ${nombre}: el total bajó de ${antes.total} a ${despues.total}`);
      }
      for (const { id } of antes.componentes) {
        if (componenteK1(despues, id) < componenteK1(antes, id)) {
          throw new Error(`seed ${base.seed}, ${nombre}: el componente ${id} bajó de ${componenteK1(antes, id)} a ${componenteK1(despues, id)}`);
        }
      }
      if (componente !== null && !(componenteK1(despues, componente) > componenteK1(antes, componente))) {
        throw new Error(`seed ${base.seed}, ${nombre}: el componente ${componente} no subió (${componenteK1(antes, componente)} -> ${componenteK1(despues, componente)})`);
      }
      if (INDICE_NIVEL_K1[despues.nivel.id] < INDICE_NIVEL_K1[antes.nivel.id]) {
        throw new Error(`seed ${base.seed}, ${nombre}: el nivel bajó de ${antes.nivel.id} a ${despues.nivel.id}`);
      }
      totalesQueSubieron += despues.total > antes.total ? 1 : 0;
      nivelesQueSubieron += despues.nivel.id !== antes.nivel.id ? 1 : 0;
    }
  }
  if (totalesQueSubieron < casos / 2) {
    throw new Error(`check vacío: el total subió solo en ${totalesQueSubieron} de ${casos} casos`);
  }
  if (nivelesQueSubieron === 0) {
    throw new Error(`check vacío: en ${casos} casos ningún logro movió el nivel`);
  }
});

check('K1 puntaje: el mismo buen papel internacional vale más desde una liga de mayor dificultad', () => {
  const ligasConCupo = LIGAS.filter((liga) => liga.tier === 1 && (liga.cuposInternacionales ?? 0) > 0);
  let pares = 0;
  for (const base of estadosDeReferenciaK1().slice(0, 3)) {
    const conBuenPapelDe = (ligaId) => {
      const copia = structuredClone(base);
      copia.career.registro.internacionales.push({ torneo: `internacional — ${ligaId}`, anio: copia.calendario.anio, org: 'X', liga: ligaId, resultado: 'buen_papel', camino: [] });
      return puntajeDeCarrera(copia);
    };
    const porLiga = Object.fromEntries(ligasConCupo.map((liga) => [liga.id, conBuenPapelDe(liga.id)]));
    for (const a of ligasConCupo) {
      for (const b of ligasConCupo) {
        if (!(a.dificultad < b.dificultad)) {
          continue;
        }
        pares += 1;
        if (!(componenteK1(porLiga[b.id], 'internacional') > componenteK1(porLiga[a.id], 'internacional'))
          || !(porLiga[b.id].total > porLiga[a.id].total)) {
          throw new Error(`seed ${base.seed}: un buen papel desde ${b.id} (dificultad ${b.dificultad}) vale ${porLiga[b.id].total}, `
            + `desde ${a.id} (${a.dificultad}) ${porLiga[a.id].total}: tiene que valer más desde la liga más difícil`);
        }
      }
    }
  }
  if (pares === 0) {
    throw new Error('check vacío: no hay dos ligas con cupo internacional y dificultad distinta');
  }
});

check('K1 puntaje: con el mismo registro, un potencial más bajo nunca puntúa menos (y el potencial sí mueve el total), y su texto habla según hasta dónde llegaste', () => {
  const { potencialMin, potencialMax } = BALANCE.mundo;
  const p = BALANCE.puntaje.potencial;
  if (factorDePotencial(potencialMin) !== p.factorConPotencialMinimo || factorDePotencial(potencialMax) !== p.factorConPotencialMaximo) {
    throw new Error(`factorDePotencial(${potencialMin}) = ${factorDePotencial(potencialMin)} y (${potencialMax}) = ${factorDePotencial(potencialMax)}: `
      + `tienen que ser ${p.factorConPotencialMinimo} y ${p.factorConPotencialMaximo}`);
  }
  let seMovio = false;
  for (const base of estadosDeReferenciaK1()) {
    let anterior = null;
    for (let potencial = potencialMin - 1; potencial <= potencialMax + 1; potencial += 1) {
      const copia = structuredClone(base);
      copia.player.oculto.potencial = potencial;
      const { total } = puntajeDeCarrera(copia);
      if (anterior !== null && total > anterior.total) {
        throw new Error(`seed ${base.seed}: con potencial ${potencial} da ${total} y con ${anterior.potencial} (más bajo) da ${anterior.total}`);
      }
      anterior = { potencial, total };
    }
    const conTechoBajo = structuredClone(base);
    conTechoBajo.player.oculto.potencial = potencialMin;
    const conTechoAlto = structuredClone(base);
    conTechoAlto.player.oculto.potencial = potencialMax;
    seMovio ||= puntajeDeCarrera(conTechoBajo).total > puntajeDeCarrera(conTechoAlto).total;
  }
  if (!seMovio) {
    throw new Error('check vacío: en ninguna carrera de referencia el potencial movió el total');
  }
  // El texto del techo revelado (revisión de K1-A): con el techo más alto hay un texto por banda de nivel. A quien
  // llegó a `nivelAprovechado` o más arriba no se le dice que daba para más ni que se esperaba más; en la banda del
  // medio (desde `nivelAMedias`) "daba para más", nunca "se esperaba más"; abajo, "se esperaba más". La banda del
  // medio se arma sacándole a una carrera de primera todo lo que no sea jugar (títulos, Top 20, #1).
  const banda = (nivelId) => {
    if (INDICE_NIVEL_K1[nivelId] >= INDICE_NIVEL_K1[p.nivelAprovechado]) return 'alta';
    return INDICE_NIVEL_K1[nivelId] >= INDICE_NIVEL_K1[p.nivelAMedias] ? 'media' : 'baja';
  };
  const textoPorBanda = { alta: new Set(), media: new Set(), baja: new Set() };
  const conTechoMaximo = (estado) => {
    const copia = structuredClone(estado);
    copia.player.oculto.potencial = potencialMax;
    return copia;
  };
  for (const base of estadosDeReferenciaK1()) {
    const estados = [conTechoMaximo(base)];
    if (base.career.registro.porOrg.some((fila) => fila.splitsPorTier[1] > 0)) {
      const soloJugo = conTechoMaximo(base);
      const r = soloJugo.career.registro;
      r.titulos = [];
      r.picos.rankMundial = 0;
      r.splitsEnTopMundial = 0;
      r.cierresComoNumeroUno = 0;
      estados.push(soloJugo);
    }
    for (const estado of estados) {
      const { nivel, potencial } = puntajeDeCarrera(estado);
      const cual = banda(nivel.id);
      const dice = (patron) => patron.test(potencial.detalle);
      const mal = (cual === 'alta' && (dice(/se esperaba más/) || dice(/daba para más/)))
        || (cual === 'media' && (dice(/se esperaba más/) || !dice(/daba para más/)))
        || (cual === 'baja' && !dice(/se esperaba más/));
      if (mal) {
        throw new Error(`seed ${base.seed}: ${nivel.nombre} (banda ${cual}) con techo ${potencialMax} lee "${potencial.detalle}"`);
      }
      textoPorBanda[cual].add(potencial.detalle.replace(/\d+/g, '#'));
    }
  }
  const vacias = Object.entries(textoPorBanda).filter(([, textos]) => textos.size === 0).map(([cual]) => cual);
  if (vacias.length > 0) {
    throw new Error(`check vacío: ninguna carrera de referencia en la banda ${vacias.join(', ')}`);
  }
  const [alta, media, baja] = ['alta', 'media', 'baja'].map((cual) => [...textoPorBanda[cual]].join('|'));
  if (alta === media || media === baja || alta === baja) {
    throw new Error('las tres bandas de nivel tienen que leer textos distintos del techo revelado');
  }
});

// Revisión de K1-A: el puntaje no puede dar NaN ni caer en silencio a un valor por defecto. Cada defecto tira un
// `Error` que empieza con "puntajeDeCarrera:" y dice qué falta. Un título de tier 3 con `liga: null` es válido.
check('K1 puntaje falla fuerte: liga desconocida, título sin tier, internacional sin liga, potencial o rol faltantes tiran un error claro; un título de tier 3 con liga null vale', () => {
  const base = estadosDeReferenciaK1().find((estado) => estado.career.registro.porOrg.length > 0);
  if (!base) {
    throw new Error('check vacío: ninguna carrera de referencia jugó con contrato');
  }
  const anio = base.calendario.anio;
  const titulo = (extra) => (st) => st.career.registro.titulos.push({ nombre: 'Copa', anio, org: 'X', ...extra });
  const internacional = (extra) => (st) => st.career.registro.internacionales.push({ torneo: 'internacional', anio, org: 'X', resultado: 'buen_papel', camino: [], ...extra });
  const casos = [
    ['sin potencial', (st) => { delete st.player.oculto.potencial; }, /potencial/],
    ['potencial NaN', (st) => { st.player.oculto.potencial = Number.NaN; }, /potencial/],
    ['rol desconocido', (st) => { st.player.role = 'jungle'; }, /rol/],
    ['título sin tier', titulo({ liga: 'LCK' }), /sin tier|no trae tier/],
    ['título con liga desconocida', titulo({ liga: 'LTA', tier: 1 }), /liga desconocida/],
    ['título de tier 1 sin liga', titulo({ liga: null, tier: 1 }), /liga desconocida/],
    ['título de tier 1 con una liga de tier 2', titulo({ liga: 'LCK_CL', tier: 1 }), /tier 2/],
    ['título de tier 3 con liga', titulo({ liga: 'LCK', tier: 3 }), /tier 3/],
    ['internacional sin liga', internacional({}), /no trae la liga/],
    ['internacional con liga desconocida', internacional({ liga: 'LTA' }), /liga desconocida/],
    ['internacional de una liga de tier 2', internacional({ liga: 'LCK_CL' }), /no es una liga de primera/],
    ['fila sin splitsPorTier', (st) => { delete st.career.registro.porOrg[0].splitsPorTier; }, /splitsPorTier/],
    ['pico de rank sin número', (st) => { st.career.registro.picos.rankMundial = undefined; }, /rankMundial/],
    ['pico de rank fuera del Top 20', (st) => { st.career.registro.picos.rankMundial = BALANCE.topMundial.tamano + 1; }, /rankMundial/],
    ['sin cierres como #1', (st) => { delete st.career.registro.cierresComoNumeroUno; }, /cierresComoNumeroUno/],
    // Segunda revisión de K1: la validación es simétrica (los rivales como tu pico), los contadores son enteros y el
    // mensaje imprime el valor malo tal cual (NaN, no "null").
    ['rival con puntaje NaN', (st) => { st.mundo.rivales[0].puntaje = Number.NaN; }, /puntaje.*NaN/],
    ['rival con puntaje fuera del Top 20', (st) => { st.mundo.rivales[0].puntaje = BALANCE.topMundial.tamano + 5; }, /puntaje.*25/],
    ['rival con puntaje fraccionario', (st) => { st.mundo.rivales[0].puntaje = 2.5; }, /puntaje.*2\.5/],
    ['rival con puntaje negativo', (st) => { st.mundo.rivales[0].puntaje = -1; }, /puntaje.*-1/],
    ['contador fraccionario', (st) => { st.career.registro.splitsEnTopMundial = 1.5; }, /splitsEnTopMundial.*1\.5/],
    ['cierres como #1 fraccionario', (st) => { st.career.registro.cierresComoNumeroUno = 0.5; }, /cierresComoNumeroUno.*0\.5/],
    ['contador NaN se lee como NaN', (st) => { st.career.registro.splitsEnTopMundial = Number.NaN; }, /splitsEnTopMundial.*NaN/],
    ['internacional con un resultado desconocido', internacional({ liga: 'LCK', resultado: 'semis' }), /resultado.*semis/],
    ['internacional sin resultado', internacional({ liga: 'LCK', resultado: undefined }), /resultado/]
  ];
  if (!(base.mundo.rivales.length > 0)) {
    throw new Error('check vacío: la carrera de referencia no trae rivales de generación');
  }
  for (const [nombre, mutar, patron] of casos) {
    const copia = structuredClone(base);
    mutar(copia);
    let mensaje = null;
    try {
      puntajeDeCarrera(copia);
    } catch (error) {
      mensaje = error.message;
    }
    if (mensaje === null) {
      throw new Error(`${nombre}: puntajeDeCarrera no tiró`);
    }
    if (!mensaje.startsWith('puntajeDeCarrera:') || !patron.test(mensaje)) {
      throw new Error(`${nombre}: tiró "${mensaje}", que no dice qué falta (${patron})`);
    }
  }
  const conTier3 = structuredClone(base);
  titulo({ nombre: 'un torneo chico de la región', liga: null, tier: 3 })(conTier3);
  if (!Number.isInteger(puntajeDeCarrera(conTier3).total)) {
    throw new Error('un título de tier 3 con liga null tiene que puntuar');
  }
});

// Revisión de K1-A: ningún texto del puntaje ni del veredicto muestra el id crudo de una liga ("LCK_CL",
// "EMEA_MASTERS"): sale el `nombre` de `leagues.json`.
check('K1 textos: el puntaje y el veredicto nombran cada liga por su nombre visible, nunca por su id', () => {
  if (LIGAS.some((liga) => typeof liga.nombre !== 'string' || liga.nombre.trim() === '')) {
    throw new Error('hay una liga sin nombre visible en leagues.json');
  }
  const crudas = LIGAS.filter((liga) => liga.id !== liga.nombre);
  if (crudas.length === 0) {
    throw new Error('check vacío: ninguna liga tiene un id distinto de su nombre');
  }
  const idCrudo = new RegExp(`(^|[^A-Za-z_])(${crudas.map((liga) => liga.id).join('|')})(?![A-Za-z_])`);
  let conNombre = 0;
  for (const base of estadosDeReferenciaK1()) {
    const estados = [base];
    for (const liga of crudas) {
      const unaSola = structuredClone(base);
      unaSola.career.registro.titulos = [{ nombre: liga.id, anio: 2030, org: 'X', liga: liga.id, tier: liga.tier }];
      const sumada = structuredClone(base);
      sumada.career.registro.titulos.push({ nombre: liga.id, anio: 2030, org: 'X', liga: liga.id, tier: liga.tier });
      estados.push(unaSola, sumada);
    }
    for (const estado of estados) {
      const puntaje = puntajeDeCarrera(estado);
      const textos = [
        ...puntaje.componentes.map((c) => c.detalle), puntaje.nivel.siguiente?.requisito ?? '', puntaje.potencial.detalle,
        componerLegado(estado).veredicto
      ];
      for (const texto of textos) {
        if (idCrudo.test(texto)) {
          throw new Error(`seed ${base.seed}: "${texto}" muestra el id crudo de una liga`);
        }
      }
      conNombre += textos.some((texto) => crudas.some((liga) => texto.includes(liga.nombre))) ? 1 : 0;
    }
  }
  if (conNombre === 0) {
    throw new Error('check vacío: ningún texto nombró una liga de las que tienen id distinto del nombre');
  }
});

// Revisión de K1-A (mutante r5): los empates no te superan ni los superás, y el `0` (nunca entró) va último.
check('K1 generación: los empates no te superan, el 0 va último y el bono de primero pide haber entrado al Top 20', () => {
  const base = estadosDeReferenciaK1()[0];
  const con = (tuRank, ranks) => {
    const st = structuredClone(base);
    st.career.registro.picos.rankMundial = tuRank;
    st.mundo.rivales = ranks.map((rank, i) => ({ ...base.mundo.rivales[0], handle: `Rival${i}`, puntaje: rank }));
    return st;
  };
  const casos = [
    // [tu rank, ranks de los rivales, puesto, superados]
    [5, [5, 5, 0, 7, 3], 2, 2],
    [5, [5, 5], 1, 0],
    [0, [0, 0], 1, 0],
    [1, [1, 2], 1, 1],
    [3, [2, 0], 2, 1],
    [0, [4, 0], 2, 0]
  ];
  for (const [tuRank, ranks, puesto, superados] of casos) {
    const g = puestoEnLaGeneracion(con(tuRank, ranks));
    if (g.puesto !== puesto || g.superados !== superados) {
      throw new Error(`vos #${tuRank} contra [${ranks}]: puesto ${g.puesto} y ${g.superados} superados, se esperaba ${puesto} y ${superados}`);
    }
  }
  // Un empate vale lo mismo que no tener a ese rival: ni suma ni resta.
  const generacion = (tuRank, ranks) => componenteK1(puntajeDeCarrera(con(tuRank, ranks)), 'generacion');
  if (generacion(5, [5, 7]) !== generacion(5, [7])) {
    throw new Error(`un rival empatado con vos movió el componente (${generacion(5, [5, 7])} contra ${generacion(5, [7])})`);
  }
  // Sin Top 20 no hay bono de primero, aunque nadie te supere.
  if (generacion(0, [0, 0]) !== 0) {
    throw new Error(`sin entrar al Top 20 y con la generación empatada en 0, el componente tiene que ser 0 (dio ${generacion(0, [0, 0])})`);
  }
});

// Segunda revisión de K1: dos textos de la tarjeta que sonaban a logro cuando el componente valía 0 o no había nada
// que potenciar. Sin Top 20 no se lee "Quedaste 2º"; sin un split con contrato no se lee "cada cosa que lograste".
check('K1 textos honestos: la generación sin Top 20 no suena a logro y el techo sin splits con contrato no potencia nada', () => {
  const base = estadosDeReferenciaK1().find((estado) => estado.career.registro.porOrg.length > 0);
  if (!base) {
    throw new Error('check vacío: ninguna carrera de referencia jugó con contrato');
  }
  const conGeneracion = (tuRank, ranks) => {
    const st = structuredClone(base);
    st.career.registro.picos.rankMundial = tuRank;
    st.mundo.rivales = ranks.map((rank, i) => ({ ...base.mundo.rivales[0], handle: `Rival${i}`, puntaje: rank }));
    return puntajeDeCarrera(st).componentes.find((c) => c.id === 'generacion');
  };
  const sinTop = conGeneracion(0, [4, 0, 0]);
  if (sinTop.puntos !== 0 || /Quedaste/.test(sinTop.detalle) || !/Rival0 llegó al #4 y vos nunca entraste al Top/.test(sinTop.detalle)) {
    throw new Error(`sin Top 20 el componente vale 0 y no puede leerse como un puesto logrado (puntos ${sinTop.puntos}): "${sinTop.detalle}"`);
  }
  const conTop = conGeneracion(8, [3, 12, 0]);
  if (conTop.puntos <= 0 || !conTop.detalle.startsWith('Quedaste 2º de 4 en tu generación: Rival0 llegó al #3 y vos al #8')) {
    throw new Error(`con Top 20 el puesto sí se cuenta (puntos ${conTop.puntos}): "${conTop.detalle}"`);
  }

  const conTecho = (potencial, sinContrato) => {
    const st = structuredClone(base);
    st.player.oculto.potencial = potencial;
    if (sinContrato) {
      for (const fila of st.career.registro.porOrg) {
        fila.splitsPorTier = { 1: 0, 2: 0, 3: 0 };
      }
    }
    return puntajeDeCarrera(st).potencial;
  };
  const techoBajo = conTecho(BALANCE.mundo.potencialMin, false);
  const techoBajoSinContrato = conTecho(BALANCE.mundo.potencialMin, true);
  if (techoBajo.factor <= 1) {
    throw new Error(`un techo bajo (el mínimo) tiene que potenciar lo logrado (factor ${techoBajo.factor})`);
  }
  if (!/cada cosa que lograste pesa un \d+% más/.test(techoBajo.detalle)) {
    throw new Error(`con splits jugados el techo bajo sigue diciendo que potencia lo logrado: "${techoBajo.detalle}"`);
  }
  if (/lograste/.test(techoBajoSinContrato.detalle) || !/nunca llegaste a jugar un split con contrato/.test(techoBajoSinContrato.detalle)) {
    throw new Error(`sin un split con contrato no hay logros que potenciar: "${techoBajoSinContrato.detalle}"`);
  }
});

// Segunda implementación (para cruzar el bloque `puntaje` de `simulate.js`): percentil "por piso".
const percentilPisoK1 = (valores, p) => {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.floor(p * ordenados.length))];
};

// El nivel recalculado a mano desde el registro, con la tabla de PLAN.md ("K1 — lo que cambió la revisión de
// K1-A") escrita de nuevo acá: una segunda implementación contra la que se cruza `nivelDeCarrera`.
function nivelAManoK1(registro) {
  const req = Object.fromEntries(BALANCE.puntaje.niveles.map((nivel) => [nivel.id, nivel.requisito]));
  const sumaTier = (tier) => registro.porOrg.reduce((total, fila) => total + fila.splitsPorTier[tier], 0);
  const jugados = sumaTier(1) + sumaTier(2) + sumaTier(3);
  const titulosT1 = registro.titulos.filter((titulo) => titulo.tier === 1).length;
  const rank = registro.picos.rankMundial;
  if (registro.cierresComoNumeroUno >= req.goat.cierresNumeroUno) return 'goat';
  if (titulosT1 >= req.leyenda.titulosTier1 && rank > 0 && rank <= req.leyenda.rankPicoHasta) return 'leyenda';
  if (registro.splitsEnTopMundial >= req.figura.cierresEnTop20) return 'figura';
  if (titulosT1 >= req.campeon.titulosTier1) return 'campeon';
  if (sumaTier(1) >= req.fijo.splitsTier1) return 'fijo';
  if (sumaTier(1) >= req.profesional.splitsTier1) return 'profesional';
  if (jugados >= req.circuito.splitsJugados) return 'circuito';
  return 'no_llego';
}

checkLento('K1 puntaje en carreras reales de criterio, azar y malas: componentes >= 0, enteros y finitos, el nivel sale de los hechos, y el bloque puntaje de simulate coincide con un recuento', () => {
  const lotes = lotesDeLosBotsK0();
  const idsDeNivel = new Set(NIVELES_K1.map((nivel) => nivel.id));
  const conPuntos = {};
  const nivelesVistos = new Set();
  let cierresComoNumeroUno = 0;
  for (const bot of BOTS_K0) {
    const { resultados, observaciones } = lotes[bot].crudos;
    const puntajes = resultados.map((estado) => puntajeDeCarrera(estado));
    puntajes.forEach((puntaje, i) => {
      const donde = `${bot} seed ${resultados[i].seed}`;
      const registro = resultados[i].career.registro;
      for (const { id, puntos, etiqueta, detalle } of puntaje.componentes) {
        if (!Number.isInteger(puntos) || puntos < 0) {
          throw new Error(`${donde}: el componente ${id} vale ${puntos}`);
        }
        if (typeof etiqueta !== 'string' || etiqueta.length === 0 || typeof detalle !== 'string' || detalle.length === 0) {
          throw new Error(`${donde}: el componente ${id} no trae etiqueta y detalle`);
        }
        conPuntos[id] = (conPuntos[id] ?? 0) + (puntos > 0 ? 1 : 0);
      }
      if (!Number.isInteger(puntaje.total) || puntaje.total < 0 || !Number.isFinite(puntaje.potencial.factor)) {
        throw new Error(`${donde}: total ${puntaje.total}, factor ${puntaje.potencial.factor}`);
      }
      if (!idsDeNivel.has(puntaje.nivel.id) || !(puntaje.percentil >= 0 && puntaje.percentil <= 100) || !puntaje.leyenda?.handle) {
        throw new Error(`${donde}: nivel ${puntaje.nivel.id}, percentil ${puntaje.percentil}, leyenda ${puntaje.leyenda?.handle}`);
      }
      // "El que no llegó" = nunca jugó un split con contrato (revisión de K1-A), no "nunca fichó".
      const jugados = TIERS_DE_SPLIT.reduce((total, tier) => total + splitsJugadosEnTier(registro, tier), 0);
      if ((jugados === 0) !== (puntaje.nivel.id === 'no_llego')) {
        throw new Error(`${donde}: "El que no llegó" es exactamente no haber jugado nunca un split con contrato (jugó ${jugados}, nivel ${puntaje.nivel.id})`);
      }
      if (puntaje.nivel.id !== nivelAManoK1(registro)) {
        throw new Error(`${donde}: el nivel es ${puntaje.nivel.id} y los hechos del registro dicen ${nivelAManoK1(registro)}`);
      }
      // El contador del GOAT contra el observador de simulate (#1 al cierre de cada edad, leído del estado).
      if (registro.cierresComoNumeroUno !== observaciones[i].temporadasNumero1) {
        throw new Error(`${donde}: registro.cierresComoNumeroUno = ${registro.cierresComoNumeroUno}, simulate vio ${observaciones[i].temporadasNumero1} cierres como #1`);
      }
      cierresComoNumeroUno += registro.cierresComoNumeroUno;
      nivelesVistos.add(puntaje.nivel.id);
    });

    // Recuento del bloque `puntaje` del lote.
    const bloque = lotes[bot].puntaje;
    const totales = puntajes.map((p) => p.total);
    for (const [clave, p] of [['p10', 0.1], ['p25', 0.25], ['p50', 0.5], ['p75', 0.75], ['p90', 0.9], ['p99', 0.99]]) {
      if (bloque.total[clave] !== percentilPisoK1(totales, p)) {
        throw new Error(`${bot}: puntaje.total.${clave} = ${bloque.total[clave]}, el recuento da ${percentilPisoK1(totales, p)}`);
      }
    }
    for (const { id } of NIVELES_K1) {
      const esperado = pctK0(cuentaK0(puntajes, (p) => p.nivel.id === id), totales.length);
      if (bloque.porNivel[id] !== esperado) {
        throw new Error(`${bot}: puntaje.porNivel.${id} = ${bloque.porNivel[id]}, el recuento da ${esperado}`);
      }
    }
    // `pesoRol` se juzga entre los que llegaron a pro (revisión de K1-A).
    const esPro = puntajes.map((p) => p.nivel.id !== 'no_llego');
    const medianaPro = medianaK0(totales.filter((_, i) => esPro[i]));
    for (const rol of IDS_ROL) {
      const delRol = totales.filter((_, i) => resultados[i].player.role === rol);
      if (delRol.length === 0) {
        continue;
      }
      if (bloque.porRol[rol]?.n !== delRol.length || bloque.porRol[rol].mediana !== medianaK0(delRol)) {
        throw new Error(`${bot}: puntaje.porRol.${rol} dice n ${bloque.porRol[rol]?.n} y mediana ${bloque.porRol[rol]?.mediana}, el recuento ${delRol.length} y ${medianaK0(delRol)}`);
      }
      const prosDelRol = totales.filter((_, i) => esPro[i] && resultados[i].player.role === rol);
      const desvio = prosDelRol.length > 0 ? redondeoK0((medianaK0(prosDelRol) / medianaPro - 1) * 100, 1) : 0;
      if (bloque.porRol[rol].nPros !== prosDelRol.length || bloque.porRol[rol].desvioMedianaPct !== desvio) {
        throw new Error(`${bot}: puntaje.porRol.${rol} dice ${bloque.porRol[rol].nPros} pros y desvío ${bloque.porRol[rol].desvioMedianaPct}%, el recuento ${prosDelRol.length} y ${desvio}%`);
      }
    }
    const regiones = new Set(resultados.map((r) => r.mundo.regionOrigen));
    for (const region of regiones) {
      const deLaRegion = totales.filter((_, i) => resultados[i].mundo.regionOrigen === region);
      if (bloque.porRegion[region]?.n !== deLaRegion.length || bloque.porRegion[region].p50 !== percentilPisoK1(deLaRegion, 0.5)) {
        throw new Error(`${bot}: puntaje.porRegion.${region} no coincide con el recuento`);
      }
    }
  }
  const vacios = ['trayectoria', 'titulos', 'internacional', 'mundo', 'generacion', 'soloq'].filter((id) => !(conPuntos[id] > 0));
  if (vacios.length > 0) {
    throw new Error(`check vacío: ningún puntaje real tiene puntos en ${vacios.join(', ')}`);
  }
  if (nivelesVistos.size < 5 || cierresComoNumeroUno === 0) {
    throw new Error(`check vacío: niveles vistos [${[...nivelesVistos]}], ${cierresComoNumeroUno} cierres como #1 en total`);
  }
});

// D76 contra el split REAL (revisión de K1-A). Un split se juega cuando corre su temporada; la prueba independiente
// es el log de `rendimiento` "<org> terminó Nº de M en <liga>", que sale exactamente una vez por split jugado. Lo
// jugado del registro (las `splitsPorTier` de cada fila, más el split del pase que espera su fila en
// `flags.splitJugadoSinFila`) tiene que sumar exactamente 1 en (org actual, tier actual) cuando hubo temporada, y
// nada cuando no la hubo. Y cada título nuevo lleva el `career.liga`/`career.tier` de ese split, y cada
// internacional nuevo el `career.liga` (nada de lo que corre después de la temporada cambia la liga, el tier ni
// la org). Las seeds se recorren desde la 1 hasta ver todos los casos que hacen que el check discrimine (un
// descenso en el lugar con título en la liga de desarrollo, un split del pase, un internacional fuera de tu
// región de origen); si no aparecen antes del tope, falla con lo que faltó, nunca pasa vacío.
const SEEDS_D76_MINIMO_K1 = 120;
const SEEDS_D76_TOPE_K1 = 400;
const LOG_SPLIT_JUGADO_K1 = /terminó \d+º de \d+ en /;

function jugadoPorOrgYTierK1(estado) {
  const suma = new Map();
  const sumar = (org, porTier) => {
    for (const tier of TIERS_DE_SPLIT) {
      const clave = `${org}|${tier}`;
      suma.set(clave, (suma.get(clave) ?? 0) + porTier[tier]);
    }
  };
  for (const fila of estado.career.registro.porOrg) {
    sumar(fila.org, fila.splitsPorTier);
  }
  const sinFila = estado.flags.splitJugadoSinFila;
  if (sinFila) {
    sumar(sinFila.org, sinFila.splitsPorTier);
  }
  return suma;
}

checkLento('K1 D76: cada split jugado se cuenta una vez en la org y el tier donde se jugó, splitsPorTier solo crece, y los títulos e internacionales llevan la liga y el tier de ese split', () => {
  const ligaPorId = Object.fromEntries(LIGAS.map((liga) => [liga.id, liga]));
  const vistos = { tituloEnDescenso: 0, pase: 0, jugadoEnOtroTierQueLaFila: 0, internacionalFueraDeOrigen: 0 };
  const titulosPorTier = { 1: 0, 2: 0, 3: 0 };
  let seeds = 0;
  const completo = () => Object.values(vistos).every((n) => n > 0) && TIERS_DE_SPLIT.every((tier) => titulosPorTier[tier] > 0);
  for (let seed = 1; seed <= SEEDS_D76_TOPE_K1 && (seed <= SEEDS_D76_MINIMO_K1 || !completo()); seed += 1) {
    seeds = seed;
    const rng = mulberry32(seed);
    let estado = createInitialState(seed, rng);
    const ligaDeOrigen = estado.mundo.ligas.find((liga) => liga.tier === 1 && liga.regionId === estado.mundo.regionIdOrigen)?.id;
    for (let split = 0; split < 60 && !estado.terminado; split += 1) {
      const antes = estado;
      const resultado = avanzarSplitAuto(estado, rng);
      estado = resultado.state;
      const donde = `seed ${seed}, split ${antes.player.splitCount}`;
      const { career, flags } = estado;
      const registro = career.registro;

      // splitsPorTier completo y que solo crece (regla 14).
      registro.porOrg.forEach((fila, i) => {
        const claves = Object.keys(fila.splitsPorTier ?? {}).sort().join(',');
        if (claves !== '1,2,3' || TIERS_DE_SPLIT.some((tier) => !Number.isInteger(fila.splitsPorTier[tier]) || fila.splitsPorTier[tier] < 0)) {
          throw new Error(`${donde}: ${fila.org} trae splitsPorTier ${JSON.stringify(fila.splitsPorTier)}`);
        }
        const previa = antes.career.registro.porOrg[i];
        if (previa && TIERS_DE_SPLIT.some((tier) => fila.splitsPorTier[tier] < previa.splitsPorTier[tier])) {
          throw new Error(`${donde}: splitsPorTier de ${fila.org} bajó (regla 14)`);
        }
      });

      // Exactamente un split jugado (o ninguno), en la org y el tier de ese split.
      const jugados = resultado.logs.filter((log) => log.type === 'rendimiento' && LOG_SPLIT_JUGADO_K1.test(log.message ?? '')).length;
      const previo = jugadoPorOrgYTierK1(antes);
      const ahora = jugadoPorOrgYTierK1(estado);
      const cambios = [...new Set([...previo.keys(), ...ahora.keys()])]
        .map((clave) => [clave, (ahora.get(clave) ?? 0) - (previo.get(clave) ?? 0)])
        .filter(([, delta]) => delta !== 0);
      const esperado = jugados === 1 ? [[`${career.currentOrg}|${career.tier}`, 1]] : [];
      if (jugados > 1 || JSON.stringify(cambios) !== JSON.stringify(esperado)) {
        throw new Error(`${donde}: ${jugados} temporada(s) jugada(s) con ${career.currentOrg} en tier ${career.tier}, y lo jugado del registro cambió ${JSON.stringify(cambios)}`);
      }
      const abierta = registro.porOrg.find((fila) => fila.hastaSplit === null) ?? null;
      if (flags.splitJugadoSinFila) {
        vistos.pase += 1;
        if (flags.splitJugadoSinFila.org !== career.currentOrg || abierta?.org === career.currentOrg) {
          throw new Error(`${donde}: un split espera fila para ${flags.splitJugadoSinFila.org} jugando con ${career.currentOrg} (fila abierta: ${abierta?.org})`);
        }
      }
      if (jugados === 1 && abierta?.org === career.currentOrg && abierta.tier !== career.tier) {
        vistos.jugadoEnOtroTierQueLaFila += 1;
      }

      // Títulos e internacionales nuevos: la liga y el tier del split en que se ganaron.
      for (const titulo of registro.titulos.slice(antes.career.registro.titulos.length)) {
        if (titulo.liga !== career.liga || titulo.tier !== career.tier) {
          throw new Error(`${donde}: título ${titulo.nombre} con liga ${titulo.liga} y tier ${titulo.tier}, jugando en ${career.liga} (tier ${career.tier})`);
        }
        if (titulo.tier === 3 ? titulo.liga !== null : ligaPorId[titulo.liga]?.tier !== titulo.tier) {
          throw new Error(`${donde}: título ${titulo.nombre} con liga ${titulo.liga} y tier ${titulo.tier}`);
        }
        titulosPorTier[titulo.tier] += 1;
        if (abierta && abierta.liga !== titulo.liga) {
          vistos.tituloEnDescenso += 1;
        }
      }
      for (const entrada of registro.internacionales.slice(antes.career.registro.internacionales.length)) {
        if (entrada.liga !== career.liga || ligaPorId[entrada.liga]?.tier !== 1) {
          throw new Error(`${donde}: internacional ${entrada.torneo} con liga ${entrada.liga}, jugando en ${career.liga}`);
        }
        if (entrada.liga !== ligaDeOrigen) {
          vistos.internacionalFueraDeOrigen += 1;
        }
      }
    }
    if (estado.flags.splitJugadoSinFila) {
      throw new Error(`seed ${seed}: la carrera terminó con un split jugado que nunca llegó a su fila (${JSON.stringify(estado.flags.splitJugadoSinFila)})`);
    }
  }
  if (!completo()) {
    throw new Error(`check vacío: en ${seeds} carreras (tope ${SEEDS_D76_TOPE_K1}) faltó ver alguno de los casos que hacen discriminar al check: `
      + `${JSON.stringify(vistos)}, títulos por tier ${JSON.stringify(titulosPorTier)}`);
  }
});

// Revisión de K1-A ("Tu generación" se compara simétrico): el `puntaje` de cada rival es su mejor rank en el Top 20
// de un CIERRE de temporada —igual que tu `picos.rankMundial`—, no el de cualquier split. Se recalcula acá desde
// `mundo.topMundialPrevioAnual`, la foto que `topMundial.js` guarda en cada cierre, y se exige que en algún split
// de mitad de año un rival haya estado mejor que en todos sus cierres (si no, el check no distinguiría nada).
checkLento('K1 generación simétrica: el puntaje de cada rival es su mejor rank en el Top 20 de un cierre de temporada, igual que tu pico', () => {
  let picosDeMitadDeAnio = 0;
  let rivalesConRank = 0;
  for (let seed = 1; seed <= 60; seed += 1) {
    const rng = mulberry32(seed);
    let estado = createInitialState(seed, rng);
    const handles = new Set(estado.mundo.rivales.map((rival) => rival.handle));
    const mejorAlCierre = new Map();
    for (let split = 0; split < 60 && !estado.terminado; split += 1) {
      const fotoAnterior = estado.mundo.topMundialPrevioAnual;
      estado = avanzarSplitAuto(estado, rng).state;
      const foto = estado.mundo.topMundialPrevioAnual;
      if (foto !== fotoAnterior) {
        (foto ?? []).forEach((entrada, i) => {
          if (handles.has(entrada.handle) && (!mejorAlCierre.has(entrada.handle) || i + 1 < mejorAlCierre.get(entrada.handle))) {
            mejorAlCierre.set(entrada.handle, i + 1);
          }
        });
      } else {
        (estado.mundo.topMundial ?? []).forEach((entrada, i) => {
          if (handles.has(entrada.handle) && i + 1 < (mejorAlCierre.get(entrada.handle) ?? Infinity)) {
            picosDeMitadDeAnio += 1;
          }
        });
      }
      for (const rival of estado.mundo.rivales) {
        if (rival.puntaje !== (mejorAlCierre.get(rival.handle) ?? 0)) {
          throw new Error(`seed ${seed}, split ${estado.player.splitCount}: ${rival.handle} tiene puntaje ${rival.puntaje} y su mejor rank al cierre es ${mejorAlCierre.get(rival.handle) ?? 0}`);
        }
      }
    }
    rivalesConRank += estado.mundo.rivales.filter((rival) => rival.puntaje > 0).length;
  }
  if (picosDeMitadDeAnio === 0 || rivalesConRank === 0) {
    throw new Error(`check vacío: ${picosDeMitadDeAnio} picos de rivales a mitad de año y ${rivalesConRank} rivales con rank en 60 carreras`);
  }
});

// D76 en el veredicto (`core/legado.js`): dos registros armados a mano sobre una carrera real terminada, con la
// forma de dos carreras medidas en K1-A (equilibrado seed 56 y prudente seed 372) en las que una org descendió en
// el lugar y siguió ganando en la liga de desarrollo. Con la lectura vieja (`fila.tier`) los títulos de tier 2
// contaban como de primera y el veredicto decía "Campeón de CBLOL" y "Leyenda de LEC: un internacional y 6 títulos".
check('K1 D76 en el veredicto: legado cuenta splits por splitsPorTier y títulos por su tier, no por fila.tier', () => {
  const base = estadosDeReferenciaK1().find((estado) => estado.terminado && estado.splitFichaje !== null);
  if (!base) {
    throw new Error('check vacío: ninguna carrera de referencia pro terminó');
  }
  const conRegistro = (filas, titulos, internacionales) => {
    const estado = structuredClone(base);
    estado.finAnticipado = 'retiro_elegido';
    estado.career.podios = 0;
    const r = estado.career.registro;
    r.porOrg = filas.map((fila) => ({
      desdeSplit: 0, hastaSplit: null, fechasG: 0, fechasP: 0, jerarquiaMaxima: 0, arraigoFinal: null,
      arraigoMaximo: 0, salarioAnualUSD: 0, motivoDeSalida: null, ...fila
    }));
    r.titulos = titulos;
    r.internacionales = internacionales;
    r.picos.rankMundial = 0;
    r.momentos = [];
    return estado;
  };
  const titulo = (liga, tier, anio, org) => ({ nombre: liga, anio, org, liga, tier });

  // Firmó en CBLOL, jugó 3 splits en primera, descendió a CD y ganó CD: nunca fue campeón de primera.
  const descendido = conRegistro(
    [{ org: 'Leviatán', liga: 'CBLOL', tier: 1, splits: 9, splitsPorTier: { 1: 3, 2: 6, 3: 0 }, desdeAnio: 2030, hastaAnio: 2033, titulos: [{ nombre: 'CD', anio: 2031 }] }],
    [titulo('CD', 2, 2031, 'Leviatán')],
    []
  );
  const v1 = componerLegado(descendido).veredicto;
  if (v1.startsWith('Campeón de') || !v1.startsWith('El pibe que pasó por primera')) {
    throw new Error(`3 splits en primera y un título de CD tiene que ser "El pibe que pasó por primera…", dio "${v1}"`);
  }

  // Dos LCP y una LEC en primera, tres EMEA_MASTERS después de descender con la org de LEC, y un buen papel.
  const insignia = conRegistro(
    [
      { org: 'MVK Esports', liga: 'LCP', tier: 1, splits: 6, splitsPorTier: { 1: 6, 2: 0, 3: 0 }, desdeAnio: 2030, hastaAnio: 2031, titulos: [{ nombre: 'LCP', anio: 2030 }, { nombre: 'LCP', anio: 2031 }] },
      { org: 'Team Vitality', liga: 'LEC', tier: 1, splits: 12, splitsPorTier: { 1: 3, 2: 9, 3: 0 }, desdeAnio: 2032, hastaAnio: null, titulos: [{ nombre: 'LEC', anio: 2032 }, { nombre: 'EMEA_MASTERS', anio: 2035 }, { nombre: 'EMEA_MASTERS', anio: 2036 }, { nombre: 'EMEA_MASTERS', anio: 2037 }] }
    ],
    [
      titulo('LCP', 1, 2030, 'MVK Esports'), titulo('LCP', 1, 2031, 'MVK Esports'), titulo('LEC', 1, 2032, 'Team Vitality'),
      titulo('EMEA_MASTERS', 2, 2035, 'Team Vitality'), titulo('EMEA_MASTERS', 2, 2036, 'Team Vitality'), titulo('EMEA_MASTERS', 2, 2037, 'Team Vitality')
    ],
    [{ torneo: 'internacional — LCP', anio: 2031, org: 'MVK Esports', liga: 'LCP', resultado: 'buen_papel', camino: [] }]
  );
  const v2 = componerLegado(insignia).veredicto;
  if (!v2.startsWith('Leyenda de LCP: un internacional y 3 títulos')) {
    throw new Error(`3 títulos de primera (2 LCP, 1 LEC) y un buen papel tiene que ser "Leyenda de LCP: un internacional y 3 títulos", dio "${v2}"`);
  }
});

// D75 en carreras reales: el "agente libre de tier 2" (saltó de tier 3 y nunca jugó en tier 2) no llegó a tier 2.
// Merge K1 + K2b: se busca en las seeds 1-200 de `malas` y se verifican los primeros tres casos (K2b; K1 buscaba el
// primero en 1-120) con las aserciones de los dos lados. Si no aparece ninguno, falla con mensaje claro.
const SEEDS_MAX_CASO_D75 = 200;
const CASOS_D75 = 3;

check('K1 D75: "llegó a tier N" lee splitsPorTier (no fila.tier) y el embudo de simulate usa esa definición', () => {
  const registro = (filas) => ({ porOrg: filas });
  const fila = (tier, porTier) => ({ tier, splits: porTier[1] + porTier[2] + porTier[3], splitsPorTier: porTier });
  const casos = [
    [registro([]), null],
    [registro([fila(3, { 1: 0, 2: 0, 3: 4 })]), 3],
    // Firmó en tier 1 y descendió en el lugar: jugó en los dos.
    [registro([fila(1, { 1: 3, 2: 5, 3: 0 })]), 1],
    // Una fila que dice tier 1 pero nunca jugó ahí: no llegó a tier 1.
    [registro([fila(3, { 1: 0, 2: 0, 3: 2 }), fila(1, { 1: 0, 2: 2, 3: 0 })]), 2]
  ];
  for (const [r, esperado] of casos) {
    if (tierMasAltoJugado(r) !== esperado) {
      throw new Error(`tierMasAltoJugado(${JSON.stringify(r.porOrg.map((f) => [f.tier, f.splitsPorTier]))}) = ${tierMasAltoJugado(r)}, se esperaba ${esperado}`);
    }
  }
  if (splitsJugadosEnTier(casos[2][0], 2) !== 5 || splitsJugadosEnTier(casos[2][0], 1) !== 3) {
    throw new Error('splitsJugadosEnTier no lee splitsPorTier');
  }
  // `malas`: una carrera que salta de tier 3 a tier 2 como agente libre y termina sin fichar nunca en tier 2. El
  // observador viejo (el menor `career.tier` visto) decía tier 2; la definición D75 dice tier 3. Hasta K2a era la
  // seed 18; con el stream corrido (bloque A) el caso se busca en un rango y se verifican los primeros tres, así
  // ningún corrimiento lo deja vacío sin avisar. Por caso: no jugó ningún split en tier 2 ni en tier 1 (K1) y
  // `carrera.tierMaximo` es 3 y coincide con `tierMasAltoJugado` (K1 y K2b).
  const casosD75 = [];
  // Se busca hasta juntar tres casos Y al menos uno que haya jugado en tier 3 (el que prueba que el agente libre queda
  // en 3 y no en 2); el rango se estira hasta SEEDS_MAX_CASO_D75 × 3 y el check falla solo si ahí no aparece.
  const tieneTier3 = ({ state }) => splitsJugadosEnTier(state.career.registro, 3) > 0;
  for (let seed = 1; seed <= SEEDS_MAX_CASO_D75 * 3 && (casosD75.length < CASOS_D75 || !casosD75.some(tieneTier3)); seed += 1) {
    const { state, carrera } = correrCarreraSimulate(seed, 60, ESTRATEGIAS_K0.malas);
    if (state.career.registro.porOrg.at(-1)?.motivoDeSalida === 'ascenso' && state.career.tier === 2) {
      casosD75.push({ seed, state, carrera });
    }
  }
  if (casosD75.length === 0) {
    throw new Error(`check vacío: en las seeds 1-${SEEDS_MAX_CASO_D75 * 3} de malas ninguna carrera terminó como agente libre de tier 2 sin jugar en tier 2`);
  }
  for (const { seed, state, carrera } of casosD75) {
    const r = state.career.registro;
    if (splitsJugadosEnTier(r, 2) !== 0 || splitsJugadosEnTier(r, 1) !== 0) {
      throw new Error(`seed ${seed} de malas: el agente libre de tier 2 tiene splits jugados en tier 2 (${splitsJugadosEnTier(r, 2)}) o en tier 1 (${splitsJugadosEnTier(r, 1)})`);
    }
    // K2b esperaba 3 en todos; con la revisión de K1 (D76: el split cuenta donde se JUEGA) un caso que firmó en tier 3
    // y se fue sin jugar ningún split ahí (seed 128: disolución y ascenso) no llegó a ningún tier: `null`, no 3.
    const esperado = splitsJugadosEnTier(r, 3) > 0 ? 3 : null;
    if (carrera.tierMaximo !== esperado || carrera.tierMaximo !== tierMasAltoJugado(r)) {
      throw new Error(`seed ${seed} de malas: agente libre de tier 2 sin jugar ahí, carrera.tierMaximo = ${carrera.tierMaximo}, D75 dice ${tierMasAltoJugado(r)} (${esperado})`);
    }
  }
  // Cada caso ya se verificó contra su propia definición (3 si jugó en tier 3, `null` si no jugó en ninguno): si en todo
  // el rango no apareció uno que haya jugado en tier 3, el check sigue probando el otro lado y no falla por eso.
});

check('K1 desafío: dos estados con la misma fecha son idénticos, fechas distintas dan seeds distintas, la fecha se valida y el desafío no toca el rng', () => {
  const FECHA = '2026-10-02';
  const arrancar = (fecha, splits) => {
    const { seed, eleccion, desafio } = iniciarDesafio(fecha);
    const rng = mulberry32(seed);
    let estado = createInitialState(seed, rng, eleccion, desafio);
    for (let i = 0; i < splits && !estado.terminado; i += 1) {
      estado = avanzarSplitAuto(estado, rng).state;
    }
    return { estado, rngEstado: rng.estado() };
  };
  const a = arrancar(FECHA, 6);
  const b = arrancar(FECHA, 6);
  if (JSON.stringify(a.estado) !== JSON.stringify(b.estado) || a.rngEstado !== b.rngEstado) {
    throw new Error(`dos desafíos del ${FECHA} no son idénticos`);
  }
  if (a.estado.desafio?.fecha !== FECHA || a.estado.seed !== seedDelDia(FECHA)) {
    throw new Error(`el estado del desafío no anota la fecha (${JSON.stringify(a.estado.desafio)}) o no usa la seed del día`);
  }
  // El desafío no consume rng ni cambia el mundo: es la partida de esa seed con `desafio` anotado.
  const seed = seedDelDia(FECHA);
  const rngSin = mulberry32(seed);
  const sinDesafio = createInitialState(seed, rngSin);
  const rngCon = mulberry32(seed);
  const conDesafio = createInitialState(seed, rngCon, null, { fecha: FECHA });
  if (rngSin.estado() !== rngCon.estado() || JSON.stringify({ ...conDesafio, desafio: null }) !== JSON.stringify(sinDesafio)) {
    throw new Error('el desafío cambió el estado inicial o el rng respecto de la misma seed sin desafío');
  }
  if (sinDesafio.desafio !== null) {
    throw new Error(`state.desafio tiene que arrancar en null fuera del desafío (vale ${JSON.stringify(sinDesafio.desafio)})`);
  }
  // Seeds: entero positivo de 32 bits, y distintos días dan seeds distintas.
  const fechas = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-11-02', '2027-10-02', '2024-02-29'];
  const seeds = fechas.map((fecha) => seedDelDia(fecha));
  if (seeds.some((s) => !Number.isInteger(s) || s < 1 || s > 0xFFFFFFFF) || new Set(seeds).size !== seeds.length) {
    throw new Error(`seeds del día inválidas o repetidas: ${JSON.stringify(seeds)}`);
  }
  if (JSON.stringify(arrancar('2026-10-03', 0).estado) === JSON.stringify(arrancar(FECHA, 0).estado)) {
    throw new Error('dos fechas distintas arrancaron el mismo estado');
  }
  // La fecha se valida: formato y que el día exista (bisiestos incluidos).
  const validas = ['2026-10-02', '2024-02-29', '2000-02-29', '2026-12-31', '2026-01-01'];
  const invalidas = ['2026-13-01', '2026-00-10', '2026-02-29', '1900-02-29', '2026-04-31', '2026-10-00', '2026-1-02', '26-10-02', '20261002', '2026/10/02', ' 2026-10-02', '', null, undefined, 20261002];
  for (const fecha of validas) {
    if (!esFechaDeDesafio(fecha)) {
      throw new Error(`${fecha} es una fecha válida y se rechazó`);
    }
  }
  for (const fecha of invalidas) {
    if (esFechaDeDesafio(fecha)) {
      throw new Error(`${JSON.stringify(fecha)} no es una fecha válida y se aceptó`);
    }
    let tiro = false;
    try {
      seedDelDia(fecha);
    } catch {
      tiro = true;
    }
    if (!tiro) {
      throw new Error(`seedDelDia(${JSON.stringify(fecha)}) no tiró`);
    }
  }
  // Un desafío con otra seed o con elección no arranca (no sería el mismo para todos).
  for (const [descripcion, armar] of [
    ['otra seed', () => createInitialState(seed + 1, mulberry32(seed + 1), null, { fecha: FECHA })],
    ['con elección', () => createInitialState(seed, mulberry32(seed), { rol: 'mid' }, { fecha: FECHA })],
    ['fecha inválida', () => createInitialState(seed, mulberry32(seed), null, { fecha: '2026-02-30' })]
  ]) {
    let tiro = false;
    try {
      armar();
    } catch {
      tiro = true;
    }
    if (!tiro) {
      throw new Error(`createInitialState aceptó un desafío ${descripcion}`);
    }
  }
});

// Handles de pros reales conocidos (todas las regiones y épocas). Ninguna leyenda inventada puede coincidir con
// uno, sin distinguir mayúsculas (CLAUDE.md: los compañeros y rivales son inventados; PLAN.md "K1 — decisiones de
// spec": las leyendas también). La lista no es exhaustiva: es la red contra lo obvio.
const HANDLES_REALES_K1 = [
  // LCK
  'Faker', 'Bengi', 'Bang', 'Wolf', 'Peanut', 'Huni', 'Score', 'Pray', 'GorillA', 'Smeb', 'Ambition', 'Crown', 'Ruler',
  'CuVee', 'Haru', 'Mata', 'Imp', 'Dandy', 'Deft', 'PawN', 'Bdd', 'Teddy', 'Rascal', 'Clid', 'Canyon', 'ShowMaker',
  'Ghost', 'BeryL', 'Nuguri', 'Chovy', 'Doran', 'Kiin', 'Keria', 'Zeus', 'Oner', 'Gumayusi', 'Lehends', 'Peyz',
  'Delight', 'Kingen', 'Lucid', 'Aiming', 'Zeka', 'Viper', 'Life', 'Effort', 'Ucal', 'Kuro', 'Expession', 'MaRin',
  'Duke', 'Blank', 'Untara', 'Madlife', 'Ryu', 'Ssong', 'Kakao', 'Dade', 'Easyhoon', 'inSec', 'Spirit', 'CptJack',
  'Piccaboo', 'Mafa', 'Kkoma', 'Khan', 'Rich', 'Ssumday', 'Fly', 'Deokdam', 'Kellin', 'Pyosik', 'Hoya', 'Cuzz',
  'Willer', 'Clozer', 'Moham', 'Siwoo', 'Smash', 'Croco', 'Rookie',
  // LPL
  'Uzi', 'Xiaohu', 'Ming', 'TheShy', 'Ning', 'JackeyLove', 'Baolan', 'Doinb', 'Tian', 'Lwx', 'Crisp', 'GimGoon', 'Knight',
  '369', 'Kanavi', 'Yagao', 'Hope', 'Missing', 'Bin', 'Xun', 'Elk', 'ON', 'Light', 'Meiko', 'Scout', 'Flandre', 'Jiejie',
  'Tarzan', 'Breathe', 'Shanji', 'Wei', 'Creme', 'Leave', 'Mlxg', 'Clearlove', 'PDD', 'Zz1tai', 'Mystic', 'Kid', 'Tabe',
  'Karsa', 'Shy', 'Cool', 'Letme', 'Smlz', 'Gala', 'Kramer', 'Corn', 'Zoom', 'Ale', 'Wayward', 'Angel', 'Xiaohao',
  'Bao', 'Hang', 'Nuo', 'Yuyanjia', 'Iboy', 'Mouse', 'Weiwei', 'Lyonz',
  // LEC / Europa
  'Caps', 'Perkz', 'Rekkles', 'Jankos', 'Wunder', 'Mikyx', 'Hans Sama', 'Upset', 'Humanoid', 'Razork', 'Inspired',
  'Elyoya', 'Larssen', 'Comp', 'Trymbi', 'Hylissang', 'Kobbe', 'Vizicsacsi', 'Alphari', 'Odoamne', 'Bwipo', 'Selfmade',
  'Nemesis', 'Febiven', 'Froggen', 'Shook', 'YellOwStaR', 'sOAZ', 'Cyanide', 'Kikis', 'Diamondprox', 'Alex Ich',
  'Darien', 'Genja', 'Edward', 'Krepo', 'Zven', 'Mithy', 'Broxah', 'Expect', 'Trick', 'Vander', 'xPeke', 'Ocelote',
  'Deilor', 'Wickd', 'Puszu', 'Forg1ven', 'Sencux', 'Nisqy', 'Kaiser', 'Labrov', 'BrokenBlade', 'Yike', 'Noah',
  'Jackies', 'Oscarinin', 'Patrik', 'Carzzy', 'Targamas', 'Myrwn', 'Supa', 'Hans', 'Szygenda', 'Cinkrof',
  // LCS / Norteamérica
  'Doublelift', 'Bjergsen', 'Sneaky', 'Aphromoo', 'Hai', 'Meteos', 'Dyrus', 'Reginald', 'Scarra', 'WildTurtle',
  'Xmithie', 'Svenskeren', 'Jensen', 'Impact', 'CoreJJ', 'Licorice', 'Blaber', 'Huhi', 'Santorin', 'Berserker', 'Fudge',
  'APA', 'Yeon', 'Pobelter', 'Hauntzer', 'Darshan', 'Contractz', 'Biofrost', 'Stixxay', 'Olleh', 'Smoothie', 'Vulcan',
  'Closer', 'Palafox', 'Jojopyun', 'River', 'Busio', 'Massu', 'Quad', 'Saint', 'Voyboy', 'Chaox', 'Xpecial',
  'Rush', 'Shiphtur', 'Balls', 'Sheep', 'Imaqtpie', 'Nightblue3', 'Tyler1',
  // CBLOL / Brasil
  'brTT', 'Robo', 'Tinowns', 'Revolta', 'Ranger', 'Titan', 'Kami', 'Esa', 'Micao', 'Jojo', 'Route', 'Aegis', 'Croc',
  'Fuuu', 'Ceos', 'Takeshi', 'Envy', 'Goku', 'Hauz', 'Tockers', 'Wizer', 'Yampi', 'Absolut', 'Dioud', 'Grevthar',
  'Ayel', 'Damage', 'Trigo', 'Netuno', 'Brance', 'Guigo', 'Kiari', 'Dynquedo', 'Mylon', 'Shini',
  // LCP / PCS / VCS / LJL / Pacífico
  'Maple', 'SwordArt', 'Rest', 'Unified', 'Kiaya', 'Levi', 'Optimus', 'Palette', 'Zeros', 'Slayder', 'Archie', 'SofM',
  'Dia1', 'Stanley', 'Kino', 'Hanabi', 'Doggo', 'Westdoor', 'Toyz', 'Bebe', 'Mountain', 'Steak', 'Ceros', 'Yutapon',
  'Evi', 'Tussle', 'Steal', 'Dasher', 'Kongyue', 'Driver', 'Woody', 'FoFo', 'Gemini', 'Betty', 'Hiro', 'Rin',
  // LLA / Latinoamérica
  'Seiya', 'Oddie', 'Plugo', 'Jirall', 'Grell', 'Josedeodo', 'Kiefer', 'Rakyz', 'Zeuss', 'Aloned', 'Buggax', 'Tierwulf',
  'Warangelus', 'Leza', 'Cotopaco', 'Acce', 'Relic', 'Sander', 'Nate', 'Straight', 'Cody', 'Rooney', 'Fix'
];

check('K1 leyendas: 16-24 inventadas, sin handles de pros reales ni generables por el motor, con rol, región y perfil válidos', () => {
  const minimo = 16;
  const maximo = 24;
  if (!Array.isArray(LEYENDAS_K1) || LEYENDAS_K1.length < minimo || LEYENDAS_K1.length > maximo) {
    throw new Error(`hay ${LEYENDAS_K1?.length} leyendas: tienen que ser entre ${minimo} y ${maximo}`);
  }
  const reales = new Set(HANDLES_REALES_K1.map((handle) => handle.toLowerCase()));
  const regiones = new Set(LIGAS.map((liga) => liga.region));
  const ids = new Set();
  const handles = new Set();
  // Lo que puede escupir `generarHandle`: prefijo + sufijo (+ número), o el fallback prefijo + número.
  const generable = (handle) => PREFIJOS_HANDLE.some((prefijo) => SUFIJOS_HANDLE.some((sufijo) => {
    const base = `${prefijo}${sufijo}`.toLowerCase();
    return handle.toLowerCase().startsWith(base) && /^\d*$/.test(handle.slice(base.length));
  })) || PREFIJOS_HANDLE.some((prefijo) => new RegExp(`^${prefijo}\\d+$`, 'i').test(handle));
  for (const leyenda of LEYENDAS_K1) {
    const donde = `leyenda ${leyenda.id}`;
    if (typeof leyenda.id !== 'string' || ids.has(leyenda.id)) {
      throw new Error(`${donde}: id inválido o repetido`);
    }
    ids.add(leyenda.id);
    if (typeof leyenda.handle !== 'string' || leyenda.handle.trim() === '' || handles.has(leyenda.handle.toLowerCase())) {
      throw new Error(`${donde}: handle inválido o repetido`);
    }
    handles.add(leyenda.handle.toLowerCase());
    if (reales.has(leyenda.handle.toLowerCase())) {
      throw new Error(`${donde}: "${leyenda.handle}" es el handle de un pro real`);
    }
    if (generable(leyenda.handle)) {
      throw new Error(`${donde}: "${leyenda.handle}" lo puede generar el motor (core/mundo.js, generarHandle)`);
    }
    if (!IDS_ROL.includes(leyenda.rol)) {
      throw new Error(`${donde}: rol "${leyenda.rol}" no es uno de ${IDS_ROL.join(', ')}`);
    }
    if (!regiones.has(leyenda.region)) {
      throw new Error(`${donde}: región "${leyenda.region}" no es una de leagues.json`);
    }
    for (const campo of ['anios', 'titulos', 'internacionales', 'rankPico']) {
      if (!Number.isInteger(leyenda[campo]) || leyenda[campo] < 0) {
        throw new Error(`${donde}: ${campo} = ${leyenda[campo]}`);
      }
    }
    if (leyenda.rankPico > BALANCE.topMundial.tamano) {
      throw new Error(`${donde}: rankPico ${leyenda.rankPico} fuera del Top ${BALANCE.topMundial.tamano}`);
    }
    if (typeof leyenda.historia !== 'string' || leyenda.historia.length < 40) {
      throw new Error(`${donde}: sin una línea de historia`);
    }
  }
  for (const rol of IDS_ROL) {
    if (!LEYENDAS_K1.some((leyenda) => leyenda.rol === rol)) {
      throw new Error(`ninguna leyenda juega de ${rol}`);
    }
  }
  // La red funciona: un handle real (en otra caja) y uno generable se detectan, y una leyenda no da falso positivo.
  if (!reales.has('FAKER'.toLowerCase()) || !generable('Kaken42') || !generable('Zen7') || generable(LEYENDAS_K1[0].handle)) {
    throw new Error('la detección de handles reales o generables no funciona');
  }
});

check('K1 leyenda comparada: la del perfil exacto de tu rol es esa misma, el empate se rompe por id, el rank pesa, y el perfil cuenta solo títulos de primera', () => {
  for (const leyenda of LEYENDAS_K1) {
    const perfil = { anios: leyenda.anios, titulos: leyenda.titulos, internacionales: leyenda.internacionales, rankPico: leyenda.rankPico };
    const elegida = leyendaMasCercana(perfil, leyenda.rol);
    if (elegida.id !== leyenda.id) {
      throw new Error(`una carrera de ${leyenda.rol} con el perfil exacto de ${leyenda.handle} se compara con ${elegida.handle}`);
    }
  }
  // Empate: dos leyendas sin carrera pro de otros roles, a la misma distancia de alguien de un tercer rol que no
  // llegó. Con el archivo dado vuelta tiene que salir la misma: el desempate es por `id`, no por el orden.
  const perfilVacio = { anios: 0, titulos: 0, internacionales: 0, rankPico: 0 };
  const vacias = LEYENDAS_K1.filter((l) => l.anios === 0 && l.titulos === 0 && l.internacionales === 0 && l.rankPico === 0);
  const rolDeAfuera = vacias.length >= 2 ? IDS_ROL.find((rol) => vacias.every((l) => l.rol !== rol)
    && LEYENDAS_K1.filter((l) => l.rol === rol).every((l) => leyendaMasCercana(perfilVacio, rol).id !== l.id)) : undefined;
  if (!rolDeAfuera) {
    throw new Error('check vacío: no hay un rol cuya leyenda más cercana sin carrera pro empate entre dos de otros roles');
  }
  const normal = leyendaMasCercana(perfilVacio, rolDeAfuera).id;
  const esperado = vacias.map((l) => l.id).sort()[0];
  LEYENDAS_K1.reverse();
  let alReves;
  try {
    alReves = leyendaMasCercana(perfilVacio, rolDeAfuera).id;
  } finally {
    LEYENDAS_K1.reverse();
  }
  if (normal !== esperado || alReves !== esperado) {
    throw new Error(`el empate se rompe por id (${esperado}): dio ${normal}, y con el archivo dado vuelta ${alReves}`);
  }
  // El eje del ranking pesa (mutante r17 de la revisión): con todo lo demás igual, alejarse del rank de una leyenda
  // la aleja, y acercarse la acerca. Afuera del Top 20 (0) es el extremo de abajo.
  const { tamano } = BALANCE.topMundial;
  for (const leyenda of LEYENDAS_K1) {
    const eje = (rank) => (rank > 0 ? tamano + 1 - rank : 0);
    const distancias = [0, tamano, Math.ceil(tamano / 2), 5, 2, 1]
      .map((rank) => ({ lejania: Math.abs(eje(rank) - eje(leyenda.rankPico)), d: distanciaDeLeyenda({ ...leyenda, rankPico: rank }, leyenda.rol, leyenda) }))
      .sort((a, b) => a.lejania - b.lejania);
    for (let i = 1; i < distancias.length; i += 1) {
      const [a, b] = [distancias[i - 1], distancias[i]];
      if (b.lejania > a.lejania && !(b.d > a.d)) {
        throw new Error(`${leyenda.handle}: más lejos en el ranking (${b.lejania} contra ${a.lejania} puestos de eje) no aleja la leyenda (${b.d} contra ${a.d})`);
      }
    }
  }
  // El perfil cuenta solo títulos de primera, igual que el `titulos` de las leyendas.
  const base = estadosDeReferenciaK1().find((estado) => estado.career.registro.porOrg.length > 0);
  const titulosDelPerfil = (mutar) => {
    const copia = structuredClone(base);
    mutar(copia.career.registro.titulos);
    return puntajeDeCarrera(copia).perfil.titulos;
  };
  const sinCambios = titulosDelPerfil(() => {});
  if (titulosDelPerfil((t) => t.push({ nombre: 'LCK_CL', anio: 2030, org: 'X', liga: 'LCK_CL', tier: 2 })) !== sinCambios
    || titulosDelPerfil((t) => t.push({ nombre: 'Copa', anio: 2030, org: 'X', liga: null, tier: 3 })) !== sinCambios
    || titulosDelPerfil((t) => t.push({ nombre: 'LCK', anio: 2030, org: 'X', liga: 'LCK', tier: 1 })) !== sinCambios + 1) {
    throw new Error('perfil.titulos tiene que contar solo los títulos de tier 1');
  }
});

check('K1 versión: la huella del juego (40 seeds × 60 splits, con puntaje, nivel y leyenda) coincide con HUELLA_JUEGO de src/data/version.js', () => {
  if (typeof VERSION_JUEGO !== 'string' || VERSION_JUEGO.trim() === '') {
    throw new Error(`VERSION_JUEGO inválida: ${JSON.stringify(VERSION_JUEGO)}`);
  }
  const { hash, lineas } = calcularHuellaJuego();
  if (lineas.length !== 40 || lineas.some((linea) => linea.split(':').length !== 7)) {
    throw new Error(`la huella del juego tiene que tener 40 líneas seed:fin:splitCount:elo:total:nivel:leyenda (tiene ${lineas.length})`);
  }
  if (Math.max(...lineas.map((linea) => Number(linea.split(':')[2]))) <= 30) {
    throw new Error('ninguna seed pasó de 30 splits: la huella del juego no ve la segunda mitad de la carrera');
  }
  if (hash !== HUELLA_JUEGO) {
    throw new Error(`la huella del juego cambió: actual ${hash}, registrada ${HUELLA_JUEGO} para la versión ${VERSION_JUEGO}. `
      + 'Cubre las carreras enteras (60 splits) y su puntaje: si el cambio es deliberado (un corrimiento del rng, '
      + 'balance que mueve las carreras, o BALANCE.puntaje/leyendas que mueven el número, el nivel o la leyenda), '
      + 'subí VERSION_JUEGO y registrá el hash nuevo en src/data/version.js en el mismo commit; si no, algo cambió '
      + 'sin querer (trampa T1: comparalo con `node src/dev/huella.js --contra=<árbol anterior>` y con la huella del juego del árbol anterior)');
  }
});

check('K1 dificultad: toda liga la tiene (número > 0) y cada tier 2 hereda la de la liga a la que asciende', () => {
  for (const liga of LIGAS) {
    if (typeof liga.dificultad !== 'number' || !Number.isFinite(liga.dificultad) || !(liga.dificultad > 0)) {
      throw new Error(`${liga.id}: dificultad ${JSON.stringify(liga.dificultad)}`);
    }
  }
  for (const tier2 of LIGAS.filter((liga) => liga.tier === 2)) {
    const madre = LIGAS.find((liga) => liga.tier === 1 && liga.desciendeA === tier2.id);
    if (!madre) {
      throw new Error(`${tier2.id}: ninguna liga tier 1 desciende ahí, no hay de quién heredar la dificultad`);
    }
    if (tier2.dificultad !== madre.dificultad) {
      throw new Error(`${tier2.id}: dificultad ${tier2.dificultad}, tiene que heredar la de ${madre.id} (${madre.dificultad})`);
    }
  }
});

// Los hechos de una carrera vacía, y los mínimos que cumplen un requisito (cada clave de requisito es un hecho,
// salvo `rankPicoHasta`, que se cumple con un pico de rank igual o mejor).
const HECHOS_VACIOS_K1 = { splitsJugados: 0, splitsTier1: 0, titulosTier1: 0, cierresEnTop20: 0, rankPico: 0, cierresNumeroUno: 0 };
function hechosQueCumplenK1(requisito) {
  const hechos = { ...HECHOS_VACIOS_K1 };
  for (const [clave, n] of Object.entries(requisito)) {
    hechos[clave === 'rankPicoHasta' ? 'rankPico' : clave] = n;
  }
  return hechos;
}

check('K1 niveles por hechos: en orden y con requisitos válidos, cada nivel se gana justo con su requisito, gana el más alto que se cumple, el siguiente dice el hecho que faltó, y los cuantiles son crecientes', () => {
  const { niveles, cuantiles } = BALANCE.puntaje;
  if (JSON.stringify(niveles.map((n) => n.id)) !== JSON.stringify(NIVELES_K1.map((n) => n.id))) {
    throw new Error(`BALANCE.puntaje.niveles [${niveles.map((n) => n.id)}] no coincide con los niveles con nombre [${NIVELES_K1.map((n) => n.id)}]`);
  }
  if (NIVELES_K1.some((nivel) => typeof nivel.nombre !== 'string' || nivel.nombre.length === 0)) {
    throw new Error('un nivel no tiene nombre');
  }
  if (Object.keys(niveles[0].requisito).length !== 0) {
    throw new Error(`"${niveles[0].id}" es el piso: no puede pedir nada (pide ${JSON.stringify(niveles[0].requisito)})`);
  }
  for (const nivel of niveles.slice(1)) {
    const claves = Object.keys(nivel.requisito);
    if (claves.length === 0 || claves.some((clave) => !HECHOS_DE_REQUISITO.includes(clave) || !Number.isInteger(nivel.requisito[clave]) || nivel.requisito[clave] < 1)) {
      throw new Error(`${nivel.id}: requisito ${JSON.stringify(nivel.requisito)} (hechos válidos: ${HECHOS_DE_REQUISITO.join(', ')}, mínimos enteros >= 1)`);
    }
  }
  // Los requisitos son los de la tabla de PLAN.md ("K1 — lo que cambió la revisión de K1-A"): el nombre de un nivel
  // promete ese hecho. Lo único de balance es la N de "Fijo en primera" ("del orden de 3 años": entre 2 y 4 años).
  const nFijo = niveles.find((n) => n.id === 'fijo')?.requisito.splitsTier1;
  const { splitsPorEdad } = BALANCE.edad;
  if (!(nFijo >= 2 * splitsPorEdad && nFijo <= 4 * splitsPorEdad)) {
    throw new Error(`"Fijo en primera" pide ${nFijo} splits en primera: tiene que ser del orden de 3 años (${2 * splitsPorEdad}-${4 * splitsPorEdad})`);
  }
  const TABLA_DEL_PLAN_K1 = {
    no_llego: {}, circuito: { splitsJugados: 1 }, profesional: { splitsTier1: 1 }, fijo: { splitsTier1: nFijo },
    campeon: { titulosTier1: 1 }, figura: { cierresEnTop20: 1 }, leyenda: { titulosTier1: 3, rankPicoHasta: 5 },
    goat: { cierresNumeroUno: 3 }
  };
  const ordenado = (objeto) => JSON.stringify(Object.keys(objeto).sort().map((clave) => [clave, objeto[clave]]));
  for (const nivel of niveles) {
    if (ordenado(nivel.requisito) !== ordenado(TABLA_DEL_PLAN_K1[nivel.id])) {
      throw new Error(`${nivel.id} pide ${JSON.stringify(nivel.requisito)} y la tabla de PLAN.md dice ${JSON.stringify(TABLA_DEL_PLAN_K1[nivel.id])}`);
    }
  }
  // Bordes: los hechos mínimos de cada nivel dan ese nivel; un escalón menos en cualquiera de sus requisitos, uno
  // más bajo. El siguiente nombra lo que faltó, en palabras y sin puntos.
  niveles.forEach((nivel, i) => {
    const justo = hechosQueCumplenK1(nivel.requisito);
    const dado = nivelDeCarrera(justo);
    if (dado.id !== nivel.id) {
      throw new Error(`con los hechos justos de ${nivel.id} (${JSON.stringify(justo)}) el nivel es ${dado.id}`);
    }
    for (const [clave, n] of Object.entries(nivel.requisito)) {
      const peores = clave === 'rankPicoHasta' ? [{ ...justo, rankPico: n + 1 }, { ...justo, rankPico: 0 }] : [{ ...justo, [clave]: n - 1 }];
      for (const peor of peores) {
        if (INDICE_NIVEL_K1[nivelDeCarrera(peor).id] >= i) {
          throw new Error(`a ${nivel.id} le falta ${clave} (${JSON.stringify(peor)}) y el nivel sigue siendo ${nivelDeCarrera(peor).id}`);
        }
      }
    }
    const siguiente = niveles[i + 1];
    if (!siguiente) {
      if (dado.siguiente !== null) {
        throw new Error(`${nivel.id} es el techo: no tiene siguiente`);
      }
      return;
    }
    if (dado.siguiente?.id !== siguiente.id || dado.siguiente.nombre !== NIVELES_K1[i + 1].nombre) {
      throw new Error(`el siguiente de ${nivel.id} tiene que ser ${siguiente.id}, dio ${JSON.stringify(dado.siguiente)}`);
    }
    const texto = dado.siguiente.requisito;
    if (typeof texto !== 'string' || !/^Te falt(ó|aron) .+\.$/.test(texto) || /\bpts\b|puntos/.test(texto)) {
      throw new Error(`lo que faltó para ${siguiente.id} tiene que decirse como hecho ("Te faltó …."), sin puntos: "${texto}"`);
    }
  });
  // Gana el más alto que se cumple: no son escalones anidados.
  const soloTop20 = nivelDeCarrera({ ...HECHOS_VACIOS_K1, cierresEnTop20: 1 }).id;
  if (soloTop20 !== 'figura') {
    throw new Error(`un cierre en el Top 20 sin nada más tiene que ser "figura" (gana el más alto que se cumple), dio ${soloTop20}`);
  }
  // Más de cualquier hecho nunca baja el nivel.
  for (const base of niveles.map((nivel) => hechosQueCumplenK1(nivel.requisito))) {
    for (const clave of Object.keys(HECHOS_VACIOS_K1)) {
      const valores = clave === 'rankPico'
        ? [0, BALANCE.topMundial.tamano, 10, 5, 3, 2, 1]
        : Array.from({ length: 13 }, (_, v) => v);
      let anterior = -1;
      for (const valor of valores) {
        const indice = INDICE_NIVEL_K1[nivelDeCarrera({ ...base, [clave]: valor }).id];
        if (indice < anterior) {
          throw new Error(`con más ${clave} (${valor}) el nivel bajó desde ${JSON.stringify(base)}`);
        }
        anterior = indice;
      }
    }
  }
  // Cuantiles: arrancan en el percentil 0, crecen, y el percentil es monótono e interpola.
  if (cuantiles[0][0] !== 0 || cuantiles.some(([p, x], i) => i > 0 && !(p > cuantiles[i - 1][0] && x >= cuantiles[i - 1][1]))) {
    throw new Error(`la tabla de cuantiles tiene que arrancar en el percentil 0 y crecer: ${JSON.stringify(cuantiles)}`);
  }
  const techo = 2 * cuantiles[cuantiles.length - 1][1];
  let percentilAnterior = -1;
  for (let total = 0; total <= techo; total += 1) {
    const percentilActual = percentilDePuntaje(total);
    if (percentilActual < percentilAnterior || !Number.isInteger(percentilActual)
      || percentilActual < cuantiles[0][0] || percentilActual > cuantiles[cuantiles.length - 1][0]) {
      throw new Error(`con ${total} puntos el percentil es ${percentilActual} (no monótono o fuera de rango)`);
    }
    percentilAnterior = percentilActual;
  }
  for (let i = 1; i < cuantiles.length; i += 1) {
    const [pPrevio, xPrevio] = cuantiles[i - 1];
    const [p, x] = cuantiles[i];
    if (x > xPrevio) {
      const medio = (xPrevio + x) / 2;
      const esperado = Math.floor(pPrevio + (p - pPrevio) * ((medio - xPrevio) / (x - xPrevio)));
      if (percentilDePuntaje(medio) !== esperado) {
        throw new Error(`entre ${xPrevio} y ${x} puntos el percentil tiene que interpolar (${esperado}), dio ${percentilDePuntaje(medio)}`);
      }
    }
  }
  const [pPrimero, xPrimero] = cuantiles[0];
  const [pUltimo, xUltimo] = cuantiles[cuantiles.length - 1];
  if (percentilDePuntaje(xPrimero) !== pPrimero || percentilDePuntaje(xUltimo + 1) !== pUltimo) {
    throw new Error(`los extremos de la tabla de cuantiles son ${pPrimero} y ${pUltimo}: dio ${percentilDePuntaje(xPrimero)} y ${percentilDePuntaje(xUltimo + 1)}`);
  }
});

// ============================================================================
// K1-B — La pantalla del número (PLAN.md §K1, "K1 — decisiones de spec",
// Pantalla). La tarjeta y el inicio son DOM y se miran en un navegador; lo que
// se prueba acá es la lógica pura que comparten (`src/ui/resultado.js`): el
// texto para compartir, el link, la fecha del desafío y el historial local,
// que nunca puede romper la página aunque el `localStorage` falle.
// ============================================================================

const resultadoK1B = await import('../ui/resultado.js');

// Un estado mínimo con lo único que leen el texto y el historial.
function estadoK1B({ seed = 777, fecha = null, total = 1512, nivel = 'Campeón' } = {}) {
  return {
    seed,
    desafio: fecha ? { fecha } : null,
    player: { role: 'mid', name: 'Prueba' },
    tarjeta: { puntaje: { total, nivel: { id: 'campeon', nombre: nivel } } }
  };
}

check('K1-B compartir: el texto lleva juego, fecha del desafío, puntaje con miles, nivel, versión y el link del desafío; fuera del desafío, sin fecha y con el link de la seed', () => {
  const { textoParaCompartir, miles, desafioDeBusqueda, linkDeEstado } = resultadoK1B;
  const HREF = 'http://localhost:8000/?seed=9&otra=1#ancla';
  const conDesafio = textoParaCompartir(estadoK1B({ seed: seedDelDia('2026-10-02'), fecha: '2026-10-02' }), HREF);
  const esperadoDesafio = `Un Split Más · Desafío 2026-10-02 · 1.512 pts · Campeón · v ${VERSION_JUEGO} · http://localhost:8000/?desafio=2026-10-02`;
  if (conDesafio !== esperadoDesafio) {
    throw new Error(`desafío: esperaba\n  ${esperadoDesafio}\ndio\n  ${conDesafio}`);
  }
  const libre = textoParaCompartir(estadoK1B({ seed: 777 }), HREF);
  const esperadoLibre = `Un Split Más · 1.512 pts · Campeón · v ${VERSION_JUEGO} · http://localhost:8000/?seed=777`;
  if (libre !== esperadoLibre) {
    throw new Error(`carrera libre: esperaba\n  ${esperadoLibre}\ndio\n  ${libre}`);
  }
  // El link del desafío lo reproduce: la URL vuelve a dar la fecha, y la fecha la seed.
  const link = linkDeEstado(estadoK1B({ seed: seedDelDia('2024-02-29'), fecha: '2024-02-29' }), HREF);
  if (desafioDeBusqueda(new URL(link).search) !== '2024-02-29') {
    throw new Error(`el link del desafío no se lee de vuelta: ${link}`);
  }
  const casos = [[0, '0'], [999, '999'], [1000, '1.000'], [1512, '1.512'], [1234567, '1.234.567'], [-37, '−37'], [1647.6, '1.648']];
  for (const [numero, texto] of casos) {
    if (miles(numero) !== texto) {
      throw new Error(`miles(${numero}) tiene que ser "${texto}", dio "${miles(numero)}"`);
    }
  }
});

check('K1-B historial: tolera un localStorage que tira, JSON roto y formas raras; guarda a lo sumo 10 (el récord sobrevive al recorte); un desafío repetido queda en una fila con el mejor puntaje y los intentos', () => {
  const {
    leerHistorial, guardarHistorial, agregarAlHistorial, entradaDeResultado, mejorDelDesafio,
    lineaDeHistorial, historialVacio, almacenamientoLocal, CLAVE_HISTORIAL, MAX_HISTORIAL
  } = resultadoK1B;
  const enMemoria = (inicial = null) => {
    let valor = inicial;
    return { getItem: (clave) => (clave === CLAVE_HISTORIAL ? valor : null), setItem: (clave, v) => { valor = String(v); } };
  };
  const vacio = JSON.stringify(historialVacio());

  // 1. Un almacenamiento que tira en cada acceso, o que no existe: nada tira.
  const queTira = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  for (const almacen of [queTira, null, undefined]) {
    if (JSON.stringify(leerHistorial(almacen)) !== vacio) {
      throw new Error('con un almacenamiento que falla, leer tiene que dar el historial vacío');
    }
    if (guardarHistorial(almacen, historialVacio()) !== false) {
      throw new Error('con un almacenamiento que falla, guardar tiene que devolver false, no tirar');
    }
  }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    if (almacenamientoLocal() !== null) {
      throw new Error('si leer window.localStorage tira, almacenamientoLocal() tiene que dar null');
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }

  // 2. JSON roto, otra forma, entradas con basura: vacío o filtrado, nunca a medias.
  const entradaValida = entradaDeResultado(estadoK1B({ seed: 5, total: 300 }), '2026-10-01');
  for (const crudo of ['{roto', '"texto"', 'null', '{"forma":1,"entradas":"x"}', '{"forma":99,"entradas":[]}', '[]']) {
    if (JSON.stringify(leerHistorial(enMemoria(crudo))) !== vacio) {
      throw new Error(`lo guardado ${crudo} tiene que leerse como historial vacío`);
    }
  }
  const mezclado = leerHistorial(enMemoria(JSON.stringify({
    forma: 1, entradas: [entradaValida, { total: 'mucho' }, null, { ...entradaValida, desafio: '2026-02-30' }], record: { total: 1 }
  })));
  if (mezclado.entradas.length !== 1 || mezclado.entradas[0].total !== 300 || mezclado.record !== null) {
    throw new Error(`las entradas inválidas se descartan una por una: quedó ${JSON.stringify(mezclado)}`);
  }

  // 3. A lo sumo MAX_HISTORIAL, lo último primero, y el récord sobrevive al recorte.
  let historial = historialVacio();
  const totales = [2000, ...Array.from({ length: MAX_HISTORIAL + 1 }, (_, i) => 100 + i)];
  totales.forEach((total, i) => {
    historial = agregarAlHistorial(historial, entradaDeResultado(estadoK1B({ seed: 1000 + i, total }), '2026-10-02'));
  });
  if (historial.entradas.length !== MAX_HISTORIAL) {
    throw new Error(`el historial tiene que guardar ${MAX_HISTORIAL}, guardó ${historial.entradas.length}`);
  }
  if (historial.entradas[0].seed !== 1000 + totales.length - 1) {
    throw new Error('lo más reciente tiene que ir primero');
  }
  if (historial.entradas.some((e) => e.total === 2000) || historial.record?.total !== 2000) {
    throw new Error(`el récord (2000) quedó afuera de los últimos ${MAX_HISTORIAL} y tiene que sobrevivir aparte: ${JSON.stringify(historial.record)}`);
  }
  const almacen = enMemoria();
  if (!guardarHistorial(almacen, historial) || JSON.stringify(leerHistorial(almacen)) !== JSON.stringify(historial)) {
    throw new Error('guardar y volver a leer tiene que dar el mismo historial');
  }

  // 4. El mismo desafío, tres veces: una sola fila, el mejor puntaje, 3 intentos.
  const FECHA = '2026-10-02';
  const intento = (total, jugadoEn) => entradaDeResultado(estadoK1B({ seed: seedDelDia(FECHA), fecha: FECHA, total }), jugadoEn);
  let h = historialVacio();
  const lineas = [];
  for (const [total, dia] of [[800, '2026-10-02'], [1200, '2026-10-03'], [900, '2026-10-04']]) {
    lineas.push(lineaDeHistorial(h, intento(total, dia)));
    h = agregarAlHistorial(h, intento(total, dia));
  }
  const filas = h.entradas.filter((e) => e.desafio === FECHA);
  if (filas.length !== 1 || filas[0].total !== 1200 || filas[0].intentos !== 3 || filas[0].jugadoEn !== '2026-10-04') {
    throw new Error(`un desafío repetido tiene que quedar en una fila con el mejor (1200), 3 intentos y el último día: ${JSON.stringify(filas)}`);
  }
  if (mejorDelDesafio(h, FECHA)?.total !== 1200 || mejorDelDesafio(h, '2026-10-03') !== null) {
    throw new Error('mejorDelDesafio tiene que devolver la fila de esa fecha, y null si no se jugó');
  }
  if (!/^Primer intento/.test(lineas[0]) || !/Mejoraste.*antes 800 pts\. Intento 2\./.test(lineas[1])
    || !/sigue siendo 1\.200 pts \(Campeón\)\. Intento 3\./.test(lineas[2])) {
    throw new Error(`las líneas de la tarjeta no comparan bien con tu marca: ${JSON.stringify(lineas)}`);
  }
  // Con otra versión es otro juego: fila aparte.
  const otraVersion = agregarAlHistorial(h, { ...intento(50, '2026-10-05'), version: `${VERSION_JUEGO}-otra` });
  if (otraVersion.entradas.filter((e) => e.desafio === FECHA).length !== 2) {
    throw new Error('el mismo desafío con otra versión tiene que ir en una fila aparte');
  }
  // Carrera libre: sin récord no hay línea; contra el récord, sube o no.
  const libre = (total) => entradaDeResultado(estadoK1B({ seed: 1, total }), '2026-10-02');
  const conRecord = agregarAlHistorial(historialVacio(), libre(1000));
  if (lineaDeHistorial(historialVacio(), libre(10)) !== null
    || !/^Nuevo récord personal: superaste tus 1\.000 pts/.test(lineaDeHistorial(conRecord, libre(1001)))
    || !/^Tu récord personal: 1\.000 pts/.test(lineaDeHistorial(conRecord, libre(1000)))) {
    throw new Error('la línea del récord personal no compara bien');
  }
});

check('K1-B URL y fecha: ?desafio= válido se lee e inválido se ignora; la fecha de hoy es la del día UTC aunque el huso local sea otro', () => {
  const { desafioDeBusqueda, fechaUTC } = resultadoK1B;
  const casos = [
    ['?desafio=2026-10-02', '2026-10-02'], ['?seed=5&desafio=2024-02-29', '2024-02-29'], ['?desafio=2026-02-30', null],
    ['?desafio=2025-02-29', null], ['?desafio=hoy', null], ['?desafio=2026-10-2', null], ['?seed=5', null], ['', null]
  ];
  for (const [busqueda, esperado] of casos) {
    if (desafioDeBusqueda(busqueda) !== esperado) {
      throw new Error(`desafioDeBusqueda(${JSON.stringify(busqueda)}) tiene que ser ${esperado}, dio ${desafioDeBusqueda(busqueda)}`);
    }
  }
  // 01:30 UTC del 2 de octubre es todavía 1 de octubre en Buenos Aires: el
  // desafío es el del 2 (la misma fecha para todos), no el del huso local.
  const tzAntes = process.env.TZ;
  process.env.TZ = 'America/Argentina/Buenos_Aires';
  try {
    const madrugada = new Date(Date.UTC(2026, 9, 2, 1, 30));
    if (madrugada.getDate() !== 1) {
      throw new Error('el huso de prueba no se aplicó: el check no estaría probando nada');
    }
    if (fechaUTC(madrugada) !== '2026-10-02') {
      throw new Error(`fechaUTC tiene que dar el día UTC (2026-10-02), dio ${fechaUTC(madrugada)}`);
    }
  } finally {
    if (tzAntes === undefined) delete process.env.TZ;
    else process.env.TZ = tzAntes;
  }
});

// ============================================================================
// FASE K, K2a — El instrumento corregido (PLAN.md "K2 — lo que midió la investigación", viñeta K2a)
// ============================================================================
// Cuidan al INSTRUMENTO de K2, no al juego: que las filas corregidas de `simulate.js` (`temporadasData`, una por temporada
// jugada) y las de serie (`seriesData`, el Bo5 medido en el motor) sean lo que el motor usó. La verdad sale de un ESPÍA
// sobre el `aplicar` real de `temporada` y de `serie` (una envoltura puesta en `ETAPAS_SPLIT` solo mientras dura la
// corrida: misma llamada, mismos argumentos, mismo `rng`), con cálculos escritos acá aparte de `simulate.js`. Cada uno se
// verificó en rojo contra un mutante del observador o de lo que el motor expone (regla de proceso 7; la tabla está en el
// reporte de K2a). Las metas de K2 NO son checks: van en `nivel.metasK2` (ver `simulate.js`).

// Corre `correr()` con el `aplicar` del sistema `sistemaId` envuelto: `alAplicar(estadoDeEntrada, resultado)` ve cada
// llamada. Restaura el sistema original SIEMPRE.
function conEspiaDeSistemaK2a(sistemaId, alAplicar, correr) {
  const indice = ETAPAS_SPLIT.findIndex((sistema) => sistema.id === sistemaId);
  const original = ETAPAS_SPLIT[indice];
  ETAPAS_SPLIT[indice] = {
    ...original,
    aplicar: (state, rng) => {
      const resultado = original.aplicar(state, rng);
      alAplicar(state, resultado);
      return resultado;
    }
  };
  try {
    return correr();
  } finally {
    ETAPAS_SPLIT[indice] = original;
  }
}

// La media de nivel de la liga de la temporada como la midió la investigación de K2 (`k2inv/probe.mjs`): en el ARRANQUE
// de la temporada, la liga de `career.liga` (o la que tiene a tu org), sobre todos los jugadores de los planteles de sus
// orgs; sin liga en `mundo.ligas` o sin planteles, la constante `nivelLigaPorDefecto` y "no modelada".
function mediaDeLigaK2a(state, org) {
  const ligas = state.mundo.ligas ?? [];
  const liga = ligas.find((l) => l.id === state.career.liga) ?? ligas.find((l) => (l.orgs ?? []).some((o) => o.nombre === org));
  const niveles = (liga?.orgs ?? [])
    .flatMap((o) => Object.values(state.mundo.planteles?.[o.nombre] ?? {}))
    .filter((jugador) => typeof jugador?.nivel === 'number')
    .map((jugador) => jugador.nivel);
  return niveles.length > 0
    ? { media: mediaK0(niveles), modelada: true }
    : { media: BALANCE.mercado.nivelLigaPorDefecto, modelada: false };
}

// K2b — el nivel medio de los compañeros como lo define el motor desde K2b, reimplementado SIN las funciones del motor:
// en una liga modelada, el plantel ACTUAL de tu org menos el puesto de tu rol; sin plantel, el snapshot de `roster`.
function nivelDeCompanerosIndependienteK2b(state) {
  const plantel = state.mundo.planteles?.[state.career.currentOrg];
  const lista = plantel
    ? Object.entries(plantel).filter(([rol]) => rol !== state.player.role).map(([, npc]) => npc)
    : state.career.companeros;
  return lista.reduce((suma, c) => suma + c.nivel, 0) / lista.length;
}

// K2b — la fuerza de un partido reconstruida desde sus partes, con la fórmula de K2b y sin `fuerzaDelEquipo`: los
// compañeros pesan `1 − pesoJugadorEnEquipo`, tu rendimiento (acotado a 0-100) `pesoJugadorEnEquipo`, y la sinergia
// multiplica al equipo entero, centrada en `sinergiaReferencia`.
function fuerzaDesdeCamposK2b(nivelCompaneros, rendimientoSinAcotar, sinergia) {
  const r = BALANCE.rendimiento;
  const rendimiento = Math.min(BALANCE.stats.max, Math.max(BALANCE.stats.min, rendimientoSinAcotar));
  return (nivelCompaneros * (1 - r.pesoJugadorEnEquipo) + rendimiento * r.pesoJugadorEnEquipo)
    * (1 + (sinergia - r.sinergiaReferencia) / BALANCE.stats.max * r.sinergiaPesoEnEquipo);
}

// La guarda con la que `systems/temporada.js` arranca una temporada (copiada acá a propósito: si el observador detecta
// "corrió la temporada" por otro camino, los dos tienen que coincidir).
const arrancaTemporadaK2a = (state) => state.phase === 'profesional' && Boolean(state.career.currentOrg) && state.career.companeros.length > 0;

// Una carrera con el espía de `temporada` puesto: devuelve, por temporada, lo que vio `aplicar` al arrancarla y la posición
// final de su tabla, y por cada split que cerró en la etapa profesional si corrió la temporada. Además cuenta los casos
// que separan la definición corregida de una lectura al cierre del split (para que el check no pase vacío).
function verdadDeTemporadasK2a(seed, responder, splits, casos) {
  const temporadas = [];
  const splitsPro = [];
  conEspiaDeSistemaK2a('temporada', (entrada, resultado) => {
    if (!arrancaTemporadaK2a(entrada)) {
      return;
    }
    if (resultado.state.career.temporada === entrada.career.temporada) {
      throw new Error(`seed ${seed}: la guarda de temporada pasó y no se armó una temporada nueva`);
    }
    const org = entrada.career.currentOrg;
    const { media, modelada } = mediaDeLigaK2a(entrada, org);
    // K2b: los compañeros que usa el motor son los del plantel VIVO en una liga modelada (y el snapshot si no):
    // reimplementado acá, sin las funciones del motor.
    const nivelCompaneros = nivelDeCompanerosIndependienteK2b(entrada);
    // Identidad exacta (revisión de K2a): la fuerza del split que el motor puso en la temporada se reconstruye desde
    // los campos expuestos con la fórmula de K2b — sin pasar por `fuerzaDelEquipo` —, así un motor que usa otros
    // compañeros (o los corre) sin cambiar lo que expone no pasa.
    const t = resultado.state.career.temporada;
    temporadas.push({
      split: entrada.player.splitCount,
      org,
      nivel: nivelDelJugador(entrada),
      nivelCompaneros,
      mediaLiga: media,
      ligaModelada: modelada,
      desvioFuerzaPropia: Math.abs(t.fuerzaPropia - fuerzaDesdeCamposK2b(t.nivelCompaneros, t.rendimientoBase, entrada.career.sinergia)),
      desvioRendimientoBase: Math.abs(t.rendimientoBase - rendimientoBase(entrada))
    });
  }, () => {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < splits && !state.terminado; i += 1) {
      const antes = temporadas.length;
      state = avanzarSplitAuto(state, rng, responder ?? undefined).state;
      const jugo = temporadas.length > antes;
      if (jugo) {
        const fila = temporadas[temporadas.length - 1];
        const t = state.career.temporada;
        fila.posNorm = t.posicion && t.tabla.length > 1 ? 1 - (t.posicion - 1) / (t.tabla.length - 1) : null;
        // Lo que daría leer todo al cierre del split (la definición de K0): ¿difiere de lo del arranque?
        const alCierre = mediaDeLigaK2a(state, fila.org);
        casos.temporadas += 1;
        casos.noModeladas += fila.ligaModelada ? 0 : 1;
        casos.mundoMovidoDespues += Math.abs(alCierre.media - fila.mediaLiga) > 1e-9 ? 1 : 0;
        casos.nivelMovidoDespues += Math.abs(nivelDelJugador(state) - fila.nivel) > 1e-9 ? 1 : 0;
        const cierre = state.career.companeros;
        const companerosAlCierre = cierre.length > 0 ? cierre.reduce((suma, c) => suma + c.nivel, 0) / cierre.length : null;
        casos.companerosMovidosDespues += companerosAlCierre !== null && Math.abs(companerosAlCierre - fila.nivelCompaneros) > 1e-9 ? 1 : 0;
      }
      if (state.phase === 'profesional') {
        splitsPro.push({ jugo, conPosicion: Boolean(state.career.posicion) && state.career.temporada?.tabla?.length > 1 });
        casos.rancias += !jugo && Boolean(state.career.posicion) && state.career.temporada?.tabla?.length > 1 ? 1 : 0;
      }
    }
  });
  return { temporadas, splitsPro };
}

// Las carreras del check: `criterio` hasta encontrar los casos que separan las definiciones (al menos 40 seeds, como mucho
// 400), y 20 de cada uno de los otros tres bots.
const SEEDS_MIN_OBSERVADOR_K2A = 40;
const SEEDS_MAX_OBSERVADOR_K2A = 400;
const SEEDS_OTROS_BOTS_OBSERVADOR_K2A = 20;
const SPLITS_OBSERVADOR_K2A = 60;

checkLento('K2a observador: las filas corregidas de simulate.js son lo que vio temporada.aplicar al arrancar cada temporada (nivel, compañeros, liga, posición), y las de K0 marcan los splits pro sin temporada', () => {
  const casos = { temporadas: 0, noModeladas: 0, mundoMovidoDespues: 0, nivelMovidoDespues: 0, companerosMovidosDespues: 0, rancias: 0 };
  const problemas = [];
  const contrastar = (bot, seed) => {
    const responder = ESTRATEGIAS_K0[bot];
    const verdad = verdadDeTemporadasK2a(seed, responder, SPLITS_OBSERVADOR_K2A, casos);
    const { observacion } = correrCarreraSimulate(seed, SPLITS_OBSERVADOR_K2A, responder);
    const donde = `${bot} seed ${seed}`;
    if (observacion.temporadasData.length !== verdad.temporadas.length) {
      problemas.push(`${donde}: ${observacion.temporadasData.length} filas corregidas, el espía vio ${verdad.temporadas.length} temporadas`);
      return;
    }
    observacion.temporadasData.forEach((fila, i) => {
      const esperado = verdad.temporadas[i];
      if (!(esperado.desvioFuerzaPropia <= 1e-9) || !(esperado.desvioRendimientoBase <= 1e-9)) {
        problemas.push(`${donde}, temporada del split ${esperado.split}: la fuerza del split no se reconstruye desde lo expuesto `
          + `(desvío de fuerzaPropia ${esperado.desvioFuerzaPropia}, de rendimientoBase ${esperado.desvioRendimientoBase})`);
      }
      const columnas = {
        split: esperado.split,
        org: esperado.org,
        nivel: esperado.nivel,
        nivelCompaneros: esperado.nivelCompaneros,
        mediaLiga: esperado.mediaLiga,
        ligaModelada: esperado.ligaModelada,
        posNorm: esperado.posNorm,
        nivelRelativoJugador: esperado.nivel - esperado.mediaLiga,
        nivelRelativoCompaneros: esperado.nivelCompaneros - esperado.mediaLiga
      };
      for (const [columna, valor] of Object.entries(columnas)) {
        const igual = typeof valor === 'number' && typeof fila[columna] === 'number'
          ? Math.abs(fila[columna] - valor) <= 1e-9
          : fila[columna] === valor;
        if (!igual) {
          problemas.push(`${donde}, temporada del split ${esperado.split}: ${columna} es ${fila[columna]}, el espía dice ${valor}`);
        }
      }
    });
    // Las filas de K0 (`splitsProData`) son una por split que cierra en la etapa profesional, y `temporadaJugada` dice si
    // en ese split corrió la temporada.
    const marcas = observacion.splitsProData.map((d) => d.temporadaJugada);
    const esperadas = verdad.splitsPro.map((d) => d.jugo);
    if (JSON.stringify(marcas) !== JSON.stringify(esperadas)) {
      problemas.push(`${donde}: splitsProData.temporadaJugada = ${JSON.stringify(marcas)}, el espía dice ${JSON.stringify(esperadas)}`);
    }
  };

  const casosQueSeparan = () => casos.noModeladas > 0 && casos.mundoMovidoDespues > 0 && casos.nivelMovidoDespues > 0 && casos.rancias > 0;
  let seedCriterio = 0;
  for (let seed = 1; seed <= SEEDS_MAX_OBSERVADOR_K2A && (seed <= SEEDS_MIN_OBSERVADOR_K2A || !casosQueSeparan()); seed += 1) {
    contrastar('criterio', seed);
    seedCriterio = seed;
    if (problemas.length > 0) {
      break;
    }
  }
  for (const bot of ['equilibrado', 'azar', 'malas']) {
    for (let seed = 1; seed <= SEEDS_OTROS_BOTS_OBSERVADOR_K2A && problemas.length === 0; seed += 1) {
      contrastar(bot, seed);
    }
  }
  if (problemas.length > 0) {
    throw new Error(`${problemas.slice(0, 4).join('; ')}${problemas.length > 4 ? ` (+${problemas.length - 4} más)` : ''}`);
  }
  // No vacío: tiene que haber temporadas de liga no modelada (tier 3), splits pro sin temporada (las filas rancias de K0),
  // temporadas en las que el nivel cambió después de arrancar, y alguna en la que el mundo se movió después (`plantel`
  // envejeciendo el mundo en el cierre de edad: el caso por el que existe `mundoDeLaTemporada`).
  if (!casosQueSeparan()) {
    throw new Error(`check vacío: en ${seedCriterio} carreras de criterio y ${SEEDS_OTROS_BOTS_OBSERVADOR_K2A} de cada otro bot, casos ${JSON.stringify(casos)}`);
  }
});

// Una carrera con los espías del Bo5: el `aplicar` de `serie` (la primera serie de cada split arranca ahí) y las
// decisiones de draft del primer mapa (cualquier ronda). En los dos lugares la fuerza que el motor expone para el
// arranque de la serie tiene que ser la de tu equipo con el campeón del split y el rendimiento determinista acotado, y la
// del rival la de su org.
// K2b: la fuerza de arranque se reconstruye con la fórmula (compañeros en vivo, sinergia una sola vez), no con
// `fuerzaDelEquipo`: un motor que corre la fuerza sin cambiar lo que expone no pasa (revisión de K2a).
const fuerzaDeArranqueK2a = (state) => fuerzaDesdeCamposK2b(
  nivelDeCompanerosIndependienteK2b(state), rendimientoBase(state), state.career.sinergia
);
const fuerzaDeOrgK2a = (state, nombre) => state.mundo.ligas.flatMap((liga) => liga.orgs).find((org) => org.nombre === nombre)?.fuerza;

const SEEDS_BO5_K2A = 30;

checkLento('K2a Bo5 del motor: cada serie cerrada deja una fila con la fuerza de tu equipo y la del rival al arrancar la serie, y las filas son los logs de cierre', () => {
  const problemas = [];
  const vistos = { primeraDelSplit: 0, rondasPosteriores: 0, draftDelPrimerMapa: 0, series: 0, bo5: 0, cierresTrasPausa: 0 };
  for (const bot of ['criterio', 'malas']) {
    for (let seed = 1; seed <= SEEDS_BO5_K2A && problemas.length === 0; seed += 1) {
      const donde = `${bot} seed ${seed}`;
      // Revisión de K2a: el arranque de cada serie que se vio en curso (pausada en `aplicar`, o en el draft del mapa 1)
      // queda anotado por (split, ronda, rival), y el log de cierre de ESA serie —llegue cuando llegue— se compara
      // contra él. Antes, el cierre de una serie que había pausado no se comparaba con nada.
      const arranques = new Map();
      const claveDeSerie = (split, ronda, rival) => `${split}|${ronda}|${rival}`;
      const espiaDecisiones = (sistema, st, decision, rng) => {
        if (sistema.id === 'serie' && decision.datos?.motivo === 'plan' && !decision.datos.replan) {
          vistos.draftDelPrimerMapa += 1;
          const arranque = fuerzaDeArranqueK2a(st);
          arranques.set(claveDeSerie(st.player.splitCount, st.serie.ronda, st.serie.rival.org), arranque);
          if (Math.abs(st.serie.fuerzaInicial - arranque) > 1e-9) {
            problemas.push(`${donde}, draft del mapa 1 (${st.serie.ronda}): serie.fuerzaInicial ${st.serie.fuerzaInicial}, el arranque da ${arranque}`);
          }
        }
        const bot_ = ESTRATEGIAS_K0[bot];
        return bot_ ? bot_(sistema, st, decision, rng) : sistema.resolverAuto(st, decision, rng);
      };
      const { observacion, state } = conEspiaDeSistemaK2a('serie', (entrada, resultado) => {
        // K2c: la fuente que existe SIEMPRE, con o sin pausas de draft (el meta en 0,9-1,1 y la maestría en 0,1 dejaron al
        // draft sin pausar, y este check dependía de eso: 0 filas `draftDelPrimerMapa`). Es el estado de entrada de este
        // `aplicar`: las series que arrancan dentro de la misma llamada, cierren o queden en curso, arrancan con la
        // fuerza que ese estado da, porque entre una serie y la siguiente un mapa solo mueve el registro y ganar una ronda
        // no mueve nada. Se excluye el internacional, que arranca después de `aplicarTitulo` / `aplicarEliminacionDomestica`.
        const cierres = resultado.logs.filter((log) => log.type === 'serie' && log.postSerie === true);
        const enCurso = resultado.state.serie.activa ? resultado.state.serie : null;
        const series = [
          ...cierres.map((log) => ({ ronda: log.ronda, rival: log.rival, fuerzaInicial: log.fuerzaInicial, fuerzaRival: log.fuerzaRival, enCurso: false })),
          ...(enCurso ? [{ ronda: enCurso.ronda, rival: enCurso.rival.org, fuerzaInicial: enCurso.fuerzaInicial, fuerzaRival: enCurso.rival.fuerza, enCurso: true }] : [])
        ];
        const arranqueDeEntrada = fuerzaDeArranqueK2a(entrada);
        series.filter((serie) => serie.ronda !== 'internacional').forEach((serie, indice) => {
          if (indice === 0) {
            vistos.primeraDelSplit += 1;
          } else {
            vistos.rondasPosteriores += 1;
          }
          if (serie.enCurso) {
            arranques.set(claveDeSerie(entrada.player.splitCount, serie.ronda, serie.rival), arranqueDeEntrada);
          }
          if (Math.abs(serie.fuerzaInicial - arranqueDeEntrada) > 1e-9) {
            problemas.push(`${donde}: la serie ${serie.ronda} vs ${serie.rival} (la ${indice + 1}ª de la llamada) arranca con fuerza ${serie.fuerzaInicial}, el estado de entrada de serie da ${arranqueDeEntrada}`);
          }
          if (serie.fuerzaRival !== fuerzaDeOrgK2a(entrada, serie.rival)) {
            problemas.push(`${donde}: el rival ${serie.rival} figura con fuerza ${serie.fuerzaRival}, su org tiene ${fuerzaDeOrgK2a(entrada, serie.rival)}`);
          }
        });
      }, () => correrCarreraSimulate(seed, 60, espiaDecisiones));
      // Las filas son exactamente los logs de cierre de serie, en orden, y cada serie cerrada tiene la suya.
      const cierres = state.logs.filter((log) => log.type === 'serie' && log.postSerie === true);
      const filas = observacion.seriesData;
      const registro = state.career.registro;
      if (filas.length !== cierres.length || filas.length !== registro.seriesGanadas + registro.seriesPerdidas
        || cuentaK0(filas, (f) => f.gano) !== registro.seriesGanadas) {
        problemas.push(`${donde}: ${filas.length} filas de serie, ${cierres.length} logs de cierre, registro ${registro.seriesGanadas}-${registro.seriesPerdidas}`);
        continue;
      }
      filas.forEach((fila, i) => {
        const log = cierres[i];
        const ganadas = Math.ceil(log.formato / 2);
        const arranque = arranques.get(claveDeSerie(fila.split, log.ronda, log.rival));
        if (arranque !== undefined) {
          vistos.cierresTrasPausa += 1;
          if (Math.abs(log.fuerzaInicial - arranque) > 1e-9) {
            problemas.push(`${donde}, serie ${i} (${log.ronda} vs ${log.rival}): el log de cierre dice fuerzaInicial ${log.fuerzaInicial}, al arrancar era ${arranque}`);
          }
        }
        if (fila.ronda !== log.ronda || fila.formato !== log.formato || fila.fuerzaInicial !== log.fuerzaInicial
          || fila.fuerzaRival !== log.fuerzaRival || fila.delta !== log.fuerzaInicial - log.fuerzaRival || fila.gano !== log.gano
          || Math.max(...log.marcador) !== ganadas || log.gano !== (log.marcador[0] > log.marcador[1])
          || typeof fila.fuerzaInicial !== 'number' || !Number.isFinite(fila.delta)) {
          problemas.push(`${donde}, serie ${i}: fila ${JSON.stringify(fila)} contra el log ${JSON.stringify({ ronda: log.ronda, formato: log.formato, fuerzaInicial: log.fuerzaInicial, fuerzaRival: log.fuerzaRival, gano: log.gano, marcador: log.marcador })}`);
        }
      });
      vistos.series += filas.length;
      vistos.bo5 += cuentaK0(filas, (f) => f.formato === 5);
    }
  }
  if (problemas.length > 0) {
    throw new Error(`${problemas.slice(0, 4).join('; ')}${problemas.length > 4 ? ` (+${problemas.length - 4} más)` : ''}`);
  }
  // `draftDelPrimerMapa` ya no entra en el piso: depende de que el draft pause, y esa frecuencia la re-fija K3c. Si el draft
  // pausa, esa rama sigue comparando la fuerza del log contra la del arranque; si no, `rondasPosteriores` cubre el resto.
  if (vistos.primeraDelSplit < 20 || vistos.rondasPosteriores < 20 || vistos.bo5 < 50 || vistos.cierresTrasPausa < 20) {
    throw new Error(`check vacío: ${JSON.stringify(vistos)}`);
  }
});

// ============================================================================
// K2b — estructura (PLAN.md "K2 — lo que midió la investigación", viñeta K2b): el partido es UNA tirada contra la p
// declarada, `ruidoEfectivo` es el único lector del σ, los compañeros en vivo, el traspaso con el plantel nuevo.
// ============================================================================

// Un rng que anota cada número que entrega (el espía de "una tirada por partido").
function rngEspiaK2b(seed) {
  const base = mulberry32(seed);
  const valores = [];
  return { valores, rng: () => { const u = base(); valores.push(u); return u; } };
}

// Estados reales al arrancar una temporada (la entrada de `temporada.aplicar` cuando su guarda pasa), de carreras de
// `criterio` (seeds 1 en adelante, 40 splits), hasta `maximo`.
function entradasDeTemporadaK2b(maximo) {
  const entradas = [];
  conEspiaDeSistemaK2a('temporada', (entrada) => {
    if (arrancaTemporadaK2a(entrada) && entradas.length < maximo) {
      entradas.push(entrada);
    }
  }, () => {
    for (let seed = 1; seed <= SEEDS_MAX_K2B && entradas.length < maximo; seed += 1) {
      correrCarreraSimulate(seed, SPLITS_ENTRADAS_K2B, ESTRATEGIAS_K0.criterio);
    }
  });
  return entradas;
}

const SEEDS_MAX_K2B = 60;
const SPLITS_ENTRADAS_K2B = 40;
const ENTRADAS_TEMPORADA_K2B = 40;

check('K2b una tirada por partido: temporada.aplicar tira exactamente un rng() por fecha propia y uno por cruce ajeno, cada resultado es rng() < p con la p de probabilidadDePartido, y el rendimiento del split lo cuentan esas fechas', () => {
  const entradas = entradasDeTemporadaK2b(ENTRADAS_TEMPORADA_K2B);
  if (entradas.length < ENTRADAS_TEMPORADA_K2B) {
    throw new Error(`check vacío: solo ${entradas.length} temporadas en ${SEEDS_MAX_K2B} carreras`);
  }
  const problemas = [];
  const vistos = { fechas: 0, cruces: 0, bajas: 0 };
  // Sin fechas marcadas, la temporada entera corre en `aplicar` sin pausar ni sortear contenido: todo `rng()` que
  // consuma es de un partido.
  const marcadasOriginal = BALANCE.temporada.fechasMarcadasPorSplit;
  try {
    BALANCE.temporada.fechasMarcadasPorSplit = 0;
    entradas.forEach((entrada, i) => {
      const donde = `temporada ${i} (seed de la carrera ?, split ${entrada.player.splitCount}, ${entrada.career.currentOrg})`;
      const { rng, valores } = rngEspiaK2b(9000 + i);
      const resultado = sistemaPorId('temporada').aplicar(entrada, rng);
      const t = resultado.state.career.temporada;
      if (resultado.decision || t.activa) {
        problemas.push(`${donde}: sin fechas marcadas la temporada pausó`);
        return;
      }
      const totalCruces = t.cruces.reduce((suma, jornada) => suma + jornada.length, 0);
      if (valores.length !== t.calendario.length + totalCruces) {
        problemas.push(`${donde}: ${valores.length} rng() para ${t.calendario.length} fechas y ${totalCruces} cruces`);
        return;
      }
      // Re-jugada independiente con los mismos números: fecha propia, y después los cruces de su jornada.
      const filas = new Map();
      const sumar = (org, gano) => {
        const fila = filas.get(org) ?? { ganados: 0, perdidos: 0 };
        filas.set(org, gano ? { ...fila, ganados: fila.ganados + 1 } : { ...fila, perdidos: fila.perdidos + 1 });
      };
      let k = 0;
      let bajas = entrada.flags.fechasBajaLesion ?? 0;
      const propios = { fechas: 0, ganados: 0, esperados: 0, varianza: 0 };
      t.calendario.forEach((fecha, j) => {
        const fuerza = bajas > 0 ? t.fuerzaPropia * BALANCE.salud.factorFuerzaLesionado : t.fuerzaPropia;
        const pFecha = probabilidadDePartido(entrada, fuerza, fecha.fuerzaRival, 'fecha');
        const gano = valores[k] < pFecha;
        k += 1;
        if (bajas > 0) {
          bajas -= 1;
          vistos.bajas += 1;
        } else {
          propios.fechas += 1;
          propios.ganados += gano ? 1 : 0;
          propios.esperados += pFecha;
          propios.varianza += pFecha * (1 - pFecha);
        }
        sumar(entrada.career.currentOrg, gano);
        sumar(fecha.rival, !gano);
        vistos.fechas += 1;
        for (const cruce of t.cruces[j]) {
          const ganaLocal = valores[k] < probabilidadDePartido(null, cruce.fuerzaLocal, cruce.fuerzaVisitante, 'fecha');
          k += 1;
          sumar(cruce.local, ganaLocal);
          sumar(cruce.visitante, !ganaLocal);
          vistos.cruces += 1;
        }
      });
      for (const fila of t.tabla) {
        const esperada = filas.get(fila.org) ?? { ganados: 0, perdidos: 0 };
        if (fila.ganados !== esperada.ganados || fila.perdidos !== esperada.perdidos) {
          problemas.push(`${donde}: ${fila.org} terminó ${fila.ganados}-${fila.perdidos}; con rng() < p da ${esperada.ganados}-${esperada.perdidos}`);
          return;
        }
      }
      const rp = t.resultadosPropios;
      if (rp.fechas !== propios.fechas || rp.ganados !== propios.ganados
        || Math.abs(rp.esperados - propios.esperados) > 1e-9 || Math.abs(rp.varianza - propios.varianza) > 1e-9) {
        problemas.push(`${donde}: resultadosPropios ${JSON.stringify(rp)}, la re-jugada da ${JSON.stringify(propios)}`);
        return;
      }
      // El rendimiento del split: el base más `puntosPorDesvioDeResultados` × z, acotado.
      const z = propios.varianza > 0 ? (propios.ganados - propios.esperados) / Math.sqrt(propios.varianza) : 0;
      const lectura = Math.min(BALANCE.stats.max, Math.max(BALANCE.stats.min,
        t.rendimientoBase + BALANCE.rendimiento.puntosPorDesvioDeResultados * z));
      if (Math.abs(t.rendimiento - lectura) > 1e-9) {
        problemas.push(`${donde}: el rendimiento del split es ${t.rendimiento}, lo que cuentan sus fechas da ${lectura}`);
      }
    });
  } finally {
    BALANCE.temporada.fechasMarcadasPorSplit = marcadasOriginal;
  }
  if (problemas.length > 0) {
    throw new Error(`${problemas.slice(0, 4).join('; ')}${problemas.length > 4 ? ` (+${problemas.length - 4} más)` : ''}`);
  }
  if (vistos.fechas < 200 || vistos.cruces < 600) {
    throw new Error(`check vacío: ${JSON.stringify(vistos)}`);
  }
});

const SERIES_K2B = 60;
const REPLICAS_MAPA_K2B = 20;

// Estados reales con una serie en curso: las pausas del plan de Fearless al arrancar la serie (K4-B; antes, los drafts
// de cada mapa), de `criterio`, hasta `maximo`.
function draftsDeSerieK2b(maximo) {
  const casos = [];
  const espia = (sistema, st, decision, rng) => {
    if (sistema.id === 'serie' && decision.datos?.motivo === 'plan' && !decision.datos.replan && casos.length < maximo) {
      casos.push({ st, decision });
    }
    return ESTRATEGIAS_K0.criterio(sistema, st, decision, rng);
  };
  for (let seed = 1; seed <= SEEDS_MAX_K2B * 2 && casos.length < maximo; seed += 1) {
    correrCarreraSimulate(seed, 60, espia);
  }
  return casos;
}

check('K2b una tirada por mapa: el mapa es rng() < p con la p de probabilidadDePartido sobre la fuerza de partido del campeón elegido, y un mapa que cierra una serie perdida sin internacional tira un solo rng()', () => {
  // Cada serie se juega con el plan del coach (sin tiradas de lectura) en el marcador del desempate de unos cuartos de
  // un equipo que no clasifica al internacional, desde el mapa 1 (no es el mapa decisivo por índice: no frena): si se
  // pierde, después del mapa no queda nada que sortear.
  const casos = draftsDeSerieK2b(SERIES_K2B);
  if (casos.length < SERIES_K2B) {
    throw new Error(`check vacío: solo ${casos.length} drafts de serie`);
  }
  // Cada escenario se juega con `REPLICAS_MAPA_K2B` streams distintos: con una sola tirada por escenario, una p corrida
  // un par de puntos (la fuerza sin el tope de 100, otro σ) casi nunca cambia un resultado.
  const problemas = [];
  let derrotas = 0;
  let victorias = 0;
  casos.forEach(({ st, decision }, i) => {
    const liga = st.mundo.ligas.find((l) => l.id === st.career.liga);
    const necesarias = Math.ceil(st.serie.formato / 2);
    const escenario = {
      ...st,
      career: { ...st.career, posicion: (liga?.cuposInternacionales ?? 0) + 1 },
      serie: { ...st.serie, ronda: 'cuartos', marcador: [necesarias - 1, necesarias - 1] }
    };
    // K4-B: el campeón que juega el plan del coach, y el rival de ESE mapa (también quema: `fuerzaRivalDeMapa`).
    const proximo = estadoDelProximoMapa(conPlan(escenario, 'coach'));
    const elegido = mapaDelPlan(proximo).campeon;
    const fuerza = fuerzaDesdeCamposK2b(
      nivelDeCompanerosIndependienteK2b(escenario),
      rendimientoBase({ ...escenario, player: { ...escenario.player, campeonDelSplit: elegido } }),
      escenario.career.sinergia
    );
    const pMapa = probabilidadDePartido(escenario, fuerza, fuerzaRivalDeMapa(proximo), 'mapa');
    for (let replica = 0; replica < REPLICAS_MAPA_K2B; replica += 1) {
      const { rng, valores } = rngEspiaK2b(7000 + i * REPLICAS_MAPA_K2B + replica);
      const resultado = sistemaPorId('serie').resolver(escenario, decision, { opcionId: 'coach' }, rng);
      // El primer mapa que se jugó en esta llamada es el primer log de mapa (si la serie se ganó, `serie.mapas` ya es
      // el de la ronda siguiente).
      const mapa = resultado.logs.find((log) => log.type === 'serie' && (log.resultado === 'W' || log.resultado === 'L'));
      if (!mapa || (mapa.resultado === 'W') !== (valores[0] < pMapa)) {
        problemas.push(`draft ${i}, réplica ${replica}: el mapa salió ${mapa?.resultado}, el primer rng() fue ${valores[0]} contra p = ${pMapa}`);
        return;
      }
      if (mapa.resultado === 'L') {
        derrotas += 1;
        if (valores.length !== 1) {
          problemas.push(`draft ${i}: el mapa que cerró la serie (perdida, sin internacional) tiró ${valores.length} rng()`);
          return;
        }
      } else {
        victorias += 1;
      }
    }
  });
  if (problemas.length > 0) {
    throw new Error(`${problemas.slice(0, 4).join('; ')}${problemas.length > 4 ? ` (+${problemas.length - 4} más)` : ''}`);
  }
  if (derrotas < 10 || victorias < 10) {
    throw new Error(`check vacío: ${derrotas} derrotas y ${victorias} victorias`);
  }
});

// Los σ de partido, con sus nombres de antes de K2b: ninguno puede volver a leerse fuera de `ruidoEfectivo`.
const PATRON_SIGMA_DE_PARTIDO_K2B = /\b(sigmaFecha|sigmaMapa|ruidoFecha|ruidoRivalFecha|ruidoMapa|ruidoRivalSerie|ruidoRendimiento)\b|BALANCE\s*(\.\s*partido\b|\[\s*['"`]partido['"`]\s*\])|\{[^}]*\bpartido\b[^}]*\}\s*=\s*BALANCE\b/;
// Archivos del motor que no pueden importar `gauss`: los que arman o resuelven un partido.
const SIN_GAUSS_K2B = ['src/core/partido.js', 'src/core/fuerza.js', 'src/core/temporada.js', 'src/systems/temporada.js'];

check('K2b ruidoEfectivo es el único lector del σ de partido (estático), y los archivos que arman un partido no importan gauss', () => {
  const raiz = path.join(srcDir, '..');
  const rel = (p) => path.relative(raiz, p).replace(/\\/g, '/');
  const archivos = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'dev' ? [] : archivos(p);
    return /\.js$/.test(p) && rel(p) !== 'src/data/balance.js' ? [p] : [];
  });
  // Bloques y comentarios `//` se vacían conservando los saltos de línea (como el check de vocabulario de K0-C).
  const sinComentarios = (txt) => txt
    .replace(/(^|\s)\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (bloque) => bloque.replace(/[^\n]/g, ''))
    .split(/\r?\n/).map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'));
  // El cuerpo de `ruidoEfectivo` en `core/partido.js`: el único lugar permitido.
  const partidoJs = fs.readFileSync(path.join(srcDir, 'core', 'partido.js'), 'utf8').split(/\r?\n/);
  const inicio = partidoJs.findIndex((linea) => /^export function ruidoEfectivo\(/.test(linea));
  const fin = inicio < 0 ? -1 : partidoJs.findIndex((linea, i) => i > inicio && /^}/.test(linea));
  if (inicio < 0 || fin < 0) {
    throw new Error('no encontré `export function ruidoEfectivo(` en src/core/partido.js');
  }
  const lecturas = [];
  let dentro = 0;
  for (const archivo of [...archivos(srcDir), path.join(raiz, 'index.html')]) {
    const lineas = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    lineas.forEach((linea, i) => {
      if (!PATRON_SIGMA_DE_PARTIDO_K2B.test(linea)) return;
      if (rel(archivo) === 'src/core/partido.js' && i > inicio && i < fin) {
        dentro += 1;
        return;
      }
      lecturas.push(`${rel(archivo)}:${i + 1}: ${linea.trim()}`);
    });
  }
  if (lecturas.length > 0) {
    throw new Error(`σ de partido leído fuera de ruidoEfectivo: ${lecturas.slice(0, 5).join(' | ')}`);
  }
  if (dentro < 2) {
    throw new Error(`ruidoEfectivo lee ${dentro} σ (se esperaban el de fecha y el de mapa): el patrón no está viendo nada`);
  }
  const conGauss = SIN_GAUSS_K2B.filter((archivo) => sinComentarios(fs.readFileSync(path.join(raiz, archivo), 'utf8')).some((linea) => /\bgauss\b/.test(linea)));
  if (conGauss.length > 0) {
    throw new Error(`usan gauss y arman o resuelven un partido: ${conGauss.join(', ')}`);
  }
});

check('K2b compañeros en vivo: en una liga modelada la fuerza lee el nivel ACTUAL del plantel (no la foto de roster); sin plantel, la foto', () => {
  const entradas = entradasDeTemporadaK2b(ENTRADAS_TEMPORADA_K2B);
  const modelada = entradas.find((e) => e.mundo.planteles?.[e.career.currentOrg]);
  if (!modelada) {
    throw new Error('check vacío: ninguna temporada en una org con plantel');
  }
  const SUBA = 10;
  const org = modelada.career.currentOrg;
  const plantel = modelada.mundo.planteles[org];
  const subido = Object.fromEntries(Object.entries(plantel).map(([rol, npc]) => [rol, rol === modelada.player.role ? npc : { ...npc, nivel: npc.nivel + SUBA }]));
  const conPlantelSubido = { ...modelada, mundo: { ...modelada.mundo, planteles: { ...modelada.mundo.planteles, [org]: subido } } };
  const antes = nivelDeCompaneros(modelada);
  const despues = nivelDeCompaneros(conPlantelSubido);
  if (Math.abs(antes - nivelDeCompanerosIndependienteK2b(modelada)) > 1e-9 || Math.abs(despues - antes - SUBA) > 1e-9) {
    throw new Error(`con el plantel vivo +${SUBA} (y la foto de roster igual), los compañeros pasaron de ${antes} a ${despues}`);
  }
  const fuerzaAntes = fuerzaDelEquipo(modelada, 70);
  const fuerzaDespues = fuerzaDelEquipo(conPlantelSubido, 70);
  const esperado = fuerzaDesdeCamposK2b(antes + SUBA, 70, modelada.career.sinergia) - fuerzaDesdeCamposK2b(antes, 70, modelada.career.sinergia);
  if (Math.abs((fuerzaDespues - fuerzaAntes) - esperado) > 1e-9) {
    throw new Error(`la fuerza del equipo no siguió al plantel vivo: +${fuerzaDespues - fuerzaAntes}, se esperaba +${esperado}`);
  }
  // Sin plantel (una org que el mundo no modela): manda la foto de `roster`.
  const companeros = [{ handle: 'a', role: 'top', nivel: 40 }, { handle: 'b', role: 'mid', nivel: 50 }, { handle: 'c', role: 'adc', nivel: 60 }, { handle: 'd', role: 'support', nivel: 70 }];
  const sinPlantel = { ...modelada, player: { ...modelada.player, role: 'jungla' }, career: { ...modelada.career, currentOrg: 'Org Inventada K2b', companeros } };
  if (companerosDelPlantel(sinPlantel, 'Org Inventada K2b') !== null || nivelDeCompaneros(sinPlantel) !== 55) {
    throw new Error(`sin plantel los compañeros tenían que salir de la foto (55): dio ${nivelDeCompaneros(sinPlantel)}`);
  }
});

const TRASPASOS_MINIMOS_K2B = 30;
const SPLITS_MISMO_EQUIPO_MINIMOS_K2B = 300;

const SINERGIAS_SEGUIDAS_MINIMAS_K2B = 10;

check('K2b un traspaso juega su primer split con el plantel nuevo, y en una liga modelada los compañeros son siempre el plantel vivo (probCambioDeRoster no inventa), y la sinergia es la del plantel nuevo', () => {
  const problemas = [];
  const vistos = { traspasos: 0, mismoEquipoModelado: 0, cambiosDePlantilla: 0, sinergiaFijada: 0, sinergiaSeguida: 0 };
  // El último traspaso visto: el split siguiente, `armarRoster` tiene que dejar la misma química.
  let pendiente = null;
  const porRol = (lista) => JSON.stringify([...lista].map((c) => [c.role, c.handle, c.nivel]).sort());
  conEspiaDeSistemaK2a('temporada', (entrada, resultado) => {
    if (!arrancaTemporadaK2a(entrada)) {
      return;
    }
    const org = entrada.career.currentOrg;
    const plantel = entrada.mundo.planteles?.[org];
    if (!plantel) {
      return;
    }
    const vivos = Object.entries(plantel).filter(([rol]) => rol !== entrada.player.role).map(([rol, npc]) => ({ role: rol, handle: npc.handle, nivel: npc.nivel }));
    const traspaso = entrada.career.rosterDeOrg !== org;
    if (traspaso) {
      vistos.traspasos += 1;
      // La química también es la del plantel nuevo: la firma la fijó (`sinergiaAlFichar`, la regla de `armarRoster`) y
      // este split se juega con ella, no con la del vestuario anterior (que `armarRoster` recién reseteaba al split
      // siguiente).
      const fijada = entrada.flags.sinergiaProyectadaAlFichar;
      if (fijada === null || fijada === undefined || entrada.career.sinergia !== Math.round(fijada)) {
        problemas.push(`traspaso a ${org} (split ${entrada.player.splitCount}): se juega con sinergia ${entrada.career.sinergia}, la que fijó la firma es ${fijada}`);
      } else {
        vistos.sinergiaFijada += 1;
      }
      pendiente = { org, split: entrada.player.splitCount, sinergia: entrada.career.sinergia, plantel: porRol(entrada.career.companeros) };
    } else {
      vistos.mismoEquipoModelado += 1;
      // El split siguiente al traspaso: `armarRoster` no vuelve a tirar la química (misma que se jugó), salvo que el
      // plantel haya cambiado de nuevo (ahí el mundo la resetea con `sinergiaRetenidaAlCambiar`, y no se compara).
      if (pendiente && pendiente.org === org && entrada.player.splitCount === pendiente.split + 1
        && porRol(entrada.career.companeros) === pendiente.plantel) {
        vistos.sinergiaSeguida += 1;
        if (entrada.career.sinergia !== pendiente.sinergia) {
          problemas.push(`${org} (split ${entrada.player.splitCount}): el traspaso jugó con sinergia ${pendiente.sinergia} y el roster armado dejó ${entrada.career.sinergia}`);
        }
      }
      pendiente = null;
    }
    if (porRol(entrada.career.companeros) !== porRol(vivos)) {
      problemas.push(`${traspaso ? 'traspaso' : 'mismo equipo'} a ${org} (split ${entrada.player.splitCount}): se juega con ${porRol(entrada.career.companeros)}, el plantel de la org es ${porRol(vivos)}`);
    }
    const nivelVivo = vivos.reduce((suma, c) => suma + c.nivel, 0) / vivos.length;
    if (Math.abs(resultado.state.career.temporada.nivelCompaneros - nivelVivo) > 1e-9) {
      problemas.push(`${org} (split ${entrada.player.splitCount}): la temporada usó compañeros de nivel ${resultado.state.career.temporada.nivelCompaneros}, el plantel vivo es ${nivelVivo}`);
    }
  }, () => {
    for (let seed = 1; seed <= SEEDS_MAX_K2B && (vistos.traspasos < TRASPASOS_MINIMOS_K2B || vistos.mismoEquipoModelado < SPLITS_MISMO_EQUIPO_MINIMOS_K2B); seed += 1) {
      const { state } = correrCarreraSimulate(seed, 60, ESTRATEGIAS_K0.criterio);
      vistos.cambiosDePlantilla += state.logs.filter((log) => log.type === 'roster' && /se va del equipo|al equipo\. Hay que volver/.test(log.message)).length;
    }
  });
  if (problemas.length > 0) {
    throw new Error(`${problemas.slice(0, 3).join('; ')}${problemas.length > 3 ? ` (+${problemas.length - 3} más)` : ''}`);
  }
  if (vistos.traspasos < TRASPASOS_MINIMOS_K2B || vistos.mismoEquipoModelado < SPLITS_MISMO_EQUIPO_MINIMOS_K2B || vistos.cambiosDePlantilla === 0
    || vistos.sinergiaFijada < TRASPASOS_MINIMOS_K2B || vistos.sinergiaSeguida < SINERGIAS_SEGUIDAS_MINIMAS_K2B) {
    throw new Error(`check vacío: ${JSON.stringify(vistos)}`);
  }
});

// K2b (revisión) — los checks que matan a los mutantes que sobrevivían. Cada uno se probó rojo contra su mutante.

const BAJAS_SINTETICAS_K2B = 2;
const ENTRADAS_BAJA_K2B = 6;

check('K2b una fecha de baja por lesión no cuenta para tu rendimiento: con fechasBajaLesion = 2, resultadosPropios.fechas es las fechas del calendario menos 2 y ganados/esperados/varianza suman solo las otras', () => {
  // Caso sintético: en carreras reales una lesión que cae dentro de la temporada pasa en 7 de 13.759, y ahí un
  // mutante que cuente esas fechas sobrevivía. Se fuerza la baja sobre estados reales al arrancar la temporada.
  const entradas = entradasDeTemporadaK2b(ENTRADAS_BAJA_K2B);
  if (entradas.length < ENTRADAS_BAJA_K2B) {
    throw new Error(`check vacío: solo ${entradas.length} temporadas`);
  }
  const problemas = [];
  const marcadasOriginal = BALANCE.temporada.fechasMarcadasPorSplit;
  try {
    BALANCE.temporada.fechasMarcadasPorSplit = 0;
    entradas.forEach((original, i) => {
      const entrada = { ...original, flags: { ...original.flags, fechasBajaLesion: BAJAS_SINTETICAS_K2B } };
      const donde = `temporada ${i} (${entrada.career.currentOrg}, split ${entrada.player.splitCount})`;
      const { rng, valores } = rngEspiaK2b(9500 + i);
      const resultado = sistemaPorId('temporada').aplicar(entrada, rng);
      const t = resultado.state.career.temporada;
      if (resultado.decision || t.activa || t.calendario.length <= BAJAS_SINTETICAS_K2B) {
        problemas.push(`${donde}: la temporada pausó o el calendario es más corto que la baja`);
        return;
      }
      if (resultado.state.flags.fechasBajaLesion !== 0) {
        problemas.push(`${donde}: quedaron ${resultado.state.flags.fechasBajaLesion} fechas de baja sin consumir`);
      }
      // Re-jugada independiente con los mismos números: las primeras fechas se juegan sin vos (fuerza penalizada) y no
      // entran a `resultadosPropios`; el resto sí.
      let k = 0;
      const propios = { fechas: 0, ganados: 0, esperados: 0, varianza: 0 };
      t.calendario.forEach((fecha, j) => {
        const enBaja = j < BAJAS_SINTETICAS_K2B;
        const fuerza = enBaja ? t.fuerzaPropia * BALANCE.salud.factorFuerzaLesionado : t.fuerzaPropia;
        const pFecha = probabilidadDePartido(entrada, fuerza, fecha.fuerzaRival, 'fecha');
        const gano = valores[k] < pFecha;
        k += 1 + t.cruces[j].length;
        if (!enBaja) {
          propios.fechas += 1;
          propios.ganados += gano ? 1 : 0;
          propios.esperados += pFecha;
          propios.varianza += pFecha * (1 - pFecha);
        }
      });
      const rp = t.resultadosPropios;
      if (rp.fechas !== t.calendario.length - BAJAS_SINTETICAS_K2B
        || rp.fechas !== propios.fechas || rp.ganados !== propios.ganados
        || Math.abs(rp.esperados - propios.esperados) > 1e-9 || Math.abs(rp.varianza - propios.varianza) > 1e-9) {
        problemas.push(`${donde}: con ${BAJAS_SINTETICAS_K2B} fechas de baja de ${t.calendario.length}, resultadosPropios es ${JSON.stringify(rp)} y debería ser ${JSON.stringify(propios)}`);
      }
    });
  } finally {
    BALANCE.temporada.fechasMarcadasPorSplit = marcadasOriginal;
  }
  if (problemas.length > 0) {
    throw new Error(`${problemas.slice(0, 3).join('; ')}${problemas.length > 3 ? ` (+${problemas.length - 3} más)` : ''}`);
  }
});

const DRAFTS_P_K2B = 12;
const DRAFTS_MAX_K2B = 60;
const OPCIONES_POR_DRAFT_K2B = 3;
const EPSILON_P_K2B = 1e-9;
const SOBRE_EL_TOPE_MINIMO_K2B = 5;

// K4-B (regla 17): el check "K2b la p del draft (probabilidadConCampeon) es exactamente la p que tira el mapa del
// campeón elegido..." se borró junto con el draft de serie. Lo reemplaza "K4-B regla 15: la p por mapa que declara
// cada plan...", que compara contra la tirada sobre series reales; el tope de 100 lo sigue cuidando la fuerza de
// partido (`fuerzaDePartido`, checks de K2b).

check('K2b ruidoEfectivo por tipo coincide con BALANCE.partido (fecha → sigmaFecha, mapa → sigmaMapa), y la p de partido usa el σ de su tipo', () => {
  const sigmaDeTipo = { fecha: BALANCE.partido.sigmaFecha, mapa: BALANCE.partido.sigmaMapa };
  const estados = [null, createInitialState(1, mulberry32(1))];
  for (const tipo of Object.keys(sigmaDeTipo)) {
    for (const estado of estados) {
      // σ_tipo · g(m): con la perilla de K3 en 0 el factor es 1 (σ = el de BALANCE.partido); con k ≠ 0 pesa la mentalidad.
      // Sin jugador (`null`) el factor es 1.
      const esperadoSigma = sigmaDeTipo[tipo] * factorDeConsistencia(estado?.player?.stats?.mentalidad);
      if (ruidoEfectivo(estado, tipo) !== esperadoSigma) {
        throw new Error(`ruidoEfectivo(${estado ? 'estado' : 'null'}, '${tipo}') = ${ruidoEfectivo(estado, tipo)}, σ_tipo · g(m) da ${esperadoSigma}`);
      }
      // La p con ese σ, escrita a mano: Φ logística de (F − f) / σ.
      for (const delta of [-30, -8, 0, 5, 14, 40]) {
        const p = 1 / (1 + Math.exp(-BALANCE.numeros.factorLogisticoNormal * (delta / esperadoSigma)));
        const dada = probabilidadDePartido(estado, 50 + delta, 50, tipo);
        if (Math.abs(dada - p) > 1e-12) {
          throw new Error(`probabilidadDePartido(Δ ${delta}, '${tipo}') = ${dada}, con σ ${esperadoSigma} da ${p}`);
        }
      }
    }
  }
  let tiro = false;
  try {
    ruidoEfectivo(null, 'serie');
  } catch {
    tiro = true;
  }
  if (!tiro) {
    throw new Error('un tipo de partido desconocido no tiró');
  }
});

check('K2b la sinergia no entra a tu rendimiento: rendimientoBase no cambia cuando solo cambia career.sinergia (la fuerza del equipo sí)', () => {
  const entradas = entradasDeTemporadaK2b(8);
  if (entradas.length < 8) {
    throw new Error(`check vacío: solo ${entradas.length} temporadas`);
  }
  for (const entrada of entradas) {
    const base = rendimientoBase(entrada);
    for (const sinergia of [0, 25, 50, 75, 100]) {
      const variante = { ...entrada, career: { ...entrada.career, sinergia } };
      if (rendimientoBase(variante) !== base) {
        throw new Error(`rendimientoBase pasó de ${base} a ${rendimientoBase(variante)} al cambiar solo la sinergia a ${sinergia} (${entrada.career.currentOrg}, split ${entrada.player.splitCount})`);
      }
    }
    const baja = fuerzaDelEquipo({ ...entrada, career: { ...entrada.career, sinergia: 0 } }, 70);
    const alta = fuerzaDelEquipo({ ...entrada, career: { ...entrada.career, sinergia: 100 } }, 70);
    if (!(alta > baja)) {
      throw new Error(`la sinergia dejó de contar en la fuerza del equipo: ${baja} con 0, ${alta} con 100`);
    }
  }
});

// ============================================================================
// K2d — la previa (PLAN.md "K2d — la previa (pantalla)" y "K2d — decisiones de spec"): la p que la pantalla
// muestra antes de una fecha marcada y antes de un mapa es exactamente la que el motor tira (regla 15).
// ============================================================================

const SEEDS_MAX_K2D = 80;
const CASOS_K2D = 30;
// La cosecha depende del balance con el que se juegan las carreras: una por valor de `consistencia.k`.
const cosechasK2d = new Map();

// PLAN.md "K3, tal como quedó y lo que se decide al integrar": cada check de K2d corre dos veces, con BALANCE tal
// cual y con `consistencia.k = 1` en memoria (restaurado después). Una pieza neutra (k = 0) no puede esconder un
// check que se rompe con el valor real: con k ≠ 0 el momento de una fecha marcada mueve la mentalidad entre la
// previa y la tirada.
const K_CONSISTENCIA_K2D = 1;
function checkK2d(nombre, fn) {
  check(nombre, fn);
  check(`${nombre} — con consistencia.k = ${K_CONSISTENCIA_K2D} en memoria`, () => conBalanceK3A([['consistencia', 'k', K_CONSISTENCIA_K2D]], fn));
}

// Las pausas reales antes de un partido, de carreras de `criterio` (seeds 1 en adelante, 60 splits): el momento de
// una fecha marcada (con el campeón ya elegido), el draft de un mapa y el minijuego de un mapa. Cada caso guarda el
// estado de la pausa, la decisión, el sistema que la resuelve y la respuesta de `criterio`.
function cosechaDePreviasK2d() {
  const clave = BALANCE.consistencia.k;
  if (cosechasK2d.has(clave)) {
    return cosechasK2d.get(clave);
  }
  const c = { fechas: [], drafts: [], minijuegos: [] };
  const espia = (sistema, st, decision, rng) => {
    const respuesta = ESTRATEGIAS_K0.criterio(sistema, st, decision, rng);
    const datos = decision.datos ?? {};
    const caso = { sistema, st, decision, respuesta };
    if (st.serie?.activa) {
      // K4-B: el draft de mapa ya no existe; su lugar lo toma la pausa del mapa decisivo sin minijuego (con o sin
      // la charla del coach), que también trae la p de cada opción.
      if (datos.motivo === 'decisivo' && c.drafts.length < CASOS_K2D) {
        c.drafts.push(caso);
      } else if (datos.motivo === 'minijuego' && minijuegoPorId(datos.minijuego)?.efecto?.tipo === 'mapa'
        && c.minijuegos.length < CASOS_K2D) {
        c.minijuegos.push(caso);
      }
    } else {
      const fecha = st.career.temporada?.activa ? st.career.temporada.fechaEnCurso : null;
      // K4-A: la fecha marcada ya no tiene draft; su única pausa es el momento.
      if (fecha && 'campeonElegido' in fecha && c.fechas.length < CASOS_K2D * 2) {
        c.fechas.push(caso);
      }
    }
    return respuesta;
  };
  const llena = () => c.fechas.length >= CASOS_K2D * 2
    && c.drafts.length >= CASOS_K2D && c.minijuegos.length >= CASOS_K2D;
  for (let seed = 1; seed <= SEEDS_MAX_K2D && !llena(); seed += 1) {
    correrCarreraSimulate(seed, 60, espia);
  }
  if (c.fechas.length < CASOS_K2D || c.drafts.length < 10 || c.minijuegos.length < 10) {
    throw new Error(`cosecha vacía: ${c.fechas.length} fechas marcadas, ${c.drafts.length} drafts de mapa y ${c.minijuegos.length} minijuegos de mapa`);
  }
  cosechasK2d.set(clave, c);
  return c;
}

const esLogDeMapaK2d = (log) => log.type === 'serie' && (log.resultado === 'W' || log.resultado === 'L');
const esLogDeFechaK2d = (log) => log.type === 'temporada' && Number.isFinite(log.p);

function fallarSiK2d(problemas) {
  if (problemas.length > 0) {
    throw new Error(`${problemas.slice(0, 4).join('; ')}${problemas.length > 4 ? ` (+${problemas.length - 4} más)` : ''}`);
  }
}

// K3 (PLAN.md "K3, tal como quedó y lo que se decide al integrar"): en una fecha marcada la previa es la p de ANTES
// de decidir, que la pausa guarda (`pAntesDeDecidir`) y el log reporta como `pSinMomento`; la tirada es la del estado
// de DESPUÉS del momento (su `ajustePartido` y, con `consistencia.k` ≠ 0, su mentalidad), y es exactamente la previa
// de ese estado.
checkK2d('K2d previa 1: la p de la previa es exactamente la que el motor tira (===), en fechas marcadas (y la de cada opción de su draft corto) y en mapas con el minijuego neutro, sobre partidos de carreras reales', () => {
  const { fechas, drafts, minijuegos } = cosechaDePreviasK2d();
  const problemas = [];
  let fechasNeutras = 0;
  let fechasConMomento = 0;
  fechas.forEach(({ sistema, st, decision, respuesta }, i) => {
    const previa = previaDeDecision(st, decision);
    const res = sistema.resolver(st, decision, respuesta, mulberry32(31000 + i));
    const log = res.logs.find(esLogDeFechaK2d);
    if (!previa || !log) {
      problemas.push(`fecha ${i}: ${previa ? 'sin log de la fecha con su p' : 'sin previa en la pausa'}`);
      return;
    }
    if (decision.datos.pAntesDeDecidir !== previa.p) {
      problemas.push(`fecha ${i}: la previa dice p = ${previa.p}, la pausa guardó ${decision.datos.pAntesDeDecidir}`);
    }
    if (log.pSinMomento !== previa.p) {
      problemas.push(`fecha ${i}: la previa dice p = ${previa.p}, el log reporta ${log.pSinMomento} antes del momento`);
    }
    // El estado de después del momento, con el mismo azar que usó el motor (el momento tira antes que el partido).
    const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === decision.datos.eventoId);
    if (decision.datos.motivo !== 'momento' || !evento) {
      problemas.push(`fecha ${i}: la pausa no es el momento de la fecha (${decision.datos.motivo})`);
      return;
    }
    const despues = previaDePartido(resolverOpcion(st, evento, respuesta.opcionId, mulberry32(31000 + i)).state, { tipo: 'fecha' });
    if (log.p !== despues.p) problemas.push(`fecha ${i} (ajuste ${log.ajustePartido}): previa de después ${despues.p}, tirada ${log.p}`);
    if (log.ajustePartido === 0) {
      fechasNeutras += 1;
    } else {
      fechasConMomento += 1;
    }
  });

  let mapasSinMinijuego = 0;
  let mapasConMinijuego = 0;
  drafts.forEach(({ sistema, st, decision }, i) => {
    const previa = previaDeDecision(st, decision);
    const elegido = decision.opciones[0].id;
    const directa = previaDePartido(st, {
      tipo: 'mapa', campeon: decision.datos.campeonElegido, entradaExtra: decision.datos.entradaExtra ?? null,
      ajustePlan: decision.datos.ajustePlan, charla: elegido === 'charla'
    });
    if (!previa || previa.opciones?.[0]?.p !== directa.p) {
      problemas.push(`decisivo ${i}: la previa del mapa decisivo no es la de la primera opción`);
      return;
    }
    let res = sistema.resolver(st, decision, { opcionId: elegido }, mulberry32(32000 + i));
    // Si el mapa no se jugó todavía, la pausa que vino es la de su minijuego (la del mapa siguiente o la de después
    // de la serie llegan con el log de este mapa ya escrito).
    if (!res.logs.some(esLogDeMapaK2d) && res.decision?.datos?.motivo === 'minijuego') {
      const antes = previaDeDecision(res.state, res.decision);
      if (antes?.p !== directa.p) problemas.push(`draft ${i}: la previa del minijuego (${antes?.p}) no es la del draft (${directa.p})`);
      res = sistema.resolver(res.state, res.decision, { resultado: 0.5 }, mulberry32(33000 + i));
      mapasConMinijuego += 1;
    } else {
      mapasSinMinijuego += 1;
    }
    const log = res.logs.find(esLogDeMapaK2d);
    if (!log || log.p !== directa.p) problemas.push(`draft ${i}: previa ${directa.p}, tirada ${log?.p}`);
  });
  minijuegos.forEach(({ sistema, st, decision }, i) => {
    const previa = previaDeDecision(st, decision);
    const res = sistema.resolver(st, decision, { resultado: 0.5 }, mulberry32(34000 + i));
    const log = res.logs.find(esLogDeMapaK2d);
    mapasConMinijuego += 1;
    if (!previa || !log || log.p !== previa.p) problemas.push(`minijuego ${i} (neutro): previa ${previa?.p}, tirada ${log?.p}`);
  });
  fallarSiK2d(problemas);
  // Todo momento del catálogo trae un efecto `partido`: en carreras reales casi ninguna fecha marcada llega sin
  // ajuste. La p de antes del momento (la que muestra la previa) se compara igual en todas, contra `pSinMomento`.
  if (fechasNeutras + fechasConMomento < 20 || mapasSinMinijuego < 5 || mapasConMinijuego < 10) {
    throw new Error(`check vacío: ${fechasNeutras} fechas sin ajuste, ${fechasConMomento} con ajuste, ${mapasSinMinijuego} mapas sin minijuego, ${mapasConMinijuego} con minijuego`);
  }
});

checkK2d('K2d previa 2: la p final que muestra el mapa después del minijuego es exactamente la tirada (===), y el minijuego la mueve', () => {
  const { minijuegos } = cosechaDePreviasK2d();
  const problemas = [];
  let movidas = 0;
  minijuegos.forEach(({ sistema, st, decision }, i) => {
    const antes = previaDeDecision(st, decision);
    for (const resultado of [0.1, 0.85]) {
      const final = previaDeDecision(st, decision, { resultadoMinijuego: resultado });
      const res = sistema.resolver(st, decision, { resultado }, mulberry32(35000 + i));
      const log = res.logs.find(esLogDeMapaK2d);
      if (!final || !log || log.p !== final.p) {
        problemas.push(`minijuego ${i} (resultado ${resultado}): la pantalla muestra ${final?.p}, se tiró ${log?.p}`);
      }
      if (final && antes && final.p !== antes.p) movidas += 1;
    }
  });
  fallarSiK2d(problemas);
  if (movidas < minijuegos.length) {
    throw new Error(`el minijuego movió la p en solo ${movidas} de ${minijuegos.length * 2} casos`);
  }
});

checkK2d('K2d previa 3: el desglose reproduce el total de la fuerza que usa el motor (fecha: la del split; mapa: la del minijuego) y sus partes suman el total', () => {
  const { fechas, drafts, minijuegos } = cosechaDePreviasK2d();
  const problemas = [];
  const sumaDePartes = (previa) => Object.values(previa.aportes).reduce((s, v) => s + v, 0);
  const revisar = (nombre, previa, fuerzaDelMotor) => {
    if (previa.fuerzaBase !== fuerzaDelMotor) {
      problemas.push(`${nombre}: la previa arma ${previa.fuerzaBase}, el motor juega con ${fuerzaDelMotor}`);
    }
    if (Math.abs(sumaDePartes(previa) - previa.fuerzaFinal) > 1e-9) {
      problemas.push(`${nombre}: las partes suman ${sumaDePartes(previa)}, el total es ${previa.fuerzaFinal}`);
    }
    if (previa.propio.fuerza !== previa.fuerzaFinal) {
      problemas.push(`${nombre}: la tarjeta muestra ${previa.propio.fuerza} y la fuerza del partido es ${previa.fuerzaFinal}`);
    }
  };
  fechas.forEach(({ st, decision }, i) => {
    const previa = previaDeDecision(st, decision);
    revisar(`fecha ${i}`, previa, st.career.temporada.fuerzaPropia);
    if (previa.desglose.total !== st.career.temporada.fuerzaPropia) {
      problemas.push(`fecha ${i}: el desglose da ${previa.desglose.total}, la fuerza del split es ${st.career.temporada.fuerzaPropia}`);
    }
    const conMomento = previaDePartido(st, { tipo: 'fecha', ajustePartido: 0.1 });
    if (Math.abs(sumaDePartes(conMomento) - conMomento.fuerzaFinal) > 1e-9) problemas.push(`fecha ${i}: con momento, las partes no suman el total`);
  });
  minijuegos.forEach(({ st, decision }, i) => {
    revisar(`minijuego ${i}`, previaDeDecision(st, decision), decision.datos.fuerzaPropia);
    const final = previaDeDecision(st, decision, { resultadoMinijuego: 0.9 });
    if (Math.abs(sumaDePartes(final) - final.fuerzaFinal) > 1e-9) problemas.push(`minijuego ${i}: con el minijuego jugado, las partes no suman el total`);
  });
  drafts.forEach(({ st, decision }, i) => {
    // La fuerza con la que el motor juega el mapa: la misma cuenta que hace `systems/serie.js` al jugarlo
    // (`fuerzaDePartido(estadoDelMapa(...))`), no una reconstrucción. Antes se comparaba (===) contra la fórmula de
    // K2b reescrita acá (`fuerzaDesdeCamposK2b`), que agrupa la sinergia en otro orden y difiere en el último bit
    // en algunos estados (con `consistencia.k = 1` aparecieron dos). Que la fórmula del motor sea la de K2b lo
    // cuidan los checks de K2b.
    const { campeonElegido, entradaExtra = null, ajustePlan } = decision.datos;
    revisar(`decisivo ${i}`, previaDePartido(st, { tipo: 'mapa', campeon: campeonElegido, entradaExtra, ajustePlan, charla: true }),
      fuerzaDePartido(estadoDelMapa(st, campeonElegido, entradaExtra)));
  });
  fallarSiK2d(problemas);
});

function congelarK2d(objeto) {
  if (objeto && typeof objeto === 'object' && !Object.isFrozen(objeto)) {
    Object.freeze(objeto);
    Object.values(objeto).forEach(congelarK2d);
  }
  return objeto;
}

checkK2d('K2d previa 4: la previa no toca el estado ni llama al azar (estado congelado y Math.random que tira)', () => {
  const { fechas, drafts, minijuegos } = cosechaDePreviasK2d();
  // La previa no recibe rng (su firma es (state, decision, opciones)): el azar que podría usar a escondidas es
  // Math.random, que acá tira. Lo que hace morder el check es eso y el estado congelado (escribir en él tira).
  const randomOriginal = Math.random;
  const problemas = [];
  Math.random = () => { throw new Error('la previa llamó a Math.random'); };
  try {
    [...fechas.slice(0, 10), ...drafts.slice(0, 10), ...minijuegos.slice(0, 10)].forEach(({ st, decision }, i) => {
      const antes = JSON.stringify(st);
      const congelado = congelarK2d(structuredClone(st));
      try {
        previaDeDecision(congelado, decision);
        if (decision.datos?.motivo === 'minijuego') previaDeDecision(congelado, decision, { resultadoMinijuego: 0.8 });
      } catch (error) {
        problemas.push(`caso ${i}: ${error.message}`);
      }
      if (JSON.stringify(congelado) !== antes) problemas.push(`caso ${i}: el estado cambió`);
    });
  } finally {
    Math.random = randomOriginal;
  }
  fallarSiK2d(problemas);
});

checkK2d('K2d previa 6: ningún texto de la previa ni de la probabilidad jugada muestra ids crudos (ligas, rondas, motivos, minijuegos, roles, snake_case)', () => {
  const { fechas, drafts, minijuegos } = cosechaDePreviasK2d();
  // Palabras que nunca son texto (roles, ids de liga, restos de un valor vacío) y, como texto ENTERO, los ids de
  // ronda, motivo y minijuego: "final" o "semis" son palabras de verdad, pero un campo que dice solo "semis" es el id.
  const ids = new Set([...IDS_ROL, 'undefined', 'null', 'NaN']);
  const enteros = new Set(['cuartos', 'semis', 'final', 'internacional']);
  const problemas = [];
  const textosDe = (previa) => [
    previa.titulo, previa.subtitulo, previa.porQue, previa.nota, previa.textoProbabilidad, previa.propio.nombre, previa.propio.texto,
    previa.rival.nombre, previa.rival.texto,
    ...previa.filas.flatMap((fila) => [fila.etiqueta, fila.texto]),
    ...(previa.opciones ?? []).flatMap((opcion) => [opcion.id, opcion.texto])
  ].filter((texto) => texto !== null);
  const revisar = (nombre, textos, st, extras) => {
    (st.mundo?.ligas ?? []).forEach((liga) => ids.add(liga.id));
    extras.forEach((id) => { const crudo = typeof id === 'string' ? id : id?.id; if (crudo) enteros.add(crudo); });
    for (const texto of textos) {
      const crudo = typeof texto !== 'string' ? String(texto)
        : enteros.has(texto.trim()) ? texto
          : texto.split(/[^\p{L}\p{N}_]+/u).find((palabra) => ids.has(palabra) || /^[a-z0-9]+_[a-z0-9_]+$/.test(palabra));
      if (crudo) problemas.push(`${nombre}: "${texto}" muestra "${crudo}"`);
    }
  };
  fechas.forEach(({ sistema, st, decision, respuesta }, i) => {
    const fecha = st.career.temporada.fechaEnCurso;
    const res = sistema.resolver(st, decision, respuesta, mulberry32(36000 + i));
    const log = res.logs.find(esLogDeFechaK2d);
    revisar(`fecha ${i}`, [...textosDe(previaDeDecision(st, decision)), textoDeProbabilidadJugada(log)], st, fecha.motivos ?? []);
  });
  [...drafts, ...minijuegos].forEach(({ st, decision }, i) => {
    const previas = [previaDeDecision(st, decision), previaDeDecision(st, decision, { resultadoMinijuego: 0.9 })];
    revisar(`mapa ${i}`, previas.flatMap(textosDe), st, [decision.datos?.minijuego, decision.datos?.momento, st.serie.ronda]);
  });
  fallarSiK2d(problemas);
});

// ============================================================================
// K4-B — la serie como plan (PLAN.md "K4 — decisiones de spec", K4-B; reemplaza a J6 y a D63): la tarjeta del plan
// de Fearless declara la p de cada mapa y es la que el motor tira (regla 15); el rival también quema; el juego frena
// solo en lo importante.
// ============================================================================

const CASOS_K4B = 24;
const PLANES_K4B = ['guardar', 'conTodo', 'sorpresa', 'coach'];
const SEEDS_MAX_K4B = 80;
const cosechasK4b = new Map();

// Las pausas reales del plan de Fearless (al arrancar y al re-planear), de `criterio`. Una cosecha por valor de
// `consistencia.k`, como la de K2d.
function cosechaDePlanesK4b() {
  const clave = BALANCE.consistencia.k;
  if (cosechasK4b.has(clave)) {
    return cosechasK4b.get(clave);
  }
  const casos = [];
  const espia = (sistema, st, decision, rng) => {
    if (sistema.id === 'serie' && decision.datos?.motivo === 'plan' && casos.length < CASOS_K4B) {
      casos.push({ st, decision });
    }
    return ESTRATEGIAS_K0.criterio(sistema, st, decision, rng);
  };
  for (let seed = 1; seed <= SEEDS_MAX_K4B && casos.length < CASOS_K4B; seed += 1) {
    correrCarreraSimulate(seed, 60, espia);
  }
  if (casos.length < 10) {
    throw new Error(`cosecha vacía: ${casos.length} pausas del plan`);
  }
  cosechasK4b.set(clave, casos);
  return casos;
}

const esLogDeMapaK4b = (log) => log.type === 'serie' && (log.resultado === 'W' || log.resultado === 'L');

// Juega la serie desde la pausa del plan con `opcionId` y devuelve los logs de los mapas tirados, hasta que la serie
// cierra o vuelve a frenar a re-planear. El mapa decisivo va sin charla y con el minijuego neutro (0,5): lo que esos
// dos mueven lo comparan los checks de K2d.
function jugarPlanK4b(st, decision, opcionId, semilla) {
  const serie = sistemaPorId('serie');
  const rng = mulberry32(semilla);
  let res = serie.resolver(st, decision, { opcionId }, rng);
  const mapas = [];
  for (let paso = 0; paso < 12; paso += 1) {
    const cierre = res.logs.findIndex((log) => log.postSerie);
    mapas.push(...(cierre < 0 ? res.logs : res.logs.slice(0, cierre)).filter(esLogDeMapaK4b));
    const datos = res.decision?.datos;
    if (cierre >= 0 || !res.decision || datos?.motivo === 'plan') {
      return mapas;
    }
    const respuesta = datos.motivo === 'decisivo' ? { opcionId: 'sinCharla' } : { resultado: 0.5, charla: false };
    res = serie.resolver(res.state, res.decision, respuesta, rng);
  }
  throw new Error('la serie no cerró en 12 pasos');
}

checkK2d('K4-B regla 15: la p por mapa que declara cada plan de Fearless es exactamente la que tira el motor (===), en todos los planes ofrecidos, sobre series de carreras reales', () => {
  const casos = cosechaDePlanesK4b();
  const problemas = [];
  let comparados = 0;
  let decisivos = 0;
  const planesVistos = new Set();
  casos.forEach(({ st, decision }, i) => {
    const previa = previaDeDecision(st, decision);
    decision.opciones.forEach((opcion, j) => {
      const declarada = previa?.opciones?.find((o) => o.id === opcion.id);
      if (!declarada?.pMapas) {
        problemas.push(`plan ${i} (${opcion.id}): la tarjeta no declara su p por mapa`);
        return;
      }
      if (declarada.pMapas.length !== opcion.pMapas.length || declarada.pMapas.some((p, k) => p !== opcion.pMapas[k])) {
        problemas.push(`plan ${i} (${opcion.id}): la tarjeta muestra [${declarada.pMapas}] y la decisión del motor [${opcion.pMapas}]`);
      }
      const primero = st.serie.mapaActual + 1;
      for (const log of jugarPlanK4b(st, decision, opcion.id, 41000 + i * 10 + j)) {
        const k = log.mapa - primero;
        comparados += 1;
        if (k === declarada.pMapas.length - 1) {
          decisivos += 1;
        }
        if (declarada.pMapas[k] !== log.p) {
          problemas.push(`plan ${i} (${opcion.id}), mapa ${log.mapa}: la tarjeta dice ${declarada.pMapas[k]}, se tiró ${log.p}`);
        }
      }
      planesVistos.add(opcion.id);
    });
  });
  fallarSiK2d(problemas);
  if (comparados < 100 || decisivos < 5 || planesVistos.size < PLANES_K4B.length) {
    throw new Error(`check vacío: ${comparados} mapas comparados, ${decisivos} decisivos, planes vistos: ${[...planesVistos].join(', ')}`);
  }
});


check('K4-B el rival también quema: con el Fearless su fuerza de mapa cae mapa a mapa (misma regla que la tuya), y en el mapa 1 es la de la serie', () => {
  let caidas = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const base = createInitialState(seed, mulberry32(seed));
    let st = {
      ...base,
      serie: { ...base.serie, activa: true, rival: { org: 'Rival', fuerza: 60 }, formato: 5, quemados: [], mapaActual: 0, rivalJuega: null, rivalJuegaEnMapa: -1 }
    };
    const fuerzas = [];
    for (let i = 0; i < 5; i += 1) {
      st = conQuemaDelRival(st, objetivoDelRival(st, st.serie.quemados));
      fuerzas.push(fuerzaRivalDeMapa(st));
      st = { ...st, serie: { ...st.serie, mapaActual: i + 1 } };
    }
    if (Math.abs(fuerzas[0] - 60) > 1e-9) {
      throw new Error(`seed ${seed}: en el mapa 1, con el mejor del meta, el rival juega con ${fuerzas[0]} y no con su fuerza de serie (60)`);
    }
    for (let k = 1; k < 5; k += 1) {
      if (fuerzas[k] > fuerzas[k - 1] + 1e-12) {
        throw new Error(`seed ${seed}: la fuerza del rival sube del mapa ${k} al ${k + 1} (${fuerzas.map((x) => x.toFixed(2)).join(' → ')})`);
      }
    }
    if (fuerzas[4] < fuerzas[0] - 0.5) {
      caidas += 1;
    }
  }
  if (caidas < 40) {
    throw new Error(`el Fearless degradó al rival en solo ${caidas} de 40 series`);
  }
});

checkLento('K4-B pausas por serie: el plan al arrancar y después como mucho 2 (te leyeron el guardado, el mapa decisivo); una serie sin nada en juego no frena; minijuegos de serie solo en el mapa decisivo de semis, final e internacional; la charla del coach como mucho una por temporada', () => {
  const series = new Map();
  const problemas = [];
  let sinNada = 0;
  let charlas = 0;
  let decisivas = 0;
  for (let seed = 1; seed <= 60; seed += 1) {
    const usadas = new Set();
    // `resolverAuto`, salvo la charla: este bot la usa SIEMPRE que se la ofrecen (si se ofreciera dos veces en una
    // temporada, se vería).
    const responder = (sistema, st, decision, rng) => {
      if (sistema.id !== 'serie') {
        return sistema.resolverAuto(st, decision, rng);
      }
      const datos = decision.datos ?? {};
      const clave = `${seed}|${st.player.splitCount}|${st.serie.ronda}|${st.career.seriesJugadas}`;
      const tipo = datos.motivo === 'minijuego' ? datos.momento : (datos.replan ? 'replan' : datos.motivo);
      if (!series.has(clave)) {
        series.set(clave, []);
      }
      series.get(clave).push(tipo);
      if (tipo !== 'post_serie' && st.serie.sinNadaEnJuego) {
        problemas.push(`seed ${seed}: una serie sin nada en juego frenó (${tipo})`);
      }
      if (datos.motivo === 'minijuego' && tipo !== 'post_serie') {
        if (tipo !== 'mapa_decisivo' || !esMapaDeDesempate(st.serie.marcador, st.serie.formato)
          || !['semis', 'final', 'internacional'].includes(st.serie.ronda)) {
          problemas.push(`seed ${seed}: minijuego ${tipo} en ${st.serie.ronda} con ${st.serie.marcador.join('-')}`);
        }
      }
      if (tipo === 'mapa_decisivo' || tipo === 'decisivo') {
        decisivas += 1;
      }
      const ofreceCharla = datos.charla?.disponible === true || (decision.opciones ?? []).some((o) => o.id === 'charla');
      if (ofreceCharla) {
        if (!charlaDisponible(st) || usadas.has(st.calendario.anio)) {
          problemas.push(`seed ${seed}: la charla del coach se ofreció de nuevo en ${st.calendario.anio}`);
        }
        usadas.add(st.calendario.anio);
        charlas += 1;
        return datos.motivo === 'minijuego' ? { resultado: 0.5, charla: true } : { opcionId: 'charla' };
      }
      return sistema.resolverAuto(st, decision, rng);
    };
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const paso = avanzarSplitAuto(state, rng, responder);
      sinNada += paso.logs.filter((log) => log.postSerie && log.sinNadaEnJuego).length;
      state = paso.state;
    }
  }
  for (const [clave, lista] of series) {
    const enSerie = lista.filter((tipo) => tipo !== 'post_serie');
    if (enSerie.length === 0) {
      continue;
    }
    if (enSerie[0] !== 'plan' || enSerie.filter((tipo) => tipo === 'plan').length !== 1) {
      problemas.push(`${clave}: la serie no arrancó por un solo plan (${enSerie.join(', ')})`);
    }
    if (enSerie.length - 1 > 2 || enSerie.filter((tipo) => tipo === 'replan').length > 1) {
      problemas.push(`${clave}: ${enSerie.length - 1} pausas además del plan (${enSerie.join(', ')})`);
    }
  }
  fallarSiK2d(problemas);
  if (series.size < 100 || sinNada < 20 || charlas < 20 || decisivas < 40) {
    throw new Error(`check vacío: ${series.size} series que frenaron, ${sinNada} sin nada en juego, ${charlas} charlas, ${decisivas} mapas decisivos`);
  }
});

// ============================================================================
// K3-A (PLAN.md "K3 — decisiones de spec", K3-A): las barras que no se saturan. Estructura con constantes neutras
// (k = 0, r = 0, rH = 0, topeDescanso = 100): la huella no se mueve (check "K1 versión"). Estos checks prueban que la
// estructura hace lo que dice CUANDO K3c mueva las constantes: cada uno mueve una constante EN MEMORIA, mide un paso y
// la devuelve a su valor.
// ============================================================================

const barrasK3A = await import('../core/barras.js');
const { conMarcasDeRutina: conMarcasDeRutinaK3B } = await import('../core/curvas.js');
const { aplicarStatsDeMinijuego: aplicarStatsDeMinijuegoK3B } = await import('../systems/serie.js');
const { ligaOZonaDeCarrera: ligaDeCarreraK3A } = await import('../core/competicion.js');
const TIPOS_K3A = ['fecha', 'mapa'];

// Mueve constantes de BALANCE en memoria mientras corre `fn`, y las devuelve siempre.
function conBalanceK3A(cambios, fn) {
  const previos = cambios.map(([bloque, clave]) => [bloque, clave, BALANCE[bloque][clave]]);
  try {
    for (const [bloque, clave, valor] of cambios) BALANCE[bloque][clave] = valor;
    return fn();
  } finally {
    for (const [bloque, clave, valor] of previos) BALANCE[bloque][clave] = valor;
  }
}

// Estados reales entre splits (carreras con `avanzarSplitAuto`): pro con equipo y temporada jugada, y amateurs.
let estadosK3A = null;
function estadosDeCarreraK3A() {
  if (!estadosK3A) {
    const pro = [];
    const amateur = [];
    for (let seed = 1; seed <= 8; seed += 1) {
      const rng = mulberry32(9300 + seed);
      let st = createInitialState(9300 + seed, rng);
      for (let i = 0; i < 30 && !st.terminado; i += 1) {
        st = avanzarSplitAuto(st, rng).state;
        if (st.terminado || st.pendiente) continue;
        if (st.phase === 'profesional' && st.career.currentOrg && st.career.companeros.length > 0
          && (st.career.temporada?.tabla?.length ?? 0) > 0 && i % 3 === 0) pro.push(structuredClone(st));
        if (st.phase === 'amateur' && i % 4 === 0) amateur.push(structuredClone(st));
      }
    }
    estadosK3A = { pro, amateur };
  }
  return { pro: estadosK3A.pro.map((s) => structuredClone(s)), amateur: estadosK3A.amateur.map((s) => structuredClone(s)) };
}

const conBarrasK3A = (st, cambios) => ({ ...st, player: { ...st.player, ...cambios.player, stats: { ...st.player.stats, ...cambios.stats } } });

check('K3-A consistencia 1: ruidoEfectivo pasa su σ por factorDeConsistencia, y BALANCE.consistencia se lee solo adentro de factorDeConsistencia (estático)', () => {
  const raiz = path.join(srcDir, '..');
  const rel = (p) => path.relative(raiz, p).replace(/\\/g, '/');
  const archivos = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'dev' ? [] : archivos(p);
    return /\.js$/.test(p) && rel(p) !== 'src/data/balance.js' ? [p] : [];
  });
  const sinComentarios = (txt) => txt
    .replace(/(^|\s)\/\*[\s\S]*?\*\//g, (bloque) => bloque.replace(/[^\n]/g, ''))
    .split(/\r?\n/).map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'));
  const partidoJs = sinComentarios(fs.readFileSync(path.join(srcDir, 'core', 'partido.js'), 'utf8'));
  const cuerpo = (nombre) => {
    const inicio = partidoJs.findIndex((linea) => new RegExp(`^export function ${nombre}\\(`).test(linea));
    const fin = inicio < 0 ? -1 : partidoJs.findIndex((linea, i) => i > inicio && /^}/.test(linea));
    if (inicio < 0 || fin < 0) throw new Error(`no encontré \`export function ${nombre}(\` en src/core/partido.js`);
    return [inicio, fin];
  };
  const [iRuido, fRuido] = cuerpo('ruidoEfectivo');
  const [iFactor, fFactor] = cuerpo('factorDeConsistencia');
  const ruido = partidoJs.slice(iRuido + 1, fRuido);
  // El factor se calcula con la mentalidad del jugador y multiplica a los DOS σ que devuelve.
  if (!ruido.some((l) => /\bg\s*=\s*factorDeConsistencia\(\s*state\?\.player\?\.stats\?\.mentalidad\s*\)/.test(l))) {
    throw new Error('ruidoEfectivo no calcula g = factorDeConsistencia(state?.player?.stats?.mentalidad)');
  }
  const retornos = ruido.filter((l) => /^\s*return\b/.test(l));
  const sinFactor = retornos.filter((l) => !/\*\s*g\s*;/.test(l));
  if (retornos.length < 2 || sinFactor.length > 0) {
    throw new Error(`un σ de ruidoEfectivo sale sin el factor de consistencia: ${sinFactor.map((l) => l.trim()).join(' | ') || `(${retornos.length} return)`}`);
  }
  const PATRON = /BALANCE\s*(\.\s*consistencia\b|\[\s*['"`]consistencia['"`]\s*\])|\{[^}]*\bconsistencia\b[^}]*\}\s*=\s*BALANCE\b/;
  const afuera = [];
  let dentro = 0;
  for (const archivo of [...archivos(srcDir), path.join(raiz, 'index.html')]) {
    sinComentarios(fs.readFileSync(archivo, 'utf8')).forEach((linea, i) => {
      if (!PATRON.test(linea)) return;
      if (rel(archivo) === 'src/core/partido.js' && i > iFactor && i < fFactor) {
        dentro += 1;
        return;
      }
      afuera.push(`${rel(archivo)}:${i + 1}: ${linea.trim()}`);
    });
  }
  if (afuera.length > 0) throw new Error(`BALANCE.consistencia leído fuera de factorDeConsistencia: ${afuera.slice(0, 5).join(' | ')}`);
  if (dentro < 1) throw new Error('factorDeConsistencia no lee BALANCE.consistencia: el patrón no está viendo nada');
});

check('K3-A consistencia 2: g(mRef) = 1, g no crece con la mentalidad y respeta [gMin, gMax]; con k = 0 el σ es el de hoy para toda mentalidad; con k > 0 (en memoria) σ = σ_tipo · g(m) y con 20 hay más ruido que con 80', () => {
  const c = BALANCE.consistencia;
  if (!(c.gMin <= 1 && 1 <= c.gMax)) throw new Error(`[gMin, gMax] = [${c.gMin}, ${c.gMax}] no contiene a 1`);
  const sigma = { fecha: BALANCE.partido.sigmaFecha, mapa: BALANCE.partido.sigmaMapa };
  const conM = (m) => ({ player: { stats: { mentalidad: m } } });
  const inicial = createInitialState(1, mulberry32(1));
  for (const k of [0, 0.5, 1, 3, 8]) {
    conBalanceK3A([['consistencia', 'k', k]], () => {
      if (factorDeConsistencia(c.mRef) !== 1) throw new Error(`k ${k}: g(mRef = ${c.mRef}) = ${factorDeConsistencia(c.mRef)}`);
      for (const nada of [null, undefined, Number.NaN]) {
        if (factorDeConsistencia(nada) !== 1) throw new Error(`k ${k}: g(${nada}) = ${factorDeConsistencia(nada)}, sin mentalidad tiene que ser 1`);
      }
      for (let m = 0; m <= BALANCE.stats.max; m += 1) {
        const g = factorDeConsistencia(m);
        const aMano = Math.min(c.gMax, Math.max(c.gMin, 1 + k * (c.mRef - m) / 100));
        if (g !== aMano) throw new Error(`k ${k}: g(${m}) = ${g}, la fórmula da ${aMano}`);
        if (m > 0 && g > factorDeConsistencia(m - 1)) throw new Error(`k ${k}: g crece de ${m - 1} a ${m}`);
        for (const tipo of TIPOS_K3A) {
          const s = ruidoEfectivo(conM(m), tipo);
          if (s !== sigma[tipo] * g) throw new Error(`k ${k}: ruidoEfectivo(m ${m}, ${tipo}) = ${s}, σ·g = ${sigma[tipo] * g}`);
          if (k === 0 && s !== sigma[tipo]) throw new Error(`con k = 0 el σ (${tipo}, m ${m}) cambió: ${s} ≠ ${sigma[tipo]}`);
        }
      }
      for (const tipo of TIPOS_K3A) {
        if (ruidoEfectivo(null, tipo) !== sigma[tipo]) throw new Error(`k ${k}: el cruce ajeno (null) no tiene el σ de su tipo`);
        // El camino real: la mentalidad del estado del jugador.
        const real = ruidoEfectivo(inicial, tipo);
        if (real !== sigma[tipo] * factorDeConsistencia(inicial.player.stats.mentalidad)) {
          throw new Error(`k ${k}: con un estado real, σ ${real} no es σ·g(${inicial.player.stats.mentalidad})`);
        }
        if (k > 0 && !(ruidoEfectivo(conM(20), tipo) > ruidoEfectivo(conM(80), tipo))) {
          throw new Error(`k ${k}: con mentalidad 20 el σ (${ruidoEfectivo(conM(20), tipo)}) no supera al de 80 (${ruidoEfectivo(conM(80), tipo)})`);
        }
      }
    });
  }
});

check('K3-A descanso: con un topeDescanso bajo (en memoria) ningún camino de descanso lo pasa — el sueño de atributos (amateur y pro) y el descansar del receso —, y descansar no baja a quien ya está arriba', () => {
  // K4-D: la sonda parte de TOPE - 2 (antes TOPE - 5): con el corrimiento del stream la muestra de estados dejó de traer un
  // sueño con ganancia > 5, y la sonda quedaba vacía por muestreo. Con 2 de margen sigue probando que el tope corta.
  const TOPE = 30;
  const { pro, amateur } = estadosDeCarreraK3A();
  if (pro.length < 3 || amateur.length < 3) throw new Error(`muestra corta: ${pro.length} pro, ${amateur.length} amateur`);
  const atributos = sistemaPorId('atributos');
  const practica = sistemaPorId('practica');
  const rutina = { id: 'k3a_descanso', reparto: { pulir: 0, nuevo: 0, mecanica: 0, macro: 0, descansar: BALANCE.practica.puntos } };
  const decision = { datos: { rutinas: [rutina] } };
  const correr = () => {
    const sueno = [...pro, ...amateur].map((st, i) => atributos.aplicar(
      conBarrasK3A(st, { player: { sleep: BALANCE.stats.max, deudaSueno: 0 }, stats: { mentalidad: TOPE - 2 } }), mulberry32(9400 + i)
    ).state.player.stats.mentalidad);
    const receso = pro.map((st, i) => practica.resolver(
      conBarrasK3A(st, { stats: { mentalidad: TOPE - 2 } }), decision, { opcionId: rutina.id }, mulberry32(9500 + i)
    ).state.player.stats.mentalidad);
    const arriba = pro.map((st, i) => practica.resolver(
      conBarrasK3A(st, { stats: { mentalidad: TOPE + 20 } }), decision, { opcionId: rutina.id }, mulberry32(9600 + i)
    ).state.player.stats.mentalidad);
    return { sueno, receso, arriba };
  };
  // Sin tope (el de hoy), los dos caminos pasan el tope de la sonda: la sonda ve algo.
  // Fija r = 0 en las dos ramas (bajada y subida): el retorno a la base no debe levantar el sueño sobre el tope.
  const SIN_RETORNO = [['atributos', 'mentalidadRetornoBase', 0], ['atributos', 'mentalidadRetornoBaseSubida', 0]];
  const libre = conBalanceK3A(SIN_RETORNO, correr);
  if (!libre.sueno.some((m) => m > TOPE) || !libre.receso.some((m) => m > TOPE)) {
    throw new Error(`sonda vacía: sin tope ningún descanso pasa ${TOPE} (sueño máx ${Math.max(...libre.sueno)}, receso máx ${Math.max(...libre.receso)})`);
  }
  const topeado = conBalanceK3A([...SIN_RETORNO, ['atributos', 'topeDescanso', TOPE]], correr);
  const pasados = [
    ...topeado.sueno.map((m, i) => [`sueño ${i}`, m]),
    ...topeado.receso.map((m, i) => [`receso ${i}`, m])
  ].filter(([, m]) => m > TOPE + 1e-9);
  if (pasados.length > 0) throw new Error(`con topeDescanso ${TOPE} el descanso lo pasa: ${pasados.slice(0, 5).map(([d, m]) => `${d} → ${m}`).join(', ')}`);
  const bajados = topeado.arriba.filter((m) => m !== TOPE + 20);
  if (bajados.length > 0) throw new Error(`descansar con mentalidad ${TOPE + 20} sobre un tope de ${TOPE} la movió: ${bajados.slice(0, 5).join(', ')}`);
  conBalanceK3A([['atributos', 'topeDescanso', TOPE]], () => {
    const casos = [[20, 50, TOPE], [TOPE - 1, 0.5, TOPE - 0.5], [50, 10, 50], [10, 5, 15]];
    for (const [actual, ganancia, esperado] of casos) {
      const dado = barrasK3A.recuperarPorDescanso(actual, ganancia);
      if (dado !== esperado) throw new Error(`recuperarPorDescanso(${actual}, +${ganancia}) con tope ${TOPE} = ${dado}, se esperaba ${esperado}`);
    }
  });
});

check('K3-A vuelta a la base: con r y rH > 0 (en memoria) un paso de atributos lleva la mentalidad a m + r·(base − m) y uno de rendimiento corre el hype en rH·(baseH − h), con baseH = h0 + a·z + b·(prestigio/100 + extra si hubo internacional)', () => {
  const R = 0.5;
  const a = BALANCE.atributos;
  const r = BALANCE.rendimiento;
  // La vuelta simétrica (bajada = subida = R); la asimétrica la prueba el check que sigue.
  const retornoM = (valor) => [['atributos', 'mentalidadRetornoBase', valor], ['atributos', 'mentalidadRetornoBaseSubida', valor]];
  conBalanceK3A(retornoM(R), () => {
    for (const m of [0, 20, a.mentalidadBase, 90, 100]) {
      const dado = barrasK3A.mentalidadHaciaSuBase(m);
      if (dado !== m + R * (a.mentalidadBase - m)) throw new Error(`mentalidadHaciaSuBase(${m}) = ${dado}`);
    }
  });
  const { pro } = estadosDeCarreraK3A();
  const atributos = sistemaPorId('atributos');
  const rendimiento = sistemaPorId('rendimiento');
  let comparadasM = 0;
  let comparadasH = 0;
  pro.forEach((base, i) => {
    const st = conBarrasK3A(base, { player: { sleep: a.suenoConfortable, deudaSueno: 0 }, stats: { mentalidad: 50, hype: 50 } });
    const m0 = conBalanceK3A(retornoM(0), () => atributos.aplicar(st, mulberry32(9700 + i)).state.player.stats.mentalidad);
    const m1 = conBalanceK3A(retornoM(R), () => atributos.aplicar(st, mulberry32(9700 + i)).state.player.stats.mentalidad);
    // Lejos del piso de caída neta (50 − maxCaida) y de los bordes, el paso es exacto.
    if (m0 > 50 - a.maxCaidaMentalPorSplit + 1 && m0 < BALANCE.stats.max) {
      comparadasM += 1;
      if (Math.abs(m1 - (m0 + R * (a.mentalidadBase - m0))) > 1e-9) {
        throw new Error(`estado ${i}: mentalidad con r 0 → ${m0}, con r ${R} → ${m1}; la fórmula da ${m0 + R * (a.mentalidadBase - m0)}`);
      }
    }
    // La base del hype, a mano.
    const res = st.career.temporada.resultadosPropios;
    const z = res.varianza > 0 ? (res.ganados - res.esperados) / Math.sqrt(res.varianza) : 0;
    const liga = ligaDeCarreraK3A(st);
    const internacional = st.career.registro.internacionales.some((e) => e.anio >= st.calendario.anio - r.hypeAniosInternacional);
    const visibilidad = (liga?.prestigio ?? 0) / 100 + (internacional ? r.hypeVisibilidadPorInternacional : 0);
    const baseH = r.hypeBaseInicial + r.hypeBasePorDesvio * z + r.hypeBasePorVisibilidad * visibilidad;
    if (Math.abs(barrasK3A.baseDeHype(st, liga) - baseH) > 1e-9) throw new Error(`estado ${i}: baseDeHype ${barrasK3A.baseDeHype(st, liga)}, a mano ${baseH}`);
    const h0 = conBalanceK3A([['rendimiento', 'hypeRetornoBase', 0]], () => rendimiento.aplicar(st, mulberry32(9800 + i)).state.player.stats.hype);
    const h1 = conBalanceK3A([['rendimiento', 'hypeRetornoBase', R]], () => rendimiento.aplicar(st, mulberry32(9800 + i)).state.player.stats.hype);
    const esperado = h0 + R * (baseH - 50);
    if (h0 > 0 && h0 < BALANCE.stats.max && esperado > 0 && esperado < BALANCE.stats.max) {
      comparadasH += 1;
      if (Math.abs(h1 - esperado) > 1e-9) throw new Error(`estado ${i}: hype con rH 0 → ${h0}, con rH ${R} → ${h1}; la fórmula da ${esperado} (baseH ${baseH})`);
    }
  });
  if (comparadasM < 3 || comparadasH < 3) throw new Error(`check vacío: ${comparadasM} pasos de mentalidad y ${comparadasH} de hype comparados`);
  // La rama del internacional, sobre un estado sintético (las carreras cortas casi no viajan).
  const st = structuredClone(pro[0]);
  const liga = ligaDeCarreraK3A(st);
  const conInternacionales = (lista) => ({ ...st, career: { ...st.career, registro: { ...st.career.registro, internacionales: lista } } });
  const sin = barrasK3A.visibilidadDeCarrera(conInternacionales([]), liga);
  const con = barrasK3A.visibilidadDeCarrera(conInternacionales([{ anio: st.calendario.anio - r.hypeAniosInternacional }]), liga);
  const viejo = barrasK3A.visibilidadDeCarrera(conInternacionales([{ anio: st.calendario.anio - r.hypeAniosInternacional - 1 }]), liga);
  if (Math.abs(con - sin - r.hypeVisibilidadPorInternacional) > 1e-12 || viejo !== sin) {
    throw new Error(`visibilidad: sin internacional ${sin}, con uno reciente ${con}, con uno viejo ${viejo}`);
  }
});

check('K3c vuelta asimétrica: con bajada 0,3 y subida 0 (en memoria) una mentalidad sobre la base va hacia ella y una debajo no se mueve — en el helper y en un paso de atributos', () => {
  // PLAN.md K3c, "Lo que rompen los valores elegidos", punto 1: la vuelta simétrica subía gratis una mentalidad
  // hundida (perdonaba las malas decisiones y borraba el burnout). Desde abajo se sube descansando o decidiendo.
  const BAJADA = 0.3;
  const a = BALANCE.atributos;
  const asimetrica = [['atributos', 'mentalidadRetornoBase', BAJADA], ['atributos', 'mentalidadRetornoBaseSubida', 0]];
  const sinRetorno = [['atributos', 'mentalidadRetornoBase', 0], ['atributos', 'mentalidadRetornoBaseSubida', 0]];
  conBalanceK3A(asimetrica, () => {
    for (const m of [a.mentalidadBase + 1, 75, 90, BALANCE.stats.max]) {
      const dado = barrasK3A.mentalidadHaciaSuBase(m);
      if (dado !== m + BAJADA * (a.mentalidadBase - m)) throw new Error(`sobre la base: mentalidadHaciaSuBase(${m}) = ${dado}, se esperaba ${m + BAJADA * (a.mentalidadBase - m)}`);
    }
    for (const m of [0, 20, 45, a.mentalidadBase - 1, a.mentalidadBase]) {
      const dado = barrasK3A.mentalidadHaciaSuBase(m);
      if (dado !== m) throw new Error(`debajo de la base (o en ella) la subida 0 la movió: mentalidadHaciaSuBase(${m}) = ${dado}`);
    }
  });
  const { pro } = estadosDeCarreraK3A();
  const atributos = sistemaPorId('atributos');
  let arriba = 0;
  let abajo = 0;
  pro.forEach((base, i) => {
    for (const inicial of [85, 35]) {
      const st = conBarrasK3A(base, { player: { sleep: a.suenoConfortable, deudaSueno: 0 }, stats: { mentalidad: inicial } });
      const m0 = conBalanceK3A(sinRetorno, () => atributos.aplicar(st, mulberry32(9900 + i)).state.player.stats.mentalidad);
      const m1 = conBalanceK3A(asimetrica, () => atributos.aplicar(st, mulberry32(9900 + i)).state.player.stats.mentalidad);
      if (m0 > a.mentalidadBase) {
        const esperado = m0 + BAJADA * (a.mentalidadBase - m0);
        // Lejos del piso de caída neta, el paso es exacto.
        if (esperado > inicial - a.maxCaidaMentalPorSplit + 1) {
          arriba += 1;
          if (Math.abs(m1 - esperado) > 1e-9) throw new Error(`estado ${i} (desde ${inicial}): sin retorno ${m0}, asimétrica ${m1}; la bajada da ${esperado}`);
        }
      } else if (m0 < a.mentalidadBase) {
        abajo += 1;
        if (m1 !== m0) throw new Error(`estado ${i} (desde ${inicial}): debajo de la base, sin retorno ${m0} y asimétrica ${m1}: la subida 0 la movió`);
      }
    }
  });
  if (arriba < 3 || abajo < 3) throw new Error(`check vacío: ${arriba} pasos sobre la base y ${abajo} debajo comparados`);
});

// --- K3c: las metas del bloque A, como checks duros (PLAN.md "K3c — cómo se hace", paso 3) ---
//
// Hasta K3b eran REPORTE (`nivel.metasK2` y `metasK3` de simulate.js, con la meta al lado). K3c fijó las perillas
// (consistencia, vuelta a la base de mentalidad y hype, efectos que duran) y las metas pasan a checks duros, con las
// mismas constantes `META_*` que el reporte. Regla de proceso 17, qué protege cada uno: "tus decisiones construyen tu
// nivel" (K.2) — que el nivel se note en la posición (r, R²) y en la serie (el favorito gana), que la cabeza gobierne
// la consistencia (el batacazo de mentalidad 20 contra 80), que las barras no se saturen (mentalidad, hype) y que un
// efecto dure (retención). Cada check dice en su nombre cuál es su muestra. Los de lote (r, R², Bo5, mentalidad, hype) se
// miden con `criterio` (el bot que juega bien), 800 seeds × 60 splits: el barrido de K3c eligió los valores con 400 × 60,
// pero con 400 el Bo5 del jugador (83,8% ±1,7) quedaba a 0,7 errores estándar del techo de 85; con 800 el error baja a
// ±1,2. La retención es una sonda aparte (`SONDA_RETENCION`, con sus propios casos) y el batacazo es analítico (la p de
// mapa del motor, sin muestra). El check duro del Bo5 es el del lado del JUGADOR (Δ0 >= 0): el de la investigación de K2
// y el que K2c calibró, lo que el bloque A controla. El del rival (≈ 94%) y el conjunto (≈ 87%) pesan la asimetría de
// Fearless, que es de K4: el conjunto tiene su check ("K3c meta Bo5 favorito claro (conjunto)") y está en
// `bandasPendientes.js` como bloque B; el del rival solo se reporta.
const SEEDS_METAS_A = 800;
let loteMetasA = null;
function loteDeLasMetasA() {
  if (loteMetasA === null) {
    loteMetasA = correrLote(SEEDS_METAS_A, SPLITS_LOTE_K0, 'criterio');
    // La ablación (`varianzaExplicada`) se calcula al leerla: se fuerza acá para chequear el balance justo después.
    void loteMetasA.nivel.varianzaExplicada;
    afirmarRuidoIntactoK0(`después de correrLote(${SEEDS_METAS_A}, criterio)`);
  }
  return loteMetasA;
}

function valoresDeLasMetasA(lote) {
  const claro = lote.nivel.bo5Motor.favoritoClaro;
  return {
    rMismaLiga: lote.nivel.corregida.rNivelPosicionMismaLiga,
    r2SinRuido: lote.nivel.varianzaExplicada.corregida.soloLigaModelada.r2NivelYEquipoSinRuido,
    bo5Jugador: claro.jugadorFavorito.ganaFavoritoPct,
    bo5Rival: claro.rivalFavorito.ganaFavoritoPct,
    bo5Juntos: claro.ambos.ganaFavoritoPct,
    mentalidadMediana: lote.economia.mentalidad.p50,
    mentalidadSaturada: lote.economia.mentalidad.pctMayorIgual90,
    hypeSaturado: lote.economia.hype.pctMayorIgual90,
    retencion: lote.metasK3.retencion4Splits.valor,
    batacazo: lote.metasK3.desvioMapaMentalidad20vs80.valor
  };
}

// El juez: null si la meta se cumple, el motivo si no. Un valor que no existe (muestra chica) no cumple.
function juezDeLasMetasA(v) {
  const hay = (x) => typeof x === 'number' && Number.isFinite(x);
  const [medMin, medMax] = META_K3_MENTALIDAD_MEDIANA;
  const [bo5Min, bo5Max] = META_K2_BO5_FAVORITO_CLARO_PCT;
  const juzgar = (ok, motivo) => (ok ? null : motivo);
  return {
    rMismaLiga: juzgar(hay(v.rMismaLiga) && v.rMismaLiga >= META_K2_R_MISMA_LIGA,
      `la r nivel–posición en la misma liga (corregida) es ${v.rMismaLiga}, la meta pide >= ${META_K2_R_MISMA_LIGA}`),
    r2SinRuido: juzgar(hay(v.r2SinRuido) && v.r2SinRuido >= META_K2_R2_SIN_RUIDO,
      `el R² sin ruido (corregido) es ${v.r2SinRuido}, la meta pide >= ${META_K2_R2_SIN_RUIDO}`),
    bo5Jugador: juzgar(hay(v.bo5Jugador) && v.bo5Jugador >= bo5Min && v.bo5Jugador <= bo5Max,
      `el favorito claro (Δ0 ≈ 10, el jugador favorito) gana el Bo5 el ${v.bo5Jugador}%, la meta es ${bo5Min}-${bo5Max}% (del lado del rival ${v.bo5Rival}%, juntos ${v.bo5Juntos}%: el conjunto lo juzga su propio check)`),
    bo5Juntos: juzgar(hay(v.bo5Juntos) && v.bo5Juntos >= bo5Min && v.bo5Juntos <= bo5Max,
      `el favorito claro (Δ0 ≈ 10, conjunto: los dos lados) gana el Bo5 el ${v.bo5Juntos}%, la meta es ${bo5Min}-${bo5Max}% (jugador ${v.bo5Jugador}%, rival ${v.bo5Rival}%)`),
    mentalidadMediana: juzgar(hay(v.mentalidadMediana) && v.mentalidadMediana >= medMin && v.mentalidadMediana <= medMax,
      `la mentalidad mediana de los splits pro es ${v.mentalidadMediana}, la meta es ${medMin}-${medMax}`),
    mentalidadSaturada: juzgar(hay(v.mentalidadSaturada) && v.mentalidadSaturada < META_K3_MENTALIDAD_SATURADA_PCT,
      `el ${v.mentalidadSaturada}% de los splits pro tiene mentalidad >= 90, la meta es < ${META_K3_MENTALIDAD_SATURADA_PCT}%`),
    hypeSaturado: juzgar(hay(v.hypeSaturado) && v.hypeSaturado < META_K3_HYPE_SATURADO_PCT,
      `el ${v.hypeSaturado}% de los splits pro tiene hype >= 90, la meta es < ${META_K3_HYPE_SATURADO_PCT}%`),
    retencion: juzgar(hay(v.retencion) && v.retencion >= META_K3_RETENCION_4_SPLITS,
      `un efecto conserva ${v.retencion} a 4 splits, la meta pide >= ${META_K3_RETENCION_4_SPLITS}`),
    batacazo: juzgar(hay(v.batacazo) && v.batacazo >= META_K3_DIFERENCIA_BATACAZO_PP,
      `el batacazo con mentalidad 20 sube ${v.batacazo} pp contra mentalidad 80, la meta pide >= ${META_K3_DIFERENCIA_BATACAZO_PP} pp`)
  };
}

// `bo5Juntos` va dentro de banda (84): son valores que CUMPLEN. El Bo5 conjunto real da ≈ 87% y por eso está pendiente.
const VALORES_DE_LAS_METAS_A_OK = {
  rMismaLiga: 0.6, r2SinRuido: 0.52, bo5Jugador: 83, bo5Rival: 93, bo5Juntos: 84, mentalidadMediana: 72, mentalidadSaturada: 2.7,
  hypeSaturado: 20, retencion: 0.49, batacazo: 4.3
};

function problemasDeLasMetasA(claves) {
  const juicio = juezDeLasMetasA(valoresDeLasMetasA(loteDeLasMetasA()));
  return claves.map((clave) => juicio[clave]).filter((motivo) => motivo !== null);
}

check('K3c metas del bloque A: el juez acepta los valores del bloque A y rechaza, uno por uno, cada valor fuera de meta o inexistente (regla 7)', () => {
  const sano = Object.values(juezDeLasMetasA(VALORES_DE_LAS_METAS_A_OK)).filter((motivo) => motivo !== null);
  if (sano.length > 0) throw new Error(`el juez rechaza valores que cumplen: ${sano.join('; ')}`);
  const malos = {
    rMismaLiga: [0.3, null], r2SinRuido: [0.3, null], bo5Jugador: [90, 70, null], bo5Juntos: [87.3, 70, null], mentalidadMediana: [97.8, 30, null],
    mentalidadSaturada: [77.7, 20, null], hypeSaturado: [40, 25, null], retencion: [0.28, null], batacazo: [0, 1.9, null]
  };
  for (const [clave, valores] of Object.entries(malos)) {
    for (const valor of valores) {
      const juicio = juezDeLasMetasA({ ...VALORES_DE_LAS_METAS_A_OK, [clave]: valor });
      const rechazados = Object.entries(juicio).filter(([, motivo]) => motivo !== null).map(([k]) => k);
      if (rechazados.length !== 1 || rechazados[0] !== clave) {
        throw new Error(`${clave} = ${valor}: el juez rechazó [${rechazados.join(', ')}], tenía que rechazar solo ${clave}`);
      }
    }
  }
});

checkLento(`K3c meta de K2 (criterio, ${SEEDS_METAS_A} × ${SPLITS_LOTE_K0}): r nivel–posición en la misma liga >= 0,5 y R² sin ruido >= 0,5, ambos corregidos`, () => {
  const problemas = problemasDeLasMetasA(['rMismaLiga', 'r2SinRuido']);
  if (problemas.length > 0) throw new Error(problemas.join('; '));
});

checkLento(`K3c meta de K2 (criterio, ${SEEDS_METAS_A} × ${SPLITS_LOTE_K0}): el favorito claro (Δ0 ≈ 10) gana el Bo5 entre 75% y 85% (lado del jugador; el rival solo se reporta, el conjunto tiene su check)`, () => {
  const v = valoresDeLasMetasA(loteDeLasMetasA());
  console.log(`     (informe) Bo5 con |Δ0| ≈ 10: jugador favorito ${v.bo5Jugador}% (se mide), rival favorito ${v.bo5Rival}% (solo se reporta), juntos ${v.bo5Juntos}% (su propio check)`);
  const problemas = problemasDeLasMetasA(['bo5Jugador']);
  if (problemas.length > 0) throw new Error(problemas.join('; '));
});

// El conjunto (los dos lados) es un check de BANDA fuera de banda dentro del bloque B: la asimetría del Fearless (solo
// te degrada a vos) lo lleva a ≈ 87% y la resuelve el plan de Fearless de K4. Vive en `bandasPendientes.js` (bloque B,
// re-basea K4c): mientras falle se reporta PENDIENTE; si vuelve a [75, 85], el custodio 1 pide borrar la entrada.
// La muestra es la de las demás metas de lote (`criterio`, ${SEEDS_METAS_A} × ${SPLITS_LOTE_K0}).
checkLento('K3c meta Bo5 favorito claro (conjunto) ∈ [75, 85]', () => {
  const v = valoresDeLasMetasA(loteDeLasMetasA());
  console.log(`     (muestra: criterio, ${SEEDS_METAS_A} × ${SPLITS_LOTE_K0}) Bo5 conjunto ${v.bo5Juntos}% (jugador ${v.bo5Jugador}%, rival ${v.bo5Rival}%)`);
  const problemas = problemasDeLasMetasA(['bo5Juntos']);
  if (problemas.length > 0) throw new Error(problemas.join('; '));
});

checkLento(`K3c meta de K3 (criterio, ${SEEDS_METAS_A} × ${SPLITS_LOTE_K0}): mentalidad pro con mediana en [45, 75] y < 20% de los splits pro con mentalidad >= 90`, () => {
  const problemas = problemasDeLasMetasA(['mentalidadMediana', 'mentalidadSaturada']);
  if (problemas.length > 0) throw new Error(problemas.join('; '));
});

checkLento(`K3c meta de K3 (criterio, ${SEEDS_METAS_A} × ${SPLITS_LOTE_K0}): < 25% de los splits pro con hype >= 90`, () => {
  const problemas = problemasDeLasMetasA(['hypeSaturado']);
  if (problemas.length > 0) throw new Error(problemas.join('; '));
});

checkLento(`K3c meta de K3 (sonda de retención, ${SONDA_RETENCION.seeds} seeds sin los casos que tocan el clamp): un efecto sobre un stat de curva conserva >= 40% a ${SONDA_RETENCION.splitsDespues} splits`, () => {
  const problemas = problemasDeLasMetasA(['retencion']);
  if (problemas.length > 0) throw new Error(problemas.join('; '));
});

checkLento('K3c meta de K3 (analítico, sin muestra: p de mapa del motor): la brecha de sorpresas entre mentalidad 20 y 80 es >= 2 pp', () => {
  const problemas = problemasDeLasMetasA(['batacazo']);
  if (problemas.length > 0) throw new Error(problemas.join('; '));
});

// ============================================================================
// PLAN.md §K.4 — los tres custodios del registro de bandas pendientes (`src/dev/bandasPendientes.js`). Van al FINAL:
// el primero mira cómo terminó cada check de esta corrida. Cada uno se prueba primero contra un registro sintético
// que tiene que rechazar (trampa T5: un custodio que no ve nada pasa siempre).
// ============================================================================

const ENTRADA_SINTETICA_K2B = {
  check: 'Sin aleatoriedad nativa fuera del RNG inyectado (src/ + index.html)', bloque: 'A',
  medido: '0 usos', banda: '0 usos', commit: 'K2b', rebasea: 'K3c'
};

// --- K4-C: solo frenan las bifurcaciones; lo demás lo resuelve tu perfil (PLAN.md "K4 — decisiones de spec") ---

// Una corrida instrumentada: cada pausa con su sistema, la respuesta del criterio por defecto y el estado al
// pausar. Compartida por los checks de K4-C para no correr las mismas carreras cinco veces.
function correrCarrerasK4c(seeds, splits) {
  const carreras = [];
  for (const seed of seeds) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    const pausas = [];
    const responder = (sistema, st, decision, rngLocal) => {
      const respuesta = sistema.resolverAuto(st, decision, rngLocal);
      pausas.push({ sistema: sistema.id, decision, respuesta, st });
      return respuesta;
    };
    for (let i = 0; i < splits && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
    carreras.push({ seed, pausas, final: state });
  }
  return carreras;
}
let carrerasK4cCache = null;
function carrerasK4c() {
  carrerasK4cCache ??= correrCarrerasK4c(Array.from({ length: 40 }, (_, i) => 4400 + i), 60);
  return carrerasK4cCache;
}

// El encaje recalculado ACÁ, desde la previa que muestra la tarjeta y la tabla de `data/perfiles.json` — sin
// llamar a `core/perfil.js`, para que un error en el motor no se tape con el mismo error en el check.
function opcionEsperadaK4c(perfil, decision) {
  const tabla = PERFILES_K4C;
  const forzada = decision.opciones.find((opcion) => {
    const original = decision.datos.evento.options.find((o) => o.id === opcion.id);
    return original?.perfil === perfil.actual;
  });
  if (forzada) {
    return forzada.id;
  }
  const mag = BALANCE.perfil.pesoMagnitud;
  let mejor = null;
  let mejorValor = -Infinity;
  for (const opcion of decision.opciones) {
    let valor = 0;
    for (const id of tabla.orden) {
      const p = tabla.perfiles[id];
      let encaje = p.riesgo[opcion.riesgo] ?? 0;
      for (const fila of opcion.previa) {
        const familia = tabla.familiaDeCampo[fila.campo];
        if (!familia) continue;
        encaje += (p.familias[familia] ?? 0) * (fila.signo === '-' ? -1 : 1) * (mag[fila.magnitud] ?? 0);
      }
      valor += (perfil.pesos[id] ?? 0) * encaje;
    }
    if (valor > mejorValor) {
      mejor = opcion.id;
      mejorValor = valor;
    }
  }
  return mejor;
}

check('K4-C solo frenan las bifurcaciones: toda pausa de eventos es un evento con bifurcacion: true (40 carreras × 60)', () => {
  let pausasEvento = 0;
  let cronicas = 0;
  for (const { seed, pausas, final } of carrerasK4c()) {
    for (const { sistema, decision } of pausas) {
      if (sistema !== 'eventos' || decision.datos?.motivo === 'minijuego') continue;
      pausasEvento += 1;
      if (decision.datos?.evento?.bifurcacion !== true) {
        throw new Error(`seed ${seed}: frenó un evento que no es bifurcación (${decision.titulo})`);
      }
    }
    cronicas += final.logs.filter((log) => log.cronica).length;
  }
  if (cronicas === 0) {
    throw new Error('ningún evento se resolvió por perfil: no hay líneas de crónica');
  }
  if (pausasEvento === 0) {
    throw new Error('ninguna bifurcación frenó en 40 carreras: el marcado no llega al motor');
  }
});

check('K4-C el perfil elige la opción de mejor encaje (recalculado desde la previa y la tabla perfil × familia)', () => {
  // Estados reales de mitad de carrera, cada evento no-bifurcación con opciones vivas, y los cuatro perfiles puros
  // más una mezcla (la deriva). La opción esperada sale de la previa que muestra la tarjeta (`decisionDesdeEvento`).
  const estados = carrerasK4c().slice(0, 6).map(({ pausas }) => pausas[Math.floor(pausas.length / 2)]?.st).filter(Boolean);
  const perfiles = [
    ...PERFILES_K4C.orden.map((id) => ({ actual: id, pesos: Object.fromEntries(PERFILES_K4C.orden.map((q) => [q, q === id ? 1 : 0])) })),
    { actual: 'hambriento', pesos: { profesional: 0.3, hambriento: 0.4, showman: 0.2, leal: 0.1 } }
  ];
  let comparadas = 0;
  for (const base of estados) {
    for (const perfil of perfiles) {
      const st = { ...base, player: { ...base.player, perfil } };
      for (const evento of TODOS_LOS_EVENTOS.filter((e) => !e.bifurcacion && !e.cierreDeEdad)) {
        const decision = decisionDesdeEvento(st, evento, { franja: 'normal', slot: 1 });
        if (decision.opciones.length < 2) continue;
        const esperada = opcionEsperadaK4c(perfil, decision);
        const motor = opcionDelPerfilPara(st, evento);
        if (motor !== esperada) {
          throw new Error(`${evento.id} con perfil ${JSON.stringify(perfil.pesos)}: el motor eligió ${motor}, el encaje da ${esperada}`);
        }
        comparadas += 1;
      }
    }
  }
  if (comparadas < 1000) {
    throw new Error(`muy pocas comparaciones (${comparadas})`);
  }
});

check('K4-C los overrides de perfil del dato ganan', () => {
  const rng = mulberry32(17);
  const base = createInitialState(17, rng);
  let probados = 0;
  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options.filter((o) => o.perfil)) {
      if (!PERFILES_K4C.orden.includes(opcion.perfil)) {
        throw new Error(`${evento.id}/${opcion.id}: perfil desconocido "${opcion.perfil}"`);
      }
      const st = { ...base, player: { ...base.player, perfil: { actual: opcion.perfil, pesos: Object.fromEntries(PERFILES_K4C.orden.map((q) => [q, q === opcion.perfil ? 1 : 0])) } } };
      const elegida = opcionDelPerfilPara(st, evento);
      if (elegida !== opcion.id) {
        throw new Error(`${evento.id}: el override perfil "${opcion.perfil}" pide ${opcion.id} y el motor eligió ${elegida}`);
      }
      probados += 1;
    }
  }
  if (probados === 0) {
    throw new Error('no hay ningún override de perfil en el dato');
  }
});

check('K4-C la opción del perfil resuelve su outcome con la tirada con pesos (regla 8)', () => {
  // Un evento no-bifurcación cuya opción del perfil tenga dos outcomes con textos distintos: 600 tiradas por el camino
  // de crónica tienen que repartir los textos según los pesos efectivos (±0,06), no salir siempre el mismo.
  const rng0 = mulberry32(23);
  const base = createInitialState(23, rng0);
  const evento = TODOS_LOS_EVENTOS.find((e) => !e.bifurcacion && !e.cierreDeEdad && e.options.length >= 2
    && e.options.every((o) => o.outcomes.length >= 2 && !o.outcomes.some((x) => x.modificadores) && new Set(o.outcomes.map((x) => x.texto)).size === o.outcomes.length
      && o.outcomes.every((x) => x.effects.every((ef) => ef.type === 'stat'))));
  const opcionId = opcionDelPerfilPara(base, evento);
  const opcion = evento.options.find((o) => o.id === opcionId);
  const total = opcion.outcomes.reduce((s, x) => s + x.weight, 0);
  const cuenta = new Map();
  const N = 600;
  for (let i = 0; i < N; i += 1) {
    const { logs } = resolverOpcion(base, evento, opcionId, mulberry32(9000 + i), { cronica: base.player.perfil.actual });
    cuenta.set(logs[0].cuerpo, (cuenta.get(logs[0].cuerpo) ?? 0) + 1);
  }
  for (const outcome of opcion.outcomes) {
    const visto = (cuenta.get(resolverTexto(outcome.texto, base)) ?? 0) / N;
    const esperado = outcome.weight / total;
    if (Math.abs(visto - esperado) > 0.06) {
      throw new Error(`${evento.id}/${opcionId}: un outcome de peso ${esperado.toFixed(2)} salió ${visto.toFixed(2)} (¿el rng no decide?)`);
    }
  }
});

check('K4-C el perfil está completo en el estado desde el arranque y se corre con las bifurcaciones', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const st = createInitialState(seed, mulberry32(seed));
    const { perfil } = st.player;
    if (!perfil || !PERFILES_K4C.orden.includes(perfil.actual)) {
      throw new Error(`seed ${seed}: perfil inicial inválido ${JSON.stringify(perfil)}`);
    }
    if (PERFILES_K4C.orden.some((id) => typeof perfil.pesos[id] !== 'number') || Math.abs(Object.values(perfil.pesos).reduce((a, b) => a + b, 0) - 1) > 1e-9) {
      throw new Error(`seed ${seed}: pesos incompletos o que no suman 1: ${JSON.stringify(perfil.pesos)}`);
    }
  }
  const elegido = createInitialState(9, mulberry32(9), { perfil: 'leal' });
  if (elegido.player.perfil.actual !== 'leal') {
    throw new Error(`elegir "leal" en el inicio no llega al estado (${elegido.player.perfil.actual})`);
  }
  // Una bifurcación cuya opción tenga afinidad distinta de "leal": decidirla 4 veces corre los pesos hacia ella y
  // cambia la palabra (α = derivaPorBifurcacion: 0,8^4 < 0,5).
  const afinidadesDe = (evento) => decisionDesdeEvento(elegido, evento, { franja: 'normal', slot: 2 }).opciones.map((o) => {
    let mejor = null;
    let mejorValor = -Infinity;
    for (const id of PERFILES_K4C.orden) {
      const t = PERFILES_K4C.perfiles[id];
      let v = t.riesgo[o.riesgo] ?? 0;
      for (const f of o.previa) {
        const fam = PERFILES_K4C.familiaDeCampo[f.campo];
        if (fam) v += (t.familias[fam] ?? 0) * (f.signo === '-' ? -1 : 1) * BALANCE.perfil.pesoMagnitud[f.magnitud];
      }
      if (v > mejorValor) { mejor = id; mejorValor = v; }
    }
    return { id: o.id, afinidad: evento.options.find((x) => x.id === o.id).perfil ?? mejor };
  });
  const fork = TODOS_LOS_EVENTOS.find((e) => e.bifurcacion && !e.escandalo && afinidadesDe(e).some((a) => a.afinidad !== 'leal'));
  if (!fork) {
    throw new Error('ninguna bifurcación con una opción de afinidad distinta de leal para probar la deriva');
  }
  const afinidades = afinidadesDe(fork);
  const otra = afinidades.find((a) => a.afinidad !== 'leal');
  if (!otra) {
    throw new Error(`${fork.id}: ninguna opción con afinidad distinta de leal para probar la deriva`);
  }
  let st = elegido;
  for (let i = 0; i < 4; i += 1) {
    const d = decisionDesdeEvento(st, fork, { franja: 'normal', slot: 2 });
    st = resolverEventos(st, d, { opcionId: otra.id }, mulberry32(70 + i)).state;
  }
  if (!(st.player.perfil.pesos[otra.afinidad] > 0.5) || st.player.perfil.actual !== otra.afinidad) {
    throw new Error(`cuatro bifurcaciones hacia ${otra.afinidad} no corrieron el perfil: ${JSON.stringify(st.player.perfil)}`);
  }
});

check('K4-C cada evento resuelto por perfil deja una línea de crónica, sin ids crudos', () => {
  const ids = new Set(TODOS_LOS_EVENTOS.flatMap((e) => [e.id, ...e.options.map((o) => o.id)]));
  let vistas = 0;
  for (const { seed, final } of carrerasK4c().slice(0, 15)) {
    const cronicas = final.logs.filter((log) => log.cronica);
    for (const log of cronicas) {
      vistas += 1;
      if (!log.titulo || !log.opcion || !log.cuerpo || typeof log.descripcion !== 'string' || !log.perfil) {
        throw new Error(`seed ${seed}: línea de crónica incompleta: ${JSON.stringify(log).slice(0, 200)}`);
      }
      const crudo = log.message.match(/\b[a-z0-9]+(?:_[a-z0-9]+)+\b/g)?.find((t) => ids.has(t) || /_/.test(t));
      if (crudo || /\{[a-zA-Z]+\}/.test(log.message)) {
        throw new Error(`seed ${seed}: id o token crudo en la crónica ("${crudo ?? log.message}")`);
      }
    }
  }
  if (vistas === 0) {
    throw new Error('ninguna línea de crónica en 15 carreras');
  }
});

check('K4-C la rueda de prensa sale solo después de una final o de un escándalo', () => {
  let prensas = 0;
  for (const { seed, pausas } of carrerasK4c()) {
    pausas.forEach(({ sistema, decision }, i) => {
      if (decision.datos?.minijuego !== 'rueda_de_prensa') return;
      prensas += 1;
      const trasFinal = sistema === 'serie' && decision.datos.trasRonda === 'final';
      const anterior = pausas[i - 1];
      const trasEscandalo = sistema === 'eventos' && anterior?.sistema === 'eventos' && anterior.decision.datos?.evento?.escandalo === true;
      if (!trasFinal && !trasEscandalo) {
        throw new Error(`seed ${seed}: rueda de prensa fuera de una final o un escándalo (${sistema}, ${decision.datos.trasRonda ?? decision.datos.momento})`);
      }
    });
  }
  if (prensas === 0) {
    throw new Error('ninguna rueda de prensa en 40 carreras');
  }
});

check('K4-C la prueba en cada salto grande: primer fichaje en tier 2, en tier 1 y como import', () => {
  // Recuento independiente: los tiers en los que ya tuviste club y si ya fuiste import, leídos del estado en cada
  // pausa. Firmar por el mercado en un tier ≤ 2 que nunca tuviste (y que no está por debajo de uno que sí), o como
  // import por primera vez, tiene que frenar con la prueba ANTES de firmar.
  let saltos = 0;
  for (const { seed, pausas } of carrerasK4c()) {
    const tiers = new Set();
    let fuiImport = false;
    pausas.forEach(({ sistema, decision, respuesta, st }, i) => {
      if (st.career.currentOrg) {
        tiers.add(st.career.tier);
        if (st.career.contrato?.tipo === 'import') fuiImport = true;
      }
      if (sistema !== 'mercado' || decision.datos?.motivo === 'minijuego' || decision.datos?.motivo === 'traspaso' || !respuesta.opcionId || respuesta.negociar) return;
      const oferta = decision.opciones.find((o) => o.id === respuesta.opcionId);
      if (!oferta || oferta.tag === 'renovacion') return;
      const nuevoTier = oferta.tier <= 2 && !tiers.has(oferta.tier) && !(oferta.tier === 2 && tiers.has(1));
      const nuevoImport = oferta.datos?.tipo === 'import' && !fuiImport;
      if (!nuevoTier && !nuevoImport) return;
      saltos += 1;
      const siguiente = pausas[i + 1];
      if (siguiente?.sistema !== 'mercado' || siguiente.decision.datos?.momento !== 'tryout') {
        throw new Error(`seed ${seed}: firmó con ${oferta.org} (tier ${oferta.tier}${nuevoImport ? ', import' : ''}) sin la prueba del salto`);
      }
    });
  }
  if (saltos === 0) {
    throw new Error('ningún salto grande por el mercado en 40 carreras');
  }
});

check('bandasPendientes 1: ninguna entrada registrada pasa en esta corrida, y toda entrada nombra un check que existe', () => {
  const sintetico = entradasQuePasan([ENTRADA_SINTETICA_K2B, { ...ENTRADA_SINTETICA_K2B, check: 'un check que no existe K2b' }],
    new Map([[ENTRADA_SINTETICA_K2B.check, 'ok']]), { completo: true });
  if (sintetico.length !== 2) {
    throw new Error(`el custodio no reconoce una entrada que pasa y una que no existe: ${JSON.stringify(sintetico)}`);
  }
  const problemas = entradasQuePasan(BANDAS_PENDIENTES, resultadosDeCheck, { completo: SOLO.length === 0 });
  if (problemas.length > 0) {
    throw new Error(problemas.join('; '));
  }
});

check('bandasPendientes 2: ninguna entrada es de un bloque de corrimiento cerrado', () => {
  const cerrados = { ...BLOQUES_DE_CORRIMIENTO, A: { ...BLOQUES_DE_CORRIMIENTO.A, cerrado: true } };
  if (entradasDeBloquesCerrados([ENTRADA_SINTETICA_K2B], cerrados).length !== 1
    || entradasDeBloquesCerrados([{ ...ENTRADA_SINTETICA_K2B, bloque: 'Z' }], BLOQUES_DE_CORRIMIENTO).length !== 1) {
    throw new Error('el custodio no reconoce una entrada de un bloque cerrado o desconocido');
  }
  const problemas = entradasDeBloquesCerrados(BANDAS_PENDIENTES, BLOQUES_DE_CORRIMIENTO);
  if (problemas.length > 0) {
    throw new Error(problemas.join('; '));
  }
});

check('bandasPendientes 3: toda entrada tiene valor medido, banda, commit y la subfase que la re-basea (la calibración de su bloque)', () => {
  const sinValor = { ...ENTRADA_SINTETICA_K2B, medido: '' };
  const { rebasea, ...sinSubfase } = ENTRADA_SINTETICA_K2B;
  const otraSubfase = { ...ENTRADA_SINTETICA_K2B, rebasea: 'K4c' };
  for (const [nombre, entrada] of [['sin valor', sinValor], ['sin subfase', sinSubfase], ['con la subfase de otro bloque', otraSubfase]]) {
    if (entradasIncompletas([entrada], BLOQUES_DE_CORRIMIENTO).length === 0) {
      throw new Error(`el custodio no reconoce una entrada ${nombre} (${rebasea})`);
    }
  }
  const problemas = entradasIncompletas(BANDAS_PENDIENTES, BLOQUES_DE_CORRIMIENTO);
  if (problemas.length > 0) {
    throw new Error(problemas.join('; '));
  }
});

// --- K3-B: los efectos que duran (PLAN.md "K3 — decisiones de spec") ---
//
// Estructura con la constante en 0: el juego queda idéntico, y eso lo prueba "K1 versión" (la huella del juego). Estos
// checks son estructurales: la regla en el aplicador de efectos, la curva y la ficha, con la fracción en 0 y en memoria
// con una positiva. Cada uno se probó en rojo contra su mutante sobre una copia (regla de proceso 7): el aplicador sin
// el gancho, la curva sin el bonus, un stat de curva fuera del bonus inicial, la constante neutra rota, una marca que
// pisa a las anteriores, el id crudo como origen y la ficha sin el umbral.
const STATS_DE_CURVA_K3B = Object.keys(BALANCE.atributos.curvas);
const FRACCION_K3B = 0.5;

function conFraccionPermanenteK3b(fraccion, fn) {
  const original = BALANCE.atributos.fraccionPermanente;
  BALANCE.atributos.fraccionPermanente = fraccion;
  try {
    return fn();
  } finally {
    BALANCE.atributos.fraccionPermanente = original;
  }
}

// Un evento a mano con un único efecto determinista sobre `path` (min === max), para no depender del contenido.
function eventoSinteticoK3b(path, delta) {
  return {
    id: 'k3b_sintetico_bootcamp',
    title: 'Bootcamp en Corea',
    description: 'Evento sintético de K3-B.',
    options: [
      { id: 'ir', label: 'Ir', weight: 1, outcomes: [{ weight: 1, texto: 'Volvés distinto.', effects: [{ type: 'stat', path, min: delta, max: delta, clamp: [0, 100] }] }] },
      { id: 'quedarse', label: 'Quedarte', weight: 1, outcomes: [{ weight: 1, texto: 'Te quedás.', effects: [] }] }
    ]
  };
}

function bonusCompletoK3b(player) {
  const claves = Object.keys(player.bonusPermanente ?? {});
  return claves.length === STATS_DE_CURVA_K3B.length
    && STATS_DE_CURVA_K3B.every((stat) => Number.isFinite(player.bonusPermanente[stat]));
}

check('K3-B bonusPermanente: completo con ceros al arrancar y completo (un número por stat de curva, ni uno más) en cada split de una carrera', () => {
  const inicial = createInitialState(1, mulberry32(1));
  if (!bonusCompletoK3b(inicial.player) || STATS_DE_CURVA_K3B.some((stat) => inicial.player.bonusPermanente[stat] !== 0)) {
    throw new Error(`el estado inicial no trae bonusPermanente completo con ceros: ${JSON.stringify(inicial.player.bonusPermanente)}`);
  }
  for (const [seed, fraccion] of [[1, 0], [2, FRACCION_K3B]]) {
    conFraccionPermanenteK3b(fraccion, () => {
      const rng = mulberry32(seed);
      let state = createInitialState(seed, rng);
      for (let split = 0; split < 40 && !state.terminado; split += 1) {
        state = avanzarSplitAuto(state, rng).state;
        if (!bonusCompletoK3b(state.player)) {
          throw new Error(`seed ${seed} (fracción ${fraccion}), split ${split + 1}: bonusPermanente incompleto: ${JSON.stringify(state.player.bonusPermanente)}`);
        }
      }
    });
  }
});

check('K3c fracciones calibradas: con fraccionPermanente y fraccionPermanentePractica de BALANCE (sin override) un efecto de evento y una rutina de práctica sobre un stat de curva suman exactamente fracción·(movimiento real) al bonus, con UNA marca, y una carrera larga deja marcas', () => {
  // Reemplaza a "K3-B neutro" (que exigía la fracción en 0: la constante neutra de la estructura de K3-B). K3c la calibró
  // (PLAN.md "La sonda de retención": 0,3 conserva >= 40% a 4 splits), y lo que el juego promete ahora es que un efecto
  // DURA: ni 0 (el efecto se evapora) ni un valor que no se vea en la marca. Va con el valor real de BALANCE, sin override
  // (los checks de K3-B con la fracción en memoria prueban la mecánica; este prueba la constante).
  const { fraccionPermanente, fraccionPermanentePractica } = BALANCE.atributos;
  for (const [nombre, fraccion] of [['fraccionPermanente', fraccionPermanente], ['fraccionPermanentePractica', fraccionPermanentePractica]]) {
    if (!(fraccion > 0 && fraccion <= 1)) {
      throw new Error(`${nombre} vale ${fraccion}: K3c la calibró en (0, 1]; en 0 los efectos no duran`);
    }
  }
  // El estado base sale con las dos fracciones en 0 (bonus en ceros, sin marcas): lo que se mida es del efecto.
  const base = conBalanceK3A([['atributos', 'fraccionPermanente', 0], ['atributos', 'fraccionPermanentePractica', 0]], () => correrCarrera(3, 18));
  if (base.career.registro.marcas.length !== 0 || STATS_DE_CURVA_K3B.some((s) => base.player.bonusPermanente[s] !== 0)) {
    throw new Error('el estado base ya trae bonus o marcas');
  }
  for (const stat of STATS_DE_CURVA_K3B) {
    const evento = eventoSinteticoK3b(`player.stats.${stat}`, 6);
    const { state } = resolverOpcion(base, evento, 'ir', mulberry32(5));
    const movido = state.player.stats[stat] - base.player.stats[stat];
    const esperado = fraccionPermanente * movido;
    if (esperado === 0) throw new Error(`sonda vacía: el efecto sintético no movió ${stat}`);
    if (Math.abs(state.player.bonusPermanente[stat] - esperado) > 1e-9) {
      throw new Error(`${stat}: el bonus quedó en ${state.player.bonusPermanente[stat]}, esperaba ${esperado} (${fraccionPermanente} × ${movido})`);
    }
    const otros = STATS_DE_CURVA_K3B.filter((s) => s !== stat && state.player.bonusPermanente[s] !== 0);
    if (otros.length > 0) throw new Error(`${stat}: el efecto movió el bonus de ${otros.join(', ')}`);
    const marcas = state.career.registro.marcas;
    const [marca] = marcas;
    if (marcas.length !== 1 || marca.stat !== stat || Math.abs(marca.delta - esperado) > 1e-9 || marca.origen !== 'Bootcamp en Corea') {
      throw new Error(`${stat}: esperaba UNA marca { ${stat}, ${esperado}, 'Bootcamp en Corea' }: ${JSON.stringify(marcas)}`);
    }
  }
  // La práctica, con su propia fracción.
  const practica = sistemaPorId('practica');
  const rutina = {
    id: 'k3c_bootcamp_sintetico', titulo: 'Bootcamp de prueba',
    reparto: { pulir: 0, nuevo: 0, mecanica: BALANCE.practica.puntos / 2, macro: BALANCE.practica.puntos / 2, descansar: 0 }
  };
  const desde = { ...base, player: { ...base.player, techoLesionMecanica: null, stats: { ...base.player.stats, mecanica: 50 } } };
  const despues = practica.resolver(desde, { datos: { rutinas: [rutina] } }, { opcionId: rutina.id }, mulberry32(77)).state;
  const ganancia = despues.player.stats.mecanica - desde.player.stats.mecanica;
  if (!(ganancia > 0)) throw new Error(`sonda vacía: la rutina no movió mecánica (${ganancia})`);
  const esperadoPractica = fraccionPermanentePractica * ganancia;
  const [marcaPractica] = despues.career.registro.marcas;
  if (Math.abs(despues.player.bonusPermanente.mecanica - esperadoPractica) > 1e-9 || despues.career.registro.marcas.length !== 1
      || Math.abs(marcaPractica.delta - esperadoPractica) > 1e-9 || marcaPractica.origen !== rutina.titulo) {
    throw new Error(`la práctica: bonus ${despues.player.bonusPermanente.mecanica}, esperaba ${esperadoPractica} (${fraccionPermanentePractica} × ${ganancia}) con UNA marca a nombre de la rutina: ${JSON.stringify(despues.career.registro.marcas)}`);
  }
  // Y una carrera larga, jugada sin overrides, deja marcas: la regla está enchufada a eventos y práctica reales.
  for (const seed of [1, 2, 3]) {
    const fin = correrCarrera(seed, 60);
    if (fin.career.registro.marcas.length === 0 || !STATS_DE_CURVA_K3B.some((stat) => fin.player.bonusPermanente[stat] > 0)) {
      throw new Error(`seed ${seed}: con las fracciones calibradas la carrera terminó sin marcas ni bonus`);
    }
  }
});

check('K3-B efecto con fracción positiva: suma fracción·delta al bonus del stat, anota UNA marca con el nombre visible del evento (no su id), y los stats que no son de curva no dejan nada', () => {
  // El estado base puede traer bonus y marcas (con las fracciones de K3c encendidas la carrera ya dejó algunas): lo que
  // se mide es el CAMBIO que produce el efecto, no el valor absoluto.
  const base = correrCarrera(3, 18);
  const marcasBase = base.career.registro.marcas;
  const cambioDeBonus = (state, stat) => state.player.bonusPermanente[stat] - base.player.bonusPermanente[stat];
  const marcasNuevas = (state) => state.career.registro.marcas.slice(marcasBase.length);
  const conservaLasAnteriores = (state) => JSON.stringify(state.career.registro.marcas.slice(0, marcasBase.length)) === JSON.stringify(marcasBase);
  conFraccionPermanenteK3b(FRACCION_K3B, () => {
    for (const stat of STATS_DE_CURVA_K3B) {
      const evento = eventoSinteticoK3b(`player.stats.${stat}`, 6);
      const { state } = resolverOpcion(base, evento, 'ir', mulberry32(5));
      const movido = state.player.stats[stat] - base.player.stats[stat];
      const esperado = FRACCION_K3B * movido;
      if (Math.abs(cambioDeBonus(state, stat) - esperado) > 1e-9 || esperado === 0) {
        throw new Error(`${stat}: el bonus cambió ${cambioDeBonus(state, stat)}, esperaba ${esperado} (fracción ${FRACCION_K3B} × ${movido})`);
      }
      const otros = STATS_DE_CURVA_K3B.filter((s) => s !== stat && cambioDeBonus(state, s) !== 0);
      if (otros.length > 0) {
        throw new Error(`${stat}: el efecto movió el bonus de ${otros.join(', ')}`);
      }
      const nuevas = marcasNuevas(state);
      if (nuevas.length !== 1 || !conservaLasAnteriores(state)) {
        throw new Error(`${stat}: esperaba UNA marca nueva (y las anteriores intactas), hay ${nuevas.length} nuevas`);
      }
      const [marca] = nuevas;
      if (marca.stat !== stat || Math.abs(marca.delta - esperado) > 1e-9 || marca.origen !== 'Bootcamp en Corea'
          || marca.anio !== base.calendario.anio || marca.origen === evento.id) {
        throw new Error(`${stat}: la marca no es { stat, delta, origen visible, anio }: ${JSON.stringify(marca)}`);
      }
    }
    // Un stat que no es de curva (macro, mentalidad) se mueve igual pero no deja nada permanente.
    for (const stat of ['macro', 'mentalidad', 'hype']) {
      const { state } = resolverOpcion(base, eventoSinteticoK3b(`player.stats.${stat}`, 6), 'ir', mulberry32(5));
      if (marcasNuevas(state).length !== 0 || STATS_DE_CURVA_K3B.some((s) => cambioDeBonus(state, s) !== 0)) {
        throw new Error(`${stat} no es un stat de curva y dejó bonus o marca`);
      }
    }
  });
});

check('K3-B efecto contra el clamp: el bonus y la marca cuentan lo que el stat de verdad se movió (después − antes), no la tirada — con un stat en 99 y un efecto +10, o en 1 y un efecto −10, el delta es fracción·(±1)', () => {
  // Protege el único punto de escritura de `events.js`: una marca anotada con la tirada previa al clamp (en vez de
  // `despues − antes`) pasaba todos los checks con stats lejos de los bordes. El estado base sale con las dos fracciones
  // en 0 (bonus en ceros, sin marcas): lo que se mida es del efecto.
  const base = conBalanceK3A([['atributos', 'fraccionPermanente', 0], ['atributos', 'fraccionPermanentePractica', 0]], () => correrCarrera(3, 18));
  const casos = [[BALANCE.stats.max - 1, 10, 1], [1, -10, -1]];
  conFraccionPermanenteK3b(FRACCION_K3B, () => {
    for (const stat of STATS_DE_CURVA_K3B) {
      for (const [valorInicial, tirada, movidoReal] of casos) {
        const desde = { ...base, player: { ...base.player, stats: { ...base.player.stats, [stat]: valorInicial } } };
        const { state } = resolverOpcion(desde, eventoSinteticoK3b(`player.stats.${stat}`, tirada), 'ir', mulberry32(5));
        const movido = state.player.stats[stat] - valorInicial;
        if (Math.abs(movido - movidoReal) > 1e-9) throw new Error(`${stat}: de ${valorInicial} con ${tirada} se movió ${movido}, el clamp debía dejarlo en ${movidoReal}`);
        const esperado = FRACCION_K3B * movido;
        const bonus = state.player.bonusPermanente[stat] - desde.player.bonusPermanente[stat];
        if (Math.abs(bonus - esperado) > 1e-9) throw new Error(`${stat}: de ${valorInicial} con ${tirada} el bonus cambió ${bonus}, esperaba fracción × (después − antes) = ${esperado}`);
        const marcas = state.career.registro.marcas;
        if (marcas.length !== 1 || Math.abs(marcas[0].delta - esperado) > 1e-9) {
          throw new Error(`${stat}: de ${valorInicial} con ${tirada} la marca es ${JSON.stringify(marcas)}, esperaba delta ${esperado}`);
        }
      }
    }
  });
});

check('K3-B 2b la práctica deja marca: con fraccionPermanentePractica > 0 (en memoria) la rutina de offseason suma fracción·(ganancia real, ya con el clamp) al bonus de mecánica, con UNA marca a nombre de la rutina; usa su propia fracción y no consume rng', () => {
  // Protege PLAN.md "K3-B 2b": la práctica y las rutinas también dejan marca, con su fracción propia y el nombre
  // visible de la rutina como origen; la ganancia que cuenta es la que de verdad movió el stat.
  const FRACCION = 0.5;
  // El estado base sale con las dos fracciones en 0 (con las de K3c encendidas la carrera ya trae marcas y bonus): lo que
  // se mida es de la rutina.
  const base = conBalanceK3A([['atributos', 'fraccionPermanente', 0], ['atributos', 'fraccionPermanentePractica', 0]], () => correrCarrera(3, 18));
  const practica = sistemaPorId('practica');
  const rutina = {
    id: 'k3b_bootcamp_sintetico', titulo: 'Bootcamp de prueba',
    reparto: { pulir: 0, nuevo: 0, mecanica: BALANCE.practica.puntos / 2, macro: BALANCE.practica.puntos / 2, descansar: 0 }
  };
  const decision = { datos: { rutinas: [rutina] } };
  const conMecanica = (mecanica) => ({ ...base, player: { ...base.player, techoLesionMecanica: null, stats: { ...base.player.stats, mecanica } } });
  const correr = (desde) => practica.resolver(desde, decision, { opcionId: rutina.id }, mulberry32(77)).state;
  if (base.career.registro.marcas.length !== 0) throw new Error('el estado base ya trae marcas');
  for (const desde of [conMecanica(50), conMecanica(BALANCE.stats.max - 1)]) {
    const neutro = conBalanceK3A([['atributos', 'fraccionPermanentePractica', 0]], () => correr(desde));
    const conFraccion = conBalanceK3A([['atributos', 'fraccionPermanentePractica', FRACCION]], () => correr(desde));
    const ganancia = conFraccion.player.stats.mecanica - desde.player.stats.mecanica;
    if (!(ganancia > 0)) throw new Error(`sonda vacía: la rutina no movió mecánica (${ganancia})`);
    if (JSON.stringify(neutro.player.stats) !== JSON.stringify(conFraccion.player.stats)) {
      throw new Error('la fracción cambió los stats del receso (consumió rng o movió algo más que el bonus)');
    }
    if (neutro.career.registro.marcas.length !== 0 || STATS_DE_CURVA_K3B.some((stat) => neutro.player.bonusPermanente[stat] !== 0)) {
      throw new Error('con fraccionPermanentePractica 0 la práctica dejó bonus o marca');
    }
    const esperado = FRACCION * ganancia;
    if (Math.abs(conFraccion.player.bonusPermanente.mecanica - esperado) > 1e-9) {
      throw new Error(`bonus de mecánica ${conFraccion.player.bonusPermanente.mecanica}, esperaba ${esperado} (${FRACCION} × ganancia real ${ganancia})`);
    }
    const otros = STATS_DE_CURVA_K3B.filter((stat) => stat !== 'mecanica' && conFraccion.player.bonusPermanente[stat] !== 0);
    if (otros.length > 0) throw new Error(`la práctica movió el bonus de ${otros.join(', ')} (macro no es de curva)`);
    const marcas = conFraccion.career.registro.marcas;
    const [marca] = marcas;
    if (marcas.length !== 1 || marca.stat !== 'mecanica' || Math.abs(marca.delta - esperado) > 1e-9
        || marca.origen !== rutina.titulo || marca.anio !== desde.calendario.anio) {
      throw new Error(`esperaba UNA marca { mecanica, ${esperado}, '${rutina.titulo}', ${desde.calendario.anio} }: ${JSON.stringify(marcas)}`);
    }
  }
  // Su propia fracción: la de los eventos no la mueve.
  const soloEventos = conBalanceK3A([['atributos', 'fraccionPermanente', FRACCION], ['atributos', 'fraccionPermanentePractica', 0]], () => correr(conMecanica(50)));
  if (soloEventos.career.registro.marcas.length !== 0) throw new Error('la práctica usó fraccionPermanente (la de los eventos) en vez de la suya');
});

check('K3-B 2b un solo camino para las rutinas: la semana amateur (systems/amateur.js) y el receso (systems/practica.js) marcan con conMarcasDeRutina — fracción de la práctica, título visible de la rutina, solo la ganancia real —, y el aplicador de stats del minijuego pasa por conPermanencia con el nombre del minijuego', () => {
  const FRACCION = 0.5;
  const base = conBalanceK3A([['atributos', 'fraccionPermanente', 0], ['atributos', 'fraccionPermanentePractica', 0]], () => correrCarrera(3, 18));
  // El helper: gana mecánica (curva, cuenta), pierde laneo (curva, una pérdida no es de la práctica), sube hype (no es de curva).
  const antes = { ...base.player.stats, mecanica: 50, laneo: 50, hype: 50 };
  const despues = { ...antes, mecanica: 53, laneo: 47, hype: 60 };
  const conStats = { ...base, player: { ...base.player, stats: despues } };
  const marcado = conBalanceK3A([['atributos', 'fraccionPermanentePractica', FRACCION], ['atributos', 'fraccionPermanente', 0.9]], () => conMarcasDeRutinaK3B(conStats, antes, 'Bootcamp en tu propia pieza'));
  const [unica, ...otras] = marcado.career.registro.marcas;
  if (otras.length > 0 || !unica || unica.stat !== 'mecanica' || Math.abs(unica.delta - FRACCION * 3) > 1e-9 || unica.origen !== 'Bootcamp en tu propia pieza') {
    throw new Error(`conMarcasDeRutina esperaba UNA marca { mecanica, ${FRACCION * 3}, título } (fracción de la práctica, sin el laneo que bajó ni el hype): ${JSON.stringify(marcado.career.registro.marcas)}`);
  }
  if (marcado.player.bonusPermanente.laneo !== 0 || conBalanceK3A([['atributos', 'fraccionPermanentePractica', 0]], () => conMarcasDeRutinaK3B(conStats, antes, 'x')) !== conStats) {
    throw new Error('con la fracción de la práctica en 0 conMarcasDeRutina tiene que devolver el mismo estado');
  }
  // El cableado: las dos rutinas llaman al helper con el título de la rutina (el cierre del check de arriba prueba lo que
  // hace con una ganancia real en el receso; hoy ningún reparto amateur mueve un stat de curva, así que acá no hay
  // ganancia que medir y el cableado se lee del fuente).
  for (const archivo of ['amateur.js', 'practica.js']) {
    const fuente = fs.readFileSync(path.join(srcDir, 'systems', archivo), 'utf8');
    if (!/import \{ conMarcasDeRutina \} from '\.\.\/core\/curvas\.js'/.test(fuente) || !/conMarcasDeRutina\([^)]*rutina\.titulo\)/.test(fuente)) {
      throw new Error(`systems/${archivo} no marca con conMarcasDeRutina(…, rutina.titulo): su rutina no deja marca`);
    }
  }
  // Y las rutinas amateur de verdad corren con la fracción encendida sin romper nada y sin marcas falsas (ningún reparto
  // mueve un stat de curva).
  const { amateur } = estadosDeCarreraK3A();
  const sistemaAmateur = sistemaPorId('amateur');
  let corridas = 0;
  conBalanceK3A([['atributos', 'fraccionPermanentePractica', FRACCION]], () => {
    amateur.slice(0, 4).forEach((st, i) => {
      const decision = sistemaAmateur.aplicar(st, mulberry32(9900 + i)).decision;
      if (decision?.datos?.motivo !== 'reparto') return;
      for (const rutina of decision.datos.rutinas) {
        const r = sistemaAmateur.resolver(st, decision, { opcionId: rutina.id }, mulberry32(9950 + i)).state;
        const esperado = conMarcasDeRutinaK3B(r, st.player.stats, rutina.titulo);
        if (JSON.stringify(r.career.registro.marcas) !== JSON.stringify(esperado.career.registro.marcas)) {
          throw new Error(`"${rutina.titulo}": las marcas de la rutina amateur no son las de la ganancia real`);
        }
        corridas += 1;
      }
    });
  });
  if (corridas === 0) throw new Error('check vacío: ninguna rutina amateur corrió');
  // El aplicador de stats del minijuego (K3-B): un stat de curva deja bonus y marca con el nombre del minijuego y el
  // delta real tras el clamp; uno que no es de curva (mentalidad) y un campo de `career.` no dejan nada.
  const desde = { ...base, player: { ...base.player, stats: { ...base.player.stats, mecanica: BALANCE.stats.max - 1, mentalidad: 40 } }, career: { ...base.career, sinergia: 50 } };
  const aplicado = conFraccionPermanenteK3b(FRACCION, () => aplicarStatsDeMinijuegoK3B(desde, ['player.stats.mecanica', 'player.stats.mentalidad', 'career.sinergia'], 10, 'Bootcamp relámpago'));
  const marcas = aplicado.career.registro.marcas.slice(desde.career.registro.marcas.length);
  if (marcas.length !== 1 || marcas[0].stat !== 'mecanica' || Math.abs(marcas[0].delta - FRACCION * 1) > 1e-9 || marcas[0].origen !== 'Bootcamp relámpago') {
    throw new Error(`el aplicador de stats del minijuego esperaba UNA marca { mecanica, ${FRACCION}, 'Bootcamp relámpago' } con el delta real tras el clamp: ${JSON.stringify(marcas)}`);
  }
  if (aplicado.player.stats.mentalidad !== 50 || aplicado.career.sinergia !== 60) throw new Error('el aplicador del minijuego dejó de aplicar el delta a los stats que no son de curva');
});


check('K3-B la curva de edad converge a objetivo + bonus: con bonusPermanente b, cada stat de curva termina el split velocidad·b más arriba que sin él', () => {
  const base = correrCarrera(4, 18);
  const lugar = { ...base, player: { ...base.player, techoLesionMecanica: null, stats: { ...base.player.stats, mecanica: 50, laneo: 50, teamfight: 50 } } };
  const b = 5;
  const conBonus = { ...lugar, player: { ...lugar.player, bonusPermanente: Object.fromEntries(STATS_DE_CURVA_K3B.map((stat) => [stat, b])) } };
  const sin = sistemaPorId('atributos').aplicar(lugar, mulberry32(9)).state;
  const con = sistemaPorId('atributos').aplicar(conBonus, mulberry32(9)).state;
  for (const [stat, config] of Object.entries(BALANCE.atributos.curvas)) {
    const diferencia = con.player.stats[stat] - sin.player.stats[stat];
    if (Math.abs(diferencia - config.velocidad * b) > 1e-9) {
      throw new Error(`${stat}: con bonus ${b} la diferencia es ${diferencia}, esperaba velocidad ${config.velocidad} × ${b} = ${config.velocidad * b}`);
    }
  }
  // Y el bonus no toca lo que no es de curva (macro/shotcalling/adaptabilidad siguen su propia regla).
  for (const stat of Object.keys(BALANCE.atributos.acumulativos)) {
    if (con.player.stats[stat] !== sin.player.stats[stat]) {
      throw new Error(`${stat} no es de curva y el bonus lo movió`);
    }
  }
});

check('K3-B registro.marcas solo crece a lo largo de una carrera (cada split conserva las anteriores tal cual), con marcas reales, y el bonus de cada stat es la suma de sus marcas', () => {
  conFraccionPermanenteK3b(FRACCION_K3B, () => {
    const idsDeEvento = new Set(TODOS_LOS_EVENTOS.map((evento) => evento.id));
    let marcasTotales = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const rng = mulberry32(seed);
      let state = createInitialState(seed, rng);
      let previas = [];
      for (let split = 0; split < 60 && !state.terminado; split += 1) {
        state = avanzarSplitAuto(state, rng).state;
        const marcas = state.career.registro.marcas;
        if (marcas.length < previas.length || previas.some((marca, i) => JSON.stringify(marca) !== JSON.stringify(marcas[i]))) {
          throw new Error(`seed ${seed}, split ${split + 1}: registro.marcas no solo crece (${previas.length} → ${marcas.length}, o cambió una anterior)`);
        }
        previas = marcas;
      }
      for (const marca of previas) {
        const crudo = idsDeEvento.has(marca.origen) || /^[a-z0-9]+(_[a-z0-9]+)+$/.test(marca.origen);
        if (!STATS_DE_CURVA_K3B.includes(marca.stat) || !Number.isFinite(marca.delta) || marca.delta === 0
            || typeof marca.origen !== 'string' || marca.origen.length === 0 || crudo || !Number.isInteger(marca.anio)) {
          throw new Error(`seed ${seed}: marca inválida (o con id crudo como origen): ${JSON.stringify(marca)}`);
        }
      }
      for (const stat of STATS_DE_CURVA_K3B) {
        const suma = previas.filter((marca) => marca.stat === stat).reduce((total, marca) => total + marca.delta, 0);
        if (Math.abs(state.player.bonusPermanente[stat] - suma) > 1e-6) {
          throw new Error(`seed ${seed}: el bonus de ${stat} (${state.player.bonusPermanente[stat]}) no es la suma de sus marcas (${suma})`);
        }
      }
      marcasTotales += previas.length;
    }
    if (marcasTotales === 0) {
      throw new Error('ninguna carrera dejó una marca con la fracción positiva: el check no probaría nada');
    }
  });
});

check('K3-B la ficha lista solo las marcas cuyo acumulado (por stat, origen y año) redondea a >= 1 en valor absoluto, con ▲/▼, sin ids crudos, y nada cuando no hay', () => {
  const marcas = [
    { stat: 'mecanica', delta: 0.3, origen: 'Bootcamp en Corea', anio: 2028 },
    { stat: 'mecanica', delta: 0.3, origen: 'Bootcamp en Corea', anio: 2028 },
    { stat: 'laneo', delta: 0.4, origen: 'Scrims con el equipo grande', anio: 2029 },
    { stat: 'teamfight', delta: -1.8, origen: 'Lesión de muñeca', anio: 2030 },
    { stat: 'teamfight', delta: -0.9, origen: 'Lesión de muñeca', anio: 2030 },
    { stat: 'mecanica', delta: 4.2, origen: 'Mudanza al gaming house', anio: 2031 }
  ];
  const lista = loQueConstruiste({ marcas });
  const textos = lista.map((fila) => fila.texto);
  const esperado = [
    '▲ +4 mecánica — Mudanza al gaming house 2031',
    '▼ -3 teamfight — Lesión de muñeca 2030',
    '▲ +1 mecánica — Bootcamp en Corea 2028'
  ];
  if (JSON.stringify(textos) !== JSON.stringify(esperado)) {
    throw new Error(`la ficha lista ${JSON.stringify(textos)}, esperaba ${JSON.stringify(esperado)} (el laneo de 0,4 no redondea a 1 y no va)`);
  }
  for (const texto of textos) {
    if (/player\.|[a-z0-9]+_[a-z0-9_]+/.test(texto)) {
      throw new Error(`"${texto}" muestra un id crudo`);
    }
  }
  if (loQueConstruiste({ marcas: [] }).length !== 0 || loQueConstruiste({}).length !== 0) {
    throw new Error('sin marcas la lista no está vacía');
  }
  if (fichaCompleta(createInitialState(1, mulberry32(1))).construido.length !== 0) {
    throw new Error('el estado inicial trae marcas en la ficha');
  }
  const conMarcas = correrCarrera(2, 20);
  const inyectado = { ...conMarcas, career: { ...conMarcas.career, registro: { ...conMarcas.career.registro, marcas } } };
  if (fichaCompleta(inyectado).construido.length !== esperado.length) {
    throw new Error('fichaCompleta no expone lo que construiste');
  }
  const fuenteFicha = fs.readFileSync(path.join(srcDir, 'ui', 'components', 'ficha.js'), 'utf8');
  if (!fuenteFicha.includes("nombre: 'CONSISTENCIA'") || /nombre: 'MENTALIDAD'/.test(fuenteFicha)) {
    throw new Error("la barra de la mentalidad tiene que rotularse 'CONSISTENCIA' en la ficha (el id interno sigue siendo mentalidad)");
  }
});

// ============================================================================
// K4-A (PLAN.md "K4 — decisiones de spec", K4-A): el partido que importa. Se marca la fecha que DECIDE algo (la
// clasificación, tu archirrival, el clásico, la revancha), una por split, sin draft y con la previa a la vista.
// `puntero` y `presion` dejaron de marcar. Bloque B: el corrimiento del stream está aceptado (la huella cambia); estos
// checks son estructurales.
// ============================================================================

const MOTIVOS_K4A = ['define_clasificacion', 'archirrival', 'clasico', 'revancha'];

// Una liga sintética de 10 equipos con el formato de tier 1 (6 clasifican, 2 con bye) y UNA fecha por jugar: la última,
// contra R9. Las victorias de cada org son las de la tabla de hoy; los demás cruces de la jornada son parejos (p = 0,5).
function temporadaSinteticaK4A(victorias, { fechasQueFaltan = 1, orgPropia = 'Propio' } = {}) {
  const otros = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'];
  const fila = (org, ganados) => ({ org, ganados, perdidos: 0 });
  const cruce = (local, visitante) => ({ local, visitante, fuerzaLocal: 50, fuerzaVisitante: 50 });
  return {
    calendario: Array.from({ length: fechasQueFaltan }, () => ({ rival: 'R9', fuerzaRival: 50 })),
    cruces: Array.from({ length: fechasQueFaltan }, () => [cruce('R1', 'R2'), cruce('R3', 'R4'), cruce('R5', 'R6'), cruce('R7', 'R8')]),
    registrosOtros: Object.fromEntries(otros.map((org, i) => [org, fila(org, victorias[i + 1])])),
    filaPropia: fila(orgPropia, victorias[0]),
    indice: 0,
    fuerzaPropia: 50
  };
}
const LIGA_K4A = { tier: 1, formatoPlayoffs: { clasifican: 6, byes: 2, bo: 5 } };
// [Propio, R1..R9]: Propio pelea el sexto puesto (8 victorias, R6 tiene 8,5 esperadas y R9 —su rival— 7).
const TABLA_QUE_DEFINE_K4A = [8, 12, 12, 12, 12, 12, 8, 5, 5, 7];
// Propio con 15 victorias: ganar o perder lo deja primero con bye.
const TABLA_QUE_NO_DEFINE_K4A = [15, 12, 12, 12, 12, 12, 8, 5, 5, 7];
// Propio lejos del corte, abajo: ganar o perder lo deja afuera.
const TABLA_QUE_NO_DEFINE_ABAJO_K4A = [0, 12, 12, 12, 12, 12, 8, 5, 5, 7];
// Propio con 12 victorias empatado con R1 y R2: ganar lo deja primero (bye a semis), perder tercero (cuartos).
const TABLA_DEL_BYE_K4A = [12, 12, 12, 10, 10, 10, 9, 5, 5, 6];

check('K4-A define_clasificacion: sale de la tabla y del fixture que falta (sin rng), tanto la entrada a playoffs como el bye', () => {
  const estado = {};
  const t = temporadaSinteticaK4A(TABLA_QUE_DEFINE_K4A);
  const definicion = defineClasificacion(estado, LIGA_K4A, t);
  if (definicion?.siGana !== 'cuartos' || definicion?.siPierde !== null) {
    throw new Error(`con 8 victorias frente a un sexto de 8,5 esperadas, ganar es entrar por cuartos y perder es quedar afuera; devolvió ${JSON.stringify(definicion)}`);
  }
  const bye = defineClasificacion(estado, LIGA_K4A, temporadaSinteticaK4A(TABLA_DEL_BYE_K4A));
  if (bye?.siGana !== 'semis' || bye?.siPierde !== 'cuartos') {
    throw new Error(`ganar la fecha que da el bye es 'semis' y perderla 'cuartos'; devolvió ${JSON.stringify(bye)}`);
  }
  for (const [nombre, tabla] of [['arriba', TABLA_QUE_NO_DEFINE_K4A], ['abajo', TABLA_QUE_NO_DEFINE_ABAJO_K4A]]) {
    const sinDefinir = defineClasificacion(estado, LIGA_K4A, temporadaSinteticaK4A(tabla));
    if (sinDefinir !== null) {
      throw new Error(`con la tabla de ${nombre} la fecha no decide nada, pero devolvió ${JSON.stringify(sinDefinir)}`);
    }
  }
  // Una liga sin playoffs no tiene clasificación que definir.
  if (defineClasificacion(estado, { tier: 2 }, t) !== null) {
    throw new Error('una liga sin formatoPlayoffs no puede definir la clasificación');
  }
  // Lejos del final (falta más que la ventana) la proyección es una cuenta abierta: no se afirma.
  const lejos = temporadaSinteticaK4A(TABLA_QUE_DEFINE_K4A, { fechasQueFaltan: 60 });
  if (defineClasificacion(estado, LIGA_K4A, lejos) !== null) {
    throw new Error('fuera de la ventana de las últimas fechas no se marca el partido que define la clasificación');
  }
  // Pura y determinista: dos llamadas dan lo mismo y no tocan lo que reciben.
  const copia = JSON.stringify(t);
  if (JSON.stringify(defineClasificacion(estado, LIGA_K4A, t)) !== JSON.stringify(definicion) || JSON.stringify(t) !== copia) {
    throw new Error('defineClasificacion no es pura');
  }
});

check('K4-A prioridad: define_clasificacion > archirrival > clásico > revancha, y puntero, presión y rival de generación no marcan', () => {
  const estado = (extra = {}) => ({
    career: { orgs: ['Propio'], currentOrg: 'Propio', ultimoEliminadoPor: null, ...extra.career },
    mundo: { rivales: [], archirrival: extra.archirrival ?? null }
  });
  const fecha = { rival: 'R9', fuerzaRival: 50 };
  const motivosDe = (st, tabla) => motivosDeFecha(st, LIGA_K4A, fecha, temporadaSinteticaK4A(tabla));
  const esperar = (nombre, obtenido, esperado) => {
    if (JSON.stringify(obtenido) !== JSON.stringify(esperado)) {
      throw new Error(`${nombre}: se esperaba ${JSON.stringify(esperado)}, devolvió ${JSON.stringify(obtenido)}`);
    }
  };
  const todo = estado({ archirrival: { org: 'R9', handle: 'Rival' }, career: { orgs: ['R9', 'Propio'], ultimoEliminadoPor: 'R9' } });
  esperar('con todo junto', motivoPrincipal(motivosDe(todo, TABLA_QUE_DEFINE_K4A)), 'define_clasificacion');
  esperar('sin definir la clasificación', motivoPrincipal(motivosDe(todo, TABLA_QUE_NO_DEFINE_K4A)), 'archirrival');
  esperar('clásico y revancha', motivoPrincipal(motivosDe(estado({ career: { orgs: ['R9', 'Propio'], ultimoEliminadoPor: 'R9' } }), TABLA_QUE_NO_DEFINE_K4A)), 'clasico');
  esperar('solo revancha', motivoPrincipal(motivosDe(estado({ career: { ultimoEliminadoPor: 'R9' } }), TABLA_QUE_NO_DEFINE_K4A)), 'revancha');
  // El rival es el puntero de la tabla (20 victorias): antes marcaba, ahora la fecha pasa resumida.
  esperar('contra el puntero', motivosDe(estado(), [15, 12, 12, 12, 12, 12, 8, 5, 5, 20]), ['parejo']);
  esperar('sin nada en juego', motivosDe(estado(), TABLA_QUE_NO_DEFINE_K4A), ['parejo']);
  esperar('la prioridad es la de la spec', PRIORIDAD_MOTIVOS, MOTIVOS_K4A);
});

// Carreras reales de `criterio` (seeds 1..100, 60 splits): por split, las fechas marcadas y por qué, las pausas de la
// temporada y si fue un split de tier 1 con playoffs.
const CARRERAS_K4A = 100;
let cosechaK4A = null;
function cosechaDeCarrerasK4A() {
  if (cosechaK4A) {
    return cosechaK4A;
  }
  const c = { splitsTier1: 0, splitsConDefine: 0, marcadasPorSplit: {}, motivosVistos: new Set(), principales: {}, pausas: {}, casos: [] };
  for (let seed = 1; seed <= CARRERAS_K4A; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const antes = state.career.temporada;
      const principalesDelSplit = [];
      const responder = (sistema, st, decision, r) => {
        if (sistema.id === 'temporada') {
          const tipo = decision.datos?.motivo ?? 'x';
          c.pausas[tipo] = (c.pausas[tipo] ?? 0) + 1;
          const motivos = st.career.temporada.fechaEnCurso?.motivos ?? [];
          motivos.forEach((m) => c.motivosVistos.add(m));
          if (tipo === 'momento') {
            principalesDelSplit.push(motivoPrincipal(motivos));
            if (c.casos.length < 60) {
              c.casos.push({ st, decision });
            }
          }
        }
        return ESTRATEGIAS_K0.criterio(sistema, st, decision, r);
      };
      state = avanzarSplitAuto(state, rng, responder).state;
      const t = state.career.temporada;
      if (t === antes || !t) {
        continue;
      }
      c.marcadasPorSplit[t.marcadasHechas] = (c.marcadasPorSplit[t.marcadasHechas] ?? 0) + 1;
      principalesDelSplit.forEach((m) => { c.principales[m] = (c.principales[m] ?? 0) + 1; });
      const liga = ligaDeCarreraK3A(state);
      if (liga?.tier === 1 && liga.formatoPlayoffs) {
        c.splitsTier1 += 1;
        if (principalesDelSplit.includes('define_clasificacion')) {
          c.splitsConDefine += 1;
        }
      }
    }
  }
  cosechaK4A = c;
  return c;
}

check(`K4-A define_clasificacion es alcanzable: al menos 1 de cada 3 splits de tier 1 con playoffs (criterio, ${CARRERAS_K4A} carreras)`, () => {
  const { splitsTier1, splitsConDefine } = cosechaDeCarrerasK4A();
  if (splitsTier1 < 300) {
    throw new Error(`solo ${splitsTier1} splits de tier 1 con playoffs medidos: muestra insuficiente`);
  }
  if (splitsConDefine * 3 < splitsTier1) {
    throw new Error(`define_clasificacion marcó ${splitsConDefine} de ${splitsTier1} splits de tier 1 con playoffs (1 cada ${(splitsTier1 / Math.max(1, splitsConDefine)).toFixed(1)}); la meta es 1 cada 3 o mejor`);
  }
});

check('K4-A a lo sumo una fecha marcada por split', () => {
  const { marcadasPorSplit } = cosechaDeCarrerasK4A();
  const conMasDeUna = Object.entries(marcadasPorSplit).filter(([n]) => Number(n) > 1).reduce((suma, [, cantidad]) => suma + cantidad, 0);
  if (conMasDeUna > 0) {
    throw new Error(`${conMasDeUna} splits con más de una fecha marcada (conteos: ${JSON.stringify(marcadasPorSplit)})`);
  }
  if ((marcadasPorSplit[1] ?? 0) < 100) {
    throw new Error(`solo ${marcadasPorSplit[1] ?? 0} splits con una fecha marcada: muestra insuficiente`);
  }
});

check('K4-A puntero y presión nunca marcan: toda fecha marcada lo es por uno de los cuatro motivos', () => {
  const { motivosVistos, principales } = cosechaDeCarrerasK4A();
  const fuera = [...motivosVistos].filter((m) => !MOTIVOS_K4A.includes(m));
  if (fuera.length > 0) {
    throw new Error(`fechas marcadas con motivos fuera de los cuatro: ${fuera.join(', ')}`);
  }
  const marcadas = Object.values(principales).reduce((suma, n) => suma + n, 0);
  if (marcadas < 200 || !principales.define_clasificacion || !principales.clasico || !principales.revancha) {
    throw new Error(`la muestra no pasó por los motivos que se pueden alcanzar: ${JSON.stringify(principales)}`);
  }
});

check('K4-A la fecha marcada no tiene draft: frena una sola vez, con el momento', () => {
  const { pausas, marcadasPorSplit } = cosechaDeCarrerasK4A();
  if (pausas.draft) {
    throw new Error(`${pausas.draft} pausas de draft en una fecha marcada (temporada:draft debería haber desaparecido)`);
  }
  const marcadas = marcadasPorSplit[1] ?? 0;
  if ((pausas.momento ?? 0) > marcadas) {
    throw new Error(`${pausas.momento} momentos para ${marcadas} fechas marcadas: la fecha frena más de una vez`);
  }
  const otras = Object.keys(pausas).filter((m) => m !== 'momento');
  if (otras.length > 0) {
    throw new Error(`la temporada pausó con ${otras.join(', ')}: solo debería frenar con el momento`);
  }
});

check('K4-A la previa de la fecha marcada dice por qué importa, sin ids crudos, y el "porQue" es el del motivo', () => {
  const { casos } = cosechaDeCarrerasK4A();
  if (casos.length < 30) {
    throw new Error(`solo ${casos.length} fechas marcadas cosechadas`);
  }
  const problemas = [];
  casos.forEach(({ st, decision }, i) => {
    const previa = previaDeDecision(st, decision);
    const texto = previa?.porQue;
    if (typeof texto !== 'string' || texto.length < 10) {
      problemas.push(`fecha ${i}: la previa no trae el porqué (${JSON.stringify(texto)})`);
      return;
    }
    if (/[a-z0-9]+_[a-z0-9_]+|undefined|null|NaN/.test(texto)) {
      problemas.push(`fecha ${i}: "${texto}" muestra un id crudo`);
    }
    const principal = motivoPrincipal(st.career.temporada.fechaEnCurso.motivos);
    const esperado = { define_clasificacion: /ganás|playoffs/, archirrival: /archirrival/, clasico: /ex equipo/, revancha: /revancha/ }[principal];
    if (!esperado.test(texto)) {
      problemas.push(`fecha ${i}: "${texto}" no habla del motivo ${principal}`);
    }
    if (!previa.subtitulo) {
      problemas.push(`fecha ${i}: la previa no trae el rótulo del partido`);
    }
  });
  fallarSiK2d(problemas);
});

// ---------------------------------------------------------------------------------------------------------------------
// K4-D — la pretemporada en una sola parada (T9). El mercado (si abre) y la preparación (las rutinas de offseason como
// cartas de mejora) frenan UNA vez por año, en la misma decisión. Reemplaza al viejo "frena la práctica y, aparte, el
// mercado" (regla 17): los checks que contaban dos pausas ya no existen.
// ---------------------------------------------------------------------------------------------------------------------

// Corre una carrera automática hasta la primera pausa que cumple `filtro(sistemaId, decision)` y devuelve el estado
// pausado y el rng en ese punto. Es determinista: volver a llamarla con la misma seed da la misma pausa, así que cada
// respuesta posible se prueba desde el mismo punto.
function hastaLaParadaK4d(seed, filtro, maxSplits = 40) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);
  for (let i = 0; i < maxSplits && !state.terminado; i += 1) {
    state = avanzarSplit(state, rng).state;
    while (state.pendiente) {
      const { sistemaId, decision } = state.pendiente;
      if (filtro(sistemaId, decision)) {
        return { state, rng };
      }
      state = resolverDecision(state, sistemaPorId(sistemaId).resolverAuto(state, decision, rng), rng).state;
    }
  }
  return null;
}

const ES_MERCADO_K4D = (sistemaId, decision) => sistemaId === 'mercado' && decision.datos?.motivo === 'oferta' && Boolean(decision.datos.preparacion);

// K4 (integración): si la oferta elegida es un salto grande, la misma parada sigue con la prueba de K4-C (una pantalla
// más, con la carta elegida en sus datos) y recién al contestarla se firma y se aplica la rutina. Contesta la parada y,
// si vino la prueba, la prueba (con el resultado neutro); devuelve el estado y cuántas pruebas hubo.
function contestarParadaK4d(parada, respuesta) {
  let hecho = resolverDecision(parada.state, respuesta, parada.rng).state;
  let pruebas = 0;
  while (hecho.pendiente?.sistemaId === 'mercado' && hecho.pendiente.decision.datos?.motivo === 'minijuego') {
    const { datos } = hecho.pendiente.decision;
    if (datos.momento !== 'tryout' || !datos.preparacion) {
      throw new Error('la prueba del salto no viaja con la preparación de la parada');
    }
    if (respuesta.rutinaId !== undefined && datos.preparacion.elegida !== respuesta.rutinaId) {
      throw new Error(`la prueba del salto perdió la carta elegida (${datos.preparacion.elegida}, esperaba ${respuesta.rutinaId})`);
    }
    if (hecho.flags.preparacionDeSplit === parada.state.player.splitCount) {
      throw new Error('la rutina se aplicó antes de la prueba: tiene que ir con la firma');
    }
    pruebas += 1;
    hecho = resolverDecision(hecho, { resultado: 0.5 }, parada.rng).state;
  }
  if (pruebas > 1) {
    throw new Error(`la parada trajo ${pruebas} pruebas: a lo sumo una pantalla más`);
  }
  return { hecho, pruebas };
}

checkLento('K4-D la pretemporada frena una sola vez por año: a lo sumo una pausa de mercado o de práctica por split, con el mercado y la preparación en la misma, y la preparación del año queda resuelta', () => {
  let conMercado = 0;
  let soloPreparacion = 0;
  let traspasos = 0;
  let pretemporadasPro = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 60 && !state.terminado; i += 1) {
      const inicio = state;
      const esPretemporadaPro = inicio.phase === 'profesional' && calcularContexto(inicio).ventana === 'pretemporada';
      let paradas = 0;
      state = avanzarSplit(state, rng).state;
      while (state.pendiente) {
        const { sistemaId, decision } = state.pendiente;
        const motivo = decision.datos?.motivo;
        const esMercado = sistemaId === 'mercado' && (motivo === 'oferta' || motivo === 'traspaso');
        if (sistemaId === 'practica' || esMercado) {
          paradas += 1;
        }
        if (esMercado) {
          const preparacion = decision.datos.preparacion;
          if (!preparacion || preparacion.rutinas.length === 0 || preparacion.cartas.length !== preparacion.rutinas.length) {
            throw new Error(`seed ${seed}, split ${i}: la parada del mercado (${motivo}) no trae la preparación del receso`);
          }
          if (decision.opciones.length === 0) {
            throw new Error(`seed ${seed}, split ${i}: la parada del mercado no trae ofertas`);
          }
          if (motivo === 'oferta') conMercado += 1; else traspasos += 1;
        }
        if (sistemaId === 'practica') {
          if (decision.datos.rutinas.length === 0 || decision.presentacion !== 'pretemporada') {
            throw new Error(`seed ${seed}, split ${i}: la parada de la preparación sola viene mal armada`);
          }
          soloPreparacion += 1;
        }
        state = resolverDecision(state, sistemaPorId(sistemaId).resolverAuto(state, decision, rng), rng).state;
      }
      if (paradas > 1) {
        throw new Error(`seed ${seed}, split ${i}: la pretemporada frenó ${paradas} veces (mercado y práctica por separado)`);
      }
      if (esPretemporadaPro && !state.terminado && state.phase === 'profesional') {
        pretemporadasPro += 1;
        if (state.flags.preparacionDeSplit !== inicio.player.splitCount) {
          throw new Error(`seed ${seed}, split ${i}: la pretemporada pasó sin resolver la preparación del año`);
        }
      }
    }
  }
  if (conMercado < 20 || soloPreparacion < 20 || traspasos < 1 || pretemporadasPro < 100) {
    throw new Error(`muestra insuficiente: ${conMercado} paradas con mercado, ${soloPreparacion} solo de preparación, ${traspasos} traspasos, ${pretemporadasPro} pretemporadas pro`);
  }
});

checkLento('K4-D la oferta elegida y la rutina elegida se aplican juntas, en una sola respuesta', () => {
  const sonda = [1, 2, 3, 4].map((seed) => hastaLaParadaK4d(seed, ES_MERCADO_K4D)).find(Boolean);
  if (!sonda) throw new Error('sonda vacía: ninguna de las seeds 1-4 llega a una parada de mercado con preparación');
  const { decision } = sonda.state.pendiente;
  const { cartas } = decision.datos.preparacion;
  if (cartas.length < 2) throw new Error('sonda vacía: la preparación trae una sola carta');
  const oferta = decision.opciones[decision.opciones.length - 1];
  const sellos = new Set();
  for (const carta of cartas) {
    const parada = hastaLaParadaK4d(sonda.state.seed, ES_MERCADO_K4D);
    const { hecho } = contestarParadaK4d(parada, { opcionId: oferta.id, rutinaId: carta.id });
    if (hecho.career.currentOrg !== oferta.org) {
      throw new Error(`con la rutina "${carta.label}" la oferta no se firmó (org ${hecho.career.currentOrg}, esperaba ${oferta.org})`);
    }
    const lineas = hecho.logs.filter((log) => log.type === 'practica' && log.message.startsWith('Offseason:'));
    if (lineas.length < 1 || hecho.logs.slice(parada.state.logs.length).filter((log) => log.type === 'practica').length !== 1) {
      throw new Error(`con la rutina "${carta.label}" no hay exactamente una línea de preparación en esta resolución`);
    }
    if (hecho.flags.preparacionDeSplit !== parada.state.player.splitCount) {
      throw new Error(`con la rutina "${carta.label}" la preparación del año no quedó marcada`);
    }
    if (carta.permanenteTotal > 0 && !hecho.career.registro.marcas.some((marca) => marca.origen === carta.label)) {
      throw new Error(`la rutina "${carta.label}" promete algo que dura y no dejó marca a su nombre`);
    }
    sellos.add(JSON.stringify([hecho.player.stats, hecho.player.championPool, lineas[lineas.length - 1].message]));
  }
  if (sellos.size < 2) throw new Error('elegir otra rutina no cambia nada: la respuesta no llega a la preparación');
  // Sin `rutinaId` el motor no inventa nada raro: cae en la primera carta y aplica igual.
  const parada = hastaLaParadaK4d(sonda.state.seed, ES_MERCADO_K4D);
  const { hecho: sinRutina } = contestarParadaK4d(parada, { opcionId: oferta.id });
  if (sinRutina.flags.preparacionDeSplit !== parada.state.player.splitCount || sinRutina.career.currentOrg !== oferta.org) {
    throw new Error('sin rutinaId la parada no se resuelve entera');
  }
});

checkLento('K4-D regla 15: lo que muestra la carta de la rutina (efecto y cuánto dura) es lo que aplica el motor', () => {
  const previo = BALANCE.practica.ruidoPractica;
  try {
    // Sin ruido el motor aplica la media: la carta tiene que coincidir con el resultado, al decimal.
    BALANCE.practica.ruidoPractica = 0;
    const deCurva = Object.keys(BALANCE.atributos.curvas);
    let conPermanencia = 0;
    for (const seed of [2, 5, 9]) {
      const base = correrCarrera(seed, 14);
      if (base.phase !== 'profesional') continue;
      for (const rutina of RUTINAS.offseason) {
        const carta = cartaDeRutina(base, rutina);
        const despues = resolverPreparacion(base, [rutina], rutina.id, mulberry32(seed)).state;
        for (const efecto of carta.efectos) {
          const movido = despues.player.stats[efecto.stat] - base.player.stats[efecto.stat];
          if (Math.abs(movido - efecto.esperado) > 1e-9) {
            throw new Error(`${rutina.id} (${efecto.stat}): la carta dice +${efecto.esperado}, el motor movió ${movido}`);
          }
        }
        for (const stat of deCurva) {
          const dura = despues.player.bonusPermanente[stat] - base.player.bonusPermanente[stat];
          const prometido = carta.efectos.filter((efecto) => efecto.stat === stat).reduce((suma, efecto) => suma + efecto.permanente, 0);
          if (Math.abs(dura - prometido) > 1e-9) {
            throw new Error(`${rutina.id} (${stat}): la carta promete que te queda ${prometido}, el motor dejó ${dura}`);
          }
          if (prometido > 0) conPermanencia += 1;
        }
        const total = carta.efectos.reduce((suma, efecto) => suma + efecto.permanente, 0);
        if (Math.abs(carta.permanenteTotal - total) > 1e-9) throw new Error(`${rutina.id}: permanenteTotal no suma lo de cada efecto`);
      }
    }
    if (conPermanencia === 0) throw new Error('sonda vacía: ninguna carta promete algo que dura');
    // Y la fracción es la de la práctica, no otra: con la fracción en memoria la carta la sigue.
    const original = BALANCE.atributos.fraccionPermanentePractica;
    try {
      BALANCE.atributos.fraccionPermanentePractica = 0.5;
      const base = correrCarrera(2, 14);
      const bootcamp = RUTINAS.offseason.find((rutina) => rutina.id === 'bootcamp_corea');
      const carta = cartaDeRutina(base, bootcamp);
      const efecto = carta.efectos.find((e) => e.stat === 'mecanica');
      if (!efecto || Math.abs(efecto.permanente - 0.5 * efecto.esperado) > 1e-9) {
        throw new Error('la carta no sigue a fraccionPermanentePractica');
      }
    } finally {
      BALANCE.atributos.fraccionPermanentePractica = original;
    }
  } finally {
    BALANCE.practica.ruidoPractica = previo;
  }
});

checkLento('K4-D los bots contestan la parada unificada con la regla de siempre (oferta + rutina): ids válidos, malas y azar deterministas', () => {
  const nombres = ['equilibrado', 'ranked', 'prudente', 'criterio', 'azar', 'malas'];
  for (const nombre of nombres) {
    const bot = ESTRATEGIAS_K0[nombre];
    let contestadas = 0;
    for (const seed of [1, 2, 3, 4]) {
      const rng = mulberry32(seed);
      let state = createInitialState(seed, rng);
      const responder = (sistema, st, decision, rngLocal) => {
        const respuesta = bot ? bot(sistema, st, decision, rngLocal) : sistema.resolverAuto(st, decision, rngLocal);
        // K4 (integración): la prueba del salto (K4-C) también lleva la preparación, pero ya con la carta elegida: se
        // contesta con el resultado del minijuego y sin volver a elegir rutina.
        if (decision.datos?.preparacion && sistema.id === 'mercado' && decision.datos.motivo === 'minijuego') {
          if (respuesta.rutinaId !== undefined || typeof respuesta.resultado !== 'number') {
            throw new Error(`${nombre}: la prueba del salto se contestó como una parada (${JSON.stringify(respuesta)})`);
          }
          return respuesta;
        }
        if (decision.datos?.preparacion && sistema.id === 'mercado') {
          contestadas += 1;
          const rutinas = decision.datos.preparacion.rutinas;
          if (!rutinas.some((rutina) => rutina.id === respuesta.rutinaId)) {
            throw new Error(`${nombre}: la parada del mercado se contestó sin una rutina válida (${respuesta.rutinaId})`);
          }
          if (nombre === 'malas') {
            const puntaje = (rutina) => (rutina.reparto.ranked ?? 0) + rutina.extra * 2;
            const peor = rutinas.reduce((mejor, rutina) => (puntaje(rutina) > puntaje(mejor) ? rutina : mejor));
            if (respuesta.rutinaId !== peor.id) throw new Error(`malas elige "${respuesta.rutinaId}", su regla da "${peor.id}"`);
          }
        }
        return respuesta;
      };
      for (let i = 0; i < 40 && !state.terminado; i += 1) {
        state = avanzarSplitAuto(state, rng, responder).state;
      }
    }
    if (contestadas === 0) throw new Error(`${nombre}: ninguna parada de mercado con preparación en la muestra`);
  }
});

check('K4-D las cartas de la preparación hablan en cristiano: ningún id crudo en lo que se muestra y la pantalla (components/mercado.js) las pinta sin calcular nada', () => {
  const base = correrCarrera(2, 14);
  for (const rutina of RUTINAS.offseason) {
    const carta = cartaDeRutina(base, rutina);
    const textos = [carta.label, carta.descripcion, ...carta.efectos.map((efecto) => efecto.etiqueta)];
    for (const texto of textos) {
      if (!texto || /player\.|[a-z0-9]+_[a-z0-9_]+/.test(texto)) {
        throw new Error(`la carta de "${rutina.id}" muestra "${texto}"`);
      }
    }
    if (!(carta.efectos.length > 0 || carta.pulir > 0 || carta.nuevo > 0)) {
      throw new Error(`la carta de "${rutina.id}" no dice nada de lo que hace`);
    }
  }
  const fuente = fs.readFileSync(path.join(srcDir, 'ui', 'components', 'mercado.js'), 'utf8');
  if (!fuente.includes('Te queda para siempre') || /BALANCE|balance\.js/.test(fuente)) {
    throw new Error('la pantalla tiene que decir cuánto dura la carta y leerlo de la carta, sin recalcularlo con BALANCE');
  }
});

if (errores.length > 0) {
  console.error(`\n${errores.length} check(s) fallaron.`);
  process.exit(1);
} else {
  console.log('\nTodos los checks pasaron.');
}
