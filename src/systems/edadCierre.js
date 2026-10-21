import { BALANCE } from '../data/balance.js';
import { resolverOpcion, elegirOpcionAutomatica, decisionDesdeEvento } from './events.js';
import { lineaDePlan } from './practica.js';
import { esPlanValido } from '../core/rutinas.js';
import { getPath, etiquetaCampo } from '../core/selectors.js';
import { calcularContexto, coincideContexto } from '../core/contexto.js';
import { weightedPick } from '../core/rng.js';
import { CARTAS } from '../data/events/cartas/index.js';

export const id = 'edadCierre';

export function esCierreDeEdad(state) {
  return state.player.splitCount % BALANCE.edad.splitsPorEdad === 0;
}

// El resumen del año (nota, titular, viñetas) lo emite `systems/resumenAnio.js`,
// más abajo en `ETAPAS_SPLIT` — necesita `mundo.escenaAnual`/`archirrival` de
// ESTE año, que `escena`/`rivales` todavía no escribieron en este punto del
// split. Acá solo se incrementa la edad y se reparte la mano de cartas que cierra el año.
export function aplicar(state, rng) {
  if (!esCierreDeEdad(state)) {
    return { state, logs: [] };
  }

  const nextState = { ...state, age: state.age + 1 };

  // G2b (una carta por año): la carta es LA decisión del año y frena siempre, también en la cola (K6b-C2): no gasta la
  // parada del año de `core/cola.js`, que queda para lo demás.
  // H2a: todos los años tienen su mano. Siempre hay mazo de dónde sortear (`sortearCarta` relaja hasta encontrar).
  const { state: conMano, evento } = repartirMano(nextState, rng);
  return { state: conMano, logs: [], decision: decisionDeCierre(conMano, evento, 'mano') };
}

// --- H2a (PLANUI §0.10, "el mazo"): la mano del año ---
//
// El mazo vive en `data/events/cartas/*.json` (solo stats). Cada lugar de la mano sortea una rareza (`cartas.probRareza`)
// y, dentro de ella, una carta de tu etapa y tu contexto. Las reglas (todas en `BALANCE.cartas`): el piso (con dos manos
// seguidas sin rara o más, el último lugar sale rara o más), una legendaria como máximo por mano, tres stats principales
// distintos, y las raras o más no se repiten en la carrera (`flags.cartas.vistas`); las comunes decaen. Lo que se vio, las
// manos sin rara y los cambios usados viven en `flags.cartas` (T4: lo inicializa `createInitialState`).

const esRaraOMas = (rareza) => rareza !== BALANCE.cartas.ordenRareza[0];
const esSoloAmateur = (carta) => carta.etapa.length === 1 && carta.etapa[0] === 'amateur';
const principalDe = (carta) => carta.stats[0].stat;

function memoriaDeCartas(state) {
  const { vistas = {}, manosSinRara = 0, cambiosUsados = 0 } = state.flags?.cartas ?? {};
  return { vistas, manosSinRara, cambiosUsados };
}

// Las etapas del mazo en las que estás: la del amateur, o la de tu nivel más el emigrado y el veterano si te tocan.
function etapasDelMazo(state, contexto) {
  if (state.phase === 'amateur') {
    return ['amateur'];
  }
  const etapas = [BALANCE.cartas.etapaDeNivel[contexto.nivel] ?? BALANCE.cartas.etapaDeNivel.libre];
  if (BALANCE.cartas.residenciasEmigrado.includes(contexto.residencia)) {
    etapas.push('emigrado');
  }
  if (BALANCE.cartas.bandasVeterano.includes(contexto.edadBanda) || contexto.etapa === 'declive') {
    etapas.push('veterano');
  }
  return etapas;
}

// De la más exigente a la más relajada: tu etapa y tu contexto; tu etapa; cualquier carta de tu lado (amateur o pro). Se relaja
// la etapa antes de bajar de rareza (la mezcla se sostiene); y solo si ninguna rareza alcanza se deja de pedir un stat
// principal distinto.
function nivelesDeRelajo(state, contexto, etapas) {
  const delLado = (carta) => (state.phase === 'amateur' ? carta.etapa.includes('amateur') : !esSoloAmateur(carta));
  const deTuEtapa = (carta) => carta.etapa.some((etapa) => etapas.includes(etapa));
  return [
    (carta) => deTuEtapa(carta) && coincideContexto(contexto, carta.contexto, state.age),
    deTuEtapa,
    delLado
  ];
}

