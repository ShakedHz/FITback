import type { Exercise } from '@/data/mockData';
import { findBuiltinExercise } from '@/data/exerciseCatalog';
import { getLessonTemplate } from '@/data/lessonTemplates';
import type { TrainingType } from '@/data/trainingTypes';
import type { YogaStyle } from '@/data/yogaStyles';
import { DEFAULT_YOGA_STYLE } from '@/data/yogaStyles';
import { normalizeSectionTitle } from '@/i18n/labels';

export type SectionPhase = 'warmup' | 'main' | 'stretch' | 'cooldown';

const TITLE_TO_PHASE: Record<string, SectionPhase> = {
  'Warm-up': 'warmup',
  'Main section': 'main',
  'Main section - Right side': 'main',
  'Main section - Left side': 'main',
  'Abdominal series': 'main',
  'Back & spine': 'main',
  'Cool-down': 'cooldown',
  'Breath & center': 'warmup',
  'Vinyasa flow': 'main',
  Savasana: 'cooldown',
  'Dynamic warm-up': 'warmup',
  Intervals: 'main',
  'Strength round': 'main',
  'Cardio round': 'main',
  'Barre warm-up': 'warmup',
  Thighs: 'main',
  'Seat & glutes': 'main',
  Stretching: 'stretch',
  'Ride warm-up': 'warmup',
  'Climbs & sprints': 'main',
  Climbs: 'main',
  Sprints: 'main',
  'Gentle warm-up': 'warmup',
  'Targeted stretches': 'stretch',
  'Lower body': 'stretch',
  'Upper body': 'stretch',
  Relaxation: 'cooldown',
  'Sun salutations': 'warmup',
  'Standing sequence': 'main',
  'Seated sequence': 'main',
  'Closing sequence': 'cooldown',
  Centering: 'warmup',
  'Held poses': 'main',
  'Standing holds': 'main',
  'Floor holds': 'main',
  Opening: 'warmup',
  'Yin holds': 'stretch',
  'Hip holds': 'stretch',
  'Spine holds': 'stretch',
  'Final rest': 'cooldown',
  Setup: 'warmup',
  'Supported poses': 'stretch',
  'New section': 'main',
};

export const PHASE_CATEGORIES: Record<SectionPhase, string[]> = {
  warmup: ['Warm-up'],
  main: ['Core', 'Back', 'Main section'],
  stretch: ['Stretching'],
  cooldown: ['Cool-down', 'Stretching'],
};

export function phaseFromCategory(category: string | undefined): SectionPhase | null {
  const value = category?.trim();
  if (!value || value === 'Other') return null;
  const mapped = TITLE_TO_PHASE[normalizeSectionTitle(value)];
  if (mapped) return mapped;
  for (const [phase, cats] of Object.entries(PHASE_CATEGORIES) as Array<[SectionPhase, string[]]>) {
    if (cats.includes(value)) return phase;
  }
  return null;
}

export function sectionIdForCategory(
  category: string | undefined,
  sections: Array<{ id: string; title: string }>
): string {
  if (!sections.length) return '';
  const exact = sections.find(
    (s) =>
      s.title === category ||
      normalizeSectionTitle(s.title) === normalizeSectionTitle(category ?? '')
  );
  if (exact) return exact.id;
  const phase = phaseFromCategory(category);
  if (!phase) return '';
  const match = sections.find((s, i) => inferSectionPhase(s.title, i, sections.length) === phase);
  return match?.id ?? '';
}

/** Default catalog category for a custom exercise created from a section. */
export function defaultCategoryForSection(
  sectionTitle: string,
  sectionIndex: number,
  totalSections: number
): string {
  const phase = inferSectionPhase(sectionTitle, sectionIndex, totalSections);
  return PHASE_CATEGORIES[phase][0];
}

/** Opening / setup sections also allow gentle cool-down poses. */
const OPENING_TITLES = new Set(['Opening', 'Setup', 'Breath & center', 'Centering']);

export function inferSectionPhase(
  title: string,
  sectionIndex: number,
  totalSections: number
): SectionPhase {
  const mapped = TITLE_TO_PHASE[normalizeSectionTitle(title)];
  if (mapped) return mapped;
  if (sectionIndex <= 0) return 'warmup';
  if (sectionIndex >= totalSections - 1) return 'cooldown';
  if (/stretch/i.test(title) || title.includes('מתיח')) return 'stretch';
  return 'main';
}

export function allowedCategoriesForSection(
  trainingType: TrainingType,
  yogaStyle: YogaStyle | undefined,
  sectionId: string,
  sectionTitle: string,
  sectionIndex: number,
  totalSections: number
): Set<string> {
  const phase = inferSectionPhase(sectionTitle, sectionIndex, totalSections);
  const categories = new Set(PHASE_CATEGORIES[phase]);

  if (OPENING_TITLES.has(normalizeSectionTitle(sectionTitle))) {
    categories.add('Cool-down');
  }

  const template = getLessonTemplate(
    trainingType,
    trainingType === 'yoga' ? (yogaStyle ?? DEFAULT_YOGA_STYLE) : DEFAULT_YOGA_STYLE
  );
  const templateSection = template.find((s) => s.id === sectionId);
  for (const id of templateSection?.exerciseIds ?? []) {
    const ex = findBuiltinExercise(id);
    if (ex?.category) categories.add(ex.category);
  }

  categories.add('Other');
  return categories;
}

export function exerciseFitsSection(
  ex: Exercise,
  allowedCategories: Set<string>,
  selectedIds?: Set<string>
): boolean {
  if (selectedIds?.has(ex.id)) return true;
  return allowedCategories.has(ex.category);
}

/** Match by class-section role (warm-up / main / cool-down), not a strict title. */
export function exerciseMatchesSection(
  ex: Exercise,
  sectionTitle: string,
  sectionIndex: number,
  totalSections: number,
  selectedIds?: Set<string>
): boolean {
  if (selectedIds?.has(ex.id)) return true;
  const catPhase = phaseFromCategory(ex.category);
  if (!catPhase) return true;
  return catPhase === inferSectionPhase(sectionTitle, sectionIndex, totalSections);
}

export function defaultExerciseIdsForSection(
  trainingType: TrainingType,
  yogaStyle: YogaStyle | undefined,
  sectionId: string
): string[] {
  const template = getLessonTemplate(
    trainingType,
    trainingType === 'yoga' ? (yogaStyle ?? DEFAULT_YOGA_STYLE) : DEFAULT_YOGA_STYLE
  );
  return [...(template.find((s) => s.id === sectionId)?.exerciseIds ?? [])];
}
