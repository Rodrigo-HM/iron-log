import { DEFAULT_INCREMENT } from './workouts';

// ─── ESCALA DE ESFUERZO ───────────────────────────────────────────────────
// Usada en básicos y compuestos. Aislamientos NO usan esfuerzo.

export const EFFORT_LEVELS = [
  { value: 'easy',    label: '💪 Fácil',     rpe: '≤7',    desc: 'Te sobraban reps claramente' },
  { value: 'good',    label: '😐 Regular',   rpe: '8',     desc: 'Bien, algo de margen' },
  { value: 'hard',    label: '😤 Justo',     rpe: '8.5-9', desc: 'Al límite pero lo sacaste' },
  { value: 'limit',   label: '💀 Al límite', rpe: '9.5-10',desc: 'Casi fallo o fallo técnico' }
];

// Porcentaje de reducción del top set para calcular el peso de los back offs
export const BACKOFF_REDUCTION = {
  easy:  0.08,
  good:  0.10,
  hard:  0.125,
  limit: 0.15
};

// ─── HELPERS ─────────────────────────────────────────────────────────────

function num(v) {
  if (v === '' || v === null || v === undefined) return NaN;
  return parseFloat(v);
}

function round(kg) {
  // Redondea al múltiplo de 1.25 más cercano (mínima unidad de disco de peso)
  return Math.round(kg / 1.25) * 1.25;
}

function suggest(weight, repRange, reason, action = 'maintain') {
  return {
    weight: round(Math.max(0, weight)),
    minReps: repRange[0],
    maxReps: repRange[1],
    reason,
    action
  };
}

function getIncrement(exDef) {
  return exDef.increment ?? DEFAULT_INCREMENT[exDef.loadType ?? 'bar'];
}

// ─── CÁLCULO EN TIEMPO REAL: peso de los back offs ───────────────────────

/**
 * Dado el peso del top set y el esfuerzo registrado, devuelve el peso
 * recomendado para los back offs, redondeado al disco más cercano.
 */
export function calcBackoffWeight(topKg, effort) {
  if (isNaN(topKg) || !effort) return null;
  const reduction = BACKOFF_REDUCTION[effort] ?? 0.10;
  return round(topKg * (1 - reduction));
}

// ─── BÁSICOS: top set ─────────────────────────────────────────────────────

/**
 * Sugerencia para el top set de la próxima sesión.
 * Analiza las últimas DOS sesiones del mismo ejercicio para detectar
 * el patrón de 💀 repetido que obliga a bajar.
 *
 * @param {Array}  history   - [sesión_más_reciente, sesión_anterior, ...]
 * @param {Object} exDef
 */
