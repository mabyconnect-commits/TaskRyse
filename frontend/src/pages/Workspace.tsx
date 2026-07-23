import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, titleCase } from '../lib/format';
import { StatusBadge, Loading, Alert } from '../components/ui';

interface WorkAssignment {
  id: string;
  status: string;
  task: { id: string; title: string; payMinor: number; currency: string; difficulty: string };
  submission?: { id: string; review?: { decision: string; note?: string } | null } | null;
}

const SUBMITTABLE = ['ACCEPTED', 'IN_PROGRESS', 'DRAFT', 'REVISION_REQUESTED'];

export default function Workspace() {
  const { data, loading, error, reload } = useApi<WorkAssignment[]>(() => api.get('/assignments'), []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState('{\n  "choice": "A",\n  "accuracy": 4\n}');
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitWork(id: string) {
    setBusy(true);
    setMsg(null);
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(evidence); } catch { throw new ApiError(400, 'bad_json', 'Evidence must be valid JSON'); }
      const res = await api.post<{ status: string; note: string }>(`/assignments/${id}/submit`, { evidence: parsed });
      setMsg({ kind: 'success', text: res.note });
      setOpenId(null);
      reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Submit failed' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">My Workspace</h1>
      <p className="page-sub">Your accepted tasks. Submit work to move payment into pending — it becomes withdrawable once approved against funded escrow.</p>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <div className="card card-pad muted">No assignments yet. Accept a task from the marketplace to get started.</div>
      ) : (
        <div className="stack">
          {data.map((a) => (
            <div key={a.id} className="card card-pad">
              <div className="row between wrap">
                <div>
                  <h3 style={{ margin: '0 0 6px' }}>{a.task.title}</h3>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="badge neutral">{titleCase(a.task.difficulty)}</span>
                    <StatusBadge status={a.status} />
                    <span className="muted small money">{money(a.task.payMinor, a.task.currency)}</span>
                  </div>
                </div>
                {SUBMITTABLE.includes(a.status) && (
                  <button className="btn primary sm" onClick={() => { setOpenId(openId === a.id ? null : a.id); setMsg(null); }}>
                    {openId === a.id ? 'Close' : a.status === 'REVISION_REQUESTED' ? 'Resubmit' : 'Submit work'}
                  </button>
                )}
              </div>

              {a.submission?.review?.note && (
                <div className="alert info" style={{ marginTop: 12, marginBottom: 0 }}>
                  Reviewer note: {a.submission.review.note}
                </div>
              )}

              {openId === a.id && (
                <div className="mt">
                  <label className="label">Evidence (JSON)</label>
                  <textarea
                    className="input"
                    style={{ fontFamily: 'monospace', minHeight: 120 }}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                  />
                  <div className="row mt" style={{ gap: 10 }}>
                    <button className="btn green sm" disabled={busy} onClick={() => submitWork(a.id)}>
                      {busy ? <span className="spinner" /> : 'Submit for review'}
                    </button>
                    <span className="tiny muted">Payment stays pending until a reviewer approves.</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
