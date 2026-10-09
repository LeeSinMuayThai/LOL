// Los view-models de la UI, reproducidos con los MISMOS helpers puros que usa el juego (src/ui/core/*, src/core/*). Nada se
// inventa: cada función dice de qué archivo del juego sale lo que devuelve. Lo que depende del DOM (franja.js, acompanante.js)
// se rearma como datos con la misma lógica.
import { BALANCE } from '../../../src/data/balance.js';
import { etiquetaRol } from '../../../src/data/roles.js';
import { fichaCompleta, bandaDeNivel, nivelDelJugador } from '../../../src/core/ficha.js';
import { previaDeDecision } from '../../../src/core/previaDePartido.js';
import { tableroDeSerie, seguimientoGoldenRoad, ventanaVisibleDe } from '../../../src/core/vistaDeCarrera.js';
import { escalonDeCarrera } from '../../../src/core/puntaje.js';
import { etiquetaDeRanked, servidorDeLaPartida } from '../../../src/core/ranked.js';
import { formaBeat } from '../../../src/core/log.js';
import {
  piezaDe, acompananteDe, cierreDeSplit, deltaDeCierre, textoDeNumero, LABEL_DE_VENTANA
} from '../../../src/ui/core/escena.js';
import { trayectoriaDeCarrera, textoDeEscalon } from '../../../src/ui/core/trayectoria.js';
import { clonar } from './comun.mjs';

// Copiadas de src/ui/franja.js (ese módulo importa el DOM y no corre en Node).
const LABEL_BANDA = { prospecto: 'Prospecto', titular: 'Competitivo', elite: 'Élite', clase_mundial: 'Clase mundial' };
const LABEL_FASE = { amateur: 'Amateur', profesional: 'Agente libre', retirado: 'Retirado' };
const LABEL_VENTANA_CORTA = { regular: 'Regular' };

const redondear = (n, d = 2) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : n);

// Lo que pinta la franja (src/ui/franja.js `pintar`) como datos. `foto` es `pagina.fotoInicio` (la del split en curso).
export function franjaDe(estado, foto) {
  const org = estado.career?.currentOrg ?? null;
  const ventanaId = estado.phase === 'retirado' ? null : ventanaVisibleDe(estado);
  const n = BALANCE.edad.splitsPorEdad;
  const actual = Number.isFinite(estado.player?.splitCount) ? estado.player.splitCount % n : null;
  let numero = null;
  if (estado.terminado) {
    const nivel = Math.round(estado.career?.registro?.picos?.nivel ?? 0);
    numero = nivel > 0
      ? { tipo: 'pico', valor: nivel, banda: bandaDeNivel(nivel), bandaTexto: LABEL_BANDA[bandaDeNivel(nivel)] }
      : null;
  } else {
    const c = cierreDeSplit(foto, estado).numero;
    numero = {
      tipo: c.etiqueta,
      valor: c.despues,
      antes: c.antes,
      banda: c.banda,
      bandaTexto: c.etiqueta === 'nivel' ? (LABEL_BANDA[c.banda] ?? '') : null,
      texto: textoDeNumero(c),
      delta: deltaDeCierre(c)
    };
  }
  return {
    quien: {
      handle: estado.player.name,
      rol: estado.player.role,
      rolEtiqueta: etiquetaRol(estado.player.role),
      texto: `${estado.player.name} · ${etiquetaRol(estado.player.role)}`
    },
    club: org ? { org } : { org: null, fase: LABEL_FASE[estado.phase] ?? '' },
    cuando: {
      edad: estado.age ?? null,
      edadTexto: estado.age != null ? `${estado.age} años` : null,
      anioEtiqueta: estado.calendario?.etiqueta ?? null,
      texto: [estado.age != null ? `${estado.age} años` : null, estado.calendario?.etiqueta].filter(Boolean).join(' · '),
      ventana: ventanaId ? { id: ventanaId, texto: LABEL_DE_VENTANA[ventanaId] ?? '', corta: LABEL_VENTANA_CORTA[ventanaId] ?? null } : null,
      pips: estado.phase === 'retirado' || actual === null ? null : { total: n, hechos: actual, actual }
    },
    numero
  };
}

