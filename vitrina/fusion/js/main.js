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

// ---------- el fondo (PLANUI §4.6): la politica del mundo, en el hash como `fondo=pleno|tenue|paso|lugar` ----------
// El panel de la vitrina (comun/panel.js) reescribe el hash con sus claves y no conoce `fondo`: se lee antes de crearlo
// y se conserva en cada reescritura. Sin `fondo` (o con `pleno`) la fusion es la de hoy.
const fondoDelHash = () => normalizarFondo(new URLSearchParams(location.hash.slice(1)).get('fondo'));
let fondo = fondoDelHash();
const conFondo = (url) => {
  if (url == null) return url;
  const u = new URL(String(url), location.href);
  const p = new URLSearchParams(u.hash.slice(1));
  if (fondo === FONDO_DEF) p.delete('fondo');
  else p.set('fondo', fondo);
  u.hash = p.toString();
  return u.href;
};
const reemplazar = history.replaceState.bind(history);
history.replaceState = (e, t, url) => reemplazar(e, t, conFondo(url));
function marcarFondo() {
  document.documentElement.dataset.fondo = fondo;
  if (selFondo) selFondo.value = fondo;
}
// La politica de la pantalla montada y su lugar fijo (si la variante lo usa). `dur`: el cruce del mundo.
function aplicarFondo(p, estado, dur) {
  if (!p) return;
  const pol = politica(fondo, estado.pantalla, estado.muestra);
  amb.fondo({ politica: pol, lugar: montarLugar(p.nodo, pol.lugar), instantaneo: dur === 0, dur });
}
function cambiarFondo(f) {
  const nuevo = normalizarFondo(f);
  if (nuevo === fondo) return;
  fondo = nuevo;
  history.replaceState(null, '', location.href);
  marcarFondo();
  if (actual && estadoActual) aplicarFondo(actual, estadoActual, TIEMPOS.variante);
}
let selFondo = null;

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

// Cambiar el hash a mano (o desde variantes.html) cambia el fondo; si ademas cambia la pantalla, el montaje lo aplica.
// Va antes del panel para leer el hash antes de que el panel lo reescriba.
addEventListener('hashchange', () => {
  const f = fondoDelHash();
  if (f === fondo) return;
  fondo = f;
  marcarFondo();
  const m = montaje;
  queueMicrotask(() => {
    if (m === montaje && actual && estadoActual) aplicarFondo(actual, estadoActual, TIEMPOS.variante);
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

// El selector del fondo, sumado al panel de la vitrina (su Shadow DOM es abierto; comun/panel.js no se toca).
function sumarSelector() {
  const campos = document.getElementById('vitrina-panel')?.shadowRoot?.querySelector('.campos');
  if (!campos) return null;
  const sel = document.createElement('select');
  sel.setAttribute('aria-label', 'Fondo');
  for (const f of FONDOS) {
    const o = document.createElement('option');
    o.value = f;
    o.textContent = `${POLITICAS[f].etiqueta} (${f})`;
    sel.append(o);
  }
  sel.addEventListener('change', () => cambiarFondo(sel.value));
  const rot = document.createElement('span');
  rot.textContent = 'Fondo (Alt+F)';
  const campo = document.createElement('label');
  campo.className = 'campo';
  campo.append(rot, sel);
  campos.append(campo);
  return sel;
}
selFondo = sumarSelector();
marcarFondo();

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyF') {
    e.preventDefault();
    cambiarFondo(FONDOS[(FONDOS.indexOf(fondo) + 1) % FONDOS.length]);
    return;
  }
  actual?.tecla?.(e);
});

window.vitrina.listo = () =>
  Promise.all([cargaArte, actual?.listo?.() ?? null, document.fonts.ready]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
