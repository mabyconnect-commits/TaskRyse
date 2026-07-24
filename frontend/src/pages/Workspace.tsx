import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money } from '../lib/format';
import { Loading, Alert } from '../components/ui';

// Faithful rebuild of "My work" (design/Taskryse App.dc.html work tab).
interface WorkAssignment {
  id: string; status: string;
  task: { id: string; title: string; payMinor: number; currency: string; difficulty: string };
  submission?: { id: string; review?: { decision: string; note?: string } | null } | null;
}
const SUBMITTABLE = ['ACCEPTED', 'IN_PROGRESS', 'DRAFT', 'REVISION_REQUESTED'];

function chip(status: string) {
  const s = status.toUpperCase();
  if (['ACCEPTED', 'IN_PROGRESS', 'DRAFT'].includes(s)) return { bg: '#FFF1EA', fg: '#E5552B', dot: '#FF6A3D', label: 'In progress' };
  if (['SUBMITTED', 'UNDER_REVIEW'].includes(s)) return { bg: '#FFF8EC', fg: '#B8860B', dot: '#E0A400', label: 'Under review' };
  if (s === 'REVISION_REQUESTED') return { bg: '#FFF8EC', fg: '#B8860B', dot: '#E0A400', label: 'Revision requested' };
  if (s === 'APPROVED') return { bg: '#EDF7F3', fg: '#0E7A59', dot: '#16A67A', label: 'Approved' };
  if (['REJECTED', 'DISPUTED'].includes(s)) return { bg: '#FDECEC', fg: '#C4383C', dot: '#E5484D', label: s === 'DISPUTED' ? 'Disputed' : 'Rejected' };
  return { bg: '#F4F5FA', fg: '#6B6E8C', dot: '#9A9DBA', label: status };
}

export default function Workspace() {
  const { data, loading, error, reload } = useApi<WorkAssignment[]>(() => api.get('/assignments'), []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [evidence, setEvidence] = useState('{\n  "choice": "A",\n  "accuracy": 4\n}');
  const [msg, setMsg] = useState<{ k: 'error' | 'success'; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(id: string) {
    setBusy(true); setMsg(null);
    try {
      let parsed: unknown;
      try { parsed = JSON.parse(evidence); } catch { throw new ApiError(400, 'bad_json', 'Evidence must be valid JSON'); }
      const r = await api.post<{ note: string }>(`/assignments/${id}/submit`, { evidence: parsed });
      setMsg({ k: 'success', t: r.note }); setOpenId(null); reload();
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Submit failed' }); }
    finally { setBusy(false); }
  }

  return (
    <div className="appx-wide">
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 14 }}>My work</div>

      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {loading ? <Loading /> : !data || data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6B6E8C' }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>🗂</div>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: '#171A3A', marginBottom: 6 }}>Nothing in progress</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Accept a task from the marketplace and it appears here.</div>
          <Link to="/marketplace" style={{ display: 'inline-block', background: '#FF6A3D', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}>Find a task</Link>
        </div>
      ) : <div className="card-grid">{data.map((a) => {
        const c = chip(a.status);
        return (
          <div key={a.id} style={{ border: '1px solid #E3E4EE', background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#171A3A', lineHeight: 1.4 }}>{a.task.title}</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{money(a.task.payMinor, a.task.currency)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SUBMITTABLE.includes(a.status) || a.submission?.review?.note ? 10 : 0, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: c.bg, color: c.fg, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />{c.label}
              </span>
            </div>

            {a.submission?.review?.note && (
              <div style={{ background: '#FFF8EC', border: '1px solid #F2E2BC', borderRadius: 10, padding: '9px 12px', fontSize: 12, color: '#7A5A12', marginBottom: 10 }}>
                Reviewer: {a.submission.review.note}
              </div>
            )}

            {SUBMITTABLE.includes(a.status) && (
              openId === a.id ? (
                <div>
                  <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} className="wl-input" style={{ fontFamily: 'monospace', minHeight: 96, marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button disabled={busy} onClick={() => submit(a.id)} style={{ flex: 1, border: 'none', background: '#16A67A', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, padding: 11, borderRadius: 10, cursor: 'pointer' }}>{busy ? '…' : 'Submit for review'}</button>
                    <button onClick={() => setOpenId(null)} style={{ border: '1px solid #E3E4EE', background: '#fff', color: '#4A4D6B', fontWeight: 700, padding: '11px 16px', borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setOpenId(a.id); setMsg(null); }} style={{ width: '100%', border: 'none', background: '#FF6A3D', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, padding: 11, borderRadius: 10, cursor: 'pointer' }}>
                  {a.status === 'REVISION_REQUESTED' ? 'Resubmit work' : 'Submit work'}
                </button>
              )
            )}
          </div>
        );
      })}</div>}
    </div>
  );
}
