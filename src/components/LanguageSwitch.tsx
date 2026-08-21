import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { useI18n, type Locale } from '@/i18n';
import './LanguageSwitch.css';

const OPTIONS: { value: Locale; key: string }[] = [
  { value: 'he', key: 'lang.he' },
  { value: 'en', key: 'lang.en' },
];

export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={`lang-switch ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="lang-switch__trigger"
        aria-label={t('lang.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Globe size={20} />
      </button>

      {open && (
        <div className="lang-switch__menu" role="menu">
          {OPTIONS.map((option) => {
            const selected = locale === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`lang-switch__item${selected ? ' active' : ''}`}
                onClick={() => {
                  setLocale(option.value);
                  setOpen(false);
                }}
              >
                <span>{t(option.key)}</span>
                {selected && <Check size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
