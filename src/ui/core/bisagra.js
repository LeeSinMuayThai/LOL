// La lectura de una decisión con destino (PLANUI §0.2 y U2a punto 4; portado de `leerEvento` de
// vitrina/fusion/js/escena.js). La costura de la bisagra cuenta dónde estás y adónde te llaman: tu liga y tu club de un
// lado, la liga que te llama del otro, y cada opción como un camino (te quedás, ida y vuelta, mudanza). Todo sale de
// CAMPOS de la decisión y del estado, nunca de su prosa: la categoría, `peso`/`bifurcacion`/`oferta` del evento, los
// efectos estructurados de cada opción (`ofertaDeImport` con su `liga`, `camino` abierto o cerrado), la `previa`, el
// `riesgo` y la `rareza`.
//
// Puro: sin DOM ni rng, corre en Node.
import LIGAS from '../../data/leagues.json' with { type: 'json' };
import { pesoDeDecision } from '../formatoUi.js';
import { ofertaDeImportPosible } from '../../systems/mercado.js';
import { servidorDeLaPartida } from '../../core/ranked.js';

const POR_ID = new Map(LIGAS.map((liga) => [liga.id, liga]));
// La liga de primera de cada región (el tono, la copa y la ciudad de una liga de segunda son los de su región).
const PRIMERA_DE_REGION = new Map(LIGAS.filter((liga) => liga.tier === 1).map((liga) => [liga.regionId, liga.id]));
// La ciudad que se nombra para cada liga de primera (dónde se juega: CONCEPTO §12).
const CIUDAD = { LCK: 'Seúl', LPL: 'Shanghái', LEC: 'Berlín', LCS: 'Los Ángeles', CBLOL: 'São Paulo', LCP: 'Taipéi' };
// Lo que es cada camino, en dos palabras.
export const CAMINO = { viaje: 'ida y vuelta', ir: 'mudanza', casa: 'te quedás' };
// El lado de cada camino en la costura: lo tuyo (te quedás) a la izquierda / arriba; lo que te llama, a la derecha / abajo.
export const LADO_DEL_CAMINO = { casa: 'a', viaje: 'b', ir: 'b' };
// El cupo que ofrece el aviso, por el TIPO del efecto (nunca por la prosa).
const CUPO = { ofertaDeImport: 'Cupo de import' };

// La liga de primera de la región de una liga ('LCK_CL' -> 'LCK'); una de primera, ella misma; desconocida, `null`.
export function primeraDe(ligaId) {
  const liga = POR_ID.get(ligaId);
  if (!liga) return null;
  return liga.tier === 1 ? liga.id : PRIMERA_DE_REGION.get(liga.regionId) ?? null;
}

// { id, nombre, region, regionId, ciudad, primera } de una liga del juego. `null` si no es una liga conocida.
export function lugarDeLiga(ligaId) {
  const liga = POR_ID.get(ligaId);
  if (!liga) return null;
  const primera = primeraDe(ligaId);
  return { id: liga.id, nombre: liga.nombre, region: liga.region, regionId: liga.regionId, ciudad: CIUDAD[primera] ?? null, primera };
}

// La liga a la que te lleva un efecto `ofertaDeImport` HOY: la primera de su lista de preferencia que puede ficharte (la
// misma regla con la que la firma el mercado). Si ninguna puede (la opción está cerrada), la primera de la lista.
function ligaDelImport(estado, efecto) {
  const ligas = [].concat(efecto.liga ?? []);
  if (ligas.length === 0) return null;
  try {
    const posible = ofertaDeImportPosible(estado, ligas);
    if (posible?.posible) return posible.liga.id;
  } catch {
    /* sin mundo en el estado: la primera de la lista */
  }
  return ligas[0];
}

// `true` si la decisión es una bisagra para la pantalla: el peso del evento o una bifurcación de carrera.
export function esBisagra(decision) {
  return pesoDeDecision(decision) === 'bisagra' || decision?.datos?.evento?.bifurcacion === true;
}

