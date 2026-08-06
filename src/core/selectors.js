const OPERADORES = {
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b
};

export function getPath(state, path) {
  return path.split('.').reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), state);
}

export function setPath(state, path, value) {
  const keys = path.split('.');
  const [head, ...rest] = keys;

  if (rest.length === 0) {
    return { ...state, [head]: value };
  }

  return {
    ...state,
    [head]: setPath(state[head] ?? {}, rest.join('.'), value)
  };
}

export function cumpleCondiciones(state, conditions = []) {
  return conditions.every(({ field, op, value }) => {
    const operador = OPERADORES[op];
    if (!operador) {
      throw new Error(`Operador de condición desconocido: ${op}`);
    }
    return operador(getPath(state, field), value);
  });
}

export function metaDominante(state) {
  return Object.entries(state.meta.weights).sort((a, b) => b[1] - a[1])[0][0];
}
