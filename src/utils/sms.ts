/** Normalize to E.164-ish form for SMS links (Israel-friendly). */
export function normalizePhone(phone: string): string {
  let value = phone.trim().replace(/[^\d+]/g, '');
  if (!value) return '';

  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  if (value.startsWith('+')) return value;
  if (value.startsWith('0')) return `+972${value.slice(1)}`;
  if (value.startsWith('972')) return `+${value}`;
  return `+${value}`;
}

export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** Build a native SMS composer URL (works on iPhone / Android). */
export function buildSmsUrl(phone: string, body: string): string {
  const to = normalizePhone(phone);
  const encoded = encodeURIComponent(body);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  // iOS: sms:number&body=  · Android: sms:number?body=
  return isIOS ? `sms:${to}&body=${encoded}` : `sms:${to}?body=${encoded}`;
}

/**
 * Open the device SMS app with recipient + message prefilled.
 * The instructor taps Send in Messages — this is real SMS from their phone.
 */
export function openSms(phone: string, body: string): void {
  const url = buildSmsUrl(phone, body);
  // Anchor click keeps the SPA in place better than assigning location.href.
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
