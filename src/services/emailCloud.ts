import type { ScheduleAttendee, ScheduleEvent } from '@/data/scheduleTypes';
import {
  buildClassFeedbackEmailHtml,
  buildClassFeedbackEmailSubject,
  buildClassFeedbackMessage,
} from '@/services/classFeedback';
import type { TranslateFn } from '@/i18n/LocaleContext';
import { isValidEmail, normalizeEmail } from '@/utils/email';

function apiBase(): string | null {
  const env = import.meta.env.VITE_EMAIL_API_URL as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (import.meta.env.DEV) return '/api/email';
  return null;
}

async function emailFetch(
  path: '/send',
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const base = apiBase();
  if (!base) {
    throw new Error('Email proxy is not running. Start the app with npm run dev.');
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
    throw new Error(typeof data.message === 'string' ? data.message : `Email HTTP ${res.status}`);
  }
  return data;
}

/** Generic outbound email via the FITback email proxy (Resend). */
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<string> {
  const to = input.to.trim();
  if (!isValidEmail(to)) throw new Error('Enter a valid email address');
  const subject = input.subject.trim();
  const text = input.text.trim();
  if (!subject) throw new Error('Email subject is required');
  if (!text && !input.html?.trim()) throw new Error('Email body is required');

  const data = await emailFetch('/send', {
    to,
    subject,
    text,
    html: input.html?.trim() || undefined,
  });
  return typeof data.id === 'string' ? data.id : '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildInviteEmailHtml(body: string, joinUrl: string, linkLabel: string): string {
  const paragraphs = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line !== joinUrl)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
  return `${paragraphs}<p><a href="${escapeHtml(joinUrl)}">${escapeHtml(linkLabel)}</a></p><p style="color:#6b7280;font-size:12px;word-break:break-all;">${escapeHtml(joinUrl)}</p>`;
}

export async function sendStudioEmailMessage(
  email: string,
  event: ScheduleEvent,
  t: TranslateFn
): Promise<string> {
  const to = email.trim();
  if (!isValidEmail(to)) throw new Error('Enter a valid email address');

  const data = await emailFetch('/send', {
    to,
    subject: buildClassFeedbackEmailSubject(event, t),
    text: buildClassFeedbackMessage(event, t),
    html: buildClassFeedbackEmailHtml(event, t),
  });
  return typeof data.id === 'string' ? data.id : '';
}

export async function sendStudioEmailFeedbackToAttendees(
  attendees: ScheduleAttendee[],
  event: ScheduleEvent,
  t: TranslateFn,
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number; lastError: string | null }> {
  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;

  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const attendee of attendees) {
    if (!attendee.email || !isValidEmail(attendee.email)) continue;
    const key = normalizeEmail(attendee.email);
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push(attendee.email.trim());
  }

  const total = recipients.length;
  if (total === 0) {
    return { sent: 0, failed: 1, lastError: 'Enter a valid email address' };
  }

  for (const email of recipients) {
    try {
      await sendStudioEmailMessage(email, event, t);
      sent += 1;
    } catch (err) {
      failed += 1;
      lastError = err instanceof Error ? err.message : 'Email send failed';
    }
    onProgress?.(sent, total);
  }

  return { sent, failed, lastError };
}
