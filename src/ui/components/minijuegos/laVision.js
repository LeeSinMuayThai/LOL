import { unaSolaVez, dificultadDe, varaEfectivaDe } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, posicionEn, CAMPS, CAZAS, FASES } from '../../arcade/vision.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, retratoDe, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon, minion } from '../../arcade/sprites.js';
import { golpe as sonidoGolpe, flash as sonidoFlash, derrota, tick } from '../../sonido.js';

// La visión (fase 9R4c; rehecho en la ola H, M2). Antes eran seis botones con nombre de zona. Ahora es el mapa con niebla de
// guerra: el jungla rival cruza su selva y tenés pocos wards para ponerlos donde va a aparecer, ANTES de que llegue. Las
// pistas te dicen para qué lado va (un ward lo ve en un campamento, falta uno, una línea empuja) y en las fases altas algunas
// mienten y hay menos tiempo. Cada vez que lo cazás cuenta: la regla es de CONTEO (G1), N = `g1.conteo.la_vision` cacerías.
// La lógica vive en `ui/arcade/vision.js` (pura: la corre `dev/arcade-humano.js`).
//
// Contrato de siempre: `montar(container, state, onDone, rngUi, datos)` y `onDone(resultado 0..1, detalle)` una sola vez.
// `rngUi` se tira dos veces: la semilla del juego y la del jugo.
// G-fix-vara: cuántas cacerías hay, en `BALANCE.g1.conteo` (de ahí el motor saca el techo de la vara: nunca todas).
export const A_OSCURAS = CAZAS;

const MUNDO = [160, 100];
const OX = 58;
const SEMILLA = 2 ** 32;
const AL_FINAL_MS = 900;
const TECLAS = ['1', '2', '3', '4', '5', '6'];
const FLASH_PISTA_S = 1.3;
const GRADO_REVELADO = 0.38;

