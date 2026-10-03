import { BALANCE } from '../data/balance.js';
import { usaLaCharlaEnAuto } from '../systems/serie.js';
import { hashCadena } from '../core/numeros.js';
import { elegirRutinaAuto } from '../systems/practica.js';

// Constantes de medición para la heurística de los bots (PLAN.md §K.5 K0).
// Los pesos reflejan la magnitud declarada en la previa ('baja', 'media', 'alta').
export const PESO_MAGNITUD = {
  baja: 1,
  media: 2,
  alta: 3
};

// Penalización aplicada a opciones con riesgo 'ruleta' al calcular la previa para bots con criterio.
export const PENALIZACION_RULETA = 0.5;

// Qué le contestan los bots a un minijuego (`{ resultado }` en [0, 1]): `criterio` y el lado "bien" del
// contrafáctico de agencia.js juegan con 0,85; `malas` y el lado "mal" con 0,15. Antes vivían duplicados
// en estrategias.js y agencia.js: un solo lugar, para que los dos instrumentos no se desincronicen.
export const RESULTADO_MINIJUEGO_BIEN = 0.85;
export const RESULTADO_MINIJUEGO_MAL = 0.15;

// Divisor del hash de `azar` para el minijuego: `hash % 10001 / 10000` cubre el [0, 1] cerrado.
const PASOS_RESULTADO_AZAR = 10000;

// Una oferta (o una opción como "quedarte" en un traspaso) sin `tier`: peor que cualquier liga real.
const TIER_SIN_DATO = 99;

// Valora el impacto neto proyectado por la previa de una opción.
// Suma items con '+' y resta con '-', ponderando por magnitud ('baja'=1, 'media'=2, 'alta'=3),
// y penaliza el riesgo 'ruleta'. Es puro y determinista.
export function puntuarPrevia(opcion) {
  if (!opcion) return 0;
  let puntaje = 0;
  for (const item of opcion.previa ?? []) {
    const signo = item.signo === '+' ? 1 : (item.signo === '-' ? -1 : 0);
    const magnitud = PESO_MAGNITUD[item.magnitud] ?? 1;
    puntaje += signo * magnitud;
  }
  if (opcion.riesgo === 'ruleta') {
    puntaje -= PENALIZACION_RULETA;
  }
  return puntaje;
}

