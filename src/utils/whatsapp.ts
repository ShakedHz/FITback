import { normalizePhone } from '@/utils/sms';

/** Digits only for wa.me (no +, spaces, or dashes). */
export function whatsappPhoneDigits(phone: string): string {
  return normalizePhone(phone).replace(/\D/g, '');
}

/** Build a WhatsApp click-to-chat URL (app on phone, WhatsApp Web on desktop). */
export function buildWhatsAppUrl(phone: string, body: string): string {
  const digits = whatsappPhoneDigits(phone);
  const encoded = encodeURIComponent(body);
  return `https://wa.me/${digits}?text=${encoded}`;
}

/**
 * Open WhatsApp with recipient + message prefilled.
 * The instructor taps Send in WhatsApp — this is a real message from their account.
 */
export function openWhatsApp(phone: string, body: string): void {
  const url = buildWhatsAppUrl(phone, body);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
