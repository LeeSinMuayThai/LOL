// UNA LINEA (PLANUI §4.9, regla 8; LINEA.md §4.5): el reloj de los momentos.
//
// Un momento es una secuencia de beats (apagon -> golpe de luz -> revelacion -> asentarse -> loop vivo), no un fundido.
// Este helper le da a toda la secuencia UN reloj `t` (ms desde iniciar()), que comparten:
//   - las animaciones WAAPI de la pantalla, creadas con delays ABSOLUTOS desde t = 0 (las mueve por startTime/currentTime);
//   - los participantes que no son WAAPI (un canvas: la copa, el confeti), que se dibujan con su en(t).
//
//   import { crearBeats } from './beats.js';
//   const b = crearBeats({ duracion: 5000, asentarse: 4600 });
//   b.agregar(trofeo);                                            // { en(t, fijo?), fps?, saltar?, pausar?, reanudar?, destruir? }
//   b.waapi(animar(nodo, cuadros, { delay: 1200, dur: 400 }));     // una Animation, una lista o null (INST/reducido)
//   const td = b.destello(220); if (td != null) amb.pulso('gloria', td);   // <= 3 destellos/s: lo corre o lo descarta
//   b.esperar(1800).then((llego) => llego && sonido.golpe?.());     // false si saltar() lo paso de largo
//   b.esperar(4600).then(() => (asentado = true));
//   b.iniciar();
//   // la pantalla expone: congelar(ms) -> b.congelar(ms); Espacio -> b.saltar(); pausar/reanudar; destruir -> b.destruir()
//
// Las reglas que hace cumplir:
//   - congelar(t) lleva TODO a t (las animaciones y cada en(t)) y se queda quieto: la captura de una tira es fiel. No
//     dispara ningun esperar(): un `esperar().then(muestra(...))` no puede saltar de pantalla porque una tira busco
//     mas adelante (la trampa de mercado.js).
//   - saltar() va a `asentarse` (Espacio), nunca finish(): finish() truena con un loop infinito. Lo que estaba antes
//     de asentarse resuelve su esperar() con false (los sonidos no suenan todos juntos).
//   - Con INST o movimiento reducido no hay secuencia: iniciar() dibuja a los participantes en `duracion` (el cuadro
//     final) y queda quieto; esperar() resuelve ya con false y destello() devuelve null (sin destellos).
//   - destello(t): <= 3 por segundo en cualquier ventana de 1 s (separacion minima de SEPARACION ms). El que no entra
//     se corre hasta CORRIMIENTO_MAX ms; si no, se descarta (devuelve null). Pasa por aca todo lo que destella en el
//     momento (amb.pulso, fogonazos, VICTORIA...), asi la suma se respeta.
//   - Con la pestana oculta el reloj no dibuja (requestAnimationFrame no corre); los participantes limitan sus fps con
//     su campo `fps` (la copa, 30).
import { inst, reducido } from './util.js';

const DESTELLOS_POR_SEGUNDO = 3;
const SEPARACION = Math.ceil(1000 / DESTELLOS_POR_SEGUNDO) + 1;
const CORRIMIENTO_MAX = 240;
const FPS_DEF = 60;
const HOLGURA_CUADRO = 2; // ms de tolerancia al limitar los fps de un participante

const ahoraLinea = () => document.timeline?.currentTime ?? performance.now();

