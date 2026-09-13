import { tablaDePosiciones, posicionEnTabla } from '../../core/temporada.js';
import { etiquetaDeRonda } from '../../core/serie.js';
import { etiquetaDeFuerza } from '../formatoUi.js';
import { crearOrgChip } from './orgChip.js';
import { crearCampeonTile } from './campeonTile.js';
import { countUp } from './countUp.js';

// La transmisión del partido y la serie (fase T6, PLAN.md "T6 — El partido
// y la serie como transmisión"). Dos piezas: la tarjeta de resultado de
// fecha (reemplaza el log plano de `type: 'temporada'`) y el contexto de
// serie de playoffs (bracket + camino Fearless), visible mientras
// `state.serie.activa`.

// --- La tarjeta de resultado de fecha ---------------------------------
//
// El log `type: 'temporada'` que `systems/temporada.js` ya escribe trae
// TODO narrado en una frase — motivo, resultado, posición, campeón — pero
// como prosa, no como campos. En vez de re-parsear ese texto (frágil: un
// cambio de redacción rompería el parser en silencio), esta tarjeta usa el
// texto tal cual para el cuerpo, y arma el encabezado con los campos que sí
// están disponibles como datos reales, sin tocar `systems/`:
//   - rival/fuerza/local: `career.temporada.calendario[indice - 1]` — la
//     fecha recién jugada, ya avanzada por `avanzarFechaSilenciosa`.
//   - victoria/derrota: el signo de `racha` (ya persistente y correcto
//     después de resolver, no hace falta re-derivarlo).
//   - posición: `posicionEnTabla` sobre la tabla derivada en vivo — mismo
//     campo muerto que encontró T5 (`career.temporada.tabla` no sirve).
// `career.registro.momentos` no registra las fechas marcadas (solo lo que
// pasa por `systems/events.js`) — no hay otra fuente estructurada posible
// sin tocar motor.
export function crearTarjetaResultado(entry, state) {
  const { temporada, registro, currentOrg } = state.career;
  const fecha = temporada.calendario[temporada.indice - 1];

  const item = document.createElement('div');
  item.className = 'log-item log-item--resultado';
  item.dataset.type = 'temporada';

  if (!fecha) {
    // Red de seguridad: si algún día un log `type:'temporada'` no viene de
    // una fecha del fixture (no debería pasar hoy), se degrada al log
    // plano de siempre en vez de romper.
    item.textContent = entry.message;
    return item;
  }

  const gano = temporada.racha > 0;
  item.dataset.acento = gano ? 'up' : 'down';
  const tabla = tablaDePosiciones(temporada.registrosOtros, temporada.filaPropia);
  const posicion = posicionEnTabla(tabla, currentOrg);

  item.classList.add(gano ? 'log-item--resultado-victoria' : 'log-item--resultado-derrota');

  const cabecera = document.createElement('div');
  cabecera.className = 'resultado-cabecera';

  const marcador = document.createElement('span');
  marcador.className = 'resultado-marcador';
  marcador.textContent = gano ? 'GANARON' : 'PERDIERON';

  const rivalEl = document.createElement('span');
  rivalEl.className = 'resultado-rival';
  rivalEl.append(
    document.createTextNode(`${fecha.local ? 'vs' : '@'} `),
    crearOrgChip(fecha.rival, { size: 16 }),
    document.createTextNode(fecha.rival)
  );

  const fuerzaEl = document.createElement('span');
  fuerzaEl.className = 'resultado-fuerza';
  fuerzaEl.textContent = etiquetaDeFuerza(fecha.fuerzaRival, temporada.fuerzaPropia);

  cabecera.append(marcador, rivalEl, fuerzaEl);
  item.appendChild(cabecera);

  const cuerpo = document.createElement('div');
  cuerpo.textContent = entry.message;
  item.appendChild(cuerpo);

  const pie = document.createElement('div');
  pie.className = 'resultado-pie';
  const rachaAbs = Math.abs(temporada.racha);
  const rachaTxt = rachaAbs > 1 ? `Racha de ${rachaAbs} ${gano ? 'triunfos' : 'derrotas'}` : null;
  pie.textContent = [`${posicion}º de ${tabla.length}`, rachaTxt].filter(Boolean).join(' · ');
  item.appendChild(pie);

  return item;
}

// --- El bracket + el camino de la serie --------------------------------
//
// `serie.ronda` recorre `['cuartos','semis','final']` (+ `'internacional'`
// aparte) — `core/serie.js:etiquetaDeRonda` ya las nombra. `serie.mapas` ya
// guarda `[{campeon, resultado:'W'|'L'}]` y `serie.quemados` los campeones
// que el Fearless draft ya gastó: es la mecánica más distintiva del juego
// y hoy es una línea de texto plana.
const RONDAS_BRACKET = ['cuartos', 'semis', 'final'];
const ETIQUETAS_BRACKET = {
  cuartos: 'CUARTOS',
  semis: 'SEMI',
  final: 'FINAL'
};
let seriePrevia = { a: 0, b: 0 };

