import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// D68: solo la propia máquina. En 0.0.0.0 cualquiera en la red local podía
// pedirle archivos al servidor mientras estuviera corriendo. Se exporta para
// que `validate.js` pueda verificar el valor real y no uno copiado.
export const host = '127.0.0.1';
const preferredPort = Number(process.env.PORT || 8000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  // Fase T / T0: las fuentes se auto-hospedan (linkear a Google Fonts sería
  // la primera dependencia de red del proyecto). Sin el MIME correcto el
  // navegador las descarta en silencio y el juego cae al fallback.
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

// H1 (D68): lo único que el juego sirve, igual que `A_COPIAR` de `build.js`
// (index.html, src/, assets/). Es una LISTA BLANCA a propósito: bloquear `.git`
// y `node_modules` por nombre no alcanza en Windows, donde NTFS no distingue
// mayúsculas (`/.GIT/config`), tiene nombres cortos 8.3 (`/GIT~1/config`) y
// flujos alternativos (`/.git::$INDEX_ALLOCATION/config`) — todos llegaban al
// mismo directorio. Lo que no está en la lista (package.json, server.js, los
// .md, .git, node_modules, dist/...) no sale nunca, exista o no (responde 404).
const ARCHIVOS_PUBLICOS = ['index.html'];
const CARPETAS_PUBLICAS = ['src', 'assets'];
// Defensa en profundidad: aunque algún día `src/` tuviera uno adentro.
const CARPETAS_PROHIBIDAS = ['.git', 'node_modules'];
// NTFS ignora los puntos y espacios del final de cada tramo (`.git.` == `.git`).
const FINAL_IGNORADO_POR_NTFS = /[. ]+$/;
// `:` abre un flujo alternativo (`::$INDEX_ALLOCATION`, `::$DATA`) o una letra
// de unidad; `~` es la marca de un nombre corto 8.3. El juego no usa ninguno.
const CARACTERES_PROHIBIDOS_EN_TRAMO = /[:~]/;

function esRutaPublica(partes) {
  const tramos = partes.map((parte) => parte.toLowerCase());
  if (partes.some((parte) => CARACTERES_PROHIBIDOS_EN_TRAMO.test(parte))) {
    return false;
  }
  if (tramos.some((tramo) => CARPETAS_PROHIBIDAS.includes(tramo.replace(FINAL_IGNORADO_POR_NTFS, '')))) {
    return false;
  }
  if (tramos.length === 1) {
    return ARCHIVOS_PUBLICOS.includes(tramos[0]);
  }
  return CARPETAS_PUBLICAS.includes(tramos[0]);
}

function responder(res, estado, texto) {
  res.writeHead(estado, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(texto);
}

// `raiz` es parametrizable para poder testear el servidor contra una carpeta
// temporal con un secreto afuera y un `.git` adentro (el check `K0-B server`
// de validate.js); por defecto es la carpeta del proyecto.
export function createServer({ raiz: raizPedida = __dirname } = {}) {
  const raiz = path.resolve(raizPedida);

  return http.createServer((req, res) => {
    // Fase T8: cortar el querystring antes de resolver la ruta.
    const rawPath = (req.url || '/').split('?')[0];

    // D68: decodificar, rechazar nulos, resolver, exigir que quede dentro de
    // la raíz y que sea una ruta pública.
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      responder(res, 400, 'Ruta inválida');
      return;
    }

    if (decodedPath.includes('\0')) {
      responder(res, 400, 'Ruta inválida');
      return;
    }

    if (decodedPath === '/') {
      decodedPath = '/index.html';
    }

    if (!decodedPath.startsWith('/') && !decodedPath.startsWith('\\')) {
      decodedPath = '/' + decodedPath;
    }

    const filePath = path.resolve(raiz, '.' + decodedPath);
    const dentroDeRaiz = filePath === raiz || filePath.startsWith(raiz + path.sep);
    if (!dentroDeRaiz) {
      responder(res, 403, 'Acceso denegado');
      return;
    }

    // Dentro de la raíz pero fuera de la lista blanca: 404, como si no
    // existiera (no se confirma qué hay en `.git` o `node_modules`). Es otro
    // código que el 403 de arriba a propósito: así el check puede probar cada
    // capa por separado en vez de que una tape a la otra.
    const partes = path.relative(raiz, filePath).split(path.sep);
    if (!esRutaPublica(partes)) {
      responder(res, 404, 'Archivo no encontrado');
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        responder(res, 404, 'Archivo no encontrado');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

function start(port) {
  const server = createServer();

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < preferredPort + 5) {
      console.warn(`Puerto ${port} ocupado. Probando con ${port + 1}...`);
      start(port + 1);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
  });
}

// ¿Me ejecutaron a mí (`node server.js`, `node server`, `npm start`) o me
// importaron (`validate.js` para testearme)? `node server` pasa
// `process.argv[1]` SIN la extensión, así que comparar la URL a pelo no
// alcanza: se resuelve cada candidato a su ruta real (también normaliza
// mayúsculas y enlaces simbólicos) y se prueba con `.js` agregado.
function esPuntoDeEntrada() {
  const arg = process.argv[1];
  if (!arg) {
    return false;
  }
  const propia = fs.realpathSync.native(__filename);
  for (const candidato of [arg, `${arg}.js`]) {
    try {
      if (fs.realpathSync.native(candidato) === propia) {
        return true;
      }
    } catch {
      // ese candidato no existe: se prueba el siguiente.
    }
  }
  return false;
}

if (esPuntoDeEntrada()) {
  start(preferredPort);
}
