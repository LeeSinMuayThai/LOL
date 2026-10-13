// El acompañante (FASE V, V2-C; PLAN.md §V.4 y regla 6 de §V.3: "el escritorio suma un solo panel: el contexto de la
// pieza actual, nunca seis"; el marco de la vitrina, PLANUI §0.2). Un `<aside id="acompanante" class="contexto">` que solo
// existe a la vista desde 1180 px (`estilos/shell.css`): la placa "Vos" de la vitrina (el nivel o la jerarquía en grande,
// las filas con su medidor, el duelo, el contrato y tu campeón del split) o, según la pieza, el contexto que le toca en la
// misma placa (la tabla, la serie, la previa, la carrera). Qué muestra lo decide `acompananteDe(estado, pieza)`
// (`ui/core/escena.js`, pura); acá solo se pinta.
//
// Se pinta desde la `vista` (lo que la pantalla ya contó) y con la pieza que el director acaba de poner: mientras el
// relato cuenta un split no cambia. El `tipo` queda en `data-acompanante` (vacío = ninguno: el aside no ocupa lugar).
// Debajo de 1180 px no hay aside: en una parada con cuarto equivalente, el chip "ver contexto" (`#verContexto`) abre ese
// cuarto. La barra de los cuartos marca (`aria-current`) el cuarto que corresponde al contexto de la pieza.
import { acompananteDe } from './core/escena.js';
import { fichaCompleta } from '../core/ficha.js';
import { acompanante as acompanantePartido } from './paradas/partido.js';
import { acompanante as acompananteCarrera } from './cuartos/carrera.js';
import { TITULOS_DE_CUARTOS } from './cuartos.js';
import { icono, triangulos } from './fx/iconos.js';
import { num, odometro } from './fx/movimiento.js';

// El corte desde el que el acompañante existe (el mismo de `shell.css`).
const CONSULTA_ANCHA = '(min-width: 1180px)';
// El cuarto que dice el contexto de las piezas de pantalla completa (sin acompañante): la barra lo marca igual.
const CUARTO_DE_PIEZA = { partido: 'temporada', mercado: 'mundo' };
const KICKER_DE_TIPO = { tabla: 'Temporada', serie: 'La serie', swiss: 'El Swiss', previa: 'La previa', carrera: 'Tu carrera' };

function nodo(etiqueta, clase, texto = null) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== null) el.textContent = texto;
  return el;
}

// Una fila de la placa: el rótulo con su glifo, el valor, el estado (la etiqueta de la banda, el delta, el rango) y el
// medidor (con la banda de la jerarquía o el arraigo cuando la hay).
function fila(campo, rotulo, valor, estado, { delta = 0, piso = null, techo = null, max = 100, ico = null } = {}) {
  const medidor = nodo('span', 'medidor');
  medidor.setAttribute('aria-hidden', 'true');
  if (piso != null) {
    const banda = nodo('i', 'banda');
    banda.style.left = `${(piso / max) * 100}%`;
    banda.style.width = `${((techo - piso) / max) * 100}%`;
    medidor.append(banda);
  }
  const barra = nodo('i', 'valor');
  barra.style.width = `${Math.max(0, Math.min(100, (valor / max) * 100))}%`;
  medidor.append(barra);

  const rot = nodo('span', 'ctx-rotulo');
  if (ico) rot.append(icono(ico));
  rot.append(document.createTextNode(rotulo));
  const est = nodo('span', 'ctx-estado');
  if (estado) est.append(document.createTextNode(estado));
  if (delta) {
    const d = nodo('span', `ctx-delta ${delta > 0 ? 'sube' : 'baja'}`);
    d.append(triangulos('baja', delta > 0 ? '+' : '-'), document.createTextNode(String(Math.abs(delta))));
    est.append(d);
  }
  if (piso != null) est.append(nodo('span', 'ctx-rango', `${piso}–${techo}`));
  const caja = nodo('div', 'ctx-fila');
  caja.dataset.campo = campo;
  caja.append(rot, nodo('b', 'ctx-valor', num(valor)), est, medidor);
  return caja;
}

function filaPie(rotulo, valor, texto, { campeon = null } = {}) {
  const p = nodo('p', 'ctx-duelo');
  const b = nodo('b', campeon ? 'campeon-foco' : null, valor);
  if (campeon) {
    b.dataset.campeon = campeon;
    b.tabIndex = 0;
  }
  p.append(nodo('span', 'ctx-rotulo', rotulo), b, nodo('span', null, texto));
  return p;
}