export function suggestTopSet(history, exDef) {
  if (!history || history.length === 0) return null;

  const last = history[0];
  const prev = history[1] ?? null;

  const topSet = last.sets.find(s => s.isTopSet) ?? last.sets[0];
  if (!topSet) return null;

  const weight = num(topSet.kg);
  const reps   = num(topSet.reps);
  const effort = topSet.effort ?? null;

  if (isNaN(weight)) return null;

  const [minReps, maxReps] = exDef.topReps;
  const inc = getIncrement(exDef);

  // No llegó al mínimo de reps → bajar SOLO si pasó dos sesiones seguidas
  if (!isNaN(reps) && reps < minReps) {
    const prevTopSet = prev?.sets.find(s => s.isTopSet) ?? prev?.sets[0];
    const prevReps = num(prevTopSet?.reps);
    const prevBelow = !isNaN(prevReps) && prevReps < minReps;
    if (prevBelow) {
      return suggest(weight - inc, [minReps, maxReps],
        `Por debajo del mínimo dos sesiones seguidas (${reps} reps). Bajamos ${inc}kg.`,
        'decrease');
    }
    return suggest(weight, [minReps, maxReps],
      `Solo ${reps} reps (mínimo ${minReps}). Mantén e intenta llegar al rango.`,
      'maintain');
  }

  // Sin esfuerzo registrado → usar solo reps
  if (!effort) {
    if (!isNaN(reps) && reps >= maxReps) {
      return suggest(weight + inc, [minReps, maxReps],
        `Llegaste al techo (${reps} reps). Subimos ${inc}kg.`, 'increase');
    }
    return suggest(weight, [minReps, maxReps],
      `${isNaN(reps) ? '—' : reps} reps en rango. Mantén e intenta +1 rep.`, 'maintain');
  }

  // 💀 dos veces seguidas → bajar
  if (effort === 'limit') {
    const prevTopSet = prev?.sets.find(s => s.isTopSet) ?? prev?.sets[0];
    const prevEffort = prevTopSet?.effort;
    if (prevEffort === 'limit') {
      return suggest(weight - inc, [minReps, maxReps],
        `💀 dos sesiones seguidas. Bajamos ${inc}kg para recuperar calidad.`, 'decrease');
    }
    return suggest(weight, [minReps, maxReps],
      `💀 al límite (primera vez). Mantén, no bajes todavía.`, 'maintain');
  }

  // Lógica esfuerzo normal
  const effortToAction = {
    easy:  { action: 'increase', delta: +inc,  reason: `💪 Fácil. Subimos ${inc}kg.` },
    good:  { action: 'increase', delta: +inc,  reason: `😐 Regular con margen. Subimos ${inc}kg.` },
    hard:  { action: 'maintain', delta: 0,     reason: `😤 Justo. Mantén e intenta +1 rep.` },
  };

  // 😐 regular pero algún back off fue 💀 → mantener
  if (effort === 'good') {
    const backoffs = last.sets.filter(s => s.isBackOff);
    const anyBackoffLimit = backoffs.some(s => s.effort === 'limit');
    if (anyBackoffLimit) {
      return suggest(weight, [minReps, maxReps],
        `😐 top set, pero algún back off fue 💀. Mantén.`, 'maintain');
    }
  }

  // 😤 justo pero algún back off fue 💀 → mantener igualmente
  if (effort === 'hard') {
    const backoffs = last.sets.filter(s => s.isBackOff);
    const anyBackoffLimit = backoffs.some(s => s.effort === 'limit');
    if (anyBackoffLimit) {
      return suggest(weight, [minReps, maxReps],
        `😤 top set + back off al límite. Mantén.`, 'maintain');
    }
  }

  const { action, delta, reason } = effortToAction[effort];
  return suggest(weight + delta, [minReps, maxReps], reason, action);
}

// ─── BÁSICOS: back offs ───────────────────────────────────────────────────

/**
 * Sugerencia para los back offs de la próxima sesión.
 * Si el top set sube, los back offs se recalculan automáticamente desde el nuevo top.
 * Si el top se mantiene, se ajusta el porcentaje de reducción si hubo 💀 repetido.
 *
 * @param {Array}  history
 * @param {Object} exDef
 * @param {Object} topSetSuggestion  - resultado de suggestTopSet (ya calculado)
 */
