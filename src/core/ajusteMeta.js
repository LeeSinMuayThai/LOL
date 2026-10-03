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
// de soloQ/equipo (systems/campeones.js) y la quema del rival / el comodín
// (core/serie.js) — los lugares donde el compounding de maestría² ES el diseño
// (especializarte tiene que pesar), no una predicción del resultado del mapa.
export function deseoPorCampeon(campeon, weights) {
  return Math.max(BALANCE.campeones.maestriaMinima, campeon.mastery) ** BALANCE.campeones.sesgoMaestriaEnPick
    * afinidadDeCampeon(campeon, weights);
}

// Fase 9Rc: la ÚNICA respuesta a "cuánto vale este campeón para el resultado
// del mapa". Hasta 9Rc había tres fórmulas que no se hablaban, y el motor podía
// auto-pickear un campeón peor para el resultado; de las otras dos, hoy
// `calcularRendimiento` ya no existe (K2b) y `factorDraftFecha` tampoco (K4 lo
// borró con el draft de la fecha marcada). `deseoPorCampeon` (arriba) sigue,
// pero solo para el pick, no para el resultado. Esta cruza los dos ejes con el peso que ya declara CONCEPTO §6:
// la afinidad al meta pesa la mitad que la maestría. Con un campeón exactamente
// promedio para el parche (afinidad 1) devuelve el `factorMaestria` de siempre,
// así que sin cambio de meta el balance agregado no se mueve.
//
// K2b: la maestría vale 1,0 en `maestriaReferencia` (hasta K2a, un 50
// implícito; K2b la dejó en 50, bit a bit igual; K2c la centró en 85, la media de
// un pro con la afinidad incluida). Sin campeón conocido, el factor es neutro: la maestría de referencia.
export function factorDeCampeon(campeon, weights) {
  const r = BALANCE.rendimiento;
  const maestria = campeon?.mastery ?? r.maestriaReferencia;
  const afinidad = campeon ? afinidadDeCampeon(campeon, weights) : 1;
  return (1 + (maestria / BALANCE.stats.max - r.maestriaReferencia / BALANCE.stats.max) * r.maestriaPesoEnRendimiento * 2)
    * (1 + (afinidad - 1) * r.afinidadPesoEnRendimiento);
}

// El mismo criterio único, exagerado por `sesgoMaestriaEnPick` para que el
// camino headless (los `resolverAuto`) no tire una moneda entre un pick bueno y
// uno apenas peor. Es una transformación monótona de `factorDeCampeon`: NUNCA
// invierte el orden, solo separa las opciones. Cuando el motor elige solo
// devuelve el argmax de `factorDeCampeon`, no un sorteo — esto es solo para el
// `weightedPick` del headless, que necesita pesos y no un único ganador.
export function pesoDePick(campeon, weights) {
  return factorDeCampeon(campeon, weights) ** BALANCE.campeones.sesgoMaestriaEnPick;
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

// Multiplica el rendimiento entre `multiplicadorMin` y `multiplicadorMax` de
// BALANCE.campeones (0.9x-1.1x desde K2c; CONCEPTO §6).
export function multiplicadorDeMeta(ajuste) {
  const { ajusteNeutro, multiplicadorMin, multiplicadorMax } = BALANCE.campeones;
  const rango = multiplicadorMax - multiplicadorMin;
  return multiplicadorMin + (ajuste / (ajusteNeutro * 2)) * rango;
}
