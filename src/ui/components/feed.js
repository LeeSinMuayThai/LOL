// El log de la carrera. Extraído tal cual de index.html (fase 8, §8.5) —
// misma jerarquía tipográfica: una entrada con `cuerpo` es un resultado
// narrativo (lo que pasó va en grande, los efectos abajo, chicos); sin
// `cuerpo` es una línea plana.
//
// `tecnico: true` (fase 7) marca los logs puramente numéricos: se pintan
// atenuados en vez de escondidos del todo — siguen siendo útiles para leer
// la carrera entera, pero no compiten por atención con lo narrativo.
// Un log, una vez. Extraído a su propia función en la fase T3: antes vivía
// inline en el `.map()` de `renderFeed` — `reproductor.js` necesita crear el
// MISMO nodo uno por uno, a su propio ritmo, en vez de todos juntos en un
// `replaceChildren`.
import { acentoDeLog, nombreVisibleDeLiga } from '../formatoUi.js';
import { crearOrgChip } from './orgChip.js';
import { etiquetaRol } from '../../data/roles.js';
import { crearTarjetaResultado, crearTarjetaResultadoSerie, crearFilaDeMapas } from './serie.js';
import { crearTarjetaMundial } from './mundial.js';
import { textoDeProbabilidadJugada } from '../../core/previaDePartido.js';
import { reconciliar, reemplazarEnElLugar } from '../core/reconciliar.js';
import { formaBeat } from '../../core/log.js';
import { crearTarjetaCierre, crearLineaSplitAnterior, crearCartelDePagina } from './cierre.js';
import { moverNumero, leerSoloElFinal } from '../core/delta.js';
import { icono, triangulos } from '../fx/iconos.js';
import { chipsDeTexto, chipEje, leerRango, rangoAntes, numeroConSigno, LP_POR_DIVISION } from './chipsEje.js';
import { crearCampeonTile } from './campeonTile.js';
import METAS from '../../data/metas.json' with { type: 'json' };
import { LABEL_BANDA, GLIFO_DE_VINETA, franjaDelTramo } from '../core/momentos.js';

// El reveal del Top 20 al cierre de temporada (fase 9Wc). El log `top_mundial`
// que trae la lista entera (`entry.top20`) deja de ser una línea: se abre en
// una tabla con tu fila resaltada, o con "quedaste #23" al pie si te quedaste
// afuera pero cerca. El Top 5 del riel es el norte permanente; esto es la foto
// anual completa — "porque quizás estuviste cerca".
function crearRevealTop20(entry) {
  const item = document.createElement('div');
  item.className = 'log-item log-item--top-mundial';
  item.dataset.type = 'top_mundial';
  item.dataset.acento = 'gold';
  item.appendChild(icono('mundo', { clase: 'ln-ico log-ico' }));

  const titulo = document.createElement('div');
  titulo.className = 'log-titulo';
  titulo.textContent = 'Los mejores del mundo';
  item.appendChild(titulo);

  const sub = document.createElement('div');
  sub.className = 'reveal-top20-sub';
  sub.textContent = entry.message;
  item.appendChild(sub);

  const lista = document.createElement('div');
  lista.className = 'reveal-top20-lista';
  for (const fila of entry.top20) {
    const filaEl = document.createElement('div');
    filaEl.className = ['reveal-top20-fila',
      fila.esJugador && 'reveal-top20-fila--propia',
      fila.rivalDeGeneracion && 'reveal-top20-fila--rival'
    ].filter(Boolean).join(' ');

    const puesto = document.createElement('span');
    puesto.className = 'reveal-top20-puesto';
    puesto.textContent = `#${fila.pos}`;

    const handle = document.createElement('span');
    handle.className = 'reveal-top20-handle';
    handle.append(crearOrgChip(fila.org, { size: 16 }), document.createTextNode(fila.handle));

    const detalle = document.createElement('span');
    detalle.className = 'reveal-top20-detalle';
    detalle.textContent = [fila.rol ? etiquetaRol(fila.rol) : '', nombreVisibleDeLiga(fila.liga)].filter(Boolean).join(' · ');

    filaEl.append(puesto, handle, detalle);
    lista.appendChild(filaEl);
  }
  item.appendChild(lista);

  return item;
}

// El resumen anual (fase 11, §11.1). El log `edad` que emite
// `systems/resumenAnio.js` trae la nota, el titular, la bajada opcional y las
// 6 viñetas ya armadas — acá solo se pintan, en el mismo orden fijo que
// `core/temporadaResumen.js` las generó. "LA GRIETA" es la marca del medio
// que pide el plan (el equivalente ficticio del resumen deportivo).
// La banda en palabras y el glifo de cada viñeta: `ui/core/momentos.js` (los comparte con la pantalla del resumen). Una
// viñeta que no está en la tabla, el punto.

function crearRevealResumenAnio(entry) {
  const item = document.createElement('div');
  item.className = 'log-item log-item--resumen-anio';
  item.dataset.type = 'edad';
  item.dataset.acento = 'gold';

  const marco = document.createElement('div');
  marco.className = 'resumen-anio-marco';
  const marca = document.createElement('span');
  marca.className = 'resumen-anio-marca';
  marca.textContent = 'LA GRIETA';
  const etiqueta = document.createElement('span');
  etiqueta.className = 'resumen-anio-etiqueta';
  etiqueta.textContent = `${entry.anio}/${entry.anio + 1} · TEMPORADA ${entry.temporada}`;
  marco.append(marca, etiqueta);
  item.appendChild(marco);

  const titulo = document.createElement('div');
  titulo.className = 'log-titulo resumen-anio-titular';
  titulo.textContent = entry.message;
  item.appendChild(titulo);

  if (entry.bajada) {
    const bajada = document.createElement('div');
    bajada.className = 'resumen-anio-bajada';
    bajada.textContent = entry.bajada;
    item.appendChild(bajada);
  }

  // La nota grande (PLANUI §8: "la nota (0-10) grande"), con su banda al lado.
  const nota = document.createElement('div');
  nota.className = `resumen-anio-nota resumen-anio-nota--${entry.banda}`;
  const notaRotulo = document.createElement('span');
  notaRotulo.className = 'resumen-anio-nota-rotulo';
  notaRotulo.textContent = 'Nota de la temporada';
  const notaValor = document.createElement('b');
  notaValor.className = 'resumen-anio-nota-valor';
  notaValor.textContent = entry.nota.toFixed(1);
  const notaBanda = document.createElement('span');
  notaBanda.className = 'resumen-anio-nota-banda';
  notaBanda.textContent = LABEL_BANDA[entry.banda] ?? entry.banda;
  nota.append(notaRotulo, notaValor, notaBanda);
  item.appendChild(nota);

  const vinetas = document.createElement('div');
  vinetas.className = 'resumen-anio-vinetas';
  for (const vineta of entry.vinetas ?? []) {
    const fila = document.createElement('div');
    fila.className = 'resumen-anio-vineta';
    const texto = document.createElement('span');
    texto.textContent = vineta.texto;
    fila.append(icono(GLIFO_DE_VINETA[vineta.icono] ?? 'punto', { clase: 'ln-ico resumen-anio-icono' }), texto);
    vinetas.appendChild(fila);
  }
  item.appendChild(vinetas);

  return item;
}