const mp = (x) => OX + x;
const textoDe = (p) => {
  if (p.tipo === 'ward') return `Un ward lo ve en ${CAMPS[p.camp].nombre}`;
  if (p.tipo === 'falta') return `Falta ${CAMPS[p.camp].nombre}`;
  return `La línea de ${p.lado} empuja`;
};
// cuántas cacerías hacen falta: el menor k con k / total >= vara (como la regla de `varaG1.js`)
function necesarias(vara, total) {
  for (let k = 0; k <= total; k += 1) if (k / total >= vara) return k;
  return total;
}

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const vara = varaEfectivaDe(datos);
  const params = parametros({ stat: state.player.stats.macro, vara, dificultad: dificultadDe(state, datos) });
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  const hacen = vara === null ? null : necesarias(vara, CAZAS);
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--vision',
    mundo: MUNDO,
    etiqueta: 'El mapa con niebla: poné tus wards donde va a pasar el jungla rival antes de que llegue',
    pie: 'Tocá el mapa para poner un ward (o apretá 1 a 6 para ponerlo en un campamento). Leé las pistas: algunas mienten.'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const yo = retratoDe(state);
  const avisos = [];
  let t = 0;
  let bucle = null;

  function terreno(alfa) {
    ctx.globalAlpha = alfa;
    const g = ctx.createLinearGradient(OX, 100, OX + 100, 0);
    g.addColorStop(0, tinte(mezcla(pal.hundido, pal.aliado, 0.14)));
    g.addColorStop(1, tinte(mezcla(pal.hundido, pal.rival, 0.14)));
    ctx.fillStyle = g;
    ctx.fillRect(OX, 0, 100, 100);
    ctx.strokeStyle = tinte(pal.rio, 0.3);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(mp(4), 4);
    ctx.lineTo(mp(96), 96);
    ctx.stroke();
    ctx.strokeStyle = tinte(mezcla(pal.elevado, pal.tinta, 0.25), 0.9);
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    for (const pts of [[[6, 94], [6, 6], [94, 6]], [[6, 94], [94, 6]], [[6, 94], [94, 94], [94, 6]]]) {
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(mp(x), y) : ctx.moveTo(mp(x), y)));
      ctx.stroke();
    }
    // la selva rival: el arco de campamentos
    ctx.strokeStyle = tinte(pal.rival, 0.25);
    ctx.lineWidth = 1;
    ctx.setLineDash([1.2, 1.4]);
    ctx.beginPath();
    CAMPS.forEach((c, k) => (k ? ctx.lineTo(mp(c.x), c.y) : ctx.moveTo(mp(c.x), c.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  function campamentos(c) {
    ctx.font = `700 ${lienzo.px(8)}px ${pal.fuente}`;
    ctx.textAlign = 'center';
    CAMPS.forEach((p, k) => {
      const falta = c.pistas.some((pi) => pi.visible && pi.tipo === 'falta' && pi.camp === k);
      ctx.fillStyle = tinte(falta ? pal.rival : pal.mudo, falta ? 0.35 : 0.5);
      ctx.beginPath();
      ctx.arc(mp(p.x), p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tinte(falta ? pal.rival : pal.tenue, 0.9);
      ctx.lineWidth = 0.5;
      ctx.stroke();
      if (falta) {
        ctx.beginPath();
        ctx.moveTo(mp(p.x) - 1.6, p.y - 1.6);
        ctx.lineTo(mp(p.x) + 1.6, p.y + 1.6);
        ctx.moveTo(mp(p.x) + 1.6, p.y - 1.6);
        ctx.lineTo(mp(p.x) - 1.6, p.y + 1.6);
        ctx.stroke();
      }
      ctx.fillStyle = tinte(falta ? pal.rival : pal.tenue, 0.95);
      ctx.fillText(`${k + 1} ${p.nombre}`, mp(p.x) + (p.x > 60 ? 0 : 0), p.y - 4);
    });
  }

  function empuje(pi, ahora) {
    const arriba = pi.lado === 'arriba';
    const [x, y, dx, dy] = arriba ? [6, 38, 0, -1] : [56, 94, 1, 0];
    const mueve = (ahora * 6) % 6;
    ctx.fillStyle = tinte(pal.aviso, 0.9);
    for (let k = 0; k < 3; k += 1) {
      const u = k * 6 + mueve;
      minion(ctx, mp(x + dx * u), y + dy * u, 2.4, pal.rival, ahora + k, pal);
    }
    ctx.font = `800 ${lienzo.px(8.5)}px ${pal.fuente}`;
    ctx.textAlign = arriba ? 'left' : 'center';
    ctx.fillStyle = tinte(pal.aviso);
    ctx.fillText('EMPUJA', arriba ? mp(10) : mp(x + 8), arriba ? y - 8 : y - 5);
  }

  function ojo(x, y, c, r = 2.2) {
    ctx.fillStyle = tinte(pal.fondo, 0.85);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = tinte(c, 0.95);
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.fillStyle = tinte(c);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.65, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function escena(c, ahora, reveladoFlash = null) {
    const R = params.radio;
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    ctx.fillStyle = tinte(pal.fondo);
    ctx.fillRect(-4, -4, MUNDO[0] + 8, MUNDO[1] + 8);
    // la niebla: el mapa apagado, y adentro del radio de cada ward (y de la pista del ward) se ve de verdad
    terreno(GRADO_REVELADO);
    const discos = c.wards.filter((w) => w.activo).map((w) => ({ x: w.x, y: w.y }));
    const pistaWard = c.pistas.find((p) => p.tipo === 'ward' && p.visible && ahora - p.vistaT < FLASH_PISTA_S);
    if (pistaWard) discos.push({ x: CAMPS[pistaWard.camp].x, y: CAMPS[pistaWard.camp].y });
    if (reveladoFlash) discos.push(reveladoFlash);
    if (discos.length) {
      ctx.save();
      ctx.beginPath();
      for (const d of discos) { ctx.moveTo(mp(d.x) + R, d.y); ctx.arc(mp(d.x), d.y, R, 0, Math.PI * 2); }
      ctx.clip();
      terreno(1);
      ctx.restore();
      ctx.strokeStyle = tinte(pal.bien, 0.7);
      ctx.lineWidth = 0.5;
      for (const d of discos) { ctx.beginPath(); ctx.arc(mp(d.x), d.y, R, 0, Math.PI * 2); ctx.stroke(); }
    }
    campamentos(c);
    for (const pi of c.pistas) if (pi.visible && pi.tipo === 'empuja') empuje(pi, ahora);
    // la ruta, cuando ya se acabó la cacería
    if (c.fin) {
      ctx.strokeStyle = tinte(pal.rival, 0.8);
      ctx.lineWidth = 0.8;
      ctx.setLineDash([1.6, 1.2]);
      ctx.beginPath();
      c.ruta.forEach((k, n) => (n ? ctx.lineTo(mp(CAMPS[k].x), CAMPS[k].y) : ctx.moveTo(mp(CAMPS[k].x), CAMPS[k].y)));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // los wards puestos (los que todavía se están colocando, con su anillo)
    for (const w of c.wards) {
      ojo(mp(w.x), w.y, w.activo ? pal.bien : pal.aviso);
      if (!w.activo) {
        ctx.strokeStyle = tinte(pal.aviso, 0.9);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(mp(w.x), w.y, 3.6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, (c.t - w.desde) / (w.listaEn - w.desde)));
        ctx.stroke();
      }
    }
    // el jungla rival: solo se ve adentro de un radio revelado (o cuando se acabó la cacería)
    const visible = c.fin || discos.some((d) => Math.hypot(d.x - c.pos.x, d.y - c.pos.y) <= R);
    const pos = pistaWard && !c.fin && c.t < 0.2 ? CAMPS[pistaWard.camp] : c.pos;
    if (visible) campeon(ctx, mp(pos.x), pos.y, 3.4, { borde: pal.rival, pal, px: lienzo.px, brillo: 0.8 });
    // la mira del ward: lo que va a ver si lo ponés ahí
    if (!c.fin && c.quedan > 0 && entradas.puntero.visto && entradas.puntero.x >= OX && entradas.puntero.x <= OX + 100) {
      ctx.strokeStyle = tinte(pal.oro, 0.7);
      ctx.fillStyle = tinte(pal.oro, 0.08);
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1.2, 1]);
      ctx.beginPath();
      ctx.arc(entradas.puntero.x, entradas.puntero.y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
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
    panel(c);
    jugo.dibujarDestello(ctx, lienzo);
  }

  function panel(c) {
    ctx.textAlign = 'left';
    ctx.font = `800 ${lienzo.px(11)}px ${pal.display}`;
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText(`FASE ${c.fase + 1} DE ${FASES}`, 4, 9);
    ctx.font = `600 ${lienzo.px(9)}px ${pal.fuente}`;
    ctx.fillStyle = tinte(pal.tenue);
    ctx.fillText(`Cacería ${c.i + 1} de ${CAZAS}`, 4, 15);
    ctx.fillText(['Pistas claras.', 'Hacen falta más pistas, y una miente.', 'Una miente, y hay menos tiempo.'][c.fase], 4, 20.5);
    // los wards que te quedan
    ctx.fillStyle = tinte(pal.tinta);
    ctx.fillText('WARDS', 4, 28);
    for (let k = 0; k < params.wards; k += 1) ojo(26 + k * 7, 26.8, k < c.quedan ? pal.bien : pal.mudo, 2.4);
    // las pistas, en el orden en que aparecen
    ctx.fillStyle = tinte(pal.tinta);
    ctx.fillText('PISTAS', 4, 37);
    c.pistas.filter((p) => p.visible).forEach((p, k) => {
      ctx.fillStyle = tinte(pal.elevado, 0.9);
      ctx.fillRect(3, 39.5 + k * 6.2, 51, 5.2);
      ctx.fillStyle = tinte(p.tipo === 'ward' ? pal.bien : p.tipo === 'falta' ? pal.rival : pal.aviso);
      ctx.fillRect(3, 39.5 + k * 6.2, 0.9, 5.2);
      ctx.fillStyle = tinte(pal.tinta);
      ctx.fillText(textoDe(p), 5.2, 43.4 + k * 6.2);
    });
    // las cacerías: verde cazado, rojo se escapó, dorado la de ahora
    for (let k = 0; k < CAZAS; k += 1) {
      const r = e.cazas[k];
      ctx.fillStyle = tinte(r === undefined ? (k === c.i ? pal.oro : pal.mudo) : r ? pal.bien : pal.rival, r === undefined ? 0.55 : 0.95);
      ctx.beginPath();
      ctx.arc(7 + k * 7.6, 71, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = tinte(pal.tenue);
    ctx.fillText(hacen === null ? 'cada vez que lo cazás, cuenta' : `hacen falta ${hacen} de ${CAZAS}`, 4, 79);
    campeon(ctx, 12, 91, 4.6, { borde: pal.oro, retrato: yo, pal, px: lienzo.px, brillo: 0.7 });
    ctx.fillStyle = tinte(pal.oro);
    ctx.fillText('VOS', 20, 92.5);
  }

  function aviso(txt, color, tam, y = 46) {
    avisos.push({ txt, color, tam, y, vida: 1.5 });
  }

  // La demo: una cacería de ejemplo, con sus pistas, un ward que se pone y el jungla que lo pisa.
  function demo(_ctx, u) {
    const c = crear(params, mulberry32(5)).caza;
    const ahora = Math.max(0, u) * 3.4;
    c.t = ahora;
    t = ahora;
    for (const p of c.pistas) if (p.en <= ahora) { p.visible = true; p.vistaT = p.en; }
    const destino = CAMPS[c.ruta[Math.min(2, c.pasos)]];
    if (ahora > 0.9) c.wards.push({ x: destino.x, y: destino.y, desde: 0.9, listaEn: 1.25, activo: ahora > 1.25 });
    c.quedan = params.wards - c.wards.length;
    c.pos = posicionEn(c, ahora);
    escena(c, ahora);
  }

  function procesarEventos() {
    for (const ev of e.eventos) {
      if (ev.tipo === 'pista') {
        tick();
      } else if (ev.tipo === 'ward') {
        jugo.chispas(mp(ev.x), ev.y, 6, pal.aviso, 18, 0.4);
      } else if (ev.tipo === 'wardListo') {
        jugo.chispas(mp(ev.x), ev.y, 10, pal.bien, 26, 0.5);
        jugo.destellar(pal.bien, 0.06);
      } else if (ev.tipo === 'cazado') {
        const c = e.caza;
        jugo.parar(90);
        jugo.camaraLenta(0.35, 380);
        jugo.sacudir(3);
        jugo.chispas(mp(c.pos.x), c.pos.y, 44, pal.oro, 50, 0.8);
        jugo.destellar(pal.oro, 0.35);
        jugo.texto(mp(c.pos.x), c.pos.y - 7, 'LO VEMOS', pal.bien, 12);
        aviso('¡CAZADO!', pal.oro, 22);
        sonidoFlash();
      } else if (ev.tipo === 'sePerdio') {
        jugo.sacudir(1.5);
        jugo.destellar(pal.rival, 0.25);
        aviso('SE TE ESCAPÓ', pal.rival, 20);
        sonidoGolpe();
        derrota();
      } else if (ev.tipo === 'caza') {
        avisos.length = 0;
      }
    }
    e.eventos.length = 0;
  }

  function paso() {
    let ward = null;
    for (const ev of entradas.sacar()) {
      if (ev.tipo === 'toque') {
        if (ev.x >= OX && ev.x <= OX + 100 && ev.y >= 0 && ev.y <= 100) ward = { x: ev.x - OX, y: ev.y };
      } else if (/^[1-6]$/.test(ev.k)) {
        const p = CAMPS[Number(ev.k) - 1];
        ward = { x: p.x, y: p.y };
      }
    }
    avanzar(e, ward ? { ward } : null);
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
    escena(e.caza, e.caza.t);
  }

  caja.dataset.arcade = 'la_vision';
  presentar(lienzo, { linea: 'El jungla rival cruza su selva: poné los wards donde va a aparecer, antes de que llegue.', demo, reducido }).then(() => {
    t = 0;
    entradas.sacar();
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
