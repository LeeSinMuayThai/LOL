import { roll } from '../core/rng.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const EVENTOS = [
  {
    id: 'scout_call',
    title: 'Llamado de un scout',
    description: 'Un scout te sigue de cerca después de una semana sólida.',
    weight: 10,
    condition: () => true,
    apply: (state, rng) => {
      const hypeGain = roll(3, 8, rng);
      const mentalidadLoss = roll(1, 3, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            hype: clamp(state.player.stats.hype + hypeGain, 0, 100),
            mentalidad: clamp(state.player.stats.mentalidad - mentalidadLoss, 0, 100)
          }
        },
        flags: { ...state.flags, scout_call: true }
      };
    }
  },
  {
    id: 'family_pressure',
    title: 'Presión familiar',
    description: 'Tus viejos quieren que priorices los estudios y no solo el ranked.',
    weight: 8,
    condition: (state) => state.age < 18,
    apply: (state, rng) => {
      const trustLoss = roll(4, 9, rng);
      const studyGain = roll(2, 5, rng);
      return {
        ...state,
        player: {
          ...state.player,
          familyTrust: clamp(state.player.familyTrust - trustLoss, 0, 100),
          studies: clamp(state.player.studies + studyGain, 0, 100)
        }
      };
    }
  },
  {
    id: 'ranked_streak',
    title: 'Racha de ranked',
    description: 'El sistema te da una noche de LP y un poco de ego.',
    weight: 10,
    condition: () => true,
    apply: (state, rng) => {
      const eloGain = roll(25, 60, rng);
      const hypeGain = roll(2, 5, rng);
      return {
        ...state,
        player: {
          ...state.player,
          soloqElo: state.player.soloqElo + eloGain,
          stats: {
            ...state.player.stats,
            hype: clamp(state.player.stats.hype + hypeGain, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'redemption_game',
    title: 'Partida de redención',
    description: 'En la siguiente serie decisiva, el equipo te da una oportunidad de devolver la cara.',
    weight: 8,
    condition: (state) => state.player.splitCount > 1,
    apply: (state, rng) => {
      const gain = roll(3, 7, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            mecanica: clamp(state.player.stats.mecanica + gain, 0, 100),
            mentalidad: clamp(state.player.stats.mentalidad + 2, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'academy_offer',
    title: 'Oferta de academy',
    description: 'Una org te ofrece entrar a su proyecto juvenil con un contrato pequeño.',
    weight: 8,
    condition: (state) => state.player.splitCount > 2,
    apply: (state, rng) => {
      const hypeGain = roll(2, 6, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            hype: clamp(state.player.stats.hype + hypeGain, 0, 100)
          }
        },
        career: {
          ...state.career,
          orgs: [...state.career.orgs, 'Academy prospecto']
        }
      };
    }
  },
  {
    id: 'coach_demands_role',
    title: 'El coach te cambia de rol',
    description: 'Tu entrenador cree que tu futuro está en otra línea y te obliga a adaptarte.',
    weight: 7,
    condition: (state) => state.player.splitCount > 3,
    apply: (state, rng) => {
      const penalty = roll(3, 6, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            adaptabilidad: clamp(state.player.stats.adaptabilidad + 2, 0, 100),
            mecanica: clamp(state.player.stats.mecanica - penalty, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'team_drama',
    title: 'Drama de vestuario',
    description: 'Un compañero se pelea con el staff y el ambiente se vuelve tóxico.',
    weight: 8,
    condition: (state) => state.player.splitCount > 2,
    apply: (state, rng) => {
      const mentalidadLoss = roll(4, 8, rng);
      const hypeLoss = roll(2, 4, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            mentalidad: clamp(state.player.stats.mentalidad - mentalidadLoss, 0, 100),
            hype: clamp(state.player.stats.hype - hypeLoss, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'media_meme',
    title: 'Meme de la prensa',
    description: 'Un gesto de la partida se vuelve viral y te pone en la mira de todos.',
    weight: 7,
    condition: () => true,
    apply: (state, rng) => {
      const hypeGain = roll(4, 10, rng);
      const mentalidadLoss = roll(2, 4, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            hype: clamp(state.player.stats.hype + hypeGain, 0, 100),
            mentalidad: clamp(state.player.stats.mentalidad - mentalidadLoss, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'visa_delay',
    title: 'Visa en demora',
    description: 'Tu salida a otra región se retrasa y el calendario te juega en contra.',
    weight: 6,
    condition: (state) => state.player.splitCount > 4,
    apply: (state, rng) => {
      const mentalidadLoss = roll(4, 7, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            mentalidad: clamp(state.player.stats.mentalidad - mentalidadLoss, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'tendinitis',
    title: 'Tendinitis de muñeca',
    description: 'El cuerpo empieza a pedirte un descanso que no te das.',
    weight: 6,
    condition: (state) => state.player.splitCount > 3,
    apply: (state, rng) => {
      const mecanicaLoss = roll(3, 6, rng);
      const mentalidadLoss = roll(2, 4, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            mecanica: clamp(state.player.stats.mecanica - mecanicaLoss, 0, 100),
            mentalidad: clamp(state.player.stats.mentalidad - mentalidadLoss, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'sponsor_offer',
    title: 'Oferta de sponsor',
    description: 'Una marca te ofrece un contrato grande, pero con condiciones de imagen.',
    weight: 7,
    condition: (state) => state.player.stats.hype > 55,
    apply: (state, rng) => {
      const hypeGain = roll(2, 5, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            hype: clamp(state.player.stats.hype + hypeGain, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'burnout',
    title: 'Burnout de calendario',
    description: 'Las semanas se vuelven largas y el juego empieza a pesarte.',
    weight: 6,
    condition: (state) => state.player.splitCount > 4,
    apply: (state, rng) => {
      const mentalidadLoss = roll(5, 10, rng);
      const macroLoss = roll(1, 3, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            mentalidad: clamp(state.player.stats.mentalidad - mentalidadLoss, 0, 100),
            macro: clamp(state.player.stats.macro - macroLoss, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'title_run',
    title: 'Carrera de títulos',
    description: 'Una racha de victorias te devuelve el aire de campeón.',
    weight: 5,
    condition: (state) => state.player.splitCount > 5,
    apply: (state, rng) => {
      const gain = roll(2, 5, rng);
      return {
        ...state,
        player: {
          ...state.player,
          titles: state.player.titles + 1,
          stats: {
            ...state.player.stats,
            mentalidad: clamp(state.player.stats.mentalidad + gain, 0, 100),
            hype: clamp(state.player.stats.hype + 2, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'international_trip',
    title: 'Viaje internacional',
    description: 'Te suben a un torneo grande y el contexto cambia por completo.',
    weight: 6,
    condition: (state) => state.player.splitCount > 4,
    apply: (state, rng) => {
      const hypeGain = roll(3, 7, rng);
      const adaptGain = roll(1, 3, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            hype: clamp(state.player.stats.hype + hypeGain, 0, 100),
            adaptabilidad: clamp(state.player.stats.adaptabilidad + adaptGain, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'old_rival',
    title: 'Reencuentro con un rival',
    description: 'Tu rival de generación aparece otra vez y el matchup vuelve a ser noticia.',
    weight: 6,
    condition: (state) => state.player.splitCount > 3,
    apply: (state, rng) => {
      const hypeGain = roll(2, 6, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            hype: clamp(state.player.stats.hype + hypeGain, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'transfer_rumor',
    title: 'Rumor de transferencia',
    description: 'La prensa te pega como pieza de cambio y el mercado empieza a hablar.',
    weight: 6,
    condition: (state) => state.player.splitCount > 4,
    apply: (state, rng) => {
      const hypeGain = roll(3, 6, rng);
      const mentalidadLoss = roll(2, 4, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            hype: clamp(state.player.stats.hype + hypeGain, 0, 100),
            mentalidad: clamp(state.player.stats.mentalidad - mentalidadLoss, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'psychologist',
    title: 'Psicólogo deportivo',
    description: 'El staff te manda a trabajar la cabeza y te ayuda a bajar la presión.',
    weight: 5,
    condition: (state) => state.player.stats.mentalidad < 60,
    apply: (state, rng) => {
      const gain = roll(3, 7, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            mentalidad: clamp(state.player.stats.mentalidad + gain, 0, 100)
          }
        }
      };
    }
  },
  {
    id: 'worlds_dream',
    title: 'Sueño de Worlds',
    description: 'Llegás a un escenario grande y el objetivo de toda la carrera parece posible.',
    weight: 4,
    condition: (state) => state.player.splitCount > 6,
    apply: (state, rng) => {
      const hypeGain = roll(4, 8, rng);
      const macroGain = roll(1, 3, rng);
      return {
        ...state,
        player: {
          ...state.player,
          stats: {
            ...state.player.stats,
            hype: clamp(state.player.stats.hype + hypeGain, 0, 100),
            macro: clamp(state.player.stats.macro + macroGain, 0, 100)
          }
        }
      };
    }
  }
];

export function aplicar(state, rng) {
  const available = EVENTOS.filter((event) => event.condition(state));
  const totalWeight = available.reduce((sum, event) => sum + event.weight, 0);

  let cursor = rng() * totalWeight;
  let selected = available[0];

  for (const event of available) {
    cursor -= event.weight;
    if (cursor <= 0) {
      selected = event;
      break;
    }
  }

  const nextState = selected.apply(state, rng);

  return {
    state: nextState,
    logs: [{ type: 'event', message: `${selected.title}: ${selected.description}` }]
  };
}
