// El director de escena, la mitad pura (FASE V, V2-B; PLAN.md §V.4 y §V.5). Decide QUÉ pieza ocupa el escenario
// (`piezaDe`), qué panel la acompaña (`acompananteDe`, la usa V2-C) y cómo se cuenta el cierre de un split
// (`fotoDeSplit` + `cierreDeSplit`). Funciones puras sobre `state`: sin DOM, sin `rng`, sin escribir nada, para que corran
// en Node y `validate.js` les pueda poner un mutante. La mitad del DOM es `src/ui/escena.js`: es la única que escribe
// `.shell[data-pieza]`.
import { tableroDeSerie, seguimientoGoldenRoad } from '../../core/vistaDeCarrera.js';
import { seguimientoParaMostrar, textoDeEscalon } from './trayectoria.js';
import { nivelDelJugador, bandaDeNivel } from '../../core/ficha.js';
import { puntosAbsolutos, desdePuntos, etiquetaDeRanked, servidorDeLaPartida } from '../../core/ranked.js';
import { tierPorId } from '../../data/ranked.js';
import { escalonDeCarrera } from '../../core/puntaje.js';
import { calcularContexto } from '../../core/contexto.js';
import { esCierreDeEdad } from '../../systems/edadCierre.js';
import { calcularCalendario } from '../../systems/edadInicio.js';

// Las siete piezas del escenario (§V.4). La tarjeta de cierre de un split no es una pieza: es un beat del relato.
export const PIEZAS = ['inicio', 'relato', 'decision', 'partido', 'mercado', 'minijuego', 'final'];
// Las que ocupan el escenario mientras el motor está en pausa (`state.pendiente`): una de estas, nunca `relato`.
export const PIEZAS_DE_PARADA = ['decision', 'partido', 'mercado', 'minijuego'];
// Los sistemas cuyas paradas son un partido (la fecha marcada, la serie, el Swiss y el bracket del Mundial).
const SISTEMAS_DE_PARTIDO = ['temporada', 'serie', 'internacional'];
// Las presentaciones que traen su propia familia, gane el sistema que gane (el mapa decisivo de una serie es un minijuego).
const PRESENTACIONES_CON_FAMILIA = ['minijuego', 'mercado'];

// Qué familia de parada muestra una pausa del motor. Primero la presentación, después el sistema.
export function familiaDeParada(pendiente) {
  const presentacion = pendiente?.decision?.presentacion;
  if (PRESENTACIONES_CON_FAMILIA.includes(presentacion)) {
    return presentacion;
  }
  if (SISTEMAS_DE_PARTIDO.includes(pendiente?.sistemaId)) {
    return 'partido';
  }
  return 'decision';
}

// La pieza del escenario para un estado. `reproduciendo`: el relato está contando una llamada al pipeline (aunque esa
// llamada haya dejado una pausa: la parada entra recién cuando el relato termina). Va ANTES que la final: la llamada que
// termina la carrera también tiene su relato (el último split, el retiro), y la tarjeta final entra cuando se contó.
export function piezaDe(estado, { reproduciendo = false } = {}) {
  if (!estado) {
    return 'inicio';
  }
  if (reproduciendo) {
    return 'relato';
  }
  if (estado.terminado && estado.tarjeta) {
    return 'final';
  }
  if (estado.pendiente) {
    return familiaDeParada(estado.pendiente);
  }
  return 'relato';
}

// Los cuartos (§V.4): Vos · Temporada · Equipo · Mundo · Carrera · Crónica.
export const CUARTOS = ['vos', 'temporada', 'equipo', 'mundo', 'carrera', 'cronica'];
// Donde los cuartos no se abren: el inicio no tiene carrera que mostrar, y el minijuego es dueño de sus teclas y de su
// reloj (abrir un cuarto a mitad de uno lo dejaría corriendo detrás). La ayuda sí se abre en el inicio. Vive acá, en el
// módulo puro, para que `teclado.js` no arrastre todos los renderers de los cuartos al importarla.
export const PIEZAS_SIN_CUARTOS = ['inicio', 'minijuego'];
// Lo que puede mostrar el acompañante (≥ 1180 px). `null` = nada.
export const TIPOS_DE_ACOMPANANTE = ['vos', 'mercado', 'carrera', 'serie', 'swiss', 'previa', 'tabla'];
const SIN_ACOMPANANTE = Object.freeze({ tipo: null, cuarto: null });
const PIEZAS_SIN_ACOMPANANTE = ['inicio', 'final', 'minijuego'];
// Las paradas que se leen contra la carrera entera: el cierre de año, el retiro y la vuelta.
const SISTEMAS_DE_CARRERA = ['edadCierre', 'retiro'];

