// El filtro real de los tiers ápice no es el LP: son los cupos.
//
// Grandmaster y Challenger no tienen umbral fijo — tienen una cantidad fija de
// plazas por servidor, y la ladder se reordena a diario. Por eso el mismo LP te
// deja adentro de Challenger en un servidor y afuera en otro, y por eso el
// tamaño del servidor importa para una carrera.
//
// `cutoffChallengerBase` y `lpTop1` son mediciones reales de agosto de 2026.
// El mundo generado los sortea alrededor de estos valores, así que el mismo
// Challenger #40 no vale lo mismo en dos partidas.

export const SERVIDORES = [
  { id: 'KR', label: 'Corea', cupoChallenger: 300, cupoGM: 700, cutoffChallengerBase: 1831, lpTop1: 2600 },
  { id: 'EUW', label: 'Europa Oeste', cupoChallenger: 300, cupoGM: 700, cutoffChallengerBase: 2398, lpTop1: 3200 },
  { id: 'NA', label: 'Norteamérica', cupoChallenger: 300, cupoGM: 700, cutoffChallengerBase: 1528, lpTop1: 2200 },
  { id: 'CN', label: 'China', cupoChallenger: 200, cupoGM: 500, cutoffChallengerBase: 1700, lpTop1: 2400 },
  { id: 'BR', label: 'Brasil', cupoChallenger: 200, cupoGM: 500, cutoffChallengerBase: 1400, lpTop1: 2000 },
  { id: 'LAN', label: 'LATAM Norte', cupoChallenger: 200, cupoGM: 500, cutoffChallengerBase: 1465, lpTop1: 2050 },
  { id: 'LAS', label: 'LATAM Sur', cupoChallenger: 200, cupoGM: 500, cutoffChallengerBase: 1287, lpTop1: 1900 },
  { id: 'TW', label: 'Asia-Pacífico', cupoChallenger: 200, cupoGM: 500, cutoffChallengerBase: 1200, lpTop1: 1800 }
];

const POR_ID = Object.fromEntries(SERVIDORES.map((servidor) => [servidor.id, servidor]));

export function servidorPorId(id) {
  return POR_ID[id] ?? POR_ID.LAS;
}
