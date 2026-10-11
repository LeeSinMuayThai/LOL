// El partido (PLANUI U2b, op=linea): la fecha es un cruce, el plan de Fearless es la pared y las
// cartas, el decisivo y el Swiss 2-2 piden suspenso, y el Swiss se ve como stream. El motor no cambia.
import { mostrar as mostrarDecision } from './decision.js';
import { marcarFoco, marcarAtajo } from '../escena.js';
import { previaDeDecision } from '../../core/previaDePartido.js';
import { tableroDeSerie } from '../../core/vistaDeCarrera.js';
import { keyDdragonDeCampeon } from '../components/campeonTile.js';
import { anilloAceptar, quemar } from '../fx/ceremonia.js';
import { urlCarga } from '../fx/arte.js';
import { crearBeats } from '../fx/beats.js';
import { iniciales, pintarLogo } from '../fx/logos.js';
import { tonoCompeticion, tonoOrg, separar } from '../fx/tono.js';
import { marcador as marcadorTv, placaInferior } from '../fx/transmision.js';
import { quieto } from '../fx/util.js';

const MOTIVOS = new Set(['plan', 'decisivo', 'swiss']);
const BARRAS = 5;
const DURA_SUSPENSO = 3000;

let observador = null;
let tokenAmbiente = 0;
let responderHecho = false;

export function mostrar(contenedor, decision, ctx) {
  const motivo = decision?.datos?.motivo;
  if (!MOTIVOS.has(motivo)) {
    const devuelto = mostrarDecision(contenedor, decision, ctx);
    prepararAmbiente(decision, ctx.estado);
    return devuelto;
  }
  ctx.pintarPrevia(decision, ctx.estado);
  pintar(ctx.elementos.decision, decision, ctx);
  prepararAmbiente(decision, ctx.estado);
  return contenedor;
}

export function acompanante(caja, estado, { ui }) {
  if (tableroDeSerie(estado)) {
    const tablero = document.createElement('div');
    tablero.className = 'serie-contexto serie-contexto--completo';
    caja.appendChild(tablero);
    ui.renderSerieContexto(tablero, estado, { completo: true });
    return;
  }
  const previa = document.createElement('div');
  previa.className = 'previa previa--completa';
  caja.appendChild(previa);
  let datos = null;
  try {
    datos = estado.pendiente?.decision ? previaDeDecision(estado, estado.pendiente.decision) : null;
  } catch (error) {
    console.error('No se pudo armar la previa del acompañante:', error);
  }
  ui.renderPrevia(previa, datos, { completo: true });
}

function pintar(elementos, decision, ctx) {
  const { decisionTitle, decisionDesc, decisionOptions } = elementos;
  const { responder, estado } = ctx;
  responderHecho = false;
  decisionTitle.textContent = decision.titulo;
  decisionDesc.textContent = decision.descripcion ?? '';
  decisionOptions.replaceChildren();
  marcarFoco(decisionTitle);

  const motivo = decision.datos.motivo;
  if (motivo === 'plan') {
    decisionDesc.prepend(pared(estado, decision));
    decision.opciones.forEach((opcion, i) => {
      decisionOptions.appendChild(cartaDePlan(opcion, i, () => unaVez(responder, { opcionId: opcion.id })));
    });
    return;
  }
  if (motivo === 'swiss') {
    pintarSwiss(decisionOptions, decision, estado, responder);
    return;
  }
  decision.opciones.forEach((opcion, i) => {
    decisionOptions.appendChild(botonOpcion(opcion, i, () => unaVez(responder, { opcionId: opcion.id })));
  });
}

function unaVez(responder, respuesta) {
  if (responderHecho) return;
  responderHecho = true;
  responder(respuesta);
}

function botonOpcion(opcion, indice, alClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'option-btn pt-op';
  if (indice < 4) {
    const atajo = document.createElement('span');
    atajo.className = 'option-atajo';
    atajo.setAttribute('aria-hidden', 'true');
    atajo.textContent = String(indice + 1);
    b.appendChild(atajo);
    marcarAtajo(b, indice + 1);
  }
  const titulo = document.createElement('div');
  titulo.className = 'option-title';
  titulo.textContent = opcion.label;
  b.appendChild(titulo);
  if (opcion.descripcion) {
    const desc = document.createElement('div');
    desc.className = 'option-desc';
    desc.textContent = opcion.descripcion;
    b.appendChild(desc);
  }
  b.addEventListener('click', alClick);
  return b;
}

