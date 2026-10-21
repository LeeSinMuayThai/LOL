// A · CLIENTE — las piezas de la familia. Un solo marco (biselado, filete, esquinas cortadas) viste la ficha, la
// opcion, el panel de la previa, el HUD, el sello y la carta; lo que cambia es el material del filete y el estado:
// reposo, apuntado (brillo hextech), elegido (trabado en oro) y apagado.

const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, hijos = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? n.style.setProperty(sk, sv) : (n.style[sk] = sv);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const h of [].concat(hijos)) if (h != null) n.append(h);
  return n;
}

// Los iconos: SVG inline, trazo y relleno con currentColor.
const ICONOS = {
  sube: '<svg viewBox="0 0 10 10"><path d="M5 1.2 9.4 8.8H.6Z" fill="currentColor"/></svg>',
  baja: '<svg viewBox="0 0 10 10"><path d="M5 8.8 9.4 1.2H.6Z" fill="currentColor"/></svg>',
  aviso: '<svg viewBox="0 0 16 16"><path d="M8 1.5 15 14H1Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 6v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8" cy="12" r="1" fill="currentColor"/></svg>',
  // el martillo del ban
  denunciar: '<svg viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M17 9 29 21l-6 6L11 15Z"/><path d="M24 4l12 12M8 18l12 12"/><path d="M26 24l15 15"/></g><path d="M8 42h18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  // el chat tachado
  ignorar: '<svg viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M8 12h32v20H22l-8 7v-7H8Z"/></g><path d="M7 41 41 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  enter: '<svg viewBox="0 0 16 16"><path d="M13 3v6H4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 6 3.5 9l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  candado: '<svg viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7.5" rx="1" fill="currentColor"/><path d="M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  gana: '<svg viewBox="0 0 16 16"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pierde: '<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  // el minion de la oleada
  oleada: '<svg viewBox="0 0 24 24"><path d="M12 3c-3.6 0-6.4 2.7-6.4 6.3V13l-2.1 2.6 3.1.4L8.4 20h7.2l1.8-4 3.1-.4-2.1-2.6V9.3C18.4 5.7 15.6 3 12 3Z" fill="currentColor"/><path d="M8.6 10.4h2.4M13 10.4h2.4" stroke="var(--c-noche-0)" stroke-width="1.6" stroke-linecap="round"/></svg>',
  // la charla del coach: el silbato
  charla: '<svg viewBox="0 0 24 24"><path d="M3 5h18v11h-9l-5 4v-4H3Z" fill="currentColor"/><circle cx="8" cy="10.5" r="1.5" fill="var(--c-noche-0)"/><circle cx="12" cy="10.5" r="1.5" fill="var(--c-noche-0)"/><circle cx="16" cy="10.5" r="1.5" fill="var(--c-noche-0)"/></svg>',
  // el poder: estrella hextech
  poder: '<svg viewBox="0 0 24 24"><path d="M12 2.5 14.6 9.4 21.5 12l-6.9 2.6L12 21.5l-2.6-6.9L2.5 12l6.9-2.6Z" fill="currentColor"/><circle cx="12" cy="12" r="2.1" fill="var(--c-noche-0)"/></svg>',
};
export const icono = (nombre, clase = 'ico') => el('span', { class: clase, 'aria-hidden': 'true', html: ICONOS[nombre] });

// El emblema del rango: la gema de Diamante con alas, como la del perfil.
export function emblemaDiamante() {
  return el('span', {
    class: 'emblema',
    'aria-hidden': 'true',
    html: `<svg viewBox="0 0 120 120">
      <defs>
        <linearGradient id="emb-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--c-diamante-claro)"/><stop offset=".55" stop-color="var(--c-diamante)"/><stop offset="1" stop-color="var(--c-diamante-oscuro)"/></linearGradient>
        <linearGradient id="emb-o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--c-oro-claro)"/><stop offset="1" stop-color="var(--c-oro-oscuro)"/></linearGradient>
      </defs>
      <path d="M60 14 20 40l8 40 32 28 32-28 8-40Z" fill="var(--c-noche-2)" stroke="url(#emb-o)" stroke-width="3"/>
      <path d="M8 46l20 4 6 26-18-8ZM112 46l-20 4-6 26 18-8Z" fill="url(#emb-o)" opacity=".85"/>
      <path d="M60 26 35 46l6 28 19 18 19-18 6-28Z" fill="url(#emb-g)"/>
      <path d="M60 26 47 52l13 40 13-40Z" fill="var(--c-diamante-claro)" opacity=".55"/>
      <path d="M35 46l12 6 13-26M85 46l-12 6-13-26M41 74l6-22M79 74l-6-22" stroke="var(--c-noche-0)" stroke-width="1.2" opacity=".45" fill="none"/>
    </svg>`,
  });
}

// El marco: un nodo con la forma (clip-path con dos esquinas cortadas) y el filete como fondo; el contenido va en .marco-in.
// `material`: oro (por defecto), hex, acero, raro, epico. `estado`: reposo, apuntado, elegido, apagado.
export function marco(clase, hijos, { material = 'oro', estado = 'reposo', tag = 'div', attrs = {} } = {}) {
  return el(tag, { class: `marco ${clase}`, 'data-material': material, 'data-estado': estado, ...attrs }, [el('div', { class: 'marco-in' }, hijos)]);
}

// La tecla: el hexagono con el numero, como el atajo de la seleccion.
export const tecla = (txt) => el('span', { class: 'tecla', 'aria-hidden': 'true' }, [el('span', { text: txt })]);

// El separador del cliente: una linea de oro con el rombo al medio.
export const separador = () => el('span', { class: 'separador', 'aria-hidden': 'true' }, [el('i')]);

// El boton del cliente (JUGAR, SEGUIR, OTRA MANO): el mismo marco, en hextech.
export function boton(texto, { clase = '', iconoFin = null, onclick, primario = true } = {}) {
  return el('button', { class: `boton ${primario ? 'boton-primario' : 'boton-secundario'} ${clase}`, type: 'button', onclick }, [
    el('span', { class: 'boton-in' }, [el('span', { text: texto }), iconoFin ? icono(iconoFin, 'ico boton-ico') : null]),
  ]);
}

// ---------- tiempo ----------
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const tramo = (t, desde, dur) => clamp01((t - desde) / dur);
export const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp01(x)));
export const cubicOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-reducido');

// Corre `pintar(t)` de 0 a `fin` ms, o lo pinta una sola vez en `congelado` (el &t= de la URL) o en `fin` (movimiento
// reducido). Devuelve una funcion que lo corta.
export function correr(pintar, fin, { congelado = null } = {}) {
  if (congelado != null) {
    pintar(Math.min(congelado, fin));
    return () => {};
  }
  if (reducido()) {
    pintar(fin);
    return () => {};
  }
  let id = 0;
  const inicio = performance.now();
  const paso = (ahora) => {
    const t = ahora - inicio;
    pintar(Math.min(t, fin));
    if (t < fin) id = requestAnimationFrame(paso);
  };
  pintar(0);
  id = requestAnimationFrame(paso);
  return () => cancelAnimationFrame(id);
}
