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

const datos = await cargarMuestras();
// Las lineas de los titulos se miden con la fuente real: se cargan antes del primer montaje.
await Promise.all(['800 52px "Mona Sans"', '400 17px Geist', '500 12px "Geist Mono"'].map((f) => document.fonts.load(f))).catch(() => {});
const escena = document.getElementById('escena');
const capaAmbiente = document.getElementById('ambiente');
let amb = crearAmbiente(capaAmbiente, { meta: datos.meta });
// Las pantallas hablan con este intermediario: si el ambiente se recrea (WebGL si/no), siguen andando.
const ambiente = {
  ambiente: (o) => amb.ambiente(o),
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
  marcaAccion = amb.reloj();
  nuevo.entrar?.();
}

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
      if (actual) aplicarAmbiente(estado, actual);
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

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  actual?.tecla?.(e);
});

window.vitrina.listo = () =>
  Promise.all([cargaArte, actual?.listo?.() ?? null, document.fonts.ready]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
