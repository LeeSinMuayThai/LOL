import path from 'path';
import { fileURLToPath } from 'url';
import { verificarSinMathRandom } from './guards.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplit } from '../core/pipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..');

const errores = [];

function check(nombre, fn) {
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
  let state = createInitialState(seed);
  for (let i = 0; i < splits; i += 1) {
    state = avanzarSplit(state, rng).state;
  }
  return state;
}

check('Sin aleatoriedad nativa fuera del RNG inyectado', () => {
  const infractores = verificarSinMathRandom(srcDir);
  if (infractores.length > 0) {
    throw new Error(`encontrado en: ${infractores.join(', ')}`);
  }
});

check('Esquema de eventos válido', () => {
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
    if (!Array.isArray(evento.conditions)) {
      throw new Error(`${evento.id}: conditions debe ser un array`);
    }
    for (const condicion of evento.conditions) {
      if (!condicion.field || !condicion.op) {
        throw new Error(`${evento.id}: condición mal formada`);
      }
    }

    if (!Array.isArray(evento.options) || evento.options.length === 0) {
      throw new Error(`${evento.id}: sin opciones`);
    }

    for (const opcion of evento.options) {
      if (typeof opcion.weight !== 'number' || opcion.weight <= 0) {
        throw new Error(`${evento.id}/${opcion.id}: weight de opción inválido`);
      }
      if (!Array.isArray(opcion.outcomes) || opcion.outcomes.length === 0) {
        throw new Error(`${evento.id}/${opcion.id}: sin outcomes`);
      }

      for (const outcome of opcion.outcomes) {
        if (typeof outcome.weight !== 'number' || outcome.weight <= 0) {
          throw new Error(`${evento.id}/${opcion.id}: weight de outcome inválido`);
        }
        if (!Array.isArray(outcome.effects) || outcome.effects.length === 0) {
          throw new Error(`${evento.id}/${opcion.id}: outcome sin efectos`);
        }

        for (const effect of outcome.effects) {
          if (!effect.path || typeof effect.path !== 'string') {
            throw new Error(`${evento.id}/${opcion.id}: efecto sin path`);
          }
          if (effect.type === 'push') {
            if (effect.value === undefined) {
              throw new Error(`${evento.id}/${opcion.id}: efecto push sin value`);
            }
          } else if (typeof effect.min !== 'number' || typeof effect.max !== 'number' || effect.min > effect.max) {
            throw new Error(`${evento.id}/${opcion.id}: rango min/max inválido en ${effect.path}`);
          }
        }
      }
    }
  }
});

check('Balance coherente', () => {
  if (BALANCE.split.baseGain > BALANCE.split.maxGain) {
    throw new Error('split.baseGain > split.maxGain');
  }
  if (BALANCE.split.metaInfluenceBase <= 0) {
    throw new Error('split.metaInfluenceBase debe ser positivo');
  }
  if (BALANCE.meta.maxDelta <= 0) {
    throw new Error('meta.maxDelta debe ser positivo');
  }
});

check('Pipeline corre y es determinista (misma seed, dos corridas)', () => {
  const seed = 123;
  const splits = 5;
  const estadoA = correrCarrera(seed, splits);
  const estadoB = correrCarrera(seed, splits);

  if (JSON.stringify(estadoA) !== JSON.stringify(estadoB)) {
    throw new Error('dos corridas con la misma seed dieron resultados distintos');
  }
});

if (errores.length > 0) {
  console.error(`\n${errores.length} check(s) fallaron.`);
  process.exit(1);
} else {
  console.log('\nTodos los checks pasaron.');
}