// --- C1b (PLANUI §0.3, punto 3): cada beat con su forma ---------------------------------------------------------------
//
// El relato era "puro texto": cada beat se lee ahora de un vistazo. Los efectos son chips de eje (components/chipsEje.js:
// el color dice qué se movió, el triángulo y el número hacia dónde); la semana es una tira de bloques y el LP sobre la
// barra del escalón; el parche, chips de campeón con su salto de tier y el ajuste al meta como medidor; el evento que
// resolvió tu perfil, una cita con la placa del perfil; los mapas de una serie, teselas con VICTORIA o DERROTA; el beat que
// corta la carrera, una alerta. El motor no cambia: todo se lee de los campos y del texto que ya escribe (los formatos,
// medidos en 40 carreras, están en el encabezado de chipsEje.js). Si un texto no se deja leer, el beat cae a la línea de
// siempre: nada se rompe y nada se pierde.
//
// Textos (PLANUI §7.5): la prosa original va en `.rl-prosa` (con `html[data-textos="completos"]` se ve; en breves queda
// solo para lectores de pantalla) y lo que la resume en `.rl-breve` (se esconde con textos completos). Las filas de chips
// son una imagen con el texto original del motor para un lector (`role="img"`).

function nodo(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined && texto !== null) el.textContent = texto;
  return el;
}

function prosa(texto, tag = 'div') {
  return nodo(tag, 'rl-prosa', texto);
}

// Lo visual que ya cuenta la prosa (o una etiqueta) no se lee dos veces.
function soloVisual(el) {
  el.setAttribute('aria-hidden', 'true');
  return el;
}

// El índice de cascada de los hijos de una fila (la entrada escalonada de `.rl-entra`, feed.css).
function escalonar(fila, desde = 0) {
  [...fila.children].forEach((hijo, i) => hijo.style.setProperty('--rl-i', String(desde + i)));
  return fila;
}

function filaDeEfectos(texto, { tenue = false } = {}) {
  return escalonar(chipsDeTexto(texto, { clase: 'eje-chips log-efectos', tenue }));
}

function caraDeCampeon(nombre) {
  const cara = nodo('span', 'rl-camp');
  cara.append(crearCampeonTile({ name: nombre }, { size: 'mini' }));
  return cara;
}

// Los caracteres que entran en una línea del relato en un celular (390 px): de ahí para arriba, el planteo o el resultado
// pueden quedar recortados y la crónica ofrece "más".
const LARGO_DE_UNA_LINEA = 48;

// --- La semana del plan amateur ("14 bloques al ranked, 1 a dormir, 3 robados al sueño. +13 LP → Diamante I · 83 LP.") ---
// `systems/amateur.js` no deja los bloques en campos: se leen del cuerpo. El LP de antes sale del de después y el delta
// (la escalera en puntos absolutos de core/ranked.js).
const BLOQUES_DE_LA_SEMANA = [
  { id: 'ranked', patron: /(\d+) bloques? al ranked/, eje: 'soloq', nombre: 'ranked' },
  { id: 'colegio', patron: /(\d+) al colegio/, eje: 'estudios', nombre: 'colegio' },
  { id: 'familia', patron: /(\d+) a la familia/, eje: 'casa', nombre: 'familia' },
  { id: 'dormir', patron: /(\d+) a dormir/, eje: 'sueno', nombre: 'dormir' }
];
const ROBADOS_AL_SUENO = /(\d+) robados? al sueño/;
const LP_DE_LA_SEMANA = /([+\-−]\d+) LP → (.+?)\.?\s*$/;

export function leerSemana(entry) {
  if (!entry || entry.titulo !== 'La semana' || typeof entry.cuerpo !== 'string') return null;
  const grupos = BLOQUES_DE_LA_SEMANA
    .map((b) => ({ ...b, n: Number(entry.cuerpo.match(b.patron)?.[1] ?? 0) }))
    .filter((b) => b.n > 0);
  if (grupos.length === 0) return null;
  const robados = Number(entry.cuerpo.match(ROBADOS_AL_SUENO)?.[1] ?? 0);
  const lp = entry.cuerpo.match(LP_DE_LA_SEMANA);
  const delta = lp ? Number(lp[1].replace('−', '-')) : null;
  const despues = lp ? leerRango(lp[2]) : null;
  return {
    grupos,
    robados,
    delta,
    despues,
    rangoTexto: lp ? lp[2] : null,
    antes: despues ? rangoAntes(despues, delta) : null,
    plan: entry.plan ?? entry.espera ?? null,
    espera: entry.espera ? true : false
  };
}

function crearTiraDeBloques(semana) {
  const tira = nodo('div', 'rl-bloques');
  // Los robados al sueño son horas de más (`extra`, systems/amateur.js) que entran al reparto: se rayan los últimos del
  // ranked (para eso se roban) y, si fueran más que esos, los que siguen sin tocar los de dormir.
  let porRayar = semana.robados;
  const rayados = new Map(semana.grupos.map((g) => {
    const n = g.id === 'dormir' ? 0 : Math.min(porRayar, g.n);
    porRayar -= n;
    return [g.id, n];
  }));
  let i = 0;
  for (const grupo of semana.grupos) {
    const bloque = nodo('span', 'rl-bloques-grupo');
    for (let k = 0; k < grupo.n; k += 1) {
      const cuadro = nodo('i', 'rl-bloque');
      cuadro.dataset.eje = grupo.eje;
      if (k >= grupo.n - rayados.get(grupo.id)) cuadro.classList.add('rl-bloque--robado');
      cuadro.style.setProperty('--rl-i', String(i));
      bloque.appendChild(cuadro);
      i += 1;
    }
    tira.appendChild(bloque);
  }
  return tira;
}

function crearLeyendaDeBloques(semana) {
  const leyenda = nodo('div', 'rl-bloques-leyenda');
  for (const grupo of semana.grupos) {
    const item = nodo('span', 'rl-leyenda');
    item.dataset.eje = grupo.eje;
    item.append(nodo('b', null, String(grupo.n)), document.createTextNode(` ${grupo.nombre}`));
    leyenda.appendChild(item);
  }
  if (semana.robados > 0) {
    const item = nodo('span', 'rl-leyenda rl-leyenda--robado');
    item.append(nodo('i', 'rl-bloque rl-bloque--robado'), nodo('b', null, String(semana.robados)), document.createTextNode(semana.robados === 1 ? ' robado al sueño' : ' robados al sueño'));
    item.firstChild.dataset.eje = 'soloq';
    leyenda.appendChild(item);
  }
  return leyenda;
}

// "Diamante I · 70 → 83 LP" con la barra del escalón (0-100 LP de la división: lo que tenías, lo que ganaste o perdiste).
// En el ápice no hay escalón de 100: el LP solo, sin barra.
function crearLpDeLaSemana(semana) {
  const { despues, antes, delta } = semana;
  const fila = nodo('div', 'rl-lp');
  const rango = nodo('div', 'rl-lp-rango');
  rango.appendChild(icono('ranked', { clase: 'ln-ico rl-lp-ico' }));
  const mismoEscalon = antes && antes.nombre === despues.nombre;
  if (mismoEscalon) {
    rango.append(nodo('b', 'rl-lp-nombre', despues.nombre), nodo('span', 'rl-lp-desde', `${antes.lp} →`), nodo('b', 'rl-lp-n', String(despues.lp)), nodo('span', 'rl-lp-u', 'LP'));
  } else {
    if (antes) rango.append(nodo('span', 'rl-lp-desde', `${antes.nombre} →`));
    rango.append(nodo('b', 'rl-lp-nombre', despues.nombre), nodo('b', 'rl-lp-n', String(despues.lp)), nodo('span', 'rl-lp-u', 'LP'));
  }
  if (despues.puesto) rango.append(nodo('span', 'rl-lp-puesto', `#${despues.puesto}`));
  fila.appendChild(rango);

  if (Number.isFinite(delta)) {
    const d = nodo('span', `rl-lp-delta${delta > 0 ? ' rl-lp-delta--sube' : delta < 0 ? ' rl-lp-delta--baja' : ''}`);
    if (delta !== 0) d.appendChild(triangulos(Math.abs(delta) >= LP_POR_DIVISION ? 'alta' : 'media', delta > 0 ? '+' : '-'));
    const n = nodo('b', null, numeroConSigno(delta));
    n.dataset.rueda = String(Math.abs(delta));
    n.dataset.prefijo = numeroConSigno(delta).charAt(0);
    d.append(n, document.createTextNode(' LP'));
    fila.appendChild(d);
  }

  if (!despues.apice) {
    // la barra: lo que quedó del escalón y, en el color del eje, lo que se movió esta semana (si fue en el mismo escalón;
    // si subiste de división, todo lo de este escalón es nuevo; si bajaste, lo perdido se ve en --down)
    const barra = nodo('div', 'rl-lp-barra');
    const pct = (lp) => `${Math.max(0, Math.min(100, (lp / LP_POR_DIVISION) * 100))}%`;
    const base = delta >= 0 ? (mismoEscalon ? antes.lp : 0) : despues.lp;
    const tope = delta >= 0 ? despues.lp : (mismoEscalon ? antes.lp : LP_POR_DIVISION);
    const quieto = nodo('i', 'rl-lp-base');
    quieto.style.setProperty('width', pct(delta >= 0 ? base : despues.lp));
    const movido = nodo('i', delta >= 0 ? 'rl-lp-gana' : 'rl-lp-pierde');
    movido.style.setProperty('left', pct(base));
    movido.style.setProperty('width', `calc(${pct(tope)} - ${pct(base)})`);
    barra.append(quieto, movido);
    fila.appendChild(barra);
  }
  return fila;
}

