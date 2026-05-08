import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

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

      <button
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(null); }}
        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 13, marginTop: 20, cursor: 'pointer', textAlign: 'center' }}
      >
        {mode === 'login' ? '¿Sin cuenta? Crear una' : '¿Ya tienes cuenta? Entrar'}
      </button>
    </div>
  );
}
