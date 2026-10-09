// Barrido de seeds: juega la carrera entera de cada una con `criterio` y puntúa la cobertura. Corre en worker_threads (una pieza
// por hilo, el resultado se ordena por seed al juntarlo: la elección no depende de cuál hilo termine primero).
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { jugarCarrera } from './partida.mjs';
import { observadorDeCobertura, puntuar } from './cobertura.mjs';

function barrerLote(seeds) {
  const salida = [];
  for (const seed of seeds) {
    const obs = observadorDeCobertura();
    try {
      const { state } = jugarCarrera(seed, { alParar: obs.alParar, alCerrarSplit: obs.alCerrarSplit });
      obs.alTerminar(state);
      salida.push({
        seed, ...puntuar(obs.cob), cob: obs.cob,
        total: state.tarjeta?.puntaje?.total ?? null, nivel: state.tarjeta?.puntaje?.nivel?.nombre ?? null
      });
    } catch (error) {
      salida.push({ seed, error: String(error?.message ?? error) });
    }
  }
  return salida;
}

if (!isMainThread && workerData?.tarea === 'barrido') {
  parentPort.postMessage(barrerLote(workerData.seeds));
}

// `desde`..`hasta` (inclusive). Devuelve `{ filas (por seed), hilos }`.
export async function barrer(desde, hasta, hilos = Math.max(1, Math.min(os.cpus().length - 1, 12))) {
  const seeds = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  // Reparto intercalado: cada hilo recibe seeds salteadas, así el costo (que crece con la edad de retiro) se parte parejo.
  const lotes = Array.from({ length: hilos }, (_, h) => seeds.filter((_s, i) => i % hilos === h));
  const archivo = fileURLToPath(import.meta.url);
  const resultados = await Promise.all(lotes.map((lote) => new Promise((resolver, rechazar) => {
    const w = new Worker(archivo, { workerData: { tarea: 'barrido', seeds: lote } });
    w.once('message', resolver);
    w.once('error', rechazar);
  })));
  const filas = resultados.flat().sort((a, b) => a.seed - b.seed);
  return { filas, hilos };
}

// El mejor: mayor puntaje, desempate por la seed menor.
export function elegirHeroe(filas) {
  return filas.filter((f) => !f.error).reduce((mejor, f) => (
    !mejor || f.puntaje > mejor.puntaje || (f.puntaje === mejor.puntaje && f.seed < mejor.seed) ? f : mejor
  ), null);
}
