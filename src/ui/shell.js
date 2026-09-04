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

const logList = document.getElementById('logList');
const ticker = document.getElementById('ticker');
const topbarEstado = document.getElementById('topbarEstado');
const runButton = document.getElementById('run');
const nuevaCarreraBtn = document.getElementById('nuevaCarrera');
const decisionPanel = document.getElementById('decision');
const decisionOptions = document.getElementById('decisionOptions');
const mercadoPanel = document.getElementById('mercado');
const mercadoGrid = document.getElementById('mercadoGrid');
const avanzadoDetails = document.querySelector('.avanzado');

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
    return;
  }
  const ventana = LABEL_VENTANA[state.contexto.ventana] ?? '';
  topbarEstado.textContent = [state.calendario.etiqueta, ventana].filter(Boolean).join(' · ');
}

// --- El ticker: la última línea de #logList, en marquesina -----------------
// `feed.js` hace `logList.replaceChildren(...)` con lo más reciente PRIMERO
// (`.slice(-limite).reverse()`) — el ticker lee `firstElementChild`, no el
// último, o mostraría la línea más vieja de las ocho que quedan en pantalla.
function textoDeTicker(item) {
  if (!item) return '';
  const titulo = item.querySelector('.log-titulo');
  if (!titulo) return item.textContent.trim();
  const cuerpo = titulo.nextElementSibling;
  return cuerpo ? `${titulo.textContent} — ${cuerpo.textContent}` : titulo.textContent;
}

if (logList && ticker) {
  const actualizarTicker = () => {
    ticker.textContent = textoDeTicker(logList.firstElementChild);
  };
  new MutationObserver(actualizarTicker).observe(logList, { childList: true });
  actualizarTicker();
}

// --- Teclado desde el arranque ----------------------------------------------
// Un elemento "visible" acá quiere decir "no tapado por [hidden] en ningún
// ancestro" — `.hidden`/`.disabled` solo leen el atributo PROPIO del
// elemento, y `#run`/`#nuevaCarrera` dependen de que su contenedor
// (`#setup`/`#carrera`) esté visible. `offsetParent` es la forma barata de
// preguntar eso sin caminar la cadena de ancestros a mano.
function visible(el) {
  return !!el && el.offsetParent !== null;
}

function escribiendoEnUnCampo() {
  const activo = document.activeElement;
  return !!activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA');
}

// El sentido de "saltear un beat" en Espacio/Enter llega en T3, cuando el
// reproductor tenga algo que saltear. Acá cubre lo que ya existe: arrancar
// la carrera o volver a empezar una nueva.
function activarPrimario() {
  if (visible(runButton) && !runButton.disabled) {
    runButton.click();
    return true;
  }
  if (visible(nuevaCarreraBtn)) {
    nuevaCarreraBtn.click();
    return true;
  }
  return false;
}

function opcionVisible(indice) {
  if (decisionPanel && !decisionPanel.hidden) {
    return decisionOptions?.children[indice] ?? null;
  }
  if (mercadoPanel && !mercadoPanel.hidden) {
    return mercadoGrid?.children[indice] ?? null;
  }
  return null;
}

document.addEventListener('keydown', (evento) => {
  if (escribiendoEnUnCampo()) return;

  if (evento.key === ' ' || evento.key === 'Enter') {
    if (activarPrimario()) evento.preventDefault();
    return;
  }

  if (evento.key >= '1' && evento.key <= '4') {
    const opcion = opcionVisible(Number(evento.key) - 1);
    if (opcion && !opcion.disabled) opcion.click();
    return;
  }

  if (evento.key === 'Escape') {
    // Lo único cerrable en T1: el disclosure de la seed avanzada. Si no
    // está abierto, Esc es el atajo de "volver a empezar" cuando corresponde.
    if (avanzadoDetails?.open) {
      avanzadoDetails.open = false;
    } else if (visible(nuevaCarreraBtn)) {
      nuevaCarreraBtn.click();
    }
  }
});
