import { useState } from 'react';
import { saveRoutine, deleteRoutine, setActiveRoutine } from '../lib/storage';
import { WORKOUTS } from '../lib/workouts';
import { searchExercises } from '../lib/exercise-library';

const LOAD_TYPES = [
  { value: 'bar', label: 'Barra' },
  { value: 'dumbbell', label: 'Mancuernas' },
  { value: 'machine', label: 'Máquina' }
];

const EXERCISE_TYPES = [
  { value: 'basic', label: 'Básico' },
  { value: 'compound', label: 'Compuesto' },
  { value: 'iso', label: 'Aislamiento' }
];

const TYPE_LABEL = { basic: 'Básico', compound: 'Compuesto', iso: 'Aislamiento' };
const LOAD_LABEL = { bar: 'Barra', dumbbell: 'Mancuernas', machine: 'Máquina' };

function buildDefaultRoutine() {
  return {
    name: 'Mi rutina',
    days: Object.values(WORKOUTS).map(w => ({
      name: w.name,
      focus: w.focus,
      exercises: w.exercises.map(ex => ({
        name: ex.name,
        type: ex.type,
        loadType: ex.loadType ?? 'bar',
        sets: ex.sets ?? 3,
        reps: ex.reps ?? [8, 10],
        scheme: ex.scheme ?? null,
        topReps: ex.topReps ?? null,
        backReps: ex.backReps ?? null,
        backSets: ex.backSets ?? null
      }))
    }))
  };
}

function emptyRoutine() {
  return { name: '', days: [emptyDay()] };
}

function emptyDay() {
  return { name: '', focus: '', exercises: [emptyExercise()] };
}

function emptyExercise() {
  return { name: '', type: 'compound', loadType: 'bar', sets: 3, reps: [8, 10], scheme: null };
}

// ─── EXERCISE PICKER MODAL ───────────────────────────────────────────────

