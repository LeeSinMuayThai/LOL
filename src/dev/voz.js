// H4a: la voz corta (PLANUI §0.10, H4). Mide cuánto texto le tira el juego al jugador y lo compara con los límites de
// `src/data/events/VOZ.md`. Es herramienta de desarrollo: lee JSON del disco, no toca el motor ni el estado.
//
//   node src/dev/voz.js          la tabla por archivo, los 15 peores y las palabras visibles por pantalla
//
// El check `voz-corta` de `validate.js` usa `revisarEvento`, `revisarCarta` y `cargarEventos` de acá.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DIR_EVENTOS = path.join(__dirname, '..', 'data', 'events');
export const DIR_CARTAS = path.join(DIR_EVENTOS, 'cartas');

// Los límites de VOZ.md. Si cambian, cambian en los dos lugares.
export const LIMITES_VOZ = {
  descripcionPalabras: 30,
  descripcionOraciones: 2,
  opcionPalabras: 6,
  pistaPalabras: 10,
  avisoPalabras: 10,
  tituloCartaPalabras: 4,
  lineaCartaPalabras: 10,
  resultadoPalabras: 25
};

// Cuántas cartas tiene una mano, para estimar las palabras de la pantalla de cartas.
const CARTAS_POR_MANO = 3;

// Una palabra es un trozo entre espacios que tiene al menos una letra o un dígito: los guiones largos sueltos no cuentan,
// y `{org}` cuenta una.
export function palabras(texto) {
  if (typeof texto !== 'string') return 0;
  return texto.split(/\s+/).filter((trozo) => /[\p{L}\p{N}]/u.test(trozo)).length;
}

export function oraciones(texto) {
  if (typeof texto !== 'string') return [];
  return texto.trim().split(/(?<=[.!?…])\s+/).filter((trozo) => /[\p{L}\p{N}]/u.test(trozo));
}

// La pista de una opción es la primera oración de su `descripcion` (en el dato; el plan la llama `hint`).
export function pistaDe(opcion) {
  return oraciones(opcion?.descripcion)[0] ?? '';
}

// Recorre `src/data/events/` (sin `cartas/`) y devuelve [{ archivo, eventos }].
export function cargarEventos(dir = DIR_EVENTOS) {
  const salida = [];
  const recorrer = (actual) => {
    for (const entrada of fs.readdirSync(actual, { withFileTypes: true })) {
      const ruta = path.join(actual, entrada.name);
      if (entrada.isDirectory()) {
        if (path.resolve(ruta) !== path.resolve(DIR_CARTAS)) recorrer(ruta);
      } else if (entrada.name.endsWith('.json')) {
        const datos = JSON.parse(fs.readFileSync(ruta, 'utf8'));
        if (Array.isArray(datos)) salida.push({ archivo: path.relative(dir, ruta).replaceAll('\\', '/'), eventos: datos });
      }
    }
  };
  recorrer(dir);
  return salida.sort((a, b) => a.archivo.localeCompare(b.archivo));
}

// Las cartas de `cartas/*.json` (las crea H2a). Cada archivo puede ser una lista o un objeto con listas; se toma todo
// objeto con un `titulo` de texto. Si la carpeta no existe devuelve `null` (el check imprime n/a).
export function cargarCartas(dir = DIR_CARTAS) {
  if (!fs.existsSync(dir)) return null;
  const cartas = [];
  const buscar = (nodo, archivo) => {
    if (Array.isArray(nodo)) nodo.forEach((hijo) => buscar(hijo, archivo));
    else if (nodo && typeof nodo === 'object') {
      if (typeof nodo.titulo === 'string') cartas.push({ archivo, carta: nodo });
      else Object.values(nodo).forEach((hijo) => buscar(hijo, archivo));
    }
  };
  for (const nombre of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    buscar(JSON.parse(fs.readFileSync(path.join(dir, nombre), 'utf8')), `cartas/${nombre}`);
  }
  return cartas;
}

