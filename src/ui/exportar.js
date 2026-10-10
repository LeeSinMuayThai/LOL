// La tarjeta final, como imagen (fase T7, PLAN.md "T7 — La tarjeta final,
// el PNG y el link"). Canvas 2D a mano, sin librerías — 1200×630, la
// medida estándar de Open Graph, para que la misma rutina sirva para
// bajar el PNG y (en T8) para la imagen de la meta tag.
//
// Los colores se leen de los tokens en vez de duplicarlos en hex acá: una
// sola fuente de verdad entre el CSS y el canvas.
import { hueDeOrg, inicialesDeOrg } from './formatoUi.js';
import { miles } from './resultado.js';
import { goldenRoadsDeEstado, medallaDeGoldenRoad } from './core/trayectoria.js';
import { VERSION_JUEGO } from '../data/version.js';

const ANCHO = 1200;
const ALTO = 630;

const MARCO_TOKEN = {
  retiro_elegido: '--live',
  sin_equipo: '--warn',
  burnout: '--danger',
  no_llego: '--line-strong',
  prohibicion_familiar: '--cat-familia',
  retiro_por_lesion: '--cat-salud'
};

function leerToken(nombre) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return valor || '#2ee8ff';
}

// Envuelve texto a `anchoMax` px, devuelve la línea siguiente disponible.
function envolver(ctx, texto, x, y, anchoMax, lineHeight, maxLineas = 3) {
  const palabras = texto.split(' ');
  let linea = '';
  let cy = y;
  let lineas = 0;
  for (const palabra of palabras) {
    const test = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(test).width > anchoMax && linea) {
      ctx.fillText(linea, x, cy);
      linea = palabra;
      cy += lineHeight;
      lineas += 1;
      if (lineas >= maxLineas - 1) {
        // Última línea permitida: el resto se corta con "…" si no entra.
        const restante = palabras.slice(palabras.indexOf(palabra)).join(' ');
        let cortado = restante;
        while (ctx.measureText(cortado + '…').width > anchoMax && cortado.length > 1) {
          cortado = cortado.slice(0, -1);
        }
        ctx.fillText(cortado.length < restante.length ? cortado + '…' : restante, x, cy);
        return cy + lineHeight;
      }
    } else {
      linea = test;
    }
  }
  if (linea) ctx.fillText(linea, x, cy);
  return cy + lineHeight;
}

