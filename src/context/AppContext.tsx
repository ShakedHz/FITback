import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
} from 'react';
import { useAuth } from '@/auth/AuthContext';
import { currentInstructor, lessons, exercises as defaultExercises, Lesson, Exercise } from '@/data/mockData';
import { COIN_PACKAGES, getTotalCoins } from '@/data/coinPackages';
import type {
  ScheduleEvent,
  ScheduleAttendee,
  ArboxConnection,
  ArboxMessageLog,
  StudioRole,
} from '@/data/scheduleTypes';
import {
  combineDateAndTime,
  canAttachPlanToEvent,
  EMPTY_ARBOX_CONNECTION,
} from '@/data/scheduleTypes';
import {
  connectArboxAccount,
  syncArboxSchedule,
  validateArboxApiKey,
  getDefaultWeekStart,
  restoreArboxSession,
  disconnectArboxAccount,
  setArboxStorageOwner,
  attachPlanToArboxEvent,
  detachPlanFromArboxEvent,
  patchArboxEvent,
  getMessageLog,
  setAutoFeedbackEnabled,
  getArboxClients,
  refreshArboxConnection,
  setLinkedInstructor as saveLinkedInstructor,
} from '@/services/arboxApi';
import { dispatchClassFeedback } from '@/services/autoFeedbackDispatch';
import {
  createAttendeeId,
  clearClassFeedbackDismiss,
  findPendingFeedbackEvents,
  loadAutoClassFeedbackEnabled,
  saveAutoClassFeedbackEnabled,
  requestFeedbackCheck,
  startTimeForJustEndedClass,
} from '@/services/classFeedback';
import { isValidPhone } from '@/utils/sms';
import {
  getAllFeedback,
  saveFeedback,
  subscribeFeedback,
  type StoredFeedback,
} from '@/data/feedbackStore';
import {
  loadSurveyClients,
  subscribeClients,
  type SurveyClient,
} from '@/services/surveyClients';
import type { TrainingType } from '@/data/trainingTypes';
import { bioFromSpecialties, trainingTypeToEventCategory } from '@/data/trainingTypes';
import { buildLessonsForSpecialties } from '@/data/instructorLessons';
import { getLessonTemplate } from '@/data/lessonTemplates';
import { durationsFromExercises } from '@/utils/lessonDuration';

export interface CoinTransaction {
  id: string;
  type: 'earn' | 'spend' | 'purchase';
  desc: string;
  amount: number;
  date: string;
}

const initialTransactions: CoinTransaction[] = [
  { id: 't1', type: 'earn', desc: 'Power Flow sale', amount: 250, date: '28.06' },
  { id: 't2', type: 'earn', desc: '4.8 rating bonus', amount: 50, date: '27.06' },
  { id: 't3', type: 'spend', desc: 'Morning Stretch purchase', amount: -180, date: '25.06' },
  { id: 't4', type: 'earn', desc: 'Retention bonus', amount: 30, date: '24.06' },
];

export interface LessonDraftSection {
  id: string;
  title: string;
  duration: number;
  exerciseIds: string[];
}

export interface LessonDraft {
  title: string;
  description: string;
  duration: number;
  trainingType: TrainingType;
  coverVideo: string | null;
  albumImages: string[];
  exerciseIds: string[];
  /** Optional custom section plan (e.g. AI-adjusted) */
  sections?: LessonDraftSection[];
  /** When set, builder is editing an existing library lesson */
  sourceLessonId?: string;
}

function draftForTrainingType(trainingType: TrainingType, title = 'New lesson'): LessonDraft {
  const template = getLessonTemplate(trainingType);
  const baseSections = template.map((s) => ({
    id: s.id,
    title: s.title,
    exerciseIds: [...s.exerciseIds],
  }));
  const { sections, duration, exerciseIds } = durationsFromExercises(baseSections, defaultExercises);

  return {
    title,
    description: '',
    duration,
    trainingType,
    coverVideo: null,
    albumImages: [],
    exerciseIds,
    sections,
  };
}

