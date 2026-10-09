// Panel flotante de la vitrina. Igual en las tres direcciones. Vive en un Shadow DOM (los estilos de la
// direccion no lo tocan, ni el al reves). Todo el estado vive en el hash de la URL.
//
//   import { crearPanel } from '../comun/panel.js';
//   crearPanel({
//     direccion: 'a-luz',
//     pantallas: Object.keys(PANTALLAS),                                // de comun/catalogo.js (ronda 1)
//     muestras: PANTALLAS,
//     eras: ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'],   // opcional, estas son las de defecto
//     alCambiar(estado, cambios) {},                                    // se llama al arrancar y en cada cambio
//     acciones: { repetir() {}, elegir(n) {}, congelar(ms) {} },        // todas opcionales
//   });
//
// Hash: #pantalla=decision&muestra=evento&era=auto&dispositivo=escritorio[&sonido=1&reducido=1&inst=1&webgl=0
//        &fps=1&textos=breves&peor=1&panel=0&abierto=1]
// Atributos en <html>: data-pantalla, data-muestra, data-era (SIEMPRE la efectiva, nunca 'auto'), data-dispositivo, data-textos="breves|completos",
//   y (presentes cuando estan prendidos) data-era-fija (era forzada a mano), data-sonido, data-reducido, data-inst, data-sin-webgl, data-peor-caso.

import { eraEfectiva as resolverEra } from './catalogo.js';

const ERAS_DEFECTO = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
const BOOLEANAS = { sonido: '0', reducido: '0', inst: '0', webgl: '1', fps: '0', peor: '0' };
const TEXTOS = ['completos', 'breves'];
const DISPOSITIVOS = ['escritorio', 'celular'];
const ETIQUETAS_ERA = { pieza: 'La pieza', academia: 'La academia', escenario: 'El escenario', mundial: 'El Mundial', leyenda: 'La leyenda' };
const RUTA = (rel) => new URL(rel, import.meta.url);

