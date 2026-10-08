// El director de escena, la mitad pura (FASE V, V2-B; PLAN.md §V.4 y §V.5). Decide QUÉ pieza ocupa el escenario
// (`piezaDe`), qué panel la acompaña (`acompananteDe`, la usa V2-C) y cómo se cuenta el cierre de un split
// (`fotoDeSplit` + `cierreDeSplit`). Funciones puras sobre `state`: sin DOM, sin `rng`, sin escribir nada, para que corran
// en Node y `validate.js` les pueda poner un mutante. La mitad del DOM es `src/ui/escena.js`: es la única que escribe
// `.shell[data-pieza]`.
import { tableroDeSerie } from '../../core/vistaDeCarrera.js';
import { nivelDelJugador, bandaDeNivel } from '../../core/ficha.js';
import { puntosAbsolutos, etiquetaDeRanked, servidorDeLaPartida } from '../../core/ranked.js';

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
// llamada haya dejado una pausa: la parada entra recién cuando el relato termina).
export function piezaDe(estado, { reproduciendo = false } = {}) {
  if (!estado) {
    return 'inicio';
  }
  if (estado.terminado && estado.tarjeta) {
    return 'final';
  }
  if (reproduciendo) {
    return 'relato';
  }
  if (estado.pendiente) {
    return familiaDeParada(estado.pendiente);
  }
  return 'relato';
}

// Los cuartos (§V.4): Vos · Temporada · Equipo · Mundo · Carrera · Crónica.
export const CUARTOS = ['vos', 'temporada', 'equipo', 'mundo', 'carrera', 'cronica'];
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
function numeroDe(estado) {
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
export function cierreDeSplit(foto, estado) {
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
    }
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

// La línea con la que abre la página siguiente cuando la tarjeta no llegó a verse (INST o movimiento reducido):
// "Split anterior: 3.º de 10 · nivel 71 ▲3".
export function lineaDeSplitAnterior(cierre) {
  if (!cierre) {
    return null;
  }
  const numero = [textoDeNumero(cierre.numero), deltaDeCierre(cierre.numero)].filter(Boolean).join(' ');
  return `Split anterior: ${[cierre.resultado?.texto, numero].filter(Boolean).join(' · ')}`;
}
