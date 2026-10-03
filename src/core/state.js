import { BALANCE } from '../data/balance.js';
import { perfilInicial } from './perfil.js';
import { generarMundo } from './mundo.js';
import { bonusPermanenteInicial } from './curvas.js';
import { puntosAbsolutos } from './ranked.js';
import { rankearMundo } from './topMundial.js';
import { esFechaDeDesafio, seedDelDia } from './desafio.js';

// El mundo entero sale de la seed (CONCEPTO §8): rol, region, colegio, viejos,
// potencial oculto, forma de carrera, pool inicial, meta y rivales. Por eso el
// rng se inyecta aca y no se crea adentro: la generacion del mundo consume del
// mismo stream que despues consume el pipeline, asi una seed reproduce la
// partida entera y no solo la mitad.
const EDAD_INICIAL = 15;

// `eleccion` es lo que el jugador decidio en la pantalla de inicio:
// `{ handle?, rol?, campeones? }`. Si no viene, todo se sortea de la seed — ese
// es el camino que corren simulate.js y validate.js.
//
// K1: `desafio` es `{ fecha: 'YYYY-MM-DD' }` cuando la partida es el desafío
// diario (`core/desafio.js`, `iniciarDesafio(fecha)` arma los argumentos) y
// `null` en cualquier otra. No toca el `rng`: solo queda anotado en
// `state.desafio`. Para que "misma fecha" garantice "mismo arranque", un
// desafío exige la seed del día y `eleccion: null` (el handle también entra en
// el mundo: el ruido del Top 20 lo hashea).
export function createInitialState(seed, rng, eleccion = null, desafio = null) {
  if (desafio !== null) {
    if (!esFechaDeDesafio(desafio?.fecha)) {
      throw new Error(`Desafío con fecha inválida: ${JSON.stringify(desafio?.fecha)}`);
    }
    if (seed !== seedDelDia(desafio.fecha)) {
      throw new Error(`El desafío del ${desafio.fecha} arranca con la seed ${seedDelDia(desafio.fecha)}, no con ${seed}`);
    }
    if (eleccion !== null) {
      throw new Error('El desafío diario arranca sin elección: rol, región y pool salen de la seed');
    }
  }
  const { inicial } = BALANCE;
  const { jugador, origen, mundo } = generarMundo(rng, EDAD_INICIAL, eleccion);

  const state = {
    seed,
    age: EDAD_INICIAL,
    phase: 'amateur',
    terminado: false,
    finAnticipado: null,
    // K5-C: por qué se retiró, dicho en una línea para la tarjeta ("Ninguna org de LCK te ofreció contrato en dos
    // pretemporadas seguidas."). Lo escribe `systems/retiro.js` en cada retiro que decide el mercado, la edad o vos;
    // `null` mientras la carrera sigue viva y en los finales que ya se explican solos (burnout, familia, no_llego).
    motivoRetiro: null,
    // Fase 9R5b: la tarjeta de legado, compuesta una sola vez por
    // `core/pipeline.js` cuando `terminado` pasa a true. `null` mientras la
    // carrera sigue viva. K1: lleva también `puntaje` (`core/puntaje.js`).
    tarjeta: null,
    // K1: `{ fecha }` si esta partida es el desafío diario, `null` si no
    // (presente desde el arranque, trampa T4).
    desafio: desafio === null ? null : { fecha: desafio.fecha },
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
    // `mercadoPretemporada` (fase 9Mc): la resolución del mercado del mundo del
    // último offseason — traspasos, asientos congelados y agentes libres. `null`
    // hasta el primer offseason profesional; lo escribe `core/mercadoMundial.js`.
    //
    // Fase 9W: `topMundial` es el ranking vivo de los mejores (largo
    // `BALANCE.topMundial.tamano`), reescrito cada split por
    // `systems/topMundial.js`. Se puebla abajo, ya en el arranque (trampa T4:
    // objeto completo, no un array vacío que la UI tenga que tolerar).
    // `mejorDelMundo` espeja `topMundial[0]`. `topMundialPrevioAnual` es la
    // foto del cierre de edad anterior, para el diff año a año.
    // `escenaAnual` / `escenaAnualPrevia`: el campeón de cada liga de tier 1 y
    // del internacional, este año y el pasado. `null` hasta el primer cierre
    // de edad (igual que `mercadoPretemporada`): todavía no cerró un año.
    mundo: {
      ...mundo,
      campeonesDebutados: [],
      mercadoPretemporada: null,
      topMundial: [],
      mejorDelMundo: null,
      topMundialPrevioAnual: [],
      escenaAnual: null,
      escenaAnualPrevia: null
    },
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
      // Fase 10c: el techo de mecanica que una lesion cronica deja permanente
      // (`systems/salud.js`, aplicado en `systems/atributos.js`). `null` =
      // sin tope todavia. Nunca baja solo: una vez que se fija, la
      // convergencia de edad no puede volver a llevarte por encima (trampa T4:
      // nunca undefined).
      techoLesionMecanica: null,
      // K3-B: lo que las decisiones le suman al objetivo de cada curva de edad (`core/curvas.js`). Un campo por
      // stat de curva, completo con ceros desde el arranque (trampa T4); con `fraccionPermanente` en 0 no se mueve.
      bonusPermanente: bonusPermanenteInicial(),
      splitCount: 0,
      titles: 0,
      worlds: 0,
      signatureChampion: null,
      campeonDelSplit: null,
      championPool: jugador.championPool,
      // K4-C: el perfil que resuelve los eventos que no son bifurcación (`core/perfil.js`). `actual` es la palabra
      // de la ficha; `pesos` los cuatro perfiles, que las bifurcaciones corren. Completo desde el arranque (T4).
      perfil: perfilInicial(seed, eleccion?.perfil ?? null)
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
      // K4-B: el año del calendario en que se usó la charla del coach (una por temporada); null si nunca.
      charlaUsadaEn: null,
      // El contrato vigente (fase 9). Objeto completo de ceros, nunca null
      // (trampa T4): antes de la primera firma profesional no hay contrato,
      // pero el campo tiene que existir para que validate.js pueda verificar
      // cualquier `field`/`path` que lo toque. `salarioAnualUSD` (no mensual:
      // CONCEPTO.md §12.6 reporta todo en cifras anuales — LEC mediana ~€165k/año,
      // Faker $6-8M/año — y `registro.dineroTotalUSD` solo tiene sentido como
      // acumulado de años, no de meses).
      contrato: {
        org: null, liga: null, tier: null,
        salarioAnualUSD: 0,
        anios: 0, aniosRestantes: 0,
        clausula: null,      // 'salida'|'rescision'|null
        tipo: 'ninguno',     // 'rookie'|'renovacion'|'transferencia'|'import'
        firmadoAEdad: 0, firmadoEnAnio: 0,
        // Fase D (D.1): el club ya avisó que no renueva. `false` al arrancar
        // (trampa T4); lo prende `systems/mercado.js` cuando la renovación
        // no sale, y se apaga al firmar un contrato nuevo.
        avisoNoRenovacion: false
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
        // K2b: el rendimiento base sin acotar del split y lo que tus fechas
        // dieron contra lo que su p prometía (la forma de `resultadosVacios()`).
        rendimientoBase: 0,
        resultadosPropios: { fechas: 0, ganados: 0, esperados: 0, varianza: 0 },
        fuerzaPropia: 0,
        // K2a: lo que el motor usó para la fuerza del split (nivel del jugador y
        // nivel medio de los compañeros), expuesto para el instrumento.
        nivelJugador: 0,
        nivelCompaneros: 0,
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
          rankedPuntos: 0,
          // Fase 9W: el mejor (MENOR) rank mundial de la vida. `0` = nunca
          // rankeado. Monótono no creciente — lo escribe `registrarPicoRank`.
          rankMundial: 0
        },
        // Una fila por org por la que pasaste (imagen 15: "TU HISTORIA, CLUB
        // POR CLUB"). Se abre al firmar y se cierra al irte; nunca se borra.
        porOrg: [],
        // Trofeos de por vida, para poder agrupar "5× LCK 2030 2031 2033...".
        titulos: [],
        internacionales: [],
        // Hitos narrativos con fecha, para que la fase 13 pueda citarlos.
        momentos: [],
        // K3-B: las marcas que dejaron las decisiones en las curvas de edad, `{ stat, delta, origen, anio }`
        // (`registrarMarca`). Solo crece. La ficha las muestra como "Lo que construiste".
        marcas: [],
        // Fase 9W: cuántos cierres de edad terminaste dentro del Top 20 del
        // mundo. Contador monótono, para "14 splits en el Top 20" de la
        // tarjeta de legado.
        splitsEnTopMundial: 0,
        // K1: cierres de edad como #1 del mundo ("El GOAT"). Solo crece.
        cierresComoNumeroUno: 0,
        // Fase 11 (§11.1): una fila por cierre de edad — la nota y el titular
        // que `core/temporadaResumen.js` calculó ese año. Lo consume el año
        // siguiente para comparar ("otra vez") y `validate.js` para medir la
        // correlación nota/posición y la repetición de titulares. Array vacío
        // al arrancar, nunca null (trampa T4).
        temporadas: []
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
      // K2a: tu fuerza al empezar la serie (campeón del split, sin ruido),
      // expuesta para el instrumento del Bo5.
      fuerzaInicial: 0,
      marcador: [0, 0],
      mapaActual: 0,
      mapas: [],
      quemados: [],
      // K4-B: el plan de Fearless, el campeón guardado para el mapa decisivo, si ya te frenaron a re-planear, el
      // campeón con el que el rival juega el mapa en curso (y el índice de ese mapa), y si la serie no tiene nada en juego.
      plan: null,
      guardado: null,
      replanUsado: false,
      rivalJuega: null,
      rivalJuegaEnMapa: -1,
      sinNadaEnJuego: false,
      // Dos cupos de minijuego (9R4b; K4 sacó el del mapa normal y el bootcamp): `decisivoUsado` es el del mapa
      // decisivo; `minijuegoUsado`, el de la rueda de prensa de después de la final.
      minijuegoUsado: false,
      decisivoUsado: false,
      postSerie: false
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
      // Fase 9R4a: los minijuegos jugados ultimamente, cada uno con el
      // `splitCount` en el que salio. `core/minijuegos.js` lo consulta para no
      // repetir la misma mecanica dos series seguidas si hay otra elegible para
      // ese momento. Array vacio al arrancar, nunca null (trampa T4).
      minijuegosRecientes: [],
      // J4 (K4-C): las categorías de los últimos eventos (ventana `eventos.categoriasRecientesMax`), para que la
      // selección no repita categoría dos veces seguidas por peso. Array vacío al arrancar (T4).
      categoriasRecientes: [],
      // J4 (K4-C): el `splitCount` del parche en el que tu main cayó de S/A a B/C (`systems/meta.js`); `main_muerto`
      // dura `contexto.ventanaMainMuerto` splits desde ahí. `null` = nunca cayó (T4).
      splitMainMuerto: null,
      // K4-C: los saltos grandes que ya tuvieron su prueba ('tier2', 'tier1', 'import'): la prueba sale una vez
      // por salto (`systems/mercado.js`). Array vacío al arrancar (T4).
      saltosConPrueba: [],
      // K4-C2: los caminos que dejaron las bifurcaciones de carrera (`data/events/caminos.json`). Una clave por
      // bifurcación, `null` hasta que la decidís; el valor es lo que pasó ('abierto', 'cerrado', 'tiempo_completo'...).
      // Los eventos de seguimiento y los gates de otros eventos la leen con una `condition` común. Completo desde el
      // arranque (T4): una condición sobre un campo que no existe no pasa el esquema de eventos.
      caminos: {
        region: null,     // 'abierto' | 'cerrado' | 'asentado'
        contenido: null,  // 'tiempo_completo' | 'hibrido' | 'solo_competir' | 'consolidado'
        rol: null,        // 'cubrio' | 'a_prueba' | 'se_nego' | 'integrado'
        playoffs: null,   // 'infiltrado' | 'paro' | 'sin_infiltrar' | 'recuperado' | 'cronico'
        conflicto: null,  // 'con_la_org' | 'contra_la_org' | 'en_el_medio' | 'resuelto'
        staff: null       // 'puerta_abierta' | 'en_transicion' | 'cerrada'
      },
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
      // Fase 9Md: el split en que descendiste de tier 1 (D16). `null` si nunca
      // pasó. `core/contexto.js` prende la marca `descenso` mientras esté
      // dentro de `BALANCE.contexto.ventanaDescenso` splits.
      splitDescenso: null,
      // "la_prueba" (fase 4): el tryout con el tier 3 deja este bonus/malus,
      // que `roster.js` consume una sola vez al armar el primer roster (el
      // split del fichaje todavía no tiene equipo armado) y lo vuelve a cero.
      bonusJerarquiaTryout: 0,
      // Fase 9: la jerarquía que `mercado.js` ya sorteó y mostró en la
      // tarjeta de oferta ANTES de aceptar. `roster.js` la usa tal cual en
      // vez de volver a tirar el dado (regla de proceso 15) y la resetea acá.
      jerarquiaProyectadaAlFichar: null,
      // K1 (D76): el split del pase, jugado antes de que `roster.js` abra la
      // fila (`{ org, splitsPorTier }`, de `temporada.js`). Si no, `null`.
      splitJugadoSinFila: null,
      // K2b (revisión): la química del plantel nuevo que `mercado.js` fija al
      // firmar un traspaso (ese primer split ya se juega con los compañeros
      // nuevos). `roster.js` la usa tal cual en vez de volver a tirar el dado y
      // la resetea acá. `null` si no hay una pendiente.
      sinergiaProyectadaAlFichar: null,
      // Fase 9: splits de pretemporada consecutivos sin una sola oferta. Al
      // llegar a `BALANCE.mercado.splitsSinOfertaParaLibre` te quedás libre
      // — la puerta por la que se termina la carrera (fase 10, todavía no
      // construida).
      splitsSinOfertaConsecutivos: 0,
      // K5-C: pretemporadas seguidas con el mercado abierto sin una oferta de tu tier o mejor (`systems/mercado.js`).
      // Al llegar a `BALANCE.retiro.splitsSinOfertaEnTierParaBifurcar` frena la bifurcación "bajás o te retirás". Se
      // vuelve a 0 con una oferta de tu tier, al firmar y al retirarte.
      splitsSinOfertaEnTier: 0,
      // K5-C: el `splitCount` de la última vez que frenó esa bifurcación (-1 = nunca). `systems/retiro.js` lo lee para
      // no preguntar `retiro_declive` en la misma pretemporada: el mercado ya preguntó.
      forkMercadoSplit: -1,
      // K4-D: el `splitCount` de la última pretemporada cuya preparación (las rutinas de offseason) ya se resolvió. -1 =
      // ninguna todavía. Lo escribe `systems/practica.js` y evita que la pretemporada frene dos veces.
      preparacionDeSplit: -1,
      // Fase 9: "llamar al representante" (PLAN.md §9.6) rebaraja la mano de
      // ofertas una única vez en toda la carrera.
      llamadaRepresentante: false,
      // Fase 9Mf: `systems/rendimiento.js` lo prende cuando perdés la
      // titularidad (tu nivel cayó por debajo del suplente en un split flojo);
      // `systems/mercado.js` lo consume la pretemporada siguiente cediéndote a
      // la liga de desarrollo, y lo apaga. `false` al arrancar (trampa T4).
      banquilloPendiente: false,
      // Fase 9W: el rank mundial absoluto del jugador AHORA
      // (`systems/topMundial.js` lo reescribe cada split) y al cierre de edad
      // anterior (para el diff). `null` si no es rankeable — sólo `tier === 1`
      // entra en la conversación del Top 20 (refuerza 9Mi).
      rankMundialActual: null,
      rankMundialAnterior: null,
      // Fase 10a: cuántas pretemporadas seguidas lleva `contexto.etapa` en
      // 'declive' (sin equipo, banqueado, o por debajo de su pico de nivel).
      // `systems/retiro.js` lo acumula y lo usa como el reloj real del retiro
      // — no una edad fija: sube mientras el mercado te rechaza, se resetea
      // apenas volvés a pisar terreno firme. Nunca null (trampa T4).
      splitsEnDeclive: 0,
      // Cuántos splits lleva abierta la ventana de vuelta actual. Reloj
      // propio, no `player.splitCount`: mientras `phase: 'retirado'` corta
      // el registro (`core/pipeline.js`), ese contador queda congelado — así
      // que la ventana necesita el suyo. Lo escribe y lo resetea
      // `systems/retiro.js`.
      splitsEnVentana: 0,
      // Cuántas veces ya volvió de un retiro reversible en esta carrera
      // (Bjergsen/Doublelift: dos cada uno — `CONCEPTO` §12.4). Al llegar a
      // `BALANCE.retiro.vueltasMaximas` el próximo retiro ya no abre ventana.
      vueltasUsadas: 0,
      // K4-C2 (regla 15): los efectos de carrera de las bifurcaciones (`systems/events.js`). `ofertaDeImport` es la
      // oferta de import aceptada que el mercado firma en la próxima pretemporada (`{ ligas, clausula }`);
      // `rolDeOrigen` la línea y el pool que dejaste al cambiar de línea (`{ rol, pool }`). `null` mientras no pasó (T4).
      // El motivo de un retiro elegido no vive acá: va a `state.motivoRetiro`, como todo motivo de retiro (K5).
      ofertaDeImport: null,
      rolDeOrigen: null,
      // El `splitCount` de la última vuelta, para la marca transitoria
      // `vuelta_del_retiro` (mismo patrón que `splitDescenso`/`ventanaDescenso`).
      splitVuelta: null,
      // Fase 10c (`systems/salud.js`): splits seguidos con `deudaSueno` sobre
      // el umbral de riesgo físico. Sube y baja de a uno, igual que
      // `splitsMentalBajo` de `atributos.js`. Nunca null (trampa T4).
      splitsRiesgoFisico: 0,
      // El `splitCount` en el que pinchó la última lesión GRAVE (tendinitis /
      // hombro). `null` hasta la primera vez; distinto de una recaída, que se
      // detecta comparando contra este valor ya seteado. Prende la marca
      // permanente `lesion_cronica` (no se apaga nunca, mismo criterio que
      // `es_campeon`/`nomade`).
      lesionGraveSplit: null,
      // Fechas de temporada regular que quedan por perderte por lesión
      // (`systems/temporada.js` lo consume fecha a fecha en
      // `continuarTemporada`, nunca splits enteros). Nunca negativo.
      fechasBajaLesion: 0,
      // Fase 10c (`systems/servicioMilitar.js`): true mientras dura la cadena
      // de 3 decisiones del servicio (un solo split — no se modela tiempo que
      // pasa). Alimenta la marca `servicio_militar`.
      enServicioMilitar: false,
      // Ya cumpliste el servicio: no se te vuelve a disparar.
      servicioCumplido: false,
      // Ganaste un internacional siendo coreano: la medalla de los Asian
      // Games te exime — nunca se dispara el servicio.
      exentoServicio: false
    },
    logs: []
  };

  // Fase 9W: el ranking arranca poblado (trampa T4). El jugador todavía no es
  // rankeable (`career.tier === null`), así que es puro NPC — nivel + ruido
  // determinista, sin bono de resultado (no cerró ningún año).
  state.mundo.topMundial = rankearMundo(state);
  state.mundo.mejorDelMundo = state.mundo.topMundial[0] ?? null;
  state.mundo.topMundialPrevioAnual = state.mundo.topMundial;

  return state;
}
