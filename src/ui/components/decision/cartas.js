// La decisión de siempre (PLANUI §0.4 y §0.5, ola P2): las opciones son cartas de aumento (Arena / TFT). Cada carta es
// un objeto: la ventana de arte, el label, los efectos como chips de eje, el riesgo como gemas, la p como un medidor fino
// y la tecla al pie. El marco lleva el color del eje que domina; si la opción tiene rareza, el borde es prismático.
//
// El arte de la ventana (P2, §0.5: un campeón aparece solo cuando la pantalla habla de él), por prioridad:
//   1. el campeón que la opción nombra (su label, su descripción o los textos de su previa: `campeonesNombrados`);
//   2. el equipo o la liga adonde lleva la opción (la bisagra con destino: la liga de destino si te vas, tu org si te
//      quedás): el logo grande sobre el color de ese equipo o esa liga;
//   3. si no, el emblema del aumento de su eje (`decision/emblema.js`), con la placa hexagonal adentro.
// En 1 y 2 el medallón del eje flota en el borde del arte; en 3 ya es parte del emblema.
//
// El contrato está en la cabecera de `decision/comun.js`: las mismas opciones, el mismo retorno, la costura, el teclado.
// La coreografía:
//   entrar   las cartas se reparten desde abajo, de a una; el emblema (o el medallón) hace pop y los chips caen;
//   apuntar  la carta sube, crece y se inclina siguiendo el puntero; un brillo la cruza, un halo de su eje abajo, las
//            otras se apagan y la prosa de la apuntada va en la banda de abajo (una por vez, sin saltos de alto);
//   elegir   la elegida destella y salta, las otras se queman (`quemar`, el de Fearless);
//   narrar   las quemadas se disuelven hacia abajo, la elegida viaja al centro y gira: su dorso es la tarjeta de "lo
//            que pasó", que se abre a lo ancho y corre `animarResultado`.
// La planilla (el plan del año) son cuatro cartas con un mini gráfico por eje en el cuerpo y una leyenda arriba.
//
// Nada del texto del motor se pierde (§7.5): la descripción, los efectos, el riesgo, la propuesta y el plan van en la
// banda (el inspector) y, para los lectores, en la descripción de cada carta; con `html[data-textos="completos"]` la
// descripción va también en la carta.
import { el, animar, quieto, reducido, celular, EXPO, SALE, RESORTE, DUR } from '../../fx/util.js';
import { entrar, esperar, lineasConMascara, num } from '../../fx/movimiento.js';
import { icono, glifoDeCampo } from '../../fx/iconos.js';
import { urlCentrada } from '../../fx/arte.js';
import { logoOrg, logoComp, competicionDe } from '../../fx/competicion.js';
import { tonoDestino, tonoOrg, aplicarTono } from '../../fx/tono.js';
import { emblema } from './emblema.js';
import { quemar } from '../../fx/ceremonia.js';
import { campeonesNombrados } from '../../core/mundo.js';
import { mostrarLegendaria } from '../../fx/momento.js';
import { ejeDe } from '../../core/ejes.js';
import { rotuloDeDecision } from '../../formatoUi.js';
import { crearCostura, equiposDelMundo } from '../costura.js';
import { crearNarracion, FUNDIDO_MS } from '../../narracion.js';
import { leerDecision, partirDescripcion, estiloEje, conSigno, campoCorto, RIESGO, T_RESULTADO, tarjetaDelResultado, animarResultado, pulsoDelResultado, porcentaje } from './comun.js';

// Los tiempos (ms). La entrada: la cabecera, las cartas de a una (cada `paso`), el medallón y los chips después de su
// carta. La narración: el viaje de la elegida (con la primera mitad del giro), la segunda mitad y la apertura a lo ancho.
const T = {
  rotulo: 60,
  titulo: 140,
  tituloPaso: 70,
  planteo: 320,
  leyenda: 360,
  cartas: 420,
  paso: 90,
  carta: 560,
  medallon: 120,
  medallonDur: 420,
  chips: 260,
  chipPaso: 40,
  inspector: 900,
  destello: 120,
  salto: 340,
  quema: 70,
  disolver: 420,
  viaje: 340,
  giro: 300,
  abre: 420,
  contenido: 160,
  // H2b: la vuelta de las cartas de la mano (boca abajo, de a una; la legendaria, última y con pausa)
  vuelta: 380,
  pausaVuelta: 260,
  pausaLegendaria: 640,
  vueltaLegendaria: 900,
  giroDorso: 170,
  brote: 700,
  chispas: 14,
  chispaDist: 90
};
// El vuelo de la carta al repartirse y la inclinación máxima al apuntar (grados).
const REPARTO = { y: 70, rotX: 22, escala: 0.9 };
const INCLINACION = 9;
// Cuántas gemas enciende cada riesgo.
const GEMAS = { seguro: 1, incierto: 2, ruleta: 3, alto: 3 };
// La perspectiva del giro de la carta a la tarjeta (px).
const PERSPECTIVA_GIRO = 1200;

// G2a (PLANUI §0.9): el rótulo de la carta de un evento, con el formato de El Ídolo: GOLPE DURO (la categoría), DECISIÓN
// DIFÍCIL (una bifurcación de carrera) o PASAN COSAS (el resto). Solo los eventos del split (y los de la ventana del retiro);
// el cierre de año, el momento de un partido y las paradas de sistema conservan el suyo.
// G4c: unos puntos suspensivos seguidos de minúscula no cierran la frase ("Podés terminar en el banco… o eterno.").
const primeraOracion = (texto) => String(texto).match(/^.*?(?:[.!?]|…(?![\s]+[a-záéíóúñ]))(?=\s|$)/)?.[0] ?? String(texto);

function rotuloDeEvento(decision) {
  const evento = decision?.datos?.evento;
  const motivo = decision?.datos?.motivo;
  if (!evento || decision.franja === 'cierre' || (motivo && motivo !== 'evento_ventana')) return null;
  if (evento.categoria === 'golpe_duro') return 'Golpe duro';
  return evento.bifurcacion ? 'Decisión difícil' : 'Pasan cosas';
}

