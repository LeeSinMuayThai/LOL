// Lo que la pantalla de la carrera dice del momento (K6a-U). Funciones puras sobre `state`: sin DOM, sin `rng`, sin
// escribir nada, para que corran en Node y `validate.js` pueda ponerles un mutante.
//
// Por qué existe: `state.contexto` y `state.serie` los escribe el motor para SUS decisiones (el contexto se calcula al
// abrir el split; `serie.postSerie` queda prendido hasta el próximo split), no para rotular la pantalla. El ensayo de K6
// los leyó a pelo y la pantalla mintió: la barra decía "Pretemporada" en un partido decisivo y el panel de la serie
// seguía mostrando la final doméstica en pleno Swiss del Mundial (regla 15).

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
