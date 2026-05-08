import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) { setMessage(error.message); setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    let error;
    if (mode === 'login') {
      ({ error } = await supabase.auth.signInWithPassword({ email, password }));
    } else {
      ({ error } = await supabase.auth.signUp({ email, password }));
      if (!error) {
        setMessage('Revisa tu email para confirmar la cuenta.');
        setLoading(false);
        return;
      }
    }

    if (error) setMessage(error.message);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ marginBottom: 40 }}>
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <span className="brand-logo"><span className="brand-accent">IRON</span>LOG</span>
        </div>
        <div style={{ textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-faint)', textTransform: 'uppercase' }}>
          Track · Progress · Dominate
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="setting-input"
          style={{ width: '100%', padding: '14px 16px', fontSize: 14 }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="setting-input"
          style={{ width: '100%', padding: '14px 16px', fontSize: 14 }}
        />

        {message && (
          <div style={{ fontSize: 13, color: message.includes('email') ? 'var(--green)' : 'var(--red)', textAlign: 'center', padding: '8px 0' }}>
            {message}
          </div>
        )}

        <button type="submit" className="primary-btn" style={{ marginTop: 8, marginBottom: 0 }} disabled={loading}>
          {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.15em' }}>O</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <button onClick={handleGoogle} disabled={loading} className="google-btn">
        <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        Continuar con Google
      </button>

      <button
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(null); }}
        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, marginTop: 16, cursor: 'pointer', textAlign: 'center' }}
      >
        {mode === 'login' ? '¿Sin cuenta? Crear una' : '¿Ya tienes cuenta? Entrar'}
      </button>
    </div>
  );
}
