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
// un campo: `function nivel(estado) { ... }`). Dos formas:
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

// --- Mover el número (FASE V, V4; PLAN.md §V.3 regla 3: "el delta se ve") ---------------------------------------------
//
// `crearDelta` dice DE DÓNDE a dónde cambió un campo; `moverNumero` es lo que lo hace visible: escribe en `el` el número
// yendo de `antes` a `despues` (un conteo, en `duracion` ms) y termina SIEMPRE en `formato(despues)`. La regla 4 de §V.3 (nada
// adelanta el resultado) es de quien lo llama: se mueve desde la `vista`, cuando el relato ya contó lo que lo movió.
//
// Camino quieto: con `prefers-reduced-motion`, sin `antes`, sin cambio, sin `requestAnimationFrame` (Node) o con `animar:
// false` (INST), el número aparece ya en su valor final y no se programa nada. `reducido`, `raf` y `ahora` se pueden inyectar
// para probarlo sin navegador (`validate.js`).
export const DURACION_DE_UN_NUMERO_MS = 600;
// La curva es de salida suave (arranca rápido y frena): 1 - (1 - t)^3.
const POTENCIA_DE_LA_CURVA = 3;

function movimientoReducido() {
  return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Un lector de pantalla no tiene que leer "71, 72, 73…" mientras el número cuenta: `#logList` es una región `aria-live`, y cada
// `textContent` que cambia adentro se anuncia. `leerSoloElFinal` esconde el nodo que cuenta (`aria-hidden`) y devuelve el nodo que
// lo reemplaza para el lector (`.solo-lectores`, con el valor final ya puesto): quien llama lo agrega justo después del que cuenta.
export function leerSoloElFinal(el, textoFinal) {
  el.setAttribute('aria-hidden', 'true');
  const lector = document.createElement('span');
  lector.className = 'solo-lectores';
  lector.textContent = textoFinal;
  return lector;
}

// Devuelve `cancelar()`: deja el número en su valor final y apaga la animación. Idempotente.
export function moverNumero(el, antes, despues, {
  formato = String,
  duracion = DURACION_DE_UN_NUMERO_MS,
  animar = true,
  reducido = movimientoReducido(),
  raf = globalThis.requestAnimationFrame?.bind(globalThis),
  ahora = () => globalThis.performance.now()
} = {}) {
  const pintar = (n) => {
    el.textContent = formato(n);
  };
  const sinCambio = !Number.isFinite(antes) || !Number.isFinite(despues) || antes === despues;
  if (!animar || reducido || sinCambio || typeof raf !== 'function' || !(duracion > 0)) {
    pintar(despues);
    return () => {};
  }
  let vivo = true;
  const t0 = ahora();
  pintar(antes);
  const paso = (t) => {
    if (!vivo) return;
    const avance = Math.max(0, Math.min(1, (t - t0) / duracion));
    if (avance >= 1) {
      vivo = false;
      pintar(despues);
      return;
    }
    const curva = 1 - (1 - avance) ** POTENCIA_DE_LA_CURVA;
    pintar(Math.round(antes + (despues - antes) * curva));
    raf(paso);
  };
  raf(paso);
  return () => {
    if (vivo) {
      vivo = false;
      pintar(despues);
    }
  };
}
