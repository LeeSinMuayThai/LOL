// El cuarto Crónica (FASE V, V2-C; stub, lo rediseña V3e): la crónica entera de hoy (`renderFeed`), lo más nuevo arriba.
export function pintar(cuerpo, estado, { ui }) {
  const lista = document.createElement('div');
  lista.className = 'log-list cuarto-cronica';
  cuerpo.appendChild(lista);
  ui.renderFeed(lista, estado);
}