function crearSemana(entry, semana) {
  const item = nodo('div', 'log-item log-item--semana' + (entry.cronica ? ' log-item--cronica' : ''));
  item.dataset.type = entry.type ?? '';
  item.dataset.acento = acentoDeLog(entry.type);
  item.appendChild(icono(entry.type, { clase: 'ln-ico log-ico' }));

  const rotulo = nodo('div', 'log-titulo rl-rotulo', 'La semana');
  if (semana.plan) {
    rotulo.append(nodo('span', 'rl-rotulo-sep', '·'), nodo('span', 'rl-rotulo-plan', semana.espera ? `mientras te esperan: ${semana.plan}` : `tu plan: ${semana.plan}`));
  }
  item.appendChild(rotulo);
  if (entry.cronica && entry.perfil) item.appendChild(crearEleccion(entry));

  const forma = soloVisual(nodo('div', 'rl-semana'));
  forma.append(crearTiraDeBloques(semana), crearLeyendaDeBloques(semana));
  if (semana.despues) forma.appendChild(crearLpDeLaSemana(semana));
  item.appendChild(forma);
  item.appendChild(prosa(entry.cuerpo));
  if (entry.efectos) item.appendChild(filaDeEfectos(entry.efectos));
  return item;
}

// --- El parche (`type: 'meta'`, systems/meta.js) -----------------------------------------------------------------------
// "Parche 7: sigue la meta de tanques. <descripción del régimen>. LeBlanc: A → B. Viktor: B → A." | "Pretemporada. Se dio
// vuelta el juego: se viene la meta de X. <desc>. <saltos>" | "Parche 18 a mitad de split: nerfean lo que venía arriba. El
// meta vira a la meta de X. <saltos>" | "Sale Smolder. Todavía nadie sabe jugarlo…". El régimen sale de data/metas.json.
const ORDEN_DE_TIER = { S: 0, A: 1, B: 2, C: 3 };
const SALTO_DE_TIER = /:\s([SABC])\s→\s([SABC])(?=\.|$)/g;
const CAMPEON_NUEVO = /^Sale (.+?)\. Todavía nadie sabe jugarlo/;

export function leerParche(message) {
  const texto = String(message ?? '').trim();
  const nuevo = texto.match(CAMPEON_NUEVO);
  if (nuevo) return { nuevo: nuevo[1], saltos: [], rotulo: 'Campeón nuevo', titular: `Sale ${nuevo[1]}`, descripcion: '' };
  const saltos = [];
  let cabeza = texto;
  let previo = 0;
  for (const m of texto.matchAll(SALTO_DE_TIER)) {
    // el nombre: lo que va desde el salto anterior (o el último punto) hasta los dos puntos
    const antes = texto.slice(previo, m.index);
    const corte = antes.lastIndexOf('. ');
    const nombre = (corte >= 0 ? antes.slice(corte + 2) : antes).trim();
    if (saltos.length === 0) cabeza = texto.slice(0, previo + (corte >= 0 ? corte + 1 : 0)).trim();
    saltos.push({ nombre, antes: m[1], despues: m[2], sube: ORDEN_DE_TIER[m[2]] < ORDEN_DE_TIER[m[1]] });
    previo = m.index + m[0].length;
  }
  const regimen = METAS.find((r) => cabeza.includes(r.descripcion)) ?? [...METAS].sort((a, b) => b.nombre.length - a.nombre.length).find((r) => cabeza.includes(r.nombre));
  const rotulo = cabeza.match(/^(Pretemporada|Parche \d+(?: a mitad de split)?)/)?.[1] ?? null;
  if (!rotulo || !regimen) return null;
  const verbo = /se viene la/i.test(cabeza) ? 'Se viene la' : /vira a la/i.test(cabeza) ? 'Vira a la' : 'Sigue la';
  const descripcion = cabeza.includes(regimen.descripcion) ? regimen.descripcion : (cabeza.match(/nerfean lo que venía arriba/i) ? 'Nerfean lo que venía arriba.' : '');
  return { nuevo: null, saltos, rotulo: rotulo.replace(' a mitad de split', ' · a mitad de split'), titular: `${verbo} ${regimen.nombre}`, descripcion, regimen: regimen.id };
}

// "Jugaste con Sylas (maestría 73). Ajuste al meta: 29/100." (systems/campeones.js, técnico) — también la variante del draft.
const CAMPEON_DEL_SPLIT = /^(Jugaste con|En el draft no te dieron tu pick: te tocó) (.+?) \(maestría (\d+)\)\. Ajuste al meta: (\d+)\/(\d+)\.?$/;

export function leerCampeonDelSplit(message) {
  const m = String(message ?? '').match(CAMPEON_DEL_SPLIT);
  if (!m) return null;
  return { campeon: m[2], maestria: Number(m[3]), ajuste: Number(m[4]), maximo: Number(m[5]), sinPick: m[1] !== 'Jugaste con' };
}

function crearChipDeSalto(salto, propios) {
  const chip = nodo('span', 'rl-salto' + (propios.has(salto.nombre) ? ' rl-salto--propio' : ''));
  chip.dataset.signo = salto.sube ? 'sube' : 'baja';
  chip.title = `${salto.nombre}: ${salto.antes} → ${salto.despues}`;
  chip.append(caraDeCampeon(salto.nombre), nodo('span', 'rl-salto-nombre', salto.nombre));
  const tiers = nodo('span', 'rl-salto-tiers');
  tiers.append(nodo('span', `meta-tier meta-tier--${salto.antes}`, salto.antes), document.createTextNode('→'), nodo('span', `meta-tier meta-tier--${salto.despues}`, salto.despues));
  chip.append(tiers, triangulos('baja', salto.sube ? '+' : '-'));
  return chip;
}

function crearChipDeCampeonNuevo(nombre) {
  const chip = nodo('span', 'rl-salto rl-salto--nuevo');
  chip.title = `Sale ${nombre}`;
  chip.append(nodo('span', 'rl-salto-marca', 'Nuevo'), caraDeCampeon(nombre), nodo('span', 'rl-salto-nombre', nombre));
  return chip;
}

function propiosDe(state) {
  return new Set((state?.player?.championPool ?? []).map((c) => c.name));
}

