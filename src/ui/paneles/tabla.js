import { tablaDePosiciones } from '../../core/temporada.js';
import { crearOrgChip } from '../components/orgChip.js';
import { reconciliar, reemplazarEnElLugar } from '../core/reconciliar.js';
import { nombreVisibleDeLiga } from '../formatoUi.js';

// El panel de Tabla (fase T5, PLAN.md "T5 — El riel de contexto").
//
// `career.temporada.tabla` se ve tentador como fuente, pero medido en la
// verificación de esta fase: queda `[]` durante TODA la temporada regular
// — `avanzarFechaSilenciosa` (systems/temporada.js) actualiza
// `registrosOtros`/`filaPropia` cada fecha y nunca escribe `.tabla`; ese
// campo solo se llena una vez, al cerrar la temporada, junto con
// `activa: false`. Leerlo tal cual habría dejado el panel vacío toda la
// temporada y mostrando la tabla final justo cuando `activa` ya es falso.
//
// La fuente real es `tablaDePosiciones(registrosOtros, filaPropia)` —
// pura, ya exportada por `core/temporada.js`, y los dos campos que sí se
// actualizan cada fecha. Se deriva acá, en vivo, en vez de leer el campo
// muerto. Cero motor: es la misma función que `systems/temporada.js` ya
// usa para armar el texto del log de cada fecha.
// Fase V, V0b: `reconciliar` solo tiene sentido si `lista` sobrevive entre
// renders — antes `container.replaceChildren()` la destruía cada vez junto
// con todo lo demás. El esqueleto (título + `lista`) se arma una sola vez y
// se cachea en el propio nodo; de ahí en más solo se actualiza texto y filas.
function crearFilaTabla(item) {
  const filaEl = document.createElement('div');
  filaEl.className = ['tabla-fila',
    item.propia && 'tabla-fila--propia',
    item.esCortePlayoffs && 'tabla-fila--corte-playoffs',
    item.esCorteInternacional && 'tabla-fila--corte-internacional'
  ].filter(Boolean).join(' ');

  const puestoEl = document.createElement('span');
  puestoEl.className = 'tabla-puesto';
  puestoEl.textContent = String(item.puesto);

  const orgEl = document.createElement('span');
  orgEl.className = 'tabla-org';
  orgEl.append(crearOrgChip(item.org, { size: 16 }), document.createTextNode(item.org));

  const recordEl = document.createElement('span');
  recordEl.className = 'tabla-record';
  recordEl.textContent = `${item.ganados}-${item.perdidos}`;

  filaEl.append(puestoEl, orgEl, recordEl);
  return filaEl;
}

// La tabla en vivo del split que se juega.
export function renderTabla(container, state) {
  const { temporada, currentOrg, liga } = state.career;

  if (!temporada.activa) {
    container.hidden = true;
    return;
  }
  const tabla = tablaDePosiciones(temporada.registrosOtros, temporada.filaPropia);
  pintarTabla(container, state, { tabla, orgPropia: currentOrg, ligaId: liga });
}

// La última fila de `registro.porSplit`: el último split que se jugó en una tabla (V3e). Es lo único que dice DE QUÉ split es
// la tabla cerrada que el estado conserva (`career.temporada.tabla`, que el motor rearma recién cuando arranca otro split
// con tabla).
export function ultimoSplitEnTabla(state) {
  const filas = state.career.registro?.porSplit ?? [];
  return filas.length > 0 ? filas[filas.length - 1] : null;
}

