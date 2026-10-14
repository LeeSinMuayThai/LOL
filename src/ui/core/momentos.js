// Los momentos (PLANUI §6.5 y §0.6, U3a): qué del tramo que el relato acaba de contar merece una pantalla propia. Puro:
// sin DOM, sin azar y sin tocar el motor. La señal sale de lo que el motor ya registra:
//   - el título: `career.registro.titulos` crece entre el registro de antes de la llamada y el de después;
//   - el Mundial: un log `internacional` con `resultado: 'campeon'` en el tramo (la variante dorada);
//   - el resumen de la temporada: el log `edad` con su `nota` (`systems/resumenAnio.js`), en todas las velocidades.
// Un tramo trae como mucho UN takeover (§6.5): si el mismo tramo trae el Mundial y un título, va el Mundial.
// Lo que dibuja cada momento es de `fx/momento.js`; lo que ya se vio lo anota `almacenamiento.js` (`momentosVistos`).
import { efectosDeTexto } from '../components/chipsEje.js';
import { cierreDeSplit } from './escena.js';
import { formaBeat } from '../../core/log.js';

// Los tipos de log que son "tus resultados" (la serie, la tabla, el rendimiento, el internacional) y los del mundo (los
// campeones de otras ligas, el Top 20, los rivales): el orden de los titulares de "Mientras tanto".
const TIPOS_TUYOS = ['serie', 'temporada', 'rendimiento', 'internacional', 'competitivo', 'mercado', 'amateur'];
const TIPOS_DEL_MUNDO = ['escena', 'top_mundial', 'rivales', 'mundo', 'meta'];
const PESO = { tuyo: 3, eleccion: 2, resto: 1, mundo: 0 };
// Cuántos titulares lleva la franja y cuántos ejes sumados.
export const TITULARES_DE_FRANJA = 3;
export const EJES_DE_FRANJA = 4;
export const EJES_DEL_RESUMEN = 5;
// La banda de la nota en palabras y el glifo del kit de cada viñeta (las viñetas traen su emoji del motor,
// `core/temporadaResumen.js`; la pantalla dibuja el glifo: PLANUI §5.9, nada de emojis). Los usa también el relato
// (`components/feed.js`, el resumen del año como beat).
export const LABEL_BANDA = { rojo: 'Flojo', gris: 'Parejo', ambar: 'Bueno', verde: 'Excelente' };
export const GLIFO_DE_VINETA = { '📊': 'nivel', '🏆': 'copa', '🌍': 'mundo', '⚡': 'serie', '🎯': 'meta', '🎀': 'carrera' };

const esFinalGanada = (log) => Boolean(log?.postSerie && log.gano && log.ronda === 'final');
const esMundialGanado = (log) => log?.type === 'internacional' && log.resultado === 'campeon';
const esResumenDelAnio = (log) => log?.type === 'edad' && Number.isFinite(log.nota);

function claveDe(momento) {
  return `${momento.tipo}:${momento.anio}:${momento.nombre}:${momento.indice}`;
}

// El índice (absoluto en `logs`) del primer log del tramo que cumple `cumple`, o -1.
function indiceDesde(logs, desde, cumple) {
  for (let i = Math.max(0, desde); i < logs.length; i += 1) {
    if (cumple(logs[i])) return i;
  }
  return -1;
}

// Los takeovers del tramo `[desde, despues.logs.length)`: `[{ tipo: 'titulo'|'mundial', nombre, anio, org, liga, indice,
// clave }]`, con 0 o 1 elemento. `indice` es el log tras el que entra (la final ganada, el "Campeones de…" de la tabla o
// el último del tramo); `clave`, la que anota `momentosVistos`.
export function momentosDelTramo({ registroAntes, despues, desde = 0 } = {}) {
  const logs = despues?.logs ?? [];
  const registro = despues?.career?.registro ?? {};
  const anio = despues?.calendario?.anio ?? null;
  const org = despues?.career?.currentOrg ?? null;
  const mundial = indiceDesde(logs, desde, esMundialGanado);
  if (mundial >= 0) {
    const m = { tipo: 'mundial', nombre: 'Mundial', anio, org, liga: 'mundial', indice: mundial };
    return [{ ...m, clave: claveDe(m) }];
  }
  const antes = registroAntes?.titulos?.length ?? 0;
  const titulos = registro.titulos ?? [];
  if (titulos.length <= antes) return [];
  const titulo = titulos[titulos.length - 1];
  const final = indiceDesde(logs, desde, esFinalGanada);
  const tabla = indiceDesde(logs, desde, (log) => log?.type === 'rendimiento' && /^Campeones de /.test(log.message ?? ''));
  const indice = final >= 0 ? final : tabla >= 0 ? tabla : logs.length - 1;
  const m = { tipo: 'titulo', nombre: titulo.nombre, anio: titulo.anio ?? anio, org: titulo.org ?? org, liga: titulo.liga ?? null, indice };
  return [{ ...m, clave: claveDe(m) }];
}