function crearFilaDeSaltos(parche, nuevos, state) {
  const fila = nodo('div', 'rl-saltos');
  fila.setAttribute('role', 'img');
  fila.setAttribute('aria-label', [...parche.saltos.map((s) => `${s.nombre}: ${s.antes} → ${s.despues}`), ...nuevos.map((n) => `Sale ${n}`)].join('. '));
  const propios = propiosDe(state);
  for (const salto of parche.saltos) fila.appendChild(crearChipDeSalto(salto, propios));
  for (const nombre of nuevos) fila.appendChild(crearChipDeCampeonNuevo(nombre));
  return escalonar(fila);
}

// El campeón que jugaste y el ajuste al meta como medidor de 0 a 100.
function crearMedidorDeMeta(campeon, mensaje, { tenue = false } = {}) {
  const medidor = nodo('div', 'rl-medidor' + (tenue ? ' rl-medidor--tenue' : ''));
  medidor.setAttribute('role', 'img');
  medidor.setAttribute('aria-label', mensaje);
  medidor.title = mensaje;
  const quien = nodo('span', 'rl-medidor-camp');
  quien.append(caraDeCampeon(campeon.campeon), nodo('b', null, campeon.campeon), nodo('span', 'rl-medidor-mae', `maestría ${campeon.maestria}`));
  if (campeon.sinPick) quien.appendChild(nodo('span', 'rl-medidor-pick', 'sin tu pick'));
  const ajuste = nodo('span', 'rl-medidor-ajuste');
  const barra = nodo('span', 'rl-medidor-barra');
  const lleno = nodo('i');
  lleno.style.setProperty('width', `${Math.max(0, Math.min(100, (campeon.ajuste / campeon.maximo) * 100))}%`);
  barra.appendChild(lleno);
  const n = nodo('b', 'rl-medidor-n', String(campeon.ajuste));
  n.dataset.rueda = String(campeon.ajuste);
  ajuste.append(nodo('span', 'rl-medidor-rotulo', 'Ajuste al meta'), barra, n, nodo('span', 'rl-medidor-max', `/${campeon.maximo}`));
  medidor.append(quien, ajuste);
  return medidor;
}

function crearParche(entry, parche, { beat, state, usados }) {
  const item = nodo('div', 'log-item log-item--breaking log-item--parche');
  item.dataset.type = 'meta';
  item.dataset.acento = acentoDeLog('meta');
  item.appendChild(icono('meta', { clase: 'ln-ico log-ico' }));
  item.appendChild(soloVisual(nodo('span', 'log-rotulo', parche.rotulo)));
  item.appendChild(soloVisual(nodo('div', 'rl-titular rl-breve', parche.titular)));
  item.appendChild(prosa(entry.message));
  // el campeón que sale (adjunto del mismo parche) y el ajuste (técnico del mismo split) viajan adentro de esta tarjeta
  const nuevos = [];
  for (const adjunto of beat?.adjuntos ?? []) {
    const otro = adjunto.type === 'meta' ? leerParche(adjunto.message) : null;
    if (otro?.nuevo) {
      nuevos.push(otro.nuevo);
      usados.add(adjunto);
      item.appendChild(prosa(adjunto.message));
    }
  }
  if (parche.nuevo) nuevos.unshift(parche.nuevo);
  if (parche.saltos.length > 0 || nuevos.length > 0) item.appendChild(crearFilaDeSaltos(parche, nuevos, state));
  const tecnico = (beat?.tecnicos ?? []).find((t) => t.type === 'campeones' && leerCampeonDelSplit(t.message));
  if (tecnico) {
    usados.add(tecnico);
    item.appendChild(crearMedidorDeMeta(leerCampeonDelSplit(tecnico.message), tecnico.message));
  }
  return item;
}

// Un parche que viaja adentro de otro beat (no te movió el main): una línea con el titular y los saltos.
function crearParcheAdjunto(adjunto, parche, state) {
  const linea = nodo('div', 'log-adjunto rl-parche-adjunto');
  linea.dataset.type = 'meta';
  const cabeza = soloVisual(nodo('div', 'rl-parche-cabeza rl-breve'));
  cabeza.append(icono('meta', { clase: 'ln-ico rl-parche-ico' }), nodo('span', 'rl-parche-rotulo', parche.rotulo), nodo('span', 'rl-parche-titular', parche.titular));
  linea.appendChild(cabeza);
  linea.appendChild(prosa(adjunto.message));
  if (parche.saltos.length > 0 || parche.nuevo) linea.appendChild(crearFilaDeSaltos(parche, parche.nuevo ? [parche.nuevo] : [], state));
  return linea;
}

// --- El evento que resolvió tu perfil (la crónica, systems/events.js) -------------------------------------------------
// El título; el planteo en una línea (el resto, en "más"); la elección como cita con la placa del perfil ("COMO LEAL →
// Agarrar solo lo que te sirve"); el resultado en una línea; los chips. El texto entero está en el nodo: CSS lo recorta en
// breves y lo muestra en completos (un lector de pantalla lo lee entero).
function crearEleccion(entry) {
  const eleccion = nodo('div', 'rl-eleccion');
  const placa = nodo('span', 'rl-perfil');
  placa.append(nodo('span', 'rl-perfil-como', 'Como '), nodo('b', null, String(entry.perfil ?? '').toLowerCase()));
  eleccion.append(placa, soloVisual(icono('flecha', { clase: 'ln-ico rl-eleccion-flecha' })), nodo('q', 'rl-opcion', entry.opcion));
  return eleccion;
}

function crearCronica(entry) {
  const item = nodo('div', 'log-item log-item--cronica');
  item.dataset.type = entry.type ?? '';
  item.dataset.acento = acentoDeLog(entry.type);
  item.appendChild(icono(entry.type, { clase: 'ln-ico log-ico' }));
  item.appendChild(nodo('div', 'log-titulo', entry.titulo ?? ''));
  // "más" cuando hay algo que el recorte de una línea puede esconder (el ancho lo decide el navegador; de más, no molesta)
  const largo = [entry.descripcion, entry.cuerpo].some((t) => String(t ?? '').length > LARGO_DE_UNA_LINEA);
  if (entry.descripcion) item.appendChild(nodo('p', 'log-cronica-planteo rl-recorte', entry.descripcion));
  item.appendChild(crearEleccion(entry));
  if (entry.cuerpo) item.appendChild(nodo('p', 'log-cronica-resultado rl-recorte', entry.cuerpo));
  if (largo) {
    const mas = nodo('button', 'rl-mas', 'más');
    mas.type = 'button';
    mas.setAttribute('aria-expanded', 'false');
    mas.addEventListener('click', () => {
      const abierto = item.classList.toggle('rl-abierto');
      mas.setAttribute('aria-expanded', String(abierto));
      mas.textContent = abierto ? 'menos' : 'más';
    });
    item.appendChild(mas);
  }
  if (entry.efectos) item.appendChild(filaDeEfectos(entry.efectos));
  return item;
}

// --- Las series que no frenan (PLANUI §0.3, 6.2) -----------------------------------------------------------------------
// Sus mapas llegan como líneas `adjunto` con campos (`mapa`, `resultado`, `campeon`, `rivalJuega`, `marcador`): una fila de
// teselas (components/serie.js). La línea que la anuncia ("Sos el favorito claro (94%…)", "Serie sin nada en juego (65
// contra 51 de X)…") queda en una píldora.
const SERIE_SIN_NADA = /^Serie sin nada en juego \((\d+) contra (\d+) de (.+?)\)/;

function esMapa(entrada) {
  return entrada?.type === 'serie' && Number.isFinite(entrada.mapa) && (entrada.resultado === 'W' || entrada.resultado === 'L');
}

