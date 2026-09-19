import soloqPrecarrera from './soloq_precarrera.json' with { type: 'json' };
import debutAcademy from './debut_academy.json' with { type: 'json' };
import dramaPrensa from './drama_prensa.json' with { type: 'json' };
import saludVida from './salud_vida.json' with { type: 'json' };
import negocios from './negocios.json' with { type: 'json' };
import competicion from './competicion.json' with { type: 'json' };
import cierreEdad from './cierre_edad.json' with { type: 'json' };
import pool from './pool.json' with { type: 'json' };
import rolTop from './rol/top.json' with { type: 'json' };
import rolJungla from './rol/jungla.json' with { type: 'json' };
import rolMid from './rol/mid.json' with { type: 'json' };
import rolAdc from './rol/adc.json' with { type: 'json' };
import rolSupport from './rol/support.json' with { type: 'json' };
// Fase 8D (contenido vivo, PLAN.md): las 6 marcas que se calculaban y no
// tenían contenido detrás, el eje `estatus`, lo que cita `career.registro`
// (títulos, tier 3, nomadismo), y la escena real de 2026 (Fearless, First
// Selection, mercado, servicio militar). No confundir con la FASE 13 —
// "contenido a escala" — que depende de sistemas que todavía no existen.
import marcasVivas from './marcas_vivas.json' with { type: 'json' };
import estatus from './estatus.json' with { type: 'json' };
import registroCita from './registro_cita.json' with { type: 'json' };
import escena2026 from './escena_2026.json' with { type: 'json' };
// Fase 5: el contenido de las fechas marcadas de la temporada regular. Se
// gatea por `contexto.stakes`, un eje que `calcularContexto(state)` sin
// overrides nunca produce — así que esto nunca puede colarse por la
// selección normal de `systems/events.js`, solo por la de
// `systems/temporada.js`. Ver la nota en `data/contextos.js`.
import partidoPresion from './partido/presion.json' with { type: 'json' };
import partidoClasico from './partido/clasico.json' with { type: 'json' };
import partidoDentroDelMapa from './partido/dentro_del_mapa.json' with { type: 'json' };
import partidoPostpartido from './partido/postpartido.json' with { type: 'json' };
// Fase 9Wb (§9W.4 gancho 3): 2 eventos semilla para la marca `top_mundial`.
// El catálogo real de la cima (sponsor bomba, "defendé el #1", la prensa que
// te destrona, el archirrival que te pasa) es fase 13.
import topMundial from './top_mundial.json' with { type: 'json' };
// Fase 13: contenido para retirado_reciente en pretemporada (ventana de vuelta).
import retiroYVuelta from './retiro_y_vuelta.json' with { type: 'json' };

export const TODOS_LOS_EVENTOS = [
  ...soloqPrecarrera,
  ...debutAcademy,
  ...dramaPrensa,
  ...saludVida,
  ...negocios,
  ...competicion,
  ...cierreEdad,
  ...pool,
  ...rolTop,
  ...rolJungla,
  ...rolMid,
  ...rolAdc,
  ...rolSupport,
  ...marcasVivas,
  ...estatus,
  ...registroCita,
  ...escena2026,
  ...partidoPresion,
  ...partidoClasico,
  ...partidoDentroDelMapa,
  ...partidoPostpartido,
  ...topMundial,
  ...retiroYVuelta
];
