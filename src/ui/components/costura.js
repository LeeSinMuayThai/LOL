// La costura de la bisagra (PLANUI §4.9-§4.10 y §0.2; portado de `crearCostura` de vitrina/fusion/js/escena.js, con
// `op=linea`). Una decisión con destino (`ui/core/bisagra.js`: una opción te lleva a otra liga) no se lee en el panel
// solo: el mundo cruza a la COSTURA del ambiente, dos mundos enfrentados en una diagonal de luz, cada mitad en el tono de
// su liga. Encima, el DOM pone los destinos (sus logos, su lugar y lo que arriesgás en chips, la previa del motor). Si la
// bisagra es una oferta, llega como ¡OFERTA ENCONTRADA! (el aviso del cliente, `fx/ceremonia.js`): aceptar agranda el
// anillo como un portal y la costura se abre. Apuntar un camino corre la costura hacia su lado; elegir abre ese destino.
//
// Las variantes (compuerta 2, "según el contexto"; `varianteDeCostura`):
//   campeones · tu main en los dos lados, cada uno en su tono;
//   liga      · sin arte de campeón: en cada lado, el HÉROE de su liga (el logo monumental, la ciudad y la pared con los
//               escudos de sus equipos, del mundo de la carrera), en su tono; tu equipo marcado de un lado y "te llama"
//               del otro (el motor no dice quién: un escudo sin nombre).
// El DOM no dibuja el mundo: la costura la pinta el shader (el puente: `mundo.costura(cambio, cruce)` y
// `mundo.geometria()`, `shell.js`). Contrato con la decisión: { nodo, banda, entrar(), apuntar(i), soltar(), elegir(i),
// aceptarYa(), destruir(), avisoAbierto, retardoAceptar, focoAceptar } y `alAceptar({ instantaneo })` cuando se abre.
import { el, svg, animar, quieto, celular, EXPO, DUR } from '../fx/util.js';
import { esperar } from '../fx/movimiento.js';
import { icono, glifoDeCampo, triangulos, ABREVIATURA } from '../fx/iconos.js';
import { anilloAceptar, ARO } from '../fx/ceremonia.js';
import { tonoDestino, aplicarTono } from '../fx/tono.js';
import { pintarLogo, logoOrg, escudo } from '../fx/logos.js';
import { CAMINO, LADO_DEL_CAMINO } from '../core/bisagra.js';

const RIESGO = { seguro: 'seguro', incierto: 'incierto', ruleta: 'ruleta', alto: 'alto', peligroso: 'alto' };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const px = (v) => `${v.toFixed(1)}px`;

// La costura en reposo, cuánto se corre al apuntar un camino (hacia el lado que crece) y los cruces del ambiente (ms).
// En el celular se parte en vertical y su reposo es el medio de la banda de arriba (se mide).
const COSTURA = {
  centro: 0.5,
  corre: 0.13,
  correCel: 0.05,
  angulo: 12, // grados respecto de la vertical; al elegir se endereza (0)
  segundos: 12, // el aro del aviso
  cruce: 1100, // aceptar: el mundo cruza a la costura
  apunta: 700, // apuntar o soltar un camino
  abre: 1300, // elegir: la costura se va al otro borde y el destino elegido llena la pantalla
  aire: 12, // lo que separa cada destino de la línea (celular) y del panel (px)
  logoMin: 40, // el logo más chico de un destino cuando no entra nada más (px)
  // las dos caras arriba del panel: en escritorio, en el medio de la franja libre entre la barra de arriba y la línea
  // "antes", cada una al lado de su destino; en el celular, adentro de la banda
  caras: { alto: 2.1, altoMin: 0.45, junto: 0.1, altoCel: 1.5, cel: { a: [0.69, 0.27], b: [0.31, 0.76] } }
};
// El portal: el hueco y el aro, en fracciones de la caja del anillo del aviso.
const PORTAL = { hueco: ARO.interior / ARO.lado, aro: ARO.radio / ARO.lado };
// Los tiempos de la apertura, desde Aceptar (ms).
const T = {
  crece: 60,
  creceDur: 1000,
  curva: 'cubic-bezier(0.55, 0, 0.25, 1)', // arranca lento desde el anillo y sale disparado
  aroSale: 380,
  aroDur: 520,
  fin: 1100,
  lados: 560,
  panel: 120, // el corrimiento del orden de entrada del panel
  foco: 900 // el foco pasa al título de la parada
};
// Los héroes (`liga`), en px y fracciones (los de la vitrina): arriba · aire · alto máximo (en altos de pantalla) ·
// celular (el centro de cada héroe y el alto máximo, en fracciones de la banda) · el paso entre altos probados · debajo
// de `compacto` el monumento va sin la pared.
const HEROE = { arriba: 10, aire: 16, max: 0.5, cel: { a: 0.72, b: 0.28, alto: 0.44 }, compacto: 0.62, paso: 4 };
// La pared se enciende de a un escudo (ms).
const T_HEROE = { escudo: 32, pared: 220, ola: 26, olaDur: 420 };

