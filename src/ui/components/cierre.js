// La tarjeta de cierre de un split (FASE V, V2-B; PLAN.md §V.1 "Una página por split": "al terminar, una tarjeta con el
// resultado y el número que se movió; no frena"). Es un beat sintético al final de la página del relato
// (`renderPagina`, components/feed.js): entra con el último beat del split y usa su espera, sin sumar tiempo (el espejo de
// `simulate.js` no se mueve). Los datos salen de `cierreDeSplit` (ui/core/escena.js); esto solo los pinta.
// `crearLineaSplitAnterior` es la misma información en una línea, para cuando la tarjeta no llegó a verse (INST o
// movimiento reducido): abre la página siguiente.
import { textoDeNumero, deltaDeCierre, lineaDeSplitAnterior } from '../core/escena.js';

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
  return tarjeta;
}

export function crearLineaSplitAnterior(cierre) {
  const linea = bloque('cierre-split-linea', lineaDeSplitAnterior(cierre) ?? '');
  linea.dataset.sintetico = 'anterior';
  return linea;
}