// Los efectos de una lista de logs, sumados por eje (y por sufijo: los LP no se suman con una stat): `[{ eje, sufijo,
// valor }]`, de mayor a menor movimiento, sin los que suman 0. Solo los deltas (`cambio`) con eje.
export function ejesSumados(logs) {
  const suma = new Map();
  for (const log of logs) {
    if (typeof log?.efectos !== 'string' || log.tecnico) continue;
    for (const e of efectosDeTexto(log.efectos)) {
      if (!e.eje || !e.cambio || !Number.isFinite(e.valor)) continue;
      const k = `${e.eje}|${e.sufijo ?? ''}`;
      const previo = suma.get(k) ?? { eje: e.eje, sufijo: e.sufijo ?? '', valor: 0 };
      suma.set(k, { ...previo, valor: previo.valor + e.valor });
    }
  }
  return [...suma.values()].filter((x) => x.valor !== 0).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
}

function pesoDe(log) {
  if (TIPOS_DEL_MUNDO.includes(log.type)) return PESO.mundo;
  if (log.postSerie || TIPOS_TUYOS.includes(log.type)) return PESO.tuyo;
  if (log.titulo && log.cuerpo) return PESO.eleccion;
  return PESO.resto;
}

// "Mientras tanto" (PLANUI §0.6, punto 3): lo narrativo del tramo `[desde, logs.length)` en una franja. `{ cuantas, ejes,
// titulares }`: cuántas cosas pasaron (los beats narrativos), los ejes sumados y hasta `TITULARES_DE_FRANJA` titulares —
// primero tus resultados y los eventos con elección, el mundo al final; dentro de cada peso, el más nuevo primero.
export function franjaDelTramo(logs, desde = 0) {
  const narrativos = (logs ?? []).slice(Math.max(0, desde)).filter((log) => formaBeat(log) && !log.tecnico);
  const titulares = narrativos
    .map((log, i) => ({ log, i, peso: pesoDe(log) }))
    .sort((a, b) => b.peso - a.peso || b.i - a.i)
    .slice(0, TITULARES_DE_FRANJA)
    .map(({ log }) => ({ type: log.type ?? null, texto: String(log.titulo ?? log.message ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((t) => t.texto);
  return { cuantas: narrativos.length, ejes: ejesSumados(narrativos).slice(0, EJES_DE_FRANJA), titulares };
}

// El resumen de la temporada (PLANUI §0.6, punto 2): `null` si el tramo no trae el log `edad` con su nota. `fotoAnio` es
// la foto del primer split del año (`fotoDeSplit`): con ella el número tiene su "antes".
export function resumenDelTramo({ despues, desde = 0, fotoAnio = null } = {}) {
  const logs = despues?.logs ?? [];
  const i = indiceDesde(logs, desde, esResumenDelAnio);
  if (i < 0) return null;
  const log = logs[i];
  const anio = log.anio ?? despues.calendario?.anio ?? null;
  // los logs del año: desde el resumen anterior (exclusive) hasta este
  let inicio = 0;
  for (let j = i - 1; j >= 0; j -= 1) {
    if (esResumenDelAnio(logs[j])) {
      inicio = j + 1;
      break;
    }
  }
  const registro = despues.career?.registro ?? {};
  const escena = despues.mundo?.escenaAnual;
  const mundo = escena && (escena.anio == null || escena.anio === anio)
    ? {
      campeones: Object.entries(escena.campeones ?? {}).filter(([, org]) => org).map(([liga, org]) => ({ liga, org })),
      campeonMundial: escena.campeonMundial ?? null
    }
    : null;
  let numero = null;
  try {
    numero = cierreDeSplit(fotoAnio, despues).numero;
  } catch {
    numero = null;
  }
  // Sin la foto del primer split del año (se retomó a mitad de año), el "antes" del nivel es el nivel con que se jugó el
  // primer split del año (`porSplit[].nivel`, el que registra el motor).
  if (numero && !Number.isFinite(numero.antes) && numero.etiqueta === 'nivel') {
    const primera = (registro.porSplit ?? []).find((f) => f.anio === anio && Number.isFinite(f.nivel));
    if (primera) numero = { ...numero, antes: primera.nivel };
  }
  return {
    indice: i,
    clave: `temporada:${anio}:${i}`,
    anio,
    temporada: log.temporada ?? null,
    nota: log.nota,
    banda: log.banda ?? null,
    bandaTexto: LABEL_BANDA[log.banda] ?? log.banda ?? '',
    titular: log.message ?? '',
    bajada: log.bajada ?? null,
    vinetas: (log.vinetas ?? []).map((v) => ({ glifo: GLIFO_DE_VINETA[v.icono] ?? 'punto', texto: v.texto ?? '' })),
    splits: (registro.porSplit ?? []).filter((f) => f.anio === anio)
      .map((f) => ({ liga: f.liga ?? null, tier: f.tier ?? null, org: f.org ?? null, posicion: f.posicion ?? null, equipos: f.equipos ?? null })),
    titulos: (registro.titulos ?? []).filter((t) => t.anio === anio).map((t) => ({ nombre: t.nombre, liga: t.liga ?? null, org: t.org ?? null })),
    mundial: (registro.internacionales ?? []).some((x) => x.anio === anio && x.resultado === 'campeon'),
    numero,
    ejes: ejesSumados(logs.slice(inicio, i + 1)).slice(0, EJES_DEL_RESUMEN),
    mundo
  };
}
