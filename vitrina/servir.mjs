// Servidor estatico de la vitrina. Sin dependencias. Raiz = esta carpeta (vitrina/).
// Uso: node vitrina/servir.mjs [--puerto 8095]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const i = args.indexOf('--puerto');
const PUERTO = i >= 0 ? Number(args[i + 1]) : 8095;
if (!Number.isInteger(PUERTO) || PUERTO < 1 || PUERTO > 65535) {
  console.error(`--puerto ${args[i + 1]}: tiene que ser un numero entre 1 y 65535`);
  process.exit(2);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function responder(res, codigo, cuerpo, tipo = 'text/plain; charset=utf-8') {
  res.writeHead(codigo, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  res.end(cuerpo);
}

const servidor = http.createServer((req, res) => {
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    return responder(res, 400, 'Ruta invalida');
  }
  if (ruta.split(/[\\/]/).includes('..') || ruta.includes('\0')) return responder(res, 403, 'Prohibido');
  let archivo = path.join(RAIZ, ruta);
  if (archivo !== RAIZ && !archivo.startsWith(RAIZ + path.sep)) return responder(res, 403, 'Prohibido');
  fs.stat(archivo, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!ruta.endsWith('/')) {
        res.writeHead(301, { Location: ruta + '/' });
        return res.end();
      }
      archivo = path.join(archivo, 'index.html');
    }
    fs.readFile(archivo, (e2, datos) => {
      if (e2) return responder(res, 404, 'No encontrado: ' + ruta);
      responder(res, 200, datos, MIME[path.extname(archivo).toLowerCase()] ?? 'application/octet-stream');
    });
  });
});

servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log(`Vitrina en http://127.0.0.1:${PUERTO}/  (Ctrl+C para cortar)`);
});
