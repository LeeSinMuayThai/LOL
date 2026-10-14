// El emblema del aumento (P2, PLANUI §0.5): el arte de una carta cuando la opción no nombra un campeón ni lleva a un
// equipo o a una liga, que es el caso de casi todas. Una ilustración vectorial propia por eje (`core/ejes.js`), como el
// ícono de un aumento de Arena o de TFT: no es un splash. Cuatro capas, de atrás hacia adelante:
//   el halo     la luz radial del eje detrás de todo;
//   el patrón   el motivo del eje a lo ancho de la ventana (galones, papel cuadriculado, ondas, rayos...), tenue;
//   la placa    el hexágono (el medallón de antes, ahora parte del emblema): placa honda, filo doble y remaches;
//   el glifo    el dibujo grande del eje, con brillo.
// Todo se pinta con `currentColor` y opacidades: el color sale de `--eje` (lo pone `estiloEje` en la carta) y no hay un
// solo color literal acá (los de la placa y el hueco son tokens, en decision-cartas.css). SVG generado: nada de imágenes.
// Puro respecto del motor: no lee el estado, solo dibuja.
import { svg } from '../../fx/util.js';
import { icono } from '../../fx/iconos.js';

// El lienzo: 160 × 100 (la ventana de la carta es apaisada). El centro del emblema y el radio de la placa hexagonal.
const ANCHO = 160;
const ALTO = 100;
const CX = 80;
const CY = 50;
const R_PLACA = 36;
const R_FILO = 40;
// El glifo de 16 × 16 del kit (`fx/iconos.js`), escalado para llenar la placa, y su trazo en unidades del 16.
const ESCALA_GLIFO = 2.6;
const TRAZO_GLIFO = 1.25;
// Ids de los gradientes y máscaras: un contador (determinista; dos emblemas en la misma página no comparten id).
let serie = 0;

const f2 = (n) => Number(n.toFixed(2));
const camino = (d, a = {}) => svg('path', { d, ...a });
const punto = (x, y, r, a = {}) => svg('circle', { cx: x, cy: y, r, ...a });
const grupo = (a, hijos) => svg('g', a, hijos);
// Los vértices de un polígono regular alrededor del centro (`fase` en grados; -90 = con punta arriba).
function vertices(n, r, fase = -90, cx = CX, cy = CY) {
  return Array.from({ length: n }, (_, k) => {
    const a = ((fase + (360 / n) * k) * Math.PI) / 180;
    return [f2(cx + r * Math.cos(a)), f2(cy + r * Math.sin(a))];
  });
}
const poligono = (pts, a = {}) => svg('polygon', { points: pts.map((p) => p.join(',')).join(' '), ...a });
// Un destello de cuatro puntas (las estrellas, los flashes, el brillo del rango).
function destello(x, y, r, a = {}) {
  const k = r * 0.28;
  return camino(`M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`, { class: 'cv-emb-lleno', ...a });
}
// Una onda a lo ancho del lienzo (y un poco más: el patrón no se corta en el borde de la ventana).
function onda(y, amp, largo, desde = -60, hasta = ANCHO + 60) {
  let d = `M${desde} ${y}`;
  for (let x = desde; x < hasta; x += largo) d += `q${largo / 4} ${-amp} ${largo / 2} 0t${largo / 2} 0`;
  return d;
}

