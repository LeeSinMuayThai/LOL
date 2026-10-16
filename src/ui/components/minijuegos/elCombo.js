import { unaSolaVez, dificultadDe, varaEfectivaDe, PASOS_DE_CONTEO } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, faseDe, ventanaDe, TECLAS as TECLAS_NOTA, COMBOS } from '../../arcade/combo.js';
import { necesariosDe, lineaDeCuenta } from '../../arcade/conteo.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon } from '../../arcade/sprites.js';
import { BALANCE } from '../../../data/balance.js';
import { flash as sonidoFlash, tick, derrota } from '../../sonido.js';

// "El combo" (rehecho en M3, PLANUI §0.10 "El arcade"). Antes: memorizá cuatro teclas. Ahora: tu campeón lanza el combo de
// verdad. Las notas (Q W E R F) bajan por el carril hasta la línea de golpe y apretás la tecla justa en la ventana; cada combo
// completo cuenta 1, y si fallás una nota el combo se corta y la animación del campeón sale mal. Tres fases: más rápido,
// combos más largos y cancelaciones de animación (el anillo: ventana más chica). La lógica vive en `ui/arcade/combo.js`.
//
// Contrato de siempre: `montar(container, state, onDone, rngUi, datos)` y `onDone(resultado 0..1, detalle)` una sola vez.
// Regla de CONTEO (G1, `g1.conteo.el_combo`): resultado = combos completos / N. `rngUi` se tira dos veces: juego y jugo.
// G-fix-vara: el total sigue saliendo de `BALANCE.g1.conteo` (de ahí el motor saca el techo de la vara: nunca todos).
export const LARGO = PASOS_DE_CONTEO.el_combo;