function crearAnuncioDeSerie(entrada) {
  const sinNada = String(entrada.message ?? '').match(SERIE_SIN_NADA);
  if (!entrada.cantada && !sinNada) return null;
  const linea = nodo('div', 'log-adjunto rl-anuncio');
  linea.dataset.type = 'serie';
  const pildora = soloVisual(nodo('span', 'rl-pildora rl-breve'));
  if (entrada.cantada) {
    pildora.dataset.lado = entrada.cantada;
    pildora.append(nodo('span', null, entrada.cantada === 'favorito' ? 'Favorito claro' : 'No sos el favorito'), nodo('b', null, Number.isFinite(entrada.pSerie) ? `${Math.round(entrada.pSerie * 100)}%` : ''));
  } else {
    pildora.append(nodo('span', null, 'Sin nada en juego'), nodo('b', null, `${sinNada[1]} vs ${sinNada[2]}`));
  }
  linea.append(pildora, soloVisual(nodo('span', 'rl-anuncio-coach rl-breve', 'juega el plan del coach')), prosa(entrada.message, 'span'));
  return linea;
}

function crearMapaDeBeat(entry) {
  const item = nodo('div', 'log-item log-item--mapa');
  item.dataset.type = 'serie';
  item.dataset.acento = entry.resultado === 'W' ? 'up' : 'danger';
  item.appendChild(icono('serie', { clase: 'ln-ico log-ico' }));
  item.appendChild(crearFilaDeMapas([entry], { grande: true }));
  if (entry.cierre) item.appendChild(nodo('div', 'rl-mapa-cierre', entry.cierre));
  // la línea del motor ya es la de la tesela para un lector: acá es solo para la vista con textos completos
  item.appendChild(soloVisual(prosa(entry.message)));
  return item;
}

// --- La práctica del plan del año (adjunto): "Entrenaste según el plan del año: La cabeza primero (tramo 3 de 3: …)." ---
const PRACTICA_DEL_PLAN = /^Entrenaste según el plan del año: (.+?) \(tramo (\d+) de (\d+): (.+)\)\.?$/;

function crearPractica(entrada) {
  const m = String(entrada.message ?? '').match(PRACTICA_DEL_PLAN);
  if (!m) return null;
  const linea = nodo('div', 'log-adjunto rl-practica');
  linea.dataset.type = 'practica';
  const cabeza = soloVisual(nodo('span', 'rl-practica-cabeza rl-breve'));
  cabeza.append(icono('practica', { clase: 'ln-ico rl-practica-ico' }), nodo('span', null, m[1]), nodo('span', 'rl-practica-tramo', `tramo ${m[2]}/${m[3]}`));
  linea.append(cabeza, prosa(entrada.message), filaDeEfectos(m[4]));
  return linea;
}

// --- El beat que corta la carrera ----------------------------------------------------------------------------------------
// No hay un campo que lo marque: es la última línea narrativa de una carrera que terminó (burnout, la casa, la edad, una
// lesión, la ventana de vuelta que se cerró) o la del retiro que abre la ventana de vuelta (`systems/retiro.js` la empieza
// con `state.motivoRetiro`).
function ultimaNarrativa(logs) {
  for (let i = (logs?.length ?? 0) - 1; i >= 0; i -= 1) {
    if (formaBeat(logs[i])) return logs[i];
  }
  return null;
}

export function esCorte(entry, state) {
  if (!entry || !state || !(state.terminado || state.phase === 'retirado')) return false;
  if (ultimaNarrativa(state.logs) !== entry) return false;
  if (state.terminado) return true;
  return entry.type === 'retiro' && Boolean(state.motivoRetiro) && String(entry.message ?? '').startsWith(state.motivoRetiro);
}

function crearAlertaDeCorte(entry, state) {
  const item = nodo('div', 'log-item log-item--alerta');
  item.dataset.type = entry.type ?? '';
  item.dataset.acento = 'danger';
  item.appendChild(icono('alto', { clase: 'ln-ico log-ico' }));
  item.appendChild(nodo('div', 'rl-alerta-kicker', state.terminado ? 'Fin de la carrera' : 'Te retirás'));
  item.appendChild(nodo('div', 'rl-alerta-texto', entry.message));
  return item;
}

export function crearLogItem(entry, { beat = null, state = null, usados = new Set() } = {}) {
  if (entry.type === 'top_mundial' && Array.isArray(entry.top20)) {
    return crearRevealTop20(entry);
  }
  if (entry.type === 'edad' && typeof entry.nota === 'number') {
    return crearRevealResumenAnio(entry);
  }
  // K5-A: el cierre de tu Mundial es una tarjeta (el Swiss resumido y el bracket con tu camino).
  if (entry.type === 'internacional' && entry.mundial) {
    return crearTarjetaMundial(entry);
  }
  if (entry.type === 'meta' && !entry.tecnico) {
    const parche = leerParche(entry.message);
    if (parche) return crearParche(entry, parche, { beat, state, usados });
  }
  const semana = leerSemana(entry);
  if (semana) return crearSemana(entry, semana);
  if (esMapa(entry)) return crearMapaDeBeat(entry);

  // K4-C: el evento que resolvió tu perfil, en una línea de crónica — el título, lo que planteaba, qué tomaste
  // (como quién) y qué pasó. Un solo ítem del feed: el texto del evento no se pierde, pasa a ser la historia.
  if (entry.cronica) return crearCronica(entry);

  const item = document.createElement('div');
  item.className = 'log-item' + (entry.tecnico ? ' log-item--tecnico' : '');
  item.dataset.type = entry.type ?? '';
  item.dataset.acento = acentoDeLog(entry.type);
  if (entry.type === 'meta') item.classList.add('log-item--breaking');
  if (entry.type === 'escena') item.classList.add('log-item--escena');
  if (entry.type === 'top_mundial') item.classList.add('log-item--top-mundial');
  // PLANUI §8: cada beat entra con su ícono por `log.type` (el glifo del kit; uno desconocido, el punto).
  if (!entry.tecnico) item.appendChild(icono(entry.type, { clase: 'ln-ico log-ico' }));

  if (entry.type === 'meta') {
    const rotulo = document.createElement('span');
    rotulo.className = 'log-rotulo';
    rotulo.textContent = 'Parche';
    item.appendChild(rotulo);
  }

  if (!entry.cuerpo) {
    const msg = document.createElement('div');
    msg.textContent = entry.message;
    item.appendChild(msg);
    if (entry.efectos) item.appendChild(filaDeEfectos(entry.efectos));
    return item;
  }

  const titulo = document.createElement('div');
  titulo.className = 'log-titulo';
  titulo.textContent = entry.titulo ?? '';
  item.appendChild(titulo);

  const cuerpo = document.createElement('div');
  cuerpo.textContent = entry.cuerpo;
  item.appendChild(cuerpo);

  if (entry.efectos) item.appendChild(filaDeEfectos(entry.efectos));

  return item;
}

// K4c-F: las líneas `adjunto` (core/log.js) van adentro del beat anterior, legibles, una por renglón — no compiten
// por un beat del reproductor pero siguen a la vista en el feed. C1b: los mapas seguidos de una serie que no frenó son
// una fila de teselas; el parche que no te movió el main, una línea con sus saltos; la práctica del plan, sus chips.
export function crearAdjuntos(entradas, state = null) {
  const bloque = document.createElement('div');
  bloque.className = 'log-adjuntos';
  let mapas = [];
  const soltarMapas = () => {
    if (mapas.length === 0) return;
    bloque.appendChild(crearFilaDeMapas(mapas));
    // cada tesela ya se lee con su línea del motor; la prosa es para la vista con textos completos
    const lineas = soloVisual(prosa(undefined));
    for (const mapa of mapas) lineas.appendChild(nodo('p', null, mapa.message ?? ''));
    bloque.appendChild(lineas);
    mapas = [];
  };
  for (const entrada of entradas) {
    if (esMapa(entrada)) {
      mapas.push(entrada);
      continue;
    }
    soltarMapas();
    const parche = entrada.type === 'meta' ? leerParche(entrada.message) : null;
    const forma = parche ? crearParcheAdjunto(entrada, parche, state)
      : entrada.type === 'serie' ? crearAnuncioDeSerie(entrada)
        : entrada.type === 'practica' ? crearPractica(entrada)
          : null;
    if (forma) {
      bloque.appendChild(forma);
      continue;
    }
    const linea = document.createElement('div');
    linea.className = 'log-adjunto';
    linea.dataset.type = entrada.type ?? '';
    linea.textContent = entrada.message ?? entrada.cuerpo ?? entrada.titulo ?? '';
    bloque.appendChild(linea);
  }
  soltarMapas();
  return bloque;
}

