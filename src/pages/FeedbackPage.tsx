import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Star } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/i18n';

export function FeedbackPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { scheduleEvents, submitFeedback } = useApp();
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [improve, setImprove] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [savedRating, setSavedRating] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const classEvent = useMemo(() => {
    if (!id || id === 'demo') return null;
    const fromSchedule = scheduleEvents.find((ev) => ev.id === id);
    if (fromSchedule) return fromSchedule;
    const title = searchParams.get('title');
    if (!title && !searchParams.get('lessonId')) {
      return {
        id,
        title: t('feedback.classFeedback'),
        instructor: searchParams.get('instructor') || undefined,
        lessonPlanId: searchParams.get('lessonId') || undefined,
        lessonId: searchParams.get('lessonId') || undefined,
      };
    }
    return {
      id,
      title: title || t('feedback.classFeedback'),
      instructor: searchParams.get('instructor') || undefined,
      lessonPlanId: searchParams.get('lessonId') || undefined,
      lessonId: searchParams.get('lessonId') || undefined,
    };
  }, [id, scheduleEvents, searchParams, t]);

  const handleSubmit = () => {
    setError(null);
    if (rating < 1) {
      setError(t('errors.ratingRequired'));
      return;
    }

    const sourceId = id && id !== 'demo' ? id : `demo-${Date.now()}`;
    const linkedLessonId =
      searchParams.get('lessonId') ||
      (classEvent && 'lessonPlanId' in classEvent ? classEvent.lessonPlanId : undefined) ||
      (classEvent && 'lessonId' in classEvent ? classEvent.lessonId : undefined) ||
      undefined;

    try {
      submitFeedback({
        sourceId,
        rating,
        improve,
        title: classEvent?.title || searchParams.get('title') || t('feedback.classFeedback'),
        instructor: classEvent?.instructor || searchParams.get('instructor') || undefined,
        lessonId: linkedLessonId || undefined,
      });
      setSavedRating(rating);
      setSubmitted(true);
    } catch {
      setError(t('errors.saveFeedback'));
    }
  };

  if (submitted) {
    return (
      <div
        className="page"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '100%',
          gap: 8,
        }}
      >
        <CheckCircle2 size={48} color="#34d399" />
        <h2 style={{ marginTop: 8 }}>{t('feedback.thanks')}</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {t('feedback.saved', {
            rating: savedRating,
            note: improve.trim() ? t('feedback.withNote') : '',
          })}
        </p>
        <Link to="/analytics" className="btn btn-primary" style={{ marginTop: 16, width: 'auto', minWidth: 200 }}>
          {t('feedback.viewRatings')}
        </Link>
        <Link to="/dashboard" className="btn btn-ghost" style={{ width: 'auto' }}>
          {t('feedback.backHome')}
        </Link>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Star size={40} color="var(--color-primary-bright)" strokeWidth={1.5} />
        <h1 className="page-title" style={{ marginTop: 12 }}>{t('feedback.title')}</h1>
        <p className="page-subtitle">
          {classEvent
            ? classEvent.instructor
              ? t('feedback.withInstructor', { title: classEvent.title, instructor: classEvent.instructor })
              : classEvent.title
            : t('feedback.subtitle')}
        </p>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <p className="section-title">{t('feedback.yourRating')}</p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={t('feedback.stars', { n })}
              aria-pressed={rating === n}
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                border: rating === n ? '2px solid var(--color-accent)' : '1px solid rgba(148,163,184,0.25)',
                background: rating === n ? 'rgba(224, 168, 106, 0.18)' : 'rgba(var(--color-bg-rgb),0.5)',
                color: rating === n ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontSize: 20,
                fontWeight: 800,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 12 }}>
          {rating > 0 ? t('feedback.selected', { rating }) : t('feedback.tapNumber')}
        </p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 8 }}>
          {t('feedback.improve')} <span style={{ color: 'var(--color-text-subtle)' }}>({t('common.optional')})</span>
        </label>
        <textarea
          className="input"
          placeholder={t('feedback.improvePlaceholder')}
          value={improve}
          onChange={(e) => setImprove(e.target.value)}
          rows={4}
          style={{ minHeight: 96, resize: 'vertical', fontSize: 16 }}
        />
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 13, marginTop: 12 }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 24 }}
        onClick={handleSubmit}
        disabled={rating === 0}
      >
        {t('feedback.submit')}
      </button>
    </div>
  );
}
