import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const EXTENSIONES_A_REVISAR = new Set(['.js']);

function listarArchivos(dir) {
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  return entradas.flatMap((entrada) => {
    const fullPath = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      return listarArchivos(fullPath);
    }
    return EXTENSIONES_A_REVISAR.has(path.extname(entrada.name)) ? [fullPath] : [];
  });
}

const PATRON_PROHIBIDO = 'Math' + '.random(';

export function verificarSinMathRandom(srcDir) {
  const archivoActual = fileURLToPath(import.meta.url);
  const archivos = listarArchivos(srcDir).filter((archivo) => archivo !== archivoActual);
  return archivos.filter((archivo) => fs.readFileSync(archivo, 'utf8').includes(PATRON_PROHIBIDO));
}
