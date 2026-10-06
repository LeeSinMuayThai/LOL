import { BALANCE } from '../data/balance.js';
import { usaLaCharlaEnAuto } from '../systems/serie.js';
import { hashCadena } from '../core/numeros.js';
import { previaDeDecision } from '../core/previaDePartido.js';
import { calibreDeLiga } from '../core/demanda.js';
import { nivelDelJugador } from '../core/ficha.js';
import { ofertaDeImportPosible } from '../systems/mercado.js';

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

// K5c-M: desde este nivel (`nivelDelJugador`) `criterio` se sabe élite y, entre ofertas del mismo tier, va al club más
// fuerte (`oferta.plantelEnLiga.fuerza`) antes que a la jerarquía proyectada. Es el medio de la rampa de élite del motor
// con sus valores de partida (`BALANCE.mercado.elite`: f = 0 en 80, f = 1 en 90), fijo a propósito: es la vara del
// instrumento y no se mueve cuando el barrido mueve las perillas del motor. En 100 carreras de `criterio`, el nivel de
// las decisiones de mercado de tier 1 tenía p50 ~82 y p75 ~88: élite es el tercio de arriba.
export const NIVEL_ELITE_CRITERIO = 85;

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
//    el 12,0%, sin previa en las opciones: decisión de diseño conocida), las rutinas (`amateur:reparto`, y hasta K4c `practica`, el
//    14,0%: usa la que elige el sistema) y algunos tipos sin previa del amateur, del retiro, de la salud y del servicio
//    militar (el 3,4%). La lista cerrada de lo que delega está en el check "K0 criterio y malas: solo delegan en
//    resolverAuto..." de validate.js.
//  - K6c: el plan del año del amateur (`amateur:plan_amateur`) lo contesta con su regla (`respuestaDePlanAmateur`), igual
//    que `malas` y `azar`: no está en la lista de lo que delega, así que si un bot lo delegara el check se pone en rojo.
//
// K5c-M: con `{ elite: true }` (lo pasa `criterio` cuando su nivel llega a `NIVEL_ELITE_CRITERIO`), a igualdad de tier va
// primero el club más fuerte (`plantelEnLiga.fuerza`, sin dato = 0) y después la jerarquía y el salario. Sin la marca la
// regla es la de siempre (`malas` no la pasa). Una estrella elige el plantel que gana, no el puesto que manda.
//
// K5c-H, cada uno juega en su casa: con `{ casa }` (el contexto de `contextoDeCasaCriterio`, lo pasa `criterio`), a igualdad
// de tier 1 va antes la clase de la liga (`claseDeLigaCriterio`): 3) con nivel de élite (`NIVEL_ELITE_CRITERIO`), un import a
// una liga más fuerte que la de tu región si tu nivel llega a su calibre (la regla de `aceptaImport`: "va de import a una más
// fuerte por el calibre, como hoy"; sin la marca de élite, en 400 carreras G0 Brasil pasaba del 75% al 43% de sus splits de
// tier 1 en casa, el 41% en la LCP, que no es "una liga más fuerte" sino una lateral), 2) tu liga de tier 1, 1) una liga que no
// es más débil que la tuya actual, 0) una más débil. O sea: toma tier 1 en casa si se la ofrecen y no deja su liga de tier 1 por
// una más débil. Sin `casa` la regla es la de antes (`malas` no lo pasa). El bot es
// el instrumento: esto no tiene perilla neutra (no lee el BALANCE del motor), y mueve los checks medidos con `criterio`.
export function compararOfertasMercado(ofertaA, ofertaB, { elite = false, casa = null } = {}) {
  const tierA = ofertaA.tier ?? TIER_SIN_DATO;
  const tierB = ofertaB.tier ?? TIER_SIN_DATO;
  if (tierA !== tierB) {
    return tierB - tierA; // tier menor (ej 1) supera a tier mayor (ej 2)
  }

  if (casa) {
    const claseA = claseDeLigaCriterio(ofertaA, casa);
    const claseB = claseDeLigaCriterio(ofertaB, casa);
    if (claseA !== claseB) {
      return claseA - claseB;
    }
  }

  if (elite) {
    const fuerzaA = ofertaA.plantelEnLiga?.fuerza ?? 0;
    const fuerzaB = ofertaB.plantelEnLiga?.fuerza ?? 0;
    if (fuerzaA !== fuerzaB) {
      return fuerzaA - fuerzaB;
    }
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

// K6c: el plan del año del amateur (`amateur:plan_amateur`). Cada opción trae los números de su carta: `lpSemana` (el LP por
// semana de la previa) y lo que arriesga en el año (`riesgoCasa`, 0-1, y `semanaDeuda`, la semana en la que entra en deuda de
// sueño o `null`). Los tres bots lo contestan con su regla, sin delegar en `resolverAuto` (que devuelve la propuesta del perfil):
// - `criterio`, "el que más acerca a pro sin riesgo grande": el de más LP entre los que no suman deuda de sueño en el año y no
//   arriesgan en casa más de `RIESGO_TOLERADO_PLAN_CRITERIO` por encima del más seguro (si ninguno, el más seguro);
// - `malas`, el peor por la misma vara: el que más arriesga en el año (en casa; a igual riesgo, el que entra antes en deuda de
//   sueño y después el de más LP), la misma imprudencia de su regla de la semana (la rutina más agresiva). "El de menos LP"
//   lo dejaba sin subir nunca y, con la prueba sin dado que nunca pasa (juega con 0,15), no llegaba a pro el 98,5%;
// - `azar`, uno parejo por el hash de la decisión (sin tocar el stream).
// `RIESGO_TOLERADO_PLAN_CRITERIO` es del instrumento, no del juego: es la regla del bot, como `NIVEL_ELITE_CRITERIO`.
export const RIESGO_TOLERADO_PLAN_CRITERIO = 0.15;

export function esDecisionDePlanAmateur(decision) {
  return decision.datos?.motivo === 'plan_amateur';
}

function respuestaDePlanAmateur(decision, peor) {
  const { opciones } = decision;
  if (peor) {
    const deuda = (op) => (op.semanaDeuda === null ? Infinity : op.semanaDeuda);
    const masRiesgosa = (a, b) => (a.riesgoCasa !== b.riesgoCasa ? a.riesgoCasa > b.riesgoCasa
      : deuda(a) !== deuda(b) ? deuda(a) < deuda(b) : a.lpSemana > b.lpSemana);
    return { opcionId: opciones.reduce((acum, op) => (masRiesgosa(op, acum) ? op : acum)).id };
  }
  const minimo = Math.min(...opciones.map((op) => op.riesgoCasa));
  const tolerables = opciones.filter((op) => op.semanaDeuda === null && op.riesgoCasa <= minimo + RIESGO_TOLERADO_PLAN_CRITERIO);
  if (tolerables.length === 0) {
    return { opcionId: opciones.reduce((acum, op) => (op.riesgoCasa < acum.riesgoCasa ? op : acum)).id };
  }
  return { opcionId: tolerables.reduce((acum, op) => (op.lpSemana > acum.lpSemana ? op : acum)).id };
}

// K6c-fix, sexta pasada: el que grindea sin dormir de amateur, la carrera que se lesiona ("la lesión, solo en el amateur", decisión del
// usuario 2026-10-06). En el plan del año elige un plan con deuda de sueño que llega al riesgo físico (`semanaRiesgoFisico`; si
// ninguno llega, uno con deuda), el de menos riesgo en casa (a igual riesgo, el que llega antes): el castigo de la familia le cortaba
// la carrera antes de lesionarse. Rechaza las ofertas (`esperar_mejor_oferta`): firmar resetea la deuda (`firmarConEquipo`) y la
// carrera sale del caso. En la parada de la semana sigue con su plan, salvo la de la mentalidad en rojo, donde elige la opción que la
// cuida. Lo demás, `resolverAuto`. Medido (1200 × 60, carreras con lesión leve / grave / `lesionado` / retiro por lesión): así,
// 149 / 23 / 19 / 0; firmando y con el plan de más LP, 18 / 3 / 2 / 0. NO está en `ESTRATEGIAS`: es una vara de medir la
// cobertura de la lesión, no un bot de agencia.
export function responderQueGrindea(sistema, state, decision, rng) {
  if (decision.datos?.motivo === 'oferta' && decision.opciones.some((op) => op.id === 'esperar_mejor_oferta')) {
    return { opcionId: 'esperar_mejor_oferta' };
  }
  if (esDecisionDePlanAmateur(decision)) {
    const conDeuda = decision.opciones.filter((op) => op.semanaDeuda != null);
    const fisicos = conDeuda.filter((op) => op.semanaRiesgoFisico != null);
    const candidatos = fisicos.length > 0 ? fisicos : conDeuda;
    const semana = (op) => op.semanaRiesgoFisico ?? Infinity;
    const mejor = (a, b) => (b.riesgoCasa < a.riesgoCasa || (b.riesgoCasa === a.riesgoCasa && semana(b) < semana(a)) ? b : a);
    if (candidatos.length > 0) return { opcionId: candidatos.reduce(mejor).id };
  }
  if (decision.datos?.motivo === 'reparto' && state.phase === 'amateur') {
    const plan = state.flags.anioAmateur?.rutinaId;
    const id = decision.datos.porMentalidad ? decision.datos.cuida : plan;
    if (id && decision.opciones.some((op) => op.id === id)) return { opcionId: id };
  }
  return sistema.resolverAuto(state, decision, rng);
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

// Revisión de K5: la pausa del 2-2 del Swiss del Mundial (`internacional:swiss`): usar la charla del coach ahora o
// guardarla. La previa de la tarjeta (`previaDeDecision`) trae por opción la p con la que se tira el Bo1: `criterio`
// elige la más alta (lee la tarjeta), `malas` la más baja. La misma regla que el plan de la serie con su `pSerie`.
export function esDecisionDeSwiss(decision) {
  return decision.datos?.motivo === 'swiss';
}

function respuestaDeSwiss(state, decision, peor) {
  const { opciones } = previaDeDecision(state, decision);
  const elegida = opciones.reduce((acum, opcion) => ((peor ? opcion.p < acum.p : opcion.p > acum.p) ? opcion : acum));
  return { opcionId: elegida.id };
}

function charlaEnMinijuego(state, decision, peor) {
  return decision.datos?.charla?.disponible ? { charla: !peor && usaLaCharlaEnAuto(state.serie?.ronda) } : {};
}

// K4c (paso 1): la regla de `criterio` en las bifurcaciones de carrera (los eventos con un efecto de carrera real,
// K4-C2: `ofertaDeImport`, `cambiarRol`, `retirarse`). Antes puntuaba la previa de stats —que esos efectos no traen— y
// aceptaba casi todo cambio de línea (52% de sus carreras) sin mudarse ni retirarse nunca. Ahora lee la carrera, como un
// jugador, con lecturas puras del estado (cero `rng`: el stream del juego no se mueve distinto que antes):
//  - import: lo acepta si la liga de destino tiene más calibre (`calibreDeLiga`, la vara del mercado) que la actual y su
//    nivel alcanza ese calibre: va a una liga más exigente solo si le da el nivel. (No sirve `dificultad` de `leagues.json`:
//    mide cuánto cuesta ganar el Mundial desde esa región, y es inversa al calibre: LCK, la más fuerte, tiene la mínima.)
//    Sin liga actual, el calibre de partida es 0;
//  - cambio de línea: solo si no queda peor. Mide la maestría media del pool: la línea nueva trae `roster.cambioDeRol
//    .tamanoPool` campeones recién aprendidos (`practica.maestriaCampeonNuevo`), salvo la vuelta a la línea de origen,
//    que restaura el pool guardado en `flags.rolDeOrigen`. Si el efecto no cambia nada (o no se sabe el pool), lo rechaza;
//  - retirarse: no mientras el mercado le ofrezca su tier (`flags.splitsSinOfertaEnTier` en 0: esta pretemporada hubo
//    una oferta de su tier o mejor). `malas` hace lo contrario de las tres.
export const TIPOS_DE_EFECTO_DE_CARRERA = ['ofertaDeImport', 'cambiarRol', 'retirarse'];

// Los efectos de carrera (únicos por tipo) que la opción `opcionId` de un evento puede traer en cualquiera de sus
// resultados. Vacío si la decisión no es de un evento o la opción no tiene ninguno.
export function efectosDeCarreraDeOpcion(decision, opcionId) {
  const opcion = decision.datos?.evento?.options?.find((candidata) => candidata.id === opcionId);
  if (!opcion) {
    return [];
  }
  const porTipo = new Map();
  for (const outcome of opcion.outcomes) {
    for (const effect of outcome.effects) {
      if (TIPOS_DE_EFECTO_DE_CARRERA.includes(effect.type) && !porTipo.has(effect.type)) {
        porTipo.set(effect.type, effect);
      }
    }
  }
  return [...porTipo.values()];
}

// K5c-H: lo que `criterio` lee del mundo para la clase de liga de una oferta: tu liga de tier 1 (la de tu región de
// origen), el calibre de cada liga de tier 1 (`calibreDeLiga`, la vara del asiento), el de tu liga actual si jugás tier 1, y
// tu nivel. `null` en un estado sin mundo (los fixtures sintéticos de los checks del bot): ahí la regla es la de antes. Puro.
export function contextoDeCasaCriterio(state) {
  if (!state.mundo?.ligas) {
    return null;
  }
  const ligasTier1 = state.mundo.ligas.filter((liga) => liga.tier === 1);
  const calibres = Object.fromEntries(ligasTier1.map((liga) => [liga.id, calibreDeLiga(liga)]));
  const casa = ligasTier1.find((liga) => liga.regionId === state.mundo.regionIdOrigen) ?? null;
  const actual = ligasTier1.find((liga) => liga.id === state.career.liga) ?? null;
  return {
    ligaCasa: casa?.id ?? null,
    calibres,
    calibreCasa: casa ? calibres[casa.id] : null,
    calibreActual: actual ? calibres[actual.id] : null,
    nivel: nivelDelJugador(state)
  };
}

// K5c-H: la clase de la liga de una oferta de tier 1 para `criterio` (ver `compararOfertasMercado`). 0 para lo que no es
// tier 1 o no trae liga.
export function claseDeLigaCriterio(oferta, casa) {
  const calibre = oferta.tier === 1 ? casa.calibres[oferta.liga] : undefined;
  if (calibre === undefined) {
    return 0;
  }
  if (casa.nivel >= NIVEL_ELITE_CRITERIO && casa.calibreCasa !== null && calibre > casa.calibreCasa + BALANCE.mercado.casa.margenImportElite
    && casa.nivel >= calibre) {
    return 3;
  }
  if (oferta.liga === casa.ligaCasa) {
    return 2;
  }
  return casa.calibreActual === null || calibre >= casa.calibreActual ? 1 : 0;
}

function maestriaMediaDelPool(pool) {
  return pool?.length > 0 ? pool.reduce((suma, campeon) => suma + campeon.mastery, 0) / pool.length : null;
}

function ligaDelEstado(state, ligaId) {
  return state.mundo.ligas.find((liga) => liga.id === ligaId) ?? null;
}

export function aceptaImport(state, ligas) {
  const posible = ofertaDeImportPosible(state, ligas);
  if (!posible.posible) {
    return false;
  }
  const actual = ligaDelEstado(state, state.career.liga);
  const calibreDestino = calibreDeLiga(posible.liga);
  return calibreDestino > (actual ? calibreDeLiga(actual) : 0) && nivelDelJugador(state) >= calibreDestino;
}

export function aceptaCambioDeLinea(state, rol) {
  const rolViejo = state.player.role;
  const origen = state.flags.rolDeOrigen;
  const rolNuevo = rol === 'origen' ? origen?.rol : (typeof rol === 'string' ? rol : rol?.[rolViejo]);
  if (!rolNuevo || rolNuevo === rolViejo) {
    return false;
  }
  const actual = maestriaMediaDelPool(state.player.championPool);
  const nueva = rol === 'origen' ? maestriaMediaDelPool(origen?.pool) : BALANCE.practica.maestriaCampeonNuevo;
  return actual !== null && nueva !== null && nueva >= actual;
}

export function aceptaRetirarse(state) {
  return state.flags.splitsSinOfertaEnTier > 0;
}

export function aceptaEfectoDeCarrera(state, efecto) {
  if (efecto.type === 'ofertaDeImport') {
    return aceptaImport(state, efecto.liga);
  }
  if (efecto.type === 'cambiarRol') {
    return aceptaCambioDeLinea(state, efecto.rol);
  }
  return aceptaRetirarse(state);
}

// `null` si la decisión no es una bifurcación de carrera. Si lo es: las opciones de carrera que `criterio` acepta (o, con
// `peor`, las que rechazaría: `malas` hace lo contrario) tienen prioridad; si no hay ninguna, se elige entre las que no
// son de carrera; y dentro del grupo, la mejor (o la peor) por la previa, como siempre.
function respuestaDeBifurcacion(state, decision, peor) {
  const opciones = (decision.opciones ?? []).map((opcion) => {
    const efectos = efectosDeCarreraDeOpcion(decision, opcion.id);
    return { opcion, esDeCarrera: efectos.length > 0, acepta: efectos.every((efecto) => aceptaEfectoDeCarrera(state, efecto)) };
  });
  if (!opciones.some((entrada) => entrada.esDeCarrera)) {
    return null;
  }
  const quiere = opciones.filter((entrada) => entrada.esDeCarrera && (peor ? !entrada.acepta : entrada.acepta));
  const resto = opciones.filter((entrada) => !entrada.esDeCarrera);
  const grupo = quiere.length > 0 ? quiere : (resto.length > 0 ? resto : opciones);
  const elegida = grupo.reduce((acum, entrada) => {
    const mejor = peor
      ? puntuarPrevia(entrada.opcion) < puntuarPrevia(acum.opcion)
      : puntuarPrevia(entrada.opcion) > puntuarPrevia(acum.opcion);
    return mejor ? entrada : acum;
  });
  return { opcionId: elegida.opcion.id };
}

// K5-C: la bifurcación del final por mercado (`systems/mercado.js`): "bajás de tier" (o "seguís buscando", si nadie
// ofrece) contra "colgás el mouse". Va antes que `esDecisionDeMercado` en cada bot.
export function esDecisionDeFinPorMercado(decision) {
  return decision.datos?.motivo === 'fin_mercado';
}

export function esDecisionDeMercado(decision) {
  return decision.presentacion === 'mercado'
    || (decision.opciones?.[0]?.salarioAnualUSD !== undefined && decision.datos?.motivo !== 'traspaso');
}

export function esDecisionConPrevia(decision) {
  // K6a-A: la semana amateur trae previa (con su número) para la carta y para el perfil, pero los bots siguen eligiendo la
  // rutina como antes de K6a-A (`resolverAuto` del sistema o su regla de rutinas): no es la previa de un evento.
  if (esDecisionDeRutina(decision)) {
    return false;
  }
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

// K4c (plan anual): la pretemporada ya no trae la preparación del receso (K4-D la juntaba con el mercado): la práctica
// la fija el cierre de año, que cada bot contesta con su regla de eventos. Las paradas del mercado se contestan solo con
// la oferta (o "esperar"), con la misma regla de siempre.

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
// junto a `compararOfertasMercado`. En las bifurcaciones de carrera (un evento con `ofertaDeImport`, `cambiarRol` o
// `retirarse`) aplica la regla de K4c (ver `TIPOS_DE_EFECTO_DE_CARRERA`): antes las puntuaba por una previa que esos efectos
// no traen y aceptaba el 47-52% de las veces un cambio de línea.
function responderCriterio(sistema, state, decision, rng) {
  if (esDecisionDeRutina(decision)) {
    return sistema.resolverAuto(state, decision, rng);
  }
  if (esDecisionDeMinijuego(decision)) {
    return { resultado: RESULTADO_MINIJUEGO_BIEN, ...charlaEnMinijuego(state, decision, false) };
  }
  if (esDecisionDePlanAmateur(decision)) {
    return respuestaDePlanAmateur(decision, false);
  }
  if (esDecisionDePlanDeSerie(decision)) {
    return respuestaDePlanDeSerie(state, decision, false);
  }
  if (esDecisionDeSwiss(decision)) {
    return respuestaDeSwiss(state, decision, false);
  }
  if (esDecisionDeFinPorMercado(decision)) {
    // La regla del headless: joven, baja (o espera); desde `edadAutoAceptaVeredicto`, acepta el veredicto. K5c-R: la
    // variante de la presión de tier 2 (`datos.variante`) va por la misma regla: joven sigue en tier 2, veterano se retira.
    // K5c (cierre): escrita acá, espejo de la de `malas`, y no delegada en `resolverAuto`. Es una bifurcación con elección
    // real (seguir/bajar/esperar o colgar el mouse), y el check "K0 criterio y malas: solo delegan..." exige que `criterio`
    // la conteste con su propia regla. Elige lo mismo que `opcionAutoFinPorMercado` (systems/mercado.js): no cambia el stream.
    const opcionId = state.age >= BALANCE.retiro.edadAutoAceptaVeredicto ? 'retirarse' : decision.opciones[0].id;
    return { opcionId };
  }
  if (esDecisionDeMercado(decision)) {
    if (decision.opciones.length === 0) {
      return { negociar: 'esperar' };
    }
    const contexto = { elite: nivelDelJugador(state) >= NIVEL_ELITE_CRITERIO, casa: contextoDeCasaCriterio(state) };
    const mejor = decision.opciones.reduce((acum, op) => (
      compararOfertasMercado(op, acum, contexto) > 0 ? op : acum
    ));
    return { opcionId: mejor.id };
  }
  const bifurcacion = respuestaDeBifurcacion(state, decision, false);
  if (bifurcacion) {
    return bifurcacion;
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
  if (esDecisionDePlanAmateur(decision)) {
    return respuestaDePlanAmateur(decision, true);
  }
  if (esDecisionDePlanDeSerie(decision)) {
    return respuestaDePlanDeSerie(state, decision, true);
  }
  if (esDecisionDeSwiss(decision)) {
    return respuestaDeSwiss(state, decision, true);
  }
  if (esDecisionDeFinPorMercado(decision)) {
    // Lo peor de los dos lados: joven, cuelga el mouse con una oferta en la mano; veterano, se aferra un año más.
    const opcionId = state.age >= BALANCE.retiro.edadAutoAceptaVeredicto ? decision.opciones[0].id : 'retirarse';
    return { opcionId };
  }
  if (esDecisionDeMercado(decision)) {
    if (decision.opciones.length === 0) {
      return { negociar: 'esperar' };
    }
    const peor = decision.opciones.reduce((acum, op) => (
      compararOfertasMercado(op, acum) < 0 ? op : acum
    ));
    return { opcionId: peor.id };
  }
  const bifurcacion = respuestaDeBifurcacion(state, decision, true);
  if (bifurcacion) {
    return bifurcacion;
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
  if (esDecisionDePlanAmateur(decision)) {
    return { opcionId: decision.opciones[hash % decision.opciones.length].id };
  }
  if (esDecisionDeFinPorMercado(decision)) {
    const indice = hash % decision.opciones.length;
    return { opcionId: decision.opciones[indice].id };
  }
  if (esDecisionDeMercado(decision)) {
    const opcionesCandidatas = [
      ...decision.opciones.map((op) => ({ opcionId: op.id })),
      { negociar: 'esperar' }
    ];
    const indice = hash % opcionesCandidatas.length;
    return opcionesCandidatas[indice];
  }
  if (esDecisionConPrevia(decision)) {
    const indice = hash % decision.opciones.length;
    return { opcionId: decision.opciones[indice].id };
  }
  return sistema.resolverAuto(state, decision, rng);
}

// K4c (paso 3a): `criterio` con el plan de la serie NEUTRO, para el check del Bo5 del bloque A. `criterio` contesta cada
// plan con la opción de mayor `pSerie` (la mejor): ese check sumaba la agencia del plan al nivel, y cualquier plan que pese
// (el ×3 de K4c) lo saca de su banda por construcción. Este bot contesta cada plan (`serie:plan` e `internacional:plan`,
// `datos.motivo === 'plan'`) con la opción de `pSerie` MEDIANA (con un número par de opciones, la mediana inferior) y
// todo lo demás como `criterio`. NO está en `ESTRATEGIAS`: no es un bot de agencia, es una vara de medir, y `todas` lo
// correría de más.
export function criterioConPlanNeutro(sistema, state, decision, rng) {
  if (decision.datos?.motivo === 'plan') {
    const porPSerie = [...decision.opciones].sort((a, b) => a.pSerie - b.pSerie);
    return { opcionId: porPSerie[Math.floor((porPSerie.length - 1) / 2)].id };
  }
  return responderCriterio(sistema, state, decision, rng);
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
