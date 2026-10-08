import { crearOrgChip } from '../components/orgChip.js';
import { reconciliar, reemplazarEnElLugar } from '../core/reconciliar.js';
import { nombreVisibleDeLiga } from '../formatoUi.js';

// El panel del Top 5 mundial (fase 9Wc, regla de proceso 12: un sistema que
// el jugador no puede ver no está terminado). Fuente: `mundo.topMundial`, que
// `systems/topMundial.js` reescribe cada split sin tocar `rng`, y
// `flags.rankMundialActual` / `career.registro.picos.rankMundial` para saber
// dónde estás parado vos.
//
// Se ve SIEMPRE, también en amateur y en tier 3 con handles que no conocés:
// es el norte al que se apunta, no un tablero de tu liga. El reveal del Top 20
// entero es otra cosa — vive en el feed al cierre de temporada
// (`components/feed.js`).
const VISIBLES = 5;

// Fase V, V0b: esqueleto cacheado igual que tabla.js/plantilla.js. La fila
// "vos" (fuera del Top 5) y la leyenda del pico son mutuamente excluyentes y
// singulares, así que no pasan por `reconciliar` — se manejan como un único
// nodo `extra` que se injerta con `reemplazarEnElLugar` sin importar cuál de
// las dos formas tenía antes.
export function renderTopMundial(container, state, modulos) {
  const top = state.mundo?.topMundial ?? [];

  if (top.length === 0) {
    container.hidden = true;
    return;
  }

  const rankActual = state.flags?.rankMundialActual ?? null;
  const rankPico = state.career?.registro?.picos?.rankMundial ?? 0;

  container.hidden = false;

  let refs = container.__topMundialRefs;
  if (!refs) {
    container.replaceChildren();
    const titulo = document.createElement('div');
    titulo.className = 'panel-contexto-titulo';
    titulo.textContent = 'Top 5 del mundo';
    const lista = document.createElement('div');
    lista.className = 'topmundial-lista';
    container.append(titulo, lista);
    refs = { lista, extra: null };
    container.__topMundialRefs = refs;
  }

  const visibles = top.slice(0, VISIBLES).map((fila, indice) => ({ ...fila, puesto: indice + 1 }));
  reconciliar(
    refs.lista,
    visibles,
    (item) => item.handle,
    (item) => filaEl(item, item.puesto, modulos),
    (nodo, item) => reemplazarEnElLugar(nodo, filaEl(item, item.puesto, modulos))
  );

  let nodoExtra = null;
  if (rankActual !== null && rankActual > VISIBLES) {
    // Estás rankeado pero fuera del Top 5 que se muestra: una fila al pie
    // con tu puesto exacto, para no perderte de vista.
    nodoExtra = filaEl(
      { handle: state.player.name, org: state.career.currentOrg, rol: state.player.role, liga: state.career.liga, esJugador: true },
      rankActual,
      modulos
    );
    nodoExtra.classList.add('topmundial-fila--pie');
  } else if (rankActual === null && rankPico > 0) {
    // No estás en la lista ahora, pero alguna vez la tocaste: el pico se
    // recuerda (es el gancho del que la fase 10 cuelga el retiro).
    nodoExtra = document.createElement('div');
    nodoExtra.className = 'panel-contexto-leyenda';
    nodoExtra.textContent = `Tu pico: #${rankPico}`;
  }

  if (nodoExtra) {
    if (!refs.extra) {
      refs.extra = nodoExtra;
      container.appendChild(refs.extra);
    } else {
      reemplazarEnElLugar(refs.extra, nodoExtra);
    }
  } else if (refs.extra) {
    refs.extra.remove();
    refs.extra = null;
  }
}

function filaEl(fila, puesto, modulos) {
  const el = document.createElement('div');
  el.className = ['topmundial-fila',
    fila.esJugador && 'topmundial-fila--propia',
    fila.rivalDeGeneracion && 'topmundial-fila--rival'
  ].filter(Boolean).join(' ');

  const puestoEl = document.createElement('span');
  puestoEl.className = 'topmundial-puesto';
  puestoEl.textContent = `#${puesto}`;

  const handleEl = document.createElement('span');
  handleEl.className = 'topmundial-handle';
  handleEl.append(crearOrgChip(fila.org, { size: 16 }), document.createTextNode(fila.handle));

  const detalleEl = document.createElement('span');
  detalleEl.className = 'topmundial-detalle';
  const rol = fila.rol ? modulos.etiquetaRol(fila.rol) : '';
  detalleEl.textContent = [rol, nombreVisibleDeLiga(fila.liga)].filter(Boolean).join(' · ');

  el.append(puestoEl, handleEl, detalleEl);
  return el;
}
