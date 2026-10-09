// El Inicio. La primera vez, una intro de ~3 s salteable: el brillo del monitor, "15 años. Una pieza.", la luz se abre
// y entra UN SPLIT MÁS. Despues, la seleccion: invocador, servidor, perfil en una linea, los 5 roles como glifos sobre
// la Grieta, la grilla de retratos del rol (el campeon apuntado pasa a ser el arte del ambiente, con un cruce), las 3
// ranuras y BLOQUEAR que se enciende con 3 mains. "Continuar" como placa con el arte de tu main; desafio e historial.
import { cargarImagen, urlIcono, urlCentrada } from '../../comun/arte.js';
import { el, entrar, animar, reducido, inst, celular, leerColor, duotono, EXPO } from './util.js';
import { icono, glifoRol } from './iconos.js';

const CLAVE_VISTA = 'a-luz:intro-vista';
const MAINS = 3;
const INTRO = 3000;

export function crearInicio({ datos, amb, sonido, peor }) {
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
  pintarRol();
  pintarGrilla();
  const filaCampeones = campo(`Campeones · ${MAINS} mains`, el('div', { class: 'in-campeones' }, [grilla, el('p', { class: 'in-linea', text: cat.textoDelPool })]));
  const filaRanuras = el('div', { class: 'in-cierre' }, [ranuras, bloquear]);

  const form = el('div', { class: 'in-form' }, [filaNombre, filaServidor, filaPerfil, filaRol, filaCampeones, filaRanuras]);

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
  raiz.append(cabeza, form, lado);

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
  }
  function correrIntro() {
    intro?.remove();
    intro = armarIntro();
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
    },
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
