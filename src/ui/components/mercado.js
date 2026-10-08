import { plata, faltan as faltanTexto } from '../../core/formato.js';
import { crearOrgChip } from './orgChip.js';
import { countUp } from './countUp.js';
import { reconciliar, reemplazarEnElLugar, olvidarContenedor } from '../core/reconciliar.js';
import { nombreVisibleDeLiga } from '../formatoUi.js';

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
//
// FASE V, V3c (PLAN.md §V.4, "anatomía de una parada"): lo primero que se ve es lo que se decide. Las ofertas son FILAS
// comparables (los mismos campos, en el mismo orden, en todas: organización y tipo, sueldo, liga y años, plantel, jerarquía),
// con "Firmar" como acción primaria; lo que ayuda a entender una oferta pero no a elegir entre ofertas (qué pesan tus
// llamadas, el arraigo, por qué te quieren) y la negociación (secundaria) quedan en el "más" de esa oferta. "Vos en el
// mercado" son dos líneas. El mercado del mundo vive en el acompañante (≥ 1180 px) o detrás de un desplegable.

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

function span(clase, texto) {
  const el = document.createElement('span');
  el.className = clase;
  el.textContent = texto;
  return el;
}

function boton(clase, texto, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = clase;
  b.textContent = texto;
  b.addEventListener('click', onClick);
  return b;
}

// K5c-M: dónde está el plantel por fuerza dentro de su liga, en palabras. Lee `oferta.plantelEnLiga` tal cual llega del
// motor (`core/demanda.js:plantelEnLiga`: puesto, de cuántos y la banda); no calcula nada. `null` si la oferta no lo trae.
export function lineaDePlantelDeOferta(oferta) {
  const plantel = oferta.plantelEnLiga;
  if (!plantel) {
    return null;
  }
  const liga = nombreVisibleDeLiga(plantel.liga);
  switch (plantel.banda) {
    case 'primero':
      return `El plantel más fuerte de ${liga}`;
    case 'arriba':
      return `Plantel: ${plantel.puesto}.º de ${plantel.de} en ${liga}`;
    case 'abajo':
      return `Plantel: de los de abajo en ${liga}`;
    default:
      return `Plantel: mitad de tabla en ${liga}`;
  }
}

// K6a-U: "Te falta 1 punto para Ídolo" (el verbo concuerda con el número). Solo la renovación trae `progresoHito`.
export function lineaDeHitoDeOferta(oferta) {
  if (!oferta.progresoHito) {
    return null;
  }
  const { faltan, hacia } = oferta.progresoHito;
  return `${faltanTexto(faltan, 'punto', 'puntos', 'Te')} para ${hacia}`;
}

// K6a-U (regla de proceso 12): el motor arma POR QUÉ el club te ficha (`oferta.motivoDemanda`, de
// `core/demanda.js:asientoAbierto`) y ninguna pantalla lo mostraba. Se dice tal cual viene; sin motivo, sin línea.
export function lineaDeMotivoDeOferta(oferta) {
  return oferta.motivoDemanda ? `Por qué te quieren: ${oferta.motivoDemanda}.` : null;
}

// V3c: el sueldo de una oferta. La primera vez que aparece se pinta quieto, con el número final (regla 1 de §V.3: en una
// parada nada más se anima; y retomar compara el mismo texto sin esperar un conteo). Solo cuando el número CAMBIA —se pidió
// más— sube (o baja) desde el que estaba: la regla 3, "el delta se ve". `desde` es el valor anterior, o `null`.
function sueldoEl(clase, valor, desde) {
  const el = document.createElement('div');
  el.className = clase;
  el.dataset.valor = String(valor);
  const formato = (n) => `${plata(n)}/año`;
  if (Number.isFinite(desde) && desde !== valor) {
    countUp(el, desde, valor, { format: formato });
  } else {
    el.textContent = formato(valor);
  }
  return el;
}

function ligaYAnios(liga, anios) {
  return `${nombreVisibleDeLiga(liga)} · ${anios} año${anios === 1 ? '' : 's'}`;
}

