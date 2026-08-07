import path from 'path';
import { fileURLToPath } from 'url';
import { verificarSinMathRandom } from './guards.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplitAuto, ETAPAS_SPLIT } from '../core/pipeline.js';
import { getPath } from '../core/selectors.js';
import { ARQUETIPOS } from '../data/meta-tags.js';
import { ROLES, IDS_ROL } from '../data/roles.js';
import LIGAS from '../data/leagues.json' with { type: 'json' };
import CAMPEONES from '../data/champions.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..');

const errores = [];

function check(nombre, fn) {
  try {
    fn();
    console.log(`OK   ${nombre}`);
  } catch (error) {
    errores.push(`${nombre}: ${error.message}`);
    console.log(`FAIL ${nombre}: ${error.message}`);
  }
}

function correrCarrera(seed, splits) {
  const rng = mulberry32(seed);
  let state = createInitialState(seed, rng);
  for (let i = 0; i < splits && !state.terminado; i += 1) {
    state = avanzarSplitAuto(state, rng).state;
  }
  return state;
}

check('Sin aleatoriedad nativa fuera del RNG inyectado', () => {
  const infractores = verificarSinMathRandom(srcDir);
  if (infractores.length > 0) {
    throw new Error(`encontrado en: ${infractores.join(', ')}`);
  }
});

check('Contrato de sistemas del registro', () => {
  const ids = new Set();

  for (const sistema of ETAPAS_SPLIT) {
    if (typeof sistema.id !== 'string' || sistema.id.length === 0) {
      throw new Error('hay un sistema sin id exportado');
    }
    if (ids.has(sistema.id)) {
      throw new Error(`id de sistema duplicado: ${sistema.id}`);
    }
    ids.add(sistema.id);

    if (typeof sistema.aplicar !== 'function') {
      throw new Error(`${sistema.id}: no exporta aplicar(state, rng)`);
    }
    if (sistema.aplicar.length !== 2) {
      throw new Error(`${sistema.id}: aplicar debe recibir (state, rng)`);
    }

    // Un sistema que puede pausar el split tiene que saber reanudarlo,
    // tanto con una persona decidiendo como en simulacion masiva.
    const puedePausar = typeof sistema.resolver === 'function';
    if (puedePausar && typeof sistema.resolverAuto !== 'function') {
      throw new Error(`${sistema.id}: exporta resolver pero no resolverAuto`);
    }
  }
});

check('Esquema de eventos válido', () => {
  const estadoBase = createInitialState(1, mulberry32(1));
  const ids = new Set();

  for (const evento of TODOS_LOS_EVENTOS) {
    if (!evento.id || typeof evento.id !== 'string') {
      throw new Error('evento sin id válido');
    }
    if (ids.has(evento.id)) {
      throw new Error(`id de evento duplicado: ${evento.id}`);
    }
    ids.add(evento.id);

    if (typeof evento.weight !== 'number' || evento.weight <= 0) {
      throw new Error(`${evento.id}: weight inválido`);
    }
    if (!Array.isArray(evento.conditions)) {
      throw new Error(`${evento.id}: conditions debe ser un array`);
    }
    for (const condicion of evento.conditions) {
      if (!condicion.field || !condicion.op) {
        throw new Error(`${evento.id}: condición mal formada`);
      }
      if (getPath(estadoBase, condicion.field) === undefined) {
        throw new Error(`${evento.id}: condición sobre un campo inexistente (${condicion.field})`);
      }
    }

    if (!Array.isArray(evento.options) || evento.options.length === 0) {
      throw new Error(`${evento.id}: sin opciones`);
    }

    for (const opcion of evento.options) {
      if (typeof opcion.weight !== 'number' || opcion.weight <= 0) {
        throw new Error(`${evento.id}/${opcion.id}: weight de opción inválido`);
      }
      if (!Array.isArray(opcion.outcomes) || opcion.outcomes.length < 2) {
        throw new Error(`${evento.id}/${opcion.id}: una opción necesita al menos 2 outcomes (regla 8)`);
      }

      for (const outcome of opcion.outcomes) {
        if (typeof outcome.weight !== 'number' || outcome.weight <= 0) {
          throw new Error(`${evento.id}/${opcion.id}: weight de outcome inválido`);
        }
        if (!Array.isArray(outcome.effects) || outcome.effects.length === 0) {
          throw new Error(`${evento.id}/${opcion.id}: outcome sin efectos`);
        }

        for (const effect of outcome.effects) {
          if (!effect.path || typeof effect.path !== 'string') {
            throw new Error(`${evento.id}/${opcion.id}: efecto sin path`);
          }
          // Un path con typo hoy crearia una propiedad nueva en silencio via setPath.
          if (getPath(estadoBase, effect.path) === undefined) {
            throw new Error(`${evento.id}/${opcion.id}: el path ${effect.path} no existe en el estado inicial`);
          }

          if (effect.type === 'push') {
            if (!Array.isArray(effect.values) || effect.values.length < 2) {
              throw new Error(`${evento.id}/${opcion.id}: efecto push en ${effect.path} necesita al menos 2 values (regla 7)`);
            }
            continue;
          }

          if (typeof effect.min !== 'number' || typeof effect.max !== 'number') {
            throw new Error(`${evento.id}/${opcion.id}: rango min/max faltante en ${effect.path}`);
          }
          if (effect.min >= effect.max) {
            throw new Error(`${evento.id}/${opcion.id}: rango degenerado en ${effect.path} (min ${effect.min} >= max ${effect.max}) — regla 7`);
          }
        }
      }
    }
  }
});

