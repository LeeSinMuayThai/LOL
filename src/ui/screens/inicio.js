// La pantalla de inicio: rol + mains. U2 la vuelve un draft (carriles +
// slots), no un formulario. El estado de la elección sigue acá adentro.
import { marcaRol } from '../components/iconos.js';
import { crearCampeonTile } from '../components/campeonTile.js';
import { miles, linkDeResultado } from '../resultado.js';

const ETIQUETA_STAT = {
  mecanica: 'Mecánica', macro: 'Macro', teamfight: 'Teamfight', laneo: 'Laneo',
  shotcalling: 'Shotcalling', adaptabilidad: 'Adaptabilidad'
};

export function crearPantallaInicio(elements, modulos) {
  const { rolGrid, campeonGrid, poolContador, runButton, draftSlots } = elements;
  let rolElegido = null;
  let camposElegidos = [];

  function actualizarBoton() {
    runButton.disabled = !(rolElegido && camposElegidos.length === modulos.BALANCE.mundo.campeonesIniciales);
  }

  function renderSlots() {
    if (!draftSlots) return;
    const objetivo = modulos.BALANCE.mundo.campeonesIniciales;
    const { CAMPEONES } = modulos;
    draftSlots.replaceChildren(...Array.from({ length: objetivo }, (_, i) => {
      const nombre = camposElegidos[i];
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'draft-slot' + (nombre ? ' draft-slot--lleno' : '');
      slot.disabled = !nombre;
      if (!nombre) {
        slot.textContent = String(i + 1);
        return slot;
      }
      const campeon = CAMPEONES.find((c) => c.name === nombre) ?? { name: nombre, tags: [] };
      slot.appendChild(crearCampeonTile(campeon, { elegido: true, size: 'setup' }));
      slot.title = `Quitar ${nombre}`;
      slot.addEventListener('click', () => {
        camposElegidos = camposElegidos.filter((n) => n !== nombre);
        renderCampeones();
        actualizarBoton();
      });
      return slot;
    }));
  }

  function renderCampeones() {
    renderSlots();
    if (!rolElegido) {
      campeonGrid.replaceChildren();
      poolContador.textContent = 'Elegí una línea primero.';
      return;
    }

    const { CAMPEONES, BALANCE } = modulos;
    const objetivo = BALANCE.mundo.campeonesIniciales;
    const elegibles = CAMPEONES.filter((campeon) => campeon.role === rolElegido && !campeon.debut);

    campeonGrid.replaceChildren(...elegibles.map((campeon) => {
      const elegido = camposElegidos.includes(campeon.name);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'campeon-card' + (elegido ? ' elegido' : '');
      card.disabled = !elegido && camposElegidos.length >= objetivo;

      card.appendChild(crearCampeonTile(campeon, { elegido, size: 'setup' }));

      const nombre = document.createElement('div');
      nombre.className = 'campeon-nombre';
      nombre.textContent = campeon.name;
      card.appendChild(nombre);

      const tags = document.createElement('div');
      tags.className = 'campeon-tags';
      for (const tag of campeon.tags) {
        const chip = document.createElement('span');
        chip.className = 'campeon-tag-chip';
        chip.textContent = tag.replaceAll('_', ' ');
        tags.appendChild(chip);
      }
      card.appendChild(tags);

      card.addEventListener('click', () => {
        camposElegidos = elegido
          ? camposElegidos.filter((n) => n !== campeon.name)
          : [...camposElegidos, campeon.name].slice(0, objetivo);
        renderCampeones();
        actualizarBoton();
      });

      return card;
    }));

    poolContador.textContent = `${camposElegidos.length} / ${objetivo} elegidos.`
      + (camposElegidos.length === objetivo
        ? ' Un pool ancho aguanta mejor un cambio de meta; uno angosto rinde más mientras el meta te acompañe.'
        : '');
  }

  function renderRoles() {
    const { IDS_ROL, ROLES, atributosClave } = modulos;
    rolGrid.replaceChildren(...IDS_ROL.map((rol) => {
      const elegido = rol === rolElegido;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'rol-card' + (elegido ? ' elegido' : '');

      card.appendChild(marcaRol(rol));

      const nombre = document.createElement('div');
      nombre.className = 'rol-nombre';
      nombre.textContent = ROLES[rol].label;
      card.appendChild(nombre);

      const tono = document.createElement('div');
      tono.className = 'rol-tono';
      tono.textContent = ROLES[rol].tono;
      card.appendChild(tono);

      if (elegido) {
        const clave = document.createElement('div');
        clave.className = 'rol-tono';
        clave.textContent = 'Vive de: ' + atributosClave(rol).map((stat) => ETIQUETA_STAT[stat]).join(' y ') + '.';
        card.appendChild(clave);

        const costo = document.createElement('div');
        costo.className = 'rol-costo';
        costo.textContent = ROLES[rol].costo;
        card.appendChild(costo);
      }

      card.addEventListener('click', () => {
        if (rolElegido === rol) {
          return;
        }
        rolElegido = rol;
        camposElegidos = [];
        renderRoles();
        renderCampeones();
        actualizarBoton();
      });

      return card;
    }));
  }

  return {
    render() {
      renderRoles();
      renderCampeones();
      actualizarBoton();
    },
    reset() {
      rolElegido = null;
      camposElegidos = [];
      renderRoles();
      renderCampeones();
      actualizarBoton();
    },
    getSeleccion() {
      return { rol: rolElegido, campeones: camposElegidos };
    }
  };
}

