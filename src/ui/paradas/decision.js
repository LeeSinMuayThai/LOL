// La parada genérica (FASE V; V2-B el envoltorio, V3a la anatomía): el envoltorio de familia sobre el renderer
// (`components/decision.js`, de V3a). El renderer arma la pestaña, el título, la línea de "qué está en juego" (con su "más") y
// las opciones en filas; acá se marca lo que pide el contrato de las familias (cabecera de `src/ui/escena.js`): `data-foco`
// en el título y `data-atajo` en cada opción con su número a la vista (el renderer ya lo pone; se reafirma desde el número
// que dibuja, por si otra familia pinta sus opciones por otro camino).
import { marcarFoco, marcarAtajo } from '../escena.js';

// `contenedor`: el panel `#decision`. `ctx`: ver el contrato.
export function mostrar(contenedor, decision, ctx) {
  const { estado, ui, responder, pintarPrevia, elementos } = ctx;
  const previa = pintarPrevia(decision, estado);
  ui.mostrarDecisionEnPantalla(elementos.decision, decision, responder, estado, previa?.opciones);
  marcarFoco(elementos.decision.decisionTitle);
  // El número que el renderer dibuja en el botón (`.option-atajo`, las cuatro primeras) es el atajo: el que ves es el que
  // aprieta. Los `.option-btn` son hijos directos de `#decisionOptions` (junto a sus botones "más", que no son opciones).
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
