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

export function renderTabla(container, state) {
  const { temporada, currentOrg, liga } = state.career;

  if (!temporada.activa) {
    container.hidden = true;
    return;
  }
  const tabla = tablaDePosiciones(temporada.registrosOtros, temporada.filaPropia);
  if (tabla.length === 0) {
    container.hidden = true;
    return;
  }

  const ligaObj = state.mundo.ligas.find((l) => l.id === liga);
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

  const jornada = temporada.calendario?.[temporada.indice]?.jornada;
  const ligaId = ligaObj?.id ?? liga;
  refs.titulo.textContent = Number.isFinite(jornada) ? `${nombreVisibleDeLiga(ligaId)} · J${jornada}` : (ligaId ? nombreVisibleDeLiga(ligaId) : 'Tabla');

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

  if (clasifican !== null || internacionales > 0) {
    const partes = [];
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
