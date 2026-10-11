import { encabezadoDeResultado } from '../../core/temporada.js';
import { etiquetaDeRonda } from '../../core/serie.js';
import { tableroDeSerie } from '../../core/vistaDeCarrera.js';
import { etiquetaDeFuerza } from '../formatoUi.js';
import { crearOrgChip } from './orgChip.js';
import { keyDdragonDeCampeon } from './campeonTile.js';
import { quemar, victoriaDerrota } from '../fx/ceremonia.js';
import { urlCarga } from '../fx/arte.js';
import { cinta } from '../fx/transmision.js';

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
// K6a-M: el encabezado sale del log de la fecha (`encabezadoDeResultado`), no de `calendario[indice - 1]` del estado
// de cuando se pinta: la temporada ya siguió en silencio y esa era otra fecha (la previa contra RED Canids terminaba en
// "GANARON vs PAIN GAMING").
export function crearTarjetaResultado(entry, state) {
  const fecha = encabezadoDeResultado(entry);

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

  const { gano, posicion, equipos, racha } = fecha;
  item.dataset.acento = gano ? 'up' : 'down';

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
  fuerzaEl.textContent = etiquetaDeFuerza(fecha.fuerzaRival, fecha.fuerzaPropia);

  cabecera.append(marcador, rivalEl, fuerzaEl);
  item.appendChild(cabecera);
  item.appendChild(victoriaDerrota({ gano, sub: fecha.rival ?? '' }).nodo);

  const cuerpo = document.createElement('div');
  cuerpo.textContent = entry.message;
  item.appendChild(cuerpo);

  const pie = document.createElement('div');
  pie.className = 'resultado-pie';
  const rachaAbs = Math.abs(racha);
  const rachaTxt = rachaAbs > 1 ? `Racha de ${rachaAbs} ${gano ? 'triunfos' : 'derrotas'}` : null;
  pie.textContent = [`${posicion}º de ${equipos}`, rachaTxt].filter(Boolean).join(' · ');
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

// D95 (V3b): lo que cada contenedor ya mostró (el marcador desde el que arranca el `countUp`) y si su desplegable está
// abierto. Era una variable de módulo: con el tablero pintado en dos contenedores (el escenario y el acompañante) cada uno
// arrancaba del valor que había dejado el otro. Por contenedor, el escenario anima desde SU marcador y el acompañante (que
// se rehace entero en cada pintada, sin memoria) no anima.
const memoria = new WeakMap();
// Una sola celebración por mapa nuevo, aunque el tablero se repinte en el escenario y en el acompañante.
let celebracionVista = '';
function memoriaDe(container) {
  let m = memoria.get(container);
  if (!m) {
    m = { previo: { a: 0, b: 0 }, abierto: false, clave: null };
    memoria.set(container, m);
  }
  return m;
}

function claveDeMapas(state) {
  const serie = state?.serie;
  const mapas = serie?.mapas ?? [];
  const ultimo = mapas[mapas.length - 1];
  return `${serie?.rival?.org ?? ''}|${mapas.length}|${ultimo?.mapa ?? ''}|${ultimo?.resultado ?? ''}|${ultimo?.campeon ?? ''}`;
}

function retratoDeCarga(nombre) {
  const carta = document.createElement('figure');
  carta.className = 'pt-retrato';
  const key = keyDdragonDeCampeon(nombre);
  if (key) {
    const img = document.createElement('img');
    img.className = 'pt-retrato-img';
    img.alt = '';
    img.decoding = 'async';
    img.src = urlCarga(key);
    img.addEventListener('error', () => { img.remove(); }, { once: true });
    carta.appendChild(img);
  }
  const cap = document.createElement('figcaption');
  cap.className = 'pt-retrato-nombre';
  cap.textContent = nombre;
  carta.appendChild(cap);
  return carta;
}

function dejarQuemado(carta, animarQuemado) {
  const anims = quemar(carta) ?? [];
  if (!animarQuemado) {
    for (const a of anims) {
      try { a.finish(); } catch { /* el estado final ya es la clase */ }
    }
  }
}

function paredFearless(state, { animarNombre = null } = {}) {
  const quemados = state.serie?.quemados ?? [];
  const pool = state.player?.championPool ?? [];
  if (quemados.length === 0 && pool.length === 0) return null;
  const fearless = document.createElement('div');
  fearless.className = 'serie-fearless pt-pared';
  const grid = document.createElement('div');
  grid.className = 'serie-fearless-grid pt-pared-grid';
  const vistos = new Set();
  for (const nombre of quemados) {
    vistos.add(nombre);
    const carta = retratoDeCarga(nombre);
    grid.appendChild(carta);
    dejarQuemado(carta, nombre === animarNombre);
  }
  for (const campeon of pool) {
    if (vistos.has(campeon.name)) continue;
    grid.appendChild(retratoDeCarga(campeon.name));
  }
  fearless.append(texto('serie-fearless-titulo', 'Fearless', 'div'), grid);
  return fearless;
}

// El "Camino" recuerda si lo abriste solo dentro del mismo partido (la serie con ese rival en esa ronda; el cruce del Swiss
// con ese rival): en uno nuevo arranca cerrado. Sin esto, lo abierto una vez quedaba abierto para siempre.
function cerrarSiCambioElPartido(m, clave) {
  if (m.clave !== clave) {
    m.clave = clave;
    m.abierto = false;
  }
}

// K5-A: una serie del Mundial (`ronda: 'internacional'` con su `etapa`) muestra el bracket del Mundial, no el doméstico.
function textoDePaso(ronda, { actual, superada }) {
  const nombre = ETIQUETAS_BRACKET[ronda] ?? etiquetaDeRonda(ronda);
  if (actual) return `${nombre} · ahora`;
  if (superada) return `${nombre} · pasaste`;
  return nombre;
}

// El bracket es la cinta de la transmisión (op=linea), no una fila de pastillas.
export function crearBarraBracket(rondaActual, { esPostSerie = false, gano = false, etapa = null } = {}) {
  const delMundial = rondaActual === 'internacional' && Boolean(etapa);
  const esIntl = rondaActual === 'internacional' && !delMundial;
  const indiceActual = RONDAS_BRACKET.indexOf(delMundial ? etapa : rondaActual);
  const items = [];
  if (delMundial) items.push({ texto: 'MUNDIAL · pasaste' });
  RONDAS_BRACKET.forEach((ronda, indice) => {
    let superada = false;
    let actual = false;
    if (esIntl) {
      superada = true;
    } else if (indiceActual >= 0) {
      if (indice < indiceActual) superada = true;
      else if (indice === indiceActual) {
        if (esPostSerie) superada = gano;
        else actual = true;
      }
    }
    items.push({ texto: textoDePaso(ronda, { actual, superada }) });
  });
  if (esIntl) {
    items.push({ texto: textoDePaso('internacional', { actual: !esPostSerie, superada: esPostSerie && gano }) });
  }
  const nodo = cinta({ rotulo: 'Bracket', items });
  nodo.classList.add('serie-bracket');
  return nodo;
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
    etapa: entry.etapa ?? state?.serie?.etapa ?? null,
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
    mapas.forEach((m, i) => {
      const fila = document.createElement('div');
      const ganoMapa = m.resultado === 'W';
      fila.className = 'resultado-mapa-fila';
      if (i === mapas.length - 1) {
        fila.appendChild(victoriaDerrota({ gano: ganoMapa, sub: m.campeon ?? '' }).nodo);
      } else {
        const tag = document.createElement('span');
        tag.className = 'resultado-mapa-tag ' + (ganoMapa ? 'resultado-mapa-tag--ganado' : 'resultado-mapa-tag--perdido');
        tag.textContent = ganoMapa ? 'Victoria' : 'Derrota';
        const camp = document.createElement('span');
        camp.className = 'resultado-mapa-campeon';
        camp.textContent = m.campeon ?? '';
        fila.append(tag, camp);
      }
      if (m.cierre) {
        const cierre = document.createElement('span');
        cierre.className = 'resultado-mapa-cierre';
        cierre.textContent = m.cierre;
        fila.appendChild(cierre);
      }
      camino.appendChild(fila);
    });
    item.appendChild(camino);
  }

  return item;
}

