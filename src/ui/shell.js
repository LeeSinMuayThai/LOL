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
// La curva del color de las piezas de campeón (`fx/color.js`, pura): la sigue la pantalla aunque el ambiente no monte.
import { fijarColor } from './fx/color.js';
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
// `tonoEra` de `fx/tono.js` (el kit): se carga solo si el ambiente montado sabe de tonos (`api.tono`).
let tonoEra = null;
// Lo último que pidió el director (y la familia de la parada): si el ambiente monta después, arranca con esto.
// `mundo` es la declaración de la pieza (PLANUI §0.2, `ui/core/mundo.js`): arte, tono, costura, escena...
const estado = { luz: null, contexto: null, inst: null, quieto: false, mundo: null };
const motivosDePausa = new Set();
const CONSULTA_CELULAR = '(max-width: 640px)';

function seguro(nombre, fn) {
  try {
    return fn();
  } catch (error) {
    console.error(`El ambiente falló en ${nombre}:`, error);
    return null;
  }
}

const esCelular = () => window.matchMedia?.(CONSULTA_CELULAR).matches ?? false;

// El tono de la pantalla: el que declaró la pieza o, si no declaró ninguno, el de la era (LINEA.md §3, contexto `era`).
function tonoActual() {
  return estado.mundo?.tono ?? (tonoEra && estado.luz?.era ? tonoEra(estado.luz.era) : null);
}

// La declaración del mundo al ambiente: lo que hacía `aplicarAmbiente` + `aplicarFondo` de la vitrina (main.js). El
// tono va al CSS (`--tono-*` en <html>) y, si la pieza no trajo su propia paleta, tiñe la luz y la noche del mundo.
function aplicarMundo({ instantaneo = false } = {}) {
  const m = estado.mundo;
  if (!api || !m) return;
  const tono = tonoActual();
  seguro('tono', () => api.tono?.(tono, { paleta: !m.paleta }));
  seguro('aura', () => api.aura?.pantalla?.(m.arte, { pegajosa: m.pegajosa }));
  seguro('ambiente', () => api.ambiente({
    arte: m.arte,
    encuadre: esCelular() ? 'celular' : m.encuadre,
    velo: m.velo,
    costura: m.costura ?? null,
    lightsticks: m.lightsticks ?? 0,
    ...(m.paleta ? { paleta: m.paleta } : {}),
    ...(m.cruce != null ? { cruce: m.cruce } : {}),
    ...(m.animo ? { animo: m.animo } : {}),
    instantaneo
  }));
  seguro('fondo', () => api.fondo?.({ contexto: estado.contexto ?? 'juego', escena: m.escena ?? null, instantaneo }));
}

async function montarAmbiente() {
  const contenedor = document.getElementById('fx-ambiente');
  if (!contenedor || api) return;
  try {
    const { montarFx } = await import('./fx/index.js');
    api = montarFx(contenedor);
    if (api && typeof api.tono === 'function') {
      ({ tonoEra } = await import('./fx/tono.js'));
    }
  } catch (error) {
    console.error('No se pudo montar el ambiente (el juego sigue sin él):', error);
  }
  if (!api) return;
  // `src/dev/estrella.mjs` (U1a) lo busca para `congelar(ms)` en las capturas.
  window.__fx = api;
  if (estado.inst !== null) seguro('inst', () => api.inst?.(estado.inst));
  if (estado.contexto) seguro('fondo', () => api.fondo?.({ contexto: estado.contexto, escena: estado.mundo?.escena ?? null, instantaneo: true }));
  if (estado.luz) seguro('ambiente', () => api.ambiente({ ...estado.luz, instantaneo: true }));
  if (estado.mundo) aplicarMundo({ instantaneo: true });
  else if (estado.luz) seguro('tono', () => api.tono?.(tonoActual()));
  if (estado.quieto) seguro('aquietar', () => api.aquietar(true));
  if (motivosDePausa.size > 0) seguro('pausar', () => api.pausar());
  for (const f of alMontar.splice(0)) seguro('alMontar', () => f(api));
}
const alMontar = [];

