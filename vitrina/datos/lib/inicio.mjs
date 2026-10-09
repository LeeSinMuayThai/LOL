// La muestra `inicio`: los catálogos de la pantalla de inicio tal como los arma src/ui/screens/inicio.js, el jugador de la seed héroe,
// el desafío del día (fecha fija), una tarjeta de "Continuar" y un historial de 3 filas reales (src/ui/resultado.js).
import fs from 'node:fs';
import { mulberry32 } from '../../../src/core/rng.js';
import { createInitialState, regionesDeOrigen } from '../../../src/core/state.js';
import { iniciarDesafio } from '../../../src/core/desafio.js';
import { BALANCE } from '../../../src/data/balance.js';
import { ROLES, IDS_ROL, etiquetaRol, atributosClave } from '../../../src/data/roles.js';
import { IDS_PERFIL, nombreDePerfil, descripcionDePerfil, soloQDePerfil } from '../../../src/core/perfil.js';
import { textoDePlanInicial } from '../../../src/core/rutinas.js';
import { VERSION_DDRAGON, BASE_DDRAGON } from '../../../src/data/ddragon.js';
import { VERSION_JUEGO } from '../../../src/data/version.js';
import {
  entradaDeResultado, agregarAlHistorial, historialVacio, miles, linkDeResultado, mejorDelDesafio, lineaDeHistorial
} from '../../../src/ui/resultado.js';
import { medallaDeGoldenRoad } from '../../../src/ui/core/trayectoria.js';
import { etiquetaDeRanked, servidorDeLaPartida } from '../../../src/core/ranked.js';
import { jugarCarrera } from './partida.mjs';
import { clonar, FECHA_FIJA } from './comun.mjs';

const CAMPEONES = JSON.parse(fs.readFileSync(new URL('../../../src/data/champions.json', import.meta.url), 'utf8'));
const HREF_DE_EJEMPLO = 'http://localhost:8000/';

// Copia de ETIQUETA_STAT de src/ui/screens/inicio.js (ese módulo importa el DOM).
const ETIQUETA_STAT = {
  mecanica: 'Mecánica', macro: 'Macro', teamfight: 'Teamfight', laneo: 'Laneo',
  shotcalling: 'Shotcalling', adaptabilidad: 'Adaptabilidad'
};

// Las URLs de Data Dragon, las mismas de src/ui/components/campeonTile.js (`urlIconoDeCampeon`, `urlSplashDeCampeon`).
const urlIcono = (key) => `${BASE_DDRAGON}/${VERSION_DDRAGON}/img/champion/${key}.png`;
const urlSplash = (key) => `${BASE_DDRAGON}/img/champion/splash/${key}_0.jpg`;

export function catalogos() {
  const roles = IDS_ROL.map((id) => ({
    id,
    etiqueta: ROLES[id].label,
    tono: ROLES[id].tono,
    costo: ROLES[id].costo,
    atributosClave: atributosClave(id).map((stat) => ETIQUETA_STAT[stat]),
    viveDe: `Vive de: ${atributosClave(id).map((stat) => ETIQUETA_STAT[stat]).join(' y ')}.`
  }));
  const perfiles = IDS_PERFIL.map((id) => ({
    id,
    nombre: nombreDePerfil(id),
    descripcion: descripcionDePerfil(id),
    soloQ: soloQDePerfil(id),
    planInicial: textoDePlanInicial(id),
    // La línea que se ve al elegirlo (perfilTexto, src/ui/screens/inicio.js renderPerfiles).
    textoAlElegir: `${descripcionDePerfil(id)} Decide por vos lo chico; lo grande lo decidís vos, y te va corriendo el perfil. ${textoDePlanInicial(id)} ${soloQDePerfil(id)}`,
    textoSinElegir: 'Si no elegís, lo decide la seed. El perfil decide por vos lo chico; lo grande lo decidís vos.'
  }));
  const regiones = regionesDeOrigen().map((r) => clonar(r));
  const campeonesPorRol = Object.fromEntries(IDS_ROL.map((rol) => [rol,
    CAMPEONES.filter((c) => c.role === rol && !c.debut).map((c) => ({
      name: c.name, tags: c.tags, ddragon: c.ddragon ?? null,
      iconoUrl: c.ddragon ? urlIcono(c.ddragon) : null,
      splashUrl: c.ddragon ? urlSplash(c.ddragon) : null
    }))
  ]));
  return {
    roles,
    perfiles,
    regiones,
    textoSinRegion: 'Si no elegís, la región sale de la seed. La región es la dificultad: llegar a primera, ganar el Mundial.',
    campeonesPorRol,
    campeonesAElegir: BALANCE.mundo.campeonesIniciales,
    textoDelPool: 'Un pool ancho aguanta mejor un cambio de meta; uno angosto rinde más mientras el meta te acompañe.'
  };
}

// El jugador que sale de la seed (sin elección): lo que el inicio muestra como "tu jugador" y lo que el juego sortea.
export function jugadorDeLaSeed(seed) {
  const s = createInitialState(seed, mulberry32(seed));
  return {
    seed,
    handle: s.player.name,
    rol: s.player.role,
    rolEtiqueta: etiquetaRol(s.player.role),
    region: s.mundo.regionOrigen,
    regionId: s.mundo.regionIdOrigen,
    liga: s.mundo.ligaOrigen,
    servidor: s.mundo.servidorOrigen,
    perfil: s.player.perfil.actual,
    perfilNombre: nombreDePerfil(s.player.perfil.actual),
    mains: s.player.championPool.map((c) => {
      const cat = CAMPEONES.find((x) => x.name === c.name);
      return { name: c.name, tags: c.tags, ddragon: cat?.ddragon ?? null, iconoUrl: cat?.ddragon ? urlIcono(cat.ddragon) : null };
    }),
    rangoInicial: etiquetaDeRanked(s.player.ranked, servidorDeLaPartida(s)),
    origen: clonar(s.origen)
  };
}

