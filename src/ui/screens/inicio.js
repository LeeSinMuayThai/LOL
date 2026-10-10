// La pantalla de inicio (PLANUI U2a): champ select sobre el ambiente de la era pieza.
// El estado de la elección sigue acá adentro. El kit se usa por window.__fx (lo monta shell.js).
import { glifoRol } from '../fx/iconos.js';
import { bloquear as bloquearCeremonia } from '../fx/ceremonia.js';
import { urlCarga, urlIcono, cargarImagen } from '../fx/arte.js';
import { pintarCampeon } from '../fx/color.js';
import { leerColor, quieto } from '../fx/util.js';
import { keyDdragonDeCampeon } from '../components/campeonTile.js';
import { sonidoFx } from '../sonido.js';
import { miles, linkDeResultado } from '../resultado.js';
import { medallaDeGoldenRoad } from '../core/trayectoria.js';

const ETIQUETA_STAT = {
  mecanica: 'Mecánica', macro: 'Macro', teamfight: 'Teamfight', laneo: 'Laneo',
  shotcalling: 'Shotcalling', adaptabilidad: 'Adaptabilidad'
};
const CLAVE_INTRO = 'lolcs-intro-vista';
const INTRO_MS = 3000;
const ANCHO_CARGA = 154;
const ALTO_CARGA = 280;

function introVista() {
  try { return localStorage.getItem(CLAVE_INTRO) === '1'; } catch { return true; }
}
function marcarIntroVista() {
  try { localStorage.setItem(CLAVE_INTRO, '1'); } catch { /* sin almacenamiento */ }
}