check('Campeones, roles y ligas coherentes', () => {
  const arquetipos = new Set(ARQUETIPOS);
  const nombres = new Set();

  for (const campeon of CAMPEONES) {
    if (nombres.has(campeon.name)) {
      throw new Error(`campeón duplicado: ${campeon.name}`);
    }
    nombres.add(campeon.name);

    if (!ROLES[campeon.role]) {
      throw new Error(`${campeon.name}: rol inválido (${campeon.role})`);
    }
    if (!Array.isArray(campeon.tags) || campeon.tags.length === 0) {
      throw new Error(`${campeon.name}: sin tags de arquetipo`);
    }
    for (const tag of campeon.tags) {
      // Si el pool y el meta no hablan el mismo vocabulario, el Ajuste al Meta
      // es siempre 0 y nadie se entera.
      if (!arquetipos.has(tag)) {
        throw new Error(`${campeon.name}: tag "${tag}" no existe en ARQUETIPOS`);
      }
    }
  }

  for (const rol of IDS_ROL) {
    const disponibles = CAMPEONES.filter((campeon) => campeon.role === rol).length;
    if (disponibles < BALANCE.mundo.campeonesIniciales) {
      throw new Error(`el rol ${rol} tiene ${disponibles} campeones y el pool inicial pide ${BALANCE.mundo.campeonesIniciales}`);
    }

    const suma = Object.values(ROLES[rol].pesos).reduce((acc, peso) => acc + peso, 0);
    if (Math.abs(suma - 1) > 0.001) {
      throw new Error(`los pesos de atributos del rol ${rol} suman ${suma.toFixed(3)} y deben sumar 1`);
    }
  }

  const idsLiga = new Set();
  for (const liga of LIGAS) {
    if (idsLiga.has(liga.id)) {
      throw new Error(`liga duplicada: ${liga.id}`);
    }
    idsLiga.add(liga.id);

    if (!Array.isArray(liga.orgs) || liga.orgs.length === 0) {
      throw new Error(`${liga.id}: sin orgs`);
    }
    if (liga.cupoImports < 0 || liga.cupoImports >= 5) {
      throw new Error(`${liga.id}: cupoImports fuera de rango (un roster tiene 5 titulares)`);
    }
  }
});

