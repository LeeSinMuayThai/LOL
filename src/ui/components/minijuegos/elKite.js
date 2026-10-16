import { unaSolaVez, dificultadDe, varaEfectivaDe, PASOS_DE_CONTEO } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, TIEMPOS as TOTAL_TIEMPOS, ANCHO, ALTO, RADIO, RADIO_BRUISER, RANGO } from '../../arcade/kite.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon, telegrafo } from '../../arcade/sprites.js';
import { bruiser, anilloDeAtaque } from '../../arcade/spritesLinea.js';
import { BALANCE } from '../../../data/balance.js';
import { golpe as sonidoGolpe, flash as sonidoFlash, derrota, latido } from '../../sonido.js';

// El kite (rehecho en M1, ola H entrega 2, PLANUI §0.10 "El arcade"). Antes eran dos botones A y S contra un metrónomo. Ahora es
// el orbwalk: vista de arriba, un bruiser te viene encima, el anillo de tu ataque se llena y pegás con el anillo lleno y en
// rango (Espacio, un toque al bruiser) y te movés antes de que te alcance (WASD, flechas o un clic al piso). Un tiempo
// limpio es un ataque que entra sin que te agarren. Tres fases: el bruiser acelera, después tiene un dash telegrafiado,
// después un slow. La lógica vive en `ui/arcade/kite.js` (pura: la corre `dev/arcade-humano.js`).
//
// Contrato de siempre: `montar(container, state, onDone, rngUi, datos)` y `onDone(resultado 0..1, detalle)` una sola vez.
// Regla de CONTEO (G1): tiempos limpios / `g1.conteo.el_kite`. `rngUi` se tira dos veces: la semilla del juego y la del jugo.
export const TIEMPOS = PASOS_DE_CONTEO.el_kite;

const K = BALANCE.g1.arcade.el_kite;
const MUNDO = [ANCHO, ALTO];
const SEMILLA = 2 ** 32;
const NOMBRES = ['EL BRUISER ACELERA', 'EL DASH', 'EL SLOW'];
const TECLAS = [' ', 'f', 'w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'];
const MOVER = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
const AL_FINAL_MS = 900;
const GOLPE_VISUAL_S = 0.2;
const CLIC_AL_BRUISER = 9;

