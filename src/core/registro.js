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
// K1 (D75/D76): lo JUGADO por tier vive en `fila.splitsPorTier` (ver
// `abrirFila`), y cada título e internacional lleva su `liga` (y el título su
// `tier`). "Llegó a tier N": `tierMasAltoJugado`/`splitsJugadosEnTier`.

// --- La fila abierta: la org en la que estás jugando ahora mismo ---

export function filaAbierta(registro) {
  return registro.porOrg.find((fila) => fila.hastaSplit === null) ?? null;
}

// Los tiers que puede tener un split jugado con contrato (1 arriba, 3 abajo).
export const TIERS_DE_SPLIT = [1, 2, 3];

// Dos conteos distintos por fila:
// - `splits`: splits ARRANCADOS con contrato acá (`roster.js`, al arrancar el
//   split). Es dato de juego —lo leen la residencia y el contexto, que además
//   cuenta las filas—: contarlo donde se juega, o abrir antes la fila, corrió
//   el stream en 12 de 160 carreras (revisión de K1). Queda como estaba.
// - `splitsPorTier` (K1, D76): splits JUGADOS con esta org (los que corrieron
//   su temporada), por el tier en que se jugaron (`registrarSplitJugado`).
//   Difiere de `splits` en el split del pase, en el que no se llegó a jugar y
//   en la vuelta de un retiro. Completo desde que se abre (T4), solo crece.
// `fila.tier`/`fila.liga` son los de la firma (un descenso en el lugar no
// cierra la fila): "cuánto jugaste en tier N" se lee de `splitsPorTier`.
// `jugadoSinFila`: lo jugado con esta org antes de que existiera su fila
// (`flags.splitJugadoSinFila`); la fila arranca con eso adentro.
export function abrirFila(registro, { org, liga, tier, anio, split }, jugadoSinFila = null) {
  return {
    ...registro,
    porOrg: [...registro.porOrg, {
      org, liga, tier,
      desdeAnio: anio, hastaAnio: null,
      desdeSplit: split, hastaSplit: null,
      splits: 0,
      splitsPorTier: Object.fromEntries(TIERS_DE_SPLIT.map((t) => [t, jugadoSinFila?.[t] ?? 0])),
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

// Un split más arrancado con equipo: se cuenta en el global Y en la fila de
// la org (el check de la fase 8 exige que las dos cuentas cierren entre sí).
// Es `fila.splits`, no lo jugado por tier (ver `abrirFila`).
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

// K1 (D76): un split JUGADO, en la org y el tier donde se juega. Lo llama
// `systems/temporada.js` al arrancar la temporada, ya pasados el mercado, el
// ascenso y el descenso. Devuelve `{ registro, sinFila }`: si la fila de esa
// org todavía no existe (el split del pase: `roster.js` la abre el split que
// viene), el split viaja en `sinFila` (`{ org, splitsPorTier }`, sumado a
// `pendiente`), que quien llama guarda en `flags.splitJugadoSinFila` y
// `abrirFila` asienta. Tira ante un pendiente que no le corresponde a esa fila.
export function registrarSplitJugado(registro, { org, tier }, pendiente = null) {
  if (!TIERS_DE_SPLIT.includes(tier) || !org) {
    throw new Error(`Split jugado sin org o sin tier válido (org ${org}, tier ${tier})`);
  }
  if (pendiente && pendiente.org !== org) {
    throw new Error(`Split jugado con ${org} y otro pendiente sin fila con ${pendiente.org}`);
  }
  const abierta = filaAbierta(registro);
  if (abierta && abierta.org === org) {
    if (pendiente) {
      throw new Error(`La fila de ${org} ya está abierta y todavía hay un split jugado sin asentar`);
    }
    return {
      registro: {
        ...registro,
        porOrg: registro.porOrg.map((fila) => (fila === abierta
          ? { ...fila, splitsPorTier: { ...fila.splitsPorTier, [tier]: fila.splitsPorTier[tier] + 1 } }
          : fila))
      },
      sinFila: null
    };
  }
  const base = pendiente?.splitsPorTier ?? Object.fromEntries(TIERS_DE_SPLIT.map((t) => [t, 0]));
  return { registro, sinFila: { org, splitsPorTier: { ...base, [tier]: base[tier] + 1 } } };
}

// K1 (D75): "llegó a tier N" = jugó al menos un split con contrato en tier N
// (`splitsPorTier[N] > 0` en alguna fila), no "ganó el salto": el estado
// "agente libre de tier 2" que sigue a un ascenso desde tier 3 no cuenta. Es
// la única definición: la usan el puntaje (`core/puntaje.js`), el veredicto
// (`core/legado.js`) y el embudo de `simulate.js`.
export function splitsJugadosEnTier(registro, tier) {
  return registro.porOrg.reduce((total, fila) => total + fila.splitsPorTier[tier], 0);
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
// K5-A: lo que se registra de un Mundial es hasta dónde llegaste: `eliminado` (afuera en el Swiss), `cuartos`,
// `semis`, `final` o `campeon`. `buen_papel` es el de los registros anteriores a K5 (una serie internacional ganada).
// "Buen papel" es pasar de fase: cualquier resultado de bracket.
export const RESULTADOS_INTERNACIONALES = ['eliminado', 'cuartos', 'semis', 'final', 'campeon', 'buen_papel'];
const RESULTADOS_DE_BUEN_PAPEL = ['cuartos', 'semis', 'final', 'campeon', 'buen_papel'];

export function esBuenPapel(entrada) {
  return Boolean(entrada) && RESULTADOS_DE_BUEN_PAPEL.includes(entrada.resultado);
}

export function registrarInternacional(registro, entrada) {
  return { ...registro, internacionales: [...registro.internacionales, entrada] };
}

export function registrarMomento(registro, momento) {
  return { ...registro, momentos: [...registro.momentos, momento] };
}

// K3-B: lo que una decisión dejó en una curva de edad (`player.bonusPermanente`). `marca` es
// `{ stat, delta, origen, anio }`: `origen` es el nombre visible del evento o de la decisión, nunca un id. Solo
// crece: las marcas no se borran ni se editan (regla 14); la ficha las agrega para "Lo que construiste".
export function registrarMarca(registro, marca) {
  return { ...registro, marcas: [...registro.marcas, marca] };
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

// K1: un cierre de temporada más como #1 del mundo (el requisito de "El GOAT").
// Solo crece; lo escribe `systems/topMundial.js` junto al pico de rank.
export function registrarCierreComoNumeroUno(registro) {
  return { ...registro, cierresComoNumeroUno: registro.cierresComoNumeroUno + 1 };
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
