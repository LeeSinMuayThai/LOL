// El panel de Plantilla (fase T5). Fuente: `career.companeros` (4 nombres
// con rol y nivel, generados al fichar — `systems/roster.js`) y
// `career.sinergia`. Existen desde la fase 9 y nunca se dibujaban.
//
// Fase 9M: si la org tiene plantel NPC (tier 1 y la tier 2 de tu región), los
// compañeros salen de ahí y traen `edad` y `aniosContrato` — el vestuario deja
// de ser 4 nombres genéricos y pasa a tener gente con carrera propia.
export function renderPlantilla(container, state, modulos) {
  const { companeros, sinergia } = state.career;

  if (!companeros || companeros.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  container.replaceChildren();

  const titulo = document.createElement('div');
  titulo.className = 'panel-contexto-titulo';
  titulo.textContent = 'Plantilla';
  container.appendChild(titulo);

  const lista = document.createElement('div');
  lista.className = 'plantilla-lista';
  for (const companero of companeros) {
    const fila = document.createElement('div');
    fila.className = 'plantilla-fila';

    const handleEl = document.createElement('span');
    handleEl.className = 'plantilla-handle';
    handleEl.textContent = companero.handle;

    const rolEl = document.createElement('span');
    rolEl.className = 'plantilla-rol';
    // Con plantel NPC: "Mid · 24 · 1a". Sin él (tier 3): solo el rol.
    rolEl.textContent = companero.edad != null
      ? `${modulos.etiquetaRol(companero.role)} · ${companero.edad} · ${companero.aniosContrato}a`
      : modulos.etiquetaRol(companero.role);

    const nivelEl = document.createElement('span');
    nivelEl.className = 'plantilla-nivel';
    nivelEl.textContent = String(companero.nivel);

    fila.append(handleEl, rolEl, nivelEl);
    lista.appendChild(fila);
  }
  container.appendChild(lista);

  // La sinergia, como barra — mismo lenguaje visual que arraigo/jerarquía
  // en la ficha (T0b/T2), sin los hitos (no tiene bandas declaradas).
  const sinergiaWrap = document.createElement('div');
  sinergiaWrap.className = 'panel-contexto-barra-wrap';
  const sinergiaCabecera = document.createElement('div');
  sinergiaCabecera.className = 'panel-contexto-barra-cabecera';
  const sinergiaNombre = document.createElement('span');
  sinergiaNombre.textContent = 'SINERGIA';
  const sinergiaValor = document.createElement('span');
  sinergiaValor.textContent = String(Math.round(sinergia));
  sinergiaCabecera.append(sinergiaNombre, sinergiaValor);

  const pista = document.createElement('div');
  pista.className = 'panel-contexto-barra-pista';
  const relleno = document.createElement('div');
  relleno.className = 'panel-contexto-barra-relleno';
  relleno.style.width = `${Math.max(0, Math.min(100, sinergia))}%`;
  pista.appendChild(relleno);

  sinergiaWrap.append(sinergiaCabecera, pista);
  container.appendChild(sinergiaWrap);
}
