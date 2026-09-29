import CAMPEONES from '../../data/champions.json' with { type: 'json' };
import { arquetipoDeTags, inicialesDeCampeon } from '../formatoUi.js';

const POR_NOMBRE = new Map(CAMPEONES.map((c) => [c.name, c]));

// Identidad geométrica de un campeón: sin splash (Riot IP). El color sale
// del primer tag de arquetipo, mapeado a tokens. Misma pieza en setup, ficha,
// meta y Fearless.

export function crearCampeonTile(campeon, {
  tier = null,
  quemado = false,
  elegido = false,
  size = 'ficha',
  pronostico = null
} = {}) {
  const catalogo = POR_NOMBRE.get(campeon.name);
  const tags = campeon.tags ?? catalogo?.tags ?? [];
  const arq = arquetipoDeTags(tags);

  const tile = document.createElement('div');
  tile.className = [
    'campeon-tile',
    `campeon-tile--${size}`,
    `campeon-tile--${arq}`,
    quemado && 'campeon-tile--quemado',
    elegido && 'campeon-tile--elegido'
  ].filter(Boolean).join(' ');

  const splitsParaOxido = pronostico?.splitsParaOxido ?? 0;
  const fraseOxido = size === 'ficha' && pronostico
    ? (splitsParaOxido > 0
      ? `Si no lo jugás, el óxido empieza en ${splitsParaOxido} ${splitsParaOxido === 1 ? 'split' : 'splits'}.`
      : 'Si no lo jugás este split, pierde maestría.')
    : null;

  tile.title = [
    campeon.name,
    Number.isFinite(campeon.mastery) ? `maestría ${Math.round(campeon.mastery)}` : null,
    tier ? `tier ${tier}` : null,
    fraseOxido
  ].filter(Boolean).join(' · ');

  const iniciales = document.createElement('span');
  iniciales.className = 'campeon-tile-ini';
  iniciales.textContent = inicialesDeCampeon(campeon.name);
  tile.appendChild(iniciales);

  if (Number.isFinite(campeon.mastery)) {
    const mae = document.createElement('span');
    mae.className = 'campeon-tile-mae';
    mae.textContent = String(Math.round(campeon.mastery));
    tile.appendChild(mae);
  }

  if (size === 'ficha' && pronostico) {
    const ox = document.createElement('span');
    ox.className = 'campeon-tile-oxido';
    ox.textContent = pronostico.splitsParaOxido > 0
      ? `aguanta ${pronostico.splitsParaOxido}`
      : 'oxida';
    ox.title = fraseOxido;
    tile.appendChild(ox);
  }

  if (tier) {
    const pip = document.createElement('span');
    pip.className = `meta-tier meta-tier--${tier} campeon-tile-tier`;
    pip.textContent = tier;
    tile.appendChild(pip);
  }

  return tile;
}
