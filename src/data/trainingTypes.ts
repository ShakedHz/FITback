import type { EventCategory } from './scheduleTypes';
import { PASTEL_PALETTE } from './scheduleTypes';
import {
  findCustomTrainingType,
  isCustomTrainingTypeId,
  loadCustomTrainingTypes,
  type PastelKey,
} from './customTrainingTypes';

export type BuiltinTrainingType = 'pilates' | 'yoga';

/**
 * Open-ended on purpose: instructors can add their own class type ("Other"),
 * stored as a `custom-…` id in `customTrainingTypes`.
 */
export type TrainingType = BuiltinTrainingType | (string & {});

export const TRAINING_TYPES: BuiltinTrainingType[] = ['pilates', 'yoga'];

export const TRAINING_TYPE_LABELS: Record<BuiltinTrainingType, string> = {
  pilates: 'Pilates',
  yoga: 'Yoga',
};

export interface TrainingTypeTint {
  hex: string;
  rgb: string;
}

export interface TrainingTypeColors {
  bg: string;
  border: string;
  text: string;
}

/** Peach-bloom pastel per class type — same tones as the schedule blocks. */
export const TRAINING_TYPE_TINT: Record<BuiltinTrainingType, TrainingTypeTint> = {
  pilates: { hex: '#BC9188', rgb: '188, 145, 136' },
  yoga: { hex: '#B2A48C', rgb: '178, 164, 140' },
};

export const TRAINING_TYPE_COLORS: Record<BuiltinTrainingType, TrainingTypeColors> = {
  pilates: {
    bg: 'rgba(188, 145, 136, 0.22)',
    border: 'rgba(188, 145, 136, 0.55)',
    text: 'var(--type-pilates-text)',
  },
  yoga: {
    bg: 'rgba(178, 164, 140, 0.24)',
    border: 'rgba(178, 164, 140, 0.6)',
    text: 'var(--type-yoga-text)',
  },
};

export function isBuiltinTrainingType(value: string): value is BuiltinTrainingType {
  return (TRAINING_TYPES as readonly string[]).includes(value);
}

export function isCustomTrainingType(value: string): boolean {
  return isCustomTrainingTypeId(value);
}

/** Accepts the two builtins plus any custom type the instructor has saved. */
export function isTrainingType(value: string): value is TrainingType {
  if (isBuiltinTrainingType(value)) return true;
  return Boolean(findCustomTrainingType(value));
}

/** Builtins first, then the instructor's own types. */
export function allTrainingTypes(): TrainingType[] {
  return [...TRAINING_TYPES, ...loadCustomTrainingTypes().map((item) => item.id)];
}

function tintFromPastel(key: PastelKey): TrainingTypeTint {
  const pastel = PASTEL_PALETTE[key];
  return { hex: pastel.bg, rgb: pastel.rgb };
}

export function trainingTypeTint(type: TrainingType): TrainingTypeTint {
  if (isBuiltinTrainingType(type)) return TRAINING_TYPE_TINT[type];
  const custom = findCustomTrainingType(type);
  return custom ? tintFromPastel(custom.colorKey) : TRAINING_TYPE_TINT.pilates;
}

export function trainingTypeColors(type: TrainingType): TrainingTypeColors {
  if (isBuiltinTrainingType(type)) return TRAINING_TYPE_COLORS[type];
  const custom = findCustomTrainingType(type);
  if (!custom) return TRAINING_TYPE_COLORS.pilates;
  const { rgb } = tintFromPastel(custom.colorKey);
  return {
    bg: `rgba(${rgb}, 0.22)`,
    border: `rgba(${rgb}, 0.55)`,
    text: `var(--type-tint-${custom.colorKey}-text)`,
  };
}

export function getTrainingTypeLabel(type: TrainingType): string {
  if (isBuiltinTrainingType(type)) return TRAINING_TYPE_LABELS[type];
  return findCustomTrainingType(type)?.name ?? type;
}

/** Type pickers only make sense when the instructor teaches more than one class type. */
export function canChooseTrainingType(specialties?: TrainingType[] | null): boolean {
  return (specialties?.length ?? 0) > 1;
}

/** Auto bio from selected class types — no free-text needed at signup. */
export function bioFromSpecialties(specialties: TrainingType[]): string {
  const labels = specialties.map(getTrainingTypeLabel);
  if (labels.length === 0) return '';
  if (labels.length === 1) return `${labels[0]} instructor`;
  if (labels.length === 2) return `${labels[0]} & ${labels[1]} instructor`;
  return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]} instructor`;
}

export function trainingTypeToEventCategory(type: TrainingType): EventCategory {
  return type;
}
