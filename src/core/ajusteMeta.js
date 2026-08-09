import { BALANCE } from '../data/balance.js';

// El vocabulario compartido del meta (CONCEPTO §6): afinidad de un campeón
// contra el vector de pesos vigente, y el deseo con el que el motor lo elige
// en un draft. El boost legible del pool (6.3, "cuántos de tus campeones
// están en tier alta") vive en `core/regimen.js`, que reusa `afinidadDeCampeon`
// de acá para construir la tier list del rol.

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

// Cuánto quiere el motor jugar este campeón: cruza cuánto lo domina (con sesgo,
// para que especializarse pese) contra cuánto lo pide el meta. Lo usan el draft
// de soloQ/equipo (systems/campeones.js) y el draft de la serie (fase 4,
// core/serie.js), que comparten el mismo criterio de "cuál es la elección obvia".
export function deseoPorCampeon(campeon, weights) {
  return Math.max(BALANCE.campeones.maestriaMinima, campeon.mastery) ** BALANCE.campeones.sesgoMaestriaEnPick
    * afinidadDeCampeon(campeon, weights);
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

// Los campeones de TU pool que el régimen dejó en la mitad de abajo de la
// tier list de su rol (tier B o C). Antes esto colgaba de una fracción
// continua de afinidad (`umbralMainMuerto`); desde la fase 6 cuelga del
// salto de tier real, que es lo que el jugador ve nombrado en el log de
// `systems/meta.js`. Es la señal que dispara la marca `main_muerto` y los
// eventos de reconstrucción de pool.
export function campeonesMuertos(pool, tierList) {
  const porNombre = new Map(tierList.map((entrada) => [entrada.name, entrada.tier]));
  return pool.filter((campeon) => {
    const tier = porNombre.get(campeon.name);
    return tier === 'B' || tier === 'C';
  });
}

// Multiplica el rendimiento entre 0.75x y 1.25x (CONCEPTO §6).
export function multiplicadorDeMeta(ajuste) {
  const { ajusteNeutro, multiplicadorMin, multiplicadorMax } = BALANCE.campeones;
  const rango = multiplicadorMax - multiplicadorMin;
  return multiplicadorMin + (ajuste / (ajusteNeutro * 2)) * rango;
}
