import { desgloseDeFuerza } from './fuerza.js';
import {
  estadoDelMapa, probabilidadDeMapa, fuerzaFinalDeMapa, ajusteDeMinijuegoDeMapa, etiquetaDeRonda,
  fuerzaRivalDeMapa, ajusteDeCharla, proyeccionDelPlan, conPlan, estadoDelProximoMapa
} from './serie.js';
import { probabilidadDeFechaMarcada, fuerzaDeFecha, textoPorQueImporta } from './temporada.js';
import { minijuegoPorId } from './minijuegos.js';

// K2d (PLAN.md "K2d — la previa (pantalla)" y "K2d — decisiones de spec"): la
// previa de un partido — tu fuerza desglosada contra la del rival y la
// probabilidad de ganar. Selector puro: sin `rng`, sin tocar el estado.
//
// UNA SOLA FUENTE. La p de la previa no se recalcula acá: sale de las mismas
// funciones con las que el motor tira — `probabilidadDeFechaMarcada`
// (`core/temporada.js`, la que tira `resolverFechaMarcada`) y
// `probabilidadDeMapa` sobre `estadoDelMapa` (`core/serie.js`, la que tira
// `finalizarMapa`). La fuerza propia es el `total` de `desgloseDeFuerza`
// (`core/fuerza.js`), que ES `fuerzaDePartido`. Lo que la pantalla promete es
// lo que el motor hace (regla 15).
//
// El desglose reparte el total en puntos de fuerza del equipo: tus compañeros,
// vos (tu nivel con tu peso en el equipo), lo que te suma o te resta el meta,
// el campeón, la química del plantel y —si ya se conoce— el momento de la
// fecha o el minijuego del mapa. Las partes suman el total; el rival muestra
// solo su fuerza total, porque el motor no le calcula partes.
//
// `opciones`:
//  - `{ tipo: 'fecha', ajustePartido? }`: la fecha marcada en curso
//    (`career.temporada.fechaEnCurso`). Por defecto, el campeón que eligió el
//    draft corto y el `ajustePartido` del estado.
//  - `{ tipo: 'mapa', campeon, entradaExtra?, minijuego?, resultado? }`: el
//    próximo mapa de la serie con ese campeón. Con `minijuego` (id) y
//    `resultado` (0-1), la p ya corrida por el minijuego: la final, la que se
//    tira. Con `minijuego` y sin `resultado`, la de antes del minijuego y la
//    nota de que el minijuego la mueve. K4-B: `ajustePlan` (lo que el plan de Fearless mueve este mapa) y
//    `charla` (true si se usa la charla del coach) entran a la misma p; el rival es el de ESE mapa
//    (`fuerzaRivalDeMapa`: también quema campeones).
export function previaDePartido(state, opciones) {
  if (opciones?.tipo === 'fecha') {
    return previaDeFecha(state, opciones);
  }
  if (opciones?.tipo === 'mapa') {
    return previaDeMapa(state, opciones);
  }
  throw new Error(`previaDePartido: tipo de partido desconocido "${opciones?.tipo}" (válidos: fecha, mapa)`);
}

function previaDeFecha(state, opciones) {
  const t = state.career.temporada;
  const fecha = t.fechaEnCurso;
  const ajustePartido = opciones.ajustePartido ?? t.ajustePartido ?? 0;

  // El motor juega la fecha con la fuerza del split (`t.fuerzaPropia`), no con
  // una recalculada: el desglose se lee del estado de hoy y su total tiene que
  // dar esa misma fuerza (lo verifica `validate.js`).
  const desglose = desgloseDeFuerza(state);
  const base = t.fuerzaPropia;
  const momento = base * ajustePartido;
  const p = probabilidadDeFechaMarcada(state, { ajustePartido });

  return armarPrevia({
    tipo: 'fecha',
    titulo: `La previa · vs ${fecha.rival}`,
    propio: state.career.currentOrg,
    desglose,
    // K4-A: sin draft, la fecha se juega con el campeón del split (el que ya asumió la fuerza del split).
    extras: { momento },
    fuerzaBase: base,
    fuerzaFinal: fuerzaDeFecha(base, ajustePartido),
    rival: { nombre: fecha.rival, fuerza: fecha.fuerzaRival },
    p,
    campeon: fecha.campeonElegido?.name ?? desglose.campeon,
    // K4-A: por qué frena esta fecha (la clasificación, el archirrival...).
    porQue: textoPorQueImporta(state),
    nota: ajustePartido === 0
      ? 'Si lo que elegís ahora mueve el partido, la probabilidad final sale con el resultado.'
      : null
  });
}

