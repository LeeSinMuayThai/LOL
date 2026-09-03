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

// Fase 9Rf: ¿este split es de los eventful (cupo de interrupciones alto) o de
// rutina (cupo bajo)? Se compara la foto de contexto del split ANTERIOR
// (`state.contexto`, que `contexto.js` todavía no pisó porque `presupuesto`
// corre antes) contra el contexto en vivo. Un debut, un cambio de tier, que se
// te muera el main o un split de playoffs son eventful; el resto es rutina. NO
// usa el eje momentum/estatus de `tipoDeSplit`: cambian con cada resultado y
// harían "eventful" a casi todo.
export function esSplitEventful(state) {
  const antes = state.contexto;
  const ahora = calcularContexto(state);
  if (!antes) {
    return true;
  }
  return antes.etapa !== ahora.etapa
    || antes.nivel !== ahora.nivel
    || ahora.ventana === 'playoffs'
    || (!antes.marcas.includes('main_muerto') && ahora.marcas.includes('main_muerto'));
}

// ¿Le queda al split cupo para otra interrupción? El cupo lo fija
// `systems/presupuesto.js` al arrancar el split y `core/pipeline.js` descuenta
// uno en cada pausa. Fuera de la fase profesional no hay tope (el prólogo
// amateur ya está comprimido por la fase 7).
export function hayPresupuesto(state) {
  const p = state.presupuesto;
  if (!p) {
    return true;
  }
  return p.gastadas < p.total;
}
