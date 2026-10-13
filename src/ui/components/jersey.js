// El jersey de la firma (PLANUI §2, compuerta 2 del mercado; portado del héroe `camiseta` de vitrina/fusion/js/mercado.js
// con `op=linea`, §4.10): la camiseta de la org de espaldas, con tu handle en arco sobre los hombros y tu número, en los
// colores de la org y con su escudo en la nuca y el parche de la liga en la manga.
//
// SVG en capas dentro de un grupo aislado: el COLOR (plano, en los tokens de la org), la LUZ (difusa, multiply) y el
// BRILLO (especular + el filo de la luz del mundo, screen). La luz y el brillo salen de un mapa de alturas (los pliegues
// de una prenda colgada de los hombros, ondas de feTurbulence y la trama fina) y se dibujan una sola vez. El escudo y el
// parche son <img> (o el escudo del sistema). Nada de colores literales: los del tono vienen por nombre de token.
//
// `crearJersey({ org, liga, handle, numero, tono })` -> { nodo, numero(n), barrido(w, t), destruir() }. `w` es el
// `waapi` de un reloj de beats (fx/beats.js). Importarlo no toca el DOM.
import { el, svg, animar, inst, reducido } from '../fx/util.js';
import { pintarLogo } from '../fx/logos.js';

const CAM = { w: 600, h: 660, nombreLargo: 10, nombreAncho: 268 };
const CAJA = `0 0 ${CAM.w} ${CAM.h}`;
const SILUETA = 'M 248 52 Q 300 68 352 52 C 384 60 420 70 448 84 C 488 110 526 150 554 196 L 494 264 C 476 254 460 246 442 240 C 436 300 432 360 434 420 C 436 490 442 560 446 606 C 400 618 352 624 300 624 C 248 624 200 618 154 606 C 158 560 164 490 166 420 C 168 360 164 300 158 240 C 140 246 124 254 106 264 L 46 196 C 74 150 112 110 152 84 C 180 70 216 60 248 52 Z';
const MANGAS = ['M 448 84 C 488 110 526 150 554 196 L 494 264 C 476 254 460 246 442 240 C 452 190 454 130 448 84 Z', 'M 152 84 C 112 110 74 150 46 196 L 106 264 C 124 254 140 246 158 240 C 148 190 146 130 152 84 Z'];
const VIVOS = [
  'M 554 196 L 494 264 L 482 253 L 542 186 Z', 'M 46 196 L 106 264 L 118 253 L 58 186 Z', // los puños
  'M 536 176 L 476 245 L 471 240 L 531 171 Z', 'M 64 176 L 124 245 L 129 240 L 69 171 Z', // el filete de la manga
  'M 244 50 Q 300 66 356 50 L 360 61 Q 300 82 240 61 Z' // el cuello
];
const LATERALES = ['M 442 240 C 436 300 432 360 434 420 C 436 490 442 560 446 606 L 426 609 C 420 520 414 420 412 330 C 412 300 418 270 428 246 Z', 'M 158 240 C 164 300 168 360 166 420 C 164 490 158 560 154 606 L 174 609 C 180 520 186 420 188 330 C 188 300 182 270 172 246 Z'];
const ESQUIRLAS = ['M 448 84 L 470 100 L 330 360 L 300 380 Z', 'M 152 84 L 130 100 L 270 360 L 300 380 Z']; // el gráfico sublimado
const INTERIOR = 'M 248 52 Q 300 22 352 52 Q 300 68 248 52 Z'; // el cuello por dentro
const ARCO = 'M 170 180 Q 300 164 430 180'; // el handle, en arco sobre los hombros
const DORSAL = { x: 300, y: 452 };
// El mapa de alturas: las crestas (los pliegues que bajan de los hombros, los de las mangas y los de los costados) y los
// valles al lado de cada una (un pliegue tiene un filo y una sombra).
const CRESTAS = [
  ['M 444 98 C 414 150 384 220 354 296', 16], ['M 156 98 C 186 150 216 220 246 296', 16], ['M 300 84 C 302 116 300 150 298 182', 8],
  ['M 424 262 C 418 360 416 470 422 598', 12], ['M 176 262 C 182 360 184 470 178 598', 12],
  ['M 476 118 C 488 160 496 200 502 250', 10], ['M 124 118 C 112 160 104 200 98 250', 10],
  ['M 332 330 C 352 400 354 480 342 592', 8], ['M 266 340 C 250 410 248 490 260 592', 8],
  ['M 380 300 C 392 330 396 352 398 380', 6], ['M 220 300 C 208 330 204 352 202 380', 6]
];
const VALLES = [
  ['M 432 104 C 404 156 376 222 346 300', 10], ['M 168 104 C 196 156 224 222 254 300', 10],
  ['M 410 270 C 406 360 404 470 408 598', 8], ['M 190 270 C 194 360 196 470 192 598', 8],
  ['M 488 130 C 498 170 504 210 508 252', 7], ['M 112 130 C 102 170 96 210 92 252', 7]
];
const LUZ = {
  blur: 8, onda: '0.007 0.012', ondaOctavas: 2, ondaK: 0.035, semillaOnda: 11, fino: '0.85', finoK: 0.05, semillaFino: 4,
  relieve: 12, kd: 1.22, ks: 0.8, exp: 14, azimut: 235, elev: 54, elevBrillo: 38, filo: 6, filoDx: -3
};
// Las sombras de forma (multiply): el cuerpo como cilindro (los costados se van) y la luz clave de arriba a la izquierda.
const CILINDRO = [[0, 0.5], [0.28, 0.05], [0.5, 0], [0.8, 0.18], [1, 0.62]];
const CLAVE = [[0, 0], [0.55, 0.12], [1, 0.5]];
const SOLO_ALFA = '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0';
// La luz de la org que cruza la prenda (ms) y el loop vivo: colgada, se mece apenas (grados, ms).
const BARRIDO = { dur: 620 };
const VAIVEN = { giro: 0.5, dur: 7000 };
// El número cambia con un golpe corto (ms).
const GOLPE_NUMERO = 220;
const mascaraSilueta = () => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${CAJA}'><path d='${SILUETA}'/></svg>`)}")`;

