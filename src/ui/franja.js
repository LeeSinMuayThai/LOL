// La franja (FASE V, V2-C; PLAN.md §V.4; el marco de la vitrina, PLANUI §0.2): una línea arriba con quién sos (el glifo
// de tu rol, tu handle y tu rol), tu club, cuándo (edad, año, ventana y los splits del año), tu número (el nivel con su
// banda y cuánto se movió en este split; en el amateur, el rango y los LP) y, al final, los controles (declarados en
// `index.html`). Abajo, en la barra de los cuartos, la trayectoria mínima: de los 15 al presente, una cinta de clubes.
//
// Se pinta SOLO desde la `vista` (lo que la pantalla ya contó, `ui/core/store.js`; la escribe el director de escena):
// mientras el relato cuenta un split la franja no cambia (regla 4 de §V.3: nada adelanta el resultado).
//
// FASE V (V4): cuando la `vista` cambia, el número se mueve desde el valor que la franja mostraba hasta el nuevo
// (`crearDelta` + `moverNumero`, ui/core/delta.js): llega al final de los beats y nunca antes. Con movimiento reducido, en
// INST o en una carrera nueva el número aparece ya en su valor final.
//
// W1 (PLANUI §0.7): debajo de la franja vive la ficha fija (`fichaFija.js`, la crea y la pinta esta franja con la misma
// `vista`): el nivel con su ▲▼ del año, el arraigo como escalera, el puntaje, la jerarquía, el hype, el cupo, la vitrina y
// la plata. En el profesional el nivel es de la ficha y la franja no lo repite; en el amateur la franja sigue con la soloQ.
import { cierreDeSplit, deltaDeCierre, numeroDe, textoDeNumeroEn, LABEL_DE_VENTANA } from './core/escena.js';
import { crearDelta, moverNumero } from './core/delta.js';
import { trayectoriaDeCarrera } from './core/trayectoria.js';
import { ventanaVisibleDe } from '../core/vistaDeCarrera.js';
import { bandaDeNivel } from '../core/ficha.js';
import { BALANCE } from '../data/balance.js';
import { glifoRol, triangulos } from './fx/iconos.js';
import { crearFichaFija, hayFicha } from './fichaFija.js';

// La ventana REAL de la pausa (`ventanaVisibleDe`, K6a-U), con los nombres de los carteles de las páginas.
const LABEL_VENTANA = LABEL_DE_VENTANA;
// Los nombres de las bandas de nivel, los mismos que la ficha (`components/ficha.js`).
const LABEL_BANDA = { prospecto: 'Prospecto', titular: 'Competitivo', elite: 'Alto nivel', clase_mundial: 'Élite' };
const LABEL_FASE = { amateur: 'Amateur', profesional: 'Agente libre', retirado: 'Retirado' };
// La trayectoria mínima arranca a los 15 (la edad de la primera pieza).
const EDAD_INICIAL = 15;
// Un tramo de la cinta nunca es más angosto que esto (en años): un club de un split igual se lee.
const TRAMO_MINIMO = 0.6;

function nodo(etiqueta, clase, texto = null) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== null) el.textContent = texto;
  return el;
}

// Los splits del año: hechos, el actual y los que faltan.
function crearPips(estado) {
  if (!Number.isFinite(estado.player?.splitCount)) return null;
  const n = BALANCE.edad.splitsPorEdad;
  const actual = estado.player.splitCount % n;
  const pips = nodo('span', 'pips');
  pips.setAttribute('aria-label', `split ${actual + 1} de ${n}`);
  for (let i = 0; i < n; i += 1) pips.appendChild(nodo('i', i <= actual ? 'on' : ''));
  return pips;
}

// El delta en la franja: los triángulos del kit y el número ("▲3" se dibuja, no se escribe).
function crearDeltaNodo(texto) {
  if (!texto || texto === '=') return null;
  const sube = texto.startsWith('▲');
  const cuanto = texto.slice(1);
  const caja = nodo('span', `fr-delta ${sube ? 'sube' : 'baja'}`);
  caja.append(triangulos('baja', sube ? '+' : '-'), document.createTextNode(cuanto));
  caja.setAttribute('aria-label', `${sube ? 'subió' : 'bajó'} ${cuanto}`);
  return caja;
}

