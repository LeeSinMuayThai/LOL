import { renderFicha } from '../components/ficha.js';
import { renderFeed, renderLowerThird } from '../components/feed.js';
import { renderDecision } from '../components/decision.js';
import { renderMercado } from '../components/mercado.js';
import { renderTabla } from '../paneles/tabla.js';
import { renderCalendario } from '../paneles/calendario.js';
import { renderPlantilla } from '../paneles/plantilla.js';
import { renderMeta } from '../paneles/meta.js';
import { renderGeneracion } from '../paneles/generacion.js';
import { renderTopMundial } from '../paneles/topMundial.js';

// Orquesta la pantalla de carrera: la ficha (siempre visible, en todas las
// pantallas — PLAN.md §8.5) y el feed. La decisión pendiente, si hay una, se
// pinta aparte: index.html decide primero si es un minijuego (que esta fase
// no mueve), una oferta de mercado (fase 9c) o una decisión de opciones
// genérica antes de llamar al renderer que corresponde.
//
// Devuelve la `ficha` que calculó `renderFicha` (fase V, PLAN.md "V0 — El
// kernel"): `app.js` la necesita para `aplicarEstudio(state, ficha)` sin
// que `ficha.js` tenga que importar `shell.js` para empujársela ella misma.
export function renderCarrera(elements, state, modulos) {
  const ficha = renderFicha(elements.fichaContainer, state, modulos);
  renderFeed(elements.logList, state);
  return ficha;
}

// El riel derecho (fase T5): paneles de contexto, todos con datos que el
// motor ya calcula — cada uno se oculta solo si no tiene nada real que
// mostrar (regla de la fase: "un panel vacío es peor que un panel
// ausente"). Se llama junto a `renderFicha`, no adentro: la ficha vive en
// el riel izquierdo y no depende de esto para nada. El Top 5 mundial (9Wc)
// es el único que se ve siempre: es el norte al que se apunta.
export function renderRielContexto(elements, state, modulos) {
  renderTabla(elements.panelTabla, state);
  renderCalendario(elements.panelCalendario, state);
  renderPlantilla(elements.panelPlantilla, state, modulos);
  renderMeta(elements.panelMeta, state);
  renderGeneracion(elements.panelGeneracion, state, modulos);
  renderTopMundial(elements.panelTopMundial, state, modulos);
}

export { renderLowerThird };

export function mostrarDecisionEnPantalla(elements, decision, onElegir, state, probabilidades) {
  renderDecision(elements, decision, onElegir, state, probabilidades);
}

export function mostrarMercadoEnPantalla(elements, decision, onElegir, onRepresentante, onNegociar, onEsperar) {
  renderMercado(elements, decision, onElegir, onRepresentante, onNegociar, onEsperar);
}
