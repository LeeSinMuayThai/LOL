import { crearLog } from '../core/log.js';
import { BALANCE } from '../data/balance.js';

export const id = 'secundario';

// A los 18 la barra de estudios no desaparece: se congela en un flag permanente
// que acompaña el resto de la carrera (CONCEPTO §4). El que terminó el
// secundario tiene mejores pesos en los eventos de crisis y mas salidas al
// retirarse; el que lo dejó tiene eventos exclusivos y acepta peores contratos
// por seguridad. Ninguno de los dos es el camino correcto.
//
// Se congela tambien al dejar la etapa amateur aunque sea antes de los 18:
// firmar y mudarte a una gaming house es, en los hechos, la decision tomada.
//
// D10 (fase 10a): `edadLimite` dejó de ser el corte duro de la etapa amateur
// — ahora es la red anti-loop (24) — pero el significado que este sistema
// necesita ("la edad en la que definitivamente ya no sos amateur, pase lo
// que pase") no cambió, solo el valor. Sigue siendo el mismo campo.
export function aplicar(state, rng) {
  if (state.flags.secundario !== null) {
    return { state, logs: [] };
  }

  const porEdad = state.age >= BALANCE.amateur.edadLimite;
  const porFichaje = state.phase !== 'amateur';

  if (!porEdad && !porFichaje) {
    return { state, logs: [] };
  }

  const termino = state.player.studies >= BALANCE.amateur.secundarioAprobadoUmbral;
  const secundario = termino ? 'terminado' : 'lo_dejo';

  return {
    state: { ...state, flags: { ...state.flags, secundario } },
    logs: [crearLog(
      'secundario',
      termino
        ? `Cerraste el secundario con los estudios en ${Math.round(state.player.studies)}. Lo que venga, viene con el título en el bolsillo.`
        : `Dejaste el secundario con los estudios en ${Math.round(state.player.studies)}. De acá en más, no hay plan B.`
    )]
  };
}
