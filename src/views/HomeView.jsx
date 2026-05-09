import { getNextWorkoutDayIndex, getLastWorkoutDate } from '../lib/workouts';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function WeeklyProgress({ sessions, weeklyGoal }) {
  const goal = weeklyGoal || 4;

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=dom, 1=lun...
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const weekSessions = sessions.filter(s => new Date(s.date) >= monday);
  const done = weekSessions.length;
  const pct = Math.min(done / goal, 1);

  const dots = Array.from({ length: goal }, (_, i) => i < done);

  return (
    <div className="weekly-progress-card">
      <div className="weekly-progress-header">
        <span className="weekly-progress-label">OBJETIVO SEMANAL</span>
        <span className="weekly-progress-count">{done}<span className="weekly-progress-goal">/{goal}</span></span>
      </div>
      <div className="weekly-dots">
        {dots.map((filled, i) => (
          <div key={i} className={`weekly-dot ${filled ? 'filled' : ''}`} />
        ))}
      </div>
      <div className="weekly-bar-track">
        <div className="weekly-bar-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      {done >= goal && (
        <div className="weekly-goal-achieved">Objetivo cumplido esta semana</div>
      )}
    </div>
  );
}

function WorkoutCard({ day, dayIndex, isNext, isInProgress, isDisabled, lastDate, onClick }) {
  return (
    <div
      className={`workout-card ${isNext ? 'next' : ''} ${isInProgress ? 'in-progress' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={onClick}
    >
      <div className="workout-num">{dayIndex + 1}</div>
      <div className="workout-info">
        <div className="workout-name">{day.name}</div>
        <div className="workout-focus">{day.focus}</div>
        {isInProgress && (
          <div className="workout-last in-progress-label">● Entreno en curso</div>
        )}
        {isNext && !isInProgress && (
          <div className="workout-last">
            {lastDate ? `Última vez: ${formatDate(lastDate)}` : 'Sin registros previos'}
          </div>
        )}
      </div>
      {!isNext && !isInProgress && lastDate && (
        <div className="exercise-list-stat" style={{ marginRight: 8 }}>
          {formatDate(lastDate)}
        </div>
      )}
      <div className="workout-arrow">›</div>
    </div>
  );
}

export function HomeView({ sessions, settings, activeRoutine, activeSessionDayIndex, onOpenWorkout, onGoToRoutines }) {
  if (!activeRoutine) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-text">
            No hay ninguna rutina activa.<br />
            Ve a <strong>Rutinas</strong> para crear o activar una.
          </div>
          <button className="primary-btn" style={{ marginTop: 20 }} onClick={onGoToRoutines}>
            Ir a Rutinas
          </button>
        </div>
      </div>
    );
  }

  const days = activeRoutine.days ?? [];
  const hasActiveSession = activeSessionDayIndex != null && activeSessionDayIndex < days.length;
  const featuredDayIndex = hasActiveSession
    ? activeSessionDayIndex
    : getNextWorkoutDayIndex(sessions, days.length);
  const others = days.map((_, i) => i).filter(i => i !== featuredDayIndex);

  return (
    <div className="page">
      <WeeklyProgress sessions={sessions} weeklyGoal={settings.weeklyGoal} />

      <div className="routine-header-row">
        <div className="routine-header-name">{activeRoutine.name}</div>
        <button className="routine-change-btn" onClick={onGoToRoutines}>
          Cambiar rutina
        </button>
      </div>

      <div className="section-label">{hasActiveSession ? 'Continuar entreno' : 'Siguiente entreno'}</div>
      <WorkoutCard
        day={days[featuredDayIndex]}
        dayIndex={featuredDayIndex}
        isNext={true}
        isInProgress={hasActiveSession}
        lastDate={getLastWorkoutDate(sessions, featuredDayIndex)}
        onClick={() => onOpenWorkout(featuredDayIndex)}
      />

      {others.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 24 }}>Otros días</div>
          {others.map(i => (
            <WorkoutCard
              key={i}
              day={days[i]}
              dayIndex={i}
              isNext={false}
              isDisabled={hasActiveSession}
              lastDate={getLastWorkoutDate(sessions, i)}
              onClick={() => onOpenWorkout(i)}
            />
          ))}
        </>
      )}
    </div>
  );
}
