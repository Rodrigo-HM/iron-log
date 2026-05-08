/**
 * ═══════════════════════════════════════════════════════════════════════════
 *   PROGRESSION RULES - El "agente" que sustituye a ChatGPT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este archivo contiene TODA la lógica de progresión de pesos. Está pensado
 * para que tú (el usuario) puedas modificar las reglas fácilmente sin tocar
 * el resto de la app.
 *
 * Tipos de ejercicio:
 *   - basic:    Press banca, dominadas, sentadilla, press militar (top set + back offs)
 *   - compound: Ejercicios secundarios pesados con barra/mancuerna (RIR 0-1)
 *   - iso:      Ejercicios de aislamiento (al fallo)
 *
 * Fases:
 *   - bulk: volumen, prioridad subir pesos
 *   - cut:  definición, prioridad mantener pesos
 *
 * Conceptos:
 *   - RPE (Rate of Perceived Exertion): escala 5-10 que mide qué tan duro fue.
 *     RPE 10 = fallo absoluto. RPE 9 = 1 rep en reserva. RPE 8 = 2 reps en reserva.
 *   - RIR (Reps In Reserve): inverso del RPE. RIR 0 = fallo. RIR 1 = 1 rep en reserva.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────
//   CONSTANTES DE PROGRESIÓN (modifica aquí si cambian las reglas)
// ───────────────────────────────────────────────────────────────────────────

export const INCREMENTS = {
  // Incrementos de peso según ejercicio.
  // En general, ejercicios pequeños (laterales, curls) progresan más despacio.
  basic: {
    big_jump: 2.5,    // Subida normal
    small_jump: 1.25, // Subida cuando estamos cerca del techo
    drop: 2.5         // Bajada cuando hay sobrecarga
  },
  compound: {
    big_jump: 2.5,
    small_jump: 1.25,
    drop: 2.5
  },
  iso: {
    big_jump: 1.25,   // Aislamientos progresan más despacio
    small_jump: 1,
    drop: 1.25
  }
};

// ───────────────────────────────────────────────────────────────────────────
//   HELPERS
// ───────────────────────────────────────────────────────────────────────────

/**
 * Encuentra el top set de una sesión.
 * El top set es la primera serie marcada con isTopSet=true,
 * o la primera serie a falta de marcado.
 */
function findTopSet(sets) {
  return sets.find(s => s.isTopSet) || sets[0];
}

/**
 * Encuentra los back offs (todas las series que no son top set).
 */
function findBackOffs(sets) {
  const topSet = findTopSet(sets);
  return sets.filter(s => s !== topSet);
}

/**
 * Convierte un valor a número, devolviendo NaN si está vacío.
 */
function num(v) {
  if (v === '' || v === null || v === undefined) return NaN;
  return parseFloat(v);
}

/**
 * Crea una sugerencia con peso, rango de reps, motivo y nivel de confianza.
 */
function suggest(weight, repRange, reason, action = 'maintain') {
  return {
    weight: Math.round(weight * 100) / 100,
    minReps: repRange[0],
    maxReps: repRange[1],
    reason,
    action // 'increase' | 'maintain' | 'decrease'
  };
}

// ───────────────────────────────────────────────────────────────────────────
//   REGLA: TOP SET (1×4-6 reps)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Top set: 1 serie a RPE alto (8-9) en el rango pactado.
 *
 * REGLAS (en orden de prioridad):
 *   1. Si fase = cut  →  Mantener peso, prioridad supervivencia muscular.
 *   2. Si reps < minReps  →  Bajar 2.5kg (no llegamos al rango mínimo).
 *   3. Si tenemos RPE registrado:
 *        RPE ≤ 7   →  Subir 2.5kg (mucho margen, vamos a por más)
 *        RPE 7.5-8 →  Subir 1.25-2.5kg (margen razonable)
 *        RPE 8.5-9 →  Mantener (estamos donde queremos estar)
 *        RPE 9.5-10 →  Bajar 2.5kg (demasiado cerca del fallo)
 *   4. Sin RPE pero llegó al maxReps  →  Subir 2.5kg
 *   5. Sin RPE y reps en rango medio  →  Mantener
 */
