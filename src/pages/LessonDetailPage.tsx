import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, BarChart3, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import { LessonCover } from '@/components/LessonCover';
import { InstructorAvatar } from '@/components/InstructorAvatar';
import { TRAINING_TYPE_COLORS } from '@/data/trainingTypes';
import { lessonHasMedia } from '@/utils/lessonCover';
import { equipmentLabel, levelLabel, trainingLabel, useI18n } from '@/i18n';

export function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLessonById, instructor, deleteCreatedLesson } = useApp();
  const { t } = useI18n();

  const lesson = id ? getLessonById(id) : undefined;
  if (!lesson) return <div className="page"><p>{t('detail.notFound')}</p></div>;

  const hasVideo = Boolean(lesson.coverVideo);

  const handleDelete = () => {
    const ok = window.confirm(t('detail.deleteConfirm', { title: lesson.title }));
    if (!ok) return;
    deleteCreatedLesson(lesson.id);
    navigate('/library');
  };

  return (
    <div className="page fade-in">
      <button className="back-btn" onClick={() => navigate(-1)}>{t('common.back')}</button>

      {lessonHasMedia(lesson) && (
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
          <LessonCover
            lesson={lesson}
            alt={lesson.title}
            size="md"
            showFullscreenButton={hasVideo}
          />
        </div>
      )}

      <h1 className="page-title" style={{ marginBottom: 8 }}>{lesson.title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <InstructorAvatar
          src={instructor.avatar}
          name={instructor.name}
          size="sm"
        />
        <p style={{ color: 'var(--color-text-muted)' }}>{t('detail.by', { name: instructor.name })}</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: 20,
            background: TRAINING_TYPE_COLORS[lesson.trainingType].bg,
            border: `1px solid ${TRAINING_TYPE_COLORS[lesson.trainingType].border}`,
            color: TRAINING_TYPE_COLORS[lesson.trainingType].text,
          }}
        >
          {trainingLabel(lesson.trainingType, t)}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: '4px 12px',
            borderRadius: 20,
            background: 'rgba(148, 163, 184, 0.12)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {equipmentLabel(lesson.equipment, t)}
        </span>
        {lesson.tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20, fontSize: 14, color: 'var(--color-text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={16} fill="var(--color-accent)" color="var(--color-accent)" /> {t('detail.reviews', { rating: lesson.rating, reviews: lesson.reviews })}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={16} /> {lesson.duration} {t('common.min')}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BarChart3 size={16} /> {levelLabel(lesson.level, t)}</span>
      </div>

      <div className="card">
        <p className="section-title">{t('detail.description')}</p>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{lesson.description}</p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <p className="section-title">{t('detail.plan')}</p>
        {lesson.sections.map((section) => (
          <div key={section.id} style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600, color: 'var(--color-primary-bright)', marginBottom: 8 }}>
              {section.title} ({section.duration} {t('common.min')})
            </p>
            {section.exercises.map((ex) => (
              <div
                key={ex.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(var(--color-primary-rgb),0.1)',
                }}
              >
                <ExerciseVideo exercise={ex} size="row" />
                <span style={{ flex: 1 }}>{ex.nameHe}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{ex.duration} {t('common.min')}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 12 }}
        onClick={() => navigate(`/builder?lessonId=${lesson.id}`)}
      >
        {t('detail.edit')}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ marginTop: 8 }}
        onClick={() => navigate(`/analytics/${lesson.id}`)}
      >
        {t('detail.ratings')}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ marginTop: 8, color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.35)' }}
        onClick={handleDelete}
      >
        <Trash2 size={16} /> {t('detail.delete')}
      </button>
    </div>
  );
}
