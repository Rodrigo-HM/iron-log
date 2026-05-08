import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { getExerciseHistory, DEFAULT_INCREMENT } from '../lib/workouts';
import { generateSuggestion, calcBackoffWeight, EFFORT_LEVELS } from '../lib/progression';

// ─── DRAG INPUT HOOK ──────────────────────────────────────────────────────
// Deslizar arriba/abajo sobre un input numérico incrementa/decrementa el valor.
// tap normal → abre teclado. Movimiento ≥ DRAG_THRESHOLD px → modo drag.

const DRAG_THRESHOLD = 5;
const DRAG_STEP_PX = 20;

function useDragInput({ value, onChange, step = 1, min = 0 }) {
  const touchStartY = useRef(null);
  const touchStartValue = useRef(null);
  const isDragging = useRef(false);
  const accPx = useRef(0);

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartValue.current = parseFloat(value) || 0;
    isDragging.current = false;
    accPx.current = 0;
  }, [value]);

  const onTouchMove = useCallback((e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.touches[0].clientY; // positivo = arriba = aumentar
    if (!isDragging.current && Math.abs(dy) >= DRAG_THRESHOLD) {
      isDragging.current = true;
    }
    if (!isDragging.current) return;
    e.preventDefault();
    accPx.current = dy;
    const steps = Math.floor(Math.abs(accPx.current) / DRAG_STEP_PX) * Math.sign(accPx.current);
    const newVal = Math.max(min, Math.round((touchStartValue.current + steps * step) / step) * step);
    // Redondear a 2 decimales para evitar artefactos de punto flotante
    onChange(String(Math.round(newVal * 100) / 100));
  }, [onChange, step, min]);

  const onTouchEnd = useCallback((e) => {
    if (isDragging.current) {
      e.preventDefault(); // evita que abra el teclado si fue drag
    }
    touchStartY.current = null;
    isDragging.current = false;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

function getInitialSets(exDef) {
  const sets = [];
  if (exDef.scheme === 'topback') {
    sets.push({ kg: '', reps: '', effort: null, isTopSet: true });
    for (let i = 0; i < exDef.backSets; i++) {
      sets.push({ kg: '', reps: '', effort: null, isBackOff: true });
    }
  } else {
    for (let i = 0; i < exDef.sets; i++) {
      sets.push({ kg: '', reps: '', effort: exDef.type === 'iso' ? undefined : null });
    }
  }
  return sets;
}

function buildEmptySession(day, dayIndex) {
  return {
    date: new Date().toISOString().split('T')[0],
    workoutId: dayIndex,
    exercises: (day.exercises ?? []).map(ex => ({
      name: ex.name,
      type: ex.type,
      scheme: ex.scheme || null,
      sets: getInitialSets(ex)
    }))
  };
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── REST TIMER ───────────────────────────────────────────────────────────

function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onDone?.(); return; }
    intervalRef.current = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [remaining, onDone]);

  const pct = Math.max(0, remaining / seconds);
  const circumference = 2 * Math.PI * 26;
  const dashoffset = circumference * (1 - pct);

  return (
    <div className="rest-timer">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r="26"
          fill="none"
          stroke={remaining <= 10 ? 'var(--red)' : 'var(--accent)'}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '32px 32px', transition: 'stroke-dashoffset 1s linear' }}
        />
        <text x="32" y="37" textAnchor="middle" fill="var(--text)" fontSize="14" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
          {fmtTime(remaining)}
        </text>
      </svg>
      <button className="timer-skip-btn" onClick={onDone}>Saltar</button>
    </div>
  );
}

// ─── EFFORT SELECTOR ─────────────────────────────────────────────────────

function EffortSelector({ value, onChange }) {
  return (
    <div className="effort-selector">
      {EFFORT_LEVELS.map(lvl => (
        <button
          key={lvl.value}
          className={`effort-btn ${value === lvl.value ? 'active' : ''}`}
          onClick={() => onChange(value === lvl.value ? null : lvl.value)}
          title={lvl.desc}
        >
          {lvl.label}
        </button>
      ))}
    </div>
  );
}

// ─── SUGGESTION BOX ──────────────────────────────────────────────────────

