// Lo que la decisión de siempre (las cartas, `decision/cartas.js`; PLANUI §0.4 y §0.5) lee y anima fuera de su piel:
// leer la decisión del motor (las opciones, sus efectos por eje, la p, el riesgo, la planilla) y armar y animar la
// tarjeta de "lo que pasó" (el resultado inmediato, con los chips GANASTE / TE COSTÓ y los números que ruedan). Es el
// código que vivía adentro del renderer viejo (`crearDecision`, borrado en P2), movido sin cambiar lo que hace: las clases que arma (`.resultado`, `.res-*`,
// `.rn-*`, `.eje-chip`) tienen sus estilos en `estilos/decision.css` y `estilos/ejes.css`, globales.
//
// El contrato de la decisión (`components/decision/cartas.js`, lo llama `paradas/decision.js`):
//   export function crear(contenedor, decision, opciones) → { nodo, titulo, variante, narrar(ctx), destruir() }
// `opciones`: { estado, previa, mundo, sonido, responder, arte (tu main, para la costura), limite, lateral, margen }.
import { el, animar } from '../../fx/util.js';
import { entrar, num, odometro } from '../../fx/movimiento.js';
import { icono, glifoDeCampo, triangulos } from '../../fx/iconos.js';
import { porcentaje } from '../../../core/previaDePartido.js';
import { etiquetaDeRanked, servidorDeLaPartida, puntosAbsolutos } from '../../../core/ranked.js';
import { leerEvento, varianteDeCostura } from '../../core/bisagra.js';
import { ejeDe, EJES, tokenDeEje } from '../../core/ejes.js';
import { chipEje, chipsDeTexto } from '../chipsEje.js';

export const ETIQUETAS = {
  mecanica: 'Mecánica', macro: 'Macro', laneo: 'Laneo', teamfight: 'Teamfight', shotcalling: 'Shotcalling',
  adaptabilidad: 'Adaptabilidad', mentalidad: 'Consistencia', sleep: 'Sueño', studies: 'Estudios',
  familyTrust: 'Confianza familiar', hype: 'Hype', nivel: 'Nivel', arraigo: 'Arraigo', sinergia: 'Sinergia', jerarquia: 'Jerarquía', ranked: 'SoloQ'
};
// Los números que la tarjeta del resultado puede mostrar (lo demás que mueve una respuesta es maquinaria: la deuda de
// sueño, los contadores, el LP suelto, que va en el rango).
export const VISIBLES = /^(player\.stats\.\w+|player\.(studies|sleep|familyTrust)|career\.(jerarquia|arraigo|sinergia)|nivel|ranked)$/;
export const RIESGO = { seguro: 'seguro', incierto: 'incierto', ruleta: 'ruleta', alto: 'alto', peligroso: 'alto' };
export const CORTO = { 'Confianza familiar': 'Casa', Consistencia: 'Cabeza', Adaptabilidad: 'Adapt.', Shotcalling: 'Calls' };
// La magnitud de un cambio en la tarjeta (por cuánto se movió el número, de 100): ▲, ▲▲ o ▲▲▲.
const MAGNITUD_DEL_CAMBIO = { alta: 8, media: 3 };
// Un salto de SoloQ de más de esto (en el elo) es ▲▲▲; si no, ▲▲.
const SALTO_GRANDE_DE_ELO = 500;
// El orden de "lo que pasó" (ganaste / te costó): por magnitud (▲▲▲ antes que ▲) y, a igual magnitud, SoloQ primero y
// después el número más grande.
export const RANGO_DE_MAGNITUD = { alta: 3, media: 2, baja: 1 };
// La misma cantidad de triángulos (1-3) que la celda o la tarjeta, para el chip de la misma cifra (`chipEje({ magnitud })`).
export const TRIANGULOS_DE = RANGO_DE_MAGNITUD;
// Los ejes que agrupan varias stats (core/ejes.js): su chip y su tarjeta llevan el nombre de la stat, no el del eje.
const EJES_DE_VARIAS = new Set(['juego', 'equipo']);
// Los tiempos de "lo que pasó" (ms, desde que la tarjeta aparece): el cuerpo entra, los chips de a uno, los números
// ruedan, la luz pulsa y la tarjeta se sostiene.
export const T_RESULTADO = {
  cuerpo: 220,
  cuerpoPaso: 70,
  numeros: 420,
  odometro: 1100,
  deltas: 640,
  chips: 300,
  chipPaso: 55,
  pulso: 420,
  sostener: 3200
};
// Una oración de "qué está en juego" más corta que esto suma la siguiente.
const MIN_LINEA_EN_JUEGO = 60;
// Primer corte de oración: un punto/!/?/cierre de comillas seguido de espacio y una mayúscula, signo o comilla de apertura.
const FIN_DE_ORACION = /[.!?…]["”»)]*(?=\s+[A-ZÁÉÍÓÚÜÑ¿¡"“«(])/g;

