// Como se escriben los numeros cuando salen a la pantalla.
//
// Los stats viven como float adentro del estado a proposito: redondear en cada
// split introduce drift y movería el balance ya calibrado. Lo que no puede pasar
// es que ese float llegue crudo al jugador — `mecánica 62.12317247563275` tapa
// media pantalla y no significa nada.
//
// Regla: **se redondea al producir texto, nunca al guardar**. Todo modulo que
// arme una linea de log o pinte un dato usa estos helpers, y hay un check en
// validate que barre los logs de 200 carreras buscando decimales sueltos.
//
// Puro y sin DOM: corre igual en Node y en el navegador.

export function entero(valor) {
  return String(Math.round(Number(valor) || 0));
}

// Un cambio con su signo. `+0` no se escribe: si el efecto no movio nada, el
// texto tiene que decir eso y no fingir un incremento.
export function delta(valor) {
  const redondeado = Math.round(Number(valor) || 0);
  if (redondeado === 0) {
    return 'sin cambio';
  }
  return redondeado > 0 ? `+${redondeado}` : String(redondeado);
}

// Igual que `delta` pero para listas de efectos, donde "sin cambio" seria ruido:
// ahi un cero se escribe como `+0` porque el renglon ya existe por otra razon.
export function deltaCorto(valor) {
  const redondeado = Math.round(Number(valor) || 0);
  return redondeado >= 0 ? `+${redondeado}` : String(redondeado);
}

export function lp(valor) {
  return `${deltaCorto(valor)} LP`;
}

// Un stat de 0 a 100 contra su tope, para los logs que comparan ("53/100").
export function sobre100(valor) {
  return `${entero(valor)}/100`;
}

export function porcentaje(fraccion) {
  return `${Math.round((Number(fraccion) || 0) * 100)}%`;
}

// La plata nunca se gasta (CONCEPTO §11: no es un manager), pero se muestra: en
// la oferta, en la tarjeta final. Se escribe redonda, como se habla de sueldos.
export function plata(usd) {
  const valor = Math.round(Number(usd) || 0);
  if (Math.abs(valor) >= 1000000) {
    return `$${(valor / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (Math.abs(valor) >= 1000) {
    return `$${Math.round(valor / 1000)}k`;
  }
  return `$${valor}`;
}

// Une las partes de un resumen de efectos descartando las vacias, para que
// nunca salga "Hype +4, , Mentalidad -2".
export function lista(partes, vacio = 'sin cambios') {
  const limpias = partes.filter((parte) => parte !== null && parte !== undefined && parte !== '');
  return limpias.length > 0 ? limpias.join(', ') : vacio;
}
