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

// --- La fila abierta: la org en la que estás jugando ahora mismo ---

export function filaAbierta(registro) {
  return registro.porOrg.find((fila) => fila.hastaSplit === null) ?? null;
}

export function abrirFila(registro, { org, liga, tier, anio, split }) {
  return {
    ...registro,
    porOrg: [...registro.porOrg, {
      org, liga, tier,
      desdeAnio: anio, hastaAnio: null,
      desdeSplit: split, hastaSplit: null,
      splits: 0, fechasG: 0, fechasP: 0,
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
export function registrarSplitEnFila(registro) {
  const abierta = filaAbierta(registro);
  if (!abierta) {
    return registro;
  }
  return {
    ...registro,
    splitsConEquipo: registro.splitsConEquipo + 1,
    porOrg: registro.porOrg.map((fila) => (fila === abierta ? { ...fila, splits: fila.splits + 1 } : fila))
  };
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

export function registrarTitulo(registro, { nombre, anio, org }) {
  const abierta = filaAbierta(registro);
  const base = { ...registro, titulos: [...registro.titulos, { nombre, anio, org }] };
  if (!abierta) {
    return base;
  }
  return {
    ...base,
    porOrg: base.porOrg.map((fila) => (fila === abierta ? { ...fila, titulos: [...fila.titulos, { nombre, anio }] } : fila))
  };
}

export function registrarInternacional(registro, entrada) {
  return { ...registro, internacionales: [...registro.internacionales, entrada] };
}

export function registrarMomento(registro, momento) {
  return { ...registro, momentos: [...registro.momentos, momento] };
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
