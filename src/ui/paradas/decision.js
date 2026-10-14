// La parada genérica (FASE V; PLANUI §0.2 y U2a): el envoltorio de familia sobre la decisión de la vitrina
// (`components/decision.js`). Declara el mundo de la parada (con destino, la costura de la bisagra; sin arte de campeón
// en la variante `liga`), pinta la decisión y marca lo que pide el contrato de las familias (cabecera de
// `src/ui/escena.js`): `data-foco` en el título y `data-atajo` en las opciones (las pone el renderer). Devuelve la vista
// de la parada: `narrar(ctx)` cuenta el resultado en el lugar y `destruir()` suelta la costura.
import { marcarFoco } from '../escena.js';
import { crearDecision } from '../components/decision.js';
import * as cartas from '../components/decision/cartas.js';
import * as draft from '../components/decision/draft.js';
import * as hextech from '../components/decision/hextech.js';
import { perilla } from '../previa/perillas.js';
import { leerEvento, varianteDeCostura } from '../core/bisagra.js';
import { mainDe } from '../core/mundo.js';

// Las variantes de la previa (`?dc=`, PLANUI §0.4): el mismo contrato que `crearDecision`. Sin perilla, la de siempre.
const VARIANTES = { cartas, draft, hextech };

// `contenedor`: `#decision`. `ctx`: ver el contrato (`marco`: la línea "antes", la placa y el margen de la pantalla).
export function mostrar(contenedor, decision, ctx) {
  const { estado, responder, pintarPrevia, mundo, sonido, marco = {} } = ctx;
  const previa = pintarPrevia(decision, estado);
  const arte = mainDe(estado);
  // El mundo, antes de pintar: la costura que prende la decisión cruza desde acá.
  const variante = varianteDeCostura(leerEvento(decision, estado));
  if (variante) mundo?.declarar?.({ escena: 'costura', arte: variante === 'liga' ? null : arte });
  const crear = VARIANTES[perilla('dc', Object.keys(VARIANTES))]?.crear ?? crearDecision;
  const vista = crear(contenedor, decision, {
    estado, previa, mundo, sonido, responder, arte,
    limite: marco.antes ?? null, lateral: marco.placa ?? null, margen: marco.margen ?? (() => 0)
  });
  marcarFoco(vista.titulo);
  return { narrar: vista.narrar, destruir: vista.destruir };
}

// El acompañante de la familia: la placa "Vos" de siempre (`ui/acompanante.js`).
export function acompanante() {
  return null;
}
