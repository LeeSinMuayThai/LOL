// El inicio (PLANUI §0.2; portado de `vitrina/fusion/js/inicio.js` con `op=linea`, el champ select de §4.10). La primera
// vez, una intro de ~3 s salteable: el brillo del monitor, "15 años. Una pieza.", la luz que se abre y LOLERO. Después,
// la selección como el champ select del cliente, dentro de la luz y el bitono del inicio:
//   - el invocador (tu handle), el servidor (la región: la dificultad) y el perfil en una línea;
//   - la línea como pestañas con glifos arriba de la grilla; cada línea recuerda sus mains (el motor solo deja mains de tu
//     línea, así que la pestaña ES la línea);
//   - los retratos grandes en bitono (el tile de Data Dragon); apuntar uno es el aura: su arte va a la luz y su nombre se
//     escribe grande a la derecha;
//   - las 3 ranuras como cartas de carga verticales que se llenan con un barrido de luz (la primera libre muestra al
//     apuntado, como el hover del cliente);
//   - BLOQUEAR (`#run`), el gesto de la ceremonia (fx/ceremonia.js): las cartas se traban y la carrera arranca.
// A la derecha, "Continuar" como placa con el arte de tu main, el desafío del día y tus últimas carreras.
//
// El estado de la elección vive acá adentro (`getSeleccion`). La región y el perfil se pueden soltar (`null`: los decide
// la seed); la línea y los 3 mains son obligatorios para BLOQUEAR. Sin red, los retratos y las cartas quedan como tiles
// con el nombre (el juego sigue igual).
import { miles, linkDeResultado } from '../resultado.js';
import { medallaDeGoldenRoad } from '../core/trayectoria.js';
import { claveDe } from '../core/mundo.js';
import { cargarImagen, urlTile, urlCarga, urlCentrada } from '../fx/arte.js';
import { pintarCampeon, fijarColor } from '../fx/color.js';
import { bloquear as bloquearCeremonia } from '../fx/ceremonia.js';
import { glifoRol, icono } from '../fx/iconos.js';
import { el, animar, leerColor, duotono, reducido, inst, EXPO, DUR } from '../fx/util.js';

const ETIQUETA_STAT = {
  mecanica: 'Mecánica', macro: 'Macro', teamfight: 'Teamfight', laneo: 'Laneo',
  shotcalling: 'Shotcalling', adaptabilidad: 'Adaptabilidad'
};
const ETIQUETA_TAG = {
  tanque: 'Tanque', bruiser: 'Bruiser', asesino: 'Asesino', mago_control: 'Mago de control', escalado: 'Escala',
  early_game: 'Early game', engage: 'Engage', splitpush: 'Splitpush', enchanter: 'Enchanter'
};
// La línea con la que abre el champ select si nunca jugaste (después, la de tu última carrera).
const ROL_POR_DEFECTO = 'mid';
const CLAVE_INTRO = 'lolero-intro-vista';
const INTRO_MS = 3000;
// Los tiempos y tamaños del champ select (los de la vitrina, `CS` de inicio.js).
const CS = {
  retrato: 132, // lado interno del lienzo de cada retrato (se ve a ~64 px: el doble de densidad)
  carta: [308, 560], // la carta de carga de Data Dragon, a su tamaño
  focoRetrato: [0.5, 0.26],
  focoCarta: [0.5, 0.18],
  brilloRetrato: 1.16,
  brilloCarta: 1.06,
  luzTinta: 0.46, // cuánto se acerca la luz del bitono de las piezas a la tinta clara (un retrato chico no se oscurece)
  llenar: 560,
  pieRetardo: 180,
  pieDur: 300,
  rebote: 300,
  traba: 380,
  trabaPaso: 90,
  nombreEntra: 340,
  retratoPaso: 14,
  cartaPaso: 90
};
// Lo que tarda la ceremonia de BLOQUEAR antes de arrancar la carrera: la última carta trabada.
const ESPERA_BLOQUEAR = CS.traba + CS.trabaPaso * 2;
// Los controles donde Enter es "activar esto" y no "bloquear".
const CONTROL = 'button, [role="radio"], a[href], input, select, textarea, summary';

function nodo(etiqueta, clase, texto) {
  const n = document.createElement(etiqueta);
  if (clase) n.className = clase;
  if (texto !== undefined) n.textContent = texto;
  return n;
}

