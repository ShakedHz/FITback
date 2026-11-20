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
import { currentInstructor, lessons, Lesson, Exercise, type LessonLevel, type ExercisePlanNotes } from '@/data/mockData';
import { BUILTIN_EXERCISES, migrateExerciseId } from '@/data/exerciseCatalog';
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
import { filterRemovedStudioTeam } from '@/data/studioOrg';
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
  removeArboxTeamMember as persistRemoveArboxTeamMember,
  updateArboxTeamMember as persistUpdateArboxTeamMember,
  syncStoredConnectionRole,
} from '@/services/arboxApi';
import { dispatchClassFeedback } from '@/services/autoFeedbackDispatch';
import {
  createAttendeeId,
  clearClassFeedbackDismiss,
  findPendingFeedbackEvents,
  loadAutoClassFeedbackEnabled,
  loadFeedbackDeliveryChannel,
  saveAutoClassFeedbackEnabled,
  saveFeedbackDeliveryChannel,
  requestFeedbackCheck,
  startTimeForJustEndedClass,
  type FeedbackDeliveryChannel,
} from '@/services/classFeedback';
import { isValidEmail, normalizeEmail } from '@/utils/email';
import { isValidPhone } from '@/utils/sms';
import {
  getAllFeedback,
  saveFeedback,
  subscribeFeedback,
  type StoredFeedback,
} from '@/data/feedbackStore';
import { buildDemoFeedback, hasBuiltInRatings } from '@/data/demoFeedback';
import {
  loadSurveyClients,
  subscribeClients,
  type SurveyClient,
} from '@/services/surveyClients';
import type { TrainingType } from '@/data/trainingTypes';
import { bioFromSpecialties, isTrainingType, trainingTypeToEventCategory } from '@/data/trainingTypes';
import { belongsToActiveStudio } from '@/data/studioOrg';
import { defaultPlanEquipment, type EquipmentType } from '@/data/equipmentTypes';
import { isSpringSetupEmpty, type PilatesPropId } from '@/data/pilatesSetup';
import { getLessonSectionShell } from '@/data/lessonTemplates';
import { DEFAULT_YOGA_STYLE, type YogaStyle } from '@/data/yogaStyles';
import {
  loadCustomExerciseAreas,
  saveCustomExerciseAreas,
  slugFromAreaName,
  type CustomExerciseArea,
} from '@/data/customExerciseAreas';
import {
  applyExerciseLibraryPrefs,
  isBuiltinExerciseId,
  loadExerciseLibraryPrefs,
  saveExerciseLibraryPrefs,
  type ExerciseLibraryPrefs,
} from '@/data/exerciseLibraryPrefs';
import { isStandardBodyPart, type BodyPart } from '@/data/bodyParts';
import { bilingualName } from '@/utils/translateText';
import { durationsFromExercises, DEFAULT_CLASS_DURATION } from '@/utils/lessonDuration';

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
  notes?: Record<string, ExercisePlanNotes>;
}

export interface LessonDraft {
  title: string;
  description: string;
  duration: number;
  trainingType: TrainingType;
  /** Set when trainingType is yoga — drives section layout and exercise catalog. */
  yogaStyle?: YogaStyle;
  equipment: EquipmentType;
  props?: PilatesPropId[];
  level: LessonLevel;
  focus: string;
  coverVideo: string | null;
  albumImages: string[];
  exerciseIds: string[];
  /** Optional custom section plan (e.g. AI-adjusted) */
  sections?: LessonDraftSection[];
  /** When set, builder is editing an existing library lesson */
  sourceLessonId?: string;
}

/** Empty plan — type-specific sections, instructor adds exercises. */
function blankDraftForTrainingType(trainingType: TrainingType): LessonDraft {
  const yogaStyle = trainingType === 'yoga' ? DEFAULT_YOGA_STYLE : undefined;
  return {
    title: '',
    description: '',
    duration: DEFAULT_CLASS_DURATION,
    trainingType,
    yogaStyle,
    equipment: defaultPlanEquipment(trainingType),
    props: [],
    level: 'Intermediate',
    focus: '',
    coverVideo: null,
    albumImages: [],
    exerciseIds: [],
    sections: getLessonSectionShell(trainingType, yogaStyle),
  };
}

export type LessonDraftMode = 'blank';

