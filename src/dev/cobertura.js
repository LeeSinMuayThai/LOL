import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto } from '../core/pipeline.js';
import { calcularContexto, coincideContexto } from '../core/contexto.js';
import { cumpleCondiciones } from '../core/selectors.js';
import { MOMENTOS } from '../data/contextos.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { BALANCE } from '../data/balance.js';

// La matriz de cobertura de contenido.
//
// Responde, sin tener que simular a mano, la pregunta que hace falta para
// autorear a escala: "¿que puede aparecer estando en tal punto de la carrera?".
// Y la inversa: "¿en que momentos puede aparecer este evento?".
//
//   node src/dev/cobertura.js                        matriz momento x ventana
//   node src/dev/cobertura.js --huecos               solo las celdas flojas
//   node src/dev/cobertura.js --momento tier1_debut  que contenido cae ahi
//   node src/dev/cobertura.js --evento team_drama    donde puede aparecer

const SEEDS = 300;
const SPLITS = 45;
const MUESTRAS_POR_CELDA = 12;

function clave(momento, ventana) {
  return `${momento}|${ventana}`;
}

// Recorre carreras reales y junta estados representativos por celda. Se guardan
// estados y no solo contextos porque las `conditions` numericas necesitan el
// estado para evaluarse.
function observar() {
  const celdas = new Map();
  const momentosVistos = new Set();

  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < SPLITS && !state.terminado; i += 1) {
      const contexto = calcularContexto(state);
      momentosVistos.add(contexto.momento);

      const k = clave(contexto.momento, contexto.ventana);
      const muestras = celdas.get(k) ?? [];
      if (muestras.length < MUESTRAS_POR_CELDA) {
        muestras.push({ state, contexto });
        celdas.set(k, muestras);
      }

      state = avanzarSplitAuto(state, rng).state;
    }
  }

  return { celdas, momentosVistos };
}

// Prioridad de MOMENTOS a partir de la cual un momento es un ESTADO
// EXCEPCIONAL —sin equipo, retirado, lesionado, sin edad para debutar— y no una
// posición normal de carrera. `etapa: ["amateur"]` ancla un evento a la etapa
// amateur; ningún `etapa`/`nivel` te saca de "sin equipo" (seguís siendo
// 'profesional'), así que ahí el único gate real es `nivel`/`marcas`. El
// reporte de pertinencia (D26c) sólo mira estas celdas: en las normales,
// gatear por `etapa` es la regla y el ruido taparía la señal.
const PRIORIDAD_ESTADO_EXCEPCIONAL = 80;

// Un evento "llega" a una celda si pasa para al menos una de las muestras.
//
// `porOmision` (D26c): de los que llegan, cuántos no declaran ni `nivel` ni
// `marcas`. La matriz mide cantidad; sin esto, la celda `sin_equipo` con 58
// eventos de vestuario mal gateados se veía más sana que una con 6 bien
// gateados, y cuanto más contenido sin gatear se escribía, más sana se veía.
function contarEnCelda(muestras, eventos) {
  let porContexto = 0;
  let condicionados = 0;
  let porOmision = 0;

  for (const evento of eventos) {
    const pasaContexto = muestras.some(({ contexto, state }) => coincideContexto(contexto, evento.contexto, state.age));
    if (!pasaContexto) {
      continue;
    }
    porContexto += 1;

    const ctx = evento.contexto ?? {};
    if (ctx.nivel === undefined && ctx.marcas === undefined) {
      porOmision += 1;
    }

    const pasaTodo = muestras.some(({ contexto, state }) => (
      coincideContexto(contexto, evento.contexto, state.age) && cumpleCondiciones(state, evento.conditions)
    ));
    if (!pasaTodo) {
      condicionados += 1;
    }
  }

  return { porContexto, condicionados, porOmision };
}

function ventanasDe(celdas, momento) {
  return [...celdas.keys()]
    .filter((k) => k.startsWith(`${momento}|`))
    .map((k) => k.split('|')[1]);
}

