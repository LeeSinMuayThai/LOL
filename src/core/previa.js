// La consecuencia, antes de elegir (PLAN.md §12.3, fase 12d). Puro: cero RNG,
// cero import de `systems/` — recibe los pesos ya calculados (`pesoEfectivo`,
// `systems/events.js`) para no mentir cuando los stats corren la
// probabilidad de un outcome (CONCEPTO §8), y corre igual en Node.
import { BALANCE } from '../data/balance.js';
import { etiquetaCampo } from './selectors.js';
import { deltaCorto } from './formato.js';

// K6a-A ("rng clicker"): la fila de previa dice el número que el motor ya conoce (la media ponderada del efecto), como
// el plan del cierre de año ("Mecánica ~+4"). El ajuste de partido no lleva número: su escala (una fracción de la p)
// no se lee como puntos de barra. Si la media redondea a cero, queda el signo solo.
const UNIDAD_DE_FAMILIA = { stat: '', ladder: ' LP', pool_aprender: '', pool_maestria: '' };

function textoDeFila(path, familia, promedio) {
  const etiqueta = etiquetaCampo(path);
  const unidad = UNIDAD_DE_FAMILIA[familia];
  if (unidad === undefined || Math.round(promedio) === 0) {
    return `${promedio >= 0 ? '+' : '-'} ${etiqueta}`;
  }
  return `${etiqueta} ~${deltaCorto(promedio)}${unidad}`;
}

// K6a-A: la píldora de riesgo dice qué es el riesgo, no "ruleta". Si la tirada la corre un stat (`modificadores` del
// outcome, CONCEPTO §8), dice contra qué: "lo inclina tu mentalidad".
const TEXTO_DE_RIESGO = { seguro: 'seguro', incierto: 'puede salir torcido', ruleta: 'resultado muy abierto' };

export function textoDeRiesgo(opcion, riesgo) {
  const base = TEXTO_DE_RIESGO[riesgo] ?? riesgo;
  if (riesgo === 'seguro') {
    return base;
  }
  const campos = [...new Set(opcion.outcomes.flatMap((outcome) => (outcome.modificadores ?? []).map((mod) => mod.field)))];
  return campos.length > 0 ? `${base} · lo inclina tu ${campos.map((campo) => etiquetaCampo(campo).toLowerCase()).join(' y ')}` : base;
}

// `push`/`momento` no tienen rango numérico ni signo: no aportan previa ni
// payoff. El pool comparte un solo `path` ("player.championPool") para
// aprender y maestría — la familia distingue una de otra; "olvidar" no toma
// cantidad, así que tampoco entra.
function familiaDeEfecto(effect) {
  if (effect.type === 'pool') {
    return effect.accion === 'olvidar' ? null : `pool_${effect.accion}`;
  }
  // K4-C2: los efectos de carrera (`ofertaDeImport`, `cambiarRol`, `retirarse`) tampoco son magnitudes: los dice el
  // texto de la opción (`promete`), no una fila de previa.
  if (['push', 'momento', 'camino', 'ofertaDeImport', 'cambiarRol', 'retirarse'].includes(effect.type)) {
    return null;
  }
  return effect.type; // 'stat' | 'ladder' | 'partido'
}

// Aprender y maestría comparten `path` pero son magnitudes distintas
// (campeones vs. puntos): sin esto se promediarían en una sola fila de
// previa, mezclando escalas.
function claveDePrevia(effect, familia) {
  return familia.startsWith('pool_') ? `${effect.path}:${familia}` : effect.path;
}

function magnitudDe(valorAbsoluto, familia) {
  const banda = BALANCE.eventos.magnitudBandas[familia];
  if (!banda) {
    return 'media';
  }
  if (valorAbsoluto < banda.p33) return 'baja';
  if (valorAbsoluto < banda.p66) return 'media';
  return 'alta';
}

// Payoff normalizado de UN outcome: cada efecto se divide por el corte
// "alta" de su propia familia antes de sumar, así un efecto de ladder (LP) y
// uno de stat (puntos) aportan en la misma escala relativa a la dispersión.
export function payoffNormalizado(outcome) {
  let total = 0;
  for (const effect of outcome.effects) {
    const familia = familiaDeEfecto(effect);
    if (familia === null) continue;
    const alta = BALANCE.eventos.magnitudBandas[familia]?.p66 || 1;
    total += (effect.min + effect.max) / 2 / alta;
  }
  return total;
}

