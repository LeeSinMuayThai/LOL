import { plata, faltan as faltanTexto } from '../../core/formato.js';
import { crearOrgChip } from './orgChip.js';
import { reconciliar, reemplazarEnElLugar, olvidarContenedor } from '../core/reconciliar.js';
import { nombreVisibleDeLiga, numeroDeJerseyPorDefecto } from '../formatoUi.js';
import { leerNumeroJersey, guardarNumeroJersey } from '../almacenamiento.js';
import { crearBeats } from '../fx/beats.js';
import { glifoRol } from '../fx/iconos.js';
import { escudo, iniciales } from '../fx/logos.js';
import { aplicarTono, tonoOrg } from '../fx/tono.js';
import { quieto, svg } from '../fx/util.js';
import { etiquetaRol } from '../../data/roles.js';

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
function sueldoEl(clase, valor) {
  const el = document.createElement('div');
  el.className = clase;
  el.dataset.valor = String(valor);
  el.textContent = `${plata(valor)}/año`;
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
  card.dataset.oferta = oferta.id;

  const header = document.createElement('div');
  header.className = 'mercado-card-header mk-membrete';
  const org = document.createElement('span');
  org.className = 'mercado-card-org';
  org.append(crearOrgChip(oferta.org, { size: 24 }), document.createTextNode(oferta.org));
  const tag = document.createElement('span');
  tag.className = 'mercado-card-tag';
  tag.textContent = ETIQUETAS_TAG[oferta.tag] ?? oferta.tag;
  header.append(org, tag);
  card.appendChild(header);
  const sello = document.createElement('div');
  sello.className = 'mk-sello';
  sello.textContent = ETIQUETAS_TAG[oferta.tag] ?? oferta.tag;
  card.appendChild(sello);

  card.appendChild(sueldoEl('mercado-card-salario', oferta.salarioAnualUSD));

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
  card.dataset.oferta = opcion.id;

  const header = document.createElement('div');
  header.className = 'mercado-card-header mk-membrete';
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
    card.appendChild(sueldoEl('mercado-card-salario', opcion.salarioAnualUSD));
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

const VENTANA_DIAS = 14;
const VENTANA_MS = 5600;
const ROLES_PLANTEL = ['top', 'jungla', 'mid', 'adc', 'support'];
const POS_LINEA = {
  top: [18, 16],
  jungla: [25, 44],
  mid: [50, 47],
  adc: [70, 89],
  support: [87, 67]
};

function abortar(panel) {
  panel?._u2b?.abort?.();
  if (panel) panel._u2b = null;
}

function diaDeOferta(oferta, opciones) {
  if (oferta.tag === 'bombazo') return VENTANA_DIAS;
  const resto = opciones.filter((o) => o.tag !== 'bombazo');
  const orden = [...resto].sort((a, b) => (Number(b.tier) || 0) - (Number(a.tier) || 0) || (Number(a.salarioAnualUSD) || 0) - (Number(b.salarioAnualUSD) || 0));
  const i = Math.max(0, orden.findIndex((o) => o.id === oferta.id));
  if (orden.length <= 1) return 1;
  return 1 + Math.round(i * 12 / (orden.length - 1));
}

export function renderMercado(elements, decision, onElegir, onRepresentante, onNegociar, onEsperar, jugador = {}) {
  const {
    mercadoPanel, mercadoTitle, mercadoDesc, mercadoVos, mercadoGrid, mercadoMundo,
    mercadoRepresentante, mercadoEsperar
  } = elements;

  abortar(mercadoPanel);
  mercadoPanel.querySelector(':scope > .mk-rito')?.remove();
  mercadoGrid.hidden = false;

  mercadoTitle.textContent = decision.titulo;
  mercadoDesc.textContent = decision.descripcion;

  const esTraspaso = decision.datos.motivo === 'traspaso';
  const elegir = esTraspaso
    ? onElegir
    : (respuesta) => empezarFirma(elements, decision, respuesta, onElegir, jugador);

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
    delete mercadoGrid.dataset.llegaron;
  }
  const construirCard = esTraspaso
    ? (oferta, previo) => construirTarjetaTraspaso(oferta, elegir, previo)
    : (oferta, previo) => construirTarjeta(oferta, elegir, onNegociar, previo);
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
  mercadoGrid.classList.add('mk-pila');
  prepararLlegada(elements, decision, esTraspaso);
}

