// El mercado (FASE V, V2-B): el envoltorio de familia sobre el renderer de hoy (`components/mercado.js`, de V3c, que no
// se edita acá). Marca `data-foco` en el título y `data-atajo="n"` en el PRIMER botón ("Firmar") de cada oferta, con
// `data-atajo-foco`: 1-4 LLEVAN EL FOCO al "Firmar" de la oferta n y no firman (PLAN.md V3c: "1-n eligen y Enter firma"; un
// contrato de años no se firma con una tecla suelta). Enter sobre el botón con foco firma, por su acción nativa. El número se
// ve en la tarjeta (`.mercado-atajo`), a la izquierda del botón.
import { marcarFoco, marcarAtajo } from '../escena.js';
import { renderMundo } from '../components/mercado.js';
import { crearTexto } from '../cuartos/comun.js';

// Hasta cuántas ofertas tienen atajo (las teclas 1-4 del teclado).
const OFERTAS_CON_ATAJO = 4;

export function mostrar(contenedor, decision, ctx) {
  const { estado, ui, responder, pintarPrevia, elementos } = ctx;
  // Un mercado no tiene previa: esto la deja vacía, como antes de V2-B.
  pintarPrevia(decision, estado);
  ui.mostrarMercadoEnPantalla(
    elementos.mercado, decision, responder,
    () => responder({ representante: true }),
    responder,
    () => responder({ negociar: 'esperar' })
  );
  marcarFoco(elementos.mercado.mercadoTitle);
  [...elementos.mercado.mercadoGrid.children].slice(0, OFERTAS_CON_ATAJO).forEach((oferta, i) => {
    const firmar = oferta.querySelector('button');
    if (!firmar) return;
    marcarAtajo(firmar, i + 1);
    firmar.dataset.atajoFoco = '';
    firmar.setAttribute('aria-keyshortcuts', String(i + 1));
    const numero = document.createElement('span');
    numero.className = 'mercado-atajo';
    numero.setAttribute('aria-hidden', 'true');
    numero.textContent = String(i + 1);
    firmar.before(numero);
  });
  return contenedor;
}

// El acompañante del mercado (V3c; §V.4): el mercado del mundo —los fichajes que se cerraron este offseason y los asientos
// abiertos en tu puesto que no llegaron a oferta—, que a ≥ 1180 px NO se repite en el escenario (`estilos/mercado.css` oculta
// `#mercadoMundo`; debajo de 1180 px va detrás de un desplegable). Tu contrato y tu valor quedan arriba, compactos, en el
// escenario. Se pinta desde la `vista` (`estado`), nunca desde el estado del motor (regla 4 de §V.3).
export function acompanante(contenedor, estado) {
  const datos = estado.pendiente?.decision?.datos;
  const mundo = document.createElement('div');
  mundo.className = 'mercado-mundo';
  const hay = datos
    ? renderMundo(
      mundo, datos.traspasosMundo ?? [], datos.asientosAbiertos ?? [],
      new Set((datos.clubesInteresados ?? []).map((i) => i.org))
    )
    : false;
  contenedor.appendChild(hay ? mundo : crearTexto('cuarto-vacio', 'Todavía no se cerró ningún fichaje este offseason.'));
  return contenedor;
}
