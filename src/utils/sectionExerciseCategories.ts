import { normalizeSectionTitle } from '@/i18n/labels';

/** Which exercise catalog categories belong in each lesson-section role. */
export type SectionExerciseRole = 'warmup' | 'main' | 'finisher';

const ROLE_CATEGORIES: Record<SectionExerciseRole, readonly string[]> = {
  warmup: ['Warm-up'],
  main: ['Core', 'Back'],
  finisher: ['Cool-down', 'Stretching'],
};

/** Canonical section titles from lesson templates. */
const TITLE_ROLE: Record<string, SectionExerciseRole> = {
  'Warm-up': 'warmup',
  'Main section': 'main',
  'Main section - Right side': 'main',
  'Main section - Left side': 'main',
  'Abdominal series': 'main',
  'Back & spine': 'main',
  'Cool-down': 'finisher',
  'Breath & center': 'warmup',
  'Vinyasa flow': 'main',
  Savasana: 'finisher',
  'Dynamic warm-up': 'warmup',
  Intervals: 'main',
  'Strength round': 'main',
  'Cardio round': 'main',
  'Barre warm-up': 'warmup',
  Thighs: 'main',
  'Seat & glutes': 'main',
  Stretching: 'finisher',
  'Ride warm-up': 'warmup',
  'Climbs & sprints': 'main',
  Climbs: 'main',
  Sprints: 'main',
  'Gentle warm-up': 'warmup',
  'Targeted stretches': 'finisher',
  'Lower body': 'finisher',
  'Upper body': 'finisher',
  Relaxation: 'finisher',
  'Sun salutations': 'warmup',
  'Standing sequence': 'main',
  'Seated sequence': 'main',
  'Closing sequence': 'finisher',
  Centering: 'warmup',
  'Held poses': 'main',
  'Standing holds': 'main',
  'Floor holds': 'main',
  Opening: 'warmup',
  'Yin holds': 'finisher',
  'Hip holds': 'finisher',
  'Spine holds': 'finisher',
  'Final rest': 'finisher',
  Setup: 'warmup',
  'Supported poses': 'finisher',
};

const WARMUP_PATTERNS = [/warm/i, /חימום/i, /breath/i, /center/i, /gentle/i];
const FINISHER_PATTERNS = [/cool/i, /סיום/i, /savasana/i, /relax/i, /stretch/i, /מתיח/i];
const MAIN_PATTERNS = [/main/i, /interval/i, /flow/i, /climb/i, /sprint/i, /מקטע ראשי/i, /ראשי/i];

export function inferSectionExerciseRole(sectionTitle: string): SectionExerciseRole | null {
  const canonical = TITLE_ROLE[normalizeSectionTitle(sectionTitle)];
  if (canonical) return canonical;

  const text = sectionTitle.trim();
  if (!text) return null;

  if (WARMUP_PATTERNS.some((p) => p.test(text))) return 'warmup';
  if (FINISHER_PATTERNS.some((p) => p.test(text))) return 'finisher';
  if (MAIN_PATTERNS.some((p) => p.test(text))) return 'main';

  return null;
}

/** Allowed exercise categories for a section title, or null when no filter applies. */
export function exerciseCategoriesForSection(sectionTitle: string): string[] | null {
  const role = inferSectionExerciseRole(sectionTitle);
  if (!role) return null;
  return [...ROLE_CATEGORIES[role]];
}
