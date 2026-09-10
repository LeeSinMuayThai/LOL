import { hueDeOrg, inicialesDeOrg } from '../formatoUi.js';

// Monograma de org. T0 lo prometió y nunca se pintó: hue determinista por
// `hashCadena`, cero escudos (licencias), cero RNG. Los hsl van INLINE —
// `validate.js` caza `hsl(` en cualquier CSS fuera de tokens.css.

export function crearOrgChip(nombre, { size = 22 } = {}) {
  const hue = hueDeOrg(nombre);
  const chip = document.createElement('span');
  chip.className = 'org-chip';
  chip.textContent = inicialesDeOrg(nombre);
  chip.title = nombre ?? '';
  chip.style.setProperty('--org-size', `${size}px`);
  chip.style.background = `hsl(${hue} 38% 16%)`;
  chip.style.borderColor = `hsl(${hue} 52% 42%)`;
  chip.style.color = `hsl(${hue} 72% 78%)`;
  return chip;
}
