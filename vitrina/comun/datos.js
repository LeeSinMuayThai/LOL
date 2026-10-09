// Carga las muestras de la carrera real (vitrina/datos/muestras.json), con cache.
// Si no existe, cae al stub de comun/ y avisa por consola (warning, no error).

let promesa = null;

async function traer(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

export function cargarMuestras() {
  if (promesa) return promesa;
  promesa = (async () => {
    try {
      return await traer(new URL('../datos/muestras.json', import.meta.url));
    } catch (e) {
      console.warn(`[vitrina] no hay datos/muestras.json (${e.message}); uso comun/stub-muestras.json`);
      return traer(new URL('./stub-muestras.json', import.meta.url));
    }
  })();
  return promesa;
}
