import path from 'path';
import { pathToFileURL } from 'url';
import { mulberry32 as mulberry32Local } from '../core/rng.js';
import { createInitialState as createInitialStateLocal } from '../core/state.js';
import { avanzarSplitAuto as avanzarSplitAutoLocal } from '../core/pipeline.js';
import { hashCadena } from '../core/numeros.js';
import { puntajeDeCarrera as puntajeDeCarreraLocal } from '../core/puntaje.js';

// Constantes de medición por defecto según la técnica de T1 (PLAN.md §K.5 / T1).
// 40 semillas a 30 splits alcanzan para detectar corrimientos accidentales del stream de RNG.
export const SEEDS_POR_DEFECTO = 40;
export const SPLITS_POR_DEFECTO = 30;

// Calcula la huella de determinismo para un conjunto de semillas y splits.
// `motor` permite inyectar módulos de otro árbol extraído vía pathToFileURL.
export function calcularHuella(
  totalSeeds = SEEDS_POR_DEFECTO,
  totalSplits = SPLITS_POR_DEFECTO,
  motor = {
    mulberry32: mulberry32Local,
    createInitialState: createInitialStateLocal,
    avanzarSplitAuto: avanzarSplitAutoLocal
  }
) {
  const lineas = [];
  for (let seed = 1; seed <= totalSeeds; seed += 1) {
    const rng = motor.mulberry32(seed);
    let state = motor.createInitialState(seed, rng);
    for (let split = 0; split < totalSplits && !state.terminado; split += 1) {
      state = motor.avanzarSplitAuto(state, rng).state;
    }
    const fin = state.finAnticipado ?? 'null';
    const splitCount = state.player.splitCount;
    const elo = Math.round(state.player.soloqElo);
    lineas.push(`${seed}:${fin}:${splitCount}:${elo}`);
  }

  const hash = hashCadena(lineas.join('\n'));
  return { lineas, hash };
}

// La huella del JUEGO (K1, revisión de K1-A: PLAN.md "K1 — lo que cambió la revisión de K1-A"): la que respalda
// `VERSION_JUEGO`/`HUELLA_JUEGO` de `src/data/version.js`. La de arriba (30 splits, T1) no ve la segunda mitad
// de la carrera ni el puntaje: un `rng()` extra desde los 26 años o un cambio de `BALANCE.puntaje` pasaban sin
// moverla. Esta corre las mismas 40 seeds hasta 60 splits (o el final) y suma el número, el nivel y la leyenda:
// `seed:fin:splitCount:elo:total:nivel:leyenda`. `calcularHuella` y su formato quedan como estaban (T1).
export const SPLITS_HUELLA_JUEGO = 60;

export function calcularHuellaJuego(
  totalSeeds = SEEDS_POR_DEFECTO,
  totalSplits = SPLITS_HUELLA_JUEGO,
  motor = {
    mulberry32: mulberry32Local,
    createInitialState: createInitialStateLocal,
    avanzarSplitAuto: avanzarSplitAutoLocal,
    puntajeDeCarrera: puntajeDeCarreraLocal
  }
) {
  const lineas = [];
  for (let seed = 1; seed <= totalSeeds; seed += 1) {
    const rng = motor.mulberry32(seed);
    let state = motor.createInitialState(seed, rng);
    for (let split = 0; split < totalSplits && !state.terminado; split += 1) {
      state = motor.avanzarSplitAuto(state, rng).state;
    }
    const { total, nivel, leyenda } = motor.puntajeDeCarrera(state);
    const fin = state.finAnticipado ?? 'null';
    lineas.push(`${seed}:${fin}:${state.player.splitCount}:${Math.round(state.player.soloqElo)}:${total}:${nivel.id}:${leyenda.id}`);
  }
  return { lineas, hash: hashCadena(lineas.join('\n')) };
}

// Carga el motor desde un directorio base externo (por ejemplo un árbol de git archive).
export async function cargarMotorDesde(dirBase) {
  const rutaAbsoluta = path.resolve(dirBase);
  const urlRng = pathToFileURL(path.join(rutaAbsoluta, 'src/core/rng.js')).href;
  const urlState = pathToFileURL(path.join(rutaAbsoluta, 'src/core/state.js')).href;
  const urlPipeline = pathToFileURL(path.join(rutaAbsoluta, 'src/core/pipeline.js')).href;

  const [modRng, modState, modPipeline] = await Promise.all([
    import(urlRng),
    import(urlState),
    import(urlPipeline)
  ]);

  return {
    mulberry32: modRng.mulberry32,
    createInitialState: modState.createInitialState,
    avanzarSplitAuto: modPipeline.avanzarSplitAuto
  };
}

async function main() {
  const args = process.argv.slice(2);
  let totalSeeds = SEEDS_POR_DEFECTO;
  let totalSplits = SPLITS_POR_DEFECTO;
  let dirContra = null;

  for (const arg of args) {
    if (arg.startsWith('--seeds=')) {
      totalSeeds = Number(arg.slice('--seeds='.length)) || SEEDS_POR_DEFECTO;
    } else if (arg.startsWith('--splits=')) {
      totalSplits = Number(arg.slice('--splits='.length)) || SPLITS_POR_DEFECTO;
    } else if (arg.startsWith('--contra=')) {
      dirContra = arg.slice('--contra='.length);
    }
  }

  const huellaActual = calcularHuella(totalSeeds, totalSplits);

  if (!dirContra) {
    for (const linea of huellaActual.lineas) {
      console.log(linea);
    }
    console.log(`hash: ${huellaActual.hash}`);
    return;
  }

  const motorContra = await cargarMotorDesde(dirContra);
  const huellaContra = calcularHuella(totalSeeds, totalSplits, motorContra);

  const diferencias = [];
  for (let i = 0; i < totalSeeds; i += 1) {
    if (huellaActual.lineas[i] !== huellaContra.lineas[i]) {
      diferencias.push({
        seed: i + 1,
        actual: huellaActual.lineas[i],
        contra: huellaContra.lineas[i]
      });
    }
  }

  if (diferencias.length === 0) {
    console.log('IDÉNTICA');
    process.exit(0);
  } else {
    console.error(`DIFERENCIAS DETECTADAS (${diferencias.length}/${totalSeeds} semillas difieren):`);
    for (const diff of diferencias) {
      console.error(`seed ${diff.seed}: actual [${diff.actual}] vs contra [${diff.contra}]`);
    }
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error('Error al calcular huella:', error);
    process.exit(1);
  });
}
