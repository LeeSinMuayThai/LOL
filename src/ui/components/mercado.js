import { plata } from '../../core/formato.js';

// La pantalla de ofertas (fase 9c, PLAN.md §9.5-9.6): "la trampa del equipo
// grande visible" hecha tarjeta. Cada campo que se pinta acá ya viene resuelto
// de `systems/mercado.js` — este componente no calcula nada, solo lo muestra
// (regla de proceso 2: la fórmula no se reescribe ni se retunea, solo se
// expone). `proyeccionJerarquia` en particular tiene que leerse tal cual
// llega: es el mismo número que `roster.js` va a asignar si se acepta.

const ETIQUETAS_TAG = {
  renovacion: 'Renovación',
  salto: 'Ascenso',
  lateral: 'Lateral',
  bombazo: 'Bombazo',
  import: 'Import',
  descenso: 'Descenso'
};

const FLECHAS = { sube: '▲', baja: '▼', igual: '→' };

function fila(clase, texto) {
  const div = document.createElement('div');
  div.className = clase;
  div.textContent = texto;
  return div;
}

function construirTarjeta(oferta, onElegir) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = `mercado-card mercado-card--${oferta.tag}`;

  const header = document.createElement('div');
  header.className = 'mercado-card-header';
  const org = document.createElement('span');
  org.className = 'mercado-card-org';
  org.textContent = oferta.org;
  const tag = document.createElement('span');
  tag.className = 'mercado-card-tag';
  tag.textContent = ETIQUETAS_TAG[oferta.tag] ?? oferta.tag;
  header.append(org, tag);
  boton.appendChild(header);

  boton.appendChild(fila('mercado-card-liga', `${oferta.liga} · ${oferta.anios} año${oferta.anios === 1 ? '' : 's'}`));
  boton.appendChild(fila('mercado-card-salario', `${plata(oferta.salarioAnualUSD)}/año`));

  const pj = oferta.proyeccionJerarquia;
  boton.appendChild(fila(
    'mercado-card-jerarquia',
    `Jerarquía: ${pj.desde} ${FLECHAS[pj.flecha] ?? '→'} ${pj.hasta} — ${pj.etiqueta}`
  ));
  boton.appendChild(fila('mercado-card-picks', oferta.proyeccionPicks));

  if (oferta.costeArraigo.pierde > 0) {
    boton.appendChild(fila('mercado-card-arraigo', oferta.costeArraigo.etiqueta));
  }
  boton.appendChild(fila('mercado-card-arraigo', oferta.arraigoInicial.etiqueta));

  if (oferta.progresoHito) {
    const { faltan, hacia } = oferta.progresoHito;
    boton.appendChild(fila('mercado-card-hito', `Te faltan ${faltan} para ${hacia}`));
  }

  if (oferta.riesgo) {
    boton.appendChild(fila('mercado-card-riesgo', oferta.riesgo));
  }

  boton.addEventListener('click', () => onElegir({ opcionId: oferta.id }));
  return boton;
}

// Fase 9Mc: "el mundo siguió sin vos" — los traspasos que movieron el mercado
// esta pretemporada. El bloque completo de tres columnas es 9Mg; esto es la
// línea que hace que la elección no se sienta en el vacío (regla 12).
function renderMundo(contenedor, traspasos) {
  contenedor.innerHTML = '';
  if (!traspasos || traspasos.length === 0) {
    contenedor.hidden = true;
    return;
  }
  contenedor.appendChild(fila('mercado-mundo-titulo', `El mercado se movió: ${traspasos.length} fichaje${traspasos.length === 1 ? '' : 's'} en el mundo`));
  for (const t of traspasos) {
    contenedor.appendChild(fila('mercado-mundo-item', t.motivo));
  }
  contenedor.hidden = false;
}

export function renderMercado(elements, decision, onElegir, onRepresentante) {
  const { mercadoPanel, mercadoTitle, mercadoDesc, mercadoGrid, mercadoMundo, mercadoRepresentante } = elements;

  mercadoTitle.textContent = decision.titulo;
  mercadoDesc.textContent = decision.descripcion;

  mercadoGrid.innerHTML = '';
  for (const oferta of decision.opciones) {
    mercadoGrid.appendChild(construirTarjeta(oferta, onElegir));
  }

  if (mercadoMundo) {
    renderMundo(mercadoMundo, decision.datos.traspasosMundo);
  }

  mercadoRepresentante.hidden = !decision.datos.representanteDisponible;
  mercadoRepresentante.onclick = () => onRepresentante();

  mercadoPanel.hidden = false;
}
