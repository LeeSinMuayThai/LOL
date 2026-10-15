// Lo que comparten las mecánicas del banco de minijuegos (fase 9R4c). Las cinco
// originales (fase 4) resolvían cada una su timing, su teclado y su cierre a
// mano; con once en el catálogo eso serían once formas distintas de hacer lo
// mismo. Acá vive una sola.
//
// Reglas que todas cumplen y que este archivo hace fáciles de cumplir:
//   · cero azar nativo del navegador — entra por `rngUi` (regla invariable 1;
//     el guard de `dev/guards.js` no distingue código de comentario, así que ni
//     se nombra la función acá)
//   · `onDone(0..1)` exactamente una vez (`unaSolaVez`)
//   · se terminan sin mouse (`escuchaTeclado`, y todo blanco es un `<button>`)
//   · `prefers-reduced-motion: reduce` no las rompe (`motionReducido`)
//   · el stat que declara el catálogo abre la ventana (`ventanaPorStat`)

import { BALANCE } from '../../../data/balance.js';
import { radioQuePasa } from '../../../core/minijuegos.js';

// G-fix-vara: los pasos de las mecánicas de conteo de un mapa (el motor saca de acá el techo de la vara).
export const PASOS_DE_CONTEO = BALANCE.g1.conteo;

// La misma preferencia que apaga las animaciones en CSS (base.css). Acá se
// respeta para el TIMING de JS: sin esto el CSS no animaría nada pero el
// minijuego seguiría pidiendo puntería sobre algo que se mueve.
export function motionReducido() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// Fase 12f (§12.5): factor de dificultad que escala por ronda (semis -> final
// -> internacional). Los valores viven en `BALANCE.serie.dificultadMinijuegoPorRonda`
// (regla invariable 3); acá no se repiten.
export function factorDificultadRonda(ronda) {
  return BALANCE.serie.dificultadMinijuegoPorRonda[ronda] ?? 1.0;
}

// G1 (PLANUI §0.9, contrato de G1): con `datos.g1` la dificultad de la ronda la pone el motor. `factorEscalada` (≤ 1)
// multiplica la ventana o el tiempo, así que acá entra como su inverso (la misma forma que `factorDificultadRonda`:
// `ventanaPorStat` divide por la dificultad). El VOD del Profesional, activado en esta ronda (`datos.poderActivo`), la
// hace más lenta: `efecto.velocidad` (0,75 = todo al 75%). Sin `g1`, la dificultad por ronda de siempre.
export function dificultadDe(state, datos) {
  const g1 = datos?.g1;
  if (!g1) return factorDificultadRonda(state?.serie?.ronda);
  const factor = g1.factorEscalada > 0 ? g1.factorEscalada : 1;
  const vod = datos.poderActivo && g1.poder?.id === 'vod' ? g1.poder.efecto?.velocidad : null;
  return (vod > 0 ? vod : 1) / factor;
}

// G1: la vara que se juega en esta ronda, con la misma cuenta que el motor (`systems/serie.js`, `resolverMapaG1`): la vara de
// la decisión menos lo que la bajaron el poder del escenario (`datos.poderActivo`) y la charla del coach elegida
// (`datos.charlaActiva`, con lo que baja en `datos.charla.bajaVara`). `null` si la jugada no es de una final (sin `g1`).
export function varaEfectivaDe(datos) {
  const g1 = datos?.g1;
  if (!g1) return null;
  const poder = datos.poderActivo ? (g1.poder?.efecto?.bajaVara ?? 0) : 0;
  const charla = datos.charlaActiva && datos.charla?.disponible ? (datos.charla.bajaVara ?? 0) : 0;
  return Math.max(0, g1.vara - poder - charla);
}

// G1: la mitad del ancho de la zona que pasa en las mecánicas de distancia (el Barón, el TP). El resultado es
// `1 - max(0, distancia - piso) / escala` (`resultadoDeDistancia`, con el piso humano de `g1.pisoHumano`) y pasa con
// `resultado >= vara`, o sea con `distancia <= piso + (1 - vara) × escala`: ese es el radio, nunca más chico que el piso.
export function radioDeLaZona(vara, escala) {
  return radioQuePasa(vara, escala);
}

