// F3 (PLANUI §0.8): dos muestras de la previa, aparte de `generar.mjs` para no regenerar las demás.
//   eleccion         una parada cuyo tramo trae el resultado de una decisión TUYA ("Lo que elegiste", con sus chips)
//   final-escapada   la parada del cierre de un año con la final doméstica perdida: el diario titula "SE ESCAPÓ LA FINAL"
//   node previa/generar-consecuencia.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jugarCarrera } from '../vitrina/datos/lib/partida.mjs';
import { guardadoDe, validarGuardado } from '../vitrina/datos/lib/heroe.mjs';
import { eleccionDelJugador } from '../src/ui/core/momentos.js';
import { ESTRATEGIAS } from '../src/dev/estrategias.js';

const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'muestras');
const SEEDS = 80;
const muestras = new Map();
let pendiente = null; // la parada de la que se está eligiendo ahora
let cierreCandidato = null; // la parada del cierre del año: el diario sale DESPUÉS de contestarla
function responder(sistema, st, decision, rng) {
  const r = ESTRATEGIAS.criterio(sistema, st, decision, rng);
  const i = (decision.opciones ?? []).findIndex((o) => o.id === r?.opcionId);
  if (pendiente && pendiente.decision === decision && i >= 0) pendiente.eleccion = i + 1;
  if (cierreCandidato && cierreCandidato.decision === decision && i >= 0) cierreCandidato.eleccion = i + 1;
  return r;
}
function alParar({ sistema, state, decision, rng, rngUi, pagina }) {
  const tramo = (state.logs ?? []).slice(pagina.desde ?? 0);
  const elecciones = tramo.map(eleccionDelJugador).filter(Boolean);
  const mejorEleccion = elecciones.reduce((m, e) => Math.max(m, e.ejes.length), -1);
  const previa = muestras.get('eleccion');
  if (decision.opciones?.length && mejorEleccion >= 2 && (!previa || mejorEleccion > previa.puntos)) {
    pendiente = { decision, seed: state.seed, titulo: decision.titulo ?? '', puntos: mejorEleccion, eleccion: null, guardado: guardadoDe(state, rng, rngUi, pagina) };
    muestras.set('eleccion', pendiente);
  }
  // la final-escapada: el cierre del año anterior (guardado en su parada) trajo el diario con el titular nuevo
  if (cierreCandidato?.eleccion && !muestras.has('final-escapada')
    && state.logs.slice(cierreCandidato.logsAntes).some((l) => l?.type === 'edad' && l.tipoBase === 'final_perdida')) {
    muestras.set('final-escapada', cierreCandidato);
  }
  cierreCandidato = null;
  if (sistema.id === 'edadCierre' && decision.opciones?.length) {
    cierreCandidato = { decision, seed: state.seed, titulo: decision.titulo ?? '', eleccion: null, logsAntes: state.logs.length, guardado: guardadoDe(state, rng, rngUi, pagina) };
  }
}
for (let seed = 1; seed <= SEEDS && !(muestras.has('final-escapada') && (muestras.get('eleccion')?.puntos ?? 0) >= 3); seed += 1) {
  jugarCarrera(seed, { alParar, responder });
}
fs.mkdirSync(SALIDA, { recursive: true });
for (const nombre of ['eleccion', 'final-escapada']) {
  const m = muestras.get(nombre);
  if (!m) {
    console.log(`FALTA ${nombre}`);
    continue;
  }
  const problemas = validarGuardado(m.guardado);
  if (problemas.length) throw new Error(`${nombre}: ${problemas.join('; ')}`);
  const salida = { muestra: nombre, seed: m.seed, titulo: m.titulo, ...(m.eleccion ? { eleccion: m.eleccion } : {}), ...m.guardado };
  fs.writeFileSync(path.join(SALIDA, `${nombre}.json`), JSON.stringify(salida));
  console.log(`${nombre}: seed ${m.seed} · "${m.titulo}"${m.eleccion ? ` · elegí la ${m.eleccion}` : ''}`);
}

// `tarjeta-finales`: la tarjeta final de una carrera con finales perdidas de la liga ("Las que se escaparon"), guardada en
// su última parada con la elección del bot: contestándola, la carrera termina y se ve la tarjeta. Gana la seed con más
// finales (tope: las de la tarjeta) y, a igual cantidad, la primera.
{
  const { finalesPerdidas } = await import('../src/core/legado.js');
  let mejor = null;
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    let ultima = null;
    const { state } = jugarCarrera(seed, {
      alParar: (ctx) => {
        ultima = ctx.state.phase === 'profesional'
          ? { decision: ctx.decision, seed: ctx.state.seed, titulo: ctx.decision.titulo ?? '', eleccion: null, guardado: guardadoDe(ctx.state, ctx.rng, ctx.rngUi, ctx.pagina) }
          : null;
      },
      responder: (sistema, st, decision, rng) => {
        const r = ESTRATEGIAS.criterio(sistema, st, decision, rng);
        const i = (decision.opciones ?? []).findIndex((o) => o.id === r?.opcionId);
        if (ultima && ultima.decision === decision && i >= 0) ultima.eleccion = i + 1;
        return r;
      }
    });
    if (!state.terminado || !state.tarjeta || !ultima?.eleccion) continue;
    const n = finalesPerdidas(state.career.registro).length;
    if (n > 0 && (!mejor || n > mejor.n)) mejor = { ...ultima, n };
  }
  if (!mejor) {
    console.log('FALTA tarjeta-finales');
  } else {
    const problemas = validarGuardado(mejor.guardado);
    if (problemas.length) throw new Error(`tarjeta-finales: ${problemas.join('; ')}`);
    fs.writeFileSync(path.join(SALIDA, 'tarjeta-finales.json'), JSON.stringify({ muestra: 'tarjeta-finales', seed: mejor.seed, titulo: mejor.titulo, eleccion: mejor.eleccion, ...mejor.guardado }));
    console.log(`tarjeta-finales: seed ${mejor.seed} · ${mejor.n} finales perdidas · elegí la ${mejor.eleccion}`);
  }
}
