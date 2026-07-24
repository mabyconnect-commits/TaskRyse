import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { money, titleCase } from '../lib/format';
import { Loading, Alert } from '../components/ui';

// Sponsor Business Portal (design/Taskryse Business.dc.html).
interface Campaign { id: string; status: string; rewardPoolMinor: number; fundedMinor: number; task: { id: string; title: string; status: string } | null; }
interface OrgMembership {
  role: string;
  org: { id: string; name: string; verificationStatus: string; escrowBalanceMinor: number; campaigns: Campaign[] };
}
interface Category { id: string; name: string; }

export default function Business() {
  const orgs = useApi<OrgMembership[]>(() => api.get('/orgs'), []);
  const cats = useApi<Category[]>(() => api.get('/categories'), []);
  const [msg, setMsg] = useState<{ k: 'error' | 'success'; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ orgId: '', categoryId: '', title: 'New evaluation batch', payMinor: '150000', totalSlots: '10' });

  async function createCampaign() {
    setBusy(true); setMsg(null);
    try {
      const orgId = form.orgId || orgs.data?.[0]?.org.id;
      const categoryId = form.categoryId || cats.data?.[0]?.id;
      if (!orgId || !categoryId) throw new ApiError(400, 'x', 'Pick an organisation and category');
      await api.post('/campaigns', {
        orgId, categoryId, title: form.title,
        description: 'Sponsored task created from the business portal.', instructions: 'Follow the rubric carefully.',
        payMinor: Number(form.payMinor), totalSlots: Number(form.totalSlots),
      });
      setMsg({ k: 'success', t: 'Campaign created. Fund its escrow to take the task live.' }); setShowForm(false); orgs.reload();
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Create failed' }); }
    finally { setBusy(false); }
  }
  async function fund(id: string, pool: number) {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post<{ fullyFunded: boolean }>(`/campaigns/${id}/fund`, { amountMinor: pool });
      setMsg({ k: 'success', t: r.fullyFunded ? 'Fully funded — task is now live.' : 'Escrow funded.' }); orgs.reload();
    } catch (err) { setMsg({ k: 'error', t: err instanceof ApiError ? err.message : 'Funding failed' }); }
    finally { setBusy(false); }
  }

  if (orgs.loading) return <Loading />;
  const memberships = orgs.data || [];

  return (
    <div className="appx-wide">
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}

      {memberships.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#6B6E8C', fontFamily: 'Albert Sans, sans-serif' }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>🏢</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#171A3A', marginBottom: 6 }}>No organisation yet</div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>Your sponsor account isn't linked to an organisation. Ask an admin to add you, or seed data provides "Meridian AI Labs".</div>
        </div>
      ) : memberships.map((m) => {
        const active = m.org.campaigns.filter((c) => c.task?.status === 'LIVE').length;
        return (
          <div key={m.org.id} style={{ fontFamily: 'Albert Sans, sans-serif', marginBottom: 24 }}>
            {/* org header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800 }}>{m.org.name}</div>
                <div style={{ fontSize: 13, color: '#6B6E8C', marginTop: 2 }}>
                  {m.org.verificationStatus === 'verified' ? <span style={{ color: '#0E7A59', fontWeight: 700 }}>Verified business ✓</span> : titleCase(m.org.verificationStatus)}
                  {' · '}{active} active campaign{active === 1 ? '' : 's'}{' · '}escrow {money(m.org.escrowBalanceMinor)}
                </div>
              </div>
              <button onClick={() => { setForm({ ...form, orgId: m.org.id }); setShowForm(!showForm); setMsg(null); }} style={{ border: 'none', background: '#FF6A3D', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, padding: '10px 16px', borderRadius: 11, cursor: 'pointer' }}>+ Post a task</button>
            </div>

            {/* create form */}
            {showForm && (
              <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 16, padding: 18, marginBottom: 16 }}>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Post a task</div>
                <Field label="Task title"><input className="wl-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
                <Field label="Category">
                  <select className="wl-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    {(cats.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Pay per task (minor)"><input className="wl-input" value={form.payMinor} onChange={(e) => setForm({ ...form, payMinor: e.target.value })} /></Field>
                  <Field label="Slots"><input className="wl-input" value={form.totalSlots} onChange={(e) => setForm({ ...form, totalSlots: e.target.value })} /></Field>
                </div>
                <div style={{ background: '#FAFAFC', border: '1px solid #ECEDF4', borderRadius: 10, padding: 12, fontSize: 13, margin: '4px 0 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6B6E8C' }}>Reward pool</span><strong>{money(Number(form.payMinor || 0) * Number(form.totalSlots || 0))}</strong></div>
                </div>
                <button className="wl-cta" disabled={busy} onClick={createCampaign}>{busy ? '…' : 'Create campaign'}</button>
              </div>
            )}

            {/* active campaigns */}
            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Active campaigns</div>
            {m.org.campaigns.length === 0 ? (
              <div style={{ color: '#6B6E8C', fontSize: 13, padding: '10px 0' }}>No campaigns yet. Post a task to get started.</div>
            ) : m.org.campaigns.map((c) => {
              const funded = Number(c.fundedMinor) >= Number(c.rewardPoolMinor);
              return (
                <div key={c.id} style={{ border: '1px solid #E3E4EE', background: '#fff', borderRadius: 14, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#171A3A' }}>{c.task?.title || 'Untitled'}</span>
                    <span style={{ background: c.task?.status === 'LIVE' ? '#EDF7F3' : '#F4F5FA', color: c.task?.status === 'LIVE' ? '#0E7A59' : '#6B6E8C', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>{titleCase(c.task?.status || c.status)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#6B6E8C', marginBottom: 10 }}>Funded {money(c.fundedMinor)} of {money(c.rewardPoolMinor)}</div>
                  <div style={{ height: 6, background: '#ECEDF4', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Number(c.fundedMinor) / Number(c.rewardPoolMinor) * 100)}%`, background: '#16A67A' }} />
                  </div>
                  {!funded && <button onClick={() => fund(c.id, Number(c.rewardPoolMinor))} disabled={busy} style={{ border: 'none', background: '#FF6A3D', color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 10, cursor: 'pointer' }}>Fund escrow</button>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#4A4D6B' }}>{label}</div>{children}</div>;
}