function ExerciseTarget({ exDef }) {
  const label = exDef.scheme === 'topback'
    ? `Top ${exDef.topReps[0]}-${exDef.topReps[1]} · Back ${exDef.backReps[0]}-${exDef.backReps[1]} × ${exDef.backSets} · Descanso ${Math.round((exDef.restBetweenSets ?? 150) / 60)}min`
    : `${exDef.sets ?? '?'} × ${exDef.reps[0]}-${exDef.reps[1]} reps · Descanso ${Math.round((exDef.restBetweenSets ?? 120) / 60)}min`;
  return <div className="exercise-target">{label}</div>;
}

function SuggestionBox({ suggestion, exDef }) {
  if (!suggestion) {
    return (
      <div className="suggestion">
        <div className="suggestion-text">Sin historial — empieza conservador.</div>
      </div>
    );
  }

  if (suggestion.type === 'topback') {
    const t = suggestion.topSet;
    const b = suggestion.backOffs;
    const action = t?.action ?? 'maintain';
    return (
      <>
        {suggestion.deload?.needed && (
          <div className="deload-alert">
            ⚠️ Deload sugerido — {suggestion.deload.reason}
            <span className="deload-hint"> Usa 80% del peso habitual, −1 serie por ejercicio.</span>
          </div>
        )}
        <div className={`suggestion ${action}`}>
          <div className="suggestion-label">SUGERENCIA</div>
          {t && (
            <div className="suggestion-section">
              <div className="suggestion-text">
                Top set: <strong>{t.weight}kg</strong> × {t.minReps}-{t.maxReps} reps
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
      </>
    );
  }

  const s = suggestion.sets;
  return (
    <div className={`suggestion ${s?.action ?? 'maintain'}`}>
      <div className="suggestion-label">SUGERENCIA</div>
      {s && (
        <div className="suggestion-text">
          <strong>{s.weight}kg</strong> × {s.minReps}-{s.maxReps} reps
          <span className="suggestion-reason">{s.reason}</span>
        </div>
      )}
    </div>
  );
}

// ─── EXERCISE CARD ────────────────────────────────────────────────────────

function SetRow({ set, si, label, useEffort, prev, loadType, onUpdate, onDone }) {
  const kgStep = DEFAULT_INCREMENT[loadType] ?? 2.5;

  const kgDrag = useDragInput({
    value: set.kg,
    onChange: v => onUpdate(si, 'kg', v),
    step: kgStep,
    min: 0,
  });

  const repsDrag = useDragInput({
    value: set.reps,
    onChange: v => onUpdate(si, 'reps', v),
    step: 1,
    min: 1,
  });

  return (
    <div className={`set-row ${useEffort ? 'with-effort' : ''} ${set.isTopSet ? 'top-set-row' : ''}`}>
      <span className="set-num">{label}</span>
      <input
        type="number"
        className={`set-input ${set.kg !== '' ? 'filled' : ''}`}
        inputMode="decimal"
        placeholder={prev?.kg ?? '—'}
        value={set.kg}
        onChange={e => onUpdate(si, 'kg', e.target.value)}
        {...kgDrag}
        style={{ touchAction: 'none' }}
      />
      <input
        type="number"
        className={`set-input ${set.reps !== '' ? 'filled' : ''}`}
        inputMode="numeric"
        placeholder={prev?.reps ?? '—'}
        value={set.reps}
        onChange={e => onUpdate(si, 'reps', e.target.value)}
        {...repsDrag}
        style={{ touchAction: 'none' }}
      />
      {useEffort && (
        <div className="effort-cell">
          <select
            className={`effort-select effort-${set.effort ?? 'none'} ${set.effort ? 'filled' : ''} ${!set.effort && prev?.effort ? 'prev-effort' : ''}`}
            value={set.effort ?? ''}
            onChange={e => onUpdate(si, 'effort', e.target.value || null)}
          >
            <option value="">{prev?.effort ? EFFORT_LEVELS.find(l => l.value === prev.effort)?.label ?? '—' : '—'}</option>
            {EFFORT_LEVELS.map(lvl => (
              <option key={lvl.value} value={lvl.value}>{lvl.label}</option>
            ))}
          </select>
        </div>
      )}
      <button
        className="set-done-btn"
        onClick={onDone}
        title="Completar serie → iniciar descanso"
      >
        ✓
      </button>
    </div>
  );
}

function ExerciseCard({ exercise, exDef, history, lastSession, onUpdateSet, onAddSet, onRemoveSet }) {
  const [timerSeconds, setTimerSeconds] = useState(null);
  const [timerKey, setTimerKey] = useState(0);

  const suggestion = useMemo(() => {
    if (history.length === 0) return null;
    return generateSuggestion(history, exDef);
  }, [history, exDef]);

  const useEffort = exercise.type !== 'iso';

  const tagText  = exercise.type === 'basic' ? 'BÁSICO' : exercise.type === 'compound' ? 'COMPUESTO' : 'AISLAMIENTO';
  const tagClass = exercise.type === 'basic' ? 'tag-basic' : exercise.type === 'compound' ? 'tag-comp' : 'tag-iso';

  const handleUpdateSet = useCallback((si, field, value) => {
    onUpdateSet(si, field, value);

    if (field === 'kg' && exercise.sets[si]?.isTopSet) {
      const topKg = parseFloat(value);
      const effort = exercise.sets[si]?.effort;
      if (!isNaN(topKg) && effort) {
        const backoffKg = calcBackoffWeight(topKg, effort);
        if (backoffKg !== null) {
          exercise.sets.forEach((s, idx) => {
            if (s.isBackOff) onUpdateSet(idx, 'kg', String(backoffKg));
          });
        }
      }
    }

    if (field === 'effort' && exercise.sets[si]?.isTopSet) {
      const topKg = parseFloat(exercise.sets[si]?.kg);
      if (!isNaN(topKg) && value) {
        const backoffKg = calcBackoffWeight(topKg, value);
        if (backoffKg !== null) {
          exercise.sets.forEach((s, idx) => {
            if (s.isBackOff) onUpdateSet(idx, 'kg', String(backoffKg));
          });
        }
      }
    }

    if (field === 'effort' && exercise.sets[si]?.isBackOff) {
      const backoffSets = exercise.sets.map((s, idx) => ({ ...s, idx })).filter(s => s.isBackOff);
      const isFirstBackoff = backoffSets[0]?.idx === si;
      if (isFirstBackoff && value === 'limit') {
        backoffSets.slice(1).forEach(s => {
          const currentKg = parseFloat(s.kg);
          if (!isNaN(currentKg)) {
            onUpdateSet(s.idx, 'kg', String(Math.max(0, currentKg - 2.5)));
          }
        });
      }
    }
  }, [exercise.sets, onUpdateSet]);

  const startTimer = (sec) => {
    setTimerSeconds(sec);
    setTimerKey(k => k + 1);
  };

  const handleSetDone = (si) => {
    const set = exercise.sets[si];
    if (set.isTopSet) {
      startTimer(exDef.restTopToBackoff ?? 240);
    } else {
      startTimer(exDef.restBetweenSets ?? (exercise.type === 'iso' ? 120 : 150));
    }
  };

  const canAddSets = exercise.type !== 'basic';

  return (
    <div className="exercise-card">
      <div className="exercise-header">
        <div className="exercise-name">{exercise.name}</div>
        <span className={`exercise-tag ${tagClass}`}>{tagText}</span>
      </div>
      <div className="exercise-body">
        <ExerciseTarget exDef={exDef} />
        <SuggestionBox suggestion={suggestion} exDef={exDef} />

        {timerSeconds !== null && (
          <RestTimer
            key={timerKey}
            seconds={timerSeconds}
            onDone={() => setTimerSeconds(null)}
          />
        )}

        <div className={`set-row header ${useEffort ? 'with-effort' : ''}`}>
          <span></span>
          <span className="set-label">Kg</span>
          <span className="set-label">Reps</span>
          {useEffort && <span className="set-label">Esfuerzo</span>}
          <span></span>
        </div>

        {exercise.sets.map((set, si) => {
          const isTopSet = set.isTopSet;
          const isBackOff = set.isBackOff;
          const backoffIdx = exercise.sets.filter((s, idx) => s.isBackOff && idx <= si).length;
          const label = isTopSet ? 'TOP' : isBackOff ? `B${backoffIdx}` : si + 1;
          const prev = lastSession?.sets?.[si];

          return (
            <div key={si}>
              <SetRow
                set={set}
                si={si}
                label={label}
                useEffort={useEffort}
                prev={prev}
                loadType={exDef.loadType}
                onUpdate={handleUpdateSet}
                onDone={() => handleSetDone(si)}
              />
              {isTopSet && useEffort && (
                <div style={{ paddingLeft: 40, paddingBottom: 8 }}>
                  <EffortSelector
                    value={set.effort}
                    onChange={val => handleUpdateSet(si, 'effort', val)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {canAddSets && (
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

// ─── SESSION VIEW ─────────────────────────────────────────────────────────

export function SessionView({ day, dayIndex, sessions, settings, existingSession, onSave, onBack }) {
  const [session, setSession] = useState(() =>
    existingSession ? JSON.parse(JSON.stringify(existingSession)) : buildEmptySession(day, dayIndex)
  );
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleStart = () => {
    setStarted(true);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const updateSet = useCallback((exIdx, setIdx, field, value) => {
    setSession(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.exercises[exIdx].sets[setIdx][field] = value;
      return copy;
    });
  }, []);

  const makeUpdateSet = (exIdx) => (setIdx, field, value) => {
    setSession(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.exercises[exIdx].sets[setIdx][field] = value;

      const ex = copy.exercises[exIdx];
      const set = ex.sets[setIdx];

      if ((field === 'kg' || field === 'effort') && set.isTopSet) {
        const topKg = parseFloat(field === 'kg' ? value : set.kg);
        const effort = field === 'effort' ? value : set.effort;
        if (!isNaN(topKg) && effort) {
          const backoffKg = calcBackoffWeight(topKg, effort);
          if (backoffKg !== null) {
            ex.sets.forEach((s, idx) => {
              if (s.isBackOff) copy.exercises[exIdx].sets[idx].kg = String(backoffKg);
            });
          }
        }
      }

      if (field === 'effort' && set.isBackOff) {
        const backoffSets = ex.sets.map((s, idx) => ({ ...s, idx })).filter(s => s.isBackOff);
        const isFirstBackoff = backoffSets[0]?.idx === setIdx;
        if (isFirstBackoff && value === 'limit') {
          backoffSets.slice(1).forEach(s => {
            const currentKg = parseFloat(s.kg);
            if (!isNaN(currentKg)) {
              copy.exercises[exIdx].sets[s.idx].kg = String(Math.max(0, currentKg - 2.5));
            }
          });
        }
      }

      return copy;
    });
  };

  const addSet = (exIdx) => {
    setSession(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const type = copy.exercises[exIdx].type;
      copy.exercises[exIdx].sets.push({
        kg: '', reps: '',
        effort: type === 'iso' ? undefined : null
      });
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
    clearInterval(intervalRef.current);
    const filtered = JSON.parse(JSON.stringify(session));
    filtered.exercises = filtered.exercises
      .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.kg !== '' && s.reps !== '') }))
      .filter(ex => ex.sets.length > 0);

    if (filtered.exercises.length === 0) {
      onSave(null, 'Añade al menos una serie con datos');
      return;
    }
    filtered.durationSeconds = started ? elapsed : null;
    onSave(filtered);
  };

  return (
    <div className="page">
      <div className="session-header">
        <button className="back-btn" onClick={onBack}>← Atrás</button>
        <div className="session-title">{day.name}</div>
        {started && (
          <div className="session-chrono">{fmtTime(elapsed)}</div>
        )}
      </div>

      {!started && (
        <button className="start-session-btn" onClick={handleStart}>
          Iniciar sesión
        </button>
      )}

      {session.exercises.map((ex, i) => {
        const exDef = (day.exercises ?? []).find(d => d.name === ex.name) ?? day.exercises[i];
        const history = getExerciseHistory(sessions, ex.name);
        const lastSession = history.length > 0 ? history[0] : null;
        return (
          <ExerciseCard
            key={i}
            exercise={ex}
            exDef={exDef}
            history={history}
            lastSession={lastSession}
            onUpdateSet={makeUpdateSet(i)}
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
