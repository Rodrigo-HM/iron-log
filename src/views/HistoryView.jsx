import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';
import { getExerciseHistory } from '../lib/workouts';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatSet(s) {
  let text = `${s.kg}×${s.reps}`;
  if (s.rpe && s.rpe !== '') text += `@${s.rpe}`;
  return text;
}

function ExerciseDetail({ exerciseName, sessions, onBack }) {
  const history = getExerciseHistory(sessions, exerciseName);

  const points = history.slice().reverse().map(h => {
    const maxKg = Math.max(...h.sets.map(s => parseFloat(s.kg) || 0));
    return { date: h.date, kg: maxKg };
  });

  const chartData = {
    labels: points.map(p => formatDate(p.date)),
    datasets: [{
      label: 'Top kg',
      data: points.map(p => p.kg),
      borderColor: '#ff4500',
      backgroundColor: 'rgba(255, 69, 0, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: '#ff4500',
      fill: true
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: '#262626' },
        ticks: { color: '#888', maxTicksLimit: 8, font: { family: 'JetBrains Mono', size: 10 } }
      },
      y: {
        grid: { color: '#262626' },
        ticks: { color: '#888', font: { family: 'JetBrains Mono', size: 10 } }
      }
    }
  };

  return (
    <div className="page">
      <div className="session-header">
        <button className="back-btn" onClick={onBack}>← Atrás</button>
        <div className="session-title">{exerciseName}</div>
      </div>

      {points.length > 0 && (
        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      <div className="section-label">Historial</div>
      {history.slice(0, 30).map((h, i) => {
        const setsStr = h.sets.map((s, idx) => {
          const text = formatSet(s);
          return s.isTopSet ? <span key={idx} className="top-set">{text}</span> : text;
        }).reduce((acc, el, idx) => acc.concat(idx > 0 ? '  ·  ' : '', el), []);

        return (
          <div className="history-item" key={i}>
            <div className="history-date">{formatDate(h.date)}</div>
            <div className="history-sets">{setsStr}</div>
          </div>
        );
      })}
    </div>
  );
}

export function HistoryView({ sessions }) {
  const [selectedExercise, setSelectedExercise] = useState(null);

  if (selectedExercise) {
    return (
      <ExerciseDetail
        exerciseName={selectedExercise}
        sessions={sessions}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  // Agrupar ejercicios
  const exMap = new Map();
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (!exMap.has(ex.name)) exMap.set(ex.name, { count: 0, type: ex.type, lastDate: '' });
      const e = exMap.get(ex.name);
      e.count++;
      if (session.date > e.lastDate) e.lastDate = session.date;
    }
  }

  const sorted = [...exMap.entries()].sort((a, b) => {
    // Básicos primero, luego por número de sesiones
    if (a[1].type === 'basic' && b[1].type !== 'basic') return -1;
    if (a[1].type !== 'basic' && b[1].type === 'basic') return 1;
    return b[1].count - a[1].count;
  });

  if (sorted.length === 0) {
    return (
      <div className="page">
        <div className="section-label">Progresión por ejercicio</div>
        <div className="empty-state">
          <div className="empty-state-text">
            No hay datos todavía.<br />
            Importa tu histórico de Jefit en <strong>Más → Datos</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="section-label">Progresión por ejercicio</div>
      {sorted.map(([name, info]) => (
        <div className="exercise-list-item" key={name} onClick={() => setSelectedExercise(name)}>
          <div>
            <div className="exercise-list-name">{name}</div>
            <div className="exercise-list-stat">
              {info.count} sesiones · última {formatDate(info.lastDate)}
            </div>
          </div>
          <div className="workout-arrow">›</div>
        </div>
      ))}
    </div>
  );
}