function hoja(href) {
  if (document.querySelector(`link[data-vitrina-hoja="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = RUTA(href).href;
  l.dataset.vitrinaHoja = href;
  document.head.appendChild(l);
}

function el(tag, attrs = {}, hijos = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'texto') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const h of [].concat(hijos)) if (h) e.appendChild(typeof h === 'string' ? document.createTextNode(h) : h);
  return e;
}

export function crearPanel(opciones = {}) {
  const direccion = opciones.direccion ?? 'direccion';
  const pantallas = opciones.pantallas?.length ? opciones.pantallas : ['inicio'];
  const muestrasPorPantalla = opciones.muestras ?? {};
  const eras = opciones.eras?.length ? opciones.eras : ERAS_DEFECTO;
  const acciones = opciones.acciones ?? {};
  const enMarco = window.top !== window; // dentro del iframe de celular.html o de una miniatura del indice

  // ---------- estado <-> hash ----------
  const params = () => new URLSearchParams(location.hash.slice(1));
  function normalizar(p) {
    const e = {};
    e.pantalla = pantallas.includes(p.get('pantalla')) ? p.get('pantalla') : pantallas[0];
    const ms = muestrasPorPantalla[e.pantalla] ?? [];
    e.muestra = ms.includes(p.get('muestra')) ? p.get('muestra') : (ms[0] ?? '');
    // 'auto' (por defecto) = la era de la muestra (catalogo.js); cualquier otra la fija. La pantalla `eras` usa la primera como base.
    e.era = p.get('era') === 'auto' || eras.includes(p.get('era')) ? p.get('era') : 'auto';
    e.eraEfectiva = e.era !== 'auto' ? e.era : e.pantalla === 'eras' ? eras[0] : resolverEra('auto', e.pantalla, e.muestra);
    if (!eras.includes(e.eraEfectiva)) e.eraEfectiva = eras[0];
    e.dispositivo = DISPOSITIVOS.includes(p.get('dispositivo')) ? p.get('dispositivo') : 'escritorio';
    for (const [k, def] of Object.entries(BOOLEANAS)) e[k] = (p.get(k) ?? def) === '1';
    e.textos = TEXTOS.includes(p.get('textos')) ? p.get('textos') : 'completos';
    e.panel = p.get('panel') !== '0';
    e.abierto = p.get('abierto') === '1';
    return e;
  }
  function serializar(e) {
    const p = new URLSearchParams();
    p.set('pantalla', e.pantalla);
    if (e.muestra) p.set('muestra', e.muestra);
    p.set('era', e.era);
    p.set('dispositivo', e.dispositivo);
    for (const [k, def] of Object.entries(BOOLEANAS)) if ((e[k] ? '1' : '0') !== def) p.set(k, e[k] ? '1' : '0');
    if (e.textos !== 'completos') p.set('textos', e.textos);
    if (!e.panel) p.set('panel', '0');
    if (e.abierto) p.set('abierto', '1');
    return p.toString();
  }

  let estado = normalizar(params());
  const reducidoEfectivo = () => estado.reducido || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const copia = () => ({ ...estado, reducido: reducidoEfectivo(), reducidoManual: estado.reducido });

  // ---------- aplicar al documento ----------
  const html = document.documentElement;
  function marcar(attr, on) {
    if (on) html.setAttribute(attr, '');
    else html.removeAttribute(attr);
  }
  function aplicarAlDocumento() {
    html.dataset.direccion = direccion;
    html.dataset.pantalla = estado.pantalla;
    html.dataset.muestra = estado.muestra;
    html.dataset.era = estado.eraEfectiva; // siempre la efectiva, nunca 'auto'
    marcar('data-era-fija', estado.era !== 'auto');
    html.dataset.dispositivo = estado.dispositivo;
    html.dataset.textos = estado.textos;
    marcar('data-sonido', estado.sonido);
    marcar('data-reducido', estado.reducido);
    marcar('data-inst', estado.inst);
    marcar('data-sin-webgl', !estado.webgl);
    marcar('data-peor-caso', estado.peor);
  }

  function cambiosEntre(a, b) {
    return Object.keys(b).filter((k) => a[k] !== b[k]);
  }
  function aplicar(nuevo) {
    const cambios = cambiosEntre(estado, nuevo);
    estado = nuevo;
    history.replaceState(null, '', '#' + serializar(estado));
    aplicarAlDocumento();
    if (estado.dispositivo === 'celular' && !enMarco && estado.panel) irACelular();
    if (enMarco && cambios.includes('dispositivo') && estado.dispositivo === 'escritorio') {
      parent.postMessage({ vitrina: 'dispositivo', valor: 'escritorio' }, location.origin);
    }
    if (cambios.includes('fps')) estado.fps ? iniciarFps() : detenerFps();
    renderControles();
    if (cambios.length) opciones.alCambiar?.(copia(), cambios);
    return cambios;
  }

  // ---------- API publica (window.vitrina) ----------
  function set(clave, valor) {
    const p = new URLSearchParams(serializar(estado));
    if (clave in BOOLEANAS || clave === 'panel' || clave === 'abierto') valor = valor === true || valor === '1' || valor === 1 ? '1' : '0';
    p.set(clave, String(valor));
    if (clave === 'pantalla') p.delete('muestra'); // se re-elige la primera muestra de la pantalla nueva
    return aplicar(normalizar(p));
  }
  function ciclar(lista, actual) {
    return lista[(lista.indexOf(actual) + 1) % lista.length];
  }

  const api = {
    irA: (pantalla) => set('pantalla', pantalla),
    muestra: (m) => set('muestra', m),
    era: (e) => set('era', e), // 'auto' o una era
    set,
    estado: copia,
    repetir() {
      acciones.repetir?.();
    },
    elegir(n) {
      acciones.elegir?.(n);
    },
    // Congela el instante ms: la accion de la direccion (ambiente.congelar, etc.) y despues, en cualquier caso,
    // todas las animaciones WAAPI/CSS del documento quedan pausadas en ese tiempo.
    congelar(ms = 0) {
      acciones.congelar?.(ms);
      for (const a of document.getAnimations()) {
        try {
          a.pause();
          a.currentTime = ms;
        } catch {
          /* animacion sin linea de tiempo valida */
        }
      }
    },
    fps: () => medidas(),
    catalogo: () => ({ pantallas: [...pantallas], muestras: JSON.parse(JSON.stringify(muestrasPorPantalla)), eras: [...eras] }),
    direccion,
  };
  window.vitrina = api;

  // ---------- celular ----------
  function irACelular() {
    const src = location.href.split('#')[0];
    const destino = RUTA('./celular.html');
    destino.search = '?src=' + encodeURIComponent(src);
    destino.hash = location.hash;
    location.replace(destino.href);
  }

  // ---------- FPS ----------
  const cuadros = [];
  let rafFps = 0;
  let ultimoCuadro = 0;
  let ultimoTexto = 0;
  function medidas() {
    if (cuadros.length < 2) return { fps: 0, p95: 0, n: cuadros.length };
    const media = cuadros.reduce((s, x) => s + x, 0) / cuadros.length;
    const orden = [...cuadros].sort((a, b) => a - b);
    const p95 = orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.95))];
    return { fps: 1000 / media, p95, n: cuadros.length };
  }
  function tickFps(t) {
    if (ultimoCuadro) {
      cuadros.push(t - ultimoCuadro);
      if (cuadros.length > 120) cuadros.shift();
    }
    ultimoCuadro = t;
    if (t - ultimoTexto > 250) {
      ultimoTexto = t;
      const m = medidas();
      medidor.textContent = `${m.fps.toFixed(0)} fps · p95 ${m.p95.toFixed(1)} ms`;
    }
    rafFps = requestAnimationFrame(tickFps);
  }
  function iniciarFps() {
    cuadros.length = 0;
    ultimoCuadro = 0;
    medidor.hidden = false;
    cancelAnimationFrame(rafFps);
    rafFps = requestAnimationFrame(tickFps);
  }
  function detenerFps() {
    cancelAnimationFrame(rafFps);
    medidor.hidden = true;
  }

  // ---------- "hoy" ----------
  let indiceHoy = null;
  async function cargarIndiceHoy() {
    if (!indiceHoy) {
      indiceHoy = fetch(RUTA('../hoy/indice.json'), { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    }
    return indiceHoy;
  }
  async function abrirHoy() {
    const idx = await cargarIndiceHoy();
    const ficha = idx?.muestras?.[estado.muestra] ?? idx?.pantallas?.[estado.pantalla];
    if (!ficha) {
      avisar('No hay captura de hoy para esta pantalla.');
      return;
    }
    const archivo = estado.dispositivo === 'celular' && ficha.movil ? ficha.movil : ficha.archivo;
    imgHoy.src = RUTA('../hoy/' + archivo).href;
    imgHoy.alt = ficha.titulo ?? 'Captura de hoy';
    pieHoy.textContent = `Hoy · ${ficha.titulo ?? archivo}${ficha.nota ? ' — ' + ficha.nota : ''}`;
    visorHoy.hidden = false;
    visorHoy.focus();
  }
  function cerrarHoy() {
    visorHoy.hidden = true;
  }
  let temporizadorAviso = 0;
  function avisar(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => (aviso.hidden = true), 2600);
  }

  // ---------- DOM ----------
  hoja('./fuentes.css');
  const host = el('div', { id: 'vitrina-panel', 'data-vitrina': '' });
  const sombra = host.attachShadow({ mode: 'open' });
  sombra.appendChild(el('link', { rel: 'stylesheet', href: RUTA('./tokens.css').href }));
  sombra.appendChild(el('link', { rel: 'stylesheet', href: RUTA('./panel.css').href }));

  const medidor = el('div', { class: 'medidor', hidden: '', 'aria-live': 'off' });
  const aviso = el('div', { class: 'aviso', hidden: '', role: 'status' });
  const imgHoy = el('img', { alt: '' });
  const pieHoy = el('p', { class: 'visor-pie' });
  const visorHoy = el('div', { class: 'visor', hidden: '', tabindex: '-1', role: 'dialog', 'aria-label': 'Captura de hoy', onclick: cerrarHoy }, [
    el('div', { class: 'visor-cuerpo' }, [imgHoy, pieHoy]),
  ]);

  const selPantalla = el('select', { 'aria-label': 'Pantalla', onchange: (e) => set('pantalla', e.target.value) },
    pantallas.map((p) => el('option', { value: p, texto: p })));
  const selMuestra = el('select', { 'aria-label': 'Muestra', onchange: (e) => set('muestra', e.target.value) });
  const selEra = el('select', { 'aria-label': 'Era', onchange: (e) => set('era', e.target.value) },
    [el('option', { value: 'auto', texto: 'Auto (la de la muestra)' }), ...eras.map((x) => el('option', { value: x, texto: ETIQUETAS_ERA[x] ?? x }))]);
  const campo = (rotulo, control) => el('label', { class: 'campo' }, [el('span', { texto: rotulo }), control]);
  const filaMuestra = campo('Muestra', selMuestra);

  const btnRepetir = el('button', { class: 'btn', type: 'button', title: 'Alt+R', onclick: () => api.repetir() }, ['▶ Repetir']);
  const btnHoy = el('button', { class: 'btn', type: 'button', title: 'Alt+H', onclick: abrirHoy }, ['Hoy']);
  const grupoElegir = el('div', { class: 'grupo-elegir' }, [
    el('span', { class: 'rotulo', texto: 'Elegir' }),
    ...[1, 2, 3].map((n) => el('button', { class: 'btn chico', type: 'button', onclick: () => api.elegir(n) }, [String(n)])),
  ]);
  grupoElegir.hidden = !acciones.elegir;

  const segDisp = el('div', { class: 'seg', role: 'group', 'aria-label': 'Dispositivo' },
    DISPOSITIVOS.map((d) => el('button', { type: 'button', 'data-valor': d, title: 'Alt+C', onclick: () => set('dispositivo', d) }, [d === 'escritorio' ? 'Escritorio' : 'Celular'])));

  const interruptores = [
    ['sonido', 'Sonido', 'Alt+S'],
    ['reducido', 'Movimiento reducido', 'Alt+M'],
    ['inst', 'INST (sin esperas)', 'Alt+I'],
    ['webgl', 'WebGL', 'Alt+W'],
    ['fps', 'Medidor de FPS', 'Alt+G'],
    ['peor', 'Peor caso', 'Alt+Z'],
  ];
  const checks = {};
  const lista = el('div', { class: 'interruptores' });
  for (const [clave, rotulo, atajo] of interruptores) {
    const cb = el('input', { type: 'checkbox', onchange: (e) => set(clave, e.target.checked) });
    checks[clave] = cb;
    lista.appendChild(el('label', { class: 'interruptor', title: atajo }, [cb, el('span', { texto: rotulo })]));
  }
  const cbTextos = el('input', { type: 'checkbox', onchange: (e) => set('textos', e.target.checked ? 'breves' : 'completos') });
  lista.appendChild(el('label', { class: 'interruptor', title: 'Alt+T' }, [cbTextos, el('span', { texto: 'Textos breves' })]));

  const cuerpo = el('div', { class: 'cuerpo' }, [
    el('div', { class: 'campos' }, [campo('Pantalla', selPantalla), filaMuestra, campo('Era', selEra)]),
    el('div', { class: 'acciones' }, [btnRepetir, btnHoy, grupoElegir]),
    segDisp,
    lista,
    el('p', { class: 'ayuda', texto: 'Atajos (Alt+): P pantalla, N muestra, A era, R repetir, H hoy, V plegar.' }),
  ]);
  const cabecera = el('button', { class: 'cabecera', type: 'button', 'aria-expanded': 'false', title: 'Alt+V', onclick: () => set('abierto', !estado.abierto) }, [
    el('span', { class: 'punto' }),
    el('span', { class: 'titulo', texto: `Vitrina · ${direccion}` }),
    el('span', { class: 'chevron', 'aria-hidden': 'true', texto: '⌃' }),
  ]);
  const caja = el('section', { class: 'caja', 'aria-label': 'Controles de la vitrina' }, [cabecera, cuerpo]);
  sombra.append(medidor, aviso, caja, visorHoy);

  function renderControles() {
    host.hidden = !estado.panel;
    caja.dataset.abierto = estado.abierto ? '1' : '0';
    cabecera.setAttribute('aria-expanded', String(estado.abierto));
    selPantalla.value = estado.pantalla;
    const ms = muestrasPorPantalla[estado.pantalla] ?? [];
    selMuestra.replaceChildren(...ms.map((m) => el('option', { value: m, texto: m })));
    selMuestra.value = estado.muestra;
    filaMuestra.hidden = ms.length === 0;
    selEra.value = estado.era;
    for (const [k, cb] of Object.entries(checks)) cb.checked = estado[k];
    cbTextos.checked = estado.textos === 'breves';
    segDisp.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.valor === estado.dispositivo)));
  }

  // ---------- atajos (Alt+...) para no pisar las teclas de la direccion ----------
  window.addEventListener('keydown', (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const acc = {
      KeyP: () => set('pantalla', ciclar(pantallas, estado.pantalla)),
      KeyN: () => {
        const ms = muestrasPorPantalla[estado.pantalla] ?? [];
        if (ms.length) set('muestra', ciclar(ms, estado.muestra));
      },
      KeyA: () => set('era', ciclar(['auto', ...eras], estado.era)), // auto > pieza > ... > leyenda > auto
      KeyR: () => api.repetir(),
      KeyS: () => set('sonido', !estado.sonido),
      KeyM: () => set('reducido', !estado.reducido),
      KeyI: () => set('inst', !estado.inst),
      KeyW: () => set('webgl', !estado.webgl),
      KeyG: () => set('fps', !estado.fps),
      KeyZ: () => set('peor', !estado.peor),
      KeyT: () => set('textos', estado.textos === 'breves' ? 'completos' : 'breves'),
      KeyC: () => set('dispositivo', estado.dispositivo === 'celular' ? 'escritorio' : 'celular'),
      KeyH: () => abrirHoy(),
      KeyV: () => set('abierto', !estado.abierto),
    }[e.code];
    if (!acc) return;
    e.preventDefault();
    acc();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !visorHoy.hidden) cerrarHoy();
  });
  // Si alguien cambia el hash a mano (o el indice le pone otro hash al iframe), se re-lee todo.
  window.addEventListener('hashchange', () => {
    const nuevo = normalizar(params());
    if (cambiosEntre(estado, nuevo).length) aplicar(nuevo);
  });
  // Si el sistema cambia prefers-reduced-motion, los directores se enteran.
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => opciones.alCambiar?.(copia(), ['reducido']));

  document.body.appendChild(host);
  aplicarAlDocumento();
  history.replaceState(null, '', '#' + serializar(estado));
  if (estado.fps) iniciarFps();
  renderControles();
  if (estado.dispositivo === 'celular' && !enMarco && estado.panel) irACelular();
  opciones.alCambiar?.(copia(), Object.keys(estado));
  return api;
}
