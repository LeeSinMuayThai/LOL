import { unaSolaVez, dificultadDe, varaEfectivaDe } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, cargaRival, resultadoDe, detalleDe, FASES } from '../../arcade/baron.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { bestia, campeon, rayo, minion } from '../../arcade/sprites.js';
import { golpe as sonidoGolpe, flash as sonidoFlash, latido, derrota } from '../../sonido.js';

// Robar el Barón (fase 4; rehecho en H3k, PLANUI §0.10 "El arcade"). Antes era una barrita con un botón "¡Smite ya!". Ahora es
// el pozo: tres objetivos en fila (el dragón, Atakhan y el Barón), los dos equipos pegándole, la vida que acelera cerca de
// la zona, golpes grandes que se ven venir, pausas sin aviso y el jungla rival con su smite cargando. Un smite por
// objetivo, con Espacio, F o un toque. La lógica vive en `ui/arcade/baron.js` (pura: la corre `dev/arcade-humano.js`).
//
// Contrato de siempre: `montar(container, state, onDone, rngUi, datos)` y `onDone(resultado 0..1, detalle)` una sola vez.
// Regla de DISTANCIA (G1): la zona dibujada es `radioDeLaZona(vara)` de cada lado del centro, y pasa si los TRES smites
// caen en su zona (el resultado es el peor de los tres). `rngUi` se tira dos veces: la semilla del juego y la del jugo.
export { ESCALA_DISTANCIA } from '../../arcade/baron.js';

const MUNDO = [160, 90];
const SEMILLA = 2 ** 32;
const NOMBRES = ['EL DRAGÓN', 'ATAKHAN', 'EL BARÓN'];
const COLOR_FASE = ['dragon', 'atakhan', 'baron'];
const TAMANO_FASE = [11, 12.5, 14];
const CUERNOS_FASE = [2, 3, 5];
const POZO = { x: 80, y: 56 };
const ALIADOS = [[30, 50], [24, 66], [40, 80], [50, 64]];
const RIVALES = [[130, 46], [140, 60], [128, 74]];
const JUNGLA_RIVAL = [112, 64];
const YO = [62, 74];
const BARRA = { x: 14, y: 9, ancho: 132, alto: 7 };
const AL_FINAL_MS = 900;
const TIRO_S = 0.14;
const TECLAS = [' ', 'f', 'd', 'enter'];

