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
import { crearTarjetaResultado } from './serie.js';

export function crearLogItem(entry) {
  const item = document.createElement('div');
  item.className = 'log-item' + (entry.tecnico ? ' log-item--tecnico' : '');
  item.dataset.type = entry.type ?? '';
  item.dataset.acento = acentoDeLog(entry.type);
  if (entry.type === 'meta') item.classList.add('log-item--breaking');
  if (entry.type === 'escena') item.classList.add('log-item--escena');

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
    nodo = beat.narrativa.type === 'temporada' && state
      ? crearTarjetaResultado(beat.narrativa, state)
      : crearLogItem(beat.narrativa);
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
