import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate, titleCase } from '../lib/format';
import { Loading, Alert } from '../components/ui';
import type { QueueItem } from '../lib/types';

// Review queue — reviewer/sponsor decisions (design card language).
export default function Review() {
  const { data, loading, error, reload } = useApi<QueueItem[]>(() => api.get('/review-queue'), []);
  const [msg, setMsg] = useState<{ k: 'error' | 'success'; t: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, action: 'approve' | 'revision' | 'reject') {
    setBusy(id + action); setMsg(null);
    try {
      const r = await api.post<{ note?: string }>(`/submissions/${id}/${action}`, {
        rubricScores: { quality: action === 'approve' ? 5 : 2 },
        note: action === 'revision' ? 'Please refine your evidence.' : undefined,
      });
      setMsg({ k: 'success', t: r.note || `Submission ${action}d.` }); reload();
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Action failed' }); }
    finally { setBusy(null); }
  }

  return (
    <div className="appx-wide">
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Review queue</div>
      <p style={{ color: '#6B6E8C', fontSize: 13.5, margin: '0 0 16px' }}>Approve to release pending earnings to withdrawable — only against funded escrow.</p>

      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {loading ? <Loading /> : !data || data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6B6E8C' }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: '#171A3A', marginBottom: 6 }}>Queue is empty</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>Submissions awaiting review will appear here.</div>
        </div>
      ) : <div className="card-grid">{data.map((q) => (
        <div key={q.submissionId} style={{ border: '1px solid #E3E4EE', background: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#171A3A', marginBottom: 8 }}>{q.taskTitle}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <Tag>{titleCase(q.difficulty)}</Tag>
            <Tag>{titleCase(q.reviewType)}</Tag>
            {q.payMinor !== undefined
              ? <Tag>{money(q.payMinor, q.currency)}</Tag>
              : <span style={{ fontSize: 11, color: '#9A9DBA' }}>pay hidden from reviewers</span>}
            <span style={{ fontSize: 11, color: '#9A9DBA' }}>submitted {shortDate(q.submittedAt)}</span>
          </div>
          <pre style={{ background: '#FAFAFC', border: '1px solid #ECEDF4', borderRadius: 10, padding: 12, fontSize: 12, overflow: 'auto', margin: '0 0 12px' }}>{JSON.stringify(q.evidence, null, 2)}</pre>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button disabled={!!busy} onClick={() => decide(q.submissionId, 'approve')} style={{ flex: 1, minWidth: 100, border: 'none', background: '#16A67A', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, padding: 10, borderRadius: 10, cursor: 'pointer' }}>{busy === q.submissionId + 'approve' ? '…' : 'Approve'}</button>
            <button disabled={!!busy} onClick={() => decide(q.submissionId, 'revision')} style={{ border: '1px solid #E3E4EE', background: '#fff', color: '#4A4D6B', fontWeight: 700, fontSize: 13, padding: '10px 14px', borderRadius: 10, cursor: 'pointer' }}>Revise</button>
            <button disabled={!!busy} onClick={() => decide(q.submissionId, 'reject')} style={{ border: 'none', background: '#E5484D', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, padding: '10px 14px', borderRadius: 10, cursor: 'pointer' }}>Reject</button>
          </div>
        </div>
      ))}</div>}
    </div>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ background: '#F4F5FA', color: '#4A4D6B', fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>{children}</span>;
}
