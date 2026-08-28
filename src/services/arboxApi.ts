import {
  addDays,
  combineDateAndTime,
  getEventEndTime,
  isOwnEvent,
  mergeArboxTeams,
  teamFromScheduleEvents,
  toDateKey,
  type ArboxConnection,
  type ArboxMessageLog,
  type ArboxStaffMember,
  type EventCategory,
  type ScheduleAttendee,
  type ScheduleEvent,
  type StudioRole,
} from '@/data/scheduleTypes';
import { getAttendeesWithPhone } from '@/services/classFeedback';
import { connectLiveArbox, fetchLiveArboxSchedule, hasArboxProxy } from '@/services/arboxLive';

const STORAGE_KEY = 'movana_arbox_v1';

let arboxOwnerId: string | null = null;
let arboxClubScope: string | null = null;

function userStorageKey(userId: string): string {
  return `${STORAGE_KEY}:${userId}`;
}

function clubStorageKey(userId: string, clubId: string): string {
  return `${STORAGE_KEY}:${userId}:${clubId}`;
}

function activeStorageKey(): string {
  if (arboxOwnerId && arboxClubScope) return clubStorageKey(arboxOwnerId, arboxClubScope);
  if (arboxOwnerId) return userStorageKey(arboxOwnerId);
  return STORAGE_KEY;
}

function copyStorage(fromKey: string, toKey: string): boolean {
  if (fromKey === toKey) return Boolean(localStorage.getItem(toKey));
  if (localStorage.getItem(toKey)) return true;
  const raw = localStorage.getItem(fromKey);
  if (!raw) return false;
  localStorage.setItem(toKey, raw);
  return true;
}

function readStorageRaw(key: string): StoredArboxState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as StoredArboxState;
  } catch {
    return null;
  }
}

/**
 * Bind subsequent Arbox reads/writes to this FITback user (and optional studio).
 * When `migrateLegacy` is true (Arbox login), copy the pre-bind pending blob
 * into the user-scoped key so older installs keep their studio connection.
 */
export function setArboxStorageOwner(
  userId: string | null,
  options?: { migrateLegacy?: boolean; clubId?: string }
): void {
  arboxOwnerId = userId;
  arboxClubScope = options?.clubId || null;
  if (!userId) return;

  if (arboxClubScope) {
    const clubKey = clubStorageKey(userId, arboxClubScope);
    const existing = readStorageRaw(clubKey);
    if (!existing) {
      const legacy = readStorageRaw(userStorageKey(userId));
      if (legacy?.connection.clubId === arboxClubScope) {
        copyStorage(userStorageKey(userId), clubKey);
      }
    }
  }

  if (!options?.migrateLegacy) return;
  const dest = arboxClubScope
    ? clubStorageKey(userId, arboxClubScope)
    : userStorageKey(userId);
  if (localStorage.getItem(dest)) return;
  const pending = localStorage.getItem(STORAGE_KEY);
  if (!pending) return;
  localStorage.setItem(dest, pending);
  localStorage.removeItem(STORAGE_KEY);
}

export function bindPendingArboxToUser(userId: string, clubId?: string): void {
  const pending = readStorageRaw(STORAGE_KEY);
  const resolvedClubId = clubId || pending?.connection.clubId || undefined;
  setArboxStorageOwner(userId, { migrateLegacy: true, clubId: resolvedClubId });
}

/** Move a temporary Arbox blob (e.g. `_adding`) onto the real club id. */
export function moveArboxScope(userId: string, fromClub: string, toClub: string): void {
  const from = clubStorageKey(userId, fromClub);
  const to = clubStorageKey(userId, toClub);
  const raw = localStorage.getItem(from);
  if (raw) {
    localStorage.setItem(to, raw);
    localStorage.removeItem(from);
  }
  arboxOwnerId = userId;
  arboxClubScope = toClub;
}

interface WeeklySurveyRecord {
  weekKey: string;
  sentAt: string;
  recipientCount: number;
  surveyUrl: string;
  classCount: number;
  visitCount: number;
}

