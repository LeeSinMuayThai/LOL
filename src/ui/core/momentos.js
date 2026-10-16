// Los momentos (PLANUI §6.5 y §0.6, U3a): qué del tramo que el relato acaba de contar merece una pantalla propia. Puro:
// sin DOM, sin azar y sin tocar el motor. La señal sale de lo que el motor ya registra:
//   - el título: `career.registro.titulos` crece entre el registro de antes de la llamada y el de después;
//   - el Mundial: un log `internacional` con `resultado: 'campeon'` en el tramo (la variante dorada);
//   - el resumen de la temporada: el log `edad` con su `nota` (`systems/resumenAnio.js`), en todas las velocidades.
// Un tramo trae como mucho UN takeover (§6.5): si el mismo tramo trae el Mundial y un título, va el Mundial.
// Lo que dibuja cada momento es de `fx/momento.js`; lo que ya se vio lo anota `almacenamiento.js` (`momentosVistos`).
import { efectosDeTexto } from '../components/chipsEje.js';
import { etiquetaCampo } from '../../core/selectors.js';
import { cierreDeSplit } from './escena.js';
import { formaBeat } from '../../core/log.js';
import { TODOS_LOS_EVENTOS } from '../../data/events/index.js';
import { BALANCE } from '../../data/balance.js';
import { bandaDeArraigoFicha, bandaDeHype, bandaDeJerarquia, nivelDelAnio, escaleraDeArraigo, escaleraDeJerarquia, escaleraDeHype, puntajeEnVivo } from '../../core/ficha.js';
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

// F3 (PLANUI §0.8, punto 6): la decisión que tomó el jugador y su resultado. Es el mismo criterio que `eventoDe` (el de la
// "Última hora" del diario): un log `event` con título "Nombre · Opción" y cuerpo. Las del perfil automático ("Como
// hambriento…") vienen con `cronica` y NO son del jugador: no entran. Va aparte de `eventoDe` para no tocar el diario (F4).
const LARGO_DE_ELECCION = 220;
const ELECCIONES_DE_FRANJA = 2;
const EJES_DE_ELECCION = 4;
export function eleccionDelJugador(log) {
  if (log?.type !== 'event' || log.cronica || !log.titulo || !log.cuerpo) return null;
  const corte = log.titulo.indexOf(SEPARADOR_DE_OPCION);
  if (corte < 0) return null;
  const decision = log.titulo.slice(0, corte).trim();
  const opcion = log.titulo.slice(corte + SEPARADOR_DE_OPCION.length).trim();
  if (!decision || !opcion) return null;
  // Los efectos del texto, sumados por eje (dos "Equipo" del mismo evento son un solo chip), de mayor a menor movimiento.
  const ejes = typeof log.efectos === 'string' ? ejesSumados([{ efectos: log.efectos }]).slice(0, EJES_DE_ELECCION) : [];
  return { decision, opcion, salio: recortarFrase(log.cuerpo, LARGO_DE_ELECCION), ejes };
}

