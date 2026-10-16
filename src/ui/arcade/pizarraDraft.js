// El contenido de la pizarra (M4): los picks del rival con su línea y su counter. Es solo lo que se lee en las cartas: la
// regla vive en `pizarra.js` (que no sabe de campeones). Los campeones son reales; `clave` es la de Data Dragon (el ícono).
export const LINEAS = { top: 'TOP', jungla: 'JGL', mid: 'MID', adc: 'ADC', support: 'SUP' };

export const PLANTEOS = [
  { pick: ['Fiora', 'Fiora'], linea: 'top', counter: ['Teemo', 'Teemo'] },
  { pick: ['Darius', 'Darius'], linea: 'top', counter: ['Vayne', 'Vayne'] },
  { pick: ['Master Yi', 'MasterYi'], linea: 'jungla', counter: ['Rammus', 'Rammus'] },
  { pick: ['Lee Sin', 'LeeSin'], linea: 'jungla', counter: ['Vi', 'Vi'] },
  { pick: ['Zed', 'Zed'], linea: 'mid', counter: ['Lissandra', 'Lissandra'] },
  { pick: ['Yasuo', 'Yasuo'], linea: 'mid', counter: ['Malphite', 'Malphite'] },
  { pick: ['Ahri', 'Ahri'], linea: 'mid', counter: ['Yone', 'Yone'] },
  { pick: ['Jinx', 'Jinx'], linea: 'adc', counter: ['Draven', 'Draven'] },
  { pick: ['Kai\'Sa', 'Kaisa'], linea: 'adc', counter: ['Samira', 'Samira'] },
  { pick: ['Caitlyn', 'Caitlyn'], linea: 'adc', counter: ['Lucian', 'Lucian'] },
  { pick: ['Thresh', 'Thresh'], linea: 'support', counter: ['Nautilus', 'Nautilus'] },
  { pick: ['Lux', 'Lux'], linea: 'support', counter: ['Blitzcrank', 'Blitzcrank'] }
];
// qué pide cada par de cada fase: el pick con su línea o con su counter (la fase 3 mezcla los dos)
export const TIPOS = [['linea', 'linea'], ['counter', 'counter', 'counter'], ['linea', 'counter', 'linea', 'counter']];
const BANEOS = 3;

// Arma el contenido de una partida: por fase, un arreglo de pares `[lado0, lado1]` (cada lado: `{ rotulo, nombre, clave }` o
// `{ rotulo, linea }`). Dentro de una fase no se repite ni un pick ni una línea; los picks que sobran son los baneos.
export function armarDraft(rng) {
  const bolsa = PLANTEOS.map((p) => p);
  for (let i = bolsa.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]];
  }
  const fases = TIPOS.map((tipos) => {
    const lineas = new Set();
    return tipos.map((tipo) => {
      let k = bolsa.findIndex((p) => tipo !== 'linea' || !lineas.has(p.linea));
      if (k < 0) k = 0;
      const [p] = bolsa.splice(k, 1);
      if (tipo === 'linea') lineas.add(p.linea);
      const lado0 = { rotulo: 'PICK', nombre: p.pick[0], clave: p.pick[1] };
      const lado1 = tipo === 'linea'
        ? { rotulo: 'LÍNEA', linea: LINEAS[p.linea] }
        : { rotulo: 'COUNTER', nombre: p.counter[0], clave: p.counter[1] };
      return [lado0, lado1];
    });
  });
  return { fases, baneos: bolsa.slice(0, BANEOS).map((p) => ({ nombre: p.pick[0], clave: p.pick[1] })) };
}