export function suggestBackOffs(history, exDef, topSetSuggestion) {
  if (!history || history.length === 0) return null;

  const last = history[0];
  const prev = history[1] ?? null;

  const backoffs = last.sets.filter(s => s.isBackOff);
  if (backoffs.length === 0) return null;

  const [minReps, maxReps] = exDef.backReps;
  const inc = getIncrement(exDef);

  // Si el top set sube → recalcular peso backoff desde el nuevo top
  if (topSetSuggestion?.action === 'increase') {
    const newTopKg = topSetSuggestion.weight;
    // Usar el esfuerzo del último top para determinar el porcentaje
    const topSet = last.sets.find(s => s.isTopSet) ?? last.sets[0];
    const effort = topSet?.effort ?? 'hard';
    const newBackoffKg = calcBackoffWeight(newTopKg, effort);
    return suggest(newBackoffKg ?? (newTopKg * 0.875), [minReps, maxReps],
      `Top sube a ${newTopKg}kg → back offs recalculados automáticamente.`, 'increase');
  }

  // Analizar esfuerzo de los back offs de la última sesión
  const backoffEfforts = backoffs.map(s => s.effort).filter(Boolean);
  const anyLimit = backoffEfforts.some(e => e === 'limit');
  const allEasyGood = backoffEfforts.length > 0 && backoffEfforts.every(e => e === 'easy' || e === 'good');

  // Todos al techo de reps y fáciles/regular → sumar 1 rep objetivo (no subir kg, el top no subió)
  const allReps = backoffs.map(s => num(s.reps)).filter(r => !isNaN(r));
  const allAtMax = allReps.length > 0 && allReps.every(r => r >= maxReps);

  // Referencia del peso actual de back offs
  const currentWeight = num(backoffs[0].kg);
  if (isNaN(currentWeight)) return null;

  // 💀 en back offs dos sesiones seguidas → aumentar porcentaje de reducción
  if (anyLimit && prev) {
    const prevBackoffs = prev.sets.filter(s => s.isBackOff);
    const prevAnyLimit = prevBackoffs.some(s => s.effort === 'limit');
    if (prevAnyLimit) {
      const newWeight = round(currentWeight - inc);
      return suggest(newWeight, [minReps, maxReps],
        `💀 en back offs dos sesiones seguidas. Bajamos ${inc}kg (más reducción del top).`, 'decrease');
    }
    return suggest(currentWeight, [minReps, maxReps],
      `💀 en algún back off (primera vez). Mantén.`, 'maintain');
  }

  if (allAtMax && allEasyGood) {
    return suggest(currentWeight, [minReps, maxReps],
      `Todos al techo y fácil/regular. El top no subió, intenta +1 rep en back offs.`, 'maintain');
  }

  return suggest(currentWeight, [minReps, maxReps],
    `Back offs en rango. Mantén y busca completar todas las series.`, 'maintain');
}

// ─── COMPUESTOS ───────────────────────────────────────────────────────────

/**
 * Sugerencia para un ejercicio compuesto.
 * Analiza las últimas DOS sesiones para detectar el patrón de caída repetida.
 */
export function suggestCompound(history, exDef) {
  if (!history || history.length === 0) return null;

  const last = history[0];
  const prev = history[1] ?? null;

  const sets = last.sets;
  const weight = num(sets[0]?.kg);
  if (isNaN(weight)) return null;

  const allReps = sets.map(s => num(s.reps)).filter(r => !isNaN(r));
  if (allReps.length === 0) return null;

  const [minReps, maxReps] = exDef.reps;
  const inc = getIncrement(exDef);
  const lastEffort = sets[sets.length - 1]?.effort ?? null;
  const allAtMax = allReps.every(r => r >= maxReps);
  const anyBelowMin = allReps.some(r => r < minReps);

  // Caída por debajo del mínimo DOS sesiones seguidas → bajar
  if (anyBelowMin && prev) {
    const prevSets = prev.sets;
    const prevReps = prevSets.map(s => num(s.reps)).filter(r => !isNaN(r));
    const prevAnyBelow = prevReps.some(r => r < minReps);
    if (prevAnyBelow) {
      return suggest(weight - inc, [minReps, maxReps],
        `Por debajo del mínimo dos sesiones seguidas. Bajamos ${inc}kg.`, 'decrease');
    }
    return suggest(weight, [minReps, maxReps],
      `Alguna serie por debajo del mínimo (primera vez). Mantén.`, 'maintain');
  }

  // Todas al techo + última no fue 💀 → subir
  if (allAtMax && lastEffort !== 'limit') {
    return suggest(weight + inc, [minReps, maxReps],
      `Todas al techo (${maxReps} reps). Subimos ${inc}kg.`, 'increase');
  }

  // Todas al techo pero última fue 💀 → mantener
  if (allAtMax && lastEffort === 'limit') {
    return suggest(weight, [minReps, maxReps],
      `Todas al techo pero última serie al límite. Mantén.`, 'maintain');
  }

  return suggest(weight, [minReps, maxReps],
    `Reps ${Math.min(...allReps)}-${Math.max(...allReps)}. Mantén y busca completar el rango.`, 'maintain');
}

// ─── AISLAMIENTOS ─────────────────────────────────────────────────────────

/**
 * Sugerencia para un ejercicio de aislamiento.
 * Sin esfuerzo, solo reps.
 * Sube con UNA sesión buena. Baja solo con DOS sesiones malas.
 */