/** Empty plan — instructor adds every exercise herself. */
function blankDraftForTrainingType(trainingType: TrainingType): LessonDraft {
  const sections: LessonDraftSection[] = [
    { id: 's1', title: 'Warm-up', duration: 0, exerciseIds: [] },
    { id: 's2', title: 'Main section', duration: 0, exerciseIds: [] },
    { id: 's3', title: 'Cool-down', duration: 0, exerciseIds: [] },
  ];
  return {
    title: 'New lesson',
    description: '',
    duration: 0,
    trainingType,
    coverVideo: null,
    albumImages: [],
    exerciseIds: [],
    sections,
  };
}

export type LessonDraftMode = 'blank' | 'template';

interface AppState {
  instructor: typeof currentInstructor;
  ownedLessonIds: string[];
  createdLessons: Lesson[];
  coins: number;
  transactions: CoinTransaction[];
  customExercises: Exercise[];
  allExercises: Exercise[];
  lessonDraft: LessonDraft;
  setLessonDraft: (patch: Partial<LessonDraft>) => void;
  setLessonCoverVideo: (url: string | null) => void;
  resetLessonDraft: (mode?: LessonDraftMode) => void;
  loadLessonDraft: (lesson: Lesson) => void;
  purchaseLesson: (lessonId: string, price: number) => boolean;
  purchaseCoinPackage: (packageId: string, coins: number, price: number) => boolean;
  addCoins: (amount: number) => void;
  addCreatedLesson: (lesson: Lesson) => void;
  deleteCreatedLesson: (lessonId: string) => void;
  addCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom' | 'createdBy'>) => Exercise;
  getLessonById: (id: string) => Lesson | undefined;
  weekStart: Date;
  setWeekStart: (date: Date) => void;
  scheduleEvents: ScheduleEvent[];
  arboxConnection: ArboxConnection;
  arboxClients: ScheduleAttendee[];
  arboxMessages: ArboxMessageLog[];
  isSyncing: boolean;
  isConnecting: boolean;
  connectError: string | null;
  schedulableLessons: Lesson[];
  connectArbox: (apiKey: string, role?: StudioRole) => Promise<boolean>;
  disconnectArbox: () => void;
  syncArbox: () => Promise<void>;
  setLinkedInstructor: (instructorId: string) => void;
  attachLessonPlan: (eventId: string, lessonId: string) => boolean;
  detachLessonPlan: (eventId: string) => void;
  toggleAutoFeedback: (enabled: boolean) => void;
  autoClassFeedbackEnabled: boolean;
  setAutoClassFeedbackEnabled: (enabled: boolean) => void;
  runFeedbackAutomation: () => Promise<number>;
  addLessonToSchedule: (
    lessonId: string,
    dateKey: string,
    time: string,
    options?: { endedRecently?: boolean; rosterClients?: SurveyClient[] }
  ) => string | null;
  moveScheduleEvent: (eventId: string, dateKey: string, time: string) => void;
  removeScheduleEvent: (eventId: string) => void;
  addEventAttendee: (eventId: string, input: { id?: string; name: string; phone: string }) => boolean;
  removeEventAttendee: (eventId: string, attendeeId: string) => void;
  /** Add or remove a roster client on a class. */
  toggleEventAttendee: (eventId: string, client: { id: string; name: string; phone: string }) => void;
  markEventFeedbackSent: (eventId: string) => void;
  /** Live client survey responses (Ratings reads this). */
  feedbackResponses: StoredFeedback[];
  submitFeedback: (input: {
    sourceId: string;
    rating: number;
    improve?: string;
    title?: string;
    instructor?: string;
    lessonId?: string;
  }) => StoredFeedback;
  /** Clients roster from the Clients page. */
  rosterClients: SurveyClient[];
  isLoggedIn: boolean;
  logout: () => void;
}

const FLOW_EVENTS_KEY = 'movana_flow_events_v1';
const USER_LESSONS_KEY = 'movana_user_lessons_v1';
const DELETED_LESSONS_KEY = 'movana_deleted_lessons_v1';

