// Money is minor units (kobo/cents). Format for display without floating-point drift.
const SYMBOLS: Record<string, string> = { NGN: '₦', GHS: '₵', KES: 'KSh', ZAR: 'R', EGP: 'E£', USD: '$' };

export function money(minor: number | bigint, currency = 'NGN'): string {
  const value = Number(minor) / 100;
  const symbol = SYMBOLS[currency] || `${currency} `;
  return symbol + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
