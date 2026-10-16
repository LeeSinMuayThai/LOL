// H3u (PLANUI §0.10, "La salida"): tu mejor marca en cada mecánica. Vive en el navegador (`localStorage`), por mecánica, y el
// motor no la lee: es solo para que la salida diga "Tu mejor: 4 de 5". Si el almacenamiento falla (modo privado, bloqueado),
// no pasa nada: la marca simplemente no se guarda.
import { medidaDe } from './components/varaG1.js';

const CLAVE = 'lolero.mejorMarca.';
const PORCIENTO = 100;

function leer(id) {
  try {
    const crudo = window.localStorage.getItem(CLAVE + id);
    const dato = crudo ? JSON.parse(crudo) : null;
    return dato && typeof dato.r === 'number' && typeof dato.texto === 'string' ? dato : null;
  } catch {
    return null;
  }
}

function guardar(id, dato) {
  try {
    window.localStorage.setItem(CLAVE + id, JSON.stringify(dato));
  } catch {
    // sin almacenamiento: la marca no se guarda y listo
  }
}

// La marca en las unidades de la mecánica: "4 de 5", "212 ms", "1 error".
export function textoDeMarca(id, resultado, detalle, state, datos) {
  const m = medidaDe(id, state, datos);
  if (m.tipo === 'conteo') return `${Math.round(resultado * m.total)} de ${m.total}`;
  if (m.tipo === 'errores') {
    const hechos = detalle?.errores ?? Math.round((1 - resultado) * m.tope);
    return `${hechos} ${hechos === 1 ? 'error' : 'errores'}`;
  }
  if (m.tipo === 'latencia' && detalle?.tipo === 'latencia') return `${Math.round(detalle.ms)} ms`;
  return `${Math.round(resultado * PORCIENTO)}%`;
}

// Anota el resultado si supera la marca guardada. Devuelve `{ texto, nueva }`: la línea de la salida y si esta fue la mejor.
export function anotarMarca(id, resultado, detalle, state, datos) {
  const actual = textoDeMarca(id, resultado, detalle, state, datos);
  const previa = leer(id);
  if (!previa || resultado > previa.r) {
    guardar(id, { r: resultado, texto: actual });
    return { texto: `${previa ? 'Nueva mejor' : 'Tu mejor'}: ${actual}`, nueva: true };
  }
  return { texto: `Tu mejor: ${previa.texto}`, nueva: false };
}