// --- K1-B: el desafío del día y el historial local -------------------------

function nodo(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  el.className = clase;
  if (texto !== undefined) {
    el.textContent = texto;
  }
  return el;
}

// La tarjeta del desafío, arriba del draft: es la otra puerta de entrada, sin
// elegir nada. `fecha` es la de hoy (UTC) o la que trajo `?desafio=`; si la
// del link no es la de hoy, se ofrece también la de hoy. `mejor` es tu mejor
// resultado en ese desafío con esta versión (del historial), o `null`.
export function renderDesafio(contenedor, { fecha, hoy, mejor }, alJugar) {
  const esHoy = fecha === hoy;
  const boton = nodo('button', 'desafio-btn', 'Jugar el desafío');
  boton.type = 'button';
  boton.addEventListener('click', () => alJugar(fecha));
  const partes = [
    nodo('div', 'desafio-kicker', esHoy ? `Desafío del día · ${fecha}` : `Desafío del link · ${fecha}`),
    nodo('p', 'desafio-texto', esHoy
      ? 'Misma carrera para todos hoy: rol, región y pool salen de la fecha. Vos ponés las decisiones.'
      : 'Misma carrera para todos los que jueguen esta fecha: rol, región y pool salen de ahí.'),
    boton
  ];
  if (mejor) {
    const intentos = mejor.intentos > 1 ? ` · ${mejor.intentos} intentos` : '';
    partes.push(nodo('div', 'desafio-mejor', `Tu mejor: ${miles(mejor.total)} pts · ${mejor.nivel}${intentos}`));
  }
  if (!esHoy) {
    const deHoy = nodo('button', 'desafio-hoy', `O el de hoy (${hoy})`);
    deHoy.type = 'button';
    deHoy.addEventListener('click', () => alJugar(hoy));
    partes.push(deHoy);
  }
  contenedor.replaceChildren(...partes);
  contenedor.hidden = false;
}

// Tus últimos resultados (localStorage, `resultado.js`). Cada fila es un link
// que vuelve a cargar esa carrera (la seed o la fecha del desafío).
export function renderHistorial(contenedor, historial, { etiquetaRol, version }) {
  if (historial.entradas.length === 0) {
    contenedor.replaceChildren();
    contenedor.hidden = true;
    return;
  }
  const record = historial.record
    ? ` · tu récord: ${miles(historial.record.total)} pts (${historial.record.nivel})`
    : '';
  const lista = nodo('ol', 'historial-lista');
  for (const entrada of historial.entradas) {
    const fila = nodo('li', 'historial-fila');
    const que = nodo('a', 'historial-que', entrada.desafio ? `Desafío ${entrada.desafio}` : `Seed ${entrada.seed}`);
    que.href = linkDeResultado(entrada, location.href);
    const detalle = [
      entrada.handle,
      etiquetaRol(entrada.rol),
      entrada.nivel,
      entrada.jugadoEn === entrada.desafio ? null : entrada.jugadoEn,
      entrada.intentos > 1 ? `${entrada.intentos} intentos` : null,
      entrada.version !== version ? `v ${entrada.version}, otra versión` : null
    ].filter(Boolean).join(' · ');
    fila.append(que, nodo('span', 'historial-pts', `${miles(entrada.total)} pts`), nodo('span', 'historial-detalle', detalle));
    lista.appendChild(fila);
  }
  contenedor.replaceChildren(nodo('div', 'historial-titulo', `Tus últimos resultados${record}`), lista);
  contenedor.hidden = false;
}
