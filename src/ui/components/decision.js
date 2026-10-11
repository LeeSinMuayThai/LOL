// La decisión (PLANUI U2a): franjas con glifos, un inspector y, en la bisagra, la costura del ambiente.
// El resultado de la elegida lo transforma el envoltorio de `revelar` (no se llama startViewTransition acá).
import { pesoDeDecision, rotuloDeDecision, contextoDeBisagra, esMatrizDePlan } from '../formatoUi.js';
import { icono, triangulos, glifoDeCampo, ABREVIATURA } from '../fx/iconos.js';
import { escalonar } from '../fx/movimiento.js';
import { quieto } from '../fx/util.js';
import { tonoDestino, tonoCompeticion, tonoEra, aplicarTono } from '../fx/tono.js';
import { pintarLogo, equiposDe } from '../fx/logos.js';
import { crearTrofeo, copaDe, COPAS } from '../fx/trofeo.js';
import { keyDdragonDeCampeon } from './campeonTile.js';

const MAX_CHIPS = 3;
const MIN_LINEA_EN_JUEGO = 60;
const RANGO_MAGNITUD = { alta: 3, media: 2, baja: 1 };
const FIN_DE_ORACION = /[.!?…]["”»)]*(?=\s+[A-ZÁÉÍÓÚÜÑ¿¡"“«(])/g;
const RIESGO_ICONO = { seguro: 'seguro', incierto: 'incierto', ruleta: 'ruleta', alto: 'alto' };
const RIESGO_CORTO = { seguro: 'seguro', incierto: 'incierto', ruleta: 'ruleta', alto: 'alto' };

