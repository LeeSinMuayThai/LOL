// El partido (FASE V; PLANUI §0.2 y U2b): la transmisión de la vitrina con `op=linea`. A pantalla completa, sin
// acompañante. Cuál pieza se pinta lo dice la parada del motor (`familiaDeParada`: sistemas `temporada`, `serie` e
// `internacional`):
//   - el plan de Fearless, el replan y el mapa decisivo de una serie (también la del internacional): EL CARA A CARA
//     (`components/caraACara.js`);
//   - la fecha marcada (`temporada`): el mismo cara a cara al Bo1, con la p grande;
//   - el 2-2 del Swiss del Mundial: EL STREAM (`components/stream.js`);
//   - cualquier otra parada de estos sistemas, la decisión de siempre (las cartas, `components/decision/cartas.js`).
// La familia declara el mundo de su pieza (la costura cara a cara) y devuelve la vista con `narrar` y `destruir`.
import { marcarFoco } from '../escena.js';
import { crearCaraACara } from '../components/caraACara.js';
import { crearStream } from '../components/stream.js';
import { mostrar as mostrarDecision } from './decision.js';
import { previaDeDecision } from '../../core/previaDePartido.js';
import { tableroDeSerie } from '../../core/vistaDeCarrera.js';
import { cuadroDelMundial } from '../../core/internacional.js';
import { crearCuadroMundial } from '../components/mundial.js';

// La pieza de una parada de partido, por lo que dice la parada (nunca por su prosa).
export function piezaDePartido(pendiente, estado) {
  const motivo = pendiente?.decision?.datos?.motivo;
  if (motivo === 'swiss') return 'stream';
  if (['plan', 'decisivo'].includes(motivo) && estado?.serie?.activa) return 'serie';
  if (pendiente?.sistemaId === 'temporada' && estado?.career?.temporada?.fechaEnCurso) return 'fecha';
  return 'decision';
}

export function mostrar(contenedor, decision, ctx) {
  const { estado, responder, pintarPrevia, mundo, sonido } = ctx;
  const pieza = piezaDePartido(estado.pendiente, estado);
  if (pieza === 'decision') return mostrarDecision(contenedor, decision, ctx);
  const previa = pintarPrevia(decision, estado);
  const internacional = estado.pendiente?.sistemaId === 'internacional';
  const vista = pieza === 'stream'
    ? crearStream(contenedor, decision, { estado, previa, mundo, sonido, responder })
    : crearCaraACara(contenedor, decision, { estado, previa, mundo, sonido, responder, modo: pieza === 'fecha' ? 'fecha' : 'serie', internacional });
  // F1 (PLANUI §0.8): en cuartos, semis y final del Mundial, el cuadro de 8 con tu camino, arriba del cara a cara
  const cuadro = pieza === 'serie' && estado.serie?.torneo === 'mundial' ? cuadroDelMundial(estado.internacional, estado.serie.etapa) : null;
  if (cuadro) contenedor.querySelector('.tx-arriba')?.append(crearCuadroMundial(cuadro));
  mundo?.declarar?.(vista.mundo);
  vista.alMontar?.();
  marcarFoco(vista.titulo);
  return { narrar: vista.narrar, destruir: vista.destruir };
}

// El acompañante de los tres tipos del partido (`serie`, `swiss`, `previa`; §V.4): en el escritorio el partido va a
// pantalla completa (PLANUI §0.2), así que esto lo usan los cuartos. Cuál toca lo decide `tableroDeSerie`.
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
