// El shell (fase T1; FASE V, V2-C; PLANUI U1): la raíz aparte del comportamiento que no es de una pantalla.
//
// El DOM del shell ya está declarado en `index.html` con los mismos `id` que el controlador siempre usó: este módulo no
// monta nada del juego, y si algo de acá explota, el juego de abajo sigue jugable (el criterio de T1). Cero acceso a
// `estado`/`rng`/`modulos`: viven en el controlador (`app.js`). Acá quedan el clic audible, el teclado y, desde U1, el
// puente al ambiente (PLANUI §6.1, §9.2): `src/ui/fx/` se carga y se monta sobre `#fx-ambiente` después de idle, con
// import dinámico y adentro de un try/catch (un fallo en el kit degrada a "sin ambiente", nunca rompe esta raíz ni el
// juego). La luz la decide el director (`ui/escena.js` con `ui/core/era.js`, desde la `vista`); este puente solo la
// reenvía, la guarda hasta que el ambiente monta y junta los motivos de pausa (minijuego, cuarto abierto, pestaña
// oculta). Reemplaza a `aplicarEstudio`/`limpiarEstudio` (la luz de estudio de V2-B).

import * as sonido from './sonido.js';
// El teclado (FASE V, V2-B) vive en su propio módulo y sigue colgado de esta raíz aparte: si el controlador explota, las
// teclas siguen andando sobre lo que haya en pantalla.
import './teclado.js';

// --- El click, en cualquier botón (T3) --------------------------------
// Delegado en `document`, no un listener por botón: el shell no conoce qué pantalla montó cada `<button>`.
// `sonido.click()` ya es un no-op si el sonido está apagado, así que esto no cuesta nada cuando está mudo.
document.addEventListener('click', (evento) => {
  if (evento.target.closest('button')) {
    sonido.click();
  }
});

// --- El ambiente (PLANUI §6.1) ----------------------------------------
// Sin `requestIdleCallback` (Safari), el montaje espera a que el navegador termine de pintar el primer cuadro.
const ESPERA_SIN_IDLE_MS = 0;
// El techo de la espera por idle: con la página ocupada, el ambiente igual llega.
const TECHO_IDLE_MS = 2000;

let api = null;
let ultimo = null;
const motivosDePausa = new Set();

function seguro(nombre, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`El ambiente falló en ${nombre}:`, error);
  }
}

async function montarAmbiente() {
  const contenedor = document.getElementById('fx-ambiente');
  if (!contenedor || api) return;
  try {
    const { montarFx } = await import('./fx/index.js');
    api = montarFx(contenedor);
  } catch (error) {
    console.error('No se pudo montar el ambiente (el juego sigue sin él):', error);
    api = null;
  }
  if (!api) return;
  // `src/dev/estrella.mjs` (U1a) lo busca para `congelar(ms)` en las capturas.
  window.__fx = api;
  if (ultimo) seguro('ambiente', () => api.ambiente(ultimo));
  if (motivosDePausa.size > 0) seguro('pausar', () => api.pausar());
}

if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(() => { montarAmbiente(); }, { timeout: TECHO_IDLE_MS });
} else {
  window.setTimeout(() => { montarAmbiente(); }, ESPERA_SIN_IDLE_MS);
}

// El puente que usa el director (`crearEscena({ ambiente })`).
export const ambiente = {
  // `{ era, animo }` desde la `vista` (ui/core/era.js). Se guarda: si el ambiente monta después, arranca con la última.
  aplicar(luz) {
    ultimo = { ...ultimo, ...luz };
    if (api) seguro('ambiente', () => api.ambiente(luz));
  },
  // La enmienda de la regla 1 (PLANUI §2): una parada apareció, el ambiente se aquieta en <= 1 s.
  aquietar() {
    if (api) seguro('aquietar', () => api.aquietar());
  },
  // El ambiente está en pausa mientras haya al menos un motivo: 'minijuego', 'cuarto', 'oculta'.
  pausa(motivo, activa) {
    const antes = motivosDePausa.size > 0;
    if (activa) motivosDePausa.add(motivo);
    else motivosDePausa.delete(motivo);
    const ahora = motivosDePausa.size > 0;
    if (api && antes !== ahora) seguro(ahora ? 'pausar' : 'reanudar', () => (ahora ? api.pausar() : api.reanudar()));
  }
};

// La pestaña oculta y el cuarto abierto (el `<dialog id="cuarto">` de `cuartos.js`: se mira su atributo `open`, sin tocar
// el módulo de los cuartos).
document.addEventListener('visibilitychange', () => ambiente.pausa('oculta', document.hidden));
ambiente.pausa('oculta', document.hidden);
const dialogoCuarto = document.getElementById('cuarto');
if (dialogoCuarto) {
  new MutationObserver(() => ambiente.pausa('cuarto', dialogoCuarto.open))
    .observe(dialogoCuarto, { attributes: true, attributeFilter: ['open'] });
}
