// Tipos de carga — determinan el incremento por defecto
// 'bar' → +2.5kg | 'dumbbell' → +2kg | 'machine' → +5kg (editable)
//
// Descansos en segundos:
//   restTopToBackoff: entre top set y primer back off
//   restBetweenSets:  entre series del mismo ejercicio

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
        loadType: 'bar',
        topReps: [4, 6],
        backReps: [6, 8],
        backSets: 3,
        restTopToBackoff: 240,
        restBetweenSets: 150
      },
      {
        name: 'Press inclinado máquina',
        type: 'compound',
        loadType: 'machine',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 150
      },
      {
        name: 'Aperturas máquina',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 2,
        restBetweenSets: 120
      },
      {
        name: 'Elevaciones laterales polea',
        type: 'iso',
        loadType: 'machine',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 120
      },
      {
        name: 'Press militar mancuernas',
        type: 'compound',
        loadType: 'dumbbell',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 135
      },
      {
        name: 'Press francés mancuerna',
        type: 'iso',
        loadType: 'dumbbell',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 135
      },
      {
        name: 'Extensión tríceps unilateral',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 3,
        restBetweenSets: 120
      }
    ]
  },
  2: {
    id: 2,
    name: 'Pull',
    focus: 'Espalda · Bíceps · Hombro',
    color: '#60a5fa',
    exercises: [
      {
        name: 'Dominadas',
        type: 'basic',
        scheme: 'topback',
        loadType: 'bar',
        topReps: [4, 6],
        backReps: [6, 8],
        backSets: 3,
        restTopToBackoff: 240,
        restBetweenSets: 150
      },
      {
        name: 'Remo barra',
        type: 'compound',
        loadType: 'bar',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 150
      },
      {
        name: 'Remo sentado máquina unilateral',
        type: 'compound',
        loadType: 'machine',
        reps: [10, 12],
        sets: 3,
        restBetweenSets: 135
      },
      {
        name: 'Curl inclinado mancuerna',
        type: 'iso',
        loadType: 'dumbbell',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 255
      },
      {
        name: 'Curl martillo cuerda',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 3,
        restBetweenSets: 120
      },
      {
        name: 'Pájaros máquina',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 3,
        restBetweenSets: 120
      }
    ]
  },
  3: {
    id: 3,
    name: 'Piernas',
    focus: 'Cuádriceps · Glúteo · Femoral · Gemelo',
    color: '#4ade80',
    exercises: [
      {
        name: 'Sentadilla',
        type: 'basic',
        scheme: 'topback',
        loadType: 'bar',
        topReps: [4, 6],
        backReps: [6, 8],
        backSets: 3,
        restTopToBackoff: 240,
        restBetweenSets: 150
      },
      {
        name: 'Hip Thrust',
        type: 'compound',
        loadType: 'bar',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 150
      },
      {
        name: 'Extensión cuádriceps',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 2,
        restBetweenSets: 120
      },
      {
        name: 'Femoral tumbado',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 2,
        restBetweenSets: 120
      },
      {
        name: 'Gemelo máquina',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 3,
        restBetweenSets: 120
      }
    ]
  },
  4: {
    id: 4,
    name: 'Hombro · Brazos',
    focus: 'Hombro · Bíceps · Tríceps · Pecho',
    color: '#fbbf24',
    exercises: [
      {
        name: 'Press militar',
        type: 'basic',
        scheme: 'topback',
        loadType: 'bar',
        topReps: [4, 6],
        backReps: [6, 8],
        backSets: 3,
        restTopToBackoff: 240,
        restBetweenSets: 150
      },
      {
        name: 'Elevaciones laterales polea',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 3,
        restBetweenSets: 120
      },
      {
        name: 'Curl Scott máquina',
        type: 'iso',
        loadType: 'machine',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 120
      },
      {
        name: 'Curl Bayesian polea',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 3,
        restBetweenSets: 120
      },
      {
        name: 'Fondos tríceps',
        type: 'compound',
        loadType: 'bar',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 150
      },
      {
        name: 'Extensión tríceps unilateral',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 3,
        restBetweenSets: 120
      }
    ]
  },
  5: {
    id: 5,
    name: 'Máquinas',
    focus: 'Pecho · Espalda · Hombro · Tríceps · Bíceps',
    color: '#a78bfa',
    exercises: [
      {
        name: 'Press inclinado mancuernas',
        type: 'compound',
        loadType: 'dumbbell',
        reps: [6, 8],
        sets: 3,
        restBetweenSets: 160
      },
      {
        name: 'Press banca máquina',
        type: 'compound',
        loadType: 'machine',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 150
      },
      {
        name: 'Cruce de poleas',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 2,
        restBetweenSets: 120
      },
      {
        name: 'Jalón máquina',
        type: 'compound',
        loadType: 'machine',
        reps: [8, 10],
        sets: 4,
        restBetweenSets: 150
      },
      {
        name: 'Remo sentado máquina',
        type: 'compound',
        loadType: 'machine',
        reps: [8, 10],
        sets: 3,
        restBetweenSets: 150
      },
      {
        name: 'Pull-over polea',
        type: 'iso',
        loadType: 'machine',
        reps: [10, 12],
        sets: 3,
        restBetweenSets: 120
      }
    ]
  }
};

// Incremento por defecto según tipo de carga
export const DEFAULT_INCREMENT = {
  bar: 2.5,
  dumbbell: 2,
  machine: 5
};

// Devuelve el índice del día siguiente (0-based)
export function getNextWorkoutDayIndex(sessions, totalDays) {
  if (!sessions || sessions.length === 0 || !totalDays) return 0;
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const lastDayIndex = sorted[0].workoutId; // workoutId almacena el dayIndex
  if (lastDayIndex === null || lastDayIndex === undefined) return 0;
  return (lastDayIndex + 1) % totalDays;
}

export function getLastWorkoutDate(sessions, dayIndex) {
  const matches = sessions
    .filter(s => s.workoutId === dayIndex)
    .sort((a, b) => b.date.localeCompare(a.date));
  return matches.length > 0 ? matches[0].date : null;
}

export function getExerciseHistory(sessions, exerciseName, { includeDeloads = false } = {}) {
  const history = [];
  for (const session of sessions) {
    if (!includeDeloads && session.isDeload) continue;
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
