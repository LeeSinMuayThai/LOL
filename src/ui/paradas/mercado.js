// El mercado (FASE V, V2-B): el envoltorio de familia sobre el renderer de hoy (`components/mercado.js`, de V3c, que no
// se edita acá). Marca `data-foco` en el título y `data-atajo="n"` en el PRIMER botón ("Firmar") de cada oferta, con
// `data-atajo-foco`: 1-4 LLEVAN EL FOCO al "Firmar" de la oferta n y no firman (PLAN.md V3c: "1-n eligen y Enter firma"; un
// contrato de años no se firma con una tecla suelta). Enter sobre el botón con foco firma, por su acción nativa. El número se
// ve en la tarjeta (`.mercado-atajo`), a la izquierda del botón.
import { marcarFoco, marcarAtajo } from '../escena.js';

// Hasta cuántas ofertas tienen atajo (las teclas 1-4 del teclado).
const OFERTAS_CON_ATAJO = 4;

export function mostrar(contenedor, decision, ctx) {
  const { estado, ui, responder, pintarPrevia, lowerThird, elementos } = ctx;
  // Un mercado no tiene previa: esto la deja vacía, como antes de V2-B.
  pintarPrevia(decision, estado);
  ui.mostrarMercadoEnPantalla(
    elementos.mercado, decision, responder,
    () => responder({ representante: true }),
    responder,
    () => responder({ negociar: 'esperar' })
  );
  lowerThird('mercado', decision);
  marcarFoco(elementos.mercado.mercadoTitle);
  [...elementos.mercado.mercadoGrid.children].slice(0, OFERTAS_CON_ATAJO).forEach((oferta, i) => {
    const firmar = oferta.querySelector('button');
    if (!firmar) return;
    marcarAtajo(firmar, i + 1);
    firmar.dataset.atajoFoco = '';
    firmar.setAttribute('aria-keyshortcuts', String(i + 1));
    const numero = document.createElement('span');
    numero.className = 'mercado-atajo';
    numero.setAttribute('aria-hidden', 'true');
    numero.textContent = String(i + 1);
    firmar.before(numero);
  });
  return contenedor;
}

// El acompañante del mercado (§V.4: contrato, valor y el mercado del mundo): lo llena V2-C.
export function acompanante() {
  return null;
}
