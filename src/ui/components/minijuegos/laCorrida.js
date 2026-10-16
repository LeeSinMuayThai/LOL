import { unaSolaVez, dificultadDe, varaEfectivaDe, PASOS_DE_CONTEO } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, faseDe, ENGAGES } from '../../arcade/corrida.js';
import { necesariosDe, lineaDeCuenta } from '../../arcade/conteo.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon, minion } from '../../arcade/sprites.js';
import { BALANCE } from '../../../data/balance.js';
import { golpe as sonidoGolpe, flash as sonidoFlash, derrota, latido } from '../../sonido.js';

// "La corrida" (rehecha en M3, PLANUI §0.10 "El arcade"). Antes: una barra que corre y frenás en la zona. Ahora: la teamfight
// vista de arriba. Cinco rivales andan por la arena y a ratos se juntan (se ve hacia dónde van: el ping en el piso); tu R es un
// círculo con tiempo de casteo: apuntás con el mouse, la tirás con clic, R o Espacio (o tocando) y explota a los 0,55 s donde
// estaba. Un engage que agarra a 3 o más cuenta 1. Fases: se abren más; reaccionan con Flash; hay paredes (tapan la R).
// La lógica vive en `ui/arcade/corrida.js`. Contrato de T6: `montar(container, state, onDone, rngUi, datos)` y
// `onDone(resultado 0..1, detalle)`. Regla de CONTEO (G1, `g1.conteo.la_corrida`): resultado = engages que cuentan / N.
// G-fix-vara: el total sigue saliendo de `BALANCE.g1.conteo` (de ahí el motor saca el techo de la vara: nunca todos).
export const FRENADAS = PASOS_DE_CONTEO.la_corrida;

