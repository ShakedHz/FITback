import type { TrainingType } from './trainingTypes';
import type { YogaStyle } from './yogaStyles';
import { DEFAULT_YOGA_STYLE } from './yogaStyles';

export interface SectionShell {
  id: string;
  title: string;
  duration: number;
}

export interface SectionTemplate extends SectionShell {
  exerciseIds: string[];
}

/**
 * General class outline: warm-up, one side, other side, finish.
 */
export const LESSON_SECTION_SHELLS: Record<TrainingType, SectionShell[]> = {
  pilates: [
    { id: 's1', title: 'Warm-up', duration: 10 },
    { id: 's2', title: 'Main section - Right side', duration: 15 },
    { id: 's3', title: 'Main section - Left side', duration: 15 },
    { id: 's4', title: 'Cool-down', duration: 10 },
  ],
  yoga: [
    { id: 's1', title: 'Breath & center', duration: 10 },
    { id: 's2', title: 'Main section', duration: 30 },
    { id: 's3', title: 'Savasana', duration: 10 },
  ],
};

const YOGA_GENERAL: SectionShell[] = [
  { id: 's1', title: 'Breath & center', duration: 10 },
  { id: 's2', title: 'Main section', duration: 30 },
  { id: 's3', title: 'Savasana', duration: 10 },
];

export const YOGA_SECTION_SHELLS: Record<YogaStyle, SectionShell[]> = {
  vinyasa: YOGA_GENERAL,
  ashtanga: YOGA_GENERAL,
  hatha: YOGA_GENERAL,
  yin: YOGA_GENERAL,
  restorative: YOGA_GENERAL,
};

function shellsFor(type: TrainingType, yogaStyle: YogaStyle): SectionShell[] {
  if (type === 'yoga') return YOGA_SECTION_SHELLS[yogaStyle];
  return LESSON_SECTION_SHELLS[type];
}

function buildLessonTemplate(type: TrainingType, yogaStyle: YogaStyle = DEFAULT_YOGA_STYLE): SectionTemplate[] {
  return shellsFor(type, yogaStyle).map((shell) => ({
    ...shell,
    exerciseIds: [],
  }));
}

/** Section outlines for new lessons and AI — titles and durations only. */
export const LESSON_TEMPLATES: Record<TrainingType, SectionTemplate[]> = {
  pilates: buildLessonTemplate('pilates'),
  yoga: buildLessonTemplate('yoga'),
};

export function getLessonTemplate(
  type: TrainingType,
  yogaStyle: YogaStyle = DEFAULT_YOGA_STYLE
): SectionTemplate[] {
  return buildLessonTemplate(type, yogaStyle);
}

/** Section outline for new lessons — titles and durations only, no exercises. */
export function getLessonSectionShell(
  type: TrainingType,
  yogaStyle: YogaStyle = DEFAULT_YOGA_STYLE
): SectionTemplate[] {
  return shellsFor(type, yogaStyle).map((shell) => ({
    ...shell,
    exerciseIds: [],
  }));
}

export function getTemplateDuration(type: TrainingType, yogaStyle: YogaStyle = DEFAULT_YOGA_STYLE): number {
  return shellsFor(type, yogaStyle).reduce((sum, s) => sum + s.duration, 0);
}
