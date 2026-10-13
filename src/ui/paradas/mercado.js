// El mercado (PLANUI U2b punto 2 y §0.2): la familia de las paradas `presentacion: 'mercado'` del motor, las ofertas de la
// pretemporada y el traspaso a mitad de contrato. Pinta `components/mercado.js` a pantalla completa (sin acompañante),
// declara su mundo (sin campeón: a la derecha van las cartas de las ofertas) y arranca la llegada. Devuelve la vista con
// `narrar` (la firma sobre el contrato y, con un club nuevo, el fichaje: tu línea sobre el mapa y la firma con tu
// jersey) y `destruir`. 1-6 eligen la oferta (`data-atajo`, el teclado del shell) y Enter firma; en el traspaso, 1-3
// eligen el camino.
import { marcarFoco } from '../escena.js';
import { crearMercado } from '../components/mercado.js';

export function mostrar(contenedor, decision, ctx) {
  const { estado, responder, pintarPrevia, mundo, sonido, controlar, retomar } = ctx;
  // Un mercado no tiene previa: esto la deja vacía.
  pintarPrevia(decision, estado);
  const vista = crearMercado(contenedor, decision, { estado, mundo, sonido, responder, controlar, retomar });
  mundo?.declarar?.(vista.mundo);
  vista.entrar();
  marcarFoco(vista.titulo);
  return { narrar: vista.narrar, destruir: vista.destruir };
}