// `elements`: los nodos del inicio declarados en `index.html`. `modulos`: los de `app.js` (CAMPEONES, ROLES, BALANCE...).
// `opciones`: `alBloquear()` (arranca la carrera), `mundo` (el puente del ambiente, `shell.js`), `sonido` (`sonidoFx`),
// `rapido()` (INST o movimiento reducido).
export function crearPantallaInicio(elements, modulos, { alBloquear, mundo, sonido, rapido = () => false } = {}) {
  const {
    rolGrid, campeonGrid, poolContador, runButton, draftSlots, perfilGrid, perfilTexto, regionGrid, regionTexto,
    rolTexto, foco, titulo, verIntro, continuarArte, setup
  } = elements;
  const { CAMPEONES, BALANCE, ROLES, IDS_ROL } = modulos;
  const MAINS = BALANCE.mundo.campeonesIniciales;
  const quieto = () => rapido() || reducido() || inst();

  let rolElegido = ROL_POR_DEFECTO;
  // K4-C: el perfil que resuelve los eventos que no son bifurcación. `null` = lo decide la seed.
  let perfilElegido = null;
  // K5-B: la región de origen (`regionId`). `null` = la sortea la seed.
  let regionElegida = null;
  // Los mains de cada línea (claves de Data Dragon): cambiar de pestaña no borra lo elegido en otra.
  const porRol = {};
  const elegidos = () => (porRol[rolElegido] ??= []);
  let bloqueado = false;
  let enIntro = false;
  let focoKey = null;

  const catalogo = new Map(CAMPEONES.map((c) => [c.ddragon ?? claveDe(c.name), c]));
  const deRol = (rol) => CAMPEONES.filter((c) => c.role === rol && !c.debut);
  const nombreDe = (key) => catalogo.get(key)?.name ?? key;
  const listos = () => elegidos().length === MAINS;

  // --- el bitono de las piezas: cada lienzo recuerda su imagen (para repintarse) ---
  const lienzos = new Map();
  const colores = () => {
    const luz = leerColor('--luz');
    const tinta = leerColor('--ink');
    return [leerColor('--bg-void'), luz.map((v, i) => v + (tinta[i] - v) * CS.luzTinta)];
  };
  function pintar(canvas, img, opciones) {
    if (!img) return;
    lienzos.set(canvas, { img, opciones });
    // El inicio es 100 % duotono (LINEA.md §2): la curva del color se fija acá, monte o no el ambiente.
    fijarColor('inicio');
    pintarCampeon(canvas, img, ...colores(), { ...opciones, mezcla: 0 });
  }

  // --- el servidor (la región) ---
  function renderRegiones() {
    const regiones = modulos.REGIONES_DE_ORIGEN ?? [];
    regionGrid.replaceChildren(...regiones.map((opcion) => {
      const boton = nodo('button', 'in-server');
      boton.type = 'button';
      boton.dataset.id = opcion.regionId;
      boton.setAttribute('role', 'radio');
      boton.setAttribute('aria-checked', String(opcion.regionId === regionElegida));
      const nombre = nodo('span', 'solo-lectores');
      nombre.textContent = opcion.region;
      boton.title = opcion.region;
      boton.append(nodo('b', null, opcion.regionId), nodo('span', 'in-server-liga', opcion.liga), nombre);
      boton.addEventListener('click', () => {
        regionElegida = regionElegida === opcion.regionId ? null : opcion.regionId;
        sonido?.clic?.();
        renderRegiones();
      });
      return boton;
    }));
    const elegida = regiones.find((opcion) => opcion.regionId === regionElegida);
    regionTexto.textContent = elegida
      ? elegida.texto
      : 'Si no elegís, la región sale de la seed. La región es la dificultad: llegar a primera, ganar el Mundial.';
    regionTexto.title = regionTexto.textContent;
  }

  // --- el perfil, en una línea ---
  function renderPerfiles() {
    const { IDS_PERFIL, nombreDePerfil, descripcionDePerfil } = modulos;
    perfilGrid.replaceChildren(...IDS_PERFIL.map((id) => {
      const boton = nodo('button', 'in-perfil', nombreDePerfil(id));
      boton.type = 'button';
      boton.setAttribute('role', 'radio');
      boton.setAttribute('aria-checked', String(id === perfilElegido));
      boton.addEventListener('click', () => {
        perfilElegido = perfilElegido === id ? null : id;
        sonido?.clic?.();
        renderPerfiles();
      });
      return boton;
    }));
    // K4c (plan anual): el plan del primer año sale del perfil; K5c: cuánto grindea soloQ. La línea lo dice (regla 15).
    const plan = perfilElegido && modulos.textoDePlanInicial ? ` ${modulos.textoDePlanInicial(perfilElegido)}` : '';
    const soloQ = perfilElegido && modulos.soloQDePerfil ? ` ${modulos.soloQDePerfil(perfilElegido)}` : '';
    perfilTexto.textContent = perfilElegido
      ? `${descripcionDePerfil(perfilElegido)} Decide por vos lo chico; lo grande lo decidís vos, y te va corriendo el perfil.${plan}${soloQ}`
      : 'Si no elegís, lo decide la seed. El perfil decide por vos lo chico; lo grande lo decidís vos.';
    perfilTexto.title = perfilTexto.textContent;
  }

  // --- la línea: las pestañas con glifos ---
  function renderRoles() {
    rolGrid.replaceChildren(...IDS_ROL.map((rol) => {
      const boton = nodo('button', 'in-cs-rol');
      boton.type = 'button';
      boton.dataset.id = rol;
      boton.setAttribute('role', 'radio');
      boton.setAttribute('aria-checked', String(rol === rolElegido));
      boton.setAttribute('aria-label', ROLES[rol].label);
      const etiqueta = nodo('span', null, ROLES[rol].label);
      etiqueta.setAttribute('aria-hidden', 'true');
      boton.append(glifoRol(rol), etiqueta);
      boton.addEventListener('click', () => cambiarRol(rol));
      return boton;
    }));
    const clave = modulos.atributosClave(rolElegido).map((stat) => ETIQUETA_STAT[stat]).join(' y ');
    rolTexto.textContent = `${ROLES[rolElegido].tono} Vive de: ${clave}. ${ROLES[rolElegido].costo}`;
    rolTexto.title = rolTexto.textContent;
    campeonGrid.setAttribute('aria-label', `Campeones de ${ROLES[rolElegido].label}`);
  }

  // --- los retratos ---
  function renderGrilla() {
    campeonGrid.replaceChildren(...deRol(rolElegido).map((c) => {
      const key = c.ddragon ?? claveDe(c.name);
      const lienzo = el('canvas', { class: 'in-cs-arte', width: String(CS.retrato), height: String(CS.retrato), 'aria-hidden': 'true' });
      const boton = el('button', { type: 'button', class: 'in-cs-retrato', 'data-key': key, 'data-campeon': key, 'aria-label': c.name }, [
        lienzo,
        el('span', { class: 'in-cs-mini', 'aria-hidden': 'true', text: c.name }),
        el('span', { class: 'in-cs-orden', 'aria-hidden': 'true' })
      ]);
      boton.addEventListener('click', () => alternar(key));
      cargarImagen(urlTile(key)).then((img) => pintar(lienzo, img, { foco: CS.focoRetrato, brillo: CS.brilloRetrato }));
      return boton;
    }));
    marcar();
  }

  // --- las ranuras: cartas de carga verticales ---
  const cartas = Array.from({ length: MAINS }, (_, i) => {
    const lienzo = el('canvas', { class: 'in-cs-carta-arte', width: String(CS.carta[0]), height: String(CS.carta[1]), 'aria-hidden': 'true' });
    const nombre = el('b', { class: 'in-cs-carta-nombre' });
    const pie = el('span', { class: 'in-cs-carta-pie', 'aria-hidden': 'true' }, [el('span', { class: 'in-cs-carta-k', text: `Main ${i + 1}` }), nombre]);
    const barrido = el('span', { class: 'in-cs-carta-barrido', 'aria-hidden': 'true' });
    const marco = el('span', { class: 'in-cs-carta-marco', 'aria-hidden': 'true' });
    const vacia = el('span', { class: 'in-cs-carta-vacia', 'aria-hidden': 'true' }, [el('b', { text: String(i + 1) }), el('span', { text: 'Libre' })]);
    const quitar = el('button', { type: 'button', class: 'in-cs-carta-quitar', 'aria-label': `Sacar el main ${i + 1}`, title: 'Sacar' }, [el('span', { 'aria-hidden': 'true', text: '×' })]);
    const li = el('li', { class: 'in-cs-carta' }, [vacia, lienzo, barrido, pie, marco, quitar]);
    quitar.addEventListener('click', () => {
      const key = elegidos()[i];
      if (key) alternar(key);
    });
    return { li, lienzo, nombre, pie, barrido, marco, key: null, modo: 'vacia' };
  });
  draftSlots.replaceChildren(...cartas.map((c) => c.li));

  function llenar(c, delay = 0) {
    animar(c.lienzo, [{ clipPath: 'inset(100% 0 0 0)', filter: 'brightness(1.9)' }, { clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)' }], { delay, dur: CS.llenar });
    animar(c.barrido, [{ opacity: 1, transform: 'translateY(100%)' }, { opacity: 1, transform: 'translateY(0)', offset: 0.85 }, { opacity: 0, transform: 'translateY(0)' }], { delay, dur: CS.llenar, fill: 'none' });
    animar(c.pie, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: delay + CS.pieRetardo, dur: CS.pieDur });
  }
  // Cada carta: `llena` (un main), `fantasma` (la primera libre muestra al apuntado) o `vacia`.
  const elegible = (key) => deRol(rolElegido).some((c) => (c.ddragon ?? claveDe(c.name)) === key);
  function pintarCartas({ nueva = -1 } = {}) {
    const lista = elegidos();
    const fantasma = !bloqueado && focoKey && !lista.includes(focoKey) && elegible(focoKey) ? focoKey : null;
    cartas.forEach((c, i) => {
      const key = lista[i] ?? (i === lista.length ? fantasma : null);
      const modo = lista[i] ? 'llena' : key ? 'fantasma' : 'vacia';
      if (key === c.key && modo === c.modo) return;
      const mismoArte = key === c.key;
      c.key = key;
      c.modo = modo;
      c.li.classList.toggle('llena', modo === 'llena');
      c.li.classList.toggle('fantasma', modo === 'fantasma');
      if (modo === 'llena') c.li.dataset.campeon = key;
      else delete c.li.dataset.campeon;
      c.li.setAttribute('aria-label', `Main ${i + 1}: ${modo === 'llena' ? nombreDe(key) : 'libre'}`);
      c.nombre.textContent = key ? nombreDe(key) : '';
      c.li.style.setProperty('--in-cs-largo-carta', String(Math.max(6, (key ? nombreDe(key) : '').length)));
      if (!key) {
        lienzos.delete(c.lienzo);
        c.lienzo.getContext?.('2d')?.clearRect(0, 0, c.lienzo.width, c.lienzo.height);
        return;
      }
      if (mismoArte && modo === 'llena') {
        if (i === nueva) llenar(c);
        return;
      }
      cargarImagen(urlCarga(key)).then((img) => {
        if (c.key !== key) return;
        pintar(c.lienzo, img, { foco: CS.focoCarta, brillo: CS.brilloCarta });
        if (modo === 'fantasma') animar(c.lienzo, [{ opacity: 0 }, {}], { dur: DUR.entra });
        else if (i === nueva) llenar(c);
      });
    });
  }

  // La flecha de la placa de "Continuar" (la vitrina).
  if (continuarArte && !continuarArte.parentElement?.querySelector('.in-cont-flecha')) {
    continuarArte.parentElement?.append(icono('flecha', { clase: 'ln-ico in-cont-flecha' }));
  }

  // --- BLOQUEAR (la ceremonia sobre #run) ---
  const vivo = el('p', { class: 'solo-lectores', 'aria-live': 'polite' });
  rolTexto.after(vivo);
  const bq = bloquearCeremonia({ texto: 'Bloquear', tecla: 'Enter', sonido, nodo: runButton, alBloquear: trabar });
  const habilitar = () => bq.habilitar(listos() && !bloqueado && !enIntro);

  function trabar() {
    bloqueado = true;
    champSelect().dataset.bloqueado = '';
    for (const b of champSelect().querySelectorAll('.in-cs-rol, .in-cs-retrato, .in-cs-carta-quitar')) b.setAttribute('aria-disabled', 'true');
    cartas.forEach((c, i) => {
      const t = i * CS.trabaPaso;
      c.li.classList.add('trabada');
      animar(c.li, [{ transform: 'none' }, { transform: 'translateY(-6px) scale(1.04)', offset: 0.35 }, { transform: 'translateY(1px) scale(0.985)', offset: 0.7 }, { transform: 'none' }], { delay: t, dur: CS.traba, easing: 'ease-out' });
      animar(c.marco, [{ opacity: 0, clipPath: 'inset(100% 0 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { delay: t, dur: CS.traba });
      animar(c.barrido, [{ opacity: 0.85, transform: 'translateY(100%)' }, { opacity: 0, transform: 'translateY(0)' }], { delay: t, dur: CS.traba, fill: 'none' });
    });
    const nombres = elegidos().map(nombreDe);
    vivo.textContent = `Mains bloqueados: ${nombres.join(', ')}.`;
    // La carrera arranca cuando la última carta quedó trabada (en INST o con movimiento reducido, ya).
    if (quieto()) alBloquear?.();
    else setTimeout(() => alBloquear?.(), ESPERA_BLOQUEAR);
  }
  function destrabar() {
    bloqueado = false;
    delete champSelect().dataset.bloqueado;
    for (const b of champSelect().querySelectorAll('[aria-disabled]')) b.removeAttribute('aria-disabled');
    for (const c of cartas) c.li.classList.remove('trabada');
    bq.rearmar();
    habilitar();
  }
  const champSelect = () => campeonGrid.closest('.in-cs') ?? setup;

  // --- elegir y cambiar de línea ---
  function marcar() {
    const lista = elegidos();
    campeonGrid.querySelectorAll('.in-cs-retrato').forEach((b) => {
      const i = lista.indexOf(b.dataset.key);
      b.setAttribute('aria-pressed', String(i >= 0));
      b.querySelector('.in-cs-orden').textContent = i >= 0 ? String(i + 1) : '';
    });
    poolContador.textContent = `${lista.length}/${MAINS}`;
    champSelect().toggleAttribute('data-listo', listos());
    habilitar();
    estadoFoco();
  }
  function alternar(key) {
    if (bloqueado) return;
    const lista = elegidos();
    const i = lista.indexOf(key);
    if (i >= 0) lista.splice(i, 1);
    else if (!listos()) lista.push(key);
    else {
      animar(draftSlots, [{ transform: 'none' }, { transform: 'translateX(-4px)', offset: 0.25 }, { transform: 'translateX(4px)', offset: 0.6 }, { transform: 'none' }], { dur: CS.rebote, easing: 'ease-out' });
      vivo.textContent = `Ya tenés ${MAINS} mains: sacá uno para cambiarlo.`;
      return;
    }
    sonido?.clic?.();
    marcar();
    pintarCartas({ nueva: i < 0 ? lista.length - 1 : -1 });
    vivo.textContent = i < 0 ? `${nombreDe(key)}, main ${lista.length}.` : `${nombreDe(key)} sale de tus mains.`;
  }
  function cambiarRol(id) {
    if (bloqueado || id === rolElegido) return;
    rolElegido = id;
    sonido?.clic?.();
    renderRoles();
    renderGrilla();
    pintarCartas();
    campeonGrid.querySelectorAll('.in-cs-retrato').forEach((b, i) => animar(b, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { delay: i * CS.retratoPaso, dur: DUR.entra }));
    // La luz va al primero de la línea nueva (si no hay un main elegido): la pestaña se ve en el mundo.
    const primero = elegidos()[0] ?? (deRol(id)[0] ? deRol(id)[0].ddragon ?? claveDe(deRol(id)[0].name) : null);
    if (primero) irA(primero);
  }

  // --- el foco: el nombre del apuntado, grande, sobre su arte (escucha al aura) ---
  const focoK = el('p', { class: 'in-cs-foco-k' });
  const focoEstado = el('span', { class: 'in-cs-foco-estado' });
  const focoNombre = el('span', { class: 'in-cs-foco-int' });
  foco.replaceChildren(focoK, el('p', { class: 'in-cs-foco-nombre' }, [focoNombre]));
  function estadoFoco() {
    const i = elegidos().indexOf(focoKey);
    focoEstado.textContent = i >= 0 ? `Main ${i + 1}` : '';
    focoEstado.hidden = i < 0;
  }
  function mostrarFoco(key, { animado = true } = {}) {
    if (!key || key === focoKey) return;
    focoKey = key;
    const c = catalogo.get(key);
    const rol = c?.role ?? rolElegido;
    focoK.replaceChildren(glifoRol(rol), el('span', { text: ROLES[rol]?.label ?? rol }), ...(c?.tags ?? []).map((t) => el('span', { text: ETIQUETA_TAG[t] ?? t })), focoEstado);
    focoNombre.textContent = c?.name ?? key;
    foco.style.setProperty('--in-cs-largo', String(Math.max(1, (c?.name ?? key).length)));
    estadoFoco();
    pintarCartas();
    if (animado) animar(focoNombre, [{ opacity: 0, transform: 'translateY(32%)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { dur: CS.nombreEntra });
  }
  // Llevar la luz a un campeón desde el código: el mundo (el arte, pegajoso) y el nombre grande.
  function irA(key) {
    mundo?.declarar?.({ arte: key, pegajosa: true, encuadre: 'inicio', velo: 0.75 });
    mostrarFoco(key);
  }
  let soltarAura = () => {};
  mundo?.cuandoMonte?.((api) => {
    soltarAura = api.aura?.alCambiar?.((key) => mostrarFoco(key)) ?? (() => {});
  });

  // Enter sobre un control del inicio (un retrato, una pestaña, el handle) lo activa: BLOQUEAR (que escucha Enter en la
  // captura del documento) no se lo lleva. Se corta acá, en la captura de la ventana, antes de que llegue al documento.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !setup.checkVisibility?.()) return;
    const t = e.target;
    if (t instanceof Element && t !== runButton && t.closest('.inicio') && t.closest(CONTROL)) e.stopPropagation();
  }, true);

  // --- la intro (la primera vez; después, "Ver intro") ---
  let intro = null;
  function armarIntro() {
    const r = titulo.getBoundingClientRect();
    const t = el('p', { class: 'intro-titulo', text: 'Lolero', style: { left: `${r.left}px`, top: `${r.top}px` } });
    return el('div', { class: 'intro', 'aria-hidden': 'true' }, [
      el('div', { class: 'intro-negro' }),
      el('div', { class: 'intro-monitor' }),
      el('p', { class: 'intro-frase' }, [el('span', { text: '15 años.' }), el('span', { text: 'Una pieza.' })]),
      t,
      el('p', { class: 'intro-saltar', text: 'Espacio para saltear' })
    ]);
  }
  function cerrarIntro() {
    intro?.remove();
    intro = null;
    titulo.style.visibility = '';
    enIntro = false;
    habilitar();
    document.removeEventListener('keydown', teclaIntro, true);
  }
  function saltearIntro() {
    if (!intro) return;
    for (const a of intro.getAnimations({ subtree: true })) a.finish();
    for (const a of setup.getAnimations({ subtree: true })) a.finish();
    cerrarIntro();
  }
  function teclaIntro(e) {
    if (intro && (e.code === 'Space' || e.key === 'Escape' || e.key === 'Enter')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      saltearIntro();
    }
  }
  function correrIntro() {
    if (quieto()) return;
    intro?.remove();
    intro = armarIntro();
    enIntro = true;
    habilitar();
    document.body.append(intro);
    intro.addEventListener('click', saltearIntro);
    document.addEventListener('keydown', teclaIntro, true);
    const [negro, monitor, frase, t] = intro.children;
    const [f1, f2] = frase.children;
    titulo.style.visibility = 'hidden';
    animar(monitor, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.5)' }, { opacity: 0.5, offset: 0.12 }, { opacity: 0.25, offset: 0.2 }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { dur: 900, easing: 'ease-out', fill: 'both' });
    animar(monitor, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(9)', opacity: 0 }], { delay: 1500, dur: 900, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
    animar(f1, [{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(8px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { delay: 300, dur: 520, fill: 'both' });
    animar(f2, [{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(8px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { delay: 720, dur: 520, fill: 'both' });
    animar(frase, [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px)' }], { delay: 1450, dur: 300, easing: 'ease-in', fill: 'forwards' });
    animar(negro, [{ clipPath: 'circle(150% at 50% 62%)' }, { clipPath: 'circle(0% at 50% 62%)' }], { delay: 1550, dur: 900, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'both' });
    animar(t, [{ opacity: 0, letterSpacing: '0.5em', filter: 'blur(14px)' }, { opacity: 1, letterSpacing: '-0.02em', filter: 'blur(0)' }], { delay: 1850, dur: 900, easing: EXPO, fill: 'both' });
    animar(intro.querySelector('.intro-saltar'), [{ opacity: 0 }, { opacity: 1 }], { delay: 400, dur: 400, fill: 'both' });
    sonido?.barrido?.();
    mundo?.fx?.()?.pulso?.('logro');
    entradaSeleccion(2500);
    const fin = animar(intro, [{ opacity: 1 }, { opacity: 1 }], { dur: INTRO_MS });
    if (fin) fin.finished.then(cerrarIntro, () => {});
    else cerrarIntro();
  }
  verIntro?.addEventListener('click', () => correrIntro());

  // --- la entrada: luz -> rótulo -> título -> el formulario -> el champ select -> el lado ---
  function entradaSeleccion(base = 0) {
    if (quieto()) return;
    const subir = (n, delay, desde = 14) => n && animar(n, [{ opacity: 0, transform: `translateY(${desde}px)` }, { opacity: 1, transform: 'none' }], { delay });
    if (base === 0) animar(titulo, [{ opacity: 0, letterSpacing: '0.12em', filter: 'blur(10px)' }, { opacity: 1, letterSpacing: '-0.02em', filter: 'blur(0)' }], { delay: 40, dur: 760 });
    subir(setup.querySelector('.in-kicker'), base, 8);
    subir(setup.querySelector('.in-bajada'), base + 200, 8);
    [...setup.querySelectorAll('.in-form > .in-campo')].forEach((f, i) => subir(f, base + 260 + i * 60));
    rolGrid.querySelectorAll('.in-cs-rol').forEach((b, i) => subir(b, base + 360 + i * 30, 8));
    campeonGrid.querySelectorAll('.in-cs-retrato').forEach((b, i) => animar(b, [{ opacity: 0, transform: 'scale(.72)' }, { opacity: 1, transform: 'none' }], { delay: base + 460 + i * CS.retratoPaso, dur: 360 }));
    cartas.forEach((c, i) => animar(c.li, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { delay: base + 560 + i * CS.cartaPaso, dur: DUR.larga }));
    animar(focoK, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: base + 300, dur: DUR.entra });
    animar(focoNombre, [{ opacity: 0, transform: 'translateY(32%)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: base + 380, dur: CS.nombreEntra });
    [...setup.querySelectorAll('.in-lado > :not([hidden])')].forEach((x, i) => subir(x, base + 600 + i * 80));
  }
  const primeraVez = () => {
    try {
      return !localStorage.getItem(CLAVE_INTRO) && !navigator.webdriver;
    } catch {
      return false;
    }
  };

  // El rol con el que abre: el de tu última carrera (el historial), o mid.
  function rolInicial(historial) {
    const ultimo = historial?.entradas?.[0]?.rol;
    return IDS_ROL.includes(ultimo) ? ultimo : ROL_POR_DEFECTO;
  }

  return {
    render(historial = null) {
      rolElegido = rolInicial(historial);
      renderRegiones();
      renderPerfiles();
      renderRoles();
      renderGrilla();
      const primero = deRol(rolElegido)[0];
      focoKey = null;
      irA(elegidos()[0] ?? (primero ? primero.ddragon ?? claveDe(primero.name) : null));
      pintarCartas();
      habilitar();
    },
    // La entrada (la intro la primera vez). La llama `app.js` cuando el inicio ya tiene sus datos.
    entrar() {
      if (!quieto() && primeraVez()) {
        try {
          localStorage.setItem(CLAVE_INTRO, '1');
        } catch { /* sin almacenamiento */ }
        correrIntro();
      } else {
        entradaSeleccion(0);
      }
    },
    reset(historial = null) {
      for (const k of Object.keys(porRol)) delete porRol[k];
      perfilElegido = null;
      regionElegida = null;
      destrabar();
      this.render(historial);
      entradaSeleccion(0);
    },
    // Si la carrera no pudo arrancar, BLOQUEAR vuelve a estar disponible.
    destrabar,
    getSeleccion() {
      return { rol: rolElegido, campeones: elegidos().map(nombreDe), perfil: perfilElegido, region: regionElegida };
    },
    // La placa de "Continuar": el arte de tu main de la carrera guardada, en el bitono del inicio.
    pintarContinuar(state) {
      const main = state?.player?.campeonDelSplit ?? state?.player?.championPool?.[0]?.name ?? null;
      const key = main ? claveDe(main) : null;
      if (!key || !continuarArte) return;
      continuarArte.closest('[data-campeon]')?.removeAttribute('data-campeon');
      continuarArte.parentElement?.setAttribute('data-campeon', key);
      cargarImagen(urlCentrada(key)).then((img) => {
        if (img) duotono(img, leerColor('--bg-void'), leerColor('--luz-pieza'), continuarArte.width, continuarArte.height, { canvas: continuarArte, foco: [0.5, 0.3], brillo: 1.1 });
      });
    },
    destruir() {
      soltarAura();
      bq.destruir();
    }
  };
}

// --- K1-B: el desafío del día y el historial local -------------------------

// La sección del desafío (la vitrina: el kicker, quién te toca hoy, la línea y el botón con tu mejor). `fecha` es la de
// hoy (UTC) o la que trajo `?desafio=`; si la del link no es la de hoy, se ofrece también la de hoy. `mejor` es tu mejor
// resultado en ese desafío con esta versión, o `null`. `jugador` (opcional): quién te toca ({ handle, rol, rolEtiqueta,
// liga, mains }), sacado de la seed del día.
export function renderDesafio(contenedor, { fecha, hoy, mejor, jugador = null }, alJugar) {
  const esHoy = fecha === hoy;
  const boton = nodo('button', 'in-boton desafio-btn', 'Jugar el desafío');
  boton.type = 'button';
  boton.addEventListener('click', () => alJugar(fecha));
  const partes = [nodo('p', 'in-mini-k', esHoy ? `Desafío del día · ${fecha}` : `Desafío del link · ${fecha}`)];
  if (jugador) {
    const quien = nodo('p', 'in-desafio-quien');
    quien.append(glifoRol(jugador.rol), nodo('b', null, jugador.handle), nodo('span', null, [jugador.rolEtiqueta, jugador.liga, jugador.mains?.join(', ')].filter(Boolean).join(' · ')));
    partes.push(quien);
  }
  partes.push(nodo('p', 'in-mini-t', esHoy
    ? 'Misma carrera para todos hoy: rol, región y pool salen de la fecha. Vos ponés las decisiones.'
    : 'Misma carrera para todos los que jueguen esta fecha: rol, región y pool salen de ahí.'));
  const pie = nodo('div', 'in-desafio-pie');
  pie.append(boton);
  if (mejor) {
    const intentos = mejor.intentos > 1 ? ` · ${mejor.intentos} intentos` : '';
    pie.append(nodo('span', 'in-mini-t desafio-mejor', `Tu mejor: ${miles(mejor.total)} pts · ${mejor.nivel}${intentos}`));
  }
  if (!esHoy) {
    const deHoy = nodo('button', 'btn-mas desafio-hoy', `O el de hoy (${hoy})`);
    deHoy.type = 'button';
    deHoy.addEventListener('click', () => alJugar(hoy));
    pie.append(deHoy);
  }
  partes.push(pie);
  contenedor.replaceChildren(...partes);
  contenedor.hidden = false;
}

// Tus últimas carreras (localStorage, `resultado.js`): el puntaje grande y el detalle. Cada puntaje es un link que vuelve
// a cargar esa carrera (la seed o la fecha del desafío).
export function renderHistorial(contenedor, historial, { etiquetaRol, version }) {
  if (historial.entradas.length === 0) {
    contenedor.replaceChildren();
    contenedor.hidden = true;
    return;
  }
  const record = historial.record ? ` · récord ${miles(historial.record.total)}` : '';
  const lista = nodo('ol', 'historial-lista');
  for (const entrada of historial.entradas) {
    const fila = nodo('li', 'historial-fila');
    const pts = nodo('a', 'historial-pts', `${miles(entrada.total)} pts`);
    pts.href = linkDeResultado(entrada, location.href);
    pts.title = entrada.desafio ? `Volver a jugar el desafío ${entrada.desafio}` : `Volver a jugar la seed ${entrada.seed}`;
    const detalle = [
      entrada.handle,
      etiquetaRol(entrada.rol),
      entrada.nivel,
      entrada.desafio ? `Desafío ${entrada.desafio}` : null,
      entrada.jugadoEn === entrada.desafio ? null : entrada.jugadoEn,
      entrada.intentos > 1 ? `${entrada.intentos} intentos` : null,
      entrada.version !== version ? `v ${entrada.version}, otra versión` : null
    ].filter(Boolean).join(' · ');
    const texto = nodo('span', 'historial-detalle', detalle);
    // FASE V (V5): el Golden Road de esa carrera, con su año.
    const medalla = medallaDeGoldenRoad(entrada.goldenRoads ?? []);
    if (medalla) texto.prepend(nodo('span', 'historial-medalla', `${medalla} `));
    fila.append(pts, texto);
    lista.appendChild(fila);
  }
  contenedor.replaceChildren(nodo('p', 'in-mini-k', `Tus últimas carreras${record}`), lista);
  contenedor.hidden = false;
}

