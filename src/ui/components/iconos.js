// Marcas de rol y chrome, SVG inline. Cero archivo binario, cero emoji:
// broadcast no usa pictogramas de teléfono. `currentColor` para que el
// acento lo ponga el contexto (card elegida, ficha, topbar).

function svg(html, clase) {
  const wrap = document.createElement('span');
  wrap.className = clase;
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = html;
  return wrap;
}

const MARCA_ROL = {
  top: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="3" width="6" height="18" rx="0.5"/><path d="M5 19h14"/></svg>',
  jungla: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 9-8 9-8-9z"/></svg>',
  mid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 19L19 5"/><path d="M5 5h4v4M19 19h-4v-4"/></svg>',
  adc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h10"/><path d="M12 6l8 6-8 6"/></svg>',
  support: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/></svg>'
};

export function marcaRol(rol) {
  return svg(MARCA_ROL[rol] ?? MARCA_ROL.mid, `rol-marca rol-marca--${rol}`);
}

export function iconoSonido(encendido) {
  const d = encendido
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 10v4h3l5 4V6L7 10H4z"/><path d="M16.5 8.5a5 5 0 010 7"/><path d="M18.5 6a8 8 0 010 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 10v4h3l5 4V6L7 10H4z"/><path d="M17 10l4 4M21 10l-4 4"/></svg>';
  return svg(d, 'icono-chrome');
}