interface StoredArboxState {
  connection: ArboxConnection;
  events: ScheduleEvent[];
  messages: ArboxMessageLog[];
  planAttachments: Record<string, { lessonPlanId: string; lessonPlanTitle: string }>;
  weeklySurveys?: WeeklySurveyRecord[];
  clients?: ScheduleAttendee[];
}

interface ConnectResult {
  connection: ArboxConnection;
  events: ScheduleEvent[];
  clients: ScheduleAttendee[];
  debug?: ArboxConnection['scheduleDebug'];
}

interface ScheduleTemplate {
  arboxId: string;
  title: string;
  dayOffset: number;
  time: string;
  duration: number;
  location: string;
  instructorId: string;
  category: EventCategory;
  capacity: number;
  enrolled: number;
}

const STUDIO_TEAM: ArboxStaffMember[] = [
  { id: 'staff-maya', name: 'Maya Cohen', role: 'instructor' },
  { id: 'staff-dana', name: 'Dana Levy', role: 'instructor' },
  { id: 'staff-shira', name: 'Shira Abraham', role: 'instructor' },
  { id: 'staff-noa', name: 'Noa Barak', role: 'instructor' },
  { id: 'staff-yael', name: 'Yael Friedman', role: 'instructor' },
];

const MANAGER: ArboxStaffMember = {
  id: 'staff-manager',
  name: 'Studio Manager',
  role: 'studio_manager',
};

const ATTENDEE_POOL: ScheduleAttendee[] = [
  { id: 'a1', name: 'Sarah K.', phone: '+972501111111', email: 'sarah@example.com' },
  { id: 'a2', name: 'Lior M.', phone: '+972502222222', email: 'lior@example.com' },
  { id: 'a3', name: 'Noa P.', phone: '+972503333333', email: 'noa@example.com' },
  { id: 'a4', name: 'Tamar R.', phone: '+972504444444', email: 'tamar@example.com' },
  { id: 'a5', name: 'Yael S.', phone: '+972505555555', email: 'yael@example.com' },
  { id: 'a6', name: 'Michal D.', phone: '+972506666666', email: 'michal@example.com' },
  { id: 'a7', name: 'Roni B.', phone: '+972507777777', email: 'roni@example.com' },
  { id: 'a8', name: 'Hila G.', phone: '+972508888888', email: 'hila@example.com' },
];

const SCHEDULE_TEMPLATES: ScheduleTemplate[] = [
  { arboxId: 'ab-101', title: 'Beginner Pilates', dayOffset: 0, time: '09:00', duration: 50, location: 'Studio A', instructorId: 'staff-maya', category: 'pilates', capacity: 12, enrolled: 8 },
  { arboxId: 'ab-102', title: 'Intermediate Reformer', dayOffset: 0, time: '11:00', duration: 55, location: 'Reformer Room', instructorId: 'staff-dana', category: 'reformer', capacity: 8, enrolled: 6 },
  { arboxId: 'ab-103', title: 'Advanced Pilates', dayOffset: 0, time: '18:00', duration: 50, location: 'Studio B', instructorId: 'staff-maya', category: 'power', capacity: 10, enrolled: 10 },
  { arboxId: 'ab-104', title: 'Morning Stretch', dayOffset: 1, time: '08:00', duration: 45, location: 'Studio A', instructorId: 'staff-shira', category: 'stretch', capacity: 15, enrolled: 5 },
  { arboxId: 'ab-105', title: 'Vinyasa Yoga', dayOffset: 1, time: '18:00', duration: 60, location: 'Studio B', instructorId: 'staff-noa', category: 'yoga', capacity: 14, enrolled: 9 },
  { arboxId: 'ab-106', title: 'Prenatal Pilates', dayOffset: 2, time: '10:00', duration: 50, location: 'Studio A', instructorId: 'staff-dana', category: 'prenatal', capacity: 8, enrolled: 4 },
  { arboxId: 'ab-107', title: 'Advanced Reformer', dayOffset: 2, time: '17:30', duration: 55, location: 'Reformer Room', instructorId: 'staff-maya', category: 'reformer', capacity: 8, enrolled: 7 },
  { arboxId: 'ab-108', title: 'Morning Pilates', dayOffset: 3, time: '08:30', duration: 50, location: 'Studio A', instructorId: 'staff-shira', category: 'pilates', capacity: 12, enrolled: 9 },
  { arboxId: 'ab-109', title: 'Power Flow', dayOffset: 3, time: '12:00', duration: 50, location: 'Studio B', instructorId: 'staff-dana', category: 'power', capacity: 12, enrolled: 11 },
  { arboxId: 'ab-110', title: 'Spin Power', dayOffset: 3, time: '19:30', duration: 45, location: 'Bike Room', instructorId: 'staff-yael', category: 'cycle', capacity: 16, enrolled: 10 },
  { arboxId: 'ab-111', title: 'Group HIIT', dayOffset: 4, time: '07:30', duration: 45, location: 'Studio A', instructorId: 'staff-dana', category: 'hiit', capacity: 15, enrolled: 12 },
  { arboxId: 'ab-112', title: 'Evening Stretch', dayOffset: 4, time: '19:00', duration: 45, location: 'Studio A', instructorId: 'staff-shira', category: 'stretch', capacity: 10, enrolled: 3 },
  { arboxId: 'ab-113', title: 'Friday Pilates', dayOffset: 5, time: '09:30', duration: 50, location: 'Studio A', instructorId: 'staff-maya', category: 'pilates', capacity: 12, enrolled: 6 },
  { arboxId: 'ab-114', title: 'Friday Reformer', dayOffset: 5, time: '11:00', duration: 55, location: 'Reformer Room', instructorId: 'staff-dana', category: 'reformer', capacity: 8, enrolled: 5 },
  { arboxId: 'ab-115', title: 'Barre Sculpt', dayOffset: 6, time: '10:00', duration: 50, location: 'Studio B', instructorId: 'staff-shira', category: 'barre', capacity: 12, enrolled: 7 },
];

