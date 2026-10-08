// Qué dibuja la pestaña Carrera, la parte pura (FASE V, V5; PLAN.md §V.4 y §V.6). Funciones puras sobre `state`: sin DOM, sin
// `rng`, sin escribir nada, para que corran en Node y `validate.js` les pueda poner un mutante (regla 15: lo que la pantalla
// dibuja es lo que dice el registro). `cuartos/carrera.js` dibuja EXACTAMENTE esto y no calcula nada aparte.
//
// El eje del tiempo son años calendario con fracción (`anio + split / splitsPorEdad`): un año son `splitsPorEdad` splits. Un
// punto por fila de `registro.porSplit` (el split en una tabla, con el nivel que tenías), un tramo por fila de `registro.porOrg`
// (el club, con su primer y su último split), y los hitos salen de los mismos selectores del motor: los títulos son
// `registro.titulos`, los Mundiales `mundialesGanados` y los Golden Roads `goldenRoads` (`core/registro.js`).
import { BALANCE } from '../../data/balance.js';
import { mundialesGanados, goldenRoads, TIER_DE_PRIMERA } from '../../core/registro.js';
import { seguimientoGoldenRoad } from '../../core/vistaDeCarrera.js';
import { escalonDeCarrera } from '../../core/puntaje.js';
import { bandaDeNota } from '../../core/temporadaResumen.js';
import { nombreVisibleDeLiga } from '../../core/ligas.js';

const MARCA_SI = '✓';
const MARCA_NO = '✕';
const MARCA_PENDIENTE = '◻';

// El tiempo, en años con fracción. `abs` es un conteo absoluto de splits (`player.splitCount`) desde `anioBase`.
function xDeSplitAbsoluto(abs, anioBase, porAnio) {
  return anioBase + abs / porAnio;
}

// Los tramos de club: uno por fila de `porOrg`. `hasta` es `null` mientras la fila siga abierta y la carrera siga (la cinta la
// dibuja "todavía en curso"); con la carrera terminada, la última fila cierra donde terminó la carrera.
function tramosDe(registro, { anioBase, porAnio, splitActual, cerrada }) {
  return (registro.porOrg ?? []).map((fila) => {
    const abierta = fila.hastaSplit === null || fila.hastaSplit === undefined;
    return {
      org: fila.org,
      liga: fila.liga ?? null,
      tier: fila.tier,
      desde: xDeSplitAbsoluto(fila.desdeSplit, anioBase, porAnio),
      hasta: abierta
        ? (cerrada ? xDeSplitAbsoluto(splitActual, anioBase, porAnio) : null)
        : xDeSplitAbsoluto(fila.hastaSplit, anioBase, porAnio),
      activa: abierta && !cerrada,
      desdeAnio: fila.desdeAnio,
      hastaAnio: fila.hastaAnio ?? null,
      splits: fila.splits,
      titulos: (fila.titulos ?? []).map((titulo) => ({ nombre: titulo.nombre, anio: titulo.anio }))
    };
  });
}

// Los puntos de la curva fina: uno por fila de `porSplit`, en el orden en que el motor las escribió. El punto va en el medio de
// su split (así la curva y los tramos de la cinta de arriba cubren lo mismo).
const MITAD_DE_UN_SPLIT = 0.5;
function puntosDe(registro, porAnio) {
  return (registro.porSplit ?? []).map((fila) => ({
    x: fila.anio + (fila.split + MITAD_DE_UN_SPLIT) / porAnio,
    anio: fila.anio,
    split: fila.split,
    org: fila.org,
    liga: fila.liga ?? null,
    tier: fila.tier,
    posicion: fila.posicion,
    equipos: fila.equipos,
    nivel: fila.nivel
  }));
}

// La nota de cada temporada cerrada (`registro.temporadas`), con su banda de color (la misma del titular del año).
function notasDe(registro) {
  return (registro.temporadas ?? []).map((entrada) => ({ anio: entrada.anio, nota: entrada.nota, banda: bandaDeNota(entrada.nota) }));
}

// "LCK 2033". El torneo de tier 3 no es una liga (`liga: null`): `nombre` trae la frase del motor ("un torneo chico de la región").
function textoDeTitulo(titulo) {
  return `${titulo.liga ? nombreVisibleDeLiga(titulo.liga) : 'Torneo chico'} ${titulo.anio}`;
}

