import { Building2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useI18n, type Locale } from '@/i18n';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemePreference } from '@/theme/theme';
import './Settings.css';

function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="settings-seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={`settings-seg__btn${on ? ' is-on' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();
  const { preference, setPreference } = useTheme();
  const { autoClassFeedbackEnabled, setAutoClassFeedbackEnabled } = useApp();

  const languageOptions: { value: Locale; label: string }[] = [
    { value: 'he', label: t('lang.he') },
    { value: 'en', label: t('lang.en') },
  ];

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ];

  return (
    <div className="page fade-in">
      <button type="button" className="back-btn" onClick={() => navigate('/profile')}>
        {t('common.back')}
      </button>

      <header className="page-header">
        <h1 className="page-title">{t('settings.title')}</h1>
      </header>

      <p className="settings-section__label">{t('settings.appearance')}</p>
      <div className="card settings-group">
        <div className="settings-row">
          <div className="settings-row__copy">
            <p className="settings-row__label">{t('lang.label')}</p>
          </div>
          <Segmented
            value={locale}
            options={languageOptions}
            onChange={setLocale}
            ariaLabel={t('lang.label')}
          />
        </div>
        <div className="settings-row">
          <div className="settings-row__copy">
            <p className="settings-row__label">{t('settings.theme')}</p>
          </div>
          <Segmented
            value={preference}
            options={themeOptions}
            onChange={setPreference}
            ariaLabel={t('settings.theme')}
          />
        </div>
      </div>

      <p className="settings-section__label">{t('settings.classes')}</p>
      <div className="card settings-group">
        <button
          type="button"
          className="settings-row settings-row--toggle"
          role="switch"
          aria-checked={autoClassFeedbackEnabled}
          onClick={() => setAutoClassFeedbackEnabled(!autoClassFeedbackEnabled)}
        >
          <span className="settings-row__copy">
            <span className="settings-row__label">{t('settings.autoFeedback')}</span>
            <span className="settings-row__hint">{t('settings.autoFeedbackHint')}</span>
          </span>
          <span className="settings-switch" aria-hidden>
            <span className="settings-switch__knob" />
          </span>
        </button>
      </div>

      <p className="settings-section__label">{t('settings.studio')}</p>
      <button
        type="button"
        className="card settings-group settings-link"
        onClick={() => navigate('/studio')}
      >
        <span className="settings-link__icon" aria-hidden>
          <Building2 size={18} />
        </span>
        <span className="settings-link__label">{t('profile.studios')}</span>
        <ChevronRight className="rtl-flip settings-link__chevron" size={18} aria-hidden />
      </button>
    </div>
  );
}
