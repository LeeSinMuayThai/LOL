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

// El meta con nombre y apellido.
//
// `meta.weights` es un vector sobre nueve arquetipos, y por eso el log decía
// "el meta se mueve hacia los magos de control": correcto y abstracto. Un
// jugador no piensa así — piensa "este parche manda Sejuani". Cruzar el vector
// contra el roster del rol devuelve esos nombres, y eso habilita tres cosas:
// que el log se lea, que el contenido pueda decir "tu {mainMuerto} quedó a
// contramano", y que el rival de una serie sepa qué quemar primero (fase 4).
//
// Puro y sin RNG: se puede llamar en cualquier lado, incluso al pintar la UI.
export function campeonesEnMeta(weights, campeonesDelRol, cantidad = BALANCE.campeones.campeonesEnMeta) {
  return [...campeonesDelRol]
    .sort((a, b) => afinidadDeCampeon(b, weights) - afinidadDeCampeon(a, weights))
    .slice(0, cantidad);
}

// Los campeones de TU pool que el parche dejó a contramano: su afinidad quedó
// muy por debajo de la del mejor campeón del rol. Es la señal que dispara la
// marca `main_muerto` y los eventos de reconstrucción de pool.
export function campeonesMuertos(pool, weights, campeonesDelRol) {
  if (pool.length === 0 || campeonesDelRol.length === 0) {
    return [];
  }
  const techo = Math.max(...campeonesDelRol.map((campeon) => afinidadDeCampeon(campeon, weights)));
  const corte = techo * BALANCE.campeones.umbralMainMuerto;
  return pool.filter((campeon) => afinidadDeCampeon(campeon, weights) < corte);
}

// Multiplica el rendimiento entre 0.75x y 1.25x (CONCEPTO §6).
export function multiplicadorDeMeta(ajuste) {
  const { ajusteNeutro, multiplicadorMin, multiplicadorMax } = BALANCE.campeones;
  const rango = multiplicadorMax - multiplicadorMin;
  return multiplicadorMin + (ajuste / (ajusteNeutro * 2)) * rango;
}