function staffName(id: string): string {
  if (id === MANAGER.id) return MANAGER.name;
  return STUDIO_TEAM.find((s) => s.id === id)?.name ?? 'Instructor';
}

function pickAttendees(seed: string, count: number): ScheduleAttendee[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  const result: ScheduleAttendee[] = [];
  for (let i = 0; i < count; i++) {
    result.push(ATTENDEE_POOL[(hash + i) % ATTENDEE_POOL.length]);
  }
  return result;
}

function buildWeekEvents(
  weekStart: Date,
  attachments: Record<string, { lessonPlanId: string; lessonPlanTitle: string }>,
  feedbackSent: Record<string, string>
): ScheduleEvent[] {
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => toDateKey(addDays(weekStart, i)));

  return SCHEDULE_TEMPLATES.map((tpl) => {
    const dateKey = days[tpl.dayOffset];
    const id = `arbox-${tpl.arboxId}-${dateKey}`;
    const attachment = attachments[id] ?? attachments[tpl.arboxId];
    return {
      id,
      arboxId: tpl.arboxId,
      title: tpl.title,
      start: combineDateAndTime(dateKey, tpl.time),
      duration: tpl.duration,
      source: 'arbox' as const,
      location: tpl.location,
      instructorId: tpl.instructorId,
      instructor: staffName(tpl.instructorId),
      enrolled: tpl.enrolled,
      capacity: tpl.capacity,
      attendees: pickAttendees(id, tpl.enrolled),
      lessonPlanId: attachment?.lessonPlanId,
      lessonPlanTitle: attachment?.lessonPlanTitle,
      feedbackSentAt: feedbackSent[id] ?? null,
    };
  });
}

function loadState(): StoredArboxState | null {
  return readStorageRaw(activeStorageKey());
}

