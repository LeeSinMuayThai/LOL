// El log de la carrera. Extraído tal cual de index.html (fase 8, §8.5) —
// misma jerarquía tipográfica: una entrada con `cuerpo` es un resultado
// narrativo (lo que pasó va en grande, los efectos abajo, chicos); sin
// `cuerpo` es una línea plana.
//
// `tecnico: true` (fase 7) marca los logs puramente numéricos: se pintan
// atenuados en vez de escondidos del todo — siguen siendo útiles para leer
// la carrera entera, pero no compiten por atención con lo narrativo.
export function renderFeed(logList, state, { limite = 8 } = {}) {
  const recientes = state.logs.slice(-limite).reverse();
  logList.replaceChildren(...recientes.map((entry) => {
    const item = document.createElement('div');
    item.className = 'log-item' + (entry.tecnico ? ' log-item--tecnico' : '');

    if (!entry.cuerpo) {
      item.textContent = entry.message;
      return item;
    }

    const titulo = document.createElement('div');
    titulo.className = 'log-titulo';
    titulo.textContent = entry.titulo ?? '';
    item.appendChild(titulo);

    const cuerpo = document.createElement('div');
    cuerpo.textContent = entry.cuerpo;
    item.appendChild(cuerpo);

    if (entry.efectos) {
      const efectos = document.createElement('div');
      efectos.className = 'log-efectos';
      efectos.textContent = entry.efectos;
      item.appendChild(efectos);
    }

    return item;
  }));
}