export function crearPantallaInicio(elements, modulos) {
  const { rolGrid, campeonGrid, poolContador, runButton, draftSlots, perfilGrid, perfilTexto, regionGrid, regionTexto } = elements;
  let rolElegido = null;
  // K4-C: el perfil que resuelve los eventos que no son bifurcación. `null` = lo decide la seed.
  let perfilElegido = null;
  // K5-B: la región de origen (`regionId`). `null` = la sortea la seed.
  let regionElegida = null;
  let camposElegidos = [];
  let apuntado = null;
  let ceremonia = null;
  let observadorRun = null;
  let introNodo = null;
  let introActiva = false;
  let introTecla = null;
  let introObs = null;
  let soltarAura = null;
  let esperaFx = 0;

  function setup() {
    return campeonGrid.closest('#setup');
  }

  function listoParaBloquear() {
    return Boolean(rolElegido && camposElegidos.length === modulos.BALANCE.mundo.campeonesIniciales);
  }

  function actualizarBoton() {
    runButton.disabled = !listoParaBloquear();
    ceremonia?.habilitar(listoParaBloquear() && !introActiva);
  }

  function sincronizarRun() {
    if (!ceremonia) return;
    if (!runButton.disabled && ceremonia.nodo.dataset.estado === 'bloqueado') {
      ceremonia.destruir();
      ceremonia = null;
      asegurarCeremonia();
      return;
    }
    actualizarBoton();
  }

  function asegurarCeremonia() {
    if (ceremonia?.nodo?.isConnected) {
      actualizarBoton();
      return;
    }
    ceremonia = bloquearCeremonia({
      texto: 'BLOQUEAR',
      tecla: 'Enter',
      sonido: sonidoFx,
      alBloquear: () => runButton.click()
    });
    ceremonia.nodo.id = 'run';
    if (runButton.id === 'run') runButton.removeAttribute('id');
    if (runButton.isConnected) runButton.replaceWith(ceremonia.nodo);
    else runButton.parentElement?.appendChild(ceremonia.nodo);
    if (!observadorRun) {
      observadorRun = new MutationObserver(() => sincronizarRun());
      observadorRun.observe(runButton, { attributes: true, attributeFilter: ['disabled'] });
    }
    actualizarBoton();
  }

  function saltarIntro() {
    introActiva = false;
    if (introTecla) document.removeEventListener('keydown', introTecla, true);
    introTecla = null;
    introObs?.disconnect();
    introObs = null;
    introNodo?.remove();
    introNodo = null;
    marcarIntroVista();
    actualizarBoton();
  }

  function correrIntro({ forzar = false } = {}) {
    if (introNodo) saltarIntro();
    if (!forzar && introVista()) return;
    if (quieto()) {
      marcarIntroVista();
      actualizarBoton();
      return;
    }
    const doc = campeonGrid.ownerDocument;
    introActiva = true;
    actualizarBoton();
    const nodo = doc.createElement('div');
    nodo.className = 'in-intro';
    nodo.setAttribute('role', 'presentation');
    const negro = doc.createElement('div');
    negro.className = 'in-intro-negro';
    const monitor = doc.createElement('div');
    monitor.className = 'in-intro-monitor';
    const frase = doc.createElement('p');
    frase.className = 'in-intro-frase';
    const a = doc.createElement('span');
    a.textContent = '15 años.';
    const b = doc.createElement('span');
    b.textContent = 'Una pieza.';
    frase.append(a, b);
    const titulo = doc.createElement('p');
    titulo.className = 'in-intro-titulo';
    titulo.textContent = 'Lolero';
    const saltear = doc.createElement('p');
    saltear.className = 'in-intro-saltear';
    saltear.textContent = 'Clic o tecla para saltear';
    nodo.append(negro, monitor, frase, titulo, saltear);
    doc.body.appendChild(nodo);
    introNodo = nodo;
    introTecla = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      saltarIntro();
    };
    doc.addEventListener('keydown', introTecla, true);
    nodo.addEventListener('click', () => saltarIntro());
    introObs = new MutationObserver(() => { if (quieto()) saltarIntro(); });
    introObs.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-inst', 'data-reducido'] });
    doc.defaultView.setTimeout(() => { if (introNodo === nodo) saltarIntro(); }, INTRO_MS);
  }

  function asegurarMarco() {
    const panel = setup();
    if (!panel || panel.querySelector('.in-titulo')) return;
    const titulo = panel.ownerDocument.createElement('p');
    titulo.className = 'in-titulo';
    titulo.textContent = 'Lolero';
    panel.insertBefore(titulo, panel.firstChild);
    const ver = panel.ownerDocument.createElement('button');
    ver.type = 'button';
    ver.className = 'in-ver-intro';
    ver.textContent = 'ver intro';
    ver.addEventListener('click', () => correrIntro({ forzar: true }));
    titulo.after(ver);
    panel.querySelector('#handleInput')?.closest('.paso')?.classList.add('in-identidad');
    regionGrid.closest('.paso')?.classList.add('in-identidad');
    perfilGrid?.closest('.paso')?.classList.add('in-identidad');
    rolGrid.closest('.paso')?.classList.add('in-roles');
    draftSlots?.closest('.paso')?.classList.add('in-mains');
    if (draftSlots && !panel.querySelector('.in-apuntado')) {
      const nombre = panel.ownerDocument.createElement('p');
      nombre.className = 'in-apuntado';
      nombre.setAttribute('aria-live', 'polite');
      draftSlots.before(nombre);
    }
  }

  function pintarCarta(canvas, nombre) {
    const key = keyDdragonDeCampeon(nombre);
    const sombra = leerColor('--tono-era-pieza-noche');
    const luz = leerColor('--luz-pieza');
    const listo = (img) => {
      if (!canvas.isConnected) return;
      pintarCampeon(canvas, img, sombra, luz, { mezcla: 0 });
    };
    if (!key) {
      listo(null);
      return;
    }
    cargarImagen(urlCarga(key)).then(listo);
  }

  function fijarApuntado(nombre) {
    if (apuntado === nombre) return;
    apuntado = nombre;
    const nodo = setup()?.querySelector('.in-apuntado');
    if (nodo) nodo.textContent = nombre ?? '';
    renderSlots();
  }

  function nombreDeClave(key) {
    if (!key) return '';
    const c = modulos.CAMPEONES.find((x) => keyDdragonDeCampeon(x.name) === key);
    return c?.name ?? '';
  }

  function engancharAura() {
    const fx = globalThis.__fx;
    if (!fx?.aura) return false;
    soltarAura?.();
    soltarAura = fx.aura.alCambiar((key) => fijarApuntado(nombreDeClave(key) || apuntado));
    const key = keyDdragonDeCampeon(camposElegidos[0] ?? apuntado ?? '') 
      ?? (rolElegido ? keyDdragonDeCampeon(modulos.CAMPEONES.find((c) => c.role === rolElegido && !c.debut)?.name) : null);
    fx.aura.pantalla(key, { pegajosa: true });
    if (key) fx.aura.ir(key);
    if (setup()?.isConnected && fx.fondo) fx.fondo({ contexto: 'inicio', instantaneo: true });
    return true;
  }

  function cuandoFx() {
    if (engancharAura()) return;
    const vista = campeonGrid.ownerDocument.defaultView;
    vista.clearInterval(esperaFx);
    let n = 0;
    esperaFx = vista.setInterval(() => {
      n += 1;
      if (engancharAura() || n > 40) vista.clearInterval(esperaFx);
    }, 50);
  }

  function renderSlots() {
    if (!draftSlots) return;
    const objetivo = modulos.BALANCE.mundo.campeonesIniciales;
    let fantasmaUsado = false;
    draftSlots.replaceChildren(...Array.from({ length: objetivo }, (_, i) => {
      const nombre = camposElegidos[i];
      const fantasma = !nombre && !fantasmaUsado && apuntado && !camposElegidos.includes(apuntado)
        ? (fantasmaUsado = true, apuntado)
        : null;
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'draft-slot in-ranura'
        + (nombre ? ' draft-slot--lleno in-ranura--llena' : '')
        + (fantasma ? ' in-ranura--fantasma' : '');
      slot.disabled = !nombre;
      const canvas = document.createElement('canvas');
      canvas.className = 'in-carga';
      canvas.width = ANCHO_CARGA;
      canvas.height = ALTO_CARGA;
      slot.appendChild(canvas);
      const etiqueta = document.createElement('span');
      etiqueta.className = 'draft-slot-nombre';
      etiqueta.textContent = nombre || fantasma || String(i + 1);
      slot.appendChild(etiqueta);
      const quien = nombre || fantasma;
      if (quien) pintarCarta(canvas, quien);
      if (nombre) {
        slot.title = `Quitar ${nombre}`;
        slot.addEventListener('click', () => {
          camposElegidos = camposElegidos.filter((n) => n !== nombre);
          renderCampeones();
          actualizarBoton();
          cuandoFx();
        });
      }
      return slot;
    }));
  }

  function renderCampeones() {
    renderSlots();
    if (!rolElegido) {
      campeonGrid.replaceChildren();
      poolContador.textContent = 'Elegí una línea primero.';
      return;
    }

    const { CAMPEONES, BALANCE } = modulos;
    const objetivo = BALANCE.mundo.campeonesIniciales;
    const elegibles = CAMPEONES.filter((campeon) => campeon.role === rolElegido && !campeon.debut);

    campeonGrid.replaceChildren(...elegibles.map((campeon) => {
      const elegido = camposElegidos.includes(campeon.name);
      const key = keyDdragonDeCampeon(campeon.name);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'campeon-card campeon-tile' + (elegido ? ' elegido campeon-tile--elegido' : '');
      card.disabled = !elegido && camposElegidos.length >= objetivo;
      card.setAttribute('aria-pressed', elegido ? 'true' : 'false');
      card.setAttribute('aria-label', campeon.name);
      if (key) card.dataset.campeon = key;

      if (key) {
        const img = document.createElement('img');
        img.className = 'in-retrato';
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        img.src = urlIcono(key);
        img.addEventListener('error', () => img.remove(), { once: true });
        card.appendChild(img);
      }

      const nombre = document.createElement('span');
      nombre.className = 'campeon-nombre';
      nombre.textContent = campeon.name;
      card.appendChild(nombre);

      const elegir = () => {
        camposElegidos = elegido
          ? camposElegidos.filter((n) => n !== campeon.name)
          : [...camposElegidos, campeon.name].slice(0, objetivo);
        fijarApuntado(campeon.name);
        renderCampeones();
        actualizarBoton();
        cuandoFx();
      };
      card.addEventListener('click', elegir);
      card.addEventListener('pointerenter', () => fijarApuntado(campeon.name));
      return card;
    }));

    poolContador.textContent = `${camposElegidos.length} / ${objetivo} elegidos.`
      + (camposElegidos.length === objetivo
        ? ' Un pool ancho aguanta mejor un cambio de meta; uno angosto rinde más mientras el meta te acompañe.'
        : '');
    if (!apuntado) {
      const primero = camposElegidos[0] ?? elegibles[0]?.name ?? '';
      if (primero) {
        apuntado = primero;
        const nodo = setup()?.querySelector('.in-apuntado');
        if (nodo) nodo.textContent = primero;
        renderSlots();
      }
    }
  }

  // K4-C: cuatro botones chicos en una fila (dos en 375 px) y una línea que dice qué hace el elegido. Tocar el
  // elegido lo suelta (vuelve a decidir la seed). Sin ids crudos: el nombre y la descripción salen del dato.
  function renderPerfiles() {
    if (!perfilGrid) {
      return;
    }
    const { IDS_PERFIL, nombreDePerfil, descripcionDePerfil } = modulos;
    perfilGrid.replaceChildren(...IDS_PERFIL.map((id) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'perfil-chip' + (id === perfilElegido ? ' elegido' : '');
      boton.setAttribute('role', 'radio');
      boton.setAttribute('aria-checked', id === perfilElegido ? 'true' : 'false');
      boton.textContent = nombreDePerfil(id);
      boton.addEventListener('click', () => {
        perfilElegido = perfilElegido === id ? null : id;
        renderPerfiles();
      });
      return boton;
    }));
    if (perfilTexto) {
      // K4c (plan anual): el plan de práctica del primer año sale del perfil; la línea lo dice (regla 15).
      const plan = perfilElegido && modulos.textoDePlanInicial ? ` ${modulos.textoDePlanInicial(perfilElegido)}` : '';
      // K5c (no-pro, regla 12): cuánto grindea soloQ el perfil en la etapa amateur (lo que decide su semana).
      const soloQ = perfilElegido && modulos.soloQDePerfil ? ` ${modulos.soloQDePerfil(perfilElegido)}` : '';
      perfilTexto.textContent = perfilElegido
        ? `${descripcionDePerfil(perfilElegido)} Decide por vos lo chico; lo grande lo decidís vos, y te va corriendo el perfil.${plan}${soloQ}`
        : 'Si no elegís, lo decide la seed. El perfil decide por vos lo chico; lo grande lo decidís vos.';
    }
  }

  // K5-B: la región, como selector de servidor. La línea de abajo es la dificultad de la elegida, tal
  // como la escribe `core/mundo.js:regionesDeOrigen` desde `leagues.json` (sin ids crudos: nombre y texto).
  function renderRegiones() {
    if (!regionGrid) {
      return;
    }
    const regiones = modulos.REGIONES_DE_ORIGEN ?? [];
    regionGrid.replaceChildren(...regiones.map((opcion) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'perfil-chip in-servidor' + (opcion.regionId === regionElegida ? ' elegido' : '');
      boton.setAttribute('role', 'radio');
      boton.setAttribute('aria-checked', opcion.regionId === regionElegida ? 'true' : 'false');
      boton.textContent = opcion.region;
      boton.addEventListener('click', () => {
        regionElegida = regionElegida === opcion.regionId ? null : opcion.regionId;
        renderRegiones();
      });
      return boton;
    }));
    if (regionTexto) {
      const elegida = regiones.find((opcion) => opcion.regionId === regionElegida);
      regionTexto.textContent = elegida
        ? elegida.texto
        : 'Si no elegís, la región sale de la seed. La región es la dificultad: llegar a primera, ganar el Mundial.';
    }
  }

  function renderRoles() {
    const { IDS_ROL, ROLES, atributosClave } = modulos;
    rolGrid.replaceChildren(...IDS_ROL.map((rol) => {
      const elegido = rol === rolElegido;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'rol-card in-rol' + (elegido ? ' elegido' : '');
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', elegido ? 'true' : 'false');
      card.setAttribute('aria-label', ROLES[rol].label);
      card.appendChild(glifoRol(rol));

      const nombre = document.createElement('span');
      nombre.className = 'rol-nombre';
      nombre.textContent = ROLES[rol].label;
      card.appendChild(nombre);

      if (elegido) {
        const clave = document.createElement('span');
        clave.className = 'rol-tono';
        clave.textContent = 'Vive de: ' + atributosClave(rol).map((stat) => ETIQUETA_STAT[stat]).join(' y ') + '.';
        card.appendChild(clave);
      }

      card.addEventListener('click', () => {
        if (rolElegido === rol) return;
        rolElegido = rol;
        camposElegidos = [];
        apuntado = null;
        const nombre = setup()?.querySelector('.in-apuntado');
        if (nombre) nombre.textContent = '';
        renderRoles();
        renderCampeones();
        actualizarBoton();
        cuandoFx();
      });

      return card;
    }));
  }

  return {
    render() {
      asegurarMarco();
      correrIntro();
      renderRegiones();
      renderPerfiles();
      renderRoles();
      renderCampeones();
      asegurarCeremonia();
      cuandoFx();
    },
    reset() {
      rolElegido = null;
      perfilElegido = null;
      regionElegida = null;
      apuntado = null;
      camposElegidos = [];
      renderRegiones();
      renderPerfiles();
      renderRoles();
      renderCampeones();
      actualizarBoton();
      cuandoFx();
    },
    getSeleccion() {
      return { rol: rolElegido, campeones: camposElegidos, perfil: perfilElegido, region: regionElegida };
    }
  };
}