function quedaAbierto(corte) {
  const cuenta = (re) => (corte.match(re) ?? []).length;
  return cuenta(/"/g) % 2 === 1 || cuenta(/“/g) > cuenta(/”/g) || cuenta(/«/g) > cuenta(/»/g) || cuenta(/\(/g) > cuenta(/\)/g);
}

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

export function elegirChips(previa) {
  const indice = previa.map((entrada, i) => ({ entrada, i }));
  indice.sort((a, b) => (RANGO_MAGNITUD[b.entrada.magnitud] ?? 0) - (RANGO_MAGNITUD[a.entrada.magnitud] ?? 0) || a.i - b.i);
  return new Set(indice.slice(0, MAX_CHIPS).map((x) => x.entrada));
}

function sr(texto) {
  const n = document.createElement('span');
  n.className = 'dc-sr';
  n.textContent = texto ?? '';
  return n;
}

function kickerDe(entrada) {
  const signo = entrada.signo === '+' ? 'sube' : 'baja';
  const kicker = document.createElement('span');
  kicker.className = `option-previa-kicker option-previa-kicker--${signo} option-previa-kicker--magnitud-${entrada.magnitud}`;
  const clave = glifoDeCampo(entrada.campo);
  kicker.append(
    icono(clave, { clase: 'ln-ico dc-eje' }),
    triangulos(entrada.magnitud, entrada.signo === '+' ? '+' : '-')
  );
  const nom = document.createElement('span');
  nom.className = 'dc-eje-nom';
  nom.textContent = ABREVIATURA[clave] ?? entrada.etiqueta ?? '';
  kicker.append(nom, sr(entrada.texto ?? `${entrada.signo} ${entrada.etiqueta}`));
  return kicker;
}

function ejesDe(decision) {
  const vistos = [];
  const set = new Set();
  for (const op of decision.opciones ?? []) {
    for (const p of op.previa ?? []) {
      const c = p.campo || p.etiqueta;
      if (!c || set.has(c)) continue;
      set.add(c);
      vistos.push(c);
    }
  }
  return vistos;
}

function ladoDeOpcion(opcion, decision) {
  if (opcion?.id === 'retirarse' || opcion?.id === 'dejar') return 'b';
  const cruda = decision?.datos?.evento?.options?.find((o) => o.id === opcion?.id);
  for (const out of cruda?.outcomes ?? []) {
    if ((out?.effects ?? []).some((ef) => ef?.type === 'ofertaDeImport')) return 'b';
  }
  return 'a';
}

let capa = null;
let copasVivas = [];
let raf = 0;
let generacion = 0;
let sesion = null;
let vigila = false;

function soltarCapa() {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
  raf = 0;
  for (const c of copasVivas) c.destruir?.();
  copasVivas = [];
  capa?.remove();
  capa = null;
  sesion = null;
}

function limpiarCostura() {
  soltarCapa();
  const fx = globalThis.__fx;
  fx?.ambiente?.({ costura: null });
  const pieza = document.querySelector('.shell')?.dataset.pieza;
  if (pieza && pieza !== 'inicio') fx?.fondo?.({ contexto: 'juego', escena: null });
}

function vigilarPieza() {
  if (vigila || typeof document === 'undefined') return;
  vigila = true;
  const shell = document.querySelector('.shell');
  if (!shell) return;
  const obs = new MutationObserver(() => {
    const p = shell.dataset.pieza;
    if (p !== 'decision' && p !== 'partido') limpiarCostura();
  });
  obs.observe(shell, { attributes: true, attributeFilter: ['data-pieza'] });
}

function seguir(fx) {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
  const paso = () => {
    const g = fx.costura?.() ?? {};
    if (capa) {
      capa.style.setProperty('--dc-x', String(g.posicion ?? 0.5));
      capa.dataset.vertical = g.vertical ? 'si' : 'no';
    }
    if (!quieto()) raf = requestAnimationFrame(paso);
  };
  paso();
}

function ligaInfo(state, id) {
  return (state?.mundo?.ligas ?? []).find((l) => String(l.id) === String(id)) ?? { id, nombre: String(id ?? ''), region: '' };
}

function ladoLiga(id, state, marca) {
  const info = ligaInfo(state, id);
  const nodo = document.createElement('div');
  nodo.className = 'dc-lado';
  nodo.dataset.lado = marca;
  const tono = tonoDestino(id);
  aplicarTono(nodo, tono);
  nodo.appendChild(pintarLogo(info.nombre || id, { tam: 96, liga: true, alt: '' }));
  const lugar = document.createElement('p');
  lugar.className = 'dc-lugar';
  const nom = document.createElement('b');
  nom.textContent = info.nombre || String(id ?? '');
  const reg = document.createElement('span');
  reg.textContent = info.region || '';
  lugar.append(nom, reg);
  nodo.appendChild(lugar);
  const equipos = equiposDe(id);
  if (equipos.length) {
    const pared = document.createElement('ul');
    pared.className = 'dc-pared';
    const tuyo = state?.career?.currentOrg;
    for (const eq of equipos) {
      const li = document.createElement('li');
      if (tuyo && String(eq.nombre).toLowerCase() === String(tuyo).toLowerCase()) li.className = 'dc-tuyo';
      li.appendChild(pintarLogo(eq.nombre, { tam: 28, alt: '' }));
      pared.appendChild(li);
    }
    nodo.appendChild(pared);
  }
  if (marca === 'a' && state?.career?.currentOrg) {
    const marcaEl = document.createElement('p');
    marcaEl.className = 'dc-marca';
    marcaEl.textContent = state.career.currentOrg;
    nodo.appendChild(marcaEl);
  }
  return { nodo, tono };
}

function idCopaDeLiga(id) {
  const k = String(id ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return COPAS[k] ? k : null;
}

function ladoCopa(id, marca) {
  const nodo = document.createElement('div');
  nodo.className = 'dc-lado dc-lado-copa';
  nodo.dataset.lado = marca;
  const t = tonoCompeticion(id);
  aplicarTono(nodo, t);
  const canvas = document.createElement('canvas');
  canvas.className = 'dc-copa-lienzo';
  canvas.width = 180;
  canvas.height = 260;
  const copa = crearTrofeo(canvas, { ...copaDe(id), tonos: { luz: t.luz, contra: t.contra, noche: t.noche } });
  copasVivas.push(copa);
  nodo.appendChild(copa.nodo);
  const placa = document.createElement('p');
  placa.className = 'dc-lugar';
  placa.appendChild(pintarLogo(id, { tam: 36, liga: true, alt: '' }));
  nodo.appendChild(placa);
  return { nodo, tono: tonoDestino(id) };
}

function montarCostura(ctx, decision, state, fx) {
  soltarCapa();
  const shell = document.querySelector('.shell');
  if (!shell) return;
  const era = document.documentElement.dataset.era || 'pieza';
  let arte = null;
  let tonoA = tonoEra(era);
  let tonoB = tonoA;
  if (ctx.variante === 'liga') {
    arte = null;
    capa = document.createElement('div');
    capa.className = 'dc-costura';
    capa.setAttribute('aria-hidden', 'true');
    const a = ladoLiga(ctx.a, state, 'a');
    const b = ladoLiga(ctx.b, state, 'b');
    tonoA = a.tono;
    tonoB = b.tono;
    capa.append(a.nodo, b.nodo);
    shell.appendChild(capa);
  } else if (ctx.variante === 'copas') {
    arte = null;
    capa = document.createElement('div');
    capa.className = 'dc-costura';
    capa.setAttribute('aria-hidden', 'true');
    const idA = idCopaDeLiga(state?.career?.liga) ?? ctx.a;
    const a = ladoCopa(idA, 'a');
    const b = ladoCopa(ctx.b, 'b');
    tonoA = a.tono;
    tonoB = b.tono;
    capa.append(a.nodo, b.nodo);
    shell.appendChild(capa);
  } else {
    arte = keyDdragonDeCampeon(state?.player?.championPool?.[0]?.name);
  }
  sesion = ctx;
  fx.fondo?.({ contexto: 'juego', escena: 'costura' });
  fx.ambiente?.({
    costura: {
      a: { arte, tono: tonoA },
      b: { arte, tono: tonoB },
      posicion: 0.5,
      k: 1
    }
  });
  if (capa) seguir(fx);
}

function programarCostura(decision, state) {
  const gen = ++generacion;
  const intentar = (n) => {
    if (gen !== generacion) return;
    const fx = globalThis.__fx;
    if (!fx) {
      if (n < 20) setTimeout(() => intentar(n + 1), 100);
      return;
    }
    const ctx = contextoDeBisagra(decision, state);
    if (!ctx) {
      limpiarCostura();
      return;
    }
    montarCostura(ctx, decision, state, fx);
  };
  queueMicrotask(() => intentar(0));
}

function moverCostura(lado) {
  if (!sesion) return;
  globalThis.__fx?.ambiente?.({ costura: { posicion: lado === 'b' ? 0.38 : 0.62 } });
}

export function renderDecision(elements, decision, onElegir, state, probabilidades = []) {
  const { decisionPanel, decisionTitle, decisionDesc, decisionOptions } = elements;
  vigilarPieza();

  const rotulo = rotuloDeDecision(decision, state);
  const peso = pesoDeDecision(decision);
  const matriz = esMatrizDePlan(decision);
  const ejes = matriz ? ejesDe(decision) : [];
  const bisagra = contextoDeBisagra(decision, state);

  decisionPanel.dataset.peso = peso;
  decisionPanel.dataset.tabLabel = rotulo.label;
  decisionPanel.dataset.forma = matriz ? 'matriz' : 'franjas';
  decisionPanel.style.setProperty('--tab-color', `var(--cat-${rotulo.token})`);
  if (matriz) decisionOptions.style.setProperty('--dc-ejes', String(ejes.length));
  else decisionOptions.style.removeProperty('--dc-ejes');

  let rotuloEl = decisionPanel.querySelector(':scope > .dc-rotulo');
  if (!rotuloEl) {
    rotuloEl = document.createElement('p');
    rotuloEl.className = 'dc-rotulo';
    decisionPanel.insertBefore(rotuloEl, decisionTitle);
  }
  rotuloEl.textContent = rotulo.label;

  decisionTitle.textContent = decision.titulo;
  decisionTitle.classList.add('titulo-parada');

  const [linea, resto] = partirDescripcion(decision.descripcion);
  decisionDesc.textContent = '';
  decisionDesc.classList.add('dc-planteo');
  decisionDesc.dataset.abierta = 'no';
  const spanLinea = document.createElement('span');
  spanLinea.className = 'dc-linea';
  spanLinea.textContent = linea;
  decisionDesc.appendChild(spanLinea);
  if (resto) {
    const spanResto = document.createElement('span');
    spanResto.className = 'dc-resto';
    spanResto.textContent = resto;
    decisionDesc.appendChild(spanResto);
    const mas = document.createElement('button');
    mas.type = 'button';
    mas.className = 'dc-mas';
    mas.textContent = 'más';
    mas.setAttribute('aria-expanded', 'false');
    mas.addEventListener('click', () => {
      const abrir = decisionDesc.dataset.abierta !== 'si';
      decisionDesc.dataset.abierta = abrir ? 'si' : 'no';
      mas.textContent = abrir ? 'menos' : 'más';
      mas.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    });
    decisionDesc.appendChild(mas);
  }

  let inspector = decisionPanel.querySelector(':scope > .dc-inspector');
  if (!inspector) {
    inspector = document.createElement('div');
    inspector.className = 'dc-inspector';
    inspector.id = 'dc-inspector';
    inspector.setAttribute('aria-live', 'polite');
    decisionPanel.appendChild(inspector);
  }
  const masInsp = document.createElement('button');
  masInsp.type = 'button';
  masInsp.className = 'dc-mas dc-mas-insp';
  masInsp.textContent = 'más';
  masInsp.setAttribute('aria-expanded', 'false');
  masInsp.addEventListener('click', () => {
    const abrir = inspector.dataset.abierta !== 'si';
    inspector.dataset.abierta = abrir ? 'si' : 'no';
    masInsp.textContent = abrir ? 'menos' : 'más';
    masInsp.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  });

  function pintarInspector(opcion, gate) {
    inspector.dataset.abierta = 'no';
    masInsp.textContent = 'más';
    masInsp.setAttribute('aria-expanded', 'false');
    inspector.textContent = '';
    if (!opcion && !gate) return;
    const tit = document.createElement('p');
    tit.className = 'dc-insp-titulo';
    tit.textContent = opcion?.label ?? '';
    const prosa = document.createElement('p');
    prosa.className = 'dc-insp-prosa';
    prosa.textContent = opcion?.descripcion || gate || '';
    inspector.append(tit, prosa);
    if (opcion?.propuesta) {
      const p = document.createElement('p');
      p.className = 'dc-insp-extra';
      p.textContent = opcion.propuesta;
      inspector.appendChild(p);
    }
    if (opcion?.plan?.texto) {
      const p = document.createElement('p');
      p.className = 'dc-insp-extra';
      p.textContent = opcion.plan.texto;
      inspector.appendChild(p);
    }
    if (opcion?.riesgoTexto) {
      const p = document.createElement('p');
      p.className = 'dc-insp-extra';
      p.textContent = opcion.riesgoTexto;
      inspector.appendChild(p);
    }
    if (gate && opcion) {
      const p = document.createElement('p');
      p.className = 'dc-insp-extra';
      p.textContent = gate;
      inspector.appendChild(p);
    }
    inspector.appendChild(masInsp);
  }

  decisionOptions.innerHTML = '';
  if (matriz && ejes.length) {
    const cabeza = document.createElement('div');
    cabeza.className = 'dc-ejes';
    cabeza.appendChild(document.createElement('span'));
    for (const campo of ejes) {
      const th = document.createElement('span');
      th.className = 'dc-eje-col';
      const clave = glifoDeCampo(campo);
      th.append(icono(clave, { clase: 'ln-ico dc-eje' }));
      const nom = document.createElement('span');
      nom.textContent = ABREVIATURA[clave] ?? String(campo).split('.').pop();
      th.appendChild(nom);
      cabeza.appendChild(th);
    }
    decisionOptions.appendChild(cabeza);
  }

  let apuntada = null;
  const apuntar = (boton, usuario) => {
    if (!boton || boton === apuntada) return;
    apuntada?.classList.remove('dc-apuntada');
    apuntada = boton;
    boton.classList.add('dc-apuntada');
    pintarInspector(boton._opcion ?? null, boton._gate ?? '');
    if (bisagra && boton.dataset.lado) moverCostura(boton.dataset.lado);
    if (usuario) globalThis.__fx?.pulso?.('apuntar');
  };

  const armarBoton = (opcion, indice, { bloqueada = false, gate = '' } = {}) => {
    const opcionBtn = document.createElement('button');
    opcionBtn.type = 'button';
    opcionBtn.className = 'option-btn' + (bloqueada ? ' option-btn--bloqueada' : '');
    if (bloqueada) opcionBtn.disabled = true;
    opcionBtn._opcion = bloqueada ? { label: opcion.label, descripcion: gate } : opcion;
    opcionBtn._gate = gate;
    opcionBtn.setAttribute('aria-describedby', 'dc-inspector');
    if (bisagra && !bloqueada) opcionBtn.dataset.lado = ladoDeOpcion(opcion, decision);

    if (!bloqueada && indice < 4) {
      opcionBtn.dataset.atajo = String(indice + 1);
      const atajo = document.createElement('span');
      atajo.className = 'option-atajo';
      atajo.textContent = String(indice + 1);
      atajo.setAttribute('aria-hidden', 'true');
      opcionBtn.appendChild(atajo);
    }

    const titulo = document.createElement('div');
    titulo.className = 'option-title';
    titulo.textContent = opcion.label;
    opcionBtn.appendChild(titulo);

    if (opcion.descripcion || gate) {
      const detalle = document.createElement('div');
      detalle.className = 'option-desc dc-sr';
      detalle.textContent = opcion.descripcion || gate;
      opcionBtn.appendChild(detalle);
    }

    if (opcion.propuesta) {
      opcionBtn.classList.add('option-btn--propuesta');
      const propuesta = document.createElement('div');
      propuesta.className = 'option-propuesta';
      propuesta.textContent = opcion.propuesta;
      opcionBtn.appendChild(propuesta);
    }

    if (matriz && !bloqueada) {
      const porCampo = new Map((opcion.previa ?? []).map((p) => [p.campo || p.etiqueta, p]));
      for (const campo of ejes) {
        const entrada = porCampo.get(campo);
        opcionBtn.appendChild(entrada ? kickerDe(entrada) : document.createElement('span'));
      }
    } else if ((opcion.previa ?? []).length) {
      const meta = document.createElement('div');
      meta.className = 'option-previa';
      for (const entrada of opcion.previa) meta.appendChild(kickerDe(entrada));
      opcionBtn.appendChild(meta);
    }

    if (opcion.riesgo) {
      const riesgo = document.createElement('span');
      riesgo.className = `option-riesgo option-riesgo--${opcion.riesgo}`;
      riesgo.append(icono(RIESGO_ICONO[opcion.riesgo] ?? 'incierto', { clase: 'ln-ico dc-riesgo' }));
      const corto = document.createElement('span');
      corto.className = 'dc-riesgo-nom';
      corto.textContent = RIESGO_CORTO[opcion.riesgo] ?? opcion.riesgo;
      riesgo.append(corto, sr(opcion.riesgoTexto ?? opcion.riesgo));
      opcionBtn.appendChild(riesgo);
    }

    if (opcion.rareza) {
      const rareza = document.createElement('span');
      rareza.className = `option-rareza option-rareza--${opcion.rareza}`;
      rareza.textContent = opcion.rareza === 'rara' ? 'rara' : 'común';
      opcionBtn.appendChild(rareza);
    }

    const probabilidad = probabilidades?.find((p) => p.id === opcion.id);
    if (probabilidad) {
      const prob = document.createElement('div');
      prob.className = 'option-prob';
      if (typeof probabilidad.porcentaje === 'number') {
        const med = document.createElement('span');
        med.className = 'dc-medidor';
        med.style.setProperty('--dc-p', String(probabilidad.porcentaje));
        med.appendChild(document.createElement('span'));
        const num = document.createElement('span');
        num.className = 'dc-pct';
        num.textContent = `${probabilidad.porcentaje}%`;
        prob.append(med, num);
      }
      prob.appendChild(sr(probabilidad.texto ?? ''));
      opcionBtn.appendChild(prob);
    }

    if (opcion.plan?.texto) {
      const plan = document.createElement('div');
      plan.className = 'option-plan';
      plan.textContent = opcion.plan.texto;
      opcionBtn.appendChild(plan);
    }

    if (gate && bloqueada) {
      const g = document.createElement('div');
      g.className = 'option-gate';
      g.textContent = gate;
      opcionBtn.appendChild(g);
    }

    if (!bloqueada) {
      opcionBtn.addEventListener('click', () => onElegir({ opcionId: opcion.id }));
      opcionBtn.addEventListener('pointerenter', () => apuntar(opcionBtn, true));
      opcionBtn.addEventListener('focus', () => apuntar(opcionBtn, true));
    }
    decisionOptions.appendChild(opcionBtn);
    return opcionBtn;
  };

  const botones = decision.opciones.map((opcion, indice) => armarBoton(opcion, indice));
  (decision.opcionesBloqueadas ?? []).forEach((bloqueada, k) => {
    armarBoton(bloqueada, decision.opciones.length + k, { bloqueada: true, gate: bloqueada.gate ?? '' });
  });

  const primera = botones.find((b) => !b.disabled);
  if (primera) apuntar(primera, false);

  escalonar(botones);
  decisionPanel.hidden = false;
  const main = keyDdragonDeCampeon(state?.player?.championPool?.[0]?.name);
  if (main) globalThis.__fx?.aura?.pantalla(main);
  programarCostura(decision, state);
}
