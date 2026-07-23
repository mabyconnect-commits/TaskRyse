import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate, titleCase } from '../lib/format';
import { Loading, Alert } from '../components/ui';
import type { QueueItem } from '../lib/types';

export default function Review() {
  const { data, loading, error, reload } = useApi<QueueItem[]>(() => api.get('/review-queue'), []);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(submissionId: string, action: 'approve' | 'revision' | 'reject') {
    setBusy(submissionId + action); setMsg(null);
    try {
      const res = await api.post<{ note?: string; earningsReleased?: boolean }>(`/submissions/${submissionId}/${action}`, {
        rubricScores: { quality: action === 'approve' ? 5 : 2 },
        note: action === 'revision' ? 'Please refine your evidence.' : undefined,
      });
      setMsg({ kind: 'success', text: res.note || `Submission ${action}d.` });
      reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Action failed' });
    } finally { setBusy(null); }
  }

  return (
    <div>
      <h1 className="page-title">Review Queue</h1>
      <p className="page-sub">Approve to release pending earnings into withdrawable — but only against funded sponsor escrow.</p>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {loading ? <Loading /> : !data || data.length === 0 ? (
        <div className="card card-pad muted">The queue is empty. Submissions awaiting review will appear here.</div>
      ) : (
        <div className="stack">
          {data.map((q) => (
            <div key={q.submissionId} className="card card-pad">
              <div className="row between wrap">
                <div>
                  <h3 style={{ margin: '0 0 6px' }}>{q.taskTitle}</h3>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="badge neutral">{titleCase(q.difficulty)}</span>
                    <span className="badge info">{titleCase(q.reviewType)}</span>
                    {q.payMinor !== undefined
                      ? <span className="muted small money">{money(q.payMinor, q.currency)}</span>
                      : <span className="tiny muted">payment hidden from reviewers</span>}
                    <span className="tiny muted">submitted {shortDate(q.submittedAt)}</span>
                  </div>
                </div>
              </div>

              <pre className="mt" style={{ background: 'var(--offwhite)', border: '1px solid var(--line)', borderRadius: 10, padding: 12, fontSize: 12.5, overflow: 'auto' }}>
                {JSON.stringify(q.evidence, null, 2)}
              </pre>

              <div className="row mt" style={{ gap: 10 }}>
                <button className="btn green sm" disabled={!!busy} onClick={() => decide(q.submissionId, 'approve')}>
                  {busy === q.submissionId + 'approve' ? <span className="spinner" /> : 'Approve'}
                </button>
                <button className="btn ghost sm" disabled={!!busy} onClick={() => decide(q.submissionId, 'revision')}>Request revision</button>
                <button className="btn danger sm" disabled={!!busy} onClick={() => decide(q.submissionId, 'reject')}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
