import { filaHistoria } from '../components/ficha.js';
import { descargarTarjeta, copiarTarjeta, copiarTexto } from '../exportar.js';
import { miles, textoParaCompartir, linkDeEstado } from '../resultado.js';

// La tarjeta de legado (fase 9R5b, PLAN.md §10.2/§10.3): la pantalla final.
// TODA salida termina acá — la del mundialista con confeti y la del pibe al que
// no lo dejaron, con su propio marco. El veredicto y los totales salen de
// `state.tarjeta` (compuesto por `core/legado.js`); la historia org por org
// reusa `filaHistoria` de la ficha.
//
// K1-B: arriba va el número (`tarjeta.puntaje`) con su referente (regla 13:
// nivel, percentil y lo que faltó para el siguiente), su desglose, el techo
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

function textoDelSiguiente(nivel) {
  if (nivel.id === 'no_llego') {
    return 'Sin contrato no hay escalera: el primer escalón era fichar.';
  }
  if (!nivel.siguiente) {
    return 'El techo de la escala: no hay nivel más arriba.';
  }
  return `Te faltaron ${miles(nivel.siguiente.faltan)} pts para ${nivel.siguiente.nombre}.`;
}

// La barra entre el corte de tu nivel y el del siguiente: dónde quedaste
// adentro del escalón. Solo si hay un escalón siguiente.
function barraDeNivel(puntaje, BALANCE) {
  const { nivel, total } = puntaje;
  const corte = BALANCE.puntaje.niveles.find((n) => n.id === nivel.id);
  if (!corte || !nivel.siguiente) {
    return null;
  }
  const hasta = total + nivel.siguiente.faltan;
  const avance = Math.max(0, Math.min(1, (total - corte.desde) / (hasta - corte.desde)));

  const wrap = document.createElement('div');
  wrap.className = 'tarjeta-escalon';
  const pista = document.createElement('div');
  pista.className = 'ficha-barra-pista';
  const relleno = document.createElement('div');
  relleno.className = 'ficha-barra-relleno';
  relleno.style.width = `${Math.round(avance * 100)}%`;
  pista.appendChild(relleno);
  const extremos = document.createElement('div');
  extremos.className = 'tarjeta-escalon-extremos';
  const desde = document.createElement('span');
  desde.textContent = `${nivel.nombre} · ${miles(corte.desde)}`;
  const aHasta = document.createElement('span');
  aHasta.textContent = `${nivel.siguiente.nombre} · ${miles(hasta)}`;
  extremos.append(desde, aHasta);
  wrap.append(pista, extremos);
  return wrap;
}

function bloqueNumero(state, puntaje, modulos, lineaHistorial) {
  const el = document.createElement('section');
  el.className = 'tarjeta-numero';
  el.dataset.nivel = puntaje.nivel.id;
  el.setAttribute('aria-label', 'Tu puntaje');
  const desafio = state.desafio?.fecha;
  el.append(
    linea('tarjeta-numero-k', desafio ? `Desafío del ${desafio} · tu puntaje` : 'Tu puntaje'),
    linea('tarjeta-numero-v', miles(puntaje.total)),
    linea('tarjeta-numero-nivel', puntaje.nivel.nombre),
    linea('tarjeta-numero-ref', `Mejor que el ${puntaje.percentil}% de las carreras.`)
  );
  const barra = barraDeNivel(puntaje, modulos.BALANCE);
  if (barra) {
    el.appendChild(barra);
  }
  el.appendChild(linea('tarjeta-numero-ref', textoDelSiguiente(puntaje.nivel)));
  if (lineaHistorial) {
    el.appendChild(linea('tarjeta-numero-historial', lineaHistorial));
  }
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
  // El techo con su escala (regla 13): un "64" suelto no dice nada.
  const { factor, puntos, detalle } = puntaje.potencial;
  const { potencialMin, potencialMax } = BALANCE.mundo;
  const factorTexto = `×${factor.toFixed(2).replace('.', ',')}`;
  el.appendChild(filaDeDesglose('Tu techo, revelado', `${conSigno(puntos)} (${factorTexto})`,
    `${detalle} Los techos van de ${potencialMin} a ${potencialMax}.`, 'techo'));
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
    ['', 'Años', 'Títulos', 'Intl', 'Pico'],
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

function bloqueInternacionales(internacionales) {
  const intlSec = document.createElement('details');
  intlSec.className = 'tarjeta-internacionales';
  const resumen = document.createElement('summary');
  const buenos = internacionales.filter((intl) => intl.resultado === 'buen_papel').length;
  resumen.textContent = `Torneos internacionales · ${internacionales.length} (${buenos} con buen papel) · mapa por mapa`;
  intlSec.appendChild(resumen);
  for (const intl of internacionales) {
    const bloque = document.createElement('div');
    bloque.className = 'tarjeta-intl-bloque';

    const enc = document.createElement('div');
    enc.className = 'tarjeta-intl-encabezado';
    const res = intl.resultado === 'buen_papel' ? 'Buen papel' : 'Eliminado';
    enc.textContent = `${intl.torneo} (${intl.anio}) · ${intl.org} · ${res}`;
    bloque.appendChild(enc);

    if (Array.isArray(intl.camino) && intl.camino.length > 0) {
      const caminoEl = document.createElement('div');
      caminoEl.className = 'tarjeta-intl-camino';
      for (const m of intl.camino) {
        const lineaM = document.createElement('div');
        lineaM.className = `tarjeta-intl-mapa tarjeta-intl-mapa--${m.resultado === 'W' ? 'ganado' : 'perdido'}`;
        lineaM.textContent = `M${m.mapa} [${m.resultado} ${m.marcador}] ${m.campeon}${m.cierre ? ` — ${m.cierre}` : ''}`;
        caminoEl.appendChild(lineaM);
      }
      bloque.appendChild(caminoEl);
    }
    intlSec.appendChild(bloque);
  }
  return intlSec;
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
  container.appendChild(linea('tarjeta-identidad',
    `${state.player.name} · ${modulos.etiquetaRol(state.player.role)} · se retiró a los ${t.edadRetiro}`));

  if (t.puntaje) {
    container.appendChild(bloqueNumero(state, t.puntaje, modulos, extras.lineaHistorial ?? null));
    container.appendChild(bloqueDesglose(t.puntaje, modulos.BALANCE));
    container.appendChild(bloqueLeyenda(state, t.puntaje, modulos));
  }

  container.appendChild(linea('tarjeta-veredicto', t.veredicto));

  const totales = t.totales;
  const franja = document.createElement('div');
  franja.className = 'tarjeta-totales';
  franja.appendChild(celda('Años', String(totales.anios)));
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
    historia.append(...t.historia.map(filaHistoria));
    container.appendChild(historia);
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
