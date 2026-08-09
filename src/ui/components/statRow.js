// Los 6 atributos de rol con flechas ▲▼ y el destacado en color (fase 8,
// H7 de PLAN.md: "las flechas solo comunican todo el sistema de
// envejecimiento, y hoy no existen"). `ficha` es el objeto que devuelve
// `core/ficha.js` `fichaCompleta(state)`: trae `deltas` (contra el snapshot
// de inicio de edad) y `destacado` (el stat más alto entre los del rol).
const ETIQUETAS = { mecanica: 'MEC', macro: 'MACRO', teamfight: 'TF', laneo: 'LANEO', shotcalling: 'SHOT', adaptabilidad: 'ADAPT' };

export function crearStatRow(state, ficha) {
  const fila = document.createElement('div');
  fila.className = 'ficha-stat-row';

  fila.replaceChildren(...Object.keys(ETIQUETAS).map((stat) => {
    const item = document.createElement('div');
    item.className = 'ficha-stat' + (stat === ficha.destacado ? ' ficha-stat--destacado' : '');

    const label = document.createElement('span');
    label.className = 'ficha-stat-label';
    label.textContent = ETIQUETAS[stat];

    const valor = document.createElement('span');
    valor.className = 'ficha-stat-valor';
    valor.textContent = String(Math.round(state.player.stats[stat]));

    const delta = ficha.deltas[stat];
    if (delta !== undefined) {
      const flecha = document.createElement('span');
      flecha.className = 'ficha-stat-flecha ' + (delta > 0 ? 'ficha-stat-flecha--sube' : 'ficha-stat-flecha--baja');
      flecha.textContent = delta > 0 ? '▲' : '▼';
      valor.appendChild(flecha);
    }

    item.append(label, valor);
    return item;
  }));

  return fila;
}
