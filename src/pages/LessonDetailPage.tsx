import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Pencil, Star, CopyPlus, MoreVertical, Share } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { BackButton, IconButton } from '@/components/IconToolbar';
import { shareLessonPlan, shareResultNote } from '@/utils/shareLesson';
import { PilatesPropsGlance, SpringDots } from '@/components/PilatesSetup';
import { isSpringSetupEmpty } from '@/data/pilatesSetup';
import { canChooseTrainingType } from '@/data/trainingTypes';
import { equipmentLabel, exerciseName, levelLabel, sectionTitle, trainingLabel, useI18n } from '@/i18n';
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
  const { getLessonById, deleteCreatedLesson, duplicateCreatedLesson, isFavoriteLesson, toggleFavoriteLesson, instructor } = useApp();
  const { t, locale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    if (!shareNote) return;
    const id = window.setTimeout(() => setShareNote(null), 2800);
    return () => window.clearTimeout(id);
  }, [shareNote]);

  const lesson = id ? getLessonById(id) : undefined;
  const favorite = lesson ? isFavoriteLesson(lesson.id) : false;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('.teach-menu-wrap')) return;
      setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);

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

  const handleDuplicate = () => {
    const copy = duplicateCreatedLesson(lesson, t('detail.copyTitle', { title }));
    navigate(`/lesson/${copy.id}`);
  };

  const handleShare = async () => {
    const result = await shareLessonPlan(lesson, t, locale);
    setShareNote(shareResultNote(result, t));
  };

  return (
    <div className="page fade-in teach">
      <div className="page-toolbar">
        <BackButton to="/library" label={t('common.back')} />
        <div className="teach-toolbar-actions">
          <IconButton aria-label={t('detail.share')} onClick={() => void handleShare()}>
            <Share size={16} />
          </IconButton>
          <div className="teach-menu-wrap">
            <button
              type="button"
              className="teach-menu-btn"
              aria-label={t('library.itemMenu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="teach-menu">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void handleShare();
                }}
              >
                <Share size={14} />
                {t('detail.share')}
              </button>
              <button
                type="button"
                className={favorite ? 'is-fav' : undefined}
                onClick={() => {
                  toggleFavoriteLesson(lesson.id);
                  setMenuOpen(false);
                }}
              >
                <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
                {favorite ? t('library.removeFavorite') : t('library.addFavorite')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/builder?lessonId=${lesson.id}&from=library`);
                }}
              >
                <Pencil size={14} />
                {t('detail.edit')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleDuplicate();
                }}
              >
                <CopyPlus size={14} />
                {t('detail.duplicate')}
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={() => {
                  setMenuOpen(false);
                  handleDelete();
                }}
              >
                <Trash2 size={14} />
                {t('detail.delete')}
              </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {shareNote ? (
        <p className="teach-share-note" role="status">
          {shareNote}
        </p>
      ) : null}

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
            <h2 className="teach-block__title">{sectionTitle(section.title, t)}</h2>
            <div className="teach-block__list">
            {section.exercises.map((ex) => {
              const reps = parseReps(ex.reps);
              const springs = isSpringSetupEmpty(ex.springs) ? undefined : ex.springs;
              return (
                <div key={ex.id} className="teach-ex">
                  <div className="teach-ex__line">
                    <span className="teach-ex__name">{exerciseName(ex, locale)}</span>
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
