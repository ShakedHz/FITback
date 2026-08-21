export type ScheduleEventSource = 'arbox' | 'flowpilates';

export type StudioRole = 'studio_manager' | 'instructor';

export type EventCategory =
  | 'pilates'
  | 'reformer'
  | 'prenatal'
  | 'stretch'
  | 'power'
  | 'yoga'
  | 'hiit'
  | 'barre'
  | 'cycle'
  | 'movana';

export interface ScheduleAttendee {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  lessonId?: string;
  /** FITback lesson plan attached to an Arbox slot */
  lessonPlanId?: string;
  lessonPlanTitle?: string;
  start: string;
  duration: number;
  source: ScheduleEventSource;
  arboxId?: string;
  location?: string;
  instructor?: string;
  instructorId?: string;
  enrolled?: number;
  capacity?: number;
  category?: EventCategory;
  attendees?: ScheduleAttendee[];
  feedbackSentAt?: string | null;
}

export interface ArboxStaffMember {
  id: string;
  name: string;
  role: StudioRole;
}

export interface ArboxConnection {
  connected: boolean;
  apiKey: string;
  lastSyncedAt: string | null;
  clubName: string;
  clubId: string;
  role: StudioRole;
  staffId: string;
  staffName: string;
  /** Arbox staff user id for the logged-in instructor (from team picker or auto-detect). */
  linkedInstructorId?: string;
  team: ArboxStaffMember[];
  autoFeedbackEnabled: boolean;
  /** live = real Arbox API; demo = local sample data */
  dataSource?: 'live' | 'demo';
  scheduleDebug?: {
    rowCount: number;
    mappedCount?: number;
    from?: string;
    to?: string;
    weekFrom?: string;
    weekTo?: string;
    message?: string;
  };
}

export interface ArboxMessageLog {
  id: string;
  eventId: string;
  eventTitle: string;
  instructorName: string;
  recipientCount: number;
  surveyUrl: string;
  sentAt: string;
  status: 'sent' | 'pending' | 'failed';
}

export const EVENT_CATEGORY_COLORS: Record<EventCategory, { bg: string; border: string; text: string }> = {
  pilates: { bg: '#3B82F6', border: '#2563EB', text: '#ffffff' },
  reformer: { bg: '#8B5CF6', border: '#7C3AED', text: '#ffffff' },
  prenatal: { bg: '#EC4899', border: '#DB2777', text: '#ffffff' },
  stretch: { bg: '#14B8A6', border: '#0D9488', text: '#ffffff' },
  power: { bg: '#F59E0B', border: '#D97706', text: '#ffffff' },
  yoga: { bg: '#10B981', border: '#059669', text: '#ffffff' },
  hiit: { bg: '#EF4444', border: '#DC2626', text: '#ffffff' },
  barre: { bg: '#F472B6', border: '#EC4899', text: '#ffffff' },
  cycle: { bg: '#F59E0B', border: '#D97706', text: '#1e293b' },
  movana: { bg: '#6366F1', border: '#4F46E5', text: '#ffffff' },
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  pilates: 'Pilates',
  reformer: 'Reformer',
  prenatal: 'Prenatal',
  stretch: 'Stretch',
  power: 'Power',
  yoga: 'Yoga',
  hiit: 'HIIT',
  barre: 'Barre',
  cycle: 'Cycle',
  movana: 'FITback',
};

export const SCHEDULE_START_HOUR = 8;
export const SCHEDULE_END_HOUR = 20;
export const SCHEDULE_HOUR_HEIGHT = 48;

export const ARBOX_EVENT_COLORS: { bg: string; border: string; text: string } = {
  bg: '#64748b',
  border: '#475569',
  text: '#ffffff',
};

export function inferEventCategory(title: string, source: ScheduleEventSource): EventCategory {
  if (source === 'flowpilates') return 'movana';
  if (source === 'arbox') return 'pilates';
  const t = title.toLowerCase();
  if (t.includes('yoga') || t.includes('vinyasa')) return 'yoga';
  if (t.includes('hiit')) return 'hiit';
  if (t.includes('barre')) return 'barre';
  if (t.includes('cycle') || t.includes('spin') || t.includes('bike')) return 'cycle';
  if (t.includes('reformer')) return 'reformer';
  if (t.includes('prenatal')) return 'prenatal';
  if (t.includes('stretch')) return 'stretch';
  if (t.includes('power') || t.includes('advanced')) return 'power';
  return 'pilates';
}

export function getEventCategory(event: ScheduleEvent): EventCategory {
  if (event.source === 'arbox') {
    return event.category ?? 'pilates';
  }
  return event.category ?? inferEventCategory(event.title, event.source);
}

export function getEventColors(event: ScheduleEvent): { bg: string; border: string; text: string } {
  if (event.source === 'arbox') return ARBOX_EVENT_COLORS;
  return EVENT_CATEGORY_COLORS[getEventCategory(event)];
}

export function shouldShowEventType(event: ScheduleEvent): boolean {
  return event.source !== 'arbox';
}

export function getEventMinutes(event: ScheduleEvent): number {
  const d = new Date(event.start);
  return d.getHours() * 60 + d.getMinutes();
}