check('El mundo se genera desde la seed y varía entre seeds', () => {
  const mundos = [];

  for (let seed = 1; seed <= 60; seed += 1) {
    const state = createInitialState(seed, mulberry32(seed));

    if (!ROLES[state.player.role]) {
      throw new Error(`seed ${seed}: rol generado inválido (${state.player.role})`);
    }
    if (state.player.championPool.length !== BALANCE.mundo.campeonesIniciales) {
      throw new Error(`seed ${seed}: el pool inicial no tiene ${BALANCE.mundo.campeonesIniciales} campeones`);
    }
    if (state.mundo.rivales.length !== BALANCE.mundo.cantidadRivales) {
      throw new Error(`seed ${seed}: no se generaron ${BALANCE.mundo.cantidadRivales} rivales de generación`);
    }
    if (new Set(state.mundo.rivales.map((rival) => rival.handle)).size !== state.mundo.rivales.length) {
      throw new Error(`seed ${seed}: hay handles de rival repetidos`);
    }
    if (!BALANCE.formasCarrera[state.player.oculto.formaCarrera]) {
      throw new Error(`seed ${seed}: forma de carrera desconocida`);
    }

    mundos.push(JSON.stringify({
      rol: state.player.role,
      liga: state.mundo.ligaOrigen,
      origen: state.origen,
      oculto: state.player.oculto,
      pool: state.player.championPool.map((campeon) => campeon.name)
    }));
  }

  const distintos = new Set(mundos).size;
  if (distintos < mundos.length * 0.9) {
    throw new Error(`60 seeds produjeron solo ${distintos} mundos distintos: la generación está poco dispersa`);
  }

  // Los roles no pueden salir todos iguales: seria un mundo de un solo carril.
  const roles = new Set(
    Array.from({ length: 60 }, (unused, i) => createInitialState(i + 1, mulberry32(i + 1)).player.role)
  );
  if (roles.size < IDS_ROL.length) {
    throw new Error(`en 60 seeds solo aparecieron ${roles.size} de los ${IDS_ROL.length} roles`);
  }
});

check('Balance coherente', () => {
  const a = BALANCE.atributos;

  if (a.pisoJuvenil <= 0 || a.pisoJuvenil >= 1) {
    throw new Error('atributos.pisoJuvenil debe estar entre 0 y 1');
  }
  if (a.formaPersistencia < 0 || a.formaPersistencia >= 1) {
    // Con persistencia >= 1 la forma no vuelve nunca: una racha seria eterna.
    throw new Error('atributos.formaPersistencia debe estar entre 0 y 1');
  }
  if (a.burnoutUmbral <= BALANCE.stats.min) {
    throw new Error('atributos.burnoutUmbral debe estar por encima del piso de stats');
  }
  if (!a.acumulativos.macro || a.acumulativos.macro.permiteBajar) {
    throw new Error('el macro no declina (CONCEPTO §6): acumulativos.macro.permiteBajar debe ser false');
  }
  for (const [stat, config] of Object.entries({ ...a.curvas, ...a.acumulativos })) {
    if (!(stat in BALANCE.inicial.stats)) {
      throw new Error(`atributos: ${stat} no existe en los stats iniciales`);
    }
    if ((config.velocidad ?? config.ganancia) <= 0) {
      throw new Error(`atributos: ${stat} no evoluciona`);
    }
  }

  if (BALANCE.meta.maxDelta <= 0) {
    throw new Error('meta.maxDelta debe ser positivo');
  }
  if (BALANCE.meta.pesoDominante <= BALANCE.meta.pesoMinimo) {
    throw new Error('meta.pesoDominante debe ser mayor que meta.pesoMinimo');
  }
  if (BALANCE.stats.min >= BALANCE.stats.max) {
    throw new Error('stats.min debe ser menor que stats.max');
  }
  if (!Number.isInteger(BALANCE.edad.splitsPorEdad) || BALANCE.edad.splitsPorEdad <= 0) {
    throw new Error('edad.splitsPorEdad debe ser un entero positivo');
  }
  if (BALANCE.edad.probSegundaDecision < 0 || BALANCE.edad.probSegundaDecision > 1) {
    throw new Error('edad.probSegundaDecision debe estar entre 0 y 1');
  }
});