// La tira técnica (los logs `tecnico`), atenuada: "Split 6: mecánica -1, macro 53, consistencia 3." en chips (el delta con
// su signo, los valores sin), el campeón del split con su medidor; lo demás ("Temporada regular: 9-1…", "El mercado se
// movió…") en texto, como siempre.
const LINEA_DE_SPLIT = /^(Split \d+):\s*(.+)$/;

export function crearTiraTecnica(entradas) {
  const tira = document.createElement('div');
  tira.className = 'log-tira-tecnica';
  for (const e of entradas) {
    const texto = e.message ?? e.cuerpo ?? e.titulo ?? '';
    if (!texto) continue;
    const split = texto.match(LINEA_DE_SPLIT);
    const campeon = e.type === 'campeones' ? leerCampeonDelSplit(texto) : null;
    if (split) {
      const item = nodo('div', 'rl-tec rl-tec--split');
      item.append(soloVisual(nodo('span', 'rl-tec-rotulo', split[1])), filaDeEfectos(texto, { tenue: true }));
      tira.appendChild(item);
    } else if (campeon) {
      tira.appendChild(crearMedidorDeMeta(campeon, texto, { tenue: true }));
    } else {
      tira.appendChild(nodo('div', 'rl-tec rl-tec--texto', texto));
    }
  }
  return tira;
}

// `offset` (fase V, V0b): índice absoluto en `state.logs` de `entradas[0]`.
// `logs` solo crece (`core/pipeline.js` nunca lo recorta ni reordena), así
// que el índice absoluto del último elemento incorporado a un beat es una
// clave natural estable para `reconciliar` — el mismo beat, si no cambió,
// vuelve a calcular la misma `clave` en el próximo render.
//
// K4c-F: qué línea abre un beat lo dice `formaBeat` (core/log.js), la misma función que usa el instrumento de
// simulate.js. Las que no lo abren se pegan al beat en curso: las `tecnico` a la tira atenuada, las `adjunto` a su
// bloque legible.
export function agruparBeats(entradas, offset = 0) {
  const beats = [];
  let actual = null;
  entradas.forEach((entrada, i) => {
    const indice = offset + i;
    if (!formaBeat(entrada)) {
      if (!actual) actual = { narrativa: null, tecnicos: [], adjuntos: [], clave: indice };
      (entrada.tecnico ? actual.tecnicos : actual.adjuntos).push(entrada);
      actual.clave = indice;
    } else {
      if (actual) beats.push(actual);
      actual = { narrativa: entrada, tecnicos: [], adjuntos: [], clave: indice };
    }
  });
  if (actual) beats.push(actual);
  return beats;
}

// ¿Ya se mostraron los mapas de la serie que cierra este beat? Los mapas son líneas del mismo split que van antes del cierre
// (adjuntos del relato en una serie sin parada, beats de mapa en una con parada, que ya contó el cara a cara): si hay uno
// atrás, hasta la serie anterior, la tarjeta de post-serie no repite la fila.
function mapasYaMostrados(beat, state) {
  const logs = state?.logs;
  const i = logs ? logs.lastIndexOf(beat.narrativa) : -1;
  for (let j = i - 1; j >= 0; j -= 1) {
    if (logs[j]?.postSerie) return false;
    if (esMapa(logs[j])) return true;
  }
  return false;
}

export function nodoDeBeat(beat, state) {
  // C1b: lo que una forma ya mostró adentro (el campeón que sale y el ajuste al meta, en la tarjeta del parche) no se repite
  // en los adjuntos ni en la tira técnica.
  const usados = new Set();
  let nodo;
  if (beat.narrativa) {
    if (beat.narrativa.type === 'temporada' && state) {
      nodo = crearTarjetaResultado(beat.narrativa, state);
    } else if (beat.narrativa.type === 'serie' && beat.narrativa.postSerie) {
      nodo = crearTarjetaResultadoSerie(beat.narrativa, state, { mapasVistos: mapasYaMostrados(beat, state) });
    } else if (esCorte(beat.narrativa, state)) {
      nodo = crearAlertaDeCorte(beat.narrativa, state);
    } else {
      nodo = crearLogItem(beat.narrativa, { beat, state, usados });
    }
  } else {
    nodo = document.createElement('div');
    nodo.className = beat.adjuntos.length > 0 ? 'log-item' : 'log-item log-item--tecnico';
  }
  // K2d: el mapa y la fecha marcada dicen con qué probabilidad se jugaron (la
  // `p` que el motor tiró, en el log).
  const jugada = textoDeProbabilidadJugada(beat.narrativa);
  if (jugada) {
    const prob = document.createElement('div');
    prob.className = 'resultado-prob';
    prob.textContent = jugada;
    nodo.appendChild(prob);
  }
  const adjuntos = beat.adjuntos.filter((entrada) => !usados.has(entrada));
  if (adjuntos.length > 0) {
    nodo.appendChild(crearAdjuntos(adjuntos, state));
  }
  const tecnicos = beat.tecnicos.filter((entrada) => !usados.has(entrada));
  if (tecnicos.length > 0) {
    nodo.appendChild(crearTiraTecnica(tecnicos));
  }
  return nodo;
}

// Único lugar donde se declara este número (H8, saneamiento post-V1):
// `reproductor.js` tenía su propia copia a mano, sincronizada solo por
// comentario ("mismo número que renderFeed"), y era la puerta por la que se
// coló el bypass del reconciliador — recortaba nodos de un `logList` que
// `reconciliar` no sabía que había perdido.
export const LIMITE_FEED = 8;

// `hasta` (fase J-higiene, H8): índice absoluto de corte, exclusive —
// por defecto el final real de `state.logs`. Es lo que le permite a
// `reproductor.reproducirBeats` revelar el feed de a un beat por vez SIN
// escribir DOM a mano: cada paso llama a esta misma función con un `hasta`
// que crece de a uno, y es `reconciliar` — no el llamador — quien decide
// qué nodo crear, cuál actualizar y cuál sacar.
//
// K6a-A: el `limite` cuenta BEATS, no líneas. Contando líneas, los renglones `adjunto` (el mundo que no te toca: cinco
// campeones de liga al cerrar el año) empujaban afuera de la ventana el resultado de la decisión que acababas de tomar
// —en el ensayo de K6, lo que pasó tras los tryouts abiertos y tras el receso nunca se vio—. Ahora la ventana arranca
// en la cabeza del beat número `limite` contando desde el final: los adjuntos viajan con su beat y no le roban lugar.
function inicioDeVentana(logs, hasta, limite) {
  let beats = 0;
  for (let i = hasta - 1; i >= 0; i -= 1) {
    if (formaBeat(logs[i])) {
      beats += 1;
      if (beats === limite) return i;
    }
  }
  return 0;
}