export function crearBarraBracket(rondaActual, { esPostSerie = false, gano = false } = {}) {
  const bracket = document.createElement('div');
  bracket.className = 'serie-bracket';

  const esIntl = rondaActual === 'internacional';
  const indiceActual = RONDAS_BRACKET.indexOf(rondaActual);

  RONDAS_BRACKET.forEach((ronda, indice) => {
    const paso = document.createElement('span');
    let mod = '';
    if (esIntl) {
      mod = ' serie-bracket-paso--superada';
    } else if (indiceActual >= 0) {
      if (indice < indiceActual) {
        mod = ' serie-bracket-paso--superada';
      } else if (indice === indiceActual) {
        if (esPostSerie) {
          mod = gano ? ' serie-bracket-paso--superada' : '';
        } else {
          mod = ' serie-bracket-paso--actual';
        }
      }
    }
    paso.className = 'serie-bracket-paso' + mod;
    paso.textContent = ETIQUETAS_BRACKET[ronda] ?? etiquetaDeRonda(ronda);
    bracket.appendChild(paso);
  });

  if (esIntl) {
    const pasoIntl = document.createElement('span');
    const modIntl = esPostSerie
      ? (gano ? ' serie-bracket-paso--superada' : '')
      : ' serie-bracket-paso--actual';
    pasoIntl.className = 'serie-bracket-paso' + modIntl;
    pasoIntl.textContent = 'INTERNACIONAL';
    bracket.appendChild(pasoIntl);
  }

  return bracket;
}

export function crearTarjetaResultadoSerie(entry, state) {
  const item = document.createElement('div');
  item.className = 'log-item log-item--resultado log-item--resultado-serie '
    + (entry.gano ? 'log-item--resultado-victoria' : 'log-item--resultado-derrota');
  item.dataset.type = 'serie';
  item.dataset.acento = entry.gano ? 'up' : 'down';

  const cabecera = document.createElement('div');
  cabecera.className = 'resultado-cabecera';

  const marcador = document.createElement('span');
  marcador.className = 'resultado-marcador';
  marcador.textContent = entry.gano ? 'GANARON LA SERIE' : 'PERDIERON LA SERIE';

  const scoreEl = document.createElement('span');
  scoreEl.className = 'resultado-score';
  scoreEl.textContent = entry.marcador ? ` (${entry.marcador[0]}–${entry.marcador[1]})` : '';

  const rivalEl = document.createElement('span');
  rivalEl.className = 'resultado-rival';
  if (entry.rival) {
    rivalEl.append(
      document.createTextNode('vs '),
      crearOrgChip(entry.rival, { size: 16 }),
      document.createTextNode(entry.rival)
    );
  }

  const rondaEl = document.createElement('span');
  rondaEl.className = 'resultado-fuerza';
  rondaEl.textContent = etiquetaDeRonda(entry.ronda ?? state?.serie?.ronda);

  cabecera.append(marcador, scoreEl, rivalEl, rondaEl);
  item.appendChild(cabecera);

  const bracket = crearBarraBracket(entry.ronda ?? state?.serie?.ronda, {
    esPostSerie: true,
    gano: entry.gano
  });
  item.appendChild(bracket);

  const cuerpo = document.createElement('div');
  cuerpo.className = 'resultado-cuerpo';
  cuerpo.textContent = entry.message;
  item.appendChild(cuerpo);

  const mapas = entry.mapas ?? state?.serie?.mapas ?? [];
  if (mapas.length > 0) {
    const camino = document.createElement('div');
    camino.className = 'resultado-camino';
    for (const m of mapas) {
      const fila = document.createElement('div');
      fila.className = 'resultado-mapa-fila';

      const tag = document.createElement('span');
      tag.className = 'resultado-mapa-tag ' + (m.resultado === 'W' ? 'resultado-mapa-tag--ganado' : 'resultado-mapa-tag--perdido');
      tag.textContent = `M${m.mapa} [${m.resultado} ${m.marcador}]`;

      const camp = document.createElement('span');
      camp.className = 'resultado-mapa-campeon';
      camp.textContent = m.campeon;

      const cierre = document.createElement('span');
      cierre.className = 'resultado-mapa-cierre';
      cierre.textContent = m.cierre ? `— ${m.cierre}` : '';

      fila.append(tag, camp, cierre);
      camino.appendChild(fila);
    }
    item.appendChild(camino);
  }

  return item;
}

