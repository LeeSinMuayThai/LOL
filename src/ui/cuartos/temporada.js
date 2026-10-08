// El cuarto Temporada (FASE V, V3e; PLAN.md §V.4): la tabla de la liga.
//  - Con un split en juego (`career.temporada.activa`): la tabla en vivo y el calendario.
//  - Entre splits: la tabla CERRADA del último split jugado, marcada como final (el motor la deja en `career.temporada.tabla`
//    hasta que arranca otro split con tabla). Antes decía "Ahora no se está jugando una temporada" justo cuando el jugador
//    quería ver cómo terminó.
//  - Si el estado no la conservara (un guardado viejo, o una carrera que nunca jugó en una tabla), se usa
//    `registro.porSplit` para la posición y se dice qué falta: la tabla completa.
import { renderTabla, renderTablaCerrada, ultimoSplitEnTabla } from '../paneles/tabla.js';
import { renderCalendario } from '../paneles/calendario.js';
import { nombreVisibleDeLiga } from '../formatoUi.js';
import { crearTexto, pintarPaneles } from './comun.js';

function resumenDeLaUltimaPosicion(fila) {
  const caja = document.createElement('section');
  caja.className = 'panel-contexto cuarto-temporada-ultima';
  const titulo = document.createElement('div');
  titulo.className = 'panel-contexto-titulo';
  titulo.textContent = `${fila.liga ? nombreVisibleDeLiga(fila.liga) : 'Tier 3'} · final · ${fila.anio} · split ${fila.split + 1}`;
  const linea = document.createElement('p');
  linea.className = 'cuarto-temporada-posicion';
  linea.textContent = `Terminaste ${fila.posicion}º de ${fila.equipos} con ${fila.org}.`;
  const falta = crearTexto('panel-contexto-leyenda', 'La tabla completa de ese split no quedó guardada: solo tu puesto.');
  caja.append(titulo, linea, falta);
  return caja;
}

export function pintar(cuerpo, estado, { modulos }) {
  const temporada = estado.career.temporada;
  if (temporada.activa) {
    pintarPaneles(cuerpo, estado, modulos, [renderTabla, renderCalendario],
      'Todavía no hay tabla para mostrar.');
    return;
  }
  const vistas = pintarPaneles(cuerpo, estado, modulos, [renderTablaCerrada], null);
  if (vistas > 0) return;
  const ultima = ultimoSplitEnTabla(estado);
  if (ultima) {
    cuerpo.appendChild(resumenDeLaUltimaPosicion(ultima));
    return;
  }
  cuerpo.appendChild(crearTexto('cuarto-vacio', 'Todavía no jugaste una temporada: la tabla aparece cuando arranca tu primer split con equipo.'));
}
