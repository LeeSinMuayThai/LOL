import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const raiz = path.resolve(__dirname);
const host = '127.0.0.1';
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

export function createServer() {
  return http.createServer((req, res) => {
    // Fase T8: cortar el querystring antes de resolver la ruta.
    const rawPath = (req.url || '/').split('?')[0];

    // D68: decodificar con decodeURIComponent, validar caracteres nulos,
    // exigir que quede dentro de la raíz y bloquear directorios sensibles (.git, node_modules).
    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Ruta inválida');
      return;
    }

    if (decodedPath.includes('\0')) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Ruta inválida');
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
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Acceso denegado');
      return;
    }

    const relPartes = path.relative(raiz, filePath).split(path.sep);
    if (relPartes.includes('.git') || relPartes.includes('node_modules')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Acceso denegado');
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Archivo no encontrado');
        return;
      }

      const ext = path.extname(filePath);
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  start(preferredPort);
}
