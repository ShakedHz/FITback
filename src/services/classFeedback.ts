import type { ArboxConnection, ScheduleAttendee, ScheduleEvent } from '@/data/scheduleTypes';
import { getEventEndTime, isOwnEvent } from '@/data/scheduleTypes';
import { isValidPhone } from '@/utils/sms';

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

export function getAttendeesWithPhone(event: ScheduleEvent): ScheduleAttendee[] {
  return (event.attendees ?? []).filter((a) => a.phone && isValidPhone(a.phone));
}

export function isClassEnded(event: ScheduleEvent, now = new Date()): boolean {
  return getEventEndTime(event).getTime() <= now.getTime();
}

/** Class ended, has phones, survey not sent yet. */
export function needsClassFeedback(event: ScheduleEvent, now = new Date()): boolean {
  if (event.feedbackSentAt) return false;
  if (!isClassEnded(event, now)) return false;
  return getAttendeesWithPhone(event).length > 0;
}

export function findPendingFeedbackEvents(
  events: ScheduleEvent[],
  now = new Date(),
  scope?: FeedbackScope
): ScheduleEvent[] {
  return events
    .filter((ev) => isEventInFeedbackScope(ev, scope))
    .filter((ev) => needsClassFeedback(ev, now))
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

export function buildClassFeedbackMessage(event: ScheduleEvent): string {
  const surveyUrl = buildClassSurveyUrl(event);
  const instructor = event.instructor?.trim();
  const thanks = instructor
    ? `Hi! Thanks for joining "${event.title}" with ${instructor} today.`
    : `Hi! Thanks for joining "${event.title}" today.`;
  return `${thanks} We'd love your feedback — it only takes a minute: ${surveyUrl}`;
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
