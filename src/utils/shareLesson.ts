import type { Lesson } from '@/data/mockData';
import { SPRING_COLORS, isSpringSetupEmpty, springDotList, type SpringSetup } from '@/data/pilatesSetup';
import type { Locale, TranslateFn } from '@/i18n';
import {
  equipmentLabel,
  exerciseName,
  levelLabel,
  sectionTitle,
  trainingLabel,
  yogaStyleLabel,
} from '@/i18n';
import { renderLessonShareImage, type ShareCardModel } from '@/utils/lessonShareImage';

const MAX_REPS = 99;

function parseReps(value?: string) {
  if (!value) return 0;
  const match = value.match(/\d+/);
  if (!match) return 0;
  return Math.min(MAX_REPS, Math.max(0, Number(match[0])));
}

function springText(setup: SpringSetup | undefined, t: TranslateFn) {
  if (!setup || isSpringSetupEmpty(setup)) return '';
  const parts: string[] = [];
  for (const color of SPRING_COLORS) {
    const count = setup[color] ?? 0;
    if (!count) continue;
    const name = t(`spring.${color}`);
    parts.push(count > 1 ? `${name} ×${count}` : name);
  }
  return parts.join(', ');
}

function lessonShareCard(lesson: Lesson, t: TranslateFn, locale: Locale): ShareCardModel {
  const title = lesson.title.trim() || t('library.untitled');
  const meta = [
    `${lesson.duration} ${t('common.min')}`,
    levelLabel(lesson.level, t),
    trainingLabel(lesson.trainingType, t),
  ];
  if (lesson.yogaStyle) meta.push(yogaStyleLabel(lesson.yogaStyle, t));
  if (lesson.trainingType === 'pilates') {
    meta.push(lesson.equipment === 'reformer' ? t('builder.apparatus') : equipmentLabel('mat', t));
  }
  const genericDesc = t('preview.defaultDesc', {
    type: trainingLabel(lesson.trainingType, t).toLowerCase(),
  });
  const description = lesson.description?.trim();
  return {
    title,
    focus: lesson.focus?.trim() || undefined,
    meta: meta.join(' · '),
    description: description && description !== genericDesc ? description : undefined,
    sections: lesson.sections.map((section) => ({
      title: sectionTitle(section.title, t),
      exercises: section.exercises.map((ex) => {
        const reps = parseReps(ex.reps);
        return {
          name: exerciseName(ex, locale),
          repsLabel: reps > 0 ? t('builder.repsCount', { count: reps }) : undefined,
          springs: springDotList(ex.springs),
        };
      }),
    })),
  };
}

/** Plain-text lesson plan for the iOS system share sheet. */
export function formatLessonShareText(lesson: Lesson, t: TranslateFn, locale: Locale) {
  const title = lesson.title.trim() || t('library.untitled');
  const lines: string[] = [title];

  const meta = [`${lesson.duration} ${t('common.min')}`, levelLabel(lesson.level, t), trainingLabel(lesson.trainingType, t)];
  if (lesson.yogaStyle) meta.push(yogaStyleLabel(lesson.yogaStyle, t));
  if (lesson.trainingType === 'pilates') {
    meta.push(lesson.equipment === 'reformer' ? t('builder.apparatus') : equipmentLabel('mat', t));
  }
  lines.push(meta.join(' · '));

  if (lesson.focus?.trim()) lines.push(lesson.focus.trim());

  const genericDesc = t('preview.defaultDesc', {
    type: trainingLabel(lesson.trainingType, t).toLowerCase(),
  });
  const description = lesson.description?.trim();
  if (description && description !== genericDesc) lines.push(description);

  if (lesson.props?.length) {
    lines.push(`${t('builder.props')}: ${lesson.props.map((id) => t(`prop.${id}`)).join(', ')}`);
  }

  for (const section of lesson.sections) {
    if (section.exercises.length === 0) continue;
    lines.push('');
    lines.push(sectionTitle(section.title, t));
    for (const ex of section.exercises) {
      const reps = parseReps(ex.reps);
      const springs = springText(ex.springs, t);
      const extra = [
        reps > 0 ? t('builder.repsCount', { count: reps }) : '',
        springs ? `${t('builder.springs')}: ${springs}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(extra ? `• ${exerciseName(ex, locale)} — ${extra}` : `• ${exerciseName(ex, locale)}`);
      if (ex.cue?.trim()) lines.push(`  ${ex.cue.trim()}`);
    }
  }

  return lines.join('\n').trim();
}

export type ShareLessonResult = 'shared' | 'copied' | 'cancelled' | 'failed' | 'insecure';

function isShareCancel(err: unknown) {
  return err instanceof DOMException && err.name === 'AbortError';
}

/** Opens the iPhone system share sheet (AirDrop, Messages, Mail, and installed apps). */
export async function shareLessonPlan(
  lesson: Lesson,
  t: TranslateFn,
  locale: Locale
): Promise<ShareLessonResult> {
  const title = lesson.title.trim() || t('library.untitled');
  const text = formatLessonShareText(lesson, t, locale);
  let image: File | null = null;
  try {
    image = renderLessonShareImage(lessonShareCard(lesson, t, locale), title);
  } catch {
    image = null;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const imagePayload = image ? { files: [image] } : null;
    let canImage = false;
    if (imagePayload) {
      try {
        canImage = typeof navigator.canShare !== 'function' || navigator.canShare(imagePayload);
      } catch {
        canImage = false;
      }
    }
    try {
      if (canImage && imagePayload) await navigator.share(imagePayload);
      else await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if (isShareCancel(err)) return 'cancelled';
      return 'failed';
    }
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) return 'insecure';

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function shareResultNote(result: ShareLessonResult, t: TranslateFn) {
  if (result === 'copied') return t('detail.shareCopied');
  if (result === 'insecure') return t('detail.shareInsecure');
  if (result === 'failed') return t('detail.shareFailed');
  return null;
}
