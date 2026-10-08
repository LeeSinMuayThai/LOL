// La parada genérica (FASE V, V2-B): el envoltorio de familia sobre el renderer de hoy (`components/decision.js`, que es
// de V3a y no se edita acá). Pinta igual que antes de V2-B y después marca lo que pide el contrato de las familias
// (cabecera de `src/ui/escena.js`): `data-foco` en el título y `data-atajo` en cada opción con su número a la vista.
import { marcarFoco, marcarAtajo } from '../escena.js';

// `contenedor`: el panel `#decision`. `ctx`: ver el contrato.
export function mostrar(contenedor, decision, ctx) {
  const { estado, ui, responder, pintarPrevia, lowerThird, elementos } = ctx;
  const previa = pintarPrevia(decision, estado);
  ui.mostrarDecisionEnPantalla(elementos.decision, decision, responder, estado, previa?.opciones);
  lowerThird('decision', decision);
  marcarFoco(elementos.decision.decisionTitle);
  // El número que el renderer dibuja en el botón (`.option-atajo`, las cuatro primeras) es el atajo: el que ves es el que
  // aprieta.
  for (const boton of elementos.decision.decisionOptions.querySelectorAll(':scope > .option-btn')) {
    const numero = boton.querySelector('.option-atajo')?.textContent;
    if (numero) marcarAtajo(boton, numero);
  }
  return contenedor;
}

// El acompañante de la familia (§V.4): lo llena V2-C. Hoy no hay acompañante.
export function acompanante() {
  return null;
}
