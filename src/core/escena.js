// El digest anual de "el mundo pasó" (9M-lite / 9ML.a, PLAN.md).
//
// Es mundo de cartón con una capa de vida: las otras ligas de tier 1
// resuelven su año en silencio —sin simular un solo split ajeno— y el
// jugador se entera en unas pocas líneas al cierre de cada edad. Quién gana
// depende de `org.fuerza` (el mismo escalar que ya usa `rendimiento.js` para
// el rival); esa fuerza todavía no driftea año a año (9ML.b, sin implementar
// aún), así que hoy "quién es fuerte" es estable pero "quién gana la final"
// no lo es — el sorteo pondera por fuerza, no la decide.
//
// Puro: arma el texto a partir de resultados que `systems/escena.js` ya
// decidió (esa tirada consume `rng`; este módulo no lo toca).

import { hashCadena } from './numeros.js';

// Las ligas de tier 1 que no son la del jugador — "otras ligas", el nombre
// de la subfase. Si el jugador todavía no tiene liga (amateur, tier2/3), o
// no es de tier 1, ninguna se excluye: las seis son "otras" para él.
export function ligasParaDigest(state) {
  return state.mundo.ligas.filter((liga) => liga.tier === 1 && liga.id !== state.career.liga);
}

// El pool para el campeón "del mundo": todas las orgs de tier 1, de cualquier
// liga (incluida la del jugador — Worlds no discrimina por dónde jugaste el
// año regular).
export function todosLosOrgsTier1(state) {
  return state.mundo.ligas
    .filter((liga) => liga.tier === 1)
    .flatMap((liga) => liga.orgs.map((org) => ({ ...org, ligaId: liga.id })));
}

export function lineaDeLiga(liga, campeon, subcampeon, marcador) {
  return `${liga.id}: ${campeon.nombre} campeón (${marcador} a ${subcampeon.nombre}).`;
}

export function lineaDeInternacional(anio, campeon) {
  return `Worlds ${anio}: se lo lleva ${campeon.nombre} (${campeon.ligaId}).`;
}

// Fase 9W: un campeón "al azar pero sin azar" para las ligas que `escena.js`
// no narró este año. Pondera por `org.fuerza` igual que `resolverFinal`, pero
// tira con `hashCadena(clave)` en vez de `rng` — así el ranking mundial (§9W)
// tiene las seis ligas todos los años sin correr el stream (regla de oro).
export function campeonDeterminista(orgs, clave) {
  if (!orgs || orgs.length === 0) {
    return null;
  }
  const peso = (org) => Math.max(1, Math.round(org.fuerza ?? 0));
  const total = orgs.reduce((suma, org) => suma + peso(org), 0);
  let resto = hashCadena(clave) % total;
  for (const org of orgs) {
    resto -= peso(org);
    if (resto < 0) {
      return org;
    }
  }
  return orgs[orgs.length - 1];
}

// El estado `mundo.escenaAnual` que consume el ranking de 9W: el campeón (y
// subcampeón) de CADA liga de tier 1, más el campeón e (un) finalista del
// internacional. Se arma de tres fuentes, ninguna con `rng`:
//   - las ligas que `escena.js` narró este año → el campeón que ya decidió;
//   - las demás (y la tuya, que `ligasParaDigest` siempre excluye) →
//     `campeonDeterminista`;
//   - tu liga, si ganaste un título doméstico este año → tu org.
export function construirEscenaAnual(state, anio, narradas, campeonMundial) {
  const salt = (tipo, id) => `${state.seed}|escena9w|${tipo}|${id}|${anio}`;
  const ligasT1 = state.mundo.ligas.filter((liga) => liga.tier === 1);
  const narradaPorId = new Map(narradas.map((entrada) => [entrada.liga.id, entrada]));
  const ganasteTuLiga = Boolean(state.career.liga)
    && Boolean(state.career.currentOrg)
    && state.career.registro.titulos.some((titulo) => titulo.anio === anio);

  const campeones = {};
  const subcampeones = {};
  for (const liga of ligasT1) {
    if (liga.id === state.career.liga && ganasteTuLiga) {
      campeones[liga.id] = state.career.currentOrg;
      subcampeones[liga.id] = campeonDeterminista(
        liga.orgs.filter((org) => org.nombre !== state.career.currentOrg), salt('sub', liga.id)
      )?.nombre ?? null;
      continue;
    }
    const narrada = narradaPorId.get(liga.id);
    if (narrada) {
      campeones[liga.id] = narrada.campeon.nombre;
      subcampeones[liga.id] = narrada.subcampeon.nombre;
      continue;
    }
    const campeon = campeonDeterminista(liga.orgs, salt('camp', liga.id));
    campeones[liga.id] = campeon?.nombre ?? null;
    subcampeones[liga.id] = campeonDeterminista(
      liga.orgs.filter((org) => org.nombre !== campeon?.nombre), salt('sub', liga.id)
    )?.nombre ?? null;
  }

  const todos = todosLosOrgsTier1(state);
  const finalista = campeonDeterminista(
    todos.filter((org) => org.nombre !== campeonMundial.nombre), salt('finalista', 'mundo')
  );

  return {
    anio,
    campeones,
    subcampeones,
    campeonMundial: campeonMundial.nombre,
    finalistasMundo: [campeonMundial.nombre, finalista?.nombre].filter(Boolean)
  };
}
