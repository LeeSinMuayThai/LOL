import { planInicial, planPorId } from './rutinas.js';
import { desgasteInicial } from './curvas.js';
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
// antes no trae y se calcula con la misma regla). Un guardado de VERSION 10 SÍ carga: `migrarDe10` lo completa (T4) · 12 (K5c, la
// integración de K5c-E y K5c-R en un solo número — K5c-E, el desgaste: `player.desgaste`, lo que los años te sacan de cada stat de
// curva y de cada acumulativo — K5c-R, la presión de tier 2: `flags.splitsTier2SinOfertaTier1`; y los años pro desde tier 2:
// `career.splitPrimerContratoTier2`; K5c-M no cambió la forma; en la revisión de K5c entró `career.splitsRetirado`, los splits que
// pasaron retirado —la ventana de vuelta— y no son años pro). Un guardado de la 11 carga con `migrarDe11`, que completa los campos
// de las dos piezas y de la revisión, y uno de la 10 pasa por las dos migraciones · 13 (K6b, la integración de K6b-U, K6b-M, K6b-F
// y K6b-C en un solo número — K6b-C, la cola de la carrera: `flags.seguisFirma`, `flags.finMercadoFirma` y `flags.vueltaFirma`, la
// foto de la última vez que elegiste seguir, seguir buscando o no volver; K6b-C2, `flags.colaFirmas` (`cierre` y `momento`), la foto
// de la última parada de la cola. K6b-U, K6b-M y K6b-F no cambiaron la forma: la marca `franquicia` de las ligas se lee de
// `data/leagues.json` y no entra a la copia del mundo). Un guardado de la 12 carga con `migrarDe12`, que arranca las cuatro en
// "no hay foto"; uno de la 11 o de la 10 pasa además por las migraciones de antes.
export const VERSION = 13;
const VERSIONES_MIGRABLES = [10, 11, 12];

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

// 11 -> 12. Completa lo que la 12 escribe y la 11 no. K5c-E: `player.desgaste` (lo que los años te sacan hoy de cada stat), en el
// valor neutro del estado inicial. K5c-R: la cuenta de la presión de tier 2 en 0 (con las perillas de `BALANCE.retiro.presionTier2`
// en 99 nunca subía) y el marcador de los años pro desde el registro. K5c (revisión): `career.splitsRetirado` en 0 (la 11 no
// cargaba los splits que pasaron retirado: sus años pro no se corrigen hacia atrás). Puro: no toca el RNG ni el reloj.
export function migrarDe11(state) {
  const player = { ...state.player, desgaste: state.player?.desgaste ?? desgasteInicial() };
  const flags = { ...state.flags, splitsTier2SinOfertaTier1: state.flags?.splitsTier2SinOfertaTier1 ?? 0 };
  if (!state.career) {
    return { ...state, player, flags };
  }
  const splitPrimerContratoTier2 = state.career.splitPrimerContratoTier2 !== undefined
    ? state.career.splitPrimerContratoTier2
    : primerContratoTier2DelRegistro(state);
  // K6a-R: `serie.cantada` (sin cambiar la VERSION): un guardado de antes no la trae y su serie frena en el plan.
  const serie = state.serie ? { ...state.serie, cantada: state.serie.cantada ?? null } : state.serie;
  return {
    ...state, player, flags, serie,
    career: { ...state.career, splitPrimerContratoTier2, splitsRetirado: state.career.splitsRetirado ?? 0 }
  };
}

// 12 -> 13. K6b-C: las fotos de la cola (`flags.seguisFirma`, `flags.finMercadoFirma`, `flags.vueltaFirma` y
// `flags.colaFirmas`) arrancan en "no hay foto" (`null`), el valor del estado inicial: la 12 no las escribía, así que la
// próxima pregunta de la cola frena (como la primera vez) y desde ahí se repite o se narra igual que en una carrera de la 13. Las
// que ya estén se respetan. Puro: no toca el RNG ni el reloj.
export function migrarDe12(state) {
  const viejas = state.flags ?? {};
  const colaFirmas = viejas.colaFirmas ?? {};
  const flags = {
    ...viejas,
    seguisFirma: viejas.seguisFirma ?? null,
    finMercadoFirma: viejas.finMercadoFirma ?? null,
    vueltaFirma: viejas.vueltaFirma ?? null,
    colaFirmas: { ...colaFirmas, cierre: colaFirmas.cierre ?? null, momento: colaFirmas.momento ?? null },
    // K6c (sin subir la VERSION: la 13 todavía no salió): el año del amateur arranca en "sin plan" (`null`, el valor del
    // estado inicial). Si el guardado está en el amateur, el próximo split frena con el plan del año, como al arrancar.
    anioAmateur: viejas.anioAmateur ?? null
  };
  return { ...state, flags };
}

// De la versión del guardado a la función que lo deja en la actual (la 10 pasa por `migrarDe10`, `migrarDe11` y `migrarDe12`; la
// 11, por las dos últimas).
function migrar(version, state) {
  if (version === 10) {
    return migrarDe12(migrarDe11(migrarDe10(state)));
  }
  if (version === 11) {
    return migrarDe12(migrarDe11(state));
  }
  return version === 12 ? migrarDe12(state) : state;
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
