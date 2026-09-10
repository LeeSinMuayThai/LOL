import { BALANCE } from '../data/balance.js';
import { ligaDeCarrera } from './competicion.js';

// CONCEPTO.md §12.2: el mismo sesgo etario que gobierna el scouting amateur
// (`amateur.scoutingSesgoEtario`), pero para la franja de la carrera pro —
// un jugador de 28 recibe ~40% de las ofertas que uno de 21 con la hoja
// idéntica. Reusa la FORMA de esa tabla (lookup por edad + piso), no la
// tabla misma: cubren edades distintas.
export function sesgoEtario(edad) {
  const { mercado } = BALANCE;
  return mercado.sesgoEtario[edad] ?? mercado.sesgoEtarioMinimo;
}

// Fase 9Mi (PLAN.md §9M.12.2 punto 2): el mercado se ENFRÍA con la edad. El
// `sesgoEtario` de arriba sólo adelgaza la mano que ves (`cupoEtario` en
// `generarOfertas`); nunca decide si el asiento existe. `castigoEtario` sí:
// descuenta tu nivel en la DISPUTA por un asiento (`ofertaPosible`), en puntos
// de nivel. A los ≤22 no castiga (`sesgoEtario` = 1 → 0 puntos); a los 27
// son ~9 puntos, a los 30 ~14. Un veterano que ya no es *claramente* mejor que
// la camada joven pierde la disputa y cae a tier 2 o al retiro; uno que sigue
// siendo mejor de verdad, se queda. Es en puntos de nivel a propósito: un
// factor multiplicativo (`nivel · sesgoEtario`) dejaría a un jugador de 30 en
// nivel efectivo ~17 — un muro de edad, no un mercado que se enfría.
export function castigoEtario(edad) {
  return (1 - sesgoEtario(edad)) * BALANCE.demanda.castigoEtarioNivel;
}

// Fase 9Wb (§9W.4): estar en el Top 20 del mundo mueve tu valor de mercado,
// escalado por el rank — pleno para el #1, casi nada para el #20. `null`
// (fuera de la lista) no aporta. Espeja `valorSignatureBonus`.
export function bonoTopMundial(state) {
  const rank = state.flags?.rankMundialActual;
  const { tamano } = BALANCE.topMundial;
  if (rank == null || rank > tamano) {
    return 0;
  }
  return BALANCE.mercado.valorTopMundialBonus * ((tamano - rank + 1) / tamano);
}

// Splits vividos en una región (CONCEPTO §12: 12 splits/4 años = "residencia").
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

// Cuánto valés hoy, en dólares (CONCEPTO §12: "VALOR MÁS ALTO").
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
    + (tieneSignature ? mercado.valorSignatureBonus : 0)
    + bonoTopMundial(state);

  return Math.round(liga.salario.medianaUSD * factor * sesgoEtario(state.age));
}
