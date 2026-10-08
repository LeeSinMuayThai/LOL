// El cuarto Equipo (FASE V, V2-C; stub, lo rediseña V3e): la plantilla de hoy.
import { pintarPaneles } from './comun.js';

// Sin plantilla, la razón: el amateur todavía no firmó, el agente libre no tiene club hoy y el retirado ya no juega.
function textoSinEquipo(estado) {
  if (estado.phase === 'amateur') return 'Todavía sos amateur: la plantilla aparece cuando firmes con un equipo.';
  if (estado.phase === 'retirado') return 'Te retiraste: ya no tenés plantilla.';
  return 'Sin equipo por ahora: la plantilla vuelve cuando firmes con un club.';
}

export function pintar(cuerpo, estado, { ui, modulos }) {
  pintarPaneles(cuerpo, estado, modulos, [ui.renderPlantilla], textoSinEquipo(estado));
}
