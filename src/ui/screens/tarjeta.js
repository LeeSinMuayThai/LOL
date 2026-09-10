import { filaHistoria } from '../components/ficha.js';
import { descargarTarjeta, copiarTarjeta, copiarLinkDeCarrera, linkDeCarrera } from '../exportar.js';

// La tarjeta de legado (fase 9R5b, PLAN.md §10.2/§10.3): la pantalla final.
// TODA salida termina acá — la del mundialista con confeti y la del pibe al que
// no lo dejaron, con su propio marco. El veredicto y los totales salen de
// `state.tarjeta` (compuesto por `core/legado.js`); la historia org por org
// reusa `filaHistoria` de la ficha.

const TITULO_MARCO = {
  retiro_elegido: 'SE CIERRA UNA CARRERA',
  sin_equipo: 'EL TELÉFONO DEJÓ DE SONAR',
  burnout: 'NO DABA MÁS',
  no_llego: 'SE CERRÓ LA VENTANA',
  prohibicion_familiar: 'EN CASA DIJERON QUE NO'
};

function linea(clase, texto) {
  const div = document.createElement('div');
  div.className = clase;
  div.textContent = texto;
  return div;
}

function celda(kicker, valor) {
  const el = document.createElement('div');
  el.className = 'tarjeta-celda';
  const k = document.createElement('span');
  k.className = 'tarjeta-celda-k';
  k.textContent = kicker;
  const v = document.createElement('span');
  v.className = 'tarjeta-celda-v';
  v.textContent = valor;
  el.append(k, v);
  return el;
}

export function renderTarjeta(container, state, modulos) {
  const t = state.tarjeta;
  if (!t) {
    return;
  }
  const { formato } = modulos;

  container.replaceChildren();
  container.hidden = false;
  container.className = 'tarjeta' + (t.esExito ? ' tarjeta--exito' : ' tarjeta--sobria');
  container.dataset.marco = t.finAnticipado ?? 'retiro_elegido';

  container.appendChild(linea('tarjeta-marco', TITULO_MARCO[t.finAnticipado] ?? 'FIN DE LA CARRERA'));
  container.appendChild(linea('tarjeta-identidad',
    `${state.player.name} · ${modulos.etiquetaRol(state.player.role)} · se retiró a los ${t.edadRetiro}`));

  container.appendChild(linea('tarjeta-veredicto', t.veredicto));

  const totales = t.totales;
  const franja = document.createElement('div');
  franja.className = 'tarjeta-totales';
  franja.appendChild(celda('Años', String(totales.anios)));
  franja.appendChild(celda('Splits', String(totales.splits)));
  franja.appendChild(celda('Títulos', String(totales.titulos)));
  if (totales.internacionales > 0) {
    franja.appendChild(celda('Intl', String(totales.internacionales)));
  }
  franja.appendChild(celda('Nivel máx', String(totales.nivelMax)));
  if (totales.valorMaxUSD > 0) {
    franja.appendChild(celda('Valor máx', formato.plata(totales.valorMaxUSD)));
  }
  container.appendChild(franja);

  if (t.historia.length > 0) {
    const historia = document.createElement('div');
    historia.className = 'tarjeta-historia';
    historia.appendChild(linea('tarjeta-historia-titulo', 'TU HISTORIA, ORG POR ORG'));
    historia.append(...t.historia.map(filaHistoria));
    container.appendChild(historia);
  }

  container.appendChild(crearAcciones(state, modulos));
}

function botonConEstado(texto, accion) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'tarjeta-accion-btn';
  boton.textContent = texto;
  boton.addEventListener('click', async () => {
    boton.disabled = true;
    const original = boton.textContent;
    try {
      await accion(boton);
    } finally {
      setTimeout(() => { boton.textContent = original; boton.disabled = false; }, 1800);
    }
  });
  return boton;
}

function crearAcciones(state, modulos) {
  const acciones = document.createElement('div');
  acciones.className = 'tarjeta-acciones';

  acciones.appendChild(botonConEstado('Copiar imagen', async (boton) => {
    const copiado = await copiarTarjeta(state, modulos);
    if (copiado) {
      boton.textContent = '¡Copiada!';
    } else {
      await descargarTarjeta(state, modulos);
      boton.textContent = 'Se bajó como archivo';
    }
  }));

  acciones.appendChild(botonConEstado('Bajar imagen', async (boton) => {
    await descargarTarjeta(state, modulos);
    boton.textContent = '¡Bajada!';
  }));

  acciones.appendChild(botonConEstado('Copiar link de esta carrera', async (boton) => {
    const copiado = await copiarLinkDeCarrera(state.seed);
    boton.textContent = copiado ? '¡Copiado!' : linkDeCarrera(state.seed);
  }));

  return acciones;
}
