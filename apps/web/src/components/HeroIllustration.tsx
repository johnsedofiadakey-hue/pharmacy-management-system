/**
 * Pharmaceutical hero illustration - clean, professional, Ghana-focused
 * A medicine bottle, capsules, and a subtle Ghana map outline in the background
 */
export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 480"
      className="mx-auto w-full max-w-md"
      role="img"
      aria-label="Pharmaceutical illustration featuring medicine bottle and capsules"
    >
      <defs>
        <linearGradient id="bottleGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eafaf7" />
        </linearGradient>
        <linearGradient id="pillGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-strong)" />
        </linearGradient>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="var(--primary)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Subtle background shadow */}
      <circle cx="240" cy="400" r="180" fill="url(#shadow)" />

      {/* Medicine bottle */}
      <g className="hero-float">
        {/* Bottle body */}
        <rect x="200" y="140" width="80" height="120" rx="12" fill="url(#bottleGradient)" stroke="var(--border)" strokeWidth="2" />
        
        {/* Bottle cap */}
        <rect x="210" y="120" width="60" height="25" rx="8" fill="var(--primary)" />
        <rect x="215" y="110" width="50" height="12" rx="4" fill="var(--primary-strong)" />
        
        {/* Label */}
        <rect x="210" y="170" width="60" height="40" rx="4" fill="var(--primary-soft)" />
        <text x="240" y="190" textAnchor="middle" fill="var(--primary-strong)" fontSize="14" fontWeight="bold">
          NEXUS
        </text>
        <text x="240" y="204" textAnchor="middle" fill="var(--primary)" fontSize="10">
          PHARMA
        </text>
        
        {/* Medicine level indicator */}
        <rect x="215" y="220" width="50" height="8" rx="4" fill="var(--primary)" opacity="0.3" />
      </g>

      {/* Capsules orbiting */}
      <g className="hero-orbit">
        {/* Red capsule */}
        <g>
          <rect x="80" y="160" width="32" height="12" rx="6" fill="var(--coral)" />
          <rect x="88" y="162" width="16" height="8" rx="4" fill="var(--coral)" opacity="0.6" />
        </g>
        
        {/* Blue capsule */}
        <g>
          <rect x="368" y="280" width="32" height="12" rx="6" fill="var(--sky)" />
          <rect x="376" y="282" width="16" height="8" rx="4" fill="var(--sky)" opacity="0.6" />
        </g>
        
        {/* White capsule */}
        <g>
          <rect x="180" y="90" width="32" height="12" rx="6" fill="white" stroke="var(--border)" strokeWidth="1" />
          <rect x="188" y="92" width="16" height="8" rx="4" fill="white" stroke="var(--border)" strokeWidth="1" />
        </g>
        
        {/* Yellow capsule */}
        <g>
          <rect x="310" y="350" width="32" height="12" rx="6" fill="var(--sun)" />
          <rect x="318" y="352" width="16" height="8" rx="4" fill="var(--sun)" opacity="0.6" />
        </g>
      </g>

      {/* Tablets spilling from bottle */}
      <g className="hero-float" transform="translate(-5, 10)">
        <rect x="275" y="220" width="24" height="10" rx="5" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth="1" />
        <path d="M282 225 L291 225" stroke="var(--primary)" strokeWidth="1" />
        
        <rect x="270" y="240" width="24" height="10" rx="5" fill="var(--primary-soft)" stroke="var(--primary)" strokeWidth="1" />
        <path d="M277 245 L286 245" stroke="var(--primary)" strokeWidth="1" />
      </g>

      {/* Subtle Ghana outline in background (abstract) */}
      <path
        d="M120 420 L140 400 L180 405 L200 410 L220 400 L240 405 L280 395 L300 400 L340 390 L360 400 L380 395 L400 405 L420 400 L440 410 L460 400"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1"
        opacity="0.1"
        strokeDasharray="2 2"
      />
    </svg>
  );
}
