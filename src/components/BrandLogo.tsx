interface BrandLogoProps {
  size?: number;
  className?: string;
}

/** Movana app mark — flowing M on purple gradient. */
export function BrandLogo({ size = 72, className }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label="Movana"
      className={className}
    >
      <defs>
        <linearGradient id="movana-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="45%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id="movana-mark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ede9fe" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#movana-bg)" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M 148 368 V 196 C 148 168 168 148 196 148 C 220 148 238 162 248 182 L 256 198 L 264 182 C 274 162 292 148 316 148 C 344 148 364 168 364 196 V 368"
          stroke="url(#movana-mark)"
          strokeWidth="36"
        />
        <path
          d="M 128 392 C 196 356 316 356 384 392"
          stroke="rgba(255,255,255,0.42)"
          strokeWidth="14"
        />
      </g>
    </svg>
  );
}
