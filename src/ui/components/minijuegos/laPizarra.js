import { unaSolaVez, dificultadDe, varaEfectivaDe } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, TOPE_ERRORES, PARES, FASES } from '../../arcade/pizarra.js';
import { armarDraft } from '../../arcade/pizarraDraft.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon } from '../../arcade/sprites.js';
import { cargarImagen, urlIcono } from '../../fx/arte.js';
import { ding, golpe as sonidoGolpe, derrota, tick } from '../../sonido.js';

// La pizarra del rival (rehecha en M4, ola H entrega 2). Antes eran doce cartas con texto. Ahora es un memotest de draft en
// tres fases: el analista te muestra el plan del rival (los picks, con su línea o con su counter, y los baneos) unos segundos,
// se tapa y armás los pares. Las fases suman pares, acortan la vista y, en la última, la pizarra se mezcla a la vista. La
// lógica vive en `ui/arcade/pizarra.js` (pura: la corre `dev/arcade-humano.js`); el contenido, en `pizarraDraft.js`.
//
// Contrato de T6: `montar(container, state, onDone, rngUi, datos)` → `onDone(0..1, { tipo: 'errores', errores })`. Regla de
// ERRORES (G1): `1 − errores / TOPE_ERRORES`; los pares que se te escapan cuando se acaba el tiempo cuentan como errores.
// Acá el campeón es el tema, así que van sus íconos (Data Dragon); sin red, las iniciales. `rngUi` se tira tres veces.
export { PARES, TOPE_ERRORES } from '../../arcade/pizarra.js';

const MUNDO = [160, 90];
const SEMILLA = 2 ** 32;
const AL_FINAL_MS = 900;
const CARTA = { w: 28, h: 27, g: 5 };
const COLUMNAS = { 4: 2, 6: 3, 8: 4 };
const ZONA_Y = [17, 76];
const COLOR_PAR = ['aliado', 'oro', 'bien', 'baron'];
const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const GIRO_POR_S = 7;
const VUELO_POR_S = 9;

