// La Cumbre. `titulo`: el takeover del titulo (<= 2,4 s, salteable con Espacio o clic): la luz sube al oro, CAMPEONES
// entra letra por letra con un barrido especular, la liga y el ano en mono, la serie mapa por mapa, el plantel como
// creditos y polvo dorado (PRNG comun). Desemboca en `final`: la carta holografica (5:7, el arte de carga del main en
// duotono de la rareza, el puntaje como calificacion de carta, foil y brillo que siguen al puntero) con el veredicto,
// los totales y la trayectoria dibujada (cinta de orgs + curva de nivel + hitos).
// Con `op=linea` (PLANUI §4.9), `titulo` es levantar la copa: una secuencia de beats de ~5 s (js/beats.js) con la copa en
// 3D (js/trofeo.js) y el confeti (js/confeti.js). Sin op y con las demas opciones, el takeover de siempre.
import { crearAzar } from '../../comun/azar.js';
import { cargarImagen, urlCarga } from '../../comun/arte.js';
import { el, svg, entrar, animar, esperar, odometro, num, reducido, inst, celular, leerColor, duotono, EXPO, RESORTE, DUR } from './util.js';
import { icono, glifoRol } from './iconos.js';
import { crearBeats } from './beats.js';
import { crearTrofeo, copaDe, SUBIDA } from './trofeo.js';
import { crearConfeti } from './confeti.js';
import { logoLiga, logoOrg, tonoOrg, escudo, iniciales } from './logos.js';
import { pintarCampeon } from './color.js';
import { claveCampeon } from './aura.js';

const POLVO = 46;
const TOMA = 2400;

export function crearCumbre(ctx) {
  if (ctx.muestra === 'final') return crearCarta(ctx);
  // PLANUI §4.9: con `op=linea`, el titulo es levantar la copa; sin op (y con las demas) queda el de siempre
  return ctx.op === 'linea' ? crearLevantar(ctx) : crearTakeover(ctx);
}