function loadFlowEvents(): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem(FLOW_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScheduleEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFlowEvents(events: ScheduleEvent[]): void {
  localStorage.setItem(FLOW_EVENTS_KEY, JSON.stringify(events));
}

function loadUserLessons(): Lesson[] {
  try {
    const raw = localStorage.getItem(USER_LESSONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Lesson[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUserLessons(lessons: Lesson[]): void {
  localStorage.setItem(USER_LESSONS_KEY, JSON.stringify(lessons));
}

function loadDeletedLessonIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_LESSONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDeletedLessonIds(ids: string[]): void {
  localStorage.setItem(DELETED_LESSONS_KEY, JSON.stringify(ids));
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout: authLogout } = useAuth();
  const [coins, setCoins] = useState(currentInstructor.coins);
  const [transactions, setTransactions] = useState<CoinTransaction[]>(initialTransactions);
  const [ownedLessonIds, setOwnedLessonIds] = useState<string[]>([]);
  /** Lessons the instructor created in-app (not seed plans). */
  const [userLessons, setUserLessons] = useState<Lesson[]>(() => loadUserLessons());
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>(() => loadDeletedLessonIds());
  const [customExercises, setCustomExercises] = useState<Exercise[]>([]);
  const [lessonDraft, setLessonDraftState] = useState<LessonDraft>(() =>
    blankDraftForTrainingType('pilates')
  );
  const [weekStart, setWeekStart] = useState<Date>(getDefaultWeekStart);
  const [flowEvents, setFlowEvents] = useState<ScheduleEvent[]>(() => loadFlowEvents());
  const [arboxEvents, setArboxEvents] = useState<ScheduleEvent[]>([]);
  const [arboxClients, setArboxClients] = useState<ScheduleAttendee[]>([]);
  const [arboxConnection, setArboxConnection] = useState<ArboxConnection>(EMPTY_ARBOX_CONNECTION);
  const [arboxMessages, setArboxMessages] = useState<ArboxMessageLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [autoClassFeedbackEnabled, setAutoClassFeedbackEnabledState] = useState(
    () => loadAutoClassFeedbackEnabled()
  );
  const [feedbackResponses, setFeedbackResponses] = useState<StoredFeedback[]>(() =>
    getAllFeedback()
  );
  const [rosterClients, setRosterClients] = useState<SurveyClient[]>(() => loadSurveyClients());

  // Load Arbox data after login (connect happens on the login screen)
  const applyArboxSession = useCallback(() => {
    const session = restoreArboxSession();
    if (!session?.connection.connected) return false;
    const events = session.events;
    const connection = refreshArboxConnection(session.connection, events, session.connection);
    setArboxConnection(connection);
    setArboxEvents(events);
    setArboxClients(session.clients ?? getArboxClients());
    setArboxMessages(session.messages);
    return true;
  }, []);

  const refreshArboxFromStorage = useCallback(async () => {
    if (!applyArboxSession()) return;
    const session = restoreArboxSession();
    if (!session?.connection.connected || !session.connection.apiKey) return;

    setIsSyncing(true);
    try {
      const { events, clients } = await syncArboxSchedule(session.connection, weekStart);
      if (events.length > 0) setArboxEvents(events);
      if (clients.length > 0) setArboxClients(clients);
      const updated = restoreArboxSession();
      if (updated?.connection) setArboxConnection(updated.connection);
    } finally {
      setIsSyncing(false);
    }
  }, [applyArboxSession, weekStart]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const clubId = user.activeStudioId || user.arboxClubId;
    setArboxStorageOwner(user.id, { migrateLegacy: user.arboxLinked, clubId });

    if (!applyArboxSession()) {
      setArboxConnection(EMPTY_ARBOX_CONNECTION);
      setArboxEvents([]);
      setArboxClients([]);
      setArboxMessages([]);
      return;
    }

    void refreshArboxFromStorage();
  }, [isAuthenticated, user, applyArboxSession, refreshArboxFromStorage]);

  useEffect(() => {
    const sync = () => setFeedbackResponses(getAllFeedback());
    sync();
    return subscribeFeedback(sync);
  }, []);

  useEffect(() => {
    const sync = () => setRosterClients(loadSurveyClients());
    sync();
    return subscribeClients(sync);
  }, []);

  const submitFeedback = useCallback(
    (input: {
      sourceId: string;
      rating: number;
      improve?: string;
      title?: string;
      instructor?: string;
      lessonId?: string;
    }) => {
      const entry = saveFeedback(input);
      setFeedbackResponses(getAllFeedback());
      return entry;
    },
    []
  );

  useEffect(() => {
    saveFlowEvents(flowEvents);
  }, [flowEvents]);

  useEffect(() => {
    saveUserLessons(userLessons);
  }, [userLessons]);

  useEffect(() => {
    saveDeletedLessonIds(deletedLessonIds);
  }, [deletedLessonIds]);

  const setAutoClassFeedbackEnabled = useCallback((enabled: boolean) => {
    saveAutoClassFeedbackEnabled(enabled);
    setAutoClassFeedbackEnabledState(enabled);
  }, []);

  const scheduleEvents = useMemo(
    () => [...arboxEvents, ...flowEvents].sort((a, b) => a.start.localeCompare(b.start)),
    [arboxEvents, flowEvents]
  );

  const instructorMeta = useMemo(
    () => ({
      id: user?.id ?? currentInstructor.id,
      name: user?.name ?? currentInstructor.name,
    }),
    [user?.id, user?.name]
  );

  const specialties = useMemo(
    () => (user?.specialties?.length ? user.specialties : []),
    [user?.specialties]
  );

  const createdLessons = useMemo(() => {
    const seeded = buildLessonsForSpecialties(specialties, instructorMeta);
    const extras = userLessons
      .filter((l) => specialties.length === 0 || specialties.includes(l.trainingType))
      .map((l) => ({
        ...l,
        instructorId: instructorMeta.id,
        instructorName: instructorMeta.name,
        isCreated: true,
        isOwned: true,
      }));

    const byId = new Map<string, Lesson>();
    [...seeded, ...extras].forEach((l) => byId.set(l.id, l));
    const deleted = new Set(deletedLessonIds);
    return [...byId.values()].filter((l) => !deleted.has(l.id));
  }, [specialties, instructorMeta, userLessons, deletedLessonIds]);

  const schedulableLessons = useMemo(() => createdLessons, [createdLessons]);

  const allExercises = useMemo(
    () => [...defaultExercises, ...customExercises],
    [customExercises]
  );

  const setLessonDraft = useCallback((patch: Partial<LessonDraft>) => {
    setLessonDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setLessonCoverVideo = useCallback((url: string | null) => {
    setLessonDraftState((prev) => {
      if (prev.coverVideo?.startsWith('blob:') && url !== prev.coverVideo) {
        URL.revokeObjectURL(prev.coverVideo);
      }
      return { ...prev, coverVideo: url };
    });
  }, []);

  const resetLessonDraft = useCallback((mode: LessonDraftMode = 'blank') => {
    const type = specialties[0] ?? 'pilates';
    setLessonDraftState(
      mode === 'template' ? draftForTrainingType(type) : blankDraftForTrainingType(type)
    );
  }, [specialties]);

  const loadLessonDraft = useCallback((lesson: Lesson) => {
    const baseSections = lesson.sections.map((s) => ({
      id: s.id,
      title: s.title,
      exerciseIds: s.exercises.map((e) => e.id),
    }));
    const exercisePool = [
      ...defaultExercises,
      ...lesson.sections.flatMap((s) => s.exercises),
    ];
    const timed = durationsFromExercises(baseSections, exercisePool);

    setLessonDraftState({
      title: lesson.title,
      description: lesson.description ?? '',
      duration: timed.duration,
      trainingType: lesson.trainingType,
      coverVideo: lesson.coverVideo ?? null,
      albumImages: [],
      exerciseIds: timed.exerciseIds,
      sections: timed.sections,
      sourceLessonId: lesson.id,
    });
  }, []);

  const getLessonById = useCallback((id: string) => {
    return createdLessons.find((l) => l.id === id) ?? lessons.find((l) => l.id === id);
  }, [createdLessons]);

  const purchaseLesson = useCallback((lessonId: string, price: number) => {
    if (coins < price || ownedLessonIds.includes(lessonId)) return false;
    setCoins((c) => c - price);
    setOwnedLessonIds((ids) => [...ids, lessonId]);
    setTransactions((tx) => [
      {
        id: `t-${Date.now()}`,
        type: 'spend',
        desc: 'Purchased lesson',
        amount: -price,
        date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
      },
      ...tx,
    ]);
    return true;
  }, [coins, ownedLessonIds]);

  const purchaseCoinPackage = useCallback((packageId: string, coinAmount: number, _price: number) => {
    const pkg = COIN_PACKAGES.find((p) => p.id === packageId);
    if (!pkg || getTotalCoins(pkg) !== coinAmount) return false;
    setCoins((c) => c + coinAmount);
    setTransactions((tx) => [
      {
        id: `t-${Date.now()}`,
        type: 'purchase',
        desc: `Purchased ${pkg.label} package`,
        amount: coinAmount,
        date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }),
      },
      ...tx,
    ]);
    return true;
  }, []);

  const addCoins = useCallback((amount: number) => {
    setCoins((c) => c + amount);
  }, []);

  const addCreatedLesson = useCallback((lesson: Lesson) => {
    setUserLessons((prev) => [...prev, lesson]);
    setOwnedLessonIds((ids) => (ids.includes(lesson.id) ? ids : [...ids, lesson.id]));
    setDeletedLessonIds((ids) => ids.filter((id) => id !== lesson.id));
  }, []);

  const deleteCreatedLesson = useCallback((lessonId: string) => {
    setUserLessons((prev) => {
      const removed = prev.find((l) => l.id === lessonId);
      if (removed?.coverVideo?.startsWith('blob:')) {
        URL.revokeObjectURL(removed.coverVideo);
      }
      return prev.filter((l) => l.id !== lessonId);
    });
    setDeletedLessonIds((ids) => (ids.includes(lessonId) ? ids : [...ids, lessonId]));
    setOwnedLessonIds((ids) => ids.filter((id) => id !== lessonId));
    setFlowEvents((events) =>
      events.map((e) =>
        e.lessonId === lessonId || e.lessonPlanId === lessonId
          ? { ...e, lessonId: undefined, lessonPlanId: undefined, lessonPlanTitle: undefined }
          : e
      )
    );
  }, []);

  const addCustomExercise = useCallback((data: Omit<Exercise, 'id' | 'isCustom' | 'createdBy'>) => {
    const exercise: Exercise = {
      ...data,
      id: `custom-${Date.now()}`,
      isCustom: true,
      createdBy: currentInstructor.id,
    };
    setCustomExercises((prev) => [...prev, exercise]);
    return exercise;
  }, []);

  const connectArbox = useCallback(async (apiKey: string, role?: StudioRole) => {
    if (!validateArboxApiKey(apiKey)) {
      setConnectError('API key must be at least 8 characters');
      return false;
    }
    setIsConnecting(true);
    setConnectError(null);
    try {
      const { connection, events, clients } = await connectArboxAccount(apiKey, role, weekStart);
      const synced = await syncArboxSchedule(connection, weekStart);
      setArboxConnection({
        ...connection,
        lastSyncedAt: new Date().toISOString(),
      });
      setArboxEvents(synced.events.length ? synced.events : events);
      setArboxClients(synced.clients.length ? synced.clients : clients);
      setArboxMessages(getMessageLog());
      return true;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [weekStart]);

  const disconnectArbox = useCallback(() => {
    disconnectArboxAccount();
    setArboxConnection(EMPTY_ARBOX_CONNECTION);
    setArboxEvents([]);
    setArboxClients([]);
  }, []);

  const syncArbox = useCallback(async () => {
    if (!arboxConnection.connected || !arboxConnection.apiKey) return;
    setIsSyncing(true);
    try {
      const { events, clients } = await syncArboxSchedule(arboxConnection, weekStart);
      if (events.length > 0) setArboxEvents(events);
      if (clients.length > 0) setArboxClients(clients);
      setArboxConnection((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
      }));
    } finally {
      setIsSyncing(false);
    }
  }, [arboxConnection, weekStart]);

  const setLinkedInstructor = useCallback((instructorId: string) => {
    const next = saveLinkedInstructor(instructorId);
    if (next) {
      setArboxConnection((prev) => refreshArboxConnection(next, arboxEvents, prev));
    }
  }, [arboxEvents]);

  // Auto-sync when week changes while connected
  useEffect(() => {
    if (!arboxConnection.connected) return;
    void syncArbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const attachLessonPlan = useCallback((eventId: string, lessonId: string) => {
    const lesson = lessons.find((l) => l.id === lessonId) ?? createdLessons.find((l) => l.id === lessonId);
    if (!lesson) return false;

    const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
    if (!event) return false;
    if (!canAttachPlanToEvent(event, arboxConnection)) return false;

    if (event.source === 'arbox') {
      const updated = attachPlanToArboxEvent(eventId, lesson.id, lesson.title);
      if (!updated) return false;
      setArboxEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
      return true;
    }

    setFlowEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, lessonId: lesson.id, lessonPlanId: lesson.id, lessonPlanTitle: lesson.title }
          : e
      )
    );
    return true;
  }, [arboxConnection, arboxEvents, flowEvents, createdLessons]);

  const detachLessonPlan = useCallback((eventId: string) => {
    const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
    if (!event || !canAttachPlanToEvent(event, arboxConnection)) return;

    if (event.source === 'arbox') {
      const updated = detachPlanFromArboxEvent(eventId);
      if (updated) setArboxEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
      return;
    }

    setFlowEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, lessonPlanId: undefined, lessonPlanTitle: undefined }
          : e
      )
    );
  }, [arboxConnection, arboxEvents, flowEvents]);

  const toggleAutoFeedback = useCallback((enabled: boolean) => {
    const updated = setAutoFeedbackEnabled(enabled);
    if (updated) setArboxConnection(updated);
    setAutoClassFeedbackEnabled(enabled);
  }, [setAutoClassFeedbackEnabled]);

  const patchScheduleEvent = useCallback(
    (eventId: string, patch: Partial<Pick<ScheduleEvent, 'attendees' | 'feedbackSentAt' | 'enrolled'>>) => {
      const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
      if (!event) return null;

      if (event.source === 'arbox') {
        const updated = patchArboxEvent(eventId, patch);
        if (updated) setArboxEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
        return updated;
      }

      const updated: ScheduleEvent = { ...event, ...patch };
      setFlowEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
      return updated;
    },
    [arboxEvents, flowEvents]
  );

  const addEventAttendee = useCallback(
    (eventId: string, input: { id?: string; name: string; phone: string }) => {
      const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
      if (!event) return false;
      if (!input.name.trim() || !isValidPhone(input.phone)) return false;

      const phoneDigits = input.phone.replace(/\D/g, '');
      const already = (event.attendees ?? []).some(
        (a) =>
          (input.id && a.id === input.id) ||
          (a.phone && a.phone.replace(/\D/g, '') === phoneDigits)
      );
      if (already) return true;

      const attendee: ScheduleAttendee = {
        id: input.id ?? createAttendeeId(),
        name: input.name.trim(),
        phone: input.phone.trim(),
      };
      const attendees = [...(event.attendees ?? []), attendee];
      patchScheduleEvent(eventId, {
        attendees,
        enrolled: attendees.length,
      });
      return true;
    },
    [arboxEvents, flowEvents, patchScheduleEvent]
  );

  const removeEventAttendee = useCallback(
    (eventId: string, attendeeId: string) => {
      const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
      if (!event) return;
      const attendees = (event.attendees ?? []).filter((a) => a.id !== attendeeId);
      patchScheduleEvent(eventId, {
        attendees,
        enrolled: attendees.length,
      });
    },
    [arboxEvents, flowEvents, patchScheduleEvent]
  );

  const toggleEventAttendee = useCallback(
    (eventId: string, client: { id: string; name: string; phone: string }) => {
      const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
      if (!event) return;
      const phoneDigits = client.phone.replace(/\D/g, '');
      const existing = (event.attendees ?? []).find(
        (a) => a.id === client.id || (a.phone && a.phone.replace(/\D/g, '') === phoneDigits)
      );
      if (existing) {
        removeEventAttendee(eventId, existing.id);
        return;
      }
      addEventAttendee(eventId, client);
    },
    [arboxEvents, flowEvents, addEventAttendee, removeEventAttendee]
  );

  const markEventFeedbackSent = useCallback(
    (eventId: string) => {
      patchScheduleEvent(eventId, { feedbackSentAt: new Date().toISOString() });
      clearClassFeedbackDismiss(eventId);
    },
    [patchScheduleEvent]
  );

  const runFeedbackAutomation = useCallback(async () => {
    const scope = { arboxConnection };
    const pending = findPendingFeedbackEvents([...arboxEvents, ...flowEvents], new Date(), scope);

    let sent = 0;
    for (const event of pending) {
      const result = await dispatchClassFeedback(event, arboxConnection);
      if (result.sent > 0) {
        markEventFeedbackSent(event.id);
        sent += 1;
      }
    }

    return sent || pending.length;
  }, [arboxConnection, arboxEvents, flowEvents, markEventFeedbackSent]);

  const addLessonToSchedule = useCallback((
    lessonId: string,
    dateKey: string,
    time: string,
    options?: { endedRecently?: boolean; rosterClients?: SurveyClient[] }
  ): string | null => {
    const lesson = lessons.find((l) => l.id === lessonId) ?? createdLessons.find((l) => l.id === lessonId);
    if (!lesson) return null;

    const instructorId = arboxConnection.connected ? arboxConnection.staffId : currentInstructor.id;
    const instructorName = arboxConnection.connected ? arboxConnection.staffName : currentInstructor.name;

    const attendees: ScheduleAttendee[] = (options?.rosterClients ?? [])
      .filter((c) => isValidPhone(c.phone))
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone.trim() }));

    const start = options?.endedRecently
      ? startTimeForJustEndedClass(lesson.duration)
      : combineDateAndTime(dateKey, time);

    const event: ScheduleEvent = {
      id: `flow-${Date.now()}`,
      title: lesson.title,
      lessonId: lesson.id,
      lessonPlanId: lesson.id,
      lessonPlanTitle: lesson.title,
      start,
      duration: lesson.duration,
      source: 'flowpilates',
      category: trainingTypeToEventCategory(lesson.trainingType),
      location: 'FITback',
      instructorId,
      instructor: instructorName,
      attendees,
      enrolled: attendees.length,
      feedbackSentAt: null,
    };
    setFlowEvents((prev) => [...prev, event]);
    window.setTimeout(() => requestFeedbackCheck(), 200);
    return event.id;
  }, [createdLessons, arboxConnection]);

  const moveScheduleEvent = useCallback((eventId: string, dateKey: string, time: string) => {
    const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
    if (!event) return;
    if (!canAttachPlanToEvent(event, arboxConnection)) return;

    if (event.source === 'arbox') return; // Arbox slots are managed in Arbox

    setFlowEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId ? { ...ev, start: combineDateAndTime(dateKey, time) } : ev
      )
    );
  }, [arboxConnection, arboxEvents, flowEvents]);

  const removeScheduleEvent = useCallback((eventId: string) => {
    setFlowEvents((prev) => prev.filter((ev) => ev.id !== eventId));
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setArboxConnection(EMPTY_ARBOX_CONNECTION);
    setArboxEvents([]);
    setArboxClients([]);
    setArboxMessages([]);
  }, [authLogout]);

  const instructor = useMemo(
    () => ({
      ...currentInstructor,
      coins,
      name: user?.name || currentInstructor.name,
      // Google photo when available; otherwise no image (color initials avatar)
      avatar: user ? user.avatar : currentInstructor.avatar,
      bio: user
        ? user.bio?.trim() || bioFromSpecialties(user.specialties ?? [])
        : currentInstructor.bio,
      specialties: user ? user.specialties ?? [] : currentInstructor.specialties,
      lessonsCount: userLessons.length,
      studentsCount:
        arboxConnection.connected && arboxConnection.dataSource === 'live'
          ? arboxClients.length
          : rosterClients.length,
    }),
    [coins, user, userLessons.length, rosterClients.length, arboxConnection, arboxClients.length]
  );

  return (
    <AppContext.Provider
      value={{
        instructor,
        ownedLessonIds,
        createdLessons,
        coins,
        transactions,
        customExercises,
        allExercises,
        lessonDraft,
        setLessonDraft,
        setLessonCoverVideo,
        resetLessonDraft,
        loadLessonDraft,
        purchaseLesson,
        purchaseCoinPackage,
        addCoins,
        addCreatedLesson,
        deleteCreatedLesson,
        addCustomExercise,
        getLessonById,
        weekStart,
        setWeekStart,
        scheduleEvents,
        arboxConnection,
        arboxClients,
        arboxMessages,
        isSyncing,
        isConnecting,
        connectError,
        schedulableLessons,
        connectArbox,
        disconnectArbox,
        syncArbox,
        setLinkedInstructor,
        attachLessonPlan,
        detachLessonPlan,
        toggleAutoFeedback,
        autoClassFeedbackEnabled,
        setAutoClassFeedbackEnabled,
        runFeedbackAutomation,
        addLessonToSchedule,
        moveScheduleEvent,
        removeScheduleEvent,
        addEventAttendee,
        removeEventAttendee,
        toggleEventAttendee,
        markEventFeedbackSent,
        feedbackResponses,
        submitFeedback,
        rosterClients,
        isLoggedIn: isAuthenticated,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export type { Lesson, Exercise };
