// H2a (PLANUI §0.10, "el mazo"): las cartas del año, por etapa. No son eventos: NO entran a `TODOS_LOS_EVENTOS` (como
// `promesas.json`); `systems/edadCierre.js` las sortea por rareza y arma la mano. Una carta con varias etapas vive en el
// archivo de la primera.
import amateur from './amateur.json' with { type: 'json' };
import tier3 from './tier3.json' with { type: 'json' };
import tier2 from './tier2.json' with { type: 'json' };
import tier1 from './tier1.json' with { type: 'json' };
import emigrado from './emigrado.json' with { type: 'json' };
import veterano from './veterano.json' with { type: 'json' };

export const CARTAS = [...amateur, ...tier3, ...tier2, ...tier1, ...emigrado, ...veterano];