export const campoCorto = (campo) => campo.split('.').pop();
export const conSigno = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + num(Math.abs(n));
const enEscala = (n) => Math.max(0, Math.min(100, n));
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
// PLANUI §0.3, punto 2: lo que ganaste y lo que te costó, de un vistazo. Arriba los chips de eje en dos grupos
// ("Ganaste" / "Te costó", por magnitud); abajo las tarjetas de cada número en el color de su eje, con una barra
// 0-100 del antes al después: las que suben primero y plenas, las que bajan después y atenuadas; SoloQ con su escalón
// en grande. De la prosa queda una línea; lo demás va a "más" y a "Textos: completos" (§7.5).
export function magnitudDe(campo, d) {
  const m = Math.abs(d);
  if (campo === 'ranked') return m > SALTO_GRANDE_DE_ELO ? 'alta' : 'media';
  return m >= MAGNITUD_DEL_CAMBIO.alta ? 'alta' : m >= MAGNITUD_DEL_CAMBIO.media ? 'media' : 'baja';
}

// La barra de una tarjeta: el riel 0-100, lo que ya había (la base) y el tramo que se movió (lleno si subió, hueco si
// se perdió). `data-a` / `data-b` son el antes y el después (`animarResultado` la anima con el odómetro).
function barraDeCambio(a, b) {
  const desde = enEscala(a);
  const hasta = enEscala(b);
  const bajo = Math.min(desde, hasta);
  return el('span', { class: 'rn-barra', 'aria-hidden': 'true', 'data-a': String(desde), 'data-b': String(hasta) }, [
    el('i', { class: 'rn-base', style: { width: `${bajo}%` } }),
    el('i', { class: 'rn-tramo', style: { left: `${bajo}%`, width: `${Math.max(desde, hasta) - bajo}%` } })
  ]);
}

function tarjetaDeNumero(c, a, b, lector) {
  const eje = ejeDe(c.campo);
  const sube = b > a;
  return el('div', { class: 'res-num', 'data-campo': campoCorto(c.campo), 'data-eje': eje, 'data-signo': sube ? 'sube' : 'baja', style: estiloEje(eje), title: lector.etiquetaDe(c.campo) }, [
    el('span', { class: 'rn-rotulo' }, [icono(glifoDeCampo(c.campo)), lector.nombreDeEje(c.campo)]),
    el('span', { class: 'rn-fila' }, [
      el('span', { class: 'rn-antes', text: num(a) }),
      icono('flecha'),
      el('b', { class: 'rn-valor', 'data-desde': String(a), 'data-hasta': String(b), text: num(b) }),
      el('span', { class: `rn-delta ${sube ? 'sube' : 'baja'}` }, [triangulos(magnitudDe(c.campo, b - a), sube ? '+' : '-'), conSigno(b - a)])
    ]),
    barraDeCambio(a, b)
  ]);
}

