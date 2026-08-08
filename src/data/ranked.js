// La escalera de ranked tal como funciona hoy en el juego.
//
// Siete tiers con 4 divisiones de 0-100 LP cada una, y tres tiers ápice sin
// divisiones donde el LP se acumula sin techo. Emerald existe desde 2023, y en
// el mismo paquete Riot eliminó las series de promoción: el ascenso es por LP
// puro (CLAUDE.md, precisión de dominio).

export const TIERS = [
  { id: 'iron', label: 'Hierro', orden: 0 },
  { id: 'bronze', label: 'Bronce', orden: 1 },
  { id: 'silver', label: 'Plata', orden: 2 },
  { id: 'gold', label: 'Oro', orden: 3 },
  { id: 'platinum', label: 'Platino', orden: 4 },
  { id: 'emerald', label: 'Esmeralda', orden: 5 },
  { id: 'diamond', label: 'Diamante', orden: 6 },
  { id: 'master', label: 'Máster', orden: 7, apice: true },
  { id: 'grandmaster', label: 'Gran Máster', orden: 8, apice: true },
  { id: 'challenger', label: 'Challenger', orden: 9, apice: true }
];

export const TIERS_CON_DIVISION = TIERS.filter((tier) => !tier.apice);
export const PRIMER_TIER_APICE = TIERS.find((tier) => tier.apice);

const POR_ID = Object.fromEntries(TIERS.map((tier) => [tier.id, tier]));

export function tierPorId(id) {
  return POR_ID[id] ?? null;
}

// Los números romanos son parte de cómo se lee un rango: "Diamante II", no
// "Diamante 2".
const ROMANOS = ['IV', 'III', 'II', 'I'];

export function romano(division) {
  return ROMANOS[4 - division] ?? String(division);
}