// Lo que la costura necesita de una decisión. `destino` es `null` si ninguna opción te lleva a otra liga: entonces no
// hay costura (la pantalla de siempre). `caminos`: uno por opción disponible y, al final, uno por cerrada.
export function leerEvento(decision, estado) {
  const evento = decision?.datos?.evento ?? null;
  const ligaCasa = estado?.career?.liga ?? null;
  const opcionesDelEvento = evento?.options ?? [];
  const efectosDe = (id) => (opcionesDelEvento.find((o) => o.id === id)?.outcomes ?? []).map((oc) => oc.effects ?? []);
  const ligaDe = (efecto) => (efecto.type === 'ofertaDeImport' ? ligaDelImport(estado, efecto) : null);
  let ligaDestino = null;
  let cupo = null;
  for (const opcion of opcionesDelEvento) {
    for (const outcome of opcion.outcomes ?? []) {
      for (const efecto of outcome.effects ?? []) {
        const liga = ligaDe(efecto);
        if (liga && liga !== ligaCasa) ligaDestino ??= liga;
        if (CUPO[efecto.type]) cupo ??= CUPO[efecto.type];
      }
    }
  }
  // El camino de cada opción, por sus efectos: te mudás (la liga de destino en todos sus resultados), vas y volvés (abre
  // el camino sin mudarte) o te quedás. Sin destino no hay geografía: 'neutro'.
  const caminoDe = (id) => {
    const resultados = efectosDe(id);
    if (!ligaDestino || resultados.length === 0) return 'neutro';
    if (resultados.every((efectos) => efectos.some((e) => ligaDe(e) === ligaDestino))) return 'ir';
    if (resultados.some((efectos) => efectos.some((e) => e.type === 'camino' && e.valor === 'abierto'))) return 'viaje';
    return 'casa';
  };
  const disponibles = new Set((decision?.opciones ?? []).map((o) => o.id));
  const caminos = [
    ...(decision?.opciones ?? []).map((o) => ({
      id: o.id, label: o.label, camino: caminoDe(o.id), riesgo: o.riesgo ?? null, rareza: o.rareza ?? null, previa: o.previa ?? [], bloqueada: false
    })),
    ...(decision?.opcionesBloqueadas ?? []).map((b) => {
      const id = opcionesDelEvento.find((o) => !disponibles.has(o.id) && o.label === b.label)?.id ?? null;
      return { id, label: b.label, camino: id ? caminoDe(id) : 'neutro', riesgo: null, rareza: null, previa: [], bloqueada: true };
    })
  ];
  const casa = lugarDeLiga(ligaCasa);
  const destino = lugarDeLiga(ligaDestino) ?? (ligaDestino ? { id: ligaDestino, nombre: ligaDestino, region: null, ciudad: null, primera: null } : null);
  return {
    categoria: evento?.categoria ?? null,
    bisagra: esBisagra(decision),
    // La bisagra llega como ¡OFERTA ENCONTRADA! solo si es una oferta (el aviso del cliente), con destino.
    aviso: Boolean(destino && evento?.oferta === true),
    casa: {
      liga: ligaCasa,
      nombre: casa?.nombre ?? null,
      primera: casa?.primera ?? null,
      org: estado?.career?.currentOrg ?? null,
      servidor: estado?.player?.ranked ? servidorDeLaPartida(estado) : null,
      ciudad: casa?.ciudad ?? null,
      region: casa?.region ?? null
    },
    destino,
    cupo,
    caminos
  };
}

// La costura según el contexto (compuerta 2, PLANUI §2): con dos ligas en juego, `liga` (el logo, la ciudad y la pared de
// escudos de cada una); si no, `campeones` (tu main en los dos lados). `copas` (una copa en juego) no tiene disparador
// en el catálogo de hoy: ninguna decisión con destino pone una competición en juego (PLANUI D103). Sin destino no hay
// costura (`null`).
export function varianteDeCostura(lectura) {
  if (!lectura?.destino) return null;
  if (lectura.casa.liga && lectura.casa.liga !== lectura.destino.id) return 'liga';
  return 'campeones';
}
