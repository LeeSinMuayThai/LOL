// LAS OPCIONES DE LA DECISION (PLANUI §4.7, `op=` en el hash). Tres maneras de que la parada cuente lo que pasa sin
// sumar texto, todas sobre el mismo panel (opciones con glifos + inspector + "vos"), que no cambia:
//   escena   · el fondo cuenta la situacion: tu liga y tu club, la liga que te llama, su ciudad de noche y el arco de luz
//              entre las dos. Apuntar una opcion cruza la escena a ese camino (el "aura" de las decisiones).
//   cliente  · la decision bisagra llega como un momento del cliente: la invitacion con el anillo de Aceptar y su reloj
//              ("partida encontrada"); aceptarla abre el panel. Hextech solo en la bisagra.
//   bisagra  · el peso: el mundo se oscurece, entra el capitulo, los caminos se abren en la luz a izquierda y derecha con
//              lo que arriesgas (antes -> despues) y apuntar uno tira la luz a su lado.
// Todo sale de CAMPOS del evento (nunca de su prosa): categoria, esBisagra, anio, la liga y el club de la ficha, los
// efectos estructurados de cada opcion (`liga`, `camino` abierto/cerrado), previa[] (campo, signo, magnitud), riesgo y
// rareza. Lo decorativo usa el PRNG de la vitrina. Nada toca el ambiente por dentro: solo su API (pulso).
import { el, svg, animar, esperar, reducido, inst, celular, num, EXPO, SALE } from './util.js';
import { icono, glifoDeCampo, triangulos, ABREVIATURA } from './iconos.js';
import { crearAzar } from '../../comun/azar.js';

// → logos.js — los logos oficiales del CDN de LoL Esports (esports-api.lolesports.com getLeagues/getTeams, 2026-10-09;
// cada URL respondio 200 image/png). `tinta`: 'clara' se ve sobre la noche tal cual; 'oscura' se pasa a la tinta.
// Una org o liga que no esta aca (o que no carga) lleva el escudo-monograma del sistema.
export const LOGOS = {
  LCK: { url: 'https://static.lolesports.com/leagues/lck-color-on-black.png', tinta: 'clara' },
  CBLOL: { url: 'https://static.lolesports.com/leagues/cblol-logo-symbol-offwhite.png', tinta: 'clara' },
  LEC: { url: 'https://static.lolesports.com/leagues/1592516184297_LEC-01-FullonDark.png', tinta: 'clara' },
  LPL: { url: 'https://static.lolesports.com/leagues/1592516115322_LPL-01-FullonDark.png', tinta: 'clara' },
  FURIA: { url: 'https://static.lolesports.com/teams/FURIA---black.png', tinta: 'oscura' },
};

// Cada liga, su lugar en el mundo: la ciudad que se dibuja de noche y sus hitos (si los tiene dibujados).
export const LIGAS = {
  LCK: { region: 'Corea', ciudad: 'Seúl', hitos: ['namsan', 'lotte'] },
  CBLOL: { region: 'Brasil', ciudad: 'São Paulo', hitos: [] },
  LEC: { region: 'EMEA', ciudad: 'Berlín', hitos: [] },
  LPL: { region: 'China', ciudad: 'Shanghái', hitos: [] },
  LCS: { region: 'Norteamérica', ciudad: 'Los Ángeles', hitos: [] },
  LJL: { region: 'Japón', ciudad: 'Tokio', hitos: [] },
  PCS: { region: 'Asia-Pacífico', ciudad: 'Taipéi', hitos: [] },
  VCS: { region: 'Vietnam', ciudad: 'Ciudad Ho Chi Minh', hitos: [] },
};

const CATEGORIA = { mercado: 'Mercado', caminos: 'Caminos', vida: 'Vida', equipo: 'Equipo', competencia: 'Competencia', amateur: 'Amateur' };
// el valor de hoy de cada eje que mueve una opcion, leido de la ficha (para el antes -> despues)
const CAMPO_FICHA = {
  'career.arraigo': (j) => j.arraigo,
  'career.sinergia': (j) => j.sinergia,
  'player.familyTrust': (j) => j.confianzaFamiliar,
  'player.studies': (j) => j.estudios,
  'player.sleep': (j) => j.sueno,
};
const valorDeHoy = (campo, j) => (campo.startsWith('player.stats.') ? j.stats?.[campo.slice('player.stats.'.length)] : CAMPO_FICHA[campo]?.(j));
// cuanto se corre la barra del "despues" segun la magnitud del motor (sobre 100): es un largo relativo, no un numero
const LARGO_MAGNITUD = { baja: 4, media: 8, alta: 14 };

// Tiempos (ms)
const T = {
  escenaEntra: 620, // la escena llega despues del relato del split
  arco: 1100, // el arco de luz se dibuja
  llamado: 3400, // un pulso de luz viaja de la liga que llama a la tuya (reposo)
  viaje: 3800, // ida y vuelta (el viaje corto)
  vuelta: 1500, // la luz vuelve a casa
  cruce: 600, // la escena cruza a otro camino
  capitulo: 1350, // el rotulo de capitulo, quieto
  capituloEntra: 520,
  caminos: 1500, // los caminos se abren despues del capitulo
  reloj: 12000, // el anillo de Aceptar
  invitacion: 620, // la invitacion aparece despues del relato
};

