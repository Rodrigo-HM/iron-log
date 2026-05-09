import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';

const ACTIVE_SESSION_KEY = 'iron_log_active_session';

const updateSW = registerSW({
  onNeedRefresh() {
    const tryApply = () => {
      const hasActive = !!localStorage.getItem(ACTIVE_SESSION_KEY);
      if (hasActive) return;
      updateSW(true);
    };
    tryApply();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tryApply();
    });
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
