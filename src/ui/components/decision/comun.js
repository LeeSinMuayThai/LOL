// Lo que la decisión de siempre (las cartas, `decision/cartas.js`; PLANUI §0.4 y §0.5) lee y anima fuera de su piel:
// leer la decisión del motor (las opciones, sus efectos por eje, la p, el riesgo, la planilla) y leer la consecuencia de lo
// elegido (la línea del resultado y los números que cambiaron; I1c: ya no hay tarjeta de "lo que pasó").
//
// El contrato de la decisión (`components/decision/cartas.js`, lo llama `paradas/decision.js`):
//   export function crear(contenedor, decision, opciones) → { nodo, titulo, variante, narrar(ctx), destruir() }
// `opciones`: { estado, previa, mundo, sonido, responder, arte (tu main, para la costura), limite, lateral, margen }.
import { el } from '../../fx/util.js';
import { num } from '../../fx/movimiento.js';
import { icono, glifoDeCampo } from '../../fx/iconos.js';
import { porcentaje } from '../../../core/previaDePartido.js';
import { etiquetaDeRanked, servidorDeLaPartida } from '../../../core/ranked.js';
import { leerEvento, varianteDeCostura } from '../../core/bisagra.js';
import { ejeDe, EJES, tokenDeEje } from '../../core/ejes.js';
import { chipEje } from '../chipsEje.js';

export const ETIQUETAS = {
  mecanica: 'Mecánica', macro: 'Macro', laneo: 'Laneo', teamfight: 'Teamfight', shotcalling: 'Shotcalling',
  adaptabilidad: 'Adaptabilidad', mentalidad: 'Consistencia', sleep: 'Sueño', studies: 'Estudios',
  familyTrust: 'Confianza familiar', hype: 'Hype', nivel: 'Nivel', arraigo: 'Arraigo', sinergia: 'Sinergia', jerarquia: 'Jerarquía', ranked: 'SoloQ'
};
// Los números que la tarjeta del resultado puede mostrar (lo demás que mueve una respuesta es maquinaria: la deuda de
// sueño, los contadores, el LP suelto, que va en el rango).
export const VISIBLES = /^(player\.stats\.\w+|player\.(studies|sleep|familyTrust)|career\.(jerarquia|arraigo|sinergia)|player\.ranked\.lp|nivel|ranked)$/;
export const RIESGO = { seguro: 'seguro', incierto: 'incierto', ruleta: 'ruleta', alto: 'alto', peligroso: 'alto' };
export const CORTO = { 'Confianza familiar': 'Casa', Consistencia: 'Cabeza', Adaptabilidad: 'Adapt.', Shotcalling: 'Calls' };
// El orden de "lo que pasó" (ganaste / te costó): por magnitud (▲▲▲ antes que ▲) y, a igual magnitud, SoloQ primero y
// después el número más grande.
export const RANGO_DE_MAGNITUD = { alta: 3, media: 2, baja: 1 };
// La misma cantidad de triángulos (1-3) que la celda o la tarjeta, para el chip de la misma cifra (`chipEje({ magnitud })`).
export const TRIANGULOS_DE = RANGO_DE_MAGNITUD;
// Los ejes que agrupan varias stats (core/ejes.js): su chip y su tarjeta llevan el nombre de la stat, no el del eje.
const EJES_DE_VARIAS = new Set(['juego', 'equipo']);
// Una oración de "qué está en juego" más corta que esto suma la siguiente.
const MIN_LINEA_EN_JUEGO = 60;
// Primer corte de oración: un punto/!/?/cierre de comillas seguido de espacio y una mayúscula, signo o comilla de apertura.
const FIN_DE_ORACION = /[.!?…]["”»)]*(?=\s+[A-ZÁÉÍÓÚÜÑ¿¡"“«(])/g;

export const campoCorto = (campo) => campo.split('.').pop();
export const conSigno = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + num(Math.abs(n));
// El color del eje como variables del nodo (`--eje`: trazo, glifo y rótulo; `--eje-f`: el relleno tenue). Sin eje, nada
// (el nodo queda neutro).
export function estiloEje(id) {
  const t = tokenDeEje(id);
  return t ? { '--eje': t.color, '--eje-f': t.fill } : null;
}

