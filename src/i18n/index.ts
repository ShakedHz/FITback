export type { Locale } from './locale';
export { applyDocumentLocale, readStoredLocale } from './locale';
export { LocaleProvider, useI18n, type TranslateFn } from './LocaleContext';
export { translateError } from './errors';
export {
  categoryLabel,
  equipmentLabel,
  eventCategoryLabel,
  instructorBio,
  levelLabel,
  sectionTitle,
  trainingLabel,
} from './labels';
