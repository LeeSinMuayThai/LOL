// LA FUSION — arranque: datos, ambiente, panel de la vitrina y el montaje de cada pantalla.
// Cada pantalla es una fabrica crearX(ctx) -> { nodo, entrar(), elegir?(n), repetir?(), tecla?(e), alCambiarEra?(era),
// listo?(), destruir?(), pausar?(), reanudar?(), arte, animo, encuadre, velo, paleta, arena, escena, costura, cruce,
// lightsticks, tono }. La pantalla no conoce el panel; main.js traduce.
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
import { COLORES, COLOR_DEF, colorDeOp, POLITICAS_COLOR, normalizarColor, fijarColor } from './color.js';
import { tonoDe, aplicarTono, paletaDe } from './tono.js';

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
  // (PLANUI §4.9) la geometria de la costura, para ubicar el DOM encima
  costura: () => amb.costura(),
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
// La tercera perilla, `op=<id>` (PLANUI §4.7): la opcion de diseño de la pantalla montada. Cada pantalla interpreta sus
// propios ids (ctx.op) y sin `op` es la de hoy. No tiene selector: la eligen opciones.html o el hash.
const opDelHash = () => (new URLSearchParams(location.hash.slice(1)).get('op') ?? '').replace(/[^a-z0-9-]/g, '');
let op = opDelHash();
// La cuarta, `var=<id>` (PLANUI §4.10): la variante dentro de `op=linea` (la costura de la bisagra, lo que va atras del
// mercado). Cada pantalla interpreta sus ids (ctx.variante) y sin `var` es la de §4.9. No toca el color: `op` sigue
// siendo `linea`.
const varDelHash = () => (new URLSearchParams(location.hash.slice(1)).get('var') ?? '').replace(/[^a-z0-9-]/g, '');
let variante = varDelHash();
// Con una opcion de §4.7 en el hash, el color por defecto es la receta (js/color.js); con `op=linea`, la politica `linea`
// (PLANUI §4.9). `color=` explicito manda.
const defDe = (k) => (k === 'color' && op ? colorDeOp(op) : PERILLAS[k].def);
const delHash = (k) => {
  const v = new URLSearchParams(location.hash.slice(1)).get(k);
  return v == null ? defDe(k) : PERILLAS[k].normalizar(v);
};
const valor = { fondo: delHash('fondo'), color: delHash('color') };
const conPerillas = (url) => {
  if (url == null) return url;
  const u = new URL(String(url), location.href);
  const p = new URLSearchParams(u.hash.slice(1));
  for (const [k, def] of Object.keys(PERILLAS).map((k) => [k, defDe(k)])) {
    if (valor[k] === def) p.delete(k);
    else p.set(k, valor[k]);
  }
  if (op) p.set('op', op);
  else p.delete('op');
  if (variante) p.set('var', variante);
  else p.delete('var');
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
  if (op) html.dataset.op = op;
  else delete html.dataset.op;
  if (variante) html.dataset.var = variante;
  else delete html.dataset.var;
  for (const [k, sel] of Object.entries(selectores)) sel.value = valor[k];
}
// La politica de la pantalla montada (fondo + color) y su lugar fijo (si la variante lo usa). `dur`: el cruce del mundo.
function aplicarFondo(p, estado, dur) {
  if (!p) return;
  const c = fijarColor(valor.color, estado.pantalla, estado.muestra);
  document.documentElement.style.setProperty('--pieza-color', String(c.pieza));
  const pol = politica(valor.fondo, estado.pantalla, estado.muestra, valor.color, p.escena);
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

// PLANUI §4.9: el segundo tono de la pantalla. La fabrica lo declara (`tono`, un objeto de js/tono.js); con `op=linea` y
// sin tono declarado, el de su contexto por defecto (la era; el oro en el titulo). Va al CSS (--tono-* en <html>) y, si
// la pantalla no trae su propia paleta, tiñe la luz y la noche del mundo. Sin `op=linea` y sin tono, nada cambia.
const tonoDePantalla = (estado, p) => p.tono ?? (op === 'linea' ? tonoDe({ pantalla: estado.pantalla, muestra: estado.muestra, era: estado.eraEfectiva }) : null);
function aplicarAmbiente(estado, p) {
  const tono = tonoDePantalla(estado, p);
  aplicarTono(document.documentElement, tono);
  cargaArte = amb.ambiente({
    era: p.era ?? estado.eraEfectiva,
    animo: p.animo ?? 'normal',
    arte: p.arte ?? null,
    encuadre: celular() ? 'celular' : p.encuadre ?? 'derecha',
    velo: p.velo ?? 0.6,
    // PLANUI §4.7: la paleta de la competicion y la arena (solo las opciones del partido; el resto, null y 0)
    // PLANUI §4.9: o la del tono de la pantalla. Con `op=linea` la arena queda apagada: el publico son lightsticks
    paleta: p.paleta ?? paletaDe(tono),
    arena: op === 'linea' ? 0 : p.arena ?? 0,
    // PLANUI §4.9: la costura (null la apaga), su cruce y los lightsticks (con `op=linea`, el partido los trae prendidos)
    costura: p.costura ?? null,
    lightsticks: p.lightsticks ?? (op === 'linea' && estado.pantalla === 'partido' ? 1 : 0),
    ...(p.cruce != null ? { cruce: p.cruce } : {}),
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
  const nuevo = fabrica({ datos, muestra: estado.muestra, estado, amb: ambiente, sonido, aura, peor: estado.peor, op, variante });
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
  const nuevoOp = opDelHash();
  const nuevaVar = varDelHash();
  const cambioOp = nuevoOp !== op || nuevaVar !== variante;
  op = nuevoOp;
  variante = nuevaVar;
  let cambio = false;
  for (const k of Object.keys(PERILLAS)) {
    const v = delHash(k);
    if (v !== valor[k]) {
      valor[k] = v;
      cambio = true;
    }
  }
  if (!cambio && !cambioOp) return;
  marcarPerillas();
  // otra opcion: la pantalla se vuelve a montar (ya con el color nuevo, si cambio)
  if (cambioOp) {
    if (estadoActual) montar(estadoActual);
    return;
  }
  const m = montaje;
  queueMicrotask(() => {
    if (m === montaje) aplicarEnVivo();
  });
});
// variantes.html pausa el mundo de las columnas que no se ven (tres WebGL a la vez)
// (PLANUI §4.9: tambien a la pantalla, que puede tener su propio lienzo: la copa, el confeti)
addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.vitrina !== 'ambiente') return;
  if (e.data.pausar) {
    amb.pausar();
    actual?.pausar?.();
  } else {
    amb.reanudar();
    actual?.reanudar?.();
  }
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
      // con el tono por defecto de `op=linea` (la era), la paleta sigue a la era nueva
      const tono = actual.tono || actual.paleta ? null : tonoDePantalla(estado, actual);
      if (tono) aplicarTono(document.documentElement, tono);
      cargaArte = amb.ambiente(tono ? { era: estado.eraEfectiva, paleta: paletaDe(tono) } : { era: estado.eraEfectiva });
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