interface AppState {
  instructor: typeof currentInstructor;
  ownedLessonIds: string[];
  createdLessons: Lesson[];
  coins: number;
  transactions: CoinTransaction[];
  customExercises: Exercise[];
  customExerciseAreas: CustomExerciseArea[];
  exerciseLibraryPrefs: ExerciseLibraryPrefs;
  allExercises: Exercise[];
  lessonDraft: LessonDraft;
  setLessonDraft: (patch: Partial<LessonDraft>) => void;
  setLessonCoverVideo: (url: string | null) => void;
  resetLessonDraft: () => void;
  loadLessonDraft: (lesson: Lesson) => void;
  purchaseLesson: (lessonId: string, price: number) => boolean;
  purchaseCoinPackage: (packageId: string, coins: number, price: number) => boolean;
  addCoins: (amount: number) => void;
  addCreatedLesson: (lesson: Lesson) => void;
  updateCreatedLesson: (lesson: Lesson) => void;
  deleteCreatedLesson: (lessonId: string) => void;
  favoriteLessonIds: string[];
  isFavoriteLesson: (lessonId: string) => boolean;
  toggleFavoriteLesson: (lessonId: string) => void;
  duplicateCreatedLesson: (lesson: Lesson, title: string) => Lesson;
  addCustomExercise: (
    exercise: Omit<Exercise, 'id' | 'isCustom' | 'createdBy' | 'duration'> & { duration?: number }
  ) => Exercise;
  updateExercise: (
    id: string,
    patch: Omit<Exercise, 'id' | 'isCustom' | 'createdBy' | 'duration'> & { duration?: number }
  ) => Exercise | null;
  deleteExercise: (id: string) => boolean;
  ensureCustomExerciseArea: (input: string) => CustomExerciseArea | null;
  updateExerciseArea: (areaId: string, labels: { name: string; nameHe: string }) => void;
  deleteExerciseArea: (areaId: string) => void;
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
  /** Drop a staff member from the in-memory + persisted Arbox team roster. */
  removeArboxTeamMember: (staffId: string) => void;
  /** Update name/email on a roster staff member. */
  updateArboxTeamMember: (staffId: string, patch: { name?: string; email?: string }) => void;
  attachLessonPlan: (eventId: string, lessonId: string) => boolean;
  detachLessonPlan: (eventId: string) => void;
  toggleAutoFeedback: (enabled: boolean) => void;
  autoClassFeedbackEnabled: boolean;
  setAutoClassFeedbackEnabled: (enabled: boolean) => void;
  feedbackDeliveryChannel: FeedbackDeliveryChannel;
  setFeedbackDeliveryChannel: (channel: FeedbackDeliveryChannel) => void;
  runFeedbackAutomation: () => Promise<number>;
  addLessonToSchedule: (
    lessonId: string,
    dateKey: string,
    time: string,
    options?: { endedRecently?: boolean; rosterClients?: SurveyClient[]; capacity?: number }
  ) => string | null;
  moveScheduleEvent: (eventId: string, dateKey: string, time: string) => void;
  /** Edit a class created here: plan, time, capacity and roster in one go. */
  updateScheduleEvent: (
    eventId: string,
    updates: {
      lessonId?: string;
      dateKey?: string;
      time?: string;
      rosterClients?: SurveyClient[];
      capacity?: number;
    }
  ) => void;
  removeScheduleEvent: (eventId: string) => void;
  addEventAttendee: (
    eventId: string,
    input: { id?: string; name: string; phone?: string; email?: string }
  ) => boolean;
  removeEventAttendee: (eventId: string, attendeeId: string) => void;
  /** Add or remove a roster client on a class. */
  toggleEventAttendee: (
    eventId: string,
    client: { id: string; name: string; phone?: string; email?: string }
  ) => void;
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
const FAVORITE_LESSONS_KEY = 'movana_favorite_lessons_v1';
const CUSTOM_EXERCISES_KEY = 'movana_custom_exercises_v1';

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

function migrateLessonExercises(lesson: Lesson): Lesson {
  return {
    ...lesson,
    trainingType: isTrainingType(lesson.trainingType) ? lesson.trainingType : 'pilates',
    sections: lesson.sections.map((section) => ({
      ...section,
      exercises: section.exercises.map((ex) => ({
        ...ex,
        id: migrateExerciseId(ex.id),
      })),
    })),
  };
}

function loadUserLessons(): Lesson[] {
  try {
    const raw = localStorage.getItem(USER_LESSONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Lesson[];
    return Array.isArray(parsed)
      ? parsed.map(migrateLessonExercises).filter((l) => l?.id && !l.isStarter)
      : [];
  } catch {
    return [];
  }
}

function saveUserLessons(lessons: Lesson[]): void {
  localStorage.setItem(USER_LESSONS_KEY, JSON.stringify(lessons));
}

function clonePlan(lesson: Lesson, opts: { id: string; title: string }): Lesson {
  return {
    ...lesson,
    id: opts.id,
    title: opts.title,
    isStarter: false,
    isCreated: true,
    isOwned: true,
    rating: 0,
    reviews: 0,
    likes: 0,
    comments: 0,
    sections: lesson.sections.map((section, i) => ({
      ...section,
      id: `${opts.id}-s${i}`,
      exercises: section.exercises.map((e) => ({ ...e })),
    })),
  };
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

function loadFavoriteLessonIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_LESSONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveFavoriteLessonIds(ids: string[]): void {
  localStorage.setItem(FAVORITE_LESSONS_KEY, JSON.stringify(ids));
}

function loadCustomExercises(): Exercise[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EXERCISES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Exercise[];
    return Array.isArray(parsed) ? parsed.filter((e) => e?.id && e?.nameHe) : [];
  } catch {
    return [];
  }
}

function saveCustomExercises(items: Exercise[]): void {
  localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(items));
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout: authLogout, activeMembership, isActiveStudioManager } = useAuth();
  const [coins, setCoins] = useState(currentInstructor.coins);
  const [transactions, setTransactions] = useState<CoinTransaction[]>(initialTransactions);
  const [ownedLessonIds, setOwnedLessonIds] = useState<string[]>([]);
  /** Lessons the instructor created in-app (not seed plans). */
  const [userLessons, setUserLessons] = useState<Lesson[]>(() => loadUserLessons());
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>(() => loadDeletedLessonIds());
  const [favoriteLessonIds, setFavoriteLessonIds] = useState<string[]>(() => loadFavoriteLessonIds());
  const [customExercises, setCustomExercises] = useState<Exercise[]>(() => loadCustomExercises());
  const [customExerciseAreas, setCustomExerciseAreas] = useState<CustomExerciseArea[]>(() =>
    loadCustomExerciseAreas()
  );
  const [exerciseLibraryPrefs, setExerciseLibraryPrefs] = useState<ExerciseLibraryPrefs>(() =>
    loadExerciseLibraryPrefs()
  );
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
  const [feedbackDeliveryChannel, setFeedbackDeliveryChannelState] = useState<FeedbackDeliveryChannel>(
    () => loadFeedbackDeliveryChannel()
  );
  const [feedbackResponses, setFeedbackResponses] = useState<StoredFeedback[]>(() =>
    getAllFeedback()
  );
  const [rosterClients, setRosterClients] = useState<SurveyClient[]>(() => loadSurveyClients());

