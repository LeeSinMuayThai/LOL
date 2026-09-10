// Conteo tabular. T0 lo dejó escrito en un comentario y nunca se codeó.
// Solo enteros. `prefers-reduced-motion` salta al número final.

function motionReducido() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function countUp(el, from, to, { dur = 420 } = {}) {
  const fin = Number(to);
  const inicio = Number(from);
  if (!Number.isFinite(fin)) {
    el.textContent = String(to ?? '');
    return;
  }
  if (!Number.isFinite(inicio) || inicio === fin || motionReducido() || dur <= 0) {
    el.textContent = String(Math.round(fin));
    return;
  }
  const t0 = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    el.textContent = String(Math.round(inicio + (fin - inicio) * t));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
