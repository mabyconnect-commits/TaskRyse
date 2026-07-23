import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { Alert, Field } from '../components/ui';
import { Logo } from '../components/Logo';

const DEMO = [
  { label: 'Contributor', email: 'adaeze@example.com' },
  { label: 'Reviewer', email: 'reviewer@taskryse.com' },
  { label: 'Sponsor', email: 'sponsor@meridian.ai' },
  { label: 'Admin', email: 'admin@taskryse.com' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('adaeze@example.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div className="pill">🌍 Nigeria-first · multi-currency</div>
        <h1>Verified digital work, real earnings.</h1>
        <p>
          Complete verified tasks, get reviewed, and withdraw what you earn. A plan unlocks
          eligible task categories — you earn from approved submissions, and payment depends on
          successful completion and approval.
        </p>
      </div>

      <div className="auth-form">
        <div className="auth-card">
          <div className="row" style={{ gap: 10, marginBottom: 18 }}>
            <Logo size={34} />
            <h2 style={{ margin: 0 }}>Sign in</h2>
          </div>

          {error && <Alert kind="error">{error}</Alert>}

          <form onSubmit={submit}>
            <Field label="Email">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="Password">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            <button className="btn primary block" type="submit" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Sign in'}
            </button>
          </form>

          <div className="demo-accounts">
            <div className="muted" style={{ marginBottom: 6 }}>Demo accounts (password <code>Password123!</code>):</div>
            <div className="row wrap" style={{ gap: 12 }}>
              {DEMO.map((d) => (
                <button key={d.email} onClick={() => { setEmail(d.email); setPassword('Password123!'); }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
