import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageSquare,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { IconButton, IconToolbar } from '@/components/IconToolbar';
import { useApp } from '@/context/AppContext';
import {
  addDays,
  formatFullDayLabel,
  formatWeekRange,
  getEventColors,
  getEventDateKey,
  getEventTime,
  normalizeInstructorKey,
  startOfDay,
  teamFromScheduleEvents,
  toDateKey,
  type ArboxStaffMember,
  type ScheduleEvent,
} from '@/data/scheduleTypes';
import { useI18n } from '@/i18n';
import '@/components/Schedule.css';
import './ManagerOverview.css';

const UNASSIGNED_KEY = '__unassigned__';

function eventMatchesInstructor(event: ScheduleEvent, member: ArboxStaffMember): boolean {
  const eventKeys = [event.instructorId, event.instructor]
    .filter((v): v is string => Boolean(v))
    .map(normalizeInstructorKey);
  const memberKeys = [member.id, member.name].map(normalizeInstructorKey);
  return eventKeys.some((key) => memberKeys.includes(key));
}

function groupEventsByInstructor(
  events: ScheduleEvent[],
  roster: ArboxStaffMember[]
): { member: ArboxStaffMember; events: ScheduleEvent[] }[] {
  const instructors =
    roster.length > 0
      ? roster.filter((m) => m.role === 'instructor')
      : teamFromScheduleEvents(events);

  const buckets = new Map<string, { member: ArboxStaffMember; events: ScheduleEvent[] }>();
  for (const member of instructors) {
    buckets.set(member.id, { member, events: [] });
  }

  const unassigned: ScheduleEvent[] = [];
  for (const event of events) {
    const match = instructors.find((member) => eventMatchesInstructor(event, member));
    if (match) {
      buckets.get(match.id)?.events.push(event);
    } else if (event.instructor || event.instructorId) {
      unassigned.push(event);
    } else {
      unassigned.push(event);
    }
  }

  const groups = [...buckets.values()]
    .map((group) => ({
      ...group,
      events: group.events.sort((a, b) => a.start.localeCompare(b.start)),
    }))
    .filter((group) => group.events.length > 0)
    .sort((a, b) => a.member.name.localeCompare(b.member.name));

  if (unassigned.length > 0) {
    groups.push({
      member: { id: UNASSIGNED_KEY, name: '', role: 'instructor' },
      events: unassigned.sort((a, b) => a.start.localeCompare(b.start)),
    });
  }

  return groups;
}

function eventsByDay(events: ScheduleEvent[]): Map<string, ScheduleEvent[]> {
  const map = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    const key = getEventDateKey(event);
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  return map;
}

