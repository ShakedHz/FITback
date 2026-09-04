import type { TrainingType } from './trainingTypes';
import type { YogaStyle } from './yogaStyles';
import { DEFAULT_YOGA_STYLE } from './yogaStyles';
import { getLessonTemplate } from './lessonTemplates';
import type { BodyPart } from './bodyParts';

export interface CatalogExercise {
  id: string;
  name: string;
  nameHe: string;
  duration: number;
  category: string;
  bodyPart: BodyPart;
  videoUrl: string;
  trainingTypes: TrainingType[];
  yogaStyles?: YogaStyle[];
}

/** Instructors build their own library — no seeded catalog. */
export const BUILTIN_EXERCISES: CatalogExercise[] = [];

/** @deprecated Use BUILTIN_EXERCISES */
export const exercises: CatalogExercise[] = BUILTIN_EXERCISES;

export const LEGACY_EXERCISE_ID_MAP: Record<string, string> = {
  e1: 'pilates_hundred',
  e2: 'pilates_roll_up',
  e3: 'pilates_single_leg_stretch',
  e4: 'pilates_double_leg_stretch',
  e5: 'pilates_criss_cross',
  e6: 'pilates_swan',
  e7: 'pilates_teaser',
  e8: 'pilates_saw',
  e9: 'pilates_spine_stretch',
  e10: 'pilates_child_pose',
};

export function migrateExerciseId(id: string): string {
  return LEGACY_EXERCISE_ID_MAP[id] ?? id;
}

export function getExercisesForType(_type: TrainingType): CatalogExercise[] {
  return [];
}

export function getExercisesForYogaStyle(_style: YogaStyle): CatalogExercise[] {
  return [];
}

export function getExercisesForLesson(
  _trainingType: TrainingType,
  _yogaStyle?: YogaStyle
): CatalogExercise[] {
  return [];
}

export function getDefaultExerciseIds(
  type: TrainingType,
  yogaStyle?: YogaStyle
): string[] {
  return getLessonTemplate(type, yogaStyle ?? DEFAULT_YOGA_STYLE).flatMap((s) => s.exerciseIds);
}

export function findBuiltinExercise(_id: string): CatalogExercise | undefined {
  return undefined;
}

export function getRecoveryExerciseIds(_type: TrainingType): string[] {
  return [];
}

export function getAccessibleExerciseIds(_type: TrainingType): string[] {
  return [];
}
