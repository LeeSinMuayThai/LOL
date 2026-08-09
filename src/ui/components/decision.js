// La tarjeta de decisión: título, descripción y una opción por botón.
// Extraído de index.html (fase 8, §8.5). La fase 12 la va a enriquecer con
// categoría, rareza y la consecuencia previa (PLAN.md §12.3) — el contrato
// de `decision` ya viene de `systems/events.js` con esa forma, así que este
// componente no cambia cuando eso llegue, solo pinta más campos.
//
// Los minijuegos NO pasan por acá (`decision.presentacion === 'minijuego'`
// los desvía antes de llegar): index.html los sigue montando directo, la
// fase 8 no los mueve (PLAN.md §8.5).
export function renderDecision(elements, decision, onElegir) {
  const { decisionPanel, decisionTitle, decisionDesc, decisionOptions } = elements;

  decisionTitle.textContent = decision.titulo;
  decisionDesc.textContent = decision.descripcion;

  decisionOptions.innerHTML = '';
  for (const opcion of decision.opciones) {
    const opcionBtn = document.createElement('button');
    opcionBtn.type = 'button';
    opcionBtn.className = 'option-btn';

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
  }

  decisionPanel.hidden = false;
}