function ExercisePicker({ onSelect, onCancel }) {
  const [query, setQuery] = useState('');
  const results = searchExercises(query);

  const sections = [
    { key: 'basic', label: 'Básico' },
    { key: 'compound', label: 'Compuesto' },
    { key: 'iso', label: 'Aislamiento' }
  ];

  return (
    <div className="picker-overlay" onClick={onCancel}>
      <div className="picker-sheet" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <input
            className="picker-search"
            placeholder="Buscar ejercicio..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <button className="picker-cancel" onClick={onCancel}>Cancelar</button>
        </div>
        <div className="picker-list">
          {sections.map(section => {
            const items = results.filter(e => e.type === section.key);
            if (items.length === 0) return null;
            return (
              <div key={section.key}>
                <div className="picker-section-label">{section.label}</div>
                {items.map(ex => (
                  <button key={ex.name} className="picker-item" onClick={() => onSelect(ex)}>
                    <span className="picker-item-name">{ex.name}</span>
                    <span className="picker-item-meta">{LOAD_LABEL[ex.loadType]}</span>
                  </button>
                ))}
              </div>
            );
          })}
          <button className="picker-custom-btn" onClick={() => onSelect(null)}>
            + Nombre personalizado
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EXERCISE EDITOR ─────────────────────────────────────────────────────

function ExerciseEditor({ ex, onChange, onRemove }) {
  const [showPicker, setShowPicker] = useState(false);
  const isBasic = ex.type === 'basic';

  const handlePickerSelect = (libraryEx) => {
    setShowPicker(false);
    if (!libraryEx) return; // personalizado: solo cierra picker, deja nombre vacío para escribir
    onChange({
      ...ex,
      name: libraryEx.name,
      type: libraryEx.type,
      loadType: libraryEx.loadType,
      scheme: libraryEx.scheme ?? null,
      sets: libraryEx.sets ?? 3,
      reps: libraryEx.reps ?? [8, 10],
      topReps: libraryEx.topReps ?? null,
      backReps: libraryEx.backReps ?? null,
      backSets: libraryEx.backSets ?? null,
    });
  };

  return (
    <div className="routine-exercise-row">
      {showPicker && (
        <ExercisePicker
          onSelect={handlePickerSelect}
          onCancel={() => setShowPicker(false)}
        />
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <button
          className="remove-set-btn"
          style={{ width: 32, flexShrink: 0, fontSize: 15 }}
          title="Elegir de la biblioteca"
          onClick={() => setShowPicker(true)}
        >≡</button>
        <input
          className="setting-input"
          style={{ flex: 1, width: 'auto', textAlign: 'left', padding: '8px 10px' }}
          placeholder="Nombre del ejercicio"
          value={ex.name}
          onChange={e => onChange({ ...ex, name: e.target.value })}
          onFocus={() => { if (!ex.name) setShowPicker(true); }}
        />
        <button className="remove-set-btn" style={{ width: 32, flexShrink: 0 }} onClick={onRemove}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <div>
          <div className="routine-field-label">Tipo</div>
          <select
            className="setting-select"
            style={{ width: '100%', fontSize: 12 }}
            value={ex.type}
            onChange={e => onChange({ ...ex, type: e.target.value, scheme: e.target.value === 'basic' ? 'topback' : null })}
          >
            {EXERCISE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <div className="routine-field-label">Carga</div>
          <select
            className="setting-select"
            style={{ width: '100%', fontSize: 12 }}
            value={ex.loadType}
            onChange={e => onChange({ ...ex, loadType: e.target.value })}
          >
            {LOAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <div className="routine-field-label">Series</div>
          <input
            type="number"
            className="setting-input"
            style={{ width: '100%' }}
            value={isBasic ? (ex.backSets ?? 3) : (ex.sets ?? 3)}
            min={1}
            onChange={e => {
              const v = parseInt(e.target.value) || 1;
              onChange(isBasic ? { ...ex, backSets: v } : { ...ex, sets: v });
            }}
          />
        </div>
      </div>

      {isBasic ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
          <div>
            <div className="routine-field-label">Top set reps (ej: 4-6)</div>
            <input
              className="setting-input"
              style={{ width: '100%', textAlign: 'left', padding: '7px 8px' }}
              value={ex.topReps ? ex.topReps.join('-') : '4-6'}
              placeholder="4-6"
              onChange={e => {
                const parts = e.target.value.split('-').map(Number).filter(n => !isNaN(n));
                if (parts.length === 2) onChange({ ...ex, topReps: parts });
              }}
            />
          </div>
          <div>
            <div className="routine-field-label">Back off reps (ej: 6-8)</div>
            <input
              className="setting-input"
              style={{ width: '100%', textAlign: 'left', padding: '7px 8px' }}
              value={ex.backReps ? ex.backReps.join('-') : '6-8'}
              placeholder="6-8"
              onChange={e => {
                const parts = e.target.value.split('-').map(Number).filter(n => !isNaN(n));
                if (parts.length === 2) onChange({ ...ex, backReps: parts });
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 6 }}>
          <div className="routine-field-label">Reps (ej: 8-10)</div>
          <input
            className="setting-input"
            style={{ width: '100%', textAlign: 'left', padding: '7px 8px' }}
            value={ex.reps ? ex.reps.join('-') : '8-10'}
            placeholder="8-10"
            onChange={e => {
              const parts = e.target.value.split('-').map(Number).filter(n => !isNaN(n));
              if (parts.length === 2) onChange({ ...ex, reps: parts });
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── DAY EDITOR ──────────────────────────────────────────────────────────

function DayEditor({ day, dayIndex, onChange, onRemove, canRemove }) {
  const updateExercise = (i, ex) => {
    const exercises = [...day.exercises];
    exercises[i] = ex;
    onChange({ ...day, exercises });
  };

  const addExercise = () => onChange({ ...day, exercises: [...day.exercises, emptyExercise()] });

  const removeExercise = (i) => {
    const exercises = day.exercises.filter((_, idx) => idx !== i);
    onChange({ ...day, exercises: exercises.length > 0 ? exercises : [emptyExercise()] });
  };

  return (
    <div className="routine-day-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="routine-day-num">{dayIndex + 1}</span>
        <input
          className="setting-input"
          style={{ flex: 1, width: 'auto', textAlign: 'left', padding: '8px 10px', fontWeight: 700 }}
          placeholder="Nombre del día (ej: Push)"
          value={day.name}
          onChange={e => onChange({ ...day, name: e.target.value })}
        />
        {canRemove && (
          <button className="remove-set-btn" style={{ width: 32, flexShrink: 0 }} onClick={onRemove}>×</button>
        )}
      </div>
      <input
        className="setting-input"
        style={{ width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 10, fontSize: 12 }}
        placeholder="Grupos musculares (ej: Pecho · Hombro · Tríceps)"
        value={day.focus}
        onChange={e => onChange({ ...day, focus: e.target.value })}
      />

      {day.exercises.map((ex, i) => (
        <ExerciseEditor
          key={i}
          ex={ex}
          onChange={ex => updateExercise(i, ex)}
          onRemove={() => removeExercise(i)}
        />
      ))}

      <button className="add-set-btn" style={{ marginTop: 6 }} onClick={addExercise}>
        + Ejercicio
      </button>
    </div>
  );
}

// ─── ROUTINE EDITOR ──────────────────────────────────────────────────────

function RoutineEditor({ routine, onSave, onCancel, saving }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(routine)));

  const updateDay = (i, day) => {
    const days = [...draft.days];
    days[i] = day;
    setDraft({ ...draft, days });
  };

  const addDay = () => setDraft({ ...draft, days: [...draft.days, emptyDay()] });

  const removeDay = (i) => {
    const days = draft.days.filter((_, idx) => idx !== i);
    setDraft({ ...draft, days: days.length > 0 ? days : [emptyDay()] });
  };

  const isValid = draft.name.trim() && draft.days.every(d => d.name.trim());

  return (
    <div className="page">
      <div className="session-header">
        <button className="back-btn" onClick={onCancel}>← Atrás</button>
        <div className="session-title">{routine.id ? 'Editar rutina' : 'Nueva rutina'}</div>
      </div>

      <div className="section-label">Nombre de la rutina</div>
      <input
        className="setting-input"
        style={{ width: '100%', textAlign: 'left', padding: '12px 14px', fontSize: 15, marginBottom: 20 }}
        placeholder="Ej: PPL Volumen 2026"
        value={draft.name}
        onChange={e => setDraft({ ...draft, name: e.target.value })}
      />

      <div className="section-label">Días</div>
      {draft.days.map((day, i) => (
        <DayEditor
          key={i}
          day={day}
          dayIndex={i}
          onChange={day => updateDay(i, day)}
          onRemove={() => removeDay(i)}
          canRemove={draft.days.length > 1}
        />
      ))}

      <button className="secondary-btn" style={{ marginTop: 4 }} onClick={addDay}>
        + Día
      </button>

      <button
        className="primary-btn"
        style={{ marginTop: 16 }}
        onClick={() => onSave(draft)}
        disabled={!isValid || saving}
      >
        {saving ? 'Guardando…' : 'Guardar rutina'}
      </button>
    </div>
  );
}

// ─── ROUTINES LIST ────────────────────────────────────────────────────────

export function RoutinesView({ routines, activeRoutineId, onRoutinesChange, showToast }) {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (draft) => {
    setSaving(true);
    try {
      await saveRoutine(draft);
      await onRoutinesChange();
      showToast('Rutina guardada ✓');
      setEditing(null);
    } catch (err) {
      showToast('Error: ' + err.message);
    }
    setSaving(false);
  };

  const handleActivate = async (id) => {
    try {
      await setActiveRoutine(id);
      await onRoutinesChange();
      showToast('Rutina activa cambiada ✓');
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta rutina? No se puede deshacer.')) return;
    try {
      await deleteRoutine(id);
      await onRoutinesChange();
      showToast('Rutina eliminada');
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  };

  const handleNewFromTemplate = () => setEditing(buildDefaultRoutine());
  const handleNewBlank = () => setEditing(emptyRoutine());

  const handleUseExample = async () => {
    setSaving(true);
    try {
      const routine = buildDefaultRoutine();
      routine.name = 'Rutina ejemplo PPL';
      const id = await saveRoutine(routine);
      await setActiveRoutine(id);
      await onRoutinesChange();
      showToast('Rutina de ejemplo creada y activada ✓');
    } catch (err) {
      showToast('Error: ' + err.message);
    }
    setSaving(false);
  };

  if (editing !== null) {
    return (
      <RoutineEditor
        routine={editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
        saving={saving}
      />
    );
  }

  return (
    <div className="page">
      <div className="section-label">Mis rutinas</div>

      {routines.length === 0 && (
        <div className="empty-state" style={{ marginBottom: 24 }}>
          <div className="empty-state-text">No tienes rutinas todavía.</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8, marginBottom: 16 }}>
            Puedes empezar con la rutina de ejemplo Push/Pull/Piernas o crear la tuya desde cero.
          </div>
          <button className="primary-btn" style={{ marginTop: 0 }} onClick={handleUseExample} disabled={saving}>
            Usar rutina de ejemplo
          </button>
        </div>
      )}

      {routines.map(r => (
        <div key={r.id} className={`routine-card ${r.id === activeRoutineId ? 'active' : ''}`}>
          <div className="routine-card-top">
            <div>
              <div className="routine-card-name">{r.name}</div>
              <div className="routine-card-days">{r.days.length} días · {r.days.map(d => d.name).join(' · ')}</div>
            </div>
            {r.id === activeRoutineId && (
              <span className="routine-active-badge">ACTIVA</span>
            )}
          </div>
          <div className="routine-card-actions">
            {r.id !== activeRoutineId && (
              <button className="secondary-btn" style={{ marginBottom: 0, flex: 1 }} onClick={() => handleActivate(r.id)}>
                Usar esta
              </button>
            )}
            <button className="secondary-btn" style={{ marginBottom: 0, flex: 1 }} onClick={() => setEditing({ ...r })}>
              Editar
            </button>
            <button className="secondary-btn danger-btn" style={{ marginBottom: 0, width: 40, flex: 'none', padding: '10px 0' }} onClick={() => handleDelete(r.id)}>
              ×
            </button>
          </div>
        </div>
      ))}

      <div className="section-label" style={{ marginTop: 24 }}>Crear rutina</div>
      <button className="secondary-btn" onClick={handleNewFromTemplate}>
        Crear desde plantilla PPL (editable)
      </button>
      <button className="secondary-btn" onClick={handleNewBlank}>
        Crear en blanco
      </button>
    </div>
  );
}
