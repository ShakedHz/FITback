import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  composeFeedbackImprove,
  isLowFeedbackRating,
  type FeedbackIntensity,
} from '@/data/feedbackPrompts';
import { useI18n } from '@/i18n';
import { ClientFeedbackForm } from '@/components/ClientFeedbackForm';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { BackButton } from '@/components/IconToolbar';
import './Feedback.css';

export function FeedbackPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { scheduleEvents, submitFeedback } = useApp();
  const { t } = useI18n();
  const preview = searchParams.get('preview') === '1';
  const [rating, setRating] = useState(0);
  const [intensity, setIntensity] = useState<FeedbackIntensity | null>(null);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
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

  const improveText = composeFeedbackImprove({
    intensityLabel: intensity ? t(`feedback.intensity.${intensity}`) : undefined,
    note,
  });

  const handleSubmit = () => {
    if (preview) return;
    setError(null);
    if (rating < 1) {
      setError(t('errors.ratingRequired'));
      return;
    }
    if (isLowFeedbackRating(rating) && !note.trim()) {
      setError(t('errors.noteRequiredLow'));
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
        improve: improveText,
        title: classEvent?.title || searchParams.get('title') || t('feedback.classFeedback'),
        instructor: classEvent?.instructor || searchParams.get('instructor') || undefined,
        lessonId: linkedLessonId || undefined,
      });
      setSubmitted(true);
    } catch {
      setError(t('errors.saveFeedback'));
    }
  };

  if (submitted) {
    return (
      <div className="page feedback-thanks fade-in">
        <CheckCircle2 className="feedback-thanks__icon" size={48} />
        <h2>{t('feedback.thanks')}</h2>
        <p>{t('feedback.thanksHint')}</p>
      </div>
    );
  }

  const classLine = classEvent
    ? classEvent.instructor
      ? t('feedback.withInstructor', { title: classEvent.title, instructor: classEvent.instructor })
      : classEvent.title
    : t('feedback.subtitle');

  return (
    <div className={`page feedback-page fade-in${preview ? ' feedback-page--preview' : ''}`}>
      {preview ? (
        <div className="page-toolbar">
          <BackButton to="/analytics" label={t('analytics.backToRatings')} />
          <LanguageSwitch />
        </div>
      ) : (
        <div className="feedback-page__bar">
          <LanguageSwitch />
        </div>
      )}

      <ClientFeedbackForm
        preview={preview}
        classLine={classLine}
        rating={rating}
        intensity={intensity}
        note={note}
        error={error}
        onRatingChange={
          preview
            ? undefined
            : (n) => {
                setRating(n);
                setError(null);
              }
        }
        onIntensityChange={preview ? undefined : setIntensity}
        onNoteChange={
          preview
            ? undefined
            : (value) => {
                setNote(value);
                if (error) setError(null);
              }
        }
        onSubmit={preview ? undefined : handleSubmit}
      />
    </div>
  );
}