// "Mientras tanto" (PLANUI §0.6, punto 3): lo narrativo del tramo `[desde, logs.length)` en una franja. `{ cuantas, ejes,
// titulares, elecciones }`: cuántas cosas pasaron (los beats narrativos), los ejes sumados y hasta `TITULARES_DE_FRANJA`
// titulares — primero tus resultados y los eventos con elección, el mundo al final; dentro de cada peso, el más nuevo
// primero. F3 (§0.8, punto 6): `elecciones` son los resultados de lo que decidiste vos en el tramo (hasta
// `ELECCIONES_DE_FRANJA`, la más nueva primero): van arriba y aparte, y no se repiten en los titulares.
export function franjaDelTramo(logs, desde = 0) {
  const narrativos = (logs ?? []).slice(Math.max(0, desde)).filter((log) => formaBeat(log) && !log.tecnico);
  const propias = narrativos.map((log) => ({ log, eleccion: eleccionDelJugador(log) })).filter((x) => x.eleccion);
  const elecciones = propias.map((x) => x.eleccion).reverse().slice(0, ELECCIONES_DE_FRANJA);
  // G2a (PLANUI §0.9): "Mientras tanto" queda para el mundo. Lo que elegiste vos —las que salen arriba y las que no
  // entran en el bloque— no cuenta en la franja, ni suma sus chips, ni repite su titular.
  const mostradas = new Set(propias.map((x) => x.log));
  const restantes = narrativos.filter((log) => !mostradas.has(log));
  const titulares = restantes
    .map((log, i) => ({ log, i, peso: pesoDe(log) }))
    .sort((a, b) => b.peso - a.peso || b.i - a.i)
    .slice(0, TITULARES_DE_FRANJA)
    .map(({ log }) => ({ type: log.type ?? null, texto: String(log.titulo ?? log.message ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((t) => t.texto);
  return { cuantas: restantes.length, ejes: ejesSumados(restantes).slice(0, EJES_DE_FRANJA), titulares, elecciones };
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
    // F4 (PLANUI §0.8, punto 8): la carta del cierre que elegiste y lo que movió de verdad, antes → después.
    receso: recesoDelAnio(logs.slice(inicio, i), despues),
    ...ascensosYDeltas(despues, anio, fotoAnio)
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
      plan: [...TODOS_LOS_EVENTOS.filter((e) => e.cierreDeEdad).map((e) => patronDeTitulo(e.title)), patronDeTitulo(BALANCE.cartas.titulo)],
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

// --- F4 (PLANUI §0.8, punto 8): "Tu receso", la carta del cierre y lo que movió ---

// Lo que una carta del cierre puede mover y se ve en una pantalla: los stats de juego, las barras de casa y la gente del
// equipo. El resto (SoloQ, el pool, los flags) no es un número que la ficha muestre.
const CAMPOS_DEL_RECESO = [
  ...['mecanica', 'macro', 'laneo', 'teamfight', 'shotcalling', 'adaptabilidad', 'mentalidad', 'hype'].map((s) => ['stats', s]),
  ['player', 'sleep'], ['player', 'studies'], ['player', 'familyTrust'],
  ['career', 'jerarquia'], ['career', 'sinergia'], ['career', 'arraigo']
].map(([base, clave]) => {
  const ruta = base === 'stats' ? `player.stats.${clave}` : `${base}.${clave}`;
  return { id: clave, ruta, etiqueta: etiquetaCampo(ruta) };
});

function valorActual(estado, ruta) {
  return ruta.split('.').reduce((nodo, clave) => nodo?.[clave], estado);
}

// `{ carta, rotulo, cambios: [{ id, etiqueta, antes, despues, delta }] }` o `null`. `logs`: los del año (sin el resumen). La
// carta es la que contestaste vos (la que resolvió tu perfil en la cola no es una elección: `eventoDe` la descarta). El
// delta es el que aplicó el motor, leído del renglón de efectos del propio log (ya con el clamp y el techo de lesión), y el
// "después" es el stat de ahora: el cierre corre al final del split, nada lo mueve después. Un stat que no se movió no sale.
export function recesoDelAnio(logs, despues) {
  const log = [...(logs ?? [])].reverse().find((l) => l && eventoDe(l)?.tipo === 'plan');
  if (!log) return null;
  const corte = log.titulo.indexOf(SEPARADOR_DE_OPCION);
  const carta = log.titulo.slice(corte + SEPARADOR_DE_OPCION.length).trim();
  const cambios = [];
  for (const e of efectosDeTexto(log.efectos)) {
    const campo = CAMPOS_DEL_RECESO.find((c) => c.etiqueta === e.etiqueta);
    const ahora = campo && valorActual(despues, campo.ruta);
    if (!campo || !e.cambio || !e.valor || e.sufijo || !Number.isFinite(ahora)) continue;
    const delta = Math.round(e.valor);
    cambios.push({ id: campo.id, etiqueta: campo.etiqueta, antes: Math.round(ahora) - delta, despues: Math.round(ahora), delta });
  }
  return cambios.length ? { carta, rotulo: eventoDe(log).rotulo, cambios } : null;
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
// `texto` grande); los demás van como chips (`chip`). `deltas`: `[{ eje, rotulo, antes, despues, delta, banda }]` (el nivel,
// el arraigo, el hype y el puntaje de carrera). Un número, una fuente: los deltas del año son los de la ficha
// (`nivelDelAnio`, `escaleraDeArraigo/Jerarquia/Hype` de `core/ficha.js`, contra `flags.edadSnapshot`); el del puntaje,
// contra `fotoAnio.puntaje` (la foto de la UI al arrancar el año). Sin la foto de ESTE año, nada: nunca se compara contra
// otro año ni se inventa un delta.
export function ascensosYDeltas(despues, anio, fotoAnio = null) {
  const ascensos = [];
  const deltas = [];
  const foto = despues?.flags?.edadSnapshot;
  if (!foto || anio == null || despues.calendario?.anio !== anio) return { ascensos, deltas };
  const org = mismaOrgTodoElAnio(despues, anio);
  const conDelta = (d) => Number.isFinite(d);
  const nivel = nivelDelAnio(despues);
  if (conDelta(nivel.delta)) deltas.push({ eje: 'nivel', rotulo: 'Tu nivel', antes: nivel.valor - nivel.delta, despues: nivel.valor, delta: nivel.delta, banda: null });
  const arraigo = escaleraDeArraigo(despues);
  if (arraigo && despues.phase === 'profesional') {
    const valor = Math.round(arraigo.valor);
    // con una org nueva este año, el arraigo arranca de nuevo: el valor sin delta (ni ascenso)
    const delta = org ? arraigo.delta : null;
    deltas.push({ eje: 'arraigo', rotulo: 'Arraigo', antes: conDelta(delta) ? valor - delta : null, despues: valor, delta, banda: `${arraigo.label} · ${arraigo.org}` });
    if (org && delta > 0 && sube('arraigo', bandaDeArraigoFicha(arraigo.valor - delta).id, arraigo.id)) {
      ascensos.push({ eje: 'arraigo', id: arraigo.id, label: arraigo.label, rotulo: `Tu arraigo con ${org}`, texto: `¡Ahora sos ${arraigo.label} de ${org}!`, chip: `${arraigo.label} de ${org}` });
    }
  }
  const hype = escaleraDeHype(despues);
  if (conDelta(hype.valor) && conDelta(hype.delta)) {
    deltas.push({ eje: 'hype', rotulo: 'Hype', antes: hype.valor - hype.delta, despues: hype.valor, delta: hype.delta, banda: hype.label });
    // G4a (D116): sin equipo no hay "¡Sos una estrella!" que anunciar (la ficha de ese jugador dice "El que no llegó").
    if (despues.career?.currentOrg && hype.delta > 0 && sube('hype', bandaHype(hype.valor - hype.delta).id, hype.id)) {
      ascensos.push({ eje: 'hype', id: hype.id, label: hype.label, rotulo: 'Tu hype', texto: `¡${TEXTO_DE_HYPE[hype.id] ?? `Ya sos ${hype.label}`}!`, chip: TEXTO_DE_HYPE[hype.id] ?? `Ya sos ${hype.label}` });
    }
  }
  const jer = escaleraDeJerarquia(despues);
  if (org && jer && jer.delta > 0 && sube('jerarquia', bandaJerarquia(jer.valor - jer.delta).id, jer.id)) {
    ascensos.push({ eje: 'jerarquia', id: jer.id, label: jer.label, rotulo: `Tu lugar en ${org}`, texto: `¡Ahora sos ${jer.label} en ${org}!`, chip: `${jer.label} en ${org}` });
  }
  // el puntaje: solo con la foto de la UI de este año (la edad con la que arrancó el año es la de hoy menos uno: el cierre
  // ya cumplió). Una partida retomada a mitad de año no la tiene: sin delta.
  if (conDelta(fotoAnio?.puntaje) && conDelta(fotoAnio?.edad) && fotoAnio.edad + 1 === despues.age) {
    const vivo = puntajeEnVivo(despues);
    if (conDelta(vivo.total)) {
      deltas.push({ eje: 'puntaje', rotulo: 'Puntaje', antes: fotoAnio.puntaje, despues: vivo.total, delta: vivo.total - fotoAnio.puntaje, banda: vivo.actual?.nombre ?? null });
    }
  }
  const escalon = escalonDelAnio(despues, anio);
  if (escalon && sube('carrera', escalon.antes.id, escalon.ahora.id)) {
    ascensos.push({ eje: 'carrera', id: escalon.ahora.id, label: escalon.ahora.nombre, rotulo: 'Tu carrera sube un escalón', texto: `«${escalon.ahora.nombre}»`, chip: `Carrera: ${escalon.ahora.nombre}` });
  }
  ascensos.sort((x, y) => ORDEN_DE_ASCENSO.indexOf(x.eje) - ORDEN_DE_ASCENSO.indexOf(y.eje));
  return { ascensos, deltas };
}

// --- "Tan cerca" (W3): la final que se perdió en el mapa que la definía ---

const PUNTOS = 100;
const pct = (p) => Math.round(p * PUNTOS);

// `{ rotulo, texto }` o `null`. Solo para una final perdida en el mapa decisivo. G1 (PLANUI §0.9): un mapa con minijuego se
// decide por la vara, no por la chance. Entonces la placa dice lo que faltó en las unidades del minijuego (`faltante`, la
// misma cuenta que el veredicto de la parada: `varaG1.tanCerca`): "Tan cerca" si fue el CASI, "Lo que faltó" si no. Solo un
// mapa que se tiró (sin minijuego) habla de la chance con la que se tiró (`pFinal`).
export function tanCercaDeLaFinal({ perdioLaFinal = false, decisivo = false, pFinal = null, faltante = null, casi = false } = {}) {
  if (!perdioLaFinal || !decisivo) return null;
  if (typeof faltante === 'string' && faltante) return { rotulo: casi ? 'Tan cerca' : 'Lo que faltó', texto: faltante };
  if (!Number.isFinite(pFinal)) return null;
  return { rotulo: 'Tan cerca', texto: `Se definió en el último mapa: tenían ${pct(pFinal)}% de chance y no alcanzó.` };
}

