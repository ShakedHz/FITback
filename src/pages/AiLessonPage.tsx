import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Sparkles, Star, MessageSquareText, BookOpen, ArrowRight, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { suggestLessonFromClientData, type AiLessonSuggestion } from '@/data/aiLessonSuggest';
import { hasSurveyResults } from '@/data/lessonAnalytics';
import { TRAINING_TYPE_LABELS, TRAINING_TYPE_COLORS } from '@/data/trainingTypes';
import { LessonCover } from '@/components/LessonCover';
import { exercises } from '@/data/mockData';
import './AiLesson.css';

export function AiLessonPage() {
  const navigate = useNavigate();
  const { createdLessons, instructor, setLessonDraft } = useApp();
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [suggestion, setSuggestion] = useState<AiLessonSuggestion | null>(null);

  const runSuggest = () => {
    setPhase('loading');
    setSuggestion(null);
    // Short delay so the "analyzing" state is visible
    window.setTimeout(() => {
      const result = suggestLessonFromClientData(createdLessons, instructor.specialties);
      setSuggestion(result);
      setPhase('ready');
    }, 1100);
  };

  useEffect(() => {
    runSuggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount / when library identity changes
  }, [createdLessons.length, instructor.specialties.join(',')]);

  const previewSections = useMemo(() => {
    if (!suggestion) return [];
    return suggestion.draft.sections.map((section) => ({
      ...section,
      exercises: section.exerciseIds
        .map((id) => exercises.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    }));
  }, [suggestion]);

  const openInBuilder = () => {
    if (!suggestion) return;
    setLessonDraft({
      title: suggestion.draft.title,
      description: suggestion.draft.description,
      duration: suggestion.draft.duration,
      trainingType: suggestion.draft.trainingType,
      coverVideo: suggestion.draft.coverVideo,
      albumImages: suggestion.draft.albumImages,
      exerciseIds: suggestion.draft.exerciseIds,
      sections: suggestion.draft.sections,
      sourceLessonId: undefined,
    });
    navigate('/builder?ai=1');
  };

  if (createdLessons.length === 0 || !hasSurveyResults()) {
    return (
      <div className="page fade-in">
        <button type="button" className="back-btn" onClick={() => navigate('/create')}>
          ← Back
        </button>
        <div className="card" style={{ textAlign: 'center', padding: 32, marginTop: 20 }}>
          <Bot size={40} color="#a78bfa" style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            {createdLessons.length === 0 ? 'Not enough data yet' : 'No survey results yet'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.45 }}>
            {createdLessons.length === 0
              ? 'Add lesson plans to your library first, then collect client ratings.'
              : 'Send the weekly survey and wait for client ratings. AI uses those responses to design the next class.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate(createdLessons.length === 0 ? '/create' : '/survey')}
          >
            {createdLessons.length === 0 ? 'Create manually' : 'Go to Survey'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || !suggestion) {
    return (
      <div className="page fade-in ai-lesson-loading">
        <button type="button" className="back-btn" onClick={() => navigate('/create')}>
          ← Back
        </button>
        <div className="ai-lesson-loading__card card card-glow">
          <div className="ai-lesson-loading__icon">
            <Bot size={32} color="#c4b5fd" />
          </div>
          <h1 className="page-title" style={{ fontSize: 22 }}>Analyzing client feedback…</h1>
          <p className="page-subtitle">
            Reading ratings and optional improvement notes to design the class clients want most
          </p>
          <div className="ai-lesson-loading__dots" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  const { draft, rationale, signals, focusThemes, basedOn } = suggestion;
  const typeColors = TRAINING_TYPE_COLORS[draft.trainingType];
  const coverLesson = {
    coverVideo: draft.coverVideo ?? undefined,
    trainingType: draft.trainingType,
  };

  return (
    <div className="page fade-in">
      <button type="button" className="back-btn" onClick={() => navigate('/create')}>
        ← Back
      </button>

      <div className="page-header">
        <div className="ai-lesson-badge">
          <Sparkles size={14} />
          AI from client data
        </div>
        <h1 className="page-title">Suggested next class</h1>
        <p className="page-subtitle">Built from what clients rated and wrote</p>
      </div>

      <div className="ai-lesson-stats">
        <div className="ai-lesson-stat">
          <Star size={15} color="#fbbf24" fill="#fbbf24" />
          <span>{basedOn.ratings} ratings</span>
        </div>
        <div className="ai-lesson-stat">
          <MessageSquareText size={15} color="#a78bfa" />
          <span>{basedOn.notes} notes</span>
        </div>
        <div className="ai-lesson-stat">
          <BookOpen size={15} color="#34d399" />
          <span>{basedOn.lessonsAnalyzed} lessons</span>
        </div>
      </div>

      <div className="card card-glow ai-lesson-hero">
        {draft.coverVideo && (
          <div className="ai-lesson-hero__cover">
            <LessonCover lesson={coverLesson} alt={draft.title} size="md" />
          </div>
        )}
        <span
          className="ai-lesson-hero__type"
          style={{
            background: typeColors.bg,
            borderColor: typeColors.border,
            color: typeColors.text,
          }}
        >
          {TRAINING_TYPE_LABELS[draft.trainingType]}
        </span>
        <h2 className="ai-lesson-hero__title">{draft.title}</h2>
        <p className="ai-lesson-hero__meta">{draft.duration} min · Based on your clients</p>
      </div>

      <div className="card ai-lesson-rationale">
        <div className="ai-lesson-rationale__head">
          <Bot size={18} color="#a78bfa" />
          <h3>Why this plan</h3>
        </div>
        <p>{rationale}</p>
      </div>

      {focusThemes.length > 0 && (
        <>
          <p className="section-title">Addresses client notes about</p>
          <div className="ai-lesson-themes">
            {focusThemes.map((theme) => (
              <span key={theme} className="ai-lesson-theme">{theme}</span>
            ))}
          </div>
        </>
      )}

      <p className="section-title">Signals used</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <ul className="ai-lesson-signals">
          {signals.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <p className="section-title">Plan outline</p>
      {previewSections.map((section) => (
        <div key={section.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{section.title}</span>
            <span className="tag">{section.duration} min</span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            {section.exercises.map((e) => e.nameHe).join(' · ')}
          </p>
        </div>
      ))}

      <div className="ai-lesson-actions">
        <button type="button" className="btn btn-primary" onClick={openInBuilder}>
          Use this plan <ArrowRight size={16} />
        </button>
        <button type="button" className="btn btn-secondary" onClick={runSuggest}>
          <RefreshCw size={16} /> Regenerate
        </button>
      </div>
    </div>
  );
}
