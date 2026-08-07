import { BALANCE } from '../data/balance.js';
import { clamp } from './numeros.js';

// El Ajuste al Meta (CONCEPTO §6): un numero de 0 a 100 con desglose por
// campeon que te dice, ANTES de jugar, si este split te toca a favor o en
// contra.
//
// Sale de cruzar los tags de tu pool contra el vector de pesos del meta,
// ponderando por maestria. Que los dos hablen el mismo vocabulario de
// arquetipos es lo que hace que el sistema exista: si no coinciden, el ajuste
// es siempre neutro y nadie se entera.

function mediaDePesos(weights) {
  const valores = Object.values(weights);
  return valores.reduce((suma, peso) => suma + peso, 0) / valores.length;
}

// 1 = un campeon exactamente promedio para este meta. Mas de 1, favorecido.
export function afinidadDeCampeon(campeon, weights) {
  const media = mediaDePesos(weights);
  const pesos = campeon.tags.map((tag) => weights[tag] ?? media);
  return pesos.reduce((suma, peso) => suma + peso, 0) / pesos.length / media;
}

export function ajusteAlMeta(state) {
  const { weights } = state.meta;
  const pool = state.player.championPool;

  const desglose = pool.map((campeon) => {
    const afinidad = afinidadDeCampeon(campeon, weights);
    return {
      name: campeon.name,
      mastery: campeon.mastery,
      afinidad: Number(afinidad.toFixed(2)),
      // Un campeon que domina y que el meta pide vale mucho; el mismo campeon
      // con maestria 20 no te salva el split.
      peso: campeon.mastery / BALANCE.stats.max
    };
  });

  const pesoTotal = desglose.reduce((suma, entrada) => suma + entrada.peso, 0);

  if (pesoTotal === 0) {
    return { valor: BALANCE.campeones.ajusteNeutro, desglose };
  }

  const afinidadPonderada = desglose.reduce((suma, entrada) => suma + entrada.afinidad * entrada.peso, 0) / pesoTotal;
  const valor = clamp(Math.round(BALANCE.campeones.ajusteNeutro * afinidadPonderada), BALANCE.stats.min, BALANCE.stats.max);

  return { valor, desglose };
}

// Multiplica el rendimiento entre 0.75x y 1.25x (CONCEPTO §6).
export function multiplicadorDeMeta(ajuste) {
  const { ajusteNeutro, multiplicadorMin, multiplicadorMax } = BALANCE.campeones;
  const rango = multiplicadorMax - multiplicadorMin;
  return multiplicadorMin + (ajuste / (ajusteNeutro * 2)) * rango;
}
