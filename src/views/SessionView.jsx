import { useState, useMemo } from 'react';
import { WORKOUTS, getExerciseHistory } from '../lib/workouts';
import { generateSuggestion } from '../lib/progression';

function getInitialSets(exDef) {
  const sets = [];
  if (exDef.scheme === 'topback') {
    sets.push({ kg: '', reps: '', rpe: '', isTopSet: true });
    for (let i = 0; i < exDef.backSets; i++) {
      sets.push({ kg: '', reps: '', rpe: '', isBackOff: true });
    }
  } else {
    for (let i = 0; i < exDef.sets; i++) {
      sets.push({ kg: '', reps: '', rpe: '' });
    }
  }
  return sets;
}

function buildEmptySession(workoutId) {
  const w = WORKOUTS[workoutId];
  return {
    date: new Date().toISOString().split('T')[0],
    workoutId,
    exercises: w.exercises.map(ex => ({
      name: ex.name,
      type: ex.type,
      scheme: ex.scheme || null,
      sets: getInitialSets(ex)
    }))
  };
}

function SuggestionBox({ suggestion, exDef }) {
  if (!suggestion) {
    let repsInfo = '';
    if (exDef.scheme === 'topback') {
      repsInfo = `Top: ${exDef.topReps[0]}-${exDef.topReps[1]} reps · Back: ${exDef.backReps[0]}-${exDef.backReps[1]} reps × ${exDef.backSets}`;
    } else {
      repsInfo = `${exDef.sets} series × ${exDef.reps[0]}-${exDef.reps[1]} reps · RIR ${exDef.rir}`;
    }
    return (
      <div className="suggestion">
        <div className="suggestion-label">{repsInfo}</div>
        <div className="suggestion-text">Sin historial previo. Empieza con un peso conservador.</div>
      </div>
    );
  }

  if (suggestion.type === 'topback') {
    const t = suggestion.topSet;
    const b = suggestion.backOffs;
    const action = t?.action || 'maintain';
    return (
      <div className={`suggestion ${action}`}>
        <div className="suggestion-label">SUGERENCIA · ÚLTIMA SESIÓN</div>
        {t && (
          <div className="suggestion-section">
            <div className="suggestion-text">
              Top: <strong>{t.weight}kg</strong> × {t.minReps}-{t.maxReps} reps
              <span className="suggestion-reason">{t.reason}</span>
            </div>
          </div>
        )}
        {b && (
          <div className="suggestion-section">
            <div className="suggestion-text">
              Back offs: <strong>{b.weight}kg</strong> × {b.minReps}-{b.maxReps} reps
              <span className="suggestion-reason">{b.reason}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Simple
  const s = suggestion.sets;
  return (
    <div className={`suggestion ${s?.action || 'maintain'}`}>
      <div className="suggestion-label">SUGERENCIA · ÚLTIMA SESIÓN</div>
      {s && (
        <div className="suggestion-text">
          <strong>{s.weight}kg</strong> × {s.minReps}-{s.maxReps} reps
          <span className="suggestion-reason">{s.reason}</span>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, exDef, history, phase, onUpdateSet, onAddSet, onRemoveSet }) {
  const tagText = exercise.type === 'basic' ? 'BÁSICO' : exercise.type === 'compound' ? 'COMPUESTO' : 'AISLAMIENTO';
  const tagClass = exercise.type === 'basic' ? 'tag-basic' : exercise.type === 'compound' ? 'tag-comp' : 'tag-iso';

  // Generar sugerencia basada en última sesión
  const suggestion = useMemo(() => {
    if (history.length === 0) return null;
    return generateSuggestion(history[0].sets, exDef, phase);
  }, [history, exDef, phase]);

  const canEditSets = exercise.type !== 'basic' || !exercise.scheme;

  return (
    <div className="exercise-card">
      <div className="exercise-header">
        <div className="exercise-name">{exercise.name}</div>
        <span className={`exercise-tag ${tagClass}`}>{tagText}</span>
      </div>
      <div className="exercise-body">
        <SuggestionBox suggestion={suggestion} exDef={exDef} />

        <div className="set-row header">
          <span></span>
          <span className="set-label">Kg</span>
          <span className="set-label">Reps</span>
          <span className="set-label">RPE</span>
        </div>

        {exercise.sets.map((set, si) => {
          const label = set.isTopSet ? 'TOP' : set.isBackOff ? `B${si}` : si + 1;
          return (
            <div className="set-row" key={si}>
              <span className="set-num">{label}</span>
              <input
                type="number"
                className="set-input"
                inputMode="decimal"
                placeholder="—"
                value={set.kg}
                onChange={e => onUpdateSet(si, 'kg', e.target.value)}
              />
              <input
                type="number"
                className="set-input"
                inputMode="numeric"
                placeholder="—"
                value={set.reps}
                onChange={e => onUpdateSet(si, 'reps', e.target.value)}
              />
              <input
                type="number"
                className="set-input"
                inputMode="decimal"
                placeholder="—"
                min="5"
                max="10"
                step="0.5"
                value={set.rpe}
                onChange={e => onUpdateSet(si, 'rpe', e.target.value)}
              />
            </div>
          );
        })}

        {canEditSets && (
          <div className="set-actions">
            <button className="add-set-btn" onClick={onAddSet}>+ Serie</button>
            {exercise.sets.length > 1 && (
              <button className="remove-set-btn" onClick={onRemoveSet}>− Última</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SessionView({ workoutId, sessions, settings, existingSession, onSave, onBack }) {
  const w = WORKOUTS[workoutId];
  const [session, setSession] = useState(() =>
    existingSession ? JSON.parse(JSON.stringify(existingSession)) : buildEmptySession(workoutId)
  );

  const updateSet = (exIdx, setIdx, field, value) => {
    setSession(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.exercises[exIdx].sets[setIdx][field] = value;
      return copy;
    });
  };

  const addSet = (exIdx) => {
    setSession(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.exercises[exIdx].sets.push({ kg: '', reps: '', rpe: '' });
      return copy;
    });
  };

  const removeSet = (exIdx) => {
    setSession(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (copy.exercises[exIdx].sets.length > 1) {
        copy.exercises[exIdx].sets.pop();
      }
      return copy;
    });
  };

  const handleSave = () => {
    // Filtrar sets vacíos
    const filtered = JSON.parse(JSON.stringify(session));
    filtered.exercises = filtered.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.filter(s => s.kg !== '' && s.reps !== '')
    })).filter(ex => ex.sets.length > 0);

    if (filtered.exercises.length === 0) {
      onSave(null, 'Añade al menos una serie con datos');
      return;
    }

    onSave(filtered);
  };

  return (
    <div className="page">
      <div className="session-header">
        <button className="back-btn" onClick={onBack}>← Atrás</button>
        <div className="session-title">{w.name}</div>
      </div>

      {session.exercises.map((ex, i) => {
        const exDef = w.exercises.find(d => d.name === ex.name) || w.exercises[i];
        const history = getExerciseHistory(sessions, ex.name);
        return (
          <ExerciseCard
            key={i}
            exercise={ex}
            exDef={exDef}
            history={history}
            phase={settings.phase}
            onUpdateSet={(si, field, value) => updateSet(i, si, field, value)}
            onAddSet={() => addSet(i)}
            onRemoveSet={() => removeSet(i)}
          />
        );
      })}

      <button className="primary-btn" onClick={handleSave} style={{ marginTop: 16 }}>
        Guardar sesión
      </button>
    </div>
  );
}
