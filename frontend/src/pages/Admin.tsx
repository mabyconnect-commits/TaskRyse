import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate, titleCase } from '../lib/format';
import { Loading, Alert } from '../components/ui';

// Faithful rebuild of the Admin console (design/Taskryse Admin.dc.html).
interface AuditRow { id: string; actor: string; action: string; target: string; createdAt: string; }
interface KycRow { id: string; idType: string; decision: string; user: { email: string; legalName: string | null; countryCode: string } | null; }
interface WdRow { id: string; amountMinor: number; feeMinor: number; currency: string; status: string; payoutMethod: string; }
interface FraudRow { id: string; reason: string; status: string; userId: string | null; createdAt: string; }

const INDIGO = '#171A3A', MUTED = '#6B6E8C', GOLD = '#B8860B', RED = '#E5484D', GREEN = '#0E7A59';

export default function Admin() {
  const [tab, setTab] = useState<'kyc' | 'withdrawals' | 'fraud' | 'audit'>('kyc');
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  const audit = useApi<AuditRow[]>(() => api.get('/admin/audit-log'), []);
  const kyc = useApi<KycRow[]>(() => api.get('/admin/kyc-queue'), []);
  const withdrawals = useApi<WdRow[]>(() => api.get('/admin/withdrawals'), []);
  const fraud = useApi<FraudRow[]>(() => api.get('/admin/fraud'), []);

  async function act(fn: () => Promise<unknown>, reloader: () => void, ok: string) {
    setMsg(null);
    try { await fn(); setMsg({ kind: 'success', text: ok }); reloader(); }
    catch (err) { setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Action failed' }); }
  }

  const heldMinor = (withdrawals.data || []).filter((w) => w.status === 'HELD' || w.status === 'PENDING').reduce((a, w) => a + Number(w.amountMinor), 0);
  const openFraud = (fraud.data || []).filter((f) => f.status !== 'CLEARED' && f.status !== 'RESOLVED').length;

  const stats = [
    { label: 'Pending KYC', value: String(kyc.data?.length ?? '—'), color: GOLD, delta: `${kyc.data?.length ?? 0} in queue`, deltaColor: kyc.data?.length ? RED : MUTED },
    { label: 'Withdrawals held', value: money(heldMinor), color: GOLD, delta: `${(withdrawals.data || []).length} in flight`, deltaColor: GOLD },
    { label: 'Open fraud cases', value: String(openFraud), color: openFraud ? RED : INDIGO, delta: openFraud ? 'needs review' : 'all clear', deltaColor: openFraud ? RED : GREEN },
    { label: 'Audit entries', value: String(audit.data?.length ?? '—'), color: INDIGO, delta: 'immutable log', deltaColor: MUTED },
  ];

  const attention: { icon: string; iconBg: string; iconFg: string; title: string; sub: string; to: typeof tab }[] = [];
  if (openFraud) attention.push({ icon: '⚑', iconBg: '#FDF6F6', iconFg: RED, title: `${openFraud} open fraud case${openFraud === 1 ? '' : 's'}`, sub: 'Automated signals awaiting human review', to: 'fraud' });
  if (kyc.data?.length) attention.push({ icon: '🪪', iconBg: '#FFF8EC', iconFg: GOLD, title: `${kyc.data.length} KYC submission${kyc.data.length === 1 ? '' : 's'}`, sub: 'Identity checks pending a decision', to: 'kyc' });
  if (heldMinor > 0) attention.push({ icon: '💸', iconBg: '#FFF8EC', iconFg: GOLD, title: `${money(heldMinor)} in payouts held`, sub: 'Withdrawals awaiting compliance release', to: 'withdrawals' });

  const tabs = [
    { id: 'kyc', label: 'KYC queue' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'fraud', label: 'Fraud & risk' },
    { id: 'audit', label: 'Audit log' },
  ] as const;

  return (
    <div className="appx-wide" style={{ fontFamily: 'Albert Sans, sans-serif' }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: INDIGO }}>Platform overview</div>
        <div style={{ fontSize: 13, color: MUTED }}>Live operational health · Nigeria region</div>
      </div>

      {/* overview stat tiles */}
      <div className="admin-stats" style={{ margin: '16px 0' }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 21, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: s.deltaColor, marginTop: 4 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* needs attention */}
      {attention.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Needs attention</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {attention.map((a) => (
              <button key={a.title} onClick={() => { setTab(a.to); setMsg(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: '#fff', border: '1px solid #E3E4EE', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: a.iconBg, color: a.iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{a.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: INDIGO }}>{a.title}</span>
                  <span style={{ display: 'block', fontSize: 12, color: MUTED }}>{a.sub}</span>
                </span>
                <span style={{ color: '#FF6A3D', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>Open →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setMsg(null); }}
            style={{ border: tab === t.id ? 'none' : '1px solid #E3E4EE', background: tab === t.id ? INDIGO : '#fff', color: tab === t.id ? '#fff' : '#4A4D6B', fontFamily: 'Sora, sans-serif', fontSize: 12.5, fontWeight: 700, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 16, padding: 18 }}>
        {tab === 'kyc' && (
          <Section title="KYC verification queue" sub="Approve or reject identity submissions. Every decision is written to the audit log.">
            {kyc.loading ? <Loading /> : (kyc.data || []).length === 0 ? <Empty text="Queue is empty." /> : (kyc.data || []).map((r) => (
              <RowCard key={r.id}
                title={r.user?.legalName || r.user?.email || 'Applicant'}
                meta={`${r.idType} · ${r.user?.countryCode || '—'}`}
                actions={<>
                  <MiniBtn kind="green" onClick={() => act(() => api.post(`/admin/kyc/${r.id}/decision`, { decision: 'APPROVED' }), kyc.reload, 'KYC approved')}>Approve</MiniBtn>
                  <MiniBtn kind="red" onClick={() => act(() => api.post(`/admin/kyc/${r.id}/decision`, { decision: 'REJECTED' }), kyc.reload, 'KYC rejected')}>Reject</MiniBtn>
                </>} />
            ))}
          </Section>
        )}

        {tab === 'withdrawals' && (
          <Section title="Withdrawal management" sub="Payouts held for compliance review. Approving releases to the payment rail.">
            {withdrawals.loading ? <Loading /> : (withdrawals.data || []).length === 0 ? <Empty text="No in-flight payouts." /> : (withdrawals.data || []).map((r) => (
              <RowCard key={r.id}
                title={money(r.amountMinor, r.currency)}
                meta={`${titleCase(r.payoutMethod)} · ${titleCase(r.status)}`}
                actions={<>
                  <MiniBtn kind="green" onClick={() => act(() => api.post(`/admin/withdrawals/${r.id}/release`), withdrawals.reload, 'Released')}>Release</MiniBtn>
                  <MiniBtn kind="ghost" onClick={() => act(() => api.post(`/admin/withdrawals/${r.id}/hold`), withdrawals.reload, 'Held')}>Hold</MiniBtn>
                </>} />
            ))}
          </Section>
        )}

        {tab === 'fraud' && (
          <Section title="Fraud & risk" sub="Automated signals surfaced for human review. Freezing an account holds pending earnings pending investigation.">
            {fraud.loading ? <Loading /> : (fraud.data || []).length === 0 ? <Empty text="No fraud cases." /> : (fraud.data || []).map((r) => (
              <RowCard key={r.id}
                title={r.reason}
                meta={`${titleCase(r.status)} · ${shortDate(r.createdAt)}`}
                actions={<>
                  <MiniBtn kind="red" onClick={() => act(() => api.post(`/admin/fraud/${r.id}/freeze`), fraud.reload, 'Account frozen')}>Freeze</MiniBtn>
                  <MiniBtn kind="green" onClick={() => act(() => api.post(`/admin/fraud/${r.id}/clear`), fraud.reload, 'Case cleared')}>Clear</MiniBtn>
                </>} />
            ))}
          </Section>
        )}

        {tab === 'audit' && (
          <Section title="Audit log" sub="Every privileged mutation is written to this immutable log.">
            {audit.loading ? <Loading /> : (audit.data || []).length === 0 ? <Empty text="No entries." /> : (audit.data || []).map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #F0F1F6' }}>
                <span style={{ background: '#F4F5FA', color: '#4A4D6B', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{r.action}</span>
                <span style={{ flex: 1, fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.actor.slice(0, 8)}… → {r.target.slice(0, 12)}…</span>
                <span style={{ fontSize: 11.5, color: MUTED, whiteSpace: 'nowrap' }}>{shortDate(r.createdAt)}</span>
              </div>
            ))}
          </Section>
        )}
      </div>

      <div style={{ background: '#FFF8EC', border: '1px solid #F2E2BC', borderRadius: 12, padding: '11px 14px', fontSize: 11.5, color: '#7A5A12', lineHeight: 1.55, marginTop: 14 }}>
        Plan configuration controls eligibility only. It can never be linked to promised earnings, returns or task guarantees anywhere in the product.
      </div>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15.5, fontWeight: 700, color: INDIGO }}>{title}</div>
      <div style={{ fontSize: 12.5, color: MUTED, margin: '3px 0 12px', lineHeight: 1.5 }}>{sub}</div>
      {children}
    </div>
  );
}

function RowCard({ title, meta, actions }: { title: string; meta: string; actions: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 0', borderBottom: '1px solid #F0F1F6' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: INDIGO }}>{title}</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{meta}</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>{actions}</div>
    </div>
  );
}

function MiniBtn({ kind, onClick, children }: { kind: 'green' | 'red' | 'ghost'; onClick: () => void; children: React.ReactNode }) {
  const styles = {
    green: { background: '#EDF7F3', color: GREEN, border: '1px solid #C7E8DB' },
    red: { background: '#FDF6F6', color: '#B33A3E', border: '1px solid #F2D6D7' },
    ghost: { background: '#fff', color: '#4A4D6B', border: '1px solid #E3E4EE' },
  }[kind];
  return (
    <button onClick={onClick} style={{ ...styles, fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>{children}</button>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ color: MUTED, fontSize: 13, padding: '16px 0' }}>{text}</div>;
}