// Compara dos ofertas de mercado. Orden: 1) mejor liga (tier MENOR primero: tier 1 > 2 > 3), 2) a igualdad
// de tier, mayor `proyeccionJerarquia.hasta`, 3) a igualdad, mayor salario anual en USD.
// Devuelve positivo si ofertaA es mejor que ofertaB, negativo si es peor, 0 si empatan. `malas` la usa al
// revés (argmin): "la peor por el mismo criterio".
//
// Por qué el tier va primero y no la jerarquía proyectada (la regla original de K0-A era al revés): la
// renovación siempre trae `hasta` = tu jerarquía actual, y cualquier mudanza la resetea a ~20-38
// (`jerarquiaAlFichar`), así que ordenar por `hasta` primero hace que `criterio` renueve casi siempre y se
// quede donde firmó primero. Medido en 100 carreras x 60 splits con la regla vieja: renovaba el 97,4% de
// las veces que había renovación (`equilibrado`: 23,4%) y elegía un tier peor que el mejor disponible en el
// 33% de las decisiones de mercado (`equilibrado`: 5,1%). Medido en 800 carreras x 60 splits, mismas seeds:
// con la regla vieja `criterio` llegaba a tier 1 el 63,1% y quedaba estancado en tier 2/3 el 14,8%; con
// tier primero, 77,6% y 0,3% (`equilibrado`: 78,8% y 0,8%) — o sea que ese hueco lo causaba la heurística
// del bot, no el motor. La tensión de CONCEPTO §7 (el "cuarto nombre de un gigante" contra ser titular en
// un club más chico) sigue viva, pero ahora ADENTRO de cada tier, que es donde un jugador que sabe de LoL
// la resolvería con la jerarquía.
//
// Lo que `criterio` hace HOY con esta regla, y lo que NO hace (medido en 400 carreras x 60 splits, seeds 1-400, con
// `correrCarrera` y el espía de `resolverAuto` de validate.js; K0-A, 2ª revisión. Es una foto: si cambia el motor hay
// que volver a medir, trampa T6):
//  - Sigue renovando casi siempre: elige la renovación en el 88,5% de las decisiones de mercado que traen una (1.220 de
//    1.378), contra el 26,1% de `equilibrado` (331 de 1.270). Sale de la regla y no es un bug: la renovación trae `hasta` =
//    tu jerarquía actual y las demás ofertas del mismo tier arrancan en ~20-38. El bot es "quedate donde estás salvo que
//    haya un tier mejor".
//  - Con ofertas nunca elige un tier peor que el mejor disponible (0 de 2.383 decisiones; `equilibrado` lo hace en 114 de
//    2.428, el 4,7%).
//  - En los traspasos a mitad de contrato (`mercado:traspaso`) nunca elige "quedarse": 0 de 488 decisiones, las 488 aceptan.
//    La opción `quedarse` no trae `tier` (TIER_SIN_DATO, peor que cualquier liga), así que siempre pierde contra `aceptar`.
//  - NO usa "la probabilidad del propio motor" que pide la spec de K0 (§K.5): en el mercado compara tier, jerarquía y
//    salario; en el resto usa solo el signo y la magnitud de la previa y una penalización fija a la ruleta.
//  - Le delega a `resolverAuto` el 29,4% de sus decisiones (19.098 de 65.022): el momento del partido (`temporada:momento`,
//    el 12,0%, sin previa en las opciones: decisión de diseño conocida), las rutinas (`practica` y `amateur:reparto`, el
//    14,0%: usa la que elige el sistema) y algunos tipos sin previa del amateur, del retiro, de la salud y del servicio
//    militar (el 3,4%). La lista cerrada de lo que delega está en el check "K0 criterio y malas: solo delegan en
//    resolverAuto..." de validate.js.
export function compararOfertasMercado(ofertaA, ofertaB) {
  const tierA = ofertaA.tier ?? TIER_SIN_DATO;
  const tierB = ofertaB.tier ?? TIER_SIN_DATO;
  if (tierA !== tierB) {
    return tierB - tierA; // tier menor (ej 1) supera a tier mayor (ej 2)
  }

  const jerA = ofertaA.proyeccionJerarquia?.hasta ?? 0;
  const jerB = ofertaB.proyeccionJerarquia?.hasta ?? 0;
  if (jerA !== jerB) {
    return jerA - jerB;
  }

  const salA = ofertaA.salarioAnualUSD ?? 0;
  const salB = ofertaB.salarioAnualUSD ?? 0;
  return salA - salB;
}

export function esDecisionDeRutina(decision) {
  return decision.datos?.rutinas?.length > 0;
}

export function esDecisionDeMinijuego(decision) {
  return decision.presentacion === 'minijuego' || decision.datos?.motivo === 'minijuego';
}

// K4-B: las pausas de la serie como plan. El plan de Fearless trae en cada opción la p de ganar la serie que
// declara (`pSerie`, la de su proyección): `criterio` elige la más alta (lee la tarjeta), `malas` la más baja. En
// el mapa decisivo, `criterio` gasta la charla del coach solo en la final o el internacional (la regla del camino
// headless, `usaLaCharlaEnAuto`); `malas` nunca.
export function esDecisionDePlanDeSerie(decision) {
  return decision.datos?.motivo === 'plan' || decision.datos?.motivo === 'decisivo';
}

function respuestaDePlanDeSerie(state, decision, peor) {
  if (decision.datos.motivo === 'plan') {
    const elegida = decision.opciones.reduce((acum, opcion) => (
      (peor ? opcion.pSerie < acum.pSerie : opcion.pSerie > acum.pSerie) ? opcion : acum
    ));
    return { opcionId: elegida.id };
  }
  const charla = !peor && decision.opciones.some((opcion) => opcion.id === 'charla') && usaLaCharlaEnAuto(state.serie.ronda);
  return { opcionId: charla ? 'charla' : 'sinCharla' };
}

function charlaEnMinijuego(state, decision, peor) {
  return decision.datos?.charla?.disponible ? { charla: !peor && usaLaCharlaEnAuto(state.serie?.ronda) } : {};
}

