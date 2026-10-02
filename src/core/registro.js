import { clampStat } from './numeros.js';
import { BALANCE } from '../data/balance.js';

// El registro de carrera (fase 8, PLAN.md §8.1): la hoja que acumula.
//
// Regla dura (regla de proceso 14): ningún campo de `career.registro` decrece
// ni se sobrescribe nunca. Solo `append` e incremento monótono. Estas
// funciones son el único punto de escritura sobre el registro, para que esa
// regla se sostenga en un solo lugar en vez de reimplementarse —y
// eventualmente romperse— en cada sistema que lo toca.
//
// Puro, sin RNG: cualquier sistema puede llamarlas en cualquier orden.
//
// K1 (D75/D76, PLAN.md §K1 "decisiones de spec"): `fila.tier`/`fila.liga` son
// los de la firma; lo jugado por tier vive en `fila.splitsPorTier` (lo llena
// `registrarSplitEnFila(registro, tier)`), y cada título e internacional lleva
// su `liga` (y el título su `tier`). "Llegó a tier N" se pregunta con
// `tierMasAltoJugado`/`splitsJugadosEnTier`, que leen de ahí.

// --- La fila abierta: la org en la que estás jugando ahora mismo ---

export function filaAbierta(registro) {
  return registro.porOrg.find((fila) => fila.hastaSplit === null) ?? null;
}

// Los tiers que puede tener un split jugado con contrato (1 arriba, 3 abajo).
export const TIERS_DE_SPLIT = [1, 2, 3];

// K1 (D76): `fila.tier` y `fila.liga` son el tier y la liga AL FIRMAR. Un
// descenso en el lugar (`systems/competitivo.js`, `resolverDescenso`) no cierra
// la fila —el contrato viaja con la org—, así que desde ese split la fila sigue
// diciendo `tier: 1` aunque se juegue en la liga de desarrollo. Lo que se jugó
// de verdad en cada tier lo cuenta `splitsPorTier` (`{ 1, 2, 3 }`, completo
// desde que se abre: trampa T4), que solo crece (regla 14) y suma `splits`.
// Quien necesite "cuánto jugaste en tier N" (el puntaje, `core/legado.js`, el
// embudo de `simulate.js`) lee `splitsPorTier`, nunca `fila.tier`.
export function abrirFila(registro, { org, liga, tier, anio, split }) {
  return {
    ...registro,
    porOrg: [...registro.porOrg, {
      org, liga, tier,
      desdeAnio: anio, hastaAnio: null,
      desdeSplit: split, hastaSplit: null,
      splits: 0,
      splitsPorTier: Object.fromEntries(TIERS_DE_SPLIT.map((t) => [t, 0])),
      fechasG: 0, fechasP: 0,
      jerarquiaMaxima: 0, arraigoFinal: null, arraigoMaximo: 0,
      titulos: [],
      salarioAnualUSD: 0, // la fase 9 lo llena
      motivoDeSalida: null
    }]
  };
}

// Cierra la fila abierta. Si no hay ninguna (primer fichaje de la carrera),
// no hace nada: no hay nada que cerrar.
export function cerrarFila(registro, { anio, split, arraigoActual, motivo }) {
  const abierta = filaAbierta(registro);
  if (!abierta) {
    return registro;
  }
  return {
    ...registro,
    porOrg: registro.porOrg.map((fila) => (fila === abierta
      ? { ...fila, hastaAnio: anio, hastaSplit: split, arraigoFinal: arraigoActual, motivoDeSalida: motivo }
      : fila))
  };
}

