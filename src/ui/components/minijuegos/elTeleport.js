import { unaSolaVez, dificultadDe, varaEfectivaDe } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, ventajaVisible, HACIA_RIVAL, FASES, CANAL_S, SEGUNDO_FUERA } from '../../arcade/teleport.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon, minion } from '../../arcade/sprites.js';
import { golpe as sonidoGolpe, flash as sonidoFlash, derrota, tick } from '../../sonido.js';

// El teleport (fase 9R4c; rehecho en la ola H, M2). Antes era una barrita con un cursor. Ahora es el minimapa: tres líneas, el
// río, wards y minions, y una pelea que se arma (pings, barras de vida, los campeones que van llegando). Elegís dónde caer
// (un sitio del lado de los tuyos, no adentro del equipo rival) y cuándo: el TP canaliza unos segundos y se ve, así que hay que
// tirarlo ANTES de que la pelea arranque. Tres fases: una pelea clara, pings que son cebo y dos peleas a la vez (se gana una).
// La lógica vive en `ui/arcade/teleport.js` (pura: la corre `dev/arcade-humano.js`).
//
// Contrato de siempre: `montar(container, state, onDone, rngUi, datos)` y `onDone(resultado 0..1, detalle)` una sola vez.
// Regla de DISTANCIA (G1): el anillo dorado de cada pelea mide `radioDeLaZona(vara)` y pasa si en las tres fases la distancia
// (lugar + momento) cae adentro; el resultado es el peor de las tres. `rngUi` se tira dos veces: la semilla del juego y la del jugo.
export { MARGEN_DISTANCIA, ANCHO_ZONA } from '../../arcade/teleport.js';

const MUNDO = [160, 100];
const OX = 58; // el minimapa ocupa 100 × 100 desde acá; a la izquierda, el panel
const SEMILLA = 2 ** 32;
const AL_FINAL_MS = 900;
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ' ', 'enter'];
const LEJOS_LLEGADA = 34;
const ALCANCE_CLIC = 4.5;
const BASE_ALIADA = { x: 10, y: 90 };
const TEXTO = {
  temprano: ['TEMPRANO', 'te vieron el TP'],
  tarde: ['TARDE', 'la pelea ya terminó'],
  rival: ['ZONA RIVAL', 'caíste adentro de ellos'],
  cebo: ['ERA UN CEBO', 'ahí no había pelea'],
  perdida: ['PELEA PERDIDA', 'caíste con los que pierden']
};
const FRASE_FASE = ['Una pelea clara.', 'Hay pings que son cebo.', 'Dos peleas: la que se gana.'];

