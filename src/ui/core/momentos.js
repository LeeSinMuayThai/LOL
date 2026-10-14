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
import { TODOS_LOS_EVENTOS } from '../../data/events/index.js';
import { bandaDeArraigoFicha, bandaDeHype, bandaDeJerarquia } from '../../core/ficha.js';
import { hechosDeCarrera, nivelDeCarrera, NIVELES } from '../../core/puntaje.js';
import { conSplitPendienteAsentado } from '../../core/registro.js';

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
    vinetas: vinetasDelDiario(log.vinetas).map((v) => ({ glifo: GLIFO_DE_VINETA[v.icono] ?? 'punto', texto: v.texto ?? '' })),
    splits: (registro.porSplit ?? []).filter((f) => f.anio === anio)
      .map((f) => ({ liga: f.liga ?? null, tier: f.tier ?? null, org: f.org ?? null, posicion: f.posicion ?? null, equipos: f.equipos ?? null })),
    titulos: (registro.titulos ?? []).filter((t) => t.anio === anio).map((t) => ({ nombre: t.nombre, liga: t.liga ?? null, org: t.org ?? null })),
    mundial: (registro.internacionales ?? []).some((x) => x.anio === anio && x.resultado === 'campeon'),
    numero,
    ejes: ejesSumados(logs.slice(inicio, i + 1)).slice(0, EJES_DEL_RESUMEN),
    mundo,
    // W1-D (PLANUI §0.7, W2): el diario. La decisión del año, los escalones que subiste y cuánto se movió lo tuyo.
    ultimaHora: ultimaHoraDelAnio(logs.slice(inicio, i), registro, anio),
    ...ascensosYDeltas(despues, anio)
  };
}

// ============================================================================
// W1-D (PLANUI §0.7, W2 y W3): el diario de la temporada y "tan cerca". Puro: sale de los logs del año, del registro y de
// `flags.edadSnapshot` (la foto que el motor toma al abrir cada año, `systems/edadInicio.js`). No toca el motor.
// ============================================================================

// Las viñetas del diario: como mucho `VINETAS_DEL_DIARIO`. Afuera primero la de los números (el nivel ya tiene su dato
// arriba) y después la del meta, salvo que el parche te haya matado el main.
export const VINETAS_DEL_DIARIO = 4;
const VINETAS_QUE_SOBRAN = ['📊', '🎯'];
export function vinetasDelDiario(vinetas) {
  let lista = [...(vinetas ?? [])];
  for (const icono of VINETAS_QUE_SOBRAN) {
    if (lista.length <= VINETAS_DEL_DIARIO) break;
    const i = lista.findIndex((v) => v?.icono === icono && !/te dejó sin/.test(v.texto ?? ''));
    if (i >= 0) lista.splice(i, 1);
  }
  return lista.slice(0, VINETAS_DEL_DIARIO);
}

// "Última hora": la decisión más pesada del año. Una firma en el mercado pesa más que una bifurcación, que pesa más que
// otro evento que contestaste, que pesa más que el plan del cierre. A igual peso, la más nueva.
const PESO_DE_DECISION = { firma: 4, bifurcacion: 3, evento: 2, plan: 1 };
// Lo que salió se corta en frases enteras: el diario se lee en cinco segundos.
const LARGO_DE_LO_QUE_SALIO = 180;
const SEPARADOR_DE_OPCION = ' · ';

const escaparRegex = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// El título del dato con sus tokens (`{org}`) como comodín: el log trae el título ya resuelto.
const patronDeTitulo = (titulo) => new RegExp(`^${escaparRegex(titulo).replace(/\\\{[a-zA-Z]+\\\}/g, '.+')}$`);
let catalogo = null;
function claseDeEvento(nombre) {
  if (!catalogo) {
    catalogo = {
      plan: TODOS_LOS_EVENTOS.filter((e) => e.cierreDeEdad).map((e) => patronDeTitulo(e.title)),
      bifurcacion: TODOS_LOS_EVENTOS.filter((e) => e.bifurcacion && !e.cierreDeEdad).map((e) => patronDeTitulo(e.title))
    };
  }
  if (catalogo.plan.some((re) => re.test(nombre))) return 'plan';
  if (catalogo.bifurcacion.some((re) => re.test(nombre))) return 'bifurcacion';
  return 'evento';
}

