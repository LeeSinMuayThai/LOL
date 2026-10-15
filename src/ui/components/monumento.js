import { monumento } from '../../core/legado.js';

// G4c (PLANUI §0.9): el monumento, un beat antes de la tarjeta final. Según tu escalón más alto de arraigo, la org retira tu
// camiseta (Leyenda) o cuelga tu bandera (Ídolo), con el número que elegiste en la firma y el apodo de esa org. Abajo de
// Ídolo no hay monumento: `renderMonumento` devuelve `false` y la tarjeta sale directo.
const TITULO = { jersey: 'RETIRAN TU JERSEY', bandera: 'CUELGAN TU BANDERA' };

function linea(clase, texto) {
  const div = document.createElement('div');
  div.className = clase;
  div.textContent = texto;
  return div;
}

export function renderMonumento(container, state, alSeguir) {
  const mon = monumento(state);
  if (!mon.tipo || !mon.org) {
    return false;
  }
  container.replaceChildren();
  container.hidden = false;
  container.className = `tarjeta tarjeta--exito monumento monumento--${mon.tipo}`;
  container.dataset.marco = 'monumento';
  container.appendChild(linea('monumento-k', mon.tipo === 'jersey' ? 'Para siempre en el techo del estadio' : 'En lo alto de la tribuna'));
  container.appendChild(linea('monumento-titulo', TITULO[mon.tipo]));
  // `dorsal` puede faltar (nunca confirmaste el número en una firma): el monumento sale igual, sin número.
  if (mon.tipo === 'jersey' && Number.isInteger(mon.dorsal)) {
    container.appendChild(linea('monumento-dorsal', `#${mon.dorsal}`));
  }
  container.appendChild(linea('monumento-org', `en ${mon.org}`));
  if (mon.apodo) {
    container.appendChild(linea('monumento-apodo', mon.apodo));
  }
  const seguir = document.createElement('button');
  seguir.type = 'button';
  seguir.className = 'tarjeta-accion-btn tarjeta-accion-btn--principal monumento-seguir';
  seguir.textContent = 'Ver mi legado';
  seguir.addEventListener('click', () => alSeguir(), { once: true });
  container.appendChild(seguir);
  seguir.focus({ preventScroll: true });
  return true;
}
