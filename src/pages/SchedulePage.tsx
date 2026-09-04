import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MapPin,
  User,
  Users,
  X,
  Plus,
  Minus,
  Pencil,
  Trash2,
  Clock,
  CalendarPlus,
  MessageSquare,
  BookOpen,
  Unlink,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { type SurveyClient } from '@/services/surveyClients';
import { ClientPicker } from '@/components/ClientPicker';
import { ClassFeedbackAttendees } from '@/components/ClassFeedbackAttendees';
import { IconButton, IconToolbar } from '@/components/IconToolbar';
import {
  addDays,
  formatWeekRange,
  formatFullDayLabel,
  formatDayStrip,
  toDateKey,
  startOfDay,
  getEventDateKey,
  getEventTime,
  getEventCategory,
  getEventColors,
  shouldShowEventType,
  canAttachPlanToEvent,
  isOwnEvent,
  type ScheduleEvent,
} from '@/data/scheduleTypes';
import { TRAINING_TYPES, canChooseTrainingType, type TrainingType } from '@/data/trainingTypes';
import { equipmentLabel, eventCategoryLabel, trainingLabel, useI18n } from '@/i18n';
import '@/components/Schedule.css';

const DEFAULT_CAPACITY = 10;
const MAX_CAPACITY = 60;
const TIME_STEP_MINUTES = 15;

type ViewMode = 'day' | 'week';
type SheetMode = 'add' | 'attach' | 'edit';

function ScheduleOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const shell = document.getElementById('app-shell');
  if (!shell) return null;
  return createPortal(
    <div className="schedule-overlay" onClick={onClose} role="presentation">
      {children}
    </div>,
    shell
  );
}

function isClientOnEvent(event: ScheduleEvent, client: SurveyClient): boolean {
  const phoneDigits = client.phone.replace(/\D/g, '');
  return (event.attendees ?? []).some(
    (a) => a.id === client.id || (a.phone && a.phone.replace(/\D/g, '') === phoneDigits)
  );
}

