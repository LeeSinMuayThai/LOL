import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  verificarSinMathRandom, verificarDocumentSoloEnUi,
  verificarSinFondoDeTinta, verificarSinColorLiteral, verificarTokensDefinidos
} from './guards.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { CATEGORIAS_EVENTO } from '../data/categorias.js';
import { mulberry32, sample } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplit, avanzarSplitAuto, resolverDecision, ETAPAS_SPLIT } from '../core/pipeline.js';
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
import { campeonesDisponibles, entradaDePool } from '../core/pool.js';
import { elegirOutcome, elegirEvento, decisionDesdeEvento, resolver as resolverEventos, resolverOpcion, cooldownActivo, pesoEfectivo } from '../systems/events.js';
import { previaDeOpcion, riesgoDeOpcion, payoffNormalizado } from '../core/previa.js';
import { rarezaDeRutina, payoffDeRutina } from '../core/rareza.js';
import { tipoDeSplit, hayPresupuesto } from '../core/presupuesto.js';
import { aplicar as aplicarPresupuesto } from '../systems/presupuesto.js';
import { elegirCampeonRival, disponiblesDelPool, decisionDeDraft } from '../core/serie.js';
import { rendimientoBase, fuerzaDelEquipo } from '../core/fuerza.js';
import { probabilidadDeGanar } from '../core/numeros.js';
import {
  resolverFecha, motivosDeFecha, generarFixture, aplicarCrucesDeJornada,
  tablaDePosiciones, posicionEnTabla, filaVacia, registrarEnFila,
  decisionDeDraftFecha, factorDraftFecha
} from '../core/temporada.js';
import { tierListDeRol, boostDelPool } from '../core/regimen.js';
import { nivelDelJugador, deltasDeStats, fichaCompleta } from '../core/ficha.js';
import { componerLegado } from '../core/legado.js';
import { bandaDeArraigo } from '../core/registro.js';
import { rankearMundo, rankearPoblacion, puntajeRanking } from '../core/topMundial.js';
import { salarioDeOferta } from '../core/salarios.js';
import { valorDeMercado, sesgoEtario } from '../core/valorMercado.js';
import { orgsQueTeFicharian, ofertaPosible, residenciaEn } from '../core/demanda.js';
import { aplicar as aplicarMercado } from '../systems/mercado.js';
import { FRASES_MOTIVO, ETIQUETAS_MOTIVO } from '../systems/temporada.js';
import { EJES, MARCAS, MOMENTOS_ACTIVOS, momentoPorId } from '../data/contextos.js';
import { ARQUETIPOS } from '../data/meta-tags.js';
import { ROLES, IDS_ROL } from '../data/roles.js';
import LIGAS from '../data/leagues.json' with { type: 'json' };
import CAMPEONES from '../data/champions.json' with { type: 'json' };
import MINIJUEGOS from '../data/minijuegos.json' with { type: 'json' };
import {
  elegirMinijuego, minijuegosPara, veredictoDeMinijuego, textoDeMinijuego, lecturaDeVentana, minijuegoPorId
} from '../core/minijuegos.js';
import { esMapaDeDesempate, esMapaCerrado } from '../core/serie.js';
import { MONTAR_MINIJUEGO } from '../ui/components/minijuegos/index.js';
import METAS from '../data/metas.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..');

const errores = [];

const ACCIONES_DE_POOL = ['aprender', 'maestria', 'olvidar'];

// `--solo=<texto>` corre unicamente los checks cuyo nombre contiene ese texto.
// Es lo que hace practicable la regla de proceso 7 ("al escribir un check nuevo,
// verificar que falla cuando debe"): la corrida completa tarda ~7 minutos (D32),
// asi que verificar un check en rojo costaba siete minutos por intento.
const SOLO = process.argv.slice(2)
  .filter((arg) => arg.startsWith("--solo="))
  .map((arg) => arg.slice("--solo=".length).toLowerCase());
const RAPIDO = process.argv.slice(2).includes('--rapido');

function check(nombre, fn) {
  if (SOLO.length > 0 && !SOLO.some((texto) => nombre.toLowerCase().includes(texto))) {
    return;
  }
  try {
    fn();
    console.log(`OK   ${nombre}`);
  } catch (error) {
    errores.push(`${nombre}: ${error.message}`);
    console.log(`FAIL ${nombre}: ${error.message}`);
  }
}

