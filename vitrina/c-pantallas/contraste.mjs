// Mide el contraste real de cada texto visible contra los píxeles que tiene detrás (no razona con tokens).
// 1) junta los elementos con texto propio visibles (color, opacidad acumulada, tamaño, caja); 2) vuelve transparente
// todo el texto y saca una captura del fondo; 3) en la página dibuja esa captura en un canvas y, por cada caja, calcula
// el contraste WCAG contra cada píxel de fondo y se queda con el percentil 10 (lo peor, sin el ruido de bordes).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? 'C:/Users/Ignacio/AppData/Local/npm-cache/_npx/e058441c325e062a/node_modules/playwright-core');
const EXE = process.env.CHROMIUM_EXE ?? 'C:/Users/Ignacio/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
// Uso: node vitrina/c-pantallas/contraste.mjs "nombre|hash[|ancho|alto[|elegirN|ms]],..."   (PUERTO=8113 por defecto)
// (elegirN elige la opción N y congela en ms: así se miden también los resultados)
const PUERTO = process.env.PUERTO ?? 8113;
const CASOS = (process.argv[2] ?? '').split(',').filter(Boolean);
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const fallas = [];
const peorPorCaso = {};
let medidos = 0;
for (const caso of CASOS) {
  const [nombre, hash, w = '1440', h = '900', accion = '', ms = '1500'] = caso.split('|');
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
  await page.goto(`http://127.0.0.1:${PUERTO}/c-pantallas/index.html#${hash}&panel=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.vitrina && window.vitrina.estado);
  await page.evaluate(() => Promise.race([window.vitrina.listo ? window.vitrina.listo() : 0, new Promise((r) => setTimeout(r, 8000))]));
  await page.waitForTimeout(1900);
  if (accion.startsWith('elegir')) { await page.evaluate((n) => window.vitrina.elegir(n), Number(accion.slice(6))); await page.waitForTimeout(400); }
  await page.evaluate((t) => { window.vitrina.congelar(t); for (const a of document.getAnimations()) a.pause(); }, Number(ms));
  const textos = await page.evaluate(() => {
    const out = [];
    const canales = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    for (const e of document.querySelectorAll('body *')) {
      if (e.closest('[aria-hidden="true"], .bios, .arranque, .crt, svg, .sr')) continue;
      // controles inactivos (WCAG 1.4.3 los exime): las opciones que ya no se pueden elegir
      if (e.closest('[aria-disabled="true"], :disabled')) continue;
      const propio = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!propio || !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      // la caja recortada por los ancestros con overflow (un chat que corre, una lista con scroll)
      const r0 = e.getBoundingClientRect();
      const r = { left: r0.left, top: r0.top, right: r0.right, bottom: r0.bottom };
      for (let a = e.parentElement; a; a = a.parentElement) {
        if (getComputedStyle(a).overflow === 'visible') continue;
        const q = a.getBoundingClientRect();
        r.left = Math.max(r.left, q.left); r.top = Math.max(r.top, q.top); r.right = Math.min(r.right, q.right); r.bottom = Math.min(r.bottom, q.bottom);
      }
      r.width = r.right - r.left; r.height = r.bottom - r.top;
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      // tapado por otra capa (un toast, el post-game encima): nadie lo ve, no se mide
      const arriba = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (arriba && !(arriba === e || e.contains(arriba) || arriba.contains(e))) continue;
      const cs = getComputedStyle(e);
      let op = 1;
      for (let n = e; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
      const [cr, cg, cb, ca = 1] = canales(cs.color);
      out.push({ texto: e.textContent.trim().slice(0, 40), clase: e.className?.baseVal ?? e.className, fs: parseFloat(cs.fontSize), fw: Number(cs.fontWeight),
        c: [cr, cg, cb], a: ca * op, r: [Math.max(0, r.left + 3), Math.max(0, r.top + 3), Math.min(innerWidth, r.right - 3), Math.min(innerHeight, r.bottom - 3)] });
    }
    return out;
  });
  await page.addStyleTag({ content: '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }' });
  await page.waitForTimeout(60);
  const png = (await page.screenshot()).toString('base64');
  const res = await page.evaluate(async ({ png, textos }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
    const dpr = img.width / innerWidth;
    return textos.map((t) => {
      const [x0, y0, x1, y1] = t.r.map((v) => Math.round(v * dpr));
      const d = g.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)).data;
      const rs = [];
      const paso = 4 * Math.max(1, Math.floor(d.length / 4 / 1500));
      for (let i = 0; i < d.length; i += paso) {
        const bg = [d[i], d[i + 1], d[i + 2]];
        const fg = t.c.map((c, k) => t.a * c + (1 - t.a) * bg[k]);
        const a = L(...fg); const b = L(...bg);
        rs.push((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
      }
      rs.sort((p, q) => p - q);
      return { ...t, ratio: rs[Math.floor(rs.length * 0.1)] ?? 21 };
    });
  }, { png, textos });
  for (const t of res) {
    medidos++;
    if (!peorPorCaso[nombre] || t.ratio < peorPorCaso[nombre].ratio) peorPorCaso[nombre] = { ratio: t.ratio, texto: t.texto, fs: t.fs };
    const grande = t.fs >= 24 || (t.fs >= 18.66 && t.fw >= 700);
    if (t.ratio < (grande ? 3 : 4.5)) fallas.push(`${nombre}  ${t.ratio.toFixed(2)}  ${t.fs}px  .${String(t.clase).split(' ')[0]}  "${t.texto}"`);
  }
  await page.close();
}
await browser.close();
console.log(`${medidos} textos medidos, ${fallas.length} por debajo de 4,5:1 (3:1 en grandes)`);
for (const f of fallas) console.log('  ' + f);
console.log('peor por caso: ' + Object.entries(peorPorCaso).map(([n, x]) => `${n} ${x.ratio.toFixed(2)} (${x.fs}px "${x.texto.slice(0, 18)}")`).join(' · '));
