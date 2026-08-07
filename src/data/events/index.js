import soloqPrecarrera from './soloq_precarrera.json' with { type: 'json' };
import debutAcademy from './debut_academy.json' with { type: 'json' };
import dramaPrensa from './drama_prensa.json' with { type: 'json' };
import saludVida from './salud_vida.json' with { type: 'json' };
import negocios from './negocios.json' with { type: 'json' };
import competicion from './competicion.json' with { type: 'json' };
import cierreEdad from './cierre_edad.json' with { type: 'json' };

export const TODOS_LOS_EVENTOS = [
  ...soloqPrecarrera,
  ...debutAcademy,
  ...dramaPrensa,
  ...saludVida,
  ...negocios,
  ...competicion,
  ...cierreEdad
];
