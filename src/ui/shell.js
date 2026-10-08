// El shell de transmisión (fase T1, PLAN.md "T1 — El shell de transmisión").
//
// Solo comportamiento. El DOM del shell ya está declarado en `index.html`
// con los mismos `id` que el controlador siempre usó — este módulo no monta
// nada: si algo de acá explota, el juego de abajo sigue jugable. Es la
// razón de fondo del cambio de criterio de T1 (ver PLAN.md): construir el
// shell desde JS habría significado que una carrera desatendida se puede
// quedar con la página en blanco por un fallo de montaje. Esto no puede.
//
// Cero acceso a `estado`/`rng`/`modulos`: esos viven en el controlador
// (`app.js`). Desde V2-C acá quedan el clic audible, la luz de estudio (que
// `app.js` llama con la `vista`) y el teclado; la topbar y el ticker se fueron
// (la franja es `franja.js`).

import * as sonido from './sonido.js';
import { ventanaVisibleDe } from '../core/vistaDeCarrera.js';
// El teclado (FASE V, V2-B) vive en su propio módulo y sigue colgado de esta raíz aparte: si el controlador explota, las
// teclas siguen andando sobre lo que haya en pantalla.
import './teclado.js';

// --- El click, en cualquier botón (T3) --------------------------------
// Delegado en `document`, no un listener por botón: el shell no conoce (ni
// le tiene que importar) qué pantalla montó cada `<button>` — decisión,
// mercado, rol/campeón, topbar. `sonido.click()` ya es un no-op si el
// sonido está apagado, así que esto no cuesta nada cuando está mudo.
document.addEventListener('click', (evento) => {
  if (evento.target.closest('button')) {
    sonido.click();
  }
});

// V2-C: el punto vivo de la topbar (T2: año, ventana y los pips del split) se mudó a la franja (`src/ui/franja.js`),
// que se pinta desde la `vista`.

// Luz de estudio: atributos en body que shell.css traduce a horizonte. La llama `app.js` desde la `vista` (V2-B), con
// la `ficha` de `core/ficha.js` (`fichaCompleta`) para saber si la cabeza está en peligro.
export function aplicarEstudio(state, ficha) {
  const body = document.body;
  body.dataset.fase = state.phase ?? '';
  const ventanaDePantalla = ventanaVisibleDe(state);
  if (ventanaDePantalla) {
    body.dataset.ventana = ventanaDePantalla;
  } else {
    delete body.dataset.ventana;
  }
  if (state.serie?.activa) body.dataset.serie = 'on';
  else delete body.dataset.serie;

  const marcas = state.contexto?.marcas ?? [];
  const peligroAmateur = state.phase === 'amateur' && (
    marcas.includes('deuda_sueno')
    || marcas.includes('riesgo_familiar')
    || marcas.includes('pc_confiscada')
  );
  const peligro = Boolean(ficha?.mentalidad?.peligro) || peligroAmateur;
  if (peligro) body.dataset.peligro = 'on';
  else delete body.dataset.peligro;
  // V2-B: la final ya no es `body[data-legado]`: es la pieza `final` (`.shell[data-pieza]`, src/ui/escena.js).
}

export function limpiarEstudio() {
  const body = document.body;
  delete body.dataset.fase;
  delete body.dataset.ventana;
  delete body.dataset.serie;
  delete body.dataset.peligro;
}
