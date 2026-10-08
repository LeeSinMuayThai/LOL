// El partido (FASE V, V3b; PLAN.md §V.3 reglas 2 y 6 y §V.4): la fecha marcada, el plan de Fearless, el decisivo y el
// Swiss/bracket del Mundial (`familiaDeParada` de ui/core/escena.js: sistemas `temporada`, `serie` e `internacional`).
//
// Primero lo que se decide. Las opciones las pinta el renderer de la parada genérica (`paradas/decision.js` → `components/
// decision.js`; la fila de opción es de V3a y esta familia no mira su markup) en `#decision`, que `index.html` pone ARRIBA. Lo
// que rodea a la decisión viene después, en este orden, y es contexto a un toque:
//   1. `#serieContexto`  el marcador en UNA línea (rival, marcador, mapa n de N, Fearless) con el camino detrás de un
//                        desplegable (`components/serie.js`; lo pinta `app.js` desde la `vista`, regla 4).
//   2. `#previa`         la p y lo que define el partido en una línea, el desglose detrás (`components/previaPartido.js`).
// Desde 1180 px el tablero entero y la previa completa viven en el acompañante (`acompanante()` de abajo) y el
// escenario no repite la línea (`estilos/serie.css`): nada aparece dos veces.
import { mostrar as mostrarOpciones } from './decision.js';
import { previaDeDecision } from '../../core/previaDePartido.js';
import { tableroDeSerie } from '../../core/vistaDeCarrera.js';

// `contenedor`: el panel `#decision`. `ctx`: ver el contrato. Pinta la previa (`ctx.pintarPrevia`, que también esconde la
// tarjeta si la pausa no es antes de un partido), las opciones con su `data-atajo` y el encabezado con su `data-foco`.
export function mostrar(contenedor, decision, ctx) {
  return mostrarOpciones(contenedor, decision, ctx);
}

// El acompañante del partido (§V.4: "serie o Swiss (`tableroDeSerie`) → bracket, marcador y Fearless, o el Swiss · fecha
// marcada → la previa completa"). `contexto`: `{ ui, modulos }`. Sirve a los tres tipos (`serie`, `swiss` y `previa`): cuál
// toca lo decide `tableroDeSerie`, la misma función que usa `acompananteDe`.
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
