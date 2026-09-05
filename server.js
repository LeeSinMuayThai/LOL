import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const host = '0.0.0.0';
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

function createServer() {
  return http.createServer((req, res) => {
    // Fase T8: `?seed=N` (P.3, el link de T7) es la primera vez que alguien
    // visita la página con un querystring de verdad. El `req.url === '/'`
    // de antes se comparaba CONTRA el querystring todavía pegado — `/`
    // nunca es igual a `/?seed=424242`, así que la raíz con seed caía
    // derecho al 404. Cortar el `?` primero, y recién ahí decidir si es
    // la raíz.
    let requestPath = req.url.split('?')[0];
    if (requestPath === '/') {
      requestPath = '/index.html';
    }
    const filePath = path.join(__dirname, requestPath);

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

start(preferredPort);