export function SchedulePage() {
  const {
    instructor,
    weekStart,
    setWeekStart,
    scheduleEvents,
    arboxConnection,
    addLessonToSchedule,
    updateScheduleEvent,
    removeScheduleEvent,
    attachLessonPlan,
    detachLessonPlan,
    schedulableLessons,
    setLinkedInstructor,
    rosterClients,
    arboxClients,
  } = useApp();
  const { t, dateLocale, locale } = useI18n();
  const showTypeChoice = canChooseTrainingType(instructor.specialties);
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>('add');
  const [addTrainingType, setAddTrainingType] = useState<TrainingType | null>(null);
  const [addLessonId, setAddLessonId] = useState<string | null>(null);
  const [addTime, setAddTime] = useState('10:00');
  const [addClientIds, setAddClientIds] = useState<string[]>([]);
  const [addCapacity, setAddCapacity] = useState(DEFAULT_CAPACITY);
  const [capacityWarning, setCapacityWarning] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);

  const attachLessonId = searchParams.get('attachLessonId');

  useEffect(() => {
    if (!attachLessonId) return;
    if (schedulableLessons.length === 0) return;
    const lesson = schedulableLessons.find((l) => l.id === attachLessonId);
    const next = new URLSearchParams(searchParams);
    next.delete('attachLessonId');
    setSearchParams(next, { replace: true });
    if (!lesson) return;

    setSheetMode('add');
    setAddTrainingType(lesson.trainingType);
    setAddLessonId(lesson.id);
    setAddTime('10:00');
    setAddClientIds([]);
    setAddCapacity(DEFAULT_CAPACITY);
    setCapacityWarning(false);
    setShowAddSheet(true);
    setViewMode('day');
  }, [attachLessonId, schedulableLessons, searchParams, setSearchParams]);

  useEffect(() => {
    setCapacityWarning(false);
    setEditingEvent(false);
  }, [selectedEvent?.id]);

  // Keep event sheet in sync when attendees / feedback status change
  useEffect(() => {
    if (!selectedEvent) return;
    const fresh = scheduleEvents.find((e) => e.id === selectedEvent.id);
    if (fresh) setSelectedEvent(fresh);
    else setSelectedEvent(null);
  }, [scheduleEvents, selectedEvent?.id]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const todayKey = toDateKey(new Date());
  const selectedKey = toDateKey(selectedDay);
  const needsInstructorPick =
    arboxConnection.connected &&
    arboxConnection.team.length > 1 &&
    !arboxConnection.linkedInstructorId;

  const eventsByDay = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    days.forEach((d) => { map[toDateKey(d)] = []; });
    scheduleEvents.forEach((ev) => {
      const key = getEventDateKey(ev);
      if (map[key]) map[key].push(ev);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.start.localeCompare(b.start))
    );
    return map;
  }, [scheduleEvents, days]);

  const dayEvents = eventsByDay[selectedKey] ?? [];

  // Default to today whenever Schedule opens.
  useEffect(() => {
    const today = startOfDay(new Date());
    setWeekStart(startOfDay(addDays(today, -today.getDay())));
    setSelectedDay(today);
  }, [setWeekStart]);

  // When navigating weeks, keep the selected day inside the visible range.
  useEffect(() => {
    const weekStartKey = toDateKey(weekStart);
    const weekEndKey = toDateKey(addDays(weekStart, 6));
    const selectedKeyLocal = toDateKey(selectedDay);
    if (selectedKeyLocal >= weekStartKey && selectedKeyLocal <= weekEndKey) return;

    const today = startOfDay(new Date());
    const todayKeyLocal = toDateKey(today);
    if (todayKeyLocal >= weekStartKey && todayKeyLocal <= weekEndKey) {
      setSelectedDay(today);
    } else {
      setSelectedDay(startOfDay(weekStart));
    }
    // Only re-clamp when the week changes; user can still pick other days in-range.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedDay intentionally omitted
  }, [weekStart]);

  const goToday = () => {
    const today = startOfDay(new Date());
    setWeekStart(startOfDay(addDays(today, -today.getDay())));
    setSelectedDay(today);
  };

  const availableTypes = useMemo(() => {
    const types = new Set(schedulableLessons.map((l) => l.trainingType));
    return TRAINING_TYPES.filter((t) => types.has(t));
  }, [schedulableLessons]);

  const lessonsForType = useMemo(() => {
    if (!addTrainingType) return schedulableLessons;
    return schedulableLessons.filter((l) => l.trainingType === addTrainingType);
  }, [schedulableLessons, addTrainingType]);

  const selectedLesson = useMemo(
    () => schedulableLessons.find((l) => l.id === addLessonId) ?? null,
    [schedulableLessons, addLessonId]
  );

  const isLiveArbox = arboxConnection.connected && arboxConnection.dataSource === 'live';

  // Connected studios keep their roster in Arbox; otherwise it is the local list.
  const pickerClients = useMemo<SurveyClient[]>(() => {
    if (!isLiveArbox) return rosterClients;
    return arboxClients.map((client) => ({
      id: client.id,
      name: client.name,
      phone: client.phone ?? '',
      createdAt: '',
    }));
  }, [isLiveArbox, arboxClients, rosterClients]);

  // The arrows jump between round quarter-hours; typing still allows any time.
  const shiftTime = (delta: number) => {
    const [hours, minutes] = addTime.split(':').map(Number);
    const current = (hours || 0) * 60 + (minutes || 0);
    const snapped =
      delta > 0
        ? Math.floor(current / TIME_STEP_MINUTES) * TIME_STEP_MINUTES + delta
        : Math.ceil(current / TIME_STEP_MINUTES) * TIME_STEP_MINUTES + delta;
    const next = ((snapped % 1440) + 1440) % 1440;
    setAddTime(
      `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`
    );
  };

  const changeCapacity = (delta: number) => {
    setCapacityWarning(false);
    setAddCapacity((prev) =>
      Math.min(MAX_CAPACITY, Math.max(Math.max(1, addClientIds.length), prev + delta))
    );
  };

  const openAddSheet = () => {
    setSheetMode('add');
    setAddTrainingType(null);
    setAddLessonId(null);
    setAddTime('10:00');
    setAddClientIds([]);
    setAddCapacity(DEFAULT_CAPACITY);
    setCapacityWarning(false);
    setShowAddSheet(true);
    if (viewMode === 'week') setViewMode('day');
  };

  const openAttachSheet = (event: ScheduleEvent) => {
    if (!canAttachPlanToEvent(event, arboxConnection)) return;
    setSelectedEvent(event);
    setSheetMode('attach');
    setAddTrainingType(null);
    setAddLessonId(null);
    setShowAddSheet(true);
  };

  // Editing reuses the add sheet, pre-filled with what the class holds today.
  const openEditSheet = (event: ScheduleEvent) => {
    const lesson = schedulableLessons.find(
      (l) => l.id === event.lessonId || l.id === event.lessonPlanId
    );
    const attending = pickerClients.filter((client) => isClientOnEvent(event, client));

    setSelectedEvent(event);
    setSheetMode('edit');
    setSelectedDay(startOfDay(new Date(event.start)));
    setAddTrainingType(lesson?.trainingType ?? null);
    setAddLessonId(lesson?.id ?? null);
    setAddTime(getEventTime(event));
    setAddClientIds(attending.map((client) => client.id));
    setAddCapacity(event.capacity ?? Math.max(DEFAULT_CAPACITY, attending.length));
    setCapacityWarning(false);
    setShowAddSheet(true);
  };

  const closeAddSheet = () => {
    setShowAddSheet(false);
    setAddTrainingType(null);
    setAddLessonId(null);
    setAddClientIds([]);
    setAddCapacity(DEFAULT_CAPACITY);
    setCapacityWarning(false);
    setSheetMode('add');
  };

  const toggleAddClient = (client: SurveyClient) => {
    setAddClientIds((prev) => {
      if (prev.includes(client.id)) {
        setCapacityWarning(false);
        return prev.filter((id) => id !== client.id);
      }
      if (prev.length >= addCapacity) {
        setCapacityWarning(true);
        return prev;
      }
      setCapacityWarning(false);
      return [...prev, client.id];
    });
  };

  const selectTrainingType = (next: TrainingType | null) => {
    setAddTrainingType(next);
    if (next && !schedulableLessons.some((l) => l.id === addLessonId && l.trainingType === next)) {
      setAddLessonId(null);
    }
  };

  // Classes created here always belong to the signed-in instructor, even if they
  // were saved before she signed in.
  const instructorNameFor = (event: ScheduleEvent) =>
    event.source === 'flowpilates' ? instructor.name : event.instructor;

  const confirmAdd = () => {
    if (!addLessonId) return;

    if (sheetMode === 'attach' && selectedEvent) {
      const ok = attachLessonPlan(selectedEvent.id, addLessonId);
      if (ok) {
        setSelectedEvent((prev) =>
          prev
            ? {
                ...prev,
                lessonPlanId: addLessonId,
                lessonPlanTitle: schedulableLessons.find((l) => l.id === addLessonId)?.title,
              }
            : prev
        );
      }
      closeAddSheet();
      return;
    }

    if (sheetMode === 'edit' && selectedEvent) {
      updateScheduleEvent(selectedEvent.id, {
        lessonId: addLessonId,
        dateKey: selectedKey,
        time: addTime,
        rosterClients: pickerClients.filter((c) => addClientIds.includes(c.id)),
        capacity: addCapacity,
      });
      closeAddSheet();
      setSelectedEvent(null);
      return;
    }

    addLessonToSchedule(addLessonId, selectedKey, addTime, {
      rosterClients: pickerClients.filter((c) => addClientIds.includes(c.id)),
      capacity: addCapacity,
    });
    closeAddSheet();
  };

  const renderEventCard = (ev: ScheduleEvent, onClick: () => void) => {
    const colors = getEventColors(ev);
    const isFull = ev.enrolled != null && ev.capacity != null && ev.enrolled >= ev.capacity;
    const canEditSlot = canAttachPlanToEvent(ev, arboxConnection);
    const slotIsOwn = isOwnEvent(ev, arboxConnection);
    const isArbox = ev.source === 'arbox';
    const own = arboxConnection.connected && isArbox && slotIsOwn;
    const otherInstructor = arboxConnection.connected && isArbox && !slotIsOwn && Boolean(ev.instructor);
    const showPlanStatus = canEditSlot;
    const hasPlan = Boolean(ev.lessonPlanTitle);

    return (
      <button
        key={ev.id}
        type="button"
        className={`schedule-card ${own ? 'schedule-card--own' : ''} ${otherInstructor ? 'schedule-card--other' : ''} ${showPlanStatus ? (hasPlan ? 'schedule-card--has-plan' : 'schedule-card--no-plan') : ''}`}
        onClick={onClick}
        draggable={canAttachPlanToEvent(ev, arboxConnection)}
        onDragStart={(e) => {
          if (!canAttachPlanToEvent(ev, arboxConnection)) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData('text/event-id', ev.id);
        }}
      >
        <div className="schedule-card__bar" style={{ backgroundColor: colors.bg }} />
        <div className="schedule-card__body">
          <div className="schedule-card__row">
            <span className="schedule-card__time">{getEventTime(ev)}</span>
            <span className="schedule-card__title">{ev.title}</span>
          </div>
          <div className="schedule-card__meta">
            {showTypeChoice && shouldShowEventType(ev) && (
              <span className="schedule-card__type">{eventCategoryLabel(getEventCategory(ev), t)}</span>
            )}
            {ev.location && <span>· {ev.location}</span>}
            {instructorNameFor(ev) && <span>· {instructorNameFor(ev)}</span>}
            {own && <span className="schedule-card__tag schedule-card__tag--own">{t('common.you')}</span>}
            {otherInstructor && <span className="schedule-card__tag schedule-card__tag--other">{t('schedule.viewOnly')}</span>}
            {ev.feedbackSentAt && <span className="schedule-card__tag schedule-card__tag--sent">{t('schedule.surveySent')}</span>}
          </div>
          {showPlanStatus && (
            <div
              className={`schedule-card__plan ${hasPlan ? 'schedule-card__plan--yes' : 'schedule-card__plan--no'}`}
            >
              <BookOpen size={13} strokeWidth={2} aria-hidden />
              <span className="schedule-card__plan-label">
                {hasPlan ? ev.lessonPlanTitle : t('schedule.noPlan')}
              </span>
            </div>
          )}
          {!showPlanStatus && hasPlan && (
            <div className="schedule-card__plan schedule-card__plan--yes schedule-card__plan--readonly">
              <BookOpen size={13} strokeWidth={2} aria-hidden />
              <span className="schedule-card__plan-label">{ev.lessonPlanTitle}</span>
            </div>
          )}
        </div>
        {ev.enrolled != null && ev.capacity != null && (
          <span className={`schedule-card__count ${isFull ? 'schedule-card__count--full' : ''}`}>
            {ev.enrolled}/{ev.capacity}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="page fade-in schedule-page">
      <header className="schedule-top">
        <div className="schedule-top__row">
          <h1 className="page-title">{t('schedule.title')}</h1>
          <button type="button" className="schedule-today" onClick={goToday}>{t('common.today')}</button>
        </div>

        {needsInstructorPick && (
          <div className="schedule-identity-pick">
            <p className="schedule-identity-pick__label">{t('schedule.whichInstructor')}</p>
            <div className="schedule-identity-pick__options">
              {arboxConnection.team.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="schedule-identity-pick__btn"
                  onClick={() => setLinkedInstructor(member.id)}
                >
                  {member.name.trim()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="schedule-nav">
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label={t('schedule.previousWeek')}>
            {locale === 'he' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <span>{formatWeekRange(weekStart, dateLocale)}</span>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label={t('schedule.nextWeek')}>
            {locale === 'he' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        <div className="schedule-tabs">
          <button type="button" className={viewMode === 'day' ? 'active' : ''} onClick={() => setViewMode('day')}>
            {t('schedule.day')}
          </button>
          <button type="button" className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>
            {t('schedule.week')}
          </button>
        </div>

        <div className="schedule-days">
          {days.map((day) => {
            const key = toDateKey(day);
            const strip = formatDayStrip(day, dateLocale);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const count = eventsByDay[key]?.length ?? 0;

            return (
              <button
                key={key}
                type="button"
                className={`schedule-day ${isSelected ? 'schedule-day--selected' : ''} ${isToday ? 'schedule-day--today' : ''}`}
                onClick={() => { setSelectedDay(day); setViewMode('day'); }}
              >
                <span className="schedule-day__dow">{strip.dow}</span>
                <span className="schedule-day__num">{strip.num}</span>
                {count > 0 && <span className="schedule-day__dot" />}
              </button>
            );
          })}
        </div>
      </header>

      <main className="schedule-main">
        {viewMode === 'day' && (
          <section className="schedule-agenda">
            <h2 className="schedule-agenda__title">{formatFullDayLabel(selectedDay, dateLocale)}</h2>
            {dayEvents.length > 0 ? (
              <div className="schedule-agenda__list">
                {dayEvents.map((ev) => renderEventCard(ev, () => setSelectedEvent(ev)))}
              </div>
            ) : arboxConnection.connected ? (
              <div className="schedule-empty">
                <CalendarPlus size={36} strokeWidth={1.5} />
                <p>{t('schedule.noArbox')}</p>
                {arboxConnection.scheduleDebug && (
                  <p className="schedule-empty__hint">
                    {t('schedule.arboxReturned', {
                      count: arboxConnection.scheduleDebug.rowCount,
                      from: arboxConnection.scheduleDebug.from ?? '',
                      to: arboxConnection.scheduleDebug.to ?? '',
                    })}
                    {arboxConnection.scheduleDebug.rowCount === 0
                      ? t('schedule.arboxNone')
                      : t('schedule.arboxOtherDay')}
                  </p>
                )}
                <p className="schedule-empty__hint">
                  {t('schedule.navigateHint')}
                </p>
              </div>
            ) : (
              <div className="schedule-empty">
                <CalendarPlus size={36} strokeWidth={1.5} />
                <p>{t('schedule.noClassesDay')}</p>
                <button type="button" className="btn btn-secondary schedule-empty__btn" onClick={openAddSheet}>
                  {t('schedule.addClass')}
                </button>
              </div>
            )}
          </section>
        )}

        {viewMode === 'week' && (
          <section className="schedule-week">
            {days.map((day) => {
              const key = toDateKey(day);
              const events = eventsByDay[key] ?? [];
              if (events.length === 0) return null;
              const isToday = key === todayKey;

              return (
                <div key={key} className="schedule-week__group">
                  <h3 className="schedule-week__label">
                    {formatFullDayLabel(day, dateLocale)}
                    {isToday && <span className="schedule-week__today">{t('common.today')}</span>}
                  </h3>
                  <div className="schedule-agenda__list">
                    {events.map((ev) => renderEventCard(ev, () => setSelectedEvent(ev)))}
                  </div>
                </div>
              );
            })}
            {scheduleEvents.length === 0 && (
              <div className="schedule-empty">
                <CalendarPlus size={36} strokeWidth={1.5} />
                <p>{t('schedule.noClassesWeek')}</p>
              </div>
            )}
          </section>
        )}
      </main>

      <button type="button" className="schedule-fab" onClick={openAddSheet} aria-label={t('schedule.addAria')}>
        <Plus size={24} />
      </button>

      {showAddSheet && (
        <ScheduleOverlay onClose={closeAddSheet}>
          <div className="schedule-sheet schedule-sheet--add" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-sheet__handle" aria-hidden="true" />
            <div className="schedule-sheet__top">
              <div className="schedule-sheet__head">
                <h2>
                  {sheetMode === 'attach'
                    ? t('schedule.attachPlan')
                    : sheetMode === 'edit'
                      ? t('schedule.editClass')
                      : t('schedule.addClass')}
                </h2>
                <IconButton onClick={closeAddSheet} aria-label={t('common.close')}>
                  <X size={20} />
                </IconButton>
              </div>
              <p className="schedule-sheet__date">
                {sheetMode === 'attach' && selectedEvent
                  ? `${selectedEvent.title} · ${getEventTime(selectedEvent)}`
                  : formatFullDayLabel(selectedDay, dateLocale)}
              </p>
              {sheetMode === 'attach' && (
                <p className="schedule-sheet__hint schedule-sheet__hint--inline">
                  {t('schedule.attachOwnOnly')}
                </p>
              )}
            </div>

            <div className="schedule-sheet__body">
              <section className="schedule-group">
                {showTypeChoice && (
                  <div className="schedule-field">
                    <label className="schedule-field__label" htmlFor="add-training-type">
                      {t('schedule.trainingType')}
                    </label>
                    <div className="schedule-field__control">
                      <select
                        id="add-training-type"
                        value={addTrainingType ?? ''}
                        onChange={(e) =>
                          selectTrainingType((e.target.value || null) as TrainingType | null)
                        }
                      >
                        <option value="">{t('schedule.allTypes')}</option>
                        {availableTypes.map((type) => (
                          <option key={type} value={type}>
                            {trainingLabel(type, t)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="schedule-field__chevron" aria-hidden />
                    </div>
                  </div>
                )}

                <div className="schedule-field">
                  <label className="schedule-field__label" htmlFor="add-lesson-plan">
                    {t('schedule.lessonPlan')}
                  </label>
                  <div className="schedule-field__control">
                    <select
                      id="add-lesson-plan"
                      value={addLessonId ?? ''}
                      disabled={lessonsForType.length === 0}
                      onChange={(e) => setAddLessonId(e.target.value || null)}
                    >
                      <option value="">
                        {lessonsForType.length === 0
                          ? t('schedule.noLessons')
                          : t('schedule.choosePlan')}
                      </option>
                      {lessonsForType.map((lesson) => (
                        <option key={lesson.id} value={lesson.id}>
                          {lesson.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="schedule-field__chevron" aria-hidden />
                  </div>
                  {selectedLesson && (
                    <p className="schedule-field__meta">
                      {equipmentLabel(selectedLesson.equipment, t)} · {selectedLesson.duration}{' '}
                      {t('common.min')}
                    </p>
                  )}
                </div>

                {sheetMode !== 'attach' && (
                  <div className="schedule-field-row">
                    <div className="schedule-field">
                      <label className="schedule-field__label" htmlFor="add-time">
                        {t('schedule.time')}
                      </label>
                      <div className="schedule-stepper">
                        <button
                          type="button"
                          onClick={() => shiftTime(-TIME_STEP_MINUTES)}
                          aria-label={t('schedule.timeEarlier')}
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          id="add-time"
                          className="schedule-stepper__time"
                          type="time"
                          step={300}
                          value={addTime}
                          onChange={(e) => setAddTime(e.target.value || addTime)}
                        />
                        <button
                          type="button"
                          onClick={() => shiftTime(TIME_STEP_MINUTES)}
                          aria-label={t('schedule.timeLater')}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="schedule-field">
                      <span className="schedule-field__label">{t('schedule.capacity')}</span>
                      <div className="schedule-stepper">
                        <button
                          type="button"
                          onClick={() => changeCapacity(-1)}
                          disabled={addCapacity <= Math.max(1, addClientIds.length)}
                          aria-label={t('schedule.capacityLess')}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="schedule-stepper__value">{addCapacity}</span>
                        <button
                          type="button"
                          onClick={() => changeCapacity(1)}
                          disabled={addCapacity >= MAX_CAPACITY}
                          aria-label={t('schedule.capacityMore')}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {sheetMode !== 'attach' && (
                <section className="schedule-group">
                  <div className="schedule-clients__head">
                    <span className="schedule-field__label">{t('schedule.clients')}</span>
                    <span
                      className="schedule-clients__count"
                      title={t('schedule.selectedOfCapacity', {
                        count: addClientIds.length,
                        capacity: addCapacity,
                      })}
                    >
                      {addClientIds.length}/{addCapacity}
                    </span>
                  </div>
                  {isLiveArbox && (
                    <p className="schedule-attendees__hint">{t('schedule.clientsFromArbox')}</p>
                  )}
                  <ClientPicker
                    clients={pickerClients}
                    isSelected={(client) => addClientIds.includes(client.id)}
                    onToggle={toggleAddClient}
                    canManage={!isLiveArbox}
                    emptyLabel={isLiveArbox ? t('schedule.noArboxClients') : undefined}
                    onAdded={(client) => setAddClientIds((prev) => [...prev, client.id])}
                    onRemoved={(client) =>
                      setAddClientIds((prev) => prev.filter((id) => id !== client.id))
                    }
                  />
                  {capacityWarning && (
                    <p className="schedule-attendees__full">{t('schedule.capacityReached')}</p>
                  )}
                </section>
              )}
            </div>

            <div className="schedule-sheet__footer">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!addLessonId}
                onClick={confirmAdd}
              >
                {sheetMode === 'attach'
                  ? t('schedule.attachToSlot')
                  : sheetMode === 'edit'
                    ? t('schedule.saveChanges')
                    : t('schedule.addAtTime', { time: addTime })}
              </button>
            </div>
          </div>
        </ScheduleOverlay>
      )}

      {selectedEvent && !showAddSheet && (
        <ScheduleOverlay onClose={() => setSelectedEvent(null)}>
          <div className="schedule-sheet" onClick={(e) => e.stopPropagation()}>
            <div
              className="schedule-sheet__accent"
              style={{ backgroundColor: getEventColors(selectedEvent).bg }}
            />
            <IconToolbar className="schedule-sheet__toolbar">
              {selectedEvent.source === 'flowpilates' && (
                <IconButton
                  danger
                  onClick={() => {
                    removeScheduleEvent(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  aria-label={t('schedule.removeFromSchedule')}
                >
                  <Trash2 size={18} />
                </IconButton>
              )}
              {!editingEvent && canAttachPlanToEvent(selectedEvent, arboxConnection) && (
                <IconButton
                  onClick={() =>
                    selectedEvent.source === 'flowpilates'
                      ? openEditSheet(selectedEvent)
                      : setEditingEvent(true)
                  }
                  aria-label={t('schedule.edit')}
                >
                  <Pencil size={18} />
                </IconButton>
              )}
              <IconButton onClick={() => setSelectedEvent(null)} aria-label={t('common.close')}>
                <X size={20} />
              </IconButton>
            </IconToolbar>
            <h2 className="schedule-sheet__title">{selectedEvent.title}</h2>
            <p className="schedule-sheet__sub">
              <Clock size={14} />
              {getEventTime(selectedEvent)} · {selectedEvent.duration} {t('common.min')}
            </p>
            <div className="schedule-sheet__details">
              {showTypeChoice && shouldShowEventType(selectedEvent) && (
                <div className="schedule-sheet__row">
                  <span
                    className="schedule-sheet__category"
                    style={{
                      backgroundColor: getEventColors(selectedEvent).bg,
                      color: getEventColors(selectedEvent).text,
                    }}
                  >
                    {eventCategoryLabel(getEventCategory(selectedEvent), t)}
                  </span>
                </div>
              )}
              {selectedEvent.location && selectedEvent.source === 'arbox' && (
                <div className="schedule-sheet__row"><MapPin size={16} /><span>{selectedEvent.location}</span></div>
              )}
              {instructorNameFor(selectedEvent) && (
                <div className="schedule-sheet__row">
                  <User size={16} />
                  <span>{instructorNameFor(selectedEvent)}</span>
                </div>
              )}
              {selectedEvent.enrolled != null && selectedEvent.capacity != null && (
                <div className="schedule-sheet__row">
                  <Users size={16} />
                  <span>{t('schedule.enrolledOf', { enrolled: selectedEvent.enrolled, capacity: selectedEvent.capacity })}</span>
                </div>
              )}
              {selectedEvent.feedbackSentAt && (
                <div className="schedule-sheet__row">
                  <MessageSquare size={16} />
                  <span>
                    {t('schedule.surveySentAt', {
                      when: new Date(selectedEvent.feedbackSentAt).toLocaleString(dateLocale, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      }),
                    })}
                  </span>
                </div>
              )}
              {arboxConnection.connected &&
                selectedEvent.source === 'arbox' &&
                !canAttachPlanToEvent(selectedEvent, arboxConnection) && (
                <p className="schedule-sheet__readonly">
                  {t('schedule.viewOnlyHint')}
                </p>
              )}
            </div>

            <ClassFeedbackAttendees
              key={selectedEvent.id}
              event={selectedEvent}
            />

            {editingEvent && canAttachPlanToEvent(selectedEvent, arboxConnection) && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 12 }}
                onClick={() => openAttachSheet(selectedEvent)}
              >
                <BookOpen size={16} />
                {selectedEvent.lessonPlanId ? t('schedule.changePlan') : t('schedule.attachPlan')}
              </button>
            )}

            {editingEvent && selectedEvent.lessonPlanId && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 8 }}
                onClick={() => detachLessonPlan(selectedEvent.id)}
              >
                <Unlink size={16} />
                {t('schedule.removePlan')}
              </button>
            )}

            {editingEvent && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 8 }}
                onClick={() => setEditingEvent(false)}
              >
                {t('schedule.doneEditing')}
              </button>
            )}

          </div>
        </ScheduleOverlay>
      )}
    </div>
  );
}