function sortearCarta(state, contexto, etapas, rareza, enMano, vistas, rng) {
  const niveles = nivelesDeRelajo(state, contexto, etapas);
  const usados = new Set(enMano.map(principalDe));
  // D162 (se queda): una carta cuyo stat principal ya está topado diría "+0" (`seguroDeCarta`, la misma cuenta que la pantalla): no se
  // ofrece, la reemplaza otra. Solo si no queda ninguna que sume se vuelve a aceptar una topada (el mazo nunca se queda sin mano).
  const topada = (carta) => (seguroDeCarta(state, opcionDeCarta(carta))?.valor ?? 1) <= 0;
  for (const sinTopadas of [true, false]) {
    for (const distintos of [true, false]) {
      for (let i = BALANCE.cartas.ordenRareza.indexOf(rareza); i >= 0; i -= 1) {
        for (const aplica of niveles) {
          const candidatas = CARTAS.filter((carta) => carta.rareza === BALANCE.cartas.ordenRareza[i]
            && !enMano.some((elegida) => elegida.id === carta.id)
            && !(esRaraOMas(carta.rareza) && (vistas[carta.id] ?? 0) > 0)
            && (!distintos || !usados.has(principalDe(carta)))
            && (!sinTopadas || !topada(carta))
            && aplica(carta));
          if (candidatas.length > 0) {
            return weightedPick(candidatas, (carta) => (esRaraOMas(carta.rareza) ? 1 : BALANCE.cartas.decaimientoComun ** (vistas[carta.id] ?? 0)), rng);
          }
        }
      }
    }
  }
  throw new Error('el mazo de cartas no tiene ninguna carta para esta mano');
}

function sortearMano(state, memoria, rng) {
  const contexto = calcularContexto(state);
  const etapas = etapasDelMazo(state, contexto);
  const rarezas = BALANCE.cartas.ordenRareza;
  const enMano = [];
  for (let lugar = 0; lugar < BALANCE.cartas.cartasPorMano; lugar += 1) {
    const ultimo = lugar === BALANCE.cartas.cartasPorMano - 1;
    const conPiso = ultimo && memoria.manosSinRara >= BALANCE.cartas.manosSinRaraParaElPiso && !enMano.some((carta) => esRaraOMas(carta.rareza));
    let rareza = weightedPick(conPiso ? rarezas.filter(esRaraOMas) : rarezas, (clave) => BALANCE.cartas.probRareza[clave], rng);
    // Una legendaria como máximo por mano: la segunda baja a la rareza de abajo.
    if (rareza === rarezas[rarezas.length - 1] && enMano.filter((carta) => carta.rareza === rareza).length >= BALANCE.cartas.legendariasPorMano) {
      rareza = rarezas[rarezas.length - 2];
    }
    enMano.push(sortearCarta(state, contexto, etapas, rareza, enMano, memoria.vistas, rng));
  }
  return enMano;
}

// Reparte una mano y la anota en `flags.cartas`: lo que mostró (las raras o más no vuelven), si trajo una rara o más (el
// piso) y los cambios usados. Devuelve el estado y el evento sintético de la mano.
export function repartirMano(state, rng, { cambio = false } = {}) {
  const memoria = memoriaDeCartas(state);
  const cartas = sortearMano(state, memoria, rng);
  const vistas = { ...memoria.vistas };
  for (const carta of cartas) {
    vistas[carta.id] = (vistas[carta.id] ?? 0) + 1;
  }
  const conRara = cartas.some((carta) => esRaraOMas(carta.rareza));
  const flagsCartas = {
    vistas,
    manosSinRara: conRara ? 0 : memoria.manosSinRara + 1,
    cambiosUsados: memoria.cambiosUsados + (cambio ? 1 : 0)
  };
  return { state: { ...state, flags: { ...state.flags, cartas: flagsCartas } }, evento: eventoDeMano(cartas) };
}

const cambiosQuedan = (state) => Math.max(0, BALANCE.cartas.cambiosDeMano - memoriaDeCartas(state).cambiosUsados);

// El evento sintético de la mano (id estable, categoría que ningún otro evento usa). Cada carta es una opción: dos salidas,
// la normal (el rango del dato) y la extra (el mismo rango corrido), y el stat principal sube en las dos al menos su mínimo
// (reglas 7 y 8). El peso es el que usa el bot (`resolverAuto`, T7): el valor de la carta.
function eventoDeMano(cartas) {
  return {
    id: BALANCE.cartas.idEvento,
    category: 'cierre_edad',
    categoria: BALANCE.cartas.categoria,
    title: BALANCE.cartas.titulo,
    description: '',
    weight: 1,
    cooldown: 0,
    contexto: {},
    conditions: [],
    cierreDeEdad: true,
    options: cartas.map(opcionDeCarta)
  };
}

function efectoDeStat(stat, min, max) {
  return { type: 'stat', path: `player.stats.${stat}`, min, max, clamp: [BALANCE.stats.min, BALANCE.stats.max] };
}

