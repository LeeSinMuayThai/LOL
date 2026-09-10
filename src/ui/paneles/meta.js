import METAS from '../../data/metas.json' with { type: 'json' };
import { crearCampeonTile } from '../components/campeonTile.js';

const TIERS = ['S', 'A', 'B', 'C'];
const MAX_POR_COL = 3;

// El panel de Meta (fase T5). Fuente: `meta.regimen` (un id — se busca en
// `METAS` el nombre real) + `meta.tierList` (ya calculada por
// `core/regimen.js:tierListDeRol` cada split) marcada contra el pool del
// jugador. Columnas S/A/B/C: tus campeones son tile, el resto nombre.
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

  const poolArr = state.player.championPool ?? [];
  const pool = new Map(poolArr.map((c) => [c.name, c]));

  const porTier = { S: [], A: [], B: [], C: [] };
  for (const entrada of tierList) {
    const bucket = porTier[entrada.tier] ?? porTier.C;
    bucket.push(entrada);
  }

  const columnas = document.createElement('div');
  columnas.className = 'meta-columnas';
  for (const tier of TIERS) {
    const col = document.createElement('div');
    col.className = 'meta-col';

    const head = document.createElement('span');
    head.className = `meta-tier meta-tier--${tier}`;
    head.textContent = tier;
    col.appendChild(head);

    const items = porTier[tier];
    const visibles = items.slice(0, MAX_POR_COL);
    for (const entrada of visibles) {
      const propio = pool.get(entrada.name);
      if (propio) {
        col.appendChild(crearCampeonTile(propio, { size: 'mini' }));
      } else {
        const nom = document.createElement('span');
        nom.className = 'meta-col-nombre';
        nom.textContent = entrada.name;
        nom.title = entrada.name;
        col.appendChild(nom);
      }
    }
    const extra = items.length - MAX_POR_COL;
    if (extra > 0) {
      const mas = document.createElement('span');
      mas.className = 'meta-col-mas';
      mas.textContent = `+${extra}`;
      col.appendChild(mas);
    }
    columnas.appendChild(col);
  }
  container.appendChild(columnas);
}