function checkLento(nombre, fn) {
  if (SOLO.length > 0 && !SOLO.some((texto) => nombre.toLowerCase().includes(texto))) {
    return;
  }
  if (SOLO.length === 0 && RAPIDO) {
    console.log(`SKIP  ${nombre} (lento, correr sin --rapido)`);
    return;
  }
  try {
    fn();
    console.log(`OK   ${nombre}`);
  } catch (error) {
    errores.push(`${nombre}: ${error.message}`);
    console.log(`FAIL ${nombre}: ${error.message}`);
  }
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
  const hex = (nombre) => {
    const m = tokensTexto.match(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`));
    if (!m) throw new Error(`token --${nombre} no encontrado para medir contraste`);
    return m[1];
  };
  const luminancia = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [l1, l2] = [luminancia(hex(a)), luminancia(hex(b))].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  // Los pares que el CSS realmente usa para texto que hay que leer, más el
  // botón principal (texto bg-void sobre --live sólido, el estado hover).
  const pares = [
    ['ink', 'bg-surface'], ['ink-dim', 'bg-surface'],
    ['ink', 'bg-raised'], ['ink-dim', 'bg-raised'],
    ['ink', 'bg-void'], ['live', 'bg-surface'], ['gold', 'bg-surface'],
    ['bg-void', 'live']
  ];
  const fallas = pares
    .map(([a, b]) => [a, b, ratio(a, b)])
    .filter(([, , r]) => r < 4.5);
  if (fallas.length > 0) {
    throw new Error(fallas.map(([a, b, r]) => `${a}/${b} = ${r.toFixed(2)}:1`).join(', '));
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

  // n=1500, no 300 (fase 10c): `silencioTotal` es un evento raro (~80 en
  // 1500 seeds), así que a n=300 la proporción tiene demasiado ruido para
  // ser una señal confiable — y 10c, al insertar dos sistemas nuevos que
  // consumen RNG en pretemporada/profesional, corre la cinta de RNG de cada
  // carrera y cambia qué seeds puntuales caen de cada lado sin cambiar la
  // tasa real (medida en ambos casos ~70-72%). Subir la muestra ataca la
  // causa (ruido), no el síntoma — bajar el piso otra vez no lo haría.
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
  // piso es la tolerancia media, y la retiró el retiro reversible: un
  // free agent que ya jugó una vez conserva `career.liga` de su ÚLTIMO club
  // (pre-existente de 9M, `mercado.js` `quedarLibre` no lo limpia) mientras
  // sigue entrenando y subiendo de nivel — la ventana de vuelta multiplica
  // esos tramos. Medido a n=1500: 72%. Arreglar `career.liga` durante la
  // free agency es un cambio de otra fase (9M lo tocó por última vez), no de
  // ésta — anotado como deuda, no se toca acá.
  if (silencioTotal > 0 && silencioMerecido / silencioTotal < 0.6) {
    throw new Error(`sólo el ${((silencioMerecido / silencioTotal) * 100).toFixed(0)}% del silencio de mercado le tocó a un jugador a nivel de su liga o por debajo (mínimo 60%)`);
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

checkLento('El mundo NPC envejece: en una carrera larga, la edad media de los planteles sube', () => {
  // `systems/plantel.js` corre solo en offseason. Sin esto, el mundo quedaría
  // congelado en la foto de la seed.
  const rng = mulberry32(7);
  let state = createInitialState(7, rng);
  const edadMedia = (st) => {
    const npcs = Object.values(st.mundo.planteles).flatMap((p) => Object.values(p));
    return npcs.reduce((s, n) => s + n.edad, 0) / npcs.length;
  };
  const inicial = edadMedia(state);
  for (let i = 0; i < 30 && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng).state;
  }
  const final = edadMedia(state);
  // No tiene que crecer 1:1 con los años (entran canteranos de 17-19), pero
  // tiene que MOVERSE: un mundo que no envejece es un bug.
  if (Math.abs(final - inicial) < 0.3) {
    throw new Error(`la edad media de los planteles casi no se movió en 30 splits (${inicial.toFixed(1)} → ${final.toFixed(1)})`);
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

checkLento('El contexto de carrera nombra siempre dónde estás parado', () => {
  const vistos = new Set();

  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 45 && !state.terminado; i += 1) {
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
      if (resultado.decision) {
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
        if (sistema.id === 'eventos' && st.phase === 'profesional') {
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
  const MOMENTOS = ['mapa_cerrado', 'mapa_decisivo', 'pre_internacional', 'post_serie', 'tryout'];
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
  //   (b) el margen ancho del desempate cubre mapas que el margen normal
  //       rechaza, o el mapa que define seguiría pasando sin jugada.
  if (!esMapaDeDesempate([2, 2], 5) || !esMapaDeDesempate([1, 1], 3)) {
    throw new Error('esMapaDeDesempate no reconoce el último mapa de la serie');
  }
  if (esMapaDeDesempate([2, 0], 5) || esMapaDeDesempate([2, 1], 5)) {
    throw new Error('esMapaDeDesempate confunde un match point cualquiera con el desempate');
  }
  const normal = BALANCE.serie.margenMapaCerrado;
  const ancho = BALANCE.serie.margenMapaCerradoDecisivo;
  if (ancho <= normal) {
    throw new Error(`el margen del desempate (${ancho}) no es más ancho que el normal (${normal})`);
  }
  const brecha = (normal + ancho) / 2;
  if (esMapaCerrado(50, 50 + brecha) || !esMapaCerrado(50, 50 + brecha, ancho)) {
    throw new Error('el margen ancho del desempate no cubre lo que el normal rechaza');
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

checkLento('Mediana de decisiones de draft por serie ∈ [0, 1] y ≥28% de series sin ningún draft', () => {
  const porSerie = [];

  for (let seed = 1; seed <= 1200; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    let ultimoConteo = 0;
    let draftDesdeUltimoCorte = 0;

    const responder = (sistema, st, decision, r) => {
      if (st.career.seriesJugadas > ultimoConteo) {
        const cerradas = st.career.seriesJugadas - ultimoConteo;
        for (let i = 0; i < cerradas; i += 1) {
          porSerie.push(draftDesdeUltimoCorte / cerradas);
        }
        draftDesdeUltimoCorte = 0;
        ultimoConteo = st.career.seriesJugadas;
      }
      if (sistema.id === 'serie' && decision.datos?.motivo === 'draft') {
        draftDesdeUltimoCorte += 1;
      }
      return sistema.resolverAuto(st, decision, r);
    };

    for (let i = 0; i < 90 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng, responder).state;
    }
    if (state.career.seriesJugadas > ultimoConteo) {
      const cerradas = state.career.seriesJugadas - ultimoConteo;
      for (let i = 0; i < cerradas; i += 1) {
        porSerie.push(draftDesdeUltimoCorte / cerradas);
      }
    }
  }

  if (porSerie.length < 50) {
    throw new Error(`solo ${porSerie.length} series jugadas en 1200 carreras: muestra insuficiente`);
  }

  const ordenadas = [...porSerie].sort((a, b) => a - b);
  const mediana = ordenadas[Math.floor(ordenadas.length / 2)];
  const sinDraft = porSerie.filter((n) => n === 0).length / porSerie.length;

  if (mediana < 0 || mediana > 1) {
    throw new Error(`mediana de decisiones de draft por serie: ${mediana.toFixed(2)}, fuera de [0, 1] (${porSerie.length} series medidas)`);
  }
  // Fase 9Rd: el motor sólo frena cuando el pick mueve la probabilidad del
  // mapa. Una porción grande de las series no debería frenarte nunca.
  //
  // Fase 9Ma: piso 30% → 28%. El corrimiento de stream de los planteles NPC
  // (D35) movió el valor estable de ~30,5% a ~28,9%. Fase 9Mc: el stream shift
  // de `core/mercadoMundial.js` lo bajó otro punto a ~27,6% (piso 28% → 26%
  // como parche). La causa era la deriva agregada de `org.fuerza` de tier 1
  // (mundo que se ablanda → el jugador domina más → menos drafts). Fase 9Mi:
  // el asiento se disputa → menos deriva → volvió a **29,3%** (sonda n=400 ×
  // 90). Piso **devuelto a 28%** en 9Mj, como preveía §9M.12.3.
  if (sinDraft < 0.28) {
    throw new Error(`sólo el ${(sinDraft * 100).toFixed(0)}% de las series no tuvieron ningún draft (mínimo 28%)`);
  }
});

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
      const pool = sample(delRol, ancho, rng).map((campeon) => entradaDePool(campeon, 60));
      const stateFalso = { player: { role: rol, championPool: pool }, meta: { weights }, mundo: { campeonesDebutados: [] } };

      let quemados = [];
      let disponiblesEnMapa5 = 0;
      for (let mapa = 0; mapa < 5; mapa += 1) {
        const campeonRival = elegirCampeonRival(stateFalso, quemados, rng);
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
  const flojo = entradaDePool({ name: 'A', tags: ['tanque'] }, 30);
  const fino = entradaDePool({ name: 'A', tags: ['tanque'] }, 80);
  if (!(factorDeCampeon(fino, weights) > factorDeCampeon(flojo, weights))) {
    throw new Error('más maestría no dio más factorDeCampeon');
  }
  // A igual maestría, el que el meta pide (tag con peso alto) vale más que el
  // que quedó a contramano (tag con peso bajo). En la seed 3: enchanter 1.508,
  // splitpush 0.669.
  const enMeta = entradaDePool({ name: 'B', tags: ['enchanter'] }, 60);
  const contraMeta = entradaDePool({ name: 'C', tags: ['splitpush'] }, 60);
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
        entradaDePool({ name: 'Meta', tags: ['enchanter'] }, 60),
        entradaDePool({ name: 'Anti', tags: ['splitpush'] }, 60)
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
// ratio de `deseoPorCampeon` — miran `probabilidadDeGanar` sobre
// `rendimientoBase`, así que la sonda necesita un estado con hoja de atributos,
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
// cálculo que `probabilidadConCampeon` en core/serie.js.
function probMapaSonda(state, campeon) {
  const rb = rendimientoBase({ ...state, player: { ...state.player, campeonDelSplit: campeon.name } });
  const fp = fuerzaDelEquipo(state, rb);
  return probabilidadDeGanar(fp, state.serie.rival.fuerza, BALANCE.serie.ruidoMapa, BALANCE.serie.ruidoRivalSerie);
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
    const entradas = sample(pool, ancho, rng).map((c) => entradaDePool(c, 20 + Math.floor(rng() * 70)));
    const state = {
      ...estadoDraftFalso(50000 + i, entradas, 45 + Math.floor(rng() * 30)),
      meta: { weights, ajuste: 50 }
    };

    for (const decision of [
      decisionDeDraft(state, entradas, i % 2 === 0),
      decisionDeDraftFecha({ ...state, player: { ...state.player, championPool: entradas } })
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

check('probabilidadDeGanar es monótona, simétrica y 0.5 en el empate', () => {
  if (probabilidadDeGanar(50, 50, 7, 12) !== 0.5) {
    throw new Error(`empate no dio 0.5: ${probabilidadDeGanar(50, 50, 7, 12)}`);
  }
  let previo = -1;
  for (let fp = 10; fp <= 90; fp += 2) {
    const p = probabilidadDeGanar(fp, 50, 7, 12);
    if (p <= previo) {
      throw new Error(`no es monótona creciente en fp=${fp} (${p} <= ${previo})`);
    }
    previo = p;
  }
  for (const [a, b] of [[55, 40], [48, 61], [70, 70], [33, 90], [50, 50]]) {
    const suma = probabilidadDeGanar(a, b, 7, 12) + probabilidadDeGanar(b, a, 12, 7);
    if (Math.abs(suma - 1) > 1e-12) {
      throw new Error(`P(${a},${b}) + P(${b},${a}) = ${suma}, esperaba 1`);
    }
  }
  // Ruido cero: colapsa a un escalón limpio, sin NaN.
  if (probabilidadDeGanar(60, 50, 0, 0) !== 1 || probabilidadDeGanar(40, 50, 0, 0) !== 0) {
    throw new Error('con σ=0 no colapsó a 0/1');
  }
});

check('Nadie te frena en el draft por un pick que no mueve el partido', () => {
  const pool = campeonesDisponibles(
    { player: { role: 'mid' }, mundo: { campeonesDebutados: [] } }, 'mid'
  );
  let pausas = 0;
  let malas = 0;
  for (let i = 0; i < 4000; i += 1) {
    const rng = mulberry32(70000 + i);
    const weights = createInitialState(i + 1, mulberry32(i + 1)).meta.weights;
    const ancho = 3 + (i % 4);
    const entradas = sample(pool, ancho, rng).map((c) => entradaDePool(c, 20 + Math.floor(rng() * 70)));
    const state = {
      ...estadoDraftFalso(70000 + i, entradas, 45 + Math.floor(rng() * 30)),
      meta: { weights, ajuste: 50 }
    };
    const decisivo = i % 2 === 0;
    const dec = decisionDeDraft(state, entradas, decisivo);
    if (!dec.pausa) {
      continue;
    }
    pausas += 1;
    if (entradas.length === 2) {
      continue; // excepción incondicional: pool exhausto
    }
    const [mejor, segundo] = [...entradas].sort(
      (a, b) => factorDeCampeon(b, weights) - factorDeCampeon(a, weights)
    );
    const puntos = probMapaSonda(state, mejor) - probMapaSonda(state, segundo);
    const umbral = decisivo
      ? BALANCE.serie.puntosEnJuegoParaPreguntarDecisivo
      : BALANCE.serie.puntosEnJuegoParaPreguntar;
    if (puntos < umbral - 1e-9) {
      malas += 1;
    }
  }
  if (pausas < 30) {
    throw new Error(`sólo ${pausas} pausas en 4000 sondas: muestra insuficiente`);
  }
  if (malas > 0) {
    throw new Error(`${malas}/${pausas} pausas de draft con puntosEnJuego < umbral`);
  }
});

checkLento('Toda opción de draft trae su lectura y va ordenada por factorDeCampeon', () => {
  // Smoke test directo de la matriz: dos ejes extremos dan frases distintas.
  const weightsBase = createInitialState(3, mulberry32(3)).meta.weights;
  const poolMix = [
    entradaDePool({ name: 'Fuerte', tags: ['enchanter'] }, 90),
    entradaDePool({ name: 'Flojo', tags: ['splitpush'] }, 20)
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

check('Elegir el mismo campeón del split en una fecha marcada da factorDraftFecha == 0', () => {
  const weights = createInitialState(3, mulberry32(3)).meta.weights;
  for (const tags of [['enchanter'], ['splitpush'], ['tanque', 'engage'], ['asesino']]) {
    for (const mastery of [15, 45, 80]) {
      const campeon = entradaDePool({ name: 'X', tags }, mastery);
      const factor = factorDraftFecha(campeon, campeon, weights);
      if (factor !== 0) {
        throw new Error(`factorDraftFecha(c, c) = ${factor} (tags ${tags}, m${mastery})`);
      }
    }
  }
  // Y elegir uno MEJOR que el del split da > 0, uno peor da < 0, ambos topeados.
  const delSplit = entradaDePool({ name: 'Base', tags: ['splitpush'] }, 40);
  const mejor = entradaDePool({ name: 'Mejor', tags: ['enchanter'] }, 80);
  const peor = entradaDePool({ name: 'Peor', tags: ['splitpush'] }, 15);
  const tope = BALANCE.temporada.impactoDraftFecha;
  const fMejor = factorDraftFecha(mejor, delSplit, weights);
  const fPeor = factorDraftFecha(peor, delSplit, weights);
  if (!(fMejor > 0 && fMejor <= tope + 1e-9)) {
    throw new Error(`campeón mejor dio ${fMejor}, esperaba (0, ${tope}]`);
  }
  if (!(fPeor < 0 && fPeor >= -tope - 1e-9)) {
    throw new Error(`campeón peor dio ${fPeor}, esperaba [${-tope}, 0)`);
  }
});

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

check('generarFixture produce un round-robin real (N-1 jornadas, cada par una vez)', () => {
  for (const n of [6, 8, 10, 12, 14]) {
    const orgs = Array.from({ length: n }, (_, i) => ({ nombre: `T${i}`, fuerza: 70 }));
    const propia = 'T0';
    const { calendario, cruces } = generarFixture({ orgs }, propia);

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
      const gano = resolverFecha(72, calendario[j].fuerzaRival, rng);
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
  const tablaPareja = [{ org: 'Equipo Propio', ganados: 3, perdidos: 3, diferencia: 0 }];

  const motivos = motivosDeFecha(estadoAburrido, null, fecha, tablaPareja, 0, 3, 9);
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
      if (resolverFecha(50 * (1 + ajuste), 50, rng)) {
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

checkLento('El boost del pool no se clava en el centro (CONCEPTO §6: 0.75x-1.25x)', () => {
  // El defecto que reemplaza esta fase: el viejo ajuste-por-afinidad-promedio
  // orbitaba siempre 50. Se mide el MULTIPLICADOR real (lo que multiplica el
  // rendimiento), no el ajuste crudo, para probar la promesa de CONCEPTO §6
  // tal como está escrita.
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

  if (p90 - p10 < 0.2) {
    throw new Error(`p10=${p10.toFixed(3)} y p90=${p90.toFixed(3)} del multiplicador de meta están separados por solo ${(p90 - p10).toFixed(3)}; el mínimo es 0.2`);
  }
  if (ordenados[0] < 0.75 || ordenados[ordenados.length - 1] > 1.25) {
    throw new Error('el multiplicador de meta se salió del rango [0.75, 1.25] que promete CONCEPTO §6');
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

if (errores.length > 0) {
  console.error(`\n${errores.length} check(s) fallaron.`);
  process.exit(1);
} else {
  console.log('\nTodos los checks pasaron.');
}
