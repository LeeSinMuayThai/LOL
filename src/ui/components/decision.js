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
// K2d: `probabilidades` (opcional) es la p de ganar con cada opción de un
// draft (`previaDeDecision(...).opciones`): va como una línea más del botón.

// V3a (PLAN.md §V.4, "Anatomía de una parada"): la fila de opción y el encabezado. Lo que de verdad se decide va primero:
//   - el encabezado: título + UNA línea de "qué está en juego" (la primera oración de la descripción) y, detrás de "más",
//     el resto del texto;
//   - cada opción es una FILA: la tecla a la izquierda, el label, la descripción a dos líneas, hasta MAX_CHIPS chips de la
//     previa (los efectos más grandes: `magnitud` alta, media, baja; con empate, el orden del motor) junto al riesgo y la
//     rareza, y la línea de % o de plan. Lo que no entra queda detrás del "más" de la fila (descripción entera y chips
//     restantes): ninguna información se saca, solo se pliega.
// Las clases que lee `src/dev/recorrido.mjs` (`.option-title/-desc/-plan/-previa-kicker/-prob/-riesgo`) siguen siendo las
// mismas; los `.option-btn` siguen siendo hijos directos de `#decisionOptions` (V3b los cuenta así).
const MAX_CHIPS = 3;
// Si la primera oración es más corta que esto, se le suma la siguiente: una línea de dos palabras no dice qué está en juego.
const MIN_LINEA_EN_JUEGO = 60;
const RANGO_MAGNITUD = { alta: 3, media: 2, baja: 1 };
// Primer corte de oración: un punto/!/?/cierre de comillas seguido de espacio y una mayúscula, signo o comilla de apertura.
const FIN_DE_ORACION = /[.!?…]["”»)]?\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡"“«(])/g;

// [linea, resto]: la línea de "qué está en juego" y el resto de la descripción.
export function partirDescripcion(texto) {
  const limpio = String(texto ?? '').trim();
  // La línea termina en la primera oración que alcanza MIN_LINEA_EN_JUEGO (si la primera es corta, se le suma la siguiente).
  // Si ninguna llega, todo el texto es la línea: es corto, y el tope de renglones del CSS lo cuida si no lo es.
  for (const m of limpio.matchAll(FIN_DE_ORACION)) {
    if (m.index + 1 >= MIN_LINEA_EN_JUEGO) {
      return [limpio.slice(0, m.index + 1).trim(), limpio.slice(m.index + m[0].length).trim()];
    }
  }
  return [limpio, ''];
}

// Los MAX_CHIPS efectos de mayor magnitud, en el orden del motor entre los empatados.
export function elegirChips(previa) {
  const indice = previa.map((entrada, i) => ({ entrada, i }));
  indice.sort((a, b) => (RANGO_MAGNITUD[b.entrada.magnitud] ?? 0) - (RANGO_MAGNITUD[a.entrada.magnitud] ?? 0) || a.i - b.i);
  return new Set(indice.slice(0, MAX_CHIPS).map((x) => x.entrada));
}

function crearMas(rotulo) {
  const mas = document.createElement('button');
  mas.type = 'button';
  mas.className = 'decision-mas';
  mas.textContent = 'más';
  mas.setAttribute('aria-expanded', 'false');
  if (rotulo) {
    mas.setAttribute('aria-label', `Ver más: ${rotulo}`);
  }
  return mas;
}

// Un "más" se muestra solo si hay algo plegado: texto cortado por el límite de líneas o chips que no entraron. Se mide con
// el panel a la vista (una parada recién pintada puede no tener tamaño todavía: el ResizeObserver lo reintenta).
function cortado(el) {
  return el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1;
}
function revisarMas(panel) {
  for (const mas of panel.querySelectorAll('.decision-mas[data-que]')) {
    const fila = mas.dataset.que === 'opcion' ? mas.previousElementSibling : null;
    const abierto = mas.getAttribute('aria-expanded') === 'true';
    let hayMas = mas.dataset.plegado === 'si';
    if (!hayMas && !abierto) {
      const desc = fila ? fila.querySelector('.option-desc') : panel.querySelector('.decision-desc-linea');
      hayMas = Boolean(desc && cortado(desc));
    }
    mas.hidden = !(hayMas || abierto);
  }
}
let observador = null;
function vigilar(panel) {
  observador?.disconnect();
  observador = null;
  if (typeof ResizeObserver === 'function') {
    observador = new ResizeObserver(() => revisarMas(panel));
    observador.observe(panel);
  }
  revisarMas(panel);
}

