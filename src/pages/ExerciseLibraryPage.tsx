import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import { durationsFromExercises } from '@/utils/lessonDuration';
import { builderPathFromParams, newExercisePath } from '@/utils/exerciseNav';

const CATEGORY_LABELS: Record<string, string> = {
  'חימום': 'Warm-up',
  'ליבה': 'Core',
  'גב': 'Back',
  'מתיחות': 'Stretching',
  'סיום': 'Cool-down',
  'אחר': 'Other',
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

export function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetSectionId = searchParams.get('section');
  const { allExercises, lessonDraft, setLessonDraft } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [added, setAdded] = useState<string[]>([]);

  const categories = ['All', ...new Set(allExercises.map((e) => e.category))];
  const returnToBuilder = builderPathFromParams(searchParams);

  const filtered = allExercises.filter((e) => {
    const matchesSearch =
      e.nameHe.includes(search) || e.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const customCount = allExercises.filter((e) => e.isCustom).length;

  const addToLesson = () => {
    const baseSections =
      lessonDraft.sections?.length
        ? lessonDraft.sections.map((s) => ({
            id: s.id,
            title: s.title,
            exerciseIds: [...s.exerciseIds],
          }))
        : [
            { id: 's1', title: 'Warm-up', exerciseIds: [] as string[] },
            { id: 's2', title: 'Main section', exerciseIds: [] as string[] },
            { id: 's3', title: 'Cool-down', exerciseIds: [] as string[] },
          ];

    const alreadyInPlan = new Set(baseSections.flatMap((s) => s.exerciseIds));
    const toAdd = added.filter((id) => !alreadyInPlan.has(id));

    let targetIdx = targetSectionId
      ? baseSections.findIndex((s) => s.id === targetSectionId)
      : baseSections.findIndex((s) => s.id === 's2');
    if (targetIdx < 0) targetIdx = 0;
    baseSections[targetIdx].exerciseIds.push(...toAdd);

    const timed = durationsFromExercises(baseSections, allExercises);
    setLessonDraft(timed);
    navigate(returnToBuilder);
  };

  return (
    <div className="page fade-in">
      <button className="back-btn" onClick={() => navigate(returnToBuilder)}>← Back</button>
      <h1 className="page-title">Exercise library</h1>
      <p className="page-subtitle">
        {allExercises.length} exercises
        {customCount > 0 && ` · ${customCount} yours`}
        {targetSectionId && lessonDraft.sections?.find((s) => s.id === targetSectionId) && (
          <> · Adding to {lessonDraft.sections.find((s) => s.id === targetSectionId)?.title}</>
        )}
      </p>

      <button
        type="button"
        className="card card-glow exercise-new-cta"
        onClick={() => navigate(newExercisePath(searchParams))}
      >
        <span className="exercise-new-cta__icon" aria-hidden>
          <Plus size={22} strokeWidth={2.5} />
        </span>
        <span className="exercise-new-cta__text">
          <span className="exercise-new-cta__title">New Exercise</span>
          <span className="exercise-new-cta__desc">Create your own and add it to the library</span>
        </span>
        <span className="exercise-new-cta__arrow" aria-hidden>→</span>
      </button>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={18} color="#64748b" style={{ position: 'absolute', left: 14, top: 14 }} />
        <input
          className="input"
          placeholder="Search exercise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 42 }}
        />
      </div>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`chip ${categoryFilter === cat ? 'selected' : ''}`}
            onClick={() => setCategoryFilter(cat)}
          >
            {categoryLabel(cat)}
          </button>
        ))}
      </div>

      {filtered.map((ex) => (
        <div key={ex.id} className="card exercise-card">
          <ExerciseVideo exercise={ex} size="thumb" />
          <div className="exercise-card__info">
            <p className="exercise-card__name">
              {ex.nameHe}
              {ex.isCustom && <span className="tag" style={{ marginLeft: 6, fontSize: 10 }}>Mine</span>}
            </p>
            <p className="exercise-card__meta">{ex.name} · {ex.duration} min · {categoryLabel(ex.category)}</p>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${added.includes(ex.id) ? 'btn-secondary' : 'btn-primary'}`}
            style={{ width: 40, height: 40, padding: 0, borderRadius: 12, flexShrink: 0 }}
            onClick={() =>
              setAdded((a) =>
                a.includes(ex.id) ? a.filter((id) => id !== ex.id) : [...a, ex.id]
              )
            }
          >
            {added.includes(ex.id) ? <Check size={18} /> : <Plus size={18} />}
          </button>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: '#94a3b8' }}>No exercises found</p>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 12 }}
            onClick={() => navigate(newExercisePath(searchParams))}
          >
            New Exercise
          </button>
        </div>
      )}

      {added.length > 0 && (
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={addToLesson}>
          Add to lesson ({added.length} exercises)
        </button>
      )}
    </div>
  );
}
