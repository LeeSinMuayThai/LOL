// Fase 11 (PLAN.md §11.2, cierra D8): el archirrival corre su carrera.
//
// `state.mundo.archirrival` ya sale elegido y con identidad de
// `core/mundo.js` (`elegirArchirrival`, cero rng: es una elección, no un
// sorteo). Este sistema lo mantiene vivo cada cierre de edad: dónde juega
// ahora, a qué nivel, y si su org se llevó algo este año — leyendo la misma
// `mundo.escenaAnual` que ya resuelve el título de CADA liga de tier 1 sin
// tocar `rng` (`core/escena.js`, fase 9W). Cero rng acá tampoco: por eso
// puede correr todos los splits sin costo de stream (T1).
//
// Se para JUSTO DESPUÉS de `topMundial` (que corre justo después de
// `escena`, así que `mundo.escenaAnual` ya está fresca) y ANTES de
// `plantel`, que envejece el mundo y podría mover al archirrival de org
// para el año que viene — este sistema tiene que leer DÓNDE JUGÓ este año
// antes de que eso pase.

import { rankearPoblacion } from '../core/topMundial.js';
import { esCierreDeEdad } from './edadCierre.js';

export const id = 'rivales';

function tuyos(registro) {
  return registro.titulos.length + registro.internacionales.filter((e) => e.resultado === 'buen_papel').length;
}

export function aplicar(state, rng) { // eslint-disable-line no-unused-vars
  const archirrival = state.mundo.archirrival;
  if (!archirrival || !esCierreDeEdad(state)) {
    return { state, logs: [] };
  }

  // El NPC puede haber salido de un plantel de tier 1 (retiro por edad,
  // `plantel.js` todavía no corrió este split así que si se fue el año
  // pasado ya no está en ningún lado): se mantiene el último dato conocido
  // en vez de borrar su historia.
  const entrada = rankearPoblacion(state).find((e) => e.handle === archirrival.handle);
  if (!entrada) {
    return { state, logs: [] };
  }

  const escenaAnual = state.mundo.escenaAnual;
  const ganoLiga = escenaAnual?.campeones?.[entrada.liga] === entrada.org;
  const ganoMundial = escenaAnual?.campeonMundial === entrada.org;
  const titulos = archirrival.titulos + (ganoLiga ? 1 : 0);
  const internacionales = archirrival.internacionales + (ganoMundial ? 1 : 0);
  const suyos = titulos + internacionales;

  const actualizado = {
    ...archirrival,
    org: entrada.org,
    liga: entrada.liga,
    nivel: entrada.nivel,
    titulos,
    internacionales,
    duelo: { tuyos: tuyos(state.career.registro), suyos },
    historial: [...archirrival.historial, { anio: state.calendario.anio, org: entrada.org, nivel: entrada.nivel, titulos: suyos }]
  };

  return {
    state: { ...state, mundo: { ...state.mundo, archirrival: actualizado } },
    logs: []
  };
}
