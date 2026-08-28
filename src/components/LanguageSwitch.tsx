import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useI18n, type Locale } from '@/i18n';
import './LanguageSwitch.css';

// Each language is listed in its own script, the way most apps present them.
const OPTIONS: { value: Locale; short: string; native: string }[] = [
  { value: 'he', short: 'עב', native: 'עברית' },
  { value: 'en', short: 'EN', native: 'English' },
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

  const active = OPTIONS.find((option) => option.value === locale) ?? OPTIONS[0];

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
        <Globe size={16} strokeWidth={2} />
        <span className="lang-switch__code">{active.short}</span>
        <ChevronDown size={14} className="lang-switch__caret" aria-hidden />
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
                className={`lang-switch__item${selected ? ' is-active' : ''}`}
                onClick={() => {
                  setLocale(option.value);
                  setOpen(false);
                }}
              >
                <span className="lang-switch__native">{option.native}</span>
                <span className="lang-switch__check">{selected && <Check size={16} />}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
