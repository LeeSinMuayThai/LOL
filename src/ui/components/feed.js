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
import { crearTarjetaResultado, crearTarjetaResultadoSerie } from './serie.js';
import { crearTarjetaMundial } from './mundial.js';
import { textoDeProbabilidadJugada } from '../../core/previaDePartido.js';
import { reconciliar, reemplazarEnElLugar, olvidarContenedor } from '../core/reconciliar.js';
import { formaBeat } from '../../core/log.js';
import { crearTarjetaCierre, crearLineaSplitAnterior, crearCartelDePagina } from './cierre.js';
import { moverNumero, leerSoloElFinal } from '../core/delta.js';

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
  // K5-A: el cierre de tu Mundial es una tarjeta (el Swiss resumido y el bracket con tu camino).
  if (entry.type === 'internacional' && entry.mundial) {
    return crearTarjetaMundial(entry);
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

  // K4-C: el evento que resolvió tu perfil, en una línea de crónica — el título, lo que planteaba, qué tomaste
  // (como quién) y qué pasó. Un solo ítem del feed: el texto del evento no se pierde, pasa a ser la historia.
  if (entry.cronica) {
    item.classList.add('log-item--cronica');
    const titulo = document.createElement('div');
    titulo.className = 'log-titulo';
    titulo.textContent = entry.titulo ?? '';
    item.appendChild(titulo);
    if (entry.descripcion) {
      const planteo = document.createElement('div');
      planteo.className = 'log-cronica-planteo';
      planteo.textContent = entry.descripcion;
      item.appendChild(planteo);
    }
    const decision = document.createElement('div');
    decision.className = 'log-cronica-decision';
    const como = document.createElement('span');
    como.className = 'log-cronica-perfil';
    como.textContent = `Como ${String(entry.perfil ?? '').toLowerCase()}: `;
    decision.append(como, `${entry.opcion}. ${entry.cuerpo}`);
    item.appendChild(decision);
    if (entry.efectos) {
      const efectos = document.createElement('div');
      efectos.className = 'log-efectos';
      efectos.textContent = entry.efectos;
      item.appendChild(efectos);
    }
    return item;
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

// K4c-F: las líneas `adjunto` (core/log.js) van adentro del beat anterior, legibles, una por renglón — no compiten
// por un beat del reproductor pero siguen a la vista en el feed.
export function crearAdjuntos(entradas) {
  const bloque = document.createElement('div');
  bloque.className = 'log-adjuntos';
  for (const entrada of entradas) {
    const linea = document.createElement('div');
    linea.className = 'log-adjunto';
    linea.dataset.type = entrada.type ?? '';
    linea.textContent = entrada.message ?? entrada.cuerpo ?? entrada.titulo ?? '';
    bloque.appendChild(linea);
  }
  return bloque;
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
  if (beat.adjuntos.length > 0) {
    nodo.appendChild(crearAdjuntos(beat.adjuntos));
  }
  if (beat.tecnicos.length > 0) {
    nodo.appendChild(crearTiraTecnica(beat.tecnicos));
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
  for (const linea of nodo.querySelectorAll('.log-efectos')) {
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
// FASE V (V4): `cierreDelAnio` es el cierre (`cierreDeSplit`, con `anio`) de una parada que ES el cierre de año (la de `edadCierre`,
// que frena el motor): se pinta como el cartel "Cierre de 2031" de un año sin parada, arriba de todo, aunque la página no tenga beats.
export function renderParadaAntes(contenedor, state, { desde = 0, cierreDelAnio = null } = {}) {
  const inicio = Math.max(0, Math.min(desde, state.logs.length));
  const narrativos = agruparBeats(state.logs.slice(inicio), inicio).filter((beat) => beat.narrativa);
  contenedor.replaceChildren();
  const cartelDelAnio = cierreDelAnio?.anio ? crearTarjetaCierre(cierreDelAnio) : null;
  if (narrativos.length === 0) {
    if (cartelDelAnio) {
      contenedor.append(cartelDelAnio);
    }
    contenedor.hidden = !cartelDelAnio;
    return;
  }
  const ultimo = narrativos[narrativos.length - 1].narrativa;

  const rotulo = document.createElement('span');
  rotulo.className = 'parada-antes-rotulo';
  rotulo.textContent = 'Lo último que pasó';
  const linea = document.createElement('p');
  linea.className = 'parada-antes-ultimo';
  linea.textContent = String(ultimo.message ?? '').replace(/\s+/g, ' ').trim();

  const pagina = document.createElement('details');
  pagina.className = 'parada-antes-pagina';
  const resumen = document.createElement('summary');
  resumen.textContent = `ver la página (${narrativos.length})`;
  const beats = document.createElement('div');
  beats.className = 'parada-antes-beats';
  pagina.append(resumen, beats);
  // El desplegable se pinta al abrirlo: una parada no paga los nodos de una página que casi nunca se abre. Es la misma
  // `renderPagina` del relato, hasta el final de lo contado.
  pagina.addEventListener('toggle', () => {
    if (pagina.open) {
      olvidarContenedor(beats);
      beats.replaceChildren();
      renderPagina(beats, state, { desde: inicio });
    }
  });

  contenedor.append(...(cartelDelAnio ? [cartelDelAnio] : []), rotulo, linea, pagina);
  contenedor.hidden = false;
}
