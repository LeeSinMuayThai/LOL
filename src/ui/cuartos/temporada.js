// El cuarto Temporada (FASE V, V2-C; stub, lo rediseña V3e): la tabla y el calendario de hoy.
import { pintarPaneles } from './comun.js';

export function pintar(cuerpo, estado, { ui, modulos }) {
  pintarPaneles(cuerpo, estado, modulos, [ui.renderTabla, ui.renderCalendario],
    'Ahora no se está jugando una temporada: la tabla y el calendario vuelven cuando arranque la próxima.');
}
