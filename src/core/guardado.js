import { planInicial, planPorId } from './rutinas.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { decisionDeCierre } from '../systems/edadCierre.js';
import { pausaDeMercadoMigrada } from '../systems/mercado.js';

// El guardado de la carrera (fase T8, PLAN.md "T8 — La página como
// página", P.2). Puro: serializa y deserializa, nada de `localStorage` acá
// — eso vive en `src/ui/almacenamiento.js`, para que este archivo (y
// `validate.js`/`simulate.js`, que lo pueden importar transitivamente)
// sigan corriendo en Node sin tocar el navegador.
//
// `VERSION` viaja adentro del JSON. Si algún día `state` cambia de forma
// (un campo nuevo, uno que se borra), un guardado viejo con una versión
// distinta se descarta entero en vez de cargarse a medias — un estado que
// ningún sistema actual entiende es peor que no guardar nada (la carrera
// simplemente arranca de cero, con un aviso, en vez de romper en un lugar
// impredecible tres splits después).
//
// Historia: 2 (K0-B, el check de forma de `validate.js`) · 3 (K1-A, D76:
// `registro.porOrg[].splitsPorTier`, `liga`/`tier` en cada título, `liga` en
// cada internacional, `state.desafio` y `tarjeta.puntaje` — un guardado a
// mitad de carrera tendría títulos sin liga) · 4 (revisión de K1:
// `registro.cierresComoNumeroUno`, `flags.splitJugadoSinFila`, `nombre` en las
// ligas, y la forma nueva de `tarjeta.puntaje`: niveles por hechos) · 5 (K2,
// mergeado sobre K1 — K2a y K2b se escribieron en ramas paralelas a K1 y
// usaban 4 y 5 para formas sin los campos de K1; esos números no valen: regla
// "VERSION de guardado entre ramas paralelas" de PLAN.md. K2a: `nivelJugador`
// y `nivelCompaneros` en `career.temporada`, `fuerzaInicial` en `serie`, y
// `formato`/`fuerzaInicial`/`fuerzaRival` en el log de cierre de cada serie —
// lo que el motor usó, expuesto para el instrumento de `src/dev/simulate.js`.
// K2b: `rendimientoBase` y `resultadosPropios` en `career.temporada` — el
// rendimiento del split lo cuentan los partidos — y los compañeros de una liga
// modelada con la forma del plantel vivo; el estado inicial ya trae esos dos
// campos y `flags.sinergiaProyectadaAlFichar`) · 6 (K2d, la previa: la `p` con
// la que se tiró cada mapa y la fecha marcada —con `pSinMomento` y
// `ajustePartido`— en sus logs, y `entradaExtra` en los datos del minijuego de
// un mapa, para que la previa lea el comodín) · 7 (K3-B, los efectos que duran: `player.bonusPermanente`, un campo
// por stat de curva, y `registro.marcas`, lo que cada decisión dejó en las curvas de edad — K3-A puede subirla también:
// la rama que se mergea segunda toma max + 1) · 8 (K4, la integración de K4-B, K4-C y K4-D en un solo número —
// K4-B, la serie como plan: `serie.plan`, `guardado`, `replanUsado`, `rivalJuega`, `rivalJuegaEnMapa` y `sinNadaEnJuego`,
// sin `preSerieUsado`; `career.charlaUsadaEn`; y en el log de cada mapa `rivalJuega`, `plan` y `charla` — K4-C, el perfil:
// `player.perfil`, `flags.categoriasRecientes`, `flags.splitMainMuerto` y `flags.saltosConPrueba` — K4-D, la pretemporada
// en una sola parada: `flags.preparacionDeSplit`, el año cuya preparación ya se resolvió, y `preparacion` —las cartas de
// las rutinas de offseason— en los datos de la decisión del mercado y de la prueba del salto) · 9 (K4-C2, las
// bifurcaciones con efectos de carrera: `flags.ofertaDeImport` y `flags.rolDeOrigen`) · 10 (K5, la integración de K5-A,
// K5-B y K5-C en un solo número — K5-A, el Mundial de verdad: `state.internacional` (Swiss + bracket), `torneo`/`etapa`
// en `serie` y `record`/`campeon` en cada `registro.internacionales` — K5-B, la región se elige: las ligas del mundo
// suman LRN y LRS, las tier 2 de LATAM sin primera arriba, con `sinPrimera` y `alimentaA` — K5-C, el final lo decide el
// mercado: `flags.splitsSinOfertaEnTier`, `flags.forkMercadoSplit`, `tarjeta.motivo` y `state.motivoRetiro`, el único
// lugar del motivo del retiro —K4-C2 lo había puesto en `flags.motivoRetiro`—) · 11 (K4c, el plan anual y el cierre del bloque
// B: `player.planAnual` entra y `flags.preparacionDeSplit` se va, porque la pretemporada ya no frena para elegir la práctica;
// además los logs ganan el campo opcional `adjunto` y la pausa de la prueba del mercado lleva `respaldo`, que un guardado de
// antes no trae y se calcula con la misma regla). Un guardado de VERSION 10 SÍ carga: `migrarDe10` lo completa (T4) · 12 (K5c-R,
// la presión de tier 2: `flags.splitsTier2SinOfertaTier1`; y los años pro desde tier 2: `career.splitPrimerContratoTier2`). Un
// guardado de la 11 carga con `migrarDe11`, y uno de la 10 pasa por las dos migraciones.
export const VERSION = 12;
const VERSIONES_MIGRABLES = [10, 11];