// Los hitos, ordenados por año; en un mismo año el mayor primero (Golden Road, Mundial, título). Un Mundial y un Golden Road
// son de lo más alto: cuentan como tier 1.
const PESO_DE_HITO = { goldenRoad: 0, mundial: 1, titulo: 2 };
function hitosDe({ titulos, mundiales, goldenRoads: anios }) {
  const hitos = [
    ...anios.map((anio) => ({ tipo: 'goldenRoad', anio, texto: `Golden Road ${anio}`, org: null, tier: TIER_DE_PRIMERA })),
    ...mundiales.map((m) => ({ tipo: 'mundial', anio: m.anio, texto: `Mundial ${m.anio}`, org: m.org, tier: TIER_DE_PRIMERA })),
    ...titulos.map((t) => ({ tipo: 'titulo', anio: t.anio, texto: textoDeTitulo(t), org: t.org, tier: t.tier }))
  ];
  return hitos
    .map((hito, indice) => ({ hito, indice }))
    .sort((a, b) => a.hito.anio - b.hito.anio || PESO_DE_HITO[a.hito.tipo] - PESO_DE_HITO[b.hito.tipo] || a.indice - b.indice)
    .map(({ hito }) => hito);
}

// El dominio compartido de la cinta y la curva: años enteros que cubren todo lo dibujado (y el presente, si la carrera sigue).
function dominioDe({ tramos, puntos }, { anioBase, porAnio, splitActual, cerrada }) {
  const extremos = [
    ...tramos.map((t) => t.desde),
    ...tramos.map((t) => t.hasta).filter((x) => x !== null),
    ...puntos.map((p) => p.x - MITAD_DE_UN_SPLIT / porAnio),
    ...puntos.map((p) => p.x + MITAD_DE_UN_SPLIT / porAnio)
  ];
  if (extremos.length === 0) {
    return null;
  }
  if (!cerrada) {
    extremos.push(xDeSplitAbsoluto(splitActual, anioBase, porAnio));
  }
  const desde = Math.floor(Math.min(...extremos));
  const hasta = Math.max(Math.ceil(Math.max(...extremos)), desde + 1);
  return [desde, hasta];
}

// La trayectoria que se desprende de un registro: puro sobre `registro` (así `validate.js` puede armar registros a mano). Con
// `registro` sin nada (el amateur) devuelve `vacia: true`.
export function trayectoriaDeRegistro(registro, { anioBase = BALANCE.calendario.anioBase, splitActual = 0, cerrada = false } = {}) {
  const porAnio = BALANCE.edad.splitsPorEdad;
  const contexto = { anioBase, porAnio, splitActual, cerrada };
  const tramos = tramosDe(registro, contexto);
  const puntos = puntosDe(registro, porAnio);
  const titulos = (registro.titulos ?? []).map((t) => ({ nombre: t.nombre, anio: t.anio, org: t.org, liga: t.liga ?? null, tier: t.tier }));
  const mundiales = mundialesGanados(registro).map((m) => ({ anio: m.anio, org: m.org, liga: m.liga ?? null, torneo: m.torneo }));
  const anios = goldenRoads(registro);
  return {
    vacia: tramos.length === 0 && puntos.length === 0,
    tramos,
    puntos,
    notas: notasDe(registro),
    titulos,
    mundiales,
    goldenRoads: anios,
    hitos: hitosDe({ titulos, mundiales, goldenRoads: anios }),
    dominio: dominioDe({ tramos, puntos }, contexto)
  };
}

// El archirrival tal como lo ve el jugador: quién es, dónde juega y cómo va el duelo (títulos + Mundiales de cada lado). `org`
// llega recién en el primer cierre de año.
function rivalDe(estado) {
  const rival = estado.mundo?.archirrival ?? null;
  if (!rival) {
    return null;
  }
  return {
    handle: rival.handle,
    rol: rival.rol,
    org: rival.org ?? null,
    liga: rival.liga ?? null,
    nivel: rival.nivel,
    titulos: rival.titulos,
    internacionales: rival.internacionales,
    tuyos: rival.duelo?.tuyos ?? 0,
    suyos: rival.duelo?.suyos ?? 0
  };
}

