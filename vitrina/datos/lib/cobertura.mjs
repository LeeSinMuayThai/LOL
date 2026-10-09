// La cobertura de una carrera: qué de lo que la vitrina necesita mostrar pasó en ella. Se calcula mirando las paradas (antes de
// contestarlas) y los splits cerrados; no consume rng ni cambia ninguna respuesta. Sirve para el barrido de seeds y para armar la
// tabla de cobertura del `meta`.
import { goldenRoadsDeEstado } from '../../../src/ui/core/trayectoria.js';

// Obligatorios (x10 cada uno) y deseables (x1): ver la spec de la vitrina.
export const OBLIGATORIOS = {
  planAmateur4: 'Parada de plan de amateur con 4 opciones',
  fearlessBo5: 'Plan de Fearless de una serie Bo5 de playoffs con un campeón quemado en la serie',
  swiss: 'Parada del Swiss 2-2',
  tituloTier1: 'Título de liga de tier 1 (final ganada)',
  mercado3: 'Mercado con 3 ofertas o más',
  primerContrato: 'Primer contrato firmado'
};
export const DESEABLES = {
  mundialCampeon: 'Mundial ganado',
  lesion: 'Lesión (grave en una parada, o leve en el registro)',
  cierreConParada: 'Cierre de año con parada (edadCierre)',
  goldenRoad: 'Golden Road',
  fearlessReplan: 'Replan de Fearless (el rival te quema el campeón guardado) en un Bo5 de playoffs',
  eventoBisagra2: 'Evento bisagra o bifurcacion de 2 opciones'
};

export function nuevaCobertura() {
  return Object.fromEntries([...Object.keys(OBLIGATORIOS), ...Object.keys(DESEABLES)].map((k) => [k, false]));
}

// Un evento que pesa: 'bisagra' en el peso (src/systems/events.js:488) o una bifurcacion de carrera.
export const esLlamativo = (decision) => decision?.peso === 'bisagra' || Boolean(decision?.datos?.evento?.bifurcacion);

export const motivoDe = (decision) => decision?.datos?.motivo ?? decision?.presentacion ?? null;

// Una serie de playoffs domésticos al mejor de 5 (no el bracket del Mundial).
export const esBo5DeLiga = (state) => state.serie?.formato === 5 && state.serie?.torneo !== 'mundial';

// Observador: devuelve los dos ganchos de `jugarCarrera` y la cobertura que van llenando.
export function observadorDeCobertura() {
  const cob = nuevaCobertura();
  let fearlessEnEsteSplit = false;
  let estadoPrevio = null;

  return {
    cob,
    alParar({ sistema, state, decision }) {
      const motivo = motivoDe(decision);
      const nOpc = decision.opciones?.length ?? 0;
      if (sistema.id === 'amateur' && motivo === 'plan_amateur' && nOpc === 4) cob.planAmateur4 = true;
      if (sistema.id === 'serie' && motivo === 'plan' && esBo5DeLiga(state)) {
        fearlessEnEsteSplit = true;
        if (decision.datos?.replan) cob.fearlessReplan = true;
      }
      if (sistema.id === 'internacional' && motivo === 'swiss') cob.swiss = true;
      if (sistema.id === 'mercado' && motivo === 'oferta' && nOpc >= 3) cob.mercado3 = true;
      if (sistema.id === 'edadCierre') cob.cierreConParada = true;
      if (motivo === 'lesion_grave') cob.lesion = true;
      if (sistema.id === 'eventos' && nOpc === 2 && esLlamativo(decision)) cob.eventoBisagra2 = true;
    },
    alCerrarSplit({ despues }) {
      if (fearlessEnEsteSplit && (despues.serie?.quemados?.length ?? 0) >= 1) cob.fearlessBo5 = true;
      fearlessEnEsteSplit = false;
      const c = despues.career?.contrato;
      if (!cob.primerContrato && c?.org && c.tipo !== 'ninguno') cob.primerContrato = true;
      estadoPrevio = despues;
    },
    alTerminar(state) {
      const reg = state.career.registro;
      const finalGanada = state.logs.some((l) => l.type === 'serie' && l.postSerie && l.ronda === 'final' && l.gano === true);
      if (finalGanada && reg.titulos.some((t) => t.tier === 1)) cob.tituloTier1 = true;
      if (reg.internacionales.some((i) => i.resultado === 'campeon')) cob.mundialCampeon = true;
      if (reg.momentos.some((m) => m.tipo === 'lesion_leve' || m.tipo === 'lesion_grave')) cob.lesion = true;
      if (goldenRoadsDeEstado(state).length > 0) cob.goldenRoad = true;
      return estadoPrevio;
    }
  };
}

export function puntuar(cob) {
  const obl = Object.keys(OBLIGATORIOS).filter((k) => cob[k]).length;
  const des = Object.keys(DESEABLES).filter((k) => cob[k]).length;
  return { obligatorios: obl, deseables: des, puntaje: obl * 10 + des };
}
