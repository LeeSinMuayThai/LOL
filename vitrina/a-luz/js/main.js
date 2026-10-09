// A · LUZ — arranque: datos, ambiente, panel de la vitrina y el montaje de cada pantalla.
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
import { crearSonido } from './sonido.js';
import { celular } from './util.js';

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
  pulso: (t) => amb.pulso(t),
  reloj: () => amb.reloj(),
  get impl() {
    return amb.impl;
  },
};
const sonido = crearSonido();
const FABRICAS = { inicio: crearInicio, decision: crearDecision, cumbre: crearCumbre, eras: crearEras };
let actual = null;
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

function montar(estado) {
  actual?.destruir?.();
  escena.textContent = '';
  const fabrica = FABRICAS[estado.pantalla] ?? crearInicio;
  actual = fabrica({ datos, muestra: estado.muestra, estado, amb: ambiente, sonido, peor: estado.peor });
  escena.append(actual.nodo);
  escena.scrollTop = 0;
  marcaAccion = amb.reloj();
  amb.aquietar(false);
  aplicarAmbiente(estado, actual);
  actual.entrar?.();
}

crearPanel({
  direccion: 'a-luz',
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
