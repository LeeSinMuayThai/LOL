import { filaHistoria } from '../components/ficha.js';
import { descargarTarjeta, copiarTarjeta, copiarTexto } from '../exportar.js';
import { miles, textoParaCompartir, linkDeEstado } from '../resultado.js';
import { esBuenPapel } from '../../core/registro.js';
import { goldenRoadsDeEstado, medallaDeGoldenRoad } from '../core/trayectoria.js';
import { apodoDeLealtad, arraigoPorOrg, dueloEterno, finalesPerdidas } from '../../core/legado.js';

// La tarjeta de legado (fase 9R5b, PLAN.md §10.2/§10.3): la pantalla final.
// TODA salida termina acá — la del mundialista con confeti y la del pibe al que
// no lo dejaron, con su propio marco. El veredicto y los totales salen de
// `state.tarjeta` (compuesto por `core/legado.js`); la historia org por org
// reusa `filaHistoria` de la ficha.
//
// K1-B: arriba va el número (`tarjeta.puntaje`) con su referente (regla 13:
// el percentil), el nivel y el HECHO que faltó para el siguiente (los niveles
// se ganan con hechos, no con puntos: revisión de K1-A), su desglose, el techo
// revelado y la leyenda comparada. Los mapas de cada internacional pasan a un
// desplegable cerrado.

const TITULO_MARCO = {
  retiro_elegido: 'SE CIERRA UNA CARRERA',
  sin_equipo: 'EL TELÉFONO DEJÓ DE SONAR',
  burnout: 'NO DABA MÁS',
  no_llego: 'SE CERRÓ LA VENTANA',
  prohibicion_familiar: 'EN CASA DIJERON QUE NO',
  retiro_por_lesion: 'EL CUERPO DIJO BASTA'
};

function linea(clase, texto) {
  const div = document.createElement('div');
  div.className = clase;
  div.textContent = texto;
  return div;
}

function celda(kicker, valor) {
  const el = document.createElement('div');
  el.className = 'tarjeta-celda';
  const k = document.createElement('span');
  k.className = 'tarjeta-celda-k';
  k.textContent = kicker;
  const v = document.createElement('span');
  v.className = 'tarjeta-celda-v';
  v.textContent = valor;
  el.append(k, v);
  return el;
}

// `+232`, `−37`, `0`.
function conSigno(puntos) {
  return puntos > 0 ? `+${miles(puntos)}` : miles(puntos);
}

// --- El número ---

// El escalón de arriba y el hecho que faltó para él ("Te faltó un título de
// liga de primera."), tal como lo escribe `core/puntaje.js`. En el techo, lo dice.
function bloqueSiguiente(nivel) {
  const el = document.createElement('div');
  el.className = 'tarjeta-siguiente';
  if (!nivel.siguiente) {
    el.textContent = 'El techo de la escala: no hay nivel más arriba.';
    return el;
  }
  const k = document.createElement('span');
  k.className = 'tarjeta-siguiente-k';
  k.textContent = `Siguiente escalón: ${nivel.siguiente.nombre}`;
  el.append(k, nivel.siguiente.requisito);
  return el;
}

function bloqueNumero(state, puntaje, lineaHistorial) {
  const el = document.createElement('section');
  el.className = 'tarjeta-numero';
  el.dataset.nivel = puntaje.nivel.id;
  el.setAttribute('aria-label', 'Tu puntaje');
  const desafio = state.desafio?.fecha;
  el.append(
    linea('tarjeta-numero-k', desafio ? `Desafío del ${desafio} · tu puntaje` : 'Tu puntaje'),
    linea('tarjeta-numero-v', miles(puntaje.total)),
    linea('tarjeta-numero-nivel', puntaje.nivel.nombre),
    linea('tarjeta-numero-ref', `Mejor que el ${puntaje.percentil}% de las carreras.`),
    bloqueSiguiente(puntaje.nivel)
  );
  if (lineaHistorial) {
    el.appendChild(linea('tarjeta-numero-historial', lineaHistorial));
  }
  return el;
}

// --- La medalla (FASE V, V5; PLAN.md §V.6) ---

