import LIGAS from '../data/leagues.json' with { type: 'json' };
import { BALANCE } from '../data/balance.js';

// PLANUI §0.10 H3 (lo que corrige el usuario, 2026-10-16): una liga grande del Mundial es la de ≥
// `mundial.playIn.cuposMinimos` cupos (LCK, LPL, LEC y LCS). Desde ahí, quedar afuera en el Play-In pincha; desde una
// chica, pasarlo es una hazaña. Se lee del archivo, como `esLigaFranquiciada`. Puro: sin rng, sin DOM.
const CUPOS_DE_LIGA = Object.fromEntries(LIGAS.map((liga) => [liga.id, liga.cuposInternacionales ?? 0]));

export function esLigaGrande(ligaId) {
  return (CUPOS_DE_LIGA[ligaId] ?? 0) >= BALANCE.mundial.playIn.cuposMinimos;
}

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

// K6b-F: las ligas franquiciadas (`franquicia: true` en `data/leagues.json`: LCK, LPL, LEC y LCS, CONCEPTO §12.3) no
// tienen descenso. Se lee del archivo, no de la copia del mundo. Puro: sin rng, sin DOM.
const LIGAS_FRANQUICIADAS = new Set(LIGAS.filter((liga) => liga.franquicia === true).map((liga) => liga.id));

export function esLigaFranquiciada(ligaId) {
  return LIGAS_FRANQUICIADAS.has(ligaId);
}