const minuscula = (x) => (x && !/^[A-ZÁÉÍÓÚÑ0-9]{2}/.test(x) ? x[0].toLowerCase() + x.slice(1) : x ?? '');
const conPunto = (x) => (/[.!?…]$/.test(x) ? x : `${x}.`);

// Lo que salió, en frases enteras hasta `largo`; si la primera ya lo pasa, cortada con "…".
export function recortarFrase(texto, largo = LARGO_DE_LO_QUE_SALIO) {
  const limpio = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= largo) return limpio;
  let salida = '';
  for (const f of limpio.match(/[^.!?…]+[.!?…]+/g) ?? []) {
    if ((salida + f).trim().length > largo) break;
    salida += f;
  }
  return salida.trim() || `${limpio.slice(0, largo - 1).replace(/\s+\S*$/, '')}…`;
}

const cuantos = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Cómo le fue en el año a la org que elegiste: el título o el último puesto en la tabla.
function resultadoDelAnio(registro, anio, org) {
  const titulo = (registro.titulos ?? []).find((t) => t.anio === anio && t.org === org);
  if (titulo) return `salieron campeones de ${titulo.nombre}`;
  const fila = (registro.porSplit ?? []).filter((f) => f.anio === anio && f.org === org && f.posicion != null).at(-1);
  if (fila) return `terminaron ${fila.posicion}.º${fila.equipos ? ` de ${fila.equipos}` : ''}`;
  return null;
}

