import type { ArboxConnection, ScheduleAttendee, ScheduleEvent } from '@/data/scheduleTypes';
import { getEventEndTime, isOwnEvent } from '@/data/scheduleTypes';
import type { TranslateFn } from '@/i18n/LocaleContext';
import { isValidEmail } from '@/utils/email';
import { isValidPhone } from '@/utils/sms';

export type FeedbackDeliveryChannel = 'whatsapp' | 'email';

export interface FeedbackScope {
  arboxConnection?: ArboxConnection | null;
}

/** Whether this class belongs to the logged-in instructor/manager for auto-feedback. */
export function isEventInFeedbackScope(
  event: ScheduleEvent,
  scope?: FeedbackScope
): boolean {
  const conn = scope?.arboxConnection;
  if (event.source === 'arbox') {
    if (!conn?.connected) return false;
    if (conn.role === 'studio_manager') return true;
    return isOwnEvent(event, conn);
  }
  // FITback-only events are always owned by the current user
  return true;
}

const AUTO_KEY = 'movana_auto_class_feedback_v1';
const CHANNEL_KEY = 'movana_feedback_channel_v1';
const DISMISS_KEY = 'movana_class_feedback_dismiss_v1';
export const FEEDBACK_CHECK_EVENT = 'movana-feedback-check';

export function loadAutoClassFeedbackEnabled(): boolean {
  try {
    const raw = localStorage.getItem(AUTO_KEY);
    if (raw === null) return false;
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export function saveAutoClassFeedbackEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_KEY, enabled ? '1' : '0');
}

export function loadFeedbackDeliveryChannel(): FeedbackDeliveryChannel {
  try {
    const raw = localStorage.getItem(CHANNEL_KEY);
    if (raw === 'email') return 'email';
    return 'whatsapp';
  } catch {
    return 'whatsapp';
  }
}

export function saveFeedbackDeliveryChannel(channel: FeedbackDeliveryChannel): void {
  localStorage.setItem(CHANNEL_KEY, channel);
}

export function getAttendeesWithPhone(event: ScheduleEvent): ScheduleAttendee[] {
  return (event.attendees ?? []).filter((a) => a.phone && isValidPhone(a.phone));
}

export function getAttendeesWithEmail(event: ScheduleEvent): ScheduleAttendee[] {
  return (event.attendees ?? []).filter((a) => a.email && isValidEmail(a.email));
}

export function getFeedbackRecipients(
  event: ScheduleEvent,
  channel: FeedbackDeliveryChannel
): ScheduleAttendee[] {
  return channel === 'email' ? getAttendeesWithEmail(event) : getAttendeesWithPhone(event);
}

export function isClassStarted(event: ScheduleEvent, now = new Date()): boolean {
  return new Date(event.start).getTime() <= now.getTime();
}

export function isClassEnded(event: ScheduleEvent, now = new Date()): boolean {
  return getEventEndTime(event).getTime() <= now.getTime();
}

/** Only prompt for feedback soon after a class ends — not every old slot on the schedule. */
export const FEEDBACK_PROMPT_WINDOW_MS = 90 * 60 * 1000;

export function classEndedRecently(event: ScheduleEvent, now = new Date()): boolean {
  if (!isClassEnded(event, now)) return false;
  const endedAt = getEventEndTime(event).getTime();
  return now.getTime() - endedAt <= FEEDBACK_PROMPT_WINDOW_MS;
}

const FEEDBACK_MODAL_COOLDOWN_KEY = 'movana_feedback_modal_cooldown_v1';
const FEEDBACK_MODAL_COOLDOWN_MS = 5 * 60 * 1000;

