import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { BackButton } from '@/components/IconToolbar';
import { StudioViewSwitcher } from '@/components/StudioViewSwitcher';
import { useApp } from '@/context/AppContext';
import { useI18n, type Locale } from '@/i18n';
import { useTheme } from '@/theme/ThemeContext';
import { ACCENT_OPTIONS, ACCENT_SWATCH, type AccentColor, type ThemePreference } from '@/theme/theme';
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
  const { t, locale, setLocale } = useI18n();
  const { preference, setPreference, accent, setAccent } = useTheme();
  const { autoClassFeedbackEnabled, setAutoClassFeedbackEnabled, feedbackDeliveryChannel, setFeedbackDeliveryChannel } =
    useApp();
  const { user } = useAuth();

  const memberships = user?.memberships ?? [];

  const languageOptions: { value: Locale; label: string }[] = [
    { value: 'he', label: t('lang.he') },
    { value: 'en', label: t('lang.en') },
  ];

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ];

  const channelOptions: { value: 'whatsapp' | 'email'; label: string }[] = [
    { value: 'whatsapp', label: t('settings.feedbackChannelWhatsApp') },
    { value: 'email', label: t('settings.feedbackChannelEmail') },
  ];

  const accentLabelKey: Record<AccentColor, string> = {
    pink: 'settings.accentPink',
    purple: 'settings.accentPurple',
    sky: 'settings.accentSky',
    teal: 'settings.accentTeal',
    amber: 'settings.accentAmber',
  };

  return (
    <div className="page fade-in">
      <BackButton to="/profile" label={t('common.back')} />

      <header className="page-header">
        <h1 className="page-title">{t('settings.title')}</h1>
        <p className="page-subtitle">{user?.email}</p>
      </header>

      <p className="settings-section__label">{t('settings.studio')}</p>
      <div className="card settings-group settings-view">
        <StudioViewSwitcher memberships={memberships} stayOnPage showSetup />

        {memberships.length > 0 && (
          <div className="settings-studio__links">
            <Link to="/studio" className="settings-studio__link">
              {t('settings.manageStudio')}
              <ChevronRight className="rtl-flip" size={16} aria-hidden />
            </Link>
          </div>
        )}
      </div>

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
        <div className="settings-row settings-row--colors">
          <div className="settings-row__copy">
            <p className="settings-row__label">{t('settings.accent')}</p>
          </div>
          <div className="settings-colors" role="radiogroup" aria-label={t('settings.accent')}>
            {ACCENT_OPTIONS.map((id) => {
              const on = accent === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={t(accentLabelKey[id])}
                  className={`settings-color${on ? ' is-on' : ''}`}
                  style={{ '--swatch': ACCENT_SWATCH[id] } as React.CSSProperties}
                  onClick={() => setAccent(id)}
                />
              );
            })}
          </div>
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
        <div className="settings-row">
          <div className="settings-row__copy">
            <p className="settings-row__label">{t('settings.feedbackChannel')}</p>
            <span className="settings-row__hint">{t('settings.feedbackChannelHint')}</span>
          </div>
          <Segmented
            value={feedbackDeliveryChannel}
            options={channelOptions}
            onChange={setFeedbackDeliveryChannel}
            ariaLabel={t('settings.feedbackChannel')}
          />
        </div>
      </div>
    </div>
  );
}