export function renderDecision(elements, decision, onElegir, state, probabilidades = []) {
  const { decisionPanel, decisionTitle, decisionDesc, decisionOptions } = elements;

  const rotulo = rotuloDeDecision(decision, state);
  const peso = pesoDeDecision(decision);

  decisionPanel.dataset.peso = peso;
  decisionPanel.dataset.tabLabel = rotulo.label;
  decisionPanel.style.setProperty('--tab-color', `var(--cat-${rotulo.token})`);

  decisionTitle.textContent = decision.titulo;
  // "Qué está en juego" en una línea; el resto de la descripción, detrás de "más" (que cuelga del propio `#decisionDesc`).
  const [linea, resto] = partirDescripcion(decision.descripcion);
  decisionDesc.textContent = '';
  const spanLinea = document.createElement('span');
  spanLinea.className = 'decision-desc-linea';
  spanLinea.textContent = linea;
  decisionDesc.appendChild(spanLinea);
  const masDesc = crearMas('el contexto de la decisión');
  masDesc.dataset.que = 'desc';
  masDesc.dataset.plegado = resto ? 'si' : 'no';
  masDesc.hidden = !resto;
  decisionDesc.appendChild(masDesc);
  if (resto) {
    const spanResto = document.createElement('span');
    spanResto.className = 'decision-desc-resto';
    spanResto.textContent = resto;
    spanResto.hidden = true;
    decisionDesc.appendChild(spanResto);
  }
  decisionDesc.dataset.abierta = 'no';
  masDesc.addEventListener('click', () => {
    const abrir = masDesc.getAttribute('aria-expanded') !== 'true';
    masDesc.setAttribute('aria-expanded', String(abrir));
    masDesc.textContent = abrir ? 'menos' : 'más';
    decisionDesc.dataset.abierta = abrir ? 'si' : 'no';
    const restoEl = decisionDesc.querySelector('.decision-desc-resto');
    if (restoEl) restoEl.hidden = !abrir;
    revisarMas(decisionPanel);
  });

  decisionOptions.innerHTML = '';
  decision.opciones.forEach((opcion, indice) => {
    const opcionBtn = document.createElement('button');
    opcionBtn.type = 'button';
    opcionBtn.className = 'option-btn';
    // Cada fila ocupa su renglón de la grilla; el "más" de la fila se superpone en el mismo renglón (ver decision.css).
    opcionBtn.style.gridRow = String(indice + 1);
    let plegado = false;

    // El atajo de teclado (T1: shell.js ya escucha 1-4) recién ahora es
    // DESCUBRIBLE — antes funcionaba pero nada en pantalla lo decía.
    if (indice < 4) {
      opcionBtn.dataset.atajo = String(indice + 1);
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
    // "Bootcamp en tu propia pieza" no significa nada. A dos líneas; entera detrás del "más".
    if (opcion.descripcion) {
      const detalle = document.createElement('div');
      detalle.className = 'option-desc';
      detalle.textContent = opcion.descripcion;
      opcionBtn.appendChild(detalle);
    }

    // K6c: en el plan del año del amateur, la opción que propone tu perfil va marcada ("Tu perfil (hambriento) iría por esta").
    // El texto viene del motor (`systems/amateur.js`, `decisionDePlan`); decide el jugador.
    if (opcion.propuesta) {
      opcionBtn.classList.add('option-btn--propuesta');
      const propuesta = document.createElement('div');
      propuesta.className = 'option-propuesta';
      propuesta.textContent = opcion.propuesta;
      opcionBtn.appendChild(propuesta);
    }

    // Fase 12d (PLAN.md §12.3): la consecuencia, antes de elegir. `previa` siempre viene (puede ser `[]` si la opción solo
    // dispara push/momento); `riesgo` siempre viene. V3a: una sola línea de chips (hasta MAX_CHIPS de la previa + el riesgo
    // + la rareza); los chips que no entran se pliegan detrás del "más" de la fila.
    const previaFilas = opcion.previa ?? [];
    if (previaFilas.length > 0 || opcion.riesgo || opcion.rareza) {
      const meta = document.createElement('div');
      meta.className = 'option-previa';
      const principales = elegirChips(previaFilas);
      const ordenadas = [...principales, ...previaFilas.filter((entrada) => !principales.has(entrada))];
      ordenadas.forEach((entrada) => {
        const kicker = document.createElement('span');
        const signo = entrada.signo === '+' ? 'sube' : 'baja';
        kicker.className = `option-previa-kicker option-previa-kicker--${signo} option-previa-kicker--magnitud-${entrada.magnitud}`;
        if (!principales.has(entrada)) {
          kicker.classList.add('option-previa-kicker--extra');
          plegado = true;
        }
        // K6a-A: la fila trae su número armado del motor ("Mecánica ~+4"); sin él, el signo y la etiqueta.
        kicker.textContent = entrada.texto ?? `${entrada.signo} ${entrada.etiqueta}`;
        meta.appendChild(kicker);
      });

      if (opcion.riesgo) {
        const riesgo = document.createElement('span');
        riesgo.className = `option-riesgo option-riesgo--${opcion.riesgo}`;
        // K6a-A: el texto del riesgo lo arma el motor ("puede salir torcido · lo inclina tu mentalidad"), nunca "ruleta".
        riesgo.textContent = opcion.riesgoTexto ?? opcion.riesgo;
        meta.appendChild(riesgo);
      }

      // Fase 12e (PLAN.md §12.4): rareza de las decisiones de mejora. Misma
      // píldora que el riesgo — no un componente nuevo. Solo viene en
      // pretemporada, práctica y `pool_a_cual_le_metes`.
      if (opcion.rareza) {
        const rareza = document.createElement('span');
        rareza.className = `option-rareza option-rareza--${opcion.rareza}`;
        rareza.textContent = opcion.rareza === 'rara' ? 'rara' : 'común';
        meta.appendChild(rareza);
      }
      opcionBtn.appendChild(meta);
    }

    // K2d: la p de ganar con cada opción de un draft.
    const probabilidad = probabilidades?.find((p) => p.id === opcion.id);
    if (probabilidad) {
      const prob = document.createElement('div');
      prob.className = 'option-prob';
      prob.textContent = probabilidad.texto;
      opcionBtn.appendChild(prob);
    }

    // K4c (plan anual): en el cierre de año, el plan de práctica que la opción fija para el año que viene. El texto
    // viene armado del motor (`systems/edadCierre.js` -> `lineaDePlan`): la pantalla no calcula nada.
    if (opcion.plan?.texto) {
      const plan = document.createElement('div');
      plan.className = 'option-plan';
      plan.textContent = opcion.plan.texto;
      opcionBtn.appendChild(plan);
    }

    opcionBtn.addEventListener('click', () => onElegir({ opcionId: opcion.id }));
    decisionOptions.appendChild(opcionBtn);

    // El "más" de la fila va al lado del botón (un botón adentro de otro no es válido ni se alcanza con el teclado). Se
    // muestra solo si hay algo plegado: chips que no entraron o texto cortado (`revisarMas`).
    const mas = crearMas(opcion.label);
    mas.dataset.que = 'opcion';
    mas.dataset.plegado = plegado ? 'si' : 'no';
    mas.hidden = !plegado;
    mas.style.gridRow = String(indice + 1);
    mas.addEventListener('click', () => {
      const abrir = mas.getAttribute('aria-expanded') !== 'true';
      mas.setAttribute('aria-expanded', String(abrir));
      mas.textContent = abrir ? 'menos' : 'más';
      opcionBtn.dataset.abierta = abrir ? 'si' : 'no';
      revisarMas(decisionPanel);
    });
    decisionOptions.appendChild(mas);
  });

  // Se muestran cerradas con su motivo, no desaparecen (decisión de
  // estructura de la fase 12): hoy el catálogo no gatea ninguna opción
  // propia, así que esto queda vacío en la práctica hasta que 12e/13
  // declare la primera — el cable está tendido.
  (decision.opcionesBloqueadas ?? []).forEach((bloqueada, k) => {
    const opcionBtn = document.createElement('button');
    opcionBtn.type = 'button';
    opcionBtn.className = 'option-btn option-btn--bloqueada';
    opcionBtn.disabled = true;
    opcionBtn.style.gridRow = String(decision.opciones.length + k + 1);

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
  vigilar(decisionPanel);
}
