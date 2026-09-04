export type TextLocale = 'he' | 'en';

export function detectTextLocale(text: string): TextLocale {
  const trimmed = text.trim();
  if (!trimmed) return 'he';
  const hebrew = (trimmed.match(/[\u0590-\u05FF]/g) || []).length;
  const latin = (trimmed.match(/[a-zA-Z]/g) || []).length;
  return hebrew >= latin ? 'he' : 'en';
}

export async function translateText(text: string, from: TextLocale, to: TextLocale): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || from === to) return trimmed;

  const langpair = `${from}|${to}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${langpair}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return trimmed;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = data.responseData?.translatedText?.trim();
    return translated && translated.toLowerCase() !== trimmed.toLowerCase() ? translated : trimmed;
  } catch {
    return trimmed;
  }
}

export async function bilingualName(input: string): Promise<{ name: string; nameHe: string }> {
  const trimmed = input.trim();
  if (!trimmed) return { name: '', nameHe: '' };

  const source = detectTextLocale(trimmed);
  const target = source === 'he' ? 'en' : 'he';
  const translated = await translateText(trimmed, source, target);

  return source === 'he'
    ? { nameHe: trimmed, name: translated }
    : { name: trimmed, nameHe: translated };
}
