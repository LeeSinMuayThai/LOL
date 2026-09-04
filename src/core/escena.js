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
