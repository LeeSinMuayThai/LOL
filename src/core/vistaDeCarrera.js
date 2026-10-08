// Lo que la pantalla de la carrera dice del momento (K6a-U). Funciones puras sobre `state`: sin DOM, sin `rng`, sin
// escribir nada, para que corran en Node y `validate.js` pueda ponerles un mutante.
//
// Por qué existe: `state.contexto` y `state.serie` los escribe el motor para SUS decisiones (el contexto se calcula al
// abrir el split; `serie.postSerie` queda prendido hasta el próximo split), no para rotular la pantalla. El ensayo de K6
// los leyó a pelo y la pantalla mintió: la barra decía "Pretemporada" en un partido decisivo y el panel de la serie
// seguía mostrando la final doméstica en pleno Swiss del Mundial (regla 15).

import { BALANCE } from '../data/balance.js';
import {
  filaDeSplitDelAnio, splitEsPrimeroEnPrimera, tituloDePrimeraDelAnio, mundialGanadoEnElAnio, TIER_DE_PRIMERA
} from './registro.js';

// En qué ventana del año está el jugador MIENTRAS decide, no cuando abrió el split. `contexto.ventana` es la del
// arranque del split: el primer split del año es "pretemporada" aunque el partido que frena sea de temporada regular.
export function ventanaVisibleDe(state) {
  const pausada = state.pendiente?.sistemaId ?? null;
  const serie = state.serie;
  if (pausada === 'internacional' || state.internacional?.partidoEnCurso || (serie?.activa && serie.torneo === 'mundial')) {
    return 'internacional';
  }
  if (pausada === 'serie' || serie?.activa) {
    return 'playoffs';
  }
  // El partido decisivo de la tabla se juega en temporada regular (es la misma ventana con la que el motor arma su
  // contenido: `systems/temporada.js`).
  if (pausada === 'temporada') {
    return 'regular';
  }
  return state.contexto?.ventana ?? null;
}

// Qué muestra el panel de la serie: `'serie'` (el bracket doméstico o del Mundial, en curso o recién cerrado), `'swiss'`
// (el Swiss del Mundial, que no es una serie) o `null` (nada: el panel se esconde).
export function tableroDeSerie(state) {
  const { serie, internacional } = state;
  if (internacional?.partidoEnCurso && !serie?.activa) {
    return 'swiss';
  }
  const ultimoLog = state.logs?.[state.logs.length - 1];
  const esPostSerie = Boolean(serie?.postSerie) || Boolean(ultimoLog?.postSerie);
  if (!serie || (!serie.activa && !esPostSerie)) {
    return null;
  }
  // El cierre de la final doméstica no es el momento: si TU equipo ya está en el Mundial de este año y la serie que
  // quedó es la doméstica, lo que se juega es el Mundial.
  if (!serie.activa && serie.torneo !== 'mundial' && internacional?.jugador && internacional.anio === state.calendario?.anio) {
    return null;
  }
  return 'serie';
}

// FASE V (GR-m, PLAN.md §V.6): cómo va el Golden Road del año calendario en curso —1.º en la tabla de los tres splits, campeón de
// la liga de primera y campeón del Mundial, todo en el mismo año—, mientras el año corre. Es la misma regla que `esGoldenRoad`
// (`core/registro.js`): cada ítem usa el predicado del veredicto, así que `completo` coincide con `goldenRoads(registro)` en cuanto
// el año cierra (lo mide el check del Golden Road, regla 15). Puro, sin `rng`, sin escribir nada.
//
// Devuelve `null` en el amateur, fuera de la primera división y retirado (el seguimiento solo existe donde el logro es posible
// de arrancar). Si no, `{ anio, splits: [3 ítems], liga, mundial, vivo, completo }`, y cada ítem es:
//  - `'si'`: ya se cumplió. `'no'`: ya no se puede (el año no es un Golden Road). `'pendiente'`: todavía se decide.
//  - un split se decide con su fila de `porSplit`; sin fila es `'no'` cuando el reloj ya lo pasó (se jugó sin club, o en otro
//    lugar) y `'pendiente'` si es el que viene o el que se está jugando;
//  - la liga se decide si hay título de primera de ese año, o si ya arrancó el Mundial de ese año (`systems/internacional.js` corre
//    después de la final doméstica: ya no hay título que esperar) o si el año cerró;
//  - el Mundial se decide si hay entrada de ese año en `registro.internacionales`, si el torneo de ese año ya tiene campeón, o si
//    el año cerró.
// El año cerró cuando el reloj (`anioBase + floor(splitCount / splitsPorEdad)`) pasó del año: en la pausa del cierre de año
// `atributos` ya subió el `splitCount` pero `calendario.anio` sigue siendo el año que se cierra.
export function seguimientoGoldenRoad(state) {
  if (state.phase !== 'profesional' || state.terminado || state.career.tier !== TIER_DE_PRIMERA) {
    return null;
  }
  const { registro } = state.career;
  const { anio, anioBase } = state.calendario;
  const porAnio = BALANCE.edad.splitsPorEdad;
  const { splitCount } = state.player;
  const cerro = anioBase + Math.floor(splitCount / porAnio) > anio;

  const splits = Array.from({ length: porAnio }, (_, split) => {
    const fila = filaDeSplitDelAnio(registro, anio, split);
    if (fila) {
      return splitEsPrimeroEnPrimera(fila) ? 'si' : 'no';
    }
    return (anio - anioBase) * porAnio + split < splitCount ? 'no' : 'pendiente';
  });

  const mundialDelAnio = state.internacional && state.internacional.anio >= anio ? state.internacional : null;
  const liga = tituloDePrimeraDelAnio(registro, anio) ? 'si' : (cerro || mundialDelAnio ? 'no' : 'pendiente');
  const mundialDecidido = cerro || registro.internacionales.some((entrada) => entrada.anio === anio) || Boolean(mundialDelAnio?.campeon);
  const mundial = mundialGanadoEnElAnio(registro, anio) ? 'si' : (mundialDecidido ? 'no' : 'pendiente');

  const items = [...splits, liga, mundial];
  return {
    anio, splits, liga, mundial,
    vivo: !items.includes('no'),
    completo: items.every((item) => item === 'si')
  };
}