// --- El tablero de la serie (FASE V, V3b) ------------------------------------------------------------------------------
//
// Dos formas del mismo tablero, las dos desde `renderSerieContexto`:
//  - la del ESCENARIO (`#serieContexto`, la que pinta `app.js` desde la `vista`): UNA línea —rival, marcador, mapa n de N y, si
//    hay Fearless, cuántos campeones te quedan— y el bracket, el camino, los cierres y el Fearless entero detrás de un
//    desplegable ("lo demás, a un toque"). Debajo de la decisión, nunca antes del título (regla 2 de §V.3).
//  - la COMPLETA (`{ completo: true }`, la del acompañante desde 1180 px): el tablero entero, abierto. Ahí el desplegable del
//    escenario no repite la línea (`estilos/serie.css`), para que nada aparezca dos veces.
// Las dos leen el mismo `state` (la `vista`: lo que el relato ya contó) y nada del motor.

function campeonesLibres(serie, state) {
  const quemados = new Set(serie.quemados ?? []);
  return (state.player.championPool ?? []).filter((campeon) => !quemados.has(campeon.name)).length;
}

function texto(clase, contenido, etiqueta = 'span') {
  const el = document.createElement(etiqueta);
  el.className = clase;
  el.textContent = contenido;
  return el;
}

