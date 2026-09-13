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
import METAS from '../../data/metas.json' with { type: 'json' };
import { acentoDeLog, rotuloDeDecision } from '../formatoUi.js';
import { crearOrgChip } from './orgChip.js';
import { etiquetaRol } from '../../data/roles.js';
import { crearTarjetaResultado, crearTarjetaResultadoSerie } from './serie.js';

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
    detalle.textContent = [fila.rol ? etiquetaRol(fila.rol) : '', fila.liga].filter(Boolean).join(' · ');

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
const LABEL_BANDA = { rojo: 'Flojo', gris: 'Parejo', ambar: 'Bueno', verde: 'Excelente' };

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

  const nota = document.createElement('div');
  nota.className = `resumen-anio-nota resumen-anio-nota--${entry.banda}`;
  nota.textContent = `Nota de la temporada: ${entry.nota.toFixed(1)} — ${LABEL_BANDA[entry.banda] ?? entry.banda}`;
  item.appendChild(nota);

  const vinetas = document.createElement('div');
  vinetas.className = 'resumen-anio-vinetas';
  for (const vineta of entry.vinetas ?? []) {
    const fila = document.createElement('div');
    fila.className = 'resumen-anio-vineta';
    const icono = document.createElement('span');
    icono.className = 'resumen-anio-icono';
    icono.textContent = vineta.icono;
    const texto = document.createElement('span');
    texto.textContent = vineta.texto;
    fila.append(icono, texto);
    vinetas.appendChild(fila);
  }
  item.appendChild(vinetas);

  return item;
}

export function crearLogItem(entry) {
  if (entry.type === 'top_mundial' && Array.isArray(entry.top20)) {
    return crearRevealTop20(entry);
  }
  if (entry.type === 'edad' && typeof entry.nota === 'number') {
    return crearRevealResumenAnio(entry);
  }

  const item = document.createElement('div');
  item.className = 'log-item' + (entry.tecnico ? ' log-item--tecnico' : '');
  item.dataset.type = entry.type ?? '';
  item.dataset.acento = acentoDeLog(entry.type);
  if (entry.type === 'meta') item.classList.add('log-item--breaking');
  if (entry.type === 'escena') item.classList.add('log-item--escena');
  if (entry.type === 'top_mundial') item.classList.add('log-item--top-mundial');

  if (entry.type === 'meta') {
    const pestana = document.createElement('span');
    pestana.className = 'log-pestana';
    pestana.textContent = 'PARCHE';
    item.appendChild(pestana);
  }

  if (!entry.cuerpo) {
    const msg = document.createElement('div');
    msg.textContent = entry.message;
    item.appendChild(msg);
    return item;
  }

  const titulo = document.createElement('div');
  titulo.className = 'log-titulo';
  titulo.textContent = entry.titulo ?? '';
  item.appendChild(titulo);

  const cuerpo = document.createElement('div');
  cuerpo.textContent = entry.cuerpo;
  item.appendChild(cuerpo);

  if (entry.efectos) {
    const efectos = document.createElement('div');
    efectos.className = 'log-efectos';
    efectos.textContent = entry.efectos;
    item.appendChild(efectos);
  }

  return item;
}

export function crearTiraTecnica(entradas) {
  const tira = document.createElement('div');
  tira.className = 'log-tira-tecnica';
  tira.textContent = entradas
    .map((e) => e.message ?? e.cuerpo ?? e.titulo ?? '')
    .filter(Boolean)
    .join(' · ');
  return tira;
}

export function agruparBeats(entradas) {
  const beats = [];
  let actual = null;
  for (const entrada of entradas) {
    if (entrada.tecnico) {
      if (!actual) actual = { narrativa: null, tecnicos: [] };
      actual.tecnicos.push(entrada);
    } else {
      if (actual) beats.push(actual);
      actual = { narrativa: entrada, tecnicos: [] };
    }
  }
  if (actual) beats.push(actual);
  return beats;
}

export function nodoDeBeat(beat, state) {
  let nodo;
  if (beat.narrativa) {
    if (beat.narrativa.type === 'temporada' && state) {
      nodo = crearTarjetaResultado(beat.narrativa, state);
    } else if (beat.narrativa.type === 'serie' && beat.narrativa.postSerie) {
      nodo = crearTarjetaResultadoSerie(beat.narrativa, state);
    } else {
      nodo = crearLogItem(beat.narrativa);
    }
  } else {
    nodo = document.createElement('div');
    nodo.className = 'log-item log-item--tecnico';
  }
  if (beat.tecnicos.length > 0) {
    nodo.appendChild(crearTiraTecnica(beat.tecnicos));
  }
  return nodo;
}

export function renderFeed(logList, state, { limite = 8 } = {}) {
  const recientes = state.logs.slice(-limite);
  const beats = agruparBeats(recientes).reverse();
  logList.replaceChildren(...beats.map((beat) => nodoDeBeat(beat, state)));
}

export function renderLowerThird(summary, metaPill, state, { modo, decision } = {}) {
  if (!summary || !metaPill) return;

  if (state?.terminado && state.tarjeta) {
    summary.hidden = true;
    metaPill.hidden = true;
    metaPill.textContent = '';
    return;
  }

  summary.hidden = false;
  metaPill.hidden = false;

  const regimenObj = METAS.find((m) => m.id === state?.meta?.regimen);
  const seed = state?.seed;
  if (regimenObj && seed != null) {
    metaPill.textContent = `${regimenObj.nombre} · seed ${seed}`;
  } else if (seed != null) {
    metaPill.textContent = `seed ${seed}`;
  } else {
    metaPill.textContent = '';
  }

  if (modo === 'minijuego') {
    summary.textContent = 'EN EL MAPA';
    return;
  }
  if (modo === 'mercado') {
    summary.textContent = decision?.titulo ?? 'Ventana de pases';
    return;
  }
  if (modo === 'decision' && decision) {
    summary.textContent = rotuloDeDecision(decision, state).label;
    return;
  }

  const ultimo = [...(state?.logs ?? [])].reverse().find((l) => !l.tecnico);
  summary.textContent = ultimo?.cuerpo ?? ultimo?.message ?? 'Split en curso';
}
