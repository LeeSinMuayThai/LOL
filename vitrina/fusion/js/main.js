// LA FUSION — arranque: datos, ambiente, panel de la vitrina y el montaje de cada pantalla.
// Cada pantalla es una fabrica crearX(ctx) -> { nodo, entrar(), elegir?(n), repetir?(), tecla?(e), alCambiarEra?(era),
// listo?(), destruir?(), arte, animo, encuadre, velo }. La pantalla no conoce el panel; main.js traduce.
import { crearPanel } from '../../comun/panel.js';
import { cargarMuestras } from '../../comun/datos.js';
import { PANTALLAS, ERAS } from '../../comun/catalogo.js';
import { crearAmbiente } from './ambiente.js';
import { crearDecision } from './decision.js';
import { crearCumbre } from './cumbre.js';
import { crearInicio } from './inicio.js';
import { crearEras } from './eras.js';
import { crearPartido } from './partido.js';
import { crearMercado } from './mercado.js';
import { crearSonido } from './sonido.js';
import { crearAura } from './aura.js';
import { celular, reducido, inst, SALE, DUR } from './util.js';
import { FONDOS, FONDO_DEF, POLITICAS, TIEMPOS, normalizarFondo, politica, montarLugar } from './fondo.js';
import { COLORES, COLOR_DEF, POLITICAS_COLOR, normalizarColor, fijarColor } from './color.js';

const datos = await cargarMuestras();
// Las lineas de los titulos se miden con la fuente real: se cargan antes del primer montaje.
await Promise.all(['800 52px "Mona Sans"', '400 17px Geist', '500 12px "Geist Mono"'].map((f) => document.fonts.load(f))).catch(() => {});
const escena = document.getElementById('escena');
const capaAmbiente = document.getElementById('ambiente');
let amb = crearAmbiente(capaAmbiente, { meta: datos.meta });
// Las pantallas hablan con este intermediario: si el ambiente se recrea (WebGL si/no), siguen andando.
const ambiente = {
  ambiente: (o) => amb.ambiente(o),
  momento: (o) => amb.momento(o),
  takeover: (r) => amb.takeover(r),
  aquietar: (s) => amb.aquietar(s),
  pulso: (t, r) => amb.pulso(t, r),
  quiebre: (r) => amb.quiebre(r),
  reloj: () => amb.reloj(),
  get impl() {
    return amb.impl;
  },
};
const sonido = crearSonido();
const aura = crearAura(ambiente);
const FABRICAS = { inicio: crearInicio, decision: crearDecision, partido: crearPartido, mercado: crearMercado, cumbre: crearCumbre, eras: crearEras };
let actual = null;
let montaje = 0;
let estadoActual = null;
let cargaArte = Promise.resolve();
let marcaAccion = 0;

