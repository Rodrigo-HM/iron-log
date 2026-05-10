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

function isMachine(exDef) {
  return exDef.loadType === 'machine';
}

// Texto para una subida: en máquina dice "sube lo mínimo" (sin cantidad);
// en barra/mancuerna dice la cantidad concreta.
function upText(exDef) {
  return isMachine(exDef)
    ? 'Sube el peso lo mínimo que permita la máquina.'
    : `Subimos ${getIncrement(exDef)}kg.`;
}

function downText(exDef) {
  return isMachine(exDef)
    ? 'Baja el peso lo mínimo que permita la máquina.'
    : `Bajamos ${getIncrement(exDef)}kg.`;
}

// Peso a sugerir cuando toca subir/bajar.
// En máquina, mantenemos el peso actual (el usuario lo ajustará a su salto real).
// En barra/mancuerna, aplicamos el incremento estándar.
function nextUpWeight(weight, exDef) {
  return isMachine(exDef) ? weight : weight + getIncrement(exDef);
}

function nextDownWeight(weight, exDef, multiplier = 1) {
  return isMachine(exDef) ? weight : weight - getIncrement(exDef) * multiplier;
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

// Cuenta cuántos back offs cayeron por debajo del mínimo en una sesión
function backoffsBelowMin(session, minReps) {
  if (!session) return 0;
  return session.sets.filter(s => {
    if (!s.isBackOff) return false;
    const r = num(s.reps);
    return !isNaN(r) && r < minReps;
  }).length;
}

// Detecta si la sesión anterior fue una bajada forzada (señal de histéresis)
function wasForcedDecrease(prev, prevPrev, exDef) {
  if (!prev || !prevPrev) return false;
  const prevTop = prev.sets.find(s => s.isTopSet) ?? prev.sets[0];
  const prevPrevTop = prevPrev.sets.find(s => s.isTopSet) ?? prevPrev.sets[0];
  const prevKg = num(prevTop?.kg);
  const prevPrevKg = num(prevPrevTop?.kg);
  if (isNaN(prevKg) || isNaN(prevPrevKg)) return false;
  return prevKg < prevPrevKg;
}

/**
 * Sugerencia para el top set de la próxima sesión.
 * Analiza las últimas DOS sesiones para detectar patrones repetidos.
 *
 * @param {Array}  history   - [sesión_más_reciente, sesión_anterior, ...]
 * @param {Object} exDef
 */
export function suggestTopSet(history, exDef) {
  if (!history || history.length === 0) return null;

  const last = history[0];
  const prev = history[1] ?? null;
  const prevPrev = history[2] ?? null;

  const topSet = last.sets.find(s => s.isTopSet) ?? last.sets[0];
  if (!topSet) return null;

  const weight = num(topSet.kg);
  const reps   = num(topSet.reps);
  const effort = topSet.effort ?? null;

  if (isNaN(weight)) return null;

  const [minReps, maxReps] = exDef.topReps;
  const [backMin] = exDef.backReps ?? [minReps];

  // Override por colapso de back offs:
  // si en 2 sesiones seguidas ≥2/3 back offs cayeron del mínimo, frenar subida.
  const lastBackTotal = last.sets.filter(s => s.isBackOff).length;
  const lastBackBelow = backoffsBelowMin(last, backMin);
  const prevBackTotal = prev ? prev.sets.filter(s => s.isBackOff).length : 0;
  const prevBackBelow = prev ? backoffsBelowMin(prev, backMin) : 0;
  const lastBackCollapsed = lastBackTotal > 0 && lastBackBelow >= 2;
  const prevBackCollapsed = prevBackTotal > 0 && prevBackBelow >= 2;
  const backoffsBlocking = lastBackCollapsed && prevBackCollapsed;

  // Histéresis: si la sesión anterior fue una bajada forzada, requerir éxito
  // antes de volver a subir. "Éxito" = reps en rango, esfuerzo ≤ Justo.
  const afterForcedDecrease = wasForcedDecrease(prev, prevPrev, exDef);

  // No llegó al mínimo de reps → bajar SOLO si pasó dos sesiones seguidas
  if (!isNaN(reps) && reps < minReps) {
    const prevTopSet = prev?.sets.find(s => s.isTopSet) ?? prev?.sets[0];
    const prevReps = num(prevTopSet?.reps);
    const prevBelow = !isNaN(prevReps) && prevReps < minReps;
    if (prevBelow) {
      return suggest(nextDownWeight(weight, exDef), [minReps, maxReps],
        `Por debajo del mínimo dos sesiones seguidas (${reps} reps). ${downText(exDef)}`,
        'decrease');
    }
    return suggest(weight, [minReps, maxReps],
      `Solo ${reps} reps (mínimo ${minReps}). Mantén e intenta llegar al rango.`,
      'maintain');
  }

  // Sin esfuerzo registrado → usar solo reps
  if (!effort) {
    if (!isNaN(reps) && reps >= maxReps) {
      if (backoffsBlocking) {
        return suggest(weight, [minReps, maxReps],
          `Llegaste al techo, pero los back offs cayeron del rango 2 sesiones seguidas. Consolida antes de subir.`, 'maintain');
      }
      if (afterForcedDecrease) {
        return suggest(weight, [minReps, maxReps],
          `Techo de reps tras una bajada. Consolida una sesión más antes de volver a subir.`, 'maintain');
      }
      return suggest(nextUpWeight(weight, exDef), [minReps, maxReps],
        `Llegaste al techo (${reps} reps). ${upText(exDef)}`, 'increase');
    }
    return suggest(weight, [minReps, maxReps],
      `${isNaN(reps) ? '—' : reps} reps en rango. Mantén e intenta +1 rep.`, 'maintain');
  }

  // 💀 dos veces seguidas → bajar
  if (effort === 'limit') {
    const prevTopSet = prev?.sets.find(s => s.isTopSet) ?? prev?.sets[0];
    const prevEffort = prevTopSet?.effort;
    if (prevEffort === 'limit') {
      return suggest(nextDownWeight(weight, exDef), [minReps, maxReps],
        `💀 dos sesiones seguidas. ${downText(exDef)} Recupera calidad.`, 'decrease');
    }
    return suggest(weight, [minReps, maxReps],
      `💀 al límite (primera vez). Mantén, no bajes todavía.`, 'maintain');
  }

  // 💪 Fácil → subir
  if (effort === 'easy') {
    if (backoffsBlocking) {
      return suggest(weight, [minReps, maxReps],
        `💪 top set, pero los back offs cayeron del rango 2 sesiones seguidas. Consolida antes de subir.`, 'maintain');
    }
    if (afterForcedDecrease) {
      return suggest(weight, [minReps, maxReps],
        `💪 tras una bajada. Consolida una sesión más antes de volver a subir.`, 'maintain');
    }
    return suggest(nextUpWeight(weight, exDef), [minReps, maxReps],
      `💪 Fácil. ${upText(exDef)}`, 'increase');
  }

  // 😐 Regular (RPE 8 = en el objetivo) → double progression: subir solo si techo de reps
  if (effort === 'good') {
    if (!isNaN(reps) && reps >= maxReps) {
      if (backoffsBlocking) {
        return suggest(weight, [minReps, maxReps],
          `😐 al techo, pero los back offs cayeron del rango 2 sesiones seguidas. Consolida antes de subir.`, 'maintain');
      }
      if (afterForcedDecrease) {
        return suggest(weight, [minReps, maxReps],
          `😐 al techo tras una bajada. Consolida una sesión más antes de volver a subir.`, 'maintain');
      }
      return suggest(nextUpWeight(weight, exDef), [minReps, maxReps],
        `😐 al techo (${reps} reps). ${upText(exDef)}`, 'increase');
    }
    return suggest(weight, [minReps, maxReps],
      `😐 Regular en el objetivo. Mantén y suma +1 rep.`, 'maintain');
  }

  // 😤 Justo → mantener
  if (effort === 'hard') {
    return suggest(weight, [minReps, maxReps],
      `😤 Justo. Mantén e intenta +1 rep.`, 'maintain');
  }

  return suggest(weight, [minReps, maxReps], 'Mantén.', 'maintain');
}

// ─── BÁSICOS: back offs ───────────────────────────────────────────────────

/**
 * Sugerencia para los back offs de la próxima sesión.
 * Los back offs son DERIVADOS del top: peso = top × (1 - drop%) según esfuerzo.
 * No tienen lógica propia de subir/mantener/bajar; siempre van anclados al top.
 *
 * @param {Array}  history
 * @param {Object} exDef
 * @param {Object} topSetSuggestion  - resultado de suggestTopSet (ya calculado)
 */
export function suggestBackOffs(history, exDef, topSetSuggestion) {
  if (!history || history.length === 0 || !topSetSuggestion) return null;

  const last = history[0];
  const backoffs = last.sets.filter(s => s.isBackOff);
  if (backoffs.length === 0) return null;

  const [minReps, maxReps] = exDef.backReps;

  // Esfuerzo del último top set para determinar el drop%
  const topSet = last.sets.find(s => s.isTopSet) ?? last.sets[0];
  const effort = topSet?.effort ?? 'good';

  const newTopKg = topSetSuggestion.weight;
  const newBackoffKg = calcBackoffWeight(newTopKg, effort) ?? round(newTopKg * 0.88);

  return suggest(newBackoffKg, [minReps, maxReps],
    `Mismo peso en las ${backoffs.length} series. Es normal caer 1-2 reps entre la primera y la última.`,
    topSetSuggestion.action);
}

// ─── COMPUESTOS ───────────────────────────────────────────────────────────

/**
 * Sugerencia para un ejercicio compuesto (straight sets).
 * Modelo: dynamic double progression con guardrails.
 *  - Sube cuando set1 toca el techo Y todas las series están en rango Y esfuerzo ≤ Justo.
 *  - Caso "demasiado fácil": Fácil + todas las series casi al techo → subir igualmente.
 *  - Baja si set1 < min en 2 sesiones seguidas (doble bajada si déficit > 3 reps).
 *  - Histéresis: tras bajada forzada, requiere 1 sesión de consolidación antes de subir.
 */
export function suggestCompound(history, exDef) {
  if (!history || history.length === 0) return null;

  const last = history[0];
  const prev = history[1] ?? null;
  const prevPrev = history[2] ?? null;

  const sets = last.sets;
  const weight = num(sets[0]?.kg);
  if (isNaN(weight)) return null;

  const allReps = sets.map(s => num(s.reps)).filter(r => !isNaN(r));
  if (allReps.length === 0) return null;

  const [minReps, maxReps] = exDef.reps;

  const set1Reps = allReps[0];
  const minOfSession = Math.min(...allReps);
  const allInRange = minOfSession >= minReps;

  // Peor RPE de todas las series (jerarquía: limit > hard > good > easy)
  const effortRank = { easy: 1, good: 2, hard: 3, limit: 4 };
  const efforts = sets.map(s => s.effort).filter(Boolean);
  const worstEffort = efforts.length > 0
    ? efforts.reduce((w, e) => effortRank[e] > effortRank[w] ? e : w)
    : null;

  // Histéresis: ¿la sesión anterior fue una bajada forzada?
  const afterForcedDecrease = (() => {
    if (!prev || !prevPrev) return false;
    const prevKg = num(prev.sets[0]?.kg);
    const prevPrevKg = num(prevPrev.sets[0]?.kg);
    if (isNaN(prevKg) || isNaN(prevPrevKg)) return false;
    return prevKg < prevPrevKg;
  })();

  // BAJAR: set1 < min en 2 sesiones seguidas
  if (set1Reps < minReps) {
    const prevSet1 = num(prev?.sets?.[0]?.reps);
    const prevBelow = !isNaN(prevSet1) && prevSet1 < minReps;
    if (prevBelow) {
      const bigDeficit = set1Reps < minReps - 3;
      const multiplier = bigDeficit ? 2 : 1;
      const newWeight = nextDownWeight(weight, exDef, multiplier);
      const dText = isMachine(exDef)
        ? (bigDeficit ? 'Baja el peso un par de escalones de la máquina.' : downText(exDef))
        : downText(exDef);
      return suggest(newWeight, [minReps, maxReps],
        bigDeficit
          ? `Set 1 muy por debajo del mínimo dos sesiones seguidas. ${dText}`
          : `Set 1 por debajo del mínimo dos sesiones seguidas. ${dText}`,
        'decrease');
    }
    return suggest(weight, [minReps, maxReps],
      `Set 1 por debajo del mínimo (${set1Reps} reps). Mantén — quizá fue mala sesión.`,
      'maintain');
  }

  // Para subir hace falta histórico de esfuerzo: ≥2 sesiones (incluyendo la última)
  // con effort registrado en al menos una serie. Sin eso, mantenemos.
  const sessionHasEffort = (s) => s?.sets?.some(set => set.effort);
  const effortHistoryCount = history.filter(sessionHasEffort).length;
  const hasEnoughEffortHistory = sessionHasEffort(last) && effortHistoryCount >= 2;

  // Caso "demasiado fácil": esfuerzo Fácil + todas las series casi al techo → subir
  if (worstEffort === 'easy' && minOfSession >= maxReps - 1) {
    if (afterForcedDecrease) {
      return suggest(weight, [minReps, maxReps],
        `💪 Fácil tras una bajada. Consolida una sesión más antes de volver a subir.`, 'maintain');
    }
    return suggest(nextUpWeight(weight, exDef), [minReps, maxReps],
      `💪 Fácil con todas las series casi al techo. ${upText(exDef)}`, 'increase');
  }

  // SUBIR: set1 al techo + condiciones según nº de series
  if (set1Reps >= maxReps) {
    if (worstEffort === 'limit') {
      return suggest(weight, [minReps, maxReps],
        `Set 1 al techo pero alguna serie al límite. Mantén.`, 'maintain');
    }
    if (!allInRange) {
      return suggest(weight, [minReps, maxReps],
        `Set 1 al techo pero alguna serie cayó del mínimo. Mantén — el peso aprieta.`, 'maintain');
    }
    if (!hasEnoughEffortHistory) {
      return suggest(weight, [minReps, maxReps],
        `Set 1 al techo, pero faltan datos de esfuerzo. Registra el esfuerzo de las series para poder recomendar subir.`, 'maintain');
    }

    const lastSetReps = allReps[allReps.length - 1];
    const lastSetEffort = sets[allReps.length - 1]?.effort;
    const set2Reps = allReps[1];
    const set2Effort = sets[1]?.effort;

    let canIncrease = false;
    if (allReps.length >= 3) {
      // 3+ series: dos primeras al techo + última con margen y no al límite
      const firstTwoAtMax = set1Reps >= maxReps && set2Reps >= maxReps;
      const lastWithMargin = lastSetReps >= minReps + 1 && lastSetEffort !== 'limit';
      canIncrease = firstTwoAtMax && lastWithMargin;
    } else if (allReps.length === 2) {
      // 2 series: ambas al techo, o set2 = techo-1 sin esfuerzo al límite
      const bothAtMax = set2Reps >= maxReps;
      const set2NearTop = set2Reps >= maxReps - 1 && set2Effort !== 'limit';
      canIncrease = bothAtMax || set2NearTop;
    } else {
      // 1 serie sola: set1 al techo basta
      canIncrease = true;
    }

    if (!canIncrease) {
      return suggest(weight, [minReps, maxReps],
        `Set 1 al techo pero las últimas series caen. Mantén — exprime más reps antes de subir.`, 'maintain');
    }

    if (afterForcedDecrease) {
      return suggest(weight, [minReps, maxReps],
        `Set 1 al techo tras una bajada. Consolida una sesión más antes de volver a subir.`, 'maintain');
    }
    return suggest(nextUpWeight(weight, exDef), [minReps, maxReps],
      `Set 1 al techo (${set1Reps} reps). ${upText(exDef)}`, 'increase');
  }

  // Mantener
  if (worstEffort === 'limit') {
    return suggest(weight, [minReps, maxReps],
      `Esfuerzo al límite. Mantén y busca completar todas las series con margen.`, 'maintain');
  }
  return suggest(weight, [minReps, maxReps],
    `Reps ${minOfSession}-${Math.max(...allReps)}. Mantén y busca llegar a ${maxReps} en la primera serie.`, 'maintain');
}

// ─── AISLAMIENTOS ─────────────────────────────────────────────────────────

/**
 * Sugerencia para un ejercicio de aislamiento.
 * Sin esfuerzo, solo reps.
 *  - Sube si TODAS al techo en una sesión.
 *  - Baja si SET 1 < min en dos sesiones seguidas (más robusto frente a ruido).
 *  - Histéresis: tras una bajada forzada, requiere 1 sesión de consolidación antes de subir.
 */
export function suggestIsolation(history, exDef) {
  if (!history || history.length === 0) return null;

  const last = history[0];
  const prev = history[1] ?? null;
  const prevPrev = history[2] ?? null;

  const sets = last.sets;
  const weight = num(sets[0]?.kg);
  if (isNaN(weight)) return null;

  const allReps = sets.map(s => num(s.reps)).filter(r => !isNaN(r));
  if (allReps.length === 0) return null;

  const [minReps, maxReps] = exDef.reps;
  const set1Reps = allReps[0];
  const allAtMax = allReps.every(r => r >= maxReps);

  // Histéresis: ¿la sesión anterior fue una bajada forzada?
  const afterForcedDecrease = (() => {
    if (!prev || !prevPrev) return false;
    const prevKg = num(prev.sets[0]?.kg);
    const prevPrevKg = num(prevPrev.sets[0]?.kg);
    if (isNaN(prevKg) || isNaN(prevPrevKg)) return false;
    return prevKg < prevPrevKg;
  })();

  // BAJAR: set1 < min dos sesiones seguidas
  if (set1Reps < minReps) {
    const prevSet1 = num(prev?.sets?.[0]?.reps);
    const prevBelow = !isNaN(prevSet1) && prevSet1 < minReps;
    if (prevBelow) {
      return suggest(nextDownWeight(weight, exDef), [minReps, maxReps],
        `Set 1 por debajo del mínimo dos sesiones seguidas. ${downText(exDef)}`, 'decrease');
    }
    return suggest(weight, [minReps, maxReps],
      `Set 1 por debajo del mínimo (${set1Reps} reps). Mantén — quizá fue mala sesión.`,
      'maintain');
  }

  // SUBIR: todas al techo en una sesión
  if (allAtMax) {
    if (afterForcedDecrease) {
      return suggest(weight, [minReps, maxReps],
        `Todas al techo tras una bajada. Consolida una sesión más antes de volver a subir.`, 'maintain');
    }
    return suggest(nextUpWeight(weight, exDef), [minReps, maxReps],
      `Todas al techo (${maxReps} reps). ${upText(exDef)}`, 'increase');
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
export function generateSuggestion(history, exDef, { applyDeload = false } = {}) {
  if (!history || history.length === 0) return null;

  if (exDef.scheme === 'topback') {
    let topSet = suggestTopSet(history, exDef);
    let backOffs = suggestBackOffs(history, exDef, topSet);
    const deload = detectDeload(history);
    if (applyDeload && topSet) {
      const deloadKg = round(topSet.weight * 0.8);
      topSet = {
        ...topSet,
        weight: deloadKg,
        action: 'decrease',
        reason: 'Sesión de deload: 80% del peso habitual, sin llegar al fallo.'
      };
      if (backOffs) {
        backOffs = {
          ...backOffs,
          weight: round(deloadKg * 0.875),
          action: 'decrease',
          reason: 'Deload: back offs proporcionales al top.'
        };
      }
    }
    return { type: 'topback', topSet, backOffs, deload };
  }

  let sets = exDef.type === 'compound'
    ? suggestCompound(history, exDef)
    : suggestIsolation(history, exDef);

  if (applyDeload && sets) {
    sets = {
      ...sets,
      weight: round(sets.weight * 0.8),
      action: 'decrease',
      reason: 'Sesión de deload: 80% del peso habitual, sin llegar al fallo.'
    };
  }

  return { type: 'simple', sets };
}