// El marcador de los años pro, reconstruido de lo que la 11 sí guardaba. La fila del registro de la org del primer contrato de tier
// 2 o 1 la abre `roster.js` el split siguiente al de la firma, así que la firma fue en su `desdeSplit` - 1. Sin esa fila todavía
// (firmaste en el split que se acaba de jugar) y con club de tier 2 o 1, fue en el split anterior al reloj de hoy. Medido al
// escribirlo: coincide con el que escribe el motor en los 2731 cierres de split de las seeds 1-60. Hueco conocido: un guardado
// parado a mitad del split de la firma, antes de que corra `atributos.js`, queda un split corrido.
function primerContratoTier2DelRegistro(state) {
  const fila = (state.career?.registro?.porOrg ?? []).find((candidata) => candidata.tier <= 2);
  if (fila) {
    return Math.max(state.splitFichaje ?? 0, fila.desdeSplit - 1);
  }
  if (state.career?.currentOrg && state.career.tier <= 2) {
    return state.player.splitCount - 1;
  }
  return null;
}

// 11 -> 12. Completa lo que la 12 escribe y la 11 no: la cuenta de la presión de tier 2 en 0 (con las perillas de
// `BALANCE.retiro.presionTier2` en 99 nunca subía) y el marcador de los años pro desde el registro. Puro: no toca el RNG ni el
// reloj.
export function migrarDe11(state) {
  const flags = { ...state.flags, splitsTier2SinOfertaTier1: state.flags?.splitsTier2SinOfertaTier1 ?? 0 };
  if (!state.career) {
    return { ...state, flags };
  }
  const splitPrimerContratoTier2 = state.career.splitPrimerContratoTier2 !== undefined
    ? state.career.splitPrimerContratoTier2
    : primerContratoTier2DelRegistro(state);
  return { ...state, flags, career: { ...state.career, splitPrimerContratoTier2 } };
}

function migrar(version, state) {
  if (version === 10) {
    return migrarDe11(migrarDe10(state));
  }
  return version === 11 ? migrarDe11(state) : state;
}

