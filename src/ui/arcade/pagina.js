// La página del arcade (`arcade.html`, H3k: "La compuerta" de PLANUI §0.10). Las mecánicas sueltas, para jugarlas antes de
// que se hagan las otras diez: elegís la mecánica, la vara (.5 / .7 / .85), tu stat y tu rol, y se monta con el marco real
// de la parada (`paradas/minijuego.js`, `montarEnArcade`): la mesa con la regla, la apuesta, "¡Vamos!", el suspenso y el sello.
// La carrera es de mentira (`createInitialState` con una semilla que avanza en cada partida): no toca tu guardado.

import { createInitialState } from '../../core/state.js';
import { mulberry32 } from '../../core/rng.js';
import { minijuegoPorId } from '../../core/minijuegos.js';
import { BALANCE } from '../../data/balance.js';
import { montarEnArcade } from '../paradas/minijuego.js';

const MECANICAS = [
  { id: 'robar_baron', nombre: 'Robar el Barón', rol: 'jungla', listo: true, linea: 'El pozo, tres objetivos y el smite rival que se ve venir.' },
  { id: 'dodge', nombre: 'Dodge', rol: 'todos', listo: true, linea: 'La arena: skillshots telegrafiados, WASD o clic, y Flash una vez.' },
  { id: 'last_hit', nombre: 'Last hit', rol: 'top · mid · adc', linea: 'La oleada, el cañón y la torre.' },
  { id: 'el_kite', nombre: 'El kite', rol: 'adc', linea: 'El orbwalk contra un bruiser.' },
  { id: 'el_gancho', nombre: 'El gancho', rol: 'support', linea: 'Gancho con lead entre minions.' },
  { id: 'el_combo', nombre: 'El combo', rol: 'mid', linea: 'Las notas QWER + F.' },
  { id: 'el_teleport', nombre: 'El teleport', rol: 'top', linea: 'La pelea en el minimapa.' },
  { id: 'la_vision', nombre: 'La visión', rol: 'support · jungla', linea: 'La ruta del jungla rival.' },
  { id: 'la_llamada', nombre: 'La llamada', rol: 'todos', linea: 'Cantar el objetivo correcto a tiempo.' },
  { id: 'la_corrida', nombre: 'La corrida', rol: 'todos', linea: 'El engage: la R en el área.' },
  { id: 'la_pizarra', nombre: 'La pizarra', rol: 'todos', linea: 'Memotest de draft.' },
  { id: 'la_prueba', nombre: 'La prueba', rol: 'prueba de ingreso', linea: 'Aim de skillshots.' }
];
const ROL_DE = { robar_baron: 'jungla' };
const SEMILLA_INICIAL = 20261015;

const buscar = (selector) => document.querySelector(selector);
const panel = buscar('#minijuego');
const salida = buscar('#arSalida');
let elegida = 'robar_baron';
let semilla = SEMILLA_INICIAL;

function pintarLista() {
  const lista = buscar('#arLista');
  lista.replaceChildren(...MECANICAS.map((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ar-mecanica';
    b.disabled = !m.listo;
    b.setAttribute('aria-pressed', String(m.id === elegida));
    b.innerHTML = `<span class="ar-rol">${m.rol}</span><b>${m.nombre}</b><small>${m.listo ? m.linea : `${m.linea} · pronto`}</small>`;
    b.addEventListener('click', () => {
      elegida = m.id;
      if (ROL_DE[m.id]) buscar('#arRol').value = ROL_DE[m.id];
      pintarLista();
      jugar();
    });
    return b;
  }));
}

function vara() {
  return Number(document.querySelector('input[name="vara"]:checked')?.value ?? 0.7);
}

function jugar() {
  semilla += 1;
  const estado = createInitialState(semilla, mulberry32(semilla), { rol: buscar('#arRol').value });
  estado.player.stats.mecanica = Number(buscar('#arStat').value);
  const entrada = minijuegoPorId(elegida);
  const m = MECANICAS.find((x) => x.id === elegida);
  const decision = {
    titulo: entrada?.titulos?.[0] ?? m.nombre,
    descripcion: entrada?.descripciones?.[0] ?? m.linea,
    datos: {
      minijuego: elegida,
      momento: 'mapa_decisivo',
      apuesta: entrada?.apuesta ?? '',
      g1: { vara: vara(), margenCasi: BALANCE.g1.margenCasi, factorEscalada: 1, poder: null }
    }
  };
  for (const n of panel.querySelectorAll(':scope > .g1-mesa, :scope > .g1-camino')) n.remove();
  salida.hidden = true;
  montarEnArcade(panel, decision, {
    estado,
    azar: mulberry32(semilla * 7919),
    responder: ({ resultado }) => {
      salida.hidden = false;
      buscar('#arSalidaTexto').textContent = `Sacaste ${Math.round(resultado * 100)} con la vara en ${Math.round(vara() * 100)}.`;
      buscar('#arOtra').focus();
    }
  });
  panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

buscar('#arStat').addEventListener('input', () => { buscar('#arStatValor').textContent = buscar('#arStat').value; });
buscar('#arOtra').addEventListener('click', jugar);
for (const r of document.querySelectorAll('input[name="vara"], #arRol')) r.addEventListener('change', jugar);
buscar('#arStat').addEventListener('change', jugar);
// V es "¡Vamos!", como en el juego
window.addEventListener('keydown', (ev) => {
  if (ev.key.toLowerCase() === 'v' && panel.dataset.fase === 'previa') document.querySelector('[data-vamos]')?.click();
});
pintarLista();
jugar();
