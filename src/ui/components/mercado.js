import { plata } from '../../core/formato.js';

// La pantalla de ofertas (fase 9c, PLAN.md §9.5-9.6): "la trampa del equipo
// grande visible" hecha tarjeta. Cada campo que se pinta acá ya viene resuelto
// de `systems/mercado.js` — este componente no calcula nada, solo lo muestra
// (regla de proceso 2: la fórmula no se reescribe ni se retunea, solo se
// expone). `proyeccionJerarquia` en particular tiene que leerse tal cual
// llega: es el mismo número que `roster.js` va a asignar si se acepta.
//
// Fase 9Me (§9M.6): negociar, no aceptar. Cada tarjeta suma acciones —firmar,
// pedir más, pedir cláusula— y abajo hay un "esperar" que no firma nada. El
// representante pasó de rebarajar a informar: `clubesInteresados`. El bloque
// completo de tres columnas es 9Mg.

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

function boton(clase, texto, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = clase;
  b.textContent = texto;
  b.addEventListener('click', onClick);
  return b;
}

function construirTarjeta(oferta, onElegir, onNegociar) {
  const card = document.createElement('div');
  card.className = `mercado-card mercado-card--${oferta.tag}`;

  const header = document.createElement('div');
  header.className = 'mercado-card-header';
  const org = document.createElement('span');
  org.className = 'mercado-card-org';
  org.textContent = oferta.org;
  const tag = document.createElement('span');
  tag.className = 'mercado-card-tag';
  tag.textContent = ETIQUETAS_TAG[oferta.tag] ?? oferta.tag;
  header.append(org, tag);
  card.appendChild(header);

  card.appendChild(fila('mercado-card-liga', `${oferta.liga} · ${oferta.anios} año${oferta.anios === 1 ? '' : 's'}`));
  card.appendChild(fila('mercado-card-salario', `${plata(oferta.salarioAnualUSD)}/año`));

  const pj = oferta.proyeccionJerarquia;
  card.appendChild(fila(
    'mercado-card-jerarquia',
    `Jerarquía: ${pj.desde} ${FLECHAS[pj.flecha] ?? '→'} ${pj.hasta} — ${pj.etiqueta}`
  ));
  card.appendChild(fila('mercado-card-picks', oferta.proyeccionPicks));

  if (oferta.costeArraigo.pierde > 0) {
    card.appendChild(fila('mercado-card-arraigo', oferta.costeArraigo.etiqueta));
  }
  card.appendChild(fila('mercado-card-arraigo', oferta.arraigoInicial.etiqueta));

  if (oferta.progresoHito) {
    const { faltan, hacia } = oferta.progresoHito;
    card.appendChild(fila('mercado-card-hito', `Te faltan ${faltan} para ${hacia}`));
  }

  if (oferta.riesgo) {
    card.appendChild(fila('mercado-card-riesgo', oferta.riesgo));
  }

  // Fase 9Me: estado de la negociación.
  const neg = oferta.negociacion ?? { escalones: 0, clausula: false };
  if (neg.escalones > 0) {
    card.appendChild(fila('mercado-card-neg', `Pediste más ${neg.escalones}×`));
  }
  if (neg.clausula) {
    card.appendChild(fila('mercado-card-neg', 'Con cláusula de salida'));
  }

  const acciones = document.createElement('div');
  acciones.className = 'mercado-card-acciones';
  acciones.appendChild(boton('mercado-card-btn mercado-card-btn--firmar', 'Firmar', () => onElegir({ opcionId: oferta.id })));

  const info = oferta.negociacionInfo;
  const puedePedirMas = info && neg.escalones < info.escalonesMax;
  if (puedePedirMas) {
    const pm = boton('mercado-card-btn', 'Pedir más', () => onNegociar({ negociar: 'pedirMas', opcionId: oferta.id }));
    pm.title = info.riesgoTexto ?? '';
    acciones.appendChild(pm);
  }
  if (!neg.clausula) {
    acciones.appendChild(boton('mercado-card-btn', 'Pedir cláusula', () => onNegociar({ negociar: 'clausula', opcionId: oferta.id })));
  }
  card.appendChild(acciones);

  if (puedePedirMas && info.riesgoTexto) {
    card.appendChild(fila('mercado-card-riesgo-neg', info.riesgoTexto));
  }

  return card;
}

// Fase 9Mc: "el mundo siguió sin vos" — los traspasos que movieron el mercado
// esta pretemporada. El bloque completo de tres columnas es 9Mg; esto es la
// línea que hace que la elección no se sienta en el vacío (regla 12).
function renderLista(contenedor, titulo, items) {
  contenedor.innerHTML = '';
  if (!items || items.length === 0) {
    contenedor.hidden = true;
    return;
  }
  contenedor.appendChild(fila('mercado-mundo-titulo', titulo));
  for (const texto of items) {
    contenedor.appendChild(fila('mercado-mundo-item', texto));
  }
  contenedor.hidden = false;
}

export function renderMercado(elements, decision, onElegir, onRepresentante, onNegociar, onEsperar) {
  const {
    mercadoPanel, mercadoTitle, mercadoDesc, mercadoGrid, mercadoMundo,
    mercadoRepresentante, mercadoEsperar, mercadoInteresados
  } = elements;

  mercadoTitle.textContent = decision.titulo;
  mercadoDesc.textContent = decision.descripcion;

  mercadoGrid.innerHTML = '';
  for (const oferta of decision.opciones) {
    mercadoGrid.appendChild(construirTarjeta(oferta, onElegir, onNegociar));
  }

  if (mercadoInteresados) {
    const interesados = decision.datos.clubesInteresados ?? [];
    renderLista(
      mercadoInteresados,
      'Te siguen (sin ofertar todavía)',
      interesados.map((i) => `${i.org} · ${i.liga}`)
    );
  }

  if (mercadoMundo) {
    const traspasos = decision.datos.traspasosMundo ?? [];
    renderLista(
      mercadoMundo,
      `El mercado se movió: ${traspasos.length} fichaje${traspasos.length === 1 ? '' : 's'} en el mundo`,
      traspasos.map((t) => t.motivo)
    );
  }

  mercadoRepresentante.hidden = !decision.datos.representanteDisponible;
  mercadoRepresentante.onclick = () => onRepresentante();

  if (mercadoEsperar) {
    mercadoEsperar.hidden = false;
    mercadoEsperar.onclick = () => onEsperar();
  }

  mercadoPanel.hidden = false;
}