// Un split más jugado con equipo: se cuenta en el global Y en la fila de la
// org (el check de la fase 8 exige que las dos cuentas cierren entre sí).
//
// K1 (D76): `tier` es el del split que se está contando —`career.tier` en el
// momento en que `systems/roster.js` lo cuenta, al arrancar el split—, no el
// de la fila: así un descenso en el lugar empieza a sumar en `splitsPorTier[2]`
// aunque la fila diga `tier: 1`. Lo pasa quien llama; este módulo no lee
// estado global. Convención heredada de `splits`: el split en que el contrato
// cambia (descenso en pretemporada, fichaje del mercado) cuenta con el tier
// con el que arrancó, igual que ya contaba en la fila con la que arrancó.
export function registrarSplitEnFila(registro, tier) {
  const abierta = filaAbierta(registro);
  if (!abierta) {
    return registro;
  }
  return {
    ...registro,
    splitsConEquipo: registro.splitsConEquipo + 1,
    porOrg: registro.porOrg.map((fila) => (fila === abierta
      ? {
        ...fila,
        splits: fila.splits + 1,
        splitsPorTier: { ...fila.splitsPorTier, [tier]: (fila.splitsPorTier?.[tier] ?? 0) + 1 }
      }
      : fila))
  };
}

// K1 (D75): "llegó a tier N" = jugó al menos un split con contrato en tier N
// (`splitsPorTier[N] > 0` en alguna fila), no "ganó el salto": el estado
// "agente libre de tier 2" que sigue a un ascenso desde tier 3 no cuenta. Es
// la única definición: la usan el puntaje (`core/puntaje.js`), el veredicto
// (`core/legado.js`) y el embudo de `simulate.js`.
export function splitsJugadosEnTier(registro, tier) {
  return registro.porOrg.reduce((total, fila) => total + (fila.splitsPorTier?.[tier] ?? 0), 0);
}

// El tier más alto (el número más chico) en el que jugaste al menos un split
// con contrato. `null` si nunca jugaste uno.
export function tierMasAltoJugado(registro) {
  return TIERS_DE_SPLIT.find((tier) => splitsJugadosEnTier(registro, tier) > 0) ?? null;
}

export function registrarJerarquiaEnFila(registro, jerarquia) {
  const abierta = filaAbierta(registro);
  if (!abierta || jerarquia <= abierta.jerarquiaMaxima) {
    return registro;
  }
  return {
    ...registro,
    porOrg: registro.porOrg.map((fila) => (fila === abierta ? { ...fila, jerarquiaMaxima: jerarquia } : fila))
  };
}

export function registrarArraigoEnFila(registro, arraigo) {
  const abierta = filaAbierta(registro);
  if (!abierta || arraigo <= abierta.arraigoMaximo) {
    return registro;
  }
  return {
    ...registro,
    porOrg: registro.porOrg.map((fila) => (fila === abierta ? { ...fila, arraigoMaximo: arraigo } : fila))
  };
}

// Fase 9Mf: el dinero de por vida. Se acumula cada split jugado bajo contrato
// (`systems/roster.js`), un `salarioAnualUSD / BALANCE.edad.splitsPorEdad` por
// split. Monótono por construcción — solo suma un monto positivo. Antes NUNCA
// se incrementaba: `PROGRESO.md` afirmaba que `roster.js` lo cobraba, el código
// no lo hacía, y el check de monotonía pasaba trivialmente sobre un 0.
export function acumularDinero(registro, montoUSD) {
  if (!(montoUSD > 0)) {
    return registro;
  }
  return { ...registro, dineroTotalUSD: registro.dineroTotalUSD + Math.round(montoUSD) };
}

// Fase 9: el sueldo del contrato vigente, escrito en la fila abierta al firmar
// (nunca cambia a mitad de contrato — una renovación cierra la fila y abre
// una nueva, como cualquier cambio de org).
export function registrarSalarioEnFila(registro, salarioAnualUSD) {
  const abierta = filaAbierta(registro);
  if (!abierta) {
    return registro;
  }
  return {
    ...registro,
    porOrg: registro.porOrg.map((fila) => (fila === abierta ? { ...fila, salarioAnualUSD } : fila))
  };
}

// --- Partidos, mapas y series ---

export function registrarFecha(registro, gano) {
  const abierta = filaAbierta(registro);
  const base = {
    ...registro,
    fechasGanadas: registro.fechasGanadas + (gano ? 1 : 0),
    fechasPerdidas: registro.fechasPerdidas + (gano ? 0 : 1)
  };
  if (!abierta) {
    return base;
  }
  return {
    ...base,
    porOrg: base.porOrg.map((fila) => (fila === abierta
      ? { ...fila, fechasG: fila.fechasG + (gano ? 1 : 0), fechasP: fila.fechasP + (gano ? 0 : 1) }
      : fila))
  };
}

