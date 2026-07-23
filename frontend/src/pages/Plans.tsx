import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, titleCase } from '../lib/format';
import { Loading, Alert } from '../components/ui';
import type { Plan } from '../lib/types';

export default function Plans() {
  const { data, loading, error } = useApi<Plan[]>(() => api.get('/plans'), []);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function subscribe(plan: Plan) {
    setBusyId(plan.id); setMsg(null);
    try {
      await api.post('/subscriptions', { planId: plan.id });
      setMsg({ kind: 'success', text: `Subscribed to ${titleCase(plan.name)}. This unlocks eligible categories only — it creates no earnings.` });
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Subscription failed' });
    } finally { setBusyId(null); }
  }

  return (
    <div>
      <h1 className="page-title">Plans</h1>
      <p className="page-sub">A plan unlocks eligible task categories. It never grants tasks, earnings or returns.</p>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {loading ? <Loading /> : (
        <div className="grid cols-4">
          {(data || []).map((p) => (
            <div key={p.id} className="card card-pad stack" style={{ gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>{titleCase(p.name)}</h3>
                <div className="money" style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                  {money(p.priceMinor, p.currency)}
                  <span className="tiny muted"> /{p.billingPeriod.toLowerCase()}</span>
                </div>
              </div>
              <div className="list" style={{ fontSize: 13 }}>
                <div className="list-item">Up to <strong>{p.maxActiveApplications >= 9999 ? 'unlimited' : p.maxActiveApplications}</strong> active tasks</div>
                <div className="list-item">Categories: {p.categoryScope.join(', ')}</div>
                <div className="list-item">{titleCase(p.qualificationAccess)} qualifications · {titleCase(p.supportTier)} support</div>
                <div className="list-item">{p.sponsoredAccess ? 'Sponsored access included' : 'No sponsored access'}</div>
              </div>
              <button className="btn primary block" disabled={busyId === p.id} onClick={() => subscribe(p)}>
                {busyId === p.id ? <span className="spinner" /> : 'Choose plan'}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="tiny muted mt-lg">
        Earn from approved submissions. Payment depends on successful completion and approval. 7-day refund window applies while no task has been accepted.
      </p>
    </div>
  );
}
