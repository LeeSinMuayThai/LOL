import { filaHistoria } from '../components/ficha.js';

// La tarjeta de legado (fase 9R5b, PLAN.md §10.2/§10.3): la pantalla final.
// TODA salida termina acá — la del mundialista con confeti y la del pibe al que
// no lo dejaron, con su propio marco. El veredicto y los totales salen de
// `state.tarjeta` (compuesto por `core/legado.js`); la historia org por org
// reusa `filaHistoria` de la ficha, escrita una vez en la fase 8 "para que la
// tarjeta de la fase 10 la reuse".

const TITULO_MARCO = {
  retiro_elegido: '🏆 SE CIERRA UNA CARRERA',
  sin_equipo: '📞 EL TELÉFONO DEJÓ DE SONAR',
  burnout: '🔌 NO DABA MÁS',
  no_llego: '⌛ SE CERRÓ LA VENTANA',
  prohibicion_familiar: '🚪 EN CASA DIJERON QUE NO'
};

function linea(clase, texto) {
  const div = document.createElement('div');
  div.className = clase;
  div.textContent = texto;
  return div;
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

  // --- Marco + identidad ---
  container.appendChild(linea('tarjeta-marco', TITULO_MARCO[t.finAnticipado] ?? 'FIN DE LA CARRERA'));
  container.appendChild(linea('tarjeta-identidad',
    `${state.player.name} · ${modulos.etiquetaRol(state.player.role)} · se retiró a los ${t.edadRetiro}`));

  // --- El veredicto compuesto ---
  container.appendChild(linea('tarjeta-veredicto', t.veredicto));

  // --- La franja de totales ---
  const totales = t.totales;
  const franja = [
    `${totales.anios} años`,
    `${totales.splits} splits`,
    `${totales.titulos} título(s)`,
    totales.internacionales > 0 ? `${totales.internacionales} internacional(es)` : null,
    `nivel máx ${totales.nivelMax}`,
    totales.valorMaxUSD > 0 ? `valor máx ${formato.plata(totales.valorMaxUSD)}` : null
  ].filter(Boolean).join('  ·  ');
  container.appendChild(linea('tarjeta-totales', franja));

  // --- Tu historia, org por org (reusa filaHistoria de la ficha) ---
  if (t.historia.length > 0) {
    const historia = document.createElement('div');
    historia.className = 'tarjeta-historia';
    historia.appendChild(linea('tarjeta-historia-titulo', 'TU HISTORIA, ORG POR ORG'));
    historia.append(...t.historia.map(filaHistoria));
    container.appendChild(historia);
  }
}
