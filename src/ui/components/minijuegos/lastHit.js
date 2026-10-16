import { unaSolaVez, dificultadDe, varaEfectivaDe, PASOS_DE_CONTEO } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, OBJETIVOS, faseDeObjetivo } from '../../arcade/lastHit.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon } from '../../arcade/sprites.js';
import { torreLado, minionLado, barraConRemate } from '../../arcade/spritesLinea.js';
import { BALANCE } from '../../../data/balance.js';
import { golpe as sonidoGolpe, flash as sonidoFlash, derrota } from '../../sonido.js';

// Last hit (rehecho en M1, ola H entrega 2, PLANUI §0.10 "El arcade"). Antes eran cinco botones con una barrita que bajaba. Ahora
// es la línea vista de costado: la oleada pelea sola, la vida del minion baja a golpes de los aliados (y, en la última fase,
// de los tiros de tu torre) y tu auto pega con Espacio, un clic o un toque. Temprano no muere y perdés el ritmo; tarde te lo
// roba la oleada o la torre. Tres fases: la oleada melee, el cañón (vale más y aguanta más) y bajo tu torre, donde hay que
// pre-golpear. Cada CS salta con su oro. La lógica vive en `ui/arcade/lastHit.js` (pura: la corre `dev/arcade-humano.js`).
//
// Contrato de siempre: `montar(container, state, onDone, rngUi, datos)` y `onDone(resultado 0..1, detalle)` una sola vez.
// Regla de CONTEO (G1): minions rematados / `g1.conteo.last_hit`. `rngUi` se tira dos veces: la semilla del juego y la del jugo.
export const TOTAL = PASOS_DE_CONTEO.last_hit;

const A = BALANCE.g1.arcade.last_hit;
const MUNDO = [160, 90];
const SEMILLA = 2 ** 32;
const SUELO = 70;
const YO = [44, 62];
const TORRE_X = 16;
const TORRE_ALTO = 44;
const OBJ_X = [98, 98, 72];
const NOMBRES = ['LA OLEADA', 'EL CAÑÓN', 'BAJO TU TORRE'];
const TECLAS = [' ', 'f', 'd', 'enter'];
const AL_FINAL_MS = 900;
const GOLPE_VISUAL_S = 0.18;
const MUERTE_S = 0.45;

