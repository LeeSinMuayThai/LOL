// LA POLITICA DEL MUNDO (PLANUI §4.6, §4.9; portado de vitrina/fusion/js/fondo.js): cuanto campeon hay en el fondo. El
// ambiente la lee (convierte cada estado en los uniformes del shader, o en el respaldo CSS) y el aura le avisa cuando
// apuntas a un campeon. Las pantallas no saben que variante corre: solo declaran hechos ("esto es un momento", "esto es
// un takeover") y el ambiente los traduce con la politica.
//
// En produccion hay lo que usa la vitrina con `op=linea`: el mundo `pleno` (el de siempre: el campeon en la luz, a
// pantalla completa) y la escena `costura` (los dos mundos enfrentados: el campeon de siempre le deja el lugar a las
// dos mitades). La perilla `fondo=` (menos, tenue, paso, lugar) y las escenas de las otras opciones (arena, estadio)
// eran la comparacion de la vitrina y no se portan.
// Puro: corre en Node.
import { CONTEXTO_DEF, colorDe, conColor } from './color.js';

// Un ESTADO del mundo. Todo es 0-1 salvo `contraste` (1 = el de siempre):
//   presencia    cuanto campeon hay en el fondo de pantalla completa (1 = la fusion)
//   profundidad  el 2,5D: el parallax por capas, la contraluz que lo recorta, el flujo de las luces altas
//   bruma        bruma de la era por encima del campeon (lo funde en la luz)
//   vineta       vineta extra
//   contraste    contraste del duotono del campeon
//   suave        desenfoque del campeon
//   enLugar      presencia adentro del lugar fijo (sin uso en produccion: no hay lugar fijo)
//   ventana      cuanto pesa el lugar fijo (sin uso en produccion)
//   contra       la luz de contra de la era (1 = la de siempre)
//   luz, polvo   cuanto mas haz y mas polvo de la era (1 = los de siempre): sin el campeon, la luz sola tiene que
//                seguir dando profundidad, y no quedar un fondo plano
//   costura      (PLANUI §4.9) cuanto se ve la costura que pidio la pantalla (1 = toda; el takeover de la escena
//                `costura` la baja a 0 para que AFUERA tenga su campeon solo). Sin costura pedida no cambia nada.
// Ademas, el color (color.js lo suma a cada estado): colorFondo, lavado y colorLugar (0 = duotono, 1 = color real).
export const CAMPOS = ['presencia', 'profundidad', 'bruma', 'vineta', 'contraste', 'suave', 'enLugar', 'ventana', 'contra', 'luz', 'polvo', 'costura', 'colorFondo', 'lavado', 'colorLugar'];
const PLENO = { presencia: 1, profundidad: 1, bruma: 0, vineta: 0, contraste: 1, suave: 0, enLugar: 1, ventana: 0, contra: 1, luz: 1, polvo: 1, costura: 1, colorFondo: 0, lavado: 0, colorLugar: 0 };

// Tiempos (ms): cuanto tarda en subir un momento, cuanto en volver a la luz despues de uno (~2 s), el cruce al cambiar
// de pantalla y el cruce al cambiar de variante en vivo.
export const TIEMPOS = { sube: 520, vuelta: 2000, pantalla: 1300, variante: 700 };

// PLANUI §4.9: LA COSTURA. Los campeones viven en las dos mitades de la costura (ambiente({ costura })), asi que el
// campeon de siempre no se ve en reposo, con el aura ni en un momento (no hay campeon doble); en el takeover (AFUERA
// tiene su campeon) vuelve al 100 % y la costura se va. Mas luz y mas polvo: la sala es la luz.
const COSTURA = { ...PLENO, presencia: 0, ventana: 0, enLugar: 0, contra: 0.8, luz: 1, polvo: 1.4 };
const COSTURA_TAKEOVER = { ...PLENO, costura: 0 };
const ESCENAS = {
  costura: { reposo: COSTURA, aura: COSTURA, momento: COSTURA, takeover: COSTURA_TAKEOVER },
};
export const ESCENAS_FONDO = Object.keys(ESCENAS);

// La politica de una pantalla: los estados que el ambiente usa (con el color de color.js).
//   contexto  el del color ('inicio' | 'juego' | 'momento': color.js)
//   escena    (opcional) 'costura': la composicion de los dos mundos enfrentados (la bisagra, el cara a cara, el Swiss)
export function politica({ contexto = CONTEXTO_DEF, escena = null } = {}) {
  const c = colorDe(contexto);
  const e = ESCENAS[escena] ?? null;
  const estado = (k) => conColor(e ? e[k] : PLENO, c, { takeover: k === 'takeover' });
  return { nombre: e ? escena : 'pleno', color: c, reposo: estado('reposo'), aura: estado('aura'), momento: estado('momento'), takeover: estado('takeover'), campeonDelMomento: false, lugar: null };
}

// Mezcla dos estados (k en 0-1). Con a === b devuelve exactamente a.
export function mezclarEstados(a, b, k) {
  const r = {};
  for (const c of CAMPOS) r[c] = k >= 1 ? b[c] : a[c] + (b[c] - a[c]) * k;
  return r;
}
export const ESTADO_PLENO = PLENO;
