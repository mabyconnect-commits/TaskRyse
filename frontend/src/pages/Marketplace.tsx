import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate } from '../lib/format';
import { Loading, Alert } from '../components/ui';
import type { Task } from '../lib/types';

// Faithful rebuild of "Find tasks" (design/Taskryse App.dc.html marketplace tab).
interface Category { id: string; name: string; slug: string; family: string; }

const ELIG = {
  ELIGIBLE: { bg: 'rgba(22,166,122,0.12)', fg: '#16A67A', label: 'Eligible' },
  QUALIFICATION_REQUIRED: { bg: 'rgba(255,200,87,0.2)', fg: '#A6790A', label: 'Qualify' },
  PLAN_LOCKED: { bg: 'rgba(229,72,77,0.1)', fg: '#E5484D', label: 'Plan-locked' },
};
const rank = { ELIGIBLE: 0, QUALIFICATION_REQUIRED: 1, PLAN_LOCKED: 2 };

export default function Marketplace() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('');
  const cats = useApi<Category[]>(() => api.get('/categories'), []);
  const tasks = useApi<Task[]>(() => api.get('/tasks'), []);

  const list = (tasks.data || [])
    .filter((t) => !cat || t.categoryId === cat)
    .filter((t) => !q || t.title.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => rank[a.eligibility] - rank[b.eligibility]);

  return (
    <div className="appx-wide">
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Find tasks</div>

      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…"
        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #D7D9E6', borderRadius: 12, padding: '12px 14px', fontFamily: 'Albert Sans, sans-serif', fontSize: 14, marginBottom: 10, background: '#fff' }}
      />

      {/* category chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
        <Chip active={cat === ''} onClick={() => setCat('')}>All</Chip>
        {(cats.data || []).map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#6B6E8C', marginBottom: 10 }}>{list.length} tasks · eligible first</div>

      {tasks.error && <Alert kind="error">{tasks.error}</Alert>}
      {tasks.loading ? <Loading /> : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 20px', color: '#6B6E8C' }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: '#171A3A', marginBottom: 6 }}>No tasks match</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>Try another search or category. New tasks arrive daily — availability varies.</div>
        </div>
      ) : <div className="card-grid">{list.map((t) => {
        const e = ELIG[t.eligibility];
        const slotsLeft = t.totalSlots - t.slotsTaken;
        return (
          <Link key={t.id} to={`/task/${t.id}`} style={{ display: 'block', textAlign: 'left', border: `1px solid ${t.eligibility === 'ELIGIBLE' ? '#E3E4EE' : '#ECEDF4'}`, background: '#fff', borderRadius: 14, padding: '14px 16px', textDecoration: 'none', marginBottom: 8, opacity: t.eligibility === 'PLAN_LOCKED' ? 0.75 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#171A3A', lineHeight: 1.4 }}>{t.title}</span>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{money(t.payMinor, t.currency)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6B6E8C', marginBottom: 8 }}>
              {t.isSponsored ? 'Sponsored · ' : ''}{slotsLeft} slots · due {shortDate(t.deadline)}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag>{t.difficulty[0] + t.difficulty.slice(1).toLowerCase()}</Tag>
              {t.requiresQualification && <Tag>Qualification</Tag>}
              <span style={{ background: e.bg, color: e.fg, fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>{e.label}</span>
            </div>
          </Link>
        );
      })}</div>}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Albert Sans, sans-serif', fontSize: 12.5, fontWeight: 700, padding: '8px 14px', borderRadius: 999, background: active ? '#171A3A' : '#F1F2F8', color: active ? '#fff' : '#4A4D6B' }}>
      {children}
    </button>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span style={{ background: '#F4F5FA', color: '#4A4D6B', fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>{children}</span>;
}