// El Golden Road: en un mismo año calendario, primero en la tabla de los tres splits, campeón de la liga de primera y campeón
// del Mundial. Un logro aparte: no suma puntos ni mueve el escalón (el puntaje no lee `porSplit`), por eso va separado del número.
// Lleva el año; sin ninguno no aparece nada (nunca "0 Golden Roads"). Sale del registro (`goldenRoads`), no de la tarjeta.
function bloqueMedalla(anios) {
  const el = document.createElement('section');
  el.className = 'tarjeta-medalla';
  el.setAttribute('aria-label', 'Golden Road');
  el.append(
    linea('tarjeta-medalla-k', 'Logro aparte'),
    linea('tarjeta-medalla-v', medallaDeGoldenRoad(anios)),
    linea('tarjeta-medalla-detalle',
      'Primero en la tabla de los tres splits, campeón de la liga y campeón del Mundial, todo en el mismo año. Hasta ahora, en la vida real, nadie lo consiguió. No suma puntos: es una medalla.')
  );
  return el;
}

// --- De dónde sale ---

function filaDeDesglose(etiqueta, puntos, detalle, modificador = null) {
  const fila = document.createElement('div');
  fila.className = 'tarjeta-comp' + (modificador ? ` tarjeta-comp--${modificador}` : '');
  const nombre = document.createElement('span');
  nombre.className = 'tarjeta-comp-nombre';
  nombre.textContent = etiqueta;
  const valor = document.createElement('span');
  valor.className = 'tarjeta-comp-puntos';
  valor.textContent = puntos;
  fila.append(nombre, valor);
  if (detalle) {
    fila.appendChild(linea('tarjeta-comp-detalle', detalle));
  }
  return fila;
}

function bloqueDesglose(puntaje, BALANCE) {
  const el = document.createElement('section');
  el.className = 'tarjeta-desglose';
  el.appendChild(linea('tarjeta-historia-titulo', 'DE DÓNDE SALE EL NÚMERO'));
  // Los componentes en cero se ven atenuados: también dicen algo (qué no
  // llegaste a tocar), pero no compiten con lo que sí sumó.
  for (const c of puntaje.componentes) {
    el.appendChild(filaDeDesglose(c.etiqueta, conSigno(c.puntos), c.detalle, c.puntos === 0 ? 'cero' : null));
  }
  el.appendChild(filaDeDesglose('Subtotal', miles(puntaje.subtotal), null, 'subtotal'));
  // El potencial con su escala (regla 13): un "64" suelto no dice nada.
  const { factor, puntos, detalle } = puntaje.potencial;
  const { potencialMin, potencialMax } = BALANCE.mundo;
  const factorTexto = `×${factor.toFixed(2).replace('.', ',')}`;
  el.appendChild(filaDeDesglose('Tu potencial, revelado', `${conSigno(puntos)} (${factorTexto})`,
    `${detalle} El potencial va de ${potencialMin} a ${potencialMax}.`, 'techo'));
  el.appendChild(filaDeDesglose('Total', miles(puntaje.total), null, 'total'));
  return el;
}

// --- La leyenda comparada ---

function rankTexto(rank) {
  return rank > 0 ? `#${rank}` : '—';
}

function bloqueLeyenda(state, puntaje, modulos) {
  const { leyenda, perfil } = puntaje;
  const el = document.createElement('section');
  el.className = 'tarjeta-leyenda';
  el.appendChild(linea('tarjeta-historia-titulo', 'TU CARRERA SE PARECE A LA DE…'));
  el.appendChild(linea('tarjeta-leyenda-handle', leyenda.handle));
  el.appendChild(linea('tarjeta-leyenda-meta', `${modulos.etiquetaRol(leyenda.rol)} · ${leyenda.region}`));
  el.appendChild(linea('tarjeta-leyenda-historia', leyenda.historia));

  // Lado a lado (regla 13): sus números contra los tuyos, no sueltos.
  const tabla = document.createElement('div');
  tabla.className = 'tarjeta-leyenda-tabla';
  const filas = [
    ['', 'Años pro', 'Títulos 1ª', 'Intl', 'Pico'],
    [leyenda.handle, leyenda.anios, leyenda.titulos, leyenda.internacionales, rankTexto(leyenda.rankPico)],
    [state.player.name, perfil.anios, perfil.titulos, perfil.internacionales, rankTexto(perfil.rankPico)]
  ];
  filas.forEach((fila, i) => {
    fila.forEach((valor, j) => {
      const c = document.createElement('span');
      c.className = i === 0 ? 'tarjeta-leyenda-k' : (j === 0 ? 'tarjeta-leyenda-quien' : 'tarjeta-leyenda-v');
      c.textContent = String(valor);
      tabla.appendChild(c);
    });
  });
  el.appendChild(tabla);
  return el;
}