function opcionDeCarta(carta) {
  const salida = (suma) => [
    ...carta.stats.map(({ stat, valor }) => efectoDeStat(stat, valor[0] + suma, valor[1] + suma)),
    ...(carta.costo ? [efectoDeStat(carta.costo.stat, carta.costo.valor[0], carta.costo.valor[1])] : [])
  ];
  const valor = carta.stats.reduce((suma, { valor: rango }) => suma + rango[0], 0)
    + (carta.costo ? Math.round((carta.costo.valor[0] + carta.costo.valor[1]) / 2) : 0);
  return {
    id: carta.id,
    label: carta.titulo,
    descripcion: carta.linea,
    weight: Math.max(BALANCE.cartas.pesoMinimoDelBot, valor),
    conditions: [],
    carta: principalDe(carta),
    ...(carta.plan ? { plan: carta.plan } : {}),
    rareza: carta.rareza,
    outcomes: [
      { weight: BALANCE.cartas.pesoSalidaNormal, texto: carta.linea, effects: salida(0) },
      { weight: BALANCE.cartas.pesoSalidaExtra, texto: `${carta.linea}. ${BALANCE.cartas.textoSalidaExtra}`, effects: salida(BALANCE.cartas.sumaSalidaExtra) }
    ]
  };
}

// La pausa del cierre, con la línea del plan en cada opción (si el cierre fija plan). La usa también `core/guardado.js`
// (`migrarDe10`) para rearmar con el texto de hoy un cierre que un guardado viejo dejó parado (regla 15).
export function decisionDeCierre(state, evento, motivo = 'mano') {
  return comoCartaDelAnio(state, evento, conPlanEnCadaOpcion(state, evento, decisionDesdeEvento(state, evento, { franja: 'cierre', slot: 1 })), motivo);
}

// --- G2b (PLANUI §0.9, "una carta por año") ---
//
// Cada opción del cierre declara en `carta` su stat principal (uno de `carta.stats`, los cinco de la ficha) y todos sus
// outcomes lo suben. La carta muestra:
// - el número seguro: el piso de ese stat entre todos los outcomes (la regla de F4), con el tope que deja el clamp y el
//   techo de una lesión en la mecánica (`core/curvas.js:conTechoDeLesion`): lo que muestra es lo que el motor aplica como
//   mínimo. Reemplaza al `seguro` genérico de G2a, que podía caer en el LP o en el hype;
// - a veces un costo a la vista: otro de los cinco que todos los outcomes bajan, con lo que seguro te saca;
// - su rareza (la de la carta, H2a).
export function seguroDeCarta(state, opcion) {
  if (!BALANCE.carta.stats.includes(opcion?.carta)) {
    return null;
  }
  const campo = `player.stats.${opcion.carta}`;
  const actual = getPath(state, campo);
  const piso = Math.min(...opcion.outcomes.map((outcome) => sumaDe(outcome, campo, 'min')));
  let valor = typeof actual === 'number' ? Math.min(piso, topeDe(opcion, campo)[1] - actual) : piso;
  const techo = state.player?.techoLesionMecanica;
  if (opcion.carta === 'mecanica' && techo != null && typeof actual === 'number') {
    valor = Math.min(valor, Math.max(0, techo - actual));
  }
  return { campo, etiqueta: etiquetaCampo(campo), valor: Math.max(0, valor), unidad: '' };
}

export function costoDeCarta(state, opcion) {
  const costos = BALANCE.carta.stats.filter((stat) => stat !== opcion?.carta).map((stat) => {
    const campo = `player.stats.${stat}`;
    const actual = getPath(state, campo);
    const seguro = Math.max(...opcion.outcomes.map((outcome) => sumaDe(outcome, campo, 'max')));
    const valor = typeof actual === 'number' ? Math.max(seguro, topeDe(opcion, campo)[0] - actual) : seguro;
    return { campo, etiqueta: etiquetaCampo(campo), valor };
  }).filter((costo) => costo.valor < 0);
  return costos.length > 0 ? costos.reduce((peor, costo) => (costo.valor < peor.valor ? costo : peor)) : null;
}

function sumaDe(outcome, campo, extremo) {
  return outcome.effects.filter((effect) => effect.type === 'stat' && effect.path === campo)
    .reduce((total, effect) => total + (extremo === 'min' ? Math.min(effect.min, effect.max) : Math.max(effect.min, effect.max)), 0);
}

function topeDe(opcion, campo) {
  for (const outcome of opcion.outcomes) {
    const conClamp = outcome.effects.find((effect) => effect.path === campo && effect.clamp);
    if (conClamp) return conClamp.clamp;
  }
  return [-Infinity, Infinity];
}

