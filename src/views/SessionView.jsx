import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { getExerciseHistory, DEFAULT_INCREMENT } from '../lib/workouts';
import { generateSuggestion, calcBackoffWeight, EFFORT_LEVELS, detectDeload } from '../lib/progression';
import { saveActiveSession, loadActiveSession, clearActiveSession } from '../lib/storage';
import { useTapInput } from '../lib/useTapInput';
import { scheduleRestEnd, cancelRestEnd, ensureNotificationPermission } from '../lib/restNotification';

// ─── BEEP ─────────────────────────────────────────────────────────────────

function beep({ frequency = 880, duration = 80, volume = 0.3, type = 'sine' } = {}) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
    osc.onended = () => ctx.close();
  } catch {}
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

function RestTimer({ seconds, onDone, hidden = false }) {
  const endTimeRef = useRef(Date.now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);
  const onDoneRef = useRef(onDone);
  const lastBeepedSecond = useRef(null);
  onDoneRef.current = onDone;

  // Programar notificación al montar y cancelarla al desmontar
  useEffect(() => {
    scheduleRestEnd(seconds * 1000);
    return () => { cancelRestEnd(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tick = () => {
      const left = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(interval);
        beep({ frequency: 1760, duration: 300, volume: 0.4 });
        setRemaining(0);
        setTimeout(() => onDoneRef.current?.(), 0);
        return;
      }
      if ((left === 3 || left === 2) && lastBeepedSecond.current !== left) {
        lastBeepedSecond.current = left;
        beep({ frequency: 880, duration: 180, volume: 0.35 });
      }
      setRemaining(left);
    };
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, []);

  // Al volver de background, recalcular inmediatamente sin esperar al próximo tick
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const left = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
        setRemaining(left);
        if (left === 0) setTimeout(() => onDoneRef.current?.(), 0);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleAdjust = (delta) => {
    endTimeRef.current += delta * 1000;
    setRemaining(r => Math.max(0, r + delta));
    const newDelay = endTimeRef.current - Date.now();
    if (newDelay > 0) scheduleRestEnd(newDelay);
    else cancelRestEnd();
  };

  const pct = Math.max(0, remaining / seconds);
  const circumference = 2 * Math.PI * 26;
  const dashoffset = circumference * (1 - pct);

  return (
    <div className="rest-timer" style={hidden ? { display: 'none' } : undefined}>
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
      <div className="timer-controls">
        <button className="timer-adj-btn" onClick={() => handleAdjust(-30)}>−30s</button>
        <button className="timer-adj-btn" onClick={() => handleAdjust(30)}>+30s</button>
        <button className="timer-skip-btn" onClick={onDone}>Saltar</button>
      </div>
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

function TapInput({ value, fallback, onChange, step, min, inputMode, editable }) {
  const { onTouchStart, onTouchMove, onTouchEnd, keyboardOpen, closeKeyboard } = useTapInput({
    value, fallback, onChange, step, min,
  });

  const hasValue = value !== '';
  const displayText = hasValue ? value : (fallback ?? '—');
  const filled = hasValue;
  const isPlaceholder = !hasValue;

  if (!editable) {
    return (
      <div className={`set-input ${filled ? 'filled' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: filled ? 'var(--accent)' : 'var(--text-faint)', fontWeight: filled ? 600 : 400 }}>
          {displayText}
        </span>
      </div>
    );
  }

  if (keyboardOpen) {
    return (
      <input
        type="number"
        className={`set-input ${filled ? 'filled' : ''}`}
        inputMode={inputMode}
        value={value}
        placeholder={fallback ?? '—'}
        autoFocus
        onChange={e => onChange(e.target.value)}
        onBlur={closeKeyboard}
        style={{ touchAction: 'none' }}
      />
    );
  }

  return (
    <div
      className={`set-input ${filled ? 'filled' : ''}`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', touchAction: 'none',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <span style={{
        color: filled ? 'var(--accent)' : isPlaceholder ? 'var(--text-faint)' : 'var(--text)',
        fontWeight: filled ? 600 : 400,
      }}>
        {displayText}
      </span>
    </div>
  );
}

function SetRow({ set, si, label, useEffort, showEffort, started, isActive, prev, loadType, onUpdate, onDone }) {
  const editable = started && isActive;
  const kgStep = loadType === 'machine' ? 1 : (DEFAULT_INCREMENT[loadType] ?? 2.5);

  const canComplete = set.kg !== '' && set.reps !== '' && (!showEffort || set.effort);

  return (
    <div className={`set-block ${set.isTopSet ? 'top-set-row' : ''} ${!started ? 'set-locked' : !isActive ? 'set-done' : 'set-active'}`}>
      <div className="set-row">
        <span className="set-num">{label}</span>
        <TapInput
          value={set.kg}
          fallback={prev?.kg}
          onChange={v => onUpdate(si, 'kg', v)}
          step={kgStep}
          min={0}
          inputMode="decimal"
          editable={editable}
        />
        <TapInput
          value={set.reps}
          fallback={prev?.reps}
          onChange={v => onUpdate(si, 'reps', v)}
          step={1}
          min={1}
          inputMode="numeric"
          editable={editable}
        />
        <button
          className={`set-done-btn${editable && canComplete ? ' ready' : ''}`}
          onClick={onDone}
          disabled={!editable || !canComplete}
          title="Completar serie → iniciar descanso"
        >
          ✓
        </button>
      </div>
      {showEffort && isActive && started && (
        <div className="set-effort-row">
          <EffortSelector
            value={set.effort}
            onChange={val => onUpdate(si, 'effort', val)}
          />
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, exDef, history, lastSession, started, expanded, isActive, isDeloadSession, aiEnabled, onToggle, timerSeconds, timerKey, onSetDone, onTimerDone, onUpdateSet, onAddSet, onRemoveSet }) {
  const [activeSet, setActiveSet] = useState(() => {
    const firstIncomplete = exercise.sets.findIndex(s => s.kg === '' || s.reps === '');
    return firstIncomplete === -1 ? exercise.sets.length : firstIncomplete;
  });

  const suggestion = useMemo(() => {
    if (history.length === 0) return null;
    return generateSuggestion(history, exDef, { applyDeload: isDeloadSession });
  }, [history, exDef, isDeloadSession]);

  const useEffort = exercise.type !== 'iso';

  const tagText  = exercise.type === 'basic' ? 'BÁSICO' : exercise.type === 'compound' ? 'COMPUESTO' : 'AISLAMIENTO';
  const tagClass = exercise.type === 'basic' ? 'tag-basic' : exercise.type === 'compound' ? 'tag-comp' : 'tag-iso';

  const handleUpdateSet = onUpdateSet;

  const handleSetDone = (si) => {
    const set = exercise.sets[si];
    const isLast = si === exercise.sets.length - 1;
    setActiveSet(si + 1);
    const restSec = set.isTopSet
      ? (exDef.restTopToBackoff ?? 240)
      : (exDef.restBetweenSets ?? (exercise.type === 'iso' ? 120 : 150));
    onSetDone(isLast, restSec);
  };

  const canAddSets = exercise.type !== 'basic';

  const doneSets = exercise.sets.filter(s => s.kg !== '' && s.reps !== '').length;
  const totalSets = exercise.sets.length;
  const isCompleted = doneSets === totalSets && totalSets > 0;

  return (
    <div className={`exercise-card ${expanded ? 'expanded' : 'collapsed'} ${!expanded && isActive ? 'active-collapsed' : ''} ${!expanded && isCompleted && !isActive ? 'completed-collapsed' : ''}`}>
      <div className="exercise-header" onClick={onToggle} style={{ cursor: 'pointer' }}>
        <div>
          <div className="exercise-name">{exercise.name}</div>
          {!expanded && (
            <div className="exercise-collapsed-info">
              {isCompleted ? <span className="collapsed-done">✓ completado</span> : doneSets > 0 ? `${doneSets}/${totalSets} series` : `${totalSets} series`}
              {isActive && timerSeconds !== null && <span className="collapsed-timer"> · descansando</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`exercise-tag ${tagClass}`}>{tagText}</span>
          <span className="exercise-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {timerSeconds !== null && (
        <RestTimer
          key={timerKey}
          seconds={timerSeconds}
          onDone={onTimerDone}
          hidden={!expanded}
        />
      )}

      {expanded && (
        <div className="exercise-body">
          <ExerciseTarget exDef={exDef} />
          {aiEnabled && <SuggestionBox suggestion={suggestion} exDef={exDef} />}


          <div className="set-row header">
            <span></span>
            <span className="set-label">Kg</span>
            <span className="set-label">Reps</span>
            <span></span>
          </div>

          {exercise.sets.map((set, si) => {
            const isTopSet = set.isTopSet;
            const isBackOff = set.isBackOff;
            const backoffIdx = exercise.sets.filter((s, idx) => s.isBackOff && idx <= si).length;
            const label = isTopSet ? 'TOP' : isBackOff ? `B${backoffIdx}` : si + 1;
            const prev = lastSession?.sets?.[si];
            // Esfuerzo: en básicos solo en el top set, en compuestos en todas, en iso nunca
            const showEffort = useEffort && !isBackOff;

            return (
              <SetRow
                key={si}
                set={set}
                si={si}
                label={label}
                useEffort={useEffort}
                showEffort={showEffort}
                started={started}
                isActive={si === activeSet}
                prev={prev}
                loadType={exDef.loadType}
                onUpdate={handleUpdateSet}
                onDone={() => handleSetDone(si)}
              />
            );
          })}

          {canAddSets && started && (
            <div className="set-actions">
              <button className="add-set-btn" onClick={onAddSet}>+ Serie</button>
              {exercise.sets.length > 1 && (
                <button className="remove-set-btn" onClick={onRemoveSet}>− Última</button>
              )}
            </div>
          )}
        </div>
      )}
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
  const [timerState, setTimerState] = useState({ seconds: null, key: 0, exIdx: null });
  const [expandedIdx, setExpandedIdx] = useState(0);
  const [deloadPrompt, setDeloadPrompt] = useState(null);
  const [resumePrompt, setResumePrompt] = useState(null);
  const [aiEnabled] = useState(() => localStorage.getItem('ai_suggestions_enabled') !== 'false');
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [summaryPrompt, setSummaryPrompt] = useState(null);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const RESUME_AUTO_MS = 30 * 60 * 1000;

  const doResume = useCallback((saved) => {
    setSession(saved.session);
    setExpandedIdx(saved.expandedIdx ?? 0);
    setStarted(true);
    const baseElapsed = saved.elapsed ?? 0;
    startTimeRef.current = Date.now() - baseElapsed * 1000;
    setElapsed(baseElapsed);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  // Detectar sesión a medias guardada en localStorage al montar
  useEffect(() => {
    if (existingSession) return;
    const saved = loadActiveSession();
    if (!saved || saved.dayIndex !== dayIndex) return;
    if (!saved.session?.exercises?.length) return;
    const lastInteraction = saved.lastInteractionAt ?? saved.savedAt ?? 0;
    if (Date.now() - lastInteraction < RESUME_AUTO_MS) {
      doResume(saved);
      return;
    }
    setResumePrompt(saved);
  }, [existingSession, dayIndex, doResume]);

  const resumeSession = () => {
    const saved = resumePrompt;
    setResumePrompt(null);
    if (!saved) return;
    doResume(saved);
  };

  const discardResume = () => {
    setResumePrompt(null);
    clearActiveSession();
  };

  // Refs siempre con el último valor, para guardar de forma síncrona desde
  // los updaters de setState y desde los handlers de visibilidad.
  const startedRef = useRef(false);
  const sessionRef = useRef(session);
  const elapsedRef = useRef(0);
  const expandedIdxRef = useRef(0);
  startedRef.current = started;
  sessionRef.current = session;
  elapsedRef.current = elapsed;
  expandedIdxRef.current = expandedIdx;

  const persistNow = useCallback((overrides = {}) => {
    if (!startedRef.current) return;
    saveActiveSession({
      dayIndex,
      session: sessionRef.current,
      elapsed: elapsedRef.current,
      expandedIdx: expandedIdxRef.current,
      lastInteractionAt: Date.now(),
      ...overrides,
    });
  }, [dayIndex]);

  // Persistir cuando la app se va al background — Android puede congelar el
  // WebView justo después y los effects pendientes nunca se ejecutarían.
  useEffect(() => {
    const flush = () => {
      if (!startedRef.current) return;
      saveActiveSession({
        dayIndex,
        session: sessionRef.current,
        elapsed: elapsedRef.current,
        expandedIdx: expandedIdxRef.current,
      });
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [dayIndex]);

  // Tick del cronómetro: refresca elapsed sin tocar lastInteractionAt.
  useEffect(() => {
    if (!started) return;
    saveActiveSession({ dayIndex, session, elapsed, expandedIdx });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  const deloadInfo = useMemo(() => {
    const lastSession = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (lastSession?.isDeload) return null;
    const basicEx = (day.exercises ?? []).find(e => e.scheme === 'topback');
    if (!basicEx) return null;
    const history = getExerciseHistory(sessions, basicEx.name);
    const result = detectDeload(history);
    return result.needed ? { reason: result.reason, exerciseName: basicEx.name } : null;
  }, [sessions, day]);

  const beginSession = (isDeload) => {
    if (isDeload) {
      setSession(prev => ({ ...prev, isDeload: true }));
    }
    setStarted(true);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    ensureNotificationPermission();
  };

  const handleStart = () => {
    if (deloadInfo && !existingSession) {
      setDeloadPrompt(deloadInfo);
      return;
    }
    beginSession(false);
  };

  const handleDeloadConfirm = () => {
    setDeloadPrompt(null);
    beginSession(true);
  };

  const handleDeloadDecline = () => {
    setDeloadPrompt(null);
    beginSession(false);
  };

  const updateSet = useCallback((exIdx, setIdx, field, value) => {
    setSession(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.exercises[exIdx].sets[setIdx][field] = value;
      sessionRef.current = copy;
      persistNow({ session: copy });
      return copy;
    });
  }, [persistNow]);

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

      sessionRef.current = copy;
      persistNow({ session: copy });
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
      sessionRef.current = copy;
      persistNow({ session: copy });
      return copy;
    });
  };

  const removeSet = (exIdx) => {
    setSession(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (copy.exercises[exIdx].sets.length > 1) {
        copy.exercises[exIdx].sets.pop();
      }
      sessionRef.current = copy;
      persistNow({ session: copy });
      return copy;
    });
  };

  const makeSetDoneHandler = (exIdx) => (isLast, restSec) => {
    if (isLast) {
      const nextIdx = session.exercises.findIndex((_, i) => i > exIdx);
      setTimerState(prev => ({ seconds: restSec, key: prev.key + 1, exIdx: nextIdx !== -1 ? nextIdx : null }));
      if (nextIdx !== -1) {
        expandedIdxRef.current = nextIdx;
        setExpandedIdx(nextIdx);
      }
    } else {
      setTimerState(prev => ({ seconds: restSec, key: prev.key + 1, exIdx }));
    }
    persistNow();
  };

  const handleTimerDone = () => setTimerState({ seconds: null, key: 0, exIdx: null });

  const handleSave = () => {
    const filtered = JSON.parse(JSON.stringify(session));
    filtered.exercises = filtered.exercises
      .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.kg !== '' && s.reps !== '') }))
      .filter(ex => ex.sets.length > 0);

    if (filtered.exercises.length === 0) {
      onSave(null, 'Añade al menos una serie con datos');
      return;
    }
    filtered.durationSeconds = started ? elapsed : null;

    // Calcular resumen
    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;
    const prs = [];
    for (const ex of filtered.exercises) {
      const history = getExerciseHistory(sessions, ex.name);
      let bestPrevWeight = 0;
      let bestPrevReps = 0;
      for (const past of history) {
        for (const s of past.sets ?? []) {
          const kg = parseFloat(s.kg);
          const reps = parseInt(s.reps);
          if (!isNaN(kg) && kg > bestPrevWeight) bestPrevWeight = kg;
          if (!isNaN(reps) && reps > bestPrevReps) bestPrevReps = reps;
        }
      }
      let bestNowWeight = 0;
      let bestNowReps = 0;
      for (const s of ex.sets) {
        const kg = parseFloat(s.kg);
        const reps = parseInt(s.reps);
        if (!isNaN(kg) && !isNaN(reps)) {
          totalVolume += kg * reps;
          totalSets += 1;
          totalReps += reps;
          if (kg > bestNowWeight) bestNowWeight = kg;
          if (reps > bestNowReps) bestNowReps = reps;
        }
      }
      if (history.length > 0) {
        if (bestNowWeight > bestPrevWeight) prs.push({ name: ex.name, type: 'weight', value: bestNowWeight });
        else if (bestNowReps > bestPrevReps && bestNowWeight >= bestPrevWeight) {
          prs.push({ name: ex.name, type: 'reps', value: bestNowReps });
        }
      }
    }

    setSummaryPrompt({
      filtered,
      durationSeconds: filtered.durationSeconds,
      totalVolume: Math.round(totalVolume),
      totalSets,
      totalReps,
      prs,
    });
  };

  const handleConfirmSave = () => {
    const data = summaryPrompt;
    if (!data) return;
    setSummaryPrompt(null);
    clearInterval(intervalRef.current);
    clearActiveSession();
    onSave(data.filtered);
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

      {started && session.isDeload && (
        <div className="deload-banner">
          🪶 Sesión de deload — 80% del peso, sin llegar al fallo. No afecta a tus próximas sesiones.
        </div>
      )}

      {!started && !resumePrompt && (
        <button className="start-session-btn" onClick={handleStart}>
          Iniciar entrenamiento
        </button>
      )}

      {resumePrompt && (
        <div className="deload-modal-overlay">
          <div className="deload-modal" onClick={e => e.stopPropagation()}>
            <div className="deload-modal-title">Sesión a medias</div>
            <div className="deload-modal-text">
              Tienes una sesión sin terminar de <strong>{day.name}</strong>. ¿Quieres retomarla o empezar de cero?
            </div>
            <div className="deload-modal-buttons">
              <button className="secondary-btn" onClick={discardResume}>Empezar de cero</button>
              <button className="primary-btn" onClick={resumeSession}>Retomar</button>
            </div>
          </div>
        </div>
      )}

      {deloadPrompt && (
        <div className="deload-modal-overlay" onClick={handleDeloadDecline}>
          <div className="deload-modal" onClick={e => e.stopPropagation()}>
            <div className="deload-modal-title">Deload recomendado</div>
            <div className="deload-modal-text">
              {deloadPrompt.reason} Te recomendamos hacer hoy una sesión más ligera (80% del peso, sin llegar al fallo).
            </div>
            <div className="deload-modal-text" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>
              No afectará a tus próximas sesiones — la app retomará tu peso anterior.
            </div>
            <div className="deload-modal-buttons">
              <button className="secondary-btn" onClick={handleDeloadDecline}>No, entreno normal</button>
              <button className="primary-btn" onClick={handleDeloadConfirm}>Sí, hacer deload</button>
            </div>
          </div>
        </div>
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
            started={started}
            isDeloadSession={!!session.isDeload}
            aiEnabled={aiEnabled}
            expanded={expandedIdx === i}
            isActive={timerState.exIdx === i || (timerState.exIdx === null && expandedIdx === i)}
            onToggle={() => setExpandedIdx(expandedIdx === i ? -1 : i)}
            timerSeconds={timerState.exIdx === i ? timerState.seconds : null}
            timerKey={timerState.exIdx === i ? timerState.key : 0}
            onSetDone={makeSetDoneHandler(i)}
            onTimerDone={handleTimerDone}
            onUpdateSet={makeUpdateSet(i)}
            onAddSet={() => addSet(i)}
            onRemoveSet={() => removeSet(i)}
          />
        );
      })}

      <button className="primary-btn" onClick={handleSave} style={{ marginTop: 16 }}>
        Guardar sesión
      </button>

      {started && (
        <button className="discard-session-btn" onClick={() => setDiscardPrompt(true)}>
          Descartar sesión
        </button>
      )}

      {discardPrompt && (
        <div className="deload-modal-overlay" onClick={() => setDiscardPrompt(false)}>
          <div className="deload-modal" onClick={e => e.stopPropagation()}>
            <div className="deload-modal-title">¿Descartar sesión?</div>
            <div className="deload-modal-text">
              Se perderán todos los datos de esta sesión. Esta acción no se puede deshacer.
            </div>
            <div className="deload-modal-buttons">
              <button className="secondary-btn" onClick={() => setDiscardPrompt(false)}>Cancelar</button>
              <button className="danger-btn" onClick={() => { clearActiveSession(); onBack(); }}>Descartar</button>
            </div>
          </div>
        </div>
      )}

      {summaryPrompt && (
        <div className="deload-modal-overlay">
          <div className="deload-modal session-summary" onClick={e => e.stopPropagation()}>
            <div className="summary-emoji">💪</div>
            <div className="deload-modal-title">¡Buen trabajo!</div>
            <div className="summary-stats">
              {summaryPrompt.durationSeconds !== null && (
                <div className="summary-stat">
                  <span className="summary-stat-label">Duración</span>
                  <span className="summary-stat-value">{fmtTime(summaryPrompt.durationSeconds)}</span>
                </div>
              )}
              <div className="summary-stat">
                <span className="summary-stat-label">Volumen</span>
                <span className="summary-stat-value">{summaryPrompt.totalVolume.toLocaleString('es-ES')} kg</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-label">Series</span>
                <span className="summary-stat-value">{summaryPrompt.totalSets}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat-label">Reps totales</span>
                <span className="summary-stat-value">{summaryPrompt.totalReps}</span>
              </div>
            </div>
            {summaryPrompt.prs.length > 0 && (
              <div className="summary-prs">
                <div className="summary-prs-title">🏆 Récords nuevos</div>
                {summaryPrompt.prs.map((pr, i) => (
                  <div key={i} className="summary-pr">
                    <span className="summary-pr-name">{pr.name}</span>
                    <span className="summary-pr-value">
                      {pr.type === 'weight' ? `${pr.value} kg` : `${pr.value} reps`}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="deload-modal-buttons">
              <button className="primary-btn" onClick={handleConfirmSave}>Guardar sesión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
