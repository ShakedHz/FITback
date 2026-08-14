import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Link2,
  MapPin,
  User,
  Users,
  X,
  Plus,
  Clock,
  CalendarPlus,
  MessageSquare,
  BookOpen,
  Unlink,
  Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  buildClassSurveyUrl,
} from '@/services/classFeedback';
import { loadSurveyClients, type SurveyClient } from '@/services/surveyClients';
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
  EVENT_CATEGORY_LABELS,
  TIME_SLOTS,
  canAttachPlanToEvent,
  isOwnEvent,
  type ScheduleEvent,
} from '@/data/scheduleTypes';
import { TRAINING_TYPES, TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS, type TrainingType } from '@/data/trainingTypes';
import { EQUIPMENT_LABELS } from '@/data/equipmentTypes';
import '@/components/Schedule.css';

type ViewMode = 'day' | 'week';
type AddStep = 'type' | 'lesson';
type SheetMode = 'add' | 'attach';

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
  const navigate = useNavigate();
  const {
    weekStart,
    setWeekStart,
    scheduleEvents,
    arboxConnection,
    addLessonToSchedule,
    removeScheduleEvent,
    attachLessonPlan,
    detachLessonPlan,
    toggleEventAttendee,
    schedulableLessons,
    setLinkedInstructor,
  } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>('add');
  const [addStep, setAddStep] = useState<AddStep>('type');
  const [addTrainingType, setAddTrainingType] = useState<TrainingType | null>(null);
  const [addLessonId, setAddLessonId] = useState<string | null>(null);
  const [addTime, setAddTime] = useState('10:00');
  const [rosterClients, setRosterClients] = useState<SurveyClient[]>(() => loadSurveyClients());

  // Keep event sheet in sync when attendees / feedback status change
  useEffect(() => {
    if (!selectedEvent) return;
    const fresh = scheduleEvents.find((e) => e.id === selectedEvent.id);
    if (fresh) setSelectedEvent(fresh);
    else setSelectedEvent(null);
  }, [scheduleEvents, selectedEvent?.id]);

  // Refresh roster when opening a class (clients are managed on Survey)
  useEffect(() => {
    if (selectedEvent) setRosterClients(loadSurveyClients());
  }, [selectedEvent?.id]);

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
    if (!addTrainingType) return [];
    return schedulableLessons.filter((l) => l.trainingType === addTrainingType);
  }, [schedulableLessons, addTrainingType]);

  const openAddSheet = () => {
    setSheetMode('add');
    setAddStep('type');
    setAddTrainingType(null);
    setAddLessonId(null);
    setAddTime('10:00');
    setShowAddSheet(true);
    if (viewMode === 'week') setViewMode('day');
  };

  const openAttachSheet = (event: ScheduleEvent) => {
    if (!canAttachPlanToEvent(event, arboxConnection)) return;
    setSelectedEvent(event);
    setSheetMode('attach');
    setAddStep('type');
    setAddTrainingType(null);
    setAddLessonId(null);
    setShowAddSheet(true);
  };

  const closeAddSheet = () => {
    setShowAddSheet(false);
    setAddStep('type');
    setAddTrainingType(null);
    setAddLessonId(null);
    setSheetMode('add');
  };

  const selectTrainingType = (type: TrainingType) => {
    setAddTrainingType(type);
    const first = schedulableLessons.find((l) => l.trainingType === type);
    setAddLessonId(first?.id ?? null);
    setAddStep('lesson');
  };

  const backToTypeStep = () => {
    setAddStep('type');
    setAddLessonId(null);
  };

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

    addLessonToSchedule(addLessonId, selectedKey, addTime);
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
            {shouldShowEventType(ev) && (
              <span className="schedule-card__type">{EVENT_CATEGORY_LABELS[getEventCategory(ev)]}</span>
            )}
            {ev.location && <span>· {ev.location}</span>}
            {ev.instructor && <span>· {ev.instructor}</span>}
            {own && <span className="schedule-card__tag schedule-card__tag--own">You</span>}
            {otherInstructor && <span className="schedule-card__tag schedule-card__tag--other">View only</span>}
            {ev.source === 'flowpilates' && <span className="schedule-card__tag">Movana</span>}
            {ev.feedbackSentAt && <span className="schedule-card__tag schedule-card__tag--sent">Survey sent</span>}
          </div>
          {showPlanStatus && (
            <div
              className={`schedule-card__plan ${hasPlan ? 'schedule-card__plan--yes' : 'schedule-card__plan--no'}`}
            >
              <BookOpen size={13} strokeWidth={2} aria-hidden />
              <span className="schedule-card__plan-label">
                {hasPlan ? ev.lessonPlanTitle : 'No lesson plan'}
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
          <h1 className="page-title">Schedule</h1>
          <button type="button" className="schedule-today" onClick={goToday}>Today</button>
        </div>

        {needsInstructorPick && (
          <div className="schedule-identity-pick">
            <p className="schedule-identity-pick__label">Which instructor are you?</p>
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
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
            <ChevronLeft size={20} />
          </button>
          <span>{formatWeekRange(weekStart)}</span>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="schedule-tabs">
          <button type="button" className={viewMode === 'day' ? 'active' : ''} onClick={() => setViewMode('day')}>
            Day
          </button>
          <button type="button" className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>
            Week
          </button>
        </div>

        <div className="schedule-days">
          {days.map((day) => {
            const key = toDateKey(day);
            const strip = formatDayStrip(day);
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
            <h2 className="schedule-agenda__title">{formatFullDayLabel(selectedDay)}</h2>
            {dayEvents.length > 0 ? (
              <div className="schedule-agenda__list">
                {dayEvents.map((ev) => renderEventCard(ev, () => setSelectedEvent(ev)))}
              </div>
            ) : arboxConnection.connected ? (
              <div className="schedule-empty">
                <CalendarPlus size={36} strokeWidth={1.5} />
                <p>No Arbox classes on this day</p>
                {arboxConnection.scheduleDebug && (
                  <p className="schedule-empty__hint">
                    Arbox returned {arboxConnection.scheduleDebug.rowCount} classes for{' '}
                    {arboxConnection.scheduleDebug.from} – {arboxConnection.scheduleDebug.to}.
                    {arboxConnection.scheduleDebug.rowCount === 0
                      ? ' Check that classes exist in Arbox for this period.'
                      : ' Try another day or week — classes may be on a different date.'}
                  </p>
                )}
                <p className="schedule-empty__hint">
                  Navigate weeks with the arrows to find other classes.
                </p>
              </div>
            ) : (
              <div className="schedule-empty">
                <CalendarPlus size={36} strokeWidth={1.5} />
                <p>No classes on this day</p>
                <button type="button" className="btn btn-secondary schedule-empty__btn" onClick={openAddSheet}>
                  Add class
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
                    {formatFullDayLabel(day)}
                    {isToday && <span className="schedule-week__today">Today</span>}
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
                <p>No classes this week</p>
              </div>
            )}
          </section>
        )}
      </main>

      <button type="button" className="schedule-fab" onClick={openAddSheet} aria-label="Add class to schedule">
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
                    ? 'Attach lesson plan'
                    : addStep === 'type'
                      ? 'Add class'
                      : 'Select lesson'}
                </h2>
                <button type="button" className="schedule-sheet__close" onClick={closeAddSheet} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <p className="schedule-sheet__date">
                {sheetMode === 'attach' && selectedEvent
                  ? `${selectedEvent.title} · ${getEventTime(selectedEvent)}`
                  : formatFullDayLabel(selectedDay)}
              </p>
              {sheetMode === 'attach' && (
                <p className="schedule-sheet__hint schedule-sheet__hint--inline">
                  You can only attach plans to your own schedule slots
                </p>
              )}
              {addStep === 'lesson' && addTrainingType && (
                <button type="button" className="schedule-sheet__back-type" onClick={backToTypeStep}>
                  ← {TRAINING_TYPE_LABELS[addTrainingType]}
                </button>
              )}
            </div>

            <div className="schedule-sheet__body">
              {addStep === 'type' && (
                <>
                  <p className="schedule-sheet__label">Training type</p>
                  <div className="schedule-type-grid">
                    {availableTypes.map((type) => {
                      const colors = TRAINING_TYPE_COLORS[type];
                      const count = schedulableLessons.filter((l) => l.trainingType === type).length;
                      return (
                        <button
                          key={type}
                          type="button"
                          className="schedule-type-pick"
                          style={{
                            background: colors.bg,
                            borderColor: colors.border,
                            color: colors.text,
                          }}
                          onClick={() => selectTrainingType(type)}
                        >
                          <span className="schedule-type-pick__label">{TRAINING_TYPE_LABELS[type]}</span>
                          <span className="schedule-type-pick__count">{count} lessons</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {addStep === 'lesson' && addTrainingType && (
                <>
                  <p className="schedule-sheet__label">Lesson plan</p>
                  <div className="schedule-sheet__lessons">
                    {lessonsForType.map((lesson) => (
                      <button
                        key={lesson.id}
                        type="button"
                        className={`schedule-pick ${addLessonId === lesson.id ? 'schedule-pick--on' : ''}`}
                        onClick={() => setAddLessonId(lesson.id)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/lesson-id', lesson.id);
                        }}
                      >
                        <span className="schedule-pick__title">{lesson.title}</span>
                        <span className="schedule-pick__meta">
                          {EQUIPMENT_LABELS[lesson.equipment]} · {lesson.duration} min
                        </span>
                      </button>
                    ))}
                  </div>

                  {sheetMode === 'add' && (
                    <>
                      <p className="schedule-sheet__label">Time</p>
                      <div className="schedule-sheet__times">
                        {TIME_SLOTS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`schedule-time ${addTime === t ? 'schedule-time--on' : ''}`}
                            onClick={() => setAddTime(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {addStep === 'lesson' && (
              <div className="schedule-sheet__footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!addLessonId}
                  onClick={confirmAdd}
                >
                  {sheetMode === 'attach'
                    ? 'Attach plan to slot'
                    : `Add to schedule · ${addTime}`}
                </button>
              </div>
            )}
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
            <button type="button" className="schedule-sheet__close" onClick={() => setSelectedEvent(null)}>
              <X size={20} />
            </button>
            <h2 className="schedule-sheet__title">{selectedEvent.title}</h2>
            <p className="schedule-sheet__sub">
              <Clock size={14} />
              {getEventTime(selectedEvent)} · {selectedEvent.duration} min
            </p>
            <div className="schedule-sheet__details">
              {shouldShowEventType(selectedEvent) && (
                <div className="schedule-sheet__row">
                  <span
                    className="schedule-sheet__category"
                    style={{ backgroundColor: getEventColors(selectedEvent).bg }}
                  >
                    {EVENT_CATEGORY_LABELS[getEventCategory(selectedEvent)]}
                  </span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="schedule-sheet__row"><MapPin size={16} /><span>{selectedEvent.location}</span></div>
              )}
              {selectedEvent.instructor && (
                <div className="schedule-sheet__row"><User size={16} /><span>{selectedEvent.instructor}</span></div>
              )}
              {selectedEvent.enrolled != null && selectedEvent.capacity != null && (
                <div className="schedule-sheet__row">
                  <Users size={16} />
                  <span>{selectedEvent.enrolled} enrolled of {selectedEvent.capacity}</span>
                </div>
              )}
              <div className="schedule-sheet__row">
                <Link2 size={16} />
                <span>{selectedEvent.source === 'arbox' ? 'Arbox' : 'Movana'}</span>
              </div>
              {selectedEvent.lessonPlanTitle ? (
                <div className="schedule-sheet__row schedule-sheet__row--plan">
                  <BookOpen size={16} />
                  <span>{selectedEvent.lessonPlanTitle}</span>
                </div>
              ) : canAttachPlanToEvent(selectedEvent, arboxConnection) ? (
                <div className="schedule-sheet__row schedule-sheet__row--plan schedule-sheet__row--plan-missing">
                  <BookOpen size={16} />
                  <span>No lesson plan attached</span>
                </div>
              ) : null}
              {selectedEvent.feedbackSentAt && (
                <div className="schedule-sheet__row">
                  <MessageSquare size={16} />
                  <span>
                    Survey sent {new Date(selectedEvent.feedbackSentAt).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              {arboxConnection.connected &&
                selectedEvent.source === 'arbox' &&
                !canAttachPlanToEvent(selectedEvent, arboxConnection) && (
                <p className="schedule-sheet__readonly">
                  View only — you can attach plans only to your own slots
                </p>
              )}
            </div>

            <div className="schedule-attendees">
              <p className="schedule-sheet__label">Participants</p>

              {selectedEvent.source === 'arbox' ? (
                <>
                  <p className="schedule-attendees__hint">
                    Enrolled clients from Arbox for this class.
                  </p>
                  {(selectedEvent.attendees ?? []).length > 0 ? (
                    <ul className="schedule-attendees__roster">
                      {(selectedEvent.attendees ?? []).map((attendee) => (
                        <li key={attendee.id} className="schedule-attendees__roster-item">
                          <span className="schedule-attendees__name">{attendee.name}</span>
                          {attendee.phone && (
                            <span className="schedule-attendees__phone">{attendee.phone}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="schedule-attendees__empty">No enrolled clients for this slot</p>
                  )}
                  {selectedEvent.feedbackSentAt && (
                    <p className="schedule-attendees__selected">Feedback survey already sent</p>
                  )}
                </>
              ) : (
                <>
                  <p className="schedule-attendees__hint">
                    Select who attended this class.
                  </p>

                  {rosterClients.length === 0 ? (
                    <div className="schedule-attendees__empty-block">
                      <p className="schedule-attendees__empty">No clients yet</p>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedEvent(null);
                          navigate('/survey');
                        }}
                      >
                        <Plus size={14} /> Add clients in Clients
                      </button>
                    </div>
                  ) : (
                    <ul className="schedule-attendees__pick">
                      {rosterClients.map((client) => {
                        const on = isClientOnEvent(selectedEvent, client);
                        return (
                          <li key={client.id}>
                            <button
                              type="button"
                              className={`schedule-attendees__pick-btn${on ? ' schedule-attendees__pick-btn--on' : ''}`}
                              onClick={() => toggleEventAttendee(selectedEvent.id, client)}
                            >
                              <span className="schedule-attendees__pick-check" aria-hidden>
                                {on ? <Check size={14} /> : null}
                              </span>
                              <span className="schedule-attendees__pick-body">
                                <span className="schedule-attendees__name">{client.name}</span>
                                <span className="schedule-attendees__phone">{client.phone}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {(selectedEvent.attendees ?? []).length > 0 && (
                    <p className="schedule-attendees__selected">
                      {(selectedEvent.attendees ?? []).length} selected for this class
                    </p>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 10 }}
                    onClick={() => {
                      const url = new URL(buildClassSurveyUrl(selectedEvent));
                      setSelectedEvent(null);
                      navigate(`${url.pathname}${url.search}`);
                    }}
                  >
                    <MessageSquare size={14} /> Preview feedback form
                  </button>
                </>
              )}
            </div>

            {canAttachPlanToEvent(selectedEvent, arboxConnection) && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => openAttachSheet(selectedEvent)}
              >
                <BookOpen size={16} />
                {selectedEvent.lessonPlanId ? 'Change lesson plan' : 'Attach lesson plan'}
              </button>
            )}

            {selectedEvent.lessonPlanId && canAttachPlanToEvent(selectedEvent, arboxConnection) && (
              <button
                type="button"
                className="schedule-sheet__detach"
                onClick={() => {
                  detachLessonPlan(selectedEvent.id);
                  setSelectedEvent({
                    ...selectedEvent,
                    lessonPlanId: undefined,
                    lessonPlanTitle: undefined,
                  });
                }}
              >
                <Unlink size={16} /> Remove plan
              </button>
            )}

            {selectedEvent.source === 'flowpilates' && (
              <button
                type="button"
                className="schedule-sheet__delete"
                onClick={() => { removeScheduleEvent(selectedEvent.id); setSelectedEvent(null); }}
              >
                Remove from schedule
              </button>
            )}
          </div>
        </ScheduleOverlay>
      )}
    </div>
  );
}
