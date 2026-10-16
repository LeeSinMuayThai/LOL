import { unaSolaVez, dificultadDe } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, faseDeT, BLANCOS as TOTAL } from '../../arcade/prueba.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon } from '../../arcade/sprites.js';
import { BALANCE } from '../../../data/balance.js';
import { golpe as sonidoGolpe, tick } from '../../sonido.js';

// La Prueba (rehecha en M3, PLANUI §0.10 "El arcade"; la prueba de ingreso, fase 4). Antes: cinco botones que aparecían y
// había que clickear. Ahora: el practice tool con el coach del club mirando. Dummies que se mueven en patrones y un skillshot
// que viaja hasta donde apuntaste (y ahí se apaga): hay que pegar la mayor cantidad en ~20 s. Fases: quietos; en movimiento (hay
// que adelantar el tiro); con amagues (dan la vuelta cuando temblaron). Velocidad y precisión, no esperar el hueco entre minions.
// La lógica vive en `ui/arcade/prueba.js`. Contrato de siempre: `montar(container, state, onDone, rngUi, datos)` y
// `onDone(resultado 0..1)` una sola vez. Regla de CONTEO (la de siempre): resultado = golpes / BLANCOS.
export const BLANCOS = TOTAL;

const A = BALANCE.g1.arcade.la_prueba;
const MUNDO = A.mundo;
const SEMILLA = 2 ** 32;
const AL_FINAL_MS = 900;
const TECLAS = [' ', 'q', 'enter'];
const NOMBRE_FASE = ['QUIETOS', 'EN MOVIMIENTO', 'CON AMAGUES'];
const COACH = { x: 148, y: 82 };
const DICE_EL_COACH = ['Tranquilo, están quietos.', 'Adelantá el tiro: se mueven.', 'Ojo: amagan. Esperá que den la vuelta.'];
const TIRO_VISIBLE = 0.12;

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const params = parametros({ stat: state.player.stats.mecanica, dificultad: dificultadDe(state, datos) });
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  let pedido = false;
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--prueba',
    mundo: MUNDO,
    etiqueta: 'La prueba: pegale a los dummies con el skillshot',
    botones: [{ texto: 'TIRAR', tecla: 'Espacio', alTocar: () => { pedido = true; } }],
    pie: 'Apuntá con el mouse y tirá con clic, Espacio o Q. El tiro llega hasta donde apuntaste.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  let t = 0;
  let bucle = null;
  let racha = 0;
  let frase = { texto: DICE_EL_COACH[0], vida: 3 };
  const rastros = [];

  function dummy(x, y, { tiembla = false, vida = 1 } = {}) {
    const sx = tiembla ? Math.sin(t * 90) * 0.9 : 0;
    ctx.save();
    ctx.globalAlpha = Math.min(1, vida * 4);
    ctx.fillStyle = tinte(mezcla(pal.hundido, pal.mudo, 0.5));
    ctx.fillRect(x + sx - 1, y + 2, 2, 7);
    ctx.fillRect(x + sx - 3.4, y + 8, 6.8, 1.4);
    for (let k = 0; k < 3; k += 1) {
      ctx.fillStyle = tinte(k % 2 === 0 ? pal.rival : pal.tinta, 0.95);
      ctx.beginPath();
      ctx.arc(x + sx, y - 1, A.radioDummy * (1 - k * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (tiembla) {
      ctx.fillStyle = tinte(pal.aviso);
      ctx.font = `800 ${lienzo.px(14)}px ${pal.display}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', x, y - A.radioDummy - 2);
    }
  }

  // `v`: { dummies: [{ x, y, tiembla, vida }], tiros: [{ x, y }], t, golpes, fase }
  function escena(v, mira) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    const fondo = ctx.createLinearGradient(0, 0, 0, MUNDO[1]);
    fondo.addColorStop(0, tinte(mezcla(pal.elevado, pal.rio, 0.08)));
    fondo.addColorStop(1, tinte(pal.fondo));
    ctx.fillStyle = fondo;
    ctx.fillRect(-4, -4, MUNDO[0] + 8, MUNDO[1] + 8);
    // el piso del practice tool: grilla y la línea de tiro
    ctx.strokeStyle = tinte(pal.tinta, 0.06);
    ctx.lineWidth = 0.3;
    for (let x = 20; x < MUNDO[0]; x += 14) { ctx.beginPath(); ctx.moveTo(x, 22); ctx.lineTo(x, MUNDO[1] - 4); ctx.stroke(); }
    for (let y = 26; y < MUNDO[1]; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MUNDO[0], y); ctx.stroke(); }
    ctx.setLineDash([1.5, 2]);
    ctx.strokeStyle = tinte(pal.oro, 0.25);
    ctx.strokeRect(A.campo.x[0] - 5, A.campo.y[0] - 6, A.campo.x[1] - A.campo.x[0] + 10, A.campo.y[1] - A.campo.y[0] + 12);
    ctx.setLineDash([]);
    // la mira: del campeón al cursor
    if (mira) {
      ctx.strokeStyle = tinte(pal.oro, 0.35);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(A.yo.x, A.yo.y);
      ctx.lineTo(mira.x, mira.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mira.x, mira.y, 2.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const d of v.dummies) dummy(d.x, d.y, d);
    for (const r of rastros) {
      ctx.strokeStyle = tinte(pal.oro, Math.max(0, r.vida / TIRO_VISIBLE) * 0.8);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.lineTo(r.x2, r.y2);
      ctx.stroke();
    }
    for (const s of v.tiros) {
      ctx.fillStyle = tinte(pal.blanco);
      ctx.shadowColor = tinte(pal.oro, 0.9);
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, A.radioTiro * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    campeon(ctx, A.yo.x, A.yo.y, 5.5, { borde: pal.oro, retrato: yo, pal, px: lienzo.px, brillo: 0.7 });
    // el coach del club, mirando desde un costado
    campeon(ctx, COACH.x, COACH.y, 4.2, { borde: pal.aliado, pal, px: lienzo.px, brillo: 0.3, retrato: { iniciales: 'DT' } });
    ctx.font = `700 ${lienzo.px(9.5)}px ${pal.fuente}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = tinte(pal.tenue);
    if (frase.vida > 0) ctx.fillText(`COACH: ${frase.texto}`, COACH.x - 7, COACH.y + 1.5);
    jugo.dibujar(ctx, lienzo);
    lienzo.empezar();
    // el HUD: el tiempo, los golpes que llevás y los que faltan
    const resta = Math.max(0, A.tiempoS - v.t);
    ctx.textAlign = 'left';
    ctx.font = `700 ${lienzo.px(10.5)}px ${pal.fuente}`;
    ctx.fillStyle = tinte(pal.tinta);
    ctx.fillText(`${NOMBRE_FASE[v.fase]} · ${resta.toFixed(1).replace('.', ',')} s`, 5, 10);
    ctx.fillStyle = tinte(pal.tenue);
    ctx.fillText(`Golpes ${v.golpes} de ${TOTAL} · te faltan ${Math.max(0, TOTAL - v.golpes)}`, 5, 19);
    ctx.fillStyle = tinte(pal.hundido, 0.9);
    ctx.fillRect(5, 23, MUNDO[0] - 10, 1.6);
    ctx.fillStyle = tinte(resta < 4 ? pal.rival : pal.oro);
    ctx.fillRect(5, 23, (MUNDO[0] - 10) * Math.min(1, v.t / A.tiempoS), 1.6);
    jugo.dibujarDestello(ctx, lienzo);
  }

  function vistaDeJuego() {
    return {
      dummies: e.dummies.map((d) => ({ x: d.x, y: d.y, tiembla: d.tiembla, vida: e.p.vida - d.edad })),
      tiros: e.tiros, t: e.t, golpes: e.golpes, fase: faseDeT(Math.min(e.t, A.tiempoS - 1e-6))
    };
  }

  // La demo: un dummy cruza y el tiro, adelantado, le pega.
  function demo(_c, u) {
    const dx = 100 + Math.sin(u * 5) * 12;
    const dy = 34 + u * 26;
    const tiros = u > 0.35 && u < 0.7 ? [{ x: A.yo.x + (dx - A.yo.x) * ((u - 0.35) / 0.35), y: A.yo.y + (dy - A.yo.y) * ((u - 0.35) / 0.35) }] : [];
    t = u * 2;
    escena({ dummies: u < 0.7 ? [{ x: dx, y: dy, tiembla: false, vida: 1 }] : [], tiros, t: u * 6, golpes: u > 0.7 ? 1 : 0, fase: 1 }, { x: dx, y: dy });
  }

  function procesarEventos() {
    for (const ev of e.eventos) {
      if (ev.tipo === 'tiro') {
        rastros.push({ x1: A.yo.x, y1: A.yo.y, x2: A.yo.x + (ev.x - A.yo.x) * 0.25, y2: A.yo.y + (ev.y - A.yo.y) * 0.25, vida: TIRO_VISIBLE });
        tick();
      } else if (ev.tipo === 'golpe') {
        racha += 1;
        jugo.parar(55);
        jugo.sacudir(1.6);
        jugo.chispas(ev.x, ev.y, 24, pal.oro, 50, 0.6);
        jugo.texto(ev.x, ev.y - 6, racha >= 3 ? `¡x${racha}!` : '+1', racha >= 3 ? pal.oro : pal.bien, racha >= 3 ? 17 : 13);
        if (racha === 3) frase = { texto: '¡Eso es!', vida: 1.6 };
        sonidoGolpe();
      } else if (ev.tipo === 'fallo') {
        racha = 0;
        jugo.chispas(ev.x, ev.y, 5, pal.mudo, 20, 0.3);
      } else if (ev.tipo === 'se_fue') {
        racha = 0;
        jugo.texto(ev.x, ev.y - 5, 'se fue', pal.rival, 10);
      } else if (ev.tipo === 'amague') {
        jugo.chispas(ev.x, ev.y, 8, pal.aviso, 30, 0.35);
      }
    }
    const f = faseDeT(Math.min(e.t, A.tiempoS - 1e-6));
    if (frase.fase !== f) frase = { texto: DICE_EL_COACH[f], vida: 3, fase: f };
    e.eventos.length = 0;
  }

  function paso() {
    let donde = pedido ? { x: entradas.puntero.x, y: entradas.puntero.y } : null;
    pedido = false;
    for (const ev of entradas.sacar()) {
      if (ev.tipo === 'toque') donde = { x: ev.x, y: ev.y };
      else if (TECLAS.includes(ev.k)) donde = { x: entradas.puntero.x, y: entradas.puntero.y };
    }
    avanzar(e, donde ? { tiro: donde } : null);
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
    frase.vida -= dt;
    for (const r of rastros) r.vida -= dt;
    while (rastros.length && rastros[0].vida <= 0) rastros.shift();
    escena(vistaDeJuego(), entradas.puntero.visto ? entradas.puntero : null);
  }

  caja.dataset.arcade = 'la_prueba';
  presentar(lienzo, { linea: `Pegale a ${TOTAL} dummies en ${A.tiempoS} s. Si se mueven, adelantá el tiro.`, demo, reducido }).then(() => {
    t = 0;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