// Un punto adentro de una cita o de un paréntesis no es el fin de la línea.
function quedaAbierto(corte) {
  const cuenta = (re) => (corte.match(re) ?? []).length;
  return cuenta(/"/g) % 2 === 1 || cuenta(/“/g) > cuenta(/”/g) || cuenta(/«/g) > cuenta(/»/g) || cuenta(/\(/g) > cuenta(/\)/g);
}

// [linea, resto]: la línea de "qué está en juego" y el resto de la descripción.
export function partirDescripcion(texto) {
  const limpio = String(texto ?? '').trim();
  for (const m of limpio.matchAll(FIN_DE_ORACION)) {
    const fin = m.index + m[0].length;
    if (m.index + 1 >= MIN_LINEA_EN_JUEGO && !quedaAbierto(limpio.slice(0, fin))) {
      return [limpio.slice(0, fin).trim(), limpio.slice(fin).trim()];
    }
  }
  return [limpio, ''];
}

// La forma de la parada: la planilla para el plan del año (o cualquier decisión de 3+ opciones con todos sus efectos en
// número); si no, la lista.
export function formaDeDecision(decision) {
  const opciones = decision?.opciones ?? [];
  const todoNumero = opciones.length >= 3 && opciones.every((o) => (o.previa ?? []).length > 0 && o.previa.every((p) => typeof p.valor === 'number'));
  return decision?.datos?.motivo === 'plan_amateur' || todoNumero ? 'matriz' : 'lista';
}

// La planilla (el plan del año): las columnas son los ejes en orden de aparición. `referente`: el valor de hoy de cada
// eje (la cabecera); `stats`: la escala de cada columna; `mejorGanancia(o)`: el eje en el que más sube la opción.
function planilla(disponibles, estado) {
  const ejes = [];
  for (const o of disponibles) for (const p of o.previa ?? []) if (!ejes.includes(p.campo)) ejes.push(p.campo);
  const p0 = estado?.player ?? {};
  const referente = {
    'player.ranked': p0.ranked ? etiquetaDeRanked(p0.ranked, servidorDeLaPartida(estado)).replace(' LP', '') : null,
    'player.studies': p0.studies,
    'player.sleep': p0.sleep,
    'player.familyTrust': p0.familyTrust,
    'player.stats.mentalidad': p0.stats?.mentalidad
  };
  const stats = Object.fromEntries(ejes.map((c) => {
    const vals = disponibles.map((o) => (o.previa ?? []).find((p) => p.campo === c)?.valor ?? 0);
    // `maxSube`: la ganancia más grande de la columna, para comparar ejes de escalas distintas (LP contra puntos)
    return [c, { max: Math.max(1, ...vals.map(Math.abs)), maxSube: Math.max(0, ...vals), mixto: vals.some((v) => v < 0) && vals.some((v) => v > 0) }];
  }));
  // La ganancia más grande de una opción: el eje en el que más sube, relativo a lo más que sube esa columna (así
  // "Aparecer en casa" se lee "casa" y "Bootcamp" se lee "SoloQ", sin leer números). Empate: relativo a lo más que se
  // mueve la columna (un +5 de sueño donde otras opciones pierden 11 pesa menos que el mejor +7 de casa); si sigue,
  // la primera columna.
  const mejorGanancia = (o) => {
    let mejor = null;
    let peso = [0, 0];
    for (const c of ejes) {
      const p = (o.previa ?? []).find((x) => x.campo === c);
      if (!p || !(p.valor > 0) || !(stats[c].maxSube > 0)) continue;
      const w = [p.valor / stats[c].maxSube, p.valor / stats[c].max];
      if (w[0] > peso[0] || (w[0] === peso[0] && w[1] > peso[1])) {
        peso = w;
        mejor = c;
      }
    }
    return mejor;
  };
  return { ejes, referente, stats, mejorGanancia };
}

// Todo lo que la pantalla lee de la decisión del motor, sin pintar nada.
//   forma, esMatriz          'lista' | 'matriz'
//   disponibles, bloqueadas  las opciones (las cerradas, con su `gate`)
//   lec, variante            la lectura de la bisagra (`core/bisagra.js`) y la costura que pide (o null)
//   previas                  la previa de partido por id de opción ({ p, texto })
//   etiquetaDe(campo), nombreDeEje(campo), chipDePrevia(p), pDe(o), riesgoDe(o), lectores(o)
//   matriz                   en la planilla: { ejes, referente, stats, mejorGanancia(o) }
export function leerDecision(decision, { estado, previa = null }) {
  const forma = formaDeDecision(decision);
  const esMatriz = forma === 'matriz';
  const disponibles = decision.opciones ?? [];
  const bloqueadas = decision.opcionesBloqueadas ?? [];
  const lec = leerEvento(decision, estado);
  const variante = varianteDeCostura(lec);
  const previas = Object.fromEntries((previa?.opciones ?? []).map((p) => [p.id, p]));
  const etiquetas = {};
  for (const o of disponibles) for (const p of o.previa ?? []) etiquetas[p.campo] = p.etiqueta;
  const etiquetaDe = (campo) => etiquetas[campo] ?? ETIQUETAS[campoCorto(campo)] ?? campoCorto(campo);
  // El nombre corto del eje (el mismo en todas las pantallas); en los ejes de varias stats, el de la stat.
  const nombreDeEje = (campo) => {
    const eje = ejeDe(campo);
    return eje && !EJES_DE_VARIAS.has(eje) ? EJES[eje].corto : CORTO[etiquetaDe(campo)] ?? etiquetaDe(campo);
  };
  // Un efecto de la previa como chip de eje: "Casa +8" (el texto del motor, "Confianza familiar ~+8", en el title).
  const chipDePrevia = (p) => {
    const chip = chipEje({ eje: ejeDe(p.campo), valor: typeof p.valor === 'number' ? p.valor : null, etiqueta: nombreDeEje(p.campo), sufijo: campoCorto(p.campo) === 'ranked' ? 'LP' : '', magnitud: TRIANGULOS_DE[p.magnitud] ?? null });
    if (p.texto) chip.title = p.texto;
    return chip;
  };
  const pDe = (o) => {
    const p = previas[o.id]?.p ?? null;
    return Number.isFinite(p) ? p : null;
  };
  // El riesgo normalizado ('seguro' | 'incierto' | 'ruleta' | 'alto'), o null si la opción no tiene.
  const riesgoDe = (o) => (o.riesgo ? RIESGO[o.riesgo] ?? 'incierto' : null);
  // Para los lectores (y la búsqueda del navegador): todo lo que el motor dice de la opción.
  const lectores = (o) => [
    o.descripcion,
    (o.previa ?? []).map((p) => p.texto).join('. '),
    o.riesgoTexto ? `Riesgo: ${o.riesgoTexto}` : '',
    o.seguro && Number.isFinite(o.seguro.valor) ? `${o.seguro.alReves ? 'Ojo, puede salir al revés: ' : ''}${o.seguro.etiqueta} ${conSigno(o.seguro.valor)}${o.seguro.unidad ? ` ${o.seguro.unidad}` : ''}` : '',
    o.aviso?.texto ? `Ojo: ${o.aviso.pct != null ? `${o.aviso.pct}% de las veces, ` : ''}${o.aviso.texto}` : '',
    o.propuesta ?? '',
    o.plan?.texto ?? '',
    previas[o.id]?.texto ?? ''
  ].filter(Boolean).join('. ');
  return {
    forma, esMatriz, disponibles, bloqueadas, lec, variante, previas,
    etiquetaDe, nombreDeEje, chipDePrevia, pDe, riesgoDe, lectores,
    matriz: esMatriz ? planilla(disponibles, estado) : null
  };
}

// El porcentaje de una p (0-1) como entero, el mismo que muestra la previa.
export { porcentaje };

// ---------------------------------------------------------------------- "lo que pasó"
// I1c (D164): sin tarjeta. La consecuencia de la opción elegida son dos cosas: los números que cambiaron (rueden en la
// ficha, con su ▲▼) y UNA línea (el texto del resultado) bajo la opción. De `inm` (el resultado inmediato,
// `ui/core/inmediato.js`) sale `cambios` (solo los números que la ficha o la placa pueden mostrar), `linea` y `contados`
// (cuántos logs contó; esos no se vuelven a contar en el relato).
export function consecuenciaDelResultado(inm, logs = []) {
  const delPaso = inm?.logs ?? logs.slice(0, 1);
  const conCuerpo = delPaso.find((l) => l.cuerpo) ?? delPaso[delPaso.length - 1] ?? null;
  const linea = conCuerpo ? conCuerpo.cuerpo ?? conCuerpo.message ?? '' : '';
  const cambios = (inm?.cambios ?? []).filter((c) => c.campo !== 'ranked' && VISIBLES.test(c.campo) && Number.isFinite(c.antes) && Number.isFinite(c.despues) && Math.round(c.despues) !== Math.round(c.antes));
  return { linea, cambios, contados: delPaso.length };
}

// El pulso de la luz al final de los números: un golpe si algo que importa bajó (sueño y estudios no cuentan), un logro
// si no.
export function pulsoDelResultado(cambios) {
  return cambios.some((c) => Number.isFinite(c.delta) && c.delta < 0 && !/sleep|studies/.test(c.campo)) ? 'golpe' : 'logro';
}

// El nombre del riesgo para la pantalla, con su ícono (el mismo que la decisión de siempre).
export function riesgoNodo(o, lector) {
  const k = lector.riesgoDe(o);
  return k ? el('span', { class: 'riesgo', 'data-riesgo': k }, [icono(k), o.riesgo]) : null;
}
