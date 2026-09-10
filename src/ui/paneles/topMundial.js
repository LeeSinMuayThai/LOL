import { crearOrgChip } from '../components/orgChip.js';

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

export function renderTopMundial(container, state, modulos) {
  const top = state.mundo?.topMundial ?? [];

  if (top.length === 0) {
    container.hidden = true;
    return;
  }

  const rankActual = state.flags?.rankMundialActual ?? null;
  const rankPico = state.career?.registro?.picos?.rankMundial ?? 0;

  container.hidden = false;
  container.replaceChildren();

  const titulo = document.createElement('div');
  titulo.className = 'panel-contexto-titulo';
  titulo.textContent = 'El mundo';
  container.appendChild(titulo);

  const lista = document.createElement('div');
  lista.className = 'topmundial-lista';

  top.slice(0, VISIBLES).forEach((fila, indice) => {
    lista.appendChild(filaEl(fila, indice + 1, modulos));
  });
  container.appendChild(lista);

  // Estás rankeado pero fuera del Top 5 que se muestra: una fila al pie con
  // tu puesto exacto, para no perderte de vista.
  if (rankActual !== null && rankActual > VISIBLES) {
    const vos = filaEl(
      { handle: state.player.name, org: state.career.currentOrg, rol: state.player.role, liga: state.career.liga, esJugador: true },
      rankActual,
      modulos
    );
    vos.classList.add('topmundial-fila--pie');
    container.appendChild(vos);
  }

  // No estás en la lista ahora, pero alguna vez la tocaste: el pico se
  // recuerda (es el gancho del que la fase 10 cuelga el retiro).
  if (rankActual === null && rankPico > 0) {
    const leyenda = document.createElement('div');
    leyenda.className = 'panel-contexto-leyenda';
    leyenda.textContent = `Tu pico: #${rankPico}`;
    container.appendChild(leyenda);
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
  detalleEl.textContent = [rol, fila.liga].filter(Boolean).join(' · ');

  el.append(puestoEl, handleEl, detalleEl);
  return el;
}
