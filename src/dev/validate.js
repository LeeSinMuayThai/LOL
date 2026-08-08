import path from 'path';
import { fileURLToPath } from 'url';
import { verificarSinMathRandom } from './guards.js';
import { BALANCE } from '../data/balance.js';
import { TODOS_LOS_EVENTOS } from '../data/events/index.js';
import { mulberry32 } from '../core/rng.js';
import { createInitialState } from '../core/state.js';
import { avanzarSplit, avanzarSplitAuto, resolverDecision, ETAPAS_SPLIT } from '../core/pipeline.js';
import { sistemaPorId } from '../systems/registro.js';
import { getPath, etiquetaCampo } from '../core/selectors.js';
import { calcularContexto } from '../core/contexto.js';
import {
  aplicarLP, desdePuntos, puntosAbsolutos, esApice, rangoAproximado,
  servidorConCutoffs, servidorDeLaPartida
} from '../core/ranked.js';
import { TOKENS, tokensUsados } from '../core/plantillas.js';
import { RUTINAS } from '../core/rutinas.js';
import { EJES, MARCAS, MOMENTOS_ACTIVOS, momentoPorId } from '../data/contextos.js';
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
  // Este check reemplaza a uno que referenciaba `meta.pesoDominante`, clave que
  // se borró al reescribir la sección meta: `undefined <= 0.5` es false, así que
  // el check nunca fallaba y daba falsa confianza.
  if (BALANCE.meta.pesoMaximo <= BALANCE.meta.pesoMinimo) {
    throw new Error('meta.pesoMaximo debe ser mayor que meta.pesoMinimo');
  }
  if (BALANCE.meta.sacudonDelta <= BALANCE.meta.maxDelta) {
    throw new Error('un sacudón de meta tiene que mover más que un parche calmo');
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

check('El contenido declara su contexto con vocabulario válido', () => {
  const marcasValidas = new Set(MARCAS);

  for (const evento of TODOS_LOS_EVENTOS) {
    for (const pieza of [evento, ...evento.options]) {
      // El gating grueso va SIEMPRE en `contexto`. Si se pudiera esconder
      // adentro de una condición numérica, la matriz de cobertura mentiría.
      for (const condicion of pieza.conditions ?? []) {
        if (condicion.field === 'phase' || condicion.field === 'age') {
          throw new Error(`${evento.id}: "${condicion.field}" va en el bloque contexto, no en conditions`);
        }
      }

      for (const [eje, valores] of Object.entries(pieza.contexto ?? {})) {
        if (eje === 'edadMin' || eje === 'edadMax') {
          if (typeof valores !== 'number') {
            throw new Error(`${evento.id}: ${eje} debe ser un número`);
          }
          continue;
        }
        if (eje === 'momento') {
          for (const momento of valores) {
            if (!momentoPorId(momento)) {
              throw new Error(`${evento.id}: momento desconocido "${momento}"`);
            }
          }
          continue;
        }
        if (eje === 'marcas') {
          for (const marca of valores) {
            if (!marcasValidas.has(marca.replace(/^!/, ''))) {
              throw new Error(`${evento.id}: marca desconocida "${marca}"`);
            }
          }
          continue;
        }
        if (!EJES[eje]) {
          throw new Error(`${evento.id}: eje de contexto desconocido "${eje}"`);
        }
        for (const valor of valores) {
          if (!EJES[eje].includes(valor)) {
            throw new Error(`${evento.id}: valor "${valor}" no existe en el eje ${eje}`);
          }
        }
      }
    }
  }
});

// Todo el texto que un evento puede llegar a mostrar, con el contexto efectivo
// bajo el que se muestra. Una opcion hereda el contexto de su evento y puede
// estrecharlo, asi que para chequearla hay que mirar los dos juntos.
function textosDeEventos() {
  const piezas = [];

  for (const evento of TODOS_LOS_EVENTOS) {
    const base = evento.contexto ?? {};
    piezas.push({ id: evento.id, contexto: base, texto: evento.title });
    piezas.push({ id: evento.id, contexto: base, texto: evento.description });

    for (const opcion of evento.options) {
      const contexto = { ...base, ...(opcion.contexto ?? {}) };
      const donde = `${evento.id}/${opcion.id}`;
      piezas.push({ id: donde, contexto, texto: opcion.label });
      piezas.push({ id: donde, contexto, texto: opcion.descripcion });
      for (const outcome of opcion.outcomes) {
        piezas.push({ id: donde, contexto, texto: outcome.texto });
      }
    }
  }

  return piezas;
}

check('Todo texto de contenido usa tokens que existen', () => {
  for (const pieza of textosDeEventos()) {
    for (const token of tokensUsados(pieza.texto)) {
      if (!TOKENS[token]) {
        throw new Error(`token desconocido "{${token}}" en ${pieza.id}: ${pieza.texto}`);
      }
    }
  }
});

// --- Los cuatro checks de la fase 0 ---

check('Todo contenido declara dónde aparece', () => {
  // Sin esto, un evento cae en cualquier momento de la carrera: es la causa
  // exacta de que un scout te llame en Platino y de que te salga un meme de la
  // prensa antes de tener prensa. Además, mientras haya contenido sin gatear la
  // matriz de cobertura miente, porque esas piezas llenan todas las celdas.
  const sinContexto = [];

  for (const evento of TODOS_LOS_EVENTOS) {
    if (!evento.contexto || Object.keys(evento.contexto).length === 0) {
      sinContexto.push(`evento ${evento.id}`);
    }
  }
  for (const [pool, rutinas] of Object.entries(RUTINAS)) {
    for (const rutina of rutinas) {
      if (!rutina.contexto || Object.keys(rutina.contexto).length === 0) {
        sinContexto.push(`rutina ${pool}/${rutina.id}`);
      }
    }
  }

  if (sinContexto.length > 0) {
    throw new Error(`sin bloque contexto: ${sinContexto.join(', ')}`);
  }
});

check('Toda opción se lee antes y todo resultado se cuenta después', () => {
  // Una opcion sin `descripcion` es un boton sin apuesta: no sabes que estas
  // arriesgando. Un outcome sin `texto` devuelve un diff en vez de una historia
  // — "Hype +8, Mentalidad -1" y nunca te enteras de que paso.
  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options) {
      if (typeof opcion.descripcion !== 'string' || opcion.descripcion.trim() === '') {
        throw new Error(`${evento.id}/${opcion.id}: opción sin descripcion`);
      }
      for (const [i, outcome] of opcion.outcomes.entries()) {
        if (typeof outcome.texto !== 'string' || outcome.texto.trim() === '') {
          throw new Error(`${evento.id}/${opcion.id}: outcome ${i} sin texto narrativo`);
        }
      }
    }
  }
});

