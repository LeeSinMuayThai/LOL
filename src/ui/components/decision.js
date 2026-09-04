import { familiaDeCategoria, pesoDeDecision } from '../formatoUi.js';

// La tarjeta de decisión: título, descripción y una opción por botón.
// Extraído de index.html (fase 8, §8.5). La fase 12 la va a enriquecer con
// rareza y la consecuencia previa (PLAN.md §12.3) — el contrato de
// `decision` ya viene de `systems/events.js` con esa forma, así que este
// componente no cambia cuando eso llegue, solo pinta más campos.
//
// Los minijuegos NO pasan por acá (`decision.presentacion === 'minijuego'`
// los desvía antes de llegar): index.html los sigue montando directo, la
// fase 8 no los mueve (PLAN.md §8.5).
//
// Fase T4: la pestaña (T0b la dejó fija en "Decisión") pasa a reflejar la
// categoría real del evento, y el panel entero cambia de peso según
// `pesoDeDecision` — ver `formatoUi.js` para las dos reglas reales detrás
// (`evento.bisagra` y `franja === 'cierre'`), sin un tercer peso inventado.
export function renderDecision(elements, decision, onElegir) {
  const { decisionPanel, decisionTitle, decisionDesc, decisionOptions } = elements;

  const categoria = decision.datos?.evento?.category ?? null;
  const familia = familiaDeCategoria(categoria);
  const peso = pesoDeDecision(decision);

  decisionPanel.dataset.peso = peso;
  decisionPanel.dataset.tabLabel = peso === 'cierre' ? 'Fin de año' : familia.label;
  decisionPanel.style.setProperty('--tab-color', `var(--cat-${familia.token})`);

  decisionTitle.textContent = decision.titulo;
  decisionDesc.textContent = decision.descripcion;

  decisionOptions.innerHTML = '';
  decision.opciones.forEach((opcion, indice) => {
    const opcionBtn = document.createElement('button');
    opcionBtn.type = 'button';
    opcionBtn.className = 'option-btn';

    // El atajo de teclado (T1: shell.js ya escucha 1-4) recién ahora es
    // DESCUBRIBLE — antes funcionaba pero nada en pantalla lo decía.
    if (indice < 4) {
      const atajo = document.createElement('span');
      atajo.className = 'option-atajo';
      atajo.textContent = String(indice + 1);
      atajo.setAttribute('aria-hidden', 'true');
      opcionBtn.appendChild(atajo);
    }

    const titulo = document.createElement('div');
    titulo.className = 'option-title';
    titulo.textContent = opcion.label;
    opcionBtn.appendChild(titulo);

    // El texto de la opción es la mitad de la decisión: sin él, elegir
    // "Bootcamp en tu propia pieza" no significa nada.
    if (opcion.descripcion) {
      const detalle = document.createElement('div');
      detalle.className = 'option-desc';
      detalle.textContent = opcion.descripcion;
      opcionBtn.appendChild(detalle);
    }

    opcionBtn.addEventListener('click', () => onElegir({ opcionId: opcion.id }));
    decisionOptions.appendChild(opcionBtn);
  });

  decisionPanel.hidden = false;
}