export function renderFeed(logList, state, { limite = LIMITE_FEED, hasta = state.logs.length } = {}) {
  const desde = inicioDeVentana(state.logs, hasta, limite);
  const recientes = state.logs.slice(desde, hasta);
  const beats = agruparBeats(recientes, desde).reverse();
  reconciliar(
    logList,
    beats,
    (beat) => beat.clave,
    (beat) => nodoDeBeat(beat, state),
    (nodo, beat) => reemplazarEnElLugar(nodo, nodoDeBeat(beat, state))
  );
}

// FASE V (V4; PLAN.md §V.3 regla 3): los números de los efectos de un beat ("estudios +7, sueño +1") se cuentan desde 0 cuando el
// beat entra. Solo el nodo recién creado: la reconciliación de los pasos siguientes reconstruye los beats ya pintados sin
// volver a contar. El texto final es el mismo (el conteo termina en el número) y con movimiento reducido o en INST
// (`animar: false`) el número aparece ya en su valor final. Un número con decimales o con "%" no se mueve.
const DURACION_DE_LOS_EFECTOS_MS = 320;
const NUMERO_CON_SIGNO = /(?<![\w.,])([+\-−])(\d+)(?![\d%]|[.,]\d)/g;

// Los números con signo de una línea de efectos, en orden: `[{ indice, texto, signo, valor }]` (`texto` es el número tal cual, "+7").
// Pura: la usa `animarEfectos` y la prueba `validate.js`.
export function numerosDeEfectos(texto) {
  return [...texto.matchAll(NUMERO_CON_SIGNO)].map((c) => ({ indice: c.index, texto: c[0], signo: c[1], valor: Number(c[2]) }));
}

export function animarEfectos(nodo, { animar = true } = {}) {
  if (!animar) return nodo;
  // C1b: el beat recién llegado entra (`.rl-entra`, feed.css: el beat sube, los chips y los bloques en cascada, las barras se
  // llenan). La clase vive solo en el nodo nuevo: en el paso siguiente `reemplazarEnElLugar` le pone la del nodo fresco y
  // nada se vuelve a animar.
  nodo.classList?.add('rl-entra');
  // Los números de los chips (y el LP de la semana, el ajuste al meta) ruedan desde 0: `data-rueda` es el valor final y
  // `data-prefijo` su signo. Adentro de una imagen para lectores (`role="img"` con el texto del motor), así que el conteo no
  // se anuncia; igual se le saca al lector cada cuadro intermedio.
  for (const el of nodo.querySelectorAll('[data-rueda]')) {
    const valor = Number(el.dataset.rueda);
    if (!Number.isFinite(valor)) continue;
    const prefijo = el.dataset.prefijo ?? '';
    el.setAttribute('aria-hidden', 'true');
    moverNumero(el, 0, valor, { formato: (n) => `${prefijo}${n}`, duracion: DURACION_DE_LOS_EFECTOS_MS, animar });
  }
  // una línea de efectos que quedó en texto (sin chips): el camino de siempre
  for (const linea of nodo.querySelectorAll('.log-efectos')) {
    if (linea.querySelector?.('.eje-chip')) continue;
    const texto = linea.textContent;
    const numeros = numerosDeEfectos(texto);
    if (numeros.length === 0) continue;
    const piezas = [];
    let desde = 0;
    for (const numero of numeros) {
      piezas.push(document.createTextNode(texto.slice(desde, numero.indice)));
      const el = document.createElement('span');
      el.className = 'efecto-numero';
      el.textContent = numero.texto;
      piezas.push(el, leerSoloElFinal(el, numero.texto));
      numero.el = el;
      desde = numero.indice + numero.texto.length;
    }
    piezas.push(document.createTextNode(texto.slice(desde)));
    linea.replaceChildren(...piezas);
    for (const { el, signo, valor } of numeros) {
      moverNumero(el, 0, valor, { formato: (n) => `${signo}${n}`, duracion: DURACION_DE_LOS_EFECTOS_MS, animar });
    }
  }
  return nodo;
}

// La página del relato (FASE V, V2-B; PLAN.md §V.5 "Una página por split"): los beats del split en curso, en orden
// cronológico (el más nuevo abajo) y sin el límite de `LIMITE_FEED`. `desde` es `inicioDePagina` (índice absoluto en
// `state.logs`, el `logs.length` de cuando se llamó a `avanzarSplit`); `hasta`, el corte exclusive (el reproductor lo
// hace crecer de a un beat). Tres renglones que no son del motor: `cartel` (FASE V, V4: la ventana y el año, una línea) arriba
// de todo, `anterior` (el cierre del split anterior, en una línea, cuando su tarjeta no llegó a verse) abajo del cartel, y
// `cierre` (la tarjeta de cierre del split) abajo de todo, como un beat más.
// Pasa por `reconciliar` con las mismas claves que `renderFeed` (índices absolutos): un beat ya pintado se actualiza en
// su lugar, no se duplica. `renderFeed` y sus checks no cambian.
//
// `animar` (V4): lo que entra por primera vez se mueve (el número de la tarjeta de cierre, los efectos de un beat). El
// reproductor lo apaga en INST; con movimiento reducido cada número aparece ya en su valor final. Lo que ya estaba pintado se
// reconstruye quieto, y los renglones sintéticos (cartel, línea anterior, tarjeta) solo si cambió su contenido.
export function renderPagina(contenedor, state, { desde = 0, hasta = state.logs.length, anterior = null, cierre = null, cartel = null, animar = false } = {}) {
  const inicio = Math.max(0, Math.min(desde, hasta));
  const items = [
    ...(cartel ? [{ sintetico: 'cartel', cartel }] : []),
    ...(anterior ? [{ sintetico: 'anterior', cierre: anterior }] : []),
    ...agruparBeats(state.logs.slice(inicio, hasta), inicio),
    ...(cierre ? [{ sintetico: 'cierre', cierre }] : [])
  ];
  const firmaDe = (item) => (item.sintetico === 'cartel' ? JSON.stringify(item.cartel) : JSON.stringify(item.cierre));
  const nodoDeItem = (item, nuevo) => {
    if (item.sintetico === 'cartel') return crearCartelDePagina(item.cartel);
    if (item.sintetico === 'anterior') return crearLineaSplitAnterior(item.cierre);
    if (item.sintetico === 'cierre') return crearTarjetaCierre(item.cierre, { animar: nuevo && animar });
    const nodo = nodoDeBeat(item, state);
    return nuevo ? animarEfectos(nodo, { animar }) : nodo;
  };
  const nodoConFirma = (item, nuevo) => {
    const nodo = nodoDeItem(item, nuevo);
    if (item.sintetico) nodo.dataset.firma = firmaDe(item);
    return nodo;
  };
  reconciliar(
    contenedor,
    items,
    (item) => item.sintetico ?? item.clave,
    (item) => nodoConFirma(item, true),
    (nodo, item) => {
      if (item.sintetico && nodo.dataset.firma === firmaDe(item)) return;
      reemplazarEnElLugar(nodo, nodoConFirma(item, false));
    }
  );
}

// Dónde arranca la página cuando no se sabe dónde arrancó el split (retomar sin el marcador de `lolcs-vista`): en los
// últimos `limite` beats, la misma ventana que `renderFeed`.
export function desdeDeUltimosBeats(logs, limite = LIMITE_FEED) {
  return inicioDeVentana(logs, logs.length, limite);
}

