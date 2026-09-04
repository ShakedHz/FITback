import type { EquipmentType } from '@/data/equipmentTypes';
import type { EventCategory } from '@/data/scheduleTypes';
import type { TrainingType } from '@/data/trainingTypes';
import type { Exercise } from '@/data/mockData';
import type { BodyPart } from '@/data/bodyParts';
import { exerciseAreaLabel as areaLabelFromData } from '@/data/bodyParts';
import type { CustomExerciseArea } from '@/data/customExerciseAreas';
import type { BodyPartLabelOverride } from '@/data/exerciseLibraryPrefs';
import type { YogaStyle } from '@/data/yogaStyles';
import type { Locale } from './locale';
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
  'Main section': 'builder.main',
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
  'Main section - Right side': 'builder.mainRight',
  'Main section - Left side': 'builder.mainLeft',
  'Cool-down': 'builder.cooldown',
  'New section': 'builder.newSection',
  'Breath & center': 'builder.section.breathCenter',
  'Vinyasa flow': 'builder.section.vinyasaFlow',
  Savasana: 'builder.section.savasana',
  'Sun salutations': 'builder.section.sunSalutations',
  'Standing sequence': 'builder.section.standingSequence',
  'Closing sequence': 'builder.section.closingSequence',
  Centering: 'builder.section.centering',
  'Held poses': 'builder.section.heldPoses',
  Relaxation: 'builder.section.relaxation',
  Opening: 'builder.section.opening',
  'Yin holds': 'builder.section.yinHolds',
  'Final rest': 'builder.section.finalRest',
  Setup: 'builder.section.setup',
  'Supported poses': 'builder.section.supportedPoses',
  'Dynamic warm-up': 'builder.section.dynamicWarmup',
  'Abdominal series': 'builder.section.abdominalSeries',
  'Back & spine': 'builder.section.backSpine',
  'Standing flow': 'builder.section.standingFlow',
  'Seated sequence': 'builder.section.seatedSequence',
  'Standing holds': 'builder.section.standingHolds',
  'Floor holds': 'builder.section.floorHolds',
  'Hip holds': 'builder.section.hipHolds',
  'Spine holds': 'builder.section.spineHolds',
  'Strength round': 'builder.section.strengthRound',
  'Cardio round': 'builder.section.cardioRound',
  Thighs: 'builder.section.thighs',
  'Seat & glutes': 'builder.section.seatGlutes',
  Climbs: 'builder.section.climbs',
  Sprints: 'builder.section.sprints',
  'Lower body': 'builder.section.lowerBody',
  'Upper body': 'builder.section.upperBody',
  Intervals: 'builder.section.intervals',
  'Barre warm-up': 'builder.section.barreWarmup',
  Stretching: 'builder.section.stretching',
  'Ride warm-up': 'builder.section.rideWarmup',
  'Climbs & sprints': 'builder.section.climbsSprints',
  'Gentle warm-up': 'builder.section.gentleWarmup',
  'Targeted stretches': 'builder.section.targetedStretches',
};

/** Hebrew titles that may have been stored instead of the canonical English key. */
const SECTION_ALIASES: Record<string, string> = {
  'חימום': 'Warm-up',
  'מקטע ראשי': 'Main section',
  'מקטע ראשי - צד ימין': 'Main section - Right side',
  'מקטע ראשי - צד שמאל': 'Main section - Left side',
  'סיום': 'Cool-down',
  'מקטע חדש': 'New section',
  'נשימה ומרכז': 'Breath & center',
  'זרימת ויניאסה': 'Vinyasa flow',
  'שוואסנה': 'Savasana',
  'ברכות שמש': 'Sun salutations',
  'רצף עמידות': 'Standing sequence',
  'רצף סיום': 'Closing sequence',
  'מירכוז': 'Centering',
  'תנוחות מוחזקות': 'Held poses',
  'הרפיה': 'Relaxation',
  'פתיחה': 'Opening',
  'החזקות יין': 'Yin holds',
  'מנוחה סופית': 'Final rest',
  'הכנה': 'Setup',
  'תנוחות עם תמיכה': 'Supported poses',
  'חימום דינמי': 'Dynamic warm-up',
  'סדרת בטן': 'Abdominal series',
  'גב ועמוד שדרה': 'Back & spine',
  'זרימת עמידות': 'Standing flow',
  'רצף ישיבה': 'Seated sequence',
  'תנוחות עמידה': 'Standing holds',
  'תנוחות רצפה': 'Floor holds',
  'החזקות ירך': 'Hip holds',
  'החזקות גב': 'Spine holds',
  'סבב כוח': 'Strength round',
  'סבב קרדיו': 'Cardio round',
  'ירכיים': 'Thighs',
  'ישבן': 'Seat & glutes',
  'טיפוסים': 'Climbs',
  'ספרינטים': 'Sprints',
  'פלג גוף תחתון': 'Lower body',
  'פלג גוף עליון': 'Upper body',
  'אינטרוולים': 'Intervals',
  'חימום בר': 'Barre warm-up',
  'מתיחות': 'Stretching',
  'חימום רכיבה': 'Ride warm-up',
  'טיפוסים וספרינטים': 'Climbs & sprints',
  'חימום עדין': 'Gentle warm-up',
  'מתיחות ממוקדות': 'Targeted stretches',
};

export function normalizeSectionTitle(title: string): string {
  return SECTION_ALIASES[title] ?? title;
}

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

export function exerciseName(ex: Exercise, locale: Locale): string {
  return locale === 'he' ? ex.nameHe : ex.name || ex.nameHe;
}

export function yogaStyleLabel(style: YogaStyle, t: TranslateFn): string {
  return t(`yogaStyle.${style}`);
}

export function bodyPartLabel(part: BodyPart, t: TranslateFn): string {
  return t(`bodyPart.${part}`);
}

export function exerciseAreaLabel(
  areaId: string,
  locale: Locale,
  t: TranslateFn,
  customAreas: CustomExerciseArea[],
  bodyPartLabels: Partial<Record<BodyPart, BodyPartLabelOverride>> = {}
): string {
  return areaLabelFromData(areaId, locale, t, customAreas, bodyPartLabels);
}

export function levelLabel(level: string, t: TranslateFn): string {
  const key = LEVEL_KEYS[level];
  return key ? t(key) : level;
}

export function sectionTitle(title: string, t: TranslateFn): string {
  const canonical = normalizeSectionTitle(title);
  const key = SECTION_KEYS[canonical];
  return key ? t(key) : title;
}

/** Map a typed/displayed section name back to the stored English title when it matches a known section. */
export function canonicalSectionTitle(input: string, t: TranslateFn): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (SECTION_KEYS[trimmed]) return trimmed;
  const aliased = SECTION_ALIASES[trimmed];
  if (aliased) return aliased;
  for (const [canonical, key] of Object.entries(SECTION_KEYS)) {
    if (t(key) === trimmed) return canonical;
  }
  return trimmed;
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
