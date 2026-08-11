import { BALANCE } from '../data/balance.js';
import { ROLES } from '../data/roles.js';
import { gauss } from './rng.js';

// TRASPASO.md §4 (líneas 560-660): lognormal a propósito — mediana << media,
// como el salario real (LEC mediana ~€165k, media €240k: pocos contratos
// enormes estiran el promedio sin mover a la mayoría). Fórmula y números ya
// investigados ahí; no se vuelven a discutir (PLAN.md §9.2).
//
// `edad` y `esImport` no entran acá: gatean SI hay oferta (sesgo etario,
// `margenImport`) en `systems/mercado.js`, no CUÁNTO paga la que ya existe.
export function salarioDeOferta(liga, { rol, jerarquia, hype }, rng) {
  const { mercado } = BALANCE;
  const { medianaUSD, sigma, minimoUSD } = liga.salario;

  const mult = Math.exp(gauss(0, sigma, rng))
    * ROLES[rol].factorSalario
    * (mercado.salarioJerarquiaBase + (jerarquia / 100) * mercado.salarioJerarquiaPeso)
    * (mercado.salarioHypeBase + (hype / 100) * mercado.salarioHypePeso);

  return Math.max(minimoUSD, Math.round(medianaUSD * mult));
}
