import LIGAS from '../data/leagues.json' with { type: 'json' };

// El nombre que ve el jugador de una liga ("LCK CL", "EMEA Masters"), no su id ("LCK_CL"). Es la única fuente de
// verdad: el motor la usa en sus logs, titulares y descripciones, y la UI la reexporta (`ui/formatoUi.js`). Un id que
// no es de una liga conocida (una zona de tier 3, por ejemplo) vuelve tal cual. Puro: sin rng, sin DOM.
const NOMBRE_VISIBLE_DE_LIGA = Object.fromEntries(LIGAS.map((liga) => [liga.id, liga.nombre]));

export function nombreVisibleDeLiga(ligaId) {
  return NOMBRE_VISIBLE_DE_LIGA[ligaId] ?? ligaId;
}

// Para un objeto "liga o zona" (`ligaOZonaDeCarrera`): el tier 3 trae `nombreLiga` ("un torneo chico de la región");
// una liga real, su id, que se traduce a su nombre.
export function nombreVisibleDeLigaOZona(liga) {
  return liga.nombreLiga ?? nombreVisibleDeLiga(liga.id);
}