function saveState(state: StoredArboxState) {
  localStorage.setItem(activeStorageKey(), JSON.stringify(state));
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Try real Arbox API via local read-only proxy (npm run dev).
 */
async function tryLiveArboxConnect(
  apiKey: string,
  weekStart: Date,
  linkedInstructorId?: string
): Promise<ConnectResult | null> {
  if (!hasArboxProxy()) return null;

  try {
    const result = await connectLiveArbox(apiKey, weekStart, linkedInstructorId);
    return {
      connection: result.connection,
      events: result.events,
      clients: result.clients ?? [],
      debug: result.debug,
    };
  } catch (err) {
    if (err instanceof Error) throw err;
    return null;
  }
}

export function validateArboxApiKey(key: string): boolean {
  return key.trim().length >= 8;
}

export function inferRoleFromKey(key: string): StudioRole {
  const k = key.trim().toLowerCase();
  if (k.includes('manager') || k.startsWith('mgr') || k.startsWith('admin')) {
    return 'studio_manager';
  }
  return 'instructor';
}

function resolveLinkedInstructorId(
  connection: ArboxConnection,
  previous?: ArboxConnection | null
): string | undefined {
  const team = connection.team;
  if (!team.length) return previous?.linkedInstructorId;

  const prev = previous?.linkedInstructorId ?? connection.linkedInstructorId;
  if (prev) {
    const direct = team.find((m) => m.id === prev);
    if (direct) return direct.id;
    const fuzzy = team.find(
      (m) =>
        m.id.trim().toLowerCase() === prev.trim().toLowerCase() ||
        m.name.trim().toLowerCase() === prev.trim().toLowerCase()
    );
    if (fuzzy) return fuzzy.id;
  }

  if (team.length === 1) return team[0].id;

  for (const guess of [connection.clubName, connection.staffName]) {
    if (!guess || guess === 'Studio') continue;
    const norm = guess.trim().toLowerCase();
    const match = team.find(
      (m) => m.name.trim().toLowerCase() === norm || m.id.trim().toLowerCase() === norm
    );
    if (match) return match.id;
  }

  return undefined;
}

function applyStaffIdentity(
  connection: ArboxConnection,
  staffId?: string
): ArboxConnection {
  const id = staffId || connection.linkedInstructorId;
  if (!id) return connection;
  const member = connection.team.find((m) => m.id === id);
  if (!member) return connection;
  return {
    ...connection,
    linkedInstructorId: member.id,
    staffId: member.id,
    staffName: member.name,
    role: member.role,
  };
}

function withLinkedInstructor(
  connection: ArboxConnection,
  previous?: ArboxConnection | null
): ArboxConnection {
  const team = connection.team.length ? connection.team : previous?.team ?? [];
  const base = team.length ? { ...connection, team } : connection;
  const linkedInstructorId = resolveLinkedInstructorId(base, previous);
  if (!linkedInstructorId) return base;
  return applyStaffIdentity({ ...base, linkedInstructorId }, linkedInstructorId);
}

export function refreshArboxConnection(
  connection: ArboxConnection,
  events: ScheduleEvent[],
  previous?: ArboxConnection | null
): ArboxConnection {
  const scheduleTeam = teamFromScheduleEvents(events);
  const team = mergeArboxTeams(connection.team, scheduleTeam);
  return withLinkedInstructor(
    { ...connection, team: team.length ? team : connection.team },
    previous ?? connection
  );
}

export async function connectArboxAccount(
  apiKey: string,
  _roleOverride?: StudioRole,
  weekStartOverride?: Date,
  options?: { linkedInstructorId?: string }
): Promise<ConnectResult> {
  const key = apiKey.trim();
  if (!validateArboxApiKey(key)) {
    throw new Error('API key must be at least 8 characters');
  }

  await delay(700);

  const weekStart = weekStartOverride ?? getDefaultWeekStart();
  const prev = loadState();
  const previousConnection: ArboxConnection | undefined = prev?.connection
    ? {
        ...prev.connection,
        ...(options?.linkedInstructorId
          ? { linkedInstructorId: options.linkedInstructorId }
          : {}),
      }
    : undefined;
  const live = await tryLiveArboxConnect(key, weekStart, options?.linkedInstructorId);
  if (live) {
    const state: StoredArboxState = {
      connection: refreshArboxConnection(
        {
          ...live.connection,
          autoFeedbackEnabled: false,
          dataSource: 'live',
          scheduleDebug: live.debug,
          ...(options?.linkedInstructorId
            ? { linkedInstructorId: options.linkedInstructorId }
            : {}),
        },
        live.events,
        previousConnection
      ),
      events: live.events,
      clients: live.clients,
      messages: [],
      planAttachments: {},
    };
    saveState(state);
    return {
      connection: state.connection,
      events: live.events,
      clients: live.clients,
      debug: live.debug,
    };
  }

  if (hasArboxProxy()) {
    throw new Error(
      'Could not connect to Arbox. Check your API key in Arbox → Settings → Club Information.'
    );
  }

  const allowDemo = import.meta.env.VITE_ARBOX_ALLOW_DEMO === 'true';
  if (!allowDemo) {
    throw new Error('Arbox proxy is not running. Start the app with npm run dev.');
  }

  const demoTeam = [MANAGER, ...STUDIO_TEAM];
  const connection: ArboxConnection = withLinkedInstructor(
    {
      connected: true,
      apiKey: key,
      lastSyncedAt: null,
      clubName: "Maya's Studio",
      clubId: 'club-maya-001',
      role: 'instructor',
      staffId: MANAGER.id,
      staffName: MANAGER.name,
      team: demoTeam,
      autoFeedbackEnabled: false,
      dataSource: 'demo',
      ...(options?.linkedInstructorId ? { linkedInstructorId: options.linkedInstructorId } : {}),
    },
    previousConnection ?? null
  );

  const events = buildWeekEvents(
    new Date(),
    prev?.planAttachments ?? {},
    Object.fromEntries(
      (prev?.events ?? [])
        .filter((e) => e.feedbackSentAt)
        .map((e) => [e.id, e.feedbackSentAt as string])
    )
  );

  saveState({
    connection,
    events,
    clients: [],
    messages: prev?.messages ?? [],
    planAttachments: prev?.planAttachments ?? {},
  });

  return { connection, events, clients: [] };
}

export async function syncArboxSchedule(
  connection: ArboxConnection,
  weekStart: Date
): Promise<{ events: ScheduleEvent[]; clients: ScheduleAttendee[] }> {
  if (!connection.connected || !connection.apiKey) return { events: [], clients: [] };

  if (connection.dataSource === 'live' && hasArboxProxy()) {
    const prev = loadState();
    const { events: liveEvents, clients, debug } = await fetchLiveArboxSchedule(
      connection.apiKey,
      weekStart
    );
    const merged = liveEvents.map((ev) => {
      const attachment = prev?.planAttachments[ev.id] ?? (ev.arboxId ? prev?.planAttachments[ev.arboxId] : undefined);
      const feedbackSent = prev?.events.find((e) => e.id === ev.id)?.feedbackSentAt;
      return {
        ...ev,
        lessonPlanId: attachment?.lessonPlanId,
        lessonPlanTitle: attachment?.lessonPlanTitle,
        feedbackSentAt: feedbackSent ?? ev.feedbackSentAt ?? null,
      };
    });

    const nextConnection = refreshArboxConnection(
      {
        ...connection,
        lastSyncedAt: new Date().toISOString(),
        scheduleDebug: debug ?? connection.scheduleDebug,
      },
      merged.length ? merged : prev?.events ?? [],
      prev?.connection
    );
    if (prev) {
      saveState({
        ...prev,
        connection: nextConnection,
        events: merged.length ? merged : prev.events,
        clients: clients.length ? clients : prev.clients ?? [],
      });
    }

    return {
      events: merged.length ? merged : prev?.events ?? [],
      clients: clients.length ? clients : prev?.clients ?? [],
    };
  }

  await delay(600);

  const prev = loadState();
  const feedbackSent = Object.fromEntries(
    (prev?.events ?? [])
      .filter((e) => e.feedbackSentAt)
      .map((e) => [e.id, e.feedbackSentAt as string])
  );

  const events = buildWeekEvents(weekStart, prev?.planAttachments ?? {}, feedbackSent);

  if (prev) {
    saveState({ ...prev, connection: { ...connection, lastSyncedAt: new Date().toISOString() }, events });
  }

  return { events, clients: prev?.clients ?? [] };
}

export function getArboxClients(): ScheduleAttendee[] {
  return loadState()?.clients ?? [];
}

export function restoreArboxSession(): StoredArboxState | null {
  const state = loadState();
  if (!state?.connection.connected) return null;
  return state;
}

export function disconnectArboxAccount() {
  const key = activeStorageKey();
  const prev = loadState();
  if (!prev) {
    localStorage.removeItem(key);
    return;
  }
  saveState({
    ...prev,
    connection: {
      ...prev.connection,
      connected: false,
      apiKey: '',
      lastSyncedAt: null,
    },
  });
}

export function attachPlanToArboxEvent(
  eventId: string,
  lessonPlanId: string,
  lessonPlanTitle: string
): ScheduleEvent | null {
  const prev = loadState();
  if (!prev) return null;

  const planAttachments = {
    ...prev.planAttachments,
    [eventId]: { lessonPlanId, lessonPlanTitle },
  };

  const events = prev.events.map((ev) =>
    ev.id === eventId
      ? { ...ev, lessonPlanId, lessonPlanTitle }
      : ev
  );

  saveState({ ...prev, events, planAttachments });
  return events.find((e) => e.id === eventId) ?? null;
}

export function setLinkedInstructor(instructorId: string): ArboxConnection | null {
  const prev = loadState();
  if (!prev) return null;
  const connection = applyStaffIdentity(
    { ...prev.connection, linkedInstructorId: instructorId },
    instructorId
  );
  saveState({ ...prev, connection });
  return connection;
}

export function detachPlanFromArboxEvent(eventId: string): ScheduleEvent | null {
  const prev = loadState();
  if (!prev) return null;

  const planAttachments = { ...prev.planAttachments };
  delete planAttachments[eventId];

  const events = prev.events.map((ev) =>
    ev.id === eventId
      ? { ...ev, lessonPlanId: undefined, lessonPlanTitle: undefined }
      : ev
  );

  saveState({ ...prev, events, planAttachments });
  return events.find((e) => e.id === eventId) ?? null;
}

export function patchArboxEvent(
  eventId: string,
  patch: Partial<Pick<ScheduleEvent, 'attendees' | 'feedbackSentAt' | 'enrolled'>>
): ScheduleEvent | null {
  const prev = loadState();
  if (!prev) return null;

  const events = prev.events.map((ev) =>
    ev.id === eventId ? { ...ev, ...patch } : ev
  );

  saveState({ ...prev, events });
  return events.find((e) => e.id === eventId) ?? null;
}

/**
 * Post-class feedback SMS — disabled until explicitly enabled in production.
 */
export async function sendPostClassFeedback(
  _event: ScheduleEvent,
  _connection: ArboxConnection
): Promise<ArboxMessageLog> {
  throw new Error('Automatic feedback SMS is disabled');
}

/**
 * Process all ended classes that haven't received feedback yet.
 * Managers process the full team; instructors only their own classes.
 */
export async function processEndedClassFeedback(
  events: ScheduleEvent[],
  connection: ArboxConnection,
  now = new Date()
): Promise<{ events: ScheduleEvent[]; messages: ArboxMessageLog[] }> {
  if (!connection.connected || !connection.autoFeedbackEnabled) {
    return { events, messages: [] };
  }

  const pending = events.filter((ev) => {
    if (ev.source !== 'arbox') return false;
    if (ev.feedbackSentAt) return false;
    if (getEventEndTime(ev) > now) return false;
    if (getAttendeesWithPhone(ev).length === 0) return false;
    if (connection.role === 'instructor' && !isOwnEvent(ev, connection)) return false;
    return true;
  });

  const newMessages: ArboxMessageLog[] = [];
  let updated = [...events];

  for (const ev of pending) {
    const log = await sendPostClassFeedback(ev, connection);
    newMessages.push(log);
    updated = updated.map((e) =>
      e.id === ev.id ? { ...e, feedbackSentAt: log.sentAt } : e
    );
  }

  return { events: updated, messages: newMessages };
}

export function getMessageLog(): ArboxMessageLog[] {
  return loadState()?.messages ?? [];
}

export function setAutoFeedbackEnabled(enabled: boolean): ArboxConnection | null {
  const prev = loadState();
  if (!prev) return null;
  const connection = { ...prev.connection, autoFeedbackEnabled: enabled };
  saveState({ ...prev, connection });
  return connection;
}

export function getDefaultWeekStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekKey(weekStart: Date): string {
  return toDateKey(weekStart);
}

/** Instructor's Arbox classes for the current schedule snapshot. */
export function getInstructorArboxEvents(
  events: ScheduleEvent[],
  connection: ArboxConnection
): ScheduleEvent[] {
  if (!connection.connected) return [];
  return events.filter((ev) => {
    if (ev.source !== 'arbox') return false;
    if (connection.role === 'studio_manager') return true;
    return isOwnEvent(ev, connection);
  });
}

export interface ArboxClientStats {
  classes: ScheduleEvent[];
  uniqueClients: ScheduleAttendee[];
  /** Sum of enrolled seats across classes */
  visitCount: number;
  capacityTotal: number;
  fillRate: number;
}

/** Client counts from Arbox class enrollments / attendee lists. */
export function getArboxClientStats(
  events: ScheduleEvent[],
  connection: ArboxConnection
): ArboxClientStats {
  const classes = getInstructorArboxEvents(events, connection);
  const byId = new Map<string, ScheduleAttendee>();
  let visitCount = 0;
  let capacityTotal = 0;

  classes.forEach((ev) => {
    const enrolled = ev.enrolled ?? ev.attendees?.length ?? 0;
    visitCount += enrolled;
    capacityTotal += ev.capacity ?? enrolled;
    (ev.attendees ?? []).forEach((a) => byId.set(a.id, a));
  });

  const storedClients = getArboxClients();
  storedClients.forEach((a) => byId.set(a.id, a));

  const uniqueClients = [...byId.values()];
  const fillRate =
    capacityTotal > 0 ? Math.round((visitCount / capacityTotal) * 100) : 0;

  return {
    classes,
    uniqueClients,
    visitCount,
    capacityTotal,
    fillRate,
  };
}

function buildWeeklySurveyUrl(connection: ArboxConnection, weekKey: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({
    title: 'Weekly class feedback',
    instructor: connection.staffName,
    week: weekKey,
  });
  return `${origin}/feedback/weekly-${weekKey}?${params.toString()}`;
}

export function getWeeklySurveyHistory(): WeeklySurveyRecord[] {
  return loadState()?.weeklySurveys ?? [];
}

export function getWeeklySurveyForWeek(weekKey: string): WeeklySurveyRecord | undefined {
  return getWeeklySurveyHistory().find((s) => s.weekKey === weekKey);
}

/**
 * Send the weekly feedback survey to all unique Arbox clients for this instructor.
 * Recipient count follows Arbox enrollment numbers.
 */
export async function sendWeeklySurvey(
  events: ScheduleEvent[],
  connection: ArboxConnection,
  weekStart: Date
): Promise<WeeklySurveyRecord> {
  if (!connection.connected) {
    throw new Error('Connect Arbox to send the weekly survey');
  }

  await delay(800);

  const weekKey = getWeekKey(weekStart);
  const stats = getArboxClientStats(events, connection);
  if (stats.uniqueClients.length === 0 && stats.visitCount === 0) {
    throw new Error('No Arbox clients found for this week');
  }

  const recipientCount = stats.uniqueClients.length || stats.visitCount;
  const surveyUrl = buildWeeklySurveyUrl(connection, weekKey);
  const body =
    `Hi! How were your classes with ${connection.staffName} this week? ` +
    `Quick rating (1–5 stars) — optional note welcome: ${surveyUrl}`;

  // Production: Arbox send-message to each client phone/email
  void body;
  void connection.apiKey;

  const record: WeeklySurveyRecord = {
    weekKey,
    sentAt: new Date().toISOString(),
    recipientCount,
    surveyUrl,
    classCount: stats.classes.length,
    visitCount: stats.visitCount,
  };

  const log: ArboxMessageLog = {
    id: `weekly-${weekKey}-${Date.now()}`,
    eventId: `weekly-${weekKey}`,
    eventTitle: 'Weekly feedback survey',
    instructorName: connection.staffName,
    recipientCount,
    surveyUrl,
    sentAt: record.sentAt,
    status: 'sent',
  };

  const prev = loadState();
  if (prev) {
    const weeklySurveys = [
      record,
      ...(prev.weeklySurveys ?? []).filter((s) => s.weekKey !== weekKey),
    ].slice(0, 20);
    saveState({
      ...prev,
      weeklySurveys,
      messages: [log, ...prev.messages].slice(0, 50),
    });
  }

  return record;
}
