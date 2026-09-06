import { roll, gauss, weightedPick } from './rng.js';
import { clamp, clampStat } from './numeros.js';
import { BALANCE } from '../data/balance.js';
import { nivelDeCurva } from './curvas.js';
import { generarHandle } from './mundo.js';
import { IDS_ROL } from '../data/roles.js';

// EL MUNDO TIENE GENTE (fase 9M, PLAN.md §9M.2).
//
// Cada org de tier 1 y de la tier 2 de tu región tiene 5 jugadores NPC con
// carrera propia: edad, contrato, potencial y forma de carrera. Envejecen,
// se retiran y suben canteranos en el offseason (`systems/plantel.js`).
//
// La regla que sostiene todo: un NPC y vos se miden con la MISMA vara. El nivel
// de un NPC sale de `core/curvas.js` —la misma curva que sigue tu hoja de
// atributos— evaluada a su edad, y se compara con `nivelDelJugador` en la misma
// escala 0-100. Eso es lo que después deja a `core/demanda.js` (9Mb) decidir si
// una org te prefiere a vos o al NPC que ya tiene.
//
// Puro y determinista: todo el `rng` entra por parámetro.

// ¿A qué nivel apunta la curva de un NPC a esta edad? Es el objetivo que el
// envejecimiento del offseason persigue con ruido. Sin el bonus por splits
// jugados (un ±15 que a un NPC no le hace falta).
export function nivelNpc(npc, edad = npc.edad) {
  const oculto = { potencial: npc.potencial, formaCarrera: npc.formaCarrera, edadPico: npc.edadPico };
  return Math.round(clampStat(nivelDeCurva(edad, oculto, { splitsJugados: 0 })));
}

// El multiplicador de la curva a una edad dada: `piso + (1-piso)·f`, con `f`
// subiendo hacia la edad de pico y cayendo después. Extraído para poder
// invertir la curva y también para el envejecimiento del offseason.
function multiplicadorCurva(edad, forma, edadPico) {
  const a = BALANCE.atributos;
  const f = edad <= edadPico
    ? clamp(1 - ((edadPico - edad) / a.anchoSubida) ** 2, 0, 1)
    : clamp(1 - forma.caida * ((edad - edadPico) / a.anchoBajada) ** 2, a.factorMinimo, 1);
  return Math.max(0.25, a.pisoJuvenil + (1 - a.pisoJuvenil) * f);
}

// El `potencial` que hace pasar la curva por `nivel` a `edad`. Es un dato de
// FORMA para el envejecimiento (`systems/plantel.js`), no la fuente del nivel
// del día 1: ese sale directo de `nivelObjetivo` (así el promedio del plantel
// orbita la `fuerza` sorteada de la org y la distribución agregada no se mueve;
// derivar el nivel de la curva la aplastaba ~5 puntos porque casi nadie está en
// su edad de pico).
function potencialParaNivel(nivel, edad, forma, edadPico) {
  const techo = nivel / multiplicadorCurva(edad, forma, edadPico);
  return clamp(techo / forma.amplitud, BALANCE.mundo.potencialMin, BALANCE.mundo.potencialMax);
}

