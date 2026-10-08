// La franja (FASE V, V2-C; PLAN.md §V.4): reemplaza a la topbar. Una línea de ≤ 64 px en el escritorio (dos en el
// celular) con quién sos (handle · rol), tu club, cuándo (edad · año · ventana), tu número (el nivel con su banda y
// cuánto se movió en este split; en el amateur, el rango y los LP), la velocidad, el sonido y la barra de cuartos (en
// el celular, abajo y fija: eso es CSS, `estilos/shell.css`).
//
// Se pinta SOLO desde la `vista` (lo que la pantalla ya contó, `ui/core/store.js`; la escribe el director de escena):
// mientras el relato cuenta un split la franja no cambia (regla 4 de §V.3: nada adelanta el resultado). Los botones de
// velocidad, sonido y cuartos están declarados en `index.html` (el shell no se monta desde JS); acá solo se llena
// `#franjaEstado`. Primera versión: el pulido es de V3e.
//
// FASE V (V4): cuando la `vista` cambia, el número (el nivel, o el rango y los LP en el amateur) se mueve desde el valor que la
// franja mostraba hasta el nuevo (`crearDelta` + `moverNumero`, ui/core/delta.js): el `vista` solo cambia cuando el relato ya
// contó lo que lo movió (regla 4), así que el movimiento llega al final de los beats y nunca antes. Con movimiento reducido, en
// INST o en una carrera nueva el número aparece ya en su valor final.
import { cierreDeSplit, deltaDeCierre, numeroDe, textoDeNumeroEn, LABEL_DE_VENTANA } from './core/escena.js';
import { crearDelta, moverNumero } from './core/delta.js';
import { ventanaVisibleDe } from '../core/vistaDeCarrera.js';
import { bandaDeNivel } from '../core/ficha.js';
import { BALANCE } from '../data/balance.js';
import { crearOrgChip } from './components/orgChip.js';
import { marcaRol } from './components/iconos.js';

// Lo que antes decía la topbar (`shell.js`, T2): la ventana REAL de la pausa (`ventanaVisibleDe`, K6a-U). Los nombres son los de
// los carteles de las páginas (`LABEL_DE_VENTANA`, ui/core/escena.js).
const LABEL_VENTANA = LABEL_DE_VENTANA;
// Los nombres de las bandas de nivel, los mismos que la ficha (`components/ficha.js`).
// En el celular, "Temporada regular" es lo que más ancho come del renglón de abajo y es lo primero que se cortaba con "…" (un handle
// de 16 caracteres, un club largo y el ▲ del número lo dejaban en "TEMPORADA REG…"): ahí se dice "Regular", que con
// "Pretemporada", "Playoffs" e "Internacional" no se confunde con nada. Los dos textos van en el nodo; el CSS elige.
const LABEL_VENTANA_CORTA = { regular: 'Regular' };
const LABEL_BANDA = { prospecto: 'Prospecto', titular: 'Competitivo', elite: 'Élite', clase_mundial: 'Clase mundial' };
const LABEL_FASE = { amateur: 'Amateur', profesional: 'Agente libre', retirado: 'Retirado' };
const TAMANO_CHIP_ORG = 20;

function span(clase, texto = null) {
  const el = document.createElement('span');
  el.className = clase;
  if (texto !== null) el.textContent = texto;
  return el;
}

// Los splits del año, como en la topbar de T2: hechos, el actual y los que faltan.
function crearPips(estado) {
  if (!Number.isFinite(estado.player?.splitCount)) return null;
  const n = BALANCE.edad.splitsPorEdad;
  const actual = estado.player.splitCount % n;
  const pips = span('franja-pips');
  pips.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i += 1) {
    const pip = span('franja-pip' + (i < actual ? ' franja-pip--hecho' : '') + (i === actual ? ' franja-pip--actual' : ''));
    pip.title = `Split ${i + 1} de ${n}`;
    pips.appendChild(pip);
  }
  return pips;
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
  const caja = span('franja-nivel');
  caja.dataset.banda = numero.banda ?? '';
  // `movimiento`: de dónde viene el número que la franja mostraba (`antes`) y si se mueve; `null` = aparece ya en su valor final.
  const antes = movimiento?.antes ?? null;
  const animar = movimiento?.animar ?? false;
  if (numero.etiqueta === 'rango') {
    const rango = span('franja-nivel-rango');
    moverNumero(rango, antes, numero.despues, { formato: (n) => textoDeNumeroEn(numero, n), animar });
    caja.append(rango);
  } else {
    const nivel = span('franja-nivel-numero');
    moverNumero(nivel, antes, numero.despues, { animar });
    caja.append(nivel, span('franja-nivel-banda', LABEL_BANDA[numero.banda] ?? ''));
    caja.title = `Nivel ${numero.despues}: ${LABEL_BANDA[numero.banda] ?? ''}`;
  }
  const delta = deltaDeCierre(numero);
  if (delta && delta !== '=') {
    caja.append(span(`franja-delta franja-delta--${delta.startsWith('▲') ? 'sube' : 'baja'}`, delta));
  }
  return caja;
}

