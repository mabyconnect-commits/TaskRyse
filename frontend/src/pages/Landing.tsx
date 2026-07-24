import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

const FEATURES = [
  { icon: '◎', title: 'Verified task marketplace', body: 'Browse tasks matched to your plan, level and skills — AI evaluation, data labelling, transcription and more.' },
  { icon: '✓', title: 'Get reviewed, get paid', body: 'Submit work, a reviewer approves it, and your earnings become withdrawable against funded escrow.' },
  { icon: '❖', title: 'Wallet & withdrawals', body: 'Track pending and withdrawable balances, cash out with PIN + OTP, or pay bills — all in Naira.' },
  { icon: '▲', title: 'Ryse as you deliver', body: 'Your level is earned from approved work and quality — never bought. Unlock more as you grow.' },
];

const STEPS = [
  { n: '1', t: 'Pick a plan', d: 'Unlock the task categories you’re eligible for. A plan grants access only — never earnings.' },
  { n: '2', t: 'Complete verified tasks', d: 'Accept eligible tasks, do the work, and submit your evidence for review.' },
  { n: '3', t: 'Earn from approvals', d: 'Approved submissions pay out against the sponsor’s funded escrow. Withdraw what you earn.' },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <Logo size={30} />
          <span>Taskryse</span>
        </div>
        <Link to="/login" className="btn primary sm">Sign in</Link>
      </header>

      <section className="landing-hero">
        <span className="pill">🌍 Nigeria-first · multi-currency</span>
        <h1>Verified digital work,<br /><span className="accent">real earnings.</span></h1>
        <p>
          Taskryse connects contributors with businesses that sponsor and fund real AI and
          digital tasks. Complete verified work, get reviewed, and withdraw what you earn —
          payment depends on successful completion and approval.
        </p>
        <div className="landing-cta">
          <Link to="/login" className="btn primary">Get started</Link>
          <Link to="/login" className="btn ghost-light">I have an account</Link>
        </div>
        <div className="landing-trust">Contributors · Businesses · Reviewers · Admins — one platform</div>
      </section>

      <section className="landing-section">
        <h2>Everything you need to earn from verified work</h2>
        <div className="grid cols-2 landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature">
              <div className="feat-ico">{f.icon}</div>
              <div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section steps">
        <h2>How it works</h2>
        <div className="grid cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="landing-step">
              <div className="step-n">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
        <p className="landing-note">
          A plan unlocks eligible task categories. It never grants tasks, guaranteed returns or
          fixed income — you earn from approved submissions only.
        </p>
      </section>

      <section className="landing-final">
        <h2>Ready to start earning?</h2>
        <Link to="/login" className="btn primary">Sign in to Taskryse</Link>
      </section>

      <footer className="landing-foot">
        <div className="landing-brand">
          <Logo size={22} /><span>Taskryse</span>
        </div>
        <span className="tiny muted">Global AI / digital-work platform · demo build</span>
      </footer>
    </div>
  );
}