check('Ningún token puede quedar sin resolver donde el contenido aparece', () => {
  // Análisis estático sobre el gating declarado, sin simular. Mata la clase
  // entera de "oraciones sin sentido": un texto que dice "{jungla} no camina más
  // para vos" en un evento que puede caer en la etapa amateur imprime la llave
  // cruda en pantalla, porque ahí no hay equipo.
  const CON_EQUIPO = ['debut', 'profesional', 'declive'];
  const CON_ORG = ['tier3', 'tier2', 'tier1'];
  const TOKENS_DE_ORG = ['org', 'liga'];
  const TOKENS_DE_COMPANERO = ['top', 'jungla', 'mid', 'adc', 'support'];

  const garantizaOrg = (contexto) => {
    const etapas = contexto.etapa;
    const niveles = contexto.nivel;
    return (Array.isArray(etapas) && etapas.every((etapa) => CON_EQUIPO.includes(etapa)))
      || (Array.isArray(niveles) && niveles.every((nivel) => CON_ORG.includes(nivel)));
  };
  const exigeMarca = (contexto, marca) => (contexto.marcas ?? []).includes(marca);

  for (const pieza of textosDeEventos()) {
    for (const token of tokensUsados(pieza.texto)) {
      if (TOKENS_DE_ORG.includes(token) && !garantizaOrg(pieza.contexto)) {
        throw new Error(`${pieza.id}: usa {${token}} pero puede aparecer sin equipo (declará etapa o nivel)`);
      }
      if (TOKENS_DE_COMPANERO.includes(token) && !exigeMarca(pieza.contexto, 'con_vestuario')) {
        throw new Error(`${pieza.id}: usa {${token}} pero no exige la marca con_vestuario`);
      }
      if (token === 'signature' && !exigeMarca(pieza.contexto, 'signature')) {
        throw new Error(`${pieza.id}: usa {signature} pero no exige la marca signature`);
      }
    }
  }
});

check('Ningún número llega al jugador con decimales', () => {
  // Los stats viven como float a proposito (redondear en cada split moveria el
  // balance), pero un float crudo en pantalla —`mecánica 62.12317247563275`—
  // tapa media pantalla y no significa nada. Se redondea al producir texto.
  const conDecimales = /\d\.\d{2,}/;

  for (let seed = 1; seed <= 200; seed += 1) {
    const state = correrCarrera(seed, 60);
    for (const entrada of state.logs) {
      for (const texto of [entrada.message, entrada.cuerpo, entrada.efectos]) {
        if (typeof texto === 'string' && conDecimales.test(texto)) {
          throw new Error(`seed ${seed}: número sin redondear en el log — "${texto}"`);
        }
      }
    }
  }
});

