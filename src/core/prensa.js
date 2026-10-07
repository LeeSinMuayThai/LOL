import { BALANCE } from '../data/balance.js';

// K6d-P: el tono que conviene en la rueda de prensa, en función pura (sin `rng`, sin DOM, no toca el estado).
//
// Hasta K6c el minijuego sorteaba el tono con `rngUi` y no daba ninguna pista: azar puro. Ahora el motor lo calcula del
// contexto de la carrera y manda `tono` y `pistas` en `decision.datos` de la pausa (la de después de una serie y la de
// después de un escándalo); la UI le suma un ruido chico (`BALANCE.prensa.ruidoUi`) y muestra las pistas.
//
// El tono es de 0 (Humilde) a 100 (Desafiante). Cada factor empuja desde `tonoBase` con un peso de `BALANCE.prensa`
// (positivo = más desafiante). Una pista es una frase por factor que pesó (regla de proceso 15: dice algo que el motor
// usó de verdad). La sinergia sale de `career.sinergia` y el hype de `player.stats.hype`: no son ejes de
// `calcularContexto`, se leen en vivo del estado (T2) igual que el contexto.

// El rival de la serie: el archirrival (por org, `mundo.archirrival.org` se llena cada cierre de edad) o uno de tu generación
// (`rivalDeGeneracion` en el plantel de esa org). Devuelve `{ tipo, org, handle }` o `null`.
function rivalDeLaSerie(state) {
  const org = state.serie?.rival?.org;
  if (!org) {
    return null;
  }
  const archirrival = state.mundo?.archirrival;
  if (archirrival?.org && archirrival.org === org) {
    return { tipo: 'archirrival', org, handle: archirrival.handle };
  }
  const plantel = state.mundo?.planteles?.[org] ?? {};
  const deGeneracion = Object.values(plantel).find((npc) => npc?.rivalDeGeneracion === true);
  if (deGeneracion) {
    return { tipo: 'generacion', org, handle: deGeneracion.handle };
  }
  return null;
}

// Los factores que pesan en este momento, cada uno con su empuje (puede ser 0: ese no pesa) y su frase.
export function factoresDePrensa(state, momento, datos = {}) {
  const b = BALANCE.prensa;
  const factores = [];

  if (momento === 'post_serie' && typeof datos.gano === 'boolean') {
    const esFinal = b.rondasDeFinal.includes(datos.trasRonda);
    const multiplicador = esFinal ? b.multiplicadorFinal : 1;
    if (datos.gano) {
      factores.push({
        id: 'serie',
        empuje: b.empujeGanaste * multiplicador,
        pista: esFinal
          ? 'Ganaste una final: la sala es tuya, podés ir al frente.'
          : 'Ganaste la serie: tenés crédito para hablar fuerte.'
      });
    } else {
      factores.push({
        id: 'serie',
        empuje: b.empujePerdiste * multiplicador,
        pista: esFinal
          ? 'Perdiste una final: hoy no es día de provocar, bajá el tono.'
          : 'Perdiste la serie: nada de excusas, bajá la cabeza.'
      });
    }
  }

  if (momento === 'post_escandalo') {
    factores.push({
      id: 'escandalo',
      empuje: b.empujeEscandalo,
      pista: 'Hay escándalo en el aire: lo que digas se cita completo, mejor bajar el tono.'
    });
  }

  const hype = state.player?.stats?.hype;
  if (typeof hype === 'number') {
    const empuje = (hype - b.hypeReferencia) * b.empujePorPuntoDeHype;
    factores.push({
      id: 'hype',
      empuje,
      pista: empuje < 0
        ? 'Tu hype está alto y todos te miran: humildad, que no te vendan como un divo.'
        : 'Casi nadie te conoce todavía: es tu micrófono para hacerte notar.',
      pistaSuave: empuje < 0
        ? 'Tu hype está algo por encima de lo normal: un poco de humildad no sobra.'
        : 'Tu hype está algo por debajo de lo normal: te conviene hacerte notar.'
    });
  }

  const sinergia = state.career?.sinergia;
  if (typeof sinergia === 'number' && state.career?.currentOrg) {
    const empuje = (sinergia - b.sinergiaReferencia) * b.empujePorPuntoDeSinergia;
    factores.push({
      id: 'sinergia',
      empuje,
      pista: empuje < 0
        ? 'El equipo anda flojo de sinergia: poné al grupo adelante.'
        : 'El equipo está aceitado: podés ir al frente, el vestuario aguanta.',
      pistaSuave: empuje < 0
        ? 'La sinergia del equipo viene algo floja: un poco de grupo adelante no sobra.'
        : 'La sinergia del equipo viene bien: podés ir un poco al frente.'
    });
  }

  if (momento === 'post_serie') {
    const rival = rivalDeLaSerie(state);
    if (rival) {
      factores.push({
        id: 'rival',
        empuje: rival.tipo === 'archirrival' ? b.empujeArchirrival : b.empujeRivalDeGeneracion,
        pista: rival.tipo === 'archirrival'
          ? `Enfrente estaba ${rival.org}, la org de tu archirrival ${rival.handle}: no le des el gusto de bajar la cabeza.`
          : `${rival.org} tiene a uno de tu generación: que se note que no te achicás.`
      });
    }
  }

  return factores;
}