// Las partes del tablero de una serie. `conMarcador`: el marcador grande (el del tablero completo); en el escenario va en la línea.
function partesDeLaSerie(state, { conMarcador, esPostSerie, ganoSerie, marcador = null, celebrar = -1 }) {
  const { serie } = state;
  const partes = [];
  partes.push(crearBarraBracket(serie.ronda, { esPostSerie, gano: ganoSerie, etapa: serie.etapa ?? null }));

  const propia = state.career.currentOrg ?? state.player.name;
  const rivalNombre = serie.rival?.org ?? 'Rival';
  const slots = Math.max(serie.formato || 0, serie.mapas.length, 1);

  if (conMarcador) {
    const score = document.createElement('div');
    score.className = 'serie-scoreboard';

    const ladoPropio = document.createElement('div');
    ladoPropio.className = 'serie-lado';
    ladoPropio.append(crearOrgChip(propia, { size: 36 }), texto('serie-lado-nombre', propia));

    const nums = document.createElement('div');
    nums.className = 'serie-score';
    const a = document.createElement('span');
    const b = document.createElement('span');
    a.textContent = String(serie.marcador?.[0] ?? 0);
    b.textContent = String(serie.marcador?.[1] ?? 0);
    nums.append(a, texto('serie-score-sep', '–'), b);

    const ladoRival = document.createElement('div');
    ladoRival.className = 'serie-lado serie-lado--rival';
    ladoRival.append(texto('serie-lado-nombre', rivalNombre), crearOrgChip(rivalNombre, { size: 36 }));

    score.append(ladoPropio, nums, ladoRival);
    partes.push(score);
  }

  const camino = document.createElement('div');
  camino.className = 'serie-camino';
  for (let i = 0; i < slots; i += 1) {
    const mapa = serie.mapas[i];
    const paso = document.createElement('div');
    const ganoMapa = mapa?.resultado === 'W';
    paso.className = 'serie-mapa' + (mapa ? ` serie-mapa--${ganoMapa ? 'ganado' : 'perdido'}` : '');
    if (mapa && i === celebrar) {
      paso.appendChild(victoriaDerrota({ gano: ganoMapa, sub: mapa.campeon ?? '' }).nodo);
    } else {
      paso.append(
        texto('serie-mapa-n', `M${i + 1}`),
        texto('serie-mapa-c', mapa ? `${mapa.campeon} · ${ganoMapa ? 'Victoria' : 'Derrota'}` : '—')
      );
    }
    if (mapa?.cierre) paso.title = mapa.cierre;
    camino.appendChild(paso);
  }
  partes.push(camino);

  if (esPostSerie && serie.mapas.length > 0) {
    const cierres = document.createElement('div');
    cierres.className = 'serie-cierres-lista';
    for (const m of serie.mapas) {
      const fila = document.createElement('div');
      fila.className = `serie-cierre-item serie-cierre-item--${m.resultado === 'W' ? 'ganado' : 'perdido'}`;
      fila.append(
        texto('serie-cierre-tag', `M${m.mapa} · ${m.resultado === 'W' ? 'Victoria' : 'Derrota'} · ${m.campeon}`),
        texto('serie-cierre-texto', m.cierre ? ` — ${m.cierre}` : '')
      );
      cierres.appendChild(fila);
    }
    partes.push(cierres);
  }

  const fearless = paredFearless(state);
  if (fearless) partes.push(fearless);
  return partes;
}

