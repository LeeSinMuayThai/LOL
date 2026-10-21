// B · TRANSMISION — las cuatro pantallas. El texto es el de vitrina/ola-i/CONTRATO.md §1, sin agregar nada.
// Cada fabrica devuelve { nodo, elegir?(n), seguir?(), montada?() } ; main.js las monta y les pasa las teclas.

import { el, svg, anim, ICONOS, crearFicha, crearZocalo, efecto, rodar, tecla, seguir, reducido } from './piezas.js';
import { urlIcono } from '../../comun/arte.js';
import { logoOrg } from '../../fusion/js/logos.js';
import { crearAzar } from '../../comun/azar.js';

// ======================================================================================================================
// 1.1 y 1.2 · la decision y su consecuencia
// ======================================================================================================================
const EVENTO = 'Una cuenta sin foto te escribe a las tres de la mañana: te sube a Master en una semana por cuarenta lucas. «Nadie se entera, hermano.» Ya le hizo la cuenta a dos de tu server.';
const OPCIONES = [
  { n: 1, titulo: 'Denunciarlo', efectos: [['sube', 'Cabeza +2'], ['sube', 'Hype +1']], linea: 'Soporte lo banea y quedás de incorruptible.', ficha: { cabeza: 63, hype: 35 } },
  { n: 2, titulo: 'Ignorarlo', efectos: [['sube', 'Cabeza +3'], ['sube', 'Mecánica +1'], ['aviso', 'puede insistir']], linea: 'Subís a pulmón y el LP se siente tuyo.', ficha: { cabeza: 64, mecanica: 71 }, resultado: 'El DM queda perdido entre cien. Subís a pulmón.' },
];

