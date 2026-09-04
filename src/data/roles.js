// Identidad de cada rol (DISENO §3.2). `pesos` decide como se convierte la hoja
// de atributos en rendimiento: la suma de cada rol da 1. `visibilidad` es cuanto
// hype genera un mismo desempeño segun la linea — un support rinde igual y se
// habla menos de el.
//
// `tono` y `costo` son para la pantalla de inicio: elegir linea es la primera
// decision de la partida y tiene que leerse como una decision, no como un menu
// desplegable. `costo` dice en voz alta lo que el rol te va a cobrar.

// `factorSalario` (fase 9, CONCEPTO §12): cuánto multiplica la oferta de sueldo
// según la línea, aparte del rendimiento — el mercado real paga mid y jungla
// mejor que support a paridad de nivel. Lo usa `core/salarios.js`.
export const ROLES = {
  top: {
    label: 'Top',
    pesos: { mecanica: 0.20, macro: 0.22, teamfight: 0.14, laneo: 0.28, shotcalling: 0.08, adaptabilidad: 0.08 },
    visibilidad: 0.90,
    factorSalario: 0.80,
    tono: 'La isla. Ganás o perdés tu lado del mapa casi solo, y casi nadie mira.',
    costo: 'Todo pasa por el laneo. Si perdés la línea no hay a quién echarle la culpa.'
  },
  jungla: {
    label: 'Jungla',
    pesos: { mecanica: 0.18, macro: 0.28, teamfight: 0.16, laneo: 0.04, shotcalling: 0.24, adaptabilidad: 0.10 },
    visibilidad: 1.05,
    factorSalario: 1.04,
    tono: 'El que decide dónde se juega el partido. Cuando sale bien fue el equipo; cuando sale mal fuiste vos.',
    costo: 'Vive de macro y shotcalling. Con jerarquía baja tus llamadas no se ejecutan.'
  },
  mid: {
    label: 'Mid',
    pesos: { mecanica: 0.30, macro: 0.16, teamfight: 0.16, laneo: 0.24, shotcalling: 0.06, adaptabilidad: 0.08 },
    visibilidad: 1.20,
    factorSalario: 1.44,
    tono: 'La cara del equipo. Lo que hacés se ve, se recorta y se comenta.',
    costo: 'La línea más expuesta y la que más rápido se nota cuando la mano empieza a caer.'
  },
  adc: {
    label: 'ADC',
    pesos: { mecanica: 0.32, macro: 0.10, teamfight: 0.28, laneo: 0.20, shotcalling: 0.04, adaptabilidad: 0.06 },
    visibilidad: 1.10,
    factorSalario: 1.00,
    tono: 'Todo el daño del equipo pasa por tus manos en la pelea que define.',
    costo: 'El rol que más depende de la mecánica pura, y la mecánica es lo único que se cae con la edad.'
  },
  support: {
    label: 'Support',
    pesos: { mecanica: 0.14, macro: 0.22, teamfight: 0.22, laneo: 0.10, shotcalling: 0.26, adaptabilidad: 0.06 },
    visibilidad: 0.75,
    factorSalario: 0.70,
    tono: 'El que ve el mapa entero. Casi nada de lo que hacés bien entra en un clip.',
    costo: 'La mitad de hype que un mid por el mismo rendimiento: te van a pagar menos toda la carrera.'
  }
};

export const IDS_ROL = Object.keys(ROLES);

export function etiquetaRol(rol) {
  return ROLES[rol]?.label ?? rol;
}

// Los dos atributos que más pesan en este rol, para mostrarlos en la elección
// sin obligar al jugador a leer una tabla de seis decimales.
export function atributosClave(rol) {
  return Object.entries(ROLES[rol].pesos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([stat]) => stat);
}
