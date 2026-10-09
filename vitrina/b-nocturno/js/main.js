// B · NOCTURNO — "Tu carrera, impresa de noche."
// Arma el panel común y monta la pantalla pedida. Cada pantalla exporta montar*(raiz, ctx) y devuelve
// { listo, elegir?, repetir?, saltar?, congelar?, alEra?, destruir }.

import { crearPanel } from '../../comun/panel.js';
import { cargarMuestras } from '../../comun/datos.js';
import { PANTALLAS, ERAS } from '../../comun/catalogo.js';
import { montarDecision } from './decision.js';
import { montarInicio } from './inicio.js';
import { montarCumbre } from './cumbre.js';
import { montarEras } from './eras.js';

const datos = await cargarMuestras();
const escena = document.getElementById('escena');
let actual = null;
let clave = '';
let eraActual = '';
let listo = Promise.resolve();

const MONTAR = { decision: montarDecision, inicio: montarInicio, cumbre: montarCumbre, eras: montarEras };

function montar(estado) {
  actual?.destruir();
  escena.replaceChildren();
  window.scrollTo(0, 0);
  const ctx = {
    datos,
    meta: datos.meta,
    era: estado.eraEfectiva,
    muestra: estado.muestra,
    peor: estado.peor,
    irA: (pantalla, muestra) => {
      window.vitrina.irA(pantalla);
      if (muestra) window.vitrina.muestra(muestra);
    },
  };
  actual = (MONTAR[estado.pantalla] ?? montarInicio)(escena, ctx);
  listo = Promise.resolve(actual.listo).catch(() => {});
}

crearPanel({
  direccion: 'b-nocturno',
  pantallas: Object.keys(PANTALLAS),
  muestras: PANTALLAS,
  eras: ERAS,
  alCambiar(estado) {
    const nueva = [estado.pantalla, estado.muestra, estado.peor, estado.webgl].join('|');
    if (nueva !== clave) {
      clave = nueva;
      eraActual = estado.eraEfectiva;
      montar(estado);
    } else if (estado.eraEfectiva !== eraActual) {
      eraActual = estado.eraEfectiva;
      actual?.alEra?.(estado.eraEfectiva);
    }
  },
  acciones: {
    repetir: () => actual?.repetir?.(),
    elegir: (n) => actual?.elegir?.(n),
    congelar: (ms) => actual?.congelar?.(ms),
  },
});

window.vitrina.listo = () => listo;

// 1-4 eligen directo; Escape/Espacio saltean la tapa o la intro.
addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest?.('input, select, textarea, [contenteditable]')) return;
  if (/^[1-4]$/.test(e.key) && actual?.elegir) {
    actual.elegir(Number(e.key));
    e.preventDefault();
  } else if ((e.key === 'Escape' || e.key === ' ') && actual?.saltar?.()) {
    e.preventDefault();
  }
});
