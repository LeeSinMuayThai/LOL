// La decisión (PLANUI U2a punto 3; portado de `crearDecision` de vitrina/fusion/js/decision.js con `op=linea`). La
// parada es UN panel: la cabecera (el rótulo, el título ancho y el planteo en una línea, con su "más") y abajo las
// opciones por glifos (cada eje con su magnitud por cantidad de triángulos, el riesgo como ícono + nombre, la p con su
// medidor) con el inspector al costado: una sola prosa a la vez, la de la opción apuntada. El plan del año del amateur
// es la planilla (opciones × ejes) con el inspector abajo. Con destino (`ui/core/bisagra.js`), el mundo es la costura de
// la bisagra (`components/costura.js`).
//
// Elegir: la fila se marca, la luz pulsa y se responde al motor. Lo que pasó lo cuenta la misma fila (`narrar`, PLANUI
// §0.2 punto 4): la opción se vuelve la tarjeta de SU resultado inmediato (el primer paso del motor, `ui/core/inmediato.js`)
// con los números rodando en la tarjeta y en la placa "Vos". Lo que viene después (el resto del split) lo cuenta el
// relato: la tarjeta no lo adelanta (regla 4 de §V.3).
//
// Nada del texto del motor se pierde (§7.5): la descripción de cada opción, sus efectos, el riesgo, la propuesta de tu
// perfil y el plan que fija (`opcion.plan.texto`, tal cual lo arma el motor) están en el inspector y, para los lectores,
// en la descripción de cada botón; con `html[data-textos="completos"]` van a la vista en cada fila.
//
// Los ejes (PLANUI §0.3, puntos 1 y 2; `ui/core/ejes.js`): cada cosa que se mueve (SoloQ, Estudios, Sueño, Casa,
// Cabeza…) lleva el color de su eje en `--eje` / `--eje-f` (inline, con `tokenDeEje`), el mismo en la planilla, en la
// tarjeta de "lo que pasó", en los chips y en la placa "Vos". El color dice QUÉ se movió; el signo lo dicen los
// triángulos y el número (--up / --down).
import { el, animar, quieto, celular, EXPO, DUR } from '../fx/util.js';
import { entrar, salir, esperar, lineasConMascara, num, odometro } from '../fx/movimiento.js';
import { icono, glifoDeCampo, triangulos, ABREVIATURA } from '../fx/iconos.js';
import { rotuloDeDecision } from '../formatoUi.js';
import { porcentaje } from '../../core/previaDePartido.js';
import { etiquetaDeRanked, servidorDeLaPartida, puntosAbsolutos } from '../../core/ranked.js';
import { leerEvento, varianteDeCostura } from '../core/bisagra.js';
import { crearCostura, equiposDelMundo } from './costura.js';
import { crearNarracion } from '../narracion.js';
import { ejeDe, EJES, tokenDeEje } from '../core/ejes.js';
import { chipEje, chipsDeTexto } from './chipsEje.js';

