// LA POLITICA DEL MUNDO (PLANUI §4.6): cuanto campeon hay en el fondo despues del inicio. Vive aca y en ningun otro
// lado. El ambiente la lee (convierte cada estado en los uniformes del shader, o en el respaldo CSS) y el aura le avisa
// cuando apuntas a un campeon. Las pantallas no saben que variante corre: solo declaran hechos ("esto es un momento",
// "esto es un takeover") y el ambiente los traduce con la politica.
//
//   pleno  la fusion de hoy (por defecto): el campeon en la luz, a pantalla completa, siempre.
//   menos  "un poco menos": la misma composicion, con el campeon a ~70 % y sin derrame fuera de los paneles.
//   tenue  el mismo mundo a bajo volumen: el campeon siempre, a un tercio, fundido en la bruma, sin profundidad.
//   paso   el campeon aparece cuando importa (el aura, la pantalla de carga y el post-game, el resultado) y se va.
//   lugar  el fondo es solo luz; el campeon vive recortado en un lugar fijo de la interfaz, como en el cliente.
//
// Lo mismo en las cuatro: el inicio y los takeovers (CAMPEONES, la firma, AFUERA) van al 100 %; la luz de la era sigue.

import { COLOR_DEF, colorDe, conColor } from './color.js';

export const FONDOS = ['pleno', 'menos', 'tenue', 'paso', 'lugar'];
export const FONDO_DEF = 'pleno';
export const normalizarFondo = (f) => (FONDOS.includes(f) ? f : FONDO_DEF);

// Un ESTADO del mundo. Todo es 0-1 salvo `contraste` (1 = el de hoy):
//   presencia    cuanto campeon hay en el fondo de pantalla completa (1 = la fusion de hoy)
//   profundidad  el 2,5D: el parallax por capas, la contraluz que lo recorta, el flujo de las luces altas
//   bruma        bruma de la era por encima del campeon (lo funde en la luz)
//   vineta       vineta extra
//   contraste    contraste del duotono del campeon
//   suave        desenfoque del campeon
//   enLugar      presencia adentro del lugar fijo (solo cuenta si la pantalla tiene uno)
//   ventana      cuanto pesa el lugar fijo (1 = el campeon vive recortado en su ventana, 0 = no hay ventana: el takeover)
//   contra       la luz de contra de la era (1 = la de hoy; menos = sin el derrame del borde)
//   luz, polvo   cuanto mas haz y mas polvo de la era (1 = los de hoy): sin el campeon, la luz sola tiene que seguir
//                dando profundidad, y no quedar un fondo plano
// Ademas, el color (js/color.js lo suma a cada estado): colorFondo, lavado y colorLugar (0 = duotono, 1 = color real).
export const CAMPOS = ['presencia', 'profundidad', 'bruma', 'vineta', 'contraste', 'suave', 'enLugar', 'ventana', 'contra', 'luz', 'polvo', 'colorFondo', 'lavado', 'colorLugar'];
const PLENO = { presencia: 1, profundidad: 1, bruma: 0, vineta: 0, contraste: 1, suave: 0, enLugar: 1, ventana: 0, contra: 1, luz: 1, polvo: 1, colorFondo: 0, lavado: 0, colorLugar: 0 };
// un poco menos: la misma composicion, el campeon a ~70 %, la contra de la era sin derramarse por el borde
const MENOS = { ...PLENO, presencia: 0.7, contra: 0.4, vineta: 0.15 };
// la luz sola: haces, bruma y polvo de la era, sin splash (un poco mas de haz y de polvo); si la pantalla tiene lugar
// fijo, el campeon vive ahi
const LUZ = { ...PLENO, presencia: 0, ventana: 1, luz: 1.2, polvo: 1.6 };
// tenue: un tercio, fundido en la bruma, sin la cara en primer plano
const TENUE = { ...PLENO, presencia: 0.42, profundidad: 0, bruma: 0.5, vineta: 0.3, contraste: 0.72, suave: 0.4, luz: 1.15, polvo: 1.3 };
// lugar, con el aura: el campeon del lugar cambia y tiñe la luz de afuera (un velo de color, sin forma)
const TINTE = { ...LUZ, presencia: 0.22, suave: 1, contraste: 0.45, enLugar: 1 };

