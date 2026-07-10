import logoAsset from '@/assets/ra-circle-logo.png.asset.json';

interface LogoProps {
  className?: string;
  /** Image height in pixels (width auto). Defaults to 32. */
  size?: number;
  alt?: string;
}

/**
 * RA Circle brand logo. Uses the CDN-hosted PNG.
 * For text-only wordmark next to the mark, compose separately.
 */
export function Logo({ className = '', size = 32, alt = 'RA Circle' }: LogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      height={size}
      style={{ height: size, width: 'auto' }}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}