// SoloQ: el escalón en grande ("Platino II", y el LP al lado) y la barra del LP dentro de la división (si cambió de
// escalón, la barra arranca de la punta; en el ápice no hay división y no hay barra).
function tarjetaDeSoloq(c, d, todos, estado) {
  const sube = d >= 0;
  const [escalon, ...resto] = String(c.despues).split(' · ');
  const [escalonAntes] = String(c.antes ?? '').split(' · ');
  const cambioDeEscalon = Boolean(c.antes) && escalonAntes !== escalon;
  const r0 = estado?.player?.ranked ?? null;
  const lp = todos.find((x) => x.campo === 'player.ranked.lp');
  const division = todos.find((x) => x.campo === 'player.ranked.division');
  const divisionDespues = division ? division.despues : r0?.division;
  const lpDespues = lp ? lp.despues : r0?.lp;
  // el LP que vale una división, con la cuenta del motor: lo que separa esta división de la de abajo (en el ápice, 0)
  const tope = r0 && Number.isFinite(r0.division) ? puntosAbsolutos({ ...r0, lp: 0 }) - puntosAbsolutos({ ...r0, division: r0.division + 1, lp: 0 }) : 0;
  const lpAntes = cambioDeEscalon ? (sube ? 0 : tope) : lp ? lp.antes : lpDespues;
  const barra = Number.isFinite(divisionDespues) && Number.isFinite(lpDespues) && Number.isFinite(lpAntes) && tope > 0
    ? barraDeCambio((lpAntes / tope) * 100, (lpDespues / tope) * 100)
    : null;
  return el('div', { class: `res-num res-rango${cambioDeEscalon ? ' rn-escalon-nuevo' : ''}`, 'data-campo': 'ranked', 'data-eje': 'soloq', 'data-signo': sube ? 'sube' : 'baja', style: estiloEje('soloq') }, [
    el('span', { class: 'rn-rotulo' }, [icono('ranked'), EJES.soloq.corto, cambioDeEscalon ? el('span', { class: `rn-paso ${sube ? 'sube' : 'baja'}`, text: sube ? 'ascenso' : 'descenso' }) : null]),
    el('span', { class: 'rn-fila' }, [
      c.antes ? el('span', { class: 'rn-antes', text: c.antes }) : null,
      c.antes ? icono('flecha') : null,
      el('b', { class: 'rn-valor rn-texto' }, el('span', { class: 'rn-nuevo' }, [
        el('span', { class: 'rn-escalon', text: escalon }),
        resto.length ? el('span', { class: 'rn-lp', text: ` · ${resto.join(' · ')}` }) : null
      ])),
      d !== 0 ? el('span', { class: `rn-delta ${sube ? 'sube' : 'baja'}` }, [triangulos(magnitudDe('ranked', d), sube ? '+' : '-'), `${conSigno(d)} LP`]) : null
    ]),
    barra
  ]);
}