const A = BALANCE.g1.arcade.la_corrida;
const MUNDO = A.mundo;
const SEMILLA = 2 ** 32;
const AL_FINAL_MS = 1000;
const TECLAS = ['r', ' ', 'enter'];
const NOMBRE_FASE = ['SE ABREN', 'FLASH', 'PAREDES'];
const YO = { x: 12, y: 86 };

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const params = parametros({ stat: state.player.stats.mecanica, dificultad: dificultadDe(state, datos) });
  const vara = varaEfectivaDe(datos) ?? 0.6;
  const necesarios = necesariosDe(vara, ENGAGES);
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  let pedido = false;
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--corrida',
    mundo: MUNDO,
    etiqueta: 'La corrida: tirá la R cuando se juntan los rivales',
    botones: [{ texto: 'R', tecla: 'R', alTocar: () => { pedido = true; } }],
    pie: 'Apuntá con el mouse y tirá la R con clic, R o Espacio cuando se junten. Una R por engage.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  let t = 0;
  let bucle = null;
  let ultimo = null;
  const numeros = [];

  function arena(g) {
    const fondo = ctx.createRadialGradient(MUNDO[0] / 2, 52, 8, MUNDO[0] / 2, 52, 100);
    fondo.addColorStop(0, tinte(mezcla(pal.elevado, pal.rio, 0.12)));
    fondo.addColorStop(1, tinte(pal.fondo));
    ctx.fillStyle = fondo;
    ctx.fillRect(-4, -4, MUNDO[0] + 8, MUNDO[1] + 8);
    ctx.strokeStyle = tinte(pal.tinta, 0.08);
    ctx.lineWidth = 0.4;
    ctx.strokeRect(A.arena.x[0] - 4, A.arena.y[0] - 4, A.arena.x[1] - A.arena.x[0] + 8, A.arena.y[1] - A.arena.y[0] + 8);
    for (let k = 0; k < 3; k += 1) minion(ctx, 40 + ((t * 7 + k * 40) % 100), 87, 2, pal.aliado, t + k, pal);
    for (const p of g.paredes) { // las paredes del mapa: tapan la R
      ctx.fillStyle = tinte(mezcla(pal.hundido, pal.mudo, 0.4));
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = tinte(pal.mudo, 0.8);
      ctx.lineWidth = 0.6;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
  }

  // `g` es el engage (o uno inventado para la demo); `cursor`: { x, y } o null
  function escena(g, cursor, extra = {}) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    arena(g);
    // el ping de la junta: hacia dónde van (se ve venir)
    if (g.centro && (g.modo === 'junta' || g.modo === 'junto') && !g.cast) {
      const u = (t * 1.6) % 1;
      ctx.strokeStyle = tinte(pal.rival, 0.55 * (1 - u));
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(g.centro.x, g.centro.y, 3 + u * (g.f.spread + 3), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = tinte(pal.rival, 0.8);
      ctx.font = `700 ${lienzo.px(10)}px ${pal.fuente}`;
      ctx.textAlign = 'center';
      ctx.fillText('SE JUNTAN', g.centro.x, g.centro.y - g.f.spread - 4);
    }
    // el círculo de la R, el que apuntás y el que ya tiraste
    if (cursor && !g.cast && !g.fin) {
      ctx.setLineDash([2.4, 2]);
      ctx.strokeStyle = tinte(pal.oro, 0.65);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, params.radio, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (g.cast) {
      const u = 1 - g.cast.resta / A.castS;
      ctx.fillStyle = tinte(pal.oro, 0.08 + 0.22 * u);
      ctx.beginPath();
      ctx.arc(g.cast.x, g.cast.y, params.radio, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tinte(pal.oro, 0.9);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.cast.x, g.cast.y, params.radio * u, 0, Math.PI * 2);
      ctx.strokeStyle = tinte(pal.blanco, 0.8);
      ctx.stroke();
    }
    // los rivales
    for (const r of g.rivales) {
      const atrapado = extra.atrapados?.includes(r.k);
      if (r.flashEn !== null) {
        ctx.strokeStyle = tinte(pal.rio, 0.9);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(r.x, r.y, A.radioRival + 1.6 + Math.sin(t * 40), 0, Math.PI * 2);
        ctx.stroke();
      }
      campeon(ctx, r.x, r.y, A.radioRival, { borde: atrapado ? pal.oro : pal.rival, pal, px: lienzo.px, brillo: atrapado ? 1 : 0.4 });
      if (r.flasheo) {
        ctx.fillStyle = tinte(pal.rio);
        ctx.font = `800 ${lienzo.px(8)}px ${pal.fuente}`;
        ctx.textAlign = 'center';
        ctx.fillText('FLASH', r.x, r.y - A.radioRival - 2);
      }
    }
    campeon(ctx, YO.x, YO.y - 3, 4.5, { borde: pal.oro, retrato: yo, pal, px: lienzo.px, brillo: 0.7 });
    jugo.dibujar(ctx, lienzo);
    for (const n of numeros) {
      ctx.globalAlpha = Math.min(1, n.vida * 2);
      ctx.fillStyle = tinte(n.color);
      ctx.font = `800 ${lienzo.px(11)}px ${pal.display}`;
      ctx.textAlign = 'center';
      ctx.fillText(n.str, n.x, n.y);
      ctx.globalAlpha = 1;
    }
    lienzo.empezar();
    ctx.textAlign = 'left';
    ctx.font = `700 ${lienzo.px(10.5)}px ${pal.fuente}`;
    ctx.fillStyle = tinte(pal.tinta);
    ctx.fillText(`ENGAGE ${Math.min(ENGAGES, e.i + 1)} DE ${ENGAGES} · ${NOMBRE_FASE[g.fase ?? 0]}`, 5, 10);
    ctx.fillStyle = tinte(pal.tenue);
    ctx.fillText(`${lineaDeCuenta(e.hechos, necesarios)} engages · cada uno, ${A.necesarios} o más`, 5, 19);
    for (let k = 0; k < ENGAGES; k += 1) {
      const r = e.intentos[k];
      ctx.fillStyle = tinte(r ? (r.ok ? pal.bien : pal.rival) : k === e.i ? pal.oro : pal.mudo, r ? 0.95 : 0.5);
      ctx.beginPath();
      ctx.arc(MUNDO[0] - 7 - (ENGAGES - 1 - k) * 7, 9, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    jugo.dibujarDestello(ctx, lienzo);
  }

  // La demo: los rivales se juntan y la R explota justo encima.
  function demo(_c, u) {
    const centro = { x: 84, y: 48 };
    const rivales = Array.from({ length: 5 }, (_, k) => {
      const a = (k / 5) * Math.PI * 2;
      const lejos = 38 * (1 - Math.min(1, u * 1.5));
      return { k, x: centro.x + Math.cos(a) * (5 + lejos), y: centro.y + Math.sin(a) * (4 + lejos * 0.6), flashEn: null, flasheo: false };
    });
    const cast = u > 0.45 ? { x: centro.x, y: centro.y, resta: Math.max(0, A.castS * (1 - (u - 0.45) * 2.2)) } : null;
    t = u * 2;
    escena({ rivales, paredes: [], centro, modo: 'junta', f: { spread: 8 }, cast, fin: false, fase: 0 }, null, { atrapados: u > 0.9 ? [0, 1, 2, 3, 4] : [] });
  }

  function procesarEventos() {
    for (const ev of e.eventos) {
      if (ev.tipo === 'junta') {
        latido(1);
      } else if (ev.tipo === 'cast') {
        jugo.chispas(YO.x, YO.y - 3, 14, pal.oro, 40, 0.5);
        sonidoFlash();
      } else if (ev.tipo === 'flash') {
        jugo.chispas(ev.x, ev.y, 10, pal.rio, 40, 0.4);
        jugo.texto(ev.x, ev.y - 6, '¡FLASH!', pal.rio, 12);
      } else if (ev.tipo === 'explota') {
        const g = e.engage;
        ultimo = g.atrapados ?? [];
        jugo.parar(100);
        jugo.camaraLenta(0.3, 450);
        jugo.sacudir(ev.ok ? 4 : 1.8);
        jugo.destellar(ev.ok ? pal.oro : pal.rival, 0.4);
        if (ev.tiro) {
          jugo.chispas(ev.x, ev.y, ev.ok ? 60 : 22, ev.ok ? pal.oro : pal.mudo, 65, 0.9);
          numeros.push(...ultimo.map((k) => ({ x: g.rivales[k].x, y: g.rivales[k].y - 5, str: '-R', color: pal.oro, vida: 1 })));
        }
        jugo.texto(MUNDO[0] / 2, 46, ev.tiro ? (ev.ok ? `¡AGARRASTE ${ev.atrapados}!` : `SOLO ${ev.atrapados}`) : 'NO TIRASTE LA R', ev.ok ? pal.oro : pal.rival, 24);
        if (ev.ok) sonidoGolpe(); else derrota();
      } else if (ev.tipo === 'engage' && ev.i > 0) {
        ultimo = null;
        jugo.texto(MUNDO[0] / 2, 46, `ENGAGE ${ev.i + 1} · ${NOMBRE_FASE[ev.fase]}`, mezcla(pal.tinta, pal.rival, 0.4), 18);
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    let tirar = pedido;
    pedido = false;
    let donde = null;
    for (const ev of entradas.sacar()) {
      if (ev.tipo === 'toque') { tirar = true; donde = { x: ev.x, y: ev.y }; } else if (TECLAS.includes(ev.k)) tirar = true;
    }
    donde = donde ?? { x: entradas.puntero.x, y: entradas.puntero.y };
    avanzar(e, tirar ? { r: donde } : null);
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
    for (const n of numeros) { n.vida -= dt; n.y -= 8 * dt; }
    while (numeros.length && numeros[0].vida <= 0) numeros.shift();
    const g = e.engage;
    escena(g, entradas.puntero.visto ? entradas.puntero : null, { atrapados: g.fin ? ultimo : null });
  }

  caja.dataset.arcade = 'la_corrida';
  presentar(lienzo, { linea: 'Tirá la R cuando se junten: 3 o más adentro del círculo cuenta el engage.', demo, reducido }).then(() => {
    t = 0;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
