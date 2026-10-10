// El Inicio. La primera vez, una intro de ~3 s salteable: el brillo del monitor, "15 años. Una pieza.", la luz se abre
// y entra UN SPLIT MÁS. Despues, la seleccion: invocador, servidor, perfil en una linea, los 5 roles como glifos sobre
// la Grieta, la grilla de retratos del rol (el campeon apuntado pasa a ser el arte del ambiente, con un cruce), las 3
// ranuras y BLOQUEAR que se enciende con 3 mains. "Continuar" como placa con el arte de tu main; desafio e historial.
// Con `op=linea` (PLANUI §4.10), la eleccion de campeones es un champ select (crearChampSelect, abajo): el rol como
// pestañas con glifos arriba de la grilla, retratos grandes, el nombre del apuntado grande sobre su arte, las 3 ranuras
// como cartas de carga verticales que se llenan y BLOQUEAR, el gesto de la ceremonia (ceremonia.js). Sin op, igual.
import { cargarImagen, urlIcono, urlCentrada, urlTile, urlCarga } from '../../comun/arte.js';
import { el, entrar, animar, reducido, inst, celular, leerColor, duotono, EXPO, DUR } from './util.js';
import { icono, glifoRol } from './iconos.js';
import { bloquear as bloquearCeremonia } from './ceremonia.js';
import { pintarCampeon } from './color.js';

const CLAVE_VISTA = 'fusion:intro-vista';
const MAINS = 3;
const INTRO = 3000;

