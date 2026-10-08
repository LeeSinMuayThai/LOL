// El delta (fase V, PLAN.md "V0 — El kernel"): mide cuánto cambió cada campo
// declarado entre dos llamadas a `medir(state)` consecutivas. Es lo que V3
// usa para que la regla de proceso 13 ("todo número en pantalla lleva
// referente") se cumpla con movimiento — la barra crece desde el valor
// viejo, el número hace `countUp` — en vez de con el texto `▲3` a secas.
//
// Reusa `getPath` de `core/selectors.js` (el mismo resolutor de paths
// `"a.b.c"` que ya usan las condiciones/efectos de eventos) en vez de
// reimplementar el acceso a campos anidados.
import { getPath } from '../../core/selectors.js';

// crearDelta(campos): el set declarado de lo que este delta va a rastrear. La
// primera llamada a `medir` no tiene "antes": devuelve el mismo valor dos veces
// (sin delta que animar en el primer render).
//
// FASE V (V2-B): además de paths (`"player.stats.mecanica"`, `"career.jerarquia"`,
// ...), un campo puede ser una FUNCIÓN del estado (el nivel es una cuenta, no
// un campo: `function nivel(s) { ... }`). Dos formas:
//   - un array de paths y/o funciones: la clave del resultado es el path o el
//     `name` de la función;
//   - un objeto `{ clave: path | función }`: la clave es la que se declara.
export function crearDelta(campos) {
  const entradas = Array.isArray(campos)
    ? campos.map((campo, i) => [typeof campo === 'function' ? (campo.name || `campo${i}`) : campo, campo])
    : Object.entries(campos);
  const leer = (state, campo) => (typeof campo === 'function' ? campo(state) : getPath(state, campo));
  let anterior = null;

  return {
    medir(state) {
      const resultado = {};
      for (const [clave, campo] of entradas) {
        const despues = leer(state, campo);
        const antes = anterior ? leer(anterior, campo) : despues;
        resultado[clave] = [antes, despues];
      }
      anterior = state;
      return resultado;
    }
  };
}