// La placa "Vos" (el `contexto()` de la vitrina, `vitrina/fusion/js/marco.js`). La cabeza dice lo que la franja NO dice:
// en el profesional la franja ya muestra el nivel, así que acá va la jerarquía; en el amateur, el nivel de juego.
export function pintarVos(caja, estado) {
  const f = fichaCompleta(estado);
  const p = estado.player;
  const amateur = estado.phase === 'amateur';
  const kicker = nodo('p', 'ctx-kicker');
  kicker.append(nodo('span', null, 'Vos'), nodo('span', null, [estado.age != null ? `${estado.age} años` : null, estado.calendario?.anio].filter(Boolean).join(' · ')));
  caja.append(kicker);

  const cabeza = nodo('div', 'ctx-cabeza');
  if (!amateur && estado.career?.currentOrg) {
    const jer = f.jerarquia;
    const grande = nodo('div', 'ctx-grande');
    grande.dataset.campo = 'jerarquia';
    grande.append(nodo('span', 'ctx-rotulo', 'Jerarquía'), nodo('b', 'ctx-numero', num(jer.valor)));
    const lado = nodo('div', 'ctx-lado');
    lado.append(nodo('span', 'ctx-banda', jer.label), nodo('span', 'ctx-sub', `en ${estado.career.currentOrg} · banda ${jer.piso}–${jer.techo}`));
    const medidor = nodo('span', 'medidor ctx-medidor');
    medidor.setAttribute('aria-hidden', 'true');
    const banda = nodo('i', 'banda');
    banda.style.left = `${jer.piso}%`;
    banda.style.width = `${jer.techo - jer.piso}%`;
    const valor = nodo('i', 'valor');
    valor.style.width = `${Math.min(100, jer.valor)}%`;
    medidor.append(banda, valor);
    cabeza.append(grande, lado, medidor);
  } else {
    const grande = nodo('div', 'ctx-grande');
    grande.dataset.campo = 'nivel';
    grande.append(nodo('span', 'ctx-rotulo', 'Nivel'), nodo('b', 'ctx-numero', num(f.nivel)));
    const lado = nodo('div', 'ctx-lado');
    lado.append(nodo('span', 'ctx-banda', amateur ? 'Amateur' : 'Agente libre'), nodo('span', 'ctx-sub', 'tu nivel de juego, de 100'));
    cabeza.append(grande, lado);
  }
  caja.append(cabeza);

  const filas = nodo('div', 'ctx-filas');
  if (amateur) {
    filas.append(
      fila('studies', 'Estudios', p.studies, null, { ico: 'studies' }),
      fila('sleep', 'Sueño', p.sleep, null, { ico: 'sleep' }),
      fila('familyTrust', 'Casa', p.familyTrust, 'confianza', { ico: 'familyTrust' }),
      fila('mentalidad', 'Cabeza', f.mentalidad.valor, f.mentalidad.label, { delta: f.mentalidad.delta, ico: 'mentalidad' }),
      fila('hype', 'Hype', f.hype.valor, f.hype.label, { delta: f.hype.delta, ico: 'hype' })
    );
  } else {
    filas.append(
      fila('hype', 'Hype', f.hype.valor, f.hype.label, { delta: f.hype.delta, ico: 'hype' }),
      fila('mentalidad', 'Cabeza', f.mentalidad.valor, f.mentalidad.label, { delta: f.mentalidad.delta, ico: 'mentalidad' })
    );
    if (estado.career?.currentOrg) {
      filas.append(fila('arraigo', 'Arraigo', Math.round(f.arraigo.valor), f.arraigo.label, { piso: f.arraigo.piso, techo: f.arraigo.techo, ico: 'arraigo' }));
    }
  }
  caja.append(filas);

  const pie = nodo('div', 'ctx-pie');
  if (f.duelo) pie.append(filaPie('Duelo', `${f.duelo.tuyos}–${f.duelo.suyos}`, `vs ${f.duelo.handle} · ${f.duelo.org}`));
  const contrato = estado.career?.contrato;
  if (contrato?.org) {
    const r = contrato.aniosRestantes;
    pie.append(filaPie('Contrato', String(r), `${r === 1 ? 'año más' : 'años más'} en ${contrato.org}`));
  }
  if (p.campeonDelSplit) pie.append(filaPie('Split', p.campeonDelSplit, 'tu campeón de este split', { campeon: p.campeonDelSplit }));
  if (pie.childElementCount) caja.append(pie);
}

