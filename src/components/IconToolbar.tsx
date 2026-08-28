import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import './IconToolbar.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  danger?: boolean;
  children: ReactNode;
}

export function IconButton({ danger, className = '', children, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={`icon-btn${danger ? ' icon-btn--danger' : ''}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconToolbar({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`icon-toolbar${className ? ` ${className}` : ''}`}>{children}</div>;
}

/** Explicit parent route — never `navigate(-1)`, so nested flows don't bounce. */
export function BackButton({
  to,
  label,
  onClick,
}: {
  to?: string;
  label: string;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="back-btn"
      onClick={onClick ?? (() => (to ? navigate(to) : navigate(-1)))}
    >
      <ChevronLeft className="rtl-flip" size={18} />
      {label}
    </button>
  );
}

