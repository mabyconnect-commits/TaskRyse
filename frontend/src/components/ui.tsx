import { ReactNode } from 'react';
import type { Eligibility } from '../lib/types';
import { titleCase } from '../lib/format';

export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'orange' | 'yellow' }) {
  return (
    <div className="card stat">
      <div className="k">{label}</div>
      <div className={`v ${tone || ''} money`}>{value}</div>
    </div>
  );
}

export function EligibilityBadge({ value }: { value: Eligibility }) {
  if (value === 'ELIGIBLE') return <span className="badge eligible">● Eligible</span>;
  if (value === 'QUALIFICATION_REQUIRED') return <span className="badge qual">Qualification required</span>;
  return <span className="badge locked">Plan locked</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  let cls = 'neutral';
  if (['APPROVED', 'COMPLETED', 'SUCCESSFUL', 'ACTIVE', 'LIVE'].includes(s)) cls = 'eligible';
  else if (['UNDER_REVIEW', 'SUBMITTED', 'PROCESSING', 'PENDING', 'IN_PROGRESS'].includes(s)) cls = 'info';
  else if (['REJECTED', 'FAILED_REVERSED', 'DISPUTED', 'HELD_COMPLIANCE'].includes(s)) cls = 'locked';
  else if (['REVISION_REQUESTED'].includes(s)) cls = 'qual';
  return <span className={`badge ${cls}`}>{titleCase(status)}</span>;
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  return <div className={`alert ${kind}`}>{children}</div>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="center-load">
      <span className="spinner" style={{ borderTopColor: 'var(--orange)', borderColor: 'rgba(255,106,61,0.25)' }} />
      {label}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
