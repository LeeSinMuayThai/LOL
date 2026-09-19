// El store (fase V, PLAN.md "V0 — El kernel"): el único punto por el que una
// pantalla nueva ve `state`, sin que `app.js` tenga que exponer un global.
// Antes de esta fase, `state` vivía en el closure del `<script>` de
// `index.html` y no había forma de que un componente lo leyera salvo que se
// lo pasaran a mano en cada llamada — la inversión que arregla V0
// (`ficha.js` importando `shell.js` para empujarle `state` al chrome global)
// era consecuencia directa de eso.

export function crearStore(inicial) {
  let estado = inicial;
  const suscriptores = new Set();

  return {
    leer() {
      return estado;
    },
    escribir(siguiente) {
      estado = siguiente;
      for (const fn of suscriptores) {
        fn(estado);
      }
    },
    suscribir(fn) {
      suscriptores.add(fn);
      return () => suscriptores.delete(fn);
    }
  };
}