// Cada variante: el estado en reposo, con el aura apuntando, en un momento, y en un takeover. `lugar` dice si el
// campeon vive en un lugar fijo de la interfaz. `campeonDelMomento`: en un momento con campeon propio (la pantalla de
// carga de un mapa: tu pick) el mundo muestra ese campeon y no el de la pantalla. `etiqueta` y `linea` son para la vitrina (en el idioma del usuario).
export const POLITICAS = {
  pleno: { etiqueta: 'Como hoy', linea: 'El campeón llena el fondo en todas las pantallas.', reposo: PLENO, aura: PLENO, momento: PLENO, takeover: PLENO, lugar: false },
  menos: { etiqueta: 'Un poco menos', linea: 'La misma composición, con el campeón un poco más bajo y sin derrame.', reposo: MENOS, aura: MENOS, momento: MENOS, takeover: PLENO, lugar: false },
  tenue: { etiqueta: 'Tenue', linea: 'El campeón sigue de fondo, pero bajito: se ve primero la luz.', reposo: TENUE, aura: TENUE, momento: TENUE, takeover: PLENO, lugar: false },
  paso: { etiqueta: 'De paso', linea: 'Solo luz. El campeón aparece cuando importa y se va.', reposo: LUZ, aura: PLENO, momento: PLENO, takeover: PLENO, lugar: false, campeonDelMomento: true },
  lugar: { etiqueta: 'En su lugar', linea: 'Solo luz de fondo. El campeón vive en un lugar fijo, como en el cliente.', reposo: LUZ, aura: TINTE, momento: LUZ, takeover: PLENO, lugar: true },
};

// Tiempos (ms): cuanto tarda en subir un momento, cuanto en volver a la luz despues de uno (~2 s), el cruce al cambiar
// de pantalla y el cruce al cambiar de variante en vivo.
export const TIEMPOS = { sube: 520, vuelta: 2000, pantalla: 1300, variante: 700 };

// Las pantallas que siempre van al 100 %: el inicio y los takeovers (pantalla, o pantalla/muestra). Las eras son la
// demostracion de las cinco luces con el mundo de hoy.
const SIEMPRE_PLENO = ['inicio', 'eras', 'cumbre/titulo', 'mercado/firma'];

// Donde vive el campeon en `lugar`. `ancla`: el elemento de la pantalla; `crear`: la ventana que se suma adentro (la
// carta del escenario del draft, la banda sobre el panel "vos", el video de la Tribuna) o, sin `crear`, el ancla misma.
// La ventana es CSS (estilos/fondo.css): su opacidad es el peso del lugar (la carta se apaga mientras se juega la serie). `hasta`: la ventana
// termina arriba de ese elemento (la parada de la Tribuna). `foco`: donde cae la cara adentro de la ventana (0-1).
// `escala`: el alto del splash en altos de la ventana.
const LUGARES = {
  'partido/serie': { ancla: '.escenario', crear: 'carta', foco: [0.5, 0.44], escala: 2.3 },
  'partido/serieReplan': { ancla: '.escenario', crear: 'carta', foco: [0.5, 0.44], escala: 2.3 },
  'partido/swiss': { ancla: '.player', crear: 'video', hasta: '.sw-parada', foco: [0.55, 0.45], escala: 3 },
  'decision/evento': { ancla: '.contexto', crear: 'banda', foco: [0.56, 0.5], escala: 2.6 },
  'decision/planAmateur': { ancla: '.contexto', crear: 'banda', foco: [0.56, 0.5], escala: 2.6 },
  'mercado/mercado': { ancla: '.contexto', crear: 'banda', foco: [0.56, 0.5], escala: 2.6 },
};

// PLANUI §4.7 (op=escenario del partido): la ARENA. El campeon vive en la pantalla gigante del escenario (un lugar fijo,
// con la mecanica de `lugar`: el aura cambia lo que se ve ahi) y apenas se derrama afuera; el resto del mundo es la
// sala (los cabezales, el humo y el publico, en ambiente.js). Una pantalla la pide con `escena: 'arena'` y gana sobre
// la perilla `fondo`: es la composicion de esa opcion, no un nivel de intensidad.
const ARENA = { ...PLENO, presencia: 0.12, profundidad: 0.6, ventana: 1, enLugar: 1, contra: 0.5, polvo: 1.3 };
// PLANUI §4.8 (op=final): EL ESTADIO. El campeon sale del mundo: vive en las pantallas LED del escenario, que son DOM
// (js/partido.js, crearEstadio), y el aura cambia lo que muestran. El mundo es la sala: la luz de ambiente, el humo, el
// polvo y la contra baja; sin campeon y sin lugar fijo, en reposo, con el aura, en un momento y en el takeover.
const ESTADIO = { ...PLENO, presencia: 0, profundidad: 0, ventana: 0, enLugar: 0, contra: 0.35, luz: 0.85, polvo: 1.1 };
const ESCENAS = {
  arena: { reposo: ARENA, aura: ARENA, momento: ARENA, takeover: ARENA, lugar: true },
  estadio: { reposo: ESTADIO, aura: ESTADIO, momento: ESTADIO, takeover: ESTADIO, lugar: false },
};
// La pantalla gigante: `crear: 'pantalla'` (estilos/partido.css la ubica adentro del escenario del draft o del player).
const LUGARES_ESCENA = {
  arena: {
    'partido/serie': { ancla: '.escenario', crear: 'pantalla', foco: [0.5, 0.44], escala: 1.75 },
    'partido/serieReplan': { ancla: '.escenario', crear: 'pantalla', foco: [0.5, 0.44], escala: 1.75 },
    'partido/swiss': { ancla: '.player', crear: 'pantalla', foco: [0.5, 0.46], escala: 1.75 },
  },
};

