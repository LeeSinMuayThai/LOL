import LIGAS from '../data/leagues.json' with { type: 'json' };
import { BALANCE } from '../data/balance.js';

// El veredicto de la carrera (PLAN.md §10.2, CONCEPTO §9): NO se elige de una
// lista, se COMPONE — una plantilla de arquetipo más un detalle real sacado del
// registro de ESA carrera ("El mundialista de T1" = mayor logro + mayor org).
//
// Puro, sin RNG, sin DOM: `core/pipeline.js` lo llama una sola vez, cuando
// `terminado` pasa a true, y guarda el resultado en `state.tarjeta`. Va en
// `core/` por la misma razón que `core/ficha.js`: alimenta la UI y se puede
// testear sin mover el balance.

const REGION_DE_LIGA = Object.fromEntries(LIGAS.map((liga) => [liga.id, liga.region]));

function titulosDeTier(registro, tier) {
  return registro.porOrg
    .filter((fila) => fila.tier === tier)
    .reduce((total, fila) => total + fila.titulos.length, 0);
}

function splitsDeTier(registro, tier) {
  return registro.porOrg
    .filter((fila) => fila.tier === tier)
    .reduce((total, fila) => total + fila.splits, 0);
}

// La org donde más jugaste; desempata por títulos.
function orgMasImportante(registro) {
  return [...registro.porOrg].sort(
    (a, b) => (b.splits - a.splits) || (b.titulos.length - a.titulos.length)
  )[0] ?? null;
}

// La liga tier 1 donde levantaste más trofeos, y si toda tu carrera tier 1
// transcurrió en una sola región.
function ligaInsignia(registro) {
  const porLiga = {};
  for (const fila of registro.porOrg) {
    if (fila.tier === 1 && fila.liga) {
      porLiga[fila.liga] = (porLiga[fila.liga] ?? 0) + fila.titulos.length;
    }
  }
  const ordenadas = Object.entries(porLiga).sort((a, b) => b[1] - a[1]);
  if (ordenadas.length === 0) {
    return { liga: null, unaSolaRegion: false };
  }
  const ligasTier1 = registro.porOrg.filter((fila) => fila.tier === 1 && fila.liga).map((fila) => fila.liga);
  const regiones = new Set(ligasTier1.map((id) => REGION_DE_LIGA[id]).filter(Boolean));
  return { liga: ordenadas[0][0], unaSolaRegion: regiones.size === 1 };
}

// La plantilla de arquetipo. Primer match gana. `esExito` decide el marco de la
// tarjeta (confeti vs sobrio). Las ramas de éxito están desglosadas fino a
// propósito: un asistente único a un internacional no es un bicampeón, y un
// campeón doméstico no es una leyenda — así ningún arquetipo se lleva a toda la
// población (CONCEPTO §11: tope 25%).
function elegirArquetipo(datos) {
  const {
    fin, edad, intBuenos, intTotales, internacional,
    titulosT1, titulosTotales, orgs, arraigoMax, splitsT1, podios, insignia,
    rankPico, anioMejorDelMundo
  } = datos;

  if (fin === 'no_llego') {
    return { frase: 'El que no llegó', esExito: false };
  }
  if (fin === 'prohibicion_familiar') {
    return { frase: 'El que no lo dejaron', esExito: false };
  }
  if (fin === 'burnout') {
    return { frase: `El que se bajó a los ${edad}`, esExito: false };
  }

  // Fase 9Wb (§9W.4): haber sido de los mejores del mundo es el dato más
  // evocador de la tarjeta — va antes que los títulos. Ser el #1 gana a todo.
  if (rankPico === 1) {
    return { frase: `El mejor del mundo${anioMejorDelMundo ? ` (${anioMejorDelMundo})` : ''}`, esExito: true };
  }
  if (rankPico >= 2 && rankPico <= 5) {
    return { frase: `De los mejores del mundo: Nº${rankPico} en su pico`, esExito: true };
  }

  if (intBuenos >= 3) {
    return { frase: `La dinastía de ${internacional.org}: ${intBuenos} internacionales`, esExito: true };
  }
  if (intBuenos >= 2) {
    return { frase: `El bicampeón: dos internacionales con ${internacional.org}`, esExito: true };
  }
  if (intBuenos === 1 && titulosT1 >= 3) {
    return { frase: `Leyenda de ${insignia.liga ?? 'primera'}: un internacional y ${titulosT1} títulos`, esExito: true };
  }
  if (intBuenos === 1) {
    return { frase: `El mundialista de ${internacional.org}`, esExito: true };
  }
  if (intTotales >= 1) {
    return { frase: `El que llegó al internacional con ${internacional.org}`, esExito: true };
  }
  if (titulosT1 >= 3 && insignia.liga && insignia.unaSolaRegion) {
    return { frase: `Leyenda de ${insignia.liga}: ${titulosT1} títulos, nunca un internacional`, esExito: true };
  }
  if (titulosT1 >= 1) {
    return { frase: `Campeón de ${insignia.liga ?? 'primera'}`, esExito: true };
  }
  // Fase 9Wb: tocaste el Top 20 del mundo sin levantar un trofeo — igual
  // estuviste entre los 20 mejores del planeta.
  if (rankPico > 0 && rankPico <= BALANCE.topMundial.tamano && titulosTotales === 0 && intTotales === 0) {
    return { frase: `El que tocó el Top 20 del mundo (Nº${rankPico})`, esExito: true };
  }
  if (podios >= 4 && titulosTotales === 0) {
    return { frase: 'El eterno cuarto puesto', esExito: false };
  }
  if (splitsT1 > 0 && splitsT1 < BALANCE.contexto.splitsDeDebut * 2) {
    return { frase: 'El pibe que pasó por primera y no se quedó', esExito: false };
  }
  if (orgs >= 4 && arraigoMax < BALANCE.arraigo.hitos.idolo) {
    return { frase: 'El nómade que nunca echó raíces', esExito: false };
  }
  if (titulosTotales >= 2) {
    return { frase: `El del ascenso: ${titulosTotales} torneos levantados sin llegar a primera`, esExito: false };
  }
  return { frase: 'Un profesional más: estuvo, jugó, se fue', esExito: false };
}