// Los números del resultado inmediato (`inm`, `ui/core/inmediato.js`): `caja` (las tarjetas por eje, en dos grupos),
// `cambios` (lo que rueda también en la placa "Vos") y `balance` (los chips GANASTE / TE COSTÓ, o null).
export function numerosDelResultado(inm, { estado, lector }) {
  const todos = inm?.cambios ?? [];
  const cambios = todos.filter((c) => VISIBLES.test(c.campo) && (c.campo === 'ranked' || (Number.isFinite(c.antes) && Number.isFinite(c.despues) && Math.round(c.despues) !== Math.round(c.antes))));
  const elo = todos.find((c) => c.campo === 'player.soloqElo');
  const items = [];
  for (const c of cambios) {
    if (c.campo === 'ranked') {
      if (!c.despues) continue;
      const d = Number.isFinite(elo?.delta) ? Math.round(elo.delta) : 0;
      items.push({ campo: c.campo, delta: d, sube: d >= 0, nodo: tarjetaDeSoloq(c, d, todos, estado), chip: d !== 0 ? { eje: 'soloq', valor: d, etiqueta: EJES.soloq.corto, sufijo: 'LP', magnitud: TRIANGULOS_DE[magnitudDe(c.campo, d)] } : null });
      continue;
    }
    const a = Math.round(c.antes);
    const b = Math.round(c.despues);
    items.push({ campo: c.campo, delta: b - a, sube: b > a, nodo: tarjetaDeNumero(c, a, b, lector), chip: { eje: ejeDe(c.campo), valor: b - a, etiqueta: lector.nombreDeEje(c.campo), magnitud: TRIANGULOS_DE[magnitudDe(c.campo, b - a)] } });
  }
  const porMagnitud = (x, y) => RANGO_DE_MAGNITUD[magnitudDe(y.campo, y.delta)] - RANGO_DE_MAGNITUD[magnitudDe(x.campo, x.delta)]
    || (y.campo === 'ranked') - (x.campo === 'ranked')
    || Math.abs(y.delta) - Math.abs(x.delta);
  const suben = items.filter((x) => x.sube).sort(porMagnitud);
  const bajan = items.filter((x) => !x.sube).sort(porMagnitud);
  // las tarjetas: SoloQ (el escalón) al frente de su grupo; las chicas, por magnitud
  const cartas = (lista) => [...lista.filter((x) => x.campo === 'ranked'), ...lista.filter((x) => x.campo !== 'ranked')].map((x) => x.nodo);
  const caja = el('div', { class: 'res-numeros' }, [
    suben.length ? el('div', { class: 'res-grupo', 'data-signo': 'sube' }, cartas(suben)) : null,
    bajan.length ? el('div', { class: 'res-grupo', 'data-signo': 'baja' }, cartas(bajan)) : null
  ]);
  // la fila de chips: "Ganaste" y "Te costó", cada una con su triángulo
  const decir = (x) => `${x.chip.etiqueta} ${conSigno(x.chip.valor)}${x.chip.sufijo ? ` ${x.chip.sufijo}` : ''}`;
  const grupo = (lista, signo, rotulo) => {
    const conChip = lista.filter((x) => x.chip);
    if (!conChip.length) return null;
    return el('div', { class: 'res-bal', 'data-signo': signo }, [
      el('span', { class: 'res-bal-rot' }, [triangulos('baja', signo === 'sube' ? '+' : '-'), rotulo]),
      ...conChip.map((x) => chipEje({ ...x.chip, grande: true }))
    ]);
  };
  const resumen = [
    suben.some((x) => x.chip) ? `Ganaste: ${suben.filter((x) => x.chip).map(decir).join(', ')}.` : '',
    bajan.some((x) => x.chip) ? `Te costó: ${bajan.filter((x) => x.chip).map(decir).join(', ')}.` : ''
  ].filter(Boolean).join(' ');
  const balance = resumen ? el('div', { class: 'res-balance', role: 'group', 'aria-label': resumen }, [grupo(suben, 'sube', 'Ganaste'), grupo(bajan, 'baja', 'Te costó')]) : null;
  return { caja, cambios, balance };
}