export function isFeedbackModalCooldownActive(): boolean {
  try {
    const until = Number(sessionStorage.getItem(FEEDBACK_MODAL_COOLDOWN_KEY) || 0);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

export function startFeedbackModalCooldown(): void {
  try {
    sessionStorage.setItem(
      FEEDBACK_MODAL_COOLDOWN_KEY,
      String(Date.now() + FEEDBACK_MODAL_COOLDOWN_MS)
    );
  } catch {
    /* ignore */
  }
}

function isPrivateIPv4(hostname: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return false;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** Clients can open the survey only when FITback is served from a public host. */
export function isPublicSurveyOrigin(origin?: string): boolean {
  const value =
    origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  if (!value) return false;
  try {
    const { hostname } = new URL(value);
    const host = hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
      return false;
    }
    if (host.endsWith('.local') || host.endsWith('.localhost')) return false;
    if (isPrivateIPv4(host)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Class ended recently, has recipients for the chosen channel, survey not sent yet. */
export function needsClassFeedback(
  event: ScheduleEvent,
  now = new Date(),
  channel: FeedbackDeliveryChannel = 'whatsapp'
): boolean {
  if (event.feedbackSentAt) return false;
  if (!classEndedRecently(event, now)) return false;
  return getFeedbackRecipients(event, channel).length > 0;
}

export function findPendingFeedbackEvents(
  events: ScheduleEvent[],
  now = new Date(),
  scope?: FeedbackScope,
  channel: FeedbackDeliveryChannel = 'whatsapp'
): ScheduleEvent[] {
  return events
    .filter((ev) => isEventInFeedbackScope(ev, scope))
    .filter((ev) => needsClassFeedback(ev, now, channel))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function buildClassSurveyUrl(event: ScheduleEvent): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({
    title: event.title,
    instructor: event.instructor ?? '',
  });
  const lessonId = event.lessonPlanId ?? event.lessonId;
  if (lessonId) params.set('lessonId', lessonId);
  return `${origin}/feedback/${event.id}?${params.toString()}`;
}

export function buildClassFeedbackMessage(event: ScheduleEvent, t: TranslateFn): string {
  const surveyUrl = buildClassSurveyUrl(event);
  const instructor = event.instructor?.trim();
  if (instructor) {
    return t('schedule.whatsappMessageWithInstructor', {
      title: event.title,
      instructor,
      url: surveyUrl,
    });
  }
  return t('schedule.whatsappMessage', { title: event.title, url: surveyUrl });
}

export function buildClassFeedbackEmailSubject(event: ScheduleEvent, t: TranslateFn): string {
  return t('schedule.emailSubject', { title: event.title });
}

export function buildClassFeedbackEmailHtml(event: ScheduleEvent, t: TranslateFn): string {
  const surveyUrl = buildClassSurveyUrl(event);
  const instructor = event.instructor?.trim();
  const greeting = instructor
    ? t('schedule.emailBodyWithInstructor', {
        title: event.title,
        instructor,
      })
    : t('schedule.emailBody', { title: event.title });
  const linkLabel = t('schedule.emailLinkLabel');
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<p>${escape(greeting)}</p><p><a href="${surveyUrl}">${escape(linkLabel)}</a></p><p style="color:#6b7280;font-size:12px;word-break:break-all;">${escape(surveyUrl)}</p>`;
}

export function hasLiveArboxMessaging(): boolean {
  return Boolean(import.meta.env.VITE_ARBOX_API_URL) || import.meta.env.DEV;
}

export function wasClassFeedbackDismissed(eventId: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) && ids.includes(eventId);
  } catch {
    return false;
  }
}

export function dismissClassFeedback(eventId: string): void {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    const next = Array.isArray(ids) ? ids : [];
    if (!next.includes(eventId)) next.push(eventId);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next.slice(-40)));
  } catch {
    /* ignore */
  }
}

export function clearClassFeedbackDismiss(eventId: string): void {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw) as string[];
    if (!Array.isArray(ids)) return;
    localStorage.setItem(DISMISS_KEY, JSON.stringify(ids.filter((id) => id !== eventId)));
  } catch {
    /* ignore */
  }
}

export function requestFeedbackCheck(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FEEDBACK_CHECK_EVENT));
  }
}

/** ISO start time for a class that ended ~1 minute ago (testing auto-feedback). */
export function startTimeForJustEndedClass(durationMinutes: number): string {
  const startMs = Date.now() - (durationMinutes + 1) * 60_000;
  return new Date(startMs).toISOString();
}

export function createAttendeeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through */
    }
  }
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `att-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