function previaDeMapa(state, opciones) {
  const { serie } = state;
  const entradaExtra = opciones.entradaExtra ?? null;
  const desglose = desgloseDeFuerza(estadoDelMapa(state, opciones.campeon, entradaExtra));
  const base = desglose.total;

  const entrada = opciones.minijuego ? minijuegoPorId(opciones.minijuego) : null;
  const jugado = Boolean(entrada) && Number.isFinite(opciones.resultado);
  const ajusteMini = jugado ? ajusteDeMinijuegoDeMapa(state, entrada, opciones.resultado) : 0;
  const ajustePlan = opciones.ajustePlan ?? 0;
  const ajusteCharla = ajusteDeCharla(opciones.charla === true);
  const ajuste = ajustePlan + ajusteCharla + ajusteMini;
  const p = probabilidadDeMapa(state, base, ajuste);

  let nota = null;
  if (entrada && !jugado) {
    nota = 'El minijuego la mueve: si te sale bien, sube; si te sale mal, baja.';
  } else if (jugado) {
    nota = `Antes del minijuego: ${porcentaje(probabilidadDeMapa(state, base, ajuste - ajusteMini))}%. Con esta se juega el mapa.`;
  }

  return armarPrevia({
    tipo: 'mapa',
    titulo: `La previa · Mapa ${serie.mapaActual + 1} vs ${serie.rival.org}`,
    subtitulo: etiquetaDeRonda(serie.ronda),
    propio: state.career.currentOrg,
    desglose,
    extras: { minijuego: base * ajusteMini, plan: base * ajustePlan, charla: base * ajusteCharla },
    fuerzaBase: base,
    fuerzaFinal: fuerzaFinalDeMapa(base, ajuste),
    rival: { nombre: serie.rival.org, fuerza: fuerzaRivalDeMapa(state), campeon: serie.rivalJuega ?? null },
    p,
    campeon: opciones.campeon,
    nota
  });
}

// Las partes del total, en puntos de fuerza del equipo. Es un reparto para
// mostrar (no entra a ninguna cuenta del motor): compañeros y vos son tu
// rendimiento y el de ellos con su peso; el meta y el campeón, lo que corren
// tu nivel; la química, lo que la sinergia le suma o le resta al equipo.
function aportesDelDesglose(d) {
  const companeros = d.nivelCompaneros * (1 - d.pesoJugador);
  const meta = d.nivel * d.factorJerarquia * (d.factorMeta - 1) * d.pesoJugador;
  const campeon = d.nivel * d.factorJerarquia * d.factorMeta * (d.factorCampeon - 1) * d.pesoJugador;
  return {
    vos: d.rendimiento * d.pesoJugador - meta - campeon,
    companeros,
    meta,
    campeon,
    quimica: d.total - d.bruto
  };
}

const FILAS = [
  { clave: 'vos', etiqueta: 'Vos', signo: false },
  { clave: 'companeros', etiqueta: 'Tus compañeros', signo: false },
  { clave: 'meta', etiqueta: 'El meta', signo: true },
  { clave: 'campeon', etiqueta: 'El campeón', signo: true },
  { clave: 'quimica', etiqueta: 'La química', signo: true },
  { clave: 'momento', etiqueta: 'El momento', signo: true, opcional: true },
  { clave: 'plan', etiqueta: 'El plan', signo: true, opcional: true },
  { clave: 'charla', etiqueta: 'La charla del coach', signo: true, opcional: true },
  { clave: 'minijuego', etiqueta: 'El minijuego', signo: true, opcional: true }
];

function armarPrevia({ tipo, titulo, subtitulo = null, porQue = null, propio, desglose, extras, fuerzaBase, fuerzaFinal, rival, p, campeon, nota }) {
  const aportes = aportesDelDesglose(desglose);
  aportes.campeon += extras.campeon ?? 0;
  aportes.momento = extras.momento ?? 0;
  aportes.minijuego = extras.minijuego ?? 0;
  aportes.plan = extras.plan ?? 0;
  aportes.charla = extras.charla ?? 0;

  const filas = FILAS
    .filter((fila) => !fila.opcional || aportes[fila.clave] !== 0)
    .map((fila) => ({
      clave: fila.clave,
      etiqueta: fila.clave === 'campeon' && campeon ? `El campeón (${campeon})` : fila.etiqueta,
      valor: aportes[fila.clave],
      texto: fila.signo ? conSigno(aportes[fila.clave]) : String(Math.round(aportes[fila.clave]))
    }));

  return {
    tipo,
    titulo,
    subtitulo,
    porQue,
    desglose,
    aportes,
    filas,
    fuerzaBase,
    fuerzaFinal,
    propio: { nombre: propio ?? 'Tu equipo', fuerza: fuerzaFinal, texto: String(Math.round(fuerzaFinal)) },
    rival: { ...rival, texto: String(Math.round(rival.fuerza)) },
    p,
    porcentaje: porcentaje(p),
    textoProbabilidad: `${porcentaje(p)}% de ganar`,
    nota
  };
}