// La mano que ve la pantalla: tres cartas (sin descripción de la decisión, sin situación y sin el aviso con %: el número es
// seguro) y, si te quedan, la opción "Otra mano" (no es una carta: la pantalla la pinta como botón).
function comoCartaDelAnio(state, evento, decision, motivo) {
  const deDato = (opcionId) => evento.options.find((opcion) => opcion.id === opcionId);
  const cartas = decision.opciones.map((opcion) => {
    const dato = deDato(opcion.id);
    const seguro = seguroDeCarta(state, dato);
    if (!seguro) {
      return opcion;
    }
    return { ...opcion, seguro, costo: costoDeCarta(state, dato), aviso: null, rareza: dato.rareza ?? BALANCE.cartas.ordenRareza[0] };
  });
  const quedan = cambiosQuedan(state);
  const otra = quedan > 0
    ? [{ id: BALANCE.cartas.idOtraMano, label: BALANCE.cartas.tituloOtraMano, descripcion: '', previa: [], cambio: true, quedan }]
    : [];
  return {
    ...decision,
    titulo: evento.id === BALANCE.cartas.idEvento ? evento.title : decision.titulo,
    descripcion: evento.id === BALANCE.cartas.idEvento ? '' : decision.descripcion,
    opciones: [...cartas, ...otra],
    datos: { ...decision.datos, motivo }
  };
}

// K4c-C (revisión): en la etapa amateur el cierre no fija ni muestra plan: `systems/practica.js` solo entrena en
// `profesional`, y al debutar vale el plan del arranque (el del perfil), igual que el primer año. Las cartas amateur del
// dato no traen `plan`; esto lo sostiene también si alguna lo trajera.
function fijaPlan(state) {
  return state.phase !== 'amateur';
}

// K4c (plan anual): cada opción del cierre dice el plan de práctica que fija para el año que viene (regla 15: la línea
// sale de `lineaDePlan`, la misma cuenta que aplica `systems/practica.js`). La opción del dato trae `plan`.
function conPlanEnCadaOpcion(state, evento, decision) {
  if (!fijaPlan(state)) {
    return decision;
  }
  const planDe = (opcionId) => evento.options.find((opcion) => opcion.id === opcionId)?.plan;
  return {
    ...decision,
    opciones: decision.opciones.map((opcion) => {
      const plan = lineaDePlan(state, planDe(opcion.id));
      return plan ? { ...opcion, plan } : opcion;
    })
  };
}

// La decision de cierre es LA decision de la edad: nunca encadena una segunda, salvo "Otra mano" (H2a): pedir otra mano
// reparte de nuevo (`datos.motivo === 'otra_mano'`) sin resolver nada; hay `cambiosDeMano` por carrera y el bot no la usa.
// K4c (plan anual): la opción elegida fija el plan de práctica del año que viene (`player.planAnual`). Es el único
// lugar donde el plan cambia (y solo en un cierre pro: `fijaPlan`).
export function resolver(state, decision, respuesta, rng) {
  if (respuesta.opcionId === BALANCE.cartas.idOtraMano) {
    return otraMano(state, decision, rng);
  }
  return resolverConCronica(state, decision, respuesta.opcionId, rng, null);
}

function otraMano(state, decision, rng) {
  if (cambiosQuedan(state) <= 0) {
    return { state, logs: [], decision: decisionDeCierre(state, decision.datos.evento, decision.datos.motivo) };
  }
  const { state: conMano, evento } = repartirMano(state, rng, { cambio: true });
  return { state: conMano, logs: [], decision: decisionDeCierre(conMano, evento, BALANCE.cartas.idOtraMano) };
}

// `cronica` (el id del perfil que decidió, K4-C) cuenta el cierre en una línea; `null` es el cierre que decidiste vos.
function resolverConCronica(state, decision, opcionId, rng, cronica = state.player.perfil.actual) {
  const resultado = resolverOpcion(state, decision.datos.evento, opcionId, rng, { cronica });
  const plan = decision.datos.evento.options.find((opcion) => opcion.id === opcionId)?.plan;
  // La mano no entra en la ventana de categorías recientes (`flags.categoriasRecientes`): no le quita lugar a los eventos.
  const sinMano = decision.datos.evento.id === BALANCE.cartas.idEvento
    ? { ...resultado.state, flags: { ...resultado.state.flags, categoriasRecientes: state.flags.categoriasRecientes ?? [] } }
    : resultado.state;
  if (!fijaPlan(state) || !esPlanValido(plan)) {
    return { ...resultado, state: sinMano };
  }
  return { ...resultado, state: { ...sinMano, player: { ...sinMano.player, planAnual: plan } } };
}

export function resolverAuto(state, decision, rng) {
  return elegirOpcionAutomatica(state, decision, rng);
}