// Todas las faltas de un evento contra los límites, como [{ campo, dato, limite, exceso }] (exceso en palabras u oraciones).
export function faltasDeEvento(evento) {
  const faltas = [];
  const L = LIMITES_VOZ;
  const anotar = (campo, dato, limite, texto) => {
    if (dato > limite) faltas.push({ campo, dato, limite, exceso: dato - limite, texto });
  };
  anotar('descripcion (palabras)', palabras(evento.description), L.descripcionPalabras, evento.description);
  anotar('descripcion (oraciones)', oraciones(evento.description).length, L.descripcionOraciones, evento.description);
  for (const opcion of evento.options ?? []) {
    anotar(`opcion ${opcion.id} (label)`, palabras(opcion.label), L.opcionPalabras, opcion.label);
    anotar(`opcion ${opcion.id} (pista)`, palabras(pistaDe(opcion)), L.pistaPalabras, pistaDe(opcion));
    if (typeof opcion.aviso === 'string') {
      anotar(`opcion ${opcion.id} (aviso)`, palabras(opcion.aviso), L.avisoPalabras, opcion.aviso);
      if (opcion.aviso.includes('%')) faltas.push({ campo: `opcion ${opcion.id} (aviso con %)`, dato: 1, limite: 0, exceso: 1, texto: opcion.aviso });
      if ((opcion.outcomes ?? []).length < 2) faltas.push({ campo: `opcion ${opcion.id} (aviso sin riesgo)`, dato: 1, limite: 0, exceso: 1, texto: opcion.aviso });
    }
    (opcion.outcomes ?? []).forEach((salida, i) => {
      anotar(`opcion ${opcion.id} resultado ${i + 1}`, palabras(salida.texto), L.resultadoPalabras, salida.texto);
    });
  }
  return faltas;
}

// Lo que revisa el check sobre un evento: solo los que dicen `"voz": "corta"`. Devuelve los mensajes de falta.
export function revisarEvento(evento) {
  if (evento.voz === undefined) return [];
  if (evento.voz !== 'corta') return [`${evento.id}: "voz" vale ${JSON.stringify(evento.voz)} y solo existe "corta"`];
  return faltasDeEvento(evento).map((f) => `${evento.id}: ${f.campo} tiene ${f.dato} y el máximo es ${f.limite}`);
}

export function revisarCarta(carta, archivo = 'cartas') {
  const faltas = [];
  const id = carta.id ?? carta.titulo;
  if (palabras(carta.titulo) > LIMITES_VOZ.tituloCartaPalabras) {
    faltas.push(`${archivo} ${id}: titulo tiene ${palabras(carta.titulo)} palabras y el máximo es ${LIMITES_VOZ.tituloCartaPalabras}`);
  }
  if (carta.linea !== undefined && palabras(carta.linea) > LIMITES_VOZ.lineaCartaPalabras) {
    faltas.push(`${archivo} ${id}: linea tiene ${palabras(carta.linea)} palabras y el máximo es ${LIMITES_VOZ.lineaCartaPalabras}`);
  }
  return faltas;
}

// Palabras visibles hoy: la pantalla de cartas muestra el título, la descripción y, por opción, label + descripcion + aviso;
// la parada de evento, lo mismo pero con la pista (primera oración) en vez de la descripcion entera.
export function palabrasDePantalla(evento) {
  const opciones = evento.options ?? [];
  const base = palabras(evento.title) + palabras(evento.description);
  const pantallaDeCartas = base + opciones.reduce((s, o) => s + palabras(o.label) + palabras(o.descripcion) + palabras(o.aviso), 0);
  const paradaDeEvento = base + opciones.reduce((s, o) => s + palabras(o.label) + palabras(pistaDe(o)) + palabras(o.aviso), 0);
  return { pantallaDeCartas, paradaDeEvento };
}

function stats(valores) {
  if (valores.length === 0) return { prom: 0, max: 0 };
  return { prom: valores.reduce((s, v) => s + v, 0) / valores.length, max: Math.max(...valores) };
}

function percentil(valores, p) {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor(p * orden.length))];
}

