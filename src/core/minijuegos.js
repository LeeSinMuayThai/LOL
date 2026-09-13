import { hashCadena } from './numeros.js';
import { resolverTexto } from './plantillas.js';
import { BALANCE } from '../data/balance.js';
import MINIJUEGOS from '../data/minijuegos.json' with { type: 'json' };
import SERIES_DATA from '../data/series.json' with { type: 'json' };

// Fase 9R4a: el minijuego es un DATO, no cinco ramas de `if` repartidas entre
// `systems/serie.js`, `systems/amateur.js` y la UI. Hasta acá `minijuegos.json`
// eran cinco stubs (`id`/`titulo`/`descripcion`) y todo lo que importa — a quién
// le toca, qué stat lo corre, cuánto mueve, qué se lee al terminar — vivía
// hardcodeado en el motor y duplicado en `ui/components/minijuegos/index.js`.
// Eso rompía la regla invariable 4 y era la causa directa de D20 (dos
// parámetros de balance genéricos para cinco minijuegos distintos).
//
// Este módulo es puro y **no toca el `rng`** (regla invariable 1, trampa T1): la
// elección es determinista por `hashCadena`, igual que las variantes de texto de
// 9R3a y las frases de fecha marcada de 9R0a.

export const CATALOGO_MINIJUEGOS = MINIJUEGOS;

const TITULO_VEREDICTO = { bien: '¡Clavado!', parejo: 'Salió parejo', mal: 'No salió' };

export function minijuegoPorId(id) {
  return MINIJUEGOS.find((entrada) => entrada.id === id) ?? null;
}

// Los elegibles de un momento: `roles: []` significa "cualquiera" (la_llamada
// la puede jugar todo el mundo; el Barón es del jungla).
export function minijuegosPara(state, momento) {
  return MINIJUEGOS.filter((entrada) => (
    entrada.momentos.includes(momento)
    && (entrada.roles.length === 0 || entrada.roles.includes(state.player.role))
  ));
}

function enCooldown(state, id) {
  const limite = state.player.splitCount - BALANCE.serie.minijuegoCooldownSplits;
  return (state.flags.minijuegosRecientes ?? []).some(
    (visto) => visto.id === id && visto.splitCount > limite
  );
}

// Anti-repetición con la misma forma que `flags.motivosFechaRecientes` (9R0a):
// un minijuego recién jugado se saltea mientras haya otro elegible. Si TODOS
// están en cooldown se juega igual —el cupo del mapa no se puede quedar mudo—,
// que es lo mismo que hace `fraseDeMotivo` cuando se le agotan las variantes.
export function elegirMinijuego(state, momento) {
  const candidatos = minijuegosPara(state, momento);
  if (candidatos.length === 0) {
    return null;
  }
  const frescos = candidatos.filter((entrada) => !enCooldown(state, entrada.id));
  const pool = frescos.length > 0 ? frescos : candidatos;
  const semilla = [
    momento,
    state.player.splitCount,
    state.serie?.ronda ?? '',
    state.serie?.mapaActual ?? 0,
    state.career?.currentOrg ?? ''
  ].join('|');
  return pool[hashCadena(semilla) % pool.length];
}

export function registrarMinijuegoVisto(state, id) {
  const limite = state.player.splitCount - BALANCE.serie.minijuegoCooldownSplits;
  const vivos = (state.flags.minijuegosRecientes ?? []).filter((visto) => visto.splitCount > limite);
  return [...vivos, { id, splitCount: state.player.splitCount }];
}

// Los tres textos de la tarjeta del minijuego, con las variantes ya resueltas
// (`resolverTexto` acepta arrays desde 9R3a). `apuesta` es lo que 9R4d pinta
// ANTES de jugarlo: hasta 9R.4 el jugador se enteraba de qué se jugaba recién
// cuando terminaba (principio rector 3, regla de proceso 13).
// Fase 12f (§12.5): identidad y nombre por competición + intro con regla en ficción.
export function textoDeMinijuego(entrada, state) {
  const competicion = state.serie?.ronda === 'internacional'
    ? 'internacional'
    : (state.career?.liga ?? 'default');

  let titulos = entrada.titulos;
  if (entrada.nombresPorCompeticion) {
    const especial = entrada.nombresPorCompeticion[competicion]
      ?? entrada.nombresPorCompeticion[state.career?.liga]
      ?? entrada.nombresPorCompeticion.default;
    if (especial) {
      titulos = [especial];
    }
  }

  const titulo = resolverTexto(titulos, state);
  const descripcionBase = resolverTexto(entrada.descripciones, state);
  const regla = entrada.reglaEnFiccion ? resolverTexto(entrada.reglaEnFiccion, state) : '';
  const descripcion = regla ? `${descripcionBase} ${regla}` : descripcionBase;

  return {
    titulo,
    descripcion,
    apuesta: resolverTexto(entrada.apuesta, state),
    regla
  };
}

// Fase 12f (§12.5): dificultad que escala por ronda (semis -> final -> internacional).
export function factorDificultadPorRonda(ronda) {
  return BALANCE.serie.dificultadMinijuegoPorRonda[ronda] ?? 1.0;
}

// Fase 12f (§12.5): cierre narrativo determinista por mapa.
export function generarCierreMapa(campeon, gano, marcador, state) {
  const lista = SERIES_DATA.cierresMapa[gano ? 'W' : 'L'];
  const semilla = [
    state.calendario?.anio ?? 0,
    state.player?.splitCount ?? 0,
    state.serie?.ronda ?? '',
    state.serie?.mapaActual ?? 0,
    campeon
  ].join('|');
  const index = Math.abs(hashCadena(semilla)) % lista.length;
  const plantilla = lista[index];
  return plantilla.replace('{campeon}', campeon).replace('{marcador}', marcador);
}

// El veredicto 0-1 → nivel + frase. Vivía duplicado en la UI (9R0b) con su
// propia tabla de textos; ahora sale del mismo dato que consume el motor.
export function veredictoDeMinijuego(id, resultado, state = null) {
  const umbrales = BALANCE.serie.veredictoMinijuego;
  const nivel = resultado >= umbrales.bien ? 'bien' : resultado >= umbrales.parejo ? 'parejo' : 'mal';
  const entrada = minijuegoPorId(id);
  const variantes = entrada?.veredictos?.[nivel];
  return {
    nivel,
    titulo: TITULO_VEREDICTO[nivel],
    detalle: variantes ? resolverTexto(variantes, state) : ''
  };
}

// Fase 9R4d: "qué te juega tu stat en esta jugada", en palabras y con el número
// al lado. Es la mitad que faltaba del principio rector 3 (todo número tiene
// una frase) y de la regla de proceso 13 (todo número lleva referente): hasta
// acá el minijuego decía qué era, nunca qué abría o cerraba tu hoja.
export function lecturaDeVentana(entrada, state) {
  const bandas = BALANCE.serie.bandasVentanaMinijuego;
  const valor = Math.round(state.player.stats[entrada.statRelevante] ?? 0);
  const frase = valor >= bandas.ancha
    ? 'te abre la ventana'
    : valor >= bandas.normal
      ? 'te da la ventana de siempre'
      : 'te deja la ventana angosta';
  return { stat: entrada.statRelevante, valor, frase };
}
