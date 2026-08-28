import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, GripVertical, Minus, Pencil, CopyPlus } from 'lucide-react';
import { useApp, type LessonDraftSection } from '@/context/AppContext';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import { LessonVideoUpload } from '@/components/LessonCoverUpload';
import {
  TRAINING_TYPE_COLORS,
  type TrainingType,
} from '@/data/trainingTypes';
import { getLessonTemplate } from '@/data/lessonTemplates';
import { inferEquipment } from '@/data/equipmentTypes';
import { durationsFromExercises } from '@/utils/lessonDuration';
import { exercisesPath } from '@/utils/exerciseNav';
import { equipmentLabel, trainingLabel, useI18n } from '@/i18n';

function createSectionId() {
  return `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
  const fromTemplate = searchParams.get('template') === '1';

  const {
    allExercises,
    lessonDraft,
    setLessonDraft,
    setLessonCoverVideo,
    instructor,
    getLessonById,
    loadLessonDraft,
    resetLessonDraft,
  } = useApp();
  const { t } = useI18n();

  const specialties = instructor.specialties;
  const allowedTypes = useMemo(
    () => (specialties.length > 0 ? specialties : (['pilates'] as TrainingType[])),
    [specialties]
  );

  const isBlankPlan =
    fromBlank ||
    (!fromAi &&
      !fromTemplate &&
      !lessonId &&
      (lessonDraft.exerciseIds?.length ?? 0) === 0);

  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (lessonId) {
      if (loadedIdRef.current === lessonId) return;
      const lesson = getLessonById(lessonId);
      if (!lesson) return;
      loadLessonDraft(lesson);
      loadedIdRef.current = lessonId;
      return;
    }

    loadedIdRef.current = null;
    // Keep draft prepared by AI / blank / template entry points
    if (fromAi || fromBlank || fromTemplate) return;
    if (lessonDraft.sourceLessonId || !allowedTypes.includes(lessonDraft.trainingType)) {
      resetLessonDraft('blank');
    }
  }, [
    lessonId,
    fromAi,
    fromBlank,
    fromTemplate,
    getLessonById,
    loadLessonDraft,
    resetLessonDraft,
    allowedTypes,
    lessonDraft.sourceLessonId,
    lessonDraft.trainingType,
  ]);

  const sections = useMemo(() => {
    if (lessonDraft.sections?.length) return lessonDraft.sections;
    // Never auto-fill exercises for a blank build
    if (isBlankPlan) {
      return [
        { id: 's1', title: t('builder.warmup'), duration: 10, exerciseIds: [] as string[] },
        { id: 's2', title: t('builder.main'), duration: 25, exerciseIds: [] as string[] },
        { id: 's3', title: t('builder.cooldown'), duration: 10, exerciseIds: [] as string[] },
      ];
    }
    return getLessonTemplate(lessonDraft.trainingType).map((s) => ({
      id: s.id,
      title: s.title,
      duration: s.duration,
      exerciseIds: [...s.exerciseIds],
    }));
  }, [lessonDraft.sections, lessonDraft.trainingType, isBlankPlan]);

  const getExercise = (id: string) => allExercises.find((e) => e.id === id);

  const timedPlan = useMemo(
    () =>
      durationsFromExercises(
        sections.map((s) => ({ id: s.id, title: s.title, exerciseIds: s.exerciseIds })),
        allExercises
      ),
    [sections, allExercises]
  );

  // Keep draft durations in sync with exercises
  useEffect(() => {
    const sameDuration = timedPlan.duration === lessonDraft.duration;
    const sameSections =
      lessonDraft.sections?.length === timedPlan.sections.length &&
      timedPlan.sections.every(
        (s, i) =>
          s.duration === lessonDraft.sections![i].duration &&
          s.exerciseIds.join(',') === lessonDraft.sections![i].exerciseIds.join(',')
      );
    if (sameDuration && sameSections) return;
    setLessonDraft({
      duration: timedPlan.duration,
      sections: timedPlan.sections,
      exerciseIds: timedPlan.exerciseIds,
    });
  }, [timedPlan, lessonDraft.duration, lessonDraft.sections, setLessonDraft]);

  const [reorder, setReorder] = useState<SectionReorderState | null>(null);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
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
    (nextSections: LessonDraftSection[]) => {
      const timed = durationsFromExercises(
        nextSections.map((s) => ({
          id: s.id,
          title: s.title,
          exerciseIds: s.exerciseIds,
        })),
        allExercises
      );
      setLessonDraft({
        duration: timed.duration,
        sections: timed.sections,
        exerciseIds: timed.exerciseIds,
      });
    },
    [allExercises, setLessonDraft]
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

  const duplicateSection = useCallback(
    (sectionId: string) => {
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return;
      const src = sections[idx];
      const newId = createSectionId();
      const copy: LessonDraftSection = {
        id: newId,
        title: `Copy of ${src.title}`,
        duration: src.duration,
        exerciseIds: [...src.exerciseIds],
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
      { id: createSectionId(), title: t('builder.newSection'), duration: 0, exerciseIds: [] },
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

    // Blank build: only switch type — keep sections empty for the instructor to fill
    if (isBlankPlan) {
      setLessonDraft({
        trainingType: type,
        albumImages: [],
        exerciseIds: [],
        sections: [
          { id: 's1', title: t('builder.warmup'), duration: 0, exerciseIds: [] },
          { id: 's2', title: t('builder.main'), duration: 0, exerciseIds: [] },
          { id: 's3', title: t('builder.cooldown'), duration: 0, exerciseIds: [] },
        ],
        duration: 0,
      });
      return;
    }

    const template = getLessonTemplate(type);
    const timed = durationsFromExercises(
      template.map((s) => ({
        id: s.id,
        title: s.title,
        exerciseIds: [...s.exerciseIds],
      })),
      allExercises
    );

    setLessonDraft({
      trainingType: type,
      albumImages: [],
      exerciseIds: timed.exerciseIds,
      sections: timed.sections,
      duration: timed.duration,
    });
  };

  const equipment = inferEquipment(lessonDraft.trainingType);

  const openExerciseLibrary = (sectionId: string) => {
    const params = new URLSearchParams();
    if (fromBlank) params.set('blank', '1');
    if (fromTemplate) params.set('template', '1');
    if (fromAi) params.set('ai', '1');
    if (lessonId) params.set('lessonId', lessonId);
    navigate(exercisesPath(sectionId, params));
  };

  const displaySections = useMemo(() => {
    if (!reorder) return timedPlan.sections;
    return previewSections(timedPlan.sections, reorder.fromIndex, reorder.insertIndex);
  }, [timedPlan.sections, reorder]);

  return (
    <div className="page fade-in">
      <button className="back-btn" onClick={() => navigate(-1)}>{t('common.back')}</button>
      <h1 className="page-title">
        {lessonId
          ? t('builder.edit')
          : fromAi
            ? t('builder.ai')
            : t('builder.build')}
      </h1>
      {fromAi ? (
        <p className="page-subtitle" style={{ marginTop: 4 }}>
          {t('builder.aiSubtitle')}
        </p>
      ) : isBlankPlan && !lessonId ? (
        <p className="page-subtitle" style={{ marginTop: 4 }}>
          {t('builder.blankSubtitle')}
        </p>
      ) : null}

      <div className="card" style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 8 }}>{t('builder.trainingType')}</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {allowedTypes.map((type) => {
            const colors = TRAINING_TYPE_COLORS[type];
            const active = lessonDraft.trainingType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => selectTrainingType(type)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: `1px solid ${active ? colors.border : 'rgba(var(--color-primary-rgb),0.25)'}`,
                  background: active ? colors.bg : 'rgba(var(--color-card-rgb),0.5)',
                  color: active ? colors.text : 'var(--color-text-muted)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {trainingLabel(type, t)}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginBottom: 14 }}>
          {t('builder.equipment', { equipment: equipmentLabel(equipment, t) })}
          {isBlankPlan ? t('builder.addYourself') : t('builder.templateFor', { type: trainingLabel(lessonDraft.trainingType, t) })}
        </p>

        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>{t('builder.lessonName')}</label>
        <input
          className="input"
          value={lessonDraft.title}
          onChange={(e) => setLessonDraft({ title: e.target.value })}
        />
        <label style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'block', margin: '12px 0 6px' }}>
          {t('builder.description')} <span style={{ color: 'var(--color-text-subtle)', fontWeight: 400 }}>({t('common.optional')})</span>
        </label>
        <textarea
          className="input"
          placeholder={t('builder.aboutPlaceholder')}
          value={lessonDraft.description}
          onChange={(e) => setLessonDraft({ description: e.target.value })}
          rows={3}
          style={{ minHeight: 88, resize: 'vertical', lineHeight: 1.45 }}
        />
      </div>

      <LessonVideoUpload
        lesson={{
          coverVideo: lessonDraft.coverVideo ?? undefined,
          trainingType: lessonDraft.trainingType,
        }}
        coverVideo={lessonDraft.coverVideo}
        onVideoChange={setLessonCoverVideo}
        alt={lessonDraft.title}
      />

      <p className="section-title" style={{ marginTop: 20 }}>{t('builder.plan')}</p>
      <p className={`lesson-section-reorder-hint${reorder ? '' : ' lesson-section-reorder-hint--idle'}`}>
        {reorder ? t('builder.releaseSection') : t('builder.dragReorder')}
      </p>
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
              className={`card lesson-section-card${
                isLifted ? ' lesson-section-card--lifted' : ''
              }${reorder ? ' lesson-section-card--shifting' : ''}${
                highlightedSectionId === section.id ? ' lesson-section-card--highlighted' : ''
              }`}
            >
              <div className="lesson-section-header">
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
                  <GripVertical size={18} />
                </div>

            <div className="lesson-section-heading">
              {editingSectionId === section.id ? (
                <input
                  className="input lesson-section-title-input"
                  value={section.title}
                  autoFocus
                  onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                  onBlur={() => setEditingSectionId(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      setEditingSectionId(null);
                    }
                  }}
                />
              ) : (
                <div className="lesson-section-title-row">
                  <span className="lesson-section-name">{section.title}</span>
                  <button
                    type="button"
                    className="lesson-section-pencil"
                    aria-label={t('builder.editSection')}
                    onClick={() => setEditingSectionId(section.id)}
                  >
                    <Pencil size={14} />
                  </button>
                  {section.duration > 0 && (
                    <span className="lesson-section-duration">{section.duration} {t('common.min')}</span>
                  )}
                </div>
              )}
            </div>

            <div className="lesson-section-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm lesson-section-action-btn lesson-section-duplicate-btn"
                aria-label={
                  section.exerciseIds.length > 0
                    ? t('builder.duplicateWith', { count: section.exerciseIds.length })
                    : t('builder.duplicateEmpty')
                }
                title={
                  section.exerciseIds.length > 0
                    ? t('builder.duplicateTitle', { count: section.exerciseIds.length })
                    : t('builder.duplicateSection')
                }
                onClick={() => duplicateSection(section.id)}
              >
                <CopyPlus size={17} strokeWidth={2.25} aria-hidden />
                {section.exerciseIds.length > 0 && (
                  <span className="lesson-section-duplicate-count">{section.exerciseIds.length}</span>
                )}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm lesson-section-action-btn lesson-section-remove"
                aria-label={t('builder.removeSection')}
                disabled={timedPlan.sections.length <= 1}
                title={timedPlan.sections.length <= 1 ? t('builder.oneRequired') : t('builder.removeSection')}
                onClick={() => deleteSection(section.id)}
              >
                <Minus size={18} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>
          {section.exerciseIds.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', padding: '8px 0 4px' }}>
              {t('builder.noExercises')}
            </p>
          ) : (
            section.exerciseIds.map((eid) => {
              const ex = getExercise(eid);
              if (!ex) return null;
              return (
                <div
                  key={eid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderTop: '1px solid rgba(var(--color-primary-rgb),0.1)',
                  }}
                >
                  <ExerciseVideo exercise={ex} size="row" />
                  <span style={{ flex: 1, fontSize: 14 }}>{ex.nameHe}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{ex.duration} {t('common.min')}</span>
                </div>
              );
            })
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10, width: '100%' }}
            onClick={() => openExerciseLibrary(section.id)}
          >
            <Plus size={16} /> {t('builder.addExercise')}
          </button>
        </div>
          </Fragment>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn-ghost"
        style={{ marginTop: 12, width: '100%' }}
        onClick={addSection}
      >
        <Plus size={16} /> {t('builder.addSection')}
      </button>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => openExerciseLibrary(timedPlan.sections[0]?.id ?? 's1')}
        >
          {t('builder.library')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/preview')}>
          {t('builder.preview')}
        </button>
      </div>
    </div>
  );
}
