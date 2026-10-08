// El cuarto Equipo (FASE V, V2-C; stub, lo rediseña V3e): la plantilla de hoy.
import { pintarPaneles } from './comun.js';

export function pintar(cuerpo, estado, { ui, modulos }) {
  pintarPaneles(cuerpo, estado, modulos, [ui.renderPlantilla], 'Todavía no tenés equipo.');
}
