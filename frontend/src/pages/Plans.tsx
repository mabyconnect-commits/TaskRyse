import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useAuth } from '../context/AuthContext';
import { money, titleCase } from '../lib/format';
import { Loading, Alert } from '../components/ui';
import type { Plan, Subscription } from '../lib/types';

// Plans screen — design plan-card language (design/Taskryse Pricing + Home plans).
export default function Plans() {
  const { user } = useAuth();
  const isContrib = user?.role === 'CONTRIBUTOR' || user?.role === 'ADMIN';

  const { data, loading, error } = useApi<Plan[]>(() => api.get('/plans'), []);
  const sub = useApi<Subscription | null>(() => (isContrib ? api.get('/subscriptions') : Promise.resolve(null)), []);
  const [msg, setMsg] = useState<{ k: 'error' | 'success'; t: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Plans are a contributor concept — sponsors/reviewers don't subscribe.
  if (!isContrib) {
    return (
      <div className="appx-wide">
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Plans</div>
        <div style={{ textAlign: 'center', padding: '44px 20px', color: '#6B6E8C', fontFamily: 'Albert Sans, sans-serif' }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>💳</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#171A3A', marginBottom: 6 }}>Plans are for contributor accounts</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
            You're signed in as a {user?.role.toLowerCase()}. Plans unlock eligible task categories for contributors. As a sponsor you fund campaigns from your Business portal; reviewers don't need a plan.
          </div>
        </div>
      </div>
    );
  }

  const current = sub.data;

  async function subscribe(p: Plan) {
    setBusyId(p.id); setMsg(null);
    try {
      const r = await api.post<{ switched?: boolean }>('/subscriptions', { planId: p.id });
      setMsg({
        k: 'success',
        t: r.switched
          ? `Switched to ${titleCase(p.name)}. This changes your eligible categories — it creates no earnings.`
          : `Subscribed to ${titleCase(p.name)}. This unlocks eligible categories only — it creates no earnings.`,
      });
      sub.reload();
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Subscription failed' }); }
    finally { setBusyId(null); }
  }

  return (
    <div className="appx-wide">
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Plans</div>
      <p style={{ color: '#6B6E8C', fontSize: 13.5, margin: '0 0 16px' }}>A plan unlocks eligible task categories. It never grants tasks, earnings or returns.</p>

      {current && current.status === 'ACTIVE' && (
        <div style={{ background: '#171A3A', color: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11.5, color: '#B9BCD9', marginBottom: 2 }}>Your current plan</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 800, textTransform: 'capitalize' }}>{(current.plan?.name || '').toLowerCase()}</div>
          </div>
          {current.renewsAt && <div style={{ fontSize: 12, color: '#B9BCD9' }}>Renews {new Date(current.renewsAt).toLocaleDateString()}</div>}
        </div>
      )}

      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      <div className="plans-grid">
      {loading ? <Loading /> : (data || []).map((p, i) => {
        const isCurrent = current?.status === 'ACTIVE' && current.planId === p.id;
        return (
        <div key={p.id} style={{ background: '#fff', border: isCurrent ? '2px solid #16A67A' : i === 2 ? '2px solid #FF6A3D' : '1px solid #E3E4EE', borderRadius: 16, padding: 18, marginBottom: 12, position: 'relative' }}>
          {isCurrent && <span style={{ position: 'absolute', top: -11, left: 18, background: '#16A67A', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>CURRENT PLAN</span>}
          {!isCurrent && i === 2 && <span style={{ position: 'absolute', top: -11, left: 18, background: '#FF6A3D', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>MOST POPULAR</span>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 18, textTransform: 'capitalize' }}>{p.name.toLowerCase()}</div>
            <div><span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 22 }}>{money(p.priceMinor, p.currency)}</span><span style={{ color: '#6B6E8C', fontSize: 12 }}>/{p.billingPeriod.toLowerCase() === 'annual' ? 'yr' : 'mo'}</span></div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 14px', fontSize: 13.5, color: '#4A4D6B', lineHeight: 1.95 }}>
            <li>✓ Up to <strong>{p.maxActiveApplications >= 9999 ? 'unlimited' : p.maxActiveApplications}</strong> active tasks</li>
            <li>✓ Categories: {p.categoryScope.join(', ')}</li>
            <li>✓ {titleCase(p.qualificationAccess)} qualifications · {titleCase(p.supportTier)} support</li>
            <li>{p.sponsoredAccess ? '✓ Sponsored access' : '— No sponsored access'}</li>
          </ul>
          <button onClick={() => subscribe(p)} disabled={busyId === p.id || isCurrent}
            style={{ width: '100%', border: isCurrent ? '1px solid #16A67A' : 'none', background: isCurrent ? '#EDF7F3' : '#FF6A3D', color: isCurrent ? '#0E7A59' : '#fff', fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, padding: 12, borderRadius: 11, cursor: isCurrent ? 'default' : 'pointer', opacity: busyId === p.id ? 0.6 : 1 }}>
            {isCurrent ? 'Current plan' : busyId === p.id ? '…' : current ? `Switch to ${p.name.toLowerCase()}` : `Choose ${p.name.toLowerCase()}`}
          </button>
        </div>
        );
      })}
      </div>
      <p style={{ color: '#6B6E8C', fontSize: 12, marginTop: 6 }}>Earn from approved submissions. Payment depends on successful completion and approval. 7-day refund window while no task has been accepted.</p>
    </div>
  );
}
