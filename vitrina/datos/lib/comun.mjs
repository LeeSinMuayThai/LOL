// Utilidades compartidas del generador de datos de la vitrina. Nada de esto toca el motor: es plomería para que la salida
// sea estable (mismo orden de claves, mismo hash) y para clonar estados sin tocar la corrida principal.
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
export const SALIDA = fileURLToPath(new URL('../', import.meta.url));

// El desafío del día de las muestras tiene la fecha FIJA (la salida no puede depender del reloj).
export const FECHA_FIJA = '2026-10-09';
// 2026-10-09T00:00:00Z, para el `guardadoEn` de los guardados (`serializar` usa Date.now(): se pisa con esto).
export const GUARDADO_EN_FIJO = Date.UTC(2026, 9, 9);

export function clonar(valor) {
  return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
}

// Copia con las claves de cada objeto en orden alfabético (los arrays conservan su orden). Descarta `undefined` como JSON.
export function ordenar(valor) {
  if (Array.isArray(valor)) {
    return valor.map(ordenar);
  }
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.keys(valor).sort().filter((k) => valor[k] !== undefined).map((k) => [k, ordenar(valor[k])])
    );
  }
  return valor;
}

export function jsonEstable(valor, sangria = 0) {
  return JSON.stringify(ordenar(valor), null, sangria);
}

export function sha256(texto) {
  return createHash('sha256').update(texto).digest('hex');
}

export function tamanio(texto) {
  return Buffer.byteLength(texto, 'utf8');
}