// --- Los internacionales, mapa por mapa (desplegable cerrado) ---

// K5-A: cada Mundial dice hasta dónde llegaste y su camino es partido a partido (Swiss) y serie a serie (bracket).
// Los registros de antes de K5 traen el camino mapa a mapa y `buen_papel`/`eliminado`.
const RESULTADO_INTL = {
  campeon: 'Campeón del mundo', final: 'Subcampeón', semis: 'Semifinal', cuartos: 'Cuartos',
  eliminado: 'Afuera', buen_papel: 'Buen papel'
};
const ETAPA_INTL = { swiss: 'Swiss', cuartos: 'Cuartos', semis: 'Semis', final: 'Final' };

function lineaDeCamino(m) {
  if (m.etapa) {
    const marcador = m.marcador ? ` ${m.marcador[0]}-${m.marcador[1]}` : '';
    const ronda = m.etapa === 'swiss' ? ` R${m.ronda}` : '';
    return { gano: m.gano, texto: `${ETAPA_INTL[m.etapa]}${ronda} [${m.gano ? 'G' : 'P'}${marcador}] vs ${m.rival}` };
  }
  return { gano: m.resultado === 'W', texto: `M${m.mapa} [${m.resultado} ${m.marcador}] ${m.campeon}${m.cierre ? ` — ${m.cierre}` : ''}` };
}

function bloqueInternacionales(internacionales) {
  const intlSec = document.createElement('details');
  intlSec.className = 'tarjeta-internacionales';
  const resumen = document.createElement('summary');
  const buenos = internacionales.filter(esBuenPapel).length;
  const mundiales = internacionales.filter((intl) => intl.resultado === 'campeon').length;
  resumen.textContent = `Mundiales · ${internacionales.length} (${buenos} pasando el Swiss${mundiales > 0 ? `, ${mundiales} ganado${mundiales > 1 ? 's' : ''}` : ''}) · partido a partido`;
  intlSec.appendChild(resumen);
  for (const intl of internacionales) {
    const bloque = document.createElement('div');
    bloque.className = 'tarjeta-intl-bloque';

    const enc = document.createElement('div');
    enc.className = 'tarjeta-intl-encabezado';
    const res = RESULTADO_INTL[intl.resultado] ?? intl.resultado;
    const record = intl.record ? ` (Swiss ${intl.record})` : '';
    enc.textContent = `${intl.torneo} (${intl.anio}) · ${intl.org} · ${res}${record}`;
    bloque.appendChild(enc);

    if (Array.isArray(intl.camino) && intl.camino.length > 0) {
      const caminoEl = document.createElement('div');
      caminoEl.className = 'tarjeta-intl-camino';
      for (const m of intl.camino) {
        const lineaM = document.createElement('div');
        const { gano, texto } = lineaDeCamino(m);
        lineaM.className = `tarjeta-intl-mapa tarjeta-intl-mapa--${gano ? 'ganado' : 'perdido'}`;
        lineaM.textContent = texto;
        caminoEl.appendChild(lineaM);
      }
      bloque.appendChild(caminoEl);
    }
    intlSec.appendChild(bloque);
  }
  return intlSec;
}

// --- W1 · El final cuenta la historia (PLANUI §0.7, W6) ---

