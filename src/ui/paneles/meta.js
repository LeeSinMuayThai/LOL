import METAS from '../../data/metas.json' with { type: 'json' };

// El panel de Meta (fase T5). Fuente: `meta.regimen` (un id — se busca en
// `METAS` el nombre real) + `meta.tierList` (ya calculada por
// `core/regimen.js:tierListDeRol` cada split) marcada contra el pool del
// jugador.
export function renderMeta(container, state) {
  const { regimen, tierList } = state.meta;
  const regimenObj = METAS.find((m) => m.id === regimen);

  if (!regimenObj || !tierList || tierList.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.replaceChildren();

  const titulo = document.createElement('div');
  titulo.className = 'panel-contexto-titulo';
  titulo.textContent = 'Meta';
  container.appendChild(titulo);

  const nombre = document.createElement('div');
  nombre.className = 'meta-regimen-nombre';
  nombre.textContent = regimenObj.nombre;
  container.appendChild(nombre);

  const descripcion = document.createElement('div');
  descripcion.className = 'meta-regimen-desc';
  descripcion.textContent = regimenObj.descripcion;
  container.appendChild(descripcion);

  // El pool del jugador contra la tier list vigente: los mismos campeones
  // que la ficha ya lista (T0.6), acá con el resto de la tier list de
  // fondo para que se vea DÓNDE cae tu pool, no solo cuánto vale.
  const pool = new Set((state.player.championPool ?? []).map((c) => c.name));
  const lista = document.createElement('div');
  lista.className = 'meta-tierlist';
  for (const entrada of tierList.slice(0, 8)) {
    const fila = document.createElement('div');
    fila.className = 'meta-tierlist-fila' + (pool.has(entrada.name) ? ' meta-tierlist-fila--pool' : '');

    const tierEl = document.createElement('span');
    tierEl.className = `meta-tier meta-tier--${entrada.tier}`;
    tierEl.textContent = entrada.tier;

    const nombreEl = document.createElement('span');
    nombreEl.className = 'meta-tierlist-nombre';
    nombreEl.textContent = entrada.name;

    fila.append(tierEl, nombreEl);
    lista.appendChild(fila);
  }
  container.appendChild(lista);
}