export function crearInicio({ datos, amb, sonido, peor, op, aura }) {
  // PLANUI §4.10: con `op=linea` la eleccion de campeones es el champ select; sin op (y con las demas), la de siempre
  const linea = op === 'linea';
  const ini = datos.inicio;
  const j = ini.jugador;
  const cat = ini.catalogos;
  const handleInicial = peor ? datos.peorCaso.handle : j.handle;
  let rol = j.rol;
  let region = j.regionId;
  let perfil = j.perfil;
  const elegidos = j.mains.map((m) => m.ddragon);
  let apuntado = elegidos[0];

  const raiz = el('section', { class: 'inicio', 'data-pieza': 'inicio' });
  const titulo = el('h1', { class: 'in-titulo', 'data-foco': '', tabindex: '-1', text: 'Un split más' });
  const cabeza = el('header', { class: 'in-cabeza' }, [
    el('p', { class: 'in-kicker' }, [el('i', { class: 'punto-luz' }), 'Nueva carrera']),
    titulo,
    el('p', { class: 'in-bajada', text: 'De los 15 años al retiro. Tu carrera de LoL, un split a la vez.' }),
  ]);

  // --- invocador
  const input = el('input', { class: 'in-handle', id: 'in-handle', value: handleInicial, maxlength: '16', spellcheck: 'false', autocomplete: 'off' });
  const filaNombre = campo('Invocador', input, 'in-handle');

  // --- servidor (region)
  const servidores = el('div', { class: 'in-servidores', role: 'radiogroup', 'aria-label': 'Servidor' });
  const textoRegion = el('p', { class: 'in-linea' });
  const pintarRegion = () => {
    const r = cat.regiones.find((x) => x.regionId === region);
    textoRegion.textContent = r ? r.texto : cat.textoSinRegion;
    servidores.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === region)));
  };
  for (const r of cat.regiones) {
    servidores.append(el('button', { type: 'button', role: 'radio', class: 'in-server', 'data-id': r.regionId, onclick: () => ((region = r.regionId), pintarRegion(), sonido?.clic()) }, [el('b', { text: r.regionId }), el('span', { text: r.liga })]));
  }
  pintarRegion();
  const filaServidor = campo('Servidor', el('div', {}, [servidores, textoRegion]));

  // --- perfil en una linea
  const perfiles = el('div', { class: 'in-perfiles', role: 'radiogroup', 'aria-label': 'Perfil' });
  const textoPerfil = el('span', { class: 'in-perfil-texto' });
  const pintarPerfil = () => {
    const p = cat.perfiles.find((x) => x.id === perfil);
    textoPerfil.textContent = p?.descripcion ?? '';
    perfiles.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === perfil)));
  };
  for (const p of cat.perfiles) perfiles.append(el('button', { type: 'button', role: 'radio', class: 'in-perfil', 'data-id': p.id, text: p.nombre, onclick: () => ((perfil = p.id), pintarPerfil(), sonido?.clic()) }));
  pintarPerfil();
  const filaPerfil = campo('Perfil', el('div', { class: 'in-perfil-linea' }, [perfiles, textoPerfil]));

  // --- roles como glifos
  const roles = el('div', { class: 'in-roles', role: 'radiogroup', 'aria-label': 'Rol' });
  const textoRol = el('p', { class: 'in-linea' });
  const pintarRol = () => {
    const r = cat.roles.find((x) => x.id === rol);
    textoRol.textContent = r ? `${r.tono} ${r.viveDe}` : '';
    roles.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === rol)));
  };
  for (const r of cat.roles) {
    roles.append(el('button', { type: 'button', role: 'radio', class: 'in-rol', 'data-id': r.id, onclick: () => cambiarRol(r.id) }, [glifoRol(r.id, 'glifo-rol grande'), el('span', { text: r.etiqueta })]));
  }
  const filaRol = campo('Rol', el('div', {}, [roles, textoRol]));

  // --- retratos del rol + ranuras
  const grilla = el('div', { class: 'in-grilla', role: 'group', 'aria-label': 'Campeones del rol' });
  const ranuras = el('ol', { class: 'in-ranuras', 'aria-label': 'Tus 3 mains' });
  const bloquear = el('button', { type: 'button', class: 'in-bloquear', text: 'Bloquear' });
  const cargas = [];
  function pintarGrilla() {
    grilla.textContent = '';
    for (const c of cat.campeonesPorRol[rol] ?? []) {
      const b = el('button', { type: 'button', class: 'in-retrato', 'data-key': c.ddragon, 'data-campeon': c.ddragon, 'aria-pressed': String(elegidos.includes(c.ddragon)), 'aria-label': c.name, title: c.name }, [el('span', { class: 'in-orden' })]);
      const carga = cargarImagen(urlIcono(c.ddragon, datos.meta)).then((img) => {
        if (img) b.prepend(img.cloneNode());
      });
      cargas.push(carga);
      // apuntar un retrato es el aura (js/aura.js, por data-campeon): su splash pasa a ser la luz de la pagina
      b.addEventListener('click', () => alternar(c.ddragon));
      grilla.append(b);
    }
    pintarElegidos();
  }
  function pintarElegidos() {
    grilla.querySelectorAll('.in-retrato').forEach((b) => {
      const i = elegidos.indexOf(b.dataset.key);
      b.setAttribute('aria-pressed', String(i >= 0));
      b.querySelector('.in-orden').textContent = i >= 0 ? String(i + 1) : '';
    });
    ranuras.textContent = '';
    for (let i = 0; i < MAINS; i++) {
      const key = elegidos[i];
      const c = key ? Object.values(cat.campeonesPorRol).flat().find((x) => x.ddragon === key) ?? j.mains.find((m) => m.ddragon === key) : null;
      const r = el('li', { class: 'in-ranura' + (key ? ' llena' : ''), 'data-campeon': key ?? null }, [el('span', { class: 'in-ranura-n', text: String(i + 1) }), el('span', { class: 'in-ranura-cara' }), el('b', { text: c?.name ?? 'Libre' })]);
      if (key) cargarImagen(urlIcono(key, datos.meta)).then((img) => img && r.querySelector('.in-ranura-cara').append(img.cloneNode()));
      ranuras.append(r);
    }
    const listo = elegidos.length === MAINS;
    bloquear.disabled = !listo;
    bloquear.classList.toggle('encendido', listo);
    bloquear.textContent = listo ? 'Bloquear' : `Elegí ${MAINS - elegidos.length} más`;
  }
  function alternar(key) {
    const i = elegidos.indexOf(key);
    if (i >= 0) elegidos.splice(i, 1);
    else if (elegidos.length < MAINS) elegidos.push(key);
    else return;
    sonido?.clic();
    pintarElegidos();
    const nueva = ranuras.children[Math.max(0, elegidos.indexOf(key))];
    if (nueva && i < 0) animar(nueva, [{ transform: 'scale(.82)', filter: 'brightness(2.2)' }, { transform: 'none', filter: 'none' }], { dur: 420 });
  }
  function cambiarRol(id) {
    if (id === rol) return;
    rol = id;
    elegidos.length = 0;
    sonido?.clic();
    pintarRol();
    pintarGrilla();
    grilla.querySelectorAll('.in-retrato').forEach((b, i) => entrar(b, i * 14, 8));
  }
  // con `op=linea` el rol, la grilla, las ranuras y BLOQUEAR son el champ select (no se pintan los de siempre)
  if (!linea) {
    pintarRol();
    pintarGrilla();
  }
  const filaCampeones = campo(`Campeones · ${MAINS} mains`, el('div', { class: 'in-campeones' }, [grilla, el('p', { class: 'in-linea', text: cat.textoDelPool })]));
  const filaRanuras = el('div', { class: 'in-cierre' }, [ranuras, bloquear]);
  const cs = linea ? crearChampSelect({ datos, sonido, aura, cargas }) : null;

  const form = el('div', { class: linea ? 'in-form in-form-cs' : 'in-form' }, linea ? [filaNombre, filaServidor, filaPerfil, cs.nodo] : [filaNombre, filaServidor, filaPerfil, filaRol, filaCampeones, filaRanuras]);

  // --- lado derecho: continuar, desafio, historial
  const cont = ini.continuar;
  const placaArte = el('canvas', { class: 'in-cont-arte', width: '520', height: '220', 'aria-hidden': 'true' });
  const continuar = el('button', { type: 'button', class: 'in-continuar', 'data-campeon': j.mains[0].ddragon, 'aria-label': `${cont.texto}: ${cont.detalle}` }, [
    placaArte,
    el('span', { class: 'in-cont-txt' }, [
      el('span', { class: 'in-cont-k', text: cont.texto }),
      el('b', { text: `${peor ? datos.peorCaso.handle : cont.partes.handle} · ${cont.partes.rol}` }),
      el('span', { text: `${cont.partes.edad} años · ${peor ? datos.peorCaso.org.nombre : cont.partes.org} · ${cont.partes.anio}` }),
    ]),
    icono('flecha', { clase: 'ico in-cont-flecha' }),
  ]);
  const des = ini.desafio.conMejor ?? ini.desafio.sinJugar;
  const jd = ini.desafio.jugadorDelDia;
  const desafio = el('div', { class: 'in-desafio' }, [
    el('p', { class: 'in-mini-k', text: des.kicker }),
    el('p', { class: 'in-desafio-quien' }, [glifoRol(jd.rol), el('b', { text: jd.handle }), el('span', { text: `${jd.rolEtiqueta} · ${jd.liga} · ${jd.mains.map((m) => m.name).join(', ')}` })]),
    el('p', { class: 'in-mini-t', text: des.texto }),
    el('div', { class: 'in-desafio-pie' }, [el('button', { type: 'button', class: 'in-boton', text: des.boton }), des.textoMejor ? el('span', { class: 'in-mini-t', text: des.textoMejor }) : null]),
  ]);
  const historial = el('div', { class: 'in-historial' }, [
    el('p', { class: 'in-mini-k', text: 'Tus últimas carreras' }),
    el('ol', {}, ini.historial.filas.map((f) => el('li', {}, [el('b', { text: f.pts }), el('span', { text: f.detalle })]))),
  ]);
  const lado = el('aside', { class: 'in-lado' }, [continuar, desafio, historial]);
  if (linea) {
    // el nombre del apuntado va sobre su arte (a la derecha, en la escritorio; en el celular, debajo del titulo)
    raiz.classList.add('in-op-linea');
    raiz.append(cabeza, cs.foco, form, lado);
  } else raiz.append(cabeza, form, lado);

  const main = j.mains[0].ddragon;
  cargas.push(
    cargarImagen(urlCentrada(main, datos.meta)).then((img) => {
      if (img) duotono(img, leerColor('--bg-void'), leerColor('--luz-pieza'), 520, 220, { canvas: placaArte, foco: [0.5, 0.3], brillo: 1.1 });
    }),
  );

  // --- la intro (primera vez; o con Repetir)
  let intro = null;
  function armarIntro() {
    const r = titulo.getBoundingClientRect();
    const t = el('p', { class: 'intro-titulo', text: 'Un split más', style: { left: `${r.left}px`, top: `${r.top}px` } });
    const nodo = el('div', { class: 'intro', 'aria-hidden': 'true' }, [
      el('div', { class: 'intro-negro' }),
      el('div', { class: 'intro-monitor' }),
      el('p', { class: 'intro-frase' }, [el('span', { text: '15 años.' }), el('span', { text: 'Una pieza.' })]),
      t,
      el('p', { class: 'intro-saltar', text: 'Espacio para saltear' }),
    ]);
    return nodo;
  }
  function saltearIntro() {
    if (!intro) return;
    for (const a of intro.getAnimations({ subtree: true })) a.finish();
    for (const a of form.getAnimations({ subtree: true }).concat(lado.getAnimations({ subtree: true }), cabeza.getAnimations({ subtree: true }))) a.finish();
    intro?.remove();
    intro = null;
    cs?.enIntro(false);
  }
  function correrIntro() {
    intro?.remove();
    intro = armarIntro();
    // (op=linea) mientras corre la intro, Enter la saltea: BLOQUEAR no lo toma
    cs?.enIntro(true);
    raiz.append(intro);
    intro.addEventListener('click', saltearIntro);
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
    const fin = animar(intro, [{ opacity: 1 }, { opacity: 1 }], { dur: INTRO });
    sonido?.barrido();
    amb.pulso('logro');
    entradaSeleccion(2500);
    const cerrar = () => {
      intro?.remove();
      intro = null;
      titulo.style.visibility = '';
      cs?.enIntro(false);
    };
    if (fin) fin.finished.then(cerrar, () => {});
    else cerrar();
  }

  function entradaSeleccion(base = 0) {
    if (base === 0) animar(titulo, [{ opacity: 0, letterSpacing: '0.12em', filter: 'blur(10px)' }, { opacity: 1, letterSpacing: '-0.02em', filter: 'blur(0)' }], { delay: 40, dur: 760 });
    entrar(cabeza.querySelector('.in-kicker'), base, 8);
    entrar(cabeza.querySelector('.in-bajada'), base + 200, 8);
    [...form.children].forEach((f, i) => entrar(f, base + 260 + i * 60, 14));
    grilla.querySelectorAll('.in-retrato').forEach((b, i) => animar(b, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { delay: base + 520 + i * 18, dur: 360 }));
    cs?.entrar(base);
    [...lado.children].forEach((x, i) => entrar(x, base + 600 + i * 80, 14));
  }

  const primeraVez = () => {
    try {
      return !localStorage.getItem(CLAVE_VISTA) && !navigator.webdriver;
    } catch {
      return false;
    }
  };
  function entrada() {
    amb.ambiente({ arte: apuntado });
    if (!inst() && !reducido() && primeraVez()) {
      try {
        localStorage.setItem(CLAVE_VISTA, '1');
      } catch {
        /* sin almacenamiento */
      }
      correrIntro();
    } else entradaSeleccion(0);
  }

  return {
    nodo: raiz,
    entrar: entrada,
    repetir() {
      if (inst() || reducido()) return;
      correrIntro();
    },
    tecla(e) {
      if (intro && (e.code === 'Space' || e.key === 'Escape' || e.key === 'Enter')) {
        e.preventDefault();
        saltearIntro();
      }
    },
    listo: () => Promise.all(cargas),
    destruir() {
      intro?.remove();
      cs?.destruir();
    },
    // (op=linea) las piezas en bitono se repintan con la luz de la era nueva
    ...(cs ? { alCambiarEra: cs.alCambiarEra } : {}),
    arte: apuntado,
    auraPegajosa: true,
    animo: 'normal',
    encuadre: 'inicio',
    velo: 0.75,
  };
}