// La línea del escenario: rival, marcador, mapa n de N, Fearless. Nada que el relato no haya contado (sale de la `vista`).
function lineaDeLaSerie(state, { esPostSerie }) {
  const { serie } = state;
  const propia = state.career.currentOrg ?? state.player.name;
  const rivalNombre = serie.rival?.org ?? 'Rival';
  const slots = Math.max(serie.formato || 0, serie.mapas.length, 1);

  const duelo = texto('serie-linea-duelo', '');
  const a = document.createElement('span');
  const b = document.createElement('span');
  a.textContent = String(serie.marcador?.[0] ?? 0);
  b.textContent = String(serie.marcador?.[1] ?? 0);
  const nums = texto('serie-linea-score', '');
  nums.append(a, texto('serie-score-sep', '–'), b);
  duelo.append(
    crearOrgChip(propia, { size: 20 }), nums,
    crearOrgChip(rivalNombre, { size: 20 }), texto('serie-linea-rival', rivalNombre)
  );

  const datos = [];
  datos.push(texto('serie-linea-dato', esPostSerie ? 'Serie cerrada' : `Mapa ${Math.min(serie.mapas.length + 1, slots)} de ${slots}`));
  const hayFearless = (serie.quemados ?? []).length > 0 || (state.player.championPool ?? []).length > 0;
  if (hayFearless && !esPostSerie) {
    const libres = campeonesLibres(serie, state);
    datos.push(texto(
      'serie-linea-dato',
      libres === 0 ? 'Fearless · no te queda ninguno' : `Fearless · te ${libres === 1 ? 'queda' : 'quedan'} ${libres}`
    ));
  }
  return [duelo, ...datos];
}

// El desplegable del escenario: la línea es el `summary`; lo demás, detrás. Recuerda si lo abriste (la `vista` se repinta en
// cada beat: sin esto se cerraba solo, como "Más datos" de la ficha, D95).
function desplegable(container, memoria, linea, cuerpo) {
  const detalles = document.createElement('details');
  detalles.className = 'serie-resumen';
  detalles.open = memoria.abierto;
  detalles.addEventListener('toggle', () => { memoria.abierto = detalles.open; });
  const resumen = document.createElement('summary');
  resumen.className = 'serie-linea';
  resumen.append(...linea, texto('serie-linea-mas', 'Camino'));
  const detalle = document.createElement('div');
  detalle.className = 'serie-detalle';
  detalle.append(...cuerpo);
  detalles.append(resumen, detalle);
  container.replaceChildren(detalles);
}

// K6a-U: el Swiss del Mundial no es una serie (no hay mapas ni Fearless): es una tabla de 16 donde jugás hasta tres
// victorias o tres derrotas. El panel dice eso, con tu récord y las rondas que llevás, en vez de dejar la final doméstica.
function partesDelSwiss(state, { conResumen }) {
  const t = state.internacional;
  const partes = [];
  partes.push(cinta({
    rotulo: 'Mundial',
    items: [
      { texto: 'SWISS · ahora' },
      { texto: 'CUARTOS' },
      { texto: 'SEMI' },
      { texto: 'FINAL' }
    ]
  }));

  const record = t.swiss.record[t.jugador] ?? { v: 0, d: 0 };
  const propia = state.career.currentOrg ?? state.player.name;
  if (conResumen) {
    const resumen = document.createElement('div');
    resumen.className = 'serie-swiss-resumen';
    resumen.append(crearOrgChip(propia, { size: 36 }), texto('serie-lado-nombre', `${propia} · récord ${record.v}-${record.d} en el Swiss`));
    partes.push(resumen);
  }

  // Tus rondas hasta acá, con el rival de cada una, y la que se está por jugar.
  const camino = document.createElement('div');
  camino.className = 'serie-camino pt-marcas';
  const propias = t.swiss.rondas.map((ronda) => ronda.find((p) => p.propio)).filter(Boolean);
  const marcas = document.createElement('div');
  marcas.className = 'pt-marcas-fila';
  marcas.setAttribute('aria-label', 'Récord del Swiss, cinco partidos como máximo');
  for (let i = 0; i < 5; i += 1) {
    const pip = document.createElement('i');
    const jugado = propias[i];
    const gano = jugado ? jugado.ganador === t.jugador : null;
    pip.className = 'pt-marca' + (jugado ? ` pt-marca--${gano ? 'w' : 'l'}` : '');
    pip.title = jugado ? (gano ? 'Victoria' : 'Derrota') : 'Por jugar';
    marcas.appendChild(pip);
  }
  camino.appendChild(marcas);
  propias.forEach((partido, i) => {
    const gano = partido.ganador === t.jugador;
    const rival = partido.a === t.jugador ? partido.b : partido.a;
    const paso = document.createElement('div');
    paso.className = `serie-mapa serie-mapa--${gano ? 'ganado' : 'perdido'}`;
    paso.append(texto('serie-mapa-n', `R${i + 1}`), texto('serie-mapa-c', `${gano ? 'G' : 'P'} · ${rival}`));
    camino.appendChild(paso);
  });
  const pendiente = document.createElement('div');
  pendiente.className = 'serie-mapa';
  pendiente.append(
    texto('serie-mapa-n', `R${propias.length + 1}`),
    texto('serie-mapa-c', t.partidoEnCurso ? `vs ${t.partidoEnCurso.rival}` : '—')
  );
  camino.appendChild(pendiente);
  partes.push(camino);
  return { partes, record, propia, ronda: propias.length + 1 };
}

