// El reloj del arcade (H3k, PLANUI §0.10 "El kit"): paso fijo de tiempo. El cuadro del monitor (16,7 ms a 60 Hz, 6,9 ms a
// 144 Hz) solo decide CUÁNTOS pasos de `BALANCE.g1.arcade.pasoFijoS` se corren; la simulación siempre avanza de a uno igual.
// Antes cada mecánica movía su cursor "un poco por cuadro" y a 144 Hz todo iba 2,4 veces más rápido.
// Puro (sin DOM): lo usan el bucle del navegador (`kit.js`) y `simular` de cada mecánica, en Node.

import { BALANCE } from '../../data/balance.js';

export const PASO_FIJO = BALANCE.g1.arcade.pasoFijoS;
// un cuadro larguísimo (la pestaña en segundo plano, un tirón del GC) no se cobra entero: se pierde, no se adelanta
const CUADRO_MAXIMO_S = 0.1;
const TOLERANCIA = 1e-9;

// Devuelve `(dtSegundos) => pasos a correr`, con el sobrante guardado para el cuadro que viene.
export function crearAcumulador(paso = PASO_FIJO) {
  let acumulado = 0;
  const fn = (dt) => {
    acumulado += Math.min(CUADRO_MAXIMO_S, Math.max(0, dt));
    let pasos = 0;
    while (acumulado + TOLERANCIA >= paso) {
      acumulado -= paso;
      pasos += 1;
    }
    return pasos;
  };
  // la fracción del paso que quedó pendiente (para interpolar el dibujo)
  fn.fraccion = () => acumulado / paso;
  return fn;
}

// Corre una simulación entera como la correría un monitor de `hz`: cuadros de 1/hz, cada uno con sus pasos fijos.
// `unPaso()` avanza un paso; `terminado()` corta. `maxPasos` es la red de seguridad de una mecánica que no termina.
export function correrComoMonitor(hz, terminado, unPaso, maxPasos = 1e6) {
  const acumulador = crearAcumulador();
  let total = 0;
  while (!terminado() && total < maxPasos) {
    const n = acumulador(1 / hz);
    for (let i = 0; i < n && !terminado(); i += 1) {
      unPaso();
      total += 1;
    }
  }
  return total;
}