export function suggestTopSet(lastSets, exerciseDef, phase) {
  const topSet = findTopSet(lastSets);
  if (!topSet) return null;

  const weight = num(topSet.kg);
  const reps = num(topSet.reps);
  const rpe = num(topSet.rpe);
  const [minReps, maxReps] = exerciseDef.topReps;
  const inc = INCREMENTS.basic;

  // Datos insuficientes
  if (isNaN(weight) || isNaN(reps)) return null;

  // REGLA 1: Definición → mantener
  if (phase === 'cut') {
    return suggest(
      weight,
      [minReps, maxReps],
      'Mantener peso (fase de definición). Prioridad: no perder fuerza.',
      'maintain'
    );
  }

  // REGLA 2: No llegó al rango mínimo
  if (reps < minReps) {
    return suggest(
      weight - inc.drop,
      [minReps, maxReps],
      `Solo ${reps} reps (mínimo ${minReps}). Bajamos ${inc.drop}kg para asegurar el rango.`,
      'decrease'
    );
  }

  // REGLA 3: Decisión por RPE
  if (!isNaN(rpe)) {
    if (rpe <= 7) {
      return suggest(
        weight + inc.big_jump,
        [minReps, maxReps],
        `RPE ${rpe} (mucho margen). Subimos ${inc.big_jump}kg.`,
        'increase'
      );
    }
    if (rpe <= 8) {
      return suggest(
        weight + inc.small_jump,
        [minReps, maxReps],
        `RPE ${rpe}. Subimos ${inc.small_jump}kg (progresión cauta).`,
        'increase'
      );
    }
    if (rpe <= 9) {
      return suggest(
        weight,
        [minReps, maxReps],
        `RPE ${rpe} (zona objetivo). Mantenemos peso, intenta +1 rep.`,
        'maintain'
      );
    }
    // RPE 9.5 o 10
    return suggest(
      weight - inc.drop,
      [minReps, maxReps],
      `RPE ${rpe} (muy cerca del fallo). Bajamos ${inc.drop}kg para mantener calidad.`,
      'decrease'
    );
  }

  // REGLA 4: Sin RPE pero llegó al techo
  if (reps >= maxReps) {
    return suggest(
      weight + inc.big_jump,
      [minReps, maxReps],
      `Llegaste al techo del rango (${reps} reps). Subimos ${inc.big_jump}kg.`,
      'increase'
    );
  }

  // REGLA 5: Sin RPE, reps en rango medio
  return suggest(
    weight,
    [minReps, maxReps],
    `${reps} reps en rango. Mantenemos e intentamos +1 rep.`,
    'maintain'
  );
}

// ───────────────────────────────────────────────────────────────────────────
//   REGLA: BACK OFFS (3×6-8 reps)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Back offs: 3 series con peso reducido (~10-15% menos que el top set)
 * en el rango de 6-8 reps.
 *
 * REGLAS:
 *   1. Si fase = cut  →  Mantener peso.
 *   2. Si TODAS las series llegan al maxReps  →  Subir 2.5kg.
 *   3. Si ALGUNA serie cae por debajo del minReps  →  Bajar 2.5kg.
 *   4. Resto  →  Mantener.
 */
export function suggestBackOffs(lastSets, exerciseDef, phase) {
  const backOffs = findBackOffs(lastSets);
  if (backOffs.length === 0) return null;

  // Usamos el peso del primer back off como referencia
  const weight = num(backOffs[0].kg);
  if (isNaN(weight)) return null;

  const allReps = backOffs.map(s => num(s.reps)).filter(r => !isNaN(r));
  if (allReps.length === 0) return null;

  const [minReps, maxReps] = exerciseDef.backReps;
  const inc = INCREMENTS.basic;
  const minObserved = Math.min(...allReps);
  const allAtMax = allReps.every(r => r >= maxReps);

  if (phase === 'cut') {
    return suggest(
      weight,
      [minReps, maxReps],
      'Mantener peso (definición).',
      'maintain'
    );
  }

  if (allAtMax) {
    return suggest(
      weight + inc.big_jump,
      [minReps, maxReps],
      `Las ${backOffs.length} series al techo (${maxReps}+ reps). Subimos ${inc.big_jump}kg.`,
      'increase'
    );
  }

  if (minObserved < minReps) {
    return suggest(
      weight - inc.drop,
      [minReps, maxReps],
      `Alguna serie cayó a ${minObserved} reps (mínimo ${minReps}). Bajamos ${inc.drop}kg.`,
      'decrease'
    );
  }

  return suggest(
    weight,
    [minReps, maxReps],
    `Series en rango ${minObserved}-${Math.max(...allReps)} reps. Mantenemos e intentamos sumar reps.`,
    'maintain'
  );
}

// ───────────────────────────────────────────────────────────────────────────
//   REGLA: COMPUESTOS (RIR 0-1, rango 8-10)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Compuestos secundarios (press inclinado, remos, hip thrust, etc):
 * 3 series cerca del fallo (RIR 0-1) en rango medio.
 *
 * REGLAS:
 *   1. Cut → mantener.
 *   2. Todas las series llegan al maxReps → subir 2.5kg.
 *   3. Alguna serie por debajo del minReps → bajar 2.5kg.
 *   4. Resto → mantener.
 */
