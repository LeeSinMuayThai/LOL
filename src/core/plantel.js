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
export function generarNpc(rng, { rol, regionId, fuerzaOrg, medianaSalarioUSD, usados, edad, rivalDeGeneracion = false }) {
  const p = BALANCE.plantel;
  const [formaCarrera, forma] = weightedPick(Object.entries(BALANCE.formasCarrera), ([, datos]) => datos.peso, rng);
  const edadReal = edad ?? Math.round(clamp(gauss(p.edadMedia, p.edadSpread, rng), p.edadMin, p.edadMax));
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

// El plantel de una org: una casilla por rol. `usados` es el set global de
// handles de la partida, para que nadie se repita.
export function generarPlantel(rng, { orgNombre, regionId, fuerzaOrg, medianaSalarioUSD, usados }) {
  const plantel = {};
  for (const rol of IDS_ROL) {
    plantel[rol] = generarNpc(rng, { rol, regionId, fuerzaOrg, medianaSalarioUSD, usados });
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
        usados
      });
    }
  }
  return planteles;
}
