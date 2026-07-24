import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate, titleCase } from '../lib/format';
import { Loading, Alert } from '../components/ui';
import type { Wallet, WalletEntry } from '../lib/types';

// Faithful rebuild of the Wallet screen (design/Taskryse App.dc.html wallet tab).
const CREDIT = ['TASK_PAYMENT', 'REFUND', 'PROMO'];

export default function WalletPage() {
  const wallet = useApi<Wallet>(() => api.get('/wallet'), []);
  const txns = useApi<WalletEntry[]>(() => api.get('/transactions'), []);
  const [panel, setPanel] = useState<'none' | 'withdraw' | 'bill'>('none');
  const [msg, setMsg] = useState<{ k: 'error' | 'success'; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [wd, setWd] = useState({ amount: '50000', pin: '1234', otp: '123456' });
  const [bill, setBill] = useState({ service: 'AIRTIME', ref: '08012345678', amount: '20000' });

  function refresh() { wallet.reload(); txns.reload(); }

  async function withdraw() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ status: string; feeMinor: number }>('/withdrawals', { amountMinor: Number(wd.amount), payoutMethod: 'BANK', destinationRef: '0123456789', pin: wd.pin, otp: wd.otp });
      setMsg({ k: 'success', t: `Withdrawal ${titleCase(r.status)} (fee ${money(r.feeMinor)}).` }); setPanel('none'); refresh();
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Withdrawal failed' }); }
    finally { setBusy(false); }
  }
  async function payBill() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ status: string }>('/bills/pay', { service: bill.service, provider: 'Demo', customerRef: bill.ref, amountMinor: Number(bill.amount) });
      setMsg({ k: 'success', t: `Bill ${titleCase(r.status)}.` }); setPanel('none'); refresh();
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Bill failed' }); }
    finally { setBusy(false); }
  }

  const w = wallet.data;
  return (
    <div style={{ maxWidth: 460, margin: '0 auto', fontFamily: 'Albert Sans, sans-serif' }}>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Wallet</div>

      {wallet.loading ? <Loading /> : w && (
        <>
          {/* dark balance card */}
          <div style={{ background: '#171A3A', borderRadius: 18, padding: 20, color: '#fff', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#8B8FB3', marginBottom: 4 }}>Withdrawable balance</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 800, marginBottom: 14 }}>{money(w.withdrawableMinor, w.currency)}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setPanel(panel === 'withdraw' ? 'none' : 'withdraw'); setMsg(null); }} style={{ flex: 1, border: 'none', background: '#FF6A3D', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, padding: 12, borderRadius: 11, cursor: 'pointer' }}>Withdraw</button>
              <button onClick={() => { setPanel(panel === 'bill' ? 'none' : 'bill'); setMsg(null); }} style={{ flex: 1, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, padding: 12, borderRadius: 11, cursor: 'pointer' }}>Pay bills</button>
            </div>
          </div>

          {msg && <Alert kind={msg.k}>{msg.t}</Alert>}

          {panel === 'withdraw' && (
            <Panel title="Withdraw to bank">
              <Row label="Amount (minor units)"><input className="wl-input" value={wd.amount} onChange={(e) => setWd({ ...wd, amount: e.target.value })} /></Row>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Row label="PIN"><input className="wl-input" value={wd.pin} onChange={(e) => setWd({ ...wd, pin: e.target.value })} /></Row>
                <Row label="OTP"><input className="wl-input" value={wd.otp} onChange={(e) => setWd({ ...wd, otp: e.target.value })} /></Row>
              </div>
              <button disabled={busy} onClick={withdraw} className="wl-cta">{busy ? '…' : 'Confirm withdrawal'}</button>
              <div style={{ fontSize: 11, color: '#9A9DBA', marginTop: 6 }}>Requires PIN + OTP. A country fee applies. Demo PIN 1234, any 6-digit OTP.</div>
            </Panel>
          )}
          {panel === 'bill' && (
            <Panel title="Pay a bill">
              <Row label="Service">
                <select className="wl-input" value={bill.service} onChange={(e) => setBill({ ...bill, service: e.target.value })}>
                  {['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'INTERNET', 'EDUCATION'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                </select>
              </Row>
              <Row label="Customer ref"><input className="wl-input" value={bill.ref} onChange={(e) => setBill({ ...bill, ref: e.target.value })} /></Row>
              <Row label="Amount (minor units)"><input className="wl-input" value={bill.amount} onChange={(e) => setBill({ ...bill, amount: e.target.value })} /></Row>
              <button disabled={busy} onClick={payBill} className="wl-cta">{busy ? '…' : 'Pay bill'}</button>
            </Panel>
          )}

          {/* pending + promo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ border: '1px solid #E3E4EE', background: '#fff', borderRadius: 14, padding: '13px 15px' }}>
              <div style={{ fontSize: 11.5, color: '#6B6E8C', marginBottom: 3 }}>Pending review</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: '#B8860B' }}>{money(w.pendingMinor, w.currency)}</div>
            </div>
            <div style={{ border: '1px solid #E3E4EE', background: '#fff', borderRadius: 14, padding: '13px 15px' }}>
              <div style={{ fontSize: 11.5, color: '#6B6E8C', marginBottom: 3 }}>Promo credits <span style={{ fontSize: 10 }}>(not withdrawable)</span></div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 800, color: '#4A4D6B' }}>{money(w.promoCreditMinor, w.currency)}</div>
            </div>
          </div>

          {/* transactions */}
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Recent transactions</div>
          {txns.loading ? <Loading /> : (txns.data || []).length === 0 ? (
            <div style={{ color: '#6B6E8C', fontSize: 13, padding: '10px 2px' }}>No transactions yet.</div>
          ) : (txns.data || []).map((tx) => {
            const credit = CREDIT.includes(tx.type) && tx.status !== 'rejected' && tx.status !== 'revision';
            return (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderBottom: '1px solid #ECEDF4', padding: '12px 2px' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{titleCase(tx.type)}</div>
                  <div style={{ fontSize: 11.5, color: '#6B6E8C' }}>{titleCase(tx.status)} · {shortDate(tx.createdAt)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 800, color: credit ? '#16A67A' : '#171A3A' }}>
                    {credit ? '+' : '−'}{money(tx.netMinor || tx.grossMinor, tx.currency)}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#4A4D6B' }}>{label}</div>{children}</div>;
}
