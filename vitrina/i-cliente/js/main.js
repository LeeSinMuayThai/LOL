// A · CLIENTE — la pagina: cuatro pantallas, el mundo de la fusion de fondo.
//   ?pantalla=decision|consecuencia|minijuego|mano   (o las teclas 1-4; Alt+1-4 siempre, aunque la pantalla elija con 1-3)
//   &t=<ms>      congela la linea de tiempo en ese instante (la consecuencia, el HUD, el resultado, la carta elegida)
//   &paso=previa|hud|resultado   (minijuego)      &carta=1|2|3   (mano: la carta ya elegida)
import { crearAmbiente } from '../../fusion/js/ambiente.js';
import { cargarMuestras } from '../../comun/datos.js';
import { el } from './piezas.js';
import { crearFicha, crearDecision, crearMinijuego, crearMano } from './pantallas.js';

const PANTALLAS = ['decision', 'consecuencia', 'minijuego', 'mano'];
const NOMBRES = { decision: 'La decisión', consecuencia: 'La consecuencia', minijuego: 'El minijuego', mano: 'La mano del año' };
const raiz = document.documentElement;
const escena = document.getElementById('escena');
const nav = document.querySelector('.vitrina-nav');

const datos = await cargarMuestras().catch(() => ({}));
const meta = datos?.meta;
await Promise.all(['700 30px Fraunces', '400 16px Geist', '600 12px Geist'].map((f) => document.fonts.load(f))).catch(() => {});

const celular = () => matchMedia('(max-width: 640px)').matches;
const amb = crearAmbiente(document.getElementById('ambiente'), { meta });
let actual = null;

const botones = PANTALLAS.map((p, i) =>
  el('button', { type: 'button', class: 'nav-punto', 'aria-label': `${i + 1} · ${NOMBRES[p]}`, onclick: () => montar(p) }, [el('i')]),
);
nav.append(...botones);

function montar(pantalla, { t = null, paso = 'previa', carta = null } = {}) {
  actual?.destruir();
  document.querySelectorAll('.fantasma').forEach((n) => n.remove());
  if (!PANTALLAS.includes(pantalla)) pantalla = 'decision';
  raiz.dataset.pantalla = pantalla;
  delete raiz.dataset.paso;
  botones.forEach((b, i) => (b.dataset.activo = PANTALLAS[i] === pantalla ? '1' : ''));
  const sig = (p) => () => montar(p);
  const ficha = crearFicha();
  let p;
  if (pantalla === 'decision') p = crearDecision({ ficha, alSeguir: sig('minijuego') });
  else if (pantalla === 'consecuencia') p = crearDecision({ ficha, elegida: 2, t, alSeguir: sig('minijuego') });
  else if (pantalla === 'minijuego') p = crearMinijuego({ paso, t, meta, alSeguir: sig('mano'), alPaso: (x) => mundo(x === 'previa' ? 'escenario' : 'escenario', 'Orianna', x) });
  else p = crearMano({ ficha, carta, t, alSeguir: sig('decision') });
  escena.replaceChildren(el('aside', { class: 'lado' }, [ficha.nodo]), p.nodo);
  actual = p;
  p.montado?.();
  if (pantalla !== 'minijuego') mundo(p.mundo.era, p.mundo.arte);
  const q = new URLSearchParams({ pantalla });
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

function mundo(era, arte, paso = null) {
  raiz.dataset.era = era;
  amb.ambiente({ era, animo: paso === 'resultado' ? 'gloria' : 'normal', arte, encuadre: celular() ? 'celular' : 'derecha', velo: 0.6 });
}

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey) return;
  const n = Number(e.key);
  if (e.altKey && n >= 1 && n <= 4) {
    e.preventDefault();
    montar(PANTALLAS[n - 1]);
    return;
  }
  if (actual?.tecla?.(e)) {
    e.preventDefault();
    return;
  }
  if (e.key === 'Enter') {
    actual?.seguir?.();
    return;
  }
  if (n >= 1 && n <= 4 && !e.altKey) montar(PANTALLAS[n - 1]);
});

const q = new URLSearchParams(location.search);
const tq = q.get('t');
montar(q.get('pantalla') ?? 'decision', {
  t: tq != null && Number.isFinite(Number(tq)) ? Number(tq) : null,
  paso: q.get('paso') ?? 'previa',
  carta: q.get('carta') ? Number(q.get('carta')) : null,
});
