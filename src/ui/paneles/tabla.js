import { tablaDePosiciones } from '../../core/temporada.js';

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
  container.replaceChildren();

  const titulo = document.createElement('div');
  titulo.className = 'panel-contexto-titulo';
  titulo.textContent = 'Tabla';
  container.appendChild(titulo);

  const lista = document.createElement('div');
  lista.className = 'tabla-lista';

  tabla.forEach((fila, indice) => {
    const puesto = indice + 1;
    const esCortePlayoffs = clasifican !== null && puesto === clasifican + 1;
    const esCorteInternacional = internacionales > 0 && puesto === internacionales + 1 && !esCortePlayoffs;

    const filaEl = document.createElement('div');
    filaEl.className = ['tabla-fila',
      fila.org === currentOrg && 'tabla-fila--propia',
      esCortePlayoffs && 'tabla-fila--corte-playoffs',
      esCorteInternacional && 'tabla-fila--corte-internacional'
    ].filter(Boolean).join(' ');

    const puestoEl = document.createElement('span');
    puestoEl.className = 'tabla-puesto';
    puestoEl.textContent = String(puesto);

    const orgEl = document.createElement('span');
    orgEl.className = 'tabla-org';
    orgEl.textContent = fila.org;

    const recordEl = document.createElement('span');
    recordEl.className = 'tabla-record';
    recordEl.textContent = `${fila.ganados}-${fila.perdidos}`;

    filaEl.append(puestoEl, orgEl, recordEl);
    lista.appendChild(filaEl);
  });

  container.appendChild(lista);

  if (clasifican !== null || internacionales > 0) {
    const leyenda = document.createElement('div');
    leyenda.className = 'panel-contexto-leyenda';
    const partes = [];
    if (clasifican !== null) partes.push(`Top ${clasifican} → playoffs`);
    if (internacionales > 0) partes.push(`Top ${internacionales} → internacional`);
    leyenda.textContent = partes.join(' · ');
    container.appendChild(leyenda);
  }
}
