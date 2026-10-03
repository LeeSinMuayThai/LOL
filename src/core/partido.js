import { clamp, probabilidadPorSigma } from './numeros.js';
import { BALANCE } from '../data/balance.js';

// K2b (PLAN.md "K2 — lo que midió la investigación", viñeta K2b.3): cómo se
// decide un partido, en UN solo lugar.
//
// Hasta K2a cada fecha de temporada regular tiraba dos gauss (uno por lado,
// σ 7 y 12) sobre una fuerza propia que ya traía una tercera tirada, la del
// rendimiento del split; cada mapa de una serie tiraba tres (el rendimiento del
// mapa, el mapa, el rival). El draft mostraba una probabilidad que no era la
// que después se tiraba. Desde K2b:
//  - la fuerza de partido es DETERMINISTA (`core/fuerza.js#fuerzaDePartido`);
//  - el azar vive solo en `p = probabilidadDePartido(...)`;
//  - el resultado es `rng() < p`: UNA tirada por partido o mapa (`jugarPartido`).
// Lo que una previa muestre (K2d) es exactamente la p que se tira (regla 15).

export const TIPOS_DE_PARTIDO = ['fecha', 'mapa'];

// El σ COMBINADO de un partido de este tipo. Es el ÚNICO lugar del motor que
// lee el ruido de un partido (`validate.js` lo verifica estático): K3 lo conecta
// a la mentalidad del jugador acá, y en ningún otro lado.
//
// `state` es el del jugador. Un cruce ajeno de la tabla (dos orgs que no son la
// tuya) pasa `null`: es un partido de tipo `fecha` sin jugador, y lo que K3 le
// sume a tu σ por tu cabeza no le toca.
//
// K3-A: el σ se multiplica por `factorDeConsistencia` de la mentalidad del
// jugador (la cabeza bien → jugás a tu nivel; tilteado → el resultado se vuelve
// moneda). Sin jugador (`null`), o sin mentalidad legible, el factor es 1.
export function ruidoEfectivo(state, tipo) {
  const p = BALANCE.partido;
  const g = factorDeConsistencia(state?.player?.stats?.mentalidad);
  if (tipo === 'fecha') {
    return p.sigmaFecha * g;
  }
  if (tipo === 'mapa') {
    return p.sigmaMapa * g;
  }
  throw new Error(`ruidoEfectivo: tipo de partido desconocido "${tipo}" (válidos: ${TIPOS_DE_PARTIDO.join(', ')})`);
}

// K3-A (PLAN.md "K3 — decisiones de spec", K3-A.1): g(m) = 1 + k·(mRef − m)/100,
// acotado a [gMin, gMax] (`BALANCE.consistencia`). g(mRef) = 1 y g no crece con
// m: con más cabeza, menos ruido. Sin mentalidad (un cruce ajeno, `null`) es 1:
// lo que tu cabeza le hace a tu σ no le toca a un partido que no jugás. Pura.
export function factorDeConsistencia(mentalidad) {
  if (!Number.isFinite(mentalidad)) {
    return 1;
  }
  const c = BALANCE.consistencia;
  return clamp(1 + c.k * (c.mRef - mentalidad) / BALANCE.stats.max, c.gMin, c.gMax);
}

// La probabilidad de que el lado propio gane este partido. Pura, sin RNG: la
// usan el motor (para tirar), el draft (para decidir si frena) y la previa.
export function probabilidadDePartido(state, fuerzaPropia, fuerzaRival, tipo) {
  return probabilidadPorSigma(fuerzaPropia, fuerzaRival, ruidoEfectivo(state, tipo));
}

// El partido se juega: una sola tirada contra la p declarada. Devuelve la p
// junto con el resultado para que quien registra el partido no la recalcule.
export function jugarPartido(state, fuerzaPropia, fuerzaRival, tipo, rng) {
  return tirarPartido(probabilidadDePartido(state, fuerzaPropia, fuerzaRival, tipo), rng);
}

// K2d: la tirada sola, contra una p ya calculada. La fecha marcada y el mapa
// tiran contra la p de su previa (`core/previa.js`): la que la pantalla
// muestra es, por construcción, la que se tira.
export function tirarPartido(p, rng) {
  return { gano: rng() < p, p };
}
