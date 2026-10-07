import { BALANCE } from '../data/balance.js';
import { calcularContexto } from './contexto.js';

// K6d-P: el tono que conviene en la rueda de prensa, en función pura (sin `rng`, sin DOM, no toca el estado).
//
// Hasta K6c el minijuego sorteaba el tono con `rngUi` y no daba ninguna pista: azar puro. Ahora el motor lo calcula del
// contexto de la carrera y manda `tono` y `pistas` en `decision.datos` de la pausa (la de después de una serie y la de
// después de un escándalo); la UI le suma un ruido chico (`BALANCE.prensa.ruidoUi`) y muestra las pistas.
//
// El tono es de 0 (Humilde) a 100 (Desafiante). Cada factor empuja desde `tonoBase` con un peso de `BALANCE.prensa`
// (positivo = más desafiante). Una pista es una frase por factor que pesó (regla de proceso 15: dice algo que el motor usó de
// verdad, y no afirma más de lo que es: la frase fuerte solo sale pasada su banda, en el medio la frase dice «algo por encima
// / por debajo de lo normal»). La forma sale de `calcularContexto` (eje `momentum`, regla 9); el hype, la sinergia, la
// jerarquía y la mentalidad no son ejes de contexto y se leen en vivo del estado (T2).

// Un factor continuo: `valor` contra su `referencia`, con un empuje por punto. Elige la frase por banda (`alto` / `bajo`).
function factorContinuo({ id, valor, referencia, empujePorPunto, alto, bajo, textos }) {
  const empuje = (valor - referencia) * empujePorPunto;
  let pista = textos.neutra;
  if (valor >= alto) {
    pista = textos.alta;
  } else if (valor <= bajo) {
    pista = textos.baja;
  } else if (valor > referencia) {
    pista = textos.arriba;
  } else if (valor < referencia) {
    pista = textos.abajo;
  }
  return { id, empuje, pista };
}

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

const FRASES_FORMA = {
  racha: 'Venís en racha: la sala te escucha, podés ir al frente.',
  estable: 'Tus resultados vienen normales: no te mueven el tono.',
  slump: 'Venís en un slump de resultados: hoy se escucha más la humildad.',
  crisis: 'Venís en crisis de resultados: hoy toca bajar el tono.'
};

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
          ? 'Perdiste una final: hoy se escucha más la humildad.'
          : 'Perdiste la serie: nada de excusas, bajá el tono.'
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
    factores.push(factorContinuo({
      id: 'hype',
      valor: hype,
      referencia: b.hypeReferencia,
      empujePorPunto: b.empujePorPuntoDeHype,
      alto: b.hypeAlto,
      bajo: b.hypeBajo,
      textos: {
        alta: 'Tu hype está alto y todos te miran: humildad, que no te vendan como un divo.',
        baja: 'Tu hype todavía es bajo: es tu micrófono para hacerte notar.',
        arriba: 'Tu hype está algo por encima de lo normal: un poco de humildad no sobra.',
        abajo: 'Tu hype está algo por debajo de lo normal: te conviene hacerte notar.',
        neutra: 'Tu hype está en lo normal: no te mueve el tono.'
      }
    }));
  }

  const sinergia = state.career?.sinergia;
  if (typeof sinergia === 'number' && state.career?.currentOrg) {
    factores.push(factorContinuo({
      id: 'sinergia',
      valor: sinergia,
      referencia: b.sinergiaReferencia,
      empujePorPunto: b.empujePorPuntoDeSinergia,
      alto: b.sinergiaAlta,
      bajo: b.sinergiaBaja,
      textos: {
        alta: 'El equipo está aceitado: podés ir al frente, el team te respalda.',
        baja: 'El equipo anda flojo de sinergia: poné al grupo adelante.',
        arriba: 'La sinergia del equipo viene bien: podés ir un poco al frente.',
        abajo: 'La sinergia del equipo viene algo floja: un poco de grupo adelante no sobra.',
        neutra: 'La sinergia del equipo está en lo normal: no te mueve el tono.'
      }
    }));
  }

  const jerarquia = state.career?.jerarquia;
  if (typeof jerarquia === 'number' && state.career?.currentOrg) {
    factores.push(factorContinuo({
      id: 'jerarquia',
      valor: jerarquia,
      referencia: b.jerarquiaReferencia,
      empujePorPunto: b.empujePorPuntoDeJerarquia,
      alto: b.jerarquiaAlta,
      bajo: b.jerarquiaBaja,
      textos: {
        alta: 'Sos de los referentes del equipo: tenés autoridad para hablar fuerte.',
        baja: 'En el equipo todavía sos de los nuevos: hablá con respeto.',
        arriba: 'Pesás algo más que lo normal en el equipo: podés hablar con algo más de firmeza.',
        abajo: 'Pesás algo menos que lo normal en el equipo: mejor con respeto.',
        neutra: 'Tu peso en el equipo es el normal: no te mueve el tono.'
      }
    }));
  }

  const forma = calcularContexto(state).momentum;
  factores.push({ id: 'forma', empuje: b.empujePorForma[forma] ?? 0, pista: FRASES_FORMA[forma] ?? FRASES_FORMA.estable });

  const mentalidad = state.player?.stats?.mentalidad;
  if (typeof mentalidad === 'number') {
    factores.push(factorContinuo({
      id: 'mentalidad',
      valor: mentalidad,
      referencia: b.mentalidadReferencia,
      empujePorPunto: b.empujePorPuntoDeMentalidad,
      alto: b.mentalidadAlta,
      bajo: b.mentalidadBaja,
      textos: {
        alta: 'Venís con la cabeza fría: aguantás que te aprieten, podés ir al frente.',
        baja: 'Venís con la cabeza caliente: no te metas en peleas.',
        arriba: 'Tu cabeza viene algo mejor que lo normal: podés ir un poco al frente.',
        abajo: 'Tu cabeza viene algo tocada: no te metas en peleas.',
        neutra: 'Tu cabeza viene como siempre: no te mueve el tono.'
      }
    }));
  }

  if (momento === 'post_serie') {
    const rival = rivalDeLaSerie(state);
    if (rival) {
      factores.push({
        id: 'rival',
        empuje: rival.tipo === 'archirrival' ? b.empujeArchirrival : b.empujeRivalDeGeneracion,
        pista: rival.tipo === 'archirrival'
          ? `Enfrente estaba ${rival.org}, la org de tu archirrival ${rival.handle}: a ese rival se le contesta con carácter.`
          : `${rival.org} tiene a uno de tu generación: que se note que no te achicás.`
      });
    }
  }

  return factores;
}

