// El teclado (FASE V, V2-B; PLAN.md §V.5). Lo importa `shell.js`, que sigue siendo una raíz aparte del controlador: este
// módulo no ve `estado` ni `app.js`, solo el DOM — la pieza activa (`.shell[data-pieza]`, que escribe el director de
// escena), los atajos que ponen las familias de parada (`[data-atajo]`) y, desde V2-C, los cuartos (`dialog[open]`).
//
// Las reglas:
//   - foco en un campo de texto → nada;
//   - Enter o Espacio sobre algo interactivo → su acción NATIVA. Antes `activarPrimario` hacía clic en "Empezar
//     carrera" o en "Nueva carrera" estuviera donde estuviera el foco: con el draft completo, Enter o Espacio sobre
//     "Continuar" arrancaba una carrera nueva y BORRABA la guardada (D86), y Enter sobre "Copiar…" de la tarjeta final
//     volvía al inicio (D87). Se borró;
//   - Espacio con el foco en el body o en un encabezado, durante el relato → saltea un beat;
//   - 1-4 → clic en `[data-atajo=n]` de la pieza activa (decisión, partido o mercado). En el minijuego solo en su fase PREVIA
//     (`data-fase="previa"`: la charla del coach; V es "¡Vamos!", V3d): después es dueño de sus teclas (1-5, Q/W/E/R, A/D, A/S —
//     `components/minijuegos/comun.js`). Si el elemento marcado trae `data-atajo-foco`
//     (el "Firmar" del mercado), la tecla solo le lleva el FOCO — con el scroll mínimo para verlo — y Enter hace el resto;
//   - Esc nunca navega: cierra el desplegable "Avanzado" del inicio y nada más (en la final no hace nada: D87). Con un
//     cuarto abierto, Esc es el nativo del `<dialog>`: lo cierra y el foco vuelve a la parada (V2-C);
//   - V/T/E/M/C/R (V2-C) → abren Vos, Temporada, Equipo, Mundo, Carrera y Crónica (con uno abierto, cambian de pestaña):
//     hacen clic en el botón de la barra de la franja (o en la pestaña del diálogo) que lleva esa letra en
//     `aria-keyshortcuts`. Se apagan en el inicio y en el minijuego (`PIEZAS_SIN_CUARTOS`: los minijuegos son dueños de
//     Q/W/E/R, A/D, A/S y 1-5) y con el foco en un campo de texto; `?` abre la ayuda de teclas (salvo en el minijuego).
import { saltarBeat, velocidadActual } from './reproductor.js';
import { PIEZAS_SIN_CUARTOS } from './core/escena.js';

const shell = document.querySelector('.shell');
const avanzadoDetails = document.querySelector('.avanzado');
const barraDeCuartos = document.getElementById('cuartosBarra');
const dialogoDeCuartos = document.getElementById('cuarto');
const botonAyuda = document.getElementById('ayudaTeclas');
const TECLA_AYUDA = '?';
// La tecla de "¡Vamos!" en la previa de un minijuego (V3d, D94): ningún minijuego la usa.
const TECLA_VAMOS = 'V';

// Las piezas donde 1-4 eligen una opción.
const PIEZAS_CON_ATAJOS = ['decision', 'partido', 'mercado'];
const ATAJOS = ['1', '2', '3', '4'];
const INTERACTIVO = 'button, a[href], input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])';

function piezaActiva() {
  return shell?.dataset.pieza ?? null;
}

function esVisible(el) {
  if (!el) return false;
  if (typeof el.checkVisibility === 'function') return el.checkVisibility();
  return el.offsetParent !== null;
}

function escribiendoEnUnCampo(activo) {
  if (!activo) return false;
  if (activo.isContentEditable) return true;
  if (activo.tagName === 'TEXTAREA' || activo.tagName === 'SELECT') return true;
  // Un <input> de texto (o de número, de búsqueda...). Un checkbox o un radio no "escriben".
  return activo.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range'].includes(activo.type);
}