export function ManagerOverviewPage() {
  const { user, isActiveStudioManager, activeMembership } = useAuth();
  const { scheduleEvents, weekStart, setWeekStart, arboxConnection } = useApp();
  const { t, dateLocale, locale } = useI18n();
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  const memberships = user?.memberships ?? [];
  const active = activeMembership ?? memberships[0];
  const isManager = isActiveStudioManager;
  const clubName = active?.clubName || arboxConnection.clubName;

  useEffect(() => {
    const today = startOfDay(new Date());
    setWeekStart(startOfDay(addDays(today, -today.getDay())));
  }, [setWeekStart]);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const weekEvents = useMemo(
    () =>
      scheduleEvents
        .filter((event) => {
          const start = new Date(event.start);
          return start >= weekStart && start < weekEnd;
        })
        .sort((a, b) => a.start.localeCompare(b.start)),
    [scheduleEvents, weekStart, weekEnd]
  );

  const instructorGroups = useMemo(
    () => groupEventsByInstructor(weekEvents, arboxConnection.team),
    [weekEvents, arboxConnection.team]
  );

  const weekStats = useMemo(() => {
    const withPlan = weekEvents.filter((event) => Boolean(event.lessonPlanTitle)).length;
    const feedbackSent = weekEvents.filter((event) => Boolean(event.feedbackSentAt)).length;
    return { total: weekEvents.length, withPlan, feedbackSent };
  }, [weekEvents]);

  const goToday = () => {
    const today = startOfDay(new Date());
    setWeekStart(startOfDay(addDays(today, -today.getDay())));
  };

  if (!isManager) {
    return (
      <div className="page fade-in manager-overview">
        <div className="page-header">
          <h1 className="page-title">{t('managerOverview.title')}</h1>
        </div>
        <p className="manager-overview__hint">{t('managerOverview.instructorOnly')}</p>
        {memberships.length > 1 && (
          <p className="manager-overview__hint">{t('studio.multiRoleHint')}</p>
        )}
        <Link to="/studio" className="btn btn-secondary">
          {t('studio.title')}
        </Link>
      </div>
    );
  }

  return (
    <div className="page fade-in manager-overview">
      <header className="manager-overview__header">
        <div className="manager-overview__title-row">
          <h1 className="page-title">{t('managerOverview.title')}</h1>
          <button type="button" className="schedule-today" onClick={goToday}>
            {t('common.today')}
          </button>
        </div>
        <p className="page-subtitle">{clubName || t('studio.noStudio')}</p>
        <p className="manager-overview__hint">{t('managerOverview.subtitle')}</p>
      </header>

      {memberships.length > 1 && (
        <Link to="/settings" className="studio-switch-view-link">
          <Settings size={16} aria-hidden />
          {t('profile.switchViewInSettings')}
          <ChevronRight className="rtl-flip" size={16} aria-hidden />
        </Link>
      )}

      <div className="manager-overview__stats card">
        <div className="manager-overview__stat">
          <span className="manager-overview__stat-value">{weekStats.total}</span>
          <span className="manager-overview__stat-label">{t('managerOverview.classes')}</span>
        </div>
        <div className="manager-overview__stat">
          <span className="manager-overview__stat-value">{weekStats.withPlan}</span>
          <span className="manager-overview__stat-label">{t('managerOverview.withPlan')}</span>
        </div>
        <div className="manager-overview__stat">
          <span className="manager-overview__stat-value">{weekStats.feedbackSent}</span>
          <span className="manager-overview__stat-label">{t('managerOverview.feedbackSent')}</span>
        </div>
      </div>

      <div className="schedule-nav manager-overview__nav">
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          aria-label={t('schedule.previousWeek')}
        >
          {locale === 'he' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <span>{formatWeekRange(weekStart, dateLocale)}</span>
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          aria-label={t('schedule.nextWeek')}
        >
          {locale === 'he' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {instructorGroups.length === 0 ? (
        <div className="manager-overview__empty card">
          <CalendarDays size={36} strokeWidth={1.5} />
          <p>{t('managerOverview.emptyWeek')}</p>
          {!arboxConnection.connected && (
            <p className="manager-overview__hint">{t('managerOverview.connectArbox')}</p>
          )}
        </div>
      ) : (
        instructorGroups.map((group) => {
          const dayMap = eventsByDay(group.events);
          const planCount = group.events.filter((event) => Boolean(event.lessonPlanTitle)).length;
          const displayName =
            group.member.id === UNASSIGNED_KEY
              ? t('managerOverview.unassigned')
              : group.member.name;

          return (
            <section key={group.member.id} className="manager-overview__section card">
              <div className="manager-overview__section-head">
                <div className="manager-overview__section-icon" aria-hidden>
                  <User size={18} />
                </div>
                <div>
                  <h2 className="manager-overview__section-title">{displayName}</h2>
                  <p className="manager-overview__section-meta">
                    {t('managerOverview.sectionMeta', {
                      classes: group.events.length,
                      plans: planCount,
                    })}
                  </p>
                </div>
              </div>

              {[...dayMap.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, dayEvents]) => (
                  <div key={dateKey} className="manager-overview__day">
                    <h3 className="manager-overview__day-label">
                      {formatFullDayLabel(new Date(`${dateKey}T12:00:00`), dateLocale)}
                      {dateKey === toDateKey(new Date()) && (
                        <span className="manager-overview__today">{t('common.today')}</span>
                      )}
                    </h3>
                    <div className="schedule-agenda__list">
                      {dayEvents.map((event) => {
                        const colors = getEventColors(event);
                        const hasPlan = Boolean(event.lessonPlanTitle);
                        const isFull =
                          event.enrolled != null &&
                          event.capacity != null &&
                          event.enrolled >= event.capacity;

                        return (
                          <button
                            key={event.id}
                            type="button"
                            className={`schedule-card schedule-card--other ${hasPlan ? 'schedule-card--has-plan' : 'schedule-card--no-plan'}`}
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div
                              className="schedule-card__bar"
                              style={{ backgroundColor: colors.bg }}
                            />
                            <div className="schedule-card__body">
                              <div className="schedule-card__row">
                                <span className="schedule-card__time">{getEventTime(event)}</span>
                                <span className="schedule-card__title">{event.title}</span>
                              </div>
                              <div className="schedule-card__meta">
                                {event.location && <span>{event.location}</span>}
                                {event.feedbackSentAt && (
                                  <span className="schedule-card__tag schedule-card__tag--sent">
                                    {t('schedule.surveySent')}
                                  </span>
                                )}
                              </div>
                              <div
                                className={`schedule-card__plan ${hasPlan ? 'schedule-card__plan--yes' : 'schedule-card__plan--no'}`}
                              >
                                <BookOpen size={13} strokeWidth={2} aria-hidden />
                                <span className="schedule-card__plan-label">
                                  {hasPlan ? event.lessonPlanTitle : t('schedule.noPlan')}
                                </span>
                              </div>
                            </div>
                            {event.enrolled != null && event.capacity != null && (
                              <span
                                className={`schedule-card__count ${isFull ? 'schedule-card__count--full' : ''}`}
                              >
                                {event.enrolled}/{event.capacity}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </section>
          );
        })
      )}

      {selectedEvent && (
        <div
          className="manager-overview__sheet-backdrop"
          onClick={() => setSelectedEvent(null)}
          role="presentation"
        >
          <div className="manager-overview__sheet card" onClick={(e) => e.stopPropagation()}>
            <div
              className="manager-overview__sheet-accent"
              style={{ backgroundColor: getEventColors(selectedEvent).bg }}
            />
            <IconToolbar className="manager-overview__sheet-toolbar">
              <IconButton
                onClick={() => setSelectedEvent(null)}
                aria-label={t('common.close')}
              >
                <X size={20} />
              </IconButton>
            </IconToolbar>
            <h2 className="manager-overview__sheet-title">{selectedEvent.title}</h2>
            <p className="manager-overview__sheet-sub">
              <Clock size={14} />
              {getEventTime(selectedEvent)} · {selectedEvent.duration} {t('common.min')}
            </p>
            <div className="manager-overview__sheet-details">
              {(selectedEvent.instructor || selectedEvent.instructorId) && (
                <div className="manager-overview__sheet-row">
                  <User size={16} />
                  <span>{selectedEvent.instructor ?? selectedEvent.instructorId}</span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="manager-overview__sheet-row">
                  <MapPin size={16} />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.enrolled != null && selectedEvent.capacity != null && (
                <div className="manager-overview__sheet-row">
                  <Users size={16} />
                  <span>
                    {t('schedule.enrolledOf', {
                      enrolled: selectedEvent.enrolled,
                      capacity: selectedEvent.capacity,
                    })}
                  </span>
                </div>
              )}
              <div className="manager-overview__sheet-row">
                <BookOpen size={16} />
                <span>
                  {selectedEvent.lessonPlanTitle ?? t('schedule.noPlan')}
                </span>
              </div>
              {selectedEvent.feedbackSentAt && (
                <div className="manager-overview__sheet-row">
                  <MessageSquare size={16} />
                  <span>
                    {t('schedule.surveySentAt', {
                      when: new Date(selectedEvent.feedbackSentAt).toLocaleString(dateLocale, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    })}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn-secondary manager-overview__sheet-close"
              onClick={() => setSelectedEvent(null)}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
