export const EXERCISE_LIBRARY = [
  // BÁSICOS
  { name: 'Press banca',    type: 'basic', loadType: 'bar',      sets: 3, reps: [4, 6], scheme: 'topback', topReps: [4, 6], backReps: [6, 8], backSets: 3, muscle: 'Pecho',    muscles: ['Tríceps', 'Hombro'] },
  { name: 'Dominadas',      type: 'basic', loadType: 'bar',      sets: 3, reps: [4, 6], scheme: 'topback', topReps: [4, 6], backReps: [6, 8], backSets: 3, muscle: 'Espalda',  muscles: ['Bíceps'] },
  { name: 'Sentadilla',     type: 'basic', loadType: 'bar',      sets: 3, reps: [4, 6], scheme: 'topback', topReps: [4, 6], backReps: [6, 8], backSets: 3, muscle: 'Cuádriceps', muscles: ['Glúteo', 'Femoral'] },
  { name: 'Press militar',  type: 'basic', loadType: 'bar',      sets: 3, reps: [4, 6], scheme: 'topback', topReps: [4, 6], backReps: [6, 8], backSets: 3, muscle: 'Hombro',   muscles: ['Tríceps'] },
  { name: 'Peso muerto',    type: 'basic', loadType: 'bar',      sets: 3, reps: [3, 5], scheme: 'topback', topReps: [3, 5], backReps: [5, 7], backSets: 2, muscle: 'Espalda',  muscles: ['Glúteo', 'Femoral', 'Cuádriceps'] },

  // COMPUESTOS — Pecho
  { name: 'Press inclinado mancuernas', type: 'compound', loadType: 'dumbbell', sets: 3, reps: [8, 10], muscle: 'Pecho',   muscles: ['Hombro', 'Tríceps'] },
  { name: 'Press banca máquina',         type: 'compound', loadType: 'machine',  sets: 4, reps: [8, 10], muscle: 'Pecho',   muscles: ['Tríceps'] },
  { name: 'Press inclinado máquina',     type: 'compound', loadType: 'machine',  sets: 3, reps: [8, 10], muscle: 'Pecho',   muscles: ['Hombro', 'Tríceps'] },
  { name: 'Press declinado barra',      type: 'compound', loadType: 'bar',      sets: 3, reps: [8, 10], muscle: 'Pecho',   muscles: ['Tríceps'] },

  // COMPUESTOS — Espalda
  { name: 'Remo barra',                 type: 'compound', loadType: 'bar',      sets: 3, reps: [8, 10], muscle: 'Espalda', muscles: ['Bíceps'] },
  { name: 'Remo sentado máquina',           type: 'compound', loadType: 'machine',  sets: 3, reps: [8, 10], muscle: 'Espalda', muscles: ['Bíceps'] },
  { name: 'Remo sentado máquina unilateral',type: 'compound', loadType: 'machine',  sets: 3, reps: [8, 10], muscle: 'Espalda', muscles: ['Bíceps'] },
  { name: 'Remo sentado polea unilateral',  type: 'compound', loadType: 'machine',  sets: 3, reps: [8, 10], muscle: 'Espalda', muscles: ['Bíceps'] },
  { name: 'Remo abierto máquina',           type: 'compound', loadType: 'machine',  sets: 3, reps: [8, 10], muscle: 'Espalda', muscles: ['Hombro'] },
  { name: 'Jalón máquina',                  type: 'compound', loadType: 'machine',  sets: 4, reps: [8, 10], muscle: 'Espalda', muscles: ['Bíceps'] },
  { name: 'Jalón al pecho en polea',        type: 'compound', loadType: 'machine',  sets: 4, reps: [8, 10], muscle: 'Espalda', muscles: ['Bíceps'] },
  { name: 'Remo mancuerna unilateral',      type: 'compound', loadType: 'dumbbell', sets: 3, reps: [8, 10], muscle: 'Espalda', muscles: ['Bíceps'] },

  // COMPUESTOS — Piernas
  { name: 'Hip Thrust',          type: 'compound', loadType: 'bar',     sets: 3, reps: [8, 10], muscle: 'Glúteo', muscles: ['Femoral'] },
  { name: 'Hip Thrust máquina',  type: 'compound', loadType: 'machine', sets: 3, reps: [8, 10], muscle: 'Glúteo', muscles: ['Femoral'] },
  { name: 'Prensa',      type: 'compound', loadType: 'machine',  sets: 4, reps: [8, 12],  muscle: 'Cuádriceps', muscles: ['Glúteo', 'Femoral'] },
  { name: 'Zancadas',    type: 'compound', loadType: 'dumbbell', sets: 3, reps: [10, 12], muscle: 'Cuádriceps', muscles: ['Glúteo', 'Femoral'] },

  // COMPUESTOS — Hombro
  { name: 'Press militar mancuernas', type: 'compound', loadType: 'dumbbell', sets: 3, reps: [8, 10], muscle: 'Hombro', muscles: ['Tríceps'] },
  { name: 'Press Arnold',             type: 'compound', loadType: 'dumbbell', sets: 3, reps: [8, 10], muscle: 'Hombro', muscles: ['Tríceps'] },

  // AISLAMIENTO — Pecho
  { name: 'Aperturas máquina',    type: 'iso', loadType: 'machine',  sets: 2, reps: [10, 12], muscle: 'Pecho', muscles: [] },
  { name: 'Cruce de poleas',      type: 'iso', loadType: 'machine',  sets: 2, reps: [10, 12], muscle: 'Pecho', muscles: [] },
  { name: 'Aperturas mancuernas', type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12], muscle: 'Pecho', muscles: [] },

  // AISLAMIENTO — Hombro
  { name: 'Elevaciones laterales mancuerna', type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12], muscle: 'Hombro', muscles: [] },
  { name: 'Elevaciones laterales polea',     type: 'iso', loadType: 'machine',  sets: 2, reps: [10, 12], muscle: 'Hombro', muscles: [] },
  { name: 'Pájaros máquina',                 type: 'iso', loadType: 'machine',  sets: 2, reps: [12, 15], muscle: 'Hombro', muscles: [] },
  { name: 'Elevaciones frontales mancuerna', type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12], muscle: 'Hombro', muscles: [] },

  // AISLAMIENTO — Espalda
  { name: 'Pull-over polea', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12], muscle: 'Espalda', muscles: [] },

  // AISLAMIENTO — Bíceps
  { name: 'Curl barra',               type: 'iso', loadType: 'bar',      sets: 3, reps: [10, 12], muscle: 'Bíceps', muscles: [] },
  { name: 'Curl inclinado alternado',   type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12], muscle: 'Bíceps', muscles: [] },
  { name: 'Curl inclinado mancuerna',   type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12], muscle: 'Bíceps', muscles: [] },
  { name: 'Curl Bayesian polea',       type: 'iso', loadType: 'machine',  sets: 2, reps: [10, 12], muscle: 'Bíceps', muscles: [] },
  { name: 'Curl Scott máquina',        type: 'iso', loadType: 'machine',  sets: 2, reps: [10, 12], muscle: 'Bíceps', muscles: [] },
  { name: 'Curl martillo cuerda',      type: 'iso', loadType: 'machine',  sets: 2, reps: [10, 12], muscle: 'Bíceps', muscles: [] },
  { name: 'Curl predicador mancuerna', type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12], muscle: 'Bíceps', muscles: [] },
  { name: 'Curl predicador máquina',   type: 'iso', loadType: 'machine',  sets: 2, reps: [10, 12], muscle: 'Bíceps', muscles: [] },

  // AISLAMIENTO — Tríceps
  { name: 'Extensión tríceps V-bar',        type: 'iso', loadType: 'machine',  sets: 2, reps: [10, 12], muscle: 'Tríceps', muscles: [] },
  { name: 'Extensión tríceps unilateral',   type: 'iso', loadType: 'machine',  sets: 2, reps: [10, 12], muscle: 'Tríceps', muscles: [] },
  { name: 'Press francés',                  type: 'iso', loadType: 'bar',      sets: 2, reps: [10, 12], muscle: 'Tríceps', muscles: [] },
  { name: 'Press francés mancuerna',        type: 'iso', loadType: 'dumbbell', sets: 2, reps: [10, 12], muscle: 'Tríceps', muscles: [] },
  { name: 'Fondos tríceps',                 type: 'iso', loadType: 'bar',      sets: 3, reps: [8, 12],  muscle: 'Tríceps', muscles: ['Pecho'] },

  // AISLAMIENTO — Piernas
  { name: 'Extensión cuádriceps', type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12], muscle: 'Cuádriceps', muscles: [] },
  { name: 'Femoral tumbado',      type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12], muscle: 'Femoral',    muscles: [] },
  { name: 'Femoral sentado',      type: 'iso', loadType: 'machine', sets: 2, reps: [10, 12], muscle: 'Femoral',    muscles: [] },
  { name: 'Gemelo máquina',       type: 'iso', loadType: 'machine', sets: 4, reps: [12, 15], muscle: 'Gemelo',     muscles: [] },
  { name: 'Gemelo de pie',        type: 'iso', loadType: 'bar',     sets: 4, reps: [12, 15], muscle: 'Gemelo',     muscles: [] },
  { name: 'Abductores máquina',   type: 'iso', loadType: 'machine', sets: 2, reps: [12, 15], muscle: 'Abductores', muscles: [] },
];

const TYPE_ORDER = { basic: 0, compound: 1, iso: 2 };

export function searchExercises(query) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? EXERCISE_LIBRARY.filter(e => e.name.toLowerCase().includes(q))
    : EXERCISE_LIBRARY;
  return [...filtered].sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.name.localeCompare(b.name));
}
