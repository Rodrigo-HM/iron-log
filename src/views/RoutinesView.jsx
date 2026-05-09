import { useState, useCallback, useRef } from 'react';
import { useDragInput } from '../lib/useDragInput';
import { saveRoutine, deleteRoutine, setActiveRoutine } from '../lib/storage';
import { WORKOUTS } from '../lib/workouts';
import { searchExercises, EXERCISE_LIBRARY } from '../lib/exercise-library';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const REPS_SEQUENCE = [
  [1,3],[2,4],[3,5],[4,6],[6,8],[8,10],[10,12],[12,15],[15,20]
];

function findRepsIndex(value) {
  if (!value) return 4;
  const idx = REPS_SEQUENCE.findIndex(r => r[0] === value[0] && r[1] === value[1]);
  return idx >= 0 ? idx : 4;
}

function RepsRangeInput({ value, onChange, placeholder }) {
  const touchStartY = useRef(null);
  const startIdx = useRef(null);
  const isDragging = useRef(false);

  const currentIdx = findRepsIndex(value);
  const displayValue = value ? value.join('-') : placeholder;

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    startIdx.current = currentIdx;
    isDragging.current = false;
  }, [currentIdx]);

  const onTouchMove = useCallback((e) => {
    if (touchStartY.current === null) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    if (!isDragging.current && Math.abs(dy) >= 5) isDragging.current = true;
    if (!isDragging.current) return;
    e.preventDefault();
    const steps = Math.round(dy / 20);
    const newIdx = Math.max(0, Math.min(REPS_SEQUENCE.length - 1, startIdx.current + steps));
    onChange(REPS_SEQUENCE[newIdx]);
  }, [onChange]);

  const onTouchEnd = useCallback((e) => {
    if (isDragging.current) e.preventDefault();
    touchStartY.current = null;
    isDragging.current = false;
  }, []);

  return (
    <input
      className="setting-input"
      style={{ width: '100%', textAlign: 'left', padding: '7px 8px', touchAction: 'none' }}
      value={displayValue}
      placeholder={placeholder}
      onChange={e => {
        const parts = e.target.value.split('-').map(Number).filter(n => !isNaN(n));
        if (parts.length === 2) onChange(parts);
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  );
}

function DragNumberInput({ value, onChange, step = 1, min = 0 }) {
  const handleChange = useCallback((v) => onChange(parseFloat(v) || min), [onChange, min]);
  const drag = useDragInput({ value: String(value), onChange: handleChange, step, min });
  return (
    <input
      type="number"
      className="setting-input"
      style={{ width: '100%', touchAction: 'none' }}
      value={value}
      min={min}
      onChange={e => onChange(parseFloat(e.target.value) || min)}
      {...drag}
    />
  );
}

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

const LIBRARY_MAP = Object.fromEntries(EXERCISE_LIBRARY.map(e => [e.name, e]));

function inferFocus(exercises) {
  const primary = new Set();
  const secondary = new Set();
  for (const ex of exercises) {
    if (!ex.name) continue;
    const def = LIBRARY_MAP[ex.name];
    if (def?.muscle) primary.add(def.muscle);
    if (def?.muscles) def.muscles.forEach(m => secondary.add(m));
  }
  // Secundarios solo si no son ya primarios
  const extra = [...secondary].filter(m => !primary.has(m));
  const all = [...primary, ...extra];
  return all.join(' · ');
}

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
          {results.length === 0 && query.trim() && (
            <button className="picker-custom-btn" onClick={() => onSelect({ custom: true, name: query.trim() })}>
              + Añadir «{query.trim()}»
            </button>
          )}
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
    if (!libraryEx) return;
    onChange({
      ...ex,
      name: libraryEx.name,
      type: libraryEx.custom ? 'compound' : libraryEx.type,
      loadType: libraryEx.custom ? 'bar' : libraryEx.loadType,
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
          style={{ width: 32, height: 32, flexShrink: 0, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, marginTop: 0 }}
          title="Elegir de la biblioteca"
          onClick={() => setShowPicker(true)}
        >▾</button>
        <input
          className="setting-input"
          style={{ flex: 1, width: 'auto', textAlign: 'left', padding: '8px 10px' }}
          placeholder="Nombre del ejercicio"
          value={ex.name}
          onChange={e => onChange({ ...ex, name: e.target.value })}
          onFocus={() => { if (!ex.name) setShowPicker(true); }}
        />
        <button className="remove-set-btn" style={{ width: 32, height: 32, flexShrink: 0, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, marginTop: 0 }} onClick={onRemove}>×</button>
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
          <DragNumberInput
            value={isBasic ? (ex.backSets ?? 3) : (ex.sets ?? 3)}
            min={1}
            onChange={v => {
              const n = parseInt(v) || 1;
              onChange(isBasic ? { ...ex, backSets: n } : { ...ex, sets: n });
            }}
          />
        </div>
      </div>

      {isBasic && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: 'var(--text-dim)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={ex.scheme === 'topback'}
            onChange={e => onChange({ ...ex, scheme: e.target.checked ? 'topback' : null, sets: ex.sets ?? 3, reps: ex.reps ?? [4, 6] })}
          />
          Top set + back offs
        </label>
      )}

      {isBasic && ex.scheme === 'topback' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
            <div>
              <div className="routine-field-label">Top set reps</div>
              <RepsRangeInput
                value={ex.topReps ?? [4, 6]}
                placeholder="4-6"
                onChange={v => onChange({ ...ex, topReps: v })}
              />
            </div>
            <div>
              <div className="routine-field-label">Back off reps</div>
              <RepsRangeInput
                value={ex.backReps ?? [6, 8]}
                placeholder="6-8"
                onChange={v => onChange({ ...ex, backReps: v })}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
            <div>
              <div className="routine-field-label">Descanso top→back (seg)</div>
              <DragNumberInput
                value={ex.restTopToBackoff ?? 240}
                min={30}
                step={15}
                onChange={v => onChange({ ...ex, restTopToBackoff: parseInt(v) || 240 })}
              />
            </div>
            <div>
              <div className="routine-field-label">Descanso entre series (seg)</div>
              <DragNumberInput
                value={ex.restBetweenSets ?? 150}
                min={30}
                step={15}
                onChange={v => onChange({ ...ex, restBetweenSets: parseInt(v) || 150 })}
              />
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
          <div>
            <div className="routine-field-label">Reps</div>
            <RepsRangeInput
              value={ex.reps ?? [8, 10]}
              placeholder="8-10"
              onChange={v => onChange({ ...ex, reps: v })}
            />
          </div>
          <div>
            <div className="routine-field-label">Descanso (seg)</div>
            <DragNumberInput
              value={ex.restBetweenSets ?? (ex.type === 'iso' ? 120 : 150)}
              min={30}
              step={15}
              onChange={v => onChange({ ...ex, restBetweenSets: parseInt(v) || 120 })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SORTABLE EXERCISE ────────────────────────────────────────────────────

function SortableExercise({ id, ex, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
      <button
        className="drag-handle"
        {...attributes}
        {...listeners}
      >☰</button>
      <div style={{ flex: 1 }}>
        <ExerciseEditor ex={ex} onChange={onChange} onRemove={onRemove} />
      </div>
    </div>
  );
}

// ─── DAY EDITOR ──────────────────────────────────────────────────────────

function DayEditor({ day, dayIndex, onChange, onRemove, canRemove }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const updateDay = (newDay) => {
    onChange({ ...newDay, focus: inferFocus(newDay.exercises) });
  };

  const updateExercise = (i, ex) => {
    const exercises = [...day.exercises];
    exercises[i] = ex;
    updateDay({ ...day, exercises });
  };

  const addExercise = () => updateDay({ ...day, exercises: [...day.exercises, emptyExercise()] });

  const removeExercise = (i) => {
    const exercises = day.exercises.filter((_, idx) => idx !== i);
    updateDay({ ...day, exercises: exercises.length > 0 ? exercises : [emptyExercise()] });
  };

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = day.exercises.findIndex((_, i) => `ex-${i}` === active.id);
    const newIdx = day.exercises.findIndex((_, i) => `ex-${i}` === over.id);
    updateDay({ ...day, exercises: arrayMove(day.exercises, oldIdx, newIdx) });
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
          <button className="remove-set-btn" style={{ width: 32, height: 32, flexShrink: 0, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, marginTop: 0 }} onClick={onRemove}>×</button>
        )}
      </div>
      {day.focus ? (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10, paddingLeft: 2 }}>
          {day.focus}
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={day.exercises.map((_, i) => `ex-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          {day.exercises.map((ex, i) => (
            <SortableExercise
              key={`ex-${i}`}
              id={`ex-${i}`}
              ex={ex}
              onChange={ex => updateExercise(i, ex)}
              onRemove={() => removeExercise(i)}
            />
          ))}
        </SortableContext>
      </DndContext>

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
      setEditing(null);
      showToast('Rutina guardada ✓');
      onRoutinesChange();
    } catch (err) {
      showToast('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
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