const enBarra = (v) => BARRA.x + (Math.max(0, Math.min(100, v)) / 100) * BARRA.ancho;

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const params = parametros({ stat: state.player.stats.mecanica, vara: varaEfectivaDe(datos), dificultad: dificultadDe(state, datos) });
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  let pedido = false;
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--baron',
    mundo: MUNDO,
    etiqueta: 'El pozo del Barón: smiteá cuando la vida esté en tu zona',
    botones: [{ texto: 'SMITE', tecla: 'Espacio', alTocar: () => { pedido = true; } }],
    pie: 'Smite con Espacio, F o tocando el pozo. Los tres en su zona.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  const tiros = [];
  const marcas = [];
  let golpeVisual = 0;
  let rayoVisual = null;
  let t = 0;
  let bucle = null;
  let latidoUltimo = 0;

  function colorFase(i) { return pal[COLOR_FASE[i]]; }

  function escena(f, tiempo, { vida, centro, radio, rivalLinea, carga, aviso, amague, i, enJuego }) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    // el fondo: la Grieta de noche y el pozo
    const fondo = ctx.createRadialGradient(POZO.x, POZO.y - 10, 4, POZO.x, POZO.y, 110);
    fondo.addColorStop(0, tinte(mezcla(pal.elevado, colorFase(i), 0.12)));
    fondo.addColorStop(1, tinte(pal.fondo));
    ctx.fillStyle = fondo;
    ctx.fillRect(-4, -4, MUNDO[0] + 8, MUNDO[1] + 8);
    ctx.fillStyle = tinte(pal.hundido, 0.9);
    ctx.beginPath();
    ctx.ellipse(POZO.x, POZO.y + 8, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tinte(mezcla(pal.elevado, pal.tinta, 0.15));
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    // minions perdidos en el río (adorno)
    for (let k = 0; k < 3; k += 1) minion(ctx, 10 + ((tiempo * 6 + k * 9) % 30), 86 - k * 1.5, 2.2, pal.aliado, tiempo + k, pal);
    // la bestia
    const furia = Math.max(0, Math.min(1, 1 - (vida - centro) / 30));
    bestia(ctx, POZO.x, POZO.y - 6, TAMANO_FASE[i], tiempo, { color: colorFase(i), pal, golpe: golpeVisual, furia, cuernos: CUERNOS_FASE[i] });
    // los tiros de los dos equipos
    for (const p of tiros) {
      const u = 1 - p.vida / TIRO_S;
      ctx.strokeStyle = tinte(p.color, 0.9);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(p.x + (POZO.x - p.x) * Math.max(0, u - 0.4), p.y + (POZO.y - 10 - p.y) * Math.max(0, u - 0.4));
      ctx.lineTo(p.x + (POZO.x - p.x) * u, p.y + (POZO.y - 10 - p.y) * u);
      ctx.stroke();
    }
    // los dos equipos
    ALIADOS.forEach(([x, y], k) => campeon(ctx, x, y + Math.sin(tiempo * 3 + k) * 0.6, 3.6, { borde: pal.aliado, pal, px: lienzo.px, brillo: 0.4 }));
    RIVALES.forEach(([x, y], k) => campeon(ctx, x, y + Math.sin(tiempo * 3 + k + 2) * 0.6, 3.6, { borde: pal.rival, pal, px: lienzo.px, brillo: 0.4 }));
    // el jungla rival y su smite que carga (se ve venir)
    const [jx, jy] = JUNGLA_RIVAL;
    if (carga > 0 || amague) {
      ctx.save();
      ctx.shadowColor = tinte(pal.rival, 0.9);
      ctx.shadowBlur = 18 * carga;
      ctx.strokeStyle = tinte(mezcla(pal.rival, pal.oro, carga * 0.6), 0.95);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(jx, jy, 7.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (amague ? 0.92 : carga));
      ctx.stroke();
      ctx.restore();
    }
    campeon(ctx, jx, jy, 5, { borde: pal.rival, pal, px: lienzo.px, brillo: 0.5 + carga * 0.5 });
    ctx.font = `700 ${lienzo.px(10)}px ${pal.fuente}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = tinte(pal.rival);
    ctx.fillText(amague ? '¡AMAGA!' : carga > 0.6 ? 'SMITE RIVAL' : 'JUNGLA RIVAL', jx, jy + 11);
    // vos
    campeon(ctx, YO[0], YO[1], 5.4, { borde: pal.oro, retrato: yo, pal, px: lienzo.px, brillo: 0.7 });
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText('VOS', YO[0], YO[1] + 10.5);
    if (rayoVisual) {
      rayo(ctx, rayoVisual.x, -2, POZO.x, POZO.y - 10, { color: rayoVisual.color, pal, azar: azarFx, ancho: 1.3 });
    }
    jugo.dibujar(ctx, lienzo);
    // la barra de vida con la zona (lo que ves es lo que pasa)
    lienzo.empezar();
    barra({ vida, centro, radio, rivalLinea, aviso, i, enJuego });
    hud(i);
    jugo.dibujarDestello(ctx, lienzo);
  }

  function barra({ vida, centro, radio, rivalLinea, aviso, i, enJuego }) {
    const { x, y, ancho, alto } = BARRA;
    ctx.fillStyle = tinte(pal.hundido, 0.92);
    ctx.fillRect(x - 1, y - 1, ancho + 2, alto + 2);
    const g = ctx.createLinearGradient(x, 0, x + ancho, 0);
    g.addColorStop(0, tinte(mezcla(colorFase(i), pal.fondo, 0.3)));
    g.addColorStop(1, tinte(colorFase(i)));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, enBarra(vida) - x, alto);
    // el golpe grande avisado: el pedazo que se va a llevar, titilando
    if (aviso) {
      ctx.fillStyle = tinte(pal.rival, 0.45 + 0.35 * Math.sin(t * 30));
      ctx.fillRect(enBarra(vida - aviso.monto), y, enBarra(vida) - enBarra(vida - aviso.monto), alto);
    }
    // la zona: el oro, el centro blanco
    const z0 = enBarra(centro - radio);
    const z1 = enBarra(centro + radio);
    ctx.fillStyle = tinte(pal.oro, enJuego ? 0.32 : 0.18);
    ctx.fillRect(z0, y - 2.5, z1 - z0, alto + 5);
    ctx.strokeStyle = tinte(pal.oro);
    ctx.lineWidth = 0.6;
    ctx.strokeRect(z0, y - 2.5, z1 - z0, alto + 5);
    ctx.fillStyle = tinte(pal.blanco);
    ctx.fillRect(enBarra(centro) - 0.25, y - 2.5, 0.5, alto + 5);
    // la línea del smite rival
    const rx = enBarra(rivalLinea);
    ctx.fillStyle = tinte(pal.rival);
    ctx.beginPath();
    ctx.moveTo(rx, y + alto + 1);
    ctx.lineTo(rx - 1.6, y + alto + 4);
    ctx.lineTo(rx + 1.6, y + alto + 4);
    ctx.fill();
    // las marcas de tus smites de este objetivo
    for (const m of marcas.filter((k) => k.i === i)) {
      ctx.fillStyle = tinte(m.adentro ? pal.bien : pal.rival);
      ctx.fillRect(enBarra(m.vida) - 0.5, y - 4, 1, alto + 8);
    }
    ctx.font = `700 ${lienzo.px(10)}px ${pal.fuente}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = tinte(pal.tinta);
    ctx.fillText(`${NOMBRES[i]} · ${Math.max(0, Math.round(vida))}`, x, y - lienzo.px(6));
    ctx.textAlign = 'center';
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText('TU ZONA', (z0 + z1) / 2, y + alto + lienzo.px(14));
  }

  // Las tres fichas de los objetivos (cómo te fue en cada uno) y la vara a la vista.
  function hud(i) {
    const base = MUNDO[0] - 4;
    for (let k = FASES - 1; k >= 0; k -= 1) {
      const x = base - (FASES - 1 - k) * 7;
      const y = MUNDO[1] - 6;
      const s = e.smites[k];
      ctx.fillStyle = tinte(s ? (s.adentro ? pal.bien : pal.rival) : k === i ? pal.oro : pal.mudo, s ? 0.9 : 0.5);
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'right';
    ctx.font = `600 ${lienzo.px(10)}px ${pal.fuente}`;
    ctx.fillStyle = tinte(pal.tenue);
    ctx.fillText(`los 3 a ${String(Math.round(params.radio * 10) / 10).replace('.', ',')} o menos del centro`, base - FASES * 7, MUNDO[1] - 4.5);
  }

  function datosDeEscena(tiempo) {
    const f = e.fase;
    return {
      vida: f.vida, centro: f.centro, radio: f.radio, rivalLinea: f.rival, carga: f.fin ? 0 : cargaRival(e),
      aviso: f.aviso, amague: f.amague > 0, i: f.i, enJuego: !f.fin, tiempo
    };
  }

  // La demo: una barra que baja y un smite fantasma que cae justo en la zona.
  function demo(_ctx, u) {
    const vida = 100 - u * 64;
    const centro = 40;
    const dato = { vida: Math.max(centro, vida), centro, radio: params.radio, rivalLinea: centro - params.radio, carga: u * 0.5, aviso: null, amague: false, i: 2, enJuego: true };
    t = u * 2;
    if (vida <= centro && !rayoVisual) {
      rayoVisual = { x: YO[0], color: pal.oro, vida: 0.4 };
      marcas.push({ i: 2, vida: centro, adentro: true, demo: true });
    }
    escena(null, t, dato);
  }

  function procesarEventos() {
    for (const ev of e.eventos) {
      if (ev.tipo === 'golpe') {
        const [x, y] = azarFx() < 0.55 ? ALIADOS[Math.floor(azarFx() * ALIADOS.length)] : RIVALES[Math.floor(azarFx() * RIVALES.length)];
        tiros.push({ x, y, vida: TIRO_S, color: x < POZO.x ? pal.aliado : pal.rival });
        golpeVisual = Math.max(golpeVisual, 0.25);
      } else if (ev.tipo === 'grande') {
        golpeVisual = 1;
        jugo.sacudir(2.2);
        jugo.chispas(POZO.x, POZO.y - 12, 14, pal.rival, 40);
        jugo.texto(POZO.x + 14, POZO.y - 22, `-${Math.round(ev.monto)}`, pal.rival, 16);
        sonidoGolpe();
      } else if (ev.tipo === 'smite') {
        rayoVisual = { x: YO[0], color: pal.oro, vida: 0.35 };
        marcas.push({ i: e.fase.i, vida: ev.vida, adentro: ev.adentro });
        jugo.parar(90);
        jugo.camaraLenta(0.3, 420);
        jugo.sacudir(ev.adentro ? 3.5 : 1.5);
        jugo.destellar(ev.adentro ? pal.oro : pal.rival, 0.4);
        jugo.chispas(POZO.x, POZO.y - 12, ev.adentro ? 46 : 16, ev.adentro ? pal.oro : pal.mudo, 55, 0.8);
        const lejos = Math.round(ev.d * 10) / 10;
        jugo.texto(POZO.x, POZO.y - 26, ev.adentro ? '¡ES TUYO!' : ev.vida > ev.centro ? 'TEMPRANO' : 'TARDE', ev.adentro ? pal.oro : pal.rival, 26);
        jugo.texto(POZO.x, POZO.y - 14, `a ${lejos} del centro`, pal.tinta, 13);
        sonidoFlash();
      } else if (ev.tipo === 'robado') {
        rayoVisual = { x: JUNGLA_RIVAL[0], color: pal.rival, vida: 0.35 };
        jugo.sacudir(3);
        jugo.destellar(pal.rival, 0.45);
        jugo.texto(POZO.x, POZO.y - 24, 'TE LO ROBARON', pal.rival, 24);
        derrota();
      } else if (ev.tipo === 'amague') {
        jugo.texto(JUNGLA_RIVAL[0], JUNGLA_RIVAL[1] - 10, '¡!', pal.rival, 20);
      } else if (ev.tipo === 'fase') {
        jugo.texto(MUNDO[0] / 2, MUNDO[1] / 2 - 10, NOMBRES[ev.i], mezcla(pal.tinta, colorFase(ev.i), 0.4), 30);
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    let smite = pedido;
    pedido = false;
    for (const ev of entradas.sacar()) if (ev.tipo === 'toque' || TECLAS.includes(ev.k)) smite = true;
    avanzar(e, smite ? { smite: true } : null);
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
    golpeVisual = Math.max(0, golpeVisual - dt * 5);
    for (const p of tiros) p.vida -= dt;
    for (let k = tiros.length - 1; k >= 0; k -= 1) if (tiros[k].vida <= 0) tiros.splice(k, 1);
    if (rayoVisual) { rayoVisual.vida -= dt; if (rayoVisual.vida <= 0) rayoVisual = null; }
    const d = datosDeEscena(t);
    // el latido: cuando la vida entra a la rampa, el corazón se acelera
    if (!e.fase.fin && d.vida - d.centro < 20 && t - latidoUltimo > 0.7) { latidoUltimo = t; latido(1); }
    escena(null, t, d);
  }

  caja.dataset.arcade = 'robar_baron';
  presentar(lienzo, { linea: 'Smiteá cuando la vida esté en tu zona dorada. Tres objetivos, los tres adentro.', demo, reducido }).then(() => {
    marcas.length = 0;
    rayoVisual = null;
    t = 0;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
