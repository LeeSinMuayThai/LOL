// B · TRANSMISION — el router de la vitrina: ?pantalla=decision|consecuencia|minijuego|mano (&paso=previa|hud|resultado
// en el minijuego, &t=<ms> para congelar la linea de tiempo). Teclas: 1-4 cambian de pantalla; cuando la pantalla espera
// una eleccion, los numeros eligen (Shift+1-4 cambia de pantalla siempre). Enter sigue.
// El fondo y el arte son los de la fusion, reutilizados tal cual (vitrina/fusion/js/ambiente.js).

import { crearAmbiente } from '../../fusion/js/ambiente.js';
import { ANIMS, congelarEn } from './piezas.js';
import { decision, minijuego, mano, PASOS } from './pantallas.js';

const PANTALLAS = ['decision', 'consecuencia', 'minijuego', 'mano'];
const META = { ddragon: { base: 'https://ddragon.leagueoflegends.com/cdn', version: '16.19.1' } };
// el mundo de cada pantalla: el amateur en la luz de la pieza con su main; el pro en la del escenario, sin cara
const MUNDO = {
  decision: { era: 'pieza', arte: 'Ahri' },
  consecuencia: { era: 'pieza', arte: 'Ahri' },
  minijuego: { era: 'escenario', arte: null },
  mano: { era: 'pieza', arte: 'Ahri' },
};

const q = new URLSearchParams(location.search);
const raiz = document.getElementById('escena');
const celular = () => matchMedia('(max-width: 640px)').matches;
const amb = crearAmbiente(document.getElementById('mundo'), { meta: META });
let cargaArte = Promise.resolve();
let actual = null;
let estado = { pantalla: PANTALLAS.includes(q.get('pantalla')) ? q.get('pantalla') : 'decision', paso: PASOS.includes(q.get('paso')) ? q.get('paso') : 'previa' };

function montar({ t = null } = {}) {
  for (const a of ANIMS) a.cancel();
  ANIMS.clear();
  const { pantalla, paso } = estado;
  document.documentElement.dataset.pantalla = pantalla;
  document.documentElement.dataset.paso = pantalla === 'minijuego' ? paso : '';
  const m = MUNDO[pantalla];
  document.documentElement.dataset.era = m.era;
  cargaArte = amb.ambiente({ era: m.era, animo: 'normal', arte: m.arte, encuadre: celular() ? 'celular' : 'derecha', velo: 0.62 });

  if (pantalla === 'decision') actual = decision();
  else if (pantalla === 'consecuencia') actual = decision();
  else if (pantalla === 'minijuego') actual = minijuego(paso);
  else actual = mano();
  raiz.replaceChildren(actual.nodo);
  actual.otra?.addEventListener('click', () => montar());
  actual.nodo.querySelector('[data-accion="jugar"]')?.addEventListener('click', () => avanzarMinijuego());

  if (pantalla === 'consecuencia') {
    actual.elegir(2);
  } else actual.entrar?.();
  if (t != null) requestAnimationFrame(() => congelarEn(t));
  const u = new URL(location.href);
  u.searchParams.set('pantalla', pantalla);
  if (pantalla === 'minijuego') u.searchParams.set('paso', paso);
  else u.searchParams.delete('paso');
  if (t == null) u.searchParams.delete('t');
  history.replaceState(null, '', u);
}

function ir(p) {
  estado = { pantalla: p, paso: 'previa' };
  montar();
}
function avanzarMinijuego() {
  estado.paso = PASOS[(PASOS.indexOf(estado.paso) + 1) % PASOS.length];
  montar();
}

addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const d = /^Digit([1-4])$/.exec(e.code);
  if (d) {
    const n = Number(d[1]);
    if (!e.shiftKey && actual?.pendiente?.() && actual.elegir(n)) return e.preventDefault();
    if (!e.shiftKey && actual?.pendiente?.()) return;
    e.preventDefault();
    return ir(PANTALLAS[n - 1]);
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const s = estado.pantalla;
    if (s === 'minijuego') return avanzarMinijuego();
    if ((s === 'decision' || s === 'consecuencia') && actual?.seguir?.()) return ir('decision');
  }
});
addEventListener('click', (e) => {
  if (e.target.closest('.seguir')) {
    if (estado.pantalla === 'minijuego') avanzarMinijuego();
    else ir('decision');
  }
});

window.vitrina = { listo: () => cargaArte, irA: ir, congelar: congelarEn };
const t0 = q.has('t') ? Number(q.get('t')) : null;
montar({ t: Number.isFinite(t0) ? t0 : null });
