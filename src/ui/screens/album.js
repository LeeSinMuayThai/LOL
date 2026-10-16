// H6 (PLANUI §0.10, "el álbum"): la pantalla. Un diálogo sobre el inicio con una pestaña por rareza (común, rara, épica,
// legendaria) y "12 de 134" en cada una. Lo visto muestra su nombre; lo que falta, "???". La lógica (qué se vio, el resumen)
// vive en `ui/core/album.js`; acá solo se pinta. El catálogo (todas las cartas y todos los eventos) se importa recién al abrir,
// para no cargarlo en el arranque.
import { el } from '../fx/util.js';
import { albumCompartido, almacenamientoDelNavegador, RAREZAS, NOMBRE_RAREZA } from '../core/album.js';

const HUECO = /\{[a-zA-Z]+\}/g;

export async function catalogoDelAlbum() {
  const [{ CARTAS }, { TODOS_LOS_EVENTOS }] = await Promise.all([
    import('../../data/events/cartas/index.js'),
    import('../../data/events/index.js')
  ]);
  return [
    ...CARTAS.map((c) => ({ tipo: 'c', id: c.id, rareza: c.rareza, nombre: c.titulo })),
    ...TODOS_LOS_EVENTOS.map((e) => ({ tipo: 'e', id: e.id, rareza: e.rarezaEvento ?? 'comun', nombre: String(e.title ?? e.id).replace(HUECO, '…') }))
  ];
}

export async function abrirAlbum() {
  if (typeof document === 'undefined' || document.querySelector('.al')) return;
  const anterior = document.activeElement;
  const album = albumCompartido();
  const catalogo = await catalogoDelAlbum();
  const sinStorage = almacenamientoDelNavegador() === null;
  let activa = 'comun';

  const total = el('p', { class: 'al-total' });
  const cerrar = el('button', { type: 'button', class: 'al-cerrar', 'aria-label': 'Cerrar el álbum', text: 'Cerrar' });
  const tabs = el('div', { class: 'al-tabs', role: 'tablist', 'aria-label': 'Rareza' });
  const lista = el('ul', { class: 'al-lista', role: 'tabpanel' });
  const panel = el('div', { class: 'al-panel' }, [
    el('header', { class: 'al-cab' }, [el('h2', { class: 'al-titulo', text: 'Álbum' }), total, cerrar]),
    sinStorage ? el('p', { class: 'al-aviso', text: 'Este navegador no guarda el álbum: solo ves lo de esta sesión.' }) : null,
    tabs,
    lista
  ]);
  const raiz = el('section', { class: 'al', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Álbum', tabindex: '-1' }, [panel]);

  function pintar() {
    const r = album.resumen(catalogo);
    total.textContent = `${r.vistos} de ${r.total} descubiertos`;
    tabs.replaceChildren(...RAREZAS.map((rareza) => {
      const { vistos, total: n } = r.porRareza[rareza];
      const tab = el('button', { type: 'button', class: 'al-tab', role: 'tab', 'data-rareza': rareza, 'aria-selected': String(rareza === activa), tabindex: rareza === activa ? '0' : '-1' }, [
        el('b', { text: NOMBRE_RAREZA[rareza] }),
        el('span', { text: `${vistos} de ${n}` })
      ]);
      tab.addEventListener('click', () => { activa = rareza; pintar(); tabs.querySelector('[aria-selected="true"]')?.focus(); });
      return tab;
    }));
    lista.dataset.rareza = activa;
    const items = album.listar(catalogo, activa);
    const nombres = new Map(catalogo.map((c) => [`${c.tipo}:${c.id}`, c.nombre]));
    items.sort((a, b) => b.visto - a.visto || (a.tipo === b.tipo ? 0 : a.tipo === 'c' ? -1 : 1) || String(nombres.get(`${a.tipo}:${a.id}`)).localeCompare(String(nombres.get(`${b.tipo}:${b.id}`)), 'es'));
    lista.replaceChildren(...items.map((i) => el('li', { class: `al-item${i.visto ? ' visto' : ''}`, 'data-rareza': i.rareza }, [
      el('span', { class: 'al-tipo', text: i.tipo === 'c' ? 'Carta' : 'Evento' }),
      el('span', { class: 'al-nombre', text: i.visto ? nombres.get(`${i.tipo}:${i.id}`) : '???' })
    ])));
  }

  function cerrarAlbum() {
    document.removeEventListener('keydown', tecla, true);
    raiz.remove();
    if (anterior?.isConnected) anterior.focus?.({ preventScroll: true });
  }
  function tecla(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cerrarAlbum();
      return;
    }
    const paso = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (paso && tabs.contains(document.activeElement)) {
      e.preventDefault();
      activa = RAREZAS[(RAREZAS.indexOf(activa) + paso + RAREZAS.length) % RAREZAS.length];
      pintar();
      tabs.querySelector('[aria-selected="true"]')?.focus();
    }
  }
  cerrar.addEventListener('click', cerrarAlbum);
  raiz.addEventListener('click', (e) => { if (e.target === raiz) cerrarAlbum(); });
  document.addEventListener('keydown', tecla, true);
  pintar();
  document.body.append(raiz);
  cerrar.focus({ preventScroll: true });
}

// El texto del botón del inicio: cuánto llevás (nada si todavía no viste nada o no hay storage).
export function cuentaDelAlbum() {
  try {
    const n = albumCompartido().vistos();
    return n > 0 ? `${n} descubiertos` : '';
  } catch {
    return '';
  }
}