// La previa de la pausa que el juego ya hace: la fecha marcada (el momento) y, en una serie, el draft o el minijuego de un mapa. `null` si
// la decisión no es antes de un partido. En un draft, `opciones` trae la p de
// cada campeón (la tarjeta muestra la del primero de la lista, el mejor por el
// criterio del motor). `resultadoMinijuego`: la previa ya corrida por el
// minijuego que se acaba de jugar.
export function previaDeDecision(state, decision, { resultadoMinijuego, charla = false } = {}) {
  const datos = decision?.datos ?? {};
  if (state.serie?.activa) {
    if (datos.motivo === 'plan' && decision.opciones?.length > 0) {
      return previaDelPlan(state, decision);
    }
    const delMapa = {
      tipo: 'mapa',
      campeon: datos.campeonElegido,
      entradaExtra: datos.entradaExtra ?? null,
      ajustePlan: datos.ajustePlan ?? 0
    };
    if (datos.motivo === 'decisivo' && decision.opciones?.length > 0) {
      const porOpcion = decision.opciones.map((opcion) => ({
        id: opcion.id,
        previa: previaDePartido(state, { ...delMapa, charla: opcion.id === 'charla' })
      }));
      const base = porOpcion.find((o) => o.id === 'sinCharla') ?? porOpcion[0];
      return conOpciones(base.previa, porOpcion, porOpcion.length > 1 ? 'La charla del coach la sube: es una sola por temporada.' : null);
    }
    if (datos.motivo === 'minijuego' && minijuegoPorId(datos.minijuego)?.efecto?.tipo === 'mapa') {
      return previaDePartido(state, {
        ...delMapa,
        charla: charla === true && datos.charla?.disponible === true,
        minijuego: datos.minijuego,
        resultado: resultadoMinijuego
      });
    }
    return null;
  }

  const t = state.career?.temporada;
  if (!t?.activa || !t.fechaEnCurso) {
    return null;
  }
  // K4-A: la fecha marcada ya no tiene draft; el subtítulo es el rótulo del
  // partido ("Se define la clasificación", "El archirrival"...).
  const previa = previaDePartido(state, { tipo: 'fecha' });
  return datos.etiqueta ? { ...previa, subtitulo: datos.etiqueta } : previa;
}

// K4-B: la tarjeta del plan de Fearless. Arriba, la previa del mapa que viene con el plan del coach; en cada
// opción, la p de cada mapa que declara su proyección (`proyeccionDelPlan`, la misma secuencia que juega el motor)
// y la de ganar la serie con esas p.
function previaDelPlan(state, decision) {
  const coach = proyeccionDelPlan(state, 'coach');
  const proximo = estadoDelProximoMapa(conPlan(state, 'coach'));
  const previa = previaDePartido(proximo, { tipo: 'mapa', campeon: coach.mapas[0].campeon });
  const opciones = decision.opciones.map((opcion) => {
    const proyeccion = proyeccionDelPlan(state, opcion.id);
    const pMapas = proyeccion.mapas.map((m) => m.p);
    const porMapa = proyeccion.mapas
      .map((m) => `${m.decisivo ? 'el decisivo ' : ''}${porcentaje(m.p)}%`)
      .join(' · ');
    return {
      id: opcion.id,
      p: proyeccion.pSerie,
      pMapas,
      porcentaje: porcentaje(proyeccion.pSerie),
      texto: `Mapa a mapa: ${porMapa}. La serie: ${porcentaje(proyeccion.pSerie)}%.`
    };
  });
  return {
    ...previa,
    nota: 'Cada plan dice con cuánto llegás a cada mapa. El decisivo se juega solo si llegan 2-2 (1-1 en un Bo3).',
    opciones
  };
}

function conOpciones(previa, porOpcion, nota = 'Depende del pick: cada campeón dice con cuánto llegás.') {
  return {
    ...previa,
    nota,
    opciones: porOpcion.map(({ id, previa: suya }) => ({
      id, p: suya.p, porcentaje: suya.porcentaje, texto: suya.textoProbabilidad
    }))
  };
}

// La probabilidad con la que se jugó un partido, para la tarjeta del resultado
// (el log de la fecha marcada y el de cada mapa llevan la `p` que se tiró).
// `null` si el log no la trae.
export function textoDeProbabilidadJugada(log) {
  if (!Number.isFinite(log?.p)) {
    return null;
  }
  const final = `Salieron con ${porcentaje(log.p)}% de ganar`;
  return Number.isFinite(log.pSinMomento) && porcentaje(log.pSinMomento) !== porcentaje(log.p)
    ? `${final} (el momento la movió desde ${porcentaje(log.pSinMomento)}%).`
    : `${final}.`;
}

// La p en porcentaje entero. Una p que no es 0 ni 1 nunca se muestra como 0%
// o 100%: sería prometer algo que el motor no hace.
export function porcentaje(p) {
  const redondeado = Math.round(p * 100);
  if (p > 0 && p < 1) {
    return Math.min(99, Math.max(1, redondeado));
  }
  return redondeado;
}

function conSigno(valor) {
  const redondeado = Math.round(valor);
  if (redondeado === 0) {
    return '±0';
  }
  return redondeado > 0 ? `+${redondeado}` : `−${Math.abs(redondeado)}`;
}
