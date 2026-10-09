// La Cumbre. `titulo`: el takeover del titulo (<= 2,4 s, salteable con Espacio o clic): la luz sube al oro, CAMPEONES
// entra letra por letra con un barrido especular, la liga y el ano en mono, la serie mapa por mapa, el plantel como
// creditos y polvo dorado (PRNG comun). Desemboca en `final`: la carta holografica (5:7, el arte de carga del main en
// duotono de la rareza, el puntaje como calificacion de carta, foil y brillo que siguen al puntero) con el veredicto,
// los totales y la trayectoria dibujada (cinta de orgs + curva de nivel + hitos).
import { crearAzar } from '../../comun/azar.js';
import { cargarImagen, urlCarga } from '../../comun/arte.js';
import { el, svg, entrar, animar, esperar, odometro, num, reducido, inst, celular, leerColor, duotono, EXPO, RESORTE } from './util.js';
import { icono, glifoRol } from './iconos.js';

const POLVO = 46;
const TOMA = 2400;

export function crearCumbre(ctx) {
  return ctx.muestra === 'final' ? crearCarta(ctx) : crearTakeover(ctx);
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

  // --- veredicto y totales
  const veredicto = el('div', { class: 'veredicto' }, [
    el('p', { class: 'vd-kicker' }, [el('i', { class: 'punto-luz' }), f.marco?.titulo ?? 'Se cierra una carrera']),
    el('h1', { class: 'vd-titulo', 'data-foco': '', tabindex: '-1', text: f.puntaje.nivel.nombre }),
    el('p', { class: 'vd-identidad', text: pc ? `${handle} · ${rol} · se retiró a los ${f.tarjeta?.edadRetiro}` : f.identidad }),
    el('div', { class: 'vd-totales' }, [
      el('div', { class: 'vd-pts' }, [el('b', { class: 'vd-num', text: num(f.puntaje.total) }), el('span', { class: 'vd-ref' }, [el('span', { text: 'puntos' }), el('span', { class: 'vd-pct', text: `percentil ${f.puntaje.percentil}` })])]),
      el('div', { class: 'vd-chicos' }, [
        el('div', { class: 'vd-total' }, [el('b', { text: String(titulos) }), el('span', { text: 'títulos' })]),
        el('div', { class: 'vd-total' }, [el('b', { text: String(mundiales) }), el('span', { text: `Mundial · de ${internac.length} jugados` })]),
        el('div', { class: 'vd-total' }, [el('b', { text: pico ? `#${pico}` : '—' }), el('span', { text: 'pico mundial' })]),
      ]),
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
    veredicto.querySelectorAll('.vd-chicos .vd-total, .vd-ref, .vd-siguiente').forEach((x, i) => entrar(x, 600 + i * 70, 10));
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
