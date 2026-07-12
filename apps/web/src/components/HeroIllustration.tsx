/**
 * Health-focused hero illustration — a beating heart with a stethoscope
 * draped over it and a live ECG pulse line scrolling beneath. Pure inline
 * SVG (no external image), animated with CSS so it respects
 * prefers-reduced-motion via the global override.
 */
export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 480"
      className="mx-auto w-full max-w-md"
      role="img"
      aria-label="Animated illustration of a beating heart with a stethoscope, representing pharmacist-reviewed health care"
    >
      <defs>
        <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-strong)" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <clipPath id="ecgClip">
          <rect x="70" y="325" width="340" height="56" rx="8" />
        </clipPath>
      </defs>

      {/* Ambient glow, pulses in time with the heartbeat */}
      <circle cx="240" cy="220" r="170" fill="url(#glow)" className="hero-glow-pulse" />

      {/* Faint dot grid, medical-monitor texture */}
      <g opacity="0.25">
        {Array.from({ length: 6 }).map((_, row) =>
          Array.from({ length: 10 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={70 + col * 36} cy={60 + row * 14} r="1.4" fill="var(--primary)" />
          ))
        )}
      </g>

      {/* Stethoscope draped from upper right, chestpiece resting on the heart */}
      <g className="stetho-sway">
        <rect x="283" y="44" width="15" height="20" rx="7" fill="var(--secondary)" />
        <rect x="323" y="38" width="15" height="20" rx="7" fill="var(--secondary)" />
        <path
          d="M290,55 C280,75 288,95 315,105 M330,50 C345,68 340,90 315,105 M315,105 C320,140 335,175 310,210 C295,230 285,245 288,262"
          fill="none"
          stroke="var(--secondary)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="288" cy="270" r="16" fill="var(--secondary)" />
        <circle cx="288" cy="270" r="8" fill="var(--surface-muted)" />
      </g>

      {/* Beating heart */}
      <g className="heart-beat">
        <path
          d="M240,290 C240,290 150,225 150,165 C150,130 178,108 208,120 C222,126 233,140 240,155 C247,140 258,126 272,120 C302,108 330,130 330,165 C330,225 240,290 240,290 Z"
          fill="url(#heartGradient)"
        />
        <path
          d="M182,150 C182,168 196,186 214,198"
          fill="none"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>

      {/* ECG pulse line, scrolling continuously within its clipped window */}
      <rect x="70" y="325" width="340" height="56" rx="8" fill="var(--surface-muted)" opacity="0.6" />
      <g clipPath="url(#ecgClip)">
        <g transform="translate(80,353)">
          <path
            className="ecg-scroll"
            d="M0,0 L35,0 L45,-6 L55,8 L65,-30 L75,20 L85,0 L110,0 L145,0 L155,-6 L165,8 L175,-30 L185,20 L195,0 L220,0 L255,0 L265,-6 L275,8 L285,-30 L295,20 L305,0 L330,0 L365,0 L375,-6 L385,8 L395,-30 L405,20 L415,0 L440,0"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* Small accent dots, cross motif for a medical touch */}
      <g fill="var(--coral)" opacity="0.85">
        <circle cx="110" cy="230" r="6" />
      </g>
      <g fill="var(--sun)" opacity="0.85">
        <circle cx="390" cy="240" r="5" />
      </g>
      <path d="M120,110 h14 M127,103 v14" stroke="var(--sky)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
