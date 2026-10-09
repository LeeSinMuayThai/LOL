// C · PANTALLAS — "Todo pasa en tus pantallas." Entrada: datos reales, panel de la vitrina, el ambiente (papel de pared
// de FARO) y una pantalla por vez. Se repinta cuando cambia pantalla, muestra, era o peor caso; textos/movimiento/INST
// son atributos de <html> que leen el CSS y util.quieto().
import { crearPanel } from '../../comun/panel.js';
import { cargarMuestras } from '../../comun/datos.js';
import { PANTALLAS } from '../../comun/catalogo.js';
import { crearAmbiente } from './ambiente.js';
import { pintarDecision, conPeorCaso } from './decision.js';
import { pintarInicio } from './inicio.js';
import { pintarCumbre } from './cumbre.js';
import { pintarEras } from './eras.js';
import { el, cancelarEn, monogramaDe } from './util.js';

const datos = await cargarMuestras();
const escena = document.getElementById('escena');
const amb = crearAmbiente(escena, { meta: datos.meta });
const capa = el('div', { class: 'capa-contenido' });
escena.append(capa);

const ERAS = ['pieza', 'academia', 'escenario', 'mundial', 'leyenda'];
const REPINTAN = ['pantalla', 'muestra', 'era', 'eraEfectiva', 'peor'];
let vista = null;
let carga = Promise.resolve();
let estadoActual = null;

const mainDelHeroe = () => datos.inicio?.jugador?.mains?.[0]?.ddragon ?? null;

// El papel de pared según la era: la pieza = el splash del main; la PC del equipo = el monograma de la org.
function fondo({ era, arte, org, animo = 'normal', quieto = false, encuadre }) {
  const academia = era === 'academia';
  carga = amb.ambiente({ era, animo, arte: academia ? null : arte, monograma: academia ? monogramaDe(org) ?? 'EC' : null, quieto, encuadre });
  return carga;
}

function pintar(estado) {
  estadoActual = estado;
  vista?.destruir?.();
  cancelarEn(capa);
  capa.replaceChildren();
  const { pantalla, muestra } = estado;
  const era = ERAS.includes(estado.eraEfectiva) ? estado.eraEfectiva : 'pieza';
  const peor = estado.peor ? datos.peorCaso : null;
  const ctx = { datos, meta: datos.meta, amb, era, estado, peor, fondo, mainDelHeroe };
  document.title = `C · PANTALLAS · ${pantalla}${muestra ? ' / ' + muestra : ''}`;
  const anio = pantalla === 'decision' ? datos[muestra]?.anio : pantalla === 'cumbre' ? (muestra === 'final' ? datos.final?.trayectoria?.dominio?.[1] : datos.titulo?.anio) : datos.eras?.pieza?.anio;
  if (anio) capa.style.setProperty('--os-version', `'${String(anio).slice(2)}'`);
  else capa.style.removeProperty('--os-version');

  if (pantalla === 'decision' && datos[muestra]?.decision) {
    const m = conPeorCaso(datos[muestra], peor);
    vista = pintarDecision(capa, m, ctx);
    const amateur = m.ficha?.jugador?.fase === 'amateur';
    fondo({ era, arte: amateur ? mainDelHeroe() : m.ficha?.jugador?.campeonDelSplit ?? mainDelHeroe(), org: m.org ?? m.franja?.club?.org, quieto: true });
  } else if (pantalla === 'cumbre') {
    vista = pintarCumbre(capa, muestra === 'final' ? 'final' : 'titulo', ctx);
  } else if (pantalla === 'eras') {
    vista = pintarEras(capa, ctx);
  } else {
    vista = pintarInicio(capa, ctx);
  }
}

crearPanel({
  direccion: 'c-pantallas',
  pantallas: Object.keys(PANTALLAS),
  muestras: PANTALLAS,
  eras: ERAS,
  alCambiar(estado, cambios) {
    if (!estadoActual || cambios.some((c) => REPINTAN.includes(c))) pintar(estado);
    else estadoActual = estado;
  },
  acciones: {
    repetir() {
      if (estadoActual) pintar(estadoActual);
      vista?.repetir?.();
    },
    elegir(n) { vista?.elegir?.(n); },
    congelar(ms) {
      amb.congelar(ms);
      vista?.congelar?.(ms);
    },
  },
});

window.vitrina.listo = () => Promise.all([carga, document.fonts.ready, vista?.listo ?? Promise.resolve()]);
