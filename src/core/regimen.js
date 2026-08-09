import { afinidadDeCampeon } from './ajusteMeta.js';
import { campeonesDisponibles } from './pool.js';
import { clamp } from './numeros.js';
import { BALANCE } from '../data/balance.js';

// El meta con nombre (fase 6): reemplaza el ajuste-como-número por dos cosas
// legibles — la tier list de tu rol para el régimen vigente, y el boost que
// sale de cruzarla contra tu pool. Todo puro, sin RNG: `systems/meta.js` es
// el único que decide CUÁNDO cambia el régimen; esto solo lee el vector de
// pesos que ya haya quedado fijado y lo traduce a S/A/B/C.

// La tier list corta por RANGO del rol (fracción del ranking), no por
// afinidad absoluta: con un régimen extremo todas las afinidades se separan
// mucho, con uno calmo casi nada, y cortar por valor absoluto haría que la
// cantidad de campeones en cada tier cambiara todo el tiempo sin razón
// aparente. Cortando por rango, el rol siempre tiene la misma forma de
// pirámide S/A/B/C, gane quien gane el parche.
function tierPorRango(indice, total) {
  const r = BALANCE.regimen;
  const fraccion = (indice + 0.5) / total;
  if (fraccion < r.corteS) return 'S';
  if (fraccion < r.corteA) return 'A';
  if (fraccion < r.corteB) return 'B';
  return 'C';
}

// Los campeones del rol del jugador, ordenados por afinidad al régimen
// vigente y etiquetados S/A/B/C.
export function tierListDeRol(state) {
  const campeones = campeonesDisponibles(state, state.player.role);
  const ordenados = [...campeones].sort(
    (a, b) => afinidadDeCampeon(b, state.meta.weights) - afinidadDeCampeon(a, state.meta.weights)
  );
  return ordenados.map((campeon, indice) => ({
    name: campeon.name,
    tier: tierPorRango(indice, ordenados.length)
  }));
}

function tierDe(tierList, nombre) {
  return tierList.find((entrada) => entrada.name === nombre)?.tier ?? null;
}

// Qué campeones del pool coinciden con qué tier — los dos paneles que pidió
// el usuario ("tu pool" y "el meta de tu rol") se arman cruzando esto contra
// `state.player.championPool`.
export function coincidencias(pool, tierList) {
  return pool.map((campeon) => ({ name: campeon.name, tier: tierDe(tierList, campeon.name) }));
}

const PESO_TIER = { S: 'pesoTierS', A: 'pesoTierA', B: 'pesoTierB', C: 'pesoTierC' };

function pesoDeTier(tier) {
  const r = BALANCE.regimen;
  return r[PESO_TIER[tier]] ?? 0;
}

// El boost del pool (6.3): reemplaza a la vieja `ajusteAlMeta` (promedio de
// afinidad ponderado por maestría, que hacía que el resultado orbitara
// siempre 50 y nadie se enterara de nada). Ahora suma, para cada campeón del
// pool, cuánto lo dominás por cuánto pesa su tier — un S con maestría alta
// pesa mucho, un C no suma nada, pase lo que pase con su maestría. Devuelve
// la MISMA forma que `ajusteAlMeta` (`{ valor, desglose }`, 0-100) para que
// `multiplicadorDeMeta` y el resto de los consumidores no tengan que cambiar.
export function boostDelPool(pool, tierList) {
  const desglose = pool.map((campeon) => {
    const tier = tierDe(tierList, campeon.name) ?? 'B';
    return { name: campeon.name, tier, mastery: campeon.mastery, peso: campeon.mastery / BALANCE.stats.max };
  });

  const pesoTotal = desglose.reduce((suma, entrada) => suma + entrada.peso, 0);
  if (pesoTotal === 0) {
    return { valor: BALANCE.campeones.ajusteNeutro, desglose };
  }

  const sumaPonderada = desglose.reduce((suma, entrada) => suma + pesoDeTier(entrada.tier) * entrada.peso, 0);
  const promedioTier = sumaPonderada / pesoTotal; // 0..1: 0 = todo en C, 1 = todo en S con maestría al tope
  const valor = clamp(Math.round(promedioTier * BALANCE.stats.max), BALANCE.stats.min, BALANCE.stats.max);

  return { valor, desglose };
}

// Los saltos de tier que le tocan al jugador cuando cambia el régimen: solo
// los campeones de SU pool más los tres primeros del rol nuevo — escupir la
// tier list entera cada parche es ruido, no información (6.4).
export function saltosDeTierPropios(tierListAnterior, tierListNueva, pool) {
  if (!tierListAnterior || tierListAnterior.length === 0) {
    return [];
  }

  const nombresRelevantes = new Set([
    ...pool.map((campeon) => campeon.name),
    ...tierListNueva.slice(0, 3).map((entrada) => entrada.name)
  ]);

  const saltos = [];
  for (const nombre of nombresRelevantes) {
    const antes = tierDe(tierListAnterior, nombre);
    const despues = tierDe(tierListNueva, nombre);
    if (antes && despues && antes !== despues) {
      saltos.push(`${nombre}: ${antes} → ${despues}`);
    }
  }
  return saltos;
}