// El número del jugador con su delta: el mismo `cierreDeSplit` que la tarjeta de cierre, contra la foto de la página
// (el split en curso). Sin foto (o con una foto `parcial`, al retomar sin marcador) sale sin delta.
function crearNumero(estado, foto, movimiento) {
  let numero = null;
  try {
    numero = cierreDeSplit(foto, estado).numero;
  } catch (error) {
    console.error('No se pudo armar el número de la franja:', error);
    return null;
  }
  const caja = nodo('div', 'fr-numero');
  caja.dataset.banda = numero.banda ?? '';
  const antes = movimiento?.antes ?? null;
  const animar = movimiento?.animar ?? false;
  if (numero.etiqueta === 'rango') {
    const rango = nodo('b', 'fr-rango');
    rango.dataset.campo = 'ranked';
    moverNumero(rango, antes, numero.despues, { formato: (n) => textoDeNumeroEn(numero, n), animar });
    caja.append(nodo('span', 'fr-rotulo', 'SoloQ'), rango);
  } else {
    const valor = nodo('b', 'fr-num');
    valor.dataset.campo = 'nivel';
    moverNumero(valor, antes, numero.despues, { animar });
    caja.append(nodo('span', 'fr-rotulo', 'Nivel'), valor);
    caja.title = `Nivel ${numero.despues}: ${LABEL_BANDA[numero.banda] ?? ''}`;
  }
  const delta = crearDeltaNodo(deltaDeCierre(numero));
  if (delta) caja.append(delta);
  if (numero.etiqueta !== 'rango' && LABEL_BANDA[numero.banda]) caja.append(nodo('span', 'fr-banda', LABEL_BANDA[numero.banda]));
  return caja;
}

// D90 (V3e): terminada la carrera, el número de la franja es el PICO (el nivel más alto que dejó el registro). Sin pico
// registrado (una carrera que nunca llegó al profesional) no hay número que decir.
function crearPico(estado) {
  const nivel = Math.round(estado.career?.registro?.picos?.nivel ?? 0);
  if (!(nivel > 0)) return null;
  const banda = bandaDeNivel(nivel);
  const caja = nodo('div', 'fr-numero');
  caja.dataset.banda = banda;
  caja.title = `Tu pico: nivel ${nivel}, ${LABEL_BANDA[banda]}`;
  caja.append(nodo('span', 'fr-rotulo', 'Pico'), nodo('b', 'fr-num', String(nivel)), nodo('span', 'fr-banda', LABEL_BANDA[banda]));
  return caja;
}

// La trayectoria mínima: los tramos de club del registro (`trayectoriaDeCarrera`, la misma cuenta que la pestaña
// Carrera), con el amateur delante (de los 15 al primer club). Puro sobre la `vista`.
export function tramosDeLaTrayectoria(estado) {
  const anioActual = estado.calendario?.anio ?? null;
  const edad = estado.age ?? null;
  if (!Number.isFinite(anioActual) || !Number.isFinite(edad)) return null;
  const inicio = anioActual - (edad - EDAD_INICIAL);
  let tramos = [];
  try {
    tramos = trayectoriaDeCarrera(estado).tramos ?? [];
  } catch (error) {
    console.error('No se pudo armar la trayectoria de la barra:', error);
  }
  const segs = [];
  const primero = tramos[0]?.desde ?? anioActual;
  if (primero > inicio) segs.push({ org: 'Amateur', desde: inicio, hasta: Math.min(primero, anioActual), amateur: true });
  for (const t of tramos) {
    if (t.desde > anioActual + 1) break;
    segs.push({ org: t.org, desde: t.desde, hasta: Math.min(t.hasta ?? anioActual + 1, anioActual + 1), activa: t.activa });
  }
  return { segs, anioActual, edad };
}

function pintarTrayectoria(el, estado) {
  if (!el) return;
  const datos = estado?.player ? tramosDeLaTrayectoria(estado) : null;
  if (!datos) {
    el.hidden = true;
    el.replaceChildren();
    return;
  }
  const { segs, anioActual, edad } = datos;
  const cinta = nodo('div', 'tr-cinta');
  const lista = segs.length > 0 ? segs : [{ org: 'Amateur', desde: anioActual, hasta: anioActual + 1, amateur: true }];
  lista.forEach((s, i) => {
    const seg = nodo('span', `tr-seg${i === lista.length - 1 ? ' actual' : ''}${s.amateur ? ' amateur' : ''}`);
    seg.style.flexGrow = String(Math.max(TRAMO_MINIMO, s.hasta - s.desde));
    seg.title = `${s.org} · ${Math.floor(s.desde)}–${Math.floor(s.hasta)}`;
    seg.append(nodo('em', null, s.org));
    cinta.append(seg);
  });
  el.setAttribute('aria-label', `Tu carrera desde los ${EDAD_INICIAL}: ${lista.map((s) => s.org).join(', ')}`);
  el.replaceChildren(nodo('span', 'tr-edad', String(EDAD_INICIAL)), cinta, nodo('span', 'tr-hoy', `${edad} · ${anioActual}`));
  el.hidden = false;
}

