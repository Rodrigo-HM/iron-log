/**
 * ═══════════════════════════════════════════════════════════════════════════
 *   CLAUDE EXPORT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Genera un resumen formateado de las últimas sesiones para pegar en Claude.
 * Incluye:
 *   - Estado actual (peso corporal, fase)
 *   - Últimas 3 sesiones completas
 *   - Progresión de los 4 básicos en sus últimas sesiones
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { WORKOUTS, BASIC_EXERCISES, getExerciseHistory } from './workouts';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSet(s) {
  let text = `${s.kg}×${s.reps}`;
  if (s.rpe && s.rpe !== '') text += `@${s.rpe}`;
  return text;
}

export function generateClaudeSummary(sessions, settings) {
  const bodyWeight = settings.bodyWeight || 87;
  const phase = settings.phase || 'bulk';
  const phaseLabel = phase === 'bulk' ? 'VOLUMEN' : 'DEFINICIÓN';

  let out = `📋 RESUMEN IRON LOG\n`;
  out += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n`;
  out += `Peso corporal: ${bodyWeight}kg · Fase: ${phaseLabel}\n\n`;

  // Últimas 3 sesiones
  const recent = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  if (recent.length === 0) {
    out += '(No hay sesiones registradas todavía)\n';
    return out;
  }

  out += `═══ ÚLTIMAS ${recent.length} SESIONES ═══\n\n`;
  for (const session of recent) {
    const w = WORKOUTS[session.workoutId];
    out += `▸ ${formatDate(session.date)} · ${w ? w.name : 'Sesión'} (${w ? w.focus : ''})\n`;
    for (const ex of session.exercises) {
      const setsStr = ex.sets.map(formatSet).join(', ');
      const tagSym = ex.type === 'basic' ? '★' : ex.type === 'compound' ? '●' : '○';
      out += `  ${tagSym} ${ex.name}: ${setsStr}\n`;
    }
    out += '\n';
  }

  // Progresión de los 4 básicos
  out += `═══ PROGRESIÓN BÁSICOS (últimas 4 sesiones) ═══\n\n`;
  for (const exName of BASIC_EXERCISES) {
    const hist = getExerciseHistory(sessions, exName).slice(0, 4);
    if (hist.length > 0) {
      out += `${exName}:\n`;
      for (const h of hist.reverse()) {
        const setsStr = h.sets.map(formatSet).join(' / ');
        out += `  ${formatDate(h.date)}: ${setsStr}\n`;
      }
      out += '\n';
    }
  }

  out += `Leyenda: ★ básico  ●  compuesto  ○ aislamiento\n`;
  out += `Formato sets: peso×reps@RPE (ej: 85×4@9)\n`;

  return out;
}
