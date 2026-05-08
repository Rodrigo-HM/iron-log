import { supabase } from './supabase';

// ───────────────────────────────────────────────────────────────────────────
//   SESSIONS
// ───────────────────────────────────────────────────────────────────────────

export async function getAllSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    date: row.date,
    workoutId: row.workout_id,
    exercises: row.exercises,
    durationSeconds: row.duration_seconds ?? null,
    isDeload: row.is_deload ?? false
  }));
}

export async function saveSession(session) {
  const { data: { user } } = await supabase.auth.getUser();

  const existing = await getSession(session.date, session.workoutId);

  if (existing) {
    const { error } = await supabase
      .from('sessions')
      .update({
        exercises: session.exercises,
        duration_seconds: session.durationSeconds ?? null,
        is_deload: session.isDeload ?? false
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        workout_id: session.workoutId,
        date: session.date,
        exercises: session.exercises,
        duration_seconds: session.durationSeconds ?? null,
        is_deload: session.isDeload ?? false
      });
    if (error) throw error;
  }
}

export async function getSession(date, workoutId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('date', date)
    .eq('workout_id', workoutId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    date: data.date,
    workoutId: data.workout_id,
    exercises: data.exercises,
    durationSeconds: data.duration_seconds ?? null,
    isDeload: data.is_deload ?? false
  };
}

export async function deleteSession(id) {
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkAddSessions(sessions) {
  const { data: { user } } = await supabase.auth.getUser();
  let added = 0;
  for (const sess of sessions) {
    // Evitar duplicados: misma fecha + mismo workoutId (puede ser null)
    let query = supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', sess.date);
    query = sess.workoutId === null || sess.workoutId === undefined
      ? query.is('workout_id', null)
      : query.eq('workout_id', sess.workoutId);
    const { data: existing } = await query.maybeSingle();
    if (!existing) {
      const { error } = await supabase.from('sessions').insert({
        user_id: user.id,
        workout_id: sess.workoutId ?? null,
        date: sess.date,
        exercises: sess.exercises
      });
      if (!error) added++;
    }
  }
  return added;
}

export async function clearAllSessions() {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('sessions').delete().eq('user_id', user.id);
  if (error) throw error;
}

// ───────────────────────────────────────────────────────────────────────────
//   SETTINGS
// ───────────────────────────────────────────────────────────────────────────

export async function getSetting(key, defaultValue = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('settings')
    .select(key)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data || data[key] === null || data[key] === undefined) return defaultValue;
  return data[key];
}

export async function setSetting(key, value) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, [key]: value }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ───────────────────────────────────────────────────────────────────────────
//   ROUTINES
// ───────────────────────────────────────────────────────────────────────────

export async function getAllRoutines() {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    name: row.name,
    days: row.days,
    isActive: row.is_active
  }));
}

export async function saveRoutine(routine) {
  const { data: { user } } = await supabase.auth.getUser();
  if (routine.id) {
    const { error } = await supabase
      .from('routines')
      .update({ name: routine.name, days: routine.days })
      .eq('id', routine.id);
    if (error) throw error;
    return routine.id;
  } else {
    const { data, error } = await supabase
      .from('routines')
      .insert({ user_id: user.id, name: routine.name, days: routine.days, is_active: false })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }
}

export async function deleteRoutine(id) {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function setActiveRoutine(id) {
  const { data: { user } } = await supabase.auth.getUser();
  // Desactivar todas
  await supabase.from('routines').update({ is_active: false }).eq('user_id', user.id);
  // Activar la elegida
  const { error } = await supabase.from('routines').update({ is_active: true }).eq('id', id);
  if (error) throw error;
}

// ───────────────────────────────────────────────────────────────────────────
//   EXPORT / IMPORT
// ───────────────────────────────────────────────────────────────────────────

export async function exportAllData() {
  const sessions = await getAllSessions();
  const routines = await getAllRoutines();
  const bodyWeight = await getSetting('body_weight', 87);
  const height = await getSetting('height', 0);
  const phase = await getSetting('phase', 'bulk');
  const cutStart = await getSetting('cut_start', '2026-05-15');
  const weeklyGoal = await getSetting('weekly_goal', 4);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    sessions,
    routines,
    settings: { bodyWeight, height, phase, cutStart, weeklyGoal }
  };
}

export async function importAllData(data) {
  if (!data.sessions) throw new Error('Formato inválido: falta "sessions"');
  const { data: { user } } = await supabase.auth.getUser();

  if (Array.isArray(data.routines) && data.routines.length > 0) {
    await supabase.from('routines').delete().eq('user_id', user.id);
    const rows = data.routines.map(r => ({
      user_id: user.id,
      name: r.name,
      days: r.days,
      is_active: !!r.isActive
    }));
    const { error } = await supabase.from('routines').insert(rows);
    if (error) throw error;
  }

  await clearAllSessions();
  await bulkAddSessions(data.sessions);
  if (data.settings) {
    const s = data.settings;
    if (s.bodyWeight !== undefined) await setSetting('body_weight', s.bodyWeight);
    if (s.height !== undefined) await setSetting('height', s.height);
    if (s.phase !== undefined) await setSetting('phase', s.phase);
    if (s.cutStart !== undefined) await setSetting('cut_start', s.cutStart);
    if (s.weeklyGoal !== undefined) await setSetting('weekly_goal', s.weeklyGoal);
  }
}