// El apodo de la lealtad, arriba de todo ("LEYENDA DE T1"), con el veredicto de siempre como bajada.
function bloqueApodo(apodo, veredicto) {
  const el = document.createElement('section');
  el.className = `tarjeta-apodo tarjeta-apodo--${apodo.id}`;
  el.setAttribute('aria-label', 'Tu apodo');
  el.append(
    linea('tarjeta-apodo-k', apodo.id === 'leyenda' ? 'Para los fans, para siempre' : 'Para los fans'),
    linea('tarjeta-apodo-v', apodo.texto),
    linea('tarjeta-veredicto tarjeta-veredicto--sub', veredicto)
  );
  return el;
}

// Una org de la historia con el escalón al que llegaste: el nombre, el valor y una barra chica con las marcas de cada
// escalón (Querido, Ídolo, Leyenda). Ídolo y Leyenda se pintan: es lo que los fans recuerdan.
function filaDeOrg(fila, arraigo, anioDeCierre, hitos) {
  const el = document.createElement('div');
  el.className = `tarjeta-org tarjeta-org--${arraigo.id}`;
  el.appendChild(filaHistoria(fila, anioDeCierre));
  const escalon = document.createElement('div');
  escalon.className = 'tarjeta-org-arraigo';
  const nombre = document.createElement('span');
  nombre.className = 'tarjeta-org-escalon';
  nombre.textContent = arraigo.label;
  const valor = document.createElement('span');
  valor.className = 'tarjeta-org-valor';
  valor.textContent = String(arraigo.valor);
  const barra = document.createElement('span');
  barra.className = 'tarjeta-org-barra';
  barra.style.setProperty('--v', String(arraigo.valor));
  barra.setAttribute('aria-hidden', 'true');
  for (const id of ['querido', 'idolo', 'leyenda']) {
    const marca = document.createElement('i');
    marca.style.setProperty('--tj-m', String(hitos[id]));
    barra.appendChild(marca);
  }
  escalon.append(nombre, valor, barra);
  el.appendChild(escalon);
  return el;
}

// "Las que se escaparon": las finales que jugaste y perdiste (el Mundial y, desde F3, las de la liga), con año, org y rival.
function bloqueEscapadas(finales) {
  const el = document.createElement('section');
  el.className = 'tarjeta-escapadas';
  el.appendChild(linea('tarjeta-historia-titulo', 'LAS QUE SE ESCAPARON'));
  for (const f of finales) {
    // el ganador primero, como el log de la serie: `marcador` es [tuyo, suyo] y la final se perdió
    const marcador = f.marcador ? ` · ${f.marcador[1]}-${f.marcador[0]}` : '';
    const rival = f.rival ? ` vs ${f.rival}` : '';
    el.appendChild(linea('tarjeta-escapada', `${f.etiqueta ?? `Final del ${f.competicion}`} ${f.anio}${rival}${marcador} · con ${f.org}`));
  }
  // F3: si alguna es de la liga, el pie ya no puede hablar solo del mundo.
  const todasDelMundial = finales.every((f) => f.mundial !== false);
  el.appendChild(linea('tarjeta-escapada-pie', todasDelMundial
    ? (finales.length === 1 ? 'A una serie de ser campeón del mundo.' : `${finales.length} veces a una serie de ser campeón del mundo.`)
    : (finales.length === 1 ? 'A una serie de la copa.' : `${finales.length} veces a una serie de la copa.`)));
  return el;
}

const VEREDICTO_DUELO = {
  vos: (d) => (d.porTrofeos ? 'Lo ganaste vos.' : 'Lo ganaste vos: mismos trofeos, pero llegaste más alto.'),
  el: (d) => (d.porTrofeos ? `Se lo llevó ${d.handle}.` : `Se lo llevó ${d.handle}: mismos trofeos, pero llegó más alto.`),
  empate: () => 'Tablas: ninguno le sacó una sola ventaja al otro.'
};

