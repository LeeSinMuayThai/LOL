// El modo previa (PLANUI §0.4). Es un script clásico, no un módulo: `index.html` lo carga antes que `shell.js`, así corre
// antes de que cualquier módulo lea `localStorage` (por ejemplo, la velocidad en `reproductor.js`).
//
// Con `?previa=<muestra>` (las de `previa/muestras/`, generadas por `previa/generar.mjs`), `localStorage` pasa a ser un
// almacén en memoria, sembrado con esa partida guardada: el juego abre en esa parada y la carrera guardada del
// jugador, su velocidad y sus preferencias no se leen ni se escriben. Recargar vuelve a la muestra. Sin el parámetro, este
// script no hace nada.
(function () {
  var muestra = new URLSearchParams(location.search).get('previa');
  if (!muestra || !/^[a-z0-9-]+$/.test(muestra)) return;
  var datos = { 'lolcs-intro-vista': '1', 'lolero-intro-vista': '1' };
  try {
    var pedido = new XMLHttpRequest();
    pedido.open('GET', './previa/muestras/' + muestra + '.json', false);
    pedido.send(null);
    if (pedido.status === 200) {
      var g = JSON.parse(pedido.responseText);
      datos[g.claves.carrera] = g.carrera;
      datos[g.claves.vista] = JSON.stringify(g.vista);
    } else {
      console.warn('previa: no está la muestra "' + muestra + '"');
    }
  } catch (error) {
    console.warn('previa: no se pudo cargar la muestra', error);
  }
  var almacen = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(datos, k) ? datos[k] : null; },
    setItem: function (k, v) { datos[String(k)] = String(v); },
    removeItem: function (k) { delete datos[k]; },
    clear: function () { datos = {}; },
    key: function (i) { return Object.keys(datos)[i] ?? null; },
    get length() { return Object.keys(datos).length; }
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, get: function () { return almacen; } });
  document.documentElement.setAttribute('data-previa', muestra);
  // La muestra abre en su parada: se toca "Continuar" apenas el inicio lo habilita (una vez).
  var intentos = 0;
  var continuar = setInterval(function () {
    var boton = document.getElementById('continuarBtn');
    intentos += 1;
    if (boton && !boton.disabled && boton.offsetParent !== null) {
      clearInterval(continuar);
      boton.click();
    } else if (intentos > 100) {
      clearInterval(continuar);
    }
  }, 100);
})();
