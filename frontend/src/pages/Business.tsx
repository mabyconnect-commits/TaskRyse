import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, titleCase } from '../lib/format';
import { StatusBadge, Loading, Alert, Field } from '../components/ui';

interface OrgMembership {
  role: string;
  org: {
    id: string;
    name: string;
    verificationStatus: string;
    escrowBalanceMinor: number;
    campaigns: { id: string; status: string; rewardPoolMinor: number; fundedMinor: number; task: { id: string; title: string; status: string } | null }[];
  };
}
interface Category { id: string; name: string; family: string; }

export default function Business() {
  const orgs = useApi<OrgMembership[]>(() => api.get('/orgs'), []);
  const cats = useApi<Category[]>(() => api.get('/categories'), []);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Create-campaign form
  const [orgId, setOrgId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('New evaluation batch');
  const [payMinor, setPayMinor] = useState('150000');
  const [totalSlots, setTotalSlots] = useState('10');

  async function createCampaign() {
    setBusy(true); setMsg(null);
    try {
      const selectedOrg = orgId || orgs.data?.[0]?.org.id;
      const selectedCat = categoryId || cats.data?.[0]?.id;
      if (!selectedOrg || !selectedCat) throw new ApiError(400, 'missing', 'Pick an organisation and category');
      await api.post('/campaigns', {
        orgId: selectedOrg, categoryId: selectedCat, title,
        description: 'Sponsored task created from the console.', instructions: 'Follow the rubric carefully.',
        payMinor: Number(payMinor), totalSlots: Number(totalSlots),
      });
      setMsg({ kind: 'success', text: 'Campaign created. Fund its escrow to take the task live.' });
      orgs.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Create failed' });
    } finally { setBusy(false); }
  }

  async function fund(campaignId: string, rewardPoolMinor: number) {
    setBusy(true); setMsg(null);
    try {
      const res = await api.post<{ fullyFunded: boolean }>(`/campaigns/${campaignId}/fund`, { amountMinor: rewardPoolMinor });
      setMsg({ kind: 'success', text: res.fullyFunded ? 'Fully funded — task is now live.' : 'Escrow funded.' });
      orgs.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof ApiError ? err.message : 'Funding failed' });
    } finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="page-title">Business</h1>
      <p className="page-sub">Create and fund task campaigns. Earnings are released to contributors only against funded escrow.</p>

      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div className="grid cols-2">
        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Create a campaign</h3>
          {orgs.loading || cats.loading ? <Loading /> : (
            <>
              <Field label="Organisation">
                <select className="select" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                  {(orgs.data || []).map((m) => <option key={m.org.id} value={m.org.id}>{m.org.name}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <div className="grid cols-2">
                <Field label="Pay per task (minor)"><input className="input" value={payMinor} onChange={(e) => setPayMinor(e.target.value)} /></Field>
                <Field label="Slots"><input className="input" value={totalSlots} onChange={(e) => setTotalSlots(e.target.value)} /></Field>
              </div>
              <button className="btn primary block" disabled={busy} onClick={createCampaign}>{busy ? <span className="spinner" /> : 'Create campaign'}</button>
            </>
          )}
        </div>

        <div className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Your organisations</h3>
          {orgs.loading ? <Loading /> : !orgs.data || orgs.data.length === 0 ? (
            <p className="muted small">You are not a member of any organisation yet.</p>
          ) : orgs.data.map((m) => (
            <div key={m.org.id} className="mt">
              <div className="row between">
                <strong>{m.org.name}</strong>
                <span className="badge neutral">{titleCase(m.org.verificationStatus)}</span>
              </div>
              <div className="tiny muted">Escrow balance {money(m.org.escrowBalanceMinor)}</div>
              <div className="list mt">
                {m.org.campaigns.length === 0 && <div className="tiny muted">No campaigns yet.</div>}
                {m.org.campaigns.map((c) => (
                  <div key={c.id} className="list-item">
                    <div className="row between">
                      <span className="small">{c.task?.title || 'Untitled'}</span>
                      <StatusBadge status={c.task?.status || c.status} />
                    </div>
                    <div className="row between tiny muted mt">
                      <span>Funded {money(c.fundedMinor)} / {money(c.rewardPoolMinor)}</span>
                      {Number(c.fundedMinor) < Number(c.rewardPoolMinor) && (
                        <button className="btn primary sm" disabled={busy} onClick={() => fund(c.id, Number(c.rewardPoolMinor))}>Fund escrow</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
