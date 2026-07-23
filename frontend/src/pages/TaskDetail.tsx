import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate, titleCase } from '../lib/format';
import { EligibilityBadge, Loading, Alert } from '../components/ui';
import type { TaskDetail as TTaskDetail } from '../lib/types';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useApi<TTaskDetail>(() => api.get(`/tasks/${id}`), [id]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function accept() {
    setBusy(true);
    setMsg(null);
    try {
      const a = await api.post<{ id: string }>(`/tasks/${id}/accept`);
      setMsg({ kind: 'success', text: 'Task accepted. Opening your workspace…' });
      setTimeout(() => navigate(`/workspace?assignment=${a.id}`), 700);
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not accept task' });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (error || !data) return <Alert kind="error">{error || 'Task not found'}</Alert>;

  return (
    <div>
      <Link to="/marketplace" className="small">← Back to marketplace</Link>
      <div className="row between wrap mt" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 8 }}>{data.title}</h1>
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="badge neutral">{titleCase(data.difficulty)}</span>
            <span className="badge info">{titleCase(data.reviewType)} review</span>
            {data.isSponsored && <span className="badge sponsored">Sponsored</span>}
            <EligibilityBadge value={data.eligibility} />
          </div>
        </div>
        <div className="card stat" style={{ minWidth: 180 }}>
          <div className="k">Payment on approval</div>
          <div className="v orange money">{money(data.payMinor, data.currency)}</div>
        </div>
      </div>

      <div className="grid cols-2 mt-lg">
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Description</h3>
          <p className="small">{data.description}</p>
          <h3>Instructions</h3>
          <p className="small">{data.instructions}</p>
        </div>
        <div className="stack">
          <div className="card card-pad">
            <h3 style={{ marginTop: 0 }}>Details</h3>
            <div className="list">
              <div className="list-item row between"><span className="muted small">Sponsor</span><span className="small">{data.org?.name || '—'}</span></div>
              <div className="list-item row between"><span className="muted small">Slots</span><span className="small">{data.slotsTaken}/{data.totalSlots}</span></div>
              <div className="list-item row between"><span className="muted small">Deadline</span><span className="small">{shortDate(data.deadline)}</span></div>
              <div className="list-item row between"><span className="muted small">Countries</span><span className="small">{data.countries.join(', ') || 'All'}</span></div>
              <div className="list-item row between"><span className="muted small">Skills</span><span className="small">{data.requiredSkills.join(', ') || 'None'}</span></div>
            </div>
          </div>

          {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

          {data.eligibility === 'ELIGIBLE' ? (
            <button className="btn primary block" disabled={busy} onClick={accept}>
              {busy ? <span className="spinner" /> : 'Accept task'}
            </button>
          ) : data.eligibility === 'QUALIFICATION_REQUIRED' ? (
            <Alert kind="info">A qualification is required for this category. Visit Learning to take it.</Alert>
          ) : (
            <Alert kind="info">This task is locked for your current plan or level. Upgrade your plan to unlock more categories.</Alert>
          )}
        </div>
      </div>
    </div>
  );
}
