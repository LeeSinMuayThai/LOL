// La narración de una parada (PLANUI §0.2, punto 4): la parada cuenta su respuesta en el lugar (la opción que se vuelve
// su resultado con los números rodando, los mapas de la serie, la firma) antes de que entre el relato. Este módulo es el
// reloj de esa narración, el mismo para todas las familias:
//   - las esperas escalan con la velocidad del reproductor (`ctx.escala`: 1 en x1, la mitad en x2) y en INST o con
//     movimiento reducido no esperan (`ctx.rapido`): la parada queda en su cuadro final;
//   - Espacio la saltea (`reproductor.narrar`, que `teclado.js` consulta): las animaciones de sus nodos terminan ya y
//     las esperas pendientes se resuelven;
//   - un cuarto abierto la pausa (el reproductor la pausa y la reanuda, como a un beat): las animaciones y las esperas
//     se congelan donde estaban.
// `ctx` es el de `app.js` (`narrarRespuesta`). `nodos`: donde viven las animaciones de la narración (las que Espacio
// termina y un cuarto pausa).

export function crearNarracion(ctx, nodos = []) {
  const escala = Number.isFinite(ctx?.escala) ? ctx.escala : 1;
  let saltada = Boolean(ctx?.rapido) || escala <= 0;
  let pausada = false;
  const relojes = new Set();
  const lugares = new Set(nodos.filter(Boolean));

  const animaciones = () => [...lugares].flatMap((n) => (n.isConnected ? n.getAnimations?.({ subtree: true }) ?? [] : []));

  function arrancar(reloj) {
    reloj.desde = performance.now();
    reloj.t = setTimeout(() => terminar(reloj), Math.max(0, reloj.resta));
  }
  function terminar(reloj) {
    clearTimeout(reloj.t);
    relojes.delete(reloj);
    reloj.resolver();
  }

  // Una espera de `ms` (a velocidad x1). Saltada o sin espera, se resuelve ya.
  function esperar(ms) {
    if (saltada || !(ms > 0)) return Promise.resolve();
    return new Promise((resolver) => {
      const reloj = { resta: ms * escala, desde: 0, t: null, resolver };
      relojes.add(reloj);
      if (!pausada) arrancar(reloj);
    });
  }

  const control = {
    saltar() {
      saltada = true;
      for (const a of animaciones()) {
        try {
          a.finish();
        } catch {
          /* una animación infinita no termina: queda donde está */
        }
      }
      for (const reloj of [...relojes]) terminar(reloj);
    },
    pausar() {
      if (pausada) return;
      pausada = true;
      for (const a of animaciones()) a.pause();
      for (const reloj of relojes) {
        if (reloj.t === null) continue;
        clearTimeout(reloj.t);
        reloj.t = null;
        reloj.resta -= performance.now() - reloj.desde;
      }
    },
    reanudar() {
      if (!pausada) return;
      pausada = false;
      for (const a of animaciones()) a.play();
      for (const reloj of relojes) if (reloj.t === null) arrancar(reloj);
    }
  };
  const soltar = typeof ctx?.controlar === 'function' ? ctx.controlar(control) : () => {};

  return {
    esperar,
    // Un nodo más donde corren animaciones de la narración (la placa "Vos", la franja).
    incluir(nodo) {
      if (nodo) lugares.add(nodo);
    },
    get saltada() {
      return saltada;
    },
    // La narración terminó: Espacio vuelve a ser del relato.
    fin() {
      for (const reloj of [...relojes]) terminar(reloj);
      soltar?.();
    }
  };
}