export function crear(contenedor, decisionCompleta, { estado, previa = null, mundo, sonido = null, responder, arte = null, marca = false, limite = null, lateral = null, margen = () => 0 }) {
  // H2a (el mazo): "Otra mano" (la opción `cambio` del motor) no es una carta: la pantalla la pinta como un botón. La mano del
  // año (`datos.motivo`) no muestra descripción, situación ni aviso con %: el número de cada carta es seguro.
  const otra = (decisionCompleta.opciones ?? []).find((o) => o.cambio) ?? null;
  const decision = otra ? { ...decisionCompleta, opciones: decisionCompleta.opciones.filter((o) => !o.cambio) } : decisionCompleta;
  const esMano = ['mano', 'otra_mano'].includes(decision.datos?.motivo);
  const lector = leerDecision(decision, { estado, previa });
  const { forma, esMatriz, disponibles, bloqueadas, lec, variante, previas, chipDePrevia, pDe, riesgoDe } = lector;
  const fx = () => mundo?.fx?.() ?? null;

  // ------------------------------------------------------------------ la cabecera
  const raiz = el('section', { class: 'parada parada-decision cv-raiz', 'data-mano': esMano ? '' : null, 'data-forma': forma, 'data-bisagra': lec.bisagra ? '' : null, 'data-costura': variante });
  const col = el('div', { class: 'cv-col' });
  const rotuloCat = rotuloDeDecision(decision, estado);
  const rotuloTexto = el('span', { class: 'cv-rotulo-txt', text: esMatriz ? 'El plan del año' : rotuloDeEvento(decision) ?? rotuloCat.label });
  const rotulo = el('p', { class: 'cv-rotulo' }, [
    el('i', { class: 'cv-rotulo-luz' }),
    rotuloTexto,
    lec.bisagra ? el('span', { class: 'cv-bisagra', text: 'Decisión bisagra' }) : null,
    esMatriz ? el('span', { class: 'cv-bisagra', text: 'el plan corre solo' }) : null
  ]);
  const titulo = el('h1', { class: 'cv-titulo', id: 'decisionTitle', 'data-foco': '', tabindex: '-1', text: decision.titulo });
  const [primera, resto] = partirDescripcion(decision.descripcion);
  const btnMas = resto ? el('button', { type: 'button', class: 'cv-mas', 'aria-expanded': 'false', text: 'más' }) : null;
  const planteo = el('p', { class: 'cv-planteo', id: 'decisionDesc' }, [el('span', { class: 'cv-planteo-1', text: primera }), resto ? el('span', { class: 'cv-planteo-resto', text: ' ' + resto }) : null, btnMas]);
  btnMas?.addEventListener('click', () => {
    const abrir = !planteo.classList.contains('abierto');
    planteo.classList.toggle('abierto', abrir);
    btnMas.setAttribute('aria-expanded', String(abrir));
    btnMas.textContent = abrir ? 'menos' : 'más';
  });
  // G2b (una carta por año): el color de tu situación (la soloQ sin equipo, el bootcamp, la gaming house de tu org). Lo arma el
  // motor (`systems/edadCierre.js:situacionDeLaCarta`).
  const situacion = decision.situacion?.texto ? el('p', { class: 'cv-situacion', 'data-situacion': decision.situacion.id, text: decision.situacion.texto }) : null;
  planteo.hidden = esMano || !primera;
  const cab = el('header', { class: 'cv-cab' }, [rotulo, titulo, esMano ? null : situacion, planteo]);

  // ------------------------------------------------------------------ el arte (por prioridad: ver la cabecera)
  const ejesMx = esMatriz ? lector.matriz.ejes : [];
  // el campo que domina la opción: en la planilla, el de la mejor ganancia; si no, el primer efecto que sube
  const dominante = (o) => (esMatriz ? lector.matriz.mejorGanancia(o) : (o.previa ?? []).find((p) => p.signo !== '-')?.campo ?? null);
  const textoDe = (o) => [o.label, o.descripcion, ...(o.previa ?? []).map((p) => p.texto)].filter(Boolean).join(' · ');
  // adónde lleva la opción en la bisagra con destino: la liga de destino si te vas (o vas y volvés), tu org si te quedás
  const caminoDe = (o) => (lec.destino ? lec.caminos.find((c) => c.id === o.id)?.camino ?? null : null);
  function arteDe(o, campo) {
    const campeon = campeonesNombrados(textoDe(o))[0];
    if (campeon) return { tipo: 'campeon', clave: campeon };
    const camino = caminoDe(o);
    if (camino === 'ir' || camino === 'viaje') return { tipo: 'liga', liga: lec.destino.id };
    if (camino === 'casa' && lec.casa.org) return { tipo: 'org', org: lec.casa.org };
    if (camino === 'casa' && lec.casa.liga) return { tipo: 'liga', liga: lec.casa.liga };
    return { tipo: 'emblema' };
  }
  const glifoDe = (campo) => (campo ? glifoDeCampo(campo) : null);
  const emblemaDe = (campo, glifo = null, { variante = 0, acento = null } = {}) => emblema(ejeDe(campo), { glifo: glifo ?? glifoDe(campo), variante, acento });
  // el segundo eje que sube en la opción (el acento del emblema repetido), o null
  const segundoEje = (o, eje) => (o.previa ?? []).filter((p) => p.signo !== '-').map((p) => ejeDe(p.campo)).find((e) => e && e !== eje) ?? null;
  // `arte`: lo de `arteDe`, con el `campo` que domina (el color y el emblema) y, en las cerradas, el `glifo` (el candado)
  function ventana(arte) {
    const vineta = el('i', { class: 'cv-arte-vineta' });
    if (arte.tipo === 'emblema') {
      return el('span', { class: 'cv-arte cv-arte-emblema', 'aria-hidden': 'true' }, [emblemaDe(arte.campo, arte.glifo, arte), vineta]);
    }
    if (arte.tipo === 'liga' || arte.tipo === 'org') {
      const nodo = el('span', { class: `cv-arte cv-arte-logo cv-arte-${arte.tipo}`, 'aria-hidden': 'true' }, [
        el('i', { class: 'cv-arte-luz' }),
        arte.tipo === 'liga' ? logoComp(competicionDe({ ficha: { jugador: { liga: arte.liga } } }), { clase: 'cv-logo' }) : logoOrg(arte.org, { clase: 'cv-logo' }),
        vineta
      ]);
      aplicarTono(nodo, arte.tipo === 'liga' ? tonoDestino(arte.liga) : tonoOrg(arte.org));
      return nodo;
    }
    const nodo = el('span', { class: 'cv-arte cv-arte-campeon', 'aria-hidden': 'true' }, [el('i', { class: 'cv-arte-tinte' }), vineta]);
    const img = el('img', { class: 'cv-arte-img', alt: '', decoding: 'async', draggable: 'false' });
    // si el arte no carga, la carta no queda vacía: el emblema de su eje
    img.addEventListener('error', () => img.replaceWith(emblemaDe(arte.campo)), { once: true });
    img.addEventListener('load', () => nodo.classList.add('cv-cargada'), { once: true });
    img.src = urlCentrada(arte.clave);
    nodo.prepend(img);
    return nodo;
  }
  const medallon = (campo, glifo = null) => el('span', { class: 'cv-medallon', 'aria-hidden': 'true' }, el('span', { class: 'cv-medallon-in' }, icono(glifo ?? (campo ? glifoDeCampo(campo) : 'incierto'))));

  // ------------------------------------------------------------------ las piezas del cuerpo
  const descId = (i) => `decision-desc-${i}`;
  const descOculta = (o, i) => el('span', { class: 'solo-lectores', id: descId(i) }, [lector.lectores(o)]);
  function gemas(o) {
    const k = riesgoDe(o);
    if (!k) return null;
    const n = GEMAS[k] ?? GEMAS.incierto;
    return el('span', { class: 'cv-gemas', 'data-riesgo': k, title: o.riesgoTexto ?? o.riesgo }, [
      el('span', { class: 'cv-gemas-fila', 'aria-hidden': 'true' }, [0, 1, 2].map((g) => el('i', { class: g < n ? 'on' : '' }))),
      el('span', { class: 'cv-gemas-nom', text: o.riesgo })
    ]);
  }
  const medidorP = (p) => el('span', { class: 'cv-p', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(porcentaje(p)), 'aria-label': 'Chance' }, [
    el('span', { class: 'cv-p-riel' }, el('i', { style: { width: `${p * 100}%` } })),
    el('b', { text: `${porcentaje(p)}%` })
  ]);
  const tags = (o) => {
    const rara = o.rareza && o.rareza !== 'comun';
    return o.propuesta || rara ? el('span', { class: 'cv-tags' }, [
      rara ? el('span', { class: 'cv-tag cv-tag-rara', text: o.rareza === 'epica' ? 'épica' : o.rareza }) : null,
      o.propuesta ? el('span', { class: 'cv-tag cv-tag-perfil', text: 'Tu perfil' }) : null
    ]) : null;
  };
  // G2a (la carta de El Ídolo): el número seguro de la opción (el piso de su efecto principal, regla de F4) y el riesgo en
  // palabras (⚠: el `aviso` del dato o el peor resultado de su distribución, con su chance). Los arma el motor.
  const seguroDe = (o) => {
    const s = o.seguro;
    if (!s || !Number.isFinite(s.valor)) return null;
    const nombre = lector.nombreDeEje(s.campo);
    return el('span', { class: 'cv-seguro', 'data-signo': s.valor > 0 ? 'sube' : s.valor < 0 ? 'baja' : 'cero', style: estiloEje(ejeDe(s.campo)), title: `${s.etiqueta}: ${s.valor > 0 ? 'lo mínimo que te llevás' : 'lo peor que te puede dejar'}` }, [
      icono(glifoDeCampo(s.campo)),
      el('b', { text: `${conSigno(s.valor)}${s.unidad ? ` ${s.unidad}` : ''}` }),
      el('span', { text: esMano ? nombre : `${nombre} ${s.valor > 0 ? 'seguro' : 'de piso'}` })
    ]);
  };
  // G2b (una carta por año): el costo a la vista, otro stat de la ficha que la carta seguro te baja ("−2 Cabeza").
  const costoDe = (o) => {
    const c = o.costo;
    if (!c || !Number.isFinite(c.valor) || c.valor >= 0) return null;
    return el('span', { class: 'cv-seguro cv-costo', 'data-signo': 'baja', style: estiloEje(ejeDe(c.campo)), title: `${c.etiqueta}: lo que seguro te cuesta (puede ser más)` }, [
      icono(glifoDeCampo(c.campo)),
      el('b', { text: conSigno(c.valor) }),
      el('span', { text: esMano ? lector.nombreDeEje(c.campo) : `${lector.nombreDeEje(c.campo)} de costo` })
    ]);
  };
  const avisoDe = (o) => (o.aviso?.texto ? el('span', { class: 'cv-aviso' }, [
    el('b', { 'aria-hidden': 'true', text: '⚠' }),
    el('span', { text: o.aviso.pct != null ? `${o.aviso.pct}%: ${o.aviso.texto}` : o.aviso.texto })
  ]) : null);
  const planDe = (o) => (o.plan?.texto ? el('span', { class: 'cv-plan' }, [icono('practica'), el('span', { text: o.plan.titulo ?? o.plan.texto })]) : null);
  // la planilla: una fila por eje (el glifo, la barra en su color con la escala de la columna, el número)
  function barras(o) {
    const { stats } = lector.matriz;
    const filas = ejesMx.map((c) => {
      const p = (o.previa ?? []).find((x) => x.campo === c);
      const eje = ejeDe(c);
      if (!p) return el('span', { class: 'cv-mx-fila vacia', 'data-eje': eje, style: estiloEje(eje) }, [icono(glifoDeCampo(c)), el('span', { class: 'cv-mx-riel' }), el('b', { text: '·' })]);
      const ancho = (Math.abs(p.valor) / stats[c].max) * 100;
      return el('span', { class: `cv-mx-fila ${p.signo === '-' ? 'baja' : 'sube'}`, 'data-eje': eje, style: estiloEje(eje), title: p.texto }, [
        icono(glifoDeCampo(c)),
        el('span', { class: 'cv-mx-riel' }, el('i', { style: { width: `${ancho}%` } })),
        el('b', {}, [conSigno(p.valor), campoCorto(c) === 'ranked' ? el('small', { text: ' LP' }) : null])
      ]);
    });
    const marcas = [];
    if (o.semanaDeuda != null) marcas.push(el('span', { class: 'cv-marca', title: `deuda de sueño desde la semana ${o.semanaDeuda}` }, [icono('sleep'), `s${o.semanaDeuda}`]));
    if (o.semanaMentalRoja != null) marcas.push(el('span', { class: 'cv-marca', title: `cabeza en rojo desde la semana ${o.semanaMentalRoja}` }, [icono('mentalidad'), `s${o.semanaMentalRoja}`]));
    if (o.semanaRiesgoFisico != null) marcas.push(el('span', { class: 'cv-marca', title: `riesgo físico desde la semana ${o.semanaRiesgoFisico}` }, [icono('alto'), `s${o.semanaRiesgoFisico}`]));
    const casa = Number.isFinite(o.riesgoCasa) ? porcentaje(o.riesgoCasa) : null;
    return el('span', { class: 'cv-mx' }, [
      ...filas,
      casa != null || marcas.length ? el('span', { class: 'cv-mx-casa' }, [
        casa != null ? el('span', { class: 'cv-casa', title: 'que en casa te saquen la PC en el año' }, [icono('familyTrust'), el('span', { class: 'cv-casa-riel' }, el('i', { style: { width: `${casa}%` } })), el('b', { text: `${casa}%` })]) : null,
        ...marcas
      ]) : null
    ]);
  }

  // ------------------------------------------------------------------ las cartas
  const total = disponibles.length + bloqueadas.length;
  const mano = el('div', { class: 'cv-mano', id: 'decisionOptions', role: 'group', 'aria-label': esMatriz ? 'El plan del año: opciones por eje' : 'Opciones', style: { '--cv-n': String(Math.max(1, total)) } });
  const cartas = [];
  const ranuras = [];
  // H2b: la mano se reparte boca abajo y las cartas se dan vuelta de a una (sin movimiento, nacen boca arriba)
  let repartiendo = esMano && !quieto();
  const timersVuelta = [];
  // dos emblemas iguales en la misma mano (mismo eje y misma stat): el repetido cambia de composición y lleva acento
  const vistos = new Map();
  disponibles.forEach((o, i) => {
    const campo = dominante(o);
    const eje = ejeDe(campo);
    const rara = o.rareza && o.rareza !== 'comun';
    const arte = arteDe(o, campo);
    if (arte.tipo === 'emblema') {
      const clave = `${eje}|${glifoDe(campo)}`;
      arte.variante = vistos.get(clave) ?? 0;
      vistos.set(clave, arte.variante + 1);
      arte.acento = arte.variante ? segundoEje(o, eje) : null;
    }
    const cuerpo = el('span', { class: 'cv-cuerpo' }, [
      tags(o),
      el('span', { class: 'cv-label', text: o.label }),
      // G2a: la línea de pista (la primera oración) se ve siempre; la descripción entera, en textos completos
      !esMatriz && o.descripcion ? el('span', { class: 'cv-pista', 'aria-hidden': 'true', text: primeraOracion(o.descripcion) }) : null,
      o.descripcion ? el('span', { class: 'cv-desc', text: o.descripcion }) : null,
      esMatriz ? null : seguroDe(o),
      esMatriz ? null : costoDe(o),
      esMatriz ? barras(o) : (o.previa ?? []).length > (esMano ? 1 : 0) ? el('span', { class: 'eje-chips cv-chips' }, o.previa.map(chipDePrevia)) : null,
      esMatriz || esMano ? null : avisoDe(o),
      esMano ? null : planDe(o),
      el('span', { class: 'cv-pie' }, esMano ? [] : [gemas(o), pDe(o) != null ? medidorP(pDe(o)) : null])
    ]);
    const b = el('button', { type: 'button', class: `opcion cv-carta${esMano ? ` cv-r-${o.rareza ?? 'comun'}` : rara ? ' cv-rara' : ''}`, 'data-atajo': i < 4 ? String(i + 1) : null, 'data-id': o.id, 'data-eje': eje, 'data-arte': arte.tipo, 'aria-describedby': descId(i), style: estiloEje(eje) }, [
      el('span', { class: 'cv-marco', 'aria-hidden': 'true' }),
      el('span', { class: 'cv-cara' }, [
        ventana({ ...arte, campo }),
        arte.tipo === 'emblema' ? null : medallon(campo),
        cuerpo,
        el('span', { class: 'op-tecla cv-tecla', 'aria-hidden': 'true', text: String(i + 1) })
      ]),
      el('span', { class: 'cv-brillo', 'aria-hidden': 'true' }),
      el('span', { class: 'cv-destello', 'aria-hidden': 'true' }),
      descOculta(o, i)
    ]);
    cartas.push(b);
    const ranura = el('div', { class: `cv-ranura${esMano ? ` cv-r-${o.rareza ?? 'comun'}` : ''}` }, [el('i', { class: 'cv-halo', 'aria-hidden': 'true', style: estiloEje(eje) }), b]);
    if (repartiendo) ranura.append(el('span', { class: 'cv-reverso', 'aria-hidden': 'true' }, el('i')));
    ranuras.push(ranura);
    mano.append(ranura);
  });
  // Las cerradas se ven, con su candado y su motivo, y no se eligen.
  bloqueadas.forEach((bq, k) => {
    const b = el('div', { class: 'opcion bloqueada cv-carta cv-cerrada', tabindex: '0', 'aria-disabled': 'true', 'data-gate': bq.gate ?? '' }, [
      el('span', { class: 'cv-marco', 'aria-hidden': 'true' }),
      el('span', { class: 'cv-cara' }, [
        ventana({ tipo: 'emblema', campo: null, glifo: 'candado' }),
        el('span', { class: 'cv-cuerpo' }, [el('span', { class: 'cv-label', text: bq.label }), el('span', { class: 'cv-gate' }, [el('b', { text: 'Cerrada' }), bq.gate ? ` · ${bq.gate}` : ''])])
      ]),
      el('span', { class: 'solo-lectores', text: `Cerrada: ${bq.gate ?? ''}` })
    ]);
    b.dataset.cerrada = String(k);
    cartas.push(b);
    const ranura = el('div', { class: 'cv-ranura' }, [el('i', { class: 'cv-halo', 'aria-hidden': 'true' }), b]);
    ranuras.push(ranura);
    mano.append(ranura);
  });

  // La marca de agua (P2, §0.5; `marca`: sin campeón detrás y sin costura): en las pantallas anchas la mitad derecha
  // quedaba muerta. Va el emblema del eje que más domina la mano, enorme y tenue, detrás de todo (decision-cartas.css).
  let fondo = null;
  if (marca) {
    const cuenta = new Map();
    for (const o of disponibles) {
      const c = dominante(o);
      const e = ejeDe(c);
      if (e) cuenta.set(e, { n: (cuenta.get(e)?.n ?? 0) + 1, campo: cuenta.get(e)?.campo ?? c });
    }
    const [ejeFondo, dato] = [...cuenta].reduce((a, b) => (b[1].n > a[1].n ? b : a), [null, { n: 0, campo: null }]);
    if (ejeFondo) fondo = el('div', { class: 'cv-fondo', 'aria-hidden': 'true', 'data-eje': ejeFondo, style: estiloEje(ejeFondo) }, emblemaDe(dato.campo));
  }

  // la leyenda de la planilla: el glifo, el nombre y el valor de hoy de cada eje
  let leyenda = null;
  if (esMatriz) {
    const { referente } = lector.matriz;
    leyenda = el('div', { class: 'cv-leyenda', 'aria-hidden': 'true' }, [
      el('span', { class: 'cv-leyenda-rot', text: 'Hoy · por semana' }),
      ...ejesMx.map((c) => el('span', { class: 'cv-leyenda-eje', 'data-eje': ejeDe(c), style: estiloEje(ejeDe(c)) }, [
        icono(glifoDeCampo(c)),
        el('span', { text: lector.nombreDeEje(c) }),
        referente[c] != null ? el('b', { text: typeof referente[c] === 'number' ? num(referente[c]) : String(referente[c]) }) : null
      ]))
    ]);
  }

  // ------------------------------------------------------------------ la banda: la prosa de la apuntada
  const inspector = el('div', { class: 'cv-inspector', 'aria-live': 'polite' });
  let apuntada = 0;
  let elegido = false;
  function pintarInspector(i, destino = inspector) {
    const f = cartas[i];
    if (!f) return;
    destino.textContent = '';
    if (f.classList.contains('bloqueada')) {
      destino.append(el('p', { class: 'cv-insp-kicker' }, [icono('candado'), 'Cerrada']), el('p', { class: 'cv-insp-texto', text: f.dataset.gate }));
      return;
    }
    const o = disponibles[i];
    destino.append(
      el('div', { class: 'cv-insp-prosa' }, [
        el('p', { class: 'cv-insp-kicker' }, [el('span', { class: 'cv-insp-n', text: String(i + 1) }), o.label]),
        el('p', { class: 'cv-insp-texto', text: o.descripcion ?? '' })
      ]),
      el('ul', { class: 'cv-insp-lista' }, [
        ...(o.previa ?? []).map((p) => el('li', { class: p.signo === '-' ? 'baja' : 'sube', 'data-eje': ejeDe(p.campo), style: estiloEje(ejeDe(p.campo)) }, [icono(glifoDeCampo(p.campo)), p.texto])),
        o.riesgoTexto ? el('li', { class: 'cv-insp-riesgo', 'data-riesgo': riesgoDe(o) }, [icono(RIESGO[o.riesgo] ?? 'incierto'), o.riesgoTexto]) : null,
        previas[o.id]?.texto ? el('li', { class: 'cv-insp-p' }, [icono('rendimiento'), previas[o.id].texto]) : null,
        o.propuesta ? el('li', { class: 'cv-insp-perfil' }, [icono('hype'), o.propuesta]) : null,
        lineaDelPlan(o)
      ])
    );
  }
  // el plan que fija la opción (el cierre), tal cual lo escribe el motor (K4c-P)
  function lineaDelPlan(opcion) {
    return opcion.plan?.texto ? el('li', { class: 'cv-insp-plan' }, [icono('practica'), opcion.plan.texto]) : null;
  }
  function apuntar(i, mover = false, usuario = false) {
    const antes = apuntada;
    apuntada = Math.max(0, Math.min(cartas.length - 1, i));
    cartas.forEach((f, k) => f.classList.toggle('apuntada', k === apuntada));
    ranuras.forEach((r, k) => r.classList.toggle('cv-arriba', k === apuntada));
    if (antes !== apuntada || !inspector.childElementCount) pintarInspector(apuntada);
    if (usuario) mano.dataset.activa = '';
    if (mover) {
      cartas[apuntada].focus({ preventScroll: true });
      if (celular()) ranuras[apuntada].scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: quieto() ? 'auto' : 'smooth' });
    }
    if (usuario && !elegido) capa?.apuntar(apuntada);
  }
  function soltar() {
    delete mano.dataset.activa;
    cartas.forEach((c) => {
      c.style.removeProperty('--cv-rx');
      c.style.removeProperty('--cv-ry');
    });
  }

  // apuntar con el mouse (con la inclinación), con el foco o con el dedo (el primer toque apunta, el segundo elige)
  let puntero = null;
  cartas.forEach((f, i) => {
    f.addEventListener('pointerdown', (e) => {
      puntero = e.pointerType;
    });
    f.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch' || elegido) return;
      if (i !== apuntada || mano.dataset.activa == null) fx()?.pulso?.('apuntar');
      apuntar(i, false, true);
    });
    f.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || elegido || quieto()) return;
      const r = f.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      f.style.setProperty('--cv-rx', `${(-py * 2 * INCLINACION).toFixed(2)}deg`);
      f.style.setProperty('--cv-ry', `${(px * 2 * INCLINACION).toFixed(2)}deg`);
      f.style.setProperty('--cv-mx', `${((px + 0.5) * 100).toFixed(1)}%`);
    });
    f.addEventListener('pointerleave', () => {
      f.style.removeProperty('--cv-rx');
      f.style.removeProperty('--cv-ry');
    });
    f.addEventListener('focus', () => {
      if (!elegido) apuntar(i, false, true);
    });
    if (!f.classList.contains('bloqueada')) {
      f.addEventListener('click', (e) => {
        // un toque real (no el atajo del teclado, que llega con detail 0) sobre una carta que no es la apuntada: apunta
        if (e.detail > 0 && puntero === 'touch' && i !== apuntada) {
          fx()?.pulso?.('apuntar');
          apuntar(i, true, true);
          return;
        }
        elegir(i);
      });
    }
  });
  mano.addEventListener('pointerleave', () => {
    if (elegido || mano.contains(document.activeElement)) return;
    soltar();
    capa?.soltar();
  });
  // el carrusel del celular: la carta que queda en el medio es la apuntada
  let cuadroScroll = 0;
  const alScroll = () => {
    if (elegido || cuadroScroll || !celular()) return;
    cuadroScroll = requestAnimationFrame(() => {
      cuadroScroll = 0;
      const m = mano.getBoundingClientRect();
      const medio = m.left + m.width / 2;
      let mejor = apuntada;
      let dist = Infinity;
      ranuras.forEach((r, k) => {
        const b = r.getBoundingClientRect();
        const d = Math.abs(b.left + b.width / 2 - medio);
        if (d < dist) {
          dist = d;
          mejor = k;
        }
      });
      if (mejor !== apuntada) apuntar(mejor, false, true);
    });
  };
  mano.addEventListener('scroll', alScroll, { passive: true });

  const cuerpoPanel = el('div', { class: 'cv-cuerpo-panel' }, [leyenda, mano, inspector]);
  col.append(cab, cuerpoPanel);
  // H2a: "Otra mano (quedan N)": vuelve a repartir (el motor encadena la decisión con `motivo: 'otra_mano'`), sin elegir carta.
  if (otra) {
    const botonOtra = el('button', { type: 'button', class: 'cv-otra', text: `${otra.label} (quedan ${otra.quedan})` });
    botonOtra.addEventListener('click', () => {
      if (repartiendo) { terminarReparto(); return; }
      if (elegido) return;
      elegido = true;
      raiz.classList.add('eligiendo');
      sonido?.clic?.();
      responder({ opcionId: otra.id });
    });
    col.append(botonOtra);
  }
  raiz.append(col);

  // ------------------------------------------------------------------ la costura (con destino): el bloque de `crearDecision`
  let capa = null;
  if (variante) {
    capa = crearCostura(lec, {
      mundo, arte, sonido, equiposDe: equiposDelMundo(estado), contenedor: raiz, limite, lateral, margen, variante,
      alAceptar: (o) => abrirPanel(o)
    });
    raiz.prepend(capa.nodo, capa.banda);
    if (lec.aviso) raiz.classList.add('dc-espera');
  }

  if (fondo) raiz.prepend(fondo);
  contenedor.replaceChildren(raiz);
  apuntar(0);
  // La banda cambia de alto con la carta apuntada: se reserva el alto de la más alta, medido en un clon fuera del árbol
  // accesible (el vivo es `aria-live` y no se repinta para medir: ver `crearDecision`).
  function fijarAltoDelInspector() {
    if (!raiz.isConnected || elegido) return;
    inspector.style.minHeight = '';
    const ancho = inspector.offsetWidth;
    let alto = 0;
    if (ancho > 0) {
      const medida = inspector.cloneNode(false);
      medida.removeAttribute('aria-live');
      medida.setAttribute('aria-hidden', 'true');
      Object.assign(medida.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', left: '0', top: '0', width: `${ancho}px`, minHeight: '' });
      inspector.parentNode.append(medida);
      cartas.forEach((_, i) => {
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
  const vigiaDeTextos = typeof MutationObserver === 'function' ? new MutationObserver(fijarAltoDelInspector) : null;
  vigiaDeTextos?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-textos'] });

  // ------------------------------------------------------------------ la entrada: el reparto
  function entradaPanel(d = 0) {
    entrar(rotulo, T.rotulo + d, 10);
    lineasConMascara(titulo).forEach((l, i) => animar(l, [{ transform: 'translateY(105%)' }, { transform: 'none' }], { delay: T.titulo + d + i * T.tituloPaso, dur: DUR.larga }));
    entrar(planteo, T.planteo + d, 10);
    if (leyenda) {
      entrar(leyenda, T.leyenda + d, 8);
      leyenda.querySelectorAll('.cv-leyenda-eje').forEach((x, k) => animar(x, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: T.leyenda + 60 + d + k * T.chipPaso, dur: DUR.entra }));
    }
    ranuras.forEach((r, i) => {
      const t = T.cartas + d + i * T.paso;
      animar(r, [
        { opacity: 0, transform: `perspective(900px) translateY(${REPARTO.y}px) rotateX(${REPARTO.rotX}deg) scale(${REPARTO.escala})` },
        { opacity: 1, offset: 0.35 },
        { opacity: 1, transform: 'none' }
      ], { delay: t, dur: T.carta, easing: RESORTE });
      animar(r.querySelector('.cv-medallon'), [{ transform: 'translateX(-50%) scale(0) rotate(-60deg)' }, { transform: 'translateX(-50%) scale(1.18) rotate(0deg)', offset: 0.6 }, { transform: 'translateX(-50%)' }], { delay: t + T.medallon, dur: T.medallonDur, easing: EXPO });
      animar(r.querySelector('.cv-emb-nucleo'), [{ opacity: 0, transform: 'scale(0.55) rotate(-30deg)' }, { opacity: 1, transform: 'scale(1.1) rotate(0deg)', offset: 0.6 }, { transform: 'none' }], { delay: t + T.medallon, dur: T.medallonDur, easing: EXPO });
      animar(r.querySelector('.cv-emb-patron'), [{ opacity: 0 }, { opacity: 1 }], { delay: t + T.medallon, dur: T.carta });
      r.querySelectorAll('.cv-chips .eje-chip, .cv-mx-fila, .cv-gemas, .cv-p, .cv-tag').forEach((g, k) => animar(g, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { delay: t + T.chips + k * T.chipPaso, dur: DUR.entra }));
      r.querySelectorAll('.cv-mx-riel i').forEach((b, k) => animar(b, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: t + T.chips + k * T.chipPaso, dur: T.carta }));
    });
    entrar(inspector, T.inspector + d + ranuras.length * T.paso, 8);
    if (repartiendo) programarVueltas(d);
  }
  // H2b: cada carta se da vuelta con el brillo de su rareza (rara azul, épica violeta, legendaria dorada con chispas); la
  // legendaria va última, después de una pausa. Cualquier clic o tecla antes de que termine las da vuelta a todas de golpe.
  const rarezaDe = (i) => disponibles[i]?.rareza ?? 'comun';
  function voltear(i) {
    const r = ranuras[i];
    const rev = r?.querySelector('.cv-reverso');
    if (!rev) return;
    const rz = rarezaDe(i);
    animar(rev, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { dur: T.giroDorso, easing: 'ease-in', fill: 'forwards' });
    animar(cartas[i], [{ transform: 'scaleX(0)' }, { transform: 'none' }], { delay: T.giroDorso, dur: T.giroDorso * 1.6, easing: EXPO });
    timersVuelta.push(setTimeout(() => {
      rev.remove();
      if (rz === 'comun') return;
      const brote = el('i', { class: 'cv-brote', 'aria-hidden': 'true' });
      r.append(brote);
      animar(brote, [{ opacity: 0.9, transform: 'scale(0.7)' }, { opacity: 0, transform: 'scale(1.35)' }], { dur: T.brote, easing: 'ease-out', forzar: true });
      timersVuelta.push(setTimeout(() => brote.remove(), T.brote));
      if (rz === 'legendaria') {
        for (let c = 0; c < T.chispas; c++) {
          const ang = (c / T.chispas) * Math.PI * 2 + 0.4;
          const dist = T.chispaDist * (c % 2 ? 1 : 0.6);
          const chispa = el('i', { class: 'cv-chispa', 'aria-hidden': 'true' });
          r.append(chispa);
          animar(chispa, [{ opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }, { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(0.2)` }], { dur: T.brote, easing: 'ease-out', forzar: true });
          timersVuelta.push(setTimeout(() => chispa.remove(), T.brote));
        }
      }
    }, T.giroDorso));
    if (rz === 'legendaria') {
      sonido?.golpe?.();
      timersVuelta.push(setTimeout(() => sonido?.flash?.(), T.giroDorso));
    } else sonido?.[rz === 'comun' ? 'clic' : 'ding']?.();
  }
  function terminarReparto() {
    if (!repartiendo) return;
    repartiendo = false;
    timersVuelta.splice(0).forEach(clearTimeout);
    ranuras.forEach((r) => {
      r.querySelectorAll('.cv-reverso, .cv-brote, .cv-chispa').forEach((x) => x.remove());
    });
    cartas.forEach((c) => c.getAnimations?.().forEach((a) => a.finish?.()));
  }
  function programarVueltas(d) {
    const orden = ranuras.map((_, i) => i).sort((a, b) => (rarezaDe(a) === 'legendaria') - (rarezaDe(b) === 'legendaria') || a - b);
    let t = T.cartas + d + ranuras.length * T.paso + T.carta + T.pausaVuelta;
    orden.forEach((i, k) => {
      const leg = rarezaDe(i) === 'legendaria';
      if (leg && k > 0) t += T.pausaLegendaria;
      timersVuelta.push(setTimeout(() => { if (raiz.isConnected) voltear(i); }, t));
      t += leg ? T.vueltaLegendaria : T.vuelta;
    });
    timersVuelta.push(setTimeout(() => { repartiendo = false; }, t));
  }
  function abrirPanel({ instantaneo = false } = {}) {
    raiz.classList.remove('dc-espera');
    if (quieto() || instantaneo) {
      terminarReparto();
      if (!elegido) titulo.focus({ preventScroll: true });
      return;
    }
    entradaPanel(capa.retardoAceptar);
    esperar(raiz, capa.focoAceptar).then(() => {
      if (!elegido && raiz.isConnected) titulo.focus({ preventScroll: true });
    });
  }
  capa?.entrar();
  if (!lec.aviso && !quieto()) entradaPanel();

  // ------------------------------------------------------------------ elegir: el destello y la quema
  let respuesta = null;
  function elegir(i) {
    if (elegido) return;
    if (repartiendo) { terminarReparto(); return; }
    const o = disponibles[i];
    const carta = cartas[i];
    if (!o || !carta || carta.classList.contains('bloqueada')) return;
    if (capa?.avisoAbierto) capa.aceptarYa();
    apuntar(i);
    elegido = true;
    raiz.classList.add('eligiendo');
    carta.setAttribute('aria-pressed', 'true');
    carta.style.removeProperty('--cv-rx');
    carta.style.removeProperty('--cv-ry');
    animar(carta.querySelector('.cv-destello'), [{ opacity: 0 }, { opacity: 0.9, offset: 0.35 }, { opacity: 0 }], { dur: T.destello * 2, easing: 'linear', forzar: true });
    animar(ranuras[i], [{ transform: 'none' }, { transform: 'translateY(-16px) scale(1.03)', offset: 0.4 }, { transform: 'none' }], { dur: T.salto, easing: EXPO });
    let k = 0;
    cartas.forEach((c, j) => {
      if (j === i) return;
      quemar(c, { retardo: T.quema * k, sonido: k === 0 ? sonido : null });
      k++;
    });
    fx()?.pulso?.('elegir');
    sonido?.clic?.();
    const tono = capa?.elegir(i) ?? null;
    if (tono) mundo?.tenir?.(tono);
    respuesta = { i, o };
    // H2b: la legendaria elegida tiene su momento dorado antes de que el año siga
    if (esMano && o.rareza === 'legendaria' && !quieto()) {
      const sg = o.seguro;
      mostrarLegendaria({ valor: sg && Number.isFinite(sg.valor) ? conSigno(sg.valor) : '', stat: sg ? lector.nombreDeEje(sg.campo) : '', titulo: o.label }, { sonido })
        .then(() => responder({ opcionId: o.id }), () => responder({ opcionId: o.id }));
      return;
    }
    responder({ opcionId: o.id });
  }

  // Las flechas mueven lo apuntado (el foco); 1-4 los pone el teclado del shell (`data-atajo`).
  raiz.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || elegido) return;
    const paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!paso || !mano.contains(document.activeElement)) return;
    e.preventDefault();
    apuntar(apuntada + paso, true, true);
  });

  // ------------------------------------------------------------------ narrar: la carta gira y su dorso es "lo que pasó"
  async function narrar(ctx) {
    if (!respuesta || !raiz.isConnected) return 0;
    const { i, o } = respuesta;
    const inm = ctx.inmediato?.() ?? null;
    const { tarjeta, cambios, contados } = tarjetaDelResultado(o, i + 1, inm, ctx.logs ?? [], { estado, lector });
    const eje = cartas[i].dataset.eje || null;
    tarjeta.classList.add('cv-resultado');
    if (eje) {
      tarjeta.dataset.eje = eje;
      for (const [k, v] of Object.entries(estiloEje(eje))) tarjeta.style.setProperty(k, v);
    }
    const dorso = medallon(dominante(o));
    dorso.classList.add('cv-dorso');
    const narracion = crearNarracion(ctx, [raiz]);
    try {
      // lo que se va: un fantasma de la mano y de la banda (en su lugar) y lo real se pliega ya
      const c0 = col.getBoundingClientRect();
      const r0 = ranuras[i].getBoundingClientRect();
      const capaFantasma = el('div', { class: 'cv-fantasma', 'aria-hidden': 'true' });
      const fantasmaDe = (n) => {
        const r = n.getBoundingClientRect();
        const c = n.cloneNode(true);
        c.removeAttribute('id');
        c.removeAttribute('aria-live');
        c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
        Object.assign(c.style, { position: 'absolute', left: `${r.left - c0.left}px`, top: `${r.top - c0.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: '0' });
        capaFantasma.append(c);
        return c;
      };
      const scroll = mano.scrollLeft;
      const fMano = fantasmaDe(mano);
      const fOtros = [inspector, leyenda].filter(Boolean).map(fantasmaDe);
      mano.replaceWith(tarjeta);
      inspector.classList.add('cv-plegado');
      leyenda?.classList.add('cv-plegado');
      rotuloTexto.textContent = 'Lo que pasó';
      col.append(capaFantasma);
      fMano.scrollLeft = scroll;
      // El escenario está apoyado abajo: la columna conserva su alto mientras la carta gira (nada salta debajo del
      // fantasma) y se acomoda a la tarjeta cuando se abre.
      const natural = col.offsetHeight;
      animar(col, [{ minHeight: `${c0.height}px` }, { minHeight: `${c0.height}px`, offset: (T.viaje + T.giro) / (T.viaje + T.giro + T.abre) }, { minHeight: `${natural}px` }], { dur: T.viaje + T.giro + T.abre, easing: 'linear' });
      const c1 = col.getBoundingClientRect();
      Object.assign(capaFantasma.style, { left: `${c0.left - c1.left}px`, top: `${c0.top - c1.top}px` });
      const r1 = tarjeta.getBoundingClientRect();

      const vivas = [];
      [...fMano.children].forEach((r, k) => {
        if (k === i) {
          const dx = r1.left + r1.width / 2 - (r0.left + r0.width / 2);
          // la tarjeta gira desde su borde de arriba (`transform-origin` en la hoja): la carta llega ahí y nunca pisa el planteo
          const dy = r1.top - r0.top;
          vivas.push(animar(r, [
            { transform: `perspective(${PERSPECTIVA_GIRO}px) translate(0, 0) rotateY(0deg)` },
            { transform: `perspective(${PERSPECTIVA_GIRO}px) translate(${dx}px, ${dy}px) rotateY(90deg)` }
          ], { dur: T.viaje, easing: SALE, fill: 'forwards' }));
          return;
        }
        vivas.push(animar(r, [{ opacity: 1, transform: 'none', filter: 'none' }, { opacity: 0, transform: 'translateY(48px) scale(.94)', filter: 'blur(8px)' }], { dur: T.disolver, easing: SALE, fill: 'forwards' }));
      });
      fOtros.forEach((f) => vivas.push(animar(f, [{ opacity: 1 }, { opacity: 0 }], { dur: DUR.sale, easing: 'linear', fill: 'forwards' })));
      const sigue = vivas.filter(Boolean);
      if (sigue.length) Promise.allSettled(sigue.map((a) => a.finished)).then(() => capaFantasma.remove());
      else capaFantasma.remove();

      // el dorso: la tarjeta entra de canto, del tamaño de la carta, termina el giro y se abre a lo ancho
      const sx = r1.width > 0 ? r0.width / r1.width : 1;
      const sy = r1.height > 0 ? r0.height / r1.height : 1;
      const p = `perspective(${PERSPECTIVA_GIRO}px)`;
      const total = T.giro + T.abre;
      animar(tarjeta, [
        { transform: `${p} rotateY(-90deg) scale(${sx}, ${sy})`, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
        { transform: `${p} rotateY(0deg) scale(${sx}, ${sy})`, offset: T.giro / total, easing: EXPO },
        { transform: `${p} rotateY(0deg) scale(1, 1)` }
      ], { delay: T.viaje, dur: total, easing: 'linear' });
      animarResultado(tarjeta, { desde: T.viaje + T.giro + T.contenido });
      // el dorso entra después de `animarResultado` (que anima la entrada de cada hijo de la tarjeta): solo se ve en el giro
      tarjeta.append(dorso);
      animar(dorso, [{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { delay: T.viaje, dur: total, easing: 'linear' });
      const desde = T.viaje + T.giro + T.contenido;
      animar(tarjeta.querySelector('.res-cab'), [{ opacity: 0 }, { opacity: 1 }], { delay: desde - T.giro / 2, dur: DUR.entra });
      if (reducido()) animar(tarjeta, [{ opacity: 0 }, { opacity: 1 }], { dur: FUNDIDO_MS, easing: 'linear', forzar: true });
      for (const nodo of ctx.rodarPlaca?.(cambios, desde + T_RESULTADO.numeros + 100) ?? []) narracion.incluir(nodo);
      narracion.esperar(desde + T_RESULTADO.pulso).then(() => fx()?.pulso?.(pulsoDelResultado(cambios)));
      tarjeta.focus({ preventScroll: true });
      await narracion.vistazo();
      await narracion.esperar(desde + T_RESULTADO.sostener);
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
      mano.removeEventListener('scroll', alScroll);
      if (cuadroScroll) cancelAnimationFrame(cuadroScroll);
      vigiaDeTextos?.disconnect();
      capa?.destruir();
    }
  };
}

