// El mercado (FASE V, V2-B): el envoltorio de familia sobre el renderer de hoy (`components/mercado.js`, de V3c, que no
// se edita acá). Marca `data-foco` en el título y `data-atajo="n"` en el PRIMER botón ("Firmar") de cada oferta: con eso
// 1-4 firman la oferta n (D46: antes el atajo hacía clic en la tarjeta, que no es un botón, y no pasaba nada).
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
    marcarAtajo(oferta.querySelector('button'), i + 1);
  });
  return contenedor;
}

// El acompañante del mercado (§V.4: contrato, valor y el mercado del mundo): lo llena V2-C.
export function acompanante() {
  return null;
}
