import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, titleCase } from '../lib/format';
import { Loading, Alert } from '../components/ui';
import type { Plan } from '../lib/types';

// Plans screen — design plan-card language (design/Taskryse Pricing + Home plans).
export default function Plans() {
  const { data, loading, error } = useApi<Plan[]>(() => api.get('/plans'), []);
  const [msg, setMsg] = useState<{ k: 'error' | 'success'; t: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function subscribe(p: Plan) {
    setBusyId(p.id); setMsg(null);
    try {
      await api.post('/subscriptions', { planId: p.id });
      setMsg({ k: 'success', t: `Subscribed to ${titleCase(p.name)}. This unlocks eligible categories only — it creates no earnings.` });
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Subscription failed' }); }
    finally { setBusyId(null); }
  }

  return (
    <div className="appx-wide">
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Plans</div>
      <p style={{ color: '#6B6E8C', fontSize: 13.5, margin: '0 0 16px' }}>A plan unlocks eligible task categories. It never grants tasks, earnings or returns.</p>

      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      <div className="plans-grid">
      {loading ? <Loading /> : (data || []).map((p, i) => (
        <div key={p.id} style={{ background: '#fff', border: i === 2 ? '2px solid #FF6A3D' : '1px solid #E3E4EE', borderRadius: 16, padding: 18, marginBottom: 12, position: 'relative' }}>
          {i === 2 && <span style={{ position: 'absolute', top: -11, left: 18, background: '#FF6A3D', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>MOST POPULAR</span>}
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
          <button onClick={() => subscribe(p)} disabled={busyId === p.id}
            style={{ width: '100%', border: 'none', background: '#FF6A3D', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, padding: 12, borderRadius: 11, cursor: 'pointer', opacity: busyId === p.id ? 0.6 : 1 }}>
            {busyId === p.id ? '…' : `Choose ${p.name.toLowerCase()}`}
          </button>
        </div>
      ))}
      </div>
      <p style={{ color: '#6B6E8C', fontSize: 12, marginTop: 6 }}>Earn from approved submissions. Payment depends on successful completion and approval. 7-day refund window while no task has been accepted.</p>
    </div>
  );
}