// Un logo del kit sin su tamaño en línea: lo pone la clase.
function aClase(logo) {
  logo.style.removeProperty('--ln-logo-tam');
  return logo;
}

// El escudo de un equipo en la pared: su logo real (grabado en el tono del lado) o, si no hay, el escudo del sistema.
function escudoEquipo(nombre, yo) {
  const n = el('li', { class: 'dc-escudo', 'data-yo': yo ? '' : null });
  const info = logoOrg(nombre);
  if (!info.src) {
    n.append(escudo(info.iniciales));
    return n;
  }
  const img = el('img', { src: info.src, alt: nombre, decoding: 'async', draggable: 'false', referrerpolicy: 'no-referrer', 'data-tinta': info.tinta ?? null });
  img.addEventListener('error', () => img.replaceWith(escudo(info.iniciales)), { once: true });
  n.append(img);
  return n;
}
// El grabado: cada escudo se vuelve luz del tono de su lado (un filtro SVG por lado; el feFlood toma --tono-luz).
function filtroGrabado(id) {
  return svg('svg', { class: 'dc-filtros', width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('filter', { id, x: '0', y: '0', width: '1', height: '1', 'color-interpolation-filters': 'sRGB' }, [
      svg('feColorMatrix', { in: 'SourceGraphic', type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.15 0.5 0.05 0 0.3', result: 'luma' }),
      svg('feComposite', { in: 'luma', in2: 'SourceAlpha', operator: 'arithmetic', k1: '1', k2: '0', k3: '0', k4: '0', result: 'alfa' }),
      svg('feFlood', { class: 'dc-grabado-luz', result: 'tono' }),
      svg('feComposite', { in: 'tono', in2: 'alfa', operator: 'in' })
    ])
  ]);
}

// `lec`: `leerEvento` (ui/core/bisagra.js). `mundo`: el puente del ambiente (`ctx.mundo`). `arte`: tu main (la clave de
// Data Dragon). `equiposDe(liga)`: los nombres de las orgs de una liga en el mundo de la carrera. `contenedor`: el nodo de
// la parada (donde van la capa y el portal). `limite`: la línea "antes" (lo que encabeza el panel). `lateral`: la placa
// "Vos". `margen()`: el margen lateral de la pantalla (px).
export function crearCostura(lec, { mundo, arte, sonido, equiposDe = () => [], contenedor, limite, lateral, margen = () => 0, alAceptar, variante = 'campeones' }) {
  const ligaA = lec.casa.liga;
  const ligaB = lec.destino.id;
  const compA = lec.casa.primera ?? ligaA;
  const compB = lec.destino.primera ?? ligaB;
  const tonos = { a: compA ? tonoDestino(compA) : null, b: tonoDestino(compB) };
  const heroe = variante === 'liga' ? 'liga' : null;
  const arteLado = heroe ? null : arte;
  const capa = el('div', { class: 'dc-costura', 'aria-hidden': 'true', 'data-fase': lec.aviso ? 'aviso' : 'costura', 'data-apunta': '', 'data-elegido': '', 'data-var': heroe ?? 'campeones' });
  // en el celular la costura se parte en vertical: la banda (en el flujo, arriba del panel) le deja lugar
  const banda = el('div', { class: 'dc-banda', 'aria-hidden': 'true' });

  // ---------- los dos destinos: logos, lugar y lo que arriesgás ----------
  const chip = (p) => {
    const k = glifoDeCampo(p.campo);
    return el('li', { class: `dc-chip ${p.signo === '-' ? 'baja' : 'sube'}` }, [icono(k), el('span', { class: 'dc-chip-nom', text: ABREVIATURA[k] ?? p.etiqueta }), triangulos(p.magnitud, p.signo)]);
  };
  const chipRiesgo = (r) => {
    const k = RIESGO[r] ?? 'incierto';
    return el('li', { class: 'dc-chip dc-chip-riesgo', 'data-riesgo': k }, [icono(k), el('span', { class: 'dc-chip-nom', text: r })]);
  };
  const filaDe = (c, n) =>
    c.bloqueada
      ? el('li', { class: 'dc-fila dc-cerrada', 'data-i': String(n) }, el('span', { class: 'dc-cabeza' }, [el('span', { class: 'dc-tecla' }, icono('candado')), el('span', { class: 'dc-camino', text: [CAMINO[c.camino], 'cerrada'].filter(Boolean).join(' · ') })]))
      : el('li', { class: 'dc-fila', 'data-i': String(n) }, [
        el('span', { class: 'dc-cabeza' }, [el('span', { class: 'dc-tecla', text: String(n + 1) }), el('span', { class: 'dc-camino', text: CAMINO[c.camino] ?? '' })]),
        el('ul', { class: 'dc-chips' }, [...c.previa.map(chip), c.riesgo ? chipRiesgo(c.riesgo) : null])
      ]);
  // El tamaño de cada logo lo dice su clase (decision.css, en px de los tokens --dc-*), no el de `pintarLogo`.
  const logoLiga = (id, clase) => aClase(pintarLogo(id ?? '?', { liga: true, clase, alt: '' }));
  const logoOrgDe = (nombre, clase) => aClase(pintarLogo(nombre, { clase, alt: '' }));
  function lado(l) {
    const enA = l === 'a';
    const filas = lec.caminos.map((c, n) => (LADO_DEL_CAMINO[c.camino] === l ? filaDe(c, n) : null)).filter(Boolean);
    // liga: el logo y el lugar van en el monumento; el destino lleva lo que arriesgás
    if (heroe === 'liga') return el('div', { class: 'dc-lado', 'data-lado': l }, [filas.length ? el('ul', { class: 'dc-filas' }, filas) : null]);
    const logos = enA
      ? [ligaA ? logoLiga(ligaA, 'dc-logo-liga') : null, lec.casa.org ? logoOrgDe(lec.casa.org, 'dc-logo-org') : null]
      : [logoLiga(ligaB, 'dc-logo-liga')];
    const lugar = enA ? lec.casa.ciudad ?? lec.casa.org ?? lec.casa.nombre ?? lec.casa.servidor : lec.destino.ciudad ?? lec.destino.nombre;
    const sub = (enA ? [lec.casa.nombre, lec.casa.org] : [lec.destino.nombre, lec.destino.region]).filter(Boolean).join(' · ');
    return el('div', { class: 'dc-lado', 'data-lado': l }, [
      el('div', { class: 'dc-logos' }, logos),
      el('p', { class: 'dc-lugar' }, [el('b', { text: lugar ?? '' }), sub ? el('span', { text: sub }) : null]),
      filas.length ? el('ul', { class: 'dc-filas' }, filas) : null
    ]);
  }
  const lados = { a: lado('a'), b: lado('b') };
  if (tonos.a) aplicarTono(lados.a, tonos.a);
  aplicarTono(lados.b, tonos.b);
  capa.append(lados.a, lados.b);

  // ---------- (liga) los héroes: el monumento de cada liga ----------
  function heroeLiga(l) {
    const enA = l === 'a';
    const liga = enA ? ligaA : ligaB;
    const tuyo = enA ? lec.casa.org : null;
    const igual = (x, y) => String(x ?? '').toLowerCase() === String(y ?? '').toLowerCase();
    const equipos = equiposDe(liga);
    const id = `dc-grabado-${l}`;
    const pared = equipos.length
      ? el('ul', { class: 'dc-pared', style: { '--dc-cols': String(Math.ceil(equipos.length / 2)), '--dc-grabado': `url(#${id})` } }, equipos.map((nombre) => escudoEquipo(nombre, tuyo && igual(nombre, tuyo))))
      : null;
    const marca = enA
      ? (tuyo ? el('p', { class: 'dc-marca' }, [logoOrgDe(tuyo, 'dc-marca-escudo'), el('span', { class: 'dc-marca-txt' }, [el('b', { text: 'Tu equipo' }), el('span', { text: tuyo })])]) : null)
      : el('p', { class: 'dc-marca dc-te-llama' }, [el('span', { class: 'ln-logo dc-marca-escudo dc-incognito' }, escudo('?')), el('span', { class: 'dc-marca-txt' }, [el('b', { text: 'Te llama' }), el('span', { text: `un equipo de la ${lec.destino.nombre}` })])]);
    const ciudad = enA ? lec.casa.ciudad : lec.destino.ciudad;
    const nombre = enA ? lec.casa.nombre : lec.destino.nombre;
    const region = enA ? lec.casa.region : lec.destino.region;
    const mon = el('div', { class: 'dc-monumento' }, [
      filtroGrabado(id),
      logoLiga(liga, 'dc-mon-logo'),
      el('p', { class: 'dc-mon-lugar' }, [el('b', { text: ciudad ?? nombre ?? '' }), el('span', { text: [nombre, region].filter(Boolean).join(' · ') })]),
      pared,
      marca
    ]);
    return { contenido: mon, natural: () => [mon.offsetWidth, mon.offsetHeight] };
  }
  const heroes = heroe ? {} : null;
  if (heroe) {
    for (const l of ['a', 'b']) {
      const h = heroeLiga(l);
      h.luz = el('div', { class: 'dc-heroe-luz' }, h.contenido);
      h.escala = el('div', { class: 'dc-heroe-escala' }, h.luz);
      h.nodo = el('div', { class: 'dc-heroe', 'data-lado': l, 'data-heroe': 'liga' }, h.escala);
      if (tonos[l]) aplicarTono(h.nodo, tonos[l]);
      heroes[l] = h;
      capa.append(h.nodo);
    }
  }

  // ---------- dónde va la costura y dónde caen los destinos ----------
  function reposo() {
    if (!celular() || !banda.isConnected) return COSTURA.centro;
    const r = banda.getBoundingClientRect();
    return clamp((r.top + r.height / 2) / innerHeight, 0, 1);
  }
  let base = COSTURA.centro;
  const corre = () => (celular() ? COSTURA.correCel : COSTURA.corre);
  const posDe = (l) => (l === 'b' ? base - corre() : l === 'a' ? base + corre() : base);
  const posElegido = (l) => (l === 'b' ? 0 : 1);
  let medidas = { a: [0, 0], b: [0, 0], margen: 0 };
  const columna = () => contenedor.querySelector('.parada-col');
  // Lo que tiene debajo cada destino: la línea "antes" (o el panel, si no hay línea) o, si el destino cae sobre la
  // placa "Vos", la placa. Si no entra hasta ahí, va compacto (sin las filas: el panel ya las dice); si tampoco, solo
  // sus logos, del alto que quede.
  const topeDelPanel = () => {
    const r = limite?.getBoundingClientRect();
    return r && r.height > 0 ? r.top : columna()?.getBoundingClientRect().top ?? null;
  };
  function topeDe(l) {
    const r = lateral?.getBoundingClientRect();
    if (l === 'b' && r?.height && (((1 + base) / 2) * innerWidth > r.left)) return Math.min(r.top, topeDelPanel() ?? r.top);
    return topeDelPanel();
  }
  const medir = () => {
    for (const l of ['a', 'b']) {
      const n = lados[l];
      n.classList.remove('dc-compacto', 'dc-mini');
      const tope = celular() ? null : topeDe(l);
      if (tope == null) continue;
      const libre = tope - n.getBoundingClientRect().top - COSTURA.aire;
      if (n.offsetHeight > libre) n.classList.add('dc-compacto');
      if (n.offsetHeight > libre) {
        n.classList.add('dc-mini');
        n.style.setProperty('--dc-logo-cabe', `${Math.max(COSTURA.logoMin, libre).toFixed(0)}px`);
      }
    }
    medidas = { a: [lados.a.offsetWidth, lados.a.offsetHeight], b: [lados.b.offsetWidth, lados.b.offsetHeight], margen: margen() };
  };
  // Cada cuadro: los destinos siguen a sus caras (la geometría de la costura del ambiente, también mientras cruza).
  let raf = 0;
  function ubicar() {
    raf = requestAnimationFrame(ubicar);
    const g = mundo.geometria();
    const W = innerWidth;
    const H = innerHeight;
    const { a: [wa, ha], b: [wb, hb], margen: m } = medidas;
    const cz = g?.k > 0 && g.a && g.b ? g : null;
    const cr = carasYa ?? caras();
    if (heroe) ubicarHeroes();
    if (!celular()) {
      if (heroe) {
        lados.a.style.transform = `translate(${px(m)}, 0)`;
        lados.b.style.transform = `translate(${px(W - m - wb)}, 0)`;
        return;
      }
      const junto = (cr?.alto ?? 0) * H * COSTURA.caras.junto;
      const ca = cz ? g.a.x * W : (cr?.a.x ?? 0.25) * W;
      const cb = cz ? g.b.x * W : (cr?.b.x ?? 0.75) * W;
      lados.a.style.transform = `translate(${px(clamp(ca - junto - wa, m, W - m - wa))}, 0)`;
      lados.b.style.transform = `translate(${px(clamp(cb + junto, m, W - m - wb))}, 0)`;
      return;
    }
    // celular: los dos adentro de la banda (que se mueve con el panel); elegido, el que queda sube al principio
    const r = banda.getBoundingClientRect();
    const aire = COSTURA.aire;
    const yaC = (cz ? g.a.y : cr?.a.y ?? 0.25) * H;
    const ybC = (cz ? g.b.y : cr?.b.y ?? 0.75) * H;
    const e = capa.dataset.elegido;
    const ya = e === 'a' ? r.top + aire : clamp(yaC - ha / 2, r.top + aire, r.bottom - ha - aire);
    const yb = e === 'b' ? r.top + aire : clamp(ybC - hb / 2, r.top + aire, r.bottom - hb - aire);
    lados.a.style.transform = `translate(${px(m)}, ${px(ya)})`;
    lados.b.style.transform = `translate(${px(W - m - wb)}, ${px(yb)})`;
  }
  const costura = (cambio, cruce) => mundo.costura(cambio, cruce);
  // Dónde caen las caras: arriba del panel, al lado de cada destino. Se quedan quietas al apuntar y al elegir (corre la
  // línea, no ellas).
  let carasYa = null;
  function caras() {
    carasYa = heroe ? carasHeroes() : medirCaras();
    return carasYa;
  }
  const franjaAbajo = () => document.querySelector('.franja')?.getBoundingClientRect().bottom ?? 0;
  function medirCaras() {
    const W = innerWidth;
    const H = innerHeight;
    if (celular()) {
      const r = banda.getBoundingClientRect();
      if (!(r.height > 0)) return null;
      const [ax, ay] = COSTURA.caras.cel.a;
      const [bx, by] = COSTURA.caras.cel.b;
      return { a: { x: ax, y: (r.top + r.height * ay) / H }, b: { x: bx, y: (r.top + r.height * by) / H }, alto: Math.min(1, (r.height * COSTURA.caras.altoCel) / H) };
    }
    const arriba = franjaAbajo();
    const abajo = topeDelPanel() ?? H / 2;
    const libre = Math.max(0, abajo - arriba);
    const alto = Math.min(1, Math.max(COSTURA.caras.altoMin, (libre * COSTURA.caras.alto) / H));
    const y = (arriba + abajo) / 2 / H;
    const ladoX = Math.max(medidas.a[0], medidas.b[0]) + medidas.margen + alto * H * COSTURA.caras.junto;
    return { a: { x: ladoX / W, y }, b: { x: 1 - ladoX / W, y }, alto };
  }
  const prender = (cruce) => costura({ a: { arte: arteLado, tono: tonos.a }, b: { arte: arteLado, tono: tonos.b }, posicion: base, angulo: COSTURA.angulo, k: 1, caras: caras() }, cruce);
  const alRedimensionar = () => {
    medir();
    if (heroe) acomodar(true);
    if (capa.dataset.fase !== 'costura') return;
    base = reposo();
    const e = capa.dataset.elegido;
    costura({ posicion: e ? posElegido(e) : posDe(capa.dataset.apunta), caras: caras() }, 0);
  };
  addEventListener('resize', alRedimensionar);

  // ---------- (liga) dónde va cada héroe ----------
  // En escritorio: arriba del panel, entre su destino (contra el borde) y la línea, del alto que deja libre lo que tiene
  // debajo. Se prueban dos lugares (al lado del destino o contra la línea) y queda el que deja el héroe más grande; los
  // dos, del mismo alto. En el celular: en la banda, A arriba a la derecha y B abajo a la izquierda.
  let geo = null;
  const tg = () => Math.tan((COSTURA.angulo * Math.PI) / 180);
  const xLinea = (y) => base * innerWidth + (innerHeight / 2 - y) * tg();
  const visible = (n) => {
    const r = n?.getBoundingClientRect();
    return r && r.width > 1 && r.height > 1 ? r : null;
  };
  // lo que el héroe no puede tapar: lo escrito en la línea "antes", el panel y la placa
  const tapas = () => [...[...(limite?.children ?? [])].flatMap((n) => [...n.children]), columna(), lateral].map(visible).filter(Boolean);
  const aspecto = (l) => {
    const [w, h] = heroes[l].natural();
    return h > 0 ? w / h : 1;
  };
  function lugarEscritorio(l, arriba, obst) {
    const W = innerWidth;
    const asp = aspecto(l);
    const m = medidas.margen;
    const borde = l === 'a' ? m + medidas.a[0] + HEROE.aire : W - m - medidas.b[0] - HEROE.aire;
    const piso = (x0, x1) => obst.reduce((b, r) => (r.left < x1 && r.right > x0 && r.bottom > arriba ? Math.min(b, r.top) : b), innerHeight) - HEROE.aire;
    const lugar = (h, junto) => {
      const w = h * asp;
      const lo = l === 'a' ? borde : xLinea(arriba) + HEROE.aire;
      const hi = l === 'a' ? xLinea(arriba + h) - HEROE.aire : borde;
      if (hi - lo < w) return null;
      const x = l === 'a' ? (junto ? lo : hi - w) : junto ? hi - w : lo;
      const p = piso(x, x + w);
      return p - arriba >= h ? { x, h, junto, piso: p } : null;
    };
    for (let h = innerHeight * HEROE.max; h > 0; h -= HEROE.paso) {
      const p = lugar(h, true) ?? lugar(h, false);
      if (p) return p;
    }
    return { x: borde, h: 0, junto: true, piso: arriba };
  }
  function lugarCelular(l, r) {
    const W = innerWidth;
    const asp = aspecto(l);
    const yL = (x) => r.top + r.height / 2 - (x - W / 2) * tg();
    const cx = HEROE.cel[l] * W;
    for (let h = r.height * HEROE.cel.alto; h > 0; h -= HEROE.paso) {
      const w = h * asp;
      const arriba = l === 'a' ? r.top + COSTURA.aire : yL(cx - w / 2) + HEROE.aire;
      const abajo = l === 'a' ? yL(cx + w / 2) - HEROE.aire : r.bottom - COSTURA.aire;
      if (abajo - arriba >= h && w / 2 <= Math.min(cx, W - cx) - medidas.margen) return { cx, h, arriba, abajo };
    }
    return { cx, h: 0, arriba: r.top, abajo: r.top };
  }
  function calcular() {
    const W = innerWidth;
    if (!celular()) {
      const arriba = franjaAbajo() + HEROE.arriba;
      const obst = tapas();
      const la = lugarEscritorio('a', arriba, obst);
      const lb = lugarEscritorio('b', arriba, obst);
      const h = Math.min(la.h, lb.h);
      const y = arriba + Math.max(0, (Math.min(la.piso, lb.piso) - arriba - h) / 2);
      const m = medidas.margen;
      const ubicado = (l, p) => {
        const w = h * aspecto(l);
        const borde = l === 'a' ? m + medidas.a[0] + HEROE.aire : W - m - medidas.b[0] - HEROE.aire;
        const x = l === 'a' ? (p.junto ? borde : Math.max(borde, xLinea(y + h) - HEROE.aire - w)) : p.junto ? borde - w : Math.min(borde - w, xLinea(y) + HEROE.aire);
        return { x, y, w, h };
      };
      return { a: ubicado('a', la), b: ubicado('b', lb), bandaTop: 0 };
    }
    const r = banda.getBoundingClientRect();
    if (!(r.height > 0)) return null;
    const la = lugarCelular('a', r);
    const lb = lugarCelular('b', r);
    const h = Math.min(la.h, lb.h);
    const ubicado = (l, p) => {
      const w = h * aspecto(l);
      return { x: p.cx - w / 2, y: p.arriba + Math.max(0, (p.abajo - p.arriba - h) / 2), w, h };
    };
    return { a: ubicado('a', la), b: ubicado('b', lb), bandaTop: r.top };
  }
  function acomodar(fijar) {
    if (!heroes || !contenedor.isConnected) return;
    for (const l of ['a', 'b']) heroes[l].contenido.classList.remove('dc-mon-compacto');
    let g = calcular();
    const chico = g && ['a', 'b'].some((l) => g[l].h / Math.max(1, heroes[l].natural()[1]) < HEROE.compacto);
    if (chico) {
      for (const l of ['a', 'b']) heroes[l].contenido.classList.add('dc-mon-compacto');
      g = calcular();
    }
    if (!g) return;
    g.limTop = topeDelPanel() ?? 0;
    g.base = fijar || !geo ? { a: g.a.h, b: g.b.h } : geo.base;
    geo = g;
    for (const l of ['a', 'b']) {
      const nh = heroes[l].natural()[1];
      heroes[l].nodo.style.setProperty('--dc-heroe-k', (nh > 0 ? Math.min(1, geo[l].h / nh) : 1).toFixed(4));
    }
    ubicarHeroes();
  }
  function ubicarHeroes() {
    if (!geo) return;
    if (celular()) {
      const dy = banda.getBoundingClientRect().top - geo.bandaTop;
      for (const l of ['a', 'b']) heroes[l].nodo.style.transform = `translate(${px(geo[l].x)}, ${px(geo[l].y + dy)})`;
      return;
    }
    const lt = topeDelPanel() ?? 0;
    if (Math.abs(lt - geo.limTop) > 1) {
      geo.limTop = lt;
      acomodar(false);
      return;
    }
    for (const l of ['a', 'b']) heroes[l].nodo.style.transform = `translate(${px(geo[l].x)}, ${px(geo[l].y)})`;
  }
  function carasHeroes() {
    if (!geo) acomodar(true);
    if (!geo) return null;
    const H = innerHeight;
    const W = innerWidth;
    const dy = celular() ? banda.getBoundingClientRect().top - geo.bandaTop : 0;
    const c = (g) => ({ x: (g.x + g.w / 2) / W, y: (g.y + dy + g.h / 2) / H });
    return { a: c(geo.a), b: c(geo.b), alto: Math.min(1, Math.max(geo.a.h, 1) / H) };
  }
  // la pared del lado apuntado se enciende de a uno (una ola por columnas)
  function olaPared(l) {
    if (!heroe || !l || quieto()) return;
    const pared = heroes[l].contenido.querySelector('.dc-pared');
    if (!pared) return;
    const cols = Number(pared.style.getPropertyValue('--dc-cols')) || 1;
    [...pared.children].forEach((x, k) => animar(x, [{ transform: 'none' }, { transform: 'translateY(-14%) scale(1.14)' }, { transform: 'none' }], { delay: (k % cols) * T_HEROE.ola, dur: T_HEROE.olaDur, easing: 'ease-in-out' }));
  }
  function entrarHeroes(retardo) {
    if (!heroe) return;
    for (const l of ['a', 'b']) {
      const mon = heroes[l].contenido;
      animar(mon.querySelector('.dc-mon-logo'), [{ opacity: 0, transform: 'scale(.82)' }, { opacity: 1, transform: 'none' }], { delay: retardo, dur: DUR.larga });
      animar(mon.querySelector('.dc-mon-lugar'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: retardo + 120, dur: DUR.larga });
      const escudos = mon.querySelectorAll('.dc-escudo');
      escudos.forEach((x, k) => animar(x, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { delay: retardo + T_HEROE.pared + k * T_HEROE.escudo, dur: DUR.entra }));
      const marca = mon.querySelector('.dc-marca');
      if (marca) animar(marca, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: retardo + T_HEROE.pared + escudos.length * T_HEROE.escudo, dur: DUR.larga });
    }
  }

  // ---------- el aviso: ¡OFERTA ENCONTRADA! ----------
  let aviso = null;
  let avisoAbierto = false;
  let ya = false; // aceptar sin la apertura (elegir con el aviso abierto)
  const escudoDelDestino = () => pintarLogo(ligaB, { liga: true, tam: 124, alt: lec.destino.nombre });

  // ---------- aceptar: el anillo se agranda como un portal y el mundo cruza a la costura ----------
  function abrir() {
    if (!avisoAbierto) return;
    avisoAbierto = false;
    const instantaneo = ya || quieto();
    const r = aviso?.nodo.querySelector('.ln-aviso-anillo')?.getBoundingClientRect();
    capa.dataset.fase = 'costura';
    medir();
    base = reposo();
    if (heroe) acomodar(true);
    prender(instantaneo ? 0 : COSTURA.cruce);
    if (instantaneo || !r) {
      aviso?.destruir();
      aviso = null;
      if (heroe) entrarHeroes(0);
      alAceptar?.({ instantaneo: true });
      return;
    }
    // el portal: un velo con el hueco del anillo, que crece hasta salir de la pantalla; su borde es el aro dorado
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const hueco = r.width * PORTAL.hueco;
    const lejos = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + r.width * PORTAL.aro;
    const portal = el('div', { class: 'dc-portal', 'aria-hidden': 'true', style: { '--dc-px': px(cx), '--dc-py': px(cy), '--dc-pr': px(hueco) } });
    aplicarTono(portal, tonos.b);
    contenedor.append(portal);
    animar(portal, [{ '--dc-pr': px(hueco) }, { '--dc-pr': px(lejos) }], { delay: T.crece, dur: T.creceDur, easing: T.curva, fill: 'both' });
    animar(portal, [{ '--dc-pa': 1 }, { '--dc-pa': 0 }], { delay: T.aroSale, dur: T.aroDur, easing: 'linear', fill: 'both' });
    for (const l of ['a', 'b']) {
      animar(lados[l], [{ opacity: 0, translate: `${l === 'a' ? 24 : -24}px 0` }, { opacity: 1, translate: '0 0' }], { delay: T.lados, dur: DUR.larga });
      lados[l].querySelectorAll('.dc-logos > *').forEach((x, k) => animar(x, [{ opacity: 0, transform: 'scale(.82)' }, { opacity: 1, transform: 'none' }], { delay: T.lados + k * 70, dur: DUR.larga }));
      lados[l].querySelectorAll('.dc-chip, .dc-cerrada').forEach((x, k) => animar(x, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: T.lados + 160 + k * 40 }));
    }
    entrarHeroes(T.lados);
    esperar(portal, T.fin).then(() => {
      portal.remove();
      aviso?.destruir();
      aviso = null;
    });
    alAceptar?.({ instantaneo: false });
  }

  return {
    nodo: capa,
    banda,
    retardoAceptar: T.panel,
    focoAceptar: T.foco,
    get avisoAbierto() {
      return avisoAbierto;
    },
    entrar() {
      medir();
      cancelAnimationFrame(raf);
      ubicar();
      if (!lec.aviso) {
        // sin aviso: la costura entra con la pantalla
        base = reposo();
        if (heroe) acomodar(true);
        prender(quieto() ? 0 : COSTURA.cruce);
        entrarHeroes(0);
        return;
      }
      aviso = anilloAceptar({ escudo: escudoDelDestino(), encabezado: '¡Oferta encontrada!', cola: [lec.cupo, lec.destino.nombre].filter(Boolean).join(' · '), tono: tonos.b, segundos: COSTURA.segundos, alAceptar: abrir, sonido, velo: '--dc-aviso-velo' });
      avisoAbierto = true;
      contenedor.append(aviso.nodo);
      // el foco va al ¡ACEPTAR! (Enter ya lo escucha el aviso)
      const boton = aviso.nodo.querySelector('.ln-aceptar');
      if (quieto()) boton?.focus({ preventScroll: true });
      else esperar(aviso.nodo, T.lados).then(() => avisoAbierto && boton?.focus({ preventScroll: true }));
    },
    // elegir con el aviso abierto: se acepta sin la apertura
    aceptarYa() {
      if (!avisoAbierto) return;
      ya = true;
      aviso.aceptar();
    },
    apuntar(i) {
      const c = lec.caminos[i];
      if (!c || capa.dataset.fase !== 'costura' || capa.dataset.elegido) return;
      const l = c.bloqueada ? '' : LADO_DEL_CAMINO[c.camino] ?? '';
      const antes = capa.dataset.apunta;
      capa.dataset.apunta = l;
      capa.dataset.cerrada = c.bloqueada ? 'si' : '';
      capa.querySelectorAll('.dc-fila').forEach((f) => f.classList.toggle('on', f.dataset.i === String(i)));
      costura({ posicion: posDe(l) }, quieto() ? 0 : COSTURA.apunta);
      if (heroe && l !== antes) olaPared(l);
    },
    soltar() {
      if (capa.dataset.fase !== 'costura' || capa.dataset.elegido) return;
      capa.dataset.apunta = '';
      capa.dataset.cerrada = '';
      capa.querySelectorAll('.dc-fila').forEach((f) => f.classList.remove('on'));
      costura({ posicion: base }, quieto() ? 0 : COSTURA.apunta);
    },
    // elegir abre ese destino: la costura se va al otro borde (y se endereza), el destino elegido llena la pantalla y la
    // noche de la interfaz toma su tono; el otro destino se apaga. Devuelve el tono del lado elegido (o `null`).
    elegir(i) {
      const c = lec.caminos[i];
      const l = c && !c.bloqueada ? LADO_DEL_CAMINO[c.camino] ?? '' : '';
      capa.dataset.cerrada = '';
      capa.querySelectorAll('.dc-fila').forEach((f) => f.classList.toggle('on', f.dataset.i === String(i)));
      if (!l) return null;
      const antes = capa.dataset.apunta;
      capa.dataset.apunta = l;
      capa.dataset.elegido = l;
      costura({ posicion: posElegido(l), angulo: 0 }, quieto() ? 0 : COSTURA.abre);
      if (heroe && l !== antes) olaPared(l);
      return tonos[l];
    },
    destruir() {
      cancelAnimationFrame(raf);
      removeEventListener('resize', alRedimensionar);
      aviso?.destruir();
      aviso = null;
    }
  };
}

// Los nombres de las orgs de una liga en el mundo de la carrera (la pared de escudos de `liga`), en su orden.
export function equiposDelMundo(estado) {
  return (liga) => (estado?.mundo?.ligas?.find((l) => l.id === liga)?.orgs ?? []).map((org) => org.nombre);
}
