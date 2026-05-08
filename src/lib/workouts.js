/**
 * ═══════════════════════════════════════════════════════════════════════════
 *   WORKOUT DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Los 5 entrenos en SECUENCIA. No están atados a días de la semana.
 * El orden recomendado es 1 → 2 → 3 → 4 → 5 → 1 → ...
 * pero puedes saltarte uno o cambiar el orden cuando quieras.
 *
 * Tipos:
 *   - basic:    Top set + back offs. Reglas RPE.
 *   - compound: 3-4 series cerca del fallo (RIR 0-1).
 *   - iso:      3 series al fallo, rango más alto.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const WORKOUTS = {
  1: {
    id: 1,
    name: 'Push',
    focus: 'Pecho · Hombro · Tríceps',
    color: '#ff4500',
    exercises: [
      {
        name: 'Press banca',
        type: 'basic',
        scheme: 'topback',
        topReps: [4, 6],
        backReps: [6, 8],
        backSets: 3
      },
      { name: 'Press inclinado mancuernas', type: 'compound', reps: [8, 10], sets: 3, rir: '0-1' },
      { name: 'Aperturas máquina', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Elevaciones laterales mancuerna', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Press militar mancuernas', type: 'compound', reps: [8, 10], sets: 3, rir: '0-1' },
      { name: 'Extensión tríceps V-bar', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Press francés', type: 'iso', reps: [10, 12], sets: 3, rir: '0' }
    ]
  },
  2: {
    id: 2,
    name: 'Pull',
    focus: 'Espalda · Bíceps',
    color: '#60a5fa',
    exercises: [
      {
        name: 'Dominadas',
        type: 'basic',
        scheme: 'topback',
        topReps: [4, 6],
        backReps: [6, 8],
        backSets: 3
      },
      { name: 'Remo barra', type: 'compound', reps: [8, 10], sets: 3, rir: '0-1' },
      { name: 'Remo sentado máquina', type: 'compound', reps: [8, 10], sets: 3, rir: '0-1' },
      { name: 'Curl inclinado alternado', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Curl Bayesian polea', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Pájaros máquina', type: 'iso', reps: [12, 15], sets: 3, rir: '0' }
    ]
  },
  3: {
    id: 3,
    name: 'Piernas',
    focus: 'Cuádriceps · Femoral · Gemelo',
    color: '#4ade80',
    exercises: [
      {
        name: 'Sentadilla',
        type: 'basic',
        scheme: 'topback',
        topReps: [4, 6],
        backReps: [6, 8],
        backSets: 3
      },
      { name: 'Hip Thrust', type: 'compound', reps: [8, 10], sets: 3, rir: '0-1' },
      { name: 'Extensión cuádriceps', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Femoral tumbado', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Gemelo máquina', type: 'iso', reps: [12, 15], sets: 4, rir: '0' }
    ]
  },
  4: {
    id: 4,
    name: 'Hombro · Brazos',
    focus: 'Press militar + brazos',
    color: '#fbbf24',
    exercises: [
      {
        name: 'Press militar',
        type: 'basic',
        scheme: 'topback',
        topReps: [4, 6],
        backReps: [6, 8],
        backSets: 3
      },
      { name: 'Elevaciones laterales mancuerna', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Elevaciones laterales polea', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Curl Scott máquina', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Curl martillo cuerda', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Extensión tríceps V-bar', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Extensión tríceps unilateral', type: 'iso', reps: [10, 12], sets: 3, rir: '0' }
    ]
  },
  5: {
    id: 5,
    name: 'Máquinas',
    focus: 'Espalda · Pecho (volumen)',
    color: '#a78bfa',
    exercises: [
      { name: 'Jalón máquina', type: 'compound', reps: [8, 10], sets: 4, rir: '0-1' },
      { name: 'Remo sentado máquina', type: 'compound', reps: [8, 10], sets: 4, rir: '0-1' },
      { name: 'Press banca máquina', type: 'compound', reps: [8, 10], sets: 4, rir: '0-1' },
      { name: 'Aperturas máquina', type: 'iso', reps: [10, 12], sets: 3, rir: '0' },
      { name: 'Cruce de poleas', type: 'iso', reps: [10, 12], sets: 3, rir: '0' }
    ]
  }
};

export const BASIC_EXERCISES = ['Press banca', 'Dominadas', 'Sentadilla', 'Press militar'];

/**
 * Determina cuál es el siguiente entreno según el último registrado.
 * Sigue la secuencia 1 → 2 → 3 → 4 → 5 → 1.
 */
export function getNextWorkoutId(sessions) {
  if (!sessions || sessions.length === 0) return 1;
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const lastId = sorted[0].workoutId;
  if (!lastId || lastId < 1 || lastId > 5) return 1;
  return lastId === 5 ? 1 : lastId + 1;
}

/**
 * Encuentra la última fecha en la que se hizo un entreno concreto.
 */
export function getLastWorkoutDate(sessions, workoutId) {
  const matches = sessions
    .filter(s => s.workoutId === workoutId)
    .sort((a, b) => b.date.localeCompare(a.date));
  return matches.length > 0 ? matches[0].date : null;
}

/**
 * Devuelve el historial completo de un ejercicio (todas las sesiones donde aparece).
 * Ordenado de más reciente a más antiguo.
 */
export function getExerciseHistory(sessions, exerciseName) {
  const history = [];
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.name === exerciseName) {
        history.push({
          date: session.date,
          workoutId: session.workoutId,
          sets: ex.sets,
          type: ex.type
        });
      }
    }
  }
  return history.sort((a, b) => b.date.localeCompare(a.date));
}
