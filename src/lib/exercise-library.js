export const EXERCISE_LIBRARY = [
  // BÁSICOS
  { name: 'Press banca', type: 'basic', loadType: 'bar', sets: 3, reps: [4, 6], scheme: 'topback', topReps: [4, 6], backReps: [6, 8], backSets: 3 },
  { name: 'Dominadas', type: 'basic', loadType: 'bar', sets: 3, reps: [4, 6], scheme: 'topback', topReps: [4, 6], backReps: [6, 8], backSets: 3 },
  { name: 'Sentadilla', type: 'basic', loadType: 'bar', sets: 3, reps: [4, 6], scheme: 'topback', topReps: [4, 6], backReps: [6, 8], backSets: 3 },
  { name: 'Press militar', type: 'basic', loadType: 'bar', sets: 3, reps: [4, 6], scheme: 'topback', topReps: [4, 6], backReps: [6, 8], backSets: 3 },
  { name: 'Peso muerto', type: 'basic', loadType: 'bar', sets: 3, reps: [3, 5], scheme: 'topback', topReps: [3, 5], backReps: [5, 7], backSets: 2 },

  // COMPUESTOS — Pecho
  { name: 'Press inclinado mancuernas', type: 'compound', loadType: 'dumbbell', sets: 3, reps: [8, 10] },
  { name: 'Press banca máquina', type: 'compound', loadType: 'machine', sets: 4, reps: [8, 10] },
  { name: 'Press declinado barra', type: 'compound', loadType: 'bar', sets: 3, reps: [8, 10] },

  // COMPUESTOS — Espalda
  { name: 'Remo barra', type: 'compound', loadType: 'bar', sets: 3, reps: [8, 10] },
  { name: 'Remo sentado máquina', type: 'compound', loadType: 'machine', sets: 3, reps: [8, 10] },
  { name: 'Jalón máquina', type: 'compound', loadType: 'machine', sets: 4, reps: [8, 10] },
  { name: 'Remo mancuerna unilateral', type: 'compound', loadType: 'dumbbell', sets: 3, reps: [8, 10] },

  // COMPUESTOS — Piernas
  { name: 'Hip Thrust', type: 'compound', loadType: 'bar', sets: 3, reps: [8, 10] },
  { name: 'Prensa', type: 'compound', loadType: 'machine', sets: 4, reps: [8, 12] },
  { name: 'Zancadas', type: 'compound', loadType: 'dumbbell', sets: 3, reps: [10, 12] },

  // COMPUESTOS — Hombro
  { name: 'Press militar mancuernas', type: 'compound', loadType: 'dumbbell', sets: 3, reps: [8, 10] },
  { name: 'Press Arnold', type: 'compound', loadType: 'dumbbell', sets: 3, reps: [8, 10] },

  // AISLAMIENTO — Pecho
  { name: 'Aperturas máquina', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Cruce de poleas', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Aperturas mancuernas', type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12] },

  // AISLAMIENTO — Hombro
  { name: 'Elevaciones laterales mancuerna', type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12] },
  { name: 'Elevaciones laterales polea', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Pájaros máquina', type: 'iso', loadType: 'machine', sets: 2, reps: [12, 15] },
  { name: 'Elevaciones frontales mancuerna', type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12] },

  // AISLAMIENTO — Espalda
  { name: 'Pull-over polea', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },

  // AISLAMIENTO — Bíceps
  { name: 'Curl barra', type: 'iso', loadType: 'bar', sets: 3, reps: [10, 12] },
  { name: 'Curl inclinado alternado', type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12] },
  { name: 'Curl Bayesian polea', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Curl Scott máquina', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Curl martillo cuerda', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Curl predicador mancuerna', type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12] },

  // AISLAMIENTO — Tríceps
  { name: 'Extensión tríceps V-bar', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Extensión tríceps unilateral', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Press francés', type: 'iso', loadType: 'bar', sets: 2, reps: [10, 12] },
  { name: 'Fondos tríceps', type: 'iso', loadType: 'bar', sets: 3, reps: [8, 12] },

  // AISLAMIENTO — Piernas
  { name: 'Extensión cuádriceps', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Femoral tumbado', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Femoral sentado', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12] },
  { name: 'Gemelo máquina', type: 'iso', loadType: 'machine', sets: 4, reps: [12, 15] },
  { name: 'Gemelo de pie', type: 'iso', loadType: 'bar', sets: 4, reps: [12, 15] },
  { name: 'Abductores máquina', type: 'iso', loadType: 'machine', sets: 2, reps: [12, 15] },
];

const TYPE_ORDER = { basic: 0, compound: 1, iso: 2 };

export function searchExercises(query) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? EXERCISE_LIBRARY.filter(e => e.name.toLowerCase().includes(q))
    : EXERCISE_LIBRARY;
  return [...filtered].sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.name.localeCompare(b.name));
}
