// K6c (revisión, PLAN.md §K.3b "desde Corea, más fácil; desde NA, más difícil", D-D del usuario): cuántas carreras de `criterio`
// ganan al menos un Mundial jugando desde una región elegida (`createInitialState(..., { regionOrigen })`, la elección de la
// pantalla de inicio). Lo usa el check "K6c región fija" de `validate.js`.
//
// Por qué existe: el lote de las metas C (`valoresDeLasMetasC`, 1500 carreras) sortea la región, y de ahí salen ~332 carreras de
// Corea y ~194 de NA. Con ~7% de Mundiales desde NA, el σ de esa submuestra es ~1,9 puntos, y cualquier corrimiento del stream
// vuelve a tirar las mismas 194 seeds: en K6c midió 11,3 (22 de 194) con la población en 7,45 (región fija, 3300 seeds). Con la
// región fija y las mismas seeds para las dos regiones, la relación se mide con la muestra que necesita.
//
// Las carreras se reparten en tandas de seeds consecutivas, cada una en su proceso (`--paralelo`): el resultado es la suma, el mismo
// con cualquier cantidad de tandas (cada carrera depende solo de su seed). Lectura pura de cada carrera: no toca el motor.
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { correrCarrera, RESULTADO_CAMPEON } from './simulate.js';
import { ESTRATEGIAS } from './estrategias.js';

const ESTE_ARCHIVO = fileURLToPath(import.meta.url);

// Las carreras de las seeds [desde, desde + carreras) desde `regionId`, con `criterio`: cuántas ganan al menos un Mundial.
export function mundialesDesdeRegion(regionId, desde, carreras, splits) {
  let conMundial = 0;
  for (let seed = desde; seed < desde + carreras; seed += 1) {
    const { state } = correrCarrera(seed, splits, ESTRATEGIAS.criterio, { regionOrigen: regionId });
    if (state.career.registro.internacionales.some((entrada) => entrada.resultado === RESULTADO_CAMPEON)) {
      conMundial += 1;
    }
  }
  return { carreras, conMundial };
}

function correrTanda(regionId, desde, carreras, splits) {
  return new Promise((resolve, reject) => {
    const hijo = spawn(process.execPath, [ESTE_ARCHIVO, regionId, String(desde), String(carreras), String(splits)], { stdio: ['ignore', 'pipe', 'inherit'] });
    let salida = '';
    hijo.stdout.on('data', (trozo) => { salida += trozo; });
    hijo.on('error', reject);
    hijo.on('close', (codigo) => (codigo === 0 ? resolve(JSON.parse(salida.trim().split('\n').pop())) : reject(new Error(`tanda ${regionId} ${desde}: código ${codigo}`))));
  });
}

// Las seeds 1..carreras desde `regionId`, repartidas en `tandas` procesos.
export async function mundialesDesdeRegionEnParalelo(regionId, carreras, splits, tandas) {
  const porTanda = Math.ceil(carreras / tandas);
  const trabajos = [];
  for (let desde = 1; desde <= carreras; desde += porTanda) {
    trabajos.push(correrTanda(regionId, desde, Math.min(porTanda, carreras - desde + 1), splits));
  }
  const partes = await Promise.all(trabajos);
  return partes.reduce((suma, parte) => ({ carreras: suma.carreras + parte.carreras, conMundial: suma.conMundial + parte.conMundial }), { carreras: 0, conMundial: 0 });
}

// node src/dev/regionFija.js <regionId> <desde> <carreras> <splits>            → una tanda
// node src/dev/regionFija.js --paralelo <regionId> <carreras> <splits> <tandas> → todas, en paralelo
// Imprime `{ carreras, conMundial }` en JSON (la última línea).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  if (args[0] === '--paralelo') {
    const [regionId, carreras, splits, tandas] = [args[1], Number(args[2]), Number(args[3]), Number(args[4])];
    console.log(JSON.stringify(await mundialesDesdeRegionEnParalelo(regionId, carreras, splits, tandas)));
  } else {
    const [regionId, desde, carreras, splits] = [args[0], Number(args[1]), Number(args[2]), Number(args[3])];
    console.log(JSON.stringify(mundialesDesdeRegion(regionId, desde, carreras, splits)));
  }
}
