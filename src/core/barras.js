import { clampStat } from './numeros.js';
import { zDeResultados } from './temporada.js';
import { BALANCE } from '../data/balance.js';

// K3-A (PLAN.md "K3 — decisiones de spec", K3-A.2 a 4): las barras que no se
// saturan. Funciones puras, sin `rng`: las leen `systems/atributos.js` (la vuelta
// de la mentalidad a su base y la recuperación por dormir), `systems/practica.js`
// (el "descansar" del receso) y `systems/rendimiento.js` (el hype hacia su base).
// Las constantes arrancan en el valor que reproduce el juego de hoy (r = 0,
// rH = 0, topeDescanso = 100); K3c las fija medidas.

// v ← v + r·(base − v). Con r = 0 devuelve v exacto (v + 0).
export function revertirHaciaBase(valor, base, r) {
  return valor + r * (base - valor);
}

// K3-A.2: la mentalidad del split, un paso hacia `mentalidadBase`.
export function mentalidadHaciaSuBase(mentalidad) {
  const a = BALANCE.atributos;
  return clampStat(revertirHaciaBase(mentalidad, a.mentalidadBase, a.mentalidadRetornoBase));
}

// K3-A.3: el ÚNICO camino por el que el descanso sube la mentalidad. La
// ganancia (≥ 0) llega hasta `topeDescanso` y no más; si ya estabas por encima
// del tope, descansar no te baja (te deja donde estabas). Con el tope en 100 es
// exactamente el `clampStat(actual + ganancia)` de antes.
export function recuperarPorDescanso(actual, ganancia) {
  const tope = BALANCE.atributos.topeDescanso;
  return clampStat(Math.max(actual, Math.min(actual + ganancia, tope)));
}

// K3-A.4: visibilidad = prestigio de tu liga (0-1) + un extra si jugaste un
// internacional hace poco (`hypeAniosInternacional` años calendario: el
// internacional se juega al cierre del año, así que te hace visible el año que
// sigue). `liga` es la que devuelve `ligaOZonaDeCarrera` (sin prestigio, 0).
export function visibilidadDeCarrera(state, liga) {
  const r = BALANCE.rendimiento;
  const prestigio = Number.isFinite(liga?.prestigio) ? liga.prestigio : 0;
  const desde = (state.calendario?.anio ?? Number.NaN) - r.hypeAniosInternacional;
  const internacional = (state.career.registro?.internacionales ?? []).some((e) => Number.isFinite(e.anio) && e.anio >= desde);
  return prestigio / BALANCE.stats.max + (internacional ? r.hypeVisibilidadPorInternacional : 0);
}

// K3-A.4: baseH = h0 + a·z + b·visibilidad, con z la de tus resultados de la
// temporada regular del split (K2b). Siempre finita (z sin fechas es 0).
export function baseDeHype(state, liga) {
  const r = BALANCE.rendimiento;
  const resultados = state.career.temporada?.resultadosPropios;
  const z = resultados ? zDeResultados(resultados) : 0;
  return r.hypeBaseInicial + r.hypeBasePorDesvio * z + r.hypeBasePorVisibilidad * visibilidadDeCarrera(state, liga);
}

// K3-A.4: el hype, un paso hacia su base. Sin acotar (quien lo escribe acota).
export function hypeHaciaSuBase(hype, state, liga) {
  return revertirHaciaBase(hype, baseDeHype(state, liga), BALANCE.rendimiento.hypeRetornoBase);
}
