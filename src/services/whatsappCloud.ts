import type { ScheduleAttendee, ScheduleEvent } from '@/data/scheduleTypes';
import { buildClassFeedbackMessage, buildClassSurveyUrl } from '@/services/classFeedback';
import type { TranslateFn } from '@/i18n/LocaleContext';
import { whatsappPhoneDigits } from '@/utils/whatsapp';

function apiBase(): string | null {
  const env = import.meta.env.VITE_WHATSAPP_API_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (import.meta.env.DEV) return '/api/whatsapp';
  return null;
}

async function whatsappFetch(
  path: '/send',
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const base = apiBase();
  if (!base) {
    throw new Error('WhatsApp proxy is not running. Start the app with npm run dev.');
  }
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!res.ok || data.ok === false) {
    throw new Error(typeof data.message === 'string' ? data.message : `WhatsApp HTTP ${res.status}`);
  }
  return data;
}

export async function sendStudioWhatsAppMessage(
  phone: string,
  event: ScheduleEvent,
  t: TranslateFn
): Promise<string> {
  const to = whatsappPhoneDigits(phone);
  if (!to) throw new Error('Enter a valid phone number (e.g. 0501234567)');

  const data = await whatsappFetch('/send', {
    to,
    title: event.title,
    instructor: event.instructor ?? '',
    url: buildClassSurveyUrl(event),
    text: buildClassFeedbackMessage(event, t),
  });
  return typeof data.id === 'string' ? data.id : '';
}

export async function sendStudioFeedbackToAttendees(
  attendees: ScheduleAttendee[],
  event: ScheduleEvent,
  t: TranslateFn,
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number; lastError: string | null }> {
  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;
  const total = attendees.length;

  for (const attendee of attendees) {
    if (!attendee.phone) {
      failed += 1;
      lastError = 'Enter a valid phone number (e.g. 0501234567)';
      onProgress?.(sent, total);
      continue;
    }
    try {
      await sendStudioWhatsAppMessage(attendee.phone, event, t);
      sent += 1;
    } catch (err) {
      failed += 1;
      lastError = err instanceof Error ? err.message : 'WhatsApp send failed';
    }
    onProgress?.(sent, total);
  }

  return { sent, failed, lastError };
}