function posicion(i, n) {
  const cols = COLUMNAS[n] ?? 4;
  const filas = Math.ceil(n / cols);
  const ancho = cols * CARTA.w + (cols - 1) * CARTA.g;
  const alto = filas * CARTA.h + (filas - 1) * CARTA.g;
  const x0 = (MUNDO[0] - ancho) / 2 + CARTA.w / 2;
  const y0 = ZONA_Y[0] + (ZONA_Y[1] - ZONA_Y[0] - alto) / 2 + CARTA.h / 2;
  return { x: x0 + (i % cols) * (CARTA.w + CARTA.g), y: y0 + Math.floor(i / cols) * (CARTA.h + CARTA.g) };
}

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const params = parametros({ stat: state.player.stats.macro, dificultad: dificultadDe(state, datos) });
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const draft = armarDraft(mulberry32(Math.floor(rngUi() * SEMILLA)));
  const e = crear(params, azarJuego);
  const vara = varaEfectivaDe(datos);
  let permitidos = TOPE_ERRORES;
  if (vara !== null) {
    permitidos = -1;
    for (let k = TOPE_ERRORES; k >= 0; k -= 1) if (1 - k / TOPE_ERRORES >= vara) { permitidos = k; break; }
  }
  const pend = [];
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--pizarra',
    mundo: MUNDO,
    etiqueta: 'La pizarra del rival: memorizá los picks y armá los pares',
    pie: 'Tocá las cartas o usá 1 a 8. Cada pick va con su línea o con su counter.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const imagenes = new Map();
  const visual = new WeakMap();
  let bucle = null;
  let t = 0;

  const imagen = (clave) => {
    if (!clave) return null;
    if (!imagenes.has(clave)) {
      const r = { img: null };
      imagenes.set(clave, r);
      cargarImagen(urlIcono(clave)).then((img) => { r.img = img; }).catch(() => {});
    }
    return imagenes.get(clave);
  };
  [...draft.fases.flat().flat(), ...draft.baneos].forEach((l) => imagen(l.clave));

  const contenido = (fase, c) => draft.fases[fase][c.par][c.lado];
  const colorPar = (par) => pal[COLOR_PAR[par % COLOR_PAR.length]];
  const texto = (s, x, y, { tam = 9, color = pal.tinta, al = 'center', peso = 700 } = {}) => {
    ctx.font = `${peso} ${lienzo.px(tam)}px ${pal.fuente}`;
    ctx.textAlign = al;
    ctx.fillStyle = tinte(color);
    ctx.fillText(s, x, y);
  };

  function dibujarCarta(c, v, fase, n, enVista) {
    const escalaX = Math.max(0.04, Math.abs(Math.cos(v.giro * Math.PI)));
    const cara = v.giro > 0.5;
    const w = CARTA.w * escalaX;
    const h = CARTA.h;
    const par = c.estado === 'par';
    const color = enVista || par ? colorPar(c.par) : c.estado === 'abierta' ? pal.oro : null;
    ctx.save();
    ctx.translate(v.x, v.y);
    if (v.salto) ctx.translate(0, -v.salto * 2.2);
    ctx.globalAlpha = par ? 0.55 : 1;
    ctx.shadowColor = tinte(color ?? pal.fondo, color ? 0.7 : 0.5);
    ctx.shadowBlur = lienzo.px(color ? 14 : 6);
    ctx.fillStyle = tinte(cara ? pal.elevado : mezcla(pal.hundido, pal.aliado, 0.1));
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 2.2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = tinte(color ?? mezcla(pal.elevado, pal.tinta, 0.2));
    ctx.lineWidth = color ? 1.1 : 0.6;
    ctx.stroke();
    if (cara && escalaX > 0.35) {
      ctx.scale(escalaX, 1);
      const info = contenido(fase, c);
      texto(info.rotulo, 0, -h / 2 + 4.6, { tam: 8, color: color ?? pal.tenue, peso: 800 });
      if (info.linea) {
        texto(info.linea, 0, 3.5, { tam: 24, color: color ?? pal.oro, peso: 800 });
      } else {
        campeon(ctx, 0, -1.2, 7.4, { borde: color ?? pal.mudo, retrato: { img: imagen(info.clave)?.img, iniciales: info.nombre.slice(0, 2).toUpperCase() }, pal, px: lienzo.px, brillo: 0.3 });
        texto(info.nombre, 0, h / 2 - 3.2, { tam: 11, color: pal.tinta });
      }
    } else if (!cara && escalaX > 0.35) {
      ctx.scale(escalaX, 1);
      ctx.strokeStyle = tinte(pal.aliado, 0.35);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(7, 0); ctx.lineTo(0, 7); ctx.lineTo(-7, 0); ctx.closePath();
      ctx.stroke();
      texto(String(v.n + 1), 0, 3.6, { tam: 16, color: pal.tenue, peso: 800 });
    }
    ctx.restore();
  }

  function escena(f, enVista, dt) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    const fondo = ctx.createRadialGradient(MUNDO[0] / 2, 40, 6, MUNDO[0] / 2, 45, 110);
    fondo.addColorStop(0, tinte(mezcla(pal.elevado, pal.aliado, 0.1)));
    fondo.addColorStop(1, tinte(pal.fondo));
    ctx.fillStyle = fondo;
    ctx.fillRect(-4, -4, MUNDO[0] + 8, MUNDO[1] + 8);
    // la pizarra del analista
    ctx.fillStyle = tinte(pal.hundido, 0.55);
    ctx.beginPath();
    ctx.roundRect(8, 13, MUNDO[0] - 16, 66, 3);
    ctx.fill();
    ctx.strokeStyle = tinte(pal.aliado, 0.25);
    ctx.lineWidth = 0.5;
    ctx.stroke();
    const n = f.cartas.length;
    f.cartas.forEach((c, i) => {
      let v = visual.get(c);
      const p = posicion(i, n);
      if (!v) { v = { x: p.x, y: p.y, giro: enVista ? 1 : 0, n: i, salto: 0 }; visual.set(c, v); }
      v.n = i;
      const k = reducido ? 1 : Math.min(1, dt * VUELO_POR_S);
      v.x += (p.x - v.x) * k; v.y += (p.y - v.y) * k;
      const meta = enVista || c.estado !== 'tapada' ? 1 : 0;
      const paso = reducido ? 1 : dt * GIRO_POR_S;
      v.giro += Math.max(-paso, Math.min(paso, meta - v.giro));
      v.salto = Math.max(0, v.salto - dt * 5);
    });
    f.cartas.forEach((c, i) => dibujarCarta(c, visual.get(c), e.iFase, n, enVista));
    // el analista y los baneos
    campeon(ctx, 17, 8, 4.4, { borde: pal.aviso, retrato: { img: null, iniciales: 'AN' }, pal, px: lienzo.px, brillo: 0.5 });
    texto(enVista ? 'EL ANALISTA: MIRÁ LA PIZARRA' : f.estado === 'entre' ? 'FASE CERRADA' : 'ARMÁ LOS PARES', 24, 9.6, { tam: 11, al: 'left' });
    texto('BANEOS', MUNDO[0] - 36, 5.6, { tam: 8, color: pal.tenue, al: 'right' });
    draft.baneos.forEach((b, k) => {
      const bx = MUNDO[0] - 32 + k * 9;
      campeon(ctx, bx, 7.4, 3.3, { borde: pal.rival, retrato: { img: imagen(b.clave)?.img, iniciales: b.nombre.slice(0, 2).toUpperCase() }, pal, px: lienzo.px, brillo: 0.2 });
      ctx.strokeStyle = tinte(pal.rival);
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(bx - 3.3, 10.5); ctx.lineTo(bx + 3.3, 4.3); ctx.stroke();
    });
    jugo.dibujar(ctx, lienzo);
    lienzo.empezar();
    hud(f, enVista);
    jugo.dibujarDestello(ctx, lienzo);
  }

  // Abajo: los errores (los que podés cometer, neutros; los que ya no, rojos), la fase y el reloj de la fase.
  function hud(f, enVista) {
    const y = MUNDO[1] - 6.5;
    for (let k = 0; k < TOPE_ERRORES; k += 1) {
      const hecho = k < e.errores;
      const bueno = k < permitidos;
      ctx.fillStyle = tinte(hecho ? (bueno ? pal.aviso : pal.rival) : pal.hundido, hecho ? 1 : 0.9);
      ctx.beginPath();
      ctx.arc(11 + k * 5.2, y, 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tinte(bueno ? pal.mudo : pal.rival, 0.8);
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
    texto(permitidos >= 0 ? `errores ${e.errores} · podés errar ${permitidos}` : `errores ${e.errores}`, 11, y + 6, { tam: 9, color: pal.tenue, al: 'left' });
    texto(`FASE ${e.iFase + 1} DE ${FASES} · ${e.pares} de ${PARES} pares`, MUNDO[0] / 2 + 8, y + 1, { tam: 9, color: pal.tinta });
    const total = enVista ? f.vistaS : f.respondeS;
    const queda = enVista ? 1 - f.t / f.vistaS : 1 - f.t / f.respondeS;
    const bx = MUNDO[0] - 46;
    ctx.fillStyle = tinte(pal.hundido, 0.9);
    ctx.fillRect(bx, y - 1.4, 38, 2.8);
    ctx.fillStyle = tinte(enVista ? pal.aviso : queda < 0.25 ? pal.rival : pal.aliado);
    ctx.fillRect(bx, y - 1.4, 38 * Math.max(0, Math.min(1, f.estado === 'entre' ? 0 : queda)), 2.8);
    texto(enVista ? 'MEMORIZÁ' : `${Math.max(0, Math.ceil(total * Math.max(0, queda)))} s`, bx + 19, y + 6, { tam: 9, color: pal.tenue });
  }

  function dibujar(dt) {
    t += dt;
    const f = e.fase;
    escena(f, f.estado === 'ver', dt);
  }

  // La demo: las cartas boca arriba, se tapan, y se da vuelta un par (las mismas cartas todo el tiempo, para que giren).
  const cartasDemo = [0, 1, 2, 3].map((i) => ({ par: i >> 1, lado: i % 2, estado: 'tapada' }));
  function demo(_ctx, u) {
    const vista = u < 0.55;
    cartasDemo.forEach((c, i) => { c.estado = vista || u < 0.75 ? 'tapada' : (i === 0 || i === 1 ? 'par' : 'tapada'); });
    const yaPar = !vista && u >= 0.75;
    escena({ cartas: cartasDemo, estado: yaPar ? 'juega' : 'ver', t: u, vistaS: 1, respondeS: 1 }, vista, 0.016);
  }

  const centro = (i) => posicion(i, e.fase.cartas.length);

  function procesarEventos() {
    for (const ev of e.eventos) {
      if (ev.tipo === 'voltea') {
        tick();
        const v = visual.get(e.fase.cartas[ev.i]);
        if (v) v.salto = 1;
      } else if (ev.tipo === 'par') {
        for (const i of [ev.a, ev.b]) {
          const p = centro(i);
          jugo.chispas(p.x, p.y, 24, colorPar(e.fase.cartas[i].par), 36, 0.7);
        }
        const a = centro(ev.a);
        jugo.texto(a.x, a.y - 10, 'PAR', pal.bien, 16);
        jugo.sacudir(1.2);
        ding();
      } else if (ev.tipo === 'error') {
        for (const i of [ev.a, ev.b]) {
          const p = centro(i);
          jugo.chispas(p.x, p.y, 12, pal.rival, 30, 0.5);
        }
        jugo.sacudir(3);
        jugo.parar(70);
        jugo.destellar(pal.rival, 0.25);
        const b = centro(ev.b);
        jugo.texto(b.x, b.y - 12, `ERROR ${e.errores}/${TOPE_ERRORES}`, pal.rival, 16);
        sonidoGolpe();
      } else if (ev.tipo === 'mezcla') {
        jugo.chispas(MUNDO[0] / 2, 45, 8, pal.aviso, 40, 0.4);
        jugo.texto(MUNDO[0] / 2, 12, 'SE MEZCLA', pal.aviso, 18);
        tick();
      } else if (ev.tipo === 'tapar') {
        jugo.destellar(pal.aliado, 0.3);
        jugo.texto(MUNDO[0] / 2, 46, '¡A ARMAR!', pal.oro, 24);
      } else if (ev.tipo === 'tiempo') {
        if (ev.faltan > 0) jugo.texto(MUNDO[0] / 2, 46, `SE ACABÓ EL TIEMPO · ${ev.faltan} ${ev.faltan === 1 ? 'error' : 'errores'}`, pal.rival, 18);
        if (ev.faltan > 0) { jugo.sacudir(3); derrota(); }
      } else if (ev.tipo === 'fase') {
        jugo.texto(MUNDO[0] / 2, 46, `FASE ${ev.i + 1}`, mezcla(pal.tinta, pal.aliado, 0.4), 28);
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    for (const ev of entradas.sacar()) {
      if (ev.tipo === 'tecla') {
        const i = TECLAS.indexOf(ev.k);
        if (i >= 0) pend.push(i);
      } else if (ev.tipo === 'toque') {
        const n = e.fase.cartas.length;
        for (let i = 0; i < n; i += 1) {
          const p = posicion(i, n);
          if (Math.abs(ev.x - p.x) <= CARTA.w / 2 && Math.abs(ev.y - p.y) <= CARTA.h / 2) { pend.push(i); break; }
        }
      }
    }
    avanzar(e, pend.length ? { voltear: pend.shift() } : null);
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

  caja.dataset.arcade = 'la_pizarra';
  presentar(lienzo, { linea: 'Memorizá la pizarra del rival y armá los pares: cada pick con su línea o su counter.', demo, reducido }).then(() => {
    entradas.sacar();
    t = 0;
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
