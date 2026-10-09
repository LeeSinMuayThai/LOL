// Genera los DATOS REALES de la vitrina: `muestras.json`, `guardados/*.json`, `inventario-leer-menos.json` e `INVENTARIO.md`.
// Todo sale del motor del juego, jugado headless con el bot `criterio`. Determinista (sin reloj en la salida, sin azar propio, claves ordenadas; el cronómetro solo imprime en consola).
//
//   node vitrina/datos/generar.mjs            barre las seeds 1..2500, elige la héroe y genera todo
//   node vitrina/datos/generar.mjs --seed 61  salta el barrido y usa esa seed como héroe (la tabla de cobertura queda solo de ella)
//   node vitrina/datos/generar.mjs --hasta N  barre 1..N en vez de 1..2500
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { barrer, elegirHeroe } from './lib/barrido.mjs';
import { OBLIGATORIOS, DESEABLES, puntuar } from './lib/cobertura.mjs';
import { fotografiarHeroe, muestraFinal, validarGuardado } from './lib/heroe.mjs';
import { catalogos, jugadorDeLaSeed, desafioDelDia, historialDeEjemplo, tarjetaContinuar, seedsParaElHistorial } from './lib/inicio.mjs';
import { inventariar, resumirInventario, ejemplosDeSoloProsa, lineasConPorcientoEnProsa } from './lib/inventario.mjs';
import { jsonEstable, sha256, tamanio, RAIZ, SALIDA, FECHA_FIJA } from './lib/comun.mjs';
import { VERSION_DDRAGON, BASE_DDRAGON } from '../../src/data/ddragon.js';
import { VERSION_JUEGO } from '../../src/data/version.js';
import { BALANCE } from '../../src/data/balance.js';
import { mulberry32 } from '../../src/core/rng.js';
import { createInitialState } from '../../src/core/state.js';

const HASTA_POR_DEFECTO = 2500;
const HILOS = 8;
const HANDLE_PEOR_CASO = 'MWMWMWMWMWMWMWMW'; // 16 letras anchas (maxlength de #handleInput)

const argumento = (nombre) => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? Number(process.argv[i + 1]) : null;
};

function commitDelMotor() {
  try {
    // El último commit que tocó el motor o la página (no el de la vitrina), para que la salida no cambie al commitear datos.
    return execFileSync('git', ['log', '-1', '--format=%h', '--', 'src', 'index.html', 'server.js'], { cwd: RAIZ, encoding: 'utf8' }).trim() || 'desconocido';
  } catch {
    return 'desconocido';
  }
}

function escribir(rel, valor) {
  const ruta = path.join(SALIDA, rel);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  const texto = typeof valor === 'string' ? valor : `${jsonEstable(valor, 1)}\n`;
  fs.writeFileSync(ruta, texto);
  return tamanio(texto);
}

// El nombre de org más largo que exista en los datos: las orgs de leagues.json y las de tier 3 que arma el mundo.
function orgMasLarga(seed) {
  const ligas = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/data/leagues.json'), 'utf8'));
  const nombres = new Map();
  for (const l of ligas) for (const o of l.orgs ?? []) nombres.set(o, { liga: l.id, origen: 'src/data/leagues.json' });
  const { mundo } = jugadorDeLaSeedMundo(seed);
  for (const [region, lista] of Object.entries(mundo.tier3PorRegion ?? {})) {
    for (const o of lista) if (!nombres.has(o.nombre)) nombres.set(o.nombre, { liga: `tier3:${region}`, origen: 'mundo.tier3PorRegion' });
  }
  const mejor = [...nombres.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b))[0];
  return { nombre: mejor, largo: mejor.length, ...nombres.get(mejor), mayoresCinco: [...nombres.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b)).slice(0, 5) };
}

function jugadorDeLaSeedMundo(seed) {
  const s = createInitialState(seed, mulberry32(seed));
  return { mundo: s.mundo };
}

