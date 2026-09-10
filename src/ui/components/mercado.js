import { plata } from '../../core/formato.js';
import { crearOrgChip } from './orgChip.js';

// La pantalla de ofertas (fase 9c, PLAN.md §9.5-9.6): "la trampa del equipo
// grande visible" hecha tarjeta. Cada campo que se pinta acá ya viene resuelto
// de `systems/mercado.js` — este componente no calcula nada, solo lo muestra
// (regla de proceso 2: la fórmula no se reescribe ni se retunea, solo se
// expone). `proyeccionJerarquia` en particular tiene que leerse tal cual
// llega: es el mismo número que `roster.js` va a asignar si se acepta.
//
// Fase 9Me (§9M.6): negociar, no aceptar. Cada tarjeta suma acciones —firmar,
// pedir más, pedir cláusula— y abajo hay un "esperar" que no firma nada. El
// representante pasó de rebarajar a informar: `clubesInteresados`.
//
// Fase 9Mg (§9M.8): la pantalla de tres bloques. (1) Vos en el mercado —valor
// con su referente, el contrato, los años que quedan, quién te mira—; (2) las
// ofertas + negociación; (3) el mercado del mundo —traspasos cerrados +
// asientos abiertos en tu rol que no llegaron a oferta—. Todo llega resuelto en
// `decision.datos`; este componente sigue sin calcular nada.

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
  org.append(crearOrgChip(oferta.org, { size: 28 }), document.createTextNode(oferta.org));
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

// Fase 9Mf: la decisión de traspaso a mitad de contrato (`motivo: 'traspaso'`).
// Mismo panel `mercado`, tarjetas más chatas: aceptar / pedir salir / quedarse.
// El bloque de tres columnas sigue siendo 9Mg; esto cumple regla 12 para la
// decisión nueva sin adelantar esa pantalla.
function construirTarjetaTraspaso(opcion, onElegir) {
  const card = document.createElement('div');
  card.className = `mercado-card mercado-card--${opcion.tipo === 'aceptar' ? 'bombazo' : 'lateral'}`;

  const header = document.createElement('div');
  header.className = 'mercado-card-header';
  const org = document.createElement('span');
  org.className = 'mercado-card-org';
  org.textContent = opcion.label;
  header.appendChild(org);
  card.appendChild(header);

  if (opcion.tipo !== 'quedarse') {
    card.appendChild(fila('mercado-card-liga', `${opcion.liga} · ${opcion.anios} año${opcion.anios === 1 ? '' : 's'}`));
    card.appendChild(fila('mercado-card-salario', `${plata(opcion.salarioAnualUSD)}/año`));
    const pj = opcion.proyeccionJerarquia;
    if (pj) {
      card.appendChild(fila(
        'mercado-card-jerarquia',
        `Jerarquía: ${pj.desde} ${FLECHAS[pj.flecha] ?? '→'} ${pj.hasta} — ${pj.etiqueta}`
      ));
    }
  }

  card.appendChild(fila('mercado-card-picks', opcion.descripcion));

  const acciones = document.createElement('div');
  acciones.className = 'mercado-card-acciones';
  acciones.appendChild(boton(
    `mercado-card-btn${opcion.tipo === 'quedarse' ? '' : ' mercado-card-btn--firmar'}`,
    'Elegir',
    () => onElegir({ opcionId: opcion.id })
  ));
  card.appendChild(acciones);

  return card;
}

// Fase 9Mg — bloque 1: "Vos en el mercado". El valor con su referente (regla
// 13: contra tu sueldo vigente, nunca un número suelto), el contrato y los años
// que quedan, y quién te mira sin haber ofertado. Todo llega en
// `decision.datos.vos` / `decision.datos.clubesInteresados`.
function construirBloqueVos(vos, interesados) {
  const box = document.createElement('div');
  box.className = 'mercado-vos';
  box.appendChild(fila('mercado-vos-titulo', 'Vos en el mercado'));

  const valorLinea = document.createElement('div');
  valorLinea.className = 'mercado-vos-valor';
  if (vos.valorUSD > 0) {
    const cifra = document.createElement('span');
    cifra.className = 'mercado-vos-cifra';
    cifra.textContent = `${plata(vos.valorUSD)}/año`;
    const ref = document.createElement('span');
    ref.className = 'mercado-vos-ref';
    if (vos.sobreSueldoPct === null) {
      ref.textContent = 'tu valor de mercado hoy';
    } else if (vos.sobreSueldoPct > 0) {
      ref.textContent = `${vos.sobreSueldoPct}% por encima de tu sueldo`;
    } else if (vos.sobreSueldoPct < 0) {
      ref.textContent = `${Math.abs(vos.sobreSueldoPct)}% por debajo de tu sueldo`;
    } else {
      ref.textContent = 'en línea con tu sueldo';
    }
    valorLinea.append(cifra, ref);
  } else {
    const ref = document.createElement('span');
    ref.className = 'mercado-vos-ref';
    ref.textContent = 'Todavía no tenés valor de mercado.';
    valorLinea.appendChild(ref);
  }
  box.appendChild(valorLinea);

  if (vos.contrato) {
    const c = vos.contrato;
    const restante = c.aniosRestantes <= 0
      ? 'vence esta pretemporada'
      : (c.aniosRestantes === 1 ? '1 año restante' : `${c.aniosRestantes} años restantes`);
    const clausula = c.clausula === 'salida' ? ' · con cláusula de salida' : '';
    box.appendChild(fila(
      'mercado-vos-contrato',
      `Contrato: ${c.org}${c.liga ? ` · ${c.liga}` : ''} · ${plata(c.salarioUSD)}/año · ${restante}${clausula}`
    ));
  } else {
    box.appendChild(fila('mercado-vos-contrato', 'Sos agente libre: no tenés contrato.'));
  }

  if (interesados && interesados.length > 0) {
    box.appendChild(fila(
      'mercado-vos-miran',
      `Te siguen sin ofertar: ${interesados.map((i) => i.org).join(', ')}`
    ));
  }

  return box;
}

