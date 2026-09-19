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

// crearDelta(paths): `paths` es el set declarado de paths (`"player.stats.mecanica"`,
// `"career.jerarquia"`, ...) que este delta va a rastrear. La primera
// llamada a `medir` no tiene "antes": devuelve el mismo valor dos veces (sin
// delta que animar en el primer render).
export function crearDelta(paths) {
  let anterior = null;

  return {
    medir(state) {
      const resultado = {};
      for (const path of paths) {
        const despues = getPath(state, path);
        const antes = anterior ? getPath(anterior, path) : despues;
        resultado[path] = [antes, despues];
      }
      anterior = state;
      return resultado;
    }
  };
}
