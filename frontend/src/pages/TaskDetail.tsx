import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate } from '../lib/format';
import { Loading, Alert } from '../components/ui';
import type { TaskDetail as TTaskDetail } from '../lib/types';

// Faithful rebuild of the Task-details screen (design/Taskryse App.dc.html).
const MINS: Record<string, number> = { BEGINNER: 15, INTERMEDIATE: 30, EXPERT: 60 };
const CHIP = { background: '#F4F5FA', color: '#4A4D6B', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999 } as const;

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi<TTaskDetail & { category?: { name: string } }>(() => api.get(`/tasks/${id}`), [id]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: 'error' | 'success'; t: string } | null>(null);

  if (loading) return <Loading />;
  if (error || !data) return <Alert kind="error">{error || 'Task not found'}</Alert>;

  const e = data.eligibility;
  const eligChip = e === 'ELIGIBLE' ? { bg: '#EDF7F3', fg: '#0E7A59', label: 'Eligible' }
    : e === 'QUALIFICATION_REQUIRED' ? { bg: '#FFF8EC', fg: '#B8860B', label: 'Qualification required' }
    : { bg: '#F4F5FA', fg: '#6B6E8C', label: '🔒 Plan upgrade' };
  const slotsLeft = data.totalSlots - data.slotsTaken;

  async function accept() {
    setBusy(true); setMsg(null);
    try {
      await api.post(`/tasks/${id}/accept`);
      setMsg({ k: 'success', t: 'Accepted — opening My Work…' });
      setTimeout(() => navigate('/workspace'), 700);
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Could not accept' }); }
    finally { setBusy(false); }
  }
  async function takeQualification() {
    setBusy(true); setMsg(null);
    try {
      const learning = await api.get<{ courses: { qualificationId: string; category: string | null }[] }>('/learning');
      const course = learning.courses.find((c) => c.category === data!.category?.name) || learning.courses[0];
      if (!course) throw new ApiError(404, 'no_qual', 'No qualification available for this category');
      const res = await api.post<{ passed: boolean }>(`/qualifications/${course.qualificationId}/attempt`, { score: 100 });
      setMsg({ k: res.passed ? 'success' : 'error', t: res.passed ? 'Qualification passed — you can now accept.' : 'Not passed, try again.' });
      reload();
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Qualification failed' }); }
    finally { setBusy(false); }
  }

  const btn = e === 'ELIGIBLE' ? { label: busy ? '…' : `Accept task · due ${shortDate(data.deadline)}`, bg: '#FF6A3D', fg: '#fff', act: accept }
    : e === 'QUALIFICATION_REQUIRED' ? { label: busy ? '…' : 'Take qualification (~10 min)', bg: '#171A3A', fg: '#FFC857', act: takeQualification }
    : { label: 'Upgrade your plan →', bg: '#171A3A', fg: '#fff', act: () => navigate('/plans') };

  return (
    <div className="appx" style={{ background: '#FAFAFC', border: '1px solid #ECEDF4', borderRadius: 20, overflow: 'hidden' }}>
      {/* header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #ECEDF4', background: '#fff' }}>
        <Link to="/marketplace" style={{ border: 'none', background: '#F4F5FA', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none', color: '#171A3A' }}>←</Link>
        <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15 }}>Task details</span>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={CHIP}>{data.category?.name || 'Task'}</span>
          <span style={CHIP}>{data.difficulty[0] + data.difficulty.slice(1).toLowerCase()}</span>
          <span style={{ background: eligChip.bg, color: eligChip.fg, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{eligChip.label}</span>
        </div>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.3 }}>{data.title}</h2>
        <div style={{ fontSize: 13, color: '#6B6E8C', marginBottom: 16 }}>
          {data.org?.name || 'Sponsor'} {data.org?.verificationStatus === 'verified' && <span style={{ color: '#0E7A59', fontWeight: 700 }}>✓ Verified sponsor</span>}
        </div>

        {/* payment box */}
        <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Cell k="Payment on approval" v={money(data.payMinor, data.currency)} big />
            <Cell k="Estimated time" v={`~${MINS[data.difficulty] || 20} min`} big />
            <Cell k="Deadline" v={shortDate(data.deadline)} />
            <Cell k="Slots left" v={String(slotsLeft)} />
          </div>
        </div>

        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>What you'll do</div>
        <p style={{ fontSize: 13.5, color: '#4A4D6B', lineHeight: 1.65, margin: '0 0 14px' }}>{data.description} {data.instructions}</p>

        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>Review &amp; payment</div>
        <p style={{ fontSize: 13, color: '#4A4D6B', lineHeight: 1.65, margin: '0 0 14px' }}>
          Submissions are reviewed against a published rubric. Approval moves {money(data.payMinor, data.currency)} to your
          withdrawable balance. Revisions are permitted once; rejections can be appealed.
        </p>

        {e === 'QUALIFICATION_REQUIRED' && (
          <div style={{ background: '#FFF8EC', border: '1px solid #F2E2BC', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, color: '#7A5A12', lineHeight: 1.55, marginBottom: 12 }}>
            <strong>Qualification required.</strong> A short scored test (~10 min) unlocks this task category permanently.
          </div>
        )}
        {e === 'PLAN_LOCKED' && (
          <div style={{ background: '#F4F5FA', border: '1px solid #E1E2EC', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, color: '#4A4D6B', lineHeight: 1.55, marginBottom: 12 }}>
            <strong>🔒 Plan upgrade required.</strong> This category isn't in your current plan. Upgrading unlocks eligibility — it doesn't guarantee tasks or earnings.
          </div>
        )}

        {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      </div>

      {/* action */}
      <div style={{ padding: '14px 20px 18px', background: '#fff', borderTop: '1px solid #ECEDF4' }}>
        <button onClick={btn.act} disabled={busy} style={{ width: '100%', border: 'none', background: btn.bg, color: btn.fg, fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, padding: 15, borderRadius: 13, cursor: busy ? 'default' : 'pointer' }}>
          {btn.label}
        </button>
      </div>
    </div>
  );
}

function Cell({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#6B6E8C' }}>{k}</div>
      <div style={{ fontFamily: big ? 'Sora, sans-serif' : 'Albert Sans, sans-serif', fontSize: big ? 17 : 14, fontWeight: big ? 800 : 700 }}>{v}</div>
    </div>
  );
}
