// Una barra de progreso con hitos marcados (fase 8, PLAN.md §8.6 / imágenes
// 6, 13 y 14 de la referencia): no solo el número — la posición dentro de la
// escala completa y dónde están los próximos hitos con nombre. La misma
// forma sirve para arraigo y jerarquía: las dos son bandas 0-100 con 4 hitos
// nombrados (`core/ficha.js` ya las computa; acá solo se pintan).
//
// `banda` = { id, label, valor, esMaxima } (de `bandaDeJerarquia` /
// `bandaDeArraigoFicha`). `hitos` = [{ id, label, piso }], los 4 techos con
// nombre de esa escala.
export function crearBarra({ nombre, banda, hitos = [], tono = null }) {
  const wrap = document.createElement('div');
  wrap.className = 'ficha-barra-wrap' + (tono ? ` ficha-barra-wrap--${tono}` : '');

  const cabecera = document.createElement('div');
  cabecera.className = 'ficha-barra-cabecera';

  const nombreEl = document.createElement('span');
  nombreEl.className = 'ficha-barra-nombre';
  nombreEl.textContent = nombre;

  const valorEl = document.createElement('span');
  valorEl.className = 'ficha-barra-valor' + (banda.esMaxima ? ' ficha-barra-valor--maxima' : '');
  valorEl.textContent = `${banda.label} · ${Math.round(banda.valor)}/100`;

  cabecera.append(nombreEl, valorEl);

  const pista = document.createElement('div');
  pista.className = 'ficha-barra-pista' + (banda.esMaxima ? ' ficha-barra-pista--maxima' : '');

  const relleno = document.createElement('div');
  relleno.className = 'ficha-barra-relleno' + (banda.esMaxima ? ' ficha-barra-relleno--maxima' : '');
  relleno.style.width = `${Math.max(0, Math.min(100, banda.valor))}%`;
  pista.appendChild(relleno);

  for (const hito of hitos) {
    const marca = document.createElement('div');
    marca.className = 'ficha-barra-hito' + (banda.valor >= hito.piso ? ' ficha-barra-hito--alcanzado' : '');
    marca.style.left = `${hito.piso}%`;
    pista.appendChild(marca);
  }

  wrap.append(cabecera, pista);

  if (hitos.length > 0) {
    const etiquetas = document.createElement('div');
    etiquetas.className = 'ficha-barra-hitos-labels';
    etiquetas.replaceChildren(...hitos.map((hito) => {
      const span = document.createElement('span');
      span.textContent = hito.label;
      span.className = banda.valor >= hito.piso ? 'ficha-hito-alcanzado' : '';
      return span;
    }));
    wrap.appendChild(etiquetas);
  }
  return wrap;
}

// Barra chica sin hitos: estudios / confianza / sueño. Mismo lenguaje que
// arraigo, sin las marcas de banda — esas tres no tienen hitos con nombre.
export function crearInstrumento({ nombre, valor, tono = null, detalle = null }) {
  const wrap = document.createElement('div');
  wrap.className = 'ficha-barra-wrap' + (tono ? ` ficha-barra-wrap--${tono}` : '');

  const cabecera = document.createElement('div');
  cabecera.className = 'ficha-barra-cabecera';
  const nombreEl = document.createElement('span');
  nombreEl.className = 'ficha-barra-nombre';
  nombreEl.textContent = nombre;
  const valorEl = document.createElement('span');
  valorEl.className = 'ficha-barra-valor';
  valorEl.textContent = detalle ?? `${Math.round(valor)}/100`;
  cabecera.append(nombreEl, valorEl);

  const pista = document.createElement('div');
  pista.className = 'ficha-barra-pista';
  const relleno = document.createElement('div');
  relleno.className = 'ficha-barra-relleno';
  relleno.style.width = `${Math.max(0, Math.min(100, valor))}%`;
  pista.appendChild(relleno);

  wrap.append(cabecera, pista);
  return wrap;
}
