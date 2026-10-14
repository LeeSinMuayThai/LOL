// Las muestras de la previa (PLANUI §0.4): partidas guardadas justo antes de una parada, para abrir el juego en
// `/?previa=<muestra>` sin tocar la carrera del jugador (`src/ui/previa/almacen.js` las siembra en un almacén en memoria).
// Salen del motor, jugado headless con el bot `criterio` (el mismo runner que `vitrina/datos/`). Determinista.
//
//   node previa/generar.mjs            barre las seeds 1..60 hasta tener todas las muestras
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jugarCarrera } from '../vitrina/datos/lib/partida.mjs';
import { guardadoDe, validarGuardado } from '../vitrina/datos/lib/heroe.mjs';
import { motivoDe, esBo5DeLiga } from '../vitrina/datos/lib/cobertura.mjs';
import { leerEvento, varianteDeCostura } from '../src/ui/core/bisagra.js';
import { formaDeDecision } from '../src/ui/components/decision/comun.js';
import { ESTRATEGIAS } from '../src/dev/estrategias.js';

const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'muestras');
const SEEDS = 60;
const PRIORIDAD_RONDA = { final: 3, semis: 2, cuartos: 1 };

// nombre → { prioridad, guardado, titulo, seed }
const muestras = new Map();
function ofrecer(nombre, prioridad, ctx) {
  const actual = muestras.get(nombre);
  if (actual && prioridad <= actual.prioridad) return;
  muestras.set(nombre, { prioridad, seed: ctx.state.seed, titulo: ctx.decision.titulo ?? '', guardado: guardadoDe(ctx.state, ctx.rng, ctx.rngUi, ctx.pagina) });
}

// Las muestras que dependen de lo que pasa DESPUÉS de contestar (PLANUI §0.6): la final que se gana (`final`, para la
// copa) y la oferta que te lleva a otro club (`firma`, para la coreografía de la firma). Se guarda la partida en la
// parada y se confirma más tarde: el título entró a `registro.titulos`, o cambió el club. `eleccion` es la opción que
// eligió el bot (1-N): con la misma elección, el mismo resultado (el motor es determinista).
let candidatoFinal = null;
let candidatoFirma = null;
const titulosDe = (st) => st.career?.registro?.titulos?.length ?? 0;
const orgDe = (st) => st.career?.currentOrg ?? null;
function candidato(ctx, extra) {
  return { seed: ctx.state.seed, titulo: ctx.decision.titulo ?? '', decision: ctx.decision, eleccion: null, guardado: guardadoDe(ctx.state, ctx.rng, ctx.rngUi, ctx.pagina), ...extra };
}
function confirmar(st) {
  if (candidatoFinal?.eleccion && titulosDe(st) > candidatoFinal.titulosAntes) {
    if (!muestras.has('final')) muestras.set('final', { ...candidatoFinal, prioridad: 1 });
    candidatoFinal = null;
  }
  if (candidatoFinal && !(st.serie && st.serie.ronda === 'final' && !st.serie.postSerie)) candidatoFinal = null;
  if (candidatoFirma?.eleccion && orgDe(st) && orgDe(st) !== candidatoFirma.orgAntes) {
    if (!muestras.has('firma')) muestras.set('firma', { ...candidatoFirma, prioridad: 1 });
  }
  candidatoFirma = null;
}
function responder(sistema, st, decision, rng) {
  const r = ESTRATEGIAS.criterio(sistema, st, decision, rng);
  const i = (decision.opciones ?? []).findIndex((o) => o.id === r?.opcionId);
  for (const c of [candidatoFinal, candidatoFirma]) if (c && c.decision === decision && i >= 0) c.eleccion = i + 1;
  return r;
}

function alParar(ctx) {
  const { sistema, state, decision } = ctx;
  confirmar(state);
  if (decision.presentacion === 'mercado' && state.phase === 'profesional' && !muestras.has('firma') && orgDe(state)) {
    candidatoFirma = candidato(ctx, { orgAntes: orgDe(state) });
  }
  // la final: la última parada con opciones antes del título (el plan o el mapa decisivo), la más cerca de la copa
  if (sistema.id === 'serie' && state.serie?.ronda === 'final' && !state.serie.postSerie && esBo5DeLiga(state) && decision.opciones?.length && !muestras.has('final')) {
    candidatoFinal = candidato(ctx, { titulosAntes: titulosDe(state) });
  }
  if (decision.presentacion) return;
  const motivo = motivoDe(decision);
  const nOpc = decision.opciones?.length ?? 0;
  const forma = formaDeDecision(decision);
  if (sistema.id === 'eventos') {
    const costura = varianteDeCostura(leerEvento(decision, state));
    // un evento común: en la lista, sin destino, de 3 opciones si hay (las cartas se ven mejor de a tres)
    if (!costura && forma === 'lista' && nOpc >= 2) ofrecer('evento', nOpc >= 3 ? 2 : 1, ctx);
    if (costura) ofrecer('destino', 1, ctx);
  }
  if (sistema.id === 'amateur' && motivo === 'plan_amateur' && nOpc === 4) ofrecer('plan', 1, ctx);
  if (sistema.id === 'edadCierre' && decision.opciones?.some((o) => o.plan)) ofrecer('cierre', state.phase === 'profesional' ? 2 : 1, ctx);
  if (sistema.id === 'serie' && motivo === 'plan' && esBo5DeLiga(state) && !decision.datos?.replan) ofrecer('serie', (PRIORIDAD_RONDA[state.serie.ronda] ?? 0) + 1, ctx);
  if (sistema.id === 'internacional' && motivo === 'swiss') ofrecer('swiss', 1, ctx);
}

const QUIERO = ['evento', 'destino', 'plan', 'cierre', 'serie', 'swiss', 'final', 'firma'];
for (let seed = 1; seed <= SEEDS && !QUIERO.every((n) => muestras.has(n) && (n !== 'serie' || muestras.get(n).prioridad >= 3)); seed += 1) {
  jugarCarrera(seed, { alParar, responder, alCerrarSplit: ({ despues }) => confirmar(despues) });
}
fs.mkdirSync(SALIDA, { recursive: true });
for (const nombre of QUIERO) {
  const m = muestras.get(nombre);
  if (!m) {
    console.log(`FALTA ${nombre}`);
    continue;
  }
  const problemas = validarGuardado(m.guardado);
  if (problemas.length) throw new Error(`${nombre}: ${problemas.join('; ')}`);
  const salida = { muestra: nombre, seed: m.seed, titulo: m.titulo, ...(m.eleccion ? { eleccion: m.eleccion } : {}), ...m.guardado };
  fs.writeFileSync(path.join(SALIDA, `${nombre}.json`), JSON.stringify(salida));
  console.log(`${nombre}: seed ${m.seed} · "${m.titulo}"${m.eleccion ? ` · elegí la ${m.eleccion}` : ''} · ${Math.round(JSON.stringify(salida).length / 1024)} KB`);
}
