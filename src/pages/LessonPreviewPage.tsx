import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { Lesson } from '@/data/mockData';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import { LessonCover } from '@/components/LessonCover';
import { inferEquipment } from '@/data/equipmentTypes';
import { TRAINING_TYPE_LABELS } from '@/data/trainingTypes';
import { getLessonTemplate } from '@/data/lessonTemplates';
import { lessonHasMedia } from '@/utils/lessonCover';
import { trainingLabel, useI18n } from '@/i18n';

export function LessonPreviewPage() {
  const navigate = useNavigate();
  const { addCreatedLesson, instructor, allExercises, lessonDraft, resetLessonDraft } = useApp();
  const { t } = useI18n();

  const planSections = useMemo(() => {
    const sections =
      lessonDraft.sections?.length
        ? lessonDraft.sections
        : getLessonTemplate(lessonDraft.trainingType).map((s) => ({
            id: s.id,
            title: s.title,
            duration: s.duration,
            exerciseIds: [...s.exerciseIds],
          }));

    return sections.map((section) => ({
      id: section.id,
      title: section.title,
      duration: section.duration,
      exercises: section.exerciseIds
        .map((id) => allExercises.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    }));
  }, [lessonDraft.sections, lessonDraft.trainingType, allExercises]);

  const draftLesson: Pick<Lesson, 'coverVideo' | 'coverImage' | 'albumImages' | 'sections' | 'trainingType'> = {
    coverVideo: lessonDraft.coverVideo ?? undefined,
    albumImages: [],
    sections: planSections,
    trainingType: lessonDraft.trainingType,
  };

  const handlePublish = () => {
    const newLesson: Lesson = {
      id: `l-${Date.now()}`,
      title: lessonDraft.title,
      instructorId: instructor.id,
      instructorName: instructor.name,
      duration: lessonDraft.duration,
      level: 'Intermediate',
      trainingType: lessonDraft.trainingType,
      equipment: inferEquipment(lessonDraft.trainingType),
      tags: ['New', TRAINING_TYPE_LABELS[lessonDraft.trainingType]],
      rating: 0,
      reviews: 0,
      price: 0,
      likes: 0,
      comments: 0,
      description:
        lessonDraft.description.trim() ||
        t('preview.defaultDesc', { type: trainingLabel(lessonDraft.trainingType, t).toLowerCase() }),
      sections: planSections,
      isCreated: true,
      isOwned: true,
      coverVideo: lessonDraft.coverVideo ?? undefined,
      albumImages: [],
    };
    addCreatedLesson(newLesson);
    resetLessonDraft();
    navigate('/library');
  };

  return (
    <div className="page fade-in">
      <button className="back-btn" onClick={() => navigate(-1)}>{t('common.back')}</button>
      <h1 className="page-title">{t('preview.title')}</h1>
      <p className="page-subtitle">{t('preview.subtitle')}</p>

      {lessonHasMedia(draftLesson) && (
        <div style={{ marginTop: 16, borderRadius: 16, overflow: 'hidden' }}>
          <LessonCover lesson={draftLesson} alt={lessonDraft.title} size="md" />
        </div>
      )}

      <div
        className="card card-glow"
        style={{
          marginTop: 16,
          background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb),0.25), rgba(var(--color-primary-rgb),0.15))',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: 22 }}>{lessonDraft.title}</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
          {t('preview.meta', { duration: lessonDraft.duration, type: trainingLabel(lessonDraft.trainingType, t) })}
        </p>
        {lessonDraft.description.trim() && (
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
            {lessonDraft.description.trim()}
          </p>
        )}
      </div>

      <p className="section-title" style={{ marginTop: 24 }}>{t('preview.internal')}</p>
      {planSections.map((section) => (
        <div key={section.id} className="card" style={{ marginBottom: 8 }}>
          <p style={{ fontWeight: 600, color: 'var(--color-primary-bright)', marginBottom: 12 }}>
            {t('preview.sectionDur', { title: section.title, duration: section.duration })}
          </p>
          {section.exercises.map((ex) => (
            <div
              key={ex.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', fontSize: 14 }}
            >
              <ExerciseVideo exercise={ex} size="row" />
              <span style={{ flex: 1 }}>{ex.nameHe}</span>
              <span style={{ color: 'var(--color-text-subtle)' }}>{ex.duration} {t('common.min')}</span>
            </div>
          ))}
        </div>
      ))}

      <button type="button" className="btn btn-primary" style={{ marginTop: 20 }} onClick={handlePublish}>
        {t('preview.save')}
      </button>
    </div>
  );
}