const A = BALANCE.g1.arcade.el_combo;
const MUNDO = A.mundo;
const SEMILLA = 2 ** 32;
const AL_FINAL_MS = 900;
const CARRIL = { y: 70, alto: 17 };
const YO = { x: 26, y: 40, r: 9 };
const RIVAL = { x: 128, y: 40, r: 7 };
const COLOR_TECLA = { q: 'rio', w: 'bien', e: 'dragon', r: 'rival', f: 'oro' };
const NOMBRE_FASE = ['EL COMBO BÁSICO', 'MÁS RÁPIDO, MÁS LARGO', 'CANCELÁ LA ANIMACIÓN'];
const TECLAS = [...TECLAS_NOTA];

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const params = parametros({ stat: state.player.stats.mecanica, dificultad: dificultadDe(state, datos) });
  const vara = varaEfectivaDe(datos) ?? 0.6;
  const necesarios = necesariosDe(vara, COMBOS);
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  const cola = [];
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--combo',
    mundo: MUNDO,
    etiqueta: 'El combo: apretá la tecla de cada nota cuando cruza la línea',
    botones: TECLAS.map((k) => ({ texto: k.toUpperCase(), tecla: '', alTocar: () => cola.push(k) })),
    pie: 'Q W E R F cuando la nota cruza la línea. Si fallás una, el combo se corta.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  let t = 0;
  let bucle = null;
  let animacion = { tipo: 'quieto', resta: 0, k: 'q' };
  let golpeRival = 0;
  const marcas = [];

  const colorDe = (k) => pal[COLOR_TECLA[k]] ?? pal.oro;
  const xLinea = A.lineaX;

  function ficha(k, x, y, { cancel = false, estado = null, tam = 7 } = {}) {
    const c = colorDe(k);
    ctx.save();
    ctx.globalAlpha = estado === 'bien' ? 0.25 : estado ? 0.35 : 1;
    ctx.shadowColor = tinte(c, 0.8);
    ctx.shadowBlur = 10;
    ctx.fillStyle = tinte(mezcla(pal.hundido, c, 0.25));
    ctx.strokeStyle = tinte(estado === 'mal' || estado === 'perdida' ? pal.rival : c);
    ctx.lineWidth = cancel ? 1.6 : 1;
    ctx.beginPath();
    ctx.roundRect(x - tam, y - tam, tam * 2, tam * 2, 2.2);
    ctx.fill();
    ctx.stroke();
    if (cancel) {
      ctx.beginPath();
      ctx.arc(x, y, tam + 2.2, 0, Math.PI * 2);
      ctx.setLineDash([2, 1.5]);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = tinte(pal.tinta);
    ctx.font = `800 ${lienzo.px(14)}px ${pal.display}`;
    ctx.textAlign = 'center';
    ctx.fillText(k.toUpperCase(), x, y + lienzo.px(5));
  }

  // `v`: { notas: [{ k, x, estado, cancel }], w (en unidades), fase, hechos, intento, intentos }
  function escena(v, tiempo) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    const fondo = ctx.createLinearGradient(0, 0, 0, MUNDO[1]);
    fondo.addColorStop(0, tinte(mezcla(pal.elevado, colorDe(TECLAS[v.fase % 5]), 0.1)));
    fondo.addColorStop(1, tinte(pal.fondo));
    ctx.fillStyle = fondo;
    ctx.fillRect(-4, -4, MUNDO[0] + 8, MUNDO[1] + 8);
    // el campeón de fondo y su animación (sale bien o sale mal) y el rival que se come el combo
    const mal = animacion.tipo === 'mal';
    const pulso = animacion.resta > 0 ? animacion.resta / 0.3 : 0;
    ctx.save();
    if (animacion.tipo === 'cast' && pulso > 0) {
      ctx.fillStyle = tinte(colorDe(animacion.k), 0.25 * pulso);
      ctx.beginPath();
      ctx.arc(YO.x, YO.y, YO.r * (1.4 + (1 - pulso) * 0.9), 0, Math.PI * 2);
      ctx.fill();
    }
    campeon(ctx, YO.x + (mal ? Math.sin(tiempo * 70) * 1.2 * pulso : 0), YO.y + Math.sin(tiempo * 3) * 0.5, YO.r * (1 + 0.1 * (animacion.tipo === 'cast' ? pulso : 0)),
      { borde: mal && pulso > 0 ? pal.rival : pal.oro, retrato: yo, pal, px: lienzo.px, brillo: 0.6 + pulso * 0.4 });
    ctx.restore();
    campeon(ctx, RIVAL.x + golpeRival * 1.5, RIVAL.y, RIVAL.r, { borde: pal.rival, pal, px: lienzo.px, brillo: 0.4 + golpeRival });
    ctx.fillStyle = tinte(pal.rival);
    ctx.font = `700 ${lienzo.px(10)}px ${pal.fuente}`;
    ctx.textAlign = 'center';
    ctx.fillText('EL RIVAL', RIVAL.x, RIVAL.y + RIVAL.r + lienzo.px(12));
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText('VOS', YO.x, YO.y + YO.r + lienzo.px(12));
    // el carril, la línea de golpe y la ventana
    ctx.fillStyle = tinte(pal.hundido, 0.9);
    ctx.fillRect(0, CARRIL.y - CARRIL.alto / 2, MUNDO[0], CARRIL.alto);
    ctx.fillStyle = tinte(pal.oro, 0.18);
    ctx.fillRect(xLinea - v.w, CARRIL.y - CARRIL.alto / 2 - 2, v.w * 2, CARRIL.alto + 4);
    ctx.strokeStyle = tinte(pal.oro);
    ctx.lineWidth = 0.7;
    ctx.strokeRect(xLinea - v.w, CARRIL.y - CARRIL.alto / 2 - 2, v.w * 2, CARRIL.alto + 4);
    ctx.fillStyle = tinte(pal.blanco);
    ctx.fillRect(xLinea - 0.3, CARRIL.y - CARRIL.alto / 2 - 3, 0.6, CARRIL.alto + 6);
    for (const n of v.notas) if (n.x < MUNDO[0] + 8 && n.x > -8) ficha(n.k, n.x, CARRIL.y, n);
    for (const m of marcas) { // el desvío de cada nota que apretaste: el timing a la vista
      ctx.fillStyle = tinte(m.ok ? pal.bien : pal.rival, Math.max(0, m.vida));
      ctx.fillRect(xLinea + m.dx - 0.3, CARRIL.y + CARRIL.alto / 2 + 1, 0.6, 3.5);
    }
    jugo.dibujar(ctx, lienzo);
    lienzo.empezar();
    // el HUD: la fase, la cuenta de la vara y los combos que llevás
    ctx.textAlign = 'left';
    ctx.font = `700 ${lienzo.px(10.5)}px ${pal.fuente}`;
    ctx.fillStyle = tinte(pal.tinta);
    ctx.fillText(NOMBRE_FASE[v.fase], 5, 11);
    ctx.fillStyle = tinte(pal.tenue);
    ctx.fillText(`${lineaDeCuenta(v.hechos, necesarios)} combos · salen ${COMBOS}`, 5, 20);
    for (let k = 0; k < COMBOS; k += 1) {
      const r = v.intentos[k];
      ctx.fillStyle = tinte(r ? (r.ok ? pal.bien : pal.rival) : k === v.intento ? pal.oro : pal.mudo, r ? 0.95 : 0.5);
      ctx.beginPath();
      ctx.arc(MUNDO[0] - 7 - (COMBOS - 1 - k) * 7, 9, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    jugo.dibujarDestello(ctx, lienzo);
  }

  function vistaDeJuego() {
    const c = e.combo;
    const enCombo = e.estado === 'combo' && c;
    return {
      notas: enCombo ? c.notas.map((n) => ({ k: n.k, x: xLinea + (n.en - e.t) * A.vel, estado: n.estado, cancel: n.cancel })) : [],
      w: A.vel * (enCombo ? ventanaDe(e, c.notas[Math.min(c.idx, c.notas.length - 1)]) : params.ventana),
      fase: faseDe(Math.min(e.i, COMBOS - 1)), hechos: e.hechos, intento: e.i, intentos: e.intentos
    };
  }

  // La demo: cuatro notas que bajan y se apretan justo en la línea.
  function demo(_ctx, u) {
    const notas = ['q', 'w', 'e', 'r'].map((k, i) => ({ k, x: xLinea + (0.9 + i * 0.55 - u * 2.1) * A.vel, estado: null, cancel: i === 3 }));
    animacion = { tipo: u > 0.5 ? 'cast' : 'quieto', resta: 0.2, k: 'w' };
    escena({ notas, w: A.vel * params.ventana, fase: 0, hechos: 0, intento: 0, intentos: [] }, u * 2);
  }

  function procesarEventos() {
    for (const ev of e.eventos) {
      if (ev.tipo === 'nota' && ev.ok) {
        const perfecto = Math.abs(ev.dt) < params.ventana / 3;
        animacion = { tipo: 'cast', resta: 0.3, k: ev.k };
        golpeRival = 1;
        marcas.push({ dx: ev.dt * A.vel, ok: true, vida: 1 });
        jugo.chispas(xLinea, CARRIL.y, perfecto ? 18 : 9, colorDe(ev.k), 34, 0.45);
        jugo.chispas(RIVAL.x, RIVAL.y, 8, colorDe(ev.k), 26, 0.4);
        jugo.texto(xLinea + 6, CARRIL.y - 12, perfecto ? '¡PERFECTO!' : 'bien', perfecto ? pal.oro : pal.bien, perfecto ? 15 : 12);
        jugo.sacudir(perfecto ? 1.2 : 0.6);
        tick();
      } else if (ev.tipo === 'nota') {
        animacion = { tipo: 'mal', resta: 0.5, k: ev.k };
        if (ev.dt !== null) marcas.push({ dx: ev.dt * A.vel, ok: false, vida: 1 });
        jugo.chispas(xLinea, CARRIL.y, 10, pal.rival, 30, 0.5);
        jugo.sacudir(2.4);
        jugo.destellar(pal.rival, 0.25);
      } else if (ev.tipo === 'completo') {
        jugo.parar(90);
        jugo.camaraLenta(0.35, 380);
        jugo.destellar(pal.oro, 0.35);
        jugo.chispas(RIVAL.x, RIVAL.y, 40, pal.oro, 55, 0.8);
        jugo.texto(MUNDO[0] / 2, 58, `¡COMBO ${e.hechos}!`, pal.oro, 26);
        sonidoFlash();
      } else if (ev.tipo === 'corte') {
        const porque = { tecla: 'otra tecla', temprano: 'te adelantaste', tarde: 'llegaste tarde', perdida: 'se te pasó la nota' }[ev.motivo];
        jugo.texto(MUNDO[0] / 2, 58, `SE CORTÓ · ${porque}`, pal.rival, 18);
        derrota();
      } else if (ev.tipo === 'combo' && ev.i > 0) {
        jugo.texto(MUNDO[0] / 2, 58, NOMBRE_FASE[ev.fase], mezcla(pal.tinta, colorDe(TECLAS[ev.fase]), 0.5), 17);
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    for (const ev of entradas.sacar()) if (ev.tipo === 'tecla') cola.push(ev.k);
    const tecla = cola.shift() ?? null;
    avanzar(e, tecla ? { tecla } : null);
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
    golpeRival = Math.max(0, golpeRival - dt * 4);
    animacion.resta = Math.max(0, animacion.resta - dt);
    for (const m of marcas) m.vida -= dt * 0.8;
    while (marcas.length && marcas[0].vida <= 0) marcas.shift();
    escena(vistaDeJuego(), t);
  }

  caja.dataset.arcade = 'el_combo';
  presentar(lienzo, { linea: 'Apretá la tecla de cada nota cuando cruza la línea. Un error corta el combo.', demo, reducido }).then(() => {
    animacion = { tipo: 'quieto', resta: 0, k: 'q' };
    marcas.length = 0;
    t = 0;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
