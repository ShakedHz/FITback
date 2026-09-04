export type AccentColor = 'pink' | 'purple' | 'sky' | 'teal' | 'amber';

export const ACCENT_STORAGE_KEY = 'movana_accent_v1';
export const DEFAULT_ACCENT: AccentColor = 'pink';

export const ACCENT_OPTIONS: AccentColor[] = ['pink', 'purple', 'sky', 'teal', 'amber'];

/** Preview swatch for the settings picker (not theme-dependent). */
export const ACCENT_SWATCH: Record<AccentColor, string> = {
  pink: '#fbcfe8',
  purple: '#ddd6fe',
  sky: '#bae6fd',
  teal: '#99f6e4',
  amber: '#fef08a',
};

export function isAccentColor(value: string | null): value is AccentColor {
  return value === 'pink' || value === 'purple' || value === 'sky' || value === 'teal' || value === 'amber';
}

export function readStoredAccent(): AccentColor {
  try {
    const value = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (isAccentColor(value)) return value;
  } catch {
    /* private mode */
  }
  return DEFAULT_ACCENT;
}

export function persistAccent(accent: AccentColor) {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {
    /* private mode */
  }
}

export function applyDocumentAccent(accent: AccentColor) {
  document.documentElement.dataset.accent = accent;
}
