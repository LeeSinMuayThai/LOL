// Transitorio (P2): el renderer viejo de la decisión se borró (la decisión de siempre son las cartas,
// `decision/cartas.js`). Queda solo esta reexportación porque `transmisionComun.js` (de la rama del stream, que esta
// rama no toca) importa `partirDescripcion` desde acá. Al integrar: apuntar ese import a `./decision/comun.js` y
// borrar este archivo.
export { partirDescripcion, formaDeDecision } from './decision/comun.js';