export function esDecisionDeMercado(decision) {
  return decision.presentacion === 'mercado'
    || (decision.opciones?.[0]?.salarioAnualUSD !== undefined && decision.datos?.motivo !== 'traspaso');
}

export function esDecisionConPrevia(decision) {
  return Array.isArray(decision.opciones)
    && decision.opciones.length > 0
    && decision.opciones.some((opcion) => opcion.previa !== undefined || opcion.riesgo !== undefined);
}

function rutinaConMejorPuntaje(rutinas, puntuar) {
  return rutinas.reduce((mejor, rutina) => (puntuar(rutina) > puntuar(mejor) ? rutina : mejor));
}

function mejorRutina(decision, puntuar) {
  return { opcionId: rutinaConMejorPuntaje(decision.datos.rutinas, puntuar).id };
}

// K4-D: la parada de la pretemporada trae, además de las ofertas, la preparación del receso (`datos.preparacion`) y se
// contesta una sola vez: la oferta (o "esperar") con la regla del bot, y la rutina (`rutinaId`) con la regla de rutinas
// del bot, la misma que usaba cuando la práctica frenaba aparte. Sin preparación, la respuesta queda como está.
function conRutina(decision, respuesta, elegirRutina) {
  const rutinas = decision.datos?.preparacion?.rutinas;
  return rutinas?.length > 0 ? { ...respuesta, rutinaId: elegirRutina(rutinas) } : respuesta;
}

// Lo que ranked y malas puntúan de una rutina (la agresiva de siempre).
const puntajeAgresiva = (rutina) => (rutina.reparto.ranked ?? 0) + rutina.extra * 2;

// Cuanto le falta a cada barra para estar tranquila. Se usa para elegir la
// rutina que mejor tapa los agujeros.
function deficits(state) {
  const a = BALANCE.amateur;
  return {
    estudiar: Math.max(0, a.avisoUmbral - state.player.studies),
    familia: Math.max(0, a.trustReferencia - state.player.familyTrust),
    dormir: Math.max(0, a.autoSuenoObjetivo - state.player.sleep),
    ranked: 0
  };
}

// Genera un entero pseudoaleatorio puro para una decisión específica sin consumir el stream de RNG.
export function hashParaDecision(state, sistema, decision) {
  const idDec = decision.id ?? decision.datos?.motivo ?? decision.presentacion ?? decision.titulo ?? 'decision';
  const clave = `${state.seed}|${state.player.splitCount}|${sistema?.id ?? 'sis'}|${idDec}|${state.logs?.length ?? 0}`;
  return hashCadena(clave);
}

// Bot `criterio`: proxy de un jugador que lee la pantalla y elige con criterio. Sus límites medidos (renueva ~89%, nunca
// se queda en un traspaso, no usa la probabilidad del motor, delega el ~29% de las decisiones) están documentados arriba,
// junto a `compararOfertasMercado`.
function responderCriterio(sistema, state, decision, rng) {
  if (esDecisionDeRutina(decision)) {
    return sistema.resolverAuto(state, decision, rng);
  }
  if (esDecisionDeMinijuego(decision)) {
    return { resultado: RESULTADO_MINIJUEGO_BIEN, ...charlaEnMinijuego(state, decision, false) };
  }
  if (esDecisionDePlanDeSerie(decision)) {
    return respuestaDePlanDeSerie(state, decision, false);
  }
  if (esDecisionDeMercado(decision)) {
    const rutinaDelBot = (rutinas) => elegirRutinaAuto(state, rutinas, rng).id;
    if (decision.opciones.length === 0) {
      return conRutina(decision, { negociar: 'esperar' }, rutinaDelBot);
    }
    const mejor = decision.opciones.reduce((acum, op) => (
      compararOfertasMercado(op, acum) > 0 ? op : acum
    ));
    return conRutina(decision, { opcionId: mejor.id }, rutinaDelBot);
  }
  if (esDecisionConPrevia(decision)) {
    const mejor = decision.opciones.reduce((acum, op) => (
      puntuarPrevia(op) > puntuarPrevia(acum) ? op : acum
    ));
    return { opcionId: mejor.id };
  }
  return sistema.resolverAuto(state, decision, rng);
}

