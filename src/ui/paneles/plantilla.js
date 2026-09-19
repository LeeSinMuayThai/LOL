import { marcaRol } from '../components/iconos.js';
import { fichaCompleta } from '../../core/ficha.js';
import { reconciliar, reemplazarEnElLugar } from '../core/reconciliar.js';

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

// Fase V, V0b: esqueleto (título + lista + barra de sinergia) armado una
// sola vez y cacheado en el propio nodo, para que `lista` sobreviva entre
// renders y `reconciliar` tenga algo real que preservar.
export function renderPlantilla(container, state, modulos) {
  const { companeros, sinergia } = state.career;

  if (!companeros || companeros.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;

  let refs = container.__plantillaRefs;
  if (!refs) {
    container.replaceChildren();
    const titulo = document.createElement('div');
    titulo.className = 'panel-contexto-titulo';
    titulo.textContent = 'Plantilla';

    const lista = document.createElement('div');
    lista.className = 'plantilla-lista';

    const sinergiaWrap = document.createElement('div');
    sinergiaWrap.className = 'panel-contexto-barra-wrap';
    const sinergiaCabecera = document.createElement('div');
    sinergiaCabecera.className = 'panel-contexto-barra-cabecera';
    const sinergiaNombre = document.createElement('span');
    sinergiaNombre.textContent = 'SINERGIA';
    const sinergiaValor = document.createElement('span');
    sinergiaCabecera.append(sinergiaNombre, sinergiaValor);

    const pista = document.createElement('div');
    pista.className = 'panel-contexto-barra-pista';
    const relleno = document.createElement('div');
    relleno.className = 'panel-contexto-barra-relleno';
    pista.appendChild(relleno);
    sinergiaWrap.append(sinergiaCabecera, pista);

    container.append(titulo, lista, sinergiaWrap);
    refs = { lista, sinergiaValor, relleno };
    container.__plantillaRefs = refs;
  }

  const ficha = fichaCompleta(state);
  const items = [{
    clave: state.player.name,
    handle: state.player.name,
    role: state.player.role,
    detalle: modulos.etiquetaRol(state.player.role),
    nivel: ficha.nivel,
    propio: true
  }];
  for (const companero of companeros) {
    items.push({
      clave: companero.handle,
      handle: companero.handle,
      role: companero.role,
      detalle: companero.edad != null
        ? `${modulos.etiquetaRol(companero.role)} · ${companero.edad} · ${companero.aniosContrato}a`
        : modulos.etiquetaRol(companero.role),
      nivel: companero.nivel,
      propio: false
    });
  }

  reconciliar(
    refs.lista,
    items,
    (item) => item.clave,
    filaDePlantilla,
    (nodo, item) => reemplazarEnElLugar(nodo, filaDePlantilla(item))
  );

  refs.sinergiaValor.textContent = String(Math.round(sinergia));
  refs.relleno.style.width = `${Math.max(0, Math.min(100, sinergia))}%`;
}
