import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en } from './en';
import { he } from './he';
import {
  applyDocumentLocale,
  dateLocaleOf,
  persistLocale,
  readStoredLocale,
  type Locale,
} from './locale';

type Vars = Record<string, string | number>;

export type TranslateFn = (key: string, vars?: Vars) => string;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  dir: 'ltr' | 'rtl';
  dateLocale: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function lookup(dict: unknown, key: string): string | undefined {
  let current: unknown = dict;
  for (const part of key.split('.')) {
    if (!current || typeof current !== 'object' || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] == null ? `{${name}}` : String(vars[name])
  );
}

export function translate(locale: Locale, key: string, vars?: Vars): string {
  const dict = locale === 'he' ? he : en;
  const value = lookup(dict, key) ?? lookup(en, key) ?? key;
  return interpolate(value, vars);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  useEffect(() => {
    applyDocumentLocale(locale);
    persistLocale(locale);
  }, [locale]);

  const t = useCallback<TranslateFn>(
    (key, vars) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t,
      dir: locale === 'he' ? 'rtl' : 'ltr',
      dateLocale: dateLocaleOf(locale),
    }),
    [locale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useI18n must be used within LocaleProvider');
  return ctx;
}
