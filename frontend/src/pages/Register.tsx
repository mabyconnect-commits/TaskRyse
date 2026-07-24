import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Onboarding / sign-up wizard (design/Taskryse Onboarding.dc.html), working for every
// role. Steps: Welcome → Role → Account → Verify (OTP) → Done.
const COUNTRIES = [
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', cur: 'NGN' },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana', cur: 'GHS' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya', cur: 'KES' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', cur: 'ZAR' },
];
const ROLES = [
  { key: 'CONTRIBUTOR', icon: '🧑‍💻', title: 'Contributor', desc: 'Complete verified tasks and get paid for approved work.' },
  { key: 'SPONSOR', icon: '🏢', title: 'Business / Sponsor', desc: 'Post and fund tasks; review submissions.' },
  { key: 'REVIEWER', icon: '✓', title: 'Reviewer', desc: 'Grade submissions and keep quality high.' },
  { key: 'ADMIN', icon: '⚙', title: 'Administrator', desc: 'Operate the platform (demo).' },
];
const STEPS = ['Welcome', 'Role', 'Account', 'Verify', 'Done'];

export default function Register() {
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [role, setRole] = useState('CONTRIBUTOR');
  const [country, setCountry] = useState('NG');
  const [legalName, setLegalName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const progress = ((step + 1) / STEPS.length) * 100;

  async function register() {
    setBusy(true); setError('');
    try {
      const username = (email.split('@')[0] || 'user') + Math.floor(Math.random() * 900 + 100);
      const res = await api.post<{ otp?: string }>('/auth/register', { email, password, role, legalName, username, countryCode: country });
      if (res.otp) { setDevOtp(res.otp); setOtp(res.otp); }
      setStep(3);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Could not create account'); }
    finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); setError('');
    try {
      const res = await api.post<{ token: string; user: { id: string; role: string } }>('/auth/otp/verify', { email, otp });
      applySession(res.token);
      setStep(4);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Invalid code'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EEEFF5', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', fontFamily: 'Albert Sans, sans-serif' }}>
      <div style={{ width: 'min(440px, 100%)', background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* progress */}
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <img src="/logo.png" alt="Taskryse" style={{ height: 24 }} />
            <span style={{ fontSize: 12, color: '#6B6E8C' }}>Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</span>
          </div>
          <div style={{ height: 4, background: '#ECEDF4', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#FFC857,#FF6A3D)', transition: 'width 0.3s' }} />
          </div>
        </div>

        <div style={{ flex: 1, padding: 22, overflowY: 'auto' }}>
          {error && <div className="alert error" style={{ marginBottom: 14 }}>{error}</div>}

          {step === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, margin: '0 0 10px' }}>Welcome to Taskryse</h1>
              <p style={{ color: '#6B6E8C', fontSize: 14.5, lineHeight: 1.6, marginBottom: 24 }}>Complete verified tasks. Grow your skills. Get paid in your local currency. Setup takes about 2 minutes.</p>
              <button className="ob-cta" onClick={() => setStep(1)}>Start Your Ryse</button>
              <div style={{ marginTop: 14, fontSize: 13.5, color: '#6B6E8C' }}>Already have an account? <Link to="/login" style={{ color: '#FF6A3D', fontWeight: 700 }}>Sign in</Link></div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="ob-h">Who are you joining as?</h2>
              <p className="ob-sub">You can operate a different workspace later.</p>
              {ROLES.map((r) => (
                <button key={r.key} onClick={() => setRole(r.key)} className="ob-select" style={{ borderColor: role === r.key ? '#FF6A3D' : '#E3E4EE', background: role === r.key ? '#FFF8F4' : '#fff' }}>
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <span><span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{r.title}</span><span style={{ fontSize: 12, color: '#6B6E8C' }}>{r.desc}</span></span>
                </button>
              ))}
              <div style={{ marginTop: 18 }}>
                <div className="ob-label">Where do you live?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {COUNTRIES.map((c) => (
                    <button key={c.code} onClick={() => setCountry(c.code)} className="ob-select" style={{ borderColor: country === c.code ? '#FF6A3D' : '#E3E4EE', background: country === c.code ? '#FFF8F4' : '#fff', marginBottom: 0 }}>
                      <span style={{ fontSize: 18 }}>{c.flag}</span><span style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button className="ob-cta" style={{ marginTop: 18 }} onClick={() => setStep(2)}>Continue</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="ob-h">Create your account</h2>
              <p className="ob-sub">We'll send a one-time code to verify it's you.</p>
              <Field label="Full name"><input className="ob-input" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Ada Contributor" /></Field>
              <Field label="Email"><input className="ob-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
              <Field label="Password"><input className="ob-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></Field>
              <button className="ob-cta" disabled={busy || !email || password.length < 8} onClick={register}>{busy ? '…' : 'Send verification code'}</button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="ob-h">Enter the 6-digit code</h2>
              <p className="ob-sub">Sent to {email}.{devOtp && <> Demo code: <strong style={{ color: '#FF6A3D' }}>{devOtp}</strong></>}</p>
              <input className="ob-input" style={{ textAlign: 'center', letterSpacing: 6, fontSize: 22, fontFamily: 'Sora, sans-serif', fontWeight: 800 }} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
              <button className="ob-cta" style={{ marginTop: 14 }} disabled={busy || otp.length !== 6} onClick={verify}>{busy ? '…' : 'Verify & continue'}</button>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', paddingTop: 30 }}>
              <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: '50%', background: '#EDF7F3', display: 'grid', placeItems: 'center', fontSize: 28, color: '#16A67A' }}>✓</div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, margin: '0 0 10px' }}>You're in! 🎉</h1>
              <p style={{ color: '#6B6E8C', fontSize: 14.5, lineHeight: 1.6, marginBottom: 24 }}>
                Your {role.toLowerCase()} workspace is ready.
                {role === 'CONTRIBUTOR' && ' Choose a plan to unlock eligible task categories, then start on your first task.'}
              </p>
              <button className="ob-cta" onClick={() => navigate('/dashboard')}>Enter your dashboard</button>
              {role === 'CONTRIBUTOR' && <button className="ob-ghost" onClick={() => navigate('/plans')}>Browse plans first</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><div className="ob-label">{label}</div>{children}</div>;
}
