import { useI18n } from '@/i18n';
import './LanguageSwitch.css';

export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      <button
        type="button"
        className={locale === 'en' ? 'active' : ''}
        onClick={() => setLocale('en')}
      >
        {t('lang.en')}
      </button>
      <button
        type="button"
        className={locale === 'he' ? 'active' : ''}
        onClick={() => setLocale('he')}
      >
        {t('lang.he')}
      </button>
    </div>
  );
}