function imprimirMatriz(celdas, momentosVistos, { soloHuecos }) {
  const minimo = BALANCE.contenido.minimoEventosPorCelda;
  const ventanas = [...new Set([...celdas.keys()].map((k) => k.split('|')[1]))].sort();
  const anchoMomento = Math.max(...MOMENTOS.map((m) => m.id.length), 10);

  console.log(`COBERTURA DE CONTENIDO — ${momentosVistos.size} momentos alcanzables de ${MOMENTOS.length} declarados\n`);
  console.log(
    'momento'.padEnd(anchoMomento)
    + ventanas.map((v) => v.slice(0, 9).padStart(11)).join('')
    + 'TOTAL'.padStart(8)
  );

  const huecos = [];
  const pertinencia = [];
  let totalOpciones = 0;

  for (const momento of MOMENTOS) {
    const vistos = ventanasDe(celdas, momento.id);
    if (vistos.length === 0) {
      if (!soloHuecos && momento.pendiente) {
        console.log(`${momento.id.padEnd(anchoMomento)}${'— pendiente ' + momento.pendiente}`);
      } else if (!soloHuecos) {
        console.log(`${momento.id.padEnd(anchoMomento)}${'— nunca observado ✗'}`);
      }
      continue;
    }

    const fila = [];
    let total = 0;
    const esExcepcional = momento.prioridad >= PRIORIDAD_ESTADO_EXCEPCIONAL;

    for (const ventana of ventanas) {
      const muestras = celdas.get(clave(momento.id, ventana));
      if (!muestras) {
        fila.push('-'.padStart(11));
        continue;
      }

      const { porContexto, condicionados, porOmision } = contarEnCelda(muestras, TODOS_LOS_EVENTOS);
      total += porContexto;
      const marca = porContexto < minimo ? ' ✗' : condicionados > porContexto / 2 ? ' !' : '';
      fila.push(`${porContexto}/${condicionados}${marca}`.padStart(11));

      if (porContexto < minimo) {
        huecos.push({ momento: momento.id, ventana, eventos: porContexto });
      }
      // D26c: en un estado excepcional, un evento sin `nivel` ni `marcas` cae
      // acá por omisión, no por decisión. Se reporta la partición siempre (no
      // sólo cuando es mayoría): el número que baja split a split es la señal
      // de que el contenido mal gateado se está yendo.
      if (esExcepcional && porContexto > 0) {
        pertinencia.push({ momento: momento.id, ventana, porOmision, anclados: porContexto - porOmision, porContexto });
      }
    }

    if (!soloHuecos) {
      console.log(momento.id.padEnd(anchoMomento) + fila.join('') + String(total).padStart(8));
    }
  }

  for (const evento of TODOS_LOS_EVENTOS) {
    totalOpciones += evento.options.length;
  }

  console.log('');
  // El segundo numero es el detector de huecos disfrazados: contenido que por
  // contexto deberia estar disponible, pero cuyas condiciones numericas nunca
  // se cumplen en esta celda. Cuenta como presente en la matriz y no aparece
  // nunca en el juego.
  console.log('  a/b = a eventos pasan el contexto; b de ellos nunca llegan a disparar por sus condiciones numéricas');
  console.log('  ✗ celda por debajo del mínimo · ! mayoría condicionada · - ventana no observada');
  console.log('');

  if (huecos.length > 0) {
    console.log(`${huecos.length} hueco(s) — celdas alcanzables con menos de ${minimo} eventos:`);
    for (const hueco of huecos) {
      console.log(`  ${hueco.momento} / ${hueco.ventana}: ${hueco.eventos}`);
    }
  } else {
    console.log('Sin huecos: todas las celdas alcanzables llegan al mínimo.');
  }

  // D26c: la matriz mide cantidad, no pertinencia. En un estado excepcional
  // (sin equipo, retirado, lesionado) `etapa`/`nivel` no te sacan de ahí, así
  // que un evento sin `nivel` ni `marcas` cae en la celda por omisión — el
  // mecanismo exacto que hacía ver "sana" a `sin_equipo` con 58 eventos de
  // vestuario mal gateados (D27). El número "sin gatear" que baja de un commit
  // al siguiente es la señal de que ese contenido se está yendo.
  if (pertinencia.length > 0) {
    console.log('\nPertinencia en estados excepcionales (D26c) — anclados a la celda vs. caídos por omisión:');
    for (const celda of pertinencia) {
      const alerta = celda.porOmision > celda.anclados ? '  ← mayoría sin gatear' : '';
      console.log(`  ${celda.momento} / ${celda.ventana}: ${celda.anclados} anclados · ${celda.porOmision} sin gatear (${celda.porContexto} total)${alerta}`);
    }
  }

  const objetivo = BALANCE.contenido.objetivoOpciones;
  console.log(`\nopciones totales del catálogo: ${totalOpciones} / objetivo ${objetivo}  ${totalOpciones >= objetivo ? '✔' : '✗'}`);
}

function imprimirMomento(celdas, momentoId) {
  const ventanas = ventanasDe(celdas, momentoId);
  if (ventanas.length === 0) {
    console.log(`El momento "${momentoId}" no se observó en ${SEEDS} carreras.`);
    return;
  }

  console.log(`CONTENIDO DISPONIBLE EN "${momentoId}"\n`);
  for (const ventana of ventanas) {
    const muestras = celdas.get(clave(momentoId, ventana));
    const disponibles = TODOS_LOS_EVENTOS.filter((evento) => muestras.some(({ contexto, state }) => (
      coincideContexto(contexto, evento.contexto, state.age) && cumpleCondiciones(state, evento.conditions)
    )));

    console.log(`  ${ventana} (${disponibles.length} eventos, ${disponibles.reduce((s, e) => s + e.options.length, 0)} opciones)`);
    for (const evento of disponibles) {
      console.log(`    · ${evento.id} — ${evento.title}`);
    }
  }
}

function imprimirEvento(celdas, eventoId) {
  const evento = TODOS_LOS_EVENTOS.find((candidato) => candidato.id === eventoId);
  if (!evento) {
    console.log(`No existe el evento "${eventoId}".`);
    return;
  }

  console.log(`"${evento.title}" (${evento.id})`);
  console.log(`  contexto declarado: ${JSON.stringify(evento.contexto ?? {})}`);
  console.log(`  condiciones: ${JSON.stringify((evento.conditions ?? []).map((c) => `${c.field} ${c.op} ${c.value}`))}\n`);
  console.log('  aparece en:');

  let alguna = false;
  for (const [k, muestras] of celdas) {
    const pasa = muestras.some(({ contexto, state }) => (
      coincideContexto(contexto, evento.contexto, state.age) && cumpleCondiciones(state, evento.conditions)
    ));
    if (pasa) {
      alguna = true;
      const [momento, ventana] = k.split('|');
      console.log(`    · ${momento} / ${ventana}`);
    }
  }

  if (!alguna) {
    console.log('    · NUNCA. Este evento está declarado pero no es alcanzable.');
  }
}

const args = process.argv.slice(2);
const { celdas, momentosVistos } = observar();

const indiceMomento = args.indexOf('--momento');
const indiceEvento = args.indexOf('--evento');

if (indiceMomento >= 0) {
  imprimirMomento(celdas, args[indiceMomento + 1]);
} else if (indiceEvento >= 0) {
  imprimirEvento(celdas, args[indiceEvento + 1]);
} else {
  imprimirMatriz(celdas, momentosVistos, { soloHuecos: args.includes('--huecos') });
}