check('Hay al menos un evento de cierre de edad por fase amateur', () => {
  const cierres = TODOS_LOS_EVENTOS.filter((evento) => evento.cierreDeEdad);
  if (cierres.length === 0) {
    throw new Error('no hay eventos con cierreDeEdad: true');
  }
  for (const evento of cierres) {
    if (!Array.isArray(evento.conditions)) {
      throw new Error(`${evento.id}: evento de cierre sin conditions`);
    }
  }
});

check('El Ajuste al Meta se mueve de verdad', () => {
  // Este check existe por un bug real: el pool tenía tags que el meta no
  // conocía, así que el ajuste habría sido siempre neutro sin que nadie lo
  // notara. Si el cruce se desconecta otra vez, esto falla.
  const ajustes = [];

  for (let seed = 1; seed <= 60; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 12 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      ajustes.push(state.meta.ajuste);
    }
  }

  const neutro = BALANCE.campeones.ajusteNeutro;
  const distintos = new Set(ajustes).size;
  if (distintos < 15) {
    throw new Error(`el ajuste al meta tomó solo ${distintos} valores distintos: el cruce pool/meta está roto`);
  }
  if (!ajustes.some((a) => a > neutro + 10) || !ajustes.some((a) => a < neutro - 10)) {
    throw new Error('el ajuste al meta nunca se aleja del neutro: los tags del pool no cruzan con los pesos del meta');
  }
});

check('El ciclo profesional produce carreras distintas', () => {
  const carreras = [];

  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    for (let i = 0; i < 30 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
    }
    if (state.career.currentOrg) {
      carreras.push(state);
    }
  }

  if (carreras.length === 0) {
    throw new Error('en 120 seeds nadie llegó a la etapa profesional');
  }

  for (const carrera of carreras) {
    if (carrera.career.companeros.length !== IDS_ROL.length - 1) {
      throw new Error(`un roster quedó con ${carrera.career.companeros.length} compañeros`);
    }
    if (carrera.career.companeros.some((companero) => companero.role === carrera.player.role)) {
      throw new Error('hay un compañero jugando el mismo rol que el jugador');
    }
  }

  // La jerarquia tiene que moverse en las dos direcciones: si se clava arriba,
  // la espiral central de CONCEPTO §7 deja de existir.
  const jerarquias = carreras.map((carrera) => carrera.career.jerarquia);
  if (Math.max(...jerarquias) - Math.min(...jerarquias) < 30) {
    throw new Error('la jerarquía casi no varía entre carreras: la espiral central no está funcionando');
  }

  // Y no todos pueden ganar lo mismo.
  const titulos = new Set(carreras.map((carrera) => carrera.career.titulos));
  if (titulos.size < 3) {
    throw new Error(`todas las carreras terminaron con ${[...titulos].join('/')} títulos: la liga no compite`);
  }
});

check('El split cierra siempre: no queda ninguna decisión colgada', () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 12 && !state.terminado; i += 1) {
      state = avanzarSplitAuto(state, rng).state;
      if (state.pendiente !== null) {
        throw new Error(`seed ${seed}: quedó una decisión pendiente después de cerrar el split`);
      }
    }
  }
});

check('Pipeline corre y es determinista (misma seed, dos corridas)', () => {
  const seed = 123;
  const splits = 12;
  const estadoA = correrCarrera(seed, splits);
  const estadoB = correrCarrera(seed, splits);

  if (JSON.stringify(estadoA) !== JSON.stringify(estadoB)) {
    throw new Error('dos corridas con la misma seed dieron resultados distintos');
  }
});

check('Seeds distintas producen carreras distintas', () => {
  const a = JSON.stringify(correrCarrera(1, 12));
  const b = JSON.stringify(correrCarrera(2, 12));

  if (a === b) {
    throw new Error('dos seeds distintas produjeron exactamente la misma carrera');
  }
});

if (errores.length > 0) {
  console.error(`\n${errores.length} check(s) fallaron.`);
  process.exit(1);
} else {
  console.log('\nTodos los checks pasaron.');
}
