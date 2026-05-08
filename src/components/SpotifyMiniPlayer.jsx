import { useEffect, useState, useRef } from 'react';
import {
  isLoggedIn, startLogin, logout,
  getPlaybackState, play, pause, next, prev
} from '../lib/spotify';

const POLL_MS = 4000;

export function SpotifyMiniPlayer() {
  const [logged, setLogged] = useState(isLoggedIn());
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pollRef = useRef(null);

  const refresh = async () => {
    const s = await getPlaybackState();
    setState(s);
  };

  useEffect(() => {
    if (!logged) return;
    refresh();
    pollRef.current = setInterval(refresh, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [logged]);

  useEffect(() => {
    const onFocus = () => { if (logged) refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [logged]);

  const wrap = async (fn) => {
    if (busy) return;
    setBusy(true);
    await fn();
    setTimeout(refresh, 350);
    setBusy(false);
  };

  if (!logged) {
    return (
      <div className={`spotify-mini ${collapsed ? 'collapsed' : ''}`}>
        {collapsed ? (
          <button className="spotify-toggle" onClick={() => setCollapsed(false)} aria-label="Mostrar Spotify">♪</button>
        ) : (
          <>
            <button className="spotify-close" onClick={() => setCollapsed(true)} aria-label="Ocultar">×</button>
            <button className="spotify-login" onClick={startLogin}>
              <span className="spotify-logo">♪</span> Conectar Spotify
            </button>
          </>
        )}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="spotify-mini collapsed">
        <button className="spotify-toggle" onClick={() => setCollapsed(false)} aria-label="Mostrar Spotify">♪</button>
      </div>
    );
  }

  return (
    <div className="spotify-mini">
      <button className="spotify-close" onClick={() => setCollapsed(true)} aria-label="Ocultar">×</button>
      <div className="spotify-art">
        {state?.image ? <img src={state.image} alt="" /> : <div className="spotify-art-empty">♪</div>}
      </div>
      <div className="spotify-info">
        <div className="spotify-title">{state?.title || 'Sin reproducción'}</div>
        <div className="spotify-artist">{state?.artist || (state ? '' : 'Abre Spotify y dale play')}</div>
      </div>
      <div className="spotify-controls">
        <button onClick={() => wrap(prev)} aria-label="Anterior" disabled={busy}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        </button>
        <button onClick={() => wrap(state?.isPlaying ? pause : play)} aria-label={state?.isPlaying ? 'Pausar' : 'Reproducir'} disabled={busy} className="spotify-play">
          {state?.isPlaying
            ? <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>
            : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <button onClick={() => wrap(next)} aria-label="Siguiente" disabled={busy}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>
        </button>
      </div>
      <button className="spotify-logout" onClick={() => { logout(); setLogged(false); setState(null); }} aria-label="Desconectar">⎋</button>
    </div>
  );
}
