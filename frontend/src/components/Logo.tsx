// Taskryse mark — a crisp inline SVG so it stays sharp at any size and pairs cleanly
// with a text wordmark (the old PNG had "TASKRYSE" baked in, which doubled the name).
// A rising check: "task" completed + "ryse" (rise), in the brand orange/yellow.
export function Logo({ size = 30 }: { size?: number }) {
  const id = `tr-g-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label="Taskryse">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6A3D" />
          <stop offset="1" stopColor="#FFC857" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path
        d="M8.5 17.2l4.4 4.4L23.5 11"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Logo + TASKRYSE wordmark lockup, as used in the design header.
export function WordmarkLogo({ size = 26 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <Logo size={size} />
      <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, letterSpacing: '0.02em', fontSize: 18, color: 'var(--ink)' }}>TASKRYSE</span>
    </span>
  );
}
