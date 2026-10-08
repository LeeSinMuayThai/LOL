// La tarjeta de cierre de un split (FASE V, V2-B; PLAN.md §V.1 "Una página por split": "al terminar, una tarjeta con el
// resultado y el número que se movió; no frena"). Es un beat sintético al final de la página del relato
// (`renderPagina`, components/feed.js): entra con el último beat del split y usa su espera, sin sumar tiempo (el espejo de
// `simulate.js` no se mueve). Los datos salen de `cierreDeSplit` (ui/core/escena.js); esto solo los pinta.
// `crearLineaSplitAnterior` es la misma información en una línea, para cuando la tarjeta no llegó a verse (INST o
// movimiento reducido): abre la página siguiente.
//
// FASE V (V4): el número de la tarjeta se mueve desde donde estaba (`moverNumero`, ui/core/delta.js; con movimiento reducido
// o en INST aparece ya en su valor final). Si el split cerró un año sin parada del motor, la tarjeta es "Cierre de 2031": suma
// el número del año y el escalón, y es la que el reproductor sostiene un rato (`ESPERA_CIERRE_ANIO_MS`, reproductor.js).
// `crearCartelDePagina` es el encabezado de una línea de cada página (ventana y año), sin beat ni espera.
import { textoDeNumero, textoDeNumeroEn, deltaDeCierre, lineaDeSplitAnterior } from '../core/escena.js';
import { itemsDeGoldenRoad } from '../core/trayectoria.js';
import { moverNumero } from '../core/delta.js';

// Las bandas del nivel con el mismo nombre que la ficha (`LABEL_NIVEL` de components/ficha.js, que no lo exporta).
const LABEL_BANDA_NIVEL = { prospecto: 'Prospecto', titular: 'Competitivo', elite: 'Élite', clase_mundial: 'Clase mundial' };

