// Placeholder de C · PANTALLAS: usa el panel y el ambiente de respaldo para probar la vitrina de punta a punta.
import { crearPanel } from '../../comun/panel.js';
import { crearAmbiente } from '../../comun/ambiente-css.js';
import { cargarMuestras } from '../../comun/datos.js';
import { PANTALLAS } from '../../comun/catalogo.js';

const datos = await cargarMuestras();
const amb = crearAmbiente(document.getElementById('escena'), { meta: datos.meta });
const detalle = document.getElementById('detalle');
let elegida = 0;
let carga = Promise.resolve();

function pintar(estado) {
  const main = datos.jugador?.mains?.[0]?.ddragon ?? null;
  carga = amb.ambiente({ era: estado.eraEfectiva, animo: estado.pantalla === 'cumbre' ? 'gloria' : 'normal', arte: main });
  detalle.textContent = `${datos.jugador?.handle ?? '?'} · ${estado.pantalla}${estado.muestra ? ' / ' + estado.muestra : ''} · era ${estado.eraEfectiva}${estado.era === 'auto' ? ' (auto)' : ''}${elegida ? ' · opción ' + elegida : ''}`;
}

crearPanel({
  direccion: 'c-pantallas',
  pantallas: Object.keys(PANTALLAS),
  muestras: PANTALLAS,
  alCambiar: pintar,
  acciones: {
    repetir() { amb.pulso('logro'); },
    elegir(n) { elegida = n; amb.pulso('elegir'); pintar(window.vitrina.estado()); },
    congelar(ms) { amb.congelar(ms); },
  },
});
window.vitrina.listo = () => carga;
