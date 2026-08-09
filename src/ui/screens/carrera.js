import { renderFicha } from '../components/ficha.js';
import { renderFeed } from '../components/feed.js';
import { renderDecision } from '../components/decision.js';

// Orquesta la pantalla de carrera: la ficha (siempre visible, en todas las
// pantallas — PLAN.md §8.5) y el feed. La decisión pendiente, si hay una, se
// pinta aparte (`mostrarDecisionEnPantalla`): index.html decide primero si
// es un minijuego (que esta fase no mueve) o una decisión de opciones antes
// de llamarla.
export function renderCarrera(elements, state, modulos) {
  renderFicha(elements.fichaContainer, state, modulos);
  renderFeed(elements.logList, state);
}

export function mostrarDecisionEnPantalla(elements, decision, onElegir) {
  renderDecision(elements, decision, onElegir);
}
