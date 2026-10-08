// El acompañante (FASE V, V2-C; PLAN.md §V.4 y regla 6 de §V.3: "el escritorio suma un solo panel: el contexto de la
// pieza actual, nunca seis"). Un `<aside id="acompanante">` que solo existe a la vista desde 1180 px (`estilos/shell.css`).
// Qué muestra lo decide `acompananteDe(estado, pieza)` (`ui/core/escena.js`, pura): acá solo se pinta, con un stub por
// `tipo` que llama al renderer de hoy. Su forma final es de cada familia en V3 (`acompanante(contenedor, estado,
// modulos)` del contrato, en la cabecera de `ui/escena.js`).
//
// Se pinta desde la `vista` (lo que la pantalla ya contó) y con la pieza que el director acaba de poner: mientras el
// relato cuenta un split no cambia. El `tipo` queda en `data-acompanante` (vacío = ninguno: el aside no ocupa lugar y el
// escenario se centra). Debajo de 1180 px no hay aside: en una parada con cuarto equivalente, el chip "ver contexto"
// (`#verContexto`, un nodo del escenario con `data-piezas` de las piezas de parada) abre ese cuarto.
import { acompananteDe } from './core/escena.js';
import { acompanante as acompanantePartido } from './paradas/partido.js';
import { acompanante as acompananteCarrera } from './cuartos/carrera.js';
import { TITULOS_DE_CUARTOS } from './cuartos.js';
import { acompanante as acompananteMercado } from './paradas/mercado.js';
import { acompanante as acompananteVos } from './cuartos/vos.js';

// El corte desde el que el acompañante existe (el mismo de `shell.css`).
const CONSULTA_ANCHA = '(min-width: 1180px)';

function contenedor(clase) {
  const el = document.createElement('div');
  el.className = clase;
  return el;
}

// Un stub por tipo (`TIPOS_DE_ACOMPANANTE`). Cada uno llama al renderer de hoy con la `vista`.
const STUBS = {
  // Vos (V3e): la ficha compacta; la entera vive en el cuarto Vos (cuartos/vos.js), que comparte la pieza.
  vos: acompananteVos,
  tabla(caja, estado, { ui }) {
    const panel = contenedor('panel-contexto');
    caja.appendChild(panel);
    ui.renderTabla(panel, estado);
  },
  // El mercado del mundo (V3c): lo pinta la familia (`paradas/mercado.js`).
  mercado: acompananteMercado,
  // V3b: el tablero de la serie, el Swiss y la previa completa son de la familia del partido (paradas/partido.js).
  serie: acompanantePartido,
  previa: acompanantePartido,
  // V5: el resumen de la carrera (el escalón, el Golden Road vivo y una mini trayectoria) lo pinta `cuartos/carrera.js`.
  carrera: acompananteCarrera
};
STUBS.swiss = acompanantePartido;

// `aside`: `#acompanante`. `chip`: `#verContexto`. `contexto`: `{ ui, modulos }`. `abrirCuarto(id)`: el de los cuartos.
export function crearAcompanante({ aside, chip, contexto, abrirCuarto }) {
  const ancho = window.matchMedia?.(CONSULTA_ANCHA) ?? null;
  let ultimo = { estado: null, pieza: null };

  function pintar(estado, pieza) {
    ultimo = { estado, pieza };
    const { tipo, cuarto } = acompananteDe(estado, pieza);
    aside.dataset.acompanante = tipo ?? '';
    aside.hidden = !tipo;
    aside.replaceChildren();
    // Debajo del corte el aside no se ve: no se pinta (vuelve a pintarse si la ventana se agranda).
    if (tipo && (ancho?.matches ?? true)) {
      try {
        STUBS[tipo](aside, estado, contexto);
      } catch (error) {
        console.error(`No se pudo pintar el acompañante ${tipo}:`, error);
      }
    }
    if (chip) {
      chip.hidden = !cuarto;
      chip.dataset.cuarto = cuarto ?? '';
      chip.textContent = cuarto ? `Ver contexto · ${TITULOS_DE_CUARTOS[cuarto]}` : '';
    }
  }

  ancho?.addEventListener?.('change', () => pintar(ultimo.estado, ultimo.pieza));
  chip?.addEventListener('click', () => {
    if (chip.dataset.cuarto) abrirCuarto(chip.dataset.cuarto);
  });

  return { pintar };
}
