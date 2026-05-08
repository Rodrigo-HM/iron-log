/**
 * ═══════════════════════════════════════════════════════════════════════════
 *   JEFIT CSV PARSER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Parsea el backup CSV de Jefit y lo convierte al formato interno de Iron Log.
 *
 * El backup tiene varias secciones separadas por "### NOMBRE ###".
 * Las que nos interesan son:
 *   - EXERCISE LOGS:     un registro por (sesión, ejercicio)
 *   - EXERCISE SET LOGS: las series individuales con peso (en lbs!) y reps
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { BASIC_EXERCISES } from './workouts';

const LBS_TO_KG = 0.453592;

// Mapeo de nombres Jefit → nombres limpios en español
const EXERCISE_MAP = {
  'Barbell Bench Press': 'Press banca',
  'Machine Assisted Pull-Up': 'Dominadas',
  'Pull-Up': 'Dominadas',
  'Chin-Up': 'Dominadas',
  'Barbell Squat': 'Sentadilla',
  'Barbell Shoulder Press': 'Press militar',
  'Barbell Military Press': 'Press militar',
  'Dumbbell Incline Bench Press': 'Press inclinado mancuernas',
  'Machine Bench Press': 'Press banca máquina',
  'Machine Fly': 'Aperturas máquina',
  'Cable Cross-Over': 'Cruce de poleas',
  'Machine Dip': 'Fondos máquina',
  'Machine Seated Row': 'Remo sentado máquina',
  'Barbell Bent-Over Row': 'Remo barra',
  'Cable Lat Pulldown (Wide Grip)': 'Jalón polea agarre ancho',
  'Machine Lat Pulldown': 'Jalón máquina',
  'Machine Vertical Row (Close Grip)': 'Remo vertical agarre cerrado',
  'Smith Machine Bent-Over Row': 'Remo Smith',
  'Dumbbell Lateral Raise': 'Elevaciones laterales mancuerna',
  'Cable Lateral Raise': 'Elevaciones laterales polea',
  'Dumbbell Seated Shoulder Press': 'Press militar mancuernas',
  'Dumbbell Seated Dublin Press': 'Press Dublin',
  'Machine Reverse Fly': 'Pájaros máquina',
  'Cable Rope Face Pull': 'Face pull',
  'Cable Shoulder Extension': 'Extensión hombro polea',
  'Dumbbell Alternating Incline Curl': 'Curl inclinado alternado',
  'Cable Rope Hammer Curl': 'Curl martillo cuerda',
  'Preacher Curl Machine': 'Curl Scott máquina',
  'Curl bayesian polea': 'Curl Bayesian polea',
  'Cable Tricep Pushdown (V-Bar)': 'Extensión tríceps V-bar',
  'EZ Bar Seated Reverse Grip French Press': 'Press francés',
  'Cable One-Arm Tricep Extension': 'Extensión tríceps unilateral',
  'Machine Leg Extension': 'Extensión cuádriceps',
  'Machine Leg Curl (Prone)': 'Femoral tumbado',
  'Machine Calf Raise': 'Gemelo máquina',
  'Calf Press On Leg Press': 'Gemelo en prensa',
  'Machine Hip Adduction': 'Aductor máquina',
  'Machine Hip Abduction': 'Abductor máquina',
  'Machine Leg Press': 'Prensa'
};

// Parser de línea CSV que respeta comillas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function parseSections(text) {
  const sections = {};
  let currentSection = null;
  let currentLines = [];

  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) {
      if (currentSection) sections[currentSection] = currentLines;
      currentSection = line.replace(/#/g, '').trim();
      currentLines = [];
    } else if (line.trim() && !line.startsWith('###')) {
      currentLines.push(line);
    }
  }
  if (currentSection) sections[currentSection] = currentLines;
  return sections;
}

function csvSectionToObjects(lines) {
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h.trim()] = values[i]));
    return obj;
  });
}

/**
 * Infiere el workoutId (1-5) según los ejercicios presentes.
 * Esto es importante porque en Jefit no hay distinción de "tipo de entreno",
 * pero podemos detectarlo por el ejercicio principal.
 */