// El jugador tal como lo muestran la ficha y el cuarto Vos: lo básico, redondeado.
export function jugadorDe(estado) {
  const p = estado.player;
  return {
    handle: p.name,
    rol: p.role,
    rolEtiqueta: etiquetaRol(p.role),
    edad: estado.age,
    anio: estado.calendario?.anio ?? null,
    fase: estado.phase,
    org: estado.career?.currentOrg ?? null,
    liga: estado.career?.liga ?? null,
    tier: estado.career?.tier ?? null,
    stats: Object.fromEntries(Object.entries(p.stats).map(([k, v]) => [k, redondear(v, 1)])),
    nivel: Math.round(nivelDelJugador(estado)),
    rankedTexto: p.ranked ? etiquetaDeRanked(p.ranked, servidorDeLaPartida(estado)) : null,
    ranked: p.ranked ?? null,
    estudios: redondear(p.studies, 1),
    confianzaFamiliar: redondear(p.familyTrust, 1),
    sueno: redondear(p.sleep, 1),
    perfil: p.perfil?.actual ?? null,
    planAnual: p.planAnual ?? null,
    campeonDelSplit: p.campeonDelSplit ?? null,
    pool: p.championPool.map((c) => ({ name: c.name, tags: c.tags, maestria: redondear(c.mastery, 1), partidas: c.partidas })),
    contrato: estado.career?.contrato ?? null,
    jerarquia: redondear(estado.career?.jerarquia, 1),
    arraigo: redondear(estado.career?.arraigo, 1),
    sinergia: redondear(estado.career?.sinergia, 1),
    companeros: estado.career?.companeros ?? [],
    titulos: p.titles,
    mundiales: p.worlds
  };
}

export const fichaDe = (estado) => ({ ...clonar(fichaCompleta(estado)), jugador: jugadorDe(estado) });

// Lo básico de la ficha (las eras).
export function fichaBasicaDe(estado) {
  const f = fichaCompleta(estado);
  return clonar({
    nivel: f.nivel, bandaNivel: f.bandaNivel, jerarquia: f.jerarquia, arraigo: f.arraigo, mentalidad: f.mentalidad,
    hype: f.hype, estadoInternacional: f.estadoInternacional
  });
}

// La página del relato hasta la parada: los logs desde `desde`, con la marca de si son un beat (`formaBeat`, src/core/log.js).
export function paginaDe(estado, desde) {
  return estado.logs.slice(desde).map((log, i) => ({ i: desde + i, beat: formaBeat(log), log: clonar(log) }));
}

// "Lo último que pasó" (src/ui/components/feed.js `renderParadaAntes`): el último beat narrativo de la página.
export function antesDe(estado, desde) {
  const beats = estado.logs.slice(desde).filter(formaBeat);
  const ultimo = beats[beats.length - 1] ?? null;
  return {
    mensaje: ultimo ? String(ultimo.message ?? '').replace(/\s+/g, ' ').trim() : null,
    log: ultimo ? clonar(ultimo) : null,
    beatsEnLaPagina: beats.length
  };
}

// La previa que muestra la parada (`previaDeDecision`, la misma de src/ui/app.js `pintarPrevia`); `null` si no aplica.
export function previaGeneral(estado, decision) {
  try {
    const previa = previaDeDecision(estado, decision);
    return previa ? clonar(previa) : null;
  } catch (error) {
    return { error: String(error?.message ?? error) };
  }
}

function libresDelPool(estado) {
  const quemados = new Set(estado.serie?.quemados ?? []);
  return (estado.player.championPool ?? []).filter((c) => !quemados.has(c.name)).map((c) => c.name);
}

export function escalonTexto(estado) {
  if (estado.phase !== 'profesional') return null;
  return textoDeEscalon(escalonDeCarrera(estado));
}

// El acompañante (src/ui/acompanante.js): qué panel toca y los datos que ese panel lee.
export function acompananteDatos(estado, decision) {
  const pieza = piezaDe(estado);
  const a = acompananteDe(estado, pieza);
  let datos = null;
  switch (a.tipo) {
    case 'vos':
      datos = { ficha: fichaDe(estado) };
      break;
    case 'mercado':
      datos = {
        traspasosMundo: clonar(decision?.datos?.traspasosMundo ?? []),
        asientosAbiertos: clonar(decision?.datos?.asientosAbiertos ?? []),
        clubesInteresados: clonar(decision?.datos?.clubesInteresados ?? [])
      };
      break;
    case 'carrera':
      datos = { trayectoria: clonar(trayectoriaDeCarrera(estado)), escalonTexto: escalonTexto(estado) };
      break;
    case 'serie':
    case 'swiss':
      datos = {
        tablero: tableroDeSerie(estado),
        serie: clonar(estado.serie ?? null),
        internacional: a.tipo === 'swiss' ? clonar(estado.internacional) : null,
        libres: libresDelPool(estado)
      };
      break;
    case 'previa':
      datos = { previa: previaGeneral(estado, decision) };
      break;
    case 'tabla':
      datos = {
        posicion: estado.career.temporada?.posicion ?? null,
        tabla: clonar(estado.career.temporada?.tabla ?? null),
        calendario: clonar(estado.career.temporada?.calendario ?? null)
      };
      break;
    default:
      datos = null;
  }
  return { tipo: a.tipo, cuarto: a.cuarto, datos };
}

export const seguimientoDe = (estado) => clonar(seguimientoGoldenRoad(estado));
export { piezaDe };
