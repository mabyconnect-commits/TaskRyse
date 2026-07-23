// Taskryse mark — a crisp inline SVG so it stays sharp at any size and pairs cleanly
// with a text wordmark (the old PNG had "TASKRYSE" baked in, which doubled the name).
// A rising check: "task" completed + "ryse" (rise), in the brand orange/yellow.
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label="Taskryse">
      <defs>
        <linearGradient id="tr-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6A3D" />
          <stop offset="1" stopColor="#FFC857" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#tr-g)" />
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
