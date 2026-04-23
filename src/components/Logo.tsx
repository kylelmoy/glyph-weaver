export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Thread — full diagonal, drawn behind the horizontal lines */}
      <line x1="22" y1="2" x2="6" y2="28" stroke="#6f94f1" strokeWidth="2.5" strokeLinecap="round" />

      {/* Three horizontal lines (text rows). Cover the thread at every crossing. */}
      <line x1="2" y1="8" x2="26" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="15" x2="26" y2="15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="22" x2="26" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

      {/* Thread OVER line 1 (crosses at ~18.3, 8) — redraw segment on top */}
      <line x1="20" y1="5" x2="16" y2="11" stroke="#6f94f1" strokeWidth="2.5" strokeLinecap="round" />

      {/* Thread OVER line 3 (crosses at ~9.7, 22) — redraw segment on top */}
      <line x1="12" y1="19" x2="8" y2="25" stroke="#6f94f1" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
