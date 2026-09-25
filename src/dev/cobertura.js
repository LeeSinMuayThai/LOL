import { pathToFileURL } from 'url';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto } from '../core/pipeline.js';
import { calcularContexto, coincideContexto } from '../core/contexto.js';
import { cumpleCondiciones } from '../core/selectors.js';
import { MOMENTOS } from '../data/contextos.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { CATEGORIAS_EVENTO } from '../data/categorias.js';
import { BALANCE } from '../data/balance.js';

// La matriz de cobertura de contenido.
//
// Responde, sin tener que simular a mano, la pregunta que hace falta para
// autorear a escala: "¿que puede aparecer estando en tal punto de la carrera?".
// Y la inversa: "¿en que momentos puede aparecer este evento?".
//
//   node src/dev/cobertura.js                        matriz momento x ventana
//   node src/dev/cobertura.js --huecos               solo las celdas flojas
//   node src/dev/cobertura.js --categorias           huecos, partido por categoria
//   node src/dev/cobertura.js --categorias --detalle   + cada celda floja
//   node src/dev/cobertura.js --momento tier1_debut  que contenido cae ahi
//   node src/dev/cobertura.js --evento team_drama    donde puede aparecer
//
// Fase J0 (AUDITORIA.md H1, "el instrumento" — PLAN.md §J0): la matriz
// cuenta por UNIÓN de las `MUESTRAS_POR_CELDA` (12) muestras de una celda —
// un evento "está" si pasa el contexto en AL MENOS UNA. Eso escondía que,
// dentro de una celda "sana" (40 eventos que pasan el contexto), una sola
// categoría podía cubrir casi todo el peso real y las otras diez quedar de
// adorno: la matriz decía "sin huecos" mientras 1 de cada 6 splits forzaba
// el mismo evento de `parche`. `--categorias` repite el mismo algoritmo de
// huecos, una vez por cada una de las 11 categorías del catálogo — si una
// categoría específica no llega al mínimo en una celda aunque el TOTAL de
// la celda sí, ahí está el hueco que la unión tapaba.

const SEEDS = 300;
const SPLITS = 45;
const MUESTRAS_POR_CELDA = 12;

function clave(momento, ventana) {
  return `${momento}|${ventana}`;
}

// Recorre carreras reales y junta estados representativos por celda. Se guardan
// estados y no solo contextos porque las `conditions` numericas necesitan el
// estado para evaluarse.
export function observar() {
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

// Fase J0: la misma detección de huecos de `imprimirMatriz`, una vez por
// categoría — filtra el catálogo a una sola `categoria` y reusa
// `contarEnCelda` tal cual, así que no hay una segunda cuenta que pueda
// divergir de la que ya valida la matriz general. Separada de su impresión
// (abajo) para que `validate.js` pueda importarla y afirmar sobre los datos
// en vez de scrapear la salida de consola.
export function calcularHuecosPorCategoria(celdas) {
  const minimo = BALANCE.contenido.minimoEventosPorCelda;
  const filas = [];

  for (const categoria of CATEGORIAS_EVENTO) {
    const eventosDeCategoria = TODOS_LOS_EVENTOS.filter((evento) => evento.categoria === categoria);
    const huecos = [];

    for (const momento of MOMENTOS) {
      for (const ventana of ventanasDe(celdas, momento.id)) {
        const muestras = celdas.get(clave(momento.id, ventana));
        const { porContexto } = contarEnCelda(muestras, eventosDeCategoria);
        if (porContexto < minimo) {
          huecos.push({ momento: momento.id, ventana, eventos: porContexto });
        }
      }
    }

    filas.push({ categoria, catalogo: eventosDeCategoria.length, huecos });
  }

  return filas.sort((a, b) => b.huecos.length - a.huecos.length);
}

// Resumen, no línea por celda: con 11 categorías × hasta 66 celdas cada una,
// el detalle completo es ruido para un vistazo — `--categorias --detalle`
// lo destapa.
function imprimirCoberturaPorCategoria(celdas, { detalle } = {}) {
  const minimo = BALANCE.contenido.minimoEventosPorCelda;
  const celdasObservadas = [...celdas.keys()].length;
  console.log(`COBERTURA POR CATEGORÍA — partición de la matriz por las 11 categorías del catálogo (${celdasObservadas} celdas observadas)\n`);

  const filas = calcularHuecosPorCategoria(celdas);
  const anchoCategoria = Math.max(...filas.map((f) => f.categoria.length));
  for (const fila of filas) {
    const marca = fila.huecos.length === 0 ? '✔' : '✗';
    console.log(`  ${marca} ${fila.categoria.padEnd(anchoCategoria)}  ${String(fila.catalogo).padStart(3)} en el catálogo  ${String(fila.huecos.length).padStart(3)}/${celdasObservadas} celdas por debajo del mínimo (${minimo})`);
    if (detalle) {
      for (const hueco of fila.huecos) {
        console.log(`      ${hueco.momento} / ${hueco.ventana}: ${hueco.eventos}`);
      }
    }
  }

  const totalHuecos = filas.reduce((s, f) => s + f.huecos.length, 0);
  console.log(`\n${totalHuecos} hueco(s) de categoría — celdas donde el TOTAL de la matriz general llega al`);
  console.log(`mínimo pero una categoría puntual no. Es lo que la unión de ${MUESTRAS_POR_CELDA} muestras tapaba:`);
  console.log('una celda con 40 eventos "disponibles" puede tener 39 de una categoría y 0 del resto.');
  if (!detalle) {
    console.log('(--categorias --detalle lista cada celda)');
  }
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

// Fase J0 (AUDITORIA.md AUD-2): mismo criterio que `simulate.js` — guardado
// para que `validate.js` pueda importar `observar`/`calcularHuecosPorCategoria`
// sin que el import por sí solo dispare las 300 carreras de `observar()`.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const { celdas, momentosVistos } = observar();

  const indiceMomento = args.indexOf('--momento');
  const indiceEvento = args.indexOf('--evento');

  if (indiceMomento >= 0) {
    imprimirMomento(celdas, args[indiceMomento + 1]);
  } else if (indiceEvento >= 0) {
    imprimirEvento(celdas, args[indiceEvento + 1]);
  } else if (args.includes('--categorias')) {
    imprimirCoberturaPorCategoria(celdas, { detalle: args.includes('--detalle') });
  } else {
    imprimirMatriz(celdas, momentosVistos, { soloHuecos: args.includes('--huecos') });
  }
}
