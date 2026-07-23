import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate, titleCase } from '../lib/format';
import { EligibilityBadge, Loading, Alert } from '../components/ui';
import type { Task } from '../lib/types';

export default function Marketplace() {
  const [difficulty, setDifficulty] = useState('');
  const [onlyEligible, setOnlyEligible] = useState(false);
  const { data, loading, error } = useApi<Task[]>(
    () => api.get(`/tasks${difficulty ? `?difficulty=${difficulty}` : ''}`),
    [difficulty],
  );

  const tasks = (data || []).filter((t) => !onlyEligible || t.eligibility === 'ELIGIBLE');

  return (
    <div>
      <h1 className="page-title">Marketplace</h1>
      <p className="page-sub">Task availability varies. Eligibility is computed for you from your plan, level and qualifications.</p>

      <div className="card card-pad row between wrap" style={{ marginBottom: 18 }}>
        <div className="row wrap" style={{ gap: 10 }}>
          <select className="select" style={{ width: 180 }} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">All difficulties</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="EXPERT">Expert</option>
          </select>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} />
            Eligible only
          </label>
        </div>
        <span className="muted small">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {loading ? (
        <Loading />
      ) : tasks.length === 0 ? (
        <div className="card card-pad muted">No tasks match your filters.</div>
      ) : (
        <div className="grid cols-2">
          {tasks.map((t) => (
            <div key={t.id} className="card card-pad stack" style={{ gap: 10 }}>
              <div className="row between">
                <span className="badge neutral">{titleCase(t.difficulty)}</span>
                <div className="row" style={{ gap: 6 }}>
                  {t.isSponsored && <span className="badge sponsored">Sponsored</span>}
                  <EligibilityBadge value={t.eligibility} />
                </div>
              </div>
              <Link to={`/task/${t.id}`} style={{ color: 'var(--ink)' }}>
                <h3 style={{ margin: '2px 0' }}>{t.title}</h3>
              </Link>
              <div className="row between">
                <span className="money" style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18 }}>
                  {money(t.payMinor, t.currency)}
                </span>
                <span className="muted small">{t.slotsTaken}/{t.totalSlots} slots</span>
              </div>
              <div className="row between tiny muted">
                <span>Due {shortDate(t.deadline)}</span>
                {t.requiresQualification && <span>Qualification gated</span>}
              </div>
              <Link to={`/task/${t.id}`} className="btn ghost sm">View task</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
