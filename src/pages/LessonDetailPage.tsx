import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Pencil, Star } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { BackButton, IconButton, IconToolbar } from '@/components/IconToolbar';
import { PilatesPropsGlance, SpringDots } from '@/components/PilatesSetup';
import { isSpringSetupEmpty } from '@/data/pilatesSetup';
import { canChooseTrainingType } from '@/data/trainingTypes';
import { equipmentLabel, levelLabel, trainingLabel, useI18n } from '@/i18n';
import './LessonDetail.css';

const MAX_REPS = 99;

function parseReps(value?: string) {
  if (!value) return 0;
  const match = value.match(/\d+/);
  if (!match) return 0;
  return Math.min(MAX_REPS, Math.max(0, Number(match[0])));
}

export function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLessonById, deleteCreatedLesson, isFavoriteLesson, toggleFavoriteLesson, instructor } = useApp();
  const { t } = useI18n();

  const lesson = id ? getLessonById(id) : undefined;
  const favorite = lesson ? isFavoriteLesson(lesson.id) : false;
  if (!lesson) return <div className="page"><p>{t('detail.notFound')}</p></div>;

  const genericDesc = t('preview.defaultDesc', {
    type: trainingLabel(lesson.trainingType, t).toLowerCase(),
  });
  const showDescription =
    Boolean(lesson.description?.trim()) && lesson.description.trim() !== genericDesc;
  const title = lesson.title.trim() || t('library.untitled');
  const isPilates = lesson.trainingType === 'pilates';
  const setupLabel = isPilates
    ? lesson.equipment === 'reformer'
      ? t('builder.apparatus')
      : equipmentLabel('mat', t)
    : null;

  const handleDelete = () => {
    const ok = window.confirm(t('detail.deleteConfirm', { title }));
    if (!ok) return;
    deleteCreatedLesson(lesson.id);
    navigate('/library');
  };

  return (
    <div className="page fade-in teach">
      <div className="page-toolbar">
        <BackButton to="/library" label={t('common.back')} />
        <IconToolbar>
          <IconButton
            className={favorite ? 'is-fav' : ''}
            aria-label={favorite ? t('library.removeFavorite') : t('library.addFavorite')}
            aria-pressed={favorite}
            onClick={() => toggleFavoriteLesson(lesson.id)}
          >
            <Star size={18} fill={favorite ? 'currentColor' : 'none'} />
          </IconButton>
          <IconButton danger onClick={handleDelete} aria-label={t('detail.delete')}>
            <Trash2 size={18} />
          </IconButton>
          <IconButton
            onClick={() => navigate(`/builder?lessonId=${lesson.id}`)}
            aria-label={t('detail.edit')}
          >
            <Pencil size={18} />
          </IconButton>
        </IconToolbar>
      </div>

      <article className="teach-sheet">
        <header className="teach-sheet__head">
          <h1 className="teach-sheet__title">{title}</h1>
          {lesson.focus ? <p className="teach-sheet__focus">{lesson.focus}</p> : null}
          <p className="teach-sheet__meta">
            {lesson.duration} {t('common.min')}
            {' · '}
            {levelLabel(lesson.level, t)}
            {canChooseTrainingType(instructor.specialties)
              ? ` · ${trainingLabel(lesson.trainingType, t)}`
              : ''}
            {setupLabel ? ` · ${setupLabel}` : ''}
          </p>
          <PilatesPropsGlance selected={lesson.equipment === 'reformer' ? lesson.props : undefined} />
          {showDescription && <p className="teach-sheet__desc">{lesson.description}</p>}
        </header>

        {lesson.sections.map((section) => (
          <section key={section.id} className="teach-block">
            <h2 className="teach-block__title">{section.title}</h2>
            <div className="teach-block__list">
            {section.exercises.map((ex) => {
              const reps = parseReps(ex.reps);
              const springs = isSpringSetupEmpty(ex.springs) ? undefined : ex.springs;
              return (
                <div key={ex.id} className="teach-ex">
                  <div className="teach-ex__line">
                    <span className="teach-ex__name">{ex.nameHe}</span>
                    <span className="teach-ex__meta">
                      {springs ? <SpringDots setup={springs} size="md" /> : null}
                      {reps > 0 ? (
                        <span className="teach-ex__reps">{t('builder.repsCount', { count: reps })}</span>
                      ) : null}
                    </span>
                  </div>
                </div>
              );
            })}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
