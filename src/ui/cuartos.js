// Los cuartos (FASE V, V2-C; PLAN.md §V.4 y regla 5 de §V.3: "lo demás, a un toque"). Vos · Temporada · Equipo ·
// Mundo · Carrera · Crónica viven en un `<dialog id="cuarto">` abierto con `showModal()`: el foco queda atrapado adentro,
// el fondo inerte y Esc (nativo) lo cierra. Cada cuarto se pinta SOLO al abrirse y leyendo la `vista` (lo que la
// pantalla ya contó), nunca el estado del motor: abrir uno no adelanta nada. Con un cuarto abierto el relato se pausa
// (`reproductor.pausar`) y al cerrarlo sigue; el foco vuelve a la parada (`escena.enfocar`), que sigue siendo la misma.
//
// Las pestañas del diálogo son copias de los botones de la barra de la franja (`#cuartosBarra`, declarada en
// `index.html`): una sola fuente para el nombre y la letra marcada. Las letras las maneja `teclado.js`, que hace clic en
// esos mismos botones. Los contenidos son stubs que llaman a los renderers de hoy (`src/ui/cuartos/*.js`); su forma
// final es de V3e (y Carrera, de V5).
import { pausar, reanudar } from './reproductor.js';
import * as vos from './cuartos/vos.js';
import * as temporada from './cuartos/temporada.js';
import * as equipo from './cuartos/equipo.js';
import * as mundo from './cuartos/mundo.js';
import * as carrera from './cuartos/carrera.js';
import * as cronica from './cuartos/cronica.js';
import * as ayuda from './cuartos/ayuda.js';
import { PIEZAS_SIN_CUARTOS } from './core/escena.js';

const PINTORES = { vos, temporada, equipo, mundo, carrera, cronica, ayuda };
export const TITULOS_DE_CUARTOS = {
  vos: 'Vos', temporada: 'Temporada', equipo: 'Equipo', mundo: 'Mundo', carrera: 'Carrera', cronica: 'Crónica',
  ayuda: 'Teclas'
};

// `dialog`: `#cuarto`. `barra`: `#cuartosBarra` (en la franja). `cuerpo`: `#cuartoCuerpo`. `titulo`: `#cuartoTitulo`.
// `botonAyuda`: el `?` de la franja. `escena`: el director (`ui/escena.js`). `vista`: el store de lo ya mostrado.
// `contexto`: `{ ui, modulos }`, lo que necesitan los renderers de hoy.
export function crearCuartos({ dialog, barra, cuerpo, titulo, botonAyuda, escena, vista, contexto }) {
  const pestanas = dialog.querySelector('.cuarto-pestanas');
  for (const boton of barra.querySelectorAll('[data-cuarto]')) {
    const pestana = boton.cloneNode(true);
    pestana.setAttribute('role', 'tab');
    pestana.setAttribute('aria-selected', 'false');
    pestana.setAttribute('aria-controls', cuerpo.id);
    pestanas.appendChild(pestana);
  }

  let abierto = null;

  function sePuedeAbrir(id) {
    const pieza = escena.pieza();
    if (pieza === 'minijuego') return false;
    if (id === 'ayuda') return true;
    return !PIEZAS_SIN_CUARTOS.includes(pieza) && Boolean(vista.leer());
  }

  function pintar(id) {
    abierto = id;
    dialog.dataset.cuarto = id;
    titulo.textContent = TITULOS_DE_CUARTOS[id] ?? '';
    for (const pestana of pestanas.querySelectorAll('[data-cuarto]')) {
      pestana.setAttribute('aria-selected', String(pestana.dataset.cuarto === id));
    }
    cuerpo.replaceChildren();
    cuerpo.scrollTop = 0;
    try {
      PINTORES[id].pintar(cuerpo, vista.leer(), contexto);
    } catch (error) {
      console.error(`No se pudo pintar el cuarto ${id}:`, error);
    }
  }

  function enfocarPestana() {
    const destino = pestanas.querySelector('[aria-selected="true"]') ?? dialog.querySelector('.cuarto-cerrar');
    destino?.focus({ preventScroll: true });
  }

  // Abre el cuarto `id`, o cambia de pestaña si ya hay uno abierto. Devuelve si quedó abierto.
  function abrir(id) {
    if (!PINTORES[id] || !sePuedeAbrir(id)) return false;
    pintar(id);
    if (!dialog.open) {
      dialog.showModal();
      pausar();
    }
    enfocarPestana();
    return true;
  }

  function cerrar() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('close', () => {
    abierto = null;
    delete dialog.dataset.cuarto;
    cuerpo.replaceChildren();
    reanudar();
    // El foco vuelve a la parada. Sin parada (el relato), se suelta el botón que lo abrió: si no, Espacio lo reabría en
    // vez de pasar una línea.
    if (!escena.enfocar() && document.activeElement?.closest?.('#cuartosBarra, .franja-controles')) {
      document.activeElement.blur();
    }
  });
  // Un toque en el velo (fuera del contenido) cierra, como Esc.
  dialog.addEventListener('click', (evento) => {
    if (evento.target === dialog) cerrar();
  });
  barra.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-cuarto]');
    if (boton) abrir(boton.dataset.cuarto);
  });
  pestanas.addEventListener('click', (evento) => {
    const pestana = evento.target.closest('[data-cuarto]');
    if (pestana && dialog.open) {
      pintar(pestana.dataset.cuarto);
      enfocarPestana();
    }
  });
  dialog.querySelector('.cuarto-cerrar')?.addEventListener('click', cerrar);
  botonAyuda?.addEventListener('click', () => abrir('ayuda'));

  return { abrir, cerrar, abierto: () => abierto };
}