// ¿El foco está sobre algo que Enter/Espacio activan solos? Un botón que el relato acaba de esconder no cuenta: el
// navegador puede dejarlo como `activeElement` aunque ya no se vea.
function focoEnAlgoInteractivo(activo) {
  if (!activo || activo === document.body || activo === document.documentElement) return false;
  return activo.matches(INTERACTIVO) && esVisible(activo);
}

// El botón que abre el cuarto de esta tecla: en la barra de la franja o, con el diálogo abierto, su pestaña.
function botonDeCuarto(tecla) {
  if (tecla === TECLA_AYUDA) return botonAyuda;
  if (tecla.length !== 1) return null;
  const letra = tecla.toUpperCase();
  const lugar = dialogoDeCuartos?.open ? dialogoDeCuartos.querySelector('.cuarto-pestanas') : barraDeCuartos;
  return lugar?.querySelector(`[aria-keyshortcuts="${CSS.escape(letra)}"]`) ?? null;
}

function atajoDeLaPieza(numero) {
  const candidatos = shell?.querySelectorAll(`.escenario [data-atajo="${numero}"]`) ?? [];
  return [...candidatos].find((boton) => esVisible(boton) && !boton.disabled) ?? null;
}

document.addEventListener('keydown', (evento) => {
  if (evento.defaultPrevented || evento.ctrlKey || evento.metaKey || evento.altKey) return;
  const activo = document.activeElement;
  if (escribiendoEnUnCampo(activo)) return;
  const pieza = piezaActiva();

  // V3d (D94): la fase PREVIA de un minijuego (`data-fase="previa"` en su contenedor, que escribe `paradas/minijuego.js`): 1-n eligen la
  // charla del coach y V es "¡Vamos!". En cuanto arranca el minijuego la fase pasa a `juego`, esto ya no entra y todas las teclas
  // son de él (1-5, Q/W/E/R, A/D, A/S). Va antes de los cuartos: V es también la letra de Vos, que en el minijuego está apagada.
  if (pieza === 'minijuego' && !document.querySelector('dialog[open]')) {
    const previa = shell?.querySelector('.escenario [data-fase="previa"]');
    const tecla = evento.key.length === 1 ? evento.key.toUpperCase() : '';
    if (previa && (ATAJOS.includes(tecla) || tecla === TECLA_VAMOS)) {
      const boton = tecla === TECLA_VAMOS
        ? [...previa.querySelectorAll('[data-vamos]')].find((b) => esVisible(b) && !b.disabled)
        : atajoDeLaPieza(tecla);
      if (boton) {
        evento.preventDefault();
        if (!evento.repeat) boton.click();
      }
      return;
    }
  }
  const botonCuarto = botonDeCuarto(evento.key);
  if (botonCuarto) {
    const apagada = evento.key === TECLA_AYUDA ? pieza === 'minijuego' : PIEZAS_SIN_CUARTOS.includes(pieza);
    if (!apagada && !evento.repeat) {
      evento.preventDefault();
      botonCuarto.click();
    }
    return;
  }
  // Con un cuarto abierto (`<dialog>` con `showModal()`), el diálogo es dueño del resto del teclado (Esc lo cierra solo).
  if (document.querySelector('dialog[open]')) return;

  if (evento.key === ' ' || evento.key === 'Enter') {
    if (focoEnAlgoInteractivo(activo)) return; // su acción nativa
    if (evento.key === ' ' && pieza === 'relato' && velocidadActual() !== 'instantaneo') {
      evento.preventDefault();
      saltarBeat();
    }
    return;
  }

  if (ATAJOS.includes(evento.key)) {
    if (!PIEZAS_CON_ATAJOS.includes(pieza)) return;
    const boton = atajoDeLaPieza(evento.key);
    if (boton) {
      evento.preventDefault();
      if (boton.hasAttribute('data-atajo-foco')) {
        boton.focus({ preventScroll: true });
        boton.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } else {
        boton.click();
      }
    }
    return;
  }

  if (evento.key === 'Escape') {
    if (pieza === 'inicio' && avanzadoDetails?.open) {
      avanzadoDetails.open = false;
    }
  }
});
