// El cuarto Carrera (FASE V, V2-C; stub): lo que hasta acá mostraba "Ver carrera" en la ficha (un renglón por club, con
// sus títulos) y los momentos. La trayectoria dibujada (cinta de clubes, nota por año, curva de nivel, hitos) es de V5.
// También lo usa el acompañante en el cierre de año, el retiro y la vuelta (`src/ui/acompanante.js`).
import { filaHistoria, filaMomento } from '../components/ficha.js';
import { titulosDeFila } from '../../core/registro.js';
import { crearTexto } from './comun.js';

// Los momentos a la vista, los más nuevos primero (los mismos que la ficha).
const MOMENTOS_A_LA_VISTA = 10;

function seccion(titulo, filas) {
  const caja = document.createElement('section');
  caja.className = 'panel-contexto cuarto-carrera';
  const cabeza = document.createElement('div');
  cabeza.className = 'panel-contexto-titulo';
  cabeza.textContent = titulo;
  caja.append(cabeza, ...filas);
  return caja;
}

export function pintar(cuerpo, estado) {
  const registro = estado.career?.registro;
  const clubes = registro?.porOrg ?? [];
  if (clubes.length === 0) {
    cuerpo.appendChild(crearTexto('cuarto-vacio', 'Todavía no jugaste en ningún club: tu trayectoria se arma acá, club por club.'));
  } else {
    cuerpo.appendChild(seccion('Tu carrera', clubes.map((fila) => filaHistoria({ ...fila, titulos: titulosDeFila(fila, registro) }))));
  }
  const momentos = registro?.momentos ?? [];
  if (momentos.length > 0) {
    cuerpo.appendChild(seccion(`Momentos (${momentos.length})`, [...momentos].reverse().slice(0, MOMENTOS_A_LA_VISTA).map(filaMomento)));
  }
}