// El detalle: SIEMPRE cita un hecho real del registro de esta carrera.
function detalleDeCarrera(registro, orgPrincipal) {
  if (orgPrincipal && orgPrincipal.splits >= 3) {
    const hasta = orgPrincipal.hastaAnio ? `–${orgPrincipal.hastaAnio}` : '';
    return `${orgPrincipal.splits} splits en ${orgPrincipal.org} (${orgPrincipal.desdeAnio}${hasta}).`;
  }
  if (registro.momentos.length > 0) {
    return `${registro.momentos[registro.momentos.length - 1].texto}.`;
  }
  return `${registro.splitsJugados} splits, ${registro.fechasGanadas}-${registro.fechasPerdidas} en fechas de liga.`;
}

export function componerLegado(state) {
  const r = state.career.registro;
  const fin = state.finAnticipado;

  const internacional = r.internacionales.find((entrada) => entrada.resultado === 'buen_papel')
    ?? r.internacionales[0]
    ?? null;
  const orgPrincipal = orgMasImportante(r);
  const insignia = ligaInsignia(r);

  const momentoMejorDelMundo = r.momentos.find((m) => m.tipo === 'el_mejor_del_mundo') ?? null;

  const { frase, esExito } = elegirArquetipo({
    fin,
    edad: state.age,
    internacional,
    intBuenos: r.internacionales.filter((entrada) => entrada.resultado === 'buen_papel').length,
    intTotales: r.internacionales.length,
    titulosT1: titulosDeTier(r, 1),
    titulosTotales: r.titulos.length,
    orgs: r.porOrg.length,
    arraigoMax: Math.max(0, ...r.porOrg.map((fila) => fila.arraigoMaximo ?? 0)),
    splitsT1: splitsDeTier(r, 1),
    podios: state.career.podios,
    insignia,
    rankPico: r.picos.rankMundial ?? 0,
    anioMejorDelMundo: momentoMejorDelMundo?.anio ?? null
  });

  return {
    finAnticipado: fin,
    esExito,
    edadRetiro: state.age,
    veredicto: `${frase}. ${detalleDeCarrera(r, orgPrincipal)}`,
    totales: {
      anios: Math.max(1, state.calendario.anio - state.calendario.anioBase),
      splits: r.splitsJugados,
      titulos: r.titulos.length,
      internacionales: r.internacionales.length,
      nivelMax: Math.round(r.picos.nivel),
      valorMaxUSD: r.picos.valorMercadoUSD,
      hypeMax: Math.round(r.picos.hype),
      // Fase 9Wb: el mejor rank mundial de la vida (0 = nunca entró al Top 20)
      // y cuántos cierres de temporada terminó dentro.
      rankMundialMax: r.picos.rankMundial ?? 0,
      splitsEnTopMundial: r.splitsEnTopMundial ?? 0
    },
    // La UI reusa `filaHistoria` de `ui/components/ficha.js` sobre esto.
    historia: r.porOrg
  };
}
