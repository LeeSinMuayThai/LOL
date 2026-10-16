import { calcularContexto } from './contexto.js';

// Cuánto puede pedirte el split, según cuánto cambió respecto de cómo arrancó.
//
// La regla de la fase 2: novedad = densidad. Un split de temporada regular con
// el mismo equipo no tiene por qué pesar lo mismo que el split en el que
// debutás o el que cierra los playoffs — si todos piden lo mismo, una carrera
// larga (30, 40, 50 splits) se vuelve tarea antes de llegar a la mitad.
//
// La comparación es contra `state.contexto`: el snapshot que `systems/contexto.js`
// toma al arrancar el split, ANTES de que roster, campeones y rendimiento
// corran. Contra eso se mide el contexto EN VIVO en el momento en que se llama
// — así el presupuesto ve lo que ya cambió en lo que va de este split, no lo
// que cambió en el anterior (trampa T2: el contexto se calcula en vivo).
export function tipoDeSplit(state) {
  const antes = state.contexto;

  // El primer split de la carrera no tiene "antes": todo es nuevo.
  if (!antes) {
    return 'denso';
  }

  const ahora = calcularContexto(state);

  const cambioDeEtapa = antes.etapa !== ahora.etapa;
  const cambioDeNivel = antes.nivel !== ahora.nivel;
  const seLeMurioElMain = !antes.marcas.includes('main_muerto') && ahora.marcas.includes('main_muerto');
  const esPlayoffs = ahora.ventana === 'playoffs';

  if (cambioDeEtapa || cambioDeNivel || seLeMurioElMain || esPlayoffs) {
    return 'denso';
  }

  const nadaSeMovio = antes.momentum === ahora.momentum && antes.estatus === ahora.estatus;
  return nadaSeMovio ? 'comprimido' : 'normal';
}

// H1a (PLANUI §0.10, H1.5, T5): se fueron `esSplitEventful` y `hayPresupuesto`, el cupo de interrupciones de la fase 9Rf. El
// evento del split tiene su cupo propio (`BALANCE.eventos.paradasPorSplit`, `systems/events.js`) y ya no lee el de las pausas.