// Cuánto amortigua `factorDificultadRonda` el efecto final sobre un timing
// (caída de last hit, velocidad de robarBaron): sin esto, el salto de 1.4x
// en el internacional se sentiría desproporcionado contra el 1.2x de la final.
export const AMORTIGUACION_DIFICULTAD = BALANCE.serie.amortiguacionDificultadMinijuego;

// Regla 2 de PLAN.md §4.6: "los stats corren sus odds, el minijuego decide qué
// hacés con lo que entrenaste". Un stat de 100 nunca regala el acierto y uno de
// 0 nunca lo hace imposible: mueve el ancho de la ventana entre dos topes.
// En fase 12f (§12.5), la dificultad escala por ronda, con un piso (regla
// invariable 3: `BALANCE.serie.pisoVentanaMinijuego`) para que "internacional"
// nunca deje la ventana injugable.
export function ventanaPorStat(valor, minimo, maximo, dificultad = 1.0) {
  const t = Math.max(0, Math.min(100, valor ?? 50)) / 100;
  const base = minimo + (maximo - minimo) * t;
  const piso = minimo * BALANCE.serie.pisoVentanaMinijuego;
  return Math.max(piso, base / (dificultad > 0 ? dificultad : 1.0));
}

// `detalle` (G1): lo que la mecánica sabe de la jugada para el "tan cerca" de después (la zona y dónde frenaste, los ms
// de la llamada). Opcional: la parada lo lee si viene.
export function unaSolaVez(onDone) {
  let usado = false;
  return (resultado, detalle) => {
    if (usado) {
      return;
    }
    usado = true;
    onDone(Math.max(0, Math.min(1, resultado)), detalle);
  };
}

// Devuelve la función que suelta el listener: toda mecánica la llama al
// terminar. Sin esto, el teclado de un minijuego seguiría vivo durante el
// siguiente (y son varios por carrera).
export function escuchaTeclado(manejador) {
  const listener = (evento) => manejador(evento);
  window.addEventListener('keydown', listener);
  return () => window.removeEventListener('keydown', listener);
}

// Un reloj de cuenta regresiva con barra. Bajo motion reducido la barra no se
// anima: muestra los segundos que quedan, que es la misma información.
export function relojDeMinijuego(container, duracionMs, alVencer) {
  const caja = document.createElement('div');
  caja.className = 'minijuego-barra-tiempo';
  caja.innerHTML = '<div class="minijuego-barra-tiempo-fill"></div>';
  container.appendChild(caja);

  const relleno = caja.querySelector('.minijuego-barra-tiempo-fill');
  const reducido = motionReducido();
  const inicio = Date.now();
  let vivo = true;

  const tick = () => {
    if (!vivo) {
      return;
    }
    const restante = Math.max(0, duracionMs - (Date.now() - inicio));
    if (reducido) {
      relleno.textContent = `${Math.ceil(restante / 1000)}s`;
    } else {
      relleno.style.width = `${(restante / duracionMs) * 100}%`;
    }
    if (restante <= 0) {
      vivo = false;
      alVencer();
      return;
    }
    if (reducido) {
      setTimeout(tick, 250);
    } else {
      requestAnimationFrame(tick);
    }
  };
  tick();

  return () => { vivo = false; };
}

// El marcador de "vas 3 de 5", que todas las mecánicas por rondas muestran.
export function marcadorDeRondas(container) {
  const linea = document.createElement('div');
  linea.className = 'minijuego-aim-info';
  container.appendChild(linea);
  return (texto) => { linea.textContent = texto; };
}

export function marcarHit(el) {
  if (!el) return;
  el.classList.remove('minijuego-widget--miss');
  el.classList.add('minijuego-widget--hit');
}

export function marcarMiss(el) {
  if (!el) return;
  el.classList.remove('minijuego-widget--hit');
  el.classList.add('minijuego-widget--miss');
}