// Bot `malas`: elige lo peor según la misma previa y juega mal los minijuegos.
function responderMalas(sistema, state, decision, rng) {
  if (esDecisionDeRutina(decision)) {
    return mejorRutina(decision, puntajeAgresiva);
  }
  if (esDecisionDeMinijuego(decision)) {
    return { resultado: RESULTADO_MINIJUEGO_MAL, ...charlaEnMinijuego(state, decision, true) };
  }
  if (esDecisionDePlanDeSerie(decision)) {
    return respuestaDePlanDeSerie(state, decision, true);
  }
  if (esDecisionDeMercado(decision)) {
    const rutinaDelBot = (rutinas) => rutinaConMejorPuntaje(rutinas, puntajeAgresiva).id;
    if (decision.opciones.length === 0) {
      return conRutina(decision, { negociar: 'esperar' }, rutinaDelBot);
    }
    const peor = decision.opciones.reduce((acum, op) => (
      compararOfertasMercado(op, acum) < 0 ? op : acum
    ));
    return conRutina(decision, { opcionId: peor.id }, rutinaDelBot);
  }
  if (esDecisionConPrevia(decision)) {
    const peor = decision.opciones.reduce((acum, op) => (
      puntuarPrevia(op) < puntuarPrevia(acum) ? op : acum
    ));
    return { opcionId: peor.id };
  }
  return sistema.resolverAuto(state, decision, rng);
}

// Bot `azar`: elige uniforme sin tocar el stream de RNG inyectado.
function responderAzar(sistema, state, decision, rng) {
  const hash = hashParaDecision(state, sistema, decision);

  if (esDecisionDeRutina(decision)) {
    const rutinas = decision.datos.rutinas;
    const indice = hash % rutinas.length;
    return { opcionId: rutinas[indice].id };
  }
  if (esDecisionDeMinijuego(decision)) {
    const resultado = (hash % (PASOS_RESULTADO_AZAR + 1)) / PASOS_RESULTADO_AZAR;
    return { resultado };
  }
  if (esDecisionDeMercado(decision)) {
    const opcionesCandidatas = [
      ...decision.opciones.map((op) => ({ opcionId: op.id })),
      { negociar: 'esperar' }
    ];
    const indice = hash % opcionesCandidatas.length;
    return conRutina(decision, opcionesCandidatas[indice], (rutinas) => rutinas[hashCadena(`${hash}|rutina`) % rutinas.length].id);
  }
  if (esDecisionConPrevia(decision)) {
    const indice = hash % decision.opciones.length;
    return { opcionId: decision.opciones[indice].id };
  }
  return sistema.resolverAuto(state, decision, rng);
}

export const ESTRATEGIAS = {
  // Reacciona a las barras que tiene en rojo. Es el criterio que vive en cada
  // sistema (`resolverAuto`) y el mas parecido a alguien jugando con cabeza.
  equilibrado: null,

  // Se juega la carrera entera al ranked: siempre la rutina mas agresiva.
  ranked: (sistema, state, decision, rng) => (
    esDecisionDeRutina(decision)
      ? mejorRutina(decision, (rutina) => (rutina.reparto.ranked ?? 0) + rutina.extra * 2)
      : sistema.resolverAuto(state, decision, rng)
  ),

  // Cuida el colegio, la familia y el sueño antes que el LP.
  prudente: (sistema, state, decision, rng) => {
    if (!esDecisionDeRutina(decision)) {
      return sistema.resolverAuto(state, decision, rng);
    }
    const falta = deficits(state);
    // Tapa los agujeros primero, y con lo que sobra grindea: sin ese desempate
    // el prudente nunca juega ranked y no lo ficha nadie.
    return mejorRutina(decision, (rutina) => (
      Object.entries(rutina.reparto).reduce((suma, [destino, bloques]) => suma + bloques * (falta[destino] ?? 0), 0) * 10
      + (rutina.reparto.ranked ?? 0)
      - rutina.extra * BALANCE.amateur.suenoPorBloqueRobado
    ));
  },

  // Fase K0 (PLAN.md §K.5): los tres bots para calibración y medición de agencia.
  criterio: responderCriterio,
  azar: responderAzar,
  malas: responderMalas
};

export const NOMBRES_ESTRATEGIA = Object.keys(ESTRATEGIAS);
