import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Check, Pencil, Trash2 } from 'lucide-react';
import { useApp, type LessonDraftSection } from '@/context/AppContext';
import { BackButton, IconButton } from '@/components/IconToolbar';
import { getExerciseAreaId } from '@/data/bodyParts';
import { durationsFromExercises } from '@/utils/lessonDuration';
import { builderPathFromParams, editExercisePath, newExercisePath } from '@/utils/exerciseNav';
import { exerciseAreaLabel, exerciseName, sectionTitle, useI18n } from '@/i18n';
import { syncPilatesMainSides } from '@/utils/mirroredSections';
import { exerciseMatchesSection } from '@/utils/sectionExerciseFilter';
import '@/components/ExerciseVideo.css';

export function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetSectionId = searchParams.get('section');
  const {
    allExercises,
    customExercises,
    customExerciseAreas,
    exerciseLibraryPrefs,
    deleteExercise,
    lessonDraft,
    setLessonDraft,
  } = useApp();
  const { t, locale } = useI18n();
  const [search, setSearch] = useState('');
  const [bodyPartFilter, setBodyPartFilter] = useState<string>('all');

  const trainingType = lessonDraft.trainingType;

  const returnToBuilder = builderPathFromParams(searchParams);

  const fallbackSections = useCallback(
    (): LessonDraftSection[] => [
      { id: 's1', title: 'Warm-up', duration: 0, exerciseIds: [] },
      { id: 's2', title: 'Main section', duration: 0, exerciseIds: [] },
      { id: 's3', title: 'Cool-down', duration: 0, exerciseIds: [] },
    ],
    []
  );

  const sections: LessonDraftSection[] = lessonDraft.sections?.length
    ? lessonDraft.sections
    : fallbackSections();

  const targetSection =
    sections.find((s) => s.id === targetSectionId) ??
    sections.find((s) => s.id === 's2') ??
    sections[0];

  const visibleExercises = useMemo(() => {
    const selectedInSection = new Set(targetSection?.exerciseIds ?? []);
    const sectionIndex = targetSection
      ? sections.findIndex((s) => s.id === targetSection.id)
      : 0;
    return customExercises
      .filter((exercise) =>
        targetSection
          ? exerciseMatchesSection(
              exercise,
              targetSection.title,
              sectionIndex >= 0 ? sectionIndex : 0,
              sections.length,
              selectedInSection
            )
          : true
      )
      .sort((a, b) => {
        const aOn = selectedInSection.has(a.id) ? 0 : 1;
        const bOn = selectedInSection.has(b.id) ? 0 : 1;
        if (aOn !== bOn) return aOn - bOn;
        return exerciseName(a, locale).localeCompare(exerciseName(b, locale), locale);
      });
  }, [customExercises, locale, sections, targetSection]);

  const availableBodyParts = useMemo(() => {
    const ids = new Set<string>();
    customExercises.forEach((exercise) => ids.add(getExerciseAreaId(exercise)));
    return [...ids];
  }, [customExercises]);

  const areaLabel = (areaId: string) =>
    exerciseAreaLabel(
      areaId,
      locale,
      t,
      customExerciseAreas,
      exerciseLibraryPrefs.bodyPartLabels
    );

  const openNewExercise = () => navigate(newExercisePath(searchParams));

  const createExerciseButton = (className: string) => (
    <button type="button" className={className} onClick={openNewExercise}>
      <span className="ex-create__icon" aria-hidden>
        <Plus size={18} strokeWidth={2.5} />
      </span>
      <span className="ex-create__text">
        <span className="ex-create__title">{t('exercises.newTitle')}</span>
        <span className="ex-create__desc">{t('exercises.newDesc')}</span>
      </span>
    </button>
  );

  const selected = useMemo(
    () => new Set(targetSection?.exerciseIds ?? []),
    [targetSection]
  );

  const filtered = visibleExercises.filter((e) => {
    const label = exerciseName(e, locale);
    const matchesSearch =
      label.toLowerCase().includes(search.toLowerCase()) ||
      e.nameHe.toLowerCase().includes(search.toLowerCase()) ||
      e.name.toLowerCase().includes(search.toLowerCase());
    const matchesBodyPart =
      bodyPartFilter === 'all' || getExerciseAreaId(e) === bodyPartFilter;
    return matchesSearch && matchesBodyPart;
  });

  const writeSection = (exerciseIds: string[]) => {
    const base = (lessonDraft.sections?.length ? lessonDraft.sections : fallbackSections()).map(
      (s) => ({
        id: s.id,
        title: s.title,
        duration: s.duration,
        exerciseIds: [...s.exerciseIds],
        notes: s.notes,
      })
    );

    let targetIdx = targetSectionId
      ? base.findIndex((s) => s.id === targetSectionId)
      : base.findIndex((s) => s.id === 's2');
    if (targetIdx < 0) targetIdx = 0;
    base[targetIdx].exerciseIds = exerciseIds;

    const sectionId = base[targetIdx].id;
    const mirrored = syncPilatesMainSides(base, sectionId, trainingType);

    const packed = durationsFromExercises(mirrored, allExercises);
    setLessonDraft({
      sections: packed.sections,
      exerciseIds: packed.exerciseIds,
    });
  };

  const toggle = (id: string) => {
    const next = selected.has(id)
      ? (targetSection?.exerciseIds ?? []).filter((x) => x !== id)
      : [...(targetSection?.exerciseIds ?? []), id];
    writeSection(next);
  };

  const handleDeleteExercise = (exercise: (typeof visibleExercises)[number]) => {
    const name = exerciseName(exercise, locale);
    if (!window.confirm(t('exercises.deleteExerciseConfirm', { name }))) return;
    deleteExercise(exercise.id);
  };

  const isEmptyLibrary = customExercises.length === 0;
  const showAreaFilters = availableBodyParts.length > 1;

  return (
    <div className="page fade-in ex-picker-page">
      <div className="page-toolbar">
        <BackButton to={returnToBuilder} label={t('common.back')} />
        <button
          type="button"
          className="ex-picker-done"
          onClick={() => navigate(returnToBuilder)}
        >
          {t('common.done')}
        </button>
      </div>

      <div className="page-header">
        <h1 className="page-title">{t('exercises.title')}</h1>
        <p className="page-subtitle">
          {targetSection
            ? selected.size > 0
              ? `${t('exercises.addingTo', { section: sectionTitle(targetSection.title, t) })} · ${t('exercises.selectedCount', { count: selected.size })}`
              : t('exercises.addingTo', { section: sectionTitle(targetSection.title, t) })
            : null}
        </p>
      </div>

      {isEmptyLibrary ? (
        <div className="ex-picker__empty-state">
          <p>{t('exercises.emptyLibrary')}</p>
          {createExerciseButton('ex-create ex-create--empty')}
        </div>
      ) : (
        <>
          <div className="ex-picker__actions">
            {createExerciseButton('ex-create ex-create--banner')}
            <div className="ex-picker__search">
              <Search size={16} className="ex-picker__search-icon" aria-hidden />
              <input
                className="input"
                type="search"
                placeholder={t('exercises.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {showAreaFilters && (
            <div className="cat-filters">
              <p className="cat-filters__label">{t('exercises.categories')}</p>
              <div className="cat-filters__row">
                <button
                  type="button"
                  className={`chip ${bodyPartFilter === 'all' ? 'selected' : ''}`}
                  onClick={() => setBodyPartFilter('all')}
                >
                  {t('common.all')}
                </button>
                {availableBodyParts.map((part) => (
                  <button
                    key={part}
                    type="button"
                    className={`chip ${bodyPartFilter === part ? 'selected' : ''}`}
                    onClick={() => setBodyPartFilter(part)}
                  >
                    {areaLabel(part)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="ex-picker__empty-state">
              <p>{t('exercises.none')}</p>
            </div>
          ) : (
            <ul className="ex-picker">
              {filtered.map((ex) => {
                const on = selected.has(ex.id);
                return (
                  <li key={ex.id} className={`ex-row${on ? ' ex-row--on' : ''}`}>
                    <button type="button" className="ex-row__main" onClick={() => toggle(ex.id)}>
                      <span className="ex-row__box" aria-hidden>
                        <Check size={13} strokeWidth={3} />
                      </span>
                      <span className="ex-row__text">
                        <span className="ex-row__name">{exerciseName(ex, locale)}</span>
                        <span className="ex-row__meta">{areaLabel(getExerciseAreaId(ex))}</span>
                      </span>
                    </button>
                    <div className="ex-row__actions">
                      <IconButton
                        className="ex-row__edit"
                        aria-label={t('exercises.editExercise')}
                        onClick={() => navigate(editExercisePath(ex.id, searchParams))}
                      >
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        className="ex-row__delete"
                        danger
                        aria-label={t('exercises.deleteExercise')}
                        onClick={() => handleDeleteExercise(ex)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <div className="ex-picker__footer">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate(returnToBuilder)}
        >
          {selected.size > 0
            ? t('exercises.doneCount', { count: selected.size })
            : t('common.done')}
        </button>
      </div>
    </div>
  );
}
