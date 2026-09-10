import { marcaRol } from '../components/iconos.js';
import { fichaCompleta } from '../../core/ficha.js';

// El panel de Plantilla (fase T5). Fuente: `career.companeros` (4 nombres
// con rol y nivel, generados al fichar — `systems/roster.js`) y
// `career.sinergia`. Cinco filas: vos primero, con pip live y marca de rol.

function filaDePlantilla({ handle, role, detalle, nivel, propio }) {
  const fila = document.createElement('div');
  fila.className = 'plantilla-fila' + (propio ? ' plantilla-fila--propia' : '');

  const pip = document.createElement('span');
  pip.className = 'plantilla-pip';
  pip.setAttribute('aria-hidden', 'true');

  const handleEl = document.createElement('span');
  handleEl.className = 'plantilla-handle';
  handleEl.textContent = handle;

  const rolEl = document.createElement('span');
  rolEl.className = 'plantilla-rol';
  rolEl.textContent = detalle;

  const nivelEl = document.createElement('span');
  nivelEl.className = 'plantilla-nivel';
  nivelEl.textContent = String(nivel);

  fila.append(pip, marcaRol(role), handleEl, rolEl, nivelEl);
  return fila;
}

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

  const ficha = fichaCompleta(state);
  lista.appendChild(filaDePlantilla({
    handle: state.player.name,
    role: state.player.role,
    detalle: modulos.etiquetaRol(state.player.role),
    nivel: ficha.nivel,
    propio: true
  }));

  for (const companero of companeros) {
    lista.appendChild(filaDePlantilla({
      handle: companero.handle,
      role: companero.role,
      detalle: companero.edad != null
        ? `${modulos.etiquetaRol(companero.role)} · ${companero.edad} · ${companero.aniosContrato}a`
        : modulos.etiquetaRol(companero.role),
      nivel: companero.nivel,
      propio: false
    }));
  }
  container.appendChild(lista);

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
