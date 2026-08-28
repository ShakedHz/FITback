import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, Sparkles, Star, MessageSquareText, BookOpen, ArrowRight, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { suggestLessonFromClientData, type AiLessonSuggestion } from '@/data/aiLessonSuggest';
import { hasSurveyResults } from '@/data/lessonAnalytics';
import { defaultPlanEquipment } from '@/data/equipmentTypes';
import { TRAINING_TYPE_COLORS, canChooseTrainingType } from '@/data/trainingTypes';
import { BackButton } from '@/components/IconToolbar';
import { LessonCover } from '@/components/LessonCover';
import { exercises } from '@/data/mockData';
import { trainingLabel, useI18n } from '@/i18n';
import './AiLesson.css';

export function AiLessonPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromLibrary = searchParams.get('from') === 'library';
  const backTo = fromLibrary ? '/library' : '/create';
  const { createdLessons, instructor, setLessonDraft } = useApp();
  const { t } = useI18n();
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
      equipment: defaultPlanEquipment(suggestion.draft.trainingType),
      props: [],
      focus: suggestion.draft.focus ?? '',
      level: 'Intermediate',
      coverVideo: suggestion.draft.coverVideo,
      albumImages: suggestion.draft.albumImages,
      exerciseIds: suggestion.draft.exerciseIds,
      sections: suggestion.draft.sections,
      sourceLessonId: undefined,
    });
    navigate(fromLibrary ? '/builder?ai=1&from=library' : '/builder?ai=1');
  };

  if (createdLessons.length === 0 || !hasSurveyResults()) {
    return (
      <div className="page fade-in">
        <BackButton to={backTo} label={t('common.back')} />
        <div className="card" style={{ textAlign: 'center', padding: 32, marginTop: 20 }}>
          <Bot size={40} color="var(--color-primary-bright)" style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            {createdLessons.length === 0 ? t('ai.notEnough') : t('ai.noSurvey')}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.45 }}>
            {createdLessons.length === 0
              ? t('ai.addFirst')
              : t('ai.sendSurvey')}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate(createdLessons.length === 0 ? '/create' : '/schedule')}
          >
            {createdLessons.length === 0 ? t('ai.createManually') : t('ai.goSurvey')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || !suggestion) {
    return (
      <div className="page fade-in ai-lesson-loading">
        <BackButton to={backTo} label={t('common.back')} />
        <div className="ai-lesson-loading__card card card-glow">
          <div className="ai-lesson-loading__icon">
            <Bot size={32} color="var(--color-primary-bright)" />
          </div>
          <h1 className="page-title" style={{ fontSize: 22 }}>{t('ai.analyzing')}</h1>
          <p className="page-subtitle">
            {t('ai.analyzingSub')}
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
      <BackButton to={backTo} label={t('common.back')} />

      <div className="page-header">
        <div className="ai-lesson-badge">
          <Sparkles size={14} />
          {t('ai.badge')}
        </div>
        <h1 className="page-title">{t('ai.suggested')}</h1>
        <p className="page-subtitle">{t('ai.builtFrom')}</p>
      </div>

      <div className="ai-lesson-stats">
        <div className="ai-lesson-stat">
          <Star size={15} color="var(--color-accent)" fill="var(--color-accent)" />
          <span>{t('ai.ratings', { count: basedOn.ratings })}</span>
        </div>
        <div className="ai-lesson-stat">
          <MessageSquareText size={15} color="var(--color-primary-bright)" />
          <span>{t('ai.notes', { count: basedOn.notes })}</span>
        </div>
        <div className="ai-lesson-stat">
          <BookOpen size={15} color="#34d399" />
          <span>{t('ai.lessons', { count: basedOn.lessonsAnalyzed })}</span>
        </div>
      </div>

      <div className="card card-glow ai-lesson-hero">
        {draft.coverVideo && (
          <div className="ai-lesson-hero__cover">
            <LessonCover lesson={coverLesson} alt={draft.title} size="md" />
          </div>
        )}
        {canChooseTrainingType(instructor.specialties) && (
          <span
            className="ai-lesson-hero__type"
            style={{
              background: typeColors.bg,
              borderColor: typeColors.border,
              color: typeColors.text,
            }}
          >
            {trainingLabel(draft.trainingType, t)}
          </span>
        )}
        <h2 className="ai-lesson-hero__title">{draft.title}</h2>
        <p className="ai-lesson-hero__meta">{t('ai.basedOnClients', { duration: draft.duration })}</p>
      </div>

      <div className="card ai-lesson-rationale">
        <div className="ai-lesson-rationale__head">
          <Bot size={18} color="var(--color-primary-bright)" />
          <h3>{t('ai.why')}</h3>
        </div>
        <p>{rationale}</p>
      </div>

      {focusThemes.length > 0 && (
        <>
          <p className="section-title">{t('ai.addresses')}</p>
          <div className="ai-lesson-themes">
            {focusThemes.map((theme) => (
              <span key={theme} className="ai-lesson-theme">{theme}</span>
            ))}
          </div>
        </>
      )}

      <p className="section-title">{t('ai.signals')}</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <ul className="ai-lesson-signals">
          {signals.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>

      <p className="section-title">{t('ai.outline')}</p>
      {previewSections.map((section) => (
        <div key={section.id} className="card" style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{section.title}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            {section.exercises.map((e) => e.nameHe).join(' · ')}
          </p>
        </div>
      ))}

      <div className="ai-lesson-actions">
        <button type="button" className="btn btn-primary" onClick={openInBuilder}>
          {t('ai.usePlan')} <ArrowRight className="rtl-flip" size={16} />
        </button>
        <button type="button" className="btn btn-secondary" onClick={runSuggest}>
          <RefreshCw size={16} /> {t('ai.regenerate')}
        </button>
      </div>
    </div>
  );
}