function inferWorkoutId(exNames) {
  if (exNames.includes('Press militar')) return 4;
  if (exNames.includes('Sentadilla')) return 3;
  if (exNames.includes('Dominadas')) return 2;
  if (exNames.includes('Press banca')) return 1;

  // Sin básico: heurísticas sobre los nombres
  const joined = exNames.join(' | ').toLowerCase();
  const hasChest =
    joined.includes('press inclinado') ||
    joined.includes('press banca máquina') ||
    joined.includes('aperturas') ||
    joined.includes('cruce');
  const hasBack = joined.includes('remo') || joined.includes('jalón');
  const hasLegs =
    joined.includes('cuádriceps') ||
    joined.includes('femoral') ||
    joined.includes('gemelo') ||
    joined.includes('prensa') ||
    joined.includes('hip');
  const hasShoulders =
    joined.includes('lateral') ||
    joined.includes('press dublin') ||
    joined.includes('press militar mancuernas');
  const hasArms = joined.includes('curl') || joined.includes('tríceps') || joined.includes('francés');

  if (hasLegs) return 3;
  if (hasBack && hasChest) return 5;
  if (hasBack) return 2;
  if (hasShoulders && hasArms) return 4;
  if (hasChest) return 1;

  return null;
}

function determineType(exerciseName) {
  if (BASIC_EXERCISES.includes(exerciseName)) return 'basic';
  if (
    exerciseName.includes('Press') ||
    exerciseName.includes('Remo') ||
    exerciseName.includes('Jalón') ||
    exerciseName.includes('Hip Thrust')
  ) {
    return 'compound';
  }
  return 'iso';
}

/**
 * Parsea el CSV completo de Jefit y devuelve un array de sesiones
 * en el formato interno de Iron Log.
 */
export function parseJefitCSV(text) {
  const sections = parseSections(text);

  if (!sections['EXERCISE LOGS'] || !sections['EXERCISE SET LOGS']) {
    throw new Error('El CSV no contiene las secciones esperadas de Jefit.');
  }

  const exerciseLogs = csvSectionToObjects(sections['EXERCISE LOGS']);
  const setLogs = csvSectionToObjects(sections['EXERCISE SET LOGS']);

  // Indexar sets por exercise_log_id
  const setsByLog = {};
  for (const s of setLogs) {
    const logId = s.exercise_log_id;
    if (!setsByLog[logId]) setsByLog[logId] = [];
    setsByLog[logId].push(s);
  }

  // Agrupar por fecha
  const sessionsByDate = {};

  for (const log of exerciseLogs) {
    const fecha = log.mydate;
    const enameOrig = (log.ename || '').replace(/^"|"$/g, '').trim();
    const enameClean = EXERCISE_MAP[enameOrig] || enameOrig;
    if (!enameClean) continue;

    const setsRaw = setsByLog[log._id] || [];
    const setsClean = [];

    for (const s of setsRaw) {
      const weightLbs = parseFloat(s.weight_lbs);
      const reps = parseInt(s.reps);
      if (!isNaN(weightLbs) && !isNaN(reps) && reps > 0) {
        setsClean.push({
          kg: Math.round(weightLbs * LBS_TO_KG * 10) / 10,
          reps: reps,
          rpe: ''
        });
      }
    }

    if (setsClean.length > 0) {
      if (!sessionsByDate[fecha]) sessionsByDate[fecha] = [];
      sessionsByDate[fecha].push({ name: enameClean, sets: setsClean });
    }
  }

  // Convertir a sesiones con workoutId inferido
  const sessions = [];
  for (const fecha of Object.keys(sessionsByDate).sort()) {
    const exList = sessionsByDate[fecha];
    const exNames = exList.map(e => e.name);
    const workoutId = inferWorkoutId(exNames);
    if (!workoutId) continue;

    const exercises = exList.map(ex => {
      const type = determineType(ex.name);
      const sets = ex.sets.map((s, i) => ({
        kg: s.kg,
        reps: s.reps,
        rpe: '',
        isTopSet: type === 'basic' && i === 0,
        isBackOff: type === 'basic' && i > 0
      }));
      return { name: ex.name, type, sets };
    });

    sessions.push({
      date: fecha,
      workoutId,
      exercises
    });
  }

  return sessions;
}
