import path from 'path';
import { fileURLToPath } from 'url';
import { verificarSinMathRandom } from './guards.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto, ETAPAS_SPLIT } from '../core/pipeline.js';
import { getPath } from '../core/selectors.js';

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
  for (let i = 0; i < splits && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng).state;
  }
  return state;
}

check('Sin aleatoriedad nativa fuera del RNG inyectado', () => {
  const infractores = verificarSinMathRandom(srcDir);
  if (infractores.length > 0) {
    throw new Error(`encontrado en: ${infractores.join(', ')}`);
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
  const estadoBase = createInitialState(1);
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
  if (BALANCE.meta.pesoDominante <= BALANCE.meta.pesoMinimo) {
    throw new Error('meta.pesoDominante debe ser mayor que meta.pesoMinimo');
  }
  if (BALANCE.stats.min >= BALANCE.stats.max) {
    throw new Error('stats.min debe ser menor que stats.max');
  }
  if (!Number.isInteger(BALANCE.edad.splitsPorEdad) || BALANCE.edad.splitsPorEdad <= 0) {
    throw new Error('edad.splitsPorEdad debe ser un entero positivo');
  }
  if (BALANCE.edad.probSegundaDecision < 0 || BALANCE.edad.probSegundaDecision > 1) {
    throw new Error('edad.probSegundaDecision debe estar entre 0 y 1');
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

check('El split cierra siempre: no queda ninguna decisión colgada', () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed);

    for (let i = 0; i < 12 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.pendiente !== null) {
        throw new Error(`seed ${seed}: quedó una decisión pendiente después de cerrar el split`);
      }
    }
  }
});

check('Pipeline corre y es determinista (misma seed, dos corridas)', () => {
  const seed = 123;
  const splits = 12;
  const estadoA = correrCarrera(seed, splits);
  const estadoB = correrCarrera(seed, splits);

  if (JSON.stringify(estadoA) !== JSON.stringify(estadoB)) {
    throw new Error('dos corridas con la misma seed dieron resultados distintos');
  }
});

check('Seeds distintas producen carreras distintas', () => {
  const a = JSON.stringify(correrCarrera(1, 12));
  const b = JSON.stringify(correrCarrera(2, 12));

  if (a === b) {
    throw new Error('dos seeds distintas produjeron exactamente la misma carrera');
  }
});

if (errores.length > 0) {
  console.error(`\n${errores.length} check(s) fallaron.`);
  process.exit(1);
} else {
  console.log('\nTodos los checks pasaron.');
}
