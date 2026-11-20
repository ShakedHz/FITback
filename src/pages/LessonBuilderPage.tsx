import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Minus, GripVertical, CopyPlus, X, MoreVertical, ChevronDown } from 'lucide-react';
import { BackButton } from '@/components/IconToolbar';
import { PilatesPropsRow, SpringPicker } from '@/components/PilatesSetup';
import { useApp, type LessonDraftSection } from '@/context/AppContext';
import { LessonVideoUpload } from '@/components/LessonCoverUpload';
import {
  canChooseTrainingType,
  type TrainingType,
} from '@/data/trainingTypes';
import { getLessonSectionShell } from '@/data/lessonTemplates';
import { DEFAULT_YOGA_STYLE, YOGA_STYLES, type YogaStyle } from '@/data/yogaStyles';
import { defaultPlanEquipment } from '@/data/equipmentTypes';
import { isSpringSetupEmpty, type SpringSetup } from '@/data/pilatesSetup';
import { durationsFromExercises, DEFAULT_CLASS_DURATION, CLASS_DURATION_STEP, MIN_CLASS_DURATION, MAX_CLASS_DURATION, clampClassDuration } from '@/utils/lessonDuration';
import { exercisesPath } from '@/utils/exerciseNav';
import { equipmentLabel, exerciseName, levelLabel, sectionTitle, canonicalSectionTitle, trainingLabel, yogaStyleLabel, useI18n } from '@/i18n';
import { syncPilatesMainSides } from '@/utils/mirroredSections';
import type { ExercisePlanNotes, Lesson, LessonLevel } from '@/data/mockData';
import { LESSON_LEVELS } from '@/data/mockData';
import '@/components/ExerciseVideo.css';
import './LessonBuilder.css';

