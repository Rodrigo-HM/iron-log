/**
 * ═══════════════════════════════════════════════════════════════════════════
 *   STORAGE LAYER - IndexedDB para persistencia robusta
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Por qué IndexedDB en vez de localStorage:
 *   - Mucha más capacidad (50MB+ vs 5MB)
 *   - Asíncrono, no bloquea la UI
 *   - Estructura de objetos nativa (sin JSON.stringify/parse manual)
 *   - Mejor para datos que crecerán (cientos/miles de sesiones)
 *
 * Schema:
 *   - sessions: { id (auto), date, workoutId, exercises: [...] }
 *   - settings: { key, value }
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { openDB } from 'idb';

const DB_NAME = 'iron-log';
const DB_VERSION = 1;

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-date', 'date');
          store.createIndex('by-workout', 'workoutId');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      }
    });
  }
  return dbPromise;
}

// ───────────────────────────────────────────────────────────────────────────
//   SESSIONS
// ───────────────────────────────────────────────────────────────────────────

export async function getAllSessions() {
  const db = await getDb();
  return db.getAll('sessions');
}

export async function saveSession(session) {
  const db = await getDb();
  // Si ya existe sesión para misma fecha + workoutId, la reemplazamos
  const existing = await getSession(session.date, session.workoutId);
  if (existing) {
    return db.put('sessions', { ...session, id: existing.id });
  }
  return db.add('sessions', session);
}

export async function getSession(date, workoutId) {
  const all = await getAllSessions();
  return all.find(s => s.date === date && s.workoutId === workoutId);
}

export async function deleteSession(id) {
  const db = await getDb();
  return db.delete('sessions', id);
}

export async function bulkAddSessions(sessions) {
  const db = await getDb();
  const tx = db.transaction('sessions', 'readwrite');
  let added = 0;
  for (const sess of sessions) {
    // Saltar si ya existe (misma fecha + workoutId)
    const all = await tx.store.getAll();
    const exists = all.some(s => s.date === sess.date && s.workoutId === sess.workoutId);
    if (!exists) {
      await tx.store.add(sess);
      added++;
    }
  }
  await tx.done;
  return added;
}

export async function clearAllSessions() {
  const db = await getDb();
  return db.clear('sessions');
}

// ───────────────────────────────────────────────────────────────────────────
//   SETTINGS
// ───────────────────────────────────────────────────────────────────────────

export async function getSetting(key, defaultValue = null) {
  const db = await getDb();
  const result = await db.get('settings', key);
  return result ? result.value : defaultValue;
}

export async function setSetting(key, value) {
  const db = await getDb();
  return db.put('settings', { key, value });
}

// ───────────────────────────────────────────────────────────────────────────
//   EXPORT / IMPORT
// ───────────────────────────────────────────────────────────────────────────

export async function exportAllData() {
  const db = await getDb();
  const sessions = await db.getAll('sessions');
  const settingsRaw = await db.getAll('settings');
  const settings = Object.fromEntries(settingsRaw.map(s => [s.key, s.value]));
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions,
    settings
  };
}

export async function importAllData(data) {
  if (!data.sessions) throw new Error('Formato inválido: falta "sessions"');
  const db = await getDb();
  await db.clear('sessions');
  await db.clear('settings');
  for (const sess of data.sessions) {
    delete sess.id; // dejar que IDB asigne nuevo
    await db.add('sessions', sess);
  }
  if (data.settings) {
    for (const [key, value] of Object.entries(data.settings)) {
      await db.put('settings', { key, value });
    }
  }
}