const ETIQUETAS = {
  mecanica: 'Mecánica', macro: 'Macro', laneo: 'Laneo', teamfight: 'Teamfight', shotcalling: 'Shotcalling',
  adaptabilidad: 'Adaptabilidad', mentalidad: 'Consistencia', sleep: 'Sueño', studies: 'Estudios',
  familyTrust: 'Confianza familiar', hype: 'Hype', nivel: 'Nivel', arraigo: 'Arraigo', sinergia: 'Sinergia', jerarquia: 'Jerarquía', ranked: 'SoloQ'
};
// Los números que la tarjeta del resultado puede mostrar (lo demás que mueve una respuesta es maquinaria: la deuda de
// sueño, los contadores, el LP suelto, que va en el rango).
const VISIBLES = /^(player\.stats\.\w+|player\.(studies|sleep|familyTrust)|career\.(jerarquia|arraigo|sinergia)|nivel|ranked)$/;
const RIESGO = { seguro: 'seguro', incierto: 'incierto', ruleta: 'ruleta', alto: 'alto', peligroso: 'alto' };
const CORTO = { 'Confianza familiar': 'Casa', Consistencia: 'Cabeza', Adaptabilidad: 'Adapt.', Shotcalling: 'Calls' };
// La magnitud de un cambio en la tarjeta (por cuánto se movió el número, de 100): ▲, ▲▲ o ▲▲▲.
const MAGNITUD_DEL_CAMBIO = { alta: 8, media: 3 };
// Un salto de SoloQ de más de esto (en el elo) es ▲▲▲; si no, ▲▲.
const SALTO_GRANDE_DE_ELO = 500;
// El orden de "lo que pasó" (ganaste / te costó): por magnitud (▲▲▲ antes que ▲) y, a igual magnitud, SoloQ primero y
// después el número más grande.
const RANGO_DE_MAGNITUD = { alta: 3, media: 2, baja: 1 };
// La misma cantidad de triángulos (1-3) que la celda o la tarjeta, para el chip de la misma cifra (`chipEje({ magnitud })`).
const TRIANGULOS_DE = RANGO_DE_MAGNITUD;
// Los ejes que agrupan varias stats (core/ejes.js): su chip y su tarjeta llevan el nombre de la stat, no el del eje.
const EJES_DE_VARIAS = new Set(['juego', 'equipo']);
// Los tiempos de la parada (ms; los de la vitrina): la entrada del panel y la narración del resultado.
const T = {
  titulo: 780, // el título entra por línea
  tituloPaso: 70,
  col: 640,
  rotulo: 740,
  planteo: 900,
  filas: 950,
  filaPaso: 50,
  inspector: 1120,
  // la narración: la fila crece hasta la tarjeta, el cuerpo entra, los números ruedan y la tarjeta se sostiene
  cuerpo: 220,
  cuerpoPaso: 70,
  numeros: 420,
  odometro: 1100,
  deltas: 640,
  chips: 300, // los chips de ganaste / te costó entran uno por uno
  chipPaso: 55,
  pulso: 420,
  sostener: 3200,
  // sin el pre-roll del relato, el panel entra 600 ms antes que en la vitrina
  sinPreroll: -600
};
// Una oración de "qué está en juego" más corta que esto suma la siguiente.
const MIN_LINEA_EN_JUEGO = 60;
// Primer corte de oración: un punto/!/?/cierre de comillas seguido de espacio y una mayúscula, signo o comilla de apertura.
const FIN_DE_ORACION = /[.!?…]["”»)]*(?=\s+[A-ZÁÉÍÓÚÜÑ¿¡"“«(])/g;