// Geometria de las escenas, en fracciones de la pantalla (escritorio / celular)
const GEO = {
  escritorio: { casa: [0.118, 0.27], destino: [0.79, 0.205], apice: 0.055, salida: [0.058, -0.04], llegada: [-0.052, 0.012], vuelta: 0.2, ciudad: [0.555, 1], base: 0.5, alto: 0.155 },
  // en el celular el panel tapa casi todo: queda la ciudad abajo, en el espacio libre (sin logos ni arco)
  celular: { casa: [0.16, 0.8], destino: [0.8, 0.8], apice: 0.7, salida: [0, 0], llegada: [0, 0], vuelta: 0.05, ciudad: [0, 1], base: 0.97, alto: 0.13 },
};

// ------------------------------------------------------------------------------------------------ la lectura del evento
export function leerEvento(m, dec) {
  const ev = dec.datos?.evento ?? null;
  const j = m.ficha?.jugador ?? {};
  const ligaCasa = j.liga ?? j.contrato?.liga ?? null;
  const opsEv = ev?.options ?? [];
  const efectosDe = (id) => (opsEv.find((o) => o.id === id)?.outcomes ?? []).map((oc) => oc.effects ?? []);
  let ligaDestino = null;
  for (const o of opsEv) for (const oc of o.outcomes ?? []) for (const e of oc.effects ?? []) if (e.liga && e.liga !== ligaCasa) ligaDestino ??= e.liga;
  // el camino de cada opcion, por sus efectos: te mudas (la liga de destino en todos sus resultados), vas y volves
  // (abre el camino sin mudarte), o te quedas (lo cierra). Sin destino, no hay geografia: 'neutro'.
  const caminoDe = (id) => {
    const outs = efectosDe(id);
    if (!ligaDestino || !outs.length) return 'neutro';
    if (outs.every((efs) => efs.some((e) => e.liga === ligaDestino))) return 'ir';
    if (outs.some((efs) => efs.some((e) => e.type === 'camino' && e.valor === 'abierto'))) return 'viaje';
    return 'casa';
  };
  const disponibles = new Set(dec.opciones.map((o) => o.id));
  const caminos = [
    ...dec.opciones.map((o) => ({ id: o.id, camino: caminoDe(o.id), riesgo: o.riesgo ?? null, rareza: o.rareza ?? null, previa: o.previa ?? [], bloqueada: false })),
    ...(dec.opcionesBloqueadas ?? []).map((b) => {
      const id = opsEv.find((o) => !disponibles.has(o.id) && o.label === b.label)?.id ?? null;
      return { id, camino: id ? caminoDe(id) : 'neutro', riesgo: null, rareza: null, previa: [], bloqueada: true };
    }),
  ];
  return {
    categoria: ev?.categoria ?? m.categoria ?? null,
    bisagra: !!m.esBisagra,
    anio: m.anio ?? j.anio ?? null,
    casa: { liga: ligaCasa, org: m.org ?? j.org ?? null, servidor: j.ranked?.servidor ?? null, rango: j.rankedTexto ?? null, ciudad: LIGAS[ligaCasa]?.ciudad ?? null },
    destino: ligaDestino ? { liga: ligaDestino, ciudad: LIGAS[ligaDestino]?.ciudad ?? null, hitos: LIGAS[ligaDestino]?.hitos ?? [] } : null,
    caminos,
    jugador: j,
  };
}

// ------------------------------------------------------------------------------------------------ logos y monograma
export function monograma(nombre = '') {
  const palabras = String(nombre || '?').split(/\s+/).filter(Boolean);
  const ini = (palabras.length > 1 ? palabras.map((p) => p[0]).join('') : palabras[0]).slice(0, 3).toUpperCase();
  return svg('svg', { class: 'monograma', viewBox: '0 0 48 56', role: 'img', 'aria-label': String(nombre) }, [
    svg('path', { class: 'mono-escudo', d: 'M24 2.5 44 9.5v18c0 13.5-9.2 22.4-20 26-10.8-3.6-20-12.5-20-26v-18z' }),
    svg('path', { class: 'mono-filete', d: 'M24 6.8 40 12.4v15.1c0 10.9-7.2 18.4-16 21.6' }),
    svg('text', { class: 'mono-ini', x: '24', y: '33', 'text-anchor': 'middle' }, [ini]),
  ]);
}
export function logo(clave, { clase = '' } = {}) {
  const caja = el('span', { class: `logo ${clase}`.trim(), 'data-logo': clave ?? '' });
  const info = clave ? LOGOS[clave] : null;
  if (!info) {
    caja.append(monograma(clave));
    return caja;
  }
  const img = el('img', { src: info.url, alt: clave, decoding: 'async', draggable: 'false', 'data-tinta': info.tinta });
  img.addEventListener('error', () => img.replaceWith(monograma(clave)), { once: true });
  caja.append(img);
  return caja;
}
// las <img> de un nodo, cargadas o caidas (con tope: sin red, la escena sigue con sus monogramas)
export function cargados(nodo, tope = 5000) {
  const imgs = [...nodo.querySelectorAll('img')].filter((i) => !i.complete);
  const todas = Promise.all(imgs.map((i) => new Promise((r) => {
    i.addEventListener('load', r, { once: true });
    i.addEventListener('error', r, { once: true });
  })));
  return Promise.race([todas, new Promise((r) => setTimeout(r, tope))]);
}

const quieto = () => inst() || reducido();
const geo = () => (celular() ? GEO.celular : GEO.escritorio);
const punto = (p, w, h) => [p[0] * w, p[1] * h];
// el punto medio de una curva cuadratica (el apice del arco)
const medio = (a, c, b) => [(a[0] + 2 * c[0] + b[0]) / 4, (a[1] + 2 * c[1] + b[1]) / 4];

