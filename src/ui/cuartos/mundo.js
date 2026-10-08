// El cuarto Mundo (FASE V, V2-C; stub, lo rediseña V3e): el meta, tu generación y el top mundial de hoy.
import { pintarPaneles } from './comun.js';

export function pintar(cuerpo, estado, { ui, modulos }) {
  pintarPaneles(cuerpo, estado, modulos, [ui.renderMeta, ui.renderGeneracion, ui.renderTopMundial],
    'Todavía no hay nada del mundo para mostrar.');
}