export function registrarMapa(registro, gano) {
  return {
    ...registro,
    mapasGanados: registro.mapasGanados + (gano ? 1 : 0),
    mapasPerdidos: registro.mapasPerdidos + (gano ? 0 : 1)
  };
}

export function registrarSerie(registro, gano) {
  return {
    ...registro,
    seriesGanadas: registro.seriesGanadas + (gano ? 1 : 0),
    seriesPerdidas: registro.seriesPerdidas + (gano ? 0 : 1)
  };
}

// --- Trofeos ---

// K1 (D76): cada título lleva la `liga` (id real; `null` en tier 3, que no es
// una liga) y el `tier` de la liga donde se ganó DE VERDAD —no el de la fila,
// que es el de la firma—. Lo escriben `systems/rendimiento.js` y
// `systems/serie.js`. La entrada de la fila conserva su forma de siempre.
export function registrarTitulo(registro, { nombre, anio, org, liga, tier }) {
  const abierta = filaAbierta(registro);
  const base = { ...registro, titulos: [...registro.titulos, { nombre, anio, org, liga, tier }] };
  if (!abierta) {
    return base;
  }
  return {
    ...base,
    porOrg: base.porOrg.map((fila) => (fila === abierta ? { ...fila, titulos: [...fila.titulos, { nombre, anio }] } : fila))
  };
}

// K1 (D76): `entrada.liga` es el id de la liga que representaste (de ahí sale
// la `dificultad` que multiplica el internacional en `core/puntaje.js`).
export function registrarInternacional(registro, entrada) {
  return { ...registro, internacionales: [...registro.internacionales, entrada] };
}

export function registrarMomento(registro, momento) {
  return { ...registro, momentos: [...registro.momentos, momento] };
}

// Fase 11 (§11.1): una fila por cierre de edad (`core/temporadaResumen.js`
// arma `entrada`). `titularDelAnio` la lee al año siguiente para no repetir
// bajada de "otra vez" en falso.
export function registrarTemporada(registro, entrada) {
  return { ...registro, temporadas: [...registro.temporadas, entrada] };
}

// --- Picos (imagen 15 de PLAN.md: "93 MEDIA MÁX", "US$95,6M VALOR MÁS ALTO") ---

export function registrarPicoNivel(registro, nivel, edad) {
  if (nivel <= registro.picos.nivel) {
    return registro;
  }
  return { ...registro, picos: { ...registro.picos, nivel, edadDelPicoDeNivel: edad } };
}

export function registrarPico(registro, campo, valor) {
  if (valor <= registro.picos[campo]) {
    return registro;
  }
  return { ...registro, picos: { ...registro.picos, [campo]: valor } };
}

// Fase 9W: el rank mundial es un pico AL REVÉS — mejor es MENOR (#1 es el
// techo). `0` = nunca rankeado. Una vez que entrás, `picos.rankMundial` sólo
// puede bajar: es monótono no creciente, como exige el check de 9W.
export function registrarPicoRank(registro, rank) {
  if (!rank || rank <= 0) {
    return registro;
  }
  const actual = registro.picos.rankMundial ?? 0;
  if (actual !== 0 && rank >= actual) {
    return registro;
  }
  return { ...registro, picos: { ...registro.picos, rankMundial: rank } };
}

// --- Arraigo (fase 8.4) ---

export function bandaDeArraigo(valor) {
  const { hitos } = BALANCE.arraigo;
  if (valor >= hitos.leyenda) {
    return 'leyenda';
  }
  if (valor >= hitos.idolo) {
    return 'idolo';
  }
  if (valor >= hitos.querido) {
    return 'querido';
  }
  return 'uno_mas';
}

// Con cuánto arraigo arrancás en una org nueva: "tu fama te precede" (imagen
// 6 de PLAN.md) — cuanto más hype tenías, menos arrancás de cero.
export function arraigoInicial(hype) {
  return clampStat(hype * BALANCE.arraigo.pisoPorHype);
}