export function getEventTopPx(event: ScheduleEvent): number {
  const startMin = SCHEDULE_START_HOUR * 60;
  return ((getEventMinutes(event) - startMin) / 60) * SCHEDULE_HOUR_HEIGHT;
}

export function getEventHeightPx(duration: number): number {
  return Math.max((duration / 60) * SCHEDULE_HOUR_HEIGHT - 3, 30);
}

export function yToScheduleTime(y: number): string {
  const totalMinutes = SCHEDULE_START_HOUR * 60 + (y / SCHEDULE_HOUR_HEIGHT) * 60;
  const snapped = Math.round(totalMinutes / 15) * 15;
  const h = Math.floor(snapped / 60);
  const m = snapped % 60;
  const clampedH = Math.max(SCHEDULE_START_HOUR, Math.min(SCHEDULE_END_HOUR - 1, h));
  return `${String(clampedH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDayStrip(date: Date, locale = 'en-US'): { dow: string; num: string } {
  return {
    dow: date.toLocaleDateString(locale, { weekday: 'short' }),
    num: String(date.getDate()),
  };
}

export function formatFullDayLabel(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
}

export const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

/** Pick in Schedule → Add to simulate a class that just ended (auto-feedback test). */
export const JUST_ENDED_TIME = '__just_ended__';

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDayLabel(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale, { weekday: 'short', month: 'numeric', day: 'numeric' });
}

export function formatWeekRange(weekStart: Date, locale = 'en-US'): string {
  const end = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${weekStart.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
}

/** Local calendar date key (YYYY-MM-DD), not UTC. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function combineDateAndTime(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00`).toISOString();
}

export function getEventDateKey(event: ScheduleEvent): string {
  return toDateKey(new Date(event.start));
}

export function getEventTime(event: ScheduleEvent): string {
  const d = new Date(event.start);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getEventEndTime(event: ScheduleEvent): Date {
  return new Date(new Date(event.start).getTime() + event.duration * 60_000);
}

export function isEventEnded(event: ScheduleEvent, now = new Date()): boolean {
  return getEventEndTime(event) <= now;
}

export function normalizeInstructorKey(value: string): string {
  return value.trim().toLowerCase();
}

export function findTeamMember(
  connection: ArboxConnection,
  key: string | undefined
): ArboxStaffMember | undefined {
  if (!key) return undefined;
  const norm = normalizeInstructorKey(key);
  return connection.team.find(
    (m) =>
      normalizeInstructorKey(m.id) === norm || normalizeInstructorKey(m.name) === norm
  );
}

export function linkedTeamMember(connection: ArboxConnection): ArboxStaffMember | undefined {
  if (!connection.linkedInstructorId) return undefined;
  return findTeamMember(connection, connection.linkedInstructorId);
}

export function teamFromScheduleEvents(events: ScheduleEvent[]): ArboxStaffMember[] {
  const byId = new Map<string, ArboxStaffMember>();
  for (const ev of events) {
    if (ev.source !== 'arbox') continue;
    const id = ev.instructorId ?? ev.instructor;
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name: ev.instructor?.trim() || id,
        role: 'instructor',
      });
    }
  }
  return [...byId.values()];
}

/** Keep staff API roles; add schedule-only instructors without overwriting. */
export function mergeArboxTeams(
  staffTeam: ArboxStaffMember[],
  scheduleTeam: ArboxStaffMember[]
): ArboxStaffMember[] {
  const byId = new Map(staffTeam.map((m) => [m.id, m]));
  for (const member of scheduleTeam) {
    if (!byId.has(member.id)) byId.set(member.id, member);
  }
  return [...byId.values()];
}

export function isOwnEvent(event: ScheduleEvent, connection: ArboxConnection): boolean {
  if (!connection.connected) return event.source === 'flowpilates';

  const eventKeys = [event.instructorId, event.instructor].filter(
    (v): v is string => Boolean(v)
  );
  const linked = linkedTeamMember(connection);

  if (linked) {
    const linkedKeys = [linked.id, linked.name].map(normalizeInstructorKey);
    if (eventKeys.some((k) => linkedKeys.includes(normalizeInstructorKey(k)))) {
      return true;
    }
  }

  if (connection.linkedInstructorId) {
    const lid = normalizeInstructorKey(connection.linkedInstructorId);
    if (eventKeys.some((k) => normalizeInstructorKey(k) === lid)) return true;
  }

  if (event.source === 'flowpilates') {
    if (eventKeys.length === 0) return true;
    return eventKeys.some(
      (k) => normalizeInstructorKey(k) === normalizeInstructorKey(connection.staffId)
    );
  }

  return false;
}

export function canAttachPlanToEvent(
  event: ScheduleEvent,
  connection: ArboxConnection
): boolean {
  if (!connection.connected) return event.source === 'flowpilates';
  return isOwnEvent(event, connection);
}

export const EMPTY_ARBOX_CONNECTION: ArboxConnection = {
  connected: false,
  apiKey: '',
  lastSyncedAt: null,
  clubName: '',
  clubId: '',
  role: 'instructor',
  staffId: '',
  staffName: '',
  team: [],
  autoFeedbackEnabled: true,
};
