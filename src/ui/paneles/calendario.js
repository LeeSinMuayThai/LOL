// El panel de Calendario (fase T5). Fuente: `career.temporada.calendario`
// (el fixture, generado por `core/temporada.js:generarFixture`) + `.indice`
// (qué fecha toca ahora). Jugadas, la de hoy, las que vienen — con rival y
// una lectura cualitativa de su fuerza en vez del número crudo.
function etiquetaDeFuerza(fuerzaRival, fuerzaPropia) {
  const diferencia = fuerzaRival - fuerzaPropia;
  if (diferencia > 8) return 'favorito';
  if (diferencia < -8) return 'débil';
  return 'parejo';
}

export function renderCalendario(container, state) {
  const { temporada } = state.career;

  if (!temporada.activa || temporada.calendario.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.replaceChildren();

  const titulo = document.createElement('div');
  titulo.className = 'panel-contexto-titulo';
  titulo.textContent = 'Calendario';
  container.appendChild(titulo);

  const lista = document.createElement('div');
  lista.className = 'calendario-lista';

  temporada.calendario.forEach((fecha, indice) => {
    const jugada = indice < temporada.indice;
    const esHoy = indice === temporada.indice;

    const fila = document.createElement('div');
    fila.className = ['calendario-fila',
      jugada && 'calendario-fila--jugada',
      esHoy && 'calendario-fila--hoy'
    ].filter(Boolean).join(' ');

    const jornadaEl = document.createElement('span');
    jornadaEl.className = 'calendario-jornada';
    jornadaEl.textContent = `J${fecha.jornada}`;

    const rivalEl = document.createElement('span');
    rivalEl.className = 'calendario-rival';
    rivalEl.textContent = `${fecha.local ? 'vs' : '@'} ${fecha.rival}`;

    // El fixture no guarda el resultado puntual de cada fecha jugada (solo
    // el agregado, en `registro`/`tabla`) — mostrar un resultado inventado
    // ahí violaría la regla 15. Para las que faltan, sí hay algo real: la
    // fuerza relativa del rival.
    const estadoEl = document.createElement('span');
    estadoEl.className = 'calendario-estado';
    if (jugada) {
      estadoEl.textContent = '—';
    } else {
      const lectura = etiquetaDeFuerza(fecha.fuerzaRival, temporada.fuerzaPropia);
      estadoEl.textContent = lectura;
      estadoEl.classList.add(`calendario-estado--${lectura === 'débil' ? 'debil' : lectura}`);
    }

    fila.append(jornadaEl, rivalEl, estadoEl);
    lista.appendChild(fila);
  });

  container.appendChild(lista);
}
