// La regla de conteo a la vista (M3): el menor `k` con `k / total >= vara` (la misma cuenta que `components/varaG1.js` y que el
// motor: nunca `ceil(vara × total)`, que con la coma flotante puede pedir uno de más: 0,6 × 5 = 3,0000000000000004).
export function necesariosDe(vara, total) {
  let n = 0;
  while (n <= total && n / total < vara) n += 1;
  return Math.min(total, n);
}

// "Te faltan 2 · 1 de 3" / "Ya pasaste: 3": lo que se dibuja como la cuenta es lo que pasa.
export function lineaDeCuenta(llevas, necesarios) {
  const falta = necesarios - llevas;
  if (falta <= 0) return `Ya pasaste · ${llevas} de ${necesarios}`;
  return `${falta === 1 ? 'Te falta 1' : `Te faltan ${falta}`} · ${llevas} de ${necesarios}`;
}