function imprimirTabla() {
  const L = LIMITES_VOZ;
  const archivos = cargarEventos();
  const todos = [];
  const pad = (v, n) => String(v).padEnd(n);
  const num = (v, n) => String(v).padStart(n);
  console.log('Voz corta: eventos de src/data/events/ contra los límites de VOZ.md\n');
  console.log(`${pad('archivo', 26)}${num('n', 4)}${num('%ok', 6)}  ${pad('descr prom/max', 15)}${pad('opcion', 11)}${pad('pista', 11)}${pad('aviso', 11)}resultado`);
  for (const { archivo, eventos } of archivos) {
    const campos = { descr: [], opcion: [], pista: [], aviso: [], texto: [] };
    let dentro = 0;
    for (const evento of eventos) {
      campos.descr.push(palabras(evento.description));
      for (const o of evento.options ?? []) {
        campos.opcion.push(palabras(o.label));
        campos.pista.push(palabras(pistaDe(o)));
        if (typeof o.aviso === 'string') campos.aviso.push(palabras(o.aviso));
        for (const s of o.outcomes ?? []) campos.texto.push(palabras(s.texto));
      }
      const faltas = faltasDeEvento(evento);
      if (faltas.length === 0) dentro += 1;
      todos.push({ archivo, evento, faltas, exceso: faltas.reduce((s, f) => s + f.exceso, 0) });
    }
    const fila = (c) => { const s = stats(c); return `${s.prom.toFixed(1)}/${s.max}`; };
    const pct = eventos.length === 0 ? 0 : Math.round((100 * dentro) / eventos.length);
    console.log(`${pad(archivo, 26)}${num(eventos.length, 4)}${num(pct, 5)}%  ${pad(fila(campos.descr), 15)}${pad(fila(campos.opcion), 11)}${pad(fila(campos.pista), 11)}${pad(fila(campos.aviso), 11)}${fila(campos.texto)}`);
  }
  const dentroTotal = todos.filter((t) => t.faltas.length === 0).length;
  console.log(`\nTOTAL ${todos.length} eventos, ${dentroTotal} dentro de los límites (${Math.round((100 * dentroTotal) / todos.length)}%). `
    + `Con "voz": "corta": ${todos.filter((t) => t.evento.voz === 'corta').length}.`);
  console.log(`Límites: descripción ${L.descripcionPalabras} palabras y ${L.descripcionOraciones} oraciones, opción ${L.opcionPalabras}, pista ${L.pistaPalabras}, `
    + `aviso ${L.avisoPalabras}, resultado ${L.resultadoPalabras}. (promedio/máximo de palabras por campo)`);

  const descrLarga = todos.filter((t) => palabras(t.evento.description) > L.descripcionPalabras).length;
  console.log(`Descripciones sobre ${L.descripcionPalabras} palabras: ${descrLarga} de ${todos.length}.`);

  console.log('\nLos 15 peores (exceso total en palabras/oraciones sobre los límites):');
  [...todos].sort((a, b) => b.exceso - a.exceso).slice(0, 15).forEach((t, i) => {
    const mayor = [...t.faltas].sort((a, b) => b.exceso - a.exceso)[0];
    console.log(`${num(i + 1, 3)}. ${pad(t.evento.id, 34)} +${num(t.exceso, 4)}  ${pad(t.archivo, 20)} peor: ${mayor?.campo} (${mayor?.dato}/${mayor?.limite})`);
  });

  const pantallas = todos.map((t) => palabrasDePantalla(t.evento));
  const cartasV = pantallas.map((p) => p.pantallaDeCartas);
  const paradaV = pantallas.map((p) => p.paradaDeEvento);
  console.log('\nPalabras visibles por pantalla (hoy, sobre los eventos del repo):');
  console.log(`  pantalla de cartas (título + descripción + opciones con su descripcion y aviso): mediana ${percentil(cartasV, 0.5)}, p90 ${percentil(cartasV, 0.9)}, máx ${Math.max(...cartasV)}  [meta del plan: <= 70]`);
  console.log(`  parada de evento (título + descripción + opciones con su pista y aviso):          mediana ${percentil(paradaV, 0.5)}, p90 ${percentil(paradaV, 0.9)}, máx ${Math.max(...paradaV)}  [meta del plan: <= 60]`);
  const techoParada = L.descripcionPalabras + 4 + 3 * (L.opcionPalabras + L.pistaPalabras);
  console.log(`  techo teórico de una parada con los límites y 3 opciones (título 4 + descripción + 3 x (opción + pista)): ${techoParada}`);

  const cartas = cargarCartas();
  if (cartas === null) {
    console.log(`  mano de cartas (${CARTAS_POR_MANO} x (título + línea)): n/a, todavía no existe src/data/events/cartas/ (techo con los límites: ${CARTAS_POR_MANO * (L.tituloCartaPalabras + L.lineaCartaPalabras)})`);
  } else {
    const porCarta = cartas.map(({ carta }) => palabras(carta.titulo) + palabras(carta.linea));
    const fuera = cartas.flatMap(({ carta, archivo }) => revisarCarta(carta, archivo));
    console.log(`  mano de cartas: ${cartas.length} cartas, promedio ${stats(porCarta).prom.toFixed(1)} palabras (título + línea), máx ${stats(porCarta).max}; `
      + `una mano de ${CARTAS_POR_MANO} ~ ${(CARTAS_POR_MANO * stats(porCarta).prom).toFixed(0)}; fuera de límite: ${fuera.length}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  imprimirTabla();
}