// Los otros tipos: el kicker de la placa y el renderer de su dueño adentro (la tabla, la serie, la previa y la carrera).
function enLaPlaca(tipo, pintor) {
  return (caja, estado, contexto) => {
    const kicker = nodo('p', 'ctx-kicker');
    kicker.append(nodo('span', null, KICKER_DE_TIPO[tipo] ?? ''), nodo('span', null, estado.calendario?.etiqueta ?? ''));
    const cuerpo = nodo('div', 'ctx-cuerpo');
    caja.append(kicker, cuerpo);
    pintor(cuerpo, estado, contexto);
  };
}

const PINTORES = {
  vos: (caja, estado) => pintarVos(caja, estado),
  tabla: enLaPlaca('tabla', (caja, estado, { ui }) => {
    const panel = nodo('div', 'panel-contexto');
    caja.appendChild(panel);
    ui.renderTabla(panel, estado);
  }),
  serie: enLaPlaca('serie', acompanantePartido),
  swiss: enLaPlaca('swiss', acompanantePartido),
  previa: enLaPlaca('previa', acompanantePartido),
  carrera: enLaPlaca('carrera', acompananteCarrera)
};

// `aside`: `#acompanante`. `chip`: `#verContexto`. `barra`: `#cuartosBarra`. `contexto`: `{ ui, modulos }`.
// `abrirCuarto(id)`: el de los cuartos.
export function crearAcompanante({ aside, chip, barra = null, contexto, abrirCuarto }) {
  const ancho = window.matchMedia?.(CONSULTA_ANCHA) ?? null;
  let ultimo = { estado: null, pieza: null };

  function marcarBarra(cuarto) {
    for (const boton of barra?.querySelectorAll('[data-cuarto]') ?? []) {
      if (boton.dataset.cuarto === cuarto) boton.setAttribute('aria-current', 'page');
      else boton.removeAttribute('aria-current');
    }
  }

  function pintar(estado, pieza) {
    ultimo = { estado, pieza };
    const { tipo, cuarto } = acompananteDe(estado, pieza);
    aside.dataset.acompanante = tipo ?? '';
    aside.hidden = !tipo;
    aside.replaceChildren();
    // Debajo del corte el aside no se ve: no se pinta (vuelve a pintarse si la ventana se agranda).
    if (tipo && (ancho?.matches ?? true)) {
      try {
        PINTORES[tipo](aside, estado, contexto);
      } catch (error) {
        console.error(`No se pudo pintar el acompañante ${tipo}:`, error);
      }
    }
    marcarBarra(cuarto ?? CUARTO_DE_PIEZA[pieza] ?? null);
    if (chip) {
      chip.hidden = !cuarto;
      chip.dataset.cuarto = cuarto ?? '';
      chip.replaceChildren(...(cuarto ? [icono('nivel'), document.createTextNode(`Ver contexto · ${TITULOS_DE_CUARTOS[cuarto]}`)] : []));
    }
  }

  // PLANUI §0.2 (narrar en el lugar): los números del resultado de una parada ruedan en la placa, desde lo que mostraba
  // hasta lo que quedó (`cambios`: los de `ui/core/inmediato.js`). Devuelve los nodos que animó (la narración los
  // termina con Espacio y los pausa con un cuarto abierto). La placa se vuelve a pintar entera cuando cambia la `vista`.
  function rodar(cambios, retardo = 0) {
    const animados = [];
    if (aside.hidden) return animados;
    for (const c of cambios ?? []) {
      if (!Number.isFinite(c.antes) || !Number.isFinite(c.despues)) continue;
      const campo = c.campo.split('.').pop();
      const valor = aside.querySelector(`[data-campo="${campo}"] .ctx-valor, [data-campo="${campo}"] .ctx-numero`);
      const a = Math.round(c.antes);
      const b = Math.round(c.despues);
      if (!valor || a === b) continue;
      odometro(valor, a, b, { delay: retardo });
      const caja = valor.closest('[data-campo]');
      caja.classList.add(b > a ? 'cambio-sube' : 'cambio-baja');
      const barra = caja.querySelector('.medidor .valor');
      if (barra) barra.style.width = `${Math.max(0, Math.min(100, b))}%`;
      animados.push(caja);
    }
    return animados;
  }

  ancho?.addEventListener?.('change', () => pintar(ultimo.estado, ultimo.pieza));
  chip?.addEventListener('click', () => {
    if (chip.dataset.cuarto) abrirCuarto(chip.dataset.cuarto);
  });

  return { pintar, rodar };
}
