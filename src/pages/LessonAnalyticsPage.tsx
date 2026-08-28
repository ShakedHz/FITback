import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Star, MessageSquareText, Lightbulb, Pencil, Bot, AlertTriangle, Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  resolveLessonAnalyticsForPeriod,
  lessonHealthScore,
  primaryAction,
  type AnalyticsPeriod,
} from '@/data/lessonAnalytics';
import { BackButton, IconButton, IconToolbar } from '@/components/IconToolbar';
import { LessonCover } from '@/components/LessonCover';
import { lessonHasMedia } from '@/utils/lessonCover';
import { WeeklyBarChart } from '@/components/AnalyticsCharts';
import { canChooseTrainingType } from '@/data/trainingTypes';
import { trainingLabel, useI18n } from '@/i18n';
import '@/components/Analytics.css';

function RatingBars({
  distribution,
}: {
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}) {
  const max = Math.max(distribution[1], distribution[2], distribution[3], distribution[4], distribution[5], 1);
  return (
    <div className="rating-bars">
      {([5, 4, 3, 2, 1] as const).map((star) => (
        <div key={star} className="rating-bars__row">
          <span className="rating-bars__label">{star}</span>
          <div className="rating-bars__track">
            <div
              className="rating-bars__fill"
              style={{ width: `${(distribution[star] / max) * 100}%` }}
            />
          </div>
          <span className="rating-bars__count">{distribution[star]}</span>
        </div>
      ))}
    </div>
  );
}

export function LessonAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLessonById, feedbackResponses, instructor } = useApp();
  const { t } = useI18n();
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const lesson = id ? getLessonById(id) : undefined;

  const analytics = useMemo(() => {
    if (!lesson) return null;
    return resolveLessonAnalyticsForPeriod(lesson, period, feedbackResponses);
  }, [lesson, period, feedbackResponses]);

  if (!lesson || !analytics) {
    return (
      <div className="page fade-in">
        <BackButton to="/analytics" label={t('common.back')} />
        <div className="card" style={{ textAlign: 'center', padding: 32, marginTop: 20 }}>
          <p style={{ color: 'var(--color-text-muted)' }}>{t('analytics.lessonNotFound')}</p>
        </div>
      </div>
    );
  }

  const score = lessonHealthScore(analytics);
  const action = primaryAction(analytics);
  const scoreColor = score >= 80 ? '#34d399' : score >= 65 ? 'var(--color-accent)' : '#f87171';

  return (
    <div className="page fade-in">
      <div className="page-toolbar">
        <BackButton to="/analytics" label={t('analytics.backToRatings')} />
        <IconToolbar>
          <IconButton
            onClick={() => navigate(`/builder?lessonId=${lesson.id}`)}
            aria-label={t('analytics.editPlan')}
          >
            <Pencil size={18} />
          </IconButton>
        </IconToolbar>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
        {lessonHasMedia(lesson) && <LessonCover lesson={lesson} alt={lesson.title} size="md" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title" style={{ fontSize: 20 }}>{lesson.title}</h1>
          <p className="page-subtitle">
            {t(
              canChooseTrainingType(instructor.specialties)
                ? 'analytics.lessonMetaLine'
                : 'analytics.lessonMetaLineSolo',
              {
                duration: lesson.duration,
                type: trainingLabel(lesson.trainingType, t),
                count: analytics.responseCount,
              }
            )}
          </p>
        </div>
        <div className="ratings-score-ring ratings-score-ring--lg" style={{ borderColor: scoreColor, color: scoreColor }}>
          {score}
        </div>
      </div>

      <div className="analytics-period">
        {(['7d', '30d'] as AnalyticsPeriod[]).map((p) => (
          <button
            key={p}
            type="button"
            className={period === p ? 'active' : ''}
            onClick={() => setPeriod(p)}
          >
            {p === '7d' ? t('analytics.last7') : t('analytics.last30')}
          </button>
        ))}
      </div>

      <div className="card ratings-ai-card">
        <div className="ratings-section-head">
          <Bot size={18} color="var(--color-primary-bright)" />
          <h2>{t('analytics.aiAnalysis')}</h2>
        </div>
        <p className="ratings-ai-card__summary">{analytics.aiSummary}</p>
      </div>

      <div className={`card ratings-focus-card ratings-focus-card--${action.tone}`}>
        <div className="ratings-section-head">
          <Lightbulb size={18} />
          <h2>{t('analytics.recommended')}</h2>
        </div>
        <p>{action.text}</p>
      </div>

      <div className="ratings-kpi-strip" style={{ marginBottom: 16 }}>
        <div className="ratings-kpi">
          <Star size={16} color="var(--color-accent)" fill="var(--color-accent)" />
          <div>
            <p className="ratings-kpi__value">{analytics.avgRating}</p>
            <p className="ratings-kpi__label">{t('analytics.average')}</p>
          </div>
        </div>
        <div className="ratings-kpi">
          <Sparkles size={16} color="#34d399" />
          <div>
            <p className="ratings-kpi__value">{analytics.highRatingRate}%</p>
            <p className="ratings-kpi__label">{t('analytics.highStars')}</p>
          </div>
        </div>
        <div className="ratings-kpi">
          <AlertTriangle size={16} color={analytics.lowRatingRate > 12 ? '#f87171' : 'var(--color-text-muted)'} />
          <div>
            <p className="ratings-kpi__value">{analytics.lowRatingRate}%</p>
            <p className="ratings-kpi__label">{t('analytics.lowStars')}</p>
          </div>
        </div>
        <div className="ratings-kpi">
          <MessageSquareText size={16} color="var(--color-primary-bright)" />
          <div>
            <p className="ratings-kpi__value">{analytics.comments.length}</p>
            <p className="ratings-kpi__label">{t('analytics.notes')}</p>
          </div>
        </div>
      </div>

      <p className="section-title">{t('analytics.breakdown')}</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <RatingBars distribution={analytics.ratingDistribution} />
      </div>

      <p className="section-title">{t('analytics.whatToDo')}</p>
      {analytics.recommendations.map((rec) => (
        <div
          key={rec.id}
          className={`card ratings-rec ratings-rec--${rec.priority}`}
        >
          <p className="ratings-rec__title">{rec.title}</p>
          <p className="ratings-rec__detail">{rec.detail}</p>
        </div>
      ))}

      {analytics.aiThemes.length > 0 && (
        <>
          <p className="section-title">{t('analytics.themes')}</p>
          <div className="ratings-themes" style={{ marginBottom: 16 }}>
            {analytics.aiThemes.map((t) => (
              <span key={t.theme} className={`ratings-theme ratings-theme--${t.sentiment}`}>
                {t.theme}
                <em>{t.mentions}</em>
              </span>
            ))}
          </div>
        </>
      )}

      {analytics.comments.length > 0 && (
        <>
          <p className="section-title">{t('analytics.improvementNotes')}</p>
          <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            {analytics.comments.map((c) => (
              <div key={c.id} className="ratings-comment ratings-comment--static">
                <div className="ratings-comment__meta">
                  <span>{c.rating}/5</span>
                  <span>{c.dateLabel}</span>
                </div>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="section-title">{t('analytics.overTime')}</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <WeeklyBarChart data={analytics.weeklyResponses} />
      </div>
    </div>
  );
}
