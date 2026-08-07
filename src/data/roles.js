// Identidad de cada rol (DISENO §3.2). `pesos` decide como se convierte la hoja
// de atributos en rendimiento: la suma de cada rol da 1. `visibilidad` es cuanto
// hype genera un mismo desempeño segun la linea — un support rinde igual y se
// habla menos de el.

export const ROLES = {
  top: {
    label: 'Top',
    pesos: { mecanica: 0.20, macro: 0.22, teamfight: 0.14, laneo: 0.28, shotcalling: 0.08, adaptabilidad: 0.08 },
    visibilidad: 0.90
  },
  jungla: {
    label: 'Jungla',
    pesos: { mecanica: 0.18, macro: 0.28, teamfight: 0.16, laneo: 0.04, shotcalling: 0.24, adaptabilidad: 0.10 },
    visibilidad: 1.05
  },
  mid: {
    label: 'Mid',
    pesos: { mecanica: 0.30, macro: 0.16, teamfight: 0.16, laneo: 0.24, shotcalling: 0.06, adaptabilidad: 0.08 },
    visibilidad: 1.20
  },
  adc: {
    label: 'ADC',
    pesos: { mecanica: 0.32, macro: 0.10, teamfight: 0.28, laneo: 0.20, shotcalling: 0.04, adaptabilidad: 0.06 },
    visibilidad: 1.10
  },
  support: {
    label: 'Support',
    pesos: { mecanica: 0.14, macro: 0.22, teamfight: 0.22, laneo: 0.10, shotcalling: 0.26, adaptabilidad: 0.06 },
    visibilidad: 0.75
  }
};

export const IDS_ROL = Object.keys(ROLES);

export function etiquetaRol(rol) {
  return ROLES[rol]?.label ?? rol;
}