// 10 -> 11. Le pone al estado lo que la versión nueva espera y la vieja no escribía: `player.planAnual` (el plan que le
// cierra al perfil, el mismo del estado inicial: un guardado anterior nunca tuvo un cierre que lo fije) y fuera
// `flags.preparacionDeSplit`. Si el guardado quedó parado en la pausa de la práctica de la pretemporada (la parada que el
// plan anual quitó), la decisión se reemplaza por un solo botón que lo dice: elegir una rutina ya no existe, y al seguir
// `systems/practica.js` entrena el tramo del split según el plan. Puro: no toca el RNG ni el reloj.
//
// K4c (revisión): también se rearman con lo de hoy (regla 15) las otras dos pausas que la 11 cambió. La del mercado pierde la
// `preparacion` y, si es la prueba, gana su respaldo y la apuesta que dice qué pasa si no alcanza (`pausaDeMercadoMigrada`). La
// del cierre se vuelve a armar con el evento de hoy (`decisionDeCierre`): el de la 10 no traía el plan de cada opción, así que
// ni lo mostraba ni lo fijaba. `flags.pruebasFallidas` arranca vacío (la 10 no lo escribía).
//
// Hueco conocido, sin cerrar: un guardado de la 10 hecho a mitad de año, con la preparación del receso de ese año ya aplicada
// (el reparto entero, de una vez), entrena además los tramos del plan de los splits que le quedan a ese año (hasta 2 de 3).
export function migrarDe10(state) {
  const { preparacionDeSplit, ...flagsViejos } = state.flags ?? {};
  const flags = { ...flagsViejos, pruebasFallidas: flagsViejos.pruebasFallidas ?? [] };
  const planAnual = state.player?.planAnual ?? planInicial(state.player?.perfil?.actual);
  const migrado = { ...state, flags, player: { ...state.player, planAnual } };
  if (state.pendiente?.sistemaId === 'mercado' && state.pendiente.decision) {
    return { ...migrado, pendiente: { ...state.pendiente, decision: pausaDeMercadoMigrada(migrado, state.pendiente.decision) } };
  }
  const eventoDelCierre = state.pendiente?.sistemaId === 'edadCierre'
    ? TODOS_LOS_EVENTOS.find((evento) => evento.id === state.pendiente.decision?.datos?.evento?.id)
    : null;
  if (eventoDelCierre) {
    return { ...migrado, pendiente: { ...state.pendiente, decision: decisionDeCierre(migrado, eventoDelCierre) } };
  }
  if (state.pendiente?.sistemaId !== 'practica') {
    return migrado;
  }
  const plan = planPorId(planAnual);
  return {
    ...migrado,
    pendiente: {
      ...state.pendiente,
      decision: {
        titulo: 'La pretemporada',
        descripcion: `Ya no elegís la preparación acá: el cierre de año fija tu plan de práctica y cada split entrena solo. Este año: ${plan.titulo}.`,
        opciones: [{ id: 'seguir', label: 'Seguir', descripcion: `Entrenás según el plan del año: ${plan.titulo}.` }],
        datos: { motivo: 'practica' }
      }
    }
  };
}

export function serializar(state, rng, rngUi) {
  return JSON.stringify({
    version: VERSION,
    guardadoEn: Date.now(),
    seed: state.seed,
    rngEstado: rng.estado(),
    rngUiEstado: rngUi ? rngUi.estado() : null,
    state
  });
}

// Devuelve `null` si el JSON está corrupto o es de otra versión — nunca
// tira: quien llama decide qué hacer con "no hay nada que continuar".
export function deserializar(json) {
  let datos;
  try {
    datos = JSON.parse(json);
  } catch {
    return null;
  }
  if (!datos || typeof datos !== 'object' || (datos.version !== VERSION && !VERSIONES_MIGRABLES.includes(datos.version))) {
    return null;
  }
  if (typeof datos.rngEstado !== 'number' || !datos.state) {
    return null;
  }
  return {
    seed: datos.seed,
    rngEstado: datos.rngEstado,
    rngUiEstado: typeof datos.rngUiEstado === 'number' ? datos.rngUiEstado : null,
    state: migrar(datos.version, datos.state),
    guardadoEn: datos.guardadoEn ?? null
  };
}