// ---------- las dos perillas del mundo (PLANUI §4.6), en el hash ----------
//   fondo=pleno|menos|tenue|paso|lugar   cuanto campeon hay en el fondo (js/fondo.js)
//   color=duotono|real|mitad|capas       el color del campeon: el duotono de la era o sus colores (js/color.js)
// El panel de la vitrina (comun/panel.js) reescribe el hash con sus claves y no las conoce: se leen antes de crearlo y
// se conservan en cada reescritura. Sin ellas (o con pleno y duotono) la fusion es la de hoy.
const PERILLAS = {
  fondo: { lista: FONDOS, def: FONDO_DEF, normalizar: normalizarFondo, etiqueta: (f) => POLITICAS[f].etiqueta, rotulo: 'Fondo (Alt+F)', tecla: 'KeyF' },
  color: { lista: COLORES, def: COLOR_DEF, normalizar: normalizarColor, etiqueta: (c) => POLITICAS_COLOR[c].etiqueta, rotulo: 'Color (Alt+K)', tecla: 'KeyK' },
};
const delHash = (k) => PERILLAS[k].normalizar(new URLSearchParams(location.hash.slice(1)).get(k));
const valor = { fondo: delHash('fondo'), color: delHash('color') };
const conPerillas = (url) => {
  if (url == null) return url;
  const u = new URL(String(url), location.href);
  const p = new URLSearchParams(u.hash.slice(1));
  for (const [k, def] of Object.entries(PERILLAS).map(([k, x]) => [k, x.def])) {
    if (valor[k] === def) p.delete(k);
    else p.set(k, valor[k]);
  }
  u.hash = p.toString();
  return u.href;
};
const reemplazar = history.replaceState.bind(history);
history.replaceState = (e, t, url) => reemplazar(e, t, conPerillas(url));
const selectores = {};
function marcarPerillas() {
  const html = document.documentElement;
  html.dataset.fondo = valor.fondo;
  html.dataset.color = valor.color;
  for (const [k, sel] of Object.entries(selectores)) sel.value = valor[k];
}
// La politica de la pantalla montada (fondo + color) y su lugar fijo (si la variante lo usa). `dur`: el cruce del mundo.
function aplicarFondo(p, estado, dur) {
  if (!p) return;
  const c = fijarColor(valor.color, estado.pantalla, estado.muestra);
  document.documentElement.style.setProperty('--pieza-color', String(c.pieza));
  const pol = politica(valor.fondo, estado.pantalla, estado.muestra, valor.color);
  amb.fondo({ politica: pol, lugar: montarLugar(p.nodo, pol.lugar), instantaneo: dur === 0, dur });
}
// En vivo (selector, Alt+F/Alt+K, el hash de variantes.html): el mundo cruza y las piezas se repintan.
function aplicarEnVivo() {
  if (!actual || !estadoActual) return;
  aplicarFondo(actual, estadoActual, TIEMPOS.variante);
  actual.alCambiarEra?.(estadoActual.eraEfectiva);
}
function cambiar(k, v) {
  const nuevo = PERILLAS[k].normalizar(v);
  if (nuevo === valor[k]) return;
  valor[k] = nuevo;
  history.replaceState(null, '', location.href);
  marcarPerillas();
  aplicarEnVivo();
}

function aplicarAmbiente(estado, p) {
  cargaArte = amb.ambiente({
    era: p.era ?? estado.eraEfectiva,
    animo: p.animo ?? 'normal',
    arte: p.arte ?? null,
    encuadre: celular() ? 'celular' : p.encuadre ?? 'derecha',
    velo: p.velo ?? 0.6,
  });
}

// Cambiar de pantalla o de muestra es una transicion de luz, no un corte: lo viejo sale en 160 ms mientras el ambiente
// ya cruza a la era y al campeon nuevos; despues lo nuevo entra con su orden de siempre (luz -> rotulo -> titulo ->
// opciones). No se usa View Transitions: congelaria el lienzo del ambiente en una foto justo cuando tiene que cruzar.
// Con INST o movimiento reducido, instantaneo.
async function montar(estado) {
  const yo = ++montaje;
  // las piezas de campeon que pinte la pantalla nueva ya salen con el color de la politica
  fijarColor(valor.color, estado.pantalla, estado.muestra);
  const fabrica = FABRICAS[estado.pantalla] ?? crearInicio;
  const nuevo = fabrica({ datos, muestra: estado.muestra, estado, amb: ambiente, sonido, aura, peor: estado.peor });
  const viejo = actual;
  actual = nuevo;
  marcaAccion = amb.reloj();
  amb.aquietar(false);
  aura.pantalla(nuevo.arte, { pegajosa: nuevo.auraPegajosa });
  aplicarAmbiente(estado, nuevo);
  if (viejo?.nodo?.isConnected && !inst() && !reducido()) {
    viejo.nodo.style.pointerEvents = 'none';
    amb.pulso('cambio');
    const salida = viejo.nodo.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)', filter: 'blur(4px)' }], { duration: DUR.sale, easing: SALE, fill: 'forwards' });
    await salida.finished.catch(() => {});
    if (yo !== montaje) {
      nuevo.destruir?.();
      return;
    }
  }
  viejo?.destruir?.();
  escena.textContent = '';
  escena.append(nuevo.nodo);
  escena.scrollTop = 0;
  aplicarFondo(nuevo, estado, viejo ? TIEMPOS.pantalla : 0);
  marcaAccion = amb.reloj();
  nuevo.entrar?.();
}

