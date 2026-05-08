import { useEffect, useState, useRef } from 'react';
import {
  isLoggedIn, startLogin, logout,
  getPlaybackState, play, pause, next, prev
} from '../lib/spotify';

const POLL_MS = 5000;

function formatTime(ms) {
  if (!ms || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SpotifyMiniPlayer() {
  const [logged, setLogged] = useState(isLoggedIn());
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const lastSyncRef = useRef(0);

  const refresh = async () => {
    const s = await getPlaybackState();
    setState(s);
    if (s) {
      setLocalProgress(s.progressMs);
      lastSyncRef.current = Date.now();
    }
  };

  useEffect(() => {
    if (!logged) return;
    refresh();
    pollRef.current = setInterval(refresh, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [logged]);

  useEffect(() => {
    if (!state?.isPlaying) {
      clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - lastSyncRef.current;
      setLocalProgress(Math.min(state.progressMs + elapsed, state.durationMs));
    }, 500);
    return () => clearInterval(tickRef.current);
  }, [state?.isPlaying, state?.progressMs, state?.durationMs]);

  useEffect(() => {
    const onFocus = () => { if (logged) refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [logged]);

  const wrap = (fn) => async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      setTimeout(refresh, 350);
    } catch (err) {
      console.error('Spotify error:', err);
    } finally {
      setBusy(false);
    }
  };

  if (collapsed) {
    return (
      <div className="spotify-mini-collapsed">
        <button className="spotify-toggle" onClick={() => setCollapsed(false)} aria-label="Mostrar Spotify">
          {state?.image
            ? <img src={state.imageSmall || state.image} alt="" />
            : <span>♪</span>}
          {state?.isPlaying && <span className="spotify-pulse" />}
        </button>
      </div>
    );
  }

  if (!logged) {
    return (
      <div className="spotify-mini spotify-mini--login">
        <button className="spotify-login" onClick={startLogin}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DB954" style={{ flexShrink: 0 }}>
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          Conectar con Spotify
        </button>
      </div>
    );
  }

  const progress = state?.durationMs ? (localProgress / state.durationMs) * 100 : 0;

  return (
    <div className="spotify-mini" onClick={() => setCollapsed(true)} role="button" tabIndex={0}>
      {state?.image && (
        <div className="spotify-bg" style={{ backgroundImage: `url(${state.image})` }} />
      )}
      <div className="spotify-overlay" />
      <div className="spotify-content">
        <div className="spotify-row">
          <div className="spotify-art">
            {state?.image
              ? <img src={state.image} alt="" />
              : <div className="spotify-art-empty">♪</div>}
          </div>
          <div className="spotify-info">
            <div className="spotify-title">{state?.title || 'Sin reproducción'}</div>
            <div className="spotify-artist">{state?.artist || 'Abre Spotify y dale play'}</div>
          </div>
          <div className="spotify-controls">
            <button onClick={wrap(prev)} aria-label="Anterior" disabled={busy} className="spotify-btn">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button onClick={wrap(state?.isPlaying ? pause : play)} aria-label={state?.isPlaying ? 'Pausar' : 'Reproducir'} disabled={busy} className="spotify-play">
              {state?.isPlaying
                ? <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>
                : <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button onClick={wrap(next)} aria-label="Siguiente" disabled={busy} className="spotify-btn">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>
            </button>
          </div>
        </div>
      </div>
      {state?.durationMs > 0 && (
        <div className="spotify-progress">
          <div className="spotify-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
