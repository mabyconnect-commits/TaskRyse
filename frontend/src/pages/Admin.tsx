import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate, titleCase } from '../lib/format';
import { StatusBadge, Loading, Alert } from '../components/ui';

interface AuditRow { id: string; actor: string; action: string; target: string; createdAt: string; }
interface KycRow { id: string; idType: string; decision: string; user: { email: string; legalName: string | null; countryCode: string } | null; }
interface WdRow { id: string; amountMinor: number; feeMinor: number; currency: string; status: string; payoutMethod: string; }
interface FraudRow { id: string; reason: string; status: string; userId: string | null; createdAt: string; }

export default function Admin() {
  const [tab, setTab] = useState<'audit' | 'kyc' | 'withdrawals' | 'fraud'>('audit');
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

  const tabs = [
    { id: 'audit', label: 'Audit log' },
    { id: 'kyc', label: 'KYC queue' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'fraud', label: 'Fraud' },
  ] as const;

  return (
    <div>
      <h1 className="page-title">Admin</h1>
      <p className="page-sub">Permission-gated operations. Every privileged mutation is written to the immutable audit log.</p>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        {tabs.map((t) => (
          <button key={t.id} className={`btn sm ${tab === t.id ? 'primary' : 'ghost'}`} onClick={() => { setTab(t.id); setMsg(null); }}>{t.label}</button>
        ))}
      </div>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div className="card card-pad">
        {tab === 'audit' && (audit.loading ? <Loading /> : (
          <table>
            <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>When</th></tr></thead>
            <tbody>
              {(audit.data || []).map((r) => (
                <tr key={r.id}><td><span className="badge neutral">{r.action}</span></td><td className="tiny muted">{r.actor.slice(0, 10)}…</td><td className="tiny muted">{r.target.slice(0, 12)}…</td><td className="tiny muted">{shortDate(r.createdAt)}</td></tr>
              ))}
              {audit.data?.length === 0 && <tr><td colSpan={4} className="muted">No entries.</td></tr>}
            </tbody>
          </table>
        ))}

        {tab === 'kyc' && (kyc.loading ? <Loading /> : (
          <table>
            <thead><tr><th>Applicant</th><th>ID type</th><th>Country</th><th>Actions</th></tr></thead>
            <tbody>
              {(kyc.data || []).map((r) => (
                <tr key={r.id}>
                  <td>{r.user?.legalName || r.user?.email}</td>
                  <td>{r.idType}</td>
                  <td>{r.user?.countryCode}</td>
                  <td className="row" style={{ gap: 6, borderBottom: 'none' }}>
                    <button className="btn green sm" onClick={() => act(() => api.post(`/admin/kyc/${r.id}/decision`, { decision: 'APPROVED' }), kyc.reload, 'KYC approved')}>Approve</button>
                    <button className="btn danger sm" onClick={() => act(() => api.post(`/admin/kyc/${r.id}/decision`, { decision: 'REJECTED' }), kyc.reload, 'KYC rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
              {kyc.data?.length === 0 && <tr><td colSpan={4} className="muted">Queue is empty.</td></tr>}
            </tbody>
          </table>
        ))}

        {tab === 'withdrawals' && (withdrawals.loading ? <Loading /> : (
          <table>
            <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {(withdrawals.data || []).map((r) => (
                <tr key={r.id}>
                  <td className="money">{money(r.amountMinor, r.currency)}</td>
                  <td>{titleCase(r.payoutMethod)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="row" style={{ gap: 6, borderBottom: 'none' }}>
                    <button className="btn green sm" onClick={() => act(() => api.post(`/admin/withdrawals/${r.id}/release`), withdrawals.reload, 'Released')}>Release</button>
                    <button className="btn ghost sm" onClick={() => act(() => api.post(`/admin/withdrawals/${r.id}/hold`), withdrawals.reload, 'Held')}>Hold</button>
                  </td>
                </tr>
              ))}
              {withdrawals.data?.length === 0 && <tr><td colSpan={4} className="muted">No in-flight payouts.</td></tr>}
            </tbody>
          </table>
        ))}

        {tab === 'fraud' && (fraud.loading ? <Loading /> : (
          <table>
            <thead><tr><th>Reason</th><th>Status</th><th>When</th><th>Actions</th></tr></thead>
            <tbody>
              {(fraud.data || []).map((r) => (
                <tr key={r.id}>
                  <td>{r.reason}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="tiny muted">{shortDate(r.createdAt)}</td>
                  <td className="row" style={{ gap: 6, borderBottom: 'none' }}>
                    <button className="btn danger sm" onClick={() => act(() => api.post(`/admin/fraud/${r.id}/freeze`), fraud.reload, 'Account frozen')}>Freeze</button>
                    <button className="btn green sm" onClick={() => act(() => api.post(`/admin/fraud/${r.id}/clear`), fraud.reload, 'Case cleared')}>Clear</button>
                  </td>
                </tr>
              ))}
              {fraud.data?.length === 0 && <tr><td colSpan={4} className="muted">No fraud cases.</td></tr>}
            </tbody>
          </table>
        ))}
      </div>
    </div>
  );
}