export function renderSerieContexto(container, state) {
  const { serie } = state;
  const ultimoLog = state?.logs?.[state.logs.length - 1];
  const esPostSerie = Boolean(serie?.postSerie) || Boolean(ultimoLog?.postSerie);

  if (!serie || (!serie.activa && !esPostSerie)) {
    container.hidden = true;
    seriePrevia = { a: 0, b: 0 };
    return;
  }

  container.hidden = false;
  container.replaceChildren();

  const ganoSerie = (serie.marcador?.[0] ?? 0) > (serie.marcador?.[1] ?? 0);
  const bracket = crearBarraBracket(serie.ronda, { esPostSerie, gano: ganoSerie });
  container.appendChild(bracket);

  const propia = state.career.currentOrg ?? state.player.name;
  const rivalNombre = serie.rival?.org ?? 'Rival';
  const slots = Math.max(serie.formato || 0, serie.mapas.length, 1);

  const score = document.createElement('div');
  score.className = 'serie-scoreboard';

  const ladoPropio = document.createElement('div');
  ladoPropio.className = 'serie-lado';
  ladoPropio.append(crearOrgChip(propia, { size: 36 }));
  const nomP = document.createElement('span');
  nomP.className = 'serie-lado-nombre';
  nomP.textContent = propia;
  ladoPropio.appendChild(nomP);

  const nums = document.createElement('div');
  nums.className = 'serie-score';
  const a = document.createElement('span');
  const b = document.createElement('span');
  const sep = document.createElement('span');
  sep.className = 'serie-score-sep';
  sep.textContent = '–';
  countUp(a, seriePrevia.a, serie.marcador[0], { dur: 220 });
  countUp(b, seriePrevia.b, serie.marcador[1], { dur: 220 });
  seriePrevia = { a: serie.marcador[0], b: serie.marcador[1] };
  nums.append(a, sep, b);

  const ladoRival = document.createElement('div');
  ladoRival.className = 'serie-lado serie-lado--rival';
  const nomR = document.createElement('span');
  nomR.className = 'serie-lado-nombre';
  nomR.textContent = rivalNombre;
  ladoRival.append(nomR, crearOrgChip(rivalNombre, { size: 36 }));

  score.append(ladoPropio, nums, ladoRival);
  container.appendChild(score);

  const camino = document.createElement('div');
  camino.className = 'serie-camino';
  for (let i = 0; i < slots; i += 1) {
    const mapa = serie.mapas[i];
    const paso = document.createElement('div');
    paso.className = 'serie-mapa' + (mapa
      ? ` serie-mapa--${mapa.resultado === 'W' ? 'ganado' : 'perdido'}`
      : '');
    const n = document.createElement('span');
    n.className = 'serie-mapa-n';
    n.textContent = `M${i + 1}`;
    const c = document.createElement('span');
    c.className = 'serie-mapa-c';
    c.textContent = mapa ? (mapa.marcador ? `${mapa.campeon} (${mapa.marcador})` : mapa.campeon) : '—';
    paso.append(n, c);
    if (mapa?.cierre) {
      paso.title = mapa.cierre;
    }
    camino.appendChild(paso);
  }
  container.appendChild(camino);

  if (esPostSerie && serie.mapas.length > 0) {
    const cierres = document.createElement('div');
    cierres.className = 'serie-cierres-lista';
    for (const m of serie.mapas) {
      const fila = document.createElement('div');
      fila.className = `serie-cierre-item serie-cierre-item--${m.resultado === 'W' ? 'ganado' : 'perdido'}`;
      const tag = document.createElement('span');
      tag.className = 'serie-cierre-tag';
      tag.textContent = `M${m.mapa} [${m.resultado} ${m.marcador}] ${m.campeon}`;
      const texto = document.createElement('span');
      texto.className = 'serie-cierre-texto';
      texto.textContent = m.cierre ? ` — ${m.cierre}` : '';
      fila.append(tag, texto);
      cierres.appendChild(fila);
    }
    container.appendChild(cierres);
  }

  const quemados = serie.quemados ?? [];
  const pool = state.player.championPool ?? [];
  if (quemados.length > 0 || pool.length > 0) {
    const fearless = document.createElement('div');
    fearless.className = 'serie-fearless';
    const titulo = document.createElement('div');
    titulo.className = 'serie-fearless-titulo';
    titulo.textContent = 'Fearless';
    const grid = document.createElement('div');
    grid.className = 'serie-fearless-grid';
    const vistos = new Set();
    for (const nombre of quemados) {
      vistos.add(nombre);
      grid.appendChild(crearCampeonTile({ name: nombre }, { quemado: true, size: 'mini' }));
    }
    for (const campeon of pool) {
      if (vistos.has(campeon.name)) continue;
      grid.appendChild(crearCampeonTile(campeon, { size: 'mini' }));
    }
    fearless.append(titulo, grid);
    container.appendChild(fearless);
  }
}
