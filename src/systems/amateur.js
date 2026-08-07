import { gauss, roll } from '../core/rng.js';
import { BALANCE } from '../data/balance.js';
import { crearLog } from '../core/log.js';
import { clampStat } from '../core/numeros.js';

export const id = 'amateur';

export function aplicar(state, rng) {
  if (state.phase !== 'amateur') {
    return { state, logs: [] };
  }

  const { amateur } = BALANCE;

  const eloGain = roll(amateur.eloGainMin, amateur.eloGainMax, rng);
  const sleepLoss = roll(amateur.sleepLossMin, amateur.sleepLossMax, rng);
  const studiesGain = Math.max(0, Math.round(gauss(amateur.studiesGain, amateur.studiesSpread, rng)));
  const trustDrift = roll(amateur.trustDriftMin, amateur.trustDriftMax, rng);

  let nextState = {
    ...state,
    player: {
      ...state.player,
      soloqElo: state.player.soloqElo + eloGain,
      sleep: clampStat(state.player.sleep - sleepLoss),
      studies: clampStat(state.player.studies + studiesGain),
      familyTrust: clampStat(state.player.familyTrust - trustDrift)
    }
  };

  const logs = [crearLog(
    'amateur',
    `Grindeo de soloQ: +${eloGain} LP, -${sleepLoss} sueño, +${studiesGain} estudio, -${trustDrift} confianza familiar.`
  )];

  const exito = nextState.player.soloqElo >= amateur.soloqEloUmbralExito
    && nextState.player.stats.hype >= amateur.hypeUmbralExito;
  const fracasoFamilia = nextState.player.familyTrust <= amateur.familyTrustUmbralFracaso;
  const fracasoSueno = nextState.player.sleep <= amateur.sleepUmbralFracaso;

  if (exito) {
    nextState = { ...nextState, phase: 'profesional', splitFichaje: nextState.player.splitCount };
    logs.push(crearLog(
      'amateur',
      `¡Te ficha un equipo! Con ${nextState.player.soloqElo} LP y suficiente repercusión, arranca tu carrera profesional.`
    ));
  } else if (fracasoFamilia || fracasoSueno) {
    nextState = {
      ...nextState,
      phase: 'retirado',
      terminado: true,
      finAnticipado: fracasoFamilia ? 'fracaso_familia' : 'fracaso_sueno'
    };
    logs.push(crearLog(
      'amateur',
      fracasoFamilia
        ? 'Tu familia te baja del ranked: sin su apoyo, la carrera termina antes de arrancar.'
        : 'El cuerpo no da más: el burnout te saca de carrera antes de debutar.'
    ));
  }

  return { state: nextState, logs };
}
