// El splash difuminado del setup (J9): decoración detrás del contenido. Dos capas que se cruzan
// (crossfade): al cambiar de campeón la nueva sube mientras la vieja baja, aunque la imagen ya esté en
// el caché del navegador y cargue en el mismo cuadro. La imagen se precarga con un `Image` aparte y el
// fondo solo se escribe cuando cargó: si falla (sin red, CDN caído) no se muestra nada y queda el fondo
// de siempre. `token` descarta una carga vieja que llega tarde. El contenedor recorta (`overflow: clip`,
// ver `.setup-splash` en pantallas.css): la capa de adentro se agranda para tapar los bordes del blur y
// ese exceso no puede ensanchar la página.
import { urlSplashDeCampeon } from './campeonTile.js';

const CLASE_CAPA = 'setup-splash-capa';
const CLASE_VISIBLE = `${CLASE_CAPA}--visible`;

export function crearSplash(panel) {
  const contenedor = document.createElement('div');
  contenedor.className = 'setup-splash';
  contenedor.setAttribute('aria-hidden', 'true');
  const capas = [0, 1].map(() => {
    const capa = document.createElement('div');
    capa.className = CLASE_CAPA;
    contenedor.appendChild(capa);
    return capa;
  });
  panel.insertBefore(contenedor, panel.firstChild);

  let activa = -1;
  let keyActual = null;
  let token = 0;

  const prender = (capa) => { if (!capa.className.includes(CLASE_VISIBLE)) capa.className += ` ${CLASE_VISIBLE}`; };
  const apagar = (capa) => { capa.className = CLASE_CAPA; };

  return {
    // `key` es la de Data Dragon del campeón, o null (sin campeón, o uno sin imagen).
    mostrar(key) {
      if (key === keyActual) return;
      keyActual = key;
      token += 1;
      const mio = token;
      if (!key) {
        if (activa !== -1) apagar(capas[activa]);
        activa = -1;
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (mio !== token) return;
        const vieja = activa;
        activa = vieja === 0 ? 1 : 0;
        capas[activa].style.backgroundImage = `url("${img.src}")`;
        prender(capas[activa]);
        if (vieja !== -1) apagar(capas[vieja]);
      };
      img.onerror = () => {};
      img.src = urlSplashDeCampeon(key);
    }
  };
}
