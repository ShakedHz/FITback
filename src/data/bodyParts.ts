import type { Exercise } from './mockData';
import type { CustomExerciseArea } from './customExerciseAreas';
import type { BodyPartLabelOverride } from './exerciseLibraryPrefs';
import type { Locale } from '@/i18n/locale';
import type { TranslateFn } from '@/i18n/LocaleContext';

export type BodyPart = 'core' | 'back' | 'legs' | 'glutes' | 'arms';

export const BODY_PARTS: BodyPart[] = ['core', 'back', 'legs', 'glutes', 'arms'];

const LEGACY_BODY_PART: Record<string, BodyPart> = {
  shoulders: 'arms',
  hips: 'glutes',
  full_body: 'core',
};

const CATEGORY_BODY_PART: Record<string, BodyPart> = {
  'Warm-up': 'core',
  Core: 'core',
  Back: 'back',
  Stretching: 'legs',
  'Cool-down': 'back',
  'Main section': 'core',
  Other: 'core',
};

export function normalizeBodyPart(part: string | undefined): BodyPart {
  if (!part) return 'core';
  if ((BODY_PARTS as readonly string[]).includes(part)) return part as BodyPart;
  return LEGACY_BODY_PART[part] ?? 'core';
}

export function bodyPartFromCategory(category: string): BodyPart {
  return CATEGORY_BODY_PART[category] ?? 'core';
}

export function isStandardBodyPart(value: string): value is BodyPart {
  return (BODY_PARTS as readonly string[]).includes(value);
}

export function getExerciseBodyPart(ex: Exercise): BodyPart {
  return normalizeBodyPart(ex.bodyPart ?? bodyPartFromCategory(ex.category));
}

/** Area id for filters — standard body part or custom area id. */
export function getExerciseAreaId(ex: Exercise): string {
  if (ex.customAreaId) return ex.customAreaId;
  return getExerciseBodyPart(ex);
}

export function exerciseAreaLabel(
  areaId: string,
  locale: Locale,
  t: TranslateFn,
  customAreas: CustomExerciseArea[],
  bodyPartLabels: Partial<Record<BodyPart, BodyPartLabelOverride>> = {}
): string {
  if (isStandardBodyPart(areaId)) {
    const override = bodyPartLabels[areaId];
    if (override) return locale === 'he' ? override.nameHe : override.name;
    return t(`bodyPart.${areaId}`);
  }
  const custom = customAreas.find((a) => a.id === areaId);
  if (custom) return locale === 'he' ? custom.nameHe : custom.name;
  return t(`bodyPart.${normalizeBodyPart(areaId)}`);
}

export function visibleBodyParts(hiddenBodyParts: BodyPart[] = []): BodyPart[] {
  const hidden = new Set(hiddenBodyParts);
  return BODY_PARTS.filter((part) => !hidden.has(part));
}

export function collectAreaIdsFromExercises(
  customAreas: CustomExerciseArea[] = [],
  hiddenBodyParts: BodyPart[] = []
): string[] {
  return [...visibleBodyParts(hiddenBodyParts), ...customAreas.map((area) => area.id)];
}