// Tu jerarquía en el vestuario de ese equipo (la barra de la ficha), con la banda que le corresponde entre paréntesis (Rookie,
// Titular, Referente, Franquicia). `desde` es la de hoy; `hasta`, donde la proyecta el motor al cerrar el primer split allá
// (D39), y la banda es la de `hasta`. Si no cambia, es solo la de hoy.
function jerarquiaTexto(pj) {
  if (pj.desde === pj.hasta) {
    return `Jerarquía en el equipo: ${pj.hasta} (${pj.etiqueta})`;
  }
  return `Jerarquía en el equipo: ${pj.desde} ${FLECHAS[pj.flecha] ?? '→'} ${pj.hasta} al cerrar el primer split (${pj.etiqueta})`;
}

// El "más" de una oferta (V3c): lo que ayuda a entender la oferta pero no a elegir entre ofertas de un vistazo —qué pesan
// tus llamadas con esa jerarquía, el arraigo que perdés y el que ganás, por qué te quieren— y la negociación (pedir más,
// pedir cláusula, con su riesgo). Nada se pierde: queda a un toque. `abierto` mantiene el desplegable como estaba cuando la
// tarjeta se rehace (una ronda de negociación cambia el sueldo; no tiene que cerrarte lo que estabas leyendo).
function construirMas(filas, negociacion, abierto) {
  const det = document.createElement('details');
  det.className = 'mercado-card-mas';
  det.open = abierto;
  const sum = document.createElement('summary');
  sum.textContent = negociacion ? 'más · arraigo y negociar' : 'más · arraigo';
  det.appendChild(sum);
  for (const f of filas) {
    det.appendChild(f);
  }
  if (negociacion) {
    det.appendChild(negociacion);
  }
  return det;
}

function construirTarjeta(oferta, onElegir, onNegociar, previo = {}) {
  const card = document.createElement('div');
  card.className = `mercado-card mercado-card--${oferta.tag}`;

  const header = document.createElement('div');
  header.className = 'mercado-card-header';
  const org = document.createElement('span');
  org.className = 'mercado-card-org';
  org.append(crearOrgChip(oferta.org, { size: 24 }), document.createTextNode(oferta.org));
  const tag = document.createElement('span');
  tag.className = 'mercado-card-tag';
  tag.textContent = ETIQUETAS_TAG[oferta.tag] ?? oferta.tag;
  header.append(org, tag);
  card.appendChild(header);

  card.appendChild(sueldoEl('mercado-card-salario', oferta.salarioAnualUSD, previo.salario));

  // Los mismos campos, en el mismo orden y en las mismas dos líneas, en todas las ofertas: (1) liga y años y dónde queda el
  // plantel; (2) tu jerarquía allá, lo que falta para el hito (una renovación) y el estado de la negociación.
  const datos = document.createElement('div');
  datos.className = 'mercado-card-datos';
  const linea1 = document.createElement('div');
  linea1.className = 'mercado-card-linea';
  linea1.appendChild(span('mercado-card-liga', ligaYAnios(oferta.liga, oferta.anios)));
  const lineaPlantel = lineaDePlantelDeOferta(oferta);
  if (lineaPlantel) {
    linea1.appendChild(span('mercado-card-plantel', lineaPlantel));
  }
  const linea2 = document.createElement('div');
  linea2.className = 'mercado-card-linea';
  linea2.appendChild(span('mercado-card-jerarquia', jerarquiaTexto(oferta.proyeccionJerarquia)));
  const lineaHito = lineaDeHitoDeOferta(oferta);
  if (lineaHito) {
    linea2.appendChild(span('mercado-card-hito', lineaHito));
  }
  const neg = oferta.negociacion ?? { escalones: 0, clausula: false };
  if (neg.escalones > 0) {
    linea2.appendChild(span('mercado-card-neg', `Pediste más ${neg.escalones}×`));
  }
  if (neg.clausula) {
    linea2.appendChild(span('mercado-card-neg', 'Con cláusula de salida'));
  }
  datos.append(linea1, linea2);
  card.appendChild(datos);

  // "Firmar" es la acción primaria y el PRIMER botón de la tarjeta (`paradas/mercado.js` le pone el atajo y el número).
  const acciones = document.createElement('div');
  acciones.className = 'mercado-card-acciones';
  acciones.appendChild(boton('mercado-card-btn mercado-card-btn--firmar', 'Firmar', () => onElegir({ opcionId: oferta.id })));
  card.appendChild(acciones);

  // Negociar (secundario): pedir más y pedir cláusula, dentro del "más".
  const info = oferta.negociacionInfo;
  const puedePedirMas = info && neg.escalones < info.escalonesMax;
  let negociacion = null;
  if (puedePedirMas || !neg.clausula) {
    negociacion = document.createElement('div');
    negociacion.className = 'mercado-card-negociar';
    if (puedePedirMas) {
      const pm = boton('mercado-card-btn mercado-card-btn--sec', 'Pedir más', () => onNegociar({ negociar: 'pedirMas', opcionId: oferta.id }));
      pm.title = info.riesgoTexto ?? '';
      negociacion.appendChild(pm);
    }
    if (!neg.clausula) {
      negociacion.appendChild(boton('mercado-card-btn mercado-card-btn--sec', 'Pedir cláusula', () => onNegociar({ negociar: 'clausula', opcionId: oferta.id })));
    }
    if (puedePedirMas && info.riesgoTexto) {
      negociacion.appendChild(fila('mercado-card-riesgo-neg', info.riesgoTexto));
    }
  }

  const filas = [fila('mercado-card-picks', oferta.proyeccionPicks)];
  if (oferta.riesgo) {
    filas.push(fila('mercado-card-riesgo', oferta.riesgo));
  }
  if (oferta.costeArraigo.pierde > 0) {
    filas.push(fila('mercado-card-arraigo', oferta.costeArraigo.etiqueta));
  }
  filas.push(fila('mercado-card-arraigo', oferta.arraigoInicial.etiqueta));
  const lineaMotivo = lineaDeMotivoDeOferta(oferta);
  if (lineaMotivo) {
    filas.push(fila('mercado-card-motivo', lineaMotivo));
  }
  card.appendChild(construirMas(filas, negociacion, previo.abierto === true));

  return card;
}

