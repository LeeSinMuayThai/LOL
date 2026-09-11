// Fase 11 (PLAN.md §11.1): el resumen anual — nota, titular y viñetas.
//
// Reemplaza el log plano que emitía `edadCierre.js` (`generarTextoResumen`,
// borrado). Corre DESPUÉS de `escena`/`topMundial`/`rivales` a propósito: la
// nota y las viñetas necesitan `mundo.escenaAnual` y `mundo.archirrival` ya
// frescos de ESTE año, que esos tres sistemas recién terminan de escribir —
// pedirlos desde `edadCierre` (que corre antes) habría leído los del año
// pasado. Y ANTES de `plantel`, que envejece el mundo y podría mover al
// archirrival de org para el año que viene.
//
// Cero rng: `core/temporadaResumen.js` es puro, igual que `topMundial`/
// `rivales` — insertar este sistema acá no le cuesta un solo `rng()` a nadie
// más del registro (T1).

import { crearLog } from '../core/log.js';
import { registrarTemporada } from '../core/registro.js';
import { notaDeLaTemporada, bandaDeNota, titularDelAnio, vinetasDelAnio } from '../core/temporadaResumen.js';
import { esCierreDeEdad } from './edadCierre.js';

export const id = 'resumenAnio';

export function aplicar(state, rng) { // eslint-disable-line no-unused-vars
  if (!esCierreDeEdad(state)) {
    return { state, logs: [] };
  }

  const nota = notaDeLaTemporada(state);
  const banda = bandaDeNota(nota);
  const titular = titularDelAnio(state);
  const vinetas = vinetasDelAnio(state);

  const registro = registrarTemporada(state.career.registro, {
    anio: state.calendario.anio, nota, tipo: titular.tipo, tipoBase: titular.tipoBase, mainMuerto: titular.mainMuerto
  });

  const log = crearLog('edad', titular.titular, {
    nota, banda, tipo: titular.tipo, tipoBase: titular.tipoBase, bajada: titular.bajada, vinetas,
    anio: state.calendario.anio, temporada: state.calendario.temporada
  });

  return {
    state: { ...state, career: { ...state.career, registro } },
    logs: [log]
  };
}
