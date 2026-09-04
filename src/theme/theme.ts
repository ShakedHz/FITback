export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'movana_theme_v1';
export const DEFAULT_THEME: ThemePreference = 'light';

export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#F7F7F9',
  dark: '#121018',
};

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(value)) return value;
  } catch {
    /* private mode */
  }
  return DEFAULT_THEME;
}

export function persistTheme(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* private mode */
  }
}

export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolvedThemeOf(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return preference;
}

export function applyDocumentTheme(preference: ThemePreference) {
  const resolved = resolvedThemeOf(preference);
  const html = document.documentElement;
  html.dataset.theme = resolved;
  html.style.colorScheme = resolved;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', THEME_COLORS[resolved]);

  const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (statusBar) {
    statusBar.setAttribute(
      'content',
      resolved === 'dark' ? 'black-translucent' : 'default'
    );
  }
}

export { applyDocumentAccent, readStoredAccent, persistAccent, DEFAULT_ACCENT } from './accent';
export type { AccentColor } from './accent';
export { ACCENT_OPTIONS, ACCENT_SWATCH } from './accent';