// `{ tono, pistas, factores, mostrados }`. `tono` entero 0-100 (acotado a `tonoMin`-`tonoMax`: ningún contexto manda al
// extremo exacto); `pistas`, las frases de los `maxPistas` factores de más empuje que pasan `umbralPista`, el más fuerte
// primero, completadas hasta `minPistas` con los de más empuje que siguen (frase suave, o neutra si no empujan);
// `factores`, todos con su empuje, y `mostrados`, los ids de los que dieron pista, en el mismo orden (los leen los checks; el
// motor solo manda `tono` y `pistas`).
export function lecturaDePrensa(state, momento, datos = {}) {
  const b = BALANCE.prensa;
  const factores = factoresDePrensa(state, momento, datos);
  const suma = factores.reduce((acc, f) => acc + f.empuje, b.tonoBase);
  const tono = Math.round(Math.max(b.tonoMin, Math.min(b.tonoMax, suma)));
  const porPeso = [...factores].sort((a, c) => Math.abs(c.empuje) - Math.abs(a.empuje));
  const fuertes = porPeso.filter((f) => Math.abs(f.empuje) >= b.umbralPista).slice(0, b.maxPistas);
  const resto = porPeso.filter((f) => !fuertes.includes(f));
  const mostrados = [...fuertes, ...resto.slice(0, Math.max(0, b.minPistas - fuertes.length))];
  return { tono, pistas: mostrados.map((f) => f.pista), factores, mostrados: mostrados.map((f) => f.id) };
}

// Lo que el motor suma a `decision.datos` de una pausa de minijuego: solo si es la rueda de prensa (las demás mecánicas no
// leen tono). Los dos momentos que la pausan (`post_serie` en `systems/serie.js`, `post_escandalo` en `systems/events.js`)
// llaman a esta misma función.
export function datosDePrensa(state, minijuegoId, momento, datos = {}) {
  if (minijuegoId !== 'rueda_de_prensa') {
    return {};
  }
  const { tono, pistas } = lecturaDePrensa(state, momento, datos);
  return { tono, pistas };
}
