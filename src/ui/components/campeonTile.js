import CAMPEONES from '../../data/champions.json' with { type: 'json' };
import { arquetipoDeTags, inicialesDeCampeon } from '../formatoUi.js';
import { BALANCE } from '../../data/balance.js';

const POR_NOMBRE = new Map(CAMPEONES.map((c) => [c.name, c]));

// Identidad geométrica de un campeón: sin splash (Riot IP). El color sale
// del primer tag de arquetipo, mapeado a tokens. Misma pieza en setup, ficha,
// meta y Fearless.

// Lo que el tile `ficha` le dice al jugador sobre el óxido de un campeón del
// pool (fase J3). Puro y sin DOM para poder probarlo en Node. El texto es corto
// a propósito (un tile mide 40 px y la maestría ocupa la otra mitad de la fila
// de abajo); el referente va en el `titulo` (regla 13).
//   - en el piso no se promete pérdida: no hay nada que perder (regla 15);
//   - en gracia, cuántos splits sin jugarlo aguanta;
//   - fuera de gracia, que oxida.
export function etiquetaDeOxido(pronostico) {
  if (pronostico.enPiso) {
    return {
      estado: 'piso',
      texto: 'piso',
      titulo: `Ya está en el piso de maestría (${BALANCE.campeones.maestriaMinima}): no baja más aunque no lo juegues.`
    };
  }
  const n = pronostico.splitsParaOxido;
  if (n > 0) {
    return {
      estado: 'gracia',
      texto: `${n} spl`,
      titulo: `${n} ${n === 1 ? 'split' : 'splits'} sin jugarlo antes de que empiece a oxidar.`
    };
  }
  return {
    estado: 'oxida',
    texto: 'oxida',
    titulo: 'Si no lo jugás en el próximo split, pierde maestría.'
  };
}

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

  const oxido = size === 'ficha' && pronostico ? etiquetaDeOxido(pronostico) : null;

  tile.title = [
    campeon.name,
    Number.isFinite(campeon.mastery) ? `maestría ${Math.round(campeon.mastery)}` : null,
    tier ? `tier ${tier}` : null,
    oxido?.titulo
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

  if (oxido) {
    const ox = document.createElement('span');
    ox.className = `campeon-tile-oxido campeon-tile-oxido--${oxido.estado}`;
    ox.textContent = oxido.texto;
    ox.title = oxido.titulo;
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