// ------------------------------------------------------------------------------------------------ 1 · LA ESCENA
export function crearEscena(lec, { placa } = {}) {
  const conDestino = !!lec.destino;
  const capa = el('div', { class: 'dec-escena', 'aria-hidden': 'true', 'data-estado': 'reposo', 'data-modo': conDestino ? 'mapa' : 'haces' });
  const resplandor = el('div', { class: 'esc-resplandor' });
  const hogar = el('div', { class: 'esc-hogar' });
  const lienzo = svg('svg', { class: 'esc-svg' });
  const cometa = el('i', { class: 'esc-cometa' });
  const candado = el('span', { class: 'esc-candado' }, icono('candado'));
  // tu lugar: tu liga + tu club; sin liga (amateur), tu servidor y tu rango
  const casaLogos = el('div', { class: 'esc-casa' }, [
    el('div', { class: 'esc-logos' }, lec.casa.liga || lec.casa.org
      ? [lec.casa.liga ? logo(lec.casa.liga, { clase: 'esc-liga' }) : null, lec.casa.org ? logo(lec.casa.org, { clase: 'esc-org' }) : null]
      : [logo(lec.casa.servidor ?? CATEGORIA[lec.categoria] ?? '?', { clase: 'esc-liga' })]),
    el('p', { class: 'esc-rotulo', text: [lec.casa.liga ?? lec.casa.servidor, lec.casa.ciudad ?? lec.casa.rango].filter(Boolean).join(' · ') }),
  ]);
  const destino = conDestino
    ? el('div', { class: 'esc-destino' }, [logo(lec.destino.liga, { clase: 'esc-liga-destino' }), el('p', { class: 'esc-rotulo', text: [lec.destino.liga, lec.destino.ciudad].filter(Boolean).join(' · ') })])
    : null;
  capa.append(resplandor, hogar, lienzo, cometa, candado, casaLogos, destino ?? '');
  let haces = [];
  let arcoD = '';
  let cometaAnim = null;

  function dibujar() {
    const w = innerWidth;
    const h = innerHeight;
    const g = geo();
    lienzo.setAttribute('viewBox', `0 0 ${w} ${h}`);
    lienzo.setAttribute('width', w);
    lienzo.setAttribute('height', h);
    lienzo.textContent = '';
    const C = punto(g.casa, w, h);
    Object.assign(casaLogos.style, { left: `${C[0]}px`, top: `${C[1]}px` });
    hogar.style.setProperty('--esc-x', `${C[0]}px`);
    hogar.style.setProperty('--esc-y', `${C[1]}px`);
    if (conDestino) {
      const D = punto(g.destino, w, h);
      Object.assign(destino.style, { left: `${D[0]}px`, top: `${D[1]}px` });
      resplandor.style.setProperty('--esc-x', `${D[0]}px`);
      resplandor.style.setProperty('--esc-y', `${g.base * h}px`);
      ciudad(lienzo, g.ciudad[0] * w, g.ciudad[1] * w, g.base * h, g.alto * h, lec.destino);
      // el arco sale de arriba de tus logos y llega al costado del de ellos; la vuelta (el viaje corto) va por abajo
      const A0 = [C[0] + g.salida[0] * w, C[1] + g.salida[1] * h];
      const A1 = [D[0] + g.llegada[0] * w, D[1] + g.llegada[1] * h];
      const ctrl = [(A0[0] + A1[0]) / 2, g.apice * h];
      const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      arcoD = `M${f(A0)} Q${f(ctrl)} ${f(A1)}`;
      const vueltaD = `M${f(A1)} Q${f([ctrl[0], ctrl[1] + g.vuelta * h])} ${f(A0)}`;
      lienzo.append(
        svg('path', { class: 'esc-vuelta', d: vueltaD, pathLength: '1' }),
        svg('path', { class: 'esc-arco-traza', d: arcoD, pathLength: '1' }),
        svg('path', { class: 'esc-arco-halo ancho', d: arcoD, pathLength: '1' }),
        svg('path', { class: 'esc-arco-halo', d: arcoD, pathLength: '1' }),
        svg('path', { class: 'esc-arco', d: arcoD, pathLength: '1' }),
      );
      cometa.style.offsetPath = `path('${arcoD}')`;
      const A = medio(A0, ctrl, A1);
      Object.assign(candado.style, { left: `${A[0]}px`, top: `${A[1]}px` });
    } else {
      // sin geografia: un haz por opcion, en abanico hacia arriba desde tu lugar, en el hueco libre sobre "vos"
      const libre = placa?.offsetWidth ? { x: placa.offsetLeft, y: placa.offsetTop, w: placa.offsetWidth } : null;
      const H = libre ? [libre.x + libre.w / 2, libre.y - 34] : C;
      Object.assign(casaLogos.style, { left: `${H[0]}px`, top: `${H[1]}px` });
      hogar.style.setProperty('--esc-x', `${H[0]}px`);
      hogar.style.setProperty('--esc-y', `${H[1]}px`);
      const r = libre ? Math.max(70, Math.min(H[1] - 120, libre.w * 0.5)) : 0.18 * h;
      const n = lec.caminos.length;
      haces = lec.caminos.map((c, i) => {
        const a = Math.PI * (n > 1 ? 0.88 - (0.76 * i) / (n - 1) : 0.5);
        const E = [H[0] + r * Math.cos(a), H[1] - 30 - r * Math.sin(a)];
        const ctrl = [H[0] + (E[0] - H[0]) * 0.2, H[1] - 30 - r * Math.sin(a) * 0.55];
        const d = `M${H[0].toFixed(1)} ${(H[1] - 30).toFixed(1)} Q${ctrl[0].toFixed(1)} ${ctrl[1].toFixed(1)} ${E[0].toFixed(1)} ${E[1].toFixed(1)}`;
        const grupo = svg('g', { class: 'esc-haz', 'data-riesgo': c.riesgo ?? 'neutro', 'data-bloqueada': c.bloqueada ? 'si' : null, 'data-rara': c.rareza && c.rareza !== 'comun' ? 'si' : null }, [
          svg('path', { class: 'haz-halo', d, pathLength: '1' }),
          svg('path', { class: 'haz-nucleo', d, pathLength: '1' }),
          svg('circle', { class: 'haz-fin', cx: E[0].toFixed(1), cy: E[1].toFixed(1), r: '4' }),
          svg('text', { class: 'haz-n', x: (E[0] + 14 * Math.cos(a)).toFixed(1), y: (E[1] - 14 * Math.sin(a) + 4).toFixed(1), 'text-anchor': 'middle' }, [c.bloqueada ? '×' : String(i + 1)]),
        ]);
        lienzo.append(grupo);
        return grupo;
      });
    }
  }

  // el cometa: un pulso de luz por el arco. `modo`: llamado (de ellos a vos), viaje (ida y vuelta), vuelta (a casa, una vez)
  function pulso(modo) {
    cometaAnim?.cancel();
    cometaAnim = null;
    if (!conDestino || quieto() || !modo) return;
    const K = {
      llamado: [[{ offsetDistance: '100%', opacity: 0 }, { offsetDistance: '88%', opacity: 1, offset: 0.08 }, { offsetDistance: '6%', opacity: 1, offset: 0.62 }, { offsetDistance: '0%', opacity: 0, offset: 0.7 }, { offsetDistance: '0%', opacity: 0 }], T.llamado, Infinity],
      viaje: [[{ offsetDistance: '0%', opacity: 0 }, { offsetDistance: '6%', opacity: 1, offset: 0.05 }, { offsetDistance: '100%', opacity: 1, offset: 0.42 }, { offsetDistance: '100%', opacity: 1, offset: 0.55 }, { offsetDistance: '0%', opacity: 1, offset: 0.94 }, { offsetDistance: '0%', opacity: 0 }], T.viaje, Infinity],
      vuelta: [[{ offsetDistance: '100%', opacity: 0 }, { offsetDistance: '90%', opacity: 1, offset: 0.1 }, { offsetDistance: '0%', opacity: 1, offset: 0.9 }, { offsetDistance: '0%', opacity: 0 }], T.vuelta, 1],
    }[modo];
    cometaAnim = cometa.animate(K[0], { duration: K[1], iterations: K[2], easing: 'cubic-bezier(.45,0,.25,1)', fill: 'both' });
  }

  function estado(e, modo) {
    capa.dataset.estado = e;
    pulso(modo);
  }
  const MODO = { reposo: 'llamado', viaje: 'viaje', casa: 'vuelta', ir: null, neutro: 'llamado' };

  function apuntar(i) {
    const c = lec.caminos[i];
    if (!c) return soltar();
    if (!conDestino) {
      capa.dataset.estado = 'apunta';
      haces.forEach((g, k) => g.classList.toggle('on', k === i));
      return;
    }
    const e = c.bloqueada ? 'ir-cerrada' : c.camino === 'neutro' ? 'reposo' : c.camino;
    if (capa.dataset.estado === e) return;
    estado(e, MODO[c.bloqueada ? 'ir' : c.camino] ?? null);
  }
  function soltar() {
    if (!conDestino) {
      capa.dataset.estado = 'reposo';
      haces.forEach((g) => g.classList.remove('on'));
      return;
    }
    if (capa.dataset.estado !== 'reposo') estado('reposo', 'llamado');
  }
  function elegir(i) {
    const c = lec.caminos[i];
    if (!c) return;
    capa.dataset.elegido = 'si';
    if (!conDestino) {
      haces.forEach((g, k) => g.classList.toggle('on', k === i));
      capa.dataset.estado = 'elegido';
      return;
    }
    // el camino elegido queda: el viaje se hace una vez y deja su traza; quedarte apaga la ciudad
    const e = c.camino === 'viaje' ? 'viaje-hecho' : c.camino === 'casa' ? 'casa-hecha' : 'reposo';
    capa.dataset.estado = e;
    cometaAnim?.cancel();
    cometaAnim = null;
    if (quieto()) return;
    if (c.camino === 'viaje') cometaAnim = cometa.animate([{ offsetDistance: '0%', opacity: 0 }, { offsetDistance: '8%', opacity: 1, offset: 0.06 }, { offsetDistance: '100%', opacity: 1, offset: 0.45 }, { offsetDistance: '100%', opacity: 1, offset: 0.55 }, { offsetDistance: '0%', opacity: 1, offset: 0.94 }, { offsetDistance: '0%', opacity: 0 }], { duration: T.viaje, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'both' });
    else if (c.camino === 'casa') pulso('vuelta');
  }

  let redibujo = 0;
  const alRedimensionar = () => {
    cancelAnimationFrame(redibujo);
    redibujo = requestAnimationFrame(() => {
      dibujar();
      if (capa.dataset.estado === 'reposo') pulso('llamado');
    });
  };
  addEventListener('resize', alRedimensionar);
  dibujar();

  return {
    nodo: capa,
    // la escena llega despues del relato: la casa, la ciudad que sube, el arco que se dibuja, el logo que se enciende
    entrar(base = T.escenaEntra) {
      dibujar();
      if (quieto()) {
        pulso(null);
        return;
      }
      animar(hogar, [{ opacity: 0 }, { opacity: 1 }], { delay: base, dur: 900 });
      animar(casaLogos, [{ opacity: 0, transform: 'translate(-50%, -50%) translateY(10px)' }, { opacity: 1, transform: 'translate(-50%, -50%)' }], { delay: base, dur: 520 });
      animar(resplandor, [{ opacity: 0 }, { opacity: 1 }], { delay: base + 120, dur: 1200 });
      lienzo.querySelectorAll('.esc-cerca, .esc-lejos, .esc-hito').forEach((g, k) => animar(g, [{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: base + 100 + k * 90, dur: 900 }));
      animar(lienzo.querySelector('.esc-luces'), [{ opacity: 0 }, { opacity: 1 }], { delay: base + 600, dur: 900 });
      if (destino) animar(destino, [{ opacity: 0, transform: 'translate(-50%, -50%) scale(.9)', filter: 'blur(6px)' }, { opacity: 1, transform: 'translate(-50%, -50%)', filter: 'blur(0)' }], { delay: base + 420, dur: 760 });
      lienzo.querySelectorAll('.esc-arco, .esc-arco-halo, .haz-nucleo, .haz-halo').forEach((p) => animar(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: base + 300, dur: T.arco, easing: EXPO }));
      if (conDestino) {
        pulso(null);
        esperar(capa, base + T.arco).then(() => {
          if (capa.isConnected && capa.dataset.estado === 'reposo') pulso('llamado');
        });
      }
    },
    apuntar,
    soltar,
    elegir,
    destruir() {
      removeEventListener('resize', alRedimensionar);
      cometaAnim?.cancel();
    },
  };
}

