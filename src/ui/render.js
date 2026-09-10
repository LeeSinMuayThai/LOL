// El orquestador de la UI (fase 8, PLAN.md §8.5): único punto de entrada
// para que index.html no tenga que conocer la carpeta interna de `src/ui/`.
// `DISENO.md` §4.1 pedía esta estructura desde el arranque del proyecto —
// hasta la fase 8 `src/ui/` estaba vacía y los 1.090 renglones de interfaz
// vivían enteros en `index.html` (deuda D7 de PLAN.md).
export { crearPantallaInicio } from './screens/inicio.js';
export { renderCarrera, renderRielContexto, mostrarDecisionEnPantalla, mostrarMercadoEnPantalla, renderLowerThird } from './screens/carrera.js';
export { renderTarjeta } from './screens/tarjeta.js';
export { renderFicha } from './components/ficha.js';
export { renderFeed } from './components/feed.js';
export { renderDecision } from './components/decision.js';
export { renderMercado } from './components/mercado.js';
export { renderTabla } from './paneles/tabla.js';
export { renderCalendario } from './paneles/calendario.js';
export { renderPlantilla } from './paneles/plantilla.js';
export { renderMeta } from './paneles/meta.js';
export { renderGeneracion } from './paneles/generacion.js';
export { crearTarjetaResultado, renderSerieContexto } from './components/serie.js';
