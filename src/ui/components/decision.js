import { pesoDeDecision, rotuloDeDecision } from '../formatoUi.js';

// La tarjeta de decisión: título, descripción y una opción por botón.
// Extraído de index.html (fase 8, §8.5). Fase 12d (PLAN.md §12.3) sumó la
// consecuencia previa (`opcion.previa`/`opcion.riesgo`) y las opciones
// bloqueadas (`decision.opcionesBloqueadas`). Fase 12e (PLAN.md §12.4)
// pinta `opcion.rareza` (`comun` / `rara`) en las decisiones de mejora
// — el contrato ya venía preparado, este componente no se reescribió.
//
// Los minijuegos NO pasan por acá (`decision.presentacion === 'minijuego'`
// los desvía antes de llegar): index.html los sigue montando directo, la
// fase 8 no los mueve (PLAN.md §8.5).
//
// Fase T4: la pestaña (T0b la dejó fija en "Decisión") pasa a reflejar la
// categoría real del evento, y el panel entero cambia de peso según
// `pesoDeDecision` — ver `formatoUi.js` para las dos reglas reales detrás
// (`evento.bisagra` y `franja === 'cierre'`), sin un tercer peso inventado.
export function renderDecision(elements, decision, onElegir, state) {
  const { decisionPanel, decisionTitle, decisionDesc, decisionOptions } = elements;

  const rotulo = rotuloDeDecision(decision, state);
  const peso = pesoDeDecision(decision);

  decisionPanel.dataset.peso = peso;
  decisionPanel.dataset.tabLabel = rotulo.label;
  decisionPanel.style.setProperty('--tab-color', `var(--cat-${rotulo.token})`);

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

    // Fase 12d (PLAN.md §12.3): la consecuencia, antes de elegir. `previa`
    // siempre viene (puede ser `[]` si la opción solo dispara push/momento);
    // `riesgo` siempre viene.
    if (opcion.previa?.length > 0) {
      const previa = document.createElement('div');
      previa.className = 'option-previa';
      opcion.previa.forEach((entrada) => {
        const kicker = document.createElement('span');
        const signo = entrada.signo === '+' ? 'sube' : 'baja';
        kicker.className = `option-previa-kicker option-previa-kicker--${signo} option-previa-kicker--magnitud-${entrada.magnitud}`;
        kicker.textContent = `${entrada.signo} ${entrada.etiqueta}`;
        previa.appendChild(kicker);
      });
      opcionBtn.appendChild(previa);
    }

    if (opcion.riesgo) {
      const riesgo = document.createElement('span');
      riesgo.className = `option-riesgo option-riesgo--${opcion.riesgo}`;
      riesgo.textContent = opcion.riesgo;
      opcionBtn.appendChild(riesgo);
    }

    // Fase 12e (PLAN.md §12.4): rareza de las decisiones de mejora. Misma
    // píldora que el riesgo — no un componente nuevo. Solo viene en
    // pretemporada, práctica y `pool_a_cual_le_metes`.
    if (opcion.rareza) {
      const rareza = document.createElement('span');
      rareza.className = `option-rareza option-rareza--${opcion.rareza}`;
      rareza.textContent = opcion.rareza === 'rara' ? 'rara' : 'común';
      opcionBtn.appendChild(rareza);
    }

    opcionBtn.addEventListener('click', () => onElegir({ opcionId: opcion.id }));
    decisionOptions.appendChild(opcionBtn);
  });

  // Se muestran cerradas con su motivo, no desaparecen (decisión de
  // estructura de la fase 12): hoy el catálogo no gatea ninguna opción
  // propia, así que esto queda vacío en la práctica hasta que 12e/13
  // declare la primera — el cable está tendido.
  (decision.opcionesBloqueadas ?? []).forEach((bloqueada) => {
    const opcionBtn = document.createElement('button');
    opcionBtn.type = 'button';
    opcionBtn.className = 'option-btn option-btn--bloqueada';
    opcionBtn.disabled = true;

    const titulo = document.createElement('div');
    titulo.className = 'option-title';
    titulo.textContent = bloqueada.label;
    opcionBtn.appendChild(titulo);

    if (bloqueada.gate) {
      const gate = document.createElement('div');
      gate.className = 'option-gate';
      gate.textContent = bloqueada.gate;
      opcionBtn.appendChild(gate);
    }

    decisionOptions.appendChild(opcionBtn);
  });

  decisionPanel.hidden = false;
}
