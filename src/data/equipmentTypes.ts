import type { TrainingType } from './trainingTypes';

export type EquipmentType = 'mat' | 'reformer' | 'bike' | 'barre' | 'none';

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  mat: 'Mat',
  reformer: 'Reformer',
  bike: 'Bike',
  barre: 'Barre',
  none: 'No equipment',
};

export const DEFAULT_EQUIPMENT: Record<TrainingType, EquipmentType> = {
  pilates: 'mat',
  yoga: 'mat',
  hiit: 'none',
  barre: 'barre',
  cycle: 'bike',
  stretch: 'mat',
};

export function inferEquipment(
  trainingType: TrainingType,
  tags: string[] = []
): EquipmentType {
  if (tags.some((t) => /reformer|Reformer/i.test(t))) return 'reformer';
  return DEFAULT_EQUIPMENT[trainingType];
}

/** New pilates plans default to reformer so springs/props are available. */
export function defaultPlanEquipment(trainingType: TrainingType): EquipmentType {
  if (trainingType === 'pilates') return 'reformer';
  return DEFAULT_EQUIPMENT[trainingType];
}