// La firma del mercado que decidiste vos (la de una sola carta sin nada en juego la firma tu perfil: no cuenta). Los textos
// son los de `systems/mercado.js` (aceptarOferta, resolverTraspaso).
function firmaDe(log, anterior, registro, anio) {
  if (log.type !== 'mercado' || anterior?.unaSolaCarta) return null;
  const m = String(log.message ?? '');
  const anios = m.match(/(\d+) años?\./);
  const porAnios = anios ? ` por ${cuantos(Number(anios[1]), 'año', 'años')}` : '';
  let eleccion = null;
  let org = null;
  let r = m.match(/^Firmás con (.+?) \(/);
  if (r) {
    org = r[1];
    eleccion = `Elegiste firmar con ${org}${porAnios}`;
  } else if ((r = m.match(/^Renovás con (.+?):/))) {
    org = r[1];
    eleccion = `Elegiste quedarte en ${org}: renovaste${porAnios}`;
  } else if ((r = m.match(/^Traspaso cerrado: te vas de (.+?) a (.+?) a mitad de contrato/))) {
    org = r[2];
    eleccion = `Elegiste irte de ${r[1]} a ${org} a mitad de contrato`;
  } else if ((r = m.match(/^Te quedás en (.+?)\. El traspaso no se hace\./))) {
    org = r[1];
    eleccion = `Elegiste quedarte en ${org} y no irte en el traspaso`;
  }
  if (!eleccion) return null;
  const salio = resultadoDelAnio(registro, anio, org);
  return { tipo: 'firma', rotulo: 'El mercado', eleccion: conPunto(eleccion), salio: salio ? conPunto(`Con ${org}, ${salio}`) : '' };
}

// El evento que contestaste vos (el que resolvió tu perfil viene con `cronica` y no cuenta): "Nombre · Opción".
function eventoDe(log) {
  if (log.type !== 'event' || log.cronica || !log.titulo || !log.cuerpo) return null;
  const corte = log.titulo.indexOf(SEPARADOR_DE_OPCION);
  if (corte < 0) return null;
  const nombre = log.titulo.slice(0, corte).trim();
  const opcion = log.titulo.slice(corte + SEPARADOR_DE_OPCION.length).trim();
  if (!nombre || !opcion) return null;
  const tipo = claseDeEvento(nombre);
  const eleccion = tipo === 'plan' ? `Cerraste el año eligiendo ${minuscula(opcion)}` : `Elegiste ${minuscula(opcion)}`;
  return { tipo, rotulo: nombre, eleccion: conPunto(eleccion), salio: recortarFrase(log.cuerpo) };
}

// La decisión más pesada de los logs del año (`logs`: los del año, sin el resumen): `{ tipo, rotulo, eleccion, salio }`, o
// `null` si no decidiste nada.
export function ultimaHoraDelAnio(logs, registro = {}, anio = null) {
  let mejor = null;
  (logs ?? []).forEach((log, i) => {
    if (!log) return;
    const d = firmaDe(log, logs[i - 1], registro, anio) ?? eventoDe(log);
    if (d && (!mejor || PESO_DE_DECISION[d.tipo] >= PESO_DE_DECISION[mejor.tipo])) mejor = d;
  });
  return mejor;
}

// --- El ascenso de escalón y los deltas del año ---

const ORDEN = {
  arraigo: ['uno_mas', 'querido', 'idolo', 'leyenda'],
  jerarquia: ['rookie', 'titular', 'referente', 'franquicia'],
  hype: ['ignoto', 'conocido', 'figura', 'estrella'],
  carrera: NIVELES.map((n) => n.id)
};
const sube = (eje, antes, ahora) => ORDEN[eje].indexOf(ahora) > ORDEN[eje].indexOf(antes);
const TEXTO_DE_HYPE = { conocido: 'Ya te conocen', figura: 'Ya sos una figura', estrella: 'Sos una estrella' };
// El banner va con el escalón que más pesa; los demás, como chips.
const ORDEN_DE_ASCENSO = ['arraigo', 'carrera', 'jerarquia', 'hype'];

const bandaHype = (v) => bandaDeHype({ player: { stats: { hype: v } }, flags: {} });
const bandaJerarquia = (v) => bandaDeJerarquia({ career: { jerarquia: v } });

// La org de ahora, si es con la que arrancaste el año: el arraigo y la jerarquía se cuentan contra la foto del año solo si
// no cambiaste de club (al firmar en otro lado los dos arrancan de nuevo, y "subir" no sería tuyo).
function mismaOrgTodoElAnio(despues, anio) {
  const org = despues.career?.currentOrg;
  if (!org || despues.phase !== 'profesional') return null;
  const abierta = (despues.career.registro?.porOrg ?? []).filter((f) => f.hastaAnio == null).at(-1);
  return abierta && abierta.org === org && Number.isFinite(abierta.desdeAnio) && abierta.desdeAnio < anio ? org : null;
}

// El escalón de la carrera de antes y de ahora: los hechos de hoy menos lo que sumó este año (los splits, los títulos de
// primera y los Mundiales). El Top 20 y el ranking del mundo no se descuentan: si el escalón subió solo por eso, no se
// anuncia (nunca se anuncia uno que no subió).
export function escalonDelAnio(despues, anio) {
  try {
    const asentado = conSplitPendienteAsentado(despues);
    const r = asentado.career.registro;
    const h = hechosDeCarrera(asentado);
    const filas = (r.porSplit ?? []).filter((f) => f.anio === anio);
    const antes = {
      ...h,
      splitsJugados: Math.max(0, h.splitsJugados - filas.length),
      splitsTier1: Math.max(0, h.splitsTier1 - filas.filter((f) => f.tier === 1).length),
      titulosTier1: Math.max(0, h.titulosTier1 - r.titulos.filter((t) => t.anio === anio && t.tier === 1).length),
      mundialesGanados: Math.max(0, h.mundialesGanados - r.internacionales.filter((x) => x.anio === anio && x.resultado === 'campeon').length)
    };
    return { antes: nivelDeCarrera(antes), ahora: nivelDeCarrera(h) };
  } catch {
    return null;
  }
}

// `{ ascensos, deltas }`. `ascensos`: `[{ eje, id, label, rotulo, texto, chip }]`, el primero es el banner (`rotulo` arriba,
// `texto` grande); los demás van como chips (`chip`). `deltas`: `[{ eje, rotulo, antes,
// despues, delta, banda }]` (el arraigo y el hype; el nivel ya tiene su bloque). Sin la foto de ESTE año (si
// `flags.edadSnapshot` ya es la del siguiente), nada: nunca se compara contra otro año.
export function ascensosYDeltas(despues, anio) {
  const ascensos = [];
  const deltas = [];
  const foto = despues?.flags?.edadSnapshot;
  if (!foto || anio == null || despues.calendario?.anio !== anio) return { ascensos, deltas };
  const org = mismaOrgTodoElAnio(despues, anio);
  const par = (antes, ahora) => Number.isFinite(antes) && Number.isFinite(ahora);
  const arraigoAntes = foto['career.arraigo'];
  const arraigo = despues.career?.arraigo;
  if (org && par(arraigoAntes, arraigo)) {
    const a = bandaDeArraigoFicha(arraigoAntes);
    const b = bandaDeArraigoFicha(arraigo);
    deltas.push({ eje: 'arraigo', rotulo: `Arraigo · ${org}`, antes: Math.round(arraigoAntes), despues: Math.round(arraigo), delta: Math.round(arraigo) - Math.round(arraigoAntes), banda: b.label });
    if (sube('arraigo', a.id, b.id)) ascensos.push({ eje: 'arraigo', id: b.id, label: b.label, rotulo: `Tu arraigo con ${org}`, texto: `¡Ahora sos ${b.label} de ${org}!`, chip: `${b.label} de ${org}` });
  }
  const hypeAntes = foto['player.stats.hype'];
  const hype = despues.player?.stats?.hype;
  if (par(hypeAntes, hype)) {
    const a = bandaHype(hypeAntes);
    const b = bandaHype(hype);
    deltas.push({ eje: 'hype', rotulo: 'Hype', antes: Math.round(hypeAntes), despues: Math.round(hype), delta: Math.round(hype) - Math.round(hypeAntes), banda: b.label });
    if (sube('hype', a.id, b.id)) ascensos.push({ eje: 'hype', id: b.id, label: b.label, rotulo: 'Tu hype', texto: `¡${TEXTO_DE_HYPE[b.id] ?? `Ya sos ${b.label}`}!`, chip: TEXTO_DE_HYPE[b.id] ?? `Ya sos ${b.label}` });
  }
  const jerAntes = foto['career.jerarquia'];
  const jer = despues.career?.jerarquia;
  if (org && par(jerAntes, jer)) {
    const a = bandaJerarquia(jerAntes);
    const b = bandaJerarquia(jer);
    if (sube('jerarquia', a.id, b.id)) ascensos.push({ eje: 'jerarquia', id: b.id, label: b.label, rotulo: `Tu lugar en ${org}`, texto: `¡Ahora sos ${b.label} en ${org}!`, chip: `${b.label} en ${org}` });
  }
  const escalon = escalonDelAnio(despues, anio);
  if (escalon && sube('carrera', escalon.antes.id, escalon.ahora.id)) {
    ascensos.push({ eje: 'carrera', id: escalon.ahora.id, label: escalon.ahora.nombre, rotulo: 'Tu carrera sube un escalón', texto: `«${escalon.ahora.nombre}»`, chip: `Carrera: ${escalon.ahora.nombre}` });
  }
  ascensos.sort((x, y) => ORDEN_DE_ASCENSO.indexOf(x.eje) - ORDEN_DE_ASCENSO.indexOf(y.eje));
  return { ascensos, deltas };
}

// --- "Tan cerca" (W3): la final que se perdió en el mapa que la definía ---

// Por debajo de esto la jugada no movió la chance (ni para un lado ni para el otro).
const MUEVE_LA_CHANCE = 0.005;
const PUNTOS = 100;
const pct = (p) => Math.round(p * PUNTOS);

// `{ rotulo, texto }` o `null`. Solo para una final perdida en el mapa decisivo. `pFinal`: la chance con la que se tiró el
// mapa (el log del mapa); `pSinJugada`: la que tenía ese mapa sin el minijuego (`null` si no hubo minijuego). Honesto: si
// ganaste la jugada y el mapa se fue en la tirada, lo dice; si la perdiste, dice cuánto te movió la chance.
export function tanCercaDeLaFinal({ perdioLaFinal = false, decisivo = false, pFinal = null, pSinJugada = null } = {}) {
  if (!perdioLaFinal || !decisivo || !Number.isFinite(pFinal)) return null;
  if (Number.isFinite(pSinJugada)) {
    const mueve = pFinal - pSinJugada;
    const puntos = Math.max(1, Math.round(Math.abs(mueve) * PUNTOS));
    if (mueve > MUEVE_LA_CHANCE) {
      return { rotulo: 'Tan cerca', texto: `Ganaste la jugada (+${puntos} de chance: ${pct(pFinal)}%)… y el mapa se fue igual.` };
    }
    if (mueve < -MUEVE_LA_CHANCE) {
      return { rotulo: 'Tan cerca', texto: `La jugada no salió: te costó ${cuantos(puntos, 'punto', 'puntos')} de chance (de ${pct(pSinJugada)}% a ${pct(pFinal)}%) y el mapa se fue.` };
    }
    return { rotulo: 'Tan cerca', texto: `La jugada salió pareja: con ${pct(pFinal)}% de chance, el mapa se fue.` };
  }
  return { rotulo: 'Tan cerca', texto: `Se definió en el último mapa: tenían ${pct(pFinal)}% de chance y no alcanzó.` };
}