// El panel que acompaña a la pieza, en el orden de §V.4. `cuarto` es el cuarto equivalente: en el celular (sin
// acompañante) lo abre el chip "ver contexto" de la parada.
export function acompananteDe(estado, pieza) {
  if (!estado || PIEZAS_SIN_ACOMPANANTE.includes(pieza)) {
    return SIN_ACOMPANANTE;
  }
  if (estado.phase === 'amateur') {
    return { tipo: 'vos', cuarto: 'vos' };
  }
  if (pieza === 'mercado') {
    // Tu contrato y tu valor ya están en la parada (`#mercadoVos`); lo que suma el panel es el mercado del mundo.
    return { tipo: 'mercado', cuarto: 'mundo' };
  }
  const sistema = estado.pendiente?.sistemaId ?? null;
  if (SISTEMAS_DE_CARRERA.includes(sistema)) {
    return { tipo: 'carrera', cuarto: 'carrera' };
  }
  const tablero = tableroDeSerie(estado);
  if (tablero) {
    return { tipo: tablero, cuarto: 'temporada' };
  }
  if (sistema === 'temporada') {
    return { tipo: 'previa', cuarto: 'temporada' };
  }
  if (estado.career?.temporada?.activa) {
    return { tipo: 'tabla', cuarto: 'temporada' };
  }
  if (estado.career?.currentOrg) {
    return { tipo: 'vos', cuarto: 'vos' };
  }
  return SIN_ACOMPANANTE;
}

// --- El cierre de un split ---------------------------------------------------------------------------------------------
//
// `fotoDeSplit` se saca al llamar a `avanzarSplit` (la página nueva) y `cierreDeSplit` la compara con el estado que vuelve
// sin pausa: eso es "el split cerró". Las dos son JSON (la foto viaja en `lolcs-vista`, `src/ui/almacenamiento.js`).

// Splits jugados en una tabla: los cuenta `registrarSplitJugado` (core/registro.js) donde se JUEGA la temporada, con el
// mismo guard que `systems/rendimiento.js`. Solo crece.
function splitsEnTabla(estado) {
  const sumar = (porTier) => Object.values(porTier ?? {}).reduce((suma, n) => suma + (Number(n) || 0), 0);
  const filas = estado.career?.registro?.porOrg ?? [];
  return filas.reduce((suma, fila) => suma + sumar(fila.splitsPorTier), 0)
    + sumar(estado.flags?.splitJugadoSinFila?.splitsPorTier);
}

// El número del jugador: el nivel (con su banda) en pro y retirado; el rango en el amateur, en puntos de la escalera
// (Hierro IV 0 LP = 0, cada división 100 LP: `core/ranked.js`), con su etiqueta legible.
export function numeroDe(estado) {
  if (estado.phase === 'amateur' && estado.player?.ranked) {
    const ranked = estado.player.ranked;
    return {
      etiqueta: 'rango',
      valor: puntosAbsolutos(ranked),
      banda: ranked.tier ?? null,
      texto: etiquetaDeRanked(ranked, servidorDeLaPartida(estado))
    };
  }
  const nivel = nivelDelJugador(estado);
  return { etiqueta: 'nivel', valor: Math.round(nivel), banda: bandaDeNivel(nivel), texto: null };
}

export function fotoDeSplit(estado) {
  const registro = estado.career?.registro ?? {};
  return {
    titulos: registro.titulos?.length ?? 0,
    internacionales: registro.internacionales?.length ?? 0,
    // `registro.porSplit` (GR-m, V.6) todavía puede no existir: `null` y la posición sale de la tabla.
    porSplit: Array.isArray(registro.porSplit) ? registro.porSplit.length : null,
    splitsEnTabla: splitsEnTabla(estado),
    temporadaActiva: Boolean(estado.career?.temporada?.activa),
    // FASE V (V4): la edad con la que arrancó el split. Con ella `cierreDeSplit` sabe si el split cerró un año.
    edad: estado.age ?? null,
    numero: numeroDe(estado)
  };
}

// Lo que se registra de un Mundial (`RESULTADOS_INTERNACIONALES`, core/registro.js), dicho como resultado de un split.
const TEXTO_DE_MUNDIAL = {
  campeon: 'Campeones del Mundo',
  final: 'Final del Mundial',
  semis: 'Semis del Mundial',
  cuartos: 'Cuartos del Mundial',
  eliminado: 'Afuera en el Swiss del Mundial',
  buen_papel: 'Buen papel en el Mundial'
};

