export type { Locale } from './locale';
export { applyDocumentLocale, readStoredLocale } from './locale';
export { LocaleProvider, useI18n, type TranslateFn } from './LocaleContext';
export { translateError } from './errors';
export {
  categoryLabel,
  equipmentLabel,
  eventCategoryLabel,
  exerciseName,
  instructorBio,
  levelLabel,
  sectionTitle,
  canonicalSectionTitle,
  normalizeSectionTitle,
  trainingLabel,
  yogaStyleLabel,
  bodyPartLabel,
  exerciseAreaLabel,
} from './labels';
