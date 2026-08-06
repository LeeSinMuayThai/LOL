import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplit } from '../core/pipeline.js';

function runSimulation(seed) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed);

  for (let i = 0; i < 3; i += 1) {
    const result = avanzarSplit(state, rng);
    state = result.state;
  }

  return state;
}

const seed = Number(process.argv[2] || 42);
const result = runSimulation(seed);
console.log(JSON.stringify({
  seed,
  age: result.age,
  splitCount: result.player.splitCount,
  mecanica: result.player.stats.mecanica,
  mentalidad: result.player.stats.mentalidad,
  studies: result.player.studies,
  familyTrust: result.player.familyTrust,
  meta: result.meta.weights,
  latestLog: result.logs.at(-1)
}, null, 2));
