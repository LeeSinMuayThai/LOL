// La decisión en la variante `hextech` de la previa (`?dc=hextech`, PLANUI §0.4). El contrato está en la cabecera de
// `decision/comun.js`: las mismas opciones y el mismo retorno que `crearDecision`. Hasta que esté hecha, pinta la de siempre.
import { crearDecision } from '../decision.js';

export function crear(contenedor, decision, opciones) {
  return crearDecision(contenedor, decision, opciones);
}