const necesarios = (vara, total) => { for (let k = 0; k <= total; k += 1) if (k / total >= vara) return k; return total + 1; };

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const vara = varaEfectivaDe(datos);
  const params = parametros({ stat: state.player.stats.laneo, dificultad: dificultadDe(state, datos) });
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  let pedido = false;
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--linea',
    mundo: MUNDO,
    etiqueta: 'La línea vista de costado: rematá a los minions rivales cuando les quede poca vida',
    botones: [{ texto: 'GOLPE', tecla: 'Espacio', alTocar: () => { pedido = true; } }],
    pie: 'Pegá con Espacio, un clic o un toque cuando la barra entre en la franja dorada. Si pegás antes, perdés el ritmo.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  let t = 0;
  let bucle = null;
  let golpeAliado = 0;
  let golpeMio = 0;
  let muerto = null;
  let cdMax = A.cdS;
  const tiros = [];

  const posObjetivo = (i) => [OBJ_X[i], SUELO];

  function escena(d) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    const fondo = ctx.createLinearGradient(0, 0, 0, MUNDO[1]);
    fondo.addColorStop(0, tinte(pal.fondo));
    fondo.addColorStop(1, tinte(mezcla(pal.elevado, pal.fondo, 0.4)));
    ctx.fillStyle = fondo;
    ctx.fillRect(-4, -4, MUNDO[0] + 8, MUNDO[1] + 8);
    // la línea: el suelo y las marcas de los carriles
    ctx.fillStyle = tinte(pal.hundido, 0.95);
    ctx.fillRect(-4, SUELO, MUNDO[0] + 8, MUNDO[1] - SUELO + 4);
    ctx.strokeStyle = tinte(mezcla(pal.elevado, pal.tinta, 0.15), 0.6);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, SUELO);
    ctx.lineTo(MUNDO[0], SUELO);
    ctx.stroke();
    torreLado(ctx, TORRE_X, SUELO, TORRE_ALTO, pal.aliado, pal, d.torreCarga);
    // el nexo rival, lejos
    ctx.fillStyle = tinte(mezcla(pal.rival, pal.fondo, 0.75), 0.8);
    ctx.fillRect(MUNDO[0] - 12, SUELO - 24, 12, 24);
    // la fila que viene
    for (let k = 0; k < d.cola; k += 1) minionLado(ctx, 124 + k * 12, SUELO, 7, pal.rival, t + k, pal, { lado: -1 });
    // el objetivo y su oleada
    if (d.objetivo) {
      const o = d.objetivo;
      const [ox, oy] = posObjetivo(o.i);
      const canon = o.tipo === 'canon';
      const s = canon ? 12 : 9;
      [0, 1].forEach((k) => minionLado(ctx, ox - 17 - k * 10, oy, 8, pal.aliado, t + k, pal, { lado: 1, golpe: golpeAliado * (k ? 0.6 : 1) }));
      minionLado(ctx, ox, oy, s, pal.rival, t, pal, { lado: -1, canon, brillo: o.enZona ? 1 : 0 });
      const frac = o.hp / o.hpMax;
      barraConRemate(ctx, ox, oy - s * 1.65 - 4, canon ? 30 : 24, 3.4, frac, Math.min(1, params.danio / o.hpMax), pal, { color: o.enZona ? pal.oro : pal.rival, enZona: o.enZona });
      ctx.font = `700 ${lienzo.px(9)}px ${pal.fuente}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = tinte(o.enZona ? pal.oro : pal.tenue);
      ctx.fillText(o.enZona ? 'REMATALO' : canon ? `CAÑÓN · ${o.oro}` : `MINION · ${o.oro}`, ox, oy - s * 1.65 - 6.5);
    }
    if (muerto) {
      const u = muerto.vida / MUERTE_S;
      ctx.save();
      ctx.globalAlpha = Math.max(0, u);
      minionLado(ctx, muerto.x, muerto.y + (1 - u) * 3, muerto.canon ? 12 : 9, muerto.cs ? pal.oro : pal.mudo, t, pal, { lado: -1, canon: muerto.canon });
      ctx.restore();
    }
    // los tiros de tu torre
    for (const p of tiros) {
      const u = 1 - p.vida / p.total;
      const x = TORRE_X + (p.x - TORRE_X) * u;
      const y = SUELO - TORRE_ALTO * 1.12 + (p.y - (SUELO - TORRE_ALTO * 1.12)) * u - Math.sin(u * Math.PI) * 6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = tinte(pal.aliado, 0.9);
      ctx.shadowColor = tinte(pal.aliado, 1);
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // vos
    campeon(ctx, YO[0], YO[1] + Math.sin(t * 3) * 0.5, 5.4, { borde: pal.oro, retrato: yo, pal, px: lienzo.px, brillo: 0.7 });
    if (golpeMio > 0) {
      ctx.strokeStyle = tinte(pal.blanco, golpeMio / GOLPE_VISUAL_S);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(YO[0] + 7, YO[1] - 1, 6, -0.9, 0.9);
      ctx.stroke();
    }
    ctx.font = `700 ${lienzo.px(10)}px ${pal.fuente}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText('VOS', YO[0], YO[1] + 11);
    // el cooldown de tu auto, a la vista
    const lleno = d.cd <= 0;
    const frac = lleno ? 1 : 1 - d.cd / cdMax;
    ctx.fillStyle = tinte(pal.hundido, 0.92);
    ctx.fillRect(YO[0] - 11, YO[1] + 14, 22, 2.6);
    ctx.fillStyle = tinte(lleno ? pal.bien : cdMax > A.cdS ? pal.rival : pal.tenue);
    ctx.fillRect(YO[0] - 11, YO[1] + 14, 22 * frac, 2.6);
    ctx.font = `600 ${lienzo.px(9)}px ${pal.fuente}`;
    ctx.fillStyle = tinte(lleno ? pal.bien : cdMax > A.cdS ? pal.rival : pal.tenue);
    ctx.fillText(lleno ? 'LISTO' : cdMax > A.cdS ? 'SIN RITMO' : 'RECARGA', YO[0], YO[1] + 22);
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
    const falta = vara === null ? '' : ` · necesitás ${Math.min(TOTAL, necesarios(vara, TOTAL))}`;
    ctx.fillText(`rematados ${d.logrados} de ${TOTAL}${falta}`, 6, lienzo.px(32));
    for (let k = 0; k < OBJETIVOS; k += 1) {
      const r = e.resultados[k];
      const x = MUNDO[0] - 8 - (OBJETIVOS - 1 - k) * 8;
      ctx.fillStyle = tinte(r ? (r.cs ? pal.bien : pal.rival) : k === e.resultados.length ? pal.oro : pal.mudo, r ? 0.95 : 0.5);
      ctx.beginPath();
      ctx.arc(x, 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function datosDeEscena() {
    const o = e.objetivo;
    return {
      fase: o ? o.i : faseDeObjetivo(Math.min(e.resultados.length, OBJETIVOS - 1)),
      objetivo: o && o.vivo ? { i: o.i, tipo: o.tipo, hp: Math.max(0, o.hp), hpMax: o.hpMax, oro: o.oro, enZona: o.t >= A.llegaS && o.hp <= params.danio } : null,
      cola: Math.max(0, OBJETIVOS - e.resultados.length - (o ? 1 : 0)),
      cd: e.cd,
      logrados: e.resultados.filter((r) => r.cs).length,
      torreCarga: o?.torre ? Math.max(0, 1 - Math.max(0, o.torre.cuenta) / A.fases[o.i].torre.cadaS) : 0
    };
  }

  // La demo: la barra del minion baja, entra a la franja dorada y un golpe fantasma lo remata con su oro.
  function demo(_c, u) {
    t = u * 2;
    const hpMax = 100;
    const hp = Math.max(params.danio * 0.7, hpMax - u * 95);
    const enZona = hp <= params.danio;
    golpeAliado = Math.max(0, Math.sin(u * 38)) * 0.6;
    const remata = u > 0.82;
    escena({ fase: 0, objetivo: remata ? null : { i: 0, tipo: 'melee', hp, hpMax, oro: 21, enZona }, cola: 1, cd: 0, logrados: remata ? 1 : 0, torreCarga: 0 });
    if (remata) {
      ctx.font = `800 ${lienzo.px(18)}px ${pal.display}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = tinte(pal.oro);
      ctx.fillText(`+${A.fases[0].oro}`, OBJ_X[0], SUELO - 22 - (u - 0.82) * 40);
    }
  }

  function procesarEventos() {
    const o = e.objetivo;
    for (const ev of e.eventos) {
      const [ox, oy] = o ? posObjetivo(o.i) : [OBJ_X[0], SUELO];
      if (ev.tipo === 'golpe') {
        golpeAliado = GOLPE_VISUAL_S;
        jugo.chispas(ox - 3, oy - 8, 2, pal.aliado, 22, 0.25, 0.6);
      } else if (ev.tipo === 'tiro') {
        const i = o?.i ?? 2;
        tiros.push({ x: posObjetivo(i)[0], y: SUELO - 9, vida: A.fases[2].torre.vueloS, total: A.fases[2].torre.vueloS });
      } else if (ev.tipo === 'torre') {
        tiros.length = 0;
        jugo.chispas(ox, oy - 9, 12, pal.aliado, 38, 0.4);
        jugo.texto(ox + 8, oy - 24, `-${Math.round(ev.monto)}`, pal.aliado, 13);
        jugo.sacudir(1.2);
        sonidoGolpe();
      } else if (ev.tipo === 'cs') {
        golpeMio = GOLPE_VISUAL_S;
        cdMax = A.cdS;
        muerto = { x: ox, y: oy, vida: MUERTE_S, canon: ev.objetivo === 'canon', cs: true };
        jugo.parar(70);
        jugo.sacudir(ev.objetivo === 'canon' ? 3.2 : 2);
        jugo.destellar(pal.oro, 0.25);
        jugo.chispas(ox, oy - 8, ev.objetivo === 'canon' ? 40 : 24, pal.oro, 55, 0.7);
        jugo.texto(ox, oy - 26, `+${ev.oro}`, pal.oro, ev.objetivo === 'canon' ? 26 : 20);
        sonidoFlash();
      } else if (ev.tipo === 'temprano' || ev.tipo === 'prehit' || ev.tipo === 'aire') {
        golpeMio = GOLPE_VISUAL_S;
        cdMax = ev.tipo === 'prehit' ? A.fases[2].parcialCdS : A.falloCdS;
        if (ev.tipo === 'prehit') {
          jugo.texto(ox, oy - 28, 'PRE-GOLPE', pal.tinta, 13);
          jugo.chispas(ox, oy - 8, 8, pal.tinta, 30, 0.35);
        } else {
          jugo.texto(ox, oy - 28, ev.tipo === 'aire' ? 'AL AIRE' : 'TEMPRANO', pal.rival, 15);
          jugo.chispas(ox, oy - 8, 5, pal.mudo, 24, 0.3);
          jugo.sacudir(1);
        }
      } else if (ev.tipo === 'robado') {
        muerto = { x: ox, y: oy, vida: MUERTE_S, canon: o?.tipo === 'canon', cs: false };
        tiros.length = 0;
        jugo.texto(ox, oy - 26, ev.por === 'torre' ? 'SE LO LLEVÓ LA TORRE' : 'SE LO LLEVÓ LA OLEADA', pal.rival, 13);
        jugo.destellar(pal.rival, 0.18);
        jugo.sacudir(1.4);
        derrota();
      } else if (ev.tipo === 'objetivo' && ev.nuevaFase && ev.fase > 0) {
        jugo.texto(MUNDO[0] / 2, 30, NOMBRES[ev.fase], mezcla(pal.tinta, pal.oro, 0.4), 22);
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    let golpe = pedido;
    pedido = false;
    for (const ev of entradas.sacar()) if (ev.tipo === 'toque' || TECLAS.includes(ev.k)) golpe = true;
    avanzar(e, golpe ? { golpe: true } : null);
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
    golpeAliado = Math.max(0, golpeAliado - dt);
    golpeMio = Math.max(0, golpeMio - dt);
    if (muerto) { muerto.vida -= dt; if (muerto.vida <= 0) muerto = null; }
    for (const p of tiros) p.vida -= dt;
    for (let k = tiros.length - 1; k >= 0; k -= 1) if (tiros[k].vida <= 0) tiros.splice(k, 1);
    if (e.cd <= 0) cdMax = A.cdS;
    escena(datosDeEscena());
  }

  caja.dataset.arcade = 'last_hit';
  presentar(lienzo, { linea: 'Rematá cuando la barra entre en lo dorado. Cinco minions: la oleada, el cañón y bajo la torre.', demo, reducido }).then(() => {
    t = 0;
    golpeAliado = 0;
    muerto = null;
    tiros.length = 0;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
