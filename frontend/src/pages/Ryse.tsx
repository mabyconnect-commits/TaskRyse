import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { Loading, Alert } from '../components/ui';
import type { RyseProgress } from '../lib/types';

const LEVELS = ['NEW', 'ACTIVE', 'SKILLED', 'PRO', 'ELITE'];

export default function Ryse() {
  const { data, loading, error } = useApi<RyseProgress>(() => api.get('/ryse-level'), []);

  return (
    <div>
      <h1 className="page-title">Ryse Level</h1>
      <p className="page-sub">Your level is derived from your work — approved tasks, quality, qualifications and compliance. Never from spend or referrals.</p>

      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Loading /> : data && (
        <>
          <div className="card card-pad">
            <div className="row wrap" style={{ gap: 8 }}>
              {LEVELS.map((lvl) => (
                <div key={lvl} className={`badge ${lvl === data.level ? 'info' : 'neutral'}`} style={{ fontSize: 13, padding: '6px 12px' }}>
                  {lvl === data.level ? '● ' : ''}{lvl}
                </div>
              ))}
            </div>
            {data.nextLevel && <p className="muted small mt">Next level: <strong>{data.nextLevel}</strong></p>}
          </div>

          <div className="grid cols-4 mt-lg">
            <div className="card stat"><div className="k">Approved tasks</div><div className="v">{data.metrics.approvedTaskCount}</div></div>
            <div className="card stat"><div className="k">Quality score</div><div className="v green">{Math.round(data.metrics.qualityScore * 100)}%</div></div>
            <div className="card stat"><div className="k">Qualifications</div><div className="v">{data.metrics.qualificationsPassed}</div></div>
            <div className="card stat"><div className="k">Rejections</div><div className="v">{data.metrics.rejectedCount}</div></div>
          </div>

          <div className="alert info mt-lg">{data.basis}. {data.note}</div>
        </>
      )}
    </div>
  );
}
