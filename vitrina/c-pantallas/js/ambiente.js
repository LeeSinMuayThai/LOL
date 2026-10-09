// Ambiente de C · PANTALLAS: el papel de pared del sistema operativo. Implementa el contrato de comun/ambiente.md
// ({ ambiente, pulso, congelar, pausar, reanudar, destruir }) con capas DOM + WAAPI: no usa WebGL, así que con
// data-sin-webgl se ve igual. Cada capa lleva su propio data-era: al cambiar de era la capa nueva trae sus tokens y se
// funde sobre la vieja (FARO 26 -> FARO 44 es un cruce real de materiales, no un corte).
// Opciones propias (no obligatorias): monograma (texto de la org para la PC del equipo), quieto (sin deriva: una parada
// en pantalla), encuadre (object-position del splash), vivo (el papel de pared más presente: la pantalla de bloqueo).
import { cargarImagen, urlSplash } from '../../comun/arte.js';
import { el, anim, bucle } from './util.js';

const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
const ANIMOS = ['normal', 'peligro', 'gloria'];
const PULSOS = { elegir: [0.07, 260], logro: [0.14, 520], golpe: [0.26, 640], peligro: [0.3, 760], gloria: [0.34, 900] };

export function crearAmbiente(contenedor, opciones = {}) {
  const meta = opciones.meta;
  if (getComputedStyle(contenedor).position === 'static') contenedor.style.position = 'relative';
  const raiz = el('div', { class: 'amb', 'aria-hidden': 'true' });
  const tinte = el('div', { class: 'amb-animo', 'data-animo': 'normal' });
  const grano = el('div', { class: 'amb-grano' });
  const pulsoEl = el('div', { class: 'amb-pulso' });
  raiz.append(tinte, grano, pulsoEl);
  contenedor.prepend(raiz);

  let estado = { era: 'pieza', animo: 'normal', arte: null };
  let actual = null;
  let pedido = 0;
  let pausado = false;
  let vivo = true;

  async function ambiente(o = {}) {
    if (!vivo) return;
    const n = ++pedido;
    const era = ERAS.includes(o.era) ? o.era : estado.era;
    const animo = ANIMOS.includes(o.animo) ? o.animo : estado.animo;
    const arte = o.arte === undefined ? estado.arte : o.arte;
    estado = { era, animo, arte };
    const img = arte ? await cargarImagen(urlSplash(arte, meta)) : null;
    if (n !== pedido || !vivo) return; // ganó una llamada posterior

    const capa = el('div', { class: `amb-capa${o.vivo ? ' amb-vivo' : ''}`, 'data-era': era });
    if (img) {
      const i = img.cloneNode();
      i.className = 'amb-pared';
      i.alt = '';
      i.style.objectPosition = o.encuadre ?? 'center 24%';
      capa.append(i);
      if (!o.quieto) {
        bucle(i, [{ transform: 'scale(1.04) translate3d(0, 0, 0)' }, { transform: 'scale(1.1) translate3d(-1.2%, -0.8%, 0)' }], {
          duration: 42000, direction: 'alternate', easing: 'ease-in-out',
        });
      }
    }
    if (o.monograma) capa.append(el('div', { class: 'amb-mono' }, o.monograma));
    capa.append(el('div', { class: 'amb-velo' }), el('div', { class: 'amb-luz' }));
    raiz.insertBefore(capa, tinte);

    const vieja = actual;
    actual = capa;
    tinte.dataset.animo = animo;
    grano.dataset.era = era;
    if (vieja) {
      const a = anim(capa, [{ opacity: 0 }, { opacity: 1 }], { duration: 640, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
      if (a) a.finished.then(() => vieja.remove(), () => vieja.remove());
      else vieja.remove();
    }
    if (pausado) pausar();
  }

  function pulso(tipo) {
    const p = PULSOS[tipo];
    if (!p || !vivo) return;
    pulsoEl.dataset.tipo = tipo;
    anim(pulsoEl, [{ opacity: p[0] }, { opacity: 0 }], { duration: p[1], easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
  }

  const animaciones = () => raiz.getAnimations({ subtree: true });
  function pausar() {
    pausado = true;
    for (const a of animaciones()) a.pause();
  }
  function reanudar() {
    pausado = false;
    for (const a of animaciones()) a.play();
  }
  function congelar(t) {
    pausado = true;
    for (const a of animaciones()) {
      a.pause();
      a.currentTime = t;
    }
  }
  function destruir() {
    if (!vivo) return;
    vivo = false;
    for (const a of animaciones()) a.cancel();
    raiz.remove();
  }
  // pausa con la pestaña oculta
  const visibilidad = () => (document.hidden ? animaciones().forEach((a) => a.pause()) : !pausado && animaciones().forEach((a) => a.play()));
  document.addEventListener('visibilitychange', visibilidad);

  return { ambiente, pulso, congelar, pausar, reanudar, destruir };
}