function textoDeInventario({ filas, total }, ejemplos, lineasProsa) {
  const L = [];
  L.push('# Inventario "leer menos" (generado por vitrina/datos/generar.mjs; seeds 1-40, bot `criterio`)');
  L.push('');
  L.push(`Paradas: ${total.paradas} · opciones: ${total.opciones} · con datos estructurados (previa, riesgo, rareza, plan o p): ${total.pctEstructurado}% de las opciones · con un "%" SOLO en prosa (sin campo numérico): ${total.opcionesSoloProsa} opciones (${total.pctSoloProsa}%) en ${total.paradasConAlgunaOpcionSoloProsa} paradas; ${total.paradasConPorcientoSinCampoP} paradas con "%" en el título/descripción de la decisión sin campo p en \`datos\`.`);
  L.push('');
  L.push('| tipo de parada | veces | opc. | previa | riesgo | rareza | plan | p num. | % solo prosa | motor |');
  L.push('|---|--:|--:|--:|--:|--:|--:|--:|--:|---|');
  for (const f of filas.slice(0, 22)) {
    L.push(`| ${f.tipo} | ${f.veces} | ${f.opcionesPorParada.join('/')} | ${f.pctConPrevia}% | ${f.pctConRiesgo}% | ${f.pctConRareza}% | ${f.pctConPlan}% | ${f.pctConP}% | ${f.pctSoloProsa}% | ${f.ubicacion ?? '-'} |`);
  }
  if (filas.length > 22) L.push(`| (${filas.length - 22} tipos más en el JSON) | | | | | | | | | |`);
  L.push('');
  L.push('Ejemplos de "%" solo en prosa (texto tal cual sale al jugador):');
  for (const e of ejemplos.slice(0, 4)) L.push(`- ${e.tipo} (${e.nivel}, seed ${e.seed}): "${e.texto.slice(0, 110).replace(/\n/g, ' ')}"`);
  L.push('Líneas del motor que escriben un "%" en un texto de parada:');
  for (const l of lineasProsa.slice(0, 4)) L.push(`- ${l.archivo}  ${l.linea.slice(0, 90)}`);
  return `${L.join('\n')}\n`;
}