// Un NPC nuevo. `rivalDeGeneracion` marca a los 5 que corren su carrera de
// primera en paralelo a la tuya (CONCEPTO §6, D8): viven en planteles reales.
// `edadMinima` (fase 9Mc): ninguna casilla arranca por debajo de la edad legal
// de su liga (LEC/LPL exigen 18) — antes la generación del mundo la ignoraba.
export function generarNpc(rng, { rol, regionId, fuerzaOrg, medianaSalarioUSD, usados, edad, edadMinima = 0, rivalDeGeneracion = false }) {
  const p = BALANCE.plantel;
  const [formaCarrera, forma] = weightedPick(Object.entries(BALANCE.formasCarrera), ([, datos]) => datos.peso, rng);
  const edadReal = edad ?? Math.round(clamp(gauss(p.edadMedia, p.edadSpread, rng), Math.max(p.edadMin, edadMinima), p.edadMax));
  const edadPico = Number(gauss(forma.picoEdad, forma.picoSpread, rng).toFixed(2));
  const nivel = Math.round(clampStat(gauss(fuerzaOrg, p.nivelSpread, rng)));
  const potencial = Math.round(potencialParaNivel(nivel, edadReal, forma, edadPico));

  const npc = {
    handle: generarHandle(rng, usados),
    role: rol,
    edad: edadReal,
    regionId,
    nivel,
    potencial,
    formaCarrera,
    edadPico,
    splitsEnRegion: { [regionId]: roll(0, p.splitsRegionMax, rng) },
    rivalDeGeneracion,
    contrato: { anios: roll(p.contratoAniosMin, p.contratoAniosMax, rng), salarioAnualUSD: 0 }
  };
  npc.contrato.salarioAnualUSD = Math.round(
    medianaSalarioUSD * (p.salarioBaseFactor + (npc.nivel / BALANCE.stats.max) * p.salarioNivelFactor)
  );
  return npc;
}

// --- El envejecimiento del mundo (fase 9M) ---
//
// Estas tres primitivas las comparten `systems/plantel.js` (el offseason de la
// etapa amateur, donde el mercado del jugador todavía no corre) y
// `core/mercadoMundial.js` (9Mc: la resolución top-down de la pretemporada
// profesional). Antes vivían privadas en `systems/plantel.js`; se subieron acá
// para que una sola implementación envejezca el mundo, la mire quien la mire.

// El set de handles ya tomados en la partida: el jugador, cada casilla de
// plantel y cada rival de generación. `generarHandle` lo necesita para no
// repetir a nadie.
export function usadosDePlanteles(state) {
  const usados = new Set([state.player.name]);
  for (const plantel of Object.values(state.mundo.planteles ?? {})) {
    for (const npc of Object.values(plantel)) {
      usados.add(npc.handle);
    }
  }
  for (const rival of state.mundo.rivales ?? []) {
    usados.add(rival.handle);
  }
  return usados;
}

// Un NPC, un año más viejo: la edad sube, el nivel persigue la curva con ruido
// (rachas), y el contrato descuenta un año. La casilla del jugador (`esJugador`)
// no envejece por acá — el jugador tiene su propia hoja de atributos.
export function envejecerNpc(npc, rng) {
  if (npc.esJugador) {
    return npc;
  }
  const p = BALANCE.plantel;
  const edad = npc.edad + 1;
  const nivelCurva = nivelNpc({ ...npc, edad });
  const nivel = Math.round(clampStat(gauss(nivelCurva, p.ruidoNivelAnual, rng)));
  return {
    ...npc,
    edad,
    nivel,
    contrato: { ...npc.contrato, anios: Math.max(0, npc.contrato.anios - 1) }
  };
}

// ¿Este NPC deja el mundo este offseason (se retira, nadie lo quiere)? Un rival
// de generación corre una carrera larga (D8): sólo se va de viejo. El resto:
// contrato vencido, ya pasó su pico, y su nivel cayó por debajo del piso de la
// org — o demasiado viejo.
export function seVaDelMundo(npc, fuerzaOrg) {
  const p = BALANCE.plantel;
  if (npc.rivalDeGeneracion) {
    return npc.edad >= p.retiroEdadDura + p.rivalRetiroExtra;
  }
  if (npc.edad >= p.retiroEdadDura) {
    return true;
  }
  return npc.contrato.anios <= 0
    && npc.edad > npc.edadPico + p.retiroEdadSobrePico
    && npc.nivel < fuerzaOrg - p.retiroNivelBajoOrg;
}

