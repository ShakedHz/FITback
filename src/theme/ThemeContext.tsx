import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyDocumentTheme,
  persistTheme,
  readStoredTheme,
  resolvedThemeOf,
  type ResolvedTheme,
  type ThemePreference,
} from './theme';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredTheme());
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolvedThemeOf(readStoredTheme())
  );

  useEffect(() => {
    applyDocumentTheme(preference);
    persistTheme(preference);
    setResolved(resolvedThemeOf(preference));

    if (preference !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyDocumentTheme('system');
      setResolved(resolvedThemeOf('system'));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference,
    }),
    [preference, resolved, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