// ---------------------------------------------------------------------- los motivos: { patron: [], glifo: [] }
const MOTIVOS = {
  // galones de rango que suben, con alas de emblema
  soloq() {
    const patron = [];
    for (let i = 0; i < 12; i += 1) {
      const x = -36 + i * 22;
      const y = 92 - i * 7;
      patron.push(camino(`M${x - 7} ${y + 5}l7 -6l7 6`, { opacity: f2(0.12 + i * 0.012) }));
      patron.push(camino(`M${x + 4} ${y + 18}l7 -6l7 6`, { opacity: 0.08 }));
    }
    const galon = (y, op) => camino(`M64 ${y + 7}L80 ${y - 5}L96 ${y + 7}V${y + 13}L80 ${y + 1}L64 ${y + 13}Z`, { class: 'cv-emb-lleno', 'fill-opacity': op });
    const ala = (s) => grupo({ transform: s < 0 ? `translate(${ANCHO} 0) scale(-1 1)` : null }, [
      camino('M62 50C52 47 45 40 41 30', { 'stroke-width': 2.2 }),
      camino('M62 55C50 55 42 50 36 42', { 'stroke-width': 1.9 }),
      camino('M62 60C51 62 43 60 37 54', { 'stroke-width': 1.6 }),
      camino('M62 65C53 68 46 68 41 65', { 'stroke-width': 1.3, opacity: 0.7 })
    ]);
    return {
      patron,
      glifo: [ala(1), ala(-1), galon(55, 0.4), galon(44, 0.68), galon(33, 1), destello(80, 23, 5.5)]
    };
  },
  // un libro abierto sobre papel cuadriculado
  estudios() {
    const patron = [];
    for (let x = -64; x <= ANCHO + 64; x += 8) patron.push(camino(`M${x} -40V140`, { opacity: x % 32 === 0 ? 0.22 : 0.1 }));
    for (let y = -40; y <= 140; y += 8) patron.push(camino(`M-64 ${y}H${ANCHO + 64}`, { opacity: y % 32 === 0 ? 0.22 : 0.1 }));
    const hoja = 'M80 39C72 33 61 32 52 34V65C61 63 72 64 80 70Z';
    const renglones = [44, 49, 54, 59].map((y, i) => camino(`M57 ${y}Q66 ${y - 2.2} ${i === 3 ? 69 : 75} ${y + 0.8}`, { 'stroke-width': 1.3, opacity: 0.75 }));
    const pagina = (espejo) => grupo({ transform: espejo ? `translate(${ANCHO} 0) scale(-1 1)` : null }, [
      camino(hoja, { class: 'cv-emb-lleno', 'fill-opacity': 0.16, 'stroke-width': 2.4 }),
      ...renglones
    ]);
    return {
      patron,
      glifo: [
        camino('M48 38V69C60 66 72 67 80 73C88 67 100 66 112 69V38', { 'stroke-width': 1.4, opacity: 0.55 }),
        pagina(false), pagina(true),
        camino('M80 39V70', { 'stroke-width': 2 }),
        camino('M91 35V48l3.5 -3l3.5 3V34.2', { class: 'cv-emb-lleno', 'stroke-width': 1.2 })
      ]
    };
  },
  // luna, estrellas y ondas lentas
  sueno() {
    const patron = [64, 73, 82, 91].map((y, i) => camino(onda(y, 3.2 - i * 0.4, 48 + i * 6, -60 - i * 9), { opacity: f2(0.3 - i * 0.05) }));
    const estrellas = [[18, 16, 1.1], [38, 30, 0.8], [124, 14, 1.2], [146, 34, 0.9], [8, 44, 0.7], [134, 52, 0.8], [26, 58, 0.6], [112, 24, 0.6], [56, 12, 0.9], [150, 10, 0.6]];
    for (const [x, y, r] of estrellas) patron.push(punto(x, y, r, { class: 'cv-emb-lleno', stroke: 'none', opacity: 0.55 }));
    patron.push(destello(30, 22, 3.4, { opacity: 0.5 }), destello(138, 22, 2.6, { opacity: 0.45 }));
    // la luna en cuarto: el arco grande del disco y, de vuelta, el de la sombra (dos círculos que se cortan)
    const luna = 'M97.34 56.21A21 21 0 1 1 75.94 30.03A17 17 0 0 0 97.34 56.21Z';
    return {
      patron,
      glifo: [
        camino(luna, { class: 'cv-emb-lleno', 'fill-opacity': 0.9, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }),
        punto(70, 57, 2.4, { 'stroke-width': 1, opacity: 0.45 }),
        punto(66, 46, 1.4, { 'stroke-width': 0.9, opacity: 0.4 }),
        destello(100, 33, 4.6), destello(106, 50, 2.6, { opacity: 0.8 }), punto(96, 61, 1.2, { class: 'cv-emb-lleno', stroke: 'none' })
      ]
    };
  },
  // un techo con la ventana prendida, luz cálida
  casa() {
    const patron = [
      poligono([[72, 64], [88, 64], [128, 140], [32, 140]], { class: 'cv-emb-lleno', stroke: 'none', 'fill-opacity': 0.1 }),
      poligono([[76, 64], [84, 64], [100, 140], [60, 140]], { class: 'cv-emb-lleno', stroke: 'none', 'fill-opacity': 0.08 }),
      camino(`M-60 78H${ANCHO + 60}`, { opacity: 0.22 })
    ];
    // el barrio, lejos: casitas bajas con alguna ventana prendida
    for (const [x, prendida] of [[6, true], [26, false], [126, false], [146, true]]) {
      patron.push(camino(`M${x - 8} 78V68L${x} 61L${x + 8} 68V78`, { opacity: 0.22, 'stroke-width': 1.1 }));
      if (prendida) patron.push(svg('rect', { x: x - 2.4, y: 69, width: 4.8, height: 4.4, class: 'cv-emb-lleno', stroke: 'none', opacity: 0.55 }));
    }
    return {
      patron,
      glifo: [
        camino('M95 40V31H100V45', { 'stroke-width': 2.2 }),
        camino('M61 48V71H99V48', { class: 'cv-emb-lleno', 'fill-opacity': 0.12, 'stroke-width': 2.4 }),
        camino('M54 51L80 29L106 51', { 'stroke-width': 3.6 }),
        svg('rect', { x: 71.5, y: 52, width: 17, height: 13, rx: 1, class: 'cv-emb-lleno cv-emb-luz', 'stroke-width': 1.4 }),
        camino('M80 52V65M71.5 58.5H88.5', { class: 'cv-emb-hueco', 'stroke-width': 1.3 })
      ]
    };
  },
  // la onda de la mentalidad cruzando anillos de foco
  cabeza() {
    const patron = [];
    [46, 56, 68, 82].forEach((r, i) => patron.push(punto(CX, CY, r, { opacity: f2(0.24 - i * 0.04), 'stroke-dasharray': i % 2 ? '2 5' : null })));
    for (const [x1, y1] of vertices(12, 52, -90)) {
      const [x2, y2] = [f2(CX + (x1 - CX) * 1.1), f2(CY + (y1 - CY) * 1.1)];
      patron.push(camino(`M${x1} ${y1}L${x2} ${y2}`, { opacity: 0.3 }));
    }
    return {
      patron,
      glifo: [
        punto(CX, CY, 25, { 'stroke-width': 1.4, opacity: 0.5 }),
        punto(CX, CY, 15, { 'stroke-width': 1.8, opacity: 0.75 }),
        camino('M38 50C46 26 53 26 60 50S72 70 80 50S92 34 100 50S113 60 122 50', { 'stroke-width': 3.4 }),
        punto(CX, CY, 3, { class: 'cv-emb-lleno', stroke: 'none' })
      ]
    };
  },
  // el glifo de la stat sobre una retícula
  juego(id, glifo) {
    const patron = [
      punto(CX, CY, 46, { opacity: 0.22 }),
      punto(CX, CY, 58, { opacity: 0.12, 'stroke-dasharray': '1 4' }),
      camino(`M-60 ${CY}H${CX - 48}M${CX + 48} ${CY}H${ANCHO + 60}`, { opacity: 0.28 }),
      camino(`M${CX} -40V${CY - 48}M${CX} ${CY + 48}V140`, { opacity: 0.28 })
    ];
    for (let x = -56; x <= ANCHO + 56; x += 8) if (Math.abs(x - CX) > 50) patron.push(camino(`M${x} ${CY - (x % 24 === 0 ? 3 : 1.6)}V${CY + (x % 24 === 0 ? 3 : 1.6)}`, { opacity: 0.3 }));
    // las esquinas de la mira, sobre la placa
    const esquina = (sx, sy) => camino(`M${CX + sx * 30} ${CY + sy * 20}v${sy * 8}h${-sx * 8}`, { 'stroke-width': 1.6, opacity: 0.7 });
    const lado = 16 * ESCALA_GLIFO;
    const dibujo = icono(glifo || 'nivel');
    const trazos = grupo({ transform: `translate(${f2(CX - lado / 2)} ${f2(CY - lado / 2)}) scale(${ESCALA_GLIFO})`, 'stroke-width': TRAZO_GLIFO }, [...dibujo.childNodes]);
    return { patron, glifo: [esquina(1, 1), esquina(-1, 1), esquina(1, -1), esquina(-1, -1), trazos] };
  },
  // un estallido de flashes y reflectores
  fama() {
    const patron = [
      poligono([[-10, 120], [44, -20], [62, -20]], { class: 'cv-emb-lleno', stroke: 'none', 'fill-opacity': 0.09 }),
      poligono([[ANCHO + 10, 120], [ANCHO - 44, -20], [ANCHO - 62, -20]], { class: 'cv-emb-lleno', stroke: 'none', 'fill-opacity': 0.09 }),
      camino(`M-10 120L44 -20M${ANCHO + 10} 120L${ANCHO - 44} -20`, { opacity: 0.2 })
    ];
    vertices(20, 44, -90).forEach(([x, y], k) => {
      const largo = k % 2 ? 1.18 : 1.42;
      patron.push(camino(`M${x} ${y}L${f2(CX + (x - CX) * largo)} ${f2(CY + (y - CY) * largo)}`, { opacity: k % 2 ? 0.16 : 0.3 }));
    });
    for (const [x, y, r] of [[22, 28, 3.2], [140, 64, 3.6], [128, 18, 2.4], [30, 74, 2.2]]) patron.push(destello(x, y, r, { opacity: 0.5 }));
    const estrella = vertices(16, 25, -90).map(([x, y], k) => (k % 2 ? [f2(CX + (x - CX) * 0.38), f2(CY + (y - CY) * 0.38)] : [x, y]));
    return {
      patron,
      glifo: [
        poligono(estrella, { class: 'cv-emb-lleno', 'fill-opacity': 0.88, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }),
        punto(CX, CY, 5.5, { class: 'cv-emb-hueco cv-emb-hueco-lleno', 'stroke-width': 0 }),
        punto(CX, CY, 2.4, { class: 'cv-emb-lleno', stroke: 'none' }),
        destello(103, 31, 4), destello(58, 66, 3, { opacity: 0.85 })
      ]
    };
  },
  // cinco puntos en formación, unidos
  equipo() {
    const patron = [];
    for (let y = -6; y <= ALTO + 6; y += 10) for (let x = -60 + ((y / 10) % 2 ? 5 : 0); x <= ANCHO + 60; x += 10) {
      if (Math.hypot(x - CX, y - CY) > 42) patron.push(punto(x, y, 0.7, { class: 'cv-emb-lleno', stroke: 'none', opacity: 0.28 }));
    }
    const pos = vertices(5, 21, -90, CX, CY + 1);
    const lazos = pos.map(([x, y], k) => {
      const [x2, y2] = pos[(k + 1) % 5];
      return camino(`M${x} ${y}L${x2} ${y2}`, { 'stroke-width': 2 });
    });
    const cruces = pos.map(([x, y], k) => {
      const [x2, y2] = pos[(k + 2) % 5];
      return camino(`M${x} ${y}L${x2} ${y2}`, { 'stroke-width': 1, opacity: 0.35 });
    });
    return {
      patron,
      glifo: [...cruces, ...lazos, ...pos.flatMap(([x, y]) => [punto(x, y, 7, { 'stroke-width': 1.1, opacity: 0.5, class: 'cv-emb-hueco-lleno' }), punto(x, y, 4.2, { class: 'cv-emb-lleno', stroke: 'none' })])]
    };
  }
};

