import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { Loading, Alert } from '../components/ui';
import type { RyseProgress } from '../lib/types';

// Faithful rebuild of the Ryse level screen (design/Taskryse App level card + Growth).
const LEVELS = [
  { key: 'NEW', name: 'New Ryser' }, { key: 'ACTIVE', name: 'Active Ryser' },
  { key: 'SKILLED', name: 'Skilled Ryser' }, { key: 'PRO', name: 'Pro Ryser' }, { key: 'ELITE', name: 'Elite Ryser' },
];

export default function Ryse() {
  const { data, loading, error } = useApi<RyseProgress>(() => api.get('/ryse-level'), []);

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', fontFamily: 'Albert Sans, sans-serif' }}>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Ryse level</div>

      {error && <Alert kind="error">{error}</Alert>}
      {loading ? <Loading /> : data && (() => {
        const idx = LEVELS.findIndex((l) => l.key === data.level);
        const pct = Math.min(100, Math.round((data.metrics.approvedTaskCount % 25) / 25 * 100));
        return (
          <>
            {/* dark level card */}
            <div style={{ background: '#171A3A', borderRadius: 18, padding: '20px', color: '#fff', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ width: 7, height: 9, background: '#FFC857', borderRadius: 1.5 }} />
                    <span style={{ width: 7, height: 15, background: '#FF8A3D', borderRadius: 1.5 }} />
                    <span style={{ width: 7, height: 21, background: '#FF6A3D', borderRadius: 1.5 }} />
                  </span>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 18 }}>{LEVELS[idx]?.name}</span>
                </div>
                <span style={{ fontSize: 12, color: '#B9BCD9' }}>Level {idx + 1} of 5</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#FFC857,#FF6A3D)', borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 12.5, color: '#B9BCD9' }}>
                {data.nextLevel ? `Keep delivering approved work to reach ${LEVELS.find((l) => l.key === data.nextLevel)?.name}` : 'Top level reached — keep your quality high'}
              </div>
            </div>

            {/* metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
              <Metric v={String(data.metrics.approvedTaskCount)} l="Approved tasks" color="#171A3A" />
              <Metric v={`${Math.round(data.metrics.qualityScore * 100)}%`} l="Quality score" color="#16A67A" />
              <Metric v={String(data.metrics.qualificationsPassed)} l="Qualifications" color="#377DFF" />
              <Metric v={String(data.metrics.rejectedCount)} l="Rejections" color="#E5484D" />
            </div>

            {/* ladder */}
            <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Your Ryse journey</div>
              {LEVELS.map((l, i) => (
                <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', opacity: i <= idx ? 1 : 0.5 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: i < idx ? '#16A67A' : i === idx ? '#FF6A3D' : '#E3E4EE', color: i <= idx ? '#fff' : '#9A9DBA', display: 'grid', placeItems: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 12 }}>{i < idx ? '✓' : i + 1}</span>
                  <span style={{ fontWeight: i === idx ? 800 : 600, fontSize: 14, color: '#171A3A', fontFamily: i === idx ? 'Sora, sans-serif' : 'Albert Sans, sans-serif' }}>{l.name}</span>
                  {i === idx && <span style={{ marginLeft: 'auto', background: 'rgba(255,106,61,0.12)', color: '#FF6A3D', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>You are here</span>}
                </div>
              ))}
            </div>

            <div style={{ background: '#FFF8EC', border: '1px solid #F2E2BC', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: '#7A5A12', lineHeight: 1.55 }}>
              {data.basis}. {data.note}
            </div>
          </>
        );
      })()}
    </div>
  );
}

function Metric({ v, l, color }: { v: string; l: string; color: string }) {
  return (
    <div style={{ border: '1px solid #E3E4EE', background: '#fff', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color }}>{v}</div>
      <div style={{ fontSize: 12, color: '#6B6E8C', marginTop: 2 }}>{l}</div>
    </div>
  );
}
