// La franja (FASE V, V2-C; PLAN.md §V.4): reemplaza a la topbar. Una línea de ≤ 64 px en el escritorio (dos en el
// celular) con quién sos (handle · rol), tu club, cuándo (edad · año · ventana), tu número (el nivel con su banda y
// cuánto se movió en este split; en el amateur, el rango y los LP), la velocidad, el sonido y la barra de cuartos (en
// el celular, abajo y fija: eso es CSS, `estilos/shell.css`).
//
// Se pinta SOLO desde la `vista` (lo que la pantalla ya contó, `ui/core/store.js`; la escribe el director de escena):
// mientras el relato cuenta un split la franja no cambia (regla 4 de §V.3: nada adelanta el resultado). Los botones de
// velocidad, sonido y cuartos están declarados en `index.html` (el shell no se monta desde JS); acá solo se llena
// `#franjaEstado`. Primera versión: el pulido es de V3e.
import { cierreDeSplit, deltaDeCierre, textoDeNumero } from './core/escena.js';
import { ventanaVisibleDe } from '../core/vistaDeCarrera.js';
import { BALANCE } from '../data/balance.js';
import { crearOrgChip } from './components/orgChip.js';
import { marcaRol } from './components/iconos.js';

// Lo que antes decía la topbar (`shell.js`, T2): la ventana REAL de la pausa (`ventanaVisibleDe`, K6a-U).
const LABEL_VENTANA = {
  pretemporada: 'Pretemporada',
  regular: 'Temporada regular',
  playoffs: 'Playoffs',
  internacional: 'Internacional',
  offseason: 'Offseason'
};
// Los nombres de las bandas de nivel, los mismos que la ficha (`components/ficha.js`).
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
function crearNumero(estado, foto) {
  let numero = null;
  try {
    numero = cierreDeSplit(foto, estado).numero;
  } catch (error) {
    console.error('No se pudo armar el número de la franja:', error);
    return null;
  }
  const caja = span('franja-nivel');
  caja.dataset.banda = numero.banda ?? '';
  if (numero.etiqueta === 'rango') {
    caja.append(span('franja-nivel-rango', textoDeNumero(numero)));
  } else {
    caja.append(span('franja-nivel-numero', String(numero.despues)), span('franja-nivel-banda', LABEL_BANDA[numero.banda] ?? ''));
    caja.title = `Nivel ${numero.despues}: ${LABEL_BANDA[numero.banda] ?? ''}`;
  }
  const delta = deltaDeCierre(numero);
  if (delta && delta !== '=') {
    caja.append(span(`franja-delta franja-delta--${delta.startsWith('▲') ? 'sube' : 'baja'}`, delta));
  }
  return caja;
}

// `franja`: el `<header class="franja">`. `estadoEl`: `#franjaEstado`. `etiquetaRol`: la de `data/roles.js` (llega con
// los módulos). `fotoDeLaPagina()`: la foto del split en curso (`app.js`, `pagina.fotoInicio`).
export function crearFranja({ franja, estadoEl, etiquetaRol, fotoDeLaPagina }) {
  // El alto real de la franja (en el celular son dos líneas, o tres a 320 px): lo usan el cuarto y el acompañante
  // pegajoso para no quedar debajo. Con el token fijo de respaldo si esto no corre.
  if (franja && typeof ResizeObserver !== 'undefined') {
    const publicarAlto = () => {
      document.documentElement.style.setProperty('--franja-alto-real', `${Math.round(franja.getBoundingClientRect().height)}px`);
    };
    new ResizeObserver(publicarAlto).observe(franja);
    publicarAlto();
  }

  function pintar(estado) {
    if (!estadoEl) return;
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
      estado.calendario?.etiqueta,
      ventana
    ].filter(Boolean).join(' · ')));
    const pips = estado.phase === 'retirado' ? null : crearPips(estado);
    if (pips) cuando.append(pips);

    estadoEl.replaceChildren(...[quien, club, cuando, crearNumero(estado, fotoDeLaPagina?.() ?? null)].filter(Boolean));
  }

  return { pintar };
}
