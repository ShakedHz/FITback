import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquareText, Bot, ChevronRight, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  resolveOverallAnalytics,
  resolveLessonAnalytics,
  lessonHealthScore,
} from '@/data/lessonAnalytics';
import { LessonCover } from '@/components/LessonCover';
import { WeeklyBarChart, TRAINING_TYPE_BAR_COLORS } from '@/components/AnalyticsCharts';
import { MultiLineChart, type LineChartSeries } from '@/components/MultiLineChart';
import {
  TRAINING_TYPE_COLORS,
  type TrainingType,
} from '@/data/trainingTypes';
import { trainingLabel, useI18n } from '@/i18n';
import '@/components/Analytics.css';

function formatWhen(iso: string, t: (key: string, vars?: Record<string, string | number>) => string, dateLocale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) return t('analytics.today');
  if (days === 1) return t('analytics.yesterday');
  if (days < 7) return t('analytics.daysAgo', { count: days });
  return new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
}

export function AnalyticsHubPage() {
  const navigate = useNavigate();
  const { createdLessons, instructor, feedbackResponses } = useApp();
  const { t, dateLocale } = useI18n();

  const overall = useMemo(
    () => resolveOverallAnalytics(instructor.specialties[0] ?? 'pilates', feedbackResponses),
    [instructor.specialties, feedbackResponses]
  );

  const lessonsWithFeedback = useMemo(() => {
    return createdLessons
      .map((lesson) => {
        const analytics = resolveLessonAnalytics(lesson, feedbackResponses);
        return { lesson, analytics, score: lessonHealthScore(analytics) };
      })
      .filter((row) => row.analytics.responseCount > 0)
      .sort((a, b) => b.analytics.avgRating - a.analytics.avgRating);
  }, [createdLessons, feedbackResponses]);

  const hasResults = feedbackResponses.length > 0;
  const notes = feedbackResponses.filter((r) => r.improve?.trim());

  /**
   * Line chart: one line per training type (same color),
   * each point on the line is a lesson's average rating.
   */
  const { lessonTypeSeries, lessonCategoryOrder } = useMemo(() => {
    if (feedbackResponses.length === 0) {
      return { lessonTypeSeries: [] as LineChartSeries[], lessonCategoryOrder: [] as string[] };
    }

    const lessonById = new Map(createdLessons.map((l) => [l.id, l]));

    const resolveLesson = (r: (typeof feedbackResponses)[number]) => {
      if (r.lessonId) {
        const lesson = lessonById.get(r.lessonId);
        if (lesson) return lesson;
      }
      return createdLessons.find((l) => l.title === r.title) ?? null;
    };

    // Average rating per lesson
    const ratingsByLesson = new Map<
      string,
      { title: string; type: TrainingType; ratings: number[] }
    >();

    feedbackResponses.forEach((r) => {
      const lesson = resolveLesson(r);
      const lessonId = lesson?.id ?? `title:${r.title?.trim() || t('common.class')}`;
      const title = lesson?.title ?? r.title?.trim() ?? t('common.class');
      const type = lesson?.trainingType ?? instructor.specialties[0] ?? 'pilates';
      const bucket = ratingsByLesson.get(lessonId) ?? { title, type, ratings: [] };
      bucket.ratings.push(r.rating);
      ratingsByLesson.set(lessonId, bucket);
    });

    const lessons = [...ratingsByLesson.entries()]
      .map(([id, data]) => ({
        id,
        title: data.title,
        type: data.type,
        avg: Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10,
        count: data.ratings.length,
      }))
      // Group by type so each type's points sit together on the line
      .sort((a, b) => {
        const typeCmp = a.type.localeCompare(b.type);
        if (typeCmp !== 0) return typeCmp;
        return a.title.localeCompare(b.title);
      });

    const categoryOrder = lessons.map((l) => l.id);

    const types = [...new Set(lessons.map((l) => l.type))];

    const lessonTypeSeries: LineChartSeries[] = types.map((type) => ({
      id: type,
      label: trainingLabel(type, t),
      color: TRAINING_TYPE_BAR_COLORS[type],
      points: lessons
        .filter((l) => l.type === type)
        .map((l) => ({
          key: l.id,
          value: l.avg,
          pointLabel: l.title,
        })),
    }));

    return { lessonTypeSeries, lessonCategoryOrder: categoryOrder };
  }, [feedbackResponses, createdLessons, instructor.specialties, t]);

  return (
    <div className="page fade-in analytics-hub">
      <div className="page-header">
        <h1 className="page-title">{t('analytics.title')}</h1>
        <p className="page-subtitle">{t('analytics.subtitle')}</p>
      </div>

      {!hasResults ? (
        <div className="card" style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
          <p style={{ margin: 0, lineHeight: 1.45 }}>
            {t('analytics.empty')}
          </p>
        </div>
      ) : (
        <>
          <section className="card ratings-responses-dash">
            <div className="ratings-responses-dash__head">
              <div className="ratings-responses-dash__count">
                <Users size={20} color="#a78bfa" />
                <div>
                  <p className="ratings-responses-dash__value">{overall.responseCount}</p>
                  <p className="ratings-responses-dash__label">
                    {overall.responseCount === 1 ? t('analytics.personResponded') : t('analytics.peopleResponded')}
                  </p>
                </div>
              </div>
              <div className="ratings-responses-dash__side">
                <span>
                  <Star size={14} color="#fbbf24" fill="#fbbf24" /> {t('analytics.avg', { rating: overall.avgRating })}
                </span>
                <span>
                  <MessageSquareText size={14} color="#34d399" /> {t('analytics.notesCount', { count: notes.length })}
                </span>
              </div>
            </div>
            <WeeklyBarChart data={overall.weeklyResponses} />
          </section>

          {lessonTypeSeries.length > 0 && (
            <section className="card ratings-responses-dash">
              <div className="ratings-section-head" style={{ marginBottom: 12 }}>
                <Star size={18} color="#fbbf24" fill="#fbbf24" />
                <h2>{t('analytics.averageByLesson')}</h2>
              </div>
              <MultiLineChart
                series={lessonTypeSeries}
                categoryOrder={lessonCategoryOrder}
                yMin={0}
                yMax={5}
              />
            </section>
          )}

          <section className="card ratings-ai-card">
            <div className="ratings-section-head">
              <Bot size={18} color="#a78bfa" />
              <h2>{t('analytics.aiSummary')}</h2>
            </div>
            <p className="ratings-ai-card__summary">{overall.aiSummary}</p>
          </section>

          <p className="section-title">{t('analytics.clientFeedback')}</p>
          <div className="card ratings-feedback-list">
            {feedbackResponses.map((r) => (
              <div key={r.id} className="ratings-feedback-item">
                <div className="ratings-feedback-item__top">
                  <span className="ratings-feedback-item__stars">{r.rating}/5</span>
                  <span className="ratings-feedback-item__meta">
                    {r.title || t('common.class')} · {formatWhen(r.createdAt, t, dateLocale)}
                  </span>
                </div>
                {r.improve?.trim() ? (
                  <p className="ratings-feedback-item__note">{r.improve.trim()}</p>
                ) : (
                  <p className="ratings-feedback-item__note ratings-feedback-item__note--empty">
                    {t('analytics.noNote')}
                  </p>
                )}
              </div>
            ))}
          </div>

          {lessonsWithFeedback.length > 0 && (
            <>
              <p className="section-title">{t('analytics.byLesson')}</p>
              {lessonsWithFeedback.map(({ lesson, analytics }) => {
                const colors = TRAINING_TYPE_COLORS[lesson.trainingType];
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    className="card analytics-lesson-card ratings-lesson-card"
                    onClick={() => navigate(`/analytics/${lesson.id}`)}
                  >
                    <div className="analytics-lesson-row">
                      <LessonCover lesson={lesson} alt={lesson.title} size="sm" />
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
                        <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{lesson.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                          {t('analytics.lessonMeta', {
                            avg: analytics.avgRating,
                            count: analytics.responseCount,
                            s: analytics.responseCount === 1 ? '' : 's',
                            notes: analytics.comments.length > 0
                              ? t('analytics.notesPart', {
                                  count: analytics.comments.length,
                                  s: analytics.comments.length === 1 ? '' : 's',
                                })
                              : '',
                          })}
                        </p>
                        <span
                          className="analytics-lesson-card__type"
                          style={{
                            display: 'inline-block',
                            marginTop: 6,
                            background: colors.bg,
                            borderColor: colors.border,
                            color: colors.text,
                          }}
                        >
                          {trainingLabel(lesson.trainingType, t)}
                        </span>
                      </div>
                      <ChevronRight className="rtl-flip" size={18} color="#a78bfa" />
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