// `franja`: el `<header class="franja">`. `estadoEl`: `#franjaEstado`. `trayectoriaEl`: `#trayectoria` (en la barra de
// los cuartos). `etiquetaRol`: la de `data/roles.js`. `fotoDeLaPagina()`: la foto del split en curso (`app.js`,
// `pagina.fotoInicio`). `animar()`: si el número se mueve ahora (`app.js`: no en INST ni con movimiento reducido).
export function crearFranja({ franja, estadoEl, trayectoriaEl = null, etiquetaRol, fotoDeLaPagina, animar = () => true }) {
  // El alto real de la franja: lo usan el cuarto y los momentos para no quedar debajo. Con el token de respaldo.
  if (franja && typeof ResizeObserver !== 'undefined') {
    const publicarAlto = () => {
      document.documentElement.style.setProperty('--franja-alto-real', `${Math.round(franja.getBoundingClientRect().height)}px`);
    };
    new ResizeObserver(publicarAlto).observe(franja);
    publicarAlto();
  }

  // W1 (PLANUI §0.7): la ficha fija, debajo de la franja y en todas las anchuras (`fichaFija.js`). Mientras se ve, el nivel
  // es suyo (con el ▲▼ del año) y la franja no lo repite; en el amateur la franja sigue diciendo la soloQ.
  let ficha = null;
  if (franja && typeof document !== 'undefined') {
    const seccion = document.createElement('section');
    seccion.className = 'ficha-fija';
    seccion.id = 'fichaFija';
    seccion.setAttribute('aria-label', 'Tu ficha');
    seccion.hidden = true;
    franja.insertAdjacentElement('afterend', seccion);
    ficha = crearFichaFija(seccion);
  }

  // De dónde viene el número: la lectura de la `vista` anterior (`crearDelta`). Una carrera nueva, la final o el inicio
  // vuelven a empezar sin "antes". Si el número cambió de naturaleza (rango → nivel) tampoco hay desde dónde.
  let delta = null;
  let semilla = null;
  function movimientoDe(estado) {
    if (!estado?.player || estado.terminado) {
      delta = null;
      return null;
    }
    if (!delta || semilla !== estado.seed) {
      delta = crearDelta({ etiqueta: (vista) => numeroDe(vista).etiqueta, valor: (vista) => numeroDe(vista).valor });
      semilla = estado.seed;
    }
    try {
      const medida = delta.medir(estado);
      return medida.etiqueta[0] === medida.etiqueta[1] ? { antes: medida.valor[0], animar: animar() } : null;
    } catch (error) {
      console.error('No se pudo medir el número de la franja:', error);
      delta = null;
      return null;
    }
  }

  function pintar(estado) {
    pintarTrayectoria(trayectoriaEl, estado);
    try {
      // La ficha se mueve en todas las velocidades (W1-H: "que se sienta el avance" también en RÁPIDO); `animar()` falso
      // es RÁPIDO o movimiento reducido, y del reducido se ocupan `moverNumero` y el kit.
      ficha?.pintar(estado, { rapido: !animar() });
    } catch (error) {
      console.error('No se pudo pintar la ficha:', error);
    }
    if (!estadoEl) return;
    const movimiento = movimientoDe(estado);
    if (!estado?.player) {
      estadoEl.replaceChildren();
      return;
    }
    const quien = nodo('div', 'fr-quien');
    quien.append(glifoRol(estado.player.role), nodo('b', 'fr-handle', estado.player.name), nodo('span', 'fr-rol', etiquetaRol(estado.player.role)));

    const org = estado.career?.currentOrg ?? null;
    const club = nodo('div', 'fr-club');
    club.append(nodo('span', org ? 'chip-org' : 'chip-org sin-org', org ?? LABEL_FASE[estado.phase] ?? '—'));
    if (org) club.title = org;

    const cuando = nodo('div', 'fr-cuando');
    if (estado.age != null) cuando.append(nodo('span', null, `${estado.age} años`));
    if (estado.calendario?.etiqueta) cuando.append(nodo('span', 'fr-anio', estado.calendario.etiqueta));
    const ventana = estado.phase === 'retirado' ? '' : (LABEL_VENTANA[ventanaVisibleDe(estado)] ?? '');
    if (ventana) cuando.append(nodo('span', 'fr-ventana', ventana));
    const pips = estado.phase === 'retirado' ? null : crearPips(estado);
    if (pips) cuando.append(pips);

    // I1c (D161): el rango del amateur es de la ficha (lo primero que dice); la franja no lo repite
    const numeroEnLaFicha = ficha && hayFicha(estado) && (estado.phase === 'profesional' || (estado.phase === 'amateur' && Boolean(estado.player?.ranked?.tier)));
    const numero = estado.terminado ? crearPico(estado) : numeroEnLaFicha ? null : crearNumero(estado, fotoDeLaPagina?.() ?? null, movimiento);
    estadoEl.replaceChildren(...[quien, club, cuando, numero].filter(Boolean));
  }

  return { pintar };
}
