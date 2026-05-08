import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { Toast, useToast } from './components/Toast';
import { HomeView } from './views/HomeView';
import { SessionView } from './views/SessionView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import {
  getAllSessions,
  saveSession as saveSessionToDb,
  getSetting,
  setSetting
} from './lib/storage';
import { getNextWorkoutId } from './lib/workouts';
import './styles/styles.css';

const DEFAULT_SETTINGS = {
  bodyWeight: 87,
  phase: 'bulk',
  cutStart: '2026-05-15'
};

export default function App() {
  const [tab, setTab] = useState('home');
  const [sessionWorkoutId, setSessionWorkoutId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  // Cargar datos al iniciar
  useEffect(() => {
    (async () => {
      try {
        const allSessions = await getAllSessions();
        setSessions(allSessions);

        const bodyWeight = await getSetting('bodyWeight', DEFAULT_SETTINGS.bodyWeight);
        const phase = await getSetting('phase', DEFAULT_SETTINGS.phase);
        const cutStart = await getSetting('cutStart', DEFAULT_SETTINGS.cutStart);
        setSettings({ bodyWeight, phase, cutStart });
      } catch (err) {
        console.error('Error loading data:', err);
      }
      setLoading(false);
    })();
  }, []);

  const refreshSessions = useCallback(async () => {
    const allSessions = await getAllSessions();
    setSessions(allSessions);
  }, []);

  const handleSettingsChange = async (newSettings) => {
    setSettings(newSettings);
    await setSetting('bodyWeight', newSettings.bodyWeight);
    await setSetting('phase', newSettings.phase);
    await setSetting('cutStart', newSettings.cutStart);
  };

  const handleTabChange = (newTab) => {
    if (newTab === 'session') {
      // Abrir el siguiente workout que toca
      const nextId = getNextWorkoutId(sessions);
      setSessionWorkoutId(nextId);
    } else {
      setSessionWorkoutId(null);
    }
    setTab(newTab);
  };

  const handleOpenWorkout = (workoutId) => {
    setSessionWorkoutId(workoutId);
    setTab('session');
  };

  const handleSaveSession = async (session, errorMsg) => {
    if (errorMsg) {
      showToast(errorMsg);
      return;
    }
    try {
      await saveSessionToDb(session);
      await refreshSessions();
      showToast('Sesión guardada ✓');
      setTimeout(() => {
        setTab('home');
        setSessionWorkoutId(null);
      }, 600);
    } catch (err) {
      console.error(err);
      showToast('Error al guardar');
    }
  };

  const handleBackFromSession = () => {
    setTab('home');
    setSessionWorkoutId(null);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
        Cargando...
      </div>
    );
  }

  // Determinar qué vista mostrar
  let currentView;
  if (tab === 'session' && sessionWorkoutId) {
    const today = new Date().toISOString().split('T')[0];
    const existingSession = sessions.find(
      s => s.date === today && s.workoutId === sessionWorkoutId
    );
    currentView = (
      <SessionView
        workoutId={sessionWorkoutId}
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
        onOpenWorkout={handleOpenWorkout}
      />
    );
  } else if (tab === 'history') {
    currentView = <HistoryView sessions={sessions} />;
  } else if (tab === 'settings') {
    currentView = (
      <SettingsView
        sessions={sessions}
        settings={settings}
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
      <TabBar active={tab} onChange={handleTabChange} />
      <Toast message={toast.message} show={toast.show} onHide={hideToast} />
    </>
  );
}
