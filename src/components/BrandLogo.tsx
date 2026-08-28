interface BrandLogoProps {
  size?: number;
  className?: string;
}

/** FITback mark — pilates F on a reformer, inside a feedback ring. */
export function BrandLogo({ size = 72, className }: BrandLogoProps) {
  return (
    <img
      src="/icon-white.svg"
      width={size}
      height={size}
      alt="FITback"
      className={className}
      draggable={false}
    />
  );
}
