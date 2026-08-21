export type Locale = 'en' | 'he';

export const LOCALE_STORAGE_KEY = 'movana_locale_v1';

export function readStoredLocale(): Locale {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (value === 'he' || value === 'en') return value;
  } catch {
    /* private mode */
  }
  return 'en';
}

export function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
}

export function applyDocumentLocale(locale: Locale) {
  const html = document.documentElement;
  html.lang = locale === 'he' ? 'he' : 'en';
  html.dir = locale === 'he' ? 'rtl' : 'ltr';
}

export function dateLocaleOf(locale: Locale): string {
  return locale === 'he' ? 'he-IL' : 'en-US';
}
