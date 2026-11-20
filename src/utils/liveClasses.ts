import {
  getEventEndTime,
  isOwnEvent,
  toDateKey,
  type ArboxConnection,
  type ScheduleEvent,
} from '@/data/scheduleTypes';
import type { Lesson } from '@/data/mockData';
import { exerciseName, sectionTitle, type Locale } from '@/i18n';
import type { WatchClass, WatchPayload } from '@/services/garminWatch';

export type LiveStatus = 'done' | 'live' | 'upcoming';

export interface LiveClass {
  event: ScheduleEvent;
  title: string;
  start: Date;
  end: Date;
  status: LiveStatus;
}

export function liveClassTitle(event: ScheduleEvent): string {
  return event.lessonPlanTitle?.trim() || event.title;
}

/** Today's classes for the signed-in instructor, in start order. */
export function todaysClasses(
  events: ScheduleEvent[],
  connection: ArboxConnection,
  now = new Date()
): LiveClass[] {
  const key = toDateKey(now);
  return events
    .filter((ev) => toDateKey(new Date(ev.start)) === key)
    .filter((ev) => !connection.connected || isOwnEvent(ev, connection))
    .map((event) => {
      const start = new Date(event.start);
      const end = getEventEndTime(event);
      const status: LiveStatus = end <= now ? 'done' : start <= now ? 'live' : 'upcoming';
      return { event, title: liveClassTitle(event), start, end, status };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function planIdOf(event: ScheduleEvent): string | undefined {
  return event.lessonPlanId ?? event.lessonId;
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Plain-text plan, one section per line, sized to read on a watch notification.
 */
export function planOutline(lesson: Lesson, t: Translate, locale: Locale, maxLen = 700): string {
  const text = lesson.sections
    .filter((s) => s.exercises.length > 0)
    .map((s) => `${sectionTitle(s.title, t)}: ${s.exercises.map((e) => exerciseName(e, locale)).join(', ')}`)
    .join('\n');
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

export function classNotificationBody(
  c: LiveClass,
  lesson: Lesson | undefined,
  t: Translate,
  locale: Locale
): string {
  const place = c.event.location ? ` · ${c.event.location}` : '';
  const head = `${formatClock(c.start)}–${formatClock(c.end)}${place}`;
  const outline = lesson ? planOutline(lesson, t, locale) : '';
  return outline ? `${head}\n\n${outline}` : head;
}

/**
 * Today's classes shaped for the Garmin app. Keys are single letters and the whole
 * thing is capped, because a Connect IQ message has to fit in the watch's memory.
 */
export function buildWatchPayload(
  classes: LiveClass[],
  lessonById: (id: string) => Lesson | undefined,
  t: Translate,
  locale: Locale,
  maxChars = WATCH_PAYLOAD_MAX_CHARS
): WatchPayload {
  const payload: WatchPayload = {
    v: 1,
    d: classes.length > 0 ? dayLabel(classes[0].start) : dayLabel(new Date()),
    c: [],
  };

  for (const c of classes) {
    const planId = planIdOf(c.event);
    const lesson = planId ? lessonById(planId) : undefined;
    const entry: WatchClass = {
      s: formatClock(c.start),
      e: formatClock(c.end),
      t: c.title,
      p: lesson ? watchSections(lesson, t, locale) : [],
    };
    if (c.event.location) entry.l = c.event.location;

    payload.c.push(entry);
    // Drop the exercise lists of the classes furthest away before dropping a class.
    while (JSON.stringify(payload).length > maxChars && trimOne(payload.c)) {
      /* keep trimming */
    }
  }

  return payload;
}

const WATCH_PAYLOAD_MAX_CHARS = 6000;

function dayLabel(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function watchSections(lesson: Lesson, t: Translate, locale: Locale): WatchClass['p'] {
  return lesson.sections
    .filter((s) => s.exercises.length > 0)
    .map((s) => ({
      t: sectionTitle(s.title, t),
      x: s.exercises.map((e) => exerciseName(e, locale)),
    }));
}

/** Empties the plan of the last class that still has one. Returns false when there is nothing left to trim. */
function trimOne(classes: WatchClass[]): boolean {
  for (let i = classes.length - 1; i >= 0; i--) {
    if (classes[i].p.length > 0) {
      classes[i].p = [];
      return true;
    }
  }
  return false;
}

export function summaryBody(classes: LiveClass[]): string {
  return classes.map((c) => `${formatClock(c.start)}  ${c.title}`).join('\n');
}

export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 60_000));
}
