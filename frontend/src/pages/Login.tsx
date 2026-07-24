import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

// Faithful rebuild of the Sign-in screen (design/Taskryse Auth.dc.html).
const DEMO = [
  { label: 'Contributor', email: 'adaeze@example.com' },
  { label: 'Reviewer', email: 'reviewer@taskryse.com' },
  { label: 'Sponsor', email: 'sponsor@meridian.ai' },
  { label: 'Admin', email: 'admin@taskryse.com' },
];
const INDIGO = '#171A3A', MUTED = '#6B6E8C', ORANGE = '#FF6A3D';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('adaeze@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EEEFF5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 16px', fontFamily: 'Albert Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <Link to="/"><img src="/logo.png" alt="Taskryse" style={{ height: 30, width: 'auto' }} /></Link>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 20, padding: '26px 22px', boxShadow: '0 12px 40px rgba(23,26,58,0.08)' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: INDIGO, textAlign: 'center' }}>Welcome back</div>
          <div style={{ fontSize: 13.5, color: MUTED, textAlign: 'center', margin: '4px 0 20px' }}>Continue your Ryse.</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {['Google', 'Apple'].map((s) => (
              <button key={s} type="button" onClick={() => setError('Social sign-in isn’t enabled in this demo — use email & password below.')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid #E3E4EE', background: '#fff', borderRadius: 12, padding: '11px', fontSize: 13.5, fontWeight: 600, color: '#2C2F52', cursor: 'pointer' }}>
                <span aria-hidden style={{ fontWeight: 800 }}>{s === 'Google' ? 'G' : ''}</span>{s}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px', color: '#A6A9C0', fontSize: 12 }}>
            <span style={{ flex: 1, height: 1, background: '#E3E4EE' }} /> or <span style={{ flex: 1, height: 1, background: '#E3E4EE' }} />
          </div>

          {error && <div style={{ background: '#FDF6F6', border: '1px solid #F2D6D7', color: '#B33A3E', fontSize: 12.5, padding: '10px 12px', borderRadius: 10, marginBottom: 12, lineHeight: 1.4 }}>{error}</div>}

          <form onSubmit={submit}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A4D6B', marginBottom: 5 }}>Email or phone</label>
            <input className="wl-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" style={{ marginBottom: 12 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#4A4D6B' }}>Password</label>
              <span style={{ fontSize: 12, color: ORANGE, fontWeight: 600 }}>Forgot password?</span>
            </div>
            <input className="wl-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={{ marginBottom: 18 }} />

            <button type="submit" disabled={busy}
              style={{ width: '100%', border: 'none', background: ORANGE, color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, padding: 13, borderRadius: 12, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? '…' : 'Sign in'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13.5, color: MUTED }}>
            New to Taskryse? <Link to="/register" style={{ color: ORANGE, fontWeight: 700, textDecoration: 'none' }}>Create an account</Link>
          </div>
        </div>

        {/* demo helper */}
        <div style={{ marginTop: 16, background: '#fff', border: '1px solid #E3E4EE', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Demo accounts — password <code style={{ background: '#F4F5FA', padding: '1px 5px', borderRadius: 4 }}>Password123!</code></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DEMO.map((d) => (
              <button key={d.email} onClick={() => { setEmail(d.email); setPassword('Password123!'); setError(''); }}
                style={{ border: '1px solid #E3E4EE', background: '#FAFAFC', color: '#4A4D6B', fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, cursor: 'pointer' }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
