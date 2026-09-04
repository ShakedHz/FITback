export type TrainingType = 'pilates' | 'yoga';

export const TRAINING_TYPES: TrainingType[] = ['pilates', 'yoga'];

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  pilates: 'Pilates',
  yoga: 'Yoga',
};

const ACCENT_CHIP = {
  bg: 'var(--chip-bg)',
  border: 'var(--chip-border)',
  text: 'var(--chip-text)',
} as const;

export const TRAINING_TYPE_COLORS: Record<
  TrainingType,
  { bg: string; border: string; text: string }
> = {
  pilates: ACCENT_CHIP,
  yoga: ACCENT_CHIP,
};

export function isTrainingType(value: string): value is TrainingType {
  return (TRAINING_TYPES as readonly string[]).includes(value);
}

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
  return type;
}