// El nivel-ancla de un reemplazo: regresa hacia el prestigio de la liga en vez
// de orbitar la `org.fuerza` (que deriva del plantel; sin regresión el mundo se
// desangra offseason a offseason). `prestigioPorDefecto` cubre las zonas sin
// `liga.prestigio` (tier 3).
export function nivelAnclaReemplazo(liga, fuerzaOrg, prestigioPorDefecto) {
  const prestigio = liga.prestigio ?? prestigioPorDefecto ?? fuerzaOrg;
  return prestigio + BALANCE.plantel.reemplazoRegresionALiga * (fuerzaOrg - prestigio);
}

// El canterano de 17-19 que sube a cubrir un asiento vacante. El piso de edad
// respeta la `edadMinima` de la liga (LEC/LPL exigen 18): un canterano nunca
// entra por debajo de la edad legal de su liga.
export function generarCanterano(rng, { rol, liga, fuerzaOrg, usados, prestigioPorDefecto }) {
  const p = BALANCE.plantel;
  const edadMin = Math.max(p.canteraEdadMin, liga.edadMinima ?? 0);
  return generarNpc(rng, {
    rol,
    regionId: liga.regionId,
    medianaSalarioUSD: liga.salario.medianaUSD,
    usados,
    edad: roll(Math.min(edadMin, p.canteraEdadMax), p.canteraEdadMax, rng),
    fuerzaOrg: nivelAnclaReemplazo(liga, fuerzaOrg, prestigioPorDefecto) - p.canteraNivelBajoOrg
  });
}

// El plantel de una org: una casilla por rol. `usados` es el set global de
// handles de la partida, para que nadie se repita.
export function generarPlantel(rng, { orgNombre, regionId, fuerzaOrg, medianaSalarioUSD, usados, edadMinima = 0 }) {
  const plantel = {};
  for (const rol of IDS_ROL) {
    plantel[rol] = generarNpc(rng, { rol, regionId, fuerzaOrg, medianaSalarioUSD, usados, edadMinima });
  }
  return plantel;
}

// La fuerza de una org DERIVA de su plantel: el promedio de nivel de sus 5.
// Al generar el mundo cada casilla orbita el `fuerza` sorteado de hoy, así que
// el promedio ≈ ese valor y la distribución agregada no se mueve. Desde el año
// 2, un equipo que ficha bien sube de fuerza (lo recalcula `systems/plantel.js`
// al cerrar cada offseason).
export function fuerzaDePlantel(plantel) {
  const casillas = Object.values(plantel);
  return Math.round(casillas.reduce((suma, npc) => suma + npc.nivel, 0) / casillas.length);
}

// Qué ligas se simulan en detalle (PLAN.md §9M.2: ~340 NPCs). Las 6 tier 1 más
// la tier 2 de tu región. El resto de tier 2 y todo tier 3 sigue con `fuerza`
// escalar — nadie te ficha desde ahí hasta que exista el mercado entre regiones.
export function ligasConPlantel(ligas, regionIdOrigen) {
  return ligas.filter((liga) => liga.tier === 1 || (liga.tier === 2 && liga.regionId === regionIdOrigen));
}

// Genera el mundo de gente de una vez. Se llama en `generarMundo`, en posición
// fija del stream (después de `generarLigas`, antes de `generarRivales` —
// trampa T1). Devuelve `{ [orgNombre]: plantel }` y NO muta `ligas`: quien
// llama sobrescribe `org.fuerza` con `fuerzaDePlantel`.
export function generarPlanteles(rng, ligas, regionIdOrigen, usados) {
  const planteles = {};
  for (const liga of ligasConPlantel(ligas, regionIdOrigen)) {
    for (const org of liga.orgs) {
      planteles[org.nombre] = generarPlantel(rng, {
        orgNombre: org.nombre,
        regionId: liga.regionId,
        fuerzaOrg: org.fuerza,
        medianaSalarioUSD: liga.salario.medianaUSD,
        usados,
        edadMinima: liga.edadMinima ?? 0
      });
    }
  }
  return planteles;
}
