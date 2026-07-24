import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../lib/useApi';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { Loading } from '../components/ui';
import type { Wallet, RyseProgress, Task } from '../lib/types';

// Faithful rebuild of the contributor Home screen (design/Taskryse App.dc.html).
const RYSE_TITLE: Record<string, { name: string; idx: number }> = {
  NEW: { name: 'New Ryser', idx: 1 }, ACTIVE: { name: 'Active Ryser', idx: 2 },
  SKILLED: { name: 'Skilled Ryser', idx: 3 }, PRO: { name: 'Pro Ryser', idx: 4 }, ELITE: { name: 'Elite Ryser', idx: 5 },
};
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function nameFrom(email: string) {
  const p = (email.split('@')[0] || 'there').replace(/[._-]/g, ' ');
  return p.charAt(0).toUpperCase() + p.slice(1);
}
const CHIP = { bg: '#F4F5FA', fg: '#4A4D6B' };

export default function Dashboard() {
  const { user } = useAuth();
  const isContrib = user?.role === 'CONTRIBUTOR' || user?.role === 'ADMIN';
  const wallet = useApi<Wallet | null>(() => (isContrib ? api.get('/wallet') : Promise.resolve(null)), []);
  const ryse = useApi<RyseProgress | null>(() => (isContrib ? api.get('/ryse-level') : Promise.resolve(null)), []);
  const tasks = useApi<Task[]>(() => (isContrib ? api.get('/tasks') : Promise.resolve([])), []);

  if (!isContrib) return <RoleHome role={user!.role} />;
  if (wallet.loading || ryse.loading) return <Loading />;

  const w = wallet.data; const r = ryse.data;
  const lvl = RYSE_TITLE[r?.level || 'NEW'];
  const progressPct = r ? Math.min(100, Math.round((r.metrics.approvedTaskCount % 25) / 25 * 100)) : 0;
  const eligible = (tasks.data || []).filter((t) => t.eligibility === 'ELIGIBLE');
  const stats = [
    { v: String(r?.metrics.approvedTaskCount ?? 0), l: 'Approved', color: '#16A67A' },
    { v: `${Math.round((r?.metrics.qualityScore ?? 1) * 100)}%`, l: 'Quality', color: '#171A3A' },
    { v: String(r?.metrics.qualificationsPassed ?? 0), l: 'Quals', color: '#377DFF' },
    { v: String(eligible.length), l: 'Eligible', color: '#FF6A3D' },
  ];

  return (
    <div className="appx-wide">
      {/* greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 13, color: '#6B6E8C' }}>{greeting()}</div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800 }}>{nameFrom(user!.email)} 👋</div>
        </div>
        <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#FF6A3D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15 }}>
          {nameFrom(user!.email).split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
        </span>
      </div>

      <div className="dash-grid">
      <div>
      {/* level card */}
      <div style={{ background: '#171A3A', borderRadius: 18, padding: '18px 20px', color: '#fff', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ width: 6, height: 8, background: '#FFC857', borderRadius: 1.5 }} />
              <span style={{ width: 6, height: 13, background: '#FF8A3D', borderRadius: 1.5 }} />
              <span style={{ width: 6, height: 18, background: '#FF6A3D', borderRadius: 1.5 }} />
            </span>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 15 }}>{lvl.name}</span>
          </div>
          <span style={{ fontSize: 12, color: '#B9BCD9' }}>Level {lvl.idx} of 5</span>
        </div>
        <div style={{ height: 7, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#FFC857,#FF6A3D)', borderRadius: 999 }} />
        </div>
        <div style={{ fontSize: 12, color: '#B9BCD9' }}>
          {r?.nextLevel ? `Keep delivering approved work to reach ${RYSE_TITLE[r.nextLevel]?.name}` : 'Top level — keep your quality high'} · derived from approved work only
        </div>
      </div>

      {/* balances */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Link to="/wallet" style={{ textAlign: 'left', border: '1px solid #E3E4EE', background: '#fff', borderRadius: 14, padding: '14px 16px', textDecoration: 'none' }}>
          <div style={{ fontSize: 11.5, color: '#6B6E8C', marginBottom: 3 }}>Withdrawable</div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: '#171A3A' }}>{money(w?.withdrawableMinor ?? 0, w?.currency)}</div>
        </Link>
        <Link to="/wallet" style={{ textAlign: 'left', border: '1px solid #E3E4EE', background: '#fff', borderRadius: 14, padding: '14px 16px', textDecoration: 'none' }}>
          <div style={{ fontSize: 11.5, color: '#6B6E8C', marginBottom: 3 }}>Pending review</div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: '#B8860B' }}>{money(w?.pendingMinor ?? 0, w?.currency)}</div>
        </Link>
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
        {stats.map((s) => (
          <div key={s.l} style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14.5, fontWeight: 800, color: s.color }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#6B6E8C', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
        {[{ i: '◎', l: 'Find tasks', to: '/marketplace' }, { i: '✎', l: 'My work', to: '/workspace' }, { i: '❖', l: 'Wallet', to: '/wallet' }, { i: '▲', l: 'Ryse', to: '/ryse' }].map((q) => (
          <Link key={q.l} to={q.to} style={{ border: '1px solid #E3E4EE', background: '#fff', borderRadius: 12, padding: '12px 4px', textAlign: 'center', textDecoration: 'none' }}>
            <div style={{ fontSize: 17, marginBottom: 4, color: '#FF6A3D' }}>{q.i}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#171A3A' }}>{q.l}</div>
          </Link>
        ))}
      </div>

      </div>
      <div>
      {/* recommended */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700 }}>Recommended for you</div>
        <Link to="/marketplace" style={{ color: '#FF6A3D', fontSize: 12.5, fontWeight: 700 }}>See all →</Link>
      </div>
      {(tasks.data || []).slice(0, 3).map((t) => {
        const elig = t.eligibility === 'ELIGIBLE' ? { bg: 'rgba(22,166,122,0.12)', fg: '#16A67A', label: 'Eligible' }
          : t.eligibility === 'QUALIFICATION_REQUIRED' ? { bg: 'rgba(255,200,87,0.2)', fg: '#A6790A', label: 'Qualify' }
          : { bg: 'rgba(229,72,77,0.1)', fg: '#E5484D', label: 'Plan-locked' };
        return (
          <Link key={t.id} to={`/task/${t.id}`} style={{ display: 'block', textAlign: 'left', border: '1px solid #E3E4EE', background: '#fff', borderRadius: 14, padding: '14px 16px', textDecoration: 'none', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#171A3A', lineHeight: 1.4 }}>{t.title}</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{money(t.payMinor, t.currency)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ background: CHIP.bg, color: CHIP.fg, fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>{t.difficulty[0] + t.difficulty.slice(1).toLowerCase()}</span>
              <span style={{ background: elig.bg, color: elig.fg, fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>{elig.label}</span>
            </div>
          </Link>
        );
      })}
      <div style={{ background: '#FFF8EC', border: '1px solid #F2E2BC', borderRadius: 12, padding: '11px 14px', fontSize: 11.5, color: '#7A5A12', lineHeight: 1.55, marginTop: 8 }}>
        Task availability varies. Earnings come only from completed, approved work.
      </div>
      </div>
      </div>
    </div>
  );
}

// Compact home for sponsor/reviewer with quick links to their tools.
function RoleHome({ role }: { role: string }) {
  const links = role === 'SPONSOR'
    ? [{ to: '/business', i: '⛁', t: 'Business', d: 'Create organisations, launch campaigns, fund escrow.' }, { to: '/review', i: '✓', t: 'Review Queue', d: 'Review submissions on your tasks.' }, { to: '/wallet', i: '❖', t: 'Wallet', d: 'Organisation spend & transactions.' }]
    : [{ to: '/review', i: '✓', t: 'Review Queue', d: 'Approve, request revision, reject or flag submissions.' }];
  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <h1 className="page-title">Welcome back</h1>
      <p className="page-sub">Jump into your {role.toLowerCase()} tools.</p>
      <div className="grid cols-2">
        {links.map((q) => (
          <Link key={q.to} to={q.to} className="card card-pad quick-link">
            <div className="quick-ico">{q.i}</div>
            <div><h3 style={{ margin: '0 0 4px' }}>{q.t}</h3><p className="muted small" style={{ margin: 0 }}>{q.d}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
