import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, shortDate, titleCase } from '../lib/format';
import { Stat, StatusBadge, Loading, Alert, Field } from '../components/ui';
import type { Wallet, WalletEntry } from '../lib/types';

export default function WalletPage() {
  const wallet = useApi<Wallet>(() => api.get('/wallet'), []);
  const txns = useApi<WalletEntry[]>(() => api.get('/transactions'), []);
  const [tab, setTab] = useState<'withdraw' | 'bill'>('withdraw');
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Withdrawal form
  const [wdAmount, setWdAmount] = useState('50000');
  const [pin, setPin] = useState('1234');
  const [otp, setOtp] = useState('123456');

  // Bill form
  const [billAmount, setBillAmount] = useState('20000');
  const [billService, setBillService] = useState('AIRTIME');
  const [customerRef, setCustomerRef] = useState('08012345678');

  function refresh() { wallet.reload(); txns.reload(); }

  async function withdraw() {
    setBusy(true); setMsg(null);
    try {
      const res = await api.post<{ status: string; feeMinor: number }>('/withdrawals', {
        amountMinor: Number(wdAmount), payoutMethod: 'BANK', destinationRef: '0123456789', pin, otp,
      });
      setMsg({ kind: 'success', text: `Withdrawal ${titleCase(res.status)} (fee ${money(res.feeMinor)}).` });
      refresh();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Withdrawal failed' });
    } finally { setBusy(false); }
  }

  async function payBill() {
    setBusy(true); setMsg(null);
    try {
      const res = await api.post<{ status: string }>('/bills/pay', {
        service: billService, provider: 'Demo', customerRef, amountMinor: Number(billAmount),
      });
      setMsg({ kind: 'success', text: `Bill ${titleCase(res.status)}.` });
      refresh();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Bill payment failed' });
    } finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="page-title">Wallet</h1>
      <p className="page-sub">Earned funds only. Promo credit is a separate balance and is never withdrawable.</p>

      {wallet.loading ? <Loading /> : wallet.data && (
        <div className="grid cols-4">
          <Stat label="Withdrawable" value={money(wallet.data.withdrawableMinor, wallet.data.currency)} tone="green" />
          <Stat label="Pending" value={money(wallet.data.pendingMinor, wallet.data.currency)} />
          <Stat label="Total earned" value={money(wallet.data.totalEarnedMinor, wallet.data.currency)} />
          <Stat label="Promo credit" value={money(wallet.data.promoCreditMinor, wallet.data.currency)} tone="yellow" />
        </div>
      )}

      <div className="grid cols-2 mt-lg">
        <div className="card card-pad">
          <div className="row" style={{ gap: 8, marginBottom: 14 }}>
            <button className={`btn sm ${tab === 'withdraw' ? 'primary' : 'ghost'}`} onClick={() => { setTab('withdraw'); setMsg(null); }}>Withdraw</button>
            <button className={`btn sm ${tab === 'bill' ? 'primary' : 'ghost'}`} onClick={() => { setTab('bill'); setMsg(null); }}>Pay a bill</button>
          </div>

          {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

          {tab === 'withdraw' ? (
            <>
              <Field label="Amount (minor units)"><input className="input" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} /></Field>
              <div className="grid cols-2">
                <Field label="PIN"><input className="input" value={pin} onChange={(e) => setPin(e.target.value)} /></Field>
                <Field label="OTP (6 digits)"><input className="input" value={otp} onChange={(e) => setOtp(e.target.value)} /></Field>
              </div>
              <button className="btn primary block" disabled={busy} onClick={withdraw}>{busy ? <span className="spinner" /> : 'Withdraw'}</button>
              <p className="tiny muted mt">Requires PIN + OTP. A country withdrawal fee applies. Demo PIN <code>1234</code>, any 6-digit OTP.</p>
            </>
          ) : (
            <>
              <Field label="Service">
                <select className="select" value={billService} onChange={(e) => setBillService(e.target.value)}>
                  {['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'INTERNET', 'EDUCATION'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                </select>
              </Field>
              <Field label="Customer ref (phone/meter)"><input className="input" value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} /></Field>
              <Field label="Amount (minor units)"><input className="input" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} /></Field>
              <button className="btn primary block" disabled={busy} onClick={payBill}>{busy ? <span className="spinner" /> : 'Pay bill'}</button>
              <p className="tiny muted mt">Paid from your withdrawable balance.</p>
            </>
          )}
        </div>

        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Recent transactions</h3>
          {txns.loading ? <Loading /> : !txns.data || txns.data.length === 0 ? (
            <p className="muted small">No transactions yet.</p>
          ) : (
            <div style={{ maxHeight: 420, overflow: 'auto' }}>
              <table>
                <thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {txns.data.map((e) => (
                    <tr key={e.id}>
                      <td>{titleCase(e.type)}</td>
                      <td className="money">{money(e.netMinor, e.currency)}{e.feeMinor ? <span className="tiny muted"> +{money(e.feeMinor)} fee</span> : null}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td className="tiny muted">{shortDate(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