check('Todo efecto tiene etiqueta legible para el log', () => {
  // Sin esto, un path sin etiqueta imprime el path crudo en el log del jugador.
  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options) {
      for (const outcome of opcion.outcomes) {
        for (const effect of outcome.effects) {
          if (etiquetaCampo(effect.path) === effect.path) {
            throw new Error(`${evento.id}: el path ${effect.path} no tiene entrada en ETIQUETAS_CAMPO`);
          }
        }
      }
    }
  }
});

check('La escalera de ranked se comporta como la del juego', () => {
  const servidor = servidorConCutoffs('LAS');
  const rng = mulberry32(7);
  const base = { servidor: 'LAS', escudo: 0, partidas: 0 };

  // Promoción con rollover del excedente.
  const casiPromociona = { ...base, tier: 'gold', division: 2, lp: 96 };
  const promocionado = aplicarLP(casiPromociona, 9, servidor, rng);
  if (promocionado.division !== 1 || promocionado.lp !== 5) {
    throw new Error(`la promoción no hizo rollover: quedó en ${promocionado.tier} ${promocionado.division} con ${promocionado.lp} LP`);
  }

  // Descenso: no se cae en 0 LP, se cae en 25/50/75.
  const alBorde = { ...base, tier: 'gold', division: 2, lp: 4 };
  const descendido = aplicarLP(alBorde, -20, servidor, rng);
  if (descendido.division !== 3 || !BALANCE.ranked.lpDescenso.includes(descendido.lp)) {
    throw new Error(`el descenso dejó ${descendido.tier} ${descendido.division} con ${descendido.lp} LP`);
  }

  // El escudo impide bajar de tier recién promocionado.
  const conEscudo = { ...base, tier: 'platinum', division: 4, lp: 3, escudo: 1 };
  const protegido = aplicarLP(conEscudo, -50, servidor, rng);
  if (protegido.tier !== 'platinum') {
    throw new Error(`el escudo no protegió el tier: cayó a ${protegido.tier}`);
  }

  // El ápice no tiene divisiones y su LP no tiene techo.
  const apice = aplicarLP({ ...base, tier: 'diamond', division: 1, lp: 95 }, 900, servidor, rng);
  if (apice.division !== null || !esApice(apice)) {
    throw new Error('entrar al ápice dejó una división colgada');
  }

  // Ida y vuelta: los puntos absolutos son una representación fiel.
  for (let puntos = 0; puntos < 4000; puntos += 37) {
    const ranked = desdePuntos(puntos, servidor);
    if (puntosAbsolutos({ ...base, ...ranked }) !== puntos) {
      throw new Error(`ida y vuelta rota en ${puntos} puntos`);
    }
  }
});

check('No hay decay: la escalera no se mueve sola', () => {
  // Un profesional juega soloQ todos los días, así que la inactividad no es
  // parte de esta historia. Lo que se verifica es que la escalera no baje POR
  // SÍ SOLA — un evento con efecto negativo sí puede hacerte perder LP, y eso
  // es una consecuencia, no decay.
  const servidor = servidorConCutoffs('LAS');
  const rng = mulberry32(11);

  for (let puntos = 0; puntos < 4200; puntos += 53) {
    const ranked = { servidor: 'LAS', escudo: 0, partidas: 0, ...desdePuntos(puntos, servidor) };
    for (let split = 0; split < 20; split += 1) {
      const despues = aplicarLP(ranked, 0, servidor, rng);
      if (puntosAbsolutos(despues) !== puntos) {
        throw new Error(`la escalera se movió sola: ${puntos} → ${puntosAbsolutos(despues)}`);
      }
    }
  }
});

check('Nadie escribe el espejo de la escalera', () => {
  // `player.soloqElo` es derivado. Si un efecto lo escribiera, quedaría
  // desincronizado de `player.ranked` sin que nada lo detecte.
  for (const evento of TODOS_LOS_EVENTOS) {
    for (const opcion of evento.options) {
      for (const outcome of opcion.outcomes) {
        for (const effect of outcome.effects) {
          if (effect.path === 'player.soloqElo') {
            throw new Error(`${evento.id}: escribe el espejo player.soloqElo; usá { "type": "ladder", "path": "player.ranked" }`);
          }
          if (effect.path === 'player.ranked' && effect.type !== 'ladder') {
            throw new Error(`${evento.id}: player.ranked solo se toca con efectos de tipo "ladder"`);
          }
        }
      }
    }
  }
});

