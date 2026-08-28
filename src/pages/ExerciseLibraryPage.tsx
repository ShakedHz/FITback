import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Check } from 'lucide-react';
import { useApp, type LessonDraftSection } from '@/context/AppContext';
import { BackButton } from '@/components/IconToolbar';
import { durationsFromExercises } from '@/utils/lessonDuration';
import { builderPathFromParams, newExercisePath } from '@/utils/exerciseNav';
import { categoryLabel, useI18n } from '@/i18n';
import '@/components/ExerciseVideo.css';

export function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetSectionId = searchParams.get('section');
  const { allExercises, lessonDraft, setLessonDraft } = useApp();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', ...new Set(allExercises.map((e) => e.category))];
  const returnToBuilder = builderPathFromParams(searchParams);

  const fallbackSections = useCallback(
    (): LessonDraftSection[] => [
      { id: 's1', title: t('builder.warmup'), duration: 0, exerciseIds: [] },
      { id: 's2', title: t('builder.main'), duration: 0, exerciseIds: [] },
      { id: 's3', title: t('builder.cooldown'), duration: 0, exerciseIds: [] },
    ],
    [t]
  );

  const sections: LessonDraftSection[] = lessonDraft.sections?.length
    ? lessonDraft.sections
    : fallbackSections();

  const targetSection =
    sections.find((s) => s.id === targetSectionId) ??
    sections.find((s) => s.id === 's2') ??
    sections[0];

  const selected = useMemo(
    () => new Set(targetSection?.exerciseIds ?? []),
    [targetSection]
  );

  const filtered = allExercises.filter((e) => {
    const matchesSearch =
      e.nameHe.toLowerCase().includes(search.toLowerCase()) ||
      e.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
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

    const packed = durationsFromExercises(base, allExercises);
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
              ? `${t('exercises.addingTo', { section: targetSection.title })} · ${t('exercises.selectedCount', { count: selected.size })}`
              : t('exercises.addingTo', { section: targetSection.title })
            : t('exercises.count', { count: allExercises.length })}
        </p>
      </div>

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

      <div className="chip-row" style={{ marginBottom: 12 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`chip ${categoryFilter === cat ? 'selected' : ''}`}
            onClick={() => setCategoryFilter(cat)}
          >
            {categoryLabel(cat, t)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="ex-picker__empty">{t('exercises.none')}</p>
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
                    <span className="ex-row__name">
                      {ex.nameHe}
                      {ex.isCustom && <span className="ex-row__mine">{t('exercises.mine')}</span>}
                    </span>
                    <span className="ex-row__meta">
                      {categoryLabel(ex.category, t)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className="ex-create"
        onClick={() => navigate(newExercisePath(searchParams))}
      >
        <span className="ex-create__icon" aria-hidden>
          <Plus size={18} strokeWidth={2.5} />
        </span>
        <span className="ex-create__text">
          <span className="ex-create__title">{t('exercises.newTitle')}</span>
          <span className="ex-create__desc">{t('exercises.newDesc')}</span>
        </span>
      </button>

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