// "EL DUELO ETERNO": vos contra el archirrival de toda la carrera, lado a lado (regla 13), y quién se lo llevó.
function bloqueDuelo(duelo, nombre) {
  const el = document.createElement('section');
  el.className = `tarjeta-duelo tarjeta-duelo--${duelo.ganador}`;
  el.setAttribute('aria-label', 'El duelo eterno');
  el.appendChild(linea('tarjeta-historia-titulo', 'EL DUELO ETERNO'));
  el.appendChild(linea('tarjeta-duelo-marcador', `${nombre} ${duelo.tuyos} · ${duelo.suyos} ${duelo.handle}`));
  const donde = duelo.orgs.length > 0 ? ` (${duelo.orgs.join(', ')})` : '';
  el.appendChild(linea('tarjeta-duelo-meta',
    `${duelo.handle}${donde}, el rival de toda tu carrera. Cuentan los títulos de liga y los Mundiales.`));
  const tabla = document.createElement('div');
  tabla.className = 'tarjeta-duelo-tabla';
  const celdaDuelo = (clase, texto) => {
    const c = document.createElement('span');
    c.className = clase;
    c.textContent = String(texto);
    tabla.appendChild(c);
  };
  celdaDuelo('tarjeta-duelo-k', '');
  celdaDuelo('tarjeta-duelo-k tarjeta-duelo-quien', nombre);
  celdaDuelo('tarjeta-duelo-k tarjeta-duelo-quien', duelo.handle);
  for (const f of duelo.filas) {
    celdaDuelo('tarjeta-duelo-fila', f.etiqueta);
    celdaDuelo(`tarjeta-duelo-v${f.tuyos > f.suyos ? ' tarjeta-duelo-v--gana' : ''}`, f.tuyos);
    celdaDuelo(`tarjeta-duelo-v${f.suyos > f.tuyos ? ' tarjeta-duelo-v--gana' : ''}`, f.suyos);
  }
  el.appendChild(tabla);
  el.appendChild(linea('tarjeta-duelo-veredicto', VEREDICTO_DUELO[duelo.ganador](duelo)));
  return el;
}

// `extras.lineaHistorial`: la línea "tu mejor…" que arma `app.js` con el
// historial local (puede faltar: el historial es una conveniencia).
export function renderTarjeta(container, state, modulos, extras = {}) {
  const t = state.tarjeta;
  if (!t) {
    return;
  }
  const { formato } = modulos;

  container.replaceChildren();
  container.hidden = false;
  container.className = 'tarjeta' + (t.esExito ? ' tarjeta--exito' : ' tarjeta--sobria');
  container.dataset.marco = t.finAnticipado ?? 'retiro_elegido';

  container.appendChild(linea('tarjeta-marco', TITULO_MARCO[t.finAnticipado] ?? 'FIN DE LA CARRERA'));
  // K5-C: el motivo del retiro, dicho como lo dijo el mercado (o la edad, o vos).
  if (t.motivo) {
    container.appendChild(linea('tarjeta-motivo', t.motivo));
  }
  container.appendChild(linea('tarjeta-identidad',
    `${state.player.name} · ${modulos.etiquetaRol(state.player.role)} · se retiró a los ${t.edadRetiro}`));

  // W1: si los fans te hicieron Ídolo o Leyenda en algún lado, ese es el titular; el veredicto pasa a ser la bajada.
  const registro = state.career?.registro ?? null;
  const apodo = registro ? apodoDeLealtad(registro) : null;
  if (apodo) {
    container.appendChild(bloqueApodo(apodo, t.veredicto));
  }

  if (t.puntaje) {
    container.appendChild(bloqueNumero(state, t.puntaje, extras.lineaHistorial ?? null));
    const goldenRoads = goldenRoadsDeEstado(state);
    if (goldenRoads.length > 0) {
      container.appendChild(bloqueMedalla(goldenRoads));
    }
    container.appendChild(bloqueDesglose(t.puntaje, modulos.BALANCE));
    container.appendChild(bloqueLeyenda(state, t.puntaje, modulos));
  }

  if (!apodo) {
    container.appendChild(linea('tarjeta-veredicto', t.veredicto));
  }

  const totales = t.totales;
  const franja = document.createElement('div');
  franja.className = 'tarjeta-totales';
  // K5c-R: la caja cuenta los años pro (desde el primer contrato de tier 2 o tier 1), no los de vida desde los 15.
  franja.appendChild(celda('Años pro', String(totales.anios)));
  franja.appendChild(celda('Splits', String(totales.splits)));
  franja.appendChild(celda('Títulos', String(totales.titulos)));
  if (totales.internacionales > 0) {
    franja.appendChild(celda('Intl', String(totales.internacionales)));
  }
  franja.appendChild(celda('Nivel máx', String(totales.nivelMax)));
  if (totales.valorMaxUSD > 0) {
    franja.appendChild(celda('Valor máx', formato.plata(totales.valorMaxUSD)));
  }
  container.appendChild(franja);

  if (t.historia.length > 0) {
    const historia = document.createElement('div');
    historia.className = 'tarjeta-historia';
    historia.appendChild(linea('tarjeta-historia-titulo', 'TU HISTORIA, ORG POR ORG'));
    // W1: cada org con el escalón de arraigo al que llegaste (del registro; una tarjeta sin registro queda como antes).
    const arraigos = registro ? arraigoPorOrg(registro) : [];
    historia.append(...t.historia.map((fila, i) => (arraigos[i]?.org === fila.org
      ? filaDeOrg(fila, arraigos[i], state.calendario?.anio, modulos.BALANCE.arraigo.hitos)
      : filaHistoria(fila, state.calendario?.anio))));
    container.appendChild(historia);
  }

  const escapadas = registro ? finalesPerdidas(registro) : [];
  if (escapadas.length > 0) {
    container.appendChild(bloqueEscapadas(escapadas));
  }
  const duelo = registro && state.mundo ? dueloEterno(state) : null;
  if (duelo) {
    container.appendChild(bloqueDuelo(duelo, state.player.name));
  }

  const internacionales = state.career?.registro?.internacionales ?? t.internacionales ?? [];
  if (internacionales.length > 0) {
    container.appendChild(bloqueInternacionales(internacionales));
  }

  container.appendChild(crearAcciones(state, modulos));
}