export function crearBeats({ duracion, asentarse = duracion } = {}) {
  const animaciones = new Set();
  const participantes = []; // { p, ultimo }
  let esperas = []; // { t, resolver }
  const destellos = [];
  // 'nuevo' | 'corriendo' | 'pausado' | 'congelado' | 'quieto' | 'muerto'
  let estado = 'nuevo';
  let base = 0; // el tiempo de la linea de tiempo del documento que corresponde a t = 0
  let tQuieto = 0; // el t en el que quedo (pausado, congelado o quieto)
  let raf = 0;

  const ahora = () => (estado === 'corriendo' ? Math.max(0, ahoraLinea() - base) : tQuieto);

  function moverAnimacion(a) {
    try {
      if (estado === 'corriendo') a.startTime = base;
      else {
        a.pause();
        a.currentTime = tQuieto;
      }
    } catch {
      /* animacion sin linea de tiempo valida */
    }
  }
  // un cuadro suelto (iniciar, congelar, saltar, el cuadro final): en(t, true) le avisa al participante que no es parte
  // de una corrida (la copa lo dibuja a escala plena, sin su resolucion adaptativa)
  function dibujar(t) {
    for (const x of participantes) {
      x.ultimo = ahoraLinea();
      x.p.en?.(t, true);
    }
  }
  function resolverHasta(t, llego) {
    const quedan = [];
    for (const e of esperas) {
      if (e.t <= t) e.resolver(llego);
      else quedan.push(e);
    }
    esperas = quedan;
  }
  function bucle(marca) {
    raf = requestAnimationFrame(bucle);
    if (estado !== 'corriendo' || document.hidden) return;
    const t = Math.max(0, marca - base);
    if (esperas.length) resolverHasta(t, true);
    for (const x of participantes) {
      const min = 1000 / (x.p.fps ?? FPS_DEF) - HOLGURA_CUADRO;
      if (marca - x.ultimo < min) continue;
      x.ultimo = marca;
      x.p.en?.(t);
    }
  }

  const api = {
    duracion,
    asentarse,
    get quieto() {
      return estado === 'quieto';
    },
    get estado() {
      return estado;
    },
    ahora,
    // Registra animaciones WAAPI (delays absolutos desde t = 0). Acepta una Animation, una lista o null.
    waapi(lista) {
      for (const a of [].concat(lista ?? [])) {
        if (!a || animaciones.has(a)) continue;
        animaciones.add(a);
        if (estado === 'quieto') {
          try {
            a.pause();
            a.currentTime = duracion;
          } catch {
            /* sin linea de tiempo */
          }
        } else if (estado !== 'nuevo' && estado !== 'muerto') moverAnimacion(a);
      }
      return lista;
    },
    // Registra un participante: { en(t), fps?, saltar?(), pausar?(), reanudar?(), destruir?() }.
    agregar(p) {
      if (!p) return p;
      participantes.push({ p, ultimo: 0 });
      if (estado === 'quieto' || estado === 'congelado' || estado === 'pausado') p.en?.(tQuieto, true);
      return p;
    },
    destello(t) {
      if (inst() || reducido()) return null;
      let x = t;
      for (let i = 0; i < destellos.length + 1; i++) {
        const choca = destellos.find((d) => Math.abs(d - x) < SEPARACION);
        if (choca == null) break;
        x = choca + SEPARACION;
      }
      if (x - t > CORRIMIENTO_MAX || destellos.some((d) => Math.abs(d - x) < SEPARACION)) return null;
      destellos.push(x);
      return x;
    },
    esperar(t) {
      if (estado === 'muerto') return new Promise(() => {});
      if (estado === 'quieto' || inst() || reducido()) return Promise.resolve(false);
      return new Promise((resolver) => esperas.push({ t, resolver }));
    },
    iniciar() {
      if (estado === 'muerto') return;
      if (inst() || reducido()) {
        estado = 'quieto';
        tQuieto = duracion;
        for (const a of animaciones) {
          try {
            a.pause();
            a.currentTime = duracion;
          } catch {
            /* sin linea de tiempo */
          }
        }
        resolverHasta(Infinity, false);
        dibujar(duracion);
        return;
      }
      base = ahoraLinea();
      estado = 'corriendo';
      for (const a of animaciones) moverAnimacion(a);
      for (const x of participantes) x.ultimo = 0;
      dibujar(0);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(bucle);
    },
    // Lleva todo a t y se queda quieto (las capturas). No resuelve ningun esperar().
    congelar(t) {
      if (estado === 'muerto') return;
      tQuieto = Math.max(0, t);
      if (estado !== 'quieto') estado = 'congelado';
      for (const a of animaciones) moverAnimacion(a);
      dibujar(tQuieto);
    },
    // Espacio: al asentarse. Lo pendiente de antes resuelve con false.
    saltar() {
      if (estado === 'muerto' || estado === 'quieto' || estado === 'nuevo') return;
      if (ahora() >= asentarse) return;
      resolverHasta(asentarse, false);
      if (estado === 'corriendo') base = ahoraLinea() - asentarse;
      else tQuieto = asentarse;
      for (const a of animaciones) moverAnimacion(a);
      for (const x of participantes) x.p.saltar?.();
      dibujar(asentarse);
    },
    pausar() {
      if (estado !== 'corriendo') return;
      tQuieto = ahora();
      estado = 'pausado';
      for (const a of animaciones) moverAnimacion(a);
      for (const x of participantes) x.p.pausar?.();
    },
    reanudar() {
      if (estado !== 'pausado' && estado !== 'congelado') return;
      // lo que congelar() dejo atras no suena de golpe al volver
      if (estado === 'congelado') resolverHasta(tQuieto, false);
      base = ahoraLinea() - tQuieto;
      estado = 'corriendo';
      for (const a of animaciones) moverAnimacion(a);
      for (const x of participantes) x.p.reanudar?.();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(bucle);
    },
    // Corta todo. Con { participantes: false } los deja vivos (repetir() reusa la copa y su contexto WebGL).
    destruir({ participantes: conParticipantes = true } = {}) {
      if (estado === 'muerto') return;
      estado = 'muerto';
      cancelAnimationFrame(raf);
      for (const a of animaciones) {
        try {
          a.cancel();
        } catch {
          /* ya cancelada */
        }
      }
      animaciones.clear();
      esperas = [];
      if (conParticipantes) for (const x of participantes) x.p.destruir?.();
      participantes.length = 0;
    },
  };
  return api;
}