// Sin eje (o una carta cerrada): la placa sola con el glifo del kit (el candado, lo incierto), sin patrón.
function sinEje(glifo) {
  const lado = 16 * ESCALA_GLIFO * 0.8;
  const dibujo = icono(glifo || 'incierto');
  return {
    patron: [],
    glifo: [grupo({ transform: `translate(${f2(CX - lado / 2)} ${f2(CY - lado / 2)}) scale(${ESCALA_GLIFO * 0.8})`, 'stroke-width': TRAZO_GLIFO }, [...dibujo.childNodes])]
  };
}

// `eje`: el id del eje (`core/ejes.js`) o null. `glifo`: el glifo del kit para el eje `juego` (el de la stat:
// `glifoDeCampo`) y para las cartas sin eje. Devuelve el <svg> (class `cv-emb`); el color lo pone el CSS con `--eje`.
export function emblema(eje, { glifo = null } = {}) {
  serie += 1;
  const id = `cv-emb-${serie}`;
  const motivo = MOTIVOS[eje] ? MOTIVOS[eje](id, glifo) : sinEje(glifo);
  const halo = svg('radialGradient', { id: `${id}-halo`, cx: '50%', cy: '50%', r: '50%' }, [
    svg('stop', { offset: '0', 'stop-color': 'currentColor', 'stop-opacity': '0.42' }),
    svg('stop', { offset: '0.55', 'stop-color': 'currentColor', 'stop-opacity': '0.1' }),
    svg('stop', { offset: '1', 'stop-color': 'currentColor', 'stop-opacity': '0' })
  ]);
  const placa = svg('radialGradient', { id: `${id}-placa`, cx: '50%', cy: '38%', r: '62%' }, [
    svg('stop', { offset: '0', 'stop-color': 'currentColor', 'stop-opacity': '0.34' }),
    svg('stop', { offset: '1', 'stop-color': 'currentColor', 'stop-opacity': '0.04' })
  ]);
  const hexPlaca = vertices(6, R_PLACA);
  const hexFilo = vertices(6, R_FILO);
  return svg('svg', { class: 'cv-emb', viewBox: `0 0 ${ANCHO} ${ALTO}`, preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true', 'data-eje': eje ?? null }, [
    svg('defs', {}, [halo, placa]),
    svg('ellipse', { class: 'cv-emb-halo', cx: CX, cy: CY, rx: 96, ry: 70, fill: `url(#${id}-halo)`, stroke: 'none' }),
    grupo({ class: 'cv-emb-patron' }, motivo.patron),
    grupo({ class: 'cv-emb-nucleo' }, [
      poligono(hexFilo, { class: 'cv-emb-filo', 'stroke-width': 1 }),
      poligono(hexPlaca, { class: 'cv-emb-fondo', stroke: 'none' }),
      poligono(hexPlaca, { fill: `url(#${id}-placa)`, 'stroke-width': 2.2 }),
      // el reflejo de arriba: el filo de vidrio de la placa
      camino(`M${hexPlaca[5].join(' ')}L${hexPlaca[0].join(' ')}L${hexPlaca[1].join(' ')}`, { class: 'cv-emb-reflejo', transform: `translate(0 1.6) scale(0.94)`, 'transform-origin': `${CX} ${CY}`, 'stroke-width': 0.9 }),
      ...hexFilo.map(([x, y]) => punto(x, y, 1.5, { class: 'cv-emb-lleno', stroke: 'none' })),
      grupo({ class: 'cv-emb-glifo' }, motivo.glifo)
    ])
  ]);
}