function campo(rotulo, control, para) {
  return el('div', { class: 'in-campo' }, [el(para ? 'label' : 'p', { class: 'in-rotulo', for: para ?? null, text: rotulo }), control]);
}

// ====================================================================================================== el champ select
// PLANUI §4.10 (op=linea). El usuario: "se podria trabajar un poco mas la parte donde elegis los campeones y eso quizas
// es muy simple". La eleccion se arma como el champ select del LoL, dentro de la luz y el bitono del inicio (toda pieza
// de campeon pasa por pintarCampeon de color.js, que en el inicio es duotono al 100 %):
//   - el rol son las pestañas con glifos arriba de la grilla, con tu rol preseleccionado. El motor solo deja mains de tu
//     rol (src/ui/screens/inicio.js), asi que la pestaña ES el rol (no hay un filtro aparte que mienta); cada rol
//     recuerda sus mains;
//   - los retratos son grandes (el tile de Data Dragon). Apuntar uno es el aura (regla 5): su arte va a la luz y su
//     nombre se escribe grande encima (el foco escucha al aura: el nombre y la luz cambian juntos);
//   - las 3 ranuras son cartas de carga verticales (308x560 de Data Dragon) que se llenan con un barrido de luz;
//   - BLOQUEAR es el gesto de la ceremonia (bloquear() de ceremonia.js): las cartas se traban con el filete del kit y
//     el boton da su unico destello. "Cambiar mains" lo deshace.
// Teclado: Tab recorre pestañas, retratos y BLOQUEAR; Enter o Espacio activan lo enfocado (Enter sobre un retrato lo
// elige, no bloquea); Enter sin foco en un control bloquea.
const CS = {
  retrato: 132, // lado interno del lienzo de cada retrato (se ve a ~64 px: el doble de densidad)
  carta: [308, 560], // la carta de carga de Data Dragon, a su tamaño
  focoRetrato: [0.5, 0.26],
  focoCarta: [0.5, 0.18],
  brilloRetrato: 1.16,
  brilloCarta: 1.06,
  luzTinta: 0.46, // cuanto se acerca la luz del bitono de las piezas a la tinta clara
  llenar: 560, // la carta se llena de abajo hacia arriba
  pieRetardo: 180, // el nombre de la carta entra detras del arte
  pieDur: 300,
  rebote: 300, // las ranuras llenas avisan que no entra otro
  traba: 380, // cada carta se traba al BLOQUEAR
  trabaPaso: 90,
  nombreEntra: 340, // el nombre grande del foco
  retratoPaso: 14, // la cascada de los retratos al entrar o al cambiar de rol
  cartaPaso: 90,
};
const ETIQUETA_TAG = { tanque: 'Tanque', bruiser: 'Bruiser', asesino: 'Asesino', mago_control: 'Mago de control', escalado: 'Escala', early_game: 'Early game', engage: 'Engage', splitpush: 'Splitpush', enchanter: 'Enchanter' };
// los controles donde Enter es "activar esto" y no "bloquear"
const CONTROL = 'button, [role="radio"], a[href], input, select, textarea';