function prepararLlegada(elements, decision, esTraspaso) {
  const { mercadoPanel, mercadoGrid, mercadoDesc } = elements;
  const timers = [];
  let muerto = false;
  const opciones = decision.opciones ?? [];
  const ya = esTraspaso || quieto() || mercadoGrid.dataset.llegaron === '1';
  [...mercadoGrid.children].forEach((card, i) => {
    const oferta = opciones[i];
    if (!oferta) return;
    const dia = diaDeOferta(oferta, opciones);
    card.style.setProperty('--mk-i', String(i));
    card.style.zIndex = String(dia);
    card.addEventListener('pointerenter', () => card.classList.add('mk-frente'));
    card.addEventListener('pointerleave', () => card.classList.remove('mk-frente'));
    card.addEventListener('focusin', () => card.classList.add('mk-frente'));
    const sello = card.querySelector('.mk-sello');
    if (ya) {
      sello?.classList.add('mk-ya');
      return;
    }
    const espera = (dia - 1) * (VENTANA_MS / VENTANA_DIAS);
    timers.push(setTimeout(() => {
      sello?.classList.add('mk-ya');
      if (mercadoDesc) mercadoDesc.dataset.dia = String(dia);
    }, espera));
  });
  if (ya && mercadoDesc) mercadoDesc.dataset.dia = String(VENTANA_DIAS);
  const alEspacio = (e) => {
    if (e.code !== 'Space' && e.key !== ' ') return;
    const activo = document.activeElement;
    if (activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    revelarSellos();
  };
  function revelarSellos() {
    for (const t of timers) clearTimeout(t);
    for (const sello of mercadoGrid.querySelectorAll('.mk-sello')) sello.classList.add('mk-ya');
    mercadoGrid.dataset.llegaron = '1';
    if (mercadoDesc) mercadoDesc.dataset.dia = String(VENTANA_DIAS);
  }
  if (!ya) {
    timers.push(setTimeout(revelarSellos, VENTANA_MS));
  } else {
    mercadoGrid.dataset.llegaron = '1';
  }
  document.addEventListener('keydown', alEspacio);
  mercadoPanel._u2b = {
    abort() {
      if (muerto) return;
      muerto = true;
      for (const t of timers) clearTimeout(t);
      document.removeEventListener('keydown', alEspacio);
    }
  };
}

function empezarFirma(elements, decision, respuesta, onElegir, jugador) {
  const { mercadoPanel, mercadoGrid, mercadoRepresentante, mercadoEsperar } = elements;
  const sesion = mercadoPanel._u2b;
  sesion?.abort?.();
  const oferta = decision.opciones.find((o) => o.id === respuesta.opcionId);
  const carta = mercadoGrid.querySelector(`[data-oferta="${CSS.escape(String(respuesta.opcionId))}"]`) ?? mercadoGrid.querySelector('.mercado-card');
  if (mercadoRepresentante) mercadoRepresentante.hidden = true;
  if (mercadoEsperar) mercadoEsperar.hidden = true;
  carta?.classList.add('mk-aprieta', 'mk-frente');
  const firma = svgFirma(jugador.handle);
  carta?.appendChild(firma);
  const trazo = firma.querySelector('.mk-firma-trazo');
  let largo = 0;
  try { largo = trazo?.getTotalLength?.() ?? 0; } catch { largo = 0; }
  if (trazo && largo > 0) {
    trazo.style.strokeDasharray = String(largo);
    trazo.style.strokeDashoffset = quieto() ? '0' : String(largo);
  }
  const beats = crearBeats({ duracion: 1500, asentarse: 1500 });
  if (trazo && !quieto() && largo > 0) {
    beats.waapi(trazo.animate(
      [{ strokeDashoffset: largo }, { strokeDashoffset: 0 }],
      { duration: 1100, fill: 'forwards', easing: 'ease-out' }
    ));
  }
  let seguido = false;
  const soltar = () => document.removeEventListener('keydown', alEspacio);
  const aJersey = () => {
    if (seguido) return;
    seguido = true;
    soltar();
    beats.saltar();
    mostrarJersey(elements, oferta, respuesta, onElegir, jugador);
  };
  const aLinea = () => {
    if (seguido) return;
    seguido = true;
    soltar();
    mostrarLinea(elements, oferta, jugador, () => mostrarJersey(elements, oferta, respuesta, onElegir, jugador));
  };
  const alEspacio = (e) => {
    if (e.code !== 'Space' && e.key !== ' ') return;
    const activo = document.activeElement;
    if (activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    aJersey();
  };
  document.addEventListener('keydown', alEspacio);
  mercadoPanel._u2b = {
    abort() {
      soltar();
      beats.destruir?.();
    }
  };
  beats.iniciar();
  if (quieto()) {
    aJersey();
    return;
  }
  beats.esperar(1400).then(() => {
    if (!seguido) aLinea();
  });
}

function mostrarLinea(elements, oferta, jugador, alCaer) {
  const { mercadoPanel, mercadoGrid } = elements;
  mercadoGrid.hidden = true;
  const previo = mercadoPanel.querySelector(':scope > .mk-rito');
  previo?.remove();
  const rito = document.createElement('div');
  rito.className = 'mk-rito';
  rito.appendChild(mapaDeLineas(jugador.rol));
  mercadoPanel.appendChild(rito);
  const slot = rito.querySelector('.mk-slot--tuya');
  if (quieto() || !slot) {
    alCaer();
    return;
  }
  const anim = slot.animate(
    [{ transform: 'translate(-50%, -180%)' }, { transform: 'translate(-50%, -50%)' }],
    { duration: 700, fill: 'forwards', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
  );
  anim.finished.then(alCaer, alCaer);
}

function mostrarJersey(elements, oferta, respuesta, onElegir, jugador) {
  const { mercadoPanel } = elements;
  const rito = mercadoPanel.querySelector(':scope > .mk-rito') ?? document.createElement('div');
  if (!rito.isConnected) {
    rito.className = 'mk-rito';
    mercadoPanel.appendChild(rito);
  }
  const org = oferta?.org ?? respuesta.opcionId;
  const guardado = leerNumeroJersey();
  const dorsal = guardado ?? numeroDeJerseyPorDefecto(jugador.handle, jugador.seed);
  let respondido = false;
  const cerrar = () => {
    if (respondido) return;
    const n = Number(input.value);
    const numero = Number.isInteger(n) && n >= 1 && n <= 99 ? n : dorsal;
    respondido = true;
    document.removeEventListener('keydown', alEspacio);
    guardarNumeroJersey(numero);
    onElegir({ opcionId: respuesta.opcionId });
  };
  const jersey = jerseyDe(org, jugador.handle, dorsal);
  const input = jersey.querySelector('input');
  const listo = jersey.querySelector('button');
  listo.addEventListener('click', cerrar);
  const alEspacio = (e) => {
    if (e.code !== 'Space' && e.key !== ' ') return;
    if (document.activeElement === input) return;
    e.preventDefault();
    cerrar();
  };
  document.addEventListener('keydown', alEspacio);
  mercadoPanel._u2b = { abort() { document.removeEventListener('keydown', alEspacio); } };
  rito.replaceChildren(jersey);
  if (quieto()) queueMicrotask(cerrar);
}

function svgFirma(handle) {
  const nombre = String(handle ?? '').trim() || 'Firma';
  return svg('svg', { class: 'mk-firma', viewBox: '0 0 640 160', 'aria-hidden': 'true' }, [
    svg('text', { class: 'mk-firma-nombre', x: '24', y: '78' }, document.createTextNode(nombre)),
    svg('path', { class: 'mk-firma-trazo', d: 'M14 128 C 140 112, 300 140, 420 120 S 600 96, 628 112', fill: 'none' })
  ]);
}

function mapaDeLineas(rol) {
  const mapa = document.createElement('div');
  mapa.className = 'mk-plantel';
  mapa.appendChild(svg('svg', { class: 'mk-mapa', viewBox: '0 0 100 100', 'aria-hidden': 'true' }, [
    svg('rect', { class: 'mk-mapa-piso', x: '6', y: '6', width: '88', height: '88' }),
    svg('path', { class: 'mk-mapa-linea', d: 'M18 18 H82 V82', fill: 'none' }),
    svg('path', { class: 'mk-mapa-linea', d: 'M18 82 H82 V18', fill: 'none' }),
    svg('path', { class: 'mk-mapa-linea', d: 'M20 80 L80 20', fill: 'none' }),
    svg('path', { class: 'mk-mapa-rio', d: 'M10 58 C 32 54, 42 40, 60 36 S 86 22, 92 12', fill: 'none' })
  ]));
  for (const id of ROLES_PLANTEL) {
    const [x, y] = POS_LINEA[id];
    const slot = document.createElement('div');
    slot.className = 'mk-slot' + (id === rol ? ' mk-slot--tuya' : '');
    slot.style.left = `${x}%`;
    slot.style.top = `${y}%`;
    if (id === rol) {
      const glifo = glifoRol(rol, 'mk-glifo');
      slot.append(glifo, span('mk-slot-rol', etiquetaRol(rol)));
    } else {
      slot.append(span('mk-slot-rol', etiquetaRol(id)), span('mk-slot-anuncio', 'por anunciar'));
    }
    mapa.appendChild(slot);
  }
  return mapa;
}

function jerseyDe(org, handle, numero) {
  const raiz = document.createElement('div');
  raiz.className = 'mk-jersey';
  aplicarTono(raiz, tonoOrg(org));
  const dibujo = svg('svg', { class: 'mk-jersey-svg', viewBox: '0 0 200 240', role: 'img', 'aria-label': `Jersey de ${org}` }, [
    svg('path', { class: 'mk-tela', d: 'M40 36 L70 20 H130 L160 36 L184 78 L156 92 L150 220 H50 L44 92 L16 78 Z' }),
    svg('path', { class: 'mk-pliegue', d: 'M100 42 C 92 96, 108 150, 100 208', fill: 'none' }),
    svg('path', { class: 'mk-pliegue', d: 'M72 50 C 80 110, 74 160, 66 208', fill: 'none' }),
    svg('path', { class: 'mk-pliegue', d: 'M128 50 C 120 110, 126 160, 134 208', fill: 'none' }),
    svg('path', { class: 'mk-cuello', d: 'M78 28 H122 L114 48 H86 Z' })
  ]);
  const esc = document.createElement('div');
  esc.className = 'mk-escudo';
  esc.appendChild(escudo(iniciales(org)));
  const nombre = document.createElement('div');
  nombre.className = 'mk-handle';
  nombre.textContent = String(handle ?? '');
  const input = document.createElement('input');
  input.className = 'mk-dorsal';
  input.inputMode = 'numeric';
  input.maxLength = 2;
  input.value = String(numero);
  input.setAttribute('aria-label', 'Número de jersey');
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 2);
  });
  const listo = document.createElement('button');
  listo.type = 'button';
  listo.className = 'mk-listo';
  listo.textContent = 'Listo';
  raiz.append(dibujo, esc, nombre, input, listo);
  return raiz;
}
