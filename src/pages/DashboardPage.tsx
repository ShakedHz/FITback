import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Package,
  Users,
  Calendar,
  Link2,
  BarChart3,
  Library,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { avatarColorForName } from '@/components/InstructorAvatar';
import { resolveOverallAnalytics } from '@/data/lessonAnalytics';
import {
  toDateKey,
  getEventDateKey,
  getEventCategory,
  getEventColors,
  shouldShowEventType,
} from '@/data/scheduleTypes';
import { TRAINING_TYPE_COLORS, canChooseTrainingType } from '@/data/trainingTypes';
import { eventCategoryLabel, trainingLabel, useI18n } from '@/i18n';
import './Dashboard.css';

const QUICK_ACTIONS = [
  { path: '/schedule', icon: Calendar, labelKey: 'nav.schedule', color: '#a78bfa' },
  { path: '/analytics', icon: BarChart3, labelKey: 'nav.ratings', color: '#34d399' },
  { path: '/library', icon: Library, labelKey: 'nav.library', color: '#60a5fa' },
] as const;

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'dashboard.goodMorning';
  if (hour < 17) return 'dashboard.goodAfternoon';
  return 'dashboard.goodEvening';
}

function getEventTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTodayDate(dateLocale: string): string {
  const d = new Date();
  const weekday = d.toLocaleDateString(dateLocale, { weekday: 'short' });
  const date = d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });
  return `${weekday} · ${date}`;
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

  const tagline = useMemo(() => {
    if (todayEvents.length > 0) {
      const key = todayEvents.length === 1 ? 'dashboard.classesToday_one' : 'dashboard.classesToday_other';
      return t(key, { count: todayEvents.length });
    }
    if (instructor.lessonsCount > 0) {
      const key = instructor.lessonsCount === 1 ? 'dashboard.lessonsInLibrary_one' : 'dashboard.lessonsInLibrary_other';
      return t(key, { count: instructor.lessonsCount });
    }
    return t('dashboard.getStarted');
  }, [todayEvents.length, instructor.lessonsCount, t]);

  return (
    <div className="page fade-in dashboard">
      <section className="dashboard-hero">
        {instructor.avatar ? (
          <img className="dashboard-hero__bg" src={instructor.avatar} alt="" aria-hidden referrerPolicy="no-referrer" />
        ) : (
          <div
            className="dashboard-hero__bg dashboard-hero__bg--color"
            style={{
              background: `linear-gradient(145deg, ${avatarColorForName(instructor.name)} 0%, #1a0f2e 100%)`,
            }}
            aria-hidden
          />
        )}
        <div className="dashboard-hero__overlay" />
        <div className="dashboard-hero__content">
          <p className="dashboard-hero__greeting">{t(getGreetingKey())},</p>
          <h1 className="dashboard-hero__name">{instructor.name}</h1>
          <p className="dashboard-hero__tagline">{tagline}</p>
          {instructor.specialties.length > 0 && (
            <div className="dashboard-hero__specialties">
              {instructor.specialties.map((type) => {
                const colors = TRAINING_TYPE_COLORS[type];
                return (
                  <span
                    key={type}
                    className="dashboard-hero__chip"
                    style={{
                      background: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  >
                    {trainingLabel(type, t)}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-block">
        <div className="dashboard-stats">
          <div className="dashboard-stats__item">
            <Star size={14} color="#fbbf24" fill="#fbbf24" />
            <span className="dashboard-stats__value">
              {ratingsSummary && ratingsSummary.responseCount > 0
                ? ratingsSummary.avgRating
                : '—'}
            </span>
            <span className="dashboard-stats__label">{t('dashboard.rating')}</span>
          </div>
          <div className="dashboard-stats__item">
            <Package size={14} color="#a78bfa" />
            <span className="dashboard-stats__value">{instructor.lessonsCount}</span>
            <span className="dashboard-stats__label">{t('dashboard.lessons')}</span>
          </div>
          <div className="dashboard-stats__item">
            <Users size={14} color="#34d399" />
            <span className="dashboard-stats__value">{instructor.studentsCount}</span>
            <span className="dashboard-stats__label">{t('dashboard.clients')}</span>
          </div>
        </div>
      </section>

      <section className="dashboard-block">
        <div className="dashboard-today card">
          <div className="dashboard-today__header">
            <div className="dashboard-today__title-row">
              <Calendar size={15} color="#a78bfa" />
              <div className="dashboard-today__title-text">
                <span className="dashboard-today__label">{t('dashboard.todayOnSchedule')}</span>
                <span className="dashboard-today__date">{formatTodayDate(dateLocale)}</span>
              </div>
            </div>
            {arboxConnection.connected ? (
              <span className="dashboard-today__arbox dashboard-today__arbox--on">
                <Link2 size={11} /> Arbox
              </span>
            ) : (
              <button type="button" className="dashboard-today__arbox" onClick={() => navigate('/schedule')}>
                <Link2 size={11} /> {t('common.connect')}
              </button>
            )}
          </div>

          {todayEvents.length > 0 ? (
            <ul className="dashboard-today__list">
              {todayEvents.slice(0, 4).map((ev) => {
                const colors = getEventColors(ev);
                return (
                  <li key={ev.id}>
                    <button type="button" className="dashboard-today__event" onClick={() => navigate('/schedule')}>
                      <span className="dashboard-today__accent" style={{ background: colors.bg }} />
                      <span className="dashboard-today__time">{getEventTime(ev.start)}</span>
                      <div className="dashboard-today__event-body">
                        <span className="dashboard-today__event-title">{ev.title}</span>
                        <span className="dashboard-today__event-type">
                          {canChooseTrainingType(instructor.specialties) && shouldShowEventType(ev)
                            ? `${eventCategoryLabel(getEventCategory(ev), t)} · `
                            : ''}
                          {ev.enrolled != null ? t('dashboard.clientsOnEvent', { count: ev.enrolled }) : ''}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="dashboard-today__empty">
              <p>{t('dashboard.noClassesToday')}</p>
            </div>
          )}

          {todayEvents.length > 4 && (
            <button type="button" className="dashboard-today__more" onClick={() => navigate('/schedule')}>
              {t('common.more', { count: todayEvents.length - 4 })}
            </button>
          )}
        </div>
      </section>

      <section className="dashboard-block dashboard-block--last">
        <h2 className="dashboard-section-label">{t('dashboard.shortcuts')}</h2>
        <div className="dashboard-quick__grid">
          {QUICK_ACTIONS.map(({ path, icon: Icon, labelKey, color }) => (
            <button
              key={path}
              type="button"
              className="dashboard-action-card"
              onClick={() => navigate(path)}
            >
              <div className="dashboard-action-card__body">
                <Icon size={18} color={color} />
                <span className="dashboard-action-card__title">{t(labelKey)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