// la ciudad de noche (determinista por su nombre): dos capas de edificios, ventanas encendidas y sus hitos
function ciudad(lienzo, x0, x1, base, alto, destino) {
  const az = crearAzar(`ciudad:${destino.ciudad ?? destino.liga}`);
  const lejos = svg('g', { class: 'esc-lejos' });
  const cerca = svg('g', { class: 'esc-cerca' });
  const hitos = svg('g', { class: 'esc-hito' });
  const luces = svg('g', { class: 'esc-luces' });
  const ancho = x1 - x0;
  // la silueta sube hacia el centro de la ciudad
  const perfil = (x) => 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x - x0) / ancho)));
  for (let x = x0 - 10; x < x1; ) {
    const w = az.entre(18, 40);
    const hh = alto * az.entre(0.45, 0.95) * perfil(x);
    lejos.append(svg('rect', { x: x.toFixed(1), y: (base - hh).toFixed(1), width: (w + 1).toFixed(1), height: (hh + alto).toFixed(1) }));
    x += w;
  }
  for (let x = x0; x < x1; ) {
    const w = az.entre(20, 48);
    const hh = alto * az.entre(0.25, 0.7) * perfil(x);
    const top = base - hh;
    cerca.append(svg('rect', { x: x.toFixed(1), y: top.toFixed(1), width: w.toFixed(1), height: (hh + alto).toFixed(1) }));
    for (let wy = top + 7; wy < base + alto * 0.4; wy += 9) {
      for (let wx = x + 5; wx < x + w - 5; wx += 7) {
        const r = az.siguiente();
        if (r > 0.17) continue;
        const v = svg('rect', { x: wx.toFixed(1), y: wy.toFixed(1), width: '2', height: '3', class: r < 0.05 ? 'fria' : r < 0.07 ? 'titila' : null });
        if (r >= 0.05 && r < 0.07) v.setAttribute('style', `animation-delay: -${az.entre(0, 7).toFixed(2)}s`);
        luces.append(v);
      }
    }
    x += w + az.entre(0, 5);
  }
  // los hitos de la ciudad (Seul: la N Seoul Tower en su cerro y la Lotte World Tower)
  if (destino.hitos.includes('namsan')) {
    const x = x0 + ancho * 0.3;
    const cima = base - alto * 0.42;
    hitos.append(
      svg('path', { d: `M${x - 120} ${base + 4} Q${x} ${cima - alto * 0.18} ${x + 120} ${base + 4} Z` }),
      svg('rect', { x: x - 2.5, y: cima - alto * 0.62, width: 5, height: alto * 0.64 }),
      svg('ellipse', { cx: x, cy: cima - alto * 0.5, rx: 11, ry: 5.5 }),
      svg('rect', { x: x - 1, y: cima - alto * 0.9, width: 2, height: alto * 0.3 }),
    );
    luces.append(svg('circle', { class: 'hito-punta', cx: x, cy: cima - alto * 0.9, r: 2.2 }), svg('rect', { class: 'hito-anillo', x: x - 9, y: cima - alto * 0.5 - 1, width: 18, height: 2 }));
  }
  if (destino.hitos.includes('lotte')) {
    const x = x0 + ancho * 0.82;
    const top = base - alto * 1.7;
    hitos.append(svg('path', { d: `M${x - 17} ${base + 4} L${x - 4} ${top} L${x - 1.5} ${top - 16} L${x + 1.5} ${top - 16} L${x + 4} ${top} L${x + 17} ${base + 4} Z` }));
    luces.append(svg('path', { class: 'hito-filo', d: `M${x} ${top - 12} L${x} ${base - alto * 0.2}` }));
  }
  lienzo.append(lejos, hitos, cerca, luces);
}