function crearChampSelect({ datos, sonido, aura, cargas }) {
  const cat = datos.inicio.catalogos;
  const j = datos.inicio.jugador;
  const roles = cat.roles;
  const todos = Object.entries(cat.campeonesPorRol).flatMap(([r, lista]) => lista.map((c) => ({ ...c, rol: r })));
  const de = (key) => todos.find((c) => c.ddragon === key) ?? { name: key, tags: [], ...j.mains.find((m) => m.ddragon === key), rol: j.rol };
  const porRol = { [j.rol]: j.mains.map((m) => m.ddragon) };
  let rol = j.rol;
  let elegidos = porRol[rol];
  let bloqueado = false;
  let pausado = false;
  const listos = () => elegidos.length === MAINS;

  // --- el bitono: cada lienzo recuerda su imagen, para repintarse con la luz de otra era
  const lienzos = new Map();
  // la luz del bitono de las piezas: la de la era llevada hacia la tinta (como --luz-texto). Con la luz pura (un azul
  // hondo en la pieza) un retrato de ~60 px queda oscuro y no se reconoce
  const colores = () => {
    const luz = leerColor('--luz');
    const tinta = leerColor('--ink');
    return [leerColor('--bg-void'), luz.map((v, i) => v + (tinta[i] - v) * CS.luzTinta)];
  };
  function pintar(canvas, img, opciones) {
    lienzos.set(canvas, { img, opciones });
    pintarCampeon(canvas, img, ...colores(), opciones);
  }
  function repintar() {
    const [sombra, luz] = colores();
    for (const [canvas, x] of lienzos) {
      if (canvas.isConnected) pintarCampeon(canvas, x.img, sombra, luz, x.opciones);
      else lienzos.delete(canvas);
    }
  }

  // --- el rol: las pestañas con glifos
  const pestanas = el('div', { class: 'in-cs-roles', role: 'radiogroup', 'aria-label': 'Rol' });
  for (const r of roles) pestanas.append(el('button', { type: 'button', role: 'radio', class: 'in-cs-rol', 'data-id': r.id, 'aria-label': r.etiqueta, onclick: () => cambiarRol(r.id) }, [glifoRol(r.id), el('span', { text: r.etiqueta, 'aria-hidden': 'true' })]));
  const textoRol = el('p', { class: 'in-linea in-cs-rol-txt' });
  const grilla = el('div', { class: 'in-cs-grilla', role: 'group' });
  function pintarRol() {
    const r = roles.find((x) => x.id === rol);
    textoRol.textContent = r ? `${r.tono} ${r.viveDe}` : '';
    textoRol.title = textoRol.textContent;
    grilla.setAttribute('aria-label', `Campeones de ${r?.etiqueta ?? rol}`);
    pestanas.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === rol)));
  }

  // --- los retratos
  function pintarGrilla(registrar = false) {
    grilla.textContent = '';
    for (const c of cat.campeonesPorRol[rol] ?? []) {
      const lienzo = el('canvas', { class: 'in-cs-arte', width: String(CS.retrato), height: String(CS.retrato), 'aria-hidden': 'true' });
      // apuntar un retrato es el aura (js/aura.js, por data-campeon): su arte pasa a ser la luz de la pagina
      const b = el('button', { type: 'button', class: 'in-cs-retrato', 'data-key': c.ddragon, 'data-campeon': c.ddragon, 'aria-label': c.name, onclick: () => alternar(c.ddragon) }, [
        lienzo,
        el('span', { class: 'in-cs-mini', 'aria-hidden': 'true', text: c.name }),
        el('span', { class: 'in-cs-orden', 'aria-hidden': 'true' }),
      ]);
      const carga = cargarImagen(urlTile(c.ddragon, datos.meta)).then((img) => img && pintar(lienzo, img, { foco: CS.focoRetrato, brillo: CS.brilloRetrato }));
      if (registrar) cargas.push(carga);
      grilla.append(b);
    }
    marcar();
  }

  // --- las ranuras: cartas de carga verticales
  const cuenta = el('b', { class: 'in-cs-cuenta' });
  const cartas = Array.from({ length: MAINS }, (_, i) => {
    const lienzo = el('canvas', { class: 'in-cs-carta-arte', width: String(CS.carta[0]), height: String(CS.carta[1]), 'aria-hidden': 'true' });
    const nombre = el('b', { class: 'in-cs-carta-nombre' });
    const pie = el('span', { class: 'in-cs-carta-pie', 'aria-hidden': 'true' }, [el('span', { class: 'in-cs-carta-k', text: `Main ${i + 1}` }), nombre]);
    const barrido = el('span', { class: 'in-cs-carta-barrido', 'aria-hidden': 'true' });
    const marco = el('span', { class: 'in-cs-carta-marco', 'aria-hidden': 'true' });
    const vacia = el('span', { class: 'in-cs-carta-vacia', 'aria-hidden': 'true' }, [el('b', { text: String(i + 1) }), el('span', { text: 'Libre' })]);
    const li = el('li', { class: 'in-cs-carta' }, [vacia, lienzo, barrido, pie, marco]);
    return { li, lienzo, nombre, pie, barrido, marco, key: null, modo: 'vacia' };
  });
  const ranuras = el('ol', { class: 'in-cs-cartas', 'aria-label': `Tus ${MAINS} mains` }, cartas.map((c) => c.li));
  function llenar(c, delay = 0) {
    // el arte sube de abajo hacia arriba con una linea de luz en el borde, y el nombre entra detras
    animar(c.lienzo, [{ clipPath: 'inset(100% 0 0 0)', filter: 'brightness(1.9)' }, { clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)' }], { delay, dur: CS.llenar });
    animar(c.barrido, [{ opacity: 1, transform: 'translateY(100%)' }, { opacity: 1, transform: 'translateY(0)', offset: 0.85 }, { opacity: 0, transform: 'translateY(0)' }], { delay, dur: CS.llenar, fill: 'none' });
    animar(c.pie, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: delay + CS.pieRetardo, dur: CS.pieDur });
  }
  // Cada carta: `llena` (un main), `fantasma` (la primera libre muestra al apuntado, como el hover del cliente antes de
  // elegir) o `vacia`.
  const elegible = (key) => (cat.campeonesPorRol[rol] ?? []).some((c) => c.ddragon === key);
  function pintarCartas({ nueva = -1, registrar = false } = {}) {
    const fantasma = !bloqueado && focoKey && !elegidos.includes(focoKey) && elegible(focoKey) ? focoKey : null;
    cartas.forEach((c, i) => {
      const key = elegidos[i] ?? (i === elegidos.length ? fantasma : null);
      const modo = elegidos[i] ? 'llena' : key ? 'fantasma' : 'vacia';
      if (key === c.key && modo === c.modo) return;
      const mismoArte = key === c.key;
      c.key = key;
      c.modo = modo;
      const info = key ? de(key) : null;
      c.li.classList.toggle('llena', modo === 'llena');
      c.li.classList.toggle('fantasma', modo === 'fantasma');
      if (modo === 'llena') c.li.dataset.campeon = key;
      else delete c.li.dataset.campeon;
      c.li.setAttribute('aria-label', `Main ${i + 1}: ${modo === 'llena' ? info.name : 'libre'}`);
      c.nombre.textContent = info?.name ?? '';
      if (!key) {
        lienzos.delete(c.lienzo);
        c.lienzo.getContext('2d').clearRect(0, 0, c.lienzo.width, c.lienzo.height);
        return;
      }
      // el fantasma que se elige ya tiene su arte: solo se llena
      if (mismoArte && modo === 'llena') {
        if (i === nueva) llenar(c);
        return;
      }
      const carga = cargarImagen(urlCarga(key, datos.meta)).then((img) => {
        if (c.key !== key) return;
        if (img) pintar(c.lienzo, img, { foco: CS.focoCarta, brillo: CS.brilloCarta });
        if (modo === 'fantasma') animar(c.lienzo, [{ opacity: 0 }, {}], { dur: DUR.entra });
        else if (i === nueva) llenar(c);
        else if (!registrar) animar(c.li, [{ opacity: 0.4 }, { opacity: 1 }], { dur: DUR.entra });
      });
      if (registrar) cargas.push(carga);
    });
  }

  // --- BLOQUEAR (la ceremonia) y "Cambiar mains"
  const vivo = el('p', { class: 'sr', 'aria-live': 'polite' });
  const accion = el('div', { class: 'in-cs-accion' });
  const cambiar = el('button', { type: 'button', class: 'in-cs-cambiar', hidden: true, text: 'Cambiar mains', onclick: () => destrabar() });
  let bq = null;
  const habilitar = () => bq?.habilitar(listos() && !bloqueado && !pausado);
  function armarBloquear() {
    bq?.destruir();
    bq = bloquearCeremonia({ texto: 'Bloquear', tecla: 'Enter', sonido, alBloquear: trabar });
    bq.nodo.classList.add('in-cs-bloquear');
    accion.prepend(bq.nodo);
    habilitar();
  }
  const nombres = () => {
    const n = elegidos.map((k) => de(k).name);
    return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}` : n.join('');
  };
  function trabar() {
    bloqueado = true;
    nodo.dataset.bloqueado = '';
    for (const b of nodo.querySelectorAll('.in-cs-rol, .in-cs-retrato')) b.setAttribute('aria-disabled', 'true');
    // cada carta se traba: un golpe hacia abajo, el filete de la ceremonia que se cierra y la linea de luz que la cruza
    cartas.forEach((c, i) => {
      const t = i * CS.trabaPaso;
      c.li.classList.add('trabada');
      animar(c.li, [{ transform: 'none' }, { transform: 'translateY(-6px) scale(1.04)', offset: 0.35 }, { transform: 'translateY(1px) scale(0.985)', offset: 0.7 }, { transform: 'none' }], { delay: t, dur: CS.traba, easing: 'ease-out' });
      animar(c.marco, [{ opacity: 0, clipPath: 'inset(100% 0 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { delay: t, dur: CS.traba });
      animar(c.barrido, [{ opacity: 0.85, transform: 'translateY(100%)' }, { opacity: 0, transform: 'translateY(0)' }], { delay: t, dur: CS.traba, fill: 'none' });
    });
    cambiar.hidden = false;
    vivo.textContent = `Mains bloqueados: ${nombres()}.`;
  }
  function destrabar() {
    bloqueado = false;
    delete nodo.dataset.bloqueado;
    for (const b of nodo.querySelectorAll('[aria-disabled]')) b.removeAttribute('aria-disabled');
    for (const c of cartas) c.li.classList.remove('trabada');
    cambiar.hidden = true;
    sonido?.clic();
    armarBloquear();
    bq.nodo.focus();
    vivo.textContent = 'Mains sin bloquear.';
  }

  // --- elegir y cambiar de rol
  function marcar() {
    grilla.querySelectorAll('.in-cs-retrato').forEach((b) => {
      const i = elegidos.indexOf(b.dataset.key);
      b.setAttribute('aria-pressed', String(i >= 0));
      b.querySelector('.in-cs-orden').textContent = i >= 0 ? String(i + 1) : '';
    });
    cuenta.textContent = `${elegidos.length}/${MAINS}`;
    nodo.toggleAttribute('data-listo', listos());
    habilitar();
    estadoFoco();
  }
  function alternar(key) {
    if (bloqueado) return;
    const i = elegidos.indexOf(key);
    if (i >= 0) elegidos.splice(i, 1);
    else if (!listos()) elegidos.push(key);
    else {
      // las ranuras estan llenas: avisan sin cambiar nada
      animar(ranuras, [{ transform: 'none' }, { transform: 'translateX(-4px)', offset: 0.25 }, { transform: 'translateX(4px)', offset: 0.6 }, { transform: 'none' }], { dur: CS.rebote, easing: 'ease-out' });
      vivo.textContent = `Ya tenés ${MAINS} mains: sacá uno para cambiarlo.`;
      return;
    }
    sonido?.clic();
    marcar();
    pintarCartas({ nueva: i < 0 ? elegidos.length - 1 : -1 });
    vivo.textContent = i < 0 ? `${de(key).name}, main ${elegidos.length}.` : `${de(key).name} sale de tus mains.`;
  }
  function cambiarRol(id) {
    if (bloqueado || id === rol) return;
    rol = id;
    elegidos = porRol[id] ??= [];
    sonido?.clic();
    pintarRol();
    pintarGrilla();
    pintarCartas();
    grilla.querySelectorAll('.in-cs-retrato').forEach((b, i) => animar(b, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { delay: i * CS.retratoPaso, dur: DUR.entra }));
  }

  // --- el foco: el nombre del campeon apuntado, grande, sobre su arte (escucha al aura)
  const focoK = el('p', { class: 'in-cs-foco-k' });
  const focoEstado = el('span', { class: 'in-cs-foco-estado' });
  const focoNombre = el('span', { class: 'in-cs-foco-int' });
  const foco = el('div', { class: 'in-cs-foco', 'aria-hidden': 'true' }, [focoK, el('p', { class: 'in-cs-foco-nombre' }, focoNombre)]);
  let focoKey = null;
  function estadoFoco() {
    const i = elegidos.indexOf(focoKey);
    focoEstado.textContent = i >= 0 ? `Main ${i + 1}` : '';
    focoEstado.hidden = i < 0;
  }
  function mostrarFoco(key, { animado = true } = {}) {
    if (!key || key === focoKey) return;
    focoKey = key;
    const c = de(key);
    const r = roles.find((x) => x.id === c.rol);
    focoK.textContent = '';
    focoK.append(glifoRol(c.rol), el('span', { text: r?.etiqueta ?? c.rol }), ...(c.tags ?? []).map((t) => el('span', { text: ETIQUETA_TAG[t] ?? t })), focoEstado);
    focoNombre.textContent = c.name;
    foco.style.setProperty('--in-cs-largo', String(c.name.length));
    estadoFoco();
    pintarCartas();
    if (animado) animar(focoNombre, [{ opacity: 0, transform: 'translateY(32%)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { dur: CS.nombreEntra });
  }
  const soltarAura = aura?.alCambiar?.((key) => mostrarFoco(key)) ?? (() => {});

  const nodo = el('section', { class: 'in-cs', 'aria-label': 'Selección de campeones' }, [
    pestanas,
    el('p', { class: 'in-cs-k' }, [el('span', { text: 'Tus mains' }), cambiar, cuenta]),
    grilla,
    ranuras,
    textoRol,
    accion,
    vivo,
  ]);
  pintarRol();
  pintarGrilla(true);
  pintarCartas({ registrar: true });
  armarBloquear();
  mostrarFoco(elegidos[0], { animado: false });

  // Enter sobre un control del inicio (un retrato, una pestaña) lo activa: BLOQUEAR (que escucha Enter en la captura
  // del documento) no se lo lleva. Se corta aca, en la captura de la ventana, antes de que llegue al documento.
  const guardaEnter = (e) => {
    if (e.key !== 'Enter' || !nodo.isConnected) return;
    const t = e.target;
    if (t instanceof Element && t !== bq?.nodo && t.closest('.inicio') && t.closest(CONTROL)) e.stopPropagation();
  };
  addEventListener('keydown', guardaEnter, true);

  return {
    nodo,
    foco,
    entrar(base = 0) {
      pestanas.querySelectorAll('.in-cs-rol').forEach((b, i) => entrar(b, base + 360 + i * 30, 8));
      grilla.querySelectorAll('.in-cs-retrato').forEach((b, i) => animar(b, [{ opacity: 0, transform: 'scale(.72)' }, { opacity: 1, transform: 'none' }], { delay: base + 460 + i * CS.retratoPaso, dur: 360 }));
      cartas.forEach((c, i) => {
        const t = base + 560 + i * CS.cartaPaso;
        animar(c.li, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { delay: t, dur: DUR.larga });
        if (c.key) llenar(c, t + DUR.entra);
      });
      animar(focoK, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: base + 300, dur: DUR.entra });
      animar(focoNombre, [{ opacity: 0, transform: 'translateY(32%)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: base + 380, dur: CS.nombreEntra });
    },
    enIntro(si) {
      pausado = si;
      habilitar();
    },
    alCambiarEra: () => requestAnimationFrame(repintar),
    destruir() {
      removeEventListener('keydown', guardaEnter, true);
      soltarAura();
      bq?.destruir();
    },
  };
}