// [{ campo, etiqueta, signo, magnitud }] — un campo por cada dato real que la
// opción mueve, promediado entre sus outcomes con el peso EFECTIVO (no el
// base de catálogo): la previa tiene que respetar `modificadores`, no
// mostrar lo mismo sin importar tus stats. Magnitud/signo son cualitativos
// (regla invariable 7: los efectos son rangos, nunca un número mostrado).
export function previaDeOpcion(opcion, pesos) {
  const pesoTotal = pesos.reduce((suma, peso) => suma + peso, 0);
  if (pesoTotal <= 0) {
    return [];
  }

  const acumulado = new Map();
  opcion.outcomes.forEach((outcome, indice) => {
    const peso = pesos[indice];
    for (const effect of outcome.effects) {
      const familia = familiaDeEfecto(effect);
      if (familia === null) continue;
      const clave = claveDePrevia(effect, familia);
      const entrada = acumulado.get(clave) ?? { path: effect.path, familia, sumaPonderada: 0 };
      entrada.sumaPonderada += ((effect.min + effect.max) / 2) * peso;
      acumulado.set(clave, entrada);
    }
  });

  return [...acumulado.values()].map(({ path, familia, sumaPonderada }) => {
    const promedio = sumaPonderada / pesoTotal;
    return {
      campo: path,
      etiqueta: etiquetaCampo(path),
      signo: promedio >= 0 ? '+' : '-',
      magnitud: magnitudDe(Math.abs(promedio), familia),
      texto: textoDeFila(path, familia, promedio)
    };
  });
}

// 'seguro' | 'incierto' | 'ruleta' — del desvío estándar (ponderado por peso
// efectivo) del payoff normalizado ENTRE los outcomes de la opción, contra
// `BALANCE.eventos.riesgoBandas` (terciles medidos sobre las 442 opciones
// reales). NO del coeficiente de variación de los `weight` de catálogo: dos
// outcomes 50/50 con efectos idénticos tendrían que dar "seguro" (el
// resultado es previsible aunque la tirada sea pareja), y un CV de pesos los
// marcaría "ruleta" por construcción — la corrección que esta fase le hace a
// PLAN.md §12.3.
export function riesgoDeOpcion(opcion, pesos) {
  const pesoTotal = pesos.reduce((suma, peso) => suma + peso, 0);
  if (pesoTotal <= 0) {
    return 'seguro';
  }

  const payoffs = opcion.outcomes.map((outcome, indice) => ({
    payoff: payoffNormalizado(outcome),
    peso: pesos[indice]
  }));
  const media = payoffs.reduce((suma, o) => suma + o.payoff * o.peso, 0) / pesoTotal;
  const varianza = payoffs.reduce((suma, o) => suma + o.peso * (o.payoff - media) ** 2, 0) / pesoTotal;
  const desvio = Math.sqrt(varianza);

  const { p33, p66 } = BALANCE.eventos.riesgoBandas;
  if (desvio < p33) return 'seguro';
  if (desvio < p66) return 'incierto';
  return 'ruleta';
}

const SIMBOLO_OPERADOR = { lt: '<', lte: '≤', gt: '>', gte: '≥', eq: '=', neq: '≠' };

// string | null — ya existe como `opcion.conditions` (mismo esquema que
// `evento.conditions`, `core/selectors.js`); acá solo se traduce a texto
// legible. Hoy ningún evento del catálogo gatea una opción propia (0/442):
// el cable queda tendido para cuando la fase 12e/13 declare la primera.
export function gateDeOpcion(opcion) {
  const condiciones = opcion.conditions ?? [];
  if (condiciones.length === 0) {
    return null;
  }
  const frases = condiciones.map(
    ({ field, op, value }) => `${etiquetaCampo(field)} ${SIMBOLO_OPERADOR[op] ?? op} ${value}`
  );
  return `Solo con ${frases.join(' y ')}`;
}
