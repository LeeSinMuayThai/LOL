// La pantalla de inicio: rol + mains (fase 8, §8.5 — extraído de lo que en
// index.html era `#setup`, líneas 425-453 antes de esta fase). Devuelve un
// objeto con el estado de la elección adentro: la pantalla de carrera nunca
// necesita saber qué rol se eligió hasta que el jugador aprieta "Empezar
// carrera", así que no hace falta levantarlo más arriba.
const ETIQUETA_STAT = {
  mecanica: 'Mecánica', macro: 'Macro', teamfight: 'Teamfight', laneo: 'Laneo',
  shotcalling: 'Shotcalling', adaptabilidad: 'Adaptabilidad'
};

export function crearPantallaInicio(elements, modulos) {
  const { rolGrid, campeonGrid, poolContador, runButton } = elements;
  let rolElegido = null;
  let camposElegidos = [];

  function actualizarBoton() {
    runButton.disabled = !(rolElegido && camposElegidos.length === modulos.BALANCE.mundo.campeonesIniciales);
  }

  function renderCampeones() {
    if (!rolElegido) {
      campeonGrid.replaceChildren();
      poolContador.textContent = 'Elegí una línea primero.';
      return;
    }

    const { CAMPEONES, BALANCE } = modulos;
    const objetivo = BALANCE.mundo.campeonesIniciales;
    // Los `debut` no existen todavía en el mundo: son los que salen con un
    // parche a mitad de carrera, no se pueden elegir al empezar.
    const elegibles = CAMPEONES.filter((campeon) => campeon.role === rolElegido && !campeon.debut);

    campeonGrid.replaceChildren(...elegibles.map((campeon) => {
      const elegido = camposElegidos.includes(campeon.name);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'campeon-card' + (elegido ? ' elegido' : '');
      card.disabled = !elegido && camposElegidos.length >= objetivo;

      const nombre = document.createElement('div');
      nombre.className = 'campeon-nombre';
      nombre.textContent = campeon.name;
      card.appendChild(nombre);

      const tags = document.createElement('div');
      tags.className = 'campeon-tags';
      tags.textContent = campeon.tags.join(' · ');
      card.appendChild(tags);

      card.addEventListener('click', () => {
        camposElegidos = elegido
          ? camposElegidos.filter((nombre) => nombre !== campeon.name)
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
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'rol-card' + (rol === rolElegido ? ' elegido' : '');

      const nombre = document.createElement('div');
      nombre.className = 'rol-nombre';
      nombre.textContent = ROLES[rol].label;
      card.appendChild(nombre);

      const tono = document.createElement('div');
      tono.className = 'rol-tono';
      tono.textContent = ROLES[rol].tono;
      card.appendChild(tono);

      const clave = document.createElement('div');
      clave.className = 'rol-tono';
      clave.textContent = 'Vive de: ' + atributosClave(rol).map((stat) => ETIQUETA_STAT[stat]).join(' y ') + '.';
      card.appendChild(clave);

      const costo = document.createElement('div');
      costo.className = 'rol-costo';
      costo.textContent = ROLES[rol].costo;
      card.appendChild(costo);

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