function textoDePosicion(posicion, equipos) {
  return `${posicion}.º de ${equipos}`;
}

// Título > Mundial > la posición del split. `null` si el split no tuvo nada de eso (amateur, sin club).
function resultadoDelSplit(foto, estado) {
  if (!foto) {
    return null;
  }
  const registro = estado.career?.registro ?? {};
  const titulos = registro.titulos ?? [];
  if (titulos.length > foto.titulos) {
    return { tipo: 'titulo', texto: `Campeones de ${titulos[titulos.length - 1].nombre}` };
  }
  const internacionales = registro.internacionales ?? [];
  if (internacionales.length > foto.internacionales) {
    const ultimo = internacionales[internacionales.length - 1];
    return { tipo: 'mundial', texto: TEXTO_DE_MUNDIAL[ultimo.resultado] ?? 'Mundial' };
  }
  const porSplit = registro.porSplit;
  if (foto.porSplit !== null && Array.isArray(porSplit) && porSplit.length > foto.porSplit) {
    const fila = porSplit[porSplit.length - 1];
    return fila.posicion == null ? null : { tipo: 'posicion', texto: textoDePosicion(fila.posicion, fila.equipos) };
  }
  // Sin `porSplit`: la tabla del split, si se jugó una en ESTE split (se contó un split jugado, o la que estaba abierta
  // cuando se sacó la foto ya cerró).
  const temporada = estado.career?.temporada;
  const jugoTabla = splitsEnTabla(estado) > foto.splitsEnTabla || foto.temporadaActiva;
  if (jugoTabla && temporada && !temporada.activa && temporada.posicion != null) {
    return { tipo: 'posicion', texto: textoDePosicion(temporada.posicion, temporada.tabla?.length ?? 0) };
  }
  return null;
}

// `foto` es la de `fotoDeSplit` al abrir la página. `foto.parcial` (o una foto de otra fase: amateur → pro): el número
// sale sin "antes" (sin delta). Sin foto, tampoco hay resultado.
//
// FASE V (V4): si el split cerró un año y el motor NO frenó en el cierre (`cierreFrenado`: la página no tuvo la parada de
// `edadCierre`), el cierre trae también `anio`: el momento del año, que el reproductor sostiene un rato (una sola pausa por
// año; si el motor ya frenó en el cierre esa parada ES el momento, T9: nunca dos). `fotoAnio` es la foto del primer split del
// año (con ella el número del año tiene su "antes").
export function cierreDeSplit(foto, estado, { cierreFrenado = false, fotoAnio = null } = {}) {
  const ahora = numeroDe(estado);
  const conDelta = Boolean(foto) && !foto.parcial && foto.numero?.etiqueta === ahora.etiqueta;
  return {
    resultado: resultadoDelSplit(foto, estado),
    numero: {
      etiqueta: ahora.etiqueta,
      antes: conDelta ? foto.numero.valor : null,
      despues: ahora.valor,
      banda: ahora.banda,
      texto: ahora.texto
    },
    // FASE V (V5): el seguimiento del Golden Road del año, solo mientras el logro está vivo y ya hay algo cumplido; si no, `null`.
    // Es la misma cuenta del motor (`seguimientoGoldenRoad`, regla 15). JSON, como el resto: viaja en `lolcs-vista`.
    goldenRoad: seguimientoParaMostrar(seguimientoGoldenRoad(estado)),
    anio: cierreFrenado ? null : cierreDeAnio(foto, estado, fotoAnio, ahora)
  };
}

// ¿Este split cerró un año? La edad subió exactamente una (una vuelta del retiro la sube más) en un cierre de edad y la carrera
// sigue. `null` si no, o si la foto no sabe con qué edad arrancó el split (un marcador de antes de V4, o una foto `parcial`).
function cierreDeAnio(foto, estado, fotoAnio, ahora) {
  if (!foto || foto.parcial || !Number.isFinite(foto.edad) || estado.terminado) {
    return null;
  }
  if (estado.age !== foto.edad + 1 || !esCierreDeEdad(estado)) {
    return null;
  }
  const conDelta = Boolean(fotoAnio) && !fotoAnio.parcial && fotoAnio.numero?.etiqueta === ahora.etiqueta;
  return {
    anio: estado.calendario?.anio ?? null,
    numero: {
      etiqueta: ahora.etiqueta,
      antes: conDelta ? fotoAnio.numero.valor : null,
      despues: ahora.valor,
      banda: ahora.banda,
      texto: ahora.texto
    },
    // El mismo escalón que dice la pestaña Carrera (`textoDeEscalon`, regla 15): solo en el profesional.
    escalon: estado.phase === 'profesional' ? textoDeEscalon(escalonDeCarrera(estado)) : null
  };
}