function botonConEstado(texto, accion, clase = '') {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'tarjeta-accion-btn' + (clase ? ` ${clase}` : '');
  boton.textContent = texto;
  boton.addEventListener('click', async () => {
    boton.disabled = true;
    const original = boton.textContent;
    try {
      await accion(boton);
    } finally {
      setTimeout(() => { boton.textContent = original; boton.disabled = false; }, 1800);
    }
  });
  return boton;
}

// Si el portapapeles no deja, el texto queda a la vista para copiarlo a mano.
function mostrarParaCopiar(acciones, texto) {
  let salida = acciones.parentElement?.querySelector('.tarjeta-compartir-texto');
  if (!salida) {
    salida = document.createElement('output');
    salida.className = 'tarjeta-compartir-texto';
    acciones.after(salida);
  }
  salida.textContent = texto;
}

function crearAcciones(state, modulos) {
  const acciones = document.createElement('div');
  acciones.className = 'tarjeta-acciones';

  if (state.tarjeta.puntaje) {
    acciones.appendChild(botonConEstado('Copiar resultado', async (boton) => {
      const texto = textoParaCompartir(state, location.href);
      const copiado = await copiarTexto(texto);
      boton.textContent = copiado ? '¡Copiado!' : 'Copialo de abajo';
      if (!copiado) {
        mostrarParaCopiar(acciones, texto);
      }
    }, 'tarjeta-accion-btn--principal'));
  }

  acciones.appendChild(botonConEstado('Copiar imagen', async (boton) => {
    const copiado = await copiarTarjeta(state, modulos);
    if (copiado) {
      boton.textContent = '¡Copiada!';
    } else {
      await descargarTarjeta(state, modulos);
      boton.textContent = 'Se bajó como archivo';
    }
  }));

  acciones.appendChild(botonConEstado('Bajar imagen', async (boton) => {
    await descargarTarjeta(state, modulos);
    boton.textContent = '¡Bajada!';
  }));

  acciones.appendChild(botonConEstado(state.desafio ? 'Copiar link del desafío' : 'Copiar link de esta carrera', async (boton) => {
    const link = linkDeEstado(state, location.href);
    const copiado = await copiarTexto(link);
    boton.textContent = copiado ? '¡Copiado!' : 'Copialo de abajo';
    if (!copiado) {
      mostrarParaCopiar(acciones, link);
    }
  }));

  return acciones;
}
