// El shell de transmisión (fase T1, PLAN.md "T1 — El shell de transmisión").
//
// Solo comportamiento. El DOM del shell ya está declarado en `index.html`
// con los mismos `id` que el controlador siempre usó — este módulo no monta
// nada: si algo de acá explota, el juego de abajo sigue jugable. Es la
// razón de fondo del cambio de criterio de T1 (ver PLAN.md): construir el
// shell desde JS habría significado que una carrera desatendida se puede
// quedar con la página en blanco por un fallo de montaje. Esto no puede.
//
// Cero acceso a `estado`/`rng`/`modulos`: esos viven en el closure del
// <script> del controlador, y no se exponen (T1 no toca el controlador).
// Por eso el topbar es chrome estático en esta fase — el punto vivo del
// split llega en T2, que sí reescribe cómo se pinta la ficha.

import * as sonido from './sonido.js';
import { BALANCE } from '../data/balance.js';
import { ventanaVisibleDe } from '../core/vistaDeCarrera.js';
// El teclado (FASE V, V2-B) vive en su propio módulo y sigue colgado de esta raíz aparte: si el controlador explota, las
// teclas siguen andando sobre lo que haya en pantalla.
import './teclado.js';

const logList = document.getElementById('logList');
const ticker = document.getElementById('ticker');
const topbarEstado = document.getElementById('topbarEstado');
const topbarPips = document.getElementById('topbarPips');

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

// --- El punto vivo del topbar (T2) ------------------------------------------
// `estado` vive en el closure del controlador, así que esto no se llama
// solo: `renderFicha` (src/ui/components/ficha.js) ya corre en cada tick de
// pintado y ya tiene `state` a mano — llama acá con lo que necesita, en vez
// de que el controlador exponga nada. `ventana` sale de `calcularContexto`
// (core/contexto.js): pretemporada/regular/playoffs por ahora — internacional
// y offseason solo existen hoy vía overrides de `systems/temporada.js`, que
// no llegan al `state.contexto` general.
const LABEL_VENTANA = {
  pretemporada: 'Pretemporada',
  regular: 'Temporada regular',
  playoffs: 'Playoffs',
  internacional: 'Internacional',
  offseason: 'Offseason'
};

export function actualizarTopbar(state) {
  if (!topbarEstado) return;
  if (!state?.contexto || state.phase === 'retirado') {
    topbarEstado.textContent = '';
    if (topbarPips) {
      topbarPips.hidden = true;
      topbarPips.replaceChildren();
    }
    return;
  }
  // K6a-U: la ventana REAL de la pausa, no la del arranque del split (`state.contexto`): ver `core/vistaDeCarrera.js`.
  const ventana = LABEL_VENTANA[ventanaVisibleDe(state)] ?? '';
  topbarEstado.textContent = [state.calendario.etiqueta, ventana].filter(Boolean).join(' · ');

  if (topbarPips && Number.isFinite(state.player?.splitCount)) {
    const n = BALANCE.edad.splitsPorEdad;
    const actual = state.player.splitCount % n;
    topbarPips.hidden = false;
    topbarPips.replaceChildren(...Array.from({ length: n }, (_, i) => {
      const pip = document.createElement('span');
      pip.className = 'topbar-pip'
        + (i < actual ? ' topbar-pip--hecho' : '')
        + (i === actual ? ' topbar-pip--actual' : '');
      pip.title = `Split ${i + 1} de ${n}`;
      return pip;
    }));
  }
}

// Luz de estudio: atributos en body que shell.css traduce a horizonte.
// Lo llama `renderFicha` en cada tick — el único pintado que ya tiene `state`.
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
  if (topbarPips) {
    topbarPips.hidden = true;
    topbarPips.replaceChildren();
  }
}

// --- El ticker: la última línea de #logList, en marquesina -----------------
// V2-B: `#logList` es la página del split (`renderPagina`), en orden
// cronológico: lo más reciente es el ÚLTIMO renglón que viene del motor (los
// sintéticos —la tarjeta de cierre, la línea "Split anterior"— no cuentan).
function ultimoRenglon(lista) {
  let item = lista.lastElementChild;
  while (item && item.dataset.sintetico !== undefined) item = item.previousElementSibling;
  return item;
}
function textoDeTicker(item) {
  if (!item) return '';
  const titulo = item.querySelector('.log-titulo');
  if (!titulo) return item.textContent.trim();
  const cuerpo = titulo.nextElementSibling;
  return cuerpo ? `${titulo.textContent} — ${cuerpo.textContent}` : titulo.textContent;
}

if (logList && ticker) {
  const actualizarTicker = () => {
    const texto = textoDeTicker(ultimoRenglon(logList)) || 'En vivo.';
    const pista = document.createElement('div');
    pista.className = 'ticker-pista';
    const a = document.createElement('span');
    a.textContent = texto;
    pista.append(a, a.cloneNode(true));
    ticker.replaceChildren(pista);
  };
  new MutationObserver(actualizarTicker).observe(logList, { childList: true });
  actualizarTicker();
}
