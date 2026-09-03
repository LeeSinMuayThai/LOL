import { BALANCE } from '../data/balance.js';
import { generarMundo } from './mundo.js';
import { puntosAbsolutos } from './ranked.js';

// El mundo entero sale de la seed (CONCEPTO §8): rol, region, colegio, viejos,
// potencial oculto, forma de carrera, pool inicial, meta y rivales. Por eso el
// rng se inyecta aca y no se crea adentro: la generacion del mundo consume del
// mismo stream que despues consume el pipeline, asi una seed reproduce la
// partida entera y no solo la mitad.
const EDAD_INICIAL = 15;

// `eleccion` es lo que el jugador decidio en la pantalla de inicio:
// `{ handle?, rol?, campeones? }`. Si no viene, todo se sortea de la seed — ese
// es el camino que corren simulate.js y validate.js.
export function createInitialState(seed, rng, eleccion = null) {
  const { inicial } = BALANCE;
  const { jugador, origen, mundo } = generarMundo(rng, EDAD_INICIAL, eleccion);

  return {
    seed,
    age: EDAD_INICIAL,
    phase: 'amateur',
    terminado: false,
    finAnticipado: null,
    // Fase 9R5b: la tarjeta de legado, compuesta una sola vez por
    // `core/pipeline.js` cuando `terminado` pasa a true. `null` mientras la
    // carrera sigue viva.
    tarjeta: null,
    splitFichaje: null,
    // Decision a medio resolver. Vive adentro de state para que una partida en
    // curso sea serializable y reanudable (regla invariable 9).
    pendiente: null,
    // Fase 9Rf: el cupo de interrupciones del split. `systems/presupuesto.js`
    // lo fija al arrancar cada split; `core/pipeline.js` descuenta una por
    // pausa. Objeto completo desde el arranque, nunca null (trampa T4).
    presupuesto: { total: BALANCE.partida.maxDecisionesPorSplit, gastadas: 0 },
    // Cache de "dónde estás parado". La fuente de verdad es calcularContexto();
    // esto existe para la UI, los logs y para no recalcularlo en cada filtro.
    contexto: null,
    // El año calendario (fase 8): `anioBase + floor(splitCount / splitsPorEdad)`,
    // recalculado cada split por `systems/edadInicio.js`. No consume rng: es
    // determinista dado el estado. Objeto completo desde el arranque, nunca
    // null (trampa T4).
    calendario: {
      anioBase: BALANCE.calendario.anioBase,
      anio: BALANCE.calendario.anioBase,
      temporada: 1,
      etiqueta: String(BALANCE.calendario.anioBase)
    },
    origen,
    // Los campeones que salieron con un parche a mitad de esta carrera. Arranca
    // vacío: los marcados `debut` en champions.json todavía no existen en este
    // mundo (trampa T4 — tiene que existir en el estado inicial, nunca null).
    mundo: { ...mundo, campeonesDebutados: [] },
    player: {
      name: jugador.handle,
      role: jugador.role,
      stats: jugador.stats,
      oculto: jugador.oculto,
      studies: jugador.barras.studies,
      familyTrust: jugador.barras.familyTrust,
      sleep: jugador.barras.sleep,
      // La escalera real: tier, división y LP. Es la fuente de verdad.
      ranked: jugador.ranked,
      // Espejo derivado de solo lectura (puntos absolutos de la escalera).
      // Existe para que todo lo que ya leía este campo siga funcionando; nadie
      // lo escribe salvo `conRanked`.
      soloqElo: puntosAbsolutos(jugador.ranked),
      // Periodos consecutivos robandole al sueño, ya convertidos en deuda.
      deudaSueno: 0,
      splitCount: 0,
      titles: 0,
      worlds: 0,
      signatureChampion: null,
      campeonDelSplit: null,
      championPool: jugador.championPool
    },
    career: {
      orgs: [],
      contracts: [],
      hitos: [],
      currentOrg: null,
      currentSplit: 1,
      // 1, 2 o 3 (fase 3). Es la fuente de verdad de en qué nivel competís:
      // `liga` puede ser null (tier 3 no es una liga real) y `tier` no.
      tier: null,
      // En qué split entraste a una liga real por primera vez. Distinto de
      // `splitFichaje` (cuándo dejaste el amateurismo, que puede haber sido en
      // tier 3): el debut de CONCEPTO §2 es pisar tier 1, no cualquier
      // contrato. `splitFichaje` sigue siendo el KPI de "cuánto tardaste en
      // hacerte notar" que reporta simulate.js — no se pisa.
      splitAscensoTier1: null,
      // Roster, jerarquía y sinergia: se llenan al firmar.
      liga: null,
      rosterDeOrg: null,
      companeros: [],
      jerarquia: 0,
      // Distinto de la jerarquía (fase 8, decisión de PLAN.md PARTE 3): la
      // jerarquía es tu estatus deportivo y se resetea al cambiar de equipo;
      // el arraigo es el vínculo con la gente de la org y NUNCA se resetea —
      // se cierra en `registro.porOrg` al irte y el nuevo arranca casi en
      // cero, salvo que el hype ya te haya hecho conocido de antes.
      arraigo: 0,
      sinergia: 0,
      // Ventana móvil de "cómo te fue" (0-100 por split). Alimenta el momentum
      // del contexto: es lo que distingue una racha de un slump.
      historial: [],
      // Resultado del último split competitivo.
      posicion: null,
      titulos: 0,
      podios: 0,
      internacionales: 0,
      // Cuantas series de playoffs (fase 4) se jugaron hasta el final, ganadas
      // o perdidas. Denominador de "decisiones de draft por serie".
      seriesJugadas: 0,
      // La org que te eliminó de la última serie de playoffs que jugaste
      // (fase 5, `stakes: 'revancha'`). `null` hasta la primera eliminación;
      // lo escribe `systems/serie.js`.
      ultimoEliminadoPor: null,
      // El contrato vigente (fase 9). Objeto completo de ceros, nunca null
      // (trampa T4): antes de la primera firma profesional no hay contrato,
      // pero el campo tiene que existir para que validate.js pueda verificar
      // cualquier `field`/`path` que lo toque. `salarioAnualUSD` (no mensual:
      // TRASPASO.md §4 reporta todo en cifras anuales — LEC mediana ~€165k/año,
      // Faker $6-8M/año — y `registro.dineroTotalUSD` solo tiene sentido como
      // acumulado de años, no de meses).
      contrato: {
        org: null, liga: null, tier: null,
        salarioAnualUSD: 0,
        anios: 0, aniosRestantes: 0,
        clausula: null,      // 'salida'|'rescision'|null
        tipo: 'ninguno',     // 'rookie'|'renovacion'|'transferencia'|'import'
        firmadoAEdad: 0, firmadoEnAnio: 0
      },
      // La temporada regular del split en curso (fase 5). Objeto completo de
      // ceros, nunca null (trampa T4): se llena al arrancar cada split
      // profesional y `rendimiento.js` lee `posicion`/`tabla`/`rendimiento` de
      // acá en vez de resolverlos de nuevo.
      temporada: {
        activa: false,
        calendario: [],
        // Fase 9Rb: los cruces ajenos por jornada del fixture round-robin.
        // Objeto/array completo desde el arranque, nunca null (trampa T4).
        cruces: [],
        indice: 0,
        rendimiento: 0,
        fuerzaPropia: 0,
        registrosOtros: {},
        filaPropia: { org: null, ganados: 0, perdidos: 0 },
        racha: 0,
        objetivoMarcadas: 0,
        marcadasHechas: 0,
        ajustePartido: 0,
        posicion: null,
        tabla: [],
        fechaEnCurso: null
      },
      // El registro de carrera (fase 8, PLAN.md §8.1): la hoja que acumula.
      // Regla dura (regla de proceso 14): solo crece — ningún sistema borra ni
      // sobrescribe un campo de acá, solo `append` e incremento. Objeto
      // completo de ceros desde el arranque, nunca null (trampa T4). Las
      // funciones que lo tocan viven en `core/registro.js`.
      registro: {
        splitsJugados: 0,
        splitsConEquipo: 0,
        fechasGanadas: 0,
        fechasPerdidas: 0,
        mapasGanados: 0,
        mapasPerdidos: 0,
        seriesGanadas: 0,
        seriesPerdidas: 0,
        // La fase 9 lo alimenta; hasta entonces queda en 0.
        dineroTotalUSD: 0,
        // Los picos (imagen 15 de PLAN.md: "93 MEDIA MÁX", "US$95,6M VALOR
        // MÁS ALTO"). Cobertura de mejor esfuerzo: se registran en los
        // sistemas donde cada valor se mueve de verdad (roster, rendimiento,
        // serie, atributos), no en cada línea que toca un stat.
        picos: {
          nivel: 0, edadDelPicoDeNivel: 0,
          jerarquia: 0, arraigo: 0, hype: 0,
          valorMercadoUSD: 0, salarioAnualUSD: 0,
          rankedPuntos: 0
        },
        // Una fila por org por la que pasaste (imagen 15: "TU HISTORIA, CLUB
        // POR CLUB"). Se abre al firmar y se cierra al irte; nunca se borra.
        porOrg: [],
        // Trofeos de por vida, para poder agrupar "5× LCK 2030 2031 2033...".
        titulos: [],
        internacionales: [],
        // Hitos narrativos con fecha, para que la fase 13 pueda citarlos.
        momentos: []
      }
    },
    // La serie de playoffs en curso (fase 4). Objeto completo de ceros, nunca
    // null (trampa T4): se activa al clasificar y se resetea al arrancar cada
    // ronda nueva (el Fearless no acumula entre rondas: cada rival es una serie
    // propia, con sus propios quemados).
    serie: {
      activa: false,
      ronda: null,
      rival: { org: null, fuerza: 0 },
      formato: 0,
      marcador: [0, 0],
      mapaActual: 0,
      mapas: [],
      quemados: [],
      minijuegoUsado: false
    },
    meta: {
      patch: 1,
      // Placeholder: `systems/meta.js` corre siempre (primer sistema real del
      // registro que toca el meta) y resuelve un régimen de verdad ya en el
      // split 1 — este valor nunca lo lee nadie más antes de eso.
      regimen: 'tanques',
      weights: mundo.metaInicial,
      // La tier list del rol para el régimen vigente y la del parche anterior
      // (fase 6): objetos completos desde el arranque, nunca null (trampa T4).
      tierList: [],
      tierListAnterior: [],
      // Se recalcula cada split cruzando el pool contra la tier list vigente.
      ajuste: BALANCE.campeones.ajusteNeutro
    },
    flags: {
      // Fase 9Ra: por evento, el `splitCount` en el que su cooldown vence. Un
      // evento está bloqueado mientras `cooldownHasta[id] > splitCount`. Antes
      // esto era `cooldowns` (un contador que se decrementaba en cada evento
      // resuelto, ~4,5 por split, así que un `cooldown: 4` duraba 0,89 splits).
      // El rename es a propósito: si algo quedó leyendo `flags.cooldowns` rompe
      // en voz alta en vez de comparar un número de split como si fuera un
      // contador. Objeto vacío al arrancar, nunca null (trampa T4).
      cooldownHasta: {},
      // Cuántas veces salió cada evento (fase 7): objeto vacío al arrancar,
      // nunca null (trampa T4). `systems/events.js` lo lee para pesar la
      // repetición contra la novedad.
      eventosVistos: {},
      // Fase 9R0a: los pares (motivo, rival) de fecha marcada usados
      // últimamente, cada uno con el `splitCount` en el que se marcó. Vive
      // en `flags` y no en `career.temporada` porque ese objeto se rearma
      // entero cada split. `systems/temporada.js` lo consulta para no
      // re-marcar la misma revancha/clásico contra el mismo rival un split
      // sí y otro también. Array vacío al arrancar, nunca null (trampa T4).
      motivosFechaRecientes: [],
      // Rastro de un solo split: qué campeón(es) entró el último efecto `pool`
      // con `accion: 'aprender'` de ESTE outcome. Lo usa el siguiente efecto
      // del mismo outcome (`accion: 'maestria', objetivo: 'nuevo'`) para saber
      // a quién apuntarle — arreglo del bug donde el bono caía siempre en el
      // campeón de siempre en vez de en el recién aprendido (fase 8D). Nunca
      // se lee fuera de `aplicarAlPool`.
      ultimoAprendidoPool: [],
      robosConsecutivos: 0,
      pcConfiscada: 0,
      // Fase 9R.2: splits seguidos con la mentalidad en zona roja
      // (`al_limite`). El burnout solo pincha cuando llega a
      // `burnoutSplitsMinimos`. Nunca null (trampa T4).
      splitsMentalBajo: 0,
      avisos: 0,
      nocturno: false,
      negociacionGanada: false,
      // Se congela a los 18 (o al dejar la etapa amateur) y acompaña el resto
      // de la carrera: 'terminado' o 'lo_dejo'.
      secundario: null,
      // El año muerto (fases 3 y 9): ganaste el ascenso pero la liga exige más
      // edad de la que tenés. `mercado.js` lo resuelve solo apenas cumplís,
      // sin volver a sortear nada (unifica lo que hasta la fase 9 vivía
      // partido entre `competitivo.js` eligiendo destino Y esperando edad —
      // ahora competitivo.js solo marca el ascenso ganado, `{ligaId, tier}`;
      // mercado.js decide cuándo y con quién se hace efectivo).
      ascensoPendiente: null,
      // "la_prueba" (fase 4): el tryout con el tier 3 deja este bonus/malus,
      // que `roster.js` consume una sola vez al armar el primer roster (el
      // split del fichaje todavía no tiene equipo armado) y lo vuelve a cero.
      bonusJerarquiaTryout: 0,
      // Fase 9: la jerarquía que `mercado.js` ya sorteó y mostró en la
      // tarjeta de oferta ANTES de aceptar. `roster.js` la usa tal cual en
      // vez de volver a tirar el dado (regla de proceso 15) y la resetea acá.
      jerarquiaProyectadaAlFichar: null,
      // Fase 9: splits de pretemporada consecutivos sin una sola oferta. Al
      // llegar a `BALANCE.mercado.splitsSinOfertaParaLibre` te quedás libre
      // — la puerta por la que se termina la carrera (fase 10, todavía no
      // construida).
      splitsSinOfertaConsecutivos: 0,
      // Fase 9: "llamar al representante" (PLAN.md §9.6) rebaraja la mano de
      // ofertas una única vez en toda la carrera.
      llamadaRepresentante: false
    },
    logs: []
  };
}
