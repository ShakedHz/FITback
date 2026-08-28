export type TrainingType = 'pilates' | 'yoga' | 'hiit' | 'barre' | 'cycle' | 'stretch';

export const TRAINING_TYPES: TrainingType[] = [
  'pilates',
  'yoga',
  'hiit',
  'barre',
  'cycle',
  'stretch',
];

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  pilates: 'Pilates',
  yoga: 'Yoga',
  hiit: 'HIIT',
  barre: 'Barre',
  cycle: 'Cycle',
  stretch: 'Stretch',
};

export const TRAINING_TYPE_COLORS: Record<
  TrainingType,
  { bg: string; border: string; text: string }
> = {
  pilates: {
    bg: 'var(--chip-pilates-bg)',
    border: 'var(--chip-pilates-border)',
    text: 'var(--chip-pilates-text)',
  },
  yoga: {
    bg: 'var(--chip-yoga-bg)',
    border: 'var(--chip-yoga-border)',
    text: 'var(--chip-yoga-text)',
  },
  hiit: {
    bg: 'var(--chip-hiit-bg)',
    border: 'var(--chip-hiit-border)',
    text: 'var(--chip-hiit-text)',
  },
  barre: {
    bg: 'var(--chip-barre-bg)',
    border: 'var(--chip-barre-border)',
    text: 'var(--chip-barre-text)',
  },
  cycle: {
    bg: 'var(--chip-cycle-bg)',
    border: 'var(--chip-cycle-border)',
    text: 'var(--chip-cycle-text)',
  },
  stretch: {
    bg: 'var(--chip-stretch-bg)',
    border: 'var(--chip-stretch-border)',
    text: 'var(--chip-stretch-text)',
  },
};

export function getTrainingTypeLabel(type: TrainingType): string {
  return TRAINING_TYPE_LABELS[type];
}

/** Type pickers only make sense when the instructor teaches more than one class type. */
export function canChooseTrainingType(specialties?: TrainingType[] | null): boolean {
  return (specialties?.length ?? 0) > 1;
}

/** Auto bio from selected class types — no free-text needed at signup. */
export function bioFromSpecialties(specialties: TrainingType[]): string {
  const labels = specialties.map((type) => TRAINING_TYPE_LABELS[type]);
  if (labels.length === 0) return '';
  if (labels.length === 1) return `${labels[0]} instructor`;
  if (labels.length === 2) return `${labels[0]} & ${labels[1]} instructor`;
  return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]} instructor`;
}

import type { EventCategory } from './scheduleTypes';

export function trainingTypeToEventCategory(type: TrainingType): EventCategory {
  const map: Record<TrainingType, EventCategory> = {
    pilates: 'pilates',
    yoga: 'yoga',
    hiit: 'hiit',
    barre: 'barre',
    cycle: 'cycle',
    stretch: 'stretch',
  };
  return map[type];
}
