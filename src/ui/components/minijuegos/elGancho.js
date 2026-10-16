import { unaSolaVez, dificultadDe, varaEfectivaDe, PASOS_DE_CONTEO } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, paredEn, TIROS as TOTAL_TIROS, ANCHO, ALTO, YO_X, YO_Y } from '../../arcade/gancho.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon, minion } from '../../arcade/sprites.js';
import { ganchoConCadena } from '../../arcade/spritesLinea.js';
import { BALANCE } from '../../../data/balance.js';
import { golpe as sonidoGolpe, flash as sonidoFlash, derrota, tick } from '../../sonido.js';

// El gancho (mecánica nueva en M1, ola H entrega 2, PLANUI §0.10 "El arcade"): el support. Vista de arriba: el ADC y el support
// rival se mueven entre minions; apuntás con el mouse o con el teclado (W/S o las flechas) y tirás el gancho con Espacio o con
// un clic. El gancho tiene recorrido, así que hay que adelantarle el tiro, y los minions lo frenan. Tres fases: los rivales
// van de lado a lado, después amagan (el juke: el aviso se ve un instante) y después se esconden detrás de una pared de
// minions que se mueve. La lógica vive en `ui/arcade/gancho.js` (pura: la corre `dev/arcade-humano.js`).
//
// Contrato de siempre: `montar(container, state, onDone, rngUi, datos)` y `onDone(resultado 0..1, detalle)` una sola vez.
// Regla de CONTEO (G1): ganchos que pegan / `g1.conteo.el_gancho`. `rngUi` se tira dos veces: la semilla del juego y la del jugo.
export const TIROS = PASOS_DE_CONTEO.el_gancho;