function bloque(clase, texto) {
  const el = document.createElement('div');
  el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function sentidoDelDelta(delta) {
  if (!delta || delta === '=') return 'igual';
  return delta.startsWith('▲') ? 'sube' : 'baja';
}

function conMayuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// FASE V (V5, PLAN.md §V.6): el seguimiento del Golden Road, en una línea: "Golden Road 2031: ✓ split 1 · ✓ split 2 · ◻ split 3 ·
// ◻ liga · ◻ Mundial". Lo pintan la tarjeta de cierre, el acompañante y la pestaña Carrera con este mismo nodo. El texto
// completo se lee de corrido; cada hecho es un `<span>` con su estado para el color. Solo se llama con un seguimiento vivo.
// Si ya está completo (en el cierre del año del Mundial) lo dice.
export function crearLineaGoldenRoad(seguimiento) {
  const linea = bloque(`gr-linea${seguimiento.completo ? ' gr-linea--completo' : ''}`);
  linea.dataset.goldenRoad = seguimiento.completo ? 'completo' : 'vivo';
  const titulo = document.createElement('span');
  titulo.className = 'gr-linea-titulo';
  titulo.textContent = `Golden Road ${seguimiento.anio}:`;
  linea.append(titulo, document.createTextNode(' '));
  itemsDeGoldenRoad(seguimiento).forEach((item, i) => {
    if (i > 0) linea.appendChild(document.createTextNode(' · '));
    const hecho = document.createElement('span');
    hecho.className = `gr-linea-item gr-linea-item--${item.estado}`;
    hecho.textContent = `${item.marca} ${item.etiqueta}`;
    linea.appendChild(hecho);
  });
  if (seguimiento.completo) {
    const logro = document.createElement('span');
    logro.className = 'gr-linea-logro';
    logro.textContent = '¡Lo lograste!';
    linea.append(document.createTextNode(' '), logro);
  }
  return linea;
}

function crearDeltaEl(delta) {
  const el = document.createElement('span');
  el.className = `cierre-split-delta cierre-split-delta--${sentidoDelDelta(delta)}`;
  el.textContent = delta;
  return el;
}

// El bloque del año: cuánto se movió el número en los tres splits y el escalón. Solo en la tarjeta de "Cierre de …".
function crearBloqueDelAnio(anio) {
  const caja = bloque('cierre-anio');
  const delta = deltaDeCierre(anio.numero);
  if (delta) {
    const fila = bloque('cierre-anio-numero');
    fila.append(document.createTextNode('En el año '), crearDeltaEl(delta));
    caja.appendChild(fila);
  }
  if (anio.escalon) {
    const fila = bloque('cierre-anio-escalon');
    const vas = document.createElement('span');
    vas.className = 'cierre-anio-vas';
    vas.textContent = anio.escalon.vas;
    const falta = document.createElement('span');
    falta.className = 'cierre-anio-falta';
    falta.textContent = anio.escalon.falta;
    fila.append(vas, document.createTextNode(' · '), falta);
    caja.appendChild(fila);
  }
  return caja.childElementCount > 0 ? caja : null;
}

// `animar`: solo la tarjeta recién creada se mueve (la reconciliación de las páginas siguientes reconstruye el nodo sin
// volver a contar el número). Con `animar: false` el número sale ya en su valor final.
export function crearTarjetaCierre(cierre, { animar = false } = {}) {
  const tipo = cierre.resultado?.tipo ?? 'sin-resultado';
  const tarjeta = bloque(`cierre-split cierre-split--${tipo}${cierre.anio ? ' cierre-split--anio' : ''}`);
  tarjeta.dataset.sintetico = 'cierre';

  tarjeta.appendChild(bloque('cierre-split-kicker', cierre.anio ? `Cierre de ${cierre.anio.anio ?? 'año'}` : 'Fin del split'));
  if (cierre.resultado) {
    tarjeta.appendChild(bloque('cierre-split-resultado', cierre.resultado.texto));
  }

  const numero = bloque('cierre-split-numero');
  const valor = document.createElement('span');
  valor.className = 'cierre-split-valor';
  moverNumero(valor, cierre.numero?.antes, cierre.numero?.despues, {
    formato: (n) => conMayuscula(textoDeNumeroEn(cierre.numero, n)),
    animar
  });
  if (!valor.textContent) {
    valor.textContent = conMayuscula(textoDeNumero(cierre.numero));
  }
  numero.appendChild(valor);
  const banda = cierre.numero?.etiqueta === 'nivel' ? LABEL_BANDA_NIVEL[cierre.numero.banda] : null;
  if (banda) {
    const bandaEl = document.createElement('span');
    bandaEl.className = `cierre-split-banda cierre-split-banda--${cierre.numero.banda}`;
    bandaEl.textContent = banda;
    numero.appendChild(bandaEl);
  }
  const delta = deltaDeCierre(cierre.numero);
  if (delta) {
    numero.appendChild(crearDeltaEl(delta));
  }
  tarjeta.appendChild(numero);
  const delAnio = cierre.anio ? crearBloqueDelAnio(cierre.anio) : null;
  if (delAnio) {
    tarjeta.appendChild(delAnio);
  }
  // V5: el Golden Road del año, mientras está vivo (`cierreDeSplit` solo lo trae entonces; una tarjeta guardada de antes de V5
  // no lo trae y sale sin la línea).
  if (cierre.goldenRoad) {
    tarjeta.appendChild(crearLineaGoldenRoad(cierre.goldenRoad));
  }
  return tarjeta;
}

export function crearLineaSplitAnterior(cierre) {
  const linea = bloque('cierre-split-linea', lineaDeSplitAnterior(cierre) ?? '');
  linea.dataset.sintetico = 'anterior';
  return linea;
}

// El cartel de una página (`cartelDePagina`, ui/core/escena.js): "2031 · Temporada regular", o "Arranca 2032 · Pretemporada" en
// el primer split del año. Una línea, sin beat: no suma espera.
export function crearCartelDePagina(cartel) {
  const el = bloque(`cartel-pagina${cartel.nuevoAnio ? ' cartel-pagina--anio' : ''}`, cartel.texto);
  el.dataset.sintetico = 'cartel';
  el.dataset.ventana = cartel.ventana;
  return el;
}
