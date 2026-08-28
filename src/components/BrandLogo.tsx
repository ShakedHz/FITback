interface BrandLogoProps {
  size?: number;
  className?: string;
}

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
      <rect width="512" height="512" rx="108" fill="#6D28D9" />
      <path
        fill="#FFFFFF"
        d="M 152 92 L 376 92 A 12 12 0 0 1 388 104 L 388 168 A 12 12 0 0 1 376 180 L 232 180 L 232 224 L 314 224 A 12 12 0 0 1 326 236 L 326 300 A 12 12 0 0 1 314 312 L 232 312 L 232 408 A 12 12 0 0 1 220 420 L 152 420 A 12 12 0 0 1 140 408 L 140 104 A 12 12 0 0 1 152 92 Z"
      />
    </svg>
  );
}