// "Lo último que pasó" de una parada (FASE V, V2-C; PLAN.md §V.4 `.parada-antes`, §V.5 "Una parada a mitad de split
// reemplaza al relato"): el relato (`#logList`) se ve solo en la pieza `relato`; una parada abre con este nodo, que dice
// en una línea el último beat que el relato YA contó en esta página y deja abrir la página entera ("ver la página (n)").
// `contenedor` es `#paradaAntes`; `state` es el estado de la parada (todos sus logs ya se contaron: el reproductor los
// revela antes de que entre una parada) y `desde` es `inicioDePagina`. Nunca muestra un beat por contar. Sin beats en la
// página (la parada abre el split) el nodo queda oculto. El texto es plano (la `message` ya compuesta del beat): si es
// largo lo corta el CSS con "…".
//
// FASE V (V4): `cierreDelAnio` (`{ anio }`) es el de una parada que ES el cierre de año (la de `edadCierre`, que frena el motor): se
// pinta como el cartel de una línea "Cierre de 2031" (el de las páginas, `crearCartelDePagina`), arriba de todo, aunque la página no
// tenga beats. Sin números: a mitad de la página todavía no son los del cierre.
//
// PLANUI §0.6 (U3a, punto 3): la línea se vuelve la franja "Mientras tanto" (en rápido es lo que se VE del tramo; a 1× y 2×,
// un repaso): cuántas cosas pasaron, los efectos sumados por eje (chips) y 2-3 titulares — tus resultados y los eventos
// con elección primero, el mundo al final (`franjaDelTramo`, ui/core/momentos.js). `tramoDesde` (por defecto `desde`) es
// donde arrancó el tramo: la última respuesta del jugador. Clic o L la abren como un cajón sobre la parada con la página
// entera del tramo (`renderPagina`, con scroll); Esc o L lo cierran y el foco vuelve a la franja.
function bloqueDeEleccion(e) {
  const bloque = document.createElement('section');
  bloque.className = 'mt-eleccion';
  bloque.setAttribute('aria-label', `Lo que elegiste: ${e.decision}`);
  const rotulo = document.createElement('span');
  rotulo.className = 'mt-eleccion-rotulo';
  rotulo.textContent = 'Lo que elegiste';
  const titulo = document.createElement('h3');
  titulo.className = 'mt-eleccion-titulo';
  titulo.textContent = e.decision;
  const opcion = document.createElement('p');
  opcion.className = 'mt-eleccion-opcion';
  opcion.textContent = e.opcion;
  const salio = document.createElement('p');
  salio.className = 'mt-eleccion-salio';
  salio.textContent = e.salio;
  bloque.append(rotulo, titulo, opcion, salio);
  if (e.ejes.length > 0) {
    const ejes = document.createElement('span');
    ejes.className = 'eje-chips mt-eleccion-ejes';
    for (const x of e.ejes) ejes.append(chipEje({ eje: x.eje, valor: x.valor, cambio: true, sufijo: x.sufijo, grande: true }));
    bloque.append(ejes);
  }
  return bloque;
}

export function renderParadaAntes(contenedor, state, { desde = 0, cierreDelAnio = null, tramoDesde = desde } = {}) {
  const inicio = Math.max(0, Math.min(tramoDesde ?? desde, state.logs.length));
  const franja = franjaDelTramo(state.logs, inicio);
  contenedor.replaceChildren();
  const cartelDelAnio = cierreDelAnio?.anio ? `Cierre de ${cierreDelAnio.anio}` : null;
  const conElecciones = (franja.elecciones ?? []).length > 0;
  if (franja.cuantas === 0 && !cartelDelAnio && !conElecciones) {
    contenedor.hidden = true;
    return;
  }
  // F3 (PLANUI §0.8, punto 6): lo que elegiste y lo que salió, arriba y aparte, más grande que las líneas comunes.
  for (const e of franja.elecciones ?? []) contenedor.append(bloqueDeEleccion(e));
  // F3: si lo único que pasó en el tramo es lo que elegiste, el bloque alcanza: no hay franja "Mientras tanto" vacía.
  if (franja.cuantas === 0 && !cartelDelAnio) {
    contenedor.hidden = false;
    return;
  }
  const rotulo = document.createElement('span');
  rotulo.className = 'mt-rotulo';
  rotulo.append(icono(cartelDelAnio ? 'temporada' : 'serie'), cartelDelAnio ? `${cartelDelAnio} · Mientras tanto` : 'Mientras tanto');
  if (franja.cuantas === 0) {
    const sola = document.createElement('p');
    sola.className = 'mt-franja mt-franja--sola';
    sola.append(rotulo);
    contenedor.append(sola);
    contenedor.hidden = false;
    return;
  }
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'mt-franja';
  boton.setAttribute('aria-haspopup', 'dialog');
  boton.setAttribute('aria-keyshortcuts', 'L');
  const cuenta = document.createElement('b');
  cuenta.className = 'mt-cuenta';
  cuenta.textContent = franja.cuantas === 1 ? '1 cosa pasó' : `${franja.cuantas} cosas pasaron`;
  const cabeza = document.createElement('span');
  cabeza.className = 'mt-cabeza';
  cabeza.append(rotulo, cuenta);
  if (franja.ejes.length > 0) {
    const ejes = document.createElement('span');
    ejes.className = 'eje-chips mt-ejes';
    for (const x of franja.ejes) ejes.append(chipEje({ eje: x.eje, valor: x.valor, cambio: true, sufijo: x.sufijo }));
    cabeza.append(ejes);
  }
  const titulares = document.createElement('span');
  titulares.className = 'mt-titulares';
  for (const t of franja.titulares) {
    const fila = document.createElement('span');
    fila.className = 'mt-titular';
    const texto = document.createElement('span');
    texto.textContent = t.texto;
    fila.append(icono(t.type), texto);
    titulares.append(fila);
  }
  const abrir = document.createElement('span');
  abrir.className = 'mt-abrir';
  const tecla = document.createElement('kbd');
  tecla.textContent = 'L';
  abrir.append('Ver todo', tecla);
  boton.append(cabeza, titulares, abrir);
  boton.addEventListener('click', () => abrirCajon(state, inicio, franja.cuantas, boton));
  contenedor.append(boton);
  contenedor.hidden = false;
}

// El cajón de "Mientras tanto": un `<dialog>` modal (el foco queda adentro; Esc lo cierra nativo) con la página del tramo.
function abrirCajon(state, desde, cuantas, boton) {
  if (document.querySelector('dialog.mt-cajon[open]')) return;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'mt-cajon';
  dialogo.setAttribute('aria-label', 'Mientras tanto: el tramo entero');
  const cabeza = document.createElement('header');
  cabeza.className = 'mt-cajon-cabeza';
  const titulo = document.createElement('h2');
  titulo.textContent = 'Mientras tanto';
  const cuenta = document.createElement('span');
  cuenta.textContent = cuantas === 1 ? '1 cosa' : `${cuantas} cosas`;
  const cerrar = document.createElement('button');
  cerrar.type = 'button';
  cerrar.className = 'mt-cajon-cerrar';
  const esc = document.createElement('kbd');
  esc.textContent = 'Esc';
  cerrar.append('Cerrar', esc);
  cerrar.addEventListener('click', () => dialogo.close());
  cabeza.append(titulo, cuenta, cerrar);
  const pagina = document.createElement('div');
  pagina.className = 'log-list relato-pagina mt-pagina';
  renderPagina(pagina, state, { desde });
  dialogo.append(cabeza, pagina);
  dialogo.addEventListener('keydown', (e) => {
    if ((e.key === 'l' || e.key === 'L') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      dialogo.close();
    }
  });
  // el clic en el velo (afuera de la caja) también lo cierra
  dialogo.addEventListener('click', (e) => {
    if (e.target === dialogo) dialogo.close();
  });
  dialogo.addEventListener('close', () => {
    dialogo.remove();
    if (boton.isConnected) boton.focus({ preventScroll: true });
  });
  document.body.append(dialogo);
  dialogo.showModal();
  cerrar.focus({ preventScroll: true });
}

function limpio(texto) {
  return String(texto ?? '').replace(/\s+/g, ' ').trim();
}