// --- K1-B: el desafío del día y el historial local -------------------------

function nodo(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  el.className = clase;
  if (texto !== undefined) {
    el.textContent = texto;
  }
  return el;
}

// La tarjeta del desafío, arriba del draft: es la otra puerta de entrada, sin
// elegir nada. `fecha` es la de hoy (UTC) o la que trajo `?desafio=`; si la
// del link no es la de hoy, se ofrece también la de hoy. `mejor` es tu mejor
// resultado en ese desafío con esta versión (del historial), o `null`.
export function renderDesafio(contenedor, { fecha, hoy, mejor }, alJugar) {
  const esHoy = fecha === hoy;
  const boton = nodo('button', 'desafio-btn', 'Jugar el desafío');
  boton.type = 'button';
  boton.addEventListener('click', () => alJugar(fecha));
  const partes = [
    nodo('div', 'desafio-kicker', esHoy ? `Desafío del día · ${fecha}` : `Desafío del link · ${fecha}`),
    nodo('p', 'desafio-texto', esHoy
      ? 'Misma carrera para todos hoy: rol, región y pool salen de la fecha. Vos ponés las decisiones.'
      : 'Misma carrera para todos los que jueguen esta fecha: rol, región y pool salen de ahí.'),
    boton
  ];
  if (mejor) {
    const intentos = mejor.intentos > 1 ? ` · ${mejor.intentos} intentos` : '';
    partes.push(nodo('div', 'desafio-mejor', `Tu mejor: ${miles(mejor.total)} pts · ${mejor.nivel}${intentos}`));
  }
  if (!esHoy) {
    const deHoy = nodo('button', 'desafio-hoy', `O el de hoy (${hoy})`);
    deHoy.type = 'button';
    deHoy.addEventListener('click', () => alJugar(hoy));
    partes.push(deHoy);
  }
  contenedor.replaceChildren(...partes);
  contenedor.hidden = false;
}