// Fase 9Mg — bloque 3: "El mercado del mundo". Los traspasos que se cerraron
// este offseason (9Mc) y, debajo, los asientos abiertos en tu rol que no
// llegaron a oferta — juntos explican por qué te llegó lo que te llegó. Los
// asientos que el representante ya nombró en el bloque 1 ("te siguen") no se
// repiten acá.
function renderMundo(contenedor, traspasos, asientos, yaEnBloque1) {
  const asientosNuevos = asientos.filter((a) => !yaEnBloque1.has(a.org));
  contenedor.replaceChildren();
  if (traspasos.length === 0 && asientosNuevos.length === 0) {
    contenedor.hidden = true;
    return;
  }
  contenedor.hidden = false;
  contenedor.appendChild(fila('mercado-mundo-titulo', 'El mercado del mundo'));

  if (traspasos.length > 0) {
    const n = traspasos.length;
    contenedor.appendChild(fila('mercado-mundo-sub',
      `${n} fichaje${n === 1 ? '' : 's'} cerrado${n === 1 ? '' : 's'} este offseason`));
    for (const t of traspasos) {
      contenedor.appendChild(fila('mercado-mundo-item', t.motivo));
    }
  }
  if (asientosNuevos.length > 0) {
    contenedor.appendChild(fila('mercado-mundo-sub', 'Asientos abiertos en tu puesto que no llegaron a oferta'));
    for (const a of asientosNuevos) {
      contenedor.appendChild(fila('mercado-mundo-item', `${a.org} · ${a.liga}`));
    }
  }
}

export function renderMercado(elements, decision, onElegir, onRepresentante, onNegociar, onEsperar) {
  const {
    mercadoPanel, mercadoTitle, mercadoDesc, mercadoVos, mercadoGrid, mercadoMundo,
    mercadoRepresentante, mercadoEsperar
  } = elements;

  mercadoTitle.textContent = decision.titulo;
  mercadoDesc.textContent = decision.descripcion;

  const esTraspaso = decision.datos.motivo === 'traspaso';

  // Bloque 1: vos en el mercado.
  if (mercadoVos) {
    mercadoVos.replaceChildren();
    if (decision.datos.vos) {
      mercadoVos.appendChild(construirBloqueVos(decision.datos.vos, decision.datos.clubesInteresados ?? []));
      mercadoVos.hidden = false;
    } else {
      mercadoVos.hidden = true;
    }
  }

  // Bloque 2: las ofertas.
  mercadoGrid.innerHTML = '';
  for (const oferta of decision.opciones) {
    mercadoGrid.appendChild(esTraspaso
      ? construirTarjetaTraspaso(oferta, onElegir)
      : construirTarjeta(oferta, onElegir, onNegociar));
  }

  // Bloque 3: el mercado del mundo. Los clubes que el bloque 1 ya nombró
  // ("te siguen") no se repiten en "asientos abiertos".
  if (mercadoMundo) {
    const yaEnBloque1 = new Set((decision.datos.clubesInteresados ?? []).map((i) => i.org));
    renderMundo(mercadoMundo, decision.datos.traspasosMundo ?? [], decision.datos.asientosAbiertos ?? [], yaEnBloque1);
  }

  mercadoRepresentante.hidden = !decision.datos.representanteDisponible;
  mercadoRepresentante.onclick = () => onRepresentante();

  if (mercadoEsperar) {
    // En un traspaso no se "espera": quedarse ES la opción de rechazar.
    mercadoEsperar.hidden = esTraspaso;
    mercadoEsperar.onclick = () => onEsperar();
  }

  mercadoPanel.hidden = false;
}
