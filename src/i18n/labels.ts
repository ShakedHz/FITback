import type { EquipmentType } from '@/data/equipmentTypes';
import type { EventCategory } from '@/data/scheduleTypes';
import type { TrainingType } from '@/data/trainingTypes';
import type { TranslateFn } from './LocaleContext';

const CATEGORY_KEYS: Record<string, string> = {
  All: 'category.all',
  'חימום': 'category.warmup',
  'Warm-up': 'category.warmup',
  'ליבה': 'category.core',
  Core: 'category.core',
  'גב': 'category.back',
  Back: 'category.back',
  'מתיחות': 'category.stretching',
  Stretching: 'category.stretching',
  'סיום': 'category.cooldown',
  'Cool-down': 'category.cooldown',
  'אחר': 'category.other',
  Other: 'category.other',
};

const LEVEL_KEYS: Record<string, string> = {
  Beginner: 'level.beginner',
  Intermediate: 'level.intermediate',
  Advanced: 'level.advanced',
};

const SECTION_KEYS: Record<string, string> = {
  'Warm-up': 'builder.warmup',
  'Main section': 'builder.main',
  'Cool-down': 'builder.cooldown',
  'New section': 'builder.newSection',
};

export function trainingLabel(type: TrainingType, t: TranslateFn): string {
  return t(`training.${type}`);
}

export function equipmentLabel(type: EquipmentType, t: TranslateFn): string {
  return t(`equipment.${type}`);
}

export function eventCategoryLabel(type: EventCategory, t: TranslateFn): string {
  return t(`eventCategory.${type}`);
}

export function categoryLabel(cat: string, t: TranslateFn): string {
  const key = CATEGORY_KEYS[cat];
  return key ? t(key) : cat;
}

export function levelLabel(level: string, t: TranslateFn): string {
  const key = LEVEL_KEYS[level];
  return key ? t(key) : level;
}

export function sectionTitle(title: string, t: TranslateFn): string {
  const key = SECTION_KEYS[title];
  return key ? t(key) : title;
}

export function instructorBio(specialties: TrainingType[], t: TranslateFn): string {
  const labels = specialties.map((type) => trainingLabel(type, t));
  if (labels.length === 0) return '';
  if (labels.length === 1) return t('auth.bioOne', { type: labels[0] });
  if (labels.length === 2) return t('auth.bioTwo', { a: labels[0], b: labels[1] });
  return t('auth.bioMany', {
    list: labels.slice(0, -1).join(', '),
    last: labels[labels.length - 1],
  });
}
