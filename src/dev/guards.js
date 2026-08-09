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

// Fase 8 (regla invariable 2, "el motor no debe tocar el DOM"): `src/ui/` es
// la única carpeta que puede referenciar `document`. El corte es por punto o
// corchete después de la palabra para no confundir con la prosa en español
// ("documento", "documentación") que aparece seguido en los comentarios.
const PATRON_DOCUMENT = /\bdocument\s*[.[]/;

export function verificarDocumentSoloEnUi(srcDir) {
  const archivoActual = fileURLToPath(import.meta.url);
  const uiDir = path.join(srcDir, 'ui') + path.sep;
  const archivos = listarArchivos(srcDir).filter((archivo) => archivo !== archivoActual && !archivo.startsWith(uiDir));
  return archivos.filter((archivo) => PATRON_DOCUMENT.test(fs.readFileSync(archivo, 'utf8')));
}