function renderSwissDelMundial(container, state, { completo }) {
  const m = memoriaDe(container);
  container.hidden = false;
  m.previo = { a: 0, b: 0 };
  cerrarSiCambioElPartido(m, `swiss|${state.internacional?.partidoEnCurso?.rival ?? ''}`);
  if (completo) {
    container.replaceChildren(...partesDelSwiss(state, { conResumen: true }).partes);
    return;
  }
  const { partes, record, propia, ronda } = partesDelSwiss(state, { conResumen: false });
  const rival = state.internacional.partidoEnCurso?.rival;
  const duelo = texto('serie-linea-duelo', '');
  duelo.append(crearOrgChip(propia, { size: 20 }), texto('serie-linea-rival', 'Swiss del Mundial'));
  desplegable(container, m, [
    duelo,
    texto('serie-linea-dato', `Récord ${record.v}-${record.d}`),
    texto('serie-linea-dato', rival ? `Ronda ${ronda} vs ${rival}` : `Ronda ${ronda}`)
  ], partes);
}

// `completo`: el tablero entero y abierto (el del acompañante). Sin él, la línea del escenario con el resto detrás de un
// desplegable. `container` es el nodo que se repinta: el estado por contenedor (marcador anterior, desplegable abierto) vive
// en un `WeakMap` (D95).
export function renderSerieContexto(container, state, { completo = false } = {}) {
  const { serie } = state;
  const ultimoLog = state?.logs?.[state.logs.length - 1];
  const esPostSerie = Boolean(serie?.postSerie) || Boolean(ultimoLog?.postSerie);
  const m = memoriaDe(container);

  // K6a-U: qué muestra el panel lo decide `tableroDeSerie` (core/vistaDeCarrera.js): la serie, el Swiss del Mundial o nada.
  const tablero = tableroDeSerie(state);
  if (tablero === 'swiss') {
    renderSwissDelMundial(container, state, { completo });
    return;
  }
  if (tablero === null) {
    container.hidden = true;
    m.previo = { a: 0, b: 0 };
    m.clave = null;
    return;
  }

  container.hidden = false;
  cerrarSiCambioElPartido(m, `serie|${serie.rival?.org ?? ''}|${serie.ronda ?? ''}|${serie.etapa ?? ''}`);
  const ganoSerie = (serie.marcador?.[0] ?? 0) > (serie.marcador?.[1] ?? 0);
  m.previo = { a: serie.marcador?.[0] ?? 0, b: serie.marcador?.[1] ?? 0 };
  const claveMapas = claveDeMapas(state);
  const celebrar = (serie.mapas?.length ?? 0) > 0 && celebracionVista !== claveMapas
    ? serie.mapas.length - 1
    : -1;
  if (celebrar >= 0) celebracionVista = claveMapas;

  if (completo) {
    container.replaceChildren(...partesDeLaSerie(state, { conMarcador: true, esPostSerie, ganoSerie, celebrar }));
    return;
  }
  desplegable(
    container, m,
    lineaDeLaSerie(state, { esPostSerie }),
    partesDeLaSerie(state, { conMarcador: false, esPostSerie, ganoSerie, celebrar })
  );
}