// La tarjeta de "lo que pasó" de la opción `o` (número `n` en pantalla). `logs`: los logs nuevos de la respuesta.
// Devuelve { tarjeta, cambios, contados } (`contados`: cuántos logs contó; esos no se vuelven a contar en el relato).
export function tarjetaDelResultado(o, n, inm, logs, { estado, lector }) {
  const delPaso = inm?.logs ?? logs.slice(0, 1);
  const conCuerpo = delPaso.find((l) => l.cuerpo) ?? delPaso[delPaso.length - 1] ?? null;
  const kicker = delPaso.find((l) => l !== conCuerpo && l.message) ?? null;
  const efectos = conCuerpo?.efectos ?? null;
  const { caja, cambios, balance } = numerosDelResultado(inm, { estado, lector });
  // sin los números del resultado inmediato, los chips salen del texto de efectos del motor
  const chips = balance ?? (efectos ? chipsDeTexto(efectos, { clase: 'eje-chips res-balance res-balance-texto' }) : null);
  // La línea que queda a la vista (la de los bloques y el LP en el plan; lo que pasó en un evento). El planteo del
  // plan y la tira de efectos (que ya dicen los chips) van a "más" y a "Textos: completos".
  const extra = [
    kicker ? el('p', { class: 'res-plan', text: kicker.message }) : null,
    efectos ? el('p', { class: 'res-efectos', text: efectos }) : null
  ].filter(Boolean);
  const btnMas = extra.length ? el('button', { type: 'button', class: 'btn-mas res-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const linea = conCuerpo ? conCuerpo.cuerpo ?? conCuerpo.message ?? '' : '';
  const tarjeta = el('div', { class: 'resultado', id: 'decisionResultado', tabindex: '-1', 'aria-label': `Resultado: ${o.label}` }, [
    el('div', { class: 'res-cab' }, [el('span', { class: 'op-tecla', 'aria-hidden': 'true', text: String(n) }), el('span', { class: 'op-label', text: o.label }), el('span', { class: 'res-tag', text: 'Elegiste' })]),
    chips,
    linea || btnMas ? el('p', { class: 'res-texto' }, [linea ? el('span', { text: linea }) : null, btnMas]) : null,
    extra.length ? el('div', { class: 'res-extra' }, extra) : null,
    caja.childElementCount ? caja : null
  ]);
  btnMas?.addEventListener('click', () => {
    const abrir = !tarjeta.classList.contains('abierto');
    tarjeta.classList.toggle('abierto', abrir);
    btnMas.setAttribute('aria-expanded', String(abrir));
    btnMas.textContent = abrir ? 'menos' : 'más';
  });
  return { tarjeta, cambios, contados: delPaso.length };
}

// La coreografía de adentro de la tarjeta, desde que aparece (`desde`, ms): la cabecera barre, el cuerpo entra de a
// uno, los chips GANASTE / TE COSTÓ de a uno, los números ruedan con sus barras, los deltas saltan y el escalón de SoloQ
// sube. El movimiento de la tarjeta misma (de dónde viene) es de quien la pinta.
export function animarResultado(tarjeta, { desde = 0 } = {}) {
  const T = T_RESULTADO;
  animar(tarjeta.querySelector('.res-cab'), [{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0' }], { delay: desde, dur: 700 });
  [...tarjeta.children].filter((x) => !x.classList.contains('res-cab')).forEach((x, k) => entrar(x, desde + T.cuerpo + k * T.cuerpoPaso, 12));
  // los chips de ganaste / te costó, uno por uno
  tarjeta.querySelectorAll('.res-balance .eje-chip').forEach((c, k) => animar(c, [{ opacity: 0, transform: 'translateY(6px) scale(.92)' }, { opacity: 1, transform: 'none' }], { delay: desde + T.chips + k * T.chipPaso, dur: 320 }));
  tarjeta.querySelectorAll('.rn-valor[data-desde]').forEach((v) => odometro(v, Number(v.dataset.desde), Number(v.dataset.hasta), { delay: desde + T.numeros, dur: T.odometro }));
  // las barras van con el odómetro: lo ganado crece desde lo que había; lo perdido se vacía y queda hueco
  tarjeta.querySelectorAll('.rn-barra[data-a]').forEach((b) => {
    const a = Number(b.dataset.a);
    const z = Number(b.dataset.b);
    if (z >= a) {
      animar(b.querySelector('.rn-tramo'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: desde + T.numeros, dur: T.odometro });
      return;
    }
    animar(b.querySelector('.rn-base'), [{ width: `${a}%` }, { width: `${z}%` }], { delay: desde + T.numeros, dur: T.odometro });
    animar(b.querySelector('.rn-tramo'), [{ opacity: 0 }, { opacity: 1 }], { delay: desde + T.numeros, dur: T.odometro });
  });
  tarjeta.querySelectorAll('.rn-delta').forEach((d, k) => animar(d, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { delay: desde + T.deltas + k * 60, dur: 320 }));
  const rango = tarjeta.querySelector('.rn-nuevo');
  if (rango) animar(rango, [{ opacity: 0, transform: 'translateY(100%)' }, { opacity: 1, transform: 'none' }], { delay: desde + T.numeros + 140, dur: 460 });
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