// El delta de un número de cierre, en texto: "▲3", "▼1", "=" o `null` (sin "antes").
export function deltaDeCierre(numero) {
  if (!numero || numero.antes == null || numero.despues == null) {
    return null;
  }
  const diferencia = numero.despues - numero.antes;
  const sufijo = numero.etiqueta === 'rango' ? ' LP' : '';
  if (diferencia > 0) return `▲${diferencia}${sufijo}`;
  if (diferencia < 0) return `▼${-diferencia}${sufijo}`;
  return '=';
}

// El número de cierre sin el delta: "nivel 71" o "Diamante II · 45 LP".
export function textoDeNumero(numero) {
  if (!numero) {
    return '';
  }
  return numero.etiqueta === 'rango' ? (numero.texto ?? '') : `nivel ${numero.despues}`;
}

// FASE V (V4): lo mismo cuando el número vale `valor` (un cuadro del conteo que va de `antes` a `despues`). En el valor final
// dice exactamente `textoDeNumero` (con el puesto de la ladder, si lo trae); en el camino, el rango sale de los puntos de la
// escalera (`desdePuntos`): cada 100 LP cambia la división, y el LP que se sube al ascender cuenta bien. Sin servidor no hay
// cortes de Gran Maestro y Challenger: en el ápice el tramo usa el tier con el que terminó (`banda`).
const SERVIDOR_SIN_CORTES = Object.freeze({ cutoffGM: Infinity, cutoffChallenger: Infinity });
export function etiquetaDeRangoEn(puntos, banda) {
  const ranked = desdePuntos(puntos, SERVIDOR_SIN_CORTES);
  if (ranked.division === null && tierPorId(banda)?.apice) {
    ranked.tier = banda;
  }
  return etiquetaDeRanked(ranked);
}

export function textoDeNumeroEn(numero, valor) {
  if (!numero) {
    return '';
  }
  if (valor === numero.despues) {
    return textoDeNumero(numero);
  }
  return numero.etiqueta === 'rango' ? etiquetaDeRangoEn(valor, numero.banda) : `nivel ${valor}`;
}

// La línea con la que abre la página siguiente cuando la tarjeta no llegó a verse (INST o movimiento reducido):
// "Split anterior: 3.º de 10 · nivel 71 ▲3".
export function lineaDeSplitAnterior(cierre) {
  if (!cierre) {
    return null;
  }
  const numero = [textoDeNumero(cierre.numero), deltaDeCierre(cierre.numero)].filter(Boolean).join(' ');
  return `Split anterior: ${[cierre.resultado?.texto, numero].filter(Boolean).join(' · ')}`;
}

// --- Los carteles (FASE V, V4; PLAN.md §V.4 "Movimiento") ------------------------------------------------------------------
//
// El cartel de la página: UNA línea arriba de cada página del relato (de cada split) que dice en qué ventana del año arranca y
// en qué año; el primer split del año (la pretemporada) lo anuncia. No es un beat del reproductor y no suma espera: es el
// encabezado de la página. Sale del estado al ABRIR la página (antes de `avanzarSplit`): la ventana de ese split
// (`calcularContexto`, la misma cuenta que usa el motor y que dice la franja) y el año de su reloj (`calcularCalendario`: el
// `state.calendario` de un estado entre splits todavía es el del año que cerró). JSON, porque viaja en `lolcs-vista`.
export const LABEL_DE_VENTANA = {
  pretemporada: 'Pretemporada',
  regular: 'Temporada regular',
  playoffs: 'Playoffs',
  internacional: 'Internacional',
  offseason: 'Offseason'
};

export function cartelDePagina(estado) {
  if (!estado?.player || estado.terminado || estado.phase === 'retirado') {
    return null;
  }
  const ventana = calcularContexto(estado).ventana;
  const etiqueta = LABEL_DE_VENTANA[ventana];
  if (!etiqueta) {
    return null;
  }
  const anio = calcularCalendario(estado).anio;
  const nuevoAnio = ventana === 'pretemporada';
  return { ventana, anio, nuevoAnio, texto: nuevoAnio ? `Arranca ${anio} · ${etiqueta}` : `${anio} · ${etiqueta}` };
}