  const activeClubId = useMemo(
    () => user?.activeStudioId || activeMembership?.clubId || user?.arboxClubId,
    [user?.activeStudioId, activeMembership?.clubId, user?.arboxClubId]
  );

  // Tag legacy content that predates per-studio scoping.
  useEffect(() => {
    if (!user) return;
    const fallbackClubId =
      user.memberships.find((m) => m.role === 'instructor')?.clubId ||
      user.activeStudioId ||
      user.memberships[0]?.clubId ||
      user.arboxClubId;
    if (!fallbackClubId) return;

    setUserLessons((prev) => {
      if (!prev.some((l) => !l.clubId)) return prev;
      return prev.map((l) => (l.clubId ? l : { ...l, clubId: fallbackClubId }));
    });
    setFlowEvents((prev) => {
      if (!prev.some((e) => !e.clubId)) return prev;
      return prev.map((e) => (e.clubId ? e : { ...e, clubId: fallbackClubId }));
    });
  }, [user?.id]);

  // Load Arbox data after login (connect happens on the login screen)
  const applyArboxSession = useCallback(() => {
    const session = restoreArboxSession();
    if (!session?.connection.connected) return false;
    const events = session.events;
    const clubId = session.connection.clubId;
    const connection = refreshArboxConnection(
      {
        ...session.connection,
        team: filterRemovedStudioTeam(clubId, session.connection.team),
      },
      events,
      session.connection
    );
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
    if (activeMembership) syncStoredConnectionRole(activeMembership.role);

    if (!applyArboxSession()) {
      setArboxConnection(EMPTY_ARBOX_CONNECTION);
      setArboxEvents([]);
      setArboxClients([]);
      setArboxMessages([]);
      return;
    }

    void refreshArboxFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- studio/account only; not week navigation
  }, [isAuthenticated, user?.id, user?.activeStudioId, activeMembership?.clubId]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setWeekStart(getDefaultWeekStart());
  }, [isAuthenticated, user?.activeStudioId]);

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

  useEffect(() => {
    saveFavoriteLessonIds(favoriteLessonIds);
  }, [favoriteLessonIds]);

  useEffect(() => {
    saveCustomExercises(customExercises);
  }, [customExercises]);

  useEffect(() => {
    saveCustomExerciseAreas(customExerciseAreas);
  }, [customExerciseAreas]);

  useEffect(() => {
    saveExerciseLibraryPrefs(exerciseLibraryPrefs);
  }, [exerciseLibraryPrefs]);

  const setAutoClassFeedbackEnabled = useCallback((enabled: boolean) => {
    saveAutoClassFeedbackEnabled(enabled);
    setAutoClassFeedbackEnabledState(enabled);
  }, []);

  const setFeedbackDeliveryChannel = useCallback((channel: FeedbackDeliveryChannel) => {
    saveFeedbackDeliveryChannel(channel);
    setFeedbackDeliveryChannelState(channel);
    requestFeedbackCheck();
  }, []);

  const studioFlowEvents = useMemo(
    () => flowEvents.filter((event) => belongsToActiveStudio(event, activeClubId)),
    [flowEvents, activeClubId]
  );

  const scheduleEvents = useMemo(
    () => [...arboxEvents, ...studioFlowEvents].sort((a, b) => a.start.localeCompare(b.start)),
    [arboxEvents, studioFlowEvents]
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
    const extras = userLessons
      .filter((l) => belongsToActiveStudio(l, activeClubId))
      .filter((l) => specialties.length === 0 || specialties.includes(l.trainingType))
      .map((l) => ({
        ...l,
        instructorId: instructorMeta.id,
        instructorName: instructorMeta.name,
        isCreated: true,
        isOwned: true,
        isStarter: false,
      }));

    const deleted = new Set(deletedLessonIds);
    return extras.filter((l) => !deleted.has(l.id));
  }, [specialties, instructorMeta, userLessons, deletedLessonIds, activeClubId]);

  const allFeedback = useMemo(() => {
    if (!hasBuiltInRatings(user?.name)) return feedbackResponses;
    const demo = buildDemoFeedback(createdLessons, user?.name ?? '');
    return [...feedbackResponses, ...demo].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [feedbackResponses, createdLessons, user?.name]);

  const schedulableLessons = useMemo(() => createdLessons, [createdLessons]);

  const allExercises = customExercises;

  const removeExerciseFromDraft = useCallback((exerciseId: string) => {
    setLessonDraftState((prev) => {
      if (!prev.sections?.length) return prev;
      const sections = prev.sections.map((section) => ({
        ...section,
        exerciseIds: section.exerciseIds.filter((id) => id !== exerciseId),
      }));
      return {
        ...prev,
        sections,
        exerciseIds: sections.flatMap((section) => section.exerciseIds),
      };
    });
  }, []);

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

  const resetLessonDraft = useCallback(() => {
    const type = specialties[0] ?? 'pilates';
    setLessonDraftState(blankDraftForTrainingType(type));
  }, [specialties]);

  const planToDraft = useCallback(
    (lesson: Lesson, source: { sourceLessonId?: string }): LessonDraft => {
      const migrated = migrateLessonExercises(lesson);
      const baseSections = migrated.sections.map((s) => {
        const notes: Record<string, ExercisePlanNotes> = {};
        s.exercises.forEach((e) => {
          const springs = isSpringSetupEmpty(e.springs) ? undefined : e.springs;
          if (e.reps || e.cue || springs) notes[e.id] = { reps: e.reps, cue: e.cue, springs };
        });
        return {
          id: s.id,
          title: s.title,
          duration: s.duration,
          exerciseIds: s.exercises.map((e) => e.id),
          notes: Object.keys(notes).length ? notes : undefined,
        };
      });
      const exercisePool = [...allExercises, ...migrated.sections.flatMap((s) => s.exercises)];
      const timed = durationsFromExercises(baseSections, exercisePool);

      return {
        title: migrated.title,
        description: migrated.description ?? '',
        duration: migrated.duration || DEFAULT_CLASS_DURATION,
        trainingType: migrated.trainingType,
        yogaStyle:
          migrated.trainingType === 'yoga' ? migrated.yogaStyle ?? DEFAULT_YOGA_STYLE : undefined,
        equipment: migrated.equipment ?? defaultPlanEquipment(migrated.trainingType),
        props: migrated.props ?? [],
        level: migrated.level ?? 'Intermediate',
        focus: migrated.focus ?? '',
        coverVideo: migrated.coverVideo ?? null,
        albumImages: [],
        exerciseIds: timed.exerciseIds,
        sections: timed.sections,
        sourceLessonId: source.sourceLessonId,
      };
    },
    [allExercises]
  );

  const loadLessonDraft = useCallback(
    (lesson: Lesson) => {
      setLessonDraftState(planToDraft(lesson, { sourceLessonId: lesson.id }));
    },
    [planToDraft]
  );

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
    const clubId = lesson.clubId ?? activeClubId;
    setUserLessons((prev) => [...prev, { ...lesson, isStarter: false, clubId }]);
    setOwnedLessonIds((ids) => (ids.includes(lesson.id) ? ids : [...ids, lesson.id]));
    setDeletedLessonIds((ids) => ids.filter((id) => id !== lesson.id));
  }, [activeClubId]);

  const updateCreatedLesson = useCallback((lesson: Lesson) => {
    const stored: Lesson = { ...lesson, isStarter: false };
    setUserLessons((prev) => {
      const idx = prev.findIndex((l) => l.id === stored.id);
      if (idx >= 0) return prev.map((l) => (l.id === stored.id ? stored : l));
      return [...prev, stored];
    });
    setFlowEvents((events) =>
      events.map((e) =>
        e.lessonId === lesson.id || e.lessonPlanId === lesson.id
          ? {
              ...e,
              title: lesson.title,
              duration: lesson.duration,
              lessonId: lesson.id,
              lessonPlanId: lesson.id,
              lessonPlanTitle: lesson.title,
            }
          : e
      )
    );
  }, []);

  const duplicateCreatedLesson = useCallback((lesson: Lesson, title: string) => {
    const copy: Lesson = {
      ...clonePlan(lesson, { id: `l-${Date.now()}`, title }),
      clubId: lesson.clubId ?? activeClubId,
    };
    setUserLessons((prev) => [...prev, copy]);
    setOwnedLessonIds((ids) => (ids.includes(copy.id) ? ids : [...ids, copy.id]));
    return copy;
  }, [activeClubId]);

  const deleteCreatedLesson = useCallback((lessonId: string) => {
    setUserLessons((prev) => {
      const removed = prev.find((l) => l.id === lessonId);
      if (removed?.coverVideo?.startsWith('blob:')) {
        URL.revokeObjectURL(removed.coverVideo);
      }
      return prev.filter((l) => l.id !== lessonId);
    });
    setDeletedLessonIds((ids) => (ids.includes(lessonId) ? ids : [...ids, lessonId]));
    setFavoriteLessonIds((ids) => ids.filter((id) => id !== lessonId));
    setOwnedLessonIds((ids) => ids.filter((id) => id !== lessonId));
    setFlowEvents((events) =>
      events.map((e) =>
        e.lessonId === lessonId || e.lessonPlanId === lessonId
          ? { ...e, lessonId: undefined, lessonPlanId: undefined, lessonPlanTitle: undefined }
          : e
      )
    );
  }, []);

  const isFavoriteLesson = useCallback(
    (lessonId: string) => favoriteLessonIds.includes(lessonId),
    [favoriteLessonIds]
  );

  const toggleFavoriteLesson = useCallback((lessonId: string) => {
    setFavoriteLessonIds((ids) =>
      ids.includes(lessonId) ? ids.filter((id) => id !== lessonId) : [...ids, lessonId]
    );
  }, []);

  const addCustomExercise = useCallback(
    (data: Omit<Exercise, 'id' | 'isCustom' | 'createdBy' | 'duration'> & { duration?: number }) => {
      const exercise: Exercise = {
        ...data,
        duration: data.duration ?? 0,
        id: `custom-${Date.now()}`,
        isCustom: true,
        createdBy: instructorMeta.id,
      };
      setCustomExercises((prev) => [...prev, exercise]);
      return exercise;
    },
    [instructorMeta.id]
  );

  const updateExercise = useCallback(
    (
      id: string,
      data: Omit<Exercise, 'id' | 'isCustom' | 'createdBy' | 'duration'> & { duration?: number }
    ) => {
      const custom = customExercises.find((ex) => ex.id === id && ex.isCustom);
      if (custom) {
        const updated: Exercise = {
          ...custom,
          ...data,
          duration: data.duration ?? custom.duration,
        };
        setCustomExercises((prev) => prev.map((ex) => (ex.id === id ? updated : ex)));
        return updated;
      }

      if (!isBuiltinExerciseId(id)) return null;

      const base = BUILTIN_EXERCISES.find((exercise) => exercise.id === id);
      if (!base) return null;

      const [merged] = applyExerciseLibraryPrefs([base], exerciseLibraryPrefs);
      const updated: Exercise = {
        ...merged,
        ...data,
        duration: data.duration ?? merged.duration,
      };

      setExerciseLibraryPrefs((prev) => ({
        ...prev,
        builtinExercisePatches: {
          ...prev.builtinExercisePatches,
          [id]: {
            ...prev.builtinExercisePatches[id],
            name: updated.name,
            nameHe: updated.nameHe,
            category: updated.category,
            bodyPart: updated.bodyPart,
            customAreaId: updated.customAreaId,
            videoUrl: updated.videoUrl,
            duration: updated.duration,
          },
        },
      }));

      return updated;
    },
    [customExercises, exerciseLibraryPrefs]
  );

  const deleteExercise = useCallback(
    (id: string) => {
      if (customExercises.some((exercise) => exercise.id === id && exercise.isCustom)) {
        setCustomExercises((prev) => prev.filter((exercise) => exercise.id !== id));
        removeExerciseFromDraft(id);
        return true;
      }

      if (!isBuiltinExerciseId(id)) return false;

      setExerciseLibraryPrefs((prev) => ({
        ...prev,
        hiddenBuiltinExerciseIds: prev.hiddenBuiltinExerciseIds.includes(id)
          ? prev.hiddenBuiltinExerciseIds
          : [...prev.hiddenBuiltinExerciseIds, id],
      }));
      removeExerciseFromDraft(id);
      return true;
    },
    [customExercises, removeExerciseFromDraft]
  );

  const reassignExerciseArea = useCallback((fromAreaId: string, fallback: BodyPart = 'core') => {
    setCustomExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.customAreaId === fromAreaId) {
          return { ...exercise, customAreaId: undefined, bodyPart: fallback };
        }
        if (
          isStandardBodyPart(fromAreaId) &&
          !exercise.customAreaId &&
          (exercise.bodyPart ?? 'core') === fromAreaId
        ) {
          return { ...exercise, bodyPart: fallback };
        }
        return exercise;
      })
    );

    if (!isStandardBodyPart(fromAreaId)) return;

    setExerciseLibraryPrefs((prev) => {
      const nextPatches = { ...prev.builtinExercisePatches };
      for (const exercise of BUILTIN_EXERCISES) {
        const merged = { ...exercise, ...nextPatches[exercise.id] };
        const area = merged.customAreaId ?? merged.bodyPart ?? exercise.bodyPart;
        if (area === fromAreaId) {
          nextPatches[exercise.id] = {
            ...nextPatches[exercise.id],
            bodyPart: fallback,
            customAreaId: undefined,
          };
        }
      }
      return { ...prev, builtinExercisePatches: nextPatches };
    });
  }, []);

  const ensureCustomExerciseArea = useCallback((input: string): CustomExerciseArea | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const matches = (area: CustomExerciseArea) =>
      area.name.toLowerCase() === trimmed.toLowerCase() ||
      area.nameHe.toLowerCase() === trimmed.toLowerCase();

    const existing = customExerciseAreas.find(matches);
    if (existing) return existing;

    let slug = slugFromAreaName(trimmed);
    let id = `custom-${slug}`;
    let n = 2;
    while (customExerciseAreas.some((area) => area.id === id)) {
      id = `custom-${slug}-${n}`;
      n += 1;
    }

    const area: CustomExerciseArea = { id, name: trimmed, nameHe: trimmed };
    setCustomExerciseAreas((prev) => (prev.some(matches) ? prev : [...prev, area]));

    void bilingualName(trimmed).then(({ name, nameHe }) => {
      setCustomExerciseAreas((prev) =>
        prev.map((item) => (item.id === area.id ? { ...item, name, nameHe } : item))
      );
    });

    return area;
  }, [customExerciseAreas]);

  const updateExerciseArea = useCallback((areaId: string, labels: { name: string; nameHe: string }) => {
    if (isStandardBodyPart(areaId)) {
      setExerciseLibraryPrefs((prev) => ({
        ...prev,
        bodyPartLabels: {
          ...prev.bodyPartLabels,
          [areaId]: labels,
        },
      }));
      return;
    }

    setCustomExerciseAreas((prev) =>
      prev.map((area) => (area.id === areaId ? { ...area, ...labels } : area))
    );
  }, []);

  const deleteExerciseArea = useCallback(
    (areaId: string) => {
      if (isStandardBodyPart(areaId)) {
        setExerciseLibraryPrefs((prev) => ({
          ...prev,
          hiddenBodyParts: prev.hiddenBodyParts.includes(areaId)
            ? prev.hiddenBodyParts
            : [...prev.hiddenBodyParts, areaId],
        }));
        reassignExerciseArea(areaId);
        return;
      }

      setCustomExerciseAreas((prev) => prev.filter((area) => area.id !== areaId));
      reassignExerciseArea(areaId);
    },
    [reassignExerciseArea]
  );

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

  const removeArboxTeamMember = useCallback((staffId: string) => {
    const updated = persistRemoveArboxTeamMember(staffId);
    if (updated) setArboxConnection(updated);
  }, []);

  const updateArboxTeamMember = useCallback(
    (staffId: string, patch: { name?: string; email?: string }) => {
      const updated = persistUpdateArboxTeamMember(staffId, patch);
      if (updated) setArboxConnection(updated);
    },
    []
  );

  // Auto-sync when week changes while connected
  useEffect(() => {
    if (!arboxConnection.connected) return;
    void syncArbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const attachLessonPlan = useCallback((eventId: string, lessonId: string) => {
    if (isActiveStudioManager) return false;
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
  }, [arboxConnection, arboxEvents, flowEvents, createdLessons, isActiveStudioManager]);

  const detachLessonPlan = useCallback((eventId: string) => {
    if (isActiveStudioManager) return;
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
  }, [arboxConnection, arboxEvents, flowEvents, isActiveStudioManager]);

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
    (eventId: string, input: { id?: string; name: string; phone?: string; email?: string }) => {
      const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
      if (!event) return false;
      const name = input.name.trim();
      const phone = input.phone?.trim() ?? '';
      const email = input.email?.trim() ?? '';
      const phoneOk = phone ? isValidPhone(phone) : false;
      const emailOk = email ? isValidEmail(email) : false;
      if (!name || (!phoneOk && !emailOk)) return false;

      const phoneDigits = phoneOk ? phone.replace(/\D/g, '') : '';
      const emailKey = emailOk ? normalizeEmail(email) : '';
      const already = (event.attendees ?? []).some(
        (a) =>
          (input.id && a.id === input.id) ||
          (phoneDigits && a.phone && a.phone.replace(/\D/g, '') === phoneDigits) ||
          (emailKey && a.email && normalizeEmail(a.email) === emailKey)
      );
      if (already) return true;

      const attendee: ScheduleAttendee = {
        id: input.id ?? createAttendeeId(),
        name,
        phone: phoneOk ? phone : undefined,
        email: emailOk ? normalizeEmail(email) : undefined,
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
    (eventId: string, client: { id: string; name: string; phone?: string; email?: string }) => {
      if (isActiveStudioManager) return;
      const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
      if (!event) return;
      const phoneDigits = client.phone?.replace(/\D/g, '') ?? '';
      const emailKey = client.email ? normalizeEmail(client.email) : '';
      const existing = (event.attendees ?? []).find(
        (a) =>
          a.id === client.id ||
          (phoneDigits && a.phone && a.phone.replace(/\D/g, '') === phoneDigits) ||
          (emailKey && a.email && normalizeEmail(a.email) === emailKey)
      );
      if (existing) {
        removeEventAttendee(eventId, existing.id);
        return;
      }
      addEventAttendee(eventId, client);
    },
    [arboxEvents, flowEvents, addEventAttendee, removeEventAttendee, isActiveStudioManager]
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
    const pending = findPendingFeedbackEvents(
      scheduleEvents,
      new Date(),
      scope,
      feedbackDeliveryChannel
    );

    let sent = 0;
    for (const event of pending) {
      const result = await dispatchClassFeedback(event, arboxConnection);
      if (result.sent > 0) {
        markEventFeedbackSent(event.id);
        sent += 1;
      }
    }

    return sent || pending.length;
  }, [arboxConnection, scheduleEvents, markEventFeedbackSent, feedbackDeliveryChannel]);

  const addLessonToSchedule = useCallback((
    lessonId: string,
    dateKey: string,
    time: string,
    options?: { endedRecently?: boolean; rosterClients?: SurveyClient[]; capacity?: number }
  ): string | null => {
    if (isActiveStudioManager) return null;
    const lesson = lessons.find((l) => l.id === lessonId) ?? createdLessons.find((l) => l.id === lessonId);
    if (!lesson) return null;

    const instructorId = arboxConnection.connected
      ? arboxConnection.staffId
      : user?.id ?? currentInstructor.id;
    const instructorName =
      user?.name ||
      (arboxConnection.connected ? arboxConnection.staffName : currentInstructor.name);

    // Arbox clients can be on file without a phone/email — keep them on the roster;
    // delivery skips anyone missing the contact method for the active channel.
    const attendees: ScheduleAttendee[] = (options?.rosterClients ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone && isValidPhone(c.phone) ? c.phone.trim() : undefined,
      email: c.email && isValidEmail(c.email) ? normalizeEmail(c.email) : undefined,
    }));

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
      instructorId,
      instructor: instructorName,
      attendees,
      enrolled: attendees.length,
      capacity: options?.capacity,
      feedbackSentAt: null,
      clubId: activeClubId,
    };
    setFlowEvents((prev) => [...prev, event]);
    window.setTimeout(() => requestFeedbackCheck(), 200);
    return event.id;
  }, [createdLessons, arboxConnection, user, isActiveStudioManager, activeClubId]);

  const moveScheduleEvent = useCallback((eventId: string, dateKey: string, time: string) => {
    if (isActiveStudioManager) return;
    const event = [...arboxEvents, ...flowEvents].find((e) => e.id === eventId);
    if (!event) return;
    if (!canAttachPlanToEvent(event, arboxConnection)) return;

    if (event.source === 'arbox') return; // Arbox slots are managed in Arbox

    setFlowEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId ? { ...ev, start: combineDateAndTime(dateKey, time) } : ev
      )
    );
  }, [arboxConnection, arboxEvents, flowEvents, isActiveStudioManager]);

  const updateScheduleEvent = useCallback((
    eventId: string,
    updates: {
      lessonId?: string;
      dateKey?: string;
      time?: string;
      rosterClients?: SurveyClient[];
      capacity?: number;
    }
  ) => {
    if (isActiveStudioManager) return;
    setFlowEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;

        const lesson = updates.lessonId
          ? lessons.find((l) => l.id === updates.lessonId) ??
            createdLessons.find((l) => l.id === updates.lessonId)
          : undefined;
        const next: ScheduleEvent = { ...ev };

        if (lesson) {
          next.title = lesson.title;
          next.lessonId = lesson.id;
          next.lessonPlanId = lesson.id;
          next.lessonPlanTitle = lesson.title;
          next.duration = lesson.duration;
          next.category = trainingTypeToEventCategory(lesson.trainingType);
        }
        if (updates.dateKey && updates.time) {
          next.start = combineDateAndTime(updates.dateKey, updates.time);
        }
        if (updates.rosterClients) {
          next.attendees = updates.rosterClients.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone && isValidPhone(c.phone) ? c.phone.trim() : undefined,
            email: c.email && isValidEmail(c.email) ? normalizeEmail(c.email) : undefined,
          }));
          next.enrolled = next.attendees.length;
        }
        if (updates.capacity != null) {
          next.capacity = updates.capacity;
        }
        return next;
      })
    );
  }, [createdLessons, isActiveStudioManager]);

  const removeScheduleEvent = useCallback((eventId: string) => {
    if (isActiveStudioManager) return;
    setFlowEvents((prev) => prev.filter((ev) => ev.id !== eventId));
  }, [isActiveStudioManager]);

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
      lessonsCount: createdLessons.length,
      studentsCount:
        arboxConnection.connected && arboxConnection.dataSource === 'live'
          ? arboxClients.length
          : rosterClients.length,
    }),
    [coins, user, createdLessons.length, rosterClients.length, arboxConnection, arboxClients.length]
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
        customExerciseAreas,
        exerciseLibraryPrefs,
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
        updateCreatedLesson,
        deleteCreatedLesson,
        favoriteLessonIds,
        isFavoriteLesson,
        toggleFavoriteLesson,
        duplicateCreatedLesson,
        addCustomExercise,
        updateExercise,
        deleteExercise,
        ensureCustomExerciseArea,
        updateExerciseArea,
        deleteExerciseArea,
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
        removeArboxTeamMember,
        updateArboxTeamMember,
        attachLessonPlan,
        detachLessonPlan,
        toggleAutoFeedback,
        autoClassFeedbackEnabled,
        setAutoClassFeedbackEnabled,
        feedbackDeliveryChannel,
        setFeedbackDeliveryChannel,
        runFeedbackAutomation,
        addLessonToSchedule,
        moveScheduleEvent,
        updateScheduleEvent,
        removeScheduleEvent,
        addEventAttendee,
        removeEventAttendee,
        toggleEventAttendee,
        markEventFeedbackSent,
        feedbackResponses: allFeedback,
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
