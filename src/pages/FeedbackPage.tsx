import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Star } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function FeedbackPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { scheduleEvents, submitFeedback } = useApp();
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
        title: 'Class feedback',
        instructor: searchParams.get('instructor') || undefined,
        lessonPlanId: searchParams.get('lessonId') || undefined,
        lessonId: searchParams.get('lessonId') || undefined,
      };
    }
    return {
      id,
      title: title || 'Class feedback',
      instructor: searchParams.get('instructor') || undefined,
      lessonPlanId: searchParams.get('lessonId') || undefined,
      lessonId: searchParams.get('lessonId') || undefined,
    };
  }, [id, scheduleEvents, searchParams]);

  const handleSubmit = () => {
    setError(null);
    if (rating < 1) {
      setError('Please choose a rating from 1 to 5');
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
        title: classEvent?.title || searchParams.get('title') || 'Class feedback',
        instructor: classEvent?.instructor || searchParams.get('instructor') || undefined,
        lessonId: linkedLessonId || undefined,
      });
      setSavedRating(rating);
      setSubmitted(true);
    } catch {
      setError('Could not save feedback. Try again.');
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
        <h2 style={{ marginTop: 8 }}>Thanks for your feedback!</h2>
        <p style={{ color: '#94a3b8' }}>
          Saved {savedRating}/5 stars
          {improve.trim() ? ' with a note' : ''}.
        </p>
        <Link to="/analytics" className="btn btn-primary" style={{ marginTop: 16, width: 'auto', minWidth: 200 }}>
          View in Ratings
        </Link>
        <Link to="/dashboard" className="btn btn-ghost" style={{ width: 'auto' }}>
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Star size={40} color="#a78bfa" strokeWidth={1.5} />
        <h1 className="page-title" style={{ marginTop: 12 }}>How was the class?</h1>
        <p className="page-subtitle">
          {classEvent
            ? `${classEvent.title}${classEvent.instructor ? ` with ${classEvent.instructor}` : ''}`
            : 'Rate the class — an improvement note is optional'}
        </p>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <p className="section-title">Your rating</p>
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
              aria-label={`${n} stars`}
              aria-pressed={rating === n}
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                border: rating === n ? '2px solid #fbbf24' : '1px solid rgba(148,163,184,0.25)',
                background: rating === n ? 'rgba(251,191,36,0.18)' : 'rgba(15,10,26,0.5)',
                color: rating === n ? '#fbbf24' : '#94a3b8',
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
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 12 }}>
          {rating > 0 ? `${rating} / 5 selected` : 'Tap a number'}
        </p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
          What could be improved? <span style={{ color: '#64748b' }}>(optional)</span>
        </label>
        <textarea
          className="input"
          placeholder="e.g. slower pace, longer cool-down…"
          value={improve}
          onChange={(e) => setImprove(e.target.value)}
          rows={4}
          style={{ minHeight: 96, resize: 'vertical', fontSize: 16 }}
        />
      </div>

      {error && (
        <p role="alert" style={{ color: '#fca5a5', fontSize: 13, marginTop: 12 }}>
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
        Submit feedback
      </button>
    </div>
  );
}