check('La escalera produce una distribución realista al cerrar la etapa amateur', () => {
  let challenger = 0;
  let top50 = 0;
  const total = 400;

  for (let seed = 1; seed <= total; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);
    while (!state.terminado && state.phase === 'amateur' && state.player.splitCount < 20) {
      state = avanzarSplitAuto(state, rng).state;
    }

    if (esApice(state.player.ranked)) {
      const puesto = rangoAproximado(state.player.ranked, servidorDeLaPartida(state));
      if (puesto !== null) {
        challenger += 1;
        if (puesto <= BALANCE.amateur.puestoParaOrgGrande) {
          top50 += 1;
        }
      }
    }
  }

  // Challenger es el 0,025% de la ladder real. Acá el jugador es un prospecto,
  // no un jugador cualquiera, pero llegar arriba tiene que seguir siendo raro.
  const porcentajeChall = (challenger / total) * 100;
  if (porcentajeChall < 1 || porcentajeChall > 20) {
    throw new Error(`${porcentajeChall.toFixed(1)}% llegó a Challenger: fuera de la banda 1-20%`);
  }
  if ((top50 / total) * 100 > 6) {
    throw new Error(`${((top50 / total) * 100).toFixed(1)}% llegó al top 50 de su servidor: demasiado común`);
  }
});

check('Toda decisión de rutina ofrece una salida segura y la trampa', () => {
  // La forma de la decisión importa tanto como su contenido: nunca se acorrala
  // al jugador en una mala elección, y la trampa de CONCEPTO §4 siempre está
  // disponible aunque convenga no tomarla.
  for (let seed = 1; seed <= 120; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 20 && !state.terminado; i += 1) {
      const resultado = avanzarSplit(state, rng);
      state = resultado.state;

      while (state.pendiente) {
        const { decision } = state.pendiente;
        const rutinas = decision.datos?.rutinas;

        if (rutinas) {
          if (rutinas.length < 2) {
            throw new Error(`seed ${seed}: una decisión de rutina ofreció ${rutinas.length} opción(es)`);
          }
          const etiquetas = new Set(rutinas.flatMap((rutina) => rutina.etiquetas));
          if (!etiquetas.has('segura')) {
            throw new Error(`seed ${seed}: se ofrecieron rutinas sin ninguna salida segura`);
          }
          if (decision.datos.motivo === 'reparto' && !etiquetas.has('agresiva')) {
            throw new Error(`seed ${seed}: se ofrecieron rutinas amateur sin ninguna agresiva`);
          }
        }

        const sistema = sistemaPorId(state.pendiente.sistemaId);
        state = resolverDecision(state, sistema.resolverAuto(state, decision, rng), rng).state;
      }
    }
  }
});

check('El contexto de carrera nombra siempre dónde estás parado', () => {
  const vistos = new Set();

  for (let seed = 1; seed <= 300; seed += 1) {
    const rng = mulberry32(seed);
    let state = createInitialState(seed, rng);

    for (let i = 0; i < 45 && !state.terminado; i += 1) {
      const contexto = calcularContexto(state);

      // Si el motor puede llegar a un estado que ningún momento declara, el
      // juego no sabe dónde estás parado y el contenido no se puede gatear.
      if (contexto.momento === 'desconocido') {
        throw new Error(`seed ${seed}, split ${state.player.splitCount}: contexto sin momento declarado`);
      }
      vistos.add(contexto.momento);

      state = avanzarSplitAuto(state, rng).state;

      // El caché es una foto del arranque del split, a propósito: lo que gatea
      // contenido calcula el contexto en vivo (la fase puede cambiar a mitad de
      // split). Lo único que hay que garantizar es que el sistema lo refresque
      // y que lo que quede guardado sea un contexto válido.
      if (!state.contexto || !momentoPorId(state.contexto.momento)) {
        throw new Error(`seed ${seed}: el split cerró sin dejar un contexto válido en cache`);
      }
    }
  }

  // Un momento activo que nunca aparece es contenido muerto esperando.
  for (const momento of MOMENTOS_ACTIVOS) {
    if (!vistos.has(momento.id)) {
      throw new Error(`el momento "${momento.id}" no está marcado como pendiente y no apareció en 300 carreras`);
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
    // Solo cuentan las carreras con el roster ya armado: si el fichaje cayó en
    // el último split del muestreo, `roster.js` todavía no corrió.
    if (state.career.currentOrg && state.career.rosterDeOrg === state.career.currentOrg) {
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
