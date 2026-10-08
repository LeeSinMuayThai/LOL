// El orquestador de la UI (fase 8, PLAN.md §8.5): único punto de entrada
// para que index.html no tenga que conocer la carpeta interna de `src/ui/`.
// `DISENO.md` §4.1 pedía esta estructura desde el arranque del proyecto —
// hasta la fase 8 `src/ui/` estaba vacía y los 1.090 renglones de interfaz
// vivían enteros en `index.html` (deuda D7 de PLAN.md).
export { crearPantallaInicio, renderDesafio, renderHistorial } from './screens/inicio.js';
// V2-C: `screens/carrera.js` se fue con los rieles. Las familias de parada (`paradas/decision.js`, `paradas/mercado.js`) y el
// acompañante siguen llamando a estos dos nombres: son los renderers de hoy, sin el envoltorio que tenían.
export { renderDecision as mostrarDecisionEnPantalla } from './components/decision.js';
export { renderMercado as mostrarMercadoEnPantalla } from './components/mercado.js';
export { renderTarjeta } from './screens/tarjeta.js';
export { renderFeed, renderPagina, renderParadaAntes, desdeDeUltimosBeats } from './components/feed.js';
export { olvidarContenedor } from './core/reconciliar.js';
export { renderDecision } from './components/decision.js';
export { renderMercado } from './components/mercado.js';
export { renderTabla } from './paneles/tabla.js';
export { renderCalendario } from './paneles/calendario.js';
export { renderPlantilla } from './paneles/plantilla.js';
export { renderMeta } from './paneles/meta.js';
export { renderGeneracion } from './paneles/generacion.js';
export { renderTopMundial } from './paneles/topMundial.js';
export { crearTarjetaResultado, crearTarjetaResultadoSerie, crearBarraBracket, renderSerieContexto } from './components/serie.js';
export { renderPrevia } from './components/previaPartido.js';
