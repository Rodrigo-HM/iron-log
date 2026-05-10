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
  'Machine Dip': 'Fondos tríceps',
  'Machine Seated Row': 'Remo sentado máquina',
  'Barbell Bent-Over Row': 'Remo barra',
  'Cable Lat Pulldown (Wide Grip)': 'Jalón máquina',
  'Machine Lat Pulldown': 'Jalón máquina',
  'Machine Vertical Row (Close Grip)': 'Remo vertical agarre cerrado',
  'Smith Machine Bent-Over Row': 'Remo Smith',
  'Cable Lateral Raise': 'Elevaciones laterales polea',
  'Dumbbell Seated Shoulder Press': 'Press militar mancuernas',
  'Dumbbell Seated Dublin Press': 'Press militar mancuernas',
  'Machine Reverse Fly': 'Pájaros máquina',
  'Cable Rope Face Pull': 'Pájaros máquina',
  'Cable Shoulder Extension': 'Pull-over polea',
  'Dumbbell Alternating Incline Curl': 'Curl inclinado mancuerna',
  'Cable Rope Hammer Curl': 'Curl martillo cuerda',
  'Preacher Curl Machine': 'Curl Scott máquina',
  'Curl bayesian polea': 'Curl Bayesian polea',
  'Cable Tricep Pushdown (V-Bar)': 'Extensión tríceps V-bar',
  'EZ Bar Seated Reverse Grip French Press': 'Press francés mancuerna',
  'Cable One-Arm Tricep Extension': 'Extensión tríceps unilateral',
  'Cable Tricep Pushdown (Rope)': 'Extensión tríceps cuerda',
  'Cable Rope Overhead Tricep Extension': 'Extensión tríceps cuerda sobre cabeza',
  'Barbell Tricep Extension (Supine)': 'Press francés tumbado',
  'Machine Leg Extension': 'Extensión cuádriceps',
  'Machine Leg Curl (Prone)': 'Femoral tumbado',
  'Machine Calf Raise': 'Gemelo máquina',
  'Calf Press On Leg Press': 'Gemelo máquina',
  'Machine Hip Adduction': 'Aductor máquina',
  'Machine Hip Abduction': 'Abductor máquina',
  'Machine Leg Press': 'Prensa',
  'Barbell Deadlift': 'Peso muerto',
  'Barbell Hip Thrust': 'Hip Thrust',
  'Barbell Romanian Deadlift': 'Peso muerto rumano',
  'Dumbbell Romanian Deadlift': 'Peso muerto rumano mancuernas',
  'Peso muerto rumano con mancuernas': 'Peso muerto rumano mancuernas',
  'Barbell Preacher Curl': 'Curl predicador barra',
  'Cable Bicep Curl (Close Grip)': 'Curl polea agarre cerrado',
  'Cable One-Arm Lateral Raise': 'Elevación lateral polea unilateral',
  'Cable V Bar Pulldown': 'Jalón V-bar',
  'Dumbbell Incline Fly': 'Aperturas inclinadas mancuerna',
  'Dumbbell Lunge': 'Zancadas',
  'Dumbbell Shoulder Shrug': 'Encogimientos mancuerna',
  'Jalón agarre neutro (negro)': 'Jalón agarre neutro',
  'Remo abierto en polea': 'Remo abierto polea',
  'Curl bayesian polea': 'Curl Bayesian polea',
  'Gemelo de pie': 'Gemelo de pie'
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
 * Dado un array de nombres de ejercicios (ya traducidos) y los días de una
 * rutina, devuelve el dayIndex (0-based) del día con más coincidencias.
 * Devuelve null si ningún día tiene al menos 1 ejercicio en común.
 */
function matchDayIndex(exNames, routineDays) {
  const sessionSet = new Set(exNames.map(n => n.toLowerCase().trim()));
  let bestIdx = null;
  let bestScore = 0;

  routineDays.forEach((day, idx) => {
    const score = (day.exercises ?? []).filter(e =>
      sessionSet.has(e.name.toLowerCase().trim())
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestScore > 0 ? bestIdx : null;
}

function determineType(exerciseName, routineDays) {
  for (const day of routineDays) {
    const match = (day.exercises ?? []).find(
      e => e.name.toLowerCase().trim() === exerciseName.toLowerCase().trim()
    );
    if (match) return match.type ?? 'iso';
  }
  // Fallback heurístico si el ejercicio no está en la rutina
  const n = exerciseName.toLowerCase();
  if (n.includes('press') || n.includes('remo') || n.includes('jalón')) return 'compound';
  return 'iso';
}

/**
 * Parsea el CSV completo de Jefit y devuelve un array de sesiones
 * en el formato interno de Iron Log.
 * activeRoutine: { days: [{ name, exercises: [{ name, type, ... }] }] }
 */
export function parseJefitCSV(text, activeRoutine) {
  const sections = parseSections(text);

  if (!sections['EXERCISE LOGS'] || !sections['EXERCISE SET LOGS']) {
    throw new Error('El CSV no contiene las secciones esperadas de Jefit.');
  }

  const routineDays = activeRoutine?.days ?? [];

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

  // Convertir a sesiones asignando dayIndex por coincidencia con la rutina
  const sessions = [];
  for (const fecha of Object.keys(sessionsByDate).sort()) {
    const exList = sessionsByDate[fecha];
    const exNames = exList.map(e => e.name);
    const dayIndex = routineDays.length > 0
      ? matchDayIndex(exNames, routineDays)
      : null;

    const exercises = exList.map(ex => {
      const type = determineType(ex.name, routineDays);
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
      workoutId: dayIndex,
      exercises
    });
  }

  return sessions;
}
