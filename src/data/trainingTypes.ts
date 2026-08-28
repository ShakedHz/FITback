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
  pilates: { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.4)', text: '#93c5fd' },
  yoga: { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)', text: '#6ee7b7' },
  hiit: { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.4)', text: '#fca5a5' },
  barre: { bg: 'rgba(236, 72, 153, 0.18)', border: 'rgba(236, 72, 153, 0.4)', text: '#f9a8d4' },
  cycle: { bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)', text: '#fcd34d' },
  stretch: { bg: 'rgba(20, 184, 166, 0.18)', border: 'rgba(20, 184, 166, 0.4)', text: '#5eead4' },
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
