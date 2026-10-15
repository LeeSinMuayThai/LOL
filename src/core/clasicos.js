import CLASICOS from '../data/clasicos.json' with { type: 'json' };

// G3c (PLANUI §0.9): los clásicos del mercado. Pares de orgs rivales por liga (`data/clasicos.json`); cada org tiene a lo
// sumo un clásico. Solo ligas de tier 1: los clubes de tier 2 se inventan por seed (`core/state.js`) y no tienen nombre fijo
// que se pueda emparejar en un dato. Puro.
export function rivalClasico(liga, org) {
  for (const [a, b] of CLASICOS[liga] ?? []) {
    if (a === org) {
      return b;
    }
    if (b === org) {
      return a;
    }
  }
  return null;
}
