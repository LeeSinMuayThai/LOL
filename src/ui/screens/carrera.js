import { renderFicha } from '../components/ficha.js';
import { renderFeed } from '../components/feed.js';
import { renderDecision } from '../components/decision.js';
import { renderMercado } from '../components/mercado.js';

// Orquesta la pantalla de carrera: la ficha (siempre visible, en todas las
// pantallas — PLAN.md §8.5) y el feed. La decisión pendiente, si hay una, se
// pinta aparte: index.html decide primero si es un minijuego (que esta fase
// no mueve), una oferta de mercado (fase 9c) o una decisión de opciones
// genérica antes de llamar al renderer que corresponde.
export function renderCarrera(elements, state, modulos) {
  renderFicha(elements.fichaContainer, state, modulos);
  renderFeed(elements.logList, state);
}

export function mostrarDecisionEnPantalla(elements, decision, onElegir) {
  renderDecision(elements, decision, onElegir);
}

export function mostrarMercadoEnPantalla(elements, decision, onElegir, onRepresentante) {
  renderMercado(elements, decision, onElegir, onRepresentante);
}
