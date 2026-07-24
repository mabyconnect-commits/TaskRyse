import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../lib/useApi';
import { api } from '../lib/api';
import { Loading } from '../components/ui';
import type { RyseProgress } from '../lib/types';

// Faithful rebuild of Profile & settings (design/Taskryse Profile.dc.html).
const INDIGO = '#171A3A', MUTED = '#6B6E8C', ORANGE = '#FF6A3D', GREEN = '#0E7A59';
const RYSE_NAME: Record<string, string> = { NEW: 'New Ryser', ACTIVE: 'Active Ryser', SKILLED: 'Skilled Ryser', PRO: 'Pro Ryser', ELITE: 'Elite Ryser' };

function nameFrom(email: string) {
  const p = (email.split('@')[0] || 'there').replace(/[._-]/g, ' ');
  return p.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
const load = (k: string, d: string) => localStorage.getItem(`profile.${k}`) || d;

export default function Profile() {
  const { user, logout } = useAuth();
  const isContrib = user?.role === 'CONTRIBUTOR' || user?.role === 'ADMIN';
  const ryse = useApi<RyseProgress | null>(() => (isContrib ? api.get('/ryse-level') : Promise.resolve(null)), []);

  const [tab, setTab] = useState<'overview' | 'edit' | 'prefs'>('overview');
  const [displayName, setDisplayName] = useState(load('name', nameFrom(user!.email)));
  const [username, setUsername] = useState(load('username', user!.email.split('@')[0]));
  const [bio, setBio] = useState(load('bio', ''));
  const [availability, setAvailability] = useState(load('availability', 'Open to work'));
  const [saved, setSaved] = useState(false);
  const [notif, setNotif] = useState<Record<string, boolean>>({ taskAlerts: true, payment: true, weekly: true, marketing: false });

  const init = displayName.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const r = ryse.data;
  const perf = [
    { v: `${Math.round((r?.metrics.qualityScore ?? 1) * 100)}%`, l: 'Quality', color: GREEN },
    { v: String(r?.metrics.qualificationsPassed ?? 0), l: 'Quals', color: GREEN },
    { v: String(r?.metrics.approvedTaskCount ?? 0), l: 'Approved', color: INDIGO },
  ];

  function save() {
    localStorage.setItem('profile.name', displayName);
    localStorage.setItem('profile.username', username);
    localStorage.setItem('profile.bio', bio);
    localStorage.setItem('profile.availability', availability);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'edit', label: 'Edit profile' }, { id: 'prefs', label: 'Preferences' }] as const;

  return (
    <div className="appx-wide" style={{ fontFamily: 'Albert Sans, sans-serif' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: INDIGO }}>Profile & settings</div>
        <div style={{ fontSize: 13, color: MUTED }}>Edit profile · manage skills · preferences</div>
      </div>

      {/* identity card */}
      <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 16, padding: 18, marginBottom: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
        <span style={{ width: 58, height: 58, borderRadius: '50%', background: ORANGE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>{init}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: INDIGO }}>{displayName}</div>
          <div style={{ fontSize: 12.5, color: MUTED }}>@{username} · {user!.email}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ background: '#EDF7F3', color: GREEN, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>✓ {user!.role[0] + user!.role.slice(1).toLowerCase()}</span>
            {r && <span style={{ background: '#FFF1EA', color: '#E5552B', fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{RYSE_NAME[r.level] || r.level}</span>}
          </div>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ border: tab === t.id ? 'none' : '1px solid #E3E4EE', background: tab === t.id ? INDIGO : '#fff', color: tab === t.id ? '#fff' : '#4A4D6B', fontFamily: 'Sora, sans-serif', fontSize: 12.5, fontWeight: 700, padding: '8px 14px', borderRadius: 999, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="split-grid">
          <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 16, padding: 18, marginBottom: 12 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Performance</div>
            {ryse.loading ? <Loading /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {perf.map((p) => (
                  <div key={p.l} style={{ background: '#FAFAFC', border: '1px solid #ECEDF4', borderRadius: 12, padding: '12px 6px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 800, color: p.color }}>{p.v}</div>
                    <div style={{ fontSize: 10.5, color: MUTED, marginTop: 2 }}>{p.l}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>{r?.note || 'Derived from approved work only.'}</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 16, padding: 18, marginBottom: 12 }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Account</div>
            <Row label="Email" value={user!.email} />
            <Row label="Role" value={user!.role[0] + user!.role.slice(1).toLowerCase()} />
            <Row label="Availability" value={availability} />
            {r && <Row label="Ryse level" value={RYSE_NAME[r.level] || r.level} />}
            <button onClick={() => { logout(); location.href = '/'; }} style={{ width: '100%', marginTop: 12, border: '1px solid #F2D6D7', background: '#FDF6F6', color: '#B33A3E', fontFamily: 'Sora, sans-serif', fontSize: 13, fontWeight: 700, padding: 11, borderRadius: 11, cursor: 'pointer' }}>Sign out</button>
          </div>
        </div>
      )}

      {tab === 'edit' && (
        <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 16, padding: 18, maxWidth: 560 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Edit profile</div>
          <Field label="Display name"><input className="wl-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>
          <Field label="Username"><input className="wl-input" value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
          <Field label="Bio"><textarea className="wl-input" rows={3} value={bio} placeholder="Tell sponsors about your strengths…" onChange={(e) => setBio(e.target.value)} /></Field>
          <Field label="Availability">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Open to work', 'Busy', 'Away'].map((a) => (
                <button key={a} onClick={() => setAvailability(a)} style={{ border: availability === a ? `1.5px solid ${ORANGE}` : '1px solid #E3E4EE', background: availability === a ? '#FFF1EA' : '#fff', color: availability === a ? '#E5552B' : '#4A4D6B', fontSize: 12.5, fontWeight: 600, padding: '7px 13px', borderRadius: 999, cursor: 'pointer' }}>{a}</button>
              ))}
            </div>
          </Field>
          <button onClick={save} style={{ width: '100%', marginTop: 4, border: 'none', background: ORANGE, color: '#fff', fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, padding: 12, borderRadius: 11, cursor: 'pointer' }}>{saved ? '✓ Saved' : 'Save changes'}</button>
        </div>
      )}

      {tab === 'prefs' && (
        <div style={{ background: '#fff', border: '1px solid #E3E4EE', borderRadius: 16, padding: 18, maxWidth: 560 }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Notifications</div>
          {[{ key: 'taskAlerts', label: 'New matching task alerts' }, { key: 'payment', label: 'Payment & approval updates' }, { key: 'weekly', label: 'Weekly earnings summary' }, { key: 'marketing', label: 'Product news & tips' }].map((p) => (
            <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #F0F1F6' }}>
              <span style={{ fontSize: 13.5, color: '#2C2F52' }}>{p.label}</span>
              <button onClick={() => setNotif({ ...notif, [p.key]: !notif[p.key] })} aria-label={p.label}
                style={{ width: 42, height: 24, borderRadius: 999, border: 'none', background: notif[p.key] ? GREEN : '#D7D9E6', position: 'relative', cursor: 'pointer', transition: 'background .15s' }}>
                <span style={{ position: 'absolute', top: 2, left: notif[p.key] ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
              </button>
            </div>
          ))}
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, margin: '16px 0 6px' }}>Language & region</div>
          <Row label="App language" value="English" />
          <Row label="Payout currency" value="Nigerian naira (₦)" />
          <Row label="Appearance" value="System" />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#4A4D6B' }}>{label}</div>{children}</div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F0F1F6', gap: 10 }}>
      <span style={{ fontSize: 12.5, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: INDIGO, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}