const clave = (pantalla, muestra) => `${pantalla}/${muestra ?? ''}`;
const plena = (pantalla, muestra) => SIEMPRE_PLENO.includes(pantalla) || SIEMPRE_PLENO.includes(clave(pantalla, muestra));

// La politica de una variante para una pantalla: los estados que el ambiente usa (con el color de js/color.js) y el
// lugar (si hay).
// `escena` (opcional): la composicion que pide la pantalla montada (PLANUI §4.7: 'arena'); gana sobre la perilla.
export function politica(nombre, pantalla, muestra, color = COLOR_DEF, escena = null) {
  const lugarEscena = escena ? LUGARES_ESCENA[escena]?.[clave(pantalla, muestra)] ?? null : null;
  // una escena sin lugar fijo (el estadio) vale para la pantalla que la pida
  if (lugarEscena || (escena && ESCENAS[escena]?.lugar === false)) {
    const e = ESCENAS[escena];
    const c = colorDe(color, pantalla, muestra);
    const estado = (k) => conColor(e[k], c, { takeover: k === 'takeover' });
    return { nombre: escena, color: c, reposo: estado('reposo'), aura: estado('aura'), momento: estado('momento'), takeover: estado('takeover'), campeonDelMomento: false, lugar: lugarEscena };
  }
  const p = POLITICAS[normalizarFondo(nombre)];
  const todoPleno = plena(pantalla, muestra);
  const c = colorDe(color, pantalla, muestra);
  const estado = (k) => conColor(todoPleno ? PLENO : p[k] ?? p.reposo, c, { takeover: k === 'takeover' });
  return {
    nombre: normalizarFondo(nombre),
    color: c,
    reposo: estado('reposo'),
    aura: estado('aura'),
    momento: estado('momento'),
    takeover: estado('takeover'),
    campeonDelMomento: !todoPleno && Boolean(p.campeonDelMomento),
    lugar: !todoPleno && p.lugar ? LUGARES[clave(pantalla, muestra)] ?? null : null,
  };
}

// Monta (o saca) la ventana del lugar en la pantalla ya armada. Devuelve { nodo, foco, escala } o null.
// `crear` suma un elemento decorativo (aria-hidden, sin texto): la interfaz no cambia, solo el contenido de ese lugar.
export function montarLugar(raiz, lugar) {
  raiz?.querySelectorAll('.lugar-ventana').forEach((n) => n.remove());
  if (!raiz || !lugar) return null;
  const ancla = raiz.querySelector(lugar.ancla);
  if (!ancla) return null;
  let nodo = ancla;
  if (lugar.crear) {
    nodo = document.createElement('div');
    nodo.className = `lugar-ventana lugar-${lugar.crear}`;
    nodo.setAttribute('aria-hidden', 'true');
    ancla.append(nodo);
    const tope = lugar.hasta ? ancla.querySelector(lugar.hasta) : null;
    if (tope) nodo.style.bottom = `${ancla.clientHeight - tope.offsetTop + parseFloat(getComputedStyle(nodo).getPropertyValue('--lugar-aire'))}px`;
  }
  return { nodo, foco: lugar.foco, escala: lugar.escala };
}

// Mezcla dos estados (k en 0-1). Con a === b devuelve exactamente a (la fusion de hoy no cambia ni un bit).
export function mezclarEstados(a, b, k) {
  const r = {};
  for (const c of CAMPOS) r[c] = k >= 1 ? b[c] : a[c] + (b[c] - a[c]) * k;
  return r;
}
export const ESTADO_PLENO = PLENO;
