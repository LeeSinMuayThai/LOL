// LA CEREMONIA DEL LOL (PLANUI §4.9, LINEA.md regla 7 y §4.3). Los gestos nativos del cliente comparten UN estilo de
// inspiracion hextech, propio (nunca assets de Riot): un filete de oro fino en degrade (claro -> hondo), un relleno azul
// petroleo y un turquesa propio para el brillo (tokens --ln-* en tokens.css; estilos/ceremonia.css). Son cuatro y solo
// ellos lo usan:
//   anilloAceptar   el aviso de PARTIDA ENCONTRADA: el aro que se vacia como reloj y el ¡ACEPTAR! grande
//   bloquear        el BLOQUEAR del inicio (el mismo look), con el destello de ceremonia al bloquear (FIRMAR lo usa)
//   victoriaDerrota el cartel de fin de partida, con su emblema propio (alado / quebrado)
//   quemar          el quemado de Fearless sobre una carta
// Todo se anima con WAAPI (las animaciones se devuelven: congelar(t) las puede buscar). Con movimiento reducido o INST
// todo aparece en su estado final y el aro queda lleno y quieto (nunca entra solo). <= 1 destello por gesto.
import { el, svg, reducido, inst, EXPO, SALE } from './util.js';

const quieto = () => reducido() || inst();
let serie = 0;
const nuevoId = (p) => `${p}-${++serie}`;
// WAAPI, salvo en el camino quieto (el estado final ya es el de CSS)
const animar = (nodo, cuadros, opciones) => (nodo && !quieto() ? nodo.animate(cuadros, { fill: 'backwards', easing: EXPO, ...opciones }) : null);
const vivas = (lista) => lista.filter(Boolean);
// Una tecla que vale mientras el nodo esta en la pagina (se suelta sola al desmontarlo). La tecla que dispara el gesto
// se consume ahi: se escucha en la captura del documento (antes que la pantalla y que main.js, sin importar quien se
// registro primero) y, si el gesto ocurrio (`fn` devuelve true), no sigue. Asi el mismo Enter que firma (o acepta) no
// llega a la pantalla como "saltear la animacion"; el Enter siguiente si llega. Si no ocurrio (el boton deshabilitado),
// la tecla sigue su camino como siempre.
function escucharTecla(nodo, tecla, fn) {
  const h = (e) => {
    if (!nodo.isConnected) return document.removeEventListener('keydown', h, true);
    if (e.key !== tecla || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (!fn()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  document.addEventListener('keydown', h, true);
  return () => document.removeEventListener('keydown', h, true);
}
// El degrade de oro de un SVG (los colores salen de CSS: .ln-oro-0/1/2 en ceremonia.css)
function degradeOro(id, { vertical = true } = {}) {
  return svg('linearGradient', { id, x1: '0', y1: '0', x2: vertical ? '0' : '1', y2: vertical ? '1' : '0' }, [
    svg('stop', { offset: '0', class: 'ln-oro-0' }),
    svg('stop', { offset: '0.55', class: 'ln-oro-1' }),
    svg('stop', { offset: '1', class: 'ln-oro-2' }),
  ]);
}

// ======================================================================================================================
// anilloAceptar: el aviso tipo PARTIDA ENCONTRADA
// ======================================================================================================================
// La geometria del aro (en unidades del SVG): la caja, el aro que se vacia, el filete de afuera y el de adentro. Se
// exporta para quien dibuje encima del anillo (el portal de la decision, js/escena.js): asi nadie repite los numeros.
export const ARO = Object.freeze({ lado: 240, radio: 104, marco: 117, interior: 92 });
const T_ENTRADA = 380; // cuando arranca el reloj, despues de la entrada
const T_SALIDA = 260;
// `velo` (opcional): cuanto tapa el velo de atras, un numero 0-1 o el nombre de un token ('--dc-aviso-velo'); sin el,
// el del kit (tapa todo: el velo de --ln-velo).
export function anilloAceptar({ escudo, encabezado = '¡PARTIDA ENCONTRADA!', cola = '', tono, segundos = 12, alAceptar, sonido, velo } = {}) {
  const idEnc = nuevoId('ln-aviso-enc');
  const idCola = nuevoId('ln-aviso-cola');
  const idOro = nuevoId('ln-oro');
  const C = 2 * Math.PI * ARO.radio;
  const c = ARO.lado / 2;
  const aro = svg('circle', { class: 'ln-aviso-aro', cx: c, cy: c, r: ARO.radio, stroke: `url(#${idOro})`, 'stroke-dasharray': C.toFixed(2), transform: `rotate(-90 ${c} ${c})` });
  const cabeza = svg('g', { class: 'ln-aviso-cabeza' }, [svg('circle', { class: 'ln-aviso-halo', cx: c, cy: c - ARO.radio, r: 9 }), svg('circle', { class: 'ln-aviso-punta', cx: c, cy: c - ARO.radio, r: 4 })]);
  const dibujo = svg('svg', { class: 'ln-aviso-svg', viewBox: `0 0 ${ARO.lado} ${ARO.lado}`, 'aria-hidden': 'true', focusable: 'false' }, [
    svg('defs', {}, [degradeOro(idOro)]),
    svg('circle', { class: 'ln-aviso-marco', cx: c, cy: c, r: ARO.marco, stroke: `url(#${idOro})` }),
    svg('circle', { class: 'ln-aviso-pista', cx: c, cy: c, r: ARO.radio }),
    aro,
    svg('circle', { class: 'ln-aviso-interior', cx: c, cy: c, r: ARO.interior, stroke: `url(#${idOro})` }),
    cabeza,
  ]);
  const boton = el('button', { type: 'button', class: 'ln-aceptar', 'aria-keyshortcuts': 'Enter' }, [el('span', { class: 'ln-aceptar-txt', text: '¡Aceptar!' }), el('kbd', { class: 'ln-aceptar-tecla', text: 'Enter' })]);
  const tarjeta = el('div', { class: 'ln-aviso-tarjeta' }, [
    el('p', { class: 'ln-aviso-enc', id: idEnc, text: encabezado }),
    el('div', { class: 'ln-aviso-anillo' }, [el('div', { class: 'ln-aviso-resplandor', 'aria-hidden': 'true' }), dibujo, el('div', { class: 'ln-aviso-escudo' }, escudo ?? null)]),
    cola ? el('p', { class: 'ln-aviso-cola', id: idCola, text: cola }) : null,
    boton,
  ]);
  const capaVelo = el('div', { class: 'ln-aviso-velo', 'aria-hidden': 'true' });
  const fogonazo = el('div', { class: 'ln-aviso-fogonazo', 'aria-hidden': 'true' });
  const nodo = el('div', { class: 'ln-aviso', role: 'alertdialog', 'aria-modal': 'false', 'aria-labelledby': idEnc, 'aria-describedby': cola ? idCola : null }, [capaVelo, fogonazo, tarjeta]);
  if (tono) for (const k of ['luz', 'contra', 'acento', 'noche']) if (tono[k]) nodo.style.setProperty(`--tono-${k}`, `var(${tono[k]})`);
  if (velo != null) {
    nodo.dataset.velo = '';
    nodo.style.setProperty('--ln-aviso-velo-k', typeof velo === 'number' ? `${(Math.min(1, Math.max(0, velo)) * 100).toFixed(1)}%` : `var(${velo})`);
  }

  const total = T_ENTRADA + Math.max(0, segundos) * 1000;
  const animaciones = vivas([
    animar(capaVelo, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'linear' }),
    animar(tarjeta, [{ opacity: 0, transform: 'translateY(10px) scale(0.94)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 60 }),
    // el fogonazo radial: un solo destello
    animar(fogonazo, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 0.9, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'scale(1.25)' }], { duration: 460, delay: 90, easing: 'ease-out' }),
    // el aro se vacia (el reloj) y la cabeza va con su punta
    animar(aro, [{ strokeDashoffset: '0' }, { strokeDashoffset: C.toFixed(2) }], { duration: segundos * 1000, delay: T_ENTRADA, easing: 'linear', fill: 'both' }),
    animar(cabeza, [{ transform: 'rotate(360deg)' }, { transform: 'rotate(0deg)' }], { duration: segundos * 1000, delay: T_ENTRADA, easing: 'linear', fill: 'both' }),
  ]);
  const reloj = animaciones.find((a) => a.effect?.target === aro) ?? null;
  let hecho = false;
  let soltar = () => {};
  function aceptar() {
    if (hecho) return false;
    hecho = true;
    soltar();
    reloj?.pause();
    animaciones.find((a) => a.effect?.target === cabeza)?.pause();
    nodo.dataset.aceptado = '';
    sonido?.clic?.();
    animaciones.push(...vivas([animar(tarjeta, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.04)' }], { duration: T_SALIDA, easing: SALE, fill: 'forwards' }), animar(capaVelo, [{ opacity: 1 }, { opacity: 0 }], { duration: T_SALIDA, delay: 60, easing: 'linear', fill: 'forwards' })]));
    alAceptar?.();
    return true;
  }
  boton.addEventListener('click', aceptar);
  soltar = escucharTecla(nodo, 'Enter', aceptar);
  // Al llegar a cero entra solo (nunca decide por vos: la oferta queda aceptada). El reloj REAL tiene que haber corrido
  // todo el tiempo: si alguien busca la animacion con congelar(), no dispara.
  const t0 = performance.now();
  reloj?.finished.then(() => {
    if (!hecho && nodo.isConnected && performance.now() - t0 >= total - 80) aceptar();
  }, () => {});
  if (!quieto()) sonido?.ding?.();
  return {
    nodo,
    aceptar,
    destruir() {
      hecho = true;
      soltar();
      animaciones.forEach((a) => a.cancel());
      nodo.remove();
    },
    animaciones,
  };
}

// ======================================================================================================================
// bloquear: el BLOQUEAR del inicio, con el destello de ceremonia
// ======================================================================================================================
export function bloquear({ texto = 'BLOQUEAR', tecla = 'Enter', alBloquear, sonido } = {}) {
  const onda = el('i', { class: 'ln-bq-onda', 'aria-hidden': 'true' });
  const txt = el('span', { class: 'ln-bq-txt', text: texto });
  const nodo = el('button', { type: 'button', class: 'ln-bloquear encendido', 'aria-keyshortcuts': tecla }, [txt, onda]);
  let bloqueado = false;
  let soltar = () => {};
  function hacer() {
    if (bloqueado || nodo.disabled) return false;
    bloqueado = true;
    soltar();
    nodo.classList.remove('encendido');
    nodo.dataset.estado = 'bloqueado';
    nodo.setAttribute('aria-pressed', 'true');
    sonido?.golpe?.();
    // el anillo de destello: un solo destello que se abre desde el boton
    animar(onda, [{ opacity: 0.95, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.7, 2.6)' }], { duration: 560, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
    animar(nodo, [{ transform: 'scale(0.96)' }, { transform: 'none' }], { duration: 260 });
    alBloquear?.();
    return true;
  }
  nodo.addEventListener('click', hacer);
  soltar = escucharTecla(nodo, tecla, hacer);
  return {
    nodo,
    bloquear: hacer,
    habilitar(si = true) {
      if (bloqueado) return;
      nodo.disabled = !si;
      nodo.classList.toggle('encendido', Boolean(si));
    },
    destruir() {
      soltar();
      nodo.remove();
    },
  };
}

// ======================================================================================================================
// victoriaDerrota: el cartel de fin de partida, con su emblema propio
// ======================================================================================================================
// El emblema: una cresta en rombo con un ojo de luz, y dos alas de cuatro plumas (VICTORIA, abiertas en oro) o la
// misma cresta partida con las alas rotas en esquirlas (DERROTA, en carmesi). Dibujo propio en SVG.
const PLUMAS = [
  'M0 0 C -26 -10 -62 -22 -112 -26 C -90 -14 -54 -2 0 8 Z',
  'M0 6 C -24 0 -58 -4 -104 -2 C -82 8 -50 16 0 16 Z',
  'M0 14 C -22 12 -52 14 -92 22 C -70 28 -44 30 0 24 Z',
  'M0 22 C -18 24 -42 30 -74 42 C -54 44 -34 40 0 30 Z',
];
const ESQUIRLAS = ['M0 2 L -38 -8 L -64 -2 L -30 8 Z', 'M -44 6 L -86 4 L -70 14 Z', 'M0 14 L -30 18 L -52 30 L -20 26 Z', 'M -40 24 L -62 40 L -48 38 Z'];
function emblema(gano, idGrad) {
  const ala = (lado) =>
    svg('g', { class: `ln-vd-ala ln-vd-ala-${lado}`, transform: lado === 'izq' ? 'translate(118 70)' : 'translate(202 70) scale(-1 1)' }, [
      svg('g', { class: 'ln-vd-ala-giro' }, (gano ? PLUMAS : ESQUIRLAS).map((d, i) => svg('path', { d, class: 'ln-vd-pluma', fill: `url(#${idGrad})`, opacity: String(1 - i * 0.12) }))),
    ]);
  const cresta = gano
    ? [svg('path', { class: 'ln-vd-cresta', d: 'M160 18 L190 70 L160 132 L130 70 Z', fill: `url(#${idGrad})` }), svg('path', { class: 'ln-vd-cresta-in', d: 'M160 34 L180 70 L160 112 L140 70 Z' }), svg('circle', { class: 'ln-vd-ojo', cx: 160, cy: 70, r: 7 })]
    : [
        svg('path', { class: 'ln-vd-cresta', d: 'M160 18 L166 52 L156 74 L164 96 L160 132 L130 70 Z', fill: `url(#${idGrad})` }),
        svg('path', { class: 'ln-vd-cresta ln-vd-mitad', d: 'M164 18 L194 70 L166 132 L170 96 L162 74 L172 52 Z', fill: `url(#${idGrad})` }),
        svg('path', { class: 'ln-vd-grieta', d: 'M163 18 L169 52 L159 74 L167 96 L163 132' }),
      ];
  return svg('svg', { class: 'ln-vd-emblema', viewBox: '0 0 320 150', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('defs', {}, [
      svg('linearGradient', { id: idGrad, x1: '0', y1: '0', x2: '0', y2: '1' }, [svg('stop', { offset: '0', class: gano ? 'ln-vic-g0' : 'ln-der-g0' }), svg('stop', { offset: '0.5', class: gano ? 'ln-vic-g1' : 'ln-der-g1' }), svg('stop', { offset: '1', class: gano ? 'ln-vic-g2' : 'ln-der-g2' })]),
    ]),
    ala('izq'),
    ala('der'),
    ...cresta,
  ]);
}
export function victoriaDerrota({ gano = true, sub = '', tono, retardo = 0 } = {}) {
  const palabra = el('p', { class: 'ln-vd-palabra', text: gano ? 'Victoria' : 'Derrota' });
  const subN = sub ? el('p', { class: 'ln-vd-sub', text: sub }) : null;
  const marca = emblema(gano, nuevoId('ln-vd-grad'));
  const estallido = el('div', { class: 'ln-vd-estallido', 'aria-hidden': 'true' });
  const nodo = el('div', { class: 'ln-vd', 'data-gano': gano ? 'si' : 'no', role: 'status' }, [estallido, marca, palabra, subN]);
  if (tono) for (const k of ['luz', 'contra', 'acento']) if (tono[k]) nodo.style.setProperty(`--tono-${k}`, `var(${tono[k]})`);
  const alas = [...marca.querySelectorAll('.ln-vd-ala-giro')];
  const d = Math.max(0, retardo);
  const animaciones = vivas([
    // el golpe: la palabra cae de 1,15 a 1
    animar(palabra, [{ opacity: 0, transform: 'scale(1.15)', filter: 'blur(6px)' }, { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }], { duration: 300, delay: d + 60, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' }),
    // el estallido de luz: un solo destello
    animar(estallido, [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.25 }, { opacity: 0.32, transform: 'scale(1.35)' }], { duration: 900, delay: d + 40, easing: 'ease-out' }),
    animar(marca, [{ opacity: 0, transform: 'translateY(14px) scale(0.9)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: d + 120 }),
    // las alas se abren (o caen, rotas)
    ...alas.map((a) => animar(a, gano ? [{ transform: 'rotate(-34deg) scale(0.7)' }, { transform: 'none' }] : [{ transform: 'rotate(10deg) translateY(-6px)' }, { transform: 'none' }], { duration: gano ? 620 : 520, delay: d + 160, easing: gano ? 'cubic-bezier(0.2, 1.3, 0.4, 1)' : EXPO })),
    subN ? animar(subN, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: d + 420 }) : null,
  ]);
  return { nodo, animaciones };
}

// ======================================================================================================================
// quemar: el quemado de Fearless
// ======================================================================================================================
// `nodoCarta`: un contenedor (la carta con su retrato adentro). Sus hijos se desaturan y quedan apagados (~45 %); una
// linea de brasa la cruza en diagonal, con brillo, y deja un tajo fino. El estado final es CSS (.ln-quemada): con
// movimiento reducido o INST se ve directo.
export function quemar(nodoCarta, { retardo = 0, sonido } = {}) {
  if (!nodoCarta) return [];
  if (getComputedStyle(nodoCarta).position === 'static') nodoCarta.style.position = 'relative';
  nodoCarta.querySelector(':scope > .ln-quema')?.remove();
  const brasa = el('i', { class: 'ln-quema-brasa' });
  const tajo = el('i', { class: 'ln-quema-tajo' });
  const capa = el('i', { class: 'ln-quema', 'aria-hidden': 'true' }, [brasa, tajo]);
  const hijos = [...nodoCarta.children];
  nodoCarta.append(capa);
  nodoCarta.classList.add('ln-quemada');
  const d = Math.max(0, retardo);
  const animaciones = vivas([
    animar(brasa, [{ transform: 'translate(-50%, -50%) rotate(-38deg) translateX(-130%)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { transform: 'translate(-50%, -50%) rotate(-38deg) translateX(130%)', opacity: 0 }], { duration: 560, delay: d, easing: 'cubic-bezier(0.45, 0, 0.3, 1)' }),
    animar(tajo, [{ transform: 'translate(-50%, -50%) rotate(-38deg) scaleX(0)', opacity: 1 }, { transform: 'translate(-50%, -50%) rotate(-38deg) scaleX(1)', opacity: 1 }], { duration: 480, delay: d + 40, easing: 'cubic-bezier(0.45, 0, 0.3, 1)' }),
    ...hijos.map((h) => animar(h, [{ filter: 'none' }, { filter: 'saturate(1.5) brightness(1.35)', offset: 0.3 }, { filter: 'grayscale(1) brightness(0.45)' }], { duration: 760, delay: d + 120, easing: 'ease-out' })),
  ]);
  if (sonido?.quemado) {
    if (quieto() || d === 0) sonido.quemado();
    else setTimeout(() => nodoCarta.isConnected && sonido.quemado(), d);
  }
  return animaciones;
}