function createSectionId() {
  return `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const MIN_REPS = 0;
const MAX_REPS = 99;

function parseReps(value?: string) {
  if (!value) return 0;
  const match = value.match(/\d+/);
  if (!match) return 0;
  return Math.min(MAX_REPS, Math.max(MIN_REPS, Number(match[0])));
}

const DRAG_ACTIVATE_PX = 6;
const AUTO_SCROLL_EDGE_PX = 64;
const AUTO_SCROLL_STEP_PX = 14;

interface SectionReorderState {
  sectionId: string;
  fromIndex: number;
  insertIndex: number;
}

interface PendingSectionDrag {
  sectionId: string;
  fromIndex: number;
  startX: number;
  startY: number;
  activated: boolean;
}

function insertIndexAtY(clientY: number, mids: number[]) {
  for (let i = 0; i < mids.length; i++) {
    if (clientY < mids[i]) return i;
  }
  return mids.length;
}

function previewSections(
  sections: LessonDraftSection[],
  fromIndex: number,
  insertIndex: number
): LessonDraftSection[] {
  if (insertIndex === fromIndex || insertIndex === fromIndex + 1) return sections;
  let toIndex = insertIndex;
  if (fromIndex < toIndex) toIndex -= 1;
  const next = [...sections];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function LessonBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get('lessonId');
  const fromAi = searchParams.get('ai') === '1';
  const fromBlank = searchParams.get('blank') === '1';
  const from = searchParams.get('from');

  const {
    allExercises,
    lessonDraft,
    setLessonDraft,
    setLessonCoverVideo,
    instructor,
    getLessonById,
    loadLessonDraft,
    resetLessonDraft,
    addCreatedLesson,
    updateCreatedLesson,
  } = useApp();
  const { t, locale } = useI18n();

  const specialties = instructor.specialties;
  const allowedTypes = useMemo(
    () => (specialties.length > 0 ? specialties : (['pilates'] as TrainingType[])),
    [specialties]
  );
  const showTypeChoice = canChooseTrainingType(specialties);

  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lessonId) {
      if (loadedIdRef.current === lessonId) return;
      if (lessonDraft.sourceLessonId === lessonId) {
        loadedIdRef.current = lessonId;
        return;
      }
      const lesson = getLessonById(lessonId);
      if (!lesson) return;
      loadLessonDraft(lesson);
      loadedIdRef.current = lessonId;
      return;
    }

    loadedIdRef.current = null;
    if (fromAi || fromBlank) return;
    if (lessonDraft.sourceLessonId || !allowedTypes.includes(lessonDraft.trainingType)) {
      resetLessonDraft();
    }
  }, [
    lessonId,
    fromAi,
    fromBlank,
    getLessonById,
    loadLessonDraft,
    resetLessonDraft,
    allowedTypes,
    lessonDraft.sourceLessonId,
    lessonDraft.trainingType,
  ]);

  const isYoga = lessonDraft.trainingType === 'yoga';
  const yogaStyle = lessonDraft.yogaStyle ?? DEFAULT_YOGA_STYLE;

  const sections = useMemo((): LessonDraftSection[] => {
    if (lessonDraft.sections?.length) return lessonDraft.sections;
    return getLessonSectionShell(lessonDraft.trainingType, yogaStyle).map((s) => ({
      id: s.id,
      title: s.title,
      duration: s.duration,
      exerciseIds: [],
    }));
  }, [lessonDraft.sections, lessonDraft.trainingType, yogaStyle]);

  const getExercise = (id: string) => allExercises.find((e) => e.id === id);

  const timedPlan = useMemo(
    () =>
      durationsFromExercises(
        sections.map((s) => ({
          id: s.id,
          title: s.title,
          duration: s.duration,
          exerciseIds: s.exerciseIds,
          notes: s.notes,
        })),
        allExercises
      ),
    [sections, allExercises]
  );

  // Keep section membership in sync without changing class length
  useEffect(() => {
    const sameSections =
      lessonDraft.sections?.length === timedPlan.sections.length &&
      timedPlan.sections.every(
        (s, i) =>
          s.exerciseIds.join(',') === lessonDraft.sections![i].exerciseIds.join(',')
      );
    if (sameSections) return;
    setLessonDraft({
      sections: timedPlan.sections,
      exerciseIds: timedPlan.exerciseIds,
    });
  }, [timedPlan, lessonDraft.sections, setLessonDraft]);

  const [reorder, setReorder] = useState<SectionReorderState | null>(null);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const skipSectionTitleCommitRef = useRef(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openSpringKey, setOpenSpringKey] = useState<string | null>(null);

  const equipment = lessonDraft.equipment ?? defaultPlanEquipment(lessonDraft.trainingType);
  const isPilates = lessonDraft.trainingType === 'pilates';
  const isReformer = isPilates && equipment === 'reformer';

  useEffect(() => {
    if (!openMenuId) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('.builder-block__menu-wrap')) return;
      setOpenMenuId(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [openMenuId]);
  const sectionListRef = useRef<HTMLDivElement>(null);
  const pendingDragRef = useRef<PendingSectionDrag | null>(null);
  const dragSnapshotRef = useRef<number[]>([]);
  const reorderRef = useRef<SectionReorderState | null>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);

  const captureSectionMids = useCallback(() => {
    const cards = sectionListRef.current?.querySelectorAll<HTMLElement>('[data-section-id]');
    if (!cards?.length) return [];
    return Array.from(cards).map((card) => {
      const rect = card.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
  }, []);

  const autoScrollWhileDragging = useCallback((clientY: number) => {
    const scroller =
      scrollParentRef.current ??
      sectionListRef.current?.closest<HTMLElement>('.app-content') ??
      document.querySelector<HTMLElement>('.app-content');
    if (!scroller) return;

    const rect = scroller.getBoundingClientRect();
    if (clientY < rect.top + AUTO_SCROLL_EDGE_PX) {
      scroller.scrollTop -= AUTO_SCROLL_STEP_PX;
    } else if (clientY > rect.bottom - AUTO_SCROLL_EDGE_PX) {
      scroller.scrollTop += AUTO_SCROLL_STEP_PX;
    }
  }, []);

  const applySections = useCallback(
    (nextSections: LessonDraftSection[], changedSectionId?: string) => {
      const synced = changedSectionId
        ? syncPilatesMainSides(nextSections, changedSectionId, lessonDraft.trainingType)
        : nextSections;
      const timed = durationsFromExercises(
        synced.map((s) => ({
          id: s.id,
          title: s.title,
          duration: s.duration,
          exerciseIds: s.exerciseIds,
          notes: s.notes,
        })),
        allExercises
      );
      setLessonDraft({
        sections: timed.sections,
        exerciseIds: timed.exerciseIds,
      });
    },
    [allExercises, lessonDraft.trainingType, setLessonDraft]
  );

  const updateSectionTitle = useCallback(
    (sectionId: string, title: string) => {
      applySections(sections.map((s) => (s.id === sectionId ? { ...s, title } : s)));
    },
    [sections, applySections]
  );

  const deleteSection = useCallback(
    (sectionId: string) => {
      if (sections.length <= 1) return;
      applySections(sections.filter((s) => s.id !== sectionId));
    },
    [sections, applySections]
  );

  const removeExercise = useCallback(
    (sectionId: string, exerciseId: string) => {
      applySections(
        sections.map((s) =>
          s.id === sectionId
            ? { ...s, exerciseIds: s.exerciseIds.filter((id) => id !== exerciseId) }
            : s
        ),
        sectionId
      );
    },
    [sections, applySections]
  );

  const duplicateSection = useCallback(
    (sectionId: string) => {
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return;
      const src = sections[idx];
      const newId = createSectionId();
      const copy: LessonDraftSection = {
        id: newId,
        title: src.title,
        duration: src.duration,
        exerciseIds: [...src.exerciseIds],
        notes: src.notes ? { ...src.notes } : undefined,
      };
      const next = [...sections];
      next.splice(idx + 1, 0, copy);
      applySections(next);
      setHighlightedSectionId(newId);
      window.setTimeout(() => setHighlightedSectionId(null), 1600);
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-section-id="${newId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    },
    [sections, applySections]
  );

  const moveExercise = useCallback(
    (sectionId: string, fromIndex: number, toIndex: number) => {
      applySections(
        sections.map((s) => {
          if (s.id !== sectionId) return s;
          if (toIndex < 0 || toIndex >= s.exerciseIds.length) return s;
          const ids = [...s.exerciseIds];
          const [id] = ids.splice(fromIndex, 1);
          ids.splice(toIndex, 0, id);
          return { ...s, exerciseIds: ids };
        }),
        sectionId
      );
    },
    [sections, applySections]
  );

  const updateExerciseNote = useCallback(
    (sectionId: string, exerciseId: string, patch: Partial<ExercisePlanNotes>) => {
      applySections(
        sections.map((s) => {
          if (s.id !== sectionId) return s;
          const prev = s.notes?.[exerciseId] ?? {};
          const merged: ExercisePlanNotes = { ...prev, ...patch };
          if (isSpringSetupEmpty(merged.springs)) {
            delete merged.springs;
          }
          return {
            ...s,
            notes: {
              ...s.notes,
              [exerciseId]: merged,
            },
          };
        })
      );
    },
    [sections, applySections]
  );

  const setExerciseReps = useCallback(
    (sectionId: string, exerciseId: string, next: number) => {
      const reps = Math.min(MAX_REPS, Math.max(MIN_REPS, Math.round(next)));
      updateExerciseNote(sectionId, exerciseId, { reps: reps > 0 ? String(reps) : '' });
    },
    [updateExerciseNote]
  );

  const setExerciseSprings = useCallback(
    (sectionId: string, exerciseId: string, springs: SpringSetup | undefined) => {
      updateExerciseNote(sectionId, exerciseId, { springs });
    },
    [updateExerciseNote]
  );

  const exDragRef = useRef<{ sectionId: string; index: number; lastY: number } | null>(null);

  const beginExerciseDrag = useCallback(
    (sectionId: string, index: number, clientY: number) => {
      exDragRef.current = { sectionId, index, lastY: clientY };
      document.body.classList.add('exercise-reordering');
    },
    []
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = exDragRef.current;
      if (!drag) return;
      const dy = e.clientY - drag.lastY;
      if (Math.abs(dy) < 28) return;
      const dir = dy > 0 ? 1 : -1;
      moveExercise(drag.sectionId, drag.index, drag.index + dir);
      drag.index += dir;
      drag.lastY = e.clientY;
    };
    const onUp = () => {
      if (!exDragRef.current) return;
      exDragRef.current = null;
      document.body.classList.remove('exercise-reordering');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.classList.remove('exercise-reordering');
    };
  }, [moveExercise]);

  const moveSection = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx || toIdx < 0 || toIdx >= sections.length) return;
      const next = [...sections];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      applySections(next);
    },
    [sections, applySections]
  );

  const addSection = useCallback(() => {
    applySections([
      ...sections,
      { id: createSectionId(), title: 'New section', duration: 0, exerciseIds: [] },
    ]);
  }, [sections, applySections]);

  const beginHandleDrag = useCallback(
    (sectionId: string, fromIndex: number, clientX: number, clientY: number) => {
      pendingDragRef.current = {
        sectionId,
        fromIndex,
        startX: clientX,
        startY: clientY,
        activated: false,
      };
      scrollParentRef.current =
        sectionListRef.current?.closest<HTMLElement>('.app-content') ?? null;
    },
    []
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const pending = pendingDragRef.current;
      if (!pending) return;

      if (!pending.activated) {
        const distance = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
        if (distance < DRAG_ACTIVATE_PX) return;

        pending.activated = true;
        dragSnapshotRef.current = captureSectionMids();
        document.body.classList.add('lesson-section-reordering');
        navigator.vibrate?.(10);

        const insertIndex = insertIndexAtY(e.clientY, dragSnapshotRef.current);
        const next = {
          sectionId: pending.sectionId,
          fromIndex: pending.fromIndex,
          insertIndex,
        };
        reorderRef.current = next;
        setReorder(next);
        return;
      }

      autoScrollWhileDragging(e.clientY);
      const insertIndex = insertIndexAtY(e.clientY, dragSnapshotRef.current);
      const current = reorderRef.current;
      if (!current || insertIndex === current.insertIndex) return;

      const next = { ...current, insertIndex };
      reorderRef.current = next;
      setReorder(next);
    };

    const onPointerUp = () => {
      const pending = pendingDragRef.current;
      if (!pending) return;

      if (!pending.activated) {
        pendingDragRef.current = null;
        return;
      }

      const active = reorderRef.current;
      if (active) {
        const { fromIndex, insertIndex } = active;
        const sectionCount = dragSnapshotRef.current.length;
        if (insertIndex !== fromIndex && insertIndex !== fromIndex + 1) {
          let toIndex = insertIndex;
          if (fromIndex < toIndex) toIndex -= 1;
          if (toIndex >= 0 && toIndex < sectionCount) {
            moveSection(fromIndex, toIndex);
          }
        }
      }

      pendingDragRef.current = null;
      dragSnapshotRef.current = [];
      reorderRef.current = null;
      scrollParentRef.current = null;
      setReorder(null);
      document.body.classList.remove('lesson-section-reordering');
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.body.classList.remove('lesson-section-reordering');
    };
  }, [moveSection, captureSectionMids, autoScrollWhileDragging]);

  const selectTrainingType = (type: TrainingType) => {
    if (!allowedTypes.includes(type) || type === lessonDraft.trainingType) return;
    const nextYogaStyle = type === 'yoga' ? DEFAULT_YOGA_STYLE : undefined;

    setLessonDraft({
      trainingType: type,
      yogaStyle: nextYogaStyle,
      equipment: defaultPlanEquipment(type),
      props: type === 'pilates' ? lessonDraft.props : [],
      albumImages: [],
      exerciseIds: [],
      sections: getLessonSectionShell(type, nextYogaStyle),
    });
  };

  const selectYogaStyle = (style: YogaStyle) => {
    if (!isYoga || style === yogaStyle) return;
    setLessonDraft({
      yogaStyle: style,
      exerciseIds: [],
      sections: getLessonSectionShell('yoga', style),
    });
  };

  const existing = lessonId ? getLessonById(lessonId) : undefined;

  const backTo =
    from === 'library'
      ? '/library'
      : lessonId
        ? `/lesson/${lessonId}`
        : from === 'create' || fromAi
          ? '/create'
          : '/library';

  const saveToLibrary = () => {
    const title = lessonDraft.title.trim();
    if (!title) return;

    const planSections = timedPlan.sections.map((section) => ({
      id: section.id,
      title: section.title,
      duration: section.duration,
      exercises: section.exerciseIds
        .map((id) => {
          const ex = allExercises.find((e) => e.id === id);
          if (!ex) return null;
          const notes = section.notes?.[id];
          return {
            ...ex,
            reps: notes?.reps,
            cue: notes?.cue,
            springs: notes?.springs,
          };
        })
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    }));

    const description =
      lessonDraft.description.trim() ||
      t('preview.defaultDesc', { type: trainingLabel(lessonDraft.trainingType, t).toLowerCase() });

    const lesson: Lesson = {
      id: existing?.id ?? `l-${Date.now()}`,
      title,
      instructorId: instructor.id,
      instructorName: instructor.name,
      duration: clampClassDuration(lessonDraft.duration || DEFAULT_CLASS_DURATION),
      level: lessonDraft.level ?? existing?.level ?? 'Intermediate',
      focus: lessonDraft.focus.trim() || undefined,
      trainingType: lessonDraft.trainingType,
      yogaStyle: isYoga ? yogaStyle : undefined,
      equipment: lessonDraft.equipment ?? defaultPlanEquipment(lessonDraft.trainingType),
      props:
        (lessonDraft.equipment ?? defaultPlanEquipment(lessonDraft.trainingType)) === 'reformer'
          ? lessonDraft.props
          : undefined,
      tags: existing?.tags ?? [lessonDraft.trainingType],
      rating: existing?.rating ?? 0,
      reviews: existing?.reviews ?? 0,
      price: existing?.price ?? 0,
      likes: existing?.likes ?? 0,
      comments: existing?.comments ?? 0,
      description,
      sections: planSections,
      isCreated: true,
      isOwned: true,
      isStarter: false,
      coverVideo: lessonDraft.coverVideo ?? existing?.coverVideo,
      coverImage: existing?.coverImage,
      albumImages: existing?.albumImages ?? [],
    };

    if (existing) updateCreatedLesson(lesson);
    else addCreatedLesson(lesson);

    resetLessonDraft();
    navigate('/library');
  };

  const openExerciseLibrary = (sectionId: string) => {
    const params = new URLSearchParams();
    if (fromBlank) params.set('blank', '1');
    if (fromAi) params.set('ai', '1');
    if (lessonId) params.set('lessonId', lessonId);
    if (from) params.set('from', from);
    navigate(exercisesPath(sectionId, params));
  };

  const displaySections = useMemo(() => {
    if (!reorder) return timedPlan.sections;
    return previewSections(timedPlan.sections, reorder.fromIndex, reorder.insertIndex);
  }, [timedPlan.sections, reorder]);

  const canSave = Boolean(lessonDraft.title.trim());

  return (
    <div className="page fade-in builder">
      <div className="page-toolbar">
        <BackButton to={backTo} label={t('common.back')} />
        <button
          type="button"
          className="builder-save-btn"
          disabled={!canSave}
          onClick={saveToLibrary}
        >
          {lessonId ? t('builder.saveChanges') : t('builder.addToLibrary')}
        </button>
      </div>

      <div className="builder-sheet">
        <div className="builder-field">
          <label className="builder-field__label" htmlFor="builder-title">
            {t('builder.lessonName')}
          </label>
          <input
            id="builder-title"
            className="input"
            placeholder={t('builder.untitledPlaceholder')}
            value={lessonDraft.title}
            onChange={(e) => setLessonDraft({ title: e.target.value })}
          />
        </div>
        <div className="builder-field">
          <label className="builder-field__label" htmlFor="builder-focus">
            {t('builder.focus')}
          </label>
          <input
            id="builder-focus"
            className="input"
            placeholder={t('builder.focusPlaceholder')}
            value={lessonDraft.focus ?? ''}
            onChange={(e) => setLessonDraft({ focus: e.target.value })}
          />
        </div>
        <div className={`builder-field-row${showTypeChoice ? '' : ' builder-field-row--single-type'}`}>
          {showTypeChoice && (
            <div className="builder-field">
              <label className="builder-field__label" htmlFor="builder-type">
                {t('builder.trainingType')}
              </label>
              <div className="builder-field__control">
                <select
                  id="builder-type"
                  value={lessonDraft.trainingType}
                  onChange={(e) => selectTrainingType(e.target.value as TrainingType)}
                >
                  {allowedTypes.map((type) => (
                    <option key={type} value={type}>
                      {trainingLabel(type, t)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="builder-field__chevron" aria-hidden />
              </div>
            </div>
          )}
          {isYoga && (
            <div className="builder-field">
              <label className="builder-field__label" htmlFor="builder-yoga-style">
                {t('builder.yogaStyle')}
              </label>
              <div className="builder-field__control">
                <select
                  id="builder-yoga-style"
                  value={yogaStyle}
                  onChange={(e) => selectYogaStyle(e.target.value as YogaStyle)}
                >
                  {YOGA_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {yogaStyleLabel(style, t)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="builder-field__chevron" aria-hidden />
              </div>
            </div>
          )}
          <div className="builder-field">
            <label className="builder-field__label" htmlFor="builder-level">
              {t('builder.level')}
            </label>
            <div className="builder-field__control">
              <select
                id="builder-level"
                value={lessonDraft.level ?? 'Intermediate'}
                onChange={(e) => setLessonDraft({ level: e.target.value as LessonLevel })}
              >
                {LESSON_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {levelLabel(level, t)}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="builder-field__chevron" aria-hidden />
            </div>
          </div>
          <div className="builder-field builder-field--duration">
            <span className="builder-field__label">{t('builder.classDuration')}</span>
            <div className="builder-stepper">
              <button
                type="button"
                disabled={clampClassDuration(lessonDraft.duration || DEFAULT_CLASS_DURATION) <= MIN_CLASS_DURATION}
                aria-label={t('builder.durationLess')}
                onClick={() =>
                  setLessonDraft({
                    duration: clampClassDuration(
                      (lessonDraft.duration || DEFAULT_CLASS_DURATION) - CLASS_DURATION_STEP
                    ),
                  })
                }
              >
                <Minus size={14} />
              </button>
              <span className="builder-stepper__value">
                {clampClassDuration(lessonDraft.duration || DEFAULT_CLASS_DURATION)}
              </span>
              <button
                type="button"
                disabled={clampClassDuration(lessonDraft.duration || DEFAULT_CLASS_DURATION) >= MAX_CLASS_DURATION}
                aria-label={t('builder.durationMore')}
                onClick={() =>
                  setLessonDraft({
                    duration: clampClassDuration(
                      (lessonDraft.duration || DEFAULT_CLASS_DURATION) + CLASS_DURATION_STEP
                    ),
                  })
                }
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
        {isPilates && (
          <>
            <div className="builder-field">
              <span className="builder-field__label">{t('builder.equipment')}</span>
              <div className="pilates-segment" role="group" aria-label={t('builder.equipment')}>
                <button
                  type="button"
                  className={`pilates-segment__opt${equipment === 'mat' ? ' is-on' : ''}`}
                  aria-pressed={equipment === 'mat'}
                  onClick={() => setLessonDraft({ equipment: 'mat' })}
                >
                  {equipmentLabel('mat', t)}
                </button>
                <button
                  type="button"
                  className={`pilates-segment__opt${equipment === 'reformer' ? ' is-on' : ''}`}
                  aria-pressed={equipment === 'reformer'}
                  onClick={() => setLessonDraft({ equipment: 'reformer' })}
                >
                  {t('builder.apparatus')}
                </button>
              </div>
            </div>
            {isReformer && (
              <PilatesPropsRow
                selected={lessonDraft.props}
                onChange={(props) => setLessonDraft({ props })}
              />
            )}
          </>
        )}
        <p className="section-title builder-plan-label">{t('builder.plan')}</p>
      <div
        ref={sectionListRef}
        className={`lesson-section-list${reorder ? ' lesson-section-list--reordering' : ''}`}
      >
        {displaySections.map((section) => {
          const sectionIndex = timedPlan.sections.findIndex((s) => s.id === section.id);
          const isLifted = reorder?.sectionId === section.id;
          return (
            <Fragment key={section.id}>
              <div
                data-section-id={section.id}
                className={`builder-block lesson-section-card${
                  isLifted ? ' builder-block--lifted lesson-section-card--lifted' : ''
                }${
                  highlightedSectionId === section.id
                    ? ' builder-block--highlighted lesson-section-card--highlighted'
                    : ''
                }`}
              >
                <div className="builder-block__head">
                  <div
                    className="lesson-section-grip"
                    role="button"
                    tabIndex={0}
                    aria-label={t('builder.dragAria')}
                    onPointerDown={(e) => {
                      if (e.button !== 0 || reorder) return;
                      e.preventDefault();
                      e.stopPropagation();
                      beginHandleDrag(section.id, sectionIndex, e.clientX, e.clientY);
                    }}
                  >
                    <GripVertical size={16} />
                  </div>
                  {editingSectionId === section.id ? (
                    <input
                      className="builder-block__title-input"
                      value={editingSectionTitle}
                      autoFocus
                      onChange={(e) => setEditingSectionTitle(e.target.value)}
                      onBlur={() => {
                        if (skipSectionTitleCommitRef.current) {
                          skipSectionTitleCommitRef.current = false;
                          return;
                        }
                        const next = canonicalSectionTitle(editingSectionTitle, t);
                        if (next) updateSectionTitle(section.id, next);
                        setEditingSectionId(null);
                        setEditingSectionTitle('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                          skipSectionTitleCommitRef.current = true;
                          setEditingSectionId(null);
                          setEditingSectionTitle('');
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="builder-block__title"
                      onClick={() => {
                        setEditingSectionId(section.id);
                        setEditingSectionTitle(sectionTitle(section.title, t));
                      }}
                    >
                      {sectionTitle(section.title, t)}
                    </button>
                  )}
                  <div className="builder-block__menu-wrap">
                    <button
                      type="button"
                      className="builder-block__menu-btn"
                      aria-label={t('builder.sectionMenu')}
                      onClick={() => {
                        setOpenSpringKey(null);
                        setOpenMenuId((id) => (id === section.id ? null : section.id));
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === section.id && (
                      <div className="builder-block__menu">
                        <button
                          type="button"
                          onClick={() => {
                            duplicateSection(section.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <CopyPlus size={14} />
                          {t('builder.duplicateSection')}
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          disabled={timedPlan.sections.length <= 1}
                          onClick={() => {
                            deleteSection(section.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <X size={14} />
                          {t('builder.removeSection')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="builder-block__list">
                {section.exerciseIds.length > 0 && (
                  <div className={`builder-ex-cols${isReformer ? ' builder-ex-cols--springs' : ''}`}>
                    <span className="builder-ex-cols__grip" aria-hidden />
                    <span className="builder-ex-cols__name" />
                    {isReformer ? (
                      <span className="builder-ex-cols__springs">{t('builder.springs')}</span>
                    ) : null}
                    <span className="builder-ex-cols__reps">{t('builder.reps')}</span>
                    <span className="builder-ex-cols__remove" aria-hidden />
                  </div>
                )}

                {section.exerciseIds.map((eid, exIdx) => {
                  const ex = getExercise(eid);
                  if (!ex) return null;
                  const notes = section.notes?.[eid];
                  const reps = parseReps(notes?.reps);
                  const springKey = `${section.id}:${eid}`;
                  return (
                    <div key={eid} className="builder-ex" data-exercise-id={eid}>
                      <div
                        className="builder-ex__grip"
                        role="button"
                        tabIndex={0}
                        aria-label={t('builder.dragAria')}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          e.stopPropagation();
                          beginExerciseDrag(section.id, exIdx, e.clientY);
                        }}
                      >
                        <GripVertical size={14} />
                      </div>
                      <span className="builder-ex__name">{exerciseName(ex, locale)}</span>
                      {isReformer && (
                        <SpringPicker
                          setup={notes?.springs}
                          open={openSpringKey === springKey}
                          onOpenChange={(open) => {
                            setOpenMenuId(null);
                            setOpenSpringKey(open ? springKey : null);
                          }}
                          onChange={(springs) => setExerciseSprings(section.id, eid, springs)}
                        />
                      )}
                      <div className="builder-reps">
                        <button
                          type="button"
                          disabled={reps <= MIN_REPS}
                          aria-label={t('builder.repsLess')}
                          onClick={() => setExerciseReps(section.id, eid, reps - 1)}
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          className="builder-reps__value"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label={t('builder.reps')}
                          value={reps === 0 ? '' : String(reps)}
                          placeholder="0"
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            if (digits === '') {
                              setExerciseReps(section.id, eid, 0);
                              return;
                            }
                            setExerciseReps(section.id, eid, Number(digits));
                          }}
                        />
                        <button
                          type="button"
                          disabled={reps >= MAX_REPS}
                          aria-label={t('builder.repsMore')}
                          onClick={() => setExerciseReps(section.id, eid, reps + 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="builder-ex__remove"
                        aria-label={t('builder.removeExercise')}
                        onClick={() => removeExercise(section.id, eid)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  className="builder-add-ex"
                  onClick={() => openExerciseLibrary(section.id)}
                >
                  <Plus size={16} />
                  {section.exerciseIds.length === 0
                    ? t('builder.addExercise')
                    : t('builder.addExerciseMore')}
                </button>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      </div>

      <button type="button" className="btn btn-ghost builder-add-section" onClick={addSection}>
        <Plus size={16} /> {t('builder.addSection')}
      </button>

      <details className="builder-extras">
        <summary>{t('builder.extras')}</summary>
        <LessonVideoUpload
          lesson={{
            coverVideo: lessonDraft.coverVideo ?? undefined,
            trainingType: lessonDraft.trainingType,
          }}
          coverVideo={lessonDraft.coverVideo}
          onVideoChange={setLessonCoverVideo}
          alt={lessonDraft.title}
        />
      </details>
    </div>
  );
}
