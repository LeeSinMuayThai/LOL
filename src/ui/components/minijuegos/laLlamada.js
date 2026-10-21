import { unaSolaVez, dificultadDe } from './comun.js';
import { mulberry32 } from '../../../core/rng.js';
import { BALANCE } from '../../../data/balance.js';
import { parametros, crear, avanzar, resultadoDe, detalleDe, FASES } from '../../arcade/llamada.js';
import { crearMarco, crearEntradas, crearJugo, crearBucle, presentar, motionReducido, tinte, mezcla } from '../../arcade/kit.js';
import { campeon } from '../../arcade/sprites.js';
import { ding, golpe as sonidoGolpe, derrota, tick, flash as sonidoFlash } from '../../sonido.js';

// La Llamada (rehecha en M4, ola H entrega 2). Antes era un botón "¡Ahora!" que se prendía a los 2 segundos. Ahora sos el que
// canta la jugada: el mapa con sus relojes (dragón, Barón, Heraldo, torre), el jungla rival visto en alguno y el Flash del
// rival gastado o no. Se abre el objetivo que sale libre y lo cantás (1-4 o un clic) antes de que se cierre la ventana. Tres
// situaciones: más información, señuelos, más rápido. La lógica vive en `ui/arcade/llamada.js` (pura).
//
// Contrato de T6: `montar(container, state, onDone, rngUi, datos)` → `onDone(0..1, { tipo: 'latencia', ms, ventanaMs })`.
// Regla de LATENCIA (G1): `resultadoDeLatencia(latencia media, ventana)`; cantar mal vale la ventana entera. `rngUi` se tira dos veces.

// G1: la ventana la abre `shotcalling` entre estos topes, por encima del piso humano (`g1.pisoHumano.llamadaMs`). La leen
// `components/varaG1.js` (la regla y el "tan cerca") y `ui/arcade/llamada.js`: una sola fuente, `BALANCE.g1.arcade.la_llamada`.
export const VENTANA_MS = BALANCE.g1.arcade.la_llamada.ventanaMs;

const MUNDO = [160, 90];
const SEMILLA = 2 ** 32;
const AL_FINAL_MS = 900;
const TECLAS = ['1', '2', '3', '4'];
// el mapa (izquierda): cada objetivo con su lugar, su nombre y su color
const MAPA = { x: 6, y: 13, lado: 66 };
const OBJ = [
  { nombre: 'DRAGÓN', x: 49, y: 54, color: 'dragon' },
  { nombre: 'BARÓN', x: 21, y: 31, color: 'baron' },
  { nombre: 'HERALDO', x: 51, y: 28, color: 'heraldo' },
  { nombre: 'TORRE', x: 36, y: 42, color: 'aliado' }
];
const ALIADOS = [[12, 66], [17, 69], [22, 64], [10, 60], [26, 70]];
const FILA = { x: 82, y: 15, ancho: 72, alto: 14, paso: 15 };

