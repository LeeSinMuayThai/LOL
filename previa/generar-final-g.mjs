// G1b (PLANUI §0.9, "Pantalla"): las muestras de la final con las manos, para trabajar la pantalla mientras el motor
// (G1a) todavía no manda `decision.datos.g1`. Inyectan el contrato de G1 a mano sobre partidas reales:
//   final-g        la final Bo5 de la LCS en el mapa 4, 2-1 arriba, con el poder del Showman disponible (sale de
//                  `final-perdida`: la serie se rebobina a 2-1) y la corrida (`la_corrida`);
//   final-g-swiss  una ronda del Swiss del Mundial con 2-1 (la primera seed que llega), jugada como minijuego en el
//                  stream, con el VOD del Profesional y la pizarra (`la_pizarra`).
// Cuando el motor mande `g1`, estas muestras se regeneran desde `previa/generar.mjs` y este archivo se borra.
//
//   node previa/generar-final-g.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jugarCarrera } from '../vitrina/datos/lib/partida.mjs';
import { guardadoDe, validarGuardado } from '../vitrina/datos/lib/heroe.mjs';
import { deserializar, VERSION } from '../src/core/guardado.js';

const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'muestras');
const SEEDS = 60;
const PODERES = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data/perfiles.json'), 'utf8')).perfiles;

function escribir(nombre, base, guardado, titulo) {
  const problemas = validarGuardado(guardado);
  if (problemas.length) throw new Error(`${nombre}: ${problemas.join('; ')}`);
  const salida = { muestra: nombre, seed: base.seed, titulo, ...guardado };
  fs.writeFileSync(path.join(SALIDA, `${nombre}.json`), JSON.stringify(salida));
  console.log(`${nombre}: seed ${base.seed} · "${titulo}" · ${Math.round(JSON.stringify(salida).length / 1024)} KB`);
}

// --- final-g: la final de `final-perdida`, rebobinada al mapa 4 con 2-1 ---
{
  const base = JSON.parse(fs.readFileSync(path.join(SALIDA, 'final-perdida.json'), 'utf8'));
  // la muestra vieja puede ser de una VERSION anterior: se pasa por la migración, así se guarda en la de hoy
  const carrera = { ...JSON.parse(base.carrera), version: VERSION, state: deserializar(base.carrera).state };
  const st = carrera.state;
  st.serie.mapas = st.serie.mapas.slice(0, 3);
  st.serie.marcador = [2, 1];
  st.serie.mapaActual = 4;
  st.serie.decisivoUsado = false;
  const d = st.pendiente.decision;
  const anio = st.calendario?.anio ?? st.career?.anio ?? '';
  d.titulo = 'La corrida de la final';
  d.descripcion = 'Punto de campeonato. La pelea se prende y tenés que entrar justo: ni antes, ni después. Frená en la zona.';
  d.datos.minijuego = 'la_corrida';
  d.datos.statRelevante = 'mecanica';
  d.datos.apuesta = 'Si clavás las frenadas, el mapa es tuyo y la copa también; si no, se va al quinto.';
  d.datos.g1 = {
    vara: 0.7,
    margenCasi: 0.15,
    escalon: 3,
    factorEscalada: 0.85 ** 3,
    camino: {
      torneo: `Playoffs de la LCS ${anio}`.trim(),
      etapas: [
        { id: 'cuartos', nombre: 'Cuartos', estado: 'ganada' },
        { id: 'semis', nombre: 'Semis', estado: 'ganada' },
        { id: 'final', nombre: 'Final', estado: 'actual' }
      ],
      mapas: [{ numero: 1, resultado: 'W' }, { numero: 2, resultado: 'W' }, { numero: 3, resultado: 'L' }, { numero: 4, resultado: null }, { numero: 5, resultado: null }],
      marcador: [2, 1],
      bo: 5,
      swiss: null
    },
    poder: { ...PODERES.showman.clase.poder, disponible: true, efecto: { bajaVara: 0.25 } },
    desempate: false,
    revancha: false,
    premio: null
  };
  carrera.state = st;
  escribir('final-g', base, { claves: base.claves, carrera: JSON.stringify(carrera), vista: base.vista }, d.titulo);
}

// --- final-g-swiss: la primera ronda del Swiss con 2-1 ---
{
  let hallado = null;
  for (let seed = 1; seed <= SEEDS && !hallado; seed += 1) {
    jugarCarrera(seed, {
      alParar: (ctx) => {
        if (hallado || ctx.sistema.id !== 'internacional' || ctx.decision.datos?.motivo !== 'swiss') return;
        const it = ctx.state.internacional;
        const r = it.swiss.record[it.jugador];
        if (r.v === 2 && r.d === 1) hallado = { seed, guardado: guardadoDe(ctx.state, ctx.rng, ctx.rngUi, ctx.pagina) };
      }
    });
  }
  if (!hallado) {
    console.log('FALTA final-g-swiss');
  } else {
    const carrera = JSON.parse(hallado.guardado.carrera);
    const st = carrera.state;
    const d = st.pendiente.decision;
    const it = st.internacional;
    d.datos.minijuego = 'la_pizarra';
    d.datos.statRelevante = 'macro';
    d.datos.apuesta = 'Si leés la pizarra del rival, el Bo1 es tuyo y quedás adentro.';
    d.datos.g1 = {
      vara: 0.6,
      margenCasi: 0.1,
      escalon: 3,
      factorEscalada: 0.85 ** 3,
      camino: {
        torneo: `Worlds ${it.anio ?? ''}`.trim(),
        etapas: [
          { id: 'swiss', nombre: 'Swiss', estado: 'actual' },
          { id: 'cuartos', nombre: 'Cuartos', estado: 'pendiente' },
          { id: 'semis', nombre: 'Semis', estado: 'pendiente' },
          { id: 'final', nombre: 'Final', estado: 'pendiente' }
        ],
        mapas: [{ numero: 1, resultado: null }],
        marcador: [0, 0],
        bo: 1,
        swiss: { victorias: 2, derrotas: 1 }
      },
      poder: { ...PODERES.profesional.clase.poder, disponible: true, efecto: { velocidad: 0.75 } },
      desempate: false,
      revancha: false,
      premio: null
    };
    carrera.state = st;
    escribir('final-g-swiss', { seed: hallado.seed }, { ...hallado.guardado, carrera: JSON.stringify(carrera) }, d.titulo);
  }
}
