import { BALANCE } from '../data/balance.js';
import { IDS_ROL } from '../data/roles.js';
import { hashCadena } from './numeros.js';
import { nivelDelJugador } from './ficha.js';

// Fase 9W (PLAN.md §9W): el ranking vivo de los mejores del mundo — el
// equivalente de las listas "Top 20 players" de cada pretemporada.
//
// REGLA DE ORO: cero `rng`. El puntaje es nivel + bono por resultado del año
// + un ruido determinista por `hashCadena`. El churn ("que rote bastante")
// sale de ese ruido, que es constante dentro de un año y se re-tira en el
// borde de año. A diferencia de 9Ma-9Mi, 9W NO corre el stream: el agregado
// de una carrera con la misma seed es idéntico antes y después de la fase.
//
// Puro, sin DOM: `systems/topMundial.js` lo llama cada split y la UI lo pinta.

// ¿La org `orgNombre` fue campeona de su liga / del mundo / finalista del
// mundo en el año que describe `escena`? Devuelve el bono en puntos de nivel
// (0 si `escena` es null — todavía no cerró un año).
export function bonusResultadoDelAnio(orgNombre, ligaId, escena) {
  if (!escena || !orgNombre) {
    return 0;
  }
  const t = BALANCE.topMundial;
  let bono = 0;
  if (escena.campeones?.[ligaId] === orgNombre) {
    bono += t.bonusCampeonLiga;
  }
  if (escena.campeonMundial === orgNombre) {
    bono += t.bonusInternacional;
  } else if (escena.finalistasMundo?.includes(orgNombre)) {
    bono += t.bonusInternacionalFinalista;
  }
  return bono;
}

// El ruido que mueve el corte #20: `hashCadena(seed|handle|anio)` mapeado a
// [-ruidoSpread, +ruidoSpread] con dos decimales de resolución. Mismo handle
// y mismo año → mismo ruido; sólo cambia cuando cambia el año.
export function ruidoDeterminista(seed, handle, anio) {
  const spread = BALANCE.topMundial.ruidoSpread;
  if (spread <= 0) {
    return 0;
  }
  const escala = 100;
  const rango = 2 * spread * escala + 1;
  return ((hashCadena(`${seed}|top|${handle}|${anio}`) % rango) - spread * escala) / escala;
}

// El puntaje de una entidad ya normalizada: `{ handle, org, liga, nivel }`.
export function puntajeRanking(entidad, escenaAnual, escenaAnualPrevia, seed, anio) {
  const t = BALANCE.topMundial;
  return entidad.nivel
    + t.pesoResultado * bonusResultadoDelAnio(entidad.org, entidad.liga, escenaAnual)
    + t.pesoResultado * t.decayResultado * bonusResultadoDelAnio(entidad.org, entidad.liga, escenaAnualPrevia)
    + ruidoDeterminista(seed, entidad.handle, anio);
}

