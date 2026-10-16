import { unaSolaVez, dificultadDe, PASOS_DE_CONTEO } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, cubre, resultadoDe, detalleDe, faseDe, OLEADAS, ANCHO, ALTO, RADIO } from '../../arcade/esquive.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon, minion, telegrafo } from '../../arcade/sprites.js';
import { golpe as sonidoGolpe, flash as sonidoFlash, ding, click } from '../../sonido.js';

// "Dodge" (fase 9R4c; rehecho en H3k, PLANUI §0.10 "El arcade"). Antes eran 5 franjas y quedarse quieto pasaba el 82%.
// Ahora es una arena: te tiran skillshots telegrafiados (línea, círculo, cono) en oleadas que escalan, te movés con WASD,
// flechas o clic (como en la Grieta) y tenés Flash una vez (Espacio o F). La lógica, en `ui/arcade/esquive.js` (pura).
//
// Contrato de siempre: `montar(container, state, onDone, rngUi, datos)` y `onDone(resultado 0..1, detalle)` una sola vez.
// Regla de CONTEO (G1): una oleada cuenta si ningún tiro te tocó; el resultado es esquivadas / oleadas.
// G-fix-vara: cuántas oleadas, en `BALANCE.g1.conteo` (de ahí el motor saca el techo de la vara: nunca todas).
export const RONDAS = PASOS_DE_CONTEO.dodge;

