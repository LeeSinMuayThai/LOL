import { BALANCE } from '../data/balance.js';
import { ligaDeCarrera } from './competicion.js';

// TRASPASO.md §4: el mismo sesgo etario que gobierna el scouting amateur
// (`amateur.scoutingSesgoEtario`), pero para la franja de la carrera pro —
// un jugador de 28 recibe ~40% de las ofertas que uno de 21 con la hoja
// idéntica. Reusa la FORMA de esa tabla (lookup por edad + piso), no la
// tabla misma: cubren edades distintas.
export function sesgoEtario(edad) {
  const { mercado } = BALANCE;
  return mercado.sesgoEtario[edad] ?? mercado.sesgoEtarioMinimo;
}

// Splits vividos en una región (TRASPASO §4: 12 splits/4 años = "residencia").
// Deriva de `career.registro.porOrg`, que la fase 8 ya acumula — sin agregar
// estado nuevo (evita otro punto T1/T4). Tier 3 (`fila.liga === null`)
// cuenta como la región de origen: ahí siempre te ficha una org de tu propia
// región, nunca una extranjera.
export function splitsDeResidencia(state, regionId) {
  return state.career.registro.porOrg.reduce((total, fila) => {
    const regionDeFila = fila.liga
      ? state.mundo.ligas.find((liga) => liga.id === fila.liga)?.regionId ?? null
      : state.mundo.regionIdOrigen;
    return regionDeFila === regionId ? total + fila.splits : total;
  }, 0);
}

// Cuánto valés hoy, en dólares (TRASPASO §4, imagen 15: "VALOR MÁS ALTO").
// No es tu sueldo actual — podés estar atado a un contrato viejo que te
// subpaga — es lo que el mejor postor de tu propia liga pagaría si te
// ofertara ahora. Pura, sin rng: una valuación es una lectura del estado, no
// una negociación (el ruido de la negociación vive en `salarioDeOferta`).
// `0` fuera de una liga real (tier 3 o sin equipo): ahí no hay mercado que
// te tase todavía.
export function valorDeMercado(state) {
  const liga = ligaDeCarrera(state);
  if (!liga) {
    return 0;
  }

  const { mercado } = BALANCE;
  const { historial, jerarquia } = state.career;
  const rendimientoReciente = historial.length
    ? historial.reduce((suma, valor) => suma + valor, 0) / historial.length
    : 0;
  const residente = splitsDeResidencia(state, state.mundo.regionIdOrigen) >= mercado.valorResidenciaSplits;
  const tieneSignature = state.player.signatureChampion !== null;

  const factor = 1
    + (rendimientoReciente / 100) * mercado.valorRendimientoPeso
    + (jerarquia / 100) * mercado.valorJerarquiaPeso
    + (state.player.stats.hype / 100) * mercado.valorHypePeso
    + (residente ? mercado.valorResidenciaBonus : 0)
    + (tieneSignature ? mercado.valorSignatureBonus : 0);

  return Math.round(liga.salario.medianaUSD * factor * sesgoEtario(state.age));
}
