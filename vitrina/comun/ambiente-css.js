// Ambiente de respaldo (sin WebGL): capas CSS que cambian por era con transicion.
// Implementa el contrato de comun/ambiente.md. Las direcciones pueden usarlo como fallback de su ambiente WebGL
// o de punto de partida. El arte va como <img> (cargado por arte.js con CORS), nunca como url() de CSS.
import { cargarImagen, urlSplash } from './arte.js';

export const ERAS_AMBIENTE = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
export const ANIMOS_AMBIENTE = ['normal', 'peligro', 'gloria'];
const TIPOS_PULSO = ['elegir', 'logro', 'golpe', 'peligro', 'gloria'];

function inyectarHoja() {
  const href = new URL('./ambiente-css.css', import.meta.url).href;
  if ([...document.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function crear(tag, clase, attrs = {}) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// opciones: { meta } (muestras.meta, para armar la URL del arte). Todo lo demas se ignora.
export function crearAmbiente(contenedor, opciones = {}) {
  inyectarHoja();
  if (getComputedStyle(contenedor).position === 'static') contenedor.style.position = 'relative';

  const raiz = crear('div', 'amb', { 'aria-hidden': 'true', 'data-era': 'pieza', 'data-animo': 'normal' });
  for (const era of ERAS_AMBIENTE) raiz.appendChild(crear('div', 'amb-era', { 'data-era': era }));
  const slots = [crear('img', 'amb-arte', { alt: '' }), crear('img', 'amb-arte', { alt: '' })];
  slots.forEach((s) => raiz.appendChild(s));
  raiz.appendChild(crear('div', 'amb-luz'));
  raiz.appendChild(crear('div', 'amb-animo'));
  raiz.appendChild(crear('div', 'amb-vineta'));
  const capaPulso = crear('div', 'amb-pulso');
  raiz.appendChild(capaPulso);
  contenedor.prepend(raiz);

  let slotActivo = -1;
  let tokenArte = 0;
  let arteActual = null;
  let cargaActual = Promise.resolve();
  let pausado = false;

  const reducido = () =>
    document.documentElement.hasAttribute('data-reducido') || matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ponerArte(key) {
    if (key === arteActual) return cargaActual; // misma key: devuelve la carga en curso
    arteActual = key;
    cargaActual = cargarArte(key);
    return cargaActual;
  }
  async function cargarArte(key) {
    const mio = ++tokenArte;
    if (!key) {
      slots.forEach((s) => s.removeAttribute('data-visible'));
      slotActivo = -1;
      return;
    }
    const img = await cargarImagen(urlSplash(key, opciones.meta));
    if (mio !== tokenArte) return; // llego tarde: otra llamada gano
    if (!img) {
      slots.forEach((s) => s.removeAttribute('data-visible'));
      slotActivo = -1;
      return;
    }
    const siguiente = slotActivo === 0 ? 1 : 0;
    slots[siguiente].src = img.src;
    slots[siguiente].setAttribute('data-visible', '');
    if (slotActivo >= 0) slots[slotActivo].removeAttribute('data-visible');
    slotActivo = siguiente;
  }

  const animaciones = () => raiz.getAnimations({ subtree: true });

  return {
    // Cambia era / animo / arte. Resuelve cuando el arte (si hay) quedo puesto.
    async ambiente({ era = 'pieza', animo = 'normal', arte = null } = {}) {
      if (ERAS_AMBIENTE.includes(era)) raiz.dataset.era = era;
      if (ANIMOS_AMBIENTE.includes(animo)) raiz.dataset.animo = animo;
      await ponerArte(arte);
    },
    // Destello breve. tipo: elegir | logro | golpe | peligro | gloria
    pulso(tipo = 'elegir') {
      if (!TIPOS_PULSO.includes(tipo) || reducido()) return;
      capaPulso.dataset.tipo = tipo;
      const fuerza = tipo === 'golpe' || tipo === 'gloria' ? 0.7 : 0.35;
      const dur = tipo === 'elegir' ? 450 : 900;
      capaPulso.animate([{ opacity: 0 }, { opacity: fuerza, offset: 0.25 }, { opacity: 0 }], { duration: dur, easing: 'ease-out' });
    },
    // Congela el ambiente en el instante t (ms). Para capturas y para mirar cuadros.
    congelar(t = 0) {
      pausado = true;
      for (const a of animaciones()) {
        a.pause();
        a.currentTime = t;
      }
    },
    pausar() {
      pausado = true;
      animaciones().forEach((a) => a.pause());
    },
    reanudar() {
      pausado = false;
      animaciones().forEach((a) => a.play());
    },
    destruir() {
      tokenArte++;
      raiz.remove();
    },
    get pausado() {
      return pausado;
    },
  };
}