// Todo lo que dibuja el cuarto Carrera (y el resumen del acompañante) para un estado. `escalon` y `seguimiento` solo existen en
// el profesional, con la carrera en marcha (el motor los define ahí).
export function trayectoriaDeCarrera(estado) {
  const registro = estado?.career?.registro ?? null;
  if (!registro) {
    return { vacia: true, tramos: [], puntos: [], notas: [], titulos: [], mundiales: [], goldenRoads: [], hitos: [], dominio: null, escalon: null, seguimiento: null, rival: null };
  }
  const base = trayectoriaDeRegistro(registro, {
    anioBase: estado.calendario?.anioBase ?? BALANCE.calendario.anioBase,
    splitActual: estado.player?.splitCount ?? 0,
    cerrada: Boolean(estado.terminado)
  });
  const enMarcha = estado.phase === 'profesional' && !estado.terminado;
  return {
    ...base,
    escalon: enMarcha ? escalonDeCarrera(estado) : null,
    seguimiento: seguimientoGoldenRoad(estado),
    rival: rivalDe(estado)
  };
}

// --- Las frases (también puras: el cuarto, el acompañante y la tarjeta de cierre dicen lo mismo con las mismas palabras) ---

// "Vas por Campeón · para Figura mundial te falta un título de liga de primera." El "te falta" sale de la misma cuenta que el
// "te faltó" de la tarjeta final (`escalonDeCarrera`, `core/puntaje.js`).
export function textoDeEscalon(escalon) {
  if (!escalon) {
    return null;
  }
  const vas = `Vas por ${escalon.actual.nombre}`;
  if (!escalon.siguiente) {
    return { vas, falta: 'Es el techo de la escala: no hay escalón más arriba.' };
  }
  const { nombre, enPresente } = escalon.siguiente;
  return { vas, falta: `para ${nombre} ${enPresente.charAt(0).toLowerCase()}${enPresente.slice(1)}` };
}

// Los cinco hechos del Golden Road, en orden: los tres splits, la liga y el Mundial.
const ETIQUETAS_DE_LIGA_Y_MUNDIAL = ['liga', 'Mundial'];
const MARCA_DE_ESTADO = { si: MARCA_SI, no: MARCA_NO, pendiente: MARCA_PENDIENTE };
export function itemsDeGoldenRoad(seguimiento) {
  if (!seguimiento) {
    return [];
  }
  const estados = [...seguimiento.splits, seguimiento.liga, seguimiento.mundial];
  const etiquetas = [...seguimiento.splits.map((_, i) => `split ${i + 1}`), ...ETIQUETAS_DE_LIGA_Y_MUNDIAL];
  return estados.map((estado, i) => ({ etiqueta: etiquetas[i], estado, marca: MARCA_DE_ESTADO[estado] }));
}

// "Golden Road 2031: ✓ split 1 · ✓ split 2 · ◻ split 3 · ◻ liga · ◻ Mundial". `null` si el logro ya no se puede (o no aplica).
export function lineaDeGoldenRoad(seguimiento) {
  if (!seguimiento || !seguimiento.vivo) {
    return null;
  }
  return `Golden Road ${seguimiento.anio}: ${itemsDeGoldenRoad(seguimiento).map((item) => `${item.marca} ${item.etiqueta}`).join(' · ')}`;
}

// El seguimiento que merece una línea en la tarjeta de cierre: vivo y con algo ya cumplido (un año sin nada hecho no es noticia).
export function seguimientoParaMostrar(seguimiento) {
  if (!seguimiento || !seguimiento.vivo) {
    return null;
  }
  return itemsDeGoldenRoad(seguimiento).some((item) => item.estado === 'si') ? seguimiento : null;
}

// "2031", "2031 y 2036", "2031, 2036 y 2038".
function enumerarAnios(anios) {
  if (anios.length <= 1) {
    return anios.join('');
  }
  return `${anios.slice(0, -1).join(', ')} y ${anios[anios.length - 1]}`;
}

// Los años con Golden Road de una carrera (el estado final): la medalla se calcula del registro, no se guarda en la tarjeta. Un
// estado sin registro (o de antes de `porSplit`) no tiene ninguno.
export function goldenRoadsDeEstado(estado) {
  const registro = estado?.career?.registro;
  return Array.isArray(registro?.porSplit) ? goldenRoads(registro) : [];
}

// La medalla de la tarjeta final, el texto para compartir, el PNG y el historial: "Golden Road 2031". Sin ninguno, `null`: nunca
// "0 Golden Roads".
export function medallaDeGoldenRoad(anios) {
  if (!Array.isArray(anios) || anios.length === 0) {
    return null;
  }
  return `Golden Road ${enumerarAnios(anios)}`;
}