// ====================================================================================================== takeover
function crearTakeover({ datos, amb, sonido, peor }) {
  const t = datos.titulo;
  const pc = peor ? datos.peorCaso : null;
  const org = pc?.org?.nombre ?? t.titulo.org;
  const yo = pc?.handle ?? t.plantel.find((p) => p.esJugador)?.handle;
  const raiz = el('section', { class: 'cumbre takeover', 'data-pieza': 'cumbre', 'data-fase': 'takeover', 'aria-labelledby': 'tk-titulo' });
  const barrido = el('div', { class: 'tk-barrido', 'aria-hidden': 'true' });
  const negro = el('div', { class: 'tk-negro', 'aria-hidden': 'true' });
  const polvo = el('div', { class: 'tk-polvo', 'aria-hidden': 'true' });
  const azar = crearAzar(`polvo-${t.titulo.anio}`);
  const motas = Array.from({ length: POLVO }, () => {
    const m = el('i', { class: 'mota' });
    const tam = azar.entre(2, 5);
    m.style.cssText = `left:${azar.entre(2, 98)}%;top:${azar.entre(40, 100)}%;width:${tam}px;height:${tam}px`;
    polvo.append(m);
    return { m, pico: azar.entre(0.35, 1), sube: azar.entre(120, 420), deriva: azar.entre(-40, 40), delay: azar.entre(200, 1400), dur: azar.entre(1400, 2600) };
  });

  const letras = 'CAMPEONES'.split('').map((c) => el('span', { class: 'tk-letra', text: c }));
  const brillo = el('span', { class: 'tk-brillo', 'aria-hidden': 'true', text: 'CAMPEONES' });
  const titulo = el('h1', { class: 'tk-titulo', id: 'tk-titulo', 'data-foco': '', tabindex: '-1', 'aria-label': `¡Campeones de ${t.titulo.nombre}!` }, [el('span', { class: 'tk-letras', 'aria-hidden': 'true' }, letras), brillo]);
  const kicker = el('p', { class: 'tk-kicker' }, [el('span', { text: 'Final' }), el('span', { text: `${t.titulo.nombre} ${t.titulo.anio}` }), el('span', { text: `${t.franja?.cuando?.edadTexto ?? ''}` })]);
  const [a, b] = t.log.marcador;
  const marcador = el('p', { class: 'tk-marcador' }, [el('b', { text: org }), el('span', { class: 'tk-score', text: `${a}–${b}` }), el('b', { class: 'tk-rival', text: t.log.rival })]);
  const mapas = el('ol', { class: 'tk-mapas', 'aria-label': 'La serie, mapa por mapa' }, t.log.mapas.map((m) => el('li', { class: m.resultado === 'W' ? 'gano' : 'perdio', title: m.cierre }, [el('span', { class: 'tk-m', text: `M${m.mapa}` }), el('b', { class: 'campeon-foco', 'data-campeon': m.campeon, tabindex: '0', text: m.campeon }), el('span', { class: 'tk-r', text: m.resultado === 'W' ? 'ganado' : 'perdido' })])));
  const creditos = el('ol', { class: 'tk-creditos', 'aria-label': 'El plantel' }, t.plantel.map((p) => el('li', { class: p.esJugador ? 'vos' : '' }, [glifoRol(p.rol), el('b', { text: p.esJugador ? yo : p.handle }), el('span', { text: p.rol })])));
  const seguir = el('button', { type: 'button', class: 'tk-seguir' }, ['La carta de tu carrera', icono('flecha'), el('kbd', { text: 'Espacio' })]);
  seguir.addEventListener('click', (e) => {
    e.stopPropagation();
    window.vitrina?.muestra('final');
  });
  const bloque = el('div', { class: 'tk-bloque' }, [kicker, titulo, marcador, mapas, creditos, seguir]);
  raiz.append(negro, barrido, polvo, bloque);

  let asentado = false;
  const animaciones = () => raiz.getAnimations({ subtree: true });
  function saltear() {
    for (const x of animaciones()) {
      try {
        x.finish();
      } catch {
        /* sin fin */
      }
    }
    asentado = true;
  }
  raiz.addEventListener('click', () => (asentado ? null : saltear()));

  function entrada() {
    amb.ambiente({ era: 'escenario', animo: 'normal', instantaneo: true });
    amb.ambiente({ era: 'mundial', animo: 'gloria' });
    amb.pulso('gloria');
    sonido?.barrido();
    if (inst() || reducido()) {
      asentado = true;
      return;
    }
    sonido?.multitud(2.6);
    esperar(raiz, 600).then(() => sonido?.acorde());
    animar(barrido, [{ transform: 'translateX(-110%) skewX(-18deg)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translateX(130%) skewX(-18deg)', opacity: 0 }], { dur: 900, easing: 'cubic-bezier(.5,0,.2,1)' });
    animar(negro, [{ opacity: 0.85 }, { opacity: 0 }], { dur: 900, easing: 'ease-out' });
    entrar(kicker, 250, 10);
    letras.forEach((l, i) => animar(l, [{ opacity: 0, transform: 'translateY(38%) scale(1.08)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { delay: 280 + i * 45, dur: 500 }));
    animar(brillo, [{ backgroundPosition: '160% 0', opacity: 1 }, { backgroundPosition: '-60% 0', opacity: 1 }], { delay: 780, dur: 1150, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
    entrar(marcador, 860, 12);
    mapas.querySelectorAll('li').forEach((li, i) => entrar(li, 940 + i * 60, 8));
    creditos.querySelectorAll('li').forEach((li, i) => animar(li, [{ opacity: 0, transform: 'translateY(16px)', letterSpacing: '0.3em' }, { opacity: 1, transform: 'none' }], { delay: 1000 + i * 60, dur: 400 }));
    entrar(seguir, 1300, 6);
    for (const x of motas) animar(x.m, [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: x.pico, offset: 0.2 }, { transform: `translate(${x.deriva}px, ${-x.sube}px)`, opacity: 0 }], { delay: x.delay, dur: x.dur, easing: 'cubic-bezier(.2,.6,.3,1)' });
    esperar(raiz, TOMA).then(() => (asentado = true));
  }

  return {
    nodo: raiz,
    entrar: entrada,
    tecla(e) {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (!asentado) saltear();
        else window.vitrina?.muestra('final');
      }
    },
    arte: datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone',
    animo: 'normal',
    encuadre: 'cumbre',
    velo: 0.35,
  };
}

// ====================================================================================================== levantar la copa
// PLANUI §4.9 (op=linea): el titulo como una secuencia de beats de ~5 s, con un solo reloj (beats.js):
//   0-220      apagon: la pantalla cae a negro
//   220        golpe de luz: el mundo sube al oro (era mundial + gloria), un fogonazo y los dos canones de confeti
//   600-1800   la copa sube desde abajo hasta el foco (WebGL: entra en la luz y frena el giro); al llegar, el brillo
//              barre el metal y el halo late
//   1350       la liga: su logo grande, la edicion y "final" (PLANUI §4.10: "poner tipo el campeon, la liga y el equipo")
//   1850-2990  CAMPEONES letra por letra, con peso: cada letra cae, se aplasta contra la linea y levanta polvo de oro
//   2980-3200  el equipo: el escudo de la org campeona cae y golpea (su golpe propio: la onda es el tercer destello)
//   3100-4100  el marcador, los mapas y los creditos del plantel
//   3350-4100  el campeon: la carta de carga del que cerro la final (70 % de su color) entra girando y dice su nombre
//   4600       se asienta (Espacio salta hasta aca): la copa gira lenta, el confeti cae, el arte queda vivo detras
// Con INST o movimiento reducido, el cuadro final (copa quieta, confeti quieto).
const L = {
  duracion: 5000,
  asentarse: 4600,
  golpe: 220,
  apagon: 700,
  hilo: 760,
  fogonazo: 1000,
  canones: 260,
  cortina: 420,
  lluvia: 2400,
  copa: 600,
  kicker: 1500,
  liga: 1350, // el logo de la liga entra con un brillo que lo cruza (sin destello)
  ligaDur: 620,
  ligaTexto: 1480,
  letras: 1850,
  letraPaso: 80,
  letraDur: 420,
  impacto: 0.58, // en que punto de la caida la letra toca la linea
  polvoDur: 560,
  sacudon: 170,
  golpesEn: [0, 4, 8], // las letras que suenan (y sacuden la palabra) al caer
  brillo: 2900,
  brilloPeriodo: 6500,
  escudo: 2980, // el escudo empieza a caer
  escudoCae: 220, // hasta el impacto
  escudoDur: 640,
  ondaDur: 720,
  marcador: 3100,
  mapas: 3280,
  mapaPaso: 90,
  creditos: 3500,
  creditoPaso: 90,
  filete: 120,
  fileteDur: 700,
  carta: 3350, // la carta del campeon gira y entra
  cartaDur: 720,
  cartaNombre: 3700,
  cartaBrillo: 4300, // el brillo de la carta vuelve cada tanto (el loop vivo)
  seguir: 4150,
  confeti: 270,
  confetiCelular: 0.6, // en el celular, el mismo confeti en un lienzo mucho mas chico: menos papelitos
  calmaDur: 700,
  calmaAlfa: 0.14,
};
// el titulo dice la liga ('CBLOL', 'Mundial 2031'...): su competicion (la copa, los logos, el rojo del confeti)
const COMP_DE_LIGA = { cblol: 'cblol', lec: 'lec', lck: 'lck', lpl: 'lpl', lcs: 'lcs', lcp: 'lcp', msi: 'msi', mundial: 'worlds', worlds: 'worlds', 'first stand': 'firststand' };
const compDeTitulo = (nombre) => {
  const k = String(nombre ?? '').trim().toLowerCase();
  return COMP_DE_LIGA[k] ?? (k.startsWith('mundial') ? 'worlds' : null);
};
// el tono de la copa: el oro de la ceremonia; en Worlds, la plata (LINEA.md §3)
const TONO_COPA = {
  oro: { luz: '--luz-mundial', contra: '--contra-mundial', noche: '--cu-noche-oro' },
  plata: { luz: '--comp-worlds-luz', contra: '--contra-mundial', noche: '--cu-noche-plata' },
};
// el grabado de la placa: su letra es una fraccion del alto de la placa (la copa cambia de tamano con la pantalla)
const PLACA_LETRA = 0.22;
const PLACA_LETRA_MIN = 6;
// una animacion WAAPI con iteraciones (util.animar no las tiene); nada con INST o movimiento reducido
const animarLoop = (nodo, cuadros, opciones) => (!nodo || inst() || reducido() ? null : nodo.animate(cuadros, opciones));
// Los logos oficiales en tinta oscura (negros sobre transparente): sobre la noche se pasan a la tinta clara. Es la misma
// marca que lleva js/escena.js (LOGOS.FURIA, tinta 'oscura'); js/logos.js todavia no la exporta.
const TINTA_OSCURA = new Set(['furia']);
// La carta de carga de Data Dragon (308x560), a su tamaño, y donde mira el recorte.
const CARTA = { ancho: 308, alto: 560, foco: [0.5, 0.18] };

// Un logo oficial como <img> (nunca en un canvas), con el escudo-monograma si no hay o no carga. `listo` resuelve
// cuando cargo o fallo (nunca rechaza).
function logoImg(src, nombre, clase) {
  const caja = el('span', { class: clase, 'aria-hidden': 'true' });
  const monograma = () => caja.replaceChildren(escudo(iniciales(nombre)));
  if (!src) {
    monograma();
    return { nodo: caja, listo: Promise.resolve() };
  }
  const img = el('img', { src, alt: '', decoding: 'async', draggable: 'false', referrerpolicy: 'no-referrer', 'data-tinta': TINTA_OSCURA.has(String(nombre ?? '').trim().toLowerCase()) ? 'oscura' : null });
  caja.append(img);
  const listo = new Promise((r) => {
    img.addEventListener('load', r, { once: true });
    img.addEventListener('error', () => (monograma(), r()), { once: true });
  });
  return { nodo: caja, listo };
}
// El nombre de un campeon del motor ('Kai'Sa', 'Wukong') -> su clave de Data Dragon, por el catalogo del inicio.
function claveDe(datos, nombre) {
  const c = Object.values(datos.inicio?.catalogos?.campeonesPorRol ?? {}).flat().find((x) => x.name === nombre || x.ddragon === nombre);
  return c?.ddragon ?? claveCampeon(nombre);
}

function crearLevantar({ datos, amb, sonido, peor }) {
  const t = datos.titulo;
  const pc = peor ? datos.peorCaso : null;
  const org = pc?.org?.nombre ?? t.titulo.org;
  const yo = pc?.handle ?? t.plantel.find((p) => p.esJugador)?.handle;
  const comp = compDeTitulo(t.titulo.nombre ?? t.titulo.liga);
  const { material, perfil } = copaDe(comp);
  const tonoCopa = comp === 'worlds' ? TONO_COPA.plata : TONO_COPA.oro;

  const raiz = el('section', { class: 'cumbre takeover cu-titulo', 'data-pieza': 'cumbre', 'data-fase': 'takeover', 'data-op': 'linea', 'aria-labelledby': 'tk-titulo' });
  const negro = el('div', { class: 'cu-negro', 'aria-hidden': 'true' });
  const golpe = el('div', { class: 'cu-golpe', 'aria-hidden': 'true' });

  // la copa: el lienzo (WebGL o SVG) y el logo de la competicion como <img> sobre la placa del pedestal
  const copa = crearTrofeo(document.createElement('canvas'), { material, perfil, tonos: tonoCopa });
  const logo = logoLiga(t.titulo.nombre ?? t.titulo.liga);
  // la placa grabada: el simbolo de la liga y la edicion
  const grabado = el('span', { class: 'cu-placa-texto', text: `${t.titulo.nombre} ${t.titulo.anio}` });
  const placa = el('span', { class: 'cu-placa', 'aria-hidden': 'true' }, grabado);
  const sinLogo = () => placa.querySelector('img')?.remove();
  let logoListo = Promise.resolve();
  if (logo.src) {
    const img = el('img', { src: logo.src, alt: '', decoding: 'async', draggable: 'false', referrerpolicy: 'no-referrer' });
    logoListo = new Promise((r) => {
      img.addEventListener('load', r, { once: true });
      img.addEventListener('error', () => (sinLogo(), r()), { once: true });
    });
    placa.prepend(img);
  }
  const sube = el('div', { class: 'cu-copa-sube' }, [copa.nodo, placa]);
  // el hilo de luz: en el apagon, una linea de oro marca donde va a subir la copa
  const hilo = el('i', { class: 'cu-hilo' });
  const caja = el('div', { class: 'cu-copa', 'aria-hidden': 'true', 'data-copa': perfil, 'data-material': material }, [hilo, sube]);
  const ubicarPlaca = () => {
    const r = copa.placa();
    if (!r) return;
    Object.assign(placa.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.ancho}px`, height: `${r.alto}px`, fontSize: `${Math.max(PLACA_LETRA_MIN, r.alto * PLACA_LETRA)}px` });
  };

  // el confeti: el oro, el blanco, el color del equipo y el de la competicion
  const colores = ['--gold', '--carta-oro-a', '--luz-blanca', `--org-${tonoOrg(org)}`];
  if (comp) colores.push(`--comp-${comp}-contra`);
  // (despues de que entra el texto, lo que pasa por detras del bloque y de la carta se apaga: la letra chica conserva su
  // contraste)
  let bloque = null;
  let carta = null;
  const confeti = crearConfeti(el('canvas', { class: 'cu-confeti', 'aria-hidden': 'true' }), {
    colores,
    semilla: `titulo-${t.titulo.anio}-${org}`,
    cantidad: Math.round(L.confeti * (celular() ? L.confetiCelular : 1)),
    calma: { desde: L.kicker, dur: L.calmaDur, alfa: L.calmaAlfa, zonas: () => [bloque, carta].filter(Boolean).map((n) => n.getBoundingClientRect()) },
    origenes: [
      { tipo: 'canon', x: 0, y: 1.02, angulo: 21, t: L.canones },
      { tipo: 'canon', x: 1, y: 1.02, angulo: -21, t: L.canones },
      { tipo: 'cortina', t: L.cortina },
      { tipo: 'lluvia', t: L.lluvia },
    ],
  });

  // el bloque: el mismo de siempre (rotulo, CAMPEONES, marcador, mapas, plantel), con letras que caen con peso
  const polvos = [];
  const letras = 'CAMPEONES'.split('').map((c) => {
    const p = el('i', { class: 'cu-polvo' });
    polvos.push(p);
    return el('span', { class: 'tk-letra cu-letra' }, [c, p]);
  });
  const brillo = el('span', { class: 'tk-brillo', 'aria-hidden': 'true', text: 'CAMPEONES' });
  const titulo = el('h1', { class: 'tk-titulo', id: 'tk-titulo', 'data-foco': '', tabindex: '-1', 'aria-label': `¡Campeones de ${t.titulo.nombre}!` }, [el('span', { class: 'tk-letras', 'aria-hidden': 'true' }, letras), brillo]);
  // PLANUI §4.10: la liga (su logo grande, la edicion y "final") en lugar del rotulo
  const edad = t.franja?.cuando?.edadTexto ?? '';
  const infoLiga = logoLiga(t.titulo.nombre ?? t.titulo.liga);
  const logoDeLiga = logoImg(infoLiga.src, infoLiga.nombre, 'cu-liga-logo');
  const ligaTexto = el('span', { class: 'cu-liga-txt' }, [el('b', { text: `${t.titulo.nombre} ${t.titulo.anio}` }), el('span', { text: edad ? `Final · ${edad}` : 'Final' })]);
  const liga = el('p', { class: 'cu-liga' }, [logoDeLiga.nodo, ligaTexto]);
  const [a, b] = t.log.marcador;
  const score = el('span', { class: 'tk-score', text: `${a}–${b}` });
  const marcador = el('p', { class: 'tk-marcador' }, [el('b', { text: org }), score, el('b', { class: 'tk-rival', text: t.log.rival })]);
  // el equipo: el escudo de la org campeona, grande, con su golpe (la onda de luz que abre al caer)
  const escudoOrg = logoImg(logoOrg(org).src, org, 'cu-escudo-logo');
  const onda = el('i', { class: 'cu-onda', 'aria-hidden': 'true' });
  const escudoCaja = el('span', { class: 'cu-escudo' }, [onda, escudoOrg.nodo]);
  const equipo = el('div', { class: 'cu-equipo' }, [escudoCaja, marcador]);
  const mapas = el('ol', { class: 'tk-mapas', 'aria-label': 'La serie, mapa por mapa' }, t.log.mapas.map((m) => el('li', { class: m.resultado === 'W' ? 'gano' : 'perdio', title: m.cierre }, [el('span', { class: 'tk-m', text: `M${m.mapa}` }), el('b', { class: 'campeon-foco', 'data-campeon': m.campeon, tabindex: '0', text: m.campeon }), el('span', { class: 'tk-r', text: m.resultado === 'W' ? 'ganado' : 'perdido' })])));
  const creditos = el('ol', { class: 'tk-creditos', 'aria-label': 'El plantel' }, t.plantel.map((p) => el('li', { class: p.esJugador ? 'vos' : '' }, [glifoRol(p.rol), el('b', { text: p.esJugador ? yo : p.handle }), el('span', { text: p.rol })])));
  const seguir = el('button', { type: 'button', class: 'tk-seguir' }, ['La carta de tu carrera', icono('flecha'), el('kbd', { text: 'Espacio' })]);
  seguir.addEventListener('click', (e) => {
    e.stopPropagation();
    window.vitrina?.muestra('final');
  });
  bloque = el('div', { class: 'tk-bloque cu-bloque' }, [liga, titulo, equipo, mapas, creditos, seguir]);
  // el campeon: el que cerro la final (el ultimo mapa ganado), su carta de carga al 70 % de su color (la politica de
  // momento de color.js) y su nombre
  const cierre = [...t.log.mapas].reverse().find((m) => m.resultado === 'W') ?? t.log.mapas[t.log.mapas.length - 1];
  const claveCierre = claveDe(datos, cierre.campeon);
  const cartaArte = el('canvas', { class: 'cu-carta-arte', width: String(CARTA.ancho), height: String(CARTA.alto), 'aria-hidden': 'true' });
  const cartaBrillo = el('span', { class: 'cu-carta-brillo', 'aria-hidden': 'true' });
  const cartaNombre = el('b', { class: 'cu-carta-nombre', text: cierre.campeon });
  const cartaPie = el('span', { class: 'cu-carta-pie', 'aria-hidden': 'true' }, [el('span', { class: 'cu-carta-k', text: `M${cierre.mapa} · cerró la final` }), cartaNombre]);
  // (la cara lleva la inclinacion quieta hacia la copa; la carta, la entrada)
  carta = el('figure', { class: 'cu-carta', 'data-campeon': claveCierre, 'aria-label': `${cierre.campeon}: cerró la final en el mapa ${cierre.mapa}` }, el('span', { class: 'cu-carta-cara' }, [cartaArte, cartaBrillo, cartaPie]));
  const cartaLista = cargarImagen(urlCarga(claveCierre, datos.meta)).then((img) => {
    if (img) pintarCampeon(cartaArte, img, leerColor('--tono-oro-noche'), leerColor('--gold'), { foco: CARTA.foco });
  });
  // el velo de lectura del bloque (la letra chica de los creditos cae sobre el arte iluminado)
  const velo = el('div', { class: 'cu-velo', 'aria-hidden': 'true' });
  raiz.append(negro, velo, golpe, caja, confeti.nodo, carta, bloque);

  let beats = null;
  let asentado = false;
  const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
    copa.redimensionar();
    ubicarPlaca();
  }) : null;

  function secuencia() {
    beats?.destruir({ participantes: false });
    const bt = crearBeats({ duracion: L.duracion, asentarse: L.asentarse });
    beats = bt;
    asentado = false;
    bt.agregar(copa);
    bt.agregar(confeti);
    copa.entrar(L.copa);
    const llegada = L.copa + SUBIDA;
    // el mundo: ya en el oro debajo del apagon (asi el golpe de luz es oro desde el primer cuadro) y la gloria al golpe
    // (el ambiente programa el cambio en su reloj: congelar lo dibuja fiel)
    amb.ambiente({ era: 'mundial', animo: 'normal', instantaneo: true });
    amb.ambiente({ animo: 'gloria', retardo: L.golpe });
    const fogonazo = bt.destello(L.golpe);
    if (fogonazo != null) amb.pulso('gloria', fogonazo);
    const brilloCopa = bt.destello(llegada);
    if (brilloCopa != null) amb.pulso('logro', brilloCopa);
    // los sonidos (K suma golpe y confeti; si no estan, no suenan): solo si el reloj llega solo
    const sonar = (ms, fn) => bt.esperar(ms).then((llego) => llego && fn());
    if (!bt.quieto && !inst() && !reducido()) {
      sonido?.barrido?.();
      sonar(L.golpe, () => {
        sonido?.confeti?.();
        sonido?.multitud?.((L.duracion - L.golpe) / 1000);
      });
      sonar(llegada, () => sonido?.acorde?.());
    }
    // apagon -> golpe de luz
    bt.waapi(animar(negro, [{ opacity: 0.96 }, { opacity: 0.96, offset: L.golpe / L.apagon }, { opacity: 0 }], { dur: L.apagon, easing: 'cubic-bezier(.3,0,.2,1)' }));
    bt.waapi(animar(hilo, [{ opacity: 0, transform: 'scaleX(0.05)' }, { opacity: 1, transform: 'scaleX(1)', offset: L.golpe / L.hilo }, { opacity: 0, transform: 'scaleX(1.3)' }], { dur: L.hilo, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'none' }));
    if (fogonazo != null) bt.waapi(animar(golpe, [{ opacity: 0, transform: 'scale(0.7)' }, { opacity: 1, transform: 'scale(1)', offset: 0.16 }, { opacity: 0, transform: 'scale(1.3)' }], { delay: fogonazo, dur: L.fogonazo, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'none' }));
    // la copa sube hasta el foco (el canvas dibuja su luz y su giro con el mismo reloj)
    bt.waapi(animar(sube, [{ transform: 'translateY(118%)' }, { transform: 'translateY(-1.6%)', offset: 0.84 }, { transform: 'none' }], { delay: L.copa, dur: SUBIDA, easing: 'cubic-bezier(.22,.8,.3,1)' }));
    // la liga: el logo entra desde la luz (sin destello: un brillo lo cruza), despues la edicion; y CAMPEONES letra por
    // letra con peso
    bt.waapi(animar(logoDeLiga.nodo, [{ opacity: 0, transform: 'scale(0.86)', filter: 'blur(10px) brightness(2.2)' }, { opacity: 1, transform: 'none', filter: 'blur(0px) brightness(1)' }], { delay: L.liga, dur: L.ligaDur }));
    bt.waapi(animar(ligaTexto, [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], { delay: L.ligaTexto, dur: DUR.entra }));
    letras.forEach((l, i) => {
      const t0 = L.letras + i * L.letraPaso;
      const toca = t0 + L.letraDur * L.impacto;
      bt.waapi(animar(l, [
        { opacity: 0, transform: 'translateY(-82%) scale(1.06, 1.28)', filter: 'blur(6px)', easing: 'cubic-bezier(.55,0,.9,.4)' },
        { opacity: 1, transform: 'translateY(3%) scale(1.1, 0.8)', filter: 'blur(0px)', offset: L.impacto, easing: 'cubic-bezier(.2,.7,.3,1)' },
        { opacity: 1, transform: 'translateY(-2%) scale(0.98, 1.05)', filter: 'blur(0px)', offset: 0.8 },
        { opacity: 1, transform: 'none', filter: 'blur(0px)' },
      ], { delay: t0, dur: L.letraDur, easing: 'linear' }));
      bt.waapi(animar(polvos[i], [{ opacity: 0, transform: 'scaleX(0.3)' }, { opacity: 1, transform: 'scaleX(1)', offset: 0.14 }, { opacity: 0, transform: 'scaleX(1.9) translateY(-12%)' }], { delay: toca, dur: L.polvoDur, easing: EXPO, fill: 'none' }));
      if (L.golpesEn.includes(i)) {
        bt.waapi(animar(titulo, [{ transform: 'none' }, { transform: 'translateY(0.035em)', offset: 0.25 }, { transform: 'none' }], { delay: toca, dur: L.sacudon, easing: 'ease-out', fill: 'none' }));
        sonar(toca, () => sonido?.golpe?.());
      }
    });
    // el brillo especular cruza CAMPEONES y vuelve cada tanto (el loop vivo)
    bt.waapi(animarLoop(brillo, [{ backgroundPosition: '160% 0', opacity: 1 }, { backgroundPosition: '-60% 0', opacity: 1, offset: 0.18 }, { backgroundPosition: '-60% 0', opacity: 1 }], { delay: L.brillo, duration: L.brilloPeriodo, iterations: Infinity, easing: 'cubic-bezier(.4,0,.2,1)' }));
    // el equipo: el escudo cae, se aplasta contra la linea y abre una onda de luz (su golpe; la onda pasa por destello)
    const impacto = L.escudo + L.escudoCae;
    const pIm = L.escudoCae / L.escudoDur;
    bt.waapi(animar(escudoOrg.nodo, [
      { opacity: 0, transform: 'translateY(-46%) scale(1.7)', filter: 'blur(8px)', easing: 'cubic-bezier(.55,0,.9,.4)' },
      { opacity: 1, transform: 'translateY(2%) scale(1.08, 0.9)', filter: 'blur(0px)', offset: pIm, easing: 'cubic-bezier(.2,.7,.3,1)' },
      { opacity: 1, transform: 'translateY(-1%) scale(0.98, 1.03)', filter: 'blur(0px)', offset: pIm + (1 - pIm) * 0.45 },
      { opacity: 1, transform: 'none', filter: 'blur(0px)' },
    ], { delay: L.escudo, dur: L.escudoDur, easing: 'linear' }));
    const tOnda = bt.destello(impacto);
    if (tOnda != null) bt.waapi(animar(onda, [{ opacity: 0.95, transform: 'scale(0.55)' }, { opacity: 0, transform: 'scale(2.3)' }], { delay: tOnda, dur: L.ondaDur, easing: EXPO, fill: 'none' }));
    bt.waapi(animar(equipo, [{ transform: 'none' }, { transform: 'translateY(4px)', offset: 0.3 }, { transform: 'none' }], { delay: impacto, dur: L.sacudon, easing: 'ease-out', fill: 'none' }));
    sonar(impacto, () => sonido?.golpe?.());
    // el marcador (el numero golpea), los mapas y los creditos
    bt.waapi(entrar(marcador, L.marcador, 12));
    bt.waapi(animar(score, [{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: L.marcador + 80, dur: 620, easing: RESORTE }));
    // el campeon: la carta gira hacia la copa y entra, el brillo la cruza y su nombre se asienta
    bt.waapi(animar(carta, [{ opacity: 0, transform: 'perspective(900px) translateX(18%) rotateY(-78deg) scale(0.92)' }, { opacity: 1, offset: 0.35 }, { opacity: 1, transform: 'none' }], { delay: L.carta, dur: L.cartaDur }));
    bt.waapi(animar(cartaBrillo, [{ backgroundPosition: '160% 0', opacity: 1 }, { backgroundPosition: '-60% 0', opacity: 1 }], { delay: L.carta + L.cartaDur * 0.4, dur: L.cartaDur, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'none' }));
    bt.waapi(animar(cartaNombre, [{ opacity: 0, transform: 'translateY(40%)', letterSpacing: '0.18em' }, { opacity: 1, transform: 'none' }], { delay: L.cartaNombre, dur: DUR.larga }));
    bt.waapi(animarLoop(cartaBrillo, [{ backgroundPosition: '160% 0', opacity: 1 }, { backgroundPosition: '-60% 0', opacity: 1, offset: 0.16 }, { backgroundPosition: '-60% 0', opacity: 1 }], { delay: L.cartaBrillo, duration: L.brilloPeriodo, iterations: Infinity, easing: 'cubic-bezier(.4,0,.2,1)' }));
    mapas.querySelectorAll('li').forEach((li, i) => bt.waapi(entrar(li, L.mapas + i * L.mapaPaso, 8)));
    // el filete de los creditos se traza con ellos (si no, queda una raya sola en la pantalla antes del texto)
    bt.waapi(animar(creditos, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { delay: L.creditos - L.filete, dur: L.fileteDur, easing: EXPO }));
    creditos.querySelectorAll('li').forEach((li, i) => bt.waapi(animar(li, [{ opacity: 0, transform: 'translateY(16px)', letterSpacing: '0.3em' }, { opacity: 1, transform: 'none' }], { delay: L.creditos + i * L.creditoPaso, dur: 400 })));
    bt.waapi(entrar(seguir, L.seguir, 6));
    bt.esperar(L.asentarse).then(() => {
      if (beats === bt) asentado = true;
    });
    bt.iniciar();
  }
  function saltar() {
    if (asentado || !beats) return;
    // si el golpe de luz todavia no cruzo, el mundo va directo al oro
    if (beats.ahora() < L.golpe) amb.ambiente({ era: 'mundial', animo: 'gloria', instantaneo: true });
    beats.saltar();
    asentado = true;
  }
  raiz.addEventListener('click', () => (asentado ? null : saltar()));

  return {
    nodo: raiz,
    entrar() {
      observador?.observe(caja);
      copa.redimensionar();
      ubicarPlaca();
      secuencia();
    },
    repetir: secuencia,
    tecla(e) {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (!asentado) saltar();
        else window.vitrina?.muestra('final');
      }
    },
    congelar: (ms) => beats?.congelar(ms),
    pausar: () => beats?.pausar(),
    reanudar: () => beats?.reanudar(),
    listo: () => Promise.all([copa.listo, logoListo, logoDeLiga.listo, escudoOrg.listo, cartaLista]).then(() => ubicarPlaca()),
    destruir() {
      observador?.disconnect();
      beats?.destruir({ participantes: false });
      copa.destruir();
      confeti.destruir();
    },
    arte: datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone',
    animo: 'normal',
    encuadre: 'cumbre',
    velo: 0.35,
  };
}

// ====================================================================================================== la carta
const RAREZAS = { goat: 'goat', leyenda: 'leyenda' };

function crearCarta({ datos, amb, peor }) {
  const f = datos.final;
  const pc = peor ? datos.peorCaso : null;
  const handle = pc?.handle ?? f.jugador?.handle ?? f.fotoDeLaFranja?.quien?.handle;
  const rol = f.fotoDeLaFranja?.quien?.rol ?? 'mid';
  const main = datos.inicio?.jugador?.mains?.[0]?.ddragon ?? 'Yone';
  const rareza = RAREZAS[f.puntaje.nivel.id] ?? 'base';
  const golden = (f.goldenRoads ?? []).length > 0;
  const titulos = f.registro?.titulos?.length ?? 0;
  const internac = f.registro?.internacionales ?? [];
  const mundiales = f.puntaje?.hechos?.mundialesGanados ?? 0;
  const pico = f.registro?.picos?.rankMundial ?? f.puntaje?.hechos?.rankPico;
  const splits = f.puntaje?.hechos?.splitsJugados;

  const raiz = el('section', { class: 'cumbre carta-pantalla', 'data-pieza': 'final', 'data-fase': 'carta' });
  // --- la carta
  const arte = el('canvas', { class: 'carta-arte', width: '400', height: '560', 'aria-hidden': 'true' });
  const pts = el('b', { class: 'carta-pts', text: num(f.puntaje.total) });
  const carta = el('article', { class: 'carta', 'data-rareza': rareza, 'data-golden': golden ? '' : null, 'aria-label': `Carta de ${handle}: ${num(f.puntaje.total)} puntos, ${f.puntaje.nivel.nombre}` }, [
    arte,
    el('div', { class: 'carta-velo', 'aria-hidden': 'true' }),
    el('div', { class: 'carta-foil', 'aria-hidden': 'true' }),
    el('div', { class: 'carta-banda', 'aria-hidden': 'true' }),
    el('div', { class: 'carta-brillo', 'aria-hidden': 'true' }),
    el('div', { class: 'carta-marco', 'aria-hidden': 'true' }),
    el('div', { class: 'carta-sup' }, [
      el('div', { class: 'carta-calif' }, [pts, el('span', { class: 'carta-pts-u', text: 'pts' })]),
      el('div', { class: 'carta-rol' }, [glifoRol(rol), el('span', { text: rol })]),
      el('span', { class: 'carta-pct', text: `top ${100 - f.puntaje.percentil}%` }),
    ]),
    el('div', { class: 'carta-inf' }, [
      el('span', { class: 'carta-rareza', text: golden ? `${f.puntaje.nivel.nombre} · Golden Road ${f.goldenRoads[0]}` : f.puntaje.nivel.nombre }),
      el('b', { class: 'carta-handle', text: handle }),
      el('dl', { class: 'carta-datos' }, [
        ['Títulos', titulos],
        ['Mundial', mundiales],
        ['Pico', pico ? `#${pico}` : '—'],
        ['Splits', splits ?? '—'],
        ['Retiro', f.tarjeta?.edadRetiro ?? '—'],
      ].map(([k, v]) => el('div', {}, [el('dt', { text: k }), el('dd', { text: String(v) })]))),
    ]),
  ]);
  const escenaCarta = el('div', { class: 'carta-escena' }, carta);

  // --- la vitrina de trofeos (el carrera.log de C, como lista): los titulos agrupados por liga y club, y el Mundial
  const grupos = [];
  for (const t of f.registro?.titulos ?? []) {
    const g = grupos.find((x) => x.nombre === t.nombre && x.org === t.org);
    if (g) {
      g.n += 1;
      g.hasta = t.anio;
    } else grupos.push({ nombre: t.nombre, org: t.org, n: 1, desde: t.anio, hasta: t.anio, tier: t.tier });
  }
  const ganados = internac.filter((x) => x.resultado === 'campeon');
  const anios = (g) => (g.desde === g.hasta ? String(g.desde) : `${g.desde}–${String(g.hasta).slice(2)}`);
  const vitrina = el('section', { class: 'panel vd-vitrina', 'aria-label': 'Vitrina de trofeos' }, [
    el('p', { class: 'rotulo-cat' }, [el('span', { text: 'Vitrina' }), el('span', { class: 'bisagra', text: `${titulos} títulos` }), el('span', { class: 'bisagra', text: `${mundiales} Mundial · de ${internac.length} jugados` }), el('span', { class: 'bisagra', text: pico ? `pico #${pico} del mundo` : '' })]),
    el('ol', { class: 'vd-trofeos' }, [
      ...ganados.map((x) => el('li', { class: 'oro' }, [el('b', { class: 'num', text: '×1' }), el('span', { class: 'vd-t-n', text: `Mundial${f.goldenRoads?.includes(x.anio) ? ' · Golden Road' : ''}` }), el('span', { class: 'vd-t-d', text: `${x.org} · ${x.anio}` })])),
      ...grupos.sort((a, b) => b.n - a.n || a.tier - b.tier).map((g) => el('li', {}, [el('b', { class: 'num', text: `×${g.n}` }), el('span', { class: 'vd-t-n', text: g.nombre }), el('span', { class: 'vd-t-d', text: `${g.org} · ${anios(g)}` })])),
    ]),
  ]);

  // --- veredicto y totales
  const veredicto = el('div', { class: 'veredicto' }, [
    el('p', { class: 'vd-kicker' }, [el('i', { class: 'punto-luz' }), f.marco?.titulo ?? 'Se cierra una carrera']),
    el('h1', { class: 'vd-titulo', 'data-foco': '', tabindex: '-1', text: f.puntaje.nivel.nombre }),
    el('p', { class: 'vd-identidad', text: pc ? `${handle} · ${rol} · se retiró a los ${f.tarjeta?.edadRetiro}` : f.identidad }),
    el('div', { class: 'vd-totales' }, [
      el('div', { class: 'vd-pts' }, [el('b', { class: 'vd-num', text: num(f.puntaje.total) }), el('span', { class: 'vd-ref' }, [el('span', { text: 'puntos' }), el('span', { class: 'vd-pct', text: `percentil ${f.puntaje.percentil}` })])]),
      vitrina,
    ]),
    f.escalon?.siguiente ? el('p', { class: 'vd-siguiente' }, [el('b', { text: f.escalon.siguiente.nombre }), el('span', { text: f.escalon.siguiente.enPasado })]) : null,
  ]);
  const tray = trayectoriaDibujada(f, peor ? pc.org?.nombre : null);
  raiz.append(veredicto, escenaCarta, tray.nodo);

  // --- inclinacion, brillo y foil que siguen al puntero (no dependen del tiempo: congelar no los toca)
  const POSE = { rx: 4, ry: -11, mx: 70, my: 58 };
  const poner = (p) => {
    carta.style.setProperty('--rx', `${p.rx}deg`);
    carta.style.setProperty('--ry', `${p.ry}deg`);
    carta.style.setProperty('--mx', `${p.mx}%`);
    carta.style.setProperty('--my', `${p.my}%`);
  };
  poner(POSE);
  const mover = (e) => {
    if (reducido() || celular()) return;
    const r = carta.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    carta.classList.add('siguiendo');
    poner({ rx: (0.5 - y) * 24, ry: (x - 0.5) * 24, mx: x * 100, my: y * 100 });
  };
  escenaCarta.addEventListener('pointermove', mover);
  escenaCarta.addEventListener('pointerleave', () => {
    carta.classList.remove('siguiendo');
    poner(POSE);
  });

  // --- arte de carga en duotono de la rareza
  const sombra = leerColor(golden ? '--carta-oro-sombra' : '--bg-surface');
  const luz = leerColor(golden ? '--carta-oro-a' : rareza === 'goat' ? '--carta-goat-b' : rareza === 'leyenda' ? '--carta-leyenda-a' : '--ink-dim');
  const carga = cargarImagen(urlCarga(main, datos.meta)).then((img) => {
    if (img) duotono(img, sombra, luz, 400, 560, { canvas: arte, foco: [0.5, 0.2], brillo: 1.08 });
  });

  function entrada() {
    entrar(veredicto.querySelector('.vd-kicker'), 0, 8);
    animar(veredicto.querySelector('.vd-titulo'), [{ opacity: 0, transform: 'translateY(30%)', letterSpacing: '0.08em', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', letterSpacing: '-0.02em', filter: 'blur(0)' }], { delay: 120, dur: 700 });
    entrar(veredicto.querySelector('.vd-identidad'), 360, 10);
    odometro(veredicto.querySelector('.vd-num'), 0, f.puntaje.total, { delay: 450, dur: 1300 });
    veredicto.querySelectorAll('.vd-ref, .vd-vitrina, .vd-trofeos li, .vd-siguiente').forEach((x, i) => entrar(x, 600 + i * 60, 10));
    animar(carta, [{ opacity: 0, transform: 'translateY(60px) rotateY(-38deg) rotateX(10deg) scale(.9)', offset: 0 }], { delay: 200, dur: 1200, easing: RESORTE });
    odometro(pts, 0, f.puntaje.total, { delay: 520, dur: 1200 });
    animar(carta.querySelector('.carta-foil'), [{ backgroundPosition: '0% 50%', offset: 0 }], { delay: 300, dur: 1400, easing: EXPO });
    tray.entrar(500);
    if (!(inst() || reducido())) esperar(raiz, 1100).then(() => amb.pulso('logro'));
  }
  return { nodo: raiz, entrar: entrada, listo: () => carga, arte: null, animo: 'normal', encuadre: 'carta', velo: 0.45 };
}

// ---------- la trayectoria dibujada: cinta de orgs + curva de nivel + hitos ----------
function trayectoriaDibujada(f, orgPeor) {
  const W = 1000;
  const H = 150;
  const CURVA = 96;
  const historia = f.tarjeta?.historia ?? [];
  const puntos = f.trayectoria?.puntos ?? [];
  const desde = Math.min(f.jugador?.anio ? f.jugador.anio - (f.jugador.edad - 15) : 2026, puntos[0]?.x ?? 2026);
  const hasta = (f.trayectoria?.dominio?.[1] ?? 2044) + 1;
  const X = (anio) => ((anio - desde) / (hasta - desde)) * W;
  const nivMin = 30;
  const nivMax = 100;
  const Y = (n) => CURVA - ((n - nivMin) / (nivMax - nivMin)) * (CURVA - 8);
  const s = svg('svg', { class: 'td-svg', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  // area y curva
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.nivel).toFixed(1)}`).join(' ');
  const area = svg('path', { class: 'td-area', d: `${d} L${X(puntos[puntos.length - 1]?.x ?? hasta).toFixed(1)} ${CURVA} L${X(puntos[0]?.x ?? desde).toFixed(1)} ${CURVA} Z` });
  const curva = svg('path', { class: 'td-curva', d });
  s.append(area, curva);
  // cinta de orgs
  historia.forEach((h, i) => {
    const x0 = X(h.desdeAnio);
    const x1 = X(Math.max(h.hastaAnio, h.desdeAnio + 0.5));
    s.append(svg('rect', { class: `td-org ${i % 2 ? 'par' : ''} ${h.titulos?.length ? 'con-titulo' : ''}`, x: x0.toFixed(1), y: CURVA + 14, width: Math.max(1, x1 - x0 - 2).toFixed(1), height: 3 }));
  });
  const nodo = el('figure', { class: 'tray-dibujada', 'aria-label': 'Tu trayectoria: nivel por split y clubes' });
  const capa = el('div', { class: 'td-capa' });
  // etiquetas HTML (texto nitido) sobre el svg estirado
  historia.forEach((h) => {
    const x0 = X(h.desdeAnio) / W;
    const x1 = X(Math.max(h.hastaAnio, h.desdeAnio + 0.5)) / W;
    if (x1 - x0 < 0.05) return;
    capa.append(el('span', { class: 'td-org-nom', style: { left: `${x0 * 100}%`, width: `${(x1 - x0) * 100}%` }, text: h.org === historia[0].org && orgPeor ? orgPeor : h.org }));
  });
  for (const hi of f.trayectoria?.hitos ?? []) {
    const p = puntos.reduce((m, q) => (Math.abs(q.x - hi.anio - 0.5) < Math.abs(m.x - hi.anio - 0.5) ? q : m), puntos[0] ?? { x: hi.anio, nivel: 60 });
    const grande = hi.tipo === 'mundial' || hi.tipo === 'goldenRoad';
    if (hi.tipo === 'goldenRoad') continue;
    capa.append(el('i', { class: `td-hito ${hi.tipo}${grande ? ' grande' : ''}`, title: hi.texto, style: { left: `${(X(hi.anio + 0.5) / W) * 100}%`, top: `${(Y(p.nivel) / H) * 100}%` } }));
  }
  const gr = (f.goldenRoads ?? [])[0];
  if (gr) {
    const p = puntos.find((q) => Math.floor(q.x) === gr) ?? puntos[0];
    capa.append(el('span', { class: 'td-gr', style: { left: `${(X(gr + 0.5) / W) * 100}%`, top: `${(Y(p?.nivel ?? 90) / H) * 100}%` } }, [icono('copa'), `Golden Road ${gr}`]));
  }
  [15, 20, 25, 30, f.tarjeta?.edadRetiro].filter(Boolean).forEach((edad) => {
    const anio = desde + (edad - 15);
    capa.append(el('span', { class: 'td-edad', style: { left: `${(X(anio) / W) * 100}%` }, text: `${edad}` }));
  });
  nodo.append(s, capa, el('figcaption', { class: 'sr', text: historia.map((h) => `${h.org} ${h.desdeAnio}–${h.hastaAnio}`).join(', ') }));
  return {
    nodo,
    entrar(delay) {
      // el trazo no escala (vector-effect): el largo en pantalla es mayor que en el viewBox; se sobra a proposito
      const largo = (curva.getTotalLength?.() || 2000) * 3;
      curva.style.strokeDasharray = `${largo} ${largo}`;
      animar(curva, [{ strokeDashoffset: largo }, { strokeDashoffset: 0 }], { delay: delay - 200, dur: 1100, easing: 'cubic-bezier(.45,0,.2,1)' });
      animar(area, [{ opacity: 0 }, { opacity: 1 }], { delay: delay + 300, dur: 700 });
      capa.querySelectorAll('.td-org-nom, .td-edad').forEach((x, i) => entrar(x, delay + 200 + i * 40, 6));
      capa.querySelectorAll('.td-hito, .td-gr').forEach((x, i) => animar(x, [{ opacity: 0, scale: '0' }, { opacity: 1, scale: '1' }], { delay: delay + 380 + i * 35, dur: 420, easing: RESORTE }));
    },
  };
}