// Tus últimos resultados (localStorage, `resultado.js`). Cada fila es un link
// que vuelve a cargar esa carrera (la seed o la fecha del desafío).
export function renderHistorial(contenedor, historial, { etiquetaRol, version }) {
  if (historial.entradas.length === 0) {
    contenedor.replaceChildren();
    contenedor.hidden = true;
    return;
  }
  const record = historial.record
    ? ` · tu récord: ${miles(historial.record.total)} pts (${historial.record.nivel})`
    : '';
  const lista = nodo('ol', 'historial-lista');
  for (const entrada of historial.entradas) {
    const fila = nodo('li', 'historial-fila');
    const que = nodo('a', 'historial-que', entrada.desafio ? `Desafío ${entrada.desafio}` : `Seed ${entrada.seed}`);
    que.href = linkDeResultado(entrada, location.href);
    const detalle = [
      entrada.handle,
      etiquetaRol(entrada.rol),
      entrada.nivel,
      entrada.jugadoEn === entrada.desafio ? null : entrada.jugadoEn,
      entrada.intentos > 1 ? `${entrada.intentos} intentos` : null,
      entrada.version !== version ? `v ${entrada.version}, otra versión` : null
    ].filter(Boolean).join(' · ');
    fila.append(que, nodo('span', 'historial-pts', `${miles(entrada.total)} pts`));
    // FASE V (V5): el Golden Road de esa carrera, con su año; las entradas de antes de V5 no lo traen y no muestran nada.
    const medalla = medallaDeGoldenRoad(entrada.goldenRoads ?? []);
    if (medalla) {
      fila.appendChild(nodo('span', 'historial-medalla', medalla));
    }
    fila.appendChild(nodo('span', 'historial-detalle', detalle));
    lista.appendChild(fila);
  }
  contenedor.replaceChildren(nodo('div', 'historial-titulo', `Tus últimos resultados${record}`), lista);
  contenedor.hidden = false;
}