if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(() => { montarAmbiente(); }, { timeout: TECHO_IDLE_MS });
} else {
  window.setTimeout(() => { montarAmbiente(); }, ESPERA_SIN_IDLE_MS);
}

// El puente que usan el director (`crearEscena({ ambiente })`), el controlador (`inst`) y las familias de parada
// (`ctx.mundo`: `declarar`, `fx`). Las llamadas que el kit no tiene van con `?.` (la API del kit, `src/ui/fx/README.md`).
export const ambiente = {
  // `{ era, animo }` desde la `vista` (ui/core/era.js): la luz del mundo y, si cambió la era y la pieza no declaró su
  // propio tono, el tono de la era.
  aplicar(luz) {
    const eraAntes = estado.luz?.era ?? null;
    estado.luz = { ...estado.luz, ...luz };
    if (!api) return;
    if (estado.luz.era !== eraAntes && !estado.mundo?.tono) seguro('tono', () => api.tono?.(tonoActual(), { paleta: !estado.mundo?.paleta }));
    seguro('ambiente', () => api.ambiente(luz));
  },
  // La política del mundo de la pantalla (`api.fondo`): 'inicio' (el bitono entero), 'juego' o 'momento'.
  fondo(contexto) {
    if (contexto === estado.contexto) return;
    estado.contexto = contexto;
    fijarColor(contexto);
    if (api) seguro('fondo', () => api.fondo?.({ contexto, escena: estado.mundo?.escena ?? null }));
  },
  // La declaración del mundo de la pieza (`ui/core/mundo.js`: `mundoBase` del director, y encima lo que declare la
  // familia). Parcial: lo que no viene se mantiene; `reemplazar` la pone entera.
  declarar(decl, { reemplazar = false } = {}) {
    estado.mundo = reemplazar ? { ...decl } : { ...estado.mundo, ...decl };
    aplicarMundo();
  },
  // La api del kit, para lo que es de un instante (pulso, momento, takeover, quiebre, costura(), el suspenso, el aura):
  // `null` si el ambiente todavía no montó. `cuandoMonte(f)` corre `f(api)` apenas monte (o ya, si montó).
  fx() {
    return api;
  },
  cuandoMonte(f) {
    if (api) seguro('alMontar', () => f(api));
    else alMontar.push(f);
  },
  // El reproductor entró o salió de INST (o del movimiento reducido): el camino quieto de todo el kit.
  inst(si) {
    estado.inst = Boolean(si);
    if (api) seguro('inst', () => api.inst?.(estado.inst));
  },
  // La enmienda de la regla 1 (PLANUI §2): una parada apareció, el ambiente se aquieta en <= 1 s (`si`); vuelve a
  // moverse en el relato (`false`).
  aquietar(si = true) {
    estado.quieto = Boolean(si);
    if (api) seguro('aquietar', () => api.aquietar(estado.quieto));
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

// El celular gira o la ventana cruza el corte: el encuadre del mundo cambia (el de la costura, vertical u horizontal).
window.matchMedia?.(CONSULTA_CELULAR).addEventListener?.('change', () => aplicarMundo());

// La pestaña oculta y el cuarto abierto (el `<dialog id="cuarto">` de `cuartos.js`: se mira su atributo `open`, sin tocar
// el módulo de los cuartos).
document.addEventListener('visibilitychange', () => ambiente.pausa('oculta', document.hidden));
ambiente.pausa('oculta', document.hidden);
const dialogoCuarto = document.getElementById('cuarto');
if (dialogoCuarto) {
  new MutationObserver(() => ambiente.pausa('cuarto', dialogoCuarto.open))
    .observe(dialogoCuarto, { attributes: true, attributeFilter: ['open'] });
}
