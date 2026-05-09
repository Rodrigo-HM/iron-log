import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { Toast, useToast } from './components/Toast';
import { HomeView } from './views/HomeView';
import { SessionView } from './views/SessionView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { RoutinesView } from './views/RoutinesView';
import { LoginView } from './views/LoginView';
import { SpotifyMiniPlayer } from './components/SpotifyMiniPlayer';
import { handleAuthCallback } from './lib/spotify';
import { supabase } from './lib/supabase';
import {
  getAllSessions,
  saveSession as saveSessionToDb,
  getSetting,
  setSetting,
  getAllRoutines,
  saveAppCache,
  loadAppCache
} from './lib/storage';
import { getNextWorkoutDayIndex } from './lib/workouts';
import './styles/styles.css';

const DEFAULT_SETTINGS = {
  bodyWeight: 87,
  height: 0,
  phase: 'bulk',
  cutStart: '2026-05-15',
  weeklyGoal: 4
};

export default function App() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState(() => localStorage.getItem('iron_log_tab') ?? 'home');
  const [sessionDayIndex, setSessionDayIndex] = useState(() => {
    const v = localStorage.getItem('iron_log_session_day');
    return v !== null ? Number(v) : null;
  });
  const cache = loadAppCache();
  const [sessions, setSessions] = useState(cache?.sessions ?? []);
  const [settings, setSettings] = useState(cache?.settings ?? DEFAULT_SETTINGS);
  const [routines, setRoutines] = useState(cache?.routines ?? []);
  const [activeRoutine, setActiveRoutine] = useState(cache?.routines?.find(r => r.isActive) ?? null);
  const [loading, setLoading] = useState(!cache);
  const sessionsRef = useRef(sessions);
  const settingsRef = useRef(settings);
  const routinesRef = useRef(routines);
  sessionsRef.current = sessions;
  settingsRef.current = settings;
  routinesRef.current = routines;
  const [spotifyEnabled, setSpotifyEnabledState] = useState(
    localStorage.getItem('spotify_enabled') !== 'false'
  );
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const sync = () => setSpotifyEnabledState(localStorage.getItem('spotify_enabled') !== 'false');
    window.addEventListener('spotify-settings-change', sync);
    return () => window.removeEventListener('spotify-settings-change', sync);
  }, []);

  useEffect(() => {
    handleAuthCallback();
    let resolved = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolved = true;
      setUser(session?.user ?? null);
    }).catch(() => {
      resolved = true;
      setUser(null);
    });
    const timeout = setTimeout(() => {
      if (!resolved) setUser(null);
    }, 5000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolved = true;
      setUser(session?.user ?? null);
    });
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const refreshRoutines = useCallback(async () => {
    const all = await getAllRoutines();
    setRoutines(all);
    const active = all.find(r => r.isActive) ?? null;
    setActiveRoutine(active);
    saveAppCache({ sessions: sessionsRef.current, settings: settingsRef.current, routines: all });
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    const safety = setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);
    (async () => {
      if (!loadAppCache()) setLoading(true);
      try {
        const [allSessions, allRoutines] = await Promise.all([
          getAllSessions(),
          getAllRoutines()
        ]);
        if (cancelled) return;
        setSessions(allSessions);
        const active = allRoutines.find(r => r.isActive) ?? null;
        setRoutines(allRoutines);
        setActiveRoutine(active);
        const bodyWeight  = await getSetting('body_weight', DEFAULT_SETTINGS.bodyWeight);
        const height      = await getSetting('height', DEFAULT_SETTINGS.height);
        const phase       = await getSetting('phase', DEFAULT_SETTINGS.phase);
        const cutStart    = await getSetting('cut_start', DEFAULT_SETTINGS.cutStart);
        const weeklyGoal  = await getSetting('weekly_goal', DEFAULT_SETTINGS.weeklyGoal);
        if (cancelled) return;
        const newSettings = { bodyWeight, height, phase, cutStart, weeklyGoal };
        setSettings(newSettings);
        saveAppCache({ sessions: allSessions, routines: allRoutines, settings: newSettings });
      } catch (err) {
        console.error('Error loading data:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; clearTimeout(safety); };
  }, [user, refreshRoutines]);

  const refreshSessions = useCallback(async () => {
    const allSessions = await getAllSessions();
    setSessions(allSessions);
    saveAppCache({ sessions: allSessions, routines: routinesRef.current, settings: settingsRef.current });
  }, []);

  const handleSettingsChange = async (newSettings) => {
    setSettings(newSettings);
    await setSetting('body_weight', newSettings.bodyWeight);
    await setSetting('height', newSettings.height);
    await setSetting('phase', newSettings.phase);
    await setSetting('cut_start', newSettings.cutStart);
    await setSetting('weekly_goal', newSettings.weeklyGoal);
    saveAppCache({ sessions: sessionsRef.current, routines: routinesRef.current, settings: newSettings });
  };

  const handleTabChange = (newTab) => {
    let dayIdx = null;
    if (newTab === 'session') {
      const totalDays = activeRoutine?.days?.length ?? 0;
      dayIdx = getNextWorkoutDayIndex(sessions, totalDays);
      setSessionDayIndex(dayIdx);
      localStorage.setItem('iron_log_session_day', String(dayIdx));
    } else {
      setSessionDayIndex(null);
      localStorage.removeItem('iron_log_session_day');
    }
    setTab(newTab);
    localStorage.setItem('iron_log_tab', newTab);
  };

  const handleOpenWorkout = (dayIndex) => {
    setSessionDayIndex(dayIndex);
    setTab('session');
    localStorage.setItem('iron_log_tab', 'session');
    localStorage.setItem('iron_log_session_day', String(dayIndex));
  };

  const handleSaveSession = async (session, errorMsg) => {
    if (errorMsg) { showToast(errorMsg); return; }
    try {
      await saveSessionToDb(session);
      await refreshSessions();
      showToast('Sesión guardada ✓');
      setTimeout(() => {
        setTab('home');
        setSessionDayIndex(null);
        localStorage.setItem('iron_log_tab', 'home');
        localStorage.removeItem('iron_log_session_day');
      }, 600);
    } catch (err) {
      console.error(err);
      showToast('Error al guardar');
    }
  };

  const handleBackFromSession = () => {
    setTab('home');
    setSessionDayIndex(null);
    localStorage.setItem('iron_log_tab', 'home');
    localStorage.removeItem('iron_log_session_day');
  };

  if (user === undefined || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', gap: 20 }}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="4"
            strokeDasharray="30 96"
            strokeLinecap="round"
            style={{ transformOrigin: '24px 24px', animation: 'spin 0.9s linear infinite' }}
          />
        </svg>
        <span style={{ color: 'var(--text-faint)', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: '0.05em' }}>IRON LOG</span>
      </div>
    );
  }

  if (user === null) return <LoginView />;

  let currentView;
  if (tab === 'session' && sessionDayIndex !== null && activeRoutine) {
    const day = activeRoutine.days[sessionDayIndex];
    const today = new Date().toISOString().split('T')[0];
    const existingSession = sessions.find(
      s => s.date === today && s.workoutId === sessionDayIndex
    );
    currentView = (
      <SessionView
        day={day}
        dayIndex={sessionDayIndex}
        sessions={sessions}
        settings={settings}
        existingSession={existingSession}
        onSave={handleSaveSession}
        onBack={handleBackFromSession}
      />
    );
  } else if (tab === 'home') {
    currentView = (
      <HomeView
        sessions={sessions}
        settings={settings}
        activeRoutine={activeRoutine}
        onOpenWorkout={handleOpenWorkout}
        onGoToRoutines={() => setTab('routines')}
      />
    );
  } else if (tab === 'history') {
    currentView = <HistoryView sessions={sessions} />;
  } else if (tab === 'routines') {
    currentView = (
      <RoutinesView
        routines={routines}
        activeRoutineId={activeRoutine?.id ?? null}
        onRoutinesChange={refreshRoutines}
        showToast={showToast}
      />
    );
  } else if (tab === 'settings') {
    currentView = (
      <SettingsView
        sessions={sessions}
        settings={settings}
        activeRoutine={activeRoutine}
        onSettingsChange={handleSettingsChange}
        onDataChange={refreshSessions}
        showToast={showToast}
      />
    );
  }

  return (
    <>
      <Header />
      {currentView}
      {tab === 'session' && sessionDayIndex !== null && spotifyEnabled && <SpotifyMiniPlayer />}
      <TabBar active={tab} onChange={handleTabChange} />
      <Toast message={toast.message} show={toast.show} onHide={hideToast} />
    </>
  );
}