// Dibuja la tarjeta y devuelve el canvas ya pintado (no el blob): quien
// llama decide si lo baja, lo copia, o lo usa para otra cosa.
export async function dibujarTarjeta(state, modulos) {
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext('2d');
  const t = state.tarjeta;
  const acento = t.esExito ? leerToken('--gold') : leerToken(MARCO_TOKEN[t.finAnticipado] ?? '--live');

  // --- Fondo: el mismo lenguaje que el shell — void + viñeta + malla ---
  ctx.fillStyle = leerToken('--bg-void');
  ctx.fillRect(0, 0, ANCHO, ALTO);

  ctx.strokeStyle = leerToken('--line-faint');
  ctx.lineWidth = 1;
  for (let x = 0; x < ANCHO; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ALTO); ctx.stroke(); }
  for (let y = 0; y < ALTO; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ANCHO, y); ctx.stroke(); }

  const viñeta = ctx.createRadialGradient(ANCHO / 2, -80, 100, ANCHO / 2, ALTO / 2, ANCHO * 0.75);
  viñeta.addColorStop(0, 'transparent');
  viñeta.addColorStop(1, leerToken('--bg-void'));
  ctx.fillStyle = viñeta;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // --- El marco: banda superior + borde del color del final ---
  ctx.fillStyle = acento;
  ctx.fillRect(0, 0, ANCHO, 6);

  ctx.strokeStyle = acento;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, ANCHO - 48, ALTO - 48);

  // --- El lockup: el mismo monograma del topbar (K1-B: con la fecha si es
  // el desafío del día, que es lo que hace comparable el número) ---
  const desafio = state.desafio?.fecha ?? null;
  ctx.fillStyle = leerToken('--live');
  ctx.font = '700 22px "Barlow Condensed", sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(desafio ? `● DESAFÍO DEL ${desafio} · LOLERO` : '● LIVE · LOLERO', 60, 76);

  // --- Identidad ---
  ctx.fillStyle = leerToken('--ink');
  ctx.font = '700 30px "Barlow Condensed", sans-serif';
  ctx.fillText(
    `${state.player.name} · ${modulos.etiquetaRol(state.player.role)} · se retiró a los ${t.edadRetiro}`,
    60, 122
  );

  // --- El número (K1-B), arriba a la derecha, con su referente (regla 13):
  // el nivel y el percentil van pegados, nunca el puntaje solo ---
  const puntaje = t.puntaje;
  if (puntaje) {
    ctx.textAlign = 'right';
    ctx.fillStyle = leerToken('--ink');
    ctx.font = '700 92px "Barlow Condensed", sans-serif';
    ctx.fillText(miles(puntaje.total), ANCHO - 60, 140);
    ctx.fillStyle = acento;
    ctx.font = '700 26px "Barlow Condensed", sans-serif';
    ctx.fillText(`PTS · ${puntaje.nivel.nombre.toUpperCase()}`, ANCHO - 60, 176);
    ctx.fillStyle = leerToken('--ink-dim');
    ctx.font = '400 17px Inter, sans-serif';
    ctx.fillText(`mejor que el ${puntaje.percentil}% de las carreras`, ANCHO - 60, 204);
    ctx.textAlign = 'left';
  }

  // --- El veredicto, la pieza central ---
  ctx.fillStyle = acento;
  ctx.font = '700 46px "Barlow Condensed", sans-serif';
  envolver(ctx, t.veredicto, 60, puntaje ? 270 : 200, ANCHO - 120, 56, 3);

  // --- Totales como celdas ---
  const totales = t.totales;
  const celdas = [
    { k: 'AÑOS PRO', v: String(totales.anios) },
    { k: 'SPLITS', v: String(totales.splits) },
    { k: 'TÍTULOS', v: String(totales.titulos) },
    totales.internacionales > 0 ? { k: 'INTL', v: String(totales.internacionales) } : null,
    { k: 'NIVEL', v: String(totales.nivelMax) },
    totales.valorMaxUSD > 0 ? { k: 'VALOR', v: modulos.formato.plata(totales.valorMaxUSD) } : null
  ].filter(Boolean);
  const celdaAncho = Math.min(160, (ANCHO - 120) / celdas.length);
  celdas.forEach((c, i) => {
    const x = 60 + i * celdaAncho;
    ctx.fillStyle = leerToken('--ink-mute');
    ctx.font = '600 12px "Barlow Condensed", sans-serif';
    ctx.fillText(c.k, x, 470);
    ctx.fillStyle = leerToken('--ink');
    ctx.font = '700 28px "Barlow Condensed", sans-serif';
    ctx.fillText(c.v, x, 504);
  });

  // --- Historia: chips de org ---
  const historia = (t.historia ?? []).slice(0, 6);
  historia.forEach((fila, i) => {
    dibujarOrgChip(ctx, fila.org, 60 + i * 44, 530, 32);
  });

  // --- La medalla (FASE V, V5): el Golden Road, abajo a la derecha, en dorado. Un logro aparte; sin ninguno no se dibuja nada. ---
  const medalla = medallaDeGoldenRoad(goldenRoadsDeEstado(state));
  if (medalla) {
    dibujarMedalla(ctx, medalla.toUpperCase(), ANCHO - 60, 560);
  }

  // --- Pie: la seed (o la fecha del desafío) y la versión, para que el link
  // y la imagen cuenten la misma historia ---
  ctx.fillStyle = leerToken('--ink-mute');
  ctx.font = '400 16px Inter, sans-serif';
  ctx.fillText(`${desafio ? `desafío ${desafio}` : `seed ${state.seed}`} · v ${VERSION_JUEGO}`, 60, ALTO - 40);

  return canvas;
}

// Una chapa dorada con el texto, alineada a la derecha en `xDerecha` y apoyada en `yBase`.
function dibujarMedalla(ctx, texto, xDerecha, yBase) {
  const relleno = 16;
  const alto = 44;
  ctx.font = '700 28px "Barlow Condensed", sans-serif';
  const ancho = ctx.measureText(texto).width + relleno * 2;
  const x = xDerecha - ancho;
  const y = yBase - alto;
  ctx.fillStyle = leerToken('--gold-fill');
  ctx.strokeStyle = leerToken('--gold');
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, ancho, alto, 6);
  } else {
    ctx.rect(x, y, ancho, alto);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = leerToken('--gold');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, x + relleno, y + alto / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function dibujarOrgChip(ctx, nombre, x, y, size) {
  const hue = hueDeOrg(nombre);
  const r = 3;
  ctx.fillStyle = `hsl(${hue} 38% 16%)`;
  ctx.strokeStyle = `hsl(${hue} 52% 42%)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, size, size, r);
  } else {
    ctx.rect(x, y, size, size);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `hsl(${hue} 72% 78%)`;
  ctx.font = '700 11px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(inicialesDeOrg(nombre), x + size / 2, y + size / 2 + 0.5);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function aBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Baja el PNG. Fallback universal: funciona en cualquier navegador que
// soporte canvas, sin permisos especiales.
export async function descargarTarjeta(state, modulos) {
  const canvas = await dibujarTarjeta(state, modulos);
  const blob = await aBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lolero-${(state.player.name || 'carrera').replace(/\s+/g, '_')}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

// Copia el PNG al portapapeles. `navigator.clipboard.write` con
// `ClipboardItem` no está en todos los navegadores (Firefox lo suma tarde,
// Safari con restricciones) — devuelve `false` si no se pudo, y quien
// llama cae a `descargarTarjeta` como respaldo.
export async function copiarTarjeta(state, modulos) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return false;
  }
  try {
    const canvas = await dibujarTarjeta(state, modulos);
    const blob = await aBlob(canvas);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

// Copia texto al portapapeles: el link de esta carrera (P.3, CONCEPTO §9:
// "todo el motor de difusión del juego") o el resultado para compartir (K1-B).
// Los arma `resultado.js`, que es puro. `false` si el navegador no deja.
export async function copiarTexto(texto) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