// `{ tono, pistas, factores, mostrados }`. `tono` entero 0-100 (acotado a `tonoMin`-`tonoMax`: ningún contexto manda al
// extremo exacto); `pistas`, las frases de los `maxPistas` factores que más pesaron y pasan `umbralPista` (el más fuerte
// primero), completadas hasta `minPistas` con la frase suave de los que pesaron poco; `factores`, todos con su empuje, y
// `mostrados`, los ids de los que dieron pista, en el mismo orden (los leen los checks; el motor solo manda `tono` y `pistas`).
export function lecturaDePrensa(state, momento, datos = {}) {
  const b = BALANCE.prensa;
  const factores = factoresDePrensa(state, momento, datos);
  const suma = factores.reduce((acc, f) => acc + f.empuje, b.tonoBase);
  const tono = Math.round(Math.max(b.tonoMin, Math.min(b.tonoMax, suma)));
  // Las que pasan el umbral, las más fuertes primero (`maxPistas`). Si no llegan a `minPistas`, se completa con los que sí
  // empujaron (|empuje| > 0) pero poco, con su frase suave (`pistaSuave`: dice la misma dirección sin exagerar el peso).
  const porPeso = [...factores].sort((a, c) => Math.abs(c.empuje) - Math.abs(a.empuje));
  const fuertes = porPeso.filter((f) => Math.abs(f.empuje) >= b.umbralPista);
  const suaves = porPeso.filter((f) => Math.abs(f.empuje) < b.umbralPista && Math.abs(f.empuje) > 0 && f.pistaSuave);
  const mostrados = [
    ...fuertes.slice(0, b.maxPistas).map((f) => ({ id: f.id, pista: f.pista })),
    ...suaves.slice(0, Math.max(0, b.minPistas - fuertes.length)).map((f) => ({ id: f.id, pista: f.pistaSuave }))
  ];
  return { tono, pistas: mostrados.map((f) => f.pista), factores, mostrados: mostrados.map((f) => f.id) };
}

// Lo que el motor suma a `decision.datos` de una pausa de minijuego: solo si es la rueda de prensa (las demás mecánicas
// no leen tono). Los dos momentos que la pausan (`post_serie` en `systems/serie.js`, `post_escandalo` en `systems/events.js`)
// llaman a esta misma función.
export function datosDePrensa(state, minijuegoId, momento, datos = {}) {
  if (minijuegoId !== 'rueda_de_prensa') {
    return {};
  }
  const { tono, pistas } = lecturaDePrensa(state, momento, datos);
  return { tono, pistas };
}