function cartaDePlan(opcion, indice, alClick) {
  const b = botonOpcion(opcion, indice, alClick);
  b.classList.add('pt-plan');
  const barras = document.createElement('div');
  barras.className = 'pt-barras';
  barras.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < BARRAS; i += 1) {
    const barra = document.createElement('span');
    barra.className = 'pt-barra';
    const relleno = document.createElement('i');
    const p = numeroEnPorcentaje(opcion.pMapas?.[i]);
    relleno.style.height = `${p}%`;
    barra.appendChild(relleno);
    barras.appendChild(barra);
  }
  const serie = document.createElement('div');
  serie.className = 'option-prob';
  serie.textContent = `La serie: ${numeroEnPorcentaje(opcion.pSerie)}%`;
  b.append(barras, serie);
  return b;
}

function numeroEnPorcentaje(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 0;
  const pct = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function pared(estado, decision) {
  const caja = document.createElement('div');
  caja.className = 'pt-pared';
  const quemados = new Set(estado.serie?.quemados ?? []);
  const animar = decision.datos?.replan ? (decision.datos.quemado ?? estado.serie?.rivalJuega ?? null) : null;
  const nombres = [];
  for (const nombre of estado.serie?.quemados ?? []) nombres.push(nombre);
  for (const campeon of estado.player?.championPool ?? []) {
    if (!nombres.includes(campeon.name)) nombres.push(campeon.name);
  }
  for (const nombre of nombres.slice(0, 10)) {
    const carta = retrato(nombre);
    caja.appendChild(carta);
    if (quemados.has(nombre) || nombre === animar) {
      const anims = quemar(carta) ?? [];
      if (nombre !== animar) {
        for (const a of anims) {
          try { a.finish(); } catch { /* el quemado quieto ya está en la clase */ }
        }
      }
    }
  }
  return caja;
}

function retrato(nombre) {
  const carta = document.createElement('figure');
  carta.className = 'pt-retrato';
  const key = keyDdragonDeCampeon(nombre);
  if (key) {
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.src = urlCarga(key);
    img.addEventListener('error', () => { img.remove(); }, { once: true });
    carta.appendChild(img);
  }
  const cap = document.createElement('figcaption');
  cap.textContent = nombre;
  carta.appendChild(cap);
  return carta;
}

function pintarSwiss(caja, decision, estado, responder) {
  const stream = document.createElement('div');
  stream.className = 'pt-swiss';
  const t = estado.internacional;
  const org = estado.career?.currentOrg ?? estado.player?.name ?? 'Vos';
  const rival = t?.partidoEnCurso?.rival ?? decision.datos?.rival ?? 'Rival';
  const record = t?.swiss?.record?.[t.jugador] ?? { v: 0, d: 0 };
  const tv = marcadorTv({
    rotulo: 'Swiss · 2-2',
    formato: 1,
    local: { nombre: org, sigla: iniciales(org), logo: pintarLogo(org, { tam: 36, alt: '' }), marcador: record.v },
    visita: { nombre: rival, sigla: iniciales(rival), logo: pintarLogo(rival, { tam: 36, alt: '' }), marcador: record.d }
  });
  stream.append(
    tv.nodo,
    placaInferior({ rotulo: 'Vida o muerte', titulo: `${org} vs ${rival}`, sub: 'Bo1 · el que pierde se va', tono: tonoCompeticion('mundial') }),
    marcasSwiss(estado)
  );

  const opciones = decision.opciones ?? [];
  const segura = opciones.find((o) => o.id === 'sinCharla') ?? opciones[0];
  const charla = opciones.find((o) => o.id === 'charla');
  const aviso = anilloAceptar({
    encabezado: 'VIDA O MUERTE',
    cola: 'El que pierde se vuelve a casa',
    segundos: 12,
    tono: tonoCompeticion('mundial'),
    alAceptar: () => unaVez(responder, { opcionId: segura?.id })
  });
  const boton = aviso.nodo.querySelector('button');
  if (boton && segura) {
    boton.classList.add('option-btn', 'pt-op');
    const titulo = document.createElement('span');
    titulo.className = 'option-title';
    titulo.textContent = segura.label;
    boton.prepend(titulo);
    marcarAtajo(boton, 1);
  }
  stream.appendChild(aviso.nodo);
  if (charla) {
    stream.appendChild(botonOpcion(charla, 1, () => {
      aviso.destruir();
      unaVez(responder, { opcionId: charla.id });
    }));
  }
  caja.appendChild(stream);
  caja._u2bSwiss = aviso;
}

function marcasSwiss(estado) {
  const t = estado.internacional;
  const fila = document.createElement('div');
  fila.className = 'pt-marcas-fila';
  const propias = (t?.swiss?.rondas ?? []).map((ronda) => ronda.find((p) => p.propio)).filter(Boolean);
  for (let i = 0; i < 5; i += 1) {
    const pip = document.createElement('i');
    const jugado = propias[i];
    const gano = jugado ? jugado.ganador === t.jugador : null;
    pip.className = 'pt-marca' + (jugado ? ` pt-marca--${gano ? 'w' : 'l'}` : '');
    fila.appendChild(pip);
  }
  return fila;
}

function prepararAmbiente(decision, estado) {
  const mio = ++tokenAmbiente;
  const shell = document.querySelector('.shell');
  observador?.disconnect();
  observador = new MutationObserver(() => {
    if (shell?.dataset.pieza === 'partido') return;
    tokenAmbiente += 1;
    soltarAmbiente();
    observador?.disconnect();
    observador = null;
  });
  if (shell) observador.observe(shell, { attributes: true, attributeFilter: ['data-pieza'] });
  requestAnimationFrame(() => {
    if (mio !== tokenAmbiente) return;
    if (document.querySelector('.shell')?.dataset.pieza !== 'partido') return;
    aplicarAmbiente(decision, estado);
  });
}

function soltarAmbiente() {
  const fx = window.__fx;
  if (!fx) return;
  fx.ambiente?.({ suspenso: null, costura: null });
  fx.fondo?.({ contexto: 'juego' });
}

function aplicarAmbiente(decision, estado) {
  const fx = window.__fx;
  if (!fx) return;
  const costura = armarCostura(decision, estado);
  fx.fondo?.({ contexto: 'juego', escena: 'costura' });
  fx.ambiente?.({ costura });
  const org = estado.career?.currentOrg ?? estado.player?.name;
  if (org) fx.tono?.(tonoOrg(org));
  if (pideSuspenso(decision, estado) && !quieto()) {
    fx.ambiente?.({ suspenso: curvasSuspenso() });
  } else {
    fx.ambiente?.({ suspenso: null });
  }
}

function pideSuspenso(decision, estado) {
  const motivo = decision?.datos?.motivo;
  if (motivo === 'swiss') return true;
  if (motivo !== 'decisivo') return false;
  const formato = estado.serie?.formato ?? 1;
  const falta = Math.floor(formato / 2);
  const marcador = estado.serie?.marcador ?? [0, 0];
  return marcador[0] === falta && marcador[1] === falta;
}

function curvasSuspenso() {
  const n = 24;
  const vaiven = [];
  const tonos = [];
  const publico = [];
  for (let i = 0; i < n; i += 1) {
    const u = i / (n - 1);
    const hz = 0.5 + 0.9 * u;
    vaiven.push(Math.sin(u * (DURA_SUSPENSO / 1000) * hz * Math.PI * 2) * 0.055);
    tonos.push(Math.sin(u * Math.PI) * 0.65);
    publico.push(u);
  }
  const beats = crearBeats({ duracion: DURA_SUSPENSO });
  const latidos = [];
  let t = 760;
  let paso = 760;
  while (t < DURA_SUSPENSO) {
    const cuando = beats.destello(t);
    if (cuando != null) latidos.push([Math.round(cuando), 1]);
    paso = Math.max(340, Math.round(paso * 0.82));
    t += paso;
  }
  return { dura: DURA_SUSPENSO, vaiven, tonos, publico, latidos };
}

function armarCostura(decision, estado) {
  const orgA = estado.career?.currentOrg ?? estado.player?.name ?? '';
  const orgB = estado.serie?.rival?.org
    ?? estado.internacional?.partidoEnCurso?.rival
    ?? estado.career?.temporada?.fechaEnCurso?.rival
    ?? '';
  const tonoA = tonoOrg(orgA);
  const tonoB = separar(tonoA, tonoOrg(orgB), tonoCompeticion(decision?.datos?.motivo === 'swiss' ? 'mundial' : 'cblol'));
  const propio = decision?.datos?.campeonElegido
    ?? estado.player?.championPool?.[0]?.name
    ?? null;
  const rival = estado.serie?.rivalJuega ?? null;
  return {
    k: 1,
    posicion: 0.5,
    a: { arte: keyDdragonDeCampeon(propio), tono: tonoA },
    b: { arte: keyDdragonDeCampeon(rival), tono: tonoB }
  };
}