// Las variables de color de la prenda para un tono (nombres de token: el hex vive en tokens.css).
const varsDeTono = (t) => ({ '--h-luz': `var(${t.luz})`, '--h-contra': `var(${t.contra})`, '--h-acento': `var(${t.acento})`, '--h-noche': `var(${t.noche})` });
let serie = 0;

export function crearJersey({ org, liga, handle, numero, tono }) {
  const id = `jy-${++serie}`;
  const nombre = String(handle ?? '').toUpperCase();

  // ---- la tela: el mapa de alturas y sus dos luces
  const mapa = () => [
    svg('rect', { class: 'jy-base', x: '0', y: '0', width: String(CAM.w), height: String(CAM.h) }),
    ...CRESTAS.map(([d, a]) => svg('path', { class: 'jy-cresta', d, 'stroke-width': String(a) })),
    ...VALLES.map(([d, a]) => svg('path', { class: 'jy-valle', d, 'stroke-width': String(a) }))
  ];
  const alturas = (p) => [
    svg('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: String(LUZ.blur), result: `${p}p` }),
    svg('feTurbulence', { type: 'fractalNoise', baseFrequency: LUZ.onda, numOctaves: String(LUZ.ondaOctavas), seed: String(LUZ.semillaOnda), result: `${p}o` }),
    svg('feComposite', { in: `${p}p`, in2: `${p}o`, operator: 'arithmetic', k1: '0', k2: '1', k3: String(LUZ.ondaK), k4: '0', result: `${p}h` })
  ];
  const filtro = (fid, hijos) => svg('filter', { id: fid, x: '0', y: '0', width: String(CAM.w), height: String(CAM.h), filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, hijos);
  const recorte = (cid) => svg('clipPath', { id: cid }, svg('path', { d: SILUETA }));
  const degrade = (gid, attrs, paradas) => svg('linearGradient', { id: gid, ...attrs }, paradas.map(([o, a]) => svg('stop', { class: 'jy-sombra-stop', offset: String(o), 'stop-opacity': String(a) })));
  const luz = svg('svg', { class: 'jy-luz', viewBox: CAJA, 'aria-hidden': 'true' }, [
    svg('defs', {}, [
      recorte(`${id}-l`),
      filtro(`${id}-tela`, [
        ...alturas('a'),
        svg('feTurbulence', { type: 'fractalNoise', baseFrequency: LUZ.fino, numOctaves: '1', seed: String(LUZ.semillaFino), result: 'af' }),
        svg('feComposite', { in: 'ah', in2: 'af', operator: 'arithmetic', k1: '0', k2: '1', k3: String(LUZ.finoK), k4: '0', result: 'aa' }),
        svg('feColorMatrix', { in: 'aa', type: 'matrix', values: SOLO_ALFA, result: 'am' }),
        svg('feDiffuseLighting', { class: 'jy-difusa', in: 'am', surfaceScale: String(LUZ.relieve), diffuseConstant: String(LUZ.kd) }, svg('feDistantLight', { azimuth: String(LUZ.azimut), elevation: String(LUZ.elev) }))
      ]),
      degrade(`${id}-cil`, { x1: '0', y1: '0', x2: '1', y2: '0' }, CILINDRO),
      degrade(`${id}-clave`, { x1: '0.15', y1: '0', x2: '0.85', y2: '1' }, CLAVE)
    ]),
    svg('g', { 'clip-path': `url(#${id}-l)` }, [
      svg('g', { filter: `url(#${id}-tela)` }, mapa()),
      svg('rect', { x: '40', y: '0', width: String(CAM.w - 80), height: String(CAM.h), fill: `url(#${id}-cil)` }),
      svg('rect', { x: '0', y: '0', width: String(CAM.w), height: String(CAM.h), fill: `url(#${id}-clave)` })
    ])
  ]);
  const brillo = svg('svg', { class: 'jy-brillo', viewBox: CAJA, 'aria-hidden': 'true' }, [
    svg('defs', {}, [
      recorte(`${id}-b`),
      filtro(`${id}-esp`, [
        ...alturas('b'),
        svg('feColorMatrix', { in: 'bh', type: 'matrix', values: SOLO_ALFA, result: 'bm' }),
        svg('feSpecularLighting', { class: 'jy-especular', in: 'bm', surfaceScale: String(LUZ.relieve), specularConstant: String(LUZ.ks), specularExponent: String(LUZ.exp) }, svg('feDistantLight', { azimuth: String(LUZ.azimut), elevation: String(LUZ.elevBrillo) }))
      ]),
      svg('filter', { id: `${id}-filo` }, svg('feGaussianBlur', { stdDeviation: String(LUZ.filo) }))
    ]),
    svg('g', { 'clip-path': `url(#${id}-b)` }, [
      svg('g', { filter: `url(#${id}-esp)` }, mapa()),
      svg('path', { class: 'jy-filo', d: SILUETA, filter: `url(#${id}-filo)`, transform: `translate(${LUZ.filoDx} 0)` })
    ])
  ]);
  const sombra = svg('svg', { class: 'jy-sombra', viewBox: CAJA, 'aria-hidden': 'true' }, svg('path', { d: SILUETA }));

  // ---- el color: una capa plana en los tokens de la org, con el handle en arco y el número en tres pasadas (el borde
  // en la contra, el hueco del color del cuerpo y la tinta)
  const numeros = ['jy-num-borde', 'jy-num-hueco', 'jy-num-tinta'].map((clase) =>
    svg('text', { class: `jy-num ${clase}`, x: String(DORSAL.x), y: String(DORSAL.y), 'text-anchor': 'middle' }, document.createTextNode(String(numero))));
  const tramo = svg('textPath', { href: `#${id}-arco`, startOffset: '50%' }, document.createTextNode(nombre));
  if (nombre.length > CAM.nombreLargo) {
    tramo.setAttribute('textLength', String(CAM.nombreAncho));
    tramo.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
  const color = svg('svg', { class: 'jy-color', viewBox: CAJA, 'aria-hidden': 'true' }, [
    svg('defs', {}, [
      recorte(`${id}-r`),
      svg('linearGradient', { id: `${id}-lat`, x1: '0', y1: '0', x2: '0', y2: '1' }, [svg('stop', { class: 'jy-lat-a', offset: '0' }), svg('stop', { class: 'jy-lat-b', offset: '1' })]),
      svg('linearGradient', { id: `${id}-esq`, x1: '0', y1: '0', x2: '0', y2: '1' }, [svg('stop', { class: 'jy-esq-a', offset: '0' }), svg('stop', { class: 'jy-esq-b', offset: '1' })]),
      svg('path', { id: `${id}-arco`, d: ARCO })
    ]),
    svg('g', { 'clip-path': `url(#${id}-r)` }, [
      svg('path', { class: 'jy-cuerpo', d: SILUETA }),
      ...ESQUIRLAS.map((d) => svg('path', { d, fill: `url(#${id}-esq)` })),
      svg('path', { class: 'jy-interior', d: INTERIOR }),
      ...MANGAS.map((d) => svg('path', { class: 'jy-manga', d })),
      ...LATERALES.map((d) => svg('path', { d, fill: `url(#${id}-lat)` })),
      ...VIVOS.map((d) => svg('path', { class: 'jy-vivo', d })),
      svg('text', { class: 'jy-nombre', 'text-anchor': 'middle' }, tramo),
      ...numeros
    ])
  ]);
  const capa = el('div', { class: 'jy-capa' }, [
    color,
    el('span', { class: 'jy-escudo' }, pintarLogo(org, { tam: 40, alt: '' })),
    liga ? el('span', { class: 'jy-parche' }, pintarLogo(liga, { liga: true, tam: 36, alt: '' })) : null
  ]);
  const barridos = el('div', { class: 'jy-barridos', style: { maskImage: mascaraSilueta(), webkitMaskImage: mascaraSilueta() } });
  const prenda = el('div', { class: 'jy-prenda' }, [sombra, capa, luz, brillo, barridos]);
  const nodo = el('div', { class: 'jy', role: 'img', 'aria-label': `Jersey de ${org}: ${handle}, número ${numero}`, style: varsDeTono(tono) }, prenda);

  const vaiven = inst() || reducido() ? null : prenda.animate(
    [{ transform: `rotate(${-VAIVEN.giro}deg)` }, { transform: `rotate(${VAIVEN.giro}deg)` }],
    { duration: VAIVEN.dur, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }
  );

  return {
    nodo,
    // El número que elegiste: las tres pasadas del texto y la etiqueta. `golpe`: un pulso corto al cambiar.
    numero(n, { golpe = true } = {}) {
      for (const t of numeros) t.textContent = String(n);
      nodo.setAttribute('aria-label', `Jersey de ${org}: ${handle}, número ${n}`);
      if (golpe) animar(color, [{ filter: 'brightness(1.35)' }, { filter: 'none' }], { dur: GOLPE_NUMERO });
    },
    // La luz de la org que cruza la prenda en `t` (ms del reloj de beats).
    barrido(w, t) {
      const b = el('i', { class: 'jy-barrido' });
      barridos.replaceChildren(b);
      w(animar(b, [{ opacity: 0, transform: 'translateX(-60%)' }, { opacity: 1, transform: 'translateX(0%)', offset: 0.4 }, { opacity: 0, transform: 'translateX(60%)' }], { delay: t, dur: BARRIDO.dur, easing: 'linear' }));
    },
    destruir() {
      vaiven?.cancel();
    }
  };
}