export function decision() {
  const ficha = crearFicha();
  const opciones = OPCIONES.map((o) => crearZocalo({ n: o.n, titulo: o.titulo, efectos: o.efectos.map(([t, x]) => efecto(t, x)), linea: o.linea }));
  const evento = el('section', { class: 'evento' }, [el('span', { class: 'kicker' }, 'UN DM RARO'), el('p', { class: 'evento-texto' }, EVENTO)]);
  const nodo = el('main', { class: 'pantalla p-decision' }, [ficha, el('div', { class: 'p-cuerpo' }, [evento, el('div', { class: 'opciones' }, opciones)])]);
  let elegida = 0;

  function entrar() {
    // la entrada de la placa: un barrido de izquierda a derecha, como entra un grafico al aire
    [evento, ...opciones].forEach((n, i) => anim(n, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { delay: 80 + i * 90, dur: 420 }));
  }
  function elegir(n) {
    if (elegida || !OPCIONES[n - 1]) return false;
    elegida = n;
    const o = OPCIONES[n - 1];
    opciones.forEach((z, i) => {
      z.disabled = true;
      if (i === n - 1) {
        z.dataset.estado = 'elegido';
        anim(z, [{ transform: 'translateX(10px)' }, { transform: 'none' }], { dur: 220 });
      } else {
        // 0-150: la no elegida baja al 35 %
        z.dataset.estado = 'apagado';
        anim(z, [{ opacity: 1, filter: 'saturate(1)' }, { opacity: 0.35, filter: 'saturate(0)' }], { dur: 150, easing: 'linear' });
      }
    });
    // 150-750: los numeros ruedan en la ficha con su flecha
    for (const [k, v] of Object.entries(o.ficha)) rodar(ficha, k, v, { delay: 150, dur: 600 });
    // 300-600: la linea entra bajo la opcion (reemplaza a la que habia) y queda hasta que el jugador sigue
    const z = opciones[n - 1];
    const tira = el('span', { class: 'zoc-resultado' }, [o.resultado ? el('span', {}, o.resultado) : null, seguir()]);
    z.querySelector('.zoc-linea').replaceWith(tira);
    anim(tira, [{ clipPath: 'inset(0 100% 0 0)', opacity: 0.4 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { delay: 300, dur: 300 });
    return true;
  }
  opciones.forEach((z, i) => z.addEventListener('click', () => elegir(i + 1)));
  return { nodo, entrar, elegir, pendiente: () => !elegida, seguir: () => elegida > 0 };
}

// ======================================================================================================================
// 1.3 · el minijuego: la previa, el HUD y el resultado
// ======================================================================================================================
const SEN = logoOrg('Sentinels');
// CK no es una org de logos.js: lleva un escudo plano (sin letras, para no sumar texto)
function escudoCK() {
  return svg('svg', { class: 'logo escudo-ck', viewBox: '0 0 40 46', 'aria-hidden': 'true', focusable: 'false' }, [
    svg('path', { class: 'esc-forma', d: 'M20 1.6 L37.4 7.2 V21.8 C37.4 32.6 30.2 40.4 20 44.4 C9.8 40.4 2.6 32.6 2.6 21.8 V7.2 Z' }),
    svg('path', { class: 'esc-marca', d: 'M12 13 H22 L14 23 H24 L13 35 L17 25 H9 Z M24 13 H30 L26 21 H31 L22 33 L25 23 H20 Z' }),
  ]);
}
const logoSEN = () => el('img', { class: 'logo', src: SEN.src, alt: '', decoding: 'async' });
const lado = (eq) => (eq === 'azul' ? logoSEN() : escudoCK());

function marcador(centro) {
  return el('header', { class: 'ficha marcador' }, [
    el('div', { class: 'ficha-ala izq equipo-azul' }, [el('span', { class: 'marc-logo' }, logoSEN()), el('span', { class: 'marc-tag' }, 'SEN')]),
    el('div', { class: 'ficha-centro' }, centro),
    el('div', { class: 'ficha-ala der equipo-rojo' }, [el('span', { class: 'marc-tag' }, 'CK'), el('span', { class: 'marc-logo' }, escudoCK())]),
  ]);
}

const conIcono = (z, i) => (z.querySelector('.tecla').replaceChildren(i), z);
function previa() {
  return el('main', { class: 'pantalla p-previa' }, [
    el('div', { class: 'liga' }, 'LCS · SPLIT 2 · CUARTOS'),
    el('div', { class: 'cruce' }, [
      el('div', { class: 'cruce-lado azul' }, [logoSEN(), el('span', { class: 'cruce-tag' }, 'SEN')]),
      el('span', { class: 'cruce-vs' }, 'vs'),
      el('div', { class: 'cruce-lado rojo' }, [el('span', { class: 'cruce-tag' }, 'CK'), escudoCK()]),
    ]),
    el('div', { class: 'bo5' }, [el('span', { class: 'bo5-rot' }, 'Bo5'), ...[1, 2, 3, 4, 5].map(() => el('span', { class: 'casilla' }))]),
    el('div', { class: 'previa-zocalos' }, [
      el('span', { class: 'tira' }, 'Esquivá los skillshots. Flash con F.'),
      conIcono(crearZocalo({ n: '', titulo: '6 de 8 oleadas', linea: 'CK es 2.º de la tabla', tag: 'div' }), ICONOS.vara()),
    ]),
    el('button', { class: 'boton primario', type: 'button', 'data-accion': 'jugar' }, ['JUGAR', ICONOS.enter()]),
  ]);
}

// el campo: una captura quieta del juego en curso (SVG), con tres skillshots telegrafiados, el que te pego y el Flash
function campo() {
  const azar = crearAzar('hud-i-transmision');
  const piedras = Array.from({ length: 26 }, () => {
    const x = azar.entre(80, 1360), y = azar.entre(120, 820), r = azar.entre(6, 22);
    return svg('ellipse', { class: 'piedra', cx: x.toFixed(0), cy: y.toFixed(0), rx: r.toFixed(1), ry: (r * 0.55).toFixed(1) });
  });
  const skill = (x, y, ang, largo) =>
    svg('g', { transform: `translate(${x} ${y}) rotate(${ang})` }, [
      svg('rect', { class: 'telegrafo', x: 0, y: -34, width: largo, height: 68, rx: 34 }),
      svg('rect', { class: 'telegrafo-filo', x: 0, y: -34, width: largo, height: 68, rx: 34 }),
    ]);
  return svg('svg', { class: 'campo', viewBox: '0 0 1440 900', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' }, [
    svg('defs', {}, [
      svg('radialGradient', { id: 'suelo', cx: '50%', cy: '52%', r: '70%' }, [svg('stop', { offset: '0', class: 'st-a' }), svg('stop', { offset: '1', class: 'st-b' })]),
      svg('linearGradient', { id: 'estela', x1: '0', x2: '1' }, [svg('stop', { offset: '0', class: 'st-nada' }), svg('stop', { offset: '1', class: 'st-proy' })]),
      svg('clipPath', { id: 'cara' }, [svg('circle', { cx: 0, cy: 0, r: 40 })]),
    ]),
    svg('rect', { class: 'suelo', width: 1440, height: 900 }),
    ...piedras,
    svg('ellipse', { class: 'arena', cx: 720, cy: 480, rx: 600, ry: 330 }),
    skill(150, 300, 18, 1100),
    skill(1300, 250, 128, 760),
    skill(240, 720, -14, 980),
    // el proyectil que te acaba de pegar
    svg('g', { transform: 'translate(560 420) rotate(18)' }, [svg('rect', { class: 'estela', x: -220, y: -10, width: 220, height: 20, rx: 10 }), svg('circle', { class: 'proyectil', cx: 0, cy: 0, r: 16 })]),
    // el Flash: de donde saltaste
    svg('line', { class: 'fantasma-linea', x1: 610, y1: 600, x2: 704, y2: 520 }),
    svg('circle', { class: 'fantasma', cx: 610, cy: 600, r: 34 }),
    // Orianna (el campeon de este mapa) y su bola
    svg('g', { transform: 'translate(720 500)' }, [
      svg('circle', { class: 'jugador-aro', cx: 0, cy: 0, r: 46 }),
      svg('image', { href: urlIcono('Orianna'), x: -40, y: -40, width: 80, height: 80, 'clip-path': 'url(#cara)', preserveAspectRatio: 'xMidYMid slice' }),
      svg('rect', { class: 'mini-vida-fondo', x: -50, y: -74, width: 100, height: 12 }),
      svg('rect', { class: 'mini-vida', x: -48, y: -72, width: 51, height: 8 }),
      svg('rect', { class: 'mini-golpe', x: 3, y: -72, width: 10, height: 8 }),
    ]),
    svg('circle', { class: 'bola', cx: 800, cy: 456, r: 13 }),
    svg('text', { class: 'dano', x: 770, y: 410 }, '−120'),
  ]);
}

function hud() {
  const VIDA_MAX = 1200, VIDA = 640, GOLPE = 120;
  const marcas = Array.from({ length: VIDA_MAX / 100 - 1 }, (_, i) => el('span', { class: (i + 1) % 10 === 0 ? 'marca grande' : 'marca', style: `left:${((i + 1) * 100 * 100) / VIDA_MAX}%` }));
  const flash = urlIcono('Orianna').replace(/champion\/Orianna\.png$/, 'spell/SummonerFlash.png');
  return el('main', { class: 'pantalla p-hud' }, [
    campo(),
    marcador([ICONOS.ola(), el('span', { class: 'olas' }, '5 / 8')]),
    el('div', { class: 'hud-jugador' }, [
      el('div', { class: 'retrato' }, [el('img', { src: urlIcono('Orianna'), alt: '', decoding: 'async' }), el('span', { class: 'retrato-nombre' }, 'Orianna')]),
      el('div', { class: 'hud-medio' }, [
        el('div', { class: 'vida' }, [
          el('span', { class: 'vida-actual', style: `width:${(VIDA / VIDA_MAX) * 100}%` }),
          el('span', { class: 'vida-golpe', style: `left:${(VIDA / VIDA_MAX) * 100}%;width:${(GOLPE / VIDA_MAX) * 100}%` }),
          ...marcas,
          el('span', { class: 'vida-num' }, `${VIDA} / ${VIDA_MAX}`),
        ]),
      ]),
      el('div', { class: 'hechizo', style: '--cd: 0.7' }, [el('img', { src: flash, alt: '', decoding: 'async' }), el('span', { class: 'barrido' }), el('span', { class: 'cd-num' }, '211'), tecla('F', 'tecla-s')]),
      el('div', { class: 'icono-hud', 'data-estado': 'guardada', title: 'charla' }, ICONOS.charla()),
      el('div', { class: 'icono-hud', 'data-estado': 'listo', title: 'poder' }, ICONOS.poder()),
    ]),
  ]);
}

const MAPAS = ['azul', 'rojo', 'azul', 'azul'];
function resultado() {
  const sello = el('div', { class: 'sello' }, [el('span', {}, 'PASASTE'), el('span', { class: 'sello-corte', 'aria-hidden': 'true' }), el('span', {}, '7 / 8')]);
  const cabeza = marcador([el('span', { class: 'serie-num gana' }, '3'), el('span', { class: 'sep' }, '-'), el('span', { class: 'serie-num' }, '1')]);
  const filas = MAPAS.map((g, i) =>
    el('li', { class: 'mapa', 'data-gana': g }, [
      tecla(i + 1),
      el('span', { class: 'mapa-placa' }, [el('span', { class: 'mapa-lado azul' }, g === 'azul' ? lado('azul') : null), el('span', { class: 'mapa-lado rojo' }, g === 'rojo' ? lado('rojo') : null)]),
    ]),
  );
  const sigue = seguir();
  const nodo = el('main', { class: 'pantalla p-resultado' }, [sello, el('section', { class: 'serie' }, [cabeza, el('ol', { class: 'mapas' }, filas)]), sigue]);
  function entrar() {
    // el sello cae en el centro (0-250), queda 1200 y sube a su lugar; despues la serie, una fila cada 120 ms
    const r = sello.getBoundingClientRect();
    const dy = innerHeight / 2 - (r.top + r.height / 2);
    const T = 1700, A = 250, Q = 1450;
    anim(sello, [
      { transform: `translateY(${dy}px) scale(1.6)`, opacity: 0, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
      { transform: `translateY(${dy}px) scale(1)`, opacity: 1, offset: A / T },
      { transform: `translateY(${dy}px) scale(1)`, opacity: 1, offset: Q / T, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      { transform: 'none', opacity: 1 },
    ], { dur: T, easing: 'linear' });
    anim(sello.firstChild, [{ letterSpacing: '0.4em' }, { letterSpacing: '0' }], { dur: A });
    anim(cabeza, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }], { delay: T, dur: 240 });
    filas.forEach((f, i) => anim(f, [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { delay: T + 120 * (i + 1), dur: 220 }));
    anim(sigue, [{ opacity: 0 }, { opacity: 1 }], { delay: T + 120 * (filas.length + 1), dur: 200 });
  }
  return { nodo, entrar };
}

export const PASOS = ['previa', 'hud', 'resultado'];
export function minijuego(paso = 'previa') {
  if (paso === 'hud') return { nodo: hud(), avanzar: true };
  if (paso === 'resultado') return { ...resultado(), avanzar: true };
  return { nodo: previa(), avanzar: true };
}

// ======================================================================================================================
// 1.4 · la mano del año
// ======================================================================================================================
const CARTAS = [
  { rareza: 'comun', nombre: 'SOLOQ DE MADRUGADA', num: '+2', stat: 'Mecánica', ficha: { mecanica: 72 } },
  { rareza: 'rara', nombre: 'BOOTCAMP EN COREA', num: '+4', stat: 'Laneo', costo: '−1 Cabeza', ficha: { laneo: 70, cabeza: 60 } },
  { rareza: 'epica', nombre: 'PSICÓLOGO DEL EQUIPO', num: '+6', stat: 'Cabeza', costo: '−2 Hype', ficha: { cabeza: 67, hype: 32 } },
];

export function mano() {
  const ficha = crearFicha();
  const placas = CARTAS.map((c, i) =>
    el('button', { class: 'placa', type: 'button', 'data-rareza': c.rareza, 'data-estado': 'reposo' }, [
      el('span', { class: 'placa-marco' }, [
        el('span', { class: 'placa-cara' }, [
          tecla(i + 1, 'tecla-s'),
          el('span', { class: 'placa-num' }, c.num),
          el('span', { class: 'placa-stat' }, c.stat),
          c.costo ? el('span', { class: 'placa-costo' }, c.costo) : null,
          el('span', { class: 'placa-nombre' }, c.nombre),
        ]),
      ]),
    ]),
  );
  const otra = el('button', { class: 'boton', type: 'button', 'data-accion': 'otra' }, [ICONOS.mano(), 'OTRA MANO']);
  const nodo = el('main', { class: 'pantalla p-mano' }, [ficha, el('div', { class: 'mano' }, placas), otra]);
  let elegida = 0;
  function entrar() {
    // boca arriba, de una: entran juntas en <= 300 ms
    placas.forEach((p, i) => anim(p, [{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'none' }], { delay: i * 30, dur: 240 }));
  }
  function elegir(n) {
    if (elegida || !CARTAS[n - 1]) return false;
    elegida = n;
    const c = CARTAS[n - 1];
    otra.disabled = true;
    placas.forEach((p, i) => {
      p.disabled = true;
      if (i !== n - 1) {
        p.dataset.estado = 'apagado';
        anim(p, [{ opacity: 1, filter: 'saturate(1)' }, { opacity: 0.35, filter: 'saturate(0)' }], { dur: 150, easing: 'linear' });
      }
    });
    // la carta va a la ficha (0-450) y el numero rueda alli (450-1050)
    const p = placas[n - 1];
    p.dataset.estado = 'elegido';
    const destino = ficha.querySelector(`.celda[data-stat="${Object.keys(c.ficha)[0]}"]`).getBoundingClientRect();
    const r = p.getBoundingClientRect();
    const dx = destino.left + destino.width / 2 - (r.left + r.width / 2);
    const dy = destino.top + destino.height / 2 - (r.top + r.height / 2);
    if (reducido()) p.style.visibility = 'hidden';
    anim(p, [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0 }], { dur: 450, easing: 'cubic-bezier(0.55, 0, 0.2, 1)' });
    for (const [k, v] of Object.entries(c.ficha)) rodar(ficha, k, v, { delay: 450, dur: 600 });
    return true;
  }
  placas.forEach((p, i) => p.addEventListener('click', () => elegir(i + 1)));
  return { nodo, entrar, elegir, pendiente: () => !elegida, otra };
}
