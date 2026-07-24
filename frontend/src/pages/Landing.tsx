import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { money } from '../lib/format';
import type { Plan } from '../lib/types';

// Faithful rebuild of the Taskryse marketing home (design/Taskryse Home.dc.html).
// Indigo #171A3A, dark #0F1128, orange #FF6A3D, yellow #FFC857, green #16A67A.
const INK = '#171A3A';
const MUTED = '#6B6E8C';

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#FF6A3D" /><stop offset="1" stopColor="#FFC857" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#lg)" />
        <path d="M8.5 17.2l4.4 4.4L23.5 11" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, letterSpacing: '0.02em', fontSize: 19, color: light ? '#fff' : INK }}>TASKRYSE</span>
    </div>
  );
}

const NAV = ['How it works', 'Tasks', 'Plans', 'For Business', 'Payouts'];

export default function Landing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [annual, setAnnual] = useState(false);
  useEffect(() => { api.get<Plan[]>('/plans').then(setPlans).catch(() => setPlans([])); }, []);

  return (
    <div style={{ background: '#EEEFF5', color: INK, fontFamily: 'Albert Sans, sans-serif', minHeight: '100vh' }}>
      {/* promo strip */}
      <div style={{ background: INK, color: '#CFD2E6', fontSize: 12.5, textAlign: 'center', padding: '8px 16px' }}>
        Now paying out in Nigerian naira, Ghanaian cedi, Kenyan shilling and South African rand.{' '}
        <span style={{ color: '#FF6A3D', fontWeight: 600 }}>See supported countries →</span>
      </div>

      {/* nav */}
      <header style={{ background: '#fff', borderBottom: '1px solid #E7E8F0', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Logo />
          <nav className="lp-nav" style={{ display: 'flex', gap: 22, fontSize: 14, color: '#4A4E6B', fontWeight: 500 }}>
            {NAV.map((n) => <a key={n} href="#how" style={{ color: '#4A4E6B' }}>{n}</a>)}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/login" style={{ color: INK, fontWeight: 600, fontSize: 14 }}>Sign in</Link>
            <Link to="/login" className="lp-btn lp-btn-primary">Start Your Ryse</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section style={{ background: `radial-gradient(900px 500px at 15% -10%, #2A2F63 0%, ${INK} 55%, #0F1128 100%)`, color: '#fff' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '56px 20px 64px', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 40, alignItems: 'center' }} className="lp-hero-grid">
          <div>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.08)', padding: '7px 13px', borderRadius: 999, fontSize: 12.5, marginBottom: 20 }}>
              ⚡ You earn only from approved work — never from joining
            </span>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 46, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
              Turn your skills into<br />verified opportunities.
            </h1>
            <p style={{ color: '#B9BDE0', fontSize: 16.5, lineHeight: 1.55, maxWidth: 480, margin: '0 0 26px' }}>
              Complete AI and digital tasks, develop your expertise and get paid for approved work — in your local currency.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/login" className="lp-btn lp-btn-primary lp-btn-lg">Start Your Ryse</Link>
              <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-lg">Explore Tasks</Link>
            </div>
          </div>

          {/* recommended card */}
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.35)', padding: 18, color: INK, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontFamily: 'Sora, sans-serif', fontSize: 15 }}>Recommended for you</strong>
              <span style={{ background: 'rgba(22,166,122,0.12)', color: '#16A67A', fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>Eligible</span>
            </div>
            {[
              { t: 'AI response evaluation — English (Nigeria)', d: 'Rate model answers for accuracy and time · Verified sponsor', m: '~25 min', lvl: 'Beginner', lc: '#EEF0F7', lt: MUTED },
              { t: 'Audio transcription — Yorùbá speech', d: 'Transcribe short voice clips · Qualification required', m: '~40 min', lvl: 'Intermediate', lc: 'rgba(255,200,87,0.2)', lt: '#A6790A' },
            ].map((r) => (
              <div key={r.t} style={{ border: '1px solid #E7E8F0', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{r.t}</div>
                <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>{r.d}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ background: '#EEF0F7', color: MUTED, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{r.m}</span>
                  <span style={{ background: r.lc, color: r.lt, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>{r.lvl}</span>
                </div>
              </div>
            ))}
            <div style={{ background: 'rgba(22,166,122,0.1)', color: '#16A67A', fontSize: 12.5, fontWeight: 600, padding: '9px 12px', borderRadius: 10 }}>
              ✓ Task approved · payment released
            </div>
            <div style={{ position: 'absolute', right: 14, bottom: -14, background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.14)', borderRadius: 10, padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
              <span style={{ color: '#FF6A3D' }}>▲</span> <span className="muted" style={{ color: MUTED }}>Ryse Level</span> <strong>Skilled Ryser</strong>
            </div>
          </div>
        </div>
      </section>

      {/* trust bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E7E8F0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '14px 20px', display: 'flex', gap: 26, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12.5, color: '#4A4E6B' }}>
          {['Identity-verified contributors', 'Verified sponsors only', 'Transparent fees & FX', 'No earnings promises — ever'].map((t) => (
            <span key={t}><span style={{ color: '#16A67A', fontWeight: 700 }}>✓</span> {t}</span>
          ))}
        </div>
      </div>

      {/* how it works */}
      <section id="how" style={{ maxWidth: 1160, margin: '0 auto', padding: '54px 20px 20px', textAlign: 'center' }}>
        <div style={{ color: '#FF6A3D', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>How Taskryse works</div>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 32, margin: '8px 0 30px' }}>Complete. Grow. Rise.</h2>
        <div className="lp-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, textAlign: 'left' }}>
          {[
            { n: '01', t: 'Complete verified tasks', d: 'Browse tasks matched to your plan, skills and level. Accept, do the work, and submit your evidence.' },
            { n: '02', t: 'Grow your expertise', d: 'Pass qualifications, keep your quality high, and unlock higher-value categories as you deliver.' },
            { n: '03', t: 'Rise & get paid', d: 'Approved submissions pay into your wallet against funded escrow. Withdraw in your local currency.' },
          ].map((s) => (
            <div key={s.n} style={{ background: '#fff', border: '1px solid #E7E8F0', borderRadius: 16, padding: 22 }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#FF6A3D', fontSize: 22 }}>{s.n}</div>
              <h3 style={{ fontFamily: 'Sora, sans-serif', margin: '8px 0 6px', fontSize: 17 }}>{s.t}</h3>
              <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* payments note */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '14px 20px 40px' }}>
        <div style={{ background: '#fff', border: '1px solid #E7E8F0', borderRadius: 16, padding: 22, display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ maxWidth: 640 }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', margin: '0 0 8px', fontSize: 18 }}>How contributor payments work</h3>
            <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.6, margin: '0 0 8px' }}>
              Your plan unlocks eligible task categories — it never buys earnings. Task availability varies, and every
              payment depends on successful completion and approval by a reviewer or sponsor.
            </p>
            <a href="#plans" style={{ color: '#FF6A3D', fontWeight: 600, fontSize: 13.5 }}>Read the task-payment policy →</a>
          </div>
        </div>
      </section>

      {/* payouts */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '10px 20px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'center' }} className="lp-grid-2">
        <div>
          <div style={{ color: '#FF6A3D', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Local-currency payouts</div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 30, margin: '8px 0 12px' }}>Withdraw in naira. Or cedi, shilling, rand…</h2>
          <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.6 }}>
            Approved earnings go to your local bank account or mobile money wallet. Fees and exchange rates are shown
            before you confirm — no surprises on arrival.
          </p>
        </div>
        <div style={{ background: INK, color: '#fff', borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 12.5, color: '#8B8FB0' }}>Withdrawable balance</div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 34, margin: '4px 0 16px' }}>₦86,400</div>
          {[['Withdraw to', 'GTBank ••2841'], ['Amount', '₦50,000'], ['Processing fee', '₦150'], ['You receive', '₦49,850']].map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: i === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none', fontSize: 13.5 }}>
              <span style={{ color: '#8B8FB0' }}>{k}</span><strong>{v}</strong>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 11.5, color: '#8B8FB0' }}>Typically arrives within 24 hours · protected by withdrawal PIN + OTP</div>
        </div>
      </section>

      {/* plans */}
      <section id="plans" style={{ maxWidth: 1160, margin: '0 auto', padding: '30px 20px 40px', textAlign: 'center' }}>
        <div style={{ color: '#FF6A3D', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Plans</div>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 30, margin: '8px 0 8px' }}>A plan unlocks eligibility — your work earns the money</h2>
        <p style={{ color: MUTED, fontSize: 14, maxWidth: 560, margin: '0 auto 18px' }}>
          Plans control which task categories, assessments and tools you can access. They never include, promise or guarantee earnings.
        </p>
        <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #E7E8F0', borderRadius: 999, padding: 4, marginBottom: 26, fontSize: 13 }}>
          <button onClick={() => setAnnual(false)} className={`lp-toggle ${!annual ? 'on' : ''}`}>Monthly</button>
          <button onClick={() => setAnnual(true)} className={`lp-toggle ${annual ? 'on' : ''}`}>Annual · save 20%</button>
        </div>
        <div className="lp-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, textAlign: 'left' }}>
          {plans.map((p, i) => (
            <div key={p.id} style={{ background: '#fff', border: i === 2 ? '2px solid #FF6A3D' : '1px solid #E7E8F0', borderRadius: 16, padding: 20, position: 'relative' }}>
              {i === 2 && <span style={{ position: 'absolute', top: -11, left: 20, background: '#FF6A3D', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>MOST POPULAR</span>}
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, textTransform: 'capitalize' }}>{p.name.toLowerCase()}</div>
              <div style={{ margin: '6px 0 12px' }}>
                <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 24 }}>{money(annual ? Math.round(p.priceMinor * 12 * 0.8) : p.priceMinor, p.currency)}</span>
                <span style={{ color: MUTED, fontSize: 12 }}>/{annual ? 'yr' : 'mo'}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: '#4A4E6B', lineHeight: 1.9 }}>
                <li>✓ {p.maxActiveApplications >= 9999 ? 'Unlimited' : p.maxActiveApplications} active tasks</li>
                <li>✓ {p.categoryScope.join(', ')}</li>
                <li>✓ {p.supportTier} support</li>
                <li>{p.sponsoredAccess ? '✓ Sponsored access' : '— No sponsored access'}</li>
              </ul>
              <Link to="/login" className="lp-btn lp-btn-primary" style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}>Choose {p.name.toLowerCase()}</Link>
            </div>
          ))}
        </div>
        <p style={{ color: MUTED, fontSize: 12, marginTop: 18 }}>
          Task availability varies by category, country and demand. Payment depends on successful completion and approval.
        </p>
      </section>

      {/* business */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '20px 20px 44px' }}>
        <div style={{ background: `linear-gradient(120deg, ${INK}, #0F1128)`, color: '#fff', borderRadius: 20, padding: 36, display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ color: '#FFC857', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Taskryse for business</div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 26, margin: '10px 0 10px' }}>Reach verified contributors across Africa and beyond</h2>
            <p style={{ color: '#B9BDE0', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Post tasks or sponsored campaigns, define exactly who qualifies, fund upfront, and pay only for work you approve. Every contributor is identity-verified.
            </p>
          </div>
          <Link to="/login" className="lp-btn lp-btn-primary lp-btn-lg">Post a Task</Link>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '10px 20px 50px' }}>
        <div style={{ background: 'linear-gradient(120deg, #FF6A3D, #FF8A5D)', color: '#fff', borderRadius: 20, padding: '44px 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, margin: '0 0 10px' }}>Ready to start your Ryse?</h2>
          <p style={{ opacity: 0.95, margin: '0 0 20px', fontSize: 15 }}>Create your profile, verify your identity and unlock your first eligible tasks today.</p>
          <Link to="/login" className="lp-btn" style={{ background: INK, color: '#fff' }}>Start Your Ryse</Link>
        </div>
      </section>

      {/* footer */}
      <footer style={{ background: INK, color: '#8B8FB0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div>
            <Logo light />
            <div style={{ fontSize: 12.5, marginTop: 8, maxWidth: 320 }}>Complete. Grow. Rise. Verified digital work with transparent, local-currency payment.</div>
          </div>
          <div style={{ fontSize: 12 }}>© 2026 Taskryse. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
