// El panel de Generación (fase T5, cierra la deuda D8 de UI — el motor ya
// generaba estos 5 rivales desde la fase 3 y nunca se veían en ningún
// lado). Fuente: `mundo.rivales`, sorteado una vez en `generarMundo` y
// nunca reescrito acá.
export function renderGeneracion(container, state, modulos) {
  const rivales = state.mundo.rivales;

  if (!rivales || rivales.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.replaceChildren();

  const titulo = document.createElement('div');
  titulo.className = 'panel-contexto-titulo';
  titulo.textContent = 'Tu generación';
  container.appendChild(titulo);

  const lista = document.createElement('div');
  lista.className = 'generacion-lista';
  for (const rival of rivales) {
    const fila = document.createElement('div');
    fila.className = 'generacion-fila';

    const handleEl = document.createElement('span');
    handleEl.className = 'generacion-handle';
    handleEl.textContent = rival.handle;

    const detalleEl = document.createElement('span');
    detalleEl.className = 'generacion-detalle';
    // `desenlace` lo completa el cierre de carrera de cada rival (D8,
    // fase 9M/11 en `PLAN.md`) — hasta que eso corra, siempre es `null` y
    // acá solo hay rol + liga: exactamente lo que el motor sabe hoy.
    detalleEl.textContent = rival.desenlace
      ?? `${modulos.etiquetaRol(rival.role)} · ${rival.liga}`;

    fila.append(handleEl, detalleEl);
    lista.appendChild(fila);
  }
  container.appendChild(lista);
}
