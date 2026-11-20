import { useI18n, type Locale } from '@/i18n';
import { useTheme } from '@/theme/ThemeContext';
import { ACCENT_OPTIONS, ACCENT_SWATCH, type AccentColor, type ThemePreference } from '@/theme/theme';
import '@/pages/Settings.css';

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

const ACCENT_LABEL_KEY: Record<AccentColor, string> = {
  pink: 'settings.accentPink',
  purple: 'settings.accentPurple',
  sky: 'settings.accentSky',
  teal: 'settings.accentTeal',
  amber: 'settings.accentAmber',
};

/** Settings that used to live on /settings — appearance only in the Lite app. */
export function ProfileSettings() {
  const { t, locale, setLocale } = useI18n();
  const { preference, setPreference, accent, setAccent } = useTheme();

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
    <section className="profile-settings" aria-labelledby="profile-settings-title">
      <p id="profile-settings-title" className="settings-section__label">{t('settings.title')}</p>
      <div className="card settings-group">
        <div className="settings-row">
          <div className="settings-row__copy">
            <p className="settings-row__label">{t('lang.label')}</p>
          </div>
          <Segmented value={locale} options={languageOptions} onChange={setLocale} ariaLabel={t('lang.label')} />
        </div>
        <div className="settings-row">
          <div className="settings-row__copy">
            <p className="settings-row__label">{t('settings.theme')}</p>
          </div>
          <Segmented value={preference} options={themeOptions} onChange={setPreference} ariaLabel={t('settings.theme')} />
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
                  aria-label={t(ACCENT_LABEL_KEY[id])}
                  className={`settings-color${on ? ' is-on' : ''}`}
                  style={{ '--swatch': ACCENT_SWATCH[id] } as React.CSSProperties}
                  onClick={() => setAccent(id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
