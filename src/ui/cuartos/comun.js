// Lo que comparten los cuartos (FASE V, V2-C): cada panel de hoy (`src/ui/paneles/*.js`) en su propio contenedor, y un
// texto honesto si ninguno tiene nada que mostrar todavía (cada renderer se esconde solo con `hidden`).

export function crearTexto(clase, texto) {
  const el = document.createElement('p');
  el.className = clase;
  el.textContent = texto;
  return el;
}

// `renderers`: funciones `(contenedor, estado, modulos)` de los paneles de hoy. Devuelve cuántos quedaron a la vista.
export function pintarPaneles(cuerpo, estado, modulos, renderers, textoVacio) {
  let visibles = 0;
  for (const render of renderers) {
    const panel = document.createElement('div');
    panel.className = 'panel-contexto';
    cuerpo.appendChild(panel);
    render(panel, estado, modulos);
    if (!panel.hidden) {
      visibles += 1;
    } else {
      panel.remove();
    }
  }
  if (visibles === 0 && textoVacio) {
    cuerpo.appendChild(crearTexto('cuarto-vacio', textoVacio));
  }
  return visibles;
}