// V3e: entre splits (`temporada.activa` es falso) el motor deja la tabla CERRADA del último split jugado en
// `career.temporada.tabla`. Se muestra marcada como final, con el split al que pertenece cuando el registro lo dice: si la
// fila del registro es de otro club, la tabla se muestra sin liga ni año en vez de adivinarlos (regla 15). Sin tabla
// conservada, se oculta (el cuarto cae a `registro.porSplit`, ver `cuartos/temporada.js`).
export function renderTablaCerrada(container, state) {
  const { temporada } = state.career;
  if (temporada.activa || !(temporada.tabla?.length > 0)) {
    container.hidden = true;
    return;
  }
  const orgPropia = temporada.filaPropia?.org ?? null;
  const fila = ultimoSplitEnTabla(state);
  const delSplit = fila && fila.org === orgPropia ? fila : null;
  pintarTabla(container, state, { tabla: temporada.tabla, orgPropia, ligaId: delSplit?.liga ?? null, cerrada: delSplit ?? true });
}

function pintarTabla(container, state, { tabla, orgPropia, ligaId, cerrada = false }) {
  const currentOrg = orgPropia;
  const { temporada } = state.career;
  if (tabla.length === 0) {
    container.hidden = true;
    return;
  }

  const ligaObj = state.mundo.ligas.find((l) => l.id === ligaId);
  const clasifican = ligaObj?.formatoPlayoffs?.clasifican ?? null;
  const internacionales = ligaObj?.cuposInternacionales ?? 0;

  container.hidden = false;

  let refs = container.__tablaRefs;
  if (!refs) {
    container.replaceChildren();
    const titulo = document.createElement('div');
    titulo.className = 'panel-contexto-titulo';
    const lista = document.createElement('div');
    lista.className = 'tabla-lista';
    container.append(titulo, lista);
    refs = { titulo, lista, leyenda: null };
    container.__tablaRefs = refs;
  }

  container.classList.toggle('panel-contexto--final', Boolean(cerrada));
  if (cerrada) {
    // "Final · 2032 · split 2": el año y el split salen de la fila del registro; sin ella, solo "Final".
    const donde = typeof cerrada === 'object' ? ` · ${cerrada.anio} · split ${cerrada.split + 1}` : '';
    const circuito = ligaObj ? nombreVisibleDeLiga(ligaObj.id) : (cerrada.tier === 3 ? 'Tier 3' : 'Tabla');
    refs.titulo.textContent = `${circuito} · final${donde}`;
  } else {
    const jornada = temporada.calendario?.[temporada.indice]?.jornada;
    const nombreLiga = ligaObj?.id ?? ligaId;
    refs.titulo.textContent = Number.isFinite(jornada) ? `${nombreVisibleDeLiga(nombreLiga)} · J${jornada}` : (nombreLiga ? nombreVisibleDeLiga(nombreLiga) : 'Tabla');
  }

  const items = tabla.map((fila, indice) => {
    const puesto = indice + 1;
    const esCortePlayoffs = clasifican !== null && puesto === clasifican + 1;
    return {
      ...fila,
      puesto,
      propia: fila.org === currentOrg,
      esCortePlayoffs,
      esCorteInternacional: internacionales > 0 && puesto === internacionales + 1 && !esCortePlayoffs
    };
  });

  reconciliar(
    refs.lista,
    items,
    (item) => item.org,
    crearFilaTabla,
    (nodo, item) => reemplazarEnElLugar(nodo, crearFilaTabla(item))
  );

  const partes = [];
  const miPuesto = items.find((item) => item.propia)?.puesto ?? null;
  if (cerrada && miPuesto !== null) partes.push(`Terminaste ${miPuesto}º de ${items.length}`);
  if (partes.length > 0 || clasifican !== null || internacionales > 0) {
    if (clasifican !== null) partes.push(`Top ${clasifican} → playoffs`);
    if (internacionales > 0) partes.push(`Top ${internacionales} → internacional`);
    if (!refs.leyenda) {
      refs.leyenda = document.createElement('div');
      refs.leyenda.className = 'panel-contexto-leyenda';
      container.appendChild(refs.leyenda);
    }
    refs.leyenda.textContent = partes.join(' · ');
  } else if (refs.leyenda) {
    refs.leyenda.remove();
    refs.leyenda = null;
  }
}