export function suggestCompound(lastSets, exerciseDef, phase) {
  if (lastSets.length === 0) return null;

  const weight = num(lastSets[0].kg);
  if (isNaN(weight)) return null;

  const allReps = lastSets.map(s => num(s.reps)).filter(r => !isNaN(r));
  if (allReps.length === 0) return null;

  const [minReps, maxReps] = exerciseDef.reps;
  const inc = INCREMENTS.compound;
  const minObserved = Math.min(...allReps);
  const allAtMax = allReps.every(r => r >= maxReps);

  if (phase === 'cut') {
    return suggest(weight, [minReps, maxReps], 'Mantener (definición).', 'maintain');
  }

  if (allAtMax) {
    return suggest(
      weight + inc.big_jump,
      [minReps, maxReps],
      `Todas las series al techo. Subimos ${inc.big_jump}kg.`,
      'increase'
    );
  }

  if (minObserved < minReps) {
    return suggest(
      weight - inc.drop,
      [minReps, maxReps],
      `Cayó a ${minObserved} reps. Bajamos ${inc.drop}kg.`,
      'decrease'
    );
  }

  return suggest(
    weight,
    [minReps, maxReps],
    `Reps ${minObserved}-${Math.max(...allReps)}. Mantenemos, busca +1 rep.`,
    'maintain'
  );
}

// ───────────────────────────────────────────────────────────────────────────
//   REGLA: AISLAMIENTOS (al fallo, rango 10-12)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Aislamientos (curls, laterales, extensiones, aperturas):
 * Al fallo en cada serie, rango más alto.
 *
 * REGLAS (más conservadoras porque son ejercicios pequeños):
 *   1. Cut → mantener.
 *   2. Todas al maxReps → subir 1.25kg.
 *   3. Todas a maxReps en MÁS DE UNA SESIÓN consecutiva → confirmamos +1.25kg.
 *   4. Alguna por debajo del minReps → bajar 1.25kg.
 */
export function suggestIsolation(lastSets, exerciseDef, phase) {
  if (lastSets.length === 0) return null;

  const weight = num(lastSets[0].kg);
  if (isNaN(weight)) return null;

  const allReps = lastSets.map(s => num(s.reps)).filter(r => !isNaN(r));
  if (allReps.length === 0) return null;

  const [minReps, maxReps] = exerciseDef.reps;
  const inc = INCREMENTS.iso;
  const minObserved = Math.min(...allReps);
  const allAtMax = allReps.every(r => r >= maxReps);

  if (phase === 'cut') {
    return suggest(weight, [minReps, maxReps], 'Mantener (definición).', 'maintain');
  }

  if (allAtMax) {
    return suggest(
      weight + inc.big_jump,
      [minReps, maxReps],
      `Todas al techo (${maxReps}+ reps). Subimos ${inc.big_jump}kg.`,
      'increase'
    );
  }

  if (minObserved < minReps) {
    return suggest(
      weight - inc.drop,
      [minReps, maxReps],
      `Cayó a ${minObserved} reps. Bajamos ${inc.drop}kg.`,
      'decrease'
    );
  }

  return suggest(
    weight,
    [minReps, maxReps],
    `Reps ${minObserved}-${Math.max(...allReps)}. Mantenemos e intentamos sumar reps.`,
    'maintain'
  );
}

// ───────────────────────────────────────────────────────────────────────────
//   FUNCIÓN PRINCIPAL: dispatcher según el tipo de ejercicio
// ───────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la sugerencia para un ejercicio dado, basándose en la última sesión
 * y el tipo de ejercicio.
 *
 * @param {Array} lastSets       - Series de la última sesión [{kg, reps, rpe, isTopSet}]
 * @param {Object} exerciseDef   - Definición del ejercicio en WORKOUTS
 * @param {String} phase         - 'bulk' | 'cut'
 * @returns {Object|null}        - { topSet?, backOffs?, sets? }
 */
export function generateSuggestion(lastSets, exerciseDef, phase = 'bulk') {
  if (!lastSets || lastSets.length === 0) return null;

  // BÁSICOS: top set + back offs
  if (exerciseDef.scheme === 'topback') {
    return {
      type: 'topback',
      topSet: suggestTopSet(lastSets, exerciseDef, phase),
      backOffs: suggestBackOffs(lastSets, exerciseDef, phase)
    };
  }

  // COMPUESTOS
  if (exerciseDef.type === 'compound') {
    return {
      type: 'simple',
      sets: suggestCompound(lastSets, exerciseDef, phase)
    };
  }

  // AISLAMIENTOS
  return {
    type: 'simple',
    sets: suggestIsolation(lastSets, exerciseDef, phase)
  };
}
