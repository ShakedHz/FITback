import type { Exercise, ExercisePlanNotes } from '@/data/mockData';
import { isSpringSetupEmpty } from '@/data/pilatesSetup';

/** Studio class length instructors actually plan for — not a sum of exercises. */
export const DEFAULT_CLASS_DURATION = 50;
export const CLASS_DURATION_STEP = 5;
export const MIN_CLASS_DURATION = 20;
export const MAX_CLASS_DURATION = 90;

export function clampClassDuration(value: number) {
  const stepped = Math.round(value / CLASS_DURATION_STEP) * CLASS_DURATION_STEP;
  return Math.min(MAX_CLASS_DURATION, Math.max(MIN_CLASS_DURATION, stepped));
}

export interface TimedSection {
  id: string;
  title: string;
  duration: number;
  exerciseIds: string[];
  notes?: Record<string, ExercisePlanNotes>;
}

export function pruneExerciseNotes(
  notes: Record<string, ExercisePlanNotes> | undefined,
  exerciseIds: string[]
): Record<string, ExercisePlanNotes> | undefined {
  if (!notes) return undefined;
  const keep = new Set(exerciseIds);
  const next: Record<string, ExercisePlanNotes> = {};
  for (const id of keep) {
    const entry = notes[id];
    if (!entry) continue;
    const reps = entry.reps?.trim();
    const cue = entry.cue?.trim();
    const springs = isSpringSetupEmpty(entry.springs) ? undefined : entry.springs;
    if (!reps && !cue && !springs) continue;
    next[id] = {
      ...(reps ? { reps } : {}),
      ...(cue ? { cue } : {}),
      ...(springs ? { springs } : {}),
    };
  }
  return Object.keys(next).length ? next : undefined;
}

/** Pack section order and notes. Does not invent minutes from the exercise catalog. */
export function durationsFromExercises(
  sections: {
    id: string;
    title: string;
    duration?: number;
    exerciseIds: string[];
    notes?: Record<string, ExercisePlanNotes>;
  }[],
  _allExercises: Exercise[]
): { sections: TimedSection[]; duration: number; exerciseIds: string[] } {
  const nextSections: TimedSection[] = sections.map((section) => ({
    id: section.id,
    title: section.title,
    exerciseIds: [...section.exerciseIds],
    notes: pruneExerciseNotes(section.notes, section.exerciseIds),
    duration: section.duration ?? 0,
  }));

  const exerciseIds = nextSections.flatMap((s) => s.exerciseIds);
  const sectionTotal = nextSections.reduce((sum, s) => sum + s.duration, 0);
  const duration = sectionTotal > 0 ? sectionTotal : DEFAULT_CLASS_DURATION;

  return { sections: nextSections, duration, exerciseIds };
}