export function montar(container, state, onDone, rngUi, datos = null) {
  const terminar = unaSolaVez(onDone);
  const reducido = motionReducido();
  const params = parametros({ stat: state.player.stats.shotcalling, dificultad: dificultadDe(state, datos) });
  const azarJuego = mulberry32(Math.floor(rngUi() * SEMILLA));
  const azarFx = mulberry32(Math.floor(rngUi() * SEMILLA));
  const e = crear(params, azarJuego);
  const pend = [];
  const { caja, lienzo } = crearMarco(container, {
    clase: 'arc--llamada',
    mundo: MUNDO,
    etiqueta: 'La llamada: cantá el objetivo que se abre libre antes de que se cierre la ventana',
    botones: OBJ.map((o, i) => ({ texto: o.nombre, tecla: String(i + 1), alTocar: () => { pend.push(i); } })),
    pie: 'Cantá con 1 a 4 o tocando el objetivo. Se abre el que llega a cero sin el jungla rival encima (si su Flash está gastado, va igual).'
  });
  const pal = lienzo.paleta;
  const { ctx } = lienzo;
  const entradas = crearEntradas(lienzo, { teclas: TECLAS });
  const jugo = crearJugo(azarFx, reducido);
  const aliados = ALIADOS.map(([x, y]) => ({ x, y }));
  let t = 0;
  let bucle = null;
  let ultimoTick = -1;

  const color = (i) => pal[OBJ[i].color];
  const texto = (s, x, y, { tam = 9, col = pal.tinta, al = 'center', peso = 700 } = {}) => {
    ctx.font = `${peso} ${lienzo.px(tam)}px ${pal.fuente}`;
    ctx.textAlign = al;
    ctx.fillStyle = tinte(col);
    ctx.fillText(s, x, y);
  };
  const reloj = (s) => (s <= 0 ? 'YA' : `${String(s.toFixed(1)).replace('.', ',')} s`);

  function mapa(f, abierta) {
    ctx.fillStyle = tinte(pal.hundido, 0.9);
    ctx.beginPath();
    ctx.roundRect(MAPA.x, MAPA.y, MAPA.lado, MAPA.lado, 3);
    ctx.fill();
    ctx.save();
    ctx.clip();
    // el río y las líneas: la Grieta vista desde arriba
    ctx.strokeStyle = tinte(pal.rio, 0.5);
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(MAPA.x, MAPA.y + MAPA.lado); ctx.lineTo(MAPA.x + MAPA.lado, MAPA.y); ctx.stroke();
    ctx.strokeStyle = tinte(pal.mudo, 0.35);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(MAPA.x + 4, MAPA.y + MAPA.lado - 4); ctx.lineTo(MAPA.x + 4, MAPA.y + 4); ctx.lineTo(MAPA.x + MAPA.lado - 4, MAPA.y + 4);
    ctx.moveTo(MAPA.x + 4, MAPA.y + MAPA.lado - 4); ctx.lineTo(MAPA.x + MAPA.lado - 4, MAPA.y + MAPA.lado - 4); ctx.lineTo(MAPA.x + MAPA.lado - 4, MAPA.y + 4);
    ctx.stroke();
    ctx.restore();
    // los objetivos
    f.objetivos.forEach((o, i) => {
      const { x, y } = OBJ[i];
      const queda = Math.max(0, o.reloj - f.t);
      const sale = abierta && o.reloj <= f.setupS + 1e-6;
      const elegida = f.llamada?.objetivo === i;
      const tam = 5.2 + (sale && !f.llamada ? Math.sin(t * 14) * 0.5 : 0);
      ctx.save();
      ctx.shadowColor = tinte(color(i), sale ? 0.95 : 0.4);
      ctx.shadowBlur = lienzo.px(sale ? 22 : 8);
      ctx.fillStyle = tinte(mezcla(pal.hundido, color(i), sale ? 0.7 : 0.3));
      ctx.beginPath(); ctx.arc(x, y, tam, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = tinte(elegida ? pal.oro : color(i), 0.95);
      ctx.lineWidth = elegida ? 1.3 : 0.7;
      ctx.beginPath(); ctx.arc(x, y, tam, 0, Math.PI * 2); ctx.stroke();
      texto(String(i + 1), x, y + 1.6, { tam: 11, peso: 800 });
      texto(queda > 0 ? reloj(queda) : '', x, y + 10.5, { tam: 8, col: pal.tenue });
      if (o.jungla) {
        campeon(ctx, x + 6.5, y - 5.5, 2.6, { borde: pal.rival, retrato: { img: null, iniciales: 'J' }, pal, px: lienzo.px, brillo: 0.5 });
      }
      if (o.flash) texto('F', x - 6.5, y - 4, { tam: 9, col: pal.rival, peso: 800 });
    });
    // tu equipo: va al objetivo que cantaste
    const destino = f.llamada?.objetivo != null ? OBJ[f.llamada.objetivo] : null;
    aliados.forEach((a, k) => {
      const base = ALIADOS[k];
      const mx = destino ? destino.x + (k - 2) * 2.4 : base[0];
      const my = destino ? destino.y + 7 + (k % 2) * 2 : base[1];
      a.x += (mx - a.x) * (reducido ? 1 : 0.04);
      a.y += (my - a.y) * (reducido ? 1 : 0.04);
      campeon(ctx, a.x, a.y + (destino ? 0 : Math.sin(t * 3 + k) * 0.5), 2.7, { borde: pal.aliado, retrato: { img: null, iniciales: '' }, pal, px: lienzo.px, brillo: 0.4 });
    });
    texto('TU EQUIPO', 22, MAPA.y + MAPA.lado - 0.2, { tam: 8, col: pal.aliado });
  }

  // La lista de la derecha: el reloj de cada objetivo y sus marcas (el jungla rival, el Flash gastado).
  function lista(f, abierta) {
    f.objetivos.forEach((o, i) => {
      const y = FILA.y + i * FILA.paso;
      const queda = Math.max(0, o.reloj - f.t);
      const sale = abierta && o.reloj <= f.setupS + 1e-6;
      const elegida = f.llamada?.objetivo === i;
      const correcta = f.llamada && i === f.correcto;
      ctx.fillStyle = tinte(correcta ? mezcla(pal.hundido, pal.bien, 0.4) : elegida ? mezcla(pal.hundido, pal.rival, 0.4) : pal.hundido, 0.9);
      ctx.beginPath(); ctx.roundRect(FILA.x, y, FILA.ancho, FILA.alto, 2); ctx.fill();
      ctx.strokeStyle = tinte(sale && !f.llamada ? pal.oro : color(i), sale && !f.llamada ? 0.95 : 0.45);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      texto(String(i + 1), FILA.x + 4, y + 9.4, { tam: 12, col: color(i), peso: 800 });
      texto(OBJ[i].nombre, FILA.x + 9, y + 6.2, { tam: 9, al: 'left' });
      texto(o.jungla ? 'jungla rival visto' : 'sin jungla rival', FILA.x + 9, y + 12, { tam: 8, col: o.jungla ? pal.rival : pal.mudo, al: 'left' });
      texto(reloj(queda), FILA.x + FILA.ancho - 3, y + 7, { tam: 10, col: queda <= 0 ? pal.oro : pal.tinta, al: 'right' });
      texto(o.flash ? 'Flash gastado' : o.jungla ? 'Flash arriba' : '', FILA.x + FILA.ancho - 3, y + 12.6, { tam: 8, col: o.flash ? pal.aviso : pal.mudo, al: 'right' });
    });
  }

  function escena(f) {
    const off = jugo.desplazamiento();
    lienzo.empezar(off.x, off.y);
    const fondo = ctx.createRadialGradient(MUNDO[0] / 2, 35, 6, MUNDO[0] / 2, 45, 120);
    fondo.addColorStop(0, tinte(mezcla(pal.elevado, pal.aliado, 0.08)));
    fondo.addColorStop(1, tinte(pal.fondo));
    ctx.fillStyle = fondo;
    ctx.fillRect(-4, -4, MUNDO[0] + 8, MUNDO[1] + 8);
    const abierta = f.estado === 'abierta' || (f.estado === 'entre' && f.llamada?.motivo !== 'temprano');
    mapa(f, abierta);
    lista(f, abierta);
    // la barra de la ventana: se vacía en `ventanaMs` desde la señal
    const bx = FILA.x; const by = FILA.y + 4 * FILA.paso + 1; const bw = FILA.ancho;
    ctx.fillStyle = tinte(pal.hundido, 0.9);
    ctx.fillRect(bx, by, bw, 3);
    if (f.estado === 'abierta') {
      const u = 1 - ((f.t - f.setupS) * 1000) / e.p.ventanaMs;
      ctx.fillStyle = tinte(mezcla(pal.rival, pal.bien, Math.max(0, u)));
      ctx.fillRect(bx, by, bw * Math.max(0, u), 3);
    } else if (f.estado === 'setup') {
      ctx.fillStyle = tinte(pal.aviso, 0.7);
      ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, f.t / f.setupS)), 3);
    }
    texto(f.estado === 'setup' ? 'LEÉ EL MAPA' : f.estado === 'abierta' ? '¡CANTÁ!' : f.llamada?.ok ? 'BIEN CANTADA' : 'MAL CANTADA', bx + bw / 2, by + 10, { tam: 11, col: f.estado === 'abierta' ? pal.oro : f.llamada ? (f.llamada.ok ? pal.bien : pal.rival) : pal.tenue });
    // arriba: la situación y las tres llamadas
    texto(`SITUACIÓN ${e.iFase + 1} DE ${FASES} · ${['MÁS INFORMACIÓN', 'SEÑUELOS', 'MÁS RÁPIDO'][e.iFase]}`, 8, 8.6, { tam: 10, al: 'left' });
    e.llamadas.forEach((l, k) => {
      const x = MUNDO[0] - 10 - (FASES - 1 - k) * 22;
      texto(l.ok ? `${Math.round(l.ms)} ms` : l.motivo === 'temprano' ? 'TEMPRANO' : l.motivo === 'tarde' ? 'TARDE' : 'MAL', x, 8.6, { tam: 9, col: l.ok ? pal.bien : pal.rival, al: 'right' });
    });
    // abajo: lo que pasa (la ventana y la media a la vista)
    const medio = e.llamadas.length ? e.llamadas.reduce((s, l) => s + l.ms, 0) / e.llamadas.length : null;
    texto(`ventana ${Math.round(e.p.ventanaMs)} ms${medio === null ? '' : ` · tu media ${Math.round(medio)} ms`}`, 8, MUNDO[1] - 3.5, { tam: 9, col: pal.tenue, al: 'left' });
    jugo.dibujar(ctx, lienzo);
    lienzo.empezar();
    jugo.dibujarDestello(ctx, lienzo);
  }

  function dibujar(dt) {
    t += dt;
    const f = e.fase;
    // el tic-tac de los relojes en los últimos 3 segundos de la espera
    if (f.estado === 'setup' && e.espera <= 0) {
      const resta = Math.ceil(f.setupS - f.t);
      if (resta <= 3 && resta !== ultimoTick) { ultimoTick = resta; tick(); }
    }
    escena(f);
  }

  function demo(_ctx, u) {
    const f = {
      i: 0, setupS: 1, t: u * 1.5, estado: u * 1.5 < 1 ? 'setup' : 'abierta', correcto: 0, llamada: null,
      objetivos: [{ reloj: 1, jungla: false, flash: false }, { reloj: 2.3, jungla: true, flash: false }, { reloj: 1.9, jungla: false, flash: true }, { reloj: 2.8, jungla: false, flash: false }]
    };
    t = u * 3;
    escena(f);
  }

  function procesarEventos() {
    for (const ev of e.eventos) {
      if (ev.tipo === 'senal') {
        jugo.destellar(pal.oro, 0.28);
        jugo.sacudir(1.2);
        sonidoFlash();
      } else if (ev.tipo === 'llamada') {
        const o = OBJ[ev.objetivo ?? e.fase.correcto];
        if (ev.ok) {
          jugo.chispas(o.x, o.y, 36, pal.oro, 40, 0.7);
          jugo.texto(o.x, o.y - 9, `${Math.round(ev.ms)} ms`, pal.bien, 16);
          jugo.camaraLenta(0.4, 300);
          ding();
        } else {
          const bien = OBJ[e.fase.correcto];
          jugo.sacudir(3.5);
          jugo.destellar(pal.rival, 0.3);
          jugo.parar(80);
          jugo.texto(MAPA.x + MAPA.lado / 2, MAPA.y + 22, ev.motivo === 'temprano' ? 'TEMPRANO' : ev.motivo === 'tarde' ? 'SE CERRÓ' : 'MAL CANTADA', pal.rival, 22);
          jugo.chispas(bien.x, bien.y, 18, pal.bien, 30, 0.6);
          (ev.motivo === 'mal' || ev.motivo === 'temprano' ? sonidoGolpe : derrota)();
        }
      } else if (ev.tipo === 'fase') {
        ultimoTick = -1;
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
        let mejor = -1; let dMin = 12;
        OBJ.forEach((o, i) => {
          const d = Math.hypot(ev.x - o.x, ev.y - o.y);
          if (d < dMin) { dMin = d; mejor = i; }
          if (ev.x >= FILA.x && ev.y >= FILA.y + i * FILA.paso && ev.y <= FILA.y + i * FILA.paso + FILA.alto) { mejor = i; dMin = 0; }
        });
        if (mejor >= 0) pend.push(mejor);
      }
    }
    const llamar = pend.length ? pend.shift() : undefined;
    avanzar(e, llamar === undefined || e.espera > 0 ? null : { llamar });
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

  caja.dataset.arcade = 'la_llamada';
  presentar(lienzo, { linea: 'Cantá el objetivo que se abre libre, antes de que se cierre la ventana.', demo, reducido }).then(() => {
    entradas.sacar();
    t = 0;
    bucle = crearBucle({ alPaso: paso, alDibujar: dibujar, jugo });
  });
}