// Fase 9Mf: la decisión de traspaso a mitad de contrato (`motivo: 'traspaso'`): aceptar / pedir salir / quedarse. Misma
// fila que una oferta (V3c): el mismo orden de campos, el botón primario a la derecha. La descripción es lo que explica la
// opción: se queda a la vista.
function construirTarjetaTraspaso(opcion, onElegir, previo = {}) {
  const card = document.createElement('div');
  card.className = `mercado-card mercado-card--${opcion.tipo === 'aceptar' ? 'bombazo' : 'lateral'}`;

  const header = document.createElement('div');
  header.className = 'mercado-card-header';
  const org = document.createElement('span');
  org.className = 'mercado-card-org';
  if (opcion.org) {
    org.append(crearOrgChip(opcion.org, { size: 24 }), document.createTextNode(opcion.label));
  } else {
    org.textContent = opcion.label;
  }
  header.appendChild(org);
  card.appendChild(header);

  const conDatos = opcion.tipo !== 'quedarse';
  if (conDatos) {
    card.appendChild(sueldoEl('mercado-card-salario', opcion.salarioAnualUSD, previo.salario));
  }

  const datos = document.createElement('div');
  datos.className = 'mercado-card-datos';
  if (conDatos) {
    const linea = document.createElement('div');
    linea.className = 'mercado-card-linea';
    linea.appendChild(span('mercado-card-liga', ligaYAnios(opcion.liga, opcion.anios)));
    if (opcion.proyeccionJerarquia) {
      linea.appendChild(span('mercado-card-jerarquia', jerarquiaTexto(opcion.proyeccionJerarquia)));
    }
    datos.appendChild(linea);
  }
  datos.appendChild(fila('mercado-card-picks', opcion.descripcion));
  card.appendChild(datos);

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

// Fase 9Mg — bloque 1: "Vos en el mercado". V3c: dos líneas, arriba de las ofertas. Primera: tu valor con su referente (regla
// 13: contra tu sueldo vigente, nunca un número suelto). Segunda: tu contrato y los años que quedan (y, si el representante ya
// te los nombró, quién te sigue sin ofertar). Todo llega en `decision.datos.vos` / `decision.datos.clubesInteresados`.
function construirBloqueVos(vos, interesados) {
  const box = document.createElement('div');
  box.className = 'mercado-vos';

  const valorLinea = document.createElement('div');
  valorLinea.className = 'mercado-vos-valor';
  valorLinea.appendChild(span('mercado-vos-titulo', 'Tu valor'));
  if (vos.valorUSD > 0) {
    // Quieto: es un dato, no un resultado (regla 1 de §V.3).
    valorLinea.appendChild(span('mercado-vos-cifra', `${plata(vos.valorUSD)}/año`));
    let ref;
    if (vos.sobreSueldoPct === null) {
      ref = 'tu valor de mercado hoy';
    } else if (vos.sobreSueldoPct > 0) {
      ref = `${vos.sobreSueldoPct}% por encima de tu sueldo`;
    } else if (vos.sobreSueldoPct < 0) {
      ref = `${Math.abs(vos.sobreSueldoPct)}% por debajo de tu sueldo`;
    } else {
      ref = 'en línea con tu sueldo';
    }
    valorLinea.appendChild(span('mercado-vos-ref', ref));
  } else {
    valorLinea.appendChild(span('mercado-vos-ref', 'Todavía no tenés valor de mercado.'));
  }
  box.appendChild(valorLinea);

  if (vos.contrato) {
    const c = vos.contrato;
    const restante = c.aniosRestantes <= 0
      ? 'vence esta pretemporada'
      : (c.aniosRestantes === 1 ? '1 año restante' : `${c.aniosRestantes} años restantes`);
    const clausula = c.clausula === 'salida' ? ' · con cláusula de salida' : '';
    const contratoEl = document.createElement('div');
    contratoEl.className = 'mercado-vos-contrato';
    contratoEl.append(
      crearOrgChip(c.org, { size: 18 }),
      document.createTextNode(
        `${c.org}${c.liga ? ` · ${nombreVisibleDeLiga(c.liga)}` : ''} · ${plata(c.salarioUSD)}/año · ${restante}${clausula}`
      )
    );
    box.appendChild(contratoEl);
  } else {
    box.appendChild(fila('mercado-vos-contrato', 'Sos agente libre: no tenés contrato.'));
  }

  if (interesados && interesados.length > 0) {
    const miran = document.createElement('div');
    miran.className = 'mercado-vos-miran';
    miran.appendChild(span('mercado-vos-kicker', 'Te siguen sin ofertar'));
    for (const i of interesados) {
      const chip = document.createElement('span');
      chip.className = 'mercado-chip-org';
      chip.append(crearOrgChip(i.org, { size: 16 }), document.createTextNode(i.org));
      miran.appendChild(chip);
    }
    box.appendChild(miran);
  }

  return box;
}

// Fase 9Mg — bloque 3: "El mercado del mundo". Los traspasos que se cerraron este offseason (9Mc) y, debajo, los asientos
// abiertos en tu rol que no llegaron a oferta — juntos explican por qué te llegó lo que te llegó. Los asientos que el
// representante ya nombró en el bloque 1 ("te siguen") no se repiten acá. V3c: a ≥ 1180 px vive en el acompañante (que lo
// pinta con `desplegable: false`) y no se repite en el escenario (`mercado.css` oculta `#mercadoMundo`); debajo de 1180 va
// detrás de un desplegable. Devuelve si hay algo que mostrar.
export function renderMundo(contenedor, traspasos, asientos, yaEnBloque1, { desplegable = false } = {}) {
  const asientosNuevos = asientos.filter((a) => !yaEnBloque1.has(a.org));
  contenedor.replaceChildren();
  if (traspasos.length === 0 && asientosNuevos.length === 0) {
    contenedor.hidden = true;
    return false;
  }
  contenedor.hidden = false;

  const cuerpo = desplegable ? document.createElement('details') : contenedor;
  if (desplegable) {
    cuerpo.className = 'mercado-mundo-det';
    const n = traspasos.length;
    const sum = document.createElement('summary');
    sum.className = 'mercado-mundo-titulo';
    sum.textContent = n > 0
      ? `El mercado del mundo · ${n} fichaje${n === 1 ? '' : 's'} cerrado${n === 1 ? '' : 's'}`
      : 'El mercado del mundo';
    cuerpo.appendChild(sum);
  } else {
    cuerpo.appendChild(fila('mercado-mundo-titulo', 'El mercado del mundo'));
  }

  if (traspasos.length > 0) {
    const n = traspasos.length;
    cuerpo.appendChild(fila('mercado-mundo-sub',
      `${n} fichaje${n === 1 ? '' : 's'} cerrado${n === 1 ? '' : 's'} este offseason`));
    for (const t of traspasos) {
      const item = document.createElement('div');
      item.className = 'mercado-mundo-item';
      item.append(crearOrgChip(t.org, { size: 16 }), document.createTextNode(t.motivo));
      cuerpo.appendChild(item);
    }
  }
  if (asientosNuevos.length > 0) {
    cuerpo.appendChild(fila('mercado-mundo-sub', 'Asientos abiertos en tu puesto que no llegaron a oferta'));
    for (const a of asientosNuevos) {
      const item = document.createElement('div');
      item.className = 'mercado-mundo-item';
      item.append(crearOrgChip(a.org, { size: 16 }), document.createTextNode(`${a.org} · ${nombreVisibleDeLiga(a.liga)}`));
      cuerpo.appendChild(item);
    }
  }
  if (desplegable) {
    contenedor.appendChild(cuerpo);
  }
  return true;
}

// Lo que una tarjeta ya mostrada tiene que conservar cuando se rehace (una ronda de negociación): si el "más" estaba abierto
// y el sueldo de donde sube.
function previoDe(nodo) {
  const salario = Number(nodo.querySelector('.mercado-card-salario')?.dataset.valor);
  return {
    abierto: nodo.querySelector('.mercado-card-mas')?.open === true,
    salario: Number.isFinite(salario) ? salario : null
  };
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

  // Bloque 2: las ofertas. Fase V, V0b: `reconciliar` en vez de `innerHTML = ''` — la clave es `oferta.id`, la misma que
  // ya se usa para resolver la decisión (`opcionId`), así que una ronda de negociación (`neg.escalones`/`neg.clausula`
  // cambian, el id no) actualiza la tarjeta existente en vez de destruirla y rehacerla. V3c: la tarjeta que se rehace
  // conserva su "más" abierto y el sueldo del que sube; un mercado NUEVO (otra lista de ofertas) arranca de cero.
  const lista = decision.opciones.map((o) => o.id).join('|');
  if (mercadoGrid.dataset.lista !== lista) {
    olvidarContenedor(mercadoGrid);
    mercadoGrid.replaceChildren();
    mercadoGrid.dataset.lista = lista;
  }
  const construirCard = esTraspaso
    ? (oferta, previo) => construirTarjetaTraspaso(oferta, onElegir, previo)
    : (oferta, previo) => construirTarjeta(oferta, onElegir, onNegociar, previo);
  reconciliar(
    mercadoGrid,
    decision.opciones,
    (oferta) => oferta.id,
    (oferta) => construirCard(oferta),
    (nodo, oferta) => reemplazarEnElLugar(nodo, construirCard(oferta, previoDe(nodo)))
  );

  // Bloque 3: el mercado del mundo (detrás de un desplegable; a ≥ 1180 px lo oculta el CSS y lo pinta el acompañante). Los
  // clubes que el bloque 1 ya nombró ("te siguen") no se repiten en "asientos abiertos".
  if (mercadoMundo) {
    const yaEnBloque1 = new Set((decision.datos.clubesInteresados ?? []).map((i) => i.org));
    renderMundo(
      mercadoMundo, decision.datos.traspasosMundo ?? [], decision.datos.asientosAbiertos ?? [], yaEnBloque1,
      { desplegable: true }
    );
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