// ------------------------------------------------------------------------------------------------ 2 · EL CLIENTE
// La invitacion ("partida encontrada"): el logo de quien llama en el anillo, el reloj que se vacia, Aceptar. Aceptarla (o
// que se acabe el reloj) abre el panel de siempre.
export function crearInvitacion(lec, dec, { alAceptar }) {
  const quien = lec.destino?.liga ?? lec.casa.org ?? CATEGORIA[lec.categoria] ?? 'LoL';
  const R = 108;
  const circ = 2 * Math.PI * R;
  const reloj = svg('circle', { class: 'inv-reloj', cx: 120, cy: 120, r: R, 'stroke-dasharray': circ.toFixed(2), 'stroke-dashoffset': '0', transform: 'rotate(-90 120 120)' });
  const anillo = el('div', { class: 'inv-anillo' }, [
    svg('svg', { class: 'inv-aro', viewBox: '0 0 240 240', 'aria-hidden': 'true' }, [
      svg('circle', { class: 'inv-giro', cx: 120, cy: 120, r: R + 10 }),
      svg('circle', { class: 'inv-pista', cx: 120, cy: 120, r: R }),
      reloj,
      svg('circle', { class: 'inv-centro', cx: 120, cy: 120, r: 92 }),
      svg('path', { class: 'inv-rombo', d: 'M120 4 l8 8 -8 8 -8 -8z' }),
    ]),
    logo(quien, { clase: 'inv-logo' }),
  ]);
  const idTitulo = 'inv-titulo';
  const boton = el('button', { type: 'button', class: 'inv-aceptar' }, ['Aceptar', el('kbd', { text: 'Enter' })]);
  const ruta = lec.destino && lec.casa.liga
    ? el('p', { class: 'inv-ruta', 'aria-label': `de ${lec.casa.liga} a ${lec.destino.liga}` }, [logo(lec.casa.liga, { clase: 'inv-mini' }), icono('flecha'), logo(lec.destino.liga, { clase: 'inv-mini' })])
    : null;
  const caja = el('div', { class: 'inv-caja' }, [
    el('p', { class: 'inv-kicker' }, [el('span', { class: 'inv-rombito' }), el('span', { text: 'Invitación' }), el('span', { class: 'inv-quien', text: quien })]),
    anillo,
    el('h2', { class: 'inv-titulo', id: idTitulo, text: dec.titulo }),
    ruta,
    boton,
  ]);
  const nodo = el('div', { class: 'invitacion', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo }, caja);
  let abierta = true;
  let relojAnim = null;
  function aceptar({ instantaneo = false } = {}) {
    if (!abierta) return;
    abierta = false;
    relojAnim?.pause();
    nodo.classList.add('aceptada');
    const fin = () => nodo.remove();
    if (instantaneo || quieto()) {
      fin();
      alAceptar();
      return;
    }
    animar(anillo, [{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.07)', filter: 'brightness(1.6)', offset: 0.35 }, { transform: 'scale(.94)', filter: 'brightness(1)' }], { dur: 420, fill: 'forwards' });
    const sale = animar(nodo, [{ opacity: 1 }, { opacity: 0 }], { delay: 220, dur: 300, easing: SALE, fill: 'forwards' });
    alAceptar();
    if (sale) sale.finished.then(fin, fin);
    else fin();
  }
  boton.addEventListener('click', () => aceptar());
  return {
    nodo,
    get abierta() {
      return abierta;
    },
    entrar(base = T.invitacion) {
      if (quieto()) {
        boton.focus({ preventScroll: true });
        return;
      }
      animar(nodo, [{ opacity: 0 }, { opacity: 1 }], { delay: base, dur: 260 });
      animar(anillo, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.04)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { delay: base + 60, dur: 520 });
      caja.querySelectorAll('.inv-kicker, .inv-titulo, .inv-ruta, .inv-aceptar').forEach((x, k) => animar(x, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay: base + 220 + k * 70 }));
      relojAnim = reloj.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: circ }], { duration: T.reloj, delay: base + 400, easing: 'linear', fill: 'both' });
      relojAnim.finished.then(() => aceptar(), () => {});
      esperar(nodo, base + 300).then(() => {
        if (abierta) boton.focus({ preventScroll: true });
      });
    },
    aceptar,
  };
}