export function suggestIsolation(history, exDef) {
  if (!history || history.length === 0) return null;

  const last = history[0];
  const prev = history[1] ?? null;

  const sets = last.sets;
  const weight = num(sets[0]?.kg);
  if (isNaN(weight)) return null;

  const allReps = sets.map(s => num(s.reps)).filter(r => !isNaN(r));
  if (allReps.length === 0) return null;

  const [minReps, maxReps] = exDef.reps;
  const inc = getIncrement(exDef);
  const allAtMax = allReps.every(r => r >= maxReps);
  const anyBelowMin = allReps.some(r => r < minReps);

  // Todas al techo en UNA sesión → subir
  if (allAtMax) {
    return suggest(weight + inc, [minReps, maxReps],
      `Todas al techo (${maxReps} reps). Subimos ${inc}kg.`, 'increase');
  }

  // Caída dos sesiones seguidas → bajar
  if (anyBelowMin && prev) {
    const prevSets = prev.sets;
    const prevReps = prevSets.map(s => num(s.reps)).filter(r => !isNaN(r));
    const prevAnyBelow = prevReps.some(r => r < minReps);
    if (prevAnyBelow) {
      return suggest(weight - inc, [minReps, maxReps],
        `Por debajo del mínimo dos sesiones seguidas. Bajamos ${inc}kg.`, 'decrease');
    }
    return suggest(weight, [minReps, maxReps],
      `Alguna serie baja (primera vez). Mantén.`, 'maintain');
  }

  return suggest(weight, [minReps, maxReps],
    `Reps ${Math.min(...allReps)}-${Math.max(...allReps)}. Mantén y busca llegar al techo.`, 'maintain');
}

// ─── DELOAD ───────────────────────────────────────────────────────────────

/**
 * Detecta si el usuario necesita un deload basándose en el historial
 * de un ejercicio básico. Devuelve { needed: bool, reason: string }.
 *
 * Señales de deload:
 *  1. Top set con 💀 dos sesiones seguidas
 *  2. Peso o reps decreciendo 3 sesiones consecutivas
 */
export function detectDeload(history) {
  if (!history || history.length < 2) return { needed: false };

  // Señal 1: 💀 dos veces seguidas en top set
  const getTopEffort = (entry) => {
    const ts = entry.sets.find(s => s.isTopSet) ?? entry.sets[0];
    return ts?.effort;
  };
  if (getTopEffort(history[0]) === 'limit' && getTopEffort(history[1]) === 'limit') {
    return { needed: true, reason: 'Top set al límite dos sesiones seguidas.' };
  }

  // Señal 2: peso o reps bajando 3 sesiones consecutivas
  if (history.length >= 3) {
    const getTopKg = (entry) => {
      const ts = entry.sets.find(s => s.isTopSet) ?? entry.sets[0];
      return num(ts?.kg);
    };
    const kg = [history[0], history[1], history[2]].map(getTopKg);
    if (!kg.some(isNaN) && kg[0] < kg[1] && kg[1] < kg[2]) {
      return { needed: true, reason: 'El peso lleva 3 sesiones bajando consecutivamente.' };
    }
  }

  return { needed: false };
}

// ─── DISPATCHER PRINCIPAL ─────────────────────────────────────────────────

/**
 * Genera la sugerencia completa para un ejercicio.
 *
 * @param {Array}  history   - resultado de getExerciseHistory (más reciente primero)
 * @param {Object} exDef     - definición del ejercicio en WORKOUTS
 * @returns {Object|null}
 */
export function generateSuggestion(history, exDef) {
  if (!history || history.length === 0) return null;

  if (exDef.scheme === 'topback') {
    const topSet = suggestTopSet(history, exDef);
    const backOffs = suggestBackOffs(history, exDef, topSet);
    const deload = detectDeload(history);
    return { type: 'topback', topSet, backOffs, deload };
  }

  if (exDef.type === 'compound') {
    return { type: 'simple', sets: suggestCompound(history, exDef) };
  }

  return { type: 'simple', sets: suggestIsolation(history, exDef) };
}
