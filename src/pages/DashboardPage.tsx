import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, BarChart3, Library, PlusCircle, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { InstructorAvatar } from '@/components/InstructorAvatar';
import { resolveOverallAnalytics } from '@/data/lessonAnalytics';
import {
  toDateKey,
  getEventDateKey,
  getEventCategory,
  shouldShowEventType,
} from '@/data/scheduleTypes';
import { eventCategoryLabel, trainingLabel, useI18n } from '@/i18n';
import './Dashboard.css';

const QUICK_ACTIONS = [
  { path: '/schedule', icon: Calendar, labelKey: 'nav.schedule' },
  { path: '/analytics', icon: BarChart3, labelKey: 'nav.ratings' },
  { path: '/library', icon: Library, labelKey: 'nav.library' },
  { path: '/create', icon: PlusCircle, labelKey: 'dashboard.newLesson' },
] as const;

function getEventTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTodayDate(dateLocale: string): string {
  return new Date().toLocaleDateString(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export function DashboardPage() {
  const { instructor, scheduleEvents, arboxConnection, feedbackResponses } = useApp();
  const navigate = useNavigate();
  const { t, dateLocale } = useI18n();

  const todayKey = toDateKey(new Date());
  const todayEvents = useMemo(
    () => scheduleEvents.filter((e) => getEventDateKey(e) === todayKey),
    [scheduleEvents, todayKey]
  );

  const ratingsSummary = useMemo(() => {
    if (feedbackResponses.length === 0) return null;
    return resolveOverallAnalytics(instructor.specialties[0] ?? 'pilates', feedbackResponses);
  }, [instructor.specialties, feedbackResponses]);

  const nextEventId = useMemo(() => {
    const now = Date.now();
    const upcoming = todayEvents.find((e) => new Date(e.start).getTime() >= now);
    return (upcoming ?? todayEvents[0])?.id;
  }, [todayEvents]);

  const specialtyLine = instructor.specialties.map((type) => trainingLabel(type, t)).join(' · ');
  const ratingValue =
    ratingsSummary && ratingsSummary.responseCount > 0 ? ratingsSummary.avgRating : null;

  return (
    <div className="page fade-in dashboard">
      <header className="dashboard-head">
        <InstructorAvatar src={instructor.avatar} name={instructor.name} size="md" />
        <div className="dashboard-head__text">
          <p className="dashboard-head__date">{formatTodayDate(dateLocale)}</p>
          <h1 className="dashboard-head__name">{instructor.name}</h1>
          {specialtyLine ? <p className="dashboard-head__types">{specialtyLine}</p> : null}
        </div>
      </header>

      <p className="dashboard-meta">
        <span>
          {ratingValue ?? '—'} {t('dashboard.rating')}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {instructor.lessonsCount} {t('dashboard.lessons')}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {instructor.studentsCount} {t('dashboard.clients')}
        </span>
      </p>

      <section className="dashboard-today">
        <div className="dashboard-today__header">
          <h2 className="dashboard-today__label">{t('dashboard.todayOnSchedule')}</h2>
          {arboxConnection.connected ? (
            <span className="dashboard-today__arbox dashboard-today__arbox--on">Arbox</span>
          ) : (
            <button type="button" className="dashboard-today__arbox" onClick={() => navigate('/schedule')}>
              {t('common.connect')}
            </button>
          )}
        </div>

        {todayEvents.length > 0 ? (
          <ul className="dashboard-today__list">
            {todayEvents.slice(0, 4).map((ev) => {
              const isNext = ev.id === nextEventId;
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    className={`dashboard-today__event${isNext ? ' dashboard-today__event--next' : ''}`}
                    onClick={() => navigate('/schedule')}
                  >
                    <span className="dashboard-today__time">
                      {getEventTime(ev.start)}
                      {isNext ? <em>{t('dashboard.next')}</em> : null}
                    </span>
                    <span className="dashboard-today__event-body">
                      <span className="dashboard-today__event-title">{ev.title}</span>
                      <span className="dashboard-today__event-type">
                        {shouldShowEventType(ev) ? `${eventCategoryLabel(getEventCategory(ev), t)} · ` : ''}
                        {ev.enrolled != null ? t('dashboard.clientsOnEvent', { count: ev.enrolled }) : ''}
                      </span>
                    </span>
                    <ChevronRight className="rtl-flip dashboard-today__chevron" size={16} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="dashboard-today__empty">
            <p>{t('dashboard.noClassesToday')}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/schedule')}>
              {t('schedule.addClass')}
            </button>
          </div>
        )}

        {todayEvents.length > 4 && (
          <button type="button" className="dashboard-today__more" onClick={() => navigate('/schedule')}>
            {t('common.more', { count: todayEvents.length - 4 })}
          </button>
        )}
      </section>

      <section className="dashboard-block dashboard-block--last">
        <h2 className="dashboard-section-label">{t('dashboard.shortcuts')}</h2>
        <div className="dashboard-quick__grid">
          {QUICK_ACTIONS.map(({ path, icon: Icon, labelKey }) => (
            <button
              key={path}
              type="button"
              className="dashboard-action"
              onClick={() => navigate(path)}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
