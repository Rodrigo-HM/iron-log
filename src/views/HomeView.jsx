import { getNextWorkoutDayIndex, getLastWorkoutDate } from '../lib/workouts';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function PhaseBadge({ phase, cutStart }) {
  const cutDate = new Date(cutStart);
  const today = new Date();
  const daysToCut = Math.ceil((cutDate - today) / (1000 * 60 * 60 * 24));

  if (phase === 'bulk' && daysToCut > 0) {
    return (
      <div className="phase-badge">
        <span className="phase-dot"></span>
        VOLUMEN · {daysToCut} días para definición
      </div>
    );
  }
  if (phase === 'bulk') {
    return (
      <div className="phase-badge">
        <span className="phase-dot cut"></span>
        DEFINICIÓN COMIENZA HOY
      </div>
    );
  }
  return (
    <div className="phase-badge">
      <span className="phase-dot cut"></span>
      DEFINICIÓN
    </div>
  );
}

function WorkoutCard({ day, dayIndex, isNext, lastDate, onClick }) {
  return (
    <div className={`workout-card ${isNext ? 'next' : ''}`} onClick={onClick}>
      <div className="workout-num">{dayIndex + 1}</div>
      <div className="workout-info">
        <div className="workout-name">{day.name}</div>
        <div className="workout-focus">{day.focus}</div>
        {isNext && (
          <div className="workout-last">
            {lastDate ? `Última vez: ${formatDate(lastDate)}` : 'Sin registros previos'}
          </div>
        )}
      </div>
      {!isNext && lastDate && (
        <div className="exercise-list-stat" style={{ marginRight: 8 }}>
          {formatDate(lastDate)}
        </div>
      )}
      <div className="workout-arrow">›</div>
    </div>
  );
}

export function HomeView({ sessions, settings, activeRoutine, onOpenWorkout, onGoToRoutines }) {
  // Sin rutina activa
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
  const nextDayIndex = getNextWorkoutDayIndex(sessions, days.length);
  const others = days.map((_, i) => i).filter(i => i !== nextDayIndex);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentCount = sessions.filter(s => new Date(s.date) >= sevenDaysAgo).length;

  return (
    <div className="page">
      {/* Stats */}
      <div className="big-num-row">
        <div className="big-num-card">
          <div className="big-num">
            {settings.bodyWeight}<span className="small">kg</span>
          </div>
          <div className="big-num-label">Peso corporal</div>
        </div>
        <div className="big-num-card">
          <div className="big-num">{recentCount}</div>
          <div className="big-num-label">Sesiones / 7d</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <PhaseBadge phase={settings.phase} cutStart={settings.cutStart} />
      </div>

      {/* Rutina activa + botón cambiar */}
      <div className="routine-header-row">
        <div className="routine-header-name">{activeRoutine.name}</div>
        <button className="routine-change-btn" onClick={onGoToRoutines}>
          Cambiar rutina
        </button>
      </div>

      <div className="section-label">Siguiente entreno</div>
      <WorkoutCard
        day={days[nextDayIndex]}
        dayIndex={nextDayIndex}
        isNext={true}
        lastDate={getLastWorkoutDate(sessions, nextDayIndex)}
        onClick={() => onOpenWorkout(nextDayIndex)}
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
              lastDate={getLastWorkoutDate(sessions, i)}
              onClick={() => onOpenWorkout(i)}
            />
          ))}
        </>
      )}
    </div>
  );
}