const G = BALANCE.g1.arcade.el_gancho;
const MUNDO = [ANCHO, ALTO];
const SEMILLA = 2 ** 32;
const NOMBRES = ['DE LADO A LADO', 'EL JUKE', 'DETRÁS DE LA PARED'];
const TECLAS = [' ', 'f', 'w', 's', 'arrowup', 'arrowdown', 'enter'];
const GIRO = { w: -1, arrowup: -1, s: 1, arrowdown: 1 };
const ROTULO = { adc: 'ADC', support: 'SUP' };
const AL_FINAL_MS = 900;
const RETRACTA_S = 0.22;
const RADIO_FICHA = 3.8;

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
    clase: 'arc--gancho',
    mundo: MUNDO,
    etiqueta: 'El gancho: apuntá, adelantale el tiro al ADC o al support rival y tirá el gancho sin que un minion lo frene',
    botones: [{ texto: 'GANCHO', tecla: 'Espacio', alTocar: () => { pedido = true; } }],
    pie: 'Apuntá con el mouse o con W/S y las flechas; tirá con Espacio o con un clic. Adelantale el tiro: el gancho tarda en llegar.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  let t = 0;
  let bucle = null;
  let retracta = null;
  let punteroUsado = false;

  function escena(d) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    const fondo = ctx.createLinearGradient(0, 0, ANCHO, 0);
    fondo.addColorStop(0, tinte(mezcla(pal.elevado, pal.aliado, 0.06)));
    fondo.addColorStop(1, tinte(mezcla(pal.fondo, pal.rival, 0.06)));
    ctx.fillStyle = fondo;
    ctx.fillRect(-4, -4, ANCHO + 8, ALTO + 8);
    // el río de la Grieta: el carril donde pasan los minions
    ctx.fillStyle = tinte(pal.rio, 0.07);
    ctx.fillRect(48, 0, 56, ALTO);
    ctx.strokeStyle = tinte(pal.mudo, 0.5);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(0.4, 0.4, ANCHO - 0.8, ALTO - 0.8);
    // tu puntería: la línea hasta el alcance, la que dice dónde va a salir
    ctx.save();
    ctx.setLineDash([1.6, 2.2]);
    ctx.strokeStyle = tinte(pal.oro, d.gancho ? 0.18 : 0.6);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(YO_X, YO_Y);
    ctx.lineTo(YO_X + Math.cos(d.ang) * G.alcance, YO_Y + Math.sin(d.ang) * G.alcance);
    ctx.stroke();
    ctx.restore();
    // los minions: sueltos y la pared
    for (const m of d.minions) minion(ctx, m.x, m.y, 3.2, pal.rival, t + m.y, pal);
    for (const m of d.pared) minion(ctx, m.x, m.y, 3.6, pal.rival, t + m.y * 0.3, pal);
    // los rivales
    for (const en of d.enemigos) {
      const amaga = en.amague > 0;
      campeon(ctx, en.x, en.y, RADIO_FICHA, { borde: amaga ? pal.oro : pal.rival, retrato: { iniciales: ROTULO[en.tipo] }, pal, px: lienzo.px, brillo: amaga ? 1 : 0.45 });
      ctx.font = `700 ${lienzo.px(9)}px ${pal.fuente}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = tinte(amaga ? pal.oro : pal.rival);
      ctx.fillText(amaga ? '¡AMAGA!' : ROTULO[en.tipo], en.x, en.y - RADIO_FICHA - 2);
    }
    // el gancho en el aire y el que se recoge
    if (d.gancho) ganchoConCadena(ctx, YO_X, YO_Y, d.gancho.x, d.gancho.y, pal, { color: pal.oro, t });
    if (retracta) {
      const u = Math.max(0, retracta.vida / RETRACTA_S);
      ganchoConCadena(ctx, YO_X, YO_Y, YO_X + (retracta.x - YO_X) * u, YO_Y + (retracta.y - YO_Y) * u, pal, { color: retracta.acerto ? pal.oro : pal.mudo, t });
      if (retracta.acerto && retracta.arrastra) {
        const a = retracta.arrastra;
        campeon(ctx, YO_X + (a.x - YO_X) * u, YO_Y + (a.y - YO_Y) * u, RADIO_FICHA, { borde: pal.rival, retrato: { iniciales: ROTULO[a.tipo] }, pal, px: lienzo.px, brillo: 1 });
      }
    }
    campeon(ctx, YO_X, YO_Y, 5, { borde: pal.oro, retrato: yo, pal, px: lienzo.px, brillo: 0.7 });
    ctx.font = `700 ${lienzo.px(10)}px ${pal.fuente}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText('VOS', YO_X, YO_Y + 11);
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
    const falta = vara === null ? '' : ` · necesitás ${Math.min(TOTAL_TIROS, necesarios(vara, TOTAL_TIROS))}`;
    ctx.fillText(`ganchos que pegan ${d.logrados} de ${TOTAL_TIROS}${falta}`, 6, lienzo.px(32));
    for (let k = 0; k < TOTAL_TIROS; k += 1) {
      const r = e.tiros[k];
      const x = MUNDO[0] - 8 - (TOTAL_TIROS - 1 - k) * 8;
      ctx.fillStyle = tinte(r ? (r.acerto ? pal.bien : pal.rival) : k === e.tiros.length ? pal.oro : pal.mudo, r ? 0.95 : 0.5);
      ctx.beginPath();
      ctx.arc(x, 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = tinte(d.cd <= 0 && !d.gancho ? pal.bien : pal.tenue);
    ctx.fillText(d.gancho ? 'EN EL AIRE' : d.cd <= 0 ? 'GANCHO LISTO' : 'RECARGA', MUNDO[0] - 6, MUNDO[1] - 5);
  }

  function datosDeEscena() {
    return {
      ang: e.ang, gancho: e.gancho, cd: e.cd, fase: e.i, enemigos: e.enemigos, minions: e.minions, pared: paredEn(e),
      logrados: e.tiros.filter((x) => x.acerto).length
    };
  }

  // La demo: los rivales cruzan, el tiro sale adelantado y entra.
  function demo(_c, u) {
    t = u * 2;
    const y = 20 + 40 * (0.5 + 0.5 * Math.sin(u * 3));
    const en = { x: 112, y, tipo: 'adc', amague: 0 };
    const recorrido = Math.min(1, Math.max(0, (u - 0.35) / 0.4)) * 96;
    const ang = Math.atan2(y + 8 - YO_Y, 112 - YO_X);
    escena({
      ang, gancho: u > 0.35 && u < 0.75 ? { x: YO_X + Math.cos(ang) * recorrido, y: YO_Y + Math.sin(ang) * recorrido } : null, cd: 0, fase: 0,
      enemigos: [en, { x: 104, y: 90 - y, tipo: 'support', amague: 0 }], minions: [{ x: 66, y: 22 }, { x: 78, y: 68 }], pared: [], logrados: u > 0.75 ? 1 : 0
    });
  }

  function procesarEventos() {
    for (const ev of e.eventos) {
      if (ev.tipo === 'tiro') {
        tick();
        jugo.chispas(YO_X + 6, YO_Y, 4, pal.oro, 30, 0.25);
      } else if (ev.tipo === 'acierto') {
        const quien = e.enemigos.find((x) => x.tipo === ev.quien);
        retracta = { x: ev.x, y: ev.y, vida: RETRACTA_S, acerto: true, arrastra: quien ? { x: quien.x, y: quien.y, tipo: quien.tipo } : null };
        jugo.parar(80);
        jugo.camaraLenta(0.35, 380);
        jugo.sacudir(3);
        jugo.destellar(pal.oro, 0.28);
        jugo.chispas(ev.x, ev.y, 34, pal.oro, 55, 0.7);
        jugo.texto(ev.x, ev.y - 9, 'GANCHO', pal.oro, 22);
        sonidoFlash();
      } else if (ev.tipo === 'minion') {
        retracta = { x: ev.x, y: ev.y, vida: RETRACTA_S, acerto: false };
        jugo.chispas(ev.x, ev.y, 10, pal.mudo, 34, 0.4);
        jugo.texto(ev.x, ev.y - 7, 'LO FRENÓ UN MINION', pal.rival, 12);
        jugo.sacudir(1.2);
        sonidoGolpe();
      } else if (ev.tipo === 'lejos') {
        retracta = { x: ev.x, y: ev.y, vida: RETRACTA_S, acerto: false };
        jugo.texto(Math.min(ev.x, MUNDO[0] - 20), Math.max(14, Math.min(ev.y, MUNDO[1] - 8)), 'AL AIRE', pal.rival, 14);
        derrota();
      } else if (ev.tipo === 'amague') {
        const quien = e.enemigos.find((x) => x.tipo === ev.quien);
        if (quien) jugo.texto(quien.x, quien.y - 9, '¡!', pal.oro, 18);
      } else if (ev.tipo === 'fase') {
        jugo.texto(MUNDO[0] / 2, MUNDO[1] / 2 - 8, NOMBRES[ev.i], mezcla(pal.tinta, pal.oro, 0.4), 24);
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    let tirar = pedido;
    let angulo;
    pedido = false;
    for (const ev of entradas.sacar()) {
      if (ev.tipo === 'tecla' && TECLAS.includes(ev.k) && !GIRO[ev.k]) tirar = true;
      else if (ev.tipo === 'toque') { angulo = Math.atan2(ev.y - YO_Y, ev.x - YO_X); tirar = true; punteroUsado = true; }
    }
    let giro = 0;
    for (const k of entradas.abajo) if (GIRO[k]) giro += GIRO[k];
    if (giro) punteroUsado = false;
    else if (angulo === undefined && punteroUsado && entradas.puntero.visto) angulo = Math.atan2(entradas.puntero.y - YO_Y, entradas.puntero.x - YO_X);
    else if (angulo === undefined && entradas.puntero.visto && !punteroUsado) {
      const a = Math.atan2(entradas.puntero.y - YO_Y, entradas.puntero.x - YO_X);
      if (Math.abs(a - e.ang) > 0.02) { angulo = a; punteroUsado = true; }
    }
    avanzar(e, { angulo, giro, tirar });
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
    if (retracta) { retracta.vida -= dt; if (retracta.vida <= 0) retracta = null; }
    escena(datosDeEscena());
  }

  caja.dataset.arcade = 'el_gancho';
  presentar(lienzo, { linea: 'Apuntá y adelantale el gancho al ADC o al support. Los minions lo frenan. Cinco ganchos.', demo, reducido }).then(() => {
    t = 0;
    retracta = null;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