// Cambiar el hash a mano (o desde variantes.html) cambia las perillas; si ademas cambia la pantalla, el montaje las
// aplica. Va antes del panel para leer el hash antes de que el panel lo reescriba.
addEventListener('hashchange', () => {
  let cambio = false;
  for (const k of Object.keys(PERILLAS)) {
    const v = delHash(k);
    if (v !== valor[k]) {
      valor[k] = v;
      cambio = true;
    }
  }
  if (!cambio) return;
  marcarPerillas();
  const m = montaje;
  queueMicrotask(() => {
    if (m === montaje) aplicarEnVivo();
  });
});
// variantes.html pausa el mundo de las columnas que no se ven (tres WebGL a la vez)
addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.vitrina !== 'ambiente') return;
  if (e.data.pausar) amb.pausar();
  else amb.reanudar();
});

crearPanel({
  direccion: 'fusion',
  pantallas: Object.keys(PANTALLAS),
  muestras: PANTALLAS,
  eras: ERAS,
  alCambiar(estado, cambios) {
    estadoActual = estado;
    if (cambios.includes('webgl')) {
      amb.destruir();
      amb = crearAmbiente(capaAmbiente, { meta: datos.meta });
      if (actual) {
        aplicarAmbiente(estado, actual);
        aplicarFondo(actual, estado, 0);
      }
    }
    if (cambios.includes('sonido')) sonido.activar(estado.sonido);
    if (['pantalla', 'muestra', 'peor'].some((k) => cambios.includes(k)) || !actual) {
      montar(estado);
      return;
    }
    if (cambios.includes('eraEfectiva') || cambios.includes('era')) {
      if (actual.alCambiarEra) actual.alCambiarEra(estado.eraEfectiva);
      cargaArte = amb.ambiente({ era: estado.eraEfectiva });
    }
  },
  acciones: {
    repetir() {
      if (actual?.repetir) {
        marcaAccion = amb.reloj();
        actual.repetir();
      } else montar(estadoActual);
    },
    elegir(n) {
      marcaAccion = amb.reloj();
      actual?.elegir?.(n);
    },
    congelar(ms) {
      amb.congelar(marcaAccion + ms);
      actual?.congelar?.(ms);
    },
  },
});

// Los selectores de las perillas, sumados al panel de la vitrina (su Shadow DOM es abierto; comun/panel.js no se toca).
function sumarSelector(k) {
  const campos = document.getElementById('vitrina-panel')?.shadowRoot?.querySelector('.campos');
  if (!campos) return;
  const x = PERILLAS[k];
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', k === 'fondo' ? 'Fondo' : 'Color');
  for (const v of x.lista) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = `${x.etiqueta(v)} (${v})`;
    sel.append(o);
  }
  sel.addEventListener('change', () => cambiar(k, sel.value));
  const rot = document.createElement('span');
  rot.textContent = x.rotulo;
  const campo = document.createElement('label');
  campo.className = 'campo';
  campo.append(rot, sel);
  campos.append(campo);
  selectores[k] = sel;
}
sumarSelector('fondo');
sumarSelector('color');
marcarPerillas();

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  const perilla = e.altKey && !e.ctrlKey && !e.metaKey ? Object.keys(PERILLAS).find((k) => PERILLAS[k].tecla === e.code) : null;
  if (perilla) {
    e.preventDefault();
    const { lista } = PERILLAS[perilla];
    cambiar(perilla, lista[(lista.indexOf(valor[perilla]) + 1) % lista.length]);
    return;
  }
  actual?.tecla?.(e);
});

window.vitrina.listo = () =>
  Promise.all([cargaArte, actual?.listo?.() ?? null, document.fonts.ready]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