// La tarjeta del desafío (renderDesafio, src/ui/screens/inicio.js) con la fecha fija. Se juega de verdad el desafío del día para
// tener un "tu mejor" real (puntaje y nivel de esa carrera con `criterio`).
export function desafioDelDia() {
  const { seed, eleccion, desafio } = iniciarDesafio(FECHA_FIJA);
  const { state } = jugarCarrera(seed, { eleccion, desafio });
  const entrada = entradaDeResultado(state, FECHA_FIJA);
  const historial = agregarAlHistorial(historialVacio(), entrada);
  const mejor = mejorDelDesafio(historial, FECHA_FIJA);
  const base = (esHoy, fecha) => ({
    kicker: esHoy ? `Desafío del día · ${fecha}` : `Desafío del link · ${fecha}`,
    texto: esHoy
      ? 'Misma carrera para todos hoy: rol, región y pool salen de la fecha. Vos ponés las decisiones.'
      : 'Misma carrera para todos los que jueguen esta fecha: rol, región y pool salen de ahí.',
    boton: 'Jugar el desafío'
  });
  return {
    fecha: FECHA_FIJA,
    seedDelDia: seed,
    jugadorDelDia: jugadorDeLaSeed(seed),
    sinJugar: { ...base(true, FECHA_FIJA), mejor: null },
    conMejor: {
      ...base(true, FECHA_FIJA),
      mejor: { total: mejor.total, nivel: mejor.nivel, intentos: mejor.intentos },
      textoMejor: `Tu mejor: ${miles(mejor.total)} pts · ${mejor.nivel}${mejor.intentos > 1 ? ` · ${mejor.intentos} intentos` : ''}`
    },
    delLink: { ...base(false, '2026-10-02'), hoy: FECHA_FIJA, botonDeHoy: `O el de hoy (${FECHA_FIJA})`, mejor: null },
    resultado: { total: state.tarjeta.puntaje.total, nivel: state.tarjeta.puntaje.nivel.nombre, lineaDeHistorial: lineaDeHistorial(historialVacio(), entrada) }
  };
}

// El historial (renderHistorial): 3 carreras reales de seeds distintas a la héroe, con fechas fijas.
export function historialDeEjemplo(seeds, version = VERSION_JUEGO) {
  const fechas = ['2026-10-05', '2026-10-07', '2026-10-08'];
  let historial = historialVacio();
  const resultados = [];
  seeds.forEach((seed, i) => {
    const { state } = jugarCarrera(seed);
    const entrada = entradaDeResultado(state, fechas[i]);
    historial = agregarAlHistorial(historial, entrada);
    resultados.push({ seed, puntaje: state.tarjeta.puntaje.total, nivel: state.tarjeta.puntaje.nivel.nombre });
  });
  const record = historial.record ? ` · tu récord: ${miles(historial.record.total)} pts (${historial.record.nivel})` : '';
  const filas = historial.entradas.map((e) => ({
    que: e.desafio ? `Desafío ${e.desafio}` : `Seed ${e.seed}`,
    link: linkDeResultado(e, HREF_DE_EJEMPLO),
    pts: `${miles(e.total)} pts`,
    medalla: medallaDeGoldenRoad(e.goldenRoads ?? []),
    detalle: [
      e.handle, etiquetaRol(e.rol), e.nivel, e.jugadoEn === e.desafio ? null : e.jugadoEn,
      e.intentos > 1 ? `${e.intentos} intentos` : null, e.version !== version ? `v ${e.version}, otra versión` : null
    ].filter(Boolean).join(' · ')
  }));
  return { titulo: `Tus últimos resultados${record}`, filas, localStorage: { clave: 'lolcs-historial', valor: historial }, carreras: resultados };
}

// La tarjeta de "Continuar" (continuarDetalle, src/ui/app.js iniciarSetup): sale de una parada real a mitad de carrera.
export function tarjetaContinuar(parada) {
  const j = parada.ficha.jugador;
  const partes = [j.handle, j.rolEtiqueta, j.edad != null ? `${j.edad} años` : null, j.org, parada.franja.cuando.anioEtiqueta];
  return {
    detalle: partes.filter(Boolean).join(' · '),
    partes: { desafio: null, handle: j.handle, rol: j.rolEtiqueta, edad: j.edad, org: j.org, anio: parada.franja.cuando.anioEtiqueta },
    texto: 'Continuar',
    deLaMuestra: parada.sistema + ':' + parada.motivo
  };
}

// De la tabla del barrido (seed, total) saca 3 seeds reales y distintas de la héroe, en los percentiles 20, 50 y 80 del puntaje.
export function seedsParaElHistorial(filas, seedHeroe) {
  const validas = filas.filter((f) => !f.error && f.total != null && f.seed !== seedHeroe).sort((a, b) => a.total - b.total || a.seed - b.seed);
  return [0.2, 0.5, 0.8].map((q) => validas[Math.floor(q * (validas.length - 1))].seed);
}