const necesarios = (vara, total) => { for (let k = 0; k <= total; k += 1) if (k / total >= vara) return k; return total + 1; };

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const vara = varaEfectivaDe(datos);
  const params = parametros({ stat: state.player.stats.mecanica, dificultad: dificultadDe(state, datos) });
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  let pedido = false;
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--kite',
    mundo: MUNDO,
    etiqueta: 'El kite: pegá con el anillo lleno y en rango, y movete antes de que el bruiser te alcance',
    botones: [{ texto: 'ATACAR', tecla: 'Espacio', alTocar: () => { pedido = true; } }],
    pie: 'Mové con WASD, las flechas o un clic al piso. Pegá con Espacio o tocando al bruiser: con el anillo lleno y en rango.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  let t = 0;
  let bucle = null;
  let golpeMio = 0;
  let agarrado = 0;
  let avisoMax = 1;

  function escena(d) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    const fondo = ctx.createRadialGradient(ANCHO / 2, ALTO / 2, 10, ANCHO / 2, ALTO / 2, ANCHO * 0.65);
    fondo.addColorStop(0, tinte(mezcla(pal.elevado, pal.fondo, 0.5)));
    fondo.addColorStop(1, tinte(pal.fondo));
    ctx.fillStyle = fondo;
    ctx.fillRect(-4, -4, ANCHO + 8, ALTO + 8);
    // el piso: una grilla de la Grieta y el borde de la arena
    ctx.strokeStyle = tinte(mezcla(pal.elevado, pal.tinta, 0.12), 0.45);
    ctx.lineWidth = 0.3;
    for (let x = 10; x < ANCHO; x += 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ALTO); ctx.stroke(); }
    for (let y = 10; y < ALTO; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ANCHO, y); ctx.stroke(); }
    ctx.strokeStyle = tinte(pal.mudo, 0.6);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(0.4, 0.4, ANCHO - 0.8, ALTO - 0.8);
    // el dash telegrafiado del bruiser
    if (d.aviso) {
      telegrafo(ctx, { tipo: 'linea', ox: d.bruiser.x, oy: d.bruiser.y, dx: d.aviso.dir.x, dy: d.aviso.dir.y, ancho: K.fases[1].dash.ancho, largo: K.fases[1].dash.distancia }, d.aviso.progreso, { pal, t });
    }
    // tu rango: el círculo de afuera, que se enciende cuando el bruiser está adentro y el anillo lleno
    const enRango = Math.hypot(d.bruiser.x - d.yo.x, d.bruiser.y - d.yo.y) <= RANGO;
    ctx.save();
    ctx.setLineDash([2, 2.2]);
    ctx.strokeStyle = tinte(enRango && d.anillo >= 1 ? pal.oro : pal.aliado, enRango && d.anillo >= 1 ? 0.95 : 0.35);
    ctx.lineWidth = enRango && d.anillo >= 1 ? 0.9 : 0.5;
    ctx.beginPath();
    ctx.arc(d.yo.x, d.yo.y, RANGO, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    bruiser(ctx, d.bruiser.x, d.bruiser.y, RADIO_BRUISER, d.bruiser.dx, d.bruiser.dy, pal, { t, aturdido: d.bruiser.aturdido > 0, aura: d.slow ? K.fases[2].slow.radio : 0, furia: d.furia });
    if (d.destino) {
      ctx.strokeStyle = tinte(pal.aliado, 0.6);
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(d.destino.x, d.destino.y, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    campeon(ctx, d.yo.x, d.yo.y, RADIO * 1.5, { borde: agarrado > 0 ? pal.rival : pal.oro, retrato: yo, pal, px: lienzo.px, brillo: 0.7 });
    anilloDeAtaque(ctx, d.yo.x, d.yo.y, RADIO * 1.5 + 2.2, d.anillo, pal, t);
    if (golpeMio > 0) {
      ctx.strokeStyle = tinte(pal.blanco, golpeMio / GOLPE_VISUAL_S);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(d.yo.x, d.yo.y);
      ctx.lineTo(d.bruiser.x, d.bruiser.y);
      ctx.stroke();
    }
    jugo.dibujar(ctx, lienzo);
    lienzo.empezar();
    hud(d);
    jugo.dibujarDestello(ctx, lienzo);
  }

  function hud(d) {
    ctx.textAlign = 'left';
    ctx.font = `800 ${lienzo.px(12)}px ${pal.display}`;
    ctx.fillStyle = tinte(pal.tinta);
    ctx.fillText(NOMBRES[d.fase], 6, lienzo.px(18));
    ctx.font = `600 ${lienzo.px(10)}px ${pal.fuente}`;
    ctx.fillStyle = tinte(pal.tenue);
    const falta = vara === null ? '' : ` · necesitás ${Math.min(TOTAL_TIEMPOS, necesarios(vara, TOTAL_TIEMPOS))}`;
    ctx.fillText(`tiempos limpios ${d.limpios} de ${TOTAL_TIEMPOS}${falta}`, 6, lienzo.px(32));
    for (let k = 0; k < TOTAL_TIEMPOS; k += 1) {
      const r = e.tiempos[k];
      const x = MUNDO[0] - 7 - (TOTAL_TIEMPOS - 1 - k) * 6;
      ctx.fillStyle = tinte(r ? (r.limpio ? pal.bien : pal.rival) : k === e.tiempos.length ? pal.oro : pal.mudo, r ? 0.95 : 0.5);
      ctx.beginPath();
      ctx.arc(x, 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = tinte(d.anillo >= 1 ? pal.oro : pal.tenue);
    ctx.fillText(d.anillo >= 1 ? 'ANILLO LLENO' : 'ANILLO CARGANDO', MUNDO[0] - 6, MUNDO[1] - 5);
  }

  function datosDeEscena() {
    const dash = e.dash;
    return {
      yo: e.yo, bruiser: e.bruiser, anillo: e.anillo, destino: e.destino, slow: e.lento || (K.fases[e.i].slow ? true : false), fase: e.i,
      limpios: e.tiempos.filter((x) => x.limpio).length,
      aviso: dash && dash.aviso > 0 && dash.dir ? { dir: dash.dir, progreso: 1 - dash.aviso / avisoMax } : null,
      furia: Math.min(1, e.tCiclo / K.fases[e.i].rampaS)
    };
  }

  // La demo: el bruiser viene, el anillo se llena, el tiro entra y salís corriendo.
  function demo(_c, u) {
    t = u * 2;
    const bx = 120 - u * 52;
    const yoDemo = { x: u > 0.8 ? 40 - (u - 0.8) * 60 : 40, y: ALTO / 2 };
    escena({
      yo: yoDemo, bruiser: { x: bx, y: ALTO / 2, dx: -1, dy: 0, aturdido: 0 }, anillo: Math.min(1, u * 1.4), destino: null, slow: false, fase: 0,
      limpios: u > 0.8 ? 1 : 0, aviso: null, furia: u
    });
  }

  function procesarEventos() {
    for (const ev of e.eventos) {
      const b = e.bruiser;
      if (ev.tipo === 'golpe') {
        golpeMio = GOLPE_VISUAL_S;
        jugo.parar(60);
        jugo.sacudir(2.4);
        jugo.destellar(pal.oro, 0.22);
        jugo.chispas(ev.x, ev.y, 22, pal.oro, 50, 0.6);
        jugo.texto(ev.x, ev.y - 10, 'LIMPIO', pal.oro, 16);
        sonidoFlash();
      } else if (ev.tipo === 'agarrado') {
        agarrado = 0.35;
        jugo.sacudir(3.4);
        jugo.destellar(pal.rival, 0.4);
        jugo.chispas(ev.x, ev.y, 20, pal.rival, 55, 0.6);
        jugo.texto(ev.x, ev.y - 10, 'TE AGARRÓ', pal.rival, 18);
        sonidoGolpe();
        derrota();
      } else if (ev.tipo === 'temprano') {
        jugo.texto(e.yo.x, e.yo.y - 9, 'ANILLO VACÍO', pal.rival, 11);
      } else if (ev.tipo === 'aviso') {
        avisoMax = Math.max(0.01, e.dash.aviso);
        latido(1);
        jugo.texto(b.x, b.y - 10, '¡DASH!', pal.rival, 18);
      } else if (ev.tipo === 'dash') {
        jugo.chispas(b.x, b.y, 12, pal.rival, 40, 0.3);
      } else if (ev.tipo === 'fase') {
        jugo.texto(MUNDO[0] / 2, MUNDO[1] / 2 - 8, NOMBRES[ev.i], mezcla(pal.tinta, pal.oro, 0.4), 24);
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    let ataque = pedido;
    let ir = null;
    pedido = false;
    for (const ev of entradas.sacar()) {
      if (ev.tipo === 'tecla' && (ev.k === ' ' || ev.k === 'f')) ataque = true;
      else if (ev.tipo === 'toque') {
        if (Math.hypot(ev.x - e.bruiser.x, ev.y - e.bruiser.y) <= CLIC_AL_BRUISER) ataque = true;
        else ir = { x: ev.x, y: ev.y };
      }
    }
    let mx = 0;
    let my = 0;
    for (const k of entradas.abajo) if (MOVER[k]) { mx += MOVER[k][0]; my += MOVER[k][1]; }
    avanzar(e, { mover: mx || my ? { x: mx, y: my } : null, ir, ataque });
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
    golpeMio = Math.max(0, golpeMio - dt);
    agarrado = Math.max(0, agarrado - dt);
    escena(datosDeEscena());
  }

  caja.dataset.arcade = 'el_kite';
  presentar(lienzo, { linea: 'Pegá con el anillo lleno y movete antes de que te alcance. Ocho tiempos limpios, los que puedas.', demo, reducido }).then(() => {
    t = 0;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
