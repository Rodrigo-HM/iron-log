import { WORKOUTS, getNextWorkoutId, getLastWorkoutDate } from '../lib/workouts';

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

function WorkoutCard({ workout, isNext, lastDate, onClick }) {
  return (
    <div className={`workout-card ${isNext ? 'next' : ''}`} onClick={onClick}>
      <div className="workout-num">{workout.id}</div>
      <div className="workout-info">
        <div className="workout-name">{workout.name}</div>
        <div className="workout-focus">{workout.focus}</div>
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

export function HomeView({ sessions, settings, onOpenWorkout }) {
  const nextId = getNextWorkoutId(sessions);
  const nextWorkout = WORKOUTS[nextId];
  const nextLastDate = getLastWorkoutDate(sessions, nextId);
  const others = [1, 2, 3, 4, 5].filter(id => id !== nextId);

  // Sesiones últimos 7 días
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentCount = sessions.filter(s => new Date(s.date) >= sevenDaysAgo).length;

  return (
    <div className="page">
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

      <div style={{ marginBottom: 20 }}>
        <PhaseBadge phase={settings.phase} cutStart={settings.cutStart} />
      </div>

      <div className="section-label">Siguiente entreno</div>
      <WorkoutCard
        workout={nextWorkout}
        isNext={true}
        lastDate={nextLastDate}
        onClick={() => onOpenWorkout(nextId)}
      />

      <div className="section-label" style={{ marginTop: 24 }}>Otros entrenos</div>
      {others.map(id => (
        <WorkoutCard
          key={id}
          workout={WORKOUTS[id]}
          isNext={false}
          lastDate={getLastWorkoutDate(sessions, id)}
          onClick={() => onOpenWorkout(id)}
        />
      ))}
    </div>
  );
}
