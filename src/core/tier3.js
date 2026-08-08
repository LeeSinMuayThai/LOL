import { gauss, pick, chance } from './rng.js';
import { clamp } from './numeros.js';
import { BALANCE } from '../data/balance.js';
import { EJES } from '../data/contextos.js';

// El tier 3 no es una liga: es "cualquier equipo chico de tu región", efímero
// y sin nombre que nadie vaya a reconocer un año después. `CLAUDE.md` permite
// ligas reales, pero a este nivel exige equipos inventados — y es también la
// única forma honesta de representarlo: no hay un tier 3 real y estable que
// investigar, cambia de temporada a temporada.
//
// El mismo generador de nombres sirve para el tier 2: las ligas de desarrollo
// (NACL, LDL, ERL...) son reales como CIRCUITO, pero sus rosters exactos
// rotan temporada a temporada y no están investigados con la firmeza que
// pide CLAUDE.md para nombrar un equipo real. Se generan igual que el tier 3,
// con un rango de fuerza más alto.

const PREFIJOS_ORG = [
  'Rift', 'Nova', 'Ecos', 'Fénix', 'Cripta', 'Vórtice', 'Aurora', 'Cenit',
  'Ápex', 'Umbra', 'Prisma', 'Eclipse', 'Nexo', 'Rasgo', 'Fragua', 'Onda',
  'Espectro', 'Vigía', 'Enclave', 'Cuadro'
];

const SUFIJOS_ORG = [
  'Gaming', 'Esports', 'Academy', 'Rebels', 'Uprising', 'Collective',
  'Squad', 'Force', 'Legion', 'Circuit'
];

export function generarNombreOrg(rng, usados) {
  for (let intento = 0; intento < PREFIJOS_ORG.length; intento += 1) {
    const nombre = `${pick(PREFIJOS_ORG, rng)} ${pick(SUFIJOS_ORG, rng)}`;
    if (!usados.has(nombre)) {
      usados.add(nombre);
      return nombre;
    }
  }
  // Fallback deterministico si el espacio de nombres se saturara.
  const nombre = `${pick(PREFIJOS_ORG, rng)} ${usados.size}`;
  usados.add(nombre);
  return nombre;
}

function generarOrgsDeFuerza(rng, usados, cantidad, media, spread, min, max) {
  return Array.from({ length: cantidad }, () => ({
    nombre: generarNombreOrg(rng, usados),
    fuerza: Math.round(clamp(gauss(media, spread, rng), min, max))
  }));
}

// Un puñado de equipos chicos por región, generados una vez al arrancar la
// carrera. Es donde ficha todo el mundo la primera vez: nadie debuta
// directamente en una liga real (CONCEPTO §2 dice "sos el rookie, no decidís
// casi nada", y eso empieza acá, no en primera).
export function generarOrgsTier3(rng, usados) {
  const t = BALANCE.tier3;
  return Object.fromEntries(
    EJES.region.map((region) => [
      region,
      generarOrgsDeFuerza(rng, usados, t.cantidadPorRegion, t.fuerzaMedia, t.fuerzaSpread, t.fuerzaMin, t.fuerzaMax)
    ])
  );
}

export function orgsTier3DeLaRegion(state, region) {
  return state.mundo.tier3PorRegion[region] ?? [];
}

// El equipo chico se elige por sorteo parejo entre los de tu región: a este
// nivel no hay "el mejor te quiere más", son todos iguales de precarios.
export function elegirOrgTier3(state, rng) {
  return pick(orgsTier3DeLaRegion(state, state.mundo.regionIdOrigen), rng);
}

// Firmar con un tier 3 no toca `phase` ni `splitFichaje`: eso lo decide quien
// llama (amateur.js la primera vez, systems/competitivo.js cuando te levantan
// después de que se disuelve el anterior).
export function asignarOrgTier3(state, org) {
  return {
    ...state,
    career: {
      ...state.career,
      tier: 3,
      liga: null,
      currentOrg: org.nombre,
      orgs: [...state.career.orgs, org.nombre]
    }
  };
}