// Desempate estable y determinista: por handle, sin `localeCompare` (que
// depende del locale del runtime).
function cmpHandle(a, b) {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

// El índice org -> { ligaId, regionId } sobre las orgs de tier 1. La tier 2
// de tu región queda afuera: el Top 20 es conversación de primera.
function indiceOrgsTier1(state) {
  const indice = new Map();
  for (const liga of state.mundo.ligas) {
    if (liga.tier !== 1) {
      continue;
    }
    for (const org of liga.orgs) {
      indice.set(org.nombre, { ligaId: liga.id, regionId: liga.regionId });
    }
  }
  return indice;
}

// TODA la población rankeable, puntuada y ordenada, SIN cortar: cada casilla
// de tier 1 (`mundo.planteles`) más el jugador si es RANKEABLE (tier 1 con
// org — refuerza 9Mi). El check de mérito (§9W.6) mide la correlación
// nivel↔rank sobre esto: dentro del Top 20 el nivel está comprimido y el
// ruido manda, pero sobre la población entera el ranking sigue al nivel.
export function rankearPoblacion(state) {
  const anio = state.calendario.anio;
  const escenaAnual = state.mundo.escenaAnual ?? null;
  const escenaAnualPrevia = state.mundo.escenaAnualPrevia ?? null;
  const orgInfo = indiceOrgsTier1(state);
  const rankeable = state.career.tier === 1 && Boolean(state.career.currentOrg);

  const entidades = [];
  for (const [orgNombre, plantel] of Object.entries(state.mundo.planteles ?? {})) {
    const info = orgInfo.get(orgNombre);
    if (!info) {
      continue;
    }
    for (const rol of IDS_ROL) {
      const npc = plantel[rol];
      if (!npc || npc.esJugador) {
        continue;
      }
      // El motor nunca inserta al jugador en `mundo.planteles` (la marca
      // `esJugador` está prevista pero no se escribe): la casilla del jugador
      // sigue teniendo el NPC "al que le sacaste el puesto". Si el jugador es
      // rankeable se lo agrega aparte más abajo, así que acá se saltea su
      // casilla para no contar un fantasma en su propio asiento.
      if (rankeable && orgNombre === state.career.currentOrg && rol === state.player.role) {
        continue;
      }
      entidades.push({
        handle: npc.handle,
        org: orgNombre,
        liga: info.ligaId,
        regionId: npc.regionId ?? info.regionId,
        rol,
        edad: npc.edad,
        nivel: npc.nivel ?? 0,
        rivalDeGeneracion: npc.rivalDeGeneracion === true,
        esJugador: false
      });
    }
  }

  if (rankeable) {
    const info = orgInfo.get(state.career.currentOrg);
    entidades.push({
      handle: state.player.name,
      org: state.career.currentOrg,
      liga: state.career.liga ?? info?.ligaId ?? null,
      regionId: info?.regionId ?? null,
      rol: state.player.role,
      edad: state.age,
      nivel: nivelDelJugador(state),
      rivalDeGeneracion: false,
      esJugador: true
    });
  }

  return entidades
    .map((entidad) => ({
      ...entidad,
      nivel: Math.round(entidad.nivel),
      bonusResultado: bonusResultadoDelAnio(entidad.org, entidad.liga, escenaAnual),
      puntaje: puntajeRanking(entidad, escenaAnual, escenaAnualPrevia, state.seed, anio)
    }))
    .sort((a, b) => b.puntaje - a.puntaje || cmpHandle(a.handle, b.handle));
}

// El Top 20: la población cortada en `tamano`. `previo` (el `topMundial` del
// split anterior) sólo se usa para arrastrar `entroAnio` — desde qué año la
// entrada sostiene su racha en la lista.
export function rankearMundo(state, previo = []) {
  const { tamano } = BALANCE.topMundial;
  const anio = state.calendario.anio;
  const entroPorHandle = new Map(previo.map((entrada) => [entrada.handle, entrada.entroAnio]));
  return rankearPoblacion(state)
    .slice(0, tamano)
    .map((entrada) => ({ ...entrada, entroAnio: entroPorHandle.get(entrada.handle) ?? anio }));
}

// Quién entró y quién salió entre dos fotos del ranking (se llama sólo al
// cierre de edad, contra la foto del cierre anterior).
export function diffDeRanking(antes, despues) {
  const rankAntes = new Map(antes.map((entrada, i) => [entrada.handle, i + 1]));
  const rankDespues = new Map(despues.map((entrada, i) => [entrada.handle, i + 1]));
  const proyectar = (entrada, rank) => ({
    handle: entrada.handle,
    rank,
    esJugador: entrada.esJugador === true,
    rivalDeGeneracion: entrada.rivalDeGeneracion === true
  });
  return {
    entraron: despues
      .filter((entrada) => !rankAntes.has(entrada.handle))
      .map((entrada) => proyectar(entrada, rankDespues.get(entrada.handle))),
    salieron: antes
      .filter((entrada) => !rankDespues.has(entrada.handle))
      .map((entrada) => proyectar(entrada, rankAntes.get(entrada.handle)))
  };
}
