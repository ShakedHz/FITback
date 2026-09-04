import type { BodyPart } from './bodyParts';
import { BUILTIN_EXERCISES, type CatalogExercise } from './exerciseCatalog';
import type { Exercise } from './mockData';

export interface BodyPartLabelOverride {
  name: string;
  nameHe: string;
}

export interface BuiltinExercisePatch {
  name?: string;
  nameHe?: string;
  category?: string;
  bodyPart?: BodyPart;
  customAreaId?: string;
  videoUrl?: string;
  duration?: number;
}

export interface ExerciseLibraryPrefs {
  hiddenBuiltinExerciseIds: string[];
  builtinExercisePatches: Record<string, BuiltinExercisePatch>;
  hiddenBodyParts: BodyPart[];
  bodyPartLabels: Partial<Record<BodyPart, BodyPartLabelOverride>>;
}

export const EXERCISE_LIBRARY_PREFS_KEY = 'movana_exercise_library_prefs_v1';

export const EMPTY_EXERCISE_LIBRARY_PREFS: ExerciseLibraryPrefs = {
  hiddenBuiltinExerciseIds: [],
  builtinExercisePatches: {},
  hiddenBodyParts: [],
  bodyPartLabels: {},
};

export function loadExerciseLibraryPrefs(): ExerciseLibraryPrefs {
  try {
    const raw = localStorage.getItem(EXERCISE_LIBRARY_PREFS_KEY);
    if (!raw) return { ...EMPTY_EXERCISE_LIBRARY_PREFS };
    const parsed = JSON.parse(raw) as ExerciseLibraryPrefs;
    return {
      hiddenBuiltinExerciseIds: Array.isArray(parsed.hiddenBuiltinExerciseIds)
        ? parsed.hiddenBuiltinExerciseIds.filter((id) => typeof id === 'string')
        : [],
      builtinExercisePatches:
        parsed.builtinExercisePatches && typeof parsed.builtinExercisePatches === 'object'
          ? parsed.builtinExercisePatches
          : {},
      hiddenBodyParts: Array.isArray(parsed.hiddenBodyParts)
        ? parsed.hiddenBodyParts.filter((p): p is BodyPart => typeof p === 'string')
        : [],
      bodyPartLabels:
        parsed.bodyPartLabels && typeof parsed.bodyPartLabels === 'object'
          ? parsed.bodyPartLabels
          : {},
    };
  } catch {
    return { ...EMPTY_EXERCISE_LIBRARY_PREFS };
  }
}

export function saveExerciseLibraryPrefs(prefs: ExerciseLibraryPrefs): void {
  localStorage.setItem(EXERCISE_LIBRARY_PREFS_KEY, JSON.stringify(prefs));
}

export function applyExerciseLibraryPrefs(
  builtins: CatalogExercise[],
  prefs: ExerciseLibraryPrefs
): Exercise[] {
  const hidden = new Set(prefs.hiddenBuiltinExerciseIds);
  return builtins
    .filter((exercise) => !hidden.has(exercise.id))
    .map((exercise) => {
      const patch = prefs.builtinExercisePatches[exercise.id];
      if (!patch) return { ...exercise };
      const next: Exercise = { ...exercise, ...patch };
      if (patch.bodyPart) {
        next.bodyPart = patch.bodyPart;
        delete next.customAreaId;
      }
      if (patch.customAreaId) {
        next.customAreaId = patch.customAreaId;
        delete next.bodyPart;
      }
      return next;
    });
}

export function isBuiltinExerciseId(id: string): boolean {
  return BUILTIN_EXERCISES.some((exercise) => exercise.id === id);
}
