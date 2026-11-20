import { Star } from 'lucide-react';
import {
  FEEDBACK_INTENSITIES,
  isLowFeedbackRating,
  type FeedbackIntensity,
} from '@/data/feedbackPrompts';
import { useI18n } from '@/i18n';
import '@/pages/Feedback.css';

interface ClientFeedbackFormProps {
  preview?: boolean;
  classLine: string;
  rating: number;
  intensity: FeedbackIntensity | null;
  note: string;
  error?: string | null;
  onRatingChange?: (n: number) => void;
  onIntensityChange?: (value: FeedbackIntensity | null) => void;
  onNoteChange?: (value: string) => void;
  onSubmit?: () => void;
}

export function ClientFeedbackForm({
  preview = false,
  classLine,
  rating,
  intensity,
  note,
  error,
  onRatingChange,
  onIntensityChange,
  onNoteChange,
  onSubmit,
}: ClientFeedbackFormProps) {
  const { t } = useI18n();
  const noteRequired = isLowFeedbackRating(rating);

  return (
    <div className={`feedback-form${preview ? ' feedback-form--preview' : ''}`}>
      <header className="feedback-hero">
        <h1 className="page-title">{t('feedback.title')}</h1>
        <p className="page-subtitle">{classLine}</p>
      </header>

      <div className="card feedback-card">
        <p className="feedback-label">{t('feedback.yourRating')}</p>
        <div className="feedback-stars" role="group" aria-label={t('feedback.yourRating')}>
          {[1, 2, 3, 4, 5].map((n) => {
            const selected = rating >= n;
            return (
              <button
                key={n}
                type="button"
                className={`feedback-star${selected ? ' feedback-star--on' : ''}`}
                disabled={preview}
                onClick={() => onRatingChange?.(n)}
                aria-label={t('feedback.stars', { n })}
                aria-pressed={rating === n}
              >
                <Star size={30} strokeWidth={1.6} fill={selected ? 'currentColor' : 'none'} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="card feedback-card">
        <p className="feedback-label">
          {t('feedback.intensityLabel')}{' '}
          <span className="feedback-label__hint">({t('feedback.intensityHint')})</span>
        </p>
        <div className="feedback-options" role="radiogroup" aria-label={t('feedback.intensityLabel')}>
          {FEEDBACK_INTENSITIES.map((value) => {
            const selected = intensity === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                className="feedback-option"
                disabled={preview}
                aria-checked={selected}
                onClick={() => onIntensityChange?.(intensity === value ? null : value)}
              >
                <span className="feedback-option__mark" aria-hidden="true" />
                <span className="feedback-option__label">{t(`feedback.intensity.${value}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card feedback-card feedback-card--note">
        <label className="feedback-label" htmlFor={preview ? undefined : 'feedback-note'}>
          {t('feedback.noteLabel')}{' '}
          <span className="feedback-label__hint">
            ({noteRequired ? t('feedback.noteRequired') : t('common.optional')})
          </span>
        </label>
        <textarea
          id={preview ? undefined : 'feedback-note'}
          className="input feedback-note"
          placeholder={
            noteRequired ? t('feedback.improvePlaceholderRequired') : t('feedback.improvePlaceholder')
          }
          value={note}
          readOnly={preview}
          onChange={(e) => onNoteChange?.(e.target.value)}
          rows={4}
          required={!preview && noteRequired}
          aria-required={!preview && noteRequired}
        />
      </div>

      {error ? (
        <p role="alert" className="feedback-error">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary feedback-submit"
        onClick={onSubmit}
        disabled={preview || rating === 0 || (noteRequired && !note.trim())}
      >
        {t('feedback.submit')}
      </button>
    </div>
  );
}
