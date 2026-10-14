// La parada genérica (FASE V; PLANUI §0.2, U2a y §0.5): el envoltorio de familia sobre la decisión de siempre, las cartas
// (`components/decision/cartas.js`). Declara el mundo de la parada, pinta la decisión y marca lo que pide el contrato de
// las familias (cabecera de `src/ui/escena.js`): `data-foco` en el título y `data-atajo` en las opciones (las pone el
// renderer). Devuelve la vista de la parada: `narrar(ctx)` cuenta el resultado en el lugar y `destruir()` suelta la
// costura.
//
// El mundo (P2, §0.5: un campeón aparece solo cuando la pantalla habla de él):
//   - con destino, la costura de la bisagra, como siempre (tu main en la variante `campeones`; sin campeón en `liga`);
//   - si no, el campeón va detrás solo si la decisión lo nombra (el título, la descripción o las opciones); si no lo
//     nombra, la luz de la era sin campeón.
import { marcarFoco } from '../escena.js';
import { crear } from '../components/decision/cartas.js';
import { leerEvento, varianteDeCostura } from '../core/bisagra.js';
import { mainDe, campeonesNombrados } from '../core/mundo.js';

// Todo lo que la decisión dice en pantalla, para buscar campeones nombrados.
function textoDeDecision(decision) {
  const opciones = (decision.opciones ?? []).flatMap((o) => [o.label, o.descripcion, ...(o.previa ?? []).map((p) => p.texto)]);
  return [decision.titulo, decision.descripcion, ...opciones].filter(Boolean).join(' · ');
}

// `contenedor`: `#decision`. `ctx`: ver el contrato (`marco`: la línea "antes", la placa y el margen de la pantalla).
export function mostrar(contenedor, decision, ctx) {
  const { estado, responder, pintarPrevia, mundo, sonido, marco = {} } = ctx;
  const previa = pintarPrevia(decision, estado);
  const arte = mainDe(estado);
  // El mundo, antes de pintar: la costura que prende la decisión cruza desde acá.
  const variante = varianteDeCostura(leerEvento(decision, estado));
  if (variante) mundo?.declarar?.({ escena: 'costura', arte: variante === 'liga' ? null : arte });
  const nombrado = variante ? null : campeonesNombrados(textoDeDecision(decision))[0] ?? null;
  if (!variante) mundo?.declarar?.({ arte: nombrado });
  // sin campeón detrás ni costura, la carta pone la marca de agua del eje que domina (`cartas.js`)
  const vista = crear(contenedor, decision, {
    estado, previa, mundo, sonido, responder, arte, marca: !variante && !nombrado,
    limite: marco.antes ?? null, lateral: marco.placa ?? null, margen: marco.margen ?? (() => 0)
  });
  marcarFoco(vista.titulo);
  return { narrar: vista.narrar, destruir: vista.destruir };
}

// El acompañante de la familia: la placa "Vos" de siempre (`ui/acompanante.js`).
export function acompanante() {
  return null;
}
