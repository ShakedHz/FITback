import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Upload, Check, X, Plus, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { useApp, type LessonDraftSection } from '@/context/AppContext';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import { BackButton, IconButton } from '@/components/IconToolbar';
import { getExerciseBodyPart, visibleBodyParts, type BodyPart } from '@/data/bodyParts';
import type { Exercise } from '@/data/mockData';
import { exercisesPath } from '@/utils/exerciseNav';
import { bilingualName, detectTextLocale } from '@/utils/translateText';
import { sectionIdForCategory } from '@/utils/sectionExerciseFilter';
import { durationsFromExercises } from '@/utils/lessonDuration';
import { syncPilatesMainSides } from '@/utils/mirroredSections';
import { exerciseAreaLabel, sectionTitle, useI18n } from '@/i18n';
import './AddExercise.css';

type AreaSelection =
  | { kind: 'standard'; id: BodyPart }
  | { kind: 'custom'; id: string };

function areaSelectionFromExercise(ex: Exercise): AreaSelection {
  if (ex.customAreaId) return { kind: 'custom', id: ex.customAreaId };
  return { kind: 'standard', id: getExerciseBodyPart(ex) };
}

export function AddExercisePage() {
  const navigate = useNavigate();
  const { exerciseId } = useParams<{ exerciseId?: string }>();
  const [searchParams] = useSearchParams();
  const {
    addCustomExercise,
    updateExercise,
    deleteExercise,
    allExercises,
    ensureCustomExerciseArea,
    updateExerciseArea,
    deleteExerciseArea,
    customExerciseAreas,
    exerciseLibraryPrefs,
    lessonDraft,
    setLessonDraft,
  } = useApp();
  const { t, locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nameInput, setNameInput] = useState('');
  const [translatedName, setTranslatedName] = useState('');
  const [translating, setTranslating] = useState(false);
  const [areaSelection, setAreaSelection] = useState<AreaSelection>({ kind: 'standard', id: 'core' });
  const [customAreaInput, setCustomAreaInput] = useState('');
  const [showCustomAreaInput, setShowCustomAreaInput] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaInput, setEditingAreaInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState(
    () => searchParams.get('section') ?? ''
  );

  const isEdit = Boolean(exerciseId);
  const existingExercise = useMemo(
    () => (exerciseId ? allExercises.find((ex) => ex.id === exerciseId) : undefined),
    [exerciseId, allExercises]
  );
  const visibleBodyPartIds = useMemo(
    () => visibleBodyParts(exerciseLibraryPrefs.hiddenBodyParts),
    [exerciseLibraryPrefs.hiddenBodyParts]
  );
  const initializedFromExisting = useRef(false);

  const sections: LessonDraftSection[] = useMemo(() => {
    if (lessonDraft.sections?.length) return lessonDraft.sections;
    return [
      { id: 's1', title: 'Warm-up', duration: 0, exerciseIds: [] },
      { id: 's2', title: 'Main section', duration: 0, exerciseIds: [] },
      { id: 's3', title: 'Cool-down', duration: 0, exerciseIds: [] },
    ];
  }, [lessonDraft.sections]);

  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const libraryPath = exercisesPath(selectedSectionId || searchParams.get('section'), searchParams);
  const sectionCategory = selectedSection?.title ?? '';

  useEffect(() => {
    if (!isEdit) return;
    if (!existingExercise) {
      navigate(libraryPath, { replace: true });
      return;
    }
    if (initializedFromExisting.current) return;
    initializedFromExisting.current = true;

    const primaryName = locale === 'he' ? existingExercise.nameHe : existingExercise.name;
    const secondaryName = locale === 'he' ? existingExercise.name : existingExercise.nameHe;
    setNameInput(primaryName);
    setTranslatedName(secondaryName);
    setAreaSelection(areaSelectionFromExercise(existingExercise));
    setSelectedSectionId(sectionIdForCategory(existingExercise.category, sections));
    if (existingExercise.videoUrl) {
      setVideoUrl(existingExercise.videoUrl);
    }
  }, [isEdit, existingExercise, locale, libraryPath, navigate, sections]);

  useEffect(() => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setTranslatedName('');
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setTranslating(true);
      const { name, nameHe } = await bilingualName(trimmed);
      if (cancelled) return;
      const source = detectTextLocale(trimmed);
      setTranslatedName(source === 'he' ? name : nameHe);
      setTranslating(false);
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [nameInput]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError(t('errors.videoFile'));
      return;
    }
    if (videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoFileName(file.name);
    setError(null);
  };

  const removeVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    setVideoUrl('');
    setVideoFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const areaLabel = (areaId: string) =>
    exerciseAreaLabel(
      areaId,
      locale,
      t,
      customExerciseAreas,
      exerciseLibraryPrefs.bodyPartLabels
    );

  const isAreaSelected = (id: string) =>
    (areaSelection.kind === 'standard' && areaSelection.id === id) ||
    (areaSelection.kind === 'custom' && areaSelection.id === id);

  const addCustomArea = () => {
    const area = ensureCustomExerciseArea(customAreaInput);
    if (!area) return;
    setAreaSelection({ kind: 'custom', id: area.id });
    setCustomAreaInput('');
    setShowCustomAreaInput(false);
    setError(null);
  };

  const handleDeleteCategory = (areaId: string) => {
    const label = areaLabel(areaId);
    if (!window.confirm(t('exercises.deleteCategoryConfirm', { name: label }))) return;

    deleteExerciseArea(areaId);
    if (isAreaSelected(areaId)) {
      const fallback = visibleBodyPartIds[0] ?? 'core';
      setAreaSelection({ kind: 'standard', id: fallback });
    }
    if (editingAreaId === areaId) {
      setEditingAreaId(null);
      setEditingAreaInput('');
    }
  };

  const startEditCategory = (areaId: string) => {
    setEditingAreaId(areaId);
    setEditingAreaInput(areaLabel(areaId));
    setShowCustomAreaInput(false);
  };

  const saveEditCategory = async () => {
    if (!editingAreaId || !editingAreaInput.trim()) return;
    const { name, nameHe } = await bilingualName(editingAreaInput.trim());
    updateExerciseArea(editingAreaId, { name, nameHe });
    setEditingAreaId(null);
    setEditingAreaInput('');
  };

  const renderAreaChip = (areaId: string) => {
    if (editingAreaId === areaId) {
      return (
        <form
          key={areaId}
          className="cat-chip-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void saveEditCategory();
          }}
        >
          <input
            className="cat-chip-composer__input"
            value={editingAreaInput}
            autoFocus
            onChange={(e) => setEditingAreaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditingAreaId(null);
                setEditingAreaInput('');
              }
            }}
          />
          <button
            type="submit"
            className="cat-chip-composer__go"
            disabled={!editingAreaInput.trim()}
            aria-label={t('common.save')}
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
        </form>
      );
    }

    return (
      <span
        key={areaId}
        className={`chip cat-chip ${isAreaSelected(areaId) ? 'selected' : ''}`}
      >
        <button
          type="button"
          className="cat-chip__pick"
          onClick={() => {
            if (visibleBodyPartIds.includes(areaId as BodyPart)) {
              setAreaSelection({ kind: 'standard', id: areaId as BodyPart });
            } else {
              setAreaSelection({ kind: 'custom', id: areaId });
            }
            setShowCustomAreaInput(false);
          }}
        >
          {areaLabel(areaId)}
        </button>
        <button
          type="button"
          className="cat-chip__edit"
          aria-label={t('exercises.editCategory')}
          onClick={() => startEditCategory(areaId)}
        >
          <Pencil size={12} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="cat-chip__x"
          aria-label={t('exercises.deleteCategory')}
          onClick={() => handleDeleteCategory(areaId)}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      </span>
    );
  };

  const resolveArea = (): { bodyPart?: BodyPart; customAreaId?: string } | null => {
    if (customAreaInput.trim()) {
      const area = ensureCustomExerciseArea(customAreaInput.trim());
      if (!area) return null;
      return { customAreaId: area.id };
    }
    if (areaSelection.kind === 'custom') {
      if (!customExerciseAreas.some((a) => a.id === areaSelection.id)) return null;
      return { customAreaId: areaSelection.id };
    }
    return { bodyPart: areaSelection.id };
  };

  const handleSubmit = async () => {
    if (!nameInput.trim()) {
      setError(t('errors.exerciseName'));
      return;
    }
    if (!selectedSection) {
      setError(t('errors.exerciseSection'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const [{ name, nameHe }, area] = await Promise.all([
        bilingualName(nameInput.trim()),
        Promise.resolve(resolveArea()),
      ]);
      if (!area) {
        setError(t('errors.exerciseCategory'));
        return;
      }

      const payload = {
        name,
        nameHe,
        category: selectedSection.title,
        ...area,
        videoUrl: videoUrl || '',
      };

      if (isEdit && exerciseId) {
        const updated = updateExercise(exerciseId, payload);
        if (!updated) {
          setError(t('errors.exerciseNotFound'));
          return;
        }
      } else {
        const created = addCustomExercise(payload);
        if (lessonDraft.sections?.length && created) {
          const base = lessonDraft.sections.map((s) => ({
            id: s.id,
            title: s.title,
            duration: s.duration,
            exerciseIds: [...s.exerciseIds],
            notes: s.notes,
          }));
          const idx = base.findIndex((s) => s.id === selectedSection.id);
          if (idx >= 0 && !base[idx].exerciseIds.includes(created.id)) {
            base[idx].exerciseIds = [...base[idx].exerciseIds, created.id];
            const mirrored = syncPilatesMainSides(base, selectedSection.id, lessonDraft.trainingType);
            const packed = durationsFromExercises(mirrored, [...allExercises, created]);
            setLessonDraft({
              sections: packed.sections,
              exerciseIds: packed.exerciseIds,
            });
          }
        }
      }

      setSaved(true);
      setTimeout(() => navigate(libraryPath), 1200);
    } finally {
      setSaving(false);
    }
  };

  const previewNames = nameInput.trim()
    ? detectTextLocale(nameInput) === 'he'
      ? { nameHe: nameInput.trim(), name: translatedName || nameInput.trim() }
      : { name: nameInput.trim(), nameHe: translatedName || nameInput.trim() }
    : { nameHe: t('exercises.previewName'), name: 'New Exercise' };

  const previewExercise = videoUrl
    ? {
        id: 'preview',
        nameHe: previewNames.nameHe,
        name: previewNames.name,
        duration: 0,
        category: sectionCategory,
        bodyPart: areaSelection.kind === 'standard' ? areaSelection.id : undefined,
        customAreaId: areaSelection.kind === 'custom' ? areaSelection.id : undefined,
        videoUrl,
        isCustom: true,
      }
    : null;

  const canSave =
    Boolean(nameInput.trim()) &&
    Boolean(selectedSection) &&
    !saved &&
    !saving &&
    (!isEdit || Boolean(existingExercise));

  const handleDeleteExercise = () => {
    if (!isEdit || !exerciseId || !existingExercise) return;
    const name = locale === 'he' ? existingExercise.nameHe : existingExercise.name;
    if (!window.confirm(t('exercises.deleteExerciseConfirm', { name }))) return;
    deleteExercise(exerciseId);
    navigate(libraryPath);
  };

  const saveLabel = saved ? (
    <>
      <Check size={18} /> {isEdit ? t('exercises.updated') : t('exercises.saved')}
    </>
  ) : saving ? (
    t('exercises.saving')
  ) : (
    isEdit ? t('common.save') : t('exercises.save')
  );

  return (
    <div className="page fade-in add-exercise-page">
      <div className="page-toolbar">
        <BackButton to={libraryPath} label={t('common.back')} />
        <button
          type="button"
          className="ex-picker-done"
          onClick={() => void handleSubmit()}
          disabled={!canSave}
        >
          {saved ? (isEdit ? t('exercises.updated') : t('exercises.saved')) : saving ? t('exercises.saving') : t('common.done')}
        </button>
      </div>

      <h1 className="page-title">
        {isEdit ? t('exercises.editPageTitle') : t('exercises.addPageTitle')}
      </h1>
      <p className="page-subtitle">
        {isEdit ? t('exercises.editSubtitle') : t('exercises.addSubtitle')}
      </p>

      {error && (
        <p className="add-exercise-error" role="alert">
          {error}
        </p>
      )}

      <div className="add-exercise-form">
        <section className="card add-exercise-section">
          <label className="field-label" htmlFor="exercise-name">
            {t('exercises.nameRequired')}
          </label>
          <input
            id="exercise-name"
            className="input"
            placeholder={t('exercises.namePlaceholder')}
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error && !nameInput.trim())}
          />
          {nameInput.trim() ? (
            <p className="field-hint">
              {translating
                ? t('exercises.translating')
                : translatedName
                  ? t('exercises.autoTranslation', { name: translatedName })
                  : null}
            </p>
          ) : null}
        </section>

        <section className="card add-exercise-section">
          <label className="field-label" htmlFor="exercise-section">
            {t('exercises.sectionRequired')}
          </label>
          <div className="add-exercise-select">
            <select
              id="exercise-section"
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={Boolean(error && !selectedSection)}
            >
              <option value="" disabled>
                {t('exercises.sectionPlaceholder')}
              </option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {sectionTitle(section.title, t)}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="add-exercise-select__chevron" aria-hidden />
          </div>
          <p className="field-hint">{t('exercises.sectionHint')}</p>
        </section>

        <section className="card add-exercise-section">
          <p className="section-heading">{t('exercises.category')}</p>
          <div className="cat-filters__row cat-filters__row--wrap">
            {visibleBodyPartIds.map((part) => renderAreaChip(part))}
            {customExerciseAreas.map((area) => renderAreaChip(area.id))}
            {showCustomAreaInput ? (
              <form
                className="cat-chip-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustomArea();
                }}
              >
                <input
                  className="cat-chip-composer__input"
                  placeholder={t('exercises.categoryPlaceholder')}
                  value={customAreaInput}
                  autoFocus
                  onChange={(e) => setCustomAreaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowCustomAreaInput(false);
                      setCustomAreaInput('');
                    }
                  }}
                  onBlur={() => {
                    if (!customAreaInput.trim()) setShowCustomAreaInput(false);
                  }}
                />
                <button
                  type="submit"
                  className="cat-chip-composer__go"
                  disabled={!customAreaInput.trim()}
                  aria-label={t('common.add')}
                >
                  <Check size={14} strokeWidth={2.5} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="chip chip--add"
                onClick={() => setShowCustomAreaInput(true)}
              >
                <Plus size={16} strokeWidth={2.5} aria-hidden />
                {t('exercises.addCategory')}
              </button>
            )}
          </div>
        </section>

        <section className="card add-exercise-section">
          <p className="section-heading">
            {t('exercises.video')} <span>({t('common.optional')})</span>
          </p>
          <div
            className={`add-exercise-upload ${videoUrl ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleFileChange}
            />
            {videoUrl ? (
              <>
                <p style={{ fontWeight: 600, color: 'var(--color-primary-bright)' }}>{t('exercises.uploaded')}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{videoFileName}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 8 }}>{t('exercises.tapReplace')}</p>
              </>
            ) : (
              <>
                <Upload size={28} color="var(--color-primary)" style={{ marginBottom: 8 }} aria-hidden />
                <p style={{ fontWeight: 600 }}>{t('exercises.addVideo')}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {t('exercises.videoHint')}
                </p>
              </>
            )}
          </div>
          {videoUrl ? (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={removeVideo}>
              <X size={16} /> {t('exercises.removeVideo')}
            </button>
          ) : null}
          {previewExercise ? (
            <div className="add-exercise-preview">
              <ExerciseVideo exercise={previewExercise} size="hero" showPlayButton />
            </div>
          ) : null}
        </section>
      </div>

      <div className="add-exercise-footer">
        {isEdit ? (
          <IconButton
            className="add-exercise-delete"
            danger
            aria-label={t('exercises.deleteExercise')}
            onClick={handleDeleteExercise}
          >
            <Trash2 size={18} />
          </IconButton>
        ) : null}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleSubmit()}
          disabled={!canSave}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
