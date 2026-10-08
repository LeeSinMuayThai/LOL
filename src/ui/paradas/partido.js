// El partido (FASE V, V3b; PLAN.md §V.3 reglas 2 y 6): la fecha marcada, el plan de Fearless, el decisivo y el Swiss/bracket del
// Mundial (`familiaDeParada`: sistemas `temporada`, `serie` e `internacional`). Primero lo que se decide: las opciones las
// pinta el renderer de la parada genérica en `#decision`, que `index.html` pone ARRIBA (la fila de opción es de V3a; esta familia
// no mira su markup). Detrás vienen `#serieContexto` (el marcador en una línea; lo pinta `app.js` desde la `vista`) y `#previa`
// (la p y lo que define el partido en una línea), cada uno con el resto en un desplegable. Desde 1180 px el tablero entero y la
// previa completa viven en el acompañante (`acompanante()`) y el escenario no repite la línea (`estilos/serie.css`).
import { mostrar as mostrarOpciones } from './decision.js';
import { previaDeDecision } from '../../core/previaDePartido.js';
import { tableroDeSerie } from '../../core/vistaDeCarrera.js';

// `contenedor`: el panel `#decision`. `ctx`: ver el contrato (cabecera de `ui/escena.js`). Pinta la previa (`ctx.pintarPrevia`),
// las opciones con su `data-atajo` y el encabezado con su `data-foco`.
export function mostrar(contenedor, decision, ctx) {
  return mostrarOpciones(contenedor, decision, ctx);
}

// El acompañante de los tres tipos del partido (`serie`, `swiss`, `previa`; §V.4): cuál toca lo decide `tableroDeSerie`, la misma
// función que usa `acompananteDe`. `contexto`: `{ ui, modulos }`.
export function acompanante(caja, estado, { ui }) {
  if (tableroDeSerie(estado)) {
    const tablero = document.createElement('div');
    tablero.className = 'serie-contexto serie-contexto--completo';
    caja.appendChild(tablero);
    ui.renderSerieContexto(tablero, estado, { completo: true });
    return;
  }
  const previa = document.createElement('div');
  previa.className = 'previa previa--completa';
  caja.appendChild(previa);
  let datos = null;
  try {
    datos = estado.pendiente?.decision ? previaDeDecision(estado, estado.pendiente.decision) : null;
  } catch (error) {
    console.error('No se pudo armar la previa del acompañante:', error);
  }
  ui.renderPrevia(previa, datos, { completo: true });
}
