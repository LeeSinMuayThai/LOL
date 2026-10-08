// La tarjeta de cierre de un split (FASE V, V2-B; PLAN.md §V.1 "Una página por split": "al terminar, una tarjeta con el
// resultado y el número que se movió; no frena"). Es un beat sintético al final de la página del relato
// (`renderPagina`, components/feed.js): entra con el último beat del split y usa su espera, sin sumar tiempo (el espejo de
// `simulate.js` no se mueve). Los datos salen de `cierreDeSplit` (ui/core/escena.js); esto solo los pinta.
// `crearLineaSplitAnterior` es la misma información en una línea, para cuando la tarjeta no llegó a verse (INST o
// movimiento reducido): abre la página siguiente.
import { textoDeNumero, deltaDeCierre, lineaDeSplitAnterior } from '../core/escena.js';
import { itemsDeGoldenRoad } from '../core/trayectoria.js';

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

export function crearTarjetaCierre(cierre) {
  const tipo = cierre.resultado?.tipo ?? 'sin-resultado';
  const tarjeta = bloque(`cierre-split cierre-split--${tipo}`);
  tarjeta.dataset.sintetico = 'cierre';

  tarjeta.appendChild(bloque('cierre-split-kicker', 'Fin del split'));
  if (cierre.resultado) {
    tarjeta.appendChild(bloque('cierre-split-resultado', cierre.resultado.texto));
  }

  const numero = bloque('cierre-split-numero');
  const valor = document.createElement('span');
  valor.className = 'cierre-split-valor';
  const texto = textoDeNumero(cierre.numero);
  valor.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
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
    const deltaEl = document.createElement('span');
    deltaEl.className = `cierre-split-delta cierre-split-delta--${sentidoDelDelta(delta)}`;
    deltaEl.textContent = delta;
    numero.appendChild(deltaEl);
  }
  tarjeta.appendChild(numero);
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
