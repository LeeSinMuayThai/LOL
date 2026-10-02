import { hashCadena } from './numeros.js';

// El desafío diario (FASE K, K1 — PLAN.md §K1 y "K1 — decisiones de spec").
//
// La seed sale de la fecha (`'YYYY-MM-DD'`, en UTC: la misma para todos), y la
// seed fija TODO: el mundo, el rol, la región y el pool (`eleccion: null`, el
// mismo camino que corre `simulate.js`). Así dos personas que juegan el desafío
// del mismo día arrancan exactamente igual y su puntaje se puede comparar.
//
// Puro: sin `rng`, sin reloj, sin DOM. La fecha de hoy la pone la UI (K1-B);
// este módulo solo la valida y la convierte en seed. `iniciarDesafio(fecha)`
// devuelve los tres argumentos que `createInitialState(seed, rng, eleccion,
// desafio)` necesita; el `rng` lo crea quien llama, con `mulberry32(seed)`.

const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const MESES_DEL_ANIO = 12;
const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const FEBRERO = 2;
// Gregoriano: bisiesto cada 4 años, salvo los seculares que no son múltiplo de 400.
const CADA_4 = 4;
const CADA_100 = 100;
const CADA_400 = 400;

function esBisiesto(anio) {
  return (anio % CADA_4 === 0 && anio % CADA_100 !== 0) || anio % CADA_400 === 0;
}

// `true` si `fecha` es un string 'YYYY-MM-DD' de un día que existe.
export function esFechaDeDesafio(fecha) {
  if (typeof fecha !== 'string') {
    return false;
  }
  const partes = PATRON_FECHA.exec(fecha);
  if (!partes) {
    return false;
  }
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (mes < 1 || mes > MESES_DEL_ANIO || dia < 1) {
    return false;
  }
  const diasDelMes = mes === FEBRERO && esBisiesto(anio) ? DIAS_POR_MES[mes - 1] + 1 : DIAS_POR_MES[mes - 1];
  return dia <= diasDelMes;
}

// La seed del día: `hashCadena` de la fecha, un entero positivo de 32 bits
// (`hashCadena` ya devuelve un no negativo; el 0 se corre a 1 para que la seed
// sea siempre positiva). Tira si la fecha no es válida: un desafío con una
// fecha mal escrita no puede arrancar "parecido" a otro.
export function seedDelDia(fecha) {
  if (!esFechaDeDesafio(fecha)) {
    throw new Error(`Fecha de desafío inválida: ${JSON.stringify(fecha)} (se espera 'YYYY-MM-DD', un día que exista)`);
  }
  return Math.max(1, hashCadena(fecha));
}

// Todo lo que hace falta para arrancar el desafío de `fecha`.
export function iniciarDesafio(fecha) {
  return { seed: seedDelDia(fecha), eleccion: null, desafio: { fecha } };
}