const campoCorto = (campo) => campo.split('.').pop();
const conSigno = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + num(Math.abs(n));
const enEscala = (n) => Math.max(0, Math.min(100, n));
// El color del eje como variables del nodo (`--eje`: trazo, glifo y rótulo; `--eje-f`: el relleno tenue). Sin eje, nada
// (el nodo queda neutro).
function estiloEje(id) {
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

// `contenedor`: el `#decision`. `decision`: la del motor. `opciones`:
//   estado      el estado de la parada (lo que la pantalla ya contó)
//   previa      `previaDeDecision` (la p de cada opción de un partido) o null
//   mundo       el puente del ambiente (`ctx.mundo`: declarar, costura, geometria, tenir, fx)
//   sonido      los sonidos del kit (opcional)
//   responder   `responder({ opcionId })` del controlador
//   arte        tu main (la clave de Data Dragon)
//   limite      la línea "antes" (`#paradaAntes`) · lateral: la placa "Vos" (`#acompanante`) · margen(): px
// Devuelve { nodo, titulo, variante, narrar(ctx), destruir() }.
export function crearDecision(contenedor, decision, { estado, previa = null, mundo, sonido = null, responder, arte = null, limite = null, lateral = null, margen = () => 0 }) {
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
  const fx = () => mundo?.fx?.() ?? null;

  // ------------------------------------------------------------------ la cabecera
  const raiz = el('section', { class: 'parada parada-decision', 'data-forma': forma, 'data-bisagra': lec.bisagra ? '' : null, 'data-costura': variante });
  const col = el('div', { class: 'parada-col' });
  const rotuloCat = rotuloDeDecision(decision, estado);
  const rotulo = el('p', { class: 'rotulo-cat' }, [
    el('i', { class: 'punto-luz' }),
    el('span', { text: esMatriz ? 'El plan del año' : rotuloCat.label }),
    lec.bisagra ? el('span', { class: 'bisagra', text: 'Decisión bisagra' }) : null,
    esMatriz ? el('span', { class: 'bisagra', text: 'el plan corre solo' }) : null
  ]);
  const titulo = el('h1', { class: 'titulo-parada', id: 'decisionTitle', 'data-foco': '', tabindex: '-1', text: decision.titulo });
  const [primera, resto] = partirDescripcion(decision.descripcion);
  const btnMas = resto ? el('button', { type: 'button', class: 'btn-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'planteo', id: 'decisionDesc' }, [el('span', { class: 'planteo-1', text: primera }), resto ? el('span', { class: 'planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const abrir = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', abrir);
    btnMas.setAttribute('aria-expanded', String(abrir));
    btnMas.textContent = abrir ? 'menos' : 'más';
  });

  // ------------------------------------------------------------------ las opciones
  const filas = [];
  const descId = (i) => `decision-desc-${i}`;
  const pDe = (o) => {
    const pv = previas[o.id];
    const p = pv?.p ?? null;
    return Number.isFinite(p) ? p : null;
  };
  // Para los lectores (y la búsqueda del navegador): todo lo que el motor dice de la opción.
  const descOculta = (o, i) => el('span', { class: 'solo-lectores', id: descId(i) }, [
    [
      o.descripcion,
      (o.previa ?? []).map((p) => p.texto).join('. '),
      o.riesgoTexto ? `Riesgo: ${o.riesgoTexto}` : '',
      o.propuesta ?? '',
      o.plan?.texto ?? '',
      previas[o.id]?.texto ?? ''
    ].filter(Boolean).join('. ')
  ]);
  const riesgoNodo = (o) => {
    if (!o.riesgo) return null;
    const k = RIESGO[o.riesgo] ?? 'incierto';
    return el('span', { class: 'riesgo', 'data-riesgo': k }, [icono(k), o.riesgo]);
  };
  const medidorP = (p) => el('span', { class: 'medidor-p', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(porcentaje(p)) }, [el('i', {}, el('i', { style: { width: `${p * 100}%` } })), el('b', { text: `${porcentaje(p)}%` })]);
  const masMovil = (o, i) => {
    const b = el('button', { type: 'button', class: 'op-mas', 'aria-label': `Más sobre ${o.label}`, text: 'más' });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      apuntar(i, true, true);
    });
    return b;
  };
  const tags = (o) => {
    const hay = o.propuesta || (o.rareza && o.rareza !== 'comun');
    return hay ? el('span', { class: 'op-tags' }, [
      o.propuesta ? el('span', { class: 'tag tag-perfil', text: 'Tu perfil' }) : null,
      o.rareza && o.rareza !== 'comun' ? el('span', { class: 'tag tag-rara', text: o.rareza }) : null
    ]) : null;
  };
  // La prosa de la opción, a la vista solo con "Textos: completos".
  const opDesc = (o) => (o.descripcion ? el('span', { class: 'op-desc', text: o.descripcion }) : null);
  // El plan que fija la opción del cierre de año: su nombre en la fila; la línea del motor, en el inspector.
  const opPlan = (o) => (o.plan?.texto ? el('span', { class: 'op-plan', title: o.plan.texto }, [icono('practica'), el('span', { text: o.plan.titulo ?? o.plan.texto })]) : null);

  let lista;
  if (!esMatriz) {
    lista = el('div', { class: 'opciones', id: 'decisionOptions', role: 'group', 'aria-label': 'Opciones' });
    disponibles.forEach((o, i) => {
      const glifos = el('span', { class: 'op-glifos' }, [
        ...(o.previa ?? []).map((p) => el('span', { class: `eje ${p.signo === '-' ? 'baja' : 'sube'}`, 'data-eje': ejeDe(p.campo), style: estiloEje(ejeDe(p.campo)), title: p.texto }, [icono(glifoDeCampo(p.campo)), el('span', { class: 'eje-nom', text: ABREVIATURA[glifoDeCampo(p.campo)] ?? p.etiqueta }), triangulos(p.magnitud, p.signo)])),
        riesgoNodo(o),
        pDe(o) != null ? medidorP(pDe(o)) : null
      ]);
      const b = el('button', { type: 'button', class: 'opcion', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'aria-describedby': descId(i) }, [
        el('span', { class: 'op-tecla', 'aria-hidden': 'true', text: String(i + 1) }),
        el('span', { class: 'op-cuerpo' }, [el('span', { class: 'op-label' }, [o.label, tags(o)]), opDesc(o), glifos, opPlan(o)]),
        descOculta(o, i)
      ]);
      filas.push(b);
      lista.append(el('div', { class: 'op-caja' }, [b, masMovil(o, i)]));
    });
  } else {
    // la planilla: columnas = ejes en orden de aparición; cada celda alinea barra + número + magnitud
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
    lista = el('div', { class: 'matriz', id: 'decisionOptions', role: 'group', 'aria-label': 'El plan del año: opciones por eje', style: { '--ejes': String(ejes.length), '--cols': String(ejes.length + 1) } });
    lista.append(el('div', { class: 'mx-cab', 'aria-hidden': 'true' }, [
      el('span', { class: 'mx-op', text: 'Plan · por semana' }),
      ...ejes.map((c) => el('span', { class: 'mx-eje', 'data-campo': campoCorto(c), 'data-eje': ejeDe(c), style: estiloEje(ejeDe(c)) }, [
        icono(glifoDeCampo(c)),
        el('span', { class: 'mx-eje-nom', text: nombreDeEje(c) }),
        referente[c] != null ? el('b', { class: 'mx-ref', text: typeof referente[c] === 'number' ? num(referente[c]) : String(referente[c]) }) : null
      ])),
      // el riesgo no es un eje: lleva el glifo del riesgo (el de la casita es del eje Casa)
      el('span', { class: 'mx-eje mx-riesgo-cab' }, [icono('incierto'), el('span', { class: 'mx-eje-nom', text: 'Riesgo · año' })])
    ]));
    disponibles.forEach((o, i) => {
      const mejor = mejorGanancia(o);
      const celdas = ejes.map((c) => {
        const p = (o.previa ?? []).find((x) => x.campo === c);
        if (!p) return el('span', { class: 'mx-celda vacia' }, el('i', { class: 'mx-nada' }));
        const st = stats[c];
        const ancho = (Math.abs(p.valor) / st.max) * (st.mixto ? 50 : 100);
        const barra = el('span', { class: 'mx-barra' + (st.mixto ? ' mixta' : '') }, el('i', { class: p.signo === '-' ? 'baja' : 'sube', style: { width: `${ancho}%` } }));
        const eje = ejeDe(c);
        return el('span', { class: `mx-celda ${p.signo === '-' ? 'baja' : 'sube'}${c === mejor ? ' mx-mejor' : ''}`, 'data-eje': eje, style: estiloEje(eje), title: p.texto }, [barra, el('b', {}, [conSigno(p.valor), campoCorto(c) === 'ranked' ? el('span', { class: 'mx-u', text: ' LP' }) : null]), triangulos(p.magnitud, p.signo)]);
      });
      const marcas = [];
      if (o.semanaDeuda != null) marcas.push(el('span', { class: 'mx-marca', title: `deuda de sueño desde la semana ${o.semanaDeuda}` }, [icono('sleep'), `s${o.semanaDeuda}`]));
      if (o.semanaMentalRoja != null) marcas.push(el('span', { class: 'mx-marca', title: `cabeza en rojo desde la semana ${o.semanaMentalRoja}` }, [icono('mentalidad'), `s${o.semanaMentalRoja}`]));
      if (o.semanaRiesgoFisico != null) marcas.push(el('span', { class: 'mx-marca', title: `riesgo físico desde la semana ${o.semanaRiesgoFisico}` }, [icono('alto'), `s${o.semanaRiesgoFisico}`]));
      const casa = Number.isFinite(o.riesgoCasa) ? porcentaje(o.riesgoCasa) : null;
      const riesgo = el('span', { class: 'mx-celda mx-riesgo', 'data-riesgo': RIESGO[o.riesgo] ?? 'incierto' }, [
        casa != null ? el('span', { class: 'mx-casa', title: 'que en casa te saquen la PC en el año' }, [el('span', { class: 'mx-barra' }, el('i', { class: 'riesgo', style: { width: `${casa}%` } })), el('b', { text: `${casa}%` })]) : null,
        ...marcas
      ]);
      const b = el('button', { type: 'button', class: 'opcion mx-fila', 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'aria-describedby': descId(i) }, [
        el('span', { class: 'mx-op' }, [el('span', { class: 'op-tecla', 'aria-hidden': 'true', text: String(i + 1) }), el('span', { class: 'op-label', text: o.label }), tags(o)]),
        ...celdas,
        riesgo,
        descOculta(o, i)
      ]);
      filas.push(b);
      lista.append(el('div', { class: 'op-caja' }, [b, masMovil(o, i)]));
    });
  }
  // Las cerradas se muestran con su motivo, no desaparecen.
  bloqueadas.forEach((bq, k) => {
    const b = el('div', { class: `opcion bloqueada${esMatriz ? ' mx-fila' : ''}`, tabindex: '0', 'aria-disabled': 'true', 'data-gate': bq.gate ?? '' }, [
      el('span', { class: esMatriz ? 'mx-op' : 'op-tecla' }, esMatriz ? [el('span', { class: 'op-tecla' }, icono('candado')), el('span', { class: 'op-label', text: bq.label })] : icono('candado')),
      esMatriz ? null : el('span', { class: 'op-cuerpo' }, [el('span', { class: 'op-label', text: bq.label }), el('span', { class: 'op-glifos' }, el('span', { class: 'gate', text: 'cerrada' }))]),
      el('span', { class: 'solo-lectores', text: `Cerrada: ${bq.gate ?? ''}` })
    ]);
    b.dataset.cerrada = String(k);
    filas.push(b);
    lista.append(el('div', { class: 'op-caja' }, b));
  });

  // ------------------------------------------------------------------ el inspector (una sola prosa a la vez)
  const inspector = el('div', { class: 'inspector', 'aria-live': 'polite' });
  let apuntada = 0;
  let elegido = false;
  // `destino`: dónde se pinta (el inspector vivo, o el clon fuera del árbol accesible con el que se mide: ver `fijarAltoDelInspector`).
  function pintarInspector(i, destino = inspector) {
    const f = filas[i];
    if (!f) return;
    destino.textContent = '';
    if (f.classList.contains('bloqueada')) {
      destino.append(el('p', { class: 'insp-kicker' }, [icono('candado'), 'Cerrada']), el('p', { class: 'insp-texto', text: f.dataset.gate }));
      return;
    }
    const o = disponibles[i];
    destino.append(
      el('p', { class: 'insp-kicker' }, [el('span', { class: 'insp-n', text: String(i + 1) }), o.label]),
      el('p', { class: 'insp-texto', text: o.descripcion ?? '' }),
      // los efectos como chips de eje (la planilla); el texto del motor de cada uno, abajo con "Textos: completos"
      (o.previa ?? []).length ? el('div', { class: 'eje-chips insp-ejes' }, o.previa.map(chipDePrevia)) : null,
      el('ul', { class: 'insp-previa' }, [
        ...(o.previa ?? []).map((p) => el('li', { class: `insp-efecto ${p.signo === '-' ? 'baja' : 'sube'}` }, [icono(glifoDeCampo(p.campo)), p.texto])),
        o.riesgoTexto ? el('li', { class: 'insp-riesgo' }, [icono(RIESGO[o.riesgo] ?? 'incierto'), o.riesgoTexto]) : null,
        previas[o.id]?.texto ? el('li', { class: 'insp-p' }, [icono('rendimiento'), previas[o.id].texto]) : null,
        o.propuesta ? el('li', { class: 'insp-perfil' }, [icono('hype'), o.propuesta]) : null,
        o.plan?.texto ? el('li', { class: 'insp-plan' }, [icono('practica'), textoDelPlan(o)]) : null
      ])
    );
  }
  function apuntar(i, mover = false, usuario = false) {
    apuntada = Math.max(0, Math.min(filas.length - 1, i));
    filas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    pintarInspector(apuntada);
    if (mover) filas[apuntada].focus({ preventScroll: true });
    inspector.classList.toggle('expandido', mover);
    // la fila i del panel es el camino i de la costura (las disponibles primero, las cerradas al final: el mismo orden)
    if (usuario && !elegido) capa?.apuntar(apuntada);
  }
  filas.forEach((f, i) => {
    f.addEventListener('pointerenter', () => {
      if (celular() || elegido) return;
      if (i !== apuntada) fx()?.pulso?.('apuntar');
      apuntar(i, false, true);
    });
    f.addEventListener('focus', () => {
      if (!elegido) apuntar(i, false, Boolean(capa));
    });
    if (!f.classList.contains('bloqueada')) f.addEventListener('click', () => elegir(i));
  });

  const cab = el('header', { class: 'panel-cab' }, [rotulo, titulo, planteo]);
  const cuerpo = el('div', { class: 'panel-cuerpo' }, [lista, inspector]);
  col.append(cab, cuerpo);
  raiz.append(col);

  // ------------------------------------------------------------------ la costura (con destino)
  let capa = null;
  if (variante) {
    capa = crearCostura(lec, {
      mundo, arte, sonido, equiposDe: equiposDelMundo(estado), contenedor: raiz, limite, lateral, margen, variante,
      alAceptar: (o) => abrirPanel(o)
    });
    raiz.prepend(capa.nodo, capa.banda);
    if (lec.aviso) raiz.classList.add('dc-espera');
    lista.addEventListener('pointerleave', () => {
      if (!elegido && !lista.contains(document.activeElement)) capa.soltar();
    });
  }

  contenedor.replaceChildren(raiz);
  apuntar(0);
  // El inspector cambia de alto con la opción apuntada; con el panel apoyado abajo eso corre las filas debajo del
  // puntero (y el puntero pasa a apuntar otra). Se reserva el alto de la opción más alta.
  //
  // Se mide en un clon (`aria-hidden`, sin `aria-live`, invisible y fuera del flujo, con el ancho del inspector vivo): el
  // inspector vivo es una región `aria-live="polite"` y repintarlo N+1 veces (al montar, en `fonts.ready`, en cada resize y
  // al cambiar Textos) hacía que un lector de pantalla anunciara cada opción. Al vivo solo se le toca el `minHeight`.
  function fijarAltoDelInspector() {
    if (!raiz.isConnected || elegido) return;
    inspector.style.minHeight = '';
    const ancho = inspector.offsetWidth;
    let alto = 0;
    if (ancho > 0) {
      const medida = inspector.cloneNode(false);
      medida.removeAttribute('aria-live');
      medida.removeAttribute('id');
      medida.setAttribute('aria-hidden', 'true');
      Object.assign(medida.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: '0', top: '0', width: `${ancho}px`, minHeight: '' });
      inspector.parentNode.append(medida);
      filas.forEach((_, i) => {
        pintarInspector(i, medida);
        alto = Math.max(alto, medida.offsetHeight);
      });
      medida.remove();
    }
    inspector.style.minHeight = `${alto}px`;
  }
  fijarAltoDelInspector();
  document.fonts?.ready?.then(fijarAltoDelInspector, () => {});
  window.addEventListener('resize', fijarAltoDelInspector);
  // "Textos: completos" cambia lo que entra en el inspector: se vuelve a medir
  const vigiaDeTextos = typeof MutationObserver === 'function' ? new MutationObserver(fijarAltoDelInspector) : null;
  vigiaDeTextos?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-textos'] });

  // ------------------------------------------------------------------ la entrada
  function entradaPanel(d = 0) {
    lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: T.titulo + d + i * T.tituloPaso, dur: DUR.larga }));
    animar(col, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { delay: T.col + d, dur: 320 });
    entrar(rotulo, T.rotulo + d, 10);
    entrar(planteo, T.planteo + d, 10);
    filas.forEach((f, i) => {
      entrar(f, T.filas + d + i * T.filaPaso, 16);
      f.querySelectorAll('.eje, .riesgo, .mx-celda').forEach((g, k) => animar(g, [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { delay: T.filas + 60 + d + i * T.filaPaso + k * 25, dur: 240 }));
    });
    if (esMatriz) {
      entrar(lista.querySelector('.mx-cab'), T.filas - 30 + d, 8);
      lista.querySelectorAll('.mx-barra i').forEach((b, k) => animar(b, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: T.filas + 90 + d + k * 12, dur: 520 }));
    }
    entrar(inspector, T.inspector + d, 8);
  }
  // aceptar el aviso: la costura se abre y el panel entra con su orden; el foco pasa al título
  function abrirPanel({ instantaneo = false } = {}) {
    raiz.classList.remove('dc-espera');
    if (quieto() || instantaneo) {
      if (!elegido) titulo.focus({ preventScroll: true });
      return;
    }
    entradaPanel(capa.retardoAceptar);
    esperar(raiz, capa.focoAceptar).then(() => {
      if (!elegido && raiz.isConnected) titulo.focus({ preventScroll: true });
    });
  }
  // La parada entra después del relato (que ya pasó por el mundo): el panel con su orden, sin el pre-roll de la vitrina
  // (el relato del split que se plegaba en la línea "antes": en el juego ese relato es la pieza anterior).
  capa?.entrar();
  if (!lec.aviso && !quieto()) entradaPanel(T.sinPreroll);

  // ------------------------------------------------------------------ elegir
  let respuesta = null; // { i, o, fila, r0 }
  function elegir(i) {
    if (elegido) return;
    const o = disponibles[i];
    const fila = filas[i];
    if (!o || !fila || fila.classList.contains('bloqueada')) return;
    if (capa?.avisoAbierto) capa.aceptarYa();
    elegido = true;
    raiz.classList.add('eligiendo');
    apuntar(i);
    fila.setAttribute('aria-pressed', 'true');
    fx()?.pulso?.('elegir');
    sonido?.clic?.();
    const tono = capa?.elegir(i) ?? null;
    if (tono) mundo?.tenir?.(tono);
    respuesta = { i, o, fila };
    responder({ opcionId: o.id });
  }

  // Las flechas mueven lo apuntado (el foco); 1-4 los pone el teclado del shell (`data-atajo`).
  raiz.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || elegido) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      apuntar(apuntada + (e.key === 'ArrowDown' ? 1 : -1), true, true);
    }
  });

  // ------------------------------------------------------------------ narrar: la opción se vuelve su resultado
  // PLANUI §0.3, punto 2: lo que ganaste y lo que te costó, de un vistazo. Arriba los chips de eje en dos grupos
  // ("Ganaste" / "Te costó", por magnitud); abajo las tarjetas de cada número en el color de su eje, con una barra
  // 0-100 del antes al después: las que suben primero y plenas, las que bajan después y atenuadas; SoloQ con su escalón
  // en grande. De la prosa queda una línea; lo demás va a "más" y a "Textos: completos" (§7.5).
  function magnitudDe(campo, d) {
    const m = Math.abs(d);
    if (campo === 'ranked') return m > SALTO_GRANDE_DE_ELO ? 'alta' : 'media';
    return m >= MAGNITUD_DEL_CAMBIO.alta ? 'alta' : m >= MAGNITUD_DEL_CAMBIO.media ? 'media' : 'baja';
  }

  // La barra de una tarjeta: el riel 0-100, lo que ya había (la base) y el tramo que se movió (lleno si subió, hueco si
  // se perdió). `data-a` / `data-b` son el antes y el después (narrar la anima con el odómetro).
  function barraDeCambio(a, b) {
    const desde = enEscala(a);
    const hasta = enEscala(b);
    const bajo = Math.min(desde, hasta);
    return el('span', { class: 'rn-barra', 'aria-hidden': 'true', 'data-a': String(desde), 'data-b': String(hasta) }, [
      el('i', { class: 'rn-base', style: { width: `${bajo}%` } }),
      el('i', { class: 'rn-tramo', style: { left: `${bajo}%`, width: `${Math.max(desde, hasta) - bajo}%` } })
    ]);
  }

  function tarjetaDeNumero(c, a, b) {
    const eje = ejeDe(c.campo);
    const sube = b > a;
    return el('div', { class: 'res-num', 'data-campo': campoCorto(c.campo), 'data-eje': eje, 'data-signo': sube ? 'sube' : 'baja', style: estiloEje(eje), title: etiquetaDe(c.campo) }, [
      el('span', { class: 'rn-rotulo' }, [icono(glifoDeCampo(c.campo)), nombreDeEje(c.campo)]),
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
  function tarjetaDeSoloq(c, d, todos) {
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

  function numerosDeLaTarjeta(inm) {
    const todos = inm?.cambios ?? [];
    const cambios = todos.filter((c) => VISIBLES.test(c.campo) && (c.campo === 'ranked' || (Number.isFinite(c.antes) && Number.isFinite(c.despues) && Math.round(c.despues) !== Math.round(c.antes))));
    const elo = todos.find((c) => c.campo === 'player.soloqElo');
    const items = [];
    for (const c of cambios) {
      if (c.campo === 'ranked') {
        if (!c.despues) continue;
        const d = Number.isFinite(elo?.delta) ? Math.round(elo.delta) : 0;
        items.push({ campo: c.campo, delta: d, sube: d >= 0, nodo: tarjetaDeSoloq(c, d, todos), chip: d !== 0 ? { eje: 'soloq', valor: d, etiqueta: EJES.soloq.corto, sufijo: 'LP', magnitud: TRIANGULOS_DE[magnitudDe(c.campo, d)] } : null });
        continue;
      }
      const a = Math.round(c.antes);
      const b = Math.round(c.despues);
      items.push({ campo: c.campo, delta: b - a, sube: b > a, nodo: tarjetaDeNumero(c, a, b), chip: { eje: ejeDe(c.campo), valor: b - a, etiqueta: nombreDeEje(c.campo), magnitud: TRIANGULOS_DE[magnitudDe(c.campo, b - a)] } });
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

  function tarjetaResultado(o, n, inm, logs) {
    const delPaso = inm?.logs ?? logs.slice(0, 1);
    const conCuerpo = delPaso.find((l) => l.cuerpo) ?? delPaso[delPaso.length - 1] ?? null;
    const kicker = delPaso.find((l) => l !== conCuerpo && l.message) ?? null;
    const efectos = conCuerpo?.efectos ?? null;
    const { caja, cambios, balance } = numerosDeLaTarjeta(inm);
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

  // `ctx` (app.js, `narrarRespuesta`): { logs, inmediato(), escala, rapido, controlar, rodarPlaca }. Devuelve cuántos de
  // los logs nuevos contó (desde el primero): esos no se vuelven a contar en el relato.
  async function narrar(ctx) {
    if (!respuesta || !raiz.isConnected) return 0;
    const { i, o, fila } = respuesta;
    const inm = ctx.inmediato?.() ?? null;
    const { tarjeta, cambios, contados } = tarjetaResultado(o, i + 1, inm, ctx.logs ?? []);
    const narracion = crearNarracion(ctx, [raiz]);
    try {
      const r0 = fila.getBoundingClientRect();
      // lo que se va: las otras filas se apagan en su lugar (un fantasma), el planteo y el inspector se pliegan
      const c0 = lista.getBoundingClientRect();
      const fantasma = lista.cloneNode(true);
      fantasma.classList.add('ln-fantasma');
      fantasma.setAttribute('aria-hidden', 'true');
      fantasma.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      fantasma.removeAttribute('id');
      fantasma.querySelectorAll(':scope > .op-caja')[i]?.classList.add('oculta');
      Object.assign(fantasma.style, { position: 'absolute', left: `${lista.offsetLeft}px`, top: `${lista.offsetTop}px`, width: `${c0.width}px`, margin: '0' });
      lista.replaceWith(tarjeta);
      cuerpo.classList.add('con-resultado');
      col.append(fantasma);
      const r1 = tarjeta.getBoundingClientRect();
      const salida = animar(fantasma, [{ opacity: 1 }, { opacity: 0, filter: 'blur(2px)' }], { dur: DUR.sale, fill: 'forwards', easing: 'linear' });
      if (salida) salida.finished.then(() => fantasma.remove(), () => fantasma.remove());
      else fantasma.remove();
      for (const x of [planteo, inspector]) {
        const a = salir(x, 0);
        if (a) a.finished.then(() => x.classList.add('ln-plegado'), () => x.classList.add('ln-plegado'));
        else x.classList.add('ln-plegado');
      }
      rotulo.querySelector('span').textContent = 'Lo que pasó';
      animar(tarjeta, [
        { transform: `translateY(${r0.top - r1.top}px)`, clipPath: `inset(0 0 calc(100% - ${r0.height}px) 0)` },
        { transform: 'none', clipPath: 'inset(0 0 0 0)' }
      ], { dur: DUR.larga, easing: EXPO });
      animar(tarjeta.querySelector('.res-cab'), [{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0' }], { dur: 700, easing: EXPO });
      [...tarjeta.children].filter((x) => !x.classList.contains('res-cab')).forEach((x, k) => entrar(x, T.cuerpo + k * T.cuerpoPaso, 12));
      // los chips de ganaste / te costó, uno por uno
      tarjeta.querySelectorAll('.res-balance .eje-chip').forEach((c, k) => animar(c, [{ opacity: 0, transform: 'translateY(6px) scale(.92)' }, { opacity: 1, transform: 'none' }], { delay: T.chips + k * T.chipPaso, dur: 320 }));
      tarjeta.querySelectorAll('.rn-valor[data-desde]').forEach((v) => odometro(v, Number(v.dataset.desde), Number(v.dataset.hasta), { delay: T.numeros, dur: T.odometro }));
      // las barras van con el odómetro: lo ganado crece desde lo que había; lo perdido se vacía y queda hueco
      tarjeta.querySelectorAll('.rn-barra[data-a]').forEach((b) => {
        const desde = Number(b.dataset.a);
        const hasta = Number(b.dataset.b);
        if (hasta >= desde) {
          animar(b.querySelector('.rn-tramo'), [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: T.numeros, dur: T.odometro });
          return;
        }
        animar(b.querySelector('.rn-base'), [{ width: `${desde}%` }, { width: `${hasta}%` }], { delay: T.numeros, dur: T.odometro });
        animar(b.querySelector('.rn-tramo'), [{ opacity: 0 }, { opacity: 1 }], { delay: T.numeros, dur: T.odometro });
      });
      tarjeta.querySelectorAll('.rn-delta').forEach((d, k) => animar(d, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { delay: T.deltas + k * 60, dur: 320 }));
      const rango = tarjeta.querySelector('.rn-nuevo');
      if (rango) animar(rango, [{ opacity: 0, transform: 'translateY(100%)' }, { opacity: 1, transform: 'none' }], { delay: T.numeros + 140, dur: 460 });
      // los mismos números ruedan en la placa "Vos" (y en la franja)
      for (const nodo of ctx.rodarPlaca?.(cambios, T.numeros + 100) ?? []) narracion.incluir(nodo);
      const golpe = cambios.some((c) => Number.isFinite(c.delta) && c.delta < 0 && !/sleep|studies/.test(c.campo));
      narracion.esperar(T.pulso).then(() => fx()?.pulso?.(golpe ? 'golpe' : 'logro'));
      tarjeta.focus({ preventScroll: true });
      // INST: el cuadro final de "lo que pasó" se sostiene un instante (como el de la serie y el contrato); Enter o un clic lo pasan
      await narracion.vistazo();
      await narracion.esperar(T.sostener);
    } finally {
      narracion.fin();
    }
    return contados;
  }

  return {
    nodo: raiz,
    titulo,
    variante,
    narrar,
    destruir() {
      window.removeEventListener('resize', fijarAltoDelInspector);
      vigiaDeTextos?.disconnect();
      capa?.destruir();
    }
  };
}

// La línea del plan que fija una opción del cierre de año, tal cual la arma el motor (`lineaDePlan`): la pantalla no
// calcula nada.
function textoDelPlan(opcion) {
  return opcion.plan.texto;
}