async function main() {
  const t0 = performance.now();
  const desde = 1;
  const hasta = argumento('--hasta') ?? HASTA_POR_DEFECTO;
  const seedFija = argumento('--seed');

  // 1) El barrido y la seed héroe.
  let filas = [];
  let heroe;
  if (seedFija === null) {
    ({ filas } = await barrer(desde, hasta, HILOS));
    heroe = elegirHeroe(filas);
    console.log(`Barrido: ${filas.length} seeds (1..${hasta}) en ${((performance.now() - t0) / 1000).toFixed(1)} s, ${filas.filter((f) => f.error).length} con error.`);
  } else {
    ({ filas } = await barrer(seedFija, seedFija, 1));
    heroe = filas[0];
  }
  console.log(`Seed héroe: ${heroe.seed} (obligatorios ${heroe.obligatorios}/6, deseables ${heroe.deseables}/6, puntaje ${heroe.puntaje})`);

  // 2) La seed héroe re-jugada con las fotos.
  const r = fotografiarHeroe(heroe.seed);
  const heroeCob = puntuar(r.cob);
  const guardados = {};
  const motivosNulos = {};
  const muestras = {};

  const NOMBRES_PARADA = ['evento', 'planAmateur', 'cierreAnio', 'serie', 'serieReplan', 'swiss', 'mercado'];
  const MOTIVO_NULO = {
    evento: 'No hubo un evento de 2 opciones en la carrera de la seed héroe.',
    planAmateur: 'No hubo una parada de plan de amateur de 4 opciones.',
    cierreAnio: 'No hubo cierre de año con parada.',
    serie: 'No hubo un plan de Fearless de un Bo5 de playoffs.',
    serieReplan: 'En la carrera de la seed héroe el rival nunca quemó el campeón guardado (no hubo replan) en un Bo5 de playoffs.',
    swiss: 'La carrera de la seed héroe no llegó a un 2-2 del Swiss.',
    mercado: 'No hubo un mercado con 3 ofertas o más.'
  };
  for (const nombre of NOMBRES_PARADA) {
    const slot = r.muestras.get(nombre);
    if (!slot) {
      muestras[nombre] = null;
      motivosNulos[nombre] = MOTIVO_NULO[nombre];
      continue;
    }
    guardados[nombre] = slot.guardado;
    muestras[nombre] = { ...slot.parada, guardado: `guardados/${nombre}.json` };
  }

  // Momentos.
  const MOTIVO_MOMENTO = {
    firma: 'La carrera de la seed héroe no firmó contrato.',
    titulo: 'La carrera de la seed héroe no ganó una liga de tier 1.',
    mundial: 'La carrera de la seed héroe no jugó un Mundial.'
  };
  for (const nombre of ['firma', 'titulo', 'mundial']) {
    muestras[nombre] = r.momentos[nombre] ?? null;
    if (!r.momentos[nombre]) motivosNulos[nombre] = MOTIVO_MOMENTO[nombre];
  }

  // 3) Final y eras.
  const final = muestraFinal(r.final, r.rng, r.rngUi, r.ultimaPagina);
  guardados.final = final.guardado;
  muestras.final = { ...final, guardado: 'guardados/final.json' };
  muestras.eras = r.eras;

  // 4) El inicio.
  const sinHeroe = seedsParaElHistorial(filas.length > 1 ? filas : (await barrer(1, 200, HILOS)).filas, heroe.seed);
  const historial = historialDeEjemplo(sinHeroe);
  const continuarDe = muestras.serie ?? muestras.mercado ?? muestras.evento;
  muestras.inicio = {
    catalogos: catalogos(),
    jugador: jugadorDeLaSeed(heroe.seed),
    desafio: desafioDelDia(),
    continuar: continuarDe ? tarjetaContinuar(continuarDe) : null,
    historial: { titulo: historial.titulo, filas: historial.filas, carreras: historial.carreras }
  };
  guardados['inicio-historial'] = { clave: 'lolcs-historial', valor: historial.localStorage.valor };

  // 5) Inventario.
  const inv = inventariar();
  const resumen = resumirInventario(inv);
  const ejemplos = ejemplosDeSoloProsa(inv.paradas);
  const lineasProsa = lineasConPorcientoEnProsa();
  const invJson = { seeds: '1..40', bot: 'criterio', resumen, ejemplosDeSoloProsa: ejemplos, lineasDelMotorConPorciento: lineasProsa, textosMasLargos: inv.largos, paradas: inv.paradas };

  // 6) Peor caso.
  muestras.peorCaso = {
    handle: HANDLE_PEOR_CASO,
    handleLargo: HANDLE_PEOR_CASO.length,
    org: orgMasLarga(heroe.seed),
    muestraDeCuatroOpciones: 'planAmateur',
    nOpcionesMaximo: Math.max(...inv.paradas.map((p) => p.nOpciones)),
    textosMasLargos: inv.largos
  };

  // 7) Meta y cobertura.
  const cobertura = {};
  for (const [k, descripcion] of Object.entries({ ...OBLIGATORIOS, ...DESEABLES })) {
    cobertura[k] = {
      descripcion,
      tipo: k in OBLIGATORIOS ? 'obligatorio' : 'deseable',
      heroe: Boolean(r.cob[k]),
      seedsQueLoCumplen: filas.length > 1 ? filas.filter((f) => f.cob?.[k]).length : null
    };
  }
  muestras.meta = {
    generador: 'vitrina/datos/generar.mjs',
    seed: heroe.seed,
    bot: 'criterio',
    ddragon: { version: VERSION_DDRAGON, base: BASE_DDRAGON },
    versionDelJuego: VERSION_JUEGO,
    commitDelMotor: commitDelMotor(),
    fechaFija: FECHA_FIJA,
    barrido: { desde, hasta: filas.length > 1 ? hasta : heroe.seed, cantidad: filas.length, conError: filas.filter((f) => f.error).length },
    coberturaDelHeroe: { ...heroeCob },
    cobertura,
    muestrasNulas: motivosNulos,
    guardados: Object.keys(guardados).map((k) => `guardados/${k}.json`).sort(),
    maxSplitsDeSeguridad: BALANCE.partida.maxSplitsDeSeguridad,
    notas: [
      'Los guardados son strings de serializar() (lolcs-carrera-guardada) y el marcador lolcs-vista; guardadoEn va fijo (2026-10-09T00:00Z).',
      'Los resultados por opción: `inmediato` es lo que devuelve resolver() del sistema; `hastaLaProximaParada` es resolverDecision() completo en un clon (rng restaurado). Ninguno toca la corrida principal.',
      'El plan de Fearless se resuelve y se sigue jugando el clon con criterio hasta el cierre de la serie (resultados[i].serie.mapas).'
    ]
  };

  // 8) Validar los guardados.
  const problemas = [];
  for (const [nombre, g] of Object.entries(guardados)) {
    if (nombre === 'inicio-historial') continue;
    const p = validarGuardado(g);
    if (p.length > 0) problemas.push(`${nombre}: ${p.join('; ')}`);
  }
  if (problemas.length > 0) {
    console.error('Guardados inválidos:\n' + problemas.join('\n'));
    process.exitCode = 1;
  }

  // 9) Escribir.
  fs.rmSync(path.join(SALIDA, 'guardados'), { recursive: true, force: true });
  const tamanios = {};
  for (const [nombre, g] of Object.entries(guardados)) {
    tamanios[`guardados/${nombre}.json`] = escribir(`guardados/${nombre}.json`, nombre === 'inicio-historial' ? g : { muestra: nombre, ...g });
  }
  const textoMuestras = `${jsonEstable(muestras, 1)}\n`;
  fs.writeFileSync(path.join(SALIDA, 'muestras.json'), textoMuestras);
  tamanios['muestras.json'] = tamanio(textoMuestras);
  tamanios['inventario-leer-menos.json'] = escribir('inventario-leer-menos.json', `${jsonEstable(invJson)}
`);
  tamanios['INVENTARIO.md'] = escribir('INVENTARIO.md', textoDeInventario(resumen, ejemplos, lineasProsa));

  console.log(`muestras.json sha256 ${sha256(textoMuestras)}`);
  console.log(`tamaños (bytes): ${JSON.stringify(tamanios)}`);
  console.log(`muestras nulas: ${JSON.stringify(motivosNulos)}`);
  console.log(`Total ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(process.exitCode ?? 0);
}

main();