// D90 (V3e): terminada la carrera, el número de la franja es el PICO (el nivel más alto que dejó el registro), no el nivel de
// la foto del retiro: tras años sin equipo las curvas bajan y la franja decía '35 prospecto' sobre una tarjeta de 93 'clase
// mundial'. Sin pico registrado (una carrera que nunca llegó al profesional) no hay número que decir.
function crearPico(estado) {
  const nivel = Math.round(estado.career?.registro?.picos?.nivel ?? 0);
  if (!(nivel > 0)) return null;
  const banda = bandaDeNivel(nivel);
  const caja = span('franja-nivel');
  caja.dataset.banda = banda;
  caja.title = `Tu pico: nivel ${nivel}, ${LABEL_BANDA[banda]}`;
  caja.append(span('franja-nivel-pico', 'pico'), span('franja-nivel-numero', String(nivel)), span('franja-nivel-banda', LABEL_BANDA[banda]));
  return caja;
}

// `franja`: el `<header class="franja">`. `estadoEl`: `#franjaEstado`. `etiquetaRol`: la de `data/roles.js` (llega con
// los módulos). `fotoDeLaPagina()`: la foto del split en curso (`app.js`, `pagina.fotoInicio`). `animar()`: si el número se mueve
// ahora (`app.js`: no en INST ni con movimiento reducido); por defecto sí.
export function crearFranja({ franja, estadoEl, etiquetaRol, fotoDeLaPagina, animar = () => true }) {
  // El alto real de la franja (en el celular son dos líneas, o tres a 320 px): lo usan el cuarto y el acompañante
  // pegajoso para no quedar debajo. Con el token fijo de respaldo si esto no corre.
  if (franja && typeof ResizeObserver !== 'undefined') {
    const publicarAlto = () => {
      document.documentElement.style.setProperty('--franja-alto-real', `${Math.round(franja.getBoundingClientRect().height)}px`);
    };
    new ResizeObserver(publicarAlto).observe(franja);
    publicarAlto();
  }

  // De dónde viene el número: la lectura de la `vista` anterior (`crearDelta`). Una carrera nueva, la final o el inicio vuelven a
  // empezar sin "antes". Si el número cambió de naturaleza (rango del amateur → nivel del profesional) tampoco hay desde dónde.
  let delta = null;
  let semilla = null;
  function movimientoDe(estado) {
    if (!estado?.player || estado.terminado) {
      delta = null;
      return null;
    }
    if (!delta || semilla !== estado.seed) {
      delta = crearDelta({ etiqueta: (s) => numeroDe(s).etiqueta, valor: (s) => numeroDe(s).valor });
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
    if (!estadoEl) return;
    const movimiento = movimientoDe(estado);
    if (!estado?.player) {
      estadoEl.replaceChildren();
      return;
    }
    const quien = span('franja-quien');
    quien.append(marcaRol(estado.player.role), span('franja-texto', `${estado.player.name} · ${etiquetaRol(estado.player.role)}`));

    const org = estado.career?.currentOrg ?? null;
    const club = span('franja-org');
    if (org) {
      club.append(crearOrgChip(org, { size: TAMANO_CHIP_ORG }), span('franja-texto', org));
    } else {
      club.append(span('franja-texto', LABEL_FASE[estado.phase] ?? ''));
    }

    const ventana = estado.phase === 'retirado' ? '' : (LABEL_VENTANA[ventanaVisibleDe(estado)] ?? '');
    const cuando = span('franja-cuando');
    cuando.append(span('franja-texto', [
      estado.age != null ? `${estado.age} años` : null,
      estado.calendario?.etiqueta
    ].filter(Boolean).join(' · ')));
    // La ventana va aparte: en el celular es lo único del renglón que se acorta (con "…") si no entra; el nombre del club,
    // la edad y el año no se cortan.
    if (ventana) {
      const ventanaEl = span('franja-texto franja-ventana', ' · ');
      const corta = LABEL_VENTANA_CORTA[ventanaVisibleDe(estado)];
      ventanaEl.append(span(corta ? 'franja-ventana-larga' : '', ventana));
      if (corta) ventanaEl.append(span('franja-ventana-corta', corta));
      cuando.append(ventanaEl);
    }
    const pips = estado.phase === 'retirado' ? null : crearPips(estado);
    if (pips) cuando.append(pips);

    // Dos líneas (en el celular; en el escritorio `.franja-linea` es `display: contents` y todo corre en una): primero lo
    // que dice quién sos, después tu club, el momento y tu número.
    const primera = span('franja-linea franja-linea--1');
    primera.append(quien);
    const segunda = span('franja-linea franja-linea--2');
    segunda.append(...[club, cuando, (estado.terminado ? crearPico(estado) : crearNumero(estado, fotoDeLaPagina?.() ?? null, movimiento))].filter(Boolean));
    estadoEl.replaceChildren(primera, segunda);
  }

  return { pintar };
}
