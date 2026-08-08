import { BALANCE } from '../data/balance.js';
import { orgsTier3DeLaRegion } from './tier3.js';

// El accessor uniforme de "en qué compito y contra quién", sea tier 1, tier 2
// o tier 3. Antes de esto, `roster.js` y `rendimiento.js` buscaban la liga
// directo en `state.mundo.ligas`, lo que asumía que SIEMPRE había una liga
// real de por medio — cierto mientras el único fichaje posible era directo a
// primera. Con tier 3 (que no es una liga, es un puñado de equipos por
// región) esa asunción se rompe, y sin este módulo cada sistema iba a tener
// que reinventar la misma rama tier3-vs-el-resto por su cuenta.

// La liga real de la carrera (tier 1 o tier 2). `null` en tier 3: ahí no hay
// liga, hay región.
export function ligaDeCarrera(state) {
  if (!state.career.liga) {
    return null;
  }
  return state.mundo.ligas.find((liga) => liga.id === state.career.liga) ?? null;
}

// Uniforme para cualquier sistema que necesite "contra quién compito": para
// tier 1 y 2 es la liga real con su lista de orgs; para tier 3 es un objeto
// sintético con la misma forma, armado con los equipos chicos de la región de
// origen. Nunca viaja a un internacional (cuposInternacionales: 0) y no tiene
// prestigio real: el que le da su nivel de competencia es `BALANCE.tier3`.
export function ligaOZonaDeCarrera(state) {
  const liga = ligaDeCarrera(state);
  if (liga) {
    return liga;
  }
  if (state.career.tier === 3) {
    return {
      id: 'tier3',
      nombreLiga: 'un torneo chico de la región',
      tier: 3,
      regionId: state.mundo.regionIdOrigen,
      orgs: orgsTier3DeLaRegion(state, state.mundo.regionIdOrigen),
      cuposInternacionales: 0,
      prestigio: BALANCE.tier3.fuerzaMedia
    };
  }
  return null;
}

export function orgDeCarrera(state) {
  const zona = ligaOZonaDeCarrera(state);
  return zona?.orgs.find((org) => org.nombre === state.career.currentOrg) ?? null;
}