const SEMILLA = 2 ** 32;
const NOMBRE_FASE = ['DE A UNO', 'DOS A LA VEZ', 'TE LEEN EL PASO'];
const TECLAS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'f'];
const AL_FINAL_MS = 900;
const POR_UN_PELO = 3;
const MINIONS = 5;

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const params = parametros({ stat: state.player.stats.mecanica, dificultad: dificultadDe(state, datos) });
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  let flashPedido = false;
  const { caja, lienzo, botones } = crearMarco(container, {
    clase: 'arc--dodge',
    mundo: [ANCHO, ALTO],
    etiqueta: 'La arena: esquivá los skillshots',
    botones: [{ texto: 'FLASH', tecla: 'F', alTocar: () => { flashPedido = true; } }],
    pie: 'Movete con WASD, flechas o clic. Flash una vez: Espacio o F (hacia el mouse o hacia donde vas).'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  const casters = [];
  let marcaClic = null;
  let ultimaDir = { x: 1, y: 0 };
  let racha = 0;
  let t = 0;
  let bucle = null;
  const rastro = [];

  function fondo(tiempo) {
    const g = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
    g.addColorStop(0, tinte(mezcla(pal.elevado, pal.rio, 0.08)));
    g.addColorStop(1, tinte(pal.superficie));
    ctx.fillStyle = g;
    ctx.fillRect(-3, -3, ANCHO + 6, ALTO + 6);
    // el río en diagonal y la grilla del suelo
    ctx.fillStyle = tinte(pal.rio, 0.07);
    ctx.beginPath();
    ctx.moveTo(-3, ALTO * 0.15); ctx.lineTo(ANCHO * 0.2, -3); ctx.lineTo(ANCHO + 3, ALTO * 0.85); ctx.lineTo(ANCHO * 0.8, ALTO + 3);
    ctx.fill();
    ctx.fillStyle = tinte(pal.tinta, 0.05);
    for (let x = 5; x < ANCHO; x += 10) for (let y = 4; y < ALTO; y += 8) ctx.fillRect(x, y, 0.4, 0.4);
    // la oleada de minions que pasa por abajo (adorno)
    for (let k = 0; k < MINIONS; k += 1) {
      minion(ctx, ((tiempo * 5 + k * 6) % (ANCHO + 10)) - 5, ALTO - 2.5, 1.8, pal.aliado, tiempo + k, pal);
      minion(ctx, ANCHO + 5 - ((tiempo * 5 + k * 6) % (ANCHO + 10)), 2.8, 1.8, pal.rival, tiempo + k, pal);
    }
  }

  function escena(tiempo, { tiros, jugador, flash, historial, oleada, enJuego }) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    fondo(tiempo);
    for (const tiro of tiros) {
      if (!tiro.armado) continue;
      const activo = e.t >= tiro.pega && e.t < tiro.fin + 0.06;
      const progreso = Math.max(0, Math.min(1, (e.t - tiro.nace) / (tiro.pega - tiro.nace)));
      telegrafo(ctx, tiro, progreso, { pal, activo, t: tiempo });
    }
    // los que tiran
    for (const c of casters) campeon(ctx, c.x, c.y, 2.6, { borde: pal.rival, pal, px: lienzo.px, brillo: 0.7 });
    // el clic de movimiento (el anillo verde del cliente)
    if (marcaClic) {
      ctx.strokeStyle = tinte(pal.bien, marcaClic.vida * 2);
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(marcaClic.x, marcaClic.y, 1 + (0.5 - marcaClic.vida) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const r of rastro) {
      ctx.fillStyle = tinte(pal.aliado, r.vida * 0.5);
      ctx.beginPath();
      ctx.arc(r.x, r.y, RADIO * 0.6 * r.vida, 0, Math.PI * 2);
      ctx.fill();
    }
    campeon(ctx, jugador.x, jugador.y, RADIO * 1.25, { borde: pal.aliado, retrato: yo, pal, px: lienzo.px, brillo: 0.8 });
    jugo.dibujar(ctx, lienzo);
    lienzo.empezar();
    hud({ flash, historial, oleada, enJuego });
    jugo.dibujarDestello(ctx, lienzo);
  }

  function hud({ flash, historial, oleada, enJuego }) {
    const paso = 4.6;
    const x0 = ANCHO / 2 - ((OLEADAS - 1) * paso) / 2;
    for (let k = 0; k < OLEADAS; k += 1) {
      const ok = historial[k];
      ctx.fillStyle = ok === undefined ? tinte(k === oleada && enJuego ? pal.oro : pal.mudo, 0.55) : tinte(ok ? pal.bien : pal.rival, 0.95);
      ctx.beginPath();
      ctx.arc(x0 + k * paso, 7, ok === undefined ? 1.2 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = `700 ${lienzo.px(10)}px ${pal.fuente}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = tinte(pal.tinta);
    const fi = faseDe(Math.max(0, oleada));
    // la fase va en la segunda fila: en el celular la primera es de las oleadas
    ctx.fillText(`FASE ${fi + 1} · ${NOMBRE_FASE[fi]}`, 2.5, 7.8 + lienzo.px(14));
    ctx.textAlign = 'right';
    ctx.fillStyle = tinte(flash ? pal.oro : pal.mudo);
    ctx.fillText(flash ? 'FLASH [F]' : 'FLASH USADO', ANCHO - 2.5, 7.8);
    if (racha >= 2) {
      ctx.fillStyle = tinte(pal.bien);
      ctx.fillText(`RACHA x${racha}`, ANCHO - 2.5, 7.8 + lienzo.px(14));
    }
  }

  function vistaDe(estado) {
    return { tiros: estado.tiros, jugador: estado.yo, flash: estado.flash, historial: estado.historial, oleada: estado.oleada, enJuego: !estado.terminado };
  }

  // La demo: un skillshot de línea sobre vos y el paso al costado que lo esquiva.
  function demo(_ctx, u) {
    const tiro = { tipo: 'linea', armado: true, ox: -10, oy: ALTO / 2, dx: 1, dy: 0, largo: ANCHO + 20, ancho: 7, nace: 0, pega: 0.7, fin: 0.82 };
    const salto = u < 0.45 ? 0 : Math.min(1, (u - 0.45) / 0.2);
    const jugador = { x: ANCHO / 2, y: ALTO / 2 - salto * 9 };
    const prev = e.t;
    e.t = u;
    t = u * 2;
    escena(t, { tiros: [tiro], jugador, flash: true, historial: [], oleada: 0, enJuego: true });
    e.t = prev;
  }

  function procesarEventos() {
    for (const ev of e.eventos) {
      if (ev.tipo === 'aviso') {
        const tiro = ev.tiro;
        const c = tiro.tipo === 'circulo'
          ? { x: Math.max(3, Math.min(ANCHO - 3, tiro.cx + (azarFx() - 0.5) * 50)), y: azarFx() < 0.5 ? 4 : ALTO - 4 }
          : { x: tiro.ox, y: tiro.oy };
        if (tiro.tipo === 'linea') {
          // la línea arranca afuera de la arena: el que la tira se para en el borde, sobre la línea
          let k = 0;
          while (k < tiro.largo && !(c.x > 3 && c.x < ANCHO - 3 && c.y > 3 && c.y < ALTO - 3)) {
            k += 1;
            c.x = tiro.ox + tiro.dx * k;
            c.y = tiro.oy + tiro.dy * k;
          }
        }
        casters.push({ ...c, hasta: tiro.fin });
        click();
      } else if (ev.tipo === 'dispara') {
        const yoAhora = e.yo;
        const cerca = !cubre(ev.tiro, yoAhora.x, yoAhora.y) && cubre(ev.tiro, yoAhora.x, yoAhora.y, RADIO + POR_UN_PELO);
        if (cerca) {
          jugo.camaraLenta(0.25, 380);
          jugo.texto(yoAhora.x, yoAhora.y - 5, '¡POR UN PELO!', pal.oro, 15);
        }
        jugo.sacudir(0.8);
      } else if (ev.tipo === 'golpe') {
        jugo.parar(80);
        jugo.sacudir(2.6);
        jugo.destellar(pal.rival, 0.4);
        jugo.chispas(ev.x, ev.y, 26, pal.rival, 40, 0.6);
        jugo.texto(ev.x, ev.y - 5, '¡TE PEGÓ!', pal.rival, 17);
        sonidoGolpe();
        racha = 0;
      } else if (ev.tipo === 'oleada') {
        if (ev.ok) {
          racha += 1;
          jugo.texto(ANCHO / 2, ALTO / 2 - 8, racha >= 2 ? `¡ESQUIVADO! x${racha}` : '¡ESQUIVADO!', pal.bien, 20);
          jugo.chispas(e.yo.x, e.yo.y, 12, pal.bien, 25, 0.5);
          ding();
        }
        casters.length = 0;
      } else if (ev.tipo === 'flash') {
        jugo.chispas(ev.desde.x, ev.desde.y, 18, pal.oro, 30, 0.5);
        jugo.chispas(ev.hasta.x, ev.hasta.y, 18, pal.oro, 30, 0.5);
        sonidoFlash();
        botones[0]?.setAttribute('disabled', '');
      } else if (ev.tipo === 'fase') {
        jugo.texto(ANCHO / 2, ALTO / 2, `FASE ${ev.i + 1} · ${NOMBRE_FASE[ev.i]}`, mezcla(pal.tinta, pal.oro, 0.4), 22);
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    const entrada = {};
    const { abajo, puntero } = entradas;
    const dir = {
      x: (abajo.has('d') || abajo.has('arrowright') ? 1 : 0) - (abajo.has('a') || abajo.has('arrowleft') ? 1 : 0),
      y: (abajo.has('s') || abajo.has('arrowdown') ? 1 : 0) - (abajo.has('w') || abajo.has('arrowup') ? 1 : 0)
    };
    if (dir.x || dir.y) { entrada.dir = dir; ultimaDir = dir; }
    let flash = flashPedido;
    flashPedido = false;
    for (const ev of entradas.sacar()) {
      if (ev.tipo === 'toque') { entrada.ir = { x: ev.x, y: ev.y }; marcaClic = { x: ev.x, y: ev.y, vida: 0.5 }; }
      if (ev.tipo === 'tecla' && (ev.k === ' ' || ev.k === 'f')) flash = true;
    }
    if (flash) {
      // hacia el mouse si lo estás usando; si no, hacia donde ibas
      const n = Math.hypot(ultimaDir.x, ultimaDir.y) || 1;
      entrada.flash = puntero.visto && !entrada.dir
        ? { x: puntero.x, y: puntero.y }
        : { x: e.yo.x + (ultimaDir.x / n) * 20, y: e.yo.y + (ultimaDir.y / n) * 20 };
    }
    avanzar(e, entrada);
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
    if (marcaClic) { marcaClic.vida -= dt; if (marcaClic.vida <= 0) marcaClic = null; }
    if (!reducido && (e.yo.vx || e.yo.vy)) rastro.push({ x: e.yo.x, y: e.yo.y, vida: 1 });
    for (const r of rastro) r.vida -= dt * 3;
    while (rastro.length && rastro[0].vida <= 0) rastro.shift();
    for (let k = casters.length - 1; k >= 0; k -= 1) if (e.t > casters[k].hasta + 0.3) casters.splice(k, 1);
    escena(t, vistaDe(e));
  }

  caja.dataset.arcade = 'dodge';
  presentar(lienzo, { linea: `Esquivá los skillshots: ${OLEADAS} oleadas, Flash una vez.`, demo, reducido }).then(() => {
    t = 0;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