// ------------------------------------------------------------------------------------------------ 3 · EL PESO
// El mundo se oscurece y entra el capitulo; desde vos se abren los caminos (uno por opcion, a izquierda y derecha) y al
// final de cada uno, lo que arriesgas: cada eje que mueve, su valor de hoy y su barra con lo que se corre (antes ->
// despues). Apuntar un camino tira la luz a su lado. Las decisiones comunes lo llevan atenuado (sin capitulo ni cartas).
export function crearPeso(lec, { col, antesFila }) {
  const pesado = lec.bisagra;
  const capa = el('div', { class: 'dec-peso', 'aria-hidden': 'true', 'data-pesado': pesado ? 'si' : 'no', 'data-lado': 'centro' });
  const oscuro = el('div', { class: 'peso-oscuro' });
  const luzLado = el('div', { class: 'peso-luz' });
  const lienzo = svg('svg', { class: 'peso-svg' });
  const capitulo = pesado
    ? el('div', { class: 'peso-capitulo' }, [el('span', { class: 'peso-cap-1', text: 'Decisión bisagra' }), lec.anio ? el('b', { class: 'peso-cap-2', text: String(lec.anio) }) : null])
    : null;
  const j = lec.jugador;
  const libres = lec.caminos.filter((c) => !c.bloqueada);
  const cartas = pesado
    ? libres.map((c, i) => el('div', { class: 'peso-carta', 'data-i': String(i) }, [
        el('span', { class: 'peso-tecla', text: String(i + 1) }),
        el('ul', { class: 'peso-ejes' }, c.previa.map((p) => {
          const hoy = valorDeHoy(p.campo, j);
          const L = LARGO_MAGNITUD[p.magnitud] ?? LARGO_MAGNITUD.baja;
          const sube = p.signo !== '-';
          const k = glifoDeCampo(p.campo);
          return el('li', { class: `peso-eje ${sube ? 'sube' : 'baja'}`, 'data-campo': p.campo }, [
            icono(k),
            el('span', { class: 'pe-nom', text: ABREVIATURA[k] ?? p.etiqueta }),
            el('b', { class: 'pe-hoy', text: typeof hoy === 'number' ? num(hoy) : '—' }),
            typeof hoy === 'number'
              ? el('span', { class: 'pe-barra' }, [
                  el('i', { class: 'pe-valor', style: { width: `${Math.min(100, hoy)}%` } }),
                  el('i', { class: 'pe-fantasma', style: sube ? { left: `${Math.min(100, hoy)}%`, width: `${Math.min(L, 100 - hoy)}%` } : { left: `${Math.max(0, hoy - L)}%`, width: `${Math.min(L, hoy)}%` } }),
                ])
              : el('span', { class: 'pe-barra vacia' }),
            triangulos(p.magnitud, p.signo),
          ]);
        })),
      ]))
    : [];
  capa.append(oscuro, luzLado, lienzo, ...cartas, capitulo ?? '');
  let caminos = [];
  let O = [0, 0];
  let fines = [];

  function dibujar() {
    const w = innerWidth;
    const h = innerHeight;
    lienzo.setAttribute('viewBox', `0 0 ${w} ${h}`);
    lienzo.setAttribute('width', w);
    lienzo.setAttribute('height', h);
    lienzo.textContent = '';
    const cel = celular();
    // el origen queda arriba de la linea "antes": la luz del camino no le pasa por detras al texto
    const arriba = Math.max(cel ? 70 : 120, (antesFila?.offsetTop ?? col.offsetTop) - 34);
    const centro = cel ? 0.5 * w : col.offsetLeft + col.offsetWidth * 0.5;
    O = [centro, arriba];
    const n = libres.length;
    // los caminos se abren hacia afuera, uno a cada lado del panel; las cartas no salen de la pantalla
    const margen = cel ? 12 : col.offsetLeft;
    const medio = Math.max(0, ...cartas.map((c) => c.offsetWidth / 2));
    const abre = cel ? w * 0.34 : w * 0.27;
    const alto = (pesado ? (cel ? 0.08 : 0.16) : 0.12) * h;
    fines = libres.map((_, i) => {
      const k = n > 1 ? i / (n - 1) : 0.5;
      const x = Math.min(w - margen - medio, Math.max(margen + medio, centro - abre + 2 * abre * k));
      return [x, arriba - alto - (n > 2 ? (i % 2) * 0.05 * h : 0)];
    });
    caminos = fines.map((E, i) => {
      const dy = (O[1] - E[1]) * 0.62;
      const d = `M${O[0].toFixed(1)} ${O[1].toFixed(1)} C${O[0].toFixed(1)} ${(O[1] - dy).toFixed(1)} ${E[0].toFixed(1)} ${(E[1] + dy).toFixed(1)} ${E[0].toFixed(1)} ${E[1].toFixed(1)}`;
      const g = svg('g', { class: 'peso-camino', 'data-i': String(i), 'data-riesgo': libres[i].riesgo ?? 'neutro' }, [
        svg('path', { class: 'pc-halo ancho', d, pathLength: '1' }),
        svg('path', { class: 'pc-halo', d, pathLength: '1' }),
        svg('path', { class: 'pc-nucleo', d, pathLength: '1' }),
        svg('path', { class: 'pc-flujo', d, pathLength: '1' }),
        pesado ? null : svg('circle', { class: 'pc-fin', cx: E[0].toFixed(1), cy: E[1].toFixed(1), r: '4' }),
        pesado ? null : svg('text', { class: 'pc-n', x: E[0].toFixed(1), y: (E[1] - 12).toFixed(1), 'text-anchor': 'middle' }, [String(i + 1)]),
      ]);
      lienzo.append(g);
      return g;
    });
    // las cerradas: un tramo que sube y se corta en la oscuridad, con su candado
    lec.caminos.filter((c) => c.bloqueada).forEach((_, k) => {
      const x = O[0] + (k - 0.0) * 26;
      const y = O[1] - alto * 0.9;
      lienzo.append(svg('g', { class: 'peso-cerrado' }, [svg('path', { d: `M${O[0].toFixed(1)} ${O[1].toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)}` }), svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: '3' })]));
    });
    lienzo.append(svg('circle', { class: 'peso-origen', cx: O[0].toFixed(1), cy: O[1].toFixed(1), r: '5' }));
    // cada carta se apoya en el final de su camino
    cartas.forEach((c, i) => {
      const E = fines[i];
      Object.assign(c.style, { left: `${E[0] - c.offsetWidth / 2}px`, top: `${E[1] - c.offsetHeight - 16}px` });
    });
    capa.style.setProperty('--peso-ox', `${((O[0] / w) * 100).toFixed(2)}%`);
    capa.style.setProperty('--peso-oy', `${((O[1] / h) * 100).toFixed(2)}%`);
    if (capa.dataset.lado === 'centro') luz(null);
  }
  // la luz: el hueco del oscuro va hacia el lado apuntado
  function luz(i) {
    const w = innerWidth;
    const h = innerHeight;
    const P = i == null ? [O[0], O[1] - 0.12 * h] : fines[i];
    if (!P) return;
    capa.style.setProperty('--peso-x', `${((P[0] / w) * 100).toFixed(2)}%`);
    capa.style.setProperty('--peso-y', `${((P[1] / h) * 100).toFixed(2)}%`);
  }
  let flujo = null;
  function apuntar(i) {
    const c = lec.caminos[i];
    const k = c && !c.bloqueada ? libres.indexOf(c) : -1;
    if (k < 0) return soltar(c?.bloqueada);
    if (capa.dataset.lado === String(k)) return;
    capa.dataset.lado = String(k);
    caminos.forEach((g, x) => g.classList.toggle('on', x === k));
    cartas.forEach((g, x) => g.classList.toggle('on', x === k));
    luz(k);
    flujo?.cancel();
    flujo = quieto() ? null : caminos[k]?.querySelector('.pc-flujo').animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1400, iterations: Infinity, easing: 'linear' });
  }
  function soltar(cerrada = false) {
    capa.dataset.lado = cerrada ? 'cerrada' : 'centro';
    caminos.forEach((g) => g.classList.remove('on'));
    cartas.forEach((g) => g.classList.remove('on'));
    flujo?.cancel();
    flujo = null;
    luz(null);
  }
  function elegir(i, res) {
    const c = lec.caminos[i];
    const k = libres.indexOf(c);
    if (k < 0) return;
    apuntar(i);
    capa.dataset.elegido = 'si';
    // lo que paso de verdad: las barras de la carta elegida van al valor real del resultado
    const cambios = res?.inmediato?.cambios ?? [];
    const carta = cartas[k];
    carta?.querySelectorAll('.peso-eje').forEach((li) => {
      const cambio = cambios.find((x) => x.campo === li.dataset.campo);
      const fantasma = li.querySelector('.pe-fantasma');
      if (fantasma) animar(fantasma, [{ opacity: 1 }, { opacity: 0 }], { delay: 200, dur: 420, fill: 'forwards' }) ?? (fantasma.style.opacity = '0');
      if (!cambio) {
        li.classList.add('quieto');
        return;
      }
      li.classList.add('movio', cambio.despues >= cambio.antes ? 'sube' : 'baja');
      li.classList.remove(cambio.despues >= cambio.antes ? 'baja' : 'sube');
      const v = li.querySelector('.pe-valor');
      const hoy = li.querySelector('.pe-hoy');
      if (hoy) hoy.textContent = num(cambio.despues);
      if (v) {
        const de = `${Math.min(100, cambio.antes)}%`;
        const a = `${Math.min(100, cambio.despues)}%`;
        v.style.width = a;
        animar(v, [{ width: de }, { width: a }], { delay: 360, dur: 900 });
      }
    });
  }

  let redibujo = 0;
  const alRedimensionar = () => {
    cancelAnimationFrame(redibujo);
    redibujo = requestAnimationFrame(() => dibujar());
  };
  addEventListener('resize', alRedimensionar);

  return {
    nodo: capa,
    entrar() {
      dibujar();
      const base = pesado && !quieto() ? T.caminos : 0;
      if (quieto()) {
        capitulo?.remove();
        return;
      }
      animar(oscuro, [{ opacity: 0 }, { opacity: 1 }], { dur: pesado ? 900 : 600 });
      if (capitulo) {
        const [a, b] = capitulo.children;
        animar(a, [{ opacity: 0, letterSpacing: '0.2em', filter: 'blur(8px)' }, { opacity: 1, letterSpacing: '0', filter: 'blur(0)' }], { delay: 160, dur: T.capituloEntra });
        if (b) animar(b, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: 300, dur: T.capituloEntra });
        const fuera = animar(capitulo, [{ opacity: 1, transform: 'translate(-50%, -50%)' }, { opacity: 0, transform: 'translate(-50%, -50%) translateY(-24px) scale(.96)' }], { delay: 160 + T.capitulo, dur: 420, easing: SALE, fill: 'forwards' });
        fuera?.finished.then(() => capitulo.remove(), () => {});
      }
      caminos.forEach((g, i) => g.querySelectorAll('.pc-halo, .pc-nucleo').forEach((p) => animar(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { delay: base + i * 120, dur: 900, easing: EXPO })));
      lienzo.querySelectorAll('.peso-cerrado, .peso-origen, .pc-fin, .pc-n').forEach((x) => animar(x, [{ opacity: 0 }, { opacity: 1 }], { delay: base, dur: 500 }));
      cartas.forEach((c, i) => animar(c, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { delay: base + 380 + i * 120, dur: 420 }));
    },
    // el panel llega despues del capitulo
    retardoPanel: pesado && !quieto() ? T.caminos - 500 : 0,
    apuntar,
    soltar,
    elegir,
    destruir() {
      removeEventListener('resize', alRedimensionar);
      flujo?.cancel();
    },
  };
}