const mp = (x) => OX + x;
const coma = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const UR = HACIA_RIVAL;
const UA = { x: -UR.x, y: -UR.y };
const PERP = { x: -UR.y, y: UR.x };

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const params = parametros({ stat: state.player.stats.macro, vara: varaEfectivaDe(datos), dificultad: dificultadDe(state, datos) });
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--teleport',
    mundo: MUNDO,
    etiqueta: 'El minimapa: elegí dónde caer con el teleport antes de que arranque la pelea',
    pie: 'Tocá un ward o un minion (o apretá su número) para tirar el TP. Tarda en caer: hay que tirarlo antes de que arranque.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  const avisos = [];
  let t = 0;
  let bucle = null;
  let ultimoSegundo = 0;

  const sitioCerca = (p) => {
    let mejor = null;
    for (const s of e.fase.sitios) {
      const d = Math.hypot(mp(s.x) - p.x, s.y - p.y);
      if (d <= ALCANCE_CLIC && (!mejor || d < mejor.d)) mejor = { d, n: s.n };
    }
    return mejor?.n ?? null;
  };

  function terreno() {
    const g = ctx.createLinearGradient(OX, 100, OX + 100, 0);
    g.addColorStop(0, tinte(mezcla(pal.hundido, pal.aliado, 0.12)));
    g.addColorStop(1, tinte(mezcla(pal.hundido, pal.rival, 0.12)));
    ctx.fillStyle = g;
    ctx.fillRect(OX, 0, 100, 100);
    // el río
    ctx.strokeStyle = tinte(pal.rio, 0.28);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(mp(4), 4);
    ctx.lineTo(mp(96), 96);
    ctx.stroke();
    // las tres líneas
    ctx.strokeStyle = tinte(mezcla(pal.elevado, pal.tinta, 0.22), 0.9);
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    for (const pts of [[[6, 94], [6, 6], [94, 6]], [[6, 94], [94, 6]], [[6, 94], [94, 94], [94, 6]]]) {
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(mp(x), y) : ctx.moveTo(mp(x), y)));
      ctx.stroke();
    }
    // las bases
    for (const [x, y, c] of [[BASE_ALIADA.x, BASE_ALIADA.y, pal.aliado], [90, 10, pal.rival]]) {
      ctx.fillStyle = tinte(c, 0.35);
      ctx.beginPath();
      ctx.arc(mp(x), y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tinte(c, 0.9);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.strokeStyle = tinte(pal.mudo, 0.6);
    ctx.lineWidth = 0.6;
    ctx.strokeRect(OX, 0, 100, 100);
  }

  function icono(s, elegido, hover) {
    const x = mp(s.x);
    if (s.tipo === 'ward') {
      ctx.fillStyle = tinte(pal.fondo, 0.85);
      ctx.beginPath();
      ctx.arc(x, s.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tinte(elegido || hover ? pal.oro : pal.bien, 0.95);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.fillStyle = tinte(elegido || hover ? pal.oro : pal.bien);
      ctx.beginPath();
      ctx.ellipse(x, s.y, 1.5, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      minion(ctx, x, s.y + 0.6, 3.4, elegido || hover ? pal.oro : pal.aliado, t, pal);
    }
    ctx.font = `800 ${lienzo.px(8)}px ${pal.fuente}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = tinte(hover || elegido ? pal.oro : pal.tinta, 0.95);
    ctx.fillText(String(s.n + 1), x, s.y - 3.6);
  }

  // los tres campeones de un lado (lado = UA los tuyos, UR los rivales) en el instante f.t: llegan desde lejos hasta la pelea
  function equipo(l, f, u) {
    return [0, 1, 2].map((k) => {
      const fin = {
        x: l.centro.x + u.x * (1.5 + k * 0.9) + PERP.x * (k - 1) * 1.7,
        y: l.centro.y + u.y * (1.5 + k * 0.9) + PERP.y * (k - 1) * 1.7
      };
      const avance = Math.min(1, f.t / (l.tIni * (0.82 + 0.09 * k)));
      const resta = LEJOS_LLEGADA * (1 - (1 - (1 - avance) ** 2));
      return { x: fin.x + u.x * resta, y: fin.y + u.y * resta, llego: avance >= 1 };
    });
  }

  function pelea(l, f) {
    // el ping: dos anillos que se abren, parejos para la pelea y para el cebo
    for (let k = 0; k < 2; k += 1) {
      const u = ((f.t * 0.7 + k * 0.5) % 1);
      ctx.strokeStyle = tinte(pal.aviso, (1 - u) * 0.8);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(mp(l.centro.x), l.centro.y, 2 + u * 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    // la zona rival (medio círculo del lado de ellos) y el anillo de tu zona
    const a0 = Math.atan2(UR.y, UR.x);
    ctx.fillStyle = tinte(pal.rival, 0.1);
    ctx.strokeStyle = tinte(pal.rival, 0.5);
    ctx.lineWidth = 0.4;
    ctx.setLineDash([1.4, 1.2]);
    ctx.beginPath();
    ctx.moveTo(mp(l.centro.x), l.centro.y);
    ctx.arc(mp(l.centro.x), l.centro.y, 11, a0 - Math.PI / 2, a0 + Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = tinte(pal.oro, 0.95);
    ctx.fillStyle = tinte(pal.oro, 0.12);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(mp(l.centro.x), l.centro.y, params.radio, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = tinte(pal.blanco, 0.9);
    ctx.fillRect(mp(l.centro.x) - 0.3, l.centro.y - 0.3, 0.6, 0.6);
    if (!l.real) return;
    // los campeones que van llegando, los dos lados, y las barras de la pelea
    const vv = ventajaVisible(l, f.t);
    const dentro = Math.max(0, Math.min(1, (f.t - l.tIni) / params.ventanaS));
    const ini = { a: 0.5 + 0.5 * vv, r: 0.5 - 0.5 * vv };
    const fin = { a: l.gana ? 0.85 : 0.08, r: l.gana ? 0.08 : 0.85 };
    const hp = { a: ini.a + (fin.a - ini.a) * dentro, r: ini.r + (fin.r - ini.r) * dentro };
    for (const [u, borde, vida] of [[UA, pal.aliado, hp.a], [UR, pal.rival, hp.r]]) {
      equipo(l, f, u).forEach((p, k) => {
        const sacude = p.llego && f.t < l.tFin ? Math.sin(f.t * 22 + k * 2 + u.x) * 0.7 : 0;
        ctx.globalAlpha = f.t > l.tFin && vida < 0.2 ? 0.3 : 1;
        campeon(ctx, mp(p.x) + sacude, p.y, 2.6, { borde, pal, px: lienzo.px, brillo: 0.5 });
        ctx.globalAlpha = 1;
      });
    }
    const bx = mp(l.centro.x) - 7;
    const by = l.centro.y - 9;
    for (const [dy, vida, c] of [[0, hp.a, pal.aliado], [1.9, hp.r, pal.rival]]) {
      ctx.fillStyle = tinte(pal.fondo, 0.85);
      ctx.fillRect(bx - 0.4, by + dy - 0.4, 14.8, 1.6);
      ctx.fillStyle = tinte(c);
      ctx.fillRect(bx, by + dy, 14 * Math.max(0, Math.min(1, vida)), 0.8);
    }
  }

  function panel(f) {
    ctx.textAlign = 'left';
    ctx.font = `800 ${lienzo.px(11)}px ${pal.display}`;
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText(`FASE ${f.i + 1} DE ${FASES}`, 4, 9);
    ctx.font = `600 ${lienzo.px(9.5)}px ${pal.fuente}`;
    const lineas = [
      FRASE_FASE[f.i],
      `El TP tarda ${coma(CANAL_S)} s en caer.`,
      'Caé en medio de la pelea,',
      'del lado de los tuyos.',
      'Cada segundo lejos del mejor',
      `momento suma ${coma(SEGUNDO_FUERA)} a la distancia.`
    ];
    lineas.forEach((txt, k) => { ctx.fillStyle = tinte(k === 0 ? pal.tinta : pal.tenue); ctx.fillText(txt, 4, 19 + k * 5.4); });
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText(`la zona: ${coma(params.radio)} o menos`, 4, 54);
    // el canal
    ctx.fillStyle = tinte(pal.hundido, 0.9);
    ctx.fillRect(4, 62, 46, 4);
    if (f.canal) {
      const u = Math.min(1, (f.t - f.canal.desde) / CANAL_S);
      ctx.fillStyle = tinte(pal.aliado);
      ctx.fillRect(4, 62, 46 * u, 4);
      ctx.fillStyle = tinte(pal.tinta);
      ctx.fillText('CANALIZANDO…', 4, 60.5);
    } else {
      ctx.fillStyle = tinte(pal.tenue);
      ctx.fillText('TP listo', 4, 60.5);
    }
    // las fichas de las fases
    for (let k = 0; k < FASES; k += 1) {
      const r = e.fases[k];
      ctx.fillStyle = tinte(r ? (r.r >= params.vara ? pal.bien : pal.rival) : k === f.i ? pal.oro : pal.mudo, r ? 0.9 : 0.55);
      ctx.beginPath();
      ctx.arc(8 + k * 8, 76, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = tinte(pal.tenue);
    ctx.fillText(`las 3 a ${coma(params.radio)} o menos`, 4, 84);
    campeon(ctx, 12, 92, 4.6, { borde: pal.oro, retrato: yo, pal, px: lienzo.px, brillo: 0.7 });
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText('VOS', 20, 93.5);
  }

  function escena(f, hover) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    ctx.fillStyle = tinte(pal.fondo);
    ctx.fillRect(-4, -4, MUNDO[0] + 8, MUNDO[1] + 8);
    terreno();
    for (const l of f.lugares) pelea(l, f);
    for (const s of f.sitios) icono(s, f.canal?.sitio === s.n, hover === s.n);
    if (f.canal) {
      const s = f.sitios[f.canal.sitio];
      const u = Math.min(1, (f.t - f.canal.desde) / CANAL_S);
      ctx.strokeStyle = tinte(pal.aliado, 0.8);
      ctx.lineWidth = 0.6;
      ctx.setLineDash([2, 1.6]);
      ctx.lineDashOffset = -f.t * 8;
      ctx.beginPath();
      ctx.moveTo(mp(BASE_ALIADA.x), BASE_ALIADA.y);
      ctx.lineTo(mp(BASE_ALIADA.x) + (mp(s.x) - mp(BASE_ALIADA.x)) * u, BASE_ALIADA.y + (s.y - BASE_ALIADA.y) * u);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = tinte(pal.oro, 0.95);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(mp(s.x), s.y, 5.4 - 3.2 * u, 0, Math.PI * 2 * Math.max(0.05, u));
      ctx.stroke();
    }
    for (const a of avisos) {
      ctx.globalAlpha = Math.min(1, a.vida * 2);
      ctx.textAlign = 'center';
      ctx.font = `800 ${lienzo.px(a.tam)}px ${pal.display}`;
      ctx.lineWidth = lienzo.px(4);
      ctx.strokeStyle = tinte(pal.fondo, 0.9);
      ctx.strokeText(a.txt, mp(50), a.y);
      ctx.fillStyle = tinte(a.color);
      ctx.fillText(a.txt, mp(50), a.y);
      ctx.globalAlpha = 1;
    }
    jugo.dibujar(ctx, lienzo);
    lienzo.empezar();
    panel(f);
    jugo.dibujarDestello(ctx, lienzo);
  }

  // La demo: la pelea de la primera fase armándose (pings y campeones que llegan).
  function demo(_ctx, u) {
    const f = crear(params, mulberry32(11)).fase;
    f.t = Math.max(0, u) * 3.2;
    t = f.t;
    escena(f, null);
  }

  function aviso(txt, color, tam, y = 46) {
    avisos.push({ txt, color, tam, y, vida: 1.6 });
  }

  function procesarEventos() {
    const f = e.fase;
    for (const ev of e.eventos) {
      if (ev.tipo === 'tp') {
        tick();
        const s = f.sitios[ev.sitio];
        jugo.chispas(mp(BASE_ALIADA.x), BASE_ALIADA.y, 12, pal.aliado, 28);
        jugo.destellar(pal.aliado, 0.12);
        jugo.texto(mp(s.x), s.y - 7, 'TP…', pal.aliado, 11);
      } else if (ev.tipo === 'pelea') {
        const l = f.lugares[ev.lugar];
        jugo.sacudir(1.6);
        jugo.chispas(mp(l.centro.x), l.centro.y, 18, pal.aviso, 36);
        sonidoGolpe();
      } else if (ev.tipo === 'termina') {
        const l = f.lugares[ev.lugar];
        jugo.chispas(mp(l.centro.x), l.centro.y, 16, ev.gana ? pal.aliado : pal.rival, 30, 0.7);
        jugo.texto(mp(l.centro.x), l.centro.y - 13, ev.gana ? 'GANAN LOS TUYOS' : 'GANAN ELLOS', ev.gana ? pal.aliado : pal.rival, 11);
      } else if (ev.tipo === 'aterriza') {
        const s = f.sitios[f.canal.sitio];
        const pasa = ev.r >= params.vara;
        const dentro = ev.r > 0;
        jugo.parar(dentro ? 90 : 40);
        jugo.camaraLenta(0.35, dentro ? 380 : 200);
        jugo.sacudir(dentro ? 3.4 : 2);
        jugo.chispas(mp(s.x), s.y, dentro ? 44 : 14, pasa ? pal.oro : pal.rival, 50, 0.8);
        jugo.destellar(pasa ? pal.oro : pal.rival, 0.35);
        sonidoFlash();
        if (pasa) {
          aviso('¡CAYÓ JUSTO!', pal.oro, 20);
          jugo.texto(mp(s.x), s.y - 8, `a ${coma(ev.dTotal)} del centro`, pal.tinta, 10);
        } else if (dentro) {
          aviso('POR FUERA', pal.rival, 20);
          jugo.texto(mp(s.x), s.y - 8, `a ${coma(ev.dTotal)} y se pedía ${coma(params.radio)}`, pal.tinta, 9);
          derrota();
        } else {
          const [t1, t2] = TEXTO[ev.tipo] ?? ['NADA', ''];
          aviso(t1, pal.rival, 20);
          jugo.texto(mp(s.x), s.y - 8, t2, pal.tinta, 10);
          derrota();
        }
      } else if (ev.tipo === 'sinTp') {
        aviso('SE PASÓ LA PELEA', pal.rival, 18);
        jugo.destellar(pal.rival, 0.25);
        derrota();
      } else if (ev.tipo === 'fase') {
        avisos.length = 0;
        aviso(`FASE ${ev.i + 1}`, pal.oro, 22);
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    let tp = null;
    for (const ev of entradas.sacar()) {
      if (ev.tipo === 'toque') {
        const n = sitioCerca(ev);
        if (n !== null) tp = n;
      } else if (/^[1-9]$/.test(ev.k)) {
        tp = Number(ev.k) - 1;
      } else if (ev.k === ' ' || ev.k === 'enter') {
        const n = entradas.puntero.visto ? sitioCerca({ x: mp(0) - OX + entradas.puntero.x, y: entradas.puntero.y }) : null;
        if (n !== null) tp = n;
      }
    }
    avanzar(e, tp !== null ? { tp } : null);
    procesarEventos();
    if (e.terminado && bucle) {
      const fin = bucle;
      bucle = null;
      setTimeout(() => {
        fin.parar();
        entradas.destruir();
        lienzo.destruir();
        terminar(resultadoDe(e), detalleDe(e));
      }, AL_FINAL_MS);
    }
  }

  function dibujar(dt) {
    t += dt;
    for (const a of avisos) { a.vida -= dt; a.y -= dt * 2; }
    for (let k = avisos.length - 1; k >= 0; k -= 1) if (avisos[k].vida <= 0) avisos.splice(k, 1);
    const f = e.fase;
    const seg = Math.floor(f.t);
    if (!f.fin && f.canal && seg !== ultimoSegundo) { ultimoSegundo = seg; tick(); }
    escena(f, entradas.puntero.visto ? sitioCerca(entradas.puntero) : null);
  }

  caja.dataset.arcade = 'el_teleport';
  presentar(lienzo, { linea: 'Se arma una pelea: tirá el TP antes de que arranque, del lado de los tuyos.', demo, reducido }).then(() => {
    t = 0;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
