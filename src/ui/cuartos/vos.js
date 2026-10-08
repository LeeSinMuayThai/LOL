// El cuarto Vos (FASE V, V2-C; stub que llama al renderer de hoy, lo rediseña V3e): la ficha entera.
export function pintar(cuerpo, estado, { ui, modulos }) {
  const ficha = document.createElement('div');
  ficha.className = 'ficha-card';
  cuerpo.appendChild(ficha);
  ui.renderFicha(ficha, estado, modulos);
}
