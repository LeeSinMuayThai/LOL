// Lo inmediato de una respuesta (PLANUI §0.2, punto 4: narrar la respuesta en el lugar). La vitrina mostraba, al elegir,
// la opción transformada en SU resultado con los números rodando; ese resultado salía de resolver la opción con el
// `resolver` del sistema sobre una copia (`vitrina/datos/lib/resultados.mjs`). Acá se hace lo mismo con la respuesta que
// el jugador ya dio: el mismo `sistema.resolver`, sobre una copia del estado de la parada y con un rng nuevo restaurado al
// estado que tenía el de la carrera en ese momento. El motor no cambia y el rng de la carrera no se toca: la cuenta es la
// misma que el pipeline acaba de hacer como su primer paso (`resolverDecision`, core/pipeline.js), y se verifica contra
// los logs reales (si no coinciden, no se dice nada).
//
// Puro: sin DOM, corre en Node.
import { sistemaPorId } from '../../systems/registro.js';
import { mulberry32 } from '../../core/rng.js';
import { nivelDelJugador } from '../../core/ficha.js';
import { etiquetaDeRanked, servidorDeLaPartida } from '../../core/ranked.js';

const DECIMALES = 2;
const redondear = (n) => Math.round(n * 10 ** DECIMALES) / 10 ** DECIMALES;
// La maquinaria interna que ninguna pantalla muestra: los pesos del perfil, el bonus permanente y el desgaste.
const INTERNOS = /^player\.(perfil\.pesos|bonusPermanente|desgaste)\./;

function hojas(valor, ruta, salida) {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    salida[ruta] = redondear(valor);
  } else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    for (const [k, v] of Object.entries(valor)) hojas(v, `${ruta}.${k}`, salida);
  }
}

// Los números que una respuesta puede mover y que la ficha, la placa "Vos" y la franja muestran (el mismo recorte que
// `numerosDe` de la vitrina).
export function numerosDe(state) {
  const numeros = {};
  const { oculto, splitCount, championPool, ...jugador } = state.player ?? {};
  hojas(jugador, 'player', numeros);
  for (const campo of Object.keys(numeros)) {
    if (INTERNOS.test(campo)) delete numeros[campo];
  }
  numeros.nivel = Math.round(nivelDelJugador(state));
  for (const campo of ['jerarquia', 'arraigo', 'sinergia']) {
    if (typeof state.career?.[campo] === 'number') numeros[`career.${campo}`] = redondear(state.career[campo]);
  }
  const textos = {};
  if (state.player?.ranked) textos.ranked = etiquetaDeRanked(state.player.ranked, servidorDeLaPartida(state));
  return { numeros, textos };
}

// Los campos que cambiaron entre dos fotos de `numerosDe`, ordenados por campo.
export function diferencias(antes, despues) {
  const cambios = [];
  for (const campo of new Set([...Object.keys(antes.numeros), ...Object.keys(despues.numeros)])) {
    const a = antes.numeros[campo];
    const d = despues.numeros[campo];
    if (a !== d) cambios.push({ campo, antes: a ?? null, despues: d ?? null, delta: Number.isFinite(a) && Number.isFinite(d) ? redondear(d - a) : null });
  }
  for (const campo of new Set([...Object.keys(antes.textos), ...Object.keys(despues.textos)])) {
    if (antes.textos[campo] !== despues.textos[campo]) cambios.push({ campo, antes: antes.textos[campo] ?? null, despues: despues.textos[campo] ?? null, delta: null });
  }
  return cambios.sort((x, y) => x.campo.localeCompare(y.campo));
}

// Dos logs son el mismo si su JSON coincide (son datos planos).
const mismoLog = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// `estado`: el de la parada (con `pendiente`). `respuesta`: la que se le dio al motor. `rngEstado`: `rng.estado()` justo
// antes de `resolverDecision`. `logsReales`: los logs que devolvió `resolverDecision` (para verificar). Devuelve
// `{ logs, cambios, encadena }` (los logs del primer paso, lo que movió en los números y si el sistema encadenó otra
// parada) o `null` si no se puede decir con certeza.
export function resultadoInmediato({ estado, respuesta, rngEstado, logsReales = null }) {
  const pendiente = estado?.pendiente;
  if (!pendiente || !Number.isFinite(rngEstado)) return null;
  const sistema = sistemaPorId(pendiente.sistemaId);
  if (typeof sistema?.resolver !== 'function') return null;
  // Los sistemas no leen `state.logs` (los devuelven aparte): la copia va sin ellos, que es lo que pesa.
  const copia = structuredClone({ ...estado, logs: [] });
  const rng = mulberry32(estado.seed);
  rng.restaurar(rngEstado);
  const r = sistema.resolver(copia, copia.pendiente.decision, respuesta, rng);
  const logs = r?.logs ?? [];
  if (logsReales && !logs.every((log, i) => logsReales[i] && mismoLog(log, logsReales[i]))) return null;
  return {
    logs,
    cambios: diferencias(numerosDe(estado), numerosDe(r.state)),
    encadena: Boolean(r.decision)
  };
}

// Lo que se movió desde la parada hasta donde quedó la llamada (la próxima parada o el final del split).
export function cambiosHasta(antes, despues) {
  return diferencias(numerosDe(antes), numerosDe(despues));
}
