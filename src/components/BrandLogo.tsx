interface BrandLogoProps {
  size?: number;
  className?: string;
}

/** FITback app mark — an F held inside a calm feedback bubble. */
export function BrandLogo({ size = 72, className }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label="FITback"
      className={className}
    >
      <defs>
        <linearGradient id="fitback-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#aaa3be" />
          <stop offset="100%" stopColor="#625c78" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#fitback-bg)" />
      <g
        fill="none"
        stroke="#f8f5ef"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M 158 146 H 354 C 382 146 400 164 400 192 V 306 C 400 334 382 352 354 352 H 260 L 202 398 V 352 H 158 C 130 352 112 334 112 306 V 192 C 112 164 130 146 158 146 Z"
          strokeWidth="18"
        />
        <path d="M 206 308 V 194 H 320" strokeWidth="32" />
        <path d="M 206 250 H 288" strokeWidth="32" />
      </g>
    </svg>
  );
}
