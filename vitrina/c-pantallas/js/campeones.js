// Campeones: nombres, etiquetas y el "hover-pick" del cliente. Como en el champ select real, apuntar un campeón cambia
// el splash de la ventana del cliente y muestra su nombre: el cliente reacciona donde reacciona el de verdad, sin aura
// de ambiente. Lo usan la selección del inicio y el draft de la serie.
import { cargarImagen, urlSplash, urlIcono } from '../../comun/arte.js';
import { el, anim } from './util.js';

// La clave de Data Dragon es letras solas ("Kai'Sa" -> "KaiSa"): se normaliza siempre antes de armar una URL.
export const clave = (k) => String(k ?? '').replace(/[^A-Za-z]/g, '');

const ETIQUETAS = {
  mago_control: 'Mago de control', escalado: 'Escala', asesino: 'Asesino', bruiser: 'Peleador', tanque: 'Tanque',
  tirador: 'Tirador', encantador: 'Encantador', iniciador: 'Iniciador', duelista: 'Duelista', explosivo: 'Daño explosivo',
  temprano: 'Juego temprano', utilidad: 'Utilidad', mago: 'Mago', luchador: 'Luchador',
};
const etiqueta = (t) => ETIQUETAS[t] ?? String(t).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

// nombre y etiquetas desde el catálogo real del inicio (17 por rol); si no está, la clave misma
export function fichaDe(datos, k) {
  const key = clave(k);
  const todos = Object.values(datos.inicio?.catalogos?.campeonesPorRol ?? {}).flat();
  const c = todos.find((x) => x.ddragon === key);
  return { key, nombre: c?.name ?? key, tags: (c?.tags ?? []).map(etiqueta) };
}

// La vista del pick apuntado: el splash a sangre dentro de la ventana y el nombre como en el champ select.
// apuntar(k) cruza el splash (el nuevo entra corrido y se asienta, el viejo se apaga) y cambia el nombre.
export function vistaPick(ctx, { clase = '', kicker = 'Apuntando', conNombre = true } = {}) {
  const arte = el('div', { class: 'pick-arte', 'aria-hidden': 'true' });
  const nombre = el('p', { class: 'pick-nombre' });
  const tags = el('p', { class: 'pick-tags' });
  const nodo = el('div', { class: `pick ${clase}` }, arte,
    conNombre ? el('div', { class: 'pick-cartel', 'aria-live': 'polite' }, el('p', { class: 'pick-kicker' }, kicker), nombre, tags) : null);
  let actual = null;
  let carga = Promise.resolve();
  function apuntar(k, { gris = false } = {}) {
    const f = fichaDe(ctx.datos, k);
    if (!f.key || (f.key === actual && !gris)) return carga;
    actual = f.key;
    nombre.replaceChildren(...f.nombre.split('').map((c) => el('span', {}, c)));
    tags.textContent = f.tags.join(' · ');
    nodo.toggleAttribute('data-gris', gris);
    anim(nombre, [{ opacity: 0, transform: 'translateY(10px)', letterSpacing: '0.12em' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    anim(tags, [{ opacity: 0 }, { opacity: 1 }], { delay: 90, duration: 240 });
    // mientras baja el splash, el ícono (ya en caché por la grilla) desenfocado ocupa su lugar: la reacción es inmediata
    let listoSplash = false;
    cargarImagen(urlIcono(f.key, ctx.meta)).then((ico) => {
      if (!ico || listoSplash || actual !== f.key) return;
      const p = ico.cloneNode();
      p.alt = '';
      p.className = 'pick-provisorio';
      arte.append(p);
      anim(p, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    });
    carga = cargarImagen(urlSplash(f.key, ctx.meta)).then((img) => {
      listoSplash = true;
      if (!img || actual !== f.key) return;
      const c = img.cloneNode();
      c.alt = '';
      const viejas = [...arte.children];
      arte.append(c);
      const a = anim(c, [
        { opacity: 0, transform: 'translateX(3%) scale(1.06)', filter: 'brightness(1.7)' },
        { opacity: 1, transform: 'none', filter: 'none' },
      ], { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      const quitar = () => viejas.forEach((v) => v.remove());
      if (a) a.finished.then(quitar, quitar);
      else quitar();
    });
    return carga;
  }
  return { nodo, apuntar, get actual() { return actual; }, get listo() { return carga; } };
}
