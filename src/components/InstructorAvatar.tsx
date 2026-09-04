import { useEffect, useState, type ReactNode } from 'react';
import './InstructorAvatar.css';

interface InstructorAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 36, md: 44, lg: 56, xl: 88 };

/** Fallback avatar fill — follows the app accent. */
export function avatarColorForName(_name: string): string {
  return 'var(--color-primary-deep)';
}

export function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function InstructorAvatar({ src, name, size = 'md' }: InstructorAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const px = sizes[size];
  const showImage = Boolean(src) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  if (showImage) {
    return (
      <img
        src={src}
        alt={name}
        className={`instructor-avatar instructor-avatar--${size}`}
        width={px}
        height={px}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`instructor-avatar instructor-avatar--fallback instructor-avatar--${size}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={name}
    >
      <span className="instructor-avatar__initials">{avatarInitials(name)}</span>
    </div>
  );
}

interface FeedPreviewProps {
  src: string;
  alt: string;
  locked?: boolean;
  children?: ReactNode;
}

export function FeedPreview({ src, alt, locked, children }: FeedPreviewProps) {
  return (
    <div className="feed-preview">
      <img src={src} alt={alt} className="feed-preview__image" loading="lazy" />
      <div className="feed-preview__overlay" />
      {locked && <div className="feed-preview__lock">{children}</div>}
    </div>
  );
}
